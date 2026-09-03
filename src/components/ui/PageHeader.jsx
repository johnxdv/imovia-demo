import { PlanDivider } from './PlanDivider'
import { Reveal } from './Reveal'

const tones = {
  ink: { header: 'bg-ink text-stone', intro: 'text-stone/75' },
  white: { header: 'bg-white text-ink', intro: 'text-ink/70' },
}

/**
 * En-tête des pages intérieures — bande Ink par défaut (ou blanche via
 * `tone="white"`), dégagée sous la navbar fixe, clôturée par un trait de plan.
 */
export function PageHeader({ eyebrow, title, intro, children, eyebrowClassName = '', tone = 'ink' }) {
  const t = tones[tone]
  return (
    <header className={t.header}>
      <div className="container-page pb-14 pt-36 sm:pb-20 sm:pt-44">
        {eyebrow ? <p className={`eyebrow mb-6 ${eyebrowClassName}`}>{eyebrow}</p> : null}
        <Reveal>
          <h1 className="max-w-4xl text-display-lg">{title}</h1>
        </Reveal>
        {intro ? (
          <Reveal delay={0.05}>
            <p className={`mt-6 max-w-2xl text-lg leading-relaxed ${t.intro}`}>{intro}</p>
          </Reveal>
        ) : null}
        {children}
        <PlanDivider className="mt-12" />
      </div>
    </header>
  )
}
