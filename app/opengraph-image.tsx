import { ImageResponse } from "next/og";
import { OG, BANDE_LIGNES } from "@/lib/couleursOg";

export const alt = "Échanges Pokémon GO Strasbourg";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* L'apercu qui s'affiche quand on colle le lien du site sur Discord.
 *
 * Les couleurs viennent de lib/couleursOg.ts et non des tokens CSS : satori, le moteur de
 * next/og, ne resout pas les variables CSS. Voir le bandeau de ce fichier-la.
 *
 * La composition reprend celle du site pour qu'on reconnaisse l'un dans l'autre : papier
 * clair, bandeau de trois lignes en haut, encre franche, aucun degrade ni ombre. */

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: OG.papier,
          fontFamily: "sans-serif",
        }}
      >
        {/* Le bandeau de lignes, exactement comme sous le header du site. C'est le signe
            le plus reconnaissable de la DA, et il reste lisible en vignette Discord. */}
        <div style={{ display: "flex", height: 14, width: "100%" }}>
          {BANDE_LIGNES.map((couleur) => (
            <div key={couleur} style={{ display: "flex", flex: 1, background: couleur }} />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            padding: "0 80px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 26,
              letterSpacing: 8,
              color: OG.encreDouce,
              marginBottom: 26,
              textTransform: "uppercase",
            }}
          >
            Pokémon GO · Strasbourg
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 30 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"
              alt=""
              width={92}
              height={92}
            />
            <div
              style={{
                display: "flex",
                fontSize: 86,
                fontWeight: 800,
                color: OG.encre,
                textTransform: "uppercase",
                letterSpacing: -2,
              }}
            >
              Échanges Strasbourg
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 32,
              color: OG.encreDouce,
              textAlign: "center",
              maxWidth: 920,
              lineHeight: 1.35,
            }}
          >
            Organise tes échanges avec les membres de la communauté de Strasbourg
          </div>

          {/* Les trois listes du site, en pastilles : elles disent en un coup d'oeil ce que
              le site fait, ce qu'un titre seul ne dit pas. */}
          <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
            {[
              { texte: "Échanges miroir", couleur: OG.ligneMiroir },
              { texte: "Je recherche", couleur: OG.ligneCherche },
              { texte: "Je peux donner", couleur: OG.ligneDonne },
            ].map(({ texte, couleur }) => (
              <div
                key={texte}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 24px",
                  borderRadius: 999,
                  border: `3px solid ${couleur}`,
                  color: couleur,
                  background: OG.surface,
                  fontSize: 24,
                  fontWeight: 700,
                }}
              >
                {texte}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
