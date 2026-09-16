/**
 * Fond animé du panneau de conversation — quelques formes qui dérivent
 * lentement derrière les bulles.
 *
 * Volontairement pauvre en détail : la conversation est le seul endroit du
 * parcours où l'utilisateur écrit, et un décor qui attire l'œil y coûterait
 * une saisie. D'où des opacités sous les 10 %, des durées longues et
 * désynchronisées (aucune paire n'est un multiple de l'autre : le motif ne se
 * laisse pas mémoriser), et aucun mouvement franc — `bubble-drift` ne déplace
 * chaque forme que d'une vingtaine de pixels sur sa boucle.
 *
 * Deux familles : des disques flous qui font la profondeur, des cercles au
 * trait qui rappellent le vocabulaire graphique du site. Tout est en
 * `transform`/`opacity`, composite GPU — rien ne recalcule la mise en page
 * pendant qu'on tape.
 */

/**
 * `top`/`left` en pourcentage du panneau, `size` en rem, `duration` en
 * secondes. Les positions évitent la bande centrale basse, où se tiennent les
 * dernières bulles et le champ de saisie.
 */
const FORMES = [
  { size: 9, left: '-8%', top: '6%', duration: 23, delay: 0, ring: false, tint: 'bg-brass/[0.07]' },
  { size: 6, left: '68%', top: '4%', duration: 19, delay: -6, ring: false, tint: 'bg-ink/[0.05]' },
  { size: 12, left: '52%', top: '46%', duration: 29, delay: -13, ring: false, tint: 'bg-brass/[0.05]' },
  { size: 5, left: '4%', top: '58%', duration: 17, delay: -3, ring: false, tint: 'bg-ink/[0.04]' },
  { size: 4.5, left: '80%', top: '68%', duration: 25, delay: -9, ring: true, tint: 'border-brass/20' },
  { size: 7, left: '22%', top: '28%', duration: 31, delay: -17, ring: true, tint: 'border-ink/10' },
  { size: 3, left: '58%', top: '80%', duration: 21, delay: -11, ring: true, tint: 'border-brass/15' },
]

/**
 * Calque décoratif à poser en premier enfant d'un conteneur `relative` et
 * `overflow-hidden` ; le contenu qui suit doit être `relative` pour passer
 * devant.
 */
export function ChatAmbience() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {FORMES.map(({ size, left, top, duration, delay, ring, tint }, index) => (
        <span
          key={index}
          className={[
            'absolute animate-bubble-drift rounded-full will-change-transform',
            ring ? `border ${tint}` : `${tint} blur-2xl`,
          ].join(' ')}
          style={{
            width: `${size}rem`,
            height: `${size}rem`,
            left,
            top,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
          }}
        />
      ))}
    </div>
  )
}
