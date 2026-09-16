/**
 * Dessins à l'encre de Chine du parcours d'estimation.
 *
 * Chaque scène est une `viewBox` et une liste de tracés **dans l'ordre où la
 * main les poserait** : le sol avant les murs, les murs avant les menuiseries,
 * le décor en dernier. Cet ordre est le seul minutage — [`InkScene`](../components/estimation/InkScene.jsx)
 * répartit les traits sur la durée demandée et n'a rien d'autre à savoir.
 *
 * Un tracé : `{ d, w, o, aplat }`. `w` est l'épaisseur (1,6 par défaut), `o`
 * l'opacité, `aplat` marque une forme qui se pose d'un bloc plutôt que de se
 * tracer (eau, vitrage). Aucune couleur nulle part : le trait prend celle du
 * texte du parent.
 *
 * **Le registre est tenu, pas décoratif.** Style architecte : volumes
 * rectilignes, dalles en débord, baies toute hauteur, refends marqués — des
 * angles droits, jamais d'arrondi contemporain. Les seules courbes de tout le
 * fichier sont végétales, ou les poivrières du château (qui n'est pas une
 * maison d'architecte et n'a pas à en prendre les lignes).
 *
 * **Deux écritures cohabitent, et ce n'est pas un oubli.** Les dix scènes de
 * l'écran d'analyse sont écrites en `H`/`V`/`L` — droites parfaites, lisibles
 * et retouchables à la main. Les dessins ajoutés depuis (la tour de l'étape
 * adresse, les quatre états de la boucle de métamorphose) sont en cubiques
 * déjà tremblées : ventre qui s'écarte de la corde, débords aux angles, aucune
 * parallèle exacte. Les deux passent ensuite sous le filtre « main levée » de
 * [`InkScene`](../components/estimation/InkScene.jsx), qui suffit à emporter
 * les premières ; les secondes, plus exposées — plein écran derrière un titre,
 * ou rejouées en boucle — méritaient d'être irrégulières jusque dans leur
 * géométrie. Ces trajets-là sont sortis d'un générateur à graine fixe
 * (`scripts` de travail, non versionnés) : on ne les retouche pas au doigt, on
 * les regénère.
 */

/**
 * Tour d'habitation de l'étape adresse — un immeuble qui monte, tracé en
 * six secondes derrière le champ de saisie.
 *
 * **Format portrait, et c'est tout le sujet.** Le dessin précédent était une
 * demeure large, posée en travers de l'écran ; celui-ci est une verticale. La
 * `viewBox` est deux fois plus haute que large, et l'ordre des tracés suit ce
 * mouvement : le sol, le socle, les deux arêtes d'un seul geste, puis les
 * planchers l'un après l'autre du bas vers le haut, et le couronnement en
 * dernier. Le dessin ne se remplit pas, il grandit.
 *
 * **Le tremblé ne vient pas d'ici.** Les trajets sont déjà posés à la main —
 * ventre qui s'écarte de la corde, débords aux angles, aucune horizontale
 * parallèle à sa voisine — et le filtre de [`InkScene`](../components/estimation/InkScene.jsx)
 * en rajoute une couche par-dessus. Les deux ensemble font la différence entre
 * un dessin à l'encre et une grille de segments.
 */
export const INK_TOUR = {
  id: 'tour-habitation',
  // Cadrée au plus juste : le mât dépasse à peine en haut, la ligne
  // d'avant-plan ferme en bas. Le bloc qui l'accueille se dimensionne sur ces
  // proportions, et la base de la tour tombe alors toujours au même endroit de
  // la page.
  viewBox: '0 24 200 396',
  traits: [
    // Le sol, puis le socle : la tour part de là et ne fait plus que monter.
    { d: 'M7.5 404.3 C69.2 403.6 130.9 404 192.6 404.5', w: 2 },
    { d: 'M43.7 404.7 C42.8 393.8 43 382.9 44 372 C81.3 371 118.7 371.4 156 372.3 C157.2 382.9 157 393.5 156.2 404.1', w: 1.9 },
    { d: 'M30 372.3 C76.7 372.3 123.4 371 170 372.1 M28.2 365.6 C76.1 365 123.9 365.5 171.8 366', w: 1.6 },
    // Hall vitré toute hauteur, sous l’auvent du socle.
    { d: 'M73.1 404.3 C90.8 404 108.4 403.3 126 403.9 C125.7 395.3 126.3 386.6 126.1 378 C108.7 377.2 91.4 378.9 74 378.4 C73.6 386.9 74.5 395.5 73.7 404 Z', w: 1.3 },
    { d: 'M73.8 404.3 C91.2 404.6 108.6 403.4 126 404.3 C126.4 395.5 125 386.8 126 378 C108.6 378.5 91.3 377.8 74 377.7 C73.2 386.5 74.4 395.2 73.7 404 Z', o: 0.07, aplat: true },
    { d: 'M88 405.7 C87.4 396.2 86.9 386.7 88.1 377.1 M112.1 404.5 C111.5 395.6 111.8 386.6 112.2 377.7', w: 0.8, o: 0.45 },
    // Les deux arêtes, d’un seul geste du socle à l’attique : c’est ce trait-là qui donne la hauteur.
    { d: 'M64.2 367 C64.3 279 63.5 190.9 63.8 102.9', w: 1.9 },
    { d: 'M135.7 366.4 C134.9 278.3 135.9 190.2 136 102.2', w: 1.9 },
    // Puis les planchers, l’un après l’autre — la tour gagne un étage à chaque trait.
    { d: 'M49.7 340.3 C82.1 339.6 114.5 341.3 146.8 340.4 M51.8 335 C82.7 334.7 113.6 335.7 144.5 334.5', w: 1.18 },
    { d: 'M48 313.8 C81.1 313.9 114.2 315.2 147.3 314.4 M48.3 309.4 C80.7 308.8 113 308.3 145.4 308.7', w: 1.32 },
    { d: 'M48.7 287.8 C81.7 288.3 114.7 288.4 147.7 287.6 M48.6 282.9 C81.2 284.1 113.7 283.2 146.3 283.2', w: 1.3 },
    { d: 'M48.6 262.2 C82.9 261.6 117.2 263.3 151.6 262.3 M48.7 257 C82.9 257.6 117.1 257.9 151.3 257.2', w: 1.27 },
    { d: 'M50.9 236.1 C82.9 235.6 115 237.1 147.1 235.9 M52.6 231.5 C83.5 231.3 114.4 231.1 145.4 230.9', w: 1.28 },
    { d: 'M49.1 210.4 C82.8 209.7 116.6 210.4 150.4 209.8 M48.9 205.4 C82.2 204.8 115.5 205 148.8 204.7', w: 1.35 },
    { d: 'M50 183.9 C83 184.5 116 183.2 149 183.8 M52.3 179.2 C83.9 178.5 115.4 180.2 147 179', w: 1.16 },
    { d: 'M51.9 157.7 C84.2 158.6 116.4 158 148.6 157.7 M53.9 152.9 C85.3 153.4 116.6 153.1 148 153', w: 1.25 },
    { d: 'M51.8 131.6 C85.2 131.3 118.5 132.3 151.9 132.2 M53.3 127.1 C86 127.3 118.8 126.7 151.5 127', w: 1.25 },
    { d: 'M57.9 340.2 C58.4 337.5 58.1 334.9 58.4 332.2 M68 340.2 C68 336.9 68.5 333.8 68.9 330.5 M80 340.2 C79.6 337 79.7 333.9 79.1 330.7 M90.5 340 C90.4 337.2 90.2 334.4 90.5 331.6 M102 340.1 C101.9 337.5 101.4 334.9 101.2 332.2 M112.5 340.3 C113.1 337.2 113.3 334 114.1 330.9 M125.2 340 C125 336.8 125 333.6 124.9 330.4 M134.2 340.4 C134.8 337.3 134.9 334.1 135.5 331', w: 0.7, o: 0.3 },
    { d: 'M57.1 288.4 C57.7 285.4 58.5 282.5 59 279.6 M69.4 288.1 C69 285.1 68.8 282.2 68.8 279.3 M78.8 288.1 C79.2 284.9 79.8 281.7 80.1 278.5 M90.4 288.3 C90.1 285.3 89.9 282.2 89.9 279.2 M102.2 288.3 C102 285.3 101.5 282.3 101.5 279.2 M112.1 288.3 C112.5 285.6 112.2 282.9 112.3 280.3 M125.1 288.3 C125.1 285.6 124.6 282.8 124.3 280 M135.3 288.2 C135.3 284.9 134.8 281.7 134.8 278.5', w: 0.7, o: 0.3 },
    { d: 'M58.1 236.3 C58.1 233.2 57.5 230 57.6 226.8 M69.3 236 C69.6 233.6 69.5 231.1 69.5 228.7 M81.3 236.1 C80.7 232.9 79.4 229.7 78.7 226.6 M92.5 236.2 C91.8 232.8 91.1 229.4 90 226 M101.7 236.3 C101.7 233.1 102 229.9 102.4 226.7 M113.7 236.1 C113.7 233.6 113.3 231.2 113.3 228.7 M122.6 236 C122.7 233.3 122.8 230.6 123.4 227.8 M135.7 236.3 C135.4 233.5 135.1 230.7 134.8 227.9', w: 0.7, o: 0.3 },
    { d: 'M59.6 184.1 C59.3 180.7 59.3 177.3 58.9 174 M69.3 184.1 C69.4 180.8 69.9 177.4 70.3 174.1 M80.1 184.3 C80.5 180.8 80.7 177.4 80.6 173.9 M91.7 184.3 C91.7 180.8 91.4 177.3 91 173.9 M100.4 184 C101.2 180.9 101.7 177.7 102.7 174.5 M113.7 184.1 C113.4 181 113.2 177.9 112.5 174.8 M122.9 184.2 C123.4 181.7 124.2 179.3 124.8 176.9 M134.3 184.4 C134.5 181.2 135.5 178.2 135.7 175', w: 0.7, o: 0.3 },
    { d: 'M56.6 132.1 C56.6 129.5 56.7 126.8 56.6 124.2 M67.6 132.1 C67.9 129.4 68.9 126.7 69.2 123.9 M78.6 132.2 C78.8 129.3 79.6 126.5 79.6 123.7 M89.7 132 C90.4 128.9 91.2 125.6 91.6 122.5 M101.6 132 C101.4 129.3 101.6 126.5 101.6 123.7 M113 132.2 C112.9 129.7 113.7 127.2 113.7 124.7 M124.4 132.2 C124.7 129.1 124.6 125.9 124.5 122.8 M134.4 132.1 C134.9 128.9 135.3 125.8 136.2 122.6', w: 0.7, o: 0.3 },
    // Refends — le rythme vertical de la façade, repris d’un bout à l’autre.
    { d: 'M85.5 367.8 C85.2 283.6 85.3 199.4 85.8 115.2 M113.5 366 C114 282.3 114.4 198.6 113.8 114.9', w: 1, o: 0.5 },
    { d: 'M88.8 314.1 C95.8 313.4 102.9 314.9 110 313.7 C110.7 307.4 109 301.2 109.7 295 C103.1 295.2 96.6 293.8 90 294.8 C91.3 301.2 91.1 307.6 90.3 314 Z', o: 0.06, aplat: true },
    { d: 'M88.5 236 C95.6 236.3 102.8 235 110 236.2 C109.1 229.8 108.8 223.4 109.9 217 C103.3 217.4 96.6 217.5 90 217 C89.9 223.3 90.4 229.7 89.7 236 Z', o: 0.06, aplat: true },
    { d: 'M88.8 158.2 C95.9 158.2 102.9 158.8 110 157.6 C109.8 151.4 110.5 145.2 110 139 C103.3 138.9 96.7 138.2 90 139.3 C89.2 145.6 90.2 151.8 89.8 158 Z', o: 0.06, aplat: true },
    // Hachures sur la face de droite — l’ombre portée du volume, à la plume.
    { d: 'M125.8 348.3 C129.6 344.2 132.8 339.7 136.3 335.8 M125.5 329.2 C129.4 325.1 132.4 320.9 136.4 317 M125.9 310.3 C129.3 306.1 132.9 302.5 136.3 298.2 M126 290.9 C129.1 286.8 132.4 282.9 136 278.5 M125.6 272.2 C129.4 267.8 132.2 263.6 135.9 259.7 M126.1 253.2 C129.6 249 132.8 245.1 136.6 241.1 M125.5 234.2 C128.9 230 132.6 226.3 136.2 222.2 M125.8 215.2 C129.5 211 132.7 207.3 136.4 203 M126 196.2 C129.1 192.3 132.4 187.9 135.9 183.7 M125.6 177.3 C129.2 173.1 132.6 169.3 136.3 165.2 M126 158.2 C129.9 154 132.9 149.6 136.6 145.6 M125.6 139.3 C129.3 134.8 132.3 131 136 126.5', w: 0.7, o: 0.22 },
    // Attique, pergola à lames et mât : le couronnement, tracé en dernier.
    { d: 'M72.4 105.4 C71.8 94.9 71.8 84.5 71.8 74 C90.6 73.6 109.3 74.9 128 74.3 C128.8 84.3 127.6 94.4 128.3 104.5', w: 1.7 },
    { d: 'M60.5 74.2 C86.7 73.7 112.9 73.8 139.1 73.9', w: 1.5 },
    { d: 'M72.7 74.4 C72.7 70.1 72 65.8 71.8 61.5 M82.3 74.1 C82 69.9 82.6 65.7 82.5 61.5 M92.2 74.3 C92 70 91.4 65.9 91.4 61.6 M101.8 74.1 C101.8 70.1 102.1 66 102.4 61.9 M111.4 74.4 C111.5 70.2 111.6 66 111.4 61.9 M122 74.3 C121.9 70.2 122.5 66.1 122.3 61.9', w: 0.8, o: 0.4 },
    { d: 'M65.7 62.4 C88.8 61 111.9 61.9 135.1 61.6', w: 1.1, o: 0.6 },
    { d: 'M99.9 62.9 C101 54.7 101.2 46.5 100.3 38.3', w: 1, o: 0.55 },
    // Deux cyprès au pied — sans eux la hauteur n’a rien à quoi se mesurer.
    { d: 'M22.3 405.2 C22.4 383.4 21.6 361.5 21.8 339.6 M21.7 248.5 C25.3 265.7 28.7 282.6 33.8 299.9 C33.1 314.7 30.2 329.4 30.1 344 C24.7 343.5 19.4 344.8 14 344.3 C12.1 329.6 12.3 314.8 10.4 300 C13.7 283.4 18.9 266.8 21.8 250 Z', w: 1.3 },
    { d: 'M178.1 404.4 C179.1 386.4 178.9 368.3 178.4 350.3 M178 273.8 C180.8 288 185.6 301.9 188.2 316.1 C186.1 328.8 186.3 341.5 185.1 354 C180.4 353.6 175.7 353.9 171 354.3 C170.3 341.5 170 328.8 168.1 316 C171.4 302 175.8 288.1 177.9 274 Z', w: 1.3 },
    { d: 'M23.6 412.3 C74.9 411.8 126.1 413 177.3 412.1', w: 1, o: 0.28 },
  ],
}

/** Grand immeuble d'habitation haut de gamme — dalles en débord, toit-terrasse. */
const IMMEUBLE = {
  id: 'immeuble',
  titre: 'Un grand immeuble',
  viewBox: '0 0 300 280',
  traits: [
    { d: 'M16 246 H284', w: 1.8 },
    { d: 'M96 246 V66 H204 V246', w: 1.8 },
    { d: 'M84 66 H216', w: 1.5 },
    { d: 'M84 66 V60 H216 V66', w: 1.3 },
    { d: 'M122 60 V46 H178 V60', w: 1.2 },
    { d: 'M132 46 V60 M146 46 V60 M160 46 V60 M172 46 V60', w: 0.8, o: 0.45 },
    { d: 'M84 94 H216', w: 1.3 },
    { d: 'M84 122 H216', w: 1.3 },
    { d: 'M84 150 H216', w: 1.3 },
    { d: 'M84 178 H216', w: 1.3 },
    { d: 'M84 206 H216', w: 1.3 },
    { d: 'M84 88 H216 M84 116 H216 M84 144 H216 M84 172 H216 M84 200 H216', w: 0.8, o: 0.4 },
    { d: 'M112 66 V206 M150 66 V206 M188 66 V206', w: 0.8, o: 0.3 },
    { d: 'M100 212 H200', w: 1.4 },
    { d: 'M120 246 V212 H180 V246', w: 1.3 },
    { d: 'M120 212 H180 V246 H120 Z', o: 0.06, aplat: true },
    { d: 'M140 246 V212 M160 246 V212', w: 0.8, o: 0.45 },
    { d: 'M40 246 V212 M28 212 Q40 178 52 212 Z', w: 1.2 },
    { d: 'M262 246 V216 M250 216 Q262 186 274 216 Z', w: 1.2 },
    { d: 'M22 254 H88 M212 254 H278', w: 1, o: 0.28 },
  ],
}

/** Château — le seul dessin du lot à s'autoriser des courbes : poivrières et cintres. */
const CHATEAU = {
  id: 'chateau',
  titre: 'Un château',
  viewBox: '0 0 300 280',
  traits: [
    { d: 'M10 250 H290', w: 1.8 },
    { d: 'M100 250 V134 H200 V250', w: 1.8 },
    { d: 'M92 134 H208', w: 1.5 },
    { d: 'M100 134 L150 96 L200 134', w: 1.6 },
    { d: 'M150 96 V86 M150 86 l12 4 -12 4', w: 1.1 },
    { d: 'M76 250 V152 H100', w: 1.5 },
    { d: 'M200 152 H224 V250', w: 1.5 },
    { d: 'M70 152 H106 M194 152 H230', w: 1.3 },
    { d: 'M76 152 L88 130 L100 152 M200 152 L212 130 L224 152', w: 1.3 },
    { d: 'M52 250 V138 H80 V250', w: 1.6 },
    { d: 'M220 250 V138 H248 V250', w: 1.6 },
    { d: 'M46 138 H86 M214 138 H254', w: 1.3 },
    { d: 'M52 138 L66 92 L80 138 M220 138 L234 92 L248 138', w: 1.4 },
    { d: 'M66 92 V84 M234 92 V84', w: 1 },
    { d: 'M116 250 V208 a17 17 0 0 1 34 0 V250', w: 1.4 },
    { d: 'M133 216 V250', w: 0.8, o: 0.45 },
    { d: 'M114 162 H130 V188 H114 Z M142 162 H158 V188 H142 Z M170 162 H186 V188 H170 Z', w: 1.1 },
    { d: 'M58 164 H74 V190 H58 Z M226 164 H242 V190 H226 Z', w: 1.1 },
    { d: 'M96 250 L74 278 M204 250 L226 278', w: 1.1, o: 0.5 },
    { d: 'M112 258 H188 V272 H112 Z', w: 1.2 },
    { d: 'M112 258 H188 V272 H112 Z', o: 0.08, aplat: true },
  ],
}

/** Villa d'architecte et sa piscine — deux volumes décalés, grande baie, transats. */
const MAISON_PISCINE = {
  id: 'maison-piscine',
  titre: 'Une grande maison avec piscine',
  viewBox: '0 0 300 280',
  traits: [
    { d: 'M8 232 H292', w: 1.8 },
    { d: 'M104 232 V150 H196 V232', w: 1.8 },
    { d: 'M96 150 H210', w: 1.6 },
    { d: 'M96 150 V143 H210 V150', w: 1.2 },
    { d: 'M196 192 H244 V232', w: 1.5 },
    { d: 'M188 192 H252', w: 1.4 },
    { d: 'M60 232 V192 H104', w: 1.5 },
    { d: 'M52 192 H112', w: 1.4 },
    { d: 'M112 232 V158 H188 V232', w: 1.3 },
    { d: 'M112 158 H188 V232 H112 Z', o: 0.06, aplat: true },
    { d: 'M137 232 V158 M162 232 V158', w: 0.8, o: 0.45 },
    { d: 'M112 196 H188', w: 0.9, o: 0.4 },
    { d: 'M200 200 H240 V224 H200 Z M68 200 H100 V224 H68 Z', w: 1.1 },
    { d: 'M36 240 H180 V268 H36 Z', w: 1.6 },
    { d: 'M36 240 H180 V268 H36 Z', o: 0.08, aplat: true },
    { d: 'M48 248 H168 M48 258 H168', w: 0.9, o: 0.3 },
    { d: 'M198 240 l18 -7 v11 h-18 Z M228 240 l18 -7 v11 h-18 Z', w: 1.1 },
    { d: 'M264 232 V198 M252 198 Q264 168 276 198 Z', w: 1.2 },
    { d: 'M8 276 H292', w: 1, o: 0.25 },
  ],
}

/** Vue mer — la falaise, l'horizon, et la maison posée sur l'à-pic. */
const FALAISE = {
  id: 'falaise',
  titre: 'Une vue mer avec des falaises et une maison',
  viewBox: '0 0 300 280',
  traits: [
    { d: 'M0 150 H300', w: 1.2, o: 0.55 },
    { d: 'M0 238 L38 222 L74 230 L110 200 L146 208 L176 186 L212 194 L252 174 L300 182', w: 1.8 },
    { d: 'M110 200 V280 M176 186 V280 M252 174 V280', w: 1, o: 0.3 },
    { d: 'M38 222 V280 M74 230 V280 M146 208 V280 M212 194 V280', w: 1, o: 0.22 },
    { d: 'M182 186 V148 H262 V190', w: 1.8 },
    { d: 'M174 148 H272', w: 1.6 },
    { d: 'M174 148 V141 H272 V148', w: 1.2 },
    { d: 'M192 186 V156 H252 V186', w: 1.3 },
    { d: 'M192 156 H252 V186 H192 Z', o: 0.06, aplat: true },
    { d: 'M212 186 V156 M232 186 V156', w: 0.8, o: 0.45 },
    { d: 'M186 190 H258 V204 H186 Z', w: 1.4 },
    { d: 'M186 190 H258 V204 H186 Z', o: 0.09, aplat: true },
    { d: 'M190 197 H254', w: 0.8, o: 0.3 },
    { d: 'M0 164 H68 M96 168 H178 M208 162 H284', w: 1, o: 0.35 },
    { d: 'M14 178 H80 M112 182 H196 M228 176 H300', w: 1, o: 0.28 },
    { d: 'M0 196 H52 M120 200 H190 M244 194 H300', w: 1, o: 0.2 },
    { d: 'M268 174 V150 M260 150 Q268 128 276 150 Z', w: 1.1 },
    { d: 'M0 262 L46 246 L88 254', w: 1.2, o: 0.35 },
  ],
}

/** Route sinueuse — trois villas échelonnées le long d'une corniche. */
const CORNICHE = {
  id: 'corniche',
  titre: 'Une route sinueuse avec des maisons luxueuses',
  viewBox: '0 0 300 280',
  traits: [
    { d: 'M0 96 L58 66 L118 88 L180 52 L240 78 L300 58', w: 1.1, o: 0.4 },
    { d: 'M38 280 C88 240 38 210 108 182 C168 158 128 128 194 110 C238 98 250 86 266 76', w: 1.8 },
    { d: 'M86 280 C130 246 80 218 142 192 C196 170 160 142 214 126 C248 116 260 102 276 90', w: 1.8 },
    { d: 'M0 236 L40 246 L88 240 L140 252 L196 244 L244 256 L300 248', w: 1.1, o: 0.3 },
    { d: 'M122 212 V188 H174 V212', w: 1.6 },
    { d: 'M114 188 H182', w: 1.4 },
    { d: 'M130 212 V194 H166 V212', w: 1.1 },
    { d: 'M130 194 H166 V212 H130 Z', o: 0.06, aplat: true },
    { d: 'M36 180 V156 H84 V180', w: 1.6 },
    { d: 'M28 156 H92', w: 1.4 },
    { d: 'M46 180 V162 H76 V180', w: 1.1 },
    { d: 'M46 162 H76 V180 H46 Z', o: 0.06, aplat: true },
    { d: 'M212 128 V104 H258 V128', w: 1.6 },
    { d: 'M204 104 H266', w: 1.4 },
    { d: 'M222 128 V110 H250 V128', w: 1.1 },
    { d: 'M222 110 H250 V128 H222 Z', o: 0.06, aplat: true },
    { d: 'M100 248 V214 M92 214 Q100 184 108 214 Z', w: 1.2 },
    { d: 'M188 172 V144 M181 144 Q188 118 195 144 Z', w: 1.2 },
    { d: 'M278 122 V98 M272 98 Q278 76 284 98 Z', w: 1.2 },
  ],
}

/** Portail qui s'ouvre sur une allée de pins, la demeure au bout. */
const PORTAIL = {
  id: 'portail',
  titre: 'Un portail qui s’ouvre sur une allée de pins',
  viewBox: '0 0 300 280',
  traits: [
    { d: 'M34 280 L132 148 M266 280 L168 148', w: 1.4, o: 0.45 },
    { d: 'M0 214 H300', w: 1.1, o: 0.25 },
    { d: 'M46 278 V144 H78 V278', w: 1.8 },
    { d: 'M40 144 H84 V134 H40 Z', w: 1.5 },
    { d: 'M222 278 V144 H254 V278', w: 1.8 },
    { d: 'M216 144 H260 V134 H216 Z', w: 1.5 },
    { d: 'M78 268 V154 H100 V258', w: 1.4 },
    { d: 'M84 258 V158 M90 256 V158 M96 254 V158', w: 0.8, o: 0.45 },
    { d: 'M200 258 V154 H222 V268', w: 1.4 },
    { d: 'M204 256 V158 M210 256 V158 M216 258 V158', w: 0.8, o: 0.45 },
    { d: 'M126 148 V112 H174 V148', w: 1.8 },
    { d: 'M118 112 H182', w: 1.6 },
    { d: 'M136 148 V124 H164 V148', w: 1.2 },
    { d: 'M136 124 H164 V148 H136 Z', o: 0.07, aplat: true },
    { d: 'M18 254 V174 M0 174 Q22 146 46 176', w: 1.3 },
    { d: 'M282 254 V174 M300 174 Q278 146 254 176', w: 1.3 },
    { d: 'M104 206 V162 M86 162 Q104 142 122 164', w: 1.2 },
    { d: 'M196 206 V162 M214 162 Q196 142 178 164', w: 1.2 },
    { d: 'M0 272 H300', w: 1, o: 0.22 },
  ],
}

/** Montagne — les crêtes, la maison à flanc et sa piscine à débordement. */
const MONTAGNE = {
  id: 'montagne',
  titre: 'Une montagne avec une maison et une piscine',
  viewBox: '0 0 300 280',
  traits: [
    { d: 'M0 128 L46 62 L82 104 L126 44 L176 100 L214 64 L258 108 L300 78', w: 1.8 },
    { d: 'M126 44 L112 62 L126 70 L140 60 Z M214 64 L204 78 L214 84 L226 74 Z', w: 1, o: 0.4 },
    { d: 'M0 162 L54 120 L104 154 L152 114 L206 152 L256 122 L300 154', w: 1.3, o: 0.55 },
    { d: 'M0 226 L70 218 L152 222 L230 212 L300 218', w: 1.6 },
    { d: 'M150 222 V168 H236 V222', w: 1.8 },
    { d: 'M142 168 H244', w: 1.6 },
    { d: 'M142 168 V161 H244 V168', w: 1.2 },
    { d: 'M162 222 V178 H226 V222', w: 1.3 },
    { d: 'M162 178 H226 V222 H162 Z', o: 0.06, aplat: true },
    { d: 'M184 222 V178 M206 222 V178', w: 0.8, o: 0.45 },
    { d: 'M104 222 V194 H150', w: 1.5 },
    { d: 'M96 194 H156', w: 1.4 },
    { d: 'M112 222 V202 H142 V222', w: 1.1 },
    { d: 'M44 232 H140 V256 H44 Z', w: 1.6 },
    { d: 'M44 232 H140 V256 H44 Z', o: 0.08, aplat: true },
    { d: 'M56 240 H128 M56 248 H128', w: 0.9, o: 0.3 },
    { d: 'M262 222 V190 M250 190 L262 162 L274 190 Z', w: 1.2 },
    { d: 'M286 222 V198 M276 198 L286 176 L296 198 Z', w: 1.2 },
    { d: 'M0 272 H300', w: 1, o: 0.22 },
  ],
}

/** Penthouse — terrasse sur les toits, pergola et bassin dominant la ville. */
const PENTHOUSE = {
  id: 'penthouse',
  titre: 'Un penthouse sur les toits',
  viewBox: '0 0 300 280',
  traits: [
    { d: 'M0 202 V126 H32 V202 M40 202 V92 H72 V202', w: 1.2, o: 0.4 },
    { d: 'M228 202 V106 H258 V202 M266 202 V148 H300 V202', w: 1.2, o: 0.4 },
    { d: 'M4 140 H28 M4 158 H28 M44 106 H68 M44 126 H68 M232 120 H254 M232 142 H254', w: 0.8, o: 0.25 },
    { d: 'M0 212 H300', w: 1.8 },
    { d: 'M96 212 V150 H206 V212', w: 1.8 },
    { d: 'M88 150 H214', w: 1.6 },
    { d: 'M88 150 V143 H214 V150', w: 1.2 },
    { d: 'M112 212 V160 H190 V212', w: 1.3 },
    { d: 'M112 160 H190 V212 H112 Z', o: 0.06, aplat: true },
    { d: 'M138 212 V160 M164 212 V160', w: 0.8, o: 0.45 },
    { d: 'M214 212 V156 H288', w: 1.4 },
    { d: 'M220 156 V166 M234 156 V166 M248 156 V166 M262 156 V166 M276 156 V166', w: 0.8, o: 0.4 },
    { d: 'M288 156 V212', w: 1.2 },
    { d: 'M12 212 V176 H88', w: 1.2, o: 0.55 },
    { d: 'M40 212 V176 M64 212 V176', w: 0.8, o: 0.35 },
    { d: 'M18 222 H108 V250 H18 Z', w: 1.6 },
    { d: 'M18 222 H108 V250 H18 Z', o: 0.08, aplat: true },
    { d: 'M30 230 H96 M30 240 H96', w: 0.9, o: 0.3 },
    { d: 'M130 222 l18 -7 v11 h-18 Z M162 222 l18 -7 v11 h-18 Z', w: 1.1 },
    { d: 'M0 268 H300', w: 1, o: 0.22 },
  ],
}

/** Domaine viticole — la bâtisse, ses cyprès, les rangs qui fuient vers elle. */
const DOMAINE = {
  id: 'domaine',
  titre: 'Un domaine viticole',
  viewBox: '0 0 300 280',
  traits: [
    { d: 'M0 106 L68 78 L138 102 L208 72 L300 98', w: 1.1, o: 0.4 },
    { d: 'M0 210 H300', w: 1.6 },
    { d: 'M94 210 V148 H206 V210', w: 1.8 },
    { d: 'M86 148 H214', w: 1.5 },
    { d: 'M94 148 L150 114 L206 148', w: 1.6 },
    { d: 'M150 114 V106', w: 1 },
    { d: 'M206 210 V172 H250 V210', w: 1.5 },
    { d: 'M200 172 H256', w: 1.3 },
    { d: 'M206 172 L228 154 L250 172', w: 1.3 },
    { d: 'M138 210 V180 H162 V210', w: 1.3 },
    { d: 'M138 180 H162 V210 H138 Z', o: 0.07, aplat: true },
    { d: 'M106 160 H124 V182 H106 Z M176 160 H194 V182 H176 Z', w: 1.1 },
    { d: 'M216 182 H240 V200 H216 Z', w: 1.1 },
    { d: 'M66 210 V152 M58 152 Q66 122 74 152 Z', w: 1.2 },
    { d: 'M266 210 V158 M258 158 Q266 130 274 158 Z', w: 1.2 },
    { d: 'M0 272 L112 214', w: 1.1, o: 0.4 },
    { d: 'M44 280 L130 214', w: 1.1, o: 0.4 },
    { d: 'M98 280 L148 214', w: 1.1, o: 0.4 },
    { d: 'M202 280 L156 214', w: 1.1, o: 0.4 },
    { d: 'M256 280 L176 214', w: 1.1, o: 0.4 },
    { d: 'M300 272 L196 214', w: 1.1, o: 0.4 },
  ],
}

/** Villa au bord d'un lac — ponton, voilier, collines au loin. */
const LAC = {
  id: 'lac',
  titre: 'Une villa au bord d’un lac',
  viewBox: '0 0 300 280',
  traits: [
    { d: 'M0 118 L52 84 L110 112 L166 76 L228 108 L300 88', w: 1.2, o: 0.4 },
    { d: 'M0 196 H300', w: 1.8 },
    { d: 'M56 196 V140 H164 V196', w: 1.8 },
    { d: 'M48 140 H172', w: 1.6 },
    { d: 'M48 140 V133 H172 V140', w: 1.2 },
    { d: 'M72 196 V150 H148 V196', w: 1.3 },
    { d: 'M72 150 H148 V196 H72 Z', o: 0.06, aplat: true },
    { d: 'M97 196 V150 M122 196 V150', w: 0.8, o: 0.45 },
    { d: 'M164 196 V164 H216', w: 1.5 },
    { d: 'M158 164 H222', w: 1.4 },
    { d: 'M172 196 V174 H206 V196', w: 1.1 },
    { d: 'M0 204 H300 V280 H0 Z', o: 0.05, aplat: true },
    { d: 'M186 204 L266 200 L270 214 L190 218 Z', w: 1.4 },
    { d: 'M202 214 V230 M232 211 V226 M258 208 V222', w: 1.1 },
    { d: 'M276 206 V158', w: 1.2 },
    { d: 'M276 164 L296 204 H276 Z', w: 1.2 },
    { d: 'M276 172 L256 204 H276 Z', w: 1.2 },
    { d: 'M14 216 H88 M118 224 H206 M230 214 H292', w: 1, o: 0.32 },
    { d: 'M36 240 H148 M180 248 H268 M22 262 H120', w: 1, o: 0.24 },
    { d: 'M28 196 V156 M16 156 Q28 126 40 156 Z', w: 1.2 },
    { d: 'M242 196 V168 M232 168 Q242 144 252 168 Z', w: 1.2 },
  ],
}


/**
 * Les quatre états de la petite boucle de métamorphose de l'écran d'analyse
 * ([`InkMorphLoop`](../components/estimation/InkMorphLoop.jsx)) : une maison
 * qui devient un immeuble, puis un château, puis un jardin avec piscine — et
 * la maison revient.
 *
 * **Même `viewBox` et même ligne de sol pour les quatre.** C'est ce qui fait la
 * métamorphose plutôt qu'un diaporama : le terrain ne bouge pas d'un état à
 * l'autre, seul le bâti change. Un cadrage propre à chaque dessin donnerait un
 * sol qui saute à chaque passage.
 *
 * **Volontairement courtes.** Une douzaine de tracés chacune, là où les scènes
 * de l'analyse en comptent vingt : le dessin fait deux centimètres de côté et
 * se retrace toutes les trois secondes — au-delà, on ne verrait qu'un
 * fourmillement.
 */
const MORPH_VIEW_BOX = '0 14 140 112'

const MORPH_MAISON = {
  id: 'maison',
  titre: 'Une maison',
  viewBox: MORPH_VIEW_BOX,
  traits: [
    { d: 'M9.8 96 C50 95.6 90.1 95.8 130.2 96', w: 1.7 },
    { d: 'M43.7 96.8 C44.4 85.2 44.3 73.6 43.8 62 C61.2 61.4 78.6 61.7 96 61.9 C96 73.3 96.1 84.7 95.7 96.1', w: 1.7 },
    { d: 'M36.6 64.4 C48.2 56.3 59.2 47.6 70.1 38.8 C80.9 46.9 91.9 56.1 103.4 64.1', w: 1.7 },
    { d: 'M36.6 63.9 C59.1 64.5 81.5 63.7 104 63.6', w: 1.2, o: 0.6 },
    { d: 'M86.2 50.2 C85.7 44.8 85.9 39.4 86 34 C89 33.5 92 34.5 95 34.1 C94.5 41.6 95.2 49.1 95.1 56.7', w: 1.2 },
    { d: 'M60 96 C66.4 95.5 72.7 96.3 79 95.8 C79.5 88.2 78.8 80.6 79.2 73 C73.1 73.3 67.1 72.5 61 73.3 C61.3 80.8 60.8 88.4 60.8 96 Z', w: 1.3 },
    { d: 'M61 96.2 C67 96.3 73 95.9 79 96.1 C79.4 88.4 79.3 80.7 79 73 C73 72.5 67 73.3 61 72.9 C60.5 80.6 61.6 88.3 61.1 96 Z', o: 0.07, aplat: true },
    { d: 'M69.9 96.1 C69.8 88.2 69.3 80.4 69.6 72.5', w: 0.7, o: 0.45 },
    { d: 'M48.6 81.6 C51.7 82.3 54.9 82 58 82.3 C57.4 78.5 57.4 74.8 57.7 71 C54.8 71.4 51.9 71.5 49 71.4 C48.4 74.9 48.9 78.5 49 82 Z', w: 1.1 },
    { d: 'M81.3 82.2 C84.5 82.6 87.8 81.9 91 82 C90.4 78.4 90.3 74.7 90.9 71 C87.9 71.7 85 71.1 82 71 C82.1 74.7 82.6 78.3 82 82 Z', w: 1.1 },
    { d: 'M118.2 96.8 C118.2 89.1 117.3 81.3 117.7 73.6 M117.5 45.5 C121.5 50.7 125.6 55.4 129.9 60.1 C128.8 65.4 127 70.5 126.2 75.9 C120.8 76.3 115.4 76.7 110 76.4 C108.4 70.8 107.7 65.5 106 60.1 C110.2 55.2 113.7 51 117.8 46.2 Z', w: 1.2 },
    { d: 'M57.3 100.2 C60.2 99.3 63.2 98 66.4 97.1 M82.9 100 C79.6 98.5 76.5 97.7 73.6 97.1', w: 0.9, o: 0.3 },
  ],
}

const MORPH_IMMEUBLE = {
  id: 'immeuble',
  titre: 'Un immeuble',
  viewBox: MORPH_VIEW_BOX,
  traits: [
    { d: 'M9.5 96.4 C49.9 95.7 90.4 95.6 130.9 95.9', w: 1.7 },
    { d: 'M50.1 96.8 C49.6 73.2 50.3 49.6 49.7 26 C63.8 25.7 77.9 25.6 92 26.1 C92.1 49.6 91.5 73.1 91.9 96.6', w: 1.7 },
    { d: 'M43.3 25.6 C61.6 25.5 79.9 25.2 98.3 25.9 M43.3 21 C61.5 20.6 79.8 20.9 98.1 20.8', w: 1.3 },
    { d: 'M43.6 81.8 C61.9 82.5 80.2 82.6 98.5 82.5', w: 1.1 },
    { d: 'M43.7 68.2 C61.9 68 80.1 67.8 98.3 68.4', w: 1.1 },
    { d: 'M43.7 54.4 C62 53.8 80.3 54.9 98.5 54.2', w: 1.1 },
    { d: 'M43.6 39.6 C61.9 40 80.2 40.1 98.5 39.8', w: 1.1 },
    { d: 'M64.1 96.5 C63.6 74.2 64.6 51.9 64 29.5 M78.3 96.5 C78.7 74.2 77.9 51.9 78.5 29.7', w: 0.7, o: 0.35 },
    { d: 'M61.3 95.8 C67.5 96.5 73.8 96.1 80 96.2 C80.6 91.5 80.4 86.7 80 82 C74 82.5 68 82.3 62 81.7 C62.6 86.5 61.5 91.2 62 96 Z', w: 1.2 },
    { d: 'M61.1 96.3 C67.4 96.1 73.7 96.1 80 96.1 C80.5 91.4 80.9 86.7 80.4 82 C74.2 82.3 68.1 82.1 62 82.1 C62.5 86.7 61.9 91.4 62.3 96 Z', o: 0.07, aplat: true },
    { d: 'M115.5 96.9 C115.2 90.3 115.9 83.7 115.9 77.1 M115.3 55.5 C119.1 60 122.1 63.7 125.1 67.9 C123.4 71.9 123.3 75.9 121.8 80.1 C117.8 79.9 113.9 80.5 110 80.3 C108.8 76.4 108.2 72.2 107.3 68.1 C109.7 64.2 113.1 60.1 115.9 55.8 Z', w: 1.1 },
    { d: 'M17.9 102.1 C52.9 102.3 87.8 102.2 122.8 101.8', w: 0.9, o: 0.28 },
  ],
}

const MORPH_CHATEAU = {
  id: 'chateau',
  titre: 'Un château',
  viewBox: MORPH_VIEW_BOX,
  traits: [
    { d: 'M10 96 C50.3 95.4 90.6 96.1 131 96.1', w: 1.7 },
    { d: 'M52.9 97 C53.1 82.7 53.3 68.3 53.2 54 C64.5 54.1 75.7 54.4 87 54 C86.4 68.2 87.2 82.4 87.1 96.5', w: 1.7 },
    { d: 'M49.8 55.6 C56.4 48.6 63.1 42.5 69.8 35.9 C76.4 42.1 83.2 48.4 89.9 55.2', w: 1.5 },
    { d: 'M35.1 96.3 C34.5 83.5 35.2 70.8 34.8 58 C40.9 58.6 47 58.3 53 58.3', w: 1.5 },
    { d: 'M87 58 C93 58.1 99 57.8 105 58.4 C105.4 71 104.2 83.7 104.8 96.4', w: 1.5 },
    { d: 'M32.2 59.8 C36.3 49.9 40 39.9 44.3 29.9 C48.7 39.8 52.4 49.5 56.3 59.4', w: 1.4 },
    { d: 'M83.9 60 C87.4 50.2 91.3 39.8 96 29.9 C100 39.9 104.1 49.8 108.6 59.7', w: 1.4 },
    { d: 'M43.5 30.8 C43.8 26.8 44.2 22.8 44.2 18.8 M43.3 19.7 C47.3 20.5 50.9 21.9 55 23.8 C51 25.8 47.2 26.5 43.4 28.4', w: 1 },
    { d: 'M96 30.4 C96.3 27.6 95.8 24.7 96.4 21.8', w: 1 },
    { d: 'M61.7 96.3 C61.8 89.5 62.4 82.8 61.9 76 C64.8 73.6 67 70.5 69.9 68.2 C72.9 70.8 75.2 73.2 77.9 75.9 C78.7 82.9 78.4 89.9 78.2 97', w: 1.3 },
    { d: 'M70.1 71.7 C69.7 79.9 70 88 70.4 96.1', w: 0.7, o: 0.45 },
    { d: 'M58.4 61.9 C57.9 65.3 57.8 68.7 57.8 72.1 M57.3 62.1 C59.6 62.2 61.9 62.2 64.2 62.1 M64.2 61.8 C64 65.2 63.8 68.6 64.1 72 M58 72.2 C60 72 62.1 72.4 64.2 72', w: 1 },
    { d: 'M75.7 61.3 C75.8 65.2 75.1 69.1 75.6 72.9 M76 61.5 C78 61.5 80.1 61.8 82.1 62.4 M81.7 61.6 C82.2 65.4 81.3 69.1 81.8 72.9 M75.6 71.7 C77.9 72.1 80.3 71.4 82.7 71.7', w: 1 },
    { d: 'M40.3 67 C40.3 71 40.2 75 40 79 M39.2 68 C41.6 67.6 43.9 67.7 46.3 68.4 M45.5 67.1 C45.7 71 45 74.9 45.6 78.8 M40 78.1 C42.1 78.3 44.2 78 46.3 78', w: 1 },
    { d: 'M91.8 67.2 C91.4 71 91.8 74.7 92 78.5 M92 67.9 C94.2 68.4 96.3 68.1 98.5 67.9 M98.3 68 C98.4 71.4 97.4 74.7 97.7 78.1 M91.7 78.3 C93.9 79 96.1 77.7 98.2 78.4', w: 1 },
    { d: 'M13.3 101.8 C51.1 102 88.9 101.8 126.7 102', w: 0.9, o: 0.28 },
  ],
}

const MORPH_JARDIN = {
  id: 'jardin-piscine',
  titre: 'Un jardin avec piscine',
  viewBox: MORPH_VIEW_BOX,
  traits: [
    { d: 'M9.7 88 C50 87.5 90.3 87.1 130.6 87.7', w: 1.7 },
    { d: 'M65.9 88.6 C66.1 78.4 66.7 68.2 66.3 58 C82.2 58.7 98.1 57.8 114 58.2 C113.7 68.3 114.6 78.3 114.2 88.3', w: 1.7 },
    { d: 'M59.9 58.5 C80 58.7 100.1 58.8 120.1 58.3 M59.8 52.9 C79.9 52.9 100 53.5 120.1 52.9', w: 1.3 },
    { d: 'M73.2 87.9 C84.1 88.3 95.1 88.5 106 87.9 C106.2 80.6 105.8 73.3 106.3 66 C95.5 65.7 84.8 66 74 65.8 C73.8 73.2 73.7 80.6 73.9 88 Z', w: 1.2 },
    { d: 'M73 87.8 C84 87.5 95 88.5 106 88.4 C106 80.9 105.5 73.5 105.7 66 C95.1 66.4 84.6 66 74 65.7 C74.1 73.1 73.8 80.6 73.9 88 Z', o: 0.07, aplat: true },
    { d: 'M90.1 88.5 C90 80.9 89.6 73.2 90 65.6', w: 0.7, o: 0.45 },
    { d: 'M13.9 94 C34.6 93.9 55.3 93.9 76 93.9 C76.2 100.6 75.8 107.3 76.1 114 C55.4 113.7 34.7 113.6 14 113.9 C14.4 107.3 14.1 100.6 14.1 94 Z', w: 1.5 },
    { d: 'M13.9 93.9 C34.6 94.6 55.3 93.8 76 94.3 C76.3 100.9 76.5 107.4 75.7 114 C55.1 114.4 34.6 114.1 14 114.1 C14.2 107.4 13.4 100.7 13.8 94 Z', o: 0.1, aplat: true },
    { d: 'M21 100.8 C36.8 101.5 52.6 101.2 68.4 101 M21.7 107.7 C37.4 107.9 53.2 107.2 69 107.9', w: 0.8, o: 0.3 },
    { d: 'M85.7 94.6 C89 93.3 92.5 91.1 95.9 89.8 C95.8 91.8 95.6 93.9 96.3 96 C92.9 96.7 89.4 95.9 86 96.4 C86.2 95.6 86 94.8 86 94 Z M103.5 94.2 C106.7 92.6 110.5 92.3 113.9 90.4 C113.6 92.2 114.8 94.1 114.2 96 C110.8 96.3 107.4 95.9 104 96 C104.2 95.3 104.2 94.7 104.4 94 Z', w: 1.1 },
    { d: 'M30.1 89 C30.8 81 30 73.1 30.2 65.2 M30 66 C26.4 62.8 22 59 18.1 55.9 M29.7 66.3 C34.2 63.2 38 59.3 42 56.1 M29.7 66.4 C27.8 60.8 24.7 55.5 22.2 49.6 M30 66.4 C32.5 60.7 35.5 55.6 38.5 50 M30.1 66.3 C30.1 59.5 30.2 52.7 29.8 45.9', w: 1.1 },
    { d: 'M119.6 88.3 C120.1 85.4 120 82.6 119.9 79.7 M125.1 88.2 C125.3 85.4 124.9 82.5 125 79.6 M130.4 88.2 C130.4 85.4 129.9 82.6 130.1 79.7', w: 1, o: 0.4 },
    { d: 'M9.6 119.8 C49.8 120.1 90.1 119.6 130.3 119.6', w: 0.9, o: 0.25 },
  ],
}

/** La boucle, dans l'ordre de la métamorphose. */
export const INK_MORPH = [MORPH_MAISON, MORPH_IMMEUBLE, MORPH_CHATEAU, MORPH_JARDIN]

/**
 * Le tirage de l'écran d'analyse : deux scènes distinctes, l'une à gauche
 * (0 à 6 s), l'autre à droite (6 à 12 s). Dix entrées pour que deux
 * estimations d'affilée ne se ressemblent pas — quarante-cinq paires
 * possibles, l'utilisateur qui relance trois fois voit trois écrans
 * différents.
 */
export const INK_SCENES = [
  IMMEUBLE,
  CHATEAU,
  MAISON_PISCINE,
  FALAISE,
  CORNICHE,
  PORTAIL,
  MONTAGNE,
  PENTHOUSE,
  DOMAINE,
  LAC,
]

/**
 * Deux scènes distinctes tirées au hasard, dans l'ordre d'apparition.
 *
 * Le tirage sans remise tient en un échange : la seconde est prise dans ce qui
 * reste après la première. Mélanger les dix pour n'en garder que deux
 * coûterait dix fois plus pour le même résultat.
 */
export function tirageScenes() {
  const premier = Math.floor(Math.random() * INK_SCENES.length)
  const decalage = 1 + Math.floor(Math.random() * (INK_SCENES.length - 1))
  const second = (premier + decalage) % INK_SCENES.length

  return [INK_SCENES[premier], INK_SCENES[second]]
}
