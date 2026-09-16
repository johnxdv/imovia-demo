import { useId } from 'react'

/**
 * Texture « main levée » des dessins à l'encre du parcours.
 *
 * **Le problème qu'elle résout.** Les dessins sont décrits en trajets SVG, et
 * un trajet SVG est parfait : un `H` trace une horizontale au millième de pixel
 * près, et vingt `H` empilés donnent une grille, pas un dessin. Sur un registre
 * qui se réclame de l'encre de Chine, ça se voit immédiatement — on lit une
 * forme géométrique assemblée, pas un trait posé à la main.
 *
 * **Le procédé.** Un bruit fractal (`feTurbulence`) sert de champ de
 * déplacement (`feDisplacementMap`) : chaque point du dessin est décalé de
 * quelques dixièmes d'unité selon ce bruit. Les droites ondulent, les angles se
 * cassent légèrement, deux horizontales voisines cessent d'être parallèles. Le
 * déplacement suit le dessin et non le temps : le tracé reste parfaitement
 * stable pendant qu'il se déroule, il est simplement dessiné d'une main qui
 * tremble un peu.
 *
 * **Pourquoi un filtre plutôt que des trajets déjà tremblés.** Une quinzaine de
 * scènes à vingt trajets : écrire à la main la courbure de chacun, c'est des
 * centaines de points de contrôle à poser, et un dessin qu'on ne peut plus
 * retoucher sans tout reprendre. Le filtre s'applique à tout le lot d'un coup,
 * les trajets restent lisibles en `H`/`V`, et la force du tremblé se règle d'un
 * seul nombre. Les dessins les plus exposés — la tour de l'étape adresse, les
 * maisons du curseur — sont en plus écrits en cubiques déjà irrégulières : le
 * filtre s'ajoute à leur géométrie au lieu d'en tenir lieu.
 *
 * `baseFrequency` dissymétrique (un peu plus serrée en Y) : une plume dérape
 * plus volontiers en travers de son geste que dans son axe.
 */

/**
 * Les `<defs>` du filtre. À poser une fois par `<svg>`, avant le groupe qui le
 * référence.
 *
 * **Composant de module, et non fonction rendue par le hook.** React
 * réconcilie par *type* de composant : une fonction recréée à chaque rendu est
 * un type neuf à chaque rendu, donc un démontage et un remontage des `<defs>` —
 * et l'un des appelants, [`HouseIllustration`](./HouseIllustration.jsx), rend à
 * chaque cran du curseur de surface. Reconstruire le bruit soixante fois par
 * seconde pendant qu'on glisse le doigt, pour un filtre qui ne change jamais.
 *
 * **La région déborde franchement la boîte** (`-6 %` / `112 %`) : le
 * déplacement pousse les traits hors de leurs limites d'origine, et une région
 * calée au plus juste les trancherait net sur les bords du dessin.
 *
 * `scale` s'exprime dans les unités de la `viewBox` de la scène, pas en pixels
 * — c'est la part de la largeur du dessin qui compte, pas sa taille à l'écran.
 */
export function InkRoughen({ id, scale = 5, seed = 7 }) {
  return (
    <defs>
      <filter
        id={id}
        x="-6%"
        y="-6%"
        width="112%"
        height="112%"
        filterUnits="objectBoundingBox"
        primitiveUnits="userSpaceOnUse"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.012 0.019"
          numOctaves="3"
          seed={seed}
          result="grain"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="grain"
          scale={scale}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </defs>
  )
}

/**
 * Identifiant unique du filtre, à passer à `InkRoughen` et à référencer en
 * `filter={url(#…)}`.
 *
 * Tiré de `useId` : plusieurs scènes cohabitent sur l'écran d'analyse, et deux
 * `<filter>` de même identifiant dans un même document feraient toutes pointer
 * vers le premier — donc vers la mauvaise échelle, puisque `scale` est en
 * unités de `viewBox` et qu'elles ne partagent pas la leur. Les deux-points que
 * React place dans ses identifiants sont retirés : ils sont légaux en HTML mais
 * `url(#a:b)` ne se sélectionne pas.
 */
export function useInkFilterId() {
  return `imv-ink-rough-${useId().replace(/:/g, '')}`
}
