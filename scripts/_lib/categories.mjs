// Catégories éditoriales du blog, et leur rotation.
//
// POURQUOI UNE ROTATION PLUTÔT QU'UNE SIMPLE LISTE DE SUJETS DÉJÀ TRAITÉS
//
// Interdire les sujets déjà publiés ne suffit pas à varier : un modèle à qui
// l'on demande six fois « un angle sur le marché local » produit six
// comparaisons de prix qui ne se répètent jamais mot pour mot, mais qui se
// ressemblent toutes. La contrainte doit porter sur la NATURE du sujet, pas
// sur sa formulation.
//
// D'où ces six catégories, et la règle : le sujet retenu appartient à une
// catégorie différente de celle des deux derniers articles publiés. Sur six
// articles par mois, cela garantit qu'un lecteur qui arrive sur le blog ne
// tombe pas sur trois tableaux de prix d'affilée.
//
// TOUTES NE REPOSENT PAS SUR DES CHIFFRES, ET C'EST VOULU
//
// Le pool de points de référence ne renseigne que des prix. Quatre des six
// catégories (guide d'achat, travaux, qualité de vie, conseils de vente) n'ont
// donc aucune donnée interne à citer : elles s'écrivent sur ce que l'étape 1 a
// trouvé et sourcé, ou sans chiffre du tout. C'est parfaitement acceptable —
// un article de conseil n'a pas besoin d'un tableau pour être utile.

export const CATEGORIES = [
  {
    cle: 'comparaison-prix',
    libelle: 'Comparaison de prix par quartier ou par commune',
    consigne:
      'Comparer les prix au m² relevés entre plusieurs quartiers d’une même ville, ou entre communes voisines. C’est la seule catégorie entièrement documentée par les données internes du site.',
  },
  {
    cle: 'guide-achat',
    libelle: 'Guide d’achat pour la zone',
    consigne:
      'Financement, aides locales et nationales, fiscalité applicable au secteur, frais à prévoir. Les dispositifs et leurs montants doivent venir de sources officielles trouvées à la recherche, jamais de mémoire.',
  },
  {
    cle: 'entretien-travaux',
    libelle: 'Entretien et travaux de la maison selon la saison',
    consigne:
      'Ce qu’il faut faire au bien à cette période de l’année, en tenant compte du climat lorrain et du bâti local. Catégorie sans chiffre du site : elle s’écrit par l’expérience du métier.',
  },
  {
    cle: 'qualite-de-vie',
    libelle: 'Qualité de vie d’un quartier ou d’une commune',
    consigne:
      'Écoles, commerces, transports, services. Tout fait avancé (nombre d’écoles, ligne de bus, temps de trajet) doit venir d’une source trouvée à la recherche et citée dans l’article.',
  },
  {
    cle: 'conseils-vente',
    libelle: 'Conseils pour bien vendre localement',
    consigne:
      'Préparation du bien, dossier de diagnostics, erreurs de prix, déroulé des visites — rapporté aux réalités du secteur, pas des conseils valables partout.',
  },
  {
    cle: 'actualite-marche',
    libelle: 'Actualité et évolution du marché',
    consigne:
      'Ne peut être retenue QUE si la recherche a trouvé une source datée et identifiable publiant une évolution chiffrée (chambre des notaires, INSEE, étude, presse). Sans une telle source, choisir une autre catégorie : cette évolution ne peut pas être déduite des données du site.',
  },
]

export const CLES = CATEGORIES.map((c) => c.cle)

/** Une clé de catégorie est-elle connue ? */
export const estCategorie = (cle) => CLES.includes(cle)

/** Libellé d'une catégorie, ou la clé elle-même si elle est inconnue. */
export const libelleDe = (cle) => CATEGORIES.find((c) => c.cle === cle)?.libelle ?? cle

/**
 * Catégories des deux derniers articles publiés.
 *
 * Les articles sans catégorie sont ignorés plutôt que de compter pour un tour :
 * un article saisi à la main depuis `/seo` n'en porte pas, et il ne doit pas
 * consommer un cran de la rotation — sinon deux dépannages d'affilée
 * rouvriraient toutes les catégories d'un coup.
 */
export function categoriesRecentes(publies, combien = 2) {
  return publies
    .map((a) => a.categorie)
    .filter(estCategorie)
    .slice(0, combien)
}

/**
 * Rang d'ancienneté d'une catégorie : 0 pour le dernier article publié, et
 * `Infinity` pour une catégorie jamais employée.
 */
function ancienneteDe(publies, cle) {
  const rang = publies.filter((a) => estCategorie(a.categorie)).findIndex((a) => a.categorie === cle)
  return rang === -1 ? Infinity : rang
}

/**
 * Catégories ouvertes au prochain article, **la plus délaissée en tête**.
 *
 * L'ordre n'est pas cosmétique, il corrige un défaut mesuré. La règle seule —
 * « une catégorie différente des deux derniers articles » — est respectée par
 * un cycle de trois : comparaison, guide, travaux, comparaison, guide,
 * travaux… Aucune répétition rapprochée, et pourtant trois des six catégories
 * ne sortent jamais. Une simulation sur douze articles avec un modèle qui
 * prend systématiquement la première proposition le montre en une passe.
 *
 * Présenter les catégories de la moins récemment traitée à la plus récente
 * suffit à casser le cycle sans rien interdire de plus : la règle reste celle
 * des deux derniers articles, seul l'ordre des propositions change.
 *
 * Ne rend jamais une liste vide : six catégories, deux exclues au plus.
 */
export function categoriesOuvertes(publies) {
  const exclues = new Set(categoriesRecentes(publies))

  return CATEGORIES.filter((c) => !exclues.has(c.cle)).sort(
    (a, b) => ancienneteDe(publies, b.cle) - ancienneteDe(publies, a.cle),
  )
}
