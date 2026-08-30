import { Heart } from 'lucide-react'
import { useFavorites } from '../../lib/favorites'

/**
 * Bouton favori (cœur). Persistance locale via le contexte Favoris.
 * `onCard` : variante posée sur une carte (fond Ink translucide).
 */
export function FavoriteButton({ reference, onCard = false, className = '' }) {
  const { isFavorite, toggle } = useFavorites()
  const active = isFavorite(reference)

  const handle = (e) => {
    // Empêche la navigation quand le bouton est superposé à un lien de carte.
    e.preventDefault()
    e.stopPropagation()
    toggle(reference)
  }

  const cardStyle = onCard
    ? 'bg-ink/55 backdrop-blur-sm text-stone hover:text-brass'
    : 'text-current hover:text-brass'

  return (
    <button
      type="button"
      onClick={handle}
      aria-pressed={active}
      aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      title={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={`inline-flex h-9 w-9 items-center justify-center border border-brass/30 transition-colors duration-300 ease-plan hover:border-brass ${cardStyle} ${className}`}
    >
      <Heart className="h-4 w-4" strokeWidth={1.5} fill={active ? '#B08D57' : 'none'} color={active ? '#B08D57' : 'currentColor'} />
    </button>
  )
}
