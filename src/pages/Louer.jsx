import { PageHeader } from '../components/ui/PageHeader'
import { Section } from '../components/ui/Section'
import { PropertyListing } from '../components/property/PropertyListing'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export default function Louer() {
  useDocumentTitle('Louer')
  return (
    <>
      <PageHeader
        eyebrow="Louer"
        title="Nos biens à la location"
        intro="Des locations vérifiées, meublées ou nues, à Bordeaux et sur le Bassin d’Arcachon. Affinez votre recherche, puis écrivez-nous pour visiter."
      />
      <Section tone="ink" py="pb-24 pt-4 sm:pb-28">
        <PropertyListing transaction="location" />
      </Section>
    </>
  )
}
