"use client";

/* ═══════════════════════════════════════════════════════════════════════════════════════
   LE BANDEAU D'ANNONCE

   Steven, le 2026-09-04 : « Je veux que tu rajoutes un bandeau fin sous le header qui
   defile avec ecrit : [...] A l'avenir on verra comment optimiser les annonces events mais
   pour le moment ca fera le taf. Apres l'event tu enleveras le bandeau. »

   ═══ IL S'ENLEVE TOUT SEUL, ET C'EST LE POINT ═══

   « Apres l'event tu enleveras le bandeau » suppose que quelqu'un s'en souvienne le
   dimanche soir. Un bandeau qui annonce un evenement termine est pire que pas de bandeau :
   il dit au visiteur que le site n'est pas tenu.

   Il porte donc sa date de fin. Passe le 6 septembre 2026 a 18h15, il ne rend plus rien, et
   il n'y a rien a penser a faire. Le texte et la date vivent au meme endroit pour que la
   prochaine annonce se fasse en changeant deux constantes.

   ═══ LE DECALAGE SERVEUR / CLIENT, ASSUME ═══

   Ce composant lit l'heure au rendu. Sur une page pre-generee, le HTML du serveur date de
   la construction : apres l'echeance, le bandeau peut donc etre present dans le HTML servi
   et retire a l'hydratation. La fenetre est bornee a une journee - le cron du depot pousse
   un commit quotidien, donc Vercel reconstruit chaque jour - et le sens est le bon : le
   visiteur ne voit jamais une annonce perimee plus d'un instant.

   L'alternative etait un effet qui mette le bandeau APRES l'hydratation, ce qui fait
   clignoter l'annonce a l'arrivee sur toutes les pages, tous les jours, pour resoudre un
   probleme qui n'existe qu'une fois.

   ═══ L'ANIMATION ═══

   Le defilement s'arrete pour qui a demande moins d'animations a son systeme
   (`prefers-reduced-motion`), et le texte passe alors sur deux lignes plutot que d'etre
   tronque. Un bandeau qu'on ne peut pas lire en entier n'annonce rien.
   ═══════════════════════════════════════════════════════════════════════════════════════ */

/** Le texte de l'annonce, tel que Steven l'a ecrit. */
const ANNONCE =
  "Prochain événement Strasbourg 05 et 06/09 - 09h45 à 18h15 - Go Fest 2026 Méga-Finale. "
  + "Inscrivez-vous sur Campfire pour des récompenses exclusives Ambassadeur !";

/**
 * La fin de l'evenement, heure de Paris (UTC+2 en septembre).
 *
 * Ecrite avec son decalage explicite et non en heure locale du serveur : Vercel construit en
 * UTC, et « 18h15 » sans decalage y serait deux heures trop tot.
 */
const FIN = Date.parse("2026-09-06T18:15:00+02:00");

export default function BandeauEvenement() {
  /* eslint-disable-next-line react-hooks/purity -- Volontaire, et le seul endroit du depot
     ou cette regle est levee. Elle met en garde contre un resultat instable d'un rendu a
     l'autre; ici la valeur ne bascule qu'UNE fois, a l'echeance de l'evenement, et basculer
     a ce moment-la est exactement ce qu'on demande. Les alternatives sont pires : un etat
     pose dans un effet fait clignoter l'annonce a chaque arrivee sur chaque page, et une
     date figee a la construction retiendrait le bandeau apres l'evenement. */
  if (Date.now() > FIN) return null;

  return (
    <div className="bandeau-evenement" role="status">
      <div className="bandeau-piste">
        <span className="bandeau-texte">{ANNONCE}</span>
        {/* ═══ POURQUOI QUATRE COPIES ET NON UNE ═══

            Steven, sur PC : « le bandeau ne loop pas, il se duplique deux fois mais apres
            il y a du vide jusqu'a ce que tout ait disparu. »

            Deux copies suffisent tant que l'ecran est plus etroit qu'UNE copie. Mesure :
            une copie fait 996px, la piste en faisait 1991. Pour que la boucle soit
            continue il faut que la piste mesure au moins la largeur de l'ecran PLUS une
            copie - sinon, au moment ou l'animation revient a son point de depart, la fin
            de la piste est deja passee et il reste du vide a droite. A 1440px il manquait
            445px, a 2560px il en manquait 1565.

            Avec cinq copies au total et un `min-width` de 50vw sur chacune, l'invariant
            tient a toute largeur et pour n'importe quelle longueur de texte : la piste
            mesure au moins 250 % de l'ecran, donc toujours plus que l'ecran plus une copie.

            Les copies sont masquees aux lecteurs d'ecran, qui liraient sinon l'annonce
            cinq fois de suite. */}
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className="bandeau-texte" aria-hidden="true">{ANNONCE}</span>
        ))}
      </div>
    </div>
  );
}
