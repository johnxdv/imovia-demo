import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { EstimationIntro } from '../components/estimation/EstimationIntro'
import { EstimationAddressStep } from '../components/estimation/EstimationAddressStep'
import { EstimationBuildingStep } from '../components/estimation/EstimationBuildingStep'
import { EstimationLoadingStep } from '../components/estimation/EstimationLoadingStep'
import { EstimationResultStep } from '../components/estimation/EstimationResultStep'
import { EstimationThankYouStep } from '../components/estimation/EstimationThankYouStep'
import { placeholderEstimate } from '../data/estimation'
import { EASE } from '../lib/motion'
import { useDocumentTitle } from '../lib/useDocumentTitle'

/**
 * Étapes majeures du parcours, dans l'ordre — sert de base à la barre de
 * progression globale (voir plus bas). L'écran résultat couvre à la fois le
 * repos et la conversation de capture : les deux se jouent sur le même écran,
 * ce n'est pas une étape à part.
 */
const STAGES = ['intro', 'adresse', 'batiment', 'analyse', 'resultat', 'merci']

/**
 * Outil d'estimation — parcours en écrans successifs dans une même page
 * (aucune navigation d'URL entre les étapes).
 * Accueil de l'outil, saisie de l'adresse, repérage du bâtiment sur photo
 * aérienne, analyse, résultat flouté avec conversation de capture intégrée
 * (split-screen), puis remerciement.
 *
 * Le montant affiché reste une valeur de démonstration : le calcul réel
 * (base DVF) reste à brancher. La capture de coordonnées, elle, est
 * fonctionnelle côté interface — mais n'envoie ni ne sauvegarde encore rien
 * (voir `EstimationChatPanel`).
 */
export default function Estimer() {
  useDocumentTitle('Estimer')
  const navigate = useNavigate()
  const [step, setStep] = useState('intro')
  const [address, setAddress] = useState(null)
  // Sélection confirmée : bâtiment, coordonnées, emprise au sol et type détecté.
  // Rien n'en est affiché — c'est la charge utile du futur calcul DVF, conservée
  // ici pour qu'elle n'ait pas à être redemandée à l'écran du résultat.
  const [selection, setSelection] = useState(null)
  const [price, setPrice] = useState(null)
  // Coordonnées saisies dans la conversation finale — state de session
  // uniquement, voir `EstimationChatPanel`.
  const [contact, setContact] = useState(null)
  const reduce = useReducedMotion()

  // Avancement à l'intérieur de l'étape courante (0 à 1) — les sous-écrans
  // qui en ont un le remontent via `onProgress`. Combiné à la position de
  // `step` dans `STAGES`, il alimente la barre de progression globale :
  // celle-ci ne repart donc jamais à 0 en cours de parcours, seulement au
  // sein de l'étape en cours.
  const [stageProgress, setStageProgress] = useState(0)

  // Centralise les transitions d'étape : la progression locale est remise à
  // zéro par la même occasion, plutôt que via un effet séparé sur `step` —
  // un tel effet retomberait après coup sur la valeur volontairement fixée à
  // 1 lors du passage à l'étape finale (voir `finishChat`).
  const goToStep = useCallback((nextStep, localProgress = 0) => {
    setStageProgress(localProgress)
    setStep(nextStep)
  }, [])

  // Identité stable : l'étape adresse déclenche le passage par un effet, une
  // fonction recréée à chaque rendu y relancerait le minuteur en boucle.
  const goToBuilding = useCallback((confirmed) => {
    setAddress(confirmed)
    goToStep('batiment')
  }, [goToStep])

  // Le montant est tiré une seule fois, au lancement de l'analyse : le
  // regénérer au rendu du résultat le ferait changer à chaque re-rendu.
  const startAnalysis = useCallback((confirmedSelection) => {
    setSelection(confirmedSelection)
    setPrice(placeholderEstimate())
    goToStep('analyse')
  }, [goToStep])

  const showResult = useCallback(() => goToStep('resultat'), [goToStep])

  // Coordonnées collectées dans la conversation : mémorisées pour l'écran de
  // remerciement, qui a besoin du prénom et du créneau choisi. Avancement
  // fixé à 1 : l'étape résultat (conversation comprise) est intégralement
  // franchie au moment de cette bascule.
  const finishChat = useCallback((collected) => {
    setContact(collected)
    goToStep('merci', 1)
  }, [goToStep])

  const goHome = useCallback(() => navigate('/'), [navigate])

  // Le module carte est chargé à la demande (Leaflet ne sert qu'aux étapes
  // suivantes). On l'amorce dès la saisie de l'adresse : il est alors prêt
  // quand l'utilisateur choisit une proposition, et l'enchaînement reste
  // instantané.
  useEffect(() => {
    if (step !== 'adresse') return
    import('../components/estimation/BuildingMap')
  }, [step])

  // Pourcentage global : position de l'étape courante dans `STAGES`, plus sa
  // fraction d'avancement local — jamais de retour à 0 entre deux étapes,
  // seulement une progression continue jusqu'à 100 % au remerciement.
  const stageIndex = STAGES.indexOf(step)
  const globalPct = Math.round(((stageIndex + stageProgress) / STAGES.length) * 100)

  // Glissement horizontal léger ; réduit à un simple fondu si l'utilisateur
  // a demandé moins d'animations.
  const variants = {
    enter: { opacity: 0, x: reduce ? 0 : 24 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: reduce ? 0 : -24 },
  }

  return (
    <>
      {/* Barre de progression globale — persistante du tout premier écran au
          remerciement, au-dessus même de la navigation (z-[70]) : les fenêtres
          modales du parcours (confirmation de bâtiment, remerciement) montent
          jusqu'à z-[60], celle-ci doit rester visible par-dessus. */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={globalPct}
        aria-label="Progression du parcours d’estimation"
        className="fixed inset-x-0 top-0 z-[70] h-[3px] bg-ink/10"
      >
        <div
          className="h-full bg-gradient-to-r from-ink via-ink/80 to-brass transition-[width] duration-500 ease-plan"
          style={{ width: `${globalPct}%` }}
        />
      </div>

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
            {step === 'intro' ? <EstimationIntro onStart={() => goToStep('adresse')} /> : null}

            {step === 'adresse' ? (
              <EstimationAddressStep onBack={() => goToStep('intro')} onConfirm={goToBuilding} />
            ) : null}

            {step === 'batiment' && address ? (
              <EstimationBuildingStep
                address={address}
                onBack={() => goToStep('adresse')}
                onEstimate={startAnalysis}
                onProgress={setStageProgress}
              />
            ) : null}

            {step === 'analyse' ? (
              <EstimationLoadingStep onDone={showResult} onProgress={setStageProgress} />
            ) : null}

            {step === 'resultat' && address ? (
              <EstimationResultStep
                address={address}
                price={price}
                onBack={() => goToStep('batiment')}
                onDone={finishChat}
                onProgress={setStageProgress}
              />
            ) : null}

            {step === 'merci' ? <EstimationThankYouStep contact={contact} onClose={goHome} /> : null}
          </motion.div>
        </AnimatePresence>
      </section>
    </>
  )
}
