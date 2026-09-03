import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, Loader2, X } from 'lucide-react'
import { PROJETS } from '../../data/projets'
import { agency } from '../../data/agency'
import { EASE } from '../../lib/motion'
import { ConsentNotice } from '../ui/ConsentNotice'

const labelClass = 'mb-2 block font-mono text-[0.62rem] uppercase tracking-micro text-ink/55'
const controlClass =
  'w-full border border-ink/20 bg-white px-4 py-3 font-sans text-sm text-ink placeholder:text-ink/35 focus:border-brass focus:outline-none'
const errorTextClass = 'mt-1.5 font-mono text-[0.68rem] text-red-700'

const initialForm = {
  prenom: '',
  nom: '',
  email: '',
  telephone: '',
  commune: '',
  projet: '',
  message: '',
  consent: false,
  marketing: false,
}

function validate(form) {
  const errors = {}
  if (!form.prenom.trim()) errors.prenom = 'Merci d’indiquer votre prénom.'
  if (!form.nom.trim()) errors.nom = 'Merci d’indiquer votre nom.'
  if (!form.email.trim()) errors.email = 'Merci d’indiquer votre adresse e-mail.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Cette adresse e-mail semble invalide.'
  }
  if (!form.telephone.trim()) errors.telephone = 'Merci d’indiquer votre numéro de téléphone.'
  if (!form.commune.trim()) errors.commune = 'Merci d’indiquer votre commune.'
  if (!form.projet) errors.projet = 'Merci de préciser votre projet.'
  if (!form.consent) {
    errors.consent = 'Merci d’accepter la politique de confidentialité pour continuer.'
  }
  return errors
}

/**
 * Fenêtre de contact individuel — toujours montée depuis Équipe (advisor
 * peut être `null`) pour permettre l'animation de sortie via AnimatePresence.
 * Le dialogue lui-même n'est instancié (et son état réinitialisé) que
 * lorsqu'un conseiller est sélectionné, via la `key={advisor.id}`.
 */
export function ContactConseillerModal({ advisor, onClose }) {
  return (
    <AnimatePresence>
      {advisor ? <ConseillerDialog key={advisor.id} advisor={advisor} onClose={onClose} /> : null}
    </AnimatePresence>
  )
}

function ConseillerDialog({ advisor, onClose }) {
  const reduce = useReducedMotion()
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | submitting | sent
  const [serverError, setServerError] = useState('')
  const firstFieldRef = useRef(null)

  useEffect(() => {
    firstFieldRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const update = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((er) => (er[key] ? { ...er, [key]: undefined } : er))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (status === 'submitting') return

    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      return
    }

    setStatus('submitting')
    setServerError('')
    try {
      const res = await fetch('/api/contact-conseiller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advisorId: advisor.id, ...form }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.ok) {
        if (data.errors) {
          setErrors(data.errors)
          setStatus('idle')
          return
        }
        throw new Error(data.error || 'Erreur inconnue')
      }
      setStatus('sent')
    } catch {
      setServerError(
        `Une erreur est survenue. Merci de réessayer, ou appelez-nous directement au ${agency.phone}.`,
      )
      setStatus('idle')
    }
  }

  const overlayAnim = reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }

  const panelAnim = reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 16, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 10, scale: 0.98 },
      }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        {...overlayAnim}
        transition={{ duration: 0.3, ease: EASE }}
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.div
        {...panelAnim}
        transition={{ duration: 0.35, ease: EASE }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="conseiller-modal-title"
        className="relative max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto bg-stone p-6 text-ink shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la fenêtre"
          className="absolute right-4 top-4 text-ink/50 transition-colors hover:text-brass"
        >
          <X className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
        </button>

        {status === 'sent' ? (
          <div className="py-6">
            <Check className="h-8 w-8 text-bottle" strokeWidth={1.5} aria-hidden="true" />
            <h2 className="mt-6 text-display-md text-ink">Demande transmise.</h2>
            <p className="mt-4 max-w-sm text-ink/70">
              Merci, votre demande a bien été transmise. Nous vous répondrons dans les meilleurs délais.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-8 inline-flex items-center justify-center gap-2.5 bg-ink px-8 py-3.5 font-mono text-[0.72rem] uppercase tracking-micro text-stone transition-colors duration-300 ease-plan hover:bg-ink/90"
            >
              Fermer
            </button>
          </div>
        ) : (
          <>
            <p className="eyebrow !text-bottle pr-8">Contacter</p>
            <h2 id="conseiller-modal-title" className="mt-3 pr-8 text-display-md text-ink">
              Contacter {advisor.nom}
            </h2>

            <form className="mt-8" onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="cm-prenom" className={labelClass}>
                    Prénom *
                  </label>
                  <input
                    id="cm-prenom"
                    ref={firstFieldRef}
                    className={controlClass}
                    value={form.prenom}
                    onChange={update('prenom')}
                    autoComplete="given-name"
                    aria-invalid={Boolean(errors.prenom)}
                    aria-describedby={errors.prenom ? 'cm-prenom-err' : undefined}
                  />
                  {errors.prenom ? (
                    <p id="cm-prenom-err" className={errorTextClass}>
                      {errors.prenom}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="cm-nom" className={labelClass}>
                    Nom *
                  </label>
                  <input
                    id="cm-nom"
                    className={controlClass}
                    value={form.nom}
                    onChange={update('nom')}
                    autoComplete="family-name"
                    aria-invalid={Boolean(errors.nom)}
                    aria-describedby={errors.nom ? 'cm-nom-err' : undefined}
                  />
                  {errors.nom ? (
                    <p id="cm-nom-err" className={errorTextClass}>
                      {errors.nom}
                    </p>
                  ) : null}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="cm-email" className={labelClass}>
                    Adresse e-mail *
                  </label>
                  <input
                    id="cm-email"
                    type="email"
                    className={controlClass}
                    value={form.email}
                    onChange={update('email')}
                    autoComplete="email"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'cm-email-err' : undefined}
                  />
                  {errors.email ? (
                    <p id="cm-email-err" className={errorTextClass}>
                      {errors.email}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="cm-telephone" className={labelClass}>
                    Numéro de téléphone *
                  </label>
                  <input
                    id="cm-telephone"
                    type="tel"
                    className={`${controlClass} font-mono`}
                    value={form.telephone}
                    onChange={update('telephone')}
                    autoComplete="tel"
                    aria-invalid={Boolean(errors.telephone)}
                    aria-describedby={errors.telephone ? 'cm-telephone-err' : undefined}
                  />
                  {errors.telephone ? (
                    <p id="cm-telephone-err" className={errorTextClass}>
                      {errors.telephone}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="cm-commune" className={labelClass}>
                    Commune *
                  </label>
                  <input
                    id="cm-commune"
                    className={controlClass}
                    value={form.commune}
                    onChange={update('commune')}
                    autoComplete="address-level2"
                    aria-invalid={Boolean(errors.commune)}
                    aria-describedby={errors.commune ? 'cm-commune-err' : undefined}
                  />
                  {errors.commune ? (
                    <p id="cm-commune-err" className={errorTextClass}>
                      {errors.commune}
                    </p>
                  ) : null}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="cm-projet" className={labelClass}>
                    Votre projet *
                  </label>
                  <select
                    id="cm-projet"
                    className={`${controlClass} appearance-none`}
                    value={form.projet}
                    onChange={update('projet')}
                    aria-invalid={Boolean(errors.projet)}
                    aria-describedby={errors.projet ? 'cm-projet-err' : undefined}
                  >
                    <option value="" disabled hidden>
                      Sélectionnez…
                    </option>
                    {PROJETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  {errors.projet ? (
                    <p id="cm-projet-err" className={errorTextClass}>
                      {errors.projet}
                    </p>
                  ) : null}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="cm-message" className={labelClass}>
                    Précisez votre demande
                  </label>
                  <textarea
                    id="cm-message"
                    rows={4}
                    className={`${controlClass} resize-y`}
                    value={form.message}
                    onChange={update('message')}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-4">
                <ConsentNotice
                  id="cm-consent"
                  checked={form.consent}
                  onChange={update('consent')}
                  aria-invalid={Boolean(errors.consent)}
                  aria-describedby={errors.consent ? 'cm-consent-err' : undefined}
                />
                {errors.consent ? (
                  <p id="cm-consent-err" className={`${errorTextClass} -mt-2 ml-7`}>
                    {errors.consent}
                  </p>
                ) : null}

                <div className="flex items-start gap-3">
                  <input
                    id="cm-marketing"
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 accent-brass"
                    checked={form.marketing}
                    onChange={update('marketing')}
                  />
                  <label htmlFor="cm-marketing" className="text-sm leading-relaxed text-ink/75">
                    J’accepte de recevoir ultérieurement des informations et des offres commerciales
                    d’IMMOVIA par téléphone ou par voie électronique.
                  </label>
                </div>
              </div>

              {serverError ? (
                <p className="mt-6 border border-red-700/30 bg-red-700/5 px-4 py-3 text-sm text-red-700">
                  {serverError}
                </p>
              ) : null}

              <div className="mt-8 flex items-center gap-6">
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="inline-flex items-center justify-center gap-2.5 bg-ink px-8 py-3.5 font-mono text-[0.72rem] uppercase tracking-micro text-stone transition-colors duration-300 ease-plan hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === 'submitting' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} aria-hidden="true" />
                      Envoi…
                    </>
                  ) : (
                    'Envoyer ma demande'
                  )}
                </button>
                <p className="font-mono text-[0.62rem] uppercase tracking-micro text-ink/40">
                  * Champs requis
                </p>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}
