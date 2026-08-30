import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

// Système de favoris côté client — persistance via localStorage.
const STORAGE_KEY = 'imovia:favoris'

const FavoritesContext = createContext(null)

function readStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(readStorage)

  // Persistance à chaque changement.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
    } catch {
      /* stockage indisponible (mode privé) — on ignore silencieusement */
    }
  }, [favorites])

  // Synchronisation entre onglets.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setFavorites(readStorage())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const toggle = useCallback((reference) => {
    setFavorites((prev) =>
      prev.includes(reference) ? prev.filter((r) => r !== reference) : [...prev, reference],
    )
  }, [])

  const isFavorite = useCallback((reference) => favorites.includes(reference), [favorites])

  const value = useMemo(
    () => ({ favorites, toggle, isFavorite, count: favorites.length }),
    [favorites, toggle, isFavorite],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites doit être utilisé dans FavoritesProvider')
  return ctx
}
