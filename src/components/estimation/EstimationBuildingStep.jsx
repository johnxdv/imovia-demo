import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Loader2, MapPin } from 'lucide-react'
// Leaflet et la carte ne servent qu'ici : les charger à la demande évite
// d'alourdir de ~150 ko toutes les autres pages du site. Le module est
// préchargé dès l'étape adresse (voir la page Estimer), si bien que le repli
// ci-dessous n'apparaît qu'en cas de réseau très lent.
const BuildingMap = lazy(() =>
  import('./BuildingMap').then((module) => ({ default: module.BuildingMap })),
)
import { BuildingConfirmModal } from './BuildingConfirmModal'
import { StepBackLink } from './StepBackLink'
import { REPERE_TYPE, useChantier } from './chantier'
import { detectPropertyType, typeImmediat, typeImmediatEtabli } from '../../lib/typeBien'
import { EASE } from '../../lib/motion'

/**
 * Aspiration de la carte.
 *
 * Le bien est choisi : la photo aérienne a fait son travail, et la fenêtre de
 * surface s'ouvre. Plutôt que de rester en fond derrière elle, la carte est
 * happée vers le bâtiment — elle se referme sur son centre en se brouillant,
 * comme aspirée par la maison qui se construit derrière. Le chantier reste
 * alors seul sous la fenêtre, et c'est tout l'intérêt : c'est au moment où la
 * surface se règle que le bâtiment grandit, et il faut le voir.
 *
 * Réversible : fermer la fenêtre rend la carte à sa place, par le même chemin.
 */
export const CARTE_ASPIREE = {
  opacity: 0,
  scale: 0.88,
  filter: 'blur(8px)',
  transition: { duration: 0.3, ease: EASE },
}

export const CARTE_EN_PLACE = {
  opacity: 1,
  scale: 1,
  filter: 'blur(0px)',
  transition: { duration: 0.26, ease: EASE },
}

/**
 * Délai au-delà duquel un repérage libre part sans attendre le cadastre.
 *
 * La contenance de la parcelle est une commodité, pas une condition : le
 * moteur d'estimation sait retrouver la parcelle lui-même, et rien ne justifie
 * d'immobiliser le parcours sur une réponse qui tarde. En pratique, le
 * cadastre répond en quelques centaines de millisecondes et ce minuteur ne
 * sert jamais.
 */
const ATTENTE_CADASTRE_MS = 2500

/**
 * Étape 3 — repérage du bien sur la photo aérienne.
 *
 * Sélectionner un bâtiment ouvre la fenêtre de saisie de la surface et lance en
 * même temps, en arrière-plan, la détection de son type (cadastre puis BDNB) :
 * l'attente réseau se joue derrière l'animation plutôt qu'après elle.
 *
 * Un repérage libre — un clic hors de toute emprise bâtie — ne l'ouvre pas :
 * c'est un terrain, il n'a pas de surface habitable à déclarer et sa contenance
 * cadastrale est déjà connue. L'écran d'analyse s'enchaîne alors directement,
 * dès que le cadastre a répondu.
 *
 * Ce type n'est plus affiché — mais il commande ce que la fenêtre demande :
 * un appartement s'y voit réclamer son étage en plus de sa surface, une maison
 * non (voir `BuildingConfirmModal` et `src/lib/etage.js`). La détection tranche
 * toujours, y compris par arbitrage quand aucune base ne répond : le parcours
 * n'a aucune branche « type indéterminé » où s'arrêter, et n'en demande jamais
 * la levée à l'utilisateur.
 *
 * **La fenêtre n'attend pas le réseau pour savoir quoi demander.** Le type
 * affiché est celui de `typeImmediat`, lu dans les attributs déjà arrivés avec
 * le polygone cliqué : le champ étage est là dès l'ouverture, là où la chaîne
 * cadastre → BDNB le faisait attendre deux secondes. Celle-ci reprend la main
 * dès qu'elle aboutit, et c'est sa réponse — la mieux établie — qui descend au
 * moteur.
 *
 * `onEstimate` remonte la sélection enrichie du type retenu, de la surface et
 * de l'étage déclarés, sans que l'utilisateur ait eu à s'en préoccuper.
 *
 * ET CE TYPE SE VOIT, désormais : c'est lui qui décide de l'architecture du
 * bâtiment qui se construit dans le décor 3D derrière le panneau — la villa
 * d'architecte pour une maison, l'immeuble haussmannien pour un appartement,
 * l'ossature du chantier tant que rien n'est repéré (voir `DroneScene`). Il y
 * est déclaré par `ChantierContext`, et il y part DÈS LE CLIC quand le polygone
 * arrive avec ses logements comptés — la lecture locale d'abord, la réponse du
 * réseau ensuite, et l'ossature entre les deux quand la première se tait.
 */
export function EstimationBuildingStep({ address, onBack, onEstimate, onProgress }) {
  const chantier = useChantier()
  const reduce = useReducedMotion()
  const [selection, setSelection] = useState(null)
  // Résultat complet de la détection, et pas seulement le type : la parcelle
  // cadastrale et la fiche BDNB obtenues au passage évitent au moteur
  // d'estimation de refaire la même chaîne d'appels quelques secondes plus tard.
  const [detection, setDetection] = useState(null)

  // Un bâtiment se voit demander sa surface habitable ; un repérage libre vaut
  // terrain — c'est déjà la règle que suit `detectPropertyType`, on ne fait ici
  // que la lire sans attendre sa réponse, pour savoir s'il faut ouvrir la
  // fenêtre ou passer outre.
  const isBuilding = selection?.kind === 'batiment'

  // Type montré à la fenêtre : la déduction locale tant que la chaîne réseau
  // n'a pas répondu, la sienne dès qu'elle est là. Recalculé à chaque rendu
  // plutôt que mémorisé — c'est une lecture d'attributs et deux exponentielles,
  // moins cher que la comparaison de dépendances qui l'éviterait.
  const typeAffiche = detection?.type ?? typeImmediat(selection)

  /**
   * LE DÉCOR S'ENGAGE DÈS LE CLIC — MAIS SEULEMENT SUR CE QUI EST ÉTABLI.
   *
   * Il attendait la chaîne réseau en entier : cadastre, puis BDNB, deux
   * allers-retours en série, une à deux secondes. Un appartement mettait donc
   * tout ce temps à paraître — l'ossature continuait de monter sous le curseur
   * du vendeur, puis l'immeuble arrivait d'un bloc, longtemps après le clic.
   * C'était le prix d'une garantie, et elle valait qu'on la paie : NE JAMAIS
   * BÂTIR UNE VILLA POUR LA REPRENDRE. `typeImmediat` répond toujours, et son
   * repli est « maison » — le cas le plus fréquent du parc, pas une lecture de
   * CE bâtiment-ci —, si bien qu'un immeuble dont la BD TOPO® ne compte pas les
   * logements y passait pour une maison : une villa d'architecte se bâtissait,
   * puis disparaissait d'un coup quand la BDNB répondait.
   *
   * La garantie est gardée, l'attente non. `typeImmediatEtabli` ne répond que
   * sur le seul relevé que la chaîne réseau ne démente jamais — LE NOMBRE DE
   * LOGEMENTS RÉELLEMENT COMPTÉ par la BD TOPO®, mesuré sur vingt-quatre
   * bâtiments d'un centre ancien — et se tait partout ailleurs, y compris quand
   * la vocation déclarée semble claire : c'est précisément là que la BDNB la
   * reprend. Le décor part donc au clic sur ce qui est lu, et l'ossature
   * continue de monter sur le reste : elle ne dit rien de faux, elle dit qu'on
   * n'a pas encore reconnu le bien.
   *
   * La détection reprend la main dès qu'elle aboutit — c'est sa réponse qui
   * descend au moteur, et c'est elle qui corrige le décor dans les rares cas où
   * les deux divergent.
   */
  const typeDecor = detection?.type ?? typeImmediatEtabli(selection)

  useEffect(() => {
    // Le repère d'où se mesure le délai jusqu'à la première image du bien (voir
    // `REPERE_TYPE`). Posé ici, et pas dans le décor : ce qu'on veut mesurer
    // part du moment où le parcours SAIT, pas de celui où il le dit.
    if (typeDecor) performance.mark(REPERE_TYPE)
    chantier.declarerBien({ type: typeDecor })
  }, [chantier, typeDecor])

  // Changer d'adresse (retour puis nouvelle saisie) doit repartir d'une carte vierge.
  useEffect(() => {
    setSelection(null)
  }, [address.id, address.lat, address.lon])

  // Avancement local remonté à la barre globale : la moitié dès qu'un bien est
  // sélectionné (fenêtre de surface ouverte, ou terrain en route vers
  // l'analyse), le reste n'arrive qu'au passage à l'étape suivante.
  useEffect(() => {
    onProgress?.(selection ? 0.5 : 0)
  }, [selection, onProgress])

  // Détection du type : relancée à chaque nouvelle sélection, annulée si
  // l'utilisateur en choisit une autre avant la réponse. Rien n'en transparaît
  // à l'écran — ni attente, ni résultat : la fenêtre s'ouvre immédiatement et
  // reste utilisable, quoi qu'il advienne du réseau.
  useEffect(() => {
    // Remise à zéro à chaque changement de sélection : sans elle, la détection
    // du bâtiment précédent resterait valide le temps que la nouvelle
    // aboutisse, et pourrait partir au calcul à la place de la bonne.
    setDetection(null)
    if (!selection) return undefined

    const controller = new AbortController()

    detectPropertyType(selection, { signal: controller.signal })
      .then(setDetection)
      .catch((error) => {
        if (error.name === 'AbortError') return
        // La chaîne ne lève qu'en cas d'annulation ; ce repli couvre l'imprévu.
        setDetection(null)
      })

    return () => controller.abort()
  }, [selection])

  // La détection peut n'avoir pas abouti si l'utilisateur valide très vite —
  // invraisemblable en pratique (moins d'une seconde, contre le temps de lire
  // la fenêtre), mais l'écran suivant ne doit rien prendre pour acquis : le
  // moteur d'estimation sait retrouver lui-même ce qui lui manque.
  //
  // `surfaceM2` est la seule chose que l'utilisateur ait déclarée de tout le
  // parcours : elle l'emporte donc, côté moteur, sur toute surface reconstituée.
  //
  // Le second argument de la fenêtre — le type déclaré — ne concerne que la
  // Principauté ; ici, c'est la détection qui le fournit.
  const startEstimate = useCallback(
    (surfaceM2, _typeDeclare, etage) => {
      onEstimate?.({
        ...selection,
        surfaceM2,
        etage: etage ?? null,
        type: detection?.type ?? null,
        // Comment le type a été obtenu, et à quel point il est sûr : le moteur
        // n'en fait rien d'autre que de le journaliser, mais c'est ce journal
        // qui dira, à l'usage, ce que vaut la détection sur le terrain.
        typeSource: detection?.source ?? null,
        typeConfiance: detection?.confiance ?? null,
        parcelle: detection?.parcelle ?? null,
        fiche: detection?.fiche ?? null,
      })
    },
    [onEstimate, selection, detection],
  )

  // Terrain : aucune fenêtre, aucune question. Rien n'est déclaré — c'est la
  // contenance de la parcelle qui fait la surface, et elle voyage déjà dans
  // `parcelle`, que le moteur lit de lui-même. On attend seulement que le
  // cadastre ait répondu pour la lui transmettre, ce qui lui épargne d'aller
  // la chercher ; passé le délai, on part sans, et il s'en charge.
  useEffect(() => {
    if (!selection || isBuilding) return undefined

    if (detection) {
      startEstimate(null)
      return undefined
    }

    const timer = setTimeout(() => startEstimate(null), ATTENTE_CADASTRE_MS)
    return () => clearTimeout(timer)
  }, [selection, isBuilding, detection, startEstimate])

  return (
    // La fenêtre modale reste HORS du panneau : `.panneau-verre` porte un
    // `backdrop-filter`, et un tel filtre fait du panneau le bloc conteneur de
    // ses descendants `fixed` — elle s'y retrouverait enfermée au lieu de se
    // caler sur la fenêtre du navigateur.
    <div className="w-full max-w-3xl">
      <StepBackLink onClick={onBack}>Modifier l’adresse</StepBackLink>

      {/* La carte et tout ce qui l'annonce s'effacent ensemble dès qu'un bien est
          retenu : ce n'est plus de la carte qu'il s'agit, mais de la surface.
          `pointer-events-none` pendant l'aspiration, sinon un clic passerait au
          travers de la fenêtre pour atterrir sur un bâtiment voisin ; et
          `aria-hidden`, pour que la tabulation n'aille pas non plus s'y perdre. */}
      <motion.div
        animate={isBuilding && !reduce ? CARTE_ASPIREE : CARTE_EN_PLACE}
        aria-hidden={isBuilding}
        className={[
          'panneau-verre p-6 sm:p-8',
          isBuilding ? 'pointer-events-none' : '',
        ].join(' ')}
      >
        <h1 className="titre-etape text-center text-[1.6rem] leading-tight text-ink sm:text-[2rem]">
          Cliquez sur votre bien
        </h1>
        <p className="mx-auto mt-4 max-w-md text-center text-[1rem] leading-relaxed text-ink/70">
          Sur la vue aérienne, sélectionnez le bâtiment concerné.
        </p>

        {/* Rappel de l'adresse : l'utilisateur n'a rien validé explicitement pour
            arriver ici, il doit pouvoir vérifier d'un coup d'œil où il a atterri. */}
        <p className="mx-auto mt-6 flex max-w-xl items-center justify-center gap-2.5 rounded-full border border-ink/10 bg-white/70 px-4 py-2.5 text-center text-[0.8rem] leading-snug text-ink/70 sm:text-sm">
          <MapPin className="h-4 w-4 shrink-0 text-laiton-texte" strokeWidth={1.75} aria-hidden="true" />
          {address.label}
        </p>

        <div className="mt-6">
          <Suspense fallback={<MapPlaceholder />}>
            <BuildingMap
              lat={address.lat}
              lon={address.lon}
              addressLabel={address.label}
              onSelect={setSelection}
            />
          </Suspense>
        </div>
      </motion.div>

      {/* La fenêtre est rendue hors du panneau ET du conteneur de la carte :
          elle couvre la page entière, pas seulement la vue aérienne. */}
      <AnimatePresence>
        {isBuilding ? (
          <BuildingConfirmModal
            key="surface"
            selection={selection}
            type={typeAffiche}
            onEstimate={startEstimate}
            onClose={() => setSelection(null)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}

/**
 * Cadre d'attente du module carte — mêmes dimensions et même habillage que
 * `BuildingMap`, pour que la mise en page ne bouge pas à son arrivée.
 */
function MapPlaceholder() {
  return (
    <div className="flex h-[52vh] max-h-[452px] min-h-[288px] w-full items-center justify-center overflow-hidden rounded-2xl border border-ink/10 bg-ink shadow-[0_22px_54px_-18px_rgba(16,20,28,0.45)] sm:h-[424px]">
      <span
        role="status"
        className="inline-flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-micro text-stone/60"
      >
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} aria-hidden="true" />
        Chargement de la vue satellite
      </span>
    </div>
  )
}
