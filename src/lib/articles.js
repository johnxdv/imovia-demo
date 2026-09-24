// Accès aux articles du blog, côté front.
//
// Les articles sont des fichiers JSON de `src/data/articles/`, un par article,
// écrits par `scripts/blog-article.mjs` puis commités. `import.meta.glob` les
// ramasse à la construction : ajouter un fichier suffit, il n'y a pas d'index
// à tenir à jour — et donc pas d'index qui puisse se désynchroniser du dossier.
//
// `eager` plutôt qu'un chargement à la demande : ce sont quelques kilooctets de
// texte, et la page de liste a besoin de tous les résumés de toute façon.

const modules = import.meta.glob('../data/articles/*.json', { eager: true })

/** Tous les articles, du plus récent au plus ancien. */
export const articles = Object.values(modules)
  .map((module) => module.default)
  .sort((a, b) => String(b.datePublication).localeCompare(String(a.datePublication)))

/** Un article par son identifiant d'URL, ou `undefined`. */
export function articleParSlug(slug) {
  return articles.find((a) => a.slug === slug)
}

/** Date lisible — même rendu que celui du prérendu statique. */
export function dateLisible(iso) {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
