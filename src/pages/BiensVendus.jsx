import { PageHeader } from '../components/ui/PageHeader'
import { Section } from '../components/ui/Section'
import { PropertyGrid } from '../components/ui/PropertyGrid'
import { soldProperties } from '../lib/properties'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export default function BiensVendus() {
  useDocumentTitle('Nos biens vendus')
  const biens = soldProperties()
  return (
    <>
      <PageHeader
        eyebrow="Références"
        title="Nos biens vendus"
        intro="Quelques transactions que nous avons menées, du centre de Bordeaux au Bassin d’Arcachon. Une idée concrète de ce que nous savons vendre."
      />
      <Section tone="ink" py="pb-24 pt-4 sm:pb-28">
        <PropertyGrid
          properties={biens}
          emptyLabel="Aucun bien vendu à afficher pour le moment."
        />
      </Section>
    </>
  )
}
