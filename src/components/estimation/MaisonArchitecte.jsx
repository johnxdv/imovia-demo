import { Planche, Aplat, Trait } from './encre'
import { Cypres, Fenetres, GardeCorps, Haie, Ombre, PinParasol, Piscine } from './motifs'

/**
 * La villa d'architecte de l'écran d'adresse — le dessin qui se trace pendant
 * que l'utilisateur cherche son adresse.
 *
 * ── Ce qu'elle remplace, et pourquoi ──────────────────────────────────────
 *
 * Une maisonnette : pignon, toit à deux pentes, cheminée, deux fenêtres, un
 * arbre en boule. Elle tenait en dix-huit segments et se lisait exactement pour
 * ce qu'elle était — la maison qu'on dessine à six ans. Sur un outil qui estime
 * des biens de standing, c'est la première image du parcours et elle disait le
 * mauvais bien.
 *
 * Le sujet demandé est une demeure d'architecte avec piscine et pins de luxe.
 * Il est tenu par le dessin lui-même, pas par une intention : deux volumes
 * décalés, des dalles en débord franc, une baie toute hauteur, un bassin en
 * légère plongée, deux pins parasols — chacun avec son tronc déhanché, ses
 * charpentières en candélabre et ses trois bouquets de couronne
 * ([`motifs.jsx`](./motifs.jsx)).
 *
 * ── Les cotes, et ce qu'elles servent ─────────────────────────────────────
 *
 *  - **Le débord des dalles** (huit unités de chaque côté, deux traits par
 *    dalle) est ce qui fait l'architecte. Une dalle arasée au nu du mur redonne
 *    un pavillon, quelle que soit la qualité du reste.
 *  - **L'étage est en porte-à-faux** sur le rez-de-chaussée, et décalé vers la
 *    droite : deux volumes empilés à l'aplomb l'un de l'autre font un immeuble
 *    étroit.
 *  - **La baie fait toute la hauteur du niveau**, meneaux compris. C'est le
 *    second signal de la maison contemporaine ; des fenêtres percées dans un
 *    mur ne le donnent pas.
 *  - **Le bassin fuit** — bord lointain plus court que le bord proche. Une
 *    piscine dessinée en rectangle se lit comme une dalle peinte en bleu.
 *
 * ── Le format ─────────────────────────────────────────────────────────────
 *
 * Large et bas (300 × 152), et cadré au plus juste : c'est ce qui permet au
 * bloc qui l'accueille de se dimensionner d'un simple `aspect-[300/152]`, sans
 * hauteur à régler par point de rupture.
 *
 * La scène se joue une fois et ne boucle pas : c'est un écran de saisie, et un
 * dessin qui se redessinerait en continu derrière un champ deviendrait un
 * clignotant. Sous `prefers-reduced-motion`, le filet CSS global ramène les
 * durées à néant en gardant `forwards` — la villa s'affiche d'emblée terminée.
 */

/** Le cadre, resserré sur le dessin : cime des pins en haut, bassin en bas. */
const VUE = '0 0 300 152'

/** Ligne de sol, et niveaux du corps principal. */
const SOL = 118
const DALLE_BASSE = 84
const DALLE_HAUTE = 52

export function MaisonArchitecte({ duree = 5, className = '' }) {
  // Le minutage est écrit sur cinq secondes ; `cadence` étire l'ensemble sans
  // qu'aucun retard ci-dessous n'ait à bouger.
  return (
    <Planche vue={VUE} cadence={duree / 5} align="xMidYMax" className={className}>
      {/* 1. Les lointains — une ligne de collines, tout ce qu'il faut pour que
             la villa soit posée quelque part plutôt que sur du blanc. */}
      <Trait
        d="M 0 74 C 34 66, 58 71, 82 64 C 112 55, 138 68, 168 62 C 202 55, 236 67, 268 60 C 282 57, 292 61, 300 58"
        duree={1.1}
        retard={0.2}
        largeur={1}
        opacite={0.26}
      />

      {/* 2. Le terrain. Il passe derrière tout le bâti : on le pose d'abord, on
             construit dessus. */}
      <Trait
        d={`M 0 ${SOL} C 62 ${SOL - 3}, 118 ${SOL + 2}, 176 ${SOL - 1} C 228 ${SOL - 4}, 266 ${SOL + 1}, 300 ${SOL - 2}`}
        duree={1}
        retard={0.5}
        largeur={1.6}
      />

      {/* 3. Le corps principal, du sol vers le ciel — et l'aile basse ensuite,
             parce qu'elle s'appuie sur lui. */}
      <Trait
        d={`M 94 ${SOL} L 93 ${DALLE_BASSE} L 194 ${DALLE_BASSE - 1} L 195 ${SOL - 1}`}
        duree={0.9}
        retard={0.9}
        largeur={1.9}
      />
      <Trait d={`M 85 ${DALLE_BASSE} L 204 ${DALLE_BASSE - 1}`} duree={0.5} retard={1.35} largeur={1.6} />
      <Trait
        d={`M 85 ${DALLE_BASSE - 5} L 204 ${DALLE_BASSE - 6}`}
        duree={0.45}
        retard={1.45}
        largeur={1.2}
        opacite={0.7}
      />

      {/* L'étage, décalé à droite et débordant : le porte-à-faux est le geste. */}
      <Trait
        d={`M 112 ${DALLE_BASSE - 6} L 111 ${DALLE_HAUTE} L 210 ${DALLE_HAUTE - 1} L 211 ${DALLE_BASSE - 7}`}
        duree={0.8}
        retard={1.7}
        largeur={1.8}
      />
      <Trait d={`M 103 ${DALLE_HAUTE} L 220 ${DALLE_HAUTE - 1}`} duree={0.5} retard={2.1} largeur={1.6} />
      <Trait
        d={`M 103 ${DALLE_HAUTE - 5} L 220 ${DALLE_HAUTE - 6}`}
        duree={0.45}
        retard={2.2}
        largeur={1.2}
        opacite={0.7}
      />

      {/* L'aile basse, à gauche, et sa toiture-terrasse. */}
      <Trait d={`M 48 ${SOL} L 47 92 L 94 91`} duree={0.6} retard={2.35} largeur={1.7} />
      <Trait d="M 40 92 L 101 91" duree={0.4} retard={2.6} largeur={1.5} />
      <Trait d="M 40 88 L 101 87" duree={0.35} retard={2.68} largeur={1.1} opacite={0.65} />

      {/* 4. Les percements. La grande baie d'abord — c'est la pièce
             maîtresse — puis les baies de l'étage et celle de l'aile. */}
      <Fenetres liste={[[102, 90, 84, 26]]} retard={2.8} opacite={0.1} />
      <Trait d="M 130 90 L 129.6 116" duree={0.3} retard={3.05} largeur={0.8} opacite={0.32} />
      <Trait d="M 158 90 L 157.6 116" duree={0.3} retard={3.1} largeur={0.8} opacite={0.32} />
      <Fenetres
        liste={[
          [120, 60, 20, 18],
          [148, 60, 20, 18],
          [176, 60, 24, 18],
        ]}
        retard={3.15}
        opacite={0.1}
        meneau
      />
      <Fenetres liste={[[58, 98, 26, 18]]} retard={3.35} opacite={0.09} meneau />

      {/* Le garde-corps de la terrasse d'étage, au-dessus de l'aile : il dit
          que la toiture-terrasse se pratique, et rattrape le vide à gauche. */}
      <GardeCorps x1={44} x2={92} y={88} hauteur={11} pas={9} retard={3.4} opacite={0.5} />

      {/* 5. La terrasse, puis le bassin qui s'y creuse.

             La terrasse est dessinée **en plongée** : bord lointain court au
             pied de la villa, bord proche large en bas du cadre, et des joints
             de dalle qui fuient de l'un à l'autre. C'est elle qui donne au
             dessin son sol — sans elle, le bassin flottait sous la maison comme
             un tapis posé sur du blanc, ce qu'il faisait dans toutes les
             versions précédentes.

             Les joints ne convergent pas vers un point unique : un tracé à la
             main ne tient pas un point de fuite, et le tenir se verrait plus
             que de ne pas le tenir. */}
      <Trait
        d="M 30 122 C 96 120, 168 124, 234 121"
        duree={0.55}
        retard={3.4}
        largeur={1}
        opacite={0.45}
      />
      <Trait d="M 30 122 L 4 151 M 234 121 L 268 150" duree={0.4} retard={3.55} largeur={1} opacite={0.35} />
      <Trait
        d="M 4 151 C 88 148, 182 153, 268 150"
        duree={0.6}
        retard={3.65}
        largeur={1.2}
        opacite={0.5}
      />
      {[
        'M 62 122 L 46 151',
        'M 122 122 L 120 152',
        'M 186 122 L 200 151',
      ].map((d, rang) => (
        <Trait key={d} d={d} duree={0.3} retard={3.8 + rang * 0.07} largeur={0.8} opacite={0.16} />
      ))}

      <Piscine cx={118} y={129} largeur={132} profondeur={16} retard={3.9} />

      {/* 6. Les pins de luxe. Le grand à droite, planté au niveau de la
             terrasse : son fût monte le long du pignon et sa couronne déborde
             le cadre, ce qui pose le dessin dans un lieu plutôt que sur une
             feuille. Le second en arrière-plan à gauche, plus petit et plus
             pâle et en retrait derrière lui — c'est cet écart d'encre, et le
             chevauchement des deux couronnes, qui font la profondeur : le trait
             n'a pas de valeur pour la donner. Un cyprès ferme la composition à
             gauche, étroit là où un second pin aurait recouvert l'aile. */}
      <PinParasol x={262} base={122} hauteur={76} retard={2.9} />
      <PinParasol x={224} base={120} hauteur={52} retard={3.25} opacite={0.4} />
      <Cypres x={22} base={118} hauteur={54} retard={3.45} opacite={0.5} />

      {/* 7. Le premier plan : une haie basse le long du fond de terrasse, à
             gauche, et une ombre courte au pied du corps principal — en
             dernier, une fois que tout ce qui la projette existe. */}
      <Haie x1={36} x2={86} y={122} hauteur={10} retard={4.3} opacite={0.38} />
      <Ombre x={94} y={119} longueur={26} rangs={2} retard={4.45} pente={0.1} opacite={0.13} />

      {/* Le lavis d'ombre sous la dalle du porte-à-faux : c'est lui qui fait
          décoller l'étage du rez-de-chaussée. */}
      <Aplat
        d={`M 111 ${DALLE_BASSE - 6} L 211 ${DALLE_BASSE - 7} L 211 ${DALLE_BASSE - 3} L 111 ${DALLE_BASSE - 2} Z`}
        retard={4.45}
        duree={0.4}
        opacite={0.12}
      />
    </Planche>
  )
}
