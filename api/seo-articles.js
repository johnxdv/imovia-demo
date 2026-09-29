// Fonction serverless Vercel — écriture des articles depuis la page `/seo`.
//
// CE QU'ELLE FAIT, ET POURQUOI ELLE PASSE PAR GIT
//
// Le site est statique : un article est un fichier de `src/data/articles/`,
// commité puis déployé. Il n'y a pas de base de données à modifier, et le
// disque d'une fonction serverless est jetable — écrire dedans ne publierait
// rien. Les deux actions de la page d'administration passent donc par l'API
// GitHub, exactement là où l'import Modelo écrit : sur la branche du site. Le
// commit déclenche le redéploiement, comme pour les biens.
//
// Conséquence à connaître : un article publié ici n'est pas en ligne
// immédiatement. Il l'est au terme du déploiement, une ou deux minutes plus
// tard. La page le dit à l'utilisateur.
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  SANS `SEO_ADMIN_TOKEN`, CE POINT D'ENTRÉE EST OUVERT À TOUT LE MONDE.   ║
// ║                                                                          ║
// ║  Il écrit dans le dépôt Git du site. Sans jeton, n'importe quelle        ║
// ║  requête HTTP vers `/api/seo-articles` peut publier un article sur le    ║
// ║  site du client ou supprimer ceux qui y sont — aucune authentification,  ║
// ║  aucune limite de débit, aucune trace nominative.                        ║
// ║                                                                          ║
// ║  C'est un choix assumé à la mise en place, pas un oubli. Il se corrige   ║
// ║  en déclarant `SEO_ADMIN_TOKEN` dans les variables d'environnement       ║
// ║  Vercel : le contrôle ci-dessous s'active alors de lui-même.             ║
// ╚══════════════════════════════════════════════════════════════════════════╝

import { SLUG_VALIDE, articleDepuisTexte, slugify } from './_lib/articleTexte.js'

const API = 'https://api.github.com'

/** Dépôt visé. Vercel renseigne l'origine du déploiement : on s'en sert par défaut. */
function depot() {
  const explicite = process.env.GITHUB_REPO
  if (explicite) return explicite

  const proprietaire = process.env.VERCEL_GIT_REPO_OWNER
  const nom = process.env.VERCEL_GIT_REPO_SLUG
  return proprietaire && nom ? `${proprietaire}/${nom}` : null
}

const branche = () => process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || 'main'

/**
 * Comparaison de jetons à durée constante.
 *
 * Une comparaison `===` sur une chaîne s'arrête au premier caractère différent,
 * ce qui laisse deviner le jeton caractère par caractère en mesurant le temps
 * de réponse. Le surcoût de la version constante est nul à cette échelle.
 */
function jetonValide(fourni, attendu) {
  const a = String(fourni ?? '')
  const b = String(attendu)
  if (a.length !== b.length) return false

  let ecart = 0
  for (let i = 0; i < b.length; i += 1) ecart |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return ecart === 0
}

/** Appel à l'API GitHub, jeton compris. */
async function github(chemin, options = {}) {
  const reponse = await fetch(`${API}${chemin}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'immovia-seo',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    signal: AbortSignal.timeout(15_000),
  })

  const data = await reponse.json().catch(() => ({}))
  return { ok: reponse.ok, status: reponse.status, data }
}

/** Écrit (ou remplace) un fichier sur la branche du site. */
async function ecritFichier(chemin, contenu, message) {
  const repo = depot()
  const ref = branche()

  // Un fichier existant ne peut être remplacé qu'en fournissant son `sha` :
  // c'est le garde-fou de GitHub contre l'écrasement d'une version qu'on n'a
  // pas lue. Son absence signifie simplement que le fichier est nouveau.
  const actuel = await github(`/repos/${repo}/contents/${chemin}?ref=${encodeURIComponent(ref)}`)
  const sha = actuel.ok ? actuel.data?.sha : undefined

  return github(`/repos/${repo}/contents/${chemin}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: Buffer.from(contenu, 'utf8').toString('base64'),
      branch: ref,
      ...(sha ? { sha } : {}),
    }),
  })
}

/** Supprime un fichier de la branche du site. */
async function supprimeFichier(chemin, message) {
  const repo = depot()
  const ref = branche()

  const actuel = await github(`/repos/${repo}/contents/${chemin}?ref=${encodeURIComponent(ref)}`)
  if (!actuel.ok) return { ok: false, status: 404, data: { message: 'Fichier introuvable.' } }

  return github(`/repos/${repo}/contents/${chemin}`, {
    method: 'DELETE',
    body: JSON.stringify({ message, sha: actuel.data.sha, branch: ref }),
  })
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  // La page d'administration n'est référencée nulle part ; l'indiquer malgré
  // tout aux robots ne coûte rien et couvre le cas d'une adresse partagée par
  // mégarde dans un message ou un signet public.
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')

  const attendu = process.env.SEO_ADMIN_TOKEN
  if (attendu && !jetonValide(req.headers['x-seo-token'], attendu)) {
    return res.status(401).json({ ok: false, error: 'Jeton d’administration manquant ou invalide.' })
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      protege: Boolean(attendu),
      ecritureConfiguree: Boolean(process.env.GITHUB_TOKEN && depot()),
      depot: depot(),
      branche: branche(),
    })
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'GET, POST, DELETE')
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée.' })
  }

  if (!process.env.GITHUB_TOKEN || !depot()) {
    return res.status(503).json({
      ok: false,
      error:
        'Écriture non configurée : GITHUB_TOKEN (et GITHUB_REPO hors Vercel) doivent être ' +
        'déclarées dans les variables d’environnement.',
    })
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {}

  try {
    if (req.method === 'DELETE') {
      const slug = String(body.slug ?? '')

      // Le slug entre dans un chemin de fichier du dépôt. Sans ce contrôle,
      // une valeur du type `../../vercel.json` viserait n'importe quel fichier
      // du site. C'est la seule entrée par laquelle cette fonction touche à un
      // chemin : elle est bornée à la lettre.
      if (!SLUG_VALIDE.test(slug)) {
        return res.status(400).json({ ok: false, error: 'Identifiant d’article invalide.' })
      }

      const resultat = await supprimeFichier(
        `src/data/articles/${slug}.json`,
        `Retire l'article ${slug}`,
      )

      if (!resultat.ok) {
        return res
          .status(resultat.status === 404 ? 404 : 502)
          .json({ ok: false, error: resultat.data?.message ?? 'Suppression refusée par GitHub.' })
      }

      return res.status(200).json({
        ok: true,
        message: 'Article supprimé. Il disparaîtra du site au terme du déploiement.',
      })
    }

    // POST — ajout manuel.
    const titre = String(body.titre ?? '').trim()
    const contenu = String(body.contenu ?? '')

    if (!titre) return res.status(400).json({ ok: false, error: 'Titre manquant.' })

    const { resume, sections } = articleDepuisTexte(titre, contenu)
    const slug = slugify(titre)

    const article = {
      slug,
      titre,
      resume,
      sujet: 'Saisi à la main depuis /seo',
      ville: null,
      datePublication: new Date().toISOString().slice(0, 10),
      auteur: 'IMMOVIA',
      sections,
      // Trois questions sont exigées par `valider()` côté script, parce qu'une
      // `FAQPage` vide est un balisage trompeur. Ici il n'y a pas de FAQ du
      // tout : le tableau reste vide et le prérendu n'émet simplement pas ce
      // bloc de balisage.
      faq: [],
      chiffresCites: [],
      image: null,
      meta: { genere: 'manuel' },
    }

    const resultat = await ecritFichier(
      `src/data/articles/${slug}.json`,
      `${JSON.stringify(article, null, 2)}\n`,
      `Publie l'article ${slug} (saisie manuelle)`,
    )

    if (!resultat.ok) {
      return res
        .status(502)
        .json({ ok: false, error: resultat.data?.message ?? 'Écriture refusée par GitHub.' })
    }

    return res.status(200).json({
      ok: true,
      slug,
      message: `Article « ${titre} » publié. Il sera en ligne au terme du déploiement.`,
    })
  } catch (error) {
    console.error('[seo-articles]', error?.message ?? error)
    return res.status(400).json({ ok: false, error: error?.message ?? 'Requête invalide.' })
  }
}
