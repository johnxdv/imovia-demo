// Fonction serverless Vercel — reçoit une demande de contact individuelle
// (page Équipe) et l'achemine par e-mail vers le conseiller sélectionné.
//
// Volontairement PAS de mailto/lien client : les adresses des conseillers ne
// doivent jamais apparaître dans le bundle front. Elles sont résolues ici à
// partir d'un identifiant (`advisorId`) et de variables d'environnement
// Vercel (Project Settings → Environment Variables) :
//
//   RESEND_API_KEY        Clé API Resend (https://resend.com) utilisée pour l'envoi.
//   CONTACT_EMAIL_LUCAS    Adresse pro de Lucas BELLA.
//   CONTACT_EMAIL_EMILIE   Adresse pro d'Émilie ANDRASCHKE.
//   CONTACT_EMAIL_AGENCY   Adresse générale de l'agence, en copie (facultatif).
//   CONTACT_FROM_EMAIL     Adresse d'expédition, sur un domaine vérifié dans
//                          Resend (facultatif — voir repli ci-dessous).
//
// Aucune de ces valeurs n'est commitée : elles n'existent que dans
// l'environnement Vercel, jamais dans le code visible.

import { PROJETS } from '../src/data/projets.js'

const ADVISORS = {
  lucas: { nom: 'Lucas BELLA', envVar: 'CONTACT_EMAIL_LUCAS' },
  emilie: { nom: 'Émilie ANDRASCHKE', envVar: 'CONTACT_EMAIL_EMILIE' },
}

const PROJET_VALUES = new Set(PROJETS.map((p) => p.value))
const PROJET_LABELS = Object.fromEntries(PROJETS.map((p) => [p.value, p.label]))

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(body) {
  const errors = {}
  const str = (v) => (typeof v === 'string' ? v.trim() : '')

  if (!str(body.prenom)) errors.prenom = 'Merci d’indiquer votre prénom.'
  if (!str(body.nom)) errors.nom = 'Merci d’indiquer votre nom.'
  if (!EMAIL_RE.test(str(body.email))) errors.email = 'Cette adresse e-mail semble invalide.'
  if (!str(body.telephone)) errors.telephone = 'Merci d’indiquer votre numéro de téléphone.'
  if (!str(body.commune)) errors.commune = 'Merci d’indiquer votre commune.'
  if (!PROJET_VALUES.has(body.projet)) errors.projet = 'Merci de préciser votre projet.'
  if (body.consent !== true) {
    errors.consent = 'Merci d’accepter la politique de confidentialité pour continuer.'
  }

  return errors
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée.' })
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const advisor = ADVISORS[body.advisorId]

  if (!advisor) {
    return res.status(400).json({ ok: false, error: 'Conseiller inconnu.' })
  }

  const errors = validate(body)
  if (Object.keys(errors).length) {
    return res.status(400).json({ ok: false, errors })
  }

  const advisorEmail = process.env[advisor.envVar]
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.CONTACT_FROM_EMAIL || 'IMMOVIA <onboarding@resend.dev>'
  const agencyEmail = process.env.CONTACT_EMAIL_AGENCY

  if (!advisorEmail || !apiKey) {
    // Config manquante côté serveur — on ne détaille jamais la cause au client.
    console.error(
      `[contact-conseiller] Configuration incomplète pour "${body.advisorId}" (adresse ou clé API manquante).`,
    )
    return res.status(500).json({
      ok: false,
      error: 'Une erreur est survenue. Merci de réessayer, ou appelez-nous directement.',
    })
  }

  const prenom = body.prenom.trim()
  const nom = body.nom.trim()
  const email = body.email.trim()
  const telephone = body.telephone.trim()
  const commune = body.commune.trim()
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const projetLabel = PROJET_LABELS[body.projet]
  const marketing = body.marketing === true

  const lines = [
    `Nouvelle demande depuis la fiche de ${advisor.nom} sur immovia.fr`,
    '',
    `Prénom : ${prenom}`,
    `Nom : ${nom}`,
    `E-mail : ${email}`,
    `Téléphone : ${telephone}`,
    `Commune : ${commune}`,
    `Projet : ${projetLabel}`,
    message ? `Précisions : ${message}` : null,
    '',
    `Consentement RGPD (traitement de la demande) : oui`,
    `Accepte d'être recontacté(e) à des fins commerciales : ${marketing ? 'oui' : 'non'}`,
  ].filter((l) => l !== null)

  const text = lines.join('\n')
  const html = `
    <div style="font-family: -apple-system, sans-serif; font-size: 14px; color: #10141C; line-height: 1.6;">
      <p>Nouvelle demande depuis la fiche de <strong>${escapeHtml(advisor.nom)}</strong> sur immovia.fr</p>
      <table cellpadding="4" cellspacing="0" style="margin-top:12px;">
        <tr><td><strong>Prénom</strong></td><td>${escapeHtml(prenom)}</td></tr>
        <tr><td><strong>Nom</strong></td><td>${escapeHtml(nom)}</td></tr>
        <tr><td><strong>E-mail</strong></td><td>${escapeHtml(email)}</td></tr>
        <tr><td><strong>Téléphone</strong></td><td>${escapeHtml(telephone)}</td></tr>
        <tr><td><strong>Commune</strong></td><td>${escapeHtml(commune)}</td></tr>
        <tr><td><strong>Projet</strong></td><td>${escapeHtml(projetLabel)}</td></tr>
        ${message ? `<tr><td valign="top"><strong>Précisions</strong></td><td>${escapeHtml(message)}</td></tr>` : ''}
      </table>
      <p style="margin-top:16px; color:#555;">
        Accepte d'être recontacté(e) à des fins commerciales : ${marketing ? 'oui' : 'non'}
      </p>
    </div>
  `

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [advisorEmail],
        bcc: agencyEmail ? [agencyEmail] : undefined,
        reply_to: email,
        subject: advisor.nom,
        text,
        html,
      }),
    })

    if (!resendRes.ok) {
      const detail = await resendRes.text().catch(() => '')
      console.error('[contact-conseiller] Échec Resend', resendRes.status, detail)
      return res.status(500).json({
        ok: false,
        error: 'Une erreur est survenue. Merci de réessayer, ou appelez-nous directement.',
      })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[contact-conseiller] Erreur inattendue', err)
    return res.status(500).json({
      ok: false,
      error: 'Une erreur est survenue. Merci de réessayer, ou appelez-nous directement.',
    })
  }
}
