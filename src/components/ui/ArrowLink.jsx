import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

/**
 * Lien texte avec flèche — accent Brass, micro-déplacement au survol.
 */
export function ArrowLink({ to, href, children, className = '', ...rest }) {
  const cls = `group/al inline-flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-micro text-brass transition-colors hover:text-brass/80 ${className}`
  const inner = (
    <>
      {children}
      <ArrowUpRight
        className="h-4 w-4 transition-transform duration-300 ease-plan group-hover/al:translate-x-0.5 group-hover/al:-translate-y-0.5"
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </>
  )
  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {inner}
      </Link>
    )
  }
  return (
    <a href={href} className={cls} {...rest}>
      {inner}
    </a>
  )
}
