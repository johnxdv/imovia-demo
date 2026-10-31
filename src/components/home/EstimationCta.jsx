import { Link } from 'react-router-dom'

/**
 * CTA d'estimation du hero.
 *
 * Bouton « verre » repris du bouton d'estimation de proprio-access.fr, relevé
 * sur place : pilule à bord clair, fond translucide dégradé, flou
 * d'arrière-plan, double liseré intérieur et anneau extérieur qui s'écarte au
 * survol. Toute la mise en forme est dans `.bouton-verre` (`src/index.css`),
 * qui porte aussi le détail de ce qui a été adapté — flèche retirée, balayage
 * lumineux permanent non repris, teintes passées aux jetons du site.
 *
 * Il remplace le bouton blanc à pastille qui occupait cette place : halo
 * Brass, liseré tournant, reflet diagonal et mention « 30 sec · 100 % gratuit »
 * sont partis avec lui. `GoldFrame` et `Shine` ne servent plus qu'ici — ils
 * restent en place, inutilisés, pour que ce bouton-là puisse revenir.
 */
export function EstimationCta({ className = '' }) {
  return (
    <Link to="/estimer" className={`bouton-verre shrink-0 ${className}`}>
      Estimer mon bien
    </Link>
  )
}
