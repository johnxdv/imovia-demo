// Les trois fichiers de la racine du site, écrits à la construction.
//
// POURQUOI ILS SONT GÉNÉRÉS ET NON POSÉS DANS `public/`
//
// Tous les trois portent l'adresse du site. Un `robots.txt` figé dans
// `public/` annonçait son sitemap sur l'apex pendant que le reste du projet
// était passé au `www` : c'est exactement la divergence que `agency.siteUrl`
// existe pour empêcher. Ce qui dérive de l'hôte se calcule à partir de l'hôte.
//
// `404.html` est le troisième parce que Vercel le sert — avec un vrai statut
// 404 — dès qu'aucun fichier ni aucune réécriture ne correspond. C'est ce qui
// remplace la coquille SPA renvoyée en 200 sur n'importe quelle adresse.

import { writeFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Robots nommés un par un, alors qu'`Allow: /` les couvre déjà.
 *
 * Les nommer ne change rien à ce qu'ils ont le droit de lire : c'est une
 * déclaration d'intention, lue par des humains autant que par des robots. La
 * distinction qui compte est celle que l'audit relève : `GPTBot` et
 * `ClaudeBot` collectent pour l'entraînement, `OAI-SearchBot`,
 * `Claude-SearchBot` et `PerplexityBot` vont chercher une page pour la citer
 * dans une réponse, et `ChatGPT-User` et `Claude-User` la visitent parce qu'un
 * utilisateur l'a demandée. Ce sont les trois derniers groupes qui envoient du
 * monde sur le site.
 */
const ROBOTS_NOMMES = [
  ['GPTBot', 'OpenAI — collecte pour l’entraînement'],
  ['OAI-SearchBot', 'OpenAI — indexation pour les réponses citées'],
  ['ChatGPT-User', 'OpenAI — visite déclenchée par un utilisateur'],
  ['ClaudeBot', 'Anthropic — collecte pour l’entraînement'],
  ['Claude-SearchBot', 'Anthropic — indexation pour les réponses citées'],
  ['Claude-User', 'Anthropic — visite déclenchée par un utilisateur'],
  ['PerplexityBot', 'Perplexity — indexation pour les réponses citées'],
]

/**
 * `robots.txt`.
 *
 * `/seo` n'y est mentionnée NI en `Allow` NI en `Disallow`, et l'ancien
 * commentaire qui expliquait son absence a disparu avec elle : il nommait
 * l'adresse qu'il s'agissait de ne pas publier, dans le seul fichier du site
 * que tout le monde lit. La page est tenue hors index par l'en-tête
 * `X-Robots-Tag` de `vercel.json` et par sa propre balise `robots`, qui ne
 * demandent à personne de connaître son chemin.
 */
export async function ecritRobots(dist, base) {
  const nommes = ROBOTS_NOMMES.map(
    ([agent, role]) => `# ${role}\nUser-agent: ${agent}\nAllow: /\n`,
  ).join('\n')

  const contenu = `# robots.txt — IMMOVIA
#
# Tout est autorisé. L'absence de robots.txt vaudrait la même chose, mais
# l'autorisation des moteurs génératifs mérite d'être explicite.
#
# CES ROBOTS N'EXÉCUTENT PAS LE JAVASCRIPT. Les y autoriser n'a de sens que
# parce que les pages sont prérendues en HTML statique à la construction
# (\`scripts/prerender-blog.mjs\`). Si le prérendu disparaît, ces règles ne
# veulent plus rien dire.

User-agent: *
Allow: /

${nommes}
Sitemap: ${base}/sitemap.xml
`

  await writeFile(path.join(dist, 'robots.txt'), contenu, 'utf8')
}

/**
 * `llms.txt` — description courte du site pour un agent qui le découvre.
 *
 * Il répondait 200 avec la coquille SPA, comme toute adresse inconnue : un
 * agent y lisait une page d'application vide en croyant lire un descriptif.
 * Entre un vrai fichier et un 404, le fichier coûte dix lignes et évite
 * d'avoir à deviner ce que fait le site.
 *
 * RIEN N'Y EST ÉCRIT QUI NE SOIT AILLEURS SUR LE SITE. Les rubriques sont
 * celles du menu, les articles ceux qui existent, les coordonnées celles de
 * `agency`. Aucun argumentaire, aucun chiffre.
 */
export async function ecritLlms(dist, base, { agency, articles, communes }) {
  // « 57980 DIEBLING » est une ligne postale ; le nom de la commune s'écrit
  // autrement dès qu'il entre dans une phrase.
  const brute = agency.address.line2.replace(/^\d+\s*/, '')
  const commune = brute.charAt(0) + brute.slice(1).toLowerCase()

  const liens = articles
    .slice(0, 12)
    .map((a) => `- [${a.titre}](${base}/blog/${a.slug})`)
    .join('\n')

  const villes = communes.map((c) => `- [${c.nom}](${base}/agence-immobiliere/${c.slug})`).join('\n')

  const contenu = `# ${agency.name}

> ${agency.baseline} indépendante installée à ${commune} (Moselle), dans le secteur de la Moselle-Est. Vente, location et estimation de biens.

Coordonnées : ${agency.address.line1}, ${agency.address.line2} — ${agency.phone} — ${agency.email}
Carte professionnelle ${agency.legal.carteProfessionnelle}, délivrée par ${agency.legal.carteDelivreePar}.

## Pages principales

- [Accueil](${base}/)
- [Estimation en ligne](${base}/estimer) — estimation d'un bien à partir de son adresse
- [Biens à vendre](${base}/acheter)
- [Biens à louer](${base}/louer)
- [Vendre son bien](${base}/vendre)
- [L'équipe](${base}/equipe)
- [Contact](${base}/contact)

## Articles

${liens}

## Pages par commune

${villes}
`

  await writeFile(path.join(dist, 'llms.txt'), contenu, 'utf8')
}

/**
 * `404.html` — la page servie quand rien ne correspond.
 *
 * MÊMES CLASSES QUE `src/pages/NotFound.jsx`, et ici c'est vital :
 * `tailwind.config.js` ne balaie que `./index.html` et `./src/**`, donc une
 * classe employée par ce seul fichier est purgée du CSS produit et ne fait
 * rien. Toutes celles qui suivent sont déjà portées par un composant du site.
 *
 * Elle ne charge PAS l'application : une page d'erreur qui démarre React
 * verrait le routeur rendre à son tour son propre 404, et le statut HTTP serait
 * le seul à distinguer les deux. Autant servir du HTML et s'arrêter là.
 */
export async function ecrit404(dist, coquille, base, agency) {
  const lien = (href, libelle) =>
    `<a href="${href}" class="inline-flex items-center gap-2.5 border border-brass bg-brass px-6 py-3 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-ink">${libelle}</a>`

  const secondaire = (href, libelle) =>
    `<a href="${href}" class="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-stone/70">${libelle}</a>`

  const corps = `      <section class="flex min-h-screen items-center bg-ink text-stone">
        <div class="container-page py-32">
          <p class="eyebrow">Erreur 404</p>
          <h1 class="mt-6 max-w-2xl text-display-lg">Cette page n’existe pas.</h1>
          <p class="mt-6 max-w-md text-lg text-stone/70">Le lien est peut-être erroné, ou la page a été déplacée.</p>
          <div class="mt-10">${lien('/', 'Retour à l’accueil')}</div>
          <p class="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            ${secondaire('/acheter', 'Acheter')}
            ${secondaire('/louer', 'Louer')}
            ${secondaire('/estimer', 'Estimer mon bien')}
          </p>
        </div>
      </section>`

  const page = coquille
    .replace(/<title>[\s\S]*?<\/title>/, `<title>Page introuvable — ${agency.name}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      '<meta name="description" content="Cette page n’existe pas ou a été déplacée." />',
    )
    .replace(/<link rel="icon"/, '<meta name="robots" content="noindex, follow" />\n    <link rel="icon"')
    // Le script de l'application est retiré : voir l'en-tête de cette fonction.
    .replace(/\s*<script type="module"[\s\S]*?<\/script>/g, '')
    .replace('<div id="root"></div>', `<div id="root">\n${corps}\n    </div>`)

  await writeFile(path.join(dist, '404.html'), page, 'utf8')
}
