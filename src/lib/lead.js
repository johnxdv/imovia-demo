/**
 * Transmission du lead d'estimation à l'agence (`api/lead.js`).
 *
 * DÉLIBÉRÉMENT SANS `await`, ET SANS JAMAIS LEVER.
 *
 * Ce qui compte à cet instant du parcours, c'est que le prix se déflouttage
 * sous les yeux du visiteur : il vient de donner son numéro pour ça. Une boîte
 * aux lettres injoignable, une clé d'API expirée ou un réseau coupé ne doivent
 * ni retarder cette bascule, ni y afficher le moindre message — le visiteur
 * n'a rien à réparer, et l'incident ne le regarde pas. Il est journalisé là où
 * quelqu'un peut en faire quelque chose : côté serveur.
 *
 * `keepalive` parce que l'écran change dans la foulée : sans lui, un navigateur
 * a le droit d'abandonner une requête dont la vue d'origine a disparu.
 */
export function envoyerLead(lead) {
  try {
    fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // `JSON.stringify` sur une valeur circulaire, `fetch` absent : rien de tout
    // cela ne doit remonter jusqu'à l'écran.
  }
}
