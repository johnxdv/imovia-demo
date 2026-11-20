import { useEffect, useState } from 'react'

/**
 * Faut-il charger la vidéo d'ambiance, ou se contenter de son poster ?
 *
 * DEUX REFUS, POUR DEUX RAISONS DIFFÉRENTES
 *
 * L'économie de données est une demande explicite du visiteur : le navigateur
 * la transmet dans `navigator.connection.saveData`, et lui servir un fichier
 * d'un mégaoctet et demi malgré cela, pour un décor, serait passer outre.
 *
 * Le petit écran est une question de coût : la boucle est un fond, posé
 * derrière un voile Ink et deux dégradés, et personne ne vient sur un
 * téléphone pour la regarder. Le poster rend exactement la même image fixe
 * pour un vingtième du poids.
 *
 * LE RENDU SUR ORDINATEUR NE CHANGE PAS. Le seuil est celui de `lg` dans
 * Tailwind : au-delà, la vidéo se charge comme avant.
 *
 * `false` au premier rendu, puis la vraie valeur : rien ne doit partir sur le
 * réseau avant qu'on sache si on en a le droit. Le serveur et le premier
 * affichage montrent donc le poster, et la vidéo n'arrive qu'ensuite, là où
 * elle est permise — ce qui est aussi ce qu'on veut pour le premier rendu.
 */
export function useVideoAllegee() {
  const [charge, setCharge] = useState(false)

  useEffect(() => {
    const autorise = () => {
      const connexion = navigator.connection ?? navigator.mozConnection ?? navigator.webkitConnection
      if (connexion?.saveData) return false
      return window.matchMedia('(min-width: 1024px)').matches
    }

    const applique = () => setCharge(autorise())
    applique()

    const mq = window.matchMedia('(min-width: 1024px)')
    mq.addEventListener('change', applique)
    return () => mq.removeEventListener('change', applique)
  }, [])

  return charge
}
