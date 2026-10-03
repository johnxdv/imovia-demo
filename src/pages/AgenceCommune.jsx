import { Link, useParams } from 'react-router-dom'
import { Phone, Mail, MapPin, Clock } from 'lucide-react'

import { PageHeader } from '../components/ui/PageHeader'
import { Section } from '../components/ui/Section'
import { Button } from '../components/ui/Button'
import { agency } from '../data/agency'
import { communeParSlug, communeSiege } from '../data/secteur'
import { presentationAgence } from '../../api/_lib/articleTexte'
import { articles, dateLisible } from '../lib/articles'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import NotFound from './NotFound'

// La page d'atterrissage d'une commune du secteur.
//
// POURQUOI ELLE EXISTE
//
// Les articles du blog visent désormais « agence immobilière {ville} » (voir
// `scripts/_lib/seo-mots-cles.mjs`). Une ancre interne doit mener quelque part :
// sans cette page, les deux liens de chaque conclusion pointaient tous les deux
// vers l'estimateur, et la requête commerciale n'avait aucune page à classer.
//
// CE QU'ELLE CONTIENT, ET CE QU'ELLE NE CONTIENDRA JAMAIS
//
// Rien que du vérifiable : l'identité de l'agence, son adresse, son téléphone,
// ses horaires, sa carte professionnelle, la distance relevée jusqu'à la
// commune, et les articles que le blog a consacrés à cette commune. Aucune
// phrase d'ambiance, aucune statistique de marché, aucun « spécialiste de
// {ville} depuis 20 ans ». Ce n'est pas une pudeur de style : le reste du
// système s'interdit déjà d'avancer un chiffre qu'il ne peut pas sourcer, et
// une page d'atterrissage ne bénéficie d'aucune dérogation.
//
// CES PAGES SE RESSEMBLENT, ET C'EST LEUR LIMITE
//
// Entre deux communes sans article, il ne reste que le nom et la distance qui
// changent. C'est assumé pour les communes que le blog traite ; c'est un risque
// réel pour les autres, qu'un moteur peut lire comme un gabarit dupliqué. Le
// remède n'est pas d'y ajouter du texte inventé : c'est d'écrire un article sur
// la commune, ce que le plan éditorial fait déjà commune par commune.

/** Les articles consacrés à cette commune, du plus récent au plus ancien. */
const articlesDeLaCommune = (nom) => articles.filter((a) => a.ville === nom)

const labelClass = 'mb-2 block font-mono text-[0.62rem] uppercase tracking-micro text-stone/50'

export default function AgenceCommune() {
  const { commune: slug } = useParams()
  const commune = communeParSlug(slug)

  useDocumentTitle(commune ? `Agence immobilière à ${commune.nom}` : 'Page introuvable')

  // Une commune hors secteur n'a pas de page : la route est ouverte sur un
  // paramètre libre, et tout slug inconnu doit rendre un 404 plutôt qu'un
  // gabarit vide au nom de n'importe quoi.
  if (!commune) return <NotFound />

  const lies = articlesDeLaCommune(commune.nom)

  return (
    <>
      <PageHeader
        eyebrow={`${agency.name} · ${commune.nom}`}
        title={`Agence immobilière à ${commune.nom}`}
        intro={presentationAgence(commune, {
          nom: agency.name,
          rue: agency.address.line1,
          communeSiege,
        })}
      />

      <Section tone="ink" py="pb-24 pt-4 sm:pb-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Coordonnées — les mêmes données que la page Contact, lues au même
              endroit : une agence dont le téléphone diffère d'une page à l'autre
              est une agence qu'on n'appelle pas. */}
          <div className="lg:col-span-5">
            <ul className="space-y-6">
              <li className="flex items-start gap-4">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-brass" strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <p className={labelClass}>Adresse</p>
                  <p className="text-stone">
                    {agency.address.line1}
                    <br />
                    {agency.address.line2}
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <Phone className="mt-1 h-5 w-5 shrink-0 text-brass" strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <p className={labelClass}>Téléphone</p>
                  <a href={agency.phoneHref} className="font-mono text-stone transition-colors hover:text-brass">
                    {agency.phone}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <Mail className="mt-1 h-5 w-5 shrink-0 text-brass" strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <p className={labelClass}>Email</p>
                  <a
                    href={`mailto:${agency.email}`}
                    className="font-mono text-stone transition-colors hover:text-brass"
                  >
                    {agency.email}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <Clock className="mt-1 h-5 w-5 shrink-0 text-brass" strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <p className={labelClass}>Horaires</p>
                  <dl className="mt-1 space-y-1">
                    {agency.hours.map(({ jour, horaire }) => (
                      <div key={jour} className="flex gap-3 text-stone">
                        <dt className="w-24 shrink-0">{jour}</dt>
                        <dd className="font-mono text-sm text-stone/80">{horaire}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </li>
            </ul>

            <p className="mt-10 font-mono text-[0.68rem] leading-relaxed text-stone/50">
              Carte professionnelle {agency.legal.carteProfessionnelle}, délivrée par{' '}
              {agency.legal.carteDelivreePar}.
            </p>
          </div>

          {/* Estimation + articles de la commune */}
          <div className="lg:col-span-7">
            <h2 className="font-display text-2xl text-stone">
              Estimation immobilière à {commune.nom}
            </h2>
            <p className="mt-4 text-[1.0625rem] leading-[1.75] text-stone/75">
              L’estimation en ligne s’appuie sur les relevés de prix du secteur, appliqués à
              l’adresse, à la surface et à l’état du logement.
            </p>
            <p className="mt-6">
              <Button to="/estimer" variant="primary">
                Estimation immobilière {commune.nom}
              </Button>
            </p>

            {/* La page n'existe QUE pour une commune sur laquelle un article a
                été publié (voir `communesAvecPage`) : cette liste ne peut pas
                être vide, et il n'y a donc pas de repli à prévoir. */}
            <h2 className="mt-16 font-display text-2xl text-stone">Nos articles sur {commune.nom}</h2>
            <ul className="mt-6 space-y-6">
              {lies.map((a) => (
                <li key={a.slug} className="border-t border-brass/20 pt-5">
                  <Link to={`/blog/${a.slug}`} className="group block">
                    <p className="font-mono text-[0.65rem] uppercase tracking-micro text-stone/50">
                      {dateLisible(a.datePublication)}
                    </p>
                    <p className="mt-1.5 font-display text-lg leading-snug text-stone transition-colors group-hover:text-brass">
                      {a.titre}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>

            <p className="mt-12 font-mono text-[0.68rem] uppercase tracking-micro text-stone/50">
              <Link to="/vendre" className="transition-colors hover:text-brass">
                Vendre
              </Link>
              {' · '}
              <Link to="/acheter" className="transition-colors hover:text-brass">
                Acheter
              </Link>
              {' · '}
              <Link to="/contact" className="transition-colors hover:text-brass">
                Contact
              </Link>
            </p>
          </div>
        </div>
      </Section>
    </>
  )
}
