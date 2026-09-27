import * as THREE from 'three'

/**
 * LES PLANS DU DRONE — un par stade du parcours.
 *
 * ET LE DRONE NE VOLE PLUS. C'est le changement de parti de cette version, et
 * tout le reste en découle.
 *
 * Il tournait autour du bien, plongeait au ras de la dalle, venait coller à la
 * porte d'entrée, repassait au-dessus du toit. C'était juste au sens du métier
 * — ce sont les mouvements d'un vrai tournage au drone — et c'était le défaut :
 * ça se lit comme un JEU VIDÉO. Un bien qu'on estime ne se survole pas ; il se
 * REGARDE. Chaque plan est donc devenu presque le même plan : la façade, une
 * légère plongée, et de très petits écarts d'un stade au suivant — assez pour
 * que le cadre respire, jamais assez pour qu'on ait l'impression de se
 * déplacer.
 *
 *   `recul`     multiplie la distance de cadrage calculée. C'est tout ce qui
 *               règle la taille du bien à l'écran : le cadrage lui-même se
 *               calcule sur l'envergure de l'ouvrage (voir `cadrer` dans
 *               `DroneScene`).
 *   `elevation` hauteur de vol rapportée à la distance — c'est l'angle de
 *               plongée. Toutes les valeurs tiennent désormais entre 0,40 et
 *               0,46, soit vingt-deux à vingt-cinq degrés : la plongée qu'il
 *               faut pour que l'îlot se lise comme un disque et non comme un
 *               trait, et pas un degré de plus.
 *   `face`      la position, ÉCRITE PAR RAPPORT À LA FAÇADE, en radians
 *               d'écart : 0 est l'aplomb de la porte d'entrée, positif le
 *               trois-quarts côté porte. C'est la seule façon dont un point de
 *               vue s'écrit ici — plus aucune architecture ne s'orbite (voir
 *               `ECART_FACE_MAX`).
 *   `regard`    hauteur visée, en part de la hauteur du bien.
 *
 * IL N'Y A PLUS DE DÉCENTREMENT, et c'est la mise en page qui l'a rendu inutile.
 *
 * Chaque plan portait un `cadre` : une translation d'objectif qui poussait le
 * bâtiment d'un cinquième de la largeur de l'écran, pour le sortir de derrière
 * le panneau de verre posé par-dessus. Le panneau ne se pose plus par-dessus —
 * il a sa zone, la scène a la sienne (voir `Estimer.jsx`). Le bien se cadre donc
 * au MILIEU de son propre cadre, comme n'importe quel sujet, et la moitié de la
 * machinerie de cadrage s'en va avec : le décentrement, la bande du haut du
 * téléphone, et la marge de cadrage élargie qu'elle demandait.
 */

/** Azimut de la façade : le drone qui la regarde de face est à π/2. */
export const FACE = Math.PI / 2

/**
 * ÉCART MAXIMAL À LA FAÇADE — la limite que le point de vue ne franchit pas.
 *
 * Elle valait 0,95 radian — cinquante-quatre degrés, le trois-quarts franc — et
 * ne s'appliquait qu'aux maisons : un immeuble, lui, se laissait faire le tour
 * depuis la rue. Les deux règles ont fusionné, et l'écart est tombé à 0,40
 * radian, soit vingt-trois degrés.
 *
 * UN BIEN SE MONTRE DE FACE. C'est la vue où on le reconnaît, celle où l'on
 * voit sa porte, ses fenêtres et ce qu'il a devant lui ; c'est aussi la seule
 * qu'un vendeur reconnaîtrait de son propre bien. Vingt-trois degrés suffisent
 * à ce que la façade ne soit pas plate — on voit le retour du volume, et l'on
 * comprend qu'il y a de la profondeur — sans jamais commencer à filmer le côté,
 * et encore moins l'arrière.
 *
 * C'est un PLAFOND, et il vaut pour tout ce qui décale le point de vue.
 */
export const ECART_FACE_MAX = 0.4

/**
 * LES NEUF PLANS, ET CE QU'IL RESTE DE DIFFÉRENT ENTRE EUX.
 *
 * Trois choses seulement bougent d'un stade au suivant : on se rapproche un peu
 * pendant que le bien se construit, on redescend d'un degré ou deux à mesure
 * qu'il monte, et on recule à la fin pour que tout tienne dans le cadre. Aucun
 * plan ne change de côté, aucun ne change de pivot, aucun ne va chercher un
 * détail. Mises bout à bout, ces variations valent quelques mètres sur un
 * parcours entier — l'image paraît fixe, et c'est le bien qui change dedans.
 */
export const PLANS = [
  // 0 — l'accueil. Le plan le plus large et le plus haut des trois premiers :
  //     on voit l'îlot entier avant qu'il porte quoi que ce soit.
  { recul: 1.22, elevation: 0.46, face: 0.3, regard: 0.46 },
  // 1 — l'adresse. À peine resserré : les murs montent, on s'en approche d'un
  //     pas.
  { recul: 1.14, elevation: 0.44, face: 0.28, regard: 0.48 },
  // 2 — la surface. Un rien plus bas, parce que c'est ici que le volume se
  //     règle au curseur et qu'une plongée écrase les hauteurs.
  { recul: 1.1, elevation: 0.42, face: 0.26, regard: 0.5 },

  // 3, 4, 5 — L'ANALYSE, ET C'EST TROIS FOIS LE MÊME PLAN.
  //
  // Les trois temps de l'analyse avaient chacun le leur : devant la porte, au
  // trois-quarts, puis au-dessus du toit. Le drone passait la durée de l'écran
  // à voyager, et le vendeur regardait la caméra au lieu de regarder son bien.
  // Ces trois lignes sont désormais rigoureusement identiques : pendant tout
  // l'écran d'analyse, L'IMAGE NE BOUGE PAS. Ce qui bouge, c'est la façade qui
  // se perce, la couverture qui se pose et le jardin qui sort de terre — et on
  // les voit, justement parce que rien d'autre ne bouge.
  { recul: 1.06, elevation: 0.4, face: 0.24, regard: 0.5 },
  { recul: 1.06, elevation: 0.4, face: 0.24, regard: 0.5 },
  { recul: 1.06, elevation: 0.4, face: 0.24, regard: 0.5 },

  // 6 — le soir : les vitrages s'allument. Le plan de l'analyse, inchangé ou
  //     presque — on ne bouge pas pour regarder une lumière s'allumer.
  { recul: 1.08, elevation: 0.41, face: 0.24, regard: 0.48 },
  // 7 — le bien achevé et son halo : on prend un peu de champ, c'est tout.
  { recul: 1.16, elevation: 0.44, face: 0.24, regard: 0.46 },
  // 8 — AFFINAGE : le plan le plus large du parcours. Il faut tout tenir dans
  //     le cadre — la maison, son jardin, sa piscine —, et c'est le seul
  //     recul franc qui reste.
  { recul: 1.24, elevation: 0.42, face: 0.26, regard: 0.44 },
]

export const DERNIER_PLAN = PLANS.length - 1

/**
 * MARGE DE CADRAGE — ce que le drone garde autour du bâtiment.
 *
 * 1 collerait le bien aux bords du cadre ; il en faut un peu plus, pour que le
 * faîtage et les abords ne touchent jamais l'arête de l'image.
 *
 * RESSERRÉE DE 1,45 À 1,22 avec la séparation des deux zones. La marge payait
 * jusqu'ici le décentrement : le bien était poussé d'un cinquième de la largeur
 * pour sortir de derrière le panneau, et il fallait garder de quoi ne pas le
 * faire déborder du côté opposé. Le panneau ne le recouvre plus, le bien est
 * centré dans son propre cadre, et cette réserve n'a plus d'objet — elle revient
 * en TAILLE : le bâtiment occupe sa zone au lieu de flotter au milieu.
 *
 * Elle vaut pour les deux gabarits. Le cadrage se calcule sur l'ouverture réelle
 * de la caméra, laquelle suit le format du canevas (voir `cadrer` dans
 * `DroneScene`) : une zone large et basse — celle du téléphone — s'y règle
 * d'elle-même, sans marge particulière.
 */
export const MARGE_CADRAGE = 1.22

/** Point visé par la caméra : l'axe du bien, à la hauteur que demande le plan. */
export function cibleDuPlan(plan, hauteurBien) {
  return new THREE.Vector3(0, hauteurBien * plan.regard, 0)
}

/** Azimut visé par le plan donné — toujours la façade, à son écart près. */
export function azimutDuPlan(plan) {
  return FACE + borneEcart(plan.face ?? 0)
}

/** Ramène un écart à la façade dans la fenêtre autorisée. */
export function borneEcart(ecart) {
  return Math.max(-ECART_FACE_MAX, Math.min(ECART_FACE_MAX, ecart))
}
