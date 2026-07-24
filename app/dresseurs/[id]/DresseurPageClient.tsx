"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ParticleBackground from "@/components/ParticleBackground";
import PokemonCard from "@/components/PokemonCard";
import CardSkeleton from "@/components/CardSkeleton";
import SiteNav from "@/components/SiteNav";
import type { PokemonEntry, EntryCategory, Trainer } from "@/lib/types";
import { CATEGORIES, CATEGORY_DISPLAY_ORDER } from "@/lib/categories";

const TEAM_ICONS: Record<string, string> = {
  instinct: "⚡",
  mystic: "💧",
  valor: "🔥",
};

function sortEntries(entries: PokemonEntry[]): PokemonEntry[] {
  return [...entries].sort((a, b) => {
    const pa = a.priority ?? 9999;
    const pb = b.priority ?? 9999;
    if (pa !== pb) return pa - pb;
    return a.pokemonName.localeCompare(b.pokemonName, "fr", { sensitivity: "base" });
  });
}

// Le nom du dresseur remplace le "je" générique de lib/categories.ts sur
// cette page : on y regarde la liste D'UNE personne en particulier, "Vorthil
// recherche" a plus de sens que "Je recherche" une fois qu'on n'est plus soi-même.
function tabLabel(key: EntryCategory, trainerName: string) {
  if (key === "want") return `${trainerName} recherche`;
  if (key === "give") return `${trainerName} peut donner`;
  return CATEGORIES.mirror.label;
}

type Filters = { shiny: boolean; fond: boolean; gigamax: boolean; dynamax: boolean; costume: boolean };
const EMPTY_FILTERS: Filters = { shiny: false, fond: false, gigamax: false, dynamax: false, costume: false };

const FILTER_CHIPS: { key: keyof Filters; label: string }[] = [
  { key: "shiny", label: "✨ Shiny" },
  { key: "fond", label: "🖼️ Fond" },
  { key: "gigamax", label: "✦ Gigamax" },
  { key: "dynamax", label: "◈ Dynamax" },
  { key: "costume", label: "🎭 Costume" },
];

// Même heuristique que components/PokemonCard.tsx pour rester cohérent avec
// les badges déjà affichés sur chaque carte (pas de champ dédié en base).
function matchesFilters(entry: PokemonEntry, search: string, filters: Filters) {
  const name = entry.pokemonName.toLowerCase();
  if (search && !name.includes(search.toLowerCase())) return false;

  const isGigamax = name.includes("gigamax");
  const isDynamax = name.includes("dynamax") && !isGigamax;
  const isCostume = !isGigamax && !isDynamax && name.trim().includes(" ");
  const isShiny = entry.shiny || (entry.notes?.toLowerCase().includes("shiny") ?? false);
  const hasFond = !!entry.backgroundUrl;

  if (filters.shiny && !isShiny) return false;
  if (filters.fond && !hasFond) return false;
  if (filters.gigamax && !isGigamax) return false;
  if (filters.dynamax && !isDynamax) return false;
  if (filters.costume && !isCostume) return false;
  return true;
}

export default function DresseurPageClient({ id }: { id: string }) {
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [entries, setEntries] = useState<PokemonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<EntryCategory>("mirror");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  useEffect(() => {
    Promise.all([
      fetch(`/api/trainers/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/entries").then((r) => r.json()),
    ])
      .then(([trainerData, allEntries]) => {
        if (!trainerData) {
          setNotFound(true);
          return;
        }
        setTrainer(trainerData);
        setEntries(allEntries.filter((e: PokemonEntry) => e.trainer?.id === id));
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Lien copié ! Colle-le sur Discord.");
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const wants = sortEntries(entries.filter((e) => e.category === "want"));
  const gives = sortEntries(entries.filter((e) => e.category === "give"));
  const mirrors = sortEntries(entries.filter((e) => e.category === "mirror"));

  const countByTab: Record<EntryCategory, number> = { mirror: mirrors.length, want: wants.length, give: gives.length };
  const entriesByTab: Record<EntryCategory, PokemonEntry[]> = { mirror: mirrors, want: wants, give: gives };
  const visibleEntries = entriesByTab[activeTab].filter((e) => matchesFilters(e, search, filters));
  const anyFilterActive = search.trim() !== "" || Object.values(filters).some(Boolean);
  const activeColor = CATEGORIES[activeTab].color;

  if (!loading && notFound) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center" style={{ background: "#0b0700" }}>
        <ParticleBackground />
        <p style={{ color: "rgba(232,237,245,0.5)", marginBottom: 16 }}>Ce dresseur n&apos;existe pas.</p>
        <a href="/dresseurs" className="btn-secondary" style={{ textDecoration: "none" }}>← Dresseurs</a>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen" style={{ background: "#0b0700" }}>
      <ParticleBackground />
      <div className="scanlines" />

      <SiteNav active="/dresseurs" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <a href="/dresseurs" style={{ color: "rgba(232,237,245,0.35)", fontSize: "0.75rem", textDecoration: "none" }}>
            ← Tous les dresseurs
          </a>
          <div className="flex items-center justify-center gap-3 flex-wrap" style={{ marginTop: 6 }}>
            <h1
              style={{
                fontFamily: "Exo 2, sans-serif",
                fontSize: "clamp(1.4rem, 4vw, 2.2rem)",
                fontWeight: 900,
                color: "#ffd700",
                textTransform: "uppercase",
                textShadow: "0 0 20px rgba(255,215,0,0.4)",
              }}
            >
              {loading ? "…" : trainer?.name}
            </h1>
            {!loading && trainer && (
              <button
                onClick={handleShare}
                className="btn-secondary"
                style={{ fontSize: "0.75rem", padding: "6px 12px" }}
                title="Copier le lien de cette page"
              >
                🔗 Partager
              </button>
            )}
          </div>
          {trainer?.team && (
            <p style={{ color: "rgba(232,237,245,0.45)", fontSize: "0.85rem", marginTop: 4 }}>
              {TEAM_ICONS[trainer.team]} {trainer.team.charAt(0).toUpperCase() + trainer.team.slice(1)} · Niveau {trainer.level ?? "?"}
            </p>
          )}
        </header>

        <div className="flex gap-2 mb-5 flex-wrap justify-center">
          {CATEGORY_DISPLAY_ORDER.map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 20px",
                borderRadius: 6,
                fontFamily: "Exo 2, sans-serif",
                fontWeight: 800,
                fontSize: "0.82rem",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                cursor: "pointer",
                border: "1px solid",
                transition: "all 0.12s",
                ...(activeTab === key
                  ? {
                      background: `${CATEGORIES[key].color}15`,
                      borderColor: `${CATEGORIES[key].color}55`,
                      color: CATEGORIES[key].color,
                    }
                  : {
                      background: "rgba(255,255,255,0.03)",
                      borderColor: "rgba(255,255,255,0.07)",
                      color: "rgba(232,237,245,0.38)",
                    }),
              }}
            >
              <span>{CATEGORIES[key].icon}</span>
              <span>{tabLabel(key, trainer?.name ?? "…")}</span>
              <span
                style={{
                  background: activeTab === key ? `${CATEGORIES[key].color}18` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${activeTab === key ? `${CATEGORIES[key].color}38` : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 4,
                  padding: "1px 7px",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  color: activeTab === key ? CATEGORIES[key].color : "rgba(232,237,245,0.3)",
                }}
              >
                {loading ? "…" : countByTab[key]}
              </span>
            </button>
          ))}
        </div>

        {!loading && (
          <div className="flex flex-wrap items-center gap-2 mb-5 justify-center">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Chercher un Pokémon..."
              className="glass-input"
              style={{ maxWidth: 220 }}
            />
            {FILTER_CHIPS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilters((f) => ({ ...f, [key]: !f[key] }))}
                style={{
                  padding: "7px 14px",
                  borderRadius: 999,
                  fontFamily: "Exo 2, sans-serif",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  border: "1px solid",
                  transition: "all 0.12s",
                  ...(filters[key]
                    ? { background: "rgba(10,255,224,0.15)", borderColor: "rgba(10,255,224,0.4)", color: "#0affe0" }
                    : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", color: "rgba(232,237,245,0.5)" }),
                }}
              >
                {label}
              </button>
            ))}
            {anyFilterActive && (
              <button
                onClick={() => { setSearch(""); setFilters(EMPTY_FILTERS); }}
                className="btn-secondary"
                style={{ padding: "7px 14px", fontSize: "0.78rem" }}
              >
                ✕ Réinitialiser
              </button>
            )}
          </div>
        )}

        <div
          style={{
            background: "rgba(8,11,20,0.5)",
            backdropFilter: "blur(10px)",
            border: `1px solid ${activeColor}18`,
            borderTop: `2px solid ${activeColor}`,
            borderRadius: 10,
            padding: 20,
            minHeight: 300,
          }}
        >
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : visibleEntries.length === 0 ? (
            <p style={{ textAlign: "center", color: "rgba(232,237,245,0.3)", padding: 32 }}>
              {anyFilterActive ? "Aucun résultat pour ces filtres." : "Rien ici pour le moment."}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {visibleEntries.map((entry, i) => (
                <PokemonCard key={entry.id} entry={entry} style={{ animationDelay: `${i * 0.04}s` }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
