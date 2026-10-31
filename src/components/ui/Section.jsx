import { PlanDivider } from './PlanDivider'

const tones = {
  ink: 'bg-ink text-stone',
  stone: 'bg-stone text-ink',
  white: 'bg-white text-ink',
}

/**
 * Section de page — gère le fond alterné (Ink / Warm Stone), l'espacement
 * généreux et, en option, le « trait de plan » qui se dessine en tête.
 */
export function Section({
  tone = 'ink',
  className = '',
  children,
  id,
  divider = false,
  dividerLabel,
  // Écart entre le trait de plan et le contenu qui le suit. Réglable parce que
  // l'écart par défaut, pensé pour des sections à titre long, laisse un vide
  // dans celles où le trait porte déjà l'intitulé — « Sélection », « Par où
  // commencer » — et où il n'y a rien entre lui et les cartes.
  dividerClassName = 'mb-12 sm:mb-16',
  container = true,
  py = 'py-20 sm:py-28',
}) {
  const inner = (
    <>
      {divider ? <PlanDivider className={dividerClassName} label={dividerLabel} /> : null}
      {children}
    </>
  )

  return (
    <section id={id} className={`${tones[tone]} ${py} ${className}`}>
      {container ? <div className="container-page">{inner}</div> : inner}
    </section>
  )
}
