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
 * et retouchables à la main. La maison de l'étape adresse, ajoutée depuis, est
 * en cubiques déjà tremblées : ventre qui s'écarte de la corde, débords aux
 * angles, aucune parallèle exacte. Les deux passent ensuite sous le filtre
 * « main levée » de [`InkScene`](../components/estimation/InkScene.jsx), qui
 * suffit à emporter les premières ; la seconde, seule sur son écran et donc
 * plus exposée, méritait d'être irrégulière jusque dans sa géométrie. Ces
 * trajets-là sont sortis d'un générateur à graine fixe (script de travail, non
 * versionné) : on ne les retouche pas au doigt, on les regénère.
 */

/**
 * Maison de l'étape adresse — une petite maison tranquille, tracée à l'encre
 * pendant que l'utilisateur cherche son adresse.
 *
 * **Modeste, et c'est le sujet.** Elle a remplacé une tour d'habitation qui
 * occupait toute la hauteur de l'écran : sur une page qui demande « où se situe
 * votre bien ? », un immeuble de quinze étages répond déjà à la question, et
 * mal. Une maison, une cheminée, deux fenêtres, un arbre — l'inventaire s'arrête
 * là. Format large et bas, pour un dessin qui se pose au lieu de s'imposer.
 *
 * **Le tremblé ne vient pas seulement du filtre.** Les trajets sont posés à la
 * main — ventre qui s'écarte de la corde, débords aux angles, aucune parallèle
 * exacte — et le filtre de [`InkScene`](../components/estimation/InkScene.jsx)
 * en rajoute une couche par-dessus. Les deux ensemble font la différence entre
 * un dessin à l'encre et une grille de segments.
 */
export const INK_MAISONNETTE = {
  id: 'maisonnette',
  // Cadrée au plus juste sur le dessin : c'est ce qui permet au bloc qui
  // l'accueille de se dimensionner d'un simple `aspect-[200/124]`, sans hauteur
  // à régler par point de rupture.
  viewBox: '0 22 200 102',
  traits: [
    // Le terrain, puis le pignon : rien de plus qu’une maison posée dessus.
    { d: 'M11.5 107.9 C70.8 108 130 107.1 189.3 108', w: 1.7 },
    { d: 'M66.2 108.1 C65.8 92.7 65.5 77.4 66.4 62 C88.9 62.5 111.5 61.9 134 61.6 C133.9 77.4 134.2 93.3 133.7 109.1', w: 1.8 },
    { d: 'M56.2 64 C70.4 53.8 85.3 43.7 100 33.3 C114.4 43.4 128.7 52.5 143.1 63.1', w: 1.8 },
    { d: 'M56.2 63 C85.5 63.3 114.8 64.1 144 63.3', w: 1.2, o: 0.6 },
    { d: 'M100.1 31.9 C99.6 42.1 100.3 52.4 100.2 62.7', w: 0.9, o: 0.3 },
    // Cheminée, porte et deux fenêtres — l’inventaire s’arrête là.
    { d: 'M117.7 49.2 C118.1 41.8 118.1 34.4 117.7 27 C121.2 27.3 124.6 26.5 128 27.4 C127.8 36.5 127.3 45.7 128 54.8', w: 1.3 },
    { d: 'M114.8 26.9 C120.5 27.8 126.2 27.7 131.9 27', w: 1.1 },
    { d: 'M87.9 107.7 C95.6 107.5 103.3 108.5 111 108.3 C110.5 98.5 111.5 88.8 110.8 79 C103.6 79.9 96.3 79.1 89 79.2 C89.5 88.8 89.6 98.4 89.3 108 Z', w: 1.3 },
    { d: 'M88.6 107.8 C96.1 107.4 103.5 108.7 111 108.2 C110.5 98.4 111.9 88.7 111.1 79 C103.8 78.2 96.4 79.3 89 78.6 C89.7 88.4 88.1 98.2 88.6 108 Z', o: 0.07, aplat: true },
    { d: 'M106.1 95.4 C106.4 93.7 106 91.9 106 90.2', w: 0.9, o: 0.6 },
    { d: 'M72.7 88.7 C76.8 88.5 80.9 88.7 85 88.6 C85.6 83.8 85.8 78.9 85.2 74 C81.2 74 77.1 73.5 73 74.3 C72.2 79.2 73.8 84.1 73.1 89 Z', w: 1.2 },
    { d: 'M79.2 89.3 C79.9 83.8 79.7 78.3 79.4 72.7 M72.4 81.2 C76.7 81.2 80.9 81.4 85.1 81.5', w: 0.7, o: 0.5 },
    { d: 'M114.4 89.1 C118.6 88.7 122.8 89 127 88.6 C126.3 83.7 127.9 78.9 127.1 74 C123 73.8 119 73.3 115 73.7 C115.2 78.8 115.5 83.9 114.9 89 Z', w: 1.2 },
    { d: 'M121.2 89.6 C120.9 84.3 120.2 79 121 73.8 M114.1 81.8 C118.7 80.9 123.2 81.9 127.8 81.3', w: 0.7, o: 0.5 },
    // Lucarne du comble, puis l’allée, les arbres et la haie : le calme autour.
    { d: 'M89.8 54 C93.7 51.3 96 48.4 99.9 46.1 C103.6 48.9 106.6 51.5 110.2 54.5 M91.1 54.3 C97.2 54.9 103.2 53.2 109.3 53.7', w: 1, o: 0.7 },
    { d: 'M82.3 122.5 C85.2 117.7 89.7 113 92.5 108.1 M118.7 123 C115.7 117.8 111.2 112.8 108.2 107.2', w: 1, o: 0.35 },
    { d: 'M33.5 108.5 C33.1 98 33.6 87.4 33.8 76.8 M33.5 47.6 C39 53.6 44.7 59 50.3 64.2 C49.6 70.1 46.5 75.9 45.6 82 C37.8 82 29.9 82.5 22 82.3 C20.1 76.2 19.9 69.9 18.1 63.9 C23.6 58.6 28.3 52.7 33.7 47.8 Z', w: 1.3 },
    { d: 'M162.1 108.4 C162.5 101.3 162.9 94.3 162.2 87.2 M161.5 69.5 C165.5 72.8 169.1 76.5 172.1 80 C170.8 84.1 169.2 88.1 168.8 91.9 C164.2 92.2 159.6 92.3 155 92.2 C154.8 88 153.5 84.2 151.7 80 C154.7 76 158.2 73.1 162.2 69.7 Z', w: 1.1 },
    { d: 'M140.5 108.4 C140.4 105.2 139.8 102 139.6 98.9 M148.2 108 C148 105 148.4 102 148.2 99 M155.8 108.1 C155.6 105.1 156.3 102 156.2 99 M164.2 108 C164.4 105 163.9 101.9 164.1 98.9 M171.6 108.3 C171.3 105.1 171.3 102 171.5 98.8 M180.2 108.3 C179.9 105.2 179.9 102 179.9 98.8 M187.6 108.3 C187.4 105.2 187.6 102 187.8 98.8 M137.7 100.6 C154.2 101.7 170.7 101.1 187.2 101.4', w: 0.9, o: 0.45 },
    { d: 'M15.7 117.6 C71.9 118.4 128.1 117.7 184.4 118.1', w: 1, o: 0.22 },
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
