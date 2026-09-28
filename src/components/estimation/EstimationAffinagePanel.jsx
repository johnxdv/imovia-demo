import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, Minus, Plus } from 'lucide-react'
import { useChantier } from './chantier'
import { CURSEURS, OPTIONS_DEFAUT, STANDINGS, optionsDecor } from '../../lib/affinage'
import { EASE } from '../../lib/motion'

/**
 * AFFINAGE — ce que le vendeur déclare lui-même, et que personne ne sait.
 *
 * L'estimation est rendue ; elle repose sur ce que les bases publiques savent
 * du bien. Ce qu'elles ne savent pas — une piscine, un terrain, un balcon, un
 * ascenseur, l'état intérieur — se demande ici, et se VOIT : chaque case cochée
 * dessine quelque chose sur le bien du décor. La piscine se creuse, le jardin
 * s'étend, les panneaux se posent sur le toit, le balcon sort de la façade.
 * C'est tout l'objet de cet écran : que le vendeur voie son bien se construire
 * à mesure qu'il le décrit.
 *
 * LE PANNEAU EST VOLONTAIREMENT ÉTROIT, et rangé CONTRE LA SCÈNE — au bord
 * intérieur de sa zone, le montant affiché juste au-dessus de lui (voir
 * `EstimationResultStep`). Ici, le décor n'est plus un fond : c'est le sujet.
 * Un panneau centré couvrirait exactement ce qu'on vient demander au vendeur de
 * regarder ; un panneau réfugié contre le bord opposé de l'écran l'en éloigne
 * de toute la largeur de la page, et sépare le montant de la question qui le
 * fait bouger.
 *
 * CE QUI EST PROPOSÉ DÉPEND DU BIEN, et les deux listes n'ont aucun élément en
 * commun hormis le standing :
 *
 *   • une MAISON déclare sa piscine, sa terrasse, ses panneaux solaires et la
 *     surface de son terrain ;
 *   • un APPARTEMENT déclare son balcon, son rez-de-jardin, son ascenseur et
 *     son rooftop — et rien d'autre. Pas de panneaux solaires : la toiture d'un
 *     immeuble n'appartient pas au logement, et l'option n'a donc jamais rien à
 *     faire sur cet écran-là.
 *
 * QUATRE DÉCLARATIONS NE SONT PAS DES OUI OU DES NON, et ce sont les quatre
 * surfaces : le terrain d'une maison, le balcon, le rez-de-jardin et le rooftop
 * d'un appartement. Toutes se règlent au curseur, et zéro y veut dire
 * « je n'en ai pas » — pas « j'en ai un de zéro mètre carré ».
 *
 * Le barème, lui, est commun et écrit une seule fois : `src/lib/affinage.js`
 * pour le calcul, `src/lib/affinageConfig.js` pour les nombres. Rien n'est
 * chiffré ici.
 */
export function EstimationAffinagePanel({ type, options, onChange, onTermine }) {
  const reduce = useReducedMotion()
  const chantier = useChantier()
  const maison = type !== 'appartement'

  // Le décor suit les cases cochées, sans attendre la validation : c'est tout
  // l'intérêt de l'écran.
  useEffect(() => {
    chantier.declarerOptions(optionsDecor(options, type))
  }, [chantier, options, type])

  /**
   * Une déclaration, posée sur les PRÉCÉDENTES et non sur celles du rendu en
   * cours. La nuance compte depuis que les boutons + et − avancent d'un mètre
   * carré : trois clics de suite sur « + » partent tous du même rendu, et deux
   * d'entre eux se perdaient — on cliquait trois fois pour avancer d'un. La
   * valeur se calcule donc à partir de l'état au moment où la mise à jour
   * s'applique, ce que seule la forme fonctionnelle permet.
   */
  const modifier = (champ, valeur) =>
    onChange((precedentes) => {
      const base = { ...OPTIONS_DEFAUT, ...precedentes }
      return { ...base, [champ]: typeof valeur === 'function' ? valeur(base[champ]) : valeur }
    })

  const bascule = (champ) => modifier(champ, (actuel) => !actuel)

  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.2 : 0.5, ease: EASE }}
      className="panneau-verre px-6 py-7 text-left sm:px-7"
    >
      <h2 className="titre-etape text-[1.35rem] leading-tight text-ink sm:text-[1.55rem]">
        Affinez votre estimation
      </h2>
      <p className="mt-2.5 text-[0.9rem] leading-relaxed text-ink/70">
        Ce que les bases publiques ne savent pas de votre bien&nbsp;— et qui compte.
      </p>

      {/* Standing : le complément qui pèse le plus, donc celui qu'on demande en
          premier. Trois niveaux, et un sous-texte pour chacun — ce qui se
          déclare sans hésiter, c'est l'existence de travaux à prévoir, leur
          absence, ou une rénovation récente. « Standard » est le point neutre
          du secteur : il laisse l'estimation où le moteur l'a mise. */}
      <fieldset className="mt-6">
        <legend className="font-mono text-[0.62rem] uppercase tracking-micro text-ink/55">
          Standing du bien
        </legend>
        <div className="mt-2.5 grid grid-cols-1 gap-2">
          {STANDINGS.map(({ id, label, detail }) => (
            <button
              key={id}
              type="button"
              aria-pressed={options.standing === id}
              onClick={() => modifier('standing', id)}
              className="option-tunnel px-4 py-2.5 text-left"
            >
              <span className="block text-[0.92rem] leading-snug">{label}</span>
              <span className="block text-[0.78rem] leading-snug opacity-60">{detail}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {/* Atouts : une case, un ouvrage qui se dessine. */}
      <fieldset className="mt-6">
        <legend className="font-mono text-[0.62rem] uppercase tracking-micro text-ink/55">
          Atouts
        </legend>
        <div className="mt-2.5 space-y-2">
          {maison ? (
            <>
              <Atout
                actif={options.piscine}
                onClick={() => bascule('piscine')}
                titre="Piscine"
                detail="Bassin enterré et sa plage"
              />
              <Atout
                actif={options.terrasse}
                onClick={() => bascule('terrasse')}
                titre="Terrasse aménagée"
                detail="Deck et salon d’extérieur"
              />
              <Atout
                actif={options.panneaux}
                onClick={() => bascule('panneaux')}
                titre="Panneaux solaires"
                detail="Photovoltaïque en toiture"
              />
            </>
          ) : (
            // Ascenseur : la seule option dont la valeur dépend entièrement de
            // l'étage déclaré trois écrans plus tôt — nulle au rez-de-chaussée,
            // maximale au cinquième (voir `ASCENSEUR_PAR_ETAGE`).
            <Atout
              actif={options.ascenseur}
              onClick={() => bascule('ascenseur')}
              titre="Ascenseur"
              detail="Dans l’immeuble, desservant votre étage"
            />
          )}
        </div>
      </fieldset>

      {/* Les surfaces. Celle du terrain part de la contenance cadastrale
          relevée sur la parcelle, que le vendeur corrige s'il la sait meilleure
          — c'est la seule qui ne s'ouvre pas à zéro, et la seule qui ne déplace
          rien tant qu'on n'y touche pas. */}
      {maison ? (
        <Curseur
          titre="Surface de terrain"
          reglage={CURSEURS.terrain}
          valeur={options.terrainM2}
          onChange={(m2) => modifier('terrainM2', m2)}
          nom="de terrain"
          // Le curseur s'arrête à cinq mille mètres carrés ; le terrain, non.
          // Le « + » dit que la valeur déclarée est au moins celle-là.
          marqueMax
        />
      ) : (
        <>
          <Curseur
            titre="Balcon"
            reglage={CURSEURS.balcon}
            valeur={options.balconM2}
            onChange={(m2) => modifier('balconM2', m2)}
            nom="de balcon"
          />
          <Curseur
            titre="Rez-de-jardin"
            reglage={CURSEURS.rezDeJardin}
            valeur={options.rezDeJardinM2}
            onChange={(m2) => modifier('rezDeJardinM2', m2)}
            nom="de jardin privatif"
          />
          {/* Rooftop — proposé à TOUS les appartements, quel que soit l'étage
              déclaré : une terrasse en toiture s'attache au logement, pas au
              niveau où il se trouve, et un deuxième étage peut parfaitement en
              avoir l'usage exclusif. */}
          <Curseur
            titre="Rooftop"
            reglage={CURSEURS.rooftop}
            valeur={options.rooftopM2}
            onChange={(m2) => modifier('rooftopM2', m2)}
            nom="de rooftop"
          />
        </>
      )}

      <button
        type="button"
        onClick={onTermine}
        className="bouton-tunnel mt-7 flex w-full items-center justify-center px-6 py-4"
      >
        <span className="text-[0.8rem] font-semibold uppercase tracking-[0.06em]">
          Voir mon estimation affinée
        </span>
      </button>
    </motion.div>
  )
}

/** Une ligne d'atout : le libellé, ce qu'il recouvre, et la coche. */
function Atout({ actif, onClick, titre, detail }) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={onClick}
      className="option-tunnel flex w-full items-center gap-3 px-4 py-3 text-left"
    >
      <span
        className={[
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-300',
          actif ? 'border-laiton bg-laiton' : 'border-ink/25 bg-white/60',
        ].join(' ')}
      >
        {actif ? <Check className="h-3 w-3 text-white" strokeWidth={3} aria-hidden="true" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-[0.92rem] leading-snug text-ink">{titre}</span>
        <span className="block text-[0.78rem] leading-snug text-ink/55">{detail}</span>
      </span>
    </button>
  )
}

const borne = (v, min, max) => Math.min(Math.max(v, min), max)

/**
 * Une surface déclarée au curseur — terrain, balcon, rez-de-jardin, rooftop.
 *
 * DEUX PAS, ET C'EST VOULU. Le curseur avance par crans larges (`pas`) : sur
 * une piste de cinq mille mètres carrés, un cran d'un mètre carré ferait cinq
 * mille positions que personne ne distingue sous le doigt. Les boutons + et −,
 * eux, avancent d'un mètre carré (`pasBouton`) : c'est par eux qu'on atteint
 * 137 m² sur une piste graduée de cinquante en cinquante.
 *
 * L'attribut `step` de l'`input` ne peut pas porter le cran du curseur : pour
 * un `type="range"`, le navigateur ARRONDIT au pas toute valeur qui n'en est
 * pas un multiple — y compris celles venues des boutons, dont les 137 m²
 * redeviendraient 150 aussitôt posés. Le `step` reste donc à 1, et c'est
 * `glisser` qui pose les crans.
 */
function Curseur({ titre, reglage, valeur, onChange, nom, marqueMax = false }) {
  const m2 = borne(Math.round(Number(valeur) || 0), 0, reglage.max)

  /**
   * Un cran de curseur. L'arrondi au pas suffit pour la souris et le doigt,
   * qui parcourent la piste ; il ne suffit pas pour le clavier, dont la flèche
   * ne déplace la valeur brute que d'un mètre carré — arrondie, elle
   * retomberait sur le cran d'où elle vient et la touche ne ferait rien. D'où
   * la relance d'un cran entier dans le sens du geste.
   */
  const glisser = (brut) => {
    let cible = Math.round(brut / reglage.pas) * reglage.pas
    if (cible === m2 && brut !== m2) cible = m2 + (brut > m2 ? reglage.pas : -reglage.pas)
    onChange(borne(cible, 0, reglage.max))
  }

  // Les boutons passent une FONCTION plutôt qu'une valeur : c'est ce qui rend
  // trois clics rapides égaux à trois mètres carrés (voir `modifier`).
  const ajuster = (sens) =>
    onChange((actuel) =>
      borne(Math.round(Number(actuel) || 0) + sens * reglage.pasBouton, 0, reglage.max),
    )

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[0.9rem] text-ink/70">{titre}</p>
        <p className="text-[1.05rem] text-laiton-texte tabular-nums">
          {m2 === 0 ? 'Aucun' : `${m2}${marqueMax && m2 >= reglage.max ? '+' : ''} m²`}
        </p>
      </div>

      <div className="mt-1 flex items-center gap-2 sm:gap-3">
        <PetitBouton
          icon={Minus}
          label={`Retirer un mètre carré ${nom}`}
          disabled={m2 <= 0}
          onClick={() => ajuster(-1)}
        />
        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={reglage.max}
            step={1}
            value={m2}
            onChange={(event) => glisser(Number(event.target.value))}
            aria-label={`Surface ${nom}, en mètres carrés`}
            className="surface-slider"
          />
        </div>
        <PetitBouton
          icon={Plus}
          label={`Ajouter un mètre carré ${nom}`}
          disabled={m2 >= reglage.max}
          onClick={() => ajuster(1)}
        />
      </div>
    </div>
  )
}

function PetitBouton({ icon: Icon, label, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border border-ink/15 bg-white/70 text-ink transition-colors duration-300 ease-plan hover:border-laiton hover:bg-laiton/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laiton focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-ink/10 disabled:text-ink/25 disabled:hover:bg-white/70"
    >
      <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
    </button>
  )
}
