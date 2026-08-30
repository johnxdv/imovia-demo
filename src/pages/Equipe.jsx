import { Mail, Phone } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Section } from '../components/ui/Section'
import { RevealGroup, RevealChild } from '../components/ui/Reveal'
import { PlanFrame } from '../components/ui/PlanFrame'
import { team } from '../data/team'
import { photoUrl, photoSrcSet } from '../lib/format'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export default function Equipe() {
  useDocumentTitle('Équipe')
  return (
    <>
      <PageHeader
        eyebrow="L'équipe"
        title="Les visages derrière l’agence."
        intro="Une équipe stable et disponible, qui connaît ses secteurs et suit chaque dossier de près. Écrivez ou appelez directement la bonne personne."
      />

      <Section tone="ink" py="pb-24 pt-4 sm:pb-28">
        <RevealGroup className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((m) => (
            <RevealChild key={m.email}>
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
                      href={`tel:+33${m.phone.replace(/\s/g, '').slice(1)}`}
                      className="inline-flex items-center gap-2.5 text-stone/75 transition-colors hover:text-brass"
                    >
                      <Phone className="h-4 w-4 text-brass" strokeWidth={1.6} aria-hidden="true" />
                      <span className="font-mono">{m.phone}</span>
                    </a>
                    <a
                      href={`mailto:${m.email}`}
                      className="inline-flex items-center gap-2.5 text-stone/75 transition-colors hover:text-brass"
                    >
                      <Mail className="h-4 w-4 text-brass" strokeWidth={1.6} aria-hidden="true" />
                      <span className="font-mono">{m.email}</span>
                    </a>
                  </div>
                </div>
              </article>
            </RevealChild>
          ))}
        </RevealGroup>
      </Section>
    </>
  )
}
