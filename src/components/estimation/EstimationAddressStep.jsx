import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { AddressAutocomplete } from './AddressAutocomplete'
import { MaisonArchitecte } from './MaisonArchitecte'
import { StepBackLink } from './StepBackLink'

/**
 * Durée du tracé de la maison, en secondes — plafond posé par la maquette.
 * Au-delà, le dessin courrait encore quand l'utilisateur a déjà saisi son
 * adresse ; en deçà, la plume ne se voit plus courir.
 */
const TRACE_S = 5

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
 * En tête d'écran, une villa d'architecte se trace à l'encre
 * ([`MaisonArchitecte`](./MaisonArchitecte.jsx)) — piscine et pins de luxe
 * compris. Une seule image, tracée une seule fois : rien ne boucle sur cet
 * écran, rien ne clignote — c'est un écran de saisie, et tout mouvement répété
 * y disputerait l'attention au champ.
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
    <div className="w-full max-w-2xl">
      {onBack ? <StepBackLink onClick={onBack}>Retour</StepBackLink> : null}

      {/* **Dans le flux, au-dessus du titre — et non en fond derrière lui.**
          Les versions précédentes posaient le dessin en absolu sur toute la
          hauteur du bloc : il passait alors derrière le champ de saisie, et
          derrière la liste de suggestions qui en déborde, au moment précis où
          l'utilisateur a besoin de les lire. Aucun réglage de hauteur ne rend
          ça sûr — le bloc change de taille quand la pastille « Adresse
          confirmée » apparaît, et le titre ne se replie pas au même endroit
          selon le gabarit. Le remettre dans le flux, lui, le garantit par
          construction : ce qui suit commence là où il finit.

          Les proportions viennent de la `viewBox` (`aspect-[300/152]`), si
          bien qu'une seule largeur suffit à le dimensionner partout. Elle a été
          reprise d'un cran (11 → 12,5 rem) : le dessin est devenu une villa
          détaillée là où il était une maisonnette de dix-huit traits, et une
          baie à meneaux ou une couronne de pin ne se lisent plus en dessous de
          cette taille. */}
      <MaisonArchitecte
        duree={TRACE_S}
        className="mx-auto mb-5 aspect-[300/152] w-[12.5rem] text-ink/60 sm:w-[15.25rem]"
      />

      <h1 className="titre-etape text-center text-[1.75rem] leading-tight text-ink sm:text-[2.1rem]">
        Où se situe votre bien&nbsp;?
      </h1>
      <p className="mx-auto mt-4 max-w-md text-center font-display text-[1.02rem] leading-relaxed text-ink/60">
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
  )
}
