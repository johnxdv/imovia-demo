import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Maximize, LayoutGrid, BedDouble, MapPin, Phone } from 'lucide-react'
import { getByReference } from '../lib/properties'
import { formatPrice, formatSurface, formatNumber, photoUrl, photoSrcSet } from '../lib/format'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { DpeScale } from '../components/ui/DpeScale'
import { FavoriteButton } from '../components/ui/FavoriteButton'
import { PlanFrame } from '../components/ui/PlanFrame'
import { PlanDivider } from '../components/ui/PlanDivider'
import { agency } from '../data/agency'
import { useDocumentTitle } from '../lib/useDocumentTitle'

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col gap-2">
      <Icon className="h-5 w-5 text-brass" strokeWidth={1.5} aria-hidden="true" />
      <span className="font-mono text-lg text-stone">{value}</span>
      <span className="font-mono text-[0.62rem] uppercase tracking-micro text-stone/50">{label}</span>
    </div>
  )
}

function NotFound() {
  useDocumentTitle('Bien introuvable')
  return (
    <div className="container-page flex min-h-[70vh] flex-col justify-center py-32 text-stone">
      <p className="eyebrow">Erreur 404</p>
      <h1 className="mt-6 text-display-md">Ce bien n’est plus disponible.</h1>
      <p className="mt-4 max-w-md text-stone/70">
        La référence demandée n’existe pas ou a été retirée de notre sélection.
      </p>
      <div className="mt-10">
        <Button to="/acheter" variant="outline" className="text-stone">
          Voir les biens à la vente
        </Button>
      </div>
    </div>
  )
}

export default function PropertyDetail() {
  const { reference } = useParams()
  const property = getByReference(reference)
  const [active, setActive] = useState(0)

  useDocumentTitle(property ? property.titre : 'Bien introuvable')

  if (!property) return <NotFound />

  const {
    titre,
    typeBien,
    typeTransaction,
    prix,
    ville,
    codePostal,
    surface,
    pieces,
    chambres,
    dpe,
    ges,
    descriptionLongue,
    photos,
    statut,
  } = property

  const sold = statut === 'vendu'
  const backTo = typeTransaction === 'location' ? '/louer' : sold ? '/biens-vendus' : '/acheter'
  const transactionLabel = sold ? 'Vendu' : typeTransaction === 'location' ? 'À louer' : 'À vendre'

  const caracteristiques = [
    ['Référence', reference],
    ['Type de bien', typeBien],
    ['Transaction', transactionLabel],
    ['Ville', `${ville} (${codePostal})`],
    ['Surface', formatSurface(surface)],
    ['Pièces', formatNumber(pieces)],
    ['Chambres', formatNumber(chambres)],
    ['Statut', sold ? 'Vendu' : 'Disponible'],
  ]

  return (
    <div className="bg-ink text-stone">
      <div className="container-page pb-24 pt-28 sm:pt-32">
        <Link
          to={backTo}
          className="inline-flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-micro text-stone/70 transition-colors hover:text-brass"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
          Retour
        </Link>

        <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
          {/* Galerie + description */}
          <div className="lg:col-span-7">
            <div className="group relative aspect-[4/3] overflow-hidden bg-ink">
              <img
                key={active}
                src={photoUrl(photos[active], { w: 1400 })}
                srcSet={photoSrcSet(photos[active])}
                sizes="(min-width:1024px) 58vw, 92vw"
                alt={`${titre} — visuel ${active + 1}`}
                className={`h-full w-full object-cover ${sold ? 'grayscale-[0.3]' : ''}`}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/30 to-transparent" />
              <PlanFrame />
              {sold ? (
                <div className="absolute left-4 top-4 z-30">
                  <Badge variant="brass">Vendu</Badge>
                </div>
              ) : null}
            </div>

            {/* Miniatures */}
            {photos.length > 1 ? (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {photos.map((p, i) => (
                  <button
                    key={p + i}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Afficher le visuel ${i + 1}`}
                    aria-current={i === active}
                    className={`relative aspect-[4/3] overflow-hidden border transition-colors duration-300 ${
                      i === active ? 'border-brass' : 'border-transparent hover:border-brass/40'
                    }`}
                  >
                    <img
                      src={photoUrl(p, { w: 300 })}
                      alt=""
                      loading="lazy"
                      className={`h-full w-full object-cover ${i === active ? '' : 'opacity-70'}`}
                    />
                  </button>
                ))}
              </div>
            ) : null}

            {/* Description */}
            <div className="mt-12">
              <PlanDivider label="Le bien" />
              <p className="mt-8 whitespace-pre-line text-base leading-relaxed text-stone/80">
                {descriptionLongue}
              </p>
            </div>

            {/* Caractéristiques */}
            <div className="mt-12">
              <PlanDivider label="Caractéristiques" />
              <dl className="mt-8 grid grid-cols-1 gap-x-10 sm:grid-cols-2">
                {caracteristiques.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between gap-4 border-b border-white/10 py-3.5"
                  >
                    <dt className="font-mono text-[0.68rem] uppercase tracking-micro text-stone/50">
                      {k}
                    </dt>
                    <dd className="font-mono text-sm text-stone">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-10 grid max-w-md grid-cols-2 gap-10">
                <DpeScale label="DPE" value={dpe} />
                <DpeScale label="GES" value={ges} />
              </div>
            </div>
          </div>

          {/* Panneau d'information (sticky) */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <div className="relative border border-brass/25 p-7 sm:p-9">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-[0.68rem] uppercase tracking-micro text-brass">
                    {transactionLabel}
                  </span>
                  <FavoriteButton reference={reference} />
                </div>

                <h1 className="mt-5 text-display-md text-stone">{titre}</h1>

                <p className="mt-4 inline-flex items-center gap-2 font-mono text-sm text-stone/70">
                  <MapPin className="h-4 w-4 text-brass" strokeWidth={1.6} aria-hidden="true" />
                  {ville} · {codePostal}
                </p>

                <p className="mt-7 font-mono text-3xl text-brass">
                  {formatPrice(prix, typeTransaction)}
                </p>

                <div className="mt-9 grid grid-cols-3 gap-4 border-t border-white/10 pt-8">
                  <Stat icon={Maximize} label="Surface" value={formatSurface(surface)} />
                  <Stat icon={LayoutGrid} label="Pièces" value={formatNumber(pieces)} />
                  <Stat icon={BedDouble} label="Chambres" value={formatNumber(chambres)} />
                </div>

                <div className="mt-9 flex flex-col gap-3">
                  <Button to={`/contact?bien=${reference}`} variant="primary" size="lg">
                    Demander une visite
                  </Button>
                  <a
                    href={agency.phoneHref}
                    className="inline-flex items-center justify-center gap-2.5 border border-brass/40 px-8 py-4 font-mono text-[0.72rem] uppercase tracking-micro text-stone transition-colors duration-300 hover:border-brass hover:text-brass"
                  >
                    <Phone className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
                    {agency.phone}
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
