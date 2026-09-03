import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { availableFor, distinctValues, filterProperties } from '../../lib/properties'
import { PropertyGrid } from '../ui/PropertyGrid'
import { formatNumber } from '../../lib/format'

const selectClass =
  'w-full appearance-none border border-ink/15 bg-white px-3 py-2.5 font-sans text-sm text-ink focus:border-brass focus:outline-none'
const inputClass =
  'w-full border border-ink/15 bg-white px-3 py-2.5 font-mono text-sm text-ink placeholder:text-ink/40 focus:border-brass focus:outline-none'

function FieldLabel({ children }) {
  return (
    <span className="mb-2 block font-mono text-[0.62rem] uppercase tracking-micro text-white">
      {children}
    </span>
  )
}

/**
 * Listing filtrable, partagé entre les pages Acheter et Louer.
 * Les critères s'initialisent depuis l'URL (barre de recherche du hero).
 */
export function PropertyListing({ transaction }) {
  const base = useMemo(() => availableFor(transaction), [transaction])
  const typesBien = useMemo(() => distinctValues(base, 'typeBien'), [base])
  const villes = useMemo(() => distinctValues(base, 'ville'), [base])

  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState({
    typeBien: searchParams.get('type') || '',
    ville: searchParams.get('ville') || '',
    budgetMax: searchParams.get('budgetMax') || '',
    surfaceMin: searchParams.get('surfaceMin') || '',
  })

  const update = (key) => (e) => {
    const value = e.target.value
    setFilters((f) => ({ ...f, [key]: value }))
    // Reflet léger dans l'URL (partage / rafraîchissement).
    const next = new URLSearchParams(searchParams)
    const paramKey = { typeBien: 'type', ville: 'ville', budgetMax: 'budgetMax', surfaceMin: 'surfaceMin' }[key]
    if (value) next.set(paramKey, value)
    else next.delete(paramKey)
    setSearchParams(next, { replace: true })
  }

  const reset = () => {
    setFilters({ typeBien: '', ville: '', budgetMax: '', surfaceMin: '' })
    setSearchParams({}, { replace: true })
  }

  const results = useMemo(() => filterProperties(base, filters), [base, filters])
  const hasFilters = Object.values(filters).some(Boolean)
  const resultsRef = useRef(null)

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div>
      {/* Filtres — grand encadré bleu marine */}
      <div className="bg-ink p-5 text-stone sm:p-8">
        <div className="mb-5 flex items-center gap-2.5">
          <SlidersHorizontal className="h-4 w-4 text-brass" strokeWidth={1.6} aria-hidden="true" />
          <span className="font-mono text-[0.7rem] uppercase tracking-micro">Affiner la recherche</span>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <FieldLabel>Type de bien</FieldLabel>
            <select className={selectClass} value={filters.typeBien} onChange={update('typeBien')}>
              <option value="">Tous les types</option>
              {typesBien.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>Localisation</FieldLabel>
            <select className={selectClass} value={filters.ville} onChange={update('ville')}>
              <option value="">Toutes les villes</option>
              {villes.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>Budget max {transaction === 'location' ? '(€/mois)' : '(€)'}</FieldLabel>
            <input
              type="number"
              min="0"
              step={transaction === 'location' ? '100' : '10000'}
              placeholder="Indifférent"
              className={inputClass}
              value={filters.budgetMax}
              onChange={update('budgetMax')}
            />
          </label>
          <label>
            <FieldLabel>Surface min (m²)</FieldLabel>
            <input
              type="number"
              min="0"
              step="5"
              placeholder="Indifférent"
              className={inputClass}
              value={filters.surfaceMin}
              onChange={update('surfaceMin')}
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={scrollToResults}
            className="inline-flex items-center justify-center gap-2.5 bg-stone px-8 py-3.5 font-mono text-[0.72rem] uppercase tracking-micro text-ink transition-colors duration-300 ease-plan hover:bg-stone/90"
          >
            <Search className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Rechercher
          </button>
        </div>
      </div>

      {/* Compteur + reset */}
      <div ref={resultsRef} className="mt-8 flex scroll-mt-28 items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-micro text-ink/70">
          {formatNumber(results.length)} {results.length > 1 ? 'biens' : 'bien'}
        </p>
        {hasFilters ? (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-micro text-brass transition-colors hover:text-brass/80"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden="true" />
            Réinitialiser
          </button>
        ) : null}
      </div>

      <div className="mt-8">
        <PropertyGrid properties={results} />
      </div>
    </div>
  )
}
