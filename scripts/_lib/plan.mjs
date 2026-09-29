// Plan éditorial et journal des publications.
//
// DEUX FICHIERS, DEUX RÔLES
//
//   `src/data/plan.json`    — la file des sujets à traiter, décidée par le
//                             modèle et consommée un par un.
//   `src/data/journal.json` — ce qui a été publié : date, titre, sujet,
//                             commune, mot-clé, angle, genre.
//
// LE JOURNAL N'EST PAS LA SOURCE DE VÉRITÉ, ET C'EST VOLONTAIRE
//
// Les articles publiés le sont. Chaque fichier de `src/data/articles/` porte
// déjà son titre, son sujet, son angle, sa commune et son mot-clé : le journal
// en est un INDEX, entièrement reconstructible. `reconcilie()` le refait au
// démarrage de chaque passage.
//
// La conséquence est celle qu'on cherchait : un journal écrasé, corrompu ou
// perdu ne fait pas perdre la mémoire au système. Il la retrouve au passage
// suivant en relisant les articles. Un index qu'on sait régénérer n'est pas un
// point de défaillance unique — un fichier d'état qu'on ne saurait pas
// reconstruire en serait un.
//
// QUAND LE JOURNAL S'ÉCRIT
//
// DANS LE MÊME COMMIT QUE L'ARTICLE. Pas avant, pas après.
//
// En intégration continue, rien n'est durable avant le `git push` : le runner
// est détruit à la fin du job, et un fichier écrit mais non poussé n'a jamais
// existé. Il n'y a donc qu'un seul instant qui compte, et l'article, ses images
// et la ligne de journal y entrent ensemble. Git rend l'opération atomique : il
// n'existe aucun état où l'article est en ligne sans sa trace, ni l'inverse.
//
// Et si le passage meurt avant le push, le sujet n'a pas été consommé : le plan
// le porte encore, le passage suivant le reprend. Rien à annuler.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

import { DOSSIER_ARTICLES } from './article.mjs'

const RACINE = path.resolve(import.meta.dirname, '..', '..')
export const FICHIER_PLAN = path.join(RACINE, 'src', 'data', 'plan.json')
export const FICHIER_JOURNAL = path.join(RACINE, 'src', 'data', 'journal.json')

/** Chemins relatifs au dépôt — ce que le workflow ajoute au commit. */
export const CHEMINS_DEPOT = ['src/data/plan.json', 'src/data/journal.json']

/** Seuil de réapprovisionnement : à trois sujets restants, on planifie la suite. */
export const RESTANT_MINIMAL = 3

/** Taille d'un plan. */
export const TAILLE_PLAN = 12

/** Au plus trois sujets sur douze peuvent reposer sur les relevés de prix. */
export const PLAFOND_DONNEES = 3

/**
 * Forme comparable d'un texte : sans accent, sans ponctuation, en minuscules.
 *
 * Sert à la clé d'unicité. « Vendre à Forbach » et « vendre a forbach » doivent
 * se reconnaître, sinon la règle anti-répétition se contourne toute seule à la
 * première différence de casse.
 */
export const normalise = (v) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/**
 * Clé d'unicité d'un sujet : (commune, mot-clé principal).
 *
 * POURQUOI PAS (commune, angle)
 *
 * L'angle est du texte libre rédigé par le modèle — « sous l'angle de ce qui se
 * vend le mieux » et « en regardant quels biens partent vite » désignent le même
 * article et ne se ressemblent pas. Aucune comparaison mécanique ne les
 * rapproche, et en confier le jugement au modèle qui les a écrits ne garantit
 * rien.
 *
 * Le mot-clé, lui, est une chaîne courte et concrète, choisie pour être tapée
 * dans un moteur : « vendre maison Forbach » et « prix m2 Forbach » sont
 * distincts sans ambiguïté, et deux articles qui viseraient la même requête
 * porteraient forcément le même. C'est donc lui qui porte la règle « deux
 * articles sur Forbach oui, deux articles sur vendre à Forbach non ».
 */
export const cle = (commune, motCle) => `${normalise(commune)}|${normalise(motCle)}`

const lisJson = async (fichier, defaut) => {
  try {
    return JSON.parse(await readFile(fichier, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return defaut
    throw error
  }
}

export const lirePlan = () => lisJson(FICHIER_PLAN, { genereLe: null, sujets: [] })
export const lireJournal = () => lisJson(FICHIER_JOURNAL, { entrees: [] })

const ecris = async (fichier, donnees) => {
  await mkdir(path.dirname(fichier), { recursive: true })
  await writeFile(fichier, `${JSON.stringify(donnees, null, 2)}\n`, 'utf8')
}

export const ecrirePlan = (plan) => ecris(FICHIER_PLAN, plan)
export const ecrireJournal = (journal) => ecris(FICHIER_JOURNAL, journal)

/** Entrée de journal dérivée d'un article publié. */
const entreeDepuisArticle = (a) => ({
  date: a.datePublication,
  slug: a.slug,
  titre: a.titre,
  sujet: a.sujet ?? a.titre,
  commune: a.ville ?? null,
  codeInsee: a.codeInsee ?? null,
  motCle: a.motCle ?? null,
  angle: a.angle ?? null,
  genre: a.genre ?? null,
})

/**
 * Réinscrit au journal tout article publié qui n'y figure pas.
 *
 * C'est la garantie annoncée en tête de fichier : le journal se reconstruit
 * depuis les articles. Appelée au démarrage de chaque passage, elle répare un
 * journal tronqué, écrasé, ou simplement absent — au premier passage, il n'y en
 * a pas et il se crée intégralement à partir de l'existant.
 *
 * Un article sans `motCle` (saisi à la main depuis `/seo`, ou publié avant que
 * le champ n'existe) entre au journal avec `motCle: null`. Il compte donc comme
 * commune traitée sans bloquer aucune requête précise — ce qui est le bon
 * comportement : on ne peut pas deviner après coup quelle requête il visait.
 *
 * Rend le journal et le nombre d'entrées ajoutées, pour que l'appelant puisse
 * le dire au journal de sortie plutôt que de réparer en silence.
 */
export function reconcilie(journal, articles) {
  const connus = new Set((journal.entrees ?? []).map((e) => e.slug))
  const ajouts = articles.filter((a) => a?.slug && !connus.has(a.slug)).map(entreeDepuisArticle)

  if (ajouts.length === 0) return { journal, ajoutes: 0 }

  const entrees = [...(journal.entrees ?? []), ...ajouts].sort((a, b) =>
    String(b.date).localeCompare(String(a.date)),
  )

  return { journal: { ...journal, entrees }, ajoutes: ajouts.length }
}

/** Toutes les clés (commune, mot-clé) déjà employées. */
export const clesTraitees = (journal) =>
  new Set(
    (journal.entrees ?? [])
      .filter((e) => e.motCle)
      .map((e) => cle(e.commune, e.motCle)),
  )

/** Le prochain sujet non publié du plan, ou `null` si la file est vide. */
export const prochainSujet = (plan) => (plan.sujets ?? []).find((s) => !s.publie) ?? null

/** Combien de sujets restent à traiter. */
export const restants = (plan) => (plan.sujets ?? []).filter((s) => !s.publie).length

/**
 * Marque un sujet publié, et inscrit l'article au journal.
 *
 * Ne touche pas au disque : rend les deux objets modifiés, que l'appelant écrit
 * au moment où il écrit l'article — en une seule fois, juste avant le commit.
 */
export function enregistrePublication(plan, journal, sujet, article) {
  const sujets = (plan.sujets ?? []).map((s) =>
    s.id === sujet?.id ? { ...s, publie: article.slug, publieLe: article.datePublication } : s,
  )

  const entree = {
    ...entreeDepuisArticle(article),
    sujet: sujet?.titre ?? article.sujet ?? article.titre,
    motCle: sujet?.motCle ?? article.motCle ?? null,
    angle: sujet?.angle ?? article.angle ?? null,
    genre: sujet?.genre ?? article.genre ?? null,
  }

  return {
    plan: { ...plan, sujets },
    journal: { ...journal, entrees: [entree, ...(journal.entrees ?? [])] },
  }
}

/** Tous les articles publiés, lus depuis le dossier. */
export async function articlesPublies() {
  const { lireArticles } = await import('./article.mjs')
  return lireArticles(DOSSIER_ARTICLES)
}
