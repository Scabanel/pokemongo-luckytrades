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
  tradeForPokemonName?: string | null;
  tradeForPokemonId?: number | null;
  notes?: string | null;
  trainer?: { id: string; name: string } | null;
}

export default function Home() {
  const [entries, setEntries] = useState<PokemonEntry[]>([]);
  const [loading, setLoading] = useState(true);

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

  const wants = entries.filter((e) => e.category === "want");
  const gives = entries.filter((e) => e.category === "give");
  const mirrors = entries.filter((e) => e.category === "mirror");

  return (
    <div className="relative min-h-screen" style={{ background: "#0b0f1a" }}>
      <ParticleBackground />

      {/* Ambient orbs */}
      <div className="fixed pointer-events-none" style={{ top: "8%", left: "4%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(10,255,224,0.05) 0%, transparent 70%)", animation: "float-orb 8s ease-in-out infinite", zIndex: 0 }} />
      <div className="fixed pointer-events-none" style={{ bottom: "12%", right: "6%", width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,217,61,0.05) 0%, transparent 70%)", animation: "float-orb 10s ease-in-out infinite 2s", zIndex: 0 }} />
      <div className="fixed pointer-events-none" style={{ top: "45%", left: "50%", transform: "translateX(-50%)", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(180,100,255,0.04) 0%, transparent 70%)", animation: "float-orb 12s ease-in-out infinite 4s", zIndex: 0 }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
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

          {/* Counters */}
          {!loading && (
            <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
              {[
                { label: "Miroir", count: mirrors.length, color: "#b464ff" },
                { label: "Recherche", count: wants.length, color: "#0affe0" },
                { label: "À donner", count: gives.length, color: "#ffd93d" },
              ].map(({ label, count, color }) => (
                <span key={label} style={{ background: `${color}12`, border: `1px solid ${color}30`, borderRadius: 999, padding: "4px 14px", fontSize: "0.78rem", fontWeight: 700, color, fontFamily: "Exo 2, sans-serif" }}>
                  {count} {label}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Sections grid */}
        <div className="space-y-8">
          {/* Row 1 — Recherche + À donner */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Section title="Pokémon que je recherche" icon="🔍" color="#0affe0" entries={wants} loading={loading} borderTop="3px solid #0affe0" />
            <Section title="Pokémon que je peux donner" icon="🎁" color="#ffd93d" entries={gives} loading={loading} borderTop="3px solid #ffd93d" />
          </div>

          {/* Row 2 — Échanges miroir (pleine largeur) */}
          <Section title="Échanges miroir ✨" icon="🔮" color="#b464ff" entries={mirrors} loading={loading} borderTop="3px solid #b464ff" fullWidth />
        </div>

        <footer className="text-center mt-12 opacity-25" style={{ fontSize: "0.75rem" }}>
          <a href="/admin" style={{ color: "#0affe0", textDecoration: "none" }}>Administration</a>
        </footer>
      </div>
    </div>
  );
}

function Section({
  title, icon, color, entries, loading, borderTop, fullWidth = false,
}: {
  title: string; icon: string; color: string; entries: PokemonEntry[];
  loading: boolean; borderTop: string; fullWidth?: boolean;
}) {
  const cols = fullWidth
    ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
    : "grid-cols-2 sm:grid-cols-3";

  return (
    <div
      className="rounded-3xl p-6"
      style={{ background: "rgba(14,20,40,0.4)", backdropFilter: "blur(12px)", border: `1px solid ${color}18`, borderTop }}
    >
      <div className="flex items-center gap-3 mb-6">
        <span style={{ fontSize: "1.4rem" }}>{icon}</span>
        <h2 style={{ fontFamily: "Exo 2, sans-serif", fontWeight: 700, fontSize: "1.15rem", color }}>
          {title}
        </h2>
        <span className="ml-auto animate-glow-pulse" style={{ background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 999, padding: "3px 12px", fontSize: "0.8rem", fontWeight: 700, color, fontFamily: "Exo 2, sans-serif" }}>
          {loading ? "…" : entries.length}
        </span>
      </div>

      {loading ? (
        <div className={`grid ${cols} gap-4`}>
          {Array.from({ length: fullWidth ? 12 : 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className={`grid ${cols} gap-4`}>
          {entries.map((entry, i) => (
            <PokemonCard key={entry.id} entry={entry} style={{ animationDelay: `${i * 0.04}s` }} />
          ))}
        </div>
      )}
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
