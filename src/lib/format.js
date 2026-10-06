// Utilitaires de formatage — pensés pour un rendu « données techniques »
// cohérent (chiffres tabulaires, séparateurs français).

const eur = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

const num = new Intl.NumberFormat('fr-FR')

/**
 * Prix formaté. En location, on suffixe « /mois ».
 */
export function formatPrice(prix, typeTransaction) {
  if (prix == null) return 'Prix sur demande'
  const base = eur.format(prix)
  return typeTransaction === 'location' ? `${base} /mois` : base
}

export function formatSurface(surface) {
  if (surface == null) return '—'
  return `${num.format(surface)} m²`
}

/**
 * Intitulé de carte où la commune est détachée par un tiret : « Terrain à
 * vendre Saint-Avold » devient « Terrain à vendre – Saint-Avold ».
 *
 * Purement typographique : on ne touche au titre que lorsqu'il se termine
 * exactement par le nom de la commune. Sinon il est rendu tel que le flux
 * Modelo l'a transmis — aucun mot n'est ajouté, retiré ni réécrit.
 */
export function titreAvecCommune(titre, ville) {
  if (!titre || !ville) return titre
  const suffixe = ` ${ville}`
  if (!titre.endsWith(suffixe) || titre.length === suffixe.length) return titre
  return `${titre.slice(0, -suffixe.length)} \u2013 ${ville}`
}

export function formatNumber(n) {
  return num.format(n)
}

/**
 * Montant en euros, ou `null` si absent/invalide — jamais « 0 € » ni « NaN € ».
 * Au consommateur de masquer le champ concerné quand `null` est renvoyé.
 */
export function formatEuros(amount) {
  if (amount == null || Number.isNaN(Number(amount)) || Number(amount) <= 0) return null
  return eur.format(amount)
}

/**
 * Liste d'années à la française : « 2021 », « 2021 et 2022 », « 2021, 2022 et 2023 ».
 */
export function formatAnnees(annees) {
  if (!Array.isArray(annees) || annees.length === 0) return null
  if (annees.length === 1) return String(annees[0])
  return `${annees.slice(0, -1).join(', ')} et ${annees[annees.length - 1]}`
}

/**
 * Résout une photo en URL.
 * - Si la valeur est déjà une URL absolue (flux XML réel) ou un chemin servi
 *   depuis `public/`, on la renvoie telle quelle.
 * - Sinon on la traite comme un identifiant Unsplash et on compose une URL optimisée
 *   (format automatique, recadrage, largeur et qualité maîtrisées).
 */
export function photoUrl(photo, { w = 1200, q = 70 } = {}) {
  if (!photo) return ''
  if (photo.startsWith('http') || photo.startsWith('/')) return photo
  return `https://images.unsplash.com/photo-${photo}?auto=format&fit=crop&w=${w}&q=${q}`
}

/**
 * srcSet responsive pour une photo Unsplash.
 */
export function photoSrcSet(photo, widths = [480, 768, 1200, 1800]) {
  if (!photo || photo.startsWith('http') || photo.startsWith('/')) return undefined
  return widths.map((w) => `${photoUrl(photo, { w })} ${w}w`).join(', ')
}

/**
 * Photo du dossier `public/`, déclinée à l'avance en plusieurs largeurs sous le
 * nom `<base>-<largeur>.jpg`. Renvoie le couple `src` / `srcSet` à poser tel
 * quel sur une balise `<img>` : le navigateur choisit la largeur utile, et le
 * recadrage reste l'affaire du `object-cover` côté CSS — jamais d'étirement.
 */
export function localPhoto(base, widths) {
  const ordered = [...widths].sort((a, b) => a - b)
  return {
    src: `${base}-${ordered[ordered.length - 1]}.jpg`,
    srcSet: ordered.map((w) => `${base}-${w}.jpg ${w}w`).join(', '),
  }
}

export const DPE_SCALE = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
