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

Les fonctions du dossier `api/` y sont servies elles aussi : un greffon Vite
réservé au développement (`apiDevServer`, dans
[`vite.config.js`](vite.config.js)) les monte sur `/api/*` avec le strict
nécessaire du contrat Vercel. L'outil d'estimation fonctionne donc en local
sans `vercel dev`, et une modification d'une fonction est prise en compte sans
redémarrage.

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

L'outil d'estimation, lui, n'a besoin d'aucune clé : toutes ses sources sont
des services publics ouverts. Deux variables restent facultatives :

| Variable              | Rôle                                                                     |
| --------------------- | ------------------------------------------------------------------------ |
| `ESTIMATION_PRIX_M2`  | Prix de référence au m², en JSON, par code commune INSEE ou par département — utilisés là où DVF n'a aucune donnée (voir « DVF ne couvre pas la Moselle »). Ex. `{"57176":{"maison":1650,"appartement":1400},"57":{"maison":1850}}`. |
| `ESTIMATION_DEBUG`    | À `1`, la réponse joint le détail du calcul (surface retenue, prix au m², nombre de comparables, rayon). À laisser vide en production. |

Pour utiliser un autre prestataire d'envoi (SendGrid, Postmark, SMTP…), seul
l'appel réseau dans `api/contact-conseiller.js` est à adapter ; le contrat
front (`POST /api/contact-conseiller`, réponse `{ ok, error? , errors? }`) peut
rester identique.

**Hors périmètre, volontairement** : la création automatique du prospect dans
Modelo (dépend de l'API Modelo).

## Structure

```
api/
├── contact-conseiller.js   Fonction serverless — envoi du formulaire Équipe
├── estimation.js           Fonction serverless — moteur d'estimation (DVF, + barème Monaco)
├── prix-m2.js              Fonction serverless — prix indicatif au m² (aperçu)
└── _lib/                   Briques du moteur (préfixe `_` : jamais des routes)
    ├── bien.js             Étape A — surface et année du bien (BDNB, cadastre)
    ├── comparables.js      Étapes B et C — ventes comparables, médiane au m²
    ├── dvf.js              Téléchargement, analyse et cache des fichiers DVF
    ├── geo.js              Distances, code département, sondage du pourtour
    └── reference.js        Repli hors couverture DVF (Alsace-Moselle, Mayotte)

src/
├── components/
│   ├── layout/      Navbar, Footer, ScrollToTop
│   ├── ui/          Éléments réutilisables (PlanDivider, PlanFrame,
│   │                PropertyCard, PropertyGrid, Button, DpeScale…)
│   ├── home/        Hero + barre de recherche
│   ├── property/    PropertyListing (Acheter / Louer, avec filtres)
│   ├── estimation/  Parcours d'estimation (accueil, adresse, carte bâtiment,
│   │                variante Monaco, curseur de surface et ses cinq silhouettes)
│   └── team/        ContactConseillerModal (fenêtre de contact individuel)
├── data/
│   ├── properties.json   15 biens fictifs
│   ├── team.js           Conseillers joignables individuellement (page Équipe)
│   ├── projets.js        Natures de projet du formulaire conseiller
│   ├── estimation.js     Étapes d'analyse, encarts d'attente, créneaux de rappel
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
│   ├── monaco.js         Détection Monaco, prix au m² de référence, fourchette
│   ├── geo.js            Emprise au sol d'une géométrie GeoJSON
│   ├── estimation.js     Appel du moteur d'estimation (POST /api/estimation)
│   ├── prixSecteur.js    Prix indicatif au m² du secteur (POST /api/prix-m2)
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
   bâtiment ouvre une **fenêtre modale** « Votre surface habitable », par-dessus
   la page assombrie et floutée : un curseur de 10 à 800 m², une silhouette qui
   change de gabarit avec lui, et un montant d'aperçu qui suit le geste (voir
   « Curseur de surface » plus bas). Un repérage libre — quand les contours
   bâtis sont indisponibles — vaut terrain : pas de fenêtre, la contenance
   cadastrale fait la surface et l'analyse s'enchaîne directement.
   Une adresse **monégasque** saute entièrement cet écran (voir « Monaco »
   plus bas) : ni carte, ni bâtiment à cliquer — la fenêtre de surface s'ouvre
   seule, augmentée d'un choix de type.
4. **Analyse** — enchaînement de trois étapes, barre de progression, encart
   d'attente. Le calcul réel démarre au lancement de cet écran et tourne
   derrière l'animation (voir « Moteur d'estimation » plus bas).
5. **Résultat** — montant flouté, adresse rappelée, invitation à laisser ses
   coordonnées.

### Ce qui reste à brancher

La capture des coordonnées à l'écran 5 fonctionne côté interface mais n'envoie
ni ne sauvegarde rien : ni e-mail, ni création de prospect dans Modelo.

Les durées de l'écran 4 restent purement visuelles (`ANALYSIS_STEPS`,
[`src/data/estimation.js`](src/data/estimation.js)) : le calcul répond en
quelques secondes, l'animation garde ses douze secondes. Elle n'est ni
raccourcie quand la réponse arrive tôt, ni interrompue si elle tarde.

> **Le montant descend aujourd'hui dans la page avant la capture des
> coordonnées.** Le floutage est un `filter: blur()` : il se contourne en trois
> clics dans un inspecteur. Tant que le prix n'est pas retenu côté serveur
> jusqu'à la saisie du contact, le déblocage progressif est un habillage, pas
> une contrepartie.

### Moteur d'estimation

Tout le calcul vit dans [`api/estimation.js`](api/estimation.js) et ses briques
`api/_lib/` — jamais côté client, qui n'envoie que sa sélection et ne reçoit
qu'un montant en euros. Il démarre au clic sur « Obtenir une estimation
instantanée » et répond en 1 à 6 s selon le secteur, très en deçà des 12 s de
l'animation d'analyse.

| Étape | Objet | Source |
| ----- | ----- | ------ |
| **A** | Surface et année du bien | Surface déclarée au curseur ; à défaut BDNB (surface habitable d'un DPE, sinon emprise × niveaux), cadastre pour un terrain |
| | ↳ *niveaux* | BDNB `nb_niveau`, à défaut BD TOPO® `nombre_d_etages`, à défaut déduits de la hauteur du bâtiment |
| **B** | Ventes comparables | [DVF / Etalab](https://files.data.gouv.fr/geo-dvf/) — 1 km, 3 derniers millésimes |
| **C** | Prix médian au m² × surface | — |

**Médiane, jamais moyenne** : sur quelques ventes, une seule transaction hors
norme déplacerait une moyenne de plusieurs dizaines de pour cent.

**Élargissement automatique** — en deçà de cinq ventes comparables, la
recherche s'élargit d'elle-même : 2 km/4 ans, 5 km/5 ans, puis 15 km. Rien n'en
transparaît à l'écran : le parcours est identique qu'il s'agisse d'un
centre-ville couvert par un millier de ventes ou d'un hameau qu'il a fallu
chercher à quinze kilomètres. Les fichiers sont pris **par département** et
gardés en mémoire : élargir le rayon ne coûte alors plus aucune requête.

Trois pièges de la base DVF, tous traités dans
[`api/_lib/dvf.js`](api/_lib/dvf.js) — chacun fausserait le prix au m² d'un
facteur dix :

- **Une vente occupe plusieurs lignes** (une par lot et par parcelle), toutes
  portant le même prix. Diviser un prix par la surface d'une seule ligne est
  l'erreur classique : les lignes sont regroupées par `id_mutation`.
- **Les ventes groupées n'ont pas de prix au m² interprétable** (immeuble de
  rapport, maison + commerce) : seules les mutations portant un seul logement,
  sans local professionnel, sont retenues.
- **Un terrain agricole n'est pas un terrain à bâtir** : dans la Meuse, les
  terres se vendent autour d'1 €/m² contre 15 €/m² pour du sol constructible.
  Seules les natures de culture `S` (sols) et `AB` sont comparables.

#### DVF ne couvre pas la Moselle

**La Moselle (57), le Bas-Rhin (67) et le Haut-Rhin (68) sont absents de DVF**,
à tous les millésimes, ainsi que Mayotte (976) : ces départements relèvent du
livre foncier et non du fichier immobilier de la DGFiP, et leurs mutations ne
sont publiées nulle part en open data. Aucun élargissement du rayon n'y trouvera
quoi que ce soit.

**Le secteur de l'agence est entièrement dans cette zone.** Les estimations y
reposent donc sur les prix de référence de
[`api/_lib/reference.js`](api/_lib/reference.js), qui n'ont d'autre prétention
que l'ordre de grandeur départemental. Ils sont à remplacer par les références
de l'agence via la variable d'environnement `ESTIMATION_PRIX_M2` (voir plus
haut) — c'est la seule façon d'obtenir des chiffres réellement locaux en
Alsace-Moselle.

#### Monaco — parcours simplifié

**Aucune source du moteur ne franchit la frontière monégasque** : ni la BAN, ni
le cadastre IGN, ni la BDNB, ni DVF. Il n'y a donc là-bas ni adresse à
géocoder, ni contour de bâtiment à cliquer, ni vente comparable à médianiser.
D'où un parcours à part, tenu dans [`src/lib/monaco.js`](src/lib/monaco.js) :

| | Parcours français | Parcours monégasque |
| --- | --- | --- |
| Écran bâtiment | Photo aérienne, emprises cliquables | Sauté — [`EstimationMonacoStep`](src/components/estimation/EstimationMonacoStep.jsx) ouvre directement la fenêtre de surface |
| Type de bien | Détecté (cadastre → BDNB → BD TOPO®) | Demandé : appartement ou maison / villa |
| Prix au m² | Médiane DVF du voisinage | Constante `MONACO_PRICE_PER_M2` — **57 500 €**, source [IMSEE](https://www.imsee.mc/), à réviser à la main |
| Calcul | Médiane × surface, avec replis | Constante × surface déclarée, sans repli |
| Fourchette finale | ± 5 % | ± 20 % (`MONACO_RANGE_PCT`) |

**La fourchette élargie n'est pas une précaution de forme** : le marché
monégasque va, selon le quartier et les sources, de ~38 000 € à plus de
100 000 €/m². Une moyenne unique ne peut pas prétendre au resserrement d'une
médiane de ventes voisines. Le reste de l'écran de résultat est identique,
mention « Prix soumis à expertise, hors estimation du terrain » comprise.

**La détection ne peut pas se lire dans la réponse de la BAN**, qui ne connaît
aucune adresse monégasque : interrogée sur « Monte-Carlo, Monaco », elle répond
par des avenues Monte-Carlo à Cannes ou à Toulon. Elle se lit donc dans la
saisie — code postal `98000`, seul code de la Principauté, ou « Monaco » en fin
de saisie, là où s'écrit une commune. Un autre code postal à cinq chiffres
suffit à écarter la piste.

Et surtout : **la Principauté est une proposition de plus dans la liste, jamais
une requalification.** « Boulevard Princesse Grace de Monaco 06300 Nice » ou
« Impasse de Monaco 31100 Toulouse » restent des adresses françaises, et le
basculement demande un choix explicite de l'utilisateur.

### Curseur de surface

La surface est **la seule donnée que l'utilisateur saisisse de tout le
parcours**, et elle pèse linéairement sur le montant : le moteur la fait donc
passer avant toute surface reconstituée depuis les bases (`surfaceSource:
declaree` dans le journal, qui conserve à côté ce qu'aurait donné la géométrie).
La reconstitution reste calculée — elle tourne en parallèle de la recherche DVF,
sans coût de temps propre — et c'est l'écart entre les deux qui dira si la
formule emprise × niveaux vise juste.

Cinq paliers, un dessin par palier : petite maison, pavillon, maison à étage,
grande maison avec piscine, château. Cinq SVG distincts plutôt qu'une forme
qu'on déformerait — à 800 m², ce n'est plus la même maison en plus grand.

**Deux gestes, deux pas.** Le glissement avance de 5 m² — assez fin pour tomber
sur sa surface, assez large pour que la valeur ne tremble pas sous le doigt. Les
boutons « − » et « + » qui encadrent le curseur avancent de **1 m²**, pour
l'ajustement final : 5 m² d'écart sur un deux-pièces, ce n'est pas rien. Ils
font 44 px de côté (la cible tactile recommandée, celle qui dicte déjà la taille
de la pastille) et se désactivent en butée plutôt que de disparaître — une
commande qui s'efface déplacerait le curseur avec elle.

Valeur affichée, montant d'aperçu, remplissage de la piste et silhouette suivent
tous la valeur exacte, au m² près. Seule la pastille reste crantée sur 5 : un
`input[type=range]` recale de toute façon toute valeur hors cran, et elle se
figerait entre deux clics de bouton. L'écart est de 2 m² au pire — un quart de
pixel sur la piste.

**Le montant d'aperçu n'est pas l'estimation.** Il vient d'un second point
d'entrée, volontairement bridé : [`api/prix-m2.js`](api/prix-m2.js) rend un prix
au m² du secteur en un seul rayon, deux millésimes, sans élargissement ni
département voisin — une à deux secondes, contre dix pour le calcul complet. Le
front le multiplie ensuite par la valeur du curseur **dans le navigateur** :
déplacer le curseur ne déclenche aucune requête. Le montant réel le remplace à
l'écran de résultat. Effet de bord utile : les millésimes chargés pour l'aperçu
restent en cache pour l'estimation qui suit, sur la même instance.

Le flou reprend la règle du parcours — premier chiffre net, le reste sous un
flou d'intensité fixe (voir [`PriceReveal`](src/components/estimation/PriceReveal.jsx)).
Ce premier chiffre suit le curseur, et c'est là tout l'intérêt : il donne
l'ordre de grandeur sans donner le montant.

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
d'estimation se sert.

La mention **« © IGN — Géoplateforme »** affichée en bas de la carte est une
obligation de la licence : ne pas la retirer.

### Détection du type de bien

Enchaînée dans [`src/lib/typeBien.js`](src/lib/typeBien.js) au moment où
l'utilisateur sélectionne un bâtiment, pendant que la fenêtre s'ouvre.

**Elle ne s'affiche nulle part** : le type déduit ne sert qu'au calcul
d'estimation, et voyage avec la sélection jusqu'aux écrans suivants — avec la
parcelle et la fiche BDNB obtenues au passage, que le moteur n'a alors plus à
rechercher. Le
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
- Les cinq silhouettes du curseur de surface sont **montées en permanence** et
  superposées : franchir un palier ne fait que changer des opacités, rien n'est
  monté ni démonté. C'est ce qui permet de traverser toute l'échelle d'un geste
  sans à-coup — les paliers sautés restent simplement à zéro. `opacity` et
  `transform` seuls : composite GPU, aucun recalcul de mise en page pendant le
  glissement. Sous `prefers-reduced-motion`, les transitions sont neutralisées
  et le changement devient un remplacement net.
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
