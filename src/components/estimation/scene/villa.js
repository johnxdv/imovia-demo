import * as THREE from 'three'
import * as M from './matieres'
import {
  arbre,
  baieVitree,
  boite,
  buisson,
  fut,
  gardeCorpsVerre,
  graminee,
  pergola as creerPergola,
  poser,
  revelable,
  souche,
} from './kit'

/**
 * LA MAISON D'ARCHITECTE — toujours la même.
 *
 * Une seule maison pour tout le parcours, et c'est un parti pris : le vendeur
 * n'est pas en train de regarder SA maison, il regarde ce que devient la
 * nôtre pendant qu'il la décrit. Une silhouette qui changerait de famille à
 * chaque bien donnerait un catalogue ; une maison qu'on reconnaît d'un écran à
 * l'autre donne un projet.
 *
 * Ce qui ne change JAMAIS, quelle que soit la surface :
 *   • l'enduit blanc cassé et les menuiseries d'aluminium noir ;
 *   • la grande baie du séjour, en façade sud, meneaux fins ;
 *   • la terrasse dallée qui prolonge le séjour ;
 *   • la pergola à lames noires au-dessus ;
 *   • le toit plat à acrotère des volumes bas, la faible pente en terre cuite
 *     des volumes hauts.
 *
 * CE QUI CHANGE AVEC LA SURFACE, c'est le PROGRAMME — et il change en entier,
 * pas d'échelle. Franchir un palier, ce n'est pas la même maison en plus
 * grand : c'est un étage qui apparaît, une aile qui se greffe, un porche qui
 * s'ouvre en double hauteur. Six paliers, six maisons qui restent la même
 * maison.
 *
 *   moins de 50 m²   le volume unique : toit plat, une baie, un auvent.
 *   50 à 100 m²      le plain-pied en L : un retour bas, la pergola arrive.
 *   100 à 150 m²     l'étage en retrait, son balcon, la toiture en pente,
 *                    la cheminée.
 *   150 à 200 m²     l'étage prend toute la largeur et passe en porte-à-faux
 *                    au-dessus de la terrasse ; bardage bois sur le pignon.
 *   200 à 300 m²     une aile latérale avec sa propre toiture, et l'entrée
 *                    s'ouvre en double hauteur sous un porche.
 *   300 m² et plus   la propriété : deux ailes, un socle de pierre, un perron
 *                    et son allée.
 */

/**
 * ÉCHELLE DE LA SCÈNE : une unité vaut environ 1,80 m.
 *
 * C'est celle de l'immeuble et de la visite, et toutes les cotes de ce fichier
 * s'y tiennent — un niveau d'habitation fait donc 1,7 unité, pas 3. Une maison
 * dont les hauteurs seraient écrites en mètres et les plans à l'échelle de la
 * scène monterait deux fois trop haut : elle se lirait comme une tour, et c'est
 * exactement ce qu'une maison d'architecte n'est pas.
 */

/**
 * LES SIX PALIERS. Les seuils sont ceux demandés — 50, 100, 150, 200, 300 —
 * et l'ordre est celui de la montée en gamme : chaque ligne ajoute quelque
 * chose que la précédente n'avait pas.
 */
export const PALIERS_VILLA = [
  {
    id: 'volume',
    max: 50,
    corps: { largeur: 4.3, profondeur: 3.5, hauteur: 1.62 },
    retour: null,
    etage: null,
    aile: null,
    pergolaLargeur: 0,
    auvent: true,
    porche: false,
    toitEtage: 'plat',
    baie: { largeur: 2.1, meneaux: 2 },
    terrasse: { avance: 1.2, marge: 0.5 },
    cheminee: false,
    bardage: false,
    socle: false,
  },
  {
    id: 'plain-pied',
    max: 100,
    corps: { largeur: 5.7, profondeur: 4.0, hauteur: 1.68 },
    retour: { largeur: 2.3, profondeur: 3.0, hauteur: 1.5 },
    etage: null,
    aile: null,
    pergolaLargeur: 3.2,
    auvent: true,
    porche: false,
    toitEtage: 'plat',
    baie: { largeur: 3.2, meneaux: 3 },
    terrasse: { avance: 1.7, marge: 0.8 },
    cheminee: false,
    bardage: false,
    socle: false,
  },
  {
    id: 'etage',
    max: 150,
    corps: { largeur: 6.4, profondeur: 4.4, hauteur: 1.74 },
    retour: { largeur: 2.5, profondeur: 3.2, hauteur: 1.55 },
    etage: { largeur: 3.7, profondeur: 3.8, hauteur: 1.58, decalage: -1.2, porteAFaux: 0 },
    aile: null,
    pergolaLargeur: 3.8,
    auvent: true,
    porche: false,
    toitEtage: 'pente',
    baie: { largeur: 3.6, meneaux: 4 },
    terrasse: { avance: 2.0, marge: 0.9 },
    cheminee: true,
    bardage: false,
    socle: false,
  },
  {
    id: 'porte-a-faux',
    max: 200,
    corps: { largeur: 7.1, profondeur: 4.8, hauteur: 1.76 },
    retour: { largeur: 2.7, profondeur: 3.4, hauteur: 1.58 },
    etage: { largeur: 6.3, profondeur: 4.0, hauteur: 1.62, decalage: -0.4, porteAFaux: 0.85 },
    aile: null,
    pergolaLargeur: 4.4,
    auvent: true,
    porche: false,
    toitEtage: 'pente',
    baie: { largeur: 4.2, meneaux: 4 },
    terrasse: { avance: 2.3, marge: 1.0 },
    cheminee: true,
    bardage: true,
    socle: false,
  },
  {
    id: 'aile',
    max: 300,
    corps: { largeur: 7.8, profondeur: 5.0, hauteur: 1.8 },
    retour: { largeur: 2.9, profondeur: 3.6, hauteur: 1.62 },
    etage: { largeur: 6.6, profondeur: 4.2, hauteur: 1.66, decalage: -0.5, porteAFaux: 0.95 },
    aile: { largeur: 3.1, profondeur: 4.2, hauteur: 1.62, cote: 1 },
    pergolaLargeur: 5.2,
    auvent: false,
    porche: true,
    toitEtage: 'pente',
    baie: { largeur: 4.8, meneaux: 5 },
    terrasse: { avance: 2.6, marge: 1.2 },
    cheminee: true,
    bardage: true,
    socle: false,
  },
  {
    id: 'propriete',
    max: Infinity,
    corps: { largeur: 8.4, profondeur: 5.2, hauteur: 1.86 },
    retour: { largeur: 3.0, profondeur: 3.8, hauteur: 1.68 },
    etage: { largeur: 7.1, profondeur: 4.4, hauteur: 1.7, decalage: -0.5, porteAFaux: 1.05 },
    aile: { largeur: 3.4, profondeur: 4.4, hauteur: 1.68, cote: 1, symetrique: true },
    pergolaLargeur: 5.8,
    auvent: false,
    porche: true,
    toitEtage: 'pente',
    baie: { largeur: 5.2, meneaux: 5 },
    terrasse: { avance: 2.9, marge: 1.4 },
    cheminee: true,
    bardage: true,
    socle: true,
  },
]

/** Palier correspondant à une surface habitable déclarée. */
export const palierVilla = (surface) => {
  const s = Number.isFinite(surface) ? surface : 100
  const index = PALIERS_VILLA.findIndex((palier) => s < palier.max)
  return index === -1 ? PALIERS_VILLA.length - 1 : index
}

/* -------------------------------------------------------------------------- */

/** Toiture à faible pente, deux versants et son débord — la couverture des
    volumes hauts, en terre cuite comme sur la maison de référence. */
function toitPente(largeur, profondeur, { pente = 0.3, debord = 0.42 } = {}) {
  const groupe = new THREE.Group()
  const l = largeur + debord * 2
  const p = profondeur + debord * 2
  const demiP = p / 2
  const hauteur = demiP * pente
  const longueurVersant = Math.sqrt(demiP * demiP + hauteur * hauteur)

  ;[-1, 1].forEach((cote) => {
    const versant = poser(groupe, boite(l, 0.12, longueurVersant, M.tuile()))
    versant.position.set(0, hauteur / 2, (cote * demiP) / 2)
    versant.rotation.x = cote * Math.atan2(hauteur, demiP)
  })

  const faitage = poser(groupe, boite(l + 0.06, 0.09, 0.14, M.tuile()))
  faitage.position.y = hauteur

  // Rives de pignon : la planche claire qui ferme la couverture sur le côté.
  ;[-1, 1].forEach((cote) => {
    const rive = poser(groupe, boite(0.09, 0.16, p, M.enduitClair()))
    rive.position.set((cote * l) / 2, hauteur / 2 - 0.02, 0)
  })

  groupe.userData.hauteur = hauteur
  return groupe
}

/** Toit plat : la dalle, son acrotère et sa couvertine. */
function toitPlat(largeur, profondeur, { debord = 0.5 } = {}) {
  const groupe = new THREE.Group()
  const l = largeur + debord * 2
  const p = profondeur + debord * 2

  const dalle = poser(groupe, boite(l, 0.14, p, M.betonSombre()))
  dalle.position.y = 0.07

  // Acrotère : le relevé qui ceinture le toit plat. C'est lui qui donne la
  // ligne franche des maisons contemporaines — sans lui, la dalle flotte.
  ;[-1, 1].forEach((cote) => {
    const avant = poser(groupe, boite(l, 0.2, 0.1, M.enduitClair()))
    avant.position.set(0, 0.24, (cote * p) / 2 - cote * 0.05)
    const lateral = poser(groupe, boite(0.1, 0.2, p, M.enduitClair()))
    lateral.position.set((cote * l) / 2 - cote * 0.05, 0.24, 0)
  })

  groupe.userData.hauteur = 0.34
  return groupe
}

/* -------------------------------------------------------------------------- */

export function creerVilla(indexPalier) {
  const palier = PALIERS_VILLA[Math.max(0, Math.min(PALIERS_VILLA.length - 1, indexPalier))]
  const groupe = new THREE.Group()

  /** Ce que le plan de coupe tranche pendant que la maison se construit. */
  const montant = new THREE.Group()
  groupe.add(montant)

  const { corps, retour, etage, aile } = palier
  const socleH = palier.socle ? 0.24 : 0.12
  const y0 = socleH

  /* --- Terrasse et socle -------------------------------------------------- */

  const terrasseL = corps.largeur + palier.terrasse.marge * 2 + (aile ? aile.largeur : 0)
  const terrasseP = corps.profondeur + palier.terrasse.avance
  const terrasse = poser(
    groupe,
    boite(terrasseL, socleH, terrasseP, palier.socle ? M.pierreMoulure() : M.dallage()),
    { ombre: false },
  )
  terrasse.position.set(aile ? (aile.cote * aile.largeur) / 2 : 0, socleH / 2, palier.terrasse.avance / 2)

  /* --- Corps principal ---------------------------------------------------- */

  const principal = poser(montant, boite(corps.largeur, corps.hauteur, corps.profondeur, M.enduitClair()))
  principal.position.set(0, y0 + corps.hauteur / 2, 0)

  // Retour bas en L, côté gauche : c'est ce décroché qui fait le plan d'une
  // maison d'architecte plutôt qu'un pavillon rectangulaire.
  if (retour) {
    const bloc = poser(montant, boite(retour.largeur, retour.hauteur, retour.profondeur, M.enduitOmbre()))
    bloc.position.set(
      -(corps.largeur / 2 + retour.largeur / 2) + 0.05,
      y0 + retour.hauteur / 2,
      -(corps.profondeur - retour.profondeur) / 2,
    )

    const couverture = toitPlat(retour.largeur, retour.profondeur, { debord: 0.34 })
    couverture.position.copy(bloc.position)
    couverture.position.y = y0 + retour.hauteur
    montant.add(couverture)
  }

  // Aile latérale basse (garage et suite) : la façon dont une maison
  // d'architecte s'étend — en ajoutant un corps, pas en grossissant.
  if (aile) {
    const cotes = aile.symetrique ? [1, -1] : [aile.cote]
    cotes.forEach((cote) => {
      const largeur = cote === aile.cote ? aile.largeur : aile.largeur * 0.82
      const bloc = poser(montant, boite(largeur, aile.hauteur, aile.profondeur, M.enduitClair()))
      bloc.position.set(
        cote * (corps.largeur / 2 + largeur / 2 - 0.05),
        y0 + aile.hauteur / 2,
        (corps.profondeur - aile.profondeur) / 2 - 0.1,
      )

      const couverture = toitPlat(largeur, aile.profondeur, { debord: 0.4 })
      couverture.position.copy(bloc.position)
      couverture.position.y = y0 + aile.hauteur
      montant.add(couverture)

      // Porte de garage sur l'aile droite : trois lames d'aluminium sombre.
      if (cote === aile.cote) {
        const porteGarage = poser(montant, boite(largeur * 0.68, aile.hauteur * 0.62, 0.1, M.aluNoir()), {
          ombre: false,
        })
        porteGarage.position.set(
          bloc.position.x,
          y0 + (aile.hauteur * 0.62) / 2,
          bloc.position.z + aile.profondeur / 2 + 0.03,
        )
      }
    })
  }

  /* --- Étage -------------------------------------------------------------- */

  let sommet = y0 + corps.hauteur
  let toitHaut = null

  if (etage) {
    const zEtage = (corps.profondeur - etage.profondeur) / 2 - etage.porteAFaux
    const bloc = poser(
      montant,
      boite(etage.largeur, etage.hauteur, etage.profondeur, M.enduitClair()),
    )
    bloc.position.set(etage.decalage, y0 + corps.hauteur + etage.hauteur / 2, zEtage)

    // Bardage de tasseaux sur le pignon de l'étage : lame à lame, jamais un
    // aplat — c'est à ça qu'on voit que c'est du bois.
    if (palier.bardage) {
      const lames = 14
      for (let i = 0; i < lames; i += 1) {
        const lame = poser(montant, boite(0.11, etage.hauteur - 0.22, 0.06, M.boisBardage()), {
          ombre: false,
        })
        lame.position.set(
          etage.decalage - etage.largeur / 2 + ((i + 0.6) * etage.largeur) / (lames + 1.4),
          y0 + corps.hauteur + etage.hauteur / 2,
          zEtage + etage.profondeur / 2 + 0.035,
        )
      }
    }

    // Balcon du porte-à-faux, et son garde-corps de verre.
    if (etage.porteAFaux > 0.2) {
      const balcon = poser(montant, boite(etage.largeur * 0.62, 0.12, etage.porteAFaux + 0.5, M.betonSombre()))
      balcon.position.set(
        etage.decalage + etage.largeur * 0.12,
        y0 + corps.hauteur + 0.07,
        zEtage + etage.profondeur / 2 + (etage.porteAFaux + 0.5) / 2 - 0.1,
      )

      const garde = gardeCorpsVerre({ largeur: etage.largeur * 0.62, hauteur: 0.58 })
      garde.position.set(
        balcon.position.x,
        y0 + corps.hauteur + 0.14,
        balcon.position.z + (etage.porteAFaux + 0.5) / 2,
      )
      montant.add(garde)
    }

    // Deux baies à l'étage, sur la façade sud.
    ;[-1, 1].forEach((cote) => {
      const baie = baieVitree({ largeur: etage.largeur * 0.26, hauteur: etage.hauteur * 0.62, meneaux: 2 })
      baie.position.set(
        etage.decalage + cote * etage.largeur * 0.24,
        y0 + corps.hauteur + 0.34,
        zEtage + etage.profondeur / 2 + 0.03,
      )
      montant.add(baie)
    })

    sommet = y0 + corps.hauteur + etage.hauteur
    toitHaut =
      palier.toitEtage === 'pente'
        ? toitPente(etage.largeur, etage.profondeur)
        : toitPlat(etage.largeur, etage.profondeur)
    toitHaut.position.set(etage.decalage, sommet, zEtage)
    montant.add(toitHaut)
  } else {
    toitHaut = toitPlat(corps.largeur, corps.profondeur, { debord: 0.55 })
    toitHaut.position.set(0, sommet, 0)
    montant.add(toitHaut)
  }

  const hauteurToit = sommet + (toitHaut.userData.hauteur ?? 0.4)

  if (palier.cheminee) {
    const fumisterie = souche({ largeur: 0.4, hauteur: 0.62, poteries: 2 })
    fumisterie.position.set(
      (etage ? etage.decalage : 0) - (etage ? etage.largeur : corps.largeur) * 0.3,
      sommet + 0.1,
      -(etage ? etage.profondeur : corps.profondeur) * 0.18,
    )
    montant.add(fumisterie)
  }

  /* --- Façade sud : la grande baie, l'entrée ------------------------------ */

  const zFacade = corps.profondeur / 2 + 0.04
  const hauteurBaie = corps.hauteur - 0.3

  const baie = baieVitree({
    largeur: palier.baie.largeur,
    hauteur: hauteurBaie,
    meneaux: palier.baie.meneaux,
    sombre: true,
  })
  baie.position.set(corps.largeur * 0.12, y0 + 0.14, zFacade)
  montant.add(baie)

  // L'entrée : un vantail d'aluminium sombre, encastré en bout de façade, et
  // son seuil de pierre.
  const hauteurPorte = Math.min(1.32, corps.hauteur * 0.76)
  const xPorte = -corps.largeur * 0.33
  const vantail = poser(montant, boite(1.0, hauteurPorte, 0.1, M.aluNoir()))
  vantail.position.set(xPorte, y0 + hauteurPorte / 2, zFacade + 0.02)
  // Poignée-barre de laiton, toute hauteur : le détail qui dit « architecte ».
  const poignee = poser(montant, boite(0.05, hauteurPorte * 0.62, 0.05, M.laiton()), { ombre: false })
  poignee.position.set(xPorte + 0.36, y0 + hauteurPorte / 2, zFacade + 0.09)

  const seuil = poser(groupe, boite(1.9, 0.07, 1.0, M.pierreMoulure()), { ombre: false })
  seuil.position.set(xPorte, socleH + 0.035, corps.profondeur / 2 + 0.5)

  if (palier.auvent) {
    const auvent = poser(montant, boite(2.3, 0.12, 1.25, M.betonSombre()))
    auvent.position.set(xPorte, y0 + hauteurPorte + 0.16, corps.profondeur / 2 + 0.55)
  }

  if (palier.porche) {
    // Porche en double hauteur : deux refends d'enduit et une dalle haute,
    // creusés dans le volume. C'est l'entrée des grandes maisons.
    const hauteurPorche = (etage ? y0 + corps.hauteur + etage.hauteur * 0.5 : sommet) - y0
    ;[-1, 1].forEach((cote) => {
      const joue = poser(montant, boite(0.24, hauteurPorche, 1.5, M.enduitClair()))
      joue.position.set(xPorte + cote * 1.35, y0 + hauteurPorche / 2, corps.profondeur / 2 + 0.7)
    })
    const linteau = poser(montant, boite(3.0, 0.24, 1.6, M.enduitClair()))
    linteau.position.set(xPorte, y0 + hauteurPorche, corps.profondeur / 2 + 0.7)
  }

  /* --- Fenêtres de pignon -------------------------------------------------- */

  ;[-1, 1].forEach((cote) => {
    const xPignon = cote * (corps.largeur / 2 + 0.03)
    if (retour && cote < 0) return
    if (aile && (cote === aile.cote || aile.symetrique)) return
    for (let i = 0; i < 2; i += 1) {
      const fenetre = baieVitree({ largeur: 0.85, hauteur: 0.78, meneaux: 2 })
      fenetre.rotation.y = cote * (Math.PI / 2)
      fenetre.position.set(xPignon, y0 + 0.58, (i === 0 ? -1 : 1) * corps.profondeur * 0.24)
      montant.add(fenetre)
    }
  })

  /* --- Pergola ------------------------------------------------------------- */

  if (palier.pergolaLargeur > 0) {
    const ombriere = creerPergola({
      largeur: palier.pergolaLargeur,
      profondeur: palier.terrasse.avance * 0.82,
      hauteur: Math.min(corps.hauteur - 0.2, 2.85),
    })
    ombriere.position.set(
      corps.largeur * 0.12,
      y0,
      corps.profondeur / 2 + (palier.terrasse.avance * 0.82) / 2,
    )
    montant.add(ombriere)
  }

  /* --- Abords : le jardin, révélé pendant l'analyse ----------------------- */

  const abords = new THREE.Group()
  groupe.add(abords)

  const pelouse = poser(abords, new THREE.Mesh(new THREE.CircleGeometry(1, 56), M.gazon()), {
    ombre: false,
  })
  pelouse.rotation.x = -Math.PI / 2
  pelouse.position.y = 0.015

  // Allée de gravier, de la rue jusqu'au seuil.
  const allee = poser(abords, boite(1.9, 0.03, 12, M.gravier()), { ombre: false })
  allee.position.set(xPorte, 0.03, corps.profondeur / 2 + 6.6)

  // Massifs : buissons taillés, graminées, et quelques arbres en fond de
  // parcelle. Posés au cordeau le long de la terrasse, comme sur le projet.
  const massifs = new THREE.Group()
  const bordure = terrasseL / 2 + 0.55
  for (let i = 0; i < 9; i += 1) {
    const t = i / 8
    const touffe = i % 2 === 0 ? buisson(0.3 + Math.random() * 0.14) : graminee(0.55)
    touffe.position.set(
      -bordure + 0.2 + t * (bordure * 2 - 0.4),
      0.02,
      corps.profondeur / 2 + palier.terrasse.avance + 0.55,
    )
    massifs.add(touffe)
  }
  ;[-1, 1].forEach((cote) => {
    for (let i = 0; i < 3; i += 1) {
      const touffe = buisson(0.26 + Math.random() * 0.16)
      touffe.position.set(
        cote * (terrasseL / 2 + 0.6),
        0.02,
        -corps.profondeur * 0.3 + i * 1.3,
      )
      massifs.add(touffe)
    }
  })
  abords.add(massifs)

  const bosquet = new THREE.Group()
  ;[
    [-terrasseL * 0.72, -corps.profondeur * 1.5, 3.2],
    [terrasseL * 0.78, -corps.profondeur * 1.3, 2.7],
    [-terrasseL * 0.95, corps.profondeur * 0.85, 2.4],
    [terrasseL * 0.92, corps.profondeur * 1.1, 3.0],
  ].forEach(([x, z, h]) => {
    const sujet = arbre(h)
    sujet.position.set(x, 0, z)
    bosquet.add(sujet)
  })
  abords.add(bosquet)

  /* --- Options d'affinage -------------------------------------------------- */

  // Piscine : bassin creusé, margelle de pierre claire, plage immergée. Une
  // piscine haut de gamme se reconnaît à sa margelle affleurante et à son
  // liner sombre, pas à un rectangle bleu.
  const piscine = new THREE.Group()
  const bassinL = Math.max(4.2, terrasseL * 0.52)
  const bassinP = 2.5
  const bord = poser(piscine, boite(bassinL + 0.7, 0.14, bassinP + 0.7, M.margelle()), { ombre: false })
  bord.position.y = 0.07
  const cuve = poser(piscine, boite(bassinL, 0.5, bassinP, M.betonSombre()), { ombre: false })
  cuve.position.y = -0.2
  const eau = poser(piscine, boite(bassinL - 0.1, 0.42, bassinP - 0.1, M.eauPiscine()), { ombre: false })
  eau.position.y = -0.05
  // Deux bains de soleil au bord du bassin.
  ;[-1, 1].forEach((cote) => {
    const bain = new THREE.Group()
    const assise = poser(bain, boite(0.45, 0.08, 1.15, M.tissuClair()))
    assise.position.y = 0.24
    const dossier = poser(bain, boite(0.45, 0.08, 0.5, M.tissuClair()))
    dossier.position.set(0, 0.36, -0.45)
    dossier.rotation.x = -0.6
    ;[-1, 1].forEach((sz) => {
      const pied = poser(bain, fut(0.025, 0.2, M.aluNoir(), 6))
      pied.position.set(0, 0.1, sz * 0.45)
    })
    bain.position.set(cote * 0.9, 0, -(bassinP / 2 + 1.15))
    piscine.add(bain)
  })
  // Du côté du séjour, décalée vers le pignon opposé à l'entrée : une piscine
  // ne se traverse pas pour aller sonner à la porte.
  piscine.position.set(
    corps.largeur * 0.42,
    0,
    corps.profondeur / 2 + palier.terrasse.avance + 2.3,
  )
  groupe.add(piscine)

  // Panneaux photovoltaïques : posés à plat sur la toiture, en deux rangées
  // alignées — pas un damier jeté au hasard.
  const panneaux = new THREE.Group()
  const rangeeL = (etage ? etage.largeur : corps.largeur) * 0.78
  for (let rangee = 0; rangee < 2; rangee += 1) {
    for (let i = 0; i < 4; i += 1) {
      const module = poser(panneaux, boite(rangeeL / 4.4, 0.06, 0.82, M.panneauSolaire()))
      module.position.set(
        -rangeeL / 2 + ((i + 0.5) * rangeeL) / 4,
        0.06,
        -0.5 + rangee * 0.92,
      )
      module.rotation.x = palier.toitEtage === 'pente' && etage ? 0.2 : 0.16
    }
  }
  panneaux.position.set(etage ? etage.decalage : 0, hauteurToit - 0.1, -(etage ? etage.profondeur : corps.profondeur) * 0.1)
  groupe.add(panneaux)

  // Terrasse supplémentaire : un deck de bois en prolongement du dallage,
  // côté jardin, avec son salon d'extérieur.
  const terrasseBois = new THREE.Group()
  const deck = poser(terrasseBois, boite(terrasseL * 0.6, 0.1, 2.4, M.boisClair()), { ombre: false })
  deck.position.y = 0.06
  for (let i = 0; i < 12; i += 1) {
    const lame = poser(terrasseBois, boite(terrasseL * 0.6, 0.02, 0.16, M.boisBardage()), {
      ombre: false,
    })
    lame.position.set(0, 0.115, -1.1 + i * 0.2)
  }
  const canapeExt = poser(terrasseBois, boite(1.6, 0.32, 0.6, M.tissuClair()))
  canapeExt.position.set(-terrasseL * 0.12, 0.26, -0.5)
  const tableExt = poser(terrasseBois, boite(0.85, 0.07, 0.5, M.boisBardage()))
  tableExt.position.set(-terrasseL * 0.12, 0.3, 0.5)
  terrasseBois.position.set(
    -corps.largeur * 0.06,
    0,
    corps.profondeur / 2 + palier.terrasse.avance + 1.25,
  )
  groupe.add(terrasseBois)

  // Le standing : ce qui distingue une belle maison d'une maison de standing —
  // un parement de pierre sur le volume d'entrée, des jardinières taillées,
  // des bornes d'éclairage le long de l'allée, un portail.
  const standing = new THREE.Group()
  const parement = poser(standing, boite(corps.largeur * 0.36, corps.hauteur, 0.09, M.pierreSocle()))
  parement.position.set(xPorte + corps.largeur * 0.02, y0 + corps.hauteur / 2, zFacade + 0.06)
  for (let i = 0; i < 6; i += 1) {
    const borne = poser(standing, boite(0.1, 0.3, 0.1, M.aluNoir()))
    borne.position.set(
      xPorte + (i % 2 === 0 ? -1.25 : 1.25),
      0.18,
      corps.profondeur / 2 + 1.5 + Math.floor(i / 2) * 2.1,
    )
  }
  ;[-1, 1].forEach((cote) => {
    const jardiniere = poser(standing, boite(1.1, 0.34, 0.55, M.pierreMoulure()))
    jardiniere.position.set(xPorte + cote * 1.55, socleH + 0.17, corps.profondeur / 2 + 0.85)
    const plante = buisson(0.3)
    plante.position.set(xPorte + cote * 1.55, socleH + 0.34, corps.profondeur / 2 + 0.85)
    standing.add(plante)
  })
  // Portail d'entrée de propriété, en bout d'allée.
  const portail = new THREE.Group()
  ;[-1, 1].forEach((cote) => {
    const pilier = poser(portail, boite(0.34, 1.15, 0.34, M.pierreSocle()))
    pilier.position.set(cote * 1.4, 0.58, 0)
  })
  const vantaux = poser(portail, boite(2.5, 0.92, 0.07, M.ferForge()), { ombre: false })
  vantaux.position.y = 0.5
  portail.position.set(xPorte, 0, corps.profondeur / 2 + 12.2)
  standing.add(portail)
  groupe.add(standing)

  /* --- Révélations et pilotage --------------------------------------------- */

  const revelerAbords = revelable(abords)
  const revelerPiscine = revelable(piscine)
  const revelerPanneaux = revelable(panneaux)
  const revelerTerrasse = revelable(terrasseBois)
  const revelerStanding = revelable(standing)

  // Toutes les vitres de la maison : c'est par elles que le soir se voit. Les
  // matières sont reconnues à leur nom — le verre d'un garde-corps ne s'allume
  // pas, et rien d'autre qu'un nom ne le distingue d'une baie.
  const vitres = []
  groupe.traverse((objet) => {
    if (objet.isMesh && objet.material?.name === 'vitrage') vitres.push(objet.material)
  })

  const envergure = {
    largeur: Math.max(terrasseL + 2.2, corps.profondeur + palier.terrasse.avance + 3),
    hauteur: hauteurToit + 0.5,
  }

  return {
    groupe,
    montant,
    palier,
    hauteurCoupe: hauteurToit + 0.6,
    envergure,
    /** Points visés par les plans de caméra. */
    ancrages: {
      porte: new THREE.Vector3(xPorte, y0 + hauteurPorte * 0.55, corps.profondeur / 2 + 0.6),
      toit: new THREE.Vector3(0, hauteurToit, 0),
      hauteur: hauteurToit,
    },

    poser(v) {
      revelerAbords(v.abords)
      // La pelouse s'étend avec la surface de terrain déclarée : c'est le seul
      // ouvrage dont la TAILLE change, et non la seule présence.
      const rayon = 9 + v.terrain * 12
      pelouse.scale.set(rayon, rayon, 1)
      allee.scale.z = 1 + v.terrain * 0.45
      bosquet.scale.setScalar(1 + v.terrain * 0.28)
      bosquet.position.z = -v.terrain * 2.4

      revelerPiscine(v.piscine)
      revelerPanneaux(v.panneaux)
      revelerTerrasse(v.terrasse)
      revelerStanding(v.standing)

      vitres.forEach((matiere) => {
        matiere.emissive.setHex(0xf6c978)
        matiere.emissiveIntensity = v.lumiere * 1.15
      })
    },
  }
}
