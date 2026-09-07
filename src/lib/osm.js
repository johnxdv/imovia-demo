// Emprises bâties de la Principauté, via OpenStreetMap.
//
// Le cadastre monégasque n'est pas diffusé : il se demande sur papier, extrait
// par extrait, et n'existe sous aucune forme d'API. La BD TOPO® de l'IGN, elle,
// s'arrête à la frontière — le parcours monégasque n'avait donc longtemps aucun
// contour à faire cliquer, et sautait l'étape carte.
//
// OpenStreetMap couvre la Principauté bâtiment par bâtiment, et l'API Overpass
// permet de l'interroger par emprise, sans clé ni quota nominatif. C'est une
// base communautaire et non gouvernementale : le tracé peut manquer sur une
// construction récente, ou dater d'avant une surélévation. La carte le prévoit
// — un clic hors de toute emprise reste possible (voir `BuildingMap`).
//
// L'appel part du navigateur, à la différence du géocodage Nominatim qui passe
// par une fonction serverless (voir `api/monaco-adresses.js`). Ce n'est pas une
// incohérence : Overpass sert délibérément un en-tête CORS ouvert pour l'usage
// direct depuis une page web, ne réclame pas d'en-tête `User-Agent`, et plafonne
// par adresse IP. Depuis le navigateur, chaque visiteur consomme son propre
// quota ; derrière une fonction serverless, tout le trafic se concentrerait sur
// les quelques IP de sortie de l'hébergeur — un seul visiteur un peu insistant
// y ferait tomber les autres.

import { BUILDINGS_RADIUS_M, boundingBox, pointInRing } from './geo'

/**
 * Instances publiques de l'API Overpass, essayées dans l'ordre.
 *
 * Les serveurs publics sont bénévoles et connaissent des indisponibilités
 * bien plus fréquentes que la Géoplateforme : un miroir de repli évite qu'une
 * maintenance sur l'instance principale prive l'étape de ses contours.
 */
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

/** Mention d'attribution imposée par la licence ODbL. */
export const OSM_ATTRIBUTION = '© OpenStreetMap (ODbL)'

/**
 * Budget serveur, annoncé à Overpass dans la requête elle-même : passé ce
 * délai, il abandonne de son côté plutôt que de faire attendre pour rien.
 */
const OVERPASS_TIMEOUT_S = 20

/**
 * Budget client, par instance interrogée. Plus court que celui annoncé au
 * serveur : mieux vaut basculer sur le miroir que d'attendre la fin d'un
 * calcul qui traîne. En pratique la réponse arrive en moins d'une seconde.
 */
const FETCH_TIMEOUT_MS = 9000

/** Garde-fou : au-delà, la réponse pèserait plus qu'elle n'aiderait. */
const MAX_BUILDINGS = 400

/**
 * Requête Overpass QL — les emprises bâties d'une zone.
 *
 * `building` porte le bâti dans OpenStreetMap ; `building=no` existe pour dire
 * explicitement qu'un contour n'en est pas un, et doit être écarté. Deux types
 * d'objets le portent : la plupart des bâtiments sont de simples chemins
 * fermés (`way`), ceux à cour intérieure ou à emprise composite sont des
 * relations « multipolygone ».
 *
 * `out geom` demande les coordonnées avec les objets — sans quoi il faudrait
 * une seconde requête pour résoudre les nœuds, et recomposer les tracés à la
 * main.
 */
function overpassQuery({ south, west, north, east }) {
  const bbox = `${south},${west},${north},${east}`
  const filtre = '["building"]["building"!="no"]'

  return (
    `[out:json][timeout:${OVERPASS_TIMEOUT_S}];` +
    `(way${filtre}(${bbox});relation${filtre}(${bbox}););` +
    `out geom ${MAX_BUILDINGS};`
  )
}

/** Coordonnées Overpass (`{ lat, lon }`) → couple GeoJSON `[lon, lat]`. */
const toPosition = (node) => [node.lon, node.lat]

/** Deux extrémités de tracé se rejoignent-elles ? Comparaison exacte : les
 *  chemins d'une relation partagent le nœud, donc la valeur au bit près. */
const samePoint = (a, b) => a?.[0] === b?.[0] && a?.[1] === b?.[1]

/** Anneau fermé au sens GeoJSON : premier et dernier point confondus. */
function closeRing(ring) {
  if (ring.length < 3) return null
  return samePoint(ring[0], ring[ring.length - 1]) ? ring : [...ring, ring[0]]
}

/**
 * Recompose des anneaux fermés à partir des tronçons d'une relation.
 *
 * Une relation multipolygone ne porte pas ses contours d'un bloc : le pourtour
 * d'un immeuble peut être découpé en plusieurs chemins, dans un ordre
 * quelconque et parfois à rebours (le second commence là où le premier
 * s'achève, ou bien s'y termine). On les raboute donc par leurs extrémités,
 * en retournant ceux qui le demandent, jusqu'à revenir au point de départ.
 *
 * Un tronçon qui ne se raccorde à rien — relation incomplète, ou tronquée par
 * l'emprise de la requête — est abandonné : un anneau ouvert ne décrit aucune
 * surface.
 */
function assembleRings(segments) {
  const restants = segments.filter((segment) => segment.length >= 2)
  const rings = []

  while (restants.length > 0) {
    let ring = restants.shift()

    // Rabout successif : à chaque tour, le tronçon dont une extrémité touche
    // la fin de l'anneau en cours vient s'y ajouter.
    let progresse = true
    while (progresse && !samePoint(ring[0], ring[ring.length - 1])) {
      progresse = false
      const fin = ring[ring.length - 1]

      for (let i = 0; i < restants.length; i += 1) {
        const candidat = restants[i]
        const debutTouche = samePoint(candidat[0], fin)
        const finTouche = samePoint(candidat[candidat.length - 1], fin)
        if (!debutTouche && !finTouche) continue

        const suite = debutTouche ? candidat : [...candidat].reverse()
        // `slice(1)` : le point de jonction est déjà en fin d'anneau.
        ring = ring.concat(suite.slice(1))
        restants.splice(i, 1)
        progresse = true
        break
      }
    }

    const ferme = samePoint(ring[0], ring[ring.length - 1]) ? closeRing(ring) : null
    if (ferme) rings.push(ferme)
  }

  return rings
}

/**
 * Anneaux extérieurs et intérieurs d'une relation → polygones GeoJSON.
 *
 * Chaque trou est rattaché au premier contour extérieur qui le contient : le
 * rôle `inner` dit qu'un anneau est un trou, pas de quel bâtiment. Un trou
 * orphelin — contour extérieur hors emprise — est écarté plutôt que rattaché
 * au hasard.
 */
function toPolygons(outerRings, innerRings) {
  const polygons = outerRings.map((outer) => [outer])
  if (polygons.length === 0) return []

  innerRings.forEach((inner) => {
    const hote = polygons.find(([outer]) => ringContainsRing(outer, inner))
    hote?.push(inner)
  })

  return polygons
}

/** Un anneau en contient-il un autre ? Testé sur un seul sommet : les anneaux
 *  d'une même relation ne se croisent pas, il suffit donc d'un point. */
function ringContainsRing(outer, inner) {
  const [lon, lat] = inner[0]
  return pointInRing(lon, lat, outer)
}

/** Un ou plusieurs polygones → géométrie GeoJSON, ou `null` s'il n'y en a pas. */
function toGeometry(polygons) {
  if (polygons.length === 0) return null
  if (polygons.length === 1) return { type: 'Polygon', coordinates: polygons[0] }
  return { type: 'MultiPolygon', coordinates: polygons }
}

/**
 * Attributs conservés d'un bâtiment OpenStreetMap.
 *
 * Rien de tout cela n'entre dans le calcul monégasque — celui-ci ne retient
 * que le type déclaré et la surface saisie au curseur (voir
 * `api/estimation.js`). On garde donc le strict nécessaire pour situer le
 * bâtiment : le mot-clé `building`, le nombre de niveaux et la hauteur quand
 * ils sont renseignés, et le nom quand le bâtiment en porte un.
 *
 * Nommer ces champs comme leurs équivalents BD TOPO® serait trompeur : ils ne
 * viennent ni de la même source ni de la même méthode de levé, et le moteur ne
 * doit surtout pas les confondre avec ceux du parcours français.
 */
function toProperties(tags = {}) {
  return {
    osmBuilding: tags.building ?? null,
    osmLevels: tags['building:levels'] ?? null,
    osmHeight: tags.height ?? null,
    osmName: tags.name ?? null,
  }
}

/** Élément Overpass (chemin ou relation) → entité GeoJSON, ou `null`. */
function toFeature(element) {
  let geometry = null

  if (element.type === 'way') {
    const ring = closeRing((element.geometry ?? []).filter(Boolean).map(toPosition))
    geometry = ring ? { type: 'Polygon', coordinates: [ring] } : null
  } else if (element.type === 'relation' && element.tags?.type === 'multipolygon') {
    // Seules les relations « multipolygone » décrivent une emprise. Une
    // relation `type=site` en porte parfois aussi le mot-clé `building` — le
    // Nouveau Musée National, par exemple, y regroupe deux villas et leur
    // jardin. Ses membres bâtis sont eux-mêmes des chemins tagués `building`,
    // que la requête ramène de leur côté : la traiter ici ne ferait qu'ajouter
    // le jardin aux contours cliquables.
    const membres = (element.members ?? []).filter((membre) => membre?.geometry?.length)
    const segments = (role) =>
      membres
        .filter((membre) => membre.role === role)
        .map((membre) => membre.geometry.filter(Boolean).map(toPosition))

    // Un membre sans rôle explicite vaut contour extérieur : c'est la
    // convention OpenStreetMap pour les relations mal renseignées.
    const outerSegments = [...segments('outer'), ...segments('')]
    geometry = toGeometry(toPolygons(assembleRings(outerSegments), assembleRings(segments('inner'))))
  }

  if (!geometry) return null

  return {
    type: 'Feature',
    // Identifiant OpenStreetMap, stable dans le temps et lisible tel quel
    // (`way/94252399`) — la carte s'en sert pour suivre le bâtiment survolé.
    id: `${element.type}/${element.id}`,
    properties: toProperties(element.tags),
    geometry,
  }
}

/** Réponse Overpass → `FeatureCollection` prête pour Leaflet. */
export function toFeatureCollection(data) {
  return {
    type: 'FeatureCollection',
    features: (data?.elements ?? []).map(toFeature).filter(Boolean),
  }
}

/**
 * Interroge une instance Overpass. Lève sur panne réseau, réponse non 2xx
 * (429 en cas de dépassement de rythme, 504 quand l'instance est saturée) ou
 * réponse illisible — l'appelant décide alors s'il tente le miroir suivant.
 */
async function queryOverpass(endpoint, query, signal) {
  const budget = AbortSignal.timeout(FETCH_TIMEOUT_MS)

  const response = await fetch(endpoint, {
    method: 'POST',
    // Overpass attend sa requête dans un champ `data` de formulaire ; le corps
    // brut lui vaut un refus sur certaines instances.
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ data: query }),
    signal: signal ? AbortSignal.any([signal, budget]) : budget,
  })

  if (!response.ok) {
    throw new Error(`Overpass — réponse ${response.status}`)
  }

  const data = await response.json().catch(() => null)

  // Une instance surchargée peut répondre 200 avec un rapport d'erreur en
  // guise de corps : c'est la présence d'`elements` qui fait foi, pas le statut.
  if (!Array.isArray(data?.elements)) {
    throw new Error('Overpass — réponse inattendue')
  }

  return data
}

/**
 * Emprises des bâtiments monégasques autour d'un point, en GeoJSON prêt pour
 * Leaflet (`FeatureCollection` de polygones en WGS 84).
 *
 * Même contrat que `fetchBuildings` côté français (voir `src/lib/ign.js`) :
 * `signal` annule la requête si l'utilisateur quitte l'étape avant la réponse,
 * et l'échec de toutes les instances lève — la carte bascule alors sur son
 * repli, où l'utilisateur désigne son bien à main levée.
 */
export async function fetchMonacoBuildings(lat, lon, { signal } = {}) {
  const query = overpassQuery(boundingBox(lat, lon, BUILDINGS_RADIUS_M))
  let derniereErreur = null

  for (const endpoint of ENDPOINTS) {
    try {
      return toFeatureCollection(await queryOverpass(endpoint, query, signal))
    } catch (error) {
      // Départ de l'utilisateur : il n'y a plus de miroir à essayer.
      if (signal?.aborted) throw error
      derniereErreur = error
    }
  }

  throw derniereErreur ?? new Error('Overpass — aucune instance disponible')
}
