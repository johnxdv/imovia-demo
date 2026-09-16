import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { INK_MORPH } from '../../data/inkScenes'
import { InkScene } from './InkScene'

/**
 * Durée d'un état : le temps de tracé, puis un temps de pose avant le suivant.
 * La pose compte autant que le tracé — sans elle, le dessin n'existe jamais
 * achevé, et on ne voit qu'une plume qui s'agite.
 */
const TRACE_S = 1.9
const POSE_S = 0.9
const ETAT_MS = (TRACE_S + POSE_S) * 1000

/**
 * Petite boucle de métamorphose de l'écran d'analyse — une maison qui devient
 * un immeuble, puis un château, puis un jardin avec piscine, et ainsi de suite.
 *
 * **Une seule scène montée à la fois, et remontée à chaque état.** C'est la
 * `key` sur l'index qui fait tout le travail : React démonte la précédente et
 * monte la suivante, ce qui relance les animations CSS de tracé depuis leur
 * première image. Les garder toutes les quatre en place, comme le fait
 * [`HouseIllustration`](./HouseIllustration.jsx), donnerait un diaporama —
 * quatre dessins déjà tracés qu'on ferait apparaître tour à tour. Ici on veut
 * l'inverse : voir la plume repasser à chaque fois.
 *
 * **Pourquoi ce n'est pas un morphing au sens strict.** Interpoler quatre
 * dessins qui n'ont ni le même nombre de trajets ni les mêmes sommets
 * demanderait de les ré-échantillonner point par point — beaucoup de code, et
 * des états intermédiaires informes. Le sol commun aux quatre scènes fait le
 * lien à moindres frais : le terrain ne bouge pas, seul le bâti change, et
 * l'œil complète.
 *
 * Sous `prefers-reduced-motion`, la boucle s'arrête sur le premier état : le
 * filet CSS global fige de toute façon chaque trait sur son image finale, si
 * bien qu'on obtient un petit dessin net et immobile plutôt qu'un
 * remplacement toutes les trois secondes.
 */
export function InkMorphLoop({ className = '' }) {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (reduce) return undefined
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % INK_MORPH.length)
    }, ETAT_MS)
    return () => clearInterval(interval)
  }, [reduce])

  return (
    <InkScene
      key={index}
      scene={INK_MORPH[index]}
      duration={TRACE_S}
      // Le dessin fait deux centimètres de côté : le tremblé doit y être
      // proportionnellement plus marqué qu'ailleurs pour se voir encore.
      rough={3.4}
      className={className}
    />
  )
}
