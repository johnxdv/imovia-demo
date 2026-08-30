import { PageHeader } from '../components/ui/PageHeader'
import { Section } from '../components/ui/Section'
import { PropertyListing } from '../components/property/PropertyListing'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export default function Acheter() {
  useDocumentTitle('Acheter')
  return (
    <>
      <PageHeader
        eyebrow="Acheter"
        title="Nos biens à la vente"
        intro="Une sélection resserrée, du centre de Bordeaux au Bassin d’Arcachon. Affinez selon vos critères, puis contactez-nous pour organiser une visite."
      />
      <Section tone="ink" py="pb-24 pt-4 sm:pb-28">
        <PropertyListing transaction="vente" />
      </Section>
    </>
  )
}
