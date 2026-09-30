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
  /**
   * Type de bien retenu par l'étape carte — et rien d'autre.
   *
   * Le nombre de niveaux relevé sur le bâtiment cliqué y figurait tant que
   * l'immeuble du décor comptait ses étages d'après la BD TOPO®. Il n'en compte
   * plus : un appartement, c'est toujours le même immeuble, et c'est l'ÉTAGE
   * DÉCLARÉ qui compte désormais — celui qui s'allume (voir `declarerEtage`).
   */
  declarerBien: () => {},
  /** Surface habitable en cours de déclaration au curseur. */
  declarerSurface: () => {},
  /**
   * Étage en cours de déclaration. Le décor s'en sert pour deux choses, et
   * deux seulement : les fenêtres de CE niveau-là qui s'allument sur la façade
   * de l'immeuble, et la hauteur à laquelle le balcon d'affinage se pose.
   */
  declarerEtage: () => {},
  /**
   * Options d'affinage retenues à la dernière étape : piscine, terrain,
   * panneaux, terrasse ou balcon, standing. Elles ne dessinent quelque chose
   * qu'une fois l'estimation rendue — avant, rien n'a été demandé au vendeur.
   */
  declarerOptions: () => {},
}

/**
 * LE REPÈRE D'OÙ SE MESURE LE DÉLAI — celui qui sépare le clic sur la carte de
 * l'image où le bien paraît enfin.
 *
 * L'étape carte le pose dès qu'elle tranche sur le type (voir
 * `EstimationBuildingStep`), le décor mesure jusqu'à la première image de la
 * nouvelle architecture (voir `mesurerPremiereImage` dans `DroneScene`). La
 * mesure se lit sous le nom `chantier:type→premiere-image`, dans l'onglet
 * Performances du navigateur ou par `performance.getEntriesByType('measure')`.
 *
 * Ce n'est pas un ornement de mise au point : ce délai était le défaut — une à
 * deux secondes d'attente entre le clic et l'immeuble —, et un chiffre relevé
 * est le seul moyen de savoir qu'il ne revient pas.
 */
export const REPERE_TYPE = 'chantier:type-detecte'

export const ChantierContext = createContext(RIEN)

export const useChantier = () => useContext(ChantierContext)


/**
 * Contenance cadastrale de la parcelle, en mètres carrés — la surface de
 * terrain relevée par la chaîne cadastre au clic sur le bâtiment.
 *
 * L'écran d'affinage s'en sert comme valeur d'ouverture de son curseur de
 * terrain : le vendeur corrige une valeur relevée, il n'en invente pas une.
 * `null` quand la parcelle n'a pas été retrouvée — le curseur part alors de
 * zéro, et rien n'est affirmé du terrain.
 */
export function contenanceParcelle(selection) {
  const m2 = Number(selection?.parcelle?.contenance)
  return Number.isFinite(m2) && m2 > 0 ? m2 : null
}
