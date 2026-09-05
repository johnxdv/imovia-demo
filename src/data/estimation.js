/**
 * Étapes affichées pendant l'analyse. Les durées sont purement visuelles : il
 * n'y a encore aucun calcul en arrière-plan, le vrai enchaînement les
 * remplacera. Total = 12 s, réparties à parts égales entre les trois étapes.
 */
export const ANALYSIS_STEPS = [
  { id: 'batiment', label: 'Expertise du bien…', done: 'Bien expertisé', durationMs: 4000 },
  { id: 'marche', label: 'Étude comparative de marché…', done: 'Étude de marché réalisée', durationMs: 4000 },
  { id: 'calcul', label: 'Calcul de l’estimation…', done: 'Estimation calculée', durationMs: 4000 },
]

/**
 * Repères de marché affichés pendant l'attente. Volontairement factuels et
 * vérifiables — un chiffre inventé pendant une estimation décrédibiliserait
 * tout le parcours.
 */
export const DID_YOU_KNOW = [
  'Depuis 2025, les logements classés G au DPE ne peuvent plus être proposés à la location nue en France métropolitaine.',
  'Le diagnostic de performance énergétique est valable dix ans, mais il doit être refait après des travaux de rénovation importants.',
  'Deux biens identiques peuvent se négocier très différemment d’une rue à l’autre : l’emplacement reste le premier critère de valeur.',
  'Les transactions immobilières sont publiques : la base DVF recense les ventes des cinq dernières années, adresse par adresse.',
  'Un bien correctement estimé dès la mise en vente se vend en moyenne bien plus vite qu’un bien surévalué puis rebaissé.',
]

/**
 * Créneaux de rappel proposés à la dernière étape du parcours.
 * `phrase` porte la forme en milieu de phrase (« contactera aujourd’hui »),
 * `label` la forme autonome utilisée sur le bouton et dans la bulle de
 * réponse — les deux diffèrent uniquement par la casse.
 */
export const CALLBACK_SLOTS = [
  { id: 'aujourdhui', label: 'Aujourd’hui', phrase: 'aujourd’hui' },
  { id: 'demain-matin', label: 'Demain matin', phrase: 'demain matin' },
  { id: 'demain-apres-midi', label: 'Demain après-midi', phrase: 'demain après-midi' },
  { id: 'semaine', label: 'Dans la semaine', phrase: 'dans la semaine' },
]

/**
 * Fourchette du prix de démonstration. Le calcul réel (base DVF) n'est pas
 * encore branché : cette valeur n'a qu'une fonction d'habillage, et le montant
 * affiché à l'écran final est de toute façon flouté.
 */
const PLACEHOLDER_MIN = 200000
const PLACEHOLDER_MAX = 450000

/** Montant fictif, arrondi au millier — un prix « rond » sonnerait faux. */
export function placeholderEstimate() {
  const raw = PLACEHOLDER_MIN + Math.random() * (PLACEHOLDER_MAX - PLACEHOLDER_MIN)
  return Math.round(raw / 1000) * 1000
}
