import data from '../data/properties.json'

// Source unique de vérité pour les biens.
//
// `properties.json` est entièrement produit par l'import du flux Modelo
// (`npm run sync:modelo`, voir `scripts/sync-modelo.mjs`) : il n'est jamais
// modifié à la main, et chaque import le réécrit en entier.
export const allProperties = data

/**
 * Statuts qui restent diffusés dans les listes. Ils viennent du champ `etat`
 * du flux Modelo : 1 « sur le marché », 2 « sous compromis », 3 « vendu/loué »
 * (traduction dans `scripts/_lib/modelo.mjs`).
 *
 * Un bien sous compromis reste affiché — la vente n'est pas signée et l'usage
 * de la profession est de le montrer, marqué. Un bien vendu sort des listes et
 * ne subsiste que dans `soldProperties()`.
 */
const STATUTS_DIFFUSES = ['disponible', 'sous-compromis']

/** Le bien doit-il apparaître dans les listes (Acheter, Louer, accueil) ? */
export function isDiffuse(property) {
  return STATUTS_DIFFUSES.includes(property.statut)
}

export function getByReference(reference) {
  return allProperties.find((p) => p.reference === reference)
}

/**
 * Biens disponibles pour une transaction donnée ('vente' | 'location').
 */
export function availableFor(typeTransaction) {
  return allProperties.filter((p) => p.typeTransaction === typeTransaction && isDiffuse(p))
}

export function soldProperties() {
  return allProperties.filter((p) => p.statut === 'vendu')
}

/**
 * Derniers biens disponibles (vente + location, tous types confondus), triés
 * par date de publication décroissante — jamais par ordre du tableau. Utilisé
 * pour la page d'accueil et la colonne « Biens récents » du footer ; se
 * branchera tel quel sur le flux Modelo une fois `datePublication` alimenté
 * par la synchro réelle.
 */
export function latestAvailable(limit = 6) {
  return allProperties
    .filter(isDiffuse)
    .slice()
    .sort((a, b) => new Date(b.datePublication) - new Date(a.datePublication))
    .slice(0, limit)
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
