/**
 * Flou de base (px) appliqué aux chiffres non révélés, par gabarit d'écran.
 * Reprend les valeurs déjà validées visuellement pour l'écran résultat.
 */
const BASE_BLUR = { mobile: 13, desktop: 21 }

/**
 * Flou une fois la question e-mail répondue : réduction légère et uniforme,
 * « à peine perceptible » — sur tous les chiffres non encore mis en avant.
 */
const AFTER_EMAIL_BLUR = { mobile: 11, desktop: 18 }

/**
 * Flou du deuxième chiffre une fois la question téléphone répondue :
 * « devinable », pas net — sensiblement plus bas que les autres, sans tomber
 * à zéro.
 */
const SECOND_DIGIT_BLUR = { mobile: 5, desktop: 8 }

/**
 * Flou (mobile, desktop) d'un chiffre donné, selon sa position (0 = premier
 * chiffre) et l'avancement de la conversation (`revealStage`, 0 à 4 :
 * questions déjà répondues — prénom, e-mail, téléphone, créneau) :
 * - Premier chiffre : net dès l'écran résultat, avant toute conversation.
 * - 0/1 question répondue : le reste reste au flou de base.
 * - 2 (e-mail) : léger mieux-être général du flou.
 * - 3/4 (téléphone puis créneau) : en plus, le deuxième chiffre se dégage
 *   nettement plus — reste flouté, jamais net. Le déflouttage complet
 *   appartient au vrai déblocage, hors-scope ici — le stade 4 n'ajoute donc
 *   rien de plus que le stade 3.
 */
function blurFor(digitIndex, revealStage) {
  if (digitIndex === 0) return { mobile: 0, desktop: 0 }
  if (digitIndex === 1 && revealStage >= 3) return SECOND_DIGIT_BLUR
  if (revealStage >= 2) return AFTER_EMAIL_BLUR
  return BASE_BLUR
}

/**
 * Prix affiché chiffre par chiffre, chacun flouté indépendamment et de façon
 * responsive : deux intensités (mobile/desktop) coexistent par caractère via
 * des variables CSS, commutées par la classe `sm:` — pas de doublon de
 * balisage, une seule bascule Tailwind par chiffre.
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
            className="inline-block select-none [filter:blur(var(--blur-m))] sm:[filter:blur(var(--blur-d))]"
            style={{ '--blur-m': `${mobile}px`, '--blur-d': `${desktop}px` }}
          >
            {char}
          </span>
        )
      })}
    </span>
  )
}
