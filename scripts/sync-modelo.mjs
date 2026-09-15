// Import du flux XML Modelo Office vers `src/data/properties.json`.
//
//   npm run sync:modelo              -- import réel
//   npm run sync:modelo -- --essai   -- affiche le résultat sans rien écrire
//
// ANNULE ET REMPLACE — le principe de tout ce fichier.
//
// Chaque fichier récupéré décrit l'état *complet* des annonces à diffuser à cet
// instant, et non une liste de changements. Le script ne tient donc aucun
// journal de modifications : il reconstruit `properties.json` intégralement à
// partir du seul flux. Les trois règles demandées en découlent sans aucune
// logique de rapprochement :
//
//   • bien nouveau   → il est dans le fichier produit, donc créé ;
//   • bien existant  → réécrit depuis le flux, donc mis à jour ;
//   • bien disparu   → absent du fichier produit, donc retiré de la diffusion ;
//   • balise disparue → le champ vaut `null`, jamais l'ancienne valeur.
//
// Le rapprochement avec l'état précédent ne sert qu'à *rendre compte* de ce qui
// a changé (voir `rapport`) : il n'influe jamais sur le contenu écrit.
//
// L'identifiant stable est `reference_technique`, jamais la référence
// affichable — cette dernière peut suivre un changement de négociateur.

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseBiens } from './_lib/xml.mjs'
import { mapBien, RETIRER_LES_BIENS_VENDUS } from './_lib/modelo.mjs'

const RACINE = path.resolve(import.meta.dirname, '..')
const SORTIE = path.join(RACINE, 'src', 'data', 'properties.json')
const DELAI_RESEAU_MS = 60_000

const options = process.argv.slice(2)
const aOption = (nom) => options.includes(nom)
const valeurOption = (nom) => {
  const i = options.indexOf(nom)
  return i !== -1 ? options[i + 1] : null
}

const essai = aOption('--essai') || aOption('--dry-run')

/**
 * L'URL du flux vaut jeton d'accès : elle n'a pas sa place dans le dépôt.
 * En local, `.env` (ignoré par git) ; en intégration continue, un secret.
 */
function urlDuFlux() {
  const url = valeurOption('--url') ?? process.env.MODELO_FEED_URL
  if (url) return url

  throw new Error(
    'URL du flux inconnue. Renseignez `MODELO_FEED_URL` (fichier `.env` en local,\n' +
      'secret de dépôt en intégration continue) ou passez `--url <adresse>`.',
  )
}

/** Récupère le flux — depuis le réseau, ou depuis un fichier local avec `--fichier`. */
async function recupererFlux() {
  const fichier = valeurOption('--fichier')
  if (fichier) {
    console.log(`Lecture du flux local ${fichier}`)
    return readFile(path.resolve(fichier), 'utf8')
  }

  const url = urlDuFlux()
  console.log(`Interrogation du flux Modelo…`)

  const reponse = await fetch(url, {
    signal: AbortSignal.timeout(DELAI_RESEAU_MS),
    headers: { Accept: 'application/xml, text/xml' },
  })

  // Une erreur HTTP interrompt l'import. Surtout pas de repli sur un
  // catalogue vide : le site continue d'afficher l'état du dernier import
  // réussi, ce qui vaut infiniment mieux qu'une page « aucun bien ».
  if (!reponse.ok) {
    throw new Error(`le flux a répondu ${reponse.status} ${reponse.statusText}`)
  }

  return reponse.text()
}

/** Lit l'état précédent — absent ou illisible, on repart simplement de zéro. */
async function etatPrecedent() {
  try {
    const contenu = JSON.parse(await readFile(SORTIE, 'utf8'))
    return Array.isArray(contenu) ? contenu : []
  } catch {
    return []
  }
}

/**
 * Compare l'ancien et le nouveau catalogue pour le seul compte rendu.
 * La clé de rapprochement est `referenceTechnique`, avec repli sur
 * `reference` — les biens fictifs du démonstrateur n'ont que cette dernière.
 */
function rapport(avant, apres) {
  const cle = (bien) => bien.referenceTechnique ?? bien.reference
  const anciennes = new Set(avant.map(cle))
  const nouvelles = new Set(apres.map(cle))

  return {
    crees: apres.filter((bien) => !anciennes.has(cle(bien))),
    maintenus: apres.filter((bien) => anciennes.has(cle(bien))),
    retires: avant.filter((bien) => !nouvelles.has(cle(bien))),
  }
}

async function main() {
  const xml = await recupererFlux()
  const noeuds = parseBiens(xml)
  console.log(`${noeuds.length} bien(s) dans le flux.`)

  const biens = []
  const vus = new Map()

  for (const noeud of noeuds) {
    const bien = mapBien(noeud)

    // Sans référence affichable, aucune URL `/bien/:reference` n'est
    // possible : le bien est signalé et écarté plutôt que publié cassé.
    if (!bien.reference) {
      console.warn(`  ! bien sans référence affichable (technique : ${bien.referenceTechnique ?? '—'}) — ignoré`)
      continue
    }

    // Deux biens sous la même référence se masqueraient l'un l'autre dans les
    // URLs. On garde le premier et on signale : c'est une anomalie de saisie
    // côté agence, à corriger dans Modelo.
    const precedent = vus.get(bien.reference)
    if (precedent) {
      console.warn(
        `  ! référence « ${bien.reference} » présente deux fois ` +
          `(${precedent} et ${bien.referenceTechnique}) — le second est ignoré`,
      )
      continue
    }
    vus.set(bien.reference, bien.referenceTechnique)

    if (RETIRER_LES_BIENS_VENDUS && bien.statut === 'vendu') {
      console.log(`  – ${bien.reference} — vendu/loué (état 3), retiré de la diffusion`)
      continue
    }

    biens.push(bien)
  }

  // Un flux vide est ambigu : soit l'agence n'a plus rien à diffuser, soit
  // Modelo a servi une réponse dégradée. Le second cas viderait le site sans
  // le moindre signal, alors on exige que le premier soit déclaré.
  if (biens.length === 0 && !aOption('--autoriser-flux-vide')) {
    throw new Error(
      'le flux ne contient aucun bien diffusable — import interrompu, le catalogue actuel est conservé.\n' +
        'Si l’agence n’a réellement plus aucune annonce, relancez avec `--autoriser-flux-vide`.',
    )
  }

  const avant = await etatPrecedent()
  const { crees, maintenus, retires } = rapport(avant, biens)

  console.log(
    `\nAnnule et remplace — ${crees.length} créé(s), ${maintenus.length} mis à jour, ` +
      `${retires.length} retiré(s) de la diffusion.`,
  )
  for (const bien of crees) console.log(`  + ${bien.reference} — ${bien.titre}`)
  for (const bien of retires) console.log(`  – ${bien.reference} — ${bien.titre}`)

  if (essai) {
    console.log('\n--essai : aucun fichier écrit.')
    return
  }

  await writeFile(SORTIE, `${JSON.stringify(biens, null, 2)}\n`, 'utf8')
  console.log(`\n${path.relative(RACINE, SORTIE)} réécrit — ${biens.length} bien(s) diffusé(s).`)
}

try {
  await main()
} catch (error) {
  console.error(`\nImport Modelo interrompu : ${error?.message ?? error}`)
  console.error('Le catalogue en place n’a pas été modifié.')
  process.exit(1)
}
