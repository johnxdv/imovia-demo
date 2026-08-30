import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Ramène en haut de page à chaque changement de route (hors ancres).
 */
export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])
  return null
}
