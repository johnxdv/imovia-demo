import { useCallback } from 'react'
import { ArrowLeft, MapPin } from 'lucide-react'
import { BuildingConfirmModal } from './BuildingConfirmModal'

/**
 * Étape 3 — variante monégasque : déclaration du type de bien et de la surface.
 *
 * Se substitue à `EstimationBuildingStep` lorsque l'adresse retenue est celle
 * de la Principauté. Il n'y a ici ni photo aérienne, ni emprise à cliquer : le
 * cadastre IGN s'arrête à la frontière et aucun contour de bâtiment n'existe
 * (voir `src/lib/monaco.js`). Rien non plus à détecter automatiquement — d'où
 * le choix du type demandé de front, dans la fenêtre elle-même.
 *
 * La fenêtre de surface est celle du parcours français, à l'identique : mêmes
 * bornes, même curseur, même illustration. Seuls changent son prix au m² (une
 * constante, plutôt qu'une médiane de ventes voisines) et le choix de type
 * qu'elle affiche en tête.
 *
 * Ouverte d'emblée et sans rien derrière elle : la carte n'existant pas, cette
 * étape n'a pas d'écran propre. « Modifier l'adresse » ramène donc à la saisie,
 * là où le parcours français reviendrait à la vue aérienne.
 */
export function EstimationMonacoStep({ address, onBack, onEstimate, onProgress }) {
  const startEstimate = useCallback(
    (surfaceM2, type) => {
      onProgress?.(1)
      onEstimate?.({
        ...address,
        monaco: true,
        kind: 'batiment',
        surfaceM2,
        type,
        // Aucune base ne décrit le bâti monégasque : ces champs, que le moteur
        // lit pour le parcours français, n'ont ici rien à recevoir.
        areaM2: null,
        parcelle: null,
        fiche: null,
        properties: null,
      })
    },
    [address, onEstimate, onProgress],
  )

  return (
    <div className="w-full max-w-xl">
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
        Votre bien à Monaco
      </h1>
      <p className="mx-auto mt-4 max-w-md text-center text-[0.95rem] leading-relaxed text-ink/55">
        Indiquez son type et sa surface pour obtenir un ordre de grandeur.
      </p>

      <p className="mx-auto mt-6 flex max-w-xl items-center justify-center gap-2.5 rounded-full border border-ink/10 bg-white px-4 py-2.5 text-center text-[0.8rem] leading-snug text-ink/70 sm:text-sm">
        <MapPin className="h-4 w-4 shrink-0 text-brass" strokeWidth={1.75} aria-hidden="true" />
        {address.label}
      </p>

      <BuildingConfirmModal monaco selection={address} onEstimate={startEstimate} onClose={onBack} />
    </div>
  )
}
