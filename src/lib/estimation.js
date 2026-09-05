// Appel du moteur d'estimation. Le calcul lui-même vit côté serveur
// (`api/estimation.js`) : le front n'envoie que ce qu'il a appris en repérant
// le bâtiment sur la carte, et ne reçoit qu'un montant. Ni les sources de
// données, ni la méthode, ni les éventuels replis ne descendent jusqu'ici.

const ENDPOINT = '/api/estimation'

/**
 * Filet de sécurité côté client. Le serveur s'impose déjà un budget plus
 * court que l'animation de chargement ; ce délai ne couvre que le cas où il ne
 * répondrait pas du tout.
 */
const TIMEOUT_MS = 15000

/**
 * Demande l'estimation d'une sélection confirmée sur la carte.
 *
 * Ne rejette jamais : le parcours ne doit pas s'interrompre parce qu'une
 * requête a échoué. En cas d'échec complet, la promesse est tenue avec `null`
 * — l'écran résultat sait déjà l'afficher sans se casser.
 *
 * Le montant est volontairement tiré une seule fois, au lancement de
 * l'analyse : le redemander à l'affichage du résultat le ferait varier d'un
 * rendu à l'autre.
 */
export async function requestEstimation(selection) {
  if (!selection || !Number.isFinite(selection.lat) || !Number.isFinite(selection.lon)) {
    return null
  }

  const { properties } = selection

  const payload = {
    lat: selection.lat,
    lon: selection.lon,
    kind: selection.kind ?? null,
    type: selection.type ?? null,
    areaM2: selection.areaM2 ?? null,
    // Parcelle cadastrale et fiche BDNB ont déjà été obtenues pour déterminer
    // le type du bien, pendant que la fenêtre de confirmation était à l'écran.
    // Les retransmettre évite au serveur de refaire la même chaîne d'appels —
    // deux à trois secondes qui comptent dans le budget de l'analyse.
    parcelle: selection.parcelle ?? null,
    fiche: selection.fiche ?? null,
    // Seuls les attributs BD TOPO® dont le calcul se sert : inutile de faire
    // voyager la fiche complète.
    properties: properties
      ? {
          usage_1: properties.usage_1 ?? null,
          nombre_de_logements: properties.nombre_de_logements ?? null,
          nombre_d_etages: properties.nombre_d_etages ?? null,
        }
      : null,
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!response.ok) return null

    const data = await response.json().catch(() => null)
    const price = Number(data?.price)

    return Number.isFinite(price) && price > 0 ? price : null
  } catch {
    return null
  }
}
