"use client";

import { useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════════════════════════════
   EMPECHER LE ZOOM ACCIDENTEL SUR TELEPHONE

   Steven, deux fois, la seconde apres que je lui aie explique la limite :
   « Faut vraiment empecher le zoom sur mobile ca fait plein de mauvaises manips
   involontaires et derange tout. »

   ═══ POURQUOI LA BALISE VIEWPORT NE SUFFIT PAS ═══

   `user-scalable=no` et `maximum-scale=1` sont IGNORES par iOS Safari depuis iOS 10. Ils
   sont quand meme declares (dans app/layout.tsx) parce qu'Android Chrome les respecte, mais
   sur l'iPhone de Steven ils ne font rien du tout. C'est pour ca que ma premiere reponse
   avait laisse le pinch en place : la balise seule etait la seule piste que j'avais
   envisagee, et elle etait fausse.

   ═══ CE QUI MARCHE REELLEMENT SUR IOS ═══

   WebKit emet des evenements `gesturestart` / `gesturechange` / `gestureend` pour les
   gestes a deux doigts, et ceux-la sont annulables. Les annuler empeche le pinch du
   NAVIGATEUR sans toucher au defilement a un doigt.

   On y ajoute le double-tap : `touch-action: manipulation` (app/globals.css) le couvre
   deja, mais Safari conserve un zoom au double-tap dans certains cas, et deux `touchend`
   rapproches de moins de 300px et 300ms se reconnaissent sans ambiguite.

   Les ecouteurs sont poses avec `passive: false`, sans quoi `preventDefault` est ignore et
   ce composant serait un placebo.

   ═══ LE COMPROMIS, ECRIT UNE FOIS ═══

   Le zoom sert aussi a lire quand on voit mal. Le site tient donc ses planchers de
   lisibilite ailleurs - 12px minimum sur tout texte, verifie par check:mobile aux quatre
   profils - parce qu'a partir du moment ou on retire le zoom, ces planchers ne sont plus
   une bonne pratique mais la seule chose qui reste. Decision de Steven, prise deux fois.
   ═══════════════════════════════════════════════════════════════════════════════════════ */

/** Deux tapes plus rapprochees que ca, et c'est un double-tap, pas deux clics. */
const DELAI_DOUBLE_TAP_MS = 300;

export default function SansZoom() {
  useEffect(() => {
    const bloquer = (e: Event) => e.preventDefault();

    // Le pinch du navigateur, cote WebKit.
    for (const nom of ["gesturestart", "gesturechange", "gestureend"]) {
      document.addEventListener(nom, bloquer, { passive: false });
    }

    // Le pinch la ou les evenements gesture n'existent pas : deux doigts sur l'ecran.
    const surTouche = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("touchstart", surTouche, { passive: false });
    document.addEventListener("touchmove", surTouche, { passive: false });

    // Le double-tap.
    let derniere = 0;
    const surFin = (e: TouchEvent) => {
      const maintenant = Date.now();
      if (maintenant - derniere <= DELAI_DOUBLE_TAP_MS) e.preventDefault();
      derniere = maintenant;
    };
    document.addEventListener("touchend", surFin, { passive: false });

    return () => {
      for (const nom of ["gesturestart", "gesturechange", "gestureend"]) {
        document.removeEventListener(nom, bloquer);
      }
      document.removeEventListener("touchstart", surTouche);
      document.removeEventListener("touchmove", surTouche);
      document.removeEventListener("touchend", surFin);
    };
  }, []);

  return null;
}
