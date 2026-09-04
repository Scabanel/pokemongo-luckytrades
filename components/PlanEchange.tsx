import { CATEGORIES, CATEGORY_DISPLAY_ORDER } from "@/lib/categories";

/* ═══════════════════════════════════════════════════════════════════════════════════════
   L'ITINERAIRE D'UN ECHANGE

   Steven, apres la premiere version : « on comprend pas trop le cote plan de metro (c'est
   un tram a Strasbourg en plus) ».

   Il avait raison, et la cause etait simple : le reseau ne vivait qu'en fond a 7 %
   d'opacite. Un plan qu'on ne voit pas n'est pas un plan, c'est une texture.

   Celui-ci est au premier plan, et il ne decore pas : il EXPLIQUE. Quatre stations, dans
   l'ordre ou on les parcourt vraiment. Les trois premieres sont les trois listes, chacune
   avec la couleur de sa ligne; la quatrieme est le terminus, l'echange lui-meme, et c'est
   la seule a l'encre parce que c'est la que les trois lignes se rejoignent.

   ═══ POURQUOI VERTICAL ═══

   Un plan de reseau horizontal demande de la largeur, et le site sert surtout sur un ecran
   de 375px. Un itineraire vertical y tient sans compression, se lit dans le sens du
   defilement, et c'est aussi la forme des plans de ligne affiches DANS les trams.

   ═══ POURQUOI PAS DE SVG ═══

   Des div et des bordures plutot qu'un dessin : le texte reste du vrai texte, donc il
   grossit avec les reglages du telephone, il se selectionne, et check:mobile mesure ses
   tailles comme partout ailleurs. Un SVG aurait mis ces libelles hors de portee des
   planchers de lisibilite, et ces planchers sont ce qui reste depuis qu'on a retire le
   zoom.
   ═══════════════════════════════════════════════════════════════════════════════════════ */

/** Ce que chaque station veut dire. */
const EXPLICATIONS: Record<string, string> = {
  mirror: "Un Pokémon que vous avez tous les deux et que vous échangez quand même, pour la chance d'un échange chanceux.",
  want: "Ce qu'il te manque. Les autres voient tout de suite s'ils peuvent te le donner.",
  give: "Ce que tu as en double et dont tu peux te séparer.",
};

/** Le diamètre d'une station, et la largeur de la voie qui les relie. */
const STATION = 22;
const VOIE = 4;

export default function PlanEchange() {
  return (
    <div style={{ display: "grid", gap: 0 }}>
      {CATEGORY_DISPLAY_ORDER.map((cle) => (
        <div key={cle} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          {/* La colonne de la voie : la station, puis le segment qui descend vers la
              suivante. Le segment prend la couleur de la ligne qu'il quitte. */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto" }}>
            <span
              aria-hidden="true"
              style={{
                width: STATION,
                height: STATION,
                borderRadius: "50%",
                background: "var(--surface)",
                border: `var(--trait-fort) solid ${CATEGORIES[cle].color}`,
                flex: "0 0 auto",
              }}
            />
            <span
              aria-hidden="true"
              style={{
                width: VOIE,
                flex: 1,
                minHeight: 30,
                background: CATEGORIES[cle].color,
              }}
            />
          </div>

          <div style={{ paddingBottom: 18, minWidth: 0 }}>
            <h3 style={{
              fontFamily: "Exo 2, sans-serif",
              fontWeight: 800,
              fontSize: "1rem",
              color: CATEGORIES[cle].color,
              margin: "0 0 4px",
              lineHeight: 1.2,
            }}>
              {CATEGORIES[cle].label}
            </h3>
            <p style={{
              color: "var(--encre-douce)",
              fontSize: "0.875rem",
              lineHeight: 1.5,
              margin: 0,
              maxWidth: "52ch",
            }}>
              {EXPLICATIONS[cle]}
            </p>
          </div>
        </div>
      ))}

      {/* ── Le terminus ────────────────────────────────────────────────────────────────
          Double anneau : sur un plan de reseau, c'est la marque d'une correspondance, la
          station ou plusieurs lignes se rejoignent. Ici les trois listes s'y rejoignent
          effectivement, et c'est le seul point du diagramme a l'encre. */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <span
          aria-hidden="true"
          style={{
            width: STATION,
            height: STATION,
            borderRadius: "50%",
            background: "var(--surface)",
            border: `var(--trait-fort) solid var(--encre)`,
            outline: "var(--trait-moyen) solid var(--encre)",
            outlineOffset: 3,
            flex: "0 0 auto",
          }}
        />
        <div style={{ minWidth: 0 }}>
          <h3 style={{
            fontFamily: "Exo 2, sans-serif",
            fontWeight: 800,
            fontSize: "1rem",
            color: "var(--encre)",
            margin: "0 0 4px",
            lineHeight: 1.2,
            textTransform: "uppercase",
            letterSpacing: "0.02em",
          }}>
            L&apos;échange
          </h3>
          <p style={{
            color: "var(--encre-douce)",
            fontSize: "0.875rem",
            lineHeight: 1.5,
            margin: 0,
            maxWidth: "52ch",
          }}>
            Tu notes avec qui et contre quoi. Une fois l&apos;échange fait, tu le marques
            comme échangé et il sort de ta liste.
          </p>
        </div>
      </div>
    </div>
  );
}
