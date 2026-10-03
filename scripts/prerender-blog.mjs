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
import {
  corpsHtml,
  dateLisible,
  echappe,
  libelleFormat,
  lireArticles,
  tempsLecture,
  titreHtml,
} from './_lib/article.mjs'
import { baliseHtml } from './_lib/jsonLd.mjs'
import { lireSecteur } from './_lib/planification.mjs'
import { slugify } from '../api/_lib/articleTexte.js'

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

/**
 * Page de liste — prérendue elle aussi : c'est la porte d'entrée du blog.
 *
 * JUMELLE DE `src/pages/Blog.jsx`. Mêmes classes des deux côtés : celles que ce
 * fichier emploie seul sont purgées du CSS produit, puisque `tailwind.config.js`
 * ne balaie que `./index.html` et `./src/**`.
 */
function listeHtml(articles) {
  const items = articles
    .map((a) => {
      const eyebrow = [a.format ? libelleFormat(a.format) : null, a.ville].filter(Boolean).join(' · ')
      const vignette = a.imageEnTete?.src
        ? `                <img src="${echappe(a.imageEnTete.src)}" alt="" class="aspect-[16/10] w-full object-cover" loading="lazy" decoding="async" />`
        : '                <div class="aspect-[16/10] w-full bg-ink/10"></div>'

      return `            <li>
              <a href="/blog/${echappe(a.slug)}" class="group block">
${vignette}
                <p class="mt-5 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-brass-sombre">${echappe(eyebrow)}</p>
                <h2 class="mt-3 font-display text-[1.45rem] leading-snug text-ink">${echappe(a.titre)}</h2>
                <p class="mt-3 text-[0.95rem] leading-[1.7] text-ink/70">${echappe(a.resume)}</p>
                <p class="mt-4 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink/65">${echappe(dateLisible(a.datePublication))} · ${tempsLecture(a)} min</p>
              </a>
            </li>`
    })
    .join('\n')

  return `      <div class="bg-white text-ink">
        <div class="mx-auto w-full max-w-[1320px] px-6 py-24">
        <p class="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-brass-sombre">Le marché, vu du secteur</p>
        <h1 class="mt-6 font-display text-4xl leading-tight text-ink">Articles</h1>
        <p class="mt-6 max-w-2xl text-lg leading-relaxed text-ink/75">Ce que nous observons sur le marché immobilier de la Moselle-Est : guides pratiques, communes du secteur, conseils de vente et relevés de prix.</p>
        <ul class="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2">
${items || '          <li class="text-ink/65">Aucun article pour le moment.</li>'}
          </ul>
        </div>
      </div>`
}

/**
 * Page d'agence d'une commune — jumelle de `src/pages/AgenceCommune.jsx`.
 *
 * MÊMES CLASSES DES DEUX CÔTÉS, et ici c'est vital : `tailwind.config.js` ne
 * balaie que `./index.html` et `./src/**`, donc une classe employée seulement
 * par ce fichier est purgée du CSS produit et ne fait rien.
 *
 * TOUT CE QUI S'Y ÉCRIT EST VÉRIFIABLE. Identité de l'agence, adresse,
 * téléphone, horaires, carte professionnelle, distance relevée, articles
 * consacrés à la commune — et rien d'autre. Pas une phrase d'ambiance, pas une
 * statistique de marché : ces pages existent pour donner une destination aux
 * ancres « agence immobilière {ville} », pas pour meubler.
 */
function agenceHtml(commune, articles, communes) {
  const lies = articles.filter((a) => a.ville === commune.nom)
  const siege = commune.distanceKm === 0
  // Le nom tel qu'il s'écrit, et non la ligne postale « 57980 DIEBLING ».
  const villeSiege = communes.find((c) => c.distanceKm === 0)?.nom ?? commune.nom

  const presentation = siege
    ? `${agency.name} est une agence immobilière indépendante. Son bureau se trouve à ${commune.nom}, ${agency.address.line1}.`
    : `${agency.name} est une agence immobilière indépendante installée à ${villeSiege}, à ${String(commune.distanceKm).replace('.', ',')} km de ${commune.nom}. La commune fait partie de son secteur d’intervention.`

  const horaires = agency.hours
    .map(
      ({ jour, horaire }) => `            <div class="flex gap-3 text-stone">
              <dt class="w-24 shrink-0">${echappe(jour)}</dt>
              <dd class="font-mono text-sm text-stone/80">${echappe(horaire)}</dd>
            </div>`,
    )
    .join('\n')

  const liste =
    lies.length > 0
      ? `          <ul class="mt-6 space-y-6">
${lies
  .map(
    (a) => `            <li class="border-t border-brass/20 pt-5">
              <a href="/blog/${echappe(a.slug)}" class="group block">
                <p class="font-mono text-[0.65rem] uppercase tracking-micro text-stone/50">${echappe(dateLisible(a.datePublication))}</p>
                <p class="mt-1.5 font-display text-lg leading-snug text-stone">${echappe(a.titre)}</p>
              </a>
            </li>`,
  )
  .join('\n')}
          </ul>`
      : `          <p class="mt-4 text-[1.0625rem] leading-[1.75] text-stone/75">Aucun article ne porte encore sur ${echappe(commune.nom)}. <a href="/blog" class="text-brass">Le blog</a> publie des analyses de prix et des guides sur les communes de la Moselle-Est.</p>`

  return `      <div class="mx-auto w-full max-w-[1320px] px-6 py-24">
        <p class="font-mono text-[0.62rem] uppercase tracking-micro text-stone/50">${echappe(agency.name)} · ${echappe(commune.nom)}</p>
        <h1 class="mt-6 font-display text-4xl leading-tight text-stone">Agence immobilière à ${echappe(commune.nom)}</h1>
        <p class="mt-6 max-w-2xl text-lg leading-relaxed text-stone/75">${echappe(presentation)}</p>
        <div class="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div class="lg:col-span-5">
            <p class="mb-2 block font-mono text-[0.62rem] uppercase tracking-micro text-stone/50">Adresse</p>
            <p class="text-stone">${echappe(agency.address.line1)}<br />${echappe(agency.address.line2)}</p>
            <p class="mb-2 mt-6 block font-mono text-[0.62rem] uppercase tracking-micro text-stone/50">Téléphone</p>
            <a href="${echappe(agency.phoneHref)}" class="font-mono text-stone">${echappe(agency.phone)}</a>
            <p class="mb-2 mt-6 block font-mono text-[0.62rem] uppercase tracking-micro text-stone/50">Email</p>
            <a href="mailto:${echappe(agency.email)}" class="font-mono text-stone">${echappe(agency.email)}</a>
            <p class="mb-2 mt-6 block font-mono text-[0.62rem] uppercase tracking-micro text-stone/50">Horaires</p>
            <dl class="mt-1 space-y-1">
${horaires}
            </dl>
            <p class="mt-10 font-mono text-[0.68rem] leading-relaxed text-stone/50">Carte professionnelle ${echappe(agency.legal.carteProfessionnelle)}, délivrée par ${echappe(agency.legal.carteDelivreePar)}.</p>
          </div>
          <div class="lg:col-span-7">
            <h2 class="font-display text-2xl text-stone">Estimation immobilière à ${echappe(commune.nom)}</h2>
            <p class="mt-4 text-[1.0625rem] leading-[1.75] text-stone/75">L’estimation en ligne s’appuie sur les relevés de prix du secteur, appliqués à l’adresse, à la surface et à l’état du logement.</p>
            <p class="mt-6"><a href="/estimer" class="inline-flex items-center gap-2.5 border border-brass bg-brass px-6 py-3 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-ink">Estimation immobilière ${echappe(commune.nom)}</a></p>
            <h2 class="mt-16 font-display text-2xl text-stone">${lies.length > 0 ? `Nos articles sur ${echappe(commune.nom)}` : 'Le marché du secteur'}</h2>
${liste}
            <p class="mt-12 font-mono text-[0.68rem] uppercase tracking-micro text-stone/50"><a href="/vendre">Vendre</a> · <a href="/acheter">Acheter</a> · <a href="/contact">Contact</a></p>
          </div>
        </div>
      </div>`
}

async function main() {
  const articles = await lireArticles()
  const communes = (await lireSecteur()).map((c) => ({ ...c, slug: slugify(c.nom) }))

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
      // LA MÉTA-DESCRIPTION EST ÉCRITE POUR ÊTRE LUE DANS UNE PAGE DE RÉSULTATS,
      // le résumé pour être lu en tête d'article. Ce sont deux textes différents
      // et ils l'étaient déjà : le résumé fait trois phrases et quatre cents
      // caractères, dont un moteur n'en montre que cent cinquante-cinq. La
      // description vise en plus le mot-clé commercial de la commune (voir
      // `seo-mots-cles.mjs`). Le résumé reste le repli des articles d'avant.
      description: article.seo?.metaDescription ?? article.resume,
      canonique: url,
      tete: [
        openGraph({
          // Open Graph n'a pas la contrainte de longueur d'un résultat de
          // recherche : l'aperçu d'un partage affiche le titre en entier.
          titre: article.titre,
          description: article.seo?.metaDescription ?? article.resume,
          url,
          // La photo d'en-tête, pas le graphique : c'est elle qui fait un
          // aperçu de partage lisible. `article.image` est l'ancien champ
          // unique, gardé en secours le temps que tous les articles soient
          // repris — un aperçu vide coûte la moitié des clics d'un partage.
          image: article.imageEnTete?.src ?? article.image?.src,
          publie: article.datePublication,
        }),
        `    ${baliseHtml(article, BASE).split('\n').join('\n    ')}`,
      ].join('\n'),
      corps: corpsHtml(article, articles),
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

  // Pages d'agence, une par commune du secteur.
  for (const commune of communes) {
    const url = `${BASE}/agence-immobiliere/${commune.slug}`
    const dossier = path.join(DIST, 'agence-immobiliere', commune.slug)
    await mkdir(dossier, { recursive: true })

    const titre = `Agence immobilière à ${commune.nom} — ${agency.name}`
    const description = `${agency.name}, agence immobilière à ${commune.nom} : adresse, téléphone, horaires et estimation en ligne.`

    await writeFile(
      path.join(dossier, 'index.html'),
      composePage(coquille, {
        titre,
        description,
        canonique: url,
        tete: openGraph({ titre, description, url, image: null, type: 'website' }),
        corps: agenceHtml(commune, articles, communes),
      }),
      'utf8',
    )
  }
  console.log(`  ✓ /agence-immobiliere/…  (${communes.length} communes)`)

  // Sitemap.
  const entrees = [
    ...ROUTES_FIXES.map((r) => ({ url: `${BASE}${r.url}`, priorite: r.priorite, date: null })),
    ...articles.map((a) => ({
      url: `${BASE}/blog/${a.slug}`,
      priorite: '0.7',
      date: a.dateModification ?? a.datePublication,
    })),
    // Les pages d'agence passent en dernier et en priorité basse : ce sont des
    // points d'atterrissage, pas le contenu du site.
    ...communes.map((c) => ({ url: `${BASE}/agence-immobiliere/${c.slug}`, priorite: '0.5', date: null })),
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
