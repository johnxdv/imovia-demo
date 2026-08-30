import { Link } from 'react-router-dom'
import { Phone, MapPin, Mail } from 'lucide-react'
import { agency } from '../../data/agency'
import { legalNav } from '../../lib/nav'
import { latestAvailable } from '../../lib/properties'
import { PlanDivider } from '../ui/PlanDivider'

const infoLinks = [
  { to: '/estimer', label: 'Estimer' },
  { to: '/espace-vendeur', label: 'Espace vendeur' },
  { to: '/vendre', label: 'Vendre' },
  { to: '/contact', label: 'Contact' },
]

function ColTitle({ children, className = '' }) {
  return (
    <h2 className={`mb-5 font-mono text-[0.7rem] uppercase tracking-micro text-brass ${className}`}>
      {children}
    </h2>
  )
}

export function Footer() {
  const recent = latestAvailable(4)

  return (
    <footer className="bg-ink text-stone">
      <div className="container-page py-16 sm:py-20">
        <PlanDivider className="mb-14" />

        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Marque + coordonnées */}
          <div>
            <span className="font-display text-2xl font-medium tracking-tight">{agency.name}</span>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-stone/70">{agency.baseline}</p>

            <ul className="mt-6 space-y-3 text-sm">
              <li>
                <a
                  href={agency.phoneHref}
                  className="inline-flex items-center gap-2.5 text-stone/80 transition-colors hover:text-brass"
                >
                  <Phone className="h-4 w-4 text-brass" strokeWidth={1.6} aria-hidden="true" />
                  <span className="font-mono">{agency.phone}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${agency.email}`}
                  className="inline-flex items-center gap-2.5 text-stone/80 transition-colors hover:text-brass"
                >
                  <Mail className="h-4 w-4 text-brass" strokeWidth={1.6} aria-hidden="true" />
                  <span className="font-mono">{agency.email}</span>
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-stone/80">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brass" strokeWidth={1.6} aria-hidden="true" />
                <span>
                  {agency.address.line1}
                  <br />
                  {agency.address.line2}
                </span>
              </li>
            </ul>
          </div>

          {/* Biens récents */}
          <nav aria-label="Biens récents">
            <ColTitle>Biens récents</ColTitle>
            <ul className="space-y-3 text-sm">
              {recent.map((p) => (
                <li key={p.reference}>
                  <Link
                    to={`/bien/${p.reference}`}
                    className="group inline-flex flex-col text-stone/80 transition-colors hover:text-brass"
                  >
                    <span>{p.titre}</span>
                    <span className="font-mono text-xs text-stone/45">
                      {p.ville} · {p.reference}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Informations */}
          <nav aria-label="Informations">
            <ColTitle>Informations</ColTitle>
            <ul className="space-y-3 text-sm">
              {infoLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-stone/80 transition-colors hover:text-brass">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Légal + réseaux */}
          <div>
            <ColTitle>Informations légales</ColTitle>
            <ul className="space-y-3 text-sm">
              {legalNav.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-stone/80 transition-colors hover:text-brass">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            <ColTitle className="mt-8">Réseaux</ColTitle>
            <ul className="space-y-3 text-sm">
              {agency.social.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-2 text-stone/80 transition-colors hover:text-brass"
                  >
                    {s.label}
                    <span className="font-mono text-xs text-stone/45">{s.handle}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-2 border-t border-white/10 pt-8 font-mono text-xs text-stone/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {agency.name}. Tous droits réservés.</p>
          <p>Carte professionnelle CPI 3300 2024 000 000 000 — Démonstrateur.</p>
        </div>
      </div>
    </footer>
  )
}
