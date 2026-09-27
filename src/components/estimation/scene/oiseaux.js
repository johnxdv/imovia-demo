import * as THREE from 'three'
import * as M from './matieres'

/**
 * LES OISEAUX — ce qui passe dans le ciel pendant qu'on estime.
 *
 * Une scène où RIEN ne bouge sauf le bâtiment qu'on est en train de décrire
 * n'est pas une scène, c'est une maquette éclairée. Il y manque ce qui, dans
 * une vraie prise de vue au drone, arrive sans qu'on l'ait demandé : un vol qui
 * traverse le cadre, parfois loin derrière le bien, parfois assez près pour
 * qu'on le suive une seconde.
 *
 * DEUX ESPÈCES, ET CE N'EST PAS DE L'ORNITHOLOGIE. Un immeuble, c'est la ville,
 * et la ville c'est le PIGEON : gris ardoise, en petites bandes, qui rase les
 * corniches. Une maison, c'est le calme, et le calme c'est la COLOMBE BLANCHE :
 * seule ou par deux, plus haut, plus lentement. L'espèce ne se choisit pas —
 * elle suit l'architecture montée (voir `poser`).
 *
 * TOUT EST DISCRET, et c'est la contrainte principale. Ce sont des oiseaux de
 * fond de plan : petits, jamais au centre, jamais deux vols en même temps dans
 * la même direction. Si l'on se met à les regarder, ils ont raté leur effet.
 *
 * COMMENT C'EST FAIT. Six oiseaux sont montés une fois pour toutes et recyclés :
 * créer une géométrie en cours d'animation fait tomber une image, et un ciel
 * n'en vaut pas le prix. Chacun dort hors du cadre jusqu'à ce qu'on l'envoie
 * traverser, puis y retourne.
 */

/** Combien d'oiseaux la volière tient en réserve. */
const RESERVE = 6

/** Temps moyen entre deux vols, en secondes, et son écart. */
const INTERVALLE = 5
const INTERVALLE_ECART = 1.6

/** Un oiseau seul, deux, ou trois — jamais davantage : ce serait un lâcher. */
const tailleDuVol = () => (Math.random() < 0.52 ? 1 : Math.random() < 0.78 ? 2 : 3)

const lisser = (a, b, t) => a + (b - a) * t

/**
 * UN OISEAU — un corps, une tête, une queue, deux ailes qui battent.
 *
 * Volontairement sommaire : à la distance où ils passent, un oiseau, c'est une
 * silhouette et un battement. Ce qui le fait lire n'est pas le nombre de
 * facettes, c'est que les ailes ne battent pas en même temps que celles du
 * voisin et que le corps s'incline dans les virages.
 */
function creerOiseau() {
  const groupe = new THREE.Group()
  const plumage = M.plumagePigeon()

  const corps = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.44, 6), plumage)
  corps.rotation.x = Math.PI / 2
  groupe.add(corps)

  const tete = new THREE.Mesh(new THREE.SphereGeometry(0.062, 6, 5), plumage)
  tete.position.z = 0.22
  groupe.add(tete)

  // La queue, en coin plat : c'est elle qui donne le sens du vol de profil.
  const queue = new THREE.Mesh(new THREE.ConeGeometry(0.078, 0.22, 4), plumage)
  queue.rotation.x = -Math.PI / 2
  queue.scale.set(1, 1, 0.3)
  queue.position.z = -0.29
  groupe.add(queue)

  // Les ailes pivotent à l'épaule, et non en leur milieu : une aile qui
  // basculerait sur son axe ramerait sans avancer.
  const ailes = [-1, 1].map((cote) => {
    const epaule = new THREE.Group()
    const aile = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.17), plumage)
    aile.material.side = THREE.DoubleSide
    aile.rotation.x = -Math.PI / 2
    aile.position.x = (cote * 0.5) / 2
    epaule.add(aile)
    epaule.position.set(cote * 0.05, 0.02, 0.04)
    groupe.add(epaule)
    return { epaule, cote }
  })

  groupe.visible = false
  return { groupe, plumage, ailes, vol: null }
}

/**
 * UNE TRAJECTOIRE — d'un bord du ciel à l'autre, et jamais deux fois la même.
 *
 * Le cap est tiré au sort sur tout le tour d'horizon, l'oiseau entre par un
 * côté et sort par l'opposé en coupant le champ en biais, et il ne finit
 * jamais à la hauteur où il a commencé. Rien n'y est répété : deux vols de
 * suite dans la même direction se liraient comme une boucle.
 *
 * `decalage` écarte les compagnons de vol du meneur, latéralement et en
 * hauteur : une bande d'oiseaux n'est ni une file ni un peloton.
 */
function tracerVol(hauteurBien, rayon, decalage) {
  const cap = Math.random() * Math.PI * 2
  const traverse = new THREE.Vector3(Math.cos(cap), 0, Math.sin(cap))
  const lateral = new THREE.Vector3(-traverse.z, 0, traverse.x)

  // L'entrée n'est pas en face de la sortie : le vol coupe le champ en biais,
  // décalé d'un tiers de rayon d'un côté ou de l'autre.
  const biais = (Math.random() - 0.5) * rayon * 0.7
  // L'ALTITUDE SE PREND AU-DESSUS DU FAÎTAGE, toujours. Tirée dans la hauteur
  // du bien, elle envoyait les vols à mi-façade : à la distance où le drone
  // travaille, un oiseau qui passe à cette hauteur-là traverse l'objectif et
  // remplit le quart du cadre d'une tache blanche. Au-dessus du toit, il reste
  // ce qu'il doit être — quelque chose qui passe dans le ciel.
  const plancher = Math.max(hauteurBien * 1.15, 7)
  const altitude = plancher + hauteurBien * lisser(0, 0.9, Math.random())

  const depart = traverse
    .clone()
    .multiplyScalar(-rayon)
    .add(lateral.clone().multiplyScalar(biais + decalage.x))
  depart.y = altitude + decalage.y

  const arrivee = traverse
    .clone()
    .multiplyScalar(rayon)
    .add(lateral.clone().multiplyScalar(biais * 0.4 + decalage.x))
  // Un oiseau ne finit jamais à la hauteur où il a commencé.
  arrivee.y = altitude * lisser(0.72, 1.3, Math.random()) + decalage.y

  return {
    depart,
    arrivee,
    t: 0,
    // Les gros oiseaux lents traversent en huit secondes, les pressés en cinq.
    duree: lisser(5.2, 9.5, Math.random()),
    // Amplitude et rythme de l'ondulation verticale, et cadence du battement.
    houle: lisser(0.6, 1.9, Math.random()),
    periode: lisser(0.7, 1.4, Math.random()),
    battement: lisser(5.5, 9, Math.random()),
    // Phase propre : deux oiseaux d'une même bande ne battent pas ensemble.
    phase: Math.random() * Math.PI * 2,
  }
}

/**
 * LA VOLIÈRE. Montée une fois avec la scène, pilotée d'une seule fonction.
 *
 *   `poser(dt, { espece, hauteurBien, rayon })` avance tous les vols d'une
 *   image, en lance un nouveau quand le moment est venu, et accorde le plumage
 *   à l'architecture en place. Rien d'autre à appeler.
 */
export function creerVoliere() {
  const groupe = new THREE.Group()
  const oiseaux = Array.from({ length: RESERVE }, () => {
    const oiseau = creerOiseau()
    groupe.add(oiseau.groupe)
    return oiseau
  })

  // Le premier vol part tout de suite : attendre cinq secondes avant le
  // premier oiseau ferait paraître le ciel vide exactement le temps qu'on
  // regarde le panneau d'accueil.
  let prochain = 1.2
  let especePosee = null

  function accorderEspece(espece) {
    if (espece === especePosee) return
    especePosee = espece
    const teinte = espece === 'pigeon' ? M.plumagePigeon() : M.plumageColombe()
    oiseaux.forEach((oiseau) => {
      oiseau.plumage.color.copy(teinte.color)
      oiseau.plumage.roughness = teinte.roughness
      oiseau.plumage.metalness = teinte.metalness
    })
    teinte.dispose()
  }

  function lancerVol(hauteurBien, rayon) {
    const libres = oiseaux.filter((oiseau) => !oiseau.vol)
    if (libres.length === 0) return

    const combien = Math.min(tailleDuVol(), libres.length)
    // Les compagnons partagent le cap du meneur : ils sont tracés à partir du
    // même tirage, seulement décalés. Sans cela, trois oiseaux « en bande »
    // partiraient dans trois directions.
    const meneur = tracerVol(hauteurBien, rayon, { x: 0, y: 0 })

    for (let i = 0; i < combien; i += 1) {
      const oiseau = libres[i]
      if (i === 0) {
        oiseau.vol = meneur
      } else {
        oiseau.vol = {
          ...meneur,
          depart: meneur.depart.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3.4, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 3.4)),
          arrivee: meneur.arrivee.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3.4, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 3.4)),
          // Le même cap, la même allure, mais chacun son aile.
          phase: Math.random() * Math.PI * 2,
          battement: meneur.battement * lisser(0.9, 1.12, Math.random()),
          t: -Math.random() * 0.5,
        }
      }
      oiseau.groupe.visible = true
    }
  }

  return {
    groupe,

    poser(dt, { espece = 'pigeon', hauteurBien = 6, rayon = 46 } = {}) {
      accorderEspece(espece)

      prochain -= dt
      if (prochain <= 0) {
        lancerVol(hauteurBien, rayon)
        prochain = INTERVALLE + (Math.random() - 0.5) * 2 * INTERVALLE_ECART
      }

      oiseaux.forEach((oiseau) => {
        const vol = oiseau.vol
        if (!vol) return

        vol.t += dt
        if (vol.t >= vol.duree) {
          oiseau.vol = null
          oiseau.groupe.visible = false
          return
        }

        const t = Math.max(0, vol.t / vol.duree)
        const position = vol.depart.clone().lerp(vol.arrivee, t)
        // L'ONDULATION. Un oiseau ne tient pas une ligne : il monte sur trois
        // battements et redescend en planant. C'est ce mouvement-là, et non le
        // battement, qui le distingue d'un projectile.
        const houle = Math.sin(t * Math.PI * 2 * vol.periode + vol.phase) * vol.houle
        position.y += houle
        oiseau.groupe.position.copy(position)

        // Il regarde où il va, et s'incline du côté où il tourne.
        const cap = vol.arrivee.clone().sub(vol.depart).setY(0).normalize()
        oiseau.groupe.rotation.y = Math.atan2(cap.x, cap.z)
        oiseau.groupe.rotation.x = -houle * 0.06
        oiseau.groupe.rotation.z = Math.cos(t * Math.PI * 2 * vol.periode + vol.phase) * 0.22

        // LE BATTEMENT s'amortit quand l'oiseau descend : on ne rame pas en
        // planant. Les deux ailes montent ensemble, chacune de son côté.
        const plane = Math.max(0.25, 0.5 + Math.sin(t * Math.PI * 2 * vol.periode + vol.phase) * 0.5)
        const coup = Math.sin(vol.t * vol.battement + vol.phase) * 0.85 * plane
        oiseau.ailes.forEach(({ epaule, cote }) => {
          epaule.rotation.z = -cote * coup
        })
      })
    },

    detruire() {
      oiseaux.forEach((oiseau) => {
        oiseau.groupe.traverse((objet) => objet.geometry?.dispose())
        oiseau.plumage.dispose()
      })
    },
  }
}
