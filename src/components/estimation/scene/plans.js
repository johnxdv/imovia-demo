import * as THREE from 'three'

/**
 * LES PLANS DU DRONE — un par stade du parcours.
 *
 * Le drone ne tourne pas : il VOYAGE. Chaque stade a son plan, et l'appareil
 * se rend de l'un à l'autre pendant que le bâtiment change — si bien qu'on
 * voit le changement sous un autre angle que celui où on l'a quitté.
 *
 *   `pivot`     autour de quoi le drone tourne, et ce qu'il regarde. `centre`
 *               pour le bien entier, `porte` pour l'entrée, `toit` pour la
 *               couverture. Les trois temps de l'analyse en usent chacun d'un
 *               différent : on ne filme pas une porte d'en haut, ni un toit
 *               d'en bas.
 *   `recul`     multiplie la distance de cadrage calculée. `distance` la
 *               remplace par une distance absolue, pour les plans serrés dont
 *               le cadrage ne dépend pas de la taille du bien.
 *   `elevation` hauteur de vol rapportée à la distance — c'est l'angle de
 *               plongée. 1,02 : au-dessus du toit. 0,13 : à hauteur d'homme,
 *               devant l'entrée.
 *   `azimut`    position visée sur l'orbite, en radians, TOUJOURS CROISSANTE :
 *               le drone tourne toujours dans le même sens et ne revient
 *               jamais sur ses pas. La façade est au sud (+Z), soit un azimut
 *               de π/2 ; les valeurs au-delà de 2π sont les mêmes positions,
 *               un tour plus loin.
 *   `regard`    hauteur visée, en part de la hauteur du bien (pivot `centre`)
 *               ou en mètres au-dessus du repère (pivots `porte` et `toit`).
 *   `derive`    dérive lente pendant le stade, pour que le plan respire.
 *   `cadre`     décentrement horizontal, en fraction de la largeur de l'écran.
 *               C'est ce qui sort le bâtiment de derrière le panneau.
 */

const TOUR = Math.PI * 2
/** Azimut de la façade : le drone qui la regarde de face est à π/2. */
const FACE = Math.PI / 2

export const PLANS = [
  // 0 — le chantier vu de haut : on repère le lieu avant de bâtir.
  { pivot: 'centre', recul: 1.5, elevation: 0.78, azimut: 0.6, regard: 0.45, derive: 0.032, cadre: 0.15 },
  // 1 — le drone plonge au ras de la dalle pendant que les murs montent.
  { pivot: 'centre', recul: 1.24, elevation: 0.3, azimut: FACE + 0.55, regard: 0.7, derive: 0.05, cadre: -0.17 },
  // 2 — trois-quarts arrière : la surface se règle, le bien prend son volume.
  { pivot: 'centre', recul: 1.16, elevation: 0.52, azimut: 3.3, regard: 0.55, derive: 0.048, cadre: 0.18 },

  // 3 — ANALYSE 1/3, en bas, devant la porte. Une entrée se regarde d'en bas,
  //     jamais d'en haut : le drone se pose à hauteur d'homme et lève le nez.
  {
    pivot: 'porte',
    // Distance absolue, et non calculée : ce plan-là cadre une ENTRÉE, pas un
    // bâtiment. Il doit rester le même qu'on estime un studio ou une propriété
    // — une porte fait la même taille dans les deux.
    distance: 8.6,
    recul: 1,
    elevation: 0.2,
    azimut: TOUR + FACE,
    regard: 0.35,
    derive: 0.03,
    cadre: 0.2,
  },
  // 4 — ANALYSE 2/3, trois-quarts côté gauche, à hauteur d'étage : c'est
  //     l'angle du bâtiment, là où les menuiseries et les balcons se lisent.
  {
    pivot: 'centre',
    recul: 1.0,
    elevation: 0.44,
    azimut: TOUR + 2.42,
    regard: 0.52,
    derive: 0.042,
    cadre: -0.18,
  },
  // 5 — ANALYSE 3/3, au-dessus du toit. Pas à la verticale — une toiture vue
  //     d'aplomb se lit comme un plan, pas comme une maison — mais en
  //     surplomb franc, le seul endroit d'où l'on voit une couverture se poser.
  {
    pivot: 'toit',
    // `cadrage: 'largeur'` : ce plan-là regarde une COUVERTURE, et le drone est
    // déjà à son niveau. Le cadrer sur la hauteur du bâtiment le renverrait à
    // deux fois sa hauteur au-dessus du faîtage — d'où l'immeuble se lirait
    // comme un timbre-poste. C'est l'emprise du toit qui commande ici.
    cadrage: 'largeur',
    recul: 0.96,
    // En surplomb franc, mais pas à la verticale : une toiture vue d'aplomb se
    // lit comme un plan, pas comme un bâtiment.
    elevation: 0.62,
    azimut: TOUR + 3.6,
    regard: -0.3,
    derive: 0.028,
    cadre: 0.16,
  },

  // 6 — le soir : léger pas de côté, les vitrages s'allument.
  { pivot: 'centre', recul: 1.24, elevation: 0.52, azimut: TOUR + 5.2, regard: 0.5, derive: 0.038, cadre: -0.15 },
  // 7 — grand écart arrière, en surplomb : le bien achevé et son halo.
  { pivot: 'centre', recul: 1.4, elevation: 0.7, azimut: TOUR + 6.8, regard: 0.5, derive: 0.03, cadre: 0 },
  // 8 — AFFINAGE : la vue globale. On recule pour tout tenir dans le cadre —
  //     la maison, son jardin, sa piscine —, et le panneau ne prend plus que
  //     le coin de l'écran.
  {
    pivot: 'centre',
    recul: 1.18,
    elevation: 0.42,
    azimut: TOUR * 2 + 2.1,
    regard: 0.42,
    derive: 0.055,
    cadre: -0.08,
  },
]

export const DERNIER_PLAN = PLANS.length - 1

/**
 * MARGE DE CADRAGE — ce que le drone garde autour du bâtiment.
 *
 * 1 collerait le bien aux bords du cadre. Il en faut nettement plus, pour une
 * raison de mise en page autant que de composition : le panneau d'étape occupe
 * le tiers central de l'écran, et les plans DÉCENTRENT le bien d'un sixième de
 * la largeur pour l'en sortir (voir `cadre`). Un bien qui remplirait le cadre
 * déborderait alors du côté où on le pousse — on gagnerait sur le panneau ce
 * qu'on perdrait sur le bord.
 *
 * À 1,9, le bien occupe un peu moins des deux tiers de la largeur : décentré,
 * il tient tout entier dans le cadre, et il reste assez grand pour qu'on voie
 * une baie se poser.
 */
export const MARGE_CADRAGE = 1.9

/**
 * Part de la hauteur du canevas laissée au bâtiment quand le panneau est rangé
 * en bas de l'écran (téléphone). Le bien est cadré dans cette bande-là, et non
 * au centre.
 *
 * Elle est plus étroite que la bande réellement libre, et c'est volontaire :
 * le panneau monte haut sur un écran de téléphone, et un bien cadré sur la
 * moitié supérieure s'y retrouverait à demi caché. À 0,38, il tient au-dessus
 * du panneau sur la plupart des étapes, et déborde sous le verre sur les plus
 * longues.
 */
export const BANDE_HAUTE = 0.38

/** Point autour duquel le drone tourne, pour le plan donné. */
export function pivotDuPlan(plan, ancrages) {
  if (plan.pivot === 'porte' && ancrages?.porte) return ancrages.porte.clone()
  if (plan.pivot === 'toit') return new THREE.Vector3(0, ancrages?.hauteur ?? 4, 0)
  return new THREE.Vector3(0, 0, 0)
}

/** Point visé par la caméra, pour le plan donné. */
export function cibleDuPlan(plan, ancrages, hauteurBien) {
  const pivot = pivotDuPlan(plan, ancrages)
  if (plan.pivot === 'centre') return new THREE.Vector3(0, hauteurBien * plan.regard, 0)
  return pivot.add(new THREE.Vector3(0, plan.regard, 0))
}
