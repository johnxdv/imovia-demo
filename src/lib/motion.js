// Variants partagés + courbe d'accélération « plan ».
export const EASE = [0.22, 1, 0.36, 1]

export const revealItem = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: EASE },
  },
}

export const staggerParent = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.04 },
  },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.8, ease: EASE } },
}

// Réglage commun du déclenchement au scroll.
export const viewportOnce = { once: true, amount: 0.25, margin: '0px 0px -8% 0px' }
