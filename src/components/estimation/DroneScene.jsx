import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import * as THREE from 'three'

/**
 * Décor du parcours d'estimation : un chantier filmé au drone, en vraie 3D.
 *
 * Ce n'est qu'un FOND. Le composant ne lit rien, ne décide rien et ne remonte
 * rien : il reçoit un stade de chantier et un type de bien, et se contente de
 * les mettre en scène derrière le panneau de verre des étapes (voir
 * `src/pages/Estimer.jsx`). Aucune étape, aucune validation, aucun calcul n'en
 * dépend — la page reste entièrement utilisable si WebGL manque, le canevas
 * n'affiche alors rien.
 *
 * LE BÂTIMENT SE CONSTRUIT AU FIL DU PARCOURS. Un stade par palier du tunnel
 * (voir `stadeChantier` dans `Estimer.jsx`) :
 *
 *   0 — dalle nue, la zone de chantier est piquetée
 *   1 — les murs montent à mi-hauteur
 *   2 — ils atteignent leur hauteur finale, niveau par niveau
 *   3 — le toit se pose (et, pour l'immeuble, l'attique, le mansart, le balcon)
 *   4 — les menuiseries : mur-rideau, meneaux, bardage, garde-corps, fenêtres
 *   5 — l'entrée : la porte et son seuil
 *   6 — le soir tombe, les vitrages s'éclairent
 *   7 — un halo doré entoure le bien achevé, et le drone reprend du recul
 *
 * LES TROIS TEMPS DE L'ANALYSE ONT CHACUN LE LEUR — stades 3, 4 et 5. L'écran
 * d'analyse dure douze secondes en trois étapes ; leur donner un seul stade
 * revenait à laisser le chantier immobile pendant huit d'entre elles. Le toit se
 * pose sur la première, les menuiseries arrivent sur la deuxième, l'entrée sur
 * la troisième : à chaque ligne qui se coche, quelque chose se construit.
 *
 * L'ARCHITECTURE DÉPEND DU TYPE DÉTECTÉ, celui que la chaîne cadastre → BDNB
 * établit dès le clic sur la photo aérienne (voir `src/lib/typeBien.js`) :
 *
 *   maison / autre → villa d'architecte : toit plat en surplomb, grand mur
 *     vitré en façade, bardage bois sombre sur un pan, pierre claire ailleurs.
 *     Au-delà de `SURFACE_EXCEPTION`, deux ailes latérales s'ajoutent — c'est
 *     le « bien d'exception » de la maquette, que notre parcours ne demande pas
 *     mais que la surface déclarée suffit à reconnaître.
 *   appartement → immeuble haussmannien : socle de pierre sombre au
 *     rez-de-chaussée, façade de pierre claire, attique en retrait sous un toit
 *     mansardé de zinc, garde-corps de fer forgé, fenêtres hautes et étroites,
 *     linteau de pierre au-dessus de l'entrée.
 *   terrain → le terrain reste nu, un panneau « À vendre » se plante à côté.
 *
 * Changer de type reconstruit le bâtiment : la détection peut se préciser
 * pendant que la fenêtre de surface est ouverte (déduction locale, puis réponse
 * du réseau), et la silhouette suit.
 *
 * CE QUI N'A PAS ÉTÉ REPRIS DE LA MAQUETTE : ses abords — jardin, garage,
 * piscine, terrasse, haie — qui y poussent à l'étape « atouts ». Notre parcours
 * ne pose pas cette question : il ne déclare ni jardin ni piscine, et rien dans
 * le cadastre ni la BDNB ne les décrit. Les faire apparaître reviendrait à
 * montrer au vendeur un bien qui n'est pas le sien, pendant qu'on l'estime.
 *
 * `zone` dit où se trouve la place libre à l'écran : `centre` quand le panneau
 * est centré (ordinateur, tablette), `haut` quand il est rangé en bas de
 * l'écran (téléphone). Le drone cadre alors le bien dans la bande restée libre
 * plutôt qu'au milieu de la fenêtre, et recule de ce qu'il faut pour l'y faire
 * tenir en entier.
 *
 * `prefers-reduced-motion` immobilise le drone — la caméra se cale sur un point
 * de vue fixe — et fige les transitions de géométrie sur leur valeur d'arrivée :
 * la scène reste juste, elle ne bouge plus.
 */

/**
 * Correctif d'éclairage. La maquette de référence a été écrite pour three r128,
 * où l'intensité d'une lumière s'entendait en unités arbitraires ; depuis r155,
 * elle s'entend en unités physiques, ce qui revient à diviser les mêmes valeurs
 * par π. On les remultiplie donc par π pour retrouver, à la lettre, la lumière
 * de la maquette — sans avoir à en réinventer les réglages.
 */
const FACTEUR_LUMIERE = Math.PI

/**
 * LES PLANS DU DRONE — un par stade de chantier.
 *
 * La maquette de référence ne faisait que tourner : même altitude, même angle
 * de plongée du début à la fin, seule la distance changeait. On voyait un
 * tourne-disque, pas un drone. Chaque stade a donc ici son plan, et le drone
 * VOYAGE de l'un à l'autre — il traverse un bon quart de tour pendant que le
 * bâtiment change, ce qui fait qu'on voit le changement sous un autre angle que
 * celui où on l'a quitté.
 *
 *   `recul`     multiplie la distance de cadrage. Ces sept valeurs sont, au
 *               millième près, les rapports de la table de la maquette : le
 *               drone se rapproche à mesure que la construction avance et
 *               reprend du champ au dévoilement du prix.
 *   `elevation` hauteur de vol rapportée à la distance — c'est l'angle de
 *               plongée, et c'est lui qui manquait. 0,98 : vu de haut, sans
 *               aller jusqu'à la verticale — au-delà, la maison se lit comme un
 *               empilement de dalles. 0,22 : à hauteur d'homme, devant
 *               l'entrée.
 *   `azimut`    position visée sur l'orbite, en radians, toujours croissante :
 *               le drone tourne toujours dans le même sens, il ne revient
 *               jamais sur ses pas.
 *   `regard`    part de la hauteur du bâtiment que la caméra vise.
 *   `derive`    dérive lente pendant le stade, pour que le plan respire une
 *               fois arrivé.
 *   `cadre`     décentrement horizontal, en fraction de la largeur de l'écran :
 *               négatif à gauche, positif à droite. C'est ce qui sort le
 *               bâtiment de derrière le panneau — centré, il y disparaissait
 *               pendant toute l'analyse, c'est-à-dire pendant les trois quarts
 *               de la construction. Et c'est, accessoirement, ce qui compose
 *               les plans : un sujet jamais au milieu, et qui change de côté.
 */

/**
 * Ce que le drone garde comme marge autour du bâtiment, au plus près de son
 * approche : 1 le collerait aux bords du cadre, 1,35 laisse voir la villa
 * ENTIÈRE — dalle de toiture, terrasse, ombre portée — de part et d'autre du
 * panneau.
 *
 * La maquette de référence posait des distances en dur : elle n'avait qu'un
 * gabarit à cadrer et qu'une mise en page. Notre parcours doit tenir dans le
 * même cadre un studio de 30 m² et un immeuble de cinq étages, derrière un
 * panneau qui change de taille à chaque étape. La distance est donc CALCULÉE
 * pour que le bâtiment occupe toujours la même part de l'écran ; les plans
 * ci-dessous n'en donnent que le rapport d'un stade à l'autre.
 */
const MARGE_CADRAGE = 1.35

const PLANS = [
  // 0 — le terrain nu, vu de haut : on repère le lieu avant de bâtir.
  { recul: 1.579, elevation: 0.98, azimut: -0.55, regard: 0.35, derive: 0.035, cadre: 0 },
  // 1 — le drone plonge au ras de la dalle pendant que les murs montent.
  { recul: 1.368, elevation: 0.3, azimut: 1.25, regard: 0.8, derive: 0.05, cadre: -0.2 },
  // 2 — il reprend de la hauteur en trois-quarts : les niveaux sont là.
  { recul: 1.211, elevation: 0.62, azimut: 2.65, regard: 0.55, derive: 0.045, cadre: 0.22 },
  // 3 — analyse 1/3, au-dessus du bâtiment : le seul endroit d'où l'on voit
  //     une dalle de toiture se poser.
  { recul: 1.15, elevation: 0.82, azimut: 4.05, regard: 0.42, derive: 0.03, cadre: 0.26 },
  // 4 — analyse 2/3, à hauteur d'étage, de biais : menuiseries et bardage.
  { recul: 1.08, elevation: 0.45, azimut: 5.35, regard: 0.62, derive: 0.05, cadre: -0.26 },
  // 5 — analyse 3/3, à hauteur d'homme, face à l'entrée : une porte se regarde
  //     d'en bas, pas d'en haut.
  { recul: 1.02, elevation: 0.26, azimut: 6.55, regard: 0.5, derive: 0.055, cadre: 0.24 },
  // 6 — le soir : léger pas de côté, les vitrages s'allument.
  { recul: 1.07, elevation: 0.4, azimut: 7.85, regard: 0.58, derive: 0.04, cadre: -0.22 },
  // 7 — grand écart arrière, en surplomb : le bien achevé et son halo.
  { recul: 1.33, elevation: 0.74, azimut: 9.4, regard: 0.5, derive: 0.03, cadre: 0 },
]

/**
 * Part de la hauteur du canevas laissée au bâtiment quand le panneau est rangé
 * en bas de l'écran (téléphone, voir `zone`). Le bien est cadré dans cette
 * bande-là, et non au centre : c'est une translation de l'objectif — un
 * décentrement, comme sur une chambre photographique —, pas une bascule de la
 * caméra, si bien que les verticales du bâtiment restent verticales.
 */
const BANDE_HAUTE = 0.46

/**
 * LE PROGRAMME DE LA MAISON, PALIER PAR PALIER.
 *
 * Une maison de 40 m² et une propriété de 400 ne se ressemblent pas, et il
 * serait faux de montrer la même en deux tailles. La surface déclarée au
 * curseur commande donc le PROGRAMME — le nombre de niveaux et le degré de
 * l'architecture — et pas seulement l'échelle :
 *
 *   moins de 60 m²   petite maison : un seul volume, compact, toit plat à
 *                    faible débord, terrasse réduite, ni auvent ni poteaux.
 *   60 à 110 m²      villa d'architecte de plain-pied : le programme complet
 *                    (mur-rideau, terrasse, auvent) sur un seul niveau.
 *   110 à 200 m²     villa à deux niveaux : le volume haut en retrait, en
 *                    porte-à-faux et bardé de bois.
 *   200 à 300 m²     trois niveaux, le dernier en attique désaxé.
 *   300 m² et plus   la propriété : trois niveaux et une aile basse avec sa
 *                    propre dalle, dans le prolongement du séjour.
 *
 * Changer de palier RECONSTRUIT la maison (voir `appliquerEtat`) : le nombre de
 * volumes change, ce qu'aucun redimensionnement ne peut faire.
 */
const PALIER_PETITE = 60
const PALIER_DEUX_NIVEAUX = 110
const PALIER_TROIS_NIVEAUX = 200
const SURFACE_EXCEPTION = 300

/** Hauteur d'un niveau, en unités de scène : des plafonds généreux. */
const HAUTEUR_NIVEAU = 1.78

/** Nombre de niveaux de la villa pour une surface habitable donnée. */
const niveauxVilla = (surface) => {
  const s = surface || 100
  if (s < PALIER_DEUX_NIVEAUX) return 1
  if (s < PALIER_TROIS_NIVEAUX) return 2
  return 3
}

/**
 * Emprise au sol de la villa, en unités de scène.
 *
 * La surface habitable se répartit sur les niveaux : à surface égale, une
 * maison à trois niveaux pose au sol trois fois moins qu'un plain-pied. C'est
 * ce qui fait qu'une grande maison monte au lieu de s'étaler, et c'est aussi ce
 * qui donne aux petites leur silhouette trapue.
 *
 * Le rapport largeur/profondeur de 1,45 est celui d'un plan de maison
 * individuelle ; `ECHELLE` convertit les mètres en unités de scène (la villa de
 * 100 m² y fait un peu plus de cinq unités de large, comme dans la maquette
 * d'origine).
 */
const ECHELLE = 0.45
const empriseVilla = (surface, niveaux) => {
  const habitable = Math.max(25, Math.min(900, surface || 100))
  const auSol = habitable / niveaux
  const largeurM = Math.sqrt(auSol * 1.45)
  return { largeur: largeurM * ECHELLE, profondeur: (auSol / largeurM) * ECHELLE }
}

/**
 * Bornes du facteur de surface. La maquette de référence étalait 20 à 400 m² ;
 * notre curseur va jusqu'à 800, d'où une borne haute repoussée à 500 — au-delà,
 * le bâtiment cesse de grandir plutôt que d'écraser la scène.
 */
const SURFACE_PLANCHER = 20
const SURFACE_PLAFOND = 500

/** 0 pour le plus petit bien, 1 pour le plus grand. */
const facteurSurface = (surface) => {
  const borne = Math.max(SURFACE_PLANCHER, Math.min(SURFACE_PLAFOND, surface || 100))
  return (borne - SURFACE_PLANCHER) / (SURFACE_PLAFOND - SURFACE_PLANCHER)
}

/* -------------------------------------------------------------------------- */
/*  Matières                                                                  */
/* -------------------------------------------------------------------------- */

const pierre = () => new THREE.MeshStandardMaterial({ color: 0xe7dcc8, roughness: 0.72, metalness: 0.03 })
const pierreCreme = () => new THREE.MeshStandardMaterial({ color: 0xede6d6, roughness: 0.78, metalness: 0.02 })
const pierreSombre = () => new THREE.MeshStandardMaterial({ color: 0xd3c8ae, roughness: 0.85, metalness: 0.02 })
const toiture = () => new THREE.MeshStandardMaterial({ color: 0x2b323c, roughness: 0.5, metalness: 0.25 })
const zinc = () => new THREE.MeshStandardMaterial({ color: 0x3a424c, roughness: 0.5, metalness: 0.25 })
const bois = () => new THREE.MeshStandardMaterial({ color: 0x8b6a4e, roughness: 0.9 })

/** Enduit blanc cassé des volumes, et béton lissé des dalles et terrasses. */
const enduitBlanc = () =>
  new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.62, metalness: 0.02 })
const beton = () =>
  new THREE.MeshStandardMaterial({ color: 0xd9d3c7, roughness: 0.8, metalness: 0.02 })
const betonSombre = () =>
  new THREE.MeshStandardMaterial({ color: 0x8c8880, roughness: 0.7, metalness: 0.05 })

/** Métal noir mat : meneaux, poteaux, quincaillerie du projet. */
const metalNoir = () =>
  new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.35, metalness: 0.7 })

/** Verre clair du garde-corps : un voile, pas une vitre de séjour. */
const verreGardeCorps = () =>
  new THREE.MeshStandardMaterial({
    color: 0xbcd3dd,
    roughness: 0.08,
    metalness: 0.2,
    transparent: true,
    opacity: 0,
  })

const vitrage = () =>
  new THREE.MeshStandardMaterial({
    color: 0x89b0c2,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.2,
    metalness: 0.25,
    transparent: true,
    opacity: 0,
  })

const murVitre = () =>
  new THREE.MeshStandardMaterial({
    color: 0x18262d,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.12,
    metalness: 0.35,
    transparent: true,
    opacity: 0.72,
  })

const porte = () =>
  new THREE.MeshStandardMaterial({ color: 0x2b323c, roughness: 0.6, metalness: 0.2, transparent: true, opacity: 0 })

const bardage = () =>
  new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.75, metalness: 0.03, transparent: true, opacity: 0 })

const ferForge = () =>
  new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.4, metalness: 0.6, transparent: true, opacity: 0 })

const laiton = () =>
  new THREE.MeshStandardMaterial({ color: 0xc9a16b, roughness: 0.5, metalness: 0.3, transparent: true, opacity: 0 })

/** Dégradé de ciel, peint dans un canevas puis posé en fond de scène. */
function textureCiel() {
  const canvas = document.createElement('canvas')
  canvas.width = 8
  canvas.height = 256

  const ctx = canvas.getContext('2d')
  const degrade = ctx.createLinearGradient(0, 0, 0, 256)
  degrade.addColorStop(0, '#8fb8e8')
  degrade.addColorStop(0.45, '#c9dcee')
  degrade.addColorStop(0.75, '#eef3ee')
  degrade.addColorStop(1, '#f7f2e6')
  ctx.fillStyle = degrade
  ctx.fillRect(0, 0, 8, 256)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** Halo doré de l'étape finale : un disque dégradé, tourné vers la caméra. */
function textureHalo() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256

  const ctx = canvas.getContext('2d')
  const degrade = ctx.createRadialGradient(128, 128, 8, 128, 128, 128)
  degrade.addColorStop(0, 'rgba(214,170,104,0.95)')
  degrade.addColorStop(0.35, 'rgba(206,162,100,0.45)')
  degrade.addColorStop(0.7, 'rgba(201,161,107,0.14)')
  degrade.addColorStop(1, 'rgba(201,161,107,0)')
  ctx.fillStyle = degrade
  ctx.fillRect(0, 0, 256, 256)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/* -------------------------------------------------------------------------- */
/*  Le chantier                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Monte la scène dans un canevas et rend la main sur trois commandes :
 * `appliquer` (nouvel état du parcours), `dimensionner` (le conteneur a changé
 * de taille) et `detruire`.
 *
 * Écrit en fermeture plutôt qu'en classe, et tenu à l'écart de React : rien
 * là-dedans ne doit provoquer de rendu, et l'animation tourne sur sa propre
 * boucle.
 */
function creerChantier(canvas, { mouvementReduit }) {
  // Gestion des couleurs désactivée, à dessein. Depuis r152, three convertit les
  // couleurs données en hexadécimal (sRGB) vers l'espace linéaire avant de les
  // éclairer ; r128, où la maquette a été réglée, ne le faisait pas, et c'est de
  // là que vient sa lumière pâle de plein soleil — pierre blonde, verdure
  // délavée, horizon qui se fond dans le ciel. Rétablir la conversion donnerait
  // une scène juste mais plus sourde, et surtout différente de ce qui a été
  // validé. Le réglage est global à three, qui n'est chargé que pour ce décor.
  THREE.ColorManagement.enabled = false

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  // `PCFSoftShadowMap` a été retiré de three : c'est `PCFShadowMap` qui prend sa
  // place, et le moteur y retombait de lui-même en le signalant en console.
  renderer.shadowMap.type = THREE.PCFShadowMap

  const scene = new THREE.Scene()
  scene.background = textureCiel()
  // Brouillard léger : c'est lui qui donne la profondeur, et qui évite au sol
  // circulaire de finir sur une arête franche à l'horizon.
  scene.fog = new THREE.Fog(0xcfe0ea, 26, 90)

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 300)

  scene.add(new THREE.HemisphereLight(0xdfeeff, 0x8a7a5e, 0.65 * FACTEUR_LUMIERE))

  const soleil = new THREE.DirectionalLight(0xfff3df, 1.15 * FACTEUR_LUMIERE)
  soleil.position.set(18, 26, 12)
  soleil.castShadow = true
  soleil.shadow.mapSize.set(2048, 2048)
  soleil.shadow.camera.left = -20
  soleil.shadow.camera.right = 20
  soleil.shadow.camera.top = 20
  soleil.shadow.camera.bottom = -20
  soleil.shadow.camera.near = 1
  soleil.shadow.camera.far = 60
  soleil.shadow.bias = -0.0018
  scene.add(soleil)

  const sol = new THREE.Mesh(
    new THREE.CircleGeometry(70, 48),
    new THREE.MeshStandardMaterial({ color: 0x8fae72, roughness: 0.95 }),
  )
  sol.rotation.x = -Math.PI / 2
  sol.receiveShadow = true
  scene.add(sol)

  // La zone de chantier : une plateforme de terre battue, qui s'élargit avec
  // l'emprise du bâtiment.
  const plateforme = new THREE.Mesh(
    new THREE.CircleGeometry(7, 40),
    new THREE.MeshStandardMaterial({ color: 0xcdbb9d, roughness: 0.95 }),
  )
  plateforme.rotation.x = -Math.PI / 2
  plateforme.position.y = 0.012
  plateforme.receiveShadow = true
  scene.add(plateforme)

  const batiment = new THREE.Group()
  scene.add(batiment)

  // Halo de l'étape finale — posé une fois pour toutes, invisible jusque-là.
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textureHalo(),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  halo.visible = false
  scene.add(halo)

  const cercleOr = new THREE.Mesh(
    new THREE.RingGeometry(1, 1.13, 72),
    new THREE.MeshBasicMaterial({ color: 0xb98b44, transparent: true, opacity: 0, side: THREE.DoubleSide }),
  )
  cercleOr.rotation.x = -Math.PI / 2
  cercleOr.position.y = 0.02
  cercleOr.visible = false
  scene.add(cercleOr)

  // Horloge maison plutôt que `THREE.Clock`, déprécié : deux soustractions sur
  // `performance.now()` suffisent, et il n'y a rien à importer pour cela.
  let instantPrecedent = performance.now()
  let secondesEcoulees = 0

  /** État du parcours, tel que la page le décrit. */
  const etat = { stade: 0, type: null, surface: 100, niveaux: null, zone: 'centre' }

  /** Dernière taille connue du canevas — le décentrement s'exprime en pixels. */
  const taille = { largeur: 1, hauteur: 1 }

  /** Grandeurs lissées : la cible saute, la valeur suit. */
  const val = {
    hauteur: 0,
    largeur: 4,
    profondeur: 3,
    toit: 0,
    porte: 0,
    fenetre: 0,
    lumiere: 0,
    poteau: 0,
    panneau: 0,
    halo: 0,
  }
  const cible = { ...val }

  const drone = { rayon: 26, hauteur: 10, regard: 1.5, angle: 0 }
  const droneCible = { rayon: 26, hauteur: 10, regard: 1.5 }

  /** Dérive accumulée depuis l'arrivée sur le plan en cours. */
  let derive = 0

  /** Encombrement du bâtiment visé — ce que le cadrage doit contenir. Valeurs
      d'attente : le gabarit d'une villa moyenne, le temps qu'un premier état
      arrive. */
  const envergure = { largeur: 4.6, hauteur: 3.5 }

  /* ---------------------------- construction ---------------------------- */

  // Pièces nommées du bâtiment courant. Remises à null à chaque changement de
  // type : c'est `placer()` qui les relit à chaque image, et il ne doit jamais
  // toucher une pièce de l'architecture précédente.
  let mur = null
  let toit = null
  let vantail = null
  let murRideau = null
  let terrasse = null
  let volumes = []
  let auvent = null
  let seuil = null
  let bandeauLumiere = null
  let poteaux = []
  let meneaux = []
  let lamesBois = []
  let socle = null
  let attique = null
  let mansart = null
  let marquise = null
  let linteau = null
  let gardeCorps = null
  let poteau = null
  let panneauVente = null
  let panneauCanvas = null
  let panneauTexture = null
  let ailes = []
  let fenetres = []

  function viderBatiment() {
    batiment.traverse((objet) => {
      if (!objet.isMesh) return
      objet.geometry?.dispose()
      objet.material?.map?.dispose()
      objet.material?.dispose()
    })
    batiment.clear()

    mur = toit = vantail = murRideau = terrasse = null
    auvent = seuil = bandeauLumiere = null
    volumes = []
    poteaux = []
    meneaux = []
    lamesBois = []
    socle = attique = mansart = marquise = linteau = gardeCorps = null
    poteau = panneauVente = panneauCanvas = panneauTexture = null
    ailes = []
    fenetres = []
  }

  /**
   * LA VILLA D'ARCHITECTE.
   *
   * Pas une boîte coiffée d'un toit : un projet, avec ce qui fait qu'on
   * reconnaît une maison d'architecte au premier coup d'œil —
   *
   *   • deux volumes décalés, le haut plus étroit, en retrait à l'arrière et en
   *     PORTE-À-FAUX sur la façade : c'est ce décalage qui fait l'architecture,
   *     et rien d'autre ne le remplace ;
   *   • une dalle de toiture fine, très débordante, à l'aplomb du vide ;
   *   • un mur-rideau toute hauteur sur le séjour, découpé de meneaux fins —
   *     une baie sans meneaux se lit comme un trou noir, avec eux comme une
   *     verrière ;
   *   • un bardage de tasseaux de bois sombre sur le volume haut, lame à lame ;
   *   • une terrasse de béton lissé qui déborde du bâti, un auvent porté par
   *     deux poteaux d'acier, un garde-corps de verre sur le toit du bas ;
   *   • un bandeau de lumière chaude sous le débord, qui s'allume le soir venu.
   *
   * Chaque pièce est une primitive à l'échelle 1 que `placer()` redimensionne à
   * chaque image : la villa se déforme avec la surface déclarée et se construit
   * avec le stade, sans jamais être reconstruite.
   */
  function construireVilla({ niveaux, petite, exception }) {
    viderBatiment()

    const ajouter = (mesh, { ombre = true, recoit = false } = {}) => {
      mesh.castShadow = ombre
      mesh.receiveShadow = recoit
      batiment.add(mesh)
      return mesh
    }

    // Terrasse de béton lissé, posée dès le premier stade : c'est la dalle du
    // chantier avant d'être la terrasse du séjour.
    terrasse = ajouter(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), beton()), {
      ombre: false,
      recoit: true,
    })

    // UN VOLUME PAR NIVEAU. Ils montent l'un après l'autre : chacun se remplit
    // quand la hauteur générale atteint sa tranche (voir `placer`), ce qui
    // donne, à l'écran, une maison qui s'élève étage par étage.
    volumes = Array.from({ length: niveaux }, () =>
      ajouter(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), enduitBlanc()), { recoit: true }),
    )
    mur = volumes[0]

    // Dalle de toiture, fine et débordante. Elle DESCEND du ciel au stade du
    // toit (voir `placer`) : elle ne se contente pas d'apparaître.
    toit = ajouter(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), betonSombre()))
    toit.material.transparent = true

    // Auvent de la terrasse et ses deux poteaux d'acier — le programme des
    // villas, pas celui des petites maisons.
    if (!petite) {
      auvent = ajouter(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), betonSombre()))
      auvent.material.transparent = true

      poteaux = [-1, 1].map((cote) => {
        const poteau = ajouter(
          new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1, 12), metalNoir()),
        )
        poteau.material.transparent = true
        poteau.userData.cote = cote
        return poteau
      })
    }

    // Mur-rideau du séjour et ses meneaux : une baie sans meneaux se lit comme
    // un trou noir, avec eux comme une verrière.
    murRideau = ajouter(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), murVitre()), {
      ombre: false,
    })

    meneaux = Array.from({ length: petite ? 3 : 5 }, () => {
      const meneau = ajouter(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), metalNoir()), {
        ombre: false,
      })
      meneau.material.transparent = true
      return meneau
    })

    // Bardage à claire-voie sur le volume le plus haut : des tasseaux, pas un
    // aplat. Une petite maison en reçoit moins, et seulement en façade.
    lamesBois = Array.from({ length: petite ? 5 : 11 }, () =>
      ajouter(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bardage())),
    )

    // Garde-corps de verre sur le toit-terrasse du premier niveau : il n'a de
    // sens que s'il y a un niveau au-dessus pour le border.
    if (niveaux > 1) {
      gardeCorps = ajouter(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), verreGardeCorps()), {
        ombre: false,
      })
    }

    // Bandeau de lumière chaude sous le débord du toit.
    bandeauLumiere = ajouter(
      new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({
          color: 0xf6c978,
          emissive: 0xf6c978,
          emissiveIntensity: 0,
          roughness: 0.4,
          transparent: true,
          opacity: 0,
        }),
      ),
      { ombre: false },
    )

    // Entrée : un vantail sombre et son seuil de pierre.
    vantail = ajouter(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), porte()), { ombre: false })
    seuil = ajouter(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), beton()), {
      ombre: false,
      recoit: true,
    })
    seuil.material.transparent = true

    // L'aile basse des propriétés : un volume de plus dans le prolongement du
    // séjour, avec sa propre dalle. C'est ainsi que s'étendent les maisons
    // d'architecte — en ajoutant un corps, pas en grossissant.
    if (exception) {
      ailes = [
        ajouter(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), enduitBlanc()), { recoit: true }),
        ajouter(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), betonSombre())),
      ]
      ailes.forEach((piece) => {
        piece.material.transparent = true
        piece.material.opacity = 0
      })
    }
  }

  function construireImmeuble() {
    viderBatiment()

    mur = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), pierreCreme())
    mur.castShadow = true
    mur.receiveShadow = true
    batiment.add(mur)

    // Socle de pierre à bossage, au niveau de la rue.
    socle = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), pierreSombre())
    socle.castShadow = true
    socle.receiveShadow = true
    batiment.add(socle)

    // Attique en retrait et toit mansardé : la silhouette haussmannienne.
    attique = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), pierreSombre())
    attique.castShadow = true
    attique.material.transparent = true
    batiment.add(attique)

    mansart = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), zinc())
    mansart.rotation.y = Math.PI / 4
    mansart.castShadow = true
    mansart.material.transparent = true
    batiment.add(mansart)

    // Garde-corps de fer forgé de l'étage noble.
    gardeCorps = new THREE.Mesh(new THREE.BoxGeometry(1, 0.22, 0.05), ferForge())
    batiment.add(gardeCorps)

    marquise = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.6), laiton())
    batiment.add(marquise)

    // Linteau de pierre au-dessus de l'entrée.
    linteau = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.14, 0.14), pierreCreme())
    linteau.material.transparent = true
    batiment.add(linteau)

    vantail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.95, 0.08), porte())
    batiment.add(vantail)
  }

  function construireTerrain() {
    viderBatiment()

    poteau = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 10), bois())
    poteau.castShadow = true
    batiment.add(poteau)

    panneauCanvas = document.createElement('canvas')
    panneauCanvas.width = 256
    panneauCanvas.height = 96
    panneauTexture = new THREE.CanvasTexture(panneauCanvas)
    panneauTexture.colorSpace = THREE.SRGBColorSpace

    panneauVente = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.6),
      new THREE.MeshStandardMaterial({
        map: panneauTexture,
        roughness: 0.8,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      }),
    )
    batiment.add(panneauVente)
    ecrirePanneau('À vendre')
  }

  function ecrirePanneau(texte) {
    if (!panneauCanvas) return
    const ctx = panneauCanvas.getContext('2d')
    ctx.clearRect(0, 0, 256, 96)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 256, 96)
    ctx.strokeStyle = '#20242B'
    ctx.lineWidth = 4
    ctx.strokeRect(4, 4, 248, 88)
    ctx.fillStyle = '#20242B'
    ctx.font = '600 30px "Space Grotesk", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(texte, 128, 50)
    panneauTexture.needsUpdate = true
  }

  function refaireFenetres(nombre, forme) {
    fenetres.forEach((f) => {
      batiment.remove(f)
      f.geometry.dispose()
      f.material.dispose()
    })
    fenetres = []

    const dim = forme === 'haute' ? [0.3, 0.62, 0.06] : [0.42, 0.5, 0.06]
    for (let i = 0; i < nombre; i += 1) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(dim[0], dim[1], dim[2]), vitrage())
      batiment.add(f)
      fenetres.push(f)
    }
  }

  /* ------------------------- état → cibles ------------------------- */

  /** Architecture attendue pour le type reçu. */
  const familleArchitecture = (type) => {
    if (type === 'appartement') return 'immeuble'
    if (type === 'terrain') return 'terrain'
    // `maison`, `autre`, et le repli du tout début de parcours, où la détection
    // n'a pas encore eu lieu : le chantier commence en villa.
    return 'villa'
  }

  let familleMontee = null
  let exceptionMontee = false
  let niveauxMontes = 0
  let petiteMontee = false

  function appliquerEtat() {
    const { stade, surface } = etat
    const f = facteurSurface(surface)
    const famille = familleArchitecture(etat.type)
    const exception = famille === 'villa' && (surface || 0) >= SURFACE_EXCEPTION
    const niveaux = famille === 'villa' ? niveauxVilla(surface) : 0
    const petite = famille === 'villa' && (surface || 0) < PALIER_PETITE

    // Le programme change → la maison se reconstruit. Un palier franchi, ce
    // n'est pas une maison plus grande : c'est un volume de plus, un auvent qui
    // apparaît, un garde-corps qui n'avait pas lieu d'être.
    const changeDeProgramme =
      famille !== familleMontee ||
      (famille === 'villa' &&
        (exception !== exceptionMontee ||
          niveaux !== niveauxMontes ||
          petite !== petiteMontee))

    if (changeDeProgramme) {
      if (famille === 'villa') construireVilla({ niveaux, petite, exception })
      else if (famille === 'immeuble') construireImmeuble()
      else construireTerrain()
      familleMontee = famille
      exceptionMontee = exception
      niveauxMontes = niveaux
      petiteMontee = petite
    }

    if (famille === 'villa') {
      const emprise = empriseVilla(surface, niveaux)
      cible.largeur = emprise.largeur
      cible.profondeur = emprise.profondeur
      const pleine = niveaux * HAUTEUR_NIVEAU
      cible.hauteur = stade <= 0 ? 0.12 : stade === 1 ? pleine * 0.45 : pleine
      cible.toit = stade >= 3 ? 1 : 0
      cible.fenetre = stade >= 4 ? 1 : 0
      cible.porte = stade >= 5 ? 1 : 0
      cible.lumiere = stade >= 6 ? 1 : 0

      // Nombre de baies sur le pignon du volume haut : la maquette le tirait du
      // nombre de pièces, que notre parcours ne demande pas. La surface
      // habitable en tient lieu — c'est la seule chose que l'utilisateur
      // déclare de son logement.
      const nb = Math.min(4, Math.max(2, Math.round((surface || 100) / 70)))
      if (fenetres.length !== nb) refaireFenetres(nb, 'large')
    } else if (famille === 'immeuble') {
      const etages = niveauxImmeuble()
      cible.largeur = 3.0 + f * 1.2
      cible.profondeur = 3.0 + f * 1.2
      const pleine = etages * 1.5
      cible.hauteur = stade <= 0 ? 0.15 : stade === 1 ? pleine * 0.4 : pleine
      cible.toit = stade >= 3 ? 1 : 0
      cible.fenetre = stade >= 4 ? 1 : 0
      cible.porte = stade >= 5 ? 1 : 0
      cible.lumiere = stade >= 6 ? 1 : 0

      const nb = etages * 3
      if (fenetres.length !== nb) refaireFenetres(nb, 'haute')
    } else {
      cible.largeur = 5 + f * 3
      cible.profondeur = 4 + f * 2.4
      cible.poteau = stade <= 0 ? 0.02 : 1.6
      cible.panneau = stade >= 3 ? 1 : 0
      ecrirePanneau(stade >= 5 ? 'Réservé' : 'À vendre')
    }

    cible.halo = stade >= 7 ? 1 : 0

    // Encombrement visé du bâtiment — toiture, attique et ailes comprises, et
    // non la seule emprise au sol : c'est ce que le drone doit tenir dans son
    // cadre. Largeur et hauteur sont suivies à part, l'une se heurtant aux
    // bords de la fenêtre et l'autre à son sommet.
    if (famille === 'villa') {
      // La villa n'est plus un cube : la terrasse déborde de deux mètres, la
      // dalle de toiture d'un mètre et demi, et l'aile des grandes propriétés
      // prolonge encore le tout. Cadrer sur les seuls murs reviendrait à couper
      // le projet à l'endroit précis où il commence à ressembler à quelque
      // chose.
      envergure.largeur = Math.max(
        cible.largeur + 2.1 + (exception ? cible.largeur * 0.62 + 0.8 : 0),
        cible.profondeur + 1.7,
      )
      envergure.hauteur = cible.hauteur + 0.35
    } else {
      envergure.largeur = Math.max(cible.largeur, cible.profondeur)
      envergure.hauteur = cible.hauteur + (famille === 'immeuble' ? 1.85 : 0.22)
    }

    cadrer()
  }

  /**
   * Place le drone : assez loin pour que le bâtiment tienne dans le cadre avec
   * sa marge, puis rapproché ou reculé selon le stade — c'est le rapport des
   * distances de la maquette qui donne ce mouvement, et sa hauteur de vol qui
   * donne l'angle de plongée, l'un comme l'autre conservés à l'identique.
   *
   * Appelée à chaque changement d'état ET à chaque redimensionnement : sur une
   * fenêtre étroite, c'est l'ouverture horizontale qui cadre, et elle change
   * avec la largeur.
   */
  function cadrer() {
    const s = Math.max(0, Math.min(7, etat.stade))

    const bande = etat.zone === 'haut' ? BANDE_HAUTE : 1

    const ouvertureVerticale = (camera.fov * Math.PI) / 180
    const ouvertureHorizontale =
      2 * Math.atan(Math.tan(ouvertureVerticale / 2) * camera.aspect)
    // Ouverture réellement disponible en hauteur : la bande libre, pas le
    // canevas entier. Sur téléphone, le drone recule donc de ce qu'il faut pour
    // que le bien tienne au-dessus du panneau.
    const ouvertureUtile = 2 * Math.atan(Math.tan(ouvertureVerticale / 2) * bande)

    // Le bâtiment doit tenir dans les deux sens : on retient la distance la plus
    // contraignante des deux. Sur une fenêtre large c'est la hauteur qui
    // commande, sur une fenêtre étroite la largeur.
    //
    // La demi-largeur est ajoutée au résultat : ce calcul cadre un objet plat,
    // or celui-ci a de l'épaisseur, et c'est sa face la plus proche qui remplit
    // le cadre — sans cette rallonge, le drone se retrouve le nez dessus dès
    // qu'il passe dans l'axe d'une façade.
    const distance =
      envergure.largeur / 2 +
      Math.max(
        envergure.largeur / 2 / Math.tan(ouvertureHorizontale / 2),
        envergure.hauteur / 2 / Math.tan(ouvertureUtile / 2),
      ) * MARGE_CADRAGE

    const plan = PLANS[s]
    droneCible.rayon = distance * plan.recul
    // L'altitude découle de l'angle de plongée du plan, et non l'inverse :
    // c'est l'angle qui est composé, la hauteur n'en est que la conséquence.
    droneCible.hauteur = Math.max(1.1, droneCible.rayon * plan.elevation)
    droneCible.regard = Math.max(0.5, cible.hauteur * plan.regard)

    decentrer()
  }

  /**
   * Décentre l'objectif pour poser le bâtiment dans la bande libre.
   *
   * `setViewOffset` revient à rendre une fenêtre décalée d'une image plus
   * grande : le sujet, qui est au centre de cette image, se retrouve dans le
   * haut de ce qu'on affiche. C'est la translation d'un objectif à décentrement,
   * et non une caméra qu'on incline — les murs restent d'aplomb, et l'horizon
   * ne bascule pas.
   */
  function decentrer() {
    const { largeur, hauteur } = taille
    if (largeur <= 0 || hauteur <= 0) return

    const plan = PLANS[Math.max(0, Math.min(7, etat.stade))]

    // Panneau rangé en bas (téléphone, tablette) : le bâtiment se cale dans la
    // bande haute, et le décentrement horizontal du plan n'a plus lieu d'être —
    // le panneau occupe toute la largeur, il n'y a pas de côté libre.
    //
    // Panneau centré (ordinateur) : le bâtiment part à droite ou à gauche selon
    // le plan, et c'est là qu'il se voit.
    const enHaut = etat.zone === 'haut'
    const decalageX = enHaut ? 0 : -plan.cadre * largeur
    const decalageY = enHaut ? (hauteur * (1 - BANDE_HAUTE)) / 2 : 0

    if (decalageX === 0 && decalageY === 0) {
      camera.clearViewOffset()
      return
    }

    camera.setViewOffset(largeur, hauteur, decalageX, decalageY, largeur, hauteur)
  }

  /**
   * Nombre d'étages de l'immeuble. La maquette le déduisait du nombre de
   * pièces ; ici, c'est le nombre de niveaux relevé sur le bâtiment cliqué
   * (BD TOPO®, puis BDNB) quand il est connu — une donnée réelle valant mieux
   * qu'une règle —, et à défaut la surface déclarée.
   */
  function niveauxImmeuble() {
    const releve = Number(etat.niveaux)
    if (Number.isFinite(releve) && releve > 0) return Math.max(2, Math.min(5, Math.round(releve)))
    return Math.max(2, Math.min(5, Math.round((etat.surface || 100) / 45) + 1))
  }

  /* ------------------------- mise en place, par image ------------------------- */

  function placer() {
    const l = val.largeur
    const h = val.hauteur
    const p = val.profondeur

    if (familleMontee === 'villa' && mur) {
      const petite = petiteMontee
      const eDalle = 0.16
      const y0 = eDalle
      const n = volumes.length

      // Décalages d'un niveau au suivant : plus étroit, en retrait à l'arrière,
      // en porte-à-faux sur la façade, et désaxé une fois à gauche une fois à
      // droite. C'est ce jeu-là qui fait l'architecture — un empilement d'aplomb
      // ne serait qu'un immeuble en miniature.
      const gabarit = (i) => {
        const retrait = 1 - i * 0.26
        return {
          largeur: l * retrait,
          profondeur: p * (1 - i * 0.2),
          x: i === 0 ? 0 : (i % 2 === 1 ? -1 : 1) * l * 0.13,
          z: i === 0 ? 0 : -p * 0.08 * i + (i === 1 ? p * 0.16 : 0),
        }
      }

      // LES NIVEAUX MONTENT L'UN APRÈS L'AUTRE. `h` est la hauteur totale
      // visée ; chaque volume prend sa tranche et se remplit à son tour.
      const hNiveau = HAUTEUR_NIVEAU
      let sommet = y0
      let hautIndex = 0
      volumes.forEach((volume, i) => {
        const g = gabarit(i)
        const hVolume = Math.max(0, Math.min(hNiveau, h - i * hNiveau))
        volume.scale.set(g.largeur, Math.max(0.04, hVolume), g.profondeur)
        volume.position.set(g.x, y0 + i * hNiveau + hVolume / 2, g.z)
        volume.visible = hVolume > 0.04
        if (hVolume > 0.04) {
          sommet = y0 + i * hNiveau + hVolume
          hautIndex = i
        }
      })

      const gHaut = gabarit(hautIndex)
      const gBas = gabarit(0)
      const hBas = Math.max(0.04, Math.min(hNiveau, h))

      terrasse.scale.set(l + (petite ? 1.2 : 2.1), eDalle, p + (petite ? 1 : 1.7))
      terrasse.position.set(petite ? 0 : 0.1, eDalle / 2, petite ? 0.15 : 0.25)

      // LA DALLE DE TOITURE DESCEND. Elle part de trois mètres au-dessus de son
      // assise et se pose à mesure que `val.toit` progresse : c'est un toit
      // qu'on pose, pas un toit qui apparaît.
      const debord = petite ? 0.55 : 1.5
      const yToit = y0 + Math.max(hNiveau, h) + 0.09
      toit.scale.set(gHaut.largeur + debord, 0.18, gHaut.profondeur + debord)
      toit.position.set(gHaut.x, yToit + (1 - val.toit) * 3.2, gHaut.z)
      toit.material.opacity = Math.min(1, val.toit * 1.6)
      toit.visible = val.toit > 0.02

      // L'auvent de la terrasse descend de la même façon, un souffle plus tard.
      const retardAuvent = Math.max(0, (val.toit - 0.18) / 0.82)
      const yAuvent = y0 + hBas - 0.12
      if (auvent) {
        auvent.scale.set(l * 0.96, 0.13, 1.75)
        auvent.position.set(0, yAuvent + (1 - retardAuvent) * 2.6, p / 2 + 0.75)
        auvent.material.opacity = retardAuvent
        auvent.visible = retardAuvent > 0.02

        poteaux.forEach((poteau) => {
          const hPoteau = Math.max(0.05, yAuvent - eDalle)
          poteau.scale.set(1, hPoteau, 1)
          poteau.position.set(poteau.userData.cote * l * 0.4, eDalle + hPoteau / 2, p / 2 + 1.5)
          poteau.material.opacity = retardAuvent
          poteau.visible = retardAuvent > 0.02
        })
      }

      // Mur-rideau du séjour, toute hauteur, et ses meneaux.
      const lBaie = l * 0.68
      const hBaie = Math.max(0.05, hBas - 0.24)
      murRideau.scale.set(lBaie, hBaie, 0.07)
      murRideau.position.set(l * 0.1, y0 + hBaie / 2 + 0.06, p / 2 + 0.04)
      murRideau.material.opacity = 0.34 + val.fenetre * 0.42
      murRideau.material.emissive.setHex(0xf6c978)
      murRideau.material.emissiveIntensity = val.lumiere * 1.05

      meneaux.forEach((meneau, i) => {
        const x = l * 0.1 + (i - (meneaux.length - 1) / 2) * (lBaie / meneaux.length)
        meneau.scale.set(0.05, hBaie, 0.1)
        meneau.position.set(x, y0 + hBaie / 2 + 0.06, p / 2 + 0.06)
        meneau.material.opacity = val.fenetre
        meneau.visible = val.fenetre > 0.02
      })

      // Bardage à claire-voie sur le volume le plus haut : lame à lame, en
      // façade et sur le pignon gauche.
      const hHaut = Math.max(0, Math.min(hNiveau, h - hautIndex * hNiveau))
      const hLame = Math.max(0.05, hHaut - 0.18)
      const yLame = y0 + hautIndex * hNiveau + hHaut / 2
      const enFacade = petite ? lamesBois.length : 7
      lamesBois.forEach((lame, i) => {
        if (i < enFacade) {
          const x = gHaut.x + (i - (enFacade - 1) / 2) * (gHaut.largeur / (enFacade + 0.6))
          lame.scale.set(0.1, hLame, 0.07)
          lame.position.set(x, yLame, gHaut.z + gHaut.profondeur / 2 + 0.04)
        } else {
          const z = gHaut.z + (i - 8.5) * (gHaut.profondeur / 4.4)
          lame.scale.set(0.07, hLame, 0.1)
          lame.position.set(gHaut.x - gHaut.largeur / 2 - 0.04, yLame, z)
        }
        lame.material.opacity = val.fenetre * 0.95
        lame.visible = val.fenetre > 0.02 && hHaut > 0.2
      })

      // Garde-corps de verre sur le toit-terrasse du premier niveau.
      if (gardeCorps) {
        gardeCorps.scale.set(gBas.largeur * 0.52, 0.44, 0.04)
        gardeCorps.position.set(l * 0.22, y0 + hNiveau + 0.22, p / 2 - 0.1)
        gardeCorps.material.opacity = val.fenetre * 0.5
        gardeCorps.visible = val.fenetre > 0.02 && h > hNiveau + 0.2
      }

      // Bandeau lumineux sous le débord : il ne s'allume qu'au soir venu.
      bandeauLumiere.scale.set(gHaut.largeur + debord * 0.8, 0.05, 0.05)
      bandeauLumiere.position.set(
        gHaut.x,
        yToit - 0.12,
        gHaut.z + gHaut.profondeur / 2 + debord * 0.45,
      )
      bandeauLumiere.material.emissiveIntensity = val.lumiere * 2.2
      bandeauLumiere.material.opacity = val.lumiere
      bandeauLumiere.visible = val.lumiere > 0.02

      // Entrée : vantail encastré en bout de façade, et son seuil.
      const hPorte = Math.max(0.05, Math.min(1.15, hBas * 0.62))
      vantail.scale.set(0.82, hPorte, 0.09)
      vantail.position.set(-l * 0.33, y0 + hPorte / 2, p / 2 + 0.05)
      vantail.material.opacity = val.porte
      vantail.visible = val.porte > 0.02

      seuil.scale.set(1.5, 0.05, 0.8)
      seuil.position.set(-l * 0.33, eDalle + 0.02, p / 2 + 0.5)
      seuil.material.opacity = val.porte * 0.9
      seuil.visible = val.porte > 0.02

      // Fenêtres du volume le plus haut, sur son pignon droit.
      const nf = fenetres.length
      fenetres.forEach((f, i) => {
        const z = gHaut.z + (i - (nf - 1) / 2) * (gHaut.profondeur / (nf + 0.6))
        f.rotation.y = Math.PI / 2
        f.position.set(gHaut.x + gHaut.largeur / 2 + 0.04, yLame, z)
        f.visible = hHaut > 0.2
        eclairerVitre(f.material)
      })

      // Aile basse des propriétés.
      if (ailes.length === 2) {
        const [aile, dalleAile] = ailes
        const lAile = l * 0.62
        const hAile = hNiveau * 0.86
        const xAile = -(l / 2 + lAile / 2 + 0.05)

        aile.scale.set(lAile, Math.max(0.05, Math.min(hAile, h)), p * 0.76)
        aile.position.set(xAile, y0 + Math.min(hAile, h) / 2, -0.15)
        aile.material.opacity = val.fenetre
        aile.visible = val.fenetre > 0.02

        dalleAile.scale.set(lAile + 0.7, 0.15, p * 0.76 + 0.7)
        dalleAile.position.set(xAile, y0 + Math.min(hAile, h) + 0.07, -0.15)
        dalleAile.material.opacity = val.fenetre
        dalleAile.visible = val.fenetre > 0.02
      }
    } else if (familleMontee === 'immeuble' && mur) {
      mur.scale.set(l, h, p)
      mur.position.y = h / 2

      const hSocle = Math.min(1.1, Math.max(0.05, h * 0.28))
      socle.scale.set(l + 0.14, hSocle, p + 0.14)
      socle.position.y = hSocle / 2
      socle.visible = h > 0.06

      const lAttique = l * 0.72
      const pAttique = p * 0.72
      const hAttique = 0.85
      attique.scale.set(lAttique, hAttique, pAttique)
      attique.position.y = h + hAttique / 2
      attique.material.opacity = val.toit
      attique.visible = val.toit > 0.02

      const rMansart =
        Math.sqrt((lAttique / 2) * (lAttique / 2) + (pAttique / 2) * (pAttique / 2)) * 1.18
      const hMansart = 1.0
      mansart.scale.set(rMansart, hMansart, rMansart)
      mansart.position.y = h + hAttique + hMansart / 2
      mansart.material.opacity = val.toit
      mansart.visible = val.toit > 0.02

      marquise.position.set(0, 1.0, p / 2 + 0.3)
      marquise.material.opacity = val.porte
      marquise.visible = val.porte > 0.02

      linteau.position.set(0, 1.32, p / 2 + 0.09)
      linteau.material.opacity = val.porte
      linteau.visible = val.porte > 0.02

      vantail.position.set(0, 0.48, p / 2 + 0.05)
      vantail.material.opacity = val.porte
      vantail.visible = val.porte > 0.02

      fenetres.forEach((f, i) => {
        const etage = Math.floor(i / 3)
        const colonne = i % 3
        f.rotation.y = 0
        f.position.set((colonne - 1) * (l / 3.4), 0.95 + etage * 1.5, p / 2 + 0.04)
        eclairerVitre(f.material)
      })

      gardeCorps.scale.set(l * 0.55, 1, 1)
      gardeCorps.position.set(0, 0.95 + 1.5 - 0.42, p / 2 + 0.06)
      gardeCorps.material.opacity = val.toit
      gardeCorps.visible = val.toit > 0.02
    } else if (familleMontee === 'terrain' && poteau) {
      poteau.scale.set(1, Math.max(0.02, val.poteau), 1)
      poteau.position.set(l / 2 + 0.6, val.poteau / 2, 0)

      panneauVente.position.set(l / 2 + 0.6, Math.max(0.4, val.poteau + 0.4), 0.01)
      panneauVente.material.opacity = val.panneau
      panneauVente.visible = val.panneau > 0.02
    }

    plateforme.scale.set(Math.max(1, l / 6 + 0.6), 1, Math.max(1, p / 5 + 0.6))

    // Halo doré du bien achevé : un disque derrière le bâtiment, plus un cercle
    // au sol qui en reprend l'emprise.
    const enveloppe = Math.max(l, p, h) * 2.6
    halo.material.opacity = val.halo
    halo.visible = val.halo > 0.01
    halo.scale.set(enveloppe, enveloppe, 1)
    halo.position.set(0, Math.max(1, h * 0.55), 0)

    const rayonCercle = Math.max(l, p) * 0.78 + 1.2
    cercleOr.scale.set(rayonCercle, rayonCercle, 1)
    cercleOr.material.opacity = val.halo * 0.9
    cercleOr.visible = val.halo > 0.01
  }

  /** Vitrage : bleuté le jour, ambré dès que le logement s'éclaire. */
  function eclairerVitre(matiere) {
    matiere.opacity = val.fenetre
    matiere.emissive.setHex(0xf6c978)
    matiere.emissiveIntensity = val.lumiere * 1.1
    matiere.color.setHex(val.lumiere > 0.5 ? 0xf6c978 : 0x89b0c2)
  }

  /* ------------------------------- boucle ------------------------------- */

  let image = 0

  function animer() {
    image = requestAnimationFrame(animer)

    const maintenant = performance.now()
    const dt = Math.min((maintenant - instantPrecedent) / 1000, 0.05)
    instantPrecedent = maintenant
    secondesEcoulees += dt
    const t = secondesEcoulees
    // Trois vitesses de lissage, et c'est volontaire : ce qui doit SE VOIR est
    // ralenti, le reste suit.
    //
    //   `pas`       — le tout-venant (largeur, profondeur, lumières).
    //   `pasMur`    — la hauteur des murs. Deux fois plus lent : c'est le geste
    //                 le plus important de la scène, des murs qui s'élèvent, et
    //                 à la vitesse commune il était fini avant qu'on l'ait vu.
    //   `pasToit`   — la pose de la dalle de toiture, qui descend du ciel (voir
    //                 `placer`). Plus lent encore, parce qu'un toit se pose.
    const pas = mouvementReduit ? 1 : Math.min(1, dt * 1.6)
    const pasMur = mouvementReduit ? 1 : Math.min(1, dt * 0.8)
    const pasToit = mouvementReduit ? 1 : Math.min(1, dt * 0.62)

    Object.keys(val).forEach((cle) => {
      const vitesse = cle === 'hauteur' ? pasMur : cle === 'toit' ? pasToit : pas
      val[cle] += (cible[cle] - val[cle]) * vitesse
    })

    placer()

    const pasDrone = mouvementReduit ? 1 : Math.min(1, dt * 0.7)
    drone.rayon += (droneCible.rayon - drone.rayon) * pasDrone
    drone.hauteur += (droneCible.hauteur - drone.hauteur) * pasDrone
    drone.regard += (droneCible.regard - drone.regard) * pasDrone

    if (mouvementReduit) {
      camera.position.set(drone.rayon, drone.hauteur, 0)
    } else {
      // LE VOYAGE. L'azimut du plan en cours est la destination ; le drone s'y
      // rend en glissant, d'autant plus vite qu'il en est loin — un mouvement
      // qui démarre franc et se pose en douceur, comme un appareil qui rejoint
      // sa position. Sur un changement de stade, cela fait un quart de tour
      // parcouru en deux à trois secondes, pendant que le bâtiment change.
      derive += dt * PLANS[Math.max(0, Math.min(7, etat.stade))].derive
      const azimutVise = PLANS[Math.max(0, Math.min(7, etat.stade))].azimut + derive
      drone.angle += (azimutVise - drone.angle) * Math.min(1, dt * 0.62)

      // Respiration : le flottement d'un appareil en vol stationnaire. Sans
      // elle, un plan posé devient une photographie.
      const respiration = Math.sin(t * 0.23) * 0.5
      camera.position.set(
        Math.cos(drone.angle) * (drone.rayon + respiration),
        Math.max(0.8, drone.hauteur + Math.sin(t * 0.31) * 0.3),
        Math.sin(drone.angle) * (drone.rayon + respiration),
      )
    }

    camera.lookAt(0, drone.regard, 0)
    renderer.render(scene, camera)
  }

  animer()

  return {
    appliquer(suivant) {
      // Nouveau stade, nouveau plan : la dérive repart de zéro, sans quoi le
      // drone viserait un azimut déjà dépassé et rebrousserait chemin.
      if (suivant.stade !== undefined && suivant.stade !== etat.stade) derive = 0
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
      // Une fenêtre plus étroite, c'est une ouverture horizontale plus serrée :
      // le drone doit reculer d'autant pour garder le bâtiment entier.
      cadrer()
    },

    detruire() {
      cancelAnimationFrame(image)
      viderBatiment()
      scene.traverse((objet) => {
        if (!objet.isMesh && !objet.isSprite) return
        objet.geometry?.dispose()
        objet.material?.map?.dispose()
        objet.material?.dispose()
      })
      scene.background?.dispose?.()
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
  niveaux = null,
  zone = 'centre',
}) {
  const canvasRef = useRef(null)
  const chantierRef = useRef(null)
  const mouvementReduit = useReducedMotion()

  // La scène est montée une fois par écran (et remontée si l'utilisateur change
  // de réglage d'animations) : la construire est coûteux, la piloter ne l'est
  // pas — c'est `appliquer` qui reçoit les changements d'étape.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let chantier
    try {
      chantier = creerChantier(canvas, { mouvementReduit: Boolean(mouvementReduit) })
    } catch {
      // Pas de WebGL : le décor manque, le parcours reste entier.
      return undefined
    }

    chantierRef.current = chantier

    const suivre = new ResizeObserver(([entree]) => {
      const { width, height } = entree.contentRect
      chantier.dimensionner(width, height)
    })
    suivre.observe(canvas.parentElement ?? canvas)
    chantier.dimensionner(canvas.clientWidth, canvas.clientHeight)

    return () => {
      suivre.disconnect()
      chantierRef.current = null
      chantier.detruire()
    }
  }, [mouvementReduit])

  useEffect(() => {
    chantierRef.current?.appliquer({ stade, type, surface, niveaux, zone })
  }, [stade, type, surface, niveaux, zone])

  return <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
}
