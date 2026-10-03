// Les communes du secteur de l'agence, côté front.
//
// Le fichier source est `scripts/_data/communes-secteur.json` : c'est lui que lit
// la planification éditoriale pour choisir ses sujets, et il n'en existe qu'un
// exemplaire. Recopier la liste ici en créerait un second, et les deux
// divergeraient au premier ajout de commune — une page d'agence sans sujet
// possible, ou un sujet sans page où atterrir.
//
// L'import JSON traverse `scripts/` sans difficulté : Vite a pour racine le
// dépôt, pas `src/`.

import communes from '../../scripts/_data/communes-secteur.json'
import { slugify } from '../../api/_lib/articleTexte'

/**
 * Les communes desservies, chacune avec l'adresse de sa page d'agence.
 *
 * `distanceKm` est la distance à vol d'oiseau entre le centre de la commune et
 * celui de Diebling, relevée à la construction du fichier. C'est une donnée
 * mesurée, pas un argument : la page l'affiche telle quelle, et uniquement
 * parce qu'un visiteur qui cherche une agence veut savoir à quelle distance
 * elle se trouve.
 */
export const communesSecteur = communes.map((c) => ({
  nom: c.nom,
  codeInsee: c.codeInsee,
  distanceKm: c.distanceKm,
  slug: slugify(c.nom),
}))

/** Une commune par le slug de son adresse, ou `undefined`. */
export const communeParSlug = (slug) => communesSecteur.find((c) => c.slug === slug)

/**
 * La commune du siège, correctement casée.
 *
 * `agency.address.line2` vaut « 57980 DIEBLING » : c'est une ligne d'adresse
 * postale, et « installée à DIEBLING » au milieu d'une phrase se lit comme un
 * cri. Le nom tel qu'il s'écrit est ici, sur la seule commune à distance nulle.
 */
export const communeSiege = communesSecteur.find((c) => c.distanceKm === 0)?.nom ?? 'Diebling'

/** Adresse de la page d'agence d'une commune — même forme que `lienInterne`. */
export const urlAgence = (nom) => `/agence-immobiliere/${slugify(nom)}`
