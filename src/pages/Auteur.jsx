import { Link } from 'react-router-dom'

import { PageHeader } from '../components/ui/PageHeader'
import { Section } from '../components/ui/Section'
import { PhotoLocale } from '../components/ui/PhotoLocale'
import { agency } from '../data/agency'
import { auteur } from '../data/auteur'
import { articles, dateLisible } from '../lib/articles'

/**
 * Page auteur — la destination de la signature posée sous chaque article.
 *
 * Elle existe pour une raison précise : un article signé d'un nom qui ne mène
 * nulle part n'apporte rien de plus qu'un article signé de l'agence. La page
 * rattache le nom à une personne joignable, à une fonction, et à l'ensemble
 * de ce qu'elle a publié.
 *
 * ELLE EST COURTE PARCE QUE LE SITE EST AVARE. Nom, fonction, téléphone,
 * portrait, direction de la publication : c'est tout ce que ce projet sait de
 * Lucas Bella, et il n'est pas question d'en inventer le reste (voir
 * `src/data/auteur.js`).
 */
export default function Auteur() {
  const signes = articles

  return (
    <>
      <PageHeader
        eyebrow="Auteur"
        title={auteur.nom}
        intro={`${auteur.role} chez ${agency.name}. Il signe les articles publiés sur ce site.`}
      />

      <Section tone="ink" py="pb-24 pt-4 sm:pb-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <div className="relative aspect-[3/4] overflow-hidden bg-ink">
              <PhotoLocale
                photo={auteur.photo}
                sizes="(min-width:1024px) 30vw, 92vw"
                alt={auteur.nomAffiche}
                width={700}
                height={916}
                loading="eager"
                className="h-full w-full object-cover grayscale"
              />
            </div>

            <p className="mb-2 mt-8 block font-mono text-[0.62rem] uppercase tracking-micro text-stone/50">
              Fonction
            </p>
            <p className="text-stone">{auteur.role}</p>

            <p className="mb-2 mt-6 block font-mono text-[0.62rem] uppercase tracking-micro text-stone/50">
              Téléphone
            </p>
            <a href={`tel:${auteur.telephone.replace(/\s/g, '')}`} className="font-mono text-stone">
              {auteur.telephone}
            </a>

            {auteur.directeurPublication ? (
              <p className="mt-8 font-mono text-[0.68rem] leading-relaxed text-stone/50">
                Directeur de la publication de ce site.
              </p>
            ) : null}

            <p className="mt-2 font-mono text-[0.68rem] leading-relaxed text-stone/50">
              {agency.name} — carte professionnelle {agency.legal.carteProfessionnelle}, délivrée
              par {agency.legal.carteDelivreePar}.
            </p>
          </div>

          <div className="lg:col-span-8">
            <h2 className="font-display text-2xl text-stone">
              {signes.length} article{signes.length > 1 ? 's' : ''} publié
              {signes.length > 1 ? 's' : ''}
            </h2>

            <ul className="mt-6">
              {signes.map((a) => (
                <li key={a.slug} className="border-t border-brass/20 py-5">
                  <Link to={`/blog/${a.slug}`} className="group block">
                    <p className="font-mono text-[0.65rem] uppercase tracking-micro text-stone/50">
                      {[dateLisible(a.datePublication), a.ville].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-1.5 font-display text-lg leading-snug text-stone">{a.titre}</p>
                  </Link>
                </li>
              ))}
            </ul>

            <p className="mt-12 font-mono text-[0.68rem] uppercase tracking-micro text-stone/50">
              <Link to="/equipe">L’équipe</Link> · <Link to="/contact">Contact</Link>
            </p>
          </div>
        </div>
      </Section>
    </>
  )
}
