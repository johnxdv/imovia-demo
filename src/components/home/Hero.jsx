import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { EASE } from '../../lib/motion'
import { SearchBar } from './SearchBar'
import { Button } from '../ui/Button'

const LOOP_SRC = '/videos/hero-loop.mp4'
const FRAME_COUNT = 240
const framePath = (n) => `/frames/hero-walkthrough/frame-${String(n).padStart(3, '0')}.jpg`

// Répartition du scroll sur la section.
const SCRUB_END = 0.68 // fin du parcours (dernière frame)
const CROSSFADE_END = 0.8 // fin du fondu parcours (canvas) → boucle (vidéo)

export function Hero() {
  const reduce = useReducedMotion()

  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const loopRef = useRef(null)
  const imagesRef = useRef([])
  const loadedRef = useRef(new Uint8Array(FRAME_COUNT))
  const currentFrameRef = useRef(0)

  const [searchActive, setSearchActive] = useState(reduce)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  // Fondu Phase 1 (canvas) ↔ Phase 2 (boucle).
  const canvasOpacity = useTransform(scrollYProgress, [SCRUB_END, CROSSFADE_END], [1, 0])
  const loopOpacity = useTransform(scrollYProgress, [SCRUB_END, CROSSFADE_END], [0, 1])
  // Accroche visible au repos, s'efface dès le scroll ; recherche révélée en Phase 2.
  const headlineOpacity = useTransform(scrollYProgress, [0, 0.06], [1, 0])
  const searchOpacity = useTransform(scrollYProgress, [0.8, 0.92], [0, 1])

  // --- Rendu canvas (séquence d'images, pas de scrubbing vidéo) ---

  const drawCover = (canvas, img) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const cw = canvas.width
    const ch = canvas.height
    const iw = img.naturalWidth
    const ih = img.naturalHeight
    if (!iw || !ih) return
    const scale = Math.max(cw / iw, ch / ih)
    const dw = iw * scale
    const dh = ih * scale
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh)
  }

  const nearestLoaded = (target) => {
    const loaded = loadedRef.current
    if (loaded[target]) return target
    for (let d = 1; d < FRAME_COUNT; d++) {
      const lo = target - d
      const hi = target + d
      if (lo >= 0 && loaded[lo]) return lo
      if (hi < FRAME_COUNT && loaded[hi]) return hi
    }
    return -1
  }

  const drawCurrent = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const idx = nearestLoaded(currentFrameRef.current)
    if (idx < 0) return
    const img = imagesRef.current[idx]
    if (img) drawCover(canvas, img)
  }

  const resizeCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.round(rect.width * dpr))
    canvas.height = Math.max(1, Math.round(rect.height * dpr))
    drawCurrent()
  }

  // Préchargement progressif des frames (par lots, jamais tout d'un bloc).
  useEffect(() => {
    const framesToLoad = reduce ? 1 : FRAME_COUNT
    const images = new Array(FRAME_COUNT)
    const loaded = new Uint8Array(FRAME_COUNT)
    imagesRef.current = images
    loadedRef.current = loaded

    resizeCanvas()
    const onResize = () => resizeCanvas()
    window.addEventListener('resize', onResize)

    let cancelled = false
    let next = 0
    let active = 0
    const CONCURRENCY = 6

    const pump = () => {
      while (!cancelled && active < CONCURRENCY && next < framesToLoad) {
        const i = next++
        active++
        const img = new Image()
        img.decoding = 'async'
        img.onload = () => {
          if (cancelled) return
          loaded[i] = 1
          active--
          drawCurrent()
          pump()
        }
        img.onerror = () => {
          if (cancelled) return
          active--
          pump()
        }
        img.src = framePath(i + 1)
        images[i] = img
      }
    }
    pump()

    return () => {
      cancelled = true
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce])

  // Frame affichée = position de scroll → index de frame disponible.
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    if (reduce) return
    const clamped = Math.min(Math.max(p / SCRUB_END, 0), 1)
    currentFrameRef.current = Math.round(clamped * (FRAME_COUNT - 1))
    drawCurrent()
    const active = p > 0.82
    setSearchActive((prev) => (prev === active ? prev : active))
  })

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="relative bg-ink"
      style={{ height: reduce ? '100vh' : '300vh' }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Phase 1 — séquence d'images rendue sur canvas (façade → chambre) */}
        <motion.canvas
          ref={canvasRef}
          style={{ opacity: reduce ? 1 : canvasOpacity }}
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        />

        {/* Phase 2 — boucle d'ambiance, vidéo classique en lecture autonome */}
        <motion.video
          ref={loopRef}
          style={{ opacity: reduce ? 0 : loopOpacity }}
          className="absolute inset-0 h-full w-full object-cover"
          src={LOOP_SRC}
          autoPlay={!reduce}
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
        />

        {/* Voile Ink Navy — unifie le visuel et soutient la lisibilité */}
        <div className="pointer-events-none absolute inset-0 bg-ink/20" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink/70 to-transparent" />

        {/* Accroche — centrée sur la première frame, disparaît dès le scroll */}
        <motion.div
          style={{ opacity: reduce ? 1 : headlineOpacity }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center px-6"
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(62% 48% at 50% 50%, rgba(16,20,28,0.55) 0%, rgba(16,20,28,0) 72%)',
            }}
          />
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
            className="relative max-w-4xl text-center text-display-xl text-stone"
          >
            L'immobilier avec la précision d'un plan.
          </motion.h1>
        </motion.div>

        {/* Recherche — apparaît en Phase 2, en surimpression sur la boucle */}
        <motion.div
          style={{ opacity: reduce ? 1 : searchOpacity }}
          className={`absolute inset-x-0 bottom-0 ${searchActive ? '' : 'pointer-events-none'}`}
        >
          <div className="container-page pb-14 sm:pb-20">
            {/* État final — accroche alignée à gauche + CTA Estimer, au-dessus de la recherche */}
            <div className="mb-8 flex flex-col items-start gap-6 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
              {reduce ? null : (
                <p className="max-w-xl font-display text-display-md text-stone">
                  L'immobilier avec la précision d'un plan.
                </p>
              )}
              <Button to="/estimer" variant="primary" size="lg" className="shrink-0">
                Estimer mon bien
              </Button>
            </div>
            <SearchBar />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
