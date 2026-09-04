import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { EstimationIntro } from '../components/estimation/EstimationIntro'
import { EstimationAddressStep } from '../components/estimation/EstimationAddressStep'
import { EASE } from '../lib/motion'
import { useDocumentTitle } from '../lib/useDocumentTitle'

/**
 * Outil d'estimation — parcours en écrans successifs dans une même page
 * (aucune navigation d'URL entre les étapes).
 * Lot 1 : accueil de l'outil, puis saisie de l'adresse.
 */
export default function Estimer() {
  useDocumentTitle('Estimer')
  const [step, setStep] = useState('intro')
  const reduce = useReducedMotion()

  // Glissement horizontal léger ; réduit à un simple fondu si l'utilisateur
  // a demandé moins d'animations.
  const variants = {
    enter: { opacity: 0, x: reduce ? 0 : 24 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: reduce ? 0 : -24 },
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-stone px-5 py-28 sm:px-8 sm:py-32">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: reduce ? 0.2 : 0.4, ease: EASE }}
          className="flex w-full justify-center"
        >
          {step === 'intro' ? (
            <EstimationIntro onStart={() => setStep('adresse')} />
          ) : (
            <EstimationAddressStep onBack={() => setStep('intro')} />
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
