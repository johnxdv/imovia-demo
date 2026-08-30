import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import { allProperties, distinctValues } from '../../lib/properties'

const typesBien = distinctValues(allProperties, 'typeBien')
const villes = distinctValues(allProperties, 'ville')

const fieldClass =
  'w-full appearance-none border-0 border-b border-brass/30 bg-transparent px-0 py-2.5 font-sans text-sm text-stone placeholder:text-stone/40 focus:border-brass focus:outline-none focus:ring-0'

// Description des champs — réutilisée par le mode pas-à-pas mobile.
const stepFields = [
  {
    key: 'transaction',
    label: 'Transaction',
    type: 'select',
    options: [
      { value: 'vente', label: 'Vente' },
      { value: 'location', label: 'Location' },
      { value: 'neuf', label: 'Neuf' },
    ],
  },
  {
    key: 'typeBien',
    label: 'Type de bien',
    type: 'select',
    options: [{ value: '', label: 'Tous' }, ...typesBien.map((t) => ({ value: t, label: t }))],
  },
  {
    key: 'ville',
    label: 'Localisation',
    type: 'select',
    options: [{ value: '', label: 'Toutes' }, ...villes.map((v) => ({ value: v, label: v }))],
  },
  { key: 'budgetMax', label: 'Budget max (€)', type: 'number', step: '10000', placeholder: 'Indifférent' },
  { key: 'surfaceMin', label: 'Surface min (m²)', type: 'number', step: '5', placeholder: 'Indifférent' },
]

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
 * Desktop : les 5 champs en grille. Mobile (< sm) : mode pas-à-pas, un champ
 * à la fois, pour ne pas occuper tout l'écran.
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
  const [step, setStep] = useState(0)

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

  const isLast = step === stepFields.length - 1
  const next = () => setStep((s) => Math.min(s + 1, stepFields.length - 1))
  const prev = () => setStep((s) => Math.max(s - 1, 0))
  const current = stepFields[step]

  const renderControl = (field) =>
    field.type === 'select' ? (
      <select className={fieldClass} value={form[field.key]} onChange={update(field.key)}>
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    ) : (
      <input
        type="number"
        inputMode="numeric"
        min="0"
        step={field.step}
        placeholder={field.placeholder}
        className={`${fieldClass} font-mono`}
        value={form[field.key]}
        onChange={update(field.key)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !isLast) {
            e.preventDefault()
            next()
          }
        }}
      />
    )

  return (
    <form
      onSubmit={submit}
      className="border border-brass/25 bg-ink/70 p-5 backdrop-blur-md sm:p-6"
      aria-label="Rechercher un bien"
    >
      {/* Desktop (≥ sm) — grille inchangée */}
      <div className="hidden sm:block">
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
      </div>

      {/* Mobile (< sm) — pas-à-pas : un champ à la fois */}
      <div className="sm:hidden">
        <div className="mb-5 flex items-center justify-between">
          <span className="font-mono text-[0.62rem] uppercase tracking-micro text-stone/50">
            Étape {step + 1} / {stepFields.length}
          </span>
          <div className="flex gap-1.5" aria-hidden="true">
            {stepFields.map((_, i) => (
              <span
                key={i}
                className={`h-1 w-5 transition-colors ${i === step ? 'bg-brass' : 'bg-stone/25'}`}
              />
            ))}
          </div>
        </div>

        <Field label={current.label}>{renderControl(current)}</Field>

        <div className="mt-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0}
            className="touch-manipulation font-mono text-[0.7rem] uppercase tracking-micro text-stone/70 transition-colors hover:text-brass disabled:pointer-events-none disabled:opacity-30"
          >
            Précédent
          </button>

          {isLast ? (
            <button
              type="submit"
              className="inline-flex touch-manipulation items-center justify-center gap-2.5 bg-brass px-6 py-3 font-mono text-[0.72rem] uppercase tracking-micro text-ink transition-colors duration-300 ease-plan hover:bg-brass/90"
            >
              <Search className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Rechercher
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="inline-flex touch-manipulation items-center gap-2 bg-brass px-6 py-3 font-mono text-[0.72rem] uppercase tracking-micro text-ink transition-colors duration-300 ease-plan hover:bg-brass/90"
            >
              Suivant
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
