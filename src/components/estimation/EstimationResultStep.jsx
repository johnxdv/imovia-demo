import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, MapPin } from 'lucide-react'
import { StepBackLink } from './StepBackLink'
import { PriceReveal } from './PriceReveal'
import { EstimationChatPanel, QUESTION_COUNT } from './EstimationChatPanel'
import { EstimationResultConfirmation } from './EstimationResultConfirmation'
import { formatEuros } from '../../lib/format'
import { EASE } from '../../lib/motion'

/**
 * Écran 5 — l'estimation est prête, mais le montant reste flouté tant que les
 * coordonnées n'ont pas été renseignées.
 *
 * Trois temps sur le même écran, sans navigation entre eux :
 * 1. **Repos** — panneau centré, prix flouté (déjà avec son premier chiffre
 *    net), CTA « Voir mon estimation ». Volontairement dépouillé : ni rappel
 *    d'adresse, ni promesse d'expertise — les deux reparaissent à l'écran
 *    suivant, et la place rendue va au bien qui s'achève derrière la vitre.
 * 2. **Conversation** — au clic sur ce CTA, l'écran bascule en deux colonnes :
 *    le prix à gauche (toujours visible, qui se déflégère très légèrement à
 *    mesure des réponses), la conversation de capture à droite, agrandie.
 * 3. **Confirmation** — une fois les informations recueillies, le prix se
 *    déflégère intégralement en colonne gauche pendant que la conversation,
 *    en colonne droite, cède la place à l'écran de remerciement — toujours
 *    sur ce même écran, jamais de redirection.
 *
 * Le floutage est ici purement visuel : le montant affiché est une valeur de
 * démonstration, et le vrai calcul n'est pas branché. Le jour où il le sera,
 * le montant ne devra plus descendre dans la page avant la capture des
 * coordonnées — un flou CSS se contourne en trois clics dans un inspecteur.
 *
 * `onProgress` remonte l'avancement local (0 avant le clic sur le CTA, la
 * fraction de conversation complétée, puis 1 une fois la confirmation
 * affichée) au rail d'étapes du parcours, porté par `Estimer.jsx`. `onDone`
 * signale cette même bascule finale au parent — sans quitter cet écran, voir
 * `finishChat` dans `Estimer.jsx`.
 *
 * Cette dernière bascule est aussi ce qui achève le chantier du décor : le
 * drone reprend de la hauteur et un halo doré entoure le bien (stade 6, voir
 * `DroneScene`).
 */
export function EstimationResultStep({ address, estimation, onBack, onDone, onProgress, onClose }) {
  const reduce = useReducedMotion()
  const [started, setStarted] = useState(false)
  // Nombre de questions déjà répondues dans la conversation (0 à
  // `QUESTION_COUNT`) — pilote
  // le déflouttage progressif du prix, voir `PriceReveal`.
  const [revealStage, setRevealStage] = useState(0)
  // Les informations recueillies : la conversation cède alors la place à
  // l'écran de confirmation, et le prix se déflégère intégralement.
  const [contact, setContact] = useState(null)
  const price = estimation?.price ?? null
  const formatted = formatEuros(price)
  const finished = contact !== null
  // La fourchette n'existe qu'à la révélation finale : elle s'affiche dans une
  // carte à part, sous le montant, jamais avant que celui-ci ne soit
  // intégralement net.
  //
  // Elle est **calculée par le serveur** et transmise telle quelle. Ce n'est plus
  // un ± 5 % décoratif appliqué ici : les bornes viennent de la dispersion réelle
  // des ventes comparables retenues — quantiles pondérés 25 et 75 —, élargies
  // selon le niveau de confiance de l'échantillon, et jamais plus serrées que
  // ± 5 % (voir `FOURCHETTE` dans `api/_lib/estimationConfig.js`). Le front n'a
  // plus de quoi la recalculer, et c'est voulu : elle dépend de données qui ne
  // descendent pas jusqu'ici.
  const range = finished && estimation?.low && estimation?.high
    ? { low: estimation.low, high: estimation.high }
    : null
  const showRange = range != null

  useEffect(() => {
    onProgress?.(finished ? 1 : started ? revealStage / QUESTION_COUNT : 0)
  }, [started, revealStage, finished, onProgress])

  const handleChatDone = (collected) => {
    setContact(collected)
    onDone?.(collected)
  }

  if (!started) {
    return (
      // Le retour reste hors du panneau : son `backdrop-filter` ferait du verre
      // dépoli le bloc conteneur de sa position `fixed` (voir `StepBackLink`).
      <div className="w-full max-w-lg">
        <StepBackLink onClick={onBack}>Modifier ma sélection</StepBackLink>

        <div className="panneau-verre p-7 text-center sm:p-9">
          <motion.div
            initial={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduce ? 0.2 : 0.5, ease: EASE }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-bottle"
          >
            <Check className="h-8 w-8 text-white" strokeWidth={2.25} aria-hidden="true" />
          </motion.div>

          <h1 className="titre-etape mt-7 text-center text-[1.7rem] leading-tight text-ink sm:text-[2rem]">
            Votre estimation est prête
          </h1>

          {/* Plus de rappel d'adresse ici : il reparaît à l'écran suivant, en
              tête de la colonne du prix, et la hauteur qu'il occupait revient au
              chantier qui s'achève derrière la vitre. */}

          <div className="mt-8">
            <div className="panneau-interne overflow-hidden px-6 py-8 text-center sm:px-8">
              <p className="font-mono text-[0.6rem] uppercase tracking-micro text-ink/55">
                Estimation de votre bien
              </p>

              {/* Le montant domine délibérément l'écran — au point d'aiguiser la
                  curiosité plutôt que de simplement l'informer. Le premier
                  chiffre est net dès cet écran ; le reste se déflégera très
                  progressivement au fil de la conversation qui suit. */}
              <div className="mt-5 flex items-center justify-center">
                <PriceReveal
                  formatted={formatted ?? '— €'}
                  revealStage={0}
                  className="titre-etape whitespace-nowrap text-[clamp(2.75rem,15vw,4.25rem)] leading-none text-laiton-texte sm:text-[6.5rem]"
                />
              </div>

              {/* Même réserve que sur l'écran suivant. Le montant est affiché à
                  deux endroits — ici au repos, puis à gauche pendant la
                  conversation — et la mention doit suivre le montant partout où
                  il paraît, pas seulement là où on l'a écrite en premier. */}
              <p className="mx-auto mt-4 max-w-xs text-[0.75rem] leading-relaxed text-ink/70">
                Prix soumis à expertise
              </p>

              {/* La promesse d'expertise ne paraît plus ici : elle attend
                  l'écran suivant, où la conversation la rend concrète. Ce qui
                  est gagné en hauteur revient au bien qui s'achève derrière la
                  vitre — c'est le dernier stade du chantier, il mérite mieux
                  qu'un bandeau de texte par-dessus. */}
              <p className="mt-7 text-lg font-semibold text-ink sm:text-xl">
                Résultats détaillés disponibles
              </p>

              <div className="mx-auto mt-7 max-w-[17rem]">
                <button
                  type="button"
                  onClick={() => setStarted(true)}
                  className="bouton-tunnel flex w-full items-center justify-center px-6 py-4"
                >
                  <span className="text-[0.88rem] font-semibold uppercase tracking-[0.08em]">
                    Voir mon estimation
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl">
      <StepBackLink onClick={onBack}>Modifier ma sélection</StepBackLink>

      {/* Bascule en deux colonnes à partir du gabarit tablette (768 px) : en
          deçà, la conversation a besoin de toute la largeur pour rester
          confortable au clavier. Le prix reste visible en tête sur mobile,
          juste au-dessus de la conversation plutôt qu'à côté. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-start md:gap-8">
        <div className="md:sticky md:top-28 md:col-span-5">
          <div>
            <div className="panneau-verre overflow-hidden px-6 py-7 text-center sm:px-8">
              <p className="mx-auto flex max-w-xs items-center justify-center gap-2 text-[0.78rem] leading-snug text-ink/60">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-laiton-texte" strokeWidth={1.75} aria-hidden="true" />
                {address.label}
              </p>

              <p className="mt-5 font-mono text-[0.6rem] uppercase tracking-micro text-ink/55">
                Estimation de votre bien
              </p>

              <div className="mt-4 flex items-center justify-center">
                <PriceReveal
                  formatted={formatted ?? '— €'}
                  revealStage={finished ? 5 : revealStage}
                  className="titre-etape whitespace-nowrap text-[clamp(2.5rem,13vw,3.5rem)] leading-none text-laiton-texte md:text-[3.25rem]"
                />
              </div>

              {/* Réserve attachée au montant lui-même, sans condition d'étape :
                  elle vaut pour toute estimation affichée, pendant le
                  dévoilement comme après. Volontairement du texte nu, sans
                  animation ni ornement — c'est une réserve juridique, elle se
                  lit, elle ne se met pas en scène. */}
              <p className="mx-auto mt-4 max-w-xs text-[0.75rem] leading-relaxed text-ink/70">
                Prix soumis à expertise
              </p>

              {!finished && (
                <p className="mx-auto mt-5 max-w-xs text-[0.75rem] leading-relaxed text-ink/70">
                  Un expert va finaliser votre étude et vous présenter les meilleures options
                  pour votre projet.
                </p>
              )}
            </div>
          </div>

          {/* Carte distincte, sous le montant : elle n'apparaît qu'une fois
              l'estimation intégralement défloutée, en fondu montant accordé au
              reste des transitions de l'écran. */}
          {showRange && (
            <motion.div
              initial={{ opacity: 0, y: reduce ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0.2 : 0.5, ease: EASE }}
              className="mt-4"
            >
              <div className="panneau-verre px-4 py-5 sm:px-6">
                {/* Les deux bornes restent côte à côte jusqu'aux plus petits
                    écrans : les montants passent à une taille légèrement
                    réduite en dessous de 640 px plutôt que de s'empiler. */}
                <div className="grid grid-cols-2 divide-x divide-ink/10">
                  <div className="px-2 text-center">
                    <p className="font-mono text-[0.58rem] uppercase tracking-micro text-ink/55">
                      Estimation basse
                    </p>
                    <p className="titre-etape mt-2 whitespace-nowrap text-[1.25rem] leading-none text-ink sm:text-[1.55rem]">
                      {formatEuros(range.low)}
                    </p>
                  </div>

                  <div className="px-2 text-center">
                    <p className="font-mono text-[0.58rem] uppercase tracking-micro text-ink/55">
                      Estimation haute
                    </p>
                    <p className="titre-etape mt-2 whitespace-nowrap text-[1.25rem] leading-none text-ink sm:text-[1.55rem]">
                      {formatEuros(range.high)}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="md:col-span-7">
          {finished ? (
            <EstimationResultConfirmation contact={contact} onClose={onClose} />
          ) : (
            <EstimationChatPanel onDone={handleChatDone} onProgress={setRevealStage} />
          )}
        </div>
      </div>
    </div>
  )
}
