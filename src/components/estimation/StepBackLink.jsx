import { ArrowLeft } from 'lucide-react'

/**
 * Retour en arrière du parcours d'estimation — un seul composant pour les
 * quatre écrans qui en portent un.
 *
 * **Deux positions, selon le gabarit.** Sur téléphone il reste dans le flux,
 * en tête de colonne : c'est là qu'on le cherche, et l'écran n'a pas de marge
 * où le poser ailleurs. Sur ordinateur il passe en haut à gauche de la
 * fenêtre — la colonne du parcours est centrée et étroite, un retour aligné
 * sur son bord gauche flottait au milieu de l'écran sans se rattacher à rien.
 *
 * `lg:fixed` fonctionne ici pour la même raison que le positionnement de
 * [`BuildingConfirmModal`](./BuildingConfirmModal.jsx) : Framer Motion laisse
 * `transform: none` sur l'étape au repos, si bien qu'aucun ancêtre transformé
 * ne vient requalifier le `fixed` en `absolute`. Pendant la transition d'étape,
 * l'étape reprend un `transform` et le retour glisse avec elle — ce qui est
 * bien ce qu'on veut : il appartient à l'écran qu'il quitte.
 *
 * `lg:top` est calé sous la navbar (~68 px) et sa barre de progression (8 px),
 * avec l'air qu'il faut pour ne pas s'y coller.
 */
export function StepBackLink({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group mb-8 inline-flex touch-manipulation items-center gap-2 font-mono text-[0.68rem] uppercase tracking-micro text-ink/55 transition-colors hover:text-ink lg:fixed lg:left-8 lg:top-[6.5rem] lg:z-40 lg:mb-0 xl:left-12"
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
