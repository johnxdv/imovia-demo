// Produit un article de blog, de la recherche du sujet au fichier publiable.
//
//   npm run blog:article            -- écrit l'article dans src/data/articles/
//   npm run blog:article -- --essai -- déroule tout sans rien écrire dans le dépôt
//   npm run blog:article -- --sujet "..."  -- impose le sujet, saute la recherche
//
// SIX ÉTAPES, DANS CET ORDRE
//
//   1. Recherche du sujet — appel à Claude avec l'outil de recherche web, pour
//      voir ce qui se publie déjà sur le secteur et trouver un angle libre.
//   2. Données locales réelles — lecture du moteur d'estimation du site.
//   3. Rédaction — second appel, sujet et données en contexte.
//   4. Balisage structuré — posé au prérendu (`scripts/prerender-blog.mjs`).
//   5. Illustration — graphique si l'article repose sur une comparaison
//      chiffrée, photo de banque d'images sinon.
//   6. Publication — ce script écrit le fichier, il ne commite pas.
//
// POURQUOI LE SCRIPT NE COMMITE PAS
//
// C'est la règle déjà suivie par l'import Modelo : `sync-modelo.mjs` réécrit
// `src/data/properties.json`, et c'est le workflow qui décide de commiter, à
// condition que le fichier ait changé. Même découpage ici — le script produit,
// le workflow publie. Lancé à la main, il ne peut donc rien mettre en ligne
// par accident.
//
// AUCUN CHIFFRE N'EST INVENTÉ — DEUX SOURCES, DEUX RÉGIMES
//
// 1. **Les relevés du site.** L'étape 3 ne reçoit que le dossier de l'étape 2,
//    et la liste explicite de ce qui n'existe pas (`indisponible`). Aucune
//    évolution ne peut en être tirée : un seul relevé, rien à comparer.
//
// 2. **Les statistiques trouvées à la recherche.** Une évolution chiffrée peut
//    être citée si elle vient d'une source datée et identifiable rencontrée à
//    l'étape 1, et si l'article nomme cette source.
//
// La seconde ouvre une porte que la première fermait, d'où le contrôle qui
// suit. Un modèle à qui l'on demande une statistique sourcée sait en produire
// une parfaitement crédible et entièrement fausse, et cette invention ne se
// voit pas à la relecture. Chaque source annoncée est donc confrontée aux
// adresses que l'outil de recherche a RÉELLEMENT rendues (`verifieSources`) :
// ce qui n'y figure pas n'atteint jamais l'étape de rédaction.
//
// ROTATION DES CATÉGORIES
//
// Le sujet retenu appartient à une catégorie différente de celle des deux
// derniers articles publiés (voir `_lib/categories.mjs`). Sans cette
// contrainte, six demandes d'« angle sur le marché local » donnent six
// comparaisons de prix qui ne se répètent jamais mot pour mot et se
// ressemblent toutes.

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
import { categoriesOuvertes, categoriesRecentes, estCategorie, libelleDe } from './_lib/categories.mjs'
import { communesDecoupees, communesVoisines, dossier, resoudreCommune } from './_lib/donnees-locales.mjs'
import { illustration } from './_lib/illustration.mjs'
import { ecrireArticle, lireArticles, slugDisponible } from './_lib/article.mjs'

const args = process.argv.slice(2)
const essai = args.includes('--essai') || args.includes('--dry-run')
const valeurDe = (drapeau) => {
  const i = args.indexOf(drapeau)
  return i >= 0 ? args[i + 1] : null
}

const sujetImpose = valeurDe('--sujet')
const villeImposee = valeurDe('--ville')
const categorieImposee = valeurDe('--categorie')

/**
 * Compteur du passage en cours, accessible au gestionnaire d'échec.
 *
 * Il vit hors de `main()` pour une raison apprise à ses dépens : le relevé de
 * coût n'était imprimé qu'en fin de course, donc jamais quand le script
 * échouait. Deux passages se sont ainsi arrêtés à l'étape 3 après avoir payé
 * l'étape 1 — recherche web comprise — sans qu'une ligne ne le dise. La
 * dépense annoncée était celle de l'article réussi, pas celle de la journée.
 *
 * Un appel abouti est facturé, que la suite du script aboutisse ou non. Le
 * relevé s'imprime donc aussi sur échec.
 */
let compteurDuPassage = null

const journal = (message) => console.log(`  ${message}`)
const etape = (n, titre) => console.log(`\n[${n}/6] ${titre}`)

/** Commune du siège — point de départ du secteur décrit par les articles. */
const COMMUNE_SIEGE = agency.address.line2.replace(/^\d+\s*/, '').trim()

/**
 * Forme imposée à l'article rédigé.
 *
 * Les sorties structurées garantissent que la réponse arrive dans cette forme
 * exacte : pas de post-traitement, pas de JSON à rattraper. `graphique` peut
 * être nul — tous les sujets ne reposent pas sur une comparaison chiffrée, et
 * en forcer une produirait un graphique à une barre.
 *
 * SUR LES BORNES DE TAILLE : un schéma de sortie structurée n'accepte
 * `minItems` qu'à 0 ou 1, et n'accepte pas `maxItems` du tout — l'un comme
 * l'autre font échouer la requête entière en 400. Les nombres imposés (trois à
 * sept sections, trois à cinq questions, au moins deux barres) ne peuvent donc
 * pas être portés par le schéma : ils vivent dans les descriptions et dans le
 * prompt, et sont contrôlés APRÈS la réponse — par `valider()` pour ce qui
 * rendrait l'article impubliable, par le journal pour le reste.
 *
 * Le schéma garantit donc la FORME (les champs, leurs types, rien en trop),
 * pas les quantités. C'est déjà l'essentiel : c'est la forme qui cassait le
 * traitement, pas une section de moins.
 */
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
    'requeteImage',
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
      required: ['titre', 'unite', 'valeurs'],
      properties: {
        titre: { type: 'string' },
        unite: { type: 'string' },
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
    requeteImage: {
      type: 'string',
      description: 'Requête en anglais pour une banque d’images, si aucun graphique.',
    },
  },
}

/**
 * Étape 1 — quelle catégorie, quel sujet, sur quelle commune.
 *
 * Rend aussi les statistiques que la recherche a rencontrées. Elles ne sont
 * pas retenues sur parole : l'appelant les confronte aux adresses réellement
 * consultées avant de les transmettre à la rédaction.
 */
async function chercheSujet(anthropic, compteur, { dejaPublies, ouvertes, exclues, secteur }) {
  const tours = []

  const reponse = await appel(
    anthropic,
    compteur,
    'recherche du sujet',
    {
      tools: [OUTIL_RECHERCHE_WEB],
      system: [
        `Tu prépares la ligne éditoriale du blog d'une agence immobilière indépendante installée à ${COMMUNE_SIEGE} (Moselle).`,
        "Son secteur est la Moselle-Est : Forbach, Sarreguemines, Saint-Avold, Freyming-Merlebach et les communes alentour.",
        '',
        "Ta tâche : chercher sur le web ce qui se publie en ce moment sur ce secteur, puis proposer UN angle d'article précis qui n'est pas déjà traité — dans l'une des catégories ouvertes listées plus bas, et dans aucune autre.",
        '',
        'Contraintes :',
        "- Un sujet précis et publiable tel quel, pas une liste de pistes ni un thème vague.",
        "- Il doit relever d'une des catégories ouvertes. Les catégories des deux derniers articles publiés sont fermées pour ce tour.",
        "- L'angle doit pouvoir s'appuyer sur quelque chose de vérifiable : soit les données internes listées plus bas, soit ce que tu as trouvé et sourcé pendant ta recherche. Un angle que rien ne documente ne vaut rien ici.",
        "- Ne reprends aucun sujet déjà publié par l'agence.",
        '',
        'STATISTIQUES : ce que tu peux rapporter, et à quelle condition.',
        "- Le secteur n'a AUCUNE donnée d'évolution dans le temps côté agence : les relevés de prix internes sont une photographie à une date, rien ne s'en déduit.",
        "- Une évolution chiffrée (« +X % sur un an », « baisse des volumes ») ne peut donc venir que d'une source extérieure datée et identifiable que TU AS RÉELLEMENT OUVERTE pendant cette recherche : chambre des notaires, INSEE, étude publiée, article de presse daté.",
        "- Pour chacune, donne l'adresse exacte de la page consultée. Une statistique dont tu ne peux pas donner l'adresse ne doit pas figurer dans ta réponse — mieux vaut n'en rapporter aucune.",
        "- N'invente jamais une référence de mémoire, même si elle te paraît juste : chaque adresse est vérifiée contre la liste de ce que l'outil de recherche a réellement rendu, et une adresse inventée est écartée.",
        "- Ceci vaut pour tout fait chiffré, pas seulement pour les évolutions : nombre d'écoles, temps de trajet, montant d'une aide locale.",
      ].join('\n'),
      messages: [
        {
          role: 'user',
          content: [
            'Catégories OUVERTES pour cet article — choisis-en une. Elles sont rangées de la moins récemment traitée à la plus récente : à intérêt éditorial comparable, prends celle qui vient en premier.',
            ouvertes.map((c) => `- ${c.cle} — ${c.libelle}\n  ${c.consigne}`).join('\n'),
            '',
            exclues.length > 0
              ? `Catégories FERMÉES ce tour-ci (celles des deux derniers articles) : ${exclues.join(', ')}.`
              : 'Aucune catégorie fermée : c’est le premier article catégorisé.',
            '',
            'Données internes disponibles :',
            JSON.stringify(secteur, null, 2),
            '',
            'Sujets déjà publiés par l’agence :',
            dejaPublies.length > 0
              ? dejaPublies.map((a) => `- [${a.categorie ?? 'sans catégorie'}] ${a.titre}`).join('\n')
              : '- (aucun, c’est le premier article)',
            '',
            'Cherche, puis termine ta réponse par un bloc JSON dans cette forme exacte :',
            '```json',
            JSON.stringify(
              {
                categorie: 'la clé exacte d’une des catégories ouvertes',
                ville: 'commune traitée, telle qu’elle apparaît dans les données internes',
                sujet: 'le sujet de l’article, en une phrase',
                angle: 'ce que cet article apporte que les autres ne font pas',
                pourquoi: 'ce que tes recherches ont montré qui justifie cet angle',
                statistiques: [
                  {
                    enonce: 'le fait chiffré, en une phrase',
                    valeur: 'le chiffre lui-même, par exemple « +2,1 % »',
                    periode: 'la période couverte, ou null',
                    source: 'le nom de l’organisme ou du média',
                    url: 'l’adresse exacte de la page que tu as ouverte',
                    date: 'la date de publication, au format AAAA-MM',
                  },
                ],
                concurrence: [{ source: 'nom du site', titre: 'titre trouvé', url: 'adresse' }],
              },
              null,
              2,
            ),
            '```',
            'Si tu n’as trouvé aucune statistique sourçable, mets `statistiques` à [].',
          ].join('\n'),
        },
      ],
    },
    { tours },
  )

  const brut = texte(reponse)
  const choix = jsonDuTexte(brut)

  if (!choix?.sujet || !choix?.ville) {
    throw new Error(`Étape 1 : réponse sans sujet ni commune exploitable.\n${brut.slice(0, 500)}`)
  }

  return { choix, urls: urlsDeRecherche(tours) }
}

/** Étape 3 — rédaction, sur les seules données de l'étape 2. */
async function redige(anthropic, compteur, { choix, donnees }) {
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
          `Catégorie : ${libelleDe(choix.categorie)}`,
          `Sujet retenu : ${choix.sujet}`,
          `Angle : ${choix.angle}`,
          `Commune traitée : ${donnees.ville}`,
          '',
          'Dossier de données — seule source chiffrée autorisée :',
          JSON.stringify(donnees, null, 2),
          '',
          'Rédige l’article.',
          'Renseigne `graphique` uniquement si une comparaison chiffrée porte réellement l’article (par exemple un écart de prix entre communes ou entre quartiers), avec des valeurs prises telles quelles dans le dossier. Sinon, mets-le à null et propose une requête d’image en anglais.',
          'Toutes les catégories ne reposent pas sur des chiffres : un article de conseil ou d’entretien peut n’en porter aucun, et c’est très bien. Ne force pas un tableau de prix dans un sujet qui n’en demande pas.',
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

async function main() {
  console.log(`\nArticle de blog — ${agency.name}${essai ? '  (essai : rien ne sera écrit dans le dépôt)' : ''}`)

  const anthropic = client()
  const compteur = new Compteur(MODELE)
  compteurDuPassage = compteur

  const publies = await lireArticles()

  // Carte légère du secteur, pour que l'étape 1 choisisse un angle qu'on
  // saura documenter — le dossier complet ne sera construit qu'une fois la
  // commune connue.
  const siege = resoudreCommune(COMMUNE_SIEGE)
  const secteur = {
    communesAvecPrix: communesVoisines(siege.points[0].lat, siege.points[0].lon).map((c) => ({
      nom: c.nom,
      distanceKm: c.distanceKm,
      prixMaisonM2: c.prixMaison,
      prixAppartementM2: c.prixAppartement,
    })),
    communesDecoupeesEnQuartiers: communesDecoupees(),
    donneesAbsentes: ['évolution dans le temps', 'prix des terrains', 'volumes de transactions', 'délais de vente'],
  }

  const ouvertes = categoriesOuvertes(publies)
  const exclues = categoriesRecentes(publies)

  let choix
  let statistiques = []

  if (sujetImpose) {
    etape(1, 'Sujet imposé en ligne de commande — recherche web sautée')
    choix = {
      ville: villeImposee ?? COMMUNE_SIEGE,
      sujet: sujetImpose,
      angle: 'imposé',
      categorie: estCategorie(categorieImposee) ? categorieImposee : null,
      concurrence: [],
    }
    journal(`« ${sujetImpose} »`)
    // Sujet imposé : pas de recherche, donc pas de statistique extérieure
    // vérifiable. L'article se tiendra aux seuls relevés du site.
    journal('Aucune recherche web — aucune statistique extérieure ne pourra être citée.')
    // La rotation n'est pas non plus imposée ici, volontairement : `--sujet`
    // est la porte de sortie manuelle, employée quand on sait ce qu'on veut
    // publier. Lui opposer la règle des deux dernières catégories reviendrait
    // à refuser de traiter un sujet d'actualité parce qu'il tombe le mauvais
    // jour du mois.
    if (exclues.includes(choix.categorie)) {
      journal(`Catégorie « ${libelleDe(choix.categorie)} » récemment traitée — imposée malgré tout.`)
    }
    if (categorieImposee && !estCategorie(categorieImposee)) {
      journal(`Catégorie « ${categorieImposee} » inconnue — ignorée.`)
    }
  } else {
    etape(1, 'Recherche du sujet (Claude + recherche web)')
    journal(
      exclues.length > 0
        ? `Catégories fermées ce tour-ci : ${exclues.map(libelleDe).join(', ')}`
        : 'Aucune catégorie fermée — premier article catégorisé.',
    )

    const resultat = await chercheSujet(anthropic, compteur, {
      dejaPublies: publies.map((a) => ({ titre: a.titre, categorie: a.categorie })),
      ouvertes,
      exclues,
      secteur,
    })
    choix = resultat.choix
    if (villeImposee) choix.ville = villeImposee

    // La rotation ne tient que si elle est vérifiée. Un modèle qui rend une
    // catégorie fermée — ou inventée — fait échouer le passage : publier quand
    // même reviendrait à n'avoir écrit ni les catégories ni la règle.
    if (!ouvertes.some((c) => c.cle === choix.categorie)) {
      throw new Error(
        `Étape 1 : catégorie « ${choix.categorie ?? 'absente'} » hors des catégories ouvertes ` +
          `(${ouvertes.map((c) => c.cle).join(', ')}).`,
      )
    }

    // Confrontation des sources annoncées aux adresses réellement consultées.
    const { retenues, ecartees } = verifieSources(choix.statistiques, resultat.urls)
    statistiques = retenues

    journal(`Catégorie : ${libelleDe(choix.categorie)}`)
    journal(`Commune   : ${choix.ville}`)
    journal(`Sujet     : ${choix.sujet}`)
    journal(`Angle     : ${choix.angle}`)
    journal(`${resultat.urls.size} page(s) réellement consultée(s) par la recherche.`)

    for (const stat of retenues) journal(`Statistique retenue : ${stat.enonce} — ${stat.source}`)
    for (const stat of ecartees) {
      journal(
        `Statistique ÉCARTÉE (source non consultée) : ${stat.enonce} — ${stat.url ?? 'sans adresse'}`,
      )
    }
    for (const c of choix.concurrence ?? []) journal(`Déjà publié ailleurs : ${c.source} — ${c.titre}`)
  }

  etape(2, 'Données locales réelles (moteur d’estimation du site)')
  const commune = resoudreCommune(choix.ville)
  const donnees = await dossier({
    codeInsee: commune.codeInsee,
    ville: commune.nom,
    statistiquesExternes: statistiques,
  })
  journal(`${commune.nom} (${commune.codeInsee}) — maison ${donnees.commune.prixMaisonM2} €/m², appartement ${donnees.commune.prixAppartementM2} €/m²`)
  journal(`${donnees.voisines.length} communes voisines, ${donnees.quartiers.length} quartiers relevés`)
  journal(
    statistiques.length > 0
      ? `${statistiques.length} statistique(s) extérieure(s) vérifiée(s), citables en nommant leur source.`
      : 'Aucune statistique extérieure — aucune évolution ne pourra être citée.',
  )

  etape(3, 'Rédaction')
  const redaction = await redige(anthropic, compteur, { choix, donnees })
  journal(`« ${redaction.titre} » — ${compteMots(redaction)} mots, ${redaction.sections.length} sections, ${redaction.faq.length} questions en FAQ`)

  // Bornes que le schéma ne peut pas exprimer (voir la note sur `minItems`).
  // Un écart ne fait pas échouer le passage — un article de six cents mots
  // reste publiable — mais il doit se voir à la relecture.
  const mots = compteMots(redaction)
  if (redaction.sections.length < 3) journal(`Attention : ${redaction.sections.length} section(s), trois attendues au minimum.`)
  if (redaction.faq.length < 3) journal(`Attention : ${redaction.faq.length} question(s) en FAQ, trois attendues au minimum.`)
  if (mots < 800 || mots > 1200) journal(`Attention : ${mots} mots, hors de la cible 800–1 200.`)

  // Une source citée dans le texte mais absente des sources vérifiées serait
  // une référence apparue à la rédaction, donc jamais consultée. Le cas ne
  // devrait pas se produire — le modèle n'a pas le web à cette étape — mais
  // c'est précisément le genre de chose qu'on ne voit qu'en la cherchant.
  const urlsVerifiees = new Set(statistiques.map((s) => s.url))
  for (const source of redaction.sources ?? []) {
    if (!urlsVerifiees.has(source.url)) {
      journal(`Source apparue à la rédaction, NON vérifiée : ${source.source} — ${source.url}`)
    }
  }

  etape(4, 'Balisage structuré')
  journal('Article + FAQPage + fiche agence — posés au prérendu, à la construction du site.')

  etape(5, 'Illustration')
  const slug = essai ? `essai-${Date.now()}` : await slugDisponible(redaction.titre)
  const image = await illustration(
    {
      slug,
      requeteImage: redaction.requeteImage,
      graphique: redaction.graphique ? { ...redaction.graphique, releve: donnees.provenance.releves.join(', ') } : null,
    },
    journal,
  )
  if (!image) journal('Aucune illustration — l’article sera publié sans image.')

  const article = {
    slug,
    titre: redaction.titre,
    titreSeo: redaction.titreSeo,
    resume: redaction.resume,
    sujet: choix.sujet,
    angle: choix.angle,
    categorie: choix.categorie ?? null,
    ville: commune.nom,
    codeInsee: commune.codeInsee,
    datePublication: new Date().toISOString().slice(0, 10),
    auteur: agency.name,
    sections: redaction.sections,
    faq: redaction.faq,
    chiffresCites: redaction.chiffresCites,
    sources: redaction.sources ?? [],
    image,
    meta: {
      genere: 'auto',
      modele: MODELE,
      concurrence: choix.concurrence ?? [],
      statistiquesExternes: statistiques,
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

  etape(6, essai ? 'Publication — sautée (essai)' : 'Publication')
  if (essai) {
    const sortie = path.join(process.env.TMPDIR ?? '/tmp', `article-essai-${slug}.json`)
    await writeFile(sortie, `${JSON.stringify(article, null, 2)}\n`, 'utf8')
    journal(`Article écrit hors du dépôt : ${sortie}`)
  } else {
    const chemin = await ecrireArticle(article)
    journal(`Écrit : ${chemin}`)
    journal('Le commit et le déploiement sont du ressort du workflow.')
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

  process.exitCode = 1
})
