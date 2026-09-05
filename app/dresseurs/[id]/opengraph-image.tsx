import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import goIcons from "@/data/go-icons.json";
import { OG, BANDE_LIGNES } from "@/lib/couleursOg";

export const alt = "Profil dresseur, échanges Pokémon GO Strasbourg";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GO_ICON_BASE = "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon%20-%20256x256/Addressable%20Assets";
const ARTWORK_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";
const GO_ICONS = goIcons as Record<string, string[]>;

/* L'apercu d'une page de dresseur sur Discord.
 *
 * Couleurs litterales, comme l'apercu du site : satori ne resout pas les variables CSS.
 * Voir le bandeau de lib/couleursOg.ts. */

// Statique uniquement (pas d'animation, pas de retry client possible dans une image générée
// côté serveur) : icône officielle Pokémon GO si connue, sinon l'artwork officiel PokeAPI
// qui existe pour absolument tout le Pokédex.
function spriteUrl(pokemonId: number, shiny: boolean): string {
  const files = GO_ICONS[String(pokemonId)];
  const filename = shiny ? files?.[1] : files?.[0];
  if (filename) return `${GO_ICON_BASE}/${encodeURIComponent(filename)}`;
  return shiny
    ? `${ARTWORK_BASE}/shiny/${pokemonId}.png`
    : `${ARTWORK_BASE}/${pokemonId}.png`;
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trainer = await prisma.trainer.findUnique({ where: { id } });

  /* Huit et non dix : a 1200px de large, dix vignettes passent sur deux rangees et
     ecrasent le titre. Huit tiennent sur une seule ligne, ce qui garde l'image lisible en
     miniature - et une miniature illisible ne sert a rien, c'est tout ce que la plupart des
     gens verront. */
  const wants = trainer
    ? await prisma.pokemonEntry.findMany({
        where: { trainerId: id, completed: false, category: "want" },
        orderBy: [{ priority: "asc" }, { pokemonId: "asc" }],
        take: 8,
      })
    : [];

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
            padding: "36px 60px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: 7,
              color: OG.encreDouce,
              marginBottom: 12,
              textTransform: "uppercase",
            }}
          >
            Échanges Strasbourg
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 68,
              fontWeight: 800,
              color: OG.encre,
              textTransform: "uppercase",
              letterSpacing: -2,
              marginBottom: 8,
            }}
          >
            {trainer?.name ?? "Dresseur inconnu"}
          </div>

          {wants.length > 0 && (
            /* Un vrai conteneur et non un fragment React : satori, le moteur de next/og,
               ne place pas les enfants d un fragment dans le flux du parent comme le
               ferait un navigateur. Resultat mesure sur l apercu genere : le mot
               "recherche" se retrouvait projete a gauche, a cheval sur la rangee de
               vignettes, au lieu d etre centre au-dessus. */
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 26,
                  color: OG.ligneCherche,
                  fontWeight: 700,
                  marginBottom: 18,
                }}
              >
                recherche
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  maxWidth: 1080,
                }}
              >
                {wants.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 116,
                      height: 116,
                      borderRadius: 14,
                      background: OG.surface,
                      /* Meme trait franc que les tuiles du site, et pas un aplat teinte :
                         c'est ce qui fait reconnaitre l'apercu comme venant d'ici. */
                      border: `3px solid ${OG.encre}`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={spriteUrl(entry.pokemonId, entry.shiny === true)}
                      alt=""
                      width={78}
                      height={78}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: OG.encreDouce,
              textAlign: "center",
              maxWidth: 980,
              marginTop: 28,
            }}
          >
            {wants.length > 0
              ? "Sa liste complète, et ce qu'il peut donner, sur le site"
              : "Découvre sa liste d'échanges sur le site"}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
