// Client de l'API Adresse (Base Adresse Nationale), service public français :
// gratuite, sans clé ni configuration. https://adresse.data.gouv.fr/api-doc/adresse
import { isMonacoAddress, looksLikeMonacoQuery, monacoSuggestion } from './monaco.js'

const ENDPOINT = 'https://api-adresse.data.gouv.fr/search/'

/** Seuil de déclenchement : en deçà, l'API renvoie du bruit. */
export const MIN_QUERY_LENGTH = 3

/** Délai d'anti-rebond entre la frappe et l'appel réseau (ms). */
export const SEARCH_DEBOUNCE_MS = 300

/**
 * Recherche d'adresses. Renvoie au plus `limit` propositions normalisées
 * (`{ id, label, postcode, city, lat, lon, monaco }`). Les coordonnées viennent de la géométrie
 * GeoJSON déjà présente dans la réponse : l'étape carte s'en sert pour se
 * centrer, sans jamais avoir à re-géocoder.
 *
 * `signal` permet d'annuler la requête précédente lorsque
 * l'utilisateur continue de taper — sans quoi une réponse lente pourrait
 * écraser une réponse plus récente.
 *
 * La Principauté de Monaco est ajoutée en tête de liste lorsque la saisie la
 * désigne : la BAN n'en connaît aucune adresse et répondrait, au mieux, par des
 * voies françaises homonymes (voir `looksLikeMonacoQuery`). Elle reste une
 * proposition parmi les autres — c'est le choix de l'utilisateur, jamais une
 * requalification, qui fait basculer le parcours (voir `src/lib/monaco.js`).
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

  const suggestions = (data?.features ?? [])
    .map((feature) => {
      // GeoJSON : [longitude, latitude] — l'ordre inverse de celui attendu par
      // les cartes, d'où la déstructuration explicite.
      const [lon, lat] = feature?.geometry?.coordinates ?? []

      const suggestion = {
        id: feature?.properties?.id,
        label: feature?.properties?.label,
        // Commune et code postal descendent jusqu'ici pour une seule raison :
        // reconnaître Monaco si la BAN venait un jour à en servir les adresses.
        postcode: feature?.properties?.postcode ?? null,
        city: feature?.properties?.city ?? null,
        lat: Number.isFinite(lat) ? lat : null,
        lon: Number.isFinite(lon) ? lon : null,
      }

      return { ...suggestion, monaco: isMonacoAddress(suggestion) }
    })
    .filter((suggestion) => Boolean(suggestion.label))

  // En tête, et sans jamais évincer une adresse française : la Principauté
  // s'ajoute à la liste, elle ne la remplace pas.
  const dejaMonegasque = suggestions.some((suggestion) => suggestion.monaco)

  return looksLikeMonacoQuery(query) && !dejaMonegasque
    ? [monacoSuggestion(), ...suggestions]
    : suggestions
}
