import { PageHeader } from '../components/ui/PageHeader'
import { Section } from '../components/ui/Section'
import { Reveal, RevealGroup, RevealChild } from '../components/ui/Reveal'
import { Button } from '../components/ui/Button'
import { useDocumentTitle } from '../lib/useDocumentTitle'

// Parcours vendeur — véritable séquence chronologique : la numérotation
// 01→06 est ici justifiée.
const etapes = [
  {
    titre: 'Estimation',
    texte: 'Nous évaluons votre bien à partir de ventes comparables et d’une visite sur place. Un prix argumenté, pas une fourchette de complaisance.',
  },
  {
    titre: 'Préparation',
    texte: 'Nous constituons le dossier : diagnostics, reportage photo, descriptif. Le bien est présenté sous son meilleur jour, sans artifice.',
  },
  {
    titre: 'Diffusion',
    texte: 'Nous activons notre fichier d’acquéreurs qualifiés, puis diffusons sur les canaux pertinents. La confidentialité reste possible sur demande.',
  },
  {
    titre: 'Visites',
    texte: 'Nous organisons et menons les visites nous-mêmes, puis vous transmettons un retour précis après chacune d’elles.',
  },
  {
    titre: 'Négociation',
    texte: 'Nous portons la négociation et vérifions la solidité de chaque offre — financement compris — avant de vous la présenter.',
  },
  {
    titre: 'Signature',
    texte: 'Nous vous accompagnons du compromis à l’acte authentique chez le notaire, et restons votre interlocuteur jusqu’au bout.',
  },
]

function num(i) {
  return String(i + 1).padStart(2, '0')
}

export default function Vendre() {
  useDocumentTitle('Vendre')
  return (
    <>
      <PageHeader
        eyebrow="Vendre"
        title="Vendre avec méthode, du premier avis à la signature."
        intro="Notre accompagnement vendeur suit un fil clair. Vous savez à chaque instant où vous en êtes, et ce qui vient ensuite."
      />

      <Section tone="ink" py="pb-24 pt-16 sm:pb-28">
        <RevealGroup className="grid grid-cols-1 gap-0">
          {etapes.map((e, i) => (
            <RevealChild key={e.titre}>
              <div className="grid grid-cols-1 gap-4 border-t border-white/10 py-8 sm:grid-cols-12 sm:gap-8 sm:py-10">
                <div className="sm:col-span-2">
                  <span className="font-mono text-3xl text-brass sm:text-4xl">{num(i)}</span>
                </div>
                <div className="sm:col-span-4">
                  <h2 className="text-display-md text-stone">{e.titre}</h2>
                </div>
                <div className="sm:col-span-6">
                  <p className="max-w-xl text-base leading-relaxed text-stone/75">{e.texte}</p>
                </div>
              </div>
            </RevealChild>
          ))}
        </RevealGroup>
      </Section>

      <Section tone="stone" py="py-20 sm:py-24">
        <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
          <Reveal>
            <h2 className="max-w-xl text-display-md text-ink">
              Commençons par une estimation juste.
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button to="/estimer" variant="solidDark" size="lg">
                Estimer mon bien
              </Button>
              <Button to="/contact" variant="outline" size="lg" className="text-ink">
                Nous contacter
              </Button>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  )
}
