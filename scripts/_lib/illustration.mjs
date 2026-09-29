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
//
// Une clé PRÉSENTE MAIS INUTILISABLE — marqueur `[SENSITIVE]` d'un
// `vercel env pull`, valeur d'exemple — est traitée comme absente, et signalée
// comme telle par un message distinct. Voir `cleUtilisable()`.

import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

import { FORMATS, libelleFormat } from '../../api/_lib/articleTexte.js'
import { DOSSIER_IMAGES, echappe } from './article.mjs'

const DELAI_MS = 10_000

/** Palette du site — reprise de `tailwind.config.js`, à l'identique. */
const COULEURS = { ink: '#10141C', stone: '#EDEAE3', brass: '#B08D57' }

/**
 * Une clé d'API est-elle exploitable, ou n'est-ce qu'un marqueur laissé là ?
 *
 * Écrit après la panne qui a privé le blog d'images sur tout son premier mois.
 * `vercel env pull` rend « [SENSITIVE] » à la place des variables déclarées en
 * type Secret chez Vercel — elles y sont en écriture seule, rien ne les
 * ressort. Ce marqueur de onze caractères s'était retrouvé dans
 * `.env.production` pour les deux clés, et il est PIRE qu'une clé absente :
 * `if (!cle)` le laisse passer, l'appel part avec un jeton qui n'en est pas un,
 * l'API répond 401, et l'étage se saute en annonçant une « réponse 401 » — qui
 * envoie chercher une clé révoquée alors que le problème est qu'il n'y en a
 * jamais eu. Même piège et même parade que pour `ANTHROPIC_API_KEY` dans
 * `_lib/claude-api.mjs`.
 *
 * POURQUOI CETTE FONCTION NE LÈVE PAS, LÀ OÙ CELLE DE CLAUDE-API LÈVE
 *
 * La clé Anthropic est obligatoire : sans elle il n'y a pas d'article, et
 * s'arrêter avant le premier appel est la bonne réponse. Les clés d'images sont
 * facultatives par contrat — l'en-tête de ce fichier l'annonce. Lever ici
 * ferait échouer une génération entière, déjà payée en jetons, pour une photo
 * manquante. Une clé malformée est donc traitée comme une clé absente.
 *
 * Elle ne se contente pas pour autant du même message. « Absente » et
 * « inutilisable » demandent deux gestes différents — créer une clé, ou
 * remplacer un marqueur collé par erreur — et un journal qui les confond fait
 * chercher au mauvais endroit.
 *
 * CE QUE CE CONTRÔLE NE FAIT PAS : valider le format d'Unsplash ou de Pexels.
 * Leurs clés font aujourd'hui 43 et 56 caractères, mais un fournisseur change
 * ses formats sans prévenir, et un contrôle calé sur une longueur exacte
 * rejetterait demain une clé parfaitement valide — panne plus difficile à
 * comprendre que celle qu'il corrige. Il n'écarte donc que ce qui ne peut être
 * aucune clé : une valeur d'exemple, des caractères qu'aucune n'emploie, ou une
 * longueur qu'aucune n'atteint.
 *
 * Aucune valeur n'est journalisée, sauf celles que le test reconnaît comme
 * marqueurs — une clé véritable mais jugée trop courte ne doit pas finir en
 * clair dans les journaux d'une Action.
 */
const MARQUEURS = /^(\[?sensitive\]?|changeme|todo|xxx+|(votre|your)[-_ ]?(cle|clé|key)[-_ ]?(ici|here)?|a[-_ ]?remplir)$/i

function cleUtilisable(nom, etiquette, journal) {
  const brute = process.env[nom]

  if (!brute || !brute.trim()) {
    journal(`${etiquette} — ${nom} absente, étage sauté.`)
    return null
  }

  // Guillemets parfois conservés par un copier-coller depuis un fichier
  // d'environnement : `KEY="abc"` donne `"abc"` une fois lu.
  const cle = brute.trim().replace(/^['"]|['"]$/g, '')

  const raison = MARQUEURS.test(cle)
    ? `valeur d'exemple ou marqueur de masquage (« ${cle} »)`
    : /[\s<>[\]{}"']/.test(cle)
      ? "caractères qu'aucune clé n'emploie (espace, chevron, crochet ou guillemet)"
      : cle.length < 20
        ? `${cle.length} caractères, trop court pour une clé`
        : null

  if (raison) {
    journal(`${etiquette} — ${nom} inutilisable : ${raison}. Étage sauté, aucun appel envoyé.`)
    return null
  }

  return cle
}

/**
 * Photo Unsplash.
 *
 * L'appel à `download_location` n'est pas facultatif : les conditions d'usage
 * de l'API imposent de le déclencher quand une photo est effectivement
 * utilisée, et de créditer l'auteur. Le manquer met le compte en infraction.
 */
async function unsplash(requete, journal, exclure, largeur) {
  const cle = cleUtilisable('UNSPLASH_ACCESS_KEY', 'Unsplash', journal)
  if (!cle) return null

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

  // Première photo NON DÉJÀ RETENUE pour cet article. Sans ce filtre, une
  // requête d'en-tête et une requête de corps proches — « house exterior » et
  // « house interior » — rendent régulièrement le même cliché en tête de
  // classement, et l'article affiche deux fois la même image à trois écrans
  // d'intervalle. L'identifiant du fournisseur sert de clé, pas l'URL : celle-ci
  // porte des paramètres de recadrage qui diffèrent d'un appel à l'autre.
  const photo = (data?.results ?? []).find((r) => r?.id && !exclure?.has(`unsplash:${r.id}`))
  if (!photo) {
    const combien = data?.results?.length ?? 0
    journal(
      combien === 0
        ? `Unsplash — aucun résultat pour « ${requete} », repli sur Pexels.`
        : `Unsplash — les ${combien} résultats pour « ${requete} » sont déjà employés, repli sur Pexels.`,
    )
    return null
  }
  exclure?.add(`unsplash:${photo.id}`)

  // Déclenchement du téléchargement, exigé par les conditions de l'API.
  if (photo.links?.download_location) {
    await fetch(photo.links.download_location, {
      headers: { Authorization: `Client-ID ${cle}` },
      signal: AbortSignal.timeout(DELAI_MS),
    }).catch(() => {})
  }

  const src = `${photo.urls.raw}&auto=format&fit=crop&w=${largeur ?? 1600}&q=70`
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
async function pexels(requete, journal, exclure) {
  const cle = cleUtilisable('PEXELS_API_KEY', 'Pexels', journal)
  if (!cle) return null

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

  const photo = (data?.photos ?? []).find((r) => r?.id && !exclure?.has(`pexels:${r.id}`))
  if (!photo) {
    const combien = data?.photos?.length ?? 0
    journal(
      combien === 0
        ? `Pexels — aucun résultat pour « ${requete} ».`
        : `Pexels — les ${combien} résultats pour « ${requete} » sont déjà employés.`,
    )
    return null
  }
  exclure?.add(`pexels:${photo.id}`)

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
 * Une photo, Unsplash puis Pexels, ou rien.
 *
 * Le repli ne se déclenche pas sur un jugement de pertinence — l'API ne donne
 * aucun indice exploitable là-dessus — mais sur ce qui est vérifiable : aucun
 * résultat, aucun résultat encore libre, ou appel en échec.
 */
async function photo(requete, journal, vues, largeur, role) {
  if (!requete) return null

  const dit = (m) => journal(`${role} — ${m}`)
  const trouvee =
    (await unsplash(requete, dit, vues, largeur).catch((e) => (dit(`Unsplash en échec : ${e.message}`), null))) ??
    (await pexels(requete, dit, vues).catch((e) => (dit(`Pexels en échec : ${e.message}`), null)))

  if (!trouvee) dit(`aucune photo pour « ${requete} ».`)
  return trouvee
}

/**
 * Toutes les illustrations d'un article : en-tête, corps, graphique.
 *
 * CE QUI CHANGE PAR RAPPORT À LA VERSION PRÉCÉDENTE, ET POURQUOI
 *
 * L'ancienne fonction rendait UNE illustration, et le graphique passait avant
 * la photo. Conséquence non voulue mais mécanique : un article de marché
 * recevait son graphique et jamais de photo. Le seul article publié le montre —
 * six sections de texte, un diagramme en barres, aucune image. C'est ce qui
 * faisait que le blog ne ressemblait pas à un blog.
 *
 * Les deux ne sont donc plus en concurrence. L'en-tête est TOUJOURS une photo,
 * quel que soit le format : c'est la vignette de la page de liste, l'aperçu de
 * partage, et la première chose que voit un lecteur. Un graphique en 1200 × 630
 * faisait un aperçu de partage correct mais une vignette illisible, et une
 * entrée en matière austère.
 *
 * Le graphique, lui, descend DANS le corps, à l'endroit que la rédaction
 * désigne — au plus près du passage qui le commente, ce qui est sa place. Et il
 * n'est produit que pour les formats qui l'acceptent : un seul des quatre. La
 * règle est portée par `FORMATS`, pas par un `if` ici, pour qu'il n'y ait qu'un
 * endroit à lire pour savoir qui a droit à quoi.
 *
 * SUR L'ORDRE DES APPELS
 *
 * En-tête d'abord, corps ensuite, en série et non en parallèle. Deux raisons :
 * le jeu d'exclusion qui évite de servir deux fois la même photo doit être
 * rempli avant la requête suivante, et l'application Unsplash est en mode Demo
 * — cinquante requêtes par heure, qu'une rafale parallèle épuiserait plus vite
 * qu'elle ne les économise.
 */
export async function illustrations(
  { slug, format, requeteEnTete, requetesCorps = [], graphique },
  journal = () => {},
) {
  const vues = new Set()

  const enTete = await photo(requeteEnTete, journal, vues, 1600, 'Image d’en-tête')

  // Deux au maximum. Au-delà, l'article devient un album : les images cessent
  // d'appuyer le propos et coupent la lecture.
  const corps = []
  for (const [i, demande] of requetesCorps.slice(0, 2).entries()) {
    const trouvee = await photo(demande?.requete, journal, vues, 1200, `Image de corps ${i + 1}`)
    if (trouvee) corps.push({ ...trouvee, apresSection: Number(demande?.apresSection) || 1 })
  }

  // ── Graphique ──────────────────────────────────────────────────────────
  let dessin = null
  const autorise = FORMATS[format]?.graphique === true
  const exploitable = graphique && Array.isArray(graphique.valeurs) && graphique.valeurs.length >= 2

  if (graphique && !autorise) {
    journal(
      `Graphique — écarté : le format « ${libelleFormat(format)} » n'en accepte pas. ` +
        'Seul l’article de marché le fait.',
    )
  } else if (graphique && !exploitable) {
    journal(`Graphique — écarté : ${graphique.valeurs?.length ?? 0} valeur(s), il en faut deux pour comparer.`)
  } else if (autorise && exploitable) {
    const svg = graphiqueBarres(graphique)
    await mkdir(DOSSIER_IMAGES, { recursive: true })
    await writeFile(path.join(DOSSIER_IMAGES, `${slug}.svg`), svg, 'utf8')
    journal(`Graphique — ${graphique.valeurs.length} barres, écrit dans public/blog/${slug}.svg`)

    dessin = {
      src: `/blog/${slug}.svg`,
      alt: graphique.titre,
      credit: `Source : relevés de prix du secteur, ${graphique.releve ?? 'données du site'}.`,
      apresSection: Number(graphique.apresSection) || 1,
    }
  }

  if (!enTete) {
    journal(
      'Aucune image d’en-tête — l’article est publiable, mais sa vignette et son ' +
        'aperçu de partage seront vides. Vérifiez UNSPLASH_ACCESS_KEY et PEXELS_API_KEY.',
    )
  }

  return { enTete, corps, graphique: dessin }
}
