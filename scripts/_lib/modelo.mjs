// Traduction d'un `<bien>` Modelo vers le modèle de données Immovia.
//
// Règle unique, valable pour chaque champ : une balise absente, vide ou
// blanche vaut « non renseigné » et devient `null`. Jamais `undefined`, jamais
// `NaN`, jamais une exception — un mandat incomplet côté agence ne doit pas
// faire tomber l'import des autres.
//
// `0` n'est pas « non renseigné » : c'est une valeur. Un `etage` à 0 est un
// rez-de-chaussée, un `nb_terrasse` à 0 signifie qu'il n'y en a pas. Ces zéros
// sont conservés tels quels ; c'est à l'affichage de décider de les taire.
//
// **Valeurs brutes plutôt que `_formatee`.** Le flux fournit la plupart des
// champs en double : `prix` (99000.00) et `prix_formatee` (« 99000.00 € »). Le
// choix est fait une fois pour toutes en faveur des valeurs brutes, sur toute
// la ligne : le site formate déjà à la française via `Intl` (`src/lib/format.js`),
// là où les versions `_formatee` du flux arrivent en notation anglo-saxonne et
// préfixées de leur libellé. Aucun champ ne mélange les deux sources.

import { cleanText } from './xml.mjs'

/**
 * Faut-il retirer de la diffusion les biens passés à `etat` 3 (vendu / loué) ?
 *
 * **Point à trancher avec le client.** Deux comportements se défendent :
 * les laisser visibles marqués « Vendu » (référence sociale, preuve
 * d'activité), ou les faire disparaître dès la signature.
 *
 * Réglé sur `false` par défaut — donc « on les garde, marqués vendus » — parce
 * que le site sait déjà les présenter ainsi : pastille « Vendu » sur la carte
 * et la fiche, rubrique dédiée dans le plan du site. Basculer à `true` les
 * retire du fichier produit, et donc du site, sans autre modification.
 */
export const RETIRER_LES_BIENS_VENDUS = false

/** `etat` du flux — la valeur dit si le bien doit rester visible, et comment. */
const STATUTS = { 1: 'disponible', 2: 'sous-compromis', 3: 'vendu' }

/** Accents et casse écartés, pour comparer des libellés venus d'une saisie humaine. */
function slug(value) {
  if (value == null) return null
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/**
 * Nombre décimal. Accepte le point comme la virgule — le flux écrit « 92.00 »
 * pour une surface habitable mais « 13,62 » pour celle d'une pièce.
 */
function number(value) {
  if (value == null) return null
  const normalized = value.replace(/[\s ]/g, '').replace(',', '.')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

/** Entier, ou `null`. Un décimal est tronqué plutôt que rejeté. */
function integer(value) {
  const n = number(value)
  return n == null ? null : Math.trunc(n)
}

/**
 * Booléen. Le flux mélange les conventions d'un champ à l'autre : `ascenseur`
 * vaut 0/1, `copro` vaut Oui/Non, `grenier` vaut NON en capitales.
 */
function boolean(value) {
  const s = slug(value)
  if (s == null) return null
  if (['1', 'oui', 'o', 'true', 'vrai'].includes(s)) return true
  if (['0', 'non', 'n', 'false', 'faux'].includes(s)) return false
  return null
}

/**
 * Date-heure ISO du flux, telle quelle.
 *
 * `1970-01-01T01:00:00+01:00` est écarté : c'est l'époque Unix, ce que Modelo
 * émet pour une date non saisie (le flux la sert ainsi pour
 * `date_disponibilite`). L'afficher reviendrait à annoncer un bien disponible
 * depuis 1970.
 */
function dateTime(value) {
  if (value == null) return null
  const ms = Date.parse(value)
  if (!Number.isFinite(ms) || ms === 0) return null
  return value
}

/** Jour seul (`AAAA-MM-JJ`) extrait d'une date-heure ISO. */
function day(value) {
  const iso = dateTime(value)
  return iso ? iso.slice(0, 10) : null
}

/** Date au format français `JJ/MM/AAAA` (celui de `dpe_date_realisation`) vers ISO. */
function dateFr(value) {
  if (value == null) return null
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return day(value)
  const [, jour, mois, annee] = match
  return `${annee}-${mois}-${jour}`
}

/**
 * Texte descriptif d'une annonce vers du texte brut.
 *
 * `description` arrive en HTML léger : les `<br>` y font les paragraphes. Le
 * site rend ces textes en `whitespace-pre-line`, donc en sauts de ligne réels.
 * Les quelques autres balises de mise en forme tolérées par Modelo sont
 * retirées — laissées en place, elles s'afficheraient littéralement.
 *
 * La liste des balises retirées est explicite, et non un `<[^>]+>` attrape-tout
 * qui mutilerait une phrase du genre « séjour < 30 m² ».
 */
function richText(value) {
  if (value == null) return null
  return cleanText(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(?:p|div|ul|ol|li|h[1-6]|b|strong|i|em|u|span|a)\b[^>]*>/gi, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n'),
  )
}

/** `type_annonce` vers les deux transactions que connaît le site. */
function transaction(typeAnnonce) {
  // « Viager » et « Vente à terme » sont des modalités de vente : elles
  // rejoignent `/acheter`, leur libellé exact restant dans `typeAnnonce`.
  return slug(typeAnnonce) === 'location' ? 'location' : 'vente'
}

/** `honoraires_charges` vers la valeur attendue par `InfosComplementaires`. */
function honorairesCharge(value) {
  const s = slug(value)
  if (s == null) return null
  if (s.startsWith('vendeur')) return 'vendeur'
  if (s.startsWith('acquereur')) return 'acquereur'
  if (s.startsWith('locataire')) return 'locataire'
  if (s.includes('deux')) return 'les-deux'
  return null
}

/** Visuels, ordonnés par l'attribut `id` — qui porte l'ordre d'affichage voulu. */
function photos(bien) {
  return bien
    .child('images')
    .list('image')
    .map((image, index) => ({ url: image.text, ordre: integer(image.attr('id')) ?? index + 1 }))
    .filter((image) => image.url != null)
    .sort((a, b) => a.ordre - b.ordre)
    .map((image) => image.url)
}

/**
 * Descriptif des pièces. Le flux entremêle `<piece>`, `<surface>` et
 * `<niveau>` sans les grouper : `sequence` les réassocie par leur seul ordre
 * d'apparition (voir `xml.mjs`).
 */
function detailPieces(bien) {
  return bien
    .child('details_pieces')
    .sequence(['piece', 'surface', 'niveau'])
    .filter((record) => record.piece != null)
    .map((record) => ({
      piece: record.piece,
      surface: number(record.surface),
      niveau: integer(record.niveau),
    }))
}

/**
 * Bloc copropriété, ou `null` hors copropriété — c'est exactement ce
 * qu'attend `InfosComplementaires`, qui masque alors la mention entière.
 */
function copropriete(bien) {
  if (boolean(bien.text('copro')) !== true) return null
  return {
    nombreLots: integer(bien.text('nb_lots_copro')),
    budgetPrevisionnelAnnuel: number(bien.text('quotepart')),
    procedureEnCours: boolean(bien.text('copro_procedure')),
    procedureDescription: bien.text('copro_procedure_info'),
  }
}

/** Estimation des dépenses énergétiques annuelles, telle que l'affiche `EnergyDiagnostic`. */
function energie(bien) {
  const depenseMin = number(bien.text('dpe_cout_min_conso'))
  const depenseMax = number(bien.text('dpe_cout_max_conso'))
  const annee = integer(bien.text('dpe_annee_reference_conso'))

  if (depenseMin == null && depenseMax == null && !annee) return null
  return {
    depenseMin,
    depenseMax,
    // Le flux ne transmet qu'une année de référence là où le modèle en accepte
    // plusieurs ; `0` y vaut « non renseignée ».
    anneesReference: annee ? [annee] : null,
  }
}

/**
 * Traduit un `<bien>` en objet du modèle Immovia.
 *
 * Les clés historiques — celles que consomment déjà les composants — gardent
 * leur nom et leur forme exacts ; les champs propres au flux les complètent.
 */
export function mapBien(bien) {
  const typeAnnonce = bien.text('type_annonce')
  const typeTransaction = transaction(typeAnnonce)
  const etat = integer(bien.text('etat'))

  return {
    // — Identification —
    // `reference` porte la référence affichable : c'est elle qui compose les
    // URLs `/bien/:reference`. `referenceTechnique` est l'identifiant stable du
    // « annule et remplace », jamais montré.
    reference: bien.text('reference_a_afficher'),
    referenceTechnique: bien.text('reference_technique'),
    titre: bien.text('titre'),

    // — Contenu rédactionnel —
    // `descriptionLongue` préfère `description_impression`, débarrassée des
    // mentions réglementaires que le site regénère lui-même à partir des
    // données (honoraires, copropriété, DPE, Géorisques). `description` les
    // contient en dur : la retenir afficherait deux fois les mêmes phrases.
    descriptionCourte: bien.text('accroche'),
    descriptionLongue: richText(bien.text('description_impression')) ?? richText(bien.text('description')),
    description: richText(bien.text('description')),
    descriptionImpression: richText(bien.text('description_impression')),
    accroche: bien.text('accroche'),
    pointsForts: richText(bien.text('points_forts')),
    commodites: bien.text('commod'),

    // — Localisation et typologie —
    ville: bien.text('ville'),
    codePostal: bien.text('code_postal'),
    pays: bien.text('pays'),
    codePays: bien.text('code_pays'),
    quartier: bien.text('quartier'),
    secteur: bien.text('secteur'),
    latitude: number(bien.text('latitude')),
    longitude: number(bien.text('longitude')),
    typeAnnonce,
    typeTransaction,
    typeBien: bien.text('type_prod'),
    sousTypeBien: bien.text('sous_type_prod'),

    // — Caractéristiques —
    surface: number(bien.text('surface_habitable')),
    pieces: integer(bien.text('nb_piece')),
    chambres: integer(bien.text('nb_chambre')),
    caracteristiques: {
      nbSdb: integer(bien.text('nb_sdb')),
      nbSde: integer(bien.text('nb_sde')),
      wc: integer(bien.text('wc')),
      ascenseur: boolean(bien.text('ascenseur')),
      surfaceJardin: number(bien.text('surface_jardin')),
      surfaceTerrain: number(bien.text('surface_terrain')),
      piscine: boolean(bien.text('piscine')),
      cave: boolean(bien.text('cave')),
      stationnementInterne: integer(bien.text('stationnement_interne')),
      stationnementExterne: integer(bien.text('stationnement_externe')),
      nbBalcon: integer(bien.text('nb_balcon')),
      surfaceBalcon: number(bien.text('surface_balcon')),
      nbTerrasse: integer(bien.text('nb_terrasse')),
      surfaceTerrasse: number(bien.text('surface_terrasse')),
      etage: integer(bien.text('etage')),
      nbEtage: integer(bien.text('nb_etage')),
      vue: bien.text('vue'),
      exposition: bien.text('exposition'),
      annee: integer(bien.text('annee')),
      ancienNeuf: bien.text('old_new'),
      cuisine: bien.text('cuisine'),
      typeChauffage: bien.text('type_chauffage'),
      // Énergies de chauffage, liste imbriquée — complète `typeChauffage`,
      // qui n'en donne que le mode (collectif, individuel…).
      chauffages: bien.child('chauffages').list('chauffage').map((c) => c.text).filter(Boolean),
      luxe: boolean(bien.text('luxe')),
    },
    detailPieces: detailPieces(bien),

    // — Prix et honoraires —
    // `prix` est le montant mis en avant par le site : le loyer en location,
    // le prix de vente sinon. Les deux champs bruts restent disponibles.
    prix: typeTransaction === 'location' ? number(bien.text('loyer')) : number(bien.text('prix')),
    prixVente: number(bien.text('prix')),
    loyer: number(bien.text('loyer')),
    prixHorsHonorairesAcquereur: number(bien.text('prix_hors_honoraires_acquereur')),
    charges: number(bien.text('charges')),
    depotGarantie: number(bien.text('depot_garantie')),
    fraisNotaire: number(bien.text('frais_notaire')),
    taxeFonciere: number(bien.text('taxe_fonciere')),
    honorairesAcquereur: number(bien.text('honoraires_acquereur')),
    honorairesLocataire: number(bien.text('honoraires_locataire')),
    honorairesCharge: honorairesCharge(bien.text('honoraires_charges')),

    // — DPE / GES / copropriété —
    dpe: bien.text('bilan_energie'),
    energyValue: number(bien.text('valeur_energie')),
    ges: bien.text('bilan_ges'),
    climateValue: number(bien.text('valeur_ges')),
    dpeEtat: bien.text('dpe_etat'),
    dpeDateRealisation: dateFr(bien.text('dpe_date_realisation')),
    georisque: boolean(bien.text('georisque')),
    copropriete: copropriete(bien),
    energie: energie(bien),

    // — État et dates —
    etat,
    statut: STATUTS[etat] ?? 'disponible',
    // `date_mise_en_ligne` est la date de publication au sens du site : c'est
    // elle qui ordonne « Biens récents » et la page d'accueil. À défaut, la
    // date de création du mandat fait foi.
    datePublication: day(bien.text('date_mise_en_ligne')) ?? day(bien.text('date_creation')),
    dateCreation: dateTime(bien.text('date_creation')),
    dateModification: dateTime(bien.text('date_modification')),
    dateDisponibilite: dateTime(bien.text('date_disponibilite')),

    // — Agence et négociateur —
    contact: {
      nom: bien.text('nom_a_afficher'),
      email: bien.text('email_a_afficher'),
      telephone: bien.text('tel_a_afficher'),
    },
    negociateur: {
      nom: bien.text('negociateur_nom'),
      prenom: bien.text('negociateur_prenom'),
      telephone: bien.text('negociateur_telephone'),
      photo: bien.text('negociateur_photo'),
    },

    // — Médias —
    photos: photos(bien),
    video: bien.text('video'),
    visiteVirtuelle: bien.text('visite_virtuelle'),
  }
}
