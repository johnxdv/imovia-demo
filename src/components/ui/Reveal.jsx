import { motion, useReducedMotion } from 'framer-motion'
import { revealItem, staggerParent, viewportOnce } from '../../lib/motion'

/**
 * Enveloppe de révélation au scroll (translation verticale + opacité).
 * Respecte prefers-reduced-motion : rendu immédiat, sans mouvement.
 */
export function Reveal({ as = 'div', children, className, delay = 0, ...rest }) {
  const reduce = useReducedMotion()
  const MotionTag = motion[as] || motion.div

  if (reduce) {
    const Tag = as
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    )
  }

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      variants={revealItem}
      transition={delay ? { delay } : undefined}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}

/**
 * Conteneur à révélation échelonnée : ses enfants <RevealChild> apparaissent
 * en cascade. Utilisé pour les grilles de biens.
 */
export function RevealGroup({ as = 'div', children, className, ...rest }) {
  const reduce = useReducedMotion()
  const MotionTag = motion[as] || motion.div

  if (reduce) {
    const Tag = as
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    )
  }

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      variants={staggerParent}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}

export function RevealChild({ as = 'div', children, className, ...rest }) {
  const reduce = useReducedMotion()
  const MotionTag = motion[as] || motion.div

  if (reduce) {
    const Tag = as
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    )
  }

  return (
    <MotionTag className={className} variants={revealItem} {...rest}>
      {children}
    </MotionTag>
  )
}
