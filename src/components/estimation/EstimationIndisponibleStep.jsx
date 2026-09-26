import { motion, useReducedMotion } from 'framer-motion'
import { MapPin, RotateCcw, TriangleAlert } from 'lucide-react'
import { StepBackLink } from './StepBackLink'
import { EASE } from '../../lib/motion'

/**
 * Écran servi quand le moteur d'estimation n'a pas pu répondre.
 *
 * POURQUOI CET ÉCRAN EXISTE. Jusqu'ici, une panne de la source DVF ne se voyait
 * pas : le moteur repliait silencieusement sur la médiane du département entier
 * et l'affichait comme une estimation de quartier. Sur une maison marseillaise,
 * cela faisait 403 000 € au lieu de 489 000 € — un écart de 86 000 € qu'aucun
 * écran, aucun journal et aucun champ de réponse ne signalait. Le front a
 * désormais de quoi dire « je ne sais pas », et c'est cet écran-là.
 *
 * Le moteur a déjà relancé une fois de lui-même (voir `requestEstimation`) : le
 * bouton ci-dessous est une troisième chance, à la main de l'utilisateur. Il
 * repart de la sélection déjà confirmée — rien n'est à refaire sur la carte.
 *
 * Volontairement sobre : pas de cadre doré, pas d'animation de bordure. Ces
 * ornements accompagnent l'annonce d'un montant, et il n'y en a pas ici.
 */
export function EstimationIndisponibleStep({ address, onRetry, onBack }) {
  const reduce = useReducedMotion()

  return (
    <div className="w-full max-w-lg">
      <StepBackLink onClick={onBack}>Modifier ma sélection</StepBackLink>

      <motion.div
        initial={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduce ? 0.2 : 0.5, ease: EASE }}
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ink/5"
      >
        <TriangleAlert className="h-7 w-7 text-brass" strokeWidth={1.75} aria-hidden="true" />
      </motion.div>

      <h1 className="titre-etape mt-7 text-center text-[1.7rem] leading-tight text-ink sm:text-[2rem]">
        Estimation momentanément indisponible
      </h1>

      <p className="mx-auto mt-4 flex max-w-md flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-center text-[0.85rem] leading-snug text-ink/55">
        <MapPin className="h-4 w-4 shrink-0 text-brass" strokeWidth={1.75} aria-hidden="true" />
        {address.label}
      </p>

      <div className="mt-8 rounded-2xl border border-ink/10 bg-white px-6 py-7 text-center shadow-[0_22px_54px_-18px_rgba(16,20,28,0.3)] sm:px-8">
        {/* Dire la vérité sans la détailler : la base publique des ventes est
            momentanément injoignable. Ce qu'il ne faut surtout pas faire, c'est
            annoncer un montant de consolation — c'est précisément ce que faisait
            la version précédente. */}
        <p className="font-display text-[0.95rem] leading-relaxed text-ink/75">
          La base publique des ventes immobilières ne répond pas pour le moment. Plutôt
          qu’un montant approximatif, nous préférons ne rien annoncer.
        </p>

        <p className="mx-auto mt-4 max-w-sm font-display text-[0.8rem] leading-relaxed text-ink/55">
          Votre sélection est conservée : une nouvelle tentative ne vous demandera rien de
          plus.
        </p>

        <button
          type="button"
          onClick={onRetry}
          className="group relative mt-7 flex w-full touch-manipulation items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-ink px-6 py-4 shadow-[0_8px_20px_-10px_rgba(16,20,28,0.55),0_0_10px_-5px_rgba(176,141,87,0.7)] transition-shadow duration-300 ease-plan hover:shadow-[0_10px_24px_-10px_rgba(16,20,28,0.6),0_0_14px_-4px_rgba(176,141,87,0.85)]"
        >
          <RotateCcw className="h-4 w-4 text-white" strokeWidth={2} aria-hidden="true" />
          <span className="font-display text-[0.95rem] font-semibold text-white">
            Réessayer
          </span>
        </button>
      </div>
    </div>
  )
}
