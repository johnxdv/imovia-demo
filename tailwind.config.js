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
      },
      fontFamily: {
        // Deux familles principales + une utilitaire monospace.
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
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
        // Largeur de tout le site sur grand écran. Portée de 1320 à 1848 px
        // (+40 %) à la demande du client : la mise en page tenait dans une
        // bande étroite au milieu d'un 27 pouces, et le reste de l'écran ne
        // servait à rien.
        //
        // Sans effet sous ~1900 px de fenêtre — la largeur disponible reste la
        // contrainte la plus serrée — donc rien ne change sur tablette ni sur
        // téléphone, où `container-page` se cale sur ses marges (px-5 / px-8).
        content: '1848px',
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
        // Dérive des formes de fond du panneau de conversation. Amplitude
        // volontairement faible : le mouvement doit se remarquer sans jamais
        // se regarder. Trois temps inégaux — la boucle ne revient pas sur ses
        // pas, elle tourne.
        'bubble-drift': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '33%': { transform: 'translate3d(12px, -20px, 0) scale(1.07)' },
          '66%': { transform: 'translate3d(-14px, -9px, 0) scale(0.95)' },
        },
        // Mise en alerte de la mention « Prix soumis à expertise ». Pulsation
        // progressive plutôt que clignotement : un saut net d'opacité fait
        // daté, et la fréquence d'un vrai clignotant est un risque connu pour
        // les personnes photosensibles. L'opacité basse reste franchement
        // lisible — c'est elle qui subsiste sous `prefers-reduced-motion`,
        // où le filet CSS global fige l'animation.
        'alert-pulse': {
          '0%, 100%': { opacity: '0.72', textShadow: '0 0 0 rgba(185, 28, 28, 0)' },
          '50%': { opacity: '1', textShadow: '0 0 14px rgba(185, 28, 28, 0.5)' },
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
        // Durée posée au cas par cas côté composant (17 à 31 s) : une valeur
        // unique remettrait toutes les formes en phase.
        'bubble-drift': 'bubble-drift 24s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'alert-pulse': 'alert-pulse 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
