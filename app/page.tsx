"use client";

import { useEffect, useState } from "react";
import ParticleBackground from "@/components/ParticleBackground";
import PokemonCard from "@/components/PokemonCard";
import CardSkeleton from "@/components/CardSkeleton";

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

type ActiveTab = "mirror" | "want" | "give";

const TABS: { key: ActiveTab; label: string; icon: string; color: string }[] = [
  { key: "mirror", label: "Échanges miroir", icon: "🔮", color: "#b464ff" },
  { key: "want",   label: "Je recherche",    icon: "🔍", color: "#0affe0" },
  { key: "give",   label: "Je peux donner",  icon: "🎁", color: "#ffd93d" },
];

function sortByPriority(entries: PokemonEntry[]): PokemonEntry[] {
  return [...entries].sort((a, b) => {
    const pa = a.priority ?? 9999;
    const pb = b.priority ?? 9999;
    return pa - pb;
  });
}

export default function Home() {
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

  const wants = sortByPriority(entries.filter((e) => e.category === "want"));
  const gives = entries.filter((e) => e.category === "give");
  const mirrors = entries.filter((e) => e.category === "mirror");

  const countByTab: Record<ActiveTab, number> = {
    mirror: mirrors.length,
    want: wants.length,
    give: gives.length,
  };

  const entriesByTab: Record<ActiveTab, PokemonEntry[]> = {
    mirror: mirrors,
    want: wants,
    give: gives,
  };

  const activeColor = TABS.find((t) => t.key === activeTab)?.color ?? "#0affe0";

  return (
    <div className="relative min-h-screen" style={{ background: "#0b0f1a" }}>
      <ParticleBackground />

      {/* Ambient orbs */}
      <div className="fixed pointer-events-none" style={{ top: "8%", left: "4%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(10,255,224,0.05) 0%, transparent 70%)", animation: "float-orb 8s ease-in-out infinite", zIndex: 0 }} />
      <div className="fixed pointer-events-none" style={{ bottom: "12%", right: "6%", width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,217,61,0.05) 0%, transparent 70%)", animation: "float-orb 10s ease-in-out infinite 2s", zIndex: 0 }} />
      <div className="fixed pointer-events-none" style={{ top: "45%", left: "50%", transform: "translateX(-50%)", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(180,100,255,0.04) 0%, transparent 70%)", animation: "float-orb 12s ease-in-out infinite 4s", zIndex: 0 }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2 flex-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" alt="Poké Ball" width={40} height={40} className="animate-bounce-soft" style={{ imageRendering: "pixelated" }} />
            <h1 className="neon-text" style={{ fontFamily: "Exo 2, sans-serif", fontSize: "clamp(1.5rem, 5vw, 2.8rem)", fontWeight: 800, color: "#0affe0", letterSpacing: "-0.02em" }}>
              Les échanges chanceux du V
            </h1>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" alt="Poké Ball" width={40} height={40} className="animate-bounce-soft" style={{ imageRendering: "pixelated", animationDelay: "0.5s" }} />
          </div>
          <p style={{ color: "rgba(232,237,245,0.5)", fontSize: "0.9rem" }}>
            Catalogue de trades Pokémon GO — mis à jour en temps réel
          </p>
        </header>

        {/* Tab bar */}
        <div className="flex gap-2 mb-6 flex-wrap justify-center">
          {TABS.map(({ key, label, icon, color }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: 14,
                fontFamily: "Exo 2, sans-serif",
                fontWeight: 700,
                fontSize: "0.88rem",
                cursor: "pointer",
                border: "1px solid",
                transition: "all 0.2s",
                ...(activeTab === key
                  ? {
                      background: `${color}18`,
                      borderColor: `${color}50`,
                      color,
                      boxShadow: `0 0 16px ${color}18`,
                    }
                  : {
                      background: "rgba(255,255,255,0.04)",
                      borderColor: "rgba(255,255,255,0.08)",
                      color: "rgba(232,237,245,0.45)",
                    }),
              }}
            >
              <span>{icon}</span>
              <span>{label}</span>
              <span
                style={{
                  background: activeTab === key ? `${color}20` : "rgba(255,255,255,0.06)",
                  border: `1px solid ${activeTab === key ? `${color}40` : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 999,
                  padding: "1px 8px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: activeTab === key ? color : "rgba(232,237,245,0.4)",
                }}
              >
                {loading ? "…" : countByTab[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Cards panel — fills remaining viewport height, scrolls vertically */}
        <div
          className="rounded-3xl p-6"
          style={{
            background: "rgba(14,20,40,0.4)",
            backdropFilter: "blur(12px)",
            border: `1px solid ${activeColor}18`,
            borderTop: `3px solid ${activeColor}`,
            height: "calc(100vh - 280px)",
            minHeight: 300,
            overflowY: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: `${activeColor}40 transparent`,
          }}
        >
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : entriesByTab[activeTab].length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {entriesByTab[activeTab].map((entry, i) => (
                <PokemonCard key={entry.id} entry={entry} style={{ animationDelay: `${i * 0.04}s` }} />
              ))}
            </div>
          )}
        </div>

        <footer className="text-center mt-12 opacity-25" style={{ fontSize: "0.75rem" }}>
          <a href="/admin" style={{ color: "#0affe0", textDecoration: "none" }}>Administration</a>
        </footer>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" alt="Poké Ball" width={64} height={64} className="animate-bounce-soft" style={{ imageRendering: "pixelated", opacity: 0.5 }} />
      <p style={{ fontFamily: "Exo 2, sans-serif", color: "rgba(232,237,245,0.4)", textAlign: "center", fontSize: "0.9rem" }}>
        Aucun échange en cours pour le moment
      </p>
    </div>
  );
}
