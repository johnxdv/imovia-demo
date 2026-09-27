import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
// Three.js pèse à lui seul plus que tout le reste du site : le décor est donc
// chargé à la demande, comme la carte, et n'alourdit que cette page. Le temps
// qu'il arrive, le fond `bg-stone` de la section tient la place — il n'y a rien
// à afficher en attendant, et surtout rien à faire attendre : le parcours est
// utilisable avant que la première image ne soit rendue.
const DroneScene = lazy(() =>
  import('../components/estimation/DroneScene').then((module) => ({ default: module.DroneScene })),
)
import { RailEtapes } from '../components/estimation/RailEtapes'
import { ChantierContext, contenanceParcelle } from '../components/estimation/chantier'
import { EstimationIntro } from '../components/estimation/EstimationIntro'
import { EstimationAddressStep } from '../components/estimation/EstimationAddressStep'
import { EstimationBuildingStep } from '../components/estimation/EstimationBuildingStep'
import { EstimationMonacoStep } from '../components/estimation/EstimationMonacoStep'
import { EstimationLoadingStep } from '../components/estimation/EstimationLoadingStep'
import { EstimationResultStep } from '../components/estimation/EstimationResultStep'
import { EstimationIndisponibleStep } from '../components/estimation/EstimationIndisponibleStep'
import { requestEstimation } from '../lib/estimation'
import { EASE } from '../lib/motion'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { useMediaQuery } from '../lib/useMediaQuery'

/**
 * Étapes majeures du parcours, dans l'ordre — sert de base au rail d'étapes
 * (voir `RailEtapes`) et au stade de chantier du décor (voir plus bas). L'écran
 * résultat couvre à la fois le repos, la conversation de capture et la
 * confirmation finale : les trois se jouent sur le même écran, sans
 * navigation — ce n'est jamais une étape à part (voir `EstimationResultStep`).
 */
const STAGES = ['intro', 'adresse', 'batiment', 'analyse', 'resultat']

/**
 * TEMPS DE CHANTIER — la respiration entre deux étapes.
 *
 * Le panneau s'efface, la scène reste seule à l'écran le temps que le geste de
 * construction se joue (les murs qui montent, le toit qui se pose), puis le
 * panneau suivant revient. Sans cette pause, la transformation se jouait
 * derrière le panneau : le bien se construisait sans que personne ne le voie.
 *
 * ELLE A ÉTÉ RAMENÉE DE 0,95 s À 0,35 s. Le geste de construction, lui aussi
 * accéléré (voir `pasMontage` dans `DroneScene`), est désormais largement
 * entamé au bout d'un tiers de seconde : ce qu'on gagnait à attendre plus
 * longtemps, on le perdait en enchaînement — le parcours paraissait lent là où
 * il n'était qu'en train d'attendre.
 *
 * L'ENTRÉE DANS LE PARCOURS N'EN A PLUS DU TOUT. Entre l'accueil et la saisie
 * d'adresse, rien ne se construit qu'on ait besoin de voir — l'ossature monte
 * derrière, et elle continuera de monter pendant qu'on tape. « Où se situe
 * votre bien ? » arrive donc immédiatement, sans temps mort.
 *
 * Deux gestes de construction ne se jouent pas au changement d'étape mais à
 * l'intérieur d'un écran : les fenêtres qui apparaissent au milieu de l'analyse,
 * et le halo doré à la confirmation finale. Ils n'ont délibérément pas de
 * pause — escamoter l'écran d'analyse pendant que sa barre progresse, ou le
 * prix au moment où il se dévoile, coûterait plus que ça ne montrerait. Ces
 * deux-là se voient à travers le verre du panneau, devenu translucide pour ça.
 */
const PAUSE_CHANTIER_S = 0.35

/** Pause avant l'arrivée d'un écran donné. Nulle à l'entrée du parcours. */
const pauseChantier = (step) => (step === 'adresse' ? 0 : PAUSE_CHANTIER_S)

/**
 * Stade du décor pour l'étape en cours — et rien d'autre : cette fonction ne
 * commande aucun écran, aucune validation, aucun calcul. Elle traduit « où en
 * est le parcours » en « où en est la construction », et c'est tout.
 *
 * LES TROIS TEMPS DE L'ANALYSE ONT CHACUN LE LEUR, et chacun son point de
 * vue : la première ligne se coche devant la PORTE, la deuxième à l'ANGLE
 * trois-quarts gauche, la troisième AU-DESSUS DU TOIT — et à chaque fois, le
 * drone arrive là où quelque chose va se construire (voir `PLANS` et
 * `CHANTIER` dans le décor). `avancement` vaut ici la fraction d'étapes
 * cochées (0, 1/3, 2/3, 1) : les seuils tombent entre deux crans, jamais
 * dessus.
 */
function stadeChantier(step, avancement, affinage) {
  switch (step) {
    case 'intro':
      return 0
    case 'adresse':
      return 1
    case 'batiment':
      return 2
    case 'analyse':
      return avancement < 0.34 ? 3 : avancement < 0.67 ? 4 : 5
    // Le soir tombe sur l'écran du prix ; le halo n'arrive qu'à la
    // confirmation, une fois les coordonnées recueillies ; et l'affinage
    // reprend tout le recul, parce qu'il faut alors voir le bien entier — son
    // jardin, sa piscine, son toit.
    case 'resultat':
      if (affinage) return 8
      return avancement >= 1 ? 7 : 6
    default:
      return 0
  }
}

/**
 * Outil d'estimation — parcours en écrans successifs dans une même page
 * (aucune navigation d'URL entre les étapes).
 * Accueil de l'outil, saisie de l'adresse, repérage du bâtiment sur photo
 * aérienne, analyse, résultat flouté avec conversation de capture intégrée
 * (split-screen) qui se conclut, sur ce même écran, par la confirmation
 * finale et le déblocage complet du prix.
 *
 * Une adresse en Principauté de Monaco emprunte une variante de l'étape
 * « bâtiment » : même photo aérienne et même geste, mais des contours venus
 * d'OpenStreetMap — la BD TOPO® s'arrête à la frontière — et, faute de cadastre
 * et de BDNB où le lire, un type de bien demandé dans la fenêtre de surface
 * plutôt que détecté (voir `EstimationMonacoStep` et `src/lib/monaco.js`). Elle
 * occupe la même case du parcours : le rail d'étapes et les retours en arrière
 * n'en savent rien.
 *
 * Le montant affiché est calculé pour de bon : le clic sur « Obtenir une
 * estimation instantanée » lance la requête au moteur (`api/estimation.js`,
 * base DVF) en même temps que l'animation d'analyse, et le résultat est
 * appliqué à la fin de celle-ci. La capture de coordonnées, elle, est
 * fonctionnelle côté interface — mais n'envoie ni ne sauvegarde encore rien
 * (voir `EstimationChatPanel`).
 *
 * DERRIÈRE TOUT CELA, UN CHANTIER. Le fond n'est pas une image : c'est une scène
 * Three.js survolée par un drone, où le bien se construit au fil des étapes
 * (voir [`DroneScene`](../components/estimation/DroneScene.jsx)). Elle est
 * branchée sur les données réelles du parcours — type détecté au clic sur la
 * carte, surface et étage déclarés au curseur, atouts cochés à l'affinage — et
 * n'influe sur rien : ni validation, ni navigation, ni calcul. Les étapes lui
 * parlent par `ChantierContext`, jamais l'inverse.
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
  // Résultat du moteur : `{ status: 'ok', price, low, high, confiance }` ou
  // `{ status: 'indisponible', code }`. L'objet entier est conservé plutôt que
  // le seul montant — la fourchette est calculée par le serveur, qui seul
  // connaît le niveau de confiance dont sa largeur dépend.
  const [estimation, setEstimation] = useState(null)
  // Calcul en cours, conservé sous forme de promesse : il démarre avec
  // l'animation d'analyse et n'est lu qu'à la fin de celle-ci. Une référence
  // plutôt qu'un état — sa mutation ne doit provoquer aucun rendu, et
  // `showResult` doit garder une identité stable (voir plus bas).
  const pendingEstimate = useRef(null)
  const reduce = useReducedMotion()

  // Ce que les étapes déclarent au DÉCOR, et à lui seul : le type de bien
  // retenu par l'étape carte (déduction locale, puis détection réseau), la
  // surface et l'étage en cours de déclaration, les options d'affinage. Aucune de ces valeurs ne participe au calcul ni à la
  // navigation — celles-là continuent de remonter par `onEstimate`, qui n'a pas
  // changé. Elles ne servent qu'à ce que la scène 3D montre le bon bien au bon
  // moment (voir `ChantierContext`).
  const [typeDeclare, setTypeDeclare] = useState(null)
  const [surfaceDeclaree, setSurfaceDeclaree] = useState(null)
  // Étage en cours de déclaration : le décor s'en sert pour allumer les
  // fenêtres du bon niveau sur la façade, et pour poser le balcon à la bonne
  // hauteur.
  const [etageDeclare, setEtageDeclare] = useState(null)
  // Options d'affinage traduites en ouvrages à révéler (voir
  // `src/lib/affinage.js`), et bascule de l'écran d'affinage lui-même.
  const [optionsDecor, setOptionsDecor] = useState(null)
  const [affinage, setAffinage] = useState(false)

  // Identité stable : les étapes appellent ces deux fonctions depuis un effet,
  // un objet recréé à chaque rendu les relancerait en boucle. Les mises à jour
  // sont filtrées sur l'égalité — la détection redéclare volontiers le même
  // type, et un rendu par déclaration identique ne servirait à rien.
  const chantier = useMemo(
    () => ({
      declarerBien: (infos) => setTypeDeclare(infos?.type ?? null),
      declarerSurface: (m2) =>
        setSurfaceDeclaree((precedente) => {
          const valeur = Number.isFinite(m2) ? m2 : null
          return precedente === valeur ? precedente : valeur
        }),
      declarerEtage: (n) =>
        setEtageDeclare((precedent) => {
          const valeur = Number.isFinite(n) ? n : null
          return precedent === valeur ? precedent : valeur
        }),
      declarerOptions: (options) =>
        setOptionsDecor((precedentes) => {
          // Même filtrage sur l'égalité que les autres déclarations : le
          // panneau d'affinage redéclare volontiers les mêmes options à chaque
          // rendu, et un rendu par déclaration identique ne servirait à rien.
          const avant = JSON.stringify(precedentes ?? null)
          const apres = JSON.stringify(options ?? null)
          return avant === apres ? precedentes : options
        }),
    }),
    [],
  )

  // Avancement à l'intérieur de l'étape courante (0 à 1) — les sous-écrans
  // qui en ont un le remontent via `onProgress`. Combiné à la position de
  // `step` dans `STAGES`, il alimente le rail d'étapes : celui-ci ne repart
  // donc jamais en arrière en cours de parcours, seulement au sein de l'étape
  // en cours.
  const [stageProgress, setStageProgress] = useState(0)

  // Centralise les transitions d'étape : la progression locale est remise à
  // zéro par la même occasion, plutôt que via un effet séparé sur `step` —
  // un tel effet retomberait après coup sur la valeur volontairement fixée à
  // 1 lors du passage à l'étape finale (voir `finishChat`).
  const goToStep = useCallback((nextStep, localProgress = 0) => {
    setStageProgress(localProgress)
    setStep(nextStep)
    // Quitter l'écran de résultat referme l'affinage : sans cela, le décor
    // resterait au plan d'ensemble pendant qu'on refait sa sélection.
    setAffinage(false)
    // Retour en haut à chaque changement d'écran. Sans cela, la position de
    // défilement héritée de l'étape précédente — celle de la carte, qui
    // déborde, ou celle laissée par la mise au point d'un champ — laisserait le
    // panneau suivant au milieu du pied de page. C'est le décor qui l'exige :
    // il s'arrête au bas de la section, et le parcours doit rester dans ce
    // cadre. Sur téléphone, où le panneau est rangé en bas de l'écran, c'est
    // aussi ce qui garantit que la bande du haut reste celle du chantier.
    window.scrollTo({ top: 0, behavior: 'auto' })
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
    setEstimation(null)
    pendingEstimate.current = requestEstimation(confirmedSelection)
    goToStep('analyse')
  }, [goToStep])

  // Relance depuis l'écran d'indisponibilité. La sélection confirmée est déjà
  // en mémoire : rien n'est à refaire sur la carte, et l'animation d'analyse
  // se rejoue à l'identique — c'est elle qui couvre l'attente.
  const retryAnalysis = useCallback(() => {
    if (selection) startAnalysis(selection)
  }, [selection, startAnalysis])

  // Fin de l'animation : le montant est très largement calculé à ce stade
  // (quelques secondes contre neuf), l'attente ci-dessous ne couvre que le
  // cas d'un serveur à la traîne. `requestEstimation` ne rejette jamais.
  const showResult = useCallback(async () => {
    setEstimation(await pendingEstimate.current)
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

  // Ce que le décor doit montrer. La sélection confirmée l'emporte dès qu'elle
  // existe — c'est elle qui porte le type finalement retenu et la surface
  // déclarée —, les déclarations en cours de route tenant lieu d'avance sur
  // elle : le bâtiment prend sa silhouette au clic sur la carte, et grandit sous
  // le curseur, sans attendre la validation de la fenêtre.
  // Cadrage du décor : tant que le panneau est rangé en bas de l'écran, la
  // scène vise la bande restée libre au-dessus ; une fois le panneau recentré,
  // elle vise le centre. Le seuil est celui du gabarit `lg`, là où le panneau
  // se recentre (voir la section, plus bas).
  const panneauEnBas = useMediaQuery('(max-width: 1023px)')

  const stade = stadeChantier(step, stageProgress, affinage)
  const typeScene = selection?.type ?? typeDeclare
  const surfaceScene = selection?.surfaceM2 ?? surfaceDeclaree ?? 100
  const etageScene = selection?.etage ?? etageDeclare

  // Glissement horizontal léger ; réduit à un simple fondu si l'utilisateur
  // a demandé moins d'animations.
  //
  // L'entrée est retardée de `PAUSE_CHANTIER_S` : `AnimatePresence` étant en
  // `mode="wait"`, le panneau sortant s'efface d'abord, et ce délai laisse
  // ensuite l'écran à la seule scène le temps que le bien se transforme. Le
  // stade de chantier, lui, a déjà changé — il suit `step`, qui bascule dès le
  // clic : le mouvement est donc en cours pendant tout le vide.
  //
  // En mode « moins d'animations », pas de pause : l'écran suivant s'affiche
  // tout de suite, et la scène s'est déjà calée d'un bloc sur son nouvel état.
  const variants = {
    enter: { opacity: 0, x: reduce ? 0 : 24 },
    center: {
      opacity: 1,
      x: 0,
      transition: {
        duration: reduce ? 0.14 : 0.3,
        ease: EASE,
        delay: reduce ? 0 : pauseChantier(step),
      },
    },
    exit: {
      opacity: 0,
      x: reduce ? 0 : -24,
      transition: { duration: reduce ? 0.14 : 0.22, ease: EASE },
    },
  }

  return (
    <ChantierContext.Provider value={chantier}>
      {/* Jusqu'au gabarit ordinateur, le panneau se range EN BAS de l'écran et
          la scène garde toute la bande du haut.

          Le seuil est à 1024 px, et pas à la taille d'un téléphone : c'est la
          largeur en dessous de laquelle le panneau (512 px au plus large)
          occupe plus de la moitié de la fenêtre. Centré, il avale alors le
          bâtiment entier — on ne voit plus rien se construire, ce qui est tout
          l'objet de l'écran. Au-delà, il ne prend plus qu'un tiers de la
          largeur : le bien déborde de part et d'autre, et le panneau peut
          revenir au centre. */}
      <section className="relative flex min-h-screen items-end justify-center bg-stone px-5 pb-6 pt-24 sm:px-8 lg:items-center lg:py-32">
        {/* DÉCOR — le chantier filmé au drone, derrière tout le parcours.

            Le calque couvre la section entière, et le canevas y est `sticky` sur
            une hauteur de fenêtre : la scène reste donc calée sur la fenêtre
            tant qu'on est dans le parcours (l'étape carte et l'écran résultat
            débordent en hauteur), et s'arrête net au bas de la section — le
            pied de page qui suit n'en voit rien. Pas d'`overflow-hidden` sur ce
            calque : il requalifierait le `sticky` en simple `absolute`.

            `bg-stone` reste posé sur la section : c'est le fond de repli si
            WebGL manque, le canevas le recouvrant sinon entièrement. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="sticky top-0 h-screen w-full overflow-hidden">
            <Suspense fallback={null}>
              <DroneScene
                stade={stade}
                type={typeScene}
                surface={surfaceScene}
                etage={etageScene}
                options={optionsDecor}
                zone={panneauEnBas ? 'haut' : 'centre'}
              />
            </Suspense>
          </div>
        </div>

        {/* Rail d'étapes — reprend, dans l'habillage du panneau, l'information
            que portait la barre de progression sous la navbar. Même calque
            collant que le décor, et pour la même raison : le rail suit la
            fenêtre tant qu'on est dans le parcours, et s'arrête au bas de la
            section plutôt que de flotter sur le pied de page.

            Posé au-dessus du parcours (z-20 contre z-10) : il reste donc visible
            par-dessus la fenêtre de surface, comme la barre qu'il remplace le
            faisait déjà — l'avancement ne disparaît pas parce qu'une fenêtre
            s'ouvre. */}
        <div className="pointer-events-none absolute inset-0 z-20">
          <div className="sticky top-0 flex h-screen items-center justify-end pr-5 sm:pr-6">
            <RailEtapes
              total={STAGES.length}
              index={stageIndex}
              pourcentage={globalPct}
              label="Progression du parcours d’estimation"
            />
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            /* LE PANNEAU TIENT LA GAUCHE, LE BÂTIMENT LA DROITE.

               Centré, il avalait le bien : le décentrement de la caméra à lui
               seul ne suffisait pas à l'en sortir — pousser davantage faisait
               sortir le bâtiment par le bord opposé (voir `cadre` et
               `MARGE_CADRAGE` dans `scene/plans.js`). Les deux se partagent
               donc l'écran, chacun de son côté.

               Seulement à partir du gabarit ordinateur : en dessous, le panneau
               est rangé en bas et la scène garde la bande du haut — il n'y a
               rien à dégager latéralement. */
            className="tunnel-estimation relative z-10 flex w-full justify-center lg:justify-start lg:pl-[3vw] xl:pl-[5vw]"
          >
            {step === 'intro' ? <EstimationIntro onStart={() => goToStep('adresse')} /> : null}

            {step === 'adresse' ? (
              <EstimationAddressStep onBack={() => goToStep('intro')} onConfirm={goToBuilding} />
            ) : null}

            {step === 'batiment' && address ? (
              address.monaco ? (
                <EstimationMonacoStep
                  address={address}
                  onBack={() => goToStep('adresse')}
                  onEstimate={startAnalysis}
                  onProgress={setStageProgress}
                />
              ) : (
                <EstimationBuildingStep
                  address={address}
                  onBack={() => goToStep('adresse')}
                  onEstimate={startAnalysis}
                  onProgress={setStageProgress}
                />
              )
            ) : null}

            {step === 'analyse' ? (
              <EstimationLoadingStep onDone={showResult} onProgress={setStageProgress} />
            ) : null}

            {/* Le moteur peut désormais répondre qu'il ne sait pas : une panne
                persistante de la base des ventes rend une indisponibilité
                explicite, et non plus un montant replié en silence sur la
                médiane départementale. Cet écran-là remplace alors le résultat,
                sans passer par la conversation de capture — il n'y a pas de
                montant à faire désirer. */}
            {step === 'resultat' && address ? (
              estimation?.status === 'ok' ? (
                <EstimationResultStep
                  address={address}
                  estimation={estimation}
                  type={typeScene}
                  contenance={contenanceParcelle(selection)}
                  onBack={() => goToStep('batiment')}
                  onDone={finishChat}
                  onProgress={setStageProgress}
                  onAffinage={setAffinage}
                  onClose={goHome}
                />
              ) : (
                <EstimationIndisponibleStep
                  address={address}
                  onRetry={retryAnalysis}
                  onBack={() => goToStep('batiment')}
                />
              )
            ) : null}
          </motion.div>
        </AnimatePresence>
      </section>
    </ChantierContext.Provider>
  )
}
