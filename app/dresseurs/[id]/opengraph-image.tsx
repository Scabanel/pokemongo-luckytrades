import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import goIcons from "@/data/go-icons.json";

export const alt = "Profil dresseur Lucky Trades";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GO_ICON_BASE = "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon%20-%20256x256/Addressable%20Assets";
const ARTWORK_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";
const GO_ICONS = goIcons as Record<string, string[]>;

// Statique uniquement (pas d'animation, pas de retry client possible dans une
// image générée côté serveur) : icône officielle Pokémon GO si connue, sinon
// l'artwork officiel PokeAPI qui existe pour absolument tout le Pokédex.
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

  const wants = trainer
    ? await prisma.pokemonEntry.findMany({
        where: { trainerId: id, completed: false, category: "want" },
        orderBy: [{ priority: "asc" }, { pokemonId: "asc" }],
        take: 10,
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
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0b0700 0%, #1a0f05 100%)",
          fontFamily: "sans-serif",
          padding: "40px 60px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 20,
            letterSpacing: 6,
            color: "rgba(255,180,30,0.65)",
            marginBottom: 14,
            textTransform: "uppercase",
          }}
        >
          Pokémon GO · Lucky Trades
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 800,
            color: "#ffd700",
            textTransform: "uppercase",
            marginBottom: 28,
          }}
        >
          {trainer?.name ?? "Dresseur inconnu"}
        </div>

        {wants.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 14,
              maxWidth: 1000,
              marginBottom: 28,
            }}
          >
            {wants.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: 168,
                  padding: "10px 8px",
                  borderRadius: 14,
                  background: "rgba(78,168,255,0.1)",
                  border: "1px solid rgba(78,168,255,0.35)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={spriteUrl(entry.pokemonId, entry.shiny === true)}
                  alt=""
                  width={72}
                  height={72}
                />
                <div
                  style={{
                    display: "flex",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#e8edf5",
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  {entry.pokemonName}
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: "rgba(232,237,245,0.75)",
            textAlign: "center",
            maxWidth: 980,
          }}
        >
          Ce dresseur recherche ces Pokémon et plein d&apos;autres ! Découvre sa liste d&apos;échanges pour faire son bonheur !
        </div>
      </div>
    ),
    { ...size }
  );
}
