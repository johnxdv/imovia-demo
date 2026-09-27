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
export function baieVitree({ largeur, hauteur, meneaux = 3, traverse = false, sombre = false }) {
  const groupe = new THREE.Group()
  const verre = sombre ? M.murVitre() : M.vitrage()

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

/** Arbre de jardin : un tronc et deux masses de feuillage décalées. */
export function arbre(hauteur = 2.6) {
  const groupe = new THREE.Group()
  const bois = poser(groupe, fut(hauteur * 0.05, hauteur * 0.52, M.tronc(), 8))
  bois.position.y = hauteur * 0.26

  const basse = poser(groupe, new THREE.Mesh(new THREE.IcosahedronGeometry(hauteur * 0.3, 0), M.feuillage()))
  basse.position.y = hauteur * 0.62
  basse.scale.set(1, 0.85, 1)

  const haute = poser(
    groupe,
    new THREE.Mesh(new THREE.IcosahedronGeometry(hauteur * 0.24, 0), M.feuillageClair()),
  )
  haute.position.set(hauteur * 0.08, hauteur * 0.86, -hauteur * 0.05)

  return groupe
}

/** Buisson taillé : la masse basse des massifs. */
export function buisson(rayon = 0.34) {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(rayon, 0), M.feuillage())
  mesh.scale.set(1, 0.7, 1)
  mesh.position.y = rayon * 0.6
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
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
