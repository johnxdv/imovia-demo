import * as THREE from 'three'
import * as M from './matieres'
import { boite, buisson, fut, gardeCorpsFer, poser, revelable } from './kit'
import { HAUTEUR_ETAGE } from './immeuble'


/**
 * LA VISITE — hall, escalier en spirale, appartement.
 *
 * Un appartement ne se montre pas de l'extérieur : de la rue, on ne voit qu'un
 * immeuble, et l'immeuble n'est pas le bien. Alors on entre. La porte cochère
 * s'ouvre, on traverse le hall, on monte le puits de l'escalier — un tour par
 * étage déclaré —, la porte du palier s'ouvre vers l'intérieur, et
 * l'appartement se dessine.
 *
 * LES TROIS LIEUX, et ce qui les fait reconnaître :
 *
 *   LE HALL — damier de marbre noir et blanc, soubassement mouluré, glace et
 *   console, boîtes aux lettres de laiton. C'est l'entrée d'un immeuble
 *   bourgeois, et elle se lit en une seconde.
 *
 *   L'ESCALIER — marches balancées de chêne, tapis grenat à médaillons retenu
 *   par ses barres de laiton, barreaudage de fer forgé et main courante de bois
 *   qui file en hélice. Le drone monte DANS LE PUITS, pas sur les marches :
 *   c'est de là qu'on voit la spirale, et c'est le seul endroit d'où elle se
 *   voit.
 *
 *   L'APPARTEMENT — parquet en point de Hongrie, moulures, cheminée de marbre,
 *   deux fenêtres à la française toute hauteur avec leur garde-corps. Il arrive
 *   NU, et se meuble à mesure que la surface déclarée grandit : un palier tous
 *   les 30 m², du tapis et du canapé jusqu'à la salle de bains.
 *
 * TOUT EST MONTÉ UNE FOIS. Rien n'est créé pendant l'animation — le mobilier
 * est là depuis le début et se révèle en opacité. Fabriquer une géométrie
 * pendant un travelling fait tomber une image, et une image qui tombe pendant
 * un mouvement de caméra se voit.
 */

/**
 * LA VISITE EST DESSINÉE EN MÈTRES, et elle est seule à l'être.
 *
 * Le décor extérieur travaille à l'échelle de la scène — une unité pour
 * environ 1,80 m —, ce qui convient à un immeuble vu de la rue mais pas à une
 * marche de 18 cm, à une main courante à 90 cm du nez de marche ou à un canapé.
 * L'intérieur est donc coté en mètres, comme un plan d'architecte, et le groupe
 * entier est réduit d'autant en entrant dans la scène : un niveau de la visite
 * tombe alors exactement sur un étage de l'immeuble, et un tour d'escalier sur
 * un étage.
 */
const HAUTEUR_NIVEAU = 3.0
export const ECHELLE_VISITE = HAUTEUR_ETAGE / HAUTEUR_NIVEAU
const ECHELLE = ECHELLE_VISITE

const TOUR = Math.PI * 2

/** Géométrie du puits d'escalier, en mètres. */
const RAYON_JOUR = 0.62
const RAYON_MARCHE = 1.62
const MARCHES_PAR_TOUR = 16
/** Axe du puits, en repère local de la visite. */
const AXE = new THREE.Vector3(0, 0, -3.3)
/**
 * Orientation de la première marche.
 *
 * Un étage vaut exactement un tour : la marche d'arrivée regarde donc toujours
 * dans la même direction, quel que soit l'étage. On la cale sur +Z — du côté
 * de l'appartement —, et le palier, la porte et la trémie du mur de cage
 * tombent d'aplomb à tous les niveaux, sans avoir à les faire tourner.
 */
const ANGLE_BASE = (3 * Math.PI) / 2
/** Ouverture laissée dans le mur de cage, côté paliers. */
const TREMIE = 0.82

/** Gabarit de l'appartement. */
const APPART = { largeur: 5.8, profondeur: 5.4, hauteur: 3.15 }
/** Le plan de l'appartement commence au nu du mur de la cage. */
const Z_FOND = AXE.z + RAYON_MARCHE + 0.16
const Z_FACADE = Z_FOND + APPART.profondeur

/** Nu de la façade dans le repère local — c'est sur lui que la scène aligne
    la visite avec la façade de l'immeuble. */
export const Z_FACADE_LOCAL = Z_FACADE

/**
 * Abscisse de repli de la porte cochère dans le repère de la visite.
 *
 * Le logement visité est aligné sur sa travée de façade ; la porte cochère est
 * sur une autre. L'écart entre les deux est une donnée de l'IMMEUBLE, pas de
 * la visite : la scène le mesure sur la façade et le passe à `creerInterieur`.
 * Cette valeur n'est qu'un repli, pour que le module reste utilisable seul.
 */
const ENTREE_X_DEFAUT = -6.4

/** Secteur annulaire — la marche balancée, et le tapis qui la couvre. */
function secteurAnnulaire(rInterieur, rExterieur, angle, epaisseur) {
  const forme = new THREE.Shape()
  forme.moveTo(rInterieur, 0)
  forme.lineTo(rExterieur, 0)
  forme.absarc(0, 0, rExterieur, 0, angle, false)
  forme.lineTo(rInterieur * Math.cos(angle), rInterieur * Math.sin(angle))
  forme.absarc(0, 0, rInterieur, angle, 0, true)

  const geometrie = new THREE.ExtrudeGeometry(forme, {
    depth: epaisseur,
    bevelEnabled: false,
    curveSegments: 6,
  })
  geometrie.rotateX(-Math.PI / 2)
  return geometrie
}

export function creerInterieur({ entreeX = ENTREE_X_DEFAUT } = {}) {
  const groupe = new THREE.Group()
  groupe.scale.setScalar(ECHELLE)

  /** Où la porte cochère s'ouvre, et sur quelle longueur le hall s'étend. */
  const ENTREE = new THREE.Vector3(entreeX, 0, Z_FACADE + 0.1)
  const HALL_X0 = entreeX - 1.7
  const HALL_X1 = 2.6
  const HALL_L = HALL_X1 - HALL_X0

  const angleMarche = (Math.PI * 2) / MARCHES_PAR_TOUR
  const hauteurMarche = HAUTEUR_NIVEAU / MARCHES_PAR_TOUR
  const marchesTotal = MARCHES_PAR_TOUR * 8

  /* ---------------------------------------------------------------------- */
  /*  Le hall                                                               */
  /* ---------------------------------------------------------------------- */

  const hall = new THREE.Group()
  groupe.add(hall)

  // Damier de marbre : une dalle sur deux en noir, posées une à une. C'est le
  // sol des halls parisiens, et aucune texture ne le remplace vraiment.
  const damier = new THREE.Group()
  const cote = 0.62
  const colonnes = Math.ceil(HALL_L / cote)
  const rangees = Math.ceil((Z_FACADE - Z_FOND) / cote) + 1
  for (let i = 0; i < colonnes; i += 1) {
    for (let j = 0; j < rangees; j += 1) {
      const sombre = (i + j) % 2 === 1
      const matiere = M.marbre()
      if (sombre) matiere.color.setHex(0x2a2c31)
      const dalle = poser(damier, boite(cote, 0.05, cote, matiere), { ombre: false })
      dalle.position.set(HALL_X0 + (i + 0.5) * cote, 0.025, Z_FOND + 0.1 + j * cote)
    }
  }
  hall.add(damier)

  // Murs du hall : soubassement mouluré, champ clair, cimaise, corniche.
  const murHall = (largeur, x, z, rotation) => {
    if (largeur <= 0.05) return null
    const pan = new THREE.Group()
    const champ = poser(pan, boite(largeur, 3.4, 0.16, M.platre()))
    champ.position.y = 1.7
    const soubassement = poser(pan, boite(largeur, 1.05, 0.2, M.platreOmbre()))
    soubassement.position.y = 0.52
    const cimaise = poser(pan, boite(largeur, 0.09, 0.26, M.platre()))
    cimaise.position.y = 1.08
    const corniche = poser(pan, boite(largeur, 0.16, 0.3, M.platre()))
    corniche.position.y = 3.3
    pan.position.set(x, 0, z)
    pan.rotation.y = rotation
    hall.add(pan)
    return pan
  }

  // Façade sur rue : elle s'interrompt au droit de la porte cochère, qui
  // appartient à l'immeuble et non au hall.
  const PASSAGE = 2.2
  murHall(entreeX - PASSAGE / 2 - HALL_X0, (HALL_X0 + entreeX - PASSAGE / 2) / 2, Z_FACADE + 0.18, 0)
  murHall(HALL_X1 - entreeX - PASSAGE / 2, (entreeX + PASSAGE / 2 + HALL_X1) / 2, Z_FACADE + 0.18, 0)

  // Mur du fond, en deux pans : entre les deux, le passage vers la cage
  // d'escalier. Un hall qui ne mène nulle part n'est pas un hall.
  murHall(-0.9 - HALL_X0, (HALL_X0 - 0.9) / 2, Z_FOND + 0.1, 0)
  murHall(HALL_X1 - 0.9, (0.9 + HALL_X1) / 2, Z_FOND + 0.1, 0)

  // Les deux refends qui bornent le passage.
  murHall(Z_FACADE - Z_FOND, HALL_X0, (Z_FOND + Z_FACADE) / 2, Math.PI / 2)
  murHall(Z_FACADE - Z_FOND, HALL_X1, (Z_FOND + Z_FACADE) / 2, Math.PI / 2)

  // Plafond du hall, et sa corniche : un hall à ciel ouvert n'est pas un hall.
  const plafondHall = poser(hall, boite(HALL_L, 0.16, Z_FACADE - Z_FOND + 0.4, M.platre()), {
    ombre: false,
  })
  plafondHall.position.set((HALL_X0 + HALL_X1) / 2, 3.42, (Z_FOND + Z_FACADE) / 2)

  // Boîtes aux lettres de laiton, sur le mur du fond.
  const boites = new THREE.Group()
  const xBoites = HALL_X0 + 0.6
  for (let i = 0; i < 12; i += 1) {
    const casier = poser(boites, boite(0.3, 0.2, 0.06, M.laiton()), { ombre: false })
    casier.position.set(xBoites + (i % 4) * 0.33, 1.9 - Math.floor(i / 4) * 0.23, Z_FOND + 0.22)
  }
  hall.add(boites)

  // Console de marbre et sa glace : ce qu'on croise en entrant dans un
  // immeuble tenu.
  const xConsole = entreeX + 2.6
  const console_ = poser(hall, boite(1.5, 0.07, 0.42, M.marbre()))
  console_.position.set(xConsole, 0.82, Z_FACADE - 0.12)
  ;[-0.62, 0.62].forEach((dx) => {
    const pied = poser(hall, fut(0.04, 0.8, M.laiton(), 8))
    pied.position.set(xConsole + dx, 0.4, Z_FACADE - 0.12)
  })
  const glace = poser(hall, boite(1.35, 1.7, 0.04, M.marbre()), { ombre: false })
  glace.material.color.setHex(0xd7dde0)
  glace.material.metalness = 0.6
  glace.material.roughness = 0.08
  glace.position.set(xConsole, 1.95, Z_FACADE + 0.06)

  // Deux orangers en bac, comme dans les halls soignés.
  ;[entreeX + 1.3, 1.5].forEach((x) => {
    const bac = poser(hall, boite(0.44, 0.5, 0.44, M.terreCuite()))
    bac.position.set(x, 0.27, Z_FOND + 0.7)
    const sujet = buisson(0.34)
    sujet.position.set(x, 0.58, Z_FOND + 0.7)
    hall.add(sujet)
  })

  /* ---------------------------------------------------------------------- */
  /*  L'escalier                                                            */
  /* ---------------------------------------------------------------------- */

  const cage = new THREE.Group()
  groupe.add(cage)

  // Mur de cage : un cylindre vu de l'intérieur, qui monte sur toute la
  // hauteur. C'est lui qui enferme la spirale et lui donne son intimité.
  /**
   * LE MUR DE CAGE, NIVEAU PAR NIVEAU.
   *
   * Un cylindre unique ne pouvait pas convenir : il faut une trémie du côté
   * des paliers — c'est par là qu'on entre depuis le hall et que chaque porte
   * d'appartement donne — mais une trémie ouverte sur toute la hauteur
   * percerait la cage de haut en bas, et l'on verrait le ciel à chaque tour.
   *
   * Le mur est donc découpé en anneaux d'un niveau, chacun complet, et chaque
   * anneau porte un BOUCHON amovible à l'endroit de la trémie. On retire le
   * bouchon du niveau desservi — et celui du rez-de-chaussée, par où l'on
   * arrive —, les autres restent en place. La cage est close partout sauf là
   * où il faut passer.
   */
  const RAYON_CAGE = RAYON_MARCHE + 0.18
  const BASE_CAGE = -0.6
  const NIVEAUX_CAGE = 9
  const matiereCage = () =>
    new THREE.MeshStandardMaterial({ color: 0xf1e9db, roughness: 0.9, side: THREE.BackSide })
  const bouchons = []

  for (let i = 0; i < NIVEAUX_CAGE; i += 1) {
    const yBas = BASE_CAGE + i * HAUTEUR_NIVEAU
    const anneau = new THREE.Mesh(
      new THREE.CylinderGeometry(
        RAYON_CAGE,
        RAYON_CAGE,
        HAUTEUR_NIVEAU,
        32,
        1,
        true,
        TREMIE / 2,
        Math.PI * 2 - TREMIE,
      ),
      matiereCage(),
    )
    anneau.position.set(AXE.x, yBas + HAUTEUR_NIVEAU / 2, AXE.z)
    anneau.receiveShadow = true
    cage.add(anneau)

    const bouchon = new THREE.Mesh(
      new THREE.CylinderGeometry(RAYON_CAGE, RAYON_CAGE, HAUTEUR_NIVEAU, 8, 1, true, -TREMIE / 2, TREMIE),
      matiereCage(),
    )
    bouchon.position.copy(anneau.position)
    bouchon.receiveShadow = true
    cage.add(bouchon)
    bouchons.push(bouchon)
  }

  // Plafond de la cage : sans lui, le puits s'ouvrirait sur le ciel.
  const plafondCage = poser(
    cage,
    new THREE.Mesh(new THREE.CircleGeometry(RAYON_CAGE, 32), M.platre()),
    { ombre: false },
  )
  plafondCage.rotation.x = Math.PI / 2
  plafondCage.position.set(AXE.x, BASE_CAGE + NIVEAUX_CAGE * HAUTEUR_NIVEAU, AXE.z)

  const geoMarche = secteurAnnulaire(RAYON_JOUR, RAYON_MARCHE, angleMarche * 0.97, 0.12)
  const geoTapis = secteurAnnulaire(RAYON_JOUR + 0.26, RAYON_MARCHE - 0.2, angleMarche * 0.97, 0.02)
  const pointsRampe = []

  for (let i = 0; i < marchesTotal; i += 1) {
    const angle = ANGLE_BASE + i * angleMarche
    const y = 0.16 + i * hauteurMarche

    const marche = new THREE.Mesh(geoMarche, M.boisClair())
    marche.position.set(AXE.x, y, AXE.z)
    marche.rotation.y = angle
    marche.castShadow = true
    marche.receiveShadow = true
    cage.add(marche)

    const tapis = new THREE.Mesh(geoTapis, M.tapisEscalier())
    tapis.position.set(AXE.x, y + 0.128, AXE.z)
    tapis.rotation.y = angle
    tapis.receiveShadow = true
    cage.add(tapis)

    // Barre de laiton au nez de marche : le détail qui tient le tapis, et qui
    // accroche la lumière à chaque révolution.
    const barre = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, RAYON_MARCHE - RAYON_JOUR - 0.42, 6),
      M.laiton(),
    )
    const aBarre = angle + angleMarche * 0.5
    barre.position.set(
      AXE.x + Math.cos(-aBarre) * (RAYON_JOUR + 0.5),
      y + 0.145,
      AXE.z + Math.sin(-aBarre) * (RAYON_JOUR + 0.5),
    )
    barre.rotation.z = Math.PI / 2
    barre.rotation.y = aBarre
    cage.add(barre)

    // Contremarche, peinte en blanc comme sur les escaliers bourgeois.
    const contre = boite(RAYON_MARCHE - RAYON_JOUR, hauteurMarche, 0.05, M.platre())
    contre.position.set(
      AXE.x + Math.cos(-angle) * ((RAYON_JOUR + RAYON_MARCHE) / 2),
      y - hauteurMarche / 2 + 0.06,
      AXE.z + Math.sin(-angle) * ((RAYON_JOUR + RAYON_MARCHE) / 2),
    )
    contre.rotation.y = angle
    contre.receiveShadow = true
    cage.add(contre)

    // Barreaudage de fer forgé, côté jour — c'est du côté du vide qu'on tient
    // une rampe, jamais du côté du mur.
    const rBarreau = RAYON_JOUR + 0.07
    const barreau = boite(0.022, 0.92, 0.022, M.ferForge())
    barreau.position.set(
      AXE.x + Math.cos(-angle) * rBarreau,
      y + 0.12 + 0.46,
      AXE.z + Math.sin(-angle) * rBarreau,
    )
    cage.add(barreau)

    pointsRampe.push(
      new THREE.Vector3(
        AXE.x + Math.cos(-angle) * rBarreau,
        y + 1.04,
        AXE.z + Math.sin(-angle) * rBarreau,
      ),
    )
  }

  // Main courante de bois : un tube qui suit l'hélice d'un bout à l'autre.
  const rampe = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pointsRampe), marchesTotal * 2, 0.045, 8, false),
    M.boisVerni(),
  )
  rampe.castShadow = true
  cage.add(rampe)

  // Une applique par étage, sur le mur de cage : c'est la lumière qui fait
  // qu'on voit la spirale plutôt qu'un tunnel.
  for (let e = 0; e <= 8; e += 1) {
    const angle = ANGLE_BASE + 2.4 + e * Math.PI * 1.35
    const applique = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 10, 8),
      new THREE.MeshStandardMaterial({
        color: 0xf6e3c0,
        emissive: 0xf6c978,
        emissiveIntensity: 1.6,
        roughness: 0.5,
      }),
    )
    applique.position.set(
      AXE.x + Math.cos(-angle) * (RAYON_MARCHE + 0.02),
      0.6 + e * HAUTEUR_NIVEAU,
      AXE.z + Math.sin(-angle) * (RAYON_MARCHE + 0.02),
    )
    cage.add(applique)
  }

  /* ---------------------------------------------------------------------- */
  /*  Le palier et la porte de l'appartement                                */
  /* ---------------------------------------------------------------------- */

  const palier = new THREE.Group()
  groupe.add(palier)

  const dallePalier = poser(palier, boite(1.95, 0.14, 1.25, M.boisClair()))
  dallePalier.position.set(AXE.x, -0.07, AXE.z + 1.0)
  const tapisPalier = poser(palier, boite(1.2, 0.02, 0.9, M.tapisEscalier()), { ombre: false })
  tapisPalier.position.set(AXE.x, 0.01, AXE.z + 1.05)

  // La porte du palier : deux panneaux moulurés, poignée de laiton, et un
  // pivot posé sur son montant gauche — elle s'ouvre VERS L'INTÉRIEUR.
  const pivotPorte = new THREE.Group()
  const battant = poser(pivotPorte, boite(1.06, 2.42, 0.08, M.boisVerni()))
  battant.position.set(0.53, 1.21, 0)
  ;[0.78, 1.72].forEach((y) => {
    const caisson = poser(pivotPorte, boite(0.72, 0.66, 0.03, M.platre()), { ombre: false })
    caisson.material.color.setHex(0x82502c)
    caisson.position.set(0.53, y, 0.05)
  })
  const bouton = poser(pivotPorte, fut(0.05, 0.08, M.laiton(), 10), { ombre: false })
  bouton.rotation.x = Math.PI / 2
  bouton.position.set(0.94, 1.12, 0.07)
  pivotPorte.position.set(AXE.x - 0.53, 0, Z_FOND - 0.08)
  palier.add(pivotPorte)

  const chambranle = poser(palier, boite(1.42, 2.62, 0.14, M.platre()))
  chambranle.position.set(AXE.x, 1.31, Z_FOND - 0.2)
  const jourPorte = poser(palier, boite(1.1, 2.46, 0.2, M.platreOmbre()), { ombre: false })
  jourPorte.position.set(AXE.x, 1.23, Z_FOND - 0.2)

  /* ---------------------------------------------------------------------- */
  /*  L'appartement                                                         */
  /* ---------------------------------------------------------------------- */

  const appartement = new THREE.Group()
  groupe.add(appartement)

  const { largeur: AL, profondeur: AP, hauteur: AH } = APPART
  const zCentre = Z_FOND + AP / 2

  const sol = poser(appartement, boite(AL, 0.08, AP, M.parquet()), { ombre: false })
  sol.position.set(0, -0.04, zCentre)
  sol.material.map.repeat.set(AL / 3, AP / 3)

  const plafond = poser(appartement, boite(AL, 0.12, AP, M.platre()), { ombre: false })
  plafond.position.set(0, AH, zCentre)

  // Rosace de plafond, et sa corniche : la signature d'un plafond haussmannien.
  const rosace = poser(
    appartement,
    new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.62, 0.1, 24), M.platre()),
    { ombre: false },
  )
  rosace.position.set(0, AH - 0.08, zCentre - 0.3)
  const lustre = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0xfff0d2,
      emissive: 0xf6c978,
      emissiveIntensity: 1.9,
      roughness: 0.4,
    }),
  )
  lustre.position.set(0, AH - 0.5, zCentre - 0.3)
  appartement.add(lustre)

  // Murs : champ clair, plinthe, cimaise, corniche — la grammaire des murs
  // moulurés, posée sur les quatre côtés.
  const panneauMur = (largeur, x, z, rotation, { perce = false } = {}) => {
    const pan = new THREE.Group()
    if (!perce) {
      const champ = poser(pan, boite(largeur, AH, 0.14, M.platre()))
      champ.position.y = AH / 2
    }
    const plinthe = poser(pan, boite(largeur, 0.24, 0.18, M.platre()))
    plinthe.position.y = 0.12
    const corniche = poser(pan, boite(largeur, 0.22, 0.26, M.platre()))
    corniche.position.y = AH - 0.11
    const cimaise = poser(pan, boite(largeur, 0.06, 0.2, M.platre()), { ombre: false })
    cimaise.position.y = AH * 0.62
    pan.position.set(x, 0, z)
    pan.rotation.y = rotation
    appartement.add(pan)
    return pan
  }

  // Mur d'entrée, en deux pans : la porte du palier passe entre les deux.
  panneauMur((AL - 1.5) / 2, -(AL + 1.5) / 4, Z_FOND - 0.02, 0)
  panneauMur((AL - 1.5) / 2, (AL + 1.5) / 4, Z_FOND - 0.02, 0)
  panneauMur(AP, -AL / 2, zCentre, Math.PI / 2)
  panneauMur(AP, AL / 2, zCentre, Math.PI / 2)

  // La façade : deux trumeaux et deux fenêtres à la française toute hauteur.
  const trumeauL = (AL - 2 * 1.35) / 3
  ;[-1, 0, 1].forEach((i) => {
    const trumeau = poser(appartement, boite(trumeauL, AH, 0.16, M.platre()))
    trumeau.position.set(i * ((AL - trumeauL) / 2), AH / 2, Z_FACADE)
  })
  const allege = poser(appartement, boite(AL, 0.42, 0.16, M.platre()))
  allege.position.set(0, 0.21, Z_FACADE)
  const imposteFacade = poser(appartement, boite(AL, 0.35, 0.16, M.platre()))
  imposteFacade.position.set(0, AH - 0.18, Z_FACADE)

  // Les deux fenêtres. Celle de droite est CELLE PAR LAQUELLE ON RESSORT :
  // ses deux vantaux pivotent vers l'intérieur au moment de l'estimation.
  const fenetres = [-1, 1].map((cote) => {
    const ensemble = new THREE.Group()
    const x = (cote * (AL - trumeauL)) / 4
    const largeurF = 1.35
    const hauteurF = AH - 0.42 - 0.35

    const jour = poser(ensemble, boite(largeurF, hauteurF, 0.06, M.vitrage()), { ombre: false })
    jour.position.set(0, hauteurF / 2, 0)

    const vantaux = [-1, 1].map((sens) => {
      const pivot = new THREE.Group()
      const cadre = poser(pivot, boite(largeurF / 2, hauteurF, 0.05, M.platre()), { ombre: false })
      cadre.position.set((sens * largeurF) / 4, hauteurF / 2, 0)
      const vitre = poser(pivot, boite(largeurF / 2 - 0.09, hauteurF - 0.1, 0.02, M.vitrage()), {
        ombre: false,
      })
      vitre.position.set((sens * largeurF) / 4, hauteurF / 2, 0.02)
      const petitBois = poser(pivot, boite(largeurF / 2 - 0.09, 0.035, 0.03, M.platre()), {
        ombre: false,
      })
      petitBois.position.set((sens * largeurF) / 4, hauteurF * 0.58, 0.03)
      pivot.position.set((sens * largeurF) / 2, 0, -0.04)
      ensemble.add(pivot)
      return { pivot, sens }
    })

    const garde = gardeCorpsFer({ largeur: largeurF + 0.1, hauteur: 0.88 })
    garde.position.set(0, 0.42, 0.14)
    ensemble.add(garde)

    ensemble.position.set(x, 0.42, Z_FACADE)
    ensemble.userData.vantaux = vantaux
    appartement.add(ensemble)
    return ensemble
  })

  // Cheminée de marbre et sa glace : le point de mire d'un séjour
  // haussmannien, et l'endroit où le regard se pose en entrant.
  const cheminee = new THREE.Group()
  const jambages = [-1, 1].map((cote) => {
    const jambage = poser(cheminee, boite(0.22, 1.05, 0.42, M.marbre()))
    jambage.position.set(cote * 0.62, 0.52, 0)
    return jambage
  })
  const tablette = poser(cheminee, boite(1.65, 0.1, 0.5, M.marbre()))
  tablette.position.y = 1.1
  const foyer = poser(cheminee, boite(1.0, 0.95, 0.34, M.platreOmbre()), { ombre: false })
  foyer.material.color.setHex(0x23242a)
  foyer.position.set(0, 0.48, -0.06)
  const trumeauGlace = poser(cheminee, boite(1.35, 1.5, 0.05, M.marbre()), { ombre: false })
  trumeauGlace.material.color.setHex(0xd9dee1)
  trumeauGlace.material.metalness = 0.55
  trumeauGlace.material.roughness = 0.1
  trumeauGlace.position.set(0, 1.95, -0.16)
  cheminee.position.set(-AL / 2 + 0.28, 0, zCentre - 0.6)
  cheminee.rotation.y = Math.PI / 2
  appartement.add(cheminee)

  /* ---------------------------------------------------------------------- */
  /*  Le mobilier, par paliers de 30 m²                                     */
  /* ---------------------------------------------------------------------- */

  /**
   * Un groupe par palier. Ils arrivent dans l'ordre où l'on meuble vraiment un
   * appartement : d'abord de quoi s'asseoir, puis de quoi recevoir, puis le
   * reste. Chacun se fond sur dix-huit mètres carrés, si bien qu'entre deux
   * paliers on voit toujours quelque chose arriver.
   */
  const meubles = []
  const ajouterPalier = (construire) => {
    const bloc = new THREE.Group()
    construire(bloc)
    appartement.add(bloc)
    meubles.push(revelable(bloc))
  }

  // 30 m² — le tapis et le canapé.
  ajouterPalier((bloc) => {
    const tapis = poser(bloc, boite(3.1, 0.03, 2.3, M.tapisSalon()), { ombre: false })
    tapis.position.set(0.25, 0.03, zCentre - 0.2)

    const assise = poser(bloc, boite(2.5, 0.42, 0.95, M.tissuClair()))
    assise.position.set(0.25, 0.32, zCentre - 1.25)
    const dossier = poser(bloc, boite(2.5, 0.52, 0.24, M.tissuClair()))
    dossier.position.set(0.25, 0.62, zCentre - 1.65)
    ;[-1, 1].forEach((c) => {
      const accoudoir = poser(bloc, boite(0.24, 0.3, 0.95, M.tissuClair()))
      accoudoir.position.set(0.25 + c * 1.37, 0.5, zCentre - 1.25)
    })
    ;[-0.7, 0, 0.7].forEach((dx) => {
      const coussin = poser(bloc, boite(0.42, 0.42, 0.14, M.tissuBleu()))
      coussin.position.set(0.25 + dx, 0.66, zCentre - 1.5)
    })
  })

  // 60 m² — la table basse et les deux fauteuils.
  ajouterPalier((bloc) => {
    const plateau = poser(bloc, boite(1.25, 0.06, 0.66, M.vitrage()))
    plateau.position.set(0.25, 0.41, zCentre - 0.25)
    const pied = poser(bloc, fut(0.28, 0.38, M.laiton(), 14))
    pied.position.set(0.25, 0.19, zCentre - 0.25)

    ;[-1, 1].forEach((c) => {
      const fauteuil = new THREE.Group()
      const coque = poser(fauteuil, boite(0.72, 0.4, 0.72, M.tissuBleu()))
      coque.position.y = 0.38
      const dos = poser(fauteuil, boite(0.72, 0.56, 0.18, M.tissuBleu()))
      dos.position.set(0, 0.66, -0.3)
      dos.rotation.x = -0.16
      ;[-1, 1].forEach((sx) => {
        ;[-1, 1].forEach((sz) => {
          const pied_ = poser(fauteuil, fut(0.025, 0.2, M.aluNoir(), 6))
          pied_.position.set(sx * 0.28, 0.1, sz * 0.28)
        })
      })
      fauteuil.position.set(0.25 + c * 1.0, 0, zCentre + 0.85)
      fauteuil.rotation.y = Math.PI + c * 0.4
      bloc.add(fauteuil)
    })
  })

  // 90 m² — la bibliothèque et les tableaux.
  ajouterPalier((bloc) => {
    const caisson = poser(bloc, boite(0.42, 2.3, 3.0, M.boisClair()))
    caisson.material.color.setHex(0x8a5f38)
    caisson.position.set(AL / 2 - 0.3, 1.15, zCentre - 0.4)
    for (let i = 0; i < 5; i += 1) {
      const tablette_ = poser(bloc, boite(0.4, 0.04, 2.96, M.boisClair()), { ombre: false })
      tablette_.position.set(AL / 2 - 0.31, 0.42 + i * 0.46, zCentre - 0.4)
      for (let j = 0; j < 9; j += 1) {
        const livre = poser(bloc, boite(0.22, 0.3, 0.06 + Math.random() * 0.05, M.tissuBleu()), {
          ombre: false,
        })
        livre.material.color.setHSL(0.02 + Math.random() * 0.14, 0.4, 0.28 + Math.random() * 0.2)
        livre.position.set(AL / 2 - 0.32, 0.6 + i * 0.46, zCentre - 1.7 + j * 0.28)
      }
    }

    ;[0, 1].forEach((i) => {
      const cadre = poser(bloc, boite(0.06, 0.82, 0.66, M.laiton()), { ombre: false })
      cadre.position.set(-AL / 2 + 0.1, 1.85, zCentre + 0.7 + i * 0.95)
      const peinture = poser(bloc, boite(0.02, 0.72, 0.56, M.toile(i)), { ombre: false })
      peinture.rotation.y = -Math.PI / 2
      peinture.position.set(-AL / 2 + 0.14, 1.85, zCentre + 0.7 + i * 0.95)
    })
  })

  // 120 m² — la télévision et son meuble bas.
  ajouterPalier((bloc) => {
    const meuble = poser(bloc, boite(2.1, 0.44, 0.44, M.boisClair()))
    meuble.material.color.setHex(0x6f4a2c)
    meuble.position.set(0.25, 0.24, zCentre + 1.65)
    const ecran = poser(bloc, boite(1.75, 0.98, 0.06, M.ecranNoir()), { ombre: false })
    ecran.position.set(0.25, 1.15, zCentre + 1.72)
    const socle_ = poser(bloc, boite(0.4, 0.06, 0.2, M.aluNoir()), { ombre: false })
    socle_.position.set(0.25, 0.49, zCentre + 1.72)
  })

  // 150 m² — la table à manger et ses chaises.
  ajouterPalier((bloc) => {
    const plateau = poser(bloc, boite(2.1, 0.07, 1.0, M.boisClair()))
    plateau.material.color.setHex(0x7b5230)
    plateau.position.set(-1.1, 0.75, zCentre + 1.7)
    ;[-1, 1].forEach((sx) => {
      const pied = poser(bloc, boite(0.1, 0.74, 0.86, M.aluNoir()))
      pied.position.set(-1.1 + sx * 0.88, 0.37, zCentre + 1.7)
    })
    ;[-1, 1].forEach((sz) => {
      ;[-0.55, 0.55].forEach((dx) => {
        const chaise = new THREE.Group()
        const assise = poser(chaise, boite(0.44, 0.06, 0.44, M.boisClair()))
        assise.position.y = 0.45
        const dos = poser(chaise, boite(0.44, 0.5, 0.06, M.boisClair()))
        dos.position.set(0, 0.72, -sz * 0.2)
        ;[-1, 1].forEach((ax) => {
          ;[-1, 1].forEach((az) => {
            const pied_ = poser(chaise, fut(0.02, 0.45, M.aluNoir(), 6))
            pied_.position.set(ax * 0.18, 0.22, az * 0.18)
          })
        })
        chaise.position.set(-1.1 + dx, 0, zCentre + 1.7 + sz * 0.78)
        bloc.add(chaise)
      })
    })
  })

  // 180 m² — la cuisine ouverte et son îlot.
  ajouterPalier((bloc) => {
    const ilot = poser(bloc, boite(2.2, 0.92, 0.9, M.platre()))
    ilot.position.set(-1.45, 0.46, zCentre - 1.55)
    const plan = poser(bloc, boite(2.34, 0.08, 1.02, M.marbre()))
    plan.position.set(-1.45, 0.94, zCentre - 1.55)
    ;[-0.6, 0, 0.6].forEach((dx) => {
      const tabouret = new THREE.Group()
      const assise = poser(tabouret, fut(0.17, 0.07, M.boisClair(), 12))
      assise.position.y = 0.66
      const fut_ = poser(tabouret, fut(0.04, 0.64, M.aluNoir(), 8))
      fut_.position.y = 0.32
      tabouret.position.set(-1.45 + dx, 0, zCentre - 0.9)
      bloc.add(tabouret)
    })
    const hauts = poser(bloc, boite(2.0, 0.66, 0.36, M.platre()))
    hauts.position.set(-1.45, 1.95, zCentre - 2.35)
  })

  // 210 m² — la salle de bains, derrière sa verrière d'atelier.
  ajouterPalier((bloc) => {
    const verriere = poser(bloc, boite(0.06, 2.35, 2.5, M.vitrage()), { ombre: false })
    verriere.position.set(AL / 2 - 1.9, 1.18, zCentre + 1.4)
    for (let i = 0; i < 5; i += 1) {
      const montant = poser(bloc, boite(0.08, 2.35, 0.05, M.aluNoir()), { ombre: false })
      montant.position.set(AL / 2 - 1.9, 1.18, zCentre + 0.25 + i * 0.58)
    }
    const baignoire = poser(bloc, boite(1.55, 0.52, 0.76, M.marbre()))
    baignoire.position.set(AL / 2 - 0.95, 0.28, zCentre + 1.9)
    const eauBain = poser(bloc, boite(1.35, 0.08, 0.6, M.eauPiscine()), { ombre: false })
    eauBain.position.set(AL / 2 - 0.95, 0.5, zCentre + 1.9)
    const vasque = poser(bloc, boite(1.0, 0.1, 0.5, M.marbre()))
    vasque.position.set(AL / 2 - 0.9, 0.86, zCentre + 0.75)
    const miroir = poser(bloc, boite(0.04, 0.9, 0.7, M.marbre()), { ombre: false })
    miroir.material.color.setHex(0xd9dee1)
    miroir.material.metalness = 0.6
    miroir.material.roughness = 0.08
    miroir.position.set(AL / 2 - 0.42, 1.6, zCentre + 0.75)
  })

  // 240 m² — le piano à queue et le bureau.
  ajouterPalier((bloc) => {
    const corps = poser(bloc, boite(1.5, 0.28, 1.95, M.ecranNoir()))
    corps.position.set(-AL / 2 + 1.35, 0.72, zCentre + 1.25)
    const couvercle = poser(bloc, boite(1.5, 0.05, 1.95, M.ecranNoir()))
    couvercle.position.set(-AL / 2 + 1.5, 1.08, zCentre + 1.25)
    couvercle.rotation.z = -0.35
    const clavier = poser(bloc, boite(1.35, 0.06, 0.28, M.platre()), { ombre: false })
    clavier.position.set(-AL / 2 + 1.35, 0.9, zCentre + 0.3)
    ;[-1, 1].forEach((sx) => {
      const pied = poser(bloc, fut(0.05, 0.58, M.ecranNoir(), 8))
      pied.position.set(-AL / 2 + 1.35 + sx * 0.55, 0.29, zCentre + 1.7)
    })
  })

  // 270 m² et plus — les rideaux, les plantes, le tapis de fond.
  ajouterPalier((bloc) => {
    fenetres.forEach((fenetre) => {
      ;[-1, 1].forEach((c) => {
        const rideau = poser(bloc, boite(0.42, AH - 0.5, 0.14, M.tissuClair()))
        rideau.material.color.setHex(0xe4d9c0)
        rideau.position.set(fenetre.position.x + c * 0.88, (AH - 0.5) / 2 + 0.3, Z_FACADE - 0.18)
      })
    })
    ;[[-AL / 2 + 0.6, zCentre + 2.1], [AL / 2 - 0.7, zCentre - 2.1]].forEach(([x, z]) => {
      const bac = poser(bloc, boite(0.4, 0.46, 0.4, M.terreCuite()))
      bac.position.set(x, 0.23, z)
      const sujet = buisson(0.42)
      sujet.position.set(x, 0.62, z)
      bloc.add(sujet)
    })
  })

  /* ---------------------------------------------------------------------- */
  /*  Éclairage propre à la visite                                          */
  /* ---------------------------------------------------------------------- */

  // UNE SEULE LAMPE DANS LA CAGE, ET ELLE SUIT LE DRONE.
  //
  // Un escalier de vingt-cinq mètres éclairé par une lampe posée au pied
  // serait noir dès le deuxième étage ; en poser une par niveau coûterait neuf
  // sources dans le shader pour n'en voir jamais qu'une. Celle-ci monte avec la
  // caméra, et la volée qu'on traverse est toujours celle qui est éclairée.
  const lumiereCage = new THREE.PointLight(0xffd9a0, 0, 11, 2)
  lumiereCage.position.set(AXE.x, 3, AXE.z)
  groupe.add(lumiereCage)

  const lumiereSejour = new THREE.PointLight(0xfff1dc, 0, 13, 2)
  lumiereSejour.position.set(0, AH - 0.6, zCentre - 0.2)
  groupe.add(lumiereSejour)

  const jourFenetre = new THREE.DirectionalLight(0xdfeeff, 0)
  jourFenetre.position.set(0.6, 2.4, Z_FACADE + 4)
  jourFenetre.target.position.set(0, 1.2, zCentre)
  groupe.add(jourFenetre)
  groupe.add(jourFenetre.target)

  /* ---------------------------------------------------------------------- */
  /*  Pilotage                                                              */
  /* ---------------------------------------------------------------------- */

  /** Étage actuellement desservi — commande la hauteur du palier et du logement. */
  let etageCourant = 1

  const placerEtage = (etage) => {
    // Un demi-niveau au minimum : au rez-de-chaussée, le logement d'un
    // immeuble parisien est de toute façon quelques marches au-dessus du hall,
    // et le placer de plain-pied le ferait entrer dans l'entrée.
    etageCourant = Math.max(0.5, Math.min(8, Number.isFinite(etage) ? etage : 1))
    // Un étage vaut un tour exactement : la marche d'arrivée regarde toujours
    // vers +Z, et le palier comme le logement n'ont qu'à monter — jamais à
    // tourner. Leurs pièces portent déjà leurs coordonnées dans le repère de
    // la visite : seul le décalage en hauteur change.
    const y = 0.16 + etageCourant * HAUTEUR_NIVEAU
    palier.position.set(0, y, 0)
    appartement.position.set(0, y, 0)
    lumiereSejour.position.y = y + AH - 0.6
    jourFenetre.position.y = y + 2.4
    jourFenetre.target.position.y = y + 1.2

    const dessert = Math.max(0, Math.min(NIVEAUX_CAGE - 1, Math.floor(etageCourant)))
    bouchons.forEach((bouchon, i) => {
      bouchon.visible = i !== dessert && i !== 0
    })
  }

  placerEtage(1)

  /** Position monde d'un point exprimé dans le repère de l'appartement. */
  const dansAppartement = (x, y, z) =>
    appartement.localToWorld(new THREE.Vector3(x, y, z))

  return {
    groupe,
    appartement,
    /** Échelle du décor intérieur dans la scène — voir `ECHELLE`. */
    echelle: ECHELLE,
    /** Nu de la façade du logement, en repère local. */
    nuFacade: Z_FACADE,
    placerEtage,
    get niveau() {
      return etageCourant
    },

    /** Ouvre la porte du palier vers l'intérieur du logement. */
    ouvrirPortePalier(valeur) {
      pivotPorte.rotation.y = -valeur * 1.5
    },

    /** Ouvre les deux vantaux de la fenêtre de droite : la sortie. */
    ouvrirFenetre(valeur) {
      fenetres[1].userData.vantaux.forEach(({ pivot, sens }) => {
        pivot.rotation.y = -sens * valeur * 1.4
      })
    },

    /**
     * L'HÉLICE DE LA MONTÉE, en coordonnées monde.
     *
     * Un tour par niveau, exactement : le drone part au pied de l'escalier et
     * arrive au palier demandé après `niveau` révolutions. C'est ce que le
     * vendeur vient de déclarer en réglant son étage, et c'est ce qu'il doit
     * voir — trois étages, trois tours.
     */
    helice(niveau) {
      const n = Math.max(0.5, Math.min(8, niveau))
      const psiArrivee = ANGLE_BASE + n * TOUR - 0.7
      return {
        axe: groupe.localToWorld(AXE.clone()),
        // Le drone monte AU MILIEU DU PUITS, à peine décalé de son axe : c'est
        // la seule position d'où toute la spirale tient dans le cadre. Collé à
        // la rampe, il n'aurait sous les yeux que le mur de la cage.
        rayon: RAYON_JOUR * 0.33 * ECHELLE,
        psiDepart: psiArrivee - n * TOUR - 0.4,
        psiArrivee,
        yDepart: groupe.position.y + (0.16 + 1.5) * ECHELLE,
        yArrivee: groupe.position.y + (0.16 + n * HAUTEUR_NIVEAU + 1.6) * ECHELLE,
      }
    },

    /** Repères de la trajectoire, en coordonnées monde. */
    reperes() {
      const centre = groupe.localToWorld(AXE.clone())
      return {
        entree: groupe.localToWorld(ENTREE.clone().setY(1.6)),
        hall: groupe.localToWorld(new THREE.Vector3(entreeX / 2.6, 1.6, Z_FOND + 1.9)),
        piedEscalier: groupe.localToWorld(new THREE.Vector3(AXE.x, 1.6, AXE.z)),
        centrePuits: centre,
        palier: dansAppartement(AXE.x, 1.6, AXE.z + 1.05),
        seuil: dansAppartement(AXE.x, 1.6, Z_FOND + 0.5),
        sejour: dansAppartement(0.3, 1.65, zCentre - 1.1),
        foyer: dansAppartement(-AL / 2 + 0.7, 1.4, zCentre - 0.6),
        fenetre: dansAppartement(fenetres[1].position.x, 1.65, Z_FACADE - 0.1),
        dehors: dansAppartement(fenetres[1].position.x, 1.9, Z_FACADE + 4.5),
      }
    },

    poser(v) {
      // Le mobilier : un palier tous les 30 m², qui se fond sur 18.
      const surface = v.surface || 0
      meubles.forEach((reveler, i) => {
        const seuil = 30 * (i + 1)
        reveler(Math.max(0, Math.min(1, (surface - seuil) / 18 + 0.001)))
      })

      // La lampe de cage se cale sur la hauteur du drone, en repère local.
      if (Number.isFinite(v.yCamera)) {
        lumiereCage.position.y = (v.yCamera - groupe.position.y) / ECHELLE + 0.5
      }
      lumiereCage.intensity = v.dedans * 5.5
      lumiereSejour.intensity = v.dedans * 7
      jourFenetre.intensity = v.dedans * 1.4
      groupe.visible = v.dedans > 0.01
    },
  }
}
