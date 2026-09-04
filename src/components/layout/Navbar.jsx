import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Menu, X, Heart } from 'lucide-react'
import { primaryNav, secondaryNav } from '../../lib/nav'
import { agency } from '../../data/agency'
import { useFavorites } from '../../lib/favorites'
import { EASE } from '../../lib/motion'
import logoUrl from '../../assets/logo.png'

function Wordmark({ onClick }) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className="group relative z-10 inline-flex items-center"
      aria-label={`${agency.name} — accueil`}
    >
      <img src={logoUrl} alt={agency.name} className="h-7 w-auto shrink-0" />
    </Link>
  )
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [overHero, setOverHero] = useState(false)
  const [open, setOpen] = useState(false)
  const { count } = useFavorites()
  const { pathname } = useLocation()
  const reduce = useReducedMotion()

  const heroThresholdRef = useRef(0)
  const isHome = pathname === '/'
  // Pages à fond clair sous la navbar (PageHeader tone="white", fiche bien,
  // outil d'estimation) : la navbar transparente n'y est jamais lisible, elle
  // reste donc pleine en permanence.
  const lightHeader =
    pathname === '/acheter' ||
    pathname === '/louer' ||
    pathname === '/estimer' ||
    pathname.startsWith('/bien/')

  // Mesure la hauteur « immersive » du hero (mise en cache, recalculée au resize).
  useEffect(() => {
    const measure = () => {
      const hero = document.getElementById('hero')
      heroThresholdRef.current = isHome && hero ? hero.offsetHeight - window.innerHeight : 0
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [isHome])

  // État de scroll : navbar pleine au scroll, sauf pendant le hero (transparente).
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 16)
      setOverHero(isHome && heroThresholdRef.current > 0 && y < heroThresholdRef.current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome])

  // Ferme le menu à chaque navigation.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Verrouille le scroll de la page quand le menu est ouvert.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Transparente pendant tout le hero ; pleine une fois le hero passé (ou ailleurs).
  // Cet état ne concerne QUE la barre — jamais l'overlay du menu (fond opaque fixe).
  const solid = lightHeader || (!overHero && scrolled)

  const linkVariants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <>
      <header
        className={[
          'fixed inset-x-0 top-0 z-50 transition-colors duration-500 ease-plan',
          solid ? 'bg-ink/95 backdrop-blur-md border-b border-white/10' : 'bg-transparent',
        ].join(' ')}
      >
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-brass focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:uppercase focus:text-ink"
        >
          Aller au contenu
        </a>

        <div className="container-page">
          <div
            className={[
              'relative z-10 flex items-center justify-between transition-all duration-500 ease-plan',
              solid ? 'py-3.5' : 'py-5',
            ].join(' ')}
          >
            <Wordmark onClick={() => setOpen(false)} />

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="relative z-10 -m-2.5 inline-flex touch-manipulation items-center gap-2.5 p-2.5 text-stone transition-colors hover:text-brass"
              aria-expanded={open}
              aria-controls="menu-principal"
            >
              <span className="font-mono text-[0.72rem] uppercase tracking-[0.12em]">
                {open ? 'Fermer' : 'Menu'}
              </span>
              {open ? (
                <X className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Overlay plein écran du menu burger.
          - Frère du header (jamais descendant) : aucun `backdrop-filter`/transform
            parent ne peut le rogner en tant qu'élément `fixed`.
          - Fond Ink Navy opaque dès la première frame (pas d'animation d'opacité
            sur le panneau) : indépendant de l'état de transparence de la navbar. */}
      <AnimatePresence>
        {open ? (
          <motion.div
            id="menu-principal"
            key="overlay"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="fixed inset-0 z-40 bg-ink"
          >
            <motion.div
              initial="hidden"
              animate="show"
              exit="hidden"
              transition={{ staggerChildren: 0.04, delayChildren: 0.05 }}
              className="container-page flex h-full flex-col justify-center pb-16 pt-28"
            >
              <nav aria-label="Navigation principale" className="flex flex-col">
                {primaryNav.map((item) => (
                  <motion.div key={item.to} variants={linkVariants} transition={{ ease: EASE }}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        [
                          'block py-2.5 font-display text-3xl font-medium tracking-tight transition-colors sm:text-4xl',
                          isActive ? 'text-brass' : 'text-stone hover:text-brass',
                        ].join(' ')
                      }
                    >
                      {item.label}
                    </NavLink>
                  </motion.div>
                ))}
              </nav>

              <motion.div
                variants={linkVariants}
                transition={{ ease: EASE }}
                className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                  {secondaryNav.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        [
                          'inline-flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.12em] transition-colors',
                          isActive ? 'text-brass' : 'text-stone/75 hover:text-brass',
                        ].join(' ')
                      }
                    >
                      {item.label === 'Mes favoris' ? (
                        <>
                          <Heart className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
                          Mes favoris <span className="text-brass">[{count}]</span>
                        </>
                      ) : (
                        item.label
                      )}
                    </NavLink>
                  ))}
                </div>
                <a
                  href={agency.phoneHref}
                  className="font-mono text-[0.72rem] uppercase tracking-[0.12em] text-brass transition-colors hover:text-brass/80"
                >
                  {agency.phone}
                </a>
              </motion.div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
