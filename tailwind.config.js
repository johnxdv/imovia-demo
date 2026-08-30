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
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
