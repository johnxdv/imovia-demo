import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Check } from 'lucide-react'
import { GoldFrame, Shine } from '../ui/GoldFrame'
import { GrowthArrowIcon } from '../ui/GrowthArrowIcon'
import { EASE } from '../../lib/motion'

/** Éléments focusables du panneau, pour le maintien du focus à l'intérieur. */
const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Fenêtre de confirmation du bâtiment sélectionné.
 *
 * Vraie fenêtre modale, et non un calque posé sur la carte : le fond assombri
 * et flouté couvre toute la page, le panneau s'ouvre au centre de l'écran.
 *
 * Le positionnement `fixed` fonctionne ici sans portail parce que Framer Motion
 * laisse `transform: none` sur l'étape au repos. Pendant la transition vers
 * l'écran suivant, l'étape reprend un `transform` et la fenêtre glisse alors
 * avec la page — exactement l'enchaînement recherché.
 *
 * Le type de bien détecté n'est volontairement pas affiché : la détection tourne
 * en arrière-plan pour le futur calcul d'estimation, elle n'a rien à dire à
 * l'utilisateur à ce stade.
 */
export function BuildingConfirmModal({ onClose, onEstimate }) {
  const panelRef = useRef(null)
  const reduce = useReducedMotion()

  // Fermeture au clavier + maintien du focus dans la fenêtre, sans quoi la
  // tabulation repartirait dans la navigation, derrière le fond assombri.
  useEffect(() => {
    const previouslyFocused = document.activeElement
    panelRef.current?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const targets = panelRef.current?.querySelectorAll(FOCUSABLE)
      if (!targets?.length) return

      const first = targets[0]
      const last = targets[targets.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [onClose])

  // Blocage du défilement de la page. La largeur de l'ascenseur est compensée :
  // sans cela, le contenu du fond saute latéralement à l'ouverture, et le
  // décalage se voit d'autant plus que ce fond reste visible sous le flou.
  useEffect(() => {
    const { body, documentElement } = document
    const scrollbar = window.innerWidth - documentElement.clientWidth
    const previousOverflow = body.style.overflow
    const previousPadding = body.style.paddingRight

    body.style.overflow = 'hidden'
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`

    return () => {
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPadding
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.15 : 0.28, ease: EASE }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/45 px-5 py-10 backdrop-blur-md"
    >
      {/* Le fond ferme la fenêtre ; le panneau, posé au-dessus, retient le clic. */}
      <button
        type="button"
        aria-label="Fermer"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-batiment-titre"
        tabIndex={-1}
        initial={{ opacity: 0, y: reduce ? 0 : 16, scale: reduce ? 1 : 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: reduce ? 0 : 8, scale: reduce ? 1 : 0.98 }}
        transition={{ duration: reduce ? 0.15 : 0.34, ease: EASE }}
        className="relative w-full max-w-sm outline-none"
      >
        <GoldFrame className="-inset-[2px] rounded-[1.05rem]" spin="animate-border-spin-slow" />

        <div className="relative rounded-2xl border border-ink/10 bg-white px-6 py-9 text-center shadow-[0_28px_64px_-18px_rgba(16,20,28,0.55)] sm:px-8">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-bottle shadow-lg shadow-bottle/25">
            <Check className="h-8 w-8 text-white" strokeWidth={2.25} aria-hidden="true" />
          </span>

          <h2
            id="confirmation-batiment-titre"
            className="mt-6 font-display text-[1.75rem] font-semibold leading-tight text-ink sm:text-[2.1rem]"
          >
            Bien confirmé
          </h2>

          <p className="mx-auto mt-3 max-w-xs text-[0.9rem] leading-relaxed text-ink/55">
            Nous allons réaliser une analyse instantanée afin de vous donner une estimation.
          </p>

          <FormingFigure />

          <div className="relative mx-auto mt-7 max-w-[19rem]">
            <GoldFrame className="-inset-[2px] rounded-[0.87rem]" />

            <button
              type="button"
              onClick={onEstimate}
              className="group relative flex w-full touch-manipulation items-center justify-center overflow-hidden rounded-xl bg-ink px-5 py-4 shadow-[0_8px_20px_-10px_rgba(16,20,28,0.55),0_0_10px_-5px_rgba(176,141,87,0.7)] transition-shadow duration-300 ease-plan hover:shadow-[0_10px_24px_-10px_rgba(16,20,28,0.6),0_0_14px_-4px_rgba(176,141,87,0.85)]"
            >
              <Shine width="w-1/5" tint="via-brass/40" />
              <span className="relative font-mono text-[0.7rem] uppercase tracking-micro text-white">
                Obtenir une estimation instantanée
              </span>
            </button>
          </div>

          {/* Seule sortie visible depuis le retrait de la croix — délibérément
              en retrait, mais nommée : « Modifier ma sélection » dit ce qui va
              se passer là où une croix laissait deviner. La flèche reprend le
              même retour visuel que les boutons « Retour » des autres étapes. */}
          <button
            type="button"
            onClick={onClose}
            className="group mt-5 inline-flex touch-manipulation items-center gap-1.5 text-[0.8rem] text-ink/40 underline-offset-4 transition-colors hover:text-ink/70 hover:underline"
          >
            <ArrowLeft
              className="h-3.5 w-3.5 transition-transform duration-300 ease-plan group-hover:-translate-x-1"
              strokeWidth={2}
              aria-hidden="true"
            />
            Modifier ma sélection
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/**
 * Décor d'anticipation : un montant en train de se former, jamais lisible.
 *
 * Purement ornemental — rien n'est calculé à ce stade, et le vrai montant ne
 * sera de toute façon pas connu avant l'écran de résultat. Les blocs reprennent
 * le découpage d'un prix (« XXX XXX € ») pour que l'œil y lise un chiffre
 * plutôt qu'une barre de chargement.
 *
 * Tout est animé en CSS, sur `opacity` et `transform` uniquement : ces deux
 * propriétés se composent sur le GPU, sans recalcul de mise en page à chaque
 * image. Les durées choisies dans la configuration Tailwind ne sont pas
 * multiples entre elles, si bien que blocs et étincelles ne se resynchronisent
 * jamais visiblement.
 *
 * `aria-hidden` : il n'y a rien à annoncer, et la phrase qui précède dit déjà
 * ce qui se prépare.
 */
function FormingFigure() {
  return (
    <div aria-hidden="true" className="relative mx-auto mt-7 h-14 w-full max-w-[15rem]">
      {/* Halo diffus : détache le chiffre du blanc de la carte. */}
      <span className="pointer-events-none absolute inset-x-6 inset-y-2 animate-cta-breath rounded-full bg-brass/25 blur-2xl" />

      {/* Les trois groupes d'un montant : centaines de milliers, unités, devise. */}
      <div className="absolute inset-0 flex items-center justify-center gap-2.5">
        <span className="h-7 w-[3.75rem] animate-figure-forming rounded-lg bg-ink/75 blur-[9px] will-change-transform" />
        <span className="h-7 w-[4.25rem] animate-figure-forming rounded-lg bg-ink/75 blur-[9px] will-change-transform [animation-delay:-0.8s]" />
        <span className="h-7 w-5 animate-figure-forming rounded-lg bg-brass/80 blur-[9px] will-change-transform [animation-delay:-1.5s]" />
      </div>

      {/* Étincelles décalées autour du chiffre. Les retards sont négatifs :
          l'animation démarre déjà entamée, sans temps mort à l'ouverture. */}
      <GrowthArrowIcon className="absolute left-1 top-0 h-4 w-4 animate-spark-twinkle text-brass will-change-transform" />
      <GrowthArrowIcon className="absolute right-2 top-1.5 h-3 w-3 animate-spark-twinkle text-brass/80 will-change-transform [animation-delay:-1.1s] [animation-duration:2.6s]" />
      <GrowthArrowIcon className="absolute bottom-0 left-1/3 h-3.5 w-3.5 animate-spark-twinkle text-brass/70 will-change-transform [animation-delay:-2.2s] [animation-duration:3.7s]" />
    </div>
  )
}
