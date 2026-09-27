import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import * as THREE from 'three'
import * as M from './scene/matieres'
import { creerOssature } from './scene/ossature'
import { creerVilla, palierVilla } from './scene/villa'
import {
  creerImmeuble,
  PROFONDEUR as PROFONDEUR_IMMEUBLE,
  travee,
  TRAVEE_LOGEMENT,
  TRAVEE_PORTE,
} from './scene/immeuble'
import { creerInterieur, ECHELLE_VISITE, Z_FACADE_LOCAL } from './scene/interieur'
import {
  azimutDuPlan,
  BANDE_HAUTE,
  borneEcart,
  cibleDuPlan,
  DERNIER_PLAN,
  ECART_FACE_MAX,
  FACE,
  MARGE_CADRAGE,
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
 *   Un appartement, c'est TOUJOURS LE MÊME immeuble haussmannien — et comme
 *   un appartement ne se voit pas de la rue, on y ENTRE (voir ci-dessous).
 *
 * LA VISITE. Dès que la fenêtre de surface s'ouvre sur un appartement, le
 * drone se pose devant la porte cochère, elle s'ouvre, il traverse le hall,
 * monte le puits de l'escalier — UN TOUR PAR ÉTAGE DÉCLARÉ, et d'autant plus
 * vite qu'il y en a —, la porte du palier s'ouvre vers l'intérieur, et le
 * logement se meuble sous le curseur, palier de 30 m² après palier de 30 m².
 * Au clic sur l'estimation, une fenêtre s'ouvre et le drone ressort par là.
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
 * point de vue fixe —, supprime les trajectoires de visite et fige les
 * transitions de géométrie sur leur valeur d'arrivée : la scène reste juste,
 * elle ne bouge plus.
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
    // L'entrée arrive tôt : c'est par elle qu'on entre visiter.
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
  renderer.shadowMap.type = THREE.PCFShadowMap
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

  /**
   * LE VOILE. Un rectangle sombre accroché à l'objectif, transparent en temps
   * normal. Il ne sert qu'aux deux instants où la scène bascule d'un décor à
   * l'autre — on passe la porte, on passe la fenêtre — et où un échange sec
   * entre l'extérieur et l'intérieur se verrait. Trois dixièmes de seconde de
   * pénombre, et la bascule est celle d'un seuil franchi.
   */
  const voile = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: 0x14100c, transparent: true, opacity: 0, depthTest: false }),
  )
  voile.position.z = -0.2
  voile.renderOrder = 999
  voile.frustumCulled = false
  camera.add(voile)

  // L'INTENSITÉ DES LUMIÈRES, et pourquoi elle est basse.
  //
  // La gestion des couleurs est coupée (voir plus haut) : les matières ne sont
  // pas converties en linéaire avant d'être éclairées, et l'image n'est pas
  // reconvertie en sortie. Une scène réglée aux valeurs physiques habituelles y
  // brûle donc entièrement — tout ce qui est clair devient blanc, et la pierre,
  // l'enduit et le zinc cessent de se distinguer les uns des autres. Ces
  // valeurs-là sont celles où la façade garde ses nuances et où les ombres
  // portées se lisent encore.
  const ciel = new THREE.HemisphereLight(0xdfeeff, 0x8a7a5e, 0.5 * FACTEUR_LUMIERE)
  scene.add(ciel)

  const soleil = new THREE.DirectionalLight(0xfff3df, 0.86 * FACTEUR_LUMIERE)
  soleil.position.set(26, 42, 22)
  soleil.castShadow = true
  soleil.shadow.mapSize.set(2048, 2048)
  soleil.shadow.camera.left = -44
  soleil.shadow.camera.right = 44
  soleil.shadow.camera.top = 52
  soleil.shadow.camera.bottom = -34
  soleil.shadow.camera.near = 1
  soleil.shadow.camera.far = 120
  soleil.shadow.bias = -0.0016
  scene.add(soleil)

  const sol = new THREE.Mesh(
    new THREE.CircleGeometry(120, 56),
    // La teinte du sol est proche de celle de la pelouse du jardin : celle-ci
    // est un disque posé dessus, et un écart marqué en dessinerait le bord.
    new THREE.MeshStandardMaterial({ color: 0x85a468, roughness: 0.96 }),
  )
  sol.rotation.x = -Math.PI / 2
  sol.receiveShadow = true
  scene.add(sol)

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
    visite: false,
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
    standing: 0,
  }
  const cible = { ...val }

  /** Bascule franche extérieur ↔ intérieur, couverte par le voile. */
  let dedans = false
  let opaciteVoile = 0

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

  /** Le temps que met une maison à se défaire, puis à se refaire. */
  const DUREE_DEMONTAGE = 0.95
  const DUREE_REMONTAGE = 1.5

  let interieur = null
  let niveauMonte = null

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

    sol.material.color.setHex(famille === 'immeuble' ? 0x76786f : 0x85a468)
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
  function assurerInterieur() {
    if (interieur) return interieur
    // L'écart entre la travée du logement et celle de la porte cochère est une
    // donnée de la FAÇADE : c'est elle qui dit où l'on entre et où l'on
    // ressort. La visite la reçoit plutôt que de la redeviner, et le hall s'y
    // ajuste — sans quoi on entrerait par un mur.
    interieur = creerInterieur({
      entreeX: (travee(TRAVEE_PORTE) - travee(TRAVEE_LOGEMENT)) / ECHELLE_VISITE,
    })
    // La visite s'aligne sur la travée du logement, et son nu de façade sur
    // celui de l'immeuble : la fenêtre par laquelle on ressort tombe alors
    // exactement dans la façade, et la sortie se joue au bon endroit.
    interieur.groupe.position.set(
      travee(TRAVEE_LOGEMENT),
      0,
      PROFONDEUR_IMMEUBLE / 2 - Z_FACADE_LOCAL * interieur.echelle,
    )
    interieur.groupe.visible = false
    scene.add(interieur.groupe)
    return interieur
  }

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
    const calculee =
      envergure.largeur / 2 +
      (p.cadrage === 'largeur' ? surLargeur : Math.max(surLargeur, surHauteur)) * MARGE_CADRAGE

    const distance = (p.distance ?? calculee) * p.recul
    droneCible.rayon = distance
    droneCible.hauteur = Math.max(0.9, distance * p.elevation)

    pivotVise.copy(pivotDuPlan(p, ouvrage?.ancrages))
    vise.copy(cibleDuPlan(p, ouvrage?.ancrages, ouvrage?.ancrages?.hauteur ?? envergure.hauteur))

    if (mouvementReduit) {
      pivot.copy(pivotVise)
      cadreCourant = cadreVise()
    }
    decentrer()
  }

  /**
   * Décentrement voulu par l'étape en cours.
   *
   * Une fonction, et pas une valeur rangée : elle dépend de `dedans`, qui
   * bascule au milieu d'une trajectoire de visite et non à un changement de
   * stade. Rangée, elle serait périmée pendant tout le temps qu'on passe
   * dedans.
   */
  function cadreVise() {
    // Pendant la visite, la caméra est pilotée au point près : tout
    // décentrement y décollerait le regard de ce qu'on est venu voir.
    if (dedans || etat.zone === 'haut') return 0
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
    const decalageY = enHaut && !dedans ? (hauteur * (1 - BANDE_HAUTE)) / 2 : 0

    // Un décalage d'un demi-pixel ne se voit pas, et le remettre à chaque image
    // recalculerait la matrice de projection pour rien.
    if (Math.abs(decalageX) < 0.5 && decalageY === 0) {
      camera.clearViewOffset()
      return
    }
    camera.setViewOffset(largeur, hauteur, decalageX, decalageY, largeur, hauteur)
  }

  /* ------------------------- trajectoires de visite -------------------------- */

  /**
   * UNE TRAJECTOIRE, C'EST UNE SUITE DE SEGMENTS.
   *
   * Chacun porte ses deux extrémités — d'où part la caméra, où elle va, ce
   * qu'elle regarde au départ et à l'arrivée —, sa durée, et ce qu'il actionne
   * au passage : une porte qui s'ouvre, une fenêtre, le voile de la bascule.
   * Le segment `helice` est le seul à ne pas aller droit : il enroule la
   * caméra autour de l'axe du puits, un tour par étage.
   */
  const trajet = { segments: [], index: 0, t: 0, actif: false, nom: null }

  function lancerTrajet(nom, segments) {
    trajet.nom = nom
    trajet.segments = segments
    trajet.index = 0
    trajet.t = 0
    trajet.actif = segments.length > 0
  }

  function arreterTrajet() {
    trajet.actif = false
    trajet.segments = []
    trajet.nom = null
  }

  const positionCourante = () => camera.position.clone()

  /**
   * Point que la caméra regarde en ce moment — six unités devant elle.
   *
   * C'est de là que repart chaque trajectoire : un segment qui commencerait
   * par un regard neuf ferait faire un à-coup à la caméra au moment précis où
   * elle prend son élan.
   */
  function regardCourant() {
    const avant = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    return camera.position.clone().add(avant.multiplyScalar(6))
  }

  /** Niveau de la visite, tel que l'étage déclaré le commande. */
  const niveauDemande = () =>
    Math.max(0.5, Math.min(12, Number.isFinite(etat.etage) ? etat.etage : 2))

  /** Point du puits, à l'angle et à la hauteur donnés. */
  const surPuits = (h, psi, y, dr = 0) =>
    new THREE.Vector3(
      h.axe.x + Math.cos(psi) * (h.rayon + dr),
      y,
      h.axe.z - Math.sin(psi) * (h.rayon + dr),
    )

  /**
   * LE TEMPS DE LA MONTÉE, pour le nombre d'étages déclaré.
   *
   * On monte à pied, et lentement : une seconde et demie pour le premier, puis
   * un peu moins d'une seconde par étage supplémentaire. La progression
   * ralentit — douze étages ne peuvent pas coûter douze fois le temps d'un
   * seul, on y passerait la minute — mais elle ne disparaît jamais : entre le
   * deuxième et le troisième, il y a une volée de plus, et elle se voit.
   *
   * Plafonné à sept secondes : c'est déjà long, et c'est le prix d'un douzième
   * étage — le vendeur qui l'a déclaré doit sentir qu'il habite haut.
   */
  const dureeMontee = (niveau) => Math.min(7, 1.4 + 0.86 * niveau ** 0.75)

  /**
   * L'ENTRÉE — porte cochère, hall, escalier, palier, séjour.
   *
   * TOUT EST À HAUTEUR D'ŒIL, ET ON MONTE LES MARCHES. Ce n'est pas un drone qui
   * visite un appartement : c'est quelqu'un qui pousse une porte cochère,
   * traverse un hall et gravit un escalier. Un appartement, contrairement à une
   * maison, ne se regarde pas — il se parcourt, et le seul point de vue qui le
   * dise est celui d'une personne debout (voir `volee` dans `interieur.js`).
   *
   * LES DURÉES SONT LE DOUBLE DE CE QU'ELLES ÉTAIENT. La séquence était juste
   * mais expédiée : on n'avait pas le temps de comprendre qu'on venait d'entrer
   * quelque part avant d'être déjà dans le séjour.
   */
  function trajetEntree() {
    const visite = assurerInterieur()
    const niveau = niveauDemande()
    visite.placerEtage(niveau)
    niveauMonte = niveau

    const r = visite.reperes()
    const v = visite.volee(niveau)
    const pied = surPuits(v, v.psiDepart, v.yDepart)

    const devantPorte = r.entree.clone().add(new THREE.Vector3(0.35, 0.5, 6.2))

    const segments = [
      // On s'approche de la porte cochère, qui s'ouvre à mesure.
      {
        duree: 2.0,
        p0: positionCourante(),
        c0: regardCourant(),
        p1: devantPorte,
        c1: r.entree.clone(),
        porteImmeuble: [0.35, 1],
      },
      // On franchit le seuil, et le hall se découvre.
      {
        duree: 1.8,
        p0: devantPorte,
        c0: r.entree.clone(),
        p1: r.hall.clone(),
        c1: r.piedEscalier.clone(),
        porteImmeuble: [1, 1],
        voile: [0.3, 0.82],
        basculeDedans: 0.45,
      },
      // On traverse le hall jusqu'au pied de l'escalier, le regard déjà posé sur
      // les premières marches. Viser le haut de la volée, comme on le faisait,
      // ne montrait que le dessous des marches — un plafond de bois qui remplit
      // le cadre juste avant qu'on ne s'engage.
      {
        duree: 1.5,
        p0: r.hall.clone(),
        c0: r.piedEscalier.clone(),
        p1: pied,
        c1: surPuits(v, v.psiDepart + 1.25, v.yDepart - 0.3),
      },
    ]

    // L'ESCALIER, un tour par étage — et rien du tout au rez-de-chaussée, où
    // l'on entre de plain-pied dans le logement.
    if (v.marches > 0.5) {
      segments.push({ duree: dureeMontee(niveau), volee: v })
    }

    const arrivee = surPuits(v, v.psiArrivee, v.yArrivee)

    segments.push(
      // On se retourne vers la porte du logement, qui s'ouvre.
      {
        duree: 1.35,
        p0: arrivee,
        c0: r.palier.clone(),
        p1: r.palier.clone(),
        c1: r.seuil.clone(),
        portePalier: [0.2, 1],
      },
      // Et l'on entre.
      {
        duree: 2.1,
        p0: r.palier.clone(),
        c0: r.seuil.clone(),
        p1: r.sejour.clone(),
        c1: r.foyer.clone(),
        portePalier: [1, 1],
      },
    )

    return segments
  }

  /**
   * LE CHANGEMENT D'ÉTAGE, sans ressortir de l'immeuble.
   *
   * Le vendeur règle son étage pendant qu'il est déjà dans le logement : il ne
   * doit pas être renvoyé sur le trottoir pour autant. Le drone ressort sur le
   * palier, reprend le puits et monte — ou descend — d'autant de tours que
   * d'étages franchis, puis rentre par la même porte. C'est exactement le geste
   * qu'on vient de lui demander : un étage, un tour.
   */
  function trajetEtage(precedent) {
    const visite = assurerInterieur()
    const niveau = niveauDemande()
    // La volée du niveau qu'on quitte se lit AVANT de déplacer le logement :
    // c'est de là que l'on repart.
    const depart = visite.volee(precedent)
    visite.placerEtage(niveau)
    niveauMonte = niveau

    const r = visite.reperes()
    const v = visite.volee(niveau)
    const ecart = Math.abs(niveau - precedent)

    return [
      {
        duree: 1.1,
        p0: positionCourante(),
        c0: regardCourant(),
        p1: surPuits(depart, depart.psiArrivee, depart.yArrivee),
        c1: surPuits(depart, depart.psiArrivee + 1.1, depart.yArrivee + 0.4),
        // Le logement change de hauteur sous nos pieds : une pénombre brève
        // couvre le saut, comme au franchissement d'un seuil.
        voile: [0, 0.7],
        portePalier: [1, 0],
      },
      {
        // On reprend l'escalier — d'autant de volées qu'on franchit d'étages,
        // dans un sens comme dans l'autre.
        duree: Math.min(5, 0.9 + 0.8 * ecart ** 0.75),
        volee: {
          ...v,
          psiDepart: depart.psiArrivee,
          yDepart: depart.yArrivee,
          marches: Math.abs(v.marches - depart.marches),
        },
      },
      {
        duree: 1.2,
        p0: surPuits(v, v.psiArrivee, v.yArrivee),
        c0: r.palier.clone(),
        p1: r.palier.clone(),
        c1: r.seuil.clone(),
        portePalier: [0.2, 1],
      },
      {
        duree: 1.8,
        p0: r.palier.clone(),
        c0: r.seuil.clone(),
        p1: r.sejour.clone(),
        c1: r.foyer.clone(),
        portePalier: [1, 1],
      },
    ]
  }

  /**
   * LA SORTIE — la fenêtre s'ouvre, on la franchit, et l'immeuble se découvre
   * depuis la rue.
   *
   * C'est le geste qui referme la visite, et il doit être posé : on ne se jette
   * pas par une fenêtre, on s'en approche, on l'ouvre, on passe. Trois temps
   * plutôt que deux, et trois fois le temps qu'il y avait — l'ancienne sortie
   * durait une seconde et demie, on n'avait pas vu la fenêtre s'ouvrir qu'on
   * était déjà dehors.
   *
   * LE PREMIER TEMPS S'ALLONGE AVEC LA DISTANCE. On peut être au fond de la
   * chambre quand l'estimation part (voir `trajetPieces`) : traverser
   * l'enfilade entière dans le temps qu'il faut pour traverser le séjour
   * donnerait une course, et c'est précisément ce qu'on veut éviter.
   */
  function trajetSortie() {
    if (!interieur) return []
    const r = interieur.reperes()
    const devant = r.fenetre.clone().add(new THREE.Vector3(0, 0, -1.3))
    const depart = positionCourante()
    const approche = borne(1.5 + depart.distanceTo(devant) * 0.42, 1.5, 4.2)

    return [
      // On revient vers la fenêtre, qui s'ouvre à mesure qu'on s'en approche.
      {
        duree: approche,
        p0: depart,
        c0: regardCourant(),
        p1: devant,
        c1: r.fenetre.clone(),
        fenetre: [0.25, 1],
      },
      // On se penche au balcon : le regard passe de la croisée à la rue.
      {
        duree: 1.6,
        p0: devant,
        c0: r.fenetre.clone(),
        p1: r.fenetre.clone().add(new THREE.Vector3(0, 0.1, 0.5)),
        c1: r.dehors.clone(),
        fenetre: [1, 1],
      },
      // Et l'on prend du champ, jusqu'à voir l'immeuble entier.
      {
        duree: 2.6,
        p0: r.fenetre.clone().add(new THREE.Vector3(0, 0.1, 0.5)),
        c0: r.dehors.clone(),
        p1: r.dehors.clone().add(new THREE.Vector3(0, 2.4, 7)),
        c1: r.dehors.clone().add(new THREE.Vector3(0, -1.5, -8)),
        fenetre: [1, 1],
        voile: [0.28, 0.5],
        basculeDedans: 0.42,
      },
    ]
  }

  /**
   * LA PROMENADE — on traverse les trois pièces, l'une après l'autre.
   *
   * Un appartement ne se juge pas depuis le seuil du séjour. Une fois entré, on
   * le PARCOURT : le séjour et sa cheminée, la salle à manger et sa table, la
   * chambre au bout de l'enfilade — puis l'on revient sur ses pas. Trois pièces,
   * dans l'ordre où elles se suivent le long de la façade (voir `enfilade` dans
   * `interieur.js`).
   *
   * TROIS TEMPS PAR PIÈCE, et ils sont toujours les mêmes :
   *   on franchit la porte en regardant où l'on entre ;
   *   on avance jusqu'au milieu, le regard sur ce qui fait la pièce ;
   *   on s'attarde, et le regard glisse vers la fenêtre.
   *
   * C'est long — près d'une demi-minute pour la boucle entière — et c'est voulu :
   * la fenêtre de surface reste ouverte le temps qu'on veut, et rien ne presse.
   * Une visite qui courrait d'une pièce à l'autre donnerait l'agitation d'un
   * diaporama là où l'on cherche le calme d'une visite.
   *
   * La boucle se rejoue indéfiniment (voir `jouerTrajet`) : on repasse dans les
   * pièces pendant que le curseur les meuble, et l'on finit toujours par revenir
   * au séjour — d'où l'on ressortira par la fenêtre.
   */
  function trajetPieces() {
    if (!interieur) return []
    const salles = interieur.enfilade()
    if (salles.length === 0) return []

    const segments = []
    let depuis = positionCourante()
    let versQuoi = regardCourant()

    const aller = (p1, c1, duree) => {
      segments.push({ duree, p0: depuis.clone(), c0: versQuoi.clone(), p1: p1.clone(), c1: c1.clone() })
      depuis = p1.clone()
      versQuoi = c1.clone()
    }

    salles.forEach((salle) => {
      // ON FRANCHIT LA PORTE LE REGARD DÉJÀ POSÉ SUR LA PIÈCE — sur sa cheminée,
      // sa table, son lit. Viser le point où l'on va se tenir, comme on le
      // faisait, revenait à regarder un point en l'air à deux mètres : on
      // traversait trois pièces en ne voyant que des murs.
      if (salle.seuil) aller(salle.seuil, salle.mire, 2.7)
      // On gagne l'angle d'où la pièce se lit, sans quitter ce qu'on regarde.
      aller(salle.poste, salle.mire, 2.3)
      // Et l'on s'attarde, le regard qui glisse vers la fenêtre.
      aller(salle.poste.clone().lerp(salle.croisee, 0.22), salle.croisee, 3.0)
    })

    // LE RETOUR. On repasse les portes en sens inverse jusqu'au séjour : c'est
    // de là qu'on ressort au moment de l'estimation, et une visite qui
    // s'achèverait au fond de la chambre obligerait à la traverser en hâte.
    const retour = salles.slice(0, -1).reverse()
    retour.forEach((salle, index) => {
      const porte = salles[salles.length - 1 - index].seuil
      if (porte) aller(porte, salle.mire, 2.5)
      aller(salle.poste, salle.mire, 2.2)
    })

    return segments
  }

  /** Point de vue fixe dans le séjour — le repli des mouvements réduits. */
  function poserCameraSejour() {
    if (!interieur) return
    const salles = interieur.enfilade()
    const salle = salles[0]
    if (!salle) return
    camera.position.copy(salle.poste)
    cibleLissee.copy(salle.mire)
    camera.lookAt(cibleLissee)
  }

  /** Avance la trajectoire d'une image, et place la caméra. */
  function jouerTrajet(dt) {
    const segment = trajet.segments[trajet.index]
    if (!segment) {
      arreterTrajet()
      return false
    }

    trajet.t += dt
    const brut = borne(trajet.t / segment.duree, 0, 1)
    const e = adouci(brut)

    // Le voile retombe de lui-même : sans cela, il resterait posé sur les
    // segments suivants, qui n'y touchent pas.
    opaciteVoile *= Math.max(0, 1 - dt * 5)

    if (segment.volee) {
      /**
       * ON MONTE L'ESCALIER, MARCHE PAR MARCHE.
       *
       * Le regard se tient au milieu du giron, à hauteur d'œil au-dessus du nez
       * de marche, et il avance sur la spirale. Trois choses le distinguent d'un
       * survol du puits, et ce sont elles qui font qu'on y monte :
       *
       *   • LE REGARD PORTE EN AVANT SUR LA VOLÉE — un demi-quart de tour plus
       *     loin, à peine au-dessus de l'horizontale. C'est ce qu'on regarde en
       *     montant un escalier : les marches à venir, pas le vide.
       *   • LA TÊTE MONTE ET DESCEND AU RYTHME DU PAS, d'un tiers de marche. Sans
       *     ce balancement, la montée est celle d'un ascenseur.
       *   • ELLE S'INCLINE LÉGÈREMENT DANS LE VIRAGE, du côté du jour : on
       *     s'appuie sur la rampe en tournant.
       */
      const { axe, rayon, psiDepart, psiArrivee, yDepart, yArrivee, marches, pas } = segment.volee
      const psi = lisser(psiDepart, psiArrivee, e)
      const monte = lisser(yDepart, yArrivee, e)

      // Le pas : une oscillation par marche franchie, amortie au départ et à
      // l'arrivée pour qu'on ne se mette pas à tanguer à l'arrêt.
      const enMarche = Math.sin(brut * Math.PI)
      const cadence = Math.sin(e * (marches ?? 0) * Math.PI) * (pas ?? 0.02) * 0.34 * enMarche

      camera.position.set(
        axe.x + Math.cos(psi) * rayon,
        monte + cadence,
        axe.z - Math.sin(psi) * rayon,
      )

      // LE REGARD PORTE SUR LES MARCHES À VENIR, un quart de tour plus loin et
      // nettement plus bas que l'œil.
      //
      // C'est une affaire de géométrie autant que de vérité : dans une cage
      // d'escalier, les marches qu'on s'apprête à gravir restent un bon mètre
      // sous le regard, et l'horizontale ne rencontre que le mur d'en face — un
      // aplat clair à deux mètres quatre-vingts, qui remplissait le cadre et ne
      // disait rien. Vingt-cinq degrés de plongée, et l'on retrouve ce qu'on
      // regarde vraiment en montant : le tapis, les barres de laiton, la rampe
      // qui s'enroule et le vide du puits qui tourne à côté de soi.
      const sens = Math.sign(psiArrivee - psiDepart) || 1
      const avant = psi + sens * 1.25
      cibleLissee.set(
        axe.x + Math.cos(avant) * rayon,
        monte - 0.3,
        axe.z - Math.sin(avant) * rayon,
      )
      camera.lookAt(cibleLissee)
      camera.rotateZ(-sens * 0.045 * enMarche)
    } else {
      camera.position.lerpVectors(segment.p0, segment.p1, e)
      cibleLissee.lerpVectors(segment.c0, segment.c1, e)
      camera.lookAt(cibleLissee)
    }

    if (segment.porteImmeuble && ouvrage?.ouvrirPorte) {
      const [a, b] = segment.porteImmeuble
      ouvrage.ouvrirPorte(borne(lisser(a, b, e), 0, 1))
    }
    if (segment.portePalier && interieur) {
      const [a, b] = segment.portePalier
      interieur.ouvrirPortePalier(borne(lisser(a, b, e), 0, 1))
    }
    if (segment.fenetre && interieur) {
      const [a, b] = segment.fenetre
      interieur.ouvrirFenetre(borne(lisser(a, b, e), 0, 1))
    }
    if (segment.voile) {
      const [debut, sommet] = segment.voile
      // Une cloche : le voile monte, culmine au passage du seuil, retombe.
      const x = borne((brut - debut) / (1 - debut), 0, 1)
      opaciteVoile = Math.max(opaciteVoile, Math.sin(x * Math.PI) * sommet)
    }
    if (segment.basculeDedans !== undefined && brut >= segment.basculeDedans) {
      const dehors = trajet.nom !== 'entree' && trajet.nom !== 'etage' && trajet.nom !== 'pieces'
      // Le décentrement suit de lui-même : il est recalculé à chaque image à
      // partir de `dedans` (voir `cadreVise`).
      if (dedans === dehors) dedans = !dehors
    }

    if (brut >= 1) {
      trajet.index += 1
      trajet.t = 0
      if (trajet.index >= trajet.segments.length) {
        const nom = trajet.nom
        arreterTrajet()
        if (nom === 'sortie') reprendreOrbite()
        // Arrivé dans le séjour, on visite ; la visite finie, on la reprend. La
        // fenêtre de surface reste ouverte aussi longtemps que le vendeur le
        // veut, et il n'y a rien d'autre à faire pendant ce temps que d'habiter
        // l'appartement qu'il décrit.
        else lancerTrajet('pieces', trajetPieces())
        return false
      }
    }
    return true
  }

  /**
   * Rend la main au drone orbital en repartant d'où la caméra se trouve : sans
   * cela, la sortie de l'immeuble se terminerait par un saut.
   */
  function reprendreOrbite() {
    cadrer()
    // Ici, et ici seulement, le pivot se pose d'un coup : la continuité du
    // mouvement est reprise juste après sur la position réelle de la caméra,
    // dont on déduit rayon, hauteur et angle. Un pivot en cours de route
    // fausserait ce calcul.
    pivot.copy(pivotVise)
    cadreCourant = cadreVise()
    const relatif = camera.position.clone().sub(pivot)
    drone.rayon = Math.max(1, Math.hypot(relatif.x, relatif.z))
    drone.hauteur = relatif.y
    let angle = Math.atan2(relatif.z, relatif.x)
    const azimut = azimutDuPlan(plan(), verrouFacade())
    // On ramène l'angle courant au tour le plus proche de l'azimut visé : le
    // drone rejoint son plan par le chemin court, sans faire de tour sur lui.
    angle += Math.round((azimut - angle) / TOUR) * TOUR
    drone.angle = angle
    derive = 0
  }

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
    cible.standing = borne(Number(o.standing) || 0, 0, 1)

    if (famille === 'immeuble' && ouvrage?.placerBalcon) {
      ouvrage.placerBalcon(Number.isFinite(etat.etage) ? etat.etage : 2)
    }

    // LA VISITE commence quand la fenêtre de surface s'ouvre sur un appartement,
    // et se termine quand l'estimation part. Entre les deux, le vendeur peut
    // changer d'étage autant qu'il veut — et refermer puis rouvrir la fenêtre.
    // Les quatre cas sont écrits ici, et pas ailleurs : c'est la seule bascule
    // du décor qui ait une mémoire, et une bascule à mémoire se lit d'un bloc
    // ou ne se lit pas.
    const veutVisite = famille === 'immeuble' && etat.visite && !mouvementReduit
    const niveau = niveauDemande()

    if (veutVisite) {
      // ENCORE DEHORS — on (re)part de la porte cochère. Le second cas est celui
      // d'un étage changé pendant l'approche : le vendeur règle volontiers son
      // étage dans la seconde qui suit l'ouverture de la fenêtre, et la séquence
      // se recompose alors sur le bon étage. Elle repart de la position courante
      // (voir `positionCourante`), donc sans saut.
      if (
        trajet.nom === 'sortie' ||
        (!dedans && (trajet.nom !== 'entree' || niveau !== niveauMonte))
      ) {
        lancerTrajet('entree', trajetEntree())
      } else if (dedans && niveau !== niveauMonte) {
        // Déjà dedans, l'étage a changé : on reprend l'escalier sans ressortir.
        lancerTrajet('etage', trajetEtage(niveauMonte ?? niveau))
      }
    } else if ((dedans || trajet.nom === 'entree' || trajet.nom === 'etage') && trajet.nom !== 'sortie') {
      lancerTrajet('sortie', trajetSortie())
    }

    if (mouvementReduit && veutVisite) {
      // Mouvements réduits : pas de survol, mais le logement reste visité —
      // on s'y pose, simplement, sans y voler.
      const visite = assurerInterieur()
      visite.placerEtage(Number.isFinite(etat.etage) ? etat.etage : 2)
      dedans = true
    }

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
    const pas = mouvementReduit ? 1 : Math.min(1, dt * 1.7)
    const pasMontage = mouvementReduit ? 1 : Math.min(1, dt * 0.85)

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
    if (interieur) {
      interieur.poser({
        ...val,
        dedans: dedans ? 1 : 0,
        surface: etat.surface,
        yCamera: camera.position.y,
      })
    }

    // Dedans, le soleil ne sert plus à rien — ce sont les appliques de la cage
    // et le lustre du séjour qui éclairent — et le laisser à pleine puissance
    // planterait des ombres de façade au milieu du salon.
    const dehors = dedans ? 0.14 : 1
    soleil.intensity = 0.86 * FACTEUR_LUMIERE * dehors
    ciel.intensity = (dedans ? 0.2 : 0.5) * FACTEUR_LUMIERE
    batiment.visible = !dedans

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

    if (trajet.actif) {
      jouerTrajet(dt)
    } else if (dedans) {
      poserCameraSejour()
    } else if (mouvementReduit) {
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
      // l'analyse durent quatre secondes chacun, et il faut que le drone soit
      // arrivé avant la fin de sa station, sinon on ne voit rien s'y construire.
      // En deçà de cette valeur, le mouvement se voyait comme un déplacement ;
      // à celle-ci, il se voit comme une dérive.
      const pasDrone = Math.min(1, dt * 0.58)
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

    /* --- halo, voile --- */

    const hauteurBien = ouvrage?.ancrages?.hauteur ?? ouvrage?.envergure?.hauteur ?? 4
    const largeurBien = ouvrage?.envergure?.largeur ?? 6
    const enveloppe = Math.max(largeurBien, hauteurBien) * 2.3
    halo.material.opacity = val.halo
    halo.visible = val.halo > 0.01 && !dedans
    halo.scale.set(enveloppe, enveloppe, 1)
    halo.position.set(0, Math.max(1, hauteurBien * 0.5), 0)

    const rayonCercle = largeurBien * 0.52 + 1.4
    cercleOr.scale.set(rayonCercle, rayonCercle, 1)
    cercleOr.material.opacity = val.halo * 0.9
    cercleOr.visible = val.halo > 0.01 && !dedans

    if (!trajet.actif) opaciteVoile *= Math.max(0, 1 - dt * 5)
    voile.material.opacity = opaciteVoile
    voile.visible = opaciteVoile > 0.005

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

      // Le voile doit couvrir le champ, quelle que soit la fenêtre.
      const h = 2 * 0.2 * Math.tan(((camera.fov / 2) * Math.PI) / 180) * 1.2
      voile.scale.set(h * camera.aspect, h, 1)

      cadrer()
    },

    detruire() {
      cancelAnimationFrame(image)
      demonterOuvrage()
      if (interieur) {
        scene.remove(interieur.groupe)
        M.viderGroupe(interieur.groupe)
        interieur = null
      }
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
  visite = false,
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
      visite,
      options: JSON.parse(signatureOptions),
      zone,
    })
  }, [stade, type, surface, etage, visite, signatureOptions, zone])

  return <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
}
