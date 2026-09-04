# Imovia — Site vitrine (démonstrateur)

Démonstrateur commercial pour une agence immobilière haut de gamme, à Bordeaux
et sur le Bassin d'Arcachon. Exécution visuelle « plan architectural » : grille
asymétrique, trait de plan qui se dessine au scroll, repères d'angle sur les
cartes, données techniques en monospace.

> Les biens, coordonnées, membres de l'équipe et visuels sont **fictifs**.

## Stack

- **React 18** + **Vite 5**
- **Tailwind CSS 3** (palette et typographies personnalisées)
- **Framer Motion** (révélations au scroll, tracé des traits, parallax)
- **Leaflet** (carte satellite de l'outil d'estimation, chargée à la demande)
- **lucide-react** (icônes)
- **react-router-dom** (routing SPA)
- Données mockées en **JSON**, structurées pour un futur flux XML

## Démarrage local

```bash
npm install
npm run dev
```

Le site est servi sur `http://localhost:5173`.

Autres commandes :

```bash
npm run build     # build de production dans dist/
npm run preview   # prévisualise le build
```

## Déploiement sur Vercel

1. Poussez le dépôt sur GitHub/GitLab.
2. Sur Vercel : **New Project** → importez le dépôt.
3. Framework détecté : **Vite**. Réglages par défaut :
   - Build command : `npm run build`
   - Output directory : `dist`
4. Renseignez les [variables d'environnement](#variables-denvironnement) ci-dessous.
5. Déployez.

Le fichier [`vercel.json`](vercel.json) réécrit toutes les routes vers
`index.html` pour que le routing côté client fonctionne (rafraîchissement d'une
page profonde, liens directs). Les requêtes vers `/api/*` sont résolues en
priorité par les fonctions serverless (voir ci-dessous) : cette réécriture ne
les intercepte pas.

Déploiement en ligne de commande :

```bash
npm i -g vercel
vercel
```

### Variables d'environnement

La page Équipe permet d'écrire directement à un conseiller (Lucas ou Émilie)
via une fenêtre de contact. L'envoi est traité côté serveur par
[`api/contact-conseiller.js`](api/contact-conseiller.js) (fonction serverless
Vercel, service [Resend](https://resend.com)) — **aucune adresse e-mail ne
transite par le code front**. À renseigner dans Vercel (Project Settings →
Environment Variables) :

| Variable                | Rôle                                                              |
| ------------------------ | ------------------------------------------------------------------ |
| `RESEND_API_KEY`         | Clé API Resend utilisée pour l'envoi.                              |
| `CONTACT_EMAIL_LUCAS`    | Adresse pro de Lucas BELLA (destinataire).                         |
| `CONTACT_EMAIL_EMILIE`   | Adresse pro d'Émilie ANDRASCHKE (destinataire).                    |
| `CONTACT_EMAIL_AGENCY`   | Adresse générale de l'agence, mise en copie (facultatif).          |
| `CONTACT_FROM_EMAIL`     | Adresse d'expédition (`Nom <adresse@domaine-verifie.fr>`), sur un domaine vérifié dans Resend. |

Sans `RESEND_API_KEY` ni l'adresse du conseiller ciblé, la fonction répond une
erreur générique côté client et journalise la cause précise côté serveur
(`vercel logs`) — jamais dans la réponse HTTP.

Pour utiliser un autre prestataire d'envoi (SendGrid, Postmark, SMTP…), seul
l'appel réseau dans `api/contact-conseiller.js` est à adapter ; le contrat
front (`POST /api/contact-conseiller`, réponse `{ ok, error? , errors? }`) peut
rester identique.

**Hors périmètre, volontairement** : la création automatique du prospect dans
Modelo (dépend de l'API Modelo).

## Structure

```
api/
└── contact-conseiller.js   Fonction serverless — envoi du formulaire Équipe

src/
├── components/
│   ├── layout/      Navbar, Footer, ScrollToTop
│   ├── ui/          Éléments réutilisables (PlanDivider, PlanFrame,
│   │                PropertyCard, PropertyGrid, Button, DpeScale…)
│   ├── home/        Hero + barre de recherche
│   ├── property/    PropertyListing (Acheter / Louer, avec filtres)
│   ├── estimation/  Parcours d'estimation (accueil, adresse, carte bâtiment)
│   └── team/        ContactConseillerModal (fenêtre de contact individuel)
├── data/
│   ├── properties.json   15 biens fictifs
│   ├── team.js           Conseillers joignables individuellement (page Équipe)
│   ├── projets.js        Natures de projet du formulaire conseiller
│   ├── estimation.js     Étapes d'analyse, encarts d'attente, prix fictif
│   └── agency.js         Coordonnées, réseaux, carte
├── lib/
│   ├── properties.js     Accès + filtrage des biens
│   ├── format.js         Prix, surface, URLs d'images
│   ├── favorites.jsx     Favoris (localStorage) via Context
│   ├── motion.js         Variants Framer partagés
│   ├── adresse.js        API Adresse (BAN) — autocomplétion + coordonnées
│   ├── ign.js            Géoplateforme IGN — orthophotos, bâtiments, parcelles
│   ├── bdnb.js           Base nationale des bâtiments — vocation, logements
│   ├── typeBien.js       Déduction du type de bien + correction manuelle
│   ├── geo.js            Emprise au sol d'une géométrie GeoJSON
│   └── nav.js            Architecture de navigation
└── pages/           Une page par route
```

## Données & futur flux XML

Les biens vivent dans [`src/data/properties.json`](src/data/properties.json).
Chaque bien reprend les champs attendus dans le flux réel :

| Champ JSON          | Signification                              |
| ------------------- | ------------------------------------------ |
| `reference`         | Référence du bien                          |
| `titre`             | Titre commercial                           |
| `typeBien`          | Type de bien (Appartement, Villa…)         |
| `typeTransaction`   | `vente` \| `location`                      |
| `prix`              | Prix (€ ; mensuel en location)             |
| `ville`             | Ville                                      |
| `codePostal`        | Code postal                                |
| `surface`           | Surface habitable (m²)                     |
| `pieces`            | Nombre de pièces                           |
| `chambres`          | Nombre de chambres                         |
| `dpe`               | Classe DPE (A→G)                           |
| `ges`               | Classe GES (A→G)                           |
| `descriptionCourte` | Accroche (une ligne)                       |
| `descriptionLongue` | Description détaillée                       |
| `photos`            | Liste de visuels                           |
| `statut`            | `disponible` \| `vendu`                    |

**Branchement du flux réel (hors périmètre actuel) :** il suffira de remplacer
le contenu de `properties.json` par les données issues du flux XML transformé en
JSON avec ces mêmes clés. Le champ `photos` accepte déjà des **URLs absolues**
(la fonction `photoUrl` dans `src/lib/format.js` les renvoie telles quelles) ;
dans le démonstrateur, ce sont des identifiants Unsplash optimisés à la volée.

## Outil d'estimation

Parcours en cinq écrans successifs dans la page [`/estimer`](src/pages/Estimer.jsx),
sans navigation d'URL entre les étapes :

1. **Accueil** — présentation de l'outil.
2. **Adresse** — autocomplétion sur l'[API Adresse (BAN)](https://adresse.data.gouv.fr/api-doc/adresse),
   service public gratuit et sans clé. Choisir une proposition suffit : les
   coordonnées viennent de la réponse elle-même, et l'écran enchaîne seul.
3. **Bâtiment** — photo aérienne, emprises bâties cliquables. Sélectionner un
   bâtiment ouvre une **fenêtre modale** « Bien confirmé », par-dessus la page
   assombrie et floutée.
4. **Analyse** — enchaînement de trois étapes, barre de progression, encart
   d'attente.
5. **Résultat** — montant flouté, adresse rappelée, invitation à laisser ses
   coordonnées.

### Ce qui reste à brancher

L'écran 4 ne calcule rien : les durées viennent de `ANALYSIS_STEPS`
([`src/data/estimation.js`](src/data/estimation.js)) et n'ont qu'une fonction
d'habillage. Le montant affiché à l'écran 5 est tiré au hasard entre 200 000 €
et 450 000 € par `placeholderEstimate()`, en attendant le calcul réel sur la
base DVF. Le bouton « Voir mon estimation » et la capture des coordonnées ne
sont pas encore reliés.

> **À la mise en service du vrai calcul** : le montant ne doit plus descendre
> dans la page avant que les coordonnées aient été saisies. Le floutage est un
> `filter: blur()`, contourné en trois clics dans un inspecteur — il masque un
> chiffre de démonstration, il ne protégera pas une vraie estimation.

### Sources cartographiques

Tout vient de la [Géoplateforme IGN](https://geoservices.ign.fr) — gratuite,
sans clé, sous licence ouverte Etalab :

| Usage             | Service | Couche                             |
| ----------------- | ------- | ---------------------------------- |
| Fond satellite    | WMTS    | `ORTHOIMAGERY.ORTHOPHOTOS`         |
| Emprises bâties   | WFS     | `BDTOPO_V3:batiment`               |

L'API Carto « cadastre » ne publie pas d'emprises bâties (`/api/cadastre/batiment`
répond 404) ; c'est la BD TOPO® qui les porte. Elle est de surcroît levée par
photogrammétrie sur ces mêmes orthophotos — donc calée dessus — et expose déjà
les attributs (usage, étages, hauteur, nombre de logements) dont le calcul
d'estimation aura besoin.

La mention **« © IGN — Géoplateforme »** affichée en bas de la carte est une
obligation de la licence : ne pas la retirer.

### Détection du type de bien

Enchaînée dans [`src/lib/typeBien.js`](src/lib/typeBien.js) au moment où
l'utilisateur sélectionne un bâtiment, pendant que la fenêtre s'ouvre.

**Elle ne s'affiche nulle part** : le type déduit ne sert qu'au futur calcul
d'estimation, et voyage avec la sélection jusqu'aux écrans suivants. Le
correcteur manuel a donc été retiré de l'interface ; `MANUAL_TYPE_IDS` et
`typeDetecte()` restent en place pour le jour où il refera surface.

La chaîne :

1. **Parcelle cadastrale** sous le point cliqué — API Carto
   (`/api/cadastre/parcelle`), interrogée avec une géométrie `Point`.
2. **Fiches BDNB** de cette parcelle — [api.bdnb.io](https://bdnb.io), ouverte
   et sans clé. `usage_principal_bdnb_open` et `nb_log` donnent le type.
3. **Repli BD TOPO®** (`usage_1`, `nombre_de_logements`) quand la BDNB ne
   connaît pas le bâtiment — fréquent sur les constructions récentes.

Un repérage libre (sans contour) sur une parcelle cadastrée vaut **terrain nu**.
Rien ne lève jamais, et rien ne bloque : la fenêtre s'ouvre immédiatement et
reste utilisable quoi qu'il advienne du réseau. Un type indéterminé remonte
`null` plutôt qu'une valeur par défaut — l'écran suivant ne doit pas prendre un
type pour acquis.

Trois pièges rencontrés, tous contournés dans le code :

- L'API BDNB **ne filtre pas par bbox** — c'est un PostgREST, `bbox=` y est lu
  comme un nom de colonne. Le rapprochement passe donc par l'identifiant de
  parcelle. Le filtre commune est indispensable : sans lui, la requête balaie la
  table nationale et expire en 504.
- À **Paris, Lyon et Marseille**, l'API Carto renvoie le code de la ville
  (`75056`) là où le cadastre et la BDNB raisonnent par arrondissement
  (`75104`). Le code retenu est celui des cinq premiers caractères de l'IDU.
- La BDNB publie ses géométries en **Lambert-93**, inexploitables sans
  reprojection. Quand une parcelle porte plusieurs bâtiments, le bon est
  retrouvé en comparant les **surfaces au sol** ([`src/lib/geo.js`](src/lib/geo.js)),
  faute d'identifiant commun entre BD TOPO® et BDNB.

L'API BDNB plafonne par ailleurs ses réponses à **10 lignes**, quel que soit le
`limit` demandé — sans conséquence ici, une parcelle dépassant rarement ce
nombre de bâtiments.

### Points d'attention

- Les orthophotos s'arrêtent au **zoom 19** (~20 cm/pixel). Au-delà, Leaflet
  étire la dalle de 19 (`maxNativeZoom`) plutôt que d'en demander une qui
  n'existe pas.
- Les emprises sont chargées **une fois**, dans un rayon de 150 m autour de
  l'adresse ; la carte est bornée à cette zone (`maxBounds`) pour qu'on ne
  puisse pas sortir du bâti chargé.
- **Sans emprise disponible** (zone non couverte, service en panne), l'écran
  bascule sur un repérage libre : un clic n'importe où sur la photo vaut
  sélection. L'utilisateur n'est jamais bloqué.
- **Sans survol** (tactile), un premier appui présélectionne, un second confirme.
- Leaflet et la carte sont dans un **chunk séparé**, chargé seulement à
  l'étape 3 (amorcé dès l'étape adresse) : les autres pages n'en portent rien.
- Le décor « chiffre en train de se former » de la fenêtre de confirmation est
  **purement ornemental** : rien n'est calculé à ce stade. Tout est animé en CSS
  sur `opacity` et `transform` seuls — composite GPU, aucun recalcul de mise en
  page. Sous `prefers-reduced-motion`, les animations sont neutralisées et les
  éléments retombent sur leur style de base, donc visibles et immobiles.
- La fenêtre de confirmation se positionne en `fixed` **sans portail**, parce
  que Framer Motion laisse `transform: none` sur l'étape au repos. Pendant la
  transition vers l'écran suivant, l'étape reprend un `transform` et la fenêtre
  glisse alors avec la page — l'enchaînement recherché. Déplacer ce composant
  hors de l'étape casserait ce comportement.
- La barre de progression de l'écran 4 se remplit en **une seule transition
  CSS** sur toute la durée, et non par paliers. Sous `prefers-reduced-motion`,
  où le filet CSS global neutralise les transitions, elle repasse aux paliers —
  sans quoi elle sauterait d'un coup à 100 %.
- Les surcharges CSS de Leaflet vivent **hors `@layer`** dans
  [`src/index.css`](src/index.css) — Tailwind élaguerait sinon des règles dont
  les classes n'apparaissent nulle part dans le JSX.

## Système de design

Palette (dans [`tailwind.config.js`](tailwind.config.js)) :

| Rôle                         | Nom          | Hex       |
| ---------------------------- | ------------ | --------- |
| Fond principal sombre        | `ink`        | `#10141C` |
| Fond clair (sections)        | `stone`      | `#EDEAE3` |
| Accent unique (CTA, liens)   | `brass`      | `#B08D57` |
| Accent secondaire (icônes)   | `bottle`     | `#1F3B2E` |
| Cartes sur fond sombre       | blanc pur    | `#FFFFFF` |

Typographies : **Fraunces** (titres), **Inter** (texte), **IBM Plex Mono**
(données, chiffres tabulaires).

Élément signature : le composant [`PlanDivider`](src/components/ui/PlanDivider.jsx)
trace une fine ligne Brass au scroll ; [`PlanFrame`](src/components/ui/PlanFrame.jsx)
pose les repères d'angle façon plan sur les cartes et les visuels.

## Accessibilité & performance

- Focus clavier visible partout (`:focus-visible`, filet Brass).
- `prefers-reduced-motion` respecté (Framer + filet CSS).
- Images en `srcset`/`sizes`, `loading="lazy"`, largeurs et qualité maîtrisées.
- Aucune dépendance superflue.

## Notes de production

- **Polices** : chargées via Google Fonts. Pour une conformité RGPD stricte,
  les auto-héberger (par ex. `@fontsource/fraunces`, `@fontsource/inter`,
  `@fontsource/ibm-plex-mono`).
- **Formulaires** (Contact, Recrutement) : sans back-end à ce stade. Contact
  affiche une confirmation côté client ; Recrutement compose un e-mail
  (`mailto:`). À brancher sur un service d'envoi le moment venu. Le formulaire
  de contact individuel de la page Équipe fait exception : il passe déjà par
  un vrai back-end (voir [Variables d'environnement](#variables-denvironnement)).
- **Cartes** : la carte de contact utilise OpenStreetMap ; l'outil d'estimation
  utilise la Géoplateforme IGN. Les deux sont sans cookie et sans clé.
- **Espace vendeur** : écran de connexion visuel, sans authentification.
```
