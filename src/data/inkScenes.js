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
 */

/**
 * Maison de l'étape adresse — une demeure d'architecte, tracée en six
 * secondes derrière le titre.
 *
 * Format large (400 × 240) et non carré : elle s'étend derrière une ligne de
 * texte, pas dans une vignette. Le bassin miroir au premier plan ferme la
 * composition par le bas, là où le champ de saisie vient se poser.
 */
export const INK_VILLA = {
  id: 'villa-architecte',
  // Cadrée au plus juste sur le dessin (qui commence à l'attique, y ≈ 104) et
  // non sur un carré de principe : c'est ce qui permet au bloc qui l'accueille
  // de se dimensionner par un simple `aspect-[400/148]`, et donc à la ligne de
  // sol de tomber au même endroit de la page quel que soit le gabarit. Une
  // `viewBox` avec du vide en haut aurait demandé une hauteur et un décalage
  // réglés à la main par point de rupture.
  viewBox: '0 96 400 148',
  traits: [
    // Terrasse et volume principal.
    { d: 'M8 206 H392', w: 1.8 },
    { d: 'M120 206 V126 H286 V206', w: 1.8 },
    { d: 'M104 126 H302', w: 1.6 },
    { d: 'M104 126 V118 H302 V126', w: 1.3 },

    // Attique et sa pergola à lames.
    { d: 'M150 118 V104 H256 V118', w: 1.3 },
    { d: 'M164 104 V118 M182 104 V118 M200 104 V118 M218 104 V118 M236 104 V118', w: 0.8, o: 0.4 },

    // Les deux ailes basses, chacune sous sa dalle en débord.
    { d: 'M60 206 V166 H120', w: 1.6 },
    { d: 'M52 166 H128', w: 1.5 },
    { d: 'M286 166 H340 V206', w: 1.6 },
    { d: 'M278 166 H348', w: 1.5 },

    // Grande baie toute hauteur, ses meneaux et sa traverse.
    { d: 'M132 206 V136 H274 V206', w: 1.4 },
    { d: 'M132 136 H274 V206 H132 Z', o: 0.05, aplat: true },
    { d: 'M160 206 V136 M188 206 V136 M216 206 V136 M244 206 V136', w: 0.8, o: 0.45 },
    { d: 'M132 172 H274', w: 0.9, o: 0.45 },

    // Refends verticaux : ce qui donne son rythme à la façade.
    { d: 'M112 206 V118', w: 1, o: 0.5 },
    { d: 'M294 206 V118', w: 1, o: 0.5 },

    // Entrée sous auvent.
    { d: 'M168 176 H238', w: 1.4 },
    { d: 'M176 206 V180 H230 V206', w: 1.3 },
    { d: 'M203 180 V206', w: 0.8, o: 0.5 },

    // Baies des ailes.
    { d: 'M70 206 V176 H112 V206', w: 1.2 },
    { d: 'M300 206 V176 H332 V206', w: 1.2 },

    // Bassin miroir au premier plan.
    { d: 'M40 212 H360 V236 H40 Z', w: 1.5 },
    { d: 'M40 212 H360 V236 H40 Z', o: 0.07, aplat: true },
    { d: 'M58 220 H342', w: 0.9, o: 0.3 },
    { d: 'M58 228 H342', w: 0.9, o: 0.3 },

    // Deux arbres qui cadrent la demeure, et la ligne d'avant-plan.
    { d: 'M24 206 V152 M24 112 C46 112 52 140 42 156 L6 156 C-4 140 2 112 24 112 Z', w: 1.2 },
    { d: 'M368 206 V162 M368 128 C386 128 391 151 383 164 H353 C345 151 350 128 368 128 Z', w: 1.2 },
    { d: 'M8 240 H392', w: 1, o: 0.25 },
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
