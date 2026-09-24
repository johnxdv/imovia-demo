import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * Cachet rond frappé sous la fourchette, une fois l'estimation dévoilée.
 *
 * Il ne reste pas : il descend, frappe, tient une seconde, puis se relève et
 * s'efface — et le composant se démonte de lui-même à la dernière image. C'est
 * un geste, pas une mention ; rien n'en subsiste à l'écran.
 *
 * **Conséquence à connaître** : les deux phrases qu'il porte (« prix soumis à
 * expertise », « hors estimation du terrain ») ne sont donc plus affichées de
 * façon permanente nulle part sur l'écran de résultat. Elles passent avec le
 * cachet.
 *
 * Le dessin est en SVG plutôt qu'en cercle CSS : un cachet n'est jamais un
 * cercle parfait, et `feTurbulence` + `feDisplacementMap` déforment d'un coup
 * la couronne ET les lettres. Un `border-radius: 50%` resterait géométrique,
 * ce qui trahit le procédé à la première lecture.
 *
 * Le bois du tampon se lit dans l'encre : un second bruit, très étiré en
 * largeur et serré en hauteur, dessine des veines horizontales qui éclaircissent
 * le noir par endroits. Il est volontairement faible — la commande était un
 * tampon de bois à la finition soignée, pas une planche brute.
 */

/** Noir du cachet : l'Ink Navy de la charte, seul noir du site. */
const ENCRE = '#10141C'

/**
 * Durée totale, frappe et effacement compris. Le découpage est dans `times` :
 * frappe jusqu'à 0,4 (≈ 840 ms), maintien jusqu'à 0,74, puis levée et fondu.
 */
const DUREE = 2.1

export function PriceStamp() {
  const reduce = useReducedMotion()
  // Le cachet gère lui-même sa fin de vie : l'écran qui l'accueille n'a pas à
  // tenir un minuteur ni un état pour un élément qui ne dure que le temps de
  // son animation.
  const [efface, setEfface] = useState(false)
  if (efface) return null

  // Sous `prefers-reduced-motion`, il ne reste que l'apparition et le retrait :
  // la chute, l'écrasement et le rebond sont exactement ce que ce réglage
  // demande d'éviter.
  const anime = reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: [0, 1, 1, 0] },
        transition: { duration: 1.8, times: [0, 0.2, 0.7, 1], ease: 'easeInOut' },
      }
    : {
        // Sept images-clés : survol haut et large, descente, FRAPPE (écrasé
        // sous la main, donc plus petit que sa taille de repos), rebond,
        // repos, maintien, puis levée — le cachet s'éloigne et s'efface, comme
        // une main qui le retire du papier.
        initial: { opacity: 0, scale: 1.55, rotate: -11, y: -52 },
        animate: {
          // L'agrandissement reste contenu et l'encre ne monte qu'à 0,45 le
          // temps de l'approche : au départ, le cachet est assez large pour
          // effleurer la fourchette au-dessus de lui, et une version plus
          // ample le faisait franchement passer sur les deux montants — ce
          // qu'on voulait justement éviter en le descendant sous eux.
          opacity: [0, 0.45, 1, 1, 1, 1, 0],
          scale: [1.55, 1.25, 0.95, 1.05, 1, 1, 1.06],
          rotate: [-11, -8.5, -3.2, -4.8, -4, -4, -4],
          y: [-52, -22, 3, -4, 0, 0, -12],
        },
        transition: {
          duration: DUREE,
          times: [0, 0.18, 0.26, 0.33, 0.4, 0.74, 1],
          ease: ['easeIn', 'easeIn', 'easeOut', 'easeInOut', 'linear', 'easeIn'],
        },
      }

  return (
    // Le centrage est porté par ce conteneur, jamais par le bloc animé :
    // Framer Motion écrit `transform` en style inline et écraserait un
    // `-translate-x-1/2` posé en classe Tailwind.
    <div className="pointer-events-none absolute inset-x-0 top-full z-10 -mt-4 flex justify-center">
      <motion.div
        className="w-[12rem] sm:w-[16rem]"
        onAnimationComplete={() => setEfface(true)}
        {...anime}
      >
        <span className="sr-only">Prix soumis à expertise, hors estimation du terrain</span>

        <svg viewBox="0 0 300 300" className="w-full" aria-hidden="true">
          <defs>
            {/* Irrégularité du tracé : le bruit déplace chaque point de la
                couronne et des lettres. `scale` reste modeste — au-delà, les
                glyphes se désagrègent et la mention cesse d'être lisible, ce
                qu'aucun vrai cachet ne fait. */}
            <filter id="imv-cachet-bord" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.021" numOctaves="3" seed="5" result="bruit" />
              <feDisplacementMap
                in="SourceGraphic"
                in2="bruit"
                scale="2.8"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>

            {/* Veines de bois : bruit très étiré en x (0.007) et serré en y
                (0.55), soit de fines bandes horizontales. La pente de la
                dernière ligne (0,6) écrête la distribution : quelques veines
                claires, pas un grisé général, et aucune entaille franche — la
                commande était un tampon de bois à la finition soignée, pas une
                planche brute. */}
            <filter id="imv-cachet-bois" x="0%" y="0%" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.007 0.55" numOctaves="4" seed="17" result="veine" />
              <feColorMatrix
                in="veine"
                type="matrix"
                values="0 0 0 0 0
                        0 0 0 0 0
                        0 0 0 0 0
                        0.6 0.6 0.6 0 -0.95"
              />
            </filter>

            <mask id="imv-cachet-encre">
              <rect width="300" height="300" fill="#fff" />
              <rect width="300" height="300" filter="url(#imv-cachet-bois)" />
            </mask>
          </defs>

          <g
            filter="url(#imv-cachet-bord)"
            mask="url(#imv-cachet-encre)"
            fill="none"
            stroke={ENCRE}
            opacity="0.92"
          >
            <circle cx="150" cy="150" r="142" strokeWidth="6" />
            <circle cx="150" cy="150" r="130" strokeWidth="1.6" />

            {/* Filet de séparation entre les deux mentions, interrompu par un
                losange : c'est ce détail, plus que la couronne, qui distingue
                un cachet soigné d'un rond tracé à la hâte. */}
            <path d="M62 147 H136 M164 147 H238" strokeWidth="1.4" />
            <path d="M150 141.5 L155 147 L150 152.5 L145 147 Z" strokeWidth="1.2" />

            {/* IBM Plex Mono n'est chargée qu'en 400 et 500 (voir
                `index.html`) : la graisse vient d'un contour appliqué aux
                glyphes (`paint-order` place le trait sous le remplissage), et
                non d'un `font-weight: 700` que le navigateur fabriquerait de
                toutes pièces. Même règle que la Prata des titres — pas de faux
                gras sur ce site. */}
            <g
              fill={ENCRE}
              stroke={ENCRE}
              strokeWidth="0.45"
              paintOrder="stroke fill"
              fontFamily='"IBM Plex Mono", ui-monospace, SFMono-Regular, monospace'
              fontSize="14"
              fontWeight="500"
              letterSpacing="0.5"
              textAnchor="middle"
            >
              {/* Les deux lignes tiennent dans la corde du cercle intérieur :
                  à 25 unités du centre, elle mesure encore 255 unités, et la
                  plus longue des deux en occupe 231. */}
              <text x="150" y="135">PRIX SOUMIS À EXPERTISE</text>
              <text x="150" y="175">HORS ESTIMATION DU TERRAIN</text>
            </g>
          </g>
        </svg>
      </motion.div>
    </div>
  )
}
