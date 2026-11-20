import { PageHeader } from '../components/ui/PageHeader'
import { Section } from '../components/ui/Section'
import { PropertyListing } from '../components/property/PropertyListing'

export default function Louer() {
  return (
    <>
      <PageHeader
        tone="white"
        eyebrow="Louer"
        eyebrowClassName="!text-sm sm:!text-base !text-bottle"
        title="Nos biens à la location"
        intro="Découvrez les biens actuellement disponibles. Affinez selon vos critères, puis contactez-nous pour organiser une visite."
      />
      <Section tone="white" py="pb-24 pt-4 sm:pb-28">
        <PropertyListing transaction="location" />
      </Section>
    </>
  )
}
