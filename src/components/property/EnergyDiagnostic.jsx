import { DPE_SCALE, formatAnnees, formatEuros, formatNumber } from '../../lib/format'
import { PlanDivider } from '../ui/PlanDivider'

// Couleurs réglementaires strictes de l'étiquette DPE/GES française (dégradé
// vert → rouge, A à G). Volontairement en dehors de la charte IMMOVIA : la
// conformité prime ici sur l'identité visuelle. Les deux échelles (énergie et
// climat) partagent le même code couleur, comme sur l'étiquette officielle.
const SCALE_COLORS = {
  A: '#0F9B4F',
  B: '#4CB648',
  C: '#A4CE4E',
  D: '#F6EB14',
  E: '#F6A80E',
  F: '#EC6C24',
  G: '#E0181E',
}

// Texte lisible selon la teinte du bandeau (les teintes claires — C, D, E —
// prennent un texte sombre plutôt que blanc).
const TEXT_ON = { A: '#fff', B: '#fff', C: '#10141C', D: '#10141C', E: '#10141C', F: '#fff', G: '#fff' }

// Largeur des barres, progressive de A (la plus courte) à G (la plus longue).
const WIDTHS = { A: 40, B: 51, C: 62, D: 73, E: 84, F: 92, G: 100 }

function ScaleRow({ letter, isActive, activeValue }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-7 shrink-0 items-center rounded-[2px] px-2.5 font-mono text-xs font-bold sm:h-8 sm:text-sm"
        style={{ width: `${WIDTHS[letter]}%`, backgroundColor: SCALE_COLORS[letter], color: TEXT_ON[letter] }}
      >
        {letter}
      </div>
      {isActive ? (
        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap border-2 border-ink bg-white px-2 py-1 font-mono text-xs font-bold text-ink sm:text-sm">
          {formatNumber(activeValue)} {letter}
        </span>
      ) : null}
    </div>
  )
}

function Scale({ title, activeLetter, activeValue, unit }) {
  return (
    <div className="w-full" style={{ minHeight: 180 }}>
      <p className="mb-4 font-mono text-[0.68rem] uppercase tracking-micro text-ink/55">{title}</p>
      <div className="space-y-1.5">
        {DPE_SCALE.map((letter) => (
          <ScaleRow
            key={letter}
            letter={letter}
            isActive={letter === activeLetter}
            activeValue={activeValue}
          />
        ))}
      </div>
      {activeValue != null ? (
        <p className="mt-4 font-mono text-sm text-ink/70">
          {formatNumber(activeValue)} {unit}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Diagnostics énergétiques réglementaires (DPE + GES) — un seul composant,
 * entièrement piloté par des variables, prêt pour la passerelle Modelo.
 * Aucune classe n'est calculée ni déduite : uniquement les données transmises.
 *
 * @param {string|null} energyClass    Classe DPE A→G (ex. "E").
 * @param {number|null} energyValue    Consommation en kWh/m²/an (ex. 262).
 * @param {string|null} climateClass   Classe GES A→G (ex. "D").
 * @param {number|null} climateValue   Émissions en kg CO2eq/m²/an (ex. 46).
 * @param {number|null} annualEnergyCostMin
 * @param {number|null} annualEnergyCostMax
 * @param {number[]|null} energyPriceReferenceYears
 */
export function EnergyDiagnostic({
  energyClass,
  energyValue,
  climateClass,
  climateValue,
  annualEnergyCostMin,
  annualEnergyCostMax,
  energyPriceReferenceYears,
}) {
  const hasEnergy = Boolean(energyClass)
  const hasClimate = Boolean(climateClass)
  if (!hasEnergy && !hasClimate) return null

  const excessive = energyClass === 'F' || energyClass === 'G'
  const costMin = formatEuros(annualEnergyCostMin)
  const costMax = formatEuros(annualEnergyCostMax)
  const annees = formatAnnees(energyPriceReferenceYears)

  return (
    <div>
      <h2 className="text-left font-display text-xl font-semibold text-ink sm:text-2xl">
        Diagnostics énergétiques
      </h2>
      <PlanDivider className="mb-8 mt-4" />

      <div className="grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2">
        {hasEnergy ? (
          <Scale
            title="Consommation énergétique"
            activeLetter={energyClass}
            activeValue={energyValue}
            unit="kWh/m²/an"
          />
        ) : null}
        {hasClimate ? (
          <Scale
            title="Émissions de gaz à effet de serre"
            activeLetter={climateClass}
            activeValue={climateValue}
            unit="kg CO₂/m²/an"
          />
        ) : null}
      </div>

      {excessive ? (
        <p className="mt-8 inline-block border-2 border-ink bg-ink px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-micro text-white sm:text-sm">
          Logement à consommation énergétique excessive
        </p>
      ) : null}

      {costMin && costMax ? (
        <div className="mt-10">
          <h3 className="text-left font-display text-lg font-semibold text-ink">
            Estimation des dépenses énergétiques
          </h3>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink/75">
            Montant estimé des dépenses annuelles d’énergie pour un usage standard : entre {costMin} et{' '}
            {costMax} par an.
            {annees ? ` Prix moyens des énergies indexés sur les années ${annees} (abonnements compris).` : ''}
          </p>
        </div>
      ) : null}
    </div>
  )
}
