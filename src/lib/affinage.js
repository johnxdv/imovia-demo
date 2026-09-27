// Affinage de l'estimation — les compléments que le vendeur déclare lui-même,
// et ce qu'ils valent.
//
// Ils dépendent du bien : une maison déclare sa piscine, son terrain, sa
// terrasse ; un appartement son balcon, son rez-de-jardin et son rooftop. Le
// standing et les panneaux solaires valent pour les deux.
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
 * Rez-de-jardin — un appartement de plain-pied sur un jardin privatif. C'est
 * la seule façon dont un appartement dispose d'un extérieur au sol, et elle se
 * paie : à surface égale, il se négocie au-dessus des étages courants.
 */
const PRIME_REZ_DE_JARDIN = 0.05

/**
 * Rooftop — terrasse aménagée en toiture, à l'usage du logement. La prime croît
 * avec sa surface et plafonne vite : au-delà d'une quarantaine de mètres
 * carrés, ce qui se vend est le fait d'en avoir un, pas qu'il soit plus grand.
 */
const ROOFTOP_PLAFOND_PRIME_M2 = 40
const PRIME_ROOFTOP_MAX = 0.05

/**
 * Terrain. La prime croît avec la contenance, mais de moins en moins vite —
 * les premiers mètres carrés de jardin valent bien plus que les derniers — et
 * plafonne : au-delà, c'est du foncier, plus de l'habitation.
 */
const TERRAIN_PLAFOND_M2 = 2000
const PRIME_TERRAIN_MAX = 0.08

/**
 * CE QUE LE CURSEUR LAISSE DÉCLARER, et qui n'est pas la même chose que ce que
 * le barème sait valoriser.
 *
 * Le curseur montait à 2 000 m², c'est-à-dire exactement au plafond du barème :
 * une propriété de trois hectares n'avait aucun moyen de se déclarer. Il monte
 * désormais à 5 000, et le décor suit jusque-là — le terrain s'étend, des
 * arbres sortent de terre à mesure.
 *
 * LE BARÈME, LUI, N'A PAS BOUGÉ : il plafonne toujours à 2 000 m². Au-delà,
 * c'est du foncier et non de l'habitation, la prime reste à son maximum, et
 * l'estimation affichée est au mètre carré près celle d'avant pour toute
 * surface déjà déclarable. Relever le plafond du barème aurait, lui, déplacé
 * tous les montants — y compris ceux des terrains de 400 m².
 */
const TERRAIN_SAISIE_MAX = 5000

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
  // La surface de l'extérieur déclaré — terrasse pour une maison, balcon pour
  // un appartement. Les valeurs d'ouverture sont celles d'un extérieur
  // COURANT, jamais zéro : cocher « Balcon » pour se voir proposer un balcon de
  // zéro mètre carré n'aurait aucun sens.
  exterieurM2: 10,
  // Appartements : le jardin privatif de plain-pied, la terrasse en toiture, et
  // l'ascenseur.
  rezDeJardin: false,
  rezDeJardinM2: 30,
  rooftopM2: 0,
  ascenseur: false,
  standing: STANDING_DEFAUT,
}

/**
 * LES TROIS SURFACES D'EXTÉRIEUR, ET CE QU'ELLES NE FONT PAS.
 *
 * Le balcon, le rez-de-jardin et la terrasse se déclaraient par oui ou par
 * non ; ils se déclarent désormais EN MÈTRES CARRÉS, comme le terrain et le
 * rooftop le faisaient déjà — un balcon de 3 m² et une loggia de 25 ne sont pas
 * le même bien, et le décor sait maintenant les distinguer.
 *
 * **CES SURFACES NE TOUCHENT PAS AU MONTANT.** Le barème ci-dessus n'a pas
 * bougé d'un point : la prime d'extérieur reste la même qu'avant, qu'on
 * déclare 3 m² ou 25. C'est délibéré — le calcul de l'estimation n'est pas
 * l'objet de cette passe, et une prime qui croîtrait avec la surface déclarée
 * serait une règle de marché inventée ici plutôt que relevée. Ce que ces
 * curseurs changent, c'est CE QU'ON VOIT : la dalle s'allonge, la pelouse
 * s'étend, le mobilier arrive. Le jour où le barème voudra les valoriser, la
 * valeur est déjà là et n'aura qu'à être lue.
 */
export const BALCON_SAISIE_MAX = 30
export const JARDIN_SAISIE_MAX = 200
export const TERRASSE_SAISIE_MAX = 80

/**
 * ASCENSEUR — déclaré, montré, et pas davantage.
 *
 * C'est l'équipement dont l'absence coûte le plus cher à un quatrième étage, et
 * il ne figure dans aucune base publique : la demander est juste (voir
 * `coefficientEtage` dans `etage.js`, dont le plafond de prime N'EXISTE QUE
 * parce qu'on ignorait s'il y avait un ascenseur).
 *
 * **ELLE NE CORRIGE PAS LE MONTANT POUR AUTANT.** Le barème de l'étage est
 * construit autour de cette ignorance ; le corriger ici reviendrait à toucher
 * deux fois au même facteur, et à déplacer tous les montants déjà rendus. La
 * déclaration est recueillie et dessinée — la cabine monte dans sa cage —, et
 * c'est au barème de l'étage, le jour où il sera révisé, de s'en servir.
 */

/** Surface de rooftop que le curseur laisse déclarer, en m². */
export const ROOFTOP_SAISIE_MAX = 120

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

  // Rez-de-jardin et rooftop ne se proposent qu'aux appartements : une maison
  // est déjà de plain-pied sur son terrain, et sa toiture n'est pas une
  // terrasse.
  if (!maison) {
    if (o.rezDeJardin) total += PRIME_REZ_DE_JARDIN
    const rooftop = borne(Number(o.rooftopM2) || 0, 0, ROOFTOP_PLAFOND_PRIME_M2)
    total += (PRIME_ROOFTOP_MAX * rooftop) / ROOFTOP_PLAFOND_PRIME_M2
  }

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

  const surface = Number(o.exterieurM2) || 0

  return {
    piscine: maison && o.piscine,
    // Le décor s'étend sur toute l'échelle DÉCLARABLE, pas sur celle du barème :
    // un terrain de 5 000 m² doit se voir cinq mille mètres carrés, même si la
    // prime, elle, a cessé de croître à 2 000 (voir `TERRAIN_SAISIE_MAX`).
    terrain: maison ? borne((Number(o.terrainM2) || 0) / TERRAIN_SAISIE_MAX, 0, 1) : 0,
    // LES PANNEAUX SOLAIRES NE SE PROPOSENT PLUS AUX APPARTEMENTS, et le décor
    // le sait aussi : un copropriétaire ne décide pas seul de la toiture de
    // l'immeuble, et la question n'avait pas de sens. Le barème, lui, n'a pas
    // changé — la case étant masquée, elle reste à faux, et aucun montant déjà
    // rendu ne bouge (voir `coefficientAffinage`).
    panneaux: maison && Boolean(o.panneaux),
    terrasse: maison && o.exterieur,
    balcon: !maison && o.exterieur,
    rezDeJardin: !maison && Boolean(o.rezDeJardin),
    rooftop: maison ? 0 : borne((Number(o.rooftopM2) || 0) / ROOFTOP_SAISIE_MAX, 0, 1),
    ascenseur: !maison && Boolean(o.ascenseur),
    // Les trois étendues, ramenées sur [0, 1] : le décor ne connaît pas les
    // mètres carrés, il ne connaît que « de combien ça s'allonge ».
    terrasseEtendue: borne(surface / TERRASSE_SAISIE_MAX, 0, 1),
    balconEtendue: borne(surface / BALCON_SAISIE_MAX, 0, 1),
    jardinEtendue: borne((Number(o.rezDeJardinM2) || 0) / JARDIN_SAISIE_MAX, 0, 1),
    standing: rangStanding(o.standing),
  }
}

export { TERRAIN_PLAFOND_M2, TERRAIN_SAISIE_MAX }
