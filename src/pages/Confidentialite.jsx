import { LegalPage } from '../components/ui/LegalPage'
import { agency } from '../data/agency'

export default function Confidentialite() {
  const { legal } = agency
  return (
    <LegalPage
      title="Politique de confidentialité"
      intro="La manière dont nous traitons vos données lorsque vous utilisez ce site, et les droits dont vous disposez."
      sections={[
        {
          titre: 'Objet',
          corps: [
            `${agency.name} attache une attention particulière au respect de la vie privée de ses visiteurs. Cette politique explique quelles données personnelles sont collectées, pourquoi, et comment les faire valoir vos droits. Elle peut être mise à jour pour rester conforme à la réglementation en vigueur.`,
          ],
        },
        {
          titre: 'Responsable du traitement',
          corps: [
            `Le responsable du traitement est ${legal.directeurPublication}, dirigeant d’${agency.name}, ${legal.formeJuridique} au capital de ${legal.capital}, SIRET ${legal.siret}, dont le siège social est situé ${legal.siegeSocial.line1}, ${legal.siegeSocial.line2}.`,
            `En cas de litige non résolu directement avec nous, vous pouvez saisir gratuitement le médiateur de la consommation ${legal.mediation.nom} (${legal.mediation.adresse} — ${legal.mediation.site} — ${legal.mediation.email}).`,
          ],
        },
        {
          titre: 'Données collectées',
          corps: [
            'Nous ne collectons que les données que vous nous transmettez volontairement via nos formulaires (Contact, Estimation, Recrutement, contact direct d’un conseiller) : identité, coordonnées (email, téléphone, commune), nature de votre projet immobilier et contenu de votre message.',
            'Vos biens favoris sont enregistrés uniquement dans le stockage local de votre navigateur. Ils ne nous sont jamais transmis et ne quittent pas votre appareil.',
          ],
        },
        {
          titre: 'Finalités',
          corps: [
            'Les informations transmises via nos formulaires servent exclusivement à répondre à votre demande, assurer le suivi de votre projet immobilier, et — si vous l’avez expressément accepté — vous adresser des informations ou offres commerciales. Elles ne sont ni vendues, ni cédées à des tiers.',
          ],
        },
        {
          titre: 'Destinataires et sous-traitants',
          corps: [
            'Vos données sont destinées au conseiller que vous contactez et, en copie, à l’agence. Leur envoi est assuré par Resend (service d’acheminement d’e-mails transactionnels) ; l’hébergement du site est assuré par Vercel Inc. Ces prestataires n’accèdent à vos données que dans la stricte mesure nécessaire à l’exécution de leur prestation.',
          ],
        },
        {
          titre: 'Durée de conservation',
          corps: [
            'Vos données sont conservées le temps nécessaire au traitement de votre demande et au suivi commercial qui en découle, puis supprimées ou archivées conformément aux obligations légales applicables.',
          ],
        },
        {
          titre: 'Vos droits',
          corps: [
            'Conformément au Règlement Général sur la Protection des Données et à la loi Informatique et Libertés, vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation et d’opposition sur vos données, ainsi que du droit de définir des directives relatives à leur sort après votre décès. Vous pouvez exercer ces droits à tout moment en nous écrivant aux coordonnées ci-dessous.',
          ],
        },
        {
          titre: 'Cookies et mesure d’audience',
          corps: [
            'Ce site ne dépose aucun cookie publicitaire ni aucun outil de mesure d’audience à ce jour. Un stockage local technique (et non un cookie) est utilisé pour mémoriser vos favoris sur cet appareil. Les polices de caractères sont chargées depuis les serveurs de Google Fonts, ce qui implique une requête technique vers ce service lors de l’affichage des pages.',
          ],
        },
        {
          titre: 'Contact',
          corps: [`Pour toute question relative à vos données : ${agency.email} — ${agency.phone}.`],
        },
      ]}
    />
  )
}
