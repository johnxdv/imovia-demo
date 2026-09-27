import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, Minus, Plus } from 'lucide-react'
import { useChantier } from './chantier'
import {
  BALCON_SAISIE_MAX,
  JARDIN_SAISIE_MAX,
  OPTIONS_DEFAUT,
  ROOFTOP_SAISIE_MAX,
  STANDINGS,
  TERRAIN_SAISIE_MAX,
  TERRASSE_SAISIE_MAX,
  optionsDecor,
} from '../../lib/affinage'
import { EASE } from '../../lib/motion'

/**
 * AFFINAGE — ce que le vendeur déclare lui-même, et que personne ne sait.
 *
 * L'estimation est rendue ; elle repose sur ce que les bases publiques savent
 * du bien. Ce qu'elles ne savent pas — une piscine, un terrain, des panneaux,
 * une terrasse, un ascenseur, l'état intérieur — se demande ici, et se VOIT :
 * chaque case cochée dessine quelque chose sur le bien du décor. La piscine se
 * creuse, le jardin s'étend, la cabine d'ascenseur monte dans sa cage, le
 * balcon sort de la façade. C'est tout l'objet de cet écran : que le vendeur
 * voie sa maison se construire à mesure qu'il la décrit.
 *
 * ET CE QUI EST COCHÉ SE TROUVE TOUT DE SUITE. Sur le plan d'ensemble de cet
 * écran, un balcon fait quelques dizaines de pixels : le vendeur cochait, et ne
 * voyait rien bouger. Chaque ouvrage déclaré SCINTILLE désormais, brièvement et
 * à intervalle régulier — c'est un index, pas un ornement, et l'œil va là où ça
 * clignote (voir `scintillant` dans `scene/kit.js`).
 *
 * LE PANNEAU EST VOLONTAIREMENT ÉTROIT. Ici, le décor n'est plus un fond :
 * c'est le sujet. Un panneau centré couvrirait exactement ce qu'on vient
 * demander au vendeur de regarder.
 *
 * Ce qui est proposé dépend du bien. Une maison se voit offrir sa piscine, son
 * terrain, sa terrasse et ses panneaux solaires ; un appartement, son balcon,
 * son REZ-DE-JARDIN, son ROOFTOP et son ASCENSEUR — et ni piscine, ni terrain,
 * ni panneaux, qu'il n'a pas. Le barème, lui, est commun et écrit une seule
 * fois (voir `src/lib/affinage.js`).
 *
 * CINQ DÉCLARATIONS NE SONT PAS DES OUI OU DES NON, et ce sont les surfaces :
 * le terrain d'une maison, sa terrasse, le balcon d'un appartement, son
 * rez-de-jardin et son rooftop. Toutes se règlent au curseur, et toutes se
 * voient grandir sur le bien à mesure qu'on le pousse.
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

  const modifier = (champ, valeur) => onChange({ ...OPTIONS_DEFAUT, ...options, [champ]: valeur })
  const bascule = (champ) => modifier(champ, !options[champ])

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
        Ajoutez les points forts de votre bien.
      </p>

      {/* Standing : le complément qui pèse le plus, donc celui qu'on demande
          en premier. Cinq niveaux, ceux qu'emploient les transactions. */}
      <fieldset className="mt-6">
        <legend className="font-mono text-[0.62rem] uppercase tracking-micro text-ink/55">
          Standing du bien
        </legend>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {STANDINGS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={options.standing === id}
              onClick={() => modifier('standing', id)}
              className="option-tunnel px-3 py-2.5 text-center text-[0.85rem]"
            >
              {label}
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
            <Atout
              actif={options.piscine}
              onClick={() => bascule('piscine')}
              titre="Piscine"
              detail="Bassin enterré et sa plage"
            />
          ) : null}

          {/* L'extérieur — terrasse pour une maison, balcon pour un
              appartement — ouvre son curseur de surface dès qu'il est coché.
              Le curseur est RANGÉ SOUS SA CASE plutôt que plus bas dans le
              panneau : c'est la même déclaration, elle ne se coupe pas en
              deux. */}
          <Atout
            actif={options.exterieur}
            onClick={() => bascule('exterieur')}
            titre={maison ? 'Terrasse aménagée' : 'Balcon'}
            detail={maison ? 'Deck et salon d’extérieur' : 'À votre étage, sur la façade'}
          >
            <CurseurSurface
              libelle={maison ? 'Surface de terrasse' : 'Surface de balcon'}
              valeur={options.exterieurM2}
              max={maison ? TERRASSE_SAISIE_MAX : BALCON_SAISIE_MAX}
              pas={maison ? 5 : 1}
              onChange={(m2) => modifier('exterieurM2', m2)}
            />
          </Atout>

          {/* Rez-de-jardin : la seule façon dont un appartement a un extérieur
              au sol. Une maison en a un par définition, on ne le lui demande
              donc pas. */}
          {maison ? null : (
            <Atout
              actif={options.rezDeJardin}
              onClick={() => bascule('rezDeJardin')}
              titre="Rez-de-jardin"
              detail="Jardin privatif de plain-pied"
            >
              <CurseurSurface
                libelle="Surface de jardin"
                valeur={options.rezDeJardinM2}
                max={JARDIN_SAISIE_MAX}
                pas={10}
                onChange={(m2) => modifier('rezDeJardinM2', m2)}
              />
            </Atout>
          )}

          {/* LES PANNEAUX SOLAIRES NE SE PROPOSENT PLUS AUX APPARTEMENTS.
              Un copropriétaire ne décide pas seul de la toiture de l'immeuble :
              la question n'avait pas de sens, et une case qu'on ne peut
              honnêtement pas cocher est une case qui n'a rien à faire là. Le
              barème n'en est pas affecté — masquée, elle reste à faux (voir
              `coefficientAffinage`). */}
          {maison ? (
            <Atout
              actif={options.panneaux}
              onClick={() => bascule('panneaux')}
              titre="Panneaux solaires"
              detail="Photovoltaïque en toiture"
            />
          ) : null}
        </div>
      </fieldset>

      {/* Terrain : elle part de la contenance cadastrale relevée sur la
          parcelle, que le vendeur corrige s'il la sait meilleure. */}
      {maison ? (
        <div className="mt-6">
          <CurseurSurface
            libelle="Surface de terrain"
            valeur={options.terrainM2}
            max={TERRAIN_SAISIE_MAX}
            // Cent mètres carrés par cran : l'échelle est longue, et un pas de
            // cinquante y ferait cent crans de piste que personne ne distingue
            // sous le doigt.
            pas={100}
            onChange={(m2) => modifier('terrainM2', m2)}
            autonome
          />
        </div>
      ) : null}

      {/* Rooftop et ascenseur — appartements seulement. L'ascenseur est rangé
          SOUS le rooftop, comme demandé : ce sont les deux déclarations qui
          parlent de l'immeuble et non du logement. */}
      {maison ? null : (
        <>
          <div className="mt-6">
            <CurseurSurface
              libelle="Rooftop"
              valeur={options.rooftopM2}
              max={ROOFTOP_SAISIE_MAX}
              pas={10}
              vide="Aucun"
              onChange={(m2) => modifier('rooftopM2', m2)}
              autonome
            />
          </div>

          <div className="mt-4">
            <Atout
              actif={options.ascenseur}
              onClick={() => bascule('ascenseur')}
              titre="Ascenseur"
              detail="Desservant votre étage"
            />
          </div>
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

/**
 * Une ligne d'atout : le libellé, ce qu'il recouvre, la coche — et, quand il en
 * a un, le curseur de surface qui se déplie une fois la case cochée.
 *
 * Le curseur est DANS la carte de l'atout et non en dessous : c'est la même
 * déclaration, et la sortir de sa ligne obligerait à relier des yeux une case
 * et un réglage qui sont la même chose. Il est aussi hors du bouton — un
 * curseur imbriqué dans un bouton ne serait ni cliquable ni accessible.
 */
function Atout({ actif, onClick, titre, detail, children }) {
  return (
    <div
      className={[
        'option-tunnel overflow-hidden transition-colors duration-200',
        actif ? 'est-retenue' : '',
      ].join(' ')}
    >
      <button
        type="button"
        aria-pressed={actif}
        onClick={onClick}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
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

      {children && actif ? (
        <div className="border-t border-ink/10 px-4 pb-3 pt-2.5">{children}</div>
      ) : null}
    </div>
  )
}

/**
 * CURSEUR DE SURFACE — la grammaire commune des cinq déclarations chiffrées.
 *
 * Le terrain avait la sienne, écrite à la main dans le panneau ; le rooftop en
 * avait une copie ; le balcon, la terrasse et le rez-de-jardin en auraient
 * demandé trois de plus. Elle est écrite une fois : le libellé à gauche, la
 * valeur en laiton à droite, deux boutons ronds encadrant la piste.
 *
 * `autonome` distingue les deux emplois. Posé seul dans le panneau — terrain,
 * rooftop —, le curseur porte son libellé en pleine taille ; replié sous un
 * atout, il se fait plus petit et plus sourd, parce qu'il est alors le détail
 * d'une déclaration déjà faite et non une déclaration à part.
 */
function CurseurSurface({ libelle, valeur, max, pas, onChange, vide = null, autonome = false }) {
  const m2 = Math.round(Number(valeur) || 0)
  const ajuster = (delta) => onChange(Math.min(Math.max(m2 + delta, 0), max))
  const affichage =
    vide && m2 === 0 ? vide : m2 >= max ? `${max}+ m²` : `${m2} m²`

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className={autonome ? 'text-[0.9rem] text-ink/70' : 'text-[0.78rem] text-ink/60'}>
          {libelle}
        </p>
        <p
          className={[
            'text-laiton-texte tabular-nums',
            autonome ? 'text-[1.05rem]' : 'text-[0.9rem]',
          ].join(' ')}
        >
          {affichage}
        </p>
      </div>

      <div className="mt-1 flex items-center gap-2 sm:gap-3">
        <PetitBouton
          icon={Minus}
          label={`Retirer ${pas} mètres carrés — ${libelle}`}
          disabled={m2 <= 0}
          compact={!autonome}
          onClick={() => ajuster(-pas)}
        />
        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={max}
            step={pas}
            value={Math.min(m2, max)}
            onChange={(event) => onChange(Number(event.target.value))}
            aria-label={`${libelle}, en mètres carrés`}
            aria-valuetext={affichage}
            className="surface-slider"
          />
        </div>
        <PetitBouton
          icon={Plus}
          label={`Ajouter ${pas} mètres carrés — ${libelle}`}
          disabled={m2 >= max}
          compact={!autonome}
          onClick={() => ajuster(pas)}
        />
      </div>
    </div>
  )
}

function PetitBouton({ icon: Icon, label, disabled, onClick, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={[
        'flex shrink-0 touch-manipulation items-center justify-center rounded-full border border-ink/15 bg-white/70 text-ink transition-colors duration-300 ease-plan hover:border-laiton hover:bg-laiton/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laiton focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-ink/10 disabled:text-ink/25 disabled:hover:bg-white/70',
        compact ? 'h-9 w-9' : 'h-11 w-11',
      ].join(' ')}
    >
      <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} strokeWidth={2} aria-hidden="true" />
    </button>
  )
}
