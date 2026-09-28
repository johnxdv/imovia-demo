import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
// Three.js pèse à lui seul plus que tout le reste du site : le décor est donc
// chargé à la demande, comme la carte, et n'alourdit que cette page. Le temps
// qu'il arrive, le fond blanc de la section tient la place — il n'y a rien à
// afficher en attendant, et surtout rien à faire attendre : le parcours est
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
 * LE RETOUR EN ARRIÈRE NON PLUS, et c'est un correctif. Cette pause suppose
 * qu'il y a quelque chose à regarder pendant qu'elle dure ; en arrière, il n'y
 * a rien — le bien se DÉFAIT, on ne revient pas voir un chantier se démonter.
 * Ce qu'on y gagnait, c'était un écran blanc : le panneau sortant s'efface en
 * 0,22 s, le suivant attend encore 0,35 s avant de commencer à revenir, et le
 * parcours n'affiche plus rien pendant plus d'une demi-seconde. Sur l'écran
 * résultat, qui rend la main à la carte — laquelle doit se remonter, recharger
 * ses dalles et ses emprises — cette demi-seconde de vide se lisait comme une
 * navigation cassée : on cliquait sur « Modifier ma sélection » et la carte
 * disparaissait. Elle revient désormais sans attendre, et par la gauche.
 *
 * Deux gestes de construction ne se jouent pas au changement d'étape mais à
 * l'intérieur d'un écran : les fenêtres qui apparaissent au milieu de l'analyse,
 * et le halo doré à la confirmation finale. Ils n'ont délibérément pas de
 * pause — escamoter l'écran d'analyse pendant que sa barre progresse, ou le
 * prix au moment où il se dévoile, coûterait plus que ça ne montrerait. Ces
 * deux-là se voient à travers le verre du panneau, devenu translucide pour ça.
 */
const PAUSE_CHANTIER_S = 0.35

/**
 * Pause avant l'arrivée d'un écran donné. Nulle à l'entrée du parcours, et
 * nulle sur tout retour en arrière.
 */
const pauseChantier = (step, retour) => (retour || step === 'adresse' ? 0 : PAUSE_CHANTIER_S)

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
function stadeChantier(step, avancement, affinage, conversation) {
  switch (step) {
    case 'intro':
      return 0
    case 'adresse':
      return 1
    case 'batiment':
      return 2
    case 'analyse':
      return avancement < 0.34 ? 3 : avancement < 0.67 ? 4 : 5
    /**
     * L'ÉCRAN RÉSULTAT EN PORTE QUATRE, et c'est le seul du parcours dans ce
     * cas — parce qu'il enchaîne quatre moments sans jamais changer d'étape :
     *
     *   6  LE PRIX FLOUTÉ. Le soir tombe, le drone redescend, et le bien
     *      dérive très lentement sous lui (voir le plan 6 dans `plans.js`).
     *   7  LA CONVERSATION. Le panneau reprend toute la largeur et recouvre la
     *      scène : le bien se range en bas à gauche, dans ce qui reste de vide.
     *   8  LA CONFIRMATION. Les coordonnées sont recueillies, le bien revient
     *      au centre et son halo doré paraît.
     *   9  L'AFFINAGE. Tout le recul du parcours : il faut alors voir le bien
     *      entier — son jardin, sa piscine, son toit.
     */
    case 'resultat':
      if (affinage) return 9
      if (avancement >= 1) return 8
      return conversation ? 7 : 6
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
  /**
   * L'EXCEPTION À LA SÉPARATION DES DEUX ZONES — un seul écran la demande.
   *
   * La conversation de finalisation est déjà un deux-colonnes à elle seule (le
   * montant, les questions) : elle reprend donc toute la largeur et recouvre la
   * scène, comme avant la refonte. C'est l'écran qui le déclare, lui seul
   * sachant où il en est de sa propre bascule (voir `EstimationResultStep`).
   */
  const [pleineLargeur, setPleineLargeur] = useState(false)
  /**
   * La conversation de capture est en cours — ni le prix au repos qui la
   * précède, ni la confirmation qui la suit. C'est le seul moment du parcours
   * où le panneau recouvre le milieu de l'écran, et le décor s'en sert pour
   * ranger le bien dans le coin qui reste libre (voir le plan 7 dans
   * `scene/plans.js`). L'écran résultat le déclare, lui seul sachant où il en
   * est de ses propres bascules.
   */
  const [conversation, setConversation] = useState(false)

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

  /**
   * Sens du dernier déplacement — il ne commande que l'animation du panneau,
   * jamais ce qui s'affiche dedans.
   *
   * Le sens se DÉDUIT de la position des deux étapes dans `STAGES` : aucun
   * appelant n'a à le déclarer, et aucun ne peut donc se tromper. `etapeRef`
   * double `step` parce que `goToStep` doit rester d'identité stable — les
   * étapes l'appellent depuis un effet — et ne peut donc pas lire l'état.
   */
  const etapeRef = useRef('intro')
  const [retour, setRetour] = useState(false)

  // Centralise les transitions d'étape : la progression locale est remise à
  // zéro par la même occasion, plutôt que via un effet séparé sur `step` —
  // un tel effet retomberait après coup sur la valeur volontairement fixée à
  // 1 lors du passage à l'étape finale (voir `finishChat`).
  const goToStep = useCallback((nextStep, localProgress = 0) => {
    setRetour(STAGES.indexOf(nextStep) < STAGES.indexOf(etapeRef.current))
    etapeRef.current = nextStep
    setStageProgress(localProgress)
    setStep(nextStep)
    // Quitter l'écran de résultat referme l'affinage : sans cela, le décor
    // resterait au plan d'ensemble pendant qu'on refait sa sélection.
    setAffinage(false)
    // Et rend au parcours sa moitié d'écran : l'exception ne vaut que pour la
    // conversation de finalisation, qui vient de disparaître avec l'étape.
    setPleineLargeur(false)
    setConversation(false)
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
  //
  // Le décor n'a plus à savoir où se tient le panneau : il a sa propre zone
  // (voir la section, plus bas), et il la remplit d'un bord à l'autre.
  const stade = stadeChantier(step, stageProgress, affinage, conversation)
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
  //
  // LE RETOUR NE TOUCHE QUE L'ENTRÉE, et c'est suffisant. Le panneau qui sort
  // garde les props qu'il avait au moment où on l'a retiré : sa variante de
  // sortie est déjà figée, et la faire dépendre du sens demanderait de la faire
  // voyager par le `custom` d'`AnimatePresence`. Or ce qu'on cherche à
  // supprimer, ce n'est pas la sortie — elle dure 0,22 s dans les deux sens —
  // c'est la PAUSE qui la suit. Elle, elle appartient à l'écran qui arrive, et
  // celui-ci est rendu avec la valeur du jour.
  //
  // Le glissement d'entrée s'inverse en revanche : on avance vers la droite, on
  // revient par la gauche.
  const variants = {
    enter: { opacity: 0, x: reduce ? 0 : retour ? -24 : 24 },
    center: {
      opacity: 1,
      x: 0,
      transition: {
        duration: reduce ? 0.14 : 0.3,
        ease: EASE,
        delay: reduce ? 0 : pauseChantier(step, retour),
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
      {/* DEUX ZONES, ET AUCUN MÉLANGE — c'est la règle de mise en page du
          parcours entier.

          Le panneau et la scène ne se superposent plus : ils se partagent
          l'écran, chacun chez lui. Le panneau tient une zone de FOND BLANC NU,
          où il ne se passe rien — ni animation, ni bâtiment derrière le verre.
          La scène tient la zone opposée, et elle y est seule.

          Sur ordinateur, la coupure est verticale : panneau à gauche, chantier
          à droite. Le panneau garde le côté qu'il avait déjà, et la moitié
          rendue à la scène est celle où le décentrement de caméra poussait
          jusqu'ici le bâtiment — la composition ne change pas, c'est la
          superposition qui disparaît.

          En dessous du gabarit ordinateur, la coupure est HORIZONTALE : la
          scène prend la bande du haut, le panneau tout ce qui est en dessous.
          C'est la même séparation, écrite pour un écran plus haut que large.

          Le fond de la section est blanc : c'est le fond de la zone du panneau,
          et c'est aussi le repli si WebGL manque — le décor, lui, est blanc
          aussi (voir `DroneScene`).

          UN SEUL ÉCRAN Y ÉCHAPPE : la conversation de finalisation, qui reprend
          toute la largeur et recouvre la scène (voir `pleineLargeur`). */}
      <section className="relative min-h-screen bg-white">
        {/* DÉCOR — le chantier, et RIEN d'autre dans sa zone.

            Le calque couvre la hauteur de la section, et le canevas y est
            `sticky` : la scène reste donc calée sur la fenêtre tant qu'on est
            dans le parcours (l'étape carte et l'écran résultat débordent en
            hauteur), et s'arrête net au bas de la section — le pied de page qui
            suit n'en voit rien. Pas d'`overflow-hidden` sur ce calque : il
            requalifierait le `sticky` en simple `absolute`.

            `lg:left-1/2` est toute la séparation : le canevas n'existe que sur
            la moitié droite, et le panneau n'a plus rien à dégager. */}
        <div
          aria-hidden="true"
          className={[
            'pointer-events-none absolute inset-0',
            pleineLargeur ? '' : 'lg:left-1/2',
          ].join(' ')}
        >
          <div className="sticky top-0 h-[38vh] w-full overflow-hidden lg:h-screen">
            <Suspense fallback={null}>
              <DroneScene
                stade={stade}
                type={typeScene}
                surface={surfaceScene}
                etage={etageScene}
                options={optionsDecor}
              />
            </Suspense>
          </div>
        </div>

        {/* Rail d'étapes — reprend, dans l'habillage du panneau, l'information
            que portait la barre de progression sous la navbar. Même calque
            collant que le décor, et pour la même raison : le rail suit la
            fenêtre tant qu'on est dans le parcours, et s'arrête au bas de la
            section plutôt que de flotter sur le pied de page.

            Il se tient sur la COUTURE entre les deux zones — au bord droit de
            celle du panneau (`lg:right-1/2`), et non plus au flanc de la
            fenêtre, qui appartient désormais à la scène. Un rail posé sur le
            chantier serait précisément le mélange qu'on vient de défaire.

            Posé au-dessus du parcours (z-20 contre z-10) : il reste donc visible
            par-dessus la fenêtre de surface, comme la barre qu'il remplace le
            faisait déjà — l'avancement ne disparaît pas parce qu'une fenêtre
            s'ouvre. */}
        <div
          className={[
            'pointer-events-none absolute inset-0 z-20',
            pleineLargeur ? '' : 'lg:right-1/2',
          ].join(' ')}
        >
          <div className="sticky top-0 flex h-screen items-center justify-end pr-5 sm:pr-6">
            <RailEtapes
              total={STAGES.length}
              index={stageIndex}
              pourcentage={globalPct}
              label="Progression du parcours d’estimation"
            />
          </div>
        </div>

        {/* LA ZONE DU PANNEAU. Fond blanc, rien derrière.

            `pt-[41vh]` la pose sous la bande de la scène sur téléphone — trois
            points de plus que la bande elle-même, le temps d'une respiration ;
            sur ordinateur, elle reprend la moitié gauche sur toute la hauteur et
            le panneau s'y centre. */}
        <div
          className={[
            'relative z-10 flex min-h-screen flex-col justify-center px-5 pb-10 pt-[41vh]',
            'sm:px-8 lg:px-10 lg:pb-16 lg:pt-24 xl:px-14',
            pleineLargeur ? 'lg:w-full' : 'lg:w-1/2',
          ].join(' ')}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="tunnel-estimation relative flex w-full justify-center"
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
                  // Ce que le vendeur a déclaré dans la fenêtre de surface. Le
                  // moteur s'en est déjà servi ; l'affinage en a besoin à son
                  // tour pour valoriser un balcon au prix du mètre carré
                  // habitable et un ascenseur à la hauteur où il monte.
                  surface={selection?.surfaceM2 ?? null}
                  etage={selection?.etage ?? null}
                  contenance={contenanceParcelle(selection)}
                  onBack={() => goToStep('batiment')}
                  onDone={finishChat}
                  onProgress={setStageProgress}
                  onAffinage={setAffinage}
                  onPleineLargeur={setPleineLargeur}
                  onConversation={setConversation}
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
        </div>
      </section>
    </ChantierContext.Provider>
  )
}
