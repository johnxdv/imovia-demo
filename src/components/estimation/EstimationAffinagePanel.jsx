import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, Minus, Plus } from 'lucide-react'
import { useChantier } from './chantier'
import {
  OPTIONS_DEFAUT,
  ROOFTOP_SAISIE_MAX,
  STANDINGS,
  TERRAIN_SAISIE_MAX,
  optionsDecor,
} from '../../lib/affinage'
import { EASE } from '../../lib/motion'

/**
 * AFFINAGE — ce que le vendeur déclare lui-même, et que personne ne sait.
 *
 * L'estimation est rendue ; elle repose sur ce que les bases publiques savent
 * du bien. Ce qu'elles ne savent pas — une piscine, un terrain, des panneaux,
 * une terrasse, l'état intérieur — se demande ici, et se VOIT : chaque case
 * cochée dessine quelque chose sur le bien du décor. La piscine se creuse, le
 * jardin s'étend, les panneaux se posent sur le toit, le balcon sort de la
 * façade. C'est tout l'objet de cet écran : que le vendeur voie sa maison se
 * construire à mesure qu'il la décrit.
 *
 * LE PANNEAU EST VOLONTAIREMENT ÉTROIT et rangé à gauche. Ici, le décor n'est
 * plus un fond : c'est le sujet. Un panneau centré couvrirait exactement ce
 * qu'on vient demander au vendeur de regarder.
 *
 * Ce qui est proposé dépend du bien. Une maison se voit offrir sa piscine, son
 * terrain et sa terrasse ; un appartement, son balcon, son REZ-DE-JARDIN et son
 * ROOFTOP — et ni piscine ni terrain, qu'il n'a pas. Le barème, lui, est commun
 * et écrit une seule fois (voir `src/lib/affinage.js`).
 *
 * DEUX DÉCLARATIONS NE SONT PAS DES OUI OU DES NON, et ce sont les deux
 * surfaces : le terrain d'une maison, jusqu'à 5 000 m², et le rooftop d'un
 * appartement, jusqu'à 120. Toutes deux se règlent au curseur, et toutes deux
 * se voient grandir sur le bien à mesure qu'on le pousse — le terrain s'étend
 * et se plante d'arbres, le rooftop gagne la toiture.
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

  const terrain = Math.round(Number(options.terrainM2) || 0)
  const ajusterTerrain = (delta) =>
    modifier('terrainM2', Math.min(Math.max(terrain + delta, 0), TERRAIN_SAISIE_MAX))

  const rooftop = Math.round(Number(options.rooftopM2) || 0)
  const ajusterRooftop = (delta) =>
    modifier('rooftopM2', Math.min(Math.max(rooftop + delta, 0), ROOFTOP_SAISIE_MAX))

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

          <Atout
            actif={options.exterieur}
            onClick={() => bascule('exterieur')}
            titre={maison ? 'Terrasse aménagée' : 'Balcon'}
            detail={maison ? 'Deck et salon d’extérieur' : 'À votre étage, sur la façade'}
          />

          {/* Rez-de-jardin : la seule façon dont un appartement a un extérieur
              au sol. Une maison en a un par définition, on ne le lui demande
              donc pas. */}
          {maison ? null : (
            <Atout
              actif={options.rezDeJardin}
              onClick={() => bascule('rezDeJardin')}
              titre="Rez-de-jardin"
              detail="Jardin privatif de plain-pied"
            />
          )}

          <Atout
            actif={options.panneaux}
            onClick={() => bascule('panneaux')}
            titre="Panneaux solaires"
            detail="Photovoltaïque en toiture"
          />
        </div>
      </fieldset>

      {/* Terrain : la seule déclaration qui ne soit pas un oui ou un non. Elle
          part de la contenance cadastrale relevée sur la parcelle, que le
          vendeur corrige s'il la sait meilleure. */}
      {maison ? (
        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-[0.9rem] text-ink/70">Surface de terrain</p>
            <p className="text-[1.05rem] text-laiton-texte tabular-nums">
              {terrain >= TERRAIN_SAISIE_MAX ? `${TERRAIN_SAISIE_MAX}+` : terrain} m²
            </p>
          </div>

          <div className="mt-1 flex items-center gap-2 sm:gap-3">
            <PetitBouton
              icon={Minus}
              label="Retirer cent mètres carrés de terrain"
              disabled={terrain <= 0}
              onClick={() => ajusterTerrain(-100)}
            />
            <div className="min-w-0 flex-1">
              <input
                type="range"
                min={0}
                max={TERRAIN_SAISIE_MAX}
                // Cent mètres carrés par cran : l'échelle est deux fois et demie
                // plus longue qu'avant, et un pas de cinquante y ferait cent
                // crans de piste que personne ne distingue sous le doigt.
                step={100}
                value={Math.min(terrain, TERRAIN_SAISIE_MAX)}
                onChange={(event) => modifier('terrainM2', Number(event.target.value))}
                aria-label="Surface de terrain, en mètres carrés"
                className="surface-slider"
              />
            </div>
            <PetitBouton
              icon={Plus}
              label="Ajouter cent mètres carrés de terrain"
              disabled={terrain >= TERRAIN_SAISIE_MAX}
              onClick={() => ajusterTerrain(100)}
            />
          </div>
        </div>
      ) : null}

      {/* Rooftop — appartements seulement. Même grammaire que le terrain : une
          surface au curseur, et le toit de l'immeuble qui s'aménage d'autant.
          À zéro, il n'y en a pas : le comble mansardé reste en place. */}
      {maison ? null : (
        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-[0.9rem] text-ink/70">Rooftop</p>
            <p className="text-[1.05rem] text-laiton-texte tabular-nums">
              {rooftop === 0 ? 'Aucun' : `${rooftop} m²`}
            </p>
          </div>

          <div className="mt-1 flex items-center gap-2 sm:gap-3">
            <PetitBouton
              icon={Minus}
              label="Retirer dix mètres carrés de rooftop"
              disabled={rooftop <= 0}
              onClick={() => ajusterRooftop(-10)}
            />
            <div className="min-w-0 flex-1">
              <input
                type="range"
                min={0}
                max={ROOFTOP_SAISIE_MAX}
                step={10}
                value={Math.min(rooftop, ROOFTOP_SAISIE_MAX)}
                onChange={(event) => modifier('rooftopM2', Number(event.target.value))}
                aria-label="Surface de rooftop, en mètres carrés"
                className="surface-slider"
              />
            </div>
            <PetitBouton
              icon={Plus}
              label="Ajouter dix mètres carrés de rooftop"
              disabled={rooftop >= ROOFTOP_SAISIE_MAX}
              onClick={() => ajusterRooftop(10)}
            />
          </div>
        </div>
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
