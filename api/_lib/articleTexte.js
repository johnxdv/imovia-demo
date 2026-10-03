// Identifiant d'URL et conversion d'un texte brut en article.
//
// Vit dans `api/_lib/` parce que la fonction serverless `seo-articles.js` en a
// besoin, et que c'est le sens de partage déjà établi dans ce dépôt : les
// scripts importent `api/_lib/`, jamais l'inverse (voir
// `scripts/_lib/donnees-locales.mjs`, qui lit le moteur d'estimation).
//
// Une seule définition de `slugify` pour tout le projet : deux variantes qui
// divergeraient d'un caractère produiraient deux adresses pour un même article
// — celle écrite dans le fichier, et celle que la page cherche.

/** Identifiant d'URL, dérivé d'un titre. */
export function slugify(titre) {
  const base = String(titre ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
    .replace(/-+$/, '')

  if (!base) throw new Error('slugify : titre vide ou sans caractère exploitable.')
  return base
}

/**
 * Titre d'article ramené à ce qu'une page de résultats affiche.
 *
 * POURQUOI IL DIFFÈRE DU TITRE AFFICHÉ
 *
 * Le `h1` d'un article peut tenir sur trois lignes sans gêner personne — « Prix
 * au m² autour de Diebling : ce que révèle la comparaison des 12 communes à
 * moins de 7 km » en fait 92. Dans un résultat de recherche, la même chaîne est
 * coupée autour de 60 caractères, et ce qui saute, c'est la fin : la promesse
 * de l'article disparaît, il ne reste que son entrée en matière.
 *
 * Le modèle rend donc un `titreSeo` court à la rédaction. Il n'est pas cru sur
 * parole : la longueur est garantie ici, mécaniquement, parce qu'une consigne
 * de prompt n'est pas une borne. La coupe se fait au mot, jamais au milieu.
 *
 * `budget` est la place restante une fois la marque retranchée — le prérendu
 * et la page React ajoutent l'un comme l'autre « — IMMOVIA » après coup, et
 * doivent donc tenir le même compte. D'où cette fonction ici, partagée, plutôt
 * qu'une copie de chaque côté : deux troncatures qui divergent, c'est un titre
 * d'onglet et un titre de résultat qui ne se ressemblent plus.
 */
export function titreCourt(article, budget = 50) {
  const court = String(article?.titreSeo || article?.titre || '').trim()
  if (court.length <= budget) return court

  const tranche = court.slice(0, budget - 1)
  const espace = tranche.lastIndexOf(' ')
  const garde = espace > budget * 0.6 ? tranche.slice(0, espace) : tranche

  return `${garde.replace(/[\s,;:—-]+$/, '')}…`
}

/** Un slug déjà formé est-il acceptable ? Sert de garde à toute écriture. */
export const SLUG_VALIDE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Article construit à partir d'un titre et d'un texte brut.
 *
 * Convention de saisie, volontairement minimale — c'est un formulaire de
 * dépannage, pas un éditeur :
 *
 *   • le premier bloc devient le résumé ;
 *   • un bloc d'une seule ligne terminée par « ? » ouvre une section ;
 *   • les blocs suivants sont les paragraphes de la section ouverte.
 *
 * Un texte sans aucune question forme une section unique, sans sous-titre :
 * l'article reste publiable, il n'a simplement pas de découpage.
 *
 * Aucune FAQ n'est déduite. Une FAQ inventée à partir du texte produirait un
 * balisage `FAQPage` qui ne correspond à rien dans la page — les moteurs le
 * traitent comme du balisage trompeur, ce qui coûte plus cher que son absence.
 */
export function articleDepuisTexte(titre, contenu) {
  const blocs = String(contenu ?? '')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)

  if (blocs.length === 0) throw new Error('Contenu vide.')

  const [resume, ...reste] = blocs
  const sections = []

  const estQuestion = (bloc) => !bloc.includes('\n') && bloc.endsWith('?') && bloc.length < 200

  for (const bloc of reste) {
    if (estQuestion(bloc)) {
      sections.push({ question: bloc, paragraphes: [] })
    } else if (sections.length === 0) {
      sections.push({ question: titre, paragraphes: [bloc] })
    } else {
      sections[sections.length - 1].paragraphes.push(bloc)
    }
  }

  // Une section ouverte par une question restée sans réponse ne rendrait qu'un
  // sous-titre orphelin : on la referme plutôt que de la publier vide.
  const retenues = sections.filter((s) => s.paragraphes.length > 0)
  if (retenues.length === 0) throw new Error('Contenu sans paragraphe exploitable.')

  return { resume, sections: retenues }
}

/**
 * Regroupe les sources d'un article par page citée.
 *
 * Trois statistiques tirées d'un même dossier de presse donnaient trois
 * entrées portant le même nom d'organisme et le même lien, à trois lignes
 * d'intervalle. C'était redondant à la lecture, et cela produisait surtout
 * trois enfants React de même clé — l'adresse servant de clé — donc un
 * avertissement de rendu et un risque de lignes omises.
 *
 * Une source, ses faits en dessous : c'est à la fois plus juste (c'est bien
 * une seule référence) et plus lisible.
 */
export function groupeSources(sources) {
  const parUrl = new Map()

  for (const s of sources ?? []) {
    if (!s?.url) continue
    if (!parUrl.has(s.url)) parUrl.set(s.url, { source: s.source, url: s.url, enonces: [] })
    parUrl.get(s.url).enonces.push(s.enonce)
  }

  return [...parUrl.values()]
}

// ── Les quatre formats éditoriaux ───────────────────────────────────────────
//
// Ils remplacent les six catégories de l'ancienne rotation. La différence n'est
// pas cosmétique : une catégorie était un THÈME que le modèle choisissait
// lui-même, un format est un MOULE décidé par le plan éditorial. Le thème n'a
// donc plus à être cherché, et l'étape de recherche de sujet — le poste le plus
// cher du système — disparaît avec lui.
//
// `recherche` dit si le format a besoin de la recherche web. Un guide pratique
// et un article de conseil n'avancent aucun fait local à vérifier : ils
// s'écrivent sur le métier. Les deux autres citent des écoles, des lignes de
// bus, des montants d'aides — tout cela doit être sourcé, et c'est précisément
// ce qu'un concurrent ne peut pas recopier.
//
// `graphique` dit si le format accepte un graphique. Un seul le fait. C'est la
// règle qui empêche le blog de redevenir un mur de barres.
export const FORMATS = {
  guide: { libelle: 'Guide pratique', recherche: false, graphique: false },
  local: { libelle: 'Article local', recherche: true, graphique: false },
  marche: { libelle: 'Article de marché', recherche: true, graphique: true },
  conseil: { libelle: 'Article de conseil', recherche: false, graphique: false },
}

export const CLES_FORMAT = Object.keys(FORMATS)

/** Libellé lisible d'un format, ou la clé si elle est inconnue. */
export const libelleFormat = (cle) => FORMATS[cle]?.libelle ?? cle ?? 'Sans format'

/**
 * Temps de lecture, en minutes.
 *
 * Calculé à l'affichage et jamais stocké : un compte figé dans le fichier
 * mentirait dès la première correction du texte. À 200 mots par minute —
 * vitesse de lecture courante en français sur un texte non technique — et
 * jamais moins d'une minute, parce que « 0 min de lecture » ne veut rien dire.
 *
 * Le titre et le résumé comptent, la FAQ aussi : ce sont des mots que le
 * lecteur lit. Les crochets du lien contextuel sont retirés pour ne pas
 * compter `[[` comme un mot.
 */
export function tempsLecture(article) {
  const morceaux = [
    article?.titre,
    article?.resume,
    ...(article?.sections ?? []).flatMap((s) => [s.question, ...(s.paragraphes ?? [])]),
    ...(article?.faq ?? []).flatMap((q) => [q.question, q.reponse]),
  ]

  const mots = morceaux
    .filter(Boolean)
    .join(' ')
    .replace(/\[\[|\]\]/g, '')
    .split(/\s+/)
    .filter(Boolean).length

  return Math.max(1, Math.round(mots / 200))
}

/**
 * Deux ou trois autres articles à proposer en fin de lecture.
 *
 * L'ordre de préférence sert le maillage interne autant que le lecteur : la
 * même commune d'abord, parce que deux articles sur Forbach qui se citent
 * disent au moteur que le site traite Forbach en profondeur ; le même format
 * ensuite ; le reste par date. Un article seul dans sa commune n'est donc pas
 * privé de liens, il en reçoit simplement de moins proches.
 *
 * Rend une liste éventuellement vide — au premier article publié, il n'y a rien
 * à lier, et c'est un état normal, pas une panne.
 */
export function articlesLies(article, tous, combien = 3) {
  const autres = (tous ?? []).filter((a) => a?.slug && a.slug !== article?.slug)

  const rang = (a) => {
    if (article?.ville && a.ville === article.ville) return 0
    if (article?.format && a.format === article.format) return 1
    return 2
  }

  return autres
    .sort(
      (a, b) =>
        rang(a) - rang(b) ||
        String(b.datePublication).localeCompare(String(a.datePublication)),
    )
    .slice(0, combien)
}

/**
 * Découpe un paragraphe sur ses liens internes ancrés.
 *
 * LE PROBLÈME QUE CETTE MICRO-SYNTAXE RÉSOUT
 *
 * Le lien vers l'estimateur doit être DANS une phrase, formulé naturellement —
 * « nous le constatons sur les biens que nous estimons à Forbach ». Un bloc
 * d'appel à l'action séparé ne remplace pas ça : le lecteur le saute, et le
 * moteur voit un bouton, pas une ancre en contexte.
 *
 * Mais laisser le modèle produire du HTML dans un paragraphe ouvrirait la porte
 * à du balisage arbitraire dans une page du site. La rédaction marque donc son
 * ancre avec `[[…]]`, et c'est tout ce qu'elle peut faire : deux crochets, pas
 * une balise. Elle peut nommer une CIBLE après une barre verticale —
 * `[[estimation immobilière Forbach|estimation]]`, `[[agence immobilière
 * Forbach|agence]]` — et rien d'autre : le vocabulaire est fermé, et c'est
 * `lienInterne` qui le traduit en adresse.
 *
 * L'ordre des opérations compte, côté rendu statique : le texte est échappé
 * D'ABORD, la découpe vient après. Les crochets traversent l'échappement sans
 * être touchés — `echappe` ne s'occupe que de `& < > "` — donc la découpe
 * retrouve ses marques, et aucun `<a>` ne peut sortir du texte de l'article.
 *
 * Rend une liste de segments plutôt qu'une chaîne, pour que les deux rendus
 * partagent l'analyse et non sa mise en forme : le prérendu en fait du HTML, la
 * page React en fait des éléments.
 */
export const CIBLES_LIEN = ['estimation', 'agence']

/**
 * Où mène une ancre interne. UNE SEULE DÉFINITION, partagée par les deux rendus.
 *
 * La rédaction ne produit jamais d'adresse : elle nomme une CIBLE prise dans un
 * vocabulaire fermé, et c'est ce fichier qui sait ce qu'elle vaut en URL. Un
 * modèle qui écrirait l'adresse lui-même finirait par inventer
 * `/agence-forbach` un jour où `/agence-immobiliere/forbach` est la bonne, et
 * personne ne le verrait avant que la page ne renvoie un 404.
 *
 * La page d'agence n'existe que pour une commune : sans elle, l'ancre retombe
 * sur la page de contact, qui porte les mêmes coordonnées.
 */
export function lienInterne(cible, ville) {
  if (cible === 'agence') return ville ? `/agence-immobiliere/${slugify(ville)}` : '/contact'
  return '/estimer'
}

export function decoupeLien(paragraphe, { max = 1 } = {}) {
  const texte = String(paragraphe ?? '')
  const segments = []
  let reste = texte
  let poses = 0

  for (;;) {
    const debut = reste.indexOf('[[')
    const fin = debut === -1 ? -1 : reste.indexOf(']]', debut + 2)

    // Au-delà du quota, les crochets sont retirés et le texte gardé tel quel.
    // Il vaut UN par défaut — trois liens vers la même page dans un paragraphe
    // diluent l'ancre au lieu de la renforcer — et la conclusion est le seul
    // passage à en demander deux, parce qu'ils ne vont pas au même endroit.
    if (debut === -1 || fin === -1 || poses >= max) {
      segments.push({ texte: reste.replace(/\[\[|\]\]/g, ''), lien: false, cible: null })
      return segments.filter((s) => s.texte !== '')
    }

    // `[[texte]]` vise l'estimateur — la forme d'origine, et celle de tous les
    // articles déjà publiés. `[[texte|agence]]` vise la page de la commune.
    // Une cible inconnue n'invente pas d'adresse : elle retombe sur la première.
    const brut = reste.slice(debut + 2, fin)
    const barre = brut.indexOf('|')
    const libelle = barre === -1 ? brut : brut.slice(0, barre)
    const demandee = barre === -1 ? 'estimation' : brut.slice(barre + 1).trim()
    const cible = CIBLES_LIEN.includes(demandee) ? demandee : 'estimation'

    segments.push({ texte: reste.slice(0, debut), lien: false, cible: null })
    segments.push({ texte: libelle, lien: true, cible })
    reste = reste.slice(fin + 2)
    poses += 1
  }
}

/** Y a-t-il un lien contextuel dans le corps de l'article ? */
export const aLienContextuel = (article) =>
  (article?.sections ?? []).some((s) =>
    (s.paragraphes ?? []).some((p) => decoupeLien(p).some((seg) => seg.lien)),
  )

/**
 * Visuels du corps rangés par rang de section.
 *
 * Partagé par les deux rendus. `apresSection` vient de la rédaction, qui sait
 * où son propos appelle une image, et il est BORNÉ ici : un modèle qui annonce
 * « après la section 7 » d'un article qui en compte quatre ferait autrement
 * disparaître l'image au rendu, sans que rien ne le signale.
 *
 * Cette fonction vit dans le module partagé et non dans chacun des deux rendus
 * parce qu'un bornage qui divergerait d'un cran placerait la même image à deux
 * endroits différents selon que le lecteur exécute du JavaScript ou non — et
 * cette divergence-là ne se voit pas en relisant l'un des deux fichiers.
 *
 * Rend une Map de rang (à partir de 1) vers la liste des visuels à poser après
 * cette section, graphique compris, dans l'ordre : photos d'abord, graphique
 * ensuite.
 */
export function visuelsParSection(article) {
  const total = (article?.sections ?? []).length
  const parRang = new Map()

  const pose = (v, type) => {
    if (!v?.src || total === 0) return
    const rang = Math.min(Math.max(1, Number(v.apresSection) || 1), total)
    if (!parRang.has(rang)) parRang.set(rang, [])
    parRang.get(rang).push({ ...v, type })
  }

  for (const img of article?.imagesCorps ?? []) pose(img, 'photo')
  pose(article?.graphique, 'graphique')

  return parRang
}
