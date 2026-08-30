import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Reveal } from '../components/ui/Reveal'
import { PlanDivider } from '../components/ui/PlanDivider'
import { Button } from '../components/ui/Button'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export default function Estimer() {
  useDocumentTitle('Estimer')
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-ink text-stone">
      {/* Fond « plan » discret */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(#B08D57 1px, transparent 1px), linear-gradient(90deg, #B08D57 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="container-page relative w-full py-32">
        <div className="relative mx-auto max-w-3xl border border-brass/25 px-6 py-16 text-center sm:px-16 sm:py-24">
          {/* Repères d'angle */}
          <span className="absolute left-0 top-0 h-6 w-6 border-l border-t border-brass" />
          <span className="absolute right-0 top-0 h-6 w-6 border-r border-t border-brass" />
          <span className="absolute bottom-0 left-0 h-6 w-6 border-b border-l border-brass" />
          <span className="absolute bottom-0 right-0 h-6 w-6 border-b border-r border-brass" />

          <p className="eyebrow">Estimation</p>
          <Reveal>
            <h1 className="mx-auto mt-6 max-w-2xl text-display-lg">
              Bientôt, l’estimation de votre bien en quelques minutes.
            </h1>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-stone/75">
              Cette section accueillera prochainement notre outil d’estimation. En attendant, nous
              réalisons chaque estimation à la main, avec la même exigence.
            </p>
          </Reveal>

          <div className="mx-auto mt-10 max-w-xs">
            <PlanDivider />
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button to="/contact" variant="primary" size="lg">
              Demander une estimation
            </Button>
            <Link
              to="/vendre"
              className="group/al inline-flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-micro text-brass transition-colors hover:text-brass/80"
            >
              Notre accompagnement vendeur
              <ArrowUpRight
                className="h-4 w-4 transition-transform duration-300 ease-plan group-hover/al:translate-x-0.5 group-hover/al:-translate-y-0.5"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </Link>
          </div>

          <p className="mt-10 font-mono text-[0.66rem] uppercase tracking-micro text-stone/40">
            Outil d’estimation en ligne — en préparation
          </p>
        </div>
      </div>
    </section>
  )
}
