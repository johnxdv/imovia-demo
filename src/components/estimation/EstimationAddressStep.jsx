import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { AddressAutocomplete } from './AddressAutocomplete'
import { InkScene } from './InkScene'
import { StepBackLink } from './StepBackLink'
import { INK_VILLA } from '../../data/inkScenes'

/**
 * Durée du tracé de la demeure, en secondes — plafond posé par la maquette.
 * Au-delà, le dessin courrait encore quand l'utilisateur a déjà saisi son
 * adresse ; en deçà, la plume ne se voit plus courir.
 */
const TRACE_S = 6

/**
 * Délai entre le choix dans la liste et le passage à la carte. Assez court pour
 * rester ressenti comme immédiat, assez long pour que la pastille « Adresse
 * confirmée » soit vue : sans elle, l'écran changerait sans que l'utilisateur
 * sache ce qui a été retenu.
 */
const HANDOFF_DELAY_MS = 550

/**
 * Étape 2 — saisie de l'adresse du bien.
 *
 * Choisir une proposition suffit : aucune validation supplémentaire n'est
 * demandée, `onConfirm` enchaîne sur l'étape carte. Une adresse sans
 * coordonnées ne peut pas être cartographiée — cas théorique avec la BAN, mais
 * l'écran reste alors sur la confirmation plutôt que d'ouvrir une carte vide.
 *
 * Derrière le titre, une demeure d'architecte se trace à l'encre en six
 * secondes ([`INK_VILLA`](../../data/inkScenes.js)). Une seule image, tracée
 * une seule fois : rien ne boucle sur cet écran, rien ne clignote — c'est un
 * écran de saisie, et tout mouvement répété y disputerait l'attention au champ.
 */
export function EstimationAddressStep({ onBack, onConfirm }) {
  const [address, setAddress] = useState(null)

  const mappable =
    address !== null && Number.isFinite(address.lat) && Number.isFinite(address.lon)

  useEffect(() => {
    if (!mappable) return undefined

    const timer = setTimeout(() => onConfirm?.(address), HANDOFF_DELAY_MS)
    return () => clearTimeout(timer)
  }, [address, mappable, onConfirm])

  return (
    <div className="relative w-full max-w-2xl lg:max-w-[59rem]">
      {/* La demeure monte derrière le titre et sa ligne de sol tombe sous le
          champ : c'est le fond de l'écran, pas une vignette posée dessous.
          Le bloc prend les proportions exactes de la `viewBox`
          (`aspect-[400/148]`), si bien que le dessin le remplit au pixel près
          et que la même règle tient du téléphone au 27 pouces — sans hauteur
          ni décalage à régler par point de rupture.
          Non clippée à dessein : la liste de suggestions déborde du même
          conteneur, un `overflow-hidden` ici la couperait. Le contenu qui suit
          est en `z-10`, l'ordre de peinture ne dépend ainsi d'aucun contexte
          d'empilement extérieur. */}
      <InkScene
        scene={INK_VILLA}
        duration={TRACE_S}
        className="absolute inset-x-0 top-0 z-0 aspect-[400/148] w-full text-ink opacity-[0.2]"
      />

      <div className="relative z-10">
        {onBack ? <StepBackLink onClick={onBack}>Retour</StepBackLink> : null}

        <h1 className="text-center font-display text-[1.75rem] font-semibold leading-tight text-ink sm:text-[2.1rem] lg:text-[2.6rem]">
          Où se situe votre bien&nbsp;?
        </h1>
        <p className="mx-auto mt-4 max-w-md text-center font-display text-[1.02rem] leading-relaxed text-ink/60 lg:max-w-lg lg:text-[1.15rem]">
          Commencez à saisir l’adresse, puis choisissez-la dans la liste.
        </p>

        <div className="mt-8 lg:mt-10">
          <AddressAutocomplete onSelect={setAddress} autoFocus />
        </div>

        {address ? (
          <div
            role="status"
            className="mt-6 flex items-start gap-3 rounded-xl border border-bottle/20 bg-white/80 px-4 py-4 text-left shadow-sm shadow-ink/5 sm:px-5"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bottle">
              <Check className="h-3 w-3 text-white" strokeWidth={3} aria-hidden="true" />
            </span>
            <span>
              <span className="block font-mono text-[0.62rem] uppercase tracking-micro text-bottle">
                Adresse confirmée
              </span>
              <span className="mt-1.5 block font-display text-[0.98rem] leading-relaxed text-ink/75">
                {address.label}
              </span>
            </span>
          </div>
        ) : null}

        {address && !mappable ? (
          <p role="status" className="mt-4 text-center font-display text-base text-ink/50">
            Cette adresse n’est pas localisable sur la carte. Essayez une adresse voisine.
          </p>
        ) : null}
      </div>
    </div>
  )
}
