/**
 * Le pinceau — brique commune à tous les dessins à l'encre du parcours.
 *
 * ── Pourquoi ce fichier remplace l'ancien dispositif ──────────────────────
 *
 * Les dessins du parcours étaient jusqu'ici des **tableaux de chaînes `d`**
 * écrites en primitives `H`/`V`/`L` — une maison entière tenait en
 * `M96 246 V66 H204 V246` plus six horizontales pour les planchers — repassées
 * sous un filtre `feTurbulence` censé leur donner l'air d'avoir été tracées à
 * la main. Le filtre ne pouvait pas y suffire : il tord une géométrie, il n'en
 * ajoute pas. Vingt segments droits tremblés restent vingt segments droits, et
 * le dessin se lisait comme ce qu'il était — des rectangles assemblés.
 *
 * Le remède n'est pas un réglage de plus sur la même base, c'est un changement
 * de technique : de **vraies cubiques posées point par point**, composées à
 * partir d'un vocabulaire de motifs ([`motifs.jsx`](./motifs.jsx)) — un
 * feuillage construit bouquet par bouquet, un pin qui s'ouvre en candélabre
 * sous sa couronne, des rangs de tuiles sur une pente, une ferronnerie de
 * balcon. Une planche y compte cent à deux cents traits au lieu de vingt, et
 * l'irrégularité est **dans la géométrie**, plus dans un post-traitement. Il
 * n'y a donc plus aucun filtre : le dessin est irrégulier parce qu'il est
 * dessiné irrégulier.
 *
 * ── Le principe ──────────────────────────────────────────────────────────
 *
 * Celui du sumi-e : rien n'apparaît, tout se trace. `.imv-ink-trait` (voir
 * `src/index.css`) masque la longueur du tracé puis la libère, si bien que le
 * trait sort de son point de départ et court jusqu'au bout, comme une pointe
 * qui avance sur le papier. Un fondu donnerait le même dessin au bout du
 * compte ; il ne donnerait pas le geste.
 *
 * `pathLength="1"` renormalise les longueurs : une menuiserie de vingt unités
 * et une façade de trois cents se pilotent alors avec les mêmes durées, et
 * retoucher un dessin ne demande pas d'en remesurer les chemins.
 *
 * **Le sens de chaque tracé est un choix, pas un détail** : un mur se dessine
 * du sol vers le haut, un horizon de gauche à droite, un bassin d'un tour de
 * pinceau. Inverser un seul `M` fait descendre un bâtiment dans le sol.
 *
 * ── La couleur ────────────────────────────────────────────────────────────
 *
 * Aucune, jamais : noir sur blanc, et le noir est le `currentColor` posé par le
 * parent. C'est ce qui permet à la même planche d'être à pleine encre sur
 * l'écran d'analyse et à 60 % derrière un titre, sans deux jeux de trajets.
 */

/**
 * La cadence — le facteur par lequel une planche entière ralentit ou accélère.
 *
 * Durées et retards sont écrits en `calc(… * var(--cadence, 1))` : poser
 * `--cadence` sur un ancêtre (le `<svg>` d'une planche, par exemple) étire
 * toute sa chorégraphie sans toucher à un seul de ses tracés. Sans défaut à 1,
 * il faudrait la déclarer partout ; avec, une planche qu'on monte telle quelle
 * garde son minutage d'origine.
 *
 * C'est ce qui permet aux deux planches de l'écran d'analyse de durer six
 * secondes chacune alors qu'elles sont écrites sur cinq : elles se dessinent
 * plus lentement, pas plus tard.
 */
const duree = (secondes) => `calc(${secondes}s * var(--cadence, 1))`

/**
 * Le retard d'un trait : sa place dans la partition, à la cadence de la
 * planche, **plus** le décalage global de celle-ci.
 *
 * Le décalage s'ajoute après la mise à l'échelle et non avant : c'est le
 * moment où la planche commence, pas une durée qu'il faudrait étirer avec le
 * reste. Il sert à l'écran d'analyse, où la planche de droite démarre quand
 * celle de gauche s'achève — sans lui, il faudrait propager six secondes dans
 * les deux cents retards de la scène.
 */
const retard = (secondes) =>
  `calc(${secondes}s * var(--cadence, 1) + var(--decalage, 0s))`

/** Épaisseur par défaut — celle d'un trait de construction ordinaire. */
const LARGEUR = 1.5

/**
 * Un trait : sa forme, son épaisseur, et le moment où le pinceau le pose.
 *
 * `duree` et `retard` sont en secondes, comptées depuis le début de la planche
 * — jamais depuis le trait précédent. Une planche se relit ainsi comme une
 * partition : on voit d'un coup d'œil ce qui se dessine à la troisième seconde.
 */
export function Trait({ d, duree: temps = 0.7, retard: depart = 0, largeur = LARGEUR, opacite = 1 }) {
  return (
    <path
      d={d}
      pathLength="1"
      className="imv-ink-trait"
      style={{ '--ink-d': duree(temps), '--ink-t': retard(depart) }}
      fill="none"
      stroke="currentColor"
      strokeWidth={largeur}
      strokeOpacity={opacite}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

/**
 * Un aplat qui se pose — à employer là où il n'y a pas de contour à parcourir.
 *
 * L'eau d'un bassin, le verre d'une baie, l'ombre au pied d'un mur : ce sont
 * des lavis, et un lavis arrive d'un bloc là où un trait court. Les parcourir
 * reviendrait à les faire clignoter.
 *
 * L'opacité finale passe par `--ink-o` parce que c'est elle que l'animation
 * vise : la poser en attribut la ferait écraser par l'image clé de fin.
 */
export function Aplat({ d, retard: depart = 0, duree: temps = 0.45, opacite = 0.07 }) {
  return (
    <path
      d={d}
      className="imv-ink-aplat"
      style={{ '--ink-d': duree(temps), '--ink-t': retard(depart), '--ink-o': opacite }}
      fill="currentColor"
      stroke="none"
    />
  )
}

/**
 * Une touche rectangulaire — le même lavis, pour les cas où le contour est un
 * rectangle et où l'écrire en `d` n'apprendrait rien à personne (vitrages en
 * série, essentiellement).
 */
export function Touche({ x, y, largeur, hauteur, retard: depart = 0, duree: temps = 0.4, opacite = 0.1, rx = 0.6 }) {
  return (
    <rect
      x={x}
      y={y}
      width={largeur}
      height={hauteur}
      rx={rx}
      className="imv-ink-aplat"
      style={{ '--ink-d': duree(temps), '--ink-t': retard(depart), '--ink-o': opacite }}
      fill="currentColor"
      stroke="none"
    />
  )
}

/**
 * Le cadre d'une planche — un `<svg>` réglé une fois pour toutes.
 *
 * Il centralise ce que chaque scène redéclarait : la couleur héritée, les
 * bouts de trait arrondis, le `fill="none"` par défaut, et la cadence posée en
 * variable CSS sur la racine du dessin.
 *
 * `decalage` (en secondes) retarde la planche entière sans toucher à sa
 * cadence : la seconde planche de l'écran d'analyse démarre quand la première
 * s'achève.
 *
 * `align` est l'ancrage du dessin quand les proportions de la boîte ne
 * coïncident pas avec celles de la `viewBox`. `xMidYMid` convient aux
 * emplacements dont on a réglé le rapport ; `xMidYMax` cale la scène par le
 * bas, ce que demande un décor posé derrière du texte — c'est la ligne de sol,
 * et non le centre du dessin, qui doit tomber à un endroit précis de la page.
 */
export function Planche({
  vue,
  cadence = 1,
  decalage = 0,
  align = 'xMidYMid',
  className = '',
  children,
}) {
  return (
    <svg
      viewBox={vue}
      preserveAspectRatio={`${align} meet`}
      role="presentation"
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none select-none ${className}`}
      style={{ '--cadence': cadence, '--decalage': `${decalage}s` }}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}
