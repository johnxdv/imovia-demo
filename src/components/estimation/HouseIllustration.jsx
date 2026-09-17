import { Planche, Aplat, Trait } from './encre'
import {
  Cypres,
  Fenetres,
  GardeCorps,
  Haie,
  Lucarne,
  Mansarde,
  Marches,
  Muret,
  Olivier,
  Ombre,
  ParasolJardin,
  PinParasol,
  Piscine,
  Souche,
  Transat,
} from './motifs'

/**
 * Les cinq dessins de la fenêtre de surface — un par palier du curseur.
 *
 * ── La progression, et ce qu'elle raconte ─────────────────────────────────
 *
 *  - **jusqu'à 100 m²** — une petite maison d'architecte : un volume, une
 *    dalle en débord, une baie toute hauteur.
 *  - **jusqu'à 200 m²** — la même en deux niveaux, l'étage en porte-à-faux, et
 *    un pin parasol.
 *  - **jusqu'à 250 m²** — la piscine arrive devant la terrasse.
 *  - **jusqu'à 400 m²** — le jardin : transats, parasol, haies, arbres. Ce
 *    n'est plus une maison avec un bassin, c'est une propriété.
 *  - **au-delà** — un château : corps central à la Mansart, deux ailes, deux
 *    pavillons coiffés en pointe, perron à degrés et parterre à la française.
 *
 * Cinq dessins distincts plutôt qu'une forme unique qu'on déformerait : à
 * 600 m², ce n'est plus la même maison en plus grand, c'est un autre programme.
 * Une interpolation continue aurait donné un pavillon étiré, là où le saut de
 * palier raconte quelque chose.
 *
 * ── Le trait ──────────────────────────────────────────────────────────────
 *
 * Le même que partout ailleurs dans le parcours : le vocabulaire de motifs de
 * [`motifs.jsx`](./motifs.jsx), en vraies cubiques. Les dessins qu'ils
 * remplacent étaient des rectangles empilés sous un filtre de bruit — cinq
 * maisons de vingt segments, qui se lisaient comme telles à toutes les tailles.
 *
 * Les cinq partagent la même `viewBox` et la même ligne de sol : au fondu
 * enchaîné, le terrain ne bouge pas, seul le bâti change.
 *
 * ── Le minutage ───────────────────────────────────────────────────────────
 *
 * Les cinq paliers sont montés d'emblée et se tracent une seule fois, à
 * l'ouverture de la fenêtre — y compris ceux qu'on ne voit pas, qui se
 * dessinent derrière leur opacité nulle. Passé la première seconde et demie,
 * changer de palier ne trace plus rien : c'est un fondu enchaîné entre cinq
 * dessins déjà posés, et le curseur répond au doigt sans jamais montrer une
 * maison à moitié construite.
 */

// Plus haute que le bâti ne le demande : le bassin des deux derniers paliers
// descend sous la ligne de sol, et une `viewBox` calée sur celle-ci l'aurait
// tranché net.
const VUE = '0 0 280 150'

/** Ligne de sol, commune aux cinq paliers — c'est elle qui ne bouge pas. */
const SOL = 112

/** Cadence des cinq dessins : ils sont écrits sur 3 s, tracés en 1,6 s. */
const CADENCE = 1.6 / 3

/** Le terrain, identique partout : premier trait de chaque palier. */
function Terrain() {
  return (
    <Trait
      d={`M 4 ${SOL} C 70 ${SOL - 3}, 140 ${SOL + 2}, 202 ${SOL - 1} C 238 ${SOL - 3}, 262 ${SOL + 1}, 276 ${SOL - 1}`}
      duree={0.7}
      retard={0.1}
      largeur={1.5}
    />
  )
}

/** Jusqu'à 100 m² — un seul volume, mais déjà d'architecte. */
function Petite() {
  return (
    <>
      <Terrain />
      <Trait d={`M 104 ${SOL} L 103 68 L 178 67 L 179 ${SOL - 1}`} duree={0.7} retard={0.5} largeur={1.8} />
      <Trait d="M 96 68 L 186 67" duree={0.4} retard={0.9} largeur={1.5} />
      <Trait d="M 96 63 L 186 62" duree={0.35} retard={0.98} largeur={1.1} opacite={0.65} />
      <Fenetres liste={[[110, 76, 62, 34]]} retard={1.15} opacite={0.1} />
      <Trait d="M 131 77 L 130.6 109 M 152 77 L 151.6 109" duree={0.3} retard={1.4} largeur={0.8} opacite={0.32} />

      {/* L'auvent d'entrée, à droite : un porte-à-faux sur un poteau unique.
          C'est le geste minimal qui distingue une maison d'architecte d'un
          cube — et à ce format, il n'y a de place que pour lui. */}
      <Trait d="M 179 84 L 214 83" duree={0.3} retard={1.5} largeur={1.4} />
      <Trait d="M 179 88 L 214 87" duree={0.25} retard={1.58} largeur={1} opacite={0.6} />
      <Trait d={`M 211 87 L 212 ${SOL - 1}`} duree={0.25} retard={1.66} largeur={1.1} opacite={0.7} />
      <Fenetres liste={[[184, 92, 20, 18]]} retard={1.75} opacite={0.09} />

      <Olivier x={70} base={SOL} rayon={17} retard={1.9} />
      <Haie x1={188} x2={232} y={SOL} hauteur={9} retard={2.15} opacite={0.4} />
      <Ombre x={104} y={SOL + 1} longueur={26} rangs={2} retard={2.35} pente={0.1} opacite={0.13} />
    </>
  )
}

/** Jusqu'à 200 m² — deux niveaux, l'étage en porte-à-faux, et un pin. */
function Etage() {
  return (
    <>
      <Terrain />
      <Trait d={`M 88 ${SOL} L 87 72 L 170 71 L 171 ${SOL - 1}`} duree={0.7} retard={0.5} largeur={1.8} />
      <Trait d="M 80 72 L 178 71" duree={0.4} retard={0.9} largeur={1.5} />
      <Trait d="M 80 67 L 178 66" duree={0.35} retard={0.98} largeur={1.1} opacite={0.65} />
      <Trait d="M 102 66 L 101 34 L 182 33 L 183 65" duree={0.6} retard={1.15} largeur={1.7} />
      <Trait d="M 94 34 L 190 33" duree={0.35} retard={1.45} largeur={1.4} />
      <Trait d="M 94 29 L 190 28" duree={0.3} retard={1.52} largeur={1} opacite={0.6} />

      <Fenetres liste={[[94, 80, 60, 30]]} retard={1.65} opacite={0.1} />
      <Trait d="M 114 81 L 113.6 109 M 134 81 L 133.6 109" duree={0.28} retard={1.85} largeur={0.8} opacite={0.32} />
      <Fenetres
        liste={[
          [110, 42, 18, 16],
          [134, 42, 18, 16],
          [158, 42, 18, 16],
        ]}
        retard={1.95}
        opacite={0.1}
        meneau
      />
      <GardeCorps x1={84} x2={98} y={66} hauteur={10} pas={7} retard={2.1} opacite={0.45} />

      {/* Le lavis sous la dalle du porte-à-faux : c'est lui qui fait décoller
          l'étage du rez-de-chaussée. */}
      <Aplat d="M 101 66 L 183 65 L 183 68 L 101 69 Z" retard={2.2} duree={0.35} opacite={0.12} />

      <PinParasol x={228} base={SOL} hauteur={72} retard={1.7} />
      <Cypres x={56} base={SOL} hauteur={46} retard={2.25} opacite={0.5} />
      <Ombre x={88} y={SOL + 1} longueur={28} rangs={2} retard={2.45} pente={0.1} opacite={0.13} />
    </>
  )
}

/** Jusqu'à 250 m² — la maison à étage, et le bassin devant la terrasse. */
function AvecPiscine() {
  return (
    <>
      <Terrain />
      <Trait d={`M 86 ${SOL} L 85 74 L 162 73 L 163 ${SOL - 1}`} duree={0.7} retard={0.5} largeur={1.8} />
      <Trait d="M 78 74 L 170 73" duree={0.4} retard={0.9} largeur={1.5} />
      <Trait d="M 78 69 L 170 68" duree={0.35} retard={0.98} largeur={1.1} opacite={0.65} />
      <Trait d="M 98 68 L 97 38 L 174 37 L 175 67" duree={0.6} retard={1.12} largeur={1.7} />
      <Trait d="M 90 38 L 182 37" duree={0.35} retard={1.4} largeur={1.4} />
      <Trait d="M 90 33 L 182 32" duree={0.3} retard={1.47} largeur={1} opacite={0.6} />
      <Fenetres liste={[[92, 82, 56, 28]]} retard={1.6} opacite={0.1} />
      <Trait d="M 111 83 L 110.6 109 M 130 83 L 129.6 109" duree={0.28} retard={1.8} largeur={0.8} opacite={0.32} />
      <Fenetres
        liste={[
          [106, 46, 18, 16],
          [130, 46, 18, 16],
          [154, 46, 18, 16],
        ]}
        retard={1.88}
        opacite={0.1}
        meneau
      />

      {/* La terrasse en plongée, puis le bassin qui s'y creuse : sans le plan
          de terrasse, le bassin flotte sous la maison comme un tapis. */}
      <Trait d="M 40 118 C 100 116, 168 120, 226 117" duree={0.45} retard={2}
        largeur={0.9} opacite={0.4} />
      <Trait d="M 40 118 L 22 148 M 226 117 L 248 147" duree={0.3} retard={2.1} largeur={0.9} opacite={0.3} />
      <Piscine cx={130} y={122} largeur={140} profondeur={20} retard={2.2} />

      <PinParasol x={224} base={SOL} hauteur={76} retard={1.6} />
      <Cypres x={52} base={SOL} hauteur={48} retard={2.1} opacite={0.5} />
      <Ombre x={86} y={SOL + 1} longueur={24} rangs={2} retard={2.6} pente={0.1} opacite={0.13} />
    </>
  )
}

/** Jusqu'à 400 m² — le bassin, les transats, le parasol : une propriété. */
function Jardin() {
  return (
    <>
      <Terrain />
      {/* La maison se décale à droite et rétrécit un peu : c'est le jardin qui
          est le sujet du palier, et il lui faut la moitié gauche du cadre. */}
      <Trait d={`M 140 ${SOL} L 139 74 L 216 73 L 217 ${SOL - 1}`} duree={0.7} retard={0.5} largeur={1.8} />
      <Trait d="M 132 74 L 224 73" duree={0.4} retard={0.9} largeur={1.5} />
      <Trait d="M 132 69 L 224 68" duree={0.35} retard={0.98} largeur={1.1} opacite={0.65} />
      <Trait d="M 152 68 L 151 40 L 228 39 L 229 67" duree={0.55} retard={1.1} largeur={1.7} />
      <Trait d="M 144 40 L 236 39" duree={0.35} retard={1.36} largeur={1.4} />
      <Trait d="M 144 35 L 236 34" duree={0.3} retard={1.43} largeur={1} opacite={0.6} />
      <Fenetres liste={[[146, 82, 56, 28]]} retard={1.55} opacite={0.1} />
      <Trait d="M 165 83 L 164.6 109 M 184 83 L 183.6 109" duree={0.28} retard={1.74} largeur={0.8} opacite={0.32} />
      <Fenetres liste={[[160, 48, 18, 16], [184, 48, 18, 16], [208, 48, 18, 16]]} retard={1.82} opacite={0.1} meneau />

      {/* Le jardin : la haie du fond, les arbres, puis la terrasse et son
          bassin — du plus lointain au plus proche, comme on le dessinerait. */}
      <Haie x1={6} x2={128} y={SOL} hauteur={13} retard={1.2} opacite={0.4} />
      <PinParasol x={248} base={SOL} hauteur={66} retard={1.45} />
      <Olivier x={42} base={SOL} rayon={16} retard={1.95} opacite={0.7} />
      <Cypres x={100} base={SOL} hauteur={42} retard={2.05} opacite={0.5} />

      <Trait d="M 22 118 C 90 116, 168 120, 246 117" duree={0.45} retard={2.15} largeur={0.9} opacite={0.4} />
      <Trait d="M 22 118 L 8 148 M 246 117 L 262 147" duree={0.3} retard={2.24} largeur={0.9} opacite={0.3} />
      <Piscine cx={108} y={122} largeur={128} profondeur={20} retard={2.3} />

      {/* Les transats et le parasol, en dernier : ce sont eux qui donnent
          l'échelle — sans mobilier, un bassin n'a pas de taille. */}
      <Transat x={196} y={132} echelle={1.15} retard={2.85} sens={-1} />
      <Transat x={228} y={140} echelle={1.15} retard={2.95} sens={-1} />
      <ParasolJardin x={254} y={140} hauteur={34} envergure={20} retard={3.05} />
      <Ombre x={140} y={SOL + 1} longueur={22} rangs={2} retard={3.2} pente={0.1} opacite={0.12} />
    </>
  )
}

/** Au-delà de 400 m² — le château : corps central, ailes, pavillons, parterre. */
function Chateau() {
  return (
    <>
      <Terrain />

      {/* Le corps central, monté du sol vers son comble ; les ailes ensuite,
          parce qu'elles s'y rattachent ; les pavillons d'angle en dernier. */}
      <Trait d={`M 106 ${SOL} L 105 58 L 176 57 L 177 ${SOL - 1}`} duree={0.8} retard={0.45} largeur={1.9} />
      <Mansarde x1={100} x2={182} egout={58} brisis={38} faite={28} retard={0.85} />
      <Souche x={116} y={29} largeur={9} hauteur={13} pots={2} retard={1.25} />
      <Souche x={158} y={29} largeur={9} hauteur={13} pots={2} retard={1.35} />
      <Lucarne x={118} y={56} largeur={11} hauteur={14} retard={1.45} />
      <Lucarne x={136} y={56} largeur={11} hauteur={14} retard={1.52} />
      <Lucarne x={154} y={56} largeur={11} hauteur={14} retard={1.59} />

      <Trait d={`M 66 ${SOL} L 65 74 L 106 73`} duree={0.5} retard={1.7} largeur={1.6} />
      <Trait d={`M 176 73 L 217 74 L 216 ${SOL - 1}`} duree={0.5} retard={1.78} largeur={1.6} />
      <Mansarde x1={60} x2={108} egout={74} brisis={58} faite={51} retard={1.88} opacite={0.9} />
      <Mansarde x1={174} x2={222} egout={74} brisis={58} faite={51} retard={1.96} opacite={0.9} />

      {/* Les pavillons d'angle et leurs toits en pointe : ce sont eux qui font
          la silhouette d'un château plutôt que d'une grande maison. */}
      {[[36, 68], [214, 246]].map(([x1, x2], rang) => (
        <g key={x1}>
          <Trait
            d={`M ${x1} ${SOL} L ${x1 - 1} 66 L ${x2} 65 L ${x2 + 1} ${SOL - 1}`}
            duree={0.5}
            retard={2.05 + rang * 0.08}
            largeur={1.7}
          />
          <Trait
            d={`M ${x1 - 6} 66 L ${(x1 + x2) / 2} 34 L ${x2 + 6} 65`}
            duree={0.45}
            retard={2.22 + rang * 0.08}
            largeur={1.5}
          />
          <Trait
            d={`M ${(x1 + x2) / 2} 34 L ${(x1 + x2) / 2 + 0.6} 24 M ${(x1 + x2) / 2 - 3} 26 l 6 2 l -6 2`}
            duree={0.25}
            retard={2.36 + rang * 0.08}
            largeur={0.9}
            opacite={0.7}
          />
          <Fenetres
            liste={[
              [x1 + 5, 76, 9, 14],
              [x1 + 5, 96, 9, 14],
            ]}
            retard={2.48 + rang * 0.08}
            opacite={0.1}
          />
        </g>
      ))}

      {/* Les travées du corps central et des ailes : deux niveaux, la porte au
          milieu, et rien d'autre — à ce format, une troisième rangée de
          fenêtres ne serait plus qu'une trame. */}
      <Fenetres
        liste={[
          [112, 66, 11, 16],
          [128, 66, 11, 16],
          [153, 66, 11, 16],
          [169, 66, 11, 16],
          [112, 92, 11, 16],
          [169, 92, 11, 16],
        ]}
        retard={2.62}
        opacite={0.1}
      />
      <Fenetres
        liste={[
          [72, 82, 10, 15],
          [88, 82, 10, 15],
          [194, 82, 10, 15],
          [210, 82, 10, 15],
        ]}
        retard={2.78}
        opacite={0.1}
      />
      <Trait d={`M 132 ${SOL - 1} L 131 90 Q 141 80 151 90 L 152 ${SOL - 1}`} duree={0.45} retard={2.9} largeur={1.5} />
      <Trait d={`M 141 ${SOL - 1} L 141 84`} duree={0.22} retard={3.02} largeur={0.8} opacite={0.4} />
      <Marches cx={141} y={SOL + 5} largeur={44} nombre={3} hauteur={3} retard={3.1} />

      {/* Le parterre à la française : le bassin dans l'axe, les buis taillés de
          part et d'autre, et les allées de gravier qui fuient. */}
      <Trait d="M 14 120 C 86 118, 180 122, 266 119" duree={0.5} retard={3.2} largeur={0.9} opacite={0.35} />
      <Trait d="M 14 120 L 2 149 M 266 119 L 278 148" duree={0.3} retard={3.3} largeur={0.9} opacite={0.26} />
      <Piscine cx={141} y={126} largeur={104} profondeur={16} retard={3.4} echelle={false} />
      <Muret x1={20} x2={64} y={122} hauteur={9} retard={3.9} />
      <Muret x1={218} x2={262} y={122} hauteur={9} retard={3.98} />
      <Cypres x={30} base={SOL} hauteur={44} retard={2.9} opacite={0.6} />
      <Cypres x={252} base={SOL} hauteur={44} retard={2.98} opacite={0.6} />
      <Olivier x={78} base={120} rayon={9} retard={4.06} opacite={0.55} />
      <Olivier x={204} base={120} rayon={9} retard={4.12} opacite={0.55} />
      <Ombre x={36} y={SOL + 1} longueur={26} rangs={2} retard={4.2} pente={0.08} opacite={0.12} />
    </>
  )
}

/**
 * Paliers du curseur, du plus petit au plus grand. `max` est la borne haute
 * exclue ; le dernier n'en a pas — il absorbe tout ce qui dépasse, ce que le
 * curseur affiche par ailleurs « 800+ ».
 */
const PALIERS = [
  { id: 'petite', max: 100, Dessin: Petite },
  { id: 'etage', max: 200, Dessin: Etage },
  { id: 'piscine', max: 250, Dessin: AvecPiscine },
  { id: 'jardin', max: 400, Dessin: Jardin },
  { id: 'chateau', max: Infinity, Dessin: Chateau },
]

/** Palier correspondant à une surface. */
const palierPour = (surfaceM2) => PALIERS.findIndex((palier) => surfaceM2 < palier.max)

/**
 * Le palier courant, en fondu enchaîné avec les autres.
 *
 * Les cinq dessins sont montés en permanence et superposés : seule leur opacité
 * change. Rien n'est monté ni démonté au franchissement d'un seuil — c'est ce
 * qui permet de traverser toute l'échelle d'un geste sans à-coup, les paliers
 * sautés se contentant de rester à zéro. `opacity` et `transform` se composent
 * sur le GPU : aucun recalcul de mise en page pendant le glissement.
 *
 * Sous `prefers-reduced-motion`, le filet CSS global ramène les transitions à
 * une durée nulle : le changement devient un remplacement net, sans fondu.
 *
 * `className` ne porte que des dimensions : la racine se pose elle-même en
 * `relative`, socle des cinq calques superposés. Lui passer un `absolute`
 * entrerait en conflit avec — et Tailwind tranchant par son propre ordre, pas
 * par celui des classes écrites, c'est `relative` qui l'emporterait. À
 * positionner par un parent, donc, jamais par cette prop.
 */
export function HouseIllustration({ surfaceM2, className = '' }) {
  const actif = palierPour(surfaceM2)

  return (
    <div aria-hidden="true" className={`relative text-ink ${className}`}>
      {PALIERS.map(({ id, Dessin }, index) => (
        <Planche
          key={id}
          vue={VUE}
          cadence={CADENCE}
          align="xMidYMax"
          className={`absolute inset-0 h-full w-full transition-[opacity,transform] duration-500 ease-plan will-change-transform ${
            index === actif ? 'scale-100 opacity-100' : 'scale-[0.94] opacity-0'
          }`}
        >
          <Dessin />
        </Planche>
      ))}
    </div>
  )
}
