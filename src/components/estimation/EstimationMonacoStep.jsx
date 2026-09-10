import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, MapPin } from 'lucide-react'
// Même chargement à la demande que côté français : Leaflet ne sert qu'ici, et
// le module est préchargé dès l'étape adresse (voir la page Estimer).
const BuildingMap = lazy(() =>
  import('./BuildingMap').then((module) => ({ default: module.BuildingMap })),
)
import { BuildingConfirmModal } from './BuildingConfirmModal'

/**
 * Étape 3 — variante monégasque : repérage du bien, puis déclaration de son
 * type et de sa surface.
 *
 * Se substitue à `EstimationBuildingStep` lorsque l'adresse retenue est celle
 * de la Principauté. Le geste est le même qu'en France — on clique son
 * bâtiment sur la photo aérienne — mais rien derrière ne l'est :
 *
 * - Les contours viennent d'OpenStreetMap et non de la BD TOPO®, qui s'arrête
 *   à la frontière (voir `src/lib/osm.js`). Le fond orthophoto, lui, est
 *   partagé : l'IGN photographie la bande frontalière et la Principauté y
 *   tient tout entière.
 * - Aucune détection ne tourne en arrière-plan : ni cadastre où rattacher le
 *   bâtiment, ni BDNB où lire son parc de logements. Le type est donc demandé
 *   de front, dans la fenêtre elle-même.
 * - La fenêtre de surface s'ouvre pour tout repérage, bâtiment ou non. En
 *   France un clic libre vaut terrain, et sa contenance cadastrale dispense
 *   d'interroger l'utilisateur ; ici il n'y a pas de contenance à lire, et le
 *   curseur reste la seule source de surface.
 *
 * OpenStreetMap étant une base communautaire, une construction récente peut
 * n'y avoir aucun tracé. La carte prévoit déjà ce cas et bascule alors sur son
 * repli — l'utilisateur désigne l'emplacement de son bien à main levée, et le
 * parcours continue.
 */
export function EstimationMonacoStep({ address, onBack, onEstimate, onProgress }) {
  const [selection, setSelection] = useState(null)

  // Changer d'adresse (retour puis nouvelle saisie) doit repartir d'une carte vierge.
  useEffect(() => {
    setSelection(null)
  }, [address.id, address.lat, address.lon])

  // Avancement local remonté à la barre globale : la moitié dès qu'un bien est
  // repéré (fenêtre de surface ouverte), le reste au passage à l'étape suivante.
  useEffect(() => {
    onProgress?.(selection ? 0.5 : 0)
  }, [selection, onProgress])

  const startEstimate = useCallback(
    (surfaceM2, type, etage) => {
      onProgress?.(1)
      onEstimate?.({
        ...address,
        // Coordonnées du bâtiment cliqué plutôt que celles de l'adresse
        // géocodée : plus proches du bien, et sans conséquence sur le calcul,
        // qui ne dépend d'aucun découpage administratif en Principauté.
        lat: selection?.lat ?? address.lat,
        lon: selection?.lon ?? address.lon,
        monaco: true,
        kind: 'batiment',
        surfaceM2,
        type,
        // Déclaré dans la même fenêtre que la surface, dès lors que le type
        // retenu est « appartement » — l'essentiel du parc monégasque.
        etage: etage ?? null,
        // Le type n'est pas détecté ici mais déclaré : c'est la source la plus
        // sûre qui soit, et le journal doit pouvoir les distinguer.
        typeSource: 'declare',
        typeConfiance: 'haute',
        areaM2: selection?.areaM2 ?? null,
        // Aucune base ne décrit le bâti monégasque : ces champs, que le moteur
        // lit pour le parcours français, n'ont ici rien à recevoir. Les
        // attributs OpenStreetMap du bâtiment ne les remplacent pas — ils ne
        // viennent ni de la même source ni de la même méthode de levé, et le
        // moteur ne doit pas les confondre avec ceux de la BD TOPO®.
        parcelle: null,
        fiche: null,
        properties: null,
      })
    },
    [address, selection, onEstimate, onProgress],
  )

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
        Cliquez sur votre bien
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
            monaco
            lat={address.lat}
            lon={address.lon}
            addressLabel={address.label}
            selection={selection}
            onSelect={setSelection}
          />
        </Suspense>
      </div>

      {/* La fenêtre est rendue hors du conteneur de la carte : elle couvre la
          page entière, pas seulement la vue aérienne. Fermer la fenêtre ramène
          à la carte — et non à la saisie d'adresse, comme lorsque cette étape
          n'avait pas d'écran propre. */}
      <AnimatePresence>
        {selection ? (
          <BuildingConfirmModal
            key="surface"
            monaco
            selection={selection}
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
