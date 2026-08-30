import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { allProperties, distinctValues } from '../../lib/properties'

const typesBien = distinctValues(allProperties, 'typeBien')
const villes = distinctValues(allProperties, 'ville')

const fieldClass =
  'w-full appearance-none border-0 border-b border-brass/30 bg-transparent px-0 py-2.5 font-sans text-sm text-stone placeholder:text-stone/40 focus:border-brass focus:outline-none focus:ring-0'

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-mono text-[0.62rem] uppercase tracking-micro text-stone/50">{label}</span>
      {children}
    </label>
  )
}

/**
 * Barre de recherche intégrée au hero. Compose une requête et redirige vers
 * la page Acheter ou Louer avec les critères pré-appliqués.
 */
export function SearchBar() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    transaction: 'vente',
    typeBien: '',
    ville: '',
    budgetMax: '',
    surfaceMin: '',
  })

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (form.typeBien) params.set('type', form.typeBien)
    if (form.ville) params.set('ville', form.ville)
    if (form.budgetMax) params.set('budgetMax', form.budgetMax)
    if (form.surfaceMin) params.set('surfaceMin', form.surfaceMin)
    // « Neuf » n'est pas une transaction du flux : on l'oriente vers l'achat.
    const base = form.transaction === 'location' ? '/louer' : '/acheter'
    const qs = params.toString()
    navigate(qs ? `${base}?${qs}` : base)
  }

  return (
    <form
      onSubmit={submit}
      className="border border-brass/25 bg-ink/70 p-5 backdrop-blur-md sm:p-6"
      aria-label="Rechercher un bien"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
        <Field label="Transaction">
          <select className={fieldClass} value={form.transaction} onChange={update('transaction')}>
            <option value="vente">Vente</option>
            <option value="location">Location</option>
            <option value="neuf">Neuf</option>
          </select>
        </Field>

        <Field label="Type de bien">
          <select className={fieldClass} value={form.typeBien} onChange={update('typeBien')}>
            <option value="">Tous</option>
            {typesBien.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Localisation">
          <select className={fieldClass} value={form.ville} onChange={update('ville')}>
            <option value="">Toutes</option>
            {villes.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Budget max (€)">
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="10000"
            placeholder="Indifférent"
            className={`${fieldClass} font-mono`}
            value={form.budgetMax}
            onChange={update('budgetMax')}
          />
        </Field>

        <Field label="Surface min (m²)">
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="5"
            placeholder="Indifférent"
            className={`${fieldClass} font-mono`}
            value={form.surfaceMin}
            onChange={update('surfaceMin')}
          />
        </Field>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2.5 bg-brass px-8 py-3.5 font-mono text-[0.72rem] uppercase tracking-micro text-ink transition-colors duration-300 ease-plan hover:bg-brass/90"
        >
          <Search className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          Rechercher
        </button>
      </div>
    </form>
  )
}
