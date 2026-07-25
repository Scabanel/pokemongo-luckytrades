"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import pokemonList from "@/data/pokemon.json";
import { REGIONS, getRegionName } from "@/lib/regions";
import { getSpriteVariants, type SpriteVariant } from "@/lib/spriteVariants";
import type { EntryCategory } from "@/lib/types";

interface PokeListEntry {
  id: number;
  name: string;
  frenchName: string;
}

const POKE_LIST = pokemonList as PokeListEntry[];

interface StagedItem {
  key: string;
  pokemonId: number;
  pokemonName: string;
  shiny: boolean;
  customSpriteUrl: string;
  tags: string[];
}

const CATEGORY_LABELS: Record<EntryCategory, string> = {
  want: "Je recherche",
  give: "Je peux donner",
  mirror: "Miroir",
};

export default function BulkAddPicker({
  defaultCategory,
  trainerId,
  onClose,
  onAdded,
}: {
  defaultCategory: EntryCategory;
  trainerId: string | null;
  onClose: () => void;
  onAdded: (count: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [openRegion, setOpenRegion] = useState<string | null>(null);
  const [openSpeciesId, setOpenSpeciesId] = useState<number | null>(null);
  const [staged, setStaged] = useState<Map<string, StagedItem>>(new Map());
  const [category, setCategory] = useState<EntryCategory>(defaultCategory);
  const [submitting, setSubmitting] = useState(false);

  const searchTrimmed = search.trim().toLowerCase();
  const searchResults = searchTrimmed.length >= 2
    ? POKE_LIST.filter((p) => p.frenchName.toLowerCase().includes(searchTrimmed)).slice(0, 40)
    : null;

  const speciesByRegion = useMemo(() => {
    const map = new Map<string, PokeListEntry[]>();
    for (const region of REGIONS) map.set(region.name, []);
    for (const p of POKE_LIST) {
      const list = map.get(getRegionName(p.id));
      if (list) list.push(p);
    }
    return map;
  }, []);

  const toggleVariant = (species: PokeListEntry, variant: SpriteVariant) => {
    setStaged((prev) => {
      const next = new Map(prev);
      if (next.has(variant.key)) {
        next.delete(variant.key);
      } else {
        next.set(variant.key, {
          key: variant.key,
          pokemonId: species.id,
          pokemonName: variant.tags.length > 0 && !variant.label.startsWith("Officiel")
            ? `${species.frenchName} ${variant.label}`
            : species.frenchName,
          shiny: variant.shiny,
          customSpriteUrl: variant.url,
          tags: variant.tags,
        });
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (staged.size === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/entries/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainerId,
          category,
          items: Array.from(staged.values()),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(`${data.count} Pokémon ajoutés !`);
      onAdded(data.count);
    } catch {
      toast.error("Erreur lors de l'ajout en masse");
    } finally {
      setSubmitting(false);
    }
  };

  const speciesList = searchResults ?? speciesByRegion.get(openRegion ?? "") ?? [];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(11,15,26,0.92)", backdropFilter: "blur(10px)", zIndex: 500 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="glass-card overflow-y-auto"
        style={{ maxWidth: 720, width: "100%", maxHeight: "calc(100dvh - 32px)", padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 style={{ fontFamily: "Exo 2, sans-serif", color: "#ffd700", fontWeight: 700, fontSize: "1.1rem" }}>
            Ajouter plusieurs Pokémon
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#e8edf5", cursor: "pointer", fontSize: "0.8rem", padding: "4px 10px" }}>
            Fermer
          </button>
        </div>

        <p style={{ fontSize: "0.75rem", color: "rgba(232,237,245,0.45)", marginBottom: 12 }}>
          Cherche un Pokémon ou parcours par région, puis clique sur chaque sprite (shiny, costume, Gigamax, Dynamax...)
          que tu veux ajouter. Les fonds d&apos;événement s&apos;ajoutent ensuite au cas par cas via l&apos;édition.
        </p>

        <div className="flex gap-2 items-center flex-wrap mb-3">
          <label className="field-label" style={{ marginRight: 4 }}>CATÉGORIE</label>
          {(Object.keys(CATEGORY_LABELS) as EntryCategory[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              style={{
                padding: "6px 14px", borderRadius: 999, cursor: "pointer",
                border: "1px solid", fontFamily: "Exo 2, sans-serif", fontWeight: 600, fontSize: "0.78rem",
                ...(category === c
                  ? { background: "rgba(255,215,0,0.15)", borderColor: "rgba(255,215,0,0.4)", color: "#ffd700" }
                  : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#b0bac8" }),
              }}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpenSpeciesId(null); }}
          className="glass-input"
          placeholder="Chercher un Pokémon..."
          style={{ marginBottom: 12 }}
        />

        {!searchResults && (
          <div className="flex gap-2 flex-wrap mb-3">
            {REGIONS.map((r) => (
              <button
                key={r.name}
                type="button"
                onClick={() => { setOpenRegion(openRegion === r.name ? null : r.name); setOpenSpeciesId(null); }}
                style={{
                  padding: "6px 14px", borderRadius: 999, cursor: "pointer",
                  border: "1px solid", fontFamily: "Exo 2, sans-serif", fontWeight: 600, fontSize: "0.78rem",
                  ...(openRegion === r.name
                    ? { background: "rgba(255,215,0,0.15)", borderColor: "rgba(255,215,0,0.4)", color: "#ffd700" }
                    : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#b0bac8" }),
                }}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}

        {speciesList.length === 0 ? (
          <p style={{ color: "rgba(232,237,245,0.35)", fontSize: "0.85rem", padding: "16px 0" }}>
            {searchResults ? "Aucun résultat." : "Choisis une région, ou cherche un Pokémon par nom."}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 420, overflowY: "auto", marginBottom: 16 }}>
            {speciesList.map((species) => (
              <SpeciesRow
                key={species.id}
                species={species}
                open={openSpeciesId === species.id}
                onToggle={() => setOpenSpeciesId(openSpeciesId === species.id ? null : species.id)}
                staged={staged}
                onToggleVariant={(variant) => toggleVariant(species, variant)}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
          <span style={{ fontFamily: "Exo 2, sans-serif", fontWeight: 700, color: "#ffd700", fontSize: "0.9rem" }}>
            {staged.size} sélectionné{staged.size > 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={staged.size === 0 || submitting}
            className="btn-primary"
          >
            {submitting ? "Ajout…" : `Ajouter (${staged.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}

function SpeciesRow({
  species,
  open,
  onToggle,
  staged,
  onToggleVariant,
}: {
  species: PokeListEntry;
  open: boolean;
  onToggle: () => void;
  staged: Map<string, StagedItem>;
  onToggleVariant: (variant: SpriteVariant) => void;
}) {
  const variants = open ? getSpriteVariants(species.id) : [];
  const stagedCountForSpecies = Array.from(staged.values()).filter((s) => s.pokemonId === species.id).length;

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden" }}>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2"
        style={{ width: "100%", padding: "8px 12px", background: open ? "rgba(255,215,0,0.06)" : "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ fontSize: "0.7rem", color: "rgba(232,237,245,0.4)", width: 40, flexShrink: 0 }}>#{species.id}</span>
        <span style={{ flex: 1, color: "#e8edf5", fontSize: "0.85rem" }}>{species.frenchName}</span>
        {stagedCountForSpecies > 0 && (
          <span style={{ fontSize: "0.7rem", color: "#ffd700", fontWeight: 700, flexShrink: 0 }}>{stagedCountForSpecies} sélectionné{stagedCountForSpecies > 1 ? "s" : ""}</span>
        )}
        <span style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s", color: "rgba(232,237,245,0.4)", flexShrink: 0 }}>▸</span>
      </button>

      {open && (
        <div style={{ padding: 10, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 8 }}>
          {variants.length === 0 ? (
            <p style={{ fontSize: "0.75rem", color: "rgba(232,237,245,0.35)" }}>Aucun sprite officiel Pokémon GO connu pour ce Pokémon.</p>
          ) : (
            variants.map((variant) => {
              const isStaged = staged.has(variant.key);
              return (
                <button
                  key={variant.key}
                  type="button"
                  onClick={() => onToggleVariant(variant)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: 6, borderRadius: 8, cursor: "pointer",
                    background: isStaged ? "rgba(255,215,0,0.18)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isStaged ? "rgba(255,215,0,0.5)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={variant.url} alt={variant.label} width={48} height={48} style={{ objectFit: "contain", imageRendering: "pixelated" }} />
                  <span style={{ fontSize: "0.6rem", color: "rgba(232,237,245,0.6)", textAlign: "center", lineHeight: 1.2 }}>
                    {variant.label}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
