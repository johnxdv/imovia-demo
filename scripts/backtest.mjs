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
//     moteur qui n'existe nulle part.
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
// CE QUE LE BANC NE MESURE PAS. Les départements voisins ne sont pas chargés :
// le moteur travaille sur le seul département de la vente. Un bien à 500 m
// d'une limite départementale y est donc un peu moins bien servi qu'en
// production — pour les deux moteurs comparés, de la même façon.
//
// USAGE
//   node scripts/backtest.mjs --n 15              essai de fonctionnement
//   node scripts/backtest.mjs --n 3000            mesure
//   node scripts/backtest.mjs --n 500 --deps 13,69
//
// OPTIONS
//   --n <nombre>      ventes tirées (défaut 200)
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
import { estime } from '../api/_lib/moteur.js'
import { coefficientEtage } from '../src/lib/etage.js'

const RACINE = path.resolve(import.meta.dirname, '..')
const CACHE = path.join(RACINE, 'cache')

/** Départements de test : métropoles denses, villes moyennes, et deux ruraux. */
const DEPARTEMENTS = ['13', '06', '69', '33', '44', '59', '31', '75', '23', '58']

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
 * relevés de tailles différentes ne seraient plus comparables.
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
 * Contenances cadastrales des communes demandées, par identifiant de parcelle.
 *
 * Source : le cadastre Etalab, un fichier par commune — quelques centaines de
 * kilo-octets, là où le fichier départemental en pèse cent cinquante méga. Seule
 * la contenance est retenue ; la géométrie est jetée à la lecture, ligne par
 * ligne, pour n'avoir jamais à tenir le fichier entier en mémoire.
 */
async function contenances(communes, journalise) {
  const table = new Map()
  let faites = 0

  // Par lots : trois mille ventes touchent plus d'un millier de communes, et
  // les prendre une par une ferait passer le banc plus de temps à attendre le
  // réseau qu'à estimer. Six de front restent courtois pour un serveur
  // d'open data, et divisent l'attente d'autant.
  const prepare = async (insee) => {
    const index = path.join(CACHE, 'cadastre', `${insee}.json`)

    if (!existsSync(index)) {
      const brut = path.join(CACHE, 'cadastre', `${insee}-parcelles.json.gz`)
      try {
        await telecharge(
          `${BASE_CADASTRE}/${insee.slice(0, 2)}/${insee}/cadastre-${insee}-parcelles.json.gz`,
          brut,
        )
      } catch {
        // Commune sans fichier publié : les biens concernés seront estimés sans
        // contenance, comme lorsque le cadastre ne répond pas en production.
        await mkdir(path.dirname(index), { recursive: true })
        await writeFile(index, '{}')
        faites += 1
        journalise(faites, communes.length, insee)
        return
      }

      const extrait = {}
      for (const ligne of gunzipSync(await readFile(brut)).toString('utf8').split('\n')) {
        const debut = ligne.indexOf('{')
        if (debut < 0) continue
        try {
          const f = JSON.parse(ligne.slice(debut).replace(/,\s*$/, ''))
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
      // de kilo. Sur les sept cents communes d'un tirage de trois mille ventes,
      // les garder coûterait un gigaoctet et demi de disque pour rien.
      await rm(brut, { force: true })
    }

    for (const [id, c] of Object.entries(JSON.parse(await readFile(index, 'utf8')))) {
      table.set(id, c)
    }

    faites += 1
    journalise(faites, communes.length, insee)
  }

  for (let i = 0; i < communes.length; i += CADASTRE_CONCURRENCE) {
    await Promise.all(communes.slice(i, i + CADASTRE_CONCURRENCE).map(prepare))
  }

  return table
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

// ------------------------------------------------------------------ mesure

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
  'prix_reel',
  'prix_estime',
  'ecart_pct',
  'low',
  'high',
  'dans_fourchette',
  'etape',
  'rayon_m',
  'comparables',
  'confiance',
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

/** Les indicateurs demandés, sur un sous-ensemble de lignes. */
function indicateurs(lignes, prefixe) {
  const ecarts = lignes.map((l) => l[`ecart${prefixe}`]).filter((e) => e != null)
  const absolus = ecarts.map(Math.abs)
  const dans = lignes.map((l) => l[`dans${prefixe}`]).filter((d) => d != null)

  return {
    n: ecarts.length,
    medianeAbs: mediane(absolus),
    pct10: part(absolus, (e) => e <= 10),
    pct20: part(absolus, (e) => e <= 20),
    p90: centile(absolus, 0.9),
    biais: mediane(ecarts),
    fourchette: part(dans, (d) => d),
  }
}

function tableau(titre, groupes) {
  const lignes = [
    `**${titre}**`,
    '',
    '| Groupe | Moteur | n | Err. abs. médiane | ±10 % | ±20 % | 90e centile | Biais | Dans fourchette |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ]

  for (const [nom, sous] of groupes) {
    for (const [moteur, prefixe] of [['actuel', ''], ['avant', 'Avant']]) {
      const i = indicateurs(sous, prefixe)
      if (i.n === 0) continue
      lignes.push(
        `| ${nom} | ${moteur} | ${i.n} | ${nb(i.medianeAbs)} % | ${nb(i.pct10)} % | ${nb(i.pct20)} % | ${nb(i.p90)} % | ${nb(i.biais)} % | ${nb(i.fourchette)} % |`,
      )
    }
  }

  return lignes.join('\n')
}

const parCle = (lignes, cle) => {
  const table = new Map()
  for (const l of lignes) {
    const k = String(l[cle] ?? '—')
    if (!table.has(k)) table.set(k, [])
    table.get(k).push(l)
  }
  return [...table.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
}

const tranche = (surface) =>
  surface < 60 ? '< 60 m²' : surface < 100 ? '60–100 m²' : surface < 150 ? '100–150 m²' : '≥ 150 m²'

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
  attendu: { prix: 527000, low: 489000, high: 580000, comparables: 8, etape: 'cascade-normale' },
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

// --------------------------------------------------------------------- main

async function main() {
  const opts = options(process.argv.slice(2))
  const depart = Date.now()

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
  const echantillon = candidates.slice(0, opts.n)

  if (echantillon.length === 0) {
    console.error('Aucune vente candidate — vérifier les départements demandés.')
    process.exit(1)
  }

  // --- 2. Contenances cadastrales des seules communes tirées.
  const communes = [...new Set(echantillon.map((v) => v.commune))].sort()
  process.stdout.write(`Cadastre : ${communes.length} commune(s)…\n`)
  const table = await contenances(communes, (fait, total, insee) => {
    process.stdout.write(`\r  ${fait}/${total} — ${insee}   `)
  })
  process.stdout.write('\n')

  // --- 3. Moteur de comparaison.
  const avant = opts.avant && opts.avant !== 'non' ? await moteurAvant(opts.avant) : null
  if (avant) console.log(`Moteur de comparaison : ${opts.avant}`)

  // --- 4. Mesure, département par département — un seul jeu de ventes en
  //     mémoire à la fois.
  const lignes = []
  const parDep = parCle(echantillon, 'dep')
  let faites = 0
  const debutMesure = Date.now()

  // Deux chronomètres, parce que les deux coûts ne se comportent pas de la même
  // façon : charger un département se paie une fois pour toutes ses ventes,
  // le moteur se paie à chaque vente. Les confondre rendrait toute
  // extrapolation fausse — c'est précisément ce qu'on veut annoncer avant de
  // lancer trois mille ventes.
  let msChargement = 0
  let msApres = 0
  let msAvant = 0

  for (const [dep, ventesDuDep] of parDep) {
    const debutChargement = Date.now()
    const pool = await ventesDepartement(dep, MILLESIMES)
    const annuel = parAnnee(pool)
    msChargement += Date.now() - debutChargement

    for (const vente of ventesDuDep.sort((a, b) => (a.date < b.date ? -1 : 1))) {
      const coupe = borneInf(pool, vente.date)
      const anterieures = pool.slice(0, coupe)

      const contenance = table.get(vente.idParcelle) ?? null
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
      msApres += Date.now() - topApres

      let estimeAvant = null
      if (avant) {
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

        msAvant += Date.now() - topAvant
      }

      const reel = vente.price
      const ecart = apres.prix ? (100 * (apres.prix - reel)) / reel : null
      const ecartAvant = estimeAvant ? (100 * (estimeAvant.prix - reel)) / reel : null

      lignes.push({
        id: vente.id,
        dep,
        commune: vente.commune,
        date: vente.date,
        type: vente.kind,
        surface: vente.surface,
        terrain: contenance,
        groupe: rang(opts.graine, `groupe|${vente.id}`) < PART_CALIBRATION ? 'calibration' : 'validation',
        reel,
        prix: apres.prix,
        ecart,
        low: apres.low,
        high: apres.high,
        dans: apres.prix ? reel >= apres.low && reel <= apres.high : null,
        etape: apres.etape,
        rayon: apres.rayonAtteintM,
        comparables: apres.comparables.length,
        confiance: apres.confiance,
        tranche: tranche(vente.surface),
        prixAvant: estimeAvant?.prix ?? null,
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
          prixM2: Math.round(c.prixM2Actualise),
        })),
      })

      faites += 1
      const ecoule = (Date.now() - debutMesure) / 1000
      const reste = (ecoule / faites) * (echantillon.length - faites)
      process.stdout.write(
        `\r  ${faites}/${echantillon.length} ventes — ${ecoule.toFixed(0)} s écoulées, ~${reste.toFixed(0)} s restantes   `,
      )
    }
  }

  process.stdout.write('\n')

  // --- 5. Écriture.
  await mkdir(opts.sortie, { recursive: true })
  const horodatage = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
  const csv = path.join(opts.sortie, `resultats-${horodatage}.csv`)
  const resume = path.join(opts.sortie, `resume-${horodatage}.md`)

  await writeFile(
    csv,
    [
      ENTETES.join(','),
      ...lignes.map((l) =>
        ligneCsv([
          l.id, l.dep, l.commune, l.date, l.type, l.surface, l.terrain, l.groupe,
          l.reel, l.prix, l.ecart?.toFixed(2), l.low, l.high, l.dans == null ? '' : l.dans ? 'oui' : 'non',
          l.etape, l.rayon, l.comparables, l.confiance,
          l.prixAvant, l.ecartAvant?.toFixed(2), l.lowAvant, l.highAvant,
          l.dansAvant == null ? '' : l.dansAvant ? 'oui' : 'non',
          l.rayonAvant, l.comparablesAvant,
        ]),
      ),
    ].join('\n') + '\n',
  )

  const calibration = lignes.filter((l) => l.groupe === 'calibration')
  const validation = lignes.filter((l) => l.groupe === 'validation')
  const pires = [...lignes]
    .filter((l) => l.ecart != null)
    .sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart))
    .slice(0, 20)

  const sections = [
    `# Banc de test — ${lignes.length} ventes`,
    '',
    `Départements ${opts.deps.join(', ')} · graine ${opts.graine} · moteur de comparaison \`${opts.avant}\``,
    `Écart = (estimé − réel) / réel. « Biais » est la médiane signée de cet écart.`,
    '',
    tableau('Ensemble', [
      ['calibration', calibration],
      ['validation', validation],
      ['tout', lignes],
    ]),
    '',
    tableau('Par département (validation)', parCle(validation, 'dep')),
    '',
    tableau('Par type (validation)', parCle(validation, 'type')),
    '',
    tableau('Par étape (validation)', parCle(validation, 'etape')),
    '',
    tableau('Par tranche de surface (validation)', parCle(validation, 'tranche')),
    '',
    tableau('Par confiance (validation)', parCle(validation, 'confiance')),
    '',
    '## Les 20 pires écarts',
    '',
  ]

  for (const l of pires) {
    sections.push(
      `**${l.ecart > 0 ? '+' : ''}${l.ecart.toFixed(0)} %** — ${l.type} ${l.surface} m²` +
        `${l.terrain ? `, terrain ${l.terrain} m²` : ''}, ${l.commune}, ${l.date} · ` +
        `réel ${l.reel.toLocaleString('fr-FR')} € · estimé ${l.prix.toLocaleString('fr-FR')} € ` +
        `(${l.etape}, ${l.comparables} comparables, confiance ${l.confiance})`,
    )
    sections.push('')
    for (const c of l.detail) {
      sections.push(
        `  - ${c.distanceM} m · ${c.surface} m² · ${c.date} · ${c.prixM2.toLocaleString('fr-FR')} €/m² · ${c.adresse}`,
      )
    }
    sections.push('')
  }

  await writeFile(resume, sections.join('\n'))

  const total = (Date.now() - depart) / 1000
  console.log(`\nRésultats : ${path.relative(RACINE, csv)}`)
  console.log(`Résumé    : ${path.relative(RACINE, resume)}`)
  console.log(`Durée totale : ${total.toFixed(0)} s`)
  console.log(
    `  chargement des ${parDep.length} département(s) : ${(msChargement / 1000).toFixed(1)} s ` +
      `(payé une fois, quel que soit le nombre de ventes)`,
  )
  console.log(
    `  moteur actuel : ${(msApres / lignes.length).toFixed(0)} ms par vente` +
      (avant ? ` · moteur ${opts.avant} : ${(msAvant / lignes.length).toFixed(0)} ms par vente` : ''),
  )
}

await main()
