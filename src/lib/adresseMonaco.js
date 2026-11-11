// Géocodage par Nominatim (OpenStreetMap) — pour la Principauté, et en
// secours pour la France.
//
// La BAN ne couvre pas la Principauté (voir `src/lib/monaco.js`) : sans cette
// source, le champ d'adresse ne pouvait proposer que « Principauté de Monaco »
// d'un bloc. Nominatim (OpenStreetMap), lui, en connaît les voies.
//
// L'appel passe par `api/monaco-adresses.js` et non par le navigateur : la
// politique d'usage de Nominatim réclame un `User-Agent` identifiant
// l'application, en-tête qu'un navigateur refuse d'écrire, et un rythme
// plafonné qui se tient mieux depuis le serveur (cache et file d'attente).
//
// LE MÊME CANAL SERT DÉSORMAIS LA FRANCE
//
// Quand le géocodeur de la Géoplateforme ne répond pas, `src/lib/adresse.js`
// se rabat ici avec `pays: 'fr'`. Le nom de la route n'a pas suivi : la
// renommer invaliderait l'adresse qu'appellent les pages déjà servies, le
// temps qu'un déploiement les remplace. Elle géocode ce qu'on lui demande, son
// nom dit seulement d'où elle vient.
//
// Conséquence à connaître : la file d'attente du serveur est commune et tenue
// à une requête par seconde. En secours de la France entière, les saisies
// simultanées s'y rangent l'une derrière l'autre ; celles qui dépassent le
// budget rendent une liste vide, et le champ propose alors la saisie libre.

const ENDPOINT = '/api/monaco-adresses'

/**
 * Filet côté client. Le serveur s'impose déjà un budget plus court ; ce délai
 * ne couvre que le cas où il ne répondrait pas du tout. Court à dessein : ces
 * propositions s'ajoutent à une liste déjà affichée.
 */
const TIMEOUT_MS = 6000

/**
 * Propositions pour une saisie, au format des suggestions de la BAN
 * (`{ id, label, postcode, city, lat, lon, monaco }`), ou `[]`. `pays` vaut
 * `'mc'` pour la Principauté, `'fr'` pour la France en secours de l'IGN.
 *
 * Ne rejette jamais, hors annulation explicite : une panne du géocodage ne
 * doit pas priver l'utilisateur des propositions françaises, ni de la
 * proposition générique dont l'appelant dispose en repli.
 */
export async function searchOsmAddresses(query, { pays = 'mc', limit, signal } = {}) {
  const q = String(query ?? '').trim()
  if (q.length < 3) return []

  const timeout = AbortSignal.timeout(TIMEOUT_MS)

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, pays, ...(limit ? { limit } : {}) }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })

    if (!response.ok) return []

    const data = await response.json().catch(() => null)
    const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : []

    return suggestions.filter((suggestion) => Boolean(suggestion?.label))
  } catch (error) {
    if (signal?.aborted) throw error
    return []
  }
}

/** Les adresses de la Principauté — le cas d'origine, inchangé. */
export const searchMonacoAddresses = (query, { signal } = {}) =>
  searchOsmAddresses(query, { pays: 'mc', signal })
