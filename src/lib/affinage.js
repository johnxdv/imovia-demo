// Affinage de l'estimation — les compléments que le vendeur déclare lui-même,
// et ce qu'ils valent.
//
// Ils dépendent du bien : une maison déclare sa piscine, sa terrasse, ses
// panneaux et son terrain ; un appartement son balcon, son rez-de-jardin, son
// ascenseur et son rooftop. Le standing vaut pour les deux.
//
// Le moteur d'estimation travaille sur ce que les bases publiques savent d'un
// bien : son adresse, son emprise, son type, sa surface, son étage. Il ne sait
// rien d'une piscine, d'un balcon, de panneaux posés l'an dernier ni de l'état
// intérieur — aucune base ne les décrit, et le parcours ne les demandait pas.
// L'affinage les demande, et les corrige au barème de `affinageConfig.js`.
//
// CE MODULE NE CALCULE PAS UN PRIX, IL CORRIGE CELUI DU MOTEUR. Tout part du
// montant rendu par l'API (`api/estimation.js`), qui n'est touché nulle part :
// l'affinage est une couche par-dessus, appliquée côté client, sans second
// appel réseau — l'utilisateur coche, le montant suit dans la seconde.
//
// TOUS LES NOMBRES SONT DANS `affinageConfig.js`, et aucun n'est écrit ici :
// c'est la condition pour qu'un barème se règle sans relire du code.

import {
  ASCENSEUR_PAR_ETAGE,
  ATOUTS_APPARTEMENT,
  ATOUTS_MAISON,
  CURSEURS,
  PLAFOND_CUMULE,
  STANDINGS,
  STANDING_DEFAUT,
  TERRAIN,
} from './affinageConfig.js'

export { CURSEURS, STANDINGS, STANDING_DEFAUT }

/** Valeurs d'ouverture de l'écran d'affinage : rien de déclaré. */
export const OPTIONS_DEFAUT = {
  // Maison.
  piscine: false,
  terrasse: false,
  panneaux: false,
  // Terrain : préparé par l'écran résultat à partir de la contenance
  // cadastrale, et non à zéro — le vendeur corrige une valeur relevée.
  terrainM2: 0,
  // Appartement. Les deux extérieurs se déclarent par leur surface : zéro veut
  // dire « pas de balcon », pas « un balcon de zéro mètre carré ».
  balconM2: 0,
  rezDeJardinM2: 0,
  ascenseur: false,
  rooftopM2: 0,
  standing: STANDING_DEFAUT,
}

const borne = (v, min, max) => Math.min(Math.max(v, min), max)

const nombre = (v) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Position d'un standing sur l'échelle, de 0 (à rafraîchir) à 1 (rénové). */
export const rangStanding = (id) => {
  const index = STANDINGS.findIndex((s) => s.id === id)
  const dernier = STANDINGS.length - 1
  if (dernier <= 0) return 0
  return (index === -1 ? STANDINGS.findIndex((s) => s.id === STANDING_DEFAUT) : index) / dernier
}

/** Prime d'ascenseur pour un étage donné — nulle au rez-de-chaussée. */
function primeAscenseur(etage) {
  const n = Number(etage)
  if (!Number.isFinite(n)) return 0
  return ASCENSEUR_PAR_ETAGE.find((palier) => n >= palier.aPartirDe)?.pct ?? 0
}

/**
 * Un atout plafonné en euros : le pourcentage décrit le bien ordinaire, le
 * plafond rattrape les autres. On retient le plus petit des deux, exprimé en
 * fraction du prix de référence pour que tout s'additionne dans la même unité.
 */
const partPlafonnee = (prix, { pct, plafondEuros }) =>
  prix > 0 ? Math.min(pct, plafondEuros / prix) : 0

/**
 * Un extérieur d'appartement, valorisé à la surface : une fraction du prix au
 * mètre carré habitable, par mètre carré déclaré, plafonnée en pourcentage du
 * prix.
 */
function partSurfacique(surfaceDeclaree, surfaceHabitable, { partPrixM2, plafondPct }) {
  if (!(surfaceDeclaree > 0) || !(surfaceHabitable > 0)) return 0
  // (m² déclarés × prix au m²) / prix  =  m² déclarés / m² habitables : le prix
  // se simplifie, et la part ne dépend donc que du rapport des deux surfaces.
  return Math.min((surfaceDeclaree / surfaceHabitable) * partPrixM2, plafondPct)
}

/**
 * Terrain d'une maison — la correction du curseur, et rien d'autre.
 *
 * Nulle tant que le curseur est resté sur la contenance cadastrale : le moteur
 * a déjà valorisé ce terrain-là, le recompter serait le compter deux fois (voir
 * `TERRAIN` dans `affinageConfig.js`).
 */
function partTerrain(declare, cadastre) {
  if (!(declare > 0) || !(cadastre > 0)) return 0
  const brut = TERRAIN.pente * Math.log(declare / cadastre)
  return borne(brut, -TERRAIN.plafondPct, TERRAIN.plafondPct)
}

/**
 * Le détail de l'affinage : chaque ajustement en fraction du prix de référence,
 * leur somme, et ce que le plafond cumulé en a retenu.
 *
 * Rendu explicitement plutôt que réduit à un seul coefficient — c'est ce qui
 * permet d'expliquer un montant, de le tracer, et de voir quand le plafond
 * mord. `coefficientAffinage` n'en est que la dernière ligne.
 *
 * `contexte` porte ce que le barème doit savoir du bien au-delà des cases
 * cochées : son `type`, sa surface habitable déclarée (les extérieurs
 * d'appartement s'y mesurent), son `etage` (l'ascenseur n'y vaut rien au
 * rez-de-chaussée) et la contenance cadastrale relevée sur la parcelle (le
 * point neutre du curseur de terrain).
 */
export function detailAffinage(prix, options, contexte = {}) {
  const o = { ...OPTIONS_DEFAUT, ...(options ?? {}) }
  const { type = 'maison', surfaceM2 = null, etage = null, terrainCadastreM2 = null } = contexte
  const maison = type !== 'appartement'
  const base = nombre(prix)

  const parts = []
  const ajoute = (cle, part) => {
    if (part) parts.push({ cle, part })
  }

  ajoute('standing', STANDINGS.find((s) => s.id === o.standing)?.coefficient ?? 0)

  if (maison) {
    if (o.piscine) ajoute('piscine', partPlafonnee(base, ATOUTS_MAISON.piscine))
    if (o.terrasse) ajoute('terrasse', partPlafonnee(base, ATOUTS_MAISON.terrasse))
    if (o.panneaux) ajoute('panneaux', partPlafonnee(base, ATOUTS_MAISON.panneaux))
    ajoute('terrain', partTerrain(nombre(o.terrainM2), nombre(terrainCadastreM2)))
  } else {
    const habitable = nombre(surfaceM2)
    ajoute('balcon', partSurfacique(nombre(o.balconM2), habitable, ATOUTS_APPARTEMENT.balcon))
    ajoute(
      'rezDeJardin',
      partSurfacique(nombre(o.rezDeJardinM2), habitable, ATOUTS_APPARTEMENT.rezDeJardin),
    )
    if (o.ascenseur) ajoute('ascenseur', primeAscenseur(etage))
    // Le rooftop se déclare au mètre carré pour le décor ; le barème ne lit que
    // sa présence (voir `ATOUTS_APPARTEMENT.rooftop`).
    if (nombre(o.rooftopM2) > 0) ajoute('rooftop', partPlafonnee(base, ATOUTS_APPARTEMENT.rooftop))
  }

  const somme = parts.reduce((total, { part }) => total + part, 0)
  const retenu = borne(somme, PLAFOND_CUMULE.min, PLAFOND_CUMULE.max)

  return { parts, somme, retenu, plafonne: retenu !== somme }
}

/**
 * Coefficient global de l'affinage — `1` quand rien n'a été déclaré.
 *
 * Les ajustements s'ADDITIONNENT plutôt qu'ils ne se multiplient : trois atouts
 * sur le même bien ne se renforcent pas l'un l'autre, ils s'ajoutent. Puis la
 * somme passe sous le plafond cumulé, qui est le seul garde-fou qu'on ne
 * contourne pas en cochant tout (voir `PLAFOND_CUMULE`).
 */
export function coefficientAffinage(prix, options, contexte) {
  return 1 + detailAffinage(prix, options, contexte).retenu
}

/**
 * Applique l'affinage à une estimation `{ price, low, high }`.
 *
 * LA FOURCHETTE EST RECALCULÉE, pas décalée. Sa demi-largeur relative est
 * relevée sur la réponse du serveur — ±15, ±20 ou ±25 % selon la confiance de
 * l'échantillon (voir `FOURCHETTE` dans `api/_lib/estimationConfig.js`) — puis
 * réappliquée au nouveau prix central. Le front n'a pas de quoi choisir cette
 * largeur, et c'est voulu : il se contente de la conserver.
 */
export function affinerEstimation(estimation, options, contexte) {
  if (!estimation || estimation.status !== 'ok') return estimation

  const base = nombre(estimation.price)
  const k = coefficientAffinage(base, options, contexte)
  if (!(base > 0)) return estimation

  const arrondir = (montant) => Math.round(montant / 1000) * 1000
  const price = arrondir(base * k)

  // Demi-largeur relative d'origine. À défaut de fourchette — le serveur peut
  // rendre `null` —, il n'y a rien à conserver et rien à reconstituer.
  const demi =
    Number.isFinite(estimation.low) && Number.isFinite(estimation.high)
      ? (estimation.high - estimation.low) / 2 / base
      : null

  return {
    ...estimation,
    price,
    low: demi === null ? estimation.low : arrondir(price * (1 - demi)),
    high: demi === null ? estimation.high : arrondir(price * (1 + demi)),
    affine: k !== 1,
  }
}

/**
 * Ce que le décor 3D doit dessiner. L'écran d'affinage parle en options
 * d'immobilier — une piscine, du terrain, un standing —, la scène en ouvrages
 * à révéler ; cette fonction fait la traduction, et elle est le seul endroit
 * où les deux vocabulaires se rencontrent.
 *
 * Elle est aussi le seul endroit où une surface déclarée redevient un booléen —
 * et il n'en reste qu'une, le BALCON : à la profondeur qu'a un balcon, huit
 * mètres carrés et trente se dessinent pareil, seule leur existence se voit.
 * Le terrain, le ROOFTOP et le REZ-DE-JARDIN, eux, changent de taille sous le
 * curseur : ce sont des surfaces qu'on arpente, et dont on voit la limite.
 */
export function optionsDecor(options, type = 'maison') {
  const o = { ...OPTIONS_DEFAUT, ...(options ?? {}) }
  const maison = type !== 'appartement'

  return {
    piscine: maison && Boolean(o.piscine),
    // Le décor s'étend sur toute l'échelle DÉCLARABLE : un terrain de 5 000 m²
    // doit se voir cinq mille mètres carrés.
    terrain: maison ? borne(nombre(o.terrainM2) / CURSEURS.terrain.max, 0, 1) : 0,
    // Les panneaux ne se posent plus que sur une maison : la toiture d'un
    // immeuble n'appartient pas au logement, et l'option a disparu de l'écran
    // des appartements avec elle.
    panneaux: maison && Boolean(o.panneaux),
    terrasse: maison && Boolean(o.terrasse),
    balcon: !maison && nombre(o.balconM2) > 0,
    // Le jardin privatif se dessine à la surface déclarée, sur toute l'échelle
    // du curseur : de quinze mètres carrés de terrasse à deux cents mètres
    // carrés de vrai jardin, ce n'est pas le même bien.
    rezDeJardin: maison ? 0 : borne(nombre(o.rezDeJardinM2) / CURSEURS.rezDeJardin.max, 0, 1),
    rooftop: maison ? 0 : borne(nombre(o.rooftopM2) / CURSEURS.rooftop.max, 0, 1),
    standing: rangStanding(o.standing),
  }
}
