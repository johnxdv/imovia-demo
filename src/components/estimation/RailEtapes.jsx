/**
 * Rail d'étapes du parcours d'estimation — la file de points sur le flanc droit
 * de l'écran.
 *
 * Remplace la barre de progression qui courait sous la navbar : même
 * information, même sémantique ARIA (`progressbar` et son pourcentage), mais
 * l'habillage de la maquette de référence — gris clair pour les étapes à venir,
 * laiton pour celles qui sont franchies, anthracite agrandi pour celle en
 * cours (voir `.rail-etapes` dans `src/index.css`).
 *
 * Purement indicatif : les points ne sont pas cliquables. Revenir en arrière se
 * fait par les liens « Retour » des écrans, seuls à savoir ce qu'un retour
 * implique à leur étape.
 */
export function RailEtapes({ total, index, pourcentage, label }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pourcentage}
      aria-label={label}
      className="rail-etapes"
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={[
            'rail-point',
            i < index ? 'est-franchie' : '',
            i === index ? 'est-courante' : '',
          ].join(' ')}
        />
      ))}
    </div>
  )
}
