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

const TOUR = Math.PI * 2

/** Combien d'oiseaux la volière tient en réserve. */
const RESERVE = 6

/**
 * TEMPS ENTRE DEUX VOLS — sept secondes, et sept exactement.
 *
 * C'était cinq secondes à un tirage près, soit un vol toutes les trois à sept
 * secondes. Le ciel était trop fréquenté : à ce rythme, on finissait par
 * regarder les oiseaux, ce qui est précisément ce qu'ils ne doivent pas
 * provoquer. Sept secondes, sans tirage : le ciel se vide entre deux passages,
 * et chaque vol redevient quelque chose qu'on aperçoit.
 */
const INTERVALLE = 7

/**
 * DEUX VOLS DE SUITE NE SE RESSEMBLENT JAMAIS, et c'est réglé ici.
 *
 * Le cap et l'altitude étaient tirés au sort indépendamment à chaque vol : deux
 * tirages voisins donnaient deux passages identiques, et un oiseau qui repasse
 * au même endroit dans le même sens se lit comme une boucle — le défaut qu'on
 * cherche justement à éviter avec un ciel animé.
 *
 * Chaque vol part donc d'un CAP écarté d'au moins un tiers de tour de celui qui
 * le précède, et d'une ALTITUDE écartée d'au moins quatre dixièmes de la plage
 * disponible. Le hasard décide de tout le reste — de quel côté, de combien
 * au-delà du minimum, et à quelle allure.
 */
const ECART_CAP_MIN = TOUR / 3
const ECART_ALTITUDE_MIN = 0.4

/** Un oiseau seul, deux, ou trois — jamais davantage : ce serait un lâcher. */
const tailleDuVol = () => (Math.random() < 0.52 ? 1 : Math.random() < 0.78 ? 2 : 3)

const lisser = (a, b, t) => a + (b - a) * t

/**
 * Un cap écarté d'au moins `ECART_CAP_MIN` du précédent, de l'un ou l'autre
 * côté. Le premier vol de la scène n'en a pas : il part où il veut.
 */
function tirerCap(precedent) {
  if (precedent === null) return Math.random() * TOUR
  return precedent + ECART_CAP_MIN + Math.random() * (TOUR - 2 * ECART_CAP_MIN)
}

/**
 * Une part d'altitude (0 à 1) écartée d'au moins `ECART_ALTITUDE_MIN` de la
 * précédente. On tire dans ce qui reste de la plage de part et d'autre de la
 * bande interdite, au prorata : sans ce prorata, un vol passé tout en haut
 * renverrait le suivant tout en bas une fois sur deux.
 */
function tirerAltitude(precedente) {
  if (precedente === null) return Math.random()

  const sousLaBande = Math.max(0, precedente - ECART_ALTITUDE_MIN)
  const surLaBande = Math.max(0, 1 - (precedente + ECART_ALTITUDE_MIN))
  // Bande interdite plus large que la plage : impossible avec les valeurs
  // retenues, mais on rend alors le point le plus éloigné plutôt que rien.
  if (sousLaBande + surLaBande <= 0) return precedente > 0.5 ? 0 : 1

  const tirage = Math.random() * (sousLaBande + surLaBande)
  return tirage < sousLaBande ? tirage : precedente + ECART_ALTITUDE_MIN + (tirage - sousLaBande)
}

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
 * Le cap et l'altitude sont tirés à l'écart de ceux du vol précédent (voir
 * `tirerCap` et `tirerAltitude`) : un passage ne se fait jamais dans la même
 * direction ni à la même hauteur que celui d'avant. L'oiseau entre par un côté
 * et sort par l'opposé en coupant le champ en biais, et il ne finit jamais à la
 * hauteur où il a commencé.
 *
 * `decalage` écarte les compagnons de vol du meneur, latéralement et en
 * hauteur : une bande d'oiseaux n'est ni une file ni un peloton.
 */
function tracerVol(hauteurBien, rayon, decalage, precedent) {
  const cap = tirerCap(precedent.cap)
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
  const part = tirerAltitude(precedent.part)
  const altitude = plancher + hauteurBien * lisser(0, 0.9, part)

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
    // Le cap et la part d'altitude voyagent avec le vol : c'est la volière qui
    // les retient pour en écarter le vol suivant.
    cap,
    part,
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
  /** Le cap et l'altitude du dernier vol lancé — voir `tirerCap`. */
  const dernier = { cap: null, part: null }

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
    const meneur = tracerVol(hauteurBien, rayon, { x: 0, y: 0 }, dernier)
    dernier.cap = meneur.cap
    dernier.part = meneur.part

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
        prochain = INTERVALLE
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
