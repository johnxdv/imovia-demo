import { InkRoughen, useInkFilterId } from './InkTexture'

/**
 * Silhouettes de la fenêtre de saisie de la surface — cinq maisons, une par
 * palier du curseur.
 *
 * Cinq dessins distincts plutôt qu'une forme unique qu'on déformerait : à
 * 800 m², ce n'est plus la même maison en plus grand, c'est un autre programme.
 * Une interpolation continue aurait donné un pavillon étiré, là où le saut de
 * palier raconte quelque chose — un toit se met à plat, un volume devient deux,
 * la piscine arrive, une annexe se détache.
 *
 * **Les deux premiers paliers ont un toit à deux pentes, et c'est délibéré.**
 * Le reste du parcours tient un registre d'architecte strictement orthogonal
 * (voir [`src/data/inkScenes.js`](../../data/inkScenes.js)), et les trois
 * derniers paliers s'y conforment. Mais un volume de 30 m² à toit plat, sans
 * pente ni cheminée, ne se lit pas comme une maison : il se lit comme un
 * garage. À cette taille-là, la pente du toit est le seul signal qui dise
 * « maison » — la charte cède devant la lisibilité, et uniquement là où le
 * dessin est trop petit pour se défendre autrement. Le curseur raconte alors
 * une progression : la maison devient villa d'architecte, puis domaine.
 *
 * **Au trait, sans aucun aplat de couleur**, dans le registre à l'encre du
 * reste du parcours ([`InkScene`](./InkScene.jsx)) : la teinte vient du
 * `currentColor` posé par le parent, et les seules surfaces remplies sont les
 * vitrages et l'eau, à quelques pourcents d'opacité. Les trajets sont écrits en
 * cubiques tremblées et passent sous le même filtre « main levée »
 * ([`InkRoughen`](./InkTexture.jsx)) que les scènes du parcours — sans quoi
 * cinq maisons faites de segments parfaits jureraient avec tout le reste.
 *
 * Tous partagent la même `viewBox` et la même ligne de sol : au fondu enchaîné,
 * le terrain ne bouge pas, seul le bâti change.
 */

// Plus haute que le dessin bâti ne le demande : les bassins des deux derniers
// paliers descendent sous la ligne de sol, et une `viewBox` calée sur celle-ci
// les aurait tranchés net. Les trois premiers paliers y gagnent du vide en
// pied — ce qui est sans conséquence, la ligne de sol restant au même endroit
// d'un palier à l'autre.
const VIEW_BOX = '0 0 260 142'

/** 10 à 50 m² — la plus petite du lot, et celle qui doit le plus clairement se lire comme une maison. */
const PETITE = [
  { d: 'M9.5 114 C89.8 114.9 170 114.2 250.3 114.5', w: 1.6, o: 0.35 },
  // Le pignon, la toiture à deux pentes et la cheminée : à cette taille-là, c’est ce qui fait lire une maison plutôt qu’un box.
  { d: 'M104.4 115.1 C103.7 103.4 104.7 91.7 104.1 80 C121.4 80.8 138.7 79.3 156 80.2 C156.5 91.6 155.7 103 155.7 114.4', w: 1.8 },
  { d: 'M96.1 80.8 C107.1 73.5 118.4 64.4 129.8 57 C140.6 65.2 151.8 72.9 162.9 81.4', w: 1.8 },
  { d: 'M95.8 81.1 C118.6 80.3 141.4 80.4 164.1 80.7', w: 1.2, o: 0.6 },
  { d: 'M144.2 69.2 C144.3 62.8 143.8 56.4 143.8 50 C146.9 49.6 149.9 49.2 153 49.7 C152.5 58.2 153.9 66.7 153.2 75.1', w: 1.3 },
  { d: 'M122 114 C127.3 113.9 132.7 114.3 138 114 C138.5 106.7 138.7 99.3 138 92 C132.7 92.1 127.3 91.8 122 91.6 C122.5 99.1 122.3 106.5 122.4 114 Z', w: 1.3 },
  { d: 'M121.6 113.8 C127 113.6 132.5 113.3 138 114.2 C137.7 106.8 137.8 99.4 138.4 92 C132.9 91.9 127.5 91.1 122 91.6 C122.6 99.1 122.6 106.5 122.3 114 Z', o: 0.07, aplat: true },
  { d: 'M134.5 105.2 C134.4 103.2 133.7 101.1 133.9 99.1', w: 0.9, o: 0.6 },
  { d: 'M109.1 100.8 C112.1 100.4 115 101.6 118 101.1 C118.5 97.4 118 93.7 117.9 90 C115.2 89.2 112.6 89.2 110 90 C110.6 93.7 110 97.3 110.3 101 Z', w: 1.1 },
  { d: 'M141.5 100.7 C144.4 101.7 147.2 100.4 150 101.2 C150.9 97.5 150.8 93.7 150.3 90 C147.5 90.5 144.8 89.6 142 89.9 C142.5 93.6 142.7 97.3 142 101 Z', w: 1.1 },
  { d: 'M130.3 72 C129.7 70 130.4 67.9 129.7 65.9 M123.6 76.4 C128 75.8 132.4 75.8 136.9 76.1', w: 0.9, o: 0.5 },
  { d: 'M115.7 120.1 C118.5 118.3 121.8 115.8 124.4 114.2 M146.2 121 C143.8 118.8 140.3 117.7 137.7 115.2', w: 0.9, o: 0.3 },
  { d: 'M184.1 114.9 C183.7 108.9 184.3 102.9 184.1 96.9 M183.6 73.1 C187.1 77.9 191.2 82.1 195.3 86.2 C193.6 90.8 193.1 95.4 192.3 100.1 C186.9 99.3 181.4 100.4 176 99.8 C175.6 95 173.9 90.6 173.1 86.1 C177 82.5 180.5 78.5 184.3 74 Z', w: 1.2 },
]

/** 50 à 150 m² — le comble s’allonge, un garage s’adosse au pignon. */
const MOYENNE = [
  { d: 'M8.7 114 C89.2 113.7 169.7 113.3 250.2 114', w: 1.6, o: 0.35 },
  // Même maison, en plus grand : le comble se prolonge, un garage bas vient s’adosser au pignon.
  { d: 'M87.6 114.3 C88 100.9 88.9 87.4 88.4 74 C110.9 74.5 133.5 74.2 156 73.8 C156.5 87.6 156.6 101.3 156.3 115', w: 1.8 },
  { d: 'M80.7 74.9 C94.8 66 108.3 56.5 121.8 48 C135.2 57.6 149.6 66.1 163.2 75.8', w: 1.8 },
  { d: 'M80.2 75 C107.9 76 135.6 74.7 163.3 75.4', w: 1.2, o: 0.6 },
  { d: 'M140.2 62.5 C139.8 55.7 140.1 48.8 140.1 42 C143.1 41.6 146 42.2 149 42.2 C149.4 51.1 148.2 60 148.8 68.9', w: 1.3 },
  { d: 'M156 114.4 C156.3 107.6 155.4 100.8 156.1 94 C168.1 94.6 180 94.9 192 94.1 C191.7 101 191.8 107.8 191.7 114.7', w: 1.5 },
  { d: 'M150.3 95 C158.1 92.3 166.2 88.9 174 86.2 C181.9 89.6 189.2 93 196.9 95.5', w: 1.3 },
  { d: 'M161.9 114.1 C169.6 113.9 177.3 114 185 114.2 C184.6 109.1 185.5 104.1 185 99 C177.7 98.4 170.3 98.9 163 98.6 C163.1 103.7 162.7 108.9 163.1 114 Z', w: 1.1 },
  { d: 'M162.1 113.8 C169.8 114 177.4 114.4 185 113.7 C184.9 108.8 184.4 103.9 184.9 99 C177.6 98.7 170.3 99.6 163 98.9 C162.6 103.9 163.4 109 163.2 114 Z', o: 0.06, aplat: true },
  { d: 'M112.3 113.9 C118.5 113.1 124.8 113.6 131 113.7 C131.5 105.8 130.8 97.9 130.9 90 C124.9 89.5 119 89.9 113 90.4 C112.6 98.2 113.3 106.1 112.6 114 Z', w: 1.3 },
  { d: 'M112 113.7 C118.3 114.2 124.7 114.1 131 113.9 C130.4 105.9 131.7 98 130.9 90 C124.9 89.6 119 89.9 113 89.9 C112.3 98 113.8 106 113.2 114 Z', o: 0.07, aplat: true },
  { d: 'M126.7 105.1 C127.3 103.2 127.5 101.2 127.2 99.2', w: 0.9, o: 0.6 },
  { d: 'M95.8 100.3 C99.2 100.6 102.6 99.6 106 100.3 C105.8 95.8 106.4 91.4 106.1 87 C102.7 86.4 99.4 86.8 96 87.1 C96.1 91.4 96.3 95.7 96 100 Z', w: 1.1 },
  { d: 'M137.7 99.8 C141.1 100.6 144.6 100.8 148 100 C147.2 95.7 147.7 91.3 148 87 C144.7 86.1 141.3 86.6 138 86.7 C138.2 91.2 138.5 95.6 137.8 100 Z', w: 1.1 },
  { d: 'M111.2 66.5 C115.3 63.4 118.9 60.6 122.2 57.8 C125.8 60.8 129.2 63.4 132.4 66.2 M113.8 65 C114.4 68.2 113 71.4 113.6 74.6 M129.8 66 C129.8 68.9 130.4 71.9 129.6 74.8', w: 1 },
  { d: 'M105.2 120.4 C108.4 117.9 111.9 116 114.9 114.8 M139.2 119.7 C136 118.2 132.6 116.3 129.5 114.7', w: 0.9, o: 0.3 },
  { d: 'M215.9 115 C215.3 107.6 215.3 100.3 215.9 92.9 M215.3 65.8 C219.8 70 224.8 75.7 228.8 79.8 C227.4 85.3 227.3 90.6 225.9 96 C220 96.6 214 95.9 208 96 C206.7 90.4 204.7 85.5 204 79.9 C208.1 74.9 212 70.4 215.8 66 Z', w: 1.2 },
  { d: 'M60.1 114.8 C60.2 110.2 59.2 105.6 59.7 101 M59.3 83.8 C62 87.2 66 90.1 69 92.7 C68.1 96.6 67 100.2 66 104 C62 103.3 58 104.3 54 104.4 C53.6 100.5 51.9 97 50.7 93.1 C53.6 89.4 57 86.5 60 83.9 Z', w: 1.1, o: 0.7 },
]

/** 150 à 250 m² — bascule d’architecte : toit plat, étage en porte-à-faux. */
const ETAGE = [
  { d: 'M10 114.5 C90.4 114.8 170.8 113.7 251.2 113.9', w: 1.6, o: 0.35 },
  // Bascule dans le registre d’architecte : toit plat, étage en porte-à-faux, baies toute hauteur.
  { d: 'M86.1 114.8 C86.8 103.2 86.3 91.6 85.9 80 C109.9 79.3 134 80.4 158 79.8 C158.3 91.5 157 103.2 157.7 114.9', w: 1.8 },
  { d: 'M66.7 80.3 C106.8 80.5 146.9 80.3 187.1 80.3 M67.6 74.3 C107.5 75 147.4 74.9 187.3 74', w: 1.5 },
  { d: 'M77.8 74.2 C77.1 65.5 77.3 56.7 77.7 48 C110.4 47.7 143.2 47.4 176 48.3 C176.8 57.2 176.6 66.2 176 75.1', w: 1.8 },
  { d: 'M69.2 47.7 C107.7 48 146.1 47.8 184.6 47.8 M69.6 43 C108 43.2 146.3 43.6 184.7 43.1', w: 1.4 },
  { d: 'M93.8 73.8 C115.9 74.8 137.9 74.1 160 74.4 C160.6 67.6 159.9 60.8 160.2 54 C138.2 54.2 116.1 54.8 94 54 C94.8 60.6 94.6 67.3 94.4 74 Z', w: 1.2 },
  { d: 'M93.5 73.6 C115.7 73.3 137.8 73.5 160 74.3 C159.7 67.5 160.5 60.8 160.2 54 C138.1 53.4 116.1 54.5 94 53.7 C93.4 60.5 94.4 67.2 94.4 74 Z', o: 0.07, aplat: true },
  { d: 'M115.9 75.1 C115.9 67.7 116.4 60.4 115.6 53 M138 74 C137.8 67.3 137.6 60.5 137.6 53.8', w: 0.8, o: 0.45 },
  { d: 'M95.9 113.9 C113.9 114.3 132 114.3 150 114.2 C150.3 105.5 150.5 96.7 149.9 88 C131.9 87.1 114 88.6 96 87.9 C95.7 96.6 95 105.3 95.7 114 Z', w: 1.2 },
  { d: 'M94.9 114 C113.3 113.9 131.6 113.5 150 114.1 C149.9 105.4 150.7 96.7 149.9 88 C131.9 87.8 114 88 96 87.7 C96.2 96.4 95.9 105.2 96.2 114 Z', o: 0.07, aplat: true },
  { d: 'M123.4 115.1 C123.8 105.9 123.6 96.8 123.2 87.7', w: 0.8, o: 0.45 },
  { d: 'M158.4 114.1 C158.2 102.3 158.3 90.6 158.4 78.8 M86.1 114.4 C85.3 102.8 85.8 91.2 86 79.6', w: 1, o: 0.5 },
  { d: 'M185.6 79.6 C186.4 91.5 186.5 103.3 185.8 115.1', w: 1.1, o: 0.6 },
  { d: 'M207.6 115.1 C207.5 107.4 207.4 99.7 207.6 92 M207.6 67.6 C211.9 72.5 215.8 76.3 220.1 81.1 C219.9 86.1 218.2 91.1 217.1 95.9 C211.4 96.1 205.7 95.4 200 95.6 C197.9 90.7 197.2 85.9 195.6 81 C200.3 77 203.7 72.3 208.1 67.8 Z', w: 1.2 },
]

/** 250 à 500 m² — deux volumes décalés et un bassin qui court devant. */
const PISCINE = [
  { d: 'M9.8 114 C90 114.4 170.1 113.7 250.3 114.1', w: 1.6, o: 0.35 },
  // Deux volumes décalés, et le bassin qui court devant.
  { d: 'M117.7 114.5 C118.5 97.7 117.5 80.8 117.9 64 C141.3 63.6 164.6 64.6 188 63.7 C188.5 80.7 189 97.7 188.3 114.8', w: 1.8 },
  { d: 'M108.8 64.3 C138.6 64.8 168.3 63.7 198.1 64.4 M108.8 57.6 C138.9 56.8 169 57.5 199.1 57.5', w: 1.5 },
  { d: 'M188 115.2 C188.1 105.5 187.3 95.7 187.7 86 C200.4 85.3 213.2 85.5 226 85.7 C226.5 95.5 226 105.2 225.7 115', w: 1.5 },
  { d: 'M181.2 85.5 C198.3 85.1 215.3 85.6 232.4 86.3', w: 1.3 },
  { d: 'M125.9 114 C143.9 114.1 162 114.5 180 114.2 C180.3 100.2 179.3 86.1 180.2 72 C162.1 71.8 144.1 71.8 126 71.9 C126.9 85.9 125.4 100 126.2 114 Z', w: 1.2 },
  { d: 'M125.1 114.1 C143.4 114.5 161.7 113.9 180 113.9 C179.3 100 179.5 86 179.6 72 C161.8 71.4 143.9 72.6 126 72.1 C126.3 86.1 125.8 100 126.1 114 Z', o: 0.07, aplat: true },
  { d: 'M143.9 114.3 C143.9 99.8 143.8 85.3 143.6 70.8 M162.5 114.2 C162.1 99.7 161.9 85.3 162 70.8', w: 0.8, o: 0.45 },
  { d: 'M125.4 93.6 C143.7 94.5 162 94.5 180.2 93.9', w: 0.8, o: 0.4 },
  { d: 'M195.6 113.7 C203.7 114.4 211.9 114.1 220 114.1 C219.6 106.7 221 99.4 220.3 92 C212.2 92.1 204.1 91.8 196 91.7 C195.5 99.1 196.7 106.6 196.1 114 Z', w: 1.1 },
  { d: 'M118.4 114.9 C117.8 97.9 117.4 80.9 117.7 64 M187.9 114.3 C187.3 97.1 188.5 80 188.3 62.8', w: 1, o: 0.5 },
  { d: 'M25.6 118 C56.4 117.8 87.2 118.9 118 118.3 C117.1 122.2 118.1 126.1 117.7 130 C87.1 129.6 56.6 129.8 26 129.6 C25.8 125.7 26.2 121.9 25.9 118 Z', w: 1.5 },
  { d: 'M25.7 118.1 C56.4 118.7 87.2 117.4 118 118.2 C118.9 122.1 118.6 126.1 118.2 130 C87.5 129.9 56.7 130.7 26 130 C26.5 126 25.2 122 26.1 118 Z', o: 0.09, aplat: true },
  { d: 'M35.2 124.4 C59.5 124.4 83.8 124 108 124.3', w: 0.9, o: 0.3 },
  { d: 'M61.8 114.1 C61.3 108.3 62.9 102.6 62.4 96.9 M61.5 75.4 C65.1 79 69.1 83.3 72.7 88 C71.8 92.2 71 96.4 70.4 100.9 C64.9 100.7 59.5 101.3 54 100.9 C53.2 96.7 52.2 92.4 51 88 C54.8 83.9 58.9 79.7 62.1 76 Z', w: 1.1 },
]

/** 500 m² et au-delà — un domaine : corps principal, aile, annexe, bassin. */
const DOMAINE = [
  { d: 'M9.8 113.8 C89.9 114.1 170.1 114.3 250.2 113.7', w: 1.6, o: 0.35 },
  // Un domaine : corps principal, aile, annexe et bassin à débordement.
  { d: 'M96.1 115.3 C95.6 94.8 95.3 74.4 95.8 54 C123.9 54.6 151.9 53.9 180 53.9 C179.6 74.2 179.9 94.6 179.9 114.9', w: 1.8 },
  { d: 'M85.9 53.7 C121.6 53.8 157.3 53.2 193 53.6 M84.7 48.2 C120.6 48.9 156.4 47.6 192.2 47.8', w: 1.5 },
  { d: 'M113.6 48.7 C113.4 45.1 114.1 41.6 114.2 38 C130.8 38.3 147.4 37.8 164 38.2 C164.1 41.5 163.5 44.7 164.3 48', w: 1.2 },
  { d: 'M124 37.6 C124.7 41.2 123.5 44.8 123.8 48.4 M137.5 37.1 C137.8 41.1 137.8 45 137.9 49 M152.4 37.1 C152.9 41 152.7 44.9 151.7 48.8', w: 0.7, o: 0.4 },
  { d: 'M179.9 114.6 C179.3 102.4 180.4 90.2 179.8 78 C194.6 78.7 209.3 78.5 224 78.4 C224.4 90.3 223.6 102.2 223.6 114.1', w: 1.5 },
  { d: 'M173.3 77.8 C192.3 78.2 211.4 77.3 230.5 78.1', w: 1.3 },
  { d: 'M51.7 114.5 C51.7 103.7 51.8 92.8 52.3 82 C67.2 81.5 82.2 82.2 97.1 81.8', w: 1.5 },
  { d: 'M45.2 81.9 C64.4 81 83.7 82.2 102.9 81.8', w: 1.3 },
  { d: 'M103.2 113.8 C126.1 113.8 149.1 114.6 172 113.9 C171.4 96.6 172.3 79.3 171.8 62 C149.2 62.1 126.6 62.6 104 62.2 C103.4 79.5 104.4 96.7 103.7 114 Z', w: 1.2 },
  { d: 'M102.7 114.3 C125.8 113.8 148.9 114.8 172 113.9 C172.1 96.6 171 79.3 171.7 62 C149.1 61.7 126.6 61.2 104 61.9 C104.3 79.2 103.8 96.6 103.7 114 Z', o: 0.07, aplat: true },
  { d: 'M121.2 115 C120.8 97.3 121.7 79.5 121.4 61.8 M138.3 114.9 C138.2 96.9 137.3 78.8 137.8 60.8 M154.9 114.5 C155.5 96.6 155.6 78.7 154.9 60.9', w: 0.8, o: 0.45 },
  { d: 'M103.6 88 C126.5 88 149.4 88.4 172.3 88.5', w: 0.8, o: 0.4 },
  { d: 'M61.2 114 C70.2 113.7 79.1 113.7 88 114.1 C88.7 106.1 87.9 98 88.3 90 C79.5 89.4 70.8 89.8 62 90 C62.3 98 61.8 106 62.1 114 Z', w: 1.1 },
  { d: 'M189.3 114.3 C198.2 113.6 207.1 114.7 216 114 C216.6 105.3 215.6 96.7 216.2 88 C207.4 88.2 198.7 87.7 190 88.2 C189.8 96.8 190.3 105.4 189.7 114 Z', w: 1.1 },
  { d: 'M96.4 115.2 C96.5 94.6 95.3 74 95.5 53.4 M179.5 114.5 C179.1 94.1 180.1 73.6 179.8 53.2', w: 1, o: 0.5 },
  { d: 'M16.8 118.1 C65.9 118.7 114.9 117.7 164 117.6 C164.7 122.4 164 127.2 164.4 132 C115.6 132.6 66.8 132 18 131.8 C18.7 127.2 18.3 122.6 18.1 118 Z', w: 1.5 },
  { d: 'M16.9 118.4 C65.9 118.8 115 118.7 164 117.7 C163.9 122.4 163.6 127.2 163.9 132 C115.3 131.9 66.6 131.6 18 132.2 C18.3 127.5 18.4 122.7 18 118 Z', o: 0.09, aplat: true },
  { d: 'M26.9 122.7 C69.3 122.1 111.7 122.1 154.1 122.7 M27.3 128.3 C69.7 128.2 112.2 127.8 154.6 127.6', w: 0.9, o: 0.28 },
  { d: 'M237.7 115.1 C238.5 105.9 237.1 96.8 237.9 87.6 M237.5 63 C241.5 67.9 245.7 72.1 249.1 77.1 C247.6 81.9 247 86.4 246.2 91 C240.8 91.6 235.4 91.8 230 91 C229.7 86.3 228.5 81.7 227 77 C230.4 72.2 234.2 68.4 237.9 64 Z', w: 1.1 },
  { d: 'M31.6 114.3 C31 106.8 32.3 99.2 31.9 91.7 M32 69.7 C35.7 74.2 39.7 78 42.8 82.1 C41.8 86.3 41.2 90.6 40.4 95.1 C34.9 95.6 29.5 94.8 24 94.7 C23.9 90.4 21.9 86.2 21.4 81.9 C24.6 78.5 28 74.2 32.2 70 Z', w: 1.1 },
]

/**
 * Paliers du curseur, du plus petit au plus grand. `max` est la borne haute
 * exclue ; le dernier palier n'en a pas — il absorbe tout ce qui dépasse, ce
 * que le curseur affiche par ailleurs « 800+ ».
 */
const TIERS = [
  { id: 'petite', max: 50, traits: PETITE },
  { id: 'moyenne', max: 150, traits: MOYENNE },
  { id: 'etage', max: 250, traits: ETAGE },
  { id: 'piscine', max: 500, traits: PISCINE },
  { id: 'domaine', max: Infinity, traits: DOMAINE },
]

/**
 * Palier correspondant à une surface. Gardés privés, l'un comme l'autre : ce
 * fichier n'exporte que son composant, condition du rafraîchissement à chaud
 * de Vite — un export de données à côté le fait retomber sur un rechargement
 * complet de la page à chaque retouche d'un dessin.
 */
const tierIndexFor = (surfaceM2) => TIERS.findIndex((tier) => surfaceM2 < tier.max)

/** Un palier, tracé d'un bloc sous le filtre « main levée » du parcours. */
function Dessin({ traits, filterId }) {
  return (
    <g filter={`url(#${filterId})`}>
      {traits.map(({ d, w, o, aplat }, index) =>
        aplat ? (
          <path key={index} d={d} fill="currentColor" fillOpacity={o ?? 0.07} stroke="none" />
        ) : (
          <path key={index} d={d} strokeWidth={w ?? 1.4} strokeOpacity={o ?? 1} />
        ),
      )}
    </g>
  )
}

/**
 * Silhouette du palier courant, en fondu enchaîné avec les autres.
 *
 * Les cinq dessins sont montés en permanence et superposés : seule leur
 * opacité change. Rien n'est monté ni démonté au franchissement d'un seuil —
 * c'est ce qui permet de traverser toute l'échelle d'un geste sans à-coup, les
 * paliers sautés se contentant de rester à zéro. `opacity` et `transform` se
 * composent sur le GPU : aucun recalcul de mise en page pendant le glissement.
 *
 * Le filtre, lui, est déclaré une seule fois pour les cinq, dans un `<svg>` de
 * taille nulle posé à côté d'eux : il ne dépend que de la `viewBox`, qu'ils
 * partagent, et cinq exemplaires du même bruit coûteraient cinq fois le calcul
 * pour un résultat identique. Un `url(#…)` se résout à l'échelle du document,
 * pas du `<svg>` courant — le porte-filtre n'a donc rien à dessiner, et le
 * loger dans l'un des cinq calques ferait dépendre les quatre autres d'un
 * dessin qui n'est pas le leur.
 *
 * Contrairement aux scènes de l'écran d'analyse, rien ne se trace ici : le
 * dessin doit répondre au doigt, pas se dérouler. Un tracé progressif relancé à
 * chaque cran du curseur ne montrerait jamais qu'un début de maison.
 *
 * Sous `prefers-reduced-motion`, le filet CSS global ramène les transitions à
 * une durée nulle : le changement devient un remplacement net, sans fondu.
 *
 * `className` ne porte que des dimensions : la racine se pose elle-même en
 * `relative`, socle des cinq calques superposés. Lui passer un `absolute`
 * entrerait en conflit avec — et Tailwind tranchant par son propre ordre, pas
 * par celui des classes écrites, c'est `relative` qui l'emporterait. À
 * positionner par un parent, donc, jamais par cette prop.
 */
export function HouseIllustration({ surfaceM2, className = '' }) {
  const active = tierIndexFor(surfaceM2)
  const filterId = useInkFilterId()

  return (
    <div aria-hidden="true" className={`relative text-ink ${className}`}>
      <svg role="presentation" className="absolute h-0 w-0" aria-hidden="true">
        <InkRoughen id={filterId} scale={4} />
      </svg>

      {TIERS.map(({ id, traits }, index) => (
        <svg
          key={id}
          viewBox={VIEW_BOX}
          role="presentation"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`absolute inset-0 h-full w-full transition-[opacity,transform] duration-500 ease-plan will-change-transform ${
            index === active ? 'scale-100 opacity-100' : 'scale-[0.94] opacity-0'
          }`}
        >
          <Dessin traits={traits} filterId={filterId} />
        </svg>
      ))}
    </div>
  )
}
