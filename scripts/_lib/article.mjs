// Contrat d'un article : forme, emplacement, lecture, écriture, rendu HTML.
//
// Un article est un fichier JSON dans `src/data/articles/`, un par article.
// Ce choix suit celui déjà fait pour les biens (`src/data/properties.json`,
// réécrit par l'import Modelo puis commité) : le contenu du site vit dans le
// dépôt, et c'est le commit qui déclenche le déploiement. Rien n'est stocké
// ailleurs, aucune base de données n'entre dans l'histoire.
//
// Un fichier par article plutôt qu'un gros tableau, pour une raison précise :
// la page d'administration supprime des articles un par un, et supprimer un
// fichier est une opération que l'API GitHub sait faire sans relire ni
// réécrire le reste.

import { readdir, readFile, writeFile, unlink, mkdir } from 'node:fs/promises'
import path from 'node:path'

import { groupeSources, slugify, titreCourt } from '../../api/_lib/articleTexte.js'

// `slugify` est défini dans `api/_lib/` et réexporté ici : la fonction
// serverless d'administration et ce script fabriquent le même identifiant pour
// le même titre, et deux définitions qui divergeraient d'un caractère
// donneraient deux adresses pour un seul article.
export { slugify, titreCourt }

const RACINE = path.resolve(import.meta.dirname, '..', '..')
export const DOSSIER_ARTICLES = path.join(RACINE, 'src', 'data', 'articles')
export const DOSSIER_IMAGES = path.join(RACINE, 'public', 'blog')

/** Chemin, relatif à la racine du dépôt — c'est ce que l'API GitHub attend. */
export const cheminDepot = (slug) => `src/data/articles/${slug}.json`


/** Slug libre dans le dossier — `mon-article`, puis `mon-article-2`, etc. */
export async function slugDisponible(titre) {
  const base = slugify(titre)
  const pris = new Set((await lireArticles()).map((a) => a.slug))

  if (!pris.has(base)) return base
  for (let n = 2; n < 100; n += 1) {
    if (!pris.has(`${base}-${n}`)) return `${base}-${n}`
  }
  throw new Error(`slugDisponible : cent articles portent déjà le titre « ${titre} ».`)
}

/**
 * Vérifie qu'un article est publiable.
 *
 * Lève plutôt que de renvoyer une liste d'erreurs : un article incomplet ne
 * doit jamais atteindre le dépôt, et un appelant qui oublierait de regarder la
 * valeur de retour publierait une page cassée.
 */
export function valider(article) {
  const manque = []
  const exigeTexte = (champ) => {
    if (typeof article?.[champ] !== 'string' || article[champ].trim() === '') manque.push(champ)
  }

  exigeTexte('slug')
  exigeTexte('titre')
  // `categorie` n'est pas exigée : les articles saisis à la main depuis `/seo`
  // n'en portent pas, et c'est `categoriesRecentes()` qui sait les ignorer
  // dans la rotation. Exiger une catégorie ici bloquerait le dépannage.
  exigeTexte('resume')
  exigeTexte('datePublication')

  if (!Array.isArray(article?.sections) || article.sections.length === 0) {
    manque.push('sections (au moins une)')
  } else {
    article.sections.forEach((s, i) => {
      if (!s?.question) manque.push(`sections[${i}].question`)
      if (!Array.isArray(s?.paragraphes) || s.paragraphes.length === 0) {
        manque.push(`sections[${i}].paragraphes`)
      }
    })
  }

  // La FAQ alimente le balisage `FAQPage`. Deux cas sont acceptables : une
  // vraie FAQ d'au moins trois questions, ou pas de FAQ du tout — les articles
  // saisis à la main depuis `/seo` n'en ont aucune, et le prérendu n'émet
  // alors simplement pas ce bloc de balisage. Une ou deux questions, en
  // revanche, est une FAQ à moitié construite : on la refuse plutôt que de
  // publier un balisage plus pauvre que ce qu'il annonce.
  if (!Array.isArray(article?.faq)) {
    manque.push('faq (tableau, éventuellement vide)')
  } else if (article.faq.length > 0 && article.faq.length < 3) {
    manque.push('faq (trois questions au moins, ou aucune)')
  }

  if (manque.length > 0) {
    throw new Error(`Article incomplet — champs manquants : ${manque.join(', ')}.`)
  }

  return article
}

/** Tous les articles, du plus récent au plus ancien. */
export async function lireArticles() {
  let fichiers
  try {
    fichiers = await readdir(DOSSIER_ARTICLES)
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }

  const articles = await Promise.all(
    fichiers
      .filter((f) => f.endsWith('.json'))
      .map(async (f) => JSON.parse(await readFile(path.join(DOSSIER_ARTICLES, f), 'utf8'))),
  )

  return articles.sort((a, b) => String(b.datePublication).localeCompare(String(a.datePublication)))
}

/** Écrit un article validé. Renvoie son chemin relatif au dépôt. */
export async function ecrireArticle(article) {
  valider(article)
  await mkdir(DOSSIER_ARTICLES, { recursive: true })
  const fichier = path.join(DOSSIER_ARTICLES, `${article.slug}.json`)
  await writeFile(fichier, `${JSON.stringify(article, null, 2)}\n`, 'utf8')
  return cheminDepot(article.slug)
}

/** Supprime un article. Sans effet si le fichier n'existe pas. */
export async function supprimerArticle(slug) {
  try {
    await unlink(path.join(DOSSIER_ARTICLES, `${slug}.json`))
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

/** Échappement HTML — tout texte d'article y passe avant d'entrer dans une page. */
export const echappe = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** Date lisible en français, depuis une date ISO. */
export function dateLisible(iso) {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/**
 * Titre complet de la balise `<title>`, marque comprise, borné à 60.
 *
 * La troncature elle-même vit dans `api/_lib/articleTexte.js`, partagée avec
 * la page React — voir `titreCourt` pour le raisonnement.
 */
export function titreHtml(article, marque = 'IMMOVIA') {
  const suffixe = ` — ${marque}`
  return `${titreCourt(article, 60 - suffixe.length)}${suffixe}`
}

/**
 * Corps de l'article en HTML sémantique.
 *
 * Ce rendu sert le prérendu statique — donc les robots qui n'exécutent pas de
 * JavaScript. Il double le composant React de `src/pages/Article.jsx`, et c'est
 * assumé : ce que ces robots doivent trouver, c'est une hiérarchie de titres et
 * des paragraphes, pas la mise en scène du site. Les classes Tailwind du site
 * sont malgré tout reprises pour que la page soit déjà correcte à l'œil pendant
 * la fraction de seconde qui précède la prise de relais par React.
 *
 * **Les deux rendus doivent rester d'accord sur la structure** : un `h2` ici et
 * un `h3` là-bas donneraient deux lectures différentes du même article selon le
 * visiteur. Toute modification de structure se fait des deux côtés.
 */
export function corpsHtml(article) {
  const sections = article.sections
    .map(
      (s) => `        <section class="mt-12">
          <h2 class="font-display text-2xl text-stone">${echappe(s.question)}</h2>
${s.paragraphes.map((p) => `          <p class="mt-4 text-base leading-relaxed text-stone/75">${echappe(p)}</p>`).join('\n')}
        </section>`,
    )
    .join('\n')

  const faq = (article.faq ?? [])
    .map(
      (q) => `          <div class="mt-8 border-t border-white/10 pt-6">
            <h3 class="font-display text-xl text-stone">${echappe(q.question)}</h3>
            <p class="mt-3 text-base leading-relaxed text-stone/75">${echappe(q.reponse)}</p>
          </div>`,
    )
    .join('\n')

  // Sources extérieures, une par page citée. Un article qui reprend un chiffre
  // venu d'ailleurs doit dire d'où, et permettre d'y aller : le lien fait la
  // différence entre une citation et une affirmation. `rel="nofollow"` parce
  // que ce sont des références, pas des recommandations — et parmi elles
  // peuvent figurer des sites concurrents.
  const sources = groupeSources(article.sources)
    .map(
      (s) => `            <li class="mt-5">
              <a href="${echappe(s.url)}" rel="nofollow noopener" target="_blank" class="font-mono text-xs text-brass">${echappe(s.source)}</a>
              <ul>
${s.enonces.map((e) => `                <li class="mt-1.5 font-mono text-xs leading-relaxed text-stone/55">${echappe(e)}</li>`).join('\n')}
              </ul>
            </li>`,
    )
    .join('\n')

  // Clôture : le lien interne vers l'estimateur.
  //
  // Il vit ici, dans le rendu statique, et pas seulement dans la page React :
  // un robot qui n'exécute pas de JavaScript ne voyait jusqu'ici AUCUN lien
  // entre l'article et l'outil d'estimation. Un article sur les prix d'un
  // secteur qui ne renvoie pas vers l'estimateur de ce secteur perd à la fois
  // son lecteur et le maillage interne qui donne du poids à la page visée.
  //
  // L'intitulé nomme la commune traitée quand elle est connue : « Estimez
  // votre bien à Forbach » dit où l'on va, là où « en savoir plus » ne dit
  // rien — au lecteur comme au moteur.
  const ou = article.ville ? ` à ${article.ville}` : ' dans le secteur'
  const cloture = `        <section class="mt-16 border-t border-white/10 pt-10">
          <p class="text-lg leading-relaxed text-stone/80">Vous vous demandez ce que vaut votre bien${echappe(ou)} ?</p>
          <p class="mt-3 text-base leading-relaxed text-stone/65">Notre estimation en ligne s’appuie sur les mêmes relevés de prix que cet article, appliqués à l’adresse, à la surface et à l’état de votre logement.</p>
          <p class="mt-6">
            <a href="/estimer" class="inline-flex items-center gap-2.5 border border-brass bg-brass px-6 py-3 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-ink">Estimez votre bien${echappe(ou)}</a>
          </p>
        </section>`

  const image = article.image?.src
    ? `        <figure class="mt-10">
          <img src="${echappe(article.image.src)}" alt="${echappe(article.image.alt)}" class="w-full" loading="lazy" />
${article.image.credit ? `          <figcaption class="mt-3 font-mono text-xs text-stone/45">${echappe(article.image.credit)}</figcaption>` : ''}
        </figure>`
    : ''

  return `      <article class="mx-auto w-full max-w-3xl px-6 py-24">
        <p class="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-brass">${echappe(article.ville ?? '')} · ${echappe(dateLisible(article.datePublication))}</p>
        <h1 class="mt-6 font-display text-4xl leading-tight text-stone">${echappe(article.titre)}</h1>
        <p class="mt-6 text-lg leading-relaxed text-stone/80">${echappe(article.resume)}</p>
${image}
${sections}
${
  faq
    ? `        <section class="mt-16">
          <h2 class="font-display text-2xl text-stone">Questions fréquentes</h2>
${faq}
        </section>`
    : ''
}
${cloture}
${
  sources
    ? `        <section class="mt-16 border-t border-white/10 pt-8">
          <h2 class="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-brass">Sources</h2>
          <ul class="mt-4">
${sources}
          </ul>
        </section>`
    : ''
}
      </article>`
}
