// Barème de l'affinage — tous les pourcentages, tous les plafonds, tous les pas
// de curseur. Un seul fichier, pour qu'un réglage se change sans relire une
// ligne de code de calcul (`src/lib/affinage.js`) ni d'interface
// (`EstimationAffinagePanel.jsx`).
//
// LE PRINCIPE, dont découle la valeur de chaque nombre ci-dessous : le prix de
// référence vient de ventes DVF comparables du quartier, et **ces ventes
// contiennent déjà un standing moyen, un terrain moyen, des équipements
// moyens**. Les ajustements sont donc RELATIFS À LA MOYENNE DU SECTEUR, jamais
// absolus. C'est toute la raison pour laquelle « Standard » vaut 0 % : ce n'est
// pas un bien sans qualité, c'est le point neutre — celui du secteur — et il
// laisse l'estimation où le moteur l'a mise.
//
// CE BARÈME EST UNE CORRECTION, PAS UN CALCUL. Les pourcentages sont modérés,
// plafonnés un par un, puis plafonnés encore une fois tous ensemble (voir
// `PLAFOND_CUMULE`). Un affinage qui déplacerait l'estimation de moitié
// afficherait une précision que cinq cases à cocher n'ont pas — et rendrait au
// conseiller qui reçoit le lead une estimation invendable.

/**
 * Standing — le seul complément demandé aux deux types de bien, et celui qui
 * pèse le plus : l'état intérieur est le premier écart entre deux biens que
 * tout le reste rend identiques.
 *
 * TROIS NIVEAUX, et pas cinq. « Bon standing », « Haut de gamme » et
 * « Prestige » demandaient au vendeur de se situer sur une échelle dont il
 * n'a pas les repères — et dont l'écart entre les crans dépassait de loin ce
 * qu'une déclaration non vérifiée peut porter. Ce qui se déclare sans
 * ambiguïté, c'est l'existence de travaux à prévoir, leur absence, ou une
 * rénovation récente.
 *
 * L'ASYMÉTRIE EST VOLONTAIRE : −10 contre +8. Des travaux à prévoir se
 * décotent plus fort qu'une rénovation ne se survalorise — l'acheteur chiffre
 * un devis à la baisse, il ne rembourse jamais la facture à la hausse. C'est
 * le comportement réel du marché.
 */
export const STANDINGS = [
  {
    id: 'rafraichir',
    label: 'À rafraîchir',
    detail: 'Travaux à prévoir',
    coefficient: -0.1,
  },
  {
    id: 'standard',
    label: 'Standard',
    detail: 'Sans travaux majeurs',
    coefficient: 0,
  },
  {
    id: 'renove',
    label: 'Rénové ou neuf',
    detail: 'Matériaux et finitions récents',
    coefficient: 0.08,
  },
]

/** Le point neutre, présélectionné : un écran d'affinage ignoré ne déplace rien. */
export const STANDING_DEFAUT = 'standard'

/**
 * Atouts d'une maison — un pourcentage du prix de référence, PLAFONNÉ EN
 * EUROS, et c'est le plus petit des deux qui est retenu.
 *
 * Le plafond n'est pas une prudence de plus : c'est la forme juste. Une piscine
 * vaut à peu près la même chose sur un bien à 300 k€ que sur un bien à 900 k€ —
 * c'est un ouvrage, pas une fraction du bien. Le pourcentage décrit correctement
 * les biens ordinaires, le plafond rattrape les autres.
 */
export const ATOUTS_MAISON = {
  piscine: { pct: 0.04, plafondEuros: 25000 },
  terrasse: { pct: 0.02, plafondEuros: 12000 },
  panneaux: { pct: 0.015, plafondEuros: 9000 },
}

/**
 * Atouts d'un appartement.
 *
 * DEUX D'ENTRE EUX SE VALORISENT À LA SURFACE, en fraction du prix au mètre
 * carré habitable : un mètre carré de balcon ne vaut pas un mètre carré de
 * séjour, il en vaut une fraction — et cette fraction, elle, est stable d'un
 * marché à l'autre là où un montant au mètre carré ne le serait pas.
 *
 * Exemple : un 60 m² estimé 300 000 € vaut 5 000 €/m² ; ses 8 m² de balcon
 * valent 8 × 5 000 × 0,25 = 10 000 €, soit +3,3 %.
 *
 * Le plafond, ici, est en pourcentage et non en euros : la grandeur valorisée
 * est déjà proportionnelle au prix du bien, un plafond en euros y serait un
 * second plafond au lieu d'un garde-fou.
 */
export const ATOUTS_APPARTEMENT = {
  balcon: { partPrixM2: 0.25, plafondPct: 0.08 },
  rezDeJardin: { partPrixM2: 0.12, plafondPct: 0.1 },
  /**
   * Rooftop — la prime est celle d'en AVOIR un, pas celle de sa surface. Le
   * curseur déclare une surface parce que c'est ainsi qu'on décrit une
   * terrasse, et parce que le décor la dessine à l'échelle ; le barème, lui,
   * ne lit que « présent ou non ».
   */
  rooftop: { pct: 0.04, plafondEuros: 30000 },
}

/**
 * Ascenseur — la seule option dont la valeur dépend entièrement d'autre chose
 * que d'elle-même.
 *
 * Un ascenseur ne vaut rien au rez-de-chaussée et beaucoup au cinquième : ce
 * qu'il vend, c'est l'accès aux étages hauts, pas la cabine. Les paliers sont
 * lus du plus haut au plus bas, le premier atteint l'emporte.
 *
 * Il complète le barème d'étage du moteur, qui plafonne délibérément sa prime
 * à 5 % faute de savoir si l'immeuble en a un (voir `src/lib/etage.js`) : c'est
 * exactement l'ignorance que cette case lève.
 */
export const ASCENSEUR_PAR_ETAGE = [
  { aPartirDe: 5, pct: 0.045 },
  { aPartirDe: 3, pct: 0.03 },
  { aPartirDe: 1, pct: 0.015 },
  { aPartirDe: 0, pct: 0 },
]

/**
 * Terrain d'une maison — le seul ajustement qui ne parte pas de zéro.
 *
 * LE CURSEUR NE DÉCLARE PAS UN ATOUT, IL CORRIGE UNE DONNÉE. Il s'ouvre sur la
 * contenance cadastrale réelle de la parcelle, celle-là même que le moteur a
 * déjà passée à sa régression de terrain. Tant que le vendeur n'y touche pas,
 * l'ajustement vaut exactement 0 : pas de second comptage du terrain, le
 * montant reste celui du moteur au centime près.
 *
 * CE QUI SE PASSE QUAND IL Y TOUCHE. Le moteur corrige le terrain par une
 * régression en logarithme — `ajustement = c × ln(T / Tréférence)` — dont les
 * rendements sont décroissants : les premiers ares valent bien plus que les
 * derniers (voir `api/_lib/terrain.js`). Le recalcul est instantané et ne
 * repasse pas par l'API : le coefficient `c`, ajusté sur les ventes du secteur,
 * ne descend pas jusqu'ici. On garde donc la FORME du modèle — le logarithme du
 * rapport des deux surfaces — avec une pente unique, et le plafond du moteur.
 *
 * `pente` : déplacement de prix pour un terrain multiplié par e (2,72). À 0,15,
 * doubler le terrain vaut +10,4 %, le diviser par deux −10,4 %.
 * `plafondPct` : celui du moteur, inchangé (`TERRAIN.plafondPct`).
 */
export const TERRAIN = {
  pente: 0.15,
  plafondPct: 0.15,
}

/**
 * Pas et bornes des curseurs.
 *
 * `pas` est le cran du CURSEUR — ce dont il avance quand on le fait glisser.
 * `pasBouton` est celui des boutons + et −, qui servent à l'ajustement fin
 * qu'un curseur ne permet pas : c'est par eux qu'on atteint 137 m² sur une
 * piste graduée de cinquante en cinquante.
 *
 * Les deux ne peuvent pas être portés par l'attribut `step` de l'`input`, qui
 * contraindrait aussi les valeurs venues des boutons. Le curseur est donc
 * laissé libre au mètre carré et son `onChange` arrondit au `pas` — même
 * comportement à l'œil, sans interdire les valeurs intermédiaires.
 */
export const CURSEURS = {
  /**
   * Terrain. Le curseur monte à 5 000 m² là où la régression du moteur
   * s'applique sans borne de saisie : c'est l'échelle de ce qui se déclare, et
   * le décor s'étend jusque-là (voir `optionsDecor`).
   */
  terrain: { max: 5000, pas: 50, pasBouton: 1 },
  balcon: { max: 60, pas: 1, pasBouton: 1 },
  rezDeJardin: { max: 200, pas: 5, pasBouton: 1 },
  rooftop: { max: 120, pas: 1, pasBouton: 1 },
}

/**
 * PLAFOND CUMULÉ — le garde-fou qui compte, et le seul qui ne se contourne pas
 * en cochant tout.
 *
 * Sans lui, un vendeur qui déclare une piscine, une terrasse, des panneaux, un
 * terrain doublé et une rénovation récente sort à +25 % ou davantage, et
 * l'estimation devient invendable auprès de l'agent qui reçoit le lead. Notre
 * objectif est une estimation crédible, pas flatteuse.
 *
 * Il s'applique à la SOMME de tous les ajustements — terrain compris —, en
 * pourcentage du prix de référence rendu par le moteur.
 */
export const PLAFOND_CUMULE = { min: -0.15, max: 0.2 }
