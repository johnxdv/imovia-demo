// Fonction serverless Vercel — moteur d'estimation.
//
// Reçoit le bâtiment repéré sur la carte et renvoie un montant en euros, sa
// fourchette et un niveau de confiance. Tout le calcul vit ici : le front ne
// connaît ni les sources de données, ni la méthode, ni les paliers
// d'élargissement.
//
// La Principauté de Monaco court-circuite tout cela : aucune des sources n'y
// publie quoi que ce soit, et le montant s'y calcule d'une multiplication par
// un prix au m² de référence (voir `../src/lib/monaco.js`).
//
//   A. Caractéristiques du bien       → `_lib/bien.js`          (BDNB, cadastre)
//   B. Sélection des comparables      → `_lib/comparables.js`   (DVF / Etalab)
//      ├ indice de prix par semestre  → `_lib/indice.js`
//      └ valeur du m² de terrain      → `_lib/terrain.js`
//   C. Prix, ajustement, fourchette   → ci-dessous
//   D. Zones hors couverture DVF      → `_lib/reference.js`
//
// CE QUI PEUT ÉCHOUER, ET CE QUI NE PEUT PAS. Une panne technique de DVF
// **interrompt** désormais l'estimation, avec une erreur explicite que le front
// traduit par « estimation momentanément indisponible ». C'est un renversement
// assumé : l'ancienne version repliait silencieusement sur la médiane
// départementale, et une maison marseillaise estimée 489 000 € par son
// voisinage ressortait à 403 000 € sans que rien, nulle part, ne le signale.
// Un chiffre faux et muet coûte plus cher qu'un écran qui demande de réessayer.
//
// Le repli départemental existe toujours, mais pour le seul cas légitime : les
// données sont chargées, et il n'y a pas cinq ventes similaires à deux
// kilomètres. Il descend alors en confiance « faible » avec une fourchette
// large, et le dit.
//
// Les zones hors couverture DVF (57, 67, 68, 976) ne sont pas concernées par
// tout ceci : elles passent par `reference.js`, dont rien n'a changé.

import { describeBien } from './_lib/bien.js'
import { DvfIndisponible } from './_lib/dvf.js'
import { selectionComparables } from './_lib/comparables.js'
import { communeAtPoint, departementFromInsee } from './_lib/geo.js'
import { estHorsCouvertureDvf, majoreHorsDvf, prixReference } from './_lib/reference.js'
import { ajustementTerrain, estimeValeurTerrain, valeurM2Terrain } from './_lib/terrain.js'
import { semestreLabel } from './_lib/dvf.js'
import { CHARGEMENT, FOURCHETTE, TERRAIN } from './_lib/estimationConfig.js'
import { arbitreTypeResidentiel, detectPropertyType } from '../src/lib/typeBien.js'
import { coefficientEtage, normaliseEtage } from '../src/lib/etage.js'
import { MONACO_PRICE_PER_M2, MONACO_RANGE_PCT } from '../src/lib/monaco.js'

/**
 * Budgets de temps.
 *
 * L'étape B a le sien, `CHARGEMENT.budgetTotalMs` (25 s), réessais compris :
 * elle est de loin la plus lourde, et c'est elle qui a besoin de place pour
 * réessayer plutôt que d'abandonner en silence. Le budget global lui laisse
 * quelques secondes de marge pour l'étape A et la mise en forme.
 *
 * `vercel.json` accorde à la fonction une `maxDuration` supérieure à ce budget
 * global : sans quoi Vercel la tuerait avant qu'elle n'ait pu rendre son
 * erreur explicite, et le front ne verrait qu'un `504` muet.
 *
 * L'écran de chargement du front dure 12 s puis **attend** la réponse (voir
 * `showResult` dans `src/pages/Estimer.jsx`) : un calcul long retarde
 * l'affichage, il ne le casse pas.
 */
const BUDGET_MS = 30000

/**
 * Bornes de la surface déclarée au curseur, alignées sur celles de la fenêtre
 * qui la recueille (`BuildingConfirmModal`). Le curseur ne peut rien produire
 * en dehors — la vérification vise une requête forgée, pas l'utilisateur.
 */
const SURFACE_DECLAREE_RANGE = [10, 800]

/**
 * Surface saisie par l'utilisateur, ou `null` si le champ est absent ou
 * aberrant.
 *
 * Elle n'est plus seulement préférée aux reconstitutions des bases : elle est
 * désormais **obligatoire**. La géométrie se trompe d'un facteur qui se paie
 * intégralement dans le montant — sur la maison marseillaise de contrôle,
 * emprise × niveaux × ratio habitable rendait 39 m² là où le bien en fait 100,
 * soit une estimation à 191 000 € au lieu de 489 000 €. Mieux vaut refuser de
 * calculer que multiplier un prix au m² juste par une surface fausse.
 */
function surfaceDeclaree(value) {
  const surface = Number(value)
  const [min, max] = SURFACE_DECLAREE_RANGE

  return Number.isFinite(surface) && surface >= min && surface <= max ? surface : null
}

/**
 * Types que le moteur sait traiter. Le type descend du navigateur, où il a été
 * détecté pendant le repérage ; tout ce qui n'est pas dans cette liste est
 * traité comme une absence — et redétecté ici, plutôt que suivi les yeux
 * fermés jusque dans le choix des comparables.
 */
const TYPES_CONNUS = new Set(['maison', 'appartement', 'terrain', 'local'])

const typeRecu = (value) => (TYPES_CONNUS.has(value) ? value : null)

/** Bornes du montant renvoyé — au-delà, le calcul relève de la donnée aberrante. */
const PRICE_RANGE = [15000, 20000000]

const clampPrice = (value) => Math.min(Math.max(value, PRICE_RANGE[0]), PRICE_RANGE[1])

/**
 * Le montant est arrondi au millier : une estimation au dernier euro
 * afficherait une précision qu'elle n'a pas.
 */
const round = (value) => Math.round(value / 1000) * 1000

/** Borne de fourchette — au millier au-delà de 100 000 €, à la centaine en deçà. */
const arrondiBorne = (value) => {
  const pas = value >= 100000 ? 1000 : 100
  return Math.round(value / pas) * pas
}

function badRequest(res, message, code) {
  return res.status(400).json({ ok: false, error: message, code })
}

/**
 * Fourchette autour d'un montant, à partir d'une dispersion en €/m².
 *
 * Les bornes viennent des quantiles pondérés 25 et 75 de l'échantillon retenu,
 * converties en euros par la même formule que le prix lui-même — ajustement de
 * terrain compris, puisqu'il s'applique identiquement aux trois. La
 * demi-largeur est ensuite élargie selon la confiance, et ne descend jamais
 * sous `FOURCHETTE.demiLargeurMinPct` : une médiane sur cinq à huit ventes ne
 * peut pas prétendre mieux, même quand ces ventes s'accordent parfaitement.
 */
function fourchetteDepuisQuantiles({ prix, quantiles, versEuros, confiance }) {
  const facteur = FOURCHETTE.elargissement[confiance] ?? 1
  const minimum = prix * FOURCHETTE.demiLargeurMinPct

  const basBrut = quantiles?.q25 != null ? versEuros(quantiles.q25) : null
  const hautBrut = quantiles?.q75 != null ? versEuros(quantiles.q75) : null

  const demiBas = Math.max(basBrut != null ? (prix - basBrut) * facteur : 0, minimum)
  const demiHaut = Math.max(hautBrut != null ? (hautBrut - prix) * facteur : 0, minimum)

  return {
    low: arrondiBorne(Math.max(prix - demiBas, PRICE_RANGE[0])),
    high: arrondiBorne(Math.min(prix + demiHaut, PRICE_RANGE[1])),
  }
}

/** Fourchette symétrique en pourcentage — pour Monaco et les prix de référence. */
function fourchetteSymetrique(prix, pct) {
  return { low: arrondiBorne(prix * (1 - pct)), high: arrondiBorne(prix * (1 + pct)) }
}

/**
 * Étape B + C pour une zone couverte par DVF.
 *
 * Lève `DvfIndisponible` si le département du bien n'a pas pu être chargé.
 * Rend `null` si, données en main, aucune médiane n'a pu être calculée — cas
 * théorique (un département sans la moindre vente du type) que l'appelant
 * traite comme une indisponibilité plutôt que d'inventer un chiffre.
 */
async function calculeDepuisDvf(cible, { signal, journal }) {
  const selection = await selectionComparables(cible, { signal, journal })

  if (!selection.prixM2) {
    // Les fichiers sont là mais ne contiennent aucune vente de ce type dans
    // tout le département : il n'y a rien à estimer, et le repli départemental
    // n'y changerait rien puisque c'est exactement ce qu'il calculerait.
    return null
  }

  return selection
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée.' })
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const lat = Number(body.lat)
  const lon = Number(body.lon)

  // Monaco d'abord, et avant même la vérification des coordonnées : elles ne
  // serviraient à rien ici — ni commune INSEE, ni département, ni millésime DVF
  // ne répondraient de l'autre côté de la frontière.
  if (body.monaco === true) {
    const type = body.type === 'maison' ? 'maison' : 'appartement'
    const surfaceM2 = surfaceDeclaree(body.surfaceM2)

    // Même exigence qu'en France : pas de surface déclarée, pas de prix. Le
    // barème monégasque n'est qu'une multiplication, et une multiplication par
    // une surface supposée ne vaut rien.
    if (surfaceM2 === null) {
      return badRequest(res, 'Surface habitable manquante.', 'surface-manquante')
    }

    const etage = type === 'appartement' ? normaliseEtage(body.etage) : null
    const coefficient = coefficientEtage(etage)

    // Pas de bornage ici, contrairement au calcul français : les facteurs sont
    // déjà bornés — la surface par le curseur (10 à 800 m²), le prix au m² par
    // une constante, l'étage par un barème qui ne s'écarte jamais de 5 % de 1.
    const price = round(MONACO_PRICE_PER_M2 * surfaceM2 * coefficient)

    // Quatre fois plus large qu'une estimation adossée à des ventes voisines :
    // le montant ne repose que sur une moyenne nationale, et l'écart d'un
    // quartier monégasque à l'autre est sans commune mesure.
    const { low, high } = fourchetteSymetrique(price, MONACO_RANGE_PCT)

    const meta = {
      type,
      surfaceM2,
      surfaceSource: 'declaree',
      etage,
      coefficientEtage: coefficient,
      pricePerM2: MONACO_PRICE_PER_M2,
      source: 'monaco-imsee',
      confiance: 'moyenne',
    }

    console.log('[estimation]', JSON.stringify(meta))

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({
      ok: true,
      price,
      low,
      high,
      confiance: meta.confiance,
      ...(process.env.ESTIMATION_DEBUG ? { meta } : {}),
    })
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return badRequest(res, 'Coordonnées manquantes.', 'coordonnees-manquantes')
  }

  const controller = new AbortController()
  const budget = setTimeout(() => controller.abort(), BUDGET_MS)
  const signal = controller.signal
  const startedAt = Date.now()
  // Une ligne par fichier DVF touché : cache, non publié, ou échec avec son
  // nombre de tentatives. C'est ce qui permettra de mesurer à l'usage la
  // fréquence réelle des pannes, jusqu'ici invisible.
  const journal = []

  try {
    // Le type est normalement détecté côté carte et transmis tel quel ; on ne
    // le recalcule que s'il manque — détection interrompue par une validation
    // rapide, ou réseau capricieux au moment du clic.
    let type = typeRecu(body.type)
    let detection = null
    if (!type) {
      detection = await detectPropertyType(
        { kind: body.kind ?? 'batiment', lat, lon, areaM2: body.areaM2, properties: body.properties },
        { signal },
      ).catch(() => null)

      type =
        typeRecu(detection?.type) ??
        arbitreTypeResidentiel({
          niveaux: body.properties?.nombre_d_etages,
          hauteur: body.properties?.hauteur,
          areaM2: body.areaM2,
        }).type
    }

    const record = (value) => (value && typeof value === 'object' ? value : null)
    const parcelle = record(body.parcelle)
    const contenance = Number(body.contenance) || parcelle?.contenance || null

    // SURFACE : plus aucun parcours ne calcule un prix sans elle. Pour un
    // logement, c'est la surface habitable déclarée au curseur ; pour un
    // terrain nu, la contenance cadastrale — qui est mesurée, et non déduite.
    const surfaceM2 = type === 'terrain' ? Number(contenance) || null : surfaceDeclaree(body.surfaceM2)

    if (!surfaceM2) {
      return badRequest(
        res,
        type === 'terrain'
          ? 'Contenance cadastrale manquante.'
          : 'Surface habitable manquante.',
        'surface-manquante',
      )
    }

    const selection = {
      lat,
      lon,
      type,
      areaM2: Number(body.areaM2) || null,
      surfaceM2,
      properties: record(body.properties),
      parcelle,
      // Fiche BDNB du bâtiment : sa présence dispense de refaire la chaîne
      // cadastre → BDNB, soit deux à trois secondes de moins sur le calcul.
      fiche: record(body.fiche),
      contenance,
      batimentGroupeId:
        typeof body.batimentGroupeId === 'string' ? body.batimentGroupeId : null,
    }

    // Rattachement administratif d'abord : c'est lui qui désigne le fichier DVF
    // à ouvrir, et il coûte une requête légère quand le front ne l'a pas déjà
    // transmis.
    const codeInsee =
      parcelle?.codeInsee ?? (await communeAtPoint(lat, lon, { signal }).catch(() => null))
    const departement = departementFromInsee(codeInsee)

    const etage = type === 'appartement' ? normaliseEtage(body.etage) : null
    const coefficientEtageApplique = coefficientEtage(etage)

    // Le terrain de la cible est la contenance cadastrale. Inconnue, elle n'est
    // pas éliminatoire — le filtre de similarité l'ignore et le poids pénalise
    // les comparables dont le terrain est lui aussi inconnu — mais aucun
    // ajustement de terrain ne sera calculé, et `meta` le dira.
    const terrainCible = type === 'maison' ? Number(contenance) || null : null

    // ------------------------------------------------------------------
    // Zones hors couverture DVF (57, 67, 68, 976) : chemin inchangé.
    // ------------------------------------------------------------------
    if (!departement || estHorsCouvertureDvf(departement)) {
      const reference = majoreHorsDvf(
        prixReference({ codeInsee, departement, type, lat, lon }),
        departement,
      )

      // `describeBien` ne sert plus au calcul — la surface vient du curseur —
      // mais il renseigne le journal, et ce chemin est celui de la quasi-totalité
      // des estimations du secteur de l'agence (Moselle). On le garde donc
      // exactement tel qu'il était.
      const bienHorsDvf = await describeBien(selection, { signal }).catch(() => ({
        surfaceM2: null,
        surfaceSource: 'aucune',
        anneeConstruction: null,
      }))

      const price = clampPrice(round(reference.pricePerM2 * surfaceM2 * coefficientEtageApplique))
      const { low, high } = fourchetteSymetrique(price, FOURCHETTE.demiLargeurMinPct)

      const meta = {
        type,
        surfaceM2,
        surfaceSource: 'declaree',
        surfaceEstimee: bienHorsDvf.surfaceM2,
        anneeConstruction: bienHorsDvf.anneeConstruction,
        etage,
        coefficientEtage: coefficientEtageApplique,
        codeInsee,
        departement,
        pricePerM2: Math.round(reference.pricePerM2),
        pricePerM2Base:
          reference.pricePerM2Base != null ? Math.round(reference.pricePerM2Base) : null,
        majorationAppliquee: reference.majorationAppliquee ?? false,
        source: reference.source,
        pointNom: reference.pointNom ?? null,
        pointDistanceM: reference.pointDistanceM ?? null,
        confiance: 'faible',
        elapsedMs: Date.now() - startedAt,
      }

      console.log('[estimation]', JSON.stringify(meta))

      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({
        ok: true,
        price,
        low,
        high,
        confiance: meta.confiance,
        ...(process.env.ESTIMATION_DEBUG ? { meta } : {}),
      })
    }

    // ------------------------------------------------------------------
    // Zones couvertes par DVF — le moteur proprement dit.
    // ------------------------------------------------------------------
    const dvfDeadline = AbortSignal.timeout(CHARGEMENT.budgetTotalMs)
    const dvfSignal = AbortSignal.any([signal, dvfDeadline])

    // Étapes A et B en parallèle : les caractéristiques du bien (désormais
    // purement documentaires — la surface vient du curseur) et le marché local
    // ne dépendent pas l'une de l'autre.
    const [bien, marche] = await Promise.all([
      describeBien(selection, { signal }).catch(() => ({
        surfaceM2: null,
        surfaceSource: 'aucune',
        anneeConstruction: null,
        codeInsee: null,
      })),
      calculeDepuisDvf(
        { lat, lon, type, departement, codeInsee, surfaceCible: surfaceM2, terrainCible },
        { signal: dvfSignal, journal },
      ),
    ])

    if (!marche) {
      return indisponible(res, 'aucune-vente-du-type', journal, startedAt)
    }

    // --- Terrain : valeur du m² supplémentaire, puis ajustement.
    const valeurTerrain =
      type === 'maison'
        ? estimeValeurTerrain(marche.actualisees, { lat, lon, codeInsee, departement })
        : null

    const terrainReference =
      marche.terrainReference ?? (type === 'maison' ? valeurTerrain?.terrainMedian ?? null : null)

    const partBati = marche.prixM2 * surfaceM2 * (type === 'appartement' ? coefficientEtageApplique : 1)

    // Pas d'ajustement de terrain sur le repli départemental : le €/m² y est
    // celui du département entier, et lui adosser une valeur de terrain
    // mesurée dans un rayon de deux kilomètres mélangerait deux échelles. Une
    // estimation de confiance « faible » n'a pas à se donner des airs de
    // précision locale.
    const ajustement =
      type !== 'maison'
        ? { montant: 0, motif: 'sans-objet', plafonne: false }
        : marche.statut === 'departement'
          ? { montant: 0, motif: 'repli-departemental', plafonne: false }
          : ajustementTerrain(valeurTerrain, {
              terrainBien: terrainCible,
              terrainReference,
              partBati,
            })

    const price = clampPrice(round(partBati + ajustement.montant))

    // La fourchette suit la même formule que le prix : quantiles pondérés en
    // €/m², passés par le même produit et le même ajustement.
    const versEuros = (prixM2) =>
      prixM2 * surfaceM2 * (type === 'appartement' ? coefficientEtageApplique : 1) +
      ajustement.montant

    const { low, high } = fourchetteDepuisQuantiles({
      prix: price,
      quantiles: marche.quantiles,
      versEuros,
      confiance: marche.confiance,
    })

    // --- Décomposition lisible bâti / terrain. Purement indicative : elle ne
    // participe pas au calcul, elle l'explique. La valeur foncière du bien est
    // mesurée contre un « terrain plancher » du secteur (5ᵉ centile), faute de
    // quoi le modèle logarithmique n'a pas d'origine naturelle.
    const valeurTerrainBien =
      valeurTerrain?.significatif && terrainCible > 0 && valeurTerrain.terrainPlancher > 0
        ? valeurTerrain.coefficientLog * Math.log(terrainCible / valeurTerrain.terrainPlancher)
        : null

    const echecs = journal.filter((f) => f.issue === 'echec')

    const meta = {
      type,
      typeSource: body.typeSource ?? detection?.source ?? (body.type ? 'front' : 'arbitrage'),
      typeConfiance: body.typeConfiance ?? detection?.confiance ?? null,

      surfaceM2,
      surfaceSource: 'declaree',
      // Conservée à côté de la surface retenue : c'est l'écart entre les deux
      // qui dira si la reconstitution géométrique vise juste — elle ne sert
      // plus qu'à cela.
      surfaceEstimee: bien.surfaceM2,
      // Récupérée, journalisée, et **volontairement absente du calcul**.
      anneeConstruction: bien.anneeConstruction,
      contenance: terrainCible,
      etage,
      coefficientEtage: coefficientEtageApplique,

      codeInsee,
      departement,
      source: marche.statut === 'voisinage' ? 'dvf' : 'dvf-departement',
      confiance: marche.confiance,
      pricePerM2: Math.round(marche.prixM2),
      rayonAtteintM: marche.rayonAtteintM,
      comparablesRetenus: marche.comparables.length,

      // Indice temporel.
      indice: {
        zone: marche.indice.zone,
        zoneCode: marche.indice.zoneCode,
        semestreReference: marche.indice.semestreReference,
        motif: marche.indice.motif,
        points: marche.indice.points,
      },

      // Entonnoir de sélection — combien de ventes à chaque filtre, et combien
      // de similaires par rayon. C'est ce qui permet de dire *pourquoi* le
      // rayon retenu est celui-là.
      candidats: marche.candidats,

      // Terrain.
      terrain: {
        terrainBienM2: terrainCible,
        terrainReferenceM2: terrainReference != null ? Math.round(terrainReference) : null,
        coefficientLog: valeurTerrain?.coefficientLog != null
          ? Number(valeurTerrain.coefficientLog.toFixed(1))
          : null,
        // Le « b » de la méthode, rendu lisible : la valeur d'un m² de terrain
        // supplémentaire au voisinage du terrain de référence. Il n'est pas
        // constant — c'est tout l'intérêt des rendements décroissants.
        bEuroParM2: (() => {
          const b = valeurM2Terrain(valeurTerrain, terrainReference)
          return b != null ? Number(b.toFixed(2)) : null
        })(),
        tStat: valeurTerrain?.tStat != null ? Number(valeurTerrain.tStat.toFixed(2)) : null,
        significatif: valeurTerrain?.significatif ?? false,
        motif: valeurTerrain?.motif ?? ajustement.motif,
        echantillon: valeurTerrain?.echantillon ?? 0,
        echantillonZone: valeurTerrain?.zone ?? null,
        echantillonZoneDetail: valeurTerrain?.zoneDetail ?? null,
        tStatMin: TERRAIN.tStatMin,
        ajustementEuros: Math.round(ajustement.montant),
        ajustementBrutEuros: ajustement.brut != null ? Math.round(ajustement.brut) : null,
        plafonne: ajustement.plafonne,
        plafondEuros: ajustement.plafond != null ? Math.round(ajustement.plafond) : null,
      },

      // Décomposition lisible — n'entre pas dans le calcul du prix final.
      decomposition: {
        prixFinal: price,
        partBatiEuros: Math.round(partBati),
        ajustementTerrainEuros: Math.round(ajustement.montant),
        // Indicatif : valeur foncière du terrain du bien selon le modèle,
        // mesurée contre le terrain plancher du secteur.
        valeurTerrainIndicativeEuros:
          valeurTerrainBien != null ? Math.round(valeurTerrainBien) : null,
        partBatiHorsTerrainIndicativeEuros:
          valeurTerrainBien != null ? Math.round(price - valeurTerrainBien) : null,
        terrainPlancherM2: valeurTerrain?.terrainPlancher
          ? Math.round(valeurTerrain.terrainPlancher)
          : null,
      },

      fourchette: {
        low,
        high,
        q25PrixM2: marche.quantiles.q25 != null ? Math.round(marche.quantiles.q25) : null,
        q75PrixM2: marche.quantiles.q75 != null ? Math.round(marche.quantiles.q75) : null,
        elargissement: FOURCHETTE.elargissement[marche.confiance] ?? 1,
        demiLargeurMinPct: FOURCHETTE.demiLargeurMinPct,
      },

      // Chaque comparable retenu, avec de quoi refaire le calcul à la main.
      comparables: marche.comparables.map((v) => ({
        adresse: v.adresse,
        date: v.date,
        semestre: semestreLabel(v.semestre),
        commune: v.commune,
        surfaceM2: v.surface,
        terrainM2: v.surfaceTerrain,
        terrainConnu: v.terrainConnu,
        dependance: v.dependance,
        valeurFonciere: v.price,
        prixM2Brut: Math.round(v.pricePerM2),
        coefficientTemps: Number(v.coefficientTemps.toFixed(4)),
        prixM2Actualise: Math.round(v.prixM2Actualise),
        distanceM: Math.round(v.distanceM),
        similarite: v.similarite,
        poids: Number(v.poids.toFixed(4)),
        facteurs: v.facteurs,
      })),

      // Fiabilité du chargement — la mesure demandée.
      chargement: {
        departements: marche.chargement.departements,
        fichiers: journal.length,
        echecs: echecs.length,
        echecsNonEssentiels: marche.chargement.echecsNonEssentiels,
        tentatives: journal.reduce((somme, f) => somme + f.tentatives, 0),
        detail: journal,
      },

      elapsedMs: Date.now() - startedAt,
    }

    console.log('[estimation]', JSON.stringify(meta))

    // Le détail du calcul n'a pas à redescendre : l'utilisateur ne doit rien
    // percevoir d'un élargissement de rayon ou d'un repli. Il reste accessible
    // pour le diagnostic en activant `ESTIMATION_DEBUG`.
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({
      ok: true,
      price,
      low,
      high,
      confiance: marche.confiance,
      ...(process.env.ESTIMATION_DEBUG ? { meta } : {}),
    })
  } catch (error) {
    // Panne technique d'une source DVF, réessais épuisés : pas de prix. C'est
    // le renversement central de cette version — voir l'en-tête du fichier.
    if (error instanceof DvfIndisponible) {
      return indisponible(res, error.key, journal, startedAt, error)
    }

    // Budget global dépassé : même traitement. Un montant rendu après trente
    // secondes de dégradation silencieuse ne vaut pas mieux qu'une erreur.
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
      return indisponible(res, 'budget-depasse', journal, startedAt, error)
    }

    console.error('[estimation] Échec du calcul', error)
    return res.status(500).json({ ok: false, error: 'Estimation indisponible.', code: 'erreur' })
  } finally {
    clearTimeout(budget)
  }
}

/**
 * Réponse d'indisponibilité — 503, jamais un prix de consolation.
 *
 * Le front relance une fois, puis affiche « estimation momentanément
 * indisponible, réessayez ». Le journal de chargement descend dans les logs
 * quoi qu'il arrive : c'est précisément le cas où l'on veut savoir quel fichier
 * a lâché, et après combien de tentatives.
 */
function indisponible(res, motif, journal, startedAt, error) {
  const echecs = journal.filter((f) => f.issue === 'echec')

  console.error(
    '[estimation] indisponible',
    JSON.stringify({
      motif,
      message: error?.message ?? null,
      fichiers: journal.length,
      echecs: echecs.length,
      tentatives: journal.reduce((somme, f) => somme + f.tentatives, 0),
      detail: journal,
      elapsedMs: Date.now() - startedAt,
    }),
  )

  res.setHeader('Cache-Control', 'no-store')
  return res.status(503).json({
    ok: false,
    error: 'Estimation momentanément indisponible.',
    code: 'dvf-indisponible',
    motif,
  })
}
