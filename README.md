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
- Biens synchronisés depuis le **flux XML Modelo Office** (import « annule et remplace »)

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

L'import du flux Modelo, lui, a besoin de l'adresse du flux — laquelle vaut
jeton d'accès et n'est donc pas versionnée :

| Variable           | Rôle                                                                            |
| ------------------ | ------------------------------------------------------------------------------- |
| `MODELO_FEED_URL`  | URL du flux XML Modelo Office. Secret de dépôt côté intégration continue, fichier `.env` en local (voir `.env.example`). Sans elle, `npm run sync:modelo` s'arrête en l'expliquant. |

L'outil d'estimation, lui, n'a besoin d'aucune clé : toutes ses sources sont
des services publics ouverts. Deux variables restent facultatives :

| Variable              | Rôle                                                                     |
| --------------------- | ------------------------------------------------------------------------ |
| `ESTIMATION_PRIX_M2`  | Prix de référence au m², en JSON, par code commune INSEE ou par département — utilisés là où DVF n'a aucune donnée (voir « DVF ne couvre pas la Moselle »). Ex. `{"57176":{"maison":1650,"appartement":1400},"57":{"maison":1850}}`. |
| `ESTIMATION_DEBUG`    | À `1`, la réponse joint le détail du calcul (type retenu et sa confiance, surface, étage et son coefficient, prix au m², nombre de comparables, rayon du palier et étendue réelle). À laisser vide en production. |

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

scripts/
├── sync-modelo.mjs         Import du flux Modelo — « annule et remplace »
├── check-api-imports.mjs   Contrôle de chargement des fonctions serverless
└── _lib/
    ├── xml.mjs             Lecture XML ordonnée, entités, balises absentes
    └── modelo.mjs          Mapping `<bien>` Modelo → modèle Immovia

src/
├── components/
│   ├── layout/      Navbar, Footer, ScrollToTop
│   ├── ui/          Éléments réutilisables (PlanDivider, PlanFrame,
│   │                PropertyCard, PropertyGrid, Button, DpeScale…)
│   ├── home/        Hero + barre de recherche
│   ├── property/    PropertyListing (Acheter / Louer, avec filtres)
│   ├── estimation/  Parcours d'estimation (accueil, adresse, carte bâtiment
│   │                France et Monaco, curseur de surface et ses cinq
│   │                silhouettes, InkScene — le tracé à l'encre)
│   └── team/        ContactConseillerModal (fenêtre de contact individuel)
├── data/
│   ├── properties.json   Biens diffusés — produit par `npm run sync:modelo`
│   ├── team.js           Conseillers joignables individuellement (page Équipe)
│   ├── projets.js        Natures de projet du formulaire conseiller
│   ├── estimation.js     Étapes d'analyse, encarts d'attente, créneaux de rappel
│   ├── inkScenes.js      Dessins à l'encre : la demeure de l'étape adresse,
│   │                     et le pool de dix scènes de l'écran d'analyse
│   └── agency.js         Coordonnées, réseaux, carte
├── lib/
│   ├── properties.js     Accès + filtrage des biens
│   ├── format.js         Prix, surface, URLs d'images
│   ├── favorites.jsx     Favoris (localStorage) via Context
│   ├── motion.js         Variants Framer partagés
│   ├── adresse.js        API Adresse (BAN) — autocomplétion + coordonnées
│   ├── ign.js            Géoplateforme IGN — orthophotos, bâtiments, parcelles
│   ├── bdnb.js           Base nationale des bâtiments — vocation, logements
│   ├── typeBien.js       Déduction du type de bien (tranche toujours) + arbitrage
│   ├── etage.js          Étage d'un appartement — champ du parcours et barème
│   ├── monaco.js         Détection Monaco, prix au m² de référence, fourchette
│   ├── osm.js            OpenStreetMap / Overpass — contours bâtis monégasques
│   ├── geo.js            Emprise au sol, emprise carrée, point dans un anneau
│   ├── estimation.js     Appel du moteur d'estimation (POST /api/estimation)
│   ├── prixSecteur.js    Prix indicatif au m² du secteur (POST /api/prix-m2)
│   └── nav.js            Architecture de navigation
└── pages/           Une page par route
```

## Données & flux Modelo

Les biens vivent dans [`src/data/properties.json`](src/data/properties.json).
**Ce fichier n'est plus écrit à la main** : il est entièrement produit par
l'import du flux XML Modelo Office.

```bash
npm run sync:modelo             # import réel
npm run sync:modelo -- --essai  # affiche ce qui changerait, sans rien écrire
```

### Annule et remplace

Chaque fichier servi par Modelo décrit l'état **complet** des annonces à
diffuser à cet instant, jamais une liste de changements. L'import reconstruit
donc `properties.json` intégralement, à partir du seul flux — d'où découlent,
sans aucune logique de rapprochement :

| Situation                                | Conséquence                                  |
| ---------------------------------------- | -------------------------------------------- |
| Bien nouveau dans le flux                | créé                                          |
| Bien déjà connu                          | réécrit depuis le flux                        |
| Bien absent du dernier flux              | retiré de la diffusion                        |
| Balise disparue depuis le dernier import | le champ vaut `null`, jamais l'ancienne valeur |

L'identifiant stable est `reference_technique`, jamais la référence affichable —
celle-ci peut suivre un changement de négociateur. Le compte rendu affiché en
fin d'import (« 2 créés, 14 mis à jour, 1 retiré ») ne sert qu'à rendre compte :
il n'influe pas sur le contenu écrit.

### Balises absentes, vides, à zéro

Une balise absente, vide ou blanche vaut **donnée non renseignée**, jamais une
erreur : le champ devient `null` et l'import continue. Un mandat incomplet côté
agence ne fait jamais tomber les autres biens.

`0` en revanche **est une valeur** et se conserve telle quelle : un `etage` à 0
est un rez-de-chaussée, un `nb_terrasse` à 0 dit qu'il n'y en a pas. C'est à
l'affichage de choisir de les taire.

Trois anomalies sont signalées et écartées plutôt que publiées : un bien sans
référence affichable (aucune URL possible), une référence en doublon (les deux
biens se masqueraient l'un l'autre), et un flux répondant sans le moindre bien
diffusable — ce dernier cas interrompt l'import et **conserve le catalogue en
place**, un `--autoriser-flux-vide` étant nécessaire pour vider réellement le
site. Même prudence sur une erreur HTTP ou une racine `<biens>` introuvable :
mieux vaut l'état du dernier import réussi qu'une page « aucun bien ».

### Valeurs brutes, jamais `_formatee`

Le flux double la plupart des champs : `prix` (`99000.00`) et `prix_formatee`
(`99000.00 €`). Le choix est fait **une fois pour toutes en faveur des valeurs
brutes**, sur toute la ligne — le site formate déjà à la française via `Intl`
([`src/lib/format.js`](src/lib/format.js)), là où les versions `_formatee`
arrivent en notation anglo-saxonne et préfixées de leur libellé. Aucun champ ne
mélange les deux sources.

### Deux subtilités du flux

**`<details_pieces>` n'est pas structuré.** Les balises `<piece>`, `<surface>`
et `<niveau>` s'y succèdent à plat, sans regroupement : seul leur ordre
d'apparition associe une surface à une pièce. Le parseur lit donc le XML en
préservant l'ordre du document (`preserveOrder`) et réassocie les triplets
lui-même. Un triplet incomplet laisse le champ manquant à `null` sans désaligner
la suite de la liste.

**Les entités HTML survivent aux CDATA.** La spécification XML interdit de les
interpréter à l'intérieur d'un `CDATA` : « Salon S&eacute;jour » arrive
littéralement. Elles sont décodées à la lecture
([`scripts/_lib/xml.mjs`](scripts/_lib/xml.mjs)). Même logique pour les `<br>`
de `description`, convertis en sauts de ligne réels — le site rend ces textes en
`whitespace-pre-line`.

### Ce que devient chaque champ

L'import produit les clés historiques du modèle (celles que consomment déjà les
composants), complétées par tout ce que transmet le flux. Le mapping intégral
est dans [`scripts/_lib/modelo.mjs`](scripts/_lib/modelo.mjs) ; en voici les
arbitrages qui ne vont pas de soi :

| Clé Immovia         | Source Modelo                    | Arbitrage                                                            |
| ------------------- | -------------------------------- | -------------------------------------------------------------------- |
| `reference`         | `reference_a_afficher`           | Compose les URLs `/bien/:reference`                                  |
| `referenceTechnique`| `reference_technique`            | Clé stable du « annule et remplace », jamais affichée                |
| `prix`              | `loyer` en location, `prix` sinon | Les deux champs bruts restent disponibles (`loyer`, `prixVente`)     |
| `descriptionLongue` | `description_impression`         | Repli sur `description`. Voir la note ci-dessous                     |
| `typeTransaction`   | `type_annonce`                   | « Viager » et « Vente à terme » rejoignent `vente`                   |
| `statut`            | `etat`                           | 1 → `disponible`, 2 → `sous-compromis`, 3 → `vendu`                  |
| `datePublication`   | `date_mise_en_ligne`             | Repli sur `date_creation`. Ordonne l'accueil et « Biens récents »    |
| `photos`            | `images`                         | Triées par l'attribut `id`, qui porte l'ordre d'affichage voulu      |
| `dateDisponibilite` | `date_disponibilite`             | `1970-01-01T01:00:00+01:00` (époque Unix) vaut « non saisie » → `null` |

> **Pourquoi `description_impression` plutôt que `description`.** Le champ
> `description` se termine par les mentions réglementaires en dur — honoraires,
> copropriété, classes DPE, Géorisques. Or le site les regénère déjà à partir
> des données (`InfosComplementaires`, `EnergyDiagnostic`) : les reprendre
> afficherait deux fois les mêmes phrases. `description_impression` en est
> exempte. Les deux textes restent accessibles sous `description` et
> `descriptionImpression`.

### Import périodique

Modelo n'expose aucun webhook : le flux est interrogé sur horaire fixe par
[`.github/workflows/sync-modelo.yml`](.github/workflows/sync-modelo.yml), qui
commite `properties.json` sur `main` — c'est ce commit qui déclenche le
redéploiement Vercel. Le site n'interroge jamais Modelo lui-même : il sert un
fichier déjà construit, sans dépendance réseau au moment de la visite.

L'horaire est `0 14 * * *` — **un seul passage par jour**, à la demande du
client. `cron` s'exprimant en UTC et ignorant l'heure d'été, cela vaut 15 h à
Paris en hiver, 16 h en été. L'onglet *Actions* permet de déclencher un import
à la demande.

> **Marge courte, assumée.** Le flux côté Modelo se régénère vers 14 h : ce
> passage unique ne laisse donc qu'environ une heure après cette régénération,
> alors que la documentation Modelo précise que les passerelles sont traitées
> les unes après les autres et peuvent être mises à disposition en retard. Si
> un bien nouvellement diffusé n'apparaît pas le jour même, c'est très
> probablement la cause — il sera repris au passage du lendemain. Décaler
> l'heure relève d'une décision du client.

**Mise en service :** l'URL du flux vaut jeton d'accès, elle n'est pas
versionnée. Déclarer le secret de dépôt `MODELO_FEED_URL` (*Settings → Secrets
and variables → Actions*) ; en local, copier [`.env.example`](.env.example) en
`.env` et y coller la même adresse.

### Deux comportements à confirmer avec le client

1. **Les biens vendus ou loués (`etat` 3) restent-ils visibles ?** Ils le sont
   aujourd'hui, marqués « Vendu » — le site sait déjà les présenter ainsi
   (pastille sur la carte et la fiche, rubrique dédiée dans le plan du site).
   Basculer `RETIRER_LES_BIENS_VENDUS` à `true` dans
   [`scripts/_lib/modelo.mjs`](scripts/_lib/modelo.mjs) les retire du fichier
   produit, et donc du site, sans autre modification.
2. **Les biens sous compromis (`etat` 2) restent listés**, marqués « Sous
   compromis » : la vente n'est pas signée et l'usage de la profession est de
   les montrer. La liste `STATUTS_DIFFUSES` de
   [`src/lib/properties.js`](src/lib/properties.js) gouverne ce choix.

## Outil d'estimation

Parcours en cinq écrans successifs dans la page [`/estimer`](src/pages/Estimer.jsx),
sans navigation d'URL entre les étapes :

1. **Accueil** — présentation de l'outil.
2. **Adresse** — autocomplétion sur l'[API Adresse (BAN)](https://adresse.data.gouv.fr/api-doc/adresse),
   service public gratuit et sans clé. Choisir une proposition suffit : les
   coordonnées viennent de la réponse elle-même, et l'écran enchaîne seul.
   Derrière le titre, une demeure d'architecte se trace à l'encre en six
   secondes (`INK_VILLA`, voir « Dessins à l'encre » plus bas).
3. **Bâtiment** — photo aérienne, emprises bâties cliquables, l'adresse
   géocodée signalée par un marqueur au logo de l'agence (voir « Repère de
   l'adresse sur la carte » plus bas). Sélectionner un
   bâtiment ouvre une **fenêtre modale** « Votre surface habitable », par-dessus
   la page assombrie et floutée : un curseur de 10 à 800 m², une silhouette qui
   change de gabarit avec lui, et un montant d'aperçu qui suit le geste (voir
   « Curseur de surface » plus bas). **Ce qui est demandé dépend du type
   détecté** : une maison n'y déclare que sa surface habitable — sa surface de
   terrain est la contenance cadastrale, déjà connue — là où un appartement se
   voit demander en plus son **étage** (voir « Étage » plus bas). Un repérage
   libre — quand les contours bâtis sont indisponibles — vaut terrain : pas de
   fenêtre, la contenance cadastrale fait la surface et l'analyse s'enchaîne
   directement.
   Une adresse **monégasque** suit le même écran, avec des contours venus
   d'OpenStreetMap plutôt que de la BD TOPO® (voir « Monaco » plus bas), et une
   fenêtre de surface augmentée d'un choix de type. Un repérage libre y ouvre
   la fenêtre lui aussi : sans contenance cadastrale à lire, le curseur reste
   la seule source de surface.
4. **Analyse** — enchaînement de trois étapes, barre de progression, encart
   d'attente. Le calcul réel démarre au lancement de cet écran et tourne
   derrière l'animation (voir « Moteur d'estimation » plus bas). En tête
   d'écran, deux scènes tirées au sort se tracent l'une après l'autre — six
   secondes chacune, soit exactement la durée de l'analyse.
5. **Résultat** — montant flouté, adresse rappelée, invitation à laisser ses
   coordonnées. La conversation de capture se tient sur un fond de formes qui
   dérivent ([`ChatAmbience`](src/components/ui/ChatAmbience.jsx)). Une fois la
   fourchette affichée, un **cachet rond noir**
   ([`PriceStamp`](src/components/estimation/PriceStamp.jsx)) est frappé sous
   les deux bornes : il descend, s'écrase, rebondit, tient une seconde, puis se
   relève et s'efface. Il porte « prix soumis à expertise » et « hors
   estimation du terrain », sur deux lignes dans la couronne.

   > **Ces deux mentions ne sont donc affichées nulle part de façon
   > permanente** : elles passent avec le cachet, qui se démonte de lui-même à
   > la dernière image. Le choix est assumé — c'est un geste, pas une mention
   > légale — mais il est à reprendre le jour où l'estimation engagera
   > l'agence.

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
| **B** | Ventes comparables | [DVF / Etalab](https://files.data.gouv.fr/geo-dvf/) — 300 m, 4 derniers millésimes, 40 ventes les plus proches |
| **C** | Prix médian au m² × surface | — |
| | ↳ *étage* | Coefficient 0,95 (RDC) à 1,05 (étage élevé), appartements seulement — [`src/lib/etage.js`](src/lib/etage.js) |

**Médiane, jamais moyenne** : sur quelques ventes, une seule transaction hors
norme déplacerait une moyenne de plusieurs dizaines de pour cent.

**La recherche part du pâté de maisons** — 300 m, quatre millésimes, quatre
ventes suffisent — et ne s'élargit qu'à défaut : 600 m, 1,2 km, 3 km, 8 km,
15 km, le seuil d'échantillon montant avec le rayon. Rien n'en transparaît à
l'écran : le parcours est identique qu'il s'agisse d'un centre-ville couvert par
un millier de ventes ou d'un hameau qu'il a fallu chercher à quinze kilomètres.
Les fichiers sont pris **par département** et gardés en mémoire : élargir le
rayon ne coûte alors plus aucune requête.

Quel que soit le palier atteint, seules les **40 ventes les plus proches** sont
retenues. C'est ce qui recentre la médiane sur le quartier sans qu'aucun palier
ait à le prévoir : en tissu dense, ces quarante ventes tiennent en une centaine
de mètres ; dans le pavillonnaire, elles vont chercher jusqu'à 800 m.

#### Pourquoi si serré — la dilution géographique

Le premier palier valait 1 km, avec cinq ventes pour seuil : deux conditions
qu'une ville dense remplit toujours, et de très loin. Un disque d'un kilomètre
autour d'une adresse lyonnaise contient **trois mille ventes** réparties sur
trois ou quatre quartiers ; la médiane qui en sortait n'était pas celle de la
rue, mais celle de l'arrondissement. Mesuré sur DVF (69, 33, 92, cinq
millésimes), en écart au prix réellement observé dans les 250 m :

| Adresse | Avant (1 km) | Après (300 m, 40 plus proches) |
| --- | --- | --- |
| Lyon 3e — Part-Dieu | **+17,9 %** | +1,2 % |
| Bordeaux — Chartrons | −9,7 % | +3,0 % |
| Neuilly-sur-Seine | −5,2 % | −3,8 % |
| Gennevilliers | +4,4 % | +0,7 % |
| Vaulx-en-Velin (maison) | −6,8 % | −1,8 % |
| Écully (maison) | +0,4 % | +1,4 % |

L'erreur d'avant n'allait pas toujours dans le même sens, ce qui est pire qu'un
biais : elle était imprévisible et ne se rattrapait pas.

**L'arbitrage retenu est de remonter dans le temps plutôt que de s'éloigner dans
l'espace.** Un millésime de plus fait entrer une dérive de marché de quelques
pour cent par an ; un kilomètre de plus en fait entrer vingt-cinq d'un coup.
D'où un rayon serré, un échantillon plus court assumé — quatre ventes du même
pâté de maisons valent mieux que cinquante ventes de la commune entière — et une
profondeur d'historique portée à cinq millésimes.

L'aperçu de la fenêtre de surface ([`api/prix-m2.js`](api/prix-m2.js)) suit les
mêmes paliers en plus courts : ce sont deux chiffres montrés au même utilisateur
à quelques secondes d'intervalle, et l'aperçu n'a rien à gagner à annoncer le
prix du quartier d'à côté.

**Ce que ce resserrement coûte** : là où un programme neuf vient d'être livré,
les quarante ventes les plus proches peuvent être quarante VEFA du même immeuble,
et la médiane monte avec elles. C'est le prix d'une médiane hyperlocale, et il se
paie sciemment — l'inverse revenait à estimer chaque bien au prix moyen de sa
commune.

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
le cadastre IGN, ni la BDNB, ni DVF. OpenStreetMap en comble deux — les adresses
par Nominatim, les contours de bâtiments par l'API Overpass
([`src/lib/osm.js`](src/lib/osm.js)) — si bien que l'utilisateur retrouve sa rue
puis clique son immeuble comme en France, sur la même orthophoto IGN (la
Principauté tient dans l'emprise photographiée).

Le troisième manque ne se comble pas : le cadastre monégasque ne se diffuse que
sur papier, extrait par extrait, et aucune base de mutations n'y est publiée. Ni
surface habitable à lire, ni vente comparable à médianiser. D'où ce qui reste de
simplifié au parcours, tenu dans [`src/lib/monaco.js`](src/lib/monaco.js) :

| | Parcours français | Parcours monégasque |
| --- | --- | --- |
| Écran bâtiment | Photo aérienne, emprises BD TOPO® cliquables | Même écran, emprises OpenStreetMap — [`EstimationMonacoStep`](src/components/estimation/EstimationMonacoStep.jsx) |
| Repérage libre | Vaut terrain : pas de fenêtre, contenance cadastrale | Ouvre la fenêtre de surface, comme un bâtiment |
| Type de bien | Détecté (cadastre → BDNB → BD TOPO®, arbitrage à défaut) | Demandé : appartement ou maison / villa |
| Étage | Demandé aux appartements, coefficient 0,95 à 1,05 | Identique — même fenêtre, même barème |
| Prix au m² | Médiane DVF du voisinage | Constante `MONACO_PRICE_PER_M2` — **57 500 €**, source [IMSEE](https://www.imsee.mc/), à réviser à la main |
| Calcul | Médiane × surface, avec replis | Constante × surface déclarée, sans repli |
| Fourchette finale | ± 5 % | ± 20 % (`MONACO_RANGE_PCT`) |

**La fourchette élargie n'est pas une précaution de forme** : le marché
monégasque va, selon le quartier et les sources, de ~38 000 € à plus de
100 000 €/m². Une moyenne unique ne peut pas prétendre au resserrement d'une
médiane de ventes voisines. Le reste de l'écran de résultat est identique,
cachet frappé sous la fourchette compris.

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

### Étage

**La seconde et dernière donnée saisie du parcours**, demandée dans la même
fenêtre que la surface et aux seuls appartements — aucune base publique ne
descend au logement, ni la BDNB ni la BD TOPO® ne connaissent que le bâtiment.
Le champ apparaît quand la détection du type aboutit, quelques centaines de
millisecondes après l'ouverture, et se déplie plutôt qu'il n'apparaît d'un coup.

Le barème vit dans [`src/lib/etage.js`](src/lib/etage.js), partagé entre l'aperçu
de la fenêtre et le calcul final — sans quoi le montant sauterait entre les deux
écrans sans que rien ne l'explique :

| Étage | Coefficient |
| --- | --- |
| Rez-de-chaussée | 0,95 |
| 1er | 0,985 |
| 2e (référence, valeur d'ouverture) | 1,00 |
| 3e et au-delà | +0,8 point par étage, plafonné à 1,05 |

**Onze points d'écart en tout**, et c'est volontaire. La décote du
rez-de-chaussée (vis-à-vis, bruit, sécurité) va de 5 à 10 % selon les études : on
retient la borne basse. La prime des étages élevés est plafonnée pour une raison
précise — elle ne vaut qu'avec un ascenseur, dont **rien ne dit s'il existe**, et
un cinquième sans ascenseur se vend moins cher qu'un deuxième, pas plus. Le
plafond est le prix de cette ignorance assumée.

La valeur d'ouverture est celle dont le coefficient vaut exactement 1 : un champ
apparu tard et laissé tel quel ne déplace le montant ni dans un sens ni dans
l'autre. Un étage absent — maison, terrain, détection non aboutie — vaut lui
aussi coefficient 1.

**Rien d'autre n'est demandé, et rien d'autre n'est deviné.** Ni vue, ni étage
terminal, ni ascenseur, ni exposition : aucune source fiable n'existe à l'échelle
d'un bien, et une estimation de ces éléments introduirait une fausse précision
plutôt qu'une vraie amélioration.

### Sources cartographiques

L'essentiel vient de la [Géoplateforme IGN](https://geoservices.ign.fr) —
gratuite, sans clé, sous licence ouverte Etalab :

| Usage                       | Service | Couche                     |
| --------------------------- | ------- | -------------------------- |
| Fond satellite              | WMTS    | `ORTHOIMAGERY.ORTHOPHOTOS` |
| Emprises bâties (France)    | WFS     | `BDTOPO_V3:batiment`       |
| Emprises bâties (Monaco)    | [Overpass](https://overpass-api.de) | OpenStreetMap, objets `building` |

L'API Carto « cadastre » ne publie pas d'emprises bâties (`/api/cadastre/batiment`
répond 404) ; c'est la BD TOPO® qui les porte. Elle est de surcroît levée par
photogrammétrie sur ces mêmes orthophotos — donc calée dessus — et expose déjà
les attributs (usage, étages, hauteur, nombre de logements) dont le calcul
d'estimation se sert.

La BD TOPO® s'arrêtant à la frontière, la Principauté emprunte ses contours à
OpenStreetMap. L'orthophoto, elle, reste celle de l'IGN : l'emprise
photographiée couvre la bande frontalière, et Monaco y tient tout entière. La
requête part du navigateur — Overpass sert un en-tête CORS ouvert et plafonne
par adresse IP, si bien que chaque visiteur consomme son propre quota au lieu de
partager celui de l'hébergeur. Deux instances sont essayées à la suite, les
serveurs publics étant bénévoles ; si aucune ne répond, la carte bascule sur son
repli et l'utilisateur désigne son bien à main levée.

Les mentions **« © IGN — Géoplateforme »** et, en Principauté,
**« © OpenStreetMap (ODbL) »** affichées en bas de la carte sont des obligations
de licence : ne pas les retirer.

### Détection du type de bien

Enchaînée dans [`src/lib/typeBien.js`](src/lib/typeBien.js) au moment où
l'utilisateur sélectionne un bâtiment, pendant que la fenêtre s'ouvre.

**Elle ne s'affiche nulle part** : le type déduit ne sert qu'au calcul
d'estimation — et à décider si la fenêtre demande un étage — puis voyage avec la
sélection jusqu'aux écrans suivants, avec la parcelle et la fiche BDNB obtenues
au passage, que le moteur n'a alors plus à rechercher. Le correcteur manuel a été
retiré de l'interface ; `MANUAL_TYPE_IDS` et `typeDetecte()` restent en place
pour le jour où il refera surface.

**Elle n'immobilise rien.** Le seul usage *visible* du type — faut-il demander
son étage ? — n'attend pas le réseau : `typeImmediat()` répond sur-le-champ, à
partir des attributs BD TOPO® déjà arrivés avec le polygone cliqué et du gabarit
du bâtiment. La chaîne complète, elle, enchaîne cadastre puis BDNB, deux
allers-retours en série qui prennent **environ deux secondes** ; faire attendre
le champ étage tout ce temps, c'était le tenir sur une précision dont il n'a
pas besoin. La chaîne reprend la main dès qu'elle aboutit, et c'est sa réponse —
la mieux établie — qui descend au moteur. Les deux s'accordent dans l'immense
majorité des cas : la BDNB affine un nombre de logements, elle contredit
rarement une vocation déclarée.

**Elle tranche toujours.** Aucune branche ne renvoie de type indéterminé, aucune
ne suspend le parcours à une précision demandée à l'utilisateur : il n'y a
personne à qui la demander — le type ne lui est jamais montré — et un type
indéterminé ne fait pas moins de dégâts qu'un type faux, puisqu'il aligne
l'estimation sur une médiane tous logements confondus, c'est-à-dire sur le marché
de personne. Entre deux réponses incertaines, la moins incertaine vaut mieux
qu'aucune, **même à 51 %**.

La chaîne :

1. **Parcelle cadastrale** sous le point cliqué — API Carto
   (`/api/cadastre/parcelle`), interrogée avec une géométrie `Point`.
2. **Fiches BDNB** de cette parcelle — [api.bdnb.io](https://bdnb.io), ouverte
   et sans clé. `usage_principal_bdnb_open` et `nb_log` donnent le type.
3. **Repli BD TOPO®** (`usage_1`, `nombre_de_logements`) quand la BDNB ne
   connaît pas le bâtiment — fréquent sur les constructions récentes.
4. **Arbitrage** quand plus aucune base ne parle — voir plus bas.

Un repérage libre (sans contour) vaut **terrain**. Rien ne lève jamais hors
annulation par l'utilisateur, et rien ne bloque : la fenêtre s'ouvre
immédiatement et reste utilisable quoi qu'il advienne du réseau. Cadastre et
BDNB sont chacun plafonnés à **4 secondes** — la BDNB n'a aucun contrat de
service et il lui arrive de ne pas répondre du tout (constaté : plus de douze
secondes sans un octet), ce qui immobilisait la détection, donc le champ étage
qui en dépend, puis tout le budget du moteur derrière.

**Confiance** — chaque réponse porte son degré (`CONFIANCES`) :

| Degré | Quand |
| --- | --- |
| `haute` | La base *dit* la vocation : nomenclature explicite, ou logements réellement comptés |
| `moyenne` | Présomption : vocation générique, comptage absent, immeuble mixte |
| `nulle` | Aucune source — l'arbitrage a tranché seul |

Elle ne conditionne **jamais** le parcours : elle qualifie la réponse sans la
suspendre, part au journal du moteur (`typeConfiance`), et sert d'aiguillage
interne — c'est l'absence de source, et elle seule, qui déclenche l'arbitrage.

**L'arbitrage** (`arbitreTypeResidentiel`) somme des log-odds sur les seuls
indices géométriques — gabarit du bâtiment (niveaux comptés ou hauteur mesurée,
le plus parlant des deux) et emprise au sol — par-dessus une part de collectif
dans le parc d'environ 41 %. La probabilité la plus élevée l'emporte, aussi
faible que soit son avance, et redescend avec le type dans le journal.

Retenir « le plus parlant des deux » n'est pas un raffinement : la BD TOPO®
déclare volontiers **un étage sur un bâtiment de 27 m**, son `nombre_d_etages`
valant 1 par défaut là où il n'a pas été levé. Une hauteur mesurée ne doit jamais
se laisser annuler par un comptage absent.

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

### Dessins à l'encre

Le parcours est illustré par un seul système de dessin : **du trait noir sur
fond clair, tracé progressivement, sans un seul aplat de couleur**. Trois
pièces, et rien d'autre à connaître.

| Pièce | Rôle |
| --- | --- |
| [`src/index.css`](src/index.css) (`.imv-ink-trait`) | Le procédé : deux règles `@keyframes`, un `stroke-dashoffset` qui se résorbe |
| [`InkScene`](src/components/estimation/InkScene.jsx) | Le minutage : répartit les traits d'une scène sur la durée demandée |
| [`src/data/inkScenes.js`](src/data/inkScenes.js) | Les dessins : une `viewBox` et une liste de tracés, dans l'ordre de la main |

**`pathLength="1"` est ce qui rend le procédé praticable.** Il normalise la
longueur de n'importe quel tracé à 1, si bien qu'un seul jeu d'images-clés
suffit du plus petit meneau à la ligne d'horizon. Sans lui, il faudrait mesurer
chaque `<path>` en JavaScript (`getTotalLength`) et écrire son
`stroke-dasharray` à la main — une mesure par trait, au montage, sur les
quelque deux cent cinquante tracés du lot.

**Les dessins sont des données, pas du JSX.** L'ordre du tableau *est* l'ordre
du tracé : le sol avant les murs, les murs avant les menuiseries, le décor en
dernier. Écrits en composants, c'était onze fichiers à relire pour changer une
règle de style, et autant d'endroits où l'ordre de tracé pouvait diverger du
minutage.

Le registre est tenu, pas décoratif : volumes rectilignes, dalles en débord,
baies toute hauteur, refends marqués — **des angles droits, jamais d'arrondi
contemporain**. Les seules courbes de tout le fichier sont végétales, ou les
poivrières du château, qui n'est pas une maison d'architecte et n'a pas à en
prendre les lignes.

#### Où ils apparaissent

| Écran | Ce qui s'y trace | Durée |
| --- | --- | --- |
| Adresse | `INK_VILLA` — une demeure d'architecte, derrière le titre | 6 s, une fois |
| Analyse | Deux scènes tirées parmi dix, gauche puis droite | 6 s + 6 s |
| Curseur de surface | [`HouseIllustration`](src/components/estimation/HouseIllustration.jsx) — cinq paliers, en fondu | aucune, voir plus bas |

L'écran d'analyse tire **deux scènes distinctes** parmi les dix du pool
(`tirageScenes`) : la gauche se trace pendant la première moitié de l'analyse,
la droite pendant la seconde. Quarante-cinq paires possibles — relancer trois
fois une estimation donne trois écrans différents. Les trois durées sont liées
(`SCENE_S = TOTAL_MS / 2000`) : allonger une étape d'`ANALYSIS_STEPS` sans
toucher à celle-ci laisserait l'écran fini avant le calcul.

Les silhouettes du curseur, elles, **ne se tracent pas** : elles doivent
répondre au doigt, pas se dérouler. Un tracé progressif relancé à chaque cran
ne montrerait jamais qu'un début de maison — d'où un fondu enchaîné entre cinq
dessins montés en permanence.

Sous `prefers-reduced-motion`, le filet CSS global ramène les durées à zéro :
`animation-fill-mode: forwards` fige alors chaque trait sur son image finale, et
le dessin **s'affiche achevé** plutôt que de ne jamais se tracer.

Reste, hors de ce système, [`ChatAmbience`](src/components/ui/ChatAmbience.jsx) :
quelques formes qui dérivent derrière les bulles de la conversation, sur 17 à
31 secondes. Volontairement pauvre en détail — c'est le seul endroit du parcours
où l'utilisateur écrit, et un décor qui attire l'œil y coûterait une saisie.

### Repère de l'adresse sur la carte

Le marqueur de l'étape bâtiment est un `divIcon` (`marqueurAdresse` dans
[`BuildingMap`](src/components/estimation/BuildingMap.jsx)) : une goutte de
localisation surmontée du logo de l'agence, la pointe posée sur la coordonnée
géocodée.

Une pastille de cinq pixels s'y perdait : sur une orthophoto, un petit disque
coloré se confond avec une voiture, un velux, une tache de toiture. Or c'est
**le point de repère de l'utilisateur** — ce à partir de quoi il identifie son
bien parmi les emprises voisines.

Le logo est posé sur une plaque sombre plutôt qu'à même la photo : il est blanc,
et une orthophoto n'a aucune couleur garantie sous lui — un toit en zinc clair
ou une allée de gravier le feraient disparaître. Même raison pour la goutte,
remplie en Ink et cernée d'or clair : ni l'un ni l'autre ne suffit seul sur un
fond qu'on ne maîtrise pas.

L'habillage vit dans [`src/index.css`](src/index.css) (`.imv-marqueur`), hors
de tout `@layer` : Leaflet pose ce balisage à l'exécution, il n'apparaît dans
aucun fichier scanné par Tailwind.

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
- Le marqueur d'adresse réutilise [`src/assets/logo.png`](src/assets/logo.png),
  le logo déjà en place dans la navbar — **le fichier annoncé comme « à
  transmettre séparément » n'a pas été reçu**. Le remplacer suffit : aucune
  dimension n'est écrite en dur, la plaque se cale sur la hauteur de l'image.
- Leaflet et la carte sont dans un **chunk séparé**, chargé seulement à
  l'étape 3 (amorcé dès l'étape adresse) : les autres pages n'en portent rien.
- Le retour en arrière ([`StepBackLink`](src/components/estimation/StepBackLink.jsx))
  passe en haut à gauche de la fenêtre au-delà de 1024 px et reste dans le flux
  en deçà : la colonne du parcours étant centrée et étroite, un retour aligné
  sur son bord gauche flottait au milieu de l'écran sans se rattacher à rien.
  Le `lg:fixed` tient pour la même raison que le positionnement de la fenêtre
  de surface — Framer Motion laisse `transform: none` sur l'étape au repos,
  donc aucun ancêtre transformé ne vient le requalifier en `absolute`.
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

**Largeur sur grand écran.** `maxWidth.content` vaut 1848 px — la valeur
d'origine (1320) majorée de 40 %, à la demande du client : la mise en page
tenait dans une bande étroite au milieu d'un 27 pouces. Les écrans du parcours
d'estimation suivent le même facteur par des variantes `lg:` (l'étape adresse
passe de `max-w-2xl` à `59rem`, la carte de `max-w-3xl` à `67rem`, etc.), et
les grilles de biens gagnent une quatrième colonne au-delà de 1536 px plutôt
que d'étirer les cartes. **Rien ne change sous ~1024 px** : la largeur
disponible y reste la contrainte la plus serrée, et le mobile est intouché.

**Voix typographique du parcours d'estimation.** **Fraunces** n'y est plus
réservée aux titres : les questions posées à l'utilisateur, les
sous-titres et les libellés de CTA y passent aussi. IBM Plex Mono reste la voix
des étiquettes techniques (kickers, bornes du curseur, retours en arrière) ;
Inter, celle des blocs de texte longs. Le serif en capitales espacées d'un
bouton se lit comme une adresse gravée, là où le mono passait pour une
interface d'outil.

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
  utilise la Géoplateforme IGN, plus OpenStreetMap (Nominatim et Overpass) pour
  les adresses et les contours monégasques. Tous sont sans cookie et sans clé.
- **Espace vendeur** : écran de connexion visuel, sans authentification.
```
