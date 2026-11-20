import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { META_PAGES } from '../../data/metaPages'

/**
 * Repose, à chaque navigation interne, le titre et la méta-description que le
 * prérendu a écrits dans le HTML brut.
 *
 * POURQUOI CE COMPOSANT PLUTÔT QU'UN APPEL PAR PAGE
 *
 * Les pages posaient leur titre elles-mêmes, avec `useDocumentTitle`, et il ne
 * disait pas la même chose que le prérendu : « Acheter — IMMOVIA » d'un côté,
 * « Biens à vendre en Moselle-Est — IMMOVIA » de l'autre. Google exécute le
 * JavaScript et retenait donc le premier, celui que l'audit relevait comme
 * identique d'une page à l'autre, pendant que le second — le seul rédigé pour
 * une page de résultats — n'était lu que par les robots qui n'exécutent rien.
 *
 * Une table, `src/data/metaPages.js`, lue par le prérendu et par ce composant.
 * Les deux ne peuvent plus diverger, et il n'y a plus douze endroits où un
 * titre peut être oublié.
 *
 * CE COMPOSANT NE COUVRE QUE LES ROUTES FIXES. Les pages dont le titre dépend
 * de leur contenu — un article, une fiche de bien, une commune — gardent leur
 * `useDocumentTitle` : leur titre n'est pas connu d'avance. Sur ces routes-là,
 * la table ne contient rien et ce composant ne touche à rien.
 */
export function MetaRoute() {
  const { pathname } = useLocation()

  useEffect(() => {
    const meta = META_PAGES[pathname]
    if (!meta) return

    document.title = meta.titre

    const balise = document.querySelector('meta[name="description"]')
    if (balise) balise.setAttribute('content', meta.description)
  }, [pathname])

  return null
}
