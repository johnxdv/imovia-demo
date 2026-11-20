import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Seuls des noms de fichiers simples sont acceptés — pas de remontée d'arborescence. */
const ROUTE_NAME = /^[a-z0-9-]+$/

/**
 * Monte les fonctions du dossier `api/` sur le serveur de développement.
 *
 * En production, Vercel les sert lui-même ; en local, `vite` ne connaît que le
 * front, et l'outil d'estimation n'aurait aucun moteur à interroger. Le plugin
 * reproduit le strict nécessaire du contrat Vercel — `req.body` déjà décodé,
 * `res.status().json()` — et passe par `ssrLoadModule` pour que les
 * modifications des fonctions soient prises en compte sans redémarrage.
 *
 * `apply: 'serve'` : rien de tout ceci n'entre dans le bundle de production.
 */
function apiDevServer() {
  return {
    name: 'immovia:api-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()

        const name = new URL(req.url, 'http://localhost').pathname.slice('/api/'.length)
        if (!ROUTE_NAME.test(name)) return next()

        try {
          const module = await server.ssrLoadModule(`/api/${name}.js`)

          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          const raw = Buffer.concat(chunks).toString('utf8')
          req.body = raw ? JSON.parse(raw) : {}

          res.status = (code) => {
            res.statusCode = code
            return res
          }
          res.json = (payload) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(payload))
            return res
          }

          await module.default(req, res)
        } catch (error) {
          // Le front sait déjà se passer d'une réponse : on n'interrompt rien,
          // on trace côté serveur et on renvoie une erreur propre.
          server.config.logger.error(`[api-dev] /api/${name} — ${error?.message ?? error}`)
          if (!res.writableEnded) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ ok: false, error: 'Erreur locale.' }))
          }
        }
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiDevServer()],
  build: {
    // Le manifeste dit quel morceau JavaScript correspond à quelle page. Le
    // prérendu s'en sert pour poser un `modulepreload` sur le morceau de la
    // route servie : sans lui, React monterait, suspendrait sur un chargement
    // qui n'a pas encore commencé, et le visiteur verrait le prérendu
    // disparaître avant que la page n'arrive.
    manifest: true,
    rollupOptions: {
      output: {
        /**
         * Les bibliothèques partagées dans leurs propres morceaux.
         *
         * Elles ne changent qu'aux montées de version, là où le code du site
         * change à chaque déploiement : séparées, elles restent dans le cache
         * du visiteur d'une mise en ligne à l'autre. Mélangées au reste, le
         * moindre correctif de texte invalidait trois cents kilooctets de
         * React et de framer-motion.
         */
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  server: {
    host: true,
    // 5173 par défaut ; `PORT` permet de démarrer sur un port assigné quand
    // celui-ci est déjà pris par un autre serveur de développement.
    port: Number(process.env.PORT) || 5173,
  },
})
