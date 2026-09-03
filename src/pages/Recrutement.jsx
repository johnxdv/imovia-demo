import { useState } from 'react'
import { Check } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Section } from '../components/ui/Section'
import { Reveal } from '../components/ui/Reveal'
import { ConsentNotice } from '../components/ui/ConsentNotice'
import { agency } from '../data/agency'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const labelClass = 'mb-2 block font-mono text-[0.62rem] uppercase tracking-micro text-ink/50'
const controlClass =
  'w-full border border-ink/20 bg-transparent px-4 py-3 font-sans text-sm text-ink placeholder:text-ink/35 focus:border-brass focus:outline-none'

const raisons = [
  'Un nombre de mandats maîtrisé, pour suivre chaque dossier avec sérieux.',
  'Une équipe qui partage ses secteurs, ses informations et ses acquéreurs.',
  'Des outils modernes et une image à la hauteur des biens que nous défendons.',
]

export default function Recrutement() {
  useDocumentTitle('Recrutement')
  const [sent, setSent] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const nom = data.get('nom') || ''
    const poste = data.get('poste') || ''
    const email = data.get('email') || ''
    const message = data.get('message') || ''
    const subject = `Candidature — ${poste || 'spontanée'} — ${nom}`
    const body = `${message}\n\n—\n${nom}\n${email}`
    // Ouverture du client mail (candidature par mailto).
    window.location.href = `mailto:${agency.recrutementEmail}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`
    setSent(true)
  }

  return (
    <>
      <PageHeader
        eyebrow="Recrutement"
        title="Faire de l’immobilier autrement, avec nous."
        intro="Nous recrutons des conseillers exigeants, à l’aise sur le terrain comme dans la relation. Si c’est vous, écrivez-nous."
      />

      <Section tone="stone" py="pb-24 pt-4 sm:pb-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Pourquoi nous rejoindre */}
          <div className="lg:col-span-5">
            <Reveal>
              <h2 className="text-display-md text-ink">Pourquoi nous rejoindre</h2>
            </Reveal>
            <ul className="mt-8 space-y-5">
              {raisons.map((r) => (
                <li key={r} className="flex items-start gap-3 border-t border-ink/15 pt-5">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-bottle" strokeWidth={1.6} aria-hidden="true" />
                  <span className="text-base leading-relaxed text-ink/75">{r}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-ink/60">
              Vous pouvez aussi écrire directement à{' '}
              <a href={`mailto:${agency.recrutementEmail}`} className="text-bottle underline underline-offset-2">
                {agency.recrutementEmail}
              </a>
              .
            </p>
          </div>

          {/* Candidature */}
          <div className="lg:col-span-7">
            {sent ? (
              <div className="border border-ink/20 p-8 sm:p-12">
                <Check className="h-8 w-8 text-bottle" strokeWidth={1.5} aria-hidden="true" />
                <h2 className="mt-6 text-display-md text-ink">Votre client mail s’ouvre.</h2>
                <p className="mt-4 max-w-md text-ink/70">
                  Finalisez l’envoi de votre message depuis votre messagerie. Si rien ne s’est ouvert,
                  écrivez-nous à{' '}
                  <a href={`mailto:${agency.recrutementEmail}`} className="text-bottle underline underline-offset-2">
                    {agency.recrutementEmail}
                  </a>
                  .
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="nom" className={labelClass}>
                      Nom *
                    </label>
                    <input id="nom" name="nom" required autoComplete="name" className={controlClass} />
                  </div>
                  <div>
                    <label htmlFor="poste" className={labelClass}>
                      Poste souhaité
                    </label>
                    <input
                      id="poste"
                      name="poste"
                      placeholder="Conseiller, assistanat…"
                      className={controlClass}
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
                      Quelques mots sur vous *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      className={`${controlClass} resize-y`}
                    />
                  </div>
                </div>

                <div className="mt-8">
                  <ConsentNotice id="recrutement-consent" />
                </div>

                <div className="mt-6 flex items-center gap-6">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2.5 bg-ink px-8 py-4 font-mono text-[0.72rem] uppercase tracking-micro text-stone transition-colors duration-300 ease-plan hover:bg-ink/90"
                  >
                    Envoyer ma candidature
                  </button>
                  <p className="font-mono text-[0.62rem] uppercase tracking-micro text-ink/40">
                    * Champs requis
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </Section>
    </>
  )
}
