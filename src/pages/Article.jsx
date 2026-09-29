import { Link, useParams } from 'react-router-dom'

import { Section } from '../components/ui/Section'
import { PlanDivider } from '../components/ui/PlanDivider'
import { ArrowLink } from '../components/ui/ArrowLink'
import { Button } from '../components/ui/Button'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { articles, articleParSlug, dateLisible } from '../lib/articles'
import {
  articlesLies,
  decoupeLien,
  groupeSources,
  libelleFormat,
  tempsLecture,
  titreCourt,
  visuelsParSection,
} from '../../api/_lib/articleTexte'

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
//
// ILS DOIVENT AUSSI PORTER LES MÊMES CLASSES, ET DANS CE SENS-CI C'EST VITAL :
// `tailwind.config.js` ne balaie que `./index.html` et `./src/**`. Une classe
// employée par le prérendu et absente d'ici est purgée du CSS produit — elle
// n'existe pas, et la page statique s'affiche de travers sans qu'aucune erreur
// ne le dise. Ce fichier est donc la référence de ce qui existe.

/** Un paragraphe, avec l'ancre contextuelle vers l'estimateur si elle y est. */
function Paragraphe({ texte, className }) {
  return (
    <p className={className}>
      {decoupeLien(texte).map((segment, i) =>
        segment.lien ? (
          <Link
            key={i}
            to="/estimer"
            className="text-brass-sombre underline decoration-brass-sombre/40 underline-offset-4"
          >
            {segment.texte}
          </Link>
        ) : (
          <span key={i}>{segment.texte}</span>
        ),
      )}
    </p>
  )
}

/**
 * Une illustration — photo d'en-tête, photo de corps ou graphique.
 *
 * Le crédit est un lien quand le fournisseur en donne un : les conditions
 * d'usage d'Unsplash imposent de créditer l'auteur par un lien vers sa page.
 *
 * `hero` charge l'image tout de suite au lieu de la différer : l'image
 * d'en-tête est le plus gros élément visible au chargement, et la différer
 * dégrade la mesure que les moteurs en font.
 */
function Illustration({ visuel, hero = false }) {
  if (!visuel?.src) return null

  return (
    <figure className={hero ? 'mt-10' : 'mt-12'}>
      <img
        src={visuel.src}
        alt={visuel.alt ?? ''}
        className={visuel.type === 'graphique' ? 'w-full' : 'aspect-[16/9] w-full object-cover'}
        loading={hero ? 'eager' : 'lazy'}
        decoding={hero ? 'auto' : 'async'}
        fetchpriority={hero ? 'high' : undefined}
      />
      {visuel.credit ? (
        <figcaption className="mt-3 font-mono text-xs text-ink/65">
          {visuel.creditUrl ? (
            <a
              href={visuel.creditUrl}
              rel="nofollow noopener"
              target="_blank"
              className="transition-colors hover:text-ink/70"
            >
              {visuel.credit}
            </a>
          ) : (
            visuel.credit
          )}
        </figcaption>
      ) : null}
    </figure>
  )
}

export default function Article() {
  const { slug } = useParams()
  const article = articleParSlug(slug)

  // `useDocumentTitle` ajoute « — IMMOVIA » : on lui passe donc le titre déjà
  // ramené à cinquante caractères, par la même fonction que le prérendu. Les
  // deux titres sont ainsi identiques, que la page arrive du serveur ou d'une
  // navigation interne.
  useDocumentTitle(article ? titreCourt(article) : 'Article introuvable')

  if (!article) {
    return (
      <Section tone="white" py="pb-24 pt-40 sm:pt-48">
        <div className="max-w-3xl">
          <h1 className="text-display-md text-ink">Article introuvable</h1>
          <p className="mt-6 text-base leading-relaxed text-ink/70">
            Cet article n’existe pas ou n’est plus publié.
          </p>
          <div className="mt-8">
            <ArrowLink to="/blog">Tous les articles</ArrowLink>
          </div>
        </div>
      </Section>
    )
  }

  const ou = article.ville ? ` à ${article.ville}` : ' dans le secteur'
  const sources = groupeSources(article.sources)
  const visuels = visuelsParSection(article)
  const lies = articlesLies(article, articles)

  // Format, commune, date, temps de lecture — jumeau de la ligne du prérendu.
  const meta = [
    article.format ? libelleFormat(article.format) : null,
    article.ville,
    dateLisible(article.datePublication),
    `${tempsLecture(article)} min de lecture`,
  ].filter(Boolean)

  return (
    <Section tone="white" py="pb-24 pt-36 sm:pt-44">
      <article className="max-w-3xl">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-brass-sombre">
          {meta.join(' · ')}
        </p>

        <h1 className="mt-6 font-display text-4xl leading-tight text-ink">{article.titre}</h1>

        <Illustration visuel={{ ...article.imageEnTete, type: 'photo' }} hero />

        <p className="mt-10 text-xl leading-relaxed text-ink/80">{article.resume}</p>

        {article.sections.map((section, i) => (
          <div key={section.question}>
            <section className="mt-14">
              <h2 className="font-display text-[1.6rem] leading-snug text-ink">
                {section.question}
              </h2>
              {section.paragraphes.map((paragraphe, j) => (
                <Paragraphe
                  key={j}
                  texte={paragraphe}
                  className="mt-5 text-[1.0625rem] leading-[1.75] text-ink/75"
                />
              ))}
            </section>
            {(visuels.get(i + 1) ?? []).map((visuel, k) => (
              <Illustration key={k} visuel={visuel} />
            ))}
          </div>
        ))}

        {/* Pas de FAQ sur les articles saisis à la main — le titre seul ne
            doit pas apparaître sans question en dessous. */}
        {article.faq?.length > 0 ? (
          <section className="mt-16">
            <PlanDivider className="mb-10" label="FAQ" />
            <h2 className="font-display text-2xl text-ink">Questions fréquentes</h2>

            {article.faq.map((question) => (
              <div key={question.question} className="mt-8 border-t border-ink/10 pt-6">
                <h3 className="font-display text-xl text-ink">{question.question}</h3>
                <p className="mt-3 text-[1.0625rem] leading-[1.75] text-ink/75">
                  {question.reponse}
                </p>
              </div>
            ))}
          </section>
        ) : null}

        {/* Clôture — jumeau du bloc rendu par `corpsHtml()`. L'intitulé nomme
            la commune traitée : « Estimez votre bien à Forbach » dit où l'on
            va, là où « en savoir plus » ne dit rien.

            C'est le SECOND chemin vers l'estimateur, pas le seul : le premier
            est l'ancre posée dans un paragraphe par `Paragraphe`. Le bloc se lit
            comme une offre, l'ancre se lit comme une phrase — et c'est l'ancre
            qui porte le poids, parce qu'elle est en contexte. */}
        <section className="mt-16 border-t border-ink/10 pt-10">
          <p className="text-lg leading-relaxed text-ink/75">
            Vous vous demandez ce que vaut votre bien{ou} ?
          </p>
          <p className="mt-3 text-base leading-relaxed text-ink/70">
            Notre estimation en ligne s’appuie sur les mêmes relevés de prix que cet article,
            appliqués à l’adresse, à la surface et à l’état de votre logement.
          </p>
          <p className="mt-6">
            <Button to="/estimer" variant="primary">
              Estimez votre bien{ou}
            </Button>
          </p>
        </section>

        {/* Articles liés — la même commune d'abord. Maillage interne autant que
            service au lecteur : deux articles sur Forbach qui se citent disent
            au moteur que le site traite Forbach en profondeur. */}
        {lies.length > 0 ? (
          <section className="mt-16 border-t border-ink/10 pt-10">
            <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-brass-sombre">
              À lire aussi
            </h2>
            <ul className="mt-6 grid gap-6 sm:grid-cols-3">
              {lies.map((autre) => (
                <li key={autre.slug}>
                  <Link to={`/blog/${autre.slug}`} className="group block">
                    {autre.imageEnTete?.src ? (
                      <img
                        src={autre.imageEnTete.src}
                        alt=""
                        className="aspect-[16/10] w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="aspect-[16/10] w-full bg-ink/10" />
                    )}
                    <p className="mt-3 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink/65">
                      {dateLisible(autre.datePublication)}
                    </p>
                    <p className="mt-1.5 font-display text-base leading-snug text-ink transition-colors group-hover:text-brass-sombre">
                      {autre.titre}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Sources extérieures — jumeau du bloc rendu par `corpsHtml()`, une
            entrée par page citée. `nofollow` : ce sont des références, pas des
            recommandations, et certaines renvoient à des concurrents. */}
        {sources.length > 0 ? (
          <section className="mt-16 border-t border-ink/10 pt-8">
            <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-brass-sombre">
              Sources
            </h2>
            <ul className="mt-4">
              {sources.map((source) => (
                <li key={source.url} className="mt-5">
                  <a
                    href={source.url}
                    rel="nofollow noopener"
                    target="_blank"
                    className="font-mono text-xs text-brass-sombre transition-colors hover:text-brass-sombre-sombre/80"
                  >
                    {source.source}
                  </a>
                  <ul>
                    {source.enonces.map((enonce) => (
                      <li
                        key={enonce}
                        className="mt-1.5 font-mono text-xs leading-relaxed text-ink/65"
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

        <div className="mt-16 flex flex-col items-start gap-6 border-t border-ink/10 pt-10 sm:flex-row sm:items-center sm:justify-between">
          <ArrowLink to="/blog">Tous les articles</ArrowLink>
        </div>

        {/* Provenance des chiffres — un article qui cite des prix doit dire d'où
            ils viennent. La liste est produite à la rédaction, pas rédigée. */}
        {article.chiffresCites?.length > 0 ? (
          <details className="mt-12 border-t border-ink/10 pt-8">
            <summary className="cursor-pointer font-mono text-[0.7rem] uppercase tracking-micro text-brass-sombre">
              Provenance des chiffres cités
            </summary>
            <ul className="mt-5 space-y-3">
              {article.chiffresCites.map((chiffre, i) => (
                <li key={i} className="font-mono text-xs leading-relaxed text-ink/65">
                  {chiffre.libelle} — {chiffre.valeur}
                  <span className="text-ink/65"> · {chiffre.source}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        <p className="mt-10 font-mono text-xs text-ink/65">
          <Link to="/estimer" className="transition-colors hover:text-brass-sombre">
            Estimation en ligne
          </Link>{' '}
          · Prix relevés sur le secteur, hors majoration commerciale.
        </p>
      </article>
    </Section>
  )
}
