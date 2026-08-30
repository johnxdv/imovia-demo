// Coordonnées et informations de l'agence — centralisées pour rester cohérentes
// sur l'ensemble du site (footer, contact, données structurées éventuelles).
export const agency = {
  name: 'Imovia',
  baseline: "Agence immobilière — Bordeaux & Bassin d'Arcachon",
  phone: '05 56 00 00 00',
  phoneHref: 'tel:+33556000000',
  email: 'contact@imovia.fr',
  recrutementEmail: 'recrutement@imovia.fr',
  address: {
    line1: '18 cours de l’Intendance',
    line2: '33000 Bordeaux',
  },
  hours: 'Du lundi au samedi, 9h30 – 19h00',
  // Emprise cartographique (OpenStreetMap) centrée sur le cours de l'Intendance.
  mapBbox: '-0.5820,44.8390,-0.5680,44.8460',
  mapMarker: '44.8425,-0.5750',
  social: [
    { label: 'Instagram', href: 'https://instagram.com', handle: '@imovia' },
    { label: 'LinkedIn', href: 'https://linkedin.com', handle: 'Imovia' },
  ],
}
