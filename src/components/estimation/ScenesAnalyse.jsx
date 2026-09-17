import { useState } from 'react'
import { Planche, Aplat, Trait } from './encre'
import {
  Bandeau,
  Cypres,
  Ferronnerie,
  Fenetres,
  GardeCorps,
  Lucarne,
  Mansarde,
  Marches,
  Mouettes,
  Muret,
  Olivier,
  Ombre,
  Palmier,
  PinParasol,
  Piscine,
  Mer,
  Souche,
  Toit,
  Vagues,
  Voilier,
} from './motifs'

/**
 * Les six planches de l'écran d'analyse — des paysages de prestige qui se
 * tracent de part et d'autre du module pendant que l'estimation se calcule.
 *
 * ── Le format ─────────────────────────────────────────────────────────────
 *
 * **Portrait, 300 × 420.** Les planches étaient carrées (`aspect-[15/14]`) et
 * flanquaient l'écran sur deux colonnes de 27 % de la fenêtre : larges, basses,
 * et par conséquent vides en haut et en bas de leur emplacement. Une colonne de
 * bord d'écran est haute — c'est un format debout qu'elle demande, et c'est un
 * format debout qui permet de composer en plans superposés (le ciel, la mer, le
 * bâti, le premier plan) au lieu d'étaler un seul plan sur toute la largeur.
 *
 * ── Le sujet ──────────────────────────────────────────────────────────────
 *
 * Bords de mer et immeubles parisiens de très haut de gamme. Aucune planche
 * n'est un pictogramme de son sujet : l'immeuble d'avenue a ses souches de
 * zinc, ses lucarnes, son balcon filant à l'étage noble et sa ferronnerie à
 * volutes ; la villa de bord de mer a sa falaise, sa terrasse en plongée et ses
 * pins parasols en candélabre. C'est cette densité — cent à deux cents traits
 * par planche, contre une vingtaine dans les scènes qu'elles remplacent — qui
 * fait la différence entre un dessin et un symbole.
 *
 * ── L'ordre de tracé ──────────────────────────────────────────────────────
 *
 * Celui d'un dessinateur, sans exception : l'horizon, les lointains, les masses
 * moyennes, le bâti, les toits, la végétation, le premier plan, et les ombres
 * en dernier. Jamais un détail avant sa masse. C'est cet ordre, plus que la
 * vitesse, qui fait qu'une planche a l'air dessinée et non animée.
 *
 * ── Le tirage ─────────────────────────────────────────────────────────────
 *
 * Deux planches distinctes par estimation, tirées une fois. Six planches tirées
 * deux à deux, c'est trente couples possibles : l'utilisateur qui relance trois
 * fois voit trois écrans différents.
 */

/** Cadre commun — portrait, à la proportion d'une colonne de bord d'écran. */
const VUE = '0 0 300 420'

// --- 1. La villa au-dessus de la mer ---------------------------------------

/**
 * La mer occupe le tiers haut et n'est faite que de ses creux ; la villa tient
 * le milieu, sa terrasse et son bassin le bas. Trois plans, et la profondeur
 * vient de leur superposition — jamais d'une valeur, le trait n'en ayant pas.
 */
function VillaMer() {
  return (
    <>
      <Trait d="M 0 96 C 74 91, 168 100, 300 93" duree={1.2} retard={0.2} largeur={1.2} opacite={0.4} />
      <Mouettes points={[[70, 66, 1], [104, 54, 0.8], [50, 46, 0.6]]} retard={0.5} />
      <Mer yHaut={104} yBas={200} rangs={11} retard={0.9} />

      {/* La falaise. Une ligne de rivage ne suffit pas : c'est la face rocheuse
          sous elle — refends verticaux et hachures de l'ombre portée — qui fait
          l'à-pic. Sans cette masse, la villa flotte au-dessus d'un trait. */}
      <Trait
        d="M 0 216 C 54 202, 112 220, 166 210 C 214 200, 250 216, 300 206"
        duree={1.1}
        retard={1.9}
        largeur={1.7}
      />
      {[
        ['M 24 219 C 30 232, 20 242, 26 258', 0.3],
        ['M 62 214 C 68 228, 58 238, 64 252', 0.26],
        ['M 104 222 C 110 236, 100 244, 106 260', 0.3],
        ['M 148 212 C 154 226, 144 236, 150 250', 0.26],
        ['M 196 216 C 202 230, 192 240, 198 254', 0.28],
        ['M 242 208 C 248 222, 238 232, 244 246', 0.24],
        ['M 282 210 C 288 224, 278 232, 284 246', 0.26],
      ].map(([d, o], rang) => (
        <Trait key={d} d={d} duree={0.35} retard={2.3 + rang * 0.06} largeur={1} opacite={o} />
      ))}
      {[232, 240, 248].map((y, rang) => (
        <Trait
          key={y}
          d={`M ${8 + rang * 26} ${y} C ${70 + rang * 20} ${y - 5}, ${180 - rang * 14} ${y + 5}, ${268 - rang * 22} ${y - 2}`}
          duree={0.4}
          retard={2.75 + rang * 0.08}
          largeur={0.8}
          opacite={0.16}
        />
      ))}

      {/* Le terrain de la villa, puis la villa elle-même — du sol vers le
          ciel, et le volume haut en dernier parce qu'il s'appuie sur l'autre. */}
      <Trait
        d="M 0 300 C 68 296, 142 303, 212 299 C 254 296, 276 301, 300 298"
        duree={0.8}
        retard={3}
        largeur={1.6}
      />
      <Trait d="M 86 300 L 85 238 L 200 237 L 201 299" duree={0.9} retard={3.2} largeur={1.9} />
      <Trait d="M 76 238 L 210 237" duree={0.5} retard={3.5} largeur={1.6} />
      <Trait d="M 76 232 L 210 231" duree={0.45} retard={3.6} largeur={1.2} opacite={0.65} />
      <Trait d="M 118 232 L 117 196 L 196 195 L 197 231" duree={0.7} retard={3.72} largeur={1.7} />
      <Trait d="M 110 196 L 204 195" duree={0.4} retard={4} largeur={1.5} />
      <Trait d="M 110 191 L 204 190" duree={0.35} retard={4.08} largeur={1.1} opacite={0.6} />

      <Fenetres liste={[[96, 246, 94, 48]]} retard={4.18} opacite={0.1} />
      {[120, 143, 166].map((x, rang) => (
        <Trait
          key={x}
          d={`M ${x} 247 L ${x - 0.4} 293`}
          duree={0.3}
          retard={4.4 + rang * 0.05}
          largeur={0.8}
          opacite={0.3}
        />
      ))}
      <Fenetres
        liste={[
          [126, 204, 20, 20],
          [151, 204, 20, 20],
          [176, 204, 20, 20],
        ]}
        retard={4.5}
        opacite={0.1}
        meneau
      />
      <GardeCorps x1={112} x2={202} y={191} hauteur={12} pas={11} retard={4.7} opacite={0.45} />

      {/* La terrasse en plongée et son bassin à débordement, face au large. */}
      <Trait d="M 44 310 C 118 307, 196 313, 258 309" duree={0.6} retard={4.9} largeur={1} opacite={0.42} />
      <Trait d="M 44 310 L 16 384 M 258 309 L 288 382" duree={0.45} retard={5.02} largeur={1} opacite={0.32} />
      <Trait d="M 16 384 C 104 380, 200 387, 288 382" duree={0.7} retard={5.12} largeur={1.2} opacite={0.48} />
      {['M 92 311 L 76 383', 'M 156 311 L 154 385', 'M 214 311 L 230 383'].map((d, rang) => (
        <Trait key={d} d={d} duree={0.3} retard={5.25 + rang * 0.06} largeur={0.8} opacite={0.14} />
      ))}
      <Piscine cx={150} y={322} largeur={178} profondeur={42} retard={5.4} />

      <PinParasol x={280} base={302} hauteur={94} retard={3.35} />
      <PinParasol x={16} base={300} hauteur={72} retard={3.85} opacite={0.45} />
      <Cypres x={54} base={300} hauteur={68} retard={4.2} opacite={0.5} />
      <Ombre x={86} y={301} longueur={40} rangs={2} retard={6} pente={0.1} opacite={0.13} />
    </>
  )
}

// --- 2. L'immeuble d'avenue ------------------------------------------------

/**
 * Un immeuble de pierre de taille sur une avenue plantée — l'esprit d'un
 * haussmannien de prestige. Il tient dans le cadre parce qu'il est vu d'en bas
 * et cadré serré : de face et en entier, il redeviendrait une façade plate.
 *
 * Trois pièces font le standing, et aucune n'est décorative : le **toit de
 * zinc** avec ses souches et ses lucarnes, le **balcon filant à l'étage noble**
 * et sa ferronnerie à volutes, la **porte cochère** sous sa marquise de verre.
 */
function ImmeubleAvenue() {
  const etages = [318, 268, 218, 168]

  return (
    <>
      {/* Le toit de zinc en premier, parce qu'il est le plus loin — la façade
          ensuite, montée du sol vers lui. */}
      <Trait d="M 44 122 L 68 64 L 238 63 L 260 122" duree={1.2} retard={0.2} largeur={1.4} />
      <Trait d="M 68 64 L 238 63" duree={0.4} retard={0.9} largeur={1.1} opacite={0.5} />
      <Souche x={86} y={64} largeur={16} hauteur={30} pots={3} retard={1.05} />
      <Souche x={198} y={63} largeur={18} hauteur={26} pots={4} retard={1.25} />
      {[72, 110, 148, 186].map((x, rang) => (
        <Lucarne key={x} x={x} y={120} largeur={14} hauteur={20} retard={1.45 + rang * 0.1} />
      ))}

      <Trait d="M 38 404 L 44 122 L 260 121 L 266 404" duree={1.6} retard={1.9} largeur={1.9} />
      <Bandeau x1={42} x2={262} y={128} retard={2.5} opacite={0.5} />

      {/* Les travées : cinq baies par étage, un bandeau sous chacun, et le
          balcon filant au deuxième — c'est lui, et lui seul, qui dit
          « immeuble de standing ». */}
      {etages.map((y, rang) => (
        <g key={y}>
          <Fenetres
            liste={[60, 100, 140, 180, 220].map((x) => [x, y, 22, 34])}
            retard={2.7 + rang * 0.26}
            traverse
          />
          <Bandeau x1={46 + rang} x2={258 - rang} y={y + 40} retard={2.98 + rang * 0.26} opacite={0.4} />
        </g>
      ))}
      {/* Le balcon filant de l'étage noble — le deuxième en partant du bas,
          comme sur toute la ligne des grandes avenues. */}
      <Ferronnerie x1={52} x2={252} y={306} hauteur={15} pas={14} retard={3.9} />
      {/* Les garde-corps des autres niveaux : un par baie, plus courts et plus
          bas. C'est leur brièveté qui fait ressortir le filant. */}
      {etages
        .filter((y) => y !== 318)
        .flatMap((y, rangEtage) =>
          [60, 100, 140, 180, 220].map((x, rang) => (
            <Ferronnerie
              key={`${y}-${x}`}
              x1={x + 1}
              x2={x + 21}
              y={y + 34}
              hauteur={10}
              pas={10}
              retard={4.25 + rangEtage * 0.12 + rang * 0.04}
            />
          )),
        )}

      {/* La porte cochère et sa marquise de verre. */}
      <Trait d="M 122 404 L 122 352 Q 152 328 182 352 L 182 404" duree={0.7} retard={4.7} largeur={1.6} />
      <Trait d="M 130 404 L 130 356 M 152 404 L 152 334 M 174 404 L 174 356" duree={0.4} retard={4.9} largeur={0.9} opacite={0.5} />
      <Trait d="M 102 344 C 152 330, 152 330, 202 344" duree={0.45} retard={5.05} largeur={1.4} opacite={0.6} />
      <Trait d="M 108 341 L 116 348 M 188 341 L 196 348" duree={0.2} retard={5.18} largeur={0.9} opacite={0.4} />
      <Marches cx={152} y={404} largeur={70} nombre={3} hauteur={4} retard={5.25} />

      <Trait d="M 0 404 C 84 401, 190 407, 300 403" duree={0.7} retard={5.4} largeur={1.7} />

      {/* Les marronniers taillés du trottoir, coupés par le bord du cadre :
          c'est ce recouvrement qui donne la rue. */}
      <Olivier x={10} base={406} rayon={36} retard={5.6} />
      <Olivier x={292} base={412} rayon={32} retard={5.75} />
      <Ombre x={38} y={405} longueur={38} rangs={3} retard={6} pente={0.08} opacite={0.14} />
    </>
  )
}

// --- 3. L'immeuble d'angle -------------------------------------------------

/**
 * L'immeuble de rapport à pan coupé — deux façades qui se rejoignent sur une
 * rotonde coiffée d'un dôme d'ardoise. C'est la silhouette d'angle des grandes
 * avenues, et elle ne se confond avec rien.
 *
 * La rotonde est la pièce qui travaille : sans elle, deux façades qui se
 * touchent font un coin de boîte.
 */
function ImmeubleAngle() {
  const niveaux = [300, 254, 208, 162]

  return (
    <>
      {/* Le dôme, sa lanterne et son épi — la première chose qu'on voit d'un
          angle, donc la première qu'on pose. */}
      <Trait d="M 156 92 L 157 74" duree={0.25} retard={0.2} largeur={1} />
      <Trait d="M 152 76 l 10 4 l -10 4" duree={0.2} retard={0.35} largeur={0.9} opacite={0.7} />
      <Trait
        d="M 120 130 C 122 106, 138 92, 157 92 C 176 92, 192 106, 194 130"
        duree={0.8}
        retard={0.5}
        largeur={1.5}
      />
      {[0.3, 0.5, 0.7].map((part, rang) => (
        <Trait
          key={part}
          d={`M ${120 + 74 * part} 130 C ${124 + 66 * part} 112, ${140 + 34 * part} 96, 157 93`}
          duree={0.3}
          retard={0.95 + rang * 0.07}
          largeur={0.8}
          opacite={0.28}
        />
      ))}
      <Trait d="M 112 132 L 202 131" duree={0.3} retard={1.2} largeur={1.3} />

      {/* Les deux versants de zinc qui s'écartent de la rotonde. */}
      <Trait d="M 118 132 L 96 152 L 20 156 L 16 190" duree={0.7} retard={1.35} largeur={1.3} />
      <Trait d="M 196 131 L 218 151 L 292 155 L 296 189" duree={0.7} retard={1.5} largeur={1.3} />
      <Souche x={46} y={156} largeur={14} hauteur={22} pots={3} retard={1.7} />
      <Souche x={246} y={155} largeur={14} hauteur={22} pots={3} retard={1.85} />

      {/* La rotonde, puis les deux ailes : le pan coupé porte l'angle, les
          façades s'y rattachent. */}
      <Trait d="M 122 410 L 120 132 M 194 410 L 192 131" duree={1.4} retard={2} largeur={1.9} />
      <Trait d="M 14 410 L 16 190 L 120 176" duree={1.2} retard={2.4} largeur={1.7} />
      <Trait d="M 302 410 L 296 189 L 194 175" duree={1.2} retard={2.6} largeur={1.7} />

      {niveaux.map((y, rang) => (
        <g key={y}>
          <Fenetres liste={[[133, y, 20, 30], [162, y, 20, 30]]} retard={2.9 + rang * 0.22} traverse />
          <Fenetres
            liste={[[40, y + 8, 20, 30], [74, y + 6, 20, 30], [214, y + 6, 20, 30], [248, y + 8, 20, 30]]}
            retard={3.02 + rang * 0.22}
            traverse
          />
          <Bandeau x1={124} x2={192} y={y + 36} retard={3.2 + rang * 0.22} opacite={0.38} />
          <Bandeau x1={18} x2={118} y={y + 44} retard={3.28 + rang * 0.22} opacite={0.3} />
          <Bandeau x1={198} x2={296} y={y + 43} retard={3.34 + rang * 0.22} opacite={0.3} />
        </g>
      ))}
      <Ferronnerie x1={128} x2={188} y={292} hauteur={14} pas={13} retard={4.3} />
      <Ferronnerie x1={26} x2={112} y={300} hauteur={14} pas={13} retard={4.45} />
      <Ferronnerie x1={204} x2={290} y={299} hauteur={14} pas={13} retard={4.6} />

      {/* Le rez-de-chaussée commerçant : store en corbeille et vitrines. */}
      <Trait d="M 122 372 C 158 362, 158 362, 194 372" duree={0.4} retard={4.8} largeur={1.4} opacite={0.65} />
      <Trait d="M 128 370 L 132 378 M 158 366 L 158 376 M 188 370 L 184 378" duree={0.25} retard={4.95} largeur={0.8} opacite={0.35} />
      <Fenetres liste={[[130, 384, 24, 24], [162, 384, 24, 24]]} retard={5.05} opacite={0.14} />
      <Fenetres liste={[[34, 386, 28, 24], [232, 386, 28, 24]]} retard={5.2} opacite={0.12} />

      <Trait d="M 0 410 C 92 407, 196 413, 300 409" duree={0.7} retard={5.4} largeur={1.7} />
      <Olivier x={4} base={414} rayon={30} retard={5.6} />
      <Olivier x={298} base={416} rayon={28} retard={5.75} />
      {/* Un réverbère, à l'échelle du trottoir : c'est lui qui donne sa taille
          à tout le reste. */}
      <Trait d="M 90 410 L 91 342" duree={0.4} retard={5.9} largeur={1.2} opacite={0.6} />
      <Trait d="M 84 342 C 86 332, 96 332, 98 342 Z" duree={0.25} retard={6.05} largeur={1} opacite={0.6} />
      <Ombre x={14} y={411} longueur={40} rangs={3} retard={6.2} pente={0.06} opacite={0.13} />
    </>
  )
}

// --- 4. Le port de la Riviera ----------------------------------------------

/**
 * Un port de plaisance : la ville en gradins au fond, le quai, et trois
 * bateaux à couple. Les mâts font la verticale que le format demande.
 */
function PortRiviera() {
  return (
    <>
      <Trait d="M 0 96 C 62 84, 128 100, 186 88 C 232 78, 266 92, 300 84" duree={1.1} retard={0.2} largeur={1.1} opacite={0.35} />

      {/* La ville en gradins — chaque maison est un volume et son toit, jamais
          un rectangle : ce sont les pentes qui font le village. */}
      {[
        [10, 148, 44, 30],
        [58, 140, 38, 38],
        [100, 152, 42, 26],
        [146, 134, 46, 44],
        [196, 148, 40, 30],
        [240, 138, 48, 40],
      ].map(([x, y, l, h], rang) => (
        <g key={x}>
          <Trait
            d={`M ${x} ${y + h} L ${x + 0.6} ${y} L ${x + l} ${y - 0.6} L ${x + l - 0.4} ${y + h}`}
            duree={0.5}
            retard={0.8 + rang * 0.14}
            largeur={1.3}
          />
          <Toit
            d={`M ${x - 4} ${y} L ${x + l / 2} ${y - 14} L ${x + l + 4} ${y - 1}`}
            retard={1.05 + rang * 0.14}
            largeur={1.2}
            rangs={[`M ${x - 1} ${y - 4} L ${x + l + 1} ${y - 5}`]}
          />
          <Fenetres
            liste={[
              [x + 6, y + 8, 9, 11],
              [x + l - 15, y + 8, 9, 11],
              [x + l / 2 - 5, y + h - 20, 10, 12],
            ]}
            retard={1.3 + rang * 0.14}
            opacite={0.13}
          />
        </g>
      ))}

      {/* Le quai, puis l'eau — le quai d'abord, l'eau vient buter dessus. */}
      <Muret x1={-4} x2={304} y={196} hauteur={16} retard={2.4} />
      <Trait d="M 0 198 C 96 195, 204 201, 300 197" duree={0.7} retard={3.1} largeur={1.7} />
      <Aplat d="M 0 200 L 300 197 L 300 420 L 0 420 Z" retard={3.3} duree={0.6} opacite={0.045} />
      <Mer yHaut={210} yBas={410} rangs={11} retard={3.5} opacite={0.26} />

      <Voilier x={78} y={288} echelle={2.1} retard={4.4} />
      <Voilier x={196} y={262} echelle={1.7} retard={4.95} />
      <Voilier x={252} y={330} echelle={1.4} retard={5.4} />

      {/* Les bittes d'amarrage du bord proche : elles donnent l'échelle du
          quai, qu'aucun bateau ne peut donner à sa place. */}
      {[38, 150, 262].map((x, rang) => (
        <Trait
          key={x}
          d={`M ${x} 196 l 0.4 -9 c -2.4 -0.6 -2.4 -3.4 0 -4 l 5 0 c 2.4 0.6 2.4 3.4 0 4 l -0.4 9`}
          duree={0.3}
          retard={5.6 + rang * 0.08}
          largeur={1.1}
          opacite={0.6}
        />
      ))}
      <Palmier x={24} base={196} hauteur={92} retard={2.8} inclinaison={8} />
      <Palmier x={278} base={196} hauteur={76} retard={3} inclinaison={-7} />
      <Mouettes points={[[212, 62, 1], [244, 48, 0.7]]} retard={5.9} />
    </>
  )
}

// --- 5. Les toits de Paris -------------------------------------------------

/**
 * Une terrasse de dernier étage et, derrière elle, la mer des toits de zinc.
 *
 * Le sujet n'est pas les toits : c'est **d'être au-dessus d'eux**. D'où le
 * premier plan très présent — garde-corps, pergola, jardinières — et les toits
 * traités en plans de plus en plus pâles à mesure qu'ils s'éloignent.
 */
function ToitsDeParis() {
  // Les deux plans de toits. Chaque plan est une file de combles mansardés
  // d'emprises et de hauteurs inégales — alignés, ils redeviendraient une
  // frise. Le plan lointain est plus haut et plus pâle ; c'est tout ce qui les
  // sépare, et c'est suffisant.
  const plans = [
    {
      opacite: 0.42,
      egout: 178,
      combles: [
        [-8, 56, 130, 118],
        [56, 128, 140, 126],
        [128, 196, 122, 110],
        [196, 250, 136, 122],
        [250, 308, 126, 114],
      ],
    },
    {
      opacite: 0.75,
      egout: 236,
      combles: [
        [-8, 68, 186, 172],
        [68, 150, 174, 158],
        [150, 222, 192, 178],
        [222, 308, 178, 162],
      ],
    },
  ]

  return (
    <>
      {/* Un dôme au loin — il suffit à dire la ville, et il évite que les toits
          ne se lisent comme une chaîne de collines. */}
      <Trait d="M 214 92 C 216 74, 228 62, 242 62 C 256 62, 268 74, 270 92" duree={0.7} retard={0.2} largeur={1.2} opacite={0.45} />
      <Trait d="M 242 62 L 243 46 M 238 48 l 8 3 l -8 3" duree={0.25} retard={0.7} largeur={0.9} opacite={0.4} />
      {[0.3, 0.5, 0.7].map((part, rang) => (
        <Trait
          key={part}
          d={`M ${214 + 56 * part} 92 C ${218 + 48 * part} 78, ${230 + 24 * part} 66, 242 63`}
          duree={0.3}
          retard={0.8 + rang * 0.07}
          largeur={0.8}
          opacite={0.22}
        />
      ))}
      <Trait d="M 208 94 L 276 93" duree={0.25} retard={1.02} largeur={1} opacite={0.4} />
      <Trait d="M 218 94 L 219 130 M 266 93 L 267 130" duree={0.3} retard={1.1} largeur={0.9} opacite={0.3} />

      {/* Les deux plans de toits. Pour chacun : la ligne d'égout, les combles
          qui la coiffent, puis les souches et les lucarnes. Un toit de zinc
          sans souches ni lucarnes n'est qu'une ligne brisée. */}
      {plans.map(({ opacite, egout, combles }, rang) => (
        <g key={egout}>
          <Trait
            d={`M 0 ${egout} C 92 ${egout - 3}, 196 ${egout + 4}, 300 ${egout - 1}`}
            duree={0.8}
            retard={1.3 + rang * 0.55}
            largeur={1.4}
            opacite={opacite}
          />
          {combles.map(([x1, x2, brisis, faite], index) => (
            <Mansarde
              key={x1}
              x1={x1}
              x2={x2}
              egout={egout}
              brisis={brisis}
              faite={faite}
              retard={1.6 + rang * 0.55 + index * 0.12}
              opacite={opacite}
            />
          ))}
          {combles
            .filter((_, index) => index % 2 === 0)
            .map(([x1, x2, , faite], index) => (
              <Souche
                key={`s-${x1}`}
                x={x1 + (x2 - x1) * 0.62}
                y={faite + 2}
                largeur={9 + rang * 2}
                hauteur={14 + rang * 5}
                pots={2 + rang}
                retard={2.5 + rang * 0.55 + index * 0.08}
              />
            ))}
          {combles
            .filter((_, index) => index % 2 === 1)
            .map(([x1, x2, brisis], index) => (
              <Lucarne
                key={`l-${x1}`}
                x={x1 + (x2 - x1) * 0.4}
                y={egout - 3}
                largeur={11}
                hauteur={(egout - brisis) * 0.68}
                retard={2.75 + rang * 0.55 + index * 0.08}
              />
            ))}
        </g>
      ))}

      {/* Le premier plan : le parapet de la terrasse, en pierre et non en
          barreaudage. Le garde-corps à claire-voie qu'il remplace couvrait tout
          le bas du cadre d'une grille de seize barreaux, et cette grille se
          lisait avant les toits. */}
      <Trait d="M 0 288 C 102 284, 200 292, 300 287" duree={0.8} retard={3.5} largeur={1.8} />
      <Muret x1={-6} x2={306} y={330} hauteur={40} retard={3.8} />
      <Trait d="M -6 292 C 96 288, 204 296, 306 291" duree={0.7} retard={4.4} largeur={1.5} opacite={0.7} />

      {/* Le dallage de la terrasse : trois joints qui fuient, et rien de plus —
          c'est un sol, il ne doit pas se regarder. */}
      <Trait d="M 0 340 C 108 336, 202 344, 300 339" duree={0.8} retard={4.55} largeur={1.4} opacite={0.55} />
      {['M 58 341 L 40 418', 'M 150 341 L 148 418', 'M 240 341 L 258 418'].map((d, rang) => (
        <Trait key={d} d={d} duree={0.35} retard={4.7 + rang * 0.06} largeur={0.8} opacite={0.13} />
      ))}

      {/* Jardinières et oliviers en pot : ils donnent l'échelle du dernier
          plan, qu'aucun toit lointain ne peut donner. */}
      {[[38, 34], [224, 38]].map(([x, l], rang) => (
        <g key={x}>
          <Trait
            d={`M ${x} 386 L ${x + 3} 348 L ${x + l} 347 L ${x + l - 3} 386`}
            duree={0.45}
            retard={4.95 + rang * 0.12}
            largeur={1.3}
          />
          <Trait d={`M ${x - 3} 348 L ${x + l + 3} 347`} duree={0.22} retard={5.12 + rang * 0.12} largeur={1.1} />
          <Trait
            d={`M ${x + 2} 358 L ${x + l - 2} 357`}
            duree={0.2}
            retard={5.2 + rang * 0.12}
            largeur={0.8}
            opacite={0.28}
          />
        </g>
      ))}
      <Olivier x={55} base={348} rayon={24} retard={5.35} />
      <Olivier x={243} base={347} rayon={26} retard={5.55} />

      {/* Le mobilier de terrasse, en dernier : une table basse et son plateau. */}
      <Trait d="M 118 394 L 190 393 M 126 394 L 124 410 M 182 393 L 184 409" duree={0.4} retard={5.75} largeur={1.2} opacite={0.7} />
      <Trait d="M 120 389 L 188 388" duree={0.25} retard={5.9} largeur={0.9} opacite={0.35} />
      <Ombre x={38} y={388} longueur={44} rangs={3} retard={6.05} pente={0.06} opacite={0.12} />
    </>
  )
}

// --- 6. La crique et les pins ----------------------------------------------

/**
 * Une crique fermée par deux avancées rocheuses, la mer au fond, et une villa
 * basse posée dans les pins à flanc.
 *
 * C'est la planche la plus végétale du lot, et la seule qui ne montre presque
 * pas de bâti : trois planches d'architecture d'affilée feraient un écran
 * d'attente qui se répète.
 */
function CriqueEtPins() {
  return (
    <>
      <Trait d="M 0 92 C 76 87, 172 96, 300 89" duree={1.2} retard={0.2} largeur={1.2} opacite={0.4} />
      <Mouettes points={[[214, 62, 1], [250, 50, 0.75], [188, 44, 0.6]]} retard={0.55} />
      <Mer yHaut={100} yBas={212} rangs={12} retard={0.9} opacite={0.32} />

      {/* Les deux pointes rocheuses qui ferment la crique. Celle de gauche est
          devant : elle est tracée d'un trait plus appuyé et recouvre l'autre —
          au trait, c'est le seul moyen de dire lequel est le plus proche. */}
      <Trait
        d="M 0 262 C 26 246, 46 252, 66 234 C 84 218, 100 224, 116 208 C 126 198, 132 202, 140 196"
        duree={1}
        retard={2.1}
        largeur={1.8}
      />
      <Trait
        d="M 300 240 C 276 228, 258 234, 240 218 C 224 204, 208 210, 194 196 C 188 190, 184 192, 178 188"
        duree={1}
        retard={2.35}
        largeur={1.4}
        opacite={0.72}
      />
      {[
        ['M 28 254 C 34 264, 26 272, 32 284', 0.28],
        ['M 74 230 C 80 240, 72 248, 78 262', 0.26],
        ['M 118 206 C 124 216, 116 224, 122 238', 0.24],
        ['M 258 232 C 264 242, 256 250, 262 262', 0.2],
        ['M 220 210 C 226 220, 218 228, 224 240', 0.18],
      ].map(([d, o], rang) => (
        <Trait key={d} d={d} duree={0.3} retard={2.7 + rang * 0.06} largeur={0.9} opacite={o} />
      ))}

      {/* L'eau de la crique, entre les deux pointes : un lavis, et trois traits
          qui viennent lécher la roche sans jamais la toucher. */}
      <Aplat
        d="M 0 268 C 44 256, 96 224, 148 200 C 196 210, 248 240, 300 248 L 300 296 L 0 296 Z"
        retard={3}
        duree={0.7}
        opacite={0.05}
      />
      <Vagues lignes={[[236, 72, 218], [258, 36, 168], [276, 118, 262]]} retard={3.2} opacite={0.24} />

      {/* La plage, puis la villa basse et longue posée dans la pinède. */}
      <Trait d="M 0 314 C 78 308, 168 318, 300 310" duree={0.9} retard={3.6} largeur={1.7} />
      <Trait
        d="M 6 302 C 62 296, 132 308, 196 300 C 240 294, 272 302, 300 298"
        duree={0.7}
        retard={3.8}
        largeur={0.9}
        opacite={0.26}
      />
      <Trait d="M 96 314 L 95 268 L 226 267 L 227 313" duree={0.8} retard={3.95} largeur={1.8} />
      <Trait d="M 86 268 L 236 267" duree={0.45} retard={4.25} largeur={1.6} />
      <Trait d="M 86 262 L 236 261" duree={0.4} retard={4.35} largeur={1.2} opacite={0.6} />
      <Fenetres liste={[[106, 276, 108, 32]]} retard={4.45} opacite={0.1} />
      {[134, 162, 190].map((x, rang) => (
        <Trait key={x} d={`M ${x} 277 L ${x - 0.4} 307`} duree={0.26} retard={4.65 + rang * 0.05} largeur={0.8} opacite={0.3} />
      ))}
      <Muret x1={54} x2={266} y={330} hauteur={16} retard={4.85} />

      {/* La pinède. Le grand pin devant la villa et non derrière : c'est ce
          recouvrement qui met la maison dans les arbres au lieu de la poser
          devant un décor. */}
      <PinParasol x={272} base={316} hauteur={104} retard={3.7} />
      <PinParasol x={24} base={314} hauteur={88} retard={4.05} />
      <PinParasol x={216} base={312} hauteur={62} retard={4.5} opacite={0.35} />
      <Cypres x={72} base={314} hauteur={58} retard={5} opacite={0.45} />

      {/* Le premier plan : la garrigue en touffes, plus serrée en bas de
          cadre — c'est le seul endroit du dessin où l'on voit le détail. */}
      {[
        [20, 366], [58, 380], [96, 370], [140, 388], [186, 374], [232, 390], [272, 376],
      ].map(([x, y], rang) => (
        <Trait
          key={x}
          d={`M ${x - 12} ${y} q 6 -18 12 -5 q 5 -16 11 -2 q 5 -12 10 -1`}
          duree={0.32}
          retard={5.25 + rang * 0.07}
          largeur={1}
          opacite={0.45}
        />
      ))}
      <Trait d="M 0 404 C 96 398, 206 410, 300 402" duree={0.8} retard={5.85} largeur={1.2} opacite={0.32} />
    </>
  )
}

// --- Tirage et montage -----------------------------------------------------

/** Les six planches, dans l'ordre où elles ont été écrites. */
const PLANCHES = [VillaMer, ImmeubleAvenue, ImmeubleAngle, PortRiviera, ToitsDeParis, CriqueEtPins]

/**
 * Deux planches distinctes, dans l'ordre d'apparition.
 *
 * Le tirage sans remise tient en un échange : la seconde est prise dans ce qui
 * reste après la première. Mélanger les six pour n'en garder que deux coûterait
 * six fois plus pour le même résultat.
 */
export function tirageScenes() {
  const premier = Math.floor(Math.random() * PLANCHES.length)
  const decalage = 1 + Math.floor(Math.random() * (PLANCHES.length - 1))
  return [PLANCHES[premier], PLANCHES[(premier + decalage) % PLANCHES.length]]
}

/**
 * Une planche montée dans son cadre.
 *
 * Toutes sont écrites sur six secondes ; `duree` les étire ou les resserre d'un
 * seul facteur, sans qu'aucun retard n'ait à bouger — c'est tout l'intérêt de
 * `--cadence` (voir [`encre.jsx`](./encre.jsx)).
 *
 * `decalage` retarde la planche entière : celle de droite démarre quand celle
 * de gauche s'achève, sans qu'aucun de ses deux cents retards n'ait à bouger.
 *
 * `miroir` retourne la planche de droite : la pointe y court de droite à
 * gauche, et la scène se penche vers le module comme celle de gauche s'y
 * penche. Aucune planche ne porte de texte, précisément pour que ce
 * retournement reste indolore.
 */
export function SceneAnalyse({ scene: Scene, duree = 6, decalage = 0, miroir = false, className = '' }) {
  return (
    <Planche vue={VUE} cadence={duree / 6} decalage={decalage} className={className}>
      <g transform={miroir ? 'translate(300 0) scale(-1 1)' : undefined}>
        <Scene />
      </g>
    </Planche>
  )
}

/**
 * Le tirage figé pour la durée d'un écran.
 *
 * `useState` avec fonction d'initialisation, jamais dans le corps du composant :
 * posé là, le tirage redistribuerait les planches à chaque rendu — c'est-à-dire
 * à chaque étape d'analyse qui se coche.
 */
export function useTirageScenes() {
  const [scenes] = useState(tirageScenes)
  return scenes
}
