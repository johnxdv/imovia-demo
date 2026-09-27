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
  BANDE_HAUTE,
  cibleDuPlan,
  DERNIER_PLAN,
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
  const pivot = new THREE.Vector3()
  const vise = new THREE.Vector3()
  const cibleLissee = new THREE.Vector3(0, 2, 0)
  let derive = 0

  const plan = () => PLANS[borne(etat.stade, 0, DERNIER_PLAN)]

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

    pivot.copy(pivotDuPlan(p, ouvrage?.ancrages))
    vise.copy(cibleDuPlan(p, ouvrage?.ancrages, ouvrage?.ancrages?.hauteur ?? envergure.hauteur))

    decentrer()
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

    // Pendant la visite, la caméra est pilotée au point près : tout
    // décentrement y décollerait le regard de ce qu'on est venu voir.
    const enHaut = etat.zone === 'haut'
    const p = plan()
    const decalageX = dedans || enHaut ? 0 : -p.cadre * largeur
    const decalageY = enHaut && !dedans ? (hauteur * (1 - BANDE_HAUTE)) / 2 : 0

    if (decalageX === 0 && decalageY === 0) {
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

  /** Instant où le drone s'est posé dans le séjour — origine du travelling. */
  let debutSejour = 0

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
    Math.max(0.5, Math.min(8, Number.isFinite(etat.etage) ? etat.etage : 2))

  /** Point du puits, à l'angle et à la hauteur donnés. */
  const surPuits = (h, psi, y, dr = 0) =>
    new THREE.Vector3(
      h.axe.x + Math.cos(psi) * (h.rayon + dr),
      y,
      h.axe.z - Math.sin(psi) * (h.rayon + dr),
    )

  /** L'entrée : porte cochère, hall, puits d'escalier, palier, séjour. */
  function trajetEntree() {
    const visite = assurerInterieur()
    const niveau = niveauDemande()
    visite.placerEtage(niveau)
    niveauMonte = niveau

    const r = visite.reperes()
    const h = visite.helice(niveau)

    // Un tour par étage, et d'autant plus vite qu'il y en a : quatre étages ne
    // doivent pas coûter quatre fois le temps d'un seul.
    const montee = Math.min(3.1, 0.7 + 0.46 * niveau)

    const devantPorte = r.entree.clone().add(new THREE.Vector3(0.35, 0.6, 6.2))

    return [
      {
        duree: 1.0,
        p0: positionCourante(),
        c0: regardCourant(),
        p1: devantPorte,
        c1: r.entree.clone(),
        porteImmeuble: [0.35, 1],
      },
      {
        duree: 0.85,
        p0: devantPorte,
        c0: r.entree.clone(),
        p1: r.hall.clone(),
        c1: r.piedEscalier.clone(),
        porteImmeuble: [1, 1],
        voile: [0.3, 0.82],
        basculeDedans: 0.45,
      },
      {
        duree: 0.75,
        p0: r.hall.clone(),
        c0: r.piedEscalier.clone(),
        p1: surPuits(h, h.psiDepart, h.yDepart),
        c1: surPuits(h, h.psiDepart - 1.5, h.yDepart - 0.5, 0.62),
      },
      {
        duree: montee,
        helice: {
          axe: h.axe,
          rayon: h.rayon,
          psi0: h.psiDepart,
          psi1: h.psiArrivee,
          y0: h.yDepart,
          y1: h.yArrivee,
        },
      },
      {
        duree: 0.62,
        p0: surPuits(h, h.psiArrivee, h.yArrivee),
        c0: r.palier.clone(),
        p1: r.palier.clone(),
        c1: r.seuil.clone(),
        portePalier: [0.2, 1],
      },
      {
        duree: 1.15,
        p0: r.palier.clone(),
        c0: r.seuil.clone(),
        p1: r.sejour.clone(),
        c1: r.foyer.clone(),
        portePalier: [1, 1],
      },
    ]
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
    // L'hélice du niveau qu'on quitte se lit AVANT de déplacer le logement :
    // c'est de là que le drone part.
    const depart = visite.helice(precedent)
    visite.placerEtage(niveau)
    niveauMonte = niveau

    const r = visite.reperes()
    const h = visite.helice(niveau)
    const ecart = Math.abs(niveau - precedent)
    const montee = Math.min(2.6, 0.45 + 0.42 * ecart)

    return [
      {
        duree: 0.5,
        p0: positionCourante(),
        c0: regardCourant(),
        p1: surPuits(depart, depart.psiArrivee, depart.yArrivee),
        c1: surPuits(depart, depart.psiArrivee - 1.5, depart.yArrivee - 0.9, 0.62),
        // Le logement change de hauteur sous nos pieds : une pénombre brève
        // couvre le saut, comme au franchissement d'un seuil.
        voile: [0, 0.7],
        portePalier: [1, 0],
      },
      {
        duree: montee,
        helice: {
          axe: h.axe,
          rayon: h.rayon,
          psi0: depart.psiArrivee,
          psi1: h.psiArrivee,
          y0: depart.yArrivee,
          y1: h.yArrivee,
        },
      },
      {
        duree: 0.55,
        p0: surPuits(h, h.psiArrivee, h.yArrivee),
        c0: r.palier.clone(),
        p1: r.palier.clone(),
        c1: r.seuil.clone(),
        portePalier: [0.2, 1],
      },
      {
        duree: 0.95,
        p0: r.palier.clone(),
        c0: r.seuil.clone(),
        p1: r.sejour.clone(),
        c1: r.foyer.clone(),
        portePalier: [1, 1],
      },
    ]
  }

  /** La sortie : on traverse la fenêtre qui s'ouvre, et on retrouve le ciel. */
  function trajetSortie() {
    if (!interieur) return []
    const r = interieur.reperes()
    const devant = r.fenetre.clone().add(new THREE.Vector3(0, 0, -1.1))

    return [
      {
        duree: 0.65,
        p0: positionCourante(),
        c0: regardCourant(),
        p1: devant,
        c1: r.dehors.clone(),
        fenetre: [0.15, 1],
      },
      {
        duree: 0.85,
        p0: devant,
        c0: r.dehors.clone(),
        p1: r.dehors.clone().add(new THREE.Vector3(0, 2.4, 7)),
        c1: r.dehors.clone().add(new THREE.Vector3(0, -1.5, -8)),
        fenetre: [1, 1],
        voile: [0.18, 0.55],
        basculeDedans: 0.32,
      },
    ]
  }

  /**
   * Le séjour, une fois entré : un lent travelling latéral, et le regard qui
   * passe de la cheminée aux fenêtres. Ce n'est plus un trajet — il n'a pas de
   * fin —, c'est la respiration de la pièce pendant que le curseur la meuble.
   */
  function poserCameraSejour(t) {
    if (!interieur) return
    const r = interieur.reperes()
    // Le compte repart de zéro à l'arrivée dans le séjour : les trois termes
    // ci-dessous s'annulent alors tous, et la caméra prend son travelling
    // exactement là où la trajectoire l'a posée — sans le saut qu'un temps
    // absolu ferait faire. Et en mouvements réduits, il ne repart pas du tout :
    // la caméra se pose dans le séjour et n'en bouge plus.
    const tau = mouvementReduit ? 0 : (t - debutSejour) * 0.2
    camera.position.set(
      r.sejour.x + Math.sin(tau) * 0.75,
      r.sejour.y + Math.sin(tau * 0.73) * 0.08,
      r.sejour.z + (Math.cos(tau * 0.86) - 1) * 0.42,
    )
    // Le regard va et vient entre le foyer et la façade : c'est le parcours du
    // regard de quelqu'un qui entre dans une pièce, pas une orbite.
    const bascule = (1 - Math.cos(tau * 0.62)) / 2
    cibleLissee.lerpVectors(r.foyer, r.fenetre, bascule)
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

    if (segment.helice) {
      const { axe, rayon, psi0, psi1, y0, y1 } = segment.helice
      const psi = lisser(psi0, psi1, e)
      const y = lisser(y0, y1, e)
      camera.position.set(
        axe.x + Math.cos(psi) * rayon,
        y,
        axe.z - Math.sin(psi) * rayon,
      )
      // LE REGARD PORTE EN AVANT SUR LA VOLÉE, un quart de spire plus loin et
      // à peine plus haut. Viser franchement le ciel du puits ne montrerait que
      // le dessous des marches ; viser la volée montre ce qu'on est venu
      // voir — les marches, le tapis, la rampe qui s'enroule.
      // LE DRONE MONTE EN REGARDANT LE PUITS, deux tiers de radian en arrière
      // et une volée plus bas — soit une plongée d'une soixantaine de degrés.
      //
      // C'est le seul cadre d'où une spirale se lit comme une spirale : on y
      // voit les marches par-dessus, donc leur tapis, leurs barres de laiton,
      // et la rampe qui s'enroule sur plusieurs tours. Regarder vers le haut ne
      // montrerait que le dessous des marches, et regarder droit devant, le mur
      // de la cage.
      const arriere = psi - 1.5
      cibleLissee.set(
        axe.x + Math.cos(arriere) * (rayon + 0.62),
        y - 1.4,
        axe.z - Math.sin(arriere) * (rayon + 0.62),
      )
      camera.lookAt(cibleLissee)
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
      const dehors = trajet.nom !== 'entree' && trajet.nom !== 'etage'
      if (dedans === dehors) {
        dedans = !dehors
        decentrer()
      }
    }

    if (brut >= 1) {
      trajet.index += 1
      trajet.t = 0
      if (trajet.index >= trajet.segments.length) {
        const nom = trajet.nom
        arreterTrajet()
        if (nom === 'sortie') reprendreOrbite()
        else debutSejour = secondes
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
    const relatif = camera.position.clone().sub(pivot)
    drone.rayon = Math.max(1, Math.hypot(relatif.x, relatif.z))
    drone.hauteur = relatif.y
    let angle = Math.atan2(relatif.z, relatif.x)
    const azimut = plan().azimut
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

    if (famille !== familleMontee || (famille === 'villa' && palier !== palierMonte)) {
      monterOuvrage(famille, palier)
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
      if (trajet.nom === 'sortie' || (!dedans && trajet.nom !== 'entree')) {
        // Dehors, ou en train d'en sortir : on (re)part de la porte cochère.
        lancerTrajet('entree', trajetEntree())
      } else if (dedans && trajet.nom !== 'entree' && niveau !== niveauMonte) {
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
    const dt = Math.min((maintenant - instantPrecedent) / 1000, 0.05)
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
    const hauteurCoupe = ouvrage?.hauteurCoupe ?? 6
    coupe.constant = val.montage > 0.995 ? 1e6 : val.montage * hauteurCoupe

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

    if (trajet.actif) {
      jouerTrajet(dt)
    } else if (dedans) {
      poserCameraSejour(secondes)
    } else if (mouvementReduit) {
      camera.position.set(pivot.x + drone.rayon, pivot.y + droneCible.hauteur, pivot.z)
      camera.lookAt(vise)
    } else {
      // Le drone rejoint son plan en une seconde environ. C'est la cadence des
      // trois temps de l'analyse : quatre secondes par station, dont une de
      // voyage — au-delà, il passerait son temps à courir après son cadre, et
      // on ne verrait jamais rien s'y construire.
      const pasDrone = Math.min(1, dt * 0.95)
      drone.rayon += (droneCible.rayon - drone.rayon) * pasDrone
      drone.hauteur += (droneCible.hauteur - drone.hauteur) * pasDrone

      // LE VOYAGE. L'azimut du plan est la destination ; le drone s'y rend en
      // glissant, d'autant plus vite qu'il en est loin — un mouvement qui
      // démarre franc et se pose en douceur, comme un appareil qui rejoint sa
      // position.
      // La dérive fait respirer un plan ; plafonnée, elle ne le remplace pas.
      // Sans ce plafond, une étape où l'on s'attarde — l'affinage, par
      // exemple — finit par emmener le drone un quart de tour plus loin que le
      // plan composé pour elle.
      derive = Math.min(derive + dt * plan().derive, 0.45)
      const azimut = plan().azimut + derive
      drone.angle += (azimut - drone.angle) * Math.min(1, dt * 0.9)

      // Respiration : le flottement d'un appareil en vol stationnaire. Sans
      // elle, un plan posé devient une photographie.
      const respiration = Math.sin(secondes * 0.23) * 0.45
      camera.position.set(
        pivot.x + Math.cos(drone.angle) * (drone.rayon + respiration),
        Math.max(0.7, pivot.y + drone.hauteur + Math.sin(secondes * 0.31) * 0.28),
        pivot.z + Math.sin(drone.angle) * (drone.rayon + respiration),
      )
      cibleLissee.lerp(vise, Math.min(1, dt * 1.6))
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
