import { LegalPage } from '../components/ui/LegalPage'
import { methodologie } from '../data/methodologie'

/**
 * Méthodologie des prix — d'où viennent les chiffres que le site avance.
 *
 * Elle reprend le gabarit des pages légales : même en-tête, mêmes sections,
 * mêmes listes. Ce n'est pas une économie de moyens — c'est une page qui
 * s'engage, au même titre que les mentions légales, et qui doit se lire comme
 * telle plutôt que comme un argumentaire.
 *
 * Le contenu vit dans `src/data/methodologie.js`, avec le relevé de l'endroit
 * exact du code d'où sort chaque chiffre.
 */
export default function MethodologiePrix() {
  return (
    <LegalPage
      eyebrow="Transparence"
      title={methodologie.title}
      intro={methodologie.intro}
      sections={methodologie.sections}
    />
  )
}
