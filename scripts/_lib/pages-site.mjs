// Prérendu des routes applicatives — celles qui n'avaient aucun HTML brut.
//
// CE QUE CE FICHIER RÉPARE
//
// Douze routes partageaient le titre et la description de la coquille Vite,
// n'émettaient aucun H1, aucun canonical et aucune balise de partage avant
// exécution du JavaScript. Googlebot finissait par les voir ; les moteurs
// génératifs, que `robots.txt` prend soin d'autoriser, jamais — ils lisent le
// HTML de la réponse et s'arrêtent là. Les pages transactionnelles du site —
// acheter, louer, estimer — étaient précisément celles qui leur manquaient.
//
// LE RENDU N'EST PAS UN CLONE DE LA PAGE REACT, ET N'A PAS À L'ÊTRE
//
// Il en porte l'en-tête réel — surtitre, H1, chapô, mot pour mot ceux de la
// page — et le contenu qui fait le lien : les biens, les articles, les pages
// de commune, avec de vraies ancres. React prend ensuite la main et remplace
// le tout, comme il le fait déjà sur le blog depuis l'origine : `main.jsx`
// monte avec `createRoot`, qui remplace le contenu du conteneur.
//
// MÊMES CLASSES QUE LES COMPOSANTS, ET CE N'EST PAS COSMÉTIQUE :
// `tailwind.config.js` ne balaie que `./index.html` et `./src/**`. Une classe
// qu'emploierait ce fichier seul est purgée du CSS produit et ne fait rien.
// Toutes celles qui suivent sont reprises de `PageHeader`, de `Section` ou du
// prérendu du blog, donc présentes dans le CSS.

import { echappe } from './article.mjs'
import { META_PAGES } from '../../src/data/metaPages.js'
import { prixLisible, resumeBien } from '../../src/lib/seoBien.js'

/**
 * Bornes d'une méta-description, et la raison du contrôle plus bas.
 *
 * En dessous de 140 caractères, une page de résultats complète la ligne avec
 * ce qu'elle trouve dans la page ; au-dessus de 160, elle coupe, et ce qui
 * saute est la fin. Les douze descriptions de ce fichier sont écrites à la
 * main dans cet intervalle, et `verifieDescriptions` fait échouer la
 * construction si l'une d'elles en sort — une consigne de longueur qui n'est
 * pas vérifiée ne tient pas une saison.
 */
const DESCRIPTION_MIN = 140
const DESCRIPTION_MAX = 160

/** En-tête de page — réplique exacte de `src/components/ui/PageHeader.jsx`. */
function enTeteHtml({ eyebrow, h1, intro, tone = 'ink', eyebrowClassName = '' }) {
  const t =
    tone === 'white'
      ? { header: 'bg-white text-ink', intro: 'text-ink/70' }
      : { header: 'bg-ink text-stone', intro: 'text-stone/75' }

  return `      <header class="${t.header}">
        <div class="container-page pb-14 pt-36 sm:pb-20 sm:pt-44">
          ${eyebrow ? `<p class="eyebrow mb-6 ${eyebrowClassName}">${echappe(eyebrow)}</p>` : ''}
          <h1 class="max-w-4xl text-display-lg">${h1}</h1>
          ${intro ? `<p class="mt-6 max-w-2xl text-lg leading-relaxed ${t.intro}">${echappe(intro)}</p>` : ''}
        </div>
      </header>`
}

/** Corps d'une section, au ton de la page. */
function sectionHtml(tone, contenu) {
  const fond = tone === 'white' ? 'bg-white text-ink' : 'bg-ink text-stone'
  return `      <section class="${fond}">
        <div class="container-page pb-24 pt-4 sm:pb-28">
${contenu}
        </div>
      </section>`
}

/**
 * Liste de biens, en vraies ancres vers chaque fiche.
 *
 * C'est le point précis que relevait l'audit : les fiches `/bien/*` n'étaient
 * liées que depuis `/acheter` et `/louer`, elles-mêmes sans HTML brut. Un
 * robot n'avait donc aucun chemin pour les atteindre — ni lien, ni sitemap.
 */
function listeBiensHtml(biens) {
  if (biens.length === 0) {
    return '          <p class="text-lg text-ink/70">Aucun bien disponible pour le moment.</p>'
  }

  return `          <ul class="mt-8">
${biens
  .map((b) => {
    const prix = prixLisible(b)
    return `            <li class="border-t border-ink/10 py-6">
              <a href="/bien/${echappe(b.reference)}" class="group block">
                <p class="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-brass-sombre">${echappe(resumeBien(b))}</p>
                <h2 class="mt-2 font-display text-[1.45rem] leading-snug text-ink">${echappe(b.titre)}</h2>
                ${prix ? `<p class="mt-2 font-mono text-[0.95rem] text-ink/70">${echappe(prix)}</p>` : ''}
              </a>
            </li>`
  })
  .join('\n')}
          </ul>`
}

/** Liste de liens internes simples, au ton de la page. */
function liensHtml(liens, tone = 'ink') {
  const couleur = tone === 'white' ? 'text-ink/70' : 'text-stone/70'
  return `          <ul class="mt-8">
${liens
  .map(
    ([href, libelle, detail]) => `            <li class="border-t border-brass/20 py-4">
              <a href="${echappe(href)}" class="font-display text-lg ${tone === 'white' ? 'text-ink' : 'text-stone'}">${echappe(libelle)}</a>
              ${detail ? `<p class="mt-1 text-[0.95rem] leading-relaxed ${couleur}">${echappe(detail)}</p>` : ''}
            </li>`,
  )
  .join('\n')}
          </ul>`
}

/**
 * Les routes prérendues, leur contenu et leurs métadonnées.
 *
 * `/favoris` n'y est pas : elle ne contient que ce que le visiteur y a rangé
 * depuis son propre navigateur, elle porte un `noindex`, et un prérendu n'y
 * mettrait qu'une liste vide. `/seo` non plus, pour la raison inverse — c'est
 * l'administration éditoriale.
 */
export function pagesSite({ agency, articles, communes, biens }) {
  const ventes = biens.filter((b) => b.typeTransaction === 'vente')
  const locations = biens.filter((b) => b.typeTransaction === 'location')

  const liensArticles = articles
    .slice(0, 6)
    .map((a) => [`/blog/${a.slug}`, a.titre, a.ville ?? null])

  const liensCommunes = communes.map((c) => [
    `/agence-immobiliere/${c.slug}`,
    `Agence immobilière à ${c.nom}`,
    null,
  ])

  return [
    {
      url: '/',
      ...META_PAGES['/'],
      ogType: 'website',
      // Le H1 de `src/components/home/Hero.jsx`, à la lettre. Les deux
      // fragments y sont deux `span` insécables : la coupe est voulue.
      corps:
        enTeteHtml({
          eyebrow: agency.baseline,
          h1: 'L’immobilier, avec exigence et proximité.',
          intro: `${agency.name} accompagne les projets d’achat, de vente et de location dans le secteur de la Moselle-Est, depuis son bureau de ${agency.address.line1}, ${agency.address.line2}.`,
        }) +
        '\n' +
        sectionHtml(
          'ink',
          `          <h2 class="text-display-md text-stone">Nos services</h2>
${liensHtml(
  [
    ['/estimer', 'Estimer mon bien', 'Estimation en ligne gratuite à partir de l’adresse du bien.'],
    ['/acheter', 'Acheter', `${ventes.length} bien${ventes.length > 1 ? 's' : ''} à la vente actuellement en ligne.`],
    ['/louer', 'Louer', `${locations.length} bien${locations.length > 1 ? 's' : ''} à la location actuellement en ligne.`],
    ['/vendre', 'Vendre', 'De l’estimation à la signature, étape par étape.'],
    ['/equipe', 'L’équipe', null],
    ['/contact', 'Contact', `${agency.phone} — ${agency.email}`],
  ],
  'ink',
)}`,
        ),
    },

    {
      url: '/estimer',
      ...META_PAGES['/estimer'],
      ogType: 'website',
      corps:
        enTeteHtml({
          eyebrow: 'Estimation',
          // Le H1 de `EstimationIntro`, mot pour mot.
          h1: 'Estimez votre bien gratuitement',
          intro:
            'L’estimation s’appuie sur l’adresse du bien, sa surface et son état, croisés avec les relevés de prix du secteur. Elle est immédiate et sans engagement.',
        }) +
        '\n' +
        sectionHtml(
          'ink',
          `          <h2 class="text-display-md text-stone">Estimation par commune</h2>
${liensHtml(liensCommunes, 'ink')}`,
        ),
    },

    {
      url: '/acheter',
      ...META_PAGES['/acheter'],
      ogType: 'website',
      corps:
        enTeteHtml({
          eyebrow: 'Acheter',
          eyebrowClassName: '!text-sm sm:!text-base !text-bottle',
          h1: 'Nos biens à la vente',
          intro:
            'Découvrez les biens actuellement disponibles. Affinez selon vos critères, puis contactez-nous pour organiser une visite.',
          tone: 'white',
        }) +
        '\n' +
        sectionHtml('white', listeBiensHtml(ventes)),
    },

    {
      url: '/louer',
      ...META_PAGES['/louer'],
      ogType: 'website',
      corps:
        enTeteHtml({
          eyebrow: 'Louer',
          eyebrowClassName: '!text-sm sm:!text-base !text-bottle',
          h1: 'Nos biens à la location',
          intro:
            'Découvrez les biens actuellement disponibles. Affinez selon vos critères, puis contactez-nous pour organiser une visite.',
          tone: 'white',
        }) +
        '\n' +
        sectionHtml('white', listeBiensHtml(locations)),
    },

    {
      url: '/vendre',
      ...META_PAGES['/vendre'],
      ogType: 'website',
      corps:
        enTeteHtml({
          eyebrow: 'Vendre',
          eyebrowClassName: '!text-sm sm:!text-base',
          h1: 'Une stratégie étudiée, structurée,<br />et sur mesure',
          intro:
            'De l’estimation à la signature définitive, nous vous accompagnons à chaque étape de votre projet de vente.',
        }) +
        '\n' +
        sectionHtml(
          'ink',
          `          <h2 class="text-display-md text-stone">Les étapes</h2>
${liensHtml(
  [
    ['/estimer', 'Estimation', 'Le prix de départ, établi sur les relevés du secteur.'],
    ['/vendre', 'Stratégie', 'Le plan de commercialisation du bien.'],
    ['/vendre', 'Diffusion', 'La mise en ligne et la visibilité de l’annonce.'],
    ['/vendre', 'Sélection', 'Le tri et la qualification des acquéreurs.'],
    ['/vendre', 'Signature', 'Le compromis puis l’acte définitif.'],
  ],
  'ink',
)}`,
        ),
    },

    {
      url: '/equipe',
      ...META_PAGES['/equipe'],
      ogType: 'website',
      corps: enTeteHtml({
        eyebrow: 'L’équipe',
        h1: 'Les visages derrière l’agence.',
        intro:
          'Chaque projet mérite une attention particulière. Notre équipe vous accompagne avec écoute, transparence et exigence, de la première rencontre jusqu’à sa concrétisation. Contactez directement la personne de votre choix.',
      }),
    },

    {
      url: '/contact',
      ...META_PAGES['/contact'],
      ogType: 'website',
      corps:
        enTeteHtml({
          eyebrow: 'Contact',
          h1: 'Parlons de votre projet.',
          intro:
            'Une question, une visite, une estimation ? Écrivez-nous ou passez nous voir. Nous répondons vite.',
        }) +
        '\n' +
        sectionHtml(
          'ink',
          `          <p class="text-stone">${echappe(agency.name)}<br />${echappe(agency.address.line1)}<br />${echappe(agency.address.line2)}</p>
          <p class="mt-6"><a href="${echappe(agency.phoneHref)}" class="font-mono text-stone">${echappe(agency.phone)}</a></p>
          <p class="mt-2"><a href="mailto:${echappe(agency.email)}" class="font-mono text-stone">${echappe(agency.email)}</a></p>
          <dl class="mt-8 space-y-1">
${agency.hours
  .map(
    ({ jour, horaire }) => `            <div class="flex gap-3 text-stone">
              <dt class="w-24 shrink-0">${echappe(jour)}</dt>
              <dd class="font-mono text-sm text-stone/80">${echappe(horaire)}</dd>
            </div>`,
  )
  .join('\n')}
          </dl>`,
        ),
    },

    {
      url: '/recrutement',
      ...META_PAGES['/recrutement'],
      ogType: 'website',
      corps: enTeteHtml({
        eyebrow: 'Recrutement',
        h1: 'Faire de l’immobilier autrement, avec nous.',
        intro:
          'Rejoignez une agence immobilière où proximité, exigence et innovation donnent une autre dimension au métier.',
      }),
    },

    {
      url: '/espace-vendeur',
      ...META_PAGES['/espace-vendeur'],
      ogType: 'website',
      corps: enTeteHtml({
        eyebrow: agency.name,
        h1: 'Espace vendeur',
        intro: 'Suivez la commercialisation de votre bien : visites, retours et offres.',
      }),
    },

    {
      url: '/mentions-legales',
      ...META_PAGES['/mentions-legales'],
      ogType: 'website',
      corps: enTeteHtml({
        eyebrow: 'Informations légales',
        h1: 'Mentions légales',
        intro:
          'Informations relatives à l’éditeur, à la direction de la publication et à l’hébergement de ce site.',
      }),
    },

    {
      url: '/confidentialite',
      ...META_PAGES['/confidentialite'],
      ogType: 'website',
      corps: enTeteHtml({
        eyebrow: 'Informations légales',
        h1: 'Politique de confidentialité',
        intro:
          'Comment ce site collecte, utilise et conserve vos données personnelles, et comment exercer vos droits.',
      }),
    },

    {
      url: '/plan-du-site',
      ...META_PAGES['/plan-du-site'],
      ogType: 'website',
      corps:
        enTeteHtml({
          eyebrow: 'Plan du site',
          h1: 'Toutes les pages, d’un coup d’œil.',
          intro: 'La structure complète du site et l’ensemble de nos biens en ligne.',
        }) +
        '\n' +
        sectionHtml(
          'ink',
          `          <h2 class="text-display-md text-stone">Le site</h2>
${liensHtml(
  [
    ['/', 'Accueil', null],
    ['/estimer', 'Estimer mon bien', null],
    ['/acheter', 'Acheter', null],
    ['/louer', 'Louer', null],
    ['/vendre', 'Vendre', null],
    ['/equipe', 'L’équipe', null],
    ['/contact', 'Contact', null],
    ['/recrutement', 'Recrutement', null],
    ['/espace-vendeur', 'Espace vendeur', null],
    ['/blog', 'Articles', null],
    ['/mentions-legales', 'Mentions légales', null],
    ['/confidentialite', 'Politique de confidentialité', null],
  ],
  'ink',
)}
          <h2 class="mt-16 text-display-md text-stone">Nos biens</h2>
${liensHtml(
  biens.map((b) => [`/bien/${b.reference}`, b.titre, resumeBien(b)]),
  'ink',
)}
          <h2 class="mt-16 text-display-md text-stone">Nos communes</h2>
${liensHtml(liensCommunes, 'ink')}
          <h2 class="mt-16 text-display-md text-stone">Derniers articles</h2>
${liensHtml(liensArticles, 'ink')}`,
        ),
    },
  ]
}

/**
 * Fait échouer la construction si une description sort de l'intervalle.
 *
 * Volontairement brutal : une description trop longue ne casse rien, elle se
 * fait simplement couper dans les résultats — c'est exactement le genre de
 * défaut qui survit des années parce que rien ne le signale.
 */
export function verifieDescriptions(pages) {
  // `pages` porte les valeurs de `META_PAGES` : vérifier l'un vérifie l'autre.
  const fautives = pages
    .map((p) => ({ url: p.url, n: p.description.length }))
    .filter(({ n }) => n < DESCRIPTION_MIN || n > DESCRIPTION_MAX)

  if (fautives.length > 0) {
    const detail = fautives.map(({ url, n }) => `${url} (${n})`).join(', ')
    throw new Error(
      `méta-descriptions hors de ${DESCRIPTION_MIN}-${DESCRIPTION_MAX} caractères : ${detail}`,
    )
  }
}

export { prixLisible, resumeBien }
