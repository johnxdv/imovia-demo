import { motion, useReducedMotion } from 'framer-motion'
import { EASE, viewportOnce } from '../../lib/motion'

/**
 * Élément signature — « trait de plan ».
 * Une fine ligne Brass qui se DESSINE au scroll (le trait s'étire de gauche à
 * droite, ce n'est pas un fondu), ponctuée de repères verticaux façon ligne de
 * cote. Respecte prefers-reduced-motion : le trait est rendu déjà tracé.
 */
export function PlanDivider({ className = '', label }) {
  const reduce = useReducedMotion()

  const lineAnim = reduce
    ? { initial: { scaleX: 1 } }
    : {
        initial: { scaleX: 0 },
        whileInView: { scaleX: 1 },
        viewport: viewportOnce,
        transition: { duration: 1.1, ease: EASE },
      }

  const tickAnim = reduce
    ? { initial: { opacity: 1 } }
    : {
        initial: { opacity: 0 },
        whileInView: { opacity: 1 },
        viewport: viewportOnce,
        transition: { duration: 0.4, delay: 0.8, ease: EASE },
      }

  return (
    <div className={`flex items-center gap-5 ${className}`}>
      {label ? <span className="eyebrow shrink-0 whitespace-nowrap">{label}</span> : null}
      <div className="relative h-2.5 flex-1">
        {/* Trait principal — se trace de gauche à droite */}
        <motion.span
          {...lineAnim}
          className="absolute inset-x-0 top-1/2 h-px origin-left bg-brass"
        />
        {/* Repères de cote aux extrémités */}
        <motion.span {...tickAnim} className="absolute inset-y-0 left-0 w-px bg-brass" />
        <motion.span {...tickAnim} className="absolute inset-y-0 right-0 w-px bg-brass" />
      </div>
    </div>
  )
}
