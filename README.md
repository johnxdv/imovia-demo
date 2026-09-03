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
│   └── team/        ContactConseillerModal (fenêtre de contact individuel)
├── data/
│   ├── properties.json   15 biens fictifs
│   ├── team.js           Conseillers joignables individuellement (page Équipe)
│   ├── projets.js        Natures de projet du formulaire conseiller
│   └── agency.js         Coordonnées, réseaux, carte
├── lib/
│   ├── properties.js     Accès + filtrage des biens
│   ├── format.js         Prix, surface, URLs d'images
│   ├── favorites.jsx     Favoris (localStorage) via Context
│   ├── motion.js         Variants Framer partagés
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
- **Carte** : intégration OpenStreetMap (sans cookie, sans clé).
- **Espace vendeur** : écran de connexion visuel, sans authentification.
```
