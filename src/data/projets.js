// Nature de projet — proposée dans le formulaire de contact conseiller.
// Partagée entre le front (select) et la fonction serverless (validation),
// pour ne jamais laisser les deux listes diverger.
export const PROJETS = [
  { value: 'acheter', label: 'Acheter un bien' },
  { value: 'louer', label: 'Louer un bien' },
  { value: 'vendre', label: 'Vendre un bien' },
  { value: 'estimer', label: 'Estimer un bien' },
  { value: 'investir', label: 'Investir dans un bien' },
  { value: 'gestion-locative', label: 'Mettre un bien en gestion locative' },
]
