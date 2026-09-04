const EARTH_RADIUS_M = 6378137

const toRad = (deg) => (deg * Math.PI) / 180

/**
 * Aire d'un anneau de coordonnées [lon, lat], en m², par la formule de
 * l'excès sphérique. Le signe traduit le sens de parcours : positif pour un
 * contour extérieur, négatif pour un trou — ce qui permet de sommer les
 * anneaux d'un polygone sans les traiter à part.
 */
function ringAreaM2(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return 0

  let total = 0

  for (let i = 0; i < ring.length; i += 1) {
    const [lon1, lat1] = ring[i]
    const [lon2, lat2] = ring[(i + 1) % ring.length]
    total += (toRad(lon2) - toRad(lon1)) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)))
  }

  return (total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2
}

/**
 * Emprise au sol d'une géométrie GeoJSON (`Polygon` ou `MultiPolygon`) en m².
 *
 * Sert à rapprocher le bâtiment cliqué de la bonne fiche BDNB lorsque plusieurs
 * bâtiments partagent une parcelle : à défaut d'identifiant commun entre les
 * deux bases, la surface au sol est le discriminant le plus fiable dont on
 * dispose sans reprojeter les géométries.
 *
 * La valeur absolue de la somme couvre les anneaux orientés à l'envers, que
 * l'on rencontre dans des données réelles.
 */
export function footprintAreaM2(geometry) {
  if (!geometry) return null

  const polygons =
    geometry.type === 'MultiPolygon'
      ? geometry.coordinates
      : geometry.type === 'Polygon'
        ? [geometry.coordinates]
        : []

  if (polygons.length === 0) return null

  const area = polygons.reduce(
    (sum, rings) => sum + rings.reduce((acc, ring) => acc + ringAreaM2(ring), 0),
    0,
  )

  return Math.abs(area)
}
