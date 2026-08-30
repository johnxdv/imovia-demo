import { useEffect } from 'react'
import { agency } from '../data/agency'

/**
 * Met à jour le titre de l'onglet à l'affichage de la page.
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — ${agency.name}` : `${agency.name} — ${agency.baseline}`
  }, [title])
}
