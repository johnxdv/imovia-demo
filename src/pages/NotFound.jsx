import { Button } from '../components/ui/Button'
import { PlanDivider } from '../components/ui/PlanDivider'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('Page introuvable')
  return (
    <section className="flex min-h-screen items-center bg-ink text-stone">
      <div className="container-page py-32">
        <p className="eyebrow">Erreur 404</p>
        <h1 className="mt-6 max-w-2xl text-display-lg">Cette page n’existe pas.</h1>
        <p className="mt-6 max-w-md text-lg text-stone/70">
          Le lien est peut-être erroné, ou la page a été déplacée.
        </p>
        <div className="mt-10 max-w-xs">
          <PlanDivider />
        </div>
        <div className="mt-10">
          <Button to="/" variant="primary" size="lg">
            Retour à l’accueil
          </Button>
        </div>
      </div>
    </section>
  )
}
