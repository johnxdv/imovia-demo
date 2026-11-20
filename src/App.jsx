import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Navbar } from './components/layout/Navbar'
import { Footer } from './components/layout/Footer'
import { ScrollToTop } from './components/layout/ScrollToTop'
import { MetaRoute } from './components/layout/MetaRoute'

/**
 * Une page par morceau JavaScript, chargée à la demande.
 *
 * POURQUOI `Home` RESTE CHARGÉE D'EMBLÉE
 *
 * C'est la porte d'entrée du site et la page au plus gros visuel : la
 * suspendre, même brièvement, se verrait là où cela coûte le plus cher. Les
 * autres sont atteintes par un clic, pendant lequel leur morceau arrive.
 *
 * ET POURQUOI IL N'Y A PAS D'ÉCRAN D'ATTENTE
 *
 * Le repli de `Suspense` est `null`, délibérément. Un spinner serait un
 * élément que le site n'a jamais montré, et il apparaîtrait pour quelques
 * dizaines de millisecondes — le morceau de la page servie est préchargé par
 * le `modulepreload` que le prérendu pose dans le HTML, il est donc déjà en
 * vol quand React le réclame.
 */
import Home from './pages/Home'

const Estimer = lazy(() => import('./pages/Estimer'))
const Vendre = lazy(() => import('./pages/Vendre'))
const Acheter = lazy(() => import('./pages/Acheter'))
const Louer = lazy(() => import('./pages/Louer'))
const PropertyDetail = lazy(() => import('./pages/PropertyDetail'))
const Blog = lazy(() => import('./pages/Blog'))
const Article = lazy(() => import('./pages/Article'))
const AgenceCommune = lazy(() => import('./pages/AgenceCommune'))
const Equipe = lazy(() => import('./pages/Equipe'))
const Contact = lazy(() => import('./pages/Contact'))
const Recrutement = lazy(() => import('./pages/Recrutement'))
const EspaceVendeur = lazy(() => import('./pages/EspaceVendeur'))
const Favoris = lazy(() => import('./pages/Favoris'))
const MentionsLegales = lazy(() => import('./pages/MentionsLegales'))
const Confidentialite = lazy(() => import('./pages/Confidentialite'))
const PlanDuSite = lazy(() => import('./pages/PlanDuSite'))
const Auteur = lazy(() => import('./pages/Auteur'))
const Seo = lazy(() => import('./pages/Seo'))
const NotFound = lazy(() => import('./pages/NotFound'))

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <ScrollToTop />
      <MetaRoute />
      <Navbar />
      <main id="contenu" className="flex-1">
        <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/estimer" element={<Estimer />} />
          <Route path="/vendre" element={<Vendre />} />
          <Route path="/acheter" element={<Acheter />} />
          <Route path="/louer" element={<Louer />} />
          <Route path="/bien/:reference" element={<PropertyDetail />} />
          <Route path="/equipe" element={<Equipe />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/recrutement" element={<Recrutement />} />
          <Route path="/espace-vendeur" element={<EspaceVendeur />} />
          <Route path="/favoris" element={<Favoris />} />
          <Route path="/mentions-legales" element={<MentionsLegales />} />
          <Route path="/confidentialite" element={<Confidentialite />} />
          <Route path="/plan-du-site" element={<PlanDuSite />} />
          {/* Destination de la signature posée sous chaque article. */}
          <Route path="/auteur/lucas-bella" element={<Auteur />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<Article />} />
          {/* Une page par commune du secteur — la destination des ancres
              « agence immobilière {ville} » posées en conclusion d'article
              (voir `src/data/secteur.js`). Un slug hors secteur rend un 404. */}
          <Route path="/agence-immobiliere/:commune" element={<AgenceCommune />} />
          {/* Administration éditoriale — aucun lien n’y mène, nulle part.
              Voir l’avertissement en tête de `src/pages/Seo.jsx`. */}
          <Route path="/seo" element={<Seo />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
