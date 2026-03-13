"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import PokemonSprite from "./PokemonSprite";

interface PokemonEntry {
  id: string;
  pokemonName: string;
  pokemonId: number;
  category: string;
  shiny?: boolean;
  customSpriteUrl?: string | null;
  tradeForPokemonName?: string | null;
  tradeForPokemonId?: number | null;
  notes?: string | null;
  priority?: number | null;
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

const CATEGORY_LABEL: Record<string, string> = {
  want: "Je recherche",
  give: "Je peux donner",
  mirror: "Échange miroir ✨",
};

const CATEGORY_COLOR: Record<string, string> = {
  want: "#0affe0",
  give: "#ffd93d",
  mirror: "#b464ff",
};

function getPriorityStyle(priority: number): { bg: string; border: string; color: string; shadow: string } {
  if (priority === 1) return { bg: "rgba(255,215,0,0.25)", border: "#ffd700", color: "#ffd700", shadow: "0 0 12px rgba(255,215,0,0.5)" };
  if (priority === 2) return { bg: "rgba(192,192,192,0.2)", border: "#c0c0c0", color: "#d4d4d4", shadow: "0 0 8px rgba(192,192,192,0.3)" };
  if (priority === 3) return { bg: "rgba(205,127,50,0.2)", border: "#cd7f32", color: "#e09850", shadow: "0 0 8px rgba(205,127,50,0.3)" };
  return { bg: "rgba(100,180,255,0.15)", border: "#64b4ff", color: "#64b4ff", shadow: "none" };
}

export default function PokemonCard({ entry, style }: PokemonCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [mounted, setMounted] = useState(false);
  const trainerColor = entry.trainer ? getTrainerColor(entry.trainer.name) : "#0affe0";
  const isMirror = entry.category === "mirror";
  const isShiny = entry.shiny === true || (entry.notes?.toLowerCase().includes("shiny") ?? false);
  const hasPriority = entry.priority != null && entry.priority >= 1 && entry.priority <= 10;
  const priorityStyle = hasPriority ? getPriorityStyle(entry.priority!) : null;

  useEffect(() => { setMounted(true); }, []);

  const modal = showDetail && (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        background: "rgba(11,15,26,0.88)",
        backdropFilter: "blur(12px)",
        zIndex: 300,
      }}
      onClick={() => setShowDetail(false)}
    >
      <div
        className="glass-card animate-scale-in flex flex-col items-center relative"
        style={{
          maxWidth: 340,
          width: "100%",
          padding: 32,
          ...(isMirror && {
            borderColor: "rgba(180,100,255,0.3)",
            boxShadow: "0 16px 64px rgba(180,100,255,0.15)",
          }),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={() => setShowDetail(false)}
          style={{
            position: "absolute", top: 12, right: 12,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, color: "#e8edf5", cursor: "pointer",
            fontSize: "0.85rem", padding: "2px 8px",
          }}
        >
          ✕
        </button>

        {/* Priority badge in modal */}
        {hasPriority && (
          <div
            style={{
              position: "absolute", top: 12, left: 12,
              width: 28, height: 28, borderRadius: "50%",
              background: priorityStyle!.bg,
              border: `2px solid ${priorityStyle!.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.7rem", fontWeight: 800,
              color: priorityStyle!.color,
              fontFamily: "Exo 2, sans-serif",
              boxShadow: priorityStyle!.shadow,
            }}
          >
            {entry.priority}
          </div>
        )}

        {/* Category + shiny badges */}
        <div className="flex gap-2 flex-wrap justify-center" style={{ marginBottom: 16 }}>
          <span
            style={{
              background: `${CATEGORY_COLOR[entry.category] ?? "#0affe0"}18`,
              border: `1px solid ${CATEGORY_COLOR[entry.category] ?? "#0affe0"}40`,
              borderRadius: 999, padding: "3px 12px",
              fontSize: "0.72rem", fontWeight: 700,
              color: CATEGORY_COLOR[entry.category] ?? "#0affe0",
              fontFamily: "Exo 2, sans-serif",
            }}
          >
            {CATEGORY_LABEL[entry.category] ?? entry.category}
          </span>
          {isShiny && (
            <span
              style={{
                background: "rgba(255,215,0,0.15)",
                border: "1px solid rgba(255,215,0,0.5)",
                borderRadius: 999, padding: "3px 12px",
                fontSize: "0.72rem", fontWeight: 700,
                color: "#ffd700",
                fontFamily: "Exo 2, sans-serif",
              }}
            >
              ✨ Shiny
            </span>
          )}
        </div>

        {/* Trainer */}
        {entry.trainer && (
          <div className="flex items-center gap-2 mb-3">
            <div
              style={{
                width: 24, height: 24, borderRadius: "50%",
                background: trainerColor, color: "#0b0f1a",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.65rem", fontWeight: 700,
              }}
            >
              {entry.trainer.name.charAt(0).toUpperCase()}
            </div>
            <span style={{
              background: `${trainerColor}18`, border: `1px solid ${trainerColor}40`,
              borderRadius: 999, padding: "3px 12px",
              fontSize: "0.75rem", fontWeight: 600, color: trainerColor,
              fontFamily: "Exo 2, sans-serif",
            }}>
              {entry.trainer.name}
            </span>
          </div>
        )}

        {/* Big sprite */}
        <div className="relative mb-4">
          <div
            className="absolute inset-0 rounded-full blur-2xl opacity-30"
            style={{ background: CATEGORY_GLOW[entry.category] ?? CATEGORY_GLOW.give }}
          />
          <PokemonSprite pokemonId={entry.pokemonId} alt={entry.pokemonName} size={140} shiny={isShiny} customSpriteUrl={entry.customSpriteUrl} />
        </div>

        {/* Name */}
        <h2
          className="text-center font-bold mb-2"
          style={{
            fontFamily: "Exo 2, sans-serif", fontSize: "1.2rem",
            color: "#e8edf5", wordBreak: "break-word",
          }}
        >
          {entry.pokemonName}
        </h2>

        {/* Notes */}
        {entry.notes && (
          <p
            className="text-center mb-3"
            style={{ fontSize: "0.8rem", color: "rgba(232,237,245,0.6)", maxWidth: 260 }}
          >
            {entry.notes}
          </p>
        )}

        {/* Exchange */}
        {entry.tradeForPokemonName && entry.tradeForPokemonId && (
          <div
            className="flex items-center gap-3 mt-2 p-3"
            style={{
              background: "rgba(255,217,61,0.07)",
              border: "1px solid rgba(255,217,61,0.2)",
              borderRadius: 12,
              width: "100%",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "#ffd93d", fontWeight: 600 }}>
              {entry.category === "want" ? "Je donne" : entry.category === "mirror" ? "Échange" : "Je reçois"}
            </span>
            <PokemonSprite pokemonId={entry.tradeForPokemonId} alt={entry.tradeForPokemonName} size={40} />
            <span style={{ fontSize: "0.85rem", color: "#e8edf5", fontWeight: 500 }}>
              {entry.tradeForPokemonName}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div
        className="glass-card animate-scale-in p-4 flex flex-col items-center relative cursor-pointer select-none"
        style={{
          ...style,
          ...(isMirror && {
            borderColor: "rgba(180,100,255,0.25)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(180,100,255,0.08)",
          }),
          ...(hasPriority && entry.priority === 1 && {
            borderColor: "rgba(255,215,0,0.3)",
            boxShadow: "0 8px 32px rgba(255,215,0,0.12)",
          }),
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onClick={() => setShowDetail(true)}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "scale(1.03)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
        }}
      >
        {/* Priority badge */}
        {hasPriority && (
          <div
            style={{
              position: "absolute", top: -8, left: -8,
              width: 26, height: 26, borderRadius: "50%",
              background: priorityStyle!.bg,
              border: `2px solid ${priorityStyle!.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.65rem", fontWeight: 800,
              color: priorityStyle!.color,
              fontFamily: "Exo 2, sans-serif",
              boxShadow: priorityStyle!.shadow,
              zIndex: 10,
            }}
          >
            {entry.priority}
          </div>
        )}

        {/* Top-right badges */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
          {isMirror && (
            <div
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
          {isShiny && (
            <div
              style={{
                background: "rgba(255,215,0,0.18)",
                border: "1px solid rgba(255,215,0,0.5)",
                borderRadius: 8,
                padding: "1px 6px",
                fontSize: "0.6rem",
                fontWeight: 700,
                color: "#ffd700",
                fontFamily: "Exo 2, sans-serif",
                letterSpacing: "0.04em",
              }}
            >
              ✨ SHINY
            </div>
          )}
        </div>

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
          <PokemonSprite pokemonId={entry.pokemonId} alt={entry.pokemonName} size={88} shiny={isShiny} customSpriteUrl={entry.customSpriteUrl} />
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

      {/* Modal rendered in document.body via portal to avoid transform clipping */}
      {mounted && modal && createPortal(modal, document.body)}
    </>
  );
}
