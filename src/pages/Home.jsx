import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { photoUrl, photoSrcSet } from '../lib/format'
import { latestAvailable } from '../lib/properties'
import { useDocumentTitle } from '../lib/useDocumentTitle'

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
    texte: 'Une sélection resserrée de biens à la vente, du centre de Bordeaux au Bassin.',
    photo: '1600566753086-00f18fb6b3ea',
  },
  {
    to: '/louer',
    titre: 'Louer',
    texte: 'Des locations vérifiées, meublées ou nues, prêtes à emménager.',
    photo: '1502672260266-1c1ef2d93688',
  },
  {
    to: '/vendre',
    titre: 'Vendre',
    texte: 'Un accompagnement clair, de l’estimation à la signature de l’acte.',
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
                Implantée au cœur du village de Diebling, idéalement situé entre Sarreguemines,
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
                src={photoUrl('1512917774080-9991f1c4c750', { w: 1200 })}
                srcSet={photoSrcSet('1512917774080-9991f1c4c750')}
                sizes="(min-width:1024px) 45vw, 92vw"
                alt="Demeure de caractère dans le Bordelais"
                loading="lazy"
                className="h-full w-full object-cover"
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

function DerniersBiens() {
  const biens = latestAvailable(6)
  const [perView, setPerView] = useState(3)
  const [index, setIndex] = useState(0)

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

  const maxIndex = Math.max(0, biens.length - perView)

  // Recale l'index si perView change (redimensionnement).
  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, biens.length - perView)))
  }, [perView, biens.length])

  const prev = () => setIndex((i) => Math.max(0, i - 1))
  const next = () => setIndex((i) => Math.min(maxIndex, i + 1))

  const arrowClass =
    'inline-flex h-11 w-11 items-center justify-center border border-ink/25 text-ink transition-colors hover:border-brass hover:text-brass disabled:pointer-events-none disabled:opacity-30 touch-manipulation'

  return (
    <Section tone="stone" divider dividerLabel="Sélection">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <Reveal>
          <h2 className="max-w-2xl text-display-md text-ink">Découvrez nos derniers biens.</h2>
        </Reveal>
        <Reveal delay={0.05}>
          <div className="flex items-center gap-6">
            <ArrowLink to="/acheter" className="!text-ink hover:!text-brass">
              Voir tous nos biens
            </ArrowLink>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={prev}
                disabled={index === 0}
                aria-label="Voir le bien précédent"
                className={arrowClass}
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={next}
                disabled={index >= maxIndex}
                aria-label="Voir le bien suivant"
                className={arrowClass}
              >
                <ChevronRight className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
              </button>
            </div>
          </div>
        </Reveal>
      </div>

      <div
        className="mt-14 -mx-3 overflow-hidden"
        role="region"
        aria-roledescription="carrousel"
        aria-label="Nos derniers biens"
      >
        <div
          className="flex transition-transform duration-500 ease-plan"
          style={{ transform: `translateX(-${index * (100 / perView)}%)` }}
        >
          {biens.map((p) => (
            <div
              key={p.reference}
              className="shrink-0 grow-0 px-3"
              style={{ flexBasis: `${100 / perView}%` }}
            >
              <PropertyCard property={p} />
            </div>
          ))}
        </div>
      </div>
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
          <p className="eyebrow">Vendeurs</p>
          <h2 className="mt-6 text-display-lg text-stone">Vous avez un bien à vendre ?</h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone/80">
            Obtenez une estimation fondée sur le marché réel, puis un accompagnement sur mesure
            jusqu’à la signature. Notre outil d’estimation en ligne arrive prochainement.
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

function ContactTeaser() {
  return (
    <Section tone="stone" py="py-20 sm:py-24">
      <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
        <Reveal>
          <div>
            <p className="eyebrow !text-bottle">Contact</p>
            <h2 className="mt-4 max-w-xl text-display-md text-ink">Parlons de votre projet.</h2>
          </div>
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

// Photos et noms réels non encore fournis : libellés de rôle uniquement + une
// case « Vous ? » invitant à candidater.
const conseillers = [
  { role: "Directeur d'agence" },
  { role: 'Conseillère immobilier' },
  { role: 'Vous ?', to: '/recrutement', invite: true },
]

function EquipeTeaser() {
  return (
    <Section tone="ink" divider dividerLabel="L'équipe">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-5">
          <Reveal>
            <h2 className="text-display-md text-stone">Des conseillers, pas des intermédiaires.</h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="mt-6 max-w-md text-base leading-relaxed text-stone/75">
              Une équipe stable, présente sur le terrain, qui connaît ses secteurs et ses clients.
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
                  <UserRound
                    className={`h-14 w-14 transition-colors ${
                      m.invite ? 'text-brass/60 group-hover:text-brass' : 'text-stone/25'
                    }`}
                    strokeWidth={1}
                    aria-hidden="true"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                  <span className="absolute inset-x-3 bottom-3 font-mono text-[0.62rem] uppercase tracking-micro text-stone">
                    {m.role}
                  </span>
                  {m.invite ? <PlanFrame /> : null}
                </div>
              )
              return (
                <RevealChild key={m.role}>
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
              Envie de faire l’immobilier autrement ?
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink/70">
              Nous recrutons des conseillers qui partagent notre exigence et notre goût du travail
              bien fait. Écrivez-nous.
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
