import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import * as THREE from 'three'
import * as M from './scene/matieres'
import { creerVoliere } from './scene/oiseaux'
import { creerOssature } from './scene/ossature'
import { creerVilla, palierVilla } from './scene/villa'
import { creerImmeuble, ETAGES as ETAGES_IMMEUBLE } from './scene/immeuble'
import {
  azimutDuPlan,
  cibleDuPlan,
  DERNIER_PLAN,
  FACE,
  MARGE_CADRAGE,
  PLANS,
  reglageDuPlan,
} from './scene/plans'

/**
 * LE DÉCOR DU PARCOURS D'ESTIMATION — un bien filmé au drone, en vraie 3D.
 *
 * LA SCÈNE A SA ZONE, ET ELLE Y EST SEULE. Elle ne passe plus derrière le
 * panneau des étapes : la page lui donne la moitié droite de l'écran — la bande
 * du haut sur téléphone — et garde le panneau sur un fond blanc nu à côté (voir
 * `src/pages/Estimer.jsx`). Le composant ne lit rien, ne décide rien et ne
 * remonte rien : il reçoit l'état du parcours et se contente de le mettre en
 * scène. La page reste entièrement utilisable si WebGL manque — le canevas
 * n'affiche alors rien.
 *
 * TROIS ARCHITECTURES, ET DEUX D'ENTRE ELLES NE CHANGENT JAMAIS.
 *
 *   Tant qu'aucun bien n'est repéré, c'est une OSSATURE : une maison en
 *   construction, creuse, avec ses murs percés, sa porte, ses fenêtres et ses
 *   solives. Pas un bloc — derrière des murs il y a du vide, et c'est ce vide
 *   qui fait qu'on peut y vivre (voir `scene/ossature.js`).
 *
 *   Une maison, c'est TOUJOURS LA MÊME maison d'architecte — enduit blanc,
 *   menuiseries noires, grande baie, pergola. Seul son PROGRAMME change avec
 *   la surface déclarée, par paliers de 50, 100, 150, 200 et 300 m² : un étage
 *   qui apparaît, une aile qui se greffe, un porche qui s'ouvre. Jamais la
 *   même maison en plus grand (voir `scene/villa.js`).
 *
 *   Un appartement, c'est TOUJOURS LE MÊME IMMEUBLE CONTEMPORAIN : une
 *   résidence de six niveaux, dalles de béton blanc en débord, bardage de bois
 *   vertical et balcons décalés à garde-corps de verre (voir `immeuble.js`).
 *   Il ne se bâtit PAS sous le curseur, et c'est le seul ouvrage dans ce cas :
 *   il est entier dès l'instant où le type est connu, parce que c'est à cet
 *   instant-là que le vendeur commence à régler sa surface — et qu'on ne règle
 *   pas une surface devant un bâtiment qui n'a pas fini de paraître. Ce qui s'y
 *   passe, c'est LES BAIES DE L'ÉTAGE DÉCLARÉ qui s'allument dès qu'il le
 *   règle : c'est tout ce qu'un immeuble peut honnêtement dire d'un logement
 *   qu'on ne voit pas de la rue.
 *
 * IL N'Y A PLUS DE VISITE INTÉRIEURE. Le drone entrait par la porte cochère,
 * montait le puits de l'escalier un tour par étage et parcourait un
 * appartement meublé. C'était juste, et c'était une demi-minute passée loin du
 * bien qu'on estime — dans un intérieur qui n'était celui de personne. La
 * séquence et son décor ont été retirés en entier.
 *
 * LA CAMÉRA, ELLE, NE VOYAGE PRESQUE PLUS.
 *
 * Elle tournait autour du bien, plongeait au ras de la dalle, venait coller à
 * la porte pour le premier temps de l'analyse et repassait au-dessus du toit
 * pour le troisième. C'étaient de vrais mouvements de drone, et c'est
 * exactement le reproche : ça se regarde comme un JEU VIDÉO. Tous les plans
 * sont désormais presque le même plan — la façade, une légère plongée — et
 * pendant l'écran d'analyse, ils sont rigoureusement identiques (voir `PLANS`).
 * Ce qui change à l'écran, c'est le bien ; jamais le point de vue.
 *
 * DEUX ÉCRANS Y FONT EXCEPTION, et les deux pour une raison de mise en page,
 * jamais pour le plaisir du mouvement. Sur l'écran du PRIX, le drone redescend
 * et dérive très lentement — deux ou trois kilomètres-heure, un vol
 * stationnaire qui n'est pas tout à fait immobile. Sur celui de la
 * CONVERSATION, où le panneau reprend toute la largeur et recouvre le milieu de
 * l'image, le bien se range en bas à gauche et prend du recul : c'est le cadre
 * qui se recompose, la caméra ne bouge pas (voir `viserDecale`).
 *
 * L'AFFINAGE, enfin : le vendeur ajoute une piscine, du terrain, des panneaux,
 * une terrasse ou un balcon, il choisit son standing — et chaque option se
 * DESSINE sur le bien. C'est le dernier stade, et la caméra y prend le recul
 * qu'il faut pour que tout tienne dans le cadre.
 *
 * `prefers-reduced-motion` supprime le peu qui reste — le balancement et la
 * respiration — et fige les transitions de géométrie sur leur valeur d'arrivée :
 * la scène reste juste, elle ne bouge plus du tout.
 */

/**
 * Correctif d'éclairage. La maquette de référence a été écrite pour three
 * r128, où l'intensité d'une lumière s'entendait en unités arbitraires ;
 * depuis r155, elle s'entend en unités physiques, ce qui revient à diviser les
 * mêmes valeurs par π. On les remultiplie donc par π.
 */
const FACTEUR_LUMIERE = Math.PI

/* -------------------------------------------------------------------------- */
/*  L'ÎLOT                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * LE BIEN NE SE CONSTRUIT PLUS À MÊME LE SOL : IL SE CONSTRUIT SUR UN ÎLOT.
 *
 * Un disque légèrement surélevé, cerclé d'un trait noir, détaché du sol blanc
 * qui l'entoure par un vide de quelques dizaines de centimètres. Ce n'est pas
 * un ornement : c'est ce qui dit que le bien qu'on voit est POSÉ quelque part,
 * dans un espace qui n'est nulle part. Sans lui, un bâtiment blanc sur un sol
 * blanc n'a plus d'assise — il flotte, et on ne sait plus ce qui est le sujet.
 *
 *   `CREUX`         de combien le sol alentour est descendu sous l'îlot. C'est
 *                   la profondeur du vide qu'on voit entre les deux.
 *   `EPAISSEUR`     la tranche du socle. Son dessus est à l'altitude zéro —
 *                   celle où tout le bien est construit —, et il descend de là.
 *   `LISERE`        l'épaisseur du trait noir du bord, en part du rayon. Un
 *                   trait tracé en unités du monde grossirait avec l'îlot ; en
 *                   part du rayon, il garde la même finesse à l'écran quelle
 *                   que soit la taille de la propriété.
 *   `RAYON_SOL_DEFAUT`  l'emprise retenue tant qu'aucun ouvrage n'en déclare.
 */
const CREUX = 0.8
const EPAISSEUR_SOCLE = 0.5
const LISERE = 0.015
const RAYON_SOL_DEFAUT = 12

/**
 * L'AVANCEMENT DU CHANTIER, STADE PAR STADE.
 *
 * Une ligne par ouvrage, une colonne par stade du parcours (0 à 8, voir
 * `stadeChantier` dans `Estimer.jsx`). Tout est écrit là plutôt que dispersé
 * en conditions : on lit d'un coup d'œil ce qui se construit à quel moment, et
 * c'est la seule chose à retoucher pour déplacer un ouvrage d'une étape à une
 * autre.
 *
 * `montage` est la hauteur du PLAN DE COUPE : le bâtiment n'est pas étiré
 * depuis le sol, il est tranché par un plan qui monte. Une baie étirée serait
 * une baie déformée ; une baie tranchée est une baie qu'on maçonne — elle
 * paraît d'abord comme une allège, puis comme un tableau, puis se referme sous
 * son linteau.
 */
const CHANTIER = {
  ossature: {
    montage: [0.36, 0.78, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  villa: {
    //                  0     1     2     3     4     5   6  7  8  9
    montage: [0.22, 0.52, 0.8, 0.89, 0.96, 1, 1, 1, 1, 1],
    abords: [0, 0, 0.12, 0.5, 0.8, 1, 1, 1, 1, 1],
    // LES ARBRES SORTENT DE TERRE PENDANT L'ANALYSE, et là seulement : c'est le
    // seul moment du parcours où l'écran ne demande rien et où l'on attend. Un
    // arbre qui pousse est ce qu'on remarque du coin de l'œil en lisant une
    // barre de progression — trois sujets, échelonnés (voir `villa.js`).
    //
    // La pousse démarre à peine au premier temps de l'analyse et se joue
    // surtout aux deux suivants : le plan de l'entrée est serré sur la porte,
    // et un arbre qui grandirait là se jouerait hors du cadre.
    pousse: [0, 0, 0, 0.14, 0.58, 1, 1, 1, 1, 1],
  },
  /**
   * L'IMMEUBLE EST ACHEVÉ DÈS L'ÉCRAN DE LA SURFACE, ET IL N'Y MET PAS DE TEMPS.
   *
   * Il se bâtissait comme la maison : les dalles montaient, l'entrée arrivait,
   * les baies se perçaient, le couronnement se posait — quatre gestes étalés du
   * stade 2 au stade 5. C'était juste pour une maison qu'on regarde se
   * construire, et faux ici, pour une raison de parcours : L'IMMEUBLE N'EST
   * MONTÉ QU'AU MOMENT OÙ LE TYPE EST CONNU, c'est-à-dire au clic sur la carte,
   * c'est-à-dire au stade 2 lui-même. Le vendeur ouvrait donc la fenêtre de
   * surface sur un bâtiment à moitié bâti, et passait les premières secondes de
   * son réglage à le regarder finir de paraître.
   *
   * Tout est donc à 1 dès le stade 2, et le décor pose ces valeurs D'UN BLOC
   * quand l'architecture change (voir `aussitot` dans `appliquerEtat`) : quand
   * l'écran de la surface arrive, l'immeuble est entier, et rien n'est en train
   * de s'y terminer.
   */
  immeuble: {
    //             0     1  2  3  4  5  6  7  8  9
    montage: [0.22, 0.58, 1, 1, 1, 1, 1, 1, 1, 1],
    entree: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
    menuiserie: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
    couronnement: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
    abords: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
  },
}

/**
 * L'ACCUSÉ DE RÉCEPTION DE L'AFFINAGE — ce qui s'illumine, et pendant combien
 * de temps.
 *
 * Le vendeur coche une case ou pousse un curseur, l'ouvrage se dessine, et
 * c'est tout : rien ne lui dit que sa déclaration a été PRISE. Pour une piscine
 * qui se creuse, l'ouvrage suffit ; pour un standing qui change une teinte de
 * béton, pour un rooftop qui s'étend d'un demi-mètre, le geste est si
 * progressif qu'on n'est plus sûr d'avoir agi.
 *
 * Dès que l'animation d'une option est FINIE — pas au clic : à l'arrivée —,
 * l'ouvrage concerné s'illumine deux secondes, puis s'éteint. C'est le seul
 * moment du décor où quelque chose s'adresse au vendeur plutôt qu'au bien.
 *
 *   `DUREE_ACCUSE`   les deux secondes, en entier, montée et descente comprises.
 *   `MONTEE`         le temps que met la lumière à venir. Court : un accusé de
 *                    réception qui met une seconde à paraître arrive après que
 *                    le regard est reparti.
 *   `DESCENTE`       le temps qu'elle met à s'en aller. Long, à l'inverse :
 *                    c'est une extinction, pas une coupure.
 *   `SEUIL_FINI`     l'écart en deçà duquel une valeur est considérée comme
 *                    arrivée. Le lissage est exponentiel — il n'atteint jamais
 *                    exactement sa cible —, et il faut donc un seuil.
 *   `SEUIL_ENGAGE`   l'écart au-delà duquel on considère qu'une animation a
 *                    VRAIMENT eu lieu. Sans lui, le moindre frémissement de
 *                    valeur déclencherait un accusé de réception.
 */
const DUREE_ACCUSE = 2
const MONTEE_ACCUSE = 0.18
const DESCENTE_ACCUSE = 0.7
const SEUIL_FINI = 0.012
const SEUIL_ENGAGE = 0.05

/** Les options qui méritent un accusé de réception, et leur intensité. */
const ACCUSES = {
  piscine: 0.75,
  terrain: 0.55,
  panneaux: 0.85,
  terrasse: 0.7,
  balcon: 0.85,
  rezDeJardin: 0.6,
  rooftop: 0.7,
  // Le standing illumine le bâtiment entier : à pleine intensité, il le
  // délaverait. Un tiers suffit à ce qu'on voie que quelque chose a été pris.
  standing: 0.3,
}

const lire = (table, cle, stade, defaut = 0) => table[cle]?.[stade] ?? defaut

/** Architecture attendue pour le type reçu, et pour ce qu'on en sait encore. */
function familleArchitecture(type) {
  if (type === 'appartement') return 'immeuble'
  if (type === 'maison' || type === 'autre' || type === 'local') return 'villa'
  // `terrain`, et le tout début de parcours, où rien n'est encore repéré : le
  // chantier commence — et reste — à l'ossature.
  return 'ossature'
}

const lisser = (a, b, t) => a + (b - a) * t
const borne = (v, min, max) => Math.max(min, Math.min(max, v))
/** Accélération douce au départ comme à l'arrivée. */
const adouci = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2)

/* -------------------------------------------------------------------------- */
/*  La scène                                                                  */
/* -------------------------------------------------------------------------- */

function creerScene(canvas, { mouvementReduit }) {
  // Gestion des couleurs désactivée, à dessein : depuis r152, three convertit
  // les couleurs hexadécimales vers l'espace linéaire avant de les éclairer, ce
  // que r128 — où la lumière de la maquette a été réglée — ne faisait pas.
  // Rétablir la conversion donnerait une scène juste mais plus sourde.
  THREE.ColorManagement.enabled = false

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  /**
   * LES OMBRES, ET LE RÉGLAGE QUI NE SERVAIT À RIEN.
   *
   * La scène demandait `PCFSoftShadowMap` pour des bords adoucis. Ce mode a
   * été RETIRÉ de three : le moteur repliait silencieusement la demande sur le
   * filtrage ordinaire (un avertissement dans la console, et des ombres dures)
   * — si bien que le décor n'a jamais eu les ombres douces pour lesquelles il
   * était écrit.
   *
   * Le filtrage ordinaire, lui, a changé entre-temps : il échantillonne
   * désormais la carte d'ombre sur un DISQUE DE VOGEL de cinq points, tournés
   * par un bruit par pixel, et l'étendue de ce disque se règle — c'est
   * `shadow.radius`. C'est donc là que se trouve maintenant l'adoucissement, et
   * la douceur qu'on cherchait est à un réglage près, pas à un mode près.
   */
  renderer.shadowMap.type = THREE.PCFShadowMap
  // Le plan de coupe du chantier a besoin du détourage local.
  renderer.localClippingEnabled = true

  /**
   * LE FILTRAGE ANISOTROPE, RELEVÉ SUR LA MACHINE ET NON DEVINÉ.
   *
   * C'est le réglage qui coûte le moins cher et qui se voit le plus : sans lui,
   * une surface vue en biais — le trottoir, la chaussée, le platelage d'un
   * rooftop, le sol qui fuit vers l'horizon — se délave en une bouillie grise
   * dès que l'angle se ferme. La valeur retenue est bornée à huit : au-delà, le
   * gain est invisible et l'échantillonnage devient mesurable sur les machines
   * modestes.
   */
  M.reglerAnisotropie(Math.min(8, renderer.capabilities.getMaxAnisotropy()))

  const scene = new THREE.Scene()
  scene.background = M.textureFondBlanc()
  /**
   * LE BROUILLARD BLANC — ce qui fait du sol un espace sans fin.
   *
   * Il servait, sous le ciel bleu, à éviter que le disque de sol ne finisse sur
   * une arête franche à l'horizon. Il fait désormais davantage : c'est lui qui
   * SOUDE le sol au fond de scène. Réglé sur le blanc du fond, il efface le
   * bord du disque bien avant qu'on y arrive, et le sol paraît continuer
   * indéfiniment — l'îlot se tient au milieu d'un vide, et non sur une table.
   *
   * Il mord plus tôt qu'avant (70 au lieu de 90) : le décor n'a plus de lointain
   * à montrer, et plus rien ne se perd à l'effacer plus près. Il commence
   * toujours bien au-delà du bien — un immeuble se cadre à quarante unités, et
   * un brouillard qui mordrait dessus le délaverait au lieu de l'éloigner.
   */
  scene.fog = new THREE.Fog(0xf8f8f7, 70, 185)

  const camera = new THREE.PerspectiveCamera(42, 1, 0.08, 400)
  scene.add(camera)

  // L'INTENSITÉ DES LUMIÈRES, et pourquoi elle est basse.
  //
  // La gestion des couleurs est coupée (voir plus haut) : les matières ne sont
  // pas converties en linéaire avant d'être éclairées, et l'image n'est pas
  // reconvertie en sortie. Une scène réglée aux valeurs physiques habituelles y
  // brûle donc entièrement — tout ce qui est clair devient blanc, et la pierre,
  // l'enduit et le zinc cessent de se distinguer les uns des autres. Ces
  // valeurs-là sont celles où la façade garde ses nuances et où les ombres
  // portées se lisent encore.
  //
  // TOUT A BAISSÉ D'UN CRAN AVEC LE FOND BLANC, et il le fallait. Le sol est
  // désormais blanc et horizontal : aux anciennes valeurs, il recevait à lui
  // seul plus de lumière qu'il n'en peut rendre, brûlait entièrement, et son
  // grain — la seule chose qui l'empêche d'être un calque vide — disparaissait
  // avec. Le rebond du sol, lui aussi, a changé de couleur : ce n'est plus une
  // terre brune qui renvoie sa chaleur sous les avant-toits, c'est un blanc
  // neutre.
  const ciel = new THREE.HemisphereLight(0xffffff, 0xeceded, 0.34 * FACTEUR_LUMIERE)
  scene.add(ciel)

  const soleil = new THREE.DirectionalLight(0xfff7ec, 0.72 * FACTEUR_LUMIERE)
  soleil.position.set(26, 42, 22)
  soleil.castShadow = true
  soleil.shadow.mapSize.set(2048, 2048)
  // LE CADRE D'OMBRE A ÉTÉ RESSERRÉ DE MOITIÉ. Il couvrait quatre-vingt-huit
  // unités de large pour un bien qui en fait douze : la carte d'ombre y
  // dépensait les trois quarts de sa définition sur de la pelouse vide, et
  // l'ombre d'une baie n'y tenait pas dans un texel. Resserré sur l'emprise
  // réelle du bien et de ses abords, le même budget rend une ombre deux fois
  // plus fine.
  soleil.shadow.camera.left = -26
  soleil.shadow.camera.right = 26
  soleil.shadow.camera.top = 34
  soleil.shadow.camera.bottom = -22
  soleil.shadow.camera.near = 1
  soleil.shadow.camera.far = 110
  soleil.shadow.bias = -0.0009
  soleil.shadow.normalBias = 0.022
  /**
   * L'ÉTENDUE DU FLOU, en texels de la carte d'ombre.
   *
   * Une ombre parfaitement nette n'existe pas dehors : le soleil a un demi-
   * degré de diamètre apparent, et toute ombre portée s'élargit d'un centimètre
   * par mètre de distance à ce qui la porte. À 1 — la valeur par défaut —, les
   * ombres du décor étaient tranchées au rasoir, ce qui est exactement ce à
   * quoi l'œil reconnaît une image calculée.
   *
   * Trois et demi, sur une carte de 2048 resserrée sur l'emprise du bien,
   * donnent une pénombre de quelques centimètres : assez pour que le bord soit
   * doux, jamais assez pour qu'une ombre de garde-corps se dissolve.
   */
  soleil.shadow.radius = 3.5
  scene.add(soleil)

  /**
   * LA LUMIÈRE DE RETOUR — le rebond du sol sur les faces à l'ombre.
   *
   * Sans elle, tout ce que le soleil ne touche pas retombe sur la seule
   * hémisphérique, et les pignons nord de la maison comme les retours de
   * l'immeuble s'y aplatissent en un gris uniforme. Une seconde directionnelle,
   * très faible, tiède et venue d'en bas à l'opposé du soleil, leur rend le
   * modelé — c'est le rôle du réflecteur qu'on pose au sol en prise de vue.
   * Elle ne porte pas d'ombre : une lumière de rebond n'en porte pas.
   */
  const retour = new THREE.DirectionalLight(0xeef0f4, 0.17 * FACTEUR_LUMIERE)
  retour.position.set(-30, 9, -20)
  scene.add(retour)

  /**
   * LE SOL DU VIDE. Un disque blanc, et rien d'autre : ni pré, ni chaussée.
   *
   * Il est POSÉ PLUS BAS QUE LE BIEN, d'une demi-unité et quelques — c'est ce
   * décalage qui creuse le vide autour de l'îlot (voir plus bas). Le bâtiment,
   * lui, continue de se construire à l'altitude zéro : rien de ce qui le
   * compose n'a bougé, c'est le sol qui est descendu.
   */
  const sol = new THREE.Mesh(
    new THREE.CircleGeometry(120, 56),
    new THREE.MeshStandardMaterial({ map: M.textureSolBlanc(), color: 0xffffff, roughness: 0.96 }),
  )
  sol.rotation.x = -Math.PI / 2
  sol.position.y = -CREUX
  sol.receiveShadow = true
  scene.add(sol)

  /* -------------------------------- l'îlot ---------------------------------- */

  /**
   * TROIS PIÈCES, ET CHACUNE DIT UNE CHOSE.
   *
   *   `plateau`  le dessus, à l'altitude zéro : c'est le terrain du bien, et
   *              tout ce que l'ouvrage pose au sol se pose dessus.
   *   `flanc`    la tranche, un peu plus sourde que le dessus — c'est elle
   *              qu'on voit quand le drone descend, et c'est son épaisseur qui
   *              fait la différence entre un disque peint et un socle.
   *   `liseré`   le trait noir du bord. Le seul noir franc de tout le décor, et
   *              la seule ligne : c'est lui qui découpe l'îlot sur le blanc.
   *
   * L'ombre de contact, elle, n'est pas ici : elle est peinte sur le sol, en
   * dessous (voir `creux`).
   */
  const ilot = new THREE.Group()
  scene.add(ilot)

  const plateau = new THREE.Mesh(
    new THREE.CircleGeometry(1, 96),
    new THREE.MeshStandardMaterial({ map: M.textureSocle(), color: 0xffffff, roughness: 0.94 }),
  )
  plateau.rotation.x = -Math.PI / 2
  plateau.receiveShadow = true
  ilot.add(plateau)

  const flanc = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, EPAISSEUR_SOCLE, 96, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xe9e7e3, roughness: 0.9, side: THREE.DoubleSide }),
  )
  flanc.position.y = -EPAISSEUR_SOCLE / 2
  flanc.castShadow = true
  ilot.add(flanc)

  const lisere = new THREE.Mesh(
    new THREE.RingGeometry(1 - LISERE, 1, 96),
    new THREE.MeshBasicMaterial({ color: 0x14161b, side: THREE.DoubleSide }),
  )
  lisere.rotation.x = -Math.PI / 2
  // Posé à un millimètre au-dessus du plateau : au même niveau, les deux
  // surfaces se disputeraient le même pixel et le trait clignoterait.
  lisere.position.y = 0.004
  ilot.add(lisere)

  /**
   * L'OMBRE DE CONTACT, peinte sur le sol du dessous.
   *
   * Le soleil n'éclaire l'îlot que d'un côté : de l'autre, socle et sol se
   * touchent à l'écran sans que rien ne dise qu'il y a un vide entre eux. Cet
   * anneau sombre ceinture l'îlot et s'éteint en quelques mètres — c'est lui
   * qui creuse le trou, et c'est de l'occultation ambiante peinte, non une
   * ombre calculée (voir `textureCreux`).
   */
  const creux = new THREE.Mesh(
    new THREE.CircleGeometry(1, 96),
    new THREE.MeshBasicMaterial({
      map: M.textureCreux(),
      transparent: true,
      // Il ne s'écrit pas dans le tampon de profondeur : c'est une ombre posée
      // sur le sol, elle ne doit rien cacher de ce qui passe au-dessus.
      depthWrite: false,
    }),
  )
  creux.rotation.x = -Math.PI / 2
  creux.position.y = -CREUX + 0.012
  scene.add(creux)

  /** Rayon courant de l'îlot — lissé, sauf au montage d'un nouvel ouvrage. */
  let rayonIlot = RAYON_SOL_DEFAUT

  /**
   * Règle l'îlot sur l'emprise au sol demandée.
   *
   * `aussitot` pose la valeur d'un bloc, sans transition : c'est ce qu'il faut
   * au montage d'une architecture, où l'îlot doit être à sa taille avant la
   * première image. Le reste du temps, il rejoint sa cible en glissant — la
   * surface de terrain se règle au curseur, et un socle qui sauterait d'un
   * rayon à l'autre s'y verrait plus que la pelouse qu'il porte.
   */
  function poserSocle(rayon, aussitot = false) {
    rayonIlot = aussitot ? rayon : rayonIlot + (rayon - rayonIlot) * 0.06
    ilot.scale.set(rayonIlot, 1, rayonIlot)
    // Le disque de l'ombre est peint transparent jusqu'à 54 % de son rayon et
    // s'assombrit au-delà : à ce facteur, l'anneau tombe pile au bord de l'îlot.
    const etendue = rayonIlot / 0.56
    creux.scale.set(etendue, etendue, 1)
  }

  poserSocle(RAYON_SOL_DEFAUT, true)

  /**
   * L'ENVIRONNEMENT — et c'est le réglage qui change le plus le rendu de tout
   * le décor.
   *
   * Il était le FOND DE SCÈNE lui-même : un blanc à peine dégradé, replié sur
   * les six faces d'un cube. Un environnement uniforme n'a pas de direction —
   * une baie vitrée y renvoie le même gris en haut et en bas, un garde-corps de
   * verre le même voile sur toute sa hauteur, une couvertine de zinc la même
   * clarté d'un bout à l'autre. C'est ce qui donnait à TOUTES les surfaces
   * réfléchissantes du décor l'aspect du plastique peint, et aucune quantité de
   * lumière directe n'y changeait rien : ce qui manquait n'était pas de la
   * lumière, c'était un dehors.
   *
   * C'est désormais un vrai ciel — dégradé, avec sa ligne d'horizon franche,
   * son sol sourd et deux sources douces (voir `creerScenetteEnvironnement`).
   * Le verre prend le ciel en haut et le sol en bas, le métal attrape un point
   * brillant quand la caméra dérive, et le nez des dalles de béton reçoit la
   * ligne d'horizon. La scénette est rendue UNE FOIS, à l'ouverture, puis
   * jetée : le coût est celui d'une image, pas d'une par seconde.
   *
   * Son intensité reste basse, et il le faut : la gestion des couleurs est
   * coupée (voir plus haut), si bien qu'un éclairage d'environnement à pleine
   * puissance s'ajouterait tel quel aux lumières déjà réglées et délaverait la
   * scène entière. À un tiers, il ne se voit que là où il doit se voir — dans
   * les reflets —, et c'est `envMapIntensity`, matière par matière, qui dit
   * lesquelles en prennent davantage (voir `matieres.js`).
   */
  const fabriqueEnv = new THREE.PMREMGenerator(renderer)
  const scenette = M.creerScenetteEnvironnement()
  const environnement = fabriqueEnv.fromScene(scenette, 0.04).texture
  scene.environment = environnement
  scene.environmentIntensity = 0.3
  fabriqueEnv.dispose()
  M.viderGroupe(scenette)

  /* ------------------------------ les oiseaux -------------------------------- */

  const voliere = creerVoliere()
  scene.add(voliere.groupe)

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: M.textureHalo(),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  halo.visible = false
  scene.add(halo)

  const cercleOr = new THREE.Mesh(
    new THREE.RingGeometry(1, 1.1, 80),
    new THREE.MeshBasicMaterial({ color: 0xb98b44, transparent: true, opacity: 0, side: THREE.DoubleSide }),
  )
  cercleOr.rotation.x = -Math.PI / 2
  cercleOr.position.y = 0.03
  cercleOr.visible = false
  scene.add(cercleOr)

  /* ------------------------------ plan de coupe ------------------------------ */

  /** Ce qui n'est pas encore bâti est simplement au-dessus du plan. */
  const coupe = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)

  function appliquerCoupe(groupe) {
    groupe.traverse((objet) => {
      if (!objet.isMesh) return
      const liste = Array.isArray(objet.material) ? objet.material : [objet.material]
      liste.forEach((matiere) => {
        if (!matiere) return
        matiere.clippingPlanes = [coupe]
        matiere.clipShadows = true
      })
    })
  }

  /* ------------------------------- état ------------------------------------- */

  const etat = {
    stade: 0,
    type: null,
    surface: 100,
    etage: null,
    options: {},
  }

  const val = {
    montage: 0,
    abords: 0,
    entree: 0,
    menuiserie: 0,
    couronnement: 0,
    lumiere: 0,
    halo: 0,
    pousse: 0,
    piscine: 0,
    terrain: 0,
    panneaux: 0,
    terrasse: 0,
    balcon: 0,
    // Appartements : le jardin privatif au pied de l'immeuble, et le rooftop
    // qui prend la place du comble.
    rezDeJardin: 0,
    rooftop: 0,
    standing: 0,
    // Les fenêtres de l'étage déclaré, sur la façade de l'immeuble.
    etageAllume: 0,
  }
  const cible = { ...val }

  /**
   * OÙ EN EST CHAQUE ACCUSÉ DE RÉCEPTION.
   *
   *   `engage`   une animation est en cours sur cette option : sa valeur s'est
   *              franchement écartée de sa cible et n'y est pas encore revenue.
   *   `restant`  le temps qu'il reste à l'illumination, en secondes. Nul le
   *              reste du temps.
   */
  const accuses = Object.fromEntries(
    Object.keys(ACCUSES).map((cle) => [cle, { engage: false, restant: 0, muet: true }]),
  )

  /**
   * FAIT TAIRE LES ACCUSÉS DE RÉCEPTION jusqu'à ce que tout se soit reposé.
   *
   * Un accusé de réception salue une DÉCLARATION du vendeur. Or les mêmes
   * valeurs bougent aussi quand personne n'a rien déclaré : à l'arrivée sur
   * l'écran d'affinage, les options passent d'un bloc de « rien » à ce qui a
   * été retenu — le standing saute de 0 à son rang, le terrain à la contenance
   * cadastrale — et la maison entière s'illuminait en guise de bonjour. Elle
   * saluait le fait d'avoir changé d'écran, ce qui ne veut rien dire.
   *
   * Chaque option est donc muette après un changement de stade, et le reste
   * jusqu'à ce que sa valeur soit arrivée une première fois. La première
   * animation est avalée ; les suivantes — celles que le vendeur provoque —
   * sont saluées normalement.
   */
  const taireAccuses = () => {
    Object.values(accuses).forEach((suivi) => {
      suivi.muet = true
      suivi.restant = 0
    })
  }

  /* ------------------------- le bâtiment courant ---------------------------- */

  const batiment = new THREE.Group()
  scene.add(batiment)

  let ouvrage = null
  let familleMontee = null
  let palierMonte = -1
  /** Dernier stade appliqué — il sert à faire taire les accusés de réception. */
  let stadePrecedent = -1
  /**
   * Les fonctions qui illuminent un ouvrage d'affinage, relevées sur l'ouvrage
   * courant. Elles sont REFAITES À CHAQUE MONTAGE : elles retiennent des
   * matières, et celles d'une maison démontée n'existent plus.
   */
  let illuminations = {}

  /**
   * LA MUE — la maison se démonte, et une autre se rebâtit à sa place.
   *
   * Franchir un palier de surface, c'est changer de maison (voir `villa.js`) : un
   * étage apparaît, une aile se greffe. Échanger les deux d'une image à l'autre
   * ne montrerait rien — le vendeur verrait un saut, pas une transformation. La
   * maison se DÉMONTE donc planche par planche, et la suivante se rassemble à sa
   * place (voir `disloquant` dans `kit.js`).
   *
   *   `phase`      'demontage' pendant que l'ancienne s'en va, 'remontage'
   *                pendant que la neuve se rassemble, nul le reste du temps.
   *   `vise`       le palier vers lequel on va. Il se met à jour en cours de
   *                route : le curseur peut franchir deux paliers pendant qu'une
   *                mue se joue, et c'est le dernier demandé qui se bâtira.
   *   `ecart`      où en est la dislocation, de 0 (assemblé) à 1 (dispersé).
   *                Conservé pour qu'un changement d'avis en pleine
   *                reconstruction reparte de l'état visible, et non de zéro.
   */
  const mue = { phase: null, t: 0, vise: -1, ecart: 0 }

  /**
   * Le temps que met une maison à se défaire, puis à se refaire.
   *
   * RAMENÉ DE 2,45 s À 1,4 s POUR LA MUE ENTIÈRE, puis à 1,24 s — un dixième
   * de seconde de mieux, et pas davantage : au-delà, les planches cessent de se
   * poser et se mettent à apparaître. Le geste est le même — la
   * maison se démonte planche par planche et la suivante se rassemble —, mais
   * il se joue à la vitesse d'un montage et non d'une démonstration : le
   * vendeur traverse volontiers trois paliers d'affilée au curseur, et chaque
   * mue qui traîne le laisse devant une maison en morceaux.
   */
  const DUREE_DEMONTAGE = 0.44
  const DUREE_REMONTAGE = 0.8


  function demonterOuvrage() {
    if (!ouvrage) return
    batiment.remove(ouvrage.groupe)
    M.viderGroupe(ouvrage.groupe)
    ouvrage = null
    illuminations = {}
  }

  function monterOuvrage(famille, palier) {
    demonterOuvrage()
    if (famille === 'villa') ouvrage = creerVilla(palier)
    else if (famille === 'immeuble') ouvrage = creerImmeuble()
    else ouvrage = creerOssature()

    appliquerCoupe(ouvrage.montant)
    batiment.add(ouvrage.groupe)
    familleMontee = famille
    palierMonte = palier

    // Les ouvrages d'affinage que cette architecture sait montrer, et par quel
    // nom le parcours les déclare. Une ossature n'en a aucun ; c'est normal,
    // aucune option ne lui est proposée.
    illuminations = {}
    Object.entries(ouvrage?.ouvrages ?? {}).forEach(([cle, groupeOuvrage]) => {
      if (ACCUSES[cle] !== undefined && groupeOuvrage) {
        illuminations[cle] = M.illuminant(groupeOuvrage)
      }
    })
    // L'îlot se règle sur ce qui vient d'être monté, sans attendre la première
    // image : une maison de trois cents mètres carrés et une ossature n'ont pas
    // la même emprise, et un socle qui rejoindrait la sienne en glissant se
    // verrait grandir au changement d'architecture.
    poserSocle(ouvrage?.rayonSol ?? RAYON_SOL_DEFAUT, true)
  }

  /** Engage — ou réoriente — la mue vers le palier demandé. */
  function engagerMue(palier) {
    mue.vise = palier
    // Déjà en train de se démonter : le palier visé vient d'être remis à jour,
    // et c'est celui-là qui se rebâtira. Rien à relancer.
    if (mue.phase === 'demontage') return
    // En pleine reconstruction, on repart de ce qui est à l'écran : la maison
    // neuve est à demi assemblée, elle se défait de là plutôt que de sauter
    // d'abord à son état fini.
    mue.phase = 'demontage'
    mue.t = mue.ecart * DUREE_DEMONTAGE
  }

  /** Avance la mue d'une image. */
  function avancerMue(dt) {
    mue.t += dt

    if (mue.phase === 'demontage') {
      const t = borne(mue.t / DUREE_DEMONTAGE, 0, 1)
      mue.ecart = t
      ouvrage?.disloquer?.(t)
      if (t < 1) return

      monterOuvrage('villa', mue.vise)
      // La maison neuve arrive DISPERSÉE : c'est de cet état-là qu'elle se
      // rassemble, et c'est ce qui fait qu'on voit un montage et non un fondu.
      ouvrage?.disloquer?.(1)
      // ET ELLE REPART DU SOL. Le plan de coupe redescend à zéro : les murs
      // montent pendant que les pièces se rassemblent, et les deux gestes disent
      // la même chose. Sans cela, la maison neuve paraîtrait d'un coup à sa
      // hauteur du moment et seules les planches bougeraient.
      val.montage = 0
      mue.phase = 'remontage'
      mue.t = 0
      // L'envergure a changé avec le palier : le cadre doit suivre, sinon la
      // propriété déborde du champ où tenait le plain-pied.
      cadrer()
      return
    }

    const t = borne(mue.t / DUREE_REMONTAGE, 0, 1)
    mue.ecart = 1 - t
    ouvrage?.disloquer?.(mue.ecart)
    if (t >= 1) {
      mue.phase = null
      mue.ecart = 0
    }
  }

  /**
   * Le décor intérieur n'est monté qu'une fois, et seulement si un appartement
   * est repéré : c'est la pièce la plus lourde de la scène — un escalier de
   * cent vingt marches et un appartement meublé — et une maison n'en a que
   * faire.
   */
  monterOuvrage('ossature', -1)

  /* ------------------------------- caméra ----------------------------------- */

  const drone = { rayon: 30, hauteur: 12, angle: FACE }
  const droneCible = { rayon: 30, hauteur: 12 }
  /**
   * LE PIVOT. Le centre du bien, toujours — sauf quand le balcon ou la terrasse
   * d'affinage appellent la caméra à eux (voir `cadrer`). Il se REJOINT plutôt
   * qu'il ne se saute : posé d'une image à l'autre, ce serait la caméra qui se
   * téléporterait.
   */
  const pivot = new THREE.Vector3()
  const pivotVise = new THREE.Vector3()
  const vise = new THREE.Vector3()
  const cibleLissee = new THREE.Vector3(0, 2, 0)

  /**
   * LE PLAN COURANT, RÉSOLU POUR L'ARCHITECTURE EN COURS.
   *
   * Un plan peut porter des valeurs de remplacement pour l'appartement (voir
   * `reglageDuPlan` dans `plans.js`). La résolution rend un objet neuf : elle
   * se fait donc au CHANGEMENT DE STADE, dans `cadrer`, et non image par image.
   */
  let planCourant = reglageDuPlan(PLANS[0], null)

  /**
   * LE DÉCENTREMENT DU CADRE — comment on range un bien dans un coin de l'image
   * sans déplacer la caméra.
   *
   * On ne bouge pas l'appareil : on déplace le POINT VISÉ, dans le repère de
   * l'appareil lui-même. Viser à droite pousse le sujet à gauche ; viser en
   * haut le pousse en bas. Le drone reste exactement où il est, et c'est le
   * cadre qui se recompose — la nuance compte, parce qu'un décentrement obtenu
   * en déplaçant la caméra changerait aussi la perspective du bâtiment.
   *
   * Les deux axes sont donnés en fractions de la DISTANCE de prise de vue :
   * c'est la seule unité qui garde le même cadrage qu'on filme une villa de
   * quinze unités ou un immeuble de quarante.
   */
  const axeDroite = new THREE.Vector3()
  const axeHaut = new THREE.Vector3()
  const avant = new THREE.Vector3()
  const HAUT_MONDE = new THREE.Vector3(0, 1, 0)
  const regard = new THREE.Vector3()

  function viserDecale(cible) {
    regard.copy(cible)
    const decalage = planCourant.decalage
    if (!decalage) return regard

    avant.subVectors(cible, camera.position)
    const distance = avant.length()
    if (distance < 1e-3) return regard
    avant.divideScalar(distance)

    axeDroite.crossVectors(avant, HAUT_MONDE)
    if (axeDroite.lengthSq() < 1e-6) return regard
    axeDroite.normalize()
    axeHaut.crossVectors(axeDroite, avant).normalize()

    regard.addScaledVector(axeDroite, (decalage.x ?? 0) * distance)
    regard.addScaledVector(axeHaut, (decalage.y ?? 0) * distance)
    return regard
  }

  /**
   * LE BALANCEMENT — le seul mouvement latéral qui reste, et il est minuscule.
   *
   * La caméra allait et venait dans toute la fenêtre de la façade, d'un
   * trois-quarts à l'autre : un quart de radian d'amplitude, sur une période de
   * trente secondes. C'était le geste d'un appareil qui cherche son cadre, et
   * c'était encore un geste d'appareil.
   *
   * Il en reste UN CENTIÈME DE TOUR — deux degrés d'un bord à l'autre, sur une
   * minute et demie. À cette amplitude, on ne voit pas la caméra bouger ; on
   * voit seulement que l'image n'est pas une photographie.
   */
  const AMPLITUDE_BALANCEMENT = 0.018
  const azimutVise = () =>
    azimutDuPlan(planCourant, mouvementReduit ? 0 : secondes) +
    (mouvementReduit ? 0 : Math.sin(secondes * 0.068) * AMPLITUDE_BALANCEMENT)

  function cadrer() {
    planCourant = reglageDuPlan(PLANS[borne(etat.stade, 0, DERNIER_PLAN)], familleMontee)
    const p = planCourant
    const envergure = ouvrage?.envergure ?? { largeur: 6, hauteur: 4 }

    const ouvertureV = (camera.fov * Math.PI) / 180
    const ouvertureH = 2 * Math.atan(Math.tan(ouvertureV / 2) * camera.aspect)

    // Le bâtiment doit tenir dans les deux sens : on retient la distance la
    // plus contraignante. La demi-largeur est ajoutée au résultat — ce calcul
    // cadre un objet plat, or celui-ci a de l'épaisseur, et c'est sa face la
    // plus proche qui remplit le cadre.
    //
    // Le cadre est celui du canevas tout entier, d'un bord à l'autre : la scène
    // a sa zone, le panneau n'y entre pas, et il n'y a plus ni bande réservée ni
    // décentrement à compenser.
    const surLargeur = envergure.largeur / 2 / Math.tan(ouvertureH / 2)
    const surHauteur = envergure.hauteur / 2 / Math.tan(ouvertureV / 2)

    let distance =
      (envergure.largeur / 2 + Math.max(surLargeur, surHauteur) * MARGE_CADRAGE) * p.recul
    let ancrePivot = new THREE.Vector3(0, 0, 0)
    let ancreCible = cibleDuPlan(p, ouvrage?.ancrages?.hauteur ?? envergure.hauteur)

    /**
     * LE BALCON SE FILME DE PRÈS.
     *
     * C'est le seul ouvrage de l'affinage qui se construise à mi-hauteur d'une
     * façade, et le plan d'ensemble de l'affinage — composé pour tenir une
     * maison, son jardin et sa piscine — le réduisait à une saillie de quelques
     * pixels. Quand il est déclaré, la caméra quitte donc le plan large : elle
     * descend à sa hauteur, se rapproche, et c'est le balcon — et non plus le
     * centre du bâtiment — qu'elle vise.
     *
     * C'est le seul déplacement de caméra qui reste dans tout le parcours, et
     * il se justifie par l'inverse d'un mouvement de drone : sans lui, le
     * vendeur coche une case et ne voit rien changer.
     *
     * La terrasse d'une maison a droit au même traitement, pour la même
     * raison — c'est le même bouton, et c'est le même ouvrage vu d'une autre
     * architecture.
     *
     * Un peu moins de six dixièmes de la distance : c'est le rapprochement le
     * plus franc qu'on puisse se permettre. En deçà, le bâtiment déborde du
     * cadre — on aurait gagné sur le balcon ce qu'on aurait perdu sur tout le
     * reste.
     */
    /**
     * SAUF QUAND LE TOIT EST AMÉNAGÉ, et c'est la seule exception.
     *
     * Un rooftop déclaré demande l'inverse du plan rapproché : il se construit
     * au SOMMET du bien, et il faut du champ pour le voir s'étendre. Les deux
     * demandes sont contradictoires, et c'est le toit qui l'emporte — un plan
     * serré sur un balcon du troisième pendant que le vendeur règle la surface
     * de sa terrasse en toiture lui cacherait précisément ce qu'il règle.
     */
    const toitAmenage = borne(cible.rooftop, 0, 1) > 0.01
    const ancreExterieur =
      etat.stade >= DERNIER_PLAN &&
      !toitAmenage &&
      (etat.options?.balcon || etat.options?.terrasse)
        ? ouvrage?.ancrages?.exterieur
        : null

    if (ancreExterieur) {
      distance *= 0.58
      ancrePivot = ancreExterieur.clone()
      ancreCible = ancreExterieur.clone()
    }

    /**
     * LE ROOFTOP GRANDIT, ET LA CAMÉRA RECULE POUR QU'ON LE VOIE GRANDIR.
     *
     * C'est le seul ouvrage de l'affinage qui se construise AU SOMMET du bien,
     * et le cadrage est calculé sur l'envergure de l'immeuble : une terrasse
     * qui s'étend au-delà de l'emprise du toit sortait donc du champ par le
     * haut, et le vendeur voyait son curseur monter sans rien voir arriver.
     *
     * Le recul suit la surface déclarée, et le regard monte avec : c'est le
     * geste d'un opérateur qui prend du champ parce que son sujet a grandi, et
     * non un mouvement de drone — la caméra ne tourne pas, elle s'éloigne.
     */
    const surToit = familleMontee === 'immeuble' && toitAmenage ? borne(cible.rooftop, 0, 1) : 0
    if (surToit > 0.01) {
      distance *= 1 + 0.3 * surToit
      ancreCible.y += (ouvrage?.ancrages?.hauteur ?? envergure.hauteur) * 0.08 * surToit
    }

    droneCible.rayon = distance
    // ET LE DRONE MONTE UN PEU AVEC LE TOIT. Reculer suffit à faire tenir la
    // terrasse dans le cadre, pas à la faire VOIR : à vingt-trois degrés de
    // plongée, le platelage du dernier niveau se réduit à un trait. Un quart
    // de hauteur de vol en plus, et l'on voit la terrasse s'étendre, ce qui
    // est tout l'objet du curseur.
    droneCible.hauteur = Math.max(
      0.9,
      distance * (ancreExterieur ? 0.16 : p.elevation) * (1 + 0.28 * surToit),
    )

    pivotVise.copy(ancrePivot)
    vise.copy(ancreCible)

    if (mouvementReduit) pivot.copy(pivotVise)
  }

  /* -------------------------- le drone, et lui seul ------------------------- */

  /**
   * IL N'Y A PLUS DE VISITE INTÉRIEURE.
   *
   * Le drone entrait par la porte cochère, traversait le hall, montait le puits
   * de l'escalier un tour par étage déclaré et parcourait l'appartement pièce
   * par pièce. La séquence était juste, et elle coûtait une demi-minute pendant
   * laquelle on ne voyait plus le bien qu'on estimait — seulement un intérieur
   * qui n'était celui de personne. Elle a été retirée en entier, avec le décor
   * qu'elle demandait (`scene/interieur.js`), le voile de bascule et toute la
   * machinerie de trajectoires qui n'existait que pour elle.
   *
   * Ce qui reste est ce que le vendeur voulait voir : l'IMMEUBLE, filmé du
   * dehors comme la maison l'est, avec SON ÉTAGE QUI S'ALLUME dès qu'il le
   * déclare (voir `designerEtage` dans `immeuble.js`). Un geste, pas une visite.
   */

  /**
   * Étage retenu par le décor. Il sert à deux choses, et deux seulement :
   * l'étage qui s'allume sur la façade, et la hauteur à laquelle le balcon
   * d'affinage se pose. Faute de déclaration, le deuxième — l'étage le plus
   * banal d'un immeuble, et celui où le balcon se lit le mieux.
   */
  const niveauDemande = () =>
    Math.max(0, Math.min(ETAGES_IMMEUBLE, Number.isFinite(etat.etage) ? etat.etage : 2))

  /* --------------------------- état → cibles -------------------------------- */

  function appliquerEtat() {
    const stade = borne(etat.stade, 0, DERNIER_PLAN)
    const famille = familleArchitecture(etat.type)
    const palier = famille === 'villa' ? palierVilla(etat.surface) : -1

    /**
     * `aussitot` : l'ouvrage vient d'être monté à un stade où il devrait déjà
     * être achevé. Ses valeurs de chantier sont alors posées D'UN BLOC, sans
     * lissage — sinon le vendeur le regarde finir de paraître au lieu de le
     * regarder (voir `CHANTIER.immeuble`).
     */
    let aussitot = false

    if (famille !== familleMontee) {
      // CHANGEMENT D'ARCHITECTURE — franc, et à dessein. On ne démonte pas une
      // ossature pour en faire un immeuble : ce n'est pas le même bien qu'on
      // regarde, c'est le bien qu'on vient de repérer sur la carte. La mue ne
      // vaut qu'entre deux paliers de la MÊME maison.
      monterOuvrage(famille, palier)
      mue.phase = null
      mue.ecart = 0
      mue.vise = palier
      aussitot = famille === 'immeuble'
    } else if (famille === 'villa' && palier !== palierMonte) {
      // CHANGEMENT DE PALIER — la maison se démonte et se rebâtit.
      if (mouvementReduit) monterOuvrage(famille, palier)
      else engagerMue(palier)
    }

    const table = CHANTIER[famille] ?? CHANTIER.ossature
    cible.montage = lire(table, 'montage', stade, 1)
    cible.abords = lire(table, 'abords', stade)
    cible.entree = lire(table, 'entree', stade)
    cible.menuiserie = lire(table, 'menuiserie', stade)
    cible.couronnement = lire(table, 'couronnement', stade)
    // Le soir tombe dès l'écran du prix, et n'en repart plus.
    cible.lumiere = stade >= 6 ? 1 : 0
    // Le halo n'arrive qu'à la confirmation, une fois les coordonnées
    // recueillies — c'est le seul stade qui le porte.
    cible.halo = stade === 8 ? 1 : 0

    // Les options d'affinage ne valent qu'au dernier stade : avant, rien n'a
    // été demandé au vendeur, et lui montrer une piscine qu'il n'a pas
    // déclarée reviendrait à lui montrer un bien qui n'est pas le sien.
    const o = stade >= DERNIER_PLAN ? etat.options ?? {} : {}
    cible.piscine = o.piscine ? 1 : 0
    cible.terrain = borne(Number(o.terrain) || 0, 0, 1)
    cible.panneaux = o.panneaux ? 1 : 0
    cible.terrasse = o.terrasse ? 1 : 0
    cible.balcon = o.balcon ? 1 : 0
    // Le rez-de-jardin se déclare au mètre carré comme le rooftop : ce n'est
    // plus un oui ou un non, c'est une surface, et elle se voit (voir
    // `etendreJardin` dans `immeuble.js`).
    cible.rezDeJardin = borne(Number(o.rezDeJardin) || 0, 0, 1)
    cible.rooftop = borne(Number(o.rooftop) || 0, 0, 1)
    cible.standing = borne(Number(o.standing) || 0, 0, 1)

    if (famille === 'immeuble' && ouvrage?.placerBalcon) {
      ouvrage.placerBalcon(niveauDemande())
    }

    /**
     * L'ÉTAGE DU VENDEUR S'ALLUME, et c'est tout ce qui lui arrive.
     *
     * Un appartement ne se voit pas de la rue : on y entrait donc, et la visite
     * coûtait une demi-minute pour montrer un intérieur qui n'était celui de
     * personne. Elle est remplacée par le geste le plus court qui dise la même
     * chose — SES fenêtres, à SON étage, qui s'éclairent sur la façade pendant
     * qu'il règle son curseur. Il se reconnaît dans l'immeuble sans qu'on ait
     * eu à lui en inventer l'intérieur.
     *
     * Ça ne s'allume qu'une fois la façade percée (stade 2 et au-delà) : avant,
     * il n'y a pas encore de fenêtres où mettre de la lumière.
     */
    if (famille === 'immeuble' && ouvrage?.designerEtage) {
      ouvrage.designerEtage(niveauDemande())
    }
    cible.etageAllume =
      famille === 'immeuble' && Number.isFinite(etat.etage) && stade >= 2 ? 1 : 0

    if (aussitot) {
      // Le chantier seulement : les options d'affinage et l'éclairage gardent
      // leur lissage, ils n'ont rien à voir avec le montage du bâtiment.
      ;['montage', 'abords', 'entree', 'menuiserie', 'couronnement'].forEach((cle) => {
        val[cle] = cible[cle]
      })
    }

    // TOUT CHANGEMENT DE STADE FAIT TAIRE LES ACCUSÉS DE RÉCEPTION. C'est le
    // vendeur qu'on salue, pas le parcours : ce qui bouge parce qu'on a changé
    // d'écran ne mérite rien (voir `taireAccuses`).
    if (stade !== stadePrecedent || aussitot) taireAccuses()
    stadePrecedent = stade

    cadrer()

    /**
     * ET LA CAMÉRA SE POSE AVEC LUI.
     *
     * Bâtir l'immeuble d'un bloc ne suffit pas : le drone, lui, rejoint son
     * plan en deux secondes environ, et il vient de l'ossature — deux fois plus
     * petite. Le vendeur voyait donc l'immeuble entier, mais cadré comme une
     * ossature : débordant de tous les côtés, puis rentrant dans le cadre
     * pendant qu'il commençait à régler sa surface. C'est le même défaut, à un
     * étage de plus.
     *
     * Le drone est donc posé à son plan sans transition, comme l'ouvrage. C'est
     * le seul saut de caméra du parcours, et il est invisible : il se joue
     * pendant le changement d'écran, au moment précis où le panneau de la carte
     * s'efface et où celui de la surface n'est pas encore là.
     */
    if (aussitot) {
      drone.rayon = droneCible.rayon
      drone.hauteur = droneCible.hauteur
      drone.angle = azimutVise()
      pivot.copy(pivotVise)
      cibleLissee.copy(vise)
    }
  }

  /* -------------------------------- boucle ---------------------------------- */

  let instantPrecedent = performance.now()
  let secondes = 0
  let image = 0

  function animer() {
    image = requestAnimationFrame(animer)

    const maintenant = performance.now()
    const dt = Math.min((maintenant - instantPrecedent) / 1000, 0.05) * (window.__vitesse || 1)
    instantPrecedent = maintenant
    secondes += dt

    // Deux vitesses de lissage, et c'est volontaire : ce qui doit SE VOIR est
    // ralenti, le reste suit. `montage` est le geste principal de la scène —
    // un bâtiment qui s'élève — et à la vitesse commune il était fini avant
    // qu'on l'ait vu.
    //
    // `pasMontage` est passé de 0,85 à 1,55 : la constante de temps du plan de
    // coupe tombe d'un peu plus d'une seconde à sept dixièmes. Les murs montent
    // toujours à vue — c'est le seul geste de la scène qu'on regarde vraiment —
    // mais ils ont fini de monter avant que le panneau suivant ne revienne.
    const pas = mouvementReduit ? 1 : Math.min(1, dt * 1.9)
    const pasMontage = mouvementReduit ? 1 : Math.min(1, dt * 1.55)

    Object.keys(val).forEach((cle) => {
      val[cle] += (cible[cle] - val[cle]) * (cle === 'montage' ? pasMontage : pas)
    })

    // Le plan de coupe. Une fois le bâtiment achevé, on le renvoie à l'infini :
    // un plan de coupe qui reste actif trie les transparences pour rien.
    //
    // Il s'efface aussi le temps d'un DÉMONTAGE : les planches qui s'écartent
    // passent au-dessus de lui, et un plan de coupe actif les trancherait en
    // plein vol — on les verrait disparaître à mi-hauteur au lieu de s'en aller.
    const hauteurCoupe = ouvrage?.hauteurCoupe ?? 6
    coupe.constant =
      val.montage > 0.995 || mue.phase === 'demontage' ? 1e6 : val.montage * hauteurCoupe

    if (mue.phase) avancerMue(dt)

    ouvrage?.poser?.({ ...val, surface: etat.surface })

    /**
     * LES ACCUSÉS DE RÉCEPTION — deux secondes de lumière sur l'ouvrage qui
     * vient d'arriver.
     *
     * Le déclenchement se lit sur la SEULE chose qui dise honnêtement qu'une
     * animation est finie : l'écart entre la valeur affichée et sa cible. Tant
     * qu'il est franc, l'ouvrage est en train de bouger ; quand il retombe sous
     * le seuil APRÈS avoir été franc, le geste est terminé, et c'est là — et
     * pas au clic — que la lumière s'allume. Un accusé de réception posé au
     * clic arriverait avant l'ouvrage qu'il accuse.
     *
     * Il passe APRÈS `poser` : c'est l'ouvrage entièrement réglé qu'on
     * illumine, et l'émission écrite ici doit être la dernière du tour.
     */
    Object.keys(ACCUSES).forEach((cle) => {
      const suivi = accuses[cle]
      const ecart = Math.abs(cible[cle] - val[cle])

      // Une option déjà au repos au moment où l'écran a changé n'a rien à
      // taire : elle retrouve la parole sans attendre.
      if (suivi.muet && !suivi.engage && ecart < SEUIL_ENGAGE) suivi.muet = false

      if (ecart > SEUIL_ENGAGE) suivi.engage = true
      else if (suivi.engage && ecart < SEUIL_FINI) {
        suivi.engage = false
        if (suivi.muet) {
          // La première arrivée après un changement d'écran : on l'avale, et
          // l'option reprend la parole pour les suivantes.
          suivi.muet = false
        } else {
          // Rien à saluer non plus quand l'ouvrage vient de s'en aller : une
          // piscine qu'on décoche n'a pas à s'illuminer en disparaissant.
          suivi.restant = cible[cle] > 0.02 ? DUREE_ACCUSE : 0
        }
      }

      if (suivi.restant <= 0) {
        illuminations[cle]?.(0)
        return
      }

      suivi.restant = Math.max(0, suivi.restant - dt)
      const ecoule = DUREE_ACCUSE - suivi.restant
      // Montée courte, plateau, extinction longue : c'est le profil d'une
      // lumière qu'on allume et qu'on laisse retomber, et non d'un clignotement.
      const enveloppe = Math.min(
        ecoule / MONTEE_ACCUSE,
        suivi.restant / DESCENTE_ACCUSE,
        1,
      )
      illuminations[cle]?.(Math.max(0, enveloppe) * ACCUSES[cle])
    })

    // L'ÎLOT SUIT LA PROPRIÉTÉ. Chaque ouvrage déclare l'emprise que ses abords
    // occupent au sol (`rayonSol`), et la maison la recalcule à chaque image :
    // la pelouse s'étend avec la surface de terrain déclarée, et le socle doit
    // s'étendre avec elle, sinon le jardin finirait dans le vide.
    poserSocle(ouvrage?.rayonSol ?? RAYON_SOL_DEFAUT)

    /**
     * LES OISEAUX passent toutes les sept secondes, jamais deux fois de suite
     * dans la même direction ni à la même hauteur (voir `oiseaux.js`), et leur
     * espèce suit l'architecture : pigeons au-dessus de l'immeuble, colombes
     * au-dessus de la maison. Ils traversent une sphère un peu plus large que
     * le cadrage — assez pour entrer et sortir du champ, jamais pour
     * disparaître derrière le brouillard.
     *
     * Ils comptent double depuis que la caméra ne bouge plus : c'est à peu près
     * tout ce qui, dans une image posée, dit qu'elle n'est pas une photographie.
     */
    voliere.poser(dt, {
      espece: familleMontee === 'immeuble' ? 'pigeon' : 'colombe',
      hauteurBien: ouvrage?.ancrages?.hauteur ?? ouvrage?.envergure?.hauteur ?? 6,
      rayon: Math.max(34, drone.rayon * 1.15),
    })

    /* --- caméra --- */

    // LE PIVOT REJOINT SA CIBLE, image après image, à la cadence du drone
    // lui-même : d'un stade au suivant, le cadrage glisse au lieu de sauter.
    if (!mouvementReduit) pivot.lerp(pivotVise, Math.min(1, dt * 0.62))

    if (mouvementReduit) {
      // MOUVEMENTS RÉDUITS — la caméra se pose et n'en bouge plus du tout : ni
      // rapprochement d'un stade au suivant, ni balancement, ni respiration.
      //
      // ELLE SE POSE TOUT DE MÊME AU BON ENDROIT. L'azimut n'était jamais
      // appliqué ici : le drone restait à l'aplomb exact de la façade, à
      // l'angle où il avait été construit, et l'écart de quelques degrés que
      // chaque plan demande — celui qui donne au bâtiment son retour de volume
      // — n'existait pas. Supprimer le mouvement n'est pas supprimer le
      // cadrage : on pose l'azimut du plan d'un bloc, sans transition.
      drone.angle = azimutVise()
      camera.position.set(
        pivot.x + Math.cos(drone.angle) * droneCible.rayon,
        pivot.y + droneCible.hauteur,
        pivot.z + Math.sin(drone.angle) * droneCible.rayon,
      )
      camera.lookAt(viserDecale(vise))
    } else {
      // LA CAMÉRA REJOINT SON PLAN EN DEUX SECONDES ENVIRON.
      //
      // Ce qui la sépare d'un stade au suivant se compte maintenant en mètres,
      // pas en quarts de tour (voir `PLANS`) : ce glissement-là ne se lit plus
      // comme un déplacement, mais comme une mise au point qui s'ajuste. La
      // cadence n'a pas changé — il faut toujours qu'elle soit arrivée avant la
      // fin de l'étape, sinon on ne voit rien s'y construire.
      const pasDrone = Math.min(1, dt * 0.74)
      drone.rayon += (droneCible.rayon - drone.rayon) * pasDrone
      drone.hauteur += (droneCible.hauteur - drone.hauteur) * pasDrone
      drone.angle += (azimutVise() - drone.angle) * Math.min(1, dt * 0.5)

      // RESPIRATION. Elle valait presque un demi-mètre d'avant en arrière et
      // trois dixièmes de haut en bas — de quoi voir le cadre bouger. Réduite
      // au dixième, elle ne se voit plus : elle empêche seulement l'image
      // d'être une photographie, ce qui est tout ce qu'on lui demande.
      const respiration = Math.sin(secondes * 0.19) * 0.06
      camera.position.set(
        pivot.x + Math.cos(drone.angle) * (drone.rayon + respiration),
        Math.max(0.7, pivot.y + drone.hauteur + Math.sin(secondes * 0.25) * 0.04),
        pivot.z + Math.sin(drone.angle) * (drone.rayon + respiration),
      )
      // Le regard suit encore plus lentement que l'appareil : c'est ce décalage
      // entre l'un et l'autre qui donne au mouvement sa douceur.
      cibleLissee.lerp(vise, Math.min(1, dt * 1.0))
      camera.lookAt(viserDecale(cibleLissee))
    }

    /* --- halo --- */

    const hauteurBien = ouvrage?.ancrages?.hauteur ?? ouvrage?.envergure?.hauteur ?? 4
    const largeurBien = ouvrage?.envergure?.largeur ?? 6
    const enveloppe = Math.max(largeurBien, hauteurBien) * 2.3
    halo.material.opacity = val.halo
    halo.visible = val.halo > 0.01
    halo.scale.set(enveloppe, enveloppe, 1)
    halo.position.set(0, Math.max(1, hauteurBien * 0.5), 0)

    const rayonCercle = largeurBien * 0.52 + 1.4
    cercleOr.scale.set(rayonCercle, rayonCercle, 1)
    cercleOr.material.opacity = val.halo * 0.9
    cercleOr.visible = val.halo > 0.01

    renderer.render(scene, camera)
  }

  animer()

  return {
    appliquer(suivant) {
      Object.assign(etat, suivant)
      appliquerEtat()
    },

    dimensionner(largeur, hauteur) {
      if (largeur <= 0 || hauteur <= 0) return
      camera.aspect = largeur / hauteur
      camera.updateProjectionMatrix()
      renderer.setSize(largeur, hauteur, false)
      cadrer()
    },

    detruire() {
      cancelAnimationFrame(image)
      demonterOuvrage()
      voliere.detruire()
      environnement.dispose()
      scene.traverse((objet) => {
        if (!objet.isMesh && !objet.isSprite) return
        objet.geometry?.dispose()
        objet.material?.dispose()
      })
      M.libererTextures()
      renderer.dispose()
    },
  }
}

/* -------------------------------------------------------------------------- */
/*  Enveloppe React                                                           */
/* -------------------------------------------------------------------------- */

export function DroneScene({
  stade = 0,
  type = null,
  surface = 100,
  etage = null,
  options = null,
}) {
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const mouvementReduit = useReducedMotion()

  // La scène est montée une fois par écran (et remontée si l'utilisateur change
  // de réglage d'animations) : la construire est coûteux, la piloter ne l'est
  // pas — c'est `appliquer` qui reçoit les changements d'étape.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let decor
    try {
      decor = creerScene(canvas, { mouvementReduit: Boolean(mouvementReduit) })
    } catch {
      // Pas de WebGL : le décor manque, le parcours reste entier.
      return undefined
    }

    sceneRef.current = decor

    const suivre = new ResizeObserver(([entree]) => {
      const { width, height } = entree.contentRect
      decor.dimensionner(width, height)
    })
    suivre.observe(canvas.parentElement ?? canvas)
    decor.dimensionner(canvas.clientWidth, canvas.clientHeight)

    return () => {
      suivre.disconnect()
      sceneRef.current = null
      decor.detruire()
    }
  }, [mouvementReduit])

  // `options` est un objet recréé à chaque rendu du parent : on le sérialise
  // pour que l'effet ne se relance que sur un changement réel.
  const signatureOptions = JSON.stringify(options ?? {})

  useEffect(() => {
    sceneRef.current?.appliquer({
      stade,
      type,
      surface,
      etage,
      options: JSON.parse(signatureOptions),
    })
  }, [stade, type, surface, etage, signatureOptions])

  return <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
}
