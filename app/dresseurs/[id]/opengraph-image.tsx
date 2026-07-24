import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const alt = "Profil dresseur Lucky Trades";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TEAM_STYLE: Record<string, { icon: string; color: string; label: string }> = {
  instinct: { icon: "⚡", color: "#ffcc00", label: "Instinct" },
  mystic: { icon: "💧", color: "#3a9bdc", label: "Mystic" },
  valor: { icon: "🔥", color: "#ff6161", label: "Valor" },
};

const CATEGORY_STYLE = [
  { key: "mirror", icon: "🔮", label: "Miroir", color: "#b464ff" },
  { key: "want", icon: "🔍", label: "Recherche", color: "#0affe0" },
  { key: "give", icon: "🎁", label: "Donne", color: "#ffd93d" },
] as const;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trainer = await prisma.trainer.findUnique({ where: { id } });

  const counts = { mirror: 0, want: 0, give: 0 };
  if (trainer) {
    const grouped = await prisma.pokemonEntry.groupBy({
      by: ["category"],
      where: { trainerId: id, completed: false },
      _count: true,
    });
    for (const g of grouped) {
      if (g.category === "mirror" || g.category === "want" || g.category === "give") {
        counts[g.category] = g._count;
      }
    }
  }

  const team = trainer?.team ? TEAM_STYLE[trainer.team] : null;

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
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: 6,
            color: "rgba(255,180,30,0.65)",
            marginBottom: 18,
            textTransform: "uppercase",
          }}
        >
          Pokémon GO · Lucky Trades
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", fontSize: 72 }}>🎒</div>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 800,
              color: "#ffd700",
              textTransform: "uppercase",
            }}
          >
            {trainer?.name ?? "Dresseur inconnu"}
          </div>
        </div>

        {team && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 28,
              color: team.color,
              marginBottom: 36,
            }}
          >
            <div style={{ display: "flex" }}>{team.icon}</div>
            <div style={{ display: "flex" }}>{team.label} · Niveau {trainer?.level ?? "?"}</div>
          </div>
        )}

        <div style={{ display: "flex", gap: 20 }}>
          {CATEGORY_STYLE.map(({ key, icon, label, color }) => (
            <div
              key={key}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "18px 32px",
                borderRadius: 16,
                background: `${color}22`,
                border: `2px solid ${color}66`,
              }}
            >
              <div style={{ display: "flex", fontSize: 36 }}>{icon}</div>
              <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color }}>
                {counts[key]}
              </div>
              <div style={{ display: "flex", fontSize: 20, color: "rgba(232,237,245,0.6)" }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
