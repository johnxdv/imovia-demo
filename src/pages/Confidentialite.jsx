import { LegalPage } from '../components/ui/LegalPage'
import { agency } from '../data/agency'

export default function Confidentialite() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      intro="La manière dont nous traitons vos données lorsque vous utilisez ce site."
      sections={[
        {
          titre: 'Responsable du traitement',
          corps: [
            `${agency.name} est responsable des données collectées via ce site. Pour toute question, écrivez-nous à ${agency.email}.`,
          ],
        },
        {
          titre: 'Données collectées',
          corps: [
            'Nous ne collectons que les données que vous nous transmettez volontairement via nos formulaires : nom, email, téléphone et le contenu de votre message.',
            'Vos biens favoris sont enregistrés uniquement dans votre navigateur (stockage local). Ils ne nous sont pas transmis et ne quittent pas votre appareil.',
          ],
        },
        {
          titre: 'Finalités',
          corps: [
            'Les informations transmises servent exclusivement à répondre à votre demande et à assurer le suivi de votre projet immobilier. Elles ne sont ni vendues, ni cédées à des tiers.',
          ],
        },
        {
          titre: 'Durée de conservation',
          corps: [
            'Vos données sont conservées le temps nécessaire au traitement de votre demande, puis archivées ou supprimées conformément aux obligations légales applicables.',
          ],
        },
        {
          titre: 'Vos droits',
          corps: [
            'Conformément au RGPD, vous disposez d’un droit d’accès, de rectification, d’effacement et d’opposition sur vos données. Vous pouvez les exercer à tout moment en nous écrivant.',
          ],
        },
        {
          titre: 'Cookies',
          corps: [
            'Ce site n’utilise pas de cookie de suivi publicitaire. Seul un stockage local technique est utilisé pour mémoriser vos favoris.',
          ],
        },
      ]}
    />
  )
}
