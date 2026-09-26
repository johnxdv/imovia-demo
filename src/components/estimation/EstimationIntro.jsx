import { ArrowRight } from 'lucide-react'
import { GrowthArrowIcon } from '../ui/GrowthArrowIcon'

const stats = [
  { value: '30 sec', label: 'pour analyser' },
  { value: '100 %', label: 'gratuit' },
]

/**
 * Étape 1 — écran d'accueil de l'outil d'estimation.
 * `onStart` déclenche le passage à la saisie d'adresse.
 *
 * Panneau de verre dépoli, comme toutes les étapes du parcours : c'est la scène
 * 3D qui porte le mouvement désormais (voir `DroneScene`), et le panneau ne
 * cherche plus à en ajouter. Les ornements qu'il portait — halo respirant,
 * liserés dorés tournants, reflet balayant le bouton, arrivée en rebond — ont
 * tous été retirés : devant un chantier filmé au drone, ils se disputaient
 * l'attention sans rien dire de plus.
 */
export function EstimationIntro({ onStart }) {
  return (
    <div className="panneau-verre w-full max-w-md p-8 sm:p-9">
      <div className="relative">
        <span className="absolute right-0 top-0 inline-flex items-center rounded-full bg-bottle px-3 py-1 font-mono text-[0.6rem] uppercase tracking-micro text-white">
          Nouveau
        </span>

        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-ink via-ink to-ink/70">
          <GrowthArrowIcon className="h-8 w-8 text-laiton" />
        </div>
      </div>

      <h1 className="titre-etape mt-7 text-center text-[1.7rem] leading-tight text-ink sm:text-[2rem]">
        Estimez votre bien gratuitement
      </h1>

      <p className="mx-auto mt-4 max-w-sm text-center text-[0.98rem] leading-relaxed text-ink/70">
        Obtenez une estimation personnalisée de votre bien en quelques secondes.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="panneau-interne px-4 py-5 text-center">
            <p className="titre-etape text-[1.7rem] leading-none text-ink">{stat.value}</p>
            <p className="mt-2 text-sm text-ink/60">{stat.label}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onStart}
        className="bouton-tunnel group mt-8 flex w-full items-center justify-center px-6 py-4"
      >
        <span className="inline-flex items-center gap-2.5 text-[0.95rem] font-semibold uppercase tracking-[0.07em]">
          Commencer l’estimation
          <ArrowRight
            className="h-4 w-4 transition-transform duration-300 ease-plan group-hover:translate-x-1"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </span>
      </button>
    </div>
  )
}
