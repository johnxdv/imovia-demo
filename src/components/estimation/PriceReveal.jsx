/**
 * Flou binaire, pas de dégradé : un chiffre est soit le premier (net), soit
 * l'un des autres (même intensité forte pour tous, quelle que soit sa
 * position) — un dégradé laissait les chiffres proches du premier trop
 * lisibles. `STAGE_BLUR[n]` est l'intensité appliquée à ces chiffres une fois
 * `n` questions répondues ; l'écart d'un stade à l'autre est volontairement
 * léger (le prix doit se percevoir « il existe, il a cette taille », jamais
 * se lire), et le dernier stade avant la fin complète du parcours reste assez
 * flou pour qu'aucun chiffre ne soit identifiable même en y regardant de
 * près. Chaque tableau est indexé par gabarit d'écran ; l'index est plafonné
 * (voir `blurFor`), donc un nombre de questions plus grand que le tableau
 * réutilise simplement le dernier palier.
 */
const STAGE_BLUR = {
  mobile: [13, 12, 11, 10],
  desktop: [21, 19, 17, 15],
}

/**
 * Flou (mobile, desktop) d'un chiffre donné, selon sa position (0 = premier
 * chiffre, toujours net) et l'avancement de la conversation (`revealStage` :
 * nombre de questions déjà répondues — prénom, téléphone, créneau — ou 5 une
 * fois les informations recueillies, pour le déblocage complet).
 */
function blurFor(digitIndex, revealStage) {
  if (revealStage >= 5) return { mobile: 0, desktop: 0 }
  if (digitIndex === 0) return { mobile: 0, desktop: 0 }

  const idx = Math.min(revealStage, STAGE_BLUR.mobile.length - 1)
  return { mobile: STAGE_BLUR.mobile[idx], desktop: STAGE_BLUR.desktop[idx] }
}

/**
 * Prix affiché chiffre par chiffre, chacun flouté indépendamment et de façon
 * responsive : deux intensités (mobile/desktop) coexistent par caractère via
 * des variables CSS, commutées par la classe `sm:` — pas de doublon de
 * balisage, une seule bascule Tailwind par chiffre. Le flou lui-même transite
 * en douceur (`transition-[filter]`) à chaque changement de `revealStage`,
 * plutôt que de sauter instantanément d'une intensité à l'autre.
 *
 * Seuls les CHIFFRES sont comptés pour repérer « le premier » — les
 * séparateurs (espaces fines insécables) et le symbole € ne sont jamais flous
 * et ne décalent pas la numérotation.
 *
 * `revealStage` peut être omis (état de l'écran résultat avant toute
 * conversation) : équivaut à 0, seul le premier chiffre est net.
 */
export function PriceReveal({ formatted, revealStage = 0, className = '' }) {
  let digitIndex = -1

  return (
    <span aria-hidden="true" className={className}>
      {[...formatted].map((char, i) => {
        if (!/\d/.test(char)) {
          return (
            <span key={i} className="inline-block select-none">
              {char}
            </span>
          )
        }

        digitIndex += 1
        const { mobile, desktop } = blurFor(digitIndex, revealStage)

        return (
          <span
            key={i}
            className="inline-block select-none [filter:blur(var(--blur-m))] transition-[filter] duration-500 ease-plan sm:[filter:blur(var(--blur-d))]"
            style={{ '--blur-m': `${mobile}px`, '--blur-d': `${desktop}px` }}
          >
            {char}
          </span>
        )
      })}
    </span>
  )
}
