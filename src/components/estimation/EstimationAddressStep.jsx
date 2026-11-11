import { useEffect, useState } from 'react'
import { Check, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AddressAutocomplete } from './AddressAutocomplete'
import { StepBackLink } from './StepBackLink'
import { agency } from '../../data/agency'

/**
 * Délai entre le choix dans la liste et le passage à la carte. Assez court pour
 * rester ressenti comme immédiat, assez long pour que la pastille « Adresse
 * confirmée » soit vue : sans elle, l'écran changerait sans que l'utilisateur
 * sache ce qui a été retenu.
 *
 * Ramené de 550 à 260 ms avec le reste des temps morts du parcours : la
 * pastille s'aperçoit encore — elle paraît en même temps que le panneau
 * commence à sortir — et l'enchaînement cesse d'être une attente.
 */
const HANDOFF_DELAY_MS = 260

/**
 * Étape 2 — saisie de l'adresse du bien.
 *
 * Choisir une proposition suffit : aucune validation supplémentaire n'est
 * demandée, `onConfirm` enchaîne sur l'étape carte. Une adresse sans
 * coordonnées ne peut pas être cartographiée — cas théorique avec la BAN, mais
 * l'écran reste alors sur la confirmation plutôt que d'ouvrir une carte vide.
 *
 * L'ADRESSE SAISIE À LA MAIN NE PEUT PAS ÊTRE ESTIMÉE EN LIGNE, ET C'EST DIT
 *
 * Quand les deux géocodeurs sont en panne, le champ laisse poursuivre avec le
 * texte saisi (voir `AddressAutocomplete`). Cette adresse n'a aucune
 * coordonnée, et tout l'aval en dépend : la carte s'y centre, le bâti s'y
 * charge, et `api/estimation.js` refuse une requête sans `lat`/`lon` — la
 * parcelle, la commune et les ventes voisines s'y lisent. Il n'y a donc pas
 * d'estimation automatique à rendre, et en promettre une serait un mensonge de
 * deux écrans.
 *
 * Ce que l'écran fait à la place : il garde l'adresse à l'affichage et oriente
 * vers une estimation faite par l'agence. Le visiteur n'est pas renvoyé à un
 * champ qui ne marche pas.
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
    // Le retour reste au-dessus du panneau, en tête de colonne (voir
    // `StepBackLink`).
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

        {address?.manuelle ? (
          <div role="status" className="panneau-interne mt-4 px-5 py-6 text-center sm:px-7">
            <p className="text-[0.95rem] leading-relaxed text-ink/75">
              Sans la recherche d’adresse, nous ne pouvons pas situer votre bien sur la carte —
              et c’est de cet emplacement que vient l’estimation. Plutôt qu’un montant
              approximatif, nous préférons le faire à la main.
            </p>

            <a
              href={agency.phoneHref}
              className="bouton-tunnel mt-6 flex w-full items-center justify-center gap-2.5 px-6 py-4"
            >
              <Phone className="h-4 w-4 text-white" strokeWidth={2} aria-hidden="true" />
              <span className="text-[0.95rem] font-semibold">{agency.phone}</span>
            </a>

            <p className="mt-4 text-[0.82rem] leading-relaxed text-ink/60">
              ou{' '}
              <Link to="/contact" className="text-laiton-texte underline-offset-4 hover:underline">
                demandez à être rappelé
              </Link>
              . La recherche d’adresse revient d’elle-même dès que le service public est rétabli.
            </p>
          </div>
        ) : address && !mappable ? (
          <p role="status" className="mt-4 text-center text-base text-ink/60">
            Cette adresse n’est pas localisable sur la carte. Essayez une adresse voisine.
          </p>
        ) : null}
      </div>
    </div>
  )
}
