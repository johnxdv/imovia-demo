// Banc de test du moteur d'estimation — zones couvertes par DVF uniquement.
//
// PRINCIPE. On prend des ventes qui ont réellement eu lieu, on cache le prix au
// moteur, on lui demande d'estimer le bien, puis on compare. Rien d'autre.
//
// CE QUI REND LA MESURE HONNÊTE, et ce qu'il ne faut jamais relâcher :
//
//   • **Le banc fait tourner le moteur de production, pas une copie.** Tout le
//     calcul vit dans `api/_lib/moteur.js`, fonction pure appelée ici comme
//     elle l'est par `api/estimation.js`. Ce fichier ne contient pas une ligne
//     de logique d'estimation — s'il en contenait, il finirait par mesurer un
//     moteur qui n'existe nulle part. Même les seuils du tri des ventes hors
//     marché (voir plus bas) sont lus dans `estimationConfig.js`, et la médiane
//     de secteur contre laquelle ils s'appliquent est celle que le moteur a
//     lui-même calculée et journalisée.
//
//   • **Le moteur ne voit que le passé.** Pour chaque vente testée, il ne reçoit
//     que les ventes strictement antérieures à sa date. La vente elle-même est
//     donc exclue, et avec elle tout ce qui s'est vendu le même jour.
//     L'indice d'actualisation et la régression de terrain sont recalculés sur
//     ce seul passé, puisqu'ils se déduisent des ventes qu'on lui donne.
//
//   • **Les comparables sont ramenés au semestre de la vente testée**, pas au
//     dernier semestre connu de nous aujourd'hui : la date de référence passée
//     au moteur est celle de la vente (voir `semestreCible` dans `indice.js`).
//
//   • **Les entrées sont celles qu'un vendeur donnerait** : coordonnées, type,
//     surface habitable, contenance cadastrale de la parcelle. Rien du prix, ni
//     de la mutation. L'étage est inconnu — coefficient 1, comme quand le champ
//     n'est pas renseigné.
//
// LES VENTES HORS MARCHÉ SONT ÉCARTÉES DE LA MESURE. DVF enregistre des
// mutations qui ne sont pas des ventes de marché : cession familiale à prix
// convenu, lot vendu en l'état après sinistre, portage entre sociétés. Le moteur
// ne peut pas les retrouver — personne ne le peut — et les garder dans
// l'échantillon testé ne mesure pas l'erreur du moteur, seulement la part de
// bruit de la base. La règle appliquée est **exactement celle du filtre relatif
// du moteur**, retournée contre la vente testée : son prix au m² doit tenir
// entre 0,5× et 2× la médiane des ventes du même type dans son secteur (2 km,
// le dernier palier de la cascade). Cette médiane est calculée **sur le seul
// passé de la vente, elle exclue** — c'est celle que le moteur vient d'utiliser
// pour filtrer ses propres candidates, relue dans son journal. Le tirage
// complète pour garder `--n` ventes après exclusion, et le résumé dit combien
// ont été écartées, par département et par type.
//
// DEUX VARIANTES DU MOTEUR SONT MESURÉES À CÔTÉ DE LUI. Elles ne changent rien
// en production : ce sont des hypothèses qu'on chiffre avant de décider.
//
//   • **Variante TERRAIN.** DVF laisse `surface_terrain` vide sur une part
//     importante des maisons — « non renseigné », pas « pas de terrain ». La
//     variante va chercher la contenance de la parcelle dans le cadastre et la
//     pose sur le comparable, par le champ `surfaceTerrainCadastre` que le
//     moteur sait lire. **Garde-fou** : si plusieurs maisons distinctes ont été
//     vendues sur la même parcelle dans DVF, la parcelle est probablement
//     partagée, sa contenance ne décrit pas le terrain d'une seule maison, et
//     le terrain reste inconnu.
//
//   • **Variante FOURCHETTE.** Le moteur affiche une bande fixe — ±15, ±20 ou
//     ±25 % selon la confiance. La variante calcule, sur le **groupe
//     calibration** et par (type, confiance), le facteur par lequel il faudrait
//     multiplier cette bande pour contenir le prix réel dans 80 % des cas, puis
//     applique ces facteurs au **groupe validation** et mesure ce qu'ils y
//     donnent vraiment.
//
// CE QUE LE BANC NE MESURE PAS. Les départements voisins ne sont pas chargés :
// le moteur travaille sur le seul département de la vente. Un bien à 500 m
// d'une limite départementale y est donc un peu moins bien servi qu'en
// production — pour tous les moteurs comparés, de la même façon.
//
// USAGE
//   node scripts/backtest.mjs --n 15              essai de fonctionnement
//   node scripts/backtest.mjs --n 3000            mesure
//   node scripts/backtest.mjs --n 500 --deps 13,69
//
// OPTIONS
//   --n <nombre>      ventes tirées, après exclusion des hors marché (défaut 200)
//   --rural <nombre>  ventes supplémentaires par département rural (23, 58),
//                     rendues dans une section séparée (défaut 200 ; 0 désactive)
//   --deps <liste>    départements, séparés par des virgules
//   --graine <n>      graine du tirage (défaut 42) — à graine égale, le tirage
//                     est le même, et un --n plus petit est un sous-ensemble
//                     exact du plus grand
//   --avant <ref>     commit du moteur de comparaison (défaut 4ce5155, le
//                     dernier état d'avant la refonte) ; `--avant non` le
//                     désactive
//   --sortie <dir>    dossier des résultats (défaut cache/backtest)
//
// Tout ce qui est téléchargé atterrit dans `cache/`, ignoré par git, et n'est
// téléchargé qu'une fois.

import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { parseDvfCsv } from '../api/_lib/dvf.js'
import { QUALITE, RAYONS_M } from '../api/_lib/estimationConfig.js'
import { distanceM } from '../api/_lib/geo.js'
import { estime } from '../api/_lib/moteur.js'
import { coefficientEtage } from '../src/lib/etage.js'

const RACINE = path.resolve(import.meta.dirname, '..')
const CACHE = path.join(RACINE, 'cache')

/** Départements de test : métropoles denses, villes moyennes, et deux ruraux. */
const DEPARTEMENTS = ['13', '06', '69', '33', '44', '59', '31', '75', '23', '58']

/** Ceux que `--rural` sur-échantillonne : DVF y est trop maigre pour que le
 *  tirage général en donne assez pour conclure quoi que ce soit. */
const DEPARTEMENTS_RURAUX = ['23', '58']

/** Millésimes chargés — la fenêtre du moteur (5 ans) vue depuis 2025. */
const MILLESIMES = [2021, 2022, 2023, 2024, 2025]

/** Années dans lesquelles les ventes testées sont tirées. */
const ANNEES_TESTEES = new Set([2024, 2025])

/** Seuls ces types se testent : un terrain nu n'a pas de surface habitable. */
const TYPES_TESTES = new Set(['maison', 'appartement'])

/** Part de l'échantillon marquée « calibration ». Le reste est « validation ». */
const PART_CALIBRATION = 0.7

/**
 * Fourchette de l'ancien moteur : ±5 % appliqués par le front, à l'époque
 * (`priceRange` dans `src/lib/format.js` au commit 4ce5155). Elle ne venait pas
 * des ventes — d'où sa largeur constante, qui n'apprenait rien.
 */
const FOURCHETTE_AVANT_PCT = 0.05

/** Communes téléchargées de front depuis le cadastre. */
const CADASTRE_CONCURRENCE = 6

/**
 * Rayon dans lequel la variante terrain va chercher les parcelles des
 * comparables : le dernier palier de la cascade du moteur. Au-delà, on est dans
 * les replis, qui sont rares — et couvrir 20 km autour de chaque vente testée
 * ferait télécharger le cadastre de départements entiers pour quelques ventes.
 */
const RAYON_COMPARABLES_M = RAYONS_M[RAYONS_M.length - 1]

/**
 * Pas de la grille qui repère les ventes proches d'une vente testée. 0,03° de
 * latitude font 3,3 km, et 0,03° de longitude au moins 2,1 km partout en France
 * métropolitaine (le pire cas est Lille) : les neuf cellules voisines couvrent
 * donc toujours un rayon de 2 km.
 */
const CELLULE_DEG = 0.03

/** Couverture visée par la variante fourchette. */
const COUVERTURE_CIBLE = 0.8

/** En deçà, une cellule (type × confiance) ne porte pas son propre facteur. */
const MIN_CELLULE_CALIBRATION = 30

const BASE_DVF = 'https://files.data.gouv.fr/geo-dvf/latest/csv'
const BASE_CADASTRE = 'https://cadastre.data.gouv.fr/data/etalab-cadastre/latest/geojson/communes'

// ---------------------------------------------------------------- utilitaires

function options(argv) {
  const lu = (nom, defaut) => {
    const i = argv.indexOf(`--${nom}`)
    return i >= 0 && argv[i + 1] ? argv[i + 1] : defaut
  }

  return {
    n: Number(lu('n', 200)),
    rural: Number(lu('rural', 200)),
    deps: String(lu('deps', DEPARTEMENTS.join(','))).split(',').filter(Boolean),
    graine: String(lu('graine', '42')),
    avant: lu('avant', '4ce5155'),
    sortie: path.resolve(RACINE, lu('sortie', 'cache/backtest')),
  }
}

/**
 * Rang de tirage d'une vente : un condensé stable de son identifiant et de la
 * graine, ramené dans [0, 1[.
 *
 * Trier là-dessus et couper à `n` donne un tirage reproductible **et emboîté** :
 * les 15 ventes d'un essai sont les 15 premières des 3 000 d'une mesure. Un
 * mélange pseudo-aléatoire ordinaire n'aurait pas cette propriété, et deux
 * relevés de tailles différentes ne seraient plus comparables. L'exclusion des
 * ventes hors marché ne casse pas cet emboîtement : elle retire des ventes sans
 * toucher à l'ordre, et le tirage complète en descendant dans la même liste.
 */
function rang(graine, cle) {
  const h = createHash('sha256').update(`${graine}|${cle}`).digest()
  return h.readUInt32BE(0) / 2 ** 32
}

const mediane = (valeurs) => {
  if (valeurs.length === 0) return null
  const t = [...valeurs].sort((a, b) => a - b)
  const m = Math.floor(t.length / 2)
  return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2
}

const centile = (valeurs, q) => {
  if (valeurs.length === 0) return null
  const t = [...valeurs].sort((a, b) => a - b)
  const pos = (t.length - 1) * q
  const bas = Math.floor(pos)
  const haut = Math.ceil(pos)
  return bas === haut ? t[bas] : t[bas] + (t[haut] - t[bas]) * (pos - bas)
}

const part = (valeurs, predicat) =>
  valeurs.length === 0 ? null : (100 * valeurs.filter(predicat).length) / valeurs.length

const nb = (valeur, decimales = 1) =>
  valeur == null || !Number.isFinite(valeur) ? '—' : valeur.toFixed(decimales)

/** Pourcentage, ou un tiret seul quand il n'y a rien à dire — jamais « — % ». */
const pct = (valeur, decimales = 1) =>
  valeur == null || !Number.isFinite(valeur) ? '—' : `${valeur.toFixed(decimales)} %`

/** Index de la première vente dont la date atteint `date` — la coupe du passé. */
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

async function telecharge(url, destination) {
  if (existsSync(destination)) return false

  const reponse = await fetch(url, { redirect: 'follow' })
  if (!reponse.ok) throw new Error(`${url} → HTTP ${reponse.status}`)

  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(destination, Buffer.from(await reponse.arrayBuffer()))
  return true
}

// ------------------------------------------------------------------- données

/**
 * Ventes d'un département sur toute la fenêtre, triées par date.
 *
 * Les fichiers sont ceux de data.gouv, mis en cache sur le disque, et réduits
 * par `parseDvfCsv` — **le parseur de production**. Filtres de qualité,
 * regroupement des lignes d'une même mutation, exclusion des ventes groupées :
 * tout ce que le moteur voit ici, il le verrait en production.
 */
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
 * Contenances cadastrales, par identifiant de parcelle — une seule table pour
 * tout le banc, remplie au fil des besoins et jamais deux fois pour la même
 * commune.
 *
 * Source : le cadastre Etalab, un fichier par commune — quelques centaines de
 * kilo-octets, là où le fichier départemental en pèse cent cinquante méga. Seule
 * la contenance est retenue ; la géométrie est jetée à la lecture, ligne par
 * ligne, pour n'avoir jamais à tenir le fichier entier en mémoire.
 *
 * **Seules les parcelles demandées sont retenues** (`voulues`). Un tirage de
 * trois mille ventes touche plus de mille communes, soit quatre millions de
 * parcelles, dont vingt mille servent : tout garder coûterait six cents
 * méga-octets de tas pour rien. Le fichier d'index reste sur le disque, et se
 * relit en quelques millisecondes quand un autre besoin s'y présente.
 *
 * ATTENTION, hypothèse assumée : c'est le cadastre **d'aujourd'hui**, pas celui
 * du jour de la vente. Les découpages parcellaires bougent peu, et la même
 * hypothèse vaut déjà pour la contenance du bien testé.
 */
const communesLues = new Set()
let cadastreMs = 0

async function chargeContenances(communes, voulues, etiquette) {
  const table = new Map()
  const aFaire = [...new Set(communes)].filter(Boolean).sort()
  if (aFaire.length === 0) return table

  const debut = Date.now()
  process.stdout.write(`${etiquette} : ${aFaire.length} commune(s)…\n`)
  let faites = 0

  // Par lots : trois mille ventes touchent plus d'un millier de communes, et
  // les prendre une par une ferait passer le banc plus de temps à attendre le
  // réseau qu'à estimer. Six de front restent courtois pour un serveur
  // d'open data, et divisent l'attente d'autant.
  const prepare = async (insee) => {
    const index = path.join(CACHE, 'cadastre', `${insee}.json`)

    if (!existsSync(index)) {
      const brut = path.join(CACHE, 'cadastre', `${insee}-parcelles.json.gz`)
      let recu = true
      try {
        await telecharge(
          `${BASE_CADASTRE}/${insee.slice(0, 2)}/${insee}/cadastre-${insee}-parcelles.json.gz`,
          brut,
        )
      } catch {
        // Commune sans fichier publié : les biens concernés seront estimés sans
        // contenance, comme lorsque le cadastre ne répond pas en production.
        recu = false
        await mkdir(path.dirname(index), { recursive: true })
        await writeFile(index, '{}')
      }

      if (recu) {
        const extrait = {}
        for (const ligne of gunzipSync(await readFile(brut)).toString('utf8').split('\n')) {
          const debutObjet = ligne.indexOf('{')
          if (debutObjet < 0) continue
          try {
            const f = JSON.parse(ligne.slice(debutObjet).replace(/,\s*$/, ''))
            if (f?.properties?.id && f.properties.contenance != null) {
              extrait[f.properties.id] = f.properties.contenance
            }
          } catch {
            // En-tête, pied de fichier, ligne tronquée : rien à en tirer.
          }
        }

        await writeFile(index, JSON.stringify(extrait))

        // Le fichier d'origine ne sert plus à rien : il pèse une à sept méga par
        // commune, et l'index qu'on vient d'en tirer en fait quelques centaines
        // de kilo. Sur les milliers de communes d'une mesure complète, les
        // garder coûterait plusieurs gigaoctets de disque pour rien.
        await rm(brut, { force: true })
      }
    }

    for (const [id, c] of Object.entries(JSON.parse(await readFile(index, 'utf8')))) {
      if (voulues.has(id)) table.set(id, c)
    }

    communesLues.add(insee)
    faites += 1
    process.stdout.write(`\r  ${faites}/${aFaire.length} — ${insee}   `)
  }

  for (let i = 0; i < aFaire.length; i += CADASTRE_CONCURRENCE) {
    await Promise.all(aFaire.slice(i, i + CADASTRE_CONCURRENCE).map(prepare))
  }

  process.stdout.write('\n')
  cadastreMs += Date.now() - debut
  return table
}

// ------------------------------------------------------------------ géographie

/** Grille des ventes testées d'un département, au pas de `CELLULE_DEG`. */
function grilleDe(ventes) {
  const grille = new Map()
  for (const v of ventes) {
    const cle = `${Math.floor(v.lat / CELLULE_DEG)}|${Math.floor(v.lon / CELLULE_DEG)}`
    if (!grille.has(cle)) grille.set(cle, [])
    grille.get(cle).push(v)
  }
  return grille
}

/** Une vente du pool est-elle à portée de comparable d'une vente testée ? */
function aPortee(vente, grille, rayonM) {
  const i = Math.floor(vente.lat / CELLULE_DEG)
  const j = Math.floor(vente.lon / CELLULE_DEG)

  for (let di = -1; di <= 1; di += 1) {
    for (let dj = -1; dj <= 1; dj += 1) {
      for (const t of grille.get(`${i + di}|${j + dj}`) ?? []) {
        if (distanceM(vente.lat, vente.lon, t.lat, t.lon) <= rayonM) return true
      }
    }
  }

  return false
}

// --------------------------------------------------- moteur d'avant la refonte

/**
 * Charge le moteur d'avant la refonte, tel quel, depuis l'historique git.
 *
 * Son `comparables.js` est recopié **sans une modification** ; seules ses deux
 * dépendances d'entrée-sortie sont remplacées par des bouchons : `dvf.js`, qui
 * sert les ventes du passé depuis la mémoire au lieu du réseau, et `geo.js`,
 * dont le sondage des départements voisins ne rend rien — le banc n'a de toute
 * façon que le département de la vente.
 *
 * Les deux moteurs reçoivent ainsi **exactement le même jeu de ventes**. La
 * comparaison isole donc ce qui les distingue vraiment — la sélection, la
 * pondération, l'actualisation, le repli — et non les bornes de qualité, que
 * l'ancien parseur plaçait ailleurs (plancher à 200 €/m² au lieu de 500).
 */
async function moteurAvant(ref) {
  const dossier = path.join(CACHE, 'moteur-avant', ref)
  await mkdir(dossier, { recursive: true })

  const gitShow = (chemin) =>
    execFileSync('git', ['show', `${ref}:${chemin}`], { cwd: RACINE, maxBuffer: 64 * 1024 * 1024 })

  await writeFile(path.join(dossier, 'comparables.js'), gitShow('api/_lib/comparables.js'))

  // Bouchon `dvf.js` : le contexte est posé avant chaque estimation.
  await writeFile(
    path.join(dossier, 'dvf.js'),
    `// Bouchon d'entrée-sortie du banc de test — sert les ventes depuis la mémoire.
let contexte = { annee: new Date().getUTCFullYear(), parAnnee: new Map() }

export function configure(suivant) {
  contexte = suivant
}

export function candidateYears(count) {
  return Array.from({ length: count }, (_, i) => contexte.annee - i)
}

export async function loadDepartementYear(departement, year) {
  return contexte.parAnnee.get(year) ?? []
}
`,
  )

  // Bouchon `geo.js` : la géométrie est celle de production, le sondage
  // administratif ne rend rien.
  await writeFile(
    path.join(dossier, 'geo.js'),
    `export { distanceM, departementFromInsee } from ${JSON.stringify(
      pathToFileURL(path.join(RACINE, 'api/_lib/geo.js')).href,
    )}
export async function departementsAround() {
  return []
}
`,
  )

  const module = await import(pathToFileURL(path.join(dossier, 'comparables.js')).href)
  const bouchon = await import(pathToFileURL(path.join(dossier, 'dvf.js')).href)

  return { ...module, configure: bouchon.configure }
}

/** Ventes du passé, regroupées par année — ce que l'ancien moteur sait demander. */
function parAnnee(ventes) {
  const table = new Map()
  for (const v of ventes) {
    const annee = Number(v.date.slice(0, 4))
    if (!table.has(annee)) table.set(annee, [])
    table.get(annee).push(v)
  }
  return table
}

// --------------------------------------------------------- ventes hors marché

/**
 * La vente testée tient-elle dans le marché de son secteur ?
 *
 * `medianeSecteurPrixM2` est la médiane que le moteur vient lui-même de
 * calculer pour filtrer ses candidates : ventes du même type, dans un rayon de
 * 2 km, actualisées, et **prises dans le seul passé de la vente testée**. On lui
 * applique les mêmes bornes qu'aux candidates (`QUALITE.ecartMediane*`), cette
 * fois sur le prix au m² réel de la vente testée. Rien n'est réinventé ici : ni
 * le secteur, ni la règle, ni le seuil.
 *
 * Le prix au m² de la vente testée n'a pas à être actualisé : la date de
 * référence du moteur est la sienne, son semestre est donc le semestre cible et
 * son coefficient d'actualisation vaudrait 1.
 */
function horsMarcheDe(vente, resultat) {
  const medianeSecteur = resultat?.candidats?.medianeSecteurPrixM2 ?? null
  if (!medianeSecteur) return { horsMarche: false, medianeSecteur: null }

  const prixM2 = vente.pricePerM2

  return {
    horsMarche:
      prixM2 < medianeSecteur * QUALITE.ecartMedianeMin ||
      prixM2 > medianeSecteur * QUALITE.ecartMedianeMax,
    medianeSecteur,
  }
}

// ------------------------------------------------------------ variante terrain

/**
 * Parcelles portant **plusieurs maisons distinctes** dans DVF — le garde-fou de
 * la variante terrain.
 *
 * Une même parcelle qui voit se vendre deux maisons différentes n'est pas le
 * terrain d'une maison : c'est une parcelle partagée (division en jouissance,
 * lotissement non redécoupé, corps de ferme éclaté, rangée de maisons de ville
 * sur un seul tenant). Sa contenance surestimerait le terrain de chacune, et le
 * moteur corrigerait dans le mauvais sens.
 *
 * DISTINGUER DEUX MAISONS D'UNE REVENTE, c'est toute la difficulté : la revente
 * de la même maison à cinq ans d'écart apparaît, elle aussi, deux fois sur la
 * même parcelle. Deux indices, et aucun des deux seul ne suffit :
 *
 *   • **la surface habitable** — deux maisons différentes en ont presque
 *     toujours une différente, une revente porte la même. C'est l'indice
 *     principal ; relevé sur la Gironde, il désigne 2 488 des 4 804 maisons à
 *     terrain inconnu, et les adresses confirment qu'il s'agit bien de maisons
 *     distinctes (« 11 » et « 3 rue Andrée Descoubes », « 26 A » et « 26 B ») ;
 *
 *   • **le numéro de voie** — il rattrape les maisons jumelles, rigoureusement
 *     identiques et que la surface ne sépare pas : « 157 » et « 159 rue d'Iéna »,
 *     41 m² chacune, sur une seule parcelle. Dans le Nord, où les rangées de
 *     maisons de ville se comptent par milliers, cet indice ajoute 41 % de
 *     parcelles écartées à ce que la surface trouvait seule.
 *
 * Le **nom** de la voie n'entre pas dans la comparaison, lui : DVF l'orthographie
 * d'une mutation à l'autre (« 86 rue Soubiras Caud » puis « 86 rue Soubiras »,
 * même maison vendue trois fois), et s'en servir écarterait des reventes. Un
 * numéro absent ne départage rien et ne déclenche donc rien.
 *
 * Le décompte se fait sur toute la fenêtre DVF, passé et futur de la vente
 * testée confondus. C'est une propriété de la parcelle, pas du prix : elle ne
 * renseigne en rien sur ce que la vente testée a valu, et le cadastre lu est de
 * toute façon celui d'aujourd'hui.
 */
const numeroDeVoie = (vente) => /^(\d+)/.exec(vente.adresse ?? '')?.[1] ?? null

function parcellesPartagees(pool) {
  const parParcelle = new Map()

  for (const v of pool) {
    if (v.kind !== 'maison' || !v.idParcelle) continue
    if (!parParcelle.has(v.idParcelle)) parParcelle.set(v.idParcelle, [])
    parParcelle.get(v.idParcelle).push(v)
  }

  const partagees = new Set()

  for (const [id, ventes] of parParcelle) {
    if (ventes.length < 2) continue

    const surfaces = new Set(ventes.map((v) => Math.round(v.surface)))
    const numeros = new Set(ventes.map(numeroDeVoie).filter((n) => n != null))

    if (surfaces.size > 1 || numeros.size > 1) partagees.add(id)
  }

  return partagees
}

/**
 * Le pool du département, avec la contenance cadastrale posée sur les maisons
 * dont DVF ne dit pas le terrain.
 *
 * L'ordre est celui du pool d'origine — la coupe du passé (`borneInf`) reste
 * donc valable telle quelle. Seules les ventes complétées sont recopiées.
 */
function poolComplete(pool, partagees, contenances) {
  return pool.map((v) => {
    if (v.kind !== 'maison' || v.surfaceTerrain > 0 || !v.idParcelle) return v
    if (partagees.has(v.idParcelle)) return v

    const contenance = contenances.get(v.idParcelle)
    return contenance > 0 ? { ...v, surfaceTerrainCadastre: contenance } : v
  })
}

// --------------------------------------------------------- variante fourchette

/**
 * De combien la demi-fourchette aurait-il fallu multiplier pour que le prix
 * réel y tombe ? En dessous de 1, la fourchette contenait déjà la vente.
 */
function facteurRequis(ligne) {
  if (ligne.prix == null || ligne.low == null || ligne.high == null) return null

  const demi = ligne.reel < ligne.prix ? ligne.prix - ligne.low : ligne.high - ligne.prix
  if (!(demi > 0)) return ligne.reel === ligne.prix ? 0 : 1e6

  return Math.abs(ligne.reel - ligne.prix) / demi
}

/**
 * Facteurs d'élargissement par (type, confiance), calés sur le groupe
 * calibration pour atteindre `COUVERTURE_CIBLE`.
 *
 * Le facteur d'une cellule est le 80ᵉ centile des facteurs requis de ses
 * ventes : par construction, 80 % d'entre elles tombent alors dans la
 * fourchette. Une cellule trop maigre n'a pas de facteur à elle — elle emprunte
 * celui de son type, puis celui de l'ensemble.
 */
function calibreFourchette(calibration) {
  const facteurDe = (lignes) => {
    const requis = lignes.map(facteurRequis).filter((f) => f != null)
    return requis.length > 0 ? centile(requis, COUVERTURE_CIBLE) : null
  }

  const global = { facteur: facteurDe(calibration), n: calibration.length, source: 'ensemble' }

  const parType = new Map()
  for (const type of new Set(calibration.map((l) => l.type))) {
    const lignes = calibration.filter((l) => l.type === type)
    parType.set(type, { facteur: facteurDe(lignes), n: lignes.length, source: 'type' })
  }

  const cellules = new Map()
  for (const l of calibration) {
    const cle = `${l.type}|${l.confiance}`
    if (!cellules.has(cle)) cellules.set(cle, [])
    cellules.get(cle).push(l)
  }

  const table = new Map()
  for (const [cle, lignes] of cellules) {
    const propre = lignes.length >= MIN_CELLULE_CALIBRATION ? facteurDe(lignes) : null
    const emprunt = parType.get(lignes[0].type) ?? global
    table.set(cle, {
      facteur: propre ?? (emprunt.facteur != null ? emprunt.facteur : global.facteur),
      n: lignes.length,
      source: propre != null ? 'type × confiance' : (emprunt.facteur != null ? emprunt.source : 'ensemble'),
      couvertureAvant: part(lignes, (l) => l.dans === true),
    })
  }

  return {
    table,
    global,
    pour: (type, confiance) =>
      table.get(`${type}|${confiance}`)?.facteur ??
      parType.get(type)?.facteur ??
      global.facteur,
  }
}

/**
 * Pose les bornes élargies sur une ligne. Elles ne sont **pas arrondies** :
 * c'est une mesure, et l'arrondi d'affichage du moteur ne ferait qu'y ajouter du
 * bruit.
 */
function appliqueFourchette(ligne, facteurs) {
  if (ligne.prix == null || ligne.low == null || ligne.high == null) return

  const facteur = facteurs.pour(ligne.type, ligne.confiance)
  if (facteur == null) return

  ligne.facteurCal = facteur
  ligne.lowCal = Math.max(ligne.prix - facteur * (ligne.prix - ligne.low), 15000)
  ligne.highCal = ligne.prix + facteur * (ligne.high - ligne.prix)
  ligne.pivotCal = ligne.prix
  ligne.dansCal = ligne.reel >= ligne.lowCal && ligne.reel <= ligne.highCal
}

// -------------------------------------------------------------------- sortie

const ENTETES = [
  'id',
  'departement',
  'commune',
  'date',
  'type',
  'surface_m2',
  'terrain_m2',
  'groupe',
  'echantillon',
  'hors_marche',
  'mediane_secteur_m2',
  'ventes_secteur',
  'prix_reel',
  'prix_m2_reel',
  'prix_estime',
  'ecart_pct',
  'low',
  'high',
  'dans_fourchette',
  'etape',
  'rayon_m',
  'comparables',
  'comparables_terrain_connu',
  'confiance',
  'prix_estime_terrain',
  'ecart_pct_terrain',
  'low_terrain',
  'high_terrain',
  'dans_fourchette_terrain',
  'etape_terrain',
  'comparables_terrain',
  'comparables_terrain_connu_apres',
  'facteur_fourchette',
  'low_fourchette',
  'high_fourchette',
  'dans_fourchette_calibree',
  'prix_estime_avant',
  'ecart_pct_avant',
  'low_avant',
  'high_avant',
  'dans_fourchette_avant',
  'rayon_avant',
  'comparables_avant',
]

const ligneCsv = (valeurs) =>
  valeurs
    .map((v) => (v == null ? '' : typeof v === 'string' && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v))
    .join(',')

const oui = (v) => (v == null ? '' : v ? 'oui' : 'non')

/**
 * Les moteurs comparés, et le suffixe sous lequel chacun range ses colonnes sur
 * une ligne de résultat.
 *
 * La variante fourchette ne change **que les bornes** : son prix est celui du
 * moteur actuel, et elle ne porte donc pas de colonne d'écart — les cases
 * correspondantes restent vides plutôt que de répéter les mêmes chiffres sous
 * un autre nom.
 */
const MOTEURS = [
  ['actuel', ''],
  ['terrain', 'Terrain'],
  ['fourchette 80 %', 'Cal'],
  ['avant', 'Avant'],
]

/** Les indicateurs demandés, sur un sous-ensemble de lignes. */
function indicateurs(lignes, prefixe) {
  const ecarts = lignes.map((l) => l[`ecart${prefixe}`]).filter((e) => e != null)
  const absolus = ecarts.map(Math.abs)
  const dans = lignes.map((l) => l[`dans${prefixe}`]).filter((d) => d != null)

  const demiLargeurs = lignes
    .map((l) => {
      const bas = l[`low${prefixe}`]
      const haut = l[`high${prefixe}`]
      const pivot = l[`pivot${prefixe}`]
      return bas != null && haut != null && pivot > 0 ? (50 * (haut - bas)) / pivot : null
    })
    .filter((d) => d != null)

  return {
    n: Math.max(ecarts.length, dans.length),
    medianeAbs: mediane(absolus),
    pct10: part(absolus, (e) => e <= 10),
    // ±15 % est la largeur de la fourchette en confiance normale : cette
    // colonne dit donc, à peu de chose près, ce que cette fourchette-là
    // couvrirait. « Dans fourchette », juste à côté, le dit exactement — les
    // deux se lisent ensemble, l'une rapportant l'écart au prix réel et l'autre
    // au prix estimé.
    pct15: part(absolus, (e) => e <= 15),
    pct20: part(absolus, (e) => e <= 20),
    p90: centile(absolus, 0.9),
    biais: mediane(ecarts),
    fourchette: part(dans, (d) => d),
    demiLargeur: mediane(demiLargeurs),
  }
}

function tableau(titre, groupes) {
  const lignes = [
    `**${titre}**`,
    '',
    '| Groupe | Moteur | n | Err. abs. médiane | ±10 % | ±15 % | ±20 % | 90e centile | Biais | Dans fourchette | Demi-largeur méd. |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ]

  for (const [nom, sous] of groupes) {
    for (const [moteur, prefixe] of MOTEURS) {
      const i = indicateurs(sous, prefixe)
      if (i.n === 0) continue
      lignes.push(
        `| ${nom} | ${moteur} | ${i.n} | ${pct(i.medianeAbs)} | ${pct(i.pct10)} | ${pct(i.pct15)} | ${pct(i.pct20)} | ${pct(i.p90)} | ${pct(i.biais)} | ${pct(i.fourchette)} | ${pct(i.demiLargeur)} |`,
      )
    }
  }

  return lignes.join('\n')
}

const parCle = (lignes, cle, ordre = null) => {
  const table = new Map()
  for (const l of lignes) {
    const k = String(l[cle] ?? '—')
    if (!table.has(k)) table.set(k, [])
    table.get(k).push(l)
  }

  const entrees = [...table.entries()]
  if (!ordre) return entrees.sort((a, b) => (a[0] < b[0] ? -1 : 1))

  return entrees.sort((a, b) => ordre.indexOf(a[0]) - ordre.indexOf(b[0]))
}

const TRANCHES_SURFACE = ['< 60 m²', '60–100 m²', '100–150 m²', '≥ 150 m²']

const tranche = (surface) =>
  surface < 60 ? '< 60 m²' : surface < 100 ? '60–100 m²' : surface < 150 ? '100–150 m²' : '≥ 150 m²'

const TRANCHES_TERRAIN = ['< 200 m²', '200–500 m²', '500–1000 m²', '> 1000 m²', 'terrain inconnu']

const trancheTerrain = (terrain) =>
  terrain == null || !(terrain > 0)
    ? 'terrain inconnu'
    : terrain < 200
      ? '< 200 m²'
      : terrain < 500
        ? '200–500 m²'
        : terrain <= 1000
          ? '500–1000 m²'
          : '> 1000 m²'

/** Tableau des ventes écartées, sur le préfixe de tirage examiné. */
function tableauExclusions(titre, examinees, cle) {
  const lignes = [
    `**${titre}**`,
    '',
    '| Groupe | Examinées | Écartées | Part | Ventes du secteur (médiane) |',
    '| --- | --- | --- | --- | --- |',
  ]

  const ligne = (nom, sous, gras = false) => {
    const ecartees = sous.filter((l) => l.horsMarche).length
    const secteur = mediane(sous.map((l) => l.ventesSecteur).filter((v) => v != null))
    const g = gras ? '**' : ''
    return `| ${g}${nom}${g} | ${g}${sous.length}${g} | ${g}${ecartees}${g} | ${g}${pct((100 * ecartees) / (sous.length || 1))}${g} | ${g}${nb(secteur, 0)}${g} |`
  }

  for (const [nom, sous] of parCle(examinees, cle)) lignes.push(ligne(nom, sous))
  lignes.push(ligne('ensemble', examinees, true))

  return lignes.join('\n')
}

// ---------------------------------------------------------------- identité

/**
 * Cas de contrôle : la maison marseillaise de la parcelle 132108580H0042,
 * 100 m² habitables sur 359 m² de terrain.
 *
 * Les valeurs attendues sont celles que `POST /api/estimation` rend aujourd'hui
 * pour ce bien. Elles ne sont pas gravées dans le marbre — elles bougeront le
 * jour où DVF publiera un millésime de plus, puisque l'échantillon de
 * comparables bougera avec lui. Ce qu'elles garantissent, c'est qu'à données
 * égales le banc et la production calculent **le même euro** : si ce test
 * échoue sans qu'un nouveau millésime soit paru, c'est que le banc a divergé du
 * moteur, et plus rien de ce qu'il mesure ne vaut.
 */
const CONTROLE = {
  bien: {
    lat: 43.277895,
    lon: 5.4369,
    type: 'maison',
    surfaceM2: 100,
    contenance: 359,
    etage: null,
    codeInsee: '13210',
    departement: '13',
  },
  attendu: { prix: 527000, low: 448000, high: 606000, comparables: 8, etape: 'cascade-normale' },
}

/**
 * Refuse de mesurer quoi que ce soit tant que le banc ne reproduit pas
 * exactement la production. Rend le détail pour l'afficher.
 */
async function verifieIdentite() {
  const ventes = await ventesDepartement(CONTROLE.bien.departement, MILLESIMES)
  const r = estime({ bien: CONTROLE.bien, ventes })

  const obtenu = {
    prix: r.prix,
    low: r.low,
    high: r.high,
    comparables: r.comparables.length,
    etape: r.etape,
  }

  const ecarts = Object.entries(CONTROLE.attendu).filter(([cle, v]) => obtenu[cle] !== v)

  return { obtenu, attendu: CONTROLE.attendu, ecarts, prixM2: Math.round(r.prixM2) }
}

/**
 * Le résumé Markdown, en entier — du titre aux vingt pires écarts.
 *
 * Sorti de `main` parce qu'il n'y a là que de la mise en forme : pas une
 * décision de mesure, pas un chiffre calculé autrement qu'en lisant les lignes
 * déjà mesurées. `main` garde la mesure, cette fonction la raconte.
 */
function resumeMarkdown({
  opts,
  principal,
  calibration,
  validation,
  rural,
  depsRuraux,
  terrainStats,
  facteurs,
}) {
  const pires = [...principal.retenus]
    .filter((l) => l.ecart != null)
    .sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart))
    .slice(0, 20)

  const maisons = validation.filter((l) => l.type === 'maison')

  const sections = [
    `# Banc de test — ${principal.retenus.length} ventes`,
    '',
    `Départements ${opts.deps.join(', ')} · graine ${opts.graine} · moteur de comparaison \`${opts.avant}\``,
    `Écart = (estimé − réel) / réel. « Biais » est la médiane signée de cet écart.`,
    `« Demi-largeur méd. » est la demi-fourchette médiane, en % du prix estimé.`,
    '',
    'Trois moteurs sont mesurés à côté de celui de production :',
    '',
    '- **terrain** — même moteur, comparables dont le terrain inconnu de DVF a été comblé par la contenance cadastrale de la parcelle ;',
    '- **fourchette 80 %** — même moteur et **même prix**, bornes élargies par les facteurs calés sur le groupe calibration (d\'où les colonnes d\'écart vides : seules les bornes changent) ;',
    '- **avant** — le moteur d\'avant la refonte, pour référence.',
    '',
    '## Ventes écartées du test',
    '',
    'Une vente testée dont le prix au m² sort de la fourchette 0,5×–2× de la médiane',
    'de son secteur (2 km, même type, ventes antérieures seules) n\'est pas une vente',
    'de marché : aucun moteur ne peut la retrouver. C\'est la règle du filtre relatif',
    'du moteur, retournée contre la vente testée. Le tirage descend plus bas dans la',
    'liste pour compléter l\'échantillon.',
    '',
    'La dernière colonne dit sur combien de ventes repose cette médiane de secteur.',
    'Là où elle est mince — la Creuse, la Nièvre —, la règle s\'appuie sur peu de',
    'choses et écarte davantage : c\'est le même relâchement de la mesure qui rend le',
    'moteur moins bon dans ces départements, vu de l\'autre côté.',
    '',
    tableauExclusions('Par département', principal.examinees, 'dep'),
    '',
    tableauExclusions('Par type', principal.examinees, 'type'),
    '',
    '## Mesure',
    '',
    tableau('Ensemble', [
      ['calibration', calibration],
      ['validation', validation],
      ['tout', principal.retenus],
    ]),
    '',
    tableau('Par département (validation)', parCle(validation, 'dep')),
    '',
    tableau('Par type (validation)', parCle(validation, 'type')),
    '',
    tableau('Par étape (validation)', parCle(validation, 'etape')),
    '',
    tableau('Par tranche de surface (validation)', parCle(validation, 'tranche', TRANCHES_SURFACE)),
    '',
    tableau('Par confiance (validation)', parCle(validation, 'confiance')),
    '',
    tableau(
      'Maisons — par tranche de terrain (validation)',
      parCle(maisons, 'trancheTerrain', TRANCHES_TERRAIN),
    ),
    '',
    '## Variante terrain — ce que le cadastre comble',
    '',
    '« Zone » = les maisons vendues à moins de 2 km d\'une vente testée, c\'est-à-dire',
    'celles qui peuvent servir de comparable. Le garde-fou compte les parcelles',
    'écartées parce que plusieurs maisons distinctes y ont été vendues.',
    '',
    'La zone dépend de l\'échantillon : deux tirages de tailles différentes ne',
    'comblent pas exactement les mêmes terrains, et cette variante est la seule du',
    'banc dont les chiffres ne soient pas rigoureusement emboîtés d\'un `--n` à',
    'l\'autre. Au-delà de 2 km — les replis, rares —, le terrain reste inconnu comme',
    'aujourd\'hui : couvrir les 20 km du dernier palier ferait télécharger le',
    'cadastre de départements entiers pour quelques ventes.',
    '',
    '| Département | Maisons de la zone | Terrain inconnu avant | Après complément | Comblés | Garde-fou | Sans contenance | Communes téléchargées |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ]

  const total = { maisonsZone: 0, inconnusAvant: 0, inconnusApres: 0, remplis: 0, gardeFou: 0, sansContenance: 0, communes: 0 }

  for (const [dep, s] of [...terrainStats.entries()].sort()) {
    for (const cle of Object.keys(total)) total[cle] += s[cle]
    sections.push(
      `| ${dep} | ${s.maisonsZone} | ${s.inconnusAvant} (${pct((100 * s.inconnusAvant) / (s.maisonsZone || 1))}) | ` +
        `${s.inconnusApres} (${pct((100 * s.inconnusApres) / (s.maisonsZone || 1))}) | ${s.remplis} | ${s.gardeFou} | ${s.sansContenance} | ${s.communes} |`,
    )
  }

  sections.push(
    `| **ensemble** | **${total.maisonsZone}** | **${total.inconnusAvant} (${pct((100 * total.inconnusAvant) / (total.maisonsZone || 1))})** | ` +
      `**${total.inconnusApres} (${pct((100 * total.inconnusApres) / (total.maisonsZone || 1))})** | **${total.remplis}** | ` +
      `**${total.gardeFou}** | **${total.sansContenance}** | **${total.communes}** |`,
  )

  const maisonsTestees = principal.retenus.filter((l) => l.type === 'maison')
  const comparablesTotal = maisonsTestees.reduce((s, l) => s + (l.comparables ?? 0), 0)
  const connusAvant = maisonsTestees.reduce((s, l) => s + (l.comparablesTerrainConnu ?? 0), 0)
  const comparablesTotalApres = maisonsTestees.reduce((s, l) => s + (l.comparablesTerrain ?? 0), 0)
  const connusApres = maisonsTestees.reduce((s, l) => s + (l.comparablesTerrainConnuApres ?? 0), 0)

  sections.push(
    '',
    '**Sur les comparables réellement retenus** par le moteur pour les maisons testées :',
    '',
    `- avant : ${pct(100 - (100 * connusAvant) / (comparablesTotal || 1))} de terrains inconnus (${comparablesTotal - connusAvant} sur ${comparablesTotal}) ;`,
    `- après : ${pct(100 - (100 * connusApres) / (comparablesTotalApres || 1))} de terrains inconnus (${comparablesTotalApres - connusApres} sur ${comparablesTotalApres}).`,
    '',
    '## Variante fourchette — facteurs à 80 %',
    '',
    'Facteur = multiplicateur de la bande fixe du moteur (±15, ±20 ou ±25 % selon',
    'la confiance). Il est calé sur le',
    'groupe **calibration** pour que 80 % des prix réels y tombent, puis appliqué tel',
    'quel au groupe **validation**, dont la couverture est la seule qui compte. Un',
    'facteur inférieur à 1 signifierait une fourchette trop large pour 80 %.',
    '',
    '| Type | Confiance | n calib. | Couverture calib. actuelle | Facteur | Source | n valid. | Couverture valid. | Demi-largeur méd. valid. |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  )

  for (const [cle, cellule] of [...facteurs.table.entries()].sort()) {
    const [type, confiance] = cle.split('|')
    const sousValidation = validation.filter((l) => l.type === type && l.confiance === confiance)
    const i = indicateurs(sousValidation, 'Cal')
    sections.push(
      `| ${type} | ${confiance} | ${cellule.n} | ${pct(cellule.couvertureAvant)} | ${nb(cellule.facteur, 2)} | ${cellule.source} | ` +
        `${sousValidation.length} | ${pct(i.fourchette)} | ${pct(i.demiLargeur)} |`,
    )
  }

  const iCalGlobal = indicateurs(validation, 'Cal')
  const iActuelGlobal = indicateurs(validation, '')
  sections.push(
    `| **ensemble** | | **${calibration.length}** | | **${nb(facteurs.global.facteur, 2)}** | | **${validation.length}** | **${pct(iCalGlobal.fourchette)}** | **${pct(iCalGlobal.demiLargeur)}** |`,
    '',
    `Pour mémoire, le moteur actuel couvre ${pct(iActuelGlobal.fourchette)} de la validation avec une ` +
      `demi-largeur médiane de ${pct(iActuelGlobal.demiLargeur)}.`,
  )

  // --- Section rurale.
  if (depsRuraux.length > 0) {
    sections.push(
      '',
      `## Départements ruraux — ${opts.rural} ventes par département`,
      '',
      'Sur-échantillon des départements où DVF est trop maigre pour que le tirage',
      'général en donne assez. Ces ventes ne sont **pas** dans les tableaux ci-dessus,',
      'sauf celles que le tirage général avait déjà retenues. Les facteurs de la',
      'variante fourchette restent ceux calés sur la calibration de l\'échantillon',
      'principal — ils ne sont pas recalés ici.',
      '',
    )

    for (const dep of depsRuraux) {
      const r = rural.get(dep)
      const ecartees = r.examinees.filter((l) => l.horsMarche).length
      sections.push(
        `**${dep}** — ${r.retenus.length} vente(s) retenue(s), ${ecartees} écartée(s) hors marché ` +
          `sur ${r.examinees.length} examinée(s) (${pct((100 * ecartees) / (r.examinees.length || 1))}).`,
        '',
      )
    }

    const toutRural = [...new Set([...rural.values()].flatMap((r) => r.retenus))]

    sections.push(
      tableau('Par département (tout le sur-échantillon rural)', parCle(toutRural, 'dep')),
      '',
      tableau('Par type (rural)', parCle(toutRural, 'type')),
      '',
      tableau('Par étape (rural)', parCle(toutRural, 'etape')),
      '',
      tableau(
        'Maisons rurales — par tranche de terrain',
        parCle(
          toutRural.filter((l) => l.type === 'maison'),
          'trancheTerrain',
          TRANCHES_TERRAIN,
        ),
      ),
    )
  }

  sections.push('', '## Les 20 pires écarts (échantillon nettoyé)', '')

  for (const l of pires) {
    sections.push(
      `**${l.ecart > 0 ? '+' : ''}${l.ecart.toFixed(0)} %** — ${l.type} ${l.surface} m²` +
        `${l.terrain ? `, terrain ${l.terrain} m²` : ''}, ${l.commune}, ${l.date} · ` +
        `réel ${l.reel.toLocaleString('fr-FR')} € (${Math.round(l.prixM2Reel).toLocaleString('fr-FR')} €/m², ` +
        `médiane du secteur ${l.medianeSecteur?.toLocaleString('fr-FR') ?? '—'} €/m²) · ` +
        `estimé ${l.prix.toLocaleString('fr-FR')} € ` +
        `(${l.etape}, ${l.comparables} comparables, confiance ${l.confiance})` +
        (l.prixTerrain != null ? ` · variante terrain ${l.prixTerrain.toLocaleString('fr-FR')} €` : ''),
    )
    sections.push('')
    for (const c of l.detail) {
      sections.push(
        `  - ${c.distanceM} m · ${c.surface} m²${c.terrain ? ` · terrain ${c.terrain} m²` : ' · terrain inconnu'} · ${c.date} · ${c.prixM2.toLocaleString('fr-FR')} €/m² · ${c.adresse}`,
      )
    }
    sections.push('')
  }
  return sections.join('\n')
}

// --------------------------------------------------------------------- main

async function main() {
  const opts = options(process.argv.slice(2))
  const depart = Date.now()
  const chrono = { chargement: 0, actuel: 0, terrain: 0, avant: 0 }

  console.log(
    `Banc de test — ${opts.n} ventes, départements ${opts.deps.join(', ')}, graine ${opts.graine}`,
  )

  // --- 0. Identité avec le moteur de production. Rien ne se mesure avant.
  process.stdout.write('\nTest d’identité (Marseille, parcelle 132108580H0042, maison 100 m²)…\n')
  const identite = await verifieIdentite()

  for (const [cle, attendu] of Object.entries(identite.attendu)) {
    const obtenu = identite.obtenu[cle]
    console.log(`  ${obtenu === attendu ? '✓' : '✗'} ${cle} : ${obtenu}${obtenu === attendu ? '' : ` (attendu ${attendu})`}`)
  }

  if (identite.ecarts.length > 0) {
    console.error(
      '\nLe banc ne reproduit pas le moteur de production : mesure interrompue.\n' +
        'Soit un nouveau millésime DVF est paru — les valeurs de contrôle sont alors à\n' +
        'remettre à jour depuis `POST /api/estimation` —, soit le banc a divergé du moteur.',
    )
    process.exit(1)
  }

  console.log(`  prix au m² : ${identite.prixM2} €`)

  // --- 1. Tirage. Les candidates sont les ventes 2024-2025 de logement, du
  //     département, déjà réduites par le parseur de production.
  process.stdout.write('Lecture des millésimes récents…\n')
  const candidates = []

  for (const dep of opts.deps) {
    const recentes = await ventesDepartement(dep, [...ANNEES_TESTEES])
    for (const v of recentes) {
      if (!TYPES_TESTES.has(v.kind) || !v.idParcelle) continue
      candidates.push({ ...v, dep, rang: rang(opts.graine, v.id) })
    }
    process.stdout.write(`  ${dep} : ${recentes.length} ventes lues\n`)
  }

  candidates.sort((a, b) => a.rang - b.rang)

  if (candidates.length === 0) {
    console.error('Aucune vente candidate — vérifier les départements demandés.')
    process.exit(1)
  }

  const candidatesParDep = new Map()
  for (const c of candidates) {
    if (!candidatesParDep.has(c.dep)) candidatesParDep.set(c.dep, [])
    candidatesParDep.get(c.dep).push(c)
  }

  const depsRuraux = opts.rural > 0 ? opts.deps.filter((d) => DEPARTEMENTS_RURAUX.includes(d)) : []

  // --- 2. Moteur de comparaison.
  const avant = opts.avant && opts.avant !== 'non' ? await moteurAvant(opts.avant) : null
  if (avant) console.log(`Moteur de comparaison : ${opts.avant}`)

  // --- 3. Phase A — tirage et mesure de référence (moteur actuel, moteur
  //     d'avant), par vagues.
  //
  //     Une vague mesure un préfixe du tirage ; si les ventes hors marché
  //     écartées empêchent d'atteindre `--n`, la vague suivante descend plus bas
  //     dans la même liste. Le verdict « hors marché » ne dépend que du moteur
  //     actuel : la variante terrain, qui a besoin de savoir quelles ventes
  //     forment l'échantillon final pour choisir le cadastre à télécharger,
  //     attend donc la phase B.
  const mesures = new Map()
  const evalues = new Map()
  const contenancesBiens = new Map()

  // Deux grandeurs à ne pas confondre : l'**objectif** est un nombre de ventes
  // retenues, il ne bouge pas ; le **préfixe** est le nombre de candidates qu'il
  // faut mesurer pour l'atteindre, et c'est lui qui s'allonge d'une vague à
  // l'autre à mesure que les ventes hors marché se révèlent.
  let prefixe = Math.min(opts.n, candidates.length)
  const ruralObjectif = new Map(
    depsRuraux.map((d) => [d, Math.min(opts.rural, (candidatesParDep.get(d) ?? []).length)]),
  )
  const ruralPrefixe = new Map(ruralObjectif)
  let mesurees = 0

  for (let vague = 1; ; vague += 1) {
    const cible = new Map()
    for (const c of candidates.slice(0, prefixe)) cible.set(c.dep, (cible.get(c.dep) ?? 0) + 1)
    for (const [dep, k] of ruralPrefixe) cible.set(dep, Math.max(cible.get(dep) ?? 0, k))

    const travail = []
    for (const [dep, voulu] of cible) {
      const deja = evalues.get(dep) ?? 0
      const fin = Math.min(voulu, (candidatesParDep.get(dep) ?? []).length)
      if (fin > deja) travail.push({ dep, debut: deja, fin })
    }

    if (travail.length === 0) break

    const aMesurer = travail.flatMap(({ dep, debut, fin }) =>
      candidatesParDep.get(dep).slice(debut, fin),
    )

    console.log(
      `\nVague ${vague} — ${aMesurer.length} vente(s) à mesurer sur ${travail.length} département(s)`,
    )

    const contenancesVague = await chargeContenances(
      aMesurer.map((v) => v.commune),
      new Set(aMesurer.map((v) => v.idParcelle)),
      '  Cadastre des biens testés',
    )
    for (const [id, c] of contenancesVague) contenancesBiens.set(id, c)

    for (const { dep, debut, fin } of travail) {
      const debutChargement = Date.now()
      const pool = await ventesDepartement(dep, MILLESIMES)
      const annuel = avant ? parAnnee(pool) : null
      chrono.chargement += Date.now() - debutChargement

      const lot = candidatesParDep
        .get(dep)
        .slice(debut, fin)
        .sort((a, b) => (a.date < b.date ? -1 : 1))

      for (const vente of lot) {
        const coupe = borneInf(pool, vente.date)
        const anterieures = pool.slice(0, coupe)

        const contenance = contenancesBiens.get(vente.idParcelle) ?? null
        const bien = {
          lat: vente.lat,
          lon: vente.lon,
          type: vente.kind,
          surfaceM2: vente.surface,
          contenance,
          etage: null,
          codeInsee: vente.commune,
          departement: dep,
        }

        const maintenant = Date.parse(vente.date)
        const topApres = Date.now()
        const apres = estime({ bien, ventes: anterieures, maintenant })
        chrono.actuel += Date.now() - topApres

        const { horsMarche, medianeSecteur } = horsMarcheDe(vente, apres)

        let estimeAvant = null
        if (avant && !horsMarche) {
          const topAvant = Date.now()
          const annee = Number(vente.date.slice(0, 4))
          const passeAnnuel = new Map()
          for (const [a, liste] of annuel) {
            const c = borneInf(liste, vente.date)
            if (c > 0) passeAnnuel.set(a, liste.slice(0, c))
          }
          avant.configure({ annee, parAnnee: passeAnnuel })

          const comparables = await avant.findComparables({
            lat: vente.lat,
            lon: vente.lon,
            type: vente.kind,
            departement: dep,
          })

          let prixM2 = comparables.pricePerM2
          let rayon = comparables.radiusM
          let nbComparables = comparables.sales.length

          if (!prixM2) {
            const repli = await avant.departementPricePerM2(dep, vente.kind)
            prixM2 = repli.pricePerM2
            rayon = null
            nbComparables = repli.count
          }

          if (prixM2) {
            // La seule ligne de l'ancien `api/estimation.js` reprise ici : médiane
            // × surface × coefficient d'étage, arrondie au millier et bornée.
            const brut = prixM2 * vente.surface * coefficientEtage(null)
            const prix = Math.min(Math.max(Math.round(brut / 1000) * 1000, 15000), 20000000)
            estimeAvant = {
              prix,
              low: Math.round((prix * (1 - FOURCHETTE_AVANT_PCT)) / 1000) * 1000,
              high: Math.round((prix * (1 + FOURCHETTE_AVANT_PCT)) / 1000) * 1000,
              rayon,
              nbComparables,
            }
          }

          chrono.avant += Date.now() - topAvant
        }

        const reel = vente.price
        const ecart = apres.prix ? (100 * (apres.prix - reel)) / reel : null
        const ecartAvant = estimeAvant ? (100 * (estimeAvant.prix - reel)) / reel : null

        mesures.set(vente.id, {
          id: vente.id,
          dep,
          commune: vente.commune,
          lat: vente.lat,
          lon: vente.lon,
          date: vente.date,
          type: vente.kind,
          surface: vente.surface,
          terrain: contenance,
          prixM2Reel: vente.pricePerM2,
          horsMarche,
          medianeSecteur: medianeSecteur ? Math.round(medianeSecteur) : null,
          ventesSecteur: apres.candidats?.dansLeSecteur ?? null,
          groupe: rang(opts.graine, `groupe|${vente.id}`) < PART_CALIBRATION ? 'calibration' : 'validation',
          echantillon: [],
          reel,
          prix: apres.prix,
          pivot: apres.prix,
          ecart,
          low: apres.low,
          high: apres.high,
          dans: apres.prix ? reel >= apres.low && reel <= apres.high : null,
          etape: apres.etape,
          rayon: apres.rayonAtteintM,
          comparables: apres.comparables.length,
          comparablesTerrainConnu: apres.comparables.filter((c) => c.surfaceTerrain > 0).length,
          confiance: apres.confiance,
          tranche: tranche(vente.surface),
          trancheTerrain: trancheTerrain(contenance),
          prixAvant: estimeAvant?.prix ?? null,
          pivotAvant: estimeAvant?.prix ?? null,
          ecartAvant,
          lowAvant: estimeAvant?.low ?? null,
          highAvant: estimeAvant?.high ?? null,
          dansAvant: estimeAvant ? reel >= estimeAvant.low && reel <= estimeAvant.high : null,
          rayonAvant: estimeAvant?.rayon ?? null,
          comparablesAvant: estimeAvant?.nbComparables ?? null,
          detail: apres.comparables.slice(0, 8).map((c) => ({
            adresse: c.adresse,
            date: c.date,
            distanceM: Math.round(c.distanceM),
            surface: c.surface,
            terrain: c.surfaceTerrain ?? null,
            prixM2: Math.round(c.prixM2Actualise),
          })),
        })

        mesurees += 1
        process.stdout.write(`\r  ${dep} — ${mesurees} vente(s) mesurée(s)   `)
      }

      evalues.set(dep, fin)
    }

    process.stdout.write('\n')

    // Faut-il descendre plus bas dans le tirage ? La marge évite d'enchaîner
    // trois vagues pour quelques ventes : elle ne change pas l'échantillon, qui
    // reste les `--n` premières ventes retenues dans l'ordre du tirage.
    const retenusGlobal = candidates
      .slice(0, prefixe)
      .filter((c) => mesures.get(c.id)?.horsMarche === false).length

    if (retenusGlobal < opts.n && prefixe < candidates.length) {
      const manque = opts.n - retenusGlobal
      prefixe = Math.min(candidates.length, prefixe + Math.ceil(manque * 1.4) + 5)
    }

    for (const [dep, objectif] of ruralObjectif) {
      const liste = candidatesParDep.get(dep) ?? []
      const vus = Math.min(ruralPrefixe.get(dep), liste.length)
      const retenus = liste
        .slice(0, vus)
        .filter((c) => mesures.get(c.id)?.horsMarche === false).length
      if (retenus < objectif && vus < liste.length) {
        ruralPrefixe.set(dep, Math.min(liste.length, vus + Math.ceil((objectif - retenus) * 1.4) + 5))
      }
    }
  }

  /** Les `cible` premières ventes retenues d'une liste de candidates, et le préfixe examiné pour les trouver. */
  const coupeRetenus = (liste, cible) => {
    const retenus = []
    const examinees = []

    for (const c of liste) {
      const l = mesures.get(c.id)
      if (!l) break
      examinees.push(l)
      if (!l.horsMarche) retenus.push(l)
      if (retenus.length >= cible) break
    }

    return { retenus, examinees }
  }

  const principal = coupeRetenus(candidates, opts.n)
  for (const l of principal.retenus) l.echantillon.push('principal')

  const rural = new Map()
  for (const dep of depsRuraux) {
    const r = coupeRetenus(candidatesParDep.get(dep) ?? [], opts.rural)
    for (const l of r.retenus) if (!l.echantillon.includes('rural')) l.echantillon.push('rural')
    rural.set(dep, r)
  }

  const echantillon = [...new Set([...principal.retenus, ...[...rural.values()].flatMap((r) => r.retenus)])]

  console.log(
    `\nÉchantillon retenu : ${principal.retenus.length} vente(s)` +
      (depsRuraux.length > 0
        ? ` + ${[...rural.values()].reduce((s, r) => s + r.retenus.length, 0)} rurale(s)`
        : '') +
      ` — ${principal.examinees.filter((l) => l.horsMarche).length} écartée(s) hors marché sur ${principal.examinees.length} examinée(s)`,
  )

  // --- 4. Phase B — variante terrain. L'échantillon final est connu : on sait
  //     donc exactement quelles communes couvrir, et la couverture ne dépend
  //     plus de l'ordre des vagues.
  const terrainStats = new Map()
  const echantillonParDep = new Map()
  for (const l of echantillon) {
    if (!echantillonParDep.has(l.dep)) echantillonParDep.set(l.dep, [])
    echantillonParDep.get(l.dep).push(l)
  }

  console.log('\nVariante terrain — cadastre des comparables')

  for (const [dep, testees] of [...echantillonParDep.entries()].sort()) {
    const debutChargement = Date.now()
    const pool = await ventesDepartement(dep, MILLESIMES)
    chrono.chargement += Date.now() - debutChargement

    const grille = grilleDe(testees)
    const zone = pool.filter((v) => v.kind === 'maison' && aPortee(v, grille, RAYON_COMPARABLES_M))
    const zoneInconnus = zone.filter((v) => !(v.surfaceTerrain > 0))
    const aCombler = zoneInconnus.filter((v) => v.idParcelle)
    const aCouvrir = new Set(aCombler.map((v) => v.commune))

    const contenances = await chargeContenances(
      [...aCouvrir],
      new Set(aCombler.map((v) => v.idParcelle)),
      `  ${dep} — comparables à terrain inconnu`,
    )

    const partagees = parcellesPartagees(pool)
    const poolT = poolComplete(pool, partagees, contenances)

    // Le compte se fait sur la zone — les maisons hors de portée d'une vente
    // testée ne sont pas des comparables, et leur commune n'a pas été
    // téléchargée : les compter gonflerait le « sans contenance » d'un manque
    // qu'on n'a jamais cherché à combler.
    let remplis = 0
    let gardeFou = 0
    let sansContenance = 0

    for (const v of zoneInconnus) {
      const contenance = v.idParcelle ? contenances.get(v.idParcelle) : null
      if (!(contenance > 0)) sansContenance += 1
      else if (partagees.has(v.idParcelle)) gardeFou += 1
      else remplis += 1
    }

    const inconnusAvant = zoneInconnus.length

    terrainStats.set(dep, {
      maisonsZone: zone.length,
      inconnusAvant,
      inconnusApres: inconnusAvant - remplis,
      remplis,
      gardeFou,
      sansContenance,
      communes: aCouvrir.size,
    })

    for (const ligne of testees) {
      const coupe = borneInf(poolT, ligne.date)

      const bien = {
        lat: ligne.lat,
        lon: ligne.lon,
        type: ligne.type,
        surfaceM2: ligne.surface,
        contenance: ligne.terrain,
        etage: null,
        codeInsee: ligne.commune,
        departement: dep,
      }

      const top = Date.now()
      const r = estime({
        bien,
        ventes: poolT.slice(0, coupe),
        maintenant: Date.parse(ligne.date),
      })
      chrono.terrain += Date.now() - top

      ligne.prixTerrain = r.prix
      ligne.pivotTerrain = r.prix
      ligne.ecartTerrain = r.prix ? (100 * (r.prix - ligne.reel)) / ligne.reel : null
      ligne.lowTerrain = r.low
      ligne.highTerrain = r.high
      ligne.dansTerrain = r.prix ? ligne.reel >= r.low && ligne.reel <= r.high : null
      ligne.etapeTerrain = r.etape
      ligne.comparablesTerrain = r.comparables.length
      ligne.comparablesTerrainConnuApres = r.comparables.filter((c) => c.surfaceTerrain > 0).length
    }

    console.log(
      `  ${dep} : ${zone.length} maison(s) dans la zone, ${inconnusAvant} sans terrain → ${inconnusAvant - remplis} après complément` +
        ` (garde-fou : ${gardeFou})`,
    )
  }

  // --- 5. Phase C — variante fourchette, calée sur le groupe calibration de
  //     l'échantillon principal nettoyé.
  const calibration = principal.retenus.filter((l) => l.groupe === 'calibration')
  const validation = principal.retenus.filter((l) => l.groupe === 'validation')
  const facteurs = calibreFourchette(calibration)
  for (const l of echantillon) appliqueFourchette(l, facteurs)

  // --- 6. Écriture.
  await mkdir(opts.sortie, { recursive: true })
  const horodatage = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
  const csv = path.join(opts.sortie, `resultats-${horodatage}.csv`)
  const resume = path.join(opts.sortie, `resume-${horodatage}.md`)

  const toutesLignes = [...mesures.values()].sort((a, b) =>
    a.dep === b.dep ? (a.date < b.date ? -1 : 1) : a.dep < b.dep ? -1 : 1,
  )

  await writeFile(
    csv,
    [
      ENTETES.join(','),
      ...toutesLignes.map((l) =>
        ligneCsv([
          l.id, l.dep, l.commune, l.date, l.type, l.surface, l.terrain, l.groupe,
          l.echantillon.join('+') || 'hors-echantillon',
          oui(l.horsMarche), l.medianeSecteur, l.ventesSecteur,
          l.reel, Math.round(l.prixM2Reel), l.prix, l.ecart?.toFixed(2), l.low, l.high, oui(l.dans),
          l.etape, l.rayon, l.comparables, l.comparablesTerrainConnu, l.confiance,
          l.prixTerrain ?? null, l.ecartTerrain?.toFixed(2), l.lowTerrain ?? null, l.highTerrain ?? null,
          oui(l.dansTerrain), l.etapeTerrain ?? null, l.comparablesTerrain ?? null,
          l.comparablesTerrainConnuApres ?? null,
          l.facteurCal?.toFixed(3), l.lowCal != null ? Math.round(l.lowCal) : null,
          l.highCal != null ? Math.round(l.highCal) : null, oui(l.dansCal),
          l.prixAvant, l.ecartAvant?.toFixed(2), l.lowAvant, l.highAvant, oui(l.dansAvant),
          l.rayonAvant, l.comparablesAvant,
        ]),
      ),
    ].join('\n') + '\n',
  )

  await writeFile(
    resume,
    resumeMarkdown({
      opts,
      principal,
      calibration,
      validation,
      rural,
      depsRuraux,
      terrainStats,
      facteurs,
    }),
  )

  const duree = (Date.now() - depart) / 1000
  console.log(`\nRésultats : ${path.relative(RACINE, csv)}`)
  console.log(`Résumé    : ${path.relative(RACINE, resume)}`)
  console.log(`Durée totale : ${duree.toFixed(0)} s`)
  console.log(`  chargement des pools DVF : ${(chrono.chargement / 1000).toFixed(1)} s`)
  console.log(
    `  cadastre : ${(cadastreMs / 1000).toFixed(1)} s pour ${communesLues.size} commune(s)`,
  )
  console.log(
    `  moteur actuel : ${(chrono.actuel / Math.max(mesurees, 1)).toFixed(0)} ms par vente (${mesurees} mesurées)`,
  )
  console.log(
    `  variante terrain : ${(chrono.terrain / Math.max(echantillon.length, 1)).toFixed(0)} ms par vente (${echantillon.length} estimées)` +
      (avant
        ? ` · moteur ${opts.avant} : ${(chrono.avant / Math.max(echantillon.length, 1)).toFixed(0)} ms par vente`
        : ''),
  )
}

await main()
