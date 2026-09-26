import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Minus, Plus } from 'lucide-react'
import { useChantier } from './chantier'
import { ETAGE_DEFAUT, ETAGE_MAX, ETAGE_MIN, etageLabel } from '../../lib/etage'
import { EASE } from '../../lib/motion'

/** Éléments focusables du panneau, pour le maintien du focus à l'intérieur. */
const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Bornes du curseur. Le pas de 5 m² tient l'échelle entière en 159 crans :
 * assez fin pour qu'on tombe sur sa surface, assez large pour que la valeur
 * ne tremble pas sous le doigt.
 *
 * La borne haute est un plafond d'affichage, pas une limite du parc : au-delà,
 * le curseur reste en butée et la valeur s'écrit « 800+ ».
 */
const SURFACE_MIN = 10
const SURFACE_MAX = 800
const SURFACE_STEP = 5

/**
 * Pas des boutons « − » et « + », en m².
 *
 * Le glissement garde son pas de 5 : c'est ce qui l'empêche de trembler sous
 * le doigt. Les boutons, eux, visent l'ajustement final — 5 m² d'écart sur un
 * deux-pièces, ce n'est pas rien. Les deux gestes ne s'excluent pas : on
 * traverse l'échelle au curseur, puis on affine au bouton.
 */
const SURFACE_FINE_STEP = 1

/** Ramène une valeur quelconque à un entier de m² dans les bornes du curseur. */
const clampSurface = (value) =>
  Math.min(Math.max(Math.round(value), SURFACE_MIN), SURFACE_MAX)

/**
 * Types proposés en Principauté, faute de cadastre où lire la réponse. Deux
 * suffisent : le curseur ne recueille qu'une surface habitable, un terrain nu
 * n'aurait rien à y déclarer.
 */
const MONACO_TYPES = [
  { id: 'appartement', label: 'Appartement' },
  { id: 'maison', label: 'Maison / villa' },
]

/**
 * Valeur d'ouverture. Volontairement médiane : ouvrir à 10 m² obligerait tout
 * le monde à traverser l'échelle, et laisserait croire que le parcours part du
 * plus petit. 100 m² est l'ordre de grandeur d'une maison française.
 */
const SURFACE_DEFAULT = 100

/**
 * Fenêtre de saisie de la surface habitable.
 *
 * Vraie fenêtre modale, et non un calque posé sur la carte : le fond assombri
 * et flouté couvre toute la page, le panneau s'ouvre au centre de l'écran.
 *
 * Le positionnement `fixed` fonctionne ici sans portail parce que Framer Motion
 * laisse `transform: none` sur l'étape au repos. Pendant la transition vers
 * l'écran suivant, l'étape reprend un `transform` et la fenêtre glisse alors
 * avec la page — exactement l'enchaînement recherché.
 *
 * En France, elle n'est ouverte que pour un bâtiment : un terrain n'a pas de
 * surface habitable à déclarer, sa contenance cadastrale est déjà connue et
 * l'étape suivante s'enchaîne sans rien demander (voir
 * `EstimationBuildingStep`). En Principauté, où aucune contenance n'est
 * publiée, elle s'ouvre pour tout repérage — le curseur y est la seule source
 * de surface (voir `EstimationMonacoStep`).
 *
 * Le type de bien détecté n'est volontairement pas affiché : la détection tourne
 * en arrière-plan pour le futur calcul d'estimation, elle n'a rien à dire à
 * l'utilisateur à ce stade. Elle commande en revanche ce qui lui est demandé —
 * une maison n'a que sa surface habitable à déclarer, sa contenance cadastrale
 * étant déjà connue ; un appartement se voit demander en plus son **étage**,
 * qu'aucune base ne descend au logement et que lui seul peut donner.
 *
 * Le champ apparaît donc à la volée, quand la détection aboutit — quelques
 * centaines de millisecondes après l'ouverture, pendant que la fenêtre se lit.
 * Il ne bloque rien : validée avant, la fenêtre part sans étage, et le moteur
 * s'en passe (coefficient 1, voir `src/lib/etage.js`).
 *
 * LE CURSEUR N'A PLUS D'ILLUSTRATION SOUS LUI. Le dessin à l'encre qui changeait
 * de programme au fil de l'échelle (petite maison, maison à étage, propriété,
 * château) a été retiré avec les autres dessins du parcours : c'est le bâtiment
 * du décor 3D, derrière la fenêtre, qui grandit maintenant sous le curseur —
 * mêmes mètres carrés, mais sur le bien qu'on est en train d'estimer, et non sur
 * une vignette à côté (voir `DroneScene`). La surface en cours de déclaration
 * lui est transmise par `ChantierContext`, sans attendre la validation.
 *
 * AUCUN MONTANT NE S'AFFICHE ICI, et c'est un retrait délibéré. La fenêtre
 * montrait un prix d'aperçu qui suivait le curseur : prix au m² du secteur,
 * demandé au réseau à l'ouverture, multiplié par la surface dans le navigateur.
 * Deux chiffres obtenus par deux méthodes différentes se succédaient donc à
 * quelques secondes d'intervalle sous les yeux du même vendeur — l'aperçu ne
 * sélectionnait pas les ventes, ne les pondérait pas, ne les actualisait pas —
 * et rien n'expliquait l'écart. Le curseur ne recueille plus qu'une surface ;
 * le seul montant du parcours est celui de l'écran de résultat, et il est
 * calculé pour de bon.
 *
 * `monaco` bascule la fenêtre dans sa variante monégasque : le type de bien —
 * que plus aucune base ne peut deviner — est demandé à l'utilisateur en tête de
 * panneau. `onEstimate` reçoit alors ce type en second argument ; il vaut
 * `null` dans le parcours français, où la détection s'en charge. Le troisième
 * argument est l'étage, `null` dès que le bien retenu n'est pas un appartement.
 */
export function BuildingConfirmModal({ type = null, onClose, onEstimate, monaco = false }) {
  const panelRef = useRef(null)
  const reduce = useReducedMotion()
  const chantier = useChantier()

  const [surface, setSurface] = useState(SURFACE_DEFAULT)

  // Type déclaré, en Principauté uniquement. L'appartement par défaut : c'est
  // l'essentiel du parc monégasque, et le choix reste à un clic.
  const [monacoType, setMonacoType] = useState(MONACO_TYPES[0].id)

  // Étage déclaré. Ouvre sur l'étage de référence du barème — celui dont le
  // coefficient vaut exactement 1 : un champ apparu tard et laissé tel quel ne
  // doit déplacer le montant ni dans un sens ni dans l'autre.
  const [etage, setEtage] = useState(ETAGE_DEFAUT)

  // En France le type vient de la détection, en Principauté du choix ci-dessus.
  // Tant que la détection n'a pas répondu, `type` vaut `null` : le champ étage
  // n'est pas encore là, et c'est voulu — mieux vaut un champ qui arrive qu'un
  // champ posé au hasard sur une maison.
  const typeRetenu = monaco ? monacoType : type
  const estAppartement = typeRetenu === 'appartement'

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

  // Le décor suit le curseur, et le type déclaré en Principauté : la seule
  // chose que la fenêtre ait à dire au fond de scène. Rien n'en dépend côté
  // parcours — la validation reste celle du bouton.
  useEffect(() => {
    chantier.declarerSurface(surface)
  }, [chantier, surface])

  useEffect(() => {
    if (monaco) chantier.declarerBien({ type: monacoType, niveaux: null })
  }, [chantier, monaco, monacoType])

  const atMin = surface <= SURFACE_MIN
  const atMax = surface >= SURFACE_MAX
  const surfaceLabel = `${atMax ? `${SURFACE_MAX}+` : surface} m²`

  // Le curseur garde son pas de 5 : un `input[type=range]` recale de
  // toute façon toute valeur hors cran, et le point se figerait entre deux
  // clics de bouton. On lui donne donc la valeur crantée la plus proche — au
  // pire 2 m² d'écart, soit un quart de pixel sur la piste — pendant que le
  // chiffre affiché et le bâtiment du décor suivent la valeur exacte.
  // `SURFACE_MIN` et `SURFACE_MAX` étant tous deux multiples du pas, l'arrondi
  // ne peut pas sortir des bornes.
  const sliderValue = Math.round(surface / SURFACE_STEP) * SURFACE_STEP

  const adjust = (delta) => setSurface((current) => clampSurface(current + delta))

  const adjustEtage = (delta) =>
    setEtage((current) => Math.min(Math.max(current + delta, ETAGE_MIN), ETAGE_MAX))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.15 : 0.28, ease: EASE }}
      // Pas de flou et à peine une teinte : la carte vient de s'effacer pour
      // laisser voir le chantier, et c'est sous le curseur de cette fenêtre que
      // le bâtiment grandit. Un voile appuyé annulerait tout le geste. Il reste
      // ce qu'il faut de gris pour que la fenêtre se détache du décor, et le
      // fond garde son rôle : un clic dessus la ferme.
      //
      // Tant que les panneaux d'étape sont rangés en bas (sous 1024 px), la
      // fenêtre s'y range aussi : c'est la bande du haut qui montre le bien, et
      // elle doit rester libre.
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink/10 px-5 pb-6 pt-24 lg:items-center lg:py-10"
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
        aria-labelledby="surface-habitable-titre"
        tabIndex={-1}
        initial={{ opacity: 0, y: reduce ? 0 : 16, scale: reduce ? 1 : 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: reduce ? 0 : 8, scale: reduce ? 1 : 0.98 }}
        transition={{ duration: reduce ? 0.15 : 0.34, ease: EASE }}
        // `mt-auto` tant que la fenêtre est rangée en bas : c'est lui qui l'y
        // plaque, là où `my-auto` la recentrait malgré l'alignement du
        // conteneur. Au gabarit ordinateur, les deux marges automatiques la
        // remettent au milieu et la gardent atteignable si elle déborde.
        className="relative mt-auto w-full max-w-lg outline-none lg:my-auto"
      >
        {/* Panneau repris de la maquette de la fenêtre de surface : aligné à
            gauche, bas et large plutôt que haut et étroit — c'est ce format-là
            qui laisse le bâtiment se voir de part et d'autre —, une ligne par
            question (libellé à gauche, valeur retenue en laiton à droite), la
            piste du curseur en pleine largeur dessous, et le pied de panneau
            qui aligne le retour discret et le bouton noir.

            Le grand cercle vert de confirmation qui coiffait la fenêtre a été
            retiré : il mangeait un quart de la hauteur du panneau pour redire
            ce que la fenêtre elle-même annonce en s'ouvrant. */}
        <div className="panneau-verre relative px-7 py-7 text-left sm:px-9 sm:py-8">
          <h2
            id="surface-habitable-titre"
            className="titre-etape text-[1.5rem] leading-tight text-ink sm:text-[1.8rem]"
          >
            Votre surface habitable
          </h2>

          {/* Choix du type, en Principauté seulement : le cadastre s'arrête à
              la frontière, il n'y a personne pour répondre à notre place. */}
          {monaco ? (
            <fieldset className="mt-6">
              <legend className="sr-only">Type de bien</legend>
              <div className="grid grid-cols-2 gap-2.5">
                {MONACO_TYPES.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={monacoType === id}
                    onClick={() => setMonacoType(id)}
                    className="option-tunnel px-3 py-3 text-center text-[0.9rem]"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          {/* Étage — appartements seulement, et seulement une fois le type
              détecté. Le champ arrive donc à la volée, en cours de lecture de la
              fenêtre : il se déplie plutôt qu'il n'apparaît d'un coup, sans quoi
              le panneau sauterait sous les yeux. Une maison n'en voit jamais
              rien, et ne se voit toujours demander que sa surface habitable.

              Même grammaire que la surface : le libellé à gauche, la valeur
              retenue à droite. Pas de curseur — une échelle de treize crans se
              traverse plus vite au bouton qu'au glissement. */}
          <AnimatePresence initial={false}>
            {estAppartement ? (
              <motion.div
                key="etage"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: reduce ? 0.15 : 0.3, ease: EASE }}
                className="overflow-hidden"
              >
                <div
                  role="group"
                  aria-label="Étage du logement"
                  className="mt-6 flex flex-wrap items-center justify-between gap-3"
                >
                  <p className="text-[0.95rem] text-ink/70">Votre étage</p>

                  <div className="flex items-center gap-2">
                    <StepButton
                      icon={Minus}
                      label="Descendre d’un étage"
                      disabled={etage <= ETAGE_MIN}
                      onClick={() => adjustEtage(-1)}
                    />

                    <p
                      aria-live="polite"
                      className="min-w-[8rem] text-center text-[0.95rem] text-laiton-texte"
                    >
                      {etageLabel(etage)}
                    </p>

                    <StepButton
                      icon={Plus}
                      label="Monter d’un étage"
                      disabled={etage >= ETAGE_MAX}
                      onClick={() => adjustEtage(1)}
                    />
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="mt-7">
            {/* Libellé à gauche, valeur en cours à droite : elle suit le doigt
                sans attendre le relâchement, et `tabular-nums` fige la largeur
                des chiffres — sans quoi le nombre danserait pendant le
                glissement. En laiton, comme toute valeur retenue du panneau. */}
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-[0.95rem] text-ink/70">Surface habitable</p>
              <p className="text-[1.15rem] text-laiton-texte tabular-nums">{surfaceLabel}</p>
            </div>

            {/* Curseur encadré de ses deux boutons : le glissement pour
                traverser l'échelle, les boutons pour tomber juste. */}
            <div className="mt-1 flex items-center gap-2 sm:gap-3">
              <StepButton
                icon={Minus}
                label="Retirer un mètre carré"
                disabled={atMin}
                onClick={() => adjust(-SURFACE_FINE_STEP)}
              />

              <div className="min-w-0 flex-1">
                <input
                  type="range"
                  min={SURFACE_MIN}
                  max={SURFACE_MAX}
                  step={SURFACE_STEP}
                  value={sliderValue}
                  onChange={(event) => setSurface(clampSurface(Number(event.target.value)))}
                  aria-label="Surface habitable, en mètres carrés"
                  aria-valuetext={surfaceLabel}
                  className="surface-slider"
                />
              </div>

              <StepButton
                icon={Plus}
                label="Ajouter un mètre carré"
                disabled={atMax}
                onClick={() => adjust(SURFACE_FINE_STEP)}
              />
            </div>

            {/* Les bornes se calent sous les extrémités de la piste, pas du
                bloc : largeur d'un bouton plus la gouttière, de chaque côté. */}
            <div className="flex justify-between px-[3.25rem] font-mono text-[0.6rem] uppercase text-ink/55 sm:px-[2.75rem]">
              <span>{SURFACE_MIN} m²</span>
              <span>{SURFACE_MAX}+ m²</span>
            </div>
          </div>

          {/* Pied de panneau : le retour en retrait à gauche, l'action en noir à
              droite — la disposition de la maquette. Le libellé du bouton fait
              trente-quatre caractères en capitales, le plus long du parcours :
              il ne tient à côté du retour qu'à partir du gabarit tablette, en
              dessous de quoi les deux s'empilent, l'action au-dessus. */}
          <div className="mt-8 flex flex-col-reverse flex-wrap gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            {/* Seule sortie visible depuis le retrait de la croix —
                délibérément en retrait, mais nommée : « Modifier ma sélection »
                dit ce qui va se passer là où une croix laissait deviner. Même
                libellé en Principauté : depuis que l'étape monégasque a sa
                propre carte, on y revient au repérage comme partout ailleurs. */}
            <button
              type="button"
              onClick={onClose}
              className="group inline-flex touch-manipulation items-center justify-center gap-1.5 text-[0.85rem] text-ink/60 transition-colors hover:text-ink sm:shrink-0 sm:justify-start"
            >
              <ArrowLeft
                className="h-3.5 w-3.5 transition-transform duration-300 ease-plan group-hover:-translate-x-1"
                strokeWidth={2}
                aria-hidden="true"
              />
              Modifier ma sélection
            </button>

            <button
              type="button"
              onClick={() =>
                onEstimate(surface, monaco ? monacoType : null, estAppartement ? etage : null)
              }
              className="bouton-tunnel flex items-center justify-center px-6 py-3.5"
            >
              <span className="whitespace-nowrap text-[0.64rem] font-semibold uppercase tracking-[0.05em]">
                Obtenir une estimation instantanée
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/**
 * Bouton d'ajustement au mètre carré près.
 *
 * 2,75 rem de côté au doigt — la cible tactile recommandée (44 px). Il se
 * resserre à 2,25 rem à partir du gabarit tablette, où l'on vise à la souris :
 * le panneau y gagne en calme, et rien ne s'y rate.
 *
 * En butée, il est désactivé plutôt que masqué : une commande qui disparaît
 * déplace l'autre, et le curseur avec.
 */
function StepButton({ icon: Icon, label, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border border-ink/15 bg-white/70 text-ink transition-colors duration-300 ease-plan hover:border-laiton hover:bg-laiton/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laiton focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-ink/10 disabled:text-ink/25 disabled:hover:bg-white/70"
    >
      <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
    </button>
  )
}
