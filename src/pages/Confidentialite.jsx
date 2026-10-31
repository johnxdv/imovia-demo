import { LegalPage } from '../components/ui/LegalPage'
import { agency } from '../data/agency'

/**
 * Politique de confidentialité.
 *
 * CE QUI EST AFFIRMÉ ICI A ÉTÉ VÉRIFIÉ DANS LE CODE, pas supposé. Les
 * destinataires énumérés sont les services réellement appelés — Resend pour
 * l'acheminement des messages (`api/lead.js`, `api/contact-conseiller.js`),
 * Vercel pour l'hébergement, et les API publiques que le parcours d'estimation
 * interroge depuis le navigateur du visiteur. Aucun CRM ni logiciel immobilier
 * ne reçoit les demandes : le flux Modelo est à sens unique, du logiciel vers
 * le site, et rien n'y remonte.
 *
 * DEUX POINTS RESTENT À CONFIRMER PAR L'AGENCE, et sont écrits ici au
 * conditionnel plutôt qu'affirmés : les garanties contractuelles encadrant les
 * transferts hors EEE (Resend, Vercel, Google Fonts, Unsplash sont américains),
 * et les durées de conservation effectivement appliquées dans les boîtes aux
 * lettres de l'agence — le site, lui, ne stocke rien.
 */
export default function Confidentialite() {
  const { legal } = agency
  const siege = `${legal.siegeSocial.line1}, ${legal.siegeSocial.line2}`

  return (
    <LegalPage
      title="Politique de confidentialité"
      intro="La manière dont nous traitons vos données lorsque vous utilisez ce site, et les droits dont vous disposez."
      sections={[
        {
          titre: 'Objet',
          corps: [
            `${agency.name} attache une attention particulière au respect de la vie privée de ses visiteurs. Cette politique explique quelles données personnelles sont collectées, pourquoi, sur quelle base juridique, combien de temps elles sont conservées et comment faire valoir vos droits. Elle peut être mise à jour pour rester conforme à la réglementation en vigueur.`,
          ],
        },
        {
          titre: 'Responsable du traitement',
          corps: [
            `Le responsable du traitement est ${agency.name}, ${legal.formeJuridique} au capital de ${legal.capital}, SIRET ${legal.siret}, dont le siège social est situé ${siege}, représentée par son dirigeant ${legal.directeurPublication}.`,
            `Pour toute question relative à vos données personnelles ou pour exercer vos droits : ${agency.email} — ${agency.phone}.`,
            `En cas de litige non résolu directement avec nous, vous pouvez saisir gratuitement le médiateur de la consommation ${legal.mediation.nom} (${legal.mediation.adresse} — ${legal.mediation.site} — ${legal.mediation.email}).`,
          ],
        },
        {
          titre: 'Données collectées',
          corps: [
            'Nous ne collectons que les données que vous nous transmettez volontairement via nos formulaires (Contact, Estimation, Recrutement, contact direct d’un conseiller). Selon le formulaire utilisé, il peut s’agir des informations suivantes :',
            {
              liste: [
                'Nom et prénom.',
                'Numéro de téléphone.',
                'Adresse e-mail.',
                'Adresse du bien immobilier, commune et code postal.',
                'Type de bien, surface, nombre de pièces, caractéristiques et état général.',
                'Informations concernant votre projet de vente ou d’achat.',
                'Réponses communiquées dans le chat interactif d’estimation.',
                'Contenu libre de votre message, et pour une candidature, les éléments que vous choisissez d’y joindre.',
                'Données techniques nécessaires au fonctionnement et à la sécurité du service, lorsqu’elles sont effectivement collectées — notamment les journaux techniques de nos hébergeurs et prestataires.',
              ],
            },
            'Seules les données nécessaires aux finalités annoncées sont collectées. Les champs obligatoires sont signalés comme tels dans les formulaires ; tout le reste est facultatif.',
            'Vos biens favoris sont enregistrés uniquement dans le stockage local de votre navigateur. Ils ne nous sont jamais transmis et ne quittent pas votre appareil.',
          ],
        },
        {
          titre: 'Estimation immobilière en ligne',
          corps: [
            'Lorsque vous utilisez notre outil d’estimation immobilière, les informations relatives à votre bien sont utilisées afin de réaliser une première étude indicative de sa valeur.',
            `Les coordonnées que vous communiquez permettent à ${agency.name} de vous transmettre les résultats de votre demande et de vous recontacter afin de finaliser votre étude, préciser les caractéristiques de votre bien et vous présenter les solutions adaptées à votre projet immobilier.`,
            `Les informations saisies dans le formulaire et le chat peuvent être transmises aux conseillers habilités d’${agency.name} chargés du traitement de votre demande.`,
            'La communication de certaines coordonnées peut être nécessaire pour bénéficier du service d’estimation accompagné que nous proposons. Les champs obligatoires sont clairement identifiés.',
            'Une demande d’estimation ne constitue pas une autorisation générale à recevoir des communications commerciales sans rapport avec cette demande.',
            'Le résultat affiché est une estimation indicative, établie à partir de données publiques et de nos propres relevés de marché. Il ne constitue ni une expertise, ni un avis de valeur au sens réglementaire, ni un engagement sur un prix de vente.',
          ],
        },
        {
          titre: 'Finalités et bases légales',
          corps: [
            'Chaque traitement repose sur une base juridique distincte :',
            {
              liste: [
                'Traitement des demandes de contact et d’estimation — exécution de mesures précontractuelles prises à votre demande, lorsque cette base est applicable.',
                'Rappel téléphonique directement lié à une demande d’estimation — même base légale, le rappel étant nécessaire au service que vous avez demandé.',
                'Suivi commercial distinct de votre demande initiale — intérêt légitime à développer notre activité lorsque les conditions légales en sont réunies, ou votre consentement lorsque celui-ci est requis.',
                'Envoi de prospection commerciale par e-mail ou SMS — votre consentement préalable lorsque la réglementation l’exige.',
                'Traitement des candidatures reçues via la page Recrutement — exécution de mesures précontractuelles prises à votre demande.',
                'Sécurité et bon fonctionnement technique du site — intérêt légitime à protéger le service et à en assurer la disponibilité.',
                'Respect de nos obligations légales, notamment en matière de lutte contre le blanchiment et de conservation des pièces contractuelles — obligation légale, lorsque celle-ci s’applique.',
              ],
            },
            'La base légale applicable dépend du traitement effectivement réalisé et de votre situation. Certaines de ces qualifications peuvent devoir être confirmées au cas par cas ; elles sont indiquées ici en l’état de notre analyse et non comme une certitude juridique définitive.',
          ],
        },
        {
          titre: 'Durée de conservation',
          corps: [
            'Vos données ne sont pas conservées indéfiniment. Les durées suivantes s’appliquent :',
            {
              liste: [
                'Prospects n’ayant pas conclu de transaction — trois ans au maximum à compter de votre dernier contact actif (demande, réponse à un message, clic sur un lien), sous réserve de justification d’une conservation plus courte ou plus longue.',
                'Clients ayant conclu une transaction — pendant toute la durée de la relation contractuelle, puis selon les délais de prescription et les obligations légales de conservation applicables aux pièces du dossier.',
                'Candidatures non retenues — deux ans au maximum à compter du dernier échange, sauf si vous demandez leur suppression plus tôt.',
                'Données reposant sur votre consentement — jusqu’au retrait de celui-ci.',
                'Journaux techniques de sécurité — durée courte, limitée à ce qui est nécessaire à la détection et à l’analyse des incidents.',
              ],
            },
            'À l’expiration de ces délais, les données sont supprimées ou anonymisées, sauf lorsqu’une conservation est légalement justifiée. Le site lui-même ne constitue aucune base de données de prospects : les demandes vous concernant sont acheminées par e-mail et conservées dans les messageries de l’agence, auxquelles ces durées s’appliquent.',
          ],
        },
        {
          titre: 'Destinataires et sous-traitants',
          corps: [
            'Vos données ne sont ni vendues, ni cédées, ni louées à des tiers. Elles peuvent être accessibles :',
            {
              liste: [
                `Aux collaborateurs et conseillers habilités d’${agency.name}, chargés du traitement de votre demande, et au conseiller que vous contactez directement le cas échéant.`,
                'À Resend, qui assure l’acheminement de nos e-mails transactionnels — c’est par lui que transitent les messages des formulaires et des demandes d’estimation.',
                'À Vercel Inc., qui héberge le site et exécute les fonctions serveur qui reçoivent les formulaires.',
              ],
            },
            'Ces prestataires n’accèdent à vos données que dans la stricte mesure nécessaire à l’exécution de leur prestation. À ce jour, aucun logiciel de gestion commerciale ou CRM ne reçoit automatiquement les demandes émises depuis ce site : le logiciel immobilier de l’agence alimente le site en annonces, et aucune donnée de visiteur ne lui est transmise en retour.',
            'Par ailleurs, l’affichage de certaines pages fait appel à des services tiers qui reçoivent, de ce fait, votre adresse IP : Google Fonts pour les polices de caractères, et les plateformes d’images utilisées pour les photographies des annonces et des illustrations.',
            'Le parcours d’estimation interroge en outre des services cartographiques et de données publiques pour localiser le bien et en décrire l’environnement : la Base Adresse Nationale, les services de l’IGN, la Base de Données Nationale des Bâtiments, Géorisques et OpenStreetMap. L’adresse que vous saisissez et votre adresse IP sont transmises à ces services au moment de la recherche.',
          ],
        },
        {
          titre: 'Transferts hors de l’Union européenne',
          corps: [
            'Certains de nos prestataires sont établis aux États-Unis ou y opèrent une partie de leur infrastructure — c’est notamment le cas de Resend, de Vercel et des services de polices et d’images mentionnés ci-dessus. Vos données sont donc susceptibles d’être transférées en dehors de l’Espace économique européen.',
            'Ces transferts doivent être encadrés par les garanties prévues par le Règlement Général sur la Protection des Données, telles que les clauses contractuelles types de la Commission européenne ou l’adhésion du prestataire à un cadre de protection reconnu adéquat. Les garanties applicables à chaque prestataire peuvent vous être communiquées sur demande écrite.',
          ],
        },
        {
          titre: 'Vos droits',
          corps: [
            'Conformément au Règlement Général sur la Protection des Données et à la loi Informatique et Libertés, vous disposez des droits suivants :',
            {
              liste: [
                'Droit d’accès à vos données et d’obtention d’une copie.',
                'Droit de rectification des données inexactes ou incomplètes.',
                'Droit à l’effacement de vos données, dans les conditions prévues par la réglementation.',
                'Droit à la limitation du traitement.',
                'Droit d’opposition au traitement, pour des raisons tenant à votre situation particulière.',
                'Droit à la portabilité de vos données, lorsque ce droit est applicable.',
                'Droit de retirer votre consentement à tout moment, lorsqu’un traitement repose sur celui-ci — ce retrait ne remet pas en cause la licéité du traitement effectué avant.',
                'Droit de vous opposer à tout moment et sans motif à la prospection commerciale.',
                'Droit de définir des directives relatives au sort de vos données après votre décès.',
              ],
            },
            `Ces droits s’exercent à tout moment en nous écrivant à ${agency.email}, ou par courrier au siège social indiqué ci-dessus. Une preuve d’identité pourra vous être demandée en cas de doute raisonnable sur l’identité du demandeur.`,
            'Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la Commission Nationale de l’Informatique et des Libertés (CNIL) — www.cnil.fr.',
          ],
        },
        {
          titre: 'Cookies et mesure d’audience',
          corps: [
            'Ce site ne dépose aucun cookie publicitaire ni aucun outil de mesure d’audience à ce jour. Un stockage local technique (et non un cookie) est utilisé pour mémoriser vos favoris sur cet appareil ; il ne nous est jamais transmis.',
            'Les polices de caractères sont chargées depuis les serveurs de Google Fonts, ce qui implique une requête technique vers ce service lors de l’affichage des pages.',
          ],
        },
        {
          titre: 'Sécurité',
          corps: [
            'Nous mettons en œuvre les mesures techniques et organisationnelles appropriées pour protéger vos données : chiffrement des communications avec le site, accès limité aux seuls conseillers habilités, et recours à des prestataires présentant des garanties suffisantes. Aucune transmission sur internet ne pouvant être garantie absolument sûre, nous vous invitons à ne pas nous communiquer d’informations sensibles via les formulaires du site.',
          ],
        },
        {
          titre: 'Contact',
          corps: [`Pour toute question relative à vos données : ${agency.email} — ${agency.phone}.`],
        },
      ]}
    />
  )
}
