import { Link } from 'react-router-dom'

import { PageHeader } from '../components/ui/PageHeader'
import { Section } from '../components/ui/Section'
import { RevealGroup, RevealChild } from '../components/ui/Reveal'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { articles, dateLisible } from '../lib/articles'
import { libelleFormat, tempsLecture } from '../../api/_lib/articleTexte'

// Liste des articles.
//
// Cette page est atteignable par un seul lien du site, dans le pied de page,
// et par le sitemap. Elle n'apparaît ni dans la navigation principale ni dans
// aucun menu — c'est voulu (voir `src/components/layout/Footer.jsx`).
//
// ELLE A UN JUMEAU, comme la page d'article : `listeHtml()` dans
// `scripts/prerender-blog.mjs`. Mêmes classes des deux côtés — celles que le
// prérendu emploie seul sont purgées du CSS, puisque Tailwind ne balaie que
// `./src/**`.
//
// SUR LA VIGNETTE MANQUANTE
//
// Un article sans image d'en-tête reçoit un cadre vide, pas un trou : la grille
// garderait sinon des cartes de deux hauteurs différentes, et l'absence
// passerait pour un défaut d'affichage plutôt que pour ce qu'elle est.

export default function Blog() {
  useDocumentTitle('Articles')

  return (
    <>
      <PageHeader
        tone="white"
        eyebrowClassName="text-brass-sombre"
        eyebrow="Le marché, vu du secteur"
        title="Articles"
        intro="Ce que nous observons sur le marché immobilier de la Moselle-Est : guides pratiques, communes du secteur, conseils de vente et relevés de prix."
      />

      <Section tone="white" py="pb-24 pt-4 sm:pb-28">
        {articles.length === 0 ? (
          <p className="max-w-3xl text-base leading-relaxed text-ink/65">
            Aucun article pour le moment.
          </p>
        ) : (
          <RevealGroup as="ul" className="grid gap-x-8 gap-y-12 sm:grid-cols-2">
            {articles.map((article) => (
              <RevealChild as="li" key={article.slug}>
                <Link to={`/blog/${article.slug}`} className="group block">
                  {article.imageEnTete?.src ? (
                    <img
                      src={article.imageEnTete.src}
                      alt=""
                      className="aspect-[16/10] w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="aspect-[16/10] w-full bg-ink/10" />
                  )}

                  <p className="mt-5 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-brass-sombre">
                    {[article.format ? libelleFormat(article.format) : null, article.ville]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>

                  <h2 className="mt-3 font-display text-[1.45rem] leading-snug text-ink transition-colors group-hover:text-brass-sombre">
                    {article.titre}
                  </h2>

                  <p className="mt-3 text-[0.95rem] leading-[1.7] text-ink/70">
                    {article.resume}
                  </p>

                  <p className="mt-4 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink/65">
                    {dateLisible(article.datePublication)} · {tempsLecture(article)} min
                  </p>
                </Link>
              </RevealChild>
            ))}
          </RevealGroup>
        )}
      </Section>
    </>
  )
}
