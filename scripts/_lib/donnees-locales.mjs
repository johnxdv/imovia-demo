// Statistiques locales réelles, pour la rédaction d'un article.
//
// Ce module ne calcule rien de neuf : il interroge en lecture le moteur qui
// sert déjà les estimations du site (`api/_lib/reference.js` et le pool de
// `api/_data/points-reference.js`), et met en forme ce qu'il en tire. Aucun
// appel réseau, aucune écriture — il peut tourner dans une Action GitHub aussi
// bien qu'en local.
//
// POURQUOI LE POOL ET NON DVF
//
// Le secteur de l'agence est en Moselle (57), département hors couverture DVF :
// aucune vente n'y est publiée en open data, à aucun millésime. Le pool de
// points de référence n'est donc pas un repli, c'est la seule source de prix
// disponible. Le raisonnement complet est dans `api/_lib/reference.js`.
//
// PRIX BRUT, JAMAIS MAJORÉ
//
// `prixReference()` rend le prix relevé. `majoreHorsDvf()` lui applique
// ensuite +10 %, un réglage que le code qualifie lui-même de « commercial, pas
// une correction mesurée » — l'estimateur s'en sert pour afficher un montant au
// visiteur. Un article signé de l'agence énonce un prix de marché : il cite
// donc le relevé, pas le réglage. `majoreHorsDvf` n'est volontairement pas
// importée ici, pour qu'on ne puisse pas l'appeler par distraction.
//
// CE QUE CE MODULE NE PEUT PAS FOURNIR
//
// Une évolution dans le temps. Le pool entier porte un seul relevé — il n'y a
// pas d'historique à comparer. Aucun « +4 % sur un an » ne peut en être tiré,
// par aucun calcul. `dossier()` expose cette limite en clair, dans
// `indisponible`, pour que le prompt de rédaction puisse l'interdire
// explicitement au modèle plutôt que d'espérer qu'il s'en abstienne.
//
// Une évolution peut en revanche être CITÉE, si elle vient d'ailleurs : une
// source datée et identifiable trouvée par la recherche web de l'étape 1
// (chambre des notaires, INSEE, étude publiée, presse). Ces statistiques
// arrivent ici par `statistiquesExternes` et restent rangées à part des
// relevés du site, dans un bloc distinct du dossier. La distinction n'est pas
// cosmétique : elle dit au rédacteur ce qu'il doit attribuer nommément dans le
// texte, et ce qui vient de l'agence elle-même.

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { POINTS_REFERENCE } from '../../api/_data/points-reference.js'
import { prixReference } from '../../api/_lib/reference.js'
import { distanceM } from '../../api/_lib/geo.js'

const RACINE = path.resolve(import.meta.dirname, '..', '..')
const VENTES = path.join(RACINE, 'src', 'data', 'properties.json')

/**
 * Rayon du « secteur » décrit par un article.
 *
 * Aligné sur `RAYON_MAX_M` de `api/_lib/pointsReference.js`, et pour la même
 * raison : au-delà, un point de référence ne dit plus rien de l'endroit dont
 * on parle. Un article sur Diebling qui citerait Metz comparerait deux marchés
 * sans rapport.
 */
export const SECTEUR_RAYON_M = 25000

/** Nombre de communes voisines retenues — assez pour comparer, pas pour noyer. */
const VOISINES_MAX = 12

const median = (values) => {
  const tri = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (tri.length === 0) return null
  const m = Math.floor(tri.length / 2)
  return tri.length % 2 === 0 ? (tri[m - 1] + tri[m]) / 2 : tri[m]
}

/** Point du pool décrivant exactement cette commune (le premier, s'il y en a plusieurs). */
function pointDe(codeInsee) {
  return POINTS_REFERENCE.find((p) => String(p.codeInsee) === String(codeInsee)) ?? null
}

/**
 * Communes du pool situées dans le rayon, du plus proche au plus lointain.
 *
 * Le prix rendu est celui du pool, sans passer par la cascade : à ce stade on
 * sait déjà que le point existe, et `prixReference` ne ferait que le retrouver.
 * Sa provenance (`source`, `fiabilite`, `releve`) est conservée telle quelle —
 * c'est ce qui permet à l'article de dire d'où vient chaque chiffre.
 */
export function communesVoisines(lat, lon, { rayonM = SECTEUR_RAYON_M, max = VOISINES_MAX } = {}) {
  return POINTS_REFERENCE.map((point) => ({ point, distanceM: distanceM(lat, lon, point.lat, point.lon) }))
    .filter(({ point, distanceM: d }) => d <= rayonM && Number(point.prix?.maison) > 0)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, max)
    .map(({ point, distanceM: d }) => ({
      nom: point.nom,
      codeInsee: point.codeInsee,
      distanceKm: Math.round(d / 100) / 10,
      prixMaison: point.prix.maison ?? null,
      prixAppartement: point.prix.appartement ?? null,
      source: point.source,
      fiabilite: point.fiabilite,
      releve: point.releve,
    }))
}

/**
 * Quartiers d'une même commune, quand le pool la découpe.
 *
 * Cinq communes le sont (Metz, Strasbourg, Mulhouse…) : ce sont les seules sur
 * lesquelles une comparaison intra-ville repose sur des relevés distincts.
 * Ailleurs la fonction rend un tableau vide, et c'est une réponse — pas une
 * panne. Un article ne doit alors pas prétendre comparer des quartiers.
 */
export function quartiers(codeInsee) {
  const points = POINTS_REFERENCE.filter(
    (p) => String(p.codeInsee) === String(codeInsee) && Number(p.prix?.maison) > 0,
  )
  if (points.length < 2) return []

  return points
    .map((p) => ({
      nom: p.nom,
      prixMaison: p.prix.maison ?? null,
      prixAppartement: p.prix.appartement ?? null,
      source: p.source,
      releve: p.releve,
    }))
    .sort((a, b) => b.prixMaison - a.prixMaison)
}

/** Communes du pool découpées en quartiers — pour choisir un angle qui tienne. */
export function communesDecoupees() {
  const parCode = new Map()
  for (const p of POINTS_REFERENCE) {
    if (!parCode.has(p.codeInsee)) parCode.set(p.codeInsee, [])
    parCode.get(p.codeInsee).push(p)
  }
  return [...parCode.entries()]
    .filter(([, points]) => points.length > 1)
    .map(([codeInsee, points]) => ({
      codeInsee,
      // Le nom porte le quartier (« Metz - Sablon ») : on ne garde que la ville.
      ville: String(points[0].nom).split(' - ')[0].split(' — ')[0].trim(),
      nombreQuartiers: points.length,
    }))
    .sort((a, b) => b.nombreQuartiers - a.nombreQuartiers)
}

/**
 * Ce que l'agence diffuse elle-même, agrégé.
 *
 * Ce sont des biens à vendre ou à louer, pas des ventes conclues : l'article
 * peut dire « les biens que nous diffusons », jamais « les ventes constatées ».
 * La distinction est portée par le champ `nature` pour qu'elle arrive telle
 * quelle dans le prompt de rédaction.
 */
export async function portefeuilleAgence() {
  const biens = JSON.parse(await readFile(VENTES, 'utf8'))

  const parVille = new Map()
  for (const bien of biens) {
    if (!bien.ville) continue
    parVille.set(bien.ville, (parVille.get(bien.ville) ?? 0) + 1)
  }

  const surfaces = biens.map((b) => Number(b.surface)).filter((v) => Number.isFinite(v) && v > 0)
  const prixVente = biens
    .filter((b) => Number(b.prix) > 0 && b.typeTransaction !== 'location')
    .map((b) => Number(b.prix))

  return {
    nature: 'Biens actuellement diffusés par l’agence (offre), et non des ventes conclues.',
    nombre: biens.length,
    villes: [...parVille.entries()].map(([ville, nombre]) => ({ ville, nombre })),
    surfaceMedianeM2: median(surfaces),
    prixVenteMedianEur: prixVente.length > 0 ? median(prixVente) : null,
    nombreEnVente: prixVente.length,
  }
}

/**
 * Dossier complet remis au modèle pour la rédaction.
 *
 * Tout ce qu'il contient est vérifiable dans le dépôt. `indisponible` est
 * aussi important que le reste : c'est la liste de ce que le modèle n'a pas le
 * droit d'avancer, parce que la donnée n'existe pas.
 */
export async function dossier({ codeInsee, lat, lon, ville, statistiquesExternes = [] }) {
  const point = pointDe(codeInsee)
  const latitude = Number.isFinite(lat) ? lat : point?.lat
  const longitude = Number.isFinite(lon) ? lon : point?.lon

  const maison = prixReference({ codeInsee, departement: String(codeInsee).slice(0, 2), type: 'maison', lat: latitude, lon: longitude })
  const appartement = prixReference({ codeInsee, departement: String(codeInsee).slice(0, 2), type: 'appartement', lat: latitude, lon: longitude })

  const releves = [...new Set(POINTS_REFERENCE.map((p) => p.releve))]

  return {
    ville,
    codeInsee,
    commune: {
      prixMaisonM2: Math.round(maison.pricePerM2),
      sourceMaison: maison.source,
      prixAppartementM2: Math.round(appartement.pricePerM2),
      sourceAppartement: appartement.source,
    },
    voisines: communesVoisines(latitude, longitude),
    quartiers: quartiers(codeInsee),
    portefeuille: await portefeuilleAgence(),
    // Chiffres venus de l'extérieur, déjà vérifiés comme provenant d'adresses
    // réellement consultées par la recherche (voir `verifieSources` dans
    // `claude-api.mjs`). Ils vivent dans leur propre bloc, jamais mêlés aux
    // relevés du site : ce ne sont pas les mêmes chiffres, ils n'engagent pas
    // l'agence de la même manière, et ils doivent être attribués dans le texte.
    statistiquesExternes: statistiquesExternes.map((stat) => ({
      enonce: stat.enonce,
      valeur: stat.valeur ?? null,
      periode: stat.periode ?? null,
      source: stat.source,
      url: stat.url,
      date: stat.date ?? null,
      aCiterNommementDansLeTexte: true,
    })),
    provenance: {
      pool: 'Relevés de l’agence et registre de prix communaux, agrégés dans le dépôt du site.',
      taillePool: POINTS_REFERENCE.length,
      releves,
      majorationCommercialeExclue: true,
      note: 'Prix au m² relevés, hors majoration commerciale appliquée par l’estimateur du site.',
    },
    indisponible: [
      'Aucune évolution dans le temps ne peut être DÉDUITE des relevés ci-dessus : le pool ne porte qu’un seul relevé (' +
        releves.join(', ') +
        '), il n’y a rien à comparer. Ne calcule ni pourcentage, ni tendance, ni « depuis l’an dernier » à partir de ces prix. ' +
        (statistiquesExternes.length > 0
          ? 'Une évolution ne peut être citée que depuis le bloc `statistiquesExternes`, en nommant sa source dans le texte.'
          : 'Aucune statistique d’évolution sourcée n’a été trouvée pour cet article : n’en avance aucune.'),
      'Aucun prix au m² de terrain : aucun point du pool ne le renseigne.',
      'Aucune donnée DVF : la Moselle, le Bas-Rhin et le Haut-Rhin relèvent du livre foncier et ne publient aucune mutation en open data.',
      'Aucun volume de transactions, aucun délai de vente, aucun nombre d’acquéreurs : rien de tel n’est mesuré dans le dépôt.',
    ],
  }
}

/**
 * Retrouve une commune du pool à partir de son nom.
 *
 * Écrit après s'être trompé : un code INSEE saisi de mémoire a fait passer
 * Ennery (57193, 2 280 €/m², banlieue de Metz) pour Diebling (57176,
 * 1 462 €/m², siège de l'agence) — deux marchés séparés de quarante-cinq
 * kilomètres et de huit cents euros du mètre carré, sans que rien ne signale
 * l'erreur : le code existait, le pool a répondu, le chiffre était plausible.
 *
 * D'où cette résolution par nom, et l'exception plutôt qu'un `null` : sur un
 * article publié, mieux vaut un script qui s'arrête qu'un prix de la commune
 * d'à côté présenté comme celui du secteur.
 */
export function resoudreCommune(nom) {
  const cible = String(nom ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

  if (!cible) throw new Error('resoudreCommune : nom de commune manquant.')

  const normalise = (v) =>
    String(v)
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()

  // Le pool nomme les quartiers « Forbach - Centre » : la ville est ce qui
  // précède le tiret, et tous ses quartiers partagent son code INSEE.
  const correspond = (point) => {
    const ville = normalise(point.nom).split(' - ')[0].trim()
    return ville === cible
  }

  const points = POINTS_REFERENCE.filter(correspond)
  if (points.length === 0) {
    throw new Error(
      `resoudreCommune : « ${nom} » est absente du pool de points de référence. ` +
        'Aucun prix local ne peut être cité pour cette commune — ajoutez-la dans ' +
        'scripts/_data/points-agence.json, puis relancez `npm run points:reference`.',
    )
  }

  return { codeInsee: points[0].codeInsee, nom: points[0].nom.split(' - ')[0].trim(), points }
}
