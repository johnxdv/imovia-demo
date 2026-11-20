// Ce qu'une fiche de bien annonce d'elle-même : titre, prix, résumé,
// méta-description.
//
// PARTAGÉ ENTRE LE PRÉRENDU ET L'APPLICATION, et c'est tout l'intérêt du
// fichier. Le prérendu écrit ces valeurs dans le HTML brut ; `PropertyDetail`
// les repose au montage, parce qu'une navigation interne ne recharge pas le
// document. Quand les deux avaient chacun leur formule, le HTML annonçait
// « Appartement à louer à Hambach — 40 m², 500 € / mois » et l'application
// « Appartement à louer Hambach » — Google, qui exécute le JavaScript, retenait
// le second, c'est-à-dire celui où ne figurent ni la surface ni le prix.
//
// Les bornes de 140 à 160 caractères et le garde-fou qui les fait respecter
// sont documentés dans `scripts/_lib/pages-biens.mjs`.

const DESCRIPTION_MIN = 140
const DESCRIPTION_MAX = 160

export const surfaceM2 = (b) =>
  Number.isFinite(Number(b?.surface)) ? `${Number(b.surface).toFixed(0)} m²` : null

const transactionMot = (b) => (b?.typeTransaction === 'location' ? 'à louer' : 'à vendre')

/** Prix d'un bien tel que le site l'affiche, ou `null`. */
export function prixLisible(bien) {
  const montant = bien?.typeTransaction === 'location' ? bien?.loyer : (bien?.prixVente ?? bien?.prix)
  if (!Number.isFinite(Number(montant))) return null

  const formate = new Intl.NumberFormat('fr-FR').format(Math.round(Number(montant)))
  return bien.typeTransaction === 'location' ? `${formate} € / mois` : `${formate} €`
}

/** Ligne descriptive d'un bien — type, commune, surface, pièces. */
export function resumeBien(bien) {
  const surface = Number.isFinite(Number(bien?.surface))
    ? `${String(Number(bien.surface).toFixed(0))} m²`
    : null

  return [bien?.typeBien, bien?.ville, surface, bien?.pieces ? `${bien.pieces} pièces` : null]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Titre de la fiche : type de bien, commune, surface, prix.
 *
 * La marque n'est ajoutée que si le titre tient encore en dessous de
 * soixante-cinq caractères. Au-delà, une page de résultats coupe la fin — et
 * la fin, ici, c'est le prix.
 */
export function titreBien(bien, marque) {
  const morceaux = [
    `${bien.typeBien} ${transactionMot(bien)} à ${bien.ville}`,
    [surfaceM2(bien), prixLisible(bien)].filter(Boolean).join(', '),
  ].filter(Boolean)

  const base = morceaux.join(' — ')
  return base.length + marque.length + 3 <= 65 ? `${base} — ${marque}` : base
}

/**
 * Texte brut d'une description de flux, débarrassé de sa mise en forme.
 *
 * Les descriptions Modelo arrivent avec des retours à la ligne, des puces et
 * des blocs de mentions légales. Une méta-description n'en garde que de la
 * prose continue.
 */
export function prose(texte) {
  return String(texte ?? '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/^[-•\s]+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Méta-description de 140 à 160 caractères, bâtie sur les faits de la fiche.
 *
 * L'en-tête factuel ne suffit jamais à lui seul à atteindre le plancher : on
 * complète avec la description du bien, coupée au mot. Si l'annonce est trop
 * avare pour y parvenir, une invitation à visiter — vraie, et la même pour
 * tous — termine la ligne. Rien n'y est inventé sur le bien lui-même.
 */
export function descriptionBien(bien, agency) {
  const faits = [
    `${bien.typeBien} ${transactionMot(bien)} à ${bien.ville} (${bien.codePostal})`,
    [surfaceM2(bien), bien.pieces ? `${bien.pieces} pièces` : null, prixLisible(bien)]
      .filter(Boolean)
      .join(', '),
  ]
    .filter(Boolean)
    .join(' : ')

  let texte = `${faits}.`

  const suite = prose(bien.descriptionLongue ?? bien.descriptionCourte ?? '')
  for (const mot of suite.split(' ')) {
    if (!mot) continue
    if (`${texte} ${mot}`.length > DESCRIPTION_MAX) break
    texte = `${texte} ${mot}`
  }

  if (texte.length < DESCRIPTION_MIN) {
    for (const mot of `Visite sur rendez-vous avec ${agency.name}, ${agency.address.line2.replace(/^\d+\s*/, '')}.`.split(' ')) {
      if (`${texte} ${mot}`.length > DESCRIPTION_MAX) break
      texte = `${texte} ${mot}`
    }
  }

  // Une coupe au mot peut laisser une virgule ou un tiret en bout de ligne.
  return texte.replace(/[\s,;:—-]+$/, '').trim()
}

