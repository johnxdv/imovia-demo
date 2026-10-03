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

import {
  CLES_FORMAT,
  articlesLies,
  decoupeLien,
  groupeSources,
  libelleFormat,
  lienInterne,
  slugify,
  tempsLecture,
  titreCourt,
  visuelsParSection,
} from '../../api/_lib/articleTexte.js'

// `slugify` est défini dans `api/_lib/` et réexporté ici : la fonction
// serverless d'administration et ce script fabriquent le même identifiant pour
// le même titre, et deux définitions qui divergeraient d'un caractère
// donneraient deux adresses pour un seul article.
export { slugify, titreCourt, tempsLecture, articlesLies, decoupeLien, libelleFormat, lienInterne }

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

  exigeTexte('resume')
  exigeTexte('datePublication')

  // `format` n'est pas exigé — un article saisi à la main depuis `/seo` n'en
  // porte pas — mais s'il est là, il doit être connu : un format inventé
  // choisirait silencieusement les règles d'un autre au rendu.
  if (article?.format && !CLES_FORMAT.includes(article.format)) {
    manque.push(`format inconnu « ${article.format} » (attendu : ${CLES_FORMAT.join(', ')})`)
  }

  // Le graphique n'appartient qu'à l'article de marché. C'est la règle qui
  // empêche le blog de redevenir ce qu'il était — un mur de barres sur tous les
  // sujets. `illustrations()` l'applique déjà à la production ; elle est
  // répétée ici parce qu'un article peut aussi arriver d'ailleurs.
  if (article?.graphique && article?.format && article.format !== 'marche') {
    manque.push(`graphique interdit sur le format « ${article.format} » (réservé à « marche »)`)
  }

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
 *
 * ILS DOIVENT AUSSI S'ACCORDER SUR LES CLASSES, POUR UNE RAISON MOINS ÉVIDENTE
 *
 * `tailwind.config.js` ne balaie que `./index.html` et `./src/**`. Ce fichier-ci
 * vit dans `scripts/` : une classe qu'il emploie et que la page React n'emploie
 * pas est purgée du CSS produit, et n'existe donc PAS. Elle n'échoue pas
 * bruyamment, elle ne fait simplement rien — un `aspect-[16/9]` absent laisse
 * une image sans hauteur réservée, et le défaut ne se voit qu'à l'œil sur la
 * page prérendue.
 *
 * Aucune classe ne doit donc apparaître ici sans apparaître aussi dans
 * `src/pages/Article.jsx`. Et aucune classe ne peut être CONSTRUITE : un
 * `grid-cols-${n}` n'est pas lisible par le balayage, même depuis `src/`.
 *
 * `tous` sert aux articles liés du pied de page. Absent, le bloc n'est
 * simplement pas rendu — c'est l'état du premier article publié.
 */
export function corpsHtml(article, tous = []) {
  // ── Un paragraphe, lien contextuel compris ─────────────────────────────
  //
  // L'échappement passe AVANT la découpe, segment par segment : le texte de
  // l'article ne peut donc pas injecter de balise, et l'ancre `[[…]]` est le
  // seul HTML que la rédaction sait produire. Voir `decoupeLien()`.
  const paragraphe = (p, { max = 1 } = {}) =>
    decoupeLien(p, { max })
      .map((seg) =>
        seg.lien
          ? `<a href="${echappe(lienInterne(seg.cible, article.ville))}" class="text-brass-sombre underline decoration-brass-sombre/40 underline-offset-4">${echappe(seg.texte)}</a>`
          : echappe(seg.texte),
      )
      .join('')

  /**
   * Une illustration, quelle qu'elle soit.
   *
   * Le crédit est un LIEN quand le fournisseur en donne un, et pas seulement un
   * nom : les conditions d'usage d'Unsplash imposent de créditer l'auteur par un
   * lien vers sa page. La version précédente conservait `creditUrl` dans le
   * fichier de l'article et ne l'affichait nulle part — le compte était donc en
   * infraction sans que rien ne le signale.
   *
   * `aspect-[16/9]` avec `object-cover` fixe la place de l'image avant son
   * arrivée : sans hauteur réservée, le texte sous l'image saute au chargement,
   * ce que les moteurs mesurent et sanctionnent.
   */
  const figure = (v, { hero = false } = {}) => {
    if (!v?.src) return ''
    const cadrage = v.type === 'graphique' ? 'w-full' : 'w-full aspect-[16/9] object-cover'
    const charge = hero
      ? 'loading="eager" fetchpriority="high"'
      : 'loading="lazy" decoding="async"'
    const credit = v.creditUrl
      ? `<a href="${echappe(v.creditUrl)}" rel="nofollow noopener" target="_blank">${echappe(v.credit)}</a>`
      : echappe(v.credit ?? '')

    return `        <figure class="${hero ? 'mt-10' : 'mt-12'}">
          <img src="${echappe(v.src)}" alt="${echappe(v.alt ?? '')}" class="${cadrage}" ${charge} />
${v.credit ? `          <figcaption class="mt-3 font-mono text-xs text-ink/65">${credit}</figcaption>` : ''}
        </figure>`
  }

  // Visuels du corps, rangés par section — bornage et ordre dans
  // `visuelsParSection()`, partagé avec la page React.
  const visuels = visuelsParSection(article)

  const sections = article.sections
    .map((s, i) => {
      const apres = (visuels.get(i + 1) ?? []).map((v) => figure(v)).join('\n')
      return `        <section class="mt-14">
          <h2 class="font-display text-[1.6rem] leading-snug text-ink">${echappe(s.question)}</h2>
${s.paragraphes.map((p) => `          <p class="mt-5 text-[1.0625rem] leading-[1.75] text-ink/75">${paragraphe(p)}</p>`).join('\n')}
        </section>${apres ? `\n${apres}` : ''}`
    })
    .join('\n')

  const faq = (article.faq ?? [])
    .map(
      (q) => `          <div class="mt-8 border-t border-ink/10 pt-6">
            <h3 class="font-display text-xl text-ink">${echappe(q.question)}</h3>
            <p class="mt-3 text-[1.0625rem] leading-[1.75] text-ink/75">${echappe(q.reponse)}</p>
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
              <a href="${echappe(s.url)}" rel="nofollow noopener" target="_blank" class="font-mono text-xs text-brass-sombre">${echappe(s.source)}</a>
              <ul>
${s.enonces.map((e) => `                <li class="mt-1.5 font-mono text-xs leading-relaxed text-ink/65">${echappe(e)}</li>`).join('\n')}
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
  // Ce bloc est le SECOND chemin vers l'estimateur, pas le seul : le premier
  // est l'ancre contextuelle posée dans un paragraphe (voir `paragraphe()`).
  // Le bloc se lit comme une offre, l'ancre se lit comme une phrase — et c'est
  // l'ancre qui porte le poids SEO, parce qu'elle est en contexte.
  const ou = article.ville ? ` à ${article.ville}` : ' dans le secteur'

  // LA CONCLUSION RÉDIGÉE PASSE DEVANT LE BLOC TOUT FAIT.
  //
  // Le bloc ci-dessous est le même pour tous les articles : un robot y voit un
  // encart, et une ancre identique sur deux cents pages ne dit plus rien de
  // chacune. La conclusion, elle, est écrite pour CET article et porte deux
  // ancres en contexte — l'estimateur et la page de la commune. Quand elle
  // existe, elle tient lieu d'appel à l'action ; le bloc ne sert plus qu'aux
  // articles d'avant (voir `conclusion` dans `blog-article.mjs`).
  const cloture = article.conclusion
    ? `        <section class="mt-16 border-t border-ink/10 pt-10">
          <p class="text-lg leading-relaxed text-ink/75">${paragraphe(article.conclusion, { max: 2 })}</p>
        </section>`
    : `        <section class="mt-16 border-t border-ink/10 pt-10">
          <p class="text-lg leading-relaxed text-ink/75">Vous vous demandez ce que vaut votre bien${echappe(ou)} ?</p>
          <p class="mt-3 text-base leading-relaxed text-ink/70">Notre estimation en ligne s’appuie sur les mêmes relevés de prix que cet article, appliqués à l’adresse, à la surface et à l’état de votre logement.</p>
          <p class="mt-6">
            <a href="/estimer" class="inline-flex items-center gap-2.5 border border-brass bg-brass px-6 py-3 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-ink">Estimez votre bien${echappe(ou)}</a>
          </p>
        </section>`

  // Articles liés — deux ou trois, la même commune d'abord. C'est du maillage
  // interne autant qu'un service au lecteur : deux articles sur Forbach qui se
  // citent disent au moteur que le site traite Forbach en profondeur.
  const liesListe = articlesLies(article, tous)
  const lies =
    liesListe.length > 0
      ? `        <section class="mt-16 border-t border-ink/10 pt-10">
          <h2 class="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-brass-sombre">À lire aussi</h2>
          <ul class="mt-6 grid gap-6 sm:grid-cols-3">
${liesListe
  .map(
    (a) => `            <li>
              <a href="/blog/${echappe(a.slug)}" class="group block">
${a.imageEnTete?.src ? `                <img src="${echappe(a.imageEnTete.src)}" alt="" class="aspect-[16/10] w-full object-cover" loading="lazy" decoding="async" />` : '                <div class="aspect-[16/10] w-full bg-ink/10"></div>'}
                <p class="mt-3 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink/65">${echappe(dateLisible(a.datePublication))}</p>
                <p class="mt-1.5 font-display text-base leading-snug text-ink">${echappe(a.titre)}</p>
              </a>
            </li>`,
  )
  .join('\n')}
          </ul>
        </section>`
      : ''

  // Ligne de contexte : format, commune, date, temps de lecture. Le temps de
  // lecture est calculé, jamais stocké — voir `tempsLecture()`.
  const meta = [
    article.format ? libelleFormat(article.format) : null,
    article.ville,
    dateLisible(article.datePublication),
    `${tempsLecture(article)} min de lecture`,
  ]
    .filter(Boolean)
    .map((t) => echappe(t))
    .join(' · ')

  // Le fond blanc est porté ICI et pas par le `body`, qui reste en `bg-ink`
  // pour tout le site. Sans ce conteneur, la page prérendue afficherait du
  // texte sombre sur fond sombre pendant la fraction de seconde qui précède la
  // reprise par React — soit exactement ce que voient les robots qui n'exécutent
  // pas de JavaScript, et eux ne reprennent jamais.
  return `      <div class="bg-white text-ink">
        <article class="mx-auto w-full max-w-3xl px-6 py-24">
        <p class="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-brass-sombre">${meta}</p>
        <h1 class="mt-6 font-display text-4xl leading-tight text-ink">${echappe(article.titre)}</h1>
${figure(article.imageEnTete, { hero: true })}
        <p class="mt-10 text-xl leading-relaxed text-ink/80">${echappe(article.resume)}</p>
${sections}
${
  faq
    ? `        <section class="mt-16">
          <h2 class="font-display text-2xl text-ink">Questions fréquentes</h2>
${faq}
        </section>`
    : ''
}
${cloture}
${lies}
${
  sources
    ? `        <section class="mt-16 border-t border-ink/10 pt-8">
          <h2 class="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-brass-sombre">Sources</h2>
          <ul class="mt-4">
${sources}
          </ul>
        </section>`
    : ''
}
        </article>
      </div>`
}
