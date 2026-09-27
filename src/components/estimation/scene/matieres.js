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
function texture(nom, largeur, hauteur, peindre, { repeter = null } = {}) {
  const existante = cache.get(nom)
  if (existante) return existante

  const canvas = document.createElement('canvas')
  canvas.width = largeur
  canvas.height = hauteur
  peindre(canvas.getContext('2d'), largeur, hauteur)

  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  if (repeter) {
    map.wrapS = THREE.RepeatWrapping
    map.wrapT = THREE.RepeatWrapping
    map.repeat.set(repeter[0], repeter[1])
  }
  map.anisotropy = 4

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
 * CIEL — dégradé du zénith à l'horizon, et ses voiles.
 *
 * Le dégradé seul se lit comme un fond de studio : un vrai ciel a des couches.
 * Trois bandes très douces s'y ajoutent donc, à peine plus claires que le fond,
 * posées dans le tiers bas — là où s'empilent les brumes d'horizon. Elles sont
 * HORIZONTALES à dessein : le fond de scène ne tourne pas avec la caméra, et
 * tout ce qui aurait une position lisible s'y verrait comme collé à l'objectif.
 * Une stratification, elle, reste juste sous tous les angles.
 */
export const textureCiel = () =>
  texture('ciel', 16, 512, (ctx, l, h) => {
    const degrade = ctx.createLinearGradient(0, 0, 0, h)
    degrade.addColorStop(0, '#5f9bdd')
    degrade.addColorStop(0.38, '#a3c9e8')
    degrade.addColorStop(0.72, '#dfeaee')
    degrade.addColorStop(0.93, '#f3eee2')
    degrade.addColorStop(1, '#efe6d4')
    ctx.fillStyle = degrade
    ctx.fillRect(0, 0, l, h)

    ;[
      [0.62, 0.05, 0.1],
      [0.74, 0.035, 0.14],
      [0.85, 0.028, 0.1],
    ].forEach(([position, epaisseur, alpha]) => {
      const voile = ctx.createLinearGradient(0, (position - epaisseur) * h, 0, (position + epaisseur) * h)
      voile.addColorStop(0, 'rgba(255,255,255,0)')
      voile.addColorStop(0.5, `rgba(255,255,255,${alpha})`)
      voile.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = voile
      ctx.fillRect(0, (position - epaisseur) * h, l, epaisseur * 2 * h)
    })
  })

/**
 * LE SOL DE LA SCÈNE — pelouse rase pour une maison, enrobé pour un immeuble.
 *
 * Le disque de sol était un aplat de couleur. À la distance où le drone
 * travaille, un aplat se voit : c'est ce qui donnait à la scène son air de
 * maquette posée sur un carton. Deux textures très douces, sans motif lisible
 * de près, suffisent à le faire tenir — ce qu'on doit y voir, ce n'est pas le
 * sol, c'est qu'il n'est pas peint.
 */
export const textureSolPre = () =>
  texture('sol-pre', 256, 256, (ctx, l, h) => {
    ctx.fillStyle = '#8ba36c'
    ctx.fillRect(0, 0, l, h)
    // Larges plages inégales : le pré n'est pas tondu de la même main partout.
    // Très peu contrastées — il ne s'agit pas de dessiner des taches, mais
    // d'empêcher l'aplat.
    for (let i = 0; i < 90; i += 1) {
      const r = 18 + Math.random() * 54
      const v = 150 + Math.floor(Math.random() * 26)
      ctx.fillStyle = `rgba(${Math.round(v * 0.68)},${v},${Math.round(v * 0.58)},0.11)`
      ctx.beginPath()
      ctx.ellipse(Math.random() * l, Math.random() * h, r, r * 0.7, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    grain(ctx, l, h, 3600, 0.07)
  }, { repeter: [9, 9] })

export const textureSolVille = () =>
  texture('sol-ville', 256, 256, (ctx, l, h) => {
    ctx.fillStyle = '#787a73'
    ctx.fillRect(0, 0, l, h)
    for (let i = 0; i < 70; i += 1) {
      const r = 14 + Math.random() * 46
      const v = 108 + Math.floor(Math.random() * 30)
      ctx.fillStyle = `rgba(${v},${v + 2},${v - 4},0.2)`
      ctx.beginPath()
      ctx.ellipse(Math.random() * l, Math.random() * h, r, r * 0.8, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    grain(ctx, l, h, 5200, 0.16)
  }, { repeter: [11, 11] })

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

/* --- La villa d'architecte ------------------------------------------------ */

/** Enduit blanc cassé : la matière dominante de la maison d'architecte. */
export const enduitClair = () =>
  std({ name: 'enduit', color: 0xf2ece1, roughness: 0.66, metalness: 0.02 })
/** Le même, en retrait : volumes secondaires, joues, tableaux de baie. */
export const enduitOmbre = () =>
  std({ name: 'enduit-ombre', color: 0xe2dacd, roughness: 0.72, metalness: 0.02 })
/** Béton lissé des dalles, terrasses et seuils. */
export const betonLisse = () => std({ color: 0xd8d2c5, roughness: 0.8, metalness: 0.02 })
/** Béton des acrotères et couvertines, plus sombre que la dalle. */
export const betonSombre = () =>
  std({ name: 'beton', color: 0x8e8a82, roughness: 0.7, metalness: 0.05 })
/** Terre cuite du toit à faible pente des grandes villas. */
export const tuile = () => std({ name: 'tuile', color: 0xa8603c, roughness: 0.85, metalness: 0.02 })
/** Bardage de tasseaux sombres, sur les volumes hauts. */
export const boisBardage = () =>
  std({ name: 'bois', color: 0x40301f, roughness: 0.82, metalness: 0.02 })

/* --- L'immeuble haussmannien --------------------------------------------- */

export const pierreTaille = () =>
  std({ name: 'pierre', map: texturePierre(), color: 0xf3ecdd, roughness: 0.78, metalness: 0.02 })
export const pierreSocle = () =>
  std({ name: 'pierre-socle', map: texturePierreSocle(), color: 0xe8e0cf, roughness: 0.86, metalness: 0.02 })
/** Pierre moulurée : corniches, bandeaux, appuis, clés. Sans texture — ces
    pièces sont trop fines pour qu'un appareil s'y lise, et il y clignoterait. */
export const pierreMoulure = () =>
  std({ name: 'moulure', color: 0xece2cd, roughness: 0.74, metalness: 0.02 })
export const zincToiture = () =>
  std({ name: 'zinc', map: textureZinc(), color: 0xaeb6bf, roughness: 0.48, metalness: 0.32 })
/** Terre cuite des souches de cheminée, sur la toiture de zinc. */
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
export const vitrage = () =>
  std({
    name: 'vitrage',
    color: 0x8fb4c6,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.14,
    metalness: 0.3,
    transparent: true,
    opacity: 0.86,
  })

/** Mur-rideau du séjour : plus sombre, plus réfléchissant qu'une fenêtre. */
export const murVitre = () =>
  std({
    name: 'vitrage',
    color: 0x18262d,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.1,
    metalness: 0.4,
    transparent: true,
    opacity: 0.78,
  })

/** Verre de garde-corps : un voile, pas une vitre. */
export const verreVoile = () =>
  std({ color: 0xbcd3dd, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.3 })

/* --- Abords --------------------------------------------------------------- */

export const gazon = () => std({ map: textureGazon(), color: 0xdff0cc, roughness: 0.95 })
export const dallage = () =>
  std({ name: 'dallage', map: textureDallage(), color: 0xf4efe4, roughness: 0.82 })
export const gravier = () => std({ color: 0xbdb5a4, roughness: 0.96 })
export const feuillage = () => std({ color: 0x4f7444, roughness: 0.9 })
export const feuillageClair = () => std({ color: 0x7d9b57, roughness: 0.92 })
export const tronc = () => std({ color: 0x5b4632, roughness: 0.94 })
export const eauPiscine = () =>
  std({
    map: textureEau(),
    color: 0xdff2f8,
    roughness: 0.06,
    metalness: 0.28,
    transparent: true,
    opacity: 0.92,
  })
export const margelle = () => std({ color: 0xe6e0d2, roughness: 0.78 })
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
    matieres.forEach((matiere) => matiere?.dispose())
  })
  groupe.clear()
}

/** Rend une matière transparente et pilotable en opacité. */
export function pilotable(matiere) {
  matiere.transparent = true
  return matiere
}
