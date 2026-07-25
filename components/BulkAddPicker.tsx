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

type VariantFilter = "shiny" | "costume" | "dynamax" | "gigamax";

const FILTER_LABELS: Record<VariantFilter, string> = {
  shiny: "Shiny",
  costume: "Costumes",
  dynamax: "Dynamax",
  gigamax: "Gigamax",
};

function matchesFilters(variant: SpriteVariant, filters: Set<VariantFilter>): boolean {
  if (filters.size === 0) return true;
  if (filters.has("shiny") && variant.shiny) return true;
  if (filters.has("costume") && variant.tags.includes("costume")) return true;
  if (filters.has("dynamax") && variant.tags.includes("dynamax")) return true;
  if (filters.has("gigamax") && variant.tags.includes("gigamax")) return true;
  return false;
}

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
  const [staged, setStaged] = useState<Map<string, StagedItem>>(new Map());
  const [category, setCategory] = useState<EntryCategory>(defaultCategory);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState<Set<VariantFilter>>(new Set());
  // Toutes les variantes de tous les Pokémon de la région/recherche sont
  // affichées d'un coup (comme un grand tableau de sprites, génération par
  // génération) plutôt que de devoir cliquer sur chaque Pokémon un par un :
  // reste gérable via le lot de 50 Pokémon à la fois ci-dessous (images en
  // chargement paresseux, donc le coût réel dépend de ce qui est visible à
  // l'écran, pas du nombre total de tuiles dans le DOM).
  const [visibleCount, setVisibleCount] = useState(20);

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

  const toggleFilter = (f: VariantFilter) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
    setVisibleCount(50);
  };

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

  // Quand un filtre est actif, on ne garde que les Pokémon ayant au moins une
  // variante qui correspond : sinon la liste afficherait des tuiles vides.
  const speciesList = useMemo(() => {
    const base = searchResults ?? speciesByRegion.get(openRegion ?? "") ?? [];
    if (filters.size === 0) return base;
    return base.filter((species) =>
      getSpriteVariants(species.id).some((v) => matchesFilters(v, filters))
    );
  }, [searchResults, speciesByRegion, openRegion, filters]);

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
          onChange={(e) => { setSearch(e.target.value); setVisibleCount(50); }}
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
                onClick={() => { setOpenRegion(openRegion === r.name ? null : r.name); setVisibleCount(50); }}
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

        <div className="flex gap-2 items-center flex-wrap mb-3">
          <label className="field-label" style={{ marginRight: 4 }}>FILTRES</label>
          {(Object.keys(FILTER_LABELS) as VariantFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => toggleFilter(f)}
              style={{
                padding: "6px 14px", borderRadius: 999, cursor: "pointer",
                border: "1px solid", fontFamily: "Exo 2, sans-serif", fontWeight: 600, fontSize: "0.78rem",
                ...(filters.has(f)
                  ? { background: "rgba(255,215,0,0.15)", borderColor: "rgba(255,215,0,0.4)", color: "#ffd700" }
                  : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#b0bac8" }),
              }}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {speciesList.length === 0 ? (
          <p style={{ color: "rgba(232,237,245,0.35)", fontSize: "0.85rem", padding: "16px 0" }}>
            {searchResults ? "Aucun résultat." : "Choisis une région, ou cherche un Pokémon par nom."}
          </p>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: 480, overflowY: "auto", marginBottom: 12, padding: "2px 4px" }}>
              {speciesList.slice(0, visibleCount).map((species) => (
                <SpeciesBlock
                  key={species.id}
                  species={species}
                  staged={staged}
                  filters={filters}
                  onToggleVariant={(variant) => toggleVariant(species, variant)}
                />
              ))}
            </div>
            {speciesList.length > visibleCount && (
              <button
                type="button"
                onClick={() => setVisibleCount((v) => v + 50)}
                className="btn-secondary"
                style={{ marginBottom: 16, fontSize: "0.8rem" }}
              >
                Afficher plus ({speciesList.length - visibleCount} restants)
              </button>
            )}
          </>
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

function VariantBadges({ variant }: { variant: SpriteVariant }) {
  return (
    <>
      {variant.shiny && (
        <span
          title="Shiny"
          style={{
            position: "absolute", top: 2, right: 2, fontSize: "0.75rem",
            lineHeight: 1, filter: "drop-shadow(0 0 2px rgba(0,0,0,0.9))",
          }}
        >
          ✨
        </span>
      )}
      {variant.tags.includes("dynamax") && (
        <span
          title="Dynamax"
          style={{
            position: "absolute", bottom: 2, left: 2, fontSize: "0.55rem", fontWeight: 800,
            width: 15, height: 15, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            background: "#7c3aed", color: "#fff", border: "1px solid rgba(255,255,255,0.4)",
          }}
        >
          D
        </span>
      )}
      {variant.tags.includes("gigamax") && (
        <span
          title="Gigamax"
          style={{
            position: "absolute", bottom: 2, left: 2, fontSize: "0.55rem", fontWeight: 800,
            width: 15, height: 15, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            background: "#e11d48", color: "#fff", border: "1px solid rgba(255,255,255,0.4)",
          }}
        >
          G
        </span>
      )}
    </>
  );
}

function SpeciesBlock({
  species,
  staged,
  filters,
  onToggleVariant,
}: {
  species: PokeListEntry;
  staged: Map<string, StagedItem>;
  filters: Set<VariantFilter>;
  onToggleVariant: (variant: SpriteVariant) => void;
}) {
  const variants = getSpriteVariants(species.id).filter((v) => matchesFilters(v, filters));
  const stagedCountForSpecies = Array.from(staged.values()).filter((s) => s.pokemonId === species.id).length;

  if (variants.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
        <span style={{ fontSize: "0.7rem", color: "rgba(232,237,245,0.4)" }}>#{species.id}</span>
        <span style={{ color: "#e8edf5", fontSize: "0.85rem", fontWeight: 600 }}>{species.frenchName}</span>
        {stagedCountForSpecies > 0 && (
          <span style={{ fontSize: "0.7rem", color: "#ffd700", fontWeight: 700 }}>
            {stagedCountForSpecies} sélectionné{stagedCountForSpecies > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 8 }}>
        {variants.map((variant) => {
          const isStaged = staged.has(variant.key);
          return (
            <button
              key={variant.key}
              type="button"
              title={variant.label}
              onClick={() => onToggleVariant(variant)}
              style={{
                position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
                padding: 8, borderRadius: 8, cursor: "pointer",
                background: isStaged ? "rgba(255,215,0,0.18)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${isStaged ? "rgba(255,215,0,0.5)" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={variant.url} alt={variant.label} width={64} height={64} loading="lazy" decoding="async" style={{ objectFit: "contain", imageRendering: "pixelated" }} />
              <VariantBadges variant={variant} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
