import { ArrowLeft } from 'lucide-react'

/**
 * Retour en arrière du parcours d'estimation — un seul composant pour les
 * quatre écrans qui en portent un.
 *
 * **Il reste dans le flux, en tête de colonne, à tous les gabarits.** Il passait
 * jusqu'ici en position fixe au coin de la fenêtre sur ordinateur, faute de
 * colonne à laquelle s'accrocher : le parcours était centré et étroit, et un
 * retour aligné sur son bord gauche flottait au milieu de l'écran.
 *
 * Le parcours a désormais sa propre zone — la moitié gauche de l'écran, sur
 * fond blanc (voir `Estimer.jsx`) —, et le haut de cette colonne est exactement
 * l'endroit où l'on cherche un retour. Posé au coin de la fenêtre, il venait en
 * plus buter contre les panneaux les plus hauts, qui montent jusque-là.
 */
export function StepBackLink({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group mb-6 inline-flex touch-manipulation items-center gap-2 font-mono text-[0.68rem] uppercase tracking-micro text-ink/55 transition-colors hover:text-ink"
    >
      <ArrowLeft
        className="h-4 w-4 transition-transform duration-300 ease-plan group-hover:-translate-x-1"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      {children}
    </button>
  )
}
