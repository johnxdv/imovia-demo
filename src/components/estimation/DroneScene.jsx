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
  BANDE_HAUTE,
  borneEcart,
  cibleDuPlan,
  DERNIER_PLAN,
  ECART_FACE_MAX,
  FACE,
  MARGE_CADRAGE,
  MARGE_CADRAGE_BANDE,
  PLANS,
  pivotDuPlan,
} from './scene/plans'

/**
 * LE DÉCOR DU PARCOURS D'ESTIMATION — un bien filmé au drone, en vraie 3D.
 *
 * Ce n'est qu'un FOND. Le composant ne lit rien, ne décide rien et ne remonte
 * rien : il reçoit l'état du parcours et se contente de le mettre en scène
 * derrière le panneau de verre des étapes (voir `src/pages/Estimer.jsx`). La
 * page reste entièrement utilisable si WebGL manque — le canevas n'affiche
 * alors rien.
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
 *   Un appartement, c'est TOUJOURS LE MÊME immeuble haussmannien. Il se bâtit
 *   sous le curseur comme la maison le fait, et LES FENÊTRES DE L'ÉTAGE
 *   DÉCLARÉ s'y allument dès que le vendeur le règle — c'est tout ce qu'un
 *   immeuble peut honnêtement dire d'un logement qu'on ne voit pas de la rue.
 *
 * IL N'Y A PLUS DE VISITE INTÉRIEURE. Le drone entrait par la porte cochère,
 * montait le puits de l'escalier un tour par étage et parcourait un
 * appartement meublé. C'était juste, et c'était une demi-minute passée loin du
 * bien qu'on estime — dans un intérieur qui n'était celui de personne. La
 * séquence et son décor ont été retirés en entier.
 *
 * LES TROIS TEMPS DE L'ANALYSE ONT CHACUN LEUR PLAN, et chacun son ouvrage :
 *
 *   1/3 — en bas, devant la porte : l'entrée, le seuil, les abords.
 *   2/3 — trois-quarts côté gauche : les menuiseries, les volets, les balcons.
 *   3/3 — au-dessus du toit : la couverture, la corniche, les souches.
 *
 * C'est le même geste dans les deux architectures : le drone va là où quelque
 * chose se construit, et il y arrive avant que ça se construise.
 *
 * L'AFFINAGE, enfin : le vendeur ajoute une piscine, du terrain, des panneaux,
 * une terrasse ou un balcon, il choisit son standing — et chaque option se
 * DESSINE sur le bien. C'est le dernier stade, et le drone y prend le recul
 * qu'il faut pour que tout tienne dans le cadre.
 *
 * `prefers-reduced-motion` immobilise le drone — la caméra se cale sur un
 * point de vue fixe — et fige les transitions de géométrie sur leur valeur
 * d'arrivée : la scène reste juste, elle ne bouge plus.
 */

/**
 * Correctif d'éclairage. La maquette de référence a été écrite pour three
 * r128, où l'intensité d'une lumière s'entendait en unités arbitraires ;
 * depuis r155, elle s'entend en unités physiques, ce qui revient à diviser les
 * mêmes valeurs par π. On les remultiplie donc par π.
 */
const FACTEUR_LUMIERE = Math.PI

const TOUR = Math.PI * 2

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
    montage: [0.36, 0.78, 1, 1, 1, 1, 1, 1, 1],
  },
  villa: {
    //                  0     1     2     3     4     5   6  7  8
    montage: [0.22, 0.52, 0.8, 0.89, 0.96, 1, 1, 1, 1],
    abords: [0, 0, 0.12, 0.5, 0.8, 1, 1, 1, 1],
    // LES ARBRES SORTENT DE TERRE PENDANT L'ANALYSE, et là seulement : c'est le
    // seul moment du parcours où l'écran ne demande rien et où l'on attend. Un
    // arbre qui pousse est ce qu'on remarque du coin de l'œil en lisant une
    // barre de progression — trois sujets, échelonnés (voir `villa.js`).
    //
    // La pousse démarre à peine au premier temps de l'analyse et se joue
    // surtout aux deux suivants : le plan de l'entrée est serré sur la porte,
    // et un arbre qui grandirait là se jouerait hors du cadre.
    pousse: [0, 0, 0, 0.14, 0.58, 1, 1, 1, 1],
  },
  immeuble: {
    montage: [0.22, 0.58, 1, 1, 1, 1, 1, 1, 1],
    // L'entrée arrive tôt : porte cochère, marquise et perron sont ce à quoi
    // l'on reconnaît un immeuble avant même d'en avoir compté les étages.
    entree: [0, 0, 1, 1, 1, 1, 1, 1, 1],
    menuiserie: [0, 0, 0.3, 0.45, 1, 1, 1, 1, 1],
    couronnement: [0, 0, 0.15, 0.25, 0.5, 1, 1, 1, 1],
    abords: [0, 0, 0.1, 0.5, 0.8, 1, 1, 1, 1],
  },
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
  // Ombres adoucies : le filtrage simple dessinait des bords en escalier sur
  // les arêtes obliques — une ombre de toiture en pente s'y lisait crénelée.
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  // Le plan de coupe du chantier a besoin du détourage local.
  renderer.localClippingEnabled = true

  const scene = new THREE.Scene()
  scene.background = M.textureCiel()
  // Brouillard léger : c'est lui qui donne la profondeur et qui évite au sol
  // circulaire de finir sur une arête franche à l'horizon. Il commence bien
  // au-delà du bien — un immeuble se cadre à quarante unités, et un brouillard
  // qui mordrait dessus le délaverait au lieu de l'éloigner.
  scene.fog = new THREE.Fog(0xcfe0ea, 90, 260)

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
  const ciel = new THREE.HemisphereLight(0xdfeeff, 0x8a7a5e, 0.44 * FACTEUR_LUMIERE)
  scene.add(ciel)

  const soleil = new THREE.DirectionalLight(0xfff1d8, 0.94 * FACTEUR_LUMIERE)
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
  const retour = new THREE.DirectionalLight(0xdfe8f2, 0.2 * FACTEUR_LUMIERE)
  retour.position.set(-30, 9, -20)
  scene.add(retour)

  const sol = new THREE.Mesh(
    new THREE.CircleGeometry(120, 56),
    // La teinte du sol est proche de celle de la pelouse du jardin : celle-ci
    // est un disque posé dessus, et un écart marqué en dessinerait le bord.
    new THREE.MeshStandardMaterial({ map: M.textureSolPre(), color: 0x9ab87e, roughness: 0.97 }),
  )
  sol.rotation.x = -Math.PI / 2
  sol.receiveShadow = true
  scene.add(sol)

  /**
   * L'ENVIRONNEMENT. Le ciel, replié en carte d'éclairage, sert de reflet à
   * tout ce qui en a un : les vitrages, le zinc, le laiton, le fer forgé. Sans
   * lui, un métal sans source à refléter rend un gris mat — c'est ce qui
   * donnait à la ferronnerie des balcons l'aspect du plastique peint.
   *
   * Son intensité est basse, et il le faut : la gestion des couleurs est coupée
   * (voir plus haut), si bien qu'un éclairage d'environnement à pleine
   * puissance s'ajouterait tel quel aux lumières déjà réglées et délaverait la
   * scène entière. À un tiers, il ne se voit que là où il doit se voir — dans
   * les reflets.
   */
  const fabriqueEnv = new THREE.PMREMGenerator(renderer)
  const scenette = new THREE.Scene()
  scenette.background = M.textureCiel()
  const environnement = fabriqueEnv.fromScene(scenette, 0.04).texture
  scene.environment = environnement
  scene.environmentIntensity = 0.34
  fabriqueEnv.dispose()

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
    zone: 'centre',
  }

  const taille = { largeur: 1, hauteur: 1 }

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

  /* ------------------------- le bâtiment courant ---------------------------- */

  const batiment = new THREE.Group()
  scene.add(batiment)

  let ouvrage = null
  let familleMontee = null
  let palierMonte = -1

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
   * RAMENÉ DE 2,45 s À 1,4 s POUR LA MUE ENTIÈRE. Le geste est le même — la
   * maison se démonte planche par planche et la suivante se rassemble —, mais
   * il se joue à la vitesse d'un montage et non d'une démonstration : le
   * vendeur traverse volontiers trois paliers d'affilée au curseur, et chaque
   * mue qui traîne le laisse devant une maison en morceaux.
   */
  const DUREE_DEMONTAGE = 0.5
  const DUREE_REMONTAGE = 0.9


  function demonterOuvrage() {
    if (!ouvrage) return
    batiment.remove(ouvrage.groupe)
    M.viderGroupe(ouvrage.groupe)
    ouvrage = null
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

    // Pré pour une maison, enrobé pour un immeuble — la matière change avec
    // l'adresse, pas seulement la teinte.
    sol.material.map = famille === 'immeuble' ? M.textureSolVille() : M.textureSolPre()
    sol.material.color.setHex(famille === 'immeuble' ? 0x97998f : 0x9ab87e)
    sol.material.needsUpdate = true
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

  const drone = { rayon: 30, hauteur: 12, angle: 0.6 }
  const droneCible = { rayon: 30, hauteur: 12 }
  /**
   * LE PIVOT SE REJOINT, IL NE SE SAUTE PAS.
   *
   * Les plans ne tournent pas tous autour du même point : le centre du bien
   * pour les uns, la porte ou le toit pour les autres (voir `pivotDuPlan`).
   * Recopier le nouveau pivot d'une image à l'autre TÉLÉPORTAIT la caméra
   * d'autant — près de quatre unités entre le plan de l'entrée et le suivant,
   * soit la moitié d'une maison franchie en une image. Le drone s'y rend
   * désormais, comme il se rend partout ailleurs.
   */
  const pivot = new THREE.Vector3()
  const pivotVise = new THREE.Vector3()
  const vise = new THREE.Vector3()
  const cibleLissee = new THREE.Vector3(0, 2, 0)
  /**
   * LE DÉCENTREMENT SE REJOINT AUSSI. Chaque plan pousse le bien d'un côté ou
   * de l'autre du panneau (voir `cadre`), et d'un plan au suivant l'écart peut
   * valoir un tiers de la largeur de l'écran : posé d'un coup, c'est le bien
   * entier qui saute latéralement au changement d'étape.
   */
  let cadreCourant = 0
  let derive = 0

  const plan = () => PLANS[borne(etat.stade, 0, DERNIER_PLAN)]

  /**
   * L'ARCHITECTURE SE MONTRE-T-ELLE DU SEUL CÔTÉ DE SA PORTE ?
   *
   * Oui pour une MAISON — et pour l'ossature, qui en est une en chantier : on
   * l'aborde par sa façade, c'est la seule vue où elle se reconnaisse, et son
   * jardin comme son allée sont de ce côté-là. Non pour un immeuble, qu'on longe
   * depuis la rue et dont on peut faire le tour.
   */
  const verrouFacade = () => familleMontee === 'villa' || familleMontee === 'ossature'

  /**
   * L'azimut visé maintenant, dérive comprise.
   *
   * Verrouillé sur la façade, le drone ne tourne plus : il VA ET VIENT dans la
   * fenêtre de la façade, d'un trois-quarts vers l'autre. C'est le mouvement
   * qu'on attend d'un appareil qui cherche son cadre, et il ne passe jamais
   * derrière — l'amplitude est calculée pour que le balancement tienne dans ce
   * qui reste de fenêtre au plan en cours, quel que soit son écart.
   */
  function azimutVise() {
    const p = plan()
    if (!verrouFacade()) return p.azimut + derive

    const ecart = p.face ?? 0
    const marge = Math.max(0, ECART_FACE_MAX - Math.abs(ecart))
    const balance = Math.sin(secondes * 0.19 + (p.face ?? 0)) * Math.min(0.26, marge)
    return FACE + borneEcart(ecart + balance)
  }

  function cadrer() {
    const p = plan()
    const envergure = ouvrage?.envergure ?? { largeur: 6, hauteur: 4 }
    const bande = etat.zone === 'haut' ? BANDE_HAUTE : 1

    const ouvertureV = (camera.fov * Math.PI) / 180
    const ouvertureH = 2 * Math.atan(Math.tan(ouvertureV / 2) * camera.aspect)
    const ouvertureUtile = 2 * Math.atan(Math.tan(ouvertureV / 2) * bande)

    // Le bâtiment doit tenir dans les deux sens : on retient la distance la
    // plus contraignante. La demi-largeur est ajoutée au résultat — ce calcul
    // cadre un objet plat, or celui-ci a de l'épaisseur, et c'est sa face la
    // plus proche qui remplit le cadre.
    const surLargeur = envergure.largeur / 2 / Math.tan(ouvertureH / 2)
    const surHauteur = envergure.hauteur / 2 / Math.tan(ouvertureUtile / 2)
    const marge = etat.zone === 'haut' ? MARGE_CADRAGE_BANDE : MARGE_CADRAGE
    const calculee =
      envergure.largeur / 2 +
      (p.cadrage === 'largeur' ? surLargeur : Math.max(surLargeur, surHauteur)) * marge

    let distance = (p.distance ?? calculee) * p.recul
    let ancrePivot = pivotDuPlan(p, ouvrage?.ancrages)
    let ancreCible = cibleDuPlan(p, ouvrage?.ancrages, ouvrage?.ancrages?.hauteur ?? envergure.hauteur)

    /**
     * LE BALCON SE FILME DE PRÈS.
     *
     * C'est le seul ouvrage de l'affinage qui se construise à mi-hauteur d'une
     * façade, et le plan d'ensemble de l'affinage — composé pour tenir une
     * maison, son jardin et sa piscine — le réduisait à une saillie de quelques
     * pixels. Quand il est déclaré, le drone quitte donc le plan large : il
     * descend à sa hauteur, se rapproche, et c'est le balcon — et non plus le
     * centre du bâtiment — qui devient le point autour duquel il tourne.
     *
     * La terrasse d'une maison a droit au même traitement, pour la même
     * raison — c'est le même bouton, et c'est le même ouvrage vu d'une autre
     * architecture.
     *
     * Un peu moins de six dixièmes de la distance : c'est le rapprochement le
     * plus franc qu'on puisse se permettre. En deçà, le bâtiment déborde du
     * cadre et revient derrière le panneau — on aurait gagné sur le balcon ce
     * qu'on aurait perdu sur tout le reste.
     */
    const ancreExterieur =
      etat.stade >= DERNIER_PLAN && (etat.options?.balcon || etat.options?.terrasse)
        ? ouvrage?.ancrages?.exterieur
        : null

    if (ancreExterieur) {
      distance *= 0.58
      ancrePivot = ancreExterieur.clone()
      ancreCible = ancreExterieur.clone()
    }

    droneCible.rayon = distance
    droneCible.hauteur = Math.max(0.9, distance * (ancreExterieur ? 0.16 : p.elevation))

    pivotVise.copy(ancrePivot)
    vise.copy(ancreCible)

    if (mouvementReduit) {
      pivot.copy(pivotVise)
      cadreCourant = cadreVise()
    }
    decentrer()
  }

  /** Décentrement voulu par l'étape en cours. */
  function cadreVise() {
    // Panneau rangé en bas (téléphone) : le bien est cadré dans la bande du
    // haut, et un décentrement latéral n'aurait plus rien à dégager.
    if (etat.zone === 'haut') return 0
    return -plan().cadre
  }

  /**
   * Décentre l'objectif pour poser le bâtiment dans la bande libre.
   * `setViewOffset` revient à rendre une fenêtre décalée d'une image plus
   * grande : c'est la translation d'un objectif à décentrement, et non une
   * caméra qu'on incline — les verticales restent d'aplomb.
   */
  function decentrer() {
    const { largeur, hauteur } = taille
    if (largeur <= 0 || hauteur <= 0) return

    const enHaut = etat.zone === 'haut'
    const decalageX = cadreCourant * largeur
    const decalageY = enHaut ? (hauteur * (1 - BANDE_HAUTE)) / 2 : 0

    // Un décalage d'un demi-pixel ne se voit pas, et le remettre à chaque image
    // recalculerait la matrice de projection pour rien.
    if (Math.abs(decalageX) < 0.5 && decalageY === 0) {
      camera.clearViewOffset()
      return
    }
    camera.setViewOffset(largeur, hauteur, decalageX, decalageY, largeur, hauteur)
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

    if (famille !== familleMontee) {
      // CHANGEMENT D'ARCHITECTURE — franc, et à dessein. On ne démonte pas une
      // ossature pour en faire un immeuble : ce n'est pas le même bien qu'on
      // regarde, c'est le bien qu'on vient de repérer sur la carte. La mue ne
      // vaut qu'entre deux paliers de la MÊME maison.
      monterOuvrage(famille, palier)
      mue.phase = null
      mue.ecart = 0
      mue.vise = palier
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
    cible.lumiere = stade >= 6 ? 1 : 0
    cible.halo = stade === 7 ? 1 : 0

    // Les options d'affinage ne valent qu'au dernier stade : avant, rien n'a
    // été demandé au vendeur, et lui montrer une piscine qu'il n'a pas
    // déclarée reviendrait à lui montrer un bien qui n'est pas le sien.
    const o = stade >= 8 ? etat.options ?? {} : {}
    cible.piscine = o.piscine ? 1 : 0
    cible.terrain = borne(Number(o.terrain) || 0, 0, 1)
    cible.panneaux = o.panneaux ? 1 : 0
    cible.terrasse = o.terrasse ? 1 : 0
    cible.balcon = o.balcon ? 1 : 0
    cible.rezDeJardin = o.rezDeJardin ? 1 : 0
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

    cadrer()
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
     * LES OISEAUX passent toutes les cinq secondes environ, et leur espèce suit
     * l'architecture : pigeons au-dessus de l'immeuble, colombes au-dessus de
     * la maison. Ils traversent une sphère un peu plus large que le cadrage du
     * drone — assez pour entrer et sortir du champ, jamais pour disparaître
     * derrière le brouillard.
     */
    voliere.poser(dt, {
      espece: familleMontee === 'immeuble' ? 'pigeon' : 'colombe',
      hauteurBien: ouvrage?.ancrages?.hauteur ?? ouvrage?.envergure?.hauteur ?? 6,
      rayon: Math.max(34, drone.rayon * 1.15),
    })

    /* --- caméra --- */

    // LE CADRE REJOINT SA CIBLE, image après image. Le pivot et le
    // décentrement suivent la même cadence que le drone lui-même : d'un stade
    // au suivant, tout le cadrage glisse au lieu de sauter.
    if (!mouvementReduit) {
      const pasCadre = Math.min(1, dt * 0.62)
      pivot.lerp(pivotVise, pasCadre)
      cadreCourant += (cadreVise() - cadreCourant) * pasCadre
      decentrer()
    }

    if (mouvementReduit) {
      // MOUVEMENTS RÉDUITS — le drone ne vole plus, mais il se pose AU BON
      // ENDROIT. Il se calait jusqu'ici sur l'axe +X, c'est-à-dire sur le côté
      // du bien, quel que soit le plan : une maison s'y montrait de profil, et
      // au dernier stade de dos. Le point de vue est désormais celui que le
      // plan demande — façade comprise —, simplement immobile.
      const angle = azimutDuPlan(plan(), verrouFacade())
      camera.position.set(
        pivot.x + Math.cos(angle) * droneCible.rayon,
        pivot.y + droneCible.hauteur,
        pivot.z + Math.sin(angle) * droneCible.rayon,
      )
      camera.lookAt(vise)
    } else {
      // LE DRONE REJOINT SON PLAN EN DEUX SECONDES ENVIRON, et pas en une.
      //
      // C'est le plus lent qu'on puisse se permettre : les trois temps de
      // l'analyse durent trois secondes chacun, et il faut que le drone soit
      // arrivé avant la fin de sa station, sinon on ne voit rien s'y construire.
      // Relevé de 0,58 à 0,74 avec le raccourcissement de l'analyse — le
      // mouvement se lit toujours comme une dérive, mais il se pose à temps.
      const pasDrone = Math.min(1, dt * 0.74)
      drone.rayon += (droneCible.rayon - drone.rayon) * pasDrone
      drone.hauteur += (droneCible.hauteur - drone.hauteur) * pasDrone

      // LE VOYAGE. L'azimut du plan est la destination ; le drone s'y rend en
      // glissant, d'autant plus vite qu'il en est loin — un mouvement qui
      // démarre franc et se pose en douceur, comme un appareil qui rejoint sa
      // position.
      // La dérive fait respirer un plan ; plafonnée, elle ne le remplace pas.
      // Sans ce plafond, une étape où l'on s'attarde — l'affinage, par
      // exemple — finit par emmener le drone un quart de tour plus loin que le
      // plan composé pour elle. Verrouillé sur la façade, le drone n'en a pas
      // besoin : son balancement remplit le même office sans jamais l'emmener
      // derrière le bien (voir `azimutVise`).
      if (!verrouFacade()) derive = Math.min(derive + dt * plan().derive, 0.45)
      let azimut = azimutVise()
      if (verrouFacade()) {
        // On vise le tour le plus proche de l'angle courant : sans cela, le
        // passage d'un immeuble à une maison ferait faire au drone les tours
        // qu'il avait accumulés en orbite.
        azimut += Math.round((drone.angle - azimut) / TOUR) * TOUR
      }
      drone.angle += (azimut - drone.angle) * Math.min(1, dt * 0.5)

      // Respiration : le flottement d'un appareil en vol stationnaire. Sans
      // elle, un plan posé devient une photographie.
      const respiration = Math.sin(secondes * 0.23) * 0.45
      camera.position.set(
        pivot.x + Math.cos(drone.angle) * (drone.rayon + respiration),
        Math.max(0.7, pivot.y + drone.hauteur + Math.sin(secondes * 0.31) * 0.28),
        pivot.z + Math.sin(drone.angle) * (drone.rayon + respiration),
      )
      // Le regard suit encore plus lentement que l'appareil : c'est ce décalage
      // entre l'un et l'autre qui donne au mouvement sa douceur — un drone qui
      // regarderait instantanément sa cible aurait l'œil d'une machine.
      cibleLissee.lerp(vise, Math.min(1, dt * 1.0))
      camera.lookAt(cibleLissee)
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
      const stadeChange = suivant.stade !== undefined && suivant.stade !== etat.stade
      if (stadeChange) derive = 0
      Object.assign(etat, suivant)
      appliquerEtat()
    },

    dimensionner(largeur, hauteur) {
      if (largeur <= 0 || hauteur <= 0) return
      taille.largeur = largeur
      taille.hauteur = hauteur
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
  zone = 'centre',
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
      zone,
    })
  }, [stade, type, surface, etage, signatureOptions, zone])

  return <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
}
