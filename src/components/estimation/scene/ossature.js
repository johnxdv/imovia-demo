import * as THREE from 'three'
import * as M from './matieres'
import { boite, fut, murPerce, poser } from './kit'

/**
 * L'OSSATURE — la maison en construction de la première étape.
 *
 * Tant que l'adresse n'est pas posée et le bien pas repéré, il n'y a rien à
 * montrer d'un bien précis : ni son architecture, ni sa taille, ni même son
 * type. Ce qu'il faut montrer, c'est un CHANTIER — et un chantier, ce n'est
 * pas un bloc.
 *
 * Un bloc, c'était l'erreur : derrière des murs il y a forcément du vide, et
 * c'est ce vide qui fait qu'on peut y vivre. L'ossature est donc creuse pour
 * de bon — quatre murs percés de leurs baies, une porte, des refends qui
 * découpent les pièces, des solives en attente de plancher, et rien au-dessus.
 * On voit à travers les fenêtres, on voit par-dessus les murs, et ce qu'on voit
 * à l'intérieur, ce sont des pièces.
 *
 * Les murs ne grandissent pas par étirement : ils sont taillés par un PLAN DE
 * COUPE qui monte (voir `coupe` dans la scène). Une baie étirée serait une baie
 * déformée ; une baie tranchée par un plan qui monte est une baie qu'on est en
 * train de maçonner — elle apparaît d'abord comme une allège, puis comme un
 * tableau, puis se referme sous son linteau.
 */

/**
 * Emprise de l'ossature, en unités de scène — une unité vaut environ 1,80 m,
 * comme partout ailleurs dans le décor. Fixe : rien n'est encore déclaré du
 * bien, il n'y a donc rien à dimensionner.
 */
const LARGEUR = 5.4
const PROFONDEUR = 4.4
const HAUTEUR_MUR = 1.62
const EPAISSEUR = 0.16
const DALLE = 0.16

export function creerOssature() {
  const groupe = new THREE.Group()
  /** Ce que le plan de coupe doit trancher — la dalle et les abords restent. */
  const montant = new THREE.Group()
  groupe.add(montant)

  const y0 = DALLE

  /* --- La dalle et son piquetage ---------------------------------------- */

  const dalle = poser(groupe, boite(LARGEUR + 0.7, DALLE, PROFONDEUR + 0.7, M.betonLisse()), {
    ombre: false,
  })
  dalle.position.y = DALLE / 2

  // Chape intérieure, légèrement en creux : c'est le sol des pièces à venir,
  // et c'est lui qui se voit par la porte.
  const chape = poser(groupe, boite(LARGEUR - EPAISSEUR, 0.04, PROFONDEUR - EPAISSEUR, M.gravier()), {
    ombre: false,
  })
  chape.position.y = DALLE + 0.02

  // Piquets et cordeau : la zone de chantier, bornée avant d'être bâtie.
  const piquetage = new THREE.Group()
  const bornes = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 1], [0, 1], [1, 1],
    [-1, 0], [1, 0],
  ]
  bornes.forEach(([sx, sz]) => {
    const piquet = poser(piquetage, fut(0.03, 0.4, M.boisClair(), 6))
    piquet.position.set(sx * (LARGEUR / 2 + 0.95), 0.2, sz * (PROFONDEUR / 2 + 0.95))
  })
  // Le cordeau tendu d'un piquet à l'autre : quatre brins, pas un anneau — un
  // chantier se borne au carré.
  const brin = () => new THREE.MeshStandardMaterial({ color: 0xd8663c, roughness: 0.9 })
  const demiL = LARGEUR / 2 + 0.95
  const demiP = PROFONDEUR / 2 + 0.95
  ;[-1, 1].forEach((sz) => {
    const long = poser(piquetage, boite(demiL * 2, 0.018, 0.018, brin()), { ombre: false })
    long.position.set(0, 0.34, sz * demiP)
    const court = poser(piquetage, boite(0.018, 0.018, demiP * 2, brin()), { ombre: false })
    court.position.set(sz * demiL, 0.34, 0)
  })
  groupe.add(piquetage)

  /* --- Les quatre murs, percés ------------------------------------------ */

  const enduit = () => M.enduitOmbre()

  // Façade : la porte, et deux baies. La porte est décentrée — une entrée au
  // milieu d'une façade est un pavillon, pas une maison d'architecte.
  const facade = poser(
    montant,
    murPerce(
      {
        largeur: LARGEUR,
        hauteur: HAUTEUR_MUR,
        epaisseur: EPAISSEUR,
        ouvertures: [
          { x: -1.55, y: 0, largeur: 0.62, hauteur: 1.26 },
          { x: 0.35, y: 0.56, largeur: 0.95, hauteur: 0.72 },
          { x: 2.05, y: 0.56, largeur: 0.6, hauteur: 0.72 },
        ],
      },
      enduit(),
    ),
  )
  facade.position.set(0, y0, PROFONDEUR / 2 - EPAISSEUR)

  const arriere = poser(
    montant,
    murPerce(
      {
        largeur: LARGEUR,
        hauteur: HAUTEUR_MUR,
        epaisseur: EPAISSEUR,
        ouvertures: [
          { x: -1.6, y: 0.58, largeur: 0.68, hauteur: 0.7 },
          { x: 0.1, y: 0.58, largeur: 0.68, hauteur: 0.7 },
          { x: 1.8, y: 0.58, largeur: 0.68, hauteur: 0.7 },
        ],
      },
      enduit(),
    ),
  )
  arriere.position.set(0, y0, -PROFONDEUR / 2)

  ;[-1, 1].forEach((cote) => {
    const pignon = poser(
      montant,
      murPerce(
        {
          largeur: PROFONDEUR,
          hauteur: HAUTEUR_MUR,
          epaisseur: EPAISSEUR,
          ouvertures: [
            { x: -0.95, y: 0.6, largeur: 0.6, hauteur: 0.66 },
            { x: 0.95, y: 0.6, largeur: 0.6, hauteur: 0.66 },
          ],
        },
        enduit(),
      ),
    )
    pignon.rotation.y = cote * (Math.PI / 2)
    // L'épaisseur du mur part vers l'extérieur une fois tourné : on rentre donc
    // le panneau d'autant, pour que les quatre murs se rejoignent dans l'emprise.
    pignon.position.set(cote * (LARGEUR / 2 - EPAISSEUR), y0, 0)
  })

  /* --- Chaînages, linteaux, refends -------------------------------------- */

  // Poteaux de béton aux angles : ce sont eux qui disent « ossature » plutôt
  // que « maison dont on aurait enlevé le toit ».
  ;[[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const chainage = poser(montant, boite(0.2, HAUTEUR_MUR + 0.1, 0.2, M.betonSombre()))
    chainage.position.set(
      (sx * (LARGEUR - 0.2)) / 2,
      y0 + (HAUTEUR_MUR + 0.1) / 2,
      (sz * (PROFONDEUR - 0.2)) / 2,
    )
  })

  // Linteaux de béton au-dessus des percements de la façade.
  ;[
    [-1.55, 0.78, 1.26],
    [0.35, 1.15, 1.28],
    [2.05, 0.8, 1.28],
  ].forEach(([x, largeur, y]) => {
    const linteau = poser(montant, boite(largeur, 0.12, EPAISSEUR + 0.06, M.betonSombre()))
    linteau.position.set(x, y0 + y + 0.06, PROFONDEUR / 2 - EPAISSEUR / 2)
  })

  // Refends : deux cloisons montées à mi-hauteur. Elles découpent le plan en
  // pièces sans fermer la vue — on doit voir DANS la maison, pas seulement
  // qu'elle est creuse.
  const refendA = poser(montant, boite(0.12, 0.88, PROFONDEUR * 0.62, M.enduitClair()))
  refendA.position.set(-0.45, y0 + 0.44, -PROFONDEUR * 0.14)
  const refendB = poser(montant, boite(LARGEUR * 0.42, 0.88, 0.12, M.enduitClair()))
  refendB.position.set(LARGEUR * 0.27, y0 + 0.44, -PROFONDEUR * 0.1)

  /* --- Solives et échafaudage -------------------------------------------- */

  // Solives en attente de plancher : elles franchissent le vide sans le
  // combler, et c'est exactement ce qu'on veut voir d'une maison en cours.
  const solives = 8
  for (let i = 0; i < solives; i += 1) {
    const solive = poser(montant, boite(0.08, 0.12, PROFONDEUR + 0.3, M.boisClair()))
    solive.position.set(
      -LARGEUR / 2 + ((i + 0.5) * LARGEUR) / solives,
      y0 + HAUTEUR_MUR + 0.06,
      0,
    )
  }

  // Échafaudage sur le pignon droit : deux cadres et un platelage.
  const echafaudage = new THREE.Group()
  const acier = () => new THREE.MeshStandardMaterial({ color: 0x6f7a82, roughness: 0.5, metalness: 0.45 })
  ;[-1, 1].forEach((sz) => {
    ;[0, 1].forEach((rangee) => {
      const montantEch = poser(echafaudage, fut(0.035, HAUTEUR_MUR + 0.55, acier(), 6))
      montantEch.position.set(
        LARGEUR / 2 + 0.3 + rangee * 0.72,
        (HAUTEUR_MUR + 0.55) / 2,
        sz * (PROFONDEUR * 0.3),
      )
    })
  })
  ;[0.66, 1.42].forEach((y) => {
    const lisse = poser(echafaudage, boite(0.76, 0.05, PROFONDEUR * 0.6, acier()), { ombre: false })
    lisse.position.set(LARGEUR / 2 + 0.66, y, 0)
  })
  const platelage = poser(echafaudage, boite(0.8, 0.06, PROFONDEUR * 0.6, M.boisClair()))
  platelage.position.set(LARGEUR / 2 + 0.66, 1.46, 0)
  groupe.add(echafaudage)

  // Palette de parpaings, posée à côté de la dalle.
  const tas = new THREE.Group()
  for (let rangee = 0; rangee < 4; rangee += 1) {
    for (let i = 0; i < 3; i += 1) {
      const bloc = poser(tas, boite(0.28, 0.12, 0.14, M.betonSombre()))
      bloc.position.set(i * 0.31 - 0.31, 0.07 + rangee * 0.13, (rangee % 2) * 0.04)
    }
  }
  tas.position.set(-LARGEUR / 2 - 1.15, 0, PROFONDEUR * 0.22)
  tas.rotation.y = 0.35
  groupe.add(tas)

  const hauteurHorsTout = y0 + HAUTEUR_MUR + 0.3

  return {
    groupe,
    /** Ce que le plan de coupe tranche : les murs, pas la dalle ni les abords. */
    montant,
    hauteurCoupe: y0 + HAUTEUR_MUR + 0.25,
    envergure: { largeur: LARGEUR + 2.4, hauteur: hauteurHorsTout },

    /** Repères visés par les plans de caméra. */
    ancrages: {
      porte: new THREE.Vector3(-1.55, y0 + 0.62, PROFONDEUR / 2),
      toit: new THREE.Vector3(0, hauteurHorsTout, 0),
      hauteur: hauteurHorsTout,
    },

    /**
     * L'ossature n'a rien à révéler ni à éclairer : elle n'a ni abords, ni
     * options, ni vitrage — c'est un chantier, il fait jour, et tout ce qui
     * s'y construit se construit au plan de coupe. La fonction existe pour que
     * la scène n'ait pas à se demander à quelle architecture elle parle.
     */
    poser() {},
  }
}
