import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import {
  ShieldCheck,
  ArrowRight,
  MapPin,
  Award,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  UserRound,
} from 'lucide-react'
import { Hero } from '../components/home/Hero'
import { Section } from '../components/ui/Section'
import { Reveal, RevealGroup, RevealChild } from '../components/ui/Reveal'
import { PlanFrame } from '../components/ui/PlanFrame'
import { PropertyCard } from '../components/ui/PropertyCard'
import { ArrowLink } from '../components/ui/ArrowLink'
import { Button } from '../components/ui/Button'
import { photoUrl, photoSrcSet, localPhoto } from '../lib/format'
import { team } from '../data/team'
import { latestAvailable } from '../lib/properties'
import { useDocumentTitle } from '../lib/useDocumentTitle'

// Photo d'ouverture de la section « À propos » — les bords de la Sarre à
// Sarreguemines, fournie par l'agence et déclinée en quatre largeurs. Le
// recadrage reste au `object-cover` : l'image n'est jamais étirée.
const SARREGUEMINES = localPhoto('/photos/sarreguemines', [480, 768, 1100, 1304])

const valeurs = [
  {
    icon: MapPin,
    titre: 'Proximité',
    texte:
      'En étant entièrement disponibles pour vous, en connaissant chaque quartier, chaque rue et les réalités de notre secteur pour vous apporter des conseils pertinents.',
  },
  {
    icon: ShieldCheck,
    titre: 'Confiance',
    texte:
      'En construisant une relation basée sur la transparence, la sincérité et le respect de nos engagements.',
  },
  {
    icon: Award,
    titre: 'Exigence',
    texte:
      'En valorisant chaque bien grâce à une présentation soignée, des photos professionnelles, une communication de qualité et une sélection rigoureuse des acquéreurs.',
  },
  {
    icon: Lightbulb,
    titre: 'Innovation',
    texte:
      'En associant les méthodes traditionnelles qui ont fait leurs preuves aux outils numériques les plus performants pour offrir une visibilité maximale à votre bien.',
  },
]

const orientations = [
  {
    to: '/acheter',
    titre: 'Acheter',
    texte: 'Découvrez nos biens disponibles et trouvez celui qui correspond à votre projet.',
    photo: '1600566753086-00f18fb6b3ea',
  },
  {
    to: '/louer',
    titre: 'Louer',
    texte: 'Découvrez nos biens à louer et trouvez votre prochain chez-vous.',
    photo: '1502672260266-1c1ef2d93688',
  },
  {
    to: '/vendre',
    titre: 'Vendre',
    texte: 'De l’estimation à la signature, nous vous accompagnons à chaque étape.',
    photo: '1600585152220-90363fe7e115',
  },
]

function About() {
  return (
    <Section tone="ink" divider dividerLabel="L'agence">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6">
          <Reveal>
            <h2 className="text-display-md text-stone">À propos d’IMMOVIA</h2>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="mt-8 space-y-5 text-base leading-relaxed text-stone/75">
              <p>
                Chez IMMOVIA, nous sommes convaincus que l’immobilier est avant tout une histoire de
                confiance, de proximité et d’engagement.
              </p>
              <p>
                Implantée au cœur du village de Diebling, idéalement située entre Sarreguemines,
                Saint-Avold et Forbach, notre agence accompagne chaque client, qu’il soit
                propriétaire, acquéreur, vendeur, bailleur, investisseur ou locataire, avec une
                approche humaine, transparente et exigeante.
              </p>
              <p>
                Parce que chaque projet est unique, nous prenons le temps de vous écouter, de
                comprendre vos attentes et de vous proposer un accompagnement entièrement
                personnalisé.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-10">
              <ArrowLink to="/equipe">Faire connaissance</ArrowLink>
            </div>
          </Reveal>
        </div>

        <div className="lg:col-span-6">
          <Reveal delay={0.1}>
            <div className="group relative aspect-[4/3] overflow-hidden">
              <img
                src={SARREGUEMINES.src}
                srcSet={SARREGUEMINES.srcSet}
                sizes="(min-width:1024px) 45vw, 92vw"
                alt="Les bords de la Sarre à Sarreguemines, au cœur du secteur de l’agence"
                loading="lazy"
                className="h-full w-full object-cover object-center"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" />
              <PlanFrame />
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  )
}

function Valeurs() {
  return (
    <Section tone="stone" divider>
      <Reveal>
        <h2 className="max-w-3xl text-display-md text-ink">Nos valeurs</h2>
      </Reveal>
      <RevealGroup className="mt-14 grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {valeurs.map(({ icon: Icon, titre, texte }) => (
          <RevealChild key={titre}>
            <div className="border-t border-ink/15 pt-6">
              <Icon className="h-7 w-7 text-bottle" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="mt-5 font-display text-xl text-ink">{titre}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">{texte}</p>
            </div>
          </RevealChild>
        ))}
      </RevealGroup>
    </Section>
  )
}

function Orientation() {
  return (
    <Section tone="ink" divider dividerLabel="Par où commencer">
      <RevealGroup className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {orientations.map((o) => (
          <RevealChild key={o.to}>
            <Link
              to={o.to}
              className="group relative block bg-ink focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={photoUrl(o.photo, { w: 900 })}
                  srcSet={photoSrcSet(o.photo)}
                  sizes="(min-width:768px) 30vw, 92vw"
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-plan group-hover:scale-[1.05]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
                <PlanFrame />
              </div>
              <div className="px-1 pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-2xl text-stone">{o.titre}</h3>
                  <ArrowRight
                    className="h-5 w-5 text-brass transition-transform duration-300 ease-plan group-hover:translate-x-1"
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-stone/70">{o.texte}</p>
              </div>
            </Link>
          </RevealChild>
        ))}
      </RevealGroup>
    </Section>
  )
}

// Rythme du défilement automatique et délai de reprise après une action
// manuelle — assez long pour ne pas reprendre la main sous les doigts du
// visiteur, assez court pour que la bande reparte d'elle-même.
const DEFILEMENT_MS = 4500
const REPRISE_APRES_ACTION_MS = 9000

/**
 * Carrousel « bande continue » des derniers biens.
 *
 * Le ruban affiche la liste deux fois de suite. Avancer incrémente simplement
 * l'index ; quand il atteint la longueur de la liste, le ruban a défilé d'un
 * tour complet et se retrouve visuellement identique à sa position de départ —
 * on le recale alors sur 0, transition coupée, sans que rien ne bouge à
 * l'écran. Reculer depuis 0 fait la manœuvre inverse. D'où une boucle sans fin,
 * sans carte vide, sans saut et sans doublon visible : on ne voit jamais deux
 * fois le même bien à l'écran puisque la seconde copie n'entre en scène que
 * lorsque la première est sortie.
 */
function DerniersBiens() {
  const biens = latestAvailable(6)
  const reduce = useReducedMotion()

  const [perView, setPerView] = useState(3)
  const [index, setIndex] = useState(0)
  const [anime, setAnime] = useState(true)
  // Horodatage de la dernière action manuelle : le défilement automatique
  // reprend de lui-même passé `REPRISE_APRES_ACTION_MS`.
  const [derniereAction, setDerniereAction] = useState(0)

  const total = biens.length
  // En dessous de ce seuil, il n'y a pas de quoi faire défiler : la bande
  // resterait immobile ou tournerait sur des cartes déjà visibles.
  const bouclable = total > perView

  // Biens visibles simultanément : 1 (téléphone), 2 (tablette), 3 (ordinateur).
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth
      setPerView(w < 640 ? 1 : w < 1024 ? 2 : 3)
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  // Un changement de largeur peut laisser l'index hors de la plage utile.
  useEffect(() => {
    setIndex((i) => (total > 0 ? ((i % total) + total) % total : 0))
  }, [perView, total])

  // Sans animation, le recalage de fin de tour ne peut pas s'appuyer sur
  // `onTransitionEnd` — il n'y a pas de transition. L'index boucle alors
  // directement en arithmétique modulaire : même bien affiché, sans le
  // déplacement du ruban, et sans risque de sortir de la bande.
  const avancer = useCallback(() => {
    if (!bouclable) return
    if (reduce) {
      setIndex((i) => (i + 1) % total)
      return
    }
    setAnime(true)
    setIndex((i) => i + 1)
  }, [bouclable, reduce, total])

  const reculer = useCallback(() => {
    if (!bouclable) return
    if (reduce) {
      setIndex((i) => (i - 1 + total) % total)
      return
    }
    if (index > 0) {
      setAnime(true)
      setIndex(index - 1)
      return
    }
    // Depuis la première carte : on saute sans transition à la copie de droite,
    // puis on recule d'un cran à la frame suivante. Le visiteur ne voit que le
    // recul.
    setAnime(false)
    setIndex(total)
  }, [bouclable, reduce, index, total])

  // Filet de sécurité : l'index ne sort jamais du ruban, même si la fin de
  // transition n'a pas été signalée.
  useEffect(() => {
    if (total > 0 && index > total) setIndex(index % total)
  }, [index, total])

  // Recalage après le saut sans transition (aller comme retour).
  useEffect(() => {
    if (anime || total === 0) return
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnime(true)
        setIndex((i) => (i === total ? total - 1 : i))
      })
    })
    return () => cancelAnimationFrame(id)
  }, [anime, total])

  const action = (fn) => () => {
    setDerniereAction(Date.now())
    fn()
  }

  // Défilement automatique. Suspendu si l'animation est désactivée par le
  // système (`prefers-reduced-motion`), si l'onglet est en arrière-plan, ou
  // dans les secondes qui suivent une action manuelle.
  useEffect(() => {
    if (reduce || !bouclable) return
    const id = setInterval(() => {
      if (document.hidden) return
      if (Date.now() - derniereAction < REPRISE_APRES_ACTION_MS) return
      avancer()
    }, DEFILEMENT_MS)
    return () => clearInterval(id)
  }, [reduce, bouclable, derniereAction, avancer])

  // Balayage tactile — même déplacement qu'un appui sur les flèches.
  const toucheX = useRef(null)
  const onTouchStart = (e) => {
    toucheX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e) => {
    if (toucheX.current == null) return
    const delta = e.changedTouches[0].clientX - toucheX.current
    toucheX.current = null
    if (Math.abs(delta) < 45) return
    setDerniereAction(Date.now())
    if (delta < 0) avancer()
    else reculer()
  }

  const arrowClass =
    'inline-flex h-11 w-11 items-center justify-center border border-ink/25 text-ink transition-colors hover:border-brass hover:text-brass disabled:pointer-events-none disabled:opacity-30 touch-manipulation'

  // Le ruban porte la liste deux fois : la seconde copie fournit les cartes qui
  // entrent par la droite en fin de tour.
  const ruban = bouclable ? [...biens, ...biens] : biens

  return (
    <Section tone="stone" divider dividerLabel="Sélection">
      <Reveal>
        <h2 className="max-w-2xl text-display-md text-ink">Découvrez nos derniers biens.</h2>
      </Reveal>

      <div
        className="mt-14 -mx-3 overflow-hidden"
        role="region"
        aria-roledescription="carrousel"
        aria-label="Nos derniers biens"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={
          bouclable
            ? {
                // Fondu aux deux bords : la carte sortante s'efface vers la
                // gauche pendant que la suivante se révèle par la droite.
                maskImage:
                  'linear-gradient(to right, transparent 0, #000 3.5%, #000 96.5%, transparent 100%)',
                WebkitMaskImage:
                  'linear-gradient(to right, transparent 0, #000 3.5%, #000 96.5%, transparent 100%)',
              }
            : undefined
        }
      >
        <div
          className={`flex ${anime && !reduce ? 'transition-transform duration-700 ease-plan' : ''}`}
          style={{ transform: `translateX(-${index * (100 / perView)}%)` }}
          onTransitionEnd={(e) => {
            // L'évènement remonte depuis les cartes, qui ont leurs propres
            // transitions au survol : seul le ruban lui-même compte.
            if (e.target !== e.currentTarget) return
            // Un tour complet : le ruban est visuellement à son point de
            // départ, on y revient sans transition.
            if (index >= total) {
              setAnime(false)
              setIndex(0)
            }
          }}
        >
          {ruban.map((p, i) => (
            <div
              key={`${p.reference}-${i}`}
              className="shrink-0 grow-0 px-3"
              style={{ flexBasis: `${100 / perView}%` }}
            >
              <PropertyCard property={p} simplifie />
            </div>
          ))}
        </div>
      </div>

      {/* Commandes sous le carrousel, alignées à droite — accessibles
          immédiatement après les cartes, sur ordinateur comme sur mobile. */}
      <Reveal delay={0.05}>
        <div className="mt-10 flex items-center justify-end gap-6">
          <ArrowLink to="/acheter" className="!text-ink hover:!text-brass">
            Voir tous nos biens
          </ArrowLink>
          {bouclable ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={action(reculer)}
                aria-label="Voir le bien précédent"
                className={arrowClass}
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={action(avancer)}
                aria-label="Voir le bien suivant"
                className={arrowClass}
              >
                <ChevronRight className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      </Reveal>
    </Section>
  )
}

function VendreCTA() {
  return (
    <section className="relative overflow-hidden bg-ink">
      <div className="absolute inset-0">
        <img
          src={photoUrl('1613490493576-7fde63acd811', { w: 1920, q: 70 })}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/50" />
      </div>

      <div className="container-page relative py-24 sm:py-32">
        <div className="max-w-2xl">
          <h2 className="text-display-lg text-stone">Vous avez un bien à vendre ?</h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone/80">
            Obtenez une estimation précise par un professionnel de l’immobilier, suivie d’un
            accompagnement à chaque étape jusqu’à la signature.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button to="/estimer" variant="primary" size="lg">
              Estimer mon bien
            </Button>
            <Button to="/vendre" variant="outline" size="lg" className="text-stone">
              Notre accompagnement
            </Button>
          </div>
        </div>
      </div>

      {/* Cadre de plan sur toute la section (élément signature) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-6 z-10 sm:inset-10">
        <span className="absolute left-0 top-0 h-8 w-8 border-l border-t border-brass/60" />
        <span className="absolute right-0 top-0 h-8 w-8 border-r border-t border-brass/60" />
        <span className="absolute bottom-0 left-0 h-8 w-8 border-b border-l border-brass/60" />
        <span className="absolute bottom-0 right-0 h-8 w-8 border-b border-r border-brass/60" />
      </div>
    </section>
  )
}

/**
 * Bandeau de contact — volontairement fin.
 *
 * La hauteur totale visée vaut environ trois fois celle du titre. C'est le
 * bouton — plus haut que le titre — qui commande la hauteur de la ligne : le
 * `py` ne fait que l'encadrer, réduit ici aux deux tiers d'une hauteur de titre
 * là où les autres sections respirent sur `py-20 sm:py-28`. Titre et bouton
 * sont centrés sur le même axe (`items-center`), et le bandeau garde les marges
 * latérales du site via `container-page`. Sur mobile, les deux éléments
 * s'empilent avec un écart serré plutôt que de reconstituer un bandeau haut.
 */
function ContactTeaser() {
  return (
    <Section tone="stone" py="py-6 sm:py-7">
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <Reveal>
          <h2 className="max-w-xl text-display-md text-ink">Parlons de votre projet.</h2>
        </Reveal>
        <Reveal delay={0.05}>
          <Button to="/contact" variant="solidDark" size="lg">
            Nous contacter
          </Button>
        </Reveal>
      </div>
    </Section>
  )
}

// Les deux conseillers de l'agence, suivis d'une case « Vous ? » invitant à
// candidater. Rôles et portraits viennent de `data/team` : une seule source
// pour l'aperçu de la page d'accueil et pour la page Équipe.
const conseillers = [
  ...team.map((m) => ({ key: m.id, nom: m.nom, role: m.role, photo: m.photo })),
  { key: 'recrutement', role: 'Vous ?', to: '/recrutement', invite: true },
]

function EquipeTeaser() {
  return (
    <Section tone="ink" divider dividerLabel="L'équipe">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-5">
          <Reveal>
            {/* Deux lignes imposées à toutes les largeurs. « Une équipe
                engagée, » ne doit jamais se replier : le `whitespace-nowrap`
                l'interdit, et la taille descend en dessous de `display-md` sur
                les écrans trop étroits pour la contenir d'un trait — virgule
                comprise. */}
            <h2 className="font-display text-[length:clamp(1.3rem,7.6vw,2.75rem)] font-normal leading-[1.05] tracking-[-0.01em] text-stone sm:text-display-md">
              <span className="block whitespace-nowrap">Une équipe engagée,</span>
              <span className="block whitespace-nowrap">à vos côtés.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="mt-6 max-w-md text-base leading-relaxed text-stone/75">
              La proximité pour mieux vous comprendre,{' '}
              <span className="inline lg:block">l’exigence pour servir au mieux votre projet.</span>
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-8">
              <ArrowLink to="/equipe">Découvrir l’équipe</ArrowLink>
            </div>
          </Reveal>
        </div>

        <div className="lg:col-span-7">
          <RevealGroup className="grid grid-cols-3 gap-4">
            {conseillers.map((m) => {
              const card = (
                <div className="group relative flex aspect-[3/4] items-center justify-center overflow-hidden border border-white/10 bg-ink">
                  {m.photo ? (
                    <img
                      src={m.photo.src}
                      srcSet={m.photo.srcSet}
                      sizes="(min-width:1024px) 19vw, 30vw"
                      alt={m.nom}
                      loading="lazy"
                      className="h-full w-full object-cover object-top grayscale transition-all duration-500 ease-plan group-hover:grayscale-0"
                    />
                  ) : (
                    <UserRound
                      className={`h-14 w-14 transition-colors ${
                        m.invite ? 'text-brass/60 group-hover:text-brass' : 'text-stone/25'
                      }`}
                      strokeWidth={1}
                      aria-hidden="true"
                    />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                  <span className="absolute inset-x-3 bottom-3 font-mono text-[0.62rem] uppercase tracking-micro text-stone">
                    {m.role}
                  </span>
                  {m.invite ? <PlanFrame /> : null}
                </div>
              )
              return (
                <RevealChild key={m.key}>
                  {m.to ? (
                    <Link
                      to={m.to}
                      aria-label="Nous rejoindre — page recrutement"
                      className="block focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass"
                    >
                      {card}
                    </Link>
                  ) : (
                    card
                  )}
                </RevealChild>
              )
            })}
          </RevealGroup>
        </div>
      </div>
    </Section>
  )
}

function RecrutementTeaser() {
  return (
    <Section tone="stone" divider dividerLabel="Recrutement">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <Reveal>
            <h2 className="max-w-2xl text-display-md text-ink">
              Envie de faire de l’immobilier autrement ?
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink/70">
              Rejoignez une agence immobilière où proximité, exigence et innovation donnent une
              autre dimension au métier.
            </p>
          </Reveal>
        </div>
        <div className="lg:col-span-4 lg:flex lg:justify-end">
          <Reveal delay={0.1}>
            <Button to="/recrutement" variant="solidDark" size="lg">
              Nous rejoindre
            </Button>
          </Reveal>
        </div>
      </div>
    </Section>
  )
}

export default function Home() {
  useDocumentTitle('')
  return (
    <>
      <Hero />
      <About />
      <Valeurs />
      <Orientation />
      <DerniersBiens />
      <VendreCTA />
      <ContactTeaser />
      <EquipeTeaser />
      <RecrutementTeaser />
    </>
  )
}
