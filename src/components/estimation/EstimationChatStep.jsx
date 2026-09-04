import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Sparkles, X } from 'lucide-react'
import { CALLBACK_SLOTS } from '../../data/estimation'
import { GoldFrame } from '../ui/GoldFrame'
import { EASE } from '../../lib/motion'

/** Éléments focusables du panneau, pour le maintien du focus à l'intérieur. */
const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Délai entre la réponse de l'utilisateur et l'apparition de la question
 * suivante — assez court pour rester fluide, assez long pour qu'on distingue
 * les deux bulles comme deux événements séparés plutôt qu'un seul saut.
 */
const NEXT_QUESTION_DELAY_MS = 550

/** Délai avant bascule vers l'écran de remerciement, une fois le message final affiché. */
const HANDOFF_DELAY_MS = 2200

/**
 * Séquence de questions. `prompt` reçoit les réponses déjà collectées, pour
 * personnaliser le message (« Enchanté {prénom} ! »). `validate` renvoie un
 * message d'erreur, ou `null` si la valeur est acceptée — absent pour les
 * questions à choix, qui ne peuvent pas être mal saisies.
 */
const QUESTIONS = [
  {
    key: 'prenom',
    type: 'text',
    ariaLabel: 'Votre prénom',
    placeholder: 'Votre prénom…',
    autoComplete: 'given-name',
    prompt: () => 'Bonjour ! Je suis là pour finaliser votre étude. Comment vous appelez-vous ?',
    validate: (value) => (value.trim().length >= 2 ? null : 'Merci d’indiquer votre prénom.'),
  },
  {
    key: 'email',
    type: 'email',
    ariaLabel: 'Votre adresse email',
    placeholder: 'vous@exemple.fr',
    autoComplete: 'email',
    prompt: (a) =>
      `Enchanté ${a.prenom} ! Quelle est votre adresse email pour recevoir votre étude personnalisée ?`,
    validate: (value) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? null : 'Cette adresse e-mail semble invalide.',
  },
  {
    key: 'telephone',
    type: 'tel',
    ariaLabel: 'Votre numéro de téléphone',
    placeholder: '06 12 34 56 78',
    autoComplete: 'tel',
    prompt: () => 'Parfait ! À quel numéro pouvons-nous vous joindre pour discuter de votre projet ?',
    validate: (value) => {
      const digits = value.replace(/\D/g, '')
      return digits.length >= 6 && digits.length <= 15
        ? null
        : 'Merci d’indiquer un numéro de téléphone valide.'
    },
  },
  {
    key: 'creneau',
    type: 'choice',
    prompt: () => 'Excellent ! Quand souhaitez-vous être rappelé par un de nos experts ?',
    options: CALLBACK_SLOTS,
  },
]

let messageSeq = 0
const nextId = () => `msg-${(messageSeq += 1)}`

/** Badge circulaire de l'assistant — même dégradé que les autres écrans « IA » du parcours. */
function AssistantAvatar() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ink via-ink to-ink/70 shadow-sm shadow-ink/25">
      <Sparkles className="h-3.5 w-3.5 text-brass" strokeWidth={2} aria-hidden="true" />
    </span>
  )
}

function Bubble({ role, text }) {
  const reduce = useReducedMotion()
  const isUser = role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.15 : 0.35, ease: EASE }}
      className={`flex items-end gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {isUser ? null : <AssistantAvatar />}
      <div
        className={[
          'max-w-[78%] whitespace-pre-line rounded-2xl px-4 py-3 text-[0.92rem] leading-relaxed sm:max-w-[70%]',
          isUser
            ? 'rounded-br-sm bg-ink text-white'
            : 'rounded-bl-sm border border-ink/10 bg-stone text-ink',
        ].join(' ')}
      >
        {text}
      </div>
    </motion.div>
  )
}

/** Trois points qui pulsent, le temps que le message suivant s'écrive. */
function TypingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-end gap-2.5"
    >
      <AssistantAvatar />
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-ink/10 bg-stone px-4 py-3.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/30 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/30 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/30" />
      </div>
    </motion.div>
  )
}

/**
 * Écran de capture des coordonnées, façon conversation : une question à la
 * fois, la réponse s'affiche en bulle avant que la suivante n'apparaisse.
 *
 * Vraie fenêtre modale — même traitement que [BuildingConfirmModal](./BuildingConfirmModal.jsx) :
 * fond assombri et flouté sur toute la page, carte centrée avec liseré doré.
 * Contrairement à ce modèle, un clic sur le fond ne ferme pas la fenêtre :
 * en cours de saisie, une fermeture accidentelle perdrait les réponses déjà
 * données — seuls la croix et Échap restent des sorties délibérées.
 *
 * Purement une interface pour l'instant — `onDone` remonte les coordonnées
 * saisies (state React le temps de la session), rien n'est envoyé ni
 * sauvegardé ici. Le vrai envoi (e-mail, CRM…) fera l'objet d'un lot séparé.
 */
export function EstimationChatStep({ onDone, onClose }) {
  const reduce = useReducedMotion()
  const [answers, setAnswers] = useState({ prenom: '', email: '', telephone: '', creneau: null })
  const [messages, setMessages] = useState(() => [
    { id: nextId(), role: 'system', text: QUESTIONS[0].prompt({}) },
  ])
  const [activeIndex, setActiveIndex] = useState(0)
  const [closing, setClosing] = useState(false)
  const [typing, setTyping] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')

  const panelRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const timersRef = useRef([])

  const currentQuestion = closing ? null : QUESTIONS[activeIndex]

  // Fermeture au clavier + maintien du focus dans la fenêtre — même bloc que
  // BuildingConfirmModal, seule la cible du focus initial diffère (le champ
  // de saisie plutôt que le panneau, pour pouvoir taper sans étape de plus).
  useEffect(() => {
    const previouslyFocused = document.activeElement
    ;(inputRef.current ?? panelRef.current)?.focus()

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

  // Blocage du défilement de la page derrière la carte — identique à
  // BuildingConfirmModal, compensation de la largeur de l'ascenseur comprise.
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

  // Tous les minuteurs en attente sont nettoyés au démontage — sans quoi un
  // `onDone` pourrait se déclencher sur un écran déjà quitté.
  useEffect(() => () => timersRef.current.forEach(clearTimeout), [])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, typing])

  useEffect(() => {
    if (currentQuestion?.type === 'text' || currentQuestion?.type === 'email' || currentQuestion?.type === 'tel') {
      inputRef.current?.focus()
    }
  }, [currentQuestion])

  const schedule = (fn, delay) => {
    const timer = setTimeout(fn, reduce ? Math.min(delay, 150) : delay)
    timersRef.current.push(timer)
  }

  /** Enchaîne la réponse validée : bulle utilisateur, puis question suivante ou clôture. */
  const advance = (nextAnswers, echoedText) => {
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: echoedText }])
    setAnswers(nextAnswers)
    setInputValue('')
    setError('')

    const nextIndex = activeIndex + 1
    setTyping(true)

    if (nextIndex < QUESTIONS.length) {
      schedule(() => {
        setTyping(false)
        setActiveIndex(nextIndex)
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'system', text: QUESTIONS[nextIndex].prompt(nextAnswers) },
        ])
      }, NEXT_QUESTION_DELAY_MS)
      return
    }

    // Dernière question répondue : message de clôture, puis bascule automatique.
    const slot = CALLBACK_SLOTS.find((s) => s.id === nextAnswers.creneau)
    schedule(() => {
      setTyping(false)
      setClosing(true)
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'system',
          text: `Merci ${nextAnswers.prenom} ! Votre demande a été enregistrée. Un expert vous contactera ${slot.phrase}. À très bientôt !`,
        },
      ])
      schedule(() => onDone(nextAnswers), HANDOFF_DELAY_MS)
    }, NEXT_QUESTION_DELAY_MS)
  }

  const submitText = (event) => {
    event.preventDefault()
    if (!currentQuestion) return

    const message = currentQuestion.validate(inputValue)
    if (message) {
      setError(message)
      return
    }

    advance({ ...answers, [currentQuestion.key]: inputValue.trim() }, inputValue.trim())
  }

  const submitChoice = (slot) => {
    if (!currentQuestion) return
    advance({ ...answers, creneau: slot.id }, slot.label)
  }

  // Pourcentage d'avancement : les questions déjà répondues, sur le total —
  // la barre atteint 100 % dès que le créneau est choisi, avant même que le
  // message de clôture ne s'affiche.
  const progressPct = Math.round(((closing ? QUESTIONS.length : activeIndex) / QUESTIONS.length) * 100)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.15 : 0.28, ease: EASE }}
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-ink/45 px-4 py-8 backdrop-blur-md sm:px-6"
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Dernière étape — vos coordonnées"
        tabIndex={-1}
        initial={{ opacity: 0, y: reduce ? 0 : 16, scale: reduce ? 1 : 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: reduce ? 0 : 8, scale: reduce ? 1 : 0.98 }}
        transition={{ duration: reduce ? 0.15 : 0.34, ease: EASE }}
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col outline-none sm:max-h-[80vh]"
      >
        <GoldFrame className="-inset-[2px] rounded-[1.05rem]" spin="animate-border-spin-slow" />

        <div className="relative flex max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_28px_64px_-18px_rgba(16,20,28,0.55)] sm:max-h-[80vh]">
          {/* Barre de progression — en tête de carte, pas collée aux bords de l'écran. */}
          <div className="h-1 w-full shrink-0 bg-ink/10">
            <div
              className="h-full bg-gradient-to-r from-ink via-ink/80 to-brass transition-[width] duration-500 ease-plan"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex shrink-0 items-center justify-between border-b border-ink/10 px-5 py-4 sm:px-7">
            <p className="font-mono text-[0.68rem] uppercase tracking-micro text-ink/45">Dernière étape</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer et revenir à l’accueil"
              className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-full text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 sm:px-7">
            <div className="flex flex-col gap-4 py-5">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <Bubble key={m.id} role={m.role} text={m.text} />
                ))}
                {typing ? <TypingBubble key="typing" /> : null}
              </AnimatePresence>
            </div>
          </div>

          {currentQuestion ? (
            <div className="shrink-0 border-t border-ink/10 bg-stone/60 px-5 py-4 sm:px-7">
              {currentQuestion.type === 'choice' ? (
                <div className="grid grid-cols-2 gap-3">
                  {currentQuestion.options.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => submitChoice(slot)}
                      className="touch-manipulation rounded-xl border border-ink/15 bg-white px-4 py-4 text-center text-[0.85rem] font-medium text-ink/75 transition-colors duration-200 ease-plan hover:border-ink/40 hover:text-ink"
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              ) : (
                <form onSubmit={submitText} noValidate>
                  <div className="flex items-center gap-3 rounded-full border border-ink/15 bg-white py-1.5 pl-5 pr-1.5 shadow-sm shadow-ink/5 focus-within:border-ink/40">
                    <input
                      ref={inputRef}
                      type={currentQuestion.type}
                      value={inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value)
                        if (error) setError('')
                      }}
                      placeholder={currentQuestion.placeholder}
                      autoComplete={currentQuestion.autoComplete}
                      aria-label={currentQuestion.ariaLabel}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? 'chat-input-error' : undefined}
                      // 16 px minimum : en deçà, iOS zoome automatiquement sur le champ.
                      className="min-w-0 flex-1 bg-transparent py-2 text-base text-ink placeholder:text-ink/35 focus:outline-none sm:text-[0.95rem]"
                    />
                    <button
                      type="submit"
                      aria-label="Valider ma réponse"
                      className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-full bg-ink text-white transition-colors duration-200 ease-plan hover:bg-ink/85"
                    >
                      <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    </button>
                  </div>
                  {error ? (
                    <p id="chat-input-error" className="mt-2 pl-5 font-mono text-[0.68rem] text-red-700">
                      {error}
                    </p>
                  ) : null}
                </form>
              )}
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  )
}
