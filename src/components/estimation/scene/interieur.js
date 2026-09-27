import * as THREE from 'three'
import * as M from './matieres'
import { boite, buisson, fenetreFrancaise, fut, gardeCorpsFer, poser, revelable } from './kit'
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

/**
 * DERNIER NIVEAU DESSERVI par l'escalier.
 *
 * C'est le dernier étage que le parcours laisse déclarer (voir `ETAGE_MAX` dans
 * `src/lib/etage.js`) : le vendeur qui annonce un douzième doit monter douze
 * étages, pas sept suivis d'un raccourci. La cage est donc dessinée pour
 * douze — et l'escalier ne coûte pas plus cher pour autant, ses marches étant
 * instanciées (voir plus bas).
 */
const NIVEAU_MAX = 12

/**
 * HAUTEUR D'ŒIL, en mètres — celle d'une personne debout.
 *
 * Toute la visite est tenue à cette hauteur, du hall au dernier palier : c'est
 * ce qui la distingue d'un survol, et c'est la seule chose qui fasse qu'on s'y
 * croit. Un appartement filmé à deux mètres cinquante est une maquette ; filmé
 * à un mètre soixante-deux, c'est une visite.
 */
const HAUTEUR_OEIL = 1.62

/** Gabarit du séjour — la première pièce, celle où la porte du palier donne. */
const APPART = { largeur: 5.8, profondeur: 5.4, hauteur: 3.15 }

/**
 * L'ENFILADE — les deux pièces qui suivent le séjour.
 *
 * Un appartement haussmannien ne se visite pas d'un seul regard : ses pièces de
 * réception se suivent LE LONG DE LA FAÇADE, ouvertes l'une sur l'autre par une
 * porte à deux vantaux, chacune avec sa fenêtre sur la rue. C'est l'enfilade, et
 * c'est ce qui fait qu'on traverse un appartement au lieu de l'inspecter depuis
 * le seuil.
 *
 * Trois pièces, donc, et dans l'ordre où l'on vit dedans : le séjour où l'on
 * entre, la salle à manger, puis la chambre. La caméra les parcourt lentement,
 * l'une après l'autre (voir `stations` et `DroneScene`).
 *
 * Les largeurs décroissent, comme dans un vrai plan : la pièce de réception est
 * la plus grande, la chambre la plus petite.
 */
const ENFILADE = [
  { id: 'salle-a-manger', largeur: 4.6 },
  { id: 'chambre', largeur: 4.2 },
]

/** Largeur du passage à deux vantaux entre deux pièces de l'enfilade. */
const PASSAGE_ENFILADE = 1.5
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
  const marchesTotal = MARCHES_PAR_TOUR * NIVEAU_MAX

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
  // Un anneau par niveau desservi, plus celui du rez-de-chaussée.
  const NIVEAUX_CAGE = NIVEAU_MAX + 1
  // Le mur de cage est un enduit ANCIEN, pas un plâtre neuf : à cinquante
  // centimètres de l'épaule, un blanc cassé aussi clair que celui des
  // appartements montait au blanc pur sous la lampe, et l'escalier se lisait
  // comme un tunnel surexposé. Ce ton-là garde ses ombres.
  const matiereCage = () =>
    new THREE.MeshStandardMaterial({ color: 0xded2ba, roughness: 0.94, side: THREE.BackSide })
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

  /**
   * LES MARCHES SONT INSTANCIÉES, et c'est ce qui permet d'en avoir douze
   * étages.
   *
   * Cent quatre-vingt-douze marches à cinq pièces chacune — la marche, son
   * tapis, sa barre de laiton, sa contremarche, son barreau — font près de mille
   * maillages, donc mille appels de rendu par image. Sur un téléphone, l'escalier
   * à lui seul coûtait plus que tout le reste de la scène.
   *
   * Une pièce, une `InstancedMesh` : cinq appels de rendu pour tout l'escalier,
   * quel que soit le nombre d'étages. C'est le seul endroit du décor où la
   * répétition est telle que ça en vaille la peine — et c'est ce qui rend le
   * douzième étage aussi léger que le premier.
   */
  const geoMarche = secteurAnnulaire(RAYON_JOUR, RAYON_MARCHE, angleMarche * 0.97, 0.12)
  const geoTapis = secteurAnnulaire(RAYON_JOUR + 0.26, RAYON_MARCHE - 0.2, angleMarche * 0.97, 0.02)
  const geoBarre = new THREE.CylinderGeometry(0.018, 0.018, RAYON_MARCHE - RAYON_JOUR - 0.42, 6)
  const geoContre = new THREE.BoxGeometry(RAYON_MARCHE - RAYON_JOUR, hauteurMarche, 0.05)
  const geoBarreau = new THREE.BoxGeometry(0.022, 0.92, 0.022)

  /** Un lot d'instances : sa géométrie, sa matière, et ce qu'il projette. */
  const lot = (geometrie, matiere, { ombre = true, recoit = true } = {}) => {
    const maillage = new THREE.InstancedMesh(geometrie, matiere, marchesTotal)
    maillage.castShadow = ombre
    maillage.receiveShadow = recoit
    // Les matrices sont posées une fois pour toutes, jamais rejouées.
    maillage.instanceMatrix.setUsage(THREE.StaticDrawUsage)
    cage.add(maillage)
    return maillage
  }

  const lotMarches = lot(geoMarche, M.boisClair())
  const lotTapis = lot(geoTapis, M.tapisEscalier(), { ombre: false })
  const lotBarres = lot(geoBarre, M.laiton(), { recoit: false })
  const lotContres = lot(geoContre, M.platre(), { ombre: false })
  const lotBarreaux = lot(geoBarreau, M.ferForge(), { recoit: false })

  const pointsRampe = []
  const pose = new THREE.Matrix4()
  const lieu = new THREE.Vector3()
  const tournant = new THREE.Quaternion()
  const unite = new THREE.Vector3(1, 1, 1)
  const orientation = new THREE.Euler()

  /** Pose l'instance `i` d'un lot, à partir d'une position et d'angles d'Euler. */
  const poserInstance = (maillage, i, x, y, z, ex = 0, ey = 0, ez = 0) => {
    lieu.set(x, y, z)
    orientation.set(ex, ey, ez)
    tournant.setFromEuler(orientation)
    pose.compose(lieu, tournant, unite)
    maillage.setMatrixAt(i, pose)
  }

  for (let i = 0; i < marchesTotal; i += 1) {
    const angle = ANGLE_BASE + i * angleMarche
    const y = 0.16 + i * hauteurMarche

    poserInstance(lotMarches, i, AXE.x, y, AXE.z, 0, angle, 0)
    poserInstance(lotTapis, i, AXE.x, y + 0.128, AXE.z, 0, angle, 0)

    // Barre de laiton au nez de marche : le détail qui tient le tapis, et qui
    // accroche la lumière à chaque révolution.
    const aBarre = angle + angleMarche * 0.5
    poserInstance(
      lotBarres,
      i,
      AXE.x + Math.cos(-aBarre) * (RAYON_JOUR + 0.5),
      y + 0.145,
      AXE.z + Math.sin(-aBarre) * (RAYON_JOUR + 0.5),
      0,
      aBarre,
      Math.PI / 2,
    )

    // Contremarche, peinte en blanc comme sur les escaliers bourgeois.
    poserInstance(
      lotContres,
      i,
      AXE.x + Math.cos(-angle) * ((RAYON_JOUR + RAYON_MARCHE) / 2),
      y - hauteurMarche / 2 + 0.06,
      AXE.z + Math.sin(-angle) * ((RAYON_JOUR + RAYON_MARCHE) / 2),
      0,
      angle,
      0,
    )

    // Barreaudage de fer forgé, côté jour — c'est du côté du vide qu'on tient
    // une rampe, jamais du côté du mur.
    const rBarreau = RAYON_JOUR + 0.07
    poserInstance(
      lotBarreaux,
      i,
      AXE.x + Math.cos(-angle) * rBarreau,
      y + 0.12 + 0.46,
      AXE.z + Math.sin(-angle) * rBarreau,
    )

    pointsRampe.push(
      new THREE.Vector3(
        AXE.x + Math.cos(-angle) * rBarreau,
        y + 1.04,
        AXE.z + Math.sin(-angle) * rBarreau,
      ),
    )
  }

  ;[lotMarches, lotTapis, lotBarres, lotContres, lotBarreaux].forEach((maillage) => {
    maillage.instanceMatrix.needsUpdate = true
    // La boîte englobante d'une `InstancedMesh` ne se déduit pas de sa
    // géométrie : sans ce calcul, l'escalier serait écarté du rendu dès que
    // l'origine de sa géométrie sort du champ — c'est-à-dire presque toujours.
    maillage.computeBoundingSphere()
  })

  // Main courante de bois : un tube qui suit l'hélice d'un bout à l'autre.
  const rampe = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pointsRampe), marchesTotal * 2, 0.045, 8, false),
    M.boisVerni(),
  )
  rampe.castShadow = true
  cage.add(rampe)

  /**
   * UNE APPLIQUE PAR ÉTAGE, ET AU-DESSUS DE LA TÊTE.
   *
   * Elles étaient à soixante centimètres du sol : à hauteur de genou, ce qui ne
   * se voyait pas tant que la caméra survolait le milieu du puits. On monte
   * désormais les marches, et l'on passe à cinquante centimètres du mur — une
   * applique à cette hauteur-là arrivait en plein dans le cadre et brûlait
   * l'image à chaque étage.
   *
   * Deux mètres dix : au-dessus d'une porte, là où l'on pose une applique de
   * cage d'escalier. Et plus petite, et moins ardente — c'est une veilleuse
   * qu'on longe, pas un projecteur qu'on croise.
   */
  for (let e = 0; e <= NIVEAU_MAX; e += 1) {
    const angle = ANGLE_BASE + 2.4 + e * Math.PI * 1.35
    const applique = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 8, 6),
      new THREE.MeshStandardMaterial({
        color: 0xf6e3c0,
        emissive: 0xf6c978,
        emissiveIntensity: 0.85,
        roughness: 0.5,
      }),
    )
    applique.position.set(
      AXE.x + Math.cos(-angle) * (RAYON_MARCHE + 0.02),
      2.1 + e * HAUTEUR_NIVEAU,
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

  /**
   * LE CHAMBRANLE EST UN CADRE, PAS UN PANNEAU.
   *
   * Il était plein — deux blocs pleins, l'huisserie et son jour — et la porte
   * du palier n'ouvrait donc sur rien : on la traversait. Cela ne se voyait pas
   * tant que la caméra franchissait le seuil en une demi-seconde, à la vitesse
   * d'un drone. On y entre désormais à pied, et lentement : le panneau
   * remplissait le cadre pendant trois bonnes secondes, gris et muet, juste au
   * moment où l'on découvre le logement.
   *
   * Deux montants et un linteau : le jour reste ouvert, et l'on voit le séjour
   * depuis le palier — ce qui est tout l'objet d'une porte qui s'ouvre.
   */
  const LARGEUR_JOUR = 1.1
  ;[-1, 1].forEach((cote) => {
    const montant = poser(palier, boite(0.16, 2.62, 0.16, M.platre()))
    montant.position.set(AXE.x + (cote * (LARGEUR_JOUR + 0.16)) / 2, 1.31, Z_FOND - 0.2)
    // Tableau sombre au nu du jour : c'est lui qui donne son épaisseur au mur.
    const tableau = poser(palier, boite(0.06, 2.46, 0.2, M.platreOmbre()), { ombre: false })
    tableau.position.set(AXE.x + (cote * LARGEUR_JOUR) / 2, 1.23, Z_FOND - 0.2)
  })
  const linteau = poser(palier, boite(LARGEUR_JOUR + 0.32, 0.16, 0.16, M.platre()))
  linteau.position.set(AXE.x, 2.54, Z_FOND - 0.2)

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

  /**
   * REFEND ENTRE DEUX PIÈCES DE L'ENFILADE — un mur, et son passage.
   *
   * Le passage est décalé VERS LA FAÇADE, et non centré : c'est la règle de
   * l'enfilade parisienne, et c'est elle qui fait qu'en se tenant dans la
   * première pièce on voit d'un trait la fenêtre de la troisième. Un passage
   * centré donnerait trois pièces alignées mais fermées les unes aux autres.
   */
  const zPassage = Z_FACADE - 1.55
  const refendEnfilade = (x) => {
    const bord = zPassage - PASSAGE_ENFILADE / 2
    // Le pan du fond, du mur d'entrée jusqu'au passage.
    panneauMur(bord - Z_FOND, x, (Z_FOND + bord) / 2, Math.PI / 2)
    // Le pan de façade, du passage à la fenêtre — court, mais c'est lui qui
    // ferme le tableau de la porte.
    const reste = Z_FACADE - (zPassage + PASSAGE_ENFILADE / 2)
    panneauMur(reste, x, Z_FACADE - reste / 2, Math.PI / 2)

    // Le chambranle mouluré du passage, et son linteau : sans eux, le trou dans
    // le mur n'est pas une porte.
    const linteau = poser(appartement, boite(0.16, AH - 2.55, PASSAGE_ENFILADE + 0.3, M.platre()))
    linteau.position.set(x, AH - (AH - 2.55) / 2, zPassage)
    ;[-1, 1].forEach((cote) => {
      const tableau = poser(appartement, boite(0.2, 2.55, 0.16, M.platre()), { ombre: false })
      tableau.position.set(x, 1.275, zPassage + (cote * PASSAGE_ENFILADE) / 2)
    })
    // LES DEUX VANTAUX, GRANDS OUVERTS contre les tableaux : une porte
    // d'enfilade reste ouverte, c'est tout son objet. Ouverts, ils sont
    // perpendiculaires au refend — des panneaux qui avancent dans la pièce, et
    // non des panneaux dans le mur : c'est ce qui se voit en passant.
    ;[-1, 1].forEach((cote) => {
      const vantail = poser(appartement, boite(0.72, 2.45, 0.05, M.boisVerni()))
      vantail.position.set(x + 0.36, 1.225, zPassage + cote * (PASSAGE_ENFILADE / 2 - 0.03))
      const caisson = poser(appartement, boite(0.5, 0.62, 0.03, M.platre()), { ombre: false })
      caisson.material.color.setHex(0x82502c)
      caisson.position.set(x + 0.36, 1.62, zPassage + cote * (PASSAGE_ENFILADE / 2 - 0.06))
    })
  }

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
  /*  Les deux pièces suivantes de l'enfilade                               */
  /* ---------------------------------------------------------------------- */

  /**
   * LES PIÈCES SE SUIVENT VERS LA DROITE, chacune avec sa fenêtre.
   *
   * Elles reprennent la grammaire du séjour — parquet, plinthe, cimaise,
   * corniche, fenêtre à la française et son garde-corps — et rien de plus : ce
   * sont les MÊMES pièces, pas des pièces différentes. Ce qui les distingue est
   * ce qu'on y met (voir le mobilier, plus bas).
   *
   * Elles débordent de l'emprise de l'immeuble vu de la rue, et c'est sans
   * conséquence : la façade extérieure est masquée pendant toute la visite
   * (`batiment.visible = !dedans`, voir `DroneScene`), et l'on ne voit donc
   * jamais les deux en même temps.
   */
  const pieces = [{ id: 'sejour', x0: -AL / 2, x1: AL / 2, xCentre: 0 }]

  ENFILADE.forEach(({ id, largeur }, index) => {
    const x0 = pieces[pieces.length - 1].x1
    const x1 = x0 + largeur
    const xCentre = (x0 + x1) / 2

    // Le refend qui la sépare de la pièce précédente, et son passage.
    refendEnfilade(x0)

    const solPiece = poser(appartement, boite(largeur, 0.08, AP, M.parquet()), { ombre: false })
    solPiece.position.set(xCentre, -0.04, zCentre)
    solPiece.material.map.repeat.set(largeur / 3, AP / 3)

    const plafondPiece = poser(appartement, boite(largeur, 0.12, AP, M.platre()), { ombre: false })
    plafondPiece.position.set(xCentre, AH, zCentre)

    // Mur du fond, et mur de refend extérieur pour la dernière pièce.
    panneauMur(largeur, xCentre, Z_FOND - 0.02, 0)
    if (index === ENFILADE.length - 1) panneauMur(AP, x1, zCentre, Math.PI / 2)

    // La façade : deux trumeaux, l'allège, l'imposte et la fenêtre.
    const largeurF = 1.35
    const trumeau = (largeur - largeurF) / 2
    ;[-1, 1].forEach((cote) => {
      const pan = poser(appartement, boite(trumeau, AH, 0.16, M.platre()))
      pan.position.set(xCentre + (cote * (largeur - trumeau)) / 2, AH / 2, Z_FACADE)
    })
    const allegePiece = poser(appartement, boite(largeur, 0.42, 0.16, M.platre()))
    allegePiece.position.set(xCentre, 0.21, Z_FACADE)
    const impostePiece = poser(appartement, boite(largeur, 0.35, 0.16, M.platre()))
    impostePiece.position.set(xCentre, AH - 0.18, Z_FACADE)

    const croisee = fenetreFrancaise({ largeur: largeurF, hauteur: AH - 0.42 - 0.35, appui: false })
    croisee.position.set(xCentre, 0.42, Z_FACADE)
    appartement.add(croisee)
    const gardeF = gardeCorpsFer({ largeur: largeurF + 0.1, hauteur: 0.88 })
    gardeF.position.set(xCentre, 0.42, Z_FACADE + 0.14)
    appartement.add(gardeF)

    // Rosace et lustre : chaque pièce a le sien, sinon la seconde et la
    // troisième paraissent éteintes à côté de la première.
    const rosacePiece = poser(
      appartement,
      new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.52, 0.1, 20), M.platre()),
      { ombre: false },
    )
    rosacePiece.position.set(xCentre, AH - 0.08, zCentre - 0.3)
    const lustrePiece = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 12, 10),
      new THREE.MeshStandardMaterial({
        color: 0xfff0d2,
        emissive: 0xf6c978,
        emissiveIntensity: 1.7,
        roughness: 0.4,
      }),
    )
    lustrePiece.position.set(xCentre, AH - 0.5, zCentre - 0.3)
    appartement.add(lustrePiece)

    /**
     * LE MEUBLE QUI FAIT LA PIÈCE, et qui ne se déclare pas.
     *
     * Une salle à manger sans table et une chambre sans lit ne sont pas des
     * pièces vides : ce sont des pièces qu'on ne reconnaît pas. Or la caméra les
     * traverse toutes les trois quelle que soit la surface annoncée — un studio
     * de trente mètres carrés comme un deux cents. Ces deux meubles-là sont donc
     * de la pièce, au même titre que sa cheminée l'est du séjour, et le mobilier
     * déclaré à la surface vient par-dessus (voir les paliers, plus bas).
     */
    if (id === 'salle-a-manger') {
      const plateau = poser(appartement, boite(2.1, 0.07, 1.05, M.boisClair()))
      plateau.material.color.setHex(0x7b5230)
      plateau.position.set(xCentre, 0.75, zCentre)
      ;[-1, 1].forEach((sx) => {
        const pied = poser(appartement, boite(0.1, 0.74, 0.9, M.aluNoir()))
        pied.position.set(xCentre + sx * 0.88, 0.37, zCentre)
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
          chaise.position.set(xCentre + dx, 0, zCentre + sz * 0.8)
          appartement.add(chaise)
        })
      })
    }

    if (id === 'chambre') {
      // Le lit adossé au mur du fond, tête vers la cage : c'est la seule place
      // d'une chambre d'enfilade — la fenêtre est en face, la porte sur le côté.
      const zLit = Z_FOND + 1.5
      const sommier = poser(appartement, boite(1.7, 0.34, 2.05, M.boisVerni()))
      sommier.position.set(xCentre, 0.17, zLit)
      const matelas = poser(appartement, boite(1.62, 0.26, 1.98, M.tissuClair()))
      matelas.position.set(xCentre, 0.47, zLit)
      const couette = poser(appartement, boite(1.66, 0.12, 1.35, M.tissuBleu()))
      couette.position.set(xCentre, 0.64, zLit + 0.3)
      ;[-1, 1].forEach((dx) => {
        const oreiller = poser(appartement, boite(0.68, 0.14, 0.4, M.tissuClair()))
        oreiller.position.set(xCentre + dx * 0.42, 0.66, zLit - 0.78)
      })
      const tete = poser(appartement, boite(1.8, 1.0, 0.1, M.tissuClair()))
      tete.position.set(xCentre, 0.5, zLit - 1.07)
      ;[-1, 1].forEach((dx) => {
        const chevet = poser(appartement, boite(0.42, 0.5, 0.36, M.boisVerni()))
        chevet.position.set(xCentre + dx * 1.2, 0.25, zLit - 0.85)
        const lampe = new THREE.Mesh(
          new THREE.ConeGeometry(0.13, 0.18, 10),
          new THREE.MeshStandardMaterial({
            color: 0xfdf2dd,
            emissive: 0xf6c978,
            emissiveIntensity: 1.1,
            roughness: 0.6,
          }),
        )
        lampe.position.set(xCentre + dx * 1.2, 0.6, zLit - 0.85)
        appartement.add(lampe)
      })
      const tapisLit = poser(appartement, boite(2.4, 0.03, 1.6, M.tapisSalon()), { ombre: false })
      tapisLit.position.set(xCentre, 0.02, zLit + 1.5)
    }

    pieces.push({ id, x0, x1, xCentre })
  })

  /* ---------------------------------------------------------------------- */
  /*  Le mobilier, par paliers de 30 m²                                     */
  /* ---------------------------------------------------------------------- */

  /**
   * Un groupe par palier. Ils arrivent dans l'ordre où l'on meuble vraiment un
   * appartement : d'abord de quoi s'asseoir, puis de quoi recevoir, puis le
   * reste. Chacun se fond sur dix-huit mètres carrés, si bien qu'entre deux
   * paliers on voit toujours quelque chose arriver.
   */
  /** Abscisse du centre d'une pièce de l'enfilade, par son nom. */
  const centreDe = (id) => pieces.find((piece) => piece.id === id)?.xCentre ?? 0
  const X_SAM = centreDe('salle-a-manger')
  const X_CHAMBRE = centreDe('chambre')

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

  // 150 m² — la cuisine ouverte de la salle à manger, et son îlot.
  //
  // Elle a quitté le séjour en même temps que la table : une cuisine s'ouvre sur
  // la pièce où l'on mange, pas sur celle où l'on reçoit.
  ajouterPalier((bloc) => {
    const xIlot = X_SAM - 0.2
    const ilot = poser(bloc, boite(2.0, 0.92, 0.85, M.platre()))
    ilot.position.set(xIlot, 0.46, Z_FOND + 1.0)
    const plan = poser(bloc, boite(2.14, 0.08, 0.97, M.marbre()))
    plan.position.set(xIlot, 0.94, Z_FOND + 1.0)
    ;[-0.6, 0, 0.6].forEach((dx) => {
      const tabouret = new THREE.Group()
      const assise = poser(tabouret, fut(0.17, 0.07, M.boisClair(), 12))
      assise.position.y = 0.66
      const fut_ = poser(tabouret, fut(0.04, 0.64, M.aluNoir(), 8))
      fut_.position.y = 0.32
      tabouret.position.set(xIlot + dx, 0, Z_FOND + 1.72)
      bloc.add(tabouret)
    })
    const hauts = poser(bloc, boite(1.9, 0.66, 0.34, M.platre()))
    hauts.position.set(xIlot, 1.95, Z_FOND + 0.3)
  })

  // 180 m² — la salle de bains de la chambre, derrière sa verrière d'atelier.
  //
  // Elle était plantée en travers du séjour, là où passe désormais l'enfilade :
  // une salle de bains au milieu d'une pièce de réception fermait le passage
  // d'une pièce à l'autre. Elle est là où elle doit être — au fond de la
  // chambre, et derrière une verrière plutôt qu'un mur, pour que la lumière de
  // la fenêtre la traverse.
  ajouterPalier((bloc) => {
    const xVerriere = X_CHAMBRE + 0.85
    const zBain = Z_FOND + 1.6
    const verriere = poser(bloc, boite(0.06, 2.35, 2.4, M.vitrage()), { ombre: false })
    verriere.position.set(xVerriere, 1.18, zBain)
    for (let i = 0; i < 5; i += 1) {
      const montant = poser(bloc, boite(0.08, 2.35, 0.05, M.aluNoir()), { ombre: false })
      montant.position.set(xVerriere, 1.18, zBain - 1.2 + i * 0.58)
    }
    const baignoire = poser(bloc, boite(0.78, 0.52, 1.55, M.marbre()))
    baignoire.position.set(xVerriere + 0.72, 0.28, zBain - 0.35)
    const eauBain = poser(bloc, boite(0.62, 0.08, 1.35, M.eauPiscine()), { ombre: false })
    eauBain.position.set(xVerriere + 0.72, 0.5, zBain - 0.35)
    const vasque = poser(bloc, boite(0.52, 0.1, 1.0, M.marbre()))
    vasque.position.set(xVerriere + 0.78, 0.86, zBain + 1.15)
    const miroir = poser(bloc, boite(0.7, 0.9, 0.04, M.marbre()), { ombre: false })
    miroir.material.color.setHex(0xd9dee1)
    miroir.material.metalness = 0.6
    miroir.material.roughness = 0.08
    miroir.position.set(xVerriere + 0.78, 1.6, zBain + 1.62)
  })

  // 210 m² — le dressing de la chambre : une penderie toute hauteur et sa
  // psyché. C'est ce qu'un grand appartement ajoute à une chambre, et c'est ce
  // qui remplit le pan de mur que la salle de bains ne prend pas.
  ajouterPalier((bloc) => {
    const xPenderie = X_CHAMBRE - 1.45
    const corps = poser(bloc, boite(0.58, 2.45, 2.3, M.boisVerni()))
    corps.position.set(xPenderie, 1.22, Z_FOND + 2.9)
    ;[-1, 1].forEach((dz) => {
      const porte = poser(bloc, boite(0.05, 2.3, 1.06, M.platre()), { ombre: false })
      porte.material.color.setHex(0xe8dcc6)
      porte.position.set(xPenderie + 0.31, 1.22, Z_FOND + 2.9 + dz * 0.58)
      const poignee = poser(bloc, fut(0.018, 0.34, M.laiton(), 8), { ombre: false })
      poignee.position.set(xPenderie + 0.36, 1.22, Z_FOND + 2.9 + dz * 0.12)
    })
    const psyche = poser(bloc, boite(0.06, 1.55, 0.62, M.marbre()), { ombre: false })
    psyche.material.color.setHex(0xd9dee1)
    psyche.material.metalness = 0.6
    psyche.material.roughness = 0.08
    psyche.position.set(xPenderie + 0.72, 0.85, Z_FOND + 0.9)
    psyche.rotation.z = 0.06
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
  //
  // ELLE SE TIENT AU-DESSUS DE LA TÊTE, et elle est faible. Tant que la caméra
  // survolait le milieu du puits, la lampe était au même endroit qu'elle et
  // n'éclairait que des surfaces lointaines. On monte désormais les marches :
  // la lampe est à un mètre de l'épaule, et la moindre intensité de plafonnier
  // y brûlait le mur de cage et le dessous des volées.
  const lumiereCage = new THREE.PointLight(0xffd9a0, 0, 13, 2)
  lumiereCage.position.set(AXE.x, 3, AXE.z)
  groupe.add(lumiereCage)

  const lumiereSejour = new THREE.PointLight(0xfff1dc, 0, 13, 2)
  lumiereSejour.position.set(0, AH - 0.6, zCentre - 0.2)
  groupe.add(lumiereSejour)

  /**
   * UNE LAMPE PAR PIÈCE DE L'ENFILADE.
   *
   * Celle du séjour ne porte pas jusqu'à la chambre — dix mètres plus loin, avec
   * une décroissance physique, il n'en reste rien —, et deux pièces noires au
   * bout d'une enfilade éclairée ne se lisent pas comme des pièces mais comme un
   * couloir. Leur portée est volontairement courte : chacune éclaire sa pièce,
   * et le passage d'une porte se voit.
   */
  const lumieresPieces = ENFILADE.map((_, index) => {
    const lampe = new THREE.PointLight(0xfff1dc, 0, 9, 2)
    lampe.position.set(pieces[index + 1].xCentre, AH - 0.6, zCentre - 0.2)
    groupe.add(lampe)
    return lampe
  })

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
    etageCourant = Math.max(0.5, Math.min(NIVEAU_MAX, Number.isFinite(etage) ? etage : 1))
    // Un étage vaut un tour exactement : la marche d'arrivée regarde toujours
    // vers +Z, et le palier comme le logement n'ont qu'à monter — jamais à
    // tourner. Leurs pièces portent déjà leurs coordonnées dans le repère de
    // la visite : seul le décalage en hauteur change.
    const y = 0.16 + etageCourant * HAUTEUR_NIVEAU
    palier.position.set(0, y, 0)
    appartement.position.set(0, y, 0)
    lumiereSejour.position.y = y + AH - 0.6
    lumieresPieces.forEach((lampe) => {
      lampe.position.y = y + AH - 0.6
    })
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
     * LA VOLÉE — ce qu'on monte, et à hauteur d'œil.
     *
     * Ce n'est plus un drone qui traverse le puits : c'est QUELQU'UN QUI MONTE
     * L'ESCALIER. Le regard se tient au milieu du giron, à un mètre soixante au
     * -dessus du nez de marche, et il avance marche par marche — un tour par
     * étage déclaré, exactement comme les marches sont posées.
     *
     * On y gagne les deux choses qu'un survol du puits ne donnait pas : on voit
     * les marches qu'on gravit, et l'on sait où l'on est. Trois étages, trois
     * tours, et le tapis passe sous les pieds à chaque révolution.
     *
     * Tout est rendu en coordonnées MONDE — la scène n'a pas à connaître
     * l'échelle de la visite.
     */
    volee(niveau) {
      const n = Math.max(0, Math.min(NIVEAU_MAX, niveau))
      // Le nombre de marches franchies : c'est lui qui donne le pas, et donc la
      // cadence du balancement de la tête (voir `DroneScene`).
      const marches = n * MARCHES_PAR_TOUR
      const oeil = (u) =>
        groupe.position.y + (0.16 + u * hauteurMarche + 0.14 + HAUTEUR_OEIL) * ECHELLE

      return {
        axe: groupe.localToWorld(AXE.clone()),
        /**
         * On marche du côté du JOUR, pas du mur.
         *
         * C'est de ce côté-là qu'un escalier se lit : on a la rampe sous la
         * main, le puits ouvert à côté de soi et la spirale qui s'enroule
         * au-dessus. Collé au mur de cage, on ne verrait qu'un couloir courbe —
         * et l'on frôlerait la paroi d'assez près pour que l'éclairage y brûle.
         */
        rayon: (RAYON_JOUR + 0.36) * ECHELLE,
        psiDepart: ANGLE_BASE,
        psiArrivee: ANGLE_BASE + n * TOUR,
        yDepart: oeil(0),
        yArrivee: oeil(marches),
        marches,
        /** Hauteur d'une marche, en unités de scène — l'amplitude du pas. */
        pas: hauteurMarche * ECHELLE,
      }
    },

    /**
     * LES TROIS PIÈCES, ET COMMENT ON LES TRAVERSE.
     *
     * Une station par pièce, dans l'ordre de l'enfilade, et tout ce qu'il faut
     * pour y entrer et y regarder quelque chose :
     *
     *   `seuil`   le point du passage par lequel on entre dans la pièce — nul
     *             pour le séjour, où l'on entre par la porte du palier. C'est
     *             lui qui empêche la caméra de traverser un refend : d'une pièce
     *             à l'autre, on passe par la porte.
     *   `poste`   le milieu de la pièce, à hauteur d'œil.
     *   `mire`    ce qu'on y regarde — la cheminée, la table, le lit. Ce qui
     *             fait reconnaître la pièce en un regard.
     *   `croisee` sa fenêtre, vers laquelle le regard finit toujours par aller.
     */
    enfilade() {
      /**
       * ON SE TIENT LOIN DE CE QU'ON REGARDE, et c'est toute la question.
       *
       * Une pièce de cinq mètres sur cinq, regardée depuis son milieu, ne se
       * voit pas : l'objectif est à un mètre cinquante de la cheminée, et la
       * cheminée remplit le cadre. On ne montre pas une pièce, on montre un
       * meuble de près.
       *
       * Chaque station se place donc À L'OPPOSÉ de ce qu'elle vise — dans le
       * coin d'où la pièce se lit en entier, à trois ou quatre mètres du point
       * de mire. C'est la distance à laquelle on découvre une pièce quand on y
       * entre, et c'est de là qu'un agent la photographierait.
       *
       * Les abscisses sont des ÉCARTS au milieu de la pièce : les trois pièces
       * se suivent le long de la façade, et seule la salle à manger et la
       * chambre changent de place.
       */
      const stations = {
        // Le séjour : on se met côté fenêtres, la cheminée en face.
        sejour: { poste: [1.9, Z_FOND + 1.1], mire: [-AL / 2 + 0.9, 1.3, zCentre - 0.5] },
        // La salle à manger : depuis l'angle du fond, la table et sa fenêtre.
        'salle-a-manger': { poste: [-1.5, Z_FOND + 0.9], mire: [0.1, 0.95, zCentre + 0.3] },
        // La chambre : depuis la fenêtre, le lit adossé au fond.
        chambre: { poste: [0.2, Z_FACADE - 1.4], mire: [0, 0.85, Z_FOND + 1.5] },
      }

      return pieces.map((piece, index) => {
        const station = stations[piece.id] ?? {
          poste: [0, zCentre],
          mire: [0, 1.2, Z_FOND + 1],
        }
        const [dxPoste, zPoste] = station.poste
        const [dxMire, yMire, zMire] = station.mire

        return {
          id: piece.id,
          seuil: index === 0 ? null : dansAppartement(piece.x0, HAUTEUR_OEIL, zPassage),
          poste: dansAppartement(piece.xCentre + dxPoste, HAUTEUR_OEIL, zPoste),
          mire: dansAppartement(piece.xCentre + dxMire, yMire, zMire),
          croisee: dansAppartement(piece.xCentre, HAUTEUR_OEIL * 0.94, Z_FACADE - 0.3),
        }
      })
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

      // La lampe de cage se cale sur la hauteur du regard, en repère local, et
      // se tient une volée plus haut : on éclaire les marches à venir.
      if (Number.isFinite(v.yCamera)) {
        lumiereCage.position.y = (v.yCamera - groupe.position.y) / ECHELLE + 1.9
      }
      lumiereCage.intensity = v.dedans * 1.7
      lumiereSejour.intensity = v.dedans * 7
      lumieresPieces.forEach((lampe) => {
        lampe.intensity = v.dedans * 5.5
      })
      jourFenetre.intensity = v.dedans * 1.4
      groupe.visible = v.dedans > 0.01
    },
  }
}
