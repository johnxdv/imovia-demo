/**
 * Rampe de flou (px) appliquée aux chiffres non révélés, par position (0 =
 * premier chiffre) et par gabarit d'écran — dégradé progressif plutôt qu'un
 * contraste net/flou brutal : le 2e chiffre n'est qu'à peine flouté, puis
 * l'intensité augmente jusqu'à plafonner à l'intensité de base au 5e chiffre.
 */
const BLUR_RAMP = {
  mobile: [0, 2, 5, 9, 12, 13],
  desktop: [0, 3, 8, 14, 19, 21],
}

/**
 * Facteur appliqué à la rampe une fois la question e-mail répondue :
 * réduction légère et uniforme, « à peine perceptible » — sur tous les
 * chiffres non encore mis en avant.
 */
const AFTER_EMAIL_FACTOR = { mobile: 11 / 13, desktop: 18 / 21 }

/**
 * Flou du deuxième chiffre une fois la question téléphone répondue :
 * « devinable », pas net — sensiblement plus bas que les autres, sans tomber
 * à zéro.
 */
const SECOND_DIGIT_BLUR = { mobile: 5, desktop: 8 }

function rampBlur(digitIndex) {
  const idx = Math.min(digitIndex, BLUR_RAMP.mobile.length - 1)
  return { mobile: BLUR_RAMP.mobile[idx], desktop: BLUR_RAMP.desktop[idx] }
}

/**
 * Flou (mobile, desktop) d'un chiffre donné, selon sa position (0 = premier
 * chiffre) et l'avancement de la conversation (`revealStage`, 0 à 4 :
 * questions déjà répondues — prénom, e-mail, téléphone, créneau ; 5 : les
 * quatre informations recueillies, prix entièrement déflouté) :
 * - Premier chiffre : net dès l'écran résultat, avant toute conversation.
 * - 0/1 question répondue : dégradé de base (`BLUR_RAMP`).
 * - 2 (e-mail) : léger mieux-être général du flou, dégradé conservé.
 * - 3/4 (téléphone puis créneau) : en plus, le deuxième chiffre se dégage
 *   nettement plus — reste flouté, jamais net avant le stade 5.
 * - 5 : déblocage complet, tous les chiffres à blur 0.
 */
function blurFor(digitIndex, revealStage) {
  if (revealStage >= 5) return { mobile: 0, desktop: 0 }
  if (digitIndex === 0) return { mobile: 0, desktop: 0 }
  if (digitIndex === 1 && revealStage >= 3) return SECOND_DIGIT_BLUR

  const base = rampBlur(digitIndex)
  if (revealStage >= 2) {
    return {
      mobile: Math.round(base.mobile * AFTER_EMAIL_FACTOR.mobile),
      desktop: Math.round(base.desktop * AFTER_EMAIL_FACTOR.desktop),
    }
  }
  return base
}

/**
 * Prix affiché chiffre par chiffre, chacun flouté indépendamment et de façon
 * responsive : deux intensités (mobile/desktop) coexistent par caractère via
 * des variables CSS, commutées par la classe `sm:` — pas de doublon de
 * balisage, une seule bascule Tailwind par chiffre. Le flou lui-même transite
 * en douceur (`transition-[filter]`) à chaque changement de `revealStage`,
 * plutôt que de sauter instantanément d'une intensité à l'autre.
 *
 * Seuls les CHIFFRES sont comptés pour repérer « le premier », « le
 * deuxième » — les séparateurs (espaces fines insécables) et le symbole €
 * ne sont jamais flous et ne décalent pas la numérotation.
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
