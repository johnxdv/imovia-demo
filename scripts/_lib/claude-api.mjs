// Appels à l'API Claude, et comptabilité du coût réel de chaque appel.
//
// Un seul module pour les deux : le coût ne se déduit pas d'une estimation
// faite à l'avance, il se lit dans le champ `usage` que l'API renvoie avec
// chaque réponse. Le compteur ci-dessous ne fait qu'additionner ce qui a
// vraiment été consommé, poste par poste, pour qu'on puisse décider en
// connaissance de cause combien d'articles par mois sont soutenables.
//
// TARIFS — relevés le 24 septembre 2026 sur
// https://platform.claude.com/docs/en/about-claude/pricing
//
// Ils sont écrits en dur, et c'est volontaire : un coût doit être reproductible
// et vérifiable après coup. Si le prix change, cette table se met à jour d'une
// ligne, et les coûts déjà enregistrés restent lisibles pour ce qu'ils étaient.

import Anthropic from '@anthropic-ai/sdk'

/** Modèle retenu. Opus 5 est le modèle par défaut de l'API Claude. */
export const MODELE = 'claude-opus-5'

/** Dollars par million de jetons, par modèle. */
const TARIFS = {
  'claude-opus-5': {
    entree: 5.0,
    sortie: 25.0,
    ecritureCache5min: 6.25,
    lectureCache: 0.5,
  },
}

/** Dollars par recherche web. Facturée 10 $ les 1 000 recherches. */
const PRIX_RECHERCHE_WEB = 10 / 1000

/**
 * Outil de recherche web, côté serveur Anthropic.
 *
 * `max_uses` est le seul garde-fou de coût direct du système : chaque
 * recherche est facturée, et sans plafond un modèle curieux peut en enchaîner
 * une dizaine. Six suffisent à faire le tour de ce qui se publie sur un marché
 * local — c'est la borne, pas un objectif : le modèle en utilise souvent moins.
 */
export const OUTIL_RECHERCHE_WEB = { type: 'web_search_20260209', name: 'web_search', max_uses: 6 }

/**
 * Compteur de consommation.
 *
 * Accumule les `usage` de tous les appels d'un même article et les restitue
 * ventilés. Chaque appel est conservé séparément (`postes`) : le prompt demande
 * le détail poste par poste, et une somme globale ne dirait pas si c'est la
 * recherche ou la rédaction qui coûte.
 */
export class Compteur {
  constructor(modele = MODELE) {
    this.modele = modele
    this.postes = []
  }

  /** Enregistre l'`usage` d'une réponse sous un nom d'étape. */
  ajoute(etape, usage) {
    const u = usage ?? {}
    this.postes.push({
      etape,
      jetonsEntree: u.input_tokens ?? 0,
      jetonsSortie: u.output_tokens ?? 0,
      ecritureCache: u.cache_creation_input_tokens ?? 0,
      lectureCache: u.cache_read_input_tokens ?? 0,
      recherchesWeb: u.server_tool_use?.web_search_requests ?? 0,
    })
    return this
  }

  /** Coût d'un poste, en dollars, ligne par ligne. */
  coutPoste(poste) {
    const t = TARIFS[this.modele]
    if (!t) throw new Error(`Compteur : aucun tarif connu pour « ${this.modele} ».`)

    const lignes = {
      entree: (poste.jetonsEntree * t.entree) / 1e6,
      sortie: (poste.jetonsSortie * t.sortie) / 1e6,
      ecritureCache: (poste.ecritureCache * t.ecritureCache5min) / 1e6,
      lectureCache: (poste.lectureCache * t.lectureCache) / 1e6,
      recherchesWeb: poste.recherchesWeb * PRIX_RECHERCHE_WEB,
    }

    return { lignes, total: Object.values(lignes).reduce((a, b) => a + b, 0) }
  }

  /** Relevé complet : chaque poste détaillé, puis le total. */
  releve() {
    const postes = this.postes.map((poste) => ({ ...poste, cout: this.coutPoste(poste) }))
    const total = postes.reduce((somme, p) => somme + p.cout.total, 0)

    return {
      modele: this.modele,
      tarifs: { ...TARIFS[this.modele], rechercheWeb: PRIX_RECHERCHE_WEB },
      postes,
      totaux: {
        jetonsEntree: postes.reduce((s, p) => s + p.jetonsEntree, 0),
        jetonsSortie: postes.reduce((s, p) => s + p.jetonsSortie, 0),
        recherchesWeb: postes.reduce((s, p) => s + p.recherchesWeb, 0),
        coutUsd: total,
      },
    }
  }
}

/** Client partagé. Construit sans clé explicite : le SDK lit l'environnement. */
export function client() {
  const cle = process.env.ANTHROPIC_API_KEY

  if (!cle && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new Error(
      'ANTHROPIC_API_KEY absente. En local, ajoutez-la à `.env` ; en intégration ' +
        'continue, déclarez-la en secret de dépôt.',
    )
  }

  // Contrôle de forme avant le premier appel.
  //
  // Écrit après s'être fait prendre : `.env` contenait `[SENSITIVE]`, un
  // marqueur de onze caractères laissé par un outil de masquage à la place de
  // la clé. Le script partait, faisait sa première requête, et rendait
  // « clé refusée » — message exact, mais qui envoie chercher une clé
  // révoquée alors que le problème est qu'il n'y en a jamais eu.
  //
  // Le contrôle ne vaut que pour `ANTHROPIC_API_KEY` : `ANTHROPIC_AUTH_TOKEN`
  // sert aux passerelles et jetons temporaires, dont la forme ne nous regarde
  // pas.
  if (cle && !/^sk-ant-\S{20,}$/.test(cle)) {
    throw new Error(
      `ANTHROPIC_API_KEY ne ressemble pas à une clé Anthropic (${cle.length} caractères, ` +
        'attendu : « sk-ant-… » sur une centaine). Valeur d’exemple ou marqueur de ' +
        'masquage laissé dans `.env` ? Aucune requête n’a été envoyée.',
    )
  }

  return new Anthropic()
}

/**
 * Un appel, jusqu'à sa vraie fin.
 *
 * Deux détails que l'appelant ne doit pas avoir à connaître :
 *
 * 1. **`pause_turn`.** Avec un outil côté serveur, l'API déroule sa propre
 *    boucle et s'arrête au bout de dix itérations en demandant une relance. On
 *    renvoie alors la conversation telle quelle — sans y ajouter le moindre
 *    « continue », que l'API n'attend pas et qui fausserait la suite.
 *
 * 2. **La consommation des relances.** Chaque tour a son propre `usage` ; ne
 *    compter que le dernier sous-estimerait la facture, recherches comprises.
 *    Tous sont versés au compteur sous le même nom d'étape.
 */
export async function appel(anthropic, compteur, etape, requete, { relancesMax = 4, tours = null } = {}) {
  const messages = [...requete.messages]
  let reponse = null

  for (let tour = 0; tour <= relancesMax; tour += 1) {
    try {
      reponse = await anthropic.messages.create({
        model: MODELE,
        max_tokens: 16000,
        ...requete,
        messages,
      })
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        throw new Error('Clé API refusée par Anthropic — vérifiez ANTHROPIC_API_KEY.')
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new Error('Limite de débit atteinte côté Anthropic — réessayez plus tard.')
      }
      if (error instanceof Anthropic.APIError) {
        throw new Error(`API Claude, erreur ${error.status} — ${error.message}`)
      }
      throw error
    }

    compteur.ajoute(etape, reponse.usage)

    // Chaque tour est conservé si l'appelant le demande. Sans cela, les
    // résultats de recherche des tours intermédiaires — ceux qui précèdent un
    // `pause_turn` — seraient perdus, et avec eux la liste des adresses que
    // l'outil a réellement consultées (voir `urlsDeRecherche`).
    tours?.push(reponse)

    // Les classificateurs de sûreté peuvent décliner : c'est un HTTP 200, et
    // `content` ne porte alors rien d'exploitable. Le dire franchement plutôt
    // que de laisser l'étape suivante échouer sur un champ vide.
    if (reponse.stop_reason === 'refusal') {
      const detail = reponse.stop_details?.explanation ?? 'sans explication'
      throw new Error(`Requête déclinée par le modèle à l'étape « ${etape} » — ${detail}.`)
    }

    if (reponse.stop_reason !== 'pause_turn') return reponse

    messages.push({ role: 'assistant', content: reponse.content })
  }

  throw new Error(
    `Étape « ${etape} » : ${relancesMax} relances sans aboutir. La recherche web tourne en rond.`,
  )
}

/** Texte concaténé d'une réponse — les blocs d'outil et de réflexion écartés. */
export function texte(reponse) {
  return reponse.content
    .filter((bloc) => bloc.type === 'text')
    .map((bloc) => bloc.text)
    .join('\n')
    .trim()
}

/**
 * JSON extrait d'une réponse en texte libre.
 *
 * La rédaction passe par les sorties structurées, qui garantissent la forme.
 * La recherche, elle, ne le peut pas : elle emploie l'outil de recherche web,
 * dont les résultats arrivent avec leurs citations, et les deux ne cohabitent
 * pas dans une même requête. Le modèle rend donc un bloc JSON dans sa réponse,
 * et c'est ici qu'on le récupère — dernier bloc clôturé, pour ignorer un
 * éventuel exemple cité en chemin.
 */
export function jsonDuTexte(brut) {
  const blocs = [...brut.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1].trim())
  const candidats = blocs.length > 0 ? blocs.reverse() : [brut]

  for (const candidat of candidats) {
    try {
      return JSON.parse(candidat)
    } catch {
      // Candidat suivant.
    }
  }

  throw new Error(`Réponse illisible : aucun JSON valide trouvé.\n---\n${brut.slice(0, 600)}`)
}

/**
 * Adresses que l'outil de recherche a RÉELLEMENT consultées.
 *
 * Sert de liste blanche pour vérifier les sources qu'un article cite. Un
 * modèle à qui l'on demande une statistique sourcée peut produire une
 * référence parfaitement plausible et entièrement fausse — « Chambre des
 * notaires de la Moselle, mars 2026 » avec une adresse qui n'a jamais existé.
 * Ce n'est pas un défaut exotique, c'est le mode d'échec le plus courant de
 * l'exercice, et il est invisible à la relecture : la citation a l'air juste.
 *
 * La parade est mécanique : une source qui ne figure pas dans les résultats
 * rendus par l'outil n'a pas été consultée, et ne peut donc pas être citée.
 *
 * Deux endroits à balayer, parce que l'API les remplit différemment :
 * les blocs de résultats de recherche, et les citations attachées aux blocs de
 * texte. Sur erreur de recherche, `content` est un objet et non une liste —
 * d'où le contrôle avant parcours.
 */
export function urlsDeRecherche(tours) {
  const urls = new Set()

  for (const reponse of tours ?? []) {
    for (const bloc of reponse?.content ?? []) {
      if (bloc.type === 'web_search_tool_result' && Array.isArray(bloc.content)) {
        for (const resultat of bloc.content) {
          if (resultat?.url) urls.add(resultat.url)
        }
      }

      if (bloc.type === 'text' && Array.isArray(bloc.citations)) {
        for (const citation of bloc.citations) {
          if (citation?.url) urls.add(citation.url)
        }
      }
    }
  }

  return urls
}

/**
 * Deux adresses désignent-elles la même page ?
 *
 * Comparaison sur l'hôte et le chemin seuls : l'API rend souvent une adresse
 * de redirection ou traînant des paramètres de suivi, et exiger l'égalité
 * stricte rejetterait des sources parfaitement consultées. Le sous-domaine
 * `www.` est neutralisé pour la même raison.
 */
function memePage(a, b) {
  try {
    const u1 = new URL(a)
    const u2 = new URL(b)
    const hote = (u) => u.hostname.replace(/^www\./, '').toLowerCase()
    const chemin = (u) => u.pathname.replace(/\/$/, '').toLowerCase()
    return hote(u1) === hote(u2) && chemin(u1) === chemin(u2)
  } catch {
    return false
  }
}

/**
 * Écarte les statistiques dont l'adresse n'a pas été consultée.
 *
 * Rend les retenues et les écartées séparément : les secondes doivent
 * apparaître au journal, parce qu'une source fabriquée en dit long sur la
 * qualité de la recherche de ce passage.
 */
export function verifieSources(statistiques, urlsConsultees) {
  const retenues = []
  const ecartees = []

  for (const stat of statistiques ?? []) {
    const url = stat?.url
    const vue = url && [...urlsConsultees].some((consultee) => memePage(url, consultee))
    ;(vue ? retenues : ecartees).push(stat)
  }

  return { retenues, ecartees }
}
