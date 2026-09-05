import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { EstimationIntro } from '../components/estimation/EstimationIntro'
import { EstimationAddressStep } from '../components/estimation/EstimationAddressStep'
import { EstimationBuildingStep } from '../components/estimation/EstimationBuildingStep'
import { EstimationLoadingStep } from '../components/estimation/EstimationLoadingStep'
import { EstimationResultStep } from '../components/estimation/EstimationResultStep'
import { requestEstimation } from '../lib/estimation'
import { EASE } from '../lib/motion'
import { useDocumentTitle } from '../lib/useDocumentTitle'

/**
 * Étapes majeures du parcours, dans l'ordre — sert de base à la barre de
 * progression globale (voir plus bas). L'écran résultat couvre à la fois le
 * repos, la conversation de capture et la confirmation finale : les trois se
 * jouent sur le même écran, sans navigation — ce n'est jamais une étape à
 * part (voir `EstimationResultStep`).
 */
const STAGES = ['intro', 'adresse', 'batiment', 'analyse', 'resultat']

/**
 * Outil d'estimation — parcours en écrans successifs dans une même page
 * (aucune navigation d'URL entre les étapes).
 * Accueil de l'outil, saisie de l'adresse, repérage du bâtiment sur photo
 * aérienne, analyse, résultat flouté avec conversation de capture intégrée
 * (split-screen) qui se conclut, sur ce même écran, par la confirmation
 * finale et le déblocage complet du prix.
 *
 * Le montant affiché est calculé pour de bon : le clic sur « Obtenir une
 * estimation instantanée » lance la requête au moteur (`api/estimation.js`,
 * base DVF) en même temps que l'animation d'analyse, et le résultat est
 * appliqué à la fin de celle-ci. La capture de coordonnées, elle, est
 * fonctionnelle côté interface — mais n'envoie ni ne sauvegarde encore rien
 * (voir `EstimationChatPanel`).
 */
export default function Estimer() {
  useDocumentTitle('Estimer')
  const navigate = useNavigate()
  const [step, setStep] = useState('intro')
  const [address, setAddress] = useState(null)
  // Sélection confirmée : bâtiment, coordonnées, emprise au sol, type détecté,
  // parcelle et fiche BDNB. Rien n'en est affiché — c'est la charge utile du
  // calcul, conservée ici pour n'avoir pas à être redemandée.
  const [selection, setSelection] = useState(null)
  const [price, setPrice] = useState(null)
  // Calcul en cours, conservé sous forme de promesse : il démarre avec
  // l'animation d'analyse et n'est lu qu'à la fin de celle-ci. Une référence
  // plutôt qu'un état — sa mutation ne doit provoquer aucun rendu, et
  // `showResult` doit garder une identité stable (voir plus bas).
  const pendingEstimate = useRef(null)
  const reduce = useReducedMotion()

  // Hauteur mesurée de la navbar : la barre de progression globale se loge
  // juste en dessous, quelle que soit la taille d'écran — plus fiable qu'un
  // décalage fixé en dur, la navbar changeant de hauteur selon le gabarit.
  const [navHeight, setNavHeight] = useState(0)
  useEffect(() => {
    const measure = () => setNavHeight(document.querySelector('header')?.offsetHeight ?? 0)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

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

  // Le calcul est lancé une seule fois, au démarrage de l'écran d'analyse, et
  // court en arrière-plan de l'animation — laquelle garde son déroulé complet
  // quoi qu'il arrive : elle n'est ni raccourcie si la réponse arrive tôt, ni
  // interrompue si elle tarde.
  const startAnalysis = useCallback((confirmedSelection) => {
    setSelection(confirmedSelection)
    setPrice(null)
    pendingEstimate.current = requestEstimation(confirmedSelection)
    goToStep('analyse')
  }, [goToStep])

  // Fin de l'animation : le montant est très largement calculé à ce stade
  // (quelques secondes contre douze), l'attente ci-dessous ne couvre que le
  // cas d'un serveur à la traîne. `requestEstimation` ne rejette jamais.
  const showResult = useCallback(async () => {
    setPrice(await pendingEstimate.current)
    goToStep('resultat')
  }, [goToStep])

  // La conversation vient de se conclure : `EstimationResultStep` bascule en
  // interne vers son écran de confirmation, sans quitter cette étape.
  // Avancement fixé à 1 : l'étape résultat (confirmation comprise) est
  // intégralement franchie au moment de cette bascule.
  const finishChat = useCallback(() => setStageProgress(1), [])

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
  // seulement une progression continue jusqu'à 100 % à la confirmation finale.
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
      {/* Barre de progression globale — persistante du tout premier écran à la
          confirmation finale, logée juste sous la navbar (dont la hauteur est
          mesurée dans `navHeight`) plutôt que noyée dans le contenu. Reste
          au-dessus des fenêtres modales du parcours (confirmation de
          bâtiment, qui montent jusqu'à z-[60]) : z-[70]. */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={globalPct}
        aria-label="Progression du parcours d’estimation"
        className="fixed inset-x-0 z-[70] h-2 bg-ink/10"
        style={{ top: navHeight }}
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
                onClose={goHome}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </section>
    </>
  )
}
