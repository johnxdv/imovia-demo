import { LegalPage } from '../components/ui/LegalPage'
import { agency } from '../data/agency'

export default function MentionsLegales() {
  const { legal } = agency
  return (
    <LegalPage
      title="Mentions légales"
      intro="Informations relatives à l’éditeur, à la direction de la publication et à l’hébergement de ce site."
      sections={[
        {
          titre: 'Éditeur du site',
          corps: [
            `${agency.name}, agence immobilière. ${agency.address.line1}, ${agency.address.line2}.`,
            `Téléphone : ${agency.phone} — Email : ${agency.email}.`,
            `${legal.formeJuridique} au capital de ${legal.capital} — ${legal.rcs} — SIRET ${legal.siret} — TVA intracommunautaire ${legal.tva}.`,
            `Carte professionnelle « Transactions sur immeubles et fonds de commerce » ${legal.carteProfessionnelle}, délivrée par ${legal.carteDelivreePar}. ${agency.name} ne détient pas de fonds, effets ou valeurs pour le compte de tiers.`,
          ],
        },
        {
          titre: 'Directeur de la publication',
          corps: [`${legal.directeurPublication}, en qualité de dirigeant d’${agency.name}.`],
        },
        {
          titre: 'Médiation de la consommation',
          corps: [
            `Conformément aux articles L.616-1 et R.616-1 du Code de la consommation, ${agency.name} propose un dispositif de médiation de la consommation. L’entité retenue est ${legal.mediation.nom} (${legal.mediation.adresse}), joignable via ${legal.mediation.site} ou par email à ${legal.mediation.email}.`,
          ],
        },
        {
          titre: 'Hébergement',
          corps: ['Ce site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.'],
        },
        {
          titre: 'Propriété intellectuelle',
          corps: [
            `L’ensemble des contenus de ce site (textes, mise en page, éléments graphiques, logo) est la propriété d’${agency.name}, sauf mention contraire. Toute reproduction ou représentation, totale ou partielle, sans autorisation expresse est interdite.`,
            'Les photographies des biens présentés sont, pour tout ou partie, des visuels d’illustration.',
          ],
        },
        {
          titre: 'Liens externes',
          corps: [
            `${agency.name} ne peut être tenue responsable du contenu des sites vers lesquels ce site renvoie, ni des sites qui renverraient vers celui-ci.`,
          ],
        },
        {
          titre: 'Droit applicable',
          corps: ['Le présent site et les présentes mentions légales sont soumis au droit français.'],
        },
      ]}
    />
  )
}
