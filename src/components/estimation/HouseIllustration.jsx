/**
 * Silhouettes de la fenêtre de saisie de la surface — cinq maisons
 * d'architecte, une par palier du curseur.
 *
 * Cinq dessins distincts plutôt qu'une forme unique qu'on déformerait : à
 * 800 m², ce n'est plus la même maison en plus grand, c'est un autre programme.
 * Une interpolation continue aurait donné un pavillon étiré, là où le saut de
 * palier raconte quelque chose — un volume devient deux, la piscine arrive, une
 * annexe se détache.
 *
 * **Au trait, sans aucun aplat de couleur**, dans le registre à l'encre du
 * reste du parcours ([`InkScene`](./InkScene.jsx), [`src/data/inkScenes.js`](../../data/inkScenes.js)) :
 * la teinte vient du `currentColor` posé par le parent, et les seules surfaces
 * remplies sont les vitrages et l'eau, à quelques pourcents d'opacité.
 *
 * Le parti architectural est tenu d'un palier à l'autre : lignes orthogonales,
 * dalles en débord, baies toute hauteur, refends marqués. Aucun arrondi — un
 * angle cassé suffirait à faire basculer le dessin du côté du pavillon
 * contemporain, qui n'est pas ce qu'on montre ici.
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

/** Opacité des vitrages — assez pour les lire comme du verre, jamais comme un mur. */
const VITRAGE = 0.07

/** Ligne de sol, identique aux cinq dessins — invisible au fondu, donc. */
function Sol() {
  return <path d="M10 114 H250" strokeWidth="1.6" strokeOpacity="0.35" />
}

/** 10 à 50 m² — un volume unique, sa dalle en débord, une baie pleine hauteur. */
function MaisonPetite() {
  return (
    <>
      <Sol />
      <path d="M106 114 V78 H154 V114" strokeWidth="1.8" />
      <path d="M100 78 H160" strokeWidth="1.5" />
      <path d="M100 78 V73 H160 V78" strokeWidth="1.1" />
      <path d="M114 114 V86 H146 V114" strokeWidth="1.2" />
      <path d="M114 86 H146 V114 H114 Z" fill="currentColor" fillOpacity={VITRAGE} stroke="none" />
      <path d="M130 114 V86" strokeWidth="0.8" strokeOpacity="0.45" />
      <path d="M154 114 V78" strokeWidth="1" strokeOpacity="0.5" />
    </>
  )
}

/** 50 à 150 m² — le volume s'allonge, une avancée basse le prolonge. */
function MaisonMoyenne() {
  return (
    <>
      <Sol />
      <path d="M92 114 V70 H162 V114" strokeWidth="1.8" />
      <path d="M85 70 H169" strokeWidth="1.5" />
      <path d="M85 70 V65 H169 V70" strokeWidth="1.1" />
      <path d="M162 114 V92 H196 V114" strokeWidth="1.5" />
      <path d="M156 92 H202" strokeWidth="1.3" />
      <path d="M100 114 V78 H154 V114" strokeWidth="1.2" />
      <path d="M100 78 H154 V114 H100 Z" fill="currentColor" fillOpacity={VITRAGE} stroke="none" />
      <path d="M118 114 V78 M136 114 V78" strokeWidth="0.8" strokeOpacity="0.45" />
      <path d="M170 114 V98 H190 V114" strokeWidth="1.1" />
      <path d="M92 114 V70" strokeWidth="1" strokeOpacity="0.5" />
    </>
  )
}

/** 150 à 250 m² — un étage en porte-à-faux, posé en travers du rez. */
function MaisonEtage() {
  return (
    <>
      <Sol />
      <path d="M86 114 V80 H158 V114" strokeWidth="1.8" />
      <path d="M68 80 H186" strokeWidth="1.6" />
      <path d="M68 80 V74 H186 V80" strokeWidth="1.2" />
      <path d="M78 74 V48 H176 V74" strokeWidth="1.8" />
      <path d="M70 48 H184" strokeWidth="1.5" />
      <path d="M70 48 V43 H184 V48" strokeWidth="1.1" />
      <path d="M94 74 V54 H160 V74" strokeWidth="1.2" />
      <path d="M94 54 H160 V74 H94 Z" fill="currentColor" fillOpacity={VITRAGE} stroke="none" />
      <path d="M116 74 V54 M138 74 V54" strokeWidth="0.8" strokeOpacity="0.45" />
      <path d="M96 114 V88 H150 V114" strokeWidth="1.2" />
      <path d="M96 88 H150 V114 H96 Z" fill="currentColor" fillOpacity={VITRAGE} stroke="none" />
      <path d="M123 114 V88" strokeWidth="0.8" strokeOpacity="0.45" />
      <path d="M158 114 V80 M86 114 V80" strokeWidth="1" strokeOpacity="0.5" />
      <path d="M186 80 V114" strokeWidth="1.1" strokeOpacity="0.6" />
    </>
  )
}

/** 250 à 500 m² — deux volumes décalés et un bassin qui court devant. */
function MaisonPiscine() {
  return (
    <>
      <Sol />
      <path d="M118 114 V64 H188 V114" strokeWidth="1.8" />
      <path d="M110 64 H198" strokeWidth="1.6" />
      <path d="M110 64 V58 H198 V58" strokeWidth="1.1" />
      <path d="M188 114 V86 H226 V114" strokeWidth="1.5" />
      <path d="M182 86 H232" strokeWidth="1.3" />
      <path d="M126 114 V72 H180 V114" strokeWidth="1.2" />
      <path d="M126 72 H180 V114 H126 Z" fill="currentColor" fillOpacity={VITRAGE} stroke="none" />
      <path d="M144 114 V72 M162 114 V72" strokeWidth="0.8" strokeOpacity="0.45" />
      <path d="M126 94 H180" strokeWidth="0.8" strokeOpacity="0.4" />
      <path d="M196 114 V92 H220 V114" strokeWidth="1.1" />
      <path d="M118 114 V64 M188 114 V64" strokeWidth="1" strokeOpacity="0.5" />
      <path d="M26 118 H118 V130 H26 Z" strokeWidth="1.5" />
      <path d="M26 118 H118 V130 H26 Z" fill="currentColor" fillOpacity="0.09" stroke="none" />
      <path d="M36 124 H108" strokeWidth="0.9" strokeOpacity="0.3" />
      <path d="M62 114 V98 M54 98 Q62 78 70 98 Z" strokeWidth="1.1" />
    </>
  )
}

/** 500 m² et au-delà — un domaine : corps principal, annexe, piscine à débordement. */
function MaisonDomaine() {
  return (
    <>
      <Sol />
      <path d="M96 114 V54 H180 V114" strokeWidth="1.8" />
      <path d="M86 54 H192" strokeWidth="1.6" />
      <path d="M86 54 V48 H192 V54" strokeWidth="1.1" />
      <path d="M114 48 V38 H164 V48" strokeWidth="1.2" />
      <path d="M124 38 V48 M138 38 V48 M152 38 V48" strokeWidth="0.7" strokeOpacity="0.4" />
      <path d="M180 114 V78 H224 V114" strokeWidth="1.5" />
      <path d="M174 78 H230" strokeWidth="1.3" />
      <path d="M52 114 V82 H96" strokeWidth="1.5" />
      <path d="M46 82 H102" strokeWidth="1.3" />
      <path d="M104 114 V62 H172 V114" strokeWidth="1.2" />
      <path d="M104 62 H172 V114 H104 Z" fill="currentColor" fillOpacity={VITRAGE} stroke="none" />
      <path d="M121 114 V62 M138 114 V62 M155 114 V62" strokeWidth="0.8" strokeOpacity="0.45" />
      <path d="M104 88 H172" strokeWidth="0.8" strokeOpacity="0.4" />
      <path d="M62 114 V90 H88 V114 M190 114 V88 H216 V114" strokeWidth="1.1" />
      <path d="M96 114 V54 M180 114 V54" strokeWidth="1" strokeOpacity="0.5" />
      <path d="M18 118 H164 V132 H18 Z" strokeWidth="1.5" />
      <path d="M18 118 H164 V132 H18 Z" fill="currentColor" fillOpacity="0.09" stroke="none" />
      <path d="M28 123 H154 M28 128 H154" strokeWidth="0.9" strokeOpacity="0.28" />
      <path d="M238 114 V88 M230 88 Q238 64 246 88 Z" strokeWidth="1.1" />
      <path d="M32 114 V92 M24 92 Q32 70 40 92 Z" strokeWidth="1.1" />
    </>
  )
}

/**
 * Paliers du curseur, du plus petit au plus grand. `max` est la borne haute
 * exclue ; le dernier palier n'en a pas — il absorbe tout ce qui dépasse, ce
 * que le curseur affiche par ailleurs « 800+ ».
 */
const TIERS = [
  { id: 'petite', max: 50, Dessin: MaisonPetite },
  { id: 'moyenne', max: 150, Dessin: MaisonMoyenne },
  { id: 'etage', max: 250, Dessin: MaisonEtage },
  { id: 'piscine', max: 500, Dessin: MaisonPiscine },
  { id: 'domaine', max: Infinity, Dessin: MaisonDomaine },
]

/**
 * Palier correspondant à une surface. Gardés privés, l'un comme l'autre : ce
 * fichier n'exporte que son composant, condition du rafraîchissement à chaud
 * de Vite — un export de données à côté le fait retomber sur un rechargement
 * complet de la page à chaque retouche d'un dessin.
 */
const tierIndexFor = (surfaceM2) => TIERS.findIndex((tier) => surfaceM2 < tier.max)

/**
 * Silhouette du palier courant, en fondu enchaîné avec les autres.
 *
 * Les cinq dessins sont montés en permanence et superposés : seule leur
 * opacité change. Rien n'est monté ni démonté au franchissement d'un seuil —
 * c'est ce qui permet de traverser toute l'échelle d'un geste sans à-coup, les
 * paliers sautés se contentant de rester à zéro. `opacity` et `transform` se
 * composent sur le GPU : aucun recalcul de mise en page pendant le glissement.
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

  return (
    <div aria-hidden="true" className={`relative text-ink ${className}`}>
      {TIERS.map(({ id, Dessin }, index) => (
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
          <Dessin />
        </svg>
      ))}
    </div>
  )
}
