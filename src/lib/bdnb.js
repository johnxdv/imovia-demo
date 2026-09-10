// Client de la Base de Données Nationale des Bâtiments (BDNB, CSTB) — API
// ouverte, sans clé. https://bdnb.io
//
// L'API est un PostgREST : les filtres s'écrivent `colonne=operateur.valeur`.
const ENDPOINT = 'https://api.bdnb.io/v1/bdnb/donnees/batiment_groupe_complet'

/**
 * Champs demandés. `usage_principal_bdnb_open` porte la vocation du bâtiment,
 * `nb_log` distingue une maison d'un collectif, `s_geom_groupe` (emprise au
 * sol, m²) sert à retrouver le bon bâtiment quand la parcelle en porte
 * plusieurs, et l'année de construction complète la fiche remise au moteur
 * d'estimation.
 */
const FIELDS = [
  'batiment_groupe_id',
  'usage_principal_bdnb_open',
  'nb_log',
  'nb_niveau',
  's_geom_groupe',
  'annee_construction',
]

/**
 * Délai au-delà duquel la BDNB est abandonnée.
 *
 * Elle n'a pas de contrat de service et il lui arrive de ne pas répondre du
 * tout — constaté : plus de douze secondes sans un octet. Sans plafond, cette
 * seule requête immobilisait la détection du type de bien aussi longtemps, donc
 * le champ « étage » qui en dépend, puis tout le budget du moteur d'estimation
 * derrière. Quatre secondes, et l'on continue avec la BD TOPO® : une réponse
 * moins renseignée arrive toujours avant une réponse absente.
 */
const FETCH_TIMEOUT_MS = 4000

/**
 * Fiches BDNB des bâtiments d'une parcelle cadastrale.
 *
 * Le filtre porte sur la parcelle **et** la commune : sans le second, la
 * requête balaie la table nationale et expire (504 constaté). La géométrie
 * n'est pas demandée — la BDNB la publie en Lambert-93, inexploitable ici sans
 * reprojection, d'où le rapprochement par surface plutôt que par contenance
 * géométrique.
 *
 * L'API plafonne ses réponses à 10 lignes ; une parcelle dépasse rarement ce
 * nombre de bâtiments, et au-delà le rapprochement par surface reste opérant
 * sur les dix premiers.
 *
 * **Ne lève que sur une annulation par l'appelant.** Panne, échéance dépassée,
 * réponse illisible : tout cela rend une liste vide, qui est une réponse — le
 * bâtiment n'est pas décrit, la détection passera à la BD TOPO®. Une base
 * indisponible ne doit jamais pouvoir arrêter le parcours.
 */
export async function fetchBuildingsOnParcel({ idu, codeInsee }, { signal } = {}) {
  if (!idu || !codeInsee) return []

  const params = new URLSearchParams({
    code_commune_insee: `eq.${codeInsee}`,
    // `cs` = « contains » : `l_parcelle_id` est un tableau d'identifiants.
    l_parcelle_id: `cs.{${idu}}`,
    select: FIELDS.join(','),
  })

  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(`${ENDPOINT}?${params}`, {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })

    if (!response.ok) {
      console.error(`[bdnb] Réponse ${response.status} — fiche bâtiment ignorée`)
      return []
    }

    const data = await response.json().catch(() => null)

    return Array.isArray(data) ? data : []
  } catch (error) {
    // Annulation par l'appelant : l'utilisateur a changé de sélection ou quitté
    // l'étape, il n'y a plus rien à répondre. Tout le reste — dont l'échéance
    // ci-dessus — se traite en absence de fiche.
    if (signal?.aborted) throw error

    console.error('[bdnb] Fiche bâtiment indisponible —', error?.message ?? error)
    return []
  }
}
