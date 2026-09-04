import { useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { AddressAutocomplete } from './AddressAutocomplete'

/**
 * Étape 2 — saisie de l'adresse du bien.
 * Le parcours s'arrête volontairement à l'adresse confirmée : la sélection du
 * bâtiment sur carte et le calcul d'estimation feront l'objet d'un lot suivant.
 */
export function EstimationAddressStep({ onBack }) {
  const [address, setAddress] = useState(null)

  return (
    <div className="w-full max-w-xl">
      {onBack ? (
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
          Retour
        </button>
      ) : null}

      <h1 className="text-center font-display text-[1.6rem] font-semibold leading-tight text-ink sm:text-[2rem]">
        Où se situe votre bien&nbsp;?
      </h1>
      <p className="mx-auto mt-4 max-w-md text-center text-[0.95rem] leading-relaxed text-ink/55">
        Commencez à saisir l’adresse, puis choisissez-la dans la liste.
      </p>

      <div className="mt-8">
        <AddressAutocomplete onSelect={setAddress} autoFocus />
      </div>

      {address ? (
        <div
          role="status"
          className="mt-6 flex items-start gap-3 rounded-xl border border-bottle/20 bg-bottle/5 px-4 py-4 text-left sm:px-5"
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bottle">
            <Check className="h-3 w-3 text-white" strokeWidth={3} aria-hidden="true" />
          </span>
          <span>
            <span className="block font-mono text-[0.62rem] uppercase tracking-micro text-bottle">
              Adresse confirmée
            </span>
            <span className="mt-1.5 block text-sm leading-relaxed text-ink/75">{address.label}</span>
          </span>
        </div>
      ) : null}
    </div>
  )
}
