// Fonction serverless Vercel — prix indicatif au m² d'un secteur.
//
// Sert le seul aperçu de la fenêtre « Votre surface habitable » : l'utilisateur
// y déplace un curseur de surface et voit le montant réagir. Ce montant n'est
// pas l'estimation — il n'en est que l'ordre de grandeur, calculé côté client
// par une multiplication, et remplacé par le résultat complet de
// `/api/estimation.js` dès que le curseur est validé.
//
// D'où un moteur volontairement bridé, là où l'estimation finale déroule tout :
// trois rayons au plus, trois millésimes, aucun département voisin. La fenêtre
// est à l'écran pendant que la requête court : elle doit répondre en une
// seconde ou deux, pas en dix. À défaut, le prix de référence
// prend le relais : mieux vaut un ordre de grandeur tout de suite qu'une
// médiane juste une fois la fenêtre refermée.
//
// Effet de bord utile : les millésimes chargés ici restent en cache pour
// l'estimation qui suit, sur la même instance (voir `_lib/dvf.js`).

import { comparableKinds, median, nearestSales } from './_lib/comparables.js'
import { candidateYears, loadDepartementYear } from './_lib/dvf.js'
import { communeAtPoint, departementFromInsee } from './_lib/geo.js'
import { estHorsCouvertureDvf, prixReference } from './_lib/reference.js'

/**
 * Budget total. Court à dessein : l'aperçu accompagne la lecture de la
 * fenêtre, il ne doit pas la faire attendre. Passé ce délai, la référence.
 */
const BUDGET_MS = 3500

/**
 * Voisinage sondé, du plus resserré au plus large.
 *
 * L'aperçu suit les mêmes paliers que le calcul complet, en plus courts : ce
 * sont deux chiffres montrés au même utilisateur à quelques secondes
 * d'intervalle, et il n'y a rien à gagner à ce que l'aperçu annonce le prix du
 * quartier d'à côté. C'est même exactement l'inverse : l'aperçu partait
 * jusqu'ici d'un seul rayon de 3 km — soit la commune entière dans bien des
 * cas — et le montant final, une fois resserré à l'échelle du pâté de maisons,
 * pouvait s'en écarter de vingt pour cent sans que rien ne l'explique.
 *
 * Les ventes retenues sont, ici aussi, les plus proches d'abord
 * (`nearestSales`) : c'est ce qui recentre la médiane sur le quartier quand le
 * rayon ramène tout un arrondissement.
 */
const APERCU_LADDER = [
  { radiusM: 400, minSample: 4 },
  { radiusM: 1000, minSample: 5 },
  { radiusM: 3000, minSample: 5 },
]

/**
 * Millésimes chargés. Trois plutôt que deux depuis le resserrement du rayon :
 * un voisinage plus étroit demande un peu plus de profondeur pour rendre le
 * même nombre de ventes, et une année de plus coûte un téléchargement là où un
 * kilomètre de plus coûterait la justesse du chiffre.
 */
const APERCU_YEARS = 3

/**
 * Médiane du voisinage, puis du département entier sur les mêmes millésimes —
 * ce second niveau ne coûte rien de plus, les fichiers sont déjà lus.
 *
 * Ne lève pas : une absence de réponse est traitée par l'appelant, qui a son
 * propre repli.
 */
async function apercuDvf({ lat, lon, type, departement }, { signal }) {
  const kinds = new Set(comparableKinds(type))

  // Une année de plus que demandé : le millésime de l'année en cours n'est
  // publié qu'avec plusieurs mois de retard, et reviendrait vide.
  const years = candidateYears(APERCU_YEARS + 1)
  const batches = await Promise.all(
    years.map((year) => loadDepartementYear(departement, year, { signal }).catch(() => [])),
  )

  const sales = batches.flat().filter((sale) => kinds.has(sale.kind))

  for (const rung of APERCU_LADDER) {
    const proches = nearestSales(sales, lat, lon, rung.radiusM)
    if (proches.length >= rung.minSample) {
      return { pricePerM2: median(proches.map((sale) => sale.pricePerM2)), source: 'dvf-apercu' }
    }
  }

  const departemental = sales.map((sale) => sale.pricePerM2)
  if (departemental.length >= APERCU_LADDER[0].minSample) {
    return { pricePerM2: median(departemental), source: 'dvf-departement' }
  }

  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée.' })
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const lat = Number(body.lat)
  const lon = Number(body.lon)

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ ok: false, error: 'Coordonnées manquantes.' })
  }

  // Le type peut manquer : la détection tourne encore quand la fenêtre s'ouvre.
  // `comparableKinds` et `prixReference` savent tous deux s'en passer — ils
  // retombent alors sur le résidentiel dans son ensemble.
  const type = typeof body.type === 'string' ? body.type : null

  const controller = new AbortController()
  const budget = setTimeout(() => controller.abort(), BUDGET_MS)
  const signal = controller.signal

  try {
    // Le front transmet le code commune dès que le cadastre a répondu : c'est
    // une requête de moins sur un budget qui en compte peu.
    const codeInsee =
      (typeof body.codeInsee === 'string' ? body.codeInsee : null) ??
      (await communeAtPoint(lat, lon, { signal }).catch(() => null))

    const departement = departementFromInsee(codeInsee)

    const dvf =
      departement && !estHorsCouvertureDvf(departement)
        ? await apercuDvf({ lat, lon, type, departement }, { signal }).catch(() => null)
        : null

    const { pricePerM2, source } = dvf ?? prixReference({ codeInsee, departement, type })

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ ok: true, pricePerM2: Math.round(pricePerM2), source })
  } catch (error) {
    // Aucun repli n'a pu aboutir — la référence nationale reste préférable à
    // une fenêtre sans aperçu.
    console.error('[prix-m2] Aperçu abandonné —', error?.message ?? error)
    const { pricePerM2, source } = prixReference({ codeInsee: null, departement: null, type })
    return res.status(200).json({ ok: true, pricePerM2, source })
  } finally {
    clearTimeout(budget)
  }
}
