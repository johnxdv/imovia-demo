import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { agency } from '../data/agency'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const labelClass = 'mb-2 block font-mono text-[0.62rem] uppercase tracking-micro text-stone/50'
const controlClass =
  'w-full border border-brass/25 bg-transparent px-4 py-3 font-sans text-sm text-stone placeholder:text-stone/35 focus:border-brass focus:outline-none'

export default function EspaceVendeur() {
  useDocumentTitle('Espace vendeur')
  const [note, setNote] = useState(false)

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-ink text-stone">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(#B08D57 1px, transparent 1px), linear-gradient(90deg, #B08D57 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="container-page relative w-full py-32">
        <div className="relative mx-auto max-w-md border border-brass/25 p-8 sm:p-10">
          <span className="absolute left-0 top-0 h-6 w-6 border-l border-t border-brass" />
          <span className="absolute right-0 top-0 h-6 w-6 border-r border-t border-brass" />
          <span className="absolute bottom-0 left-0 h-6 w-6 border-b border-l border-brass" />
          <span className="absolute bottom-0 right-0 h-6 w-6 border-b border-r border-brass" />

          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-brass" strokeWidth={1.6} aria-hidden="true" />
            <span className="font-display text-2xl font-medium tracking-tight">{agency.name}</span>
          </div>
          <h1 className="mt-6 font-display text-2xl text-stone">Espace vendeur</h1>
          <p className="mt-2 text-sm text-stone/60">
            Suivez la commercialisation de votre bien : visites, retours et offres.
          </p>

          <form
            className="mt-8 flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault()
              setNote(true)
            }}
          >
            <div>
              <label htmlFor="ev-email" className={labelClass}>
                Email
              </label>
              <input id="ev-email" type="email" autoComplete="email" className={controlClass} placeholder="vous@exemple.fr" />
            </div>
            <div>
              <label htmlFor="ev-pass" className={labelClass}>
                Mot de passe
              </label>
              <input id="ev-pass" type="password" autoComplete="current-password" className={controlClass} placeholder="••••••••" />
            </div>

            <button
              type="submit"
              className="mt-2 inline-flex items-center justify-center bg-brass px-8 py-3.5 font-mono text-[0.72rem] uppercase tracking-micro text-ink transition-colors duration-300 ease-plan hover:bg-brass/90"
            >
              Se connecter
            </button>
          </form>

          {note ? (
            <p className="mt-5 border-l-2 border-brass pl-3 font-mono text-[0.66rem] uppercase tracking-micro text-brass">
              Espace en cours de déploiement — accès prochainement disponible.
            </p>
          ) : (
            <p className="mt-5 font-mono text-[0.62rem] uppercase tracking-micro text-stone/40">
              Aperçu — authentification non active
            </p>
          )}

          <div className="mt-6 flex items-center justify-between text-sm">
            <span className="text-stone/40">Pas encore de compte ?</span>
            <Link to="/contact" className="font-mono text-[0.7rem] uppercase tracking-micro text-brass hover:text-brass/80">
              Nous contacter
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
