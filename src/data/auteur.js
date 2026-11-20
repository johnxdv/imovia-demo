import { agency } from './agency.js'
import { team } from './team.js'

/**
 * L'auteur des articles du blog.
 *
 * TOUT CE QUI SUIT EXISTE DÉJÀ AILLEURS SUR LE SITE, et rien d'autre n'y est
 * ajouté : le nom et la fonction viennent de la page Équipe (`team.js`), la
 * direction de la publication et la carte professionnelle des mentions
 * légales. Pas de biographie, pas de parcours, pas d'années d'expérience —
 * aucune de ces informations n'est écrite nulle part dans ce projet, et une
 * page auteur qui les inventerait ferait l'inverse de ce qu'on attend d'elle.
 *
 * La page est donc courte. C'est un état de fait, pas un choix de rédaction :
 * ce qu'il faudrait pour l'étoffer est listé dans le message de livraison.
 */
const membre = team.find((m) => m.id === 'lucas')

export const auteur = {
  slug: 'lucas-bella',
  // « Lucas BELLA » est la forme de la page Équipe, où les patronymes sont en
  // capitales. Dans une signature et dans un balisage `Person`, le nom
  // s'écrit normalement.
  nom: 'Lucas Bella',
  nomAffiche: membre.nom,
  role: membre.role,
  telephone: membre.phone,
  photo: membre.photo,
  url: '/auteur/lucas-bella',
  // Fait vérifiable, tiré des mentions légales de ce même site.
  directeurPublication: agency.legal.directeurPublication === membre.nom,
}
