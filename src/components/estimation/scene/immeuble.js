import * as THREE from 'three'
import * as M from './matieres'
import {
  arbre,
  boite,
  buisson,
  fenetreFrancaise,
  fut,
  gardeCorpsFer,
  lucarne,
  poser,
  revelable,
  souche,
} from './kit'

/**
 * L'IMMEUBLE — toujours le même.
 *
 * Un appartement, c'est cet immeuble-là : un haussmannien de pierre de taille,
 * haut, d'angle, tel qu'on en voit boulevard Voltaire. Il ne change ni avec la
 * surface ni avec l'étage déclarés — seul l'étage où l'on monte change, et cela
 * se joue à l'intérieur (voir `interieur.js`).
 *
 * LA COMPOSITION, du bas vers le haut, est celle de la façade parisienne :
 *
 *   • un SOCLE de pierre à bossage sur deux niveaux, percé de baies cintrées
 *     et de la porte cochère, sous sa marquise de laiton ;
 *   • l'ÉTAGE NOBLE, le premier au-dessus du socle : fenêtres plus hautes,
 *     balcon filant de fer forgé sur toute la façade ;
 *   • les ÉTAGES COURANTS, chacun un peu moins haut que le précédent, à
 *     balconnets individuels ;
 *   • un SECOND BALCON FILANT à l'avant-dernier niveau — la règle
 *     haussmannienne, et ce qui rythme une façade de sept étages ;
 *   • la CORNICHE à modillons, puis l'ATTIQUE en retrait et sa terrasse
 *     plantée ;
 *   • le COMBLE MANSARDÉ de zinc, ses lucarnes et ses souches de cheminée.
 *
 * L'immeuble porte aussi les REPÈRES dont la visite intérieure a besoin : où
 * est la porte cochère, à quelle hauteur se trouve chaque étage, et par quelle
 * fenêtre on ressort au moment de l'estimation.
 */

/** Gabarit de l'immeuble, en unités de scène. Fixe, à dessein. */
export const LARGEUR = 8.8
export const PROFONDEUR = 7.6
export const HAUTEUR_SOCLE = 2.55
export const HAUTEUR_ETAGE = 1.66
export const ETAGES = 7
/** Nombre de travées de la façade. */
const TRAVEES = 5

/** Hauteur du plancher d'un étage donné (0 = rez-de-chaussée). */
export const hauteurEtage = (etage) =>
  etage <= 0 ? 0.3 : HAUTEUR_SOCLE + (Math.min(etage, ETAGES) - 1) * HAUTEUR_ETAGE

/** Abscisse du centre d'une travée. */
export const travee = (index) => -LARGEUR / 2 + ((index + 0.5) * LARGEUR) / TRAVEES

/** Travée de la fenêtre par laquelle on ressort, et sur laquelle le logement
    visité est aligné. */
export const TRAVEE_LOGEMENT = 3

/** Travée de la porte cochère — jamais au milieu : une façade parisienne est
    rythmée, pas symétrique autour de son entrée. */
export const TRAVEE_PORTE = 1

export function creerImmeuble() {
  const groupe = new THREE.Group()
  const montant = new THREE.Group()
  groupe.add(montant)

  const zFacade = PROFONDEUR / 2

  /* --- Le corps de pierre ------------------------------------------------- */

  const hauteurCorps = HAUTEUR_SOCLE + ETAGES * HAUTEUR_ETAGE

  const socle = poser(montant, boite(LARGEUR + 0.16, HAUTEUR_SOCLE, PROFONDEUR + 0.16, M.pierreSocle()))
  socle.position.y = HAUTEUR_SOCLE / 2

  const corps = poser(
    montant,
    boite(LARGEUR, hauteurCorps - HAUTEUR_SOCLE, PROFONDEUR, M.pierreTaille()),
  )
  corps.position.y = HAUTEUR_SOCLE + (hauteurCorps - HAUTEUR_SOCLE) / 2

  // Bandeau mouluré au droit de chaque plancher : c'est lui qui donne les
  // assises horizontales d'une façade, et sans lui la pierre monte d'un trait.
  for (let e = 1; e <= ETAGES; e += 1) {
    const bandeau = poser(montant, boite(LARGEUR + 0.14, 0.11, PROFONDEUR + 0.14, M.pierreMoulure()))
    bandeau.position.y = hauteurEtage(e) - 0.05
  }

  // Chaînages d'angle : les pilastres de pierre qui tiennent les angles.
  ;[-1, 1].forEach((sx) => {
    ;[-1, 1].forEach((sz) => {
      const pilastre = poser(montant, boite(0.42, hauteurCorps - 0.2, 0.42, M.pierreMoulure()))
      pilastre.position.set(
        (sx * (LARGEUR + 0.1)) / 2,
        (hauteurCorps - 0.2) / 2,
        (sz * (PROFONDEUR + 0.1)) / 2,
      )
    })
  })

  /* --- Le socle : porte cochère, baies cintrées --------------------------- */

  const entree = new THREE.Group()
  const xPorte = travee(TRAVEE_PORTE)

  // Encadrement de pierre de la porte cochère, sa clé et son linteau.
  const encadrement = poser(entree, boite(2.15, 2.35, 0.24, M.pierreMoulure()))
  encadrement.position.set(xPorte, 1.18, zFacade + 0.04)
  const embrasure = poser(entree, boite(1.72, 2.1, 0.3, M.platreOmbre()), { ombre: false })
  embrasure.position.set(xPorte, 1.05, zFacade + 0.02)

  const cle = poser(entree, boite(0.24, 0.34, 0.28, M.pierreMoulure()))
  cle.position.set(xPorte, 2.28, zFacade + 0.08)

  // Les deux vantaux de bois verni, et leurs heurtoirs de laiton. Ils
  // s'ouvrent vers l'intérieur au moment de la visite : la charnière est donc
  // posée en pivot, sur le bord extérieur de chaque vantail.
  const vantaux = [-1, 1].map((cote) => {
    const pivot = new THREE.Group()
    const vantail = poser(pivot, boite(0.8, 2.0, 0.1, M.boisVerni()))
    vantail.position.set((cote * 0.8) / 2, 1.0, 0)
    // Panneaux moulurés : deux caissons par vantail.
    ;[0.6, 1.42].forEach((y) => {
      const caisson = poser(pivot, boite(0.56, 0.58, 0.04, M.pierreMoulure()), { ombre: false })
      caisson.position.set((cote * 0.8) / 2, y, 0.06)
      caisson.material.color.setHex(0x7a4a28)
    })
    const heurtoir = poser(pivot, fut(0.07, 0.05, M.laiton(), 10), { ombre: false })
    heurtoir.rotation.x = Math.PI / 2
    heurtoir.position.set((cote * 0.8) / 2, 1.2, 0.1)

    pivot.position.set(xPorte + cote * 0.8, 0, zFacade + 0.05)
    entree.add(pivot)
    return { pivot, cote }
  })

  // Marquise de verre et laiton au-dessus de la porte.
  const marquise = poser(entree, boite(2.7, 0.09, 0.85, M.laiton()))
  marquise.position.set(xPorte, 2.5, zFacade + 0.42)
  const verriere = poser(entree, boite(2.5, 0.04, 0.72, M.vitrage()), { ombre: false })
  verriere.position.set(xPorte, 2.56, zFacade + 0.42)
  ;[-1, 1].forEach((cote) => {
    const tirant = poser(entree, boite(0.04, 0.62, 0.04, M.laiton()), { ombre: false })
    tirant.rotation.x = -0.6
    tirant.position.set(xPorte + cote * 1.15, 2.76, zFacade + 0.24)
  })

  // Seuil et deux marches de pierre.
  ;[0, 1].forEach((i) => {
    const marche = poser(entree, boite(2.6 - i * 0.3, 0.1, 0.5 + i * 0.22, M.pierreMoulure()), {
      ombre: false,
    })
    marche.position.set(xPorte, 0.05 + (1 - i) * 0.1, zFacade + 0.24 + i * 0.22)
  })

  // Plaque de rue émaillée, et les deux lanternes de part et d'autre.
  ;[-1, 1].forEach((cote) => {
    const lanterne = poser(entree, boite(0.16, 0.3, 0.16, M.ferForge()))
    lanterne.position.set(xPorte + cote * 1.45, 2.0, zFacade + 0.14)
  })
  montant.add(entree)

  // Baies cintrées du socle, sur les autres travées.
  const baiesSocle = new THREE.Group()
  for (let i = 0; i < TRAVEES; i += 1) {
    if (i === TRAVEE_PORTE) continue
    const baie = fenetreFrancaise({ largeur: 1.06, hauteur: 1.5, cintree: true })
    baie.position.set(travee(i), 0.62, zFacade + 0.03)
    baiesSocle.add(baie)
  }
  montant.add(baiesSocle)

  /* --- Les étages : fenêtres, volets, balcons ----------------------------- */

  const menuiseries = new THREE.Group()
  const volets = new THREE.Group()
  const balcons = new THREE.Group()

  /** Étages à balcon filant : l'étage noble, et l'avant-dernier. */
  const filants = new Set([1, ETAGES - 1])

  for (let e = 1; e <= ETAGES; e += 1) {
    const y = hauteurEtage(e)
    // L'étage noble est plus haut que les courants, et les derniers se
    // resserrent : c'est la hiérarchie de la façade, et elle se voit.
    const hauteurBaie = e === 1 ? 1.34 : e >= ETAGES - 1 ? 1.06 : 1.2

    for (let i = 0; i < TRAVEES; i += 1) {
      const x = travee(i)
      const baie = fenetreFrancaise({ largeur: 0.86, hauteur: hauteurBaie })
      baie.position.set(x, y + 0.18, zFacade + 0.03)
      menuiseries.add(baie)

      // Persiennes repliées en tableau, de part et d'autre de chaque baie.
      ;[-1, 1].forEach((cote) => {
        const battant = poser(volets, boite(0.17, hauteurBaie - 0.06, 0.05, M.volet()), {
          ombre: false,
        })
        battant.position.set(x + cote * 0.53, y + 0.18 + (hauteurBaie - 0.06) / 2, zFacade + 0.07)
        // Les lames de la persienne.
        for (let l = 0; l < 7; l += 1) {
          const lame = poser(volets, boite(0.15, 0.02, 0.06, M.volet()), { ombre: false })
          lame.material.color.setHex(0x7b8a7a)
          lame.position.set(
            x + cote * 0.53,
            y + 0.24 + ((l + 0.5) * (hauteurBaie - 0.14)) / 7,
            zFacade + 0.1,
          )
        }
      })

      // Balconnet individuel, sauf aux étages à balcon filant.
      if (!filants.has(e)) {
        const balconnet = gardeCorpsFer({ largeur: 1.06, hauteur: 0.52, barreaux: 7 })
        balconnet.position.set(x, y + 0.14, zFacade + 0.2)
        balcons.add(balconnet)
      }
    }

    if (filants.has(e)) {
      const dalle = poser(balcons, boite(LARGEUR + 0.5, 0.13, 0.62, M.pierreMoulure()))
      dalle.position.set(0, y + 0.08, zFacade + 0.25)
      const garde = gardeCorpsFer({ largeur: LARGEUR + 0.5, hauteur: 0.56 })
      garde.position.set(0, y + 0.14, zFacade + 0.52)
      balcons.add(garde)
      // Consoles de pierre sous la dalle du balcon filant.
      for (let i = 0; i < TRAVEES + 1; i += 1) {
        const console_ = poser(balcons, boite(0.2, 0.3, 0.42, M.pierreMoulure()))
        console_.position.set(-LARGEUR / 2 + (i * LARGEUR) / TRAVEES, y - 0.1, zFacade + 0.2)
      }
    }
  }

  // Fenêtres des pignons : moins nombreuses, sans balcon — c'est ainsi qu'on
  // traite un retour de façade.
  ;[-1, 1].forEach((cote) => {
    for (let e = 1; e <= ETAGES; e += 1) {
      for (let i = 0; i < 3; i += 1) {
        const baie = fenetreFrancaise({ largeur: 0.8, hauteur: 1.1, appui: false })
        baie.rotation.y = cote * (Math.PI / 2)
        baie.position.set(
          cote * (LARGEUR / 2 + 0.03),
          hauteurEtage(e) + 0.2,
          (i - 1) * (PROFONDEUR / 3.4),
        )
        menuiseries.add(baie)
      }
    }
  })

  montant.add(menuiseries)
  montant.add(volets)
  montant.add(balcons)

  /* --- Couronnement : corniche, attique, comble --------------------------- */

  const couronnement = new THREE.Group()

  const corniche = poser(couronnement, boite(LARGEUR + 0.9, 0.3, PROFONDEUR + 0.9, M.pierreMoulure()))
  corniche.position.y = hauteurCorps + 0.15
  const larmier = poser(couronnement, boite(LARGEUR + 0.6, 0.16, PROFONDEUR + 0.6, M.pierreMoulure()))
  larmier.position.y = hauteurCorps - 0.06

  // Modillons : les petites consoles alignées sous la corniche. C'est ce
  // détail-là qu'on reconnaît d'une façade haussmannienne, même de loin.
  const modillons = 22
  for (let i = 0; i < modillons; i += 1) {
    const bloc = poser(couronnement, boite(0.16, 0.22, 0.3, M.pierreMoulure()), { ombre: false })
    bloc.position.set(
      -LARGEUR / 2 + ((i + 0.5) * LARGEUR) / modillons,
      hauteurCorps - 0.06,
      PROFONDEUR / 2 + 0.22,
    )
  }

  const retraitAttique = 0.95
  const hauteurAttique = 1.35
  const largeurAttique = LARGEUR - retraitAttique * 2
  const profondeurAttique = PROFONDEUR - retraitAttique * 2

  const attique = poser(
    couronnement,
    boite(largeurAttique, hauteurAttique, profondeurAttique, M.pierreTaille()),
  )
  attique.position.y = hauteurCorps + 0.3 + hauteurAttique / 2

  for (let i = 0; i < 3; i += 1) {
    const baie = fenetreFrancaise({ largeur: 0.8, hauteur: 0.92, appui: false })
    baie.position.set(
      (i - 1) * (largeurAttique / 3.2),
      hauteurCorps + 0.4,
      profondeurAttique / 2 + 0.03,
    )
    couronnement.add(baie)
  }

  // Terrasse plantée de l'attique : garde-corps et jardinières débordantes,
  // comme sur les derniers étages parisiens.
  const gardeAttique = gardeCorpsFer({ largeur: LARGEUR - 0.4, hauteur: 0.52 })
  gardeAttique.position.set(0, hauteurCorps + 0.3, PROFONDEUR / 2 - 0.3)
  couronnement.add(gardeAttique)
  for (let i = 0; i < 7; i += 1) {
    const jardiniere = poser(couronnement, boite(0.5, 0.22, 0.34, M.terreCuite()), { ombre: false })
    jardiniere.position.set(
      -LARGEUR / 2 + 0.6 + (i * (LARGEUR - 1.2)) / 6,
      hauteurCorps + 0.42,
      PROFONDEUR / 2 - 0.45,
    )
    const verdure = buisson(0.26)
    verdure.position.set(jardiniere.position.x, hauteurCorps + 0.5, PROFONDEUR / 2 - 0.45)
    couronnement.add(verdure)
  }

  // Comble mansardé : un tronc de pyramide de zinc, et son terrasson.
  const yComble = hauteurCorps + 0.3 + hauteurAttique
  const hauteurComble = 1.55
  const mansart = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 1, hauteurComble, 4, 1),
    M.zincToiture(),
  )
  mansart.rotation.y = Math.PI / 4
  mansart.scale.set(largeurAttique / Math.SQRT2, 1, profondeurAttique / Math.SQRT2)
  mansart.position.y = yComble + hauteurComble / 2
  poser(couronnement, mansart)

  const terrasson = poser(
    couronnement,
    boite(largeurAttique * 0.58, 0.1, profondeurAttique * 0.58, M.zincToiture()),
  )
  terrasson.position.y = yComble + hauteurComble

  for (let i = 0; i < 3; i += 1) {
    const oeil = lucarne({ largeur: 0.52, hauteur: 0.68 })
    oeil.position.set(
      (i - 1) * (largeurAttique / 3.4),
      yComble + 0.12,
      profondeurAttique * 0.34,
    )
    couronnement.add(oeil)
  }

  ;[-1, 1].forEach((cote) => {
    const fumisterie = souche({ largeur: 0.62, hauteur: 0.95, poteries: 4 })
    fumisterie.position.set(
      cote * largeurAttique * 0.3,
      yComble + hauteurComble - 0.05,
      -profondeurAttique * 0.12,
    )
    couronnement.add(fumisterie)
  })

  montant.add(couronnement)

  const hauteurTotale = yComble + hauteurComble + 1.3

  /* --- Abords : le trottoir, les arbres d'alignement ---------------------- */

  const abords = new THREE.Group()
  groupe.add(abords)

  // La rue file bien au-delà du bien : un trottoir qui s'arrêterait à
  // l'aplomb de l'immeuble ferait un décor de maquette, pas une adresse.
  const RUE = 74
  const trottoir = poser(abords, boite(RUE, 0.12, 4.6, M.dallage()), { ombre: false })
  trottoir.position.set(0, 0.06, zFacade + 2.3)
  const bordure = poser(abords, boite(RUE, 0.2, 0.3, M.betonSombre()), { ombre: false })
  bordure.position.set(0, 0.1, zFacade + 4.45)
  const chaussee = poser(abords, boite(RUE, 0.06, 9, M.gravier()), { ombre: false })
  chaussee.material.color.setHex(0x4a4a4e)
  chaussee.position.set(0, 0.03, zFacade + 9.1)
  // Bande axiale : deux traits suffisent à dire qu'on est sur une chaussée.
  for (let i = -7; i <= 7; i += 1) {
    const trait = poser(abords, boite(2.2, 0.02, 0.14, M.platre()), { ombre: false })
    trait.position.set(i * 4.6, 0.07, zFacade + 9.1)
  }

  ;[-1, 1].forEach((cote) => {
    const sujet = arbre(3.6)
    sujet.position.set(cote * (LARGEUR / 2 + 1.6), 0.12, zFacade + 3.1)
    abords.add(sujet)
    const grille = poser(abords, boite(1.1, 0.04, 1.1, M.ferForge()), { ombre: false })
    grille.position.set(cote * (LARGEUR / 2 + 1.6), 0.14, zFacade + 3.1)
  })

  // LES MITOYENS. Un haussmannien ne se tient jamais seul au milieu d'un
  // terrain : il est pris dans un alignement, mitoyen de ses voisins, et c'est
  // cet alignement qui fait la rue. Deux volumes de pierre suffisent — plus
  // bas, plus sourds, sans détail —, et l'immeuble cesse d'être une tour posée
  // sur une plaine pour devenir un numéro dans une rue.
  ;[-1, 1].forEach((cote) => {
    const hauteurVoisin = hauteurCorps * (cote < 0 ? 0.86 : 0.78)
    const largeurVoisin = LARGEUR * (cote < 0 ? 0.92 : 1.05)
    const voisin = poser(
      abords,
      boite(largeurVoisin, hauteurVoisin, PROFONDEUR * 0.92, M.pierreTaille()),
    )
    voisin.material.color.setHex(cote < 0 ? 0xe7dfcd : 0xdfd6c2)
    voisin.position.set(
      cote * (LARGEUR / 2 + largeurVoisin / 2),
      hauteurVoisin / 2,
      -0.15,
    )

    const toitVoisin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 1, 1.25, 4, 1),
      M.zincToiture(),
    )
    toitVoisin.rotation.y = Math.PI / 4
    toitVoisin.scale.set(largeurVoisin / Math.SQRT2, 1, (PROFONDEUR * 0.92) / Math.SQRT2)
    toitVoisin.position.set(voisin.position.x, hauteurVoisin + 0.62, -0.15)
    poser(abords, toitVoisin)

    // Des percements, pas des fenêtres : à cette distance, une trame de
    // rectangles sombres suffit à dire « façade », et trois cents menuiseries
    // de plus coûteraient cher pour rien.
    const etagesVoisin = Math.floor((hauteurVoisin - HAUTEUR_SOCLE) / HAUTEUR_ETAGE)
    for (let e = 0; e < etagesVoisin; e += 1) {
      for (let i = 0; i < 4; i += 1) {
        const percement = poser(abords, boite(0.5, 1.05, 0.06, M.platreOmbre()), { ombre: false })
        percement.material.color.setHex(0x6d6a5e)
        percement.position.set(
          voisin.position.x + (i - 1.5) * (largeurVoisin / 4.3),
          HAUTEUR_SOCLE + e * HAUTEUR_ETAGE + 0.75,
          PROFONDEUR * 0.46 + 0.03,
        )
      }
    }
  })

  /* --- Options d'affinage -------------------------------------------------- */

  // Le balcon de l'étage déclaré. Il n'existe qu'à l'affinage : pendant
  // l'analyse, l'étage du vendeur ne porte rien de particulier — on ne lui
  // montre pas un balcon qu'il n'a pas dit avoir.
  const balconEtage = new THREE.Group()
  const dalleBalcon = poser(balconEtage, boite(2.5, 0.14, 1.35, M.pierreMoulure()))
  dalleBalcon.position.set(0, 0.07, 0.6)
  const gardeBalcon = gardeCorpsFer({ largeur: 2.5, hauteur: 0.6 })
  gardeBalcon.position.set(0, 0.14, 1.25)
  balconEtage.add(gardeBalcon)
  ;[-1, 1].forEach((cote) => {
    const joue = gardeCorpsFer({ largeur: 1.35, hauteur: 0.6 })
    joue.rotation.y = Math.PI / 2
    joue.position.set(cote * 1.25, 0.14, 0.6)
    balconEtage.add(joue)
  })
  ;[-1, 1].forEach((cote) => {
    const console_ = poser(balconEtage, boite(0.22, 0.38, 0.5, M.pierreMoulure()))
    console_.position.set(cote * 0.9, -0.2, 0.35)
  })
  // Le mobilier du balcon : deux fauteuils et un guéridon.
  ;[-0.55, 0.55].forEach((x) => {
    const fauteuil = poser(balconEtage, boite(0.38, 0.3, 0.38, M.tissuClair()))
    fauteuil.position.set(x, 0.28, 0.55)
  })
  const gueridon = poser(balconEtage, boite(0.34, 0.06, 0.34, M.aluNoir()))
  gueridon.position.set(0, 0.42, 0.95)
  const oranger = buisson(0.3)
  oranger.position.set(-1.0, 0.16, 1.0)
  balconEtage.add(oranger)
  groupe.add(balconEtage)

  // Panneaux solaires : posés sur le terrasson, la seule surface plate du toit.
  const panneaux = new THREE.Group()
  for (let rangee = 0; rangee < 2; rangee += 1) {
    for (let i = 0; i < 3; i += 1) {
      const module = poser(panneaux, boite(0.95, 0.06, 0.7, M.panneauSolaire()))
      module.position.set(-1 + i * 1.05, 0.08, -0.45 + rangee * 0.85)
      module.rotation.x = 0.22
    }
  }
  panneaux.position.set(0, yComble + hauteurComble + 0.05, 0)
  groupe.add(panneaux)

  // Le standing : store de pierre au socle, appliques, tapis rouge du seuil,
  // bacs d'orangerie de part et d'autre de la porte cochère.
  const standing = new THREE.Group()
  const tapisSeuil = poser(standing, boite(2.2, 0.03, 1.5, M.tapisEscalier()), { ombre: false })
  tapisSeuil.position.set(xPorte, 0.13, zFacade + 0.95)
  ;[-1, 1].forEach((cote) => {
    const bac = poser(standing, boite(0.55, 0.5, 0.55, M.pierreMoulure()))
    bac.position.set(xPorte + cote * 1.75, 0.25, zFacade + 0.55)
    const sujet = buisson(0.36)
    sujet.position.set(xPorte + cote * 1.75, 0.56, zFacade + 0.55)
    standing.add(sujet)
  })
  for (let i = 0; i < 4; i += 1) {
    const applique = poser(standing, boite(0.14, 0.34, 0.2, M.laiton()), { ombre: false })
    applique.position.set(travee(i === 0 ? 0 : i + 1), 1.62, zFacade + 0.12)
  }
  // Auvent de toile sur les baies du socle : la devanture soignée du bas.
  const auvent = poser(standing, boite(LARGEUR * 0.62, 0.08, 1.1, M.tissuBleu()))
  auvent.position.set(LARGEUR * 0.18, 1.85, zFacade + 0.6)
  auvent.rotation.x = -0.16
  groupe.add(standing)

  /* --- Révélations et pilotage --------------------------------------------- */

  const revelerEntree = revelable(entree)
  const revelerSocle = revelable(baiesSocle)
  const revelerMenuiseries = revelable(menuiseries)
  const revelerVolets = revelable(volets)
  const revelerBalcons = revelable(balcons)
  const revelerCouronnement = revelable(couronnement)
  const revelerAbords = revelable(abords)
  const revelerBalconEtage = revelable(balconEtage)
  const revelerPanneaux = revelable(panneaux)
  const revelerStanding = revelable(standing)

  const vitres = []
  groupe.traverse((objet) => {
    if (objet.isMesh && objet.material?.name === 'vitrage') vitres.push(objet.material)
  })

  return {
    groupe,
    montant,
    hauteurCoupe: hauteurTotale,
    envergure: { largeur: Math.max(LARGEUR + 3.2, PROFONDEUR + 3), hauteur: hauteurTotale },

    ancrages: {
      porte: new THREE.Vector3(xPorte, 1.15, zFacade),
      toit: new THREE.Vector3(0, hauteurTotale, 0),
      hauteur: hauteurTotale,
      /** Où se trouve la fenêtre par laquelle on ressort, à l'étage déclaré. */
      fenetre: (etage) =>
        new THREE.Vector3(travee(TRAVEE_LOGEMENT), hauteurEtage(etage) + 0.85, zFacade + 0.2),
    },

    /** Place le balcon d'affinage à l'étage déclaré. */
    placerBalcon(etage) {
      balconEtage.position.set(travee(TRAVEE_LOGEMENT), hauteurEtage(etage) + 0.14, zFacade)
    },

    /** Ouvre les deux vantaux de la porte cochère, vers l'intérieur. */
    ouvrirPorte(valeur) {
      vantaux.forEach(({ pivot, cote }) => {
        pivot.rotation.y = -cote * valeur * 1.35
      })
    },

    poser(v) {
      revelerEntree(v.entree)
      revelerSocle(Math.max(v.entree, v.menuiserie))
      revelerMenuiseries(v.menuiserie)
      revelerVolets(v.menuiserie)
      revelerBalcons(v.menuiserie)
      revelerCouronnement(v.couronnement)
      revelerAbords(v.abords)
      revelerBalconEtage(v.balcon)
      revelerPanneaux(v.panneaux)
      revelerStanding(v.standing)

      vitres.forEach((matiere) => {
        matiere.emissive.setHex(0xf6c978)
        matiere.emissiveIntensity = v.lumiere * 1.2
      })
    },
  }
}
