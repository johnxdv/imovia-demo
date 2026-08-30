import { PageHeader } from './PageHeader'
import { Section } from './Section'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

/**
 * Gabarit commun aux pages légales — traitement simple et cohérent.
 * `sections` : [{ titre, corps: string[] }]
 */
export function LegalPage({ eyebrow = 'Informations légales', title, intro, sections }) {
  useDocumentTitle(title)
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} intro={intro} />
      <Section tone="ink" py="pb-24 pt-4 sm:pb-28">
        <div className="max-w-3xl">
          {sections.map((s) => (
            <div key={s.titre} className="mt-12 first:mt-0">
              <h2 className="font-display text-2xl text-stone">{s.titre}</h2>
              <div className="mt-4 space-y-4 text-base leading-relaxed text-stone/75">
                {s.corps.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}
