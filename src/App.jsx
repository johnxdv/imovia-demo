import { Routes, Route } from 'react-router-dom'
import { Navbar } from './components/layout/Navbar'
import { Footer } from './components/layout/Footer'
import { ScrollToTop } from './components/layout/ScrollToTop'

import Home from './pages/Home'
import Estimer from './pages/Estimer'
import Vendre from './pages/Vendre'
import Acheter from './pages/Acheter'
import Louer from './pages/Louer'
import PropertyDetail from './pages/PropertyDetail'
import Equipe from './pages/Equipe'
import Contact from './pages/Contact'
import Recrutement from './pages/Recrutement'
import EspaceVendeur from './pages/EspaceVendeur'
import Favoris from './pages/Favoris'
import MentionsLegales from './pages/MentionsLegales'
import Confidentialite from './pages/Confidentialite'
import PlanDuSite from './pages/PlanDuSite'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <ScrollToTop />
      <Navbar />
      <main id="contenu" className="flex-1">
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
