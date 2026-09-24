// Libellés des catégories éditoriales, côté front.
//
// La liste de référence vit dans `scripts/_lib/categories.mjs`, avec la
// consigne de rédaction de chaque catégorie et la règle de rotation. Seuls les
// libellés sont repris ici : le front n'a rien à décider, il affiche.
//
// Les deux listes doivent porter les mêmes clés. Une clé inconnue s'affiche
// telle quelle plutôt que de disparaître — un article catégorisé par une
// version plus récente du script reste lisible dans l'administration.

const LIBELLES = {
  'comparaison-prix': 'Comparaison de prix',
  'guide-achat': 'Guide d’achat',
  'entretien-travaux': 'Entretien et travaux',
  'qualite-de-vie': 'Qualité de vie',
  'conseils-vente': 'Conseils pour vendre',
  'actualite-marche': 'Actualité du marché',
}

/** Libellé lisible d'une catégorie. */
export function libelleCategorie(cle) {
  if (!cle) return 'Sans catégorie'
  return LIBELLES[cle] ?? cle
}
