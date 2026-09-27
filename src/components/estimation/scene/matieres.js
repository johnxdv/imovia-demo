import * as THREE from 'three'

/**
 * MATIÈRES ET TEXTURES DU DÉCOR D'ESTIMATION.
 *
 * Un seul endroit où sont écrites les couleurs du chantier : la villa,
 * l'immeuble, la cage d'escalier et l'appartement puisent tous ici. C'est ce
 * qui fait que la pierre de la façade et celle du palier sont la même pierre,
 * et que le laiton de la marquise est celui des barres de tapis.
 *
 * Chaque fonction RETOURNE UNE MATIÈRE NEUVE. Les matières sont modifiées en
 * place pendant l'animation (opacité, émission), et deux pièces qui
 * partageraient la même s'allumeraient ensemble — ce qui n'est presque jamais
 * ce qu'on veut. Les TEXTURES, elles, sont peintes une fois et mises en cache :
 * elles ne changent pas, et les repeindre à chaque reconstruction de bâtiment
 * coûterait cher pour un résultat identique.
 */

/* -------------------------------------------------------------------------- */
/*  Textures peintes au canevas                                               */
/* -------------------------------------------------------------------------- */

const cache = new Map()

/** Peint une texture une seule fois et la garde ; `libererTextures` la rend. */
function texture(nom, largeur, hauteur, peindre, { repeter = null, espace = THREE.SRGBColorSpace } = {}) {
  const existante = cache.get(nom)
  if (existante) return existante

  const canvas = document.createElement('canvas')
  canvas.width = largeur
  canvas.height = hauteur
  peindre(canvas.getContext('2d'), largeur, hauteur)

  const map = new THREE.CanvasTexture(canvas)
  // LES CARTES DE DONNÉES NE SONT PAS DES IMAGES. Une carte de rugosité ou de
  // relief ne se regarde pas : ses trois canaux portent des nombres, pas des
  // couleurs. Les déclarer en sRGB reviendrait à leur appliquer une correction
  // de gamma — une pierre mate y deviendrait brillante, et un relief plat se
  // creuserait de moitié.
  map.colorSpace = espace
  if (repeter) {
    map.wrapS = THREE.RepeatWrapping
    map.wrapT = THREE.RepeatWrapping
    map.repeat.set(repeter[0], repeter[1])
  }
  map.anisotropy = 4

  cache.set(nom, map)
  return map
}

/* -------------------------------------------------------------------------- */
/*  Les deux cartes qui font la différence entre une matière et une couleur    */
/* -------------------------------------------------------------------------- */

/**
 * CE QUI MANQUAIT AU DÉCOR : LA RUGOSITÉ ET LE RELIEF.
 *
 * Chaque surface portait jusqu'ici une couleur — parfois une image — et une
 * SEULE valeur de rugosité pour toute son étendue. C'est exactement ce qui
 * donne à une scène 3D son aspect de plastique : dans le monde, aucune surface
 * n'est également mate partout. Une pierre est plus lisse sur le nu de
 * l'assise que dans son joint, un bois brille sur le fil et boit la lumière
 * dans sa veine, un crépi n'a pas deux grains semblables à dix centimètres
 * d'écart.
 *
 * Deux cartes suffisent à le dire, et ce sont celles qu'on ajoute ici :
 *
 *   LA RUGOSITÉ (`rugosite`) — une image en niveaux de gris où le noir est un
 *   miroir et le blanc une craie. C'est elle, avant la couleur, qui fait qu'on
 *   reconnaît une matière : on identifie le zinc d'un toit à la manière dont il
 *   rend la lumière bien avant d'en avoir vu la teinte.
 *
 *   LE RELIEF (`relief`) — une carte de normales, calculée à partir d'un champ
 *   de hauteurs peint au canevas. Elle ne déplace pas un sommet : elle ment sur
 *   l'orientation de la surface, et cela suffit pour qu'un joint de pierre
 *   porte son ombre et qu'une lame de bardage se détache de sa voisine. C'est
 *   le seul moyen d'avoir du relief sans géométrie — et donc sans en payer le
 *   prix à chaque image.
 *
 * TOUT EST PEINT AU CANEVAS, et c'est un choix. Des textures photographiques
 * (Poly Haven ou autres) donneraient un grain plus riche, mais au prix de
 * plusieurs mégaoctets à télécharger avant la première image d'un parcours qui
 * doit s'ouvrir tout de suite. Les cartes ci-dessous pèsent zéro octet sur le
 * réseau : elles sont calculées à la construction de la scène, mises en cache,
 * et ne coûtent qu'une poignée de millisecondes une fois pour toutes.
 */

/** Carte de rugosité : peinte en gris, lue comme un nombre. */
const rugosite = (nom, largeur, hauteur, peindre, options = {}) =>
  texture(`rug-${nom}`, largeur, hauteur, peindre, { ...options, espace: THREE.NoColorSpace })

/**
 * CARTE DE RELIEF, calculée à partir d'un champ de hauteurs.
 *
 * `peindre` dessine une image en niveaux de gris où le clair est en saillie et
 * le sombre en creux — c'est-à-dire exactement ce qu'on a en tête en dessinant
 * un joint ou une rainure. La pente est ensuite relevée en chaque point par
 * différence avec ses voisins (un Sobel abrégé : deux voisins au lieu de six,
 * pour un résultat que rien ne distingue à cette échelle), et c'est cette pente
 * qui devient la normale.
 *
 * `force` est la profondeur apparente. Au-delà de 3, le mensonge se voit : les
 * ombres du relief ne s'accordent plus avec celles de la géométrie, et la
 * surface se met à grouiller quand la caméra bouge.
 */
function relief(nom, largeur, hauteur, peindre, { force = 1.6, repeter = null } = {}) {
  const cle = `rel-${nom}`
  const existante = cache.get(cle)
  if (existante) return existante

  const champ = document.createElement('canvas')
  champ.width = largeur
  champ.height = hauteur
  const ctxChamp = champ.getContext('2d')
  peindre(ctxChamp, largeur, hauteur)
  const hauteurs = ctxChamp.getImageData(0, 0, largeur, hauteur).data

  const canvas = document.createElement('canvas')
  canvas.width = largeur
  canvas.height = hauteur
  const ctx = canvas.getContext('2d')
  const sortie = ctx.createImageData(largeur, hauteur)

  /**
   * LE CHAMP EST RECOPIÉ À PLAT AVANT D'ÊTRE DÉRIVÉ, et ce n'est pas de la
   * coquetterie : la boucle qui suit tourne 65 000 fois par carte et une
   * quinzaine de cartes se calculent au montage de la scène. Lire directement
   * dans le tableau RGBA, avec ses quatre octets par point et son modulo par
   * accès, coûtait à lui seul plus de la moitié des deux cents millisecondes
   * que prenait l'ensemble. Un tableau d'un flottant par point, et les bords
   * gérés une fois pour toutes en tête de ligne, le ramènent au tiers.
   */
  const champPlat = new Float32Array(largeur * hauteur)
  for (let i = 0; i < champPlat.length; i += 1) champPlat[i] = hauteurs[i * 4] / 255

  for (let y = 0; y < hauteur; y += 1) {
    // Les lignes voisines, bouclées : une texture qui se répète doit avoir un
    // relief qui se répète aussi, sans couture au raccord.
    const ligne = y * largeur
    const ligneHaut = (y === 0 ? hauteur - 1 : y - 1) * largeur
    const ligneBas = (y === hauteur - 1 ? 0 : y + 1) * largeur

    for (let x = 0; x < largeur; x += 1) {
      const gauche = x === 0 ? largeur - 1 : x - 1
      const droite = x === largeur - 1 ? 0 : x + 1

      const dx = (champPlat[ligne + gauche] - champPlat[ligne + droite]) * force
      const dy = (champPlat[ligneHaut + x] - champPlat[ligneBas + x]) * force
      // Normalisation du vecteur (dx, dy, 1), puis repli de [−1, 1] sur [0, 1] :
      // c'est la convention d'une carte de normales en espace tangent.
      const longueur = Math.sqrt(dx * dx + dy * dy + 1)
      const i = (ligne + x) * 4
      sortie.data[i] = ((dx / longueur) * 0.5 + 0.5) * 255
      sortie.data[i + 1] = ((dy / longueur) * 0.5 + 0.5) * 255
      sortie.data[i + 2] = (1 / longueur) * 255
      sortie.data[i + 3] = 255
    }
  }

  ctx.putImageData(sortie, 0, 0)

  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.NoColorSpace
  if (repeter) {
    map.wrapS = THREE.RepeatWrapping
    map.wrapT = THREE.RepeatWrapping
    map.repeat.set(repeter[0], repeter[1])
  }
  map.anisotropy = 4

  cache.set(cle, map)
  return map
}

/**
 * Bruit doux en niveaux de gris, pour les champs de hauteurs : le grain d'un
 * crépi, celui d'une pierre, celui d'un enduit taloché.
 */
function grainGris(ctx, largeur, hauteur, quantite, amplitude, fond = 128) {
  ctx.fillStyle = `rgb(${fond},${fond},${fond})`
  ctx.fillRect(0, 0, largeur, hauteur)
  // DES RECTANGLES, PAS DES DISQUES. Un `arc` coûte un tracé de chemin, une
  // rastérisation antialiasée et un changement d'état ; un `fillRect` coûte un
  // remplissage. Sur les cinq mille grains d'un crépi, l'écart se compte en
  // dizaines de millisecondes — et à un pixel et demi de côté, personne ne
  // distingue un carré d'un rond.
  for (let i = 0; i < quantite; i += 1) {
    const t = fond + (Math.random() - 0.5) * 2 * amplitude
    const v = t < 0 ? 0 : t > 255 ? 255 : t | 0
    ctx.fillStyle = `rgb(${v},${v},${v})`
    const cote = 1.2 + Math.random() * 2.4
    ctx.fillRect(Math.random() * largeur, Math.random() * hauteur, cote, cote)
  }
}

/** Rend toutes les textures peintes. Appelé au démontage de la scène. */
export function libererTextures() {
  cache.forEach((map) => map.dispose())
  cache.clear()
}

/** Bruit doux : le grain qui empêche une surface d'être un aplat. */
function grain(ctx, largeur, hauteur, quantite, alpha) {
  for (let i = 0; i < quantite; i += 1) {
    const x = Math.random() * largeur
    const y = Math.random() * hauteur
    const t = Math.random()
    ctx.fillStyle = `rgba(${t > 0.5 ? '255,255,255' : '0,0,0'},${alpha * Math.random()})`
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2)
  }
}

/**
 * PIERRE DE TAILLE HAUSSMANNIENNE — assises régulières, joints fins et clairs.
 *
 * C'est la texture qui fait la différence entre un immeuble et une boîte
 * beige : la pierre de Paris se lit à ses assises horizontales, hautes d'une
 * quarantaine de centimètres, et à ses joints presque invisibles.
 */
export const texturePierre = () =>
  texture('pierre', 256, 256, (ctx, l, h) => {
    ctx.fillStyle = '#e4d9c3'
    ctx.fillRect(0, 0, l, h)

    const assise = h / 8
    for (let i = 0; i < 8; i += 1) {
      // Chaque assise a sa nuance : une pierre appareillée n'est jamais d'un
      // seul ton, et c'est cette irrégularité qui la fait lire comme pierre.
      const clarte = 218 + Math.floor(Math.random() * 16)
      ctx.fillStyle = `rgb(${clarte},${clarte - 8},${clarte - 32})`
      ctx.fillRect(0, i * assise, l, assise - 1.5)

      ctx.strokeStyle = 'rgba(150,134,104,0.55)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, i * assise + assise - 1)
      ctx.lineTo(l, i * assise + assise - 1)
      ctx.stroke()

      // Joints verticaux, décalés d'une assise à l'autre.
      const decalage = (i % 2) * (l / 6)
      for (let j = 0; j < 3; j += 1) {
        const x = decalage + (j * l) / 3
        ctx.beginPath()
        ctx.moveTo(x, i * assise)
        ctx.lineTo(x, i * assise + assise - 1)
        ctx.stroke()
      }
    }

    grain(ctx, l, h, 1600, 0.09)
  }, { repeter: [1, 1] })

/** Pierre du socle : même appareil, bossage marqué, ton plus sourd. */
export const texturePierreSocle = () =>
  texture('pierre-socle', 256, 256, (ctx, l, h) => {
    ctx.fillStyle = '#cdbfa3'
    ctx.fillRect(0, 0, l, h)

    const assise = h / 5
    for (let i = 0; i < 5; i += 1) {
      const clarte = 198 + Math.floor(Math.random() * 14)
      ctx.fillStyle = `rgb(${clarte},${clarte - 10},${clarte - 34})`
      ctx.fillRect(3, i * assise + 3, l - 6, assise - 8)
      // Le refend : l'ombre portée du bossage, en creux autour de chaque pierre.
      ctx.strokeStyle = 'rgba(96,84,62,0.6)'
      ctx.lineWidth = 3
      ctx.strokeRect(3, i * assise + 3, l - 6, assise - 8)
    }

    grain(ctx, l, h, 1400, 0.1)
  })

/** Zinc de la toiture mansardée : bandes verticales et joints debout. */
export const textureZinc = () =>
  texture('zinc', 128, 128, (ctx, l, h) => {
    ctx.fillStyle = '#5b6470'
    ctx.fillRect(0, 0, l, h)
    for (let x = 0; x < l; x += 16) {
      ctx.fillStyle = 'rgba(255,255,255,0.09)'
      ctx.fillRect(x, 0, 2, h)
      ctx.fillStyle = 'rgba(0,0,0,0.16)'
      ctx.fillRect(x + 2, 0, 1.5, h)
    }
    grain(ctx, l, h, 900, 0.07)
  }, { repeter: [1, 1] })

/**
 * PARQUET EN POINT DE HONGRIE — le sol des appartements haussmanniens.
 *
 * Deux files de lames coupées en biseau qui se rejoignent en chevron. Sans lui,
 * le séjour n'est qu'une boîte blanche ; avec lui, on sait tout de suite où on
 * se trouve.
 */
export const textureParquet = () =>
  texture('parquet', 512, 512, (ctx, l, h) => {
    ctx.fillStyle = '#b98a55'
    ctx.fillRect(0, 0, l, h)

    const lame = 44
    for (let rangee = -2; rangee < 14; rangee += 1) {
      for (let colonne = -2; colonne < 14; colonne += 1) {
        const x = colonne * lame
        const y = rangee * lame
        const gauche = (colonne + rangee) % 2 === 0
        const ton = 150 + Math.floor(Math.random() * 42)

        ctx.save()
        ctx.translate(x + lame / 2, y + lame / 2)
        ctx.rotate(gauche ? -Math.PI / 4 : Math.PI / 4)
        ctx.fillStyle = `rgb(${ton},${Math.round(ton * 0.68)},${Math.round(ton * 0.42)})`
        ctx.fillRect(-lame * 0.62, -lame * 0.22, lame * 1.24, lame * 0.44)
        ctx.strokeStyle = 'rgba(70,44,22,0.42)'
        ctx.lineWidth = 1.6
        ctx.strokeRect(-lame * 0.62, -lame * 0.22, lame * 1.24, lame * 0.44)
        // Le fil du bois, dans le sens de la lame.
        ctx.strokeStyle = 'rgba(94,60,30,0.2)'
        ctx.lineWidth = 0.8
        for (let f = 0; f < 3; f += 1) {
          const fy = -lame * 0.16 + f * lame * 0.15
          ctx.beginPath()
          ctx.moveTo(-lame * 0.6, fy)
          ctx.lineTo(lame * 0.6, fy)
          ctx.stroke()
        }
        ctx.restore()
      }
    }

    grain(ctx, l, h, 2400, 0.08)
  }, { repeter: [1, 1] })

/**
 * TAPIS D'ESCALIER ROUGE — le passage de l'immeuble bourgeois.
 *
 * Fond grenat, médaillons sombres, deux lisérés bleu nuit en rive : c'est le
 * motif des cages d'escalier parisiennes, et c'est lui qu'on reconnaît avant
 * même d'avoir vu la rampe.
 */
export const textureTapis = () =>
  texture('tapis', 128, 256, (ctx, l, h) => {
    ctx.fillStyle = '#8d1220'
    ctx.fillRect(0, 0, l, h)

    // Lisérés de rive.
    ctx.fillStyle = '#1b2440'
    ctx.fillRect(0, 0, 10, h)
    ctx.fillRect(l - 10, 0, 10, h)
    ctx.fillStyle = '#c8a24c'
    ctx.fillRect(10, 0, 3, h)
    ctx.fillRect(l - 13, 0, 3, h)

    // Médaillons du champ central.
    for (let y = 22; y < h; y += 52) {
      ctx.save()
      ctx.translate(l / 2, y)
      ctx.fillStyle = '#2a1520'
      ctx.beginPath()
      ctx.ellipse(0, 0, 26, 16, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#c8a24c'
      ctx.beginPath()
      ctx.ellipse(0, 0, 13, 7, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#1f6b52'
      ctx.beginPath()
      ctx.ellipse(0, 0, 5, 3, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    grain(ctx, l, h, 1200, 0.12)
  }, { repeter: [1, 1] })

/** Moquette / tapis de salon : laine claire à trame berbère. */
export const textureTapisSalon = () =>
  texture('tapis-salon', 256, 256, (ctx, l, h) => {
    ctx.fillStyle = '#e8e1d4'
    ctx.fillRect(0, 0, l, h)
    ctx.strokeStyle = 'rgba(40,44,54,0.32)'
    ctx.lineWidth = 2.5
    for (let i = -8; i < 16; i += 1) {
      ctx.beginPath()
      ctx.moveTo(i * 32, 0)
      ctx.lineTo(i * 32 + h, h)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(i * 32, h)
      ctx.lineTo(i * 32 + h, 0)
      ctx.stroke()
    }
    grain(ctx, l, h, 2000, 0.1)
  })

/** Eau de piscine : fond clair, résille de caustiques. */
export const textureEau = () =>
  texture('eau', 256, 256, (ctx, l, h) => {
    const fond = ctx.createLinearGradient(0, 0, 0, h)
    fond.addColorStop(0, '#4fa8c4')
    fond.addColorStop(1, '#1f6f92')
    ctx.fillStyle = fond
    ctx.fillRect(0, 0, l, h)

    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 2.5
    for (let i = 0; i < 40; i += 1) {
      const x = Math.random() * l
      const y = Math.random() * h
      ctx.beginPath()
      ctx.ellipse(x, y, 10 + Math.random() * 26, 4 + Math.random() * 10, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.stroke()
    }
  })

/** Gazon : vert tendre irrégulier, sans motif lisible de près. */
export const textureGazon = () =>
  texture('gazon', 128, 128, (ctx, l, h) => {
    ctx.fillStyle = '#7ca35c'
    ctx.fillRect(0, 0, l, h)
    for (let i = 0; i < 2600; i += 1) {
      const v = 90 + Math.floor(Math.random() * 60)
      ctx.fillStyle = `rgba(${Math.round(v * 0.72)},${v + 20},${Math.round(v * 0.6)},0.5)`
      ctx.fillRect(Math.random() * l, Math.random() * h, 2, 3)
    }
  }, { repeter: [4, 4] })

/**
 * GRAVIER D'ALLÉE — et pourquoi il lui fallait sa texture.
 *
 * C'était `color: 0xbdb5a4`, sans rien d'autre : sous le soleil de la scène,
 * une allée de neuf mètres y rendait une dalle blanche, et la maison paraissait
 * posée à côté d'un parking. Du gravier se reconnaît à UNE chose — son grain
 * irrégulier et l'ombre que chaque caillou porte sur son voisin — et c'est
 * exactement ce qu'une couleur ne peut pas dire.
 */
export const textureGravier = () =>
  texture('gravier', 256, 256, (ctx, l, h) => {
    ctx.fillStyle = '#a8a091'
    ctx.fillRect(0, 0, l, h)
    for (let i = 0; i < 1500; i += 1) {
      const t = 150 + Math.floor(Math.random() * 78)
      ctx.fillStyle = `rgb(${t},${t - 6},${t - 20})`
      ctx.fillRect(
        Math.random() * l,
        Math.random() * h,
        2 + Math.random() * 4,
        1.6 + Math.random() * 3,
      )
    }
    grain(ctx, l, h, 2000, 0.14)
  }, { repeter: [3, 6] })

export const reliefGravier = () =>
  relief('gravier', 128, 128, (ctx, l, h) => grainGris(ctx, l, h, 2200, 74, 120), {
    force: 1.6,
    repeter: [3, 6],
  })

/** Dallage de la terrasse : grands formats de pierre claire, joints creux. */
export const textureDallage = () =>
  texture('dallage', 256, 256, (ctx, l, h) => {
    ctx.fillStyle = '#ddd6c8'
    ctx.fillRect(0, 0, l, h)
    const dalle = 64
    for (let y = 0; y < h; y += dalle) {
      for (let x = 0; x < l; x += dalle) {
        const ton = 210 + Math.floor(Math.random() * 18)
        ctx.fillStyle = `rgb(${ton},${ton - 5},${ton - 18})`
        ctx.fillRect(x + 2, y + 2, dalle - 4, dalle - 4)
      }
    }
    grain(ctx, l, h, 1500, 0.07)
  }, { repeter: [1, 1] })

/** Panneau photovoltaïque : cellules bleu nuit et grille d'argent. */
export const texturePanneau = () =>
  texture('panneau', 128, 128, (ctx, l, h) => {
    ctx.fillStyle = '#12243f'
    ctx.fillRect(0, 0, l, h)
    const cellule = l / 4
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        ctx.fillStyle = '#1b3a63'
        ctx.fillRect(x * cellule + 3, y * cellule + 3, cellule - 6, cellule - 6)
        ctx.strokeStyle = 'rgba(188,206,228,0.5)'
        ctx.lineWidth = 1
        for (let b = 1; b < 3; b += 1) {
          ctx.beginPath()
          ctx.moveTo(x * cellule + 3, y * cellule + 3 + (b * (cellule - 6)) / 3)
          ctx.lineTo(x * cellule + cellule - 3, y * cellule + 3 + (b * (cellule - 6)) / 3)
          ctx.stroke()
        }
      }
    }
  }, { repeter: [1, 1] })

/**
 * TOILES DES TABLEAUX — quatre compositions abstraites, tirées au sort à
 * l'accrochage. Un appartement de standing a des tableaux, pas des rectangles
 * gris ; et quatre suffisent pour qu'aucun mur n'en montre deux identiques.
 */
export const textureToile = (index) =>
  texture(`toile-${index}`, 128, 160, (ctx, l, h) => {
    const palettes = [
      ['#1f3b4d', '#c9a16b', '#e8e2d6'],
      ['#7a2a2a', '#e0d3bb', '#2a2f3a'],
      ['#2f4a34', '#d8c9a8', '#8f7b52'],
      ['#3a3550', '#c7b7d6', '#e6ddcb'],
    ]
    const [fond, trait, clair] = palettes[index % palettes.length]

    ctx.fillStyle = clair
    ctx.fillRect(0, 0, l, h)
    ctx.fillStyle = fond
    ctx.fillRect(l * 0.1, h * 0.12, l * 0.8, h * 0.5)
    ctx.fillStyle = trait
    ctx.beginPath()
    ctx.moveTo(l * 0.18, h * 0.78)
    ctx.lineTo(l * 0.55, h * 0.3)
    ctx.lineTo(l * 0.86, h * 0.82)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = fond
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(l * 0.5, h * 0.55, l * 0.22, 0, Math.PI * 2)
    ctx.stroke()
  })

/**
 * LE FOND DE SCÈNE — un blanc qui n'est pas un aplat.
 *
 * Le décor se tenait sous un ciel bleu, sur une pelouse ou sur de l'enrobé.
 * Il se tient désormais dans un VIDE BLANC, et la seule chose qui y porte une
 * couleur est le bien lui-même — c'est tout le parti du parcours : un objet
 * posé dans un espace sans lieu, comme une maquette d'architecte sur sa table.
 *
 * Un blanc uniforme ne tiendrait pas une seconde : sans matière, le fond n'a
 * plus de profondeur, le brouillard n'a rien à estomper et la scène se lit
 * comme un calque vide. Trois choses, toutes au ras du perceptible, lui donnent
 * sa matière :
 *
 *   — un dégradé d'un blanc à peine bleuté en haut vers un blanc à peine chaud
 *     en bas. C'est ce qui donne un HAUT et un BAS à un fond qui n'a pas
 *     d'horizon ;
 *   — deux ou trois voiles très larges, à peine plus sourds que le fond, qui
 *     empêchent le dégradé de se lire comme une rampe de couleur ;
 *   — un grain fin, celui d'un papier épais.
 *
 * Le fond de scène ne tourne pas avec la caméra : tout ce qui y aurait une
 * position lisible se verrait comme collé à l'objectif. D'où des voiles
 * horizontaux et rien d'autre.
 */
export const textureFondBlanc = () =>
  texture('fond-blanc', 512, 512, (ctx, l, h) => {
    const degrade = ctx.createLinearGradient(0, 0, 0, h)
    degrade.addColorStop(0, '#f4f5f7')
    degrade.addColorStop(0.46, '#fcfcfc')
    degrade.addColorStop(0.78, '#ffffff')
    degrade.addColorStop(1, '#f6f4f0')
    ctx.fillStyle = degrade
    ctx.fillRect(0, 0, l, h)

    ;[
      [0.34, 0.16, 0.022],
      [0.66, 0.12, 0.018],
    ].forEach(([position, epaisseur, alpha]) => {
      const voile = ctx.createLinearGradient(0, (position - epaisseur) * h, 0, (position + epaisseur) * h)
      voile.addColorStop(0, 'rgba(206,208,214,0)')
      voile.addColorStop(0.5, `rgba(206,208,214,${alpha})`)
      voile.addColorStop(1, 'rgba(206,208,214,0)')
      ctx.fillStyle = voile
      ctx.fillRect(0, (position - epaisseur) * h, l, epaisseur * 2 * h)
    })

    grain(ctx, l, h, 9000, 0.035)
  })

/**
 * LE SOL DU VIDE — le plan blanc sur lequel l'îlot est posé.
 *
 * Il n'a plus de nature : ce n'est ni un pré ni une chaussée, c'est le fond de
 * l'espace où le bien se construit, et il doit se confondre avec le fond de
 * scène à mesure qu'il s'en éloigne (c'est le brouillard qui s'en charge, voir
 * `DroneScene`). Ce qu'on lui demande, c'est uniquement de N'ÊTRE PAS UN APLAT :
 * de larges plages à peine sourdes, et le même grain que le fond.
 *
 * Sa teinte est neutre et très légèrement plus sourde que le fond : posé au
 * même blanc, il disparaîtrait entièrement et l'îlot flotterait dans rien.
 */
export const textureSolBlanc = () =>
  texture('sol-blanc', 256, 256, (ctx, l, h) => {
    ctx.fillStyle = '#f2f2f1'
    ctx.fillRect(0, 0, l, h)
    for (let i = 0; i < 80; i += 1) {
      const r = 20 + Math.random() * 58
      const v = 226 + Math.floor(Math.random() * 22)
      ctx.fillStyle = `rgba(${v},${v},${v + 2},0.2)`
      ctx.beginPath()
      ctx.ellipse(Math.random() * l, Math.random() * h, r, r * 0.74, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    grain(ctx, l, h, 4200, 0.04)
  }, { repeter: [24, 24] })

/**
 * LE DESSUS DE L'ÎLOT. La même matière que le sol, mais peinte plus serré : le
 * socle est ce qu'on voit de plus près de tout le décor, et le grain du sol,
 * étalé sur un disque de dix mètres, s'y lirait comme des taches.
 */
export const textureSocle = () =>
  texture('socle', 256, 256, (ctx, l, h) => {
    ctx.fillStyle = '#fbfaf8'
    ctx.fillRect(0, 0, l, h)
    for (let i = 0; i < 46; i += 1) {
      const r = 14 + Math.random() * 40
      ctx.fillStyle = `rgba(232,231,228,${0.18 + Math.random() * 0.14})`
      ctx.beginPath()
      ctx.ellipse(Math.random() * l, Math.random() * h, r, r * 0.8, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    grain(ctx, l, h, 5200, 0.055)
  }, { repeter: [6, 6] })

/**
 * L'OMBRE DE L'ÎLOT — ce qui creuse le vide autour du socle.
 *
 * Un disque surélevé posé sur un sol blanc, éclairé par un seul soleil, n'a
 * d'ombre que d'un côté : de l'autre, le socle et le sol se touchent sans que
 * rien ne dise qu'il y a un vide entre eux. Cette texture est l'ombre de
 * contact qui manque — un anneau sombre, très court, qui ceinture le socle et
 * s'éteint en quelques mètres. Peinte, et non calculée : c'est de
 * l'occultation ambiante, et aucune carte d'ombre ne la rendrait à ce prix.
 *
 * Le centre est TRANSPARENT jusqu'à la hauteur du socle : l'anneau ne commence
 * qu'au bord de l'îlot, là où le sol redevient visible. Elle se pose en fondu
 * ordinaire et non en multiplication : le sol qu'elle assombrit est blanc et
 * uni, et les deux rendent là exactement la même chose.
 */
export const textureCreux = () =>
  texture('creux', 256, 256, (ctx, l, h) => {
    const degrade = ctx.createRadialGradient(l / 2, h / 2, 0, l / 2, h / 2, l / 2)
    degrade.addColorStop(0, 'rgba(24,26,32,0)')
    degrade.addColorStop(0.53, 'rgba(24,26,32,0)')
    degrade.addColorStop(0.565, 'rgba(24,26,32,0.5)')
    degrade.addColorStop(0.63, 'rgba(24,26,32,0.2)')
    degrade.addColorStop(0.8, 'rgba(24,26,32,0.05)')
    degrade.addColorStop(1, 'rgba(24,26,32,0)')
    ctx.fillStyle = degrade
    ctx.fillRect(0, 0, l, h)
  })

/**
 * L'OMBRE DE CONTACT — la tache douce au pied d'un volume.
 *
 * À ne pas confondre avec `textureCreux`, qui est un ANNEAU : celui-là ceinture
 * l'îlot et laisse son centre parfaitement transparent, parce qu'il ne dit que
 * le bord. Celle-ci est une TACHE PLEINE, sombre au centre et éteinte au bord :
 * elle dit le pied d'un mur.
 *
 * Elle répond à ce qu'aucune carte d'ombre ne sait faire à ce prix — le
 * noircissement court là où le sol ne voit plus le ciel parce qu'un bâtiment le
 * lui cache. Le soleil, lui, porte une ombre franche et d'un seul côté ; de
 * l'autre, le volume et le sol se touchent sans que rien ne dise qu'ils se
 * touchent, et le bâtiment flotte.
 *
 * Le dégradé est volontairement LENT — il ne s'éteint qu'aux trois quarts du
 * rayon. Une tache qui se termine net se lit comme une flaque ; une tache qui
 * se perd se lit comme de l'ombre.
 */
export const textureOmbreDouce = () =>
  texture('ombre-douce', 256, 256, (ctx, l, h) => {
    const degrade = ctx.createRadialGradient(l / 2, h / 2, 0, l / 2, h / 2, l / 2)
    degrade.addColorStop(0, 'rgba(28,30,36,0.62)')
    degrade.addColorStop(0.3, 'rgba(28,30,36,0.46)')
    degrade.addColorStop(0.58, 'rgba(28,30,36,0.18)')
    degrade.addColorStop(0.8, 'rgba(28,30,36,0.045)')
    degrade.addColorStop(1, 'rgba(28,30,36,0)')
    ctx.fillStyle = degrade
    ctx.fillRect(0, 0, l, h)
  })

/** Halo doré de l'étape finale : un disque dégradé tourné vers la caméra. */
export const textureHalo = () =>
  texture('halo', 256, 256, (ctx, l, h) => {
    const degrade = ctx.createRadialGradient(l / 2, h / 2, 8, l / 2, h / 2, l / 2)
    degrade.addColorStop(0, 'rgba(214,170,104,0.95)')
    degrade.addColorStop(0.35, 'rgba(206,162,100,0.45)')
    degrade.addColorStop(0.7, 'rgba(201,161,107,0.14)')
    degrade.addColorStop(1, 'rgba(201,161,107,0)')
    ctx.fillStyle = degrade
    ctx.fillRect(0, 0, l, h)
  })

/* -------------------------------------------------------------------------- */
/*  Les cartes de rugosité et de relief, matière par matière                  */
/* -------------------------------------------------------------------------- */

/**
 * CRÉPI TALOCHÉ — l'enduit de la maison d'architecte.
 *
 * C'était un aplat : `color: 0xf2ece1`, et rien d'autre. Un mur enduit de dix
 * mètres y rendait exactement la même lumière en tout point, ce qu'aucun mur ne
 * fait. Trois cartes le remplacent — la couleur, le grain du relief, et la
 * rugosité qui change d'un passage de taloche à l'autre.
 */
export const textureCrepi = () =>
  texture('crepi', 256, 256, (ctx, l, h) => {
    ctx.fillStyle = '#f2ece1'
    ctx.fillRect(0, 0, l, h)
    // Les passes de taloche : de larges plages à peine plus sourdes, orientées
    // en diagonale comme le geste qui les a posées.
    for (let i = 0; i < 26; i += 1) {
      const t = 232 + Math.floor(Math.random() * 18)
      ctx.save()
      ctx.translate(Math.random() * l, Math.random() * h)
      ctx.rotate(Math.random() * Math.PI)
      ctx.fillStyle = `rgba(${t},${t - 5},${t - 15},0.4)`
      ctx.fillRect(-40, -9, 80, 18)
      ctx.restore()
    }
    grain(ctx, l, h, 5200, 0.07)
  }, { repeter: [2, 2] })

export const reliefCrepi = () =>
  relief('crepi', 256, 256, (ctx, l, h) => grainGris(ctx, l, h, 5200, 46), {
    force: 1.5,
    repeter: [2, 2],
  })

export const rugositeCrepi = () =>
  rugosite('crepi', 128, 128, (ctx, l, h) => grainGris(ctx, l, h, 1800, 22, 186), {
    repeter: [2, 2],
  })

/** Relief de la pierre de taille : les joints en creux, le nu en saillie. */
export const reliefPierre = () =>
  relief('pierre', 256, 256, (ctx, l, h) => {
    grainGris(ctx, l, h, 2600, 16, 168)
    const assise = h / 8
    ctx.strokeStyle = 'rgb(58,58,58)'
    ctx.lineWidth = 2.5
    for (let i = 0; i < 8; i += 1) {
      ctx.beginPath()
      ctx.moveTo(0, i * assise + assise - 1)
      ctx.lineTo(l, i * assise + assise - 1)
      ctx.stroke()
      const decalage = (i % 2) * (l / 6)
      for (let j = 0; j < 3; j += 1) {
        const x = decalage + (j * l) / 3
        ctx.beginPath()
        ctx.moveTo(x, i * assise)
        ctx.lineTo(x, i * assise + assise - 1)
        ctx.stroke()
      }
    }
  }, { force: 2.2 })

/** Rugosité de la pierre : le nu poli par le temps, les joints toujours mats. */
export const rugositePierre = () =>
  rugosite('pierre', 256, 256, (ctx, l, h) => {
    grainGris(ctx, l, h, 2200, 20, 192)
    const assise = h / 8
    ctx.strokeStyle = 'rgb(236,236,236)'
    ctx.lineWidth = 3
    for (let i = 0; i < 8; i += 1) {
      ctx.beginPath()
      ctx.moveTo(0, i * assise + assise - 1)
      ctx.lineTo(l, i * assise + assise - 1)
      ctx.stroke()
    }
  })

/** Relief du socle à bossage : le refend creusé autour de chaque pierre. */
export const reliefPierreSocle = () =>
  relief('pierre-socle', 256, 256, (ctx, l, h) => {
    ctx.fillStyle = 'rgb(46,46,46)'
    ctx.fillRect(0, 0, l, h)
    const assise = h / 5
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = 'rgb(196,196,196)'
      ctx.fillRect(6, i * assise + 6, l - 12, assise - 14)
    }
    grainGris(ctx, l, h, 0, 0, 0)
  }, { force: 2.4 })

/**
 * BARDAGE DE BOIS — le contrepoint vertical des façades contemporaines.
 *
 * C'est la matière qui manquait le plus : le bardage était une couleur brune,
 * et le bois est précisément ce qu'on ne peut pas dire avec une couleur. Il lui
 * faut son FIL — des veines irrégulières dans le sens de la lame —, le
 * RAINURAGE entre deux tasseaux, et une rugosité qui suit la veine : le bois
 * brille sur le fil et boit la lumière dans le contrefil.
 */
const lamesBois = (ctx, l, h, dessiner) => {
  const lame = l / 6
  for (let i = 0; i < 6; i += 1) dessiner(i * lame, lame)
}

export const textureBois = () =>
  texture('bois', 256, 256, (ctx, l, h) => {
    ctx.fillStyle = '#8a6438'
    ctx.fillRect(0, 0, l, h)
    lamesBois(ctx, l, h, (x, lame) => {
      const ton = 118 + Math.floor(Math.random() * 46)
      ctx.fillStyle = `rgb(${ton},${Math.round(ton * 0.68)},${Math.round(ton * 0.42)})`
      ctx.fillRect(x + 1.5, 0, lame - 3, h)
      // Le fil : des veines qui montent, jamais tout à fait droites.
      for (let v = 0; v < 9; v += 1) {
        ctx.strokeStyle = `rgba(${Math.round(ton * 0.55)},${Math.round(ton * 0.36)},${Math.round(ton * 0.2)},${0.14 + Math.random() * 0.2})`
        ctx.lineWidth = 0.7 + Math.random() * 1.4
        ctx.beginPath()
        const base = x + 3 + Math.random() * (lame - 6)
        ctx.moveTo(base, 0)
        for (let y = 0; y <= h; y += 16) {
          ctx.lineTo(base + Math.sin((y / h) * 6 + v) * 1.9, y)
        }
        ctx.stroke()
      }
      // La rainure d'ombre entre deux tasseaux.
      ctx.fillStyle = 'rgba(40,24,12,0.5)'
      ctx.fillRect(x, 0, 1.6, h)
    })
    grain(ctx, l, h, 1400, 0.05)
  }, { repeter: [1, 1] })

export const reliefBois = () =>
  relief('bois', 256, 256, (ctx, l, h) => {
    grainGris(ctx, l, h, 1200, 12, 176)
    lamesBois(ctx, l, h, (x, lame) => {
      // Le tasseau bombe légèrement, la rainure se creuse net.
      const degrade = ctx.createLinearGradient(x, 0, x + lame, 0)
      degrade.addColorStop(0, 'rgb(40,40,40)')
      degrade.addColorStop(0.12, 'rgb(180,180,180)')
      degrade.addColorStop(0.5, 'rgb(208,208,208)')
      degrade.addColorStop(0.88, 'rgb(180,180,180)')
      degrade.addColorStop(1, 'rgb(40,40,40)')
      ctx.fillStyle = degrade
      ctx.fillRect(x, 0, lame, h)
      for (let v = 0; v < 7; v += 1) {
        ctx.strokeStyle = 'rgba(120,120,120,0.5)'
        ctx.lineWidth = 1.1
        ctx.beginPath()
        const base = x + 3 + Math.random() * (lame - 6)
        ctx.moveTo(base, 0)
        for (let y = 0; y <= h; y += 16) ctx.lineTo(base + Math.sin((y / h) * 6 + v) * 1.9, y)
        ctx.stroke()
      }
    })
  }, { force: 2, repeter: [1, 1] })

export const rugositeBois = () =>
  rugosite('bois', 128, 128, (ctx, l, h) => {
    grainGris(ctx, l, h, 900, 18, 150)
    for (let v = 0; v < 26; v += 1) {
      ctx.strokeStyle = 'rgba(210,210,210,0.55)'
      ctx.lineWidth = 1 + Math.random() * 2
      ctx.beginPath()
      const base = Math.random() * l
      ctx.moveTo(base, 0)
      for (let y = 0; y <= h; y += 12) ctx.lineTo(base + Math.sin((y / h) * 5 + v) * 2.4, y)
      ctx.stroke()
    }
  }, { repeter: [1, 1] })

/**
 * ARDOISE — la couverture des maisons du Nord et de l'Est, et celle que la
 * villa portait en terre cuite.
 *
 * Le changement de matière est délibéré : une toiture de tuiles orangées sur une
 * maison d'enduit blanc et de menuiseries noires est un accord qu'on ne fait
 * pas. L'ardoise, elle, est exactement la couverture de cette architecture-là —
 * et elle a de surcroît ce que la tuile n'avait pas : un ÉCLAT. Une ardoise
 * mouillée de lumière n'est jamais grise, elle est bleue, et c'est cette
 * variation d'une écaille à l'autre qu'on peint ici.
 */
export const textureArdoise = () =>
  texture('ardoise', 256, 256, (ctx, l, h) => {
    ctx.fillStyle = '#3f464f'
    ctx.fillRect(0, 0, l, h)
    const rang = h / 10
    const large = l / 6
    for (let r = 0; r < 10; r += 1) {
      const decalage = (r % 2) * (large / 2)
      for (let c = -1; c < 7; c += 1) {
        const x = decalage + c * large
        const ton = 58 + Math.floor(Math.random() * 30)
        ctx.fillStyle = `rgb(${ton},${ton + 6},${ton + 15})`
        ctx.fillRect(x + 1, r * rang + 1, large - 2, rang * 1.65)
        ctx.strokeStyle = 'rgba(18,22,28,0.6)'
        ctx.lineWidth = 1.2
        ctx.strokeRect(x + 1, r * rang + 1, large - 2, rang * 1.65)
      }
    }
    grain(ctx, l, h, 2200, 0.09)
  }, { repeter: [1, 1] })

export const reliefArdoise = () =>
  relief('ardoise', 256, 256, (ctx, l, h) => {
    grainGris(ctx, l, h, 1200, 10, 150)
    const rang = h / 10
    const large = l / 6
    for (let r = 0; r < 10; r += 1) {
      const decalage = (r % 2) * (large / 2)
      for (let c = -1; c < 7; c += 1) {
        const x = decalage + c * large
        ctx.fillStyle = `rgb(${186 + Math.floor(Math.random() * 20)},190,190)`
        ctx.fillRect(x + 1, r * rang + 1, large - 2, rang * 1.65)
        ctx.strokeStyle = 'rgb(44,44,44)'
        ctx.lineWidth = 2
        ctx.strokeRect(x + 1, r * rang + 1, large - 2, rang * 1.65)
      }
    }
  }, { force: 1.9, repeter: [1, 1] })

export const rugositeArdoise = () =>
  rugosite('ardoise', 128, 128, (ctx, l, h) => grainGris(ctx, l, h, 1600, 34, 118), {
    repeter: [1, 1],
  })

/** Relief du zinc : les joints debout, en saillie franche. */
export const reliefZinc = () =>
  relief('zinc', 128, 128, (ctx, l, h) => {
    grainGris(ctx, l, h, 600, 8, 150)
    for (let x = 0; x < l; x += 16) {
      ctx.fillStyle = 'rgb(226,226,226)'
      ctx.fillRect(x, 0, 3, h)
      ctx.fillStyle = 'rgb(54,54,54)'
      ctx.fillRect(x + 3, 0, 2, h)
    }
  }, { force: 2.1, repeter: [1, 1] })

export const rugositeZinc = () =>
  rugosite('zinc', 128, 128, (ctx, l, h) => grainGris(ctx, l, h, 900, 26, 96), { repeter: [1, 1] })

/**
 * BÉTON LISSÉ — les dalles en débord de l'immeuble contemporain, et les
 * acrotères de la villa.
 *
 * C'est la matière la plus présente de la nouvelle façade : les grands plateaux
 * blancs qui filent d'un bout à l'autre du bâtiment. Il fallait donc qu'elle
 * cesse d'être un aplat gris — le béton banché garde la trace de son coffrage,
 * des joints de panneaux et des cônes d'écarteur, et c'est à cela qu'on le
 * reconnaît d'un mur peint.
 */
export const textureBeton = () =>
  texture('beton', 256, 256, (ctx, l, h) => {
    ctx.fillStyle = '#e6e2da'
    ctx.fillRect(0, 0, l, h)
    for (let i = 0; i < 20; i += 1) {
      const t = 222 + Math.floor(Math.random() * 20)
      ctx.fillStyle = `rgba(${t},${t - 2},${t - 8},0.45)`
      ctx.beginPath()
      ctx.ellipse(Math.random() * l, Math.random() * h, 26 + Math.random() * 54, 18 + Math.random() * 34, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    // Joints de banche, et les cônes d'écarteur qui les ponctuent.
    ctx.strokeStyle = 'rgba(160,156,148,0.4)'
    ctx.lineWidth = 1.2
    ;[0.5].forEach((position) => {
      ctx.beginPath()
      ctx.moveTo(0, position * h)
      ctx.lineTo(l, position * h)
      ctx.stroke()
    })
    ;[0.26, 0.74].forEach((y) => {
      ;[0.22, 0.78].forEach((x) => {
        ctx.fillStyle = 'rgba(158,154,146,0.45)'
        ctx.beginPath()
        ctx.arc(x * l, y * h, 2.6, 0, Math.PI * 2)
        ctx.fill()
      })
    })
    grain(ctx, l, h, 3400, 0.05)
  }, { repeter: [1, 1] })

export const reliefBeton = () =>
  relief('beton', 256, 256, (ctx, l, h) => {
    grainGris(ctx, l, h, 3000, 18, 150)
    ctx.strokeStyle = 'rgb(82,82,82)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, h / 2)
    ctx.lineTo(l, h / 2)
    ctx.stroke()
    ;[0.26, 0.74].forEach((y) => {
      ;[0.22, 0.78].forEach((x) => {
        ctx.fillStyle = 'rgb(70,70,70)'
        ctx.beginPath()
        ctx.arc(x * l, y * h, 3, 0, Math.PI * 2)
        ctx.fill()
      })
    })
  }, { force: 1.2, repeter: [1, 1] })

export const rugositeBeton = () =>
  rugosite('beton', 128, 128, (ctx, l, h) => grainGris(ctx, l, h, 1600, 20, 172), {
    repeter: [1, 1],
  })

/** Relief du dallage : le joint creux entre deux grands formats. */
export const reliefDallage = () =>
  relief('dallage', 256, 256, (ctx, l, h) => {
    grainGris(ctx, l, h, 1400, 12, 178)
    const dalle = 64
    ctx.fillStyle = 'rgb(52,52,52)'
    for (let y = 0; y < h; y += dalle) ctx.fillRect(0, y, l, 3)
    for (let x = 0; x < l; x += dalle) ctx.fillRect(x, 0, 3, h)
  }, { force: 2, repeter: [1, 1] })

export const rugositeDallage = () =>
  rugosite('dallage', 128, 128, (ctx, l, h) => grainGris(ctx, l, h, 1400, 24, 178), {
    repeter: [1, 1],
  })

/** Relief du gazon : la touffe, pas le brin. */
export const reliefGazon = () =>
  relief('gazon', 128, 128, (ctx, l, h) => grainGris(ctx, l, h, 3400, 60, 128), {
    force: 1.1,
    repeter: [4, 4],
  })

/**
 * RUGOSITÉ DU VERRE — ce qui empêche une baie d'être un miroir parfait.
 *
 * Une vitre n'est jamais propre sur toute sa surface : il y a des traînées de
 * lavage, un voile de poussière en bas de dormant, la marque d'une main. Sans
 * elles, le verre rend un reflet trop net et se lit comme du métal poli.
 */
export const rugositeVerre = () =>
  rugosite('verre', 128, 128, (ctx, l, h) => {
    grainGris(ctx, l, h, 300, 6, 20)
    for (let i = 0; i < 14; i += 1) {
      ctx.save()
      ctx.translate(Math.random() * l, Math.random() * h)
      ctx.rotate(Math.random() * Math.PI)
      ctx.fillStyle = `rgba(150,150,150,${0.05 + Math.random() * 0.12})`
      ctx.fillRect(-30, -2.5, 60, 5)
      ctx.restore()
    }
    const bas = ctx.createLinearGradient(0, h * 0.72, 0, h)
    bas.addColorStop(0, 'rgba(120,120,120,0)')
    bas.addColorStop(1, 'rgba(120,120,120,0.35)')
    ctx.fillStyle = bas
    ctx.fillRect(0, h * 0.72, l, h * 0.28)
  })

/**
 * CARRELAGE DU BASSIN — le fond qu'on doit deviner à travers l'eau.
 *
 * Une piscine sans fond visible n'est pas une piscine : c'est une surface
 * bleue. Le fond est donc carrelé de petits formats bleu-vert, avec les joints
 * blancs qui les tiennent — ce sont eux qui donnent l'échelle, et c'est à leur
 * déformation sous l'eau qu'on lit qu'il y a de l'eau.
 */
export const textureCarrelage = () =>
  texture('carrelage', 256, 256, (ctx, l, h) => {
    ctx.fillStyle = '#dfe9e4'
    ctx.fillRect(0, 0, l, h)
    const carreau = l / 12
    for (let y = 0; y < 12; y += 1) {
      for (let x = 0; x < 12; x += 1) {
        const t = Math.random()
        const r = 96 + Math.floor(t * 40)
        ctx.fillStyle = `rgb(${r},${r + 62},${r + 68})`
        ctx.fillRect(x * carreau + 1.2, y * carreau + 1.2, carreau - 2.4, carreau - 2.4)
      }
    }
    grain(ctx, l, h, 900, 0.05)
  }, { repeter: [3, 2] })

export const reliefCarrelage = () =>
  relief('carrelage', 256, 256, (ctx, l, h) => {
    ctx.fillStyle = 'rgb(56,56,56)'
    ctx.fillRect(0, 0, l, h)
    const carreau = l / 12
    ctx.fillStyle = 'rgb(198,198,198)'
    for (let y = 0; y < 12; y += 1) {
      for (let x = 0; x < 12; x += 1) {
        ctx.fillRect(x * carreau + 1.6, y * carreau + 1.6, carreau - 3.2, carreau - 3.2)
      }
    }
  }, { force: 1.8, repeter: [3, 2] })

/**
 * L'ONDE — la carte de relief qui fait bouger l'eau.
 *
 * C'est la seule texture du décor qui SERVE EN MOUVEMENT : la surface du bassin
 * la fait glisser lentement dans deux directions à la fois, et c'est le
 * décalage entre les deux passages qui donne l'ondulation (voir `eauPiscine` et
 * `onduler`). Une seule passe glisserait en bloc, comme un tapis qu'on tire.
 *
 * Le motif est une somme de rides longues et molles — pas des vagues : une
 * piscine par temps calme n'a que la ride d'un souffle d'air.
 */
export const reliefOnde = () =>
  relief('onde', 256, 256, (ctx, l, h) => {
    const image = ctx.createImageData(l, h)
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < l; x += 1) {
        const u = (x / l) * Math.PI * 2
        const v = (y / h) * Math.PI * 2
        const onde =
          Math.sin(u * 3 + Math.sin(v * 2) * 1.1) * 0.45 +
          Math.sin(v * 4 + Math.sin(u * 3) * 0.8) * 0.33 +
          Math.sin((u + v) * 5) * 0.22
        const t = Math.round(128 + onde * 60)
        const i = (y * l + x) * 4
        image.data[i] = t
        image.data[i + 1] = t
        image.data[i + 2] = t
        image.data[i + 3] = 255
      }
    }
    ctx.putImageData(image, 0, 0)
  }, { force: 1.15, repeter: [3, 3] })

/**
 * FEUILLAGE DÉCOUPÉ — la touffe de feuilles qu'on colle sur un plan.
 *
 * Les arbres étaient des icosaèdres : des cailloux verts, et c'est ce qui
 * trahissait le plus la scène. Un vrai feuillage est POREUX — on voit le ciel
 * au travers, la lumière y entre, la silhouette est dentelée. Aucune géométrie
 * raisonnable ne rend ça ; une texture à découpe, oui.
 *
 * Cette carte porte donc une touffe de feuilles sur fond TRANSPARENT. Collée
 * sur trois ou quatre plans croisés, elle donne un houppier qui a une
 * silhouette et qui laisse passer le jour, pour le prix de douze triangles —
 * là où une sphère détaillée en coûterait mille.
 */
export const textureFeuillage = (variante = 0) =>
  texture(`feuillage-${variante}`, 256, 256, (ctx, l, h) => {
    ctx.clearRect(0, 0, l, h)
    const teintes = [
      ['#4f7444', '#6b9150', '#37552f'],
      ['#587a46', '#82a05c', '#3d5c33'],
    ][variante % 2]

    // Une feuille : une ellipse inclinée, nervure claire au milieu.
    const feuille = (x, y, taille, angle, couleur) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle)
      ctx.fillStyle = couleur
      ctx.beginPath()
      ctx.ellipse(0, 0, taille, taille * 0.42, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(-taille * 0.8, 0)
      ctx.lineTo(taille * 0.8, 0)
      ctx.stroke()
      ctx.restore()
    }

    // Trois couches, de la plus sombre au fond à la plus claire au-dessus :
    // c'est la profondeur d'un houppier, et elle ne coûte rien à peindre.
    ;[
      [teintes[2], 170, 16],
      [teintes[0], 150, 13],
      [teintes[1], 120, 10],
    ].forEach(([couleur, rayon, taille]) => {
      for (let i = 0; i < 110; i += 1) {
        const angle = Math.random() * Math.PI * 2
        const distance = Math.sqrt(Math.random()) * rayon
        const x = l / 2 + Math.cos(angle) * distance
        const y = h / 2 + Math.sin(angle) * distance * 0.88
        feuille(x, y, taille * (0.6 + Math.random() * 0.7), Math.random() * Math.PI, couleur)
      }
    })
  })

/** Écorce : le fil vertical d'un tronc, sans lequel c'est un tuyau. */
export const textureEcorce = () =>
  texture('ecorce', 128, 256, (ctx, l, h) => {
    ctx.fillStyle = '#5b4632'
    ctx.fillRect(0, 0, l, h)
    for (let i = 0; i < 90; i += 1) {
      const ton = 60 + Math.floor(Math.random() * 44)
      ctx.strokeStyle = `rgba(${ton},${Math.round(ton * 0.8)},${Math.round(ton * 0.58)},0.75)`
      ctx.lineWidth = 1 + Math.random() * 3.4
      ctx.beginPath()
      const base = Math.random() * l
      ctx.moveTo(base, 0)
      for (let y = 0; y <= h; y += 22) ctx.lineTo(base + (Math.random() - 0.5) * 7, y)
      ctx.stroke()
    }
    grain(ctx, l, h, 1400, 0.1)
  }, { repeter: [1, 1] })

/** Margelle : pierre reconstituée sciée, à grain fin et joints serrés. */
export const textureMargelle = () =>
  texture('margelle', 256, 128, (ctx, l, h) => {
    ctx.fillStyle = '#e9e3d6'
    ctx.fillRect(0, 0, l, h)
    const pas = l / 4
    for (let i = 0; i < 4; i += 1) {
      const ton = 224 + Math.floor(Math.random() * 16)
      ctx.fillStyle = `rgb(${ton},${ton - 4},${ton - 14})`
      ctx.fillRect(i * pas + 1.5, 1.5, pas - 3, h - 3)
    }
    grain(ctx, l, h, 1800, 0.07)
  }, { repeter: [4, 1] })

export const reliefMargelle = () =>
  relief('margelle', 256, 128, (ctx, l, h) => {
    grainGris(ctx, l, h, 1400, 14, 180)
    ctx.fillStyle = 'rgb(56,56,56)'
    const pas = l / 4
    for (let i = 0; i < 4; i += 1) ctx.fillRect(i * pas, 0, 2.5, h)
  }, { force: 1.7, repeter: [4, 1] })

/* -------------------------------------------------------------------------- */
/*  Matières                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * LE CRAN DE QUALITÉ, lu par les matières qui ont de quoi le dépenser.
 *
 * Une seule matière du décor coûte vraiment cher — l'eau du bassin, qui demande
 * une passe de transmission —, et une seule configuration ne peut pas se le
 * permettre : le téléphone. Plutôt que de faire descendre un drapeau à travers
 * la villa, l'immeuble et le kit pour qu'il arrive jusqu'à une boîte de deux
 * mètres carrés, le décor le pose ICI, une fois, avant de construire quoi que
 * ce soit (voir `DroneScene`).
 */
const qualite = { transmission: true }

/** Posé par le décor au montage, avant toute construction. */
export function reglerQualite(options) {
  Object.assign(qualite, options)
}

const std = (options) => new THREE.MeshStandardMaterial(options)

/**
 * MATIÈRE À CARTES — le raccourci qui remplace un aplat par une surface.
 *
 * `roughness` vaut 1 dès qu'une carte de rugosité est donnée, et ce n'est pas
 * un détail : three MULTIPLIE la valeur scalaire par le canal vert de la carte.
 * La laisser à 0,7 diviserait toute la carte par trois, et la matière
 * redeviendrait uniformément brillante — soit exactement ce qu'on venait
 * d'éviter.
 */
const matiere = ({ rugositeMap, reliefMap, relief: profondeur = 0.6, ...options }) =>
  std({
    ...options,
    ...(rugositeMap ? { roughnessMap: rugositeMap, roughness: 1 } : null),
    ...(reliefMap
      ? { normalMap: reliefMap, normalScale: new THREE.Vector2(profondeur, profondeur) }
      : null),
  })

/* --- La villa d'architecte ------------------------------------------------ */

/** Enduit blanc cassé : la matière dominante de la maison d'architecte. */
export const enduitClair = () =>
  matiere({
    name: 'enduit',
    map: textureCrepi(),
    rugositeMap: rugositeCrepi(),
    reliefMap: reliefCrepi(),
    relief: 0.55,
    color: 0xffffff,
    metalness: 0.02,
  })
/** Le même, en retrait : volumes secondaires, joues, tableaux de baie. */
export const enduitOmbre = () =>
  matiere({
    name: 'enduit-ombre',
    map: textureCrepi(),
    rugositeMap: rugositeCrepi(),
    reliefMap: reliefCrepi(),
    relief: 0.55,
    color: 0xded6c8,
    metalness: 0.02,
  })
/** Béton lissé des dalles, terrasses et seuils. */
export const betonLisse = () =>
  matiere({
    name: 'beton-lisse',
    map: textureBeton(),
    rugositeMap: rugositeBeton(),
    reliefMap: reliefBeton(),
    relief: 0.4,
    color: 0xf2eee7,
    metalness: 0.02,
  })
/** Béton des acrotères et couvertines, plus sombre que la dalle. */
export const betonSombre = () =>
  matiere({
    name: 'beton',
    map: textureBeton(),
    rugositeMap: rugositeBeton(),
    reliefMap: reliefBeton(),
    relief: 0.45,
    color: 0x9b968d,
    metalness: 0.05,
  })
/**
 * ARDOISE de la couverture. Elle remplace la terre cuite des grandes villas,
 * et c'est un accord qu'on remet d'aplomb : un toit orangé sur un enduit blanc
 * et des menuiseries noires jurait, une ardoise bleutée les tient ensemble.
 */
export const ardoise = () =>
  matiere({
    name: 'ardoise',
    map: textureArdoise(),
    rugositeMap: rugositeArdoise(),
    reliefMap: reliefArdoise(),
    relief: 0.75,
    color: 0xffffff,
    metalness: 0.08,
  })
/** Bardage de tasseaux, sur les volumes hauts et les façades contemporaines. */
export const boisBardage = () =>
  matiere({
    name: 'bois',
    map: textureBois(),
    rugositeMap: rugositeBois(),
    reliefMap: reliefBois(),
    relief: 0.8,
    color: 0x8d6b44,
    metalness: 0.02,
  })

/* --- L'immeuble ----------------------------------------------------------- */

export const pierreTaille = () =>
  matiere({
    name: 'pierre',
    map: texturePierre(),
    rugositeMap: rugositePierre(),
    reliefMap: reliefPierre(),
    relief: 0.7,
    color: 0xf3ecdd,
    metalness: 0.02,
  })
export const pierreSocle = () =>
  matiere({
    name: 'pierre-socle',
    map: texturePierreSocle(),
    rugositeMap: rugositePierre(),
    reliefMap: reliefPierreSocle(),
    relief: 0.8,
    color: 0xe8e0cf,
    metalness: 0.02,
  })
/** Pierre moulurée : corniches, bandeaux, appuis, clés. Sans texture — ces
    pièces sont trop fines pour qu'un appareil s'y lise, et il y clignoterait. */
export const pierreMoulure = () =>
  matiere({
    name: 'moulure',
    rugositeMap: rugositeBeton(),
    color: 0xece2cd,
    metalness: 0.02,
  })
export const zincToiture = () =>
  matiere({
    name: 'zinc',
    map: textureZinc(),
    rugositeMap: rugositeZinc(),
    reliefMap: reliefZinc(),
    relief: 0.7,
    color: 0xaeb6bf,
    metalness: 0.32,
  })
/** Terre cuite des souches de cheminée. */
export const terreCuite = () => std({ color: 0xb4764f, roughness: 0.88, metalness: 0.02 })

/* --- Menuiseries et ferronneries ----------------------------------------- */

/** Aluminium noir mat des menuiseries contemporaines. */
export const aluNoir = () =>
  std({ name: 'menuiserie', color: 0x22242a, roughness: 0.38, metalness: 0.66 })
/** Fer forgé des garde-corps, balcons et rampes. */
export const ferForge = () =>
  std({ name: 'fer', color: 0x1e2024, roughness: 0.42, metalness: 0.62 })
/** Laiton poli : marquise, barres de tapis, quincaillerie. */
export const laiton = () =>
  std({ name: 'laiton', color: 0xc9a16b, roughness: 0.34, metalness: 0.72 })
/** Bois vernis des portes cochères et des mains courantes. */
export const boisVerni = () =>
  std({ name: 'bois-verni', color: 0x6b3f22, roughness: 0.42, metalness: 0.08 })
/** Bois clair des marches, des platelages et du mobilier. */
export const boisClair = () =>
  matiere({
    name: 'bois-clair',
    map: textureBois(),
    rugositeMap: rugositeBois(),
    reliefMap: reliefBois(),
    relief: 0.5,
    color: 0xd6a878,
    metalness: 0.04,
  })
/** Volet de bois peint, replié en tableau de fenêtre. */
export const volet = () => std({ name: 'volet', color: 0x8d9a8c, roughness: 0.78, metalness: 0.03 })

/**
 * Vitrage clair : bleuté le jour, ambré une fois le logement éclairé.
 *
 * Les deux vitrages portent un `name` — c'est à lui que la scène les
 * reconnaît quand le soir tombe. Le verre d'un garde-corps est aussi
 * transparent et aussi émissif par défaut qu'une baie ; rien d'autre qu'un nom
 * ne dit lequel des deux doit s'allumer.
 *
 * `envMapIntensity` est monté à 1,6 : un verre ne tire presque rien de la
 * lumière directe, il ne montre QUE ce qu'il reflète. Sous l'environnement de
 * la scène, c'est ce réglage-là — et non la couleur — qui fait la différence
 * entre une vitre et un panneau bleu.
 */
export const vitrage = () =>
  matiere({
    name: 'vitrage',
    color: 0x8fb4c6,
    emissive: 0x000000,
    emissiveIntensity: 0,
    rugositeMap: rugositeVerre(),
    metalness: 0.3,
    envMapIntensity: 1.6,
    transparent: true,
    opacity: 0.84,
  })

/** Mur-rideau du séjour : plus sombre, plus réfléchissant qu'une fenêtre. */
export const murVitre = () =>
  matiere({
    name: 'vitrage',
    color: 0x18262d,
    emissive: 0x000000,
    emissiveIntensity: 0,
    rugositeMap: rugositeVerre(),
    metalness: 0.4,
    envMapIntensity: 1.9,
    transparent: true,
    opacity: 0.76,
  })

/**
 * VERRE DE CIRCULATION — le mur-rideau de la cage d'escalier.
 *
 * C'est le seul vitrage du décor qu'on doit VRAIMENT traverser des yeux. Les
 * baies de logement sont opaques à 84 % — et il le faut, sinon on verrait
 * l'envers de la façade au lieu d'un appartement. Une cage de circulation, au
 * contraire, n'existe à la façade que parce qu'elle montre ce qu'il y a
 * dedans : l'escalier, les paliers, et la cabine d'ascenseur qui monte.
 *
 * À l'opacité des autres, on ne voyait rien du tout : la cage rendait un pan
 * de verre blanc, et l'ascenseur déclaré à l'affinage restait invisible
 * derrière. À un quart, on voit au travers, et le mur-rideau garde tout de
 * même son reflet — c'est l'environnement qui le lui donne, pas son opacité.
 */
export const verreCirculation = () =>
  matiere({
    name: 'vitrage',
    color: 0xd6e6ee,
    emissive: 0x000000,
    emissiveIntensity: 0,
    rugositeMap: rugositeVerre(),
    metalness: 0.2,
    envMapIntensity: 1.7,
    transparent: true,
    opacity: 0.24,
  })

/** Verre de garde-corps : un voile, pas une vitre. */
export const verreVoile = () =>
  std({
    name: 'verre-garde-corps',
    color: 0xcadde6,
    roughness: 0.05,
    metalness: 0.2,
    envMapIntensity: 1.7,
    transparent: true,
    // MONTÉE DE 0,28 À 0,4. À trois dixièmes, la lame de verre ne se voyait
    // pas du tout : les balcons se réduisaient à leur main courante, une barre
    // noire flottant au bord d'une dalle. À quatre, le verre prend la lumière
    // du ciel et le garde-corps redevient un garde-corps — sans jamais masquer
    // ce qu'il y a derrière, ce qui est tout l'intérêt d'un garde-corps de
    // verre.
    opacity: 0.4,
  })

/* --- Abords --------------------------------------------------------------- */

export const gazon = () =>
  matiere({
    name: 'gazon',
    map: textureGazon(),
    reliefMap: reliefGazon(),
    relief: 0.45,
    color: 0xdff0cc,
    roughness: 0.95,
  })
export const dallage = () =>
  matiere({
    name: 'dallage',
    map: textureDallage(),
    rugositeMap: rugositeDallage(),
    reliefMap: reliefDallage(),
    relief: 0.55,
    color: 0xf4efe4,
  })
export const gravier = () =>
  matiere({
    name: 'gravier',
    map: textureGravier(),
    rugositeMap: rugositeCrepi(),
    reliefMap: reliefGravier(),
    relief: 0.8,
    color: 0xded7c9,
  })
export const feuillage = () => std({ color: 0x4f7444, roughness: 0.9 })
export const feuillageClair = () => std({ color: 0x7d9b57, roughness: 0.92 })
export const tronc = () =>
  matiere({
    name: 'tronc',
    map: textureEcorce(),
    reliefMap: reliefBois(),
    relief: 0.5,
    color: 0x9c8468,
    roughness: 0.94,
  })

/**
 * LE HOUPPIER — une touffe de feuilles découpée, posée sur un plan.
 *
 * `alphaTest` plutôt que `transparent` : une feuille est opaque ou elle n'est
 * pas là, il n'y a rien à fondre. C'est aussi ce qui permet au feuillage de
 * PORTER SON OMBRE en gardant ses découpes — une matière transparente projette
 * l'ombre de son rectangle entier, une matière à seuil celle de ses feuilles.
 *
 * `side: DoubleSide` parce qu'un plan vu de dos doit encore montrer des
 * feuilles, et l'ombre est calculée des deux côtés pour la même raison.
 */
export const houppier = (variante = 0) =>
  std({
    name: 'houppier',
    map: textureFeuillage(variante),
    alphaTest: 0.42,
    side: THREE.DoubleSide,
    roughness: 0.88,
    metalness: 0,
  })

/**
 * L'EAU DU BASSIN — la matière la plus travaillée du décor, et celle qui se
 * voyait le plus quand elle ne l'était pas.
 *
 * C'était une boîte bleue à 92 % d'opacité, avec une texture de caustiques
 * peinte dessus. On ne voyait donc ni le fond, ni l'épaisseur, ni le
 * mouvement : trois choses sans lesquelles il n'y a pas d'eau.
 *
 *   ELLE EST TRANSPARENTE, VRAIMENT (`transmission`), ce qui laisse voir le
 *   carrelage du fond à travers. Une simple opacité mélange une couleur bleue
 *   à ce qu'il y a derrière ; la transmission fait passer la lumière au
 *   travers, et l'`ior` de 1,33 — celui de l'eau — la dévie au passage. C'est
 *   cette déviation qu'on appelle la réfraction, et c'est elle qui tord les
 *   joints du carrelage.
 *
 *   ELLE BOUGE. Son relief est l'onde (voir `reliefOnde`), et la surface la
 *   fait glisser dans deux directions à la fois (voir `onduler`).
 *
 *   ELLE PREND LE SOLEIL. Rugosité très basse et environnement appuyé : c'est
 *   ce qui donne le point de lumière qui court sur l'eau quand la caméra
 *   respire.
 *
 * `MeshPhysicalMaterial` est plus cher qu'une matière standard — il ajoute une
 * passe de transmission. Il n'y en a qu'UNE dans toute la scène, sur un objet
 * de deux mètres carrés à l'écran : c'est exactement le genre de dépense qui
 * se justifie, et elle est retirée sur les configurations modestes (voir
 * `DroneScene`).
 */
export const eauPiscine = ({ transmission = qualite.transmission } = {}) => {
  const onde = reliefOnde().clone()
  onde.needsUpdate = true
  const secondeOnde = reliefOnde().clone()
  secondeOnde.needsUpdate = true
  secondeOnde.repeat.set(2, 2)

  const matiereEau = transmission
    ? new THREE.MeshPhysicalMaterial({
        name: 'eau',
        color: 0x9fd8e8,
        roughness: 0.04,
        metalness: 0,
        transmission: 0.92,
        thickness: 0.6,
        ior: 1.33,
        attenuationColor: new THREE.Color(0x2f93b4),
        attenuationDistance: 0.9,
        envMapIntensity: 1.8,
        normalMap: onde,
        normalScale: new THREE.Vector2(0.24, 0.24),
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        clearcoatNormalMap: secondeOnde,
      })
    : std({
        name: 'eau',
        map: textureEau(),
        color: 0xdff2f8,
        roughness: 0.06,
        metalness: 0.28,
        envMapIntensity: 1.5,
        normalMap: onde,
        normalScale: new THREE.Vector2(0.3, 0.3),
        transparent: true,
        opacity: 0.9,
      })

  matiereEau.userData.ondes = [onde, secondeOnde]
  return matiereEau
}

/**
 * FAIT COURIR L'ONDE. Les deux passes glissent à des vitesses et dans des
 * directions différentes : c'est leur battement qui se lit comme une ride, là
 * où une seule passe se lirait comme un tapis qu'on tire.
 */
export function onduler(matiereEau, secondes) {
  const ondes = matiereEau?.userData?.ondes
  if (!ondes) return
  ondes[0].offset.set(secondes * 0.016, secondes * 0.026)
  if (ondes[1]) ondes[1].offset.set(-secondes * 0.021, secondes * 0.011)
}

/** Carrelage du fond de bassin — ce qu'on doit deviner à travers l'eau. */
export const carrelageBassin = () =>
  matiere({
    name: 'carrelage',
    map: textureCarrelage(),
    reliefMap: reliefCarrelage(),
    relief: 0.5,
    color: 0xffffff,
    roughness: 0.22,
    metalness: 0.04,
    envMapIntensity: 0.8,
  })

export const margelle = () =>
  matiere({
    name: 'margelle',
    map: textureMargelle(),
    rugositeMap: rugositeDallage(),
    reliefMap: reliefMargelle(),
    relief: 0.45,
    color: 0xf1ebdf,
  })
export const panneauSolaire = () =>
  std({ map: texturePanneau(), color: 0xffffff, roughness: 0.22, metalness: 0.55 })

/* --- Intérieur ------------------------------------------------------------ */

export const parquet = () => std({ map: textureParquet(), color: 0xf0e2cd, roughness: 0.55 })
export const tapisEscalier = () => std({ map: textureTapis(), color: 0xffffff, roughness: 0.9 })
export const tapisSalon = () => std({ map: textureTapisSalon(), color: 0xffffff, roughness: 0.92 })
/** Blanc cassé des murs et des moulures : la teinte des cages d'escalier. */
export const platre = () => std({ color: 0xf1e9db, roughness: 0.88, metalness: 0 })
export const platreOmbre = () => std({ color: 0xe0d6c5, roughness: 0.9, metalness: 0 })
export const tissuClair = () => std({ color: 0xe6e1d7, roughness: 0.92 })
export const tissuBleu = () => std({ color: 0x27596b, roughness: 0.88 })
export const marbre = () => std({ color: 0xece9e3, roughness: 0.28, metalness: 0.1 })
export const ecranNoir = () =>
  std({ color: 0x0d0f13, roughness: 0.2, metalness: 0.4, emissive: 0x11212e, emissiveIntensity: 0.4 })
export const toile = (index) =>
  std({ map: textureToile(index), color: 0xffffff, roughness: 0.86 })

/* --- Les oiseaux ---------------------------------------------------------- */

/**
 * PLUMAGES. Deux espèces, et deux seulement : le pigeon de ville pour
 * l'immeuble, la colombe blanche pour la maison. Ce n'est pas un détail
 * ornithologique — c'est ce qui dit où l'on est. Un pigeon au-dessus d'une
 * villa d'architecte serait aussi faux qu'une colombe boulevard Voltaire.
 */
export const plumagePigeon = () =>
  std({ name: 'plumage', color: 0x6d7480, roughness: 0.86, metalness: 0.06 })
export const plumageColombe = () =>
  std({ name: 'plumage', color: 0xf4f2ec, roughness: 0.82, metalness: 0.02 })

/* -------------------------------------------------------------------------- */
/*  Le standing                                                               */
/* -------------------------------------------------------------------------- */

/**
 * LE STANDING SE VOIT SUR LA MATIÈRE, pas seulement sur le mobilier.
 *
 * Cocher « Prestige » posait jusqu'ici des ouvrages en plus — un parement de
 * pierre, des bornes d'allée, un tapis de seuil. C'est juste, mais ce n'est pas
 * ce qui distingue d'abord un bien haut de gamme d'un bien correct : ce sont
 * ses MATÉRIAUX. Un enduit plus fin, une pierre ravalée, un zinc qui reprend
 * la lumière, une menuiserie qui a l'éclat de l'alu laqué plutôt que celui de
 * la peinture.
 *
 * Cette fonction relève les matières d'un ouvrage par leur nom et rend la
 * fonction qui les accorde au rang déclaré, de 0 (à rafraîchir) à 1 (prestige).
 *
 * **L'ÉTAT ACTUEL DE LA SCÈNE EST LE RANG 0.** Rien ne se dégrade jamais en
 * dessous de ce qui a été dessiné : « À rafraîchir » rend exactement la maison
 * qu'on voyait avant cet écran, et « Standard » — le choix par défaut — est
 * déjà un quart du chemin vers la finition la plus soignée. Le bien du vendeur
 * qui ne coche rien reste un beau bien.
 *
 * Elle ne travaille QUE sur la demande : un rang inchangé d'une image à
 * l'autre ne déclenche aucune écriture, et c'est ce qui permet de l'appeler à
 * chaque image sans y penser.
 */
export function accorderStanding(racine, table) {
  const socles = []

  racine.traverse((objet) => {
    if (!objet.isMesh) return
    const liste = Array.isArray(objet.material) ? objet.material : [objet.material]
    liste.forEach((matiere) => {
      const cible = matiere && table[matiere.name]
      if (!cible) return
      socles.push({
        matiere,
        couleur: matiere.color.clone(),
        roughness: matiere.roughness,
        metalness: matiere.metalness,
        versCouleur: cible.couleur !== undefined ? new THREE.Color(cible.couleur) : null,
        versRoughness: cible.roughness,
        versMetalness: cible.metalness,
      })
    })
  })

  let dernier = -1

  return (rang) => {
    const t = Math.max(0, Math.min(1, Number(rang) || 0))
    if (Math.abs(t - dernier) < 0.002) return
    dernier = t

    socles.forEach((socle) => {
      if (socle.versCouleur) socle.matiere.color.copy(socle.couleur).lerp(socle.versCouleur, t)
      if (socle.versRoughness !== undefined) {
        socle.matiere.roughness = socle.roughness + (socle.versRoughness - socle.roughness) * t
      }
      if (socle.versMetalness !== undefined) {
        socle.matiere.metalness = socle.metalness + (socle.versMetalness - socle.metalness) * t
      }
    })
  }
}

/* -------------------------------------------------------------------------- */
/*  Utilitaires                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Vide un groupe et rend sa mémoire. Les textures, partagées et mises en
 * cache, ne sont volontairement PAS libérées ici : elles survivent aux
 * reconstructions de bâtiment et ne sont rendues qu'au démontage de la scène
 * (voir `libererTextures`).
 */
export function viderGroupe(groupe) {
  groupe.traverse((objet) => {
    if (!objet.isMesh && !objet.isLine && !objet.isPoints) return
    objet.geometry?.dispose()
    const matieres = Array.isArray(objet.material) ? objet.material : [objet.material]
    // `dispose()` d'une matière ne touche pas à sa `map` : les textures du
    // cache, partagées par toutes les pièces du décor, restent donc intactes.
    matieres.forEach((matiere) => {
      // Les ondes de l'eau sont des CLONES — la seule texture du décor qui ne
      // vienne pas du cache partagé, parce qu'elle glisse et qu'une texture qui
      // glisse ne peut pas être partagée. Elles se rendent donc avec la matière
      // qui les portait ; les autres survivent à la reconstruction.
      matiere?.userData?.ondes?.forEach((onde) => onde.dispose())
      matiere?.dispose()
    })
  })
  groupe.clear()
}

/** Rend une matière transparente et pilotable en opacité. */
export function pilotable(matiere) {
  matiere.transparent = true
  return matiere
}
