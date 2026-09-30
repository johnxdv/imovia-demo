import * as THREE from 'three'
import * as M from './matieres'
import {
  arbre,
  baieVitree,
  boite,
  buisson,
  calerTexture,
  fut,
  gardeCorpsVerre,
  pergola as creerPergola,
  poser,
  revelable,
} from './kit'

/**
 * L'IMMEUBLE — toujours le même, et désormais CONTEMPORAIN.
 *
 * Il était haussmannien : pierre de taille, balcons de fer forgé, comble
 * mansardé de zinc, mitoyens de part et d'autre. C'était juste pour Paris, et
 * faux à peu près partout ailleurs — un appartement estimé en France en 2026
 * se trouve neuf fois sur dix dans un immeuble comme celui-ci : une résidence
 * récente, de cinq ou six niveaux, en béton blanc et bois.
 *
 * LA COMPOSITION, et elle tient en quatre choses :
 *
 *   • LES DALLES EN DÉBORD. Un grand plateau de béton blanc par niveau, qui
 *     sort de la façade sur toute sa longueur et déborde aussi sur les côtés.
 *     Empilées, elles font à elles seules tout le dessin de l'immeuble : ce
 *     sont ces lignes horizontales, et leur ombre portée sur le niveau du
 *     dessous, qu'on voit en premier.
 *   • LES BALCONS DÉCALÉS. À chaque niveau, certaines travées viennent au nez
 *     de la dalle en volume plein — des blocs blancs —, les autres restent en
 *     retrait et deviennent des balcons, fermés d'un garde-corps de verre. Les
 *     travées pleines ne sont pas les mêmes d'un étage à l'autre : c'est ce
 *     décalage qui empêche la façade d'être une grille.
 *   • LE BARDAGE DE BOIS VERTICAL. En fond de balcon, à côté des baies. C'est
 *     la seule matière chaude de l'immeuble, et c'est elle qui l'empêche d'être
 *     un parking à étages.
 *   • LE TOIT PLAT, son acrotère, son édicule technique et son PORTIQUE — le
 *     grand cadre de béton posé sur l'angle, qui signe la silhouette.
 *
 * LE REZ-DE-CHAUSSÉE EST EN RETRAIT, et c'est ce qui fait tout tenir : la
 * première dalle passe devant lui, portée par deux poteaux, et l'immeuble
 * paraît posé sur du vide plutôt que planté dans le sol.
 *
 * IL N'A PLUS DE MITOYENS. Une résidence contemporaine se tient sur sa
 * parcelle, pas dans un alignement : il n'y a plus rien à sa gauche ni à sa
 * droite, seulement la rue devant et deux arbres qui l'encadrent.
 *
 * Il ne change ni avec la surface ni avec l'étage déclarés — de l'étage, il ne
 * montre que SES BAIES QUI S'ALLUMENT (voir `designerEtage`), et c'est tout ce
 * qu'un immeuble peut honnêtement dire d'un logement qu'on ne voit pas de la
 * rue.
 */

/** Gabarit de l'immeuble, en unités de scène (une unité ≈ 1,80 m). */
export const LARGEUR = 9.2
export const PROFONDEUR = 7.4
/** Le rez-de-chaussée est plus haut que les étages : c'est un hall. */
export const HAUTEUR_RDC = 1.95
export const HAUTEUR_ETAGE = 1.62
/** Cinq étages sur rez-de-chaussée : six niveaux, l'échelle d'une résidence. */
export const ETAGES = 5
/** Nombre de travées de la façade. */
const TRAVEES = 4
/** De combien la dalle sort de la façade — et donc la profondeur des balcons. */
const DEBORD = 0.95
const EPAISSEUR_DALLE = 0.24
const LARGEUR_TRAVEE = LARGEUR / TRAVEES
/** Retrait du rez-de-chaussée sous la première dalle. */
const RETRAIT_RDC = 0.6
/** De combien un volume plein s'arrête en deçà du nez de dalle. */
const RETRAIT_BLOC = 0.22

/** Hauteur du plancher d'un étage donné (0 = rez-de-chaussée). */
export const hauteurEtage = (etage) =>
  etage <= 0 ? 0.25 : HAUTEUR_RDC + (Math.min(etage, ETAGES) - 1) * HAUTEUR_ETAGE

/** Abscisse du centre d'une travée. */
export const travee = (index) => -LARGEUR / 2 + ((index + 0.5) * LARGEUR) / TRAVEES

/**
 * Travée sur laquelle le logement du vendeur est aligné — celle où son balcon
 * d'affinage se pose, et où son rez-de-jardin s'ouvre.
 *
 * Elle est CHOISIE PARMI CELLES QUI NE SONT JAMAIS EN SAILLIE (voir
 * `SAILLIES`) : un balcon déclaré qui sortirait d'un volume plein ne se lirait
 * pas comme un balcon, mais comme une erreur de dessin.
 */
export const TRAVEE_LOGEMENT = 2

/** Travée de l'entrée — jamais au milieu : une façade se rythme. */
const TRAVEE_PORTE = 1

/**
 * LES TRAVÉES PLEINES, ÉTAGE PAR ÉTAGE — et c'est toute la composition.
 *
 * Une ligne par niveau, de haut en bas de la liste comme du bas vers le haut de
 * l'immeuble. Les travées citées viennent au nez de la dalle en volume plein ;
 * les autres restent en retrait et sont des balcons. Écrit à la main plutôt
 * que calculé en alternance : une alternance stricte redonne une grille, et
 * c'est précisément ce qu'on cherche à éviter. La travée 2 n'y figure jamais —
 * c'est celle du logement du vendeur.
 */
const SAILLIES = [
  [0, 3],
  [1, 3],
  [0],
  [1, 3],
  [0, 3],
]

/**
 * BAIE DE LOGEMENT — une grande verrière, et la pièce sombre derrière elle.
 *
 * Le fond de pièce n'est pas un détail : c'est lui qui s'éclaire quand le
 * vendeur déclare son étage. Allumer la seule vitre poserait un reflet ambré
 * sur un trou noir, ce qui se lit comme un verre teinté et non comme un
 * logement habité.
 */
function baieLogement({ largeur, hauteur }) {
  const groupe = new THREE.Group()

  const tableau = poser(groupe, boite(largeur - 0.04, hauteur - 0.04, 0.06, M.platreOmbre()), {
    ombre: false,
  })
  tableau.material.color.setHex(0x272c33)
  tableau.position.set(0, hauteur / 2, -0.08)

  const baie = baieVitree({
    largeur,
    hauteur,
    meneaux: Math.max(2, Math.round(largeur / 0.9)),
    traverse: hauteur > 1.2,
    sombre: true,
  })
  groupe.add(baie)

  groupe.userData.vitre = baie.userData.vitre
  groupe.userData.tableau = tableau
  return groupe
}

/** Panneau de bardage vertical, calé sur la taille réelle de la lame. */
function panneauBardage(largeur, hauteur, epaisseur = 0.09) {
  return calerTexture(boite(largeur, hauteur, epaisseur, M.bardageVertical()), 1.3)
}

/** Voile de béton blanc, texture calée sur la trame du coffrage. */
function voileBeton(largeur, hauteur, profondeur, matiere = null) {
  return calerTexture(boite(largeur, hauteur, profondeur, matiere ?? M.betonBlanc()), 0.34)
}

export function creerImmeuble() {
  const groupe = new THREE.Group()
  const montant = new THREE.Group()
  groupe.add(montant)

  const zFacade = PROFONDEUR / 2
  /** Le nez de dalle : jusqu'où le plateau de béton sort de la façade. */
  const zNez = zFacade + DEBORD
  /** Le bord latéral de la dalle. */
  const xNez = LARGEUR / 2 + DEBORD
  const yToit = hauteurEtage(ETAGES) + HAUTEUR_ETAGE

  /**
   * LES BAIES, RANGÉES PAR ÉTAGE — ce qui permet d'allumer UN niveau et lui
   * seul quand le vendeur déclare le sien (voir `designerEtage`).
   */
  const baiesParEtage = new Map()
  const retenirBaie = (etage, baie) => {
    const liste = baiesParEtage.get(etage) ?? []
    if (baie.userData.vitre) liste.push(baie.userData.vitre.material)
    if (baie.userData.tableau) liste.push(baie.userData.tableau.material)
    baiesParEtage.set(etage, liste)
  }

  const menuiseries = new THREE.Group()
  const bardages = new THREE.Group()
  const balcons = new THREE.Group()

  /* --- Le rez-de-chaussée : en retrait, vitré, et son entrée -------------- */

  const entree = new THREE.Group()

  // Le noyau du hall, reculé sous la première dalle. Béton sombre : c'est
  // l'ombre du retrait qui creuse le socle, et une matière claire y perdrait
  // tout le bénéfice.
  const noyauRdc = poser(
    entree,
    voileBeton(LARGEUR - 2 * RETRAIT_RDC, HAUTEUR_RDC, PROFONDEUR - RETRAIT_RDC, M.betonSombre()),
  )
  noyauRdc.position.set(0, HAUTEUR_RDC / 2, -RETRAIT_RDC / 2)

  // La verrière du hall, sur toute la façade du socle. Un rez-de-chaussée
  // contemporain est vitré d'un bout à l'autre — c'est ce qui le distingue
  // d'un soubassement.
  const zVitrageRdc = zFacade - RETRAIT_RDC + 0.04
  for (let i = 0; i < TRAVEES; i += 1) {
    const x = travee(i)
    const porte = i === TRAVEE_PORTE
    const baie = baieLogement({
      largeur: LARGEUR_TRAVEE - 0.34,
      hauteur: porte ? HAUTEUR_RDC - 0.18 : HAUTEUR_RDC - 0.5,
    })
    baie.position.set(x, porte ? 0.06 : 0.36, zVitrageRdc)
    entree.add(baie)
    retenirBaie(0, baie)
  }

  // Les deux vantaux de l'entrée : alu noir toute hauteur, poignée-barre.
  ;[-1, 1].forEach((cote) => {
    const dormant = poser(entree, boite(0.07, HAUTEUR_RDC - 0.18, 0.12, M.aluNoir()), {
      ombre: false,
    })
    dormant.position.set(travee(TRAVEE_PORTE) + cote * 0.52, (HAUTEUR_RDC - 0.18) / 2 + 0.06, zVitrageRdc + 0.05)
  })
  const barre = poser(entree, boite(0.05, 1.0, 0.05, M.laiton()), { ombre: false })
  barre.position.set(travee(TRAVEE_PORTE) + 0.4, 0.86, zVitrageRdc + 0.09)

  // Le parvis : une dalle de pierre claire devant l'entrée, et sa marche.
  const parvis = poser(entree, calerTexture(boite(3.4, 0.1, 2.3, M.dallage()), 0.6), { ombre: false })
  parvis.position.set(travee(TRAVEE_PORTE), 0.05, zFacade + 0.55)
  const marche = poser(entree, boite(3.0, 0.08, 0.6, M.betonBlanc()), { ombre: false })
  marche.position.set(travee(TRAVEE_PORTE), 0.04, zFacade + 1.55)

  // Le numéro de la résidence, en applique sur le voile du socle.
  ;[-1, 1].forEach((cote) => {
    const applique = poser(entree, boite(0.09, 0.42, 0.09, M.aluNoir()), { ombre: false })
    applique.position.set(travee(TRAVEE_PORTE) + cote * 1.15, 1.45, zVitrageRdc + 0.08)
    applique.material.emissive.setHex(0x2a2116)
    applique.material.emissiveIntensity = 0.5
  })

  // LES DEUX POTEAUX qui portent la première dalle au droit du retrait. Sans
  // eux, le plateau du premier étage est en porte-à-faux sur toute sa
  // profondeur, et rien n'explique comment il tient.
  ;[-1, 1].forEach((cote) => {
    const poteau = poser(entree, fut(0.14, HAUTEUR_RDC, M.betonBlanc(), 12))
    poteau.position.set(cote * (LARGEUR / 2 - 0.55), HAUTEUR_RDC / 2, zFacade - 0.12)
  })

  montant.add(entree)

  /* --- Les étages : dalles, volumes pleins, balcons ----------------------- */

  for (let e = 1; e <= ETAGES; e += 1) {
    const yPlancher = hauteurEtage(e)
    const hVide = HAUTEUR_ETAGE - EPAISSEUR_DALLE

    /**
     * LA DALLE — LE GESTE DE TOUTE LA FAÇADE, ET IL SE JOUE EN TROIS PIÈCES.
     *
     * Une seule boîte de béton clair ne suffit pas : posée devant un corps du
     * même béton, sur un ciel blanc et un sol blanc, elle ne se détache de rien
     * et l'immeuble se lit comme une grille de fenêtres sur un aplat. Ce qui
     * fait lire un plateau en débord, c'est le CONTRASTE entre son nez et ce
     * qui est derrière lui — trois pièces, donc, et chacune tient un ton :
     *
     *   `dalle`    le plateau lui-même, dans le béton le plus clair. Son dessus
     *              est le plancher du niveau, elle descend de là.
     *   `soffite`  la SOUS-FACE, d'un béton plus sourd et débordant d'un rien :
     *              c'est elle qu'on voit depuis le niveau du dessous, et c'est
     *              cette ligne sombre sous chaque plateau qui donne à la façade
     *              tout son relief. Sans elle, les dalles s'empilent sans
     *              épaisseur.
     *   `larmier`  le petit bandeau qui souligne la tranche avant. Une dalle
     *              coupée net est une planche ; une dalle à larmier est du
     *              béton coulé.
     */
    const dalle = poser(
      montant,
      voileBeton(LARGEUR + 2 * DEBORD, EPAISSEUR_DALLE, PROFONDEUR + DEBORD),
    )
    dalle.position.set(0, yPlancher - EPAISSEUR_DALLE / 2, DEBORD / 2)

    const soffite = poser(
      montant,
      voileBeton(LARGEUR + 2 * DEBORD + 0.04, 0.05, PROFONDEUR + DEBORD + 0.04, M.betonBlancOmbre()),
      { ombre: false },
    )
    soffite.position.set(0, yPlancher - EPAISSEUR_DALLE - 0.02, DEBORD / 2)

    const larmier = poser(
      montant,
      voileBeton(LARGEUR + 2 * DEBORD + 0.07, 0.09, 0.07),
      { ombre: false },
    )
    larmier.position.set(0, yPlancher - EPAISSEUR_DALLE + 0.045, zNez + 0.035)

    /**
     * LE CORPS DU NIVEAU, EN RETRAIT ET PLUS SOURD.
     *
     * Il est tout ce que le plateau ne montre pas : le fond des balcons, le
     * volume habité. Dans le même béton clair que les dalles, il les annule —
     * on ne voit plus qu'un mur blanc percé. Dans un béton d'un cran plus
     * sourd, il devient l'OMBRE sur laquelle les plateaux se détachent, ce qui
     * est exactement son rôle : il est en retrait d'un mètre soixante-dix, et
     * il n'a jamais le soleil.
     */
    const corps = poser(montant, voileBeton(LARGEUR, hVide, PROFONDEUR, M.betonBlancOmbre()))
    corps.position.set(0, yPlancher + hVide / 2, 0)

    const pleines = new Set(SAILLIES[(e - 1) % SAILLIES.length])

    for (let i = 0; i < TRAVEES; i += 1) {
      const x = travee(i)

      if (pleines.has(i)) {
        // VOLUME PLEIN — le bloc blanc qui vient au nez de la dalle. C'est lui
        // qui, d'un étage à l'autre, déplace les balcons.
        // IL RECULE D'UN RIEN DERRIÈRE LE NEZ DE DALLE (`RETRAIT_BLOC`), et
        // c'est ce qui sauve la composition : le plateau passe alors devant
        // lui comme devant les balcons, et la bande blanche horizontale court
        // d'un bout à l'autre de la façade sans jamais être coupée. Affleurant,
        // le bloc la sectionnait à chaque travée pleine.
        const profondeurBloc = DEBORD - RETRAIT_BLOC
        const bloc = poser(
          montant,
          voileBeton(LARGEUR_TRAVEE - 0.1, hVide, profondeurBloc),
        )
        bloc.position.set(x, yPlancher + hVide / 2, zFacade + profondeurBloc / 2)

        const baie = baieLogement({
          largeur: LARGEUR_TRAVEE - 0.78,
          hauteur: hVide - 0.34,
        })
        baie.position.set(x, yPlancher + 0.17, zFacade + profondeurBloc + 0.02)
        menuiseries.add(baie)
        retenirBaie(e, baie)
        continue
      }

      // BALCON — la façade reste en retrait, le garde-corps de verre prend le
      // nez de la dalle, et le fond de balcon alterne la baie et le bardage.
      const largeurBaie = LARGEUR_TRAVEE * 0.56
      const baie = baieLogement({ largeur: largeurBaie, hauteur: hVide - 0.12 })
      // Le côté de la baie change d'un niveau à l'autre, comme les volumes.
      const sens = e % 2 === 0 ? -1 : 1
      baie.position.set(x - sens * LARGEUR_TRAVEE * 0.19, yPlancher + 0.06, zFacade + 0.05)
      menuiseries.add(baie)
      retenirBaie(e, baie)

      const bois = poser(bardages, panneauBardage(LARGEUR_TRAVEE * 0.38, hVide, 0.1))
      bois.position.set(x + sens * LARGEUR_TRAVEE * 0.3, yPlancher + hVide / 2, zFacade + 0.05)

      const garde = gardeCorpsVerre({ largeur: LARGEUR_TRAVEE - 0.04, hauteur: 0.62 })
      garde.position.set(x, yPlancher + 0.02, zNez - 0.06)
      balcons.add(garde)
    }

    /**
     * LES RETOURS LATÉRAUX. La dalle déborde aussi sur les côtés : ce sont des
     * balcons, et ils demandent leur garde-corps. Ils ne courent que sur la
     * part AVANT du plateau — le point de vue ne quitte jamais la façade de
     * plus de vingt-trois degrés (voir `ECART_FACE_MAX` dans `plans.js`), et
     * tout ce qui est derrière ne se voit à aucun moment du parcours.
     */
    const longueurRetour = DEBORD + 2.6
    ;[-1, 1].forEach((cote) => {
      const garde = gardeCorpsVerre({ largeur: longueurRetour, hauteur: 0.62 })
      garde.rotation.y = Math.PI / 2
      garde.position.set(cote * (xNez - 0.06), yPlancher + 0.02, zNez - longueurRetour / 2)
      balcons.add(garde)

      // Le retour du garde-corps, au bout du balcon latéral : sans lui, la
      // lame de verre s'arrête dans le vide.
      const about = gardeCorpsVerre({ largeur: DEBORD, hauteur: 0.62, panneaux: 1 })
      about.position.set(
        cote * (xNez - DEBORD / 2),
        yPlancher + 0.02,
        zNez - longueurRetour + 0.05,
      )
      balcons.add(about)

      // Bardage sur le retour de façade : la même matière chaude que devant,
      // pour que le pignon ne soit pas une plaque de béton nue.
      const bois = poser(bardages, panneauBardage(1.5, hVide, 0.1))
      bois.rotation.y = Math.PI / 2
      bois.position.set(cote * (LARGEUR / 2 + 0.05), yPlancher + hVide / 2, zFacade - 1.3)

      // Deux baies par retour : c'est ce qu'un pignon porte, pas davantage.
      for (let i = 0; i < 2; i += 1) {
        const baie = baieLogement({ largeur: 0.95, hauteur: hVide - 0.34 })
        baie.rotation.y = cote * (Math.PI / 2)
        baie.position.set(
          cote * (LARGEUR / 2 + 0.04),
          yPlancher + 0.17,
          (i === 0 ? 0.6 : -0.4) * PROFONDEUR * 0.42,
        )
        menuiseries.add(baie)
        retenirBaie(e, baie)
      }
    })
  }

  montant.add(menuiseries)
  montant.add(bardages)
  montant.add(balcons)

  /* --- Le couronnement : dalle de toiture, acrotère, portique ------------- */

  const couronnement = new THREE.Group()

  const dalleToit = poser(
    couronnement,
    voileBeton(LARGEUR + 2 * DEBORD, EPAISSEUR_DALLE, PROFONDEUR + DEBORD),
  )
  dalleToit.position.set(0, yToit - EPAISSEUR_DALLE / 2, DEBORD / 2)

  // L'acrotère : le relevé qui ceinture le toit plat, et qui donne sa ligne
  // franche au sommet. Sans lui, l'immeuble s'arrête sur une arête vive.
  const HAUTEUR_ACROTERE = 0.42
  ;[
    [LARGEUR + 2 * DEBORD, 0.12, 0, zNez - 0.06],
    [LARGEUR + 2 * DEBORD, 0.12, 0, -PROFONDEUR / 2 + 0.06],
  ].forEach(([l, p, x, z]) => {
    const relev = poser(couronnement, voileBeton(l, HAUTEUR_ACROTERE, p))
    relev.position.set(x, yToit + HAUTEUR_ACROTERE / 2, z)
  })
  ;[-1, 1].forEach((cote) => {
    const relev = poser(couronnement, voileBeton(0.12, HAUTEUR_ACROTERE, PROFONDEUR + DEBORD))
    relev.position.set(cote * (xNez - 0.06), yToit + HAUTEUR_ACROTERE / 2, DEBORD / 2)
  })

  /**
   * LE PORTIQUE — le grand cadre de béton posé sur l'angle du toit.
   *
   * Il ne sert à rien, et c'est exactement son rôle : c'est le geste
   * d'architecte de la silhouette, celui qui fait qu'on reconnaît l'immeuble
   * de loin et qu'il cesse d'être une pile de plateaux. On en voit sur toutes
   * les résidences récentes un peu dessinées — un cadre vide, cadrant le ciel
   * au-dessus de la terrasse du dernier étage.
   */
  const PORTIQUE = { largeur: 4.2, hauteur: 2.0, epaisseur: 0.34 }
  const portique = new THREE.Group()
  ;[-1, 1].forEach((cote) => {
    const montantPortique = poser(
      portique,
      voileBeton(PORTIQUE.epaisseur, PORTIQUE.hauteur, PORTIQUE.epaisseur),
    )
    montantPortique.position.set(
      (cote * (PORTIQUE.largeur - PORTIQUE.epaisseur)) / 2,
      PORTIQUE.hauteur / 2,
      0,
    )
  })
  const linteauPortique = poser(
    portique,
    voileBeton(PORTIQUE.largeur, PORTIQUE.epaisseur, PORTIQUE.epaisseur),
  )
  linteauPortique.position.y = PORTIQUE.hauteur + PORTIQUE.epaisseur / 2
  portique.position.set(LARGEUR * 0.22, yToit + 0.02, zFacade - 0.5)
  couronnement.add(portique)

  montant.add(couronnement)

  /**
   * LA TOITURE TECHNIQUE — ce que porte un toit plat quand rien n'y est
   * aménagé : une étendue de gravillon, l'édicule d'ascenseur, deux lanterneaux
   * et la centrale de ventilation. C'est le seul ouvrage du couronnement qui
   * DISPARAÎT quand le rooftop est déclaré (voir `poser`) : on n'aménage pas
   * une terrasse sur des gravillons, on les remplace.
   */
  const toiture = new THREE.Group()
  const gravillon = poser(
    toiture,
    calerTexture(boite(LARGEUR + 2 * DEBORD - 0.3, 0.06, PROFONDEUR + DEBORD - 0.3, M.gravier()), 1.4),
    { ombre: false },
  )
  gravillon.position.set(0, yToit + 0.03, DEBORD / 2)
  const edicule = poser(toiture, voileBeton(1.9, 0.72, 1.6, M.betonSombre()))
  edicule.position.set(-LARGEUR * 0.26, yToit + 0.36, -PROFONDEUR * 0.22)
  ;[-1, 1].forEach((cote) => {
    const lanterneau = poser(toiture, boite(0.85, 0.16, 0.85, M.vitrage()), { ombre: false })
    lanterneau.position.set(cote * LARGEUR * 0.2, yToit + 0.12, PROFONDEUR * 0.1)
  })
  const ventilation = poser(toiture, fut(0.24, 0.46, M.zincToiture(), 12))
  ventilation.position.set(-LARGEUR * 0.05, yToit + 0.25, -PROFONDEUR * 0.3)
  montant.add(toiture)

  const hauteurTotale = yToit + PORTIQUE.hauteur + PORTIQUE.epaisseur + 0.3

  /* --- Abords : la rue devant, et deux arbres ----------------------------- */

  /**
   * RIEN À GAUCHE, RIEN À DROITE.
   *
   * L'immeuble haussmannien avait ses deux mitoyens : c'est ce qui fait une rue
   * parisienne, et c'était juste pour lui. Une résidence contemporaine se tient
   * sur sa parcelle — elle a du vide autour, et c'est ce vide qui dit ce
   * qu'elle est. Il ne reste donc que la RUE DEVANT et DEUX ARBRES, un de
   * chaque côté.
   */
  const abords = new THREE.Group()
  groupe.add(abords)

  const RUE = 22
  /**
   * LE PARVIS — la bande privée entre l'immeuble et le trottoir.
   *
   * Elle n'est pas un ornement : sans elle, le trottoir public commençait au
   * pied du bâtiment et passait SOUS le débord des dalles, ce qui n'existe
   * nulle part — et le jardin privatif du rez-de-chaussée s'ouvrait alors sur
   * la voie. C'est cette bande-là que le rez-de-jardin clôture quand il est
   * déclaré (voir `etendreJardin`), et c'est par elle qu'on accède à l'entrée.
   */
  const PROFONDEUR_PARVIS = DEBORD + 3.6
  const parvisCommun = poser(
    abords,
    calerTexture(boite(LARGEUR + 2 * DEBORD, 0.1, PROFONDEUR_PARVIS, M.dallage()), 0.55),
    { ombre: false },
  )
  parvisCommun.material.color.setHex(0xe9e4d9)
  parvisCommun.position.set(0, 0.05, zFacade + PROFONDEUR_PARVIS / 2)

  const zTrottoir = zNez + 3.6
  const trottoir = poser(abords, calerTexture(boite(RUE, 0.12, 4.8, M.dallage()), 0.6), {
    ombre: false,
  })
  trottoir.position.set(0, 0.06, zTrottoir + 2.4)
  const bordure = poser(abords, boite(RUE, 0.2, 0.28, M.betonBlanc()), { ombre: false })
  bordure.position.set(0, 0.1, zTrottoir + 4.9)
  const chaussee = poser(abords, calerTexture(boite(RUE, 0.06, 5.4, M.gravier()), 0.9), {
    ombre: false,
  })
  chaussee.material.color.setHex(0x4a4a4e)
  chaussee.position.set(0, 0.03, zTrottoir + 7.7)
  for (let i = -2; i <= 2; i += 1) {
    const trait = poser(abords, boite(2.1, 0.02, 0.13, M.platre()), { ombre: false })
    trait.position.set(i * 4.4, 0.07, zTrottoir + 7.7)
  }

  // Les deux arbres, un de chaque côté, sur le trottoir. Ce sont eux qui
  // donnent l'échelle de l'immeuble : sans un sujet dont on connaît la taille,
  // six niveaux et douze se ressemblent.
  ;[-1, 1].forEach((cote) => {
    const sujet = arbre(4.2)
    sujet.position.set(cote * (xNez + 1.9), 0.12, zTrottoir + 2.1)
    abords.add(sujet)
    const grille = poser(abords, boite(1.3, 0.04, 1.3, M.ferForge()), { ombre: false })
    grille.position.set(cote * (xNez + 1.9), 0.14, zTrottoir + 2.1)
  })

  /* --- Options d'affinage : le balcon de l'étage déclaré ------------------ */

  /**
   * LE BALCON DÉCLARÉ n'est pas un balcon de plus : c'est une TERRASSE, plus
   * profonde que celles de la façade, qui prolonge la dalle au droit du
   * logement. Il faut qu'il se distingue de ce que l'immeuble porte déjà —
   * sinon, cocher la case ne montre rien.
   */
  const balconEtage = new THREE.Group()
  const AVANCE_BALCON = 0.85
  const dalleBalcon = poser(
    balconEtage,
    voileBeton(LARGEUR_TRAVEE + 0.5, 0.14, DEBORD + AVANCE_BALCON),
  )
  dalleBalcon.position.set(0, 0.07, (DEBORD + AVANCE_BALCON) / 2)
  const gardeBalcon = gardeCorpsVerre({ largeur: LARGEUR_TRAVEE + 0.5, hauteur: 0.68 })
  gardeBalcon.position.set(0, 0.14, DEBORD + AVANCE_BALCON - 0.05)
  balconEtage.add(gardeBalcon)
  ;[-1, 1].forEach((cote) => {
    const joue = gardeCorpsVerre({ largeur: DEBORD + AVANCE_BALCON, hauteur: 0.68, panneaux: 2 })
    joue.rotation.y = Math.PI / 2
    joue.position.set(cote * (LARGEUR_TRAVEE / 2 + 0.2), 0.14, (DEBORD + AVANCE_BALCON) / 2)
    balconEtage.add(joue)
  })
  // Le mobilier : deux fauteuils, un guéridon, un sujet en pot.
  ;[-0.6, 0.6].forEach((x) => {
    const fauteuil = poser(balconEtage, boite(0.42, 0.34, 0.42, M.tissuClair()))
    fauteuil.position.set(x, 0.31, 0.75)
  })
  const gueridon = poser(balconEtage, boite(0.36, 0.06, 0.36, M.aluNoir()))
  gueridon.position.set(0, 0.44, 1.15)
  const olivier = buisson(0.34)
  olivier.position.set(-1.05, 0.16, 1.3)
  balconEtage.add(olivier)
  const platelageBalcon = poser(
    balconEtage,
    calerTexture(boite(LARGEUR_TRAVEE + 0.34, 0.05, DEBORD + AVANCE_BALCON - 0.2, M.boisClair()), 1.6),
    { ombre: false },
  )
  platelageBalcon.position.set(0, 0.16, (DEBORD + AVANCE_BALCON) / 2)
  groupe.add(balconEtage)

  /* --- REZ-DE-JARDIN : le jardin privatif, et il grandit ------------------ */

  /**
   * UN JARDIN QUI SE DÉCLARE AU MÈTRE CARRÉ DOIT SE VOIR AU MÈTRE CARRÉ.
   *
   * Il ne se contente plus d'exister : sa pelouse, sa terrasse et sa clôture
   * s'étendent avec la surface déclarée, et son mobilier arrive par paliers —
   * une table de jardin d'abord, les massifs ensuite, l'arbre en dernier. Un
   * jardin de 15 m² et un de 200 ne se distinguent pas seulement par leur
   * taille : on n'y met pas les mêmes choses.
   *
   * Il s'ouvre au droit de la TRAVÉE DU LOGEMENT, la même que celle du balcon :
   * c'est le même appartement qu'on décrit, il ne peut pas être à deux endroits.
   */
  const rezDeJardin = new THREE.Group()
  const xJardin = travee(TRAVEE_LOGEMENT)
  const JARDIN_MIN = 0.45
  const JARDIN_MAX = 1.7
  const LARGEUR_JARDIN = 5.4
  const PROFONDEUR_JARDIN = 2.3

  const pelouseRez = poser(
    rezDeJardin,
    calerTexture(boite(1, 0.1, 1, M.gazon()), 0.5),
    { ombre: false },
  )
  const terrasseRez = poser(
    rezDeJardin,
    calerTexture(boite(1, 0.12, 1, M.dallage()), 0.6),
    { ombre: false },
  )
  const grilleAvant = gardeCorpsVerre({ largeur: 1, hauteur: 0.72 })
  rezDeJardin.add(grilleAvant)
  const joues = [-1, 1].map((cote) => {
    const joue = gardeCorpsVerre({ largeur: 1, hauteur: 0.72 })
    joue.rotation.y = Math.PI / 2
    joue.userData.cote = cote
    rezDeJardin.add(joue)
    return joue
  })

  const tableJardin = poser(rezDeJardin, calerTexture(boite(1.0, 0.07, 0.68, M.boisClair()), 1.4))
  const chaisesJardin = [-1, 1].map((cote) => {
    const chaise = poser(rezDeJardin, boite(0.38, 0.07, 0.38, M.tissuClair()))
    chaise.userData.cote = cote
    return chaise
  })
  const massifsJardin = [
    [-0.36, 0.2, 0.36],
    [0.34, 0.12, 0.3],
    [0.38, 0.38, 0.26],
  ].map(([u, v, rayon]) => {
    const massif = buisson(rayon)
    massif.userData.place = { u, v }
    rezDeJardin.add(massif)
    return massif
  })
  const sujetJardin = arbre(2.4)
  rezDeJardin.add(sujetJardin)

  /** Étend le jardin privatif à la surface déclarée, et le meuble avec. */
  function etendreJardin(t) {
    const echelle = JARDIN_MIN + (JARDIN_MAX - JARDIN_MIN) * t
    const largeur = LARGEUR_JARDIN * echelle
    const profondeur = PROFONDEUR_JARDIN * echelle
    const zCentre = zNez + 0.1 + profondeur / 2

    pelouseRez.scale.set(largeur, 1, profondeur)
    pelouseRez.position.set(xJardin, 0.17, zCentre)

    terrasseRez.scale.set(largeur - 0.6, 1, Math.min(1.3, profondeur * 0.42))
    terrasseRez.position.set(xJardin, 0.19, zNez + 0.1 + Math.min(1.3, profondeur * 0.42) / 2)

    grilleAvant.scale.x = largeur
    grilleAvant.position.set(xJardin, 0.14, zCentre + profondeur / 2)
    joues.forEach((joue) => {
      joue.scale.x = profondeur
      joue.position.set(xJardin + (joue.userData.cote * largeur) / 2, 0.14, zCentre)
    })

    tableJardin.position.set(xJardin - largeur * 0.12, 0.64, zCentre + profondeur * 0.08)
    chaisesJardin.forEach((chaise) => {
      chaise.position.set(
        tableJardin.position.x + chaise.userData.cote * 0.9,
        0.52,
        tableJardin.position.z,
      )
      chaise.visible = t > 0.06
    })
    massifsJardin.forEach((massif) => {
      massif.position.set(
        xJardin + massif.userData.place.u * largeur,
        0.22,
        zCentre + massif.userData.place.v * profondeur,
      )
      massif.visible = t > 0.18
    })
    sujetJardin.position.set(xJardin + largeur * 0.34, 0.2, zCentre - profondeur * 0.2)
    sujetJardin.visible = t > 0.42

    return { largeur, profondeur, zCentre }
  }

  let porteeJardin = 0
  etendreJardin(0)
  groupe.add(rezDeJardin)

  /* --- ROOFTOP : le toit technique devient une terrasse ------------------- */

  /**
   * LE TOIT SE TRANSFORME, IL NE SE COIFFE PAS.
   *
   * Un rooftop n'est pas un meuble posé sur une toiture : c'est la toiture qui
   * cesse d'en être une. Le gravillon, l'édicule et les lanterneaux s'effacent
   * donc à mesure que le platelage paraît, et ce qui reste du couronnement —
   * l'acrotère, le portique — ne bouge pas : un immeuble ne perd pas son
   * acrotère parce qu'on a aménagé son toit.
   *
   * LA SURFACE DÉCLARÉE SE VOIT, et la caméra recule pour qu'on la voie
   * grandir (voir `cadrer` dans `DroneScene`) : le platelage s'étend de
   * quatre dixièmes de l'emprise du toit à sa totalité, et le mobilier arrive
   * par paliers — deux bains de soleil d'abord, la pergola et les jardinières
   * ensuite, le bar en dernier.
   */
  const rooftop = new THREE.Group()
  const ROOFTOP_MIN = 0.4
  const ROOFTOP_MAX = 1.0
  const EMPRISE_TOIT_L = LARGEUR + 2 * DEBORD - 0.4
  const EMPRISE_TOIT_P = PROFONDEUR + DEBORD - 0.4

  const platelage = poser(
    rooftop,
    calerTexture(boite(1, 0.12, 1, M.boisClair()), 1.6),
    { ombre: false },
  )
  platelage.position.y = yToit + 0.06

  const rives = ['avant', 'gauche', 'droite'].map((cote) => {
    const rive = gardeCorpsVerre({ largeur: 1, hauteur: 0.9 })
    if (cote !== 'avant') rive.rotation.y = Math.PI / 2
    rive.position.y = yToit + 0.12
    rooftop.add(rive)
    return { cote, rive }
  })

  const pergolaRooftop = creerPergola({ largeur: 3.0, profondeur: 2.3, hauteur: 1.55 })
  pergolaRooftop.position.y = yToit + 0.12
  rooftop.add(pergolaRooftop)

  const bainsRooftop = [-1, 1].map((cote) => {
    const bain = new THREE.Group()
    const assise = poser(bain, boite(0.48, 0.1, 1.2, M.tissuClair()))
    assise.position.y = 0.27
    const dossier = poser(bain, boite(0.48, 0.1, 0.52, M.tissuClair()))
    dossier.position.set(0, 0.42, -0.46)
    dossier.rotation.x = -0.62
    bain.userData.cote = cote
    rooftop.add(bain)
    return bain
  })

  const jardinieresRooftop = [-1, 1].map((cote) => {
    const bac = new THREE.Group()
    const caisse = poser(bac, calerTexture(boite(1.3, 0.38, 0.44, M.bardageVertical()), 1.3))
    caisse.position.y = yToit + 0.33
    const verdure = buisson(0.36)
    verdure.position.y = yToit + 0.58
    bac.add(verdure)
    bac.userData.cote = cote
    rooftop.add(bac)
    return bac
  })

  const barRooftop = new THREE.Group()
  const comptoir = poser(barRooftop, boite(1.9, 0.1, 0.64, M.margelle()))
  comptoir.position.y = yToit + 1.02
  const piedBar = poser(barRooftop, calerTexture(boite(1.8, 0.92, 0.52, M.bardageVertical()), 1.3))
  piedBar.position.y = yToit + 0.56
  rooftop.add(barRooftop)

  /** Étend le rooftop à la surface déclarée, et le meuble en conséquence. */
  function etendreRooftop(t) {
    const largeur = EMPRISE_TOIT_L * (ROOFTOP_MIN + (ROOFTOP_MAX - ROOFTOP_MIN) * t)
    const profondeur = EMPRISE_TOIT_P * (ROOFTOP_MIN + (ROOFTOP_MAX - ROOFTOP_MIN) * t)
    const zCentre = DEBORD / 2 + (EMPRISE_TOIT_P - profondeur) * 0.32

    platelage.scale.set(largeur, 1, profondeur)
    platelage.position.z = zCentre
    rives.forEach(({ cote, rive }) => {
      const long = cote === 'avant' ? largeur : profondeur
      rive.scale.x = long
      rive.position.x = cote === 'gauche' ? -largeur / 2 : cote === 'droite' ? largeur / 2 : 0
      rive.position.z = cote === 'avant' ? zCentre + profondeur / 2 : zCentre
    })

    // Le mobilier ne grandit pas — il s'écarte, et il s'ajoute.
    bainsRooftop.forEach((bain) => {
      bain.position.set(bain.userData.cote * largeur * 0.2, yToit + 0.12, zCentre + profondeur * 0.24)
    })
    pergolaRooftop.position.set(-largeur * 0.16, yToit + 0.12, zCentre - profondeur * 0.2)
    pergolaRooftop.visible = t > 0.3
    jardinieresRooftop.forEach((bac) => {
      bac.position.set(bac.userData.cote * (largeur / 2 - 0.8), 0, zCentre - profondeur * 0.36)
      bac.visible = t > 0.4
    })
    barRooftop.position.set(largeur * 0.24, 0, zCentre - profondeur * 0.28)
    barRooftop.visible = t > 0.7
  }

  etendreRooftop(0)
  groupe.add(rooftop)

  /**
   * PANNEAUX SOLAIRES. Ils ne sont plus proposés aux appartements — la toiture
   * d'un immeuble n'appartient pas au logement (voir `optionsDecor` dans
   * `src/lib/affinage.js`) —, mais l'ouvrage reste dessiné : le barème peut
   * changer d'avis, le décor n'aurait alors rien à réapprendre.
   */
  const panneaux = new THREE.Group()
  for (let rangee = 0; rangee < 2; rangee += 1) {
    for (let i = 0; i < 3; i += 1) {
      const module = poser(panneaux, boite(1.0, 0.06, 0.74, M.panneauSolaire()))
      module.position.set(-1.05 + i * 1.1, 0.08, -0.48 + rangee * 0.9)
      module.rotation.x = 0.22
    }
  }
  panneaux.position.set(-LARGEUR * 0.2, yToit + 0.12, -PROFONDEUR * 0.28)
  groupe.add(panneaux)

  /**
   * LE STANDING EN OUVRAGES — ce qui s'ajoute à une résidence soignée : un
   * auvent d'entrée, des bandes lumineuses en sous-face des dalles, des bacs
   * plantés au pied, un éclairage de parvis.
   */
  const standing = new THREE.Group()
  const auvent = poser(standing, voileBeton(4.0, 0.14, 1.5))
  auvent.position.set(travee(TRAVEE_PORTE), HAUTEUR_RDC - 0.28, zFacade + 0.5)
  ;[-1, 1].forEach((cote) => {
    const bac = poser(standing, voileBeton(0.8, 0.45, 0.8))
    bac.position.set(travee(TRAVEE_PORTE) + cote * 2.1, 0.25, zFacade + 0.9)
    const sujet = buisson(0.4)
    sujet.position.set(travee(TRAVEE_PORTE) + cote * 2.1, 0.55, zFacade + 0.9)
    standing.add(sujet)
  })
  // Les lignes lumineuses en sous-face des dalles : la signature nocturne des
  // résidences de standing, et ce qui dessine les débords le soir venu.
  for (let e = 1; e <= ETAGES; e += 1) {
    const ligne = poser(standing, boite(LARGEUR + 2 * DEBORD - 0.4, 0.04, 0.06, M.laiton()), {
      ombre: false,
    })
    ligne.material.emissive.setHex(0x3a2c18)
    ligne.material.emissiveIntensity = 0.8
    ligne.position.set(0, hauteurEtage(e) - EPAISSEUR_DALLE - 0.03, zNez - 0.1)
  }
  ;[-1, 1].forEach((cote) => {
    const borne = poser(standing, boite(0.12, 0.34, 0.12, M.aluNoir()))
    borne.position.set(travee(TRAVEE_PORTE) + cote * 1.7, 0.27, zFacade + 1.6)
  })
  groupe.add(standing)

  /* --- Révélations et pilotage -------------------------------------------- */

  const revelerEntree = revelable(entree)
  const revelerMenuiseries = revelable(menuiseries)
  const revelerBardages = revelable(bardages)
  const revelerBalcons = revelable(balcons)
  const revelerCouronnement = revelable(couronnement)
  const revelerToiture = revelable(toiture)
  const revelerAbords = revelable(abords)
  const revelerBalconEtage = revelable(balconEtage)
  const revelerRezDeJardin = revelable(rezDeJardin)
  const revelerRooftop = revelable(rooftop)
  const revelerPanneaux = revelable(panneaux)
  const revelerStanding = revelable(standing)

  const vitres = []
  groupe.traverse((objet) => {
    if (objet.isMesh && objet.material?.name === 'vitrage') vitres.push(objet.material)
  })

  /**
   * LE STANDING SUR LES MATIÈRES — et, pour l'immeuble, SUR TROIS POINTS.
   *
   * La maison ne se dégrade jamais sous ce qui a été dessiné : « À rafraîchir »
   * rend exactement la maison qu'on voyait avant l'écran d'affinage. L'immeuble,
   * lui, se sert des trois niveaux en entier (voir `accorderStanding` dans
   * `matieres.js`) — l'état dessiné est le MILIEU de l'échelle, et c'est
   * « Standard » qui le rend :
   *
   *   RÉNOVÉ OU NEUF, et c'est le plus important à voir : le béton est blanc et
   *   net, le bardage huilé et chaud, les menuiseries laquées, les garde-corps
   *   de verre parfaitement clairs. La résidence sort de livraison.
   *   STANDARD : la résidence telle qu'elle est dessinée. Bien tenue, sans plus.
   *   À RAFRAÎCHIR : le béton a grisé et s'est encrassé, le bardage a pris le
   *   gris argent du bois non traité, l'aluminium a perdu son éclat. Rien n'est
   *   cassé — c'est une résidence des années deux mille qu'on n'a pas ravalée,
   *   et c'est très exactement ce que « travaux à prévoir » veut dire.
   *
   * L'accord ne porte que sur le MONTANT — le bâtiment lui-même. La rue et les
   * arbres gardent leur matière : ce n'est pas le vendeur qui les entretient.
   */
  const accorderStanding = M.accorderStanding(montant, {
    'beton-blanc': {
      bas: { couleur: 0x9d9b93, roughness: 0.94 },
      haut: { couleur: 0xffffff, roughness: 0.4 },
    },
    'beton-blanc-ombre': {
      bas: { couleur: 0x89877f, roughness: 0.95 },
      haut: { couleur: 0xf4f2ee, roughness: 0.44 },
    },
    beton: {
      bas: { couleur: 0x5f5d58, roughness: 0.94 },
      haut: { couleur: 0xabA89f, roughness: 0.42 },
    },
    bardage: {
      bas: { couleur: 0x8d8b84, roughness: 0.95 },
      haut: { couleur: 0xffdcae, roughness: 0.44 },
    },
    menuiserie: {
      bas: { couleur: 0x3c3e44, roughness: 0.62, metalness: 0.4 },
      haut: { couleur: 0x16171b, roughness: 0.2, metalness: 0.85 },
    },
    'verre-garde-corps': {
      bas: { couleur: 0x9fa7a6, roughness: 0.22 },
      haut: { couleur: 0xd6ecf4, roughness: 0.02 },
    },
    fer: {
      bas: { couleur: 0x4a4b4f, roughness: 0.72, metalness: 0.36 },
      haut: { couleur: 0x0f1115, roughness: 0.22, metalness: 0.85 },
    },
    laiton: {
      bas: { couleur: 0x8f7c5c, roughness: 0.58, metalness: 0.42 },
      haut: { couleur: 0xe3bb80, roughness: 0.16, metalness: 0.9 },
    },
    dallage: {
      bas: { couleur: 0xcfcabe, roughness: 0.9 },
      haut: { couleur: 0xfcf8ef, roughness: 0.52 },
    },
    zinc: {
      bas: { couleur: 0x8d939b, roughness: 0.74, metalness: 0.2 },
      haut: { couleur: 0xc8cfd8, roughness: 0.28, metalness: 0.52 },
    },
  })

  /**
   * LA LAMPE DE L'ÉTAGE DÉCLARÉ — ce qui fait la différence entre « des vitres
   * peintes en jaune » et « un logement allumé ».
   *
   * Des baies émissives suffisent à dire qu'une lumière est allumée DERRIÈRE
   * elles, et pas davantage : elles n'éclairent rien, et la façade autour reste
   * exactement aussi grise qu'avant. Or c'est précisément ce débordement — le
   * chaud qui déborde sur le nez de la dalle, sur la sous-face au-dessus, sur
   * le garde-corps de verre du balcon — qu'on reconnaît de la rue le soir.
   *
   * Une lampe, donc, et une seule. Elle est posée à demeure dans l'ouvrage,
   * éteinte : allumée et éteinte, elle ferait recompiler toutes les nuances de
   * la scène à chaque changement d'étage. Elle ne fait que se déplacer et
   * changer d'intensité.
   */
  const lampeEtage = new THREE.PointLight(0xffb45a, 0, 7.5, 1.7)
  lampeEtage.position.set(travee(TRAVEE_LOGEMENT), hauteurEtage(2) + 0.7, zFacade + 0.2)
  groupe.add(lampeEtage)

  /** Étage dont les baies s'allument. Posé par `designerEtage`. */
  let etageDesigne = null

  /**
   * Où se trouve le balcon d'affinage — le point que le drone vient filmer de
   * près quand le vendeur le déclare (voir `cadrer` dans `DroneScene`). Il suit
   * l'étage, comme le balcon lui-même.
   */
  const ancreExterieur = new THREE.Vector3(
    travee(TRAVEE_LOGEMENT),
    hauteurEtage(2) + 0.9,
    zNez + 0.6,
  )

  const bien = {
    groupe,
    montant,
    hauteurCoupe: hauteurTotale,

    /**
     * LES PALIERS DU MONTAGE — la hauteur du plan de coupe à laquelle chaque
     * plancher vient d'être coulé, en part de la hauteur totale.
     *
     * L'immeuble ne monte pas d'un trait : il monte PLANCHER PAR PLANCHER, du
     * bas vers le haut, et c'est cette liste qui dit au décor où s'arrêter
     * entre deux (voir `coupeEnPaliers` dans `DroneScene`). Un plan de coupe qui
     * glisse sans marquer les dalles ressemble à un store qu'on lève ; qui
     * s'arrête sur chacune, à un chantier.
     *
     * Les six niveaux, puis la dalle de toiture — et la hauteur totale pour
     * finir : au-delà du toit il n'y a plus de plancher à couler, seulement
     * l'acrotère et le portique, et ceux-là paraissent en fondu.
     */
    paliersMontage: [
      ...Array.from({ length: ETAGES + 1 }, (_, e) => hauteurEtage(e) / hauteurTotale),
      yToit / hauteurTotale,
      1,
    ],
    envergure: { largeur: Math.max(LARGEUR + 2 * DEBORD + 2.6, PROFONDEUR + 4), hauteur: hauteurTotale },

    /**
     * Emprise au sol, pour l'îlot sur lequel le décor pose l'immeuble. Elle
     * couvre la rue, ses deux arbres — et le jardin privatif, qui la dépasse
     * dès qu'il est déclaré large. Recalculée à chaque image, comme pour la
     * maison : un socle figé laisserait le jardin finir dans le vide.
     */
    rayonSol: Math.hypot(RUE / 2, zTrottoir + 10.4) + 1.5,

    ancrages: {
      hauteur: hauteurTotale,
      exterieur: ancreExterieur,
    },

    /**
     * LES OUVRAGES DE L'AFFINAGE, par le nom sous lequel le parcours les
     * déclare. Le décor s'en sert pour illuminer deux secondes celui que le
     * vendeur vient de régler (voir `ACCUSES` dans `DroneScene`).
     */
    ouvrages: {
      balcon: balconEtage,
      rezDeJardin,
      rooftop,
      panneaux,
      standing: montant,
    },

    /**
     * DÉSIGNE L'ÉTAGE DU VENDEUR — celui dont les baies vont s'allumer.
     *
     * Rien ne s'allume à l'appel : `designerEtage` ne fait que dire OÙ, et
     * `poser` dit COMBIEN, image après image. Séparer les deux est ce qui
     * permet au vendeur de changer d'étage au milieu d'un fondu sans que la
     * lumière saute.
     */
    designerEtage(etage) {
      const n = Math.round(Number(etage))
      etageDesigne = Number.isFinite(n) ? Math.max(0, Math.min(ETAGES, n)) : null
      if (etageDesigne !== null) {
        lampeEtage.position.y = hauteurEtage(etageDesigne) + 0.7
      }
    },

    /** Place le balcon d'affinage à l'étage déclaré — et l'ancre de caméra avec. */
    placerBalcon(etage) {
      const y = hauteurEtage(etage)
      balconEtage.position.set(travee(TRAVEE_LOGEMENT), y, zFacade)
      ancreExterieur.set(travee(TRAVEE_LOGEMENT), y + 0.9, zNez + 0.6)
    },

    poser(v) {
      accorderStanding(v.standing)
      revelerEntree(v.entree)
      revelerMenuiseries(v.menuiserie)
      revelerBardages(v.menuiserie)
      revelerBalcons(v.menuiserie)
      revelerCouronnement(v.couronnement)
      revelerAbords(v.abords)
      revelerBalconEtage(v.balcon)
      revelerStanding(v.standing)

      // LE JARDIN PRIVATIF GRANDIT AVEC LA SURFACE DÉCLARÉE. Il paraît vite —
      // dès les premiers mètres carrés —, puis c'est sa taille qui parle.
      const auSol = Math.max(0, Math.min(1, v.rezDeJardin ?? 0))
      const jardin = etendreJardin(auSol)
      revelerRezDeJardin(Math.min(1, auSol / 0.06))
      porteeJardin = auSol > 0.01 ? jardin.zCentre + jardin.profondeur / 2 + 1.4 : 0

      // LE ROOFTOP PREND LA PLACE DU TOIT TECHNIQUE, et les deux se croisent
      // dans le même fondu : le gravillon s'efface exactement à la vitesse où
      // le platelage paraît, si bien qu'il n'y a jamais ni deux toits ni aucun.
      const surToit = Math.max(0, Math.min(1, v.rooftop ?? 0))
      etendreRooftop(surToit)
      revelerRooftop(surToit)
      revelerToiture(Math.min(v.couronnement, 1 - surToit))

      revelerPanneaux(v.panneaux)

      // LE SOIR, D'ABORD : toutes les vitres s'ambrent ensemble au stade du
      // prix. C'est le fond sur lequel l'étage déclaré vient se détacher.
      /**
       * LE SOIR, D'ABORD — ET PLUS DISCRÈTEMENT QU'AVANT.
       *
       * Toutes les vitres s'ambraient à pleine puissance au stade du prix.
       * Sur un haussmannien et ses petites fenêtres, c'était une façade qui
       * s'éclaire ; sur des baies de trois mètres, c'est un mur de rectangles
       * jaunes — et surtout, l'étage du vendeur s'y noyait, puisque tout
       * l'immeuble brillait autant que lui. Un tiers de moins : le soir se voit
       * encore, et il redevient le FOND sur lequel l'étage déclaré se détache.
       */
      vitres.forEach((matiere) => {
        matiere.emissive.setHex(0xf6c978)
        matiere.emissiveIntensity = v.lumiere * 0.78
      })

      /**
       * PUIS L'ÉTAGE DU VENDEUR, ET IL S'ALLUME FRANCHEMENT.
       *
       * C'est le seul repère qu'on lui donne de son logement dans un immeuble
       * qui, sinon, serait celui de tout le monde — et il règle son étage EN
       * PLEIN JOUR, contre une façade au soleil. L'intensité a donc été relevée
       * encore d'un cran : une lumière de veilleuse ne se voit pas derrière une
       * baie qui reflète déjà le ciel.
       */
      const allume = Math.max(0, Math.min(1, v.etageAllume ?? 0))
      lampeEtage.intensity = allume * 26
      if (etageDesigne !== null) {
        const matieres = baiesParEtage.get(etageDesigne)
        matieres?.forEach((matiere) => {
          matiere.emissive.setHex(0xffc271)
          matiere.emissiveIntensity = Math.max(
            matiere.emissiveIntensity ?? 0,
            allume * (matiere.name === 'vitrage' ? 5.4 : 3.6),
          )
        })
      }

      bien.rayonSol = Math.max(
        Math.hypot(RUE / 2, zTrottoir + 10.4) + 1.5,
        porteeJardin + 1.5,
      )
    },
  }

  return bien
}
