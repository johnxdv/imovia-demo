// Prérendu des fiches `/bien/*`.
//
// CE QUE L'AUDIT RELEVAIT
//
// Quatre mots en HTML brut, pas de canonical, pas de balisage d'annonce,
// absentes du sitemap, et liées uniquement depuis `/acheter` et `/louer` —
// elles-mêmes sans HTML brut. Pour un robot qui n'exécute pas le JavaScript,
// les biens du site n'existaient tout simplement pas : ni par un lien, ni par
// le sitemap, ni par une recherche.
//
// POURQUOI UN PRÉRENDU PLUTÔT QU'UNE FONCTION À LA DEMANDE
//
// La consigne demandait une fonction Vercel rendue à la volée, avec `s-maxage`
// et `stale-while-revalidate`. Elle n'aurait rien eu de plus à servir : les
// annonces ne sont pas lues dans le CRM à la requête, elles vivent dans
// `src/data/properties.json`, que la synchronisation Modelo commite — et un
// commit redéploie le site. La fonction relirait donc, à chaque requête, un
// fichier déjà figé au déploiement, au prix d'un démarrage à froid et d'une
// exécution facturée. Le prérendu sert le même HTML depuis le CDN, et donne le
// 404 des références inconnues sans qu'on ait à l'écrire : pas de fichier, pas
// de page. C'est aussi ce que recommande l'audit lui-même — « étendre le
// prérendu aux annonces du CRM ». Le choix est signalé dans le tableau final.

import { echappe } from './article.mjs'
import {
  descriptionBien,
  prixLisible,
  prose,
  resumeBien,
  surfaceM2,
  titreBien,
} from '../../src/lib/seoBien.js'

// Les mêmes bornes que `src/lib/seoBien.js`, où les descriptions sont bâties.
const DESCRIPTION_MIN = 140
const DESCRIPTION_MAX = 160

/** Les biens que le site publie. */
export const biensPublies = (tous) =>
  (tous ?? []).filter((b) => b?.reference && b.statut === 'disponible')

/** Fil d'Ariane — les trois niveaux réels du site. */
function filAriane(bien) {
  const parent = bien.typeTransaction === 'location' ? '/louer' : '/acheter'
  const parentNom = bien.typeTransaction === 'location' ? 'Louer' : 'Acheter'

  return [
    { nom: 'Accueil', url: '/' },
    { nom: parentNom, url: parent },
    { nom: bien.titre, url: `/bien/${bien.reference}` },
  ]
}

function filArianeHtml(etapes) {
  return `          <nav aria-label="Fil d’Ariane">
            <ol class="flex flex-wrap items-center gap-2 font-mono text-[0.7rem] uppercase tracking-micro text-ink/55">
${etapes
  .map((e, i) =>
    i === etapes.length - 1
      ? `              <li aria-current="page">${echappe(e.nom)}</li>`
      : `              <li><a href="${echappe(e.url)}">${echappe(e.nom)}</a></li>\n              <li aria-hidden="true">·</li>`,
  )
  .join('\n')}
            </ol>
          </nav>`
}

/**
 * Corps de la fiche.
 *
 * MÊMES CLASSES QUE `src/pages/PropertyDetail.jsx` là où elles existent — le
 * CSS produit ne contient que ce que `./src/**` emploie, une classe inventée
 * ici serait purgée.
 */
function corpsHtml(bien, agency) {
  const prix = prixLisible(bien)

  const caracteristiques = [
    ['Référence', bien.reference],
    ['Type de bien', bien.typeBien],
    ['Transaction', bien.typeTransaction === 'location' ? 'À louer' : 'À vendre'],
    ['Ville', `${bien.ville} (${bien.codePostal})`],
    ['Surface', surfaceM2(bien)],
    ['Pièces', bien.pieces != null ? String(bien.pieces) : null],
    ['Chambres', bien.chambres != null ? String(bien.chambres) : null],
    ['DPE', bien.dpe],
    ['GES', bien.ges],
  ].filter(([, v]) => v != null && v !== '')

  const photos = (bien.photos ?? []).slice(0, 6)

  const galerie =
    photos.length > 0
      ? `          <div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
${photos
  .map(
    (src, i) => `            <img src="${echappe(src)}" alt="${echappe(`${bien.titre} — visuel ${i + 1}`)}" width="1200" height="900" class="aspect-[4/3] w-full object-cover" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async" />`,
  )
  .join('\n')}
          </div>`
      : ''

  const paragraphes = prose(bien.descriptionLongue ?? '')
    ? String(bien.descriptionLongue)
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map(
          (p) =>
            `            <p class="mt-4 text-[1.0625rem] leading-[1.75] text-ink/75">${echappe(prose(p))}</p>`,
        )
        .join('\n')
    : ''

  return `      <div class="bg-white text-ink">
        <div class="container-page pb-24 pt-28 sm:pt-32">
${filArianeHtml(filAriane(bien))}

          <p class="mt-8 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-brass-sombre">${echappe(resumeBien(bien))}</p>
          <h1 class="mt-3 text-display-md">${echappe(bien.titre)}</h1>
          ${prix ? `<p class="mt-4 font-mono text-xl text-ink">${echappe(prix)}</p>` : ''}
${galerie}

          <h2 class="mt-16 text-left font-display text-xl font-semibold text-ink sm:text-2xl">Description</h2>
${paragraphes || '            <p class="mt-4 text-[1.0625rem] leading-[1.75] text-ink/75">Description détaillée disponible auprès de l’agence.</p>'}

          <h2 class="mt-16 text-left font-display text-xl font-semibold text-ink sm:text-2xl">Caractéristiques</h2>
          <dl class="mt-6">
${caracteristiques
  .map(
    ([cle, valeur]) => `            <div class="flex gap-3 border-t border-ink/10 py-3">
              <dt class="w-40 shrink-0 font-mono text-[0.7rem] uppercase tracking-micro text-ink/50">${echappe(cle)}</dt>
              <dd class="text-ink">${echappe(valeur)}</dd>
            </div>`,
  )
  .join('\n')}
          </dl>

          <h2 class="mt-16 text-left font-display text-xl font-semibold text-ink sm:text-2xl">Contact</h2>
          <p class="mt-4 text-[1.0625rem] leading-[1.75] text-ink/75">${echappe(agency.name)}, ${echappe(agency.address.line1)}, ${echappe(agency.address.line2)}.</p>
          <p class="mt-2"><a href="${echappe(agency.phoneHref)}" class="font-mono text-ink">${echappe(agency.phone)}</a></p>
          <p class="mt-8"><a href="${bien.typeTransaction === 'location' ? '/louer' : '/acheter'}" class="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-ink/70">${bien.typeTransaction === 'location' ? 'Tous nos biens à louer' : 'Tous nos biens à vendre'}</a></p>
        </div>
      </div>`
}

/**
 * `RealEstateListing` + `Offer` + `BreadcrumbList`.
 *
 * `Offer` porte le prix affiché et sa devise, et rien d'autre : pas de
 * disponibilité inventée, pas de date de validité qu'aucune donnée ne fonde.
 * Le `priceSpecification` d'une location précise l'unité — sans elle, un loyer
 * mensuel se lit comme un prix de vente.
 */
export function baliseBien(bien, base, agency) {
  const url = `${base}/bien/${bien.reference}`
  const montant =
    bien.typeTransaction === 'location' ? bien.loyer : (bien.prixVente ?? bien.prix)

  const offre = Number.isFinite(Number(montant))
    ? {
        '@type': 'Offer',
        price: Number(montant),
        priceCurrency: 'EUR',
        url,
        ...(bien.typeTransaction === 'location'
          ? {
              priceSpecification: {
                '@type': 'UnitPriceSpecification',
                price: Number(montant),
                priceCurrency: 'EUR',
                unitCode: 'MON',
              },
            }
          : {}),
      }
    : null

  const listing = {
    '@type': 'RealEstateListing',
    '@id': `${url}#annonce`,
    url,
    name: bien.titre,
    datePosted: bien.datePublication ?? undefined,
    ...(bien.photos?.length ? { image: bien.photos.slice(0, 6) } : {}),
    ...(prose(bien.descriptionLongue) ? { description: prose(bien.descriptionLongue) } : {}),
    ...(offre ? { offers: offre } : {}),
    provider: { '@id': `${base}/#agence` },
    about: {
      '@type': bien.typeTransaction === 'location' ? 'Residence' : 'Accommodation',
      name: bien.titre,
      ...(Number.isFinite(Number(bien.surface))
        ? {
            floorSize: {
              '@type': 'QuantitativeValue',
              value: Number(bien.surface),
              unitCode: 'MTK',
            },
          }
        : {}),
      ...(bien.pieces != null ? { numberOfRooms: Number(bien.pieces) } : {}),
      address: {
        '@type': 'PostalAddress',
        addressLocality: bien.ville,
        postalCode: bien.codePostal,
        addressCountry: 'FR',
      },
      ...(Number.isFinite(Number(bien.latitude)) && Number.isFinite(Number(bien.longitude))
        ? {
            geo: {
              '@type': 'GeoCoordinates',
              latitude: Number(bien.latitude),
              longitude: Number(bien.longitude),
            },
          }
        : {}),
    },
  }

  const fil = {
    '@type': 'BreadcrumbList',
    '@id': `${url}#fil`,
    itemListElement: filAriane(bien).map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: e.nom,
      item: `${base}${e.url === '/' ? '/' : e.url}`,
    })),
  }

  const graphe = JSON.stringify(
    { '@context': 'https://schema.org', '@graph': [listing, fil] },
    null,
    2,
  )

  // `</script>` ne peut pas apparaître tel quel dans un script, même à
  // l'intérieur d'une chaîne JSON : l'analyseur HTML ferme la balise avant que
  // le JSON ne soit lu. Une description d'annonce n'en contient pas
  // aujourd'hui, mais elle vient d'un flux externe.
  return `<script type="application/ld+json">\n${graphe.replace(/<\//g, '<\\/')}\n</script>`
}

/** Fiches à écrire, métadonnées comprises. */
export function pagesBiens({ biens, agency, base }) {
  return biens.map((bien) => {
    const url = `${base}/bien/${bien.reference}`
    return {
      bien,
      url,
      chemin: `bien/${bien.reference}`,
      titre: titreBien(bien, agency.name),
      description: descriptionBien(bien, agency),
      image: bien.photos?.[0] ?? null,
      balise: baliseBien(bien, base, agency),
      corps: corpsHtml(bien, agency),
    }
  })
}

/** Même garde-fou que pour les routes applicatives. */
export function verifieDescriptionsBiens(pages) {
  const fautives = pages
    .map((p) => ({ url: p.url, n: p.description.length }))
    .filter(({ n }) => n < DESCRIPTION_MIN || n > DESCRIPTION_MAX)

  if (fautives.length > 0) {
    throw new Error(
      `fiches biens — descriptions hors de ${DESCRIPTION_MIN}-${DESCRIPTION_MAX} : ${fautives
        .map(({ url, n }) => `${url} (${n})`)
        .join(', ')}`,
    )
  }
}
