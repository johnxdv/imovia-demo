/**
 * Repères d'angle façon plan architectural (pas d'ombre portée, pas de grand
 * arrondi). À placer dans un parent `relative`. Réagit au survol d'un parent
 * `.group` : les équerres s'allongent légèrement.
 */
export function PlanFrame({ className = '' }) {
  const base =
    'pointer-events-none absolute h-3.5 w-3.5 border-brass/70 transition-all duration-500 ease-plan group-hover:h-5 group-hover:w-5 group-hover:border-brass'
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 z-20 ${className}`}>
      <span className={`${base} left-0 top-0 border-l border-t`} />
      <span className={`${base} right-0 top-0 border-r border-t`} />
      <span className={`${base} bottom-0 left-0 border-b border-l`} />
      <span className={`${base} bottom-0 right-0 border-b border-r`} />
    </div>
  )
}
