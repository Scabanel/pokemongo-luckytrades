"use client";

import PokemonSprite from "./PokemonSprite";

interface PokemonEntry {
  id: string;
  pokemonName: string;
  pokemonId: number;
  category: string;
  tradeForPokemonName?: string | null;
  tradeForPokemonId?: number | null;
  notes?: string | null;
  trainer?: { id: string; name: string } | null;
}

interface PokemonCardProps {
  entry: PokemonEntry;
  style?: React.CSSProperties;
}

const TRAINER_COLORS = [
  "#0affe0", "#ffd93d", "#ff6b6b", "#64b4ff",
  "#b464ff", "#ff9f43", "#00d2d3", "#ee5a24",
];

function getTrainerColor(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return TRAINER_COLORS[Math.abs(hash) % TRAINER_COLORS.length];
}

const CATEGORY_GLOW: Record<string, string> = {
  want:   "radial-gradient(circle, #0affe0 0%, transparent 70%)",
  give:   "radial-gradient(circle, #ffd93d 0%, transparent 70%)",
  mirror: "radial-gradient(circle, #b464ff 0%, transparent 70%)",
};

export default function PokemonCard({ entry, style }: PokemonCardProps) {
  const trainerColor = entry.trainer ? getTrainerColor(entry.trainer.name) : "#0affe0";
  const isMirror = entry.category === "mirror";

  return (
    <div
      className="glass-card animate-scale-in p-4 flex flex-col items-center relative cursor-default select-none"
      style={{
        ...style,
        ...(isMirror && {
          borderColor: "rgba(180,100,255,0.25)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(180,100,255,0.08)",
        }),
      }}
    >
      {/* Mirror badge */}
      {isMirror && (
        <div
          className="absolute top-3 right-3"
          style={{
            background: "rgba(180,100,255,0.18)",
            border: "1px solid rgba(180,100,255,0.4)",
            borderRadius: 8,
            padding: "1px 6px",
            fontSize: "0.6rem",
            fontWeight: 700,
            color: "#b464ff",
            fontFamily: "Exo 2, sans-serif",
            letterSpacing: "0.04em",
          }}
        >
          MIROIR
        </div>
      )}

      {/* Trainer pill */}
      {entry.trainer && (
        <div className="absolute top-3 left-3 flex items-center gap-1" style={{ zIndex: 1, maxWidth: "60%" }}>
          <div
            style={{
              width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
              background: trainerColor, color: "#0b0f1a",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.55rem", fontWeight: 700,
            }}
          >
            {entry.trainer.name.charAt(0).toUpperCase()}
          </div>
          <span
            style={{
              background: `${trainerColor}18`, border: `1px solid ${trainerColor}40`,
              borderRadius: 999, padding: "2px 8px", fontSize: "0.62rem",
              fontWeight: 600, color: trainerColor, letterSpacing: "0.03em",
              fontFamily: "Exo 2, sans-serif", whiteSpace: "nowrap",
              overflow: "hidden", textOverflow: "ellipsis", maxWidth: 80,
            }}
          >
            {entry.trainer.name}
          </span>
        </div>
      )}

      {/* Main sprite */}
      <div className="mt-7 mb-2 relative">
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-25"
          style={{ background: CATEGORY_GLOW[entry.category] ?? CATEGORY_GLOW.give }}
        />
        <PokemonSprite pokemonId={entry.pokemonId} alt={entry.pokemonName} size={88} />
      </div>

      {/* Name */}
      <h3
        className="text-center font-bold"
        style={{
          fontFamily: "Exo 2, sans-serif", fontSize: "0.82rem",
          color: "#e8edf5", lineHeight: 1.3, marginBottom: 4,
          maxWidth: "100%", wordBreak: "break-word",
        }}
      >
        {entry.pokemonName}
      </h3>

      {/* Notes */}
      {entry.notes && (
        <p
          className="text-center leading-snug"
          style={{ fontSize: "0.65rem", opacity: 0.65, marginBottom: 4, maxWidth: 150 }}
        >
          {entry.notes}
        </p>
      )}

      {/* Exchange badge */}
      {entry.tradeForPokemonName && entry.tradeForPokemonId && (
        <div className="exchange-badge mt-auto" style={{ marginTop: "auto", paddingTop: 4 }}>
          <span style={{ fontSize: "0.6rem", color: "#ffd93d", fontWeight: 600, whiteSpace: "nowrap" }}>
            {entry.category === "want" ? "Je donne" : entry.category === "mirror" ? "Échange" : "Je reçois"}
          </span>
          <PokemonSprite pokemonId={entry.tradeForPokemonId} alt={entry.tradeForPokemonName} size={24} />
          <span style={{ fontSize: "0.62rem", color: "#e8edf5", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 70 }}>
            {entry.tradeForPokemonName}
          </span>
        </div>
      )}
    </div>
  );
}
