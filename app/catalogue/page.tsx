"use client";

import { useEffect, useState } from "react";
import ParticleBackground from "@/components/ParticleBackground";
import PokemonCard from "@/components/PokemonCard";
import CardSkeleton from "@/components/CardSkeleton";
import PokemonSprite from "@/components/PokemonSprite";
import missingInGo from "@/data/missing-in-go.json";
import type { PokemonEntry, EntryCategory } from "@/lib/types";
import { CATEGORIES, CATEGORY_DISPLAY_ORDER } from "@/lib/categories";

type ActiveTab = EntryCategory | "missing";

const MISSING_COLOR = "#ff6b6b";

const TABS = [
  ...CATEGORY_DISPLAY_ORDER.map((key) => ({ key: key as ActiveTab, ...CATEGORIES[key] })),
  { key: "missing" as const, label: "Pas encore sortis", icon: "🚧", color: MISSING_COLOR },
];

const MISSING_TOTAL =
  missingInGo.missingEntirely.length + missingInGo.missingShiny.length + missingInGo.missingGigantamax.length;

function sortEntries(entries: PokemonEntry[]): PokemonEntry[] {
  return [...entries].sort((a, b) => {
    const pa = a.priority ?? 9999;
    const pb = b.priority ?? 9999;
    if (pa !== pb) return pa - pb;
    return a.pokemonName.localeCompare(b.pokemonName, "fr", { sensitivity: "base" });
  });
}

export default function CataloguePage() {
  const [entries, setEntries] = useState<PokemonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("mirror");

  const fetchEntries = async () => {
    try {
      const res = await fetch("/api/entries");
      const data = await res.json();
      setEntries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
    const interval = setInterval(fetchEntries, 30000);
    return () => clearInterval(interval);
  }, []);

  const wants = sortEntries(entries.filter((e) => e.category === "want"));
  const gives = sortEntries(entries.filter((e) => e.category === "give"));
  const mirrors = sortEntries(entries.filter((e) => e.category === "mirror"));

  const countByTab: Record<ActiveTab, number> = {
    mirror: mirrors.length,
    want: wants.length,
    give: gives.length,
    missing: MISSING_TOTAL,
  };

  const entriesByTab: Record<ActiveTab, PokemonEntry[]> = {
    mirror: mirrors,
    want: wants,
    give: gives,
    missing: [],
  };

  const activeColor = TABS.find((t) => t.key === activeTab)?.color ?? "#0affe0";

  const lastUpdated = entries.length > 0
    ? new Date(Math.max(...entries.map((e) => new Date(e.updatedAt ?? 0).getTime())))
        .toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;

  return (
    <div className="relative min-h-screen" style={{ background: "#0b0700" }}>
      <ParticleBackground />

      {/* Scanlines */}
      <div className="scanlines" />

      {/* Tag MAJ en haut à gauche */}
      {lastUpdated && (
        <div
          className="fixed"
          style={{
            top: 16, left: 16, zIndex: 50,
            background: "rgba(255,215,0,0.15)",
            border: "1px solid rgba(255,215,0,0.45)",
            borderRadius: 999,
            padding: "5px 14px",
            fontSize: "0.72rem",
            fontWeight: 800,
            color: "#ffd700",
            fontFamily: "Exo 2, sans-serif",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            boxShadow: "0 0 12px rgba(255,215,0,0.18)",
            backdropFilter: "blur(8px)",
          }}
        >
          ⟳ MAJ le {lastUpdated}
        </div>
      )}

      {/* Ambient orbs — ton chaud uniquement */}
      <div className="fixed pointer-events-none" style={{ top: "8%", left: "4%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,160,20,0.04) 0%, transparent 70%)", animation: "float-orb 8s ease-in-out infinite", zIndex: 0 }} />
      <div className="fixed pointer-events-none" style={{ bottom: "12%", right: "6%", width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,120,10,0.04) 0%, transparent 70%)", animation: "float-orb 10s ease-in-out infinite 2s", zIndex: 0 }} />

      {/* Golden bottom auras — source des particules */}
      <div className="fixed pointer-events-none" style={{ bottom: -120, left: "8%", width: 700, height: 420, background: "radial-gradient(ellipse at center bottom, rgba(255,200,50,0.13) 0%, rgba(255,160,20,0.06) 45%, transparent 70%)", zIndex: 0 }} />
      <div className="fixed pointer-events-none" style={{ bottom: -100, right: "12%", width: 600, height: 380, background: "radial-gradient(ellipse at center bottom, rgba(255,180,30,0.1) 0%, rgba(255,140,0,0.04) 45%, transparent 70%)", zIndex: 0 }} />
      <div className="fixed pointer-events-none" style={{ bottom: -80, left: "42%", transform: "translateX(-50%)", width: 800, height: 320, background: "radial-gradient(ellipse at center bottom, rgba(255,215,0,0.08) 0%, rgba(255,190,10,0.03) 50%, transparent 70%)", zIndex: 0 }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-10">
          {/* Surtitre GO style */}
          <div style={{
            fontFamily: "Bebas Neue, Exo 2, sans-serif",
            fontSize: "clamp(0.7rem, 1.5vw, 0.9rem)",
            letterSpacing: "0.35em",
            color: "rgba(255,180,30,0.6)",
            marginBottom: 6,
            textTransform: "uppercase",
          }}>
            Pokémon GO · Lucky Trades
          </div>

          <div className="flex items-center justify-center gap-3 mb-3 flex-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" alt="Poké Ball" width={36} height={36} className="animate-bounce-soft" style={{ imageRendering: "pixelated", opacity: 0.85 }} />
            <h1
              style={{
                fontFamily: "Exo 2, sans-serif",
                fontSize: "clamp(1.6rem, 5vw, 3rem)",
                fontWeight: 900,
                color: "#ffd700",
                letterSpacing: "-0.03em",
                textTransform: "uppercase",
                textShadow: "0 0 20px rgba(255,215,0,0.5), 0 0 50px rgba(255,180,0,0.2)",
                animation: "title-float 4s ease-in-out infinite",
              }}
            >
              Les échanges chanceux de la communauté
            </h1>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" alt="Poké Ball" width={36} height={36} className="animate-bounce-soft" style={{ imageRendering: "pixelated", animationDelay: "0.5s", opacity: 0.85 }} />
          </div>

          <p style={{
            color: "rgba(232,237,245,0.38)",
            fontSize: "0.82rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "Exo 2, sans-serif",
            fontWeight: 600,
          }}>
            Chaque dresseur gère sa propre liste. Retrouvez ici ce que tout le monde recherche, peut donner, ou propose en miroir.
          </p>

          {/* Decorative line */}
          <div style={{
            width: "100%",
            maxWidth: 320,
            margin: "14px auto 0",
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(255,180,30,0.45), transparent)",
          }} />
        </header>

        {/* Tab bar */}
        <div className="flex gap-2 mb-5 flex-wrap justify-center">
          {TABS.map(({ key, label, icon, color }) => (
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
                      background: `${color}15`,
                      borderColor: `${color}55`,
                      color,
                      boxShadow: `3px 3px 0 ${color}12, 0 0 16px ${color}14`,
                    }
                  : {
                      background: "rgba(255,255,255,0.03)",
                      borderColor: "rgba(255,255,255,0.07)",
                      color: "rgba(232,237,245,0.38)",
                    }),
              }}
            >
              <span>{icon}</span>
              <span>{label}</span>
              <span
                style={{
                  background: activeTab === key ? `${color}18` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${activeTab === key ? `${color}38` : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 4,
                  padding: "1px 7px",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  color: activeTab === key ? color : "rgba(232,237,245,0.3)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {loading ? "—" : countByTab[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Active tab label */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
          paddingLeft: 2,
        }}>
          <div style={{
            width: 3,
            height: 18,
            background: activeColor,
            borderRadius: 2,
            boxShadow: `0 0 8px ${activeColor}`,
          }} />
          <span style={{
            fontFamily: "Bebas Neue, Exo 2, sans-serif",
            fontSize: "1.05rem",
            letterSpacing: "0.12em",
            color: activeColor,
            opacity: 0.85,
          }}>
            {TABS.find(t => t.key === activeTab)?.label.toUpperCase()}
          </span>
          {!loading && (
            <span style={{
              fontFamily: "Bebas Neue, Exo 2, sans-serif",
              fontSize: "0.85rem",
              color: "rgba(232,237,245,0.2)",
              letterSpacing: "0.1em",
            }}>
              / {countByTab[activeTab]} entrées
            </span>
          )}
        </div>

        {/* Cards panel */}
        <div
          style={{
            background: "rgba(8,11,20,0.5)",
            backdropFilter: "blur(10px)",
            border: `1px solid ${activeColor}18`,
            borderTop: `2px solid ${activeColor}`,
            borderRadius: 10,
            padding: 20,
            height: "calc(100vh - 320px)",
            minHeight: 300,
            overflowY: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: `${activeColor}30 transparent`,
          }}
        >
          {activeTab === "missing" ? (
            <MissingPokemonPanel />
          ) : loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : entriesByTab[activeTab].length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {entriesByTab[activeTab].map((entry, i) => (
                <PokemonCard key={entry.id} entry={entry} style={{ animationDelay: `${i * 0.04}s` }} />
              ))}
            </div>
          )}
        </div>

        <footer className="text-center mt-10 flex items-center justify-center gap-5" style={{ fontSize: "0.7rem", opacity: 0.18 }}>
          <a href="/" style={{ color: "#0affe0", textDecoration: "none", letterSpacing: "0.1em", fontFamily: "Exo 2, sans-serif", fontWeight: 700 }}>ACCUEIL</a>
          <a href="/admin" style={{ color: "#0affe0", textDecoration: "none", letterSpacing: "0.1em", fontFamily: "Exo 2, sans-serif", fontWeight: 700 }}>ADMINISTRATION</a>
        </footer>
      </div>
    </div>
  );
}

type MissingEntry = { id: number; name: string };

const MISSING_SECTIONS: { key: keyof typeof missingInGo; title: string; hint: string }[] = [
  {
    key: "missingEntirely",
    title: "Absents du jeu",
    hint: "Aucune apparition dans Pokémon GO pour l'instant.",
  },
  {
    key: "missingShiny",
    title: "Sans version shiny",
    hint: "Présents dans le jeu, mais leur version chromatique n'est pas encore sortie.",
  },
  {
    key: "missingGigantamax",
    title: "Sans Gigamax",
    hint: "Espèce pouvant Gigamax dans les jeux principaux, mais pas encore dans GO. (Le Dynamax n'a pas de liste d'espèces éligibles fixe : impossible à calculer de la même façon.)",
  },
];

function MissingPokemonPanel() {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();

  const filterList = (list: MissingEntry[]) =>
    q ? list.filter((p) => p.name.toLowerCase().includes(q)) : list;

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Chercher un Pokémon..."
        className="glass-input"
        style={{ marginBottom: 24, maxWidth: 320 }}
      />
      <div className="space-y-8">
        {MISSING_SECTIONS.map(({ key, title, hint }) => {
          const list = filterList(missingInGo[key] as MissingEntry[]);
          return (
            <div key={key}>
              <h3
                style={{
                  fontFamily: "Exo 2, sans-serif",
                  fontWeight: 700,
                  color: MISSING_COLOR,
                  fontSize: "1rem",
                  marginBottom: 4,
                }}
              >
                {title} ({list.length})
              </h3>
              <p style={{ fontSize: "0.72rem", color: "rgba(232,237,245,0.4)", marginBottom: 12 }}>
                {hint}
              </p>
              {list.length === 0 ? (
                <p style={{ fontSize: "0.8rem", color: "rgba(232,237,245,0.3)", padding: "8px 0" }}>
                  Aucun résultat.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {list.map((p) => (
                    <div key={p.id} className="flex flex-col items-center gap-1" style={{ padding: 6 }}>
                      <PokemonSprite pokemonId={p.id} alt={p.name} size={56} />
                      <span
                        style={{
                          fontSize: "0.65rem",
                          color: "rgba(232,237,245,0.6)",
                          textAlign: "center",
                          textTransform: "capitalize",
                          lineHeight: 1.2,
                        }}
                      >
                        {p.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" alt="Poké Ball" width={56} height={56} className="animate-bounce-soft" style={{ imageRendering: "pixelated", opacity: 0.35 }} />
      <p style={{
        fontFamily: "Bebas Neue, Exo 2, sans-serif",
        color: "rgba(232,237,245,0.25)",
        textAlign: "center",
        fontSize: "1.1rem",
        letterSpacing: "0.15em",
      }}>
        AUCUN ÉCHANGE EN COURS
      </p>
    </div>
  );
}
