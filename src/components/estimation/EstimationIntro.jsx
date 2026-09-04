import { ArrowRight, Sparkles } from 'lucide-react'
import { GoldFrame, Shine } from '../ui/GoldFrame'

const stats = [
  { value: '30 sec', label: 'pour analyser' },
  { value: '100 %', label: 'gratuit' },
]

/**
 * Étape 1 — écran d'accueil de l'outil d'estimation.
 * `onStart` déclenche le passage à la saisie d'adresse.
 *
 * Deux niveaux de lumière, repris du CTA du hero mais volontairement hiérarchisés
 * pour ne pas surcharger : la carte porte un liseré lent (6 s) et un halo diffus,
 * le bouton final un liseré plus vif (4 s) plus un reflet. Les vitesses diffèrent
 * pour que les deux rotations ne se synchronisent jamais.
 */
export function EstimationIntro({ onStart }) {
  return (
    <div className="relative w-full max-w-md">
      {/* Halo diffus de la carte — seule l'opacité est animée. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-4 animate-cta-breath rounded-3xl bg-brass/40 blur-2xl"
      />

      {/* Liseré tournant de la carte. Le filet Ink très léger la détache du
          beige de la page, sur lequel l'or seul manquerait de contraste. */}
      <GoldFrame
        className="-inset-[3px] rounded-[1.2rem] shadow-[0_0_0_1px_rgba(16,20,28,0.12)]"
        spin="animate-border-spin-slow"
      />

      <div className="relative rounded-2xl border border-ink/10 bg-white p-7 shadow-[0_22px_54px_-16px_rgba(16,20,28,0.3),0_0_38px_-6px_rgba(176,141,87,0.5)] sm:p-9">
        <span className="absolute right-5 top-5 inline-flex items-center rounded-full bg-bottle px-3 py-1 font-mono text-[0.6rem] uppercase tracking-micro text-white sm:right-6 sm:top-6">
          Nouveau
        </span>

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-ink via-ink to-ink/70 shadow-lg shadow-ink/20">
          <Sparkles
            className="h-8 w-8 animate-sparkle-shimmer text-brass"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>

        <h1 className="mt-7 text-center font-display text-[1.7rem] font-semibold leading-tight text-ink sm:text-[2rem]">
          Estimez votre bien gratuitement
        </h1>

        <p className="mx-auto mt-4 max-w-sm text-center text-[0.95rem] leading-relaxed text-ink/55">
          Obtenez une estimation personnalisée de votre bien en quelques secondes.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-ink/5 bg-stone/60 px-4 py-5 text-center"
            >
              <p className="font-display text-2xl font-semibold leading-none text-ink">{stat.value}</p>
              <p className="mt-2 text-xs text-ink/50">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* CTA final : arrivée en léger rebond au chargement, puis liseré doré
            tournant et reflet. Sur le fond Ink, l'or ressort sans avoir besoin
            du filet sombre nécessaire sur les fonds clairs. */}
        <div className="relative mt-8 animate-cta-pop">
          <GoldFrame className="-inset-[2px] rounded-[0.87rem]" />

          <button
            type="button"
            onClick={onStart}
            className="group relative flex w-full touch-manipulation items-center justify-center overflow-hidden rounded-xl bg-ink px-6 py-4 shadow-[0_8px_20px_-10px_rgba(16,20,28,0.55),0_0_10px_-5px_rgba(176,141,87,0.7)] transition-shadow duration-300 ease-plan hover:shadow-[0_10px_24px_-10px_rgba(16,20,28,0.6),0_0_14px_-4px_rgba(176,141,87,0.85)]"
          >
            <Shine width="w-1/6" tint="via-brass/40" />

            <span className="relative inline-flex items-center gap-2.5 font-mono text-[0.72rem] uppercase tracking-micro text-white">
              Commencer l’estimation
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 ease-plan group-hover:translate-x-1"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
