import { Link } from 'react-router-dom'
import { HouseTrendIcon } from '../ui/HouseTrendIcon'
import { GoldFrame, Shine } from '../ui/GoldFrame'

/**
 * CTA d'estimation du hero — bouton blanc compact repris de l'écran
 * d'estimation : pastille Ink dégradée au pictogramme maison + courbe
 * ascendante Brass, libellé principal et mention secondaire.
 *
 * Accroches superposées, toutes en CSS pur, toutes sur `transform` ou `opacity`
 * (composite GPU, aucun reflow — le scroll mobile reste fluide) :
 *   1. halo Brass diffus qui respire, posé derrière le bouton ;
 *   2. liseré doré de 3 px qui tourne autour du cadre (arc conique en rotation),
 *      souligné d'un filet Ink qui le détache du fond clair de la vidéo ;
 *   3. reflet diagonal qui balaie le bouton, un passage par cycle ;
 *   4. pictogramme qui scintille, désynchronisé du halo.
 * `prefers-reduced-motion` les fige toutes via la règle globale d'index.css.
 */
export function EstimationCta({ className = '' }) {
  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {/* 1 — halo d'élévation. Teinté Brass et non blanc : un halo blanc posé au
          ras du liseré délavait l'or au lieu de le renforcer. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 animate-cta-breath rounded-2xl bg-brass/45 blur-xl"
      />

      {/* 2 — liseré tournant, 3 px visibles. Le `shadow` pose un filet Ink juste
          à l'extérieur de l'or : sans lui, le liseré se fond dans les zones
          claires de la vidéo du hero. */}
      <GoldFrame className="-inset-[3px] rounded-[0.95rem] shadow-[0_0_0_1.5px_rgba(16,20,28,0.55)]" />

      <Link
        to="/estimer"
        className="group relative inline-flex items-center gap-3.5 overflow-hidden rounded-xl bg-white px-6 py-4 shadow-[0_14px_36px_-10px_rgba(16,20,28,0.85),0_0_26px_-1px_rgba(176,141,87,0.6)] transition-shadow duration-300 ease-plan hover:shadow-[0_18px_44px_-10px_rgba(16,20,28,0.9),0_0_34px_0px_rgba(176,141,87,0.75)] sm:gap-4 sm:px-7 sm:py-[1.15rem]"
      >
        {/* 3 — reflet diagonal. Teinté Brass : un reflet blanc serait invisible
            sur le fond blanc du bouton. */}
        <Shine />

        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ink via-ink to-ink/75 sm:h-12 sm:w-12">
          {/* 4 — scintillement */}
          <HouseTrendIcon className="h-5 w-5 animate-sparkle-shimmer text-brass sm:h-6 sm:w-6" />
        </span>

        <span className="relative flex flex-col items-start gap-1">
          <span className="font-mono text-[0.85rem] font-medium uppercase tracking-micro text-ink">
            Estimer mon bien
          </span>
          <span className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.06em] text-ink/70">
            30 sec · 100&nbsp;% gratuit
          </span>
        </span>
      </Link>
    </div>
  )
}
