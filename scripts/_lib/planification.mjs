// Génération autonome du plan éditorial.
//
// Le système décide seul de ses douze prochains sujets, à partir de ce qu'il
// sait du secteur (`scripts/_data/communes-secteur.json`) et de ce qu'il a déjà
// publié (`src/data/journal.json`). Aucune validation humaine.
//
// UN SEUL APPEL, SANS RECHERCHE WEB
//
// Toute la matière est interne : 111 communes avec population, distance et prix
// relevé, les quartiers de Forbach, le journal. Une recherche web ici ne
// rapporterait rien que le modèle ne puisse déduire, et c'est elle qui pesait
// 79 % de la facture de l'ancienne étape 1.
//
// CE QUE LE MODÈLE NE PEUT PAS SAVOIR, ET QU'ON NE LUI FAIT PAS SEMBLANT DE
// DONNER : les volumes de recherche réels. Aucun outil de mots-clés n'est
// branché sur ce projet. Le classement des communes se fait donc sur la
// population, la distance et la façon dont les gens formulent réellement une
// recherche immobilière. C'est un classement informé, pas une mesure, et le
// prompt le dit au modèle plutôt que de le laisser inventer des volumes.
//
// LES GARDE-FOUS SONT MÉCANIQUES, PAS DÉCLARATIFS
//
// La première version de ce blog laissait le modèle juger lui-même de la
// variété de ses sujets. Résultat : six articles qui ne se répètent jamais mot
// pour mot et qui parlent tous de prix, avec un graphique chacun. Demander à un
// modèle de définir la catégorie ET de s'y tenir est circulaire — il lui suffit
// de renommer.
//
// Deux règles portent donc sur des propriétés VÉRIFIABLES, appliquées après la
// réponse et non espérées d'elle :
//
//   1. La clé (commune, mot-clé) ne peut pas resservir. Le mot-clé est une
//      chaîne concrète ; deux articles visant la même requête portent forcément
//      le même.
//   2. Au plus `PLAFOND_DONNEES` sujets sur douze déclarent avoir besoin des
//      relevés de prix, et eux seuls auront droit à un graphique. C'est le vrai
//      verrou contre le retour du mur de statistiques.
//
// La règle de genre — jamais deux articles de même genre à la suite — reste,
// mais en appui : elle est appliquée par RÉORDONNANCEMENT, pas par rejet, parce
// qu'un bon sujet mal placé dans la file ne mérite pas d'être jeté.

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { appel, jsonDuTexte, texte } from './claude-api.mjs'
import { PLAFOND_DONNEES, TAILLE_PLAN, cle, clesTraitees } from './plan.mjs'

const RACINE = path.resolve(import.meta.dirname, '..', '..')
const FICHIER_SECTEUR = path.join(RACINE, 'scripts', '_data', 'communes-secteur.json')

/** Les 111 communes du secteur, telles que versionnées dans le dépôt. */
export const lireSecteur = async () => JSON.parse(await readFile(FICHIER_SECTEUR, 'utf8'))

const SCHEMA_PLAN = {
  type: 'object',
  additionalProperties: false,
  required: ['sujets'],
  properties: {
    sujets: {
      type: 'array',
      description: `${TAILLE_PLAN} sujets, dans l’ordre de publication.`,
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'titre',
          'motCle',
          'commune',
          'codeInsee',
          'angle',
          'genre',
          'intention',
          'besoinDonneesPrix',
          'besoinRecherche',
        ],
        properties: {
          titre: { type: 'string', description: 'Titre de l’article, tel qu’il sera publié.' },
          motCle: {
            type: 'string',
            description:
              'LA requête visée, telle qu’un habitant la taperait — « vendre maison Forbach », « prix m2 Sarreguemines ». Courte, concrète, sans marque. C’est elle qui distingue deux articles d’une même commune : deux sujets ne peuvent jamais porter le même couple (commune, mot-clé).',
          },
          commune: { type: ['string', 'null'], description: 'Commune visée, ou null si l’article n’en cible aucune.' },
          codeInsee: { type: ['string', 'null'], description: 'Code INSEE de la commune, repris de la liste fournie.' },
          angle: { type: 'string', description: 'L’angle traité, en une phrase. Ce qui distingue cet article des autres sur la même commune.' },
          genre: {
            type: 'string',
            description:
              'Le genre d’article, dans tes mots — « guide pratique », « portrait de commune », « analyse de marché », « conseil d’achat »… Deux articles de même genre ne se suivent jamais.',
          },
          intention: { type: 'string', description: 'L’intention de recherche à laquelle l’article répond.' },
          besoinDonneesPrix: {
            type: 'boolean',
            description:
              'L’article repose-t-il sur les relevés de prix du site ? AU PLUS TROIS SUJETS SUR DOUZE peuvent le déclarer, et eux seuls porteront un graphique.',
          },
          besoinRecherche: {
            type: 'boolean',
            description:
              'L’article avance-t-il des faits locaux à vérifier — écoles, lignes de bus, montants d’aides, équipements ? Si oui, une recherche web sourcera ces faits à la rédaction. Un guide pratique ou un article de conseil n’en a pas besoin.',
          },
        },
      },
    },
  },
}

/** Résumé du secteur, compact, pour le contexte du modèle. */
function resumeSecteur(communes) {
  const ligne = (c) =>
    [
      c.nom,
      `${c.population} hab`,
      `${c.distanceKm} km`,
      c.prixMaison ? `${c.prixMaison} €/m²` : 'pas de prix relevé',
      c.quartiers ? `${c.quartiers.length} quartiers relevés : ${c.quartiers.map((q) => q.nom).join(', ')}` : null,
    ]
      .filter(Boolean)
      .join(' · ')

  return communes
    .slice()
    .sort((a, b) => b.population - a.population)
    .map((c) => `${c.codeInsee} | ${ligne(c)}`)
    .join('\n')
}

/**
 * Applique les règles mécaniques à ce que le modèle a rendu.
 *
 * Écarte plutôt que de corriger, sauf pour l'ordre : un sujet en double ou un
 * quatrième article à données ne se rattrapent pas, alors qu'une file mal
 * ordonnée se réordonne sans rien perdre.
 *
 * Rend le plan retenu et la liste de ce qui a été écarté, pour que le journal de
 * sortie le dise — un plan silencieusement amputé de moitié est un défaut qu'on
 * veut voir passer, pas découvrir trois mois plus tard.
 */
export function applique(sujets, dejaTraitees) {
  const retenus = []
  const ecartes = []
  const vues = new Set(dejaTraitees)
  let aDonnees = 0

  for (const s of sujets ?? []) {
    if (!s?.titre || !s?.motCle) {
      ecartes.push({ sujet: s?.titre ?? '(sans titre)', raison: 'titre ou mot-clé manquant' })
      continue
    }

    const k = cle(s.commune, s.motCle)
    if (vues.has(k)) {
      ecartes.push({ sujet: s.titre, raison: `couple (${s.commune ?? 'sans commune'}, « ${s.motCle} ») déjà traité` })
      continue
    }

    if (s.besoinDonneesPrix && aDonnees >= PLAFOND_DONNEES) {
      ecartes.push({ sujet: s.titre, raison: `plafond de ${PLAFOND_DONNEES} articles à données atteint` })
      continue
    }

    vues.add(k)
    if (s.besoinDonneesPrix) aDonnees += 1
    retenus.push(s)
  }

  return { retenus: reordonne(retenus), ecartes, aDonnees }
}

/**
 * Réordonne pour qu'aucun genre ne se suive.
 *
 * Glouton : à chaque rang, le premier sujet dont le genre diffère du précédent.
 * Si aucun ne convient — une file où tout est du même genre — on prend le
 * suivant tel quel plutôt que de boucler : la règle est un objectif, pas une
 * condition de publication, et un plan non rendu coûterait plus cher qu'une
 * répétition.
 */
function reordonne(sujets) {
  const reste = [...sujets]
  const sortie = []
  let precedent = null

  while (reste.length > 0) {
    let i = reste.findIndex((s) => normaliseGenre(s.genre) !== precedent)
    if (i === -1) i = 0
    const [choisi] = reste.splice(i, 1)
    sortie.push(choisi)
    precedent = normaliseGenre(choisi.genre)
  }

  return sortie
}

const normaliseGenre = (g) => String(g ?? '').toLowerCase().trim()

/**
 * Demande au modèle les douze prochains sujets.
 *
 * `journal` lui sert à ne rien répéter ; il le reçoit en entier, parce que la
 * règle « deux articles sur Forbach oui, deux sur vendre à Forbach non » se juge
 * sur ce qui a été traité, pas sur un extrait récent.
 */
export async function generePlan(anthropic, compteur, { journal, communes, agence }) {
  const traitees = clesTraitees(journal)

  const dejaFait = (journal.entrees ?? []).length
    ? (journal.entrees ?? [])
        .map((e) => `- ${e.date} · ${e.commune ?? 'sans commune'} · « ${e.motCle ?? 'mot-clé inconnu'} » · ${e.titre}`)
        .join('\n')
    : '(aucun article publié à ce jour)'

  const reponse = await appel(anthropic, compteur, 'plan éditorial', {
    output_config: { format: { type: 'json_schema', schema: SCHEMA_PLAN } },
    system: [
      `Tu établis le plan éditorial du blog de ${agence.nom}, agence immobilière indépendante installée à ${agence.commune} (Moselle, secteur de la Moselle-Est).`,
      '',
      'TON OBJECTIF EST LE RÉFÉRENCEMENT NATUREL, ET RIEN D’AUTRE.',
      '',
      'Pour chaque sujet, la question est : quel contenu irait chercher des recherches réelles sur ce secteur, tout en étant vraiment utile à quelqu’un qui vend ou achète ici ? Ce n’est pas : quelles statistiques puis-je afficher.',
      '',
      'LE SEO LOCAL EST PRIORITAIRE. C’est ainsi que l’agence gagne du terrain sur les communes où elle n’est pas encore visible. Chaque article doit avoir un rapport avec ce territoire : un contenu qui pourrait être publié tel quel par n’importe quelle agence de France ne vaut rien ici.',
      '',
      'PLUSIEURS ARTICLES PAR COMMUNE, SOUS DES ANGLES DIFFÉRENTS.',
      'Une seule page par commune, c’est une seule requête captée ; plusieurs pages, ce sont plusieurs portes d’entrée. Les angles sont nombreux : vendre, acheter, louer, y vivre, le marché, les quartiers, les écoles, les transports, le profil des acheteurs, ce qui s’y vend le mieux, les délais, les travaux typiques du bâti local.',
      'La règle n’est donc pas « une commune, un article » mais « jamais deux fois la même commune sous le même angle ».',
      '',
      'DOSE SELON LA TAILLE. Forbach, Sarreguemines, Saint-Avold et Freyming-Merlebach méritent plusieurs articles chacune. Un village de trois cents habitants en mérite un seul, ou une simple mention dans un article plus large qui regroupe plusieurs villages.',
      '',
      'TU N’AS AUCUNE DONNÉE DE VOLUME DE RECHERCHE, et tu n’en inventes pas. Classe les communes sur leur population, leur distance à l’agence et sur la façon dont les gens formulent réellement une recherche immobilière. Dis-le comme une appréciation, jamais comme une mesure.',
      '',
      'L’ANGLE FRONTALIER EST OUVERT. Sarrebruck est à douze kilomètres, et les acheteurs allemands du bassin sont un segment réel que personne ne traite dans le secteur. C’est un terrain à gratter.',
      '',
      `VARIÉTÉ : deux articles de même genre ne se suivent jamais. Et AU PLUS ${PLAFOND_DONNEES} SUJETS SUR ${TAILLE_PLAN} peuvent déclarer « besoinDonneesPrix ».`,
      'Ce plafond n’est pas décoratif : la première version de ce blog partait entièrement sur les prix et les graphiques, et se lisait comme une suite de statistiques. Un blog d’agence, ce n’est pas ça. La grande majorité de tes sujets doit pouvoir s’écrire sans citer un seul prix au m².',
      '',
      'QUAND LE SECTEUR S’ÉPUISE : si tu ne trouves pas assez de sujets locaux encore non traités, complète avec les questions que se posent concrètement vendeurs et acheteurs de ce secteur — diagnostics, succession, mitoyenneté, délais, fiscalité locale, particularités du livre foncier en Alsace-Moselle.',
    ].join('\n'),
    messages: [
      {
        role: 'user',
        content: [
          `Les ${communes.length} communes dans un rayon de 20 km autour de l’agence.`,
          'Format : code INSEE | nom · population · distance · prix maison relevé (ou son absence).',
          'Un prix relevé permet un article à données ; son absence ne disqualifie pas la commune, elle oriente seulement vers un autre angle.',
          '',
          resumeSecteur(communes),
          '',
          '--- ARTICLES DÉJÀ PUBLIÉS ---',
          'Tu ne peux réutiliser aucun couple (commune, mot-clé) de cette liste.',
          '',
          dejaFait,
          '',
          '--- ---',
          `Propose les ${TAILLE_PLAN} prochains sujets, dans l’ordre de publication.`,
        ].join('\n'),
      },
    ],
  })

  const rendu = jsonDuTexte(texte(reponse))
  if (!Array.isArray(rendu?.sujets) || rendu.sujets.length === 0) {
    throw new Error('Plan éditorial : réponse sans sujet exploitable.')
  }

  const { retenus, ecartes, aDonnees } = applique(rendu.sujets, traitees)

  if (retenus.length === 0) {
    throw new Error(`Plan éditorial : les ${rendu.sujets.length} sujets proposés ont tous été écartés.`)
  }

  const horodatage = new Date().toISOString().slice(0, 10)
  return {
    plan: {
      genereLe: horodatage,
      sujets: retenus.map((s, i) => ({ ...s, id: `${horodatage}-${i + 1}`, publie: null })),
    },
    ecartes,
    aDonnees,
  }
}
