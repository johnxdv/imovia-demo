// Fonction serverless Vercel — reçoit un lead du moteur d'estimation et
// l'achemine par e-mail vers l'agence.
//
// Elle est appelée à la toute fin du parcours, une fois les coordonnées
// recueillies (voir `EstimationChatPanel`). Le visiteur, lui, n'attend pas :
// son prix s'affiche quoi qu'il arrive, et un envoi raté ne lui est jamais
// montré — il est journalisé ici (voir `src/components/estimation/
// EstimationResultStep.jsx`).
//
// Variables d'environnement (Vercel → Project Settings → Environment
// Variables). Aucune n'a de valeur de repli dans le code, et aucune n'est
// préfixée `VITE_` : une variable `VITE_` part dans le bundle du navigateur,
// où une clé d'API n'a rien à faire.
//
//   RESEND_API_KEY   Clé API Resend (https://resend.com).
//   RESEND_FROM      Expéditeur, sur un domaine vérifié dans Resend.
//                    Format « Nom <adresse> ».
//   LEAD_TO_EMAIL    Destinataire des leads.

import { Resend } from 'resend'

/**
 * Longueurs maximales retenues par champ.
 *
 * Les valeurs sont TRONQUÉES, jamais rejetées : un lead est trop précieux pour
 * être perdu sur une adresse à rallonge, et l'e-mail part vers une boîte
 * interne. Le plafond n'est là que pour qu'un corps de requête gonflé ne se
 * retrouve pas recopié tel quel dans un message.
 */
const LIMITES = {
  nom: 80,
  telephone: 30,
  email: 160,
  creneau: 60,
  adresse: 200,
  typeBien: 60,
}

/**
 * Champ-piège : invisible pour un visiteur, rempli par les robots qui
 * complètent tout ce qu'ils trouvent. S'il revient garni, on répond `200` sans
 * rien envoyer — un refus explicite apprendrait au robot à l'éviter.
 */
const HONEYPOT = 'societe'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Chaîne nettoyée et ramenée à sa longueur maximale, ou `''`. */
function texte(valeur, limite) {
  if (typeof valeur !== 'string') return ''
  return valeur.trim().slice(0, limite)
}

/** Nombre fini et strictement positif, ou `null` — jamais `NaN` dans l'e-mail. */
function nombre(valeur) {
  const n = Number(valeur)
  return Number.isFinite(n) && n > 0 ? n : null
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

const euros = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

/**
 * Numéro réduit à ce qu'un téléphone sait composer, pour le `href` du lien
 * `tel:` — chiffres, et l'indicatif international s'il est là. Le libellé
 * affiché, lui, reste la saisie d'origine.
 */
function telHref(telephone) {
  const nettoye = telephone.replace(/[^\d+]/g, '')
  return nettoye.startsWith('+') ? `+${nettoye.slice(1).replace(/\+/g, '')}` : nettoye
}

/**
 * Fourchette mise en mots.
 *
 * La demi-largeur est CALCULÉE SUR LES BORNES REÇUES, jamais supposée : le
 * moteur rend ±5 % hors zone DVF et ±15, ±20 ou ±25 % ailleurs selon la
 * confiance de l'échantillon (voir `FOURCHETTE` dans
 * `api/_lib/estimationConfig.js`). Écrire « ± 5 % » en dur dans l'e-mail
 * reviendrait à annoncer au conseiller une précision que le calcul n'a pas
 * toujours.
 */
function fourchette(prix, basse, haute) {
  if (!basse || !haute) return null

  const libelle = `${euros.format(basse)} – ${euros.format(haute)}`
  if (!prix) return { libelle, pct: null }

  const demiLargeur = Math.round(((haute - basse) / 2 / prix) * 100)
  return { libelle, pct: demiLargeur > 0 ? demiLargeur : null }
}

/** Les lignes du récapitulatif, dans l'ordre où le conseiller les lit. */
function lignes(lead) {
  const f = fourchette(lead.prix, lead.fourchetteBasse, lead.fourchetteHaute)

  return [
    { libelle: 'Nom', valeur: lead.nom },
    { libelle: 'Téléphone', valeur: lead.telephone, tel: true },
    lead.email ? { libelle: 'E-mail', valeur: lead.email } : null,
    { libelle: 'Rappel souhaité', valeur: lead.creneau || 'Non précisé' },
    { libelle: 'Adresse du bien', valeur: lead.adresse || 'Non précisée' },
    { libelle: 'Type de bien', valeur: lead.typeBien || 'Non précisé' },
    { libelle: 'Surface', valeur: lead.surface ? `${lead.surface} m²` : 'Non précisée' },
    { libelle: 'Estimation', valeur: lead.prix ? euros.format(lead.prix) : 'Non calculée', fort: true },
    f ? { libelle: 'Fourchette', valeur: f.pct ? `${f.libelle} (± ${f.pct} %)` : f.libelle } : null,
  ].filter(Boolean)
}

/** Objet du message — aussi repris en `<title>`, que certains clients affichent. */
function sujet(lead) {
  return `Nouveau lead estimation – ${lead.nom}${lead.adresse ? ` – ${lead.adresse}` : ''}`
}

function construireHtml(lead) {
  const rangs = lignes(lead)
    .map(({ libelle, valeur, tel, fort }) => {
      const contenu = tel
        ? `<a href="tel:${escapeHtml(telHref(valeur))}" style="color:#B08D57;text-decoration:none;font-weight:600;">${escapeHtml(valeur)}</a>`
        : escapeHtml(valeur)

      return `
        <tr>
          <td style="padding:10px 16px 10px 0;border-bottom:1px solid #E6E2D9;color:#6B6B6B;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(libelle)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #E6E2D9;color:#10141C;font-size:${fort ? '18px' : '14px'};font-weight:${fort ? '700' : '400'};">${contenu}</td>
        </tr>`
    })
    .join('')

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(sujet(lead))}</title>
  </head>
  <body style="margin:0;padding:24px;background:#EDEAE3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#FFFFFF;">
      <div style="background:#10141C;padding:20px 24px;">
        <div style="color:#FFFFFF;font-size:18px;font-weight:700;letter-spacing:0.04em;">IMMOVIA</div>
        <div style="color:#B08D57;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin-top:4px;">Nouveau lead estimation</div>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 20px;color:#10141C;font-size:14px;line-height:1.6;">
          <strong>${escapeHtml(lead.nom)}</strong> vient de terminer une estimation en ligne
          et souhaite être rappelé${lead.creneau ? ` ${escapeHtml(lead.creneau.toLowerCase())}` : ''}.
        </p>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          ${rangs}
        </table>
        <p style="margin:24px 0 0;color:#6B6B6B;font-size:12px;line-height:1.6;">
          Message envoyé automatiquement par le moteur d'estimation d'immo-via.com.
        </p>
      </div>
    </div>
  </body>
</html>`
}

function construireTexte(lead) {
  return [
    `Nouveau lead estimation — ${lead.nom}`,
    '',
    ...lignes(lead).map(({ libelle, valeur }) => `${libelle} : ${valeur}`),
    '',
    'Message envoyé automatiquement par le moteur d’estimation d’immo-via.com.',
  ].join('\n')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée.' })
  }

  // Vercel désérialise le JSON quand l'en-tête l'annonce ; on couvre le cas
  // contraire plutôt que de lever sur une chaîne.
  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = null
    }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'Corps de requête invalide.' })
  }

  // Piège à robots : on acquiesce sans rien envoyer.
  if (texte(body[HONEYPOT], 200)) {
    return res.status(200).json({ ok: true })
  }

  const email = texte(body.email, LIMITES.email)
  const lead = {
    nom: texte(body.nom, LIMITES.nom),
    telephone: texte(body.telephone, LIMITES.telephone),
    email: EMAIL_RE.test(email) ? email : '',
    creneau: texte(body.creneau, LIMITES.creneau),
    adresse: texte(body.adresse, LIMITES.adresse),
    typeBien: texte(body.typeBien, LIMITES.typeBien),
    surface: nombre(body.surface),
    prix: nombre(body.prix),
    fourchetteBasse: nombre(body.fourchetteBasse),
    fourchetteHaute: nombre(body.fourchetteHaute),
  }

  // Les deux seuls champs sans lesquels le lead ne vaut rien : un nom à qui
  // parler, un numéro où appeler.
  const errors = {}
  if (!lead.nom) errors.nom = 'Nom manquant.'
  if (lead.telephone.replace(/\D/g, '').length < 6) errors.telephone = 'Téléphone manquant.'
  if (Object.keys(errors).length) {
    return res.status(400).json({ ok: false, errors })
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  const to = process.env.LEAD_TO_EMAIL

  if (!apiKey || !from || !to) {
    // Configuration incomplète : jamais détaillée au client, toujours au
    // journal — c'est la seule trace qui dira qu'un lead a été perdu.
    console.error(
      '[lead] Configuration incomplète :',
      [!apiKey && 'RESEND_API_KEY', !from && 'RESEND_FROM', !to && 'LEAD_TO_EMAIL']
        .filter(Boolean)
        .join(', '),
      '— lead non transmis pour',
      lead.telephone,
    )
    return res.status(500).json({ ok: false, error: 'Envoi indisponible.' })
  }

  // Le client est construit ici, et non au chargement du module : sans clé,
  // le constructeur lève — et `npm run check:api` importe ce fichier à chaque
  // construction, clé ou non.
  const resend = new Resend(apiKey)

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      // Répondre au message écrit alors directement au visiteur — quand il a
      // laissé une adresse. Le parcours d'estimation n'en demande pas
      // aujourd'hui ; le jour où il le fera, il n'y aura rien à changer ici.
      ...(lead.email ? { replyTo: lead.email } : {}),
      subject: sujet(lead),
      html: construireHtml(lead),
      text: construireTexte(lead),
    })

    if (error) {
      console.error('[lead] Échec Resend', error, '— lead perdu pour', lead.telephone)
      return res.status(502).json({ ok: false, error: 'Envoi indisponible.' })
    }

    return res.status(200).json({ ok: true, id: data?.id ?? null })
  } catch (err) {
    console.error('[lead] Erreur inattendue', err, '— lead perdu pour', lead.telephone)
    return res.status(500).json({ ok: false, error: 'Envoi indisponible.' })
  }
}
