import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Check, MapPin } from 'lucide-react'
import { GoldFrame, Shine } from '../ui/GoldFrame'
import { formatEuros } from '../../lib/format'
import { EASE } from '../../lib/motion'

/**
 * Écran 3 — l'estimation est prête, mais le montant reste flouté tant que les
 * coordonnées n'ont pas été renseignées.
 *
 * Le floutage est ici purement visuel : le montant affiché est une valeur de
 * démonstration, et le vrai calcul n'est pas branché. Le jour où il le sera,
 * le montant ne devra plus descendre dans la page avant la capture des
 * coordonnées — un flou CSS se contourne en trois clics dans un inspecteur.
 */
export function EstimationResultStep({ address, price, onBack, onViewEstimation }) {
  const reduce = useReducedMotion()
  const formatted = formatEuros(price)

  return (
    <div className="w-full max-w-lg">
      <button
        type="button"
        onClick={onBack}
        className="group mb-8 inline-flex touch-manipulation items-center gap-2 font-mono text-[0.68rem] uppercase tracking-micro text-ink/45 transition-colors hover:text-ink"
      >
        <ArrowLeft
          className="h-4 w-4 transition-transform duration-300 ease-plan group-hover:-translate-x-1"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        Modifier ma sélection
      </button>

      <motion.div
        initial={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduce ? 0.2 : 0.5, ease: EASE }}
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-bottle shadow-lg shadow-bottle/25"
      >
        <Check className="h-8 w-8 text-white" strokeWidth={2.25} aria-hidden="true" />
      </motion.div>

      <h1 className="mt-7 text-center font-display text-[1.7rem] font-semibold leading-tight text-ink sm:text-[2rem]">
        Votre estimation est prête
      </h1>

      {/* Rappel de l'adresse estimée : sans le montant, c'est tout ce qui
          rattache l'écran au bien de l'utilisateur. */}
      <p className="mx-auto mt-4 flex max-w-md flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-center text-[0.85rem] leading-snug text-ink/55">
        <MapPin className="h-4 w-4 shrink-0 text-brass" strokeWidth={1.75} aria-hidden="true" />
        {address.label}
      </p>

      <div className="relative mt-8">
        <GoldFrame className="-inset-[2px] rounded-[1.05rem]" spin="animate-border-spin-slow" />

        <div className="relative overflow-hidden rounded-2xl border border-ink/10 bg-white px-6 py-8 text-center shadow-[0_22px_54px_-18px_rgba(16,20,28,0.3)] sm:px-8">
          <p className="font-mono text-[0.6rem] uppercase tracking-micro text-ink/40">
            Estimation de votre bien
          </p>

          {/* Le montant domine délibérément l'écran — au point d'aiguiser la
              curiosité plutôt que de simplement l'informer. `clamp()` plutôt
              qu'un palier fixe : la taille suit la largeur de l'écran en continu,
              jusqu'au plafond `sm:`, sans jamais dépasser la carte sur un petit
              mobile.
              Le flou reste volontairement modéré : assez pour qu'aucun chiffre
              ne se lise précisément, assez léger pour deviner la silhouette
              d'un prix (les groupes de chiffres, le symbole €). Une valeur trop
              forte dissout la forme entière et ne donne plus rien à deviner —
              l'inverse de l'effet recherché. */}
          <div className="mt-5 flex items-center justify-center">
            {/* Masqué au lecteur d'écran comme à l'œil : le flou n'aurait aucun
                sens s'il laissait passer le chiffre par l'accessibilité. */}
            <span
              aria-hidden="true"
              className="select-none whitespace-nowrap font-display text-[clamp(2.75rem,15vw,4.25rem)] font-semibold leading-none text-ink blur-[13px] sm:text-[6.5rem] sm:blur-[21px]"
            >
              {formatted ?? '— €'}
            </span>
          </div>

          <p className="mt-7 font-display text-lg font-semibold text-ink sm:text-xl">
            Résultats détaillés disponibles
          </p>
          <p className="mx-auto mt-3 max-w-sm text-[0.9rem] leading-relaxed text-ink/55">
            Un expert va finaliser votre étude et vous présenter les meilleures options
            pour votre projet.
          </p>

          <div className="relative mx-auto mt-7 max-w-[15rem]">
            <GoldFrame className="-inset-[2px] rounded-[0.87rem]" />

            <button
              type="button"
              onClick={onViewEstimation}
              className="group relative flex w-full touch-manipulation items-center justify-center overflow-hidden rounded-xl bg-ink px-6 py-4 shadow-[0_8px_20px_-10px_rgba(16,20,28,0.55),0_0_10px_-5px_rgba(176,141,87,0.7)] transition-shadow duration-300 ease-plan hover:shadow-[0_10px_24px_-10px_rgba(16,20,28,0.6),0_0_14px_-4px_rgba(176,141,87,0.85)]"
            >
              <Shine width="w-1/5" tint="via-brass/40" />
              <span className="relative font-mono text-[0.72rem] uppercase tracking-micro text-white">
                Voir mon estimation
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
