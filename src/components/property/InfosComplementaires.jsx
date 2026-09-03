import { formatEuros } from '../../lib/format'

/**
 * Bloc réglementaire « Informations complémentaires » — un paragraphe continu,
 * entièrement généré depuis les données du bien. Chaque props est
 * indépendante et facultative : un champ manquant, vide ou à zéro est
 * simplement omis de la phrase, jamais affiché comme « undefined »/« null »/0.
 *
 * Les classes DPE/GES et l'estimation des dépenses énergétiques sont portées
 * par le composant dédié `EnergyDiagnostic` (diagnostics réglementaires,
 * juste au-dessus) — pas de doublon ici.
 *
 * Prêt pour la passerelle Modelo (hors périmètre actuel) : il suffira de
 * fournir ces mêmes props depuis les données de synchronisation réelles.
 *
 * @param {'vendeur'|'acquereur'|null} honorairesCharge
 * @param {{ nombreLots?: number, budgetPrevisionnelAnnuel?: number, procedureEnCours?: boolean, procedureDescription?: string|null }|null} copropriete
 *   `null`/absent pour un bien hors copropriété (maison individuelle, terrain…) : le bloc copropriété est alors masqué.
 */
export function InfosComplementaires({ honorairesCharge, copropriete }) {
  const phrases = []

  if (honorairesCharge === 'vendeur' || honorairesCharge === 'acquereur') {
    const cible = honorairesCharge === 'vendeur' ? 'du vendeur' : "de l'acquéreur"
    phrases.push(`Honoraires à la charge ${cible}.`)
  }

  const nombreLots = copropriete?.nombreLots
  if (copropriete && Number.isFinite(nombreLots) && nombreLots > 0) {
    phrases.push(`Bien soumis au statut de la copropriété comprenant ${nombreLots} lots.`)

    const budget = formatEuros(copropriete.budgetPrevisionnelAnnuel)
    if (budget) {
      phrases.push(`Quote-part moyenne du budget prévisionnel : ${budget} par an.`)
    }

    phrases.push(
      copropriete.procedureEnCours
        ? `Une procédure est en cours${
            copropriete.procedureDescription ? ` (${copropriete.procedureDescription})` : ''
          }.`
        : 'Aucune procédure en cours.',
    )
  }

  return (
    <p className="max-w-3xl text-base leading-relaxed text-ink/75">
      {phrases.length ? `${phrases.join(' ')} ` : null}
      Les informations sur les risques auxquels ce bien est exposé sont disponibles sur le site
      Géorisques :{' '}
      <a
        href="https://www.georisques.gouv.fr"
        target="_blank"
        rel="noreferrer noopener"
        className="text-brass underline underline-offset-2 hover:text-brass/80"
      >
        www.georisques.gouv.fr
      </a>
      .
    </p>
  )
}
