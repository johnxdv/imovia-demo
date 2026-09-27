// Étage d'un appartement — champ du parcours, et correctif de prix.
//
// C'est la seconde chose que l'utilisateur déclare de tout le parcours, après
// la surface, et la seule qui ne se lise dans aucune base : ni la BDNB ni la
// BD TOPO® ne descendent au logement, elles ne connaissent que le bâtiment.
//
// Isomorphe à dessein : la fenêtre de surface s'en sert pour faire réagir son
// aperçu (`BuildingConfirmModal`), le moteur pour corriger le montant final
// (`api/estimation.js`). Un seul barème, deux lectures — sans quoi l'aperçu qui
// suit le doigt et le montant qui s'affiche trois écrans plus loin diraient deux
// choses différentes du même étage.

/**
 * Bornes du champ. Au-delà du douzième, la marche est la même : le barème est
 * de toute façon plafonné bien avant, et un sélecteur qui compte jusqu'à
 * cinquante ne servirait qu'à faire défiler.
 */
export const ETAGE_MIN = 0
export const ETAGE_MAX = 12

/**
 * ÉTAGE DE RÉFÉRENCE DU BARÈME — celui dont le coefficient vaut exactement 1.
 *
 * C'était AUSSI la valeur d'ouverture du champ, et les deux ne font plus qu'un :
 * le sélecteur s'ouvre désormais au REZ-DE-CHAUSSÉE (voir `ETAGE_OUVERTURE`).
 * Les séparer était la condition pour déplacer l'un sans toucher à l'autre —
 * le barème est resté rigoureusement identique, et un bien déclaré au deuxième
 * vaut au centime près ce qu'il valait avant.
 */
export const ETAGE_DEFAUT = 2

/**
 * VALEUR D'OUVERTURE DU SÉLECTEUR — le rez-de-chaussée.
 *
 * Elle ouvrait au deuxième étage, qui est la valeur neutre du barème : un champ
 * jamais touché ne déplaçait alors rien. Elle ouvre au rez-de-chaussée, et il
 * faut dire ce que ça change, parce que ce n'est pas rien : **un vendeur qui
 * ne touche pas au sélecteur déclare désormais un rez-de-chaussée**, lequel
 * porte une décote de 5 % (voir `COEFFICIENT_RDC`). Le barème n'a pas bougé
 * d'un point ; c'est la valeur déclarée par défaut qui a changé, et le montant
 * avec elle.
 *
 * Ouvrir en bas de l'échelle a une justification : c'est le seul cran depuis
 * lequel on ne peut aller que dans un sens, et c'est donc celui où l'on
 * remarque le plus vite que le champ est réglable. Le compromis est assumé, il
 * n'est pas silencieux.
 */
export const ETAGE_OUVERTURE = 0

/** Décote du rez-de-chaussée, et prime maximale des étages élevés. */
const COEFFICIENT_RDC = 0.95
const COEFFICIENT_PREMIER = 0.985
const PRIME_PAR_ETAGE = 0.008
const PRIME_MAX = 0.05

/**
 * Coefficient de prix d'un étage — au voisinage de 1, jamais loin.
 *
 * Le rez-de-chaussée se vend moins cher (vis-à-vis, bruit, sécurité, lumière) :
 * la décote couramment relevée par les études de marché va de 5 à 10 %, on
 * retient la borne basse. Les étages élevés se vendent un peu mieux (vue, calme,
 * clarté), mais la prime est plafonnée à 5 % pour une raison précise : elle ne
 * vaut qu'avec un ascenseur, dont **rien ne dit s'il existe**. Aucune base
 * publique ne descend à l'équipement d'un immeuble ; le supposer serait inventer
 * une donnée, et un cinquième sans ascenseur se vend moins cher qu'un deuxième,
 * pas plus. Le plafond est donc le prix de cette ignorance assumée.
 *
 * Onze points d'écart en tout, du rez-de-chaussée au dernier étage. C'est
 * volontairement modéré : l'étage est un facteur réel du prix d'un appartement,
 * il n'en est jamais le facteur principal — la surface et le secteur pèsent
 * chacun dix fois plus. Un barème plus contrasté afficherait une précision que
 * la seule donnée « étage », sans vue ni exposition ni ascenseur, n'a pas.
 */
export function coefficientEtage(etage) {
  const n = normaliseEtage(etage)
  if (n === null) return 1

  if (n === 0) return COEFFICIENT_RDC
  if (n === 1) return COEFFICIENT_PREMIER
  if (n === ETAGE_DEFAUT) return 1

  return 1 + Math.min(PRIME_PAR_ETAGE * (n - ETAGE_DEFAUT), PRIME_MAX)
}

/**
 * Étage exploitable, ou `null` quand le champ n'a pas été renseigné — cas d'une
 * maison, d'un terrain, ou d'un appartement dont la détection n'a pas abouti
 * avant la validation. `null` vaut coefficient 1 : ne rien savoir de l'étage ne
 * doit ni bonifier ni pénaliser.
 */
export function normaliseEtage(value) {
  if (value === null || value === undefined || value === '') return null

  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return null

  return Math.min(Math.max(n, ETAGE_MIN), ETAGE_MAX)
}

/**
 * Libellé de l'étage. « RDC » plutôt que « 0 » : personne ne dit habiter au
 * zéroième, et un sélecteur qui commence à zéro se lit comme un compteur.
 */
export function etageLabel(etage) {
  const n = normaliseEtage(etage)
  if (n === null) return ''

  if (n === 0) return 'Rez-de-chaussée'
  if (n === 1) return '1er étage'
  if (n === ETAGE_MAX) return `${ETAGE_MAX}e étage ou plus`

  return `${n}e étage`
}
