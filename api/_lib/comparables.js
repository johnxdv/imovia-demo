// Étape B — recherche des ventes comparables, et étape C — prix médian au m².

import { candidateYears, loadDepartementYear } from './dvf.js'
import { departementsAround, distanceM } from './geo.js'

/**
 * Paliers d'élargissement, du plus resserré au plus large.
 *
 * On part du pâté de maisons, et l'on n'élargit qu'à défaut d'échantillon
 * suffisant. Rien de tout cela n'est dit à l'utilisateur : le parcours est
 * identique qu'il s'agisse d'un centre-ville couvert par cent ventes ou d'un
 * hameau qu'il a fallu chercher à quinze kilomètres.
 *
 * **Le premier palier tient en 300 m, et c'est le cœur du réglage.** Il valait
 * 1 km, avec cinq ventes pour seuil — deux conditions qu'une ville dense
 * remplit toujours, et de très loin : à Lyon, un disque d'un kilomètre autour
 * d'une adresse contient trois mille ventes réparties sur trois ou quatre
 * quartiers. La médiane qui en sortait n'était pas celle de la rue, c'était
 * celle de l'arrondissement. Relevé sur DVF (69, cinq millésimes) :
 *
 * | Adresse | 250 m | 1 km | écart |
 * | --- | --- | --- | --- |
 * | Lyon 3e — Part-Dieu | 4 078 €/m² | 5 082 €/m² | **+24,6 %** |
 * | Lyon 8e — Mermoz | 3 351 €/m² | 3 467 €/m² | +3,4 % |
 * | Lyon 6e — bd des Belges | 5 937 €/m² | 5 802 €/m² | −2,3 % |
 * | Bordeaux — Chartrons | 5 145 €/m² | 4 780 €/m² | −7,1 % |
 *
 * Un quart de trop sur un T3 de la Part-Dieu, sept pour cent de moins sur un
 * appartement des Chartrons : l'erreur ne va pas toujours dans le même sens, ce
 * qui est bien pire qu'un biais — elle est imprévisible et ne se rattrape pas.
 *
 * Le seuil d'échantillon monte avec le rayon plutôt que de rester fixe : plus le
 * disque est large, moins chaque vente dit de l'adresse, et plus il en faut pour
 * que la médiane veuille dire quelque chose. À 300 m, quatre ventes du même
 * pâté de maisons valent mieux que cinquante ventes de la commune entière.
 *
 * La profondeur d'historique, elle, ne se paie presque pas : cinq millésimes au
 * lieu de trois font entrer une dérive de marché de quelques pour cent par an,
 * là où élargir le rayon d'un kilomètre en fait entrer vingt-cinq d'un coup.
 * C'est l'arbitrage retenu partout ici — **remonter dans le temps plutôt que
 * s'éloigner dans l'espace**.
 */
const LADDER = [
  { radiusM: 300, years: 4, minSample: 4 },
  { radiusM: 600, years: 5, minSample: 5 },
  { radiusM: 1200, years: 5, minSample: 8 },
  { radiusM: 3000, years: 5, minSample: 10 },
  { radiusM: 8000, years: 5, minSample: 10 },
  { radiusM: 15000, years: 5, minSample: 12 },
]

/**
 * Nombre de ventes retenues au plus, les plus proches d'abord.
 *
 * Le palier fixe une limite à ne pas dépasser ; ce plafond-ci fait le reste du
 * travail. Dès qu'un rayon ramène plus de ventes qu'il n'en faut, seules les
 * plus proches sont gardées — la médiane se recentre alors d'elle-même sur le
 * quartier, sans qu'aucun palier ait eu à le prévoir. Dans les mêmes relevés
 * lyonnais, les quarante ventes les plus proches tiennent en 70 m boulevard des
 * Belges, en 180 m à Mermoz, et en 800 m dans le pavillonnaire d'Écully : le
 * plafond se resserre exactement là où le tissu est dense, et se relâche là où
 * il faut bien aller chercher plus loin.
 *
 * Quarante, parce qu'une médiane cesse de bouger bien avant — au-delà, on
 * n'ajoute plus de la précision, seulement de la distance.
 */
const MAX_SAMPLE = 40

/**
 * À partir de ce rayon, la zone de recherche peut déborder sur un département
 * voisin — et les fichiers DVF sont rangés par département.
 */
const CROSS_BORDER_FROM_M = 2000

/**
 * Nombre de millésimes téléchargés de front.
 *
 * Sans plafond, un palier large lance une douzaine de fichiers à la fois : sur
 * une liaison ordinaire, ils se partagent la bande passante et finissent par
 * dépasser, tous ensemble, le délai au-delà duquel on les abandonne — de sorte
 * qu'élargir la recherche revenait à tout perdre. Par lots, chacun arrive vite.
 */
const CONCURRENCY = 4

/** Exécute des tâches par lots, sans jamais en lancer plus de `CONCURRENCY`. */
async function inBatches(items, run) {
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    await Promise.all(items.slice(i, i + CONCURRENCY).map(run))
  }
}

/**
 * Une année de plus que demandé est toujours réclamée : le millésime de
 * l'année en cours n'est publié qu'avec plusieurs mois de retard, et la
 * requête qui revient vide ne doit pas amputer la profondeur d'historique.
 */
const YEAR_SLACK = 1

/**
 * Types DVF comparables à un type détecté sur la carte.
 *
 * Le cas d'un type indéterminé ne se présente plus — la détection tranche
 * toujours, y compris par arbitrage (voir `src/lib/typeBien.js`). Il reste
 * traité ici par sécurité, et pour le local professionnel, dont les surfaces
 * DVF sont trop hétérogènes pour former un échantillon exploitable : mieux vaut
 * une médiane tous logements confondus que pas d'estimation du tout.
 */
export function comparableKinds(type) {
  if (type === 'maison') return ['maison']
  if (type === 'appartement') return ['appartement']
  if (type === 'terrain') return ['terrain']
  return ['maison', 'appartement']
}

/**
 * Médiane d'une série de nombres. Retenue plutôt que la moyenne : sur un
 * échantillon de quelques ventes, une seule transaction hors norme — un bien
 * d'exception, une vente entre proches — déplacerait la moyenne de plusieurs
 * dizaines de pour cent.
 */
export function median(values) {
  if (values.length === 0) return null

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

/**
 * Les `limit` ventes les plus proches d'un point, distance comprise.
 *
 * Partagée avec l'aperçu de la fenêtre de surface (`api/prix-m2.js`) : les deux
 * chiffres sont montrés au même utilisateur à quelques secondes d'intervalle, et
 * n'auraient aucune raison de ne pas se ressembler.
 */
export function nearestSales(sales, lat, lon, radiusM, limit = MAX_SAMPLE) {
  const inside = []

  for (const sale of sales) {
    const d = distanceM(lat, lon, sale.lat, sale.lon)
    if (d <= radiusM) inside.push({ ...sale, distanceM: d })
  }

  inside.sort((a, b) => a.distanceM - b.distanceM)

  return inside.slice(0, limit)
}

/**
 * Recherche les ventes comparables autour d'un point, en élargissant les
 * critères tant que l'échantillon reste insuffisant.
 *
 * Le chargement se fait par département et par année, et les fichiers déjà
 * lus restent en mémoire : élargir le rayon ne coûte alors plus aucune requête
 * — seul un palier qui ajoute une année, ou un département voisin, en déclenche
 * de nouvelles. C'est ce qui permet à l'élargissement complet de tenir dans le
 * budget de l'écran de chargement.
 *
 * Ne lève jamais en dehors d'une annulation explicite : un échantillon vide
 * est une réponse, que l'appelant traite par son propre repli.
 */
export async function findComparables({ lat, lon, type, departement }, { signal } = {}) {
  const kinds = new Set(comparableKinds(type))
  const departements = new Set([departement].filter(Boolean))
  const loaded = new Map()
  let probed = null

  /** Charge les années manquantes de tous les départements retenus. */
  const ensureLoaded = async (yearCount) => {
    const years = candidateYears(yearCount + YEAR_SLACK)
    const missing = []

    for (const dep of departements) {
      for (const year of years) {
        const key = `${dep}:${year}`
        if (!loaded.has(key)) missing.push({ key, dep, year })
      }
    }

    await inBatches(missing, async ({ key, dep, year }) => {
      loaded.set(key, await loadDepartementYear(dep, year, { signal }))
    })
  }

  let sample = []
  let used = LADDER[0]

  for (const rung of LADDER) {
    used = rung

    // Le pourtour est sondé au rayon du palier en cours, et non au rayon
    // maximal : sonder large ferait entrer dès le deuxième palier des
    // départements dont on n'a pas encore besoin, et chacun coûte le
    // téléchargement de tous ses millésimes.
    if (rung.radiusM >= CROSS_BORDER_FROM_M && probed !== rung.radiusM) {
      probed = rung.radiusM
      // Une panne du service de découpage administratif laisse simplement la
      // recherche cantonnée au département de départ, ce qui reste exploitable.
      const around = await departementsAround(lat, lon, rung.radiusM, { signal }).catch(() => [])
      for (const dep of around) departements.add(dep)
    }

    await ensureLoaded(rung.years)

    const candidates = []
    for (const sales of loaded.values()) {
      for (const sale of sales) {
        if (kinds.has(sale.kind)) candidates.push(sale)
      }
    }

    sample = nearestSales(candidates, lat, lon, rung.radiusM, MAX_SAMPLE)

    if (sample.length >= rung.minSample) break
  }

  return {
    sales: sample,
    pricePerM2: median(sample.map((sale) => sale.pricePerM2)),
    radiusM: used.radiusM,
    // Distance de la vente retenue la plus lointaine : c'est elle, et non le
    // rayon du palier, qui dit sur quelle étendue la médiane a été prise. Le
    // journal en a besoin — un palier à 15 km dont toutes les ventes tiennent
    // en 600 m n'a rien d'une estimation diluée.
    spanM: sample.length > 0 ? Math.round(sample[sample.length - 1].distanceM) : null,
    years: used.years,
    departements: [...departements],
  }
}

/**
 * Repli départemental — le prix médian au m² sur tout le département, toutes
 * années confondues.
 *
 * Sert quand l'élargissement géographique n'a rien donné : moins précis qu'un
 * voisinage, mais toujours mieux qu'un ordre de grandeur national.
 */
export async function departementPricePerM2(departement, type, { signal } = {}) {
  const kinds = new Set(comparableKinds(type))
  const years = candidateYears(LADDER[LADDER.length - 1].years + YEAR_SLACK)

  const batches = []
  await inBatches(years, async (year) => {
    batches.push(await loadDepartementYear(departement, year, { signal }))
  })

  const prices = batches
    .flat()
    .filter((sale) => kinds.has(sale.kind))
    .map((sale) => sale.pricePerM2)

  return { pricePerM2: median(prices), count: prices.length }
}
