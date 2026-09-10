import { fetchBuildingsOnParcel } from './bdnb.js'
import { fetchParcelle } from './ign.js'

/**
 * Types de bien reconnus par le parcours. `manuel` liste ceux proposés à la
 * correction manuelle : quatre choix, pas davantage — au-delà, le choix rapide
 * cesse d'être rapide.
 */
export const PROPERTY_TYPES = {
  maison: { id: 'maison', label: 'Maison individuelle', court: 'Maison', genre: 'f' },
  appartement: {
    id: 'appartement',
    label: 'Appartement ou immeuble collectif',
    court: 'Appartement',
    genre: 'm',
  },
  local: { id: 'local', label: 'Local professionnel', court: 'Local pro', genre: 'm' },
  terrain: { id: 'terrain', label: 'Terrain nu', court: 'Terrain', genre: 'm' },
  autre: { id: 'autre', label: 'Autre type de bien', court: 'Autre', genre: 'm' },
}

/**
 * Ordre d'affichage du choix manuel.
 *
 * Le correcteur de type a été retiré de l'interface : le type détecté n'est plus
 * montré à l'utilisateur, il ne sert qu'au calcul de l'estimation. Ces deux
 * aides restent en place pour le jour où il refera surface.
 */
export const MANUAL_TYPE_IDS = ['maison', 'appartement', 'terrain', 'autre']

export const typeLabel = (id) => PROPERTY_TYPES[id]?.label ?? PROPERTY_TYPES.autre.label

/**
 * Participe accordé au genre du type — « Maison individuelle détectée » mais
 * « Appartement […] détecté ». Le libellé étant choisi dans une table, l'accord
 * doit l'être aussi : le déduire du texte serait fragile.
 */
export const typeDetecte = (id) =>
  (PROPERTY_TYPES[id] ?? PROPERTY_TYPES.autre).genre === 'f' ? 'détectée' : 'détecté'

/**
 * Degrés de confiance de la détection.
 *
 * `haute` désigne le seul cas où la base *dit* la vocation du bâtiment plutôt
 * qu'elle ne la laisse déduire : nomenclature explicite, ou nombre de logements
 * réellement compté. Tout ce qui relève de la présomption — vocation générique,
 * comptage absent, immeuble mixte — reste en `moyenne`, et ce qui ne repose sur
 * aucune source en `nulle`.
 *
 * **La confiance ne conditionne jamais le parcours.** Elle qualifie la réponse,
 * elle ne la suspend pas : quelle qu'elle soit, un type est retenu et le calcul
 * part avec. Elle sert au journal — c'est elle qui dira, à l'usage, quelle part
 * des estimations repose sur une lecture et quelle part sur un arbitrage — et
 * elle sert d'aiguillage interne : c'est l'absence de source, et elle seule, qui
 * déclenche `arbitreTypeResidentiel`.
 */
export const CONFIANCES = ['nulle', 'moyenne', 'haute']

/**
 * Vocation BDNB (`usage_principal_bdnb_open`) → type du parcours, assorti de sa
 * confiance. Les valeurs sont comparées en minuscules et sans accents : la
 * nomenclature a déjà changé de casse d'une version à l'autre.
 */
function fromBdnbUsage(usage, logements) {
  const normalized = String(usage ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  const nbLog = Number(logements)
  // Un comptage à zéro n'est pas un comptage : la BDNB y met aussi bien le
  // bâtiment non résidentiel que celui dont elle ignore le contenu.
  const compte = Number.isFinite(nbLog) && nbLog > 0

  if (normalized.includes('residentiel individuel')) return { type: 'maison', confiance: 'haute' }
  if (normalized.includes('residentiel collectif')) {
    return { type: 'appartement', confiance: 'haute' }
  }

  // Immeuble mixte — commerces en pied d'immeuble, logements au-dessus : la
  // BDNB le classe « Tertiaire », alors que celui qui fait estimer son bien y
  // habite presque toujours. Dès qu'il y a plusieurs logements, le résidentiel
  // l'emporte donc sur la vocation déclarée — un arbitrage, pas une lecture,
  // d'où une confiance qui n'est pas haute.
  if (nbLog >= 2) return { type: 'appartement', confiance: 'moyenne' }

  if (normalized.includes('tertiaire') || normalized.includes('commercial')) {
    return { type: 'local', confiance: 'haute' }
  }
  if (normalized.includes('industriel') || normalized.includes('agricole')) {
    return { type: 'local', confiance: 'haute' }
  }

  // Vocation résidentielle sans plus de précision : le nombre de logements
  // tranche seul entre maison et collectif. Sans lui, « maison » n'est plus
  // qu'un repli — le cas le plus fréquent du parc, pas une caractéristique lue
  // sur ce bâtiment-ci.
  if (normalized.includes('residentiel')) {
    return { type: nbLog > 1 ? 'appartement' : 'maison', confiance: compte ? 'haute' : 'moyenne' }
  }

  return null
}

/**
 * Repli sur la BD TOPO® quand la BDNB ne connaît pas le bâtiment — fréquent
 * sur les constructions récentes et les annexes.
 *
 * Ses attributs portent sur le polygone effectivement cliqué : un usage déclaré
 * et un nombre de logements compté y valent ceux de la BDNB, d'où une confiance
 * haute malgré le statut de repli de la source.
 */
function fromBdTopo(properties) {
  if (!properties) return null

  const usage = String(properties.usage_1 ?? '').toLowerCase()
  const logements = Number(properties.nombre_de_logements)
  const compte = Number.isFinite(logements) && logements > 0

  if (usage.includes('résidentiel') || usage.includes('residentiel')) {
    return {
      type: logements > 1 ? 'appartement' : 'maison',
      confiance: compte ? 'haute' : 'moyenne',
    }
  }
  if (usage.includes('commercial') || usage.includes('industriel') || usage.includes('agricole')) {
    return { type: 'local', confiance: 'haute' }
  }
  if (compte) {
    // Aucun usage déclaré : le seul comptage de logements dit qu'on habite là,
    // sans dire dans quoi.
    return { type: logements > 1 ? 'appartement' : 'maison', confiance: 'moyenne' }
  }

  return null
}

/**
 * Part du collectif dans le parc, avant tout indice — exprimée en log-odds
 * (−0,35 ≈ 41 %). Le parcours estime des logements et non des bâtiments : la
 * proportion retenue est celle des résidences principales (~44 % d'appartements
 * en France, INSEE), et non celle du bâti, où la maison écraserait tout.
 *
 * Volontairement légère : elle ne tranche que si rien d'autre ne le fait.
 */
const PRIOR_APPARTEMENT = -0.35

/**
 * Poids des indices, en log-odds vers le collectif.
 *
 * Aucun de ces trois relevés ne *dit* la vocation du bâtiment — sans quoi la
 * détection se serait arrêtée avant d'arriver ici. Ils la suggèrent seulement,
 * et c'est exactement ce qu'exprime une somme de log-odds : deux indices faibles
 * concordants pèsent plus qu'un seul, aucun ne décide à lui seul.
 *
 * Les valeurs sont des ordres de grandeur assumés — un rapport de cotes de 3
 * pour un bâtiment de quatre à cinq niveaux, de 9 au-delà de six. Elles ne
 * prétendent pas à l'étalonnage : leur seul rôle est de faire pencher la
 * réponse du bon côté quand plus rien d'autre ne la porte.
 */
function poidsNiveaux(niveaux) {
  if (!Number.isFinite(niveaux) || niveaux <= 0) return 0
  if (niveaux <= 2) return -1
  if (niveaux === 3) return 0.3
  if (niveaux <= 5) return 1.2
  return 2.2
}

/**
 * La hauteur BD TOPO® est mesurée **au faîtage** : une maison de plain-pied y
 * fait 5,2 m en médiane et une R+1 près de 8 (relevés détaillés dans
 * `api/_lib/bien.js`). Les paliers en tiennent compte — 8 m n'est pas deux
 * étages, c'en est un.
 */
function poidsHauteur(hauteur) {
  if (!Number.isFinite(hauteur) || hauteur <= 0) return 0
  if (hauteur < 8) return -0.8
  if (hauteur < 12) return 0.2
  if (hauteur < 18) return 1.2
  return 2.2
}

/**
 * Emprise au sol du contour cliqué. L'indice le plus faible des trois : une
 * grande emprise désigne aussi bien un immeuble qu'un corps de ferme, et une
 * petite un pavillon comme un immeuble de faubourg sur rue étroite.
 */
function poidsEmprise(areaM2) {
  if (!Number.isFinite(areaM2) || areaM2 <= 0) return 0
  if (areaM2 < 120) return -0.5
  if (areaM2 < 300) return 0
  if (areaM2 < 800) return 0.8
  return 1.6
}

/**
 * Indice de gabarit — le plus parlant des deux relevés qui le décrivent.
 *
 * Niveaux comptés et hauteur mesurée disent la même chose, et se contredisent
 * souvent : la BD TOPO® déclare volontiers un étage sur un bâtiment de 27 m,
 * son `nombre_d_etages` valant 1 par défaut là où il n'a pas été levé. Retenir
 * celui des deux qui penche le plus vers le collectif revient à ne jamais
 * laisser un comptage par défaut annuler une hauteur mesurée — et, quand les
 * deux s'accordent vers la maison, à rester du côté prudent de l'arbitrage.
 *
 * Un relevé absent ne pèse pas : il ne vaut ni indice ni contre-indice, et
 * n'entre donc pas dans la comparaison.
 */
function poidsGabarit(niveaux, hauteur) {
  const releves = []
  if (Number.isFinite(niveaux) && niveaux > 0) releves.push(poidsNiveaux(niveaux))
  if (Number.isFinite(hauteur) && hauteur > 0) releves.push(poidsHauteur(hauteur))

  return releves.length > 0 ? Math.max(...releves) : 0
}

/**
 * Tranche entre maison et appartement quand aucune base n'a rien dit du
 * bâtiment.
 *
 * **Le parcours ne connaît pas l'indécision.** Il n'y a personne à qui demander
 * — le type n'est pas montré à l'utilisateur et ne lui est jamais soumis — et un
 * type indéterminé ne ferait pas moins de dégâts qu'un type faux : il aligne
 * l'estimation sur une médiane tous logements confondus, c'est-à-dire sur un
 * marché qui n'est celui de personne. Entre deux réponses incertaines, la moins
 * incertaine vaut donc toujours mieux qu'aucune, **même à 51 %**.
 *
 * La probabilité retenue redescend avec le type : elle ne s'affiche nulle part,
 * mais elle part au journal, où elle dira à l'usage si ces arbitrages tombent
 * juste — et à quelle fréquence il faut seulement en passer par là.
 *
 * Niveaux et hauteur ne comptent que pour un seul indice — le gabarit du
 * bâtiment — et non pour deux : ils décrivent la même chose, l'une comptée et
 * l'autre mesurée, et les additionner reviendrait à la retenir deux fois.
 */
export function arbitreTypeResidentiel({ niveaux, hauteur, areaM2 } = {}) {
  const cotes =
    PRIOR_APPARTEMENT +
    poidsGabarit(Number(niveaux), Number(hauteur)) +
    poidsEmprise(Number(areaM2))

  const appartement = 1 / (1 + Math.exp(-cotes))

  return {
    type: appartement >= 0.5 ? 'appartement' : 'maison',
    confiance: 'nulle',
    probabilites: { maison: 1 - appartement, appartement },
  }
}

/** Indices d'arbitrage, relevés indifféremment dans l'une ou l'autre base. */
function indices(fiche, properties, areaM2) {
  const nombre = (value) => {
    const n = Number(value)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  return {
    niveaux: nombre(fiche?.nb_niveau) ?? nombre(properties?.nombre_d_etages),
    hauteur: nombre(properties?.hauteur),
    areaM2: nombre(areaM2) ?? nombre(fiche?.s_geom_groupe),
  }
}

/**
 * Parmi les bâtiments d'une parcelle, celui dont l'emprise au sol se rapproche
 * le plus de celle du bâtiment cliqué. Les deux bases n'ont aucun identifiant
 * commun ; la surface est le seul rapprochement possible sans reprojeter les
 * géométries BDNB depuis le Lambert-93.
 *
 * Sans surface de référence, on retient la plus grande fiche renseignée : sur
 * une parcelle pavillonnaire, c'est l'habitation plutôt que le garage.
 */
function closestByFootprint(candidates, areaM2) {
  const usable = candidates.filter((c) => c.usage_principal_bdnb_open || c.nb_log)

  const pool = usable.length > 0 ? usable : candidates
  if (pool.length === 0) return null
  if (pool.length === 1) return pool[0]

  if (!Number.isFinite(areaM2)) {
    return pool.reduce((best, c) => ((c.s_geom_groupe ?? 0) > (best.s_geom_groupe ?? 0) ? c : best))
  }

  return pool.reduce((best, c) => {
    const d = Math.abs((c.s_geom_groupe ?? 0) - areaM2)
    const bestD = Math.abs((best.s_geom_groupe ?? 0) - areaM2)
    return d < bestD ? c : best
  })
}

/**
 * Déduit le type du bien à partir de la sélection faite sur la carte.
 *
 * Chaîne : parcelle cadastrale sous le point (API Carto) → fiches BDNB de
 * cette parcelle → vocation du bâtiment, et à défaut de tout cela un arbitrage
 * sur les seuls indices géométriques.
 *
 * **Elle tranche toujours.** Aucune branche ne renvoie `autre`, aucune ne
 * suspend le parcours à une précision demandée à l'utilisateur : le type
 * descend au moteur d'estimation, qui en a besoin quoi qu'il arrive, et
 * l'incertitude se lit dans `confiance` — jamais dans une absence de réponse.
 *
 * Ne lève jamais en dehors d'une annulation explicite : une base injoignable
 * fait perdre en confiance, pas en réponse.
 */
export async function detectPropertyType(selection, { signal } = {}) {
  const { lat, lon, areaM2, properties } = selection
  const isBuilding = selection.kind === 'batiment'

  // Seule l'annulation par l'appelant — nouvelle sélection, étape quittée —
  // interrompt la détection. Une panne du cadastre ou une échéance dépassée ne
  // font perdre qu'un rattachement : la suite s'en passe, et tranche quand même.
  let parcelle = null
  try {
    parcelle = await fetchParcelle(lat, lon, { signal })
  } catch (error) {
    if (signal?.aborted) throw error
  }

  // Repérage libre : aucun contour bâti n'a été retenu sous le point. C'est un
  // terrain — un clic hors emprise ne désigne rien d'autre. Hors cadastre, la
  // réponse est la même mais ne s'appuie sur rien : elle perd sa confiance, pas
  // son tranchant.
  if (!isBuilding) {
    return {
      type: 'terrain',
      source: parcelle ? 'cadastre' : 'inconnu',
      confiance: parcelle ? 'moyenne' : 'nulle',
      parcelle,
      fiche: null,
    }
  }

  let fiche = null
  if (parcelle) {
    try {
      const candidates = await fetchBuildingsOnParcel(parcelle, { signal })
      fiche = closestByFootprint(candidates, areaM2)
    } catch (error) {
      if (signal?.aborted) throw error
    }
  }

  const fromBdnb = fiche ? fromBdnbUsage(fiche.usage_principal_bdnb_open, fiche.nb_log) : null
  if (fromBdnb) {
    return { ...fromBdnb, source: 'bdnb', parcelle, fiche }
  }

  const fallback = fromBdTopo(properties)
  if (fallback) {
    return { ...fallback, source: 'bdtopo', parcelle, fiche }
  }

  // Plus aucune base ne parle : reste la géométrie du bâtiment cliqué, et le
  // devoir de trancher malgré tout.
  return {
    ...arbitreTypeResidentiel(indices(fiche, properties, areaM2)),
    source: 'arbitrage',
    parcelle,
    fiche,
  }
}
