// Illustration d'un article : photo de banque d'images, ou graphique dessiné.
//
// ORDRE DE PRÉFÉRENCE
//
//   1. Un graphique, si l'article repose sur une comparaison chiffrée. Une
//      photo de maison générique n'apprend rien ; cinq barres qui montrent
//      l'écart de prix entre quartiers portent le propos de l'article.
//   2. Unsplash, sinon.
//   3. Pexels, si Unsplash ne rend rien.
//   4. Rien. Un article sans image reste un article ; une image hors sujet
//      posée là pour remplir la case dessert la page.
//
// SUR « SI UNSPLASH NE RETOURNE RIEN DE PERTINENT »
//
// La pertinence d'une photo ne se mesure pas depuis un script : l'API rend des
// résultats classés, sans indice exploitable sur leur rapport au sujet. Le
// repli se déclenche donc sur ce qui est vérifiable — aucun résultat, ou appel
// en échec. Prétendre juger la pertinence ici serait une fausse garantie.
//
// AUCUNE CLÉ N'EST OBLIGATOIRE : sans `UNSPLASH_ACCESS_KEY` ni `PEXELS_API_KEY`,
// le module saute simplement ces étages et le dit dans son journal.

import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

import { DOSSIER_IMAGES, echappe } from './article.mjs'

const DELAI_MS = 10_000

/** Palette du site — reprise de `tailwind.config.js`, à l'identique. */
const COULEURS = { ink: '#10141C', stone: '#EDEAE3', brass: '#B08D57' }

/**
 * Photo Unsplash.
 *
 * L'appel à `download_location` n'est pas facultatif : les conditions d'usage
 * de l'API imposent de le déclencher quand une photo est effectivement
 * utilisée, et de créditer l'auteur. Le manquer met le compte en infraction.
 */
async function unsplash(requete, journal) {
  const cle = process.env.UNSPLASH_ACCESS_KEY
  if (!cle) {
    journal('Unsplash — UNSPLASH_ACCESS_KEY absente, étage sauté.')
    return null
  }

  const url = new URL('https://api.unsplash.com/search/photos')
  url.searchParams.set('query', requete)
  url.searchParams.set('per_page', '5')
  url.searchParams.set('orientation', 'landscape')
  url.searchParams.set('content_filter', 'high')

  const reponse = await fetch(url, {
    headers: { Authorization: `Client-ID ${cle}`, 'Accept-Version': 'v1' },
    signal: AbortSignal.timeout(DELAI_MS),
  })

  if (!reponse.ok) {
    journal(`Unsplash — réponse ${reponse.status}, étage sauté.`)
    return null
  }

  const data = await reponse.json()
  const photo = data?.results?.[0]
  if (!photo) {
    journal(`Unsplash — aucun résultat pour « ${requete} », repli sur Pexels.`)
    return null
  }

  // Déclenchement du téléchargement, exigé par les conditions de l'API.
  if (photo.links?.download_location) {
    await fetch(photo.links.download_location, {
      headers: { Authorization: `Client-ID ${cle}` },
      signal: AbortSignal.timeout(DELAI_MS),
    }).catch(() => {})
  }

  const src = `${photo.urls.raw}&auto=format&fit=crop&w=1600&q=70`
  journal(`Unsplash — photo de ${photo.user?.name ?? 'auteur inconnu'} retenue.`)

  return {
    type: 'photo',
    src,
    alt: photo.alt_description ?? requete,
    credit: `Photo ${photo.user?.name ?? ''} — Unsplash`.replace(/\s+/g, ' ').trim(),
    creditUrl: photo.links?.html ?? 'https://unsplash.com',
  }
}

/** Photo Pexels — même contrat, employée seulement si Unsplash n'a rien rendu. */
async function pexels(requete, journal) {
  const cle = process.env.PEXELS_API_KEY
  if (!cle) {
    journal('Pexels — PEXELS_API_KEY absente, étage sauté.')
    return null
  }

  const url = new URL('https://api.pexels.com/v1/search')
  url.searchParams.set('query', requete)
  url.searchParams.set('per_page', '5')
  url.searchParams.set('orientation', 'landscape')

  const reponse = await fetch(url, {
    headers: { Authorization: cle },
    signal: AbortSignal.timeout(DELAI_MS),
  })

  if (!reponse.ok) {
    journal(`Pexels — réponse ${reponse.status}, étage sauté.`)
    return null
  }

  const data = await reponse.json()
  const photo = data?.photos?.[0]
  if (!photo) {
    journal(`Pexels — aucun résultat pour « ${requete} ».`)
    return null
  }

  journal(`Pexels — photo de ${photo.photographer ?? 'auteur inconnu'} retenue.`)

  return {
    type: 'photo',
    src: photo.src?.large2x ?? photo.src?.large,
    alt: photo.alt || requete,
    credit: `Photo ${photo.photographer ?? ''} — Pexels`.replace(/\s+/g, ' ').trim(),
    creditUrl: photo.url ?? 'https://www.pexels.com',
  }
}

/**
 * Graphique en barres, dessiné à la main en SVG.
 *
 * Aucune librairie : le site n'en embarque aucune pour les graphiques, et en
 * ajouter une pour cinq barres coûterait plus cher en dépendance qu'en code.
 * Le trait suit le système du site — fond Ink, barres Brass, chiffres en
 * monospace — comme les autres dessins à l'encre du projet.
 *
 * Format 1200 × 630 : ce sont les proportions attendues par les aperçus de
 * partage, ce qui permet de servir le même fichier en image Open Graph.
 */
export function graphiqueBarres({ titre, unite, valeurs }) {
  const L = 1200
  const H = 630
  const gauche = 70
  const droite = 70
  const utile = L - gauche - droite

  // Largeur approchée d'un caractère, en fraction de la taille de police.
  // Approximation grossière et volontairement généreuse : sans mesure de
  // texte côté SVG, mieux vaut réserver trop de place que laisser déborder.
  const LARGEUR_CARACTERE = 0.55

  // ── Titre, sur une ou deux lignes ──────────────────────────────────────
  //
  // Le modèle rend parfois un titre de cent caractères — « Prix au m² relevé
  // pour les maisons dans les 12 communes à moins de 7 km de Diebling (relevé
  // septembre 2026) ». Écrit d'un trait en corps 40, il faisait deux fois la
  // largeur de l'image et sortait du cadre. La police se réduit donc, puis le
  // titre passe sur deux lignes, et au-delà il est coupé : trois lignes de
  // titre mangeraient le graphique qu'elles annoncent.
  const texteTitre = String(titre ?? '')
  const tailleTitre = texteTitre.length > 90 ? 26 : texteTitre.length > 55 ? 32 : 40
  const parLigne = Math.floor(utile / (tailleTitre * LARGEUR_CARACTERE))

  const lignesTitre = []
  let reste = texteTitre.trim()
  while (reste && lignesTitre.length < 2) {
    if (reste.length <= parLigne) {
      lignesTitre.push(reste)
      break
    }
    // Coupe au dernier espace qui tient, sinon en dur.
    const tranche = reste.slice(0, parLigne)
    const coupe = tranche.lastIndexOf(' ')
    const fin = lignesTitre.length === 1 ? parLigne - 1 : coupe > parLigne * 0.5 ? coupe : parLigne
    lignesTitre.push(lignesTitre.length === 1 ? `${reste.slice(0, fin).trimEnd()}…` : reste.slice(0, fin).trim())
    reste = reste.slice(fin).trim()
  }

  const hautTitre = 66
  const basTitre = hautTitre + (lignesTitre.length - 1) * (tailleTitre + 8)
  const yUnite = basTitre + 34

  // ── Libellés : horizontaux si la place le permet, inclinés sinon ───────
  //
  // À douze barres, chaque colonne fait moins de quatre-vingt-dix pixels
  // alors que « Nousseviller-Saint-Nabor » en demande le triple. Tronquer à
  // huit caractères rendait la moitié des communes indiscernables —
  // « Faréber… », « Noussev… », « Henrivi… ». L'inclinaison à 45° donne la
  // place d'écrire le nom en entier, ce qu'aucune troncature ne permettra.
  const pas = utile / valeurs.length
  const tailleLibelle = valeurs.length > 8 ? 16 : valeurs.length > 5 ? 18 : 21
  const plusLong = Math.max(...valeurs.map((v) => String(v.libelle).length))
  const largeurPlusLong = plusLong * tailleLibelle * LARGEUR_CARACTERE
  const incline = largeurPlusLong > pas * 0.95

  // Un libellé incliné occupe en hauteur sa longueur × sin(45°).
  const maxCaracteres = incline ? 22 : Math.max(6, Math.floor(pas / (tailleLibelle * LARGEUR_CARACTERE)))
  const raccourci = (v) => {
    const t = String(v)
    return t.length <= maxCaracteres ? t : `${t.slice(0, maxCaracteres - 1).trimEnd()}…`
  }

  const hauteurLibelles = incline
    ? Math.min(maxCaracteres, plusLong) * tailleLibelle * LARGEUR_CARACTERE * 0.71 + 40
    : 70
  const haut = yUnite + 34
  const bas = Math.round(hauteurLibelles) + 30
  const zoneH = H - haut - bas

  const max = Math.max(...valeurs.map((v) => Number(v.valeur)))
  const largeur = Math.min(pas * 0.6, 150)
  const baseY = haut + zoneH

  const barres = valeurs
    .map((v, i) => {
      // L'échelle part de zéro, toujours. Tronquer l'axe ferait passer un écart
      // de cinquante euros entre deux quartiers pour un gouffre — c'est le
      // premier moyen de mentir avec un graphique juste, et un article d'agence
      // qui cite ses propres relevés ne peut pas se le permettre.
      const hauteur = (Number(v.valeur) / max) * zoneH
      const x = gauche + i * pas + (pas - largeur) / 2
      const y = baseY - hauteur
      const centre = x + largeur / 2

      const tailleValeur = valeurs.length > 8 ? 21 : 28
      const libelle = raccourci(v.libelle)

      const texteLibelle = incline
        ? `  <text x="${centre.toFixed(1)}" y="${(baseY + 26).toFixed(1)}" fill="${COULEURS.stone}" fill-opacity="0.7" font-family="ui-monospace, SFMono-Regular, monospace" font-size="${tailleLibelle}" text-anchor="end" transform="rotate(-45 ${centre.toFixed(1)} ${(baseY + 26).toFixed(1)})">${echappe(libelle)}</text>`
        : `  <text x="${centre.toFixed(1)}" y="${(baseY + 40).toFixed(1)}" fill="${COULEURS.stone}" fill-opacity="0.7" font-family="ui-monospace, SFMono-Regular, monospace" font-size="${tailleLibelle}" text-anchor="middle">${echappe(libelle)}</text>`

      // La valeur se pose DANS la barre, pas au-dessus : au-dessus, une barre
      // pleine hauteur la projetait dans le sous-titre.
      return `  <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${largeur.toFixed(1)}" height="${hauteur.toFixed(1)}" fill="${COULEURS.brass}" />
  <text x="${centre.toFixed(1)}" y="${(y + tailleValeur + 12).toFixed(1)}" fill="${COULEURS.ink}" font-family="ui-monospace, SFMono-Regular, monospace" font-size="${tailleValeur}" font-weight="500" text-anchor="middle">${echappe(v.valeur)}</text>
${texteLibelle}`
    })
    .join('\n')

  const titreSvg = lignesTitre
    .map(
      (ligne, i) =>
        `  <text x="${gauche}" y="${hautTitre + i * (tailleTitre + 8)}" fill="${COULEURS.stone}" font-family="Georgia, serif" font-size="${tailleTitre}">${echappe(ligne)}</text>`,
    )
    .join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${H}" width="${L}" height="${H}" role="img" aria-label="${echappe(texteTitre)}">
  <rect width="${L}" height="${H}" fill="${COULEURS.ink}" />
${titreSvg}
  <text x="${gauche}" y="${yUnite}" fill="${COULEURS.brass}" font-family="ui-monospace, SFMono-Regular, monospace" font-size="19" letter-spacing="2.5">${echappe(String(unite ?? '').toUpperCase())}</text>
  <line x1="${gauche}" y1="${baseY}" x2="${L - droite}" y2="${baseY}" stroke="${COULEURS.brass}" stroke-width="1" />
${barres}
  <text x="${L - droite}" y="${H - 14}" fill="${COULEURS.stone}" fill-opacity="0.35" font-family="ui-monospace, SFMono-Regular, monospace" font-size="15" text-anchor="end">échelle à partir de zéro</text>
</svg>
`
}

/**
 * Choisit et produit l'illustration d'un article.
 *
 * `graphique` vient de la rédaction : c'est le modèle qui signale qu'une
 * comparaison chiffrée porte l'article, à partir des seules données réelles
 * qu'on lui a fournies. Deux valeurs au moins, sinon il n'y a rien à comparer
 * et on retombe sur la photo.
 */
export async function illustration({ slug, requeteImage, graphique }, journal = () => {}) {
  if (graphique && Array.isArray(graphique.valeurs) && graphique.valeurs.length >= 2) {
    const svg = graphiqueBarres(graphique)
    await mkdir(DOSSIER_IMAGES, { recursive: true })
    await writeFile(path.join(DOSSIER_IMAGES, `${slug}.svg`), svg, 'utf8')
    journal(`Graphique — ${graphique.valeurs.length} barres, écrit dans public/blog/${slug}.svg`)

    return {
      type: 'graphique',
      src: `/blog/${slug}.svg`,
      alt: graphique.titre,
      credit: `Source : relevés de prix du secteur, ${graphique.releve ?? 'données du site'}.`,
    }
  }

  const requete = requeteImage || 'maison immobilier France'
  return (await unsplash(requete, journal)) ?? (await pexels(requete, journal)) ?? null
}
