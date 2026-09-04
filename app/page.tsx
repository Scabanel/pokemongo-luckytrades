"use client";

import { useEffect, useState } from "react";
import ParticleBackground from "@/components/ParticleBackground";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { CATEGORIES, CATEGORY_DISPLAY_ORDER } from "@/lib/categories";

/* ═══════════════════════════════════════════════════════════════════════════════════════
   LA LANDING

   Steven, le 2026-09-04 : « en bossant la landing pour qu'elle fasse reelle landing
   produit ».

   Ce qu'il y avait : un titre, une citation de quinze lignes qui racontait une anecdote
   interne, deux boutons, quatre encarts de fonctionnalites au ton inegal. Un visiteur du
   Discord qui arrivait la ne savait ni ce que le site fait, ni combien de monde s'en sert,
   ni par ou commencer.

   Ce qu'une landing doit faire, dans cet ordre :

     1. dire ce que c'est, pour qui, et quel probleme ca regle, avant tout defilement;
     2. le PROUVER avec des chiffres reels;
     3. montrer le geste concret qui fait la difference sur le terrain;
     4. expliquer les trois listes, parce que c'est le seul concept a comprendre;
     5. renvoyer vers l'action, et vers le Discord.

   ═══ LES CHIFFRES SONT REELS, OU ABSENTS ═══

   Ils viennent de /api/trainers. Tant qu'ils ne sont pas arrives, la place est reservee
   mais vide : un chiffre place la en dur, meme approximatif, serait un mensonge sur la
   seule partie de la page dont le travail est d'etablir la confiance.

   ═══ L'UX NE BOUGE PAS ═══

   Meme structure, memes destinations qu'avant : /mon-espace pour s'inscrire, /dresseurs
   pour regarder. Steven : « faut pas trop tout chambouler niveau UX histoire que les users
   soient pas perdus. » On ecrit mieux, on ne deplace pas les portes.
   ═══════════════════════════════════════════════════════════════════════════════════════ */

type Dresseur = { id: string; _count: { entries: number; shinyEntries: number } };

/** Les trois etapes. Numerotees parce que c'est une VRAIE sequence : on ne consulte pas
 *  utilement les listes des autres avant d'avoir renseigne la sienne. */
const ETAPES = [
  {
    titre: "Renseigne tes listes",
    texte: "Ce que tu cherches, ce que tu peux donner, et ce que tu proposes en miroir. Les fonds, les costumes et les différentes formes sont tous là.",
  },
  {
    titre: "Regarde celles des autres",
    texte: "Les listes de tous les dresseurs inscrits sont consultables librement. Tu vois d'un coup d'oeil qui possède ce que tu cherches.",
  },
  {
    titre: "Réserve, puis marque l'échange",
    texte: "Tu notes sur ton Pokémon avec qui tu l'échanges et contre quoi. Une fois l'échange fait, tu le marques comme échangé et il sort de ta liste active.",
  },
];

/** Ce que chaque liste veut dire, avec la couleur de sa ligne. */
const EXPLICATIONS: Record<string, string> = {
  mirror: "Un Pokémon que vous avez tous les deux et que vous échangez quand même, pour la chance d'un échange chanceux.",
  want: "Ce qu'il te manque. Les autres y voient tout de suite s'ils peuvent te le donner.",
  give: "Ce que tu as en double et dont tu peux te séparer.",
};

export default function LandingPage() {
  const [dresseurs, setDresseurs] = useState<Dresseur[] | null>(null);

  useEffect(() => {
    let vivant = true;
    fetch("/api/trainers")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Dresseur[]) => { if (vivant) setDresseurs(d); })
      // En cas d'echec on reste a null, donc sans chiffres. Mieux vaut une landing muette
      // sur ce point qu'une landing qui annonce un total faux.
      .catch(() => { if (vivant) setDresseurs([]); });
    return () => { vivant = false; };
  }, []);

  const chiffres = dresseurs && dresseurs.length > 0
    ? {
        dresseurs: dresseurs.length,
        pokemon: dresseurs.reduce((s, t) => s + (t._count?.entries ?? 0), 0),
        shiny: dresseurs.reduce((s, t) => s + (t._count?.shinyEntries ?? 0), 0),
      }
    : null;

  return (
    <div className="relative min-h-screen flex flex-col" style={{ background: "var(--papier)" }}>
      <ParticleBackground />

      <SiteNav active="/" />

      <div className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 py-10">

        {/* ═══ 1. CE QUE C'EST ═══ */}
        <header style={{ marginBottom: 40 }}>
          <p style={{
            fontFamily: "Bebas Neue, Exo 2, sans-serif",
            fontSize: "0.8125rem",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--encre-douce)",
            margin: "0 0 12px",
          }}>
            Pokémon GO · Lucky Trades · Strasbourg
          </p>

          <h1 style={{
            fontFamily: "Exo 2, sans-serif",
            fontSize: "clamp(2rem, 8vw, 3.4rem)",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1.02,
            textTransform: "uppercase",
            color: "var(--encre)",
            margin: "0 0 16px",
            textWrap: "balance",
          }}>
            Les échanges de la communauté, sur un seul plan
          </h1>

          <p style={{
            color: "var(--encre-douce)",
            fontSize: "1.0625rem",
            lineHeight: 1.55,
            maxWidth: "56ch",
            margin: "0 0 24px",
          }}>
            « Tu cherches quoi ? » « Je sais pas, et toi ? » Quinze minutes à chaque
            rencontre. Ici, chaque dresseur inscrit ce qu&apos;il cherche et ce qu&apos;il
            peut donner, une fois. Tout le monde le voit ensuite en un coup d&apos;oeil.
          </p>

          <div className="flex gap-3 flex-wrap">
            <a href="/mon-espace" className="btn-primary" style={{ textDecoration: "none", padding: "0 24px" }}>
              Créer mes listes
            </a>
            <a href="/dresseurs" className="btn-secondary" style={{ textDecoration: "none", padding: "0 24px" }}>
              Voir les listes des dresseurs
            </a>
          </div>
        </header>

        {/* ═══ 2. LA PREUVE ═══ */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1,
            background: "var(--encre)",
            border: "var(--trait-moyen) solid var(--encre)",
            borderRadius: "var(--rayon)",
            overflow: "hidden",
            marginBottom: 44,
          }}
        >
          {[
            { valeur: chiffres?.dresseurs, libelle: "dresseurs inscrits" },
            { valeur: chiffres?.pokemon, libelle: "Pokémon à échanger" },
            { valeur: chiffres?.shiny, libelle: "shiny disponibles" },
          ].map(({ valeur, libelle }) => (
            <div key={libelle} style={{ background: "var(--surface)", padding: "16px 10px", textAlign: "center" }}>
              <div style={{
                fontFamily: "Exo 2, sans-serif",
                fontSize: "clamp(1.5rem, 6vw, 2.25rem)",
                fontWeight: 900,
                color: "var(--encre)",
                lineHeight: 1,
                // Les chiffres s'alignent en colonnes : sans chasse fixe, un 1 et un 8
                // n'ont pas la meme largeur et la rangee tremble.
                fontVariantNumeric: "tabular-nums",
                // Reserve la hauteur avant l'arrivee des donnees, pour que la page ne
                // sursaute pas sous le pouce au moment du chargement.
                minHeight: "1em",
              }}>
                {valeur === undefined || valeur === null ? "" : valeur.toLocaleString("fr-FR")}
              </div>
              <div style={{
                fontSize: "0.75rem",
                color: "var(--encre-douce)",
                marginTop: 6,
                lineHeight: 1.25,
              }}>
                {libelle}
              </div>
            </div>
          ))}
        </section>

        {/* ═══ 3. LE GESTE QUI CHANGE TOUT SUR LE TERRAIN ═══ */}
        <section style={{ marginBottom: 44 }}>
          <h2 className="station" style={{
            fontFamily: "Exo 2, sans-serif", fontSize: "1.25rem", fontWeight: 800,
            color: "var(--encre)", margin: "0 0 14px", textTransform: "uppercase",
            letterSpacing: "0.02em",
          }}>
            Sur place, en dix secondes
          </h2>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <div className="glass-card" style={{ padding: 16 }}>
              <h3 style={{ fontFamily: "Exo 2, sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "var(--encre)", margin: "0 0 6px" }}>
                Le QR code de ta liste
              </h3>
              <p style={{ color: "var(--encre-douce)", fontSize: "0.85rem", lineHeight: 1.5, margin: 0 }}>
                Tu le montres, l&apos;autre scanne, ta liste s&apos;ouvre chez lui. Plus
                besoin d&apos;épeler une adresse au milieu d&apos;un raid.
              </p>
            </div>
            <div className="glass-card" style={{ padding: 16 }}>
              <h3 style={{ fontFamily: "Exo 2, sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "var(--encre)", margin: "0 0 6px" }}>
                Le filtre à coller dans le jeu
              </h3>
              <p style={{ color: "var(--encre-douce)", fontSize: "0.85rem", lineHeight: 1.5, margin: 0 }}>
                Une chaîne de recherche Pokémon GO prête à coller. Son propre jeu lui
                affiche immédiatement ce qu&apos;il possède de ta liste.
              </p>
            </div>
          </div>
        </section>

        {/* ═══ 4. LES TROIS LISTES ═══ */}
        <section style={{ marginBottom: 44 }}>
          <h2 className="station" style={{
            fontFamily: "Exo 2, sans-serif", fontSize: "1.25rem", fontWeight: 800,
            color: "var(--encre)", margin: "0 0 6px", textTransform: "uppercase",
            letterSpacing: "0.02em",
          }}>
            Trois listes, trois lignes
          </h2>
          <p style={{ color: "var(--encre-douce)", fontSize: "0.9rem", margin: "0 0 16px", maxWidth: "56ch" }}>
            C&apos;est le seul concept à comprendre. Chaque Pokémon que tu inscris va dans
            l&apos;une des trois.
          </p>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {CATEGORY_DISPLAY_ORDER.map((cle) => (
              <div
                key={cle}
                className="glass-card"
                style={{
                  padding: "14px 16px",
                  // Le filet de la ligne, a gauche, comme sur un plan de reseau.
                  borderLeft: `var(--trait-fort) solid ${CATEGORIES[cle].color}`,
                }}
              >
                <h3
                  className="station"
                  style={{
                    fontFamily: "Exo 2, sans-serif", fontWeight: 800, fontSize: "0.95rem",
                    color: CATEGORIES[cle].color, margin: "0 0 6px",
                  }}
                >
                  {CATEGORIES[cle].label}
                </h3>
                <p style={{ color: "var(--encre-douce)", fontSize: "0.85rem", lineHeight: 1.5, margin: 0 }}>
                  {EXPLICATIONS[cle]}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ 5. COMMENT CA MARCHE ═══ */}
        <section style={{ marginBottom: 44 }}>
          <h2 className="station" style={{
            fontFamily: "Exo 2, sans-serif", fontSize: "1.25rem", fontWeight: 800,
            color: "var(--encre)", margin: "0 0 16px", textTransform: "uppercase",
            letterSpacing: "0.02em",
          }}>
            Comment ça marche
          </h2>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
            {ETAPES.map(({ titre, texte }, i) => (
              <li key={titre} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <span style={{
                  flex: "0 0 auto",
                  width: 34, height: 34, borderRadius: "50%",
                  border: "var(--trait-moyen) solid var(--encre)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "Exo 2, sans-serif", fontWeight: 900, fontSize: "0.95rem",
                  color: "var(--encre)", background: "var(--surface)",
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {i + 1}
                </span>
                <div>
                  <h3 style={{ fontFamily: "Exo 2, sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "var(--encre)", margin: "6px 0 4px" }}>
                    {titre}
                  </h3>
                  <p style={{ color: "var(--encre-douce)", fontSize: "0.85rem", lineHeight: 1.5, margin: 0, maxWidth: "60ch" }}>
                    {texte}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ═══ 6. L'ACTION ═══ */}
        <section
          className="glass-card"
          style={{ padding: "20px 18px", textAlign: "center" }}
        >
          <h2 style={{
            fontFamily: "Exo 2, sans-serif", fontSize: "1.1rem", fontWeight: 800,
            color: "var(--encre)", margin: "0 0 8px", textTransform: "uppercase",
          }}>
            {chiffres ? `${chiffres.dresseurs} dresseurs y sont déjà` : "Rejoins la communauté"}
          </h2>
          <p style={{ color: "var(--encre-douce)", fontSize: "0.9rem", margin: "0 0 16px" }}>
            C&apos;est gratuit, et ça sert au premier échange.
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            <a href="/mon-espace" className="btn-primary" style={{ textDecoration: "none", padding: "0 24px" }}>
              Créer mes listes
            </a>
            <a href="/fonctionnalites" className="btn-secondary" style={{ textDecoration: "none", padding: "0 24px" }}>
              Tout ce que le site sait faire
            </a>
          </div>
        </section>
      </div>

      <SiteFooter />
    </div>
  );
}
