import { useEffect } from 'react'

/**
 * Pose `<meta name="robots" content="noindex, nofollow">` le temps que la page
 * soit affichée, et le retire en partant.
 *
 * DEUX PAGES SEULEMENT, ET POUR DEUX RAISONS DIFFÉRENTES. `/seo` est
 * l'administration éditoriale : elle n'a rien à faire dans un index. `/favoris`
 * ne contient que ce que le visiteur y a rangé depuis son propre navigateur —
 * pour un robot, c'est une page vide, et une page vide indexée dilue le site
 * sans rien lui rapporter.
 *
 * Le retrait au démontage n'est pas une précaution de principe : le site est
 * une application, le document ne change pas d'une route à l'autre. Une balise
 * laissée en place suivrait le visiteur sur la page suivante, qui, elle, doit
 * être indexée.
 *
 * CETTE BALISE NE SUFFIT PAS SEULE : elle n'existe qu'après exécution du
 * JavaScript, et les robots qui n'en exécutent pas ne la verront jamais.
 * L'en-tête `X-Robots-Tag` de `vercel.json` couvre ce cas pour `/seo`.
 */
export function useNoIndex() {
  useEffect(() => {
    const balise = document.createElement('meta')
    balise.name = 'robots'
    balise.content = 'noindex, nofollow'
    document.head.appendChild(balise)

    return () => balise.remove()
  }, [])
}
