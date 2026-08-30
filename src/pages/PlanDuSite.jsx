import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Section } from '../components/ui/Section'
import { primaryNav, secondaryNav, legalNav } from '../lib/nav'
import { availableFor, soldProperties } from '../lib/properties'
import { useDocumentTitle } from '../lib/useDocumentTitle'

function LinkColumn({ title, links }) {
  return (
    <div>
      <h2 className="mb-5 font-mono text-[0.7rem] uppercase tracking-micro text-brass">{title}</h2>
      <ul className="space-y-3">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-sm text-stone/80 transition-colors hover:text-brass">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function PlanDuSite() {
  useDocumentTitle('Plan du site')

  const ventes = availableFor('vente').map((p) => ({ to: `/bien/${p.reference}`, label: p.titre }))
  const locations = availableFor('location').map((p) => ({ to: `/bien/${p.reference}`, label: p.titre }))
  const vendus = soldProperties().map((p) => ({ to: `/bien/${p.reference}`, label: p.titre }))

  return (
    <>
      <PageHeader
        eyebrow="Plan du site"
        title="Toutes les pages, d’un coup d’œil."
        intro="La structure complète du site et l’ensemble de nos biens en ligne."
      />

      <Section tone="ink" py="pb-24 pt-4 sm:pb-28">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
          <LinkColumn title="Navigation" links={primaryNav} />
          <LinkColumn title="Votre espace" links={secondaryNav} />
          <LinkColumn title="Informations légales" links={legalNav} />
          <LinkColumn title="Biens à vendre" links={ventes} />
          <LinkColumn title="Biens à louer" links={locations} />
          <LinkColumn title="Biens vendus" links={vendus} />
        </div>
      </Section>
    </>
  )
}
