import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Section } from '../components/ui/Section'
import { Button } from '../components/ui/Button'
import { PlanDivider } from '../components/ui/PlanDivider'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { articles, dateLisible } from '../lib/articles'
import { libelleCategorie } from '../lib/categories'

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  CETTE PAGE N'EST PROTÉGÉE PAR AUCUN MOT DE PASSE.                       ║
// ║                                                                          ║
// ║  Décision prise sciemment à la mise en place, pour ne pas retarder la     ║
// ║  livraison. Ce qu'elle implique, noir sur blanc :                         ║
// ║                                                                          ║
// ║  Toute personne qui devine l'adresse `/seo` peut publier un article sur   ║
// ║  le site du client, ou supprimer ceux qui y sont. Chaque action écrit     ║
// ║  dans le dépôt Git et déclenche un déploiement. Rien n'est verrouillé,    ║
// ║  rien n'est journalisé nominativement, rien ne demande confirmation à     ║
// ║  l'agence.                                                                ║
// ║                                                                          ║
// ║  LE VERROU EXISTE DÉJÀ, IL SUFFIT DE LE POSER :                          ║
// ║  déclarer `SEO_ADMIN_TOKEN` dans les variables d'environnement Vercel.    ║
// ║  Tant qu'elle est absente, `api/seo-articles.js` laisse tout passer ;     ║
// ║  dès qu'elle est renseignée, il exige ce jeton. Aucune ligne de code à    ║
// ║  écrire, aucun redéploiement à prévoir — la page demandera le jeton et    ║
// ║  le gardera pour la session.                                              ║
// ║                                                                          ║
// ║  À faire avant que ce site ne serve à autre chose qu'une démonstration.   ║
// ╚══════════════════════════════════════════════════════════════════════════╝

const champ =
  'w-full border border-white/15 bg-white/[0.03] px-4 py-3 text-base text-stone placeholder:text-stone/30 focus:border-brass focus:outline-none'

/** Jeton d'administration — saisi seulement si le serveur en réclame un. */
function useJeton() {
  const [jeton, setJeton] = useState(() => {
    try {
      return sessionStorage.getItem('seo-admin-token') ?? ''
    } catch {
      return ''
    }
  })

  const enregistre = (valeur) => {
    setJeton(valeur)
    try {
      sessionStorage.setItem('seo-admin-token', valeur)
    } catch {
      // Navigation privée, stockage refusé : le jeton vit alors le temps de la page.
    }
  }

  return [jeton, enregistre]
}

export default function Seo() {
  useDocumentTitle('Administration SEO')

  const [jeton, setJeton] = useJeton()
  const [etat, setEtat] = useState(null)
  const [enCours, setEnCours] = useState(false)
  const [aSupprimer, setASupprimer] = useState(null)
  const [brouillon, setBrouillon] = useState({ titre: '', contenu: '' })

  async function envoie(methode, corps) {
    setEnCours(true)
    setEtat(null)

    try {
      const reponse = await fetch('/api/seo-articles', {
        method: methode,
        headers: { 'Content-Type': 'application/json', ...(jeton ? { 'x-seo-token': jeton } : {}) },
        body: JSON.stringify(corps),
      })

      const data = await reponse.json().catch(() => ({}))

      if (!reponse.ok) {
        setEtat({ type: 'erreur', message: data?.error ?? `Erreur ${reponse.status}.` })
        return false
      }

      setEtat({
        type: 'ok',
        message:
          data?.message ??
          'Enregistré. Le déploiement prend une à deux minutes avant que le changement soit visible.',
      })
      return true
    } catch (error) {
      setEtat({ type: 'erreur', message: `Requête impossible — ${error.message}` })
      return false
    } finally {
      setEnCours(false)
    }
  }

  async function ajoute(e) {
    e.preventDefault()
    if (!brouillon.titre.trim() || !brouillon.contenu.trim()) {
      setEtat({ type: 'erreur', message: 'Titre et contenu sont tous les deux nécessaires.' })
      return
    }
    const ok = await envoie('POST', brouillon)
    if (ok) setBrouillon({ titre: '', contenu: '' })
  }

  return (
    <Section tone="ink" py="pb-24 pt-36 sm:pt-44">
      <div className="max-w-4xl">
        <p className="eyebrow">Administration</p>
        <h1 className="mt-6 text-display-md text-stone">Articles</h1>

        <div className="mt-6 border border-brass/30 bg-brass/[0.04] px-5 py-4">
          <p className="font-mono text-xs leading-relaxed text-stone/70">
            Page sans mot de passe, et sans lien depuis le site. Elle n’est pas référencée et
            n’apparaît dans aucun menu — mais quiconque connaît son adresse peut publier ou
            supprimer. Pour la verrouiller : déclarer <code className="text-brass">SEO_ADMIN_TOKEN</code>{' '}
            dans les variables d’environnement Vercel.
          </p>
        </div>

        {etat ? (
          <p
            className={`mt-6 border-l-2 py-2 pl-4 font-mono text-xs leading-relaxed ${
              etat.type === 'ok' ? 'border-brass text-stone/75' : 'border-red-400/60 text-red-300/90'
            }`}
          >
            {etat.message}
          </p>
        ) : null}

        {/* ── Articles publiés ──────────────────────────────────────────── */}
        <PlanDivider className="mt-14" label={`${articles.length} publié${articles.length > 1 ? 's' : ''}`} />

        {articles.length > 0 ? (
          <p className="mt-6 max-w-2xl font-mono text-xs leading-relaxed text-stone/45">
            Rotation : le prochain sujet évitera les catégories des deux derniers articles.
          </p>
        ) : null}

        {articles.length === 0 ? (
          <p className="mt-8 text-base text-stone/55">
            Aucun article publié. Le premier arrivera par le workflow, ou par le formulaire
            ci-dessous.
          </p>
        ) : (
          <ul className="mt-8">
            {articles.map((article) => (
              <li key={article.slug} className="border-t border-white/10 py-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-mono text-[0.7rem] uppercase tracking-micro text-brass">
                      {dateLisible(article.datePublication)} · {article.ville ?? '—'} ·{' '}
                      {article.meta?.genere === 'manuel' ? 'saisi à la main' : 'généré'}
                    </p>
                    {/* La catégorie est affichée ici et nulle part ailleurs :
                        elle sert à vérifier que la rotation tourne, ce qui
                        regarde l'agence, pas le lecteur. */}
                    <p className="mt-1 font-mono text-[0.68rem] text-stone/40">
                      {libelleCategorie(article.categorie)}
                    </p>
                    <h2 className="mt-2 font-display text-xl text-stone">{article.titre}</h2>
                    <p className="mt-2 max-w-xl font-mono text-xs leading-relaxed text-stone/45">
                      {article.sujet ?? article.resume}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <Button to={`/blog/${article.slug}`} variant="outline" size="sm" className="text-stone">
                      Voir
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-300/80 hover:text-red-300"
                      onClick={() => setASupprimer(article.slug)}
                      disabled={enCours}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>

                {/* Confirmation — la suppression écrit dans le dépôt, elle ne se
                    déclenche pas sur un clic isolé. */}
                {aSupprimer === article.slug ? (
                  <div className="mt-5 border border-red-400/30 bg-red-400/[0.04] px-5 py-4">
                    <p className="font-mono text-xs leading-relaxed text-stone/75">
                      Supprimer « {article.titre} » ? Le fichier est retiré du dépôt et la page
                      disparaît au prochain déploiement.
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={enCours}
                        onClick={async () => {
                          await envoie('DELETE', { slug: article.slug })
                          setASupprimer(null)
                        }}
                      >
                        {enCours ? 'Suppression…' : 'Confirmer'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-stone/60"
                        onClick={() => setASupprimer(null)}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {/* ── Ajout manuel ─────────────────────────────────────────────── */}
        <PlanDivider className="mt-16" label="Ajout manuel" />

        <p className="mt-8 max-w-2xl text-base leading-relaxed text-stone/70">
          Dépannage : un titre, un texte brut. Les paragraphes sont séparés par une ligne vide ;
          une ligne seule se terminant par un point d’interrogation devient un sous-titre. Pas
          d’éditeur riche, pas de FAQ — un article saisi ici ne porte donc pas de balisage{' '}
          <code className="font-mono text-brass">FAQPage</code>.
        </p>

        <form onSubmit={ajoute} className="mt-8 max-w-2xl space-y-5">
          <div>
            <label htmlFor="titre" className="eyebrow mb-3 block">
              Titre
            </label>
            <input
              id="titre"
              type="text"
              className={champ}
              value={brouillon.titre}
              onChange={(e) => setBrouillon({ ...brouillon, titre: e.target.value })}
              placeholder="Prix au m² à Forbach : ce que montrent les quartiers"
            />
          </div>

          <div>
            <label htmlFor="contenu" className="eyebrow mb-3 block">
              Contenu
            </label>
            <textarea
              id="contenu"
              rows={14}
              className={`${champ} font-mono text-sm`}
              value={brouillon.contenu}
              onChange={(e) => setBrouillon({ ...brouillon, contenu: e.target.value })}
              placeholder={'Première ligne : le résumé de l’article.\n\nUn sous-titre en question ?\n\nLe paragraphe qui y répond.'}
            />
          </div>

          <Button variant="primary" disabled={enCours}>
            {enCours ? 'Publication…' : 'Publier'}
          </Button>
        </form>

        {/* ── Jeton, si le serveur en réclame un ───────────────────────── */}
        <PlanDivider className="mt-16" label="Jeton" />
        <div className="mt-8 max-w-2xl">
          <label htmlFor="jeton" className="eyebrow mb-3 block">
            Jeton d’administration
          </label>
          <input
            id="jeton"
            type="password"
            className={champ}
            value={jeton}
            onChange={(e) => setJeton(e.target.value)}
            placeholder="Inutile tant que SEO_ADMIN_TOKEN n’est pas déclarée"
            autoComplete="off"
          />
          <p className="mt-3 font-mono text-xs leading-relaxed text-stone/40">
            Conservé pour la session de navigation seulement, jamais envoyé ailleurs qu’à{' '}
            <code>/api/seo-articles</code>.
          </p>
        </div>

        {/* ── Performances ─────────────────────────────────────────────── */}
        <PlanDivider className="mt-16" label="Performances" />
        <p className="mt-8 max-w-2xl text-base leading-relaxed text-stone/70">
          Aucune donnée de fréquentation n’est disponible : le site n’embarque aucun outil de
          mesure — ni Google Analytics, ni alternative. Rien n’est affiché ici plutôt que d’y
          mettre des chiffres qui ne mesureraient rien.
        </p>
        <p className="mt-4 max-w-2xl font-mono text-xs leading-relaxed text-stone/40">
          Le jour où une mesure est posée, c’est ici qu’elle s’affichera, par article.
        </p>

        <p className="mt-16 font-mono text-xs text-stone/35">
          <Link to="/blog" className="transition-colors hover:text-brass">
            Voir le blog tel que les visiteurs le voient
          </Link>
        </p>
      </div>
    </Section>
  )
}
