import { PlanDivider } from './PlanDivider'
import { Reveal } from './Reveal'

/**
 * En-tête des pages intérieures — bande Ink, dégagée sous la navbar fixe,
 * clôturée par un trait de plan.
 */
export function PageHeader({ eyebrow, title, intro, children }) {
  return (
    <header className="bg-ink text-stone">
      <div className="container-page pb-14 pt-36 sm:pb-20 sm:pt-44">
        {eyebrow ? <p className="eyebrow mb-6">{eyebrow}</p> : null}
        <Reveal>
          <h1 className="max-w-4xl text-display-lg">{title}</h1>
        </Reveal>
        {intro ? (
          <Reveal delay={0.05}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone/75">{intro}</p>
          </Reveal>
        ) : null}
        {children}
        <PlanDivider className="mt-12" />
      </div>
    </header>
  )
}
