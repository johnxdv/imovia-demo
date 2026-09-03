import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Maximize, LayoutGrid, BedDouble, MapPin, Phone } from 'lucide-react'
import { getByReference } from '../lib/properties'
import { formatPrice, formatSurface, formatNumber, photoUrl, photoSrcSet } from '../lib/format'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { FavoriteButton } from '../components/ui/FavoriteButton'
import { PlanFrame } from '../components/ui/PlanFrame'
import { PlanDivider } from '../components/ui/PlanDivider'
import { InfosComplementaires } from '../components/property/InfosComplementaires'
import { EnergyDiagnostic } from '../components/property/EnergyDiagnostic'
import { agency } from '../data/agency'
import { useDocumentTitle } from '../lib/useDocumentTitle'

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col gap-2">
      <Icon className="h-5 w-5 text-ink" strokeWidth={1.5} aria-hidden="true" />
      <span className="font-mono text-lg text-ink">{value}</span>
      <span className="font-mono text-[0.62rem] uppercase tracking-micro text-ink/50">{label}</span>
    </div>
  )
}

// Titre de rubrique commun à toute la fiche — navy, gras, discrètement plus
// grand que le texte courant, suivi du trait de plan (purement décoratif ici).
function SectionTitle({ children }) {
  return (
    <>
      <h2 className="text-left font-display text-xl font-semibold text-ink sm:text-2xl">{children}</h2>
      <PlanDivider className="mb-8 mt-4" />
    </>
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
    energyValue,
    climateValue,
    descriptionLongue,
    photos,
    statut,
    honorairesCharge,
    copropriete,
    energie,
  } = property

  const sold = statut === 'vendu'
  const backTo = typeTransaction === 'location' ? '/louer' : '/acheter'
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
    <div className="bg-white text-ink">
      <div className="container-page pb-24 pt-28 sm:pt-32">
        <Link
          to={backTo}
          className="inline-flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-micro text-ink/55 transition-colors hover:text-brass"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
          Retour
        </Link>

        <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
          {/* Galerie + description */}
          <div className="lg:col-span-7">
            <div className="group relative aspect-[4/3] overflow-hidden bg-stone/40">
              <img
                key={active}
                src={photoUrl(photos[active], { w: 1400 })}
                srcSet={photoSrcSet(photos[active])}
                sizes="(min-width:1024px) 58vw, 92vw"
                alt={`${titre} — visuel ${active + 1}`}
                className={`h-full w-full object-cover ${sold ? 'grayscale-[0.3]' : ''}`}
              />
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
                    className={`relative aspect-[4/3] overflow-hidden border shadow-sm transition-colors duration-300 ${
                      i === active ? 'border-brass' : 'border-ink/10 hover:border-brass/50'
                    }`}
                  >
                    <img
                      src={photoUrl(p, { w: 300 })}
                      alt=""
                      loading="lazy"
                      className={`h-full w-full object-cover ${i === active ? '' : 'opacity-80'}`}
                    />
                  </button>
                ))}
              </div>
            ) : null}

            {/* Description */}
            <div className="mt-12">
              <SectionTitle>Le bien</SectionTitle>
              <p className="whitespace-pre-line text-base leading-relaxed text-ink/75">
                {descriptionLongue}
              </p>
            </div>

            {/* Caractéristiques */}
            <div className="mt-12">
              <SectionTitle>Caractéristiques</SectionTitle>
              <dl className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
                {caracteristiques.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between gap-4 border-b border-ink/10 py-3.5"
                  >
                    <dt className="font-mono text-[0.68rem] uppercase tracking-micro text-ink/50">{k}</dt>
                    <dd className="font-mono text-sm text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Diagnostics énergétiques (DPE / GES réglementaires) */}
            <div className="mt-12">
              <EnergyDiagnostic
                energyClass={dpe}
                energyValue={energyValue}
                climateClass={ges}
                climateValue={climateValue}
                annualEnergyCostMin={energie?.depenseMin}
                annualEnergyCostMax={energie?.depenseMax}
                energyPriceReferenceYears={energie?.anneesReference}
              />
            </div>
          </div>

          {/* Panneau d'information (sticky) — fiche récapitulative crème */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <div className="relative border border-brass/25 bg-stone p-7 text-ink sm:p-9">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-[0.68rem] uppercase tracking-micro text-brass">
                    {transactionLabel}
                  </span>
                  <FavoriteButton reference={reference} />
                </div>

                <h1 className="mt-5 text-display-md text-ink">{titre}</h1>

                <p className="mt-4 inline-flex items-center gap-2 font-mono text-sm text-ink/60">
                  <MapPin className="h-4 w-4 text-ink" strokeWidth={1.6} aria-hidden="true" />
                  {ville} · {codePostal}
                </p>

                <p className="mt-7 font-mono text-3xl font-semibold text-ink">
                  {formatPrice(prix, typeTransaction)}
                </p>

                <div className="mt-9 grid grid-cols-3 gap-4 border-t border-brass/20 pt-8">
                  <Stat icon={Maximize} label="Surface" value={formatSurface(surface)} />
                  <Stat icon={LayoutGrid} label="Pièces" value={formatNumber(pieces)} />
                  <Stat icon={BedDouble} label="Chambres" value={formatNumber(chambres)} />
                </div>

                <div className="mt-9 flex flex-col gap-3">
                  <Button to={`/contact?bien=${reference}`} variant="solidDark" size="lg">
                    Demander une visite
                  </Button>
                  <a
                    href={agency.phoneHref}
                    className="inline-flex items-center justify-center gap-2.5 border border-ink/30 bg-white px-8 py-4 font-mono text-[0.72rem] uppercase tracking-micro text-ink transition-colors duration-300 hover:border-ink hover:bg-ink/5"
                  >
                    <Phone className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
                    {agency.phone}
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Informations complémentaires — pleine largeur, générée depuis les données du bien */}
        <div className="mt-16">
          <SectionTitle>Informations complémentaires</SectionTitle>
          <div className="border border-brass/20 bg-stone/50 p-6 sm:p-8">
            <InfosComplementaires honorairesCharge={honorairesCharge} copropriete={copropriete} />
          </div>
        </div>
      </div>
    </div>
  )
}
