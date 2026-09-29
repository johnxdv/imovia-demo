// Produit un article de blog, du sujet au fichier publiable.
//
//   npm run blog:article            -- écrit l'article dans src/data/articles/
//   npm run blog:article -- --essai -- déroule tout sans rien écrire dans le dépôt
//   npm run blog:article -- --sujet "..."  -- impose un sujet hors plan
//
// LE SYSTÈME EST AUTONOME : IL DÉCIDE DE SES SUJETS
//
// Il n'y a plus d'étape de « recherche du sujet ». Le sujet vient du plan
// éditorial (`src/data/plan.json`), que le système génère lui-même quand il
// arrive à court — voir `_lib/planification.mjs`. Aucune validation humaine
// n'intervient entre la décision du sujet et la publication.
//
// CE QUE LE RETRAIT DE L'ANCIENNE ÉTAPE 1 A CHANGÉ
//
// Elle cherchait un angle libre sur le web, et pesait 0,94 $ sur les 1,19 $
// d'un article — 79 % de la facture. Non pas à cause du prix des recherches
// (0,06 $), mais parce que leurs résultats étaient réinjectés dans le contexte
// et refacturés à chaque tour de la boucle : 136 000 jetons d'entrée pour
// choisir un sujet.
//
// Le plan rend ce travail inutile : le titre, le mot-clé, la commune et l'angle
// sont déjà décidés quand le passage démarre.
//
// LA RECHERCHE WEB N'A PAS DISPARU, ELLE A CHANGÉ DE RÔLE
//
// Elle ne cherche plus QUOI écrire, elle vérifie CE QU'ON AVANCE : écoles,
// lignes de bus, montants d'aides, équipements. C'est ce qui rend un article
// local crédible, et c'est précisément ce qu'un concurrent ne peut pas recopier.
// Elle ne se déclenche que pour les sujets qui le demandent (`besoinRecherche`),
// avec trois recherches au plus au lieu de six.
//
// AUCUN CHIFFRE N'EST INVENTÉ — DEUX SOURCES, DEUX RÉGIMES
//
// 1. **Les relevés du site.** La rédaction ne reçoit que le dossier de données,
//    et la liste explicite de ce qui n'existe pas (`indisponible`). Aucune
//    évolution ne peut en être tirée : un seul relevé, rien à comparer.
//
// 2. **Les faits vérifiés à la recherche.** Ils ne sont retenus que si l'adresse
//    citée figure parmi celles que l'outil a RÉELLEMENT rendues
//    (`verifieSources`). Un modèle sait produire une référence parfaitement
//    crédible et entièrement fausse, et cette invention ne se voit pas à la
//    relecture — la parade est mécanique, pas déclarative.
//
// LE JOURNAL S'ÉCRIT AVEC L'ARTICLE, JAMAIS SÉPARÉMENT
//
// Article, images, plan et journal sont écrits dans la même passe et commités
// ensemble. Le raisonnement est dans `_lib/plan.mjs` : en intégration continue,
// rien n'est durable avant le push, donc tout y entre d'un coup ou rien n'y
// entre.

import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { agency } from '../src/data/agency.js'
import {
  Compteur,
  MODELE,
  OUTIL_RECHERCHE_WEB,
  appel,
  client,
  jsonDuTexte,
  texte,
  urlsDeRecherche,
  verifieSources,
} from './_lib/claude-api.mjs'
import { dossier, resoudreCommune } from './_lib/donnees-locales.mjs'
import { illustrations } from './_lib/illustration.mjs'
import { ecrireArticle, lireArticles, slugDisponible } from './_lib/article.mjs'
import { generePlan, lireSecteur } from './_lib/planification.mjs'
import {
  RESTANT_MINIMAL,
  ecrireJournal,
  ecrirePlan,
  enregistrePublication,
  lireJournal,
  lirePlan,
  prochainSujet,
  reconcilie,
  restants,
} from './_lib/plan.mjs'

const args = process.argv.slice(2)
const essai = args.includes('--essai') || args.includes('--dry-run')
const valeurDe = (drapeau) => {
  const i = args.indexOf(drapeau)
  return i >= 0 ? args[i + 1] : null
}

const sujetImpose = valeurDe('--sujet')
const villeImposee = valeurDe('--ville')

/**
 * Compteur du passage en cours, accessible au gestionnaire d'échec.
 *
 * Il vit hors de `main()` pour une raison apprise à ses dépens : le relevé de
 * coût n'était imprimé qu'en fin de course, donc jamais quand le script
 * échouait. Deux passages se sont ainsi arrêtés après avoir payé leur première
 * étape sans qu'une ligne ne le dise, et la dépense annoncée était celle de
 * l'article réussi, pas celle de la journée.
 *
 * Un appel abouti est facturé, que la suite aboutisse ou non. Le relevé
 * s'imprime donc aussi sur échec.
 */
let compteurDuPassage = null

const journal = (message) => console.log(`  ${message}`)
const etape = (n, titre) => console.log(`\n[${n}/6] ${titre}`)

/** Commune du siège — point de départ du secteur décrit par les articles. */
const COMMUNE_SIEGE = agency.address.line2.replace(/^\d+\s*/, '').trim()
const SCHEMA_ARTICLE = {
  type: 'object',
  additionalProperties: false,
  required: [
    'titre',
    'titreSeo',
    'resume',
    'sections',
    'faq',
    'chiffresCites',
    'sources',
    'graphique',
    'imageEnTete',
    'imagesCorps',
  ],
  properties: {
    titre: { type: 'string', description: 'Titre de l’article, sans nom de marque. C’est le titre affiché en tête de page ; il peut être long.' },
    titreSeo: {
      type: 'string',
      description:
        'Le même titre, ramené à 45 caractères au maximum — il sera suivi de « — IMMOVIA » dans la balise title. Il doit porter la promesse de l’article, pas seulement son sujet, parce que c’est lui qu’on lit dans une page de résultats.',
    },
    resume: { type: 'string', description: 'Deux à trois phrases, en tête d’article.' },
    sections: {
      type: 'array',
      description: 'Trois à sept sections.',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question', 'paragraphes'],
        properties: {
          question: { type: 'string', description: 'Sous-titre formulé en question.' },
          paragraphes: { type: 'array', minItems: 1, items: { type: 'string' } },
        },
      },
    },
    faq: {
      type: 'array',
      description: 'Trois à cinq questions-réponses.',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question', 'reponse'],
        properties: { question: { type: 'string' }, reponse: { type: 'string' } },
      },
    },
    chiffresCites: {
      type: 'array',
      description: 'Chaque chiffre avancé dans l’article, avec sa provenance dans le dossier fourni.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['libelle', 'valeur', 'source'],
        properties: {
          libelle: { type: 'string' },
          valeur: { type: 'string' },
          source: { type: 'string' },
        },
      },
    },
    sources: {
      type: 'array',
      description:
        'Les sources extérieures effectivement citées dans le texte. Vide si l’article ne s’appuie que sur les relevés du site.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['enonce', 'source', 'url'],
        properties: {
          enonce: { type: 'string', description: 'Le fait repris dans l’article.' },
          source: { type: 'string', description: 'L’organisme ou le média, tel que nommé dans le texte.' },
          url: { type: 'string' },
        },
      },
    },
    graphique: {
      type: ['object', 'null'],
      description: 'Comparaison chiffrée centrale, si l’article en porte une. Sinon null.',
      additionalProperties: false,
      required: ['titre', 'unite', 'valeurs', 'apresSection'],
      properties: {
        titre: { type: 'string' },
        unite: { type: 'string' },
        apresSection: {
          type: 'number',
          description: 'Rang de la section que le graphique illustre, à partir de 1 — au plus près du passage qui le commente.',
        },
        valeurs: {
          type: 'array',
          description: 'Au moins deux valeurs — en dessous il n’y a rien à comparer.',
          minItems: 1,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['libelle', 'valeur'],
            properties: { libelle: { type: 'string' }, valeur: { type: 'number' } },
          },
        },
      },
    },
    imageEnTete: {
      type: 'string',
      description:
        'Requête en anglais pour la photo d’en-tête. LARGE et concrète : les banques d’images ne rendent RIEN sur « traditional house village lorraine france » et dix mille résultats sur « french village aerial view ». Décris une SCÈNE, pas une commune — aucune n’est photographiée.',
    },
    imagesCorps: {
      type: 'array',
      description:
        'Une ou deux photos de corps, pas plus. Chacune illustre le propos de la section après laquelle elle se pose.',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['requete', 'apresSection'],
        properties: {
          requete: { type: 'string', description: 'Requête en anglais, même règle que pour l’en-tête.' },
          apresSection: { type: 'number', description: 'Rang de la section après laquelle poser l’image, à partir de 1.' },
        },
      },
    },
  },
}

/**
 * Vérification des faits locaux que l'article va avancer.
 *
 * REMPLACE L'ANCIENNE « RECHERCHE DU SUJET », ET NE LUI RESSEMBLE PAS
 *
 * On ne demande plus au modèle quoi écrire — le plan l'a décidé. On lui demande
 * de SOURCER ce que l'article devra affirmer : combien d'écoles, quelle ligne
 * de bus, quel montant d'aide, quel équipement. La recherche passe donc de
 * l'exploration à la vérification, ce qui la rend à la fois plus courte et plus
 * utile.
 *
 * Trois recherches au plus. L'ancienne étape en autorisait six, pour faire le
 * tour de ce qui se publiait sur un marché ; ici la question est précise et
 * fermée, et chaque tour de boucle refacture tout le contexte accumulé.
 *
 * Les adresses réellement consultées sont renvoyées avec les faits : l'appelant
 * confronte les unes aux autres avant de transmettre quoi que ce soit à la
 * rédaction.
 */
async function verifieFaits(anthropic, compteur, { sujet }) {
  const tours = []

  const reponse = await appel(
    anthropic,
    compteur,
    'vérification des faits',
    {
      tools: [{ ...OUTIL_RECHERCHE_WEB, max_uses: 3 }],
      system: [
        `Tu documentes un article du blog d'une agence immobilière de ${COMMUNE_SIEGE} (Moselle-Est).`,
        '',
        "Le sujet est DÉJÀ décidé : tu n'as pas à en proposer un autre, ni à en discuter l'angle.",
        '',
        'Ta seule tâche : chercher sur le web les faits locaux vérifiables que cet article devra avancer — écoles et collèges, lignes de bus et gares, temps de trajet, équipements, commerces, montants d’aides applicables, particularités administratives du secteur.',
        '',
        'RÈGLES SUR CE QUE TU RAPPORTES :',
        "- Chaque fait doit venir d'une page que tu as RÉELLEMENT ouverte pendant cette recherche, et tu en donnes l'adresse exacte.",
        "- N'invente jamais une référence de mémoire, même si elle te paraît juste : chaque adresse est confrontée à la liste de ce que l'outil a rendu, et une adresse inventée est écartée avant d'atteindre la rédaction.",
        "- Un fait que tu ne peux pas sourcer ne doit pas figurer dans ta réponse. Mieux vaut en rapporter trois que d'en inventer huit.",
        "- Les prix immobiliers ne t'intéressent pas : ils viennent des relevés du site, pas du web.",
        '',
        'Réponds par un bloc JSON :',
        '```json',
        '{ "faits": [{ "enonce": "…", "source": "…", "url": "https://…" }] }',
        '```',
        "Si tu n'as rien trouvé de sourçable, rends `faits` à [].",
      ].join('\n'),
      messages: [
        {
          role: 'user',
          content: [
            `Titre de l'article : ${sujet.titre}`,
            sujet.commune ? `Commune : ${sujet.commune}` : 'Aucune commune précise.',
            `Angle : ${sujet.angle}`,
            `Intention de recherche visée : ${sujet.intention}`,
            '',
            'Cherche et rapporte les faits locaux vérifiables utiles à cet article.',
          ].join('\n'),
        },
      ],
    },
    { tours },
  )

  const rendu = jsonDuTexte(texte(reponse))
  return { faits: Array.isArray(rendu?.faits) ? rendu.faits : [], urls: urlsDeRecherche(tours) }
}
/**
 * Rédaction — sur le sujet décidé par le plan et les seules données fournies.
 *
 * `sujet.besoinDonneesPrix` décide de ce que la rédaction reçoit comme matière
 * chiffrée. Un sujet qui ne s'écrit pas sur des prix n'en reçoit pas la liste :
 * lui donner le dossier complet « au cas où » est précisément ce qui faisait
 * dériver chaque article vers un tableau comparatif.
 */
async function redige(anthropic, compteur, { sujet, donnees }) {
  const reponse = await appel(anthropic, compteur, 'rédaction', {
    output_config: { format: { type: 'json_schema', schema: SCHEMA_ARTICLE } },
    system: [
      `Tu rédiges pour le blog de ${agency.name}, agence immobilière indépendante à ${COMMUNE_SIEGE} (Moselle).`,
      '',
      'Forme imposée :',
      '- Un résumé de deux à trois phrases en tête.',
      '- Des sous-titres formulés en questions, qui se suivent comme une FAQ progressive — pas des titres génériques du type « Le marché local ».',
      '- Une section FAQ distincte en fin d’article, de trois à cinq questions-réponses, qui ne répètent pas les sous-titres.',
      '- 800 à 1 200 mots au total.',
      '',
      'RÈGLE ABSOLUE SUR LES CHIFFRES — DEUX SOURCES, DEUX RÉGIMES :',
      '',
      '1. Les relevés du site (blocs `commune`, `voisines`, `quartiers`, `portefeuille`).',
      '   - Tu les cites tels quels, sans rien en déduire : pas de moyenne calculée par toi, pas d’arrondi commercial, pas d’ordre de grandeur « de mémoire ».',
      '   - TU N’EN TIRES AUCUNE ÉVOLUTION. Ce sont des prix relevés à une seule date : « en hausse », « depuis l’an dernier », « la tendance est à » ne peuvent pas en sortir, sous aucune formulation, même prudente.',
      '',
      '2. Le bloc `statistiquesExternes`, s’il est renseigné.',
      '   - Ces chiffres-là viennent de sources extérieures datées, déjà vérifiées. Une évolution chiffrée ne peut venir que d’ici.',
      '   - Tu ne peux en citer un QUE si tu nommes sa source dans la phrase même — « selon la chambre des notaires de la Moselle », « d’après l’INSEE ». Un chiffre extérieur sans son nom d’origine dans le texte est interdit.',
      '   - Reprends l’énoncé tel qu’il est donné : ne le recalcule pas, ne le transpose pas à une autre échelle géographique, ne l’actualise pas.',
      '   - Chaque source ainsi citée doit figurer dans le champ `sources`.',
      '',
      'Dans les deux cas :',
      '- Si ton angle appelle un chiffre qui n’est ni dans les relevés ni dans les statistiques externes, écris la phrase sans le chiffre, ou dis que la donnée n’est pas publiée sur ce territoire. La liste `indisponible` du dossier énumère ce qui n’existe pas : ne contourne aucune de ses lignes.',
      '- Tout chiffre cité dans le texte doit apparaître dans `chiffresCites`, avec sa provenance exacte.',
      '- Tu n’ajoutes aucune source qui ne serait pas dans le dossier : tu n’as pas accès au web à cette étape.',
      '',
      'Ton : sobre, professionnel, utile. Pas de superlatif, pas d’argumentaire de vente, pas d’appel à l’action répété. Tu informes un propriétaire ou un acquéreur du secteur.',
      '',
      'Les prix fournis sont des relevés de prix au m², pas des ventes conclues : ne les présente jamais comme des transactions constatées.',
    ].join('\n'),
    messages: [
      {
        role: 'user',
        content: [
          `Titre à traiter : ${sujet.titre}`,
          `Angle : ${sujet.angle}`,
          `Mot-clé visé : ${sujet.motCle ?? '(aucun)'}`,
          `Intention de recherche : ${sujet.intention ?? '(non précisée)'}`,
          `Commune traitée : ${donnees.ville}`,
          '',
          sujet.besoinDonneesPrix
            ? 'Dossier de données — seule source chiffrée autorisée :'
            : "Ce sujet NE S'ÉCRIT PAS SUR DES CHIFFRES. Le dossier ci-dessous n'est là que pour situer la commune : n'en tire aucun tableau, aucune comparaison de prix, et mets `graphique` à null. Un prix au m² peut être mentionné en passant s'il éclaire une phrase, pas davantage.",
          JSON.stringify(
            sujet.besoinDonneesPrix ? donnees : { ville: donnees.ville, codeInsee: donnees.codeInsee, indisponible: donnees.indisponible },
            null,
            2,
          ),
          '',
          donnees.statistiquesExternes?.length
            ? 'Faits locaux vérifiés et sourcés — tu peux les citer EN NOMMANT leur source dans la phrase :'
            : "Aucun fait extérieur vérifié pour cet article : n'en avance aucun.",
          donnees.statistiquesExternes?.length ? JSON.stringify(donnees.statistiquesExternes, null, 2) : '',
          '',
          'Rédige l’article.',
          'Renseigne `graphique` uniquement si une comparaison chiffrée porte réellement l’article (écart de prix entre communes ou entre quartiers), avec des valeurs prises telles quelles dans le dossier. Sinon, mets-le à null.',
          'Tous les sujets ne reposent pas sur des chiffres : un article de conseil ou d’entretien peut n’en porter aucun, et c’est très bien. Ne force pas un tableau de prix dans un sujet qui n’en demande pas.',
          '',
          'LIEN VERS L’ESTIMATEUR — UNE FOIS, ET DANS UNE PHRASE.',
          'Exactement UN paragraphe de l’article porte une ancre vers notre estimateur, écrite entre doubles crochets : `[[texte de l’ancre]]`.',
          'Elle doit se lire comme une phrase, pas comme un encart — « la logique que suit notre [[estimation en ligne]] », et non « cliquez ici ». Le texte de l’ancre dit où l’on va : « estimation en ligne », « estimer votre bien à Forbach ». Jamais « ici », « ce lien », « en savoir plus ».',
          'Place-la là où le propos l’appelle — le plus souvent dans la dernière section, quand l’article passe du constat à ce qu’on en fait. Un seul jeu de crochets dans tout l’article : les suivants seraient ignorés.',
          'N’écris AUCUNE autre balise et AUCUN autre lien : les doubles crochets sont le seul balisage que tu produis.',
        ].join('\n'),
      },
    ],
  })

  const redaction = jsonDuTexte(texte(reponse))
  if (!redaction?.titre) {
    throw new Error('Étape 3 : rédaction sans titre exploitable.')
  }
  return redaction
}
/** Compte les mots du corps — pour vérifier la longueur demandée. */
const compteMots = (article) =>
  [article.resume, ...article.sections.flatMap((s) => s.paragraphes), ...article.faq.map((q) => q.reponse)]
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length

/**
 * Le sujet du passage — depuis le plan, en le réapprovisionnant si besoin.
 *
 * LE RÉAPPROVISIONNEMENT EST DANS LE MÊME PASSAGE, ET PAS DANS UN AUTRE
 *
 * À trois sujets restants, ce passage-ci génère les douze suivants avant de
 * rédiger le sien. Un workflow séparé aurait été plus propre à lire, mais il
 * aurait ouvert une fenêtre : si sa génération échoue, la file se vide en
 * silence et le blog s'arrête sans que rien ne le dise. Ici, le passage qui
 * constate le manque est celui qui le comble — et si la planification échoue,
 * l'échec est bruyant parce que l'article du jour échoue avec elle.
 *
 * Trois sujets, à six articles par mois, laissent quinze jours de marge.
 */
async function sujetDuPassage(anthropic, compteur, { journalPublications, communes }) {
  let plan = await lirePlan()

  if (sujetImpose) {
    etape(1, 'Sujet imposé en ligne de commande — hors plan')
    journal(`« ${sujetImpose} »`)
    journal('Ce sujet ne consomme aucune entrée du plan et ne déclenche aucune planification.')
    return {
      plan,
      sujet: {
        id: null,
        titre: sujetImpose,
        motCle: null,
        commune: villeImposee ?? COMMUNE_SIEGE,
        codeInsee: null,
        angle: 'imposé en ligne de commande',
        genre: null,
        intention: 'sujet décidé à la main',
        besoinDonneesPrix: true,
        besoinRecherche: false,
      },
    }
  }

  const restantAvant = restants(plan)

  if (restantAvant <= RESTANT_MINIMAL) {
    etape(1, `Plan éditorial — ${restantAvant} sujet(s) restant(s), génération des suivants`)

    const { plan: neuf, ecartes, aDonnees } = await generePlan(anthropic, compteur, {
      journal: journalPublications,
      communes,
      agence: { nom: agency.name, commune: COMMUNE_SIEGE },
    })

    journal(`${neuf.sujets.length} sujets retenus, dont ${aDonnees} reposant sur les relevés de prix.`)
    for (const e of ecartes) journal(`Écarté — « ${e.sujet} » : ${e.raison}.`)

    // Les sujets encore en attente passent devant : ils ont été décidés plus
    // tôt et rien ne justifie de les doubler.
    const enAttente = (plan.sujets ?? []).filter((s) => !s.publie)
    const publies = (plan.sujets ?? []).filter((s) => s.publie)
    plan = { ...neuf, sujets: [...publies, ...enAttente, ...neuf.sujets] }

    for (const s of neuf.sujets.slice(0, 4)) journal(`  → ${s.commune ?? 'secteur'} · « ${s.motCle } » · ${s.titre}`)
    if (neuf.sujets.length > 4) journal(`  … et ${neuf.sujets.length - 4} autres.`)
  } else {
    etape(1, `Plan éditorial — ${restantAvant} sujets en file, aucune planification nécessaire`)
  }

  const sujet = prochainSujet(plan)
  if (!sujet) throw new Error('Plan éditorial vide après planification — aucun sujet à traiter.')

  journal(`Sujet   : ${sujet.titre}`)
  journal(`Commune : ${sujet.commune ?? 'aucune'}`)
  journal(`Mot-clé : ${sujet.motCle}`)
  journal(`Genre   : ${sujet.genre}`)

  return { plan, sujet }
}

async function main() {
  console.log(`\nArticle de blog — ${agency.name}${essai ? '  (essai : rien ne sera écrit dans le dépôt)' : ''}`)

  const anthropic = client()
  const compteur = new Compteur(MODELE)
  compteurDuPassage = compteur

  // ── Mémoire du système ────────────────────────────────────────────────
  //
  // Le journal est réconcilié AVANT toute décision : un article publié mais
  // non journalisé — journal écrasé, tronqué, ou simplement plus ancien que le
  // fichier — doit compter comme traité, sinon son sujet peut être reproposé.
  const publies = await lireArticles()
  const { journal: journalReconcilie, ajoutes } = reconcilie(await lireJournal(), publies)
  if (ajoutes > 0) {
    console.log(`\n  Journal reconstruit : ${ajoutes} article(s) publié(s) y ont été réinscrits.`)
  }

  const communes = await lireSecteur()

  const { plan, sujet } = await sujetDuPassage(anthropic, compteur, {
    journalPublications: journalReconcilie,
    communes,
  })

  // ── Faits locaux ──────────────────────────────────────────────────────
  etape(2, sujet.besoinRecherche ? 'Vérification des faits locaux (recherche web)' : 'Faits locaux — recherche inutile pour ce sujet')
  let faits = []
  if (sujet.besoinRecherche) {
    const resultat = await verifieFaits(anthropic, compteur, { sujet })
    const { retenues, ecartees } = verifieSources(resultat.faits, resultat.urls)
    faits = retenues
    journal(`${retenues.length} fait(s) sourcé(s) et vérifié(s).`)
    for (const e of ecartees) journal(`Écarté — adresse jamais consultée : ${e.url}`)
  } else {
    journal("Ce sujet n'avance aucun fait local à sourcer — aucune recherche, aucun coût.")
  }

  // ── Dossier de données ────────────────────────────────────────────────
  etape(3, sujet.besoinDonneesPrix ? 'Relevés de prix du secteur' : 'Relevés de prix — non requis par ce sujet')
  const commune = resoudreCommune(sujet.commune ?? COMMUNE_SIEGE)
  const donnees = await dossier({
    codeInsee: sujet.codeInsee ?? commune.codeInsee,
    lat: commune.points[0]?.lat,
    lon: commune.points[0]?.lon,
    ville: commune.nom,
    statistiquesExternes: faits,
  })
  if (!sujet.besoinDonneesPrix) {
    // Le dossier est construit quand même — il porte aussi la commune, sa
    // position et la liste `indisponible` — mais la rédaction est prévenue
    // qu'elle n'a pas à s'en servir. Un sujet qui n'appelle pas de prix ne doit
    // pas en recevoir un par la bande.
    journal('Prix chargés mais NON transmis comme matière : ce sujet ne s’écrit pas sur des chiffres.')
  } else {
    journal(`Relevés de ${donnees.ville} et de ses voisines transmis à la rédaction.`)
  }

  // ── Rédaction ─────────────────────────────────────────────────────────
  etape(4, 'Rédaction')
  const redaction = await redige(anthropic, compteur, { sujet, donnees })
  journal(`${redaction.sections.length} sections, ${redaction.faq.length} questions, ${compteMots(redaction)} mots.`)

  // ── Illustrations ─────────────────────────────────────────────────────
  etape(5, 'Illustrations')
  const slug = essai ? `essai-${Date.now()}` : await slugDisponible(redaction.titre)
  const visuels = await illustrations(
    {
      slug,
      // Le graphique n'est ouvert qu'aux sujets qui reposent sur les relevés,
      // et le plan en autorise trois sur douze. C'est ce plafond, et non le
      // jugement du modèle, qui empêche le blog de redevenir un mur de barres.
      format: sujet.besoinDonneesPrix ? 'marche' : 'guide',
      requeteEnTete: redaction.imageEnTete,
      requetesCorps: redaction.imagesCorps ?? [],
      graphique: redaction.graphique ? { ...redaction.graphique, releve: donnees.provenance.releves.join(', ') } : null,
    },
    journal,
  )

  const article = {
    slug,
    titre: redaction.titre,
    titreSeo: redaction.titreSeo,
    resume: redaction.resume,
    sujet: sujet.titre,
    angle: sujet.angle,
    motCle: sujet.motCle,
    genre: sujet.genre,
    format: sujet.besoinDonneesPrix ? 'marche' : 'guide',
    ville: commune.nom,
    codeInsee: sujet.codeInsee ?? commune.codeInsee,
    datePublication: new Date().toISOString().slice(0, 10),
    auteur: agency.name,
    imageEnTete: visuels.enTete,
    sections: redaction.sections,
    imagesCorps: visuels.corps,
    graphique: visuels.graphique,
    faq: redaction.faq,
    chiffresCites: redaction.chiffresCites,
    sources: redaction.sources ?? [],
    meta: {
      genere: 'auto',
      modele: MODELE,
      intention: sujet.intention,
      faitsVerifies: faits,
      // Les données derrière le graphique, conservées telles qu'elles ont
      // servi à le dessiner. Sans elles, redessiner l'image — après une
      // correction du rendu, un changement de palette — imposerait de
      // relancer le modèle et de repayer l'article entier pour récupérer
      // douze nombres qui étaient déjà là.
      graphique: redaction.graphique ?? null,
      provenanceDonnees: donnees.provenance,
      cout: compteur.releve(),
    },
  }

  // ── Publication ───────────────────────────────────────────────────────
  //
  // Article, plan et journal sont écrits ensemble, juste avant que le workflow
  // ne les commite d'un seul coup. Voir `_lib/plan.mjs` : en intégration
  // continue, rien n'est durable avant le push, donc tout entre dans le même
  // commit ou rien n'y entre. Il n'existe pas d'état intermédiaire où l'article
  // serait en ligne sans sa trace au journal.
  etape(6, essai ? 'Publication — sautée (essai)' : 'Publication')
  if (essai) {
    const sortie = path.join(process.env.TMPDIR ?? '/tmp', `article-essai-${slug}.json`)
    await writeFile(sortie, `${JSON.stringify(article, null, 2)}\n`, 'utf8')
    journal(`Article écrit hors du dépôt : ${sortie}`)
    journal('Plan et journal inchangés — le sujet reste en file.')
  } else {
    const { plan: planAJour, journal: journalAJour } = enregistrePublication(
      plan,
      journalReconcilie,
      sujet,
      article,
    )

    const chemin = await ecrireArticle(article)
    await ecrirePlan(planAJour)
    await ecrireJournal(journalAJour)

    journal(`Écrit : ${chemin}`)
    journal(`Plan  : ${restants(planAJour)} sujet(s) encore en file.`)
    journal('Article, plan et journal sont commités ensemble par le workflow.')
  }

  imprimeReleve(compteur, 'Coût réel de cet article')
}
/** Relevé de consommation, imprimé aussi bien en réussite qu'en échec. */
function imprimeReleve(compteur, titre) {
  if (!compteur || compteur.postes.length === 0) {
    console.log('\nAucun appel facturé lors de ce passage.')
    return
  }

  const releve = compteur.releve()
  console.log(`\n─── ${titre} ───`)
  for (const poste of releve.postes) {
    console.log(
      `  ${poste.etape.padEnd(20)} ${String(poste.jetonsEntree).padStart(7)} entrée · ` +
        `${String(poste.jetonsSortie).padStart(6)} sortie · ` +
        `${String(poste.recherchesWeb).padStart(2)} recherche(s) · ` +
        `$${poste.cout.total.toFixed(4)}`,
    )
  }
  console.log(
    `  ${'TOTAL'.padEnd(20)} ${String(releve.totaux.jetonsEntree).padStart(7)} entrée · ` +
      `${String(releve.totaux.jetonsSortie).padStart(6)} sortie · ` +
      `${String(releve.totaux.recherchesWeb).padStart(2)} recherche(s) · ` +
      `$${releve.totaux.coutUsd.toFixed(4)}`,
  )
  console.log(`  Six articles par mois, à ce coût : $${(releve.totaux.coutUsd * 6).toFixed(2)}/mois.\n`)
}

main().catch((error) => {
  console.error(`\nÉchec — ${error?.message ?? error}`)

  // Ce qui a déjà été appelé a déjà été facturé : le dire, même — surtout —
  // quand le passage n'a rien produit.
  imprimeReleve(compteurDuPassage, 'Dépense engagée AVANT cet échec')

  // Aucun sujet n'a été consommé : le plan n'est écrit qu'au moment de la
  // publication. Le passage suivant reprendra le même sujet.
  console.error('Aucun sujet consommé — le plan est intact, le prochain passage reprendra celui-ci.\n')

  process.exitCode = 1
})
