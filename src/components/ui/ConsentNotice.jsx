import { Link } from 'react-router-dom'
import { agency } from '../../data/agency'

/**
 * Mention de consentement RGPD — à poser sous CHAQUE formulaire collectant des
 * données (texte identique partout, source unique ici).
 *
 * Deux modes :
 * - contrôlé : passer `checked` + `onChange` (ex. ContactConseillerModal, qui
 *   gère déjà tout son état de formulaire) ;
 * - non contrôlé : ne rien passer d'autre que `id` — la case s'appuie alors
 *   sur `required` + `name` pour la validation native du navigateur, comme le
 *   reste des champs de Contact et Recrutement.
 */
export function ConsentNotice({
  id,
  name = 'consent',
  checked,
  onChange,
  textClassName = 'text-ink/75',
  ...rest
}) {
  const controlled = checked !== undefined
  const inputProps = controlled ? { checked, onChange } : { defaultChecked: false }

  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        name={name}
        type="checkbox"
        required
        className="mt-1 h-4 w-4 shrink-0 accent-brass"
        {...inputProps}
        {...rest}
      />
      <label htmlFor={id} className={`text-sm leading-relaxed ${textClassName}`}>
        J’accepte que les informations renseignées soient utilisées par {agency.name} afin de traiter ma
        demande et de me recontacter à ce sujet. Je reconnais avoir pris connaissance de la{' '}
        <Link
          to="/confidentialite"
          target="_blank"
          rel="noreferrer noopener"
          className="underline underline-offset-2 hover:text-brass"
        >
          Politique de confidentialité
        </Link>{' '}
        et peux exercer mes droits à tout moment en écrivant à{' '}
        <a href={`mailto:${agency.email}`} className="underline underline-offset-2 hover:text-brass">
          {agency.email}
        </a>
        .
      </label>
    </div>
  )
}
