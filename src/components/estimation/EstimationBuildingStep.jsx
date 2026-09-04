import { Suspense, lazy, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, MapPin } from 'lucide-react'
// Leaflet et la carte ne servent qu'ici : les charger à la demande évite
// d'alourdir de ~150 ko toutes les autres pages du site. Le module est
// préchargé dès l'étape adresse (voir la page Estimer), si bien que le repli
// ci-dessous n'apparaît qu'en cas de réseau très lent.
const BuildingMap = lazy(() =>
  import('./BuildingMap').then((module) => ({ default: module.BuildingMap })),
)
import { BuildingConfirmModal } from './BuildingConfirmModal'
import { detectPropertyType } from '../../lib/typeBien'

/**
 * Étape 3 — repérage du bien sur la photo aérienne.
 *
 * Sélectionner un bâtiment ouvre la fenêtre de confirmation et lance en même
 * temps, en arrière-plan, la détection de son type (cadastre puis BDNB) :
 * l'attente réseau se joue derrière l'animation plutôt qu'après elle.
 *
 * Ce type n'est plus affiché — il ne servira qu'au calcul de l'estimation.
 * `onEstimate` remonte donc la sélection enrichie du type retenu, sans que
 * l'utilisateur ait eu à s'en préoccuper.
 */
export function EstimationBuildingStep({ address, onBack, onEstimate, onProgress }) {
  const [selection, setSelection] = useState(null)
  const [detectedType, setDetectedType] = useState(null)

  // Changer d'adresse (retour puis nouvelle saisie) doit repartir d'une carte vierge.
  useEffect(() => {
    setSelection(null)
  }, [address.id, address.lat, address.lon])

  // Avancement local remonté à la barre globale : la moitié dès qu'un
  // bâtiment est sélectionné (fenêtre « Bien confirmé » ouverte), le reste
  // n'arrive qu'au passage à l'étape suivante.
  useEffect(() => {
    onProgress?.(selection ? 0.5 : 0)
  }, [selection, onProgress])

  // Détection du type : relancée à chaque nouvelle sélection, annulée si
  // l'utilisateur en choisit une autre avant la réponse. Rien n'en transparaît
  // à l'écran — ni attente, ni résultat : la fenêtre s'ouvre immédiatement et
  // reste utilisable, quoi qu'il advienne du réseau.
  useEffect(() => {
    if (!selection) {
      setDetectedType(null)
      return undefined
    }

    const controller = new AbortController()

    detectPropertyType(selection, { signal: controller.signal })
      .then((result) => setDetectedType(result.type))
      .catch((error) => {
        if (error.name === 'AbortError') return
        // La chaîne ne lève qu'en cas d'annulation ; ce repli couvre l'imprévu.
        setDetectedType(null)
      })

    return () => controller.abort()
  }, [selection])

  // `type` peut être `null` si l'utilisateur valide avant la fin de la détection
  // — invraisemblable en pratique (moins d'une seconde, contre le temps de lire
  // la fenêtre), mais l'écran suivant ne doit pas prendre un type pour acquis.
  const startEstimate = () => {
    onEstimate?.({ ...selection, type: detectedType })
  }

  return (
    <div className="w-full max-w-3xl">
      <button
        type="button"
        onClick={onBack}
        className="group mb-8 inline-flex touch-manipulation items-center gap-2 font-mono text-[0.68rem] uppercase tracking-micro text-ink/45 transition-colors hover:text-ink"
      >
        <ArrowLeft
          className="h-4 w-4 transition-transform duration-300 ease-plan group-hover:-translate-x-1"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        Modifier l’adresse
      </button>

      <h1 className="text-center font-display text-[1.6rem] font-semibold leading-tight text-ink sm:text-[2rem]">
        Repérez votre bien
      </h1>
      <p className="mx-auto mt-4 max-w-md text-center text-[0.95rem] leading-relaxed text-ink/55">
        Sur la vue aérienne, sélectionnez le bâtiment concerné.
      </p>

      {/* Rappel de l'adresse : l'utilisateur n'a rien validé explicitement pour
          arriver ici, il doit pouvoir vérifier d'un coup d'œil où il a atterri. */}
      <p className="mx-auto mt-6 flex max-w-xl items-center justify-center gap-2.5 rounded-full border border-ink/10 bg-white px-4 py-2.5 text-center text-[0.8rem] leading-snug text-ink/70 sm:text-sm">
        <MapPin className="h-4 w-4 shrink-0 text-brass" strokeWidth={1.75} aria-hidden="true" />
        {address.label}
      </p>

      <div className="mt-6">
        <Suspense fallback={<MapPlaceholder />}>
          <BuildingMap
            lat={address.lat}
            lon={address.lon}
            addressLabel={address.label}
            selection={selection}
            onSelect={setSelection}
          />
        </Suspense>

      </div>

      {/* La fenêtre est rendue hors du conteneur de la carte : elle couvre la
          page entière, pas seulement la vue aérienne. */}
      <AnimatePresence>
        {selection ? (
          <BuildingConfirmModal
            key="confirmation"
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
    <div className="flex h-[62vh] max-h-[560px] min-h-[340px] w-full items-center justify-center overflow-hidden rounded-2xl border border-ink/10 bg-ink shadow-[0_22px_54px_-18px_rgba(16,20,28,0.45)] sm:h-[480px]">
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
