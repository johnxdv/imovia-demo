// Étape B — sélection des ventes comparables, et étape C — prix au m².
//
// PRINCIPE. On reste le plus près possible du bien. La similarité est un seuil
// minimum à franchir, pas un score à maximiser : au-dessus de ce seuil, c'est
// la proximité qui tranche. Une vente voisine un peu moins ressemblante en dit
// plus long qu'une vente très ressemblante à deux kilomètres, parce que
// l'emplacement se négocie rue par rue là où la surface et le terrain se
// corrigent par le calcul (voir `indice.js` et `terrain.js`, qui font
// précisément ces corrections).
//
// CE QUI A CHANGÉ, et pourquoi. L'ancienne version partait d'un rayon de 300 m
// et retenait les **quarante** ventes les plus proches, toutes surfaces
// confondues, sans pondération d'aucune sorte : une maison de 249 m² et une de
// 30 m² pesaient autant l'une que l'autre dans la médiane d'un bien de 100 m²,
// et une vente de 2021 autant qu'une de 2025. Sur le cas de contrôle
// marseillais, l'échantillon allait de 250 à 11 500 €/m². Une médiane est
// robuste, elle absorbait le pire — mais elle absorbait aussi toute l'ambition
// du calcul : le chiffre produit décrivait le quartier, pas le bien.
//
// Désormais : cinq à huit ventes, éliminatoirement similaires, pondérées par la
// distance avant tout, et ramenées au même semestre de marché.

import { DvfIndisponible, candidateYears, loadDepartementYear } from './dvf.js'
import { departementsAround, distanceM } from './geo.js'
import { actualise, construitIndice } from './indice.js'
import { median, medianePonderee, quantile, quantilePondere } from './statistiques.js'
import {
  CHARGEMENT,
  CONFIANCE,
  FENETRE_ANNEES,
  MAX_COMPARABLES,
  MIN_COMPARABLES,
  POIDS,
  QUALITE,
  RAYONS_M,
  RAYON_TRANSFRONTALIER_M,
  SIMILARITE,
} from './estimationConfig.js'

// Réexport : `api/prix-m2.js` (l'aperçu du curseur) s'en sert, et il n'a aucune
// raison d'aller le chercher dans deux modules différents.
export { median } from './statistiques.js'

/**
 * Une année de plus que demandé est toujours réclamée : le millésime de
 * l'année en cours n'est publié qu'avec plusieurs mois de retard, et la
 * requête qui revient vide ne doit pas amputer la profondeur d'historique.
 */
const YEAR_SLACK = 1

/** Rayon maximal de la cascade — dernier palier. */
const RAYON_MAX_M = RAYONS_M[RAYONS_M.length - 1]

/**
 * Types DVF comparables à un type détecté sur la carte.
 *
 * **Jamais de mélange maison / appartement.** L'ancienne version renvoyait les
 * deux pour un type indéterminé ou un local professionnel, au motif qu'une
 * médiane tous logements confondus valait mieux que pas d'estimation. Elle ne
 * vaut mieux que rien pour personne : sur le cas marseillais, les maisons du
 * secteur se négocient à 4 892 €/m² et les appartements à 2 176 €/m², et le
 * mélange des deux donne 4 761 €/m² — un chiffre qui ne décrit aucun des deux
 * marchés. Un local ou un type resté indéterminé est aligné sur la maison,
 * comme le fait déjà `clePrix` dans `pointsReference.js`.
 */
export function comparableKinds(type) {
  if (type === 'appartement') return ['appartement']
  if (type === 'terrain') return ['terrain']
  return ['maison']
}

/** Exécute des tâches par lots, sans jamais en lancer plus de `CHARGEMENT.concurrence`. */
async function inBatches(items, run) {
  const resultats = []
  for (let i = 0; i < items.length; i += CHARGEMENT.concurrence) {
    resultats.push(...(await Promise.all(items.slice(i, i + CHARGEMENT.concurrence).map(run))))
  }
  return resultats
}

/**
 * Les `limit` ventes les plus proches d'un point, distance comprise.
 *
 * Ne sert plus au calcul de l'estimation — qui passe par la cascade cumulée
 * ci-dessous — mais reste employée par l'aperçu de la fenêtre de surface
 * (`api/prix-m2.js`), dont le budget de 3,5 s ne permet pas de dérouler la
 * sélection complète. D'où l'absence de plafond par défaut : c'est à l'appelant
 * de dire s'il en veut un.
 */
export function nearestSales(sales, lat, lon, radiusM, limit = Infinity) {
  const inside = []

  for (const sale of sales) {
    const d = distanceM(lat, lon, sale.lat, sale.lon)
    if (d <= radiusM) inside.push({ ...sale, distanceM: d })
  }

  inside.sort((a, b) => a.distanceM - b.distanceM)

  return Number.isFinite(limit) ? inside.slice(0, limit) : inside
}

/** Écart relatif en logarithme — symétrique : moitié et double s'éloignent autant. */
const ecartLog = (valeur, cible) => Math.abs(Math.log(valeur / cible))

/**
 * Les quatre facteurs de poids, et leur produit. Formes et paramètres sont
 * documentés dans `estimationConfig.js` — c'est là qu'ils se règlent.
 */
function poidsDe(vente, { type, surfaceCible, terrainCible }, maintenant) {
  const distance = 1 / (1 + (vente.distanceM / POIDS.distance.d0M) ** POIDS.distance.exposant)

  const surface = Math.exp(-ecartLog(vente.surface, surfaceCible) / POIDS.surface.tolerance)

  const terrainConnu = vente.surfaceTerrain > 0 && terrainCible > 0
  const terrain =
    type !== 'maison'
      ? 1
      : terrainConnu
        ? Math.exp(-ecartLog(vente.surfaceTerrain, terrainCible) / POIDS.terrain.tolerance)
        : POIDS.terrain.penaliteInconnu

  const ageAnnees = Math.max((maintenant - Date.parse(vente.date)) / 31557600000, 0)
  const recence = 0.5 ** (ageAnnees / POIDS.recence.demiVieAnnees)

  return {
    poids: distance * surface * terrain * recence,
    facteurs: {
      distance: Number(distance.toFixed(4)),
      surface: Number(surface.toFixed(4)),
      terrain: Number(terrain.toFixed(4)),
      recence: Number(recence.toFixed(4)),
    },
    // Score de similarité : les seules dimensions éliminatoires, sans la
    // distance ni la récence. Sert à se relire, pas à sélectionner.
    similarite: Number((surface * terrain).toFixed(4)),
    terrainConnu,
  }
}

/** Le comparable franchit-il les seuils éliminatoires de similarité ? */
function similaire(vente, { type, surfaceCible, terrainCible }) {
  const regles = SIMILARITE[type] ?? SIMILARITE.maison

  const ratioSurface = vente.surface / surfaceCible
  if (ratioSurface < regles.surface[0] || ratioSurface > regles.surface[1]) return false

  // Le terrain n'est éliminatoire que si les deux sont connus : dans DVF, une
  // `surface_terrain` absente ne veut pas dire « pas de terrain » mais « non
  // renseigné », et écarter ces ventes reviendrait à jeter un quart de
  // l'échantillon pour une donnée manquante.
  if (regles.terrain && vente.surfaceTerrain > 0 && terrainCible > 0) {
    const ratioTerrain = vente.surfaceTerrain / terrainCible
    if (ratioTerrain < regles.terrain[0] || ratioTerrain > regles.terrain[1]) return false
  }

  return true
}

/**
 * Filtres de qualité, cascade de rayons cumulés, poids : tout le cœur de la
 * sélection, sur un jeu de ventes déjà chargé et actualisé.
 *
 * Isolé en fonction pure pour pouvoir être rejoué à l'identique sur un jeu
 * élargi aux départements voisins, sans dupliquer une ligne de logique.
 */
function selectionne(actualisees, cible, maintenant) {
  const { lat, lon } = cible

  // 1 — candidates du secteur : le rayon maximal de la cascade. C'est sur elles
  // que se calibre le filtre relatif, et non sur le département entier — le but
  // est d'écarter ce qui détonne *ici*.
  const candidates = actualisees
    .map((v) => ({ ...v, distanceM: distanceM(lat, lon, v.lat, v.lon) }))
    .filter((v) => v.distanceM <= RAYON_MAX_M)

  const medianeSecteur = median(candidates.map((v) => v.prixM2Actualise))

  // 2 — filtre relatif. Les bornes absolues (500–25 000 €/m²) ont déjà été
  // appliquées à la lecture du CSV ; celui-ci se calibre sur le secteur, ce qui
  // le rend utile partout — y compris là où 500 €/m² est un prix normal.
  const plausibles = medianeSecteur
    ? candidates.filter(
        (v) =>
          v.prixM2Actualise >= medianeSecteur * QUALITE.ecartMedianeMin &&
          v.prixM2Actualise <= medianeSecteur * QUALITE.ecartMedianeMax,
      )
    : candidates

  // 3 — similarité éliminatoire, puis poids.
  const similaires = plausibles
    .filter((v) => similaire(v, cible))
    .map((v) => ({ ...v, ...poidsDe(v, cible, maintenant) }))

  // 4 — cascade de rayons **cumulés** : chaque palier compte les ventes de tous
  // les précédents. On s'arrête au premier qui atteint le minimum, et on
  // n'élargit jamais au-delà pour en avoir davantage — le gain de précision
  // d'une sixième vente ne compense pas le kilomètre qu'il faut faire pour la
  // trouver.
  let rayonAtteintM = null
  let retenus = []

  for (const rayon of RAYONS_M) {
    const dedans = similaires.filter((v) => v.distanceM <= rayon)
    if (dedans.length >= MIN_COMPARABLES) {
      rayonAtteintM = rayon
      retenus = dedans
      break
    }
  }

  // 5 — trop de similaires : on garde les mieux notées. Le tri est sur le poids,
  // donc très majoritairement sur la distance.
  if (retenus.length > MAX_COMPARABLES) {
    retenus = [...retenus].sort((a, b) => b.poids - a.poids).slice(0, MAX_COMPARABLES)
  }

  retenus.sort((a, b) => a.distanceM - b.distanceM)

  return {
    rayonAtteintM,
    retenus,
    journal: {
      duType: actualisees.length,
      dansLeSecteur: candidates.length,
      apresFiltreRelatif: plausibles.length,
      apresSimilarite: similaires.length,
      medianeSecteurPrixM2: medianeSecteur ? Math.round(medianeSecteur) : null,
      parRayon: RAYONS_M.map((rayon) => ({
        rayonM: rayon,
        similaires: similaires.filter((v) => v.distanceM <= rayon).length,
      })),
    },
  }
}

const confianceDe = (rayonM) => {
  if (rayonM == null) return 'faible'
  return rayonM <= CONFIANCE.rayonNormalMaxM ? 'normale' : 'moyenne'
}

/** Charge tous les millésimes utiles d'un département. Lève si l'un d'eux est en panne. */
const chargeDepartement = (dep, { signal, journal }) =>
  inBatches(candidateYears(FENETRE_ANNEES + YEAR_SLACK), (year) =>
    loadDepartementYear(dep, year, { signal, journal }),
  ).then((batches) => batches.flat())

/**
 * Sélectionne les comparables d'un bien et en tire le prix au m².
 *
 * Lève `DvfIndisponible` si le département du bien n'a pas pu être chargé —
 * c'est le seul cas où cette fonction ne rend rien, et il est volontairement
 * bruyant : le repli départemental n'est autorisé que lorsque les données
 * **sont** là et que les ventes similaires manquent, jamais sur une panne.
 *
 * Les départements voisins ne sont sondés que si le département du bien ne
 * suffit pas. Sonder d'emblée coûterait seize requêtes de découpage
 * administratif et jusqu'à cinq téléchargements par voisin sur chaque
 * estimation, pour un gain qui ne concerne que les adresses situées à moins de
 * deux kilomètres d'une limite départementale. Leur indisponibilité, elle, n'est
 * jamais bloquante : ils ne sont qu'un complément.
 */
export async function selectionComparables(cible, { signal, journal = [] } = {}) {
  const { lat, lon, type, departement, codeInsee } = cible
  const kinds = new Set(comparableKinds(type))
  const maintenant = Date.now()

  const duDepartement = (await chargeDepartement(departement, { signal, journal })).filter((v) =>
    kinds.has(v.kind),
  )

  // Indice temporel : calculé sur le volume du département du bien (ou de sa
  // commune si elle en a assez), et sur lui seul — c'est le marché du bien
  // qu'il décrit, pas une réunion de marchés voisins.
  const indice = construitIndice(duDepartement, { codeInsee, departement })
  let actualisees = duDepartement.map((v) => actualise(v, indice))

  let resultat = selectionne(actualisees, cible, maintenant)
  const departements = [departement]
  const echecsNonEssentiels = []

  // Rien de similaire dans tout le rayon : le bien est peut-être simplement
  // près d'une limite administrative, et les fichiers DVF sont rangés par
  // département.
  if (resultat.rayonAtteintM === null) {
    const voisins = (
      await departementsAround(lat, lon, RAYON_TRANSFRONTALIER_M, { signal }).catch(() => [])
    ).filter((dep) => dep !== departement)

    const complements = await inBatches(voisins, async (dep) => {
      try {
        const ventes = await chargeDepartement(dep, { signal, journal })
        departements.push(dep)
        return ventes.filter((v) => kinds.has(v.kind))
      } catch (error) {
        if (error instanceof DvfIndisponible) {
          echecsNonEssentiels.push(error.key)
          return []
        }
        throw error
      }
    })

    const ajout = complements.flat()
    if (ajout.length > 0) {
      actualisees = [...actualisees, ...ajout.map((v) => actualise(v, indice))]
      resultat = selectionne(actualisees, cible, maintenant)
    }
  }

  const commun = {
    indice,
    candidats: resultat.journal,
    chargement: { departements, echecsNonEssentiels },
    // Les ventes actualisées restent disponibles pour la régression de terrain :
    // elle n'a pas besoin de comparables, seulement de volume.
    actualisees,
  }

  // Pas d'échantillon similaire à deux kilomètres : médiane départementale
  // actualisée, confiance faible. Les données sont là — ce sont les ventes
  // comparables qui manquent, une panne n'ayant pu que lever bien avant ce
  // point. Les critères de similarité ne sont jamais relâchés pour y échapper.
  if (resultat.rayonAtteintM === null) {
    const prix = actualisees.map((v) => v.prixM2Actualise)

    return {
      ...commun,
      statut: 'departement',
      confiance: 'faible',
      prixM2: median(prix),
      // Dispersion interquartile du département entier : sans pondération et
      // sans élargissement supplémentaire — elle est déjà, de très loin, plus
      // large que tout ce que la confiance « faible » pourrait y ajouter.
      quantiles: { q25: quantile(prix, 0.25), q75: quantile(prix, 0.75) },
      rayonAtteintM: null,
      comparables: [],
      terrainReference: null,
    }
  }

  const points = resultat.retenus.map((v) => ({ valeur: v.prixM2Actualise, poids: v.poids }))

  // Terrain de référence : médiane pondérée des terrains **connus** des
  // comparables retenus. C'est contre lui que se mesure l'écart de terrain du
  // bien, et non contre une moyenne départementale qui ne dirait rien du
  // parcellaire local.
  const terrainsConnus = resultat.retenus
    .filter((v) => v.surfaceTerrain > 0)
    .map((v) => ({ valeur: v.surfaceTerrain, poids: v.poids }))

  return {
    ...commun,
    statut: 'voisinage',
    confiance: confianceDe(resultat.rayonAtteintM),
    prixM2: medianePonderee(points),
    quantiles: { q25: quantilePondere(points, 0.25), q75: quantilePondere(points, 0.75) },
    rayonAtteintM: resultat.rayonAtteintM,
    comparables: resultat.retenus,
    terrainReference: terrainsConnus.length > 0 ? medianePonderee(terrainsConnus) : null,
  }
}
