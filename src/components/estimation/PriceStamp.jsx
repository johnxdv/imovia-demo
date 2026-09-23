import { motion, useReducedMotion } from 'framer-motion'

/**
 * Tampon encreur « Prix soumis à expertise », abattu sur le montant au moment
 * où celui-ci se défloute.
 *
 * Il porte la mention que l'écran de résultat affichait jusqu'ici en ligne
 * rouge pulsée sous la fourchette. Le texte n'a pas changé — seul son support
 * a changé : une mention posée SUR le chiffre nuance le chiffre, là où une
 * ligne posée dessous se lit comme une note de bas de page qu'on saute.
 *
 * Tout le dessin est en SVG plutôt qu'en bordure CSS : un tampon ne s'imprime
 * jamais droit ni plein, et c'est le filtre `feTurbulence` + `feDisplacementMap`
 * qui donne d'un coup le tremblé du cadre ET celui des lettres. Un cadre CSS
 * resterait un rectangle parfait, ce qui trahit immédiatement le procédé.
 *
 * **Le montant passe dans la bande vide du tampon**, entre « PRIX SOUMIS » et
 * « À EXPERTISE » — disposition d'un cachet d'administration, texte en haut,
 * texte en bas, la mention centrale restant lisible entre les deux. Un premier
 * essai posait les deux lignes en travers des chiffres : l'encre rouge et les
 * chiffres noirs se mangeaient l'un l'autre, et ni le montant ni la mention ne
 * se lisaient plus. Les positions de texte du `viewBox` et la hauteur réservée
 * à l'accueil du tampon (`EstimationResultStep`) se répondent donc : toucher à
 * l'une sans l'autre ramène le chevauchement.
 *
 * `mix-blend-multiply` achève l'illusion là où le cadre croise tout de même
 * les chiffres : l'encre les assombrit au lieu de les masquer.
 */

/** Rouge du tampon — celui de la mention d'alerte qu'il remplace (`red-700`). */
const ENCRE = '#b91c1c'

/**
 * Minutage. Le flou du montant se lève en 500 ms (`transition-[filter]
 * duration-500` dans `PriceReveal`) : le tampon part donc en même temps que
 * lui, et sa frappe tombe à ~440 ms, juste au moment où les chiffres
 * deviennent nets. Ni avant — on tamponnerait un montant encore illisible —
 * ni après, où le montant resterait seul à l'écran le temps d'un battement.
 */
const DUREE = 0.78

export function PriceStamp() {
  // Le tampon lit lui-même le réglage système plutôt que de le recevoir de
  // l'écran qui l'accueille : la frappe est sa seule raison d'être, et c'est
  // le genre de mouvement (descente rapide, rebond, tremblement) que
  // `prefers-reduced-motion` demande d'éviter. Sous ce réglage, il se pose en
  // fondu à sa place finale.
  const reduce = useReducedMotion()
  const anime = reduce
    ? {
        initial: { opacity: 0, scale: 1, rotate: -5.2, x: 0, y: 0 },
        animate: { opacity: 1, scale: 1, rotate: -5.2, x: 0, y: 0 },
        transition: { duration: 0.35, ease: 'easeOut' },
      }
    : {
        // Six images-clés : survol haut et large (le tampon est « près de
        // l'œil »), descente, FRAPPE en t=0,55 — écrasé sous la main, donc
        // légèrement plus petit que sa taille de repos —, rebond, contrecoup,
        // repos. L'inclinaison bouge à chaque temps : un tampon ne retombe
        // jamais deux fois au même angle, et c'est ce décalage qui fait le
        // geste humain.
        initial: { opacity: 0, scale: 2.6, rotate: -13, x: 6, y: -58 },
        animate: {
          opacity: [0, 0.55, 1, 1, 1, 1],
          scale: [2.6, 1.6, 0.94, 1.05, 0.985, 1],
          rotate: [-13, -10.5, -4.2, -6.2, -4.7, -5.2],
          x: [6, 3, -2, 1.5, -0.8, 0],
          y: [-58, -24, 3, -4, 1.5, 0],
        },
        transition: {
          duration: DUREE,
          times: [0, 0.4, 0.55, 0.68, 0.82, 1],
          // Accélération franche à la descente, amorti après l'impact.
          ease: ['easeIn', 'easeIn', 'easeOut', 'easeInOut', 'easeOut'],
        },
      }

  return (
    // Le centrage est porté par ce conteneur, jamais par le bloc animé :
    // Framer Motion écrit `transform` en style inline et écraserait un
    // `-translate-x-1/2` posé en classe Tailwind.
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <motion.div
        role="note"
        className="w-[16rem] mix-blend-multiply sm:w-[19rem]"
        {...anime}
      >
        <span className="sr-only">Prix soumis à expertise</span>

        <svg viewBox="0 0 360 200" className="w-full" aria-hidden="true">
          <defs>
            {/* Tremblé du tracé : le bruit déplace chaque point du cadre et
                des lettres de quelques unités. `scale` est volontairement
                modeste — au-delà, les glyphes se désagrègent et la mention
                cesse d'être lisible, ce qu'aucun vrai tampon ne fait. */}
            <filter id="imv-tampon-tremble" x="-12%" y="-12%" width="124%" height="124%">
              <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7" result="bruit" />
              <feDisplacementMap
                in="SourceGraphic"
                in2="bruit"
                scale="3.4"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>

            {/* Usure : des plages d'encre manquantes, là où le tampon n'a pas
                porté. Bruit fin converti en taches noires clairsemées (le
                −1.55 de la dernière ligne est le seuil : il ne laisse passer
                que le haut de la distribution), puis posées en masque. */}
            <filter id="imv-tampon-grain" x="0%" y="0%" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="4" seed="11" result="grain" />
              <feColorMatrix
                in="grain"
                type="matrix"
                values="0 0 0 0 0
                        0 0 0 0 0
                        0 0 0 0 0
                        1.1 1.1 1.1 0 -1.55"
              />
            </filter>

            <mask id="imv-tampon-usure">
              <rect width="360" height="200" fill="#fff" />
              <rect width="360" height="200" filter="url(#imv-tampon-grain)" />
            </mask>
          </defs>

          <g
            filter="url(#imv-tampon-tremble)"
            mask="url(#imv-tampon-usure)"
            fill="none"
            stroke={ENCRE}
            opacity="0.88"
          >
            <rect x="4.5" y="4.5" width="351" height="191" rx="13" strokeWidth="5.5" />
            <rect x="15" y="15" width="330" height="170" rx="8" strokeWidth="1.8" />

            {/* IBM Plex Mono n'est chargée qu'en 400 et 500 (voir
                `index.html`) : la graisse du tampon vient donc d'un contour
                appliqué aux glyphes (`paint-order` place le trait sous le
                remplissage), et non d'un `font-weight: 700` que le navigateur
                fabriquerait de toutes pièces. Même règle que la Prata des
                titres — pas de faux gras sur ce site. */}
            <g
              fill={ENCRE}
              stroke={ENCRE}
              strokeWidth="1.15"
              paintOrder="stroke fill"
              fontFamily='"IBM Plex Mono", ui-monospace, SFMono-Regular, monospace'
              fontSize="34"
              fontWeight="500"
              letterSpacing="2.5"
              textAnchor="middle"
            >
              {/* Lignes calées au ras du cadre, haut et bas : les ~87 unités
                  laissées entre elles sont la fenêtre par laquelle le montant
                  se lit. */}
              <text x="180" y="56">PRIX SOUMIS</text>
              <text x="180" y="175">À EXPERTISE</text>
            </g>
          </g>
        </svg>
      </motion.div>
    </div>
  )
}
