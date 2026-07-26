"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import pokemonList from "@/data/pokemon.json";
import legendarySpecies from "@/data/legendary-species.json";
import { REGIONS, getRegionName } from "@/lib/regions";
import { getSpriteVariants, variantNeedsPinnedSprite, type SpriteVariant } from "@/lib/spriteVariants";
import type { EntryCategory } from "@/lib/types";

interface PokeListEntry {
  id: number;
  name: string;
  frenchName: string;
}

const POKE_LIST = pokemonList as PokeListEntry[];
// Légendaires/Mythiques/Ultra-Chimères : liste de dex ID validée (voir
// lib/entryFilters.ts, même source). Propriété de l'espèce entière, pas
// d'une variante précise : contrairement à Shiny/Costume/Dynamax/Gigamax
// ci-dessous, ce filtre restreint la liste des espèces affichées plutôt que
// de filtrer les sprites d'une espèce déjà affichée.
const LEGENDARY_SPECIES = new Set(legendarySpecies as number[]);

interface StagedItem {
  key: string;
  pokemonId: number;
  pokemonName: string;
  shiny: boolean;
  customSpriteUrl: string;
  tags: string[];
  gender: "male" | "female" | null;
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
  const [legendaryOnly, setLegendaryOnly] = useState(false);
  // Portal vers document.body : cette fenêtre peut s'ouvrir depuis un
  // contexte où un ancêtre .glass-card a un backdrop-filter, qui piège les
  // position:fixed dans sa propre boîte au lieu du vrai viewport (bouton
  // Fermer masqué/mal placé selon le scroll — voir SpritePicker dans
  // AdminPanel.tsx pour le même correctif).
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
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
          // Costumes événementiels, formes régionales (Alola/Galar/Hisui/
          // Paldea) ET variantes de genre (le "g2"/"(2)" de PokeMiners, ex :
          // Pikachu femelle a une queue différente même sans costume) ont un
          // visuel qu'on ne peut pas reconstruire autrement (aucun
          // tag/pokemonId n'y suffit) : on fixe alors le sprite exact. Pour
          // la base/Dynamax/Gigamax sans genre, PokemonCard retrouve déjà le
          // bon visuel à partir des tags + pokemonId + shiny (voir
          // components/PokemonCard.tsx) — figer customSpriteUrl ici
          // empêcherait à tort la préférence de style (statique/animé) du
          // dresseur de jamais s'appliquer à ces entrées.
          customSpriteUrl: variantNeedsPinnedSprite(variant) ? variant.url : "",
          tags: variant.tags,
          gender: variant.gender,
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
  // Légendaire restreint d'abord la liste d'espèces (propriété de l'espèce),
  // puis les filtres de variante s'appliquent comme d'habitude par-dessus.
  const speciesList = useMemo(() => {
    let base = searchResults ?? speciesByRegion.get(openRegion ?? "") ?? [];
    if (legendaryOnly) base = base.filter((species) => LEGENDARY_SPECIES.has(species.id));
    if (filters.size === 0) return base;
    return base.filter((species) =>
      getSpriteVariants(species.id).some((v) => matchesFilters(v, filters))
    );
  }, [searchResults, speciesByRegion, openRegion, filters, legendaryOnly]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(11,15,26,0.92)", backdropFilter: "blur(10px)", zIndex: 500 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="glass-card overflow-y-auto"
        style={{ maxWidth: 920, width: "100%", maxHeight: "calc(100dvh - 32px)", padding: "clamp(12px, 4vw, 24px)", overscrollBehavior: "contain" }}
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
          <button
            type="button"
            onClick={() => { setLegendaryOnly((v) => !v); setVisibleCount(50); }}
            style={{
              padding: "6px 14px", borderRadius: 999, cursor: "pointer",
              border: "1px solid", fontFamily: "Exo 2, sans-serif", fontWeight: 600, fontSize: "0.78rem",
              ...(legendaryOnly
                ? { background: "rgba(255,215,0,0.15)", borderColor: "rgba(255,215,0,0.4)", color: "#ffd700" }
                : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#b0bac8" }),
            }}
          >
            Légendaire
          </button>
        </div>

        {speciesList.length === 0 ? (
          <p style={{ color: "rgba(232,237,245,0.35)", fontSize: "0.85rem", padding: "16px 0" }}>
            {searchResults ? "Aucun résultat." : "Choisis une région, ou cherche un Pokémon par nom."}
          </p>
        ) : (
          <>
            {/* Un seul conteneur défilant (la fenêtre entière, ci-dessus) plutôt
                que celui-ci imbriqué avec son propre scroll : deux zones de
                scroll indépendantes rendaient le geste ambigu sur mobile
                (parfois interprété comme un pull-to-refresh du navigateur). */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 12, padding: "2px 4px" }}>
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
    </div>,
    document.body
  );
}

function VariantBadges({ variant }: { variant: SpriteVariant }) {
  return (
    <>
      {variant.gender && (
        <span
          title={variant.gender === "male" ? "Mâle" : "Femelle"}
          style={{
            position: "absolute", top: 2, left: 2,
            width: 16, height: 16, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: variant.gender === "male" ? "#3b82f6" : "#ff2d78",
            color: "#fff", fontWeight: 800, fontSize: "0.6rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
          }}
        >
          {variant.gender === "male" ? "♂" : "♀"}
        </span>
      )}
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
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/dynamax.png"
          alt="Dynamax"
          style={{ position: "absolute", bottom: 2, left: 2, width: 18, height: 18 }}
        />
      )}
      {variant.tags.includes("gigamax") && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/gigamax.png"
          alt="Gigamax"
          style={{ position: "absolute", bottom: 2, left: 2, width: 18, height: 18 }}
        />
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(clamp(96px, 26vw, 160px), 1fr))", gap: 10 }}>
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
                aspectRatio: "1", padding: 4, borderRadius: 8, cursor: "pointer", overflow: "hidden",
                background: isStaged ? "rgba(255,215,0,0.18)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${isStaged ? "rgba(255,215,0,0.5)" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={variant.url}
                alt={variant.label}
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }}
              />
              <VariantBadges variant={variant} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
