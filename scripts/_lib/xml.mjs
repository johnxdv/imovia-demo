// Lecture du flux XML Modelo — briques bas niveau, sans aucune connaissance
// du métier immobilier (ce rôle revient à `modelo.mjs`).
//
// Deux partis pris dictent tout ce fichier :
//
// 1. **L'ordre du document fait foi.** `<details_pieces>` entremêle des
//    `<piece>`, `<surface>` et `<niveau>` sans les grouper : seul leur ordre
//    d'apparition dit quelle surface appartient à quelle pièce. Le parseur est
//    donc configuré en `preserveOrder`, et les nœuds sont lus à travers les
//    accesseurs ci-dessous plutôt que comme un objet JavaScript ordinaire.
//
// 2. **Une balise absente ou vide n'est jamais une erreur.** C'est une donnée
//    non renseignée pour ce bien. Tous les accesseurs renvoient `null` dans ce
//    cas — jamais `undefined`, jamais une exception, jamais `NaN`.

import { XMLParser } from 'fast-xml-parser'

// `parseTagValue: false` est indispensable : laissé à sa valeur par défaut, le
// parseur convertirait tout seul les nombres, et un code postal « 01000 »
// deviendrait l'entier 1000. Chaque conversion est faite ici, explicitement.
const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
})

// Entités nommées de la plage Latin-1 (points de code 160 à 255), dans
// l'ordre. Le flux les laisse telles quelles à l'intérieur des CDATA — « Salon
// S&eacute;jour » nous arrive littéralement — car la spécification XML y
// interdit toute interprétation. À nous de les rendre lisibles.
const LATIN1 =
  'nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml'.split(
    ' ',
  )

const ENTITIES = new Map([
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"],
  ...LATIN1.map((name, i) => [name, String.fromCodePoint(160 + i)]),
  // Ponctuation typographique et symboles courants des annonces.
  ['euro', '€'],
  ['hellip', '…'],
  ['ndash', '–'],
  ['mdash', '—'],
  ['lsquo', '‘'],
  ['rsquo', '’'],
  ['ldquo', '“'],
  ['rdquo', '”'],
  ['bull', '•'],
  ['trade', '™'],
  ['OElig', 'Œ'],
  ['oelig', 'œ'],
])

/** Remplace les entités HTML/XML (`&eacute;`, `&#233;`, `&#xE9;`) par leur caractère. */
export function decodeEntities(value) {
  if (!value.includes('&')) return value
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (match, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10)
      // Un point de code hors plage Unicode ferait lever `fromCodePoint` : on
      // préfère rendre l'entité intacte plutôt que d'interrompre l'import.
      return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
    }
    return ENTITIES.get(body) ?? match
  })
}

/**
 * Nom de la balise portée par une entrée ordonnée. Le parseur range les
 * attributs sous la clé `:@`, qui n'est donc pas un nom de balise.
 */
function tagName(entry) {
  for (const key of Object.keys(entry)) if (key !== ':@') return key
  return null
}

/**
 * Texte brut d'une entrée. Une balise auto-fermante (`<climatisations/>`)
 * n'a aucun enfant, une balise à CDATA vide en a un dont le texte est « » :
 * les deux valent « non renseigné ».
 */
function rawText(entry) {
  if (entry == null) return null
  const name = tagName(entry)
  if (!name) return null
  const children = entry[name]
  if (!Array.isArray(children)) return null
  const node = children.find((child) => '#text' in child)
  return node == null ? null : String(node['#text'])
}

/**
 * Enveloppe un nœud pour le lire par nom de balise, en O(1), sans jamais
 * échouer sur une balise absente.
 */
function reader(entries) {
  const byName = new Map()
  for (const entry of entries) {
    const name = tagName(entry)
    if (!name) continue
    const bucket = byName.get(name)
    if (bucket) bucket.push(entry)
    else byName.set(name, [entry])
  }

  const first = (name) => byName.get(name)?.[0] ?? null

  return {
    /** Texte nettoyé, ou `null` si la balise est absente, vide ou blanche. */
    text(name) {
      return cleanText(rawText(first(name)))
    },

    /** Sous-nœud lisible à son tour (`<images>`, `<details_pieces>`…). */
    child(name) {
      const children = first(name)?.[name]
      return reader(Array.isArray(children) ? children : [])
    },

    /**
     * Toutes les occurrences d'une balise, dans l'ordre du document, avec
     * leurs attributs — `<image id="3">` et ses semblables.
     */
    list(name) {
      return (byName.get(name) ?? []).map((entry) => ({
        text: cleanText(rawText(entry)),
        attr: (attribute) => {
          const value = entry[':@']?.[`@_${attribute}`]
          return value == null ? null : cleanText(String(value))
        },
      }))
    },

    /**
     * Regroupe une suite de balises entremêlées en enregistrements, d'après
     * leur seul ordre d'apparition — c'est ainsi, et seulement ainsi, que
     * `<details_pieces>` associe une surface et un niveau à chaque pièce.
     *
     * La première balise de `names` ouvre un enregistrement : un triplet
     * incomplet décale donc les champs manquants à `null` au lieu de
     * désaligner tout le reste de la liste.
     */
    sequence(names) {
      const [lead] = names
      const records = []
      let current = null

      for (const entry of entries) {
        const name = tagName(entry)
        if (!names.includes(name)) continue
        if (name === lead || current === null) {
          current = Object.fromEntries(names.map((key) => [key, null]))
          records.push(current)
        }
        if (current[name] == null) current[name] = cleanText(rawText(entry))
      }

      return records
    },
  }
}

/** Décode, normalise les fins de ligne et renvoie `null` pour une chaîne vide. */
export function cleanText(value) {
  if (value == null) return null
  const text = decodeEntities(String(value)).replace(/\r\n?/g, '\n').trim()
  return text === '' ? null : text
}

/**
 * Découpe le flux en biens. Renvoie un `reader` par `<bien>`, dans l'ordre du
 * fichier. Lève si la racine n'est pas celle attendue : un flux tronqué ou une
 * page d'erreur HTML servie à la place du XML doit interrompre l'import, pas
 * vider le catalogue (voir la garde de `sync-modelo.mjs`).
 */
export function parseBiens(xml) {
  const tree = parser.parse(xml)
  const racine = tree.find((entry) => tagName(entry) === 'biens')
  if (!racine) throw new Error('racine <biens> introuvable — le flux n’est pas celui attendu')

  return racine.biens
    .filter((entry) => tagName(entry) === 'bien')
    .map((entry) => reader(entry.bien))
}
