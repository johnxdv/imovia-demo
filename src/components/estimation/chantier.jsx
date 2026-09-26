import { createContext, useContext } from 'react'

/**
 * Canal par lequel les étapes du parcours renseignent le décor 3D — et lui
 * seul (voir [`DroneScene`](./DroneScene.jsx)).
 *
 * Pourquoi un contexte plutôt que des props : ce qui intéresse la scène est
 * connu au fond du parcours — le type de bien est détecté dans l'étape carte,
 * la surface est déclarée dans la fenêtre qu'elle ouvre — et n'a rien à faire
 * dans la signature des composants intermédiaires. Un contexte laisse la
 * scène se brancher sur nos données réelles sans qu'aucune étape n'ait à
 * transporter, pour le compte d'un décor, des valeurs dont elle n'a que faire.
 *
 * Rien d'autre ne passe par là : ni validation, ni navigation, ni charge utile
 * du calcul, qui continuent de remonter par les callbacks existants. Hors du
 * parcours d'estimation, les deux fonctions ne font rien — un composant du
 * tunnel réutilisé ailleurs n'a donc pas à savoir qu'un décor existe.
 */
const RIEN = {
  /** Type de bien retenu par l'étape carte, et nombre de niveaux relevé. */
  declarerBien: () => {},
  /** Surface habitable en cours de déclaration au curseur. */
  declarerSurface: () => {},
}

export const ChantierContext = createContext(RIEN)

export const useChantier = () => useContext(ChantierContext)

/**
 * Nombre de niveaux du bâtiment cliqué, tel que la BD TOPO® le livre avec le
 * polygone — la seule donnée de gabarit que la carte remonte sans un appel de
 * plus. Le décor s'en sert pour compter les étages de l'immeuble ; `null` quand
 * l'attribut manque (le cas courant hors des villes), et le décor retombe alors
 * sur la surface déclarée.
 */
export function niveauxReleves(selection) {
  const niveaux = Number(selection?.properties?.nombre_d_etages)
  return Number.isFinite(niveaux) && niveaux > 0 ? niveaux : null
}
