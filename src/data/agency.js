// Coordonnées et informations de l'agence — centralisées pour rester cohérentes
// sur l'ensemble du site (footer, contact, mentions légales…).
export const agency = {
  name: 'IMMOVIA',
  baseline: 'Agence immobilière',
  // Domaine canonique — LA SEULE DÉFINITION DE L'HÔTE DANS TOUT LE PROJET.
  //
  // En découlent : les `rel=canonical` et `og:url` du prérendu, les `@id` du
  // balisage schema.org, les adresses du sitemap et la ligne `Sitemap:` du
  // robots.txt — celui-ci est écrit à la construction depuis cette valeur
  // (`scripts/prerender-blog.mjs`) précisément pour qu'il n'y ait pas un
  // second endroit où l'hôte puisse diverger.
  //
  // LE `www` N'EST PAS DÉCORATIF. L'apex `immo-via.com` répond 308 vers
  // `www.immo-via.com` sur tout chemin. Tant que cette valeur portait l'apex,
  // chaque canonique désignait une adresse qui redirige : vingt-deux pages
  // annonçaient comme version de référence une URL qui n'en était pas une.
  siteUrl: 'https://www.immo-via.com',
  phone: '03 72 29 43 76',
  phoneHref: 'tel:+33372294376',
  email: 'contact@immo-via.com',
  // Les candidatures arrivent sur l'adresse générale : la boîte dédiée n'est
  // pas relevée. Le champ reste distinct pour qu'une adresse propre au
  // recrutement puisse revenir sans toucher à la page.
  recrutementEmail: 'contact@immo-via.com',
  address: {
    line1: '41A rue Principale',
    line2: '57980 DIEBLING',
  },
  // URL Google Maps construite depuis l'adresse — pas de clé API requise.
  mapsHref: 'https://www.google.com/maps/search/?api=1&query=41A+rue+Principale+57980+Diebling',
  // Horaires d'ouverture, un jour par ligne — jamais regroupés en « du lundi au
  // vendredi » : le client veut chaque journée lisible séparément, y compris
  // quand cinq d'entre elles sont identiques.
  hours: [
    { jour: 'Lundi', horaire: '9h–12h / 14h–17h30' },
    { jour: 'Mardi', horaire: '9h–12h / 14h–17h30' },
    { jour: 'Mercredi', horaire: '9h–12h / 14h–17h30' },
    { jour: 'Jeudi', horaire: '9h–12h / 14h–17h30' },
    { jour: 'Vendredi', horaire: '9h–12h / 14h–17h30' },
    { jour: 'Samedi', horaire: 'sur rendez-vous' },
  ],
  // Emprise cartographique (OpenStreetMap) centrée sur Diebling (57980).
  //
  // Coordonnées de l'ADRESSE de l'agence, géocodée au numéro sur la Base
  // Adresse Nationale : « 41a Rue Principale 57980 Diebling », correspondance
  // de type `housenumber`, score 0,96 — soit 49.1083 N, 6.9425 E.
  //
  // Les valeurs précédentes — 49.1670 / 6.7530 — plaçaient le repère à quinze
  // kilomètres au nord-ouest. Le géocodage inverse de ce point ne rend AUCUNE
  // adresse : c'était de la rase campagne. La carte de la page Contact montrait
  // donc des champs à un visiteur venu chercher l'agence.
  //
  // À ne pas confondre avec le centre de la commune (49.1028 / 6.9339, le
  // centroïde que publie geo.api.gouv.fr pour le code INSEE 57176) : il est à
  // 700 m d'ici. Le centroïde sert à mesurer des distances entre communes —
  // c'est lui qu'emploie `donnees-locales.mjs` — mais une carte qui répond à
  // « où est l'agence ? » doit pointer la porte, pas le village.
  //
  // `mapBbox` se lit minLon, minLat, maxLon, maxLat — l'inverse de `mapMarker`,
  // qui se lit lat, lon. Les deux ordres viennent d'OpenStreetMap et ne sont pas
  // interchangeables : les intervertir affiche une carte de l'océan Atlantique
  // sans lever la moindre erreur.
  //
  // L'emprise couvre environ 1,7 km sur 1,8 km autour du repère : assez pour
  // situer le village et ses accès, assez serré pour que la rue Principale
  // reste lisible.
  mapBbox: '6.9305,49.1003,6.9545,49.1163',
  mapMarker: '49.1083,6.9425',
  // Profils publics de l'agence. Ils alimentent le pied de page ET le `sameAs`
  // du balisage schema.org — c'est par ce champ qu'un moteur relie le site aux
  // comptes qui portent le même nom.
  //
  // FACEBOOK A ÉTÉ RETIRÉ. L'adresse inscrite ici était
  // `facebook.com/cookie/consent`, la bannière de consentement du réseau :
  // quelqu'un l'avait copiée depuis sa barre d'adresse sans s'être connecté.
  // Elle ne menait à aucune page de l'agence, et la déclarer en `sameAs`
  // revenait à affirmer à Google que l'agence « est aussi » cette page-là.
  // Mieux vaut deux profils vrais que trois dont un faux. À remettre dès que
  // l'adresse réelle est connue.
  social: [
    { label: 'Instagram', href: 'https://www.instagram.com/immovia.fr' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/immovia1/' },
  ],
  // Identité légale — reprise du site immo-via.com actuel (mentions légales).
  legal: {
    formeJuridique: 'SARL',
    capital: '1 500 €',
    siret: '103 333 076 00018',
    rcs: 'RCS Metz 103 333 076',
    tva: 'FR44103333076',
    carteProfessionnelle: 'CPI 5704 2026 000 000 002',
    carteDelivreePar: 'la CCI de Moselle',
    directeurPublication: 'Lucas BELLA',
    siegeSocial: {
      line1: '5 rue Jean Antoine Chaptal',
      line2: '57070 Metz',
    },
    mediation: {
      nom: 'MEDIMMOCONSO',
      adresse: '44505 La Baule Cedex',
      email: 'mediation@medimmoconso.fr',
      site: 'www.medimmoconso.fr',
    },
  },
}
