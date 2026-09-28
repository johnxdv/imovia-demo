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
 *               plongée. Tous les plans du chantier tiennent entre 0,40 et
 *               0,46, soit vingt-deux à vingt-cinq degrés : la plongée qu'il
 *               faut pour que l'îlot se lise comme un disque et non comme un
 *               trait, et pas un degré de plus. Un seul descend plus bas —
 *               celui du prix, où l'on ne construit plus rien et où l'on ne
 *               fait plus que regarder (voir le plan 6).
 *   `face`      la position, ÉCRITE PAR RAPPORT À LA FAÇADE, en radians
 *               d'écart : 0 est l'aplomb de la porte d'entrée, positif le
 *               trois-quarts côté porte. C'est la seule façon dont un point de
 *               vue s'écrit ici — plus aucune architecture ne s'orbite (voir
 *               `ECART_FACE_MAX`).
 *   `regard`    hauteur visée, en part de la hauteur du bien.
 *
 * LE DÉCENTREMENT NE SERT PLUS QU'À UN SEUL PLAN, et c'est la mise en page qui
 * l'a voulu ainsi.
 *
 * Chaque plan portait un `cadre` : une translation d'objectif qui poussait le
 * bâtiment d'un cinquième de la largeur de l'écran, pour le sortir de derrière
 * le panneau de verre posé par-dessus. Le panneau ne se pose plus par-dessus —
 * il a sa zone, la scène a la sienne (voir `Estimer.jsx`) —, et le bien se cadre
 * donc au MILIEU de son propre cadre, comme n'importe quel sujet.
 *
 * Tous, sauf un : l'écran de la CONVERSATION, le seul du parcours où le panneau
 * reprend toute la largeur et recouvre le milieu de l'image. Là, et là
 * seulement, le bien se range dans le coin qui reste libre — voir `decalage` sur
 * le plan 7.
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
 * LES DIX PLANS, ET CE QU'IL RESTE DE DIFFÉRENT ENTRE EUX.
 *
 * Trois choses seulement bougent d'un stade au suivant : on se rapproche un peu
 * pendant que le bien se construit, on redescend d'un degré ou deux à mesure
 * qu'il monte, et on recule à la fin pour que tout tienne dans le cadre. Aucun
 * plan ne change de côté, aucun ne va chercher un détail. Mises bout à bout,
 * ces variations valent quelques mètres sur un parcours entier — l'image paraît
 * fixe, et c'est le bien qui change dedans.
 *
 * TROIS RÉGLAGES S'AJOUTENT AUX QUATRE D'ORIGINE, et chacun ne sert qu'à un ou
 * deux plans :
 *
 *   `derive`    une très lente oscillation de l'azimut, par-dessus le
 *               balancement. Elle n'existe qu'au plan du prix : c'est la
 *               dérive d'un drone en vol stationnaire qui n'est pas tout à fait
 *               immobile — deux ou trois kilomètres-heure, pas davantage. Au-delà,
 *               ce n'est plus une dérive, c'est un survol.
 *   `decalage`  pousse le bien hors du centre du cadre, en fractions de la
 *               distance de prise de vue. Il ne sert qu'au plan de la
 *               CONVERSATION, où le panneau reprend toute la largeur et
 *               recouvre le milieu de l'image : le bien s'y range en bas à
 *               gauche, dans ce qui reste de vide.
 *   `immeuble`  des valeurs de remplacement pour l'appartement. C'est la seule
 *               entorse au principe « un plan, une valeur » — et elle est due à
 *               la géométrie : un immeuble de six niveaux fait deux fois la
 *               hauteur d'une maison, et le recul qui le range dans un coin
 *               n'est pas celui qui y range une villa.
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

  /**
   * 6 — LE PRIX, ENCORE FLOUTÉ. Le plan le plus BAS du parcours.
   *
   * Tous les autres sont des plongées de vingt-deux à vingt-cinq degrés : c'est
   * ce qu'il faut pour que l'îlot se lise comme un disque pendant qu'on
   * construit dessus. Ici, on ne construit plus rien — le bien est achevé, le
   * soir tombe, et le vendeur attend son montant. Le drone redescend donc à
   * dix-neuf degrés : c'est la hauteur d'où l'on REGARDE un bien, et non celle
   * d'où on l'inspecte. La façade y reprend sa hauteur, et le toit cesse
   * d'occuper le tiers de l'image.
   *
   * ET C'EST LE SEUL PLAN QUI DÉRIVE. Un vol stationnaire n'est jamais
   * parfaitement stationnaire : l'appareil se replace en permanence, et cela se
   * lit comme une très lente rotation du bien. Un centième de radian par
   * seconde au passage à vide — à trente unités de distance, la vitesse d'un
   * drone qui avance à deux ou trois kilomètres-heure. C'est un plan posé, pas
   * un survol : sur toute la durée de l'écran, le point de vue tourne de moins
   * de huit degrés.
   */
  {
    recul: 1.1,
    elevation: 0.34,
    face: 0.24,
    regard: 0.44,
    derive: { amplitude: 0.14, pulsation: 0.093 },
  },

  /**
   * 7 — LA CONVERSATION. Le seul plan décentré du parcours.
   *
   * C'est l'écran où le panneau reprend TOUTE la largeur et recouvre la scène
   * (voir `pleineLargeur` dans `Estimer.jsx`) : le montant à gauche, les
   * questions à droite, et le bien derrière. Centré, il se retrouve exactement
   * sous le panneau — on le sait construit, on ne le voit plus.
   *
   * Il se range donc EN BAS À GAUCHE, là où la mise en page laisse du vide, et
   * il prend du recul pour tenir dans ce coin. L'appartement en prend beaucoup
   * plus que la maison, et c'est la seule raison pour laquelle ce plan a une
   * variante : un immeuble de six niveaux est deux fois plus haut qu'une villa,
   * et le décalage qui range l'une dans un coin sort l'autre du cadre.
   */
  {
    recul: 1.32,
    elevation: 0.4,
    face: 0.24,
    regard: 0.46,
    decalage: { x: 0.11, y: 0.07 },
    immeuble: { recul: 1.92, decalage: { x: 0.2, y: 0.1 } },
  },

  // 8 — le bien achevé et son halo, une fois les coordonnées recueillies : on
  //     revient au centre et on prend un peu de champ, c'est tout.
  { recul: 1.16, elevation: 0.44, face: 0.24, regard: 0.46 },

  // 9 — AFFINAGE : le plan le plus large du parcours. Il faut tout tenir dans
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

/**
 * Azimut visé par le plan donné — toujours la façade, à son écart près, et à sa
 * dérive près pour le seul plan qui en porte une.
 */
export function azimutDuPlan(plan, secondes = 0) {
  const derive = plan.derive
    ? Math.sin(secondes * plan.derive.pulsation) * plan.derive.amplitude
    : 0
  return FACE + borneEcart((plan.face ?? 0) + derive)
}

/** Ramène un écart à la façade dans la fenêtre autorisée. */
export function borneEcart(ecart) {
  return Math.max(-ECART_FACE_MAX, Math.min(ECART_FACE_MAX, ecart))
}

/**
 * LE PLAN RÉSOLU POUR L'ARCHITECTURE EN COURS.
 *
 * Un plan s'écrit une fois, pour tous les biens : c'est ce qui garantit que le
 * parcours a le même rythme qu'on estime une maison ou un appartement. Un seul
 * d'entre eux a besoin d'une variante (voir le plan 7), et cette fonction est
 * le seul endroit où elle se lit — partout ailleurs, un plan est un plan.
 *
 * Elle rend un objet NEUF à chaque appel, et c'est voulu : le décor le retient
 * le temps d'un stade (voir `planCourant` dans `DroneScene`), il n'est pas lu
 * image par image.
 */
export function reglageDuPlan(plan, famille = null) {
  const variante = (famille && plan[famille]) || null
  return {
    recul: variante?.recul ?? plan.recul,
    elevation: variante?.elevation ?? plan.elevation,
    regard: variante?.regard ?? plan.regard,
    face: variante?.face ?? plan.face ?? 0,
    derive: variante?.derive ?? plan.derive ?? null,
    decalage: variante?.decalage ?? plan.decalage ?? null,
  }
}
