import { LegalPage } from '../components/ui/LegalPage'
import { agency } from '../data/agency'

export default function MentionsLegales() {
  return (
    <LegalPage
      title="Mentions légales"
      intro="Informations relatives à l’éditeur et à l’hébergement de ce site."
      sections={[
        {
          titre: 'Éditeur du site',
          corps: [
            `${agency.name}, agence immobilière. ${agency.address.line1}, ${agency.address.line2}.`,
            `Téléphone : ${agency.phone} — Email : ${agency.email}.`,
            'SARL au capital de 10 000 € — RCS Bordeaux 000 000 000. Carte professionnelle « Transactions sur immeubles et fonds de commerce » CPI 3300 2024 000 000 000, délivrée par la CCI de Bordeaux.',
          ],
        },
        {
          titre: 'Directeur de la publication',
          corps: ['La direction de l’agence assure la responsabilité éditoriale du présent site.'],
        },
        {
          titre: 'Hébergement',
          corps: [
            'Ce site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.',
          ],
        },
        {
          titre: 'Propriété intellectuelle',
          corps: [
            'L’ensemble des contenus de ce site (textes, mise en page, éléments graphiques) est protégé. Toute reproduction sans autorisation est interdite.',
            'Les visuels des biens présentés sont des photographies d’illustration dans le cadre de ce démonstrateur.',
          ],
        },
        {
          titre: 'Démonstrateur',
          corps: [
            'Ce site est une démonstration. Les biens, coordonnées et informations affichés sont fictifs et fournis à titre d’exemple.',
          ],
        },
      ]}
    />
  )
}
