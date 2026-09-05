/**
 * Pictogramme maison. La toiture se prolonge par une courbe ascendante façon
 * graphique boursier (angle du coin final repris de l'icône `TrendingUp` de
 * Lucide) — la valorisation qui monte, plutôt qu'une étincelle décorative.
 * Tracé au format Lucide (viewBox 24, fond transparent) pour s'insérer sans
 * réglage partout où l'étincelle était utilisée.
 */
export function HouseTrendIcon({ className = '', strokeWidth = 1.6 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="2.5 12.5 8 7 13.5 12.5" />
      <polyline points="4 11.3 4 19.5 12 19.5 12 11.3" />
      <polyline points="12 17 15.5 12.3 18 14.5 22 8.5" />
      <polyline points="18.3 8.5 22 8.5 22 12.2" />
    </svg>
  )
}
