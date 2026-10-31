import { PageHeader } from './PageHeader'
import { Section } from './Section'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

/**
 * Gabarit commun aux pages légales — traitement simple et cohérent.
 *
 * `sections` : [{ titre, corps: Corps[] }]
 *
 * Un élément de `corps` est soit une CHAÎNE, rendue en paragraphe comme
 * auparavant, soit `{ liste: string[] }`, rendu en liste à puces. L'ajout est
 * rétrocompatible : les pages qui ne passent que des chaînes rendent
 * exactement le même HTML qu'avant.
 *
 * La liste existe pour la politique de confidentialité, où les catégories de
 * données, les bases légales et les destinataires sont des énumérations : les
 * aplatir en phrases rendait la page juste, et illisible.
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
                {s.corps.map((bloc, i) =>
                  typeof bloc === 'string' ? (
                    <p key={i}>{bloc}</p>
                  ) : (
                    <ul key={i} className="space-y-2 pl-1">
                      {bloc.liste.map((item, j) => (
                        <li key={j} className="flex gap-3">
                          <span aria-hidden="true" className="mt-[0.6em] h-px w-3 shrink-0 bg-brass" />
                          <span className="flex-1">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}
