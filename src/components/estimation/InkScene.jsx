import { InkRoughen, useInkFilterId } from './InkTexture'

/**
 * Scène à l'encre de Chine — un dessin qui se trace trait par trait.
 *
 * Le composant ne connaît aucun dessin : il reçoit une scène
 * ([`src/data/inkScenes.js`](../../data/inkScenes.js)) — une `viewBox` et une
 * liste de tracés dans l'ordre où la main les poserait — et se charge du seul
 * calcul qui reste, le minutage.
 *
 * **Pourquoi les dessins sont des données et non du JSX.** Dix scènes de vingt
 * tracés, plus la tour de l'étape adresse et les quatre états de la boucle de
 * métamorphose : écrites en composants, c'est quinze fichiers à relire pour
 * changer une règle de style, et autant d'endroits où l'ordre de tracé peut
 * diverger du minutage. En données, l'ordre du tableau *est* l'ordre du
 * dessin, et la cadence se calcule une fois pour toutes ici.
 *
 * La cadence, justement : les tracés se répartissent sur toute la durée
 * demandée, chacun couvrant `TRAIT_S`. Le dernier commence donc à
 * `duration − TRAIT_S` et le dessin se termine pile à l'heure, que la scène
 * compte douze traits ou trente.
 *
 * Tout passe par `stroke-dashoffset` et `opacity` — composite GPU, aucun
 * reflow. Voir `imv-ink-trait` dans `src/index.css` pour le procédé
 * (`pathLength="1"`) et son comportement sous `prefers-reduced-motion`.
 *
 * Le dessin entier passe enfin sous le filtre « main levée »
 * ([`InkRoughen`](./InkTexture.jsx)) : c'est lui qui fait la différence
 * entre un dessin à l'encre et une grille de segments alignés au pixel.
 */

/** Durée de tracé d'un trait. Assez lent pour qu'on voie la plume courir. */
const TRAIT_S = 0.55

/** Épaisseur et opacité par défaut d'un trait — surchargées au cas par cas. */
const TRAIT_WIDTH = 1.6

/**
 * Scène tracée dans sa boîte. `className` porte la taille et la couleur ; le
 * dessin n'est que du `currentColor`, jamais d'aplat coloré.
 *
 * `delay` décale toute la scène (la seconde moitié de la séquence d'analyse
 * démarre à 6 s), `duration` fixe le temps total du tracé.
 *
 * `align` est l'ancrage du dessin dans sa boîte quand les proportions ne
 * coïncident pas. `xMidYMid` convient aux emplacements carrés de l'écran
 * d'analyse ; `xMidYMax` cale la scène par le bas, ce que demande un décor
 * posé derrière du texte — c'est la ligne de sol, et non le centre du dessin,
 * qui doit tomber à un endroit précis de la page.
 *
 * `rough` est l'amplitude du tremblé, **exprimée dans les unités de la
 * `viewBox` de la scène** et non en pixels. Une scène de 300 unités de large et
 * une vignette de 140 n'attendent donc pas la même valeur : c'est la part de la
 * largeur du dessin qui compte, pas sa taille à l'écran. En pratique, entre 3 et
 * 6 selon le cadrage — au-delà, le dessin se défait.
 */
export function InkScene({
  scene,
  delay = 0,
  duration = 6,
  align = 'xMidYMid',
  rough = 5,
  className = '',
}) {
  const { viewBox, traits } = scene
  const filterId = useInkFilterId()

  // Le dernier trait doit finir avec le compte, pas commencer avec : c'est
  // `duration − TRAIT_S` qu'on répartit, pas `duration`. Une scène d'un seul
  // trait n'a rien à répartir — et diviser par zéro donnerait un `NaN` en
  // style inline, donc un trait qui ne se trace jamais.
  const pas = traits.length > 1 ? Math.max(duration - TRAIT_S, 0) / (traits.length - 1) : 0

  return (
    <div aria-hidden="true" className={`pointer-events-none select-none ${className}`}>
      <svg
        viewBox={viewBox}
        preserveAspectRatio={`${align} meet`}
        role="presentation"
        className="h-full w-full"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <InkRoughen id={filterId} scale={rough} />

        {/* Le filtre est posé sur le groupe et non sur chaque trait : une seule
            passe de bruit pour tout le dessin, et surtout un champ de
            déplacement continu — appliqué trait par trait, chacun serait tremblé
            dans son propre repère et les angles ne se rejoindraient plus. */}
        <g filter={`url(#${filterId})`}>
          {traits.map(({ d, w, o, aplat }, index) => {
            const style = {
              '--ink-t': `${delay + index * pas}s`,
              '--ink-d': `${TRAIT_S}s`,
              '--ink-o': o ?? 1,
            }

            // Un aplat n'a pas de tracé à dérouler : il se pose d'un bloc, et
            // c'est son opacité qui monte. Le `fill-rule` évité — toutes les
            // formes remplies des scènes sont des contours simples.
            return aplat ? (
              <path
                key={index}
                d={d}
                className="imv-ink-aplat"
                style={style}
                fill="currentColor"
                stroke="none"
              />
            ) : (
              <path
                key={index}
                d={d}
                pathLength="1"
                className="imv-ink-trait"
                style={style}
                strokeWidth={w ?? TRAIT_WIDTH}
                strokeOpacity={o ?? 1}
              />
            )
          })}
        </g>
      </svg>
    </div>
  )
}
