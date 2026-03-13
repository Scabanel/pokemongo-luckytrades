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
  tags?: string | null;
  trainer?: { id: string; name: string } | null;
}

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

const TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  halloween:    { bg: "rgba(255,107,0,0.2)",   text: "#ff6b00", border: "rgba(255,107,0,0.5)" },
  noel:         { bg: "rgba(80,200,255,0.2)",   text: "#50c8ff", border: "rgba(80,200,255,0.5)" },
  "noël":       { bg: "rgba(80,200,255,0.2)",   text: "#50c8ff", border: "rgba(80,200,255,0.5)" },
  holiday:      { bg: "rgba(80,200,255,0.2)",   text: "#50c8ff", border: "rgba(80,200,255,0.5)" },
  anniversaire: { bg: "rgba(255,215,0,0.2)",    text: "#ffd700", border: "rgba(255,215,0,0.5)" },
  fete:         { bg: "rgba(255,215,0,0.2)",    text: "#ffd700", border: "rgba(255,215,0,0.5)" },
  "fête":       { bg: "rgba(255,215,0,0.2)",    text: "#ffd700", border: "rgba(255,215,0,0.5)" },
  gigamax:      { bg: "rgba(255,40,140,0.2)",   text: "#ff288c", border: "rgba(255,40,140,0.5)" },
  dynamax:      { bg: "rgba(210,40,40,0.2)",    text: "#e03030", border: "rgba(210,40,40,0.5)" },
  costume:      { bg: "rgba(200,100,255,0.2)",  text: "#c864ff", border: "rgba(200,100,255,0.5)" },
  evenement:    { bg: "rgba(180,100,255,0.2)",  text: "#b464ff", border: "rgba(180,100,255,0.5)" },
  "événement":  { bg: "rgba(180,100,255,0.2)",  text: "#b464ff", border: "rgba(180,100,255,0.5)" },
};
const DEFAULT_TAG_COLOR = { bg: "rgba(100,180,255,0.15)", text: "#64b4ff", border: "rgba(100,180,255,0.4)" };
function getTagColor(tag: string) { return TAG_COLORS[tag.toLowerCase()] ?? DEFAULT_TAG_COLOR; }

function getEventTheme(name: string, tags: string[]): {
  borderColor: string; boxShadow: string; glow: string;
} | null {
  const combined = (name + " " + tags.join(" ")).toLowerCase();
  if (combined.includes("gigamax")) return {
    borderColor: "rgba(255,40,140,0.4)",
    boxShadow: "0 8px 32px rgba(255,0,120,0.22), 0 0 0 1px rgba(255,40,140,0.15)",
    glow: "radial-gradient(circle, rgba(255,40,140,0.35) 0%, transparent 70%)",
  };
  if (combined.includes("dynamax")) return {
    borderColor: "rgba(210,40,40,0.4)",
    boxShadow: "0 8px 32px rgba(200,0,0,0.22), 0 0 0 1px rgba(210,40,40,0.15)",
    glow: "radial-gradient(circle, rgba(210,40,40,0.35) 0%, transparent 70%)",
  };
  if (combined.includes("halloween")) return {
    borderColor: "rgba(255,107,20,0.4)",
    boxShadow: "0 8px 32px rgba(255,80,0,0.18)",
    glow: "radial-gradient(circle, rgba(255,120,0,0.3) 0%, transparent 70%)",
  };
  if (combined.includes("noël") || combined.includes("noel") || combined.includes("holiday")) return {
    borderColor: "rgba(80,200,255,0.4)",
    boxShadow: "0 8px 32px rgba(60,160,255,0.18)",
    glow: "radial-gradient(circle, rgba(80,200,255,0.3) 0%, transparent 70%)",
  };
  if (combined.includes("anniversaire") || combined.includes("fête") || combined.includes("fete") || combined.includes("chapeau")) return {
    borderColor: "rgba(255,200,50,0.4)",
    boxShadow: "0 8px 32px rgba(255,200,0,0.18)",
    glow: "radial-gradient(circle, rgba(255,210,50,0.3) 0%, transparent 70%)",
  };
  if (name.trim().includes(" ")) return {
    borderColor: "rgba(200,100,255,0.3)",
    boxShadow: "0 8px 32px rgba(180,80,255,0.12)",
    glow: "radial-gradient(circle, rgba(200,100,255,0.25) 0%, transparent 70%)",
  };
  return null;
}

interface PokemonCardProps {
  entry: PokemonEntry;
  style?: React.CSSProperties;
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
  const trainerColor = entry.trainer ? "#00dc64" : "#0affe0";
  const isMirror = entry.category === "mirror";
  const isShiny = entry.shiny === true || (entry.notes?.toLowerCase().includes("shiny") ?? false);
  const hasPriority = entry.priority != null && entry.priority >= 1 && entry.priority <= 10;
  const priorityStyle = hasPriority ? getPriorityStyle(entry.priority!) : null;
  const tags = parseTags(entry.tags);
  const isDynamax = entry.pokemonName.toLowerCase().includes("dynamax") && !entry.pokemonName.toLowerCase().includes("gigamax");
  const isGigamax = entry.pokemonName.toLowerCase().includes("gigamax");
  const eventTheme = getEventTheme(entry.pokemonName, tags);

  useEffect(() => { setMounted(true); }, []);

  const modal = showDetail && (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        background: "rgba(10,6,0,0.88)",
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
          ...(entry.trainer && {
            borderColor: "rgba(0,220,100,0.5)",
            boxShadow: "0 16px 64px rgba(0,200,80,0.25), 0 0 0 1px rgba(0,220,100,0.2)",
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

        {/* Category + shiny + special badges */}
        <div className="flex gap-2 flex-wrap justify-center" style={{ marginBottom: 12 }}>
          <span style={{
            background: `${CATEGORY_COLOR[entry.category] ?? "#0affe0"}18`,
            border: `1px solid ${CATEGORY_COLOR[entry.category] ?? "#0affe0"}40`,
            borderRadius: 999, padding: "3px 12px",
            fontSize: "0.72rem", fontWeight: 700,
            color: CATEGORY_COLOR[entry.category] ?? "#0affe0",
            fontFamily: "Exo 2, sans-serif",
          }}>
            {CATEGORY_LABEL[entry.category] ?? entry.category}
          </span>
          {isGigamax && (
            <span style={{
              background: "rgba(255,40,140,0.18)", border: "1px solid rgba(255,40,140,0.5)",
              borderRadius: 999, padding: "3px 12px",
              fontSize: "0.72rem", fontWeight: 800, color: "#ff288c",
              fontFamily: "Exo 2, sans-serif",
            }}>✦ Gigamax</span>
          )}
          {isDynamax && (
            <span style={{
              background: "rgba(210,40,40,0.18)", border: "1px solid rgba(210,40,40,0.5)",
              borderRadius: 999, padding: "3px 12px",
              fontSize: "0.72rem", fontWeight: 800, color: "#e03030",
              fontFamily: "Exo 2, sans-serif",
            }}>◈ Dynamax</span>
          )}
          {isShiny && (
            <span style={{
              background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.5)",
              borderRadius: 999, padding: "3px 12px",
              fontSize: "0.72rem", fontWeight: 700, color: "#ffd700",
              fontFamily: "Exo 2, sans-serif",
            }}>✨ Shiny</span>
          )}
        </div>

        {/* Tags in modal */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center mb-3">
            {tags.map((tag) => {
              const c = getTagColor(tag);
              return (
                <span key={tag} style={{
                  background: c.bg, border: `1px solid ${c.border}`,
                  borderRadius: 999, padding: "2px 10px",
                  fontSize: "0.7rem", fontWeight: 700, color: c.text,
                  fontFamily: "Exo 2, sans-serif",
                }}>{tag}</span>
              );
            })}
          </div>
        )}

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
            style={{ background: eventTheme?.glow ?? CATEGORY_GLOW[entry.category] ?? CATEGORY_GLOW.give }}
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
              background: entry.trainer ? "rgba(0,200,80,0.1)" : "rgba(255,217,61,0.07)",
              border: entry.trainer ? "1px solid rgba(0,220,100,0.35)" : "1px solid rgba(255,217,61,0.2)",
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
          ...(hasPriority && entry.priority === 1 && {
            borderColor: "rgba(255,215,0,0.5)",
            boxShadow: "0 8px 32px rgba(255,215,0,0.22), 0 0 0 1px rgba(255,215,0,0.2)",
          }),
          ...(hasPriority && entry.priority === 2 && {
            borderColor: "rgba(192,192,192,0.5)",
            boxShadow: "0 8px 32px rgba(192,192,192,0.18), 0 0 0 1px rgba(192,192,192,0.18)",
          }),
          ...(hasPriority && entry.priority === 3 && {
            borderColor: "rgba(205,127,50,0.5)",
            boxShadow: "0 8px 32px rgba(205,127,50,0.2), 0 0 0 1px rgba(205,127,50,0.18)",
          }),
          ...(entry.trainer && {
            borderColor: "rgba(0, 220, 100, 0.5)",
            boxShadow: "0 8px 32px rgba(0, 200, 80, 0.28), 0 0 0 1px rgba(0, 220, 100, 0.2), inset 0 1px 0 rgba(0, 220, 100, 0.06)",
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
          {isGigamax && (
            <div style={{
              background: "rgba(255,40,140,0.2)", border: "1px solid rgba(255,40,140,0.55)",
              borderRadius: 8, padding: "1px 6px", fontSize: "0.6rem", fontWeight: 800,
              color: "#ff288c", fontFamily: "Exo 2, sans-serif", letterSpacing: "0.05em",
            }}>✦ GMAX</div>
          )}
          {isDynamax && (
            <div style={{
              background: "rgba(210,40,40,0.2)", border: "1px solid rgba(210,40,40,0.55)",
              borderRadius: 8, padding: "1px 6px", fontSize: "0.6rem", fontWeight: 800,
              color: "#e03030", fontFamily: "Exo 2, sans-serif", letterSpacing: "0.05em",
            }}>◈ DMAX</div>
          )}
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
                background: "#00dc64", color: "#0b0f1a",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.55rem", fontWeight: 700,
              }}
            >
              {entry.trainer.name.charAt(0).toUpperCase()}
            </div>
            <span
              style={{
                background: "rgba(0,220,100,0.12)", border: "1px solid rgba(0,220,100,0.4)",
                borderRadius: 999, padding: "2px 8px", fontSize: "0.62rem",
                fontWeight: 600, color: "#00dc64", letterSpacing: "0.03em",
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
            style={{ background:
              entry.trainer ? "radial-gradient(circle, #00dc64 0%, transparent 70%)" :
              entry.priority === 1 ? "radial-gradient(circle, #ffd700 0%, transparent 70%)" :
              entry.priority === 2 ? "radial-gradient(circle, #c0c0c0 0%, transparent 70%)" :
              entry.priority === 3 ? "radial-gradient(circle, #cd7f32 0%, transparent 70%)" :
              undefined
            }}
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

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center mb-1" style={{ maxWidth: 160 }}>
            {tags.slice(0, 2).map((tag) => {
              const c = getTagColor(tag);
              return (
                <span key={tag} style={{
                  background: c.bg, border: `1px solid ${c.border}`,
                  borderRadius: 999, padding: "1px 6px",
                  fontSize: "0.55rem", fontWeight: 700, color: c.text,
                  fontFamily: "Exo 2, sans-serif", whiteSpace: "nowrap",
                }}>{tag}</span>
              );
            })}
            {tags.length > 2 && (
              <span style={{
                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 999, padding: "1px 5px",
                fontSize: "0.55rem", fontWeight: 700, color: "rgba(232,237,245,0.4)",
                fontFamily: "Exo 2, sans-serif",
              }}>+{tags.length - 2}</span>
            )}
          </div>
        )}

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
          <div className="exchange-badge mt-auto" style={{ marginTop: "auto", paddingTop: 4, ...(entry.trainer && { background: "rgba(0,200,80,0.12)", borderColor: "rgba(0,220,100,0.4)" }) }}>
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
