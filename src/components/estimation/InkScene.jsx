/**
 * Scène à l'encre de Chine — un dessin qui se trace trait par trait.
 *
 * Le composant ne connaît aucun dessin : il reçoit une scène
 * ([`src/data/inkScenes.js`](../../data/inkScenes.js)) — une `viewBox` et une
 * liste de tracés dans l'ordre où la main les poserait — et se charge du seul
 * calcul qui reste, le minutage.
 *
 * **Pourquoi les dessins sont des données et non du JSX.** Dix scènes de vingt
 * tracés, plus la maison de l'étape adresse : écrites en composants, c'est onze
 * fichiers à relire pour changer une règle de style, et autant d'endroits où
 * l'ordre de tracé peut diverger du minutage. En données, l'ordre du tableau
 * *est* l'ordre du dessin, et la cadence se calcule une fois pour toutes ici.
 *
 * La cadence, justement : les tracés se répartissent sur toute la durée
 * demandée, chacun couvrant `TRAIT_S`. Le dernier commence donc à
 * `duration − TRAIT_S` et le dessin se termine pile à l'heure, que la scène
 * compte douze traits ou trente.
 *
 * Tout passe par `stroke-dashoffset` et `opacity` — composite GPU, aucun
 * reflow. Voir `imv-ink-trait` dans `src/index.css` pour le procédé
 * (`pathLength="1"`) et son comportement sous `prefers-reduced-motion`.
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
 */
export function InkScene({
  scene,
  delay = 0,
  duration = 6,
  align = 'xMidYMid',
  className = '',
}) {
  const { viewBox, traits } = scene

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
      </svg>
    </div>
  )
}
