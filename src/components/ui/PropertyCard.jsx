import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { PlanFrame } from './PlanFrame'
import { Badge } from './Badge'
import { FavoriteButton } from './FavoriteButton'
import { formatPrice, formatSurface, photoUrl, photoSrcSet } from '../../lib/format'

export function PropertyCard({ property }) {
  const { reference, titre, typeBien, typeTransaction, prix, ville, surface, pieces, photos, statut } =
    property
  const sold = statut === 'vendu'
  const cover = photos?.[0]
  const to = `/bien/${reference}`
  const transactionLabel = sold ? 'Vendu' : typeTransaction === 'location' ? 'À louer' : 'À vendre'

  return (
    <article className="group relative bg-ink transition-transform duration-500 ease-plan will-change-transform hover:-translate-y-1.5">
      <Link
        to={to}
        className="block focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass"
        aria-label={`${titre} à ${ville} — ${formatPrice(prix, typeTransaction)}`}
      >
        {/* Visuel */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={photoUrl(cover, { w: 900 })}
            srcSet={photoSrcSet(cover)}
            sizes="(min-width:1024px) 30vw, (min-width:640px) 45vw, 92vw"
            alt={`${typeBien} à ${ville} — ${titre}`}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover transition-transform duration-700 ease-plan group-hover:scale-[1.05] ${
              sold ? 'grayscale-[0.3]' : ''
            }`}
          />
          {/* Voile Ink Navy pour unifier les visuels */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent" />
          {/* Données en overlay bas de carte (ville · surface) */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-stone opacity-95 transition-transform duration-500 ease-plan [@media(hover:hover)]:translate-y-1 [@media(hover:hover)]:group-hover:translate-y-0">
            <span className="inline-flex items-center gap-1.5 font-mono text-xs">
              <MapPin className="h-3.5 w-3.5 text-brass" strokeWidth={1.75} aria-hidden="true" />
              {ville}
            </span>
            <span className="font-mono text-xs">{formatSurface(surface)}</span>
          </div>
        </div>

        {/* Légende */}
        <div className="px-4 pb-6 pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-[0.66rem] uppercase tracking-micro text-brass">
              {transactionLabel}
            </span>
            <span className="font-mono text-[0.66rem] text-stone/45">{reference}</span>
          </div>
          <h3 className="mt-2 font-display text-xl font-medium leading-snug text-stone">{titre}</h3>
          <div className="mt-3 flex items-baseline justify-between gap-3">
            <span className="font-mono text-base text-brass">{formatPrice(prix, typeTransaction)}</span>
            <span className="font-mono text-xs text-stone/55">
              {typeBien} · {pieces} {pieces > 1 ? 'pièces' : 'pièce'}
            </span>
          </div>
        </div>
      </Link>

      <PlanFrame />

      {/* Contrôles superposés (hors du lien) */}
      {sold ? (
        <div className="absolute left-3 top-3 z-30">
          <Badge variant="brass">Vendu</Badge>
        </div>
      ) : null}
      <div className="absolute right-3 top-3 z-30">
        <FavoriteButton reference={reference} onCard />
      </div>
    </article>
  )
}
