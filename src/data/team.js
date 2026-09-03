// Conseillers joignables individuellement depuis la page Équipe.
// Volontairement SANS adresse e-mail : elle ne doit jamais transiter par le
// bundle front. La fonction serverless (api/contact-conseiller.js) la résout
// côté serveur à partir de l'identifiant `id`, via des variables
// d'environnement Vercel.
export const team = [
  {
    id: 'lucas',
    nom: 'Lucas BELLA',
    role: "Directeur d'agence",
    phone: '+33 6 71 01 68 64',
    photo: '1519085360753-af0119f7cbe7',
  },
  {
    id: 'emilie',
    nom: 'Émilie ANDRASCHKE',
    role: 'Conseillère immobilière',
    phone: '+33 7 59 66 24 66',
    photo: '1580489944761-15a19d654956',
  },
]
