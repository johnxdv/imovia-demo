import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, PhoneCall, X } from 'lucide-react'
import { CALLBACK_SLOTS } from '../../data/estimation'
import { GoldFrame } from '../ui/GoldFrame'
import { EASE } from '../../lib/motion'

/** Éléments focusables du panneau, pour le maintien du focus à l'intérieur. */
const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Écran de remerciement final — même fenêtre modale que
 * [BuildingConfirmModal](./BuildingConfirmModal.jsx) et
 * [EstimationChatStep](./EstimationChatStep.jsx) : fond assombri et flouté,
 * carte centrée au liseré doré. Rien à saisir ici, donc — à la différence de
 * la conversation qui précède — un clic sur le fond ferme la fenêtre au même
 * titre que la croix.
 *
 * Purement une confirmation d'interface : aucune donnée n'a été envoyée
 * nulle part, `contact` ne vit que dans le state de la page (voir
 * `Estimer.jsx`). Le vrai envoi fera l'objet d'un lot séparé.
 */
export function EstimationThankYouStep({ contact, onClose }) {
  const reduce = useReducedMotion()
  const panelRef = useRef(null)
  const slot = CALLBACK_SLOTS.find((s) => s.id === contact?.creneau)

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
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-ink/45 px-4 py-8 backdrop-blur-md sm:px-6"
    >
      {/* Rien à perdre sur cet écran : le fond ferme la fenêtre, comme la croix. */}
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
        aria-labelledby="merci-titre"
        tabIndex={-1}
        initial={{ opacity: 0, y: reduce ? 0 : 16, scale: reduce ? 1 : 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: reduce ? 0 : 8, scale: reduce ? 1 : 0.98 }}
        transition={{ duration: reduce ? 0.15 : 0.34, ease: EASE }}
        className="relative max-h-[85vh] w-full max-w-md overflow-y-auto outline-none sm:max-h-[80vh]"
      >
        <GoldFrame className="-inset-[2px] rounded-[1.05rem]" spin="animate-border-spin-slow" />

        <div className="relative rounded-2xl border border-ink/10 bg-white px-6 py-9 text-center shadow-[0_28px_64px_-18px_rgba(16,20,28,0.55)] sm:px-8">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer et revenir à l’accueil"
            className="absolute right-3 top-3 flex h-9 w-9 touch-manipulation items-center justify-center rounded-full text-ink/40 transition-colors hover:bg-stone hover:text-ink"
          >
            <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </button>

          {/* Cercle vert clair : variante douce du badge de confirmation (fond
              plein) utilisé ailleurs dans le parcours — l'écran final appelle
              un ton plus apaisé qu'une simple étape validée. */}
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-bottle/12">
            <Check className="h-8 w-8 text-bottle" strokeWidth={2.5} aria-hidden="true" />
          </span>

          <h2 id="merci-titre" className="mt-6 font-display text-[1.5rem] font-semibold leading-tight text-ink sm:text-[1.75rem]">
            Merci {contact?.prenom}&nbsp;!
          </h2>

          <p className="mt-4 text-[1.05rem] leading-relaxed text-ink/70">
            Votre demande a été enregistrée.
          </p>
          <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink/55">
            Un expert vous contactera {slot?.phrase}.
          </p>

          {/* Substitut du bleu clair demandé — hors palette du site. Une
              teinte Ink très légère lui correspond visuellement (froide,
              discrète) sans introduire de couleur étrangère à la charte. */}
          <div className="mt-7 flex items-start gap-3 rounded-xl bg-ink/5 px-5 py-4 text-left">
            <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-ink/50" strokeWidth={1.75} aria-hidden="true" />
            <p className="text-[0.85rem] leading-relaxed text-ink/70">
              <strong className="font-semibold text-ink">Prochaine étape&nbsp;:</strong> gardez votre
              téléphone à portée de main, notre expert vous appellera pour discuter de votre projet
              en détail.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
