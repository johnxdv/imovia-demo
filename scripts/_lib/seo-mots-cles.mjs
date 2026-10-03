// Les mots-clés commerciaux d'un article, et le contrôle de leur présence.
//
// CE QUE CE MODULE CORRIGE
//
// Le blog autonome écrivait pour le mot-clé INFORMATIF — « prix m2 Forbach »,
// « où habiter à Sarreguemines » — et rien d'autre. Ce sont de bonnes requêtes,
// elles amènent des lecteurs ; elles n'amènent pas de mandats. Les requêtes qui
// en amènent — « agence immobilière Forbach », « estimation immobilière
// Sarreguemines » — n'apparaissaient dans aucun article, pas une fois, et aucune
// page du site ne les visait non plus.
//
// LE MOT-CLÉ COMMERCIAL N'EST PAS UN MOT À SAUPOUDRER, C'EST UNE PLACE À TENIR
//
// Une occurrence posée au milieu d'un paragraphe ne vaut rien. Ce qui compte,
// c'est OÙ : la méta-description, les cent premiers mots, une question de FAQ,
// l'ancre d'un lien interne, le texte alternatif de l'image d'en-tête. Ce module
// définit donc des EMPLACEMENTS, et le contrôle porte sur eux — pas sur une
// densité.
//
// ET LE BOURRAGE EST BORNÉ PAR CONSTRUCTION
//
// Une à trois occurrences exactes par mot-clé, jamais plus d'une pour quatre
// cents mots. Au-delà, ce n'est plus de l'optimisation, c'est un signal négatif
// — et surtout, ça ne se lit plus.
//
// LES VARIANTES NE COMPTENT PAS COMME DES OCCURRENCES, et c'est voulu dans les
// deux sens : elles ne remplissent pas un emplacement exigé, et elles ne
// consomment pas le plafond. Elles existent pour que le texte respire, pas pour
// gonfler un compteur.

/**
 * Normalisation de comparaison — minuscules, sans accents, ponctuation réduite
 * à des espaces.
 *
 * ELLE NE TOLÈRE AUCUN MOT INSÉRÉ, et c'est le point le plus important de ce
 * fichier. « agence immobilière à Sarreguemines » ne contient PAS « agence
 * immobilière Sarreguemines » : la préposition change la chaîne, donc le
 * compteur ne la voit pas.
 *
 * Ce n'est pas une limite, c'est ce qui rend l'ensemble tenable. Les
 * emplacements imposés demandent une tournure naturelle à plusieurs endroits —
 * la question de FAQ s'écrit « à {ville} », et personne ne l'écrirait
 * autrement — et si chacune de ces tournures comptait comme une occurrence
 * exacte, le plafond anti-bourrage serait franchi par les emplacements
 * obligatoires eux-mêmes. En ne comptant que la forme exacte, on laisse la
 * langue tranquille là où elle doit l'être.
 */
export const normalise = (valeur) =>
  String(valeur ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Nombre d'occurrences exactes d'une expression dans un texte, mots entiers. */
export function compte(texte, expression) {
  const aiguille = normalise(expression)
  if (!aiguille) return 0

  const botte = ` ${normalise(texte)} `
  let total = 0
  let depuis = 0

  for (;;) {
    const trouve = botte.indexOf(` ${aiguille} `, depuis)
    if (trouve === -1) return total
    total += 1
    // On repart APRÈS l'espace ouvrant, pas après l'expression entière : deux
    // occurrences séparées par un seul espace partagent ce séparateur, et
    // sauter la chaîne complète ferait manquer la seconde.
    depuis = trouve + 1
  }
}

/** Y a-t-il au moins une occurrence exacte ? */
export const contient = (texte, expression) => compte(texte, expression) > 0

/**
 * Maison ou appartement — ce que « vente {bien} {ville} » doit viser.
 *
 * Le choix se lit sur le sujet, jamais sur la commune : un article consacré aux
 * appartements d'une ville qui n'en compte presque pas reste un article sur les
 * appartements. À défaut d'indice, « maison » — c'est l'écrasante majorité du
 * parc de la Moselle-Est, et la requête la plus cherchée du secteur.
 */
export function bienDuSujet(sujet = {}) {
  const dit = normalise([sujet.motCle, sujet.titre, sujet.angle, sujet.intention].filter(Boolean).join(' '))
  const appartement = /\bappartements?\b/.test(dit)
  const maison = /\bmaisons?\b/.test(dit)

  return appartement && !maison ? 'appartement' : 'maison'
}

/**
 * Le jeu de mots-clés d'un article.
 *
 * `principal` est le mot-clé informatif venu du plan éditorial. IL N'EST PAS
 * TOUCHÉ : c'est lui qui a décidé du sujet, de l'angle et du titre, et le
 * remplacer par une requête commerciale rendrait l'article inutile à celui qui
 * le lit. Les commerciaux s'ajoutent, ils ne se substituent pas.
 */
export function jeuMotsCles({ ville, sujet = {} }) {
  const commune = String(ville ?? '').trim()
  const bien = bienDuSujet(sujet)

  return {
    principal: sujet.motCle ?? null,
    bien,
    commune,
    commerciaux: {
      agence: `agence immobilière ${commune}`,
      vente: `vente ${bien} ${commune}`,
      estimation: `estimation immobilière ${commune}`,
    },
    // Autorisées dans le texte, jamais comptées : elles existent pour que le
    // rédacteur ait de quoi varier sans frôler le plafond.
    variantes: [`agence immo ${commune}`, `vendre son bien à ${commune}`],
  }
}

/* -------------------------------------------------------------------------- */
/*  Textes de l'article sur lesquels porte le contrôle                        */
/* -------------------------------------------------------------------------- */

/** Le corps rédigé — ce sur quoi se comptent les occurrences et les mots. */
export const corpsTexte = (article) =>
  [
    article?.resume,
    ...(article?.sections ?? []).flatMap((s) => s.paragraphes ?? []),
    ...(article?.faq ?? []).flatMap((q) => [q.question, q.reponse]),
    article?.conclusion,
  ]
    .filter(Boolean)
    .join('\n')

/** Nombre de mots du corps — c'est lui qui fixe le plafond d'occurrences. */
export const compteMots = (article) => corpsTexte(article).split(/\s+/).filter(Boolean).length

/**
 * L'introduction : les cent premiers mots du texte tel qu'on le lit.
 *
 * Le résumé d'abord, puis le premier paragraphe — exactement l'ordre d'affichage
 * de la page. Cent mots parce que c'est l'étendue sur laquelle un lecteur décide
 * s'il reste, et celle qu'un moteur retient pour juger du sujet de la page.
 */
export function introduction(article) {
  const debut = [article?.resume, ...(article?.sections?.[0]?.paragraphes ?? [])].filter(Boolean).join(' ')
  return debut.split(/\s+/).filter(Boolean).slice(0, 100).join(' ')
}

/* -------------------------------------------------------------------------- */
/*  Les règles                                                                */
/* -------------------------------------------------------------------------- */

/** Longueur maximale d'une méta-description affichable en entier. */
export const META_MAX = 155

/**
 * Plafond d'occurrences exactes d'un même mot-clé.
 *
 * Une pour quatre cents mots, trois au grand maximum, une au minimum — un
 * article de huit cents mots n'a pas moins le droit de nommer sa commune qu'un
 * article de douze cents.
 */
export const plafondOccurrences = (mots) => Math.max(1, Math.min(3, Math.floor(mots / 400)))

/**
 * Superlatifs interdits sur l'agence.
 *
 * Ce ne sont pas des maladresses de style : ce sont des affirmations invérifiables
 * sur un service, c'est-à-dire exactement ce que le reste du système s'interdit
 * déjà sur les chiffres. Un article qui ne déduit aucune tendance d'un relevé
 * unique ne peut pas, trois paragraphes plus bas, se déclarer la meilleure agence
 * du secteur.
 */
const SUPERLATIFS = [
  /\bmeilleure?s?\s+agence/i,
  /\bn[°o]\s*1\b/i,
  /\bnum[ée]ro\s+(un|1)\b/i,
  /\bleader\b/i,
  /\bpremi[èe]re\s+agence\b/i,
  /\b(la|le)\s+plus\s+(grande?|grand)\s+agence/i,
  /\bincontournable\b/i,
  /\bspécialiste\s+n/i,
]

/** Les superlatifs trouvés dans le texte, tels qu'écrits. */
export function superlatifs(texte) {
  const brut = String(texte ?? '')
  return SUPERLATIFS.map((motif) => brut.match(motif)?.[0]).filter(Boolean)
}

/* -------------------------------------------------------------------------- */
/*  Le contrôle                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Les emplacements exigés, dans l'ordre où le lecteur les rencontre.
 *
 * Chaque entrée porte son propre test ET le nom du champ à régénérer si le test
 * échoue. C'est ce couple qui permet la correction ciblée : on ne reprend jamais
 * l'article, on reprend LE passage — voir `corrigeEmplacement` dans
 * `blog-article.mjs`.
 */
export function emplacements(article, jeu) {
  const { agence, vente, estimation } = jeu.commerciaux
  const commune = jeu.commune

  // La méta-description vise l'agence, et se rabat sur la vente quand la phrase
  // ne tient pas. La règle est écrite comme une ALTERNATIVE et non comme un
  // calcul de longueur : « agence immobilière {ville} » fait trente-six
  // caractères sur la plus longue commune du secteur, donc un seuil arithmétique
  // ne se déclencherait jamais et donnerait l'illusion d'un repli. Ce qui peut
  // réellement manquer, c'est la place pour en faire une PHRASE — et cela, seul
  // le rédacteur le sait au moment où il l'écrit.
  const meta = article?.seo?.metaDescription ?? ''
  const metaTenue = contient(meta, agence) ? agence : contient(meta, vente) ? vente : null

  return [
    {
      cle: 'metaDescription',
      champ: 'metaDescription',
      intitule: 'Méta-description',
      attendu: `« ${agence} », ou « ${vente} » à défaut, en ${META_MAX} caractères`,
      constate: meta ? `${meta.length} caractères${metaTenue ? ` · « ${metaTenue} »` : ''}` : 'absente',
      ok: Boolean(meta) && meta.length <= META_MAX && metaTenue !== null,
      vise: agence,
    },
    {
      cle: 'introduction',
      champ: 'resume',
      intitule: 'Introduction (100 premiers mots)',
      attendu: `une mention de « ${agence} » ou de « ${vente} »`,
      constate: '',
      // L'un OU l'autre : l'introduction doit parler de l'agence ou de la vente
      // d'un bien dans la commune, et c'est l'angle de l'article qui décide
      // laquelle des deux se place naturellement.
      ok: contient(introduction(article), agence) || contient(introduction(article), vente),
      vise: agence,
    },
    {
      cle: 'faq',
      champ: 'faq',
      intitule: 'Question de FAQ sur le choix d’une agence',
      attendu: `« Comment choisir son agence immobilière à ${commune} ? »`,
      constate: '',
      ok: (article?.faq ?? []).some(
        (q) =>
          /comment\s+choisir/i.test(q?.question ?? '') &&
          contient(q?.question ?? '', `agence immobilière à ${commune}`),
      ),
      vise: `agence immobilière à ${commune}`,
    },
    {
      cle: 'conclusion',
      champ: 'conclusion',
      intitule: 'Conclusion — deux liens internes ancrés',
      attendu: `ancres « ${estimation} » (estimateur) et « ${agence} » (page agence)`,
      constate: article?.conclusion ? '' : 'absente',
      ok: (() => {
        const ancres = ancresConclusion(article?.conclusion)
        return ancres.estimation === normalise(estimation) && ancres.agence === normalise(agence)
      })(),
      vise: `${estimation} / ${agence}`,
    },
    {
      cle: 'alternatif',
      champ: 'alternatifEnTete',
      intitule: 'Texte alternatif de l’image d’en-tête',
      attendu: `descriptif, et nommant ${commune}`,
      constate: article?.imageEnTete?.alt ?? '(aucun)',
      ok: alternatifValide(article?.imageEnTete?.alt, commune),
      vise: commune,
    },
  ]
}

/**
 * Un texte alternatif décrit une image à qui ne la voit pas.
 *
 * Trois conditions, et aucune n'est négociable : il nomme la commune (c'est ce
 * qui le rend utile ici), il fait une vraie phrase descriptive — au moins cinq
 * mots —, et il n'est pas la liste de mots-clés qu'un `alt` devient dès qu'on
 * cesse de le lire comme du texte.
 */
export function alternatifValide(alt, commune) {
  const texte = String(alt ?? '').trim()
  if (!texte) return false
  if (!contient(texte, commune)) return false
  if (texte.split(/\s+/).filter(Boolean).length < 5) return false
  // Un `alt` qui empile les mots-clés séparés par des virgules n'est pas une
  // description, c'est un entrepôt.
  return (texte.match(/,/g) ?? []).length < 3
}

/**
 * Les ancres de la conclusion, par cible — normalisées, prêtes à comparer.
 *
 * Rend `{ estimation, agence }`, chaque valeur étant le texte de l'ancre posée
 * vers cette cible, ou `null`.
 */
export function ancresConclusion(conclusion) {
  const trouvees = { estimation: null, agence: null }
  const texte = String(conclusion ?? '')

  for (const correspondance of texte.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)) {
    const cible = (correspondance[2] ?? 'estimation').trim()
    if (cible in trouvees && trouvees[cible] === null) {
      trouvees[cible] = normalise(correspondance[1])
    }
  }

  return trouvees
}

/**
 * Contrôle complet d'un article : emplacements, occurrences, superlatifs.
 *
 * Ne lève jamais et ne corrige rien — il CONSTATE. La décision de régénérer, de
 * reformuler ou de publier quand même appartient à l'appelant, parce qu'elle
 * dépend du nombre de tentatives déjà faites.
 */
export function controle(article, jeu) {
  const mots = compteMots(article)
  const plafond = plafondOccurrences(mots)
  const texte = corpsTexte(article)

  const places = emplacements(article, jeu)

  const occurrences = Object.entries(jeu.commerciaux).map(([cle, expression]) => {
    // La méta-description et le texte alternatif ne sont pas du corps rédigé :
    // ils ne comptent pas dans le plafond, qui porte sur ce qu'on lit.
    const n = compte(texte, expression)
    return {
      cle,
      expression,
      occurrences: n,
      plafond,
      manquant: n < 1,
      excedent: Math.max(0, n - plafond),
    }
  })

  const excessifs = occurrences.filter((o) => o.excedent > 0)
  const vantardises = superlatifs(`${texte}\n${article?.seo?.metaDescription ?? ''}`)

  return {
    mots,
    plafond,
    emplacements: places,
    occurrences,
    superlatifs: vantardises,
    manquants: places.filter((p) => !p.ok),
    excessifs,
    ok: places.every((p) => p.ok) && excessifs.length === 0 && vantardises.length === 0,
  }
}

/** Résumé d'une ligne, pour le journal de passage. */
export const resumeControle = (rapport) =>
  rapport.ok
    ? `tous les emplacements tenus, ${rapport.occurrences.map((o) => `${o.cle} ×${o.occurrences}`).join(', ')}`
    : [
        rapport.manquants.length ? `${rapport.manquants.length} emplacement(s) manquant(s)` : null,
        rapport.excessifs.length ? `${rapport.excessifs.length} mot(s)-clé(s) en excès` : null,
        rapport.superlatifs.length ? `superlatif interdit : ${rapport.superlatifs.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join(' · ')

/**
 * Tableau des emplacements et des occurrences, pour la sortie du script.
 *
 * Imprimé à chaque passage, réussi ou non : c'est la seule façon de voir d'un
 * coup d'œil ce que l'article tient vraiment, et de repérer une règle qui aurait
 * cessé de l'être.
 */
export function tableau(rapport) {
  const lignes = [
    '  Emplacement                            État   Attendu',
    '  ────────────────────────────────────── ────── ────────────────────────────────────────',
  ]

  for (const p of rapport.emplacements) {
    lignes.push(`  ${p.intitule.padEnd(38).slice(0, 38)} ${(p.ok ? '  ok  ' : ' MANQUE')} ${p.attendu}`)
  }

  lignes.push('')
  lignes.push(`  Mot-clé commercial                     Occ.   Plafond (${rapport.mots} mots)`)
  lignes.push('  ────────────────────────────────────── ────── ────────────────────────────────────────')

  for (const o of rapport.occurrences) {
    const etat = o.manquant ? 'MANQUE' : o.excedent > 0 ? ' EXCÈS' : '  ok  '
    lignes.push(`  ${o.expression.padEnd(38).slice(0, 38)} ${String(o.occurrences).padStart(4)}   ${etat}  (≤ ${o.plafond})`)
  }

  return lignes.join('\n')
}
