import { PropertyCard } from './PropertyCard'
import { RevealGroup, RevealChild } from './Reveal'

/**
 * Grille de biens à révélation échelonnée.
 */
export function PropertyGrid({
  properties,
  columns = 3,
  emptyLabel = 'Aucun bien ne correspond à votre recherche.',
}) {
  if (!properties?.length) {
    return (
      <div className="border border-brass/20 px-6 py-16 text-center">
        <p className="font-mono text-sm opacity-70">{emptyLabel}</p>
      </div>
    )
  }

  const cols = columns === 2 ? 'md:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'

  return (
    <RevealGroup className={`grid grid-cols-1 gap-x-6 gap-y-12 ${cols}`}>
      {properties.map((property) => (
        <RevealChild key={property.reference}>
          <PropertyCard property={property} />
        </RevealChild>
      ))}
    </RevealGroup>
  )
}
