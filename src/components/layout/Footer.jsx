import { Link } from 'react-router-dom'
import { Phone, MapPin, Mail, Facebook, Instagram, Linkedin } from 'lucide-react'
import { agency } from '../../data/agency'
import { latestAvailable } from '../../lib/properties'
import { PlanDivider } from '../ui/PlanDivider'

// Colonne « Informations » — ordre et intitulés imposés.
const infoLinks = [
  { to: '/estimer', label: 'Estimez votre bien' },
  { to: '/espace-vendeur', label: 'Espace vendeur' },
  { to: '/vendre', label: 'Vendre avec nous' },
  { to: '/contact', label: 'Nous contacter' },
]

// Colonne « Informations légales » — ordre imposé. Le barème d'honoraires est
// un document (PDF), pas une route interne : lien externe dédié.
const legalFooterLinks = [
  { to: '/recrutement', label: 'Recrutement' },
  { href: '/documents/bareme-honoraires-immovia.pdf', label: 'Nos honoraires' },
  { to: '/mentions-legales', label: 'Mentions légales' },
  { to: '/confidentialite', label: 'Politique de confidentialité' },
  { to: '/plan-du-site', label: 'Plan du site' },
]

const socialIcons = { Facebook, Instagram, LinkedIn: Linkedin }

// Lien commun à toute la colonne, avec une zone tactile généreuse.
const linkClass = 'inline-block py-1 -my-1 text-stone/80 transition-colors hover:text-brass'

function ColTitle({ children }) {
  return (
    <h2 className="mb-5 font-mono text-[0.7rem] uppercase tracking-micro text-brass">{children}</h2>
  )
}

export function Footer() {
  const recent = latestAvailable(3)

  return (
    <footer className="bg-ink text-stone">
      <div className="container-page py-16 sm:py-20">
        <PlanDivider className="mb-14" />

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-4">
          {/* IMMOVIA + coordonnées */}
          <div>
            <span className="font-display text-2xl font-medium tracking-tight">{agency.name}</span>

            <ul className="mt-6 space-y-4 text-sm">
              <li>
                <a href={agency.phoneHref} className={`inline-flex items-center gap-2.5 ${linkClass}`}>
                  <Phone className="h-4 w-4 shrink-0 text-brass" strokeWidth={1.6} aria-hidden="true" />
                  <span className="font-mono">{agency.phone}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${agency.email}`}
                  className={`inline-flex items-center gap-2.5 ${linkClass}`}
                >
                  <Mail className="h-4 w-4 shrink-0 text-brass" strokeWidth={1.6} aria-hidden="true" />
                  <span className="font-mono">{agency.email}</span>
                </a>
              </li>
              <li>
                <a
                  href={agency.mapsHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={`inline-flex items-start gap-2.5 ${linkClass}`}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brass" strokeWidth={1.6} aria-hidden="true" />
                  <span>
                    {agency.address.line1}
                    <br />
                    {agency.address.line2}
                  </span>
                </a>
              </li>
            </ul>
          </div>

          {/* Biens récents */}
          <nav aria-label="Biens récents">
            <ColTitle>Biens récents</ColTitle>
            <ul className="space-y-4 text-sm">
              {recent.map((p) => (
                <li key={p.reference}>
                  <Link to={`/bien/${p.reference}`} className={`group flex flex-col ${linkClass}`}>
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
            <ul className="space-y-4 text-sm">
              {infoLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className={linkClass}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Informations légales */}
          <nav aria-label="Informations légales">
            <ColTitle>Informations légales</ColTitle>
            <ul className="space-y-4 text-sm">
              {legalFooterLinks.map((l) => (
                <li key={l.to || l.href}>
                  {l.to ? (
                    <Link to={l.to} className={linkClass}>
                      {l.label}
                    </Link>
                  ) : (
                    <a href={l.href} target="_blank" rel="noreferrer noopener" className={linkClass}>
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-16 flex flex-col gap-8 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-xs text-stone/45">
            © {new Date().getFullYear()} {agency.name}. Tous droits réservés.
          </p>

          {/* Réseaux sociaux */}
          <ul className="flex items-center gap-5">
            {agency.social.map((s) => {
              const Icon = socialIcons[s.label]
              return (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={s.label}
                    className="-m-2 inline-flex items-center justify-center p-2 text-stone/70 transition-colors hover:text-brass"
                  >
                    {Icon ? <Icon className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" /> : s.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </footer>
  )
}
