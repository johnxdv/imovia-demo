import { Link } from 'react-router-dom'

import { PageHeader } from '../components/ui/PageHeader'
import { Section } from '../components/ui/Section'
import { RevealGroup, RevealChild } from '../components/ui/Reveal'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { articles, dateLisible } from '../lib/articles'

// Liste des articles.
//
// Cette page est atteignable par un seul lien du site, dans le pied de page,
// et par le sitemap. Elle n'apparaît ni dans la navigation principale ni dans
// aucun menu — c'est voulu (voir `src/components/layout/Footer.jsx`).

export default function Blog() {
  useDocumentTitle('Articles')

  return (
    <>
      <PageHeader
        eyebrow="Le marché, vu du secteur"
        title="Articles"
        intro="Ce que nous observons sur le marché immobilier de la Moselle-Est, chiffres à l’appui."
      />

      <Section tone="ink" py="pb-24 pt-4 sm:pb-28">
        <div className="max-w-3xl">
          {articles.length === 0 ? (
            <p className="text-base leading-relaxed text-stone/60">
              Aucun article pour le moment.
            </p>
          ) : (
            <RevealGroup as="ul">
              {articles.map((article) => (
                <RevealChild as="li" key={article.slug} className="border-t border-white/10">
                  <Link
                    to={`/blog/${article.slug}`}
                    className="group block py-8 transition-colors hover:bg-white/[0.02]"
                  >
                    <p className="eyebrow">
                      {article.ville} · {dateLisible(article.datePublication)}
                    </p>
                    <h2 className="mt-3 font-display text-2xl text-stone transition-colors group-hover:text-brass">
                      {article.titre}
                    </h2>
                    <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone/70">
                      {article.resume}
                    </p>
                  </Link>
                </RevealChild>
              ))}
            </RevealGroup>
          )}
        </div>
      </Section>
    </>
  )
}
