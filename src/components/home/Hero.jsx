import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { EASE } from '../../lib/motion'
import { ChevronDown } from 'lucide-react'
import { SearchBar } from './SearchBar'
import { EstimationCta } from './EstimationCta'
import { useVideoAllegee } from '../../lib/useVideoAllegee'

const LOOP_SRC = '/videos/hero-loop.mp4'
// Première image de la boucle. Sert de poster à la vidéo — ce que le visiteur
// voit avant qu'elle n'ait assez de données pour démarrer — et d'image de
// remplacement entière là où la vidéo ne se charge pas (voir `useVideoAllegee`).
const LOOP_POSTER = '/videos/hero-loop-poster.webp'
const FRAME_COUNT = 240
// WebP, 1600 de large : la séquence pesait 35,2 Mo en JPEG 1920, elle en
// pèse 10,8. Les 240 images sont toutes conservées — réduire leur nombre
// aurait doublé le pas du défilement, et c'est la seule chose qui se serait
// vue. La définition, elle, ne se voit pas : le canvas redessine à la taille
// de la fenêtre, derrière un voile Ink et deux dégradés.
const framePath = (n) => `/frames/hero-walkthrough/frame-${String(n).padStart(3, '0')}.webp`

// Répartition du scroll sur la section.
const SCRUB_END = 0.68 // fin du parcours (dernière frame)
const CROSSFADE_END = 0.8 // fin du fondu parcours (canvas) → boucle (vidéo)

// Apparition du panneau de recherche. Il chevauche volontairement la fin du
// fondu vers la boucle vidéo : c'est ce chevauchement qui le fait arriver plus
// tôt sans qu'on le voie surgir.
const RECHERCHE_DEBUT = 0.74
const RECHERCHE_FIN = 0.84

// Seuil à partir duquel le panneau redevient cliquable — placé juste après le
// milieu de sa montée, pour qu'on ne puisse pas cliquer sur ce qu'on distingue
// à peine.
const RECHERCHE_ACTIVE = 0.78

export function Hero() {
  const reduce = useReducedMotion()

  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const loopRef = useRef(null)
  const imagesRef = useRef([])
  const loadedRef = useRef(new Uint8Array(FRAME_COUNT))
  const currentFrameRef = useRef(0)

  const [searchActive, setSearchActive] = useState(reduce)
  // Vaut pour la vidéo ET pour la séquence : sur petit écran et en économie
  // de données, ni l'une ni l'autre ne se charge — 10,8 Mo d'images pour un
  // décor, sur un forfait mobile, ne se justifient pas davantage qu'une
  // vidéo. Le poster tient alors le fond à lui seul.
  const chargeDecor = useVideoAllegee()

  // LA SECTION NE FAIT 300 vh QU'APRÈS LE PREMIER AFFICHAGE.
  //
  // Elle les faisait d'emblée, et le navigateur devait donc calculer une page
  // trois fois plus haute que l'écran — avec son canvas et sa vidéo — avant de
  // pouvoir peindre quoi que ce soit. Rien de visible ne change : l'enfant est
  // en `sticky` et occupe 100 vh dans les deux cas, seule la longueur à
  // faire défiler arrive une image plus tard.
  const [deroule, setDeroule] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setDeroule(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // La hauteur de la section vient de changer : `useScroll` l'avait mesurée à
  // 100 vh, c'est-à-dire une course de défilement nulle, et rendait donc une
  // progression de 1 — le hero s'affichait d'emblée dans son état de fin,
  // canvas éteint et boucle vidéo en pleine lumière. Un `resize` le force à
  // reprendre ses mesures sur la section déroulée.
  useEffect(() => {
    if (!deroule) return
    window.dispatchEvent(new Event('resize'))
  }, [deroule])

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  // Fondu Phase 1 (canvas) ↔ Phase 2 (boucle).
  const canvasOpacity = useTransform(scrollYProgress, [SCRUB_END, CROSSFADE_END], [1, 0])
  const loopOpacity = useTransform(scrollYProgress, [SCRUB_END, CROSSFADE_END], [0, 1])
  // Accroche visible au repos, s'efface dès le scroll ; recherche révélée en Phase 2.
  const headlineOpacity = useTransform(scrollYProgress, [0, 0.06], [1, 0])
  // LA RECHERCHE ARRIVE PLUS TÔT, ET S'INSTALLE PLUS VITE.
  //
  // Elle partait à 0,80 pour n'être pleinement colorée qu'à 0,92 : le visiteur
  // atteignait le bas du parcours avant que le panneau n'ait fini de prendre
  // ses couleurs. Le départ remonte de six centièmes, et la montée se resserre
  // de douze à dix centièmes — assez pour que le panneau soit net plus tôt,
  // trop peu pour qu'il apparaisse d'un coup.
  const searchOpacity = useTransform(scrollYProgress, [RECHERCHE_DEBUT, RECHERCHE_FIN], [0, 1])
  // Indicateur de scroll : présent sur la première frame, s'efface dès le scroll.
  const cueOpacity = useTransform(scrollYProgress, [0, 0.05], [1, 0])

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
    if (!deroule || !chargeDecor) return undefined

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
  }, [reduce, deroule, chargeDecor])

  // Frame affichée = position de scroll → index de frame disponible.
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    if (reduce) return
    const clamped = Math.min(Math.max(p / SCRUB_END, 0), 1)
    currentFrameRef.current = Math.round(clamped * (FRAME_COUNT - 1))
    drawCurrent()
    const active = p > RECHERCHE_ACTIVE
    setSearchActive((prev) => (prev === active ? prev : active))
  })

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="relative bg-ink"
      style={{ height: reduce || !deroule ? '100vh' : '300vh' }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {chargeDecor ? (
          <>
            {/* Phase 1 — séquence d'images rendue sur canvas (façade → chambre) */}
            <motion.canvas
              ref={canvasRef}
              style={{ opacity: reduce ? 1 : canvasOpacity }}
              className="absolute inset-0 h-full w-full"
              aria-hidden="true"
            />

            {/* Phase 2 — boucle d'ambiance, vidéo classique en lecture autonome.

                `preload="metadata"` et non `auto` : en `auto`, le navigateur
                tirait le fichier entier au chargement de l'accueil, pour un
                décor que le visiteur ne voit qu'après avoir fait défiler les
                deux tiers de la section. */}
            <motion.video
              ref={loopRef}
              style={{ opacity: reduce ? 0 : loopOpacity }}
              className="absolute inset-0 h-full w-full object-cover"
              src={LOOP_SRC}
              poster={LOOP_POSTER}
              autoPlay={!reduce}
              loop
              muted
              playsInline
              preload="metadata"
              aria-hidden="true"
              tabIndex={-1}
            />
          </>
        ) : (
          /* Petit écran ou économie de données : ni la séquence, ni la vidéo.

             Le poster tient le fond à lui seul, en pleine opacité et sans
             dépendre du défilement — s'il suivait `loopOpacity` comme la
             vidéo qu'il remplace, le hero s'ouvrirait sur du noir, puisque
             cette valeur part de zéro et qu'il n'y a plus de canvas derrière
             pour occuper la place. Le reste de la section ne change pas : le
             titre s'efface et le panneau de recherche se révèle au même
             rythme. */
          <img
            src={LOOP_POSTER}
            width={1600}
            height={900}
            alt=""
            aria-hidden="true"
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* Voile Ink Navy — unifie le visuel et soutient la lisibilité.

            Plus dense quand le fond est le poster seul : la séquence s'ouvre
            sur une façade sombre, le poster sur une baie vitrée en plein jour,
            et l'accroche blanche y devenait illisible. Le voile du parcours
            complet, lui, ne bouge pas. */}
        <div
          className={`pointer-events-none absolute inset-0 ${chargeDecor ? 'bg-ink/20' : 'bg-ink/45'}`}
        />
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
          {/* Composition en deux lignes, césure imposée après « avec ». Les
              deux lignes refusent de se replier (`whitespace-nowrap`) ; la
              taille descend donc en dessous de `display-xl` sur les écrans
              trop étroits pour la ligne la plus longue. */}
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
            className="relative max-w-4xl text-center font-display text-[length:clamp(1.4rem,7vw,6rem)] font-normal leading-[0.98] tracking-[-0.02em] text-stone"
          >
            <span className="block whitespace-nowrap">L'immobilier, avec</span>
            <span className="block whitespace-nowrap">exigence et proximité.</span>
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
                  L'immobilier, avec exigence et proximité.
                </p>
              )}
              <EstimationCta />
            </div>
            <SearchBar />
          </div>
        </motion.div>

        {/* Indicateur de scroll — discret, uniquement sur la première frame.
            La flèche descend puis remonte en boucle lente : assez pour signaler
            qu'il faut faire défiler, pas assez pour attirer l'œil loin du
            titre. `useReducedMotion` coupe le mouvement quand le système le
            demande — l'indicateur reste alors simplement posé là. */}
        <motion.div
          style={{ opacity: reduce ? 1 : cueOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-col items-center gap-1 text-stone/70"
          aria-hidden="true"
        >
          <span className="font-mono text-[0.58rem] uppercase tracking-micro">Défiler</span>
          <motion.span
            className="block"
            animate={reduce ? undefined : { y: [0, 6, 0] }}
            transition={
              reduce
                ? undefined
                : { duration: 2.6, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.5 }
            }
          >
            <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
          </motion.span>
        </motion.div>
      </div>
    </section>
  )
}
