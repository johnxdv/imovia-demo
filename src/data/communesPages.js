/**
 * Contenu éditorial des pages de commune.
 *
 * POURQUOI CE FICHIER EXISTE
 *
 * Les neuf pages de commune faisaient 130 à 155 mots et se ressemblaient à 63-
 * 70 %. C'était un gabarit avec le nom changé, et un moteur le lit pour ce
 * qu'il est. Chacune porte désormais son propre texte, sa propre structure et
 * son propre angle, tirés de ce que la commune a de particulier.
 *
 * RÈGLE DE RÉDACTION, SANS EXCEPTION
 *
 * Chaque chiffre vient du Dossier complet de l'INSEE pour cette commune, est
 * reproduit tel qu'il y est imprimé, et porte son millésime. Rien n'est
 * calculé ici : les écarts entre deux recensements sont des soustractions
 * entre deux valeurs publiées, et ils sont présentés comme telles. Aucune
 * donnée de prix n'y figure — ni relevé, ni estimation de plateforme, ni
 * moyenne de marché — et la méthode d'estimation du site n'y est pas décrite.
 *
 * DEUX COMMUNES MANQUENT À L'APPEL. Stiring-Wendel et Puttelange-aux-Lacs :
 * leurs pages INSEE répondaient 500 et 504 à chaque tentative au moment de la
 * rédaction. Elles gardent donc leur page courte, sans contenu inventé pour
 * combler le vide. À reprendre dès que l'INSEE répond.
 *
 * Source commune à toutes les pages : INSEE, Dossier complet de la commune,
 * paru le 27 août 2026, recensement de la population 2023 (géographie au
 * 1er janvier 2026) et dispositif Filosofi 2023 pour le niveau de vie.
 */

const INSEE_PARU = 'paru le 27 août 2026'

const dossierInsee = (code, nom) => ({
  libelle: `INSEE — Dossier complet, commune de ${nom} (${code})`,
  url: `https://www.insee.fr/fr/statistiques/2011101?geo=COM-${code}`,
  detail: `Recensement de la population 2023, ${INSEE_PARU}.`,
})

export const communesPages = {
  // ────────────────────────────────────────────────────────────────────
  'diebling': {
    accroche:
      'Le bureau de l’agence est à Diebling. C’est aussi, de tout le secteur, la commune où l’on déménage le moins.',
    sections: [
      {
        titre: 'Une commune qui ne bouge pas',
        corps: [
          'Diebling comptait 1 658 habitants au recensement de 2023, contre 1 643 en 2017 et 1 667 en 2012. En onze ans, l’écart tient en neuf habitants. L’INSEE chiffre la variation annuelle moyenne de la population à +0,2 % entre 2017 et 2023, pour une densité de 211,5 habitants au km².',
          'Cette stabilité se lit mieux encore dans les ménages : 526 des 762 ménages de la commune, soit 69 %, occupaient leur logement depuis dix ans ou plus en 2023. Deux tiers des foyers de Diebling n’ont pas déménagé depuis au moins une décennie.',
        ],
      },
      {
        titre: 'Un parc de maisons, détenu par ceux qui l’habitent',
        corps: [
          'Sur 824 logements, 686 sont des maisons — 83,2 % du parc — contre 134 appartements. Et 598 résidences principales sur 762 sont occupées par leur propriétaire, soit 78,6 %. Les locataires sont 140, et l’INSEE ne recense aucun logement HLM loué vide dans la commune.',
          'Ce qui change tout pour un vendeur, c’est la vacance : 53 logements vacants, 6,4 % du parc. À titre de repère, aucune autre commune traitée sur ce site ne descend aussi bas. Il y a peu de biens disponibles à Diebling parce qu’il y a peu de biens qui se libèrent.',
        ],
      },
      {
        titre: 'Un bâti des années 1970 et 1980',
        corps: [
          'La période d’achèvement des résidences principales raconte l’histoire du village : 226 logements construits entre 1971 et 1990, et 191 entre 1946 et 1970. Ces deux tranches représentent à elles seules plus de la moitié du parc. L’avant-guerre est marginal — 32 logements d’avant 1919 et 74 entre 1919 et 1945 — et la construction récente reste soutenue, avec 127 logements achevés entre 2006 et 2020.',
          'Côté chauffage, 306 résidences principales étaient raccordées au gaz de ville ou à un réseau de chaleur en 2023, 221 au fioul, 141 à l’électricité. Le fioul concerne donc encore près de trois logements sur dix : c’est un point que tout acquéreur regarde désormais, et qui pèse dans une négociation.',
        ],
      },
      {
        titre: 'Vivre et travailler',
        corps: [
          'La commune accueillait 199 emplois en 2023, contre 230 en 2017 : Diebling est une commune résidentielle, et ses actifs travaillent ailleurs. Le taux de chômage des 15-64 ans y était de 7,2 % en 2023, en net repli sur les 12,7 % de 2017. Le niveau de vie médian atteignait 27 870 euros en 2023, l’un des plus élevés du secteur traité ici.',
        ],
      },
      {
        titre: 'Onze ans de parc, en trois recensements',
        corps: [
          'Le parc est passé de 731 logements en 2012 à 759 en 2017, puis 824 en 2023 : quatre-vingt-treize logements de plus pour une population qui n’a pas bougé. Ce sont les ménages qui se sont multipliés, pas les habitants.',
          'Les appartements expliquent une partie de cet écart : 97 en 2012, 110 en 2017, 134 en 2023. La part des maisons recule mécaniquement de 86,6 % à 83,2 %, sans que leur nombre diminue — il augmente, de 633 à 686.',
          'La vacance progresse, mais très lentement : 42 logements vacants en 2012, 47 en 2017, 53 en 2023, soit 5,7 % puis 6,2 % puis 6,4 % du parc. Quant à la part de propriétaires, elle est passée par 80,6 % en 2012 et 81,1 % en 2017 avant de redescendre à 78,6 % : la commune se loue un peu plus qu’avant, de 99 logements loués en 2012 à 140 en 2023.',
        ],
      },
    ],
    sources: [dossierInsee('57176', 'Diebling')],
  },

  // ────────────────────────────────────────────────────────────────────
  'forbach': {
    accroche:
      'Forbach est la seule commune du secteur où le marché est d’abord un marché d’appartements. Tout y fonctionne autrement qu’au village.',
    sections: [
      {
        titre: 'Ce que la densité change',
        corps: [
          'Avec 1 255,7 habitants au km² en 2023, Forbach est six fois plus dense que Diebling et presque deux fois plus que Sarreguemines. Sur 10 934 logements, 7 349 sont des appartements, soit 67,2 %, contre 3 467 maisons. C’est l’inverse exact du reste du secteur.',
          'Cela se répercute sur le statut d’occupation : 4 790 résidences principales sont louées, soit 53,1 %, pour 3 827 occupées par leur propriétaire (42,4 %). Le logement social pèse 1 527 logements, 16,9 % des résidences principales. Vendre à Forbach, c’est donc souvent vendre à un investisseur autant qu’à un occupant.',
        ],
      },
      {
        titre: 'Une ville qui perd des habitants',
        corps: [
          'La population est passée de 21 552 habitants en 2017 à 20 493 en 2023, après 21 475 en 2012. L’INSEE établit la variation annuelle moyenne à −0,8 % sur 2017-2023. Mille habitants de moins en six ans, dans une ville qui en comptait vingt-et-un mille.',
          'Le parc de logements, lui, n’a pas diminué d’autant, et l’écart se voit : 1 779 logements vacants en 2023, 16,3 % du total. Un logement sur six est vide. Pour un vendeur, c’est le chiffre déterminant de cette page — l’offre est abondante, et un bien mal positionné reste.',
        ],
      },
      {
        titre: 'Un parc construit pour la mine',
        corps: [
          '3 469 résidences principales ont été achevées entre 1946 et 1970, soit 38,6 % du parc, et 2 654 entre 1971 et 1990. L’après-guerre a bâti les deux tiers de la ville. Seules 551 résidences principales datent de 2006 à 2020, 6,1 % : la construction neuve est marginale, et le marché est un marché d’ancien.',
          'Les logements antérieurs à 1946 existent — 339 d’avant 1919, 762 entre 1919 et 1945 — et forment un segment à part, souvent en centre-ville.',
        ],
      },
      {
        titre: 'Emploi et revenus',
        corps: [
          'Forbach reste un pôle d’emploi : 10 429 emplois dans la zone en 2023, pour 20 493 habitants. Mais le taux de chômage des 15-64 ans y atteignait 23,4 % — 1 851 chômeurs — et le niveau de vie médian s’établissait à 19 530 euros, avec un taux de pauvreté de 34,0 % au seuil de 60 % de la médiane. Ce sont, de loin, les valeurs les plus basses des communes traitées sur ce site.',
          'Deux marchés coexistent donc dans la même ville, et une estimation qui les confondrait ne dirait rien d’utile.',
        ],
      },
      {
        titre: 'Six cent soixante-dix-huit logements vides de plus',
        corps: [
          'La trajectoire de la vacance est le fait marquant de ces onze années : 1 101 logements vacants en 2012 (10,3 % du parc), 1 531 en 2017 (14,1 %), 1 779 en 2023 (16,3 %). Dans le même temps, le parc total augmentait à peine, de 10 661 à 10 934 logements, et les résidences principales reculaient de 9 519 à 9 023.',
          'Le chômage, lui, ne suit pas cette pente : 24,6 % en 2012, 26,9 % en 2017, puis 23,4 % en 2023. Et le nombre d’emplois dans la zone s’est presque stabilisé après une forte baisse — 11 612 en 2012, 10 559 en 2017, 10 429 en 2023.',
          'La structure de détention, elle, n’a quasiment pas bougé : les propriétaires occupaient 40,2 % des résidences principales en 2012, 40,0 % en 2017, 42,4 % en 2023.',
        ],
      },
    ],
    sources: [dossierInsee('57227', 'Forbach')],
  },

  // ────────────────────────────────────────────────────────────────────
  'sarreguemines': {
    accroche:
      'Sarreguemines emploie plus de monde qu’elle n’en loge, et ses ménages sont les plus petits du secteur. Deux chiffres qui expliquent beaucoup de son marché.',
    sections: [
      {
        titre: '16 006 emplois pour 20 143 habitants',
        corps: [
          'En 2023, l’INSEE recensait 16 006 emplois dans la zone de Sarreguemines, pour une population de 20 143 habitants. Le rapport est presque de un pour un : la ville attire chaque jour des actifs venus des communes alentour, dont une partie finit par s’y installer.',
          'Le taux de chômage des 15-64 ans s’établissait à 15,1 %, et le niveau de vie médian à 22 890 euros.',
        ],
      },
      {
        titre: 'Des ménages d’une personne et demie',
        corps: [
          'Le nombre moyen d’occupants par résidence principale était de 1,88 en 2023. C’est la valeur la plus basse des communes traitées ici — Freyming-Merlebach est à 2,21, Diebling à 2,18. Une ville de petits ménages demande des petits logements, et le parc a suivi : 7 444 appartements contre 4 367 maisons, soit 61,9 % du parc en collectif.',
          'Sur 10 247 résidences principales, 5 417 sont louées (52,9 %) et 4 511 occupées par leur propriétaire (44,0 %). La location est majoritaire, ce qui n’est le cas que dans trois des communes traitées sur ce site.',
        ],
      },
      {
        titre: 'Le parc le plus ancien du secteur',
        corps: [
          '701 résidences principales datent d’avant 1919 et 1 311 des années 1919 à 1945 : près d’un logement sur cinq a plus de quatre-vingts ans. C’est la proportion d’avant-guerre la plus forte des six communes documentées ici, et elle façonne le centre-ville.',
          'Le reste suit la courbe régionale : 3 328 logements entre 1946 et 1970, 2 512 entre 1971 et 1990, puis 1 369 entre 1991 et 2005 et 949 entre 2006 et 2020. La construction des vingt dernières années est donc plus soutenue qu’à Forbach, à population comparable.',
        ],
      },
      {
        titre: 'Une décrue mesurée',
        corps: [
          'La population est passée de 21 605 habitants en 2012 à 20 783 en 2017, puis 20 143 en 2023 : une variation annuelle moyenne de −0,5 % sur la dernière période. Le recul est réel mais deux fois plus lent qu’à Forbach ou Saint-Avold.',
          'La vacance suit le même rythme mesuré : 1 581 logements vacants, 13,1 % du parc, contre 16,3 % à Forbach. La densité ressort à 678,9 habitants au km².',
        ],
      },
      {
        titre: 'Des ménages qui rétrécissent, un parc qui grossit',
        corps: [
          'Le nombre moyen d’occupants par résidence principale est passé de 2,06 en 2012 à 1,97 en 2017, puis 1,88 en 2023. Sur la même période, le parc de logements a grandi de 11 495 à 12 024 unités, alors que la population perdait 1 462 habitants et que la densité reculait de 728,2 à 678,9 habitants au km².',
          'Les résidences principales, elles, n’ont presque pas varié : 10 091 en 2012, 10 086 en 2017, 10 247 en 2023. Tout l’écart est passé dans la vacance, qui monte de 1 275 logements (11,1 %) à 1 581 (13,1 %).',
          'Le rapport entre propriétaires et locataires a fait un aller-retour : la location culminait à 55,4 % des résidences principales en 2017, elle redescend à 52,9 % en 2023, tandis que les propriétaires occupants remontent de 42,0 % à 44,0 %.',
        ],
      },
    ],
    sources: [dossierInsee('57631', 'Sarreguemines')],
  },

  // ────────────────────────────────────────────────────────────────────
  'saint-avold': {
    accroche:
      'Saint-Avold perd des habitants depuis plus de dix ans. Pourtant, son chômage recule sans interruption sur la même période. Les deux courbes méritent d’être lues ensemble.',
    sections: [
      {
        titre: 'Mille six cents habitants de moins en onze ans',
        corps: [
          'La commune comptait 16 349 habitants en 2012, 15 483 en 2017, et 14 755 en 2023. Soit 1 594 habitants perdus entre les deux recensements extrêmes, et une variation annuelle moyenne de −0,8 % sur 2017-2023. La densité est passée de 460,8 à 415,9 habitants au km² sur la même période.',
          'Le nombre moyen d’occupants par résidence principale a suivi : 2,14 en 2012, 2,04 en 2017, 2,01 en 2023. Les logements ne se vident pas seulement parce qu’on part, mais aussi parce que les foyers rétrécissent.',
        ],
      },
      {
        titre: 'Le chômage, lui, baisse',
        corps: [
          'Le taux de chômage des 15-64 ans était de 19,3 % en 2012, 18,3 % en 2017, et 15,7 % en 2023 — soit 1 001 chômeurs. Sur la même période, le nombre d’emplois dans la zone est repassé au-dessus de son niveau de 2017 : 11 180 emplois en 2012, 10 774 en 2017, 10 839 en 2023.',
          'Le niveau de vie médian atteignait 23 590 euros en 2023, pour un taux de pauvreté de 23,0 %. La commune se situe nettement au-dessus de Forbach et en dessous de Diebling ou Grosbliederstroff.',
        ],
      },
      {
        titre: 'Un parc à moitié vacant de son usage',
        corps: [
          'Sur 8 729 logements, 1 471 sont vacants, soit 16,9 % — la proportion la plus élevée des six communes documentées ici. 7 163 sont des résidences principales et 94 des résidences secondaires.',
          'Le parc est majoritairement collectif : 5 419 appartements (62,1 %) contre 3 290 maisons (37,7 %). Et il est partagé presque à égalité entre propriétaires (3 451, soit 48,2 %) et locataires (3 410, soit 47,6 %), dont 1 654 en HLM loué vide — 23,1 % des résidences principales, la part de logement social la plus forte après Freyming-Merlebach.',
        ],
      },
      {
        titre: 'Les trente glorieuses, puis l’arrêt',
        corps: [
          '2 597 résidences principales ont été achevées entre 1946 et 1970, 1 964 entre 1971 et 1990. Mais Saint-Avold a continué de construire plus longtemps que ses voisines : 1 206 logements entre 1991 et 2005, soit 16,9 % du parc, et 652 encore entre 2006 et 2020.',
          'L’avant-guerre est réduit : 219 logements d’avant 1919 et 512 de 1919 à 1945.',
        ],
      },
      {
        titre: 'On y devient propriétaire, et le parc social recule',
        corps: [
          'C’est la troisième courbe de cette page, et elle va dans un sens inattendu pour une commune qui perd des habitants. La part de propriétaires occupants est passée de 43,5 % en 2012 à 46,3 % en 2017, puis 48,2 % en 2023 — soit 200 propriétaires de plus en onze ans, sur un parc de résidences principales qui en a perdu 309.',
          'Symétriquement, les locataires reculent de 3 848 à 3 410, et le logement social de 1 969 logements en 2012 à 1 654 en 2023, c’est-à-dire de 26,4 % à 23,1 % des résidences principales.',
          'La vacance, elle, s’est accélérée sur la dernière période : 1 032 logements vides en 2012 (12,1 %), 1 131 en 2017 (13,1 %), 1 471 en 2023 (16,9 %). Le parc total, lui, a continué de croître, de 8 541 à 8 729 logements.',
        ],
      },
    ],
    sources: [dossierInsee('57606', 'Saint-Avold')],
  },

  // ────────────────────────────────────────────────────────────────────
  'freyming-merlebach': {
    accroche:
      'Sur les six communes documentées ici, Freyming-Merlebach est la seule dont la population augmente. Et c’est aussi celle où l’on est le plus souvent locataire.',
    sections: [
      {
        titre: 'La seule courbe qui remonte',
        corps: [
          'La commune comptait 13 122 habitants en 2012, puis 12 818 en 2017 — un creux — et 13 266 en 2023. La variation annuelle moyenne ressort à +0,6 % sur 2017-2023, là où Forbach et Saint-Avold perdent 0,8 % par an. Freyming-Merlebach a non seulement enrayé sa baisse, elle a dépassé son niveau de 2012.',
          'La densité remonte en conséquence : 1 414,8 habitants au km² en 2017, 1 464,2 en 2023. Et le nombre moyen d’occupants par résidence principale, 2,21 en 2023, est le plus élevé des six communes : on y vit en familles plus nombreuses qu’ailleurs dans le secteur.',
        ],
      },
      {
        titre: 'Une commune de locataires',
        corps: [
          'Sur 5 850 résidences principales, 3 186 sont louées — 54,5 % — contre 2 308 occupées par leur propriétaire (39,4 %). Le logement social y pèse particulièrement lourd : 1 800 HLM loués vides, soit 30,8 % des résidences principales. Près d’un foyer sur trois.',
          'Le parc est à 54,9 % composé d’appartements (3 680) pour 42,4 % de maisons (2 844). La part de maisons reste donc plus forte qu’à Forbach ou Saint-Avold, ce qui laisse un marché d’accession réel à côté du parc locatif.',
        ],
      },
      {
        titre: 'Peu de logements vides',
        corps: [
          'Avec 808 logements vacants sur 6 700, la vacance s’établit à 12,1 %. C’est la plus basse des quatre communes urbaines traitées ici — Forbach 16,3 %, Saint-Avold 16,9 %, Sarreguemines 13,1 %. Les résidences principales représentent 87,3 % du parc, et les résidences secondaires y sont presque inexistantes : 42 logements, 0,6 %.',
        ],
      },
      {
        titre: 'Un bâti d’après-guerre, en deux temps égaux',
        corps: [
          'Le parc s’est construit en deux vagues de poids presque identique : 1 910 résidences principales entre 1946 et 1970 (32,7 %) et 1 903 entre 1971 et 1990 (32,6 %). L’avant-guerre pèse davantage qu’ailleurs dans le bassin, avec 304 logements d’avant 1919 et 832 entre 1919 et 1945 — 14,3 % pour cette seule tranche.',
          'La construction récente, en revanche, est faible : 477 logements entre 1991 et 2005, 407 entre 2006 et 2020.',
        ],
      },
      {
        titre: 'Emploi et revenus',
        corps: [
          'La commune accueillait 3 716 emplois en 2023. Le taux de chômage des 15-64 ans atteignait 18,8 %, soit 939 chômeurs, et le niveau de vie médian 20 550 euros, pour un taux de pauvreté de 28,0 %.',
        ],
      },
      {
        titre: 'Un décrochage entre 2012 et 2017, puis un redressement',
        corps: [
          'Les trois recensements dessinent nettement deux périodes. Entre 2012 et 2017, les résidences principales reculent de 5 960 à 5 703 et la vacance bondit de 476 à 778 logements, soit de 7,4 % à 12,0 % du parc. Entre 2017 et 2023, le mouvement s’inverse pour les résidences principales, qui remontent à 5 850, pendant que la vacance se stabilise à 808 logements (12,1 %).',
          'L’emploi n’a pas connu ce redressement : 4 951 emplois dans la zone en 2012, 4 152 en 2017, 3 716 en 2023. Mais le chômage recule sans interruption — 22,7 %, puis 21,5 %, puis 18,8 % des 15-64 ans.',
          'La location, elle, progresse à chaque recensement : 46,9 % des résidences principales en 2012, 52,9 % en 2017, 54,5 % en 2023.',
        ],
      },
    ],
    sources: [dossierInsee('57240', 'Freyming-Merlebach')],
  },

  // ────────────────────────────────────────────────────────────────────
  'grosbliederstroff': {
    accroche:
      'Grosbliederstroff touche la frontière allemande. C’est la commune au niveau de vie le plus élevé du secteur — et celle dont la vacance progresse le plus vite.',
    sections: [
      {
        titre: 'Le niveau de vie le plus haut des six',
        corps: [
          'Le niveau de vie médian s’élevait à 29 030 euros en 2023, pour un taux de pauvreté de 11,0 %. Les écarts avec le reste du secteur sont considérables : Forbach est à 19 530 euros et 34,0 % de pauvreté, Freyming-Merlebach à 20 550 euros.',
          'Le chômage suit la même logique : 6,5 % des 15-64 ans en 2023, soit 106 personnes, contre 23,4 % à Forbach. La commune accueillait par ailleurs 1 211 emplois, pour un indicateur de concentration d’emploi de 76,5.',
        ],
      },
      {
        titre: 'Une population qui tient',
        corps: [
          '3 321 habitants en 2012, 3 303 en 2017, 3 346 en 2023 : en onze ans, la commune a gagné vingt-cinq habitants. La variation annuelle moyenne est de +0,2 % sur 2017-2023, après −0,1 % sur la période précédente. La densité s’établit à 256,0 habitants au km², et le nombre moyen d’occupants par résidence principale à 2,08, stable depuis 2017.',
        ],
      },
      {
        titre: 'Le point à surveiller : la vacance',
        corps: [
          'C’est le seul indicateur qui se dégrade nettement, et il mérite d’être suivi dans le temps plutôt que lu isolément. Les logements vacants étaient 105 en 2012 (6,3 % du parc), 153 en 2017 (8,8 %), et 170 en 2023 (9,5 %). Le parc total, lui, est passé de 1 666 à 1 798 logements sur la même période.',
          'Autrement dit, la commune a construit — 259 résidences principales achevées entre 2006 et 2020, 267 entre 1991 et 2005 — et une part croissante de l’ancien n’a pas retrouvé preneur. Un vendeur de bien ancien y est aujourd’hui en concurrence avec du récent.',
        ],
      },
      {
        titre: 'Un parc de maisons, majoritairement détenu',
        corps: [
          'Sur 1 798 logements, 1 197 sont des maisons (66,6 %) et 595 des appartements (33,1 %). Et 1 070 résidences principales sur 1 612 sont occupées par leur propriétaire, soit 66,4 %, contre 494 louées (30,7 %). Le logement social est marginal : 17 HLM loués vides, 1,0 %.',
          'Côté ancienneté, 482 résidences principales datent de 1946-1970 et 314 de 1971-1990, tandis que 260 logements environ remontent à l’avant-guerre — 115 d’avant 1919 et 145 entre 1919 et 1945.',
        ],
      },
      {
        titre: 'Ce que trois recensements disent de la détention',
        corps: [
          'La part de propriétaires occupants s’érode doucement : 68,9 % des résidences principales en 2012, 66,9 % en 2017, 66,4 % en 2023. En nombre, les propriétaires restent pourtant stables, de 1 074 à 1 070 — ce sont les locataires qui augmentent, de 423 à 494.',
          'Le parc d’appartements suit le même mouvement : 480 logements en 2012, 595 en 2017, 595 en 2023, soit une part passée de 28,8 % à 33,1 %. Les maisons, elles, sont 1 186 en 2012 et 1 197 en 2023.',
          'L’emploi local recule sur la période : 1 379 emplois dans la zone en 2012, 1 236 en 2017, 1 211 en 2023. Le chômage des 15-64 ans, en revanche, passe de 8,7 % à 9,2 % puis redescend à 6,5 %.',
        ],
      },
    ],
    sources: [dossierInsee('57260', 'Grosbliederstroff')],
  },
}

/** Le contenu éditorial d'une commune, ou `null` si elle n'en a pas encore. */
export const pageCommune = (slug) => communesPages[slug] ?? null
