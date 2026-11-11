// Client du géocodeur de la Base Adresse Nationale.
//
// L'ADRESSE A CHANGÉ, ET L'ANCIENNE NE REDIRIGE PAS UTILEMENT
//
// `api-adresse.data.gouv.fr` a été décommissionné : la BAN est passée à l'IGN,
// et l'ancien domaine répond désormais 302 vers `http://sorry.data.gouv.fr`,
// lui-même en 503. Deux raisons pour qu'un navigateur n'en tire rien : la cible
// est en clair alors que le site est en HTTPS — redirection bloquée comme
// contenu mixte — et elle ne sert de toute façon aucune adresse. Le champ de
// saisie affichait donc sa panne réseau à chaque frappe.
//
// Le service de remplacement est celui de la Géoplateforme. Mêmes paramètres,
// même GeoJSON en sortie : le mappage ci-dessous est inchangé.
//
// POURQUOI UN SECOND GÉOCODEUR DERRIÈRE
//
// Parce que celui-ci tombe aussi. Au moment de cette correction, toutes les
// routes de `data.geopf.fr/geocodage` rendaient 504 — `getCapabilities`
// comprise, donc une panne du service et non un défaut de requête. Nominatim,
// déjà employé pour la Principauté, prend le relais pour la France entière
// quand l'IGN ne répond pas. Il rend de vraies coordonnées : le parcours
// continue normalement, la carte se centre, l'estimation vaut la même chose.
import { searchMonacoAddresses, searchOsmAddresses } from './adresseMonaco.js'
import {
  isMonacoAddress,
  looksLikeMonacoQuery,
  mentionsMonaco,
  monacoSuggestion,
} from './monaco.js'

const ENDPOINT = 'https://data.geopf.fr/geocodage/search/'

/**
 * Budget d'un appel au géocodeur.
 *
 * Quatre secondes : au-delà, une liste de suggestions n'a plus d'intérêt —
 * l'utilisateur a fini de taper. La panne constatée répondait en 2,2 s, un
 * délai plus court aurait donc tranché avant même de connaître le verdict.
 */
const TIMEOUT_MS = 4000

/**
 * Une seule reprise, et sans attente entre les deux.
 *
 * Elle couvre ce qu'elle peut couvrir : une coupure isolée, un 502 passager,
 * un dépassement de la limite d'un appel par seconde que la Géoplateforme
 * annonce dans ses en-têtes (`x-ratelimit-limit-second: 1`). Elle ne sert à
 * rien contre une panne franche du service — c'est le rôle du second
 * géocodeur, pas celui d'une reprise.
 */
const TENTATIVES = 2

/**
 * Un appel au géocodeur IGN, borné dans le temps.
 *
 * L'annulation demandée par l'appelant et l'expiration du budget sont
 * fusionnées : la première doit remonter telle quelle — l'appelant la
 * reconnaît et l'ignore — la seconde compte comme un échec ordinaire.
 */
async function appelIgn(query, limit, signal) {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  const url = `${ENDPOINT}?q=${encodeURIComponent(query)}&limit=${limit}&autocomplete=1`

  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  })

  if (!response.ok) throw new Error(`Géocodage IGN — réponse ${response.status}`)
  return response.json()
}

/**
 * Le GeoJSON du géocodeur, ou `null` si le service est hors d'atteinte.
 *
 * Ne rejette que sur annulation par l'appelant : tout le reste est un échec à
 * traiter, pas une exception à propager — c'est ce qui permet au second
 * géocodeur de prendre la main sans que le champ affiche une panne.
 */
async function geoJsonIgn(query, limit, signal) {
  for (let tentative = 1; tentative <= TENTATIVES; tentative += 1) {
    try {
      return await appelIgn(query, limit, signal)
    } catch (error) {
      if (signal?.aborted) throw error
      if (tentative === TENTATIVES) {
        console.warn(`[adresse] géocodeur IGN injoignable — ${error?.message ?? error}`)
        return null
      }
    }
  }

  return null
}

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
 * Les adresses de la Principauté de Monaco viennent d'ailleurs : la BAN n'en
 * connaît aucune et répondrait, au mieux, par des voies françaises homonymes.
 * Quand la saisie désigne la Principauté (voir `looksLikeMonacoQuery`), un
 * second géocodeur prend le relais pour elle seule — Nominatim, via
 * `src/lib/adresseMonaco.js` — et ses rues s'ajoutent en tête de liste ; à
 * défaut de réponse, la proposition générique « Principauté de Monaco » tient
 * ce rôle comme auparavant. Ces adresses restent des propositions parmi les
 * autres : c'est le choix de l'utilisateur, jamais une requalification, qui
 * fait basculer le parcours (voir `src/lib/monaco.js`).
 *
 * Lève une erreur en cas de panne réseau ou de réponse non 2xx ; l'annulation
 * remonte une `AbortError`, à ignorer côté appelant.
 */
export async function searchAddresses(query, { limit = 5, signal } = {}) {
  const data = await geoJsonIgn(query, limit, signal)

  // Géocodeur IGN hors service : Nominatim rend des propositions au même
  // format, coordonnées comprises. Si lui non plus ne répond pas, la liste est
  // vide et c'est l'appelant qui propose la saisie libre — jamais une erreur.
  if (data === null) {
    const secours = await searchOsmAddresses(query, { pays: 'fr', limit, signal })
    if (secours.length > 0) return secours
    throw new Error('Géocodage indisponible')
  }

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

  // Aucune adresse française ne peut venir de la BAN pour la Principauté : si
  // l'une d'elles se dit monégasque, la question est déjà tranchée.
  if (suggestions.some((suggestion) => suggestion.monaco)) return suggestions

  const designeMonaco = looksLikeMonacoQuery(query)

  // Deux niveaux de déclenchement, pour deux traitements différents :
  //
  // - la saisie *désigne* la Principauté : ses adresses passent en tête ;
  // - elle ne fait que l'évoquer (« Monaco » ailleurs qu'en fin de saisie), et
  //   la BAN n'a rien trouvé : on complète, mais derrière — les adresses
  //   françaises restent prioritaires, elles ne sont jamais reléguées.
  const complete = !designeMonaco && suggestions.length === 0 && mentionsMonaco(query)
  if (!designeMonaco && !complete) return suggestions

  // Le géocodage monégasque ne rejette pas (hors annulation) : une panne rend
  // une liste vide, et la proposition générique reprend son rôle d'antan.
  const monegasques = await searchMonacoAddresses(query, { signal })
  const enTete = monegasques.length > 0 ? monegasques.slice(0, limit) : [monacoSuggestion()]

  return designeMonaco ? [...enTete, ...suggestions] : [...suggestions, ...enTete]
}
