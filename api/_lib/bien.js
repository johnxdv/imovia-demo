// Étape A — caractéristiques du bien sélectionné : surface retenue pour le
// calcul, et année de construction quand les bases la connaissent.
//
// La chaîne est celle déjà utilisée par la carte (cadastre → BDNB) : les
// clients correspondants vivent dans `src/lib` et sont purement isomorphes,
// on les réutilise ici plutôt que d'en tenir une seconde version.

import { fetchBuildingsOnParcel } from '../../src/lib/bdnb.js'
import { fetchParcelle } from '../../src/lib/ign.js'

const DPE_ENDPOINT = 'https://api.bdnb.io/v1/bdnb/donnees/batiment_groupe_dpe_representatif_logement'

const DPE_FIELDS = [
  'batiment_groupe_id',
  'surface_habitable_logement',
  'surface_habitable_immeuble',
  'nombre_niveau_logement',
]

/** Au-delà, mieux vaut la surface géométrique tout de suite que la bonne réponse trop tard. */
const FETCH_TIMEOUT_MS = 4000

/**
 * Bornes de vraisemblance par type. Une surface hors de ces bornes n'est pas
 * corrigée mais écartée : une donnée aberrante multipliée par un prix au m²
 * produit exactement le genre d'estimation qui décrédibilise tout le parcours.
 */
const PLAUSIBLE = {
  maison: [20, 800],
  appartement: [9, 400],
  terrain: [50, 50000],
}

/**
 * Part réellement habitable d'un bâtiment, rapportée à emprise au sol ×
 * niveaux. L'emprise est mesurée au nu extérieur des murs et englobe tout ce
 * que la surface habitable exclut : murs, cage d'escalier, garage intégré,
 * combles perdus, parties communes.
 *
 * Valeur relevée sur les bâtiments que la BDNB documente à la fois par leur
 * géométrie et par un DPE — donc dont la surface habitable est connue : le
 * rapport y est médian à 0,67 (n = 19 maisons, quartiles 0,54 et 0,80), et les
 * quelques collectifs de l'échantillon s'en écartent trop peu pour justifier
 * un second coefficient. L'API ouverte plafonnant ses réponses par commune,
 * l'échantillon est court : il donne un ordre de grandeur, pas un étalon.
 *
 * Ce coefficient ne sert que de repli — dès qu'un DPE couvre le bâtiment,
 * c'est sa surface habitable qui est retenue, sans reconstitution.
 */
const HABITABLE_RATIO = 0.7

/**
 * Niveaux plafonnés pour une maison : au-delà de trois, la donnée est fausse
 * plus souvent qu'elle n'est vraie, et l'erreur se paierait au prix fort une
 * fois multipliée par un prix au m². Un collectif garde ses niveaux réels — sa
 * surface est ensuite ramenée au logement.
 */
const MAX_LEVELS_HOUSE = 3
const MAX_LEVELS_BUILDING = 30

/**
 * Surface d'un appartement quand aucune source n'a rien à en dire. Ordre de
 * grandeur du parc collectif français, retenu faute de mieux : sans surface, il
 * n'y a pas d'estimation du tout, et le parcours ne doit jamais s'arrêter.
 */
const DEFAULT_APARTMENT_M2 = 65

const inRange = (value, [min, max]) => Number.isFinite(value) && value >= min && value <= max

function readNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Fiche DPE représentative d'un bâtiment — seule source BDNB à porter une
 * véritable surface habitable. Sa couverture est partielle (les bâtiments
 * n'ont pas tous fait l'objet d'un diagnostic), d'où les replis géométriques
 * qui suivent. Renvoie `null` sans lever : une absence est ici la norme.
 */
async function fetchDpe(batimentGroupeId, { signal } = {}) {
  if (!batimentGroupeId) return null

  const params = new URLSearchParams({
    batiment_groupe_id: `eq.${batimentGroupeId}`,
    select: DPE_FIELDS.join(','),
  })

  try {
    const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS)
    const response = await fetch(`${DPE_ENDPOINT}?${params}`, {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
    if (!response.ok) return null

    const data = await response.json().catch(() => null)
    return Array.isArray(data) && data[0] ? data[0] : null
  } catch (error) {
    if (signal?.aborted) throw error
    return null
  }
}

/**
 * Retrouve la fiche BDNB du bâtiment quand le front n'a pas pu la joindre —
 * détection interrompue, réseau capricieux. Même rapprochement par emprise au
 * sol que côté carte : les deux bases n'ont aucun identifiant commun.
 */
async function resolveFiche({ lat, lon, areaM2, parcelle }, { signal } = {}) {
  const resolved = parcelle ?? (await fetchParcelle(lat, lon, { signal }).catch(() => null))
  if (!resolved?.idu) return { parcelle: null, fiche: null }

  const candidates = await fetchBuildingsOnParcel(resolved, { signal }).catch(() => [])
  if (candidates.length === 0) return { parcelle: resolved, fiche: null }

  const fiche = Number.isFinite(areaM2)
    ? candidates.reduce((best, c) =>
        Math.abs((c.s_geom_groupe ?? 0) - areaM2) < Math.abs((best.s_geom_groupe ?? 0) - areaM2)
          ? c
          : best,
      )
    : candidates.reduce((best, c) => ((c.s_geom_groupe ?? 0) > (best.s_geom_groupe ?? 0) ? c : best))

  return { parcelle: resolved, fiche }
}

/**
 * Surface retenue pour le calcul, et provenance de cette surface.
 *
 * Trois sources, par ordre de fiabilité décroissante : la surface habitable
 * d'un DPE, le produit emprise au sol × niveaux, puis la seule emprise au sol
 * — le repli prévu par le cahier des charges lorsque la BDNB reste muette.
 * Aucune de ces étapes ne peut interrompre le calcul : à défaut de tout, un
 * ordre de grandeur vaut mieux qu'un parcours qui s'arrête.
 */
function resolveSurface({ type, fiche, dpe, areaM2, properties, contenance }) {
  const limits = PLAUSIBLE[type] ?? PLAUSIBLE.maison

  if (type === 'terrain') {
    const cadastre = readNumber(contenance)
    if (inRange(cadastre, limits)) return { surfaceM2: cadastre, source: 'cadastre' }

    const footprint = readNumber(areaM2) ?? readNumber(fiche?.s_geom_groupe)
    if (inRange(footprint, limits)) return { surfaceM2: footprint, source: 'emprise' }

    return { surfaceM2: null, source: 'aucune' }
  }

  const logements = readNumber(fiche?.nb_log) ?? readNumber(properties?.nombre_de_logements)
  const collective = type === 'appartement'

  // 1. Surface habitable issue d'un DPE — la seule mesurée, jamais reconstituée.
  const habitableUnit = readNumber(dpe?.surface_habitable_logement)
  const habitableBuilding = readNumber(dpe?.surface_habitable_immeuble)

  if (collective) {
    // La surface de l'immeuble ramenée au nombre de logements passe avant celle
    // du logement « représentatif » du DPE : ce dernier n'est qu'un diagnostic
    // parmi ceux du bâtiment, et si c'est celui d'un studio, il tirerait
    // l'estimation de tous les appartements de l'immeuble vers le bas.
    const perUnit = habitableBuilding && logements ? habitableBuilding / logements : null
    if (inRange(perUnit, limits)) return { surfaceM2: perUnit, source: 'dpe-immeuble' }
    if (inRange(habitableUnit, limits)) return { surfaceM2: habitableUnit, source: 'dpe' }
  } else {
    if (inRange(habitableBuilding, limits)) return { surfaceM2: habitableBuilding, source: 'dpe' }
    if (inRange(habitableUnit, limits)) return { surfaceM2: habitableUnit, source: 'dpe' }
  }

  // 2. Reconstitution géométrique : emprise au sol × niveaux.
  //
  // En collectif, elle n'a de sens que si le nombre de logements est connu :
  // sans lui, on ne divise rien et l'on estimerait l'immeuble entier au lieu
  // de l'appartement — l'erreur d'un facteur dix qu'il faut précisément éviter.
  // L'emprise du contour effectivement cliqué prime sur celle de la BDNB :
  // `s_geom_groupe` porte sur un *groupe* de bâtiments, que la base fusionne
  // dès qu'ils sont contigus — une ferme et sa grange, une rangée de maisons
  // de ville. Le polygone BD TOPO®, lui, ne décrit que le bâtiment désigné.
  const footprint = readNumber(areaM2) ?? readNumber(fiche?.s_geom_groupe)
  const levels = Math.min(
    readNumber(fiche?.nb_niveau) ?? readNumber(properties?.nombre_d_etages) ?? 1,
    collective ? MAX_LEVELS_BUILDING : MAX_LEVELS_HOUSE,
  )

  if (footprint && (!collective || logements > 1)) {
    const built = footprint * levels * HABITABLE_RATIO
    const candidate = collective ? built / logements : built
    if (inRange(candidate, limits)) return { surfaceM2: candidate, source: 'geometrie' }

    // 3. Emprise seule — repli explicite du cahier des charges.
    if (!collective && inRange(footprint, limits)) {
      return { surfaceM2: footprint, source: 'emprise' }
    }
  }

  if (collective) return { surfaceM2: DEFAULT_APARTMENT_M2, source: 'defaut' }

  return { surfaceM2: null, source: 'aucune' }
}

/**
 * Caractéristiques du bien sélectionné.
 *
 * Le front transmet ce qu'il a déjà appris en repérant le bâtiment sur la
 * carte (emprise, parcelle, identifiant BDNB) ; tout ce qui manque est
 * retrouvé ici. Aucune de ces requêtes n'est bloquante : chacune a son repli,
 * et la fonction renvoie toujours un résultat exploitable.
 */
export async function describeBien(selection, { signal } = {}) {
  const { lat, lon, type, areaM2, properties } = selection

  // Le repérage sur la carte a déjà interrogé le cadastre puis la BDNB pour
  // déterminer le type du bien : quand le front nous transmet ce qu'il en a
  // retiré, l'étape A se résume à la fiche DPE — deux ou trois secondes de
  // gagnées sur le budget de l'écran de chargement.
  const resolved = selection.fiche
    ? { parcelle: selection.parcelle ?? null, fiche: selection.fiche }
    : await resolveFiche(
        { lat, lon, areaM2, parcelle: selection.parcelle ?? null },
        { signal },
      ).catch(() => ({ parcelle: selection.parcelle ?? null, fiche: null }))

  const { parcelle, fiche } = resolved
  const batimentGroupeId = fiche?.batiment_groupe_id ?? selection.batimentGroupeId

  const dpe = await fetchDpe(batimentGroupeId, { signal }).catch(() => null)

  const { surfaceM2, source } = resolveSurface({
    type,
    fiche,
    dpe,
    areaM2,
    properties,
    contenance: selection.contenance ?? parcelle?.contenance,
  })

  return {
    surfaceM2: surfaceM2 === null ? null : Math.round(surfaceM2),
    surfaceSource: source,
    // Récupérée comme le demande l'étape A, mais volontairement sans effet sur
    // le prix : le calcul retenu est la seule médiane au m², sans correctif.
    anneeConstruction: readNumber(fiche?.annee_construction),
    codeInsee: parcelle?.codeInsee ?? null,
  }
}
