// Ouverture d'un ticket GitHub depuis un script de passage.
//
// POURQUOI LE SCRIPT L'OUVRE LUI-MÊME
//
// Le workflow sait déjà signaler un passage EN ÉCHEC (voir
// `.github/workflows/blog-article.yml`). Mais un contrôle SEO qui ne passe pas
// n'est pas un échec : l'article est bon, il est publié, il lui manque une
// phrase. Le passage réussit, le workflow ne voit rien, et sans ce module
// personne n'apprendrait jamais que trois articles de suite sont sortis sans
// leur question de FAQ.
//
// `gh` est préinstallé sur les exécuteurs GitHub et s'authentifie avec
// `GH_TOKEN`. En local il manque le plus souvent, et c'est très bien : le détail
// s'imprime alors dans la console, où quelqu'un le lit déjà.

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileP = promisify(execFile)

/** `gh` est-il utilisable ici — présent ET authentifié ? */
async function disponible() {
  if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) return false
  try {
    await execFileP('gh', ['--version'])
    return true
  } catch {
    return false
  }
}

/**
 * Ouvre un ticket, ou commente celui qui porte déjà ce titre.
 *
 * UN SEUL TICKET PAR SUJET, et c'est la règle que suit déjà l'alerte d'échec du
 * workflow : six passages par mois qui ouvriraient chacun leur ticket
 * enterreraient le premier sous les suivants. Le fil unique garde l'historique
 * au même endroit, et c'est l'historique qui dit si le défaut est ponctuel ou
 * s'il s'installe.
 *
 * Ne lève jamais. Un ticket qu'on n'a pas pu ouvrir ne doit pas faire échouer un
 * article déjà écrit et payé : la raison est renvoyée, et l'appelant la
 * journalise.
 */
export async function ouvreTicket({ titre, corps, etiquette = null }) {
  if (!(await disponible())) {
    return { ouvert: false, raison: 'gh indisponible ou non authentifié' }
  }

  const jeton = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN
  const env = { ...process.env, GH_TOKEN: jeton }

  try {
    const { stdout } = await execFileP(
      'gh',
      ['issue', 'list', '--state', 'open', '--search', `${titre} in:title`, '--json', 'number', '--jq', '.[0].number'],
      { env },
    )
    const ouvert = stdout.trim()

    if (ouvert) {
      await execFileP('gh', ['issue', 'comment', ouvert, '--body', corps], { env })
      return { ouvert: true, numero: Number(ouvert), commente: true }
    }

    const creation = ['issue', 'create', '--title', titre, '--body', corps]
    try {
      // L'étiquette n'existe pas forcément dans le dépôt, et `gh` refuse tout le
      // ticket pour ça. On réessaie sans : un ticket sans étiquette vaut mieux
      // qu'une alerte perdue.
      const { stdout: url } = await execFileP(
        'gh',
        etiquette ? [...creation, '--label', etiquette] : creation,
        { env },
      )
      return { ouvert: true, url: url.trim() }
    } catch {
      const { stdout: url } = await execFileP('gh', creation, { env })
      return { ouvert: true, url: url.trim() }
    }
  } catch (error) {
    return { ouvert: false, raison: error?.message ?? String(error) }
  }
}
