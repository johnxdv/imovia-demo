import { DPE_SCALE } from '../../lib/format'

/**
 * Échelle A→G (DPE ou GES) en traitement monochrome — la lettre active est
 * remplie en Brass, les autres restent en filet discret. On reste dans la
 * palette (pas d'arc-en-ciel réglementaire) pour préserver la cohérence visuelle.
 * La couleur de base est héritée (currentColor) : lisible sur Ink comme sur Stone.
 */
export function DpeScale({ label, value, className = '' }) {
  return (
    <div className={className}>
      <div className="mb-2 font-mono text-[0.7rem] uppercase tracking-micro opacity-60">{label}</div>
      <div className="flex items-stretch gap-1" role="img" aria-label={`${label} : ${value}`}>
        {DPE_SCALE.map((letter) => {
          const active = letter === value
          return (
            <span
              key={letter}
              aria-hidden="true"
              className={[
                'flex h-8 w-7 items-center justify-center border font-mono text-xs',
                active
                  ? 'border-brass bg-brass text-ink'
                  : 'border-current text-current opacity-40',
              ].join(' ')}
            >
              {letter}
            </span>
          )
        })}
      </div>
    </div>
  )
}
