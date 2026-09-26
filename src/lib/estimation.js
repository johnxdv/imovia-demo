// Appel du moteur d'estimation. Le calcul lui-même vit côté serveur
// (`api/estimation.js`) : le front n'envoie que ce qu'il a appris en repérant
// le bâtiment sur la carte, et ne reçoit qu'un montant, sa fourchette et un
// niveau de confiance. Ni les sources de données, ni la méthode, ni les
// éventuels replis ne descendent jusqu'ici.
//
// CE QUI A CHANGÉ. Le moteur peut désormais répondre « je ne sais pas » : une
// panne persistante de DVF rend un 503 explicite au lieu d'un montant replié en
// silence sur la médiane départementale. Cette fonction relance **une fois**,
// puis rend un statut d'indisponibilité que l'écran résultat sait afficher.
// C'est le seul moyen de ne pas annoncer un prix faux à un vendeur.

const ENDPOINT = '/api/estimation'

/**
 * Filet de sécurité côté client, par tentative.
 *
 * Le serveur s'accorde 25 s pour charger DVF, réessais compris, et 30 s au
 * total (voir `BUDGET_MS` dans `api/estimation.js`) ; ce délai doit lui laisser
 * le temps de rendre son erreur explicite plutôt que de couper avant lui — un
 * abandon côté client ressemblerait à une panne réseau et ferait relancer pour
 * rien.
 */
const TIMEOUT_MS = 35000

/** Nombre de relances après un premier échec. Une seule : au-delà, c'est à l'utilisateur de décider. */
const RELANCES = 1

/** Attente avant la relance — le temps qu'un incident passager se dissipe. */
const DELAI_RELANCE_MS = 1200

const attendre = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Une tentative. Rend le résultat, ou un objet d'échec disant s'il vaut la
 * peine de relancer.
 *
 * Un 400 n'est jamais relancé : surface manquante ou coordonnées absentes sont
 * des refus déterministes, la même requête obtiendrait le même refus.
 */
async function tentative(payload) {
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      console.error(
        `[estimation] ${ENDPOINT} a répondu ${response.status}`,
        data?.code ?? '',
        data?.motif ?? '',
      )
      return { ok: false, relancable: response.status >= 500, code: data?.code ?? null }
    }

    const price = Number(data?.price)
    if (!Number.isFinite(price) || price <= 0) {
      console.error('[estimation] Réponse sans montant exploitable —', data)
      return { ok: false, relancable: false, code: 'montant-illisible' }
    }

    return {
      ok: true,
      resultat: {
        status: 'ok',
        price,
        // La fourchette est désormais calculée par le serveur, sur la
        // dispersion réelle des ventes comparables — le front n'a plus de
        // pourcentage à appliquer, et n'aurait de toute façon pas de quoi le
        // faire (voir `FOURCHETTE` dans `api/_lib/estimationConfig.js`).
        low: Number.isFinite(Number(data.low)) ? Number(data.low) : null,
        high: Number.isFinite(Number(data.high)) ? Number(data.high) : null,
        confiance: typeof data.confiance === 'string' ? data.confiance : null,
      },
    }
  } catch (error) {
    console.error('[estimation] Appel au moteur en échec —', error)
    // Réseau coupé ou délai dépassé : relançable, c'est précisément le genre
    // d'incident qu'une seconde tentative rattrape.
    return { ok: false, relancable: true, code: 'reseau' }
  }
}

/**
 * Demande l'estimation d'une sélection confirmée sur la carte.
 *
 * Ne rejette jamais, et rend toujours un objet : `{ status: 'ok', price, low,
 * high, confiance }` ou `{ status: 'indisponible', code }`. L'écran résultat
 * traite le second cas par un message explicite — « estimation momentanément
 * indisponible » — et un bouton de relance, plutôt que par un « — € » muet.
 *
 * Silencieux pour l'utilisateur, mais jamais pour la console : chaque sortie en
 * indisponibilité laisse une trace. Un `null` sans explication a déjà coûté un
 * diagnostic complet — l'écran affichait « — € » et rien, nulle part, ne disait
 * que la fonction serverless ne démarrait plus.
 *
 * Le montant est volontairement tiré une seule fois, au lancement de l'analyse :
 * le redemander à l'affichage du résultat le ferait varier d'un rendu à l'autre.
 *
 * À ne pas confondre avec l'aperçu de la fenêtre de surface
 * (`src/lib/prixSecteur.js`) : celui-ci n'est qu'un ordre de grandeur calculé
 * dans le navigateur, que le montant obtenu ici vient remplacer.
 */
export async function requestEstimation(selection) {
  if (!selection) return { status: 'indisponible', code: 'sans-selection' }

  const monaco = selection.monaco === true

  // Les coordonnées commandent tout le calcul français — commune, département,
  // millésimes DVF. Sans elles, il n'y a rien à demander. Monaco fait
  // exception : son calcul ne dépend d'aucun découpage administratif, seulement
  // du type et de la surface déclarés.
  if (!monaco && (!Number.isFinite(selection.lat) || !Number.isFinite(selection.lon))) {
    return { status: 'indisponible', code: 'coordonnees-manquantes' }
  }

  const { properties } = selection

  const payload = {
    lat: selection.lat,
    lon: selection.lon,
    // Bascule le moteur sur son barème monégasque : prix au m² de référence ×
    // surface déclarée, sans cadastre ni comparables (voir `src/lib/monaco.js`).
    monaco,
    kind: selection.kind ?? null,
    type: selection.type ?? null,
    areaM2: selection.areaM2 ?? null,
    // Surface déclarée au curseur de la fenêtre de surface — la première des
    // deux données que l'utilisateur saisisse de tout le parcours, et désormais
    // **obligatoire** : le moteur refuse de calculer sans elle plutôt que de
    // multiplier un prix au m² juste par une surface reconstituée.
    surfaceM2: selection.surfaceM2 ?? null,
    // La seconde : l'étage, demandé dans la même fenêtre aux seuls
    // appartements. Nul partout ailleurs — et le moteur l'entend bien ainsi,
    // un étage inconnu ne corrigeant rien (voir `src/lib/etage.js`).
    etage: selection.etage ?? null,
    // Provenance et confiance de la détection. Le moteur n'en tire aucune
    // décision — il ne les journalise que pour qu'on sache, à l'usage, sur quoi
    // reposent les types retenus.
    typeSource: selection.typeSource ?? null,
    typeConfiance: selection.typeConfiance ?? null,
    // Parcelle cadastrale et fiche BDNB ont déjà été obtenues pour déterminer
    // le type du bien, pendant que la fenêtre de confirmation était à l'écran.
    // Les retransmettre évite au serveur de refaire la même chaîne d'appels.
    // La contenance qu'elles portent sert maintenant à deux choses : la surface
    // d'un terrain nu, et l'ajustement de terrain d'une maison.
    parcelle: selection.parcelle ?? null,
    fiche: selection.fiche ?? null,
    // Seuls les attributs BD TOPO® dont le calcul se sert : inutile de faire
    // voyager la fiche complète.
    properties: properties
      ? {
          usage_1: properties.usage_1 ?? null,
          nombre_de_logements: properties.nombre_de_logements ?? null,
          nombre_d_etages: properties.nombre_d_etages ?? null,
          // Repli pour compter les niveaux quand `nombre_d_etages` manque : le
          // serveur saurait la retrouver seul, mais c'est une requête de plus
          // sur le budget de l'écran de chargement, et la carte l'a déjà.
          hauteur: properties.hauteur ?? null,
        }
      : null,
  }

  let dernier = null

  for (let essai = 0; essai <= RELANCES; essai += 1) {
    if (essai > 0) await attendre(DELAI_RELANCE_MS)

    dernier = await tentative(payload)
    if (dernier.ok) return dernier.resultat
    if (!dernier.relancable) break
  }

  return { status: 'indisponible', code: dernier?.code ?? 'inconnu' }
}
