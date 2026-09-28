/**
 * Flou binaire, pas de dégradé : un chiffre est soit net, soit flouté d'une
 * intensité fixe (même valeur forte pour tous les chiffres encore cachés,
 * quelle que soit leur position) — un dégradé laisserait deviner les
 * chiffres presque révélés.
 */
const HIDDEN_BLUR = { mobile: 14, desktop: 22 }
const CLEAR = { mobile: 0, desktop: 0 }

/**
 * Nombre maximal de chiffres défloutés depuis la droite avant la fin de la
 * conversation — au-delà, même avec plus de questions répondues, le montant
 * doit rester à deviner.
 */
const MAX_RIGHT_REVEAL = 2

/**
 * Flou (mobile, desktop) d'un chiffre donné.
 *
 * Le premier chiffre (`digitIndex === 0`) est toujours net, dès l'écran de
 * repos. Ensuite, chaque question répondue (`revealStage`, de 0 à
 * `QUESTION_COUNT`) défloute un chiffre de plus en partant de la droite —
 * jusqu'à `MAX_RIGHT_REVEAL` chiffres, jamais plus tant que la conversation
 * n'est pas terminée. `revealStage` vaut 5 une fois les informations
 * recueillies : tout se défloute alors d'un coup.
 */
function blurFor(digitIndex, totalDigits, revealStage) {
  if (revealStage >= 5) return CLEAR
  if (digitIndex === 0) return CLEAR

  const distanceFromRight = totalDigits - 1 - digitIndex
  const revealedFromRight = Math.min(revealStage, MAX_RIGHT_REVEAL)
  if (distanceFromRight < revealedFromRight) return CLEAR

  return HIDDEN_BLUR
}

/**
 * LARGEUR DU MONTANT, en cadratins, d'après son seul nombre de chiffres.
 *
 * C'est ce que la carte a besoin de savoir pour choisir une taille de texte qui
 * tienne (voir `.montant-cadre` dans `src/index.css`) : la largeur d'un texte ne
 * se lit pas en CSS, il faut la lui dire. Relevé sur la Fraunces des titres, en
 * chiffres tabulaires : un chiffre vaut 0,589 cadratin, l'espace fine et le
 * symbole € qui ferment le montant en valent 0,935 à eux deux. Les séparateurs
 * de milliers sont négligés — ils pèsent cinq centièmes chacun, et les ignorer
 * laisse la marge de sécurité du bon côté.
 *
 * Arrondi vers le haut plutôt que juste : une estimation trop large fait un
 * montant un peu plus petit que nécessaire, une estimation trop courte le fait
 * déborder. Les deux erreurs ne se valent pas.
 */
const PAR_CHIFFRE = 0.6
const FERMETURE = 1

export const largeurEnCadratins = (formatted) =>
  PAR_CHIFFRE * [...formatted].filter((char) => /\d/.test(char)).length + FERMETURE

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
 *
 * `tailleMax` est le plafond de taille du montant — sa taille d'origine, celle
 * qu'il prend quand la carte est assez large pour la porter. En dessous, la
 * taille est celle qui tient : c'est la carte qui la calcule, à partir de la
 * largeur que ce composant lui déclare (voir `largeurEnCadratins`).
 */
export function PriceReveal({ formatted, revealStage = 0, className = '', tailleMax = '4rem' }) {
  const chars = [...formatted]
  const totalDigits = chars.filter((char) => /\d/.test(char)).length
  let digitIndex = -1

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        '--montant-largeur': largeurEnCadratins(formatted),
        '--montant-max': tailleMax,
      }}
    >
      {chars.map((char, i) => {
        if (!/\d/.test(char)) {
          return (
            <span key={i} className="inline-block select-none">
              {char}
            </span>
          )
        }

        digitIndex += 1
        const { mobile, desktop } = blurFor(digitIndex, totalDigits, revealStage)

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
