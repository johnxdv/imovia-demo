// Prérendu statique des articles, après `vite build`.
//
// POURQUOI CE SCRIPT EXISTE
//
// Le site est une application React servie par une coquille unique : le
// contenu n'existe que dans le paquet JavaScript, et `vercel.json` réécrit
// toutes les routes vers `index.html`. Googlebot exécute le JavaScript et
// finit par voir les pages. GPTBot, PerplexityBot et ClaudeBot, non : ils
// lisent le HTML brut de la réponse.
//
// Sans ce prérendu, un article serait donc invisible pour exactement les
// robots que `public/robots.txt` prend soin d'autoriser, et le balisage
// schema.org ne serait lu par personne. Le script écrit, pour chaque article,
// un vrai fichier HTML qui porte le texte, les titres, la FAQ et le balisage
// dans sa source.
//
// CE QUE VERCEL EN FAIT
//
// Un fichier présent sur le disque est servi avant toute réécriture : c'est
// l'ordre de résolution de Vercel, `filesystem` puis `rewrites`. Les pages
// écrites ici court-circuitent donc la coquille SPA, sans qu'il y ait quoi que
// ce soit à déclarer dans `vercel.json`.
//
// ET POUR UN VISITEUR HUMAIN
//
// La page statique porte les mêmes balises `<script>` que la coquille : React
// démarre, remplace le contenu du conteneur par la page React, et la
// navigation interne reprend son cours. Le visiteur voit l'article tout de
// suite, prérendu, puis la version applicative — d'où les classes du site
// reprises dans le rendu statique, pour que la bascule ne se voie pas.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

import { agency } from '../src/data/agency.js'
import { corpsHtml, dateLisible, echappe, lireArticles, titreHtml } from './_lib/article.mjs'
import { baliseHtml } from './_lib/jsonLd.mjs'

const RACINE = path.resolve(import.meta.dirname, '..')
const DIST = path.join(RACINE, 'dist')
const BASE = process.env.SITE_URL?.replace(/\/$/, '') || agency.siteUrl

/** Routes fixes du site, pour le sitemap. */
const ROUTES_FIXES = [
  { url: '/', priorite: '1.0' },
  { url: '/estimer', priorite: '0.9' },
  { url: '/acheter', priorite: '0.8' },
  { url: '/louer', priorite: '0.8' },
  { url: '/vendre', priorite: '0.8' },
  { url: '/equipe', priorite: '0.6' },
  { url: '/contact', priorite: '0.6' },
  { url: '/recrutement', priorite: '0.4' },
  { url: '/blog', priorite: '0.7' },
  { url: '/mentions-legales', priorite: '0.2' },
  { url: '/confidentialite', priorite: '0.2' },
  { url: '/plan-du-site', priorite: '0.2' },
  // `/seo` n'y figure pas, et c'est le seul intérêt d'une page sans lien :
  // l'inscrire au sitemap la ferait découvrir en une journée.
]

/**
 * Compose une page à partir de la coquille construite par Vite.
 *
 * On réutilise `dist/index.html` plutôt que d'écrire un gabarit : c'est lui
 * qui porte les noms de fichiers hachés des paquets JS et CSS, qui changent à
 * chaque construction. Un gabarit séparé serait périmé au premier build.
 */
function composePage(coquille, { titre, description, canonique, tete, corps }) {
  return coquille
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${echappe(titre)}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      `<meta name="description" content="${echappe(description)}" />`,
    )
    .replace(
      /<link rel="icon"/,
      `<link rel="canonical" href="${echappe(canonique)}" />\n    <link rel="icon"`,
    )
    .replace('</head>', `${tete}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">\n${corps}\n    </div>`)
}

/** Balises de partage — un article partagé sans aperçu perd la moitié de ses clics. */
function openGraph({ titre, description, url, image, type = 'article', publie }) {
  const absolue = image ? (image.startsWith('http') ? image : `${BASE}${image}`) : null

  return [
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:title" content="${echappe(titre)}" />`,
    `<meta property="og:description" content="${echappe(description)}" />`,
    `<meta property="og:url" content="${echappe(url)}" />`,
    `<meta property="og:locale" content="fr_FR" />`,
    `<meta property="og:site_name" content="${echappe(agency.name)}" />`,
    absolue ? `<meta property="og:image" content="${echappe(absolue)}" />` : null,
    publie ? `<meta property="article:published_time" content="${echappe(publie)}" />` : null,
    `<meta name="twitter:card" content="${absolue ? 'summary_large_image' : 'summary'}" />`,
  ]
    .filter(Boolean)
    .map((l) => `    ${l}`)
    .join('\n')
}

/** Page de liste — prérendue elle aussi : c'est la porte d'entrée du blog. */
function listeHtml(articles) {
  const items = articles
    .map(
      (a) => `          <li class="border-t border-white/10 py-8">
            <a href="/blog/${echappe(a.slug)}" class="block">
              <p class="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-brass">${echappe(a.ville ?? '')} · ${echappe(dateLisible(a.datePublication))}</p>
              <h2 class="mt-3 font-display text-2xl text-stone">${echappe(a.titre)}</h2>
              <p class="mt-3 max-w-2xl text-base leading-relaxed text-stone/70">${echappe(a.resume)}</p>
            </a>
          </li>`,
    )
    .join('\n')

  return `      <div class="mx-auto w-full max-w-3xl px-6 py-24">
        <p class="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-brass">Le marché, vu du secteur</p>
        <h1 class="mt-6 font-display text-4xl leading-tight text-stone">Articles</h1>
        <p class="mt-6 text-lg leading-relaxed text-stone/75">Ce que nous observons sur le marché immobilier de la Moselle-Est, chiffres à l’appui.</p>
        <ul class="mt-12">
${items || '          <li class="border-t border-white/10 py-8 text-stone/60">Aucun article pour le moment.</li>'}
        </ul>
      </div>`
}

async function main() {
  const articles = await lireArticles()

  let coquille
  try {
    coquille = await readFile(path.join(DIST, 'index.html'), 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('prerender-blog — dist/index.html introuvable. Lancez `vite build` d’abord.')
      process.exitCode = 1
      return
    }
    throw error
  }

  // Un article par dossier : `dist/blog/mon-article/index.html` est servi à
  // l'adresse `/blog/mon-article`, sans extension visible.
  for (const article of articles) {
    const url = `${BASE}/blog/${article.slug}`
    const dossier = path.join(DIST, 'blog', article.slug)
    await mkdir(dossier, { recursive: true })

    const page = composePage(coquille, {
      // Borné à 60 caractères : au-delà, une page de résultats coupe la fin,
      // et c'est la fin qui porte la promesse de l'article.
      titre: titreHtml(article, agency.name),
      description: article.resume,
      canonique: url,
      tete: [
        openGraph({
          // Open Graph n'a pas la contrainte de longueur d'un résultat de
          // recherche : l'aperçu d'un partage affiche le titre en entier.
          titre: article.titre,
          description: article.resume,
          url,
          image: article.image?.src,
          publie: article.datePublication,
        }),
        `    ${baliseHtml(article, BASE).split('\n').join('\n    ')}`,
      ].join('\n'),
      corps: corpsHtml(article),
    })

    await writeFile(path.join(dossier, 'index.html'), page, 'utf8')
    console.log(`  ✓ /blog/${article.slug}`)
  }

  // Liste.
  await mkdir(path.join(DIST, 'blog'), { recursive: true })
  await writeFile(
    path.join(DIST, 'blog', 'index.html'),
    composePage(coquille, {
      titre: `Articles — ${agency.name}`,
      description: `Le marché immobilier de la Moselle-Est vu par ${agency.name} : prix au m², comparaisons de communes et de quartiers.`,
      canonique: `${BASE}/blog`,
      tete: openGraph({
        titre: `Articles — ${agency.name}`,
        description: 'Le marché immobilier de la Moselle-Est, chiffres à l’appui.',
        url: `${BASE}/blog`,
        image: null,
        type: 'website',
      }),
      corps: listeHtml(articles),
    }),
    'utf8',
  )
  console.log(`  ✓ /blog  (${articles.length} article${articles.length > 1 ? 's' : ''})`)

  // Sitemap.
  const entrees = [
    ...ROUTES_FIXES.map((r) => ({ url: `${BASE}${r.url}`, priorite: r.priorite, date: null })),
    ...articles.map((a) => ({
      url: `${BASE}/blog/${a.slug}`,
      priorite: '0.7',
      date: a.dateModification ?? a.datePublication,
    })),
  ]

  await writeFile(
    path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entrees
      .map(
        (e) =>
          `  <url>\n    <loc>${echappe(e.url)}</loc>\n${e.date ? `    <lastmod>${echappe(e.date)}</lastmod>\n` : ''}    <priority>${e.priorite}</priority>\n  </url>`,
      )
      .join('\n')}\n</urlset>\n`,
    'utf8',
  )
  console.log(`  ✓ /sitemap.xml  (${entrees.length} adresses)`)
}

main().catch((error) => {
  console.error(`prerender-blog — ${error?.message ?? error}`)
  process.exitCode = 1
})
