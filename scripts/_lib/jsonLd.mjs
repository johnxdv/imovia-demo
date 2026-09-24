// Balisage structuré schema.org des articles.
//
// Trois objets, comme demandé : `Article`, `FAQPage`, et la fiche de l'agence.
//
// SUR LE TYPE DE LA FICHE AGENCE
//
// `RealEstateAgent` est employé plutôt que `LocalBusiness` : c'en est un
// sous-type direct dans le vocabulaire schema.org, donc tout consommateur qui
// attend un `LocalBusiness` le reconnaît comme tel, et il dit en plus de quel
// commerce il s'agit. Redescendre à `LocalBusiness` ne ferait perdre que cette
// précision.
//
// OÙ CE BALISAGE ATTERRIT
//
// Uniquement dans les pages prérendues (`scripts/prerender-blog.mjs`), jamais
// injecté par React. C'est la seule version que lisent les robots, qui
// n'exécutent pas de JavaScript ; l'injecter aussi côté client reviendrait à
// entretenir deux copies du même balisage pour un lecteur qui n'existe pas.

import { agency } from '../../src/data/agency.js'

const [latitude, longitude] = String(agency.mapMarker).split(',').map(Number)

/** Fiche de l'agence — identique d'un article à l'autre. */
export function ficheAgence(base = agency.siteUrl) {
  return {
    '@type': 'RealEstateAgent',
    '@id': `${base}/#agence`,
    name: agency.name,
    description: `${agency.baseline} à ${agency.address.line2.replace(/^\d+\s*/, '')}.`,
    url: base,
    telephone: agency.phone,
    email: agency.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: agency.address.line1,
      postalCode: agency.address.line2.slice(0, 5),
      addressLocality: agency.address.line2.slice(6),
      addressCountry: 'FR',
    },
    geo:
      Number.isFinite(latitude) && Number.isFinite(longitude)
        ? { '@type': 'GeoCoordinates', latitude, longitude }
        : undefined,
    // « Du lundi au samedi, 9h30 – 19h00 », dans la notation attendue.
    openingHours: 'Mo-Sa 09:30-19:00',
    sameAs: agency.social.map((s) => s.href),
    vatID: agency.legal.tva,
  }
}

/** Article + FAQ + agence, dans un seul graphe. */
export function baliseArticle(article, base = agency.siteUrl) {
  const url = `${base}/blog/${article.slug}`
  const image = article.image?.src
    ? article.image.src.startsWith('http')
      ? article.image.src
      : `${base}${article.image.src}`
    : undefined

  const agence = ficheAgence(base)

  // Une `FAQPage` sans question est un balisage qui annonce une structure que
  // la page ne porte pas — les moteurs le traitent comme trompeur, ce qui coûte
  // plus cher que son absence. Les articles saisis à la main n'ont pas de FAQ :
  // le nœud est alors simplement omis du graphe.
  const faq =
    Array.isArray(article.faq) && article.faq.length > 0
      ? {
          '@type': 'FAQPage',
          '@id': `${url}#faq`,
          mainEntity: article.faq.map((q) => ({
            '@type': 'Question',
            name: q.question,
            acceptedAnswer: { '@type': 'Answer', text: q.reponse },
          })),
        }
      : null

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: article.titre,
        description: article.resume,
        datePublished: article.datePublication,
        dateModified: article.dateModification ?? article.datePublication,
        inLanguage: 'fr-FR',
        image,
        author: { '@type': 'Organization', name: agency.name, url: base },
        publisher: { '@id': agence['@id'] },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        // Les moteurs génératifs s'appuient sur `about` pour situer un contenu
        // local : la commune traitée y est nommée explicitement.
        about: article.ville ? { '@type': 'Place', name: article.ville } : undefined,
        // Les sources extérieures reprises dans le texte. `citation` est le
        // champ prévu pour cela : il dit aux moteurs qu'un chiffre de
        // l'article vient d'ailleurs et où, plutôt que de le laisser passer
        // pour une mesure de l'agence.
        citation:
          Array.isArray(article.sources) && article.sources.length > 0
            ? article.sources.map((s) => ({
                '@type': 'CreativeWork',
                name: s.enonce,
                publisher: { '@type': 'Organization', name: s.source },
                url: s.url,
              }))
            : undefined,
        articleSection: article.categorie ?? undefined,
      },
      faq,
      agence,
    ].filter(Boolean),
  }
}

/**
 * Balisage sérialisé, prêt à poser dans une balise `<script>`.
 *
 * `</` est neutralisé : une réponse de modèle contenant `</script>` dans un
 * texte fermerait la balise et ferait passer la suite de l'article pour du
 * code. C'est la seule injection possible ici, et elle se règle à la source.
 */
export function baliseHtml(article, base = agency.siteUrl) {
  const json = JSON.stringify(baliseArticle(article, base), null, 2).replace(/<\//g, '<\\/')
  return `<script type="application/ld+json">\n${json}\n</script>`
}
