/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Palette stricte — ne pas improviser d'autres teintes.
        ink: '#10141C', // Ink Navy — fond principal sombre
        stone: '#EDEAE3', // Warm Stone — fond clair, sections alternées
        brass: '#B08D57', // Brass — accent unique (CTA, liens, éléments actifs)
        bottle: '#1F3B2E', // Bottle Green — accent secondaire très rare
        // Laiton du parcours d'estimation. Seule teinte ajoutée à la palette,
        // et volontairement cantonnée à un écran : c'est l'accent du panneau de
        // verre du tunnel « Estimer mon bien » (curseur, champ actif, option
        // retenue), repris tel quel de la maquette de référence. Le Brass du
        // reste du site reste la seule couleur d'accent partout ailleurs.
        laiton: '#C9A16B',
        // Même laiton, assombri, pour le texte posé sur le blanc du panneau :
        // #C9A16B se lit mal en corps de texte, la maquette de référence écrit
        // donc ses valeurs retenues (m², étage) dans cette teinte.
        'laiton-texte': '#8A6224',
      },
      fontFamily: {
        // Deux familles principales + une utilitaire monospace.
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        // Sans-serif du seul parcours d'estimation (texte courant et libellés
        // de son panneau) — voir `.tunnel-estimation` dans `src/index.css`.
        grotesk: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Échelle éditoriale généreuse.
        'display-xl': ['clamp(2.75rem, 7vw, 6rem)', { lineHeight: '0.98', letterSpacing: '-0.02em' }],
        'display-lg': ['clamp(2.25rem, 5vw, 4rem)', { lineHeight: '1.02', letterSpacing: '-0.015em' }],
        'display-md': ['clamp(1.75rem, 3.5vw, 2.75rem)', { lineHeight: '1.05', letterSpacing: '-0.01em' }],
      },
      letterSpacing: {
        micro: '0.18em',
      },
      maxWidth: {
        // Largeur de tout le site sur grand écran.
        //
        // Valeur d'origine, retrouvée après deux allers-retours : élargie à
        // 1848 px (+40 %), la bande occupait tout le 27 pouces et se lisait
        // trop large ; resserrée à 1109 px (−40 %), le site paraissait trop
        // fin sur toutes les pages. Les 1320 px d'origine sont le bon
        // réglage — ne pas y retoucher sans une raison mesurée.
        //
        // Les écrans du parcours d'estimation avaient porté leurs propres
        // largeurs pendant ces deux passes ; ils sont eux aussi revenus à
        // leurs valeurs de base, sans surcharge par point de rupture.
        content: '1320px',
      },
      transitionTimingFunction: {
        plan: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Respiration du halo derrière le CTA d'estimation — opacité seule.
        'cta-breath': {
          '0%, 100%': { opacity: '0.25' },
          '50%': { opacity: '0.65' },
        },
        // Scintillement de l'étincelle, désynchronisé du halo.
        'sparkle-shimmer': {
          '0%, 100%': { opacity: '0.72' },
          '50%': { opacity: '1' },
        },
        // Liseré Brass qui tourne autour du CTA (arc conique en rotation).
        'border-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        // Reflet diagonal : un seul passage, puis pause sur le reste du cycle.
        shine: {
          '0%, 62%': { transform: 'translateX(-160%) skewX(-14deg)' },
          '100%': { transform: 'translateX(360%) skewX(-14deg)' },
        },
        // Chiffre en cours de formation : les blocs floutés respirent en opacité
        // et s'étirent à peine. `scaleX` plutôt qu'une largeur animée — composite
        // GPU, aucun recalcul de mise en page à chaque image.
        'figure-forming': {
          '0%, 100%': { opacity: '0.5', transform: 'scaleX(0.97)' },
          '50%': { opacity: '0.92', transform: 'scaleX(1.03)' },
        },
        // Étincelles qui s'allument autour du chiffre, une à une.
        'spark-twinkle': {
          '0%, 100%': { opacity: '0', transform: 'scale(0.55)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
        // Arrivée du CTA final : léger rebond, joué une seule fois.
        'cta-pop': {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '60%': { opacity: '1', transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // Clignotement du bâtiment armé sur la carte, en attente du second
        // geste de confirmation — opacité seule, appliquée au `<path>` SVG.
        'building-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'cta-breath': 'cta-breath 2.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'sparkle-shimmer': 'sparkle-shimmer 2.8s cubic-bezier(0.4, 0, 0.6, 1) 0.7s infinite',
        'border-spin': 'border-spin 4s linear infinite',
        shine: 'shine 3.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        // Tour plus lent pour les grands cadres (carte) : à surface égale, une
        // même vitesse angulaire y paraîtrait bien plus agitée que sur un bouton.
        'border-spin-slow': 'border-spin 6s linear infinite',
        'cta-pop': 'cta-pop 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both',
        // Décor d'anticipation de la fenêtre de confirmation. Les durées sont
        // premières entre elles : les blocs et les étincelles ne retombent
        // jamais en phase, le motif ne se laisse pas mémoriser.
        'figure-forming': 'figure-forming 2.3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spark-twinkle': 'spark-twinkle 3.1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'building-blink': 'building-blink 0.9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
