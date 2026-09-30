import { DPE_SCALE, formatAnnees, formatEuros, formatNumber } from '../../lib/format'
import { PlanDivider } from '../ui/PlanDivider'

// Couleurs réglementaires de l'étiquette ÉNERGIE — dégradé vert → rouge, A à G.
// Volontairement en dehors de la charte IMMOVIA : la conformité prime ici sur
// l'identité visuelle.
const ENERGIE_COULEURS = {
  A: '#0F9B4F',
  B: '#4CB648',
  C: '#A4CE4E',
  D: '#F6EB14',
  E: '#F6A80E',
  F: '#EC6C24',
  G: '#E0181E',
}

// Couleurs de l'étiquette CLIMAT (GES). L'étiquette climat a sa propre
// progression — bleu clair vers bleu-violet foncé — et surtout PAS le vert →
// rouge de l'énergie : une classe GES G n'est pas « rouge », et reprendre la
// palette énergie ferait lire deux échelles différentes comme une seule.
const CLIMAT_COULEURS = {
  A: '#DCE9F5',
  B: '#BBD3EC',
  C: '#98BCE2',
  D: '#6F9FD3',
  E: '#4C7FC0',
  F: '#3A5CA8',
  G: '#2E3D8C',
}

// Texte lisible selon la teinte du bandeau : les teintes claires prennent un
// texte sombre plutôt que blanc.
const ENERGIE_TEXTE = { A: '#fff', B: '#fff', C: '#10141C', D: '#10141C', E: '#10141C', F: '#fff', G: '#fff' }
const CLIMAT_TEXTE = { A: '#10141C', B: '#10141C', C: '#10141C', D: '#fff', E: '#fff', F: '#fff', G: '#fff' }

// Largeur des barres, progressive de A (la plus courte) à G (la plus longue).
const LARGEURS = { A: 40, B: 51, C: 62, D: 73, E: 84, F: 92, G: 100 }

/** Repère triangulaire pointant la barre de la classe réelle. */
function Repere() {
  return (
    <svg
      viewBox="0 0 10 14"
      className="h-3.5 w-2.5 shrink-0 text-ink"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M10 0 L0 7 L10 14 Z" />
    </svg>
  )
}

function Barre({ lettre, active, couleurs, textes }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-7 shrink-0 items-center rounded-[2px] px-2.5 font-mono text-xs font-bold transition-opacity sm:h-8 sm:text-sm ${
          active ? '' : 'opacity-45'
        }`}
        style={{
          width: `${LARGEURS[lettre]}%`,
          backgroundColor: couleurs[lettre],
          color: textes[lettre],
          boxShadow: active ? 'inset 0 0 0 2px #10141C' : undefined,
        }}
      >
        {lettre}
      </div>
      {active ? (
        <span className="inline-flex shrink-0 items-center gap-1.5">
          <Repere />
          <span className="font-mono text-sm font-bold text-ink">{lettre}</span>
        </span>
      ) : null}
    </div>
  )
}

/**
 * Une échelle réglementaire complète. La classe réelle est repérée par une
 * flèche, jamais par un encadré portant la valeur : celle-ci est donnée sous le
 * graphique, séparément, comme le demande la lecture de l'étiquette.
 */
function Echelle({ titre, lettreActive, valeur, unite, couleurs, textes }) {
  return (
    <div className="w-full">
      <p className="mb-4 font-mono text-[0.68rem] uppercase tracking-micro text-ink/55">{titre}</p>
      <div
        className="space-y-1.5"
        role="img"
        aria-label={`${titre} — classe ${lettreActive} sur une échelle de A à G`}
      >
        {DPE_SCALE.map((lettre) => (
          <Barre
            key={lettre}
            lettre={lettre}
            active={lettre === lettreActive}
            couleurs={couleurs}
            textes={textes}
          />
        ))}
      </div>
      {valeur != null ? (
        <p className="mt-4 font-mono text-sm text-ink/70">
          <span className="font-semibold text-ink">{formatNumber(valeur)}</span> {unite}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Mention affichée quand aucune classe n'est disponible.
 *
 * Le libellé vient exclusivement de `dpe_etat` (flux Modelo) : « DPE en cours »
 * n'apparaît que si l'agence l'a effectivement déclaré ainsi. Un diagnostic
 * « à faire » n'est pas un diagnostic « en cours », et l'absence de classe ne
 * suffit à conclure ni l'un ni l'autre — sans état déclaré, rien ne s'affiche.
 */
const MENTIONS_ETAT = {
  'en-cours': 'Diagnostic de performance énergétique en cours de réalisation.',
  'a-faire': 'Diagnostic de performance énergétique non encore réalisé.',
  'non-requis': 'Bien non soumis au diagnostic de performance énergétique.',
}

/**
 * Diagnostics énergétiques réglementaires (DPE + GES) — un seul composant,
 * entièrement piloté par les données issues de la synchronisation Modelo.
 * Aucune classe n'est calculée ni déduite : uniquement les données transmises.
 *
 * @param {string|null} energyClass    Classe DPE A→G (ex. "D").
 * @param {number|null} energyValue    Consommation en kWh/m²/an (ex. 202).
 * @param {string|null} climateClass   Classe GES A→G (ex. "B").
 * @param {number|null} climateValue   Émissions en kg CO2eq/m²/an (ex. 7).
 * @param {'effectue'|'en-cours'|'a-faire'|'non-requis'|null} dpeEtat  Champ `dpe_etat` du flux.
 * @param {number|null} annualEnergyCostMin
 * @param {number|null} annualEnergyCostMax
 * @param {number[]|null} energyPriceReferenceYears
 */
export function EnergyDiagnostic({
  energyClass,
  energyValue,
  climateClass,
  climateValue,
  dpeEtat,
  annualEnergyCostMin,
  annualEnergyCostMax,
  energyPriceReferenceYears,
}) {
  const hasEnergy = Boolean(energyClass)
  const hasClimate = Boolean(climateClass)

  // Des données disponibles excluent toute mention d'état : on ne peut pas
  // annoncer un DPE « en cours » et en afficher la classe dans le même bloc.
  const mention = hasEnergy || hasClimate ? null : MENTIONS_ETAT[dpeEtat] ?? null
  if (!hasEnergy && !hasClimate && !mention) return null

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

      {mention ? <p className="text-base leading-relaxed text-ink/75">{mention}</p> : null}

      {hasEnergy || hasClimate ? (
        <div className="grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2">
          {hasEnergy ? (
            <Echelle
              titre="Consommation énergétique"
              lettreActive={energyClass}
              valeur={energyValue}
              unite="kWh/m²/an"
              couleurs={ENERGIE_COULEURS}
              textes={ENERGIE_TEXTE}
            />
          ) : null}
          {hasClimate ? (
            <Echelle
              titre="Émissions de gaz à effet de serre"
              lettreActive={climateClass}
              valeur={climateValue}
              unite="kg CO₂/m²/an"
              couleurs={CLIMAT_COULEURS}
              textes={CLIMAT_TEXTE}
            />
          ) : null}
        </div>
      ) : null}

      {/* Mention obligatoire pour les classes F et G (« passoires thermiques »). */}
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
