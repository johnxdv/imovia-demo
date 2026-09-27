// Affinage de l'estimation — les cinq compléments que le vendeur déclare
// lui-même, et ce qu'ils valent.
//
// Le moteur d'estimation travaille sur ce que les bases publiques savent d'un
// bien : son adresse, son emprise, son type, sa surface, son étage. Il ne sait
// rien d'une piscine, d'un terrain, de panneaux posés l'an dernier ni de l'état
// intérieur — aucune base ne les décrit, et le parcours ne les demandait pas.
// L'affinage les demande, et les corrige au barème ci-dessous.
//
// CE BARÈME EST UNE CORRECTION, PAS UN CALCUL. Les pourcentages sont
// volontairement modérés et plafonnés : ce sont des ordres de grandeur du
// marché, pas des mesures. Un affinage qui déplacerait l'estimation de moitié
// afficherait une précision que cinq cases à cocher n'ont pas.
//
// Isomorphe à dessein, comme `etage.js` : l'écran d'affinage s'en sert pour
// montrer le montant corrigé, et c'est la même table qui descendrait au moteur
// le jour où ces déclarations lui seront transmises. Un seul barème, deux
// lectures — sans quoi le montant affiché pendant qu'on coche et celui qui
// partirait au conseiller diraient deux choses différentes du même bien.

/**
 * Piscine enterrée. La prime constatée est réelle mais très inférieure au coût
 * de l'ouvrage : une piscine se revend rarement ce qu'elle a coûté, et elle
 * n'est un atout que dans les régions où elle sert.
 */
const PRIME_PISCINE = 0.04

/** Panneaux photovoltaïques : l'économie d'énergie se capitalise un peu. */
const PRIME_PANNEAUX = 0.02

/** Terrasse aménagée (maison) ou balcon (appartement). */
const PRIME_EXTERIEUR = 0.03

/**
 * Terrain. La prime croît avec la contenance, mais de moins en moins vite —
 * les premiers mètres carrés de jardin valent bien plus que les derniers — et
 * plafonne : au-delà, c'est du foncier, plus de l'habitation.
 */
const TERRAIN_PLAFOND_M2 = 2000
const PRIME_TERRAIN_MAX = 0.08

/**
 * Standing. Les cinq niveaux couramment employés en transaction, du bien à
 * reprendre au bien d'exception. C'est, de tous les compléments, celui qui
 * pèse le plus — l'état intérieur est le premier écart entre deux biens que
 * tout le reste rend identiques.
 */
export const STANDINGS = [
  { id: 'rafraichir', label: 'À rafraîchir', coefficient: -0.08 },
  { id: 'standard', label: 'Standard', coefficient: 0 },
  { id: 'bon', label: 'Bon standing', coefficient: 0.06 },
  { id: 'haut', label: 'Haut de gamme', coefficient: 0.13 },
  { id: 'prestige', label: 'Prestige', coefficient: 0.22 },
]

export const STANDING_DEFAUT = 'standard'

/** Valeurs d'ouverture de l'écran d'affinage : rien de déclaré. */
export const OPTIONS_DEFAUT = {
  piscine: false,
  terrainM2: 0,
  panneaux: false,
  exterieur: false,
  standing: STANDING_DEFAUT,
}

const borne = (v, min, max) => Math.min(Math.max(v, min), max)

/** Position d'un standing sur l'échelle, de 0 (à rafraîchir) à 1 (prestige). */
export const rangStanding = (id) => {
  const index = STANDINGS.findIndex((s) => s.id === id)
  return index === -1 ? 1 / (STANDINGS.length - 1) : index / (STANDINGS.length - 1)
}

/**
 * Coefficient global de l'affinage. Les primes s'additionnent plutôt qu'elles
 * ne se multiplient : trois atouts sur le même bien ne se renforcent pas l'un
 * l'autre, ils s'ajoutent.
 *
 * `type` décide du seul complément qui change de nom d'une architecture à
 * l'autre : une maison a une terrasse, un appartement un balcon. Le terrain et
 * la piscine ne sont proposés qu'aux maisons, et vaudraient zéro ailleurs.
 */
export function coefficientAffinage(options, type = 'maison') {
  const o = { ...OPTIONS_DEFAUT, ...(options ?? {}) }
  const maison = type !== 'appartement'

  let total = 0
  if (maison && o.piscine) total += PRIME_PISCINE
  if (maison) {
    const part = borne(Number(o.terrainM2) || 0, 0, TERRAIN_PLAFOND_M2) / TERRAIN_PLAFOND_M2
    // Racine carrée : les premiers ares comptent davantage que les suivants.
    total += PRIME_TERRAIN_MAX * Math.sqrt(part)
  }
  if (o.panneaux) total += PRIME_PANNEAUX
  if (o.exterieur) total += PRIME_EXTERIEUR

  total += STANDINGS.find((s) => s.id === o.standing)?.coefficient ?? 0

  // Garde-fou : quoi qu'on coche, l'affinage reste une correction.
  return 1 + borne(total, -0.1, 0.35)
}

/** Applique l'affinage à une estimation `{ price, low, high }`. */
export function affinerEstimation(estimation, options, type) {
  if (!estimation || estimation.status !== 'ok') return estimation
  const k = coefficientAffinage(options, type)
  const arrondir = (montant) =>
    Number.isFinite(montant) ? Math.round((montant * k) / 1000) * 1000 : montant

  return {
    ...estimation,
    price: arrondir(estimation.price),
    low: arrondir(estimation.low),
    high: arrondir(estimation.high),
    affine: k !== 1,
  }
}

/**
 * Ce que le décor 3D doit dessiner. L'écran d'affinage parle en options
 * d'immobilier — une piscine, du terrain, un standing —, la scène en ouvrages
 * à révéler ; cette fonction fait la traduction, et elle est le seul endroit
 * où les deux vocabulaires se rencontrent.
 */
export function optionsDecor(options, type = 'maison') {
  const o = { ...OPTIONS_DEFAUT, ...(options ?? {}) }
  const maison = type !== 'appartement'

  return {
    piscine: maison && o.piscine,
    terrain: maison ? borne((Number(o.terrainM2) || 0) / TERRAIN_PLAFOND_M2, 0, 1) : 0,
    panneaux: Boolean(o.panneaux),
    terrasse: maison && o.exterieur,
    balcon: !maison && o.exterieur,
    standing: rangStanding(o.standing),
  }
}

export { TERRAIN_PLAFOND_M2 }
