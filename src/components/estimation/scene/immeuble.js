import * as THREE from 'three'
import * as M from './matieres'
import {
  arbre,
  baieVitree,
  boite,
  buisson,
  encadrement,
  fut,
  gardeCorpsVerre,
  gouttiere,
  graminee,
  jacuzzi,
  pergola as creerPergola,
  poser,
  revelable,
  scintillant,
  transat,
  voilant,
} from './kit'

/**
 * L'IMMEUBLE — toujours le même, et il a changé d'époque.
 *
 * C'ÉTAIT UN HAUSSMANNIEN. Pierre de taille, sept étages, balcon filant, comble
 * mansardé de zinc, et deux immeubles mitoyens pour le poser dans une rue. Il
 * était juste, et il posait trois problèmes qui n'en font qu'un : il était
 * ÉNORME — dix-sept unités de haut, soit quatre fois la maison —, il était pris
 * dans un alignement qui occupait la moitié du cadre, et rien dans un décor de
 * pierre du XIXᵉ ne ressemble à ce que la plupart des gens vendent aujourd'hui.
 *
 * C'EST MAINTENANT UN IMMEUBLE CONTEMPORAIN DE SIX NIVEAUX, seul sur son îlot.
 * Sa composition est celle des programmes neufs qu'on construit partout en
 * France, et elle tient en quatre gestes :
 *
 *   • LES DALLES DE BÉTON BLANC EN DÉBORD. C'est le geste principal, et tout
 *     le reste s'y accroche : à chaque plancher, un plateau qui déborde de
 *     toute part et court d'un bout à l'autre du bâtiment. Ce sont ces lignes
 *     horizontales, et l'ombre franche qu'elles portent, qui donnent sa force
 *     à la façade — un immeuble contemporain se reconnaît à ses dalles avant
 *     de se reconnaître à ses fenêtres.
 *   • LE BARDAGE BOIS VERTICAL en contrepoint. Une travée entière, toute
 *     hauteur, et les fonds de balcon : le bois est là pour casser l'horizontale
 *     du béton, et il ne vaut que parce qu'il en est l'exception.
 *   • LES BALCONS DÉCALÉS D'UN ÉTAGE À L'AUTRE, garde-corps de verre. Le
 *     décalage n'est pas un caprice de composition : il donne à la façade sa
 *     profondeur en damier, et c'est ce qui l'empêche d'être une grille.
 *   • LES LARGES BAIES VITRÉES, toute hauteur entre deux dalles, et le TOIT
 *     PLAT qui achève le volume sans le coiffer.
 *
 * IL NE CHANGE NI AVEC LA SURFACE NI AVEC L'ÉTAGE DÉCLARÉS — de l'étage, il ne
 * montre que SES FENÊTRES QUI S'ALLUMENT (voir `designerEtage`), et c'est tout
 * ce qu'un immeuble peut honnêtement dire d'un logement qu'on ne voit pas de la
 * rue.
 *
 * IL EST SEUL. Les deux mitoyens sont partis avec la rue qu'ils bordaient : le
 * bien qu'on estime est le sujet, et deux volumes de pierre de part et d'autre
 * le réduisaient au tiers du cadre pour ne rien dire de lui. Ce qui les
 * remplace est le parvis planté d'un programme neuf — allée, pelouse, sujets —,
 * c'est-à-dire précisément ce qu'on voit en arrivant devant ce genre
 * d'immeuble.
 */

/* -------------------------------------------------------------------------- */
/*  Gabarit                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * LE GABARIT A ÉTÉ DIVISÉ PAR DEUX EN HAUTEUR.
 *
 * L'ancien montait à dix-sept unités et demie : à côté d'une maison qui en fait
 * quatre, ce n'était plus un immeuble, c'était une tour, et le cadrage — qui se
 * calcule sur l'envergure de l'ouvrage (voir `cadrer` dans `DroneScene`) —
 * devait reculer si loin que le bien ne faisait plus qu'un tiers de l'image.
 *
 * Six niveaux et neuf unités : c'est la hauteur d'un R+5, c'est-à-dire de
 * l'immense majorité des immeubles d'habitation français hors hypercentres. Le
 * bien tient dans le cadre à une distance où l'on voit encore ses balcons.
 */
export const LARGEUR = 7.2
export const PROFONDEUR = 5.4
/** Hauteur du rez-de-chaussée — plus haut que les étages, il porte le hall. */
export const HAUTEUR_SOCLE = 1.85
export const HAUTEUR_ETAGE = 1.5
/** Étages au-dessus du rez-de-chaussée : R+5, soit six niveaux habitables. */
export const ETAGES = 5
/** Travées de la façade. Quatre : une porte, une de bois, deux de baies. */
const TRAVEES = 4
/** Débord des dalles devant la façade — la profondeur utile d'un balcon. */
const DEBORD = 1.05
/** Épaisseur apparente d'une dalle de plancher. */
const EPAISSEUR_DALLE = 0.17

/** Hauteur du plancher d'un étage donné (0 = rez-de-chaussée). */
export const hauteurEtage = (etage) =>
  etage <= 0 ? 0.14 : HAUTEUR_SOCLE + (Math.min(etage, ETAGES) - 1) * HAUTEUR_ETAGE

/** Hauteur libre d'un niveau donné. */
const hauteurNiveau = (etage) => (etage <= 0 ? HAUTEUR_SOCLE : HAUTEUR_ETAGE)

/** Abscisse du centre d'une travée. */
export const travee = (index) => -LARGEUR / 2 + ((index + 0.5) * LARGEUR) / TRAVEES

/** Travée sur laquelle le logement du vendeur est aligné — celle où son balcon
    se pose à l'affinage, et celle de son rez-de-jardin. */
export const TRAVEE_LOGEMENT = 2

/** Travée du hall d'entrée — jamais au milieu : une façade est rythmée. */
export const TRAVEE_PORTE = 0

/** Travée entièrement bardée de bois, toute hauteur : le contrepoint vertical. */
const TRAVEE_BOIS = 1

/**
 * DE QUEL CÔTÉ SE TIENT LE BALCON D'UN ÉTAGE DONNÉ.
 *
 * C'est toute la règle du décalage, et elle tient en une ligne : un étage sur
 * deux à gauche, l'autre à droite. Ce qu'on y gagne n'est pas décoratif — la
 * façade cesse d'être une grille régulière, et l'ombre des dalles y prend une
 * respiration en damier qu'aucun alignement ne donnerait.
 */
const coteBalcon = (etage) => (etage % 2 === 1 ? -1 : 1)

/* -------------------------------------------------------------------------- */

export function creerImmeuble() {
  const groupe = new THREE.Group()
  const montant = new THREE.Group()
  groupe.add(montant)

  const zFacade = PROFONDEUR / 2
  const hauteurCorps = HAUTEUR_SOCLE + ETAGES * HAUTEUR_ETAGE

  /**
   * LES BAIES, RANGÉES PAR ÉTAGE.
   *
   * C'est ce qui permet d'allumer UN niveau et lui seul quand le vendeur
   * déclare le sien (voir `designerEtage`). On retient la vitre ET le fond
   * d'embrasure de chaque baie : allumer la seule vitre poserait un reflet
   * ambré sur un trou noir, ce qui se lit comme un verre teinté, pas comme une
   * pièce éclairée.
   */
  const baiesParEtage = new Map()
  const retenirBaie = (etage, ...matieres) => {
    const liste = baiesParEtage.get(etage) ?? []
    matieres.filter(Boolean).forEach((matiere) => liste.push(matiere))
    baiesParEtage.set(etage, liste)
  }

  /* --- Le noyau, et le refend vitré de circulation ------------------------- */

  /**
   * DEUX VOLUMES, PAS UN — et c'est ce qui donne à la façade son articulation.
   *
   * Le bâtiment était un seul bloc percé de fenêtres. Il en compte désormais
   * deux, comme presque tous les programmes neufs :
   *
   *   LE CORPS DE LOGEMENTS, plein, à droite : c'est la masse habitée, et
   *   c'est elle que les dalles en débord rythment.
   *
   *   LA CAGE DE CIRCULATION, à gauche, VITRÉE TOUTE HAUTEUR. C'est l'escalier
   *   et l'ascenseur, et on les voit — un immeuble contemporain montre sa
   *   circulation, c'est même souvent son seul geste. Elle ne porte pas de
   *   balcon, ne porte pas de bardage, et sa transparence coupe la façade en
   *   deux : sans elle, six niveaux de baies identiques font une grille.
   *
   * ELLE EST AUSSI LA RÉPONSE À L'ASCENSEUR DÉCLARÉ. On ne peut pas montrer une
   * cabine qui monte à travers un mur plein ; on peut très bien la montrer
   * derrière une paroi de verre, et c'est exactement là qu'elle se trouve dans
   * la réalité. Le voile posé sur le reste du bâtiment (voir `voilerMasse`) ne
   * fait alors qu'achever le travail.
   */
  const RETRAIT = 0.12
  const largeurTravee = LARGEUR / TRAVEES
  const xCage = travee(TRAVEE_PORTE)
  /** Abscisse de la couture entre la cage et le corps de logements. */
  const xCouture = -LARGEUR / 2 + largeurTravee

  const largeurCorps = LARGEUR - largeurTravee
  const noyau = poser(
    montant,
    boite(largeurCorps - RETRAIT, hauteurCorps, PROFONDEUR - RETRAIT * 2, M.betonLisse()),
  )
  noyau.position.set(xCouture + largeurCorps / 2, hauteurCorps / 2, 0)

  // Les refends verticaux entre travées : ce qui reste du mur quand tout le
  // reste est vitré, et ce qui fait tenir la façade debout.
  const refends = new THREE.Group()
  for (let i = 1; i <= TRAVEES; i += 1) {
    const x = -LARGEUR / 2 + (i * LARGEUR) / TRAVEES
    const refend = poser(refends, boite(0.26, hauteurCorps, 0.34, M.betonLisse()))
    refend.position.set(x, hauteurCorps / 2, zFacade - 0.1)
  }
  montant.add(refends)

  /**
   * LA CAGE : trois joues pleines, une façade de verre.
   *
   * Les joues sont minces et pleines — un noyau de circulation est une boîte
   * porteuse —, et seule la face avant est vitrée. C'est le seul endroit du
   * bâtiment où l'on voit l'intérieur, et il faut que ce soit franc : un verre
   * teinté n'y montrerait rien.
   */
  const cage = new THREE.Group()
  const PROF_CAGE = PROFONDEUR - RETRAIT * 2

  const joueGauche = poser(cage, boite(0.2, hauteurCorps, PROF_CAGE, M.betonLisse()))
  joueGauche.position.set(-LARGEUR / 2 + 0.1, hauteurCorps / 2, 0)
  const joueCouture = poser(cage, boite(0.2, hauteurCorps, PROF_CAGE, M.betonLisse()))
  joueCouture.position.set(xCouture, hauteurCorps / 2, 0)
  const dosCage = poser(cage, boite(largeurTravee, hauteurCorps, 0.2, M.betonLisse()))
  dosCage.position.set(xCage, hauteurCorps / 2, -PROF_CAGE / 2)
  montant.add(cage)

  /**
   * L'ESCALIER, vu derrière le verre. Un palier par niveau et sa volée : deux
   * pièces par étage, et la cage cesse d'être une vitrine vide. C'est aussi ce
   * qui reste à voir quand l'ascenseur n'est pas déclaré — un immeuble sans
   * ascenseur a tout de même un escalier, et c'est même tout l'enjeu de la
   * question qu'on pose au vendeur.
   */
  const escalier = new THREE.Group()
  /** Ce qui, dans la profondeur de la cage, revient à l'escalier. Le devant
      reste libre : c'est là que la cabine monte, et c'est là qu'on la voit. */
  const zEscalier = -PROF_CAGE / 2 + 1.1

  for (let e = 0; e <= ETAGES; e += 1) {
    const y = hauteurEtage(e)
    const palier = poser(escalier, boite(largeurTravee - 0.3, 0.1, 1.0, M.betonLisse()), {
      ombre: false,
    })
    palier.position.set(xCage, y + 0.05, zEscalier - 0.55)

    if (e < ETAGES) {
      const h = hauteurNiveau(e === 0 ? 0 : e)
      const volee = poser(escalier, boite(largeurTravee - 0.55, 0.09, 1.9, M.betonLisse()), {
        ombre: false,
      })
      volee.position.set(xCage, y + h / 2, zEscalier + 0.55)
      volee.rotation.x = -Math.atan2(h, 1.8)
      // La main courante, côté vide : c'est elle qu'on lit à travers le verre,
      // bien plus que la volée elle-même.
      const rampe = poser(escalier, boite(0.04, 0.04, 1.9, M.aluNoir()), { ombre: false })
      rampe.position.set(xCage + largeurTravee * 0.22, y + h / 2 + 0.46, zEscalier + 0.55)
      rampe.rotation.x = volee.rotation.x
    }
  }
  montant.add(escalier)

  /* --- Les dalles en débord ------------------------------------------------ */

  /**
   * LE GESTE PRINCIPAL. Une dalle par plancher, et la dalle de couronnement au
   * sommet : six plateaux blancs qui débordent et rythment la façade. Le débord
   * n'est pas le même partout — il est FRANC devant le corps de logements, où
   * il porte les balcons, et court ailleurs, où il ne fait qu'une ligne
   * d'ombre.
   *
   * Elles courent d'un bout à l'autre du bâtiment, CAGE COMPRISE : ce sont
   * elles qui tiennent les deux volumes ensemble, et une dalle qui s'arrêterait
   * à la couture laisserait la cage se détacher comme une pièce rapportée.
   */
  const dalles = new THREE.Group()
  for (let e = 1; e <= ETAGES + 1; e += 1) {
    const y = e <= ETAGES ? hauteurEtage(e) : hauteurCorps

    const plateau = poser(
      dalles,
      boite(LARGEUR + 0.5, EPAISSEUR_DALLE, PROFONDEUR + 0.5, M.betonLisse()),
    )
    plateau.position.y = y - EPAISSEUR_DALLE / 2

    // LE DÉBORD DE FAÇADE, du côté du balcon de cet étage-là : c'est lui qui
    // fait la saillie profonde, et son alternance gauche-droite qui donne le
    // damier. Il ne déborde que devant le CORPS — la cage vitrée n'a pas de
    // balcon, et lui en donner un reviendrait à mettre un fauteuil sur un
    // palier.
    const cote = coteBalcon(e)
    const largeurSaillie = largeurCorps / 2 + 0.3
    const xSaillie = xCouture + (cote < 0 ? largeurSaillie / 2 : largeurCorps - largeurSaillie / 2)

    const saillie = poser(dalles, boite(largeurSaillie, EPAISSEUR_DALLE, DEBORD, M.betonLisse()))
    saillie.position.set(xSaillie, y - EPAISSEUR_DALLE / 2, zFacade + 0.25 + DEBORD / 2)

    // La sous-face de bois du balcon : c'est en levant les yeux depuis la rue
    // qu'on voit le dessous d'une dalle, et un béton nu y est terne.
    const sousFace = poser(
      dalles,
      boite(largeurSaillie - 0.1, 0.04, DEBORD - 0.06, M.boisBardage()),
      { ombre: false },
    )
    sousFace.position.set(
      xSaillie,
      y - EPAISSEUR_DALLE - 0.02,
      zFacade + 0.25 + DEBORD / 2,
    )

    dalles.userData[`balcon${e}`] = { x: xSaillie, largeur: largeurSaillie }
  }
  montant.add(dalles)

  /* --- Les garde-corps de verre ------------------------------------------- */

  /**
   * LES BALCONS, et leur garde-corps de verre.
   *
   * Le verre est ce qui distingue un balcon contemporain d'un balcon de
   * copropriété des années soixante-dix : il ne masque pas la vue qu'on est
   * venu acheter, et il laisse la dalle blanche se lire d'un bout à l'autre. La
   * main courante d'aluminium noir qui le coiffe est le seul trait sombre de la
   * façade — et c'est ce trait qui dessine le damier à distance.
   */
  const balcons = new THREE.Group()
  for (let e = 1; e <= ETAGES; e += 1) {
    const y = hauteurEtage(e)
    const { x: xSaillie, largeur: largeurSaillie } = dalles.userData[`balcon${e}`]

    const rive = gardeCorpsVerre({ largeur: largeurSaillie, hauteur: 0.72 })
    rive.position.set(xSaillie, y, zFacade + 0.25 + DEBORD)
    balcons.add(rive)
    ;[-1, 1].forEach((sens) => {
      const joue = gardeCorpsVerre({ largeur: DEBORD, hauteur: 0.72 })
      joue.rotation.y = Math.PI / 2
      joue.position.set(xSaillie + (sens * largeurSaillie) / 2, y, zFacade + 0.25 + DEBORD / 2)
      balcons.add(joue)
    })
  }
  montant.add(balcons)

  /* --- La façade : baies, bardage, fonds d'appartement -------------------- */

  const menuiseries = new THREE.Group()
  const bardage = new THREE.Group()
  /**
   * LES FONDS D'APPARTEMENT ONT LEUR PROPRE GROUPE, et c'est l'ascenseur qui
   * l'exige. Ce sont des panneaux PLEINS posés derrière chaque vitrage : sans
   * eux, une baie est un trou noir ; avec eux, et tant qu'ils restent opaques,
   * on ne voit rien de l'intérieur du bâtiment. Ils se voilent donc avec le
   * noyau (voir `voilerMasse`).
   */
  const fonds = new THREE.Group()

  /** Pose un bardage de tasseaux verticaux sur un panneau donné. */
  const poserBardage = (parent, { x, y, hauteur, largeur, z, rotation = 0 }) => {
    const lames = Math.max(3, Math.round(largeur / 0.16))
    for (let i = 0; i < lames; i += 1) {
      const lame = poser(parent, boite(largeur / lames - 0.02, hauteur, 0.07, M.boisBardage()), {
        ombre: false,
      })
      const dx = -largeur / 2 + ((i + 0.5) * largeur) / lames
      lame.position.set(
        x + Math.cos(rotation) * dx,
        y + hauteur / 2,
        z - Math.sin(rotation) * dx,
      )
      lame.rotation.y = rotation
    }
  }

  for (let e = 0; e <= ETAGES; e += 1) {
    const y = hauteurEtage(e)
    const h = hauteurNiveau(e)

    for (let i = 0; i < TRAVEES; i += 1) {
      const x = travee(i)

      /**
       * LA TRAVÉE DE CIRCULATION : un mur-rideau de verre CLAIR, toute hauteur,
       * sans fond derrière. C'est la seule baie du bâtiment qui ne cache rien —
       * et c'est par elle qu'on voit monter la cabine.
       */
      if (i === TRAVEE_PORTE) {
        if (e === 0) continue // le hall se construit plus bas, avec sa marquise
        const verriere = baieVitree({
          largeur: largeurTravee - 0.24,
          hauteur: h - EPAISSEUR_DALLE - 0.06,
          meneaux: 2,
          traverse: true,
          circulation: true,
        })
        verriere.position.set(x, y + 0.03, zFacade + 0.1)
        menuiseries.add(verriere)
        continue
      }

      // LA TRAVÉE DE BOIS : toute hauteur, d'un bout à l'autre du bâtiment.
      // C'est elle, et elle seule, qui casse l'horizontale des dalles.
      if (i === TRAVEE_BOIS) {
        poserBardage(bardage, {
          x,
          y: y + 0.04,
          hauteur: h - EPAISSEUR_DALLE - 0.04,
          largeur: largeurTravee - 0.3,
          z: zFacade + 0.08,
        })
        // Une fenêtre étroite s'y glisse tout de même : une travée entièrement
        // aveugle sur six niveaux serait un pignon, pas une façade.
        const jour = baieVitree({ largeur: 0.58, hauteur: h * 0.46, meneaux: 1 })
        jour.position.set(x, y + h * 0.32, zFacade + 0.14)
        menuiseries.add(jour)
        const fondJour = poser(fonds, boite(0.54, h * 0.44, 0.05, M.platreOmbre()), {
          ombre: false,
        })
        fondJour.material.color.setHex(0x2b2f36)
        fondJour.position.set(x, y + h * 0.33, zFacade + 0.06)
        retenirBaie(e, jour.userData.vitre?.material, fondJour.material)
        continue
      }

      /**
       * LA BAIE TOUTE HAUTEUR. C'est le percement du logement contemporain :
       * du plancher au plafond, trois meneaux, allège vitrée. Elle descend
       * jusqu'à huit centimètres de la dalle — pas jusqu'à zéro : un vitrage
       * qui affleure un plancher n'existe pas, il y a toujours une plinthe de
       * dormant.
       */
      const hauteurBaie = h - EPAISSEUR_DALLE - 0.16
      const baie = baieVitree({
        largeur: largeurTravee - 0.4,
        hauteur: hauteurBaie,
        meneaux: 3,
        traverse: true,
        sombre: true,
      })
      baie.position.set(x, y + 0.08, zFacade + 0.12)
      menuiseries.add(baie)

      /**
       * LE FOND D'APPARTEMENT — la seule pièce qui n'existe que pour la
       * lumière.
       *
       * Derrière chaque vitrage, un panneau mat, un peu en retrait. De jour, il
       * donne au verre quelque chose à refléter et empêche la baie de se lire
       * comme un trou noir. Le soir venu — et surtout à l'étage du vendeur —
       * c'est LUI qui s'allume : une vitre seule qui s'éclaire rend un verre
       * teinté, un fond éclairé rend une pièce habitée.
       */
      const fond = poser(
        fonds,
        boite(largeurTravee - 0.44, hauteurBaie - 0.06, 0.06, M.platreOmbre()),
        { ombre: false },
      )
      fond.position.set(x, y + 0.08 + hauteurBaie / 2, zFacade - 0.02)
      fond.material.color.setHex(0x2b2f36)

      // L'encadrement en plate-bande : cinq centimètres de saillie, et le
      // percement cesse d'être un rectangle collé sur un mur plat.
      const cadre = encadrement({
        largeur: largeurTravee - 0.4,
        hauteur: hauteurBaie,
        epaisseur: 0.07,
        saillie: 0.05,
        matiere: M.betonLisse(),
      })
      cadre.position.set(x, y + 0.08, zFacade + 0.12)
      menuiseries.add(cadre)

      retenirBaie(e, baie.userData.vitre?.material, fond.material)
    }

    /* --- Les pignons : des percements plus modestes ----------------------- */

    ;[-1, 1].forEach((cote) => {
      // La cage vitrée occupe tout le pignon gauche : on n'y perce rien.
      if (cote < 0) return
      for (let i = 0; i < 2; i += 1) {
        const fenetre = baieVitree({ largeur: 0.82, hauteur: h * 0.52, meneaux: 2 })
        fenetre.rotation.y = cote * (Math.PI / 2)
        fenetre.position.set(
          cote * (LARGEUR / 2 - RETRAIT + 0.02),
          y + h * 0.26,
          (i === 0 ? -1 : 1) * PROFONDEUR * 0.22,
        )
        menuiseries.add(fenetre)
        retenirBaie(e, fenetre.userData.vitre?.material)
      }
      // Bardage bois en allège de pignon : le contrepoint se retourne sur le
      // côté, sinon il se lit comme un décor de façade collé devant.
      poserBardage(bardage, {
        x: cote * (LARGEUR / 2 - RETRAIT + 0.01),
        y: y + 0.04,
        hauteur: h - EPAISSEUR_DALLE - 0.06,
        largeur: PROFONDEUR * 0.3,
        z: PROFONDEUR * 0.3,
        rotation: cote * (Math.PI / 2),
      })
    })
  }

  montant.add(menuiseries)
  montant.add(fonds)
  montant.add(bardage)

  /* --- L'entrée ------------------------------------------------------------ */

  /**
   * LE HALL, au pied de la cage vitrée — là où il est toujours. Une double
   * porte de verre en retrait, sa marquise de béton en porte-à-faux, son
   * perron. Un immeuble contemporain se reconnaît d'abord à son entrée : c'est
   * la seule partie de la façade qu'on aborde à hauteur d'homme.
   */
  const entree = new THREE.Group()
  const xPorte = xCage

  const retraitHall = 0.45
  const hall = poser(
    entree,
    boite(largeurTravee - 0.3, HAUTEUR_SOCLE - 0.3, 0.1, M.murVitre()),
    { ombre: false },
  )
  hall.position.set(xPorte, (HAUTEUR_SOCLE - 0.3) / 2, zFacade - retraitHall)

  // Les deux vantaux, leurs montants d'aluminium et la barre de tirage.
  ;[-1, 1].forEach((cote) => {
    const montantPorte = poser(entree, boite(0.07, 1.28, 0.1, M.aluNoir()), { ombre: false })
    montantPorte.position.set(xPorte + cote * 0.52, 0.64, zFacade - retraitHall + 0.08)
  })
  const traverse = poser(entree, boite(1.15, 0.07, 0.1, M.aluNoir()), { ombre: false })
  traverse.position.set(xPorte, 1.28, zFacade - retraitHall + 0.08)
  const barre = poser(entree, fut(0.028, 0.72, M.laiton(), 8), { ombre: false })
  barre.position.set(xPorte + 0.1, 0.7, zFacade - retraitHall + 0.14)

  // La marquise : une dalle mince en porte-à-faux, sans poteau. C'est le
  // détail qui dit « architecte » plutôt que « promoteur ».
  const marquise = poser(entree, boite(2.5, 0.12, 1.35, M.betonLisse()))
  marquise.position.set(xPorte, 1.72, zFacade + 0.24)
  const soffiteMarquise = poser(entree, boite(2.3, 0.04, 1.2, M.boisBardage()), { ombre: false })
  soffiteMarquise.position.set(xPorte, 1.64, zFacade + 0.24)

  // Le perron : deux marches et son seuil de béton lissé.
  ;[0, 1].forEach((i) => {
    const marche = poser(entree, boite(2.4 - i * 0.25, 0.09, 0.45 + i * 0.3, M.betonLisse()), {
      ombre: false,
    })
    marche.position.set(xPorte, 0.045 + (1 - i) * 0.09, zFacade - retraitHall + 0.5 + i * 0.35)
  })

  // Deux appliques encastrées de part et d'autre du hall.
  ;[-1, 1].forEach((cote) => {
    const applique = poser(entree, boite(0.06, 0.5, 0.12, M.laiton()), { ombre: false })
    applique.position.set(xPorte + cote * 0.85, 1.15, zFacade - 0.06)
  })
  montant.add(entree)

  /* --- Le couronnement : toit plat, acrotère, édicule --------------------- */

  const couronnement = new THREE.Group()

  // L'acrotère — le relevé qui ceinture un toit plat. C'est lui qui donne la
  // ligne franche du couronnement ; sans lui, la dernière dalle flotte.
  ;[-1, 1].forEach((cote) => {
    const avant = poser(couronnement, boite(LARGEUR + 0.5, 0.42, 0.14, M.betonLisse()))
    avant.position.set(0, hauteurCorps + 0.21, (cote * (PROFONDEUR + 0.5)) / 2 - cote * 0.07)
    const lateral = poser(couronnement, boite(0.14, 0.42, PROFONDEUR + 0.5, M.betonLisse()))
    lateral.position.set((cote * (LARGEUR + 0.5)) / 2 - cote * 0.07, hauteurCorps + 0.21, 0)
    // La couvertine de zinc : le seul métal du couronnement, et la ligne
    // brillante qui détache le bâtiment du ciel.
    const couvertine = poser(couronnement, boite(LARGEUR + 0.62, 0.04, 0.2, M.zincToiture()), {
      ombre: false,
    })
    couvertine.position.set(0, hauteurCorps + 0.44, (cote * (PROFONDEUR + 0.5)) / 2 - cote * 0.07)
    const couvertineLaterale = poser(
      couronnement,
      boite(0.2, 0.04, PROFONDEUR + 0.62, M.zincToiture()),
      { ombre: false },
    )
    couvertineLaterale.position.set(
      (cote * (LARGEUR + 0.5)) / 2 - cote * 0.07,
      hauteurCorps + 0.44,
      0,
    )
  })

  // Les descentes d'eau pluviale, aux deux angles de la façade.
  ;[-1, 1].forEach((cote) => {
    const descente = gouttiere({ longueur: 0.2, hauteur: hauteurCorps - 0.4, descente: true })
    descente.position.set(
      (cote * (LARGEUR + 0.2)) / 2,
      hauteurCorps,
      PROFONDEUR / 2 + 0.1,
    )
    couronnement.add(descente)
  })
  montant.add(couronnement)

  /**
   * LE TOIT NU — ce que le rooftop remplace.
   *
   * Un toit plat qu'on n'aménage pas n'est pas une terrasse : c'est une étendue
   * de gravillons, deux sorties de ventilation, un édicule d'escalier et le
   * groupe de climatisation. Il est dans son propre groupe, et c'est tout
   * l'intérêt : il s'efface exactement à la vitesse où le platelage du rooftop
   * paraît, si bien qu'il n'y a jamais ni deux toits ni aucun.
   */
  const toitNu = new THREE.Group()
  const yToit = hauteurCorps

  const gravillons = poser(toitNu, boite(LARGEUR - 0.2, 0.06, PROFONDEUR - 0.2, M.gravier()), {
    ombre: false,
  })
  gravillons.position.y = yToit + 0.03

  const edicule = poser(toitNu, boite(1.5, 0.78, 1.5, M.betonLisse()))
  edicule.position.set(travee(TRAVEE_PORTE), yToit + 0.39, -PROFONDEUR * 0.2)
  const porteEdicule = poser(toitNu, boite(0.7, 0.62, 0.06, M.aluNoir()), { ombre: false })
  porteEdicule.position.set(travee(TRAVEE_PORTE), yToit + 0.31, -PROFONDEUR * 0.2 + 0.78)

  // Le groupe de climatisation et ses deux ventouses : la vérité d'un toit.
  const clim = poser(toitNu, boite(1.1, 0.42, 0.7, M.zincToiture()))
  clim.position.set(LARGEUR * 0.24, yToit + 0.27, -PROFONDEUR * 0.24)
  ;[-1, 1].forEach((cote) => {
    const ventouse = poser(toitNu, fut(0.14, 0.34, M.zincToiture(), 10), { ombre: false })
    ventouse.position.set(LARGEUR * 0.24 + cote * 0.34, yToit + 0.63, -PROFONDEUR * 0.24)
  })
  montant.add(toitNu)

  const hauteurTotale = yToit + 1.35

  /* --- Les abords ---------------------------------------------------------- */

  /**
   * LE PARVIS. Ni rue, ni trottoir, ni mitoyens : un parvis planté, comme en
   * ont les programmes neufs. L'allée mène à l'entrée, la pelouse ceinture le
   * pied de l'immeuble, deux sujets encadrent la façade et une haie basse en
   * marque la limite.
   *
   * C'EST CE QUI REMPLACE L'ALIGNEMENT HAUSSMANNIEN, et le remplacement était
   * la condition pour que les mitoyens s'en aillent : un immeuble seul sur un
   * disque de blanc n'est pas un bien, c'est une maquette. Il lui faut ce qu'il
   * a devant lui — et un immeuble contemporain a un parvis, pas une chaussée.
   */
  const abords = new THREE.Group()
  groupe.add(abords)

  const PARVIS = 5.6
  const zParvis = zFacade + PARVIS / 2

  const pelouse = poser(abords, boite(LARGEUR + 5.4, 0.08, PARVIS + 1.6, M.gazon()), {
    ombre: false,
  })
  pelouse.position.set(0, 0.04, zParvis - 0.4)

  const allee = poser(abords, boite(2.4, 0.1, PARVIS, M.dallage()), { ombre: false })
  allee.position.set(travee(TRAVEE_PORTE), 0.09, zParvis)

  // La bande de dalles au pied de la façade : le pourtour technique de tout
  // immeuble, et ce qui empêche la pelouse de mourir sur le nu du mur.
  const pourtour = poser(abords, boite(LARGEUR + 1.6, 0.1, 1.1, M.dallage()), { ombre: false })
  pourtour.position.set(0, 0.09, zFacade + 0.55)

  ;[-1, 1].forEach((cote) => {
    const sujet = arbre(3.2, { variante: cote < 0 ? 0 : 1 })
    sujet.position.set(cote * (LARGEUR / 2 + 1.7), 0.08, zFacade + 2.2)
    abords.add(sujet)

    // Massifs et graminées au pied : c'est ce qui fait qu'un parvis est planté
    // et non simplement engazonné.
    ;[0.9, 2.0, 3.1].forEach((dz, i) => {
      const massif = buisson(0.28 + (i % 2) * 0.1)
      massif.position.set(cote * (LARGEUR / 2 + 0.75), 0.1, zFacade + dz)
      abords.add(massif)
    })
    const touffe = graminee(0.62)
    touffe.position.set(cote * (LARGEUR / 2 + 2.5), 0.1, zFacade + 3.6)
    abords.add(touffe)
  })

  // Haie basse en limite de parvis, et les deux bornes d'éclairage de l'allée.
  for (let i = -4; i <= 4; i += 1) {
    const arbuste = buisson(0.34)
    arbuste.position.set(i * 1.15, 0.1, zFacade + PARVIS + 0.5)
    abords.add(arbuste)
  }
  ;[-1, 1].forEach((cote) => {
    ;[1.6, 3.4].forEach((dz) => {
      const borne = poser(abords, boite(0.1, 0.44, 0.1, M.aluNoir()))
      borne.position.set(travee(TRAVEE_PORTE) + cote * 1.5, 0.3, zFacade + dz)
    })
  })

  const rayonAbords = Math.hypot(LARGEUR / 2 + 2.7, zFacade + PARVIS + 1.2) + 1.2

  /* -------------------------------------------------------------------------- */
  /*  Les options d'affinage                                                    */
  /* -------------------------------------------------------------------------- */

  /**
   * LE BALCON DU VENDEUR — et pourquoi il s'ajoute à ceux que l'immeuble a déjà.
   *
   * L'immeuble porte un balcon par étage : ce sont des balcons de PROMOTEUR, la
   * même dalle pour tout le monde, et ils font partie du bâtiment. Celui-ci est
   * autre chose — c'est le SIEN, à SON étage, et il se reconnaît à ce qu'on y
   * vit : un salon d'extérieur, des jardinières, un store. Il se pose en saillie
   * devant sa travée, à la hauteur qu'il a déclarée.
   *
   * SA SURFACE SE RÈGLE AU CURSEUR (voir `EstimationAffinagePanel`) : la dalle
   * s'allonge, le garde-corps suit, et le mobilier s'écarte plutôt que de
   * grandir. Un balcon de 4 m² et une loggia de 25 ne se distinguent pas
   * seulement par leur taille — on n'y met pas les mêmes choses.
   */
  const balconEtage = new THREE.Group()
  const BALCON_MIN = 1.9
  const BALCON_MAX = 4.4
  const BALCON_AVANCE_MIN = 1.0
  const BALCON_AVANCE_MAX = 1.9

  const dalleBalcon = poser(balconEtage, boite(1, 0.15, 1, M.betonLisse()))
  const sousFaceBalcon = poser(balconEtage, boite(1, 0.04, 1, M.boisBardage()), { ombre: false })
  const rivesBalcon = ['avant', 'gauche', 'droite'].map((cote) => {
    const rive = gardeCorpsVerre({ largeur: 1, hauteur: 0.72 })
    if (cote !== 'avant') rive.rotation.y = Math.PI / 2
    balconEtage.add(rive)
    return { cote, rive }
  })

  const salonBalcon = new THREE.Group()
  const canapeBalcon = poser(salonBalcon, boite(1.15, 0.34, 0.55, M.tissuClair()))
  canapeBalcon.position.y = 0.17
  const dossierBalcon = poser(salonBalcon, boite(1.15, 0.3, 0.12, M.tissuBleu()), { ombre: false })
  dossierBalcon.position.set(0, 0.36, -0.22)
  const tableBalcon = poser(salonBalcon, boite(0.55, 0.05, 0.42, M.boisClair()), { ombre: false })
  tableBalcon.position.set(0, 0.28, 0.5)
  balconEtage.add(salonBalcon)

  const jardinieresBalcon = [-1, 1].map((cote) => {
    const bac = new THREE.Group()
    const caisse = poser(bac, boite(0.7, 0.3, 0.3, M.boisBardage()))
    caisse.position.y = 0.15
    const verdure = buisson(0.24)
    verdure.position.y = 0.3
    bac.add(verdure)
    bac.userData.cote = cote
    balconEtage.add(bac)
    return bac
  })

  /** Étend le balcon à la surface déclarée, et le meuble en conséquence. */
  function etendreBalcon(t) {
    const largeur = BALCON_MIN + (BALCON_MAX - BALCON_MIN) * t
    const avance = BALCON_AVANCE_MIN + (BALCON_AVANCE_MAX - BALCON_AVANCE_MIN) * t

    dalleBalcon.scale.set(largeur, 1, avance)
    dalleBalcon.position.set(0, 0.075, avance / 2)
    sousFaceBalcon.scale.set(largeur - 0.1, 1, avance - 0.06)
    sousFaceBalcon.position.set(0, -0.005, avance / 2)

    rivesBalcon.forEach(({ cote, rive }) => {
      rive.scale.x = cote === 'avant' ? largeur : avance
      rive.position.set(
        cote === 'gauche' ? -largeur / 2 : cote === 'droite' ? largeur / 2 : 0,
        0.15,
        cote === 'avant' ? avance : avance / 2,
      )
    })

    salonBalcon.position.set(-largeur * 0.16, 0.15, avance * 0.46)
    jardinieresBalcon.forEach((bac) => {
      bac.position.set(bac.userData.cote * (largeur / 2 - 0.45), 0.15, avance * 0.24)
      // Les jardinières n'arrivent qu'à partir d'un balcon qui peut les
      // porter : sur 4 m², elles prendraient la place du fauteuil.
      bac.visible = t > 0.28
    })
  }
  etendreBalcon(0.35)
  groupe.add(balconEtage)

  /* --- REZ-DE-JARDIN : le jardin privatif de plain-pied ------------------- */

  /**
   * Un appartement de rez-de-jardin, c'est un logement qui ouvre de plain-pied
   * sur un bout de terrain à lui. Ici, ce bout de terrain se prend sur le
   * parvis, derrière une haie : pelouse, terrasse contre la façade, salon de
   * jardin. Il se pose au droit de la TRAVÉE DU LOGEMENT, la même que celle du
   * balcon — c'est le même appartement qu'on décrit, il ne peut pas être à deux
   * endroits de la façade.
   *
   * SA SURFACE SE RÈGLE AU CURSEUR, elle aussi : la pelouse s'étend, la haie
   * recule, les massifs s'écartent.
   */
  const rezDeJardin = new THREE.Group()
  const xJardin = travee(TRAVEE_LOGEMENT)
  const JARDIN_MIN_L = 2.6
  const JARDIN_MAX_L = 5.2
  const JARDIN_MIN_P = 1.8
  const JARDIN_MAX_P = 4.2

  const pelouseRez = poser(rezDeJardin, boite(1, 0.09, 1, M.gazon()), { ombre: false })
  const terrasseRez = poser(rezDeJardin, boite(1, 0.11, 1.1, M.dallage()), { ombre: false })
  const haieRez = []
  for (let i = 0; i < 9; i += 1) {
    const arbuste = buisson(0.3)
    haieRez.push(arbuste)
    rezDeJardin.add(arbuste)
  }
  const mobilierRez = new THREE.Group()
  const tableRez = poser(mobilierRez, boite(0.95, 0.06, 0.62, M.boisClair()))
  tableRez.position.y = 0.6
  ;[-1, 1].forEach((cote) => {
    const chaise = poser(mobilierRez, boite(0.36, 0.06, 0.36, M.tissuClair()))
    chaise.position.set(cote * 0.86, 0.46, 0)
    const dossier = poser(mobilierRez, boite(0.36, 0.34, 0.06, M.tissuClair()), { ombre: false })
    dossier.position.set(cote * 0.86, 0.66, -0.16)
  })
  rezDeJardin.add(mobilierRez)
  const sujetJardin = arbre(2.0, { variante: 1 })
  rezDeJardin.add(sujetJardin)

  /** Portée du rez-de-jardin au sol : l'îlot doit la couvrir. */
  let porteeJardin = 0

  function etendreJardin(t) {
    const largeur = JARDIN_MIN_L + (JARDIN_MAX_L - JARDIN_MIN_L) * t
    const profondeur = JARDIN_MIN_P + (JARDIN_MAX_P - JARDIN_MIN_P) * t
    const zCentre = zFacade + 0.6 + profondeur / 2

    pelouseRez.scale.set(largeur, 1, profondeur)
    pelouseRez.position.set(xJardin, 0.135, zCentre)
    terrasseRez.scale.set(largeur - 0.6, 1, 1)
    terrasseRez.position.set(xJardin, 0.145, zFacade + 1.05)

    haieRez.forEach((arbuste, i) => {
      // La haie ferme les trois côtés : cinq pieds devant, deux sur chaque joue.
      if (i < 5) {
        arbuste.position.set(
          xJardin - largeur / 2 + ((i + 0.5) * largeur) / 5,
          0.14,
          zCentre + profondeur / 2,
        )
      } else {
        const cote = i < 7 ? -1 : 1
        const rang = (i - 5) % 2
        arbuste.position.set(
          xJardin + (cote * largeur) / 2,
          0.14,
          zCentre - profondeur / 4 + rang * (profondeur / 2),
        )
      }
    })

    mobilierRez.position.set(xJardin - largeur * 0.16, 0.18, zCentre + profondeur * 0.1)
    sujetJardin.position.set(xJardin + largeur * 0.34, 0.16, zCentre + profondeur * 0.2)
    sujetJardin.visible = t > 0.22

    porteeJardin = Math.hypot(Math.abs(xJardin) + largeur / 2, zCentre + profondeur / 2) + 1.2
  }
  etendreJardin(0.3)
  groupe.add(rezDeJardin)

  /* --- ROOFTOP : le toit plat s'aménage ----------------------------------- */

  /**
   * LE TOIT SE TRANSFORME, IL NE SE MEUBLE PAS.
   *
   * Un rooftop n'est pas du mobilier posé sur une toiture : c'est la toiture qui
   * cesse d'être technique. Les gravillons, l'édicule et le groupe de clim
   * s'effacent donc à mesure que le platelage grandit, et ce qui reste du
   * couronnement — acrotère, couvertine — ne bouge pas : un immeuble ne perd
   * pas son relevé d'étanchéité parce qu'on a aménagé son toit.
   *
   * LA SURFACE DÉCLARÉE SE VOIT. Le platelage et son garde-corps de verre
   * s'étendent avec elle, et le mobilier arrive par paliers — les transats
   * d'abord, le JACUZZI et la pergola ensuite, le bar en dernier. Une terrasse
   * de 20 m² et une de 120 ne se distinguent pas seulement par leur taille : on
   * n'y met pas les mêmes choses.
   */
  const rooftop = new THREE.Group()
  const ROOFTOP_MIN = 0.44
  const ROOFTOP_MAX = 1.0

  const platelage = poser(rooftop, boite(1, 0.12, 1, M.boisClair()), { ombre: false })
  platelage.position.y = yToit + 0.06

  const rivesRooftop = ['avant', 'arriere', 'gauche', 'droite'].map((cote) => {
    const rive = gardeCorpsVerre({ largeur: 1, hauteur: 0.82 })
    if (cote === 'gauche' || cote === 'droite') rive.rotation.y = Math.PI / 2
    rive.position.y = yToit + 0.12
    rooftop.add(rive)
    return { cote, rive }
  })

  const bainsRooftop = [-1, 1].map((cote) => {
    const bain = transat({ echelle: 0.95 })
    bain.userData.cote = cote
    rooftop.add(bain)
    return bain
  })

  /**
   * LE JACUZZI. C'est lui qu'on vient voir : un rooftop sans spa est une
   * terrasse, et le vendeur qui coche « rooftop » a en tête exactement cette
   * image-là. Il porte la même eau que la piscine — la seule matière du décor
   * qui bouge d'elle-même —, et deux eaux différentes sur le même bien se
   * verraient.
   */
  const spa = jacuzzi({ largeur: 1.8, profondeur: 1.5, hauteur: 0.58 })
  rooftop.add(spa)

  const pergolaRooftop = creerPergola({ largeur: 2.6, profondeur: 2.0, hauteur: 1.45 })
  rooftop.add(pergolaRooftop)

  const jardinieresRooftop = [-1, 1].map((cote) => {
    const bac = new THREE.Group()
    const caisse = poser(bac, boite(1.15, 0.34, 0.4, M.boisBardage()))
    caisse.position.y = yToit + 0.29
    const verdure = buisson(0.32)
    verdure.position.y = yToit + 0.5
    bac.add(verdure)
    bac.userData.cote = cote
    rooftop.add(bac)
    return bac
  })

  const barRooftop = new THREE.Group()
  const comptoir = poser(barRooftop, boite(1.7, 0.09, 0.58, M.margelle()))
  comptoir.position.y = yToit + 0.98
  const piedBar = poser(barRooftop, boite(1.6, 0.88, 0.46, M.boisBardage()))
  piedBar.position.y = yToit + 0.54
  rooftop.add(barRooftop)

  /** Étend le rooftop à la surface déclarée, et le meuble en conséquence. */
  function etendreRooftop(t) {
    const largeur = (LARGEUR - 0.3) * (ROOFTOP_MIN + (ROOFTOP_MAX - ROOFTOP_MIN) * t)
    const profondeur = (PROFONDEUR - 0.3) * (ROOFTOP_MIN + (ROOFTOP_MAX - ROOFTOP_MIN) * t)

    platelage.scale.set(largeur, 1, profondeur)
    rivesRooftop.forEach(({ cote, rive }) => {
      const long = cote === 'gauche' || cote === 'droite' ? profondeur : largeur
      rive.scale.x = long
      rive.position.x = cote === 'gauche' ? -largeur / 2 : cote === 'droite' ? largeur / 2 : 0
      rive.position.z = cote === 'avant' ? profondeur / 2 : cote === 'arriere' ? -profondeur / 2 : 0
    })

    // Le mobilier ne grandit pas — il s'écarte, et il s'ajoute.
    bainsRooftop.forEach((bain) => {
      bain.position.set(bain.userData.cote * largeur * 0.24, yToit + 0.12, profondeur * 0.2)
    })
    spa.position.set(-largeur * 0.22, yToit + 0.12, -profondeur * 0.18)
    spa.visible = t > 0.18
    pergolaRooftop.position.set(largeur * 0.2, yToit + 0.12, -profondeur * 0.16)
    pergolaRooftop.visible = t > 0.34
    jardinieresRooftop.forEach((bac) => {
      bac.position.set(bac.userData.cote * (largeur / 2 - 0.7), 0, -profondeur * 0.42)
      bac.visible = t > 0.44
    })
    barRooftop.position.set(largeur * 0.24, 0, profondeur * 0.34)
    barRooftop.visible = t > 0.74
  }
  etendreRooftop(0)
  groupe.add(rooftop)

  /* --- L'ASCENSEUR --------------------------------------------------------- */

  /**
   * LA CAGE ET SA CABINE — le seul ouvrage du décor qui se montre PAR
   * TRANSPARENCE.
   *
   * Un ascenseur est à l'intérieur : c'est même sa définition. On ne peut donc
   * ni le poser sur la façade — ce serait un ascenseur panoramique, et ce n'est
   * pas ce qu'on déclare —, ni le laisser invisible — le vendeur cocherait une
   * case sans rien voir. La seule réponse juste est celle des maquettes
   * d'architecte : LE BÂTIMENT DEVIENT TRANSLUCIDE, et l'on voit à travers.
   *
   * La cage est donc plantée derrière la travée d'entrée, contre la façade —
   * l'endroit où elle se trouve réellement, et le plus visible une fois le
   * voile posé. La cabine y monte et y descend, et elle NE S'ARRÊTE PAS AU
   * HASARD : elle dessert l'étage déclaré (voir `poser`), s'y immobilise un
   * instant, puis redescend. C'est ce qui fait qu'on la regarde — une cabine qui
   * ferait des allers-retours sans raison serait un manège.
   */
  const ascenseur = new THREE.Group()
  /** La gaine occupe le DEVANT de la cage, juste derrière le mur-rideau :
      c'est là qu'on la voit, et c'est là qu'elle se trouve dans la réalité. */
  const zGaine = PROF_CAGE / 2 - 0.85
  const HAUT_GAINE = hauteurCorps + 0.4

  // Les quatre montants de la gaine, et ses deux joues de verre. Une gaine
  // pleine masquerait la cabine qu'on vient justement montrer.
  ;[-1, 1].forEach((sx) => {
    ;[-1, 1].forEach((sz) => {
      const montantGaine = poser(ascenseur, boite(0.08, HAUT_GAINE, 0.08, M.aluNoir()), {
        ombre: false,
      })
      montantGaine.position.set(xCage + sx * 0.54, HAUT_GAINE / 2, zGaine + sz * 0.5)
    })
  })
  ;[-1, 1].forEach((sx) => {
    const joue = poser(ascenseur, boite(0.03, HAUT_GAINE, 0.96, M.verreVoile()), { ombre: false })
    joue.position.set(xCage + sx * 0.54, HAUT_GAINE / 2, zGaine)
  })
  const dosGaine = poser(ascenseur, boite(1.08, HAUT_GAINE, 0.03, M.verreVoile()), { ombre: false })
  dosGaine.position.set(xCage, HAUT_GAINE / 2, zGaine - 0.5)

  // Les portes palières : une paire par niveau, et c'est à elles qu'on compte
  // les étages que la cabine dessert.
  for (let e = 0; e <= ETAGES; e += 1) {
    const porte = poser(ascenseur, boite(0.84, 1.0, 0.05, M.aluNoir()), { ombre: false })
    porte.position.set(xCage, hauteurEtage(e) + 0.52, zGaine + 0.5)
    const liseret = poser(ascenseur, boite(0.03, 1.0, 0.06, M.laiton()), { ombre: false })
    liseret.position.set(xCage, hauteurEtage(e) + 0.52, zGaine + 0.53)
  }

  /**
   * LA CABINE. Son plafond est ÉMISSIF, et c'est délibéré : c'est la seule
   * lumière qui se déplace dans tout le décor, et c'est elle qu'on suit des
   * yeux à travers le mur-rideau — bien plus que la boîte qui la porte.
   */
  const cabine = new THREE.Group()
  const caisson = poser(cabine, boite(0.94, 1.05, 0.9, M.aluNoir()))
  caisson.position.y = 0.53
  const plafonnier = poser(cabine, boite(0.78, 0.05, 0.74, M.margelle()), { ombre: false })
  plafonnier.position.y = 1.0
  plafonnier.material.emissive = new THREE.Color(0xffd9a0)
  plafonnier.material.emissiveIntensity = 3.4
  const solCabine = poser(cabine, boite(0.86, 0.05, 0.82, M.boisClair()), { ombre: false })
  solCabine.position.y = 0.06
  const vitreCabine = poser(cabine, boite(0.88, 0.86, 0.04, M.vitrage()), { ombre: false })
  vitreCabine.position.set(0, 0.56, 0.44)
  cabine.position.set(xCage, 0, zGaine)
  ascenseur.add(cabine)
  groupe.add(ascenseur)

  /* --- Panneaux solaires --------------------------------------------------- */

  /**
   * Ils ne sont plus PROPOSÉS aux appartements (voir `EstimationAffinagePanel`) :
   * un copropriétaire ne décide pas seul de la toiture de l'immeuble, et la
   * question n'avait pas de sens. L'ouvrage reste dessiné — il ne coûte rien
   * tant qu'il n'est pas révélé, et le jour où la copropriété entrera dans le
   * parcours, il est là.
   */
  const panneaux = new THREE.Group()
  for (let rangee = 0; rangee < 2; rangee += 1) {
    for (let i = 0; i < 3; i += 1) {
      const module = poser(panneaux, boite(0.9, 0.06, 0.66, M.panneauSolaire()))
      module.position.set(-0.95 + i * 1.0, 0.08, -0.4 + rangee * 0.8)
      module.rotation.x = 0.22
    }
  }
  panneaux.position.set(0, yToit + 0.12, -PROFONDEUR * 0.1)
  groupe.add(panneaux)

  /* --- Le standing ---------------------------------------------------------- */

  const standing = new THREE.Group()
  // Un parement de pierre sur le volume d'entrée, des bacs d'orangerie de part
  // et d'autre du hall, un store de toile sur les baies du rez-de-chaussée.
  const parement = poser(standing, boite(LARGEUR / TRAVEES + 0.2, HAUTEUR_SOCLE, 0.08, M.pierreSocle()))
  parement.position.set(xPorte, HAUTEUR_SOCLE / 2, zFacade + 0.06)
  ;[-1, 1].forEach((cote) => {
    const bac = poser(standing, boite(0.5, 0.46, 0.5, M.betonLisse()))
    bac.position.set(xPorte + cote * 1.5, 0.23, zFacade + 0.6)
    const sujet = buisson(0.32)
    sujet.position.set(xPorte + cote * 1.5, 0.5, zFacade + 0.6)
    standing.add(sujet)
  })
  const tapisSeuil = poser(standing, boite(2.0, 0.03, 1.2, M.tapisEscalier()), { ombre: false })
  tapisSeuil.position.set(xPorte, 0.12, zFacade - 0.05)
  groupe.add(standing)

  /* -------------------------------------------------------------------------- */
  /*  Révélations, voile et pilotage                                            */
  /* -------------------------------------------------------------------------- */

  const revelerEntree = revelable(entree)
  const revelerMenuiseries = revelable(menuiseries)
  const revelerFonds = revelable(fonds)
  const revelerBardage = revelable(bardage)
  const revelerBalcons = revelable(balcons)
  const revelerCouronnement = revelable(couronnement)
  const revelerToitNu = revelable(toitNu)
  const revelerAbords = revelable(abords)
  const revelerBalconEtage = revelable(balconEtage)
  const revelerRezDeJardin = revelable(rezDeJardin)
  const revelerRooftop = revelable(rooftop)
  const revelerPanneaux = revelable(panneaux)
  const revelerStanding = revelable(standing)
  const revelerAscenseur = revelable(ascenseur)

  /**
   * LE VOILE. Il s'applique au NOYAU, aux REFENDS et aux DALLES — la masse du
   * bâtiment — et à rien d'autre : ni aux balcons, ni aux menuiseries, ni aux
   * abords. C'est exactement ce qu'un architecte efface sur une coupe de
   * maquette, et c'est ce qui suffit à voir la cage.
   */
  /**
   * CE QUI SE VOILE, ET CE QUI NE SE VOILE PAS.
   *
   * Le NOYAU, les REFENDS, les FONDS D'APPARTEMENT et le HALL : les quatre
   * seules familles de pièces pleines qui se trouvent entre l'œil et la cage. Les dalles, les balcons, le
   * bardage et les menuiseries restent opaques — et c'est ce qui fait que
   * l'immeuble reste un immeuble pendant qu'on regarde à l'intérieur. Tout
   * voiler d'un coup, comme on l'avait d'abord écrit, donnait un fantôme :
   * cinquante surfaces translucides qui se trient les unes derrière les autres,
   * et un bâtiment qu'on ne lit plus du tout.
   *
   * Le plancher est bas — un cinquième —, et il peut l'être précisément parce
   * que le reste tient : ce sont les dalles blanches et les garde-corps qui
   * portent la silhouette, le noyau n'a plus qu'à s'effacer.
   */
  const voilerMasse = voilant([noyau, refends, fonds, entree], { plancher: 0.22 })
  const scintillerBalcon = scintillant(balconEtage)
  const scintillerJardin = scintillant(rezDeJardin, { couleur: 0xc8f0a8, force: 1.2 })
  const scintillerRooftop = scintillant(rooftop)
  const scintillerAscenseur = scintillant(ascenseur, { couleur: 0xffe4b0, force: 1.6 })
  const scintillerPanneaux = scintillant(panneaux, { couleur: 0xbfe0ff })

  const vitres = []
  groupe.traverse((objet) => {
    if (objet.isMesh && objet.material?.name === 'vitrage') vitres.push(objet.material)
  })

  /**
   * LE STANDING SUR LES MATIÈRES de l'immeuble.
   *
   * Deux immeubles contemporains de même plan ne se distinguent pas par leur
   * dessin mais par la QUALITÉ DE LEURS MATÉRIAUX — c'est même la seule chose
   * qui sépare un programme d'entrée de gamme d'un programme haut de gamme quand
   * l'architecte est le même.
   *
   *   LE BÉTON passe du blanc cassé industriel au béton matricé clair, et sa
   *   rugosité tombe : un béton soigné accroche la lumière.
   *   LE BARDAGE quitte le pin traité pour le mélèze huilé, plus chaud.
   *   LE ZINC des couvertines reprend son éclat au lieu de rester mat.
   *   LES MENUISERIES passent de l'alu peint à l'alu laqué.
   */
  const accorderStanding = M.accorderStanding(montant, {
    'beton-lisse': { couleur: 0xfdfbf6, roughness: 0.52 },
    beton: { couleur: 0xbdb8b0, roughness: 0.5 },
    bois: { couleur: 0xa9773f, roughness: 0.46, metalness: 0.04 },
    zinc: { couleur: 0xc8cfd8, roughness: 0.26, metalness: 0.54 },
    menuiserie: { couleur: 0x16171b, roughness: 0.2, metalness: 0.8 },
    laiton: { couleur: 0xe3bb80, roughness: 0.16, metalness: 0.9 },
    'pierre-socle': { couleur: 0xf4eddc, roughness: 0.62 },
    dallage: { couleur: 0xfcf8ef, roughness: 0.56 },
  })

  /** Étage dont les fenêtres s'allument. Posé par `designerEtage`. */
  let etageDesigne = null

  /**
   * LA LAMPE DE L'ÉTAGE DÉCLARÉ.
   *
   * L'émission d'une matière éclaire la matière, jamais ce qui l'entoure : un
   * vitrage qui s'allume reste un rectangle lumineux posé sur une façade qui,
   * elle, ne sait rien de cette lumière. Cette lampe-là est ce qui manquait —
   * elle déborde sur la dalle du dessus, sur le refend d'à côté et sur le
   * dessous du balcon, et c'est CE DÉBORDEMENT qu'on lit comme « il y a
   * quelqu'un derrière cette fenêtre ».
   *
   * Elle est créée une fois et ne varie qu'en intensité : une lumière ajoutée
   * ou retirée de la scène en cours de route ferait recompiler toutes les
   * matières de la façade, et l'image sauterait à chaque changement d'étage.
   * Elle ne porte pas d'ombre — c'est une lampe d'intérieur, et le coût d'une
   * seconde carte d'ombre pour un halo serait hors de proportion.
   */
  const lampeEtage = new THREE.PointLight(0xffc27a, 0, 9, 1.9)
  lampeEtage.position.set(travee(TRAVEE_LOGEMENT), hauteurEtage(2) + 0.6, zFacade - 0.3)
  groupe.add(lampeEtage)

  /**
   * Où se trouve le balcon d'affinage — le point que le drone vient filmer de
   * près quand le vendeur le déclare (voir `cadrer` dans `DroneScene`).
   */
  const ancreExterieur = new THREE.Vector3(
    travee(TRAVEE_LOGEMENT),
    hauteurEtage(2) + 0.8,
    zFacade + 1.2,
  )

  /** Portée au sol, recalculée à chaque image : le jardin s'étend. */
  let rayonSol = rayonAbords

  const bien = {
    groupe,
    montant,
    hauteurCoupe: hauteurTotale,
    envergure: {
      largeur: Math.max(LARGEUR + 4.4, PROFONDEUR + 4),
      hauteur: hauteurTotale,
    },

    /**
     * Emprise au sol, pour l'îlot sur lequel le décor pose l'immeuble. Elle
     * bouge désormais — le rez-de-jardin déclaré s'étend jusqu'à cinq unités
     * devant la façade, et un socle réglé sur le seul parvis le laisserait
     * déborder dans le vide.
     */
    get rayonSol() {
      return rayonSol
    },

    ancrages: {
      hauteur: hauteurTotale,
      exterieur: ancreExterieur,
    },

    /**
     * DÉSIGNE L'ÉTAGE DU VENDEUR — celui dont les fenêtres vont s'allumer.
     *
     * Rien ne s'allume à l'appel : `designerEtage` ne fait que dire OÙ, et
     * `poser` dit COMBIEN, image après image. Séparer les deux est ce qui
     * permet au vendeur de changer d'étage au milieu d'un fondu sans que la
     * lumière saute — l'ancien étage s'éteint du même mouvement que le nouveau
     * s'allume.
     */
    designerEtage(etage) {
      const n = Math.round(Number(etage))
      etageDesigne = Number.isFinite(n) ? Math.max(0, Math.min(ETAGES, n)) : null
    },

    /** Place le balcon d'affinage à l'étage déclaré — et l'ancre de caméra avec. */
    placerBalcon(etage) {
      const y = hauteurEtage(etage)
      balconEtage.position.set(travee(TRAVEE_LOGEMENT), y, zFacade + 0.24)
      ancreExterieur.set(travee(TRAVEE_LOGEMENT), y + 0.8, zFacade + 1.2)
      lampeEtage.position.set(travee(TRAVEE_LOGEMENT), y + hauteurNiveau(etage) * 0.55, zFacade - 0.4)
    },

    poser(v) {
      accorderStanding(v.standing)

      revelerEntree(v.entree)
      revelerMenuiseries(v.menuiserie)
      revelerFonds(v.menuiserie)
      revelerBardage(v.menuiserie)
      revelerBalcons(v.menuiserie)
      revelerCouronnement(v.couronnement)
      revelerAbords(v.abords)
      revelerBalconEtage(v.balcon)
      revelerRezDeJardin(v.rezDeJardin ?? 0)
      revelerStanding(v.standing)
      revelerPanneaux(v.panneaux)

      etendreBalcon(v.balconEtendue ?? 0.35)
      etendreJardin(v.jardinEtendue ?? 0.3)
      rayonSol = Math.max(rayonAbords, (v.rezDeJardin ?? 0) > 0.02 ? porteeJardin : 0)

      // LE ROOFTOP PREND LA PLACE DU TOIT TECHNIQUE, et les deux se croisent
      // dans le même fondu : les gravillons s'effacent exactement à la vitesse
      // où le platelage paraît, si bien qu'il n'y a jamais ni deux toits ni
      // aucun.
      const surToit = Math.max(0, Math.min(1, v.rooftop ?? 0))
      etendreRooftop(surToit)
      revelerRooftop(surToit)
      revelerToitNu(Math.min(v.couronnement, 1 - surToit))
      M.onduler(spa.userData.eau, v.temps ?? 0)

      /* --- L'ascenseur ---------------------------------------------------- */

      const monte = Math.max(0, Math.min(1, v.ascenseur ?? 0))
      revelerAscenseur(monte)
      // LE VOILE NE SE POSE QU'APRÈS LES RÉVÉLATIONS : les deux écrivent la même
      // opacité, et c'est le voile qui doit avoir le dernier mot.
      voilerMasse(monte)

      if (monte > 0.01) {
        /**
         * LA COURSE. Une montée, un arrêt à l'étage déclaré, une descente, un
         * arrêt au rez-de-chaussée : le cycle d'un ascenseur, pas celui d'un
         * ascenseur de démonstration. Les deux arrêts occupent un cinquième du
         * cycle chacun — assez pour qu'on voie la cabine S'ARRÊTER, ce qui est
         * la seule chose qui distingue un ascenseur d'une navette.
         */
        const desserte = etageDesigne ?? 2
        const arrivee = hauteurEtage(desserte === 0 ? ETAGES : desserte)
        const cycle = ((v.temps ?? 0) % 9) / 9
        let part
        if (cycle < 0.34) part = cycle / 0.34
        else if (cycle < 0.54) part = 1
        else if (cycle < 0.88) part = 1 - (cycle - 0.54) / 0.34
        else part = 0
        // Départ et arrivée adoucis : un ascenseur ne part pas d'un coup.
        const e = part < 0.5 ? 2 * part * part : 1 - ((-2 * part + 2) ** 2) / 2
        cabine.position.y = 0.1 + e * (arrivee - 0.1)
      }

      /* --- La lumière ------------------------------------------------------ */

      // LE SOIR, D'ABORD : toutes les vitres s'ambrent ensemble au stade du
      // prix. C'est le fond sur lequel l'étage déclaré vient se détacher.
      vitres.forEach((matiere) => {
        matiere.emissive.setHex(0xf6c978)
        matiere.emissiveIntensity = v.lumiere * 0.9
      })

      /**
       * PUIS L'ÉTAGE DU VENDEUR, ET IL ÉCRASE TOUT LE RESTE.
       *
       * L'écart était de trois fois l'éclairage du soir. Sur une façade au
       * soleil, ça ne se voyait pas : le vendeur réglait son étage et ne
       * trouvait pas son logement. Il est désormais de DIX — et il y faut les
       * trois choses à la fois, parce qu'aucune ne suffit seule :
       *
       *   LE VITRAGE s'allume à pleine émission, et le FOND D'APPARTEMENT
       *   derrière lui plus fort encore : c'est la pièce qui est éclairée, pas
       *   le verre.
       *   LA LAMPE déborde sur la dalle, le refend et le dessous du balcon —
       *   sans ce débordement, un rectangle lumineux reste un autocollant.
       *   LE FLORAISON (bloom) du post-traitement fait le reste : une émission
       *   au-delà de 1 y rayonne, et c'est ce halo qui se voit du premier coup
       *   d'œil (voir `DroneScene`).
       */
      const allume = Math.max(0, Math.min(1, v.etageAllume ?? 0))
      if (etageDesigne !== null && allume > 0.002) {
        const matieres = baiesParEtage.get(etageDesigne)
        matieres?.forEach((matiere) => {
          matiere.emissive.setHex(0xffcf8c)
          matiere.emissiveIntensity = Math.max(
            matiere.emissiveIntensity ?? 0,
            allume * (matiere.name === 'vitrage' ? 3.4 : 2.6),
          )
        })
      }
      lampeEtage.intensity = allume * 7

      /* --- Les scintillements --------------------------------------------- */

      const eclat = v.eclat ?? 0
      scintillerBalcon(v.balcon * eclat)
      scintillerJardin((v.rezDeJardin ?? 0) * eclat)
      scintillerRooftop(surToit > 0.02 ? eclat : 0)
      scintillerAscenseur(monte * eclat)
      scintillerPanneaux(v.panneaux * eclat)
    },
  }

  return bien
}
