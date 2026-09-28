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

/**
 * FINESSE DU FILTRAGE — relevée sur la carte graphique, pas devinée.
 *
 * Une texture vue en biais — un trottoir, un platelage, un sol qui fuit vers
 * l'horizon — se délave dès que l'angle se ferme, et c'est le filtrage
 * anisotrope qui l'en empêche. La valeur tenue ici est un DÉFAUT PRUDENT : le
 * décor la relève à l'ouverture de la scène, où le contexte WebGL est
 * disponible (voir `reglerAnisotropie`), et les textures déjà peintes la
 * reçoivent rétroactivement.
 */
let anisotropieMax = 4

/**
 * Accorde le filtrage sur ce que la machine sait faire. Appelé une fois, au
 * montage de la scène — c'est le seul endroit d'où le renderer est visible.
 */
export function reglerAnisotropie(valeur) {
  const n = Math.max(1, Math.min(16, Math.round(Number(valeur) || 1)))
  if (n === anisotropieMax) return
  anisotropieMax = n
  cache.forEach((map) => {
    map.anisotropy = n
    map.needsUpdate = true
  })
}

/** Peint une texture une seule fois et la garde ; `libererTextures` la rend. */
function texture(nom, largeur, hauteur, peindre, { repeter = null } = {}) {
  const existante = cache.get(nom)
  if (existante) return existante

  const canvas = document.createElement('canvas')
  canvas.width = largeur
  canvas.height = hauteur
  // `willReadFrequently` dès la création : la peinture est relue pour en
  // déduire le relief et la rugosité (voir `textureRelief`), et un contexte
  // ouvert sans cette intention s'en plaint — à raison — à chaque lecture.
  peindre(canvas.getContext('2d', { willReadFrequently: true }), largeur, hauteur)

  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  if (repeter) {
    map.wrapS = THREE.RepeatWrapping
    map.wrapT = THREE.RepeatWrapping
    map.repeat.set(repeter[0], repeter[1])
  }
  map.anisotropy = anisotropieMax

  cache.set(nom, map)
  return map
}

/**
 * LE RELIEF DES SURFACES — et pourquoi il change tout.
 *
 * Une texture peinte donne à une surface sa COULEUR ; elle ne lui donne pas sa
 * MATIÈRE. Un bardage de bois dont les rainures sont dessinées reste une
 * planche lisse sur laquelle on a imprimé des rainures : la lumière glisse
 * dessus sans jamais accrocher un bord, et c'est exactement ce qui fait qu'un
 * décor calculé « a l'air calculé ». Le même bardage muni de sa carte de
 * normales prend l'ombre à chaque rainure quand le soleil tourne — et cesse
 * d'être un aplat imprimé.
 *
 * La carte est DÉDUITE de la peinture, jamais peinte à part : le relief d'une
 * pierre appareillée, c'est ses joints ; celui d'un platelage, ses rainures ;
 * celui d'un enduit, son grain. Tout cela est déjà dans le canevas de couleur,
 * et un opérateur de Sobel suffit à le lire. Une carte dessinée séparément
 * finirait par mentir à la première retouche de la peinture.
 *
 * `force` est la profondeur du relief. Elle se règle par matière : un joint de
 * pierre est un creux d'un centimètre, la rainure d'une lame de terrasse de
 * trois millimètres, le grain d'un enduit de rien du tout.
 */
function textureRelief(nom, source, { force = 1.8 } = {}) {
  const existante = cache.get(nom)
  if (existante) return existante

  const peinture = source.image
  const l = peinture.width
  const h = peinture.height
  const pixels = peinture.getContext('2d').getImageData(0, 0, l, h).data

  // Hauteur = clarté. Ce qui est clair est saillant, ce qui est sombre est en
  // creux : c'est vrai d'un joint, d'une rainure et d'un refend, et c'est la
  // seule convention qui tienne pour toutes les peintures d'un coup.
  const relief = new Float32Array(l * h)
  for (let i = 0; i < l * h; i += 1) {
    relief[i] =
      (pixels[i * 4] * 0.299 + pixels[i * 4 + 1] * 0.587 + pixels[i * 4 + 2] * 0.114) / 255
  }
  // Lecture enroulée : la texture se répète, son relief doit se répéter avec —
  // une couture visible sur une façade entière se voit de très loin.
  const lire = (x, y) => relief[((y % h) + h) % h * l + (((x % l) + l) % l)]

  const canvas = document.createElement('canvas')
  canvas.width = l
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const sortie = ctx.createImageData(l, h)

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < l; x += 1) {
      const dx = (lire(x + 1, y) - lire(x - 1, y)) * force
      // L'image descend quand `v` monte : la pente verticale change donc de
      // signe entre le canevas et le repère de la carte de normales.
      const dy = (lire(x, y + 1) - lire(x, y - 1)) * force
      const norme = 1 / Math.hypot(dx, dy, 1)
      const i = (y * l + x) * 4
      sortie.data[i] = Math.round((-dx * norme * 0.5 + 0.5) * 255)
      sortie.data[i + 1] = Math.round((dy * norme * 0.5 + 0.5) * 255)
      sortie.data[i + 2] = Math.round((norme * 0.5 + 0.5) * 255)
      sortie.data[i + 3] = 255
    }
  }
  ctx.putImageData(sortie, 0, 0)

  const map = new THREE.CanvasTexture(canvas)
  // Une carte de normales est une DONNÉE, pas une couleur : la convertir en
  // sRGB tordrait les vecteurs qu'elle porte.
  map.colorSpace = THREE.NoColorSpace
  map.wrapS = source.wrapS
  map.wrapT = source.wrapT
  map.repeat.copy(source.repeat)
  map.anisotropy = anisotropieMax

  cache.set(nom, map)
  return map
}

/**
 * LA RUGOSITÉ VARIÉE — l'autre moitié de ce qui fait qu'une surface existe.
 *
 * Une matière dont la rugosité est un nombre unique renvoie la lumière de la
 * même façon partout : le reflet du ciel y est une plage uniforme, et c'est le
 * rendu d'une maquette en plastique. Les vraies surfaces sont inégales — une
 * pierre plus dense luit là où elle est lisse, un joint boit la lumière, une
 * lame de bois a son fil. Cette carte tire cette inégalité de la même peinture
 * que le relief, entre deux bornes serrées : au-delà, ce n'est plus une matière
 * inégale, c'est une matière tachée.
 */
function textureRugosite(nom, source, { min = 0.42, max = 0.86 } = {}) {
  const existante = cache.get(nom)
  if (existante) return existante

  const peinture = source.image
  const l = peinture.width
  const h = peinture.height
  const pixels = peinture.getContext('2d').getImageData(0, 0, l, h).data

  const canvas = document.createElement('canvas')
  canvas.width = l
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const sortie = ctx.createImageData(l, h)

  for (let i = 0; i < l * h; i += 1) {
    const clarte =
      (pixels[i * 4] * 0.299 + pixels[i * 4 + 1] * 0.587 + pixels[i * 4 + 2] * 0.114) / 255
    // Ce qui est sombre est creux, donc plus rugueux ; ce qui est saillant est
    // poli par le passage et la pluie.
    const rugosite = Math.round((max - (max - min) * clarte) * 255)
    sortie.data[i * 4] = rugosite
    sortie.data[i * 4 + 1] = rugosite
    sortie.data[i * 4 + 2] = rugosite
    sortie.data[i * 4 + 3] = 255
  }
  ctx.putImageData(sortie, 0, 0)

  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.NoColorSpace
  map.wrapS = source.wrapS
  map.wrapT = source.wrapT
  map.repeat.copy(source.repeat)
  map.anisotropy = anisotropieMax

  cache.set(nom, map)
  return map
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

/**
 * BÉTON BLANC ARCHITECTONIQUE — la matière de l'immeuble contemporain.
 *
 * C'est le béton des dalles en débord : banché, décoffré, poncé, et laissé nu.
 * On le reconnaît à trois choses, et à trois seulement — la trace des banches,
 * horizontale et très large ; les trous de tiges d'écartement, alignés ; et un
 * grain fin, presque un sablé, qui l'empêche d'être un aplat. Tout le reste
 * serait du plâtre peint.
 */
export const textureBetonBlanc = () =>
  texture('beton-blanc', 512, 512, (ctx, l, h) => {
    ctx.fillStyle = '#f2f2f0'
    ctx.fillRect(0, 0, l, h)

    // Les banches : de larges panneaux, chacun d'un ton à peine différent.
    const banche = h / 3
    for (let i = 0; i < 3; i += 1) {
      const ton = 234 + Math.floor(Math.random() * 10)
      ctx.fillStyle = `rgb(${ton},${ton},${ton - 4})`
      ctx.fillRect(0, i * banche, l, banche - 1)
      // Le joint de banche : un trait très fin, à peine plus sourd.
      ctx.fillStyle = 'rgba(150,145,136,0.35)'
      ctx.fillRect(0, i * banche + banche - 2, l, 2)
    }

    // Trous de tiges, alignés sur la trame du coffrage. Un béton sans eux n'a
    // pas été coffré — il a été dessiné.
    for (let y = 0; y < 3; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        const cx = (x + 0.5) * (l / 4)
        const cy = y * banche + banche * 0.42
        const creux = ctx.createRadialGradient(cx, cy, 0, cx, cy, 6)
        creux.addColorStop(0, 'rgba(138,132,122,0.55)')
        creux.addColorStop(0.62, 'rgba(160,154,144,0.22)')
        creux.addColorStop(1, 'rgba(160,154,144,0)')
        ctx.fillStyle = creux
        ctx.beginPath()
        ctx.arc(cx, cy, 6, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Nuages de laitance : le béton n'est jamais d'un seul ton d'un bout à
    // l'autre d'une banche.
    for (let i = 0; i < 26; i += 1) {
      const r = 30 + Math.random() * 80
      ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.07})`
      ctx.beginPath()
      ctx.ellipse(Math.random() * l, Math.random() * h, r, r * 0.6, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }

    grain(ctx, l, h, 6000, 0.05)
  }, { repeter: [1, 1] })

/**
 * BARDAGE DE TASSEAUX VERTICAUX — l'autre matière de l'immeuble contemporain,
 * et celle qui le réchauffe.
 *
 * Des lames de mélèze posées debout, d'inégale largeur, séparées par un joint
 * creux qui reste dans l'ombre toute la journée. Ce sont ces ombres verticales,
 * plus que la couleur du bois, qui donnent leur rythme aux façades
 * contemporaines — et c'est pour elles que cette texture porte son relief.
 */
export const textureBardageBois = () =>
  texture('bardage-bois', 256, 256, (ctx, l, h) => {
    ctx.fillStyle = '#7d5b3a'
    ctx.fillRect(0, 0, l, h)

    let x = 0
    while (x < l) {
      // Lames d'inégale largeur : un bardage dont toutes les lames font la même
      // largeur est un panneau imprimé.
      const large = 14 + Math.floor(Math.random() * 12)
      const ton = 120 + Math.floor(Math.random() * 46)
      ctx.fillStyle = `rgb(${ton + 26},${Math.round(ton * 0.72)},${Math.round(ton * 0.44)})`
      ctx.fillRect(x, 0, large - 3, h)

      // Le fil du bois, dans le sens de la lame.
      ctx.strokeStyle = 'rgba(58,36,18,0.22)'
      ctx.lineWidth = 0.9
      for (let f = 0; f < 3; f += 1) {
        const fx = x + 3 + Math.random() * (large - 8)
        ctx.beginPath()
        ctx.moveTo(fx, 0)
        for (let y = 0; y <= h; y += 24) {
          ctx.lineTo(fx + Math.sin(y * 0.06) * 1.4, y)
        }
        ctx.stroke()
      }

      // Le joint creux : deux traits, un noir et un clair, qui font l'arête.
      ctx.fillStyle = 'rgba(28,18,10,0.72)'
      ctx.fillRect(x + large - 3, 0, 3, h)
      ctx.fillStyle = 'rgba(255,232,200,0.16)'
      ctx.fillRect(x, 0, 1.2, h)

      x += large
    }

    grain(ctx, l, h, 2200, 0.06)
  }, { repeter: [1, 1] })

/**
 * LE CIEL DE REFLET — ce que le verre et le métal ont à refléter.
 *
 * Il n'est jamais rendu à l'écran : il sert une seule fois, replié en carte
 * d'éclairage d'environnement (voir `creerScenetteEnvironnement`). Sans lui,
 * l'environnement de la scène est un blanc uniforme, et un vitrage n'a rien à
 * renvoyer qu'un gris plat — c'est ce qui donnait aux baies l'aspect d'un
 * carton gris bleuté collé dans un trou.
 *
 * Trois bandes, et l'horizon franc entre les deux dernières : un ciel qui
 * s'éclaircit en descendant, une ligne d'horizon nette et lumineuse, un sol
 * sourd. C'est cette LIGNE qui se voit dans un garde-corps de verre et sur le
 * nez d'une dalle de béton — et c'est elle, à elle seule, qui dit que la scène
 * a un dehors.
 */
export const textureCiel = () =>
  texture('ciel', 512, 256, (ctx, l, h) => {
    const degrade = ctx.createLinearGradient(0, 0, 0, h)
    degrade.addColorStop(0, '#dfe8f2')
    degrade.addColorStop(0.34, '#eef3f8')
    degrade.addColorStop(0.49, '#fdfdfb')
    // L'horizon : la bande la plus lumineuse de tout le ciel.
    degrade.addColorStop(0.5, '#ffffff')
    degrade.addColorStop(0.56, '#f0eee9')
    degrade.addColorStop(1, '#d8d4cd')
    ctx.fillStyle = degrade
    ctx.fillRect(0, 0, l, h)

    // Le soleil, très diffus — c'est un reflet qu'on cherche, pas un disque.
    const halo = ctx.createRadialGradient(l * 0.68, h * 0.26, 0, l * 0.68, h * 0.26, h * 0.42)
    halo.addColorStop(0, 'rgba(255,250,236,0.95)')
    halo.addColorStop(0.35, 'rgba(255,248,232,0.4)')
    halo.addColorStop(1, 'rgba(255,248,232,0)')
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, l, h * 0.5)

    // Deux voiles de nuage, très étalés : ils cassent le dégradé sans jamais
    // se lire comme des nuages.
    ;[
      [0.22, 0.2, 0.07],
      [0.78, 0.3, 0.05],
    ].forEach(([u, v, alpha]) => {
      const voile = ctx.createRadialGradient(u * l, v * h, 0, u * l, v * h, l * 0.26)
      voile.addColorStop(0, `rgba(255,255,255,${alpha})`)
      voile.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = voile
      ctx.fillRect(0, 0, l, h * 0.5)
    })
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
/*  Matières                                                                  */
/* -------------------------------------------------------------------------- */

const std = (options) => new THREE.MeshStandardMaterial(options)

/**
 * LE RELIEF D'UN ENDUIT, SANS TEXTURE DE COULEUR.
 *
 * L'enduit, le béton lissé, le plâtre : ce sont des matières dont la couleur
 * est vraiment uniforme, et les peindre reviendrait à leur inventer des taches.
 * Leur relief, lui, ne l'est pas — un enduit taloché prend la lumière rasante,
 * et c'est à ça qu'on le distingue d'une surface de synthèse. On leur donne
 * donc la carte de normales du grain du socle, à une échelle très serrée, et
 * rien d'autre.
 */
const reliefFin = () => textureRelief('relief-fin', textureSocle(), { force: 0.9 })

/** Applique le grain fin à une matière unie, sans lui donner de couleur. */
const grainee = (options, { force = 0.35 } = {}) => {
  const matiere = std(options)
  matiere.normalMap = reliefFin()
  matiere.normalScale = new THREE.Vector2(force, force)
  return matiere
}

/* --- La villa d'architecte ------------------------------------------------ */

/** Enduit blanc cassé : la matière dominante de la maison d'architecte. */
export const enduitClair = () =>
  grainee({ name: 'enduit', color: 0xf2ece1, roughness: 0.66, metalness: 0.02 }, { force: 0.4 })
/** Le même, en retrait : volumes secondaires, joues, tableaux de baie. */
export const enduitOmbre = () =>
  grainee({ name: 'enduit-ombre', color: 0xe2dacd, roughness: 0.72, metalness: 0.02 }, { force: 0.4 })
/** Béton lissé des dalles, terrasses et seuils. */
export const betonLisse = () => grainee({ color: 0xd8d2c5, roughness: 0.8, metalness: 0.02 })
/** Béton des acrotères et couvertines, plus sombre que la dalle. */
export const betonSombre = () =>
  grainee({ name: 'beton', color: 0x8e8a82, roughness: 0.7, metalness: 0.05 })
/** Terre cuite du toit à faible pente des grandes villas. */
export const tuile = () => grainee({ name: 'tuile', color: 0xa8603c, roughness: 0.85, metalness: 0.02 })
/** Bardage de tasseaux sombres, sur les volumes hauts. */
export const boisBardage = () =>
  grainee({ name: 'bois', color: 0x40301f, roughness: 0.82, metalness: 0.02 })

/* --- L'immeuble contemporain ---------------------------------------------- */

/**
 * BÉTON BLANC DES DALLES EN DÉBORD — la matière maîtresse de l'immeuble.
 *
 * C'est elle qu'on voit d'abord : les grands plateaux horizontaux qui sortent
 * de la façade et qui, empilés, font tout le dessin du bâtiment. Elle porte sa
 * peinture, son relief de banche et sa rugosité inégale — à cette échelle, un
 * béton uniforme se lirait comme du carton blanc.
 */
export const betonBlanc = () => {
  const map = textureBetonBlanc()
  return std({
    name: 'beton-blanc',
    map,
    // PAS UN BLANC PUR, et c'est le standing qui l'exige : l'état dessiné est
    // le MILIEU d'une échelle à trois points (voir `accorderStanding`), et un
    // béton déjà au maximum de clarté ne laisse aucune place au cran du dessus.
    color: 0xf1efeb,
    normalMap: textureRelief('beton-blanc-relief', map, { force: 1.5 }),
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: textureRugosite('beton-blanc-rugosite', map, { min: 0.5, max: 0.82 }),
    roughness: 0.68,
    metalness: 0.03,
  })
}

/** Le même béton, en sous-face : ce qu'on voit d'une dalle vue d'en dessous. */
export const betonBlancOmbre = () => {
  const matiere = betonBlanc()
  matiere.name = 'beton-blanc-ombre'
  matiere.color.setHex(0xd8d5cf)
  return matiere
}

/**
 * BARDAGE VERTICAL DE MÉLÈZE — les panneaux chauds entre les dalles.
 *
 * Son relief compte plus que sa couleur : ce sont les ombres des joints creux,
 * verticales et régulières, qui donnent son rythme à la façade. À plat, le même
 * bois n'est qu'une plage brune.
 */
export const bardageVertical = () => {
  const map = textureBardageBois()
  return std({
    name: 'bardage',
    map,
    color: 0xc8b69e,
    normalMap: textureRelief('bardage-relief', map, { force: 2.6 }),
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughnessMap: textureRugosite('bardage-rugosite', map, { min: 0.46, max: 0.9 }),
    roughness: 0.74,
    metalness: 0.02,
  })
}

/* --- L'immeuble haussmannien --------------------------------------------- */

export const pierreTaille = () => {
  const map = texturePierre()
  return std({
    name: 'pierre',
    map,
    color: 0xf3ecdd,
    normalMap: textureRelief('pierre-relief', map, { force: 2.2 }),
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughnessMap: textureRugosite('pierre-rugosite', map, { min: 0.56, max: 0.9 }),
    roughness: 0.78,
    metalness: 0.02,
  })
}
export const pierreSocle = () => {
  const map = texturePierreSocle()
  return std({
    name: 'pierre-socle',
    map,
    color: 0xe8e0cf,
    normalMap: textureRelief('pierre-socle-relief', map, { force: 3.2 }),
    normalScale: new THREE.Vector2(1.05, 1.05),
    roughness: 0.86,
    metalness: 0.02,
  })
}
/** Pierre moulurée : corniches, bandeaux, appuis, clés. Sans texture — ces
    pièces sont trop fines pour qu'un appareil s'y lise, et il y clignoterait.
    Elle garde en revanche le grain fin : une moulure parfaitement lisse est la
    seule chose qu'aucune pierre taillée n'est. */
export const pierreMoulure = () =>
  grainee({ name: 'moulure', color: 0xece2cd, roughness: 0.74, metalness: 0.02 }, { force: 0.3 })
export const zincToiture = () => {
  const map = textureZinc()
  return std({
    name: 'zinc',
    map,
    color: 0xaeb6bf,
    normalMap: textureRelief('zinc-relief', map, { force: 1.6 }),
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughness: 0.48,
    metalness: 0.32,
    envMapIntensity: 1.6,
  })
}
/** Terre cuite des souches de cheminée, sur la toiture de zinc. */
export const terreCuite = () => std({ color: 0xb4764f, roughness: 0.88, metalness: 0.02 })

/* --- Menuiseries et ferronneries ----------------------------------------- */

/**
 * LES MÉTAUX ONT DÉSORMAIS QUELQUE CHOSE À REFLÉTER.
 *
 * Un métal, par définition, n'a pas de couleur propre : ce qu'on en voit est
 * le reflet de ce qui l'entoure. Tant que l'environnement de la scène était un
 * blanc uniforme, une menuiserie d'aluminium noir et un fer forgé rendaient le
 * même gris mat — celui du plastique peint. Le ciel de reflet leur donne une
 * ligne d'horizon et une source (voir `creerScenetteEnvironnement`), et
 * `envMapIntensity` dit à chacun combien il en prend.
 */

/** Aluminium noir mat des menuiseries contemporaines. */
export const aluNoir = () =>
  std({ name: 'menuiserie', color: 0x22242a, roughness: 0.38, metalness: 0.66, envMapIntensity: 1.8 })
/** Fer forgé des garde-corps, balcons et rampes. */
export const ferForge = () =>
  std({ name: 'fer', color: 0x1e2024, roughness: 0.42, metalness: 0.62, envMapIntensity: 1.7 })
/** Laiton poli : marquise, barres de tapis, quincaillerie. */
export const laiton = () =>
  std({ name: 'laiton', color: 0xc9a16b, roughness: 0.34, metalness: 0.72, envMapIntensity: 2.1 })
/** Bois vernis des portes cochères et des mains courantes. */
export const boisVerni = () =>
  std({ name: 'bois-verni', color: 0x6b3f22, roughness: 0.42, metalness: 0.08 })
/** Bois clair des marches et du mobilier. */
export const boisClair = () => std({ color: 0xbb8b55, roughness: 0.6, metalness: 0.04 })
/** Volet de bois peint, replié en tableau de fenêtre. */
export const volet = () => std({ name: 'volet', color: 0x8d9a8c, roughness: 0.78, metalness: 0.03 })

/**
 * Vitrage clair : bleuté le jour, ambré une fois le logement éclairé.
 *
 * Les deux vitrages portent un `name` — c'est à lui que la scène les
 * reconnaît quand le soir tombe. Le verre d'un garde-corps est aussi
 * transparent et aussi émissif par défaut qu'une baie ; rien d'autre qu'un nom
 * ne dit lequel des deux doit s'allumer.
 */
/**
 * LE VERRE EST PASSÉ EN MATIÈRE PHYSIQUE, et c'est le seul endroit du décor où
 * ça se justifie.
 *
 * Une vitre rendue en matière standard n'a qu'une réflexion, celle de sa
 * rugosité ; or une vitre en a DEUX — celle du verre lui-même, très nette, et
 * ce qu'on voit à travers. C'est le vernis (`clearcoat`) qui rend la première :
 * une couche spéculaire posée par-dessus, insensible à la couleur et à la
 * rugosité du dessous. Avec lui, une baie prend le reflet du ciel en haut et
 * celui du sol en bas ; sans lui, elle reste un panneau bleu-gris uniforme, et
 * c'est ce qui trahissait le plus la synthèse sur toute la façade.
 *
 * Le surcoût est celui d'un programme de nuance plus long pour les seules
 * vitres. Aucune ne recourt à la transmission — le réfractif, lui, se paie en
 * rendu de scène complet et n'a pas sa place ici.
 */
const verre = (options) => new THREE.MeshPhysicalMaterial(options)

export const vitrage = () =>
  verre({
    name: 'vitrage',
    color: 0x8fb4c6,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.08,
    metalness: 0.15,
    clearcoat: 0.85,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.25,
    transparent: true,
    opacity: 0.86,
  })

/** Mur-rideau du séjour : plus sombre, plus réfléchissant qu'une fenêtre. */
export const murVitre = () =>
  verre({
    name: 'vitrage',
    color: 0x18262d,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.05,
    metalness: 0.2,
    clearcoat: 0.9,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.45,
    transparent: true,
    opacity: 0.88,
  })

/** Verre de garde-corps : un voile, pas une vitre. */
export const verreVoile = () =>
  verre({
    name: 'verre-garde-corps',
    color: 0xbcd3dd,
    roughness: 0.04,
    metalness: 0.1,
    clearcoat: 0.9,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.4,
    transparent: true,
    opacity: 0.26,
  })

/* --- Abords --------------------------------------------------------------- */

export const gazon = () => {
  const map = textureGazon()
  return std({
    map,
    color: 0xdff0cc,
    // Le gazon est la surface la plus rasante du décor : c'est sur elle que le
    // relief se voit le plus, et sans lui elle rend un feutre vert.
    normalMap: textureRelief('gazon-relief', map, { force: 2.8 }),
    normalScale: new THREE.Vector2(1.1, 1.1),
    roughness: 0.95,
  })
}
export const dallage = () => {
  const map = textureDallage()
  return std({
    name: 'dallage',
    map,
    color: 0xf4efe4,
    normalMap: textureRelief('dallage-relief', map, { force: 2.6 }),
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughnessMap: textureRugosite('dallage-rugosite', map, { min: 0.5, max: 0.88 }),
    roughness: 0.82,
  })
}
export const gravier = () =>
  grainee({ color: 0xbdb5a4, roughness: 0.96 }, { force: 0.8 })
export const feuillage = () => std({ color: 0x4f7444, roughness: 0.9, flatShading: true })
export const feuillageClair = () => std({ color: 0x7d9b57, roughness: 0.92, flatShading: true })
export const tronc = () => grainee({ color: 0x5b4632, roughness: 0.94 }, { force: 0.6 })
export const eauPiscine = () =>
  new THREE.MeshPhysicalMaterial({
    map: textureEau(),
    color: 0xdff2f8,
    normalMap: textureRelief('eau-relief', textureEau(), { force: 1.4 }),
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.04,
    metalness: 0.1,
    clearcoat: 0.9,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.5,
    transparent: true,
    opacity: 0.92,
  })
export const margelle = () => grainee({ color: 0xe6e0d2, roughness: 0.78 }, { force: 0.4 })
export const panneauSolaire = () => {
  const map = texturePanneau()
  return std({
    map,
    color: 0xffffff,
    normalMap: textureRelief('panneau-relief', map, { force: 1.2 }),
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.18,
    metalness: 0.6,
    envMapIntensity: 1.9,
  })
}

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
/*  L'environnement de reflet                                                 */
/* -------------------------------------------------------------------------- */

/**
 * LA SCÈNE À REFLÉTER — un ciel, un horizon, un sol, et rien d'autre.
 *
 * Elle n'est jamais rendue à l'écran : elle est repliée une seule fois en carte
 * d'éclairage d'environnement (voir `DroneScene`), et c'est cette carte que le
 * verre, le zinc, le laiton et l'aluminium renvoient.
 *
 * CE QU'ELLE REMPLACE, ET POURQUOI C'ÉTAIT LE PLUS GROS DÉFAUT DE LA SCÈNE.
 * L'environnement était jusqu'ici le FOND DE SCÈNE lui-même — un blanc à peine
 * dégradé, replié sur les six faces d'un cube. Un environnement uniforme n'a
 * pas de direction : une baie vitrée y renvoie exactement le même gris en haut
 * et en bas, un garde-corps de verre le même voile sur toute sa hauteur, une
 * couvertine de zinc la même clarté d'un bout à l'autre. C'est ce qui donnait à
 * toutes les surfaces réfléchissantes du décor l'aspect du plastique peint — et
 * aucune quantité de lumière directe n'y change quoi que ce soit, parce que ce
 * qui manque n'est pas de la lumière, c'est un DEHORS.
 *
 * Une sphère peinte suffit à le fournir, et elle ne coûte rien : elle est
 * rendue six fois, une seule fois dans la vie de la scène, puis jetée.
 */
export function creerScenetteEnvironnement() {
  const scenette = new THREE.Scene()

  const voute = new THREE.Mesh(
    new THREE.SphereGeometry(50, 32, 20),
    new THREE.MeshBasicMaterial({ map: textureCiel(), side: THREE.BackSide }),
  )
  scenette.add(voute)

  /**
   * DEUX PLAQUES LUMINEUSES, à l'aplomb du soleil de la scène.
   *
   * Un ciel dégradé donne une ambiance ; il ne donne pas de REFLET SPÉCULAIRE —
   * le point brillant qui court sur une main courante quand on se déplace, et
   * qui est la seule chose à quoi l'œil reconnaît un métal. Il faut pour cela
   * une source franche et petite. Deux suffisent : la principale, chaude, du
   * côté du soleil ; la seconde, froide et bien plus faible, à l'opposé — c'est
   * le contre-jour, et sans lui une arête à l'ombre n'a plus d'arête.
   */
  ;[
    { position: [16, 13, 11], taille: 9, couleur: 0xfff4e2, force: 2.2 },
    { position: [-15, 7, -12], taille: 12, couleur: 0xdfe8f4, force: 0.8 },
  ].forEach(({ position, taille, couleur, force }) => {
    const source = new THREE.Mesh(
      new THREE.PlaneGeometry(taille, taille),
      new THREE.MeshBasicMaterial({ color: couleur }),
    )
    source.material.color.multiplyScalar(force)
    source.position.set(...position)
    source.lookAt(0, 0, 0)
    scenette.add(source)
  })

  return scenette
}

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
 *
 * DEUX ÉCHELLES, ET CHAQUE MATIÈRE CHOISIT LA SIENNE.
 *
 *   `{ couleur, roughness, metalness }` — l'échelle À DEUX POINTS, celle
 *   d'origine : le rang 0 est l'état dessiné, le rang 1 l'état accordé. Rien ne
 *   se dégrade jamais. C'est celle de la maison, où « À rafraîchir » rend
 *   exactement la maison qu'on voyait avant l'écran d'affinage.
 *
 *   `{ bas: {...}, haut: {...} }` — l'échelle À TROIS POINTS. L'état dessiné
 *   devient le MILIEU de l'échelle : le rang 0,5 — « Standard » — le rend tel
 *   quel, le rang 1 va vers `haut`, et le rang 0 va vers `bas`. C'est celle de
 *   l'immeuble, où l'on veut que les trois niveaux se distinguent VRAIMENT à
 *   l'écran : un bien à rafraîchir doit avoir l'air d'un bien à rafraîchir, ce
 *   qu'une échelle qui ne descend jamais sous l'état dessiné ne permet pas.
 *
 * Les deux cohabitent dans la même table sans se gêner : c'est la présence de
 * `haut` qui dit laquelle s'applique.
 */
export function accorderStanding(racine, table) {
  const socles = []

  const versant = (cible) => ({
    couleur: cible?.couleur !== undefined ? new THREE.Color(cible.couleur) : null,
    roughness: cible?.roughness,
    metalness: cible?.metalness,
  })

  racine.traverse((objet) => {
    if (!objet.isMesh) return
    const liste = Array.isArray(objet.material) ? objet.material : [objet.material]
    liste.forEach((matiere) => {
      const cible = matiere && table[matiere.name]
      if (!cible) return
      const troisPoints = cible.haut !== undefined || cible.bas !== undefined
      socles.push({
        matiere,
        base: {
          couleur: matiere.color.clone(),
          roughness: matiere.roughness,
          metalness: matiere.metalness,
        },
        troisPoints,
        haut: versant(troisPoints ? cible.haut : cible),
        bas: versant(troisPoints ? cible.bas : null),
      })
    })
  })

  let dernier = -1

  return (rang) => {
    const t = Math.max(0, Math.min(1, Number(rang) || 0))
    if (Math.abs(t - dernier) < 0.002) return
    dernier = t

    socles.forEach((socle) => {
      // Où l'on va, et de combien. Sur l'échelle à trois points, le milieu est
      // l'état dessiné : on s'en écarte vers le haut ou vers le bas, et la part
      // du chemin se recompte depuis ce milieu.
      const versLeHaut = !socle.troisPoints || t >= 0.5
      const vers = versLeHaut ? socle.haut : socle.bas
      const part = socle.troisPoints ? Math.abs(t - 0.5) * 2 : t
      const { base, matiere } = socle

      if (vers.couleur) matiere.color.copy(base.couleur).lerp(vers.couleur, part)
      else matiere.color.copy(base.couleur)

      matiere.roughness =
        vers.roughness === undefined
          ? base.roughness
          : base.roughness + (vers.roughness - base.roughness) * part
      matiere.metalness =
        vers.metalness === undefined
          ? base.metalness
          : base.metalness + (vers.metalness - base.metalness) * part
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
    matieres.forEach((matiere) => matiere?.dispose())
  })
  groupe.clear()
}

/** Rend une matière transparente et pilotable en opacité. */
export function pilotable(matiere) {
  matiere.transparent = true
  return matiere
}

/**
 * L'ACCUSÉ DE RÉCEPTION — l'ouvrage qu'on vient de déclarer s'illumine.
 *
 * Un vendeur qui coche « Piscine » voit un bassin se creuser, et c'est bien ;
 * mais quand il règle un curseur de rooftop ou change de standing, ce qui bouge
 * à l'écran est parfois si progressif qu'il n'est pas sûr d'avoir agi. Cette
 * fonction rend le geste qui manquait : dès que l'animation d'une option est
 * finie, l'ouvrage concerné S'ÉCLAIRE quelques secondes, puis s'éteint.
 *
 * C'est une ÉMISSION, pas une lumière : la pièce brille d'elle-même, sans
 * source ajoutée à la scène — une lumière de plus, allumée et éteinte toutes
 * les deux secondes, recompilerait les nuances de tout le décor à chaque clic.
 *
 * La teinte est celle du laiton du parcours : c'est la couleur du prix, celle
 * du halo final, et celle de tout ce qui, dans ce site, dit « retenu ».
 */
const OR_ACCUSE = new THREE.Color(0xc9a16b)

export function illuminant(groupe) {
  const matieres = []
  groupe.traverse((objet) => {
    if (!objet.isMesh) return
    const liste = Array.isArray(objet.material) ? objet.material : [objet.material]
    liste.forEach((matiere) => {
      if (!matiere || !matiere.emissive) return
      // LES VITRES SONT EXCLUES, et il le faut : leur émission est déjà pilotée
      // image par image — le soir qui tombe, et l'étage du vendeur qui s'allume
      // (voir `poser` dans `immeuble.js`). Deux écritures concurrentes sur la
      // même matière, et la dernière gagne : l'étage déclaré s'éteindrait le
      // temps d'un accusé de réception, puis se rallumerait.
      if (matiere.name === 'vitrage') return
      matieres.push(matiere)
    })
  })

  let allume = false

  return (force) => {
    const f = Math.max(0, Math.min(1, Number(force) || 0))
    // Rien à écrire quand rien ne brille et que rien ne brillait : l'accusé de
    // réception est un événement rare, la boucle le traverse à chaque image.
    if (f < 0.002) {
      if (!allume) return
      allume = false
      matieres.forEach((matiere) => {
        matiere.emissive.setHex(0x000000)
        matiere.emissiveIntensity = 0
      })
      return
    }
    allume = true
    matieres.forEach((matiere) => {
      matiere.emissive.copy(OR_ACCUSE)
      matiere.emissiveIntensity = f
    })
  }
}
