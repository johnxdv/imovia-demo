import { PageHeader } from '../components/ui/PageHeader'
import { Section } from '../components/ui/Section'
import { Reveal, RevealGroup, RevealChild } from '../components/ui/Reveal'
import { Button } from '../components/ui/Button'
import { useDocumentTitle } from '../lib/useDocumentTitle'

// Parcours vendeur — véritable séquence chronologique : la numérotation
// 01→05 est ici justifiée.
const etapes = [
  {
    titre: 'Estimation',
    texte: 'Nous évaluons votre bien lors d’une visite sur place, afin d’établir un avis de valeur précis et cohérent avec le marché local.',
  },
  {
    titre: 'Stratégie',
    texte: 'Nous constituons votre dossier, puis nous mettons en place une stratégie étudiée et adaptée aux spécificités de votre bien.',
  },
  {
    titre: 'Diffusion',
    texte: 'Nous valorisons votre bien, activons notre fichier d’acquéreurs et assurons sa multidiffusion sur l’ensemble de nos supports.',
  },
  {
    titre: 'Sélection',
    texte: 'Nous qualifions les acquéreurs, vérifions leur capacité de financement et organisons les visites avant d’étudier chaque offre.',
  },
  {
    titre: 'Signature',
    texte: 'Nous qualifions les acquéreurs, organisons les visites et vérifions la solidité de leur financement avant de présenter l’offre.',
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
        eyebrowClassName="!text-sm sm:!text-base"
        title={
          <>
            Une stratégie étudiée, structurée,
            <br />
            et sur mesure
          </>
        }
        intro="De l’estimation à la signature définitive, nous vous accompagnons à chaque étape de votre projet de vente."
      />

      <Section tone="white" py="pb-24 pt-16 sm:pb-28">
        <RevealGroup className="grid grid-cols-1 gap-0">
          {etapes.map((e, i) => (
            <RevealChild key={e.titre}>
              <div className="grid grid-cols-1 gap-4 border-t border-ink/10 py-8 sm:grid-cols-12 sm:gap-8 sm:py-10">
                <div className="sm:col-span-2">
                  <span className="font-mono text-3xl text-ink/70 sm:text-4xl">{num(i)}</span>
                </div>
                <div className="sm:col-span-4">
                  <h2 className="text-display-md text-ink">{e.titre}</h2>
                </div>
                <div className="sm:col-span-6">
                  <p className="max-w-xl text-base leading-relaxed text-ink/70">{e.texte}</p>
                </div>
              </div>
            </RevealChild>
          ))}
        </RevealGroup>
      </Section>

      <Section tone="ink" py="py-20 sm:py-24">
        <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
          <Reveal>
            <h2 className="max-w-xl text-display-md text-stone">
              Commençons par une estimation juste.
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button to="/estimer" variant="primary" size="lg">
                Estimer mon bien
              </Button>
              <Button to="/contact" variant="outline" size="lg" className="text-stone">
                Nous contacter
              </Button>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  )
}
