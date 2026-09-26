import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { AddressAutocomplete } from './AddressAutocomplete'
import { StepBackLink } from './StepBackLink'

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
 * L'écran n'a plus d'illustration en tête : la villa qui s'y traçait à l'encre
 * a été retirée avec les autres dessins du parcours, le décor étant désormais la
 * scène 3D du fond (voir `DroneScene`) — où, à cette étape précisément, les murs
 * du bien montent à mi-hauteur.
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
    // Le retour reste HORS du panneau : `.panneau-verre` porte un
    // `backdrop-filter`, et un tel filtre fait du panneau le bloc conteneur de
    // ses descendants `fixed` — le lien s'y retrouverait ancré au panneau plutôt
    // qu'au coin de la fenêtre.
    <div className="w-full max-w-2xl">
      {onBack ? <StepBackLink onClick={onBack}>Retour</StepBackLink> : null}

      <div className="panneau-verre p-7 sm:p-9">
        <h1 className="titre-etape text-center text-[1.75rem] leading-tight text-ink sm:text-[2.1rem]">
          Où se situe votre bien&nbsp;?
        </h1>
        <p className="mx-auto mt-4 max-w-md text-center text-[1rem] leading-relaxed text-ink/70">
          Commencez à saisir l’adresse, puis choisissez-la dans la liste.
        </p>

        <div className="mt-8 lg:mt-10">
          <AddressAutocomplete onSelect={setAddress} autoFocus />
        </div>

        {address ? (
          <div
            role="status"
            className="panneau-interne mt-6 flex items-start gap-3 px-4 py-4 text-left sm:px-5"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bottle">
              <Check className="h-3 w-3 text-white" strokeWidth={3} aria-hidden="true" />
            </span>
            <span>
              <span className="block font-mono text-[0.62rem] uppercase tracking-micro text-bottle">
                Adresse confirmée
              </span>
              <span className="mt-1.5 block text-[0.95rem] leading-relaxed text-ink/75">
                {address.label}
              </span>
            </span>
          </div>
        ) : null}

        {address && !mappable ? (
          <p role="status" className="mt-4 text-center text-base text-ink/60">
            Cette adresse n’est pas localisable sur la carte. Essayez une adresse voisine.
          </p>
        ) : null}
      </div>
    </div>
  )
}
