// Réglages de la sélection des comparables DVF — un seul endroit.
//
// Tout ce qui se règle à la main dans le moteur d'estimation vit ici :
// bornes de qualité, critères de similarité, cascade de rayons, formes des
// poids, paramètres de l'indice temporel et de l'ajustement de terrain. Les
// modules de calcul n'inventent aucune constante de leur côté — s'il faut
// changer un seuil, il se change ici et nulle part ailleurs.
//
// PÉRIMÈTRE. Ce fichier ne concerne QUE les zones couvertes par DVF. Les
// départements du livre foncier (57, 67, 68) et Mayotte (976) sont servis par
// `reference.js`, qui ne lit rien d'ici et dont la majoration commerciale
// (`MAJORATION_HORS_DVF`) n'a aucun équivalent sur ce chemin-ci.
//
// PRINCIPE DIRECTEUR, dont découle presque tout le reste : **on reste le plus
// près possible du bien.** La similarité est un seuil minimum à franchir, pas
// un score à maximiser. Au-dessus de ce seuil, c'est la proximité qui tranche
// — une vente voisine un peu moins ressemblante en dit plus long qu'une vente
// très ressemblante à deux kilomètres, parce que l'emplacement se négocie
// rue par rue là où la surface se corrige par le calcul.

/** Profondeur d'historique, en années. Au-delà, l'actualisation devient plus fragile que la vente n'est utile. */
export const FENETRE_ANNEES = 5

/**
 * Filtres de qualité, appliqués avant toute comparaison.
 *
 * `bornesPrixM2` sont des bornes absolues, en €/m² : elles écartent la faute
 * de saisie et la vente qui n'en est pas une. Le plancher est passé de 200 à
 * **500 €/m²** — 200 laissait entrer des cessions manifestement hors marché
 * (relevé sur le 13 : une maison de 40 m² à 10 000 €, soit 250 €/m²,
 * retenue comme comparable à 166 m de l'adresse estimée).
 *
 * `ecartMedianeMin/Max` sont un filtre *relatif*, et c'est le plus utile des
 * deux : il se calibre sur le secteur au lieu de supposer un niveau de prix.
 * Une vente à moins de la moitié ou plus du double de la médiane des
 * candidates du secteur ne décrit pas le même marché, quel que soit ce marché.
 */
export const QUALITE = {
  bornesPrixM2: {
    maison: [500, 25000],
    appartement: [500, 25000],
    // Le terrain nu n'est pas visé par la consigne des 500 €/m², qui n'aurait
    // aucun sens sur du sol constructible — ses bornes d'origine sont gardées.
    terrain: [2, 3000],
  },
  bornesSurface: {
    maison: [15, 1000],
    appartement: [8, 500],
    terrain: [50, 20000],
  },
  ecartMedianeMin: 0.5,
  ecartMedianeMax: 2,
}

/**
 * Critères de similarité — **éliminatoires**, pas pondérés.
 *
 * Une vente qui ne les franchit pas n'entre pas dans l'échantillon, même s'il
 * n'y a rien d'autre : le moteur préfère annoncer une confiance faible qu'une
 * médiane bâtie sur des biens qui ne se ressemblent pas. Ces seuils ne sont
 * jamais relâchés pour atteindre le minimum d'échantillon.
 *
 * Les bornes de surface (0,7× à 1,4×) encadrent la cible sans symétrie
 * apparente, et c'est volontaire : le €/m² décroît avec la surface, si bien
 * qu'un comparable plus petit s'écarte plus vite du bien qu'un comparable
 * plus grand. Sur un bien de 100 m², cela donne 70 à 140 m².
 *
 * Le terrain n'est éliminatoire que si **les deux** sont connus. Dans DVF, une
 * `surface_terrain` à 0 ne veut pas dire « pas de terrain » mais « non
 * renseigné » — 10 des 40 comparables du cas marseillais étaient dans ce cas.
 * L'inconnu est donc admis, mais pénalisé dans le poids (voir `POIDS`).
 */
export const SIMILARITE = {
  maison: { surface: [0.7, 1.4], terrain: [0.5, 2.0] },
  appartement: { surface: [0.7, 1.4] },
  // Le terrain nu se compare à lui-même : sa contenance tient le rôle de la
  // surface habitable, et il n'a pas de second terrain à comparer.
  terrain: { surface: [0.5, 2.0] },
}

/**
 * Cascade de rayons, en mètres. **Cumulés** : chaque palier compte les ventes
 * de tous les paliers précédents, une vente à 80 m restant acquise quand on
 * ouvre à 200 m.
 *
 * On s'arrête au premier palier qui atteint `MIN_COMPARABLES` ventes
 * similaires, et on n'élargit jamais au-delà pour en avoir davantage : le
 * gain de précision d'une sixième vente ne compense pas le kilomètre qu'il
 * faut parcourir pour la trouver.
 */
export const RAYONS_M = [100, 200, 300, 500, 1000, 2000]

/** En dessous, l'échantillon ne porte pas une médiane ; on élargit. */
export const MIN_COMPARABLES = 5

/** Au-dessus, seules les mieux notées sont gardées — une médiane cesse de bouger bien avant. */
export const MAX_COMPARABLES = 8

/**
 * Niveaux de confiance, par rayon réellement atteint.
 *
 * Jusqu'à 500 m, l'échantillon décrit le quartier : confiance normale.
 * Au-delà et jusqu'à 2 km, il décrit un secteur : confiance moyenne. Sans
 * échantillon à 2 km, il ne reste que la médiane départementale actualisée :
 * confiance faible. Ces trois niveaux pilotent l'élargissement de la
 * fourchette (voir `FOURCHETTE`), et redescendent dans `meta`.
 */
export const CONFIANCE = {
  rayonNormalMaxM: 500,
  rayonMoyenMaxM: 2000,
}

/**
 * Formes des poids. Chaque facteur rend un nombre dans ]0, 1] ; le poids d'un
 * comparable est leur **produit**.
 *
 * `distance` — `1 / (1 + (d/d0)^p)`. C'est délibérément le facteur le plus
 * fort : avec `d0 = 150` et `p = 2`, une vente vaut 1 sur place, 0,50 à 150 m,
 * 0,20 à 300 m, 0,083 à 500 m et 0,006 à 2 km. Aucun autre facteur ne varie
 * d'un tel rapport, ce qui garantit que la proximité domine la sélection
 * finale même quand la similarité, elle, est déjà acquise.
 *
 * `surface` — `exp(-|ln(Sc/St)| / tolerance)`. L'écart est mesuré en
 * logarithme, donc de façon symétrique : un comparable deux fois plus grand
 * et un comparable deux fois plus petit sont également éloignés. Avec 0,35,
 * un écart de 40 % pèse 0,37.
 *
 * `terrain` — même forme, tolérance plus large : le terrain explique une part
 * bien moindre du prix que la surface habitable, et son ajustement direct
 * (voir `TERRAIN`) en corrige déjà l'essentiel. `penaliteInconnu` s'applique
 * quand DVF ne renseigne pas le terrain du comparable : la vente reste
 * utilisable, elle compte simplement moins.
 *
 * `recence` — décroissance par demi-vie, volontairement faible : l'indice
 * temporel a déjà ramené tous les prix au même semestre, ce facteur ne fait
 * que reconnaître qu'une vente ancienne a été davantage retouchée par le
 * calcul, donc qu'elle est plus incertaine. À 8 ans de demi-vie, une vente de
 * cinq ans pèse encore 0,65.
 */
export const POIDS = {
  distance: { d0M: 150, exposant: 2 },
  surface: { tolerance: 0.35 },
  terrain: { tolerance: 0.7, penaliteInconnu: 0.6 },
  recence: { demiVieAnnees: 8 },
}

/**
 * Indice de prix par semestre, reconstruit sur DVF.
 *
 * `minVentesSemestreCommune` : volume exigé **à chaque semestre** de la
 * fenêtre pour que l'indice soit calculé à l'échelle de la commune plutôt que
 * du département. Un seul semestre creux suffit à retomber au département —
 * un indice qui saute d'un semestre à l'autre fait plus de mal qu'un indice
 * un peu trop large.
 *
 * `lissageSemestres` : moyenne glissante centrée sur 3 semestres. Une médiane
 * semestrielle sur quelques centaines de ventes bouge de plusieurs pour cent
 * par pur bruit d'échantillonnage ; sans lissage, ce bruit se retrouverait
 * tel quel dans le prix de chaque comparable.
 *
 * `coefficientMin/Max` : garde-fous. Un coefficient d'actualisation hors de
 * ces bornes signale un indice défaillant, pas un marché qui a doublé.
 */
export const INDICE = {
  minVentesSemestreCommune: 30,
  lissageSemestres: 3,
  coefficientMin: 0.6,
  coefficientMax: 1.8,
}

/**
 * Ajustement direct du terrain — maisons seulement.
 *
 * RAPPEL MÉTHODOLOGIQUE, à ne pas perdre de vue en relisant `terrain.js` : le
 * €/m² d'une maison dans DVF **contient déjà la valeur de son terrain**, le
 * prix de la mutation entière étant divisé par la seule surface bâtie. Il ne
 * faut donc ni multiplier le terrain par le €/m² habitable, ni ajouter la
 * valeur du terrain du bien au produit obtenu : les deux revenaient à compter
 * le terrain deux fois. Seule la **différence** de terrain entre le bien et
 * ses comparables se valorise.
 *
 * `rayonM` / `minVentes` : l'échantillon qui sert à estimer la valeur du m² de
 * terrain est large et distinct des comparables — une régression sur cinq à
 * huit points ne dirait rien. À défaut de 50 ventes dans le rayon, on élargit
 * à la commune puis au département.
 *
 * `tStatMin` : seuil de significativité du coefficient de terrain. En dessous,
 * ou si le coefficient sort négatif, aucun ajustement n'est appliqué et
 * `meta` le dit. Mieux vaut ne pas corriger que corriger au hasard.
 *
 * `plafondPct` : l'ajustement ne peut pas déplacer le prix de plus de 15 %.
 * C'est une borne de sécurité sur un terme secondaire, pas un réglage fin.
 *
 * `percentileTerrainNu` : sert uniquement à la décomposition lisible
 * bâti / terrain affichée dans `meta`. Aucun effet sur le prix.
 */
export const TERRAIN = {
  rayonM: 2000,
  minVentes: 50,
  tStatMin: 2,
  plafondPct: 0.15,
  percentileTerrainNu: 0.05,
}

/**
 * Fourchette affichée — dispersion réelle des comparables, plus jamais un
 * ±5 % décoratif.
 *
 * Les bornes viennent des quantiles pondérés 25 et 75 des €/m² actualisés de
 * l'échantillon retenu : elles disent ce que les ventes voisines disent, y
 * compris quand elles ne s'accordent pas. `demiLargeurMinPct` garantit qu'une
 * fourchette ne se referme jamais au point de prétendre à une précision qu'une
 * médiane sur cinq à huit ventes n'a pas.
 *
 * `elargissement` multiplie la demi-largeur selon la confiance : un
 * échantillon trouvé à 1,5 km, ou une médiane départementale, doit se lire
 * comme tel.
 */
export const FOURCHETTE = {
  demiLargeurMinPct: 0.05,
  elargissement: { normale: 1, moyenne: 1.5, faible: 2.5 },
}

/**
 * Fiabilité du chargement DVF.
 *
 * `tentatives` / `delaisMs` / `timeoutsMs` : trois essais par fichier, avec
 * un délai et un plafond de temps qui croissent. L'ancien réglage — un seul
 * essai plafonné à 4 s — rendait `[]` en silence sur un simple démarrage à
 * froid, et cet `[]` était indiscernable d'un département sans ventes : le
 * moteur enchaînait alors sur la médiane départementale sans que rien ne le
 * signale (c'est l'origine du 403 000 € au lieu de 489 000 € à Marseille).
 *
 * `budgetTotalMs` : enveloppe de l'étape B tout entière, réessais compris.
 * `vercel.json` accorde à la fonction une durée maximale supérieure.
 */
export const CHARGEMENT = {
  tentatives: 3,
  delaisMs: [0, 400, 1200],
  timeoutsMs: [6000, 9000, 12000],
  budgetTotalMs: 25000,
  concurrence: 4,
}

/**
 * À partir de ce rayon, la zone de recherche peut déborder sur un département
 * voisin — et les fichiers DVF sont rangés par département. Le débordement
 * reste facultatif : l'indisponibilité d'un département voisin n'interrompt
 * pas l'estimation, contrairement à celle du département du bien.
 */
export const RAYON_TRANSFRONTALIER_M = 2000
