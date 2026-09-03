// Coordonnées et informations de l'agence — centralisées pour rester cohérentes
// sur l'ensemble du site (footer, contact, mentions légales…).
export const agency = {
  name: 'IMMOVIA',
  baseline: 'Agence immobilière',
  phone: '03 72 29 43 76',
  phoneHref: 'tel:+33372294376',
  email: 'contact@immo-via.com',
  recrutementEmail: 'recrutement@immo-via.com',
  address: {
    line1: '41A rue Principale',
    line2: '57980 DIEBLING',
  },
  // URL Google Maps construite depuis l'adresse — pas de clé API requise.
  mapsHref: 'https://www.google.com/maps/search/?api=1&query=41A+rue+Principale+57980+Diebling',
  hours: 'Du lundi au samedi, 9h30 – 19h00',
  // Emprise cartographique (OpenStreetMap) centrée sur Diebling (57980).
  mapBbox: '6.7410,49.1590,6.7650,49.1750',
  mapMarker: '49.1670,6.7530',
  social: [
    { label: 'Facebook', href: 'https://www.facebook.com/cookie/consent' },
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
