import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { EstimationIntro } from '../components/estimation/EstimationIntro'
import { EstimationAddressStep } from '../components/estimation/EstimationAddressStep'
import { EstimationBuildingStep } from '../components/estimation/EstimationBuildingStep'
import { EstimationLoadingStep } from '../components/estimation/EstimationLoadingStep'
import { EstimationResultStep } from '../components/estimation/EstimationResultStep'
import { EstimationChatStep } from '../components/estimation/EstimationChatStep'
import { EstimationThankYouStep } from '../components/estimation/EstimationThankYouStep'
import { placeholderEstimate } from '../data/estimation'
import { EASE } from '../lib/motion'
import { useDocumentTitle } from '../lib/useDocumentTitle'

/**
 * Outil d'estimation — parcours en écrans successifs dans une même page
 * (aucune navigation d'URL entre les étapes).
 * Accueil de l'outil, saisie de l'adresse, repérage du bâtiment sur photo
 * aérienne, analyse, résultat flouté, capture des coordonnées façon
 * conversation, puis remerciement.
 *
 * Le montant affiché reste une valeur de démonstration : le calcul réel
 * (base DVF) reste à brancher. La capture de coordonnées, elle, est
 * fonctionnelle côté interface — mais n'envoie ni ne sauvegarde encore rien
 * (voir `EstimationChatStep`).
 */
export default function Estimer() {
  useDocumentTitle('Estimer')
  const navigate = useNavigate()
  // 'intro' | 'adresse' | 'batiment' | 'analyse' | 'resultat' | 'contact' | 'merci'
  const [step, setStep] = useState('intro')
  const [address, setAddress] = useState(null)
  // Sélection confirmée : bâtiment, coordonnées, emprise au sol et type détecté.
  // Rien n'en est affiché — c'est la charge utile du futur calcul DVF, conservée
  // ici pour qu'elle n'ait pas à être redemandée à l'écran du résultat.
  const [selection, setSelection] = useState(null)
  const [price, setPrice] = useState(null)
  // Coordonnées saisies dans la conversation finale — state de session
  // uniquement, voir `EstimationChatStep`.
  const [contact, setContact] = useState(null)
  const reduce = useReducedMotion()

  // Identité stable : l'étape adresse déclenche le passage par un effet, une
  // fonction recréée à chaque rendu y relancerait le minuteur en boucle.
  const goToBuilding = useCallback((confirmed) => {
    setAddress(confirmed)
    setStep('batiment')
  }, [])

  // Le montant est tiré une seule fois, au lancement de l'analyse : le
  // regénérer au rendu du résultat le ferait changer à chaque re-rendu.
  const startAnalysis = useCallback((confirmedSelection) => {
    setSelection(confirmedSelection)
    setPrice(placeholderEstimate())
    setStep('analyse')
  }, [])

  const showResult = useCallback(() => setStep('resultat'), [])

  // Coordonnées collectées dans la conversation : mémorisées pour l'écran de
  // remerciement, qui a besoin du prénom et du créneau choisi.
  const finishChat = useCallback((collected) => {
    setContact(collected)
    setStep('merci')
  }, [])

  // Fermeture du tunnel de capture, depuis la conversation comme depuis
  // l'écran de remerciement : retour à l'accueil. `navigate('/')` suffit —
  // la page d'accueil ouvre sur le hero, il n'y a rien à faire défiler.
  const goHome = useCallback(() => navigate('/'), [navigate])

  // Le module carte est chargé à la demande (Leaflet ne sert qu'aux étapes
  // suivantes). On l'amorce dès la saisie de l'adresse : il est alors prêt
  // quand l'utilisateur choisit une proposition, et l'enchaînement reste
  // instantané.
  useEffect(() => {
    if (step !== 'adresse') return
    import('../components/estimation/BuildingMap')
  }, [step])

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
          {step === 'intro' ? <EstimationIntro onStart={() => setStep('adresse')} /> : null}

          {step === 'adresse' ? (
            <EstimationAddressStep onBack={() => setStep('intro')} onConfirm={goToBuilding} />
          ) : null}

          {step === 'batiment' && address ? (
            <EstimationBuildingStep
              address={address}
              onBack={() => setStep('adresse')}
              onEstimate={startAnalysis}
            />
          ) : null}

          {step === 'analyse' ? <EstimationLoadingStep onDone={showResult} /> : null}

          {step === 'resultat' && address ? (
            <EstimationResultStep
              address={address}
              price={price}
              onBack={() => setStep('batiment')}
              onViewEstimation={() => setStep('contact')}
            />
          ) : null}

          {step === 'contact' ? <EstimationChatStep onDone={finishChat} onClose={goHome} /> : null}

          {step === 'merci' ? <EstimationThankYouStep contact={contact} onClose={goHome} /> : null}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
