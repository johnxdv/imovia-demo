// Fonction serverless Vercel — géocodage des adresses monégasques.
//
// La Base Adresse Nationale s'arrête à la frontière : interrogée sur une rue
// de la Principauté, elle ne renvoie rien, ou des voies françaises homonymes.
// Le parcours monégasque savait déjà se passer d'elle, mais au prix d'une
// adresse unique — « Principauté de Monaco » en un seul bloc, sans rue.
//
// Nominatim (OpenStreetMap) couvre Monaco rue par rue et se substitue à la BAN
// pour ce seul cas. Le passage par une fonction serverless n'est pas une
// précaution de style : la politique d'usage de Nominatim impose un en-tête
// `User-Agent` identifiant l'application, et un navigateur ne laisse pas
// écrire cet en-tête — la requête partirait anonyme, exposée à un blocage.
// Le serveur, lui, l'envoie. Il porte aussi les deux autres exigences : un
// rythme plafonné à une requête par seconde et un cache qui évite de
// redemander ce qu'on vient d'obtenir.

const ENDPOINT = 'https://nominatim.openstreetmap.org/search'

/** Identifie l'application et son contact, comme l'exige la politique d'usage. */
const USER_AGENT = 'ImmoviaEstimation/1.0 (+https://immo-via.com; contact@immo-via.com)'

/** Nombre de propositions demandées — celui de la liste côté front. */
const LIMIT = 5

/** Plafond imposé par Nominatim : une requête par seconde, jamais davantage. */
const MIN_INTERVAL_MS = 1000

/**
 * Au-delà, on n'attend plus : mieux vaut rendre la main au front, qui retombe
 * sur la proposition générique, que de faire patienter la liste de suggestions.
 */
const BUDGET_MS = 4000

/**
 * Cache mémoire des saisies déjà géocodées, à l'échelle de l'instance.
 *
 * Une frappe d'adresse repasse sans cesse par les mêmes préfixes (retour
 * arrière, correction d'une lettre) : autant de requêtes que Nominatim n'a pas
 * à voir. Durée courte et taille bornée — le nom d'une rue ne change pas en
 * une heure, mais une instance serverless ne doit pas grossir indéfiniment.
 */
const CACHE_TTL_MS = 60 * 60 * 1000
const CACHE_MAX = 200
const cache = new Map()

function cacheGet(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.time > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return entry.suggestions
}

function cacheSet(key, suggestions) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value)
  cache.set(key, { time: Date.now(), suggestions })
}

/**
 * File d'attente : les appels se suivent, espacés d'au moins `MIN_INTERVAL_MS`.
 *
 * Le rythme n'est tenu qu'à l'échelle d'une instance — Vercel peut en faire
 * tourner plusieurs. C'est suffisant ici : le géocodage monégasque ne concerne
 * qu'une poignée de saisies, et l'anti-rebond du champ (300 ms) plus le cache
 * ci-dessus écartent l'essentiel du trafic en amont.
 */
let lastCall = 0
let queue = Promise.resolve()

function throttled(task) {
  const run = queue.then(async () => {
    const wait = lastCall + MIN_INTERVAL_MS - Date.now()
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
    lastCall = Date.now()
    return task()
  })

  // La file ne doit pas se rompre sur un échec : on la fait avancer quoi qu'il
  // arrive, l'erreur étant rendue à l'appelant par `run`.
  queue = run.then(
    () => undefined,
    () => undefined,
  )

  return run
}

/**
 * Réponse Nominatim → proposition du même format que celles de la BAN
 * (voir `src/lib/adresse.js`). `monaco: true` est acquis : la recherche est
 * restreinte à la Principauté par `countrycodes=mc`.
 */
function toSuggestion(place) {
  const lat = Number(place?.lat)
  const lon = Number(place?.lon)
  const label = typeof place?.display_name === 'string' ? place.display_name.trim() : ''
  if (!label) return null

  return {
    id: `osm-${place?.osm_type ?? 'x'}-${place?.osm_id ?? label}`,
    label,
    // Nominatim ne porte pas toujours le code postal ; il n'y en a qu'un dans
    // la Principauté, et le front s'en sert pour reconnaître le parcours.
    postcode: place?.address?.postcode ?? '98000',
    city: 'Monaco',
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    monaco: true,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée.' })
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const query = typeof body.q === 'string' ? body.q.trim() : ''

  if (query.length < 3) {
    return res.status(400).json({ ok: false, error: 'Saisie trop courte.' })
  }

  const key = query.toLowerCase()
  const cached = cacheGet(key)
  if (cached) return res.status(200).json({ ok: true, suggestions: cached })

  const controller = new AbortController()
  const budget = setTimeout(() => controller.abort(), BUDGET_MS)

  try {
    const url =
      `${ENDPOINT}?q=${encodeURIComponent(query)}` +
      `&countrycodes=mc&format=json&addressdetails=1&limit=${LIMIT}`

    const response = await throttled(() =>
      fetch(url, {
        headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'fr' },
        signal: controller.signal,
      }),
    )

    if (!response.ok) {
      throw new Error(`Nominatim — réponse ${response.status}`)
    }

    const data = await response.json()

    // Dédoublonnage par libellé : une même voie est découpée en plusieurs
    // tronçons dans OpenStreetMap, et Nominatim les rend un à un — trois lignes
    // « Boulevard des Moulins, Monte-Carlo » à quelques mètres d'écart, que
    // rien ne distingue à l'écran. On garde la première, la mieux classée.
    const vus = new Set()
    const suggestions = (Array.isArray(data) ? data : [])
      .map(toSuggestion)
      .filter((suggestion) => {
        if (!suggestion) return false
        const cle = suggestion.label.toLowerCase()
        if (vus.has(cle)) return false
        vus.add(cle)
        return true
      })

    cacheSet(key, suggestions)
    return res.status(200).json({ ok: true, suggestions })
  } catch (error) {
    // Panne, quota ou budget dépassé : le front a son repli (la proposition
    // « Principauté de Monaco »), rien ne doit bloquer la saisie.
    console.error(`[monaco-adresses] ${error?.message ?? error}`)
    return res.status(502).json({ ok: false, error: 'Géocodage momentanément indisponible.' })
  } finally {
    clearTimeout(budget)
  }
}
