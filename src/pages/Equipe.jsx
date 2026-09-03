import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Mail, Phone } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Section } from '../components/ui/Section'
import { RevealGroup, RevealChild } from '../components/ui/Reveal'
import { PlanFrame } from '../components/ui/PlanFrame'
import { ContactConseillerModal } from '../components/team/ContactConseillerModal'
import { team } from '../data/team'
import { photoUrl, photoSrcSet } from '../lib/format'
import { useDocumentTitle } from '../lib/useDocumentTitle'

// Photo générique, volontairement floutée à l'excès — la carte Recrutement
// n'identifie personne, elle invite à postuler.
const RECRUTEMENT_PHOTO = '1607990281513-2c110a25bd8c'

export default function Equipe() {
  useDocumentTitle('Équipe')
  const [activeAdvisor, setActiveAdvisor] = useState(null)

  return (
    <>
      <PageHeader
        eyebrow="L'équipe"
        title="Les visages derrière l’agence."
        intro="Chaque projet mérite une attention particulière. Notre équipe vous accompagne avec écoute, transparence et exigence, de la première rencontre jusqu’à sa concrétisation. Contactez directement la personne de votre choix."
      />

      <Section tone="ink" py="pb-24 pt-4 sm:pb-28">
        <RevealGroup className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((m) => (
            <RevealChild key={m.id}>
              <article className="group">
                <div className="relative aspect-[3/4] overflow-hidden bg-ink">
                  <img
                    src={photoUrl(m.photo, { w: 700 })}
                    srcSet={photoSrcSet(m.photo, [320, 480, 700])}
                    sizes="(min-width:1024px) 30vw, (min-width:640px) 45vw, 92vw"
                    alt={m.nom}
                    loading="lazy"
                    className="h-full w-full object-cover grayscale transition-all duration-500 ease-plan group-hover:grayscale-0"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
                  <PlanFrame />
                </div>
                <div className="pt-5">
                  <h2 className="font-display text-xl text-stone">{m.nom}</h2>
                  <p className="mt-1 font-mono text-[0.7rem] uppercase tracking-micro text-brass">
                    {m.role}
                  </p>
                  <div className="mt-4 flex flex-col gap-2 text-sm">
                    <a
                      href={`tel:${m.phone.replace(/\s/g, '')}`}
                      className="inline-flex items-center gap-2.5 text-stone/75 transition-colors hover:text-brass"
                    >
                      <Phone className="h-4 w-4 text-brass" strokeWidth={1.6} aria-hidden="true" />
                      <span className="font-mono">{m.phone}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setActiveAdvisor(m)}
                      className="inline-flex items-center gap-2 font-mono text-xs text-stone/50 transition-colors hover:text-brass"
                    >
                      <Mail className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden="true" />
                      Envoyer un e-mail
                    </button>
                  </div>
                </div>
              </article>
            </RevealChild>
          ))}

          {/* Carte Recrutement — ni téléphone ni e-mail, entièrement cliquable */}
          <RevealChild>
            <Link to="/recrutement" className="group block">
              <div className="relative aspect-[3/4] overflow-hidden bg-ink">
                <img
                  src={photoUrl(RECRUTEMENT_PHOTO, { w: 700 })}
                  srcSet={photoSrcSet(RECRUTEMENT_PHOTO, [320, 480, 700])}
                  sizes="(min-width:1024px) 30vw, (min-width:640px) 45vw, 92vw"
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="h-full w-full scale-125 object-cover grayscale blur-2xl"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
                <PlanFrame />
              </div>
              <div className="pt-5">
                <h2 className="font-display text-xl text-stone">Vous ?</h2>
                <p className="mt-1 inline-flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-micro text-brass transition-transform duration-300 ease-plan group-hover:translate-x-0.5">
                  Rejoignez-nous
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                </p>
              </div>
            </Link>
          </RevealChild>
        </RevealGroup>
      </Section>

      <ContactConseillerModal advisor={activeAdvisor} onClose={() => setActiveAdvisor(null)} />
    </>
  )
}
