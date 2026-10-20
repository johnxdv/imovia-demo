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
//
// JOURNAL. Chaque issue de la fonction écrit une ligne préfixée `[lead]` et
// marquée d'un identifiant de requête, pour qu'on puisse suivre un appel d'un
// bout à l'autre dans les journaux Vercel (Deployments → Functions → /api/lead,
// ou `vercel logs`). C'est la seule fenêtre sur cette fonction : le navigateur,
// lui, ignore délibérément la réponse (voir `src/lib/lead.js`).
//
// LA CLÉ N'EST JAMAIS ÉCRITE, ni en entier ni en fragment. Le journal n'en dit
// que deux choses, l'une et l'autre inoffensives et toutes deux utiles : sa
// longueur, et si elle a la forme attendue. Une clé recollée de travers dans
// l'interface Vercel — espace avalé, retour à la ligne final, valeur tronquée —
// se voit à la longueur sans qu'on ait eu besoin de la lire.

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

/** Identifiant court, pour recoudre les lignes d'un même appel dans le journal. */
const idRequete = () => Math.random().toString(36).slice(2, 8)

/**
 * Ce qu'on a le droit de dire d'une valeur secrète : si elle est là, combien
 * elle pèse, et si elle ressemble à ce qu'on attend. Jamais son contenu.
 *
 * `brute !== brute.trim()` est le piège le plus courant de la saisie Vercel :
 * une valeur qui traîne une espace ou un retour à la ligne est acceptée par le
 * formulaire et rejetée par Resend.
 */
function empreinteCle(brute) {
  if (!brute) return 'absente'
  const propre = brute.trim()
  return [
    `présente (${propre.length} caractères`,
    propre.startsWith('re_') ? 'forme attendue' : 'FORME INATTENDUE, « re_ » absent',
    brute !== propre ? 'ESPACES PARASITES AUTOUR DE LA VALEUR' : null,
  ]
    .filter(Boolean)
    .join(', ') + ')'
}

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
  const rid = idRequete()
  const journal = (...args) => console.log(`[lead ${rid}]`, ...args)
  const alerte = (...args) => console.error(`[lead ${rid}]`, ...args)

  journal('appel reçu —', req.method, '| origine :', req.headers?.origin ?? 'aucune')

  if (req.method !== 'POST') {
    alerte('REFUSÉ : méthode', req.method, '— seul POST est accepté')
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
    alerte(
      'REFUSÉ : corps de requête illisible — type reçu :',
      typeof req.body,
      '| content-type :',
      req.headers?.['content-type'] ?? 'absent',
    )
    return res.status(400).json({ ok: false, error: 'Corps de requête invalide.' })
  }

  journal('corps lu — champs :', Object.keys(body).join(', ') || '(aucun)')

  // Piège à robots : on acquiesce sans rien envoyer.
  if (texte(body[HONEYPOT], 200)) {
    journal(`ÉCARTÉ : champ-piège « ${HONEYPOT} » rempli — robot présumé, aucun envoi`)
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
    alerte('REFUSÉ : validation échouée —', Object.keys(errors).join(', '))
    return res.status(400).json({ ok: false, errors })
  }

  journal('lead validé —', lead.telephone, '| bien :', lead.adresse || 'adresse absente')

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  const to = process.env.LEAD_TO_EMAIL

  // Relevé systématique, succès comme échec : savoir laquelle des trois
  // manque — ou qu'aucune ne manque — est le premier embranchement du
  // diagnostic, et il ne coûte qu'une ligne.
  journal(
    'configuration — RESEND_API_KEY :',
    empreinteCle(apiKey),
    '| RESEND_FROM :',
    from || 'ABSENTE',
    '| LEAD_TO_EMAIL :',
    to || 'ABSENTE',
  )

  if (!apiKey || !from || !to) {
    const manquantes = [!apiKey && 'RESEND_API_KEY', !from && 'RESEND_FROM', !to && 'LEAD_TO_EMAIL']
      .filter(Boolean)
      .join(', ')
    // Configuration incomplète : jamais détaillée au client, toujours au
    // journal — c'est la seule trace qui dira qu'un lead a été perdu.
    alerte(
      'ABANDON : variable(s) d’environnement manquante(s) —',
      manquantes,
      '— lead perdu pour',
      lead.telephone,
      '| à déclarer dans Vercel → Settings → Environment Variables, puis redéployer',
    )
    return res.status(500).json({ ok: false, error: 'Envoi indisponible.' })
  }

  // Le client est construit ici, et non au chargement du module : sans clé,
  // le constructeur lève — et `npm run check:api` importe ce fichier à chaque
  // construction, clé ou non.
  const resend = new Resend(apiKey)

  journal('envoi Resend demandé —', from, '→', to, lead.email ? `| replyTo ${lead.email}` : '')

  const depart = Date.now()
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
      // Resend répond en clair quand il refuse : domaine non vérifié, clé
      // révoquée, destinataire hors liste en mode bac à sable. Le message est
      // recopié tel quel — c'est lui qui désigne la cause.
      alerte(
        'REFUS RESEND après',
        `${Date.now() - depart} ms —`,
        'statut :',
        error.statusCode ?? '(non communiqué)',
        '| type :',
        error.name ?? '(non communiqué)',
        '| message :',
        error.message ?? '(aucun)',
        '— lead perdu pour',
        lead.telephone,
      )
      return res.status(502).json({ ok: false, error: 'Envoi indisponible.' })
    }

    journal('SUCCÈS en', `${Date.now() - depart} ms —`, 'e-mail Resend', data?.id ?? '(sans id)')
    return res.status(200).json({ ok: true, id: data?.id ?? null })
  } catch (err) {
    // Rien n'a répondu : réseau sortant coupé, délai dépassé, exception du SDK.
    alerte(
      'EXCEPTION après',
      `${Date.now() - depart} ms —`,
      err?.name ?? 'Error',
      ':',
      err?.message ?? String(err),
      '— lead perdu pour',
      lead.telephone,
    )
    return res.status(500).json({ ok: false, error: 'Envoi indisponible.' })
  }
}
