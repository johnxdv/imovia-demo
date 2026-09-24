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
