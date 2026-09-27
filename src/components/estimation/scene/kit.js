import * as THREE from 'three'
import * as M from './matieres'

/**
 * LE KIT DE CONSTRUCTION.
 *
 * Les pièces que la villa, l'immeuble et l'appartement se partagent : un mur
 * percé de ses ouvertures, une baie et ses meneaux, un garde-corps de fer
 * forgé, une pergola, un arbre. Chacune rend un maillage ou un groupe déjà
 * réglé — ombres comprises —, que l'appelant n'a plus qu'à poser.
 *
 * Rien ici ne connaît le parcours d'estimation : ce sont des pièces
 * détachées, et c'est ce qui permet de composer une petite maison et une
 * propriété avec le même vocabulaire.
 */

/** Pose un maillage dans un groupe, ombres réglées. */
export function poser(parent, mesh, { ombre = true, recoit = true } = {}) {
  mesh.castShadow = ombre
  mesh.receiveShadow = recoit
  parent.add(mesh)
  return mesh
}

/** Boîte élémentaire, dimensions en unités de scène. */
export function boite(largeur, hauteur, profondeur, matiere) {
  return new THREE.Mesh(new THREE.BoxGeometry(largeur, hauteur, profondeur), matiere)
}

/** Cylindre vertical — poteau, colonne, souche. */
export function fut(rayon, hauteur, matiere, faces = 16) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rayon, rayon, hauteur, faces), matiere)
}

/**
 * MUR PERCÉ — un panneau plein dans lequel on découpe des ouvertures.
 *
 * C'est la pièce qui distingue une maison d'un bloc : derrière un mur, il y a
 * du vide, et ce vide se voit par la porte et par les fenêtres. Un
 * `BoxGeometry` ne sait pas faire ça ; une forme extrudée avec ses trous, si.
 *
 * Repère local : x de −largeur/2 à +largeur/2, y de 0 (sol) à `hauteur`, et
 * l'épaisseur s'étend vers +z. Les ouvertures sont données en coordonnées de
 * ce repère : `{ x, y, largeur, hauteur }`, `x` étant le centre horizontal et
 * `y` l'allège (le bas de l'ouverture).
 */
export function murPerce({ largeur, hauteur, epaisseur = 0.16, ouvertures = [] }, matiere) {
  const forme = new THREE.Shape()
  forme.moveTo(-largeur / 2, 0)
  forme.lineTo(largeur / 2, 0)
  forme.lineTo(largeur / 2, hauteur)
  forme.lineTo(-largeur / 2, hauteur)
  forme.closePath()

  ouvertures.forEach((o) => {
    const trou = new THREE.Path()
    const x0 = o.x - o.largeur / 2
    const x1 = o.x + o.largeur / 2
    trou.moveTo(x0, o.y)
    trou.lineTo(x1, o.y)
    trou.lineTo(x1, o.y + o.hauteur)
    trou.lineTo(x0, o.y + o.hauteur)
    trou.closePath()
    forme.holes.push(trou)
  })

  const geometrie = new THREE.ExtrudeGeometry(forme, {
    depth: epaisseur,
    bevelEnabled: false,
    curveSegments: 1,
  })

  return new THREE.Mesh(geometrie, matiere)
}

/**
 * BAIE VITRÉE et ses meneaux. Une baie sans meneaux se lit comme un trou noir
 * dans la façade ; avec eux, comme une verrière.
 *
 * Le groupe est centré en x, posé en y = 0, plan dans le plan XY.
 */
export function baieVitree({
  largeur,
  hauteur,
  meneaux = 3,
  traverse = false,
  sombre = false,
  circulation = false,
}) {
  const groupe = new THREE.Group()
  // Trois verres, et trois emplois : le mur-rideau sombre d'un séjour, la
  // fenêtre ordinaire d'une chambre, et le vitrage très clair d'une cage
  // d'escalier — le seul qu'on doive traverser des yeux (voir `matieres.js`).
  const verre = circulation ? M.verreCirculation() : sombre ? M.murVitre() : M.vitrage()

  const vitre = poser(groupe, boite(largeur, hauteur, 0.05, verre), { ombre: false })
  vitre.position.y = hauteur / 2
  groupe.userData.vitre = vitre

  const cadre = M.aluNoir()
  const epais = 0.055

  // Dormant : quatre montants qui ceinturent la baie.
  const haut = poser(groupe, boite(largeur + epais, epais, 0.09, cadre), { ombre: false })
  haut.position.y = hauteur
  const bas = poser(groupe, boite(largeur + epais, epais, 0.09, cadre), { ombre: false })
  bas.position.y = 0
  ;[-1, 1].forEach((cote) => {
    const montant = poser(groupe, boite(epais, hauteur + epais, 0.09, cadre), { ombre: false })
    montant.position.set((cote * largeur) / 2, hauteur / 2, 0)
  })

  for (let i = 1; i < meneaux; i += 1) {
    const meneau = poser(groupe, boite(epais * 0.75, hauteur, 0.085, cadre), { ombre: false })
    meneau.position.set(-largeur / 2 + (i * largeur) / meneaux, hauteur / 2, 0)
  }

  if (traverse) {
    const barre = poser(groupe, boite(largeur, epais * 0.75, 0.085, cadre), { ombre: false })
    barre.position.y = hauteur * 0.62
  }

  return groupe
}

/**
 * FENÊTRE À LA FRANÇAISE — deux vantaux, un petit bois, un appui de pierre.
 *
 * C'est la fenêtre de l'immeuble haussmannien : haute, étroite, à deux
 * ouvrants, et toujours munie de son appui saillant.
 */
export function fenetreFrancaise({ largeur, hauteur, appui = true, cintree = false }) {
  const groupe = new THREE.Group()

  // Tableau : le fond sombre de l'embrasure, qui donne sa profondeur au percement.
  const tableau = poser(groupe, boite(largeur, hauteur, 0.06, M.platreOmbre()), { ombre: false })
  tableau.position.set(0, hauteur / 2, -0.06)

  const vitre = poser(groupe, boite(largeur - 0.07, hauteur - 0.07, 0.04, M.vitrage()), {
    ombre: false,
  })
  vitre.position.y = hauteur / 2
  groupe.userData.vitre = vitre
  // Le fond de l'embrasure est rendu accessible pour la même raison que la
  // vitre : quand un étage s'allume, c'est la pièce derrière la fenêtre qui
  // s'éclaire, et un tableau resté noir trahirait la lumière posée sur le verre.
  groupe.userData.tableau = tableau

  const bois = M.aluNoir()
  const e = 0.045
  const montantCentral = poser(groupe, boite(e, hauteur, 0.06, bois), { ombre: false })
  montantCentral.position.y = hauteur / 2
  ;[-1, 1].forEach((cote) => {
    const montant = poser(groupe, boite(e, hauteur, 0.06, bois), { ombre: false })
    montant.position.set((cote * (largeur - e)) / 2, hauteur / 2, 0)
  })
  // Traverse d'imposte, aux deux tiers : c'est elle qui donne l'échelle.
  const imposte = poser(groupe, boite(largeur, e, 0.06, bois), { ombre: false })
  imposte.position.y = hauteur * 0.66

  if (cintree) {
    // Arc de décharge en pierre, pour les baies du rez-de-chaussée.
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(largeur / 2, 0.07, 6, 16, Math.PI),
      M.pierreMoulure(),
    )
    arc.position.y = hauteur
    poser(groupe, arc)
  }

  if (appui) {
    const pierre = poser(groupe, boite(largeur + 0.26, 0.09, 0.22, M.pierreMoulure()))
    pierre.position.set(0, -0.045, 0.06)
  }

  return groupe
}

/**
 * GARDE-CORPS DE FER FORGÉ — main courante, lisse basse, barreaux, et le
 * renflement en panse au milieu de la hauteur qui signe les balcons parisiens.
 */
export function gardeCorpsFer({ largeur, hauteur = 0.55, barreaux = null }) {
  const groupe = new THREE.Group()
  const fer = M.ferForge()
  const nombre = barreaux ?? Math.max(4, Math.round(largeur / 0.11))

  const main = poser(groupe, boite(largeur, 0.05, 0.07, fer), { ombre: false })
  main.position.y = hauteur
  const lisse = poser(groupe, boite(largeur, 0.035, 0.05, fer), { ombre: false })
  lisse.position.y = hauteur * 0.52
  const pied = poser(groupe, boite(largeur, 0.035, 0.05, fer), { ombre: false })
  pied.position.y = 0.04

  for (let i = 0; i <= nombre; i += 1) {
    const x = -largeur / 2 + (i * largeur) / nombre
    const barreau = poser(groupe, boite(0.022, hauteur, 0.022, fer), { ombre: false })
    barreau.position.set(x, hauteur / 2, 0)
  }

  return groupe
}

/** Garde-corps de verre : une lame sur deux pinces, pour la villa. */
export function gardeCorpsVerre({ largeur, hauteur = 0.58 }) {
  const groupe = new THREE.Group()
  const lame = poser(groupe, boite(largeur, hauteur, 0.02, M.verreVoile()), { ombre: false })
  lame.position.y = hauteur / 2
  const main = poser(groupe, boite(largeur + 0.04, 0.045, 0.06, M.aluNoir()), { ombre: false })
  main.position.y = hauteur
  return groupe
}

/**
 * PERGOLA BIOCLIMATIQUE — le grand geste des villas contemporaines : une
 * structure d'aluminium noir posée sur deux poteaux, à lames parallèles.
 */
export function pergola({ largeur, profondeur, hauteur }) {
  const groupe = new THREE.Group()
  const metal = M.aluNoir()

  const cadreAvant = poser(groupe, boite(largeur, 0.14, 0.1, metal))
  cadreAvant.position.set(0, hauteur, profondeur / 2)
  const cadreArriere = poser(groupe, boite(largeur, 0.14, 0.1, metal))
  cadreArriere.position.set(0, hauteur, -profondeur / 2)
  ;[-1, 1].forEach((cote) => {
    const cote_ = poser(groupe, boite(0.1, 0.14, profondeur, metal))
    cote_.position.set((cote * largeur) / 2, hauteur, 0)
    const poteau = poser(groupe, boite(0.11, hauteur, 0.11, metal))
    poteau.position.set((cote * largeur) / 2, hauteur / 2, profondeur / 2)
  })

  const lames = Math.max(5, Math.round(profondeur / 0.34))
  for (let i = 0; i < lames; i += 1) {
    const lame = poser(groupe, boite(largeur - 0.1, 0.05, 0.2, metal), { ombre: true })
    lame.position.set(0, hauteur - 0.02, -profondeur / 2 + ((i + 0.5) * profondeur) / lames)
    lame.rotation.x = 0.35
  }

  return groupe
}

/** Souche de cheminée en terre cuite, coiffée de ses poteries. */
export function souche({ largeur = 0.5, hauteur = 1.1, poteries = 3 }) {
  const groupe = new THREE.Group()
  const corps = poser(groupe, boite(largeur, hauteur, largeur * 0.62, M.pierreMoulure()))
  corps.position.y = hauteur / 2
  for (let i = 0; i < poteries; i += 1) {
    const pot = poser(groupe, fut(0.07, 0.26, M.terreCuite(), 10))
    pot.position.set(-largeur / 2 + ((i + 0.5) * largeur) / poteries, hauteur + 0.13, 0)
  }
  return groupe
}

/**
 * LUCARNE de toit mansardé : une petite fenêtre coiffée de son fronton de
 * zinc. Sans elles, un mansart n'est qu'un tronc de pyramide.
 */
export function lucarne({ largeur = 0.54, hauteur = 0.72 }) {
  const groupe = new THREE.Group()
  const joue = poser(groupe, boite(largeur, hauteur, 0.4, M.zincToiture()))
  joue.position.y = hauteur / 2
  const vitre = poser(groupe, boite(largeur - 0.12, hauteur - 0.16, 0.05, M.vitrage()), {
    ombre: false,
  })
  vitre.position.set(0, hauteur / 2, 0.21)
  groupe.userData.vitre = vitre

  const chapeau = new THREE.Mesh(
    new THREE.CylinderGeometry(largeur * 0.58, largeur * 0.58, 0.42, 10, 1, false, 0, Math.PI),
    M.zincToiture(),
  )
  chapeau.rotation.z = Math.PI / 2
  chapeau.rotation.y = Math.PI / 2
  chapeau.position.y = hauteur
  poser(groupe, chapeau)

  return groupe
}

/* -------------------------------------------------------------------------- */
/*  Végétation                                                                */
/* -------------------------------------------------------------------------- */

/**
 * L'ARBRE — et pourquoi ce n'est plus un caillou vert.
 *
 * Un arbre était un cylindre surmonté de deux icosaèdres. Vu de loin ça passe ;
 * vu à la distance où le drone se tient, c'est une pierre posée sur un tuyau,
 * et c'est le détail qui trahissait le plus la scène — davantage que les murs,
 * parce qu'on sait tous à quoi ressemble un arbre.
 *
 * Ce qui manque à une sphère pour faire un houppier, ce n'est pas de la
 * définition : c'est du VIDE. Un feuillage est poreux, on voit le ciel au
 * travers, sa silhouette est dentelée et la lumière y entre par les trous. Une
 * sphère, si finement subdivisée soit-elle, reste une masse pleine.
 *
 * D'où ces PLANS CROISÉS, habillés d'une touffe de feuilles à découpe (voir
 * `houppier` dans `matieres.js`). Trois plans inclinés les uns par rapport aux
 * autres donnent un volume qui se tient sous tous les angles du parcours — la
 * caméra ne fait plus le tour du bien (voir `plans.js`), on n'a donc jamais à
 * défendre l'arbre de dos. Douze triangles par sujet, contre une centaine pour
 * l'icosaèdre qu'ils remplacent : c'est même une économie.
 *
 * Le tronc garde sa géométrie — un tronc EST un volume plein — mais gagne son
 * écorce et le léger dévers qui fait qu'aucun arbre ne pousse à l'équerre.
 */
export function arbre(hauteur = 2.6, { variante = null } = {}) {
  const groupe = new THREE.Group()
  const espece = variante ?? (Math.random() < 0.5 ? 0 : 1)

  const bois = poser(groupe, fut(hauteur * 0.045, hauteur * 0.55, M.tronc(), 7))
  bois.position.y = hauteur * 0.275
  bois.rotation.z = (Math.random() - 0.5) * 0.06

  // Deux charpentières : ce qui fait qu'on lit un arbre et non un poteau.
  ;[-1, 1].forEach((cote) => {
    const branche = poser(groupe, fut(hauteur * 0.022, hauteur * 0.3, M.tronc(), 5))
    branche.position.set(cote * hauteur * 0.05, hauteur * 0.5, 0)
    branche.rotation.z = -cote * 0.5
  })

  // LES PLANS DU HOUPPIER. Trois, tournés d'un tiers de tour chacun, et
  // légèrement basculés : trois plans strictement verticaux se verraient comme
  // trois cartes plantées dans le sol dès que la caméra prend de la hauteur.
  const houppier = M.houppier(espece)
  const envergure = hauteur * 0.78
  for (let i = 0; i < 3; i += 1) {
    const plan = new THREE.Mesh(new THREE.PlaneGeometry(envergure, envergure), houppier)
    plan.position.y = hauteur * 0.74
    plan.rotation.y = (i * Math.PI) / 3 + Math.random() * 0.3
    plan.rotation.x = -0.22 + i * 0.16
    plan.castShadow = true
    plan.receiveShadow = false
    groupe.add(plan)
  }

  // Un quatrième plan, couché : vu de dessus — et le drone est en plongée —,
  // trois plans verticaux ne montrent que leurs tranches.
  const couronne = new THREE.Mesh(new THREE.PlaneGeometry(envergure * 0.9, envergure * 0.9), houppier)
  couronne.rotation.x = -Math.PI / 2
  couronne.position.y = hauteur * 0.86
  couronne.castShadow = true
  groupe.add(couronne)

  return groupe
}

/**
 * BUISSON — la même idée, en plus bas et en plus dense.
 *
 * Un massif taillé garde une masse : on lui laisse donc son volume, mais
 * habillé de feuilles découpées plutôt que d'un vert uni, et coiffé de deux
 * plans qui lui cassent sa silhouette de galet.
 */
export function buisson(rayon = 0.34) {
  const groupe = new THREE.Group()
  const feuilles = M.houppier(0)

  const masse = new THREE.Mesh(new THREE.IcosahedronGeometry(rayon * 0.82, 0), M.feuillage())
  masse.scale.set(1, 0.7, 1)
  masse.position.y = rayon * 0.6
  masse.castShadow = true
  masse.receiveShadow = true
  groupe.add(masse)

  for (let i = 0; i < 2; i += 1) {
    const plan = new THREE.Mesh(new THREE.PlaneGeometry(rayon * 2.4, rayon * 1.9), feuilles)
    plan.position.y = rayon * 0.72
    plan.rotation.y = i * (Math.PI / 2) + 0.4
    plan.rotation.x = -0.3
    plan.castShadow = true
    groupe.add(plan)
  }

  return groupe
}

/** Graminée : la touffe claire des massifs contemporains. */
export function graminee(hauteur = 0.5) {
  const groupe = new THREE.Group()
  for (let i = 0; i < 7; i += 1) {
    const brin = new THREE.Mesh(
      new THREE.ConeGeometry(0.035, hauteur * (0.7 + Math.random() * 0.6), 4),
      M.feuillageClair(),
    )
    const angle = (i / 7) * Math.PI * 2
    brin.position.set(Math.cos(angle) * 0.07, hauteur * 0.42, Math.sin(angle) * 0.07)
    brin.rotation.z = Math.cos(angle) * 0.34
    brin.rotation.x = -Math.sin(angle) * 0.34
    brin.castShadow = true
    groupe.add(brin)
  }
  return groupe
}

/* -------------------------------------------------------------------------- */
/*  Les finitions — ce qui distingue un bâtiment d'une boîte                   */
/* -------------------------------------------------------------------------- */

/**
 * GOUTTIÈRE et sa descente. Personne ne regarde une gouttière ; tout le monde
 * voit son absence. Un volume couvert d'où l'eau ne part nulle part se lit
 * comme une maquette, et c'est trois cylindres.
 */
export function gouttiere({ longueur, hauteur, descente = true }) {
  const groupe = new THREE.Group()
  const zinc = M.zincToiture()

  const chenal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, longueur, 8, 1, false, 0, Math.PI),
    zinc,
  )
  chenal.rotation.z = Math.PI / 2
  chenal.rotation.y = Math.PI
  poser(groupe, chenal, { ombre: false })

  if (descente) {
    const tube = poser(groupe, fut(0.048, hauteur, zinc, 7), { ombre: false })
    tube.position.set(longueur / 2 - 0.12, -hauteur / 2 - 0.04, 0)
    // Les deux colliers de fixation : sans eux, la descente flotte le long du mur.
    ;[0.3, 0.75].forEach((part) => {
      const collier = poser(groupe, boite(0.1, 0.035, 0.09, zinc), { ombre: false })
      collier.position.set(longueur / 2 - 0.12, -hauteur * part, 0)
    })
  }

  return groupe
}

/**
 * APPUI DE FENÊTRE — la pierre saillante sous une baie, avec son larmier.
 *
 * Le larmier est la gorge creusée sous le nez de l'appui : c'est elle qui
 * empêche l'eau de revenir sur la façade, et c'est la ligne d'ombre qui fait
 * qu'un appui se voit. Un appui sans larmier est une planche.
 */
export function appui({ largeur, saillie = 0.16, matiere = null }) {
  const groupe = new THREE.Group()
  const pierre = matiere ?? M.pierreMoulure()
  const tablette = poser(groupe, boite(largeur, 0.07, saillie, pierre))
  tablette.position.z = saillie / 2
  const larmierPiece = poser(groupe, boite(largeur, 0.03, 0.035, M.betonSombre()), { ombre: false })
  larmierPiece.position.set(0, -0.045, saillie - 0.03)
  return groupe
}

/**
 * ENCADREMENT — le tableau rapporté autour d'une baie.
 *
 * C'est la pièce qui manquait le plus aux façades : une ouverture percée à même
 * un mur plat n'a pas d'épaisseur, et une façade sans épaisseur est un décalque.
 * Quatre plates-bandes en saillie de trois centimètres suffisent à ce que la
 * lumière rasante y accroche.
 */
export function encadrement({ largeur, hauteur, epaisseur = 0.09, saillie = 0.05, matiere = null }) {
  const groupe = new THREE.Group()
  const pierre = matiere ?? M.pierreMoulure()

  const haut = poser(groupe, boite(largeur + epaisseur * 2, epaisseur, saillie, pierre), {
    ombre: false,
  })
  haut.position.set(0, hauteur + epaisseur / 2, saillie / 2)
  const bas = poser(groupe, boite(largeur + epaisseur * 2, epaisseur, saillie, pierre), {
    ombre: false,
  })
  bas.position.set(0, -epaisseur / 2, saillie / 2)
  ;[-1, 1].forEach((cote) => {
    const jambage = poser(groupe, boite(epaisseur, hauteur, saillie, pierre), { ombre: false })
    jambage.position.set((cote * (largeur + epaisseur)) / 2, hauteur / 2, saillie / 2)
  })

  return groupe
}

/**
 * TRANSAT — le bain de soleil des rooftops et des plages de piscine.
 * Assise, dossier relevé, piétement : trois pièces, et on sait à quoi sert la
 * terrasse sur laquelle il est posé.
 */
export function transat({ echelle = 1 } = {}) {
  const groupe = new THREE.Group()
  const toile = M.tissuClair()

  const assise = poser(groupe, boite(0.5 * echelle, 0.08 * echelle, 1.2 * echelle, toile))
  assise.position.y = 0.26 * echelle
  const dossier = poser(groupe, boite(0.5 * echelle, 0.08 * echelle, 0.56 * echelle, toile))
  dossier.position.set(0, 0.42 * echelle, -0.48 * echelle)
  dossier.rotation.x = -0.66
  const coussin = poser(groupe, boite(0.34 * echelle, 0.07 * echelle, 0.22 * echelle, M.tissuBleu()), {
    ombre: false,
  })
  coussin.position.set(0, 0.55 * echelle, -0.58 * echelle)
  coussin.rotation.x = -0.66
  ;[-1, 1].forEach((sz) => {
    const pied = poser(groupe, fut(0.025 * echelle, 0.22 * echelle, M.aluNoir(), 6), { ombre: false })
    pied.position.set(0, 0.12 * echelle, sz * 0.46 * echelle)
  })

  return groupe
}

/**
 * JACUZZI — la cuve encastrée d'un rooftop aménagé.
 *
 * Il porte la même eau que la piscine, et c'est voulu : c'est la seule matière
 * du décor qui bouge d'elle-même, et deux eaux différentes sur le même bien se
 * verraient. La cuve est habillée de bois — c'est ainsi que se pose un spa en
 * toiture, jamais à même la dalle — et le remous est dit par les trois buses
 * claires posées au fond.
 */
export function jacuzzi({ largeur = 1.9, profondeur = 1.6, hauteur = 0.62 } = {}) {
  const groupe = new THREE.Group()

  const habillage = poser(groupe, boite(largeur, hauteur, profondeur, M.boisBardage()))
  habillage.position.y = hauteur / 2
  const couronne = poser(groupe, boite(largeur + 0.12, 0.09, profondeur + 0.12, M.boisClair()))
  couronne.position.y = hauteur
  const fond = poser(groupe, boite(largeur - 0.3, 0.06, profondeur - 0.3, M.carrelageBassin()), {
    ombre: false,
  })
  fond.position.y = hauteur - 0.34

  const bain = poser(groupe, boite(largeur - 0.28, 0.26, profondeur - 0.28, M.eauPiscine()), {
    ombre: false,
  })
  bain.position.y = hauteur - 0.16
  groupe.userData.eau = bain.material

  for (let i = 0; i < 3; i += 1) {
    const remous = poser(groupe, fut(0.07, 0.03, M.margelle(), 8), { ombre: false })
    remous.position.set(-0.4 + i * 0.4, hauteur - 0.03, 0)
  }

  return groupe
}

/* -------------------------------------------------------------------------- */
/*  Pilotage de l'opacité                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Rend TOUT un sous-arbre pilotable en opacité, et retourne la fonction qui
 * le fait paraître ou disparaître d'un bloc.
 *
 * C'est ainsi que les ouvrages arrivent : le jardin, la piscine, les panneaux
 * solaires ne sont pas ajoutés puis retirés de la scène — ils sont là depuis
 * le début et se révèlent. Une géométrie créée à la volée pendant l'animation
 * ferait tomber une image ; une opacité qui monte, jamais.
 */
export function revelable(groupe) {
  const matieres = []
  groupe.traverse((objet) => {
    if (!objet.isMesh) return
    const liste = Array.isArray(objet.material) ? objet.material : [objet.material]
    liste.forEach((matiere) => {
      if (!matiere) return
      matiere.transparent = true
      matieres.push({ matiere, pleine: matiere.opacity })
    })
  })

  groupe.visible = false

  return (valeur) => {
    const v = Math.max(0, Math.min(1, valeur))
    groupe.visible = v > 0.01
    matieres.forEach(({ matiere, pleine }) => {
      matiere.opacity = pleine * v
      // Une fois l'ouvrage entièrement révélé, il redevient opaque pour de
      // bon : une matière laissée transparente est triée à chaque image avec
      // les autres transparences, et une piscine finit par passer devant la
      // maison. Les matières nativement translucides — le verre, l'eau —
      // gardent la leur, elles n'atteignent jamais 1.
      matiere.transparent = pleine < 1 || v < 0.999
    })
  }
}

/**
 * LA DISLOCATION — un ouvrage qui se démonte, pièce par pièce.
 *
 * Retourne la fonction qui écarte tout un sous-arbre de son assemblage : à 0
 * chaque pièce est à sa place, à 1 elles ont toutes pris le large, tourné sur
 * elles-mêmes et disparu. C'est le pendant de [`revelable`](#revelable) — l'une
 * fait paraître un ouvrage entier, l'autre le défait planche par planche.
 *
 * TROIS CHOSES FONT QU'ON Y VOIT UN DÉMONTAGE et non une explosion :
 *
 *   • CHAQUE PIÈCE PART DE SON PROPRE CÔTÉ, écartée de l'axe du bâtiment —
 *     une planche de bardage s'en va vers l'extérieur, pas vers le ciel. La
 *     direction est tirée une fois pour toutes à la création, jamais à chaque
 *     image : une pièce qui changerait de trajectoire en cours de route ne se
 *     lirait plus comme un morceau du même ouvrage.
 *   • LE HAUT PART LE PREMIER. Le retard de chaque pièce suit sa hauteur : la
 *     couverture et les murs hauts s'écartent d'abord, la dalle en dernier.
 *     C'est l'ordre d'un démontage réel, et pris à l'envers c'est celui d'un
 *     montage — la même fonction sert donc aux deux sens.
 *   • ELLES TOURNENT PEU. Un quart de tour au plus : au-delà, une planche
 *     cesse d'être une planche pour devenir un débris.
 *
 * `hauteur` est la hauteur de référence du décalage — celle de l'ouvrage. En
 * son absence, elle est relevée sur la boîte englobante du groupe.
 */
export function disloquant(groupe, { hauteur = null, envol = 1 } = {}) {
  const enveloppe = new THREE.Box3().setFromObject(groupe)
  const haut = hauteur ?? Math.max(0.5, enveloppe.max.y - enveloppe.min.y)

  const pieces = []
  groupe.traverse((objet) => {
    if (!objet.isMesh) return

    // L'écart se prend sur la position LOCALE de la pièce, complétée d'un tirage
    // stable : une pièce centrée sur l'axe — un faîtage, une porte — n'aurait
    // sans cela aucune direction où aller et resterait seule en place.
    const direction = new THREE.Vector3(
      objet.position.x + (Math.random() - 0.5) * 1.4,
      0,
      objet.position.z + (Math.random() - 0.5) * 1.4,
    )
    if (direction.lengthSq() < 1e-4) direction.set(1, 0, 0)
    direction.normalize()

    const liste = Array.isArray(objet.material) ? objet.material : [objet.material]
    liste.forEach((matiere) => {
      if (matiere) matiere.transparent = true
    })

    pieces.push({
      objet,
      origine: objet.position.clone(),
      rotation: objet.rotation.clone(),
      // L'écart lui-même : franc sur les côtés, plus discret vers le ciel.
      ecart: direction.multiplyScalar((1.6 + Math.random() * 2.2) * envol),
      levee: (0.5 + Math.random() * 1.5) * envol,
      spin: new THREE.Vector3(
        (Math.random() - 0.5) * 0.9,
        (Math.random() - 0.5) * 1.3,
        (Math.random() - 0.5) * 0.9,
      ),
      // Le retard, de 0 en haut à 0.45 en bas.
      retard: 0.45 * (1 - Math.min(1, Math.max(0, objet.position.y / haut))),
      matieres: liste.filter(Boolean).map((matiere) => ({ matiere, pleine: matiere.opacity })),
    })
  })

  return (valeur) => {
    const v = Math.max(0, Math.min(1, valeur))

    pieces.forEach((piece) => {
      // La part du mouvement déjà faite par CETTE pièce, une fois son retard
      // consommé. Les pièces ne partent donc pas ensemble, mais elles arrivent
      // toutes au même moment — sans quoi la dalle resterait suspendue.
      const t = Math.max(0, Math.min(1, (v - piece.retard) / (1 - piece.retard)))
      // Départ lent, fin rapide : une pièce se descelle avant de s'en aller.
      const e = t * t * (3 - 2 * t)

      piece.objet.position.set(
        piece.origine.x + piece.ecart.x * e,
        piece.origine.y + piece.levee * e,
        piece.origine.z + piece.ecart.z * e,
      )
      piece.objet.rotation.set(
        piece.rotation.x + piece.spin.x * e,
        piece.rotation.y + piece.spin.y * e,
        piece.rotation.z + piece.spin.z * e,
      )

      // L'effacement n'arrive qu'au bout du geste : une pièce doit avoir
      // visiblement quitté sa place avant de disparaître, sinon on ne voit
      // qu'un fondu.
      const reste = Math.max(0, Math.min(1, (1 - e) / 0.45))
      piece.matieres.forEach(({ matiere, pleine }) => {
        matiere.opacity = pleine * reste
        matiere.transparent = pleine < 1 || reste < 0.999
      })
    })

    groupe.visible = v < 0.999
  }
}

/* -------------------------------------------------------------------------- */
/*  Le scintillement                                                          */
/* -------------------------------------------------------------------------- */

/**
 * CE QUI EST COCHÉ DOIT SE TROUVER TOUT DE SUITE.
 *
 * L'écran d'affinage pose une case, et quelque chose apparaît quelque part sur
 * le bien. Tant que le bien tenait dans un plan serré, ça suffisait ; sur un
 * plan d'ensemble qui montre une maison, son jardin, sa piscine et son toit, le
 * balcon qu'on vient de déclarer fait quarante pixels — le vendeur coche, et
 * ne voit rien changer.
 *
 * D'où ce SCINTILLEMENT : l'ouvrage correspondant s'allume brièvement, à
 * intervalles réguliers, tant que l'option est cochée. Ce n'est pas un ornement,
 * c'est un INDEX : l'œil va là où ça clignote, trouve l'ouvrage, et le
 * clignotement a fait son travail.
 *
 * Il est délibérément COURT et ESPACÉ (voir `eclat` dans `DroneScene`) : une
 * lueur continue se lirait comme un défaut de matière, et un clignotement rapide
 * comme une alarme. Un éclat bref toutes les deux secondes et demie se lit comme
 * un signal, et c'est tout ce qu'on lui demande.
 *
 * L'émission est appliquée PAR-DESSUS l'état de la matière, et l'état d'origine
 * est restauré dès que l'éclat retombe : une matière qui porte déjà une émission
 * — un vitrage allumé le soir — la retrouve intacte.
 */
export function scintillant(groupe, { couleur = 0xffd9a0, force = 1.35 } = {}) {
  const teinte = new THREE.Color(couleur)
  const matieres = []

  groupe.traverse((objet) => {
    if (!objet.isMesh) return
    const liste = Array.isArray(objet.material) ? objet.material : [objet.material]
    liste.forEach((matiere) => {
      if (!matiere?.emissive) return
      matieres.push({
        matiere,
        emissive: matiere.emissive.clone(),
        intensite: matiere.emissiveIntensity ?? 1,
      })
    })
  })

  let dernier = -1

  return (valeur) => {
    const v = Math.max(0, Math.min(1, valeur))
    // Rien n'est écrit tant que rien n'a bougé : le scintillement est appelé à
    // chaque image pour chaque ouvrage, et la plupart sont éteints la plupart
    // du temps.
    if (Math.abs(v - dernier) < 0.004) return
    dernier = v

    matieres.forEach((piece) => {
      if (v < 0.004) {
        piece.matiere.emissive.copy(piece.emissive)
        piece.matiere.emissiveIntensity = piece.intensite
        return
      }
      piece.matiere.emissive.copy(piece.emissive).lerp(teinte, v)
      piece.matiere.emissiveIntensity = Math.max(piece.intensite, v * force)
    })
  }
}

/**
 * LE VOILE — un ouvrage qu'on rend translucide sans le faire disparaître.
 *
 * C'est le pendant exact de [`revelable`](#revelable), et il sert à une seule
 * chose : l'ASCENSEUR. On ne peut pas montrer une cabine qui monte dans une
 * cage sans regarder à travers la façade, et on ne peut pas retirer la façade
 * sans que l'immeuble cesse d'en être un. Il reste donc en place, à demi
 * effacé — une coupe de maquette d'architecte, pas une disparition.
 *
 * Il s'applique APRÈS la révélation, jamais avant : les deux écrivent la même
 * opacité, et c'est le voile qui doit avoir le dernier mot.
 */
export function voilant(cibles, { plancher = 0.34 } = {}) {
  const matieres = []
  // Plusieurs ouvrages, parce que la masse d'un bâtiment n'est presque jamais
  // un seul groupe : le noyau, ses refends et ses dalles sont trois familles
  // distinctes, et c'est leur RÉUNION qu'on voile.
  ;(Array.isArray(cibles) ? cibles : [cibles]).forEach((groupe) => {
    groupe.traverse((objet) => {
      if (!objet.isMesh) return
      const liste = Array.isArray(objet.material) ? objet.material : [objet.material]
      liste.forEach((matiere) => {
        if (matiere) matieres.push({ matiere, pleine: matiere.opacity, profondeur: matiere.depthWrite })
      })
    })
  })

  // LE VOILE PART DE ZÉRO, PAS DE « JAMAIS APPELÉ ». C'est ce qui lui évite
  // d'écrire quoi que ce soit tant qu'il n'a pas été levé : il partage ses
  // matières avec `revelable`, et une écriture à l'opacité pleine au premier
  // appel effacerait le fondu d'arrivée de l'ouvrage.
  let dernier = 0

  return (valeur) => {
    const v = Math.max(0, Math.min(1, valeur))
    if (Math.abs(v - dernier) < 0.003) return
    dernier = v

    matieres.forEach(({ matiere, pleine, profondeur }) => {
      const opacite = pleine * (1 - (1 - plancher) * v)
      matiere.opacity = opacite
      matiere.transparent = opacite < 0.999
      /**
       * ET IL CESSE D'ÉCRIRE LA PROFONDEUR TANT QU'IL EST POSÉ.
       *
       * C'est la ligne sans laquelle rien de tout cela ne marche. Une surface
       * translucide qui écrit sa profondeur REJETTE ce qui est dessiné derrière
       * elle ensuite : on voyait au travers de la façade, et l'on n'y voyait
       * rien — ni la cage, ni la cabine, ni le fond du bâtiment. C'est
       * exactement le contraire de ce qu'on demande à une coupe de maquette.
       *
       * La profondeur est rendue dès que le voile retombe : hors de ce moment-là,
       * la masse du bâtiment est opaque et doit l'être.
       */
      matiere.depthWrite = v < 0.01 ? profondeur : false
    })
  }
}
