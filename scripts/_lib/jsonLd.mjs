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

// « 57980 DIEBLING » est une ligne postale ; `addressLocality` attend le nom
// de la commune, qui ne s'écrit pas en capitales hors d'une enveloppe.
const CODE_POSTAL = agency.address.line2.slice(0, 5)
const COMMUNE = (() => {
  const brut = agency.address.line2.slice(6)
  return brut.charAt(0) + brut.slice(1).toLowerCase()
})()

/** Fiche de l'agence — identique d'un article à l'autre. */
export function ficheAgence(base = agency.siteUrl) {
  return {
    '@type': 'RealEstateAgent',
    '@id': `${base}/#agence`,
    name: agency.name,
    description: `${agency.baseline} à ${COMMUNE}.`,
    url: base,
    telephone: agency.phone,
    email: agency.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: agency.address.line1,
      postalCode: CODE_POSTAL,
      addressLocality: COMMUNE,
      addressCountry: 'FR',
    },
    geo:
      Number.isFinite(latitude) && Number.isFinite(longitude)
        ? { '@type': 'GeoCoordinates', latitude, longitude }
        : undefined,
    // Horaires d'ouverture dans la notation schema.org. Le samedi, « sur
    // rendez-vous », n'est pas une plage horaire : il n'a rien à y faire — une
    // heure inventée annoncerait au moteur une ouverture qui n'existe pas.
    openingHours: ['Mo-Fr 09:00-12:00', 'Mo-Fr 14:00-17:30'],
    sameAs: agency.social.map((s) => s.href),
    vatID: agency.legal.tva,
    // La carte professionnelle est ce qui autorise l'agence à exercer. Elle
    // est affichée en clair sur le site ; `identifier` est le champ qui permet
    // de la déclarer sans prétendre qu'il s'agit d'un diplôme ou d'un label.
    identifier: {
      '@type': 'PropertyValue',
      name: 'Carte professionnelle',
      value: agency.legal.carteProfessionnelle,
      description: `Délivrée par ${agency.legal.carteDelivreePar}`,
    },
    areaServed: {
      '@type': 'AdministrativeArea',
      name: 'Moselle-Est',
    },
  }
}

/**
 * Le site lui-même.
 *
 * Un nœud discret, et c'est voulu : il dit à un moteur que les pages
 * rencontrées appartiennent à un même site, édité par l'agence. Pas de
 * `SearchAction` — le site n'a pas de recherche interne adressable par URL, et
 * en déclarer une qui ne répond pas est pire que de n'en déclarer aucune.
 */
export function siteWeb(base = agency.siteUrl) {
  return {
    '@type': 'WebSite',
    '@id': `${base}/#site`,
    url: base,
    name: agency.name,
    inLanguage: 'fr-FR',
    publisher: { '@id': `${base}/#agence` },
  }
}

/** Fil d'Ariane, à partir d'étapes `{ nom, url }`. */
export function filAriane(etapes, base = agency.siteUrl, ancre) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${ancre}#fil`,
    itemListElement: etapes.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: e.nom,
      item: `${base}${e.url}`,
    })),
  }
}

/**
 * Balisage de l'accueil — l'entité agence et le site.
 *
 * L'audit le relevait comme critique : l'agence n'était décrite que dans le
 * graphe des articles. Un moteur qui n'avait lu que la page d'accueil — le cas
 * le plus courant — ne trouvait ni adresse, ni téléphone, ni horaires.
 */
export function baliseAccueil(base = agency.siteUrl) {
  return {
    '@context': 'https://schema.org',
    '@graph': [ficheAgence(base), siteWeb(base)],
  }
}

/**
 * Balisage d'une page de commune.
 *
 * La même agence, avec `areaServed` porté sur la commune traitée : c'est le
 * seul champ qui change d'une page à l'autre, et c'est précisément celui qui
 * dit au moteur pourquoi cette page existe. Le `@id` reste celui de l'agence —
 * il n'y en a qu'une, et en déclarer une par commune créerait neuf
 * établissements qui n'existent pas.
 */
export function baliseCommune(commune, base = agency.siteUrl) {
  const url = `${base}/agence-immobiliere/${commune.slug}`

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        ...ficheAgence(base),
        areaServed: {
          '@type': 'City',
          name: commune.nom,
          ...(commune.codeInsee ? { identifier: commune.codeInsee } : {}),
        },
      },
      filAriane(
        [
          { nom: 'Accueil', url: '/' },
          { nom: 'Nos communes', url: '/plan-du-site' },
          { nom: `Agence immobilière à ${commune.nom}`, url: `/agence-immobiliere/${commune.slug}` },
        ],
        base,
        url,
      ),
    ],
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
      filAriane(
        [
          { nom: 'Accueil', url: '/' },
          { nom: 'Articles', url: '/blog' },
          { nom: article.titre, url: `/blog/${article.slug}` },
        ],
        base,
        url,
      ),
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
  return scriptLd(baliseArticle(article, base))
}

/** Un graphe quelconque, sérialisé dans sa balise. */
export function scriptLd(graphe) {
  const json = JSON.stringify(graphe, null, 2).replace(/<\//g, '<\\/')
  return `<script type="application/ld+json">\n${json}\n</script>`
}
