// Extension explicite : ce fichier est lu par le prérendu, qui tourne sous
// Node, où un import sans extension ne résout pas.
import { agency } from './agency.js'

/**
 * Contenu de la page « Méthodologie des prix ».
 *
 * TOUT CE QUI SUIT EST LU DANS LE CODE, PAS RÉDIGÉ DE MÉMOIRE. Chaque chiffre
 * vient d'un fichier nommé dans le texte lui-même :
 *
 *   • la cascade et l'absence de DVF        → `api/_lib/reference.js`
 *   • la demi-largeur et le banc d'essai    → `api/_lib/estimationConfig.js`
 *   • le pool, ses sources, son millésime   → `api/_data/points-reference.js`
 *     (produit à partir de `scripts/_data/points-agence.json`)
 *   • la mesure d'erreur                    → `scripts/backtest-horsdvf.mjs`
 *
 * Les dénombrements — 774 points, 57 saisis par l'agence, 717 relevés — sont
 * ceux du pool au moment de la rédaction. Ils sont écrits en toutes lettres
 * plutôt que calculés à l'affichage : la page est une déclaration datée, pas
 * un tableau de bord, et un chiffre qui bougerait tout seul sous une phrase
 * qui ne bouge pas finirait par la contredire.
 *
 * DEUX POINTS À ARBITRER AVANT MISE EN LIGNE, signalés au client :
 * l'origine nominative des relevés, et la majoration commerciale de 10 %.
 * Ils sont ici parce qu'une page de méthodologie qui les tait n'en est pas
 * une — c'est à l'agence de décider si elle les publie.
 */
export const methodologie = {
  title: 'Méthodologie des prix',
  intro:
    'D’où viennent les prix au m² qui servent à estimer un bien sur ce site, comment ils sont établis, à quelle date, et ce qu’ils ne savent pas faire.',
  sections: [
    {
      titre: 'Pourquoi cette page existe',
      corps: [
        `Les estimations de ce site reposent sur des prix au m² par commune. Un chiffre présenté sans sa provenance ne vaut rien : il peut venir d’une transaction réelle, d’une moyenne départementale ou d’une estimation d’un autre opérateur, et ces trois origines n’ont pas la même solidité.`,
        `Cette page dit laquelle est employée, pour quelle commune, et avec quelle marge d’erreur mesurée. Elle est écrite à partir du code qui calcule les estimations, pas d’une présentation commerciale.`,
      ],
    },
    {
      titre: 'Le secteur de l’agence n’est pas couvert par DVF',
      corps: [
        `« Demandes de valeurs foncières » (DVF) est le fichier public des transactions immobilières, publié par la Direction générale des finances publiques. C’est la source de référence de la plupart des estimateurs en ligne.`,
        `Elle ne couvre pas la Moselle. La Moselle, le Bas-Rhin et le Haut-Rhin relèvent du livre foncier, régime hérité du droit local d’Alsace-Moselle, et non du fichier immobilier de la DGFiP. Leurs mutations ne sont publiées en open data à aucun millésime, ni à l’échelle communale ni à l’échelle départementale. Mayotte est dans le même cas.`,
        `Autrement dit : sur la quasi-totalité du secteur de ${agency.name}, aucune base publique de ventes réelles n’existe. Ce n’est pas une lacune de ce site, c’est l’état de la donnée publique française.`,
      ],
    },
    {
      titre: 'Ce qui est employé à la place',
      corps: [
        `Un relevé de prix au m² commune par commune, constitué par l’agence. Il comptait 774 communes à sa dernière mise à jour, toutes relevées en septembre 2026.`,
        { liste: [
          '57 communes sont renseignées par l’agence elle-même, à partir de sa connaissance du secteur et de ses propres ventes. Ce sont les valeurs les plus sûres du relevé.',
          '717 communes proviennent d’un relevé des estimations publiées par d’autres opérateurs du marché, recoupées entre elles. Ce ne sont pas des transactions : ce sont des estimations, elles-mêmes calculées.',
          '642 de ces 717 sont recoupées sur au moins deux sources concordantes ; 74 ne reposent que sur une seule source et sont signalées comme telles dans le fichier ; 1 reste à vérifier.',
        ] },
        `Le relevé porte un prix de maison pour 773 communes et un prix d’appartement pour 665. Aucun prix de terrain n’y figure : les terrains sont estimés autrement.`,
      ],
    },
    {
      titre: 'Comment une commune est choisie',
      corps: [
        `Le moteur descend une cascade, du plus précis au plus grossier, et s’arrête au premier étage qui répond :`,
        { liste: [
          'une correction manuelle saisie par l’agence pour cette commune précise ;',
          'une correction manuelle saisie pour le département ;',
          'le prix relevé pour la commune exacte ;',
          'à défaut, le prix de la commune renseignée la plus proche, dans un rayon de 25 km au maximum ;',
          'à défaut, une table départementale ;',
          'en dernier recours, une valeur nationale.',
        ] },
        `Les corrections manuelles passent avant tout le reste : elles permettent de rattraper une valeur fausse sans attendre une mise à jour du site.`,
      ],
    },
    {
      titre: 'À quelle fréquence c’est mis à jour',
      corps: [
        `Le relevé de septembre 2026 n’est pas rafraîchi automatiquement. Il est repris à la main, et les valeurs saisies par l’agence sont corrigées au fil de ses ventes — une commune où l’agence vend cesse de dépendre d’un relevé extérieur.`,
        `Les corrections ponctuelles, elles, sont applicables immédiatement, sans nouvelle mise en ligne du site.`,
      ],
    },
    {
      titre: 'Ce que vaut la fourchette affichée',
      corps: [
        `Chaque estimation s’accompagne d’une fourchette de plus ou moins 13 %. Ce chiffre mérite d’être expliqué, parce qu’il n’est pas une mesure.`,
        `La méthode a été testée sur 799 ventes réelles de 2025, en Meurthe-et-Moselle, dans la Meuse et dans les Vosges — trois départements limitrophes de la Moselle qui, eux, disposent de DVF. Résultat : l’erreur médiane de la méthode est de 20,9 %.`,
        `Il faudrait une fourchette de plus ou moins 32 % pour contenir sept biens sur dix. Une telle fourchette n’apprend plus rien à un vendeur : sur une maison à 193 000 €, elle annoncerait « entre 131 000 et 255 000 € ». Les 13 % retenus sont donc un compromis assumé entre justesse et lisibilité, décidé par l’agence. Ils couvrent nettement plus de biens que les 5 % appliqués auparavant, et nettement moins que la réalité statistique.`,
        `Une estimation en ligne reste une estimation. Elle ne voit ni l’état réel du bien, ni son exposition, ni ses travaux, ni ce que le marché local fait au moment où vous vendez. Elle donne un ordre de grandeur, et c’est tout ce qu’elle prétend donner.`,
      ],
    },
    {
      titre: 'Ce que l’estimation ne regarde pas',
      corps: [
        { liste: [
          'l’état intérieur du bien, ses travaux récents ou à prévoir ;',
          'la vue, l’exposition, le niveau de bruit, le vis-à-vis ;',
          'la qualité de la copropriété et le montant de ses charges ;',
          'le rapport entre acheteurs et vendeurs au moment précis de la vente ;',
          'tout ce qui fait qu’un bien se vend au-dessus ou au-dessous de son quartier.',
        ] },
        `C’est la raison pour laquelle une estimation en ligne ne remplace pas une visite. Elle sert à savoir si l’on parle de 150 000 ou de 250 000 €, pas à fixer un prix de mise en vente.`,
      ],
    },
    {
      titre: 'Sources',
      corps: [
        `Relevé de prix au m² constitué par ${agency.name}, millésime septembre 2026, 774 communes.`,
        `Banc d’essai de la méthode : 799 ventes DVF de l’année 2025 en Meurthe-et-Moselle, Meuse et Vosges.`,
        `Sur l’absence de DVF en Alsace-Moselle : régime du livre foncier, droit local d’Alsace-Moselle.`,
      ],
    },
  ],
}
