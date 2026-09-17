import { Aplat, Touche, Trait } from './encre'

/**
 * Le vocabulaire des dessins à l'encre — les motifs qu'un dessinateur a déjà
 * dans la main et qu'il repose d'une planche à l'autre.
 *
 * ── Ce que ce fichier corrige ─────────────────────────────────────────────
 *
 * L'ancien dispositif écrivait chaque scène en segments droits et confiait
 * l'apparence « faite main » à un filtre de bruit. Un pin y était un `Q`
 * unique posé sur une verticale — un champignon sur un bâton ; une piscine, un
 * rectangle ; un toit, deux traits. Aucun réglage d'amplitude ne rattrape ça,
 * parce que ce qui manquait n'était pas l'irrégularité mais le **dessin** : un
 * feuillage a des bouquets, un pin parasol s'ouvre en candélabre, un toit a des
 * rangs, un balcon a une ferronnerie.
 *
 * Chaque motif ci-dessous est donc écrit en cubiques posées point par point, et
 * tient en cinq à vingt traits. Une planche en compose une dizaine et arrive à
 * cent cinquante traits — c'est cette densité, autant que la qualité de chaque
 * courbe, qui fait la différence entre un pictogramme et un dessin.
 *
 * ── Deux règles qui valent pour tout le fichier ───────────────────────────
 *
 * **Rien n'est parfaitement droit.** Une horizontale exacte trahit le vecteur
 * plus sûrement que n'importe quel aplat, et la main n'en pose pas : les sols
 * ondulent, les faîtages dérivent d'un point, deux verticales voisines ne sont
 * jamais parallèles.
 *
 * **La masse avant le détail, toujours.** Un toit se pose avant ses tuiles, un
 * tronc avant son feuillage, une façade avant ses baies. C'est cet ordre — et
 * pas la vitesse du tracé — qui fait qu'une planche a l'air dessinée plutôt
 * qu'animée.
 */

// --- Ombres ----------------------------------------------------------------

/**
 * Une ombre portée — quelques hachures couchées au pied d'un volume.
 *
 * Au trait, une ombre n'est pas une masse grise : c'est une série de traits
 * parallèles qui s'espacent en s'éloignant de l'objet. Elles se posent en
 * dernier sur toute planche, une fois que tout ce qui les projette existe.
 */
export function Ombre({ x, y, longueur, rangs = 4, retard = 0, pente = 0.32, opacite = 0.22 }) {
  return Array.from({ length: rangs }, (_, rang) => {
    const part = 1 - rang * 0.18
    const dx = longueur * part
    return (
      <Trait
        key={rang}
        d={`M ${x} ${y + rang * 3.4} C ${x + dx * 0.4} ${y + rang * 3.4 + dx * pente * 0.3}, ${x + dx * 0.7} ${y + rang * 3.4 + dx * pente * 0.7}, ${x + dx} ${y + rang * 3.4 + dx * pente}`}
        duree={0.3}
        retard={retard + rang * 0.07}
        largeur={0.9}
        opacite={opacite}
      />
    )
  })
}

// --- Végétation ------------------------------------------------------------

/**
 * Une couronne d'arbre — le contour lobé d'un feuillage vu de loin.
 *
 * Un feuillage n'est pas une ellipse : c'est une suite de bouquets qui
 * débordent les uns des autres. Le contour est donc construit en tournant
 * autour d'un centre, un arc par bouquet, chacun poussé vers l'extérieur à
 * mi-chemin — d'où le renflement. Une ellipse fermée, à la place, donne un
 * champignon, et c'est exactement ce que donnait l'ancien dessin.
 *
 * `lobes` impair de préférence : un nombre pair aligne les bouquets deux à deux
 * en vis-à-vis, et la couronne redevient symétrique, donc mécanique.
 */
export function couronne(cx, cy, rx, ry, lobes = 7, saillie = 1.26) {
  const point = (angle, k) =>
    `${(cx + Math.cos(angle) * rx * k).toFixed(1)} ${(cy + Math.sin(angle) * ry * k).toFixed(1)}`
  let d = `M ${point(-Math.PI / 2, 0.82)} `

  for (let rang = 0; rang < lobes; rang += 1) {
    const depart = (rang / lobes) * Math.PI * 2 - Math.PI / 2
    const arrivee = ((rang + 1) / lobes) * Math.PI * 2 - Math.PI / 2
    d += `Q ${point((depart + arrivee) / 2, saillie)} ${point(arrivee, 0.82)} `
  }

  return `${d}Z`
}

/**
 * Un cyprès — le fuseau qui signe un paysage du Midi.
 *
 * Étroit (moins d'un dixième de sa hauteur) et le plus large au tiers bas : ce
 * sont ces deux proportions qui font un cyprès. Plus large, ou renflé au
 * milieu, on obtient une feuille posée debout.
 */
export function Cypres({ x, base, hauteur, retard = 0, opacite = 1 }) {
  const demi = hauteur * 0.085

  return (
    <>
      <Trait
        d={`M ${x - demi * 0.45} ${base} C ${x - demi} ${base - hauteur * 0.4}, ${x - demi * 0.74} ${base - hauteur * 0.8}, ${x} ${base - hauteur} C ${x + demi * 0.74} ${base - hauteur * 0.8}, ${x + demi} ${base - hauteur * 0.4}, ${x + demi * 0.45} ${base}`}
        duree={0.9}
        retard={retard}
        largeur={1.5}
        opacite={opacite}
      />
      {/* Deux nervures courtes, décalées : ce qu'il faut pour que le fuseau ait
          un dedans, et pas une de plus — un cyprès de loin ne montre rien. */}
      {[0.28, 0.52].map((part, rang) => (
        <Trait
          key={part}
          d={`M ${x + demi * 0.22} ${base - hauteur * part} C ${x + demi * 0.36} ${base - hauteur * (part + 0.14)}, ${x + demi * 0.14} ${base - hauteur * (part + 0.2)}, ${x - demi * 0.1} ${base - hauteur * (part + 0.3)}`}
          duree={0.35}
          retard={retard + 0.5 + rang * 0.1}
          largeur={0.9}
          opacite={0.28}
        />
      ))}
    </>
  )
}

/**
 * Un pin parasol — le pin de luxe des propriétés du littoral.
 *
 * Trois proportions font le pin parasol, et elles sont ici écrites en fractions
 * de la hauteur plutôt qu'en unités : un dessin dont les cotes sont absolues se
 * dérègle dès qu'on le change de taille — la couronne d'un pin de 60 unités ne
 * peut pas mesurer ce que mesure celle d'un pin de 140.
 *
 *  - **Le fût occupe les deux tiers bas.** Un tronc court sous une grosse
 *    couronne donne un brocoli ; c'est précisément ce que donnait le dessin
 *    d'avant.
 *  - **La couronne est plus large que l'arbre n'est haut** (1,15 fois) et
 *    trois fois plus large que haute. C'est sa platitude qui fait le parasol :
 *    montée, elle redevient un feuillu quelconque.
 *  - **Les charpentières se posent avant elle.** Un pin parasol s'ouvre en
 *    candélabre sous son feuillage ; sans elles, le tronc monte tout droit
 *    jusqu'à un nuage posé dessus et l'arbre devient un réverbère.
 */
export function PinParasol({ x, base, hauteur, retard = 0, opacite = 1 }) {
  const cime = base - hauteur
  // Demi-largeur de la couronne, et sa demi-hauteur : trois fois moins. C'est
  // ce seul rapport qui fait le parasol.
  const envergure = hauteur * 0.55
  const ry = envergure * 0.33
  // Centre de la couronne, un peu sous la cime : le bouquet retombe autour de
  // son sommet, il n'est pas posé dessus.
  const cy = cime + ry * 0.9
  // Dessous de la couronne : le fût s'arrête là, les charpentières partent de
  // là — assez bas pour que le candélabre se voie sous le feuillage.
  const fourche = cime + hauteur * 0.32
  const derive = hauteur * 0.06

  return (
    <>
      {/* Le fût, du sol vers le ciel, avec le double déhanchement d'un pin qui
          a poussé au vent. */}
      <Trait
        d={`M ${x} ${base} C ${x + derive} ${base - hauteur * 0.32}, ${x - derive * 1.2} ${base - hauteur * 0.52}, ${x + derive * 0.4} ${fourche}`}
        duree={0.6}
        retard={retard}
        largeur={Math.max(1.2, hauteur * 0.022)}
        opacite={opacite}
      />
      {/* Une écorce en plaques, du côté éclairé seulement : deux traits courts
          suffisent à dire que le fût a une matière. */}
      {[0.34, 0.56].map((part, rang) => (
        <Trait
          key={part}
          d={`M ${x - derive * 0.4} ${base - hauteur * part} c ${derive * 0.5} ${-hauteur * 0.03} ${derive * 0.3} ${-hauteur * 0.05} ${derive * 0.8} ${-hauteur * 0.07}`}
          duree={0.22}
          retard={retard + 0.3 + rang * 0.08}
          largeur={0.8}
          opacite={0.28 * opacite}
        />
      ))}
      {/* Les charpentières : deux bras qui montent en s'écartant, jusque sous
          les bouquets extérieurs. */}
      {[-1, 1].map((sens, rang) => (
        <Trait
          key={sens}
          d={`M ${x + derive * 0.4} ${fourche} C ${x + sens * envergure * 0.26} ${fourche - hauteur * 0.07}, ${x + sens * envergure * 0.5} ${fourche - hauteur * 0.1}, ${x + sens * envergure * (rang ? 0.78 : 0.66)} ${cy + ry * 0.55}`}
          duree={0.4}
          retard={retard + 0.25 + rang * 0.05}
          largeur={Math.max(1, hauteur * 0.016)}
          opacite={opacite}
        />
      ))}
      {/* La couronne — un grand bouquet et deux débords décalés, jamais
          concentriques : c'est leur chevauchement qui évite le bloc unique. */}
      {[
        [0, 0, 1, 1, 7],
        [-0.62, 0.55, 0.44, 0.66, 5],
        [0.64, 0.42, 0.38, 0.58, 5],
      ].map(([dx, dy, kx, ky, lobes], rang) => (
        <Trait
          key={rang}
          d={couronne(
            x + envergure * dx,
            cy + ry * dy,
            envergure * kx,
            ry * ky,
            lobes,
            rang ? 1.2 : 1.24,
          )}
          duree={0.6}
          retard={retard + 0.45 + rang * 0.16}
          largeur={1.3}
          opacite={(rang ? 0.48 : 0.85) * opacite}
        />
      ))}
    </>
  )
}

/** Un arbre rond — olivier de prairie ou marronnier taillé de trottoir. */
export function Olivier({ x, base, rayon, retard = 0, opacite = 1 }) {
  const cy = base - rayon * 1.5

  return (
    <>
      <Trait
        d={`M ${x} ${base} C ${x - 3} ${base - rayon * 0.4}, ${x + 3} ${base - rayon * 0.7}, ${x} ${base - rayon}`}
        duree={0.4}
        retard={retard}
        largeur={1.8}
        opacite={opacite}
      />
      <Trait
        d={couronne(x, cy, rayon, rayon * 0.88, 7)}
        duree={0.9}
        retard={retard + 0.25}
        largeur={1.4}
        opacite={opacite}
      />
      {/* Deux branches qui montent dans le feuillage : sans elles, la couronne
          est posée sur le tronc au lieu d'en sortir. */}
      {[-1, 1].map((sens) => (
        <Trait
          key={sens}
          d={`M ${x} ${base - rayon * 0.9} C ${x + sens * rayon * 0.2} ${cy + rayon * 0.4}, ${x + sens * rayon * 0.42} ${cy + rayon * 0.2}, ${x + sens * rayon * 0.5} ${cy - rayon * 0.1}`}
          duree={0.35}
          retard={retard + 0.65}
          largeur={0.9}
          opacite={0.32 * opacite}
        />
      ))}
    </>
  )
}

/** Un palmier — un stipe courbe et cinq palmes qui retombent. */
export function Palmier({ x, base, hauteur, retard = 0, inclinaison = 6 }) {
  const cime = base - hauteur
  const tete = x + inclinaison

  return (
    <>
      <Trait
        d={`M ${x} ${base} C ${x + inclinaison * 0.4} ${base - hauteur * 0.45}, ${x + inclinaison * 0.8} ${base - hauteur * 0.75}, ${tete} ${cime}`}
        duree={0.7}
        retard={retard}
        largeur={2.2}
      />
      {[-38, -22, 0, 22, 38].map((ecart, rang) => (
        <Trait
          key={ecart}
          d={`M ${tete} ${cime} C ${tete + ecart * 0.55} ${cime - 14}, ${tete + ecart * 0.9} ${cime - 5}, ${tete + ecart} ${cime + 14 + Math.abs(ecart) * 0.18}`}
          duree={0.35}
          retard={retard + 0.4 + rang * 0.07}
          largeur={1.3}
          opacite={0.75}
        />
      ))}
    </>
  )
}

/**
 * Une haie taillée — un bandeau bas, au contour bosselé.
 *
 * La ligne du dessus n'est pas droite mais moutonnée : une haie taillée reste
 * une haie, les cisailles ne font pas un mur.
 */
export function Haie({ x1, x2, y, hauteur = 12, retard = 0, opacite = 0.7 }) {
  const bosses = Math.max(3, Math.round((x2 - x1) / 22))
  const pas = (x2 - x1) / bosses
  let d = `M ${x1} ${y} L ${x1} ${y - hauteur * 0.7} `
  for (let rang = 0; rang < bosses; rang += 1) {
    const depart = x1 + rang * pas
    d += `Q ${depart + pas * 0.5} ${y - hauteur * (rang % 2 ? 1.12 : 0.92)} ${depart + pas} ${y - hauteur * 0.74} `
  }
  d += `L ${x2} ${y}`

  return <Trait d={d} duree={0.9} retard={retard} largeur={1.3} opacite={opacite} />
}

// --- Bâti ------------------------------------------------------------------

/**
 * Un toit — sa pente, puis ses rangs de tuiles.
 *
 * Les rangs sont toujours posés après la pente et jamais au-delà d'elle : c'est
 * la pente qui contient le toit, pas l'inverse. Ce sont eux qui distinguent un
 * toit d'un triangle.
 */
export function Toit({ d, retard = 0, rangs = [], largeur = 1.6 }) {
  return (
    <>
      <Trait d={d} duree={0.7} retard={retard} largeur={largeur} />
      {rangs.map((rang, index) => (
        <Trait
          key={rang}
          d={rang}
          duree={0.35}
          retard={retard + 0.35 + index * 0.08}
          largeur={0.9}
          opacite={0.32}
        />
      ))}
    </>
  )
}

/**
 * Des baies — un vitrage léger et sa menuiserie.
 *
 * Le verre se pose (`Touche`), la menuiserie se trace : en dessous de vingt
 * unités, un cadre parcouru vaut mieux qu'un rectangle qui clignote, et le
 * vitrage seul n'aurait pas de dormant.
 *
 * `meneau` ajoute le montant central des grandes baies d'architecte — celui
 * qui, sur une façade contemporaine, remplace les petits bois.
 */
export function Fenetres({ liste, retard = 0, pas = 0.06, opacite = 0.12, meneau = false, traverse = false }) {
  return liste.map(([x, y, l, h], rang) => (
    <g key={`${x}-${y}`}>
      <Touche
        x={x}
        y={y}
        largeur={l}
        hauteur={h}
        retard={retard + rang * pas}
        duree={0.35}
        opacite={opacite}
        rx={1}
      />
      <Trait
        d={`M ${x} ${y + h} L ${x - 0.4} ${y} L ${x + l} ${y + 0.4} L ${x + l - 0.3} ${y + h} Z`}
        duree={0.4}
        retard={retard + 0.12 + rang * pas}
        largeur={1}
        opacite={0.55}
      />
      {meneau ? (
        <Trait
          d={`M ${x + l / 2} ${y + 1} L ${x + l / 2 - 0.3} ${y + h - 1}`}
          duree={0.22}
          retard={retard + 0.26 + rang * pas}
          largeur={0.8}
          opacite={0.4}
        />
      ) : null}
      {traverse ? (
        <Trait
          d={`M ${x + 1} ${y + h * 0.42} L ${x + l - 1} ${y + h * 0.42 - 0.4}`}
          duree={0.22}
          retard={retard + 0.3 + rang * pas}
          largeur={0.8}
          opacite={0.4}
        />
      ) : null}
    </g>
  ))
}

/**
 * Un garde-corps de terrasse — la lisse haute, puis les barreaux.
 *
 * L'ordre compte : la lisse porte les barreaux. Les tracer d'abord donnerait
 * une rangée de piquets plantés dans le vide.
 */
export function GardeCorps({ x1, x2, y, hauteur = 12, pas = 11, retard = 0, opacite = 0.55 }) {
  const barreaux = []
  for (let x = x1 + pas / 2; x < x2; x += pas) barreaux.push(x)

  return (
    <>
      <Trait d={`M ${x1} ${y - hauteur} L ${x2} ${y - hauteur + 0.6}`} duree={0.45} retard={retard} largeur={1.4} />
      <Trait
        d={`M ${x1 + 1} ${y - hauteur * 0.45} L ${x2 - 1} ${y - hauteur * 0.45 + 0.5}`}
        duree={0.35}
        retard={retard + 0.18}
        largeur={0.8}
        opacite={opacite * 0.7}
      />
      {barreaux.map((x, rang) => (
        <Trait
          key={x}
          d={`M ${x} ${y} L ${x + 0.4} ${y - hauteur}`}
          duree={0.18}
          retard={retard + 0.28 + rang * 0.025}
          largeur={0.9}
          opacite={opacite}
        />
      ))}
    </>
  )
}

/**
 * Une ferronnerie de balcon — le garde-corps ouvragé des immeubles de pierre.
 *
 * Le motif est une volute : deux arcs opposés entre deux barreaux. C'est lui,
 * et lui seul, qui distingue un balcon d'immeuble de standing d'une rambarde de
 * parking — et c'est précisément ce que l'ancien dessin n'avait pas.
 */
export function Ferronnerie({ x1, x2, y, hauteur = 14, pas = 13, retard = 0 }) {
  const motifs = []
  for (let x = x1; x + pas <= x2; x += pas) motifs.push(x)

  return (
    <>
      <Trait d={`M ${x1 - 3} ${y - hauteur} L ${x2 + 3} ${y - hauteur + 0.5}`} duree={0.5} retard={retard} largeur={1.5} />
      <Trait d={`M ${x1 - 3} ${y} L ${x2 + 3} ${y + 0.4}`} duree={0.45} retard={retard + 0.1} largeur={1.3} />
      {motifs.map((x, rang) => (
        <g key={x}>
          <Trait
            d={`M ${x} ${y} L ${x + 0.4} ${y - hauteur}`}
            duree={0.16}
            retard={retard + 0.26 + rang * 0.03}
            largeur={0.9}
            opacite={0.55}
          />
          {/* La volute : elle part du bas, s'enroule vers le haut, revient. */}
          <Trait
            d={`M ${x + 1.5} ${y - 1} C ${x + pas * 0.22} ${y - hauteur * 0.62}, ${x + pas * 0.78} ${y - hauteur * 0.62}, ${x + pas - 1.5} ${y - 1}`}
            duree={0.24}
            retard={retard + 0.34 + rang * 0.03}
            largeur={0.8}
            opacite={0.42}
          />
        </g>
      ))}
    </>
  )
}

/**
 * Une volée de marches — le perron d'une demeure ou l'accès d'une terrasse.
 *
 * Chaque marche se rétrécit en montant : c'est ce léger fuseau qui donne la
 * perspective. Des marches de largeur constante se lisent comme une échelle
 * posée à plat.
 */
export function Marches({ cx, y, largeur, nombre = 3, hauteur = 4, retard = 0 }) {
  return Array.from({ length: nombre }, (_, rang) => {
    const demi = (largeur / 2) * (1 - rang * 0.1)
    const yr = y - rang * hauteur
    return (
      <Trait
        key={rang}
        d={`M ${cx - demi} ${yr} L ${cx + demi} ${yr - 0.4} M ${cx + demi} ${yr - 0.4} L ${cx + demi * 0.94} ${yr - hauteur}`}
        duree={0.24}
        retard={retard + rang * 0.08}
        largeur={1.1}
        opacite={0.75}
      />
    )
  })
}

/**
 * Un muret de pierre sèche — l'assise des terrasses en restanque.
 *
 * L'appareil n'est pas régulier : les joints sont décalés d'une assise à
 * l'autre, sans quoi on obtient un mur de parpaings.
 */
export function Muret({ x1, x2, y, hauteur = 16, retard = 0 }) {
  const assises = [y - hauteur * 0.34, y - hauteur * 0.68]
  const joints = []
  for (let rang = 0; rang < assises.length + 1; rang += 1) {
    const base = rang * 9
    for (let x = x1 + 12 + base; x < x2 - 8; x += 26) joints.push([x, rang])
  }

  return (
    <>
      <Trait
        d={`M ${x1} ${y} L ${x1 + 1} ${y - hauteur} C ${(x1 + x2) / 2} ${y - hauteur - 2}, ${(x1 + x2) / 2} ${y - hauteur + 1}, ${x2} ${y - hauteur + 1} L ${x2 - 0.6} ${y}`}
        duree={0.9}
        retard={retard}
        largeur={1.5}
      />
      {assises.map((ya, rang) => (
        <Trait
          key={ya}
          d={`M ${x1 + 2} ${ya} C ${x1 + (x2 - x1) * 0.4} ${ya - 1.4}, ${x1 + (x2 - x1) * 0.7} ${ya + 1.2}, ${x2 - 2} ${ya}`}
          duree={0.4}
          retard={retard + 0.4 + rang * 0.1}
          largeur={0.8}
          opacite={0.3}
        />
      ))}
      {joints.map(([x, rang], index) => (
        <Trait
          key={`${x}-${rang}`}
          d={`M ${x} ${y - hauteur * (rang === 0 ? 0.34 : rang === 1 ? 0.68 : 1)} l ${rang % 2 ? 0.8 : -0.8} ${hauteur * 0.32}`}
          duree={0.14}
          retard={retard + 0.7 + index * 0.02}
          largeur={0.7}
          opacite={0.24}
        />
      ))}
    </>
  )
}

/**
 * Une souche de cheminée — le fût de brique et sa batterie de pots.
 *
 * Les pots sont ce qui la distingue d'un bloc : une souche sans mitrons se lit
 * comme un parallélépipède posé sur un toit.
 */
export function Souche({ x, y, largeur = 14, hauteur = 26, pots = 3, retard = 0 }) {
  const pas = largeur / pots

  return (
    <>
      <Trait
        d={`M ${x} ${y} L ${x + 0.6} ${y - hauteur} L ${x + largeur} ${y - hauteur - 0.8} L ${x + largeur - 0.5} ${y}`}
        duree={0.4}
        retard={retard}
        largeur={1.3}
      />
      <Trait
        d={`M ${x - 2} ${y - hauteur} L ${x + largeur + 2} ${y - hauteur - 0.8}`}
        duree={0.22}
        retard={retard + 0.18}
        largeur={1.1}
      />
      {Array.from({ length: pots }, (_, rang) => (
        <Trait
          key={rang}
          d={`M ${x + rang * pas + 1.4} ${y - hauteur - 1} l 0.3 -5.4 l ${pas - 3} 0 l 0.3 5.2`}
          duree={0.16}
          retard={retard + 0.26 + rang * 0.05}
          largeur={0.9}
          opacite={0.7}
        />
      ))}
    </>
  )
}

/**
 * Une lucarne de comble — le chien-assis des toits de zinc.
 *
 * Elle perce la pente : son fronton se pose d'abord, la baie ensuite. Quatre
 * lucarnes alignées sur un versant, et le toit cesse d'être un trapèze.
 */
export function Lucarne({ x, y, largeur = 13, hauteur = 15, retard = 0 }) {
  return (
    <>
      <Trait
        d={`M ${x} ${y} L ${x + 0.4} ${y - hauteur + 4} C ${x + largeur * 0.3} ${y - hauteur - 2}, ${x + largeur * 0.7} ${y - hauteur - 2}, ${x + largeur} ${y - hauteur + 4} L ${x + largeur - 0.4} ${y}`}
        duree={0.3}
        retard={retard}
        largeur={1.1}
      />
      <Aplat
        d={`M ${x + 2.4} ${y - 1} L ${x + 2.6} ${y - hauteur + 5} L ${x + largeur - 2.4} ${y - hauteur + 5} L ${x + largeur - 2.2} ${y - 1} Z`}
        retard={retard + 0.2}
        opacite={0.13}
      />
    </>
  )
}

/**
 * Un toit à la Mansart — brisis, terrasson, et l'égout qui les porte.
 *
 * C'est le toit de Paris, et il ne se confond avec rien : une pente raide qui
 * part de l'égout (le brisis, celui qu'on perce de lucarnes), une pente douce
 * qui la coiffe (le terrasson), et un faîtage plat entre les deux. Une simple
 * ligne brisée à la place — ce que dessinait la version précédente — donne une
 * rangée de tentes, pas une mer de toits.
 */
export function Mansarde({ x1, x2, egout, brisis, faite, retard = 0, opacite = 1 }) {
  const retraitBas = (x2 - x1) * 0.12
  const retraitHaut = (x2 - x1) * 0.26

  return (
    <>
      <Trait
        d={`M ${x1} ${egout} L ${x1 + retraitBas} ${brisis} L ${x2 - retraitBas} ${brisis - 0.6} L ${x2} ${egout - 0.5}`}
        duree={0.6}
        retard={retard}
        largeur={1.4}
        opacite={opacite}
      />
      <Trait
        d={`M ${x1 + retraitBas} ${brisis} L ${x1 + retraitHaut} ${faite} L ${x2 - retraitHaut} ${faite - 0.5} L ${x2 - retraitBas} ${brisis - 0.6}`}
        duree={0.5}
        retard={retard + 0.25}
        largeur={1.2}
        opacite={opacite}
      />
      {/* Les joints debout du zinc : trois traits sur le brisis, et c'est ce
          qui dit la matière du toit. */}
      {[0.3, 0.52, 0.74].map((part, rang) => (
        <Trait
          key={part}
          d={`M ${x1 + retraitBas + (x2 - x1 - retraitBas * 2) * part} ${brisis + 1} l ${(0.5 - part) * retraitBas * 1.4} ${egout - brisis - 2}`}
          duree={0.2}
          retard={retard + 0.45 + rang * 0.05}
          largeur={0.8}
          opacite={0.22 * opacite}
        />
      ))}
    </>
  )
}

/**
 * Un bandeau d'étage — la moulure filante qui sépare deux niveaux de pierre.
 *
 * Deux traits et non un : une moulure a une épaisseur, et c'est elle qui donne
 * à la façade son relief.
 */
export function Bandeau({ x1, x2, y, retard = 0, opacite = 0.4 }) {
  return (
    <>
      <Trait d={`M ${x1} ${y} L ${x2} ${y + 0.6}`} duree={0.35} retard={retard} largeur={1.2} opacite={opacite} />
      <Trait
        d={`M ${x1 + 1} ${y + 3} L ${x2 - 1} ${y + 3.5}`}
        duree={0.3}
        retard={retard + 0.08}
        largeur={0.8}
        opacite={opacite * 0.6}
      />
    </>
  )
}

// --- Eau -------------------------------------------------------------------

/**
 * Un bassin — margelle, plan d'eau, reflets, et l'échelle d'angle.
 *
 * Vu en légère plongée : le bord lointain est plus court que le bord proche, et
 * les deux côtés fuient. C'est cette seule dissymétrie qui fait un bassin
 * plutôt qu'un rectangle posé sur l'herbe — l'ancien dessin en était un.
 *
 * L'eau est un lavis qui se pose, pas un contour qu'on parcourt ; les reflets
 * arrivent après elle, et jamais jusqu'aux bords.
 */
export function Piscine({ cx, y, largeur, profondeur, retard = 0, echelle = true, fuite = 0.22 }) {
  const demi = largeur / 2
  const loin = demi * (1 - fuite)
  const gaucheLoin = cx - loin
  const droiteLoin = cx + loin
  const gauchePres = cx - demi
  const droitePres = cx + demi
  const yPres = y + profondeur

  // La margelle ne déborde que d'un cheveu : une dalle large redonne le cadre
  // de tableau qu'on cherche à éviter — c'est le bassin qu'on dessine, pas son
  // encadrement.
  const marge = profondeur * 0.13
  const contour = (d) =>
    `M ${gaucheLoin - d * (1 - fuite)} ${y - d} C ${cx - loin * 0.3} ${y - d - 1.2}, ${cx + loin * 0.3} ${y - d + 0.9}, ${droiteLoin + d * (1 - fuite)} ${y - d} L ${droitePres + d} ${yPres + d} C ${cx + demi * 0.3} ${yPres + d + 1.5}, ${cx - demi * 0.3} ${yPres + d + 1.1}, ${gauchePres - d} ${yPres + d} Z`

  return (
    <>
      <Trait d={contour(0)} duree={1} retard={retard} largeur={1.6} />
      <Trait d={contour(marge)} duree={0.9} retard={retard + 0.45} largeur={1} opacite={0.35} />
      <Aplat d={contour(0)} retard={retard + 0.9} duree={0.55} opacite={0.08} />
      {/* Le bord lointain, redoublé à l'intérieur : c'est l'ombre de la paroi
          sous la margelle, et c'est elle qui creuse le bassin. Sans elle, le
          plan d'eau reste une dalle posée sur l'herbe. */}
      <Trait
        d={`M ${gaucheLoin + 2} ${y + profondeur * 0.13} C ${cx - loin * 0.3} ${y + profondeur * 0.13 - 1}, ${cx + loin * 0.3} ${y + profondeur * 0.13 + 0.8}, ${droiteLoin - 2} ${y + profondeur * 0.13}`}
        duree={0.5}
        retard={retard + 1.25}
        largeur={1}
        opacite={0.3}
      />
      {/* Les reflets — trois traits couchés, de plus en plus longs vers le bord
          proche, et jamais joints aux parois : une ligne d'eau qui touche la
          margelle se lit comme une fissure. */}
      {[0.38, 0.62, 0.84].map((part, rang) => {
        const yr = y + profondeur * part
        const etendue = demi * (0.22 + part * 0.14)
        const decalage = (rang % 2 ? -1 : 1) * demi * 0.24
        return (
          <Trait
            key={part}
            d={`M ${cx + decalage - etendue} ${yr} q ${etendue * 0.5} -2.2 ${etendue} 0 t ${etendue} 0`}
            duree={0.4}
            retard={retard + 1.45 + rang * 0.14}
            largeur={0.9}
            opacite={0.26}
          />
        )
      })}
      {echelle ? (
        <>
          <Trait
            d={`M ${droiteLoin - largeur * 0.12} ${y - 0.5} c 0.5 -3.6 3.4 -4 4.2 -0.4`}
            duree={0.24}
            retard={retard + 1.9}
            largeur={1.1}
            opacite={0.55}
          />
          <Trait
            d={`M ${droiteLoin - largeur * 0.12 + 1.4} ${y - 3.6} l 1.4 0`}
            duree={0.12}
            retard={retard + 2}
            largeur={0.9}
            opacite={0.4}
          />
        </>
      ) : null}
    </>
  )
}

/**
 * La mer — quelques creux couchés, de plus en plus espacés vers le bas.
 *
 * Une mer hachurée d'un bord à l'autre deviendrait un aplat rayé : chaque trait
 * s'arrête, et deux traits voisins ne commencent jamais au même x.
 */
export function Vagues({ lignes, retard = 0, opacite = 0.28 }) {
  return lignes.map(([y, x1, x2], rang) => (
    <Trait
      key={`${y}-${x1}`}
      d={`M ${x1} ${y} q ${(x2 - x1) / 4} -5 ${(x2 - x1) / 2} 0 t ${(x2 - x1) / 2} 0`}
      duree={0.55}
      retard={retard + rang * 0.22}
      largeur={1}
      opacite={opacite}
    />
  ))
}

/**
 * Une étendue de mer — la bande d'eau entre l'horizon et le rivage.
 *
 * `Vagues` sert à poser trois creux choisis à la main ; `Mer` remplit une
 * hauteur entière, ce que demandent les planches où l'eau occupe un tiers du
 * cadre. Trois règles la rendent lisible :
 *
 *  - **Les rangs se desserrent en descendant.** Près de l'horizon les creux
 *    sont serrés et courts, au premier plan espacés et longs : c'est la seule
 *    perspective dont dispose un dessin au trait.
 *  - **Aucun rang ne traverse le cadre.** Deux à trois segments par rang,
 *    jamais alignés d'un rang à l'autre — une mer hachurée d'un bord à l'autre
 *    devient un aplat rayé.
 *  - **Le tirage est déterministe.** Les positions viennent d'une suite de
 *    sinus indexée sur le rang : le dessin est le même à chaque rendu, sinon la
 *    mer frétillerait à chaque passage de React.
 */
export function Mer({ yHaut, yBas, rangs = 10, retard = 0, largeur = 300, opacite = 0.3 }) {
  const traits = []

  for (let rang = 0; rang < rangs; rang += 1) {
    // Progression quadratique : les rangs s'espacent à mesure qu'ils
    // descendent, au lieu de se répartir régulièrement.
    const part = (rang / (rangs - 1)) ** 1.55
    const y = yHaut + (yBas - yHaut) * part
    const etendue = largeur * (0.12 + part * 0.26)
    const segments = rang % 3 === 2 ? 1 : 2

    for (let bloc = 0; bloc < segments; bloc += 1) {
      const graine = Math.sin((rang + 1) * 12.9898 + bloc * 78.233) * 43758.5453
      const alea = graine - Math.floor(graine)
      const x1 = (alea * (largeur - etendue) + bloc * largeur * 0.14) % (largeur - etendue)
      traits.push([
        `M ${x1.toFixed(1)} ${y.toFixed(1)} q ${(etendue / 4).toFixed(1)} ${-2 - part * 3} ${(etendue / 2).toFixed(1)} 0 t ${(etendue / 2).toFixed(1)} 0`,
        0.3 + part * 0.3,
        (0.55 + part * 0.75) * opacite,
      ])
    }
  }

  return traits.map(([d, duree, o], rang) => (
    <Trait key={d} d={d} duree={duree} retard={retard + rang * 0.08} largeur={0.9} opacite={o} />
  ))
}

/** Un voilier au mouillage — coque, mât, deux voiles et son reflet. */
export function Voilier({ x, y, echelle = 1, retard = 0 }) {
  const e = echelle

  return (
    <>
      <Trait
        d={`M ${x - 16 * e} ${y} C ${x - 10 * e} ${y + 5 * e}, ${x + 10 * e} ${y + 5 * e}, ${x + 17 * e} ${y} Z`}
        duree={0.4}
        retard={retard}
        largeur={1.3}
      />
      <Trait d={`M ${x - 1 * e} ${y} L ${x + 0.6 * e} ${y - 34 * e}`} duree={0.35} retard={retard + 0.15} largeur={1.1} />
      <Trait
        d={`M ${x + 1 * e} ${y - 32 * e} C ${x + 9 * e} ${y - 20 * e}, ${x + 12 * e} ${y - 10 * e}, ${x + 13 * e} ${y - 2 * e} L ${x + 1 * e} ${y - 2 * e} Z`}
        duree={0.4}
        retard={retard + 0.3}
        largeur={1.1}
      />
      <Trait
        d={`M ${x - 2 * e} ${y - 28 * e} C ${x - 8 * e} ${y - 18 * e}, ${x - 10 * e} ${y - 8 * e}, ${x - 10 * e} ${y - 2 * e} L ${x - 2 * e} ${y - 2 * e} Z`}
        duree={0.35}
        retard={retard + 0.44}
        largeur={1.1}
        opacite={0.8}
      />
      <Trait
        d={`M ${x - 12 * e} ${y + 7 * e} q ${6 * e} ${-2 * e} ${12 * e} 0 q ${6 * e} ${2 * e} ${11 * e} ${-1 * e}`}
        duree={0.3}
        retard={retard + 0.6}
        largeur={0.9}
        opacite={0.28}
      />
    </>
  )
}

/** Deux ou trois mouettes — un `v` mou, jamais symétrique. */
export function Mouettes({ points, retard = 0 }) {
  return points.map(([x, y, e = 1], rang) => (
    <Trait
      key={`${x}-${y}`}
      d={`M ${x - 7 * e} ${y} q ${3.4 * e} ${-4 * e} ${6.6 * e} ${-0.6 * e} q ${3.2 * e} ${-3.6 * e} ${7 * e} ${0.8 * e}`}
      duree={0.22}
      retard={retard + rang * 0.12}
      largeur={0.9}
      opacite={0.42}
    />
  ))
}

// --- Mobilier de jardin ----------------------------------------------------

/**
 * Un transat — dossier incliné, assise, quatre pieds, et les lattes.
 *
 * Le dossier est plus long que l'assise et la coupe en biais : c'est ce qui
 * fait lire « bain de soleil » plutôt que « chaise ». Les lattes arrivent en
 * dernier, à l'intérieur du contour.
 */
export function Transat({ x, y, echelle = 1, retard = 0, sens = 1 }) {
  const e = echelle
  const s = sens

  return (
    <>
      {/* Le bâti : dossier puis assise, d'un seul geste. */}
      <Trait
        d={`M ${x - 13 * e * s} ${y - 15 * e} C ${x - 10 * e * s} ${y - 11 * e}, ${x - 7 * e * s} ${y - 8 * e}, ${x - 4 * e * s} ${y - 6.5 * e} L ${x + 15 * e * s} ${y - 5 * e}`}
        duree={0.35}
        retard={retard}
        largeur={1.4}
      />
      <Trait
        d={`M ${x - 15 * e * s} ${y - 13 * e} C ${x - 11 * e * s} ${y - 8 * e}, ${x - 8 * e * s} ${y - 5.5 * e}, ${x - 4 * e * s} ${y - 4 * e} L ${x + 15 * e * s} ${y - 2.6 * e}`}
        duree={0.35}
        retard={retard + 0.1}
        largeur={1.2}
      />
      {/* Les pieds, croisés à l'arrière comme sur un transat qui se plie. */}
      <Trait d={`M ${x - 4 * e * s} ${y - 4 * e} l ${-1.4 * e * s} ${4 * e}`} duree={0.14} retard={retard + 0.22} largeur={1.1} />
      <Trait d={`M ${x + 13 * e * s} ${y - 2.8 * e} l ${1.2 * e * s} ${3.6 * e}`} duree={0.14} retard={retard + 0.26} largeur={1.1} />
      <Trait
        d={`M ${x + 5 * e * s} ${y - 3.4 * e} l ${-3 * e * s} ${4.2 * e} M ${x + 5 * e * s} ${y - 3.4 * e} l ${3 * e * s} ${4 * e}`}
        duree={0.18}
        retard={retard + 0.3}
        largeur={0.9}
        opacite={0.6}
      />
      {/* Les lattes du dossier — trois, en travers de la pente. */}
      {[0.3, 0.52, 0.74].map((part, rang) => (
        <Trait
          key={part}
          d={`M ${x - (13 - part * 9) * e * s} ${y - (15 - part * 9) * e} l ${-1.8 * e * s} ${1.6 * e}`}
          duree={0.12}
          retard={retard + 0.38 + rang * 0.05}
          largeur={0.8}
          opacite={0.35}
        />
      ))}
    </>
  )
}

/**
 * Un parasol de jardin — mât, toile festonnée, et la pointe.
 *
 * La toile est festonnée et non conique : un cône se lit comme un chapeau
 * chinois. Les baleines se devinent aux creux, elles ne sont pas tracées.
 */
export function ParasolJardin({ x, y, hauteur = 40, envergure = 26, retard = 0 }) {
  const cime = y - hauteur
  const festons = 4
  const pas = (envergure * 2) / festons
  let toile = `M ${x - envergure} ${cime + 10} `
  for (let rang = 0; rang < festons; rang += 1) {
    const depart = x - envergure + rang * pas
    toile += `Q ${depart + pas * 0.5} ${cime + 15} ${depart + pas} ${cime + 10} `
  }

  return (
    <>
      <Trait d={`M ${x} ${y} L ${x + 0.6} ${cime + 2}`} duree={0.3} retard={retard} largeur={1.3} />
      <Trait
        d={`M ${x - envergure} ${cime + 10} C ${x - envergure * 0.4} ${cime - 1}, ${x + envergure * 0.4} ${cime - 1}, ${x + envergure} ${cime + 10}`}
        duree={0.45}
        retard={retard + 0.16}
        largeur={1.4}
      />
      <Trait d={toile} duree={0.45} retard={retard + 0.3} largeur={1.2} opacite={0.8} />
      <Trait d={`M ${x} ${cime + 2} l 0.4 -5`} duree={0.12} retard={retard + 0.44} largeur={1} opacite={0.6} />
    </>
  )
}
