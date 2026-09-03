import { PageHeader } from '../components/ui/PageHeader'
import { Section } from '../components/ui/Section'
import { PropertyListing } from '../components/property/PropertyListing'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export default function Acheter() {
  useDocumentTitle('Acheter')
  return (
    <>
      <PageHeader
        tone="white"
        eyebrow="Acheter"
        eyebrowClassName="!text-sm sm:!text-base !text-bottle"
        title="Nos biens à la vente"
        intro="Découvrez les biens actuellement disponibles. Affinez selon vos critères, puis contactez-nous pour organiser une visite."
      />
      <Section tone="white" py="pb-24 pt-4 sm:pb-28">
        <PropertyListing transaction="vente" />
      </Section>
    </>
  )
}
