/**
 * Petite étiquette mono. Variantes :
 * - 'muted' : puce Ink translucide (sur photo).
 * - 'brass' : puce pleine Brass (mise en avant, ex. « Vendu »).
 */
export function Badge({ children, variant = 'muted', className = '' }) {
  const styles = {
    muted: 'bg-ink/60 text-stone backdrop-blur-sm border border-white/10',
    brass: 'bg-brass text-ink border border-brass',
    outline: 'border border-brass/50 text-brass',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-micro ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
