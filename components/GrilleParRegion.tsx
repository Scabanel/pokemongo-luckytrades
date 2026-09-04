"use client";

import { ancreDe, decouperParRegion, type Rangeable } from "@/lib/generations";

/* ═══════════════════════════════════════════════════════════════════════════════════════
   LA GRILLE DECOUPEE PAR REGION, PARTAGEE

   Steven, le 2026-09-04 : « Toutes les modifs d'affichages doivent etre partagees a la fois
   sur mon espace et sur les pages de dresseurs pour que les interfaces soient unifiees c'est
   plus clair pour tout le monde. »

   Il a raison, et il pointe une faute reelle de ma part : les sections de region et la barre
   de saut, je les avais ECRITES DEUX FOIS - une fois dans DresseurPageClient, une fois dans
   AdminPanel. C'est d'ailleurs pour ca que Steven ne les avait pas vues sur « Mon espace » :
   au depart je ne les avais mises que sur la page publique.

   Recopier quatre-vingts lignes dans deux fichiers, c'est installer le mecanisme de la
   divergence. La prochaine retouche n'irait que d'un cote, et personne ne s'en apercevrait
   avant qu'un utilisateur ne le signale - exactement ce qui vient d'arriver.

   Ce composant existe donc pour que l'unification soit STRUCTURELLE et non une question de
   discipline. Les deux ecrans passent par lui, donc ils ne peuvent plus differer.

   Il ne connait pas la carte qu'il affiche : chaque appelant lui passe sa fonction de rendu,
   parce que « Mon espace » a des cartes editables avec selection multiple et la page
   publique non. La MISE EN PAGE est partagee, les capacites restent a l'appelant.
   ═══════════════════════════════════════════════════════════════════════════════════════ */

/** Decale de quoi passer sous le bloc collant du header, sinon un saut d'ancre place le
 *  titre de region dessous et on croit avoir rate sa destination. */
const HAUT_COLLANT = 44;

export default function GrilleParRegion<T extends Rangeable>({
  entries,
  carte,
}: {
  entries: T[];
  /** Comment rendre une entree. L'appelant decide des capacites de sa carte. */
  carte: (entry: T) => React.ReactNode;
}) {
  const sections = decouperParRegion(entries);

  return (
    <>
      {/* La barre de saut n'apparait qu'a partir de deux regions : sur une liste qui tient
          dans une seule, elle proposerait de sauter la ou on est deja. */}
      {sections.length > 1 && (
        <nav
          aria-label="Aller à une région"
          className="flex flex-wrap gap-2 justify-center"
          style={{
            marginBottom: 16,
            paddingBottom: 14,
            borderBottom: "var(--trait-fin) solid var(--trait-leger)",
          }}
        >
          {sections.map(({ borne, entries: lot }) => (
            <a
              key={ancreDe(borne)}
              href={`#${ancreDe(borne)}`}
              style={{
                minHeight: 44, minWidth: 44, padding: "0 12px",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                borderRadius: 999, textDecoration: "none",
                border: "var(--trait-moyen) solid var(--encre)",
                background: "var(--surface)", color: "var(--encre)",
                fontFamily: "Exo 2, sans-serif", fontWeight: 700, fontSize: "0.8125rem",
              }}
            >
              {borne.region}
              <span style={{
                background: "var(--surface-creuse)", borderRadius: 999, padding: "0 6px",
                fontSize: "0.75rem", fontWeight: 800, fontVariantNumeric: "tabular-nums",
              }}>
                {lot.length}
              </span>
            </a>
          ))}
        </nav>
      )}

      {sections.map(({ borne, entries: lot }) => (
        <section key={ancreDe(borne)} style={{ marginBottom: 24 }}>
          {/* Le titre de region est COLLANT : sur une liste longue, un separateur qu'on a
              depasse ne sert plus a rien. Colle sous le header, il dit en permanence ou on
              se trouve. */}
          <h2
            id={ancreDe(borne)}
            className="station"
            style={{
              position: "sticky", top: HAUT_COLLANT, zIndex: 5,
              background: "var(--papier)", padding: "8px 0", marginBottom: 10,
              fontFamily: "Exo 2, sans-serif", fontWeight: 800, fontSize: "1rem",
              color: "var(--encre)", textTransform: "uppercase", letterSpacing: "0.04em",
              scrollMarginTop: HAUT_COLLANT + 12,
            }}
          >
            {borne.region}
            <span style={{
              marginLeft: 8, color: "var(--encre-tres-douce)", fontWeight: 700,
              fontSize: "0.8125rem", fontVariantNumeric: "tabular-nums",
            }}>
              {lot.length}
            </span>
          </h2>
          <div className="grid grille-tuiles gap-3">
            {lot.map((entry) => carte(entry))}
          </div>
        </section>
      ))}
    </>
  );
}
