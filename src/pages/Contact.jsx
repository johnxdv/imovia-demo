import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Phone, Mail, MapPin, Clock, Check } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Section } from '../components/ui/Section'
import { PlanFrame } from '../components/ui/PlanFrame'
import { ConsentNotice } from '../components/ui/ConsentNotice'
import { agency } from '../data/agency'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const labelClass = 'mb-2 block font-mono text-[0.62rem] uppercase tracking-micro text-stone/50'
const controlClass =
  'w-full border border-brass/25 bg-transparent px-4 py-3 font-sans text-sm text-stone placeholder:text-stone/35 focus:border-brass focus:outline-none'

export default function Contact() {
  useDocumentTitle('Contact')
  const [searchParams] = useSearchParams()
  const bien = searchParams.get('bien')
  const [sent, setSent] = useState(false)

  const initialMessage = bien
    ? `Bonjour,\n\nJe souhaite organiser une visite du bien ${bien}.\n\nMerci de me recontacter.`
    : ''

  const handleSubmit = (e) => {
    e.preventDefault()
    // Démonstrateur — aucun envoi réseau. Confirmation côté client.
    setSent(true)
  }

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Parlons de votre projet."
        intro="Une question, une visite, une estimation ? Écrivez-nous ou passez nous voir. Nous répondons vite."
      />

      <Section tone="ink" py="pb-24 pt-4 sm:pb-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Formulaire */}
          <div className="lg:col-span-7">
            {sent ? (
              <div className="relative border border-brass/30 p-8 sm:p-12">
                <PlanFrame />
                <Check className="h-8 w-8 text-brass" strokeWidth={1.5} aria-hidden="true" />
                <h2 className="mt-6 text-display-md text-stone">Message bien reçu.</h2>
                <p className="mt-4 max-w-md text-stone/75">
                  Merci. Nous revenons vers vous dans les meilleurs délais. Pour une demande urgente,
                  appelez-nous directement au{' '}
                  <a href={agency.phoneHref} className="text-brass hover:underline">
                    {agency.phone}
                  </a>
                  .
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate={false}>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="nom" className={labelClass}>
                      Nom *
                    </label>
                    <input id="nom" name="nom" required autoComplete="name" className={controlClass} />
                  </div>
                  <div>
                    <label htmlFor="tel" className={labelClass}>
                      Téléphone
                    </label>
                    <input
                      id="tel"
                      name="tel"
                      type="tel"
                      autoComplete="tel"
                      className={`${controlClass} font-mono`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="email" className={labelClass}>
                      Email *
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className={controlClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="message" className={labelClass}>
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      defaultValue={initialMessage}
                      className={`${controlClass} resize-y`}
                    />
                  </div>
                </div>

                <div className="mt-8">
                  <ConsentNotice id="contact-consent" textClassName="text-stone/80" />
                </div>

                <div className="mt-6 flex items-center gap-6">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2.5 bg-brass px-8 py-4 font-mono text-[0.72rem] uppercase tracking-micro text-ink transition-colors duration-300 ease-plan hover:bg-brass/90"
                  >
                    Envoyer
                  </button>
                  <p className="font-mono text-[0.62rem] uppercase tracking-micro text-stone/40">
                    * Champs requis
                  </p>
                </div>
              </form>
            )}
          </div>

          {/* Coordonnées + carte */}
          <div className="lg:col-span-5">
            <ul className="space-y-6">
              <li className="flex items-start gap-4">
                <Phone className="mt-1 h-5 w-5 shrink-0 text-brass" strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <p className={labelClass}>Téléphone</p>
                  <a href={agency.phoneHref} className="font-mono text-stone transition-colors hover:text-brass">
                    {agency.phone}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <Mail className="mt-1 h-5 w-5 shrink-0 text-brass" strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <p className={labelClass}>Email</p>
                  <a
                    href={`mailto:${agency.email}`}
                    className="font-mono text-stone transition-colors hover:text-brass"
                  >
                    {agency.email}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-brass" strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <p className={labelClass}>Adresse</p>
                  <p className="text-stone">
                    {agency.address.line1}
                    <br />
                    {agency.address.line2}
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <Clock className="mt-1 h-5 w-5 shrink-0 text-brass" strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <p className={labelClass}>Horaires</p>
                  <p className="text-stone">{agency.hours}</p>
                </div>
              </li>
            </ul>

            <div
              className="group relative mt-10 aspect-[4/3] overflow-hidden border border-brass/25"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(176,141,87,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(176,141,87,0.12) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            >
              <span className="pointer-events-none absolute bottom-3 left-3 z-10 font-mono text-[0.62rem] uppercase tracking-micro text-stone/60">
                {agency.address.line1}
              </span>
              <iframe
                title={`Localisation de l'agence ${agency.name} à Diebling`}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${agency.mapBbox}&layer=mapnik&marker=${agency.mapMarker}`}
                className="relative h-full w-full grayscale-[0.35] contrast-95"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <PlanFrame />
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}
