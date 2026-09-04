// Client de l'API Adresse (Base Adresse Nationale), service public français :
// gratuite, sans clé ni configuration. https://adresse.data.gouv.fr/api-doc/adresse
const ENDPOINT = 'https://api-adresse.data.gouv.fr/search/'

/** Seuil de déclenchement : en deçà, l'API renvoie du bruit. */
export const MIN_QUERY_LENGTH = 3

/** Délai d'anti-rebond entre la frappe et l'appel réseau (ms). */
export const SEARCH_DEBOUNCE_MS = 300

/**
 * Recherche d'adresses. Renvoie au plus `limit` propositions normalisées
 * (`{ id, label }`). `signal` permet d'annuler la requête précédente lorsque
 * l'utilisateur continue de taper — sans quoi une réponse lente pourrait
 * écraser une réponse plus récente.
 *
 * Lève une erreur en cas de panne réseau ou de réponse non 2xx ; l'annulation
 * remonte une `AbortError`, à ignorer côté appelant.
 */
export async function searchAddresses(query, { limit = 5, signal } = {}) {
  const response = await fetch(`${ENDPOINT}?q=${encodeURIComponent(query)}&limit=${limit}`, {
    signal,
  })

  if (!response.ok) {
    throw new Error(`API Adresse — réponse ${response.status}`)
  }

  const data = await response.json()

  return (data?.features ?? [])
    .map((feature) => ({ id: feature?.properties?.id, label: feature?.properties?.label }))
    .filter((suggestion) => Boolean(suggestion.label))
}
