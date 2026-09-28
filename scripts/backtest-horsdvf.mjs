// Banc de test du chemin HORS COUVERTURE DVF — mesuré par procuration.
//
// LE PROBLÈME QU'IL RÉSOUT. En Moselle (57), Bas-Rhin (67), Haut-Rhin (68) et
// Mayotte (976), les mutations relèvent du livre foncier et ne sont publiées
// nulle part. L'estimation y repose sur le pool de points de référence
// (`api/_data/points-reference.js`) et sa majoration commerciale de +10 %
// (`MAJORATION_HORS_DVF`). Sa précision est donc, sur place, **invérifiable** :
// il n'existe aucun prix de vente public contre lequel la comparer.
//
// LE CONTOURNEMENT. On applique la méthode hors-DVF à des départements qui,
// eux, ont du DVF, et on compare aux vrais prix. La Meurthe-et-Moselle (54), la
// Meuse (55) et les Vosges (88) sont limitrophes de la Moselle, relèvent du même
// bassin, et Nancy y tient le rôle de Metz. Le chiffre obtenu n'est pas « la
// précision en Moselle » — c'est la précision de **cette méthode-là** sur des
// marchés comparables, ce qui est la meilleure approche disponible.
//
// CE QUI EST RIGOUREUSEMENT FIDÈLE À LA PRODUCTION
//
//   • **La formule finale est celle de `api/estimation.js`**, importée et non
//     recopiée : `montantAffichable(prixM2 × surface × coefficientEtage)`, puis
//     `fourchetteSymetrique(prix, FOURCHETTE.demiLargeurHorsDvfPct)`. La majoration
//     vient de `MAJORATION_HORS_DVF`, le coefficient d'étage de
//     `src/lib/etage.js`, la distance de `api/_lib/geo.js`, la clé de prix et le
//     rayon de portée de `api/_lib/pointsReference.js`.
//
//   • **Le moteur DVF de comparaison est le moteur de production**, `estime`,
//     appelé exactement comme `api/estimation.js` l'appelle.
//
//   • **Aucun moteur ne voit l'avenir.** Pour chaque vente testée, les deux
//     méthodes ne reçoivent que les ventes strictement antérieures à sa date.
//     La vente testée est donc exclue, et avec elle tout ce qui s'est vendu le
//     même jour.
//
//   • **La cascade réimplémentée est vérifiée contre la vraie.** Le pool de
//     production étant figé sur 57/67/68/976, il a bien fallu réécrire
//     l'itération sur les points pour pouvoir y substituer un pool 54/55/88.
//     Ces trente lignes sont donc le seul endroit où ce banc n'exécute pas le
//     code de production — et `verifieCascade()` les confronte au vrai
//     `prixReference()` sur le vrai pool, en 57/67/68, avant toute mesure. Un
//     seul écart interrompt le banc.
//
// LES TROIS APPROXIMATIONS, ET POURQUOI ELLES SONT INÉVITABLES
//
//   1. **Le pool de production n'est pas reproductible à l'identique.** Ses 774
//      points ne sont *pas* des médianes de ventes antérieures : ce sont des
//      relevés — 717 d'un registre multi-sources, 57 saisis par l'agence —
//      tous datés de 2026-09, et aucun ne porte de prix de terrain. Rien de
//      tout cela ne se reconstruit à partir de DVF.
//
//      Ce qui est reproduit, c'est la **recette documentée** de l'étage
//      « ventes » du script de construction (`pointsVentes()` dans
//      `scripts/points-reference.mjs`) : médiane du €/m² par commune et par
//      type, au moins `VENTES_MIN` ventes, bornes de qualité de DVF. Elle est
//      appliquée aux seules ventes antérieures à la vente testée. C'est la
//      même *forme* de table — un prix par commune et par type, sans
//      correction de surface ni de terrain — alimentée par la meilleure donnée
//      disponible. C'est cette forme-là que la mesure juge.
//
//      Conséquence à garder en tête dans les deux sens : un relevé
//      multi-sources fait par un professionnel peut être meilleur qu'une
//      médiane sur deux ventes, et la couverture communale du pool réel (292
//      points pour les 725 communes de Moselle) est plus maigre que celle
//      qu'atteint ici DVF. Le chiffre produit est donc un ordre de grandeur de
//      la méthode, pas un audit du pool mosellan.
//
//   2. **L'étage est inconnu**, comme dans le banc DVF : DVF ne le publie pas.
//      `coefficientEtage(null)` vaut 1, le facteur est donc inerte ici. Il
//      reste dans la formule, à sa place, mais la mesure ne dit rien de lui.
//
//   3. **Le terrain de la vente testée est le `surface_terrain` de DVF**, là où
//      la production lit la contenance cadastrale transmise par le front. Sur
//      54/55/88 le champ est renseigné sur 98 % des maisons, et prendre la même
//      source pour le bien et pour ses comparables évite d'introduire un écart
//      qui ne viendrait que du mélange de deux référentiels.
//
// LES VENTES HORS MARCHÉ SONT ÉCARTÉES, exactement comme dans `backtest.mjs` :
// prix au m² hors de 0,5×–2× la médiane des ventes du même type dans son
// secteur (2 km), médiane calculée par le moteur sur le seul passé de la vente.
// Une cession familiale ou un lot vendu après sinistre ne mesure pas l'erreur
// d'une méthode, seulement le bruit de la base — et les garder avantagerait
// artificiellement la méthode la plus grossière des deux.
//
// CE QUE CE BANC NE FAIT PAS. Il ne touche ni `reference.js`, ni
// `MAJORATION_HORS_DVF`, ni le moteur, ni aucun chemin de production. Il ne
// modifie aucun fichier hors de son dossier de sortie.
//
// USAGE
//   node scripts/backtest-horsdvf.mjs --n 40        essai de fonctionnement
//   node scripts/backtest-horsdvf.mjs --n 800       mesure
//
// OPTIONS
//   --n <nombre>     ventes retenues, après exclusion des hors marché (défaut 800)
//   --deps <liste>   départements testés (défaut 54,55,88)
//   --graine <n>     graine du tirage (défaut 42) — tirage emboîté, comme dans
//                    `backtest.mjs` : les 40 ventes d'un essai sont les 40
//                    premières des 800 d'une mesure
//   --sortie <dir>   dossier des résultats (défaut cache/backtest-horsdvf)

import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { parseDvfCsv } from '../api/_lib/dvf.js'
import { FOURCHETTE, QUALITE } from '../api/_lib/estimationConfig.js'
import { distanceM } from '../api/_lib/geo.js'
import { estime, fourchetteSymetrique, montantAffichable } from '../api/_lib/moteur.js'
import { clePrix, RAYON_MAX_M } from '../api/_lib/pointsReference.js'
import { MAJORATION_HORS_DVF, prixReference } from '../api/_lib/reference.js'
import { POINTS_REFERENCE } from '../api/_data/points-reference.js'
import { coefficientEtage } from '../src/lib/etage.js'

const RACINE = path.resolve(import.meta.dirname, '..')
const CACHE = path.join(RACINE, 'cache')

/** Départements limitrophes de la Moselle qui, eux, ont du DVF. */
const DEPARTEMENTS = ['54', '55', '88']

/** Millésimes chargés — la fenêtre du moteur (5 ans) vue depuis 2025. */
const MILLESIMES = [2021, 2022, 2023, 2024, 2025]

/** Les ventes testées sont tirées dans cette seule année. */
const ANNEE_TESTEE = 2025

/** Seuls ces types se testent : un terrain nu n'a pas de surface habitable. */
const TYPES_TESTES = new Set(['maison', 'appartement'])

/**
 * Nombre de ventes minimum pour qu'une commune tienne son propre point.
 * Reprise de `VENTES_MIN` dans `scripts/points-reference.mjs`, qui ne l'exporte
 * pas. Le commentaire d'origine vaut ici mot pour mot : une vente unique ne
 * fait pas un prix de marché, deux ne valent guère mieux, mais la médiane
 * commence à amortir l'écart.
 */
const VENTES_MIN = 2

/**
 * Bornes de qualité du script de construction du pool (`BORNES`), qui ne les
 * exporte pas non plus. Ce sont celles de DVF.
 */
const BORNES = {
  maison: { surface: [15, 1000], prixM2: [200, 30000] },
  appartement: { surface: [8, 500], prixM2: [200, 40000] },
}

/** Seuil INSEE de la commune rurale. Sert à la stratification du tirage. */
const SEUIL_URBAIN_HAB = 2000

/**
 * Part de l'échantillon marquée « calibration ». Le reste est « validation ».
 * Même valeur que `backtest.mjs` : tout coefficient proposé plus bas est
 * calibré sur les 70 % et **mesuré sur les 30 % restants**, sans quoi le gain
 * annoncé ne serait que l'ajustement du modèle à son propre échantillon.
 */
const PART_CALIBRATION = 0.7

/** Tranches de surface du rapport. */
const TRANCHES_SURFACE = [
  { cle: '< 60 m²', min: 0, max: 60 },
  { cle: '60 – 100 m²', min: 60, max: 100 },
  { cle: '100 – 150 m²', min: 100, max: 150 },
  { cle: '> 150 m²', min: 150, max: Infinity },
]

/** Tranches de terrain, pour le diagnostic terrain (maisons). */
const TRANCHES_TERRAIN = [
  { cle: 'inconnu', min: null, max: null },
  { cle: '< 300 m²', min: 0, max: 300 },
  { cle: '300 – 700 m²', min: 300, max: 700 },
  { cle: '700 – 1 500 m²', min: 700, max: 1500 },
  { cle: '> 1 500 m²', min: 1500, max: Infinity },
]

/**
 * Demi-largeurs dont on veut la couverture, pour arbitrer le réglage de
 * `FOURCHETTE.demiLargeurHorsDvfPct`. 0,13 est la valeur de production depuis
 * septembre 2026 ; les trois autres encadrent l'arbitrage.
 */
const COURBE_DEMI_LARGEURS = [0.05, 0.13, 0.2, 0.25]

/** Dates de gel du diagnostic « vieillissement de la table ». */
const GELS = ['2022-12-31', '2023-12-31', '2024-12-31']

const BASE_DVF = 'https://files.data.gouv.fr/geo-dvf/latest/csv'
const BASE_GEO = 'https://geo.api.gouv.fr'

// ---------------------------------------------------------------- utilitaires

function options(argv) {
  const lu = (nom, defaut) => {
    const i = argv.indexOf(`--${nom}`)
    return i >= 0 && argv[i + 1] ? argv[i + 1] : defaut
  }

  return {
    n: Number(lu('n', 800)),
    deps: String(lu('deps', DEPARTEMENTS.join(','))).split(',').filter(Boolean),
    graine: String(lu('graine', '42')),
    sortie: path.resolve(RACINE, lu('sortie', 'cache/backtest-horsdvf')),
  }
}

/** Rang de tirage stable et emboîté — même principe que `backtest.mjs`. */
function rang(graine, cle) {
  return createHash('sha256').update(`${graine}|${cle}`).digest().readUInt32BE(0) / 2 ** 32
}

const mediane = (valeurs) => {
  if (valeurs.length === 0) return null
  const t = [...valeurs].sort((a, b) => a - b)
  const m = Math.floor(t.length / 2)
  return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2
}

/** Médiane d'un tableau **déjà trié** — le pool incrémental n'en a pas d'autre. */
const medianeTriee = (t) => {
  if (t.length === 0) return null
  const m = Math.floor(t.length / 2)
  return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2
}

const centile = (valeurs, q) => {
  if (valeurs.length === 0) return null
  const t = [...valeurs].sort((a, b) => a - b)
  const r = (t.length - 1) * q
  const bas = Math.floor(r)
  const haut = Math.ceil(r)
  return bas === haut ? t[bas] : t[bas] + (t[haut] - t[bas]) * (r - bas)
}

const part = (valeurs, predicat) =>
  valeurs.length === 0 ? null : valeurs.filter(predicat).length / valeurs.length

const nb = (valeur, decimales = 1) =>
  valeur == null || !Number.isFinite(valeur) ? '—' : valeur.toFixed(decimales)

const pct = (valeur, decimales = 1) =>
  valeur == null || !Number.isFinite(valeur) ? '—' : `${(valeur * 100).toFixed(decimales)} %`

const signe = (valeur, decimales = 1) =>
  valeur == null || !Number.isFinite(valeur)
    ? '—'
    : `${valeur >= 0 ? '+' : ''}${(valeur * 100).toFixed(decimales)} %`

const euros = (valeur) =>
  valeur == null ? '—' : `${Math.round(valeur).toLocaleString('fr-FR')} €`

/** Index de la première vente de date ≥ `date`, dans un tableau trié par date. */
function borneInf(ventesTriees, date) {
  let bas = 0
  let haut = ventesTriees.length
  while (bas < haut) {
    const milieu = (bas + haut) >> 1
    if (ventesTriees[milieu].date < date) bas = milieu + 1
    else haut = milieu
  }
  return bas
}

/** Insertion dans un tableau trié, en gardant le tri. */
function insereTrie(tableau, valeur) {
  let bas = 0
  let haut = tableau.length
  while (bas < haut) {
    const milieu = (bas + haut) >> 1
    if (tableau[milieu] < valeur) bas = milieu + 1
    else haut = milieu
  }
  tableau.splice(bas, 0, valeur)
}

async function telecharge(url, destination) {
  if (existsSync(destination)) return false

  const reponse = await fetch(url, { redirect: 'follow' })
  if (!reponse.ok) throw new Error(`${url} → HTTP ${reponse.status}`)

  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(destination, Buffer.from(await reponse.arrayBuffer()))
  return true
}

const semestreDe = (date) => `${date.slice(0, 4)}-S${Number(date.slice(5, 7)) <= 6 ? 1 : 2}`

// ------------------------------------------------------------------- données

/** Ventes d'un département sur toute la fenêtre, triées par date. */
async function ventesDepartement(dep, annees) {
  const lots = []

  for (const annee of annees) {
    const fichier = path.join(CACHE, 'dvf', `${dep}-${annee}.csv.gz`)
    await telecharge(`${BASE_DVF}/${annee}/departements/${dep}.csv.gz`, fichier)
    lots.push(parseDvfCsv(gunzipSync(await readFile(fichier)).toString('utf8')))
  }

  return lots.flat().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/**
 * Communes d'un département : nom, population, centre.
 *
 * Même source que le script de construction du pool — `geo.api.gouv.fr`,
 * service public ouvert. Une requête par département, mise en cache sur le
 * disque : le centre de la commune tient le rôle des coordonnées du point de
 * référence, et la population sert à séparer urbain et rural dans le tirage.
 */
async function communesDepartement(dep) {
  const fichier = path.join(CACHE, 'geo', `communes-${dep}.json`)

  if (!existsSync(fichier)) {
    const url = `${BASE_GEO}/departements/${dep}/communes?fields=nom,population,centre`
    const reponse = await fetch(url, { signal: AbortSignal.timeout(20_000) })
    if (!reponse.ok) throw new Error(`${url} → HTTP ${reponse.status}`)
    await mkdir(path.dirname(fichier), { recursive: true })
    await writeFile(fichier, JSON.stringify(await reponse.json()))
  }

  const brut = JSON.parse(await readFile(fichier, 'utf8'))
  return brut.map((c) => ({
    codeInsee: c.code,
    nom: c.nom,
    population: Number(c.population) || 0,
    lat: c.centre?.coordinates?.[1] ?? null,
    lon: c.centre?.coordinates?.[0] ?? null,
  }))
}

// -------------------------------------------------- pool de référence simulé

/**
 * Pool de points de référence, reconstruit au fil du temps.
 *
 * Reproduit la recette de `pointsVentes()` du script de construction : médiane
 * du €/m² par commune et par type, sur les ventes retenues par les bornes de
 * qualité, à partir de `VENTES_MIN` ventes. La différence tient au temps : le
 * pool réel est un relevé figé, celui-ci n'intègre jamais qu'un passé — on
 * l'avance vente par vente, et il ne contient donc à aucun moment la vente
 * qu'on s'apprête à tester.
 *
 * Les médianes sont mises en cache et invalidées à l'insertion : entre deux
 * ventes testées, une poignée de ventes seulement entrent dans le pool, et
 * recalculer les mille six cents médianes à chaque fois serait le poste de
 * calcul dominant du banc.
 */
class Pool {
  constructor(communes) {
    /** `insee|type` → €/m² triés des ventes antérieures. */
    this.prix = new Map()
    /** `insee|type` → médiane, invalidée à l'insertion. */
    this.cache = new Map()
    /** Communes connues, avec leur centre : le support géographique du pool. */
    this.communes = communes.filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon))
    this.parInsee = new Map(this.communes.map((c) => [c.codeInsee, c]))
  }

  /** Une vente entre dans le pool — mêmes filtres que le script de construction. */
  ajoute(vente) {
    const bornes = BORNES[vente.kind]
    if (!bornes) return

    const [sMin, sMax] = bornes.surface
    const [pMin, pMax] = bornes.prixM2
    if (vente.surface < sMin || vente.surface > sMax) return
    if (vente.pricePerM2 < pMin || vente.pricePerM2 > pMax) return

    const cle = `${vente.commune}|${vente.kind}`
    if (!this.prix.has(cle)) this.prix.set(cle, [])
    insereTrie(this.prix.get(cle), vente.pricePerM2)
    this.cache.delete(cle)
  }

  /** €/m² du point de la commune pour ce type, ou `null` — étage 3 de la cascade. */
  pointCommune(codeInsee, type) {
    const cle = `${codeInsee}|${clePrix(type)}`
    const valeurs = this.prix.get(cle)
    if (!valeurs || valeurs.length < VENTES_MIN) return null

    if (!this.cache.has(cle)) this.cache.set(cle, medianeTriee(valeurs))
    return this.cache.get(cle)
  }

  /** Nombre de ventes derrière le point d'une commune — pour le journal. */
  effectif(codeInsee, type) {
    return this.prix.get(`${codeInsee}|${clePrix(type)}`)?.length ?? 0
  }

  /**
   * Point renseigné le plus proche, dans `RAYON_MAX_M` — étage 4 de la cascade.
   *
   * Le pool couvre les trois départements à la fois, sans cloisonnement : c'est
   * ce que fait `pointLePlusProche` en production, où un point du Bas-Rhin peut
   * répondre pour une adresse mosellane.
   */
  pointLePlusProche(lat, lon, type, rayonM = RAYON_MAX_M) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

    let meilleur = null

    for (const commune of this.communes) {
      const prixM2 = this.pointCommune(commune.codeInsee, type)
      if (prixM2 === null) continue

      const d = distanceM(lat, lon, commune.lat, commune.lon)
      if (d > rayonM) continue
      if (meilleur === null || d < meilleur.distanceM) {
        meilleur = { commune, prixM2, distanceM: d }
      }
    }

    return meilleur
  }

  /** Médiane départementale du €/m² — support de l'étage 5. */
  medianeDepartementale(dep, type) {
    const key = clePrix(type)
    const valeurs = []
    for (const [cle, liste] of this.prix) {
      const [insee, t] = cle.split('|')
      if (t !== key) continue
      if (!insee.startsWith(dep)) continue
      valeurs.push(...liste)
    }
    return mediane(valeurs)
  }
}

/**
 * Cascade de `prixReference`, réécrite pour accepter un pool substitué.
 *
 * C'EST LE SEUL CODE DU BANC QUI DOUBLE LA PRODUCTION, et il est confronté à
 * l'original par `verifieCascade()`. Les étages sont ceux de `reference.js`,
 * dans le même ordre :
 *
 *   1–2. surcharge `ESTIMATION_PRIX_M2` — hors sujet ici (variable absente),
 *        mais rendue quand même pour que la comparaison d'identité porte sur la
 *        cascade entière.
 *   3.   pool, commune exacte              → `reference-commune-pool`
 *   4.   pool, point le plus proche ≤ 25 km → `reference-point-proche`
 *   5.   table départementale               → `reference-hors-couverture`
 *   6.   filet national                     → `reference-nationale`
 *
 * `pool` expose `pointCommune(insee, type)` et `pointLePlusProche(lat, lon,
 * type)`, `departementale` rend l'étage 5 et `nationale` l'étage 6.
 */
function cascade({ codeInsee, departement, type, lat, lon }, pool, departementale, nationale) {
  const surcharge = surcharges()
  const key = clePrix(type)

  const communal = codeInsee ? surcharge[String(codeInsee)] : null
  if (communal && Number.isFinite(Number(communal[key]))) {
    return { pricePerM2: Number(communal[key]), source: 'reference-commune' }
  }

  const departemental = departement ? surcharge[String(departement)] : null
  if (departemental && Number.isFinite(Number(departemental[key]))) {
    return { pricePerM2: Number(departemental[key]), source: 'reference-departement' }
  }

  const exact = pool.pointCommune(codeInsee, type, lat, lon)
  if (exact !== null) {
    return {
      pricePerM2: Number(exact.prixM2 ?? exact),
      source: 'reference-commune-pool',
      pointNom: exact.nom ?? null,
      pointDistanceM: 0,
    }
  }

  const proche = pool.pointLePlusProche(lat, lon, type)
  if (proche) {
    return {
      pricePerM2: Number(proche.prixM2 ?? proche.point?.prix?.[key]),
      source: 'reference-point-proche',
      pointNom: proche.commune?.nom ?? proche.point?.nom ?? null,
      pointDistanceM: Math.round(proche.distanceM),
    }
  }

  const integre = departementale(departement, type)
  if (integre != null) {
    return { pricePerM2: integre, source: 'reference-hors-couverture' }
  }

  return { pricePerM2: nationale(type), source: 'reference-nationale' }
}

/** Surcharge d'environnement, lue comme `reference.js` la lit. */
function surcharges() {
  const raw = process.env.ESTIMATION_PRIX_M2
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * Confronte la cascade réécrite au vrai `prixReference`, sur le vrai pool.
 *
 * Le banc ne mesure rien avant que les deux ne rendent le même prix et la même
 * source sur un jeu de points couvrant les quatre étages utiles : une commune
 * du pool, une commune voisine servie par le point le plus proche, un point
 * hors de portée servi par la table départementale, et une coordonnée hors
 * secteur servie par le filet national.
 *
 * Sans cette vérification, une divergence d'un étage — un tri différent, un
 * rayon mal appliqué, un `clePrix` oublié — passerait inaperçue et le banc
 * mesurerait une méthode qui n'existe nulle part.
 */
function verifieCascade() {
  // Pool d'adaptation : le vrai `POINTS_REFERENCE`, vu à travers l'interface
  // qu'attend `cascade`. Les tables des étages 5 et 6 sont celles de
  // `reference.js`, atteintes en lui passant les mêmes entrées.
  const poolReel = {
    pointCommune(codeInsee, type, lat, lon) {
      if (!codeInsee) return null
      const key = clePrix(type)
      const candidats = POINTS_REFERENCE.filter(
        (p) => String(p.codeInsee) === String(codeInsee) && Number(p.prix?.[key]) > 0,
      )
      if (candidats.length === 0) return null
      if (candidats.length === 1 || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        return { prixM2: Number(candidats[0].prix[key]), nom: candidats[0].nom }
      }
      const meilleur = candidats.reduce((best, p) =>
        distanceM(lat, lon, p.lat, p.lon) < distanceM(lat, lon, best.lat, best.lon) ? p : best,
      )
      return { prixM2: Number(meilleur.prix[key]), nom: meilleur.nom }
    },
    pointLePlusProche(lat, lon, type) {
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
      const key = clePrix(type)
      let meilleur = null
      for (const p of POINTS_REFERENCE) {
        if (!(Number(p.prix?.[key]) > 0)) continue
        if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue
        const d = distanceM(lat, lon, p.lat, p.lon)
        if (d > RAYON_MAX_M) continue
        if (meilleur === null || d < meilleur.distanceM) {
          meilleur = { prixM2: Number(p.prix[key]), commune: { nom: p.nom }, distanceM: d }
        }
      }
      return meilleur
    },
  }

  // Les tables 5 et 6 de `reference.js` ne sont pas exportées ; on les atteint
  // par `prixReference` lui-même, sur des entrées qui ne peuvent toucher que
  // ces étages (aucune commune, aucune coordonnée à portée du pool).
  const departementale = (dep, type) => {
    const r = prixReference({ codeInsee: null, departement: dep, type, lat: null, lon: null })
    return r.source === 'reference-hors-couverture' ? r.pricePerM2 : null
  }
  const nationale = (type) =>
    prixReference({ codeInsee: null, departement: '99', type, lat: null, lon: null }).pricePerM2

  const cas = [
    // Étage 3 — commune du pool. Metz est découpée en quartiers : le tri par
    // distance doit désigner le même que celui de production.
    { nom: 'Metz centre (57463)', codeInsee: '57463', departement: '57', type: 'appartement', lat: 49.1193, lon: 6.1757 },
    { nom: 'Metz Borny (57463)', codeInsee: '57463', departement: '57', type: 'appartement', lat: 49.1099, lon: 6.2218 },
    { nom: 'Diebling (57176)', codeInsee: '57176', departement: '57', type: 'maison', lat: 49.1178, lon: 6.9694 },
    { nom: 'Algrange maison (57012)', codeInsee: '57012', departement: '57', type: 'maison', lat: 49.3653, lon: 6.0493 },
    // Type `terrain` : le pool n'en porte aucun prix, l'étage 3 doit être sauté.
    { nom: 'Algrange terrain (57012)', codeInsee: '57012', departement: '57', type: 'terrain', lat: 49.3653, lon: 6.0493 },
    // `autre` et `local` suivent la maison — `clePrix` doit le refléter.
    { nom: 'Diebling local (57176)', codeInsee: '57176', departement: '57', type: 'local', lat: 49.1178, lon: 6.9694 },
    // Étage 4 — commune absente du pool, un point à portée.
    { nom: 'commune hors pool, 57', codeInsee: '57999', departement: '57', type: 'maison', lat: 49.12, lon: 6.97 },
    { nom: 'commune hors pool, 67', codeInsee: '67999', departement: '67', type: 'appartement', lat: 48.58, lon: 7.75 },
    // Étage 5 — aucun point à moins de 25 km (Mayotte n'a pas de point).
    { nom: 'Mayotte', codeInsee: '97601', departement: '976', type: 'maison', lat: -12.78, lon: 45.23 },
    { nom: '68 sans coordonnées', codeInsee: null, departement: '68', type: 'terrain', lat: null, lon: null },
    // Étage 6 — département inconnu de la table.
    { nom: 'filet national', codeInsee: null, departement: '99', type: 'appartement', lat: null, lon: null },
  ]

  const ecarts = []

  for (const c of cas) {
    const attendu = prixReference(c)
    const obtenu = cascade(c, poolReel, departementale, nationale)

    const memePrix = Math.abs(attendu.pricePerM2 - obtenu.pricePerM2) < 1e-9
    const memeSource = attendu.source === obtenu.source

    if (!memePrix || !memeSource) {
      ecarts.push(
        `${c.nom} : attendu ${Math.round(attendu.pricePerM2)} €/m² (${attendu.source}), ` +
          `obtenu ${Math.round(obtenu.pricePerM2)} €/m² (${obtenu.source})`,
      )
    }
  }

  return { cas: cas.length, ecarts }
}

// ------------------------------------------------------- estimation hors-DVF

/**
 * Prix hors-DVF d'un bien, par le chemin de `api/estimation.js`.
 *
 * La formule, la majoration, l'arrondi et la fourchette viennent tous de la
 * production. Seule la cascade est la réécriture vérifiée plus haut.
 *
 * `majoration` est paramétrable dans un seul but : mesurer ce que produit le
 * +10 %, comme demandé. La valeur par défaut est celle de production.
 */
function estimeHorsDvf(
  { codeInsee, departement, type, lat, lon, surfaceM2, etage = null },
  pool,
  departementale,
  nationale,
  { majoration = MAJORATION_HORS_DVF, correctionPrixM2 = null } = {},
) {
  const base = cascade({ codeInsee, departement, type, lat, lon }, pool, departementale, nationale)

  // La majoration suit le département en production ; ici tous les
  // départements testés jouent le rôle d'un département hors couverture, elle
  // s'applique donc toujours — c'est bien la méthode hors-DVF qu'on mesure.
  let prixM2 = base.pricePerM2 * majoration

  // Correction optionnelle, pour les diagnostics seulement. Rien de tel
  // n'existe en production.
  if (correctionPrixM2) prixM2 *= correctionPrixM2

  const coefficient = coefficientEtage(etage)
  const prix = montantAffichable(prixM2 * surfaceM2 * coefficient)
  const { low, high } = fourchetteSymetrique(prix, FOURCHETTE.demiLargeurHorsDvfPct)

  return {
    prix,
    low,
    high,
    prixM2,
    prixM2Base: base.pricePerM2,
    source: base.source,
    pointNom: base.pointNom ?? null,
    pointDistanceM: base.pointDistanceM ?? null,
    coefficientEtage: coefficient,
  }
}

// --------------------------------------------------------- ventes hors marché

/**
 * La vente testée tient-elle dans le marché de son secteur ?
 *
 * Reprise telle quelle de `backtest.mjs` : la médiane de secteur est celle que
 * le moteur DVF vient lui-même de calculer sur le seul passé de la vente, et
 * les bornes sont celles qu'il applique à ses propres candidates.
 */
function horsMarcheDe(vente, resultat) {
  const medianeSecteur = resultat?.candidats?.medianeSecteurPrixM2 ?? null
  if (!medianeSecteur) return { horsMarche: false, medianeSecteur: null }

  return {
    horsMarche:
      vente.pricePerM2 < medianeSecteur * QUALITE.ecartMedianeMin ||
      vente.pricePerM2 > medianeSecteur * QUALITE.ecartMedianeMax,
    medianeSecteur,
  }
}

// --------------------------------------------------------------- indicateurs

/**
 * Indicateurs d'une population de lignes, pour une méthode donnée.
 *
 * `ecart` est l'erreur relative au vrai prix : `(estimé − réel) / réel`. C'est
 * lui qui porte l'erreur médiane absolue et le biais médian signé.
 *
 * `ecartAuPrix` est `|1 − réel / estimé|` : la demi-largeur qu'aurait dû avoir
 * la fourchette **centrée sur l'estimation** pour contenir le prix réel. Les
 * deux ne se confondent pas, et c'est le second qui répond à la question des
 * fourchettes — une fourchette s'ouvre autour du chiffre affiché, pas autour
 * d'un prix réel que personne ne connaît.
 */
function indicateurs(lignes, prefixe) {
  const ecarts = lignes.map((l) => l[`${prefixe}Ecart`]).filter((v) => Number.isFinite(v))

  // Un groupe vide rend une fiche à zéro plutôt que `null` : tout le rapport
  // passe ses champs à `pct`/`signe`/`nb`, qui savent afficher « — ». Rendre
  // `null` obligerait chaque ligne de chaque tableau à se garder elle-même, et
  // une seule omission ferait tomber le rapport entier — ce qui est arrivé.
  if (ecarts.length === 0) {
    return {
      n: 0, erreurMediane: null, biaisMedian: null, biaisMoyen: null,
      a10: null, a15: null, a20: null, a25: null,
      couvertureAffichee: null, demiLargeur70: null, demiLargeur80: null,
    }
  }

  const absolus = ecarts.map(Math.abs)
  const auPrix = lignes
    .map((l) => l[`${prefixe}EcartAuPrix`])
    .filter((v) => Number.isFinite(v))

  return {
    n: ecarts.length,
    erreurMediane: mediane(absolus),
    biaisMedian: mediane(ecarts),
    biaisMoyen: ecarts.reduce((s, v) => s + v, 0) / ecarts.length,
    a10: part(absolus, (v) => v <= 0.1),
    a15: part(absolus, (v) => v <= 0.15),
    a20: part(absolus, (v) => v <= 0.2),
    a25: part(absolus, (v) => v <= 0.25),
    // Couverture de la fourchette réellement affichée par ce chemin.
    couvertureAffichee: part(lignes, (l) => l[`${prefixe}DansFourchette`] === true),
    // Demi-largeurs requises, autour de l'estimation.
    demiLargeur70: centile(auPrix, 0.7),
    demiLargeur80: centile(auPrix, 0.8),
  }
}

/** Groupement des lignes par clé, dans un ordre imposé si fourni. */
function parCle(lignes, cle, ordre = null) {
  const groupes = new Map()
  for (const l of lignes) {
    const k = typeof cle === 'function' ? cle(l) : l[cle]
    if (k == null) continue
    if (!groupes.has(k)) groupes.set(k, [])
    groupes.get(k).push(l)
  }

  if (!ordre) return [...groupes.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])))
  return ordre.filter((k) => groupes.has(k)).map((k) => [k, groupes.get(k)])
}

const trancheSurface = (surface) =>
  TRANCHES_SURFACE.find((t) => surface >= t.min && surface < t.max)?.cle ?? null

const trancheTerrain = (terrain) => {
  if (!(terrain > 0)) return 'inconnu'
  return TRANCHES_TERRAIN.find((t) => t.min !== null && terrain >= t.min && terrain < t.max)?.cle ?? null
}

/** Tableau markdown comparant les deux méthodes sur des groupes de lignes. */
function tableauComparatif(titre, groupes, libelleColonne = 'Groupe') {
  const lignes = [
    `**${titre}**`,
    '',
    `| ${libelleColonne} | n | Hors-DVF : err. méd. | Biais méd. | ±10 % | ±15 % | ±20 % | ±25 % | DVF : err. méd. | Biais méd. | ±15 % |`,
    '| --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |',
  ]

  for (const [cle, lot] of groupes) {
    const h = indicateurs(lot, 'horsDvf')
    const d = indicateurs(lot, 'dvf')
    if (h.n === 0) continue

    lignes.push(
      `| ${cle} | ${lot.length} | **${pct(h.erreurMediane)}** | ${signe(h.biaisMedian)} | ` +
        `${pct(h.a10, 0)} | ${pct(h.a15, 0)} | ${pct(h.a20, 0)} | ${pct(h.a25, 0)} | ` +
        `${pct(d.erreurMediane)} | ${signe(d.biaisMedian)} | ${pct(d.a15, 0)} |`,
    )
  }

  return lignes.join('\n')
}

// ------------------------------------------------------------- régressions

/**
 * Moindres carrés simples sur `y = a·x + b`, avec t de Student sur `a`.
 *
 * Sert aux deux coefficients de correction proposés (surface et terrain). Ils
 * sont ajustés **en logarithme des deux côtés** : l'écart de prix se mesure en
 * `ln(réel / estimé)` et l'écart de taille en `ln(taille / médiane)`. La pente
 * `a` est alors l'exposant d'une loi de puissance, c'est-à-dire exactement la
 * forme qu'on veut poser sur le €/m² — multiplicative, sans unité, et qui vaut
 * 1 quand le bien est à la médiane de sa commune.
 *
 * Le `t` est là pour la même raison que dans `terrain.js` : une pente non
 * significative ne se corrige pas, mieux vaut ne rien faire que corriger au
 * hasard.
 */
function regression(points) {
  const n = points.length
  if (n < 10) return { n, pente: null, ordonnee: null, tStat: null, r2: null }

  const mx = points.reduce((s, p) => s + p.x, 0) / n
  const my = points.reduce((s, p) => s + p.y, 0) / n

  let sxx = 0
  let sxy = 0
  for (const p of points) {
    sxx += (p.x - mx) ** 2
    sxy += (p.x - mx) * (p.y - my)
  }

  if (sxx <= 0) return { n, pente: null, ordonnee: null, tStat: null, r2: null }

  const pente = sxy / sxx
  const ordonnee = my - pente * mx

  let rss = 0
  let tss = 0
  for (const p of points) {
    rss += (p.y - (pente * p.x + ordonnee)) ** 2
    tss += (p.y - my) ** 2
  }

  const sigma2 = rss / (n - 2)
  const erreurType = Math.sqrt(sigma2 / sxx)

  return {
    n,
    pente,
    ordonnee,
    tStat: erreurType > 0 ? pente / erreurType : null,
    r2: tss > 0 ? 1 - rss / tss : null,
  }
}

// ------------------------------------------------------------------- mesure

async function main() {
  const opts = options(process.argv.slice(2))
  const depart = Date.now()

  console.log(
    `Banc hors-DVF — ${opts.n} ventes de ${ANNEE_TESTEE}, ` +
      `départements ${opts.deps.join(', ')}, graine ${opts.graine}`,
  )

  // --- 0. Identité de la cascade. Rien ne se mesure avant.
  process.stdout.write('\nVérification de la cascade contre `prixReference` (vrai pool 57/67/68/976)…\n')
  const identite = verifieCascade()

  if (identite.ecarts.length > 0) {
    console.error(
      `\n${identite.ecarts.length} écart(s) sur ${identite.cas} cas — mesure interrompue :`,
    )
    for (const e of identite.ecarts) console.error(`  ✗ ${e}`)
    console.error(
      '\nLa cascade réécrite ne reproduit pas `reference.js`. Corriger `cascade()`\n' +
        'avant toute mesure : sans cela le banc mesurerait une méthode qui n’existe pas.',
    )
    process.exit(1)
  }

  console.log(`  ✓ ${identite.cas} cas identiques (prix et source) — les 6 étages de la cascade`)

  // --- 1. Données.
  process.stdout.write('\nChargement des communes…\n')
  const communes = []
  for (const dep of opts.deps) {
    const lot = await communesDepartement(dep)
    communes.push(...lot)
    console.log(`  ${dep} : ${lot.length} communes, ${lot.filter((c) => c.population >= SEUIL_URBAIN_HAB).length} de 2 000 hab. ou plus`)
  }
  const communeParInsee = new Map(communes.map((c) => [c.codeInsee, c]))

  process.stdout.write('\nLecture des millésimes DVF…\n')
  /** Ventes par département, triées par date — ce que voit le moteur DVF. */
  const poolParDep = new Map()
  for (const dep of opts.deps) {
    const ventes = await ventesDepartement(dep, MILLESIMES)
    poolParDep.set(dep, ventes)
    console.log(`  ${dep} : ${ventes.length} ventes sur ${MILLESIMES.length} millésimes`)
  }

  /** Flux unique des trois départements, trié par date — ce qui alimente le pool. */
  const fluxPool = opts.deps
    .flatMap((dep) => poolParDep.get(dep).map((v) => ({ ...v, dep })))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  // --- 2. Tirage stratifié.
  //
  // Le tirage n'est pas proportionnel, et c'est voulu : proportionnel, la Meuse
  // rendrait moins de cent ventes et ses appartements une dizaine, dont on ne
  // pourrait rien conclure. On pose donc un plancher par cellule
  // (département × type × urbain/rural) et on répartit le reste au prorata de
  // ce qui existe. Le résumé rend la composition réellement obtenue.
  const candidates = []
  for (const dep of opts.deps) {
    for (const v of poolParDep.get(dep)) {
      if (Number(v.date.slice(0, 4)) !== ANNEE_TESTEE) continue
      if (!TYPES_TESTES.has(v.kind)) continue
      const commune = communeParInsee.get(v.commune)
      if (!commune) continue

      candidates.push({
        ...v,
        dep,
        zone: commune.population >= SEUIL_URBAIN_HAB ? 'urbain' : 'rural',
        communeNom: commune.nom,
        population: commune.population,
        rang: rang(opts.graine, v.id),
      })
    }
  }

  const cellules = new Map()
  for (const c of candidates) {
    const cle = `${c.dep}|${c.kind}|${c.zone}`
    if (!cellules.has(cle)) cellules.set(cle, [])
    cellules.get(cle).push(c)
  }
  for (const liste of cellules.values()) liste.sort((a, b) => a.rang - b.rang)

  console.log(`\nCandidates ${ANNEE_TESTEE} : ${candidates.length} ventes, ${cellules.size} cellules`)

  // Plancher par cellule, puis prorata du reste.
  const PLANCHER = Math.min(40, Math.floor(opts.n / cellules.size))
  const quotas = new Map()
  let place = 0

  for (const [cle, liste] of cellules) {
    const q = Math.min(PLANCHER, liste.length)
    quotas.set(cle, q)
    place += q
  }

  const reste = Math.max(0, opts.n - place)
  const dispo = [...cellules.entries()].map(([cle, liste]) => ({
    cle,
    marge: liste.length - quotas.get(cle),
  }))
  const margeTotale = dispo.reduce((s, d) => s + d.marge, 0)

  if (margeTotale > 0) {
    let distribue = 0
    for (const d of dispo) {
      const ajout = Math.min(d.marge, Math.round((reste * d.marge) / margeTotale))
      quotas.set(d.cle, quotas.get(d.cle) + ajout)
      distribue += ajout
    }
    // Arrondis : on complète (ou on retire) sur les cellules les plus fournies.
    let manque = reste - distribue
    for (const d of [...dispo].sort((a, b) => b.marge - a.marge)) {
      if (manque === 0) break
      const liste = cellules.get(d.cle)
      const actuel = quotas.get(d.cle)
      if (manque > 0 && actuel < liste.length) {
        quotas.set(d.cle, actuel + 1)
        manque -= 1
      } else if (manque < 0 && actuel > 0) {
        quotas.set(d.cle, actuel - 1)
        manque += 1
      }
    }
  }

  // --- 3. Mesure, par vagues.
  //
  // Une vague mesure un préfixe de chaque cellule ; si les ventes hors marché
  // écartées empêchent d'atteindre le quota, la vague suivante descend plus bas
  // dans la même liste. Même principe que `backtest.mjs`, et même propriété :
  // le tirage reste emboîté.
  const lignes = []
  const exclues = []
  const mesurees = new Set()
  const prefixes = new Map([...quotas.entries()])

  // Curseur du pool : il n'avance que vers l'avant, et le pool est reconstruit
  // une seule fois pour toute la mesure. C'est pour cela que les ventes testées
  // sont traitées dans l'ordre chronologique global, tous départements
  // confondus — le pool de production n'est pas cloisonné par département.
  let pool = null
  let curseur = 0

  const departementale = (dep, type) => {
    // Étage 5 reproduit : un ordre de grandeur départemental, arrondi au
    // cinquantaine d'euros comme l'est la table `HORS_COUVERTURE`. Il est
    // recalculé sur le seul passé, comme le reste.
    const m = pool.medianeDepartementale(String(dep), type)
    return m == null ? null : Math.round(m / 50) * 50
  }
  const nationale = (type) =>
    prixReference({ codeInsee: null, departement: '99', type, lat: null, lon: null }).pricePerM2

  for (let vague = 1; vague <= 12; vague += 1) {
    const aMesurer = []
    for (const [cle, liste] of cellules) {
      const voulu = Math.min(prefixes.get(cle) ?? 0, liste.length)
      for (const v of liste.slice(0, voulu)) {
        if (!mesurees.has(v.id)) aMesurer.push(v)
      }
    }

    if (aMesurer.length === 0) break

    console.log(`\nVague ${vague} — ${aMesurer.length} vente(s) à mesurer`)

    // Ordre chronologique : le pool avance avec le temps et ne revient jamais.
    aMesurer.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

    // Le pool doit repartir de zéro si une vague demande une date antérieure à
    // celle qu'il a déjà atteinte. En pratique les vagues sont chronologiques
    // et cela n'arrive qu'entre deux vagues.
    if (pool === null || (aMesurer.length > 0 && curseur > 0 && fluxPool[curseur - 1]?.date > aMesurer[0].date)) {
      pool = new Pool(communes)
      curseur = 0
    }

    let faites = 0

    for (const vente of aMesurer) {
      mesurees.add(vente.id)

      // --- le pool n'intègre que le passé strict de la vente testée.
      while (curseur < fluxPool.length && fluxPool[curseur].date < vente.date) {
        pool.ajoute(fluxPool[curseur])
        curseur += 1
      }

      // --- moteur DVF, sur le seul département de la vente et son seul passé.
      const ventesDep = poolParDep.get(vente.dep)
      const anterieures = ventesDep.slice(0, borneInf(ventesDep, vente.date))

      const bien = {
        lat: vente.lat,
        lon: vente.lon,
        type: vente.kind,
        surfaceM2: vente.surface,
        // Terrain de la vente testée : `surface_terrain` de DVF, renseigné sur
        // 98 % des maisons de ces trois départements.
        contenance: vente.kind === 'maison' ? Number(vente.surfaceTerrain) || null : null,
        etage: null,
        codeInsee: vente.commune,
        departement: vente.dep,
      }

      const maintenant = Date.parse(vente.date)
      const dvf = estime({ bien, ventes: anterieures, maintenant })

      // --- exclusion des ventes hors marché, au verdict du moteur DVF.
      const { horsMarche, medianeSecteur } = horsMarcheDe(vente, dvf)
      if (horsMarche) {
        exclues.push({ ...vente, medianeSecteur })
        continue
      }

      // --- méthode hors-DVF.
      const cible = {
        codeInsee: vente.commune,
        departement: vente.dep,
        type: vente.kind,
        lat: vente.lat,
        lon: vente.lon,
        surfaceM2: vente.surface,
        etage: null,
      }

      const h = estimeHorsDvf(cible, pool, departementale, nationale)
      const hSans = estimeHorsDvf(cible, pool, departementale, nationale, { majoration: 1 })

      const reel = vente.price

      lignes.push({
        id: vente.id,
        dep: vente.dep,
        type: vente.kind,
        zone: vente.zone,
        commune: vente.commune,
        communeNom: vente.communeNom,
        population: vente.population,
        date: vente.date,
        semestre: semestreDe(vente.date),
        lat: vente.lat,
        lon: vente.lon,
        surface: vente.surface,
        terrain: Number(vente.surfaceTerrain) || null,
        reel,
        reelPrixM2: vente.pricePerM2,
        medianeSecteur,

        // --- hors-DVF, tel qu'affiché.
        horsDvfPrix: h.prix,
        horsDvfPrixM2: h.prixM2,
        horsDvfPrixM2Base: h.prixM2Base,
        horsDvfSource: h.source,
        horsDvfPointNom: h.pointNom,
        horsDvfPointDistanceM: h.pointDistanceM,
        horsDvfEffectif: pool.effectif(vente.commune, vente.kind),
        horsDvfEcart: (h.prix - reel) / reel,
        horsDvfEcartAuPrix: Math.abs(1 - reel / h.prix),
        horsDvfDansFourchette: reel >= h.low && reel <= h.high,
        horsDvfLow: h.low,
        horsDvfHigh: h.high,

        // --- hors-DVF sans la majoration de +10 %.
        sansMajoPrix: hSans.prix,
        sansMajoEcart: (hSans.prix - reel) / reel,
        sansMajoEcartAuPrix: Math.abs(1 - reel / hSans.prix),
        sansMajoDansFourchette: reel >= hSans.low && reel <= hSans.high,

        // --- moteur DVF.
        dvfPrix: dvf.prix,
        dvfPrixM2: dvf.prixM2,
        dvfEtape: dvf.etape,
        dvfConfiance: dvf.confiance,
        dvfRayonM: dvf.rayonAtteintM,
        dvfEcart: dvf.prix ? (dvf.prix - reel) / reel : null,
        dvfEcartAuPrix: dvf.prix ? Math.abs(1 - reel / dvf.prix) : null,
        dvfDansFourchette: dvf.prix ? reel >= dvf.low && reel <= dvf.high : null,
        dvfDemiLargeur: dvf.fourchette?.demiLargeurPct ?? null,

        // --- contexte pour les diagnostics.
        surfaceMedianeCommune: null, // rempli après la mesure
        rang: vente.rang,
      })

      faites += 1
      if (faites % 25 === 0) process.stdout.write(`\r  ${faites}/${aMesurer.length}   `)
    }

    process.stdout.write(`\r  ${faites}/${aMesurer.length} mesurée(s)\n`)

    // Les cellules qui n'ont pas atteint leur quota descendent plus bas.
    let incomplet = false
    for (const [cle, liste] of cellules) {
      const retenues = lignes.filter((l) => `${l.dep}|${l.type}|${l.zone}` === cle).length
      const voulu = quotas.get(cle)
      if (retenues < voulu && (prefixes.get(cle) ?? 0) < liste.length) {
        prefixes.set(cle, Math.min(liste.length, (prefixes.get(cle) ?? 0) + (voulu - retenues) + 2))
        incomplet = true
      }
    }

    if (!incomplet) break
  }

  // Les vagues descendent volontairement un peu plus bas que le quota (marge de
  // deux ventes par cellule), sans quoi une cellule où plusieurs ventes hors
  // marché se suivent réclamerait une vague de plus à chaque fois. On rabote
  // donc ici au quota exact, en gardant les plus petits rangs : l'échantillon
  // reste celui que le tirage désignait, et `--n` rend bien `--n` ventes.
  const trop = new Map()
  for (const [cle] of cellules) trop.set(cle, [])
  for (const l of lignes) trop.get(`${l.dep}|${l.type}|${l.zone}`)?.push(l)

  const gardees = new Set()
  for (const [cle, lot] of trop) {
    lot.sort((a, b) => a.rang - b.rang)
    for (const l of lot.slice(0, quotas.get(cle))) gardees.add(l.id)
  }

  const rabotees = lignes.length - gardees.size
  for (let i = lignes.length - 1; i >= 0; i -= 1) {
    if (!gardees.has(lignes[i].id)) lignes.splice(i, 1)
  }

  console.log(
    `\nÉchantillon : ${lignes.length} ventes retenues, ${exclues.length} écartée(s) hors marché` +
      (rabotees > 0 ? `, ${rabotees} au-delà du quota rabotée(s)` : ''),
  )

  if (lignes.length === 0) {
    console.error('Aucune vente mesurée — vérifier les départements et le millésime.')
    process.exit(1)
  }

  // --- 4. Contexte des diagnostics : surface et terrain médians de la commune.
  //
  // Calculés sur la **fenêtre complète**, et non sur le passé de chaque vente :
  // ce sont des descripteurs du tissu bâti, pas des prix. Ils ne renseignent en
  // rien sur ce que la vente a valu, et les prendre sur toute la fenêtre les
  // rend simplement plus stables.
  const surfacesCommune = new Map()
  const terrainsCommune = new Map()
  for (const v of fluxPool) {
    if (!TYPES_TESTES.has(v.kind)) continue
    const cle = `${v.commune}|${v.kind}`
    if (!surfacesCommune.has(cle)) surfacesCommune.set(cle, [])
    surfacesCommune.get(cle).push(v.surface)
    if (v.kind === 'maison' && Number(v.surfaceTerrain) > 0) {
      if (!terrainsCommune.has(v.commune)) terrainsCommune.set(v.commune, [])
      terrainsCommune.get(v.commune).push(Number(v.surfaceTerrain))
    }
  }

  const surfaceMedianeDe = new Map()
  for (const [cle, liste] of surfacesCommune) surfaceMedianeDe.set(cle, mediane(liste))
  const terrainMedianDe = new Map()
  for (const [insee, liste] of terrainsCommune) terrainMedianDe.set(insee, mediane(liste))

  // Couverture de chaque demi-largeur candidate, avec et sans la majoration.
  //
  // Les bornes passent par `fourchetteSymetrique` de production, arrondis
  // compris : c'est la fourchette telle qu'un vendeur la lirait, et non une
  // approximation analytique. Conséquence à ne pas taire — cette fonction
  // **plafonne à `demiLargeurMaxPct`** (20 %), si bien qu'une demande de 25 %
  // ressort à 20 %. `courbePlafonnee` le signale pour chaque palier.
  const courbePlafonnee = new Map()

  for (const h of COURBE_DEMI_LARGEURS) {
    const temoin = fourchetteSymetrique(200000, h)
    const obtenue = (temoin.high - temoin.low) / 2 / 200000
    courbePlafonnee.set(h, Math.abs(obtenue - h) > 0.001 ? obtenue : null)
  }

  for (const l of lignes) {
    for (const h of COURBE_DEMI_LARGEURS) {
      const cle = String(Math.round(h * 1000))
      const avec = fourchetteSymetrique(l.horsDvfPrix, h)
      const sans = fourchetteSymetrique(l.sansMajoPrix, h)
      l[`couv${cle}`] = l.reel >= avec.low && l.reel <= avec.high
      l[`couv${cle}SansMajo`] = l.reel >= sans.low && l.reel <= sans.high
    }

    l.surfaceMedianeCommune = surfaceMedianeDe.get(`${l.commune}|${l.type}`) ?? null
    l.terrainMedianCommune = l.type === 'maison' ? terrainMedianDe.get(l.commune) ?? null : null
    l.ratioSurface =
      l.surfaceMedianeCommune > 0 ? l.surface / l.surfaceMedianeCommune : null
    l.ratioTerrain =
      l.terrain > 0 && l.terrainMedianCommune > 0 ? l.terrain / l.terrainMedianCommune : null
    // Le partage calibration / validation tire sur une graine **distincte** de
    // celle du tirage. C'est indispensable : le tirage retient les plus petits
    // rangs de chaque cellule, si bien qu'un partage assis sur le même rang
    // rangerait tout l'échantillon du même côté et laisserait la validation
    // vide. Deux questions différentes, deux condensés indépendants.
    l.rangGroupe = rang(`${opts.graine}|groupe`, l.id)
    l.groupe = l.rangGroupe < PART_CALIBRATION ? 'calibration' : 'validation'
  }

  const calibration = lignes.filter((l) => l.groupe === 'calibration')
  const validation = lignes.filter((l) => l.groupe === 'validation')

  // --- 5. Diagnostic 1 — effet de la surface.
  //
  // On ajuste `ln(réel / estimé) = α · ln(S / S_médiane_commune) + β` sur le
  // groupe calibration, et le coefficient proposé est `(S / S_méd)^α · e^β`.
  // Une pente positive dirait que les grands biens sont sous-estimés ; la
  // théorie du €/m² décroissant prédit l'inverse.
  const pointsSurface = calibration
    .filter((l) => l.ratioSurface > 0 && l.horsDvfPrix > 0)
    .map((l) => ({ x: Math.log(l.ratioSurface), y: Math.log(l.reel / l.horsDvfPrix) }))

  const regSurface = regression(pointsSurface)

  const correctionSurface = (l) => {
    if (!regSurface.pente || !l.ratioSurface) return 1
    return Math.exp(regSurface.ordonnee) * l.ratioSurface ** regSurface.pente
  }

  // --- 6. Diagnostic 2 — effet du terrain (maisons).
  //
  // Même forme, sur le ratio de terrain, et **après** la correction de surface :
  // ce qu'on cherche est ce que le terrain explique en plus, pas une seconde
  // fois ce que la surface expliquait déjà. `terrain.js` mesure le terrain en
  // logarithme pour la même raison — rendements décroissants.
  const pointsTerrain = calibration
    .filter((l) => l.type === 'maison' && l.ratioTerrain > 0 && l.horsDvfPrix > 0)
    .map((l) => ({
      x: Math.log(l.ratioTerrain),
      y: Math.log(l.reel / (l.horsDvfPrix * correctionSurface(l))),
    }))

  const regTerrain = regression(pointsTerrain)

  const correctionTerrain = (l) => {
    if (!regTerrain.pente || l.type !== 'maison' || !l.ratioTerrain) return 1
    return Math.exp(regTerrain.ordonnee) * l.ratioTerrain ** regTerrain.pente
  }

  // Recalibrage constant seul — l'ordonnée à l'origine de la même régression,
  // sans sa pente.
  //
  // POURQUOI CETTE TROISIÈME VARIANTE. Le coefficient de surface ci-dessus fait
  // deux choses à la fois : il redresse le niveau moyen (son ordonnée absorbe,
  // entre autres, la majoration de +10 %) et il corrige la pente du €/m² contre
  // la surface. Annoncer leur gain cumulé comme « le gain de la correction de
  // surface » le surestimerait — un simple facteur constant en capte déjà une
  // part. On mesure donc les deux séparément, et la différence est ce que la
  // pente apporte vraiment.
  const recalibrageConstant = Math.exp(regSurface.ordonnee ?? 0)

  // Erreur des variantes corrigées, mesurée **sur validation**.
  for (const l of lignes) {
    const cS = correctionSurface(l)
    const cT = correctionTerrain(l)
    l.corrConstantePrix = montantAffichable(l.horsDvfPrix * recalibrageConstant)
    l.corrConstanteEcart = (l.corrConstantePrix - l.reel) / l.reel
    l.corrConstanteEcartAuPrix = Math.abs(1 - l.reel / l.corrConstantePrix)
    l.corrSurfacePrix = montantAffichable(l.horsDvfPrix * cS)
    l.corrSurfaceEcart = (l.corrSurfacePrix - l.reel) / l.reel
    l.corrSurfaceEcartAuPrix = Math.abs(1 - l.reel / l.corrSurfacePrix)
    l.corrSurfaceTerrainPrix = montantAffichable(l.horsDvfPrix * cS * cT)
    l.corrSurfaceTerrainEcart = (l.corrSurfaceTerrainPrix - l.reel) / l.reel
    l.corrSurfaceTerrainEcartAuPrix = Math.abs(1 - l.reel / l.corrSurfaceTerrainPrix)
  }

  // --- 7. Diagnostic 3 — vieillissement de la table.
  //
  // Le pool de production est un relevé **figé** (`releve: "2026-09"`) : il ne
  // vieillit pas au fil des ventes, il vieillit tout court. Le protocole
  // glissant ci-dessus ne peut donc pas le mesurer — sa table est toujours à
  // jour. On refait donc la mesure avec une table **gelée** à trois dates, et
  // on lit l'erreur en fonction du nombre de mois écoulés depuis le gel.
  //
  // Puis on chiffre ce qu'apporterait un indice semestriel « calé sur les
  // départements voisins » : pour chaque département, l'indice est construit
  // sur les **deux autres** — c'est la seule façon de simuler honnêtement ce
  // qu'on ferait en Moselle, où l'on n'a par construction aucune vente locale.
  console.log('\nDiagnostic « vieillissement » — tables gelées…')

  const gels = []

  for (const dateGel of GELS) {
    const poolGele = new Pool(communes)
    for (const v of fluxPool) {
      if (v.date > dateGel) break
      poolGele.ajoute(v)
    }

    const departementaleGelee = (dep, type) => {
      const m = poolGele.medianeDepartementale(String(dep), type)
      return m == null ? null : Math.round(m / 50) * 50
    }

    const mesures = []
    for (const l of lignes) {
      const g = estimeHorsDvf(
        {
          codeInsee: l.commune,
          departement: l.dep,
          type: l.type,
          lat: l.lat,
          lon: l.lon,
          surfaceM2: l.surface,
          etage: null,
        },
        poolGele,
        departementaleGelee,
        nationale,
      )

      const moisEcoules =
        (Date.parse(l.date) - Date.parse(dateGel)) / (1000 * 60 * 60 * 24 * 30.44)

      mesures.push({
        ...l,
        geleEcart: (g.prix - l.reel) / l.reel,
        geleEcartAuPrix: Math.abs(1 - l.reel / g.prix),
        gelePrix: g.prix,
        moisEcoules,
      })
    }

    gels.push({ dateGel, mesures })
    const abs = mesures.map((m) => Math.abs(m.geleEcart))
    console.log(
      `  gel ${dateGel} : ${mesures.length} ventes, erreur médiane ${pct(mediane(abs))}, ` +
        `biais ${signe(mediane(mesures.map((m) => m.geleEcart)))}`,
    )
  }

  /**
   * Indice semestriel du €/m² d'un jeu de ventes — même forme que l'indice de
   * production (médiane par semestre, lissée sur trois semestres), mais bâti
   * ici pour répondre à une seule question : de combien la table devrait-elle
   * être réévaluée après N mois.
   */
  function indiceSemestriel(ventes, type) {
    const parSem = new Map()
    for (const v of ventes) {
      if (v.kind !== type) continue
      const s = semestreDe(v.date)
      if (!parSem.has(s)) parSem.set(s, [])
      parSem.get(s).push(v.pricePerM2)
    }

    const semestres = [...parSem.keys()].sort()
    const brut = new Map(semestres.map((s) => [s, mediane(parSem.get(s))]))

    // Lissage centré sur trois semestres, comme `INDICE.lissageSemestres`.
    const lisse = new Map()
    for (let i = 0; i < semestres.length; i += 1) {
      const fenetre = semestres
        .slice(Math.max(0, i - 1), i + 2)
        .map((s) => brut.get(s))
        .filter((v) => v != null)
      lisse.set(semestres[i], fenetre.reduce((a, b) => a + b, 0) / fenetre.length)
    }

    return { semestres, valeurs: lisse, effectifs: new Map(semestres.map((s) => [s, parSem.get(s).length])) }
  }

  // Indice « voisins » : pour chaque département, construit sur les deux autres.
  const indiceVoisins = new Map()
  for (const dep of opts.deps) {
    for (const type of TYPES_TESTES) {
      const voisines = fluxPool.filter((v) => v.dep !== dep)
      indiceVoisins.set(`${dep}|${type}`, indiceSemestriel(voisines, type))
    }
  }

  // Application de l'indice aux tables gelées.
  for (const g of gels) {
    const semestreGel = semestreDe(g.dateGel)

    for (const m of g.mesures) {
      const indice = indiceVoisins.get(`${m.dep}|${m.type}`)
      const base = indice?.valeurs.get(semestreGel)
      const cible = indice?.valeurs.get(m.semestre)

      // Coefficient d'actualisation, borné comme l'indice de production
      // (`INDICE.coefficientMin/Max`) : hors de ces bornes, c'est l'indice qui
      // est en cause, pas le marché.
      const brut = base > 0 && cible > 0 ? cible / base : 1
      const coef = Math.min(Math.max(brut, 0.6), 1.8)

      m.indiceCoef = coef
      m.indicePrix = montantAffichable(m.gelePrix * coef)
      m.indiceEcart = (m.indicePrix - m.reel) / m.reel
      m.indiceEcartAuPrix = Math.abs(1 - m.reel / m.indicePrix)
    }
  }

  // --- 8. Les vingt plus grosses erreurs, et leur explication.
  //
  // L'explication n'est pas rédigée à la main : elle est déduite des grandeurs
  // qui séparent cette vente de la médiane de sa commune. Chaque facteur n'est
  // cité que s'il dépasse un seuil, et dans l'ordre de ce qu'il explique.
  const explique = (l) => {
    const motifs = []

    if (l.horsDvfSource === 'reference-point-proche') {
      motifs.push(
        `prix emprunté à ${l.horsDvfPointNom ?? 'une autre commune'} à ` +
          `${(l.horsDvfPointDistanceM / 1000).toFixed(1)} km — la commune n’a pas ` +
          `${VENTES_MIN} ventes antérieures du type`,
      )
    } else if (l.horsDvfSource === 'reference-hors-couverture') {
      motifs.push('aucun point à 25 km — repli sur l’ordre de grandeur départemental')
    } else if (l.horsDvfSource === 'reference-nationale') {
      motifs.push('repli sur le filet national')
    } else if (l.horsDvfEffectif < 5) {
      motifs.push(`point communal bâti sur ${l.horsDvfEffectif} vente(s) seulement`)
    }

    if (l.ratioSurface > 1.6) {
      motifs.push(
        `bien ${nb(l.ratioSurface, 1)}× plus grand que la médiane communale ` +
          `(${l.surface} m² contre ${Math.round(l.surfaceMedianeCommune)} m²) — ` +
          `le prix communal unique ignore la décote de surface`,
      )
    } else if (l.ratioSurface > 0 && l.ratioSurface < 0.62) {
      motifs.push(
        `bien ${nb(1 / l.ratioSurface, 1)}× plus petit que la médiane communale ` +
          `(${l.surface} m² contre ${Math.round(l.surfaceMedianeCommune)} m²) — ` +
          `le prix communal unique ignore la prime des petites surfaces`,
      )
    }

    if (l.ratioTerrain > 2.5) {
      motifs.push(
        `terrain ${nb(l.ratioTerrain, 1)}× la médiane communale ` +
          `(${Math.round(l.terrain)} m²) — non valorisé par la méthode`,
      )
    }

    if (l.medianeSecteur > 0) {
      const r = l.reelPrixM2 / l.medianeSecteur
      if (r > 1.35 || r < 0.75) {
        motifs.push(
          `vente elle-même à ${nb(r, 2)}× la médiane de son secteur ` +
            `(${Math.round(l.reelPrixM2)} €/m² contre ${Math.round(l.medianeSecteur)}) — ` +
            `bien atypique, dans les bornes du marché mais à son bord`,
        )
      }
    }

    if (motifs.length === 0) {
      motifs.push(
        `écart non expliqué par la surface, le terrain ni la source : le prix communal ` +
          `(${Math.round(l.horsDvfPrixM2)} €/m² majoré) ne correspond pas à cette vente ` +
          `(${Math.round(l.reelPrixM2)} €/m²)`,
      )
    }

    return motifs
  }

  const pires = [...lignes].sort((a, b) => Math.abs(b.horsDvfEcart) - Math.abs(a.horsDvfEcart)).slice(0, 20)

  // Contre-poids à la liste ci-dessus, et la raison de ce contre-poids.
  //
  // L'erreur relative `(estimé − réel) / réel` n'est pas symétrique : elle monte
  // sans borne quand on sur-estime et ne peut pas descendre sous −100 % quand on
  // sous-estime. Classer par sa valeur absolue fait donc **remonter les
  // sur-estimations par construction**, et une liste des vingt pires n'en
  // contient qu'elles. Les plus fortes sous-estimations sont donc rendues à
  // part, sans quoi le tableau donnerait une image fausse du défaut.
  const sousEstimees = [...lignes].sort((a, b) => a.horsDvfEcart - b.horsDvfEcart).slice(0, 5)

  // Composition de la queue : les pires erreurs sont-elles des ventes que le
  // filtre des hors marché a laissées passer de justesse ?
  const SEUIL_BORD = 0.62
  const auBord = (l) => l.medianeSecteur > 0 && l.reelPrixM2 / l.medianeSecteur < SEUIL_BORD
  const queue = [...lignes].sort((a, b) => Math.abs(b.horsDvfEcart) - Math.abs(a.horsDvfEcart)).slice(0, 40)
  const partQueueAuBord = part(queue, auBord)
  const partEchantillonAuBord = part(lignes, auBord)
  const nSur = lignes.filter((l) => l.horsDvfEcart > 0).length
  const nSous = lignes.filter((l) => l.horsDvfEcart < 0).length

  // --- 9. Sorties.
  await mkdir(opts.sortie, { recursive: true })
  const horodatage = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')

  const csv = [
    [
      'id', 'dep', 'type', 'zone', 'commune', 'communeNom', 'population', 'date', 'semestre',
      'surface', 'terrain', 'surfaceMedianeCommune', 'ratioSurface', 'terrainMedianCommune',
      'ratioTerrain', 'reel', 'reelPrixM2', 'medianeSecteur', 'groupe',
      'horsDvfPrix', 'horsDvfPrixM2', 'horsDvfPrixM2Base', 'horsDvfSource', 'horsDvfPointNom',
      'horsDvfPointDistanceM', 'horsDvfEffectif', 'horsDvfEcart', 'horsDvfDansFourchette',
      'sansMajoPrix', 'sansMajoEcart',
      'corrConstantePrix', 'corrConstanteEcart',
      'corrSurfacePrix', 'corrSurfaceEcart', 'corrSurfaceTerrainPrix', 'corrSurfaceTerrainEcart',
      'dvfPrix', 'dvfPrixM2', 'dvfEtape', 'dvfConfiance', 'dvfRayonM', 'dvfEcart',
      'dvfDansFourchette', 'dvfDemiLargeur',
    ].join(','),
    ...lignes.map((l) =>
      [
        l.id, l.dep, l.type, l.zone, l.commune, `"${l.communeNom}"`, l.population, l.date, l.semestre,
        l.surface, l.terrain ?? '', nb(l.surfaceMedianeCommune, 1), nb(l.ratioSurface, 3),
        l.terrainMedianCommune ?? '', nb(l.ratioTerrain, 3), l.reel, nb(l.reelPrixM2, 1),
        nb(l.medianeSecteur, 1), l.groupe,
        l.horsDvfPrix, nb(l.horsDvfPrixM2, 1), nb(l.horsDvfPrixM2Base, 1), l.horsDvfSource,
        `"${l.horsDvfPointNom ?? ''}"`, l.horsDvfPointDistanceM ?? '', l.horsDvfEffectif,
        nb(l.horsDvfEcart, 4), l.horsDvfDansFourchette ? 'oui' : 'non',
        l.sansMajoPrix, nb(l.sansMajoEcart, 4),
        l.corrConstantePrix, nb(l.corrConstanteEcart, 4),
        l.corrSurfacePrix, nb(l.corrSurfaceEcart, 4),
        l.corrSurfaceTerrainPrix, nb(l.corrSurfaceTerrainEcart, 4),
        l.dvfPrix ?? '', nb(l.dvfPrixM2, 1), l.dvfEtape, l.dvfConfiance, l.dvfRayonM ?? '',
        nb(l.dvfEcart, 4), l.dvfDansFourchette == null ? '' : l.dvfDansFourchette ? 'oui' : 'non',
        nb(l.dvfDemiLargeur, 3),
      ].join(','),
    ),
  ].join('\n')

  await writeFile(path.join(opts.sortie, `resultats-${horodatage}.csv`), csv)

  const resume = resumeMarkdown({
    opts,
    lignes,
    exclues,
    candidates,
    cellules,
    quotas,
    calibration,
    validation,
    regSurface,
    regTerrain,
    correctionSurface,
    correctionTerrain,
    gels,
    courbeDemiLargeurs: COURBE_DEMI_LARGEURS,
    courbePlafonnee,
    pires,
    sousEstimees,
    partQueueAuBord,
    partEchantillonAuBord,
    seuilBord: SEUIL_BORD,
    nSur,
    nSous,
    explique,
    identite,
    communes,
    dureeMs: Date.now() - depart,
  })

  const chemin = path.join(opts.sortie, `resume-${horodatage}.md`)
  await writeFile(chemin, resume)

  console.log(`\nRésumé : ${path.relative(RACINE, chemin)}`)
  console.log(`Détail : ${path.relative(RACINE, path.join(opts.sortie, `resultats-${horodatage}.csv`))}`)
  console.log(`\n${((Date.now() - depart) / 1000).toFixed(0)} s`)
}

// ------------------------------------------------------------------- rapport

function resumeMarkdown({
  opts, lignes, exclues, candidates, cellules, quotas, calibration, validation,
  regSurface, regTerrain, correctionSurface, correctionTerrain, gels, pires, explique,
  courbeDemiLargeurs, courbePlafonnee,
  sousEstimees, partQueueAuBord, partEchantillonAuBord, seuilBord, nSur, nSous,
  identite, communes, dureeMs,
}) {
  const h = indicateurs(lignes, 'horsDvf')
  const d = indicateurs(lignes, 'dvf')
  const sansMajo = indicateurs(lignes, 'sansMajo')

  const out = []
  const P = (...l) => out.push(...l)

  P(
    '# Précision de la méthode hors-DVF, mesurée par procuration',
    '',
    `*${new Date().toISOString().slice(0, 16).replace('T', ' ')} — ` +
      `${lignes.length} ventes de ${ANNEE_TESTEE} en ${opts.deps.join('/')}, ` +
      `graine ${opts.graine}, ${(dureeMs / 1000).toFixed(0)} s*`,
    '',
    'La méthode hors-DVF (pool de points de référence + majoration de +10 %) est',
    'appliquée à trois départements limitrophes de la Moselle qui, eux, ont du DVF,',
    'et comparée aux vrais prix. Le moteur DVF de production tourne sur le **même**',
    'échantillon : l’écart entre les deux colonnes est le coût de l’absence de DVF.',
    '',
    '---',
    '',
    '## 1. Le chiffre principal',
    '',
    '| | Erreur absolue médiane | Biais médian | ±10 % | ±15 % | ±20 % | ±25 % |',
    '| --- | --: | --: | --: | --: | --: | --: |',
    `| **Méthode hors-DVF** | **${pct(h.erreurMediane)}** | ${signe(h.biaisMedian)} | ` +
      `${pct(h.a10)} | ${pct(h.a15)} | ${pct(h.a20)} | ${pct(h.a25)} |`,
    `| **Moteur DVF** (même échantillon) | **${pct(d.erreurMediane)}** | ${signe(d.biaisMedian)} | ` +
      `${pct(d.a10)} | ${pct(d.a15)} | ${pct(d.a20)} | ${pct(d.a25)} |`,
    '',
    (() => {
      const ecart = (h.erreurMediane - d.erreurMediane) * 100
      const rapport = nb(h.erreurMediane / d.erreurMediane, 2)

      if (ecart > 0.5) {
        return (
          `**Le coût de l’absence de DVF est de ${nb(ecart, 1)} points d’erreur médiane** — ` +
          `${pct(h.erreurMediane)} contre ${pct(d.erreurMediane)}, soit ${rapport}× l’erreur du ` +
          `moteur DVF sur le même échantillon.`
        )
      }
      if (ecart < -0.5) {
        return (
          `**Sur cet échantillon, la méthode hors-DVF fait ${nb(-ecart, 1)} points de mieux que ` +
          `le moteur DVF** — ${pct(h.erreurMediane)} contre ${pct(d.erreurMediane)}. ` +
          `Ce résultat contre-intuitif demande une lecture prudente : le moteur DVF est ici ` +
          `privé des départements voisins (voir §9), et ces trois départements sont peu denses, ` +
          `ce qui est précisément le régime où sa cascade de rayons s’élargit et où sa précision ` +
          `s’effrite. Voir la ventilation par étape atteinte au §2.`
        )
      }
      return (
        `Les deux méthodes sont à égalité sur cet échantillon — ${pct(h.erreurMediane)} contre ` +
        `${pct(d.erreurMediane)} d’erreur médiane.`
      )
    })(),
    '',
  )

  // --- Avertissement sur la fourchette affichée.
  const couvertureH = h.couvertureAffichee
  P(
    '### La fourchette affichée',
    '',
    `Le chemin hors DVF affiche une bande de **±${pct(FOURCHETTE.demiLargeurHorsDvfPct, 0)}**`,
    '(`FOURCHETTE.demiLargeurHorsDvfPct`), et elle contient le prix réel dans',
    `**${pct(couvertureH)}** des cas.`,
    '',
    'HISTORIQUE, à garder en tête en relisant les mesures précédentes. Ce chemin passait',
    'auparavant `demiLargeurMinPct` à `fourchetteSymetrique`, soit **±5 %** — non par',
    'choix mais parce que le plancher était la seule constante à portée. Le banc a chiffré',
    'ce réglage à **12,6 % de couverture**, d’où la constante propre introduite en',
    `septembre 2026. La courbe complète des paliers est au §7.`,
    '',
    '---',
    '',
  )

  // --- 2. Tableaux.
  P('## 2. Par type, département et tranche de surface', '')
  P(tableauComparatif('Par type de bien', parCle(lignes, 'type', ['maison', 'appartement']), 'Type'), '')
  P(tableauComparatif('Par département', parCle(lignes, 'dep', opts.deps), 'Dép.'), '')
  P(tableauComparatif('Par zone', parCle(lignes, 'zone', ['urbain', 'rural']), 'Zone'), '')
  P(
    tableauComparatif(
      'Par tranche de surface',
      parCle(lignes, (l) => trancheSurface(l.surface), TRANCHES_SURFACE.map((t) => t.cle)),
      'Surface',
    ),
    '',
  )
  P(
    tableauComparatif(
      'Par étage de la cascade hors-DVF atteint',
      parCle(lignes, 'horsDvfSource'),
      'Source du €/m²',
    ),
    '',
  )
  P(
    tableauComparatif(
      'Par étape atteinte par le moteur DVF — la mesure de son propre handicap ici',
      parCle(lignes, 'dvfEtape'),
      'Étape DVF',
    ),
    '',
    'Cette dernière ventilation est à lire avant de conclure quoi que ce soit de la',
    'comparaison des deux méthodes : chaque ligne autre que `cascade-normale` est une',
    'vente pour laquelle le moteur DVF n’a **pas** trouvé cinq ventes similaires à 2 km,',
    'et a dû relâcher la fenêtre de surface ou s’éloigner. En production il aurait pu, en',
    'plus, déborder sur les départements voisins ; ici il ne le peut pas (voir §9).',
    '',
    '---',
    '',
  )

  // --- 3. Diagnostic 1 — surface.
  const parTranche = parCle(lignes, (l) => trancheSurface(l.surface), TRANCHES_SURFACE.map((t) => t.cle))

  P(
    '## 3. Diagnostic 1 — effet de la surface',
    '',
    'Un prix au m² communal unique ignore que le €/m² décroît avec la surface. Le biais',
    'signé par tranche le dit sans ambiguïté :',
    '',
    '| Surface | n | Biais médian hors-DVF | Erreur médiane | Biais médian DVF |',
    '| --- | --: | --: | --: | --: |',
  )

  for (const [cle, lot] of parTranche) {
    const ih = indicateurs(lot, 'horsDvf')
    const id = indicateurs(lot, 'dvf')
    P(`| ${cle} | ${lot.length} | ${signe(ih.biaisMedian)} | ${pct(ih.erreurMediane)} | ${signe(id.biaisMedian)} |`)
  }

  const petites = lignes.filter((l) => l.surface < 60)
  const grandes = lignes.filter((l) => l.surface >= 150)
  const biaisPetites = petites.length ? mediane(petites.map((l) => l.horsDvfEcart)) : null
  const biaisGrandes = grandes.length ? mediane(grandes.map((l) => l.horsDvfEcart)) : null

  P(
    '',
    biaisPetites != null && biaisGrandes != null
      ? `**Confirmé** : biais de ${signe(biaisPetites)} sous 60 m² contre ` +
        `${signe(biaisGrandes)} au-delà de 150 m², soit un basculement de ` +
        `${nb((biaisPetites - biaisGrandes) * 100, 1)} points entre les deux extrêmes. ` +
        `${biaisPetites < biaisGrandes ? 'Les petites surfaces sont sous-estimées et les grandes sur-estimées — exactement le sens prédit.' : 'Le sens est inverse de celui prédit, ce qui mérite un second regard.'}`
      : '**Non mesurable** : une des tranches extrêmes est vide.',
    '',
    '### Coefficient de correction calibré',
    '',
    'Forme retenue — multiplicative sur le €/m², sans unité, et qui vaut 1 quand le bien',
    'est à la médiane de sa commune :',
    '',
    '```',
    `coefficient = ${nb(Math.exp(regSurface.ordonnee ?? 0), 4)} × (S / S_médiane_commune) ^ ${nb(regSurface.pente, 4)}`,
    '```',
    '',
    `Ajusté par moindres carrés sur \`ln(réel / estimé)\` contre \`ln(S / S_méd)\`, sur le`,
    `groupe **calibration** (${regSurface.n} ventes) : pente **${nb(regSurface.pente, 4)}**, ` +
      `t = ${nb(regSurface.tStat, 1)}, R² = ${nb(regSurface.r2, 3)}.`,
    '',
    'Valeurs du coefficient :',
    '',
    '| S / S_médiane | 0,5 | 0,75 | 1 | 1,5 | 2 | 3 |',
    '| --- | --: | --: | --: | --: | --: | --: |',
    `| coefficient | ${[0.5, 0.75, 1, 1.5, 2, 3].map((r) => nb(Math.exp(regSurface.ordonnee ?? 0) * r ** (regSurface.pente ?? 0), 3)).join(' | ')} |`,
    '',
  )

  const vCorrS = indicateurs(validation, 'corrSurface')
  const vCorrK = indicateurs(validation, 'corrConstante')
  const vBase = indicateurs(validation, 'horsDvf')

  P(
    `**Gain, mesuré sur le groupe validation** (${validation.length} ventes jamais vues par la calibration).`,
    '',
    'Trois lignes et non deux, parce que le coefficient ci-dessus fait deux choses à la',
    'fois : son ordonnée redresse le niveau moyen (elle absorbe notamment la majoration',
    'de +10 %) et sa pente corrige la décote de surface. Les confondre surestimerait ce',
    'que la surface apporte. La ligne du milieu isole donc le simple recalibrage',
    `constant (× ${nb(Math.exp(regSurface.ordonnee ?? 0), 4)}, sans pente) :`,
    '',
    '| | Erreur médiane | Biais médian | ±15 % | ±20 % |',
    '| --- | --: | --: | --: | --: |',
    `| hors-DVF tel quel | ${pct(vBase.erreurMediane)} | ${signe(vBase.biaisMedian)} | ${pct(vBase.a15)} | ${pct(vBase.a20)} |`,
    `| recalibrage constant seul | ${pct(vCorrK.erreurMediane)} | ${signe(vCorrK.biaisMedian)} | ${pct(vCorrK.a15)} | ${pct(vCorrK.a20)} |`,
    `| + pente de surface | **${pct(vCorrS.erreurMediane)}** | ${signe(vCorrS.biaisMedian)} | ${pct(vCorrS.a15)} | ${pct(vCorrS.a20)} |`,
    '',
    `Gain total : **${nb((vBase.erreurMediane - vCorrS.erreurMediane) * 100, 1)} points** d’erreur médiane, ` +
      `dont ${nb((vBase.erreurMediane - vCorrK.erreurMediane) * 100, 1)} points pour le seul ` +
      `recalibrage constant et **${nb((vCorrK.erreurMediane - vCorrS.erreurMediane) * 100, 1)} points ` +
      `pour la correction de surface elle-même**. C'est ce dernier chiffre qui répond à la ` +
      `question posée.`,
    '',
    '---',
    '',
  )

  // --- 4. Diagnostic 2 — terrain.
  const maisons = lignes.filter((l) => l.type === 'maison')
  const parTrancheTerrain = parCle(
    maisons,
    (l) => trancheTerrain(l.terrain),
    TRANCHES_TERRAIN.map((t) => t.cle),
  )

  P(
    '## 4. Diagnostic 2 — effet du terrain (maisons)',
    '',
    `Sur les ${maisons.length} maisons de l’échantillon, erreur et biais par tranche de terrain :`,
    '',
    '| Terrain | n | Biais médian | Erreur médiane | Terrain médian commune |',
    '| --- | --: | --: | --: | --: |',
  )

  for (const [cle, lot] of parTrancheTerrain) {
    const i = indicateurs(lot, 'horsDvf')
    const tm = mediane(lot.map((l) => l.terrainMedianCommune).filter((v) => v > 0))
    P(`| ${cle} | ${lot.length} | ${signe(i.biaisMedian)} | ${pct(i.erreurMediane)} | ${tm ? `${Math.round(tm)} m²` : '—'} |`)
  }

  if (regTerrain.pente != null) {
    P(
      '',
      '### Coefficient de terrain calibré',
      '',
      'Même logique que `terrain.js` — le terrain se mesure en logarithme, parce que le',
      'mètre carré supplémentaire vaut moins sur un grand terrain que sur un petit. La',
      'correction est appliquée **après** celle de surface, pour ne mesurer que ce que le',
      'terrain explique en plus :',
      '',
      '```',
      `coefficient = ${nb(Math.exp(regTerrain.ordonnee ?? 0), 4)} × (T / T_médiane_commune) ^ ${nb(regTerrain.pente, 4)}`,
      '```',
      '',
      `Ajusté sur ${regTerrain.n} maisons du groupe calibration : pente **${nb(regTerrain.pente, 4)}**, ` +
        `t = ${nb(regTerrain.tStat, 1)}, R² = ${nb(regTerrain.r2, 3)}.`,
      '',
      Math.abs(regTerrain.tStat ?? 0) >= 2
        ? `La pente est significative (|t| = ${nb(Math.abs(regTerrain.tStat), 1)} ≥ 2, le seuil de \`TERRAIN.tStatMin\`).`
        : `**La pente n’est pas significative** (|t| = ${nb(Math.abs(regTerrain.tStat), 1)} < 2, seuil de ` +
          `\`TERRAIN.tStatMin\`). Dans la logique de \`terrain.js\`, il ne faudrait donc **pas** ` +
          `appliquer cette correction : mieux vaut ne pas corriger que corriger au hasard.`,
      '',
    )

    const maisonsVal = validation.filter((l) => l.type === 'maison')
    const vT = indicateurs(maisonsVal, 'corrSurfaceTerrain')
    const vS = indicateurs(maisonsVal, 'corrSurface')
    const vB = indicateurs(maisonsVal, 'horsDvf')

    P(
      `**Gain, sur les ${maisonsVal.length} maisons du groupe validation** :`,
      '',
      '| | Erreur médiane | Biais médian | ±15 % | ±20 % |',
      '| --- | --: | --: | --: | --: |',
      `| hors-DVF tel quel | ${pct(vB.erreurMediane)} | ${signe(vB.biaisMedian)} | ${pct(vB.a15)} | ${pct(vB.a20)} |`,
      `| + surface | ${pct(vS.erreurMediane)} | ${signe(vS.biaisMedian)} | ${pct(vS.a15)} | ${pct(vS.a20)} |`,
      `| + surface + terrain | **${pct(vT.erreurMediane)}** | ${signe(vT.biaisMedian)} | ${pct(vT.a15)} | ${pct(vT.a20)} |`,
      '',
      `Gain du terrain seul, au-delà de la surface : **${nb((vS.erreurMediane - vT.erreurMediane) * 100, 1)} points**.`,
      '',
    )
  } else {
    P('', '*Échantillon insuffisant pour calibrer un coefficient de terrain.*', '')
  }

  P('---', '')

  // --- 5. Diagnostic 3 — vieillissement.
  P(
    '## 5. Diagnostic 3 — vieillissement de la table',
    '',
    'Le pool de production est un relevé **figé** (`releve: "2026-09"`) : il ne se',
    'réactualise pas au fil des ventes. Le protocole glissant du reste de ce banc ne',
    'peut donc rien en dire — sa table est toujours à jour. La mesure ci-dessous gèle',
    'la table à trois dates et lit l’erreur en fonction des mois écoulés depuis le gel.',
    '',
    '| Table gelée au | n | Erreur médiane | Biais médian | Âge médian de la table |',
    '| --- | --: | --: | --: | --: |',
  )

  for (const g of gels) {
    const abs = g.mesures.map((m) => Math.abs(m.geleEcart))
    P(
      `| ${g.dateGel} | ${g.mesures.length} | ${pct(mediane(abs))} | ` +
        `${signe(mediane(g.mesures.map((m) => m.geleEcart)))} | ` +
        `${nb(mediane(g.mesures.map((m) => m.moisEcoules)), 0)} mois |`,
    )
  }

  // Erreur par tranche d'ancienneté, toutes tables gelées confondues.
  const toutesGelees = gels.flatMap((g) => g.mesures)
  const TRANCHES_AGE = [
    { cle: '0 – 6 mois', min: 0, max: 6 },
    { cle: '6 – 12 mois', min: 6, max: 12 },
    { cle: '12 – 24 mois', min: 12, max: 24 },
    { cle: '24 – 36 mois', min: 24, max: 36 },
  ]

  P(
    '',
    '**Erreur en fonction de l’ancienneté du prix de référence** (les trois gels réunis) :',
    '',
    '| Ancienneté | n | Erreur médiane | Biais médian | + indice voisins : erreur | biais |',
    '| --- | --: | --: | --: | --: | --: |',
  )

  for (const t of TRANCHES_AGE) {
    const lot = toutesGelees.filter((m) => m.moisEcoules >= t.min && m.moisEcoules < t.max)
    if (lot.length === 0) continue
    const abs = lot.map((m) => Math.abs(m.geleEcart))
    const absI = lot.map((m) => Math.abs(m.indiceEcart))
    P(
      `| ${t.cle} | ${lot.length} | ${pct(mediane(abs))} | ` +
        `${signe(mediane(lot.map((m) => m.geleEcart)))} | ${pct(mediane(absI))} | ` +
        `${signe(mediane(lot.map((m) => m.indiceEcart)))} |`,
    )
  }

  const gelAbs = toutesGelees.map((m) => Math.abs(m.geleEcart))
  const indAbs = toutesGelees.map((m) => Math.abs(m.indiceEcart))
  const coefs = toutesGelees.map((m) => m.indiceCoef).filter((v) => Number.isFinite(v))

  P(
    '',
    '### Ce qu’apporterait un indice semestriel calé sur les départements voisins',
    '',
    'Construit comme l’indice de production — médiane semestrielle du €/m², lissée sur',
    'trois semestres, coefficient borné à 0,6–1,8 — mais **en excluant le département',
    'mesuré** : l’indice de la Meuse est bâti sur 54 et 88, celui de la',
    'Meurthe-et-Moselle sur 55 et 88, et ainsi de suite. C’est la seule façon honnête de',
    'simuler ce qu’on ferait en Moselle, où l’on n’a par construction aucune vente locale.',
    '',
    '**Une réserve, à ne pas passer sous silence** : l’indice lit le semestre de la vente',
    'testée chez les voisins, donc des ventes postérieures à la table gelée. C’est bien ce',
    'qu’on aurait en production — pour estimer un bien aujourd’hui, on disposerait de',
    'l’indice des voisins jusqu’au dernier semestre publié — mais cela suppose ce dernier',
    'semestre complet, ce qu’un millésime DVF fraîchement paru n’est pas toujours. Le gain',
    'ci-dessous est donc un **majorant** de ce qu’un indice réel apporterait.',
    '',
    '| | Erreur médiane | Biais médian |',
    '| --- | --: | --: |',
    `| table gelée, telle quelle | ${pct(mediane(gelAbs))} | ${signe(mediane(toutesGelees.map((m) => m.geleEcart)))} |`,
    `| table gelée + indice voisins | **${pct(mediane(indAbs))}** | ${signe(mediane(toutesGelees.map((m) => m.indiceEcart)))} |`,
    '',
    `Gain : **${nb((mediane(gelAbs) - mediane(indAbs)) * 100, 1)} points** d’erreur médiane. ` +
      `Coefficient d’actualisation médian ${nb(mediane(coefs), 3)} ` +
      `(min ${nb(Math.min(...coefs), 3)}, max ${nb(Math.max(...coefs), 3)}).`,
    '',
    '---',
    '',
  )

  // --- 6. La majoration.
  P(
    '## 6. La majoration de +10 %',
    '',
    '| | Erreur absolue médiane | Biais médian | Biais moyen | ±15 % | ±20 % |',
    '| --- | --: | --: | --: | --: | --: |',
    `| sans majoration | ${pct(sansMajo.erreurMediane)} | ${signe(sansMajo.biaisMedian)} | ${signe(sansMajo.biaisMoyen)} | ${pct(sansMajo.a15)} | ${pct(sansMajo.a20)} |`,
    `| avec +10 % (production) | ${pct(h.erreurMediane)} | ${signe(h.biaisMedian)} | ${signe(h.biaisMoyen)} | ${pct(h.a15)} | ${pct(h.a20)} |`,
    '',
    (() => {
      const b0 = sansMajo.biaisMedian
      const b1 = h.biaisMedian
      const e0 = sansMajo.erreurMediane
      const e1 = h.erreurMediane

      if (b0 > 0.02) {
        return (
          `**La méthode sur-estime déjà de ${signe(b0)} sans majoration.** Le +10 % porte donc ` +
          `le biais médian à ${signe(b1)}, et l’erreur médiane de ${pct(e0)} à ${pct(e1)} — ` +
          `soit ${nb((e1 - e0) * 100, 1)} points ajoutés. C’est exactement le cas de figure ` +
          `que tu décrivais.`
        )
      }
      if (b0 < -0.02) {
        return (
          `**La méthode sous-estime de ${signe(b0)} sans majoration.** Le +10 % corrige donc ` +
          `dans le bon sens : le biais médian passe à ${signe(b1)} et l’erreur médiane de ` +
          `${pct(e0)} à ${pct(e1)} (${nb((e1 - e0) * 100, 1)} points). ` +
          `${Math.abs(b1) < Math.abs(b0) ? 'Le réglage commercial se trouve être, ici, une correction utile.' : 'Mais il dépasse la cible : le biais change de signe.'}`
        )
      }
      return (
        `Sans majoration le biais médian est quasi nul (${signe(b0)}). Le +10 % le porte à ` +
        `${signe(b1)} et l’erreur médiane de ${pct(e0)} à ${pct(e1)}.`
      )
    })(),
    '',
    '*Rien n’est proposé ici : la consigne était de mesurer, pas de changer.*',
    '',
    '---',
    '',
  )

  // --- 7. Fourchettes.
  const auPrix = lignes.map((l) => l.horsDvfEcartAuPrix).filter((v) => Number.isFinite(v))

  P(
    '## 7. Quelle demi-largeur de fourchette faudrait-il ?',
    '',
    'Demi-largeur `h` telle que le prix réel tombe dans `[estimation × (1 − h),',
    'estimation × (1 + h)]`. C’est bien la fourchette **autour du chiffre affiché** —',
    'la seule qu’on puisse annoncer, puisque le prix réel est justement ce qu’on ignore.',
    '',
    '| Couverture visée | Demi-largeur requise — hors-DVF | — moteur DVF |',
    '| --- | --: | --: |',
    `| 700 / 1 000 (70 %) | **±${pct(h.demiLargeur70, 0)}** | ±${pct(d.demiLargeur70, 0)} |`,
    `| 800 / 1 000 (80 %) | **±${pct(h.demiLargeur80, 0)}** | ±${pct(d.demiLargeur80, 0)} |`,
    '',
    `Pour mémoire, la fourchette hors-DVF affichée est aujourd’hui de ` +
      `${pct(FOURCHETTE.demiLargeurHorsDvfPct, 0)} et couvre ${pct(h.couvertureAffichee)} des cas. ` +
      `Atteindre 70 % demanderait ±${pct(h.demiLargeur70, 0)}, et 80 % ±${pct(h.demiLargeur80, 0)}.`,
    '',
    '### Courbe de couverture, palier par palier',
    '',
    'Bornes calculées par le `fourchetteSymetrique` de production, arrondis compris :',
    'c’est la fourchette telle qu’un vendeur la lirait. La colonne de droite retire la',
    'majoration de +10 % — **elle n’est pas retirée en production**, c’est une mesure',
    'à titre indicatif.',
    '',
    '| Demi-largeur | Couverture (production, +10 %) | Couverture sans la majoration |',
    '| --- | --: | --: |',
    ...courbeDemiLargeurs.map((demi) => {
      const cle = String(Math.round(demi * 1000))
      const avec = part(lignes, (l) => l[`couv${cle}`] === true)
      const sans = part(lignes, (l) => l[`couv${cle}SansMajo`] === true)
      const plafond = courbePlafonnee.get(demi)
      const etiquette =
        `±${pct(demi, 0)}` +
        (demi === FOURCHETTE.demiLargeurHorsDvfPct ? ' — **production**' : '') +
        (plafond ? ` ⚠️ rabattu à ±${pct(plafond, 0)}` : '')
      return `| ${etiquette} | ${pct(avec)} | ${pct(sans)} |`
    }),
    '',
    (() => {
      const plafonnes = courbeDemiLargeurs.filter((d) => courbePlafonnee.get(d))
      if (plafonnes.length === 0) return ''
      return (
        `**Attention sur ${plafonnes.map((d) => `±${pct(d, 0)}`).join(' et ')}** : ` +
        `\`fourchetteSymetrique\` plafonne à \`FOURCHETTE.demiLargeurMaxPct\` ` +
        `(${pct(FOURCHETTE.demiLargeurMaxPct, 0)}). La ligne mesure donc la valeur rabattue, ` +
        `pas celle demandée — pour l’obtenir réellement il faudrait aussi relever ce plafond, ` +
        `qui protège aujourd’hui les chemins Monaco et hors DVF d’une fourchette si large ` +
        `qu’elle n’annonce plus rien.`
      )
    })(),
    '',
    `Lecture : le passage de ±5 % à ±${pct(FOURCHETTE.demiLargeurHorsDvfPct, 0)} fait passer la ` +
      `couverture de ${pct(part(lignes, (l) => l.couv50 === true))} à ` +
      `${pct(part(lignes, (l) => l.couv130 === true))}, soit ` +
      `${nb((part(lignes, (l) => l.couv130 === true) - part(lignes, (l) => l.couv50 === true)) * 100, 0)} ` +
      `points gagnés en multipliant la largeur par 2,6. Le palier suivant (±20 %) n’en ` +
      `rapporterait que ${nb((part(lignes, (l) => l.couv200 === true) - part(lignes, (l) => l.couv130 === true)) * 100, 0)} ` +
      `de plus : les rendements décroissent, et c’est ce qui rend ` +
      `±${pct(FOURCHETTE.demiLargeurHorsDvfPct, 0)} défendable sans être suffisant.`,
    '',
    '---',
    '',
  )

  // --- 8. Les vingt plus grosses erreurs.
  P(
    '## 8. Les vingt plus grosses erreurs',
    '',
    '**À lire d’abord, sans quoi cette liste trompe.** L’erreur relative',
    '`(estimé − réel) / réel` monte sans borne quand on sur-estime, mais ne peut pas',
    'descendre sous −100 % quand on sous-estime. Classer par sa valeur absolue fait donc',
    'remonter les sur-estimations **par construction** : les vingt ci-dessous en sont',
    `toutes. Sur l’échantillon entier l’écart est bien plus équilibré — ${nSur} `,
    `sur-estimations contre ${nSous} sous-estimations. Les plus fortes sous-estimations`,
    'sont rendues séparément après la liste.',
    '',
    `**Et surtout** : ${pct(partQueueAuBord, 0)} des 40 pires erreurs sont des ventes dont le`,
    `prix au m² est sous ${nb(seuilBord, 2)}× la médiane de leur secteur, alors qu’elles ne sont que`,
    `${pct(partEchantillonAuBord, 0)} de l’échantillon. Autrement dit la queue de la`,
    'distribution n’est pas faite de biens ordinaires mal estimés : elle est faite de',
    'ventes anormalement basses que le filtre des hors marché (0,5×) a laissées passer de',
    'justesse. Aucune méthode assise sur une médiane locale ne peut les retrouver — et',
    'l’explication « bien atypique » qui revient ci-dessous dit exactement cela.',
    '',
  )

  pires.forEach((l, i) => {
    P(
      `**${i + 1}. ${l.communeNom} (${l.dep}) — ${l.type} de ${l.surface} m²` +
        `${l.terrain ? `, terrain ${Math.round(l.terrain)} m²` : ''}**  `,
      `Réel ${euros(l.reel)} (${Math.round(l.reelPrixM2)} €/m²) · ` +
        `estimé ${euros(l.horsDvfPrix)} (${Math.round(l.horsDvfPrixM2)} €/m² majoré) · ` +
        `**${signe(l.horsDvfEcart)}** · DVF : ${l.dvfPrix ? `${euros(l.dvfPrix)} (${signe(l.dvfEcart)})` : '—'}  `,
    )
    for (const motif of explique(l)) P(`  - ${motif}`)
    P('')
  })

  P('### Les cinq plus fortes sous-estimations, pour l’équilibre', '')

  sousEstimees.forEach((l, i) => {
    P(
      `**${i + 1}. ${l.communeNom} (${l.dep}) — ${l.type} de ${l.surface} m²` +
        `${l.terrain ? `, terrain ${Math.round(l.terrain)} m²` : ''}**  `,
      `Réel ${euros(l.reel)} (${Math.round(l.reelPrixM2)} €/m²) · ` +
        `estimé ${euros(l.horsDvfPrix)} (${Math.round(l.horsDvfPrixM2)} €/m² majoré) · ` +
        `**${signe(l.horsDvfEcart)}** · DVF : ${l.dvfPrix ? `${euros(l.dvfPrix)} (${signe(l.dvfEcart)})` : '—'}  `,
    )
    for (const motif of explique(l)) P(`  - ${motif}`)
    P('')
  })

  P('---', '')

  // --- 9. Protocole et limites.
  const parSource = parCle(lignes, 'horsDvfSource')
  const composition = [...cellules.keys()]
    .map((cle) => {
      const [dep, type, zone] = cle.split('|')
      const retenues = lignes.filter((l) => l.dep === dep && l.type === type && l.zone === zone).length
      return { dep, type, zone, quota: quotas.get(cle), retenues, dispo: cellules.get(cle).length }
    })
    .sort((a, b) => a.dep.localeCompare(b.dep) || a.type.localeCompare(b.type) || a.zone.localeCompare(b.zone))

  P(
    '## 9. Protocole, et ce qu’il ne dit pas',
    '',
    '### Ce qui est le code de production',
    '',
    `La formule finale (\`montantAffichable(prixM2 × surface × coefficientEtage)\`), la`,
    `majoration \`MAJORATION_HORS_DVF\`, la fourchette \`fourchetteSymetrique\`, le`,
    `coefficient d’étage, la distance, \`clePrix\`, \`RAYON_MAX_M\`, le parseur DVF et le`,
    `moteur \`estime\` sont **importés**, pas recopiés.`,
    '',
    `La cascade de \`prixReference\` a dû être réécrite — le pool de production est figé`,
    `sur 57/67/68/976, il n’y a pas de point d’injection. Ces trente lignes sont`,
    `confrontées au vrai \`prixReference\` sur le vrai pool avant chaque mesure :`,
    `**${identite.cas} cas identiques** (prix et source), couvrant les six étages, le`,
    `découpage de Metz en quartiers, le type \`terrain\` absent du pool et l’alias`,
    `\`local\` → maison. Un seul écart interrompt le banc.`,
    '',
    '### Les trois approximations, et pourquoi elles sont inévitables',
    '',
    '**1. Le pool de production n’est pas reproductible à l’identique.** Ses 774 points',
    'ne sont pas des médianes de ventes : 717 viennent d’un registre multi-sources, 57',
    'de la saisie de l’agence, tous datés de 2026-09, et aucun ne porte de prix de',
    'terrain. Rien de cela ne se reconstruit depuis DVF. Ce qui est reproduit, c’est la',
    'recette documentée de l’étage « ventes » du script de construction',
    '(`pointsVentes()`) : médiane du €/m² par commune et par type, au moins',
    `${VENTES_MIN} ventes, bornes de qualité de DVF — appliquée aux seules ventes`,
    'antérieures à la vente testée. C’est la même **forme** de table (un prix par',
    'commune et par type, sans correction de surface ni de terrain), alimentée par la',
    'meilleure donnée disponible.',
    '',
    'Cela joue dans les deux sens, et il faut le dire : un relevé professionnel',
    'multi-sources peut être meilleur qu’une médiane sur deux ventes, et la couverture',
    'du pool réel (292 points pour les 725 communes de Moselle) est plus maigre que',
    `celle qu’atteint ici DVF — ${pct(parSource.find(([s]) => s === 'reference-commune-pool')?.[1].length / lignes.length ?? 0, 0)} des ventes testées`,
    'ont trouvé un point dans leur propre commune. **Le chiffre du §1 est donc un ordre',
    'de grandeur de la méthode, pas un audit du pool mosellan.**',
    '',
    '**2. L’étage est inconnu.** DVF ne le publie pas. `coefficientEtage(null)` vaut 1,',
    'le facteur est inerte ici, et la mesure ne dit rien de lui. Même limite que dans',
    '`backtest.mjs`.',
    '',
    '**3. Le terrain de la vente testée est le `surface_terrain` de DVF**, là où la',
    'production lit la contenance cadastrale transmise par le front. Le champ est',
    'renseigné sur 98 % des maisons de ces trois départements, et prendre la même source',
    'pour le bien et pour ses comparables évite un écart qui ne viendrait que du mélange',
    'de deux référentiels.',
    '',
    '### Échantillon',
    '',
    `${candidates.length} ventes de logement de ${ANNEE_TESTEE} étaient candidates.`,
    `${lignes.length} ont été retenues et **${exclues.length} écartées comme hors marché**`,
    '(prix au m² hors de 0,5×–2× la médiane de leur secteur, au verdict du moteur DVF sur',
    'leur seul passé — règle reprise telle quelle de `backtest.mjs`).',
    '',
    `Le tirage est stratifié sur ${cellules.size} cellules (département × type × zone), avec`,
    'un plancher par cellule puis répartition du reste au prorata. Il n’est donc **pas**',
    'proportionnel, et c’est voulu : proportionnellement, la Meuse rendrait moins de cent',
    'ventes et ses appartements une dizaine.',
    '',
    `Urbain / rural : seuil INSEE de ${SEUIL_URBAIN_HAB.toLocaleString('fr-FR')} habitants`,
    `(${communes.filter((c) => c.population >= SEUIL_URBAIN_HAB).length} communes sur ${communes.length}).`,
    '',
    '| Dép. | Type | Zone | Disponibles | Quota | Retenues |',
    '| --- | --- | --- | --: | --: | --: |',
  )

  for (const c of composition) {
    P(`| ${c.dep} | ${c.type} | ${c.zone} | ${c.dispo} | ${c.quota} | ${c.retenues} |`)
  }

  P(
    '',
    '### Ce que ce banc ne mesure pas',
    '',
    '- **Les départements voisins ne sont pas chargés** pour le moteur DVF : il travaille',
    '  sur le seul département de la vente. Un bien proche d’une limite est donc un peu',
    '  moins bien servi qu’en production — de la même façon pour les deux méthodes.',
    '- **Les quartiers.** Le pool réel découpe les grandes villes en quartiers (12 pour',
    '  Metz). La table simulée ici est communale, comme 94 % des points du pool réel.',
    '  Nancy y est donc traitée d’un seul prix, là où la production en distinguerait',
    '  plusieurs — la mesure est en cela **pessimiste** pour les grandes villes.',
    '- **La Moselle elle-même.** Rien ici ne vient de Moselle. Le transport du résultat',
    '  repose sur l’hypothèse que ces trois marchés lui ressemblent.',
    '',
    `*Détail vente par vente dans le CSV du même horodatage. Aucun fichier de production`,
    `n’a été modifié.*`,
  )

  return out.join('\n')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
