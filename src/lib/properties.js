import data from '../data/properties.json'

// Source unique de vérité pour les biens (données mockées, structure alignée
// sur le futur flux XML).
export const allProperties = data

export function getByReference(reference) {
  return allProperties.find((p) => p.reference === reference)
}

/**
 * Biens disponibles pour une transaction donnée ('vente' | 'location').
 */
export function availableFor(typeTransaction) {
  return allProperties.filter(
    (p) => p.typeTransaction === typeTransaction && p.statut === 'disponible',
  )
}

export function soldProperties() {
  return allProperties.filter((p) => p.statut === 'vendu')
}

/**
 * Derniers biens disponibles (vente + location), pour la page d'accueil.
 */
export function latestAvailable(limit = 6) {
  return allProperties.filter((p) => p.statut === 'disponible').slice(0, limit)
}

/**
 * Valeurs distinctes d'un champ, sur un sous-ensemble de biens — sert à
 * construire les listes de filtres.
 */
export function distinctValues(list, key) {
  return [...new Set(list.map((p) => p[key]))].sort((a, b) =>
    String(a).localeCompare(String(b), 'fr'),
  )
}

/**
 * Filtrage des biens selon les critères de recherche.
 * Tous les critères sont optionnels.
 */
export function filterProperties(list, { typeBien, ville, budgetMax, surfaceMin } = {}) {
  return list.filter((p) => {
    if (typeBien && p.typeBien !== typeBien) return false
    if (ville && p.ville !== ville) return false
    if (budgetMax && p.prix > Number(budgetMax)) return false
    if (surfaceMin && p.surface < Number(surfaceMin)) return false
    return true
  })
}
