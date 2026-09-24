import { Link, useParams } from 'react-router-dom'

import { Section } from '../components/ui/Section'
import { PlanDivider } from '../components/ui/PlanDivider'
import { ArrowLink } from '../components/ui/ArrowLink'
import { Button } from '../components/ui/Button'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { articleParSlug, dateLisible } from '../lib/articles'
import { groupeSources, titreCourt } from '../../api/_lib/articleTexte'

// Un article.
//
// ATTENTION — CETTE PAGE A UN JUMEAU.
//
// `corpsHtml()` dans `scripts/_lib/article.mjs` rend le même article en HTML
// statique, pour les robots qui n'exécutent pas de JavaScript. Les deux rendus
// doivent garder la MÊME hiérarchie de titres : `h1` pour le titre, `h2` pour
// chaque question de section, `h2` pour « Questions fréquentes », `h3` pour
// chaque question de la FAQ. Une divergence donnerait deux lectures
// différentes du même article selon le lecteur, et le balisage `FAQPage`
// décrirait une structure que la page visible ne porte pas.

export default function Article() {
  const { slug } = useParams()
  const article = articleParSlug(slug)

  // `useDocumentTitle` ajoute « — IMMOVIA » : on lui passe donc le titre déjà
  // ramené à cinquante caractères, par la même fonction que le prérendu. Les
  // deux titres sont ainsi identiques, que la page arrive du serveur ou d'une
  // navigation interne.
  useDocumentTitle(article ? titreCourt(article) : 'Article introuvable')

  const ou = article?.ville ? ` à ${article.ville}` : ' dans le secteur'
  const sources = groupeSources(article?.sources)

  if (!article) {
    return (
      <Section tone="ink" py="pb-24 pt-40 sm:pt-48">
        <div className="max-w-3xl">
          <h1 className="text-display-md text-stone">Article introuvable</h1>
          <p className="mt-6 text-base leading-relaxed text-stone/70">
            Cet article n’existe pas ou n’est plus publié.
          </p>
          <div className="mt-8">
            <ArrowLink to="/blog">Tous les articles</ArrowLink>
          </div>
        </div>
      </Section>
    )
  }

  return (
    <Section tone="ink" py="pb-24 pt-36 sm:pt-44">
      <article className="max-w-3xl">
        <p className="eyebrow">
          {article.ville} · {dateLisible(article.datePublication)}
        </p>

        <h1 className="mt-6 text-display-md text-stone">{article.titre}</h1>

        <p className="mt-6 text-lg leading-relaxed text-stone/80">{article.resume}</p>

        {article.image?.src ? (
          <figure className="mt-10">
            <img
              src={article.image.src}
              alt={article.image.alt}
              className="w-full"
              loading="lazy"
            />
            {article.image.credit ? (
              <figcaption className="mt-3 font-mono text-xs text-stone/45">
                {article.image.credit}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        <PlanDivider className="mt-12" />

        {article.sections.map((section) => (
          <section key={section.question} className="mt-12">
            <h2 className="font-display text-2xl text-stone">{section.question}</h2>
            {section.paragraphes.map((paragraphe, i) => (
              <p key={i} className="mt-4 text-base leading-relaxed text-stone/75">
                {paragraphe}
              </p>
            ))}
          </section>
        ))}

        {/* Pas de FAQ sur les articles saisis à la main — le titre seul ne
            doit pas apparaître sans question en dessous. */}
        {article.faq?.length > 0 ? (
          <section className="mt-16">
            <PlanDivider className="mb-10" label="FAQ" />
            <h2 className="font-display text-2xl text-stone">Questions fréquentes</h2>

            {article.faq.map((question) => (
              <div key={question.question} className="mt-8 border-t border-white/10 pt-6">
                <h3 className="font-display text-xl text-stone">{question.question}</h3>
                <p className="mt-3 text-base leading-relaxed text-stone/75">{question.reponse}</p>
              </div>
            ))}
          </section>
        ) : null}

        {/* Sources extérieures — jumeau du bloc rendu par `corpsHtml()`, une
            entrée par page citée. `nofollow` : ce sont des références, pas des
            recommandations, et certaines renvoient à des concurrents. */}
        {sources.length > 0 ? (
          <section className="mt-16 border-t border-white/10 pt-8">
            <h2 className="eyebrow">Sources</h2>
            <ul className="mt-4">
              {sources.map((source) => (
                <li key={source.url} className="mt-5">
                  <a
                    href={source.url}
                    rel="nofollow noopener"
                    target="_blank"
                    className="font-mono text-xs text-brass transition-colors hover:text-brass/80"
                  >
                    {source.source}
                  </a>
                  <ul>
                    {source.enonces.map((enonce) => (
                      <li
                        key={enonce}
                        className="mt-1.5 font-mono text-xs leading-relaxed text-stone/55"
                      >
                        {enonce}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Clôture — jumeau du bloc rendu par `corpsHtml()`. L'intitulé nomme
            la commune traitée : « Estimez votre bien à Forbach » dit où l'on
            va, là où « en savoir plus » ne dit rien. */}
        <section className="mt-16 border-t border-white/10 pt-10">
          <p className="text-lg leading-relaxed text-stone/80">
            Vous vous demandez ce que vaut votre bien{ou} ?
          </p>
          <p className="mt-3 text-base leading-relaxed text-stone/65">
            Notre estimation en ligne s’appuie sur les mêmes relevés de prix que cet article,
            appliqués à l’adresse, à la surface et à l’état de votre logement.
          </p>
          <p className="mt-6">
            <Button to="/estimer" variant="primary">
              Estimez votre bien{ou}
            </Button>
          </p>
        </section>

        <div className="mt-16 flex flex-col items-start gap-6 border-t border-white/10 pt-10 sm:flex-row sm:items-center sm:justify-between">
          <ArrowLink to="/blog">Tous les articles</ArrowLink>
        </div>

        {/* Provenance des chiffres — un article qui cite des prix doit dire d'où
            ils viennent. La liste est produite à la rédaction, pas rédigée. */}
        {article.chiffresCites?.length > 0 ? (
          <details className="mt-12 border-t border-white/10 pt-8">
            <summary className="cursor-pointer font-mono text-[0.7rem] uppercase tracking-micro text-brass">
              Provenance des chiffres cités
            </summary>
            <ul className="mt-5 space-y-3">
              {article.chiffresCites.map((chiffre, i) => (
                <li key={i} className="font-mono text-xs leading-relaxed text-stone/55">
                  {chiffre.libelle} — {chiffre.valeur}
                  <span className="text-stone/35"> · {chiffre.source}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        <p className="mt-10 font-mono text-xs text-stone/35">
          <Link to="/estimer" className="transition-colors hover:text-brass">
            Estimation en ligne
          </Link>{' '}
          · Prix relevés sur le secteur, hors majoration commerciale.
        </p>
      </article>
    </Section>
  )
}
