// Titre d'onglet et méta-description de chaque route applicative.
//
// POURQUOI CE FICHIER EXISTE ET NON DEUX LISTES
//
// Le prérendu écrit ces valeurs dans le HTML brut ; l'application les repose
// au montage, parce qu'une navigation interne ne recharge pas le document. Les
// deux doivent dire la même chose : quand ils divergeaient, le robot lisait le
// titre du prérendu et Google, qui exécute le JavaScript, celui de
// l'application — « Acheter — IMMOVIA » là où la page annonçait « Biens à
// vendre en Moselle-Est ». Une seule table, lue des deux côtés.
//
// LES DESCRIPTIONS FONT TOUTES ENTRE 140 ET 160 CARACTÈRES. En dessous, une
// page de résultats complète la ligne avec ce qu'elle trouve ; au-dessus, elle
// coupe, et ce qui saute est la fin. `verifieDescriptions`
// (`scripts/_lib/pages-site.mjs`) fait échouer la construction si l'une d'elles
// sort de l'intervalle — une consigne de longueur qu'on ne vérifie pas ne tient
// pas une saison.

export const META_PAGES = {
  '/': {
    titre: 'IMMOVIA — Agence immobilière · Diebling',
    description:
      'IMMOVIA, agence immobilière indépendante à Diebling, en Moselle-Est. Vente, location et estimation en ligne gratuite de votre bien en quelques minutes.',
  },
  '/estimer': {
    titre: 'Estimation immobilière gratuite en ligne — IMMOVIA',
    description:
      'Estimez gratuitement votre maison, appartement ou terrain en Moselle-Est. Résultat immédiat à partir de l’adresse, de la surface et de l’état du bien.',
  },
  '/acheter': {
    titre: 'Biens à vendre en Moselle-Est — IMMOVIA',
    description:
      'Maisons, appartements et terrains à vendre en Moselle-Est, proposés par IMMOVIA. Consultez les biens disponibles et organisez une visite avec l’agence.',
  },
  '/louer': {
    titre: 'Biens à louer en Moselle-Est — IMMOVIA',
    description:
      'Appartements et maisons à louer en Moselle-Est, proposés par IMMOVIA. Consultez les biens disponibles et organisez une visite avec l’agence de Diebling.',
  },
  '/vendre': {
    titre: 'Vendre son bien immobilier en Moselle-Est — IMMOVIA',
    description:
      'Vendre sa maison ou son appartement en Moselle-Est avec IMMOVIA : estimation, stratégie, diffusion, sélection des acquéreurs et signature chez le notaire.',
  },
  '/equipe': {
    titre: 'L’équipe de l’agence — IMMOVIA',
    description:
      'Lucas Bella et Émilie Andraschke, l’équipe de l’agence IMMOVIA à Diebling. Contactez directement le conseiller de votre choix pour votre projet immobilier.',
  },
  '/contact': {
    titre: 'Contact — IMMOVIA, agence immobilière à Diebling',
    description:
      'Contactez IMMOVIA, agence immobilière à Diebling : 41A rue Principale, 03 72 29 43 76. Horaires, plan d’accès et formulaire pour parler de votre projet.',
  },
  '/recrutement': {
    titre: 'Recrutement — rejoindre IMMOVIA',
    description:
      'IMMOVIA recrute en Moselle-Est. Rejoignez une agence immobilière où proximité, exigence et innovation donnent une autre dimension au métier de conseiller.',
  },
  '/espace-vendeur': {
    titre: 'Espace vendeur — IMMOVIA',
    description:
      'Espace client IMMOVIA : connectez-vous pour suivre la commercialisation de votre bien, les visites réalisées, les retours des acquéreurs et les offres.',
  },
  '/mentions-legales': {
    titre: 'Mentions légales — IMMOVIA',
    description:
      'Mentions légales du site IMMOVIA : éditeur, direction de la publication, carte professionnelle, hébergement et médiation de la consommation immobilière.',
  },
  '/confidentialite': {
    titre: 'Politique de confidentialité — IMMOVIA',
    description:
      'Politique de confidentialité d’IMMOVIA : données collectées, finalités, bases légales, durées de conservation, destinataires et exercice de vos droits RGPD.',
  },
  '/plan-du-site': {
    titre: 'Plan du site — IMMOVIA',
    description:
      'Toutes les pages du site IMMOVIA : achat, location, vente, estimation, articles sur le marché de la Moselle-Est et ensemble des biens actuellement en ligne.',
  },
}
