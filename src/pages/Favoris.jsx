import { Heart } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Section } from '../components/ui/Section'
import { PropertyGrid } from '../components/ui/PropertyGrid'
import { Button } from '../components/ui/Button'
import { useFavorites } from '../lib/favorites'
import { getByReference } from '../lib/properties'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export default function Favoris() {
  useDocumentTitle('Mes favoris')
  const { favorites } = useFavorites()
  const biens = favorites.map(getByReference).filter(Boolean)

  return (
    <>
      <PageHeader
        eyebrow="Mes favoris"
        title="Les biens que vous avez retenus."
        intro="Votre sélection est enregistrée sur cet appareil. Ajoutez ou retirez un bien depuis le cœur présent sur chaque carte."
      />

      <Section tone="ink" py="pb-24 pt-4 sm:pb-28">
        {biens.length ? (
          <PropertyGrid properties={biens} />
        ) : (
          <div className="flex flex-col items-center border border-brass/20 px-6 py-20 text-center">
            <Heart className="h-8 w-8 text-brass" strokeWidth={1.4} aria-hidden="true" />
            <h2 className="mt-6 font-display text-2xl text-stone">Aucun favori pour l’instant.</h2>
            <p className="mt-3 max-w-sm text-sm text-stone/65">
              Parcourez notre sélection et enregistrez les biens qui vous intéressent pour les
              retrouver ici.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button to="/acheter" variant="primary">
                Biens à vendre
              </Button>
              <Button to="/louer" variant="outline" className="text-stone">
                Biens à louer
              </Button>
            </div>
          </div>
        )}
      </Section>
    </>
  )
}
