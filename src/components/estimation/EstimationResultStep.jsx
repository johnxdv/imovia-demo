import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, MapPin, SlidersHorizontal } from 'lucide-react'
import { StepBackLink } from './StepBackLink'
import { PriceReveal } from './PriceReveal'
import { EstimationChatPanel, QUESTION_COUNT } from './EstimationChatPanel'
import { EstimationResultConfirmation } from './EstimationResultConfirmation'
import { EstimationAffinagePanel } from './EstimationAffinagePanel'
import { affinerEstimation, OPTIONS_DEFAUT } from '../../lib/affinage'
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
 * drone reprend de la hauteur et un halo doré entoure le bien (voir
 * `DroneScene`).
 *
 * PUIS VIENT L'AFFINAGE. Le montant rendu repose sur ce que les bases
 * publiques savent du bien ; elles ignorent la piscine, le terrain, les
 * panneaux, la terrasse et l'état intérieur. Un bouton les demande — et, au
 * clic, l'estimation se retire dans le coin de l'écran pendant que le bien
 * reprend toute la place : chaque case cochée s'y dessine (voir
 * `EstimationAffinagePanel` et `src/lib/affinage.js`). C'est le seul écran du
 * parcours où le décor n'est plus un fond mais le sujet, et la mise en page le
 * dit — un panneau étroit rangé à gauche, un montant réduit à droite, et tout
 * le milieu au bien.
 *
 * `onAffinage` prévient la page de cette bascule : c'est elle qui fait reculer
 * le drone jusqu'au plan d'ensemble.
 */
export function EstimationResultStep({
  address,
  estimation,
  type = null,
  // Surface habitable et étage déclarés dans la fenêtre de surface. Ils ne
  // servaient qu'au moteur ; l'affinage en a besoin à son tour — les extérieurs
  // d'un appartement se valorisent au prix du mètre carré habitable, et
  // l'ascenseur ne vaut rien au rez-de-chaussée (voir `src/lib/affinage.js`).
  surface = null,
  etage = null,
  contenance = null,
  onBack,
  onDone,
  onProgress,
  onAffinage,
  onPleineLargeur,
  onClose,
}) {
  const reduce = useReducedMotion()
  const [started, setStarted] = useState(false)
  // Nombre de questions déjà répondues dans la conversation (0 à
  // `QUESTION_COUNT`) — pilote
  // le déflouttage progressif du prix, voir `PriceReveal`.
  const [revealStage, setRevealStage] = useState(0)
  // Les informations recueillies : la conversation cède alors la place à
  // l'écran de confirmation, et le prix se déflégère intégralement.
  const [contact, setContact] = useState(null)
  // L'écran d'affinage, et ce qui y a été déclaré. La surface de terrain part
  // de la contenance relevée sur la parcelle cadastrale : le vendeur corrige
  // une valeur, il n'en invente pas une.
  const [affinage, setAffinage] = useState(false)
  // Vrai dès la première ouverture de l'écran d'affinage, et pour de bon : le
  // montant corrigé ne redevient pas le montant brut parce qu'on referme le
  // panneau. Ce qui a été déclaré reste déclaré.
  const [affine, setAffine] = useState(false)
  const [options, setOptions] = useState(() => ({
    ...OPTIONS_DEFAUT,
    terrainM2: Number.isFinite(contenance) ? Math.round(contenance) : 0,
  }))

  // Ce que le barème doit savoir du bien au-delà des cases cochées. La
  // contenance cadastrale y tient un rôle à part : elle est le POINT NEUTRE du
  // curseur de terrain, celui où l'ajustement vaut exactement zéro parce que le
  // moteur a déjà valorisé ce terrain-là.
  const contexteAffinage = useMemo(
    () => ({ type, surfaceM2: surface, etage, terrainCadastreM2: contenance }),
    [type, surface, etage, contenance],
  )

  const estimationAffinee = useMemo(
    () => (affine ? affinerEstimation(estimation, options, contexteAffinage) : estimation),
    [affine, estimation, options, contexteAffinage],
  )
  const price = estimationAffinee?.price ?? null
  const formatted = formatEuros(price)
  const finished = contact !== null
  // La fourchette n'existe qu'à la révélation finale : elle s'affiche dans une
  // carte à part, sous le montant, jamais avant que celui-ci ne soit
  // intégralement net.
  //
  // Elle est **calculée par le serveur** et transmise telle quelle. Ce n'est plus
  // un ± 5 % décoratif appliqué ici : c'est une bande de ± 15, ± 20 ou ± 25 %
  // selon le niveau de confiance de l'échantillon de ventes qui a porté le
  // calcul (voir `FOURCHETTE` dans `api/_lib/estimationConfig.js`). Le front
  // n'a plus de quoi la recalculer, et c'est voulu : elle dépend de données qui
  // ne descendent pas jusqu'ici.
  //
  // L'affinage, lui, a le droit d'y toucher — mais il relève la demi-largeur
  // relative de la bande reçue et la réapplique au nouveau prix central (voir
  // `affinerEstimation`), si bien que la fourchette reste celle du serveur en
  // pourcentage, et ne bouge qu'avec le montant qu'elle encadre.
  const range = finished && estimationAffinee?.low && estimationAffinee?.high
    ? { low: estimationAffinee.low, high: estimationAffinee.high }
    : null
  const showRange = range != null

  useEffect(() => {
    onProgress?.(finished ? 1 : started ? revealStage / QUESTION_COUNT : 0)
  }, [started, revealStage, finished, onProgress])

  /**
   * L'EXCEPTION DE LA CONVERSATION — le seul écran du parcours qui ne se range
   * pas dans sa moitié.
   *
   * Tout le reste du parcours tient dans une zone à lui, sur fond blanc, la
   * scène occupant l'autre moitié sans jamais passer derrière (voir
   * `Estimer.jsx`). Cet écran-ci n'y tiendrait pas : c'est déjà lui-même un
   * deux-colonnes — le montant d'un côté, la conversation de l'autre — et le
   * replier dans une demi-largeur reviendrait à mettre un deux-colonnes dans un
   * deux-colonnes.
   *
   * Il reprend donc toute la largeur, et recouvre la scène. Ce n'est pas gênant
   * ici, et pour une raison précise : à ce stade, LA SCÈNE NE BOUGE PLUS —
   * le bien est achevé, la caméra est posée (voir `PLANS`). Ce que le panneau
   * cache est une image fixe.
   *
   * L'affinage, lui, retombe dans la règle commune : c'est un panneau étroit,
   * et c'est l'écran où il faut justement le plus voir le bien.
   */
  useEffect(() => {
    onPleineLargeur?.(started && !affinage)
  }, [started, affinage, onPleineLargeur])

  const handleChatDone = (collected) => {
    setContact(collected)
    onDone?.(collected)
  }

  const ouvrirAffinage = (ouvert) => {
    setAffinage(ouvert)
    if (ouvert) setAffine(true)
    onAffinage?.(ouvert)
    // L'écran d'affinage rend la place au bien : encore faut-il le voir. Sans
    // ce retour en haut, on arrive sur le panneau d'options avec le décor
    // au-dessus de l'écran, comme à chaque changement d'étape (voir
    // `goToStep` dans `Estimer.jsx`).
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  // L'ÉCRAN D'AFFINAGE. Le montant se retire dans le coin et le panneau se
  // range à gauche : tout le reste de l'écran revient au bien, qui est ce
  // qu'on est venu regarder.
  if (affinage) {
    return (
      <div className="w-full max-w-6xl">
        {/* LE RETOUR DE CET ÉCRAN-CI RESTE SUR CET ÉCRAN-CI. L'affinage n'est
            pas une étape du parcours : c'est un dépliant de l'écran résultat,
            et son retour referme le dépliant au lieu de remonter le parcours
            d'un cran. Le bouton du bas fait la même chose en le disant
            autrement — l'un valide, l'autre renonce, les deux ramènent au même
            endroit, et ce qui a été déclaré reste déclaré. */}
        <StepBackLink onClick={() => ouvrirAffinage(false)}>
          Retour à mon estimation
        </StepBackLink>

        <div className="flex justify-end">
          <motion.div
            layout
            initial={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduce ? 0.2 : 0.45, ease: EASE }}
            className="panneau-verre flex items-baseline gap-3 px-5 py-3"
          >
            <span className="font-mono text-[0.56rem] uppercase tracking-micro text-ink/55">
              Estimation
            </span>
            <span className="titre-etape whitespace-nowrap text-[1.35rem] leading-none text-laiton-texte tabular-nums">
              {formatted ?? '— €'}
            </span>
          </motion.div>
        </div>

        <div className="mt-5 w-full max-w-sm">
          <EstimationAffinagePanel
            type={type}
            options={options}
            onChange={setOptions}
            onTermine={() => ouvrirAffinage(false)}
          />
        </div>
      </div>
    )
  }

  if (!started) {
    return (
      // Le retour reste au-dessus du panneau, en tête de colonne (voir
      // `StepBackLink`).
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
              <div className="montant-cadre mt-5 flex items-center justify-center">
                <PriceReveal
                  formatted={formatted ?? '— €'}
                  revealStage={0}
                  tailleMax="6.5rem"
                  className="montant titre-etape whitespace-nowrap leading-none text-laiton-texte"
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

              <div className="montant-cadre mt-4 flex items-center justify-center">
                <PriceReveal
                  formatted={formatted ?? '— €'}
                  revealStage={finished ? 5 : revealStage}
                  tailleMax="3.5rem"
                  className="montant titre-etape whitespace-nowrap leading-none text-laiton-texte"
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

          {/* AFFINER — le bouton qui rend la parole au vendeur. Il n'apparaît
              qu'une fois l'estimation rendue : avant, il n'y aurait rien à
              affiner. Volontairement de la taille d'une action principale, et
              non d'un lien discret — c'est la seule chose qui reste à faire sur
              cet écran, et elle change le montant. */}
          {finished ? (
            <motion.div
              initial={{ opacity: 0, y: reduce ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0.2 : 0.5, ease: EASE, delay: reduce ? 0 : 0.25 }}
              className="mt-4"
            >
              <button
                type="button"
                onClick={() => ouvrirAffinage(true)}
                className="bouton-tunnel flex w-full items-center justify-center gap-2.5 px-6 py-4"
              >
                <SlidersHorizontal className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                <span className="text-[0.82rem] font-semibold uppercase tracking-[0.07em]">
                  Affiner mon estimation
                </span>
              </button>
              {/* Rien sous ce bouton. La phrase qui y énumérait les compléments
                  — balcon, panneaux, standing, « ce que les bases publiques
                  ignorent » — les annonçait à un vendeur qui n'a pas encore
                  choisi d'affiner, et qui les découvre de toute façon à l'écran
                  suivant. Un bouton qui dit ce qu'il fait n'a pas besoin d'être
                  glosé. */}
            </motion.div>
          ) : null}
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
