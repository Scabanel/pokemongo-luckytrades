"use client";

import { useEffect, useState } from "react";
import PokemonSprite from "@/components/PokemonSprite";

/* ═══════════════════════════════════════════════════════════════════════════════════════
   LES DERNIERS SHINY AJOUTES

   Steven : « C'est beau mais un peu triste. Y'a moyen de decorer un peu plus le site en
   general ? (Je parle pas d'emojis hein) »

   Le reflexe aurait ete d'ajouter des motifs, des degrades, des couleurs d'accent. Sur un
   plan de reseau, chacun de ces gestes abime ce qui vient d'etre construit : le mobilier
   est noir et blanc precisement pour que la couleur veuille dire quelque chose.

   La couleur qui manquait etait deja disponible, et elle est meilleure que n'importe quel
   ornement : celle du jeu. Une bande des derniers shiny ajoutes par la communaute apporte
   une vingtaine de couleurs franches, prouve que le site vit, et renforce le cote chance
   auquel Steven tient. C'est de la decoration faite de contenu reel, ce qui est la seule
   sorte qui ne vieillit pas.

   ═══ POURQUOI UNE LIMITE COTE API ═══

   /api/entries renvoyait tout : 1 988 entrees avec leur dresseur joint, sur la page la
   plus visitee du site, pour en afficher dix-huit. Le parametre `limit` a ete ajoute pour
   ca, borne a 200 cote serveur.

   ═══ CE QUI EST AFFICHE SI L'APPEL ECHOUE ═══

   Rien. Pas de sprites de remplacement, pas de silhouettes : une bande de faux Pokemon
   sur la page d'accueil ferait croire a une activite qui n'existe pas.
   ═══════════════════════════════════════════════════════════════════════════════════════ */

/* 18 au depart, ramene a 10 : la bande faisait quatre rangees a 375px et poussait la
   landing a 2 585px, au-dessus du plafond de check:mobile. Ce plafond venait d etre releve
   une fois, avec ecrit noir sur blanc qu il ne pourrait plus que descendre - le relever
   deux fois de suite aurait vide cette phrase de son sens. Dix tuiles font deux rangees
   pleines, ce qui suffit largement a montrer que le site vit. */
const COMBIEN = 10;

type Entree = { id: string; pokemonId: number; pokemonName: string; shiny: boolean };

export default function DerniersShiny() {
  const [entrees, setEntrees] = useState<Entree[] | null>(null);

  useEffect(() => {
    let vivant = true;
    fetch(`/api/entries?shiny=true&limit=${COMBIEN}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Entree[]) => { if (vivant) setEntrees(d); })
      .catch(() => { if (vivant) setEntrees([]); });
    return () => { vivant = false; };
  }, []);

  if (!entrees || entrees.length === 0) return null;

  return (
    <section style={{ marginBottom: 44 }}>
      <h2 className="station" style={{
        fontFamily: "Exo 2, sans-serif", fontSize: "1.25rem", fontWeight: 800,
        color: "var(--encre)", margin: "0 0 6px", textTransform: "uppercase",
        letterSpacing: "0.02em",
      }}>
        Les derniers shiny arrivés
      </h2>
      <p style={{ color: "var(--encre-douce)", fontSize: "0.9rem", margin: "0 0 14px", maxWidth: "56ch" }}>
        Ajoutés par la communauté, et disponibles à l&apos;échange en ce moment.
      </p>

      <div
        className="glass-card"
        style={{
          padding: 10,
          display: "grid",
          // Des tuiles de 62px : deux rangees pleines a 375px, sans jamais de tuile
          // orpheline sur une troisieme ligne.
          gridTemplateColumns: "repeat(auto-fill, minmax(62px, 1fr))",
          gap: 8,
          // L'or de la chance a le droit de parler ici : c'est litteralement une vitrine
          // de shiny. Un filet, pas un aplat, pour ne pas concurrencer les sprites.
          borderColor: "var(--or)",
        }}
      >
        {entrees.map((e) => (
          <div
            key={e.id}
            title={e.pokemonName}
            style={{
              aspectRatio: "1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--or-pale)",
              borderRadius: 8,
            }}
          >
            <PokemonSprite pokemonId={e.pokemonId} alt={e.pokemonName} size={58} shiny />
          </div>
        ))}
      </div>
    </section>
  );
}
