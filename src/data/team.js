// Conseillers joignables individuellement depuis la page Équipe.
// Volontairement SANS adresse e-mail : elle ne doit jamais transiter par le
// bundle front. La fonction serverless (api/contact-conseiller.js) la résout
// côté serveur à partir de l'identifiant `id`, via des variables
// d'environnement Vercel.
import { localPhoto } from '../lib/format'

// Portraits fournis par l'agence, servis depuis `public/photos/equipe/` et
// déclinés en trois largeurs (320 / 480 / 700) pour les cartes 3/4.
const PORTRAIT_WIDTHS = [320, 480, 700]

export const team = [
  {
    id: 'lucas',
    nom: 'Lucas BELLA',
    role: "Directeur d'agence",
    phone: '+33 6 71 01 68 64',
    photo: localPhoto('/photos/equipe/lucas-bella', PORTRAIT_WIDTHS),
  },
  {
    id: 'emilie',
    nom: 'Émilie ANDRASCHKE',
    role: 'Conseillère immobilière',
    phone: '+33 7 59 66 24 66',
    photo: localPhoto('/photos/equipe/emilie-andraschke', PORTRAIT_WIDTHS),
  },
]
