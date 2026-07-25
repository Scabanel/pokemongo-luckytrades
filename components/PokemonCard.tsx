"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import PokemonSprite from "./PokemonSprite";
import type { PokemonEntry } from "@/lib/types";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { parseTags } from "@/lib/tags";
import gigantamaxIcons from "@/data/gigantamax-icons.json";
import pokemonList from "@/data/pokemon.json";

// Sprite officiel de forme Gigamax (aspect réellement différent en jeu), pour
// la poignée d'espèces qui en ont un, voir scripts/generate-costume-catalog.mjs.
// Aucun override équivalent pour Dynamax : ça ne change pas l'apparence dans GO.
const GIGANTAMAX_ICON_BASE = "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon%20-%20256x256/Addressable%20Assets";
const GIGANTAMAX_ICONS = gigantamaxIcons as Record<string, string[]>;
const ENGLISH_NAME_BY_ID = new Map(pokemonList.map((p) => [p.id, p.name]));

function getGigantamaxSpriteUrl(pokemonId: number, shiny: boolean): string | null {
  const files = GIGANTAMAX_ICONS[String(pokemonId)];
  if (!files) return null;
  const filename = shiny && files[1] ? files[1] : files[0];
  return `${GIGANTAMAX_ICON_BASE}/${encodeURIComponent(filename)}`;
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
  fond:         { bg: "rgba(100,220,180,0.2)",  text: "#64dcb4", border: "rgba(100,220,180,0.5)" },
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
  // Props ci-dessous optionnelles : uniquement utilisées par la vue "Mon espace"
  // (components/AdminPanel.tsx). Les pages publiques (catalogue d'un dresseur)
  // n'en passent aucune et gardent une carte purement en lecture seule.
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  // Une fois qu'au moins une tuile est sélectionnée, cliquer n'importe où sur
  // les autres bascule leur sélection au lieu d'ouvrir la fiche détail :
  // évite de viser la petite pastille à chaque tuile pour une sélection groupée.
  selectionActive?: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onComplete?: () => void;
  onQuantityChange?: (delta: number) => void;
  // Le bord vert + pastille dresseur signalent "cette entrée est assignée à
  // un dresseur précis" dans une liste qui en mélange plusieurs (catalogue
  // partagé, vue "Tous les dresseurs"). Inutile et redondant sur une liste
  // qui n'appartient déjà qu'à une seule personne (page publique d'un
  // dresseur, "Mes échanges") : `false` masque ce badge dans ce cas.
  showTrainerBadge?: boolean;
}


// Libellé spécifique à cette carte (diffère volontairement de "Échanges miroir"
// utilisé ailleurs) — couleur et glow, eux, viennent de lib/categories.ts.
const CATEGORY_LABEL: Record<string, string> = {
  want: "Je recherche",
  give: "Je peux donner",
  mirror: "Échange miroir",
};

function getPriorityStyle(priority: number): { bg: string; border: string; color: string; shadow: string } {
  if (priority === 1) return { bg: "rgba(255,215,0,0.25)", border: "#ffd700", color: "#ffd700", shadow: "0 0 12px rgba(255,215,0,0.5)" };
  if (priority === 2) return { bg: "rgba(192,192,192,0.2)", border: "#c0c0c0", color: "#d4d4d4", shadow: "0 0 8px rgba(192,192,192,0.3)" };
  if (priority === 3) return { bg: "rgba(205,127,50,0.2)", border: "#cd7f32", color: "#e09850", shadow: "0 0 8px rgba(205,127,50,0.3)" };
  return { bg: "rgba(100,180,255,0.15)", border: "#64b4ff", color: "#64b4ff", shadow: "none" };
}

export default function PokemonCard({
  entry,
  style,
  selectable,
  selected,
  onToggleSelect,
  selectionActive,
  canEdit,
  onEdit,
  onDelete,
  onComplete,
  onQuantityChange,
  showTrainerBadge = true,
}: PokemonCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const quantity = entry.quantity ?? 1;
  const hasTrainerBadge = showTrainerBadge && !!entry.trainer;
  const closeDetail = () => {
    setShowDetail(false);
    setConfirmDelete(false);
  };
  const trainerColor = entry.trainer ? "#00dc64" : "#ffd700";
  const isMirror = entry.category === "mirror";
  const isShiny = entry.shiny === true || (entry.notes?.toLowerCase().includes("shiny") ?? false);
  const hasPriority = entry.priority != null && entry.priority >= 1 && entry.priority <= 10;
  const priorityStyle = hasPriority ? getPriorityStyle(entry.priority!) : null;
  const tags = parseTags(entry.tags);
  // Le nom du Pokémon ne contient pas toujours "Dynamax"/"Gigamax" (ex: un
  // tag "dynamax" ajouté à la main sur "Duralugon" sans renommer l'entrée) :
  // vérifie aussi les tags, pas seulement le nom.
  const nameAndTags = (entry.pokemonName + " " + tags.join(" ")).toLowerCase();
  const isDynamax = nameAndTags.includes("dynamax") && !nameAndTags.includes("gigamax");
  const isGigamax = nameAndTags.includes("gigamax");
  // Pour les espèces qui Gigamax réellement dans GO, PokemonSprite tente
  // d'abord leur vrai visuel Gigamax (animé Showdown, puis icône statique
  // officielle) avant la chaîne de sprites normale.
  const gigantamaxSlug = isGigamax ? ENGLISH_NAME_BY_ID.get(entry.pokemonId) ?? null : null;
  const gigantamaxIconUrl = isGigamax ? getGigantamaxSpriteUrl(entry.pokemonId, isShiny) : null;
  // Statique (icône officielle Pokémon GO) par défaut pour tout le monde,
  // sauf pour un dresseur ayant explicitement choisi "animated" (voir
  // MyAccountPanel / Trainer.preferredSpriteStyle).
  const preferStatic = entry.trainer?.preferredSpriteStyle !== "animated";
  const eventTheme = getEventTheme(entry.pokemonName, tags);
  const categoryColor = getCategory(entry.category)?.color ?? CATEGORIES.want.color;
  const categoryGlow = getCategory(entry.category)?.glow ?? CATEGORIES.give.glow;

  useEffect(() => { setMounted(true); }, []);

  const modal = showDetail && (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        background: "rgba(10,6,0,0.88)",
        backdropFilter: "blur(12px)",
        zIndex: 300,
      }}
      onClick={closeDetail}
    >
      <div
        className="glass-card animate-scale-in flex flex-col items-center relative"
        style={{
          maxWidth: 340,
          width: "100%",
          padding: 32,
          ...(entry.backgroundUrl && {
            backgroundImage: `linear-gradient(rgba(8,11,20,0.55), rgba(8,11,20,0.8)), url(${entry.backgroundUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }),
          ...(isMirror && {
            borderColor: "rgba(180,100,255,0.3)",
            boxShadow: "0 16px 64px rgba(180,100,255,0.15)",
          }),
          ...(hasTrainerBadge && {
            borderColor: "rgba(0,220,100,0.5)",
            boxShadow: "0 16px 64px rgba(0,200,80,0.25), 0 0 0 1px rgba(0,220,100,0.2)",
          }),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={closeDetail}
          style={{
            position: "absolute", top: 12, right: 12,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, color: "#e8edf5", cursor: "pointer",
            fontSize: "0.75rem", padding: "4px 10px",
          }}
        >
          Fermer
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
            background: `${categoryColor}18`,
            border: `1px solid ${categoryColor}40`,
            borderRadius: 999, padding: "3px 12px",
            fontSize: "0.72rem", fontWeight: 700,
            color: categoryColor,
            fontFamily: "Exo 2, sans-serif",
          }}>
            {CATEGORY_LABEL[entry.category] ?? entry.category}
          </span>
          {(entry.quantity ?? 1) > 1 && (
            <span style={{
              background: "rgba(100,180,255,0.15)", border: "1px solid rgba(100,180,255,0.5)",
              borderRadius: 999, padding: "3px 12px",
              fontSize: "0.72rem", fontWeight: 800, color: "#64b4ff",
              fontFamily: "Exo 2, sans-serif",
            }}>×{entry.quantity} disponibles</span>
          )}
          {isGigamax && (
            <span style={{
              background: "rgba(255,40,140,0.18)", border: "1px solid rgba(255,40,140,0.5)",
              borderRadius: 999, padding: "3px 12px",
              fontSize: "0.72rem", fontWeight: 800, color: "#ff288c",
              fontFamily: "Exo 2, sans-serif",
            }}>Gigamax</span>
          )}
          {isDynamax && (
            <span style={{
              background: "rgba(210,40,40,0.18)", border: "1px solid rgba(210,40,40,0.5)",
              borderRadius: 999, padding: "3px 12px",
              fontSize: "0.72rem", fontWeight: 800, color: "#e03030",
              fontFamily: "Exo 2, sans-serif",
            }}>Dynamax</span>
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
        {hasTrainerBadge && entry.trainer && (
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
            style={{ background: eventTheme?.glow ?? categoryGlow }}
          />
          <PokemonSprite
            pokemonId={entry.pokemonId}
            alt={entry.pokemonName}
            size={168}
            shiny={isShiny}
            customSpriteUrl={entry.customSpriteUrl}
            preferStatic={preferStatic}
            gigantamaxSlug={gigantamaxSlug}
            gigantamaxIconUrl={gigantamaxIconUrl}
          />
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

        {/* Réservé par : qui a accepté l'échange (voir tradePartnerName) */}
        {entry.tradePartnerName && (
          <p
            className="text-center mb-2"
            style={{ fontSize: "0.78rem", color: "#ffd700", fontWeight: 600 }}
          >
            Réservé par {entry.tradePartnerName}
          </p>
        )}

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
              background: hasTrainerBadge ? "rgba(0,200,80,0.1)" : "rgba(255,217,61,0.07)",
              border: hasTrainerBadge ? "1px solid rgba(0,220,100,0.35)" : "1px solid rgba(255,217,61,0.2)",
              borderRadius: 12,
              width: "100%",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "#ffd93d", fontWeight: 600 }}>
              {entry.category === "want" ? "Je donne" : entry.category === "mirror" ? "Échange" : "Je reçois"}
            </span>
            <PokemonSprite
              pokemonId={entry.tradeForPokemonId}
              alt={entry.tradeForPokemonName}
              size={40}
              shiny={entry.tradeForShiny === true}
              customSpriteUrl={entry.tradeForCustomSpriteUrl}
              preferStatic={preferStatic}
            />
            <span style={{ fontSize: "0.85rem", color: "#e8edf5", fontWeight: 500 }}>
              {entry.tradeForPokemonName}
            </span>
          </div>
        )}

        {/* Actions (Mon espace uniquement) */}
        {canEdit && (
          <div
            className="w-full flex flex-col items-center gap-2 mt-4 pt-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
          >
            {confirmDelete ? (
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span style={{ fontSize: "0.8rem", color: "#ff6b6b" }}>Supprimer cette entrée ?</span>
                <button onClick={() => onDelete?.()} className="btn-danger">Oui</button>
                <button onClick={() => setConfirmDelete(false)} className="btn-secondary" style={{ padding: "6px 12px" }}>
                  Non
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <button
                  onClick={() => (quantity > 1 ? onQuantityChange?.(-1) : onComplete?.())}
                  className="btn-success"
                >
                  {quantity > 1 ? "−1 (donné)" : "Échangé"}
                </button>
                {quantity > 1 && (
                  <button
                    onClick={() => onQuantityChange?.(1)}
                    className="btn-secondary"
                    style={{ padding: "6px 10px", fontSize: "0.85rem", fontWeight: 800 }}
                    title="Corriger : +1 exemplaire"
                  >
                    +1
                  </button>
                )}
                <button
                  onClick={() => { closeDetail(); onEdit?.(); }}
                  className="btn-secondary"
                  style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                >
                  Modifier
                </button>
                <button onClick={() => setConfirmDelete(true)} className="btn-danger">
                  Supprimer
                </button>
              </div>
            )}
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
          ...(entry.backgroundUrl && {
            backgroundImage: `linear-gradient(rgba(8,11,20,0.55), rgba(8,11,20,0.75)), url(${entry.backgroundUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }),
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
          ...(hasTrainerBadge && {
            borderColor: "rgba(0, 220, 100, 0.5)",
            boxShadow: "0 8px 32px rgba(0, 200, 80, 0.28), 0 0 0 1px rgba(0, 220, 100, 0.2), inset 0 1px 0 rgba(0, 220, 100, 0.06)",
          }),
          ...(selected && {
            borderColor: "rgba(255, 215, 0,0.6)",
            boxShadow: "0 8px 32px rgba(255, 215, 0,0.25), 0 0 0 2px rgba(255, 215, 0,0.35)",
          }),
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onClick={() => {
          if (selectable && selectionActive) onToggleSelect?.();
          else setShowDetail(true);
        }}
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

        {/* Sélection multiple (Mon espace uniquement) */}
        {selectable && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
            aria-label={selected ? `Désélectionner ${entry.pokemonName}` : `Sélectionner ${entry.pokemonName}`}
            style={{
              position: "absolute", top: -8, right: -8, zIndex: 10,
              width: 26, height: 26, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              background: selected ? "#ffd700" : "rgba(8,11,20,0.7)",
              border: `2px solid ${selected ? "#ffd700" : "rgba(255,255,255,0.3)"}`,
              color: selected ? "#0b0f1a" : "rgba(232,237,245,0.4)",
              fontSize: "0.75rem",
              fontWeight: 900,
              boxShadow: selected ? "0 0 12px rgba(255, 215, 0,0.5)" : "none",
              transition: "all 0.12s",
            }}
          />
        )}

        {/* Top-right badges */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
          {(entry.quantity ?? 1) > 1 && (
            <div style={{
              background: "rgba(100,180,255,0.2)", border: "1px solid rgba(100,180,255,0.55)",
              borderRadius: 8, padding: "1px 6px", fontSize: "0.6rem", fontWeight: 800,
              color: "#64b4ff", fontFamily: "Exo 2, sans-serif", letterSpacing: "0.05em",
            }}>×{entry.quantity}</div>
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

        {/* Logo Dynamax/Gigamax officiel, en bas à droite de la tuile */}
        {(isGigamax || isDynamax) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={isGigamax ? "/gigamax.png" : "/dynamax.png"}
            alt={isGigamax ? "Gigamax" : "Dynamax"}
            className="absolute"
            style={{ bottom: 6, right: 6, width: 26, height: 26, zIndex: 1 }}
          />
        )}

        {/* Trainer pill */}
        {hasTrainerBadge && entry.trainer && (
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
              hasTrainerBadge ? "radial-gradient(circle, #00dc64 0%, transparent 70%)" :
              entry.priority === 1 ? "radial-gradient(circle, #ffd700 0%, transparent 70%)" :
              entry.priority === 2 ? "radial-gradient(circle, #c0c0c0 0%, transparent 70%)" :
              entry.priority === 3 ? "radial-gradient(circle, #cd7f32 0%, transparent 70%)" :
              undefined
            }}
          />
          <PokemonSprite
            pokemonId={entry.pokemonId}
            alt={entry.pokemonName}
            size={112}
            shiny={isShiny}
            customSpriteUrl={entry.customSpriteUrl}
            preferStatic={preferStatic}
            gigantamaxSlug={gigantamaxSlug}
            gigantamaxIconUrl={gigantamaxIconUrl}
          />
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

        {/* Réservé par : qui a accepté l'échange (voir tradePartnerName) */}
        {entry.tradePartnerName && (
          <p
            className="text-center"
            style={{ fontSize: "0.62rem", color: "#ffd700", fontWeight: 700, marginBottom: 2, lineHeight: 1.2 }}
          >
            Réservé par {entry.tradePartnerName}
          </p>
        )}

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
          <div className="exchange-badge mt-auto" style={{ marginTop: "auto", paddingTop: 4, ...(hasTrainerBadge && { background: "rgba(0,200,80,0.12)", borderColor: "rgba(0,220,100,0.4)" }) }}>
            <span style={{ fontSize: "0.6rem", color: "#ffd93d", fontWeight: 600, whiteSpace: "nowrap" }}>
              {entry.category === "want" ? "Je donne" : entry.category === "mirror" ? "Échange" : "Je reçois"}
            </span>
            <PokemonSprite
              pokemonId={entry.tradeForPokemonId}
              alt={entry.tradeForPokemonName}
              size={24}
              shiny={entry.tradeForShiny === true}
              customSpriteUrl={entry.tradeForCustomSpriteUrl}
              preferStatic={preferStatic}
            />
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
