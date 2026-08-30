import { Link } from 'react-router-dom'

const variants = {
  // Accent unique Brass pour l'action principale.
  primary:
    'bg-brass text-ink hover:bg-brass/90 border border-brass',
  // Contour sobre (filet Brass) — sur fond sombre comme clair.
  outline:
    'border border-brass/40 hover:border-brass hover:text-brass bg-transparent',
  // Sur fond clair (Warm Stone).
  solidDark: 'bg-ink text-stone hover:bg-ink/90 border border-ink',
  ghost: 'border border-transparent hover:text-brass',
}

const sizes = {
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-sm',
  sm: 'px-4 py-2 text-xs',
}

function classesFor({ variant = 'primary', size = 'md', className = '' }) {
  return [
    'inline-flex items-center justify-center gap-2.5 font-mono uppercase tracking-micro',
    'transition-colors duration-300 ease-plan select-none',
    'text-[0.72rem]',
    sizes[size],
    variants[variant],
    className,
  ].join(' ')
}

/**
 * Bouton polymorphe : rendu <Link> (prop `to`), <a> (prop `href`) ou <button>.
 */
export function Button({ to, href, variant, size, className, children, ...rest }) {
  const cls = classesFor({ variant, size, className })

  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} className={cls} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  )
}
