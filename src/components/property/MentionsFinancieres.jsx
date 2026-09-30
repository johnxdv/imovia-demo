import { formatEuros } from '../../lib/format'
import { PlanDivider } from '../ui/PlanDivider'

// Qui supporte les honoraires, tel que le transmet Modelo (`honoraires_charges`).
const CIBLES_HONORAIRES = {
  vendeur: 'du vendeur',
  acquereur: "de l'acquéreur",
  locataire: 'du locataire',
  'les-deux': 'partagée entre le vendeur et l’acquéreur',
}

/**
 * Une ligne du tableau, ou `null` quand le montant est absent — c'est ce `null`
 * qui fait disparaître la ligne plutôt que d'afficher « 0 € » ou « — ».
 */
function ligne(libelle, montant, suffixe = '') {
  const valeur = formatEuros(montant)
  return valeur ? { libelle, valeur: `${valeur}${suffixe}` } : null
}

/**
 * Conditions financières du bien — rubrique dédiée, entièrement construite à
 * partir des champs du flux Modelo (`finances`, voir `scripts/_lib/modelo.mjs`).
 *
 * Ces montants figuraient jusqu'ici noyés dans le texte commercial, parce que
 * Modelo les recopie en fin de `description`. L'import les en retire désormais
 * (`sansMentionsRegenerees`) et ce bloc les présente lisiblement, à leur place :
 * après les diagnostics énergétiques.
 *
 * Aucun montant n'est écrit en dur ni déduit. Une donnée absente fait
 * disparaître sa ligne ; toutes absentes, le bloc entier ne s'affiche pas.
 *
 * @param {object|null} finances Bloc `finances` du bien.
 */
export function MentionsFinancieres({ finances }) {
  if (!finances) return null

  const location = finances.typeTransaction === 'location'

  // Le libellé qualitatif des charges (« forfaitaires », « régularisation
  // annuelle ») n'existe dans aucun champ structuré : il ne vient que de
  // `charges_type`. Il décide de l'intitulé de la ligne — des charges
  // forfaitaires ne sont pas une provision — et de la note sous le tableau.
  const libelleCharges = finances.chargesLibelle ?? ''
  const forfaitaires = /forfaitaire/i.test(libelleCharges)
  const regularisation = /r[ée]gularisation/i.test(libelleCharges)

  const lignes = (
    location
      ? [
          ligne('Loyer de base', finances.loyerBase, ' / mois'),
          ligne(
            forfaitaires ? 'Charges forfaitaires' : 'Provision sur charges',
            finances.charges,
            ' / mois',
          ),
          ligne('Dépôt de garantie', finances.depotGarantie),
          ligne('Honoraires à la charge du locataire', finances.honorairesLocataire),
          ligne('… dont état des lieux', finances.honorairesEtatLieux),
          ligne('… dont visite et constitution du dossier', finances.honorairesVisiteDossier),
        ]
      : [
          ligne('Prix hors honoraires', finances.prixHorsHonorairesAcquereur),
          ligne('Honoraires à la charge de l’acquéreur', finances.honorairesAcquereur),
          ligne('Frais de notaire estimés', finances.fraisNotaire),
          ligne('Taxe foncière annuelle', finances.taxeFonciere),
        ]
  ).filter(Boolean)

  const cible = CIBLES_HONORAIRES[finances.honorairesCharge]

  const notes = [
    cible && !location ? `Honoraires à la charge ${cible}.` : null,
    finances.charges != null && regularisation
      ? 'Les charges sont versées sous forme de provision, avec régularisation annuelle.'
      : null,
    finances.charges != null && forfaitaires ? 'Les charges sont forfaitaires.' : null,
  ].filter(Boolean)

  if (lignes.length === 0 && notes.length === 0) return null

  return (
    <div>
      <h2 className="text-left font-display text-xl font-semibold text-ink sm:text-2xl">
        Conditions financières
      </h2>
      <PlanDivider className="mb-8 mt-4" />

      <dl className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
        {lignes.map(({ libelle, valeur }) => (
          <div
            key={libelle}
            className="flex items-center justify-between gap-4 border-b border-ink/10 py-3.5"
          >
            <dt className="font-mono text-[0.68rem] uppercase tracking-micro text-ink/50">
              {libelle}
            </dt>
            <dd className="whitespace-nowrap font-mono text-sm text-ink">{valeur}</dd>
          </div>
        ))}
      </dl>

      {notes.length ? (
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-ink/70">{notes.join(' ')}</p>
      ) : null}
    </div>
  )
}
