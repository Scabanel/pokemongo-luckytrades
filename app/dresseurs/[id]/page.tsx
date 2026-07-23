"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

export default function DresseurPage() {
  const { id } = useParams<{ id: string }>();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [entries, setEntries] = useState<PokemonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<EntryCategory>("mirror");

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

  const wants = sortEntries(entries.filter((e) => e.category === "want"));
  const gives = sortEntries(entries.filter((e) => e.category === "give"));
  const mirrors = sortEntries(entries.filter((e) => e.category === "mirror"));

  const countByTab: Record<EntryCategory, number> = { mirror: mirrors.length, want: wants.length, give: gives.length };
  const entriesByTab: Record<EntryCategory, PokemonEntry[]> = { mirror: mirrors, want: wants, give: gives };
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
          <h1
            style={{
              fontFamily: "Exo 2, sans-serif",
              fontSize: "clamp(1.4rem, 4vw, 2.2rem)",
              fontWeight: 900,
              color: "#ffd700",
              textTransform: "uppercase",
              marginTop: 6,
              textShadow: "0 0 20px rgba(255,215,0,0.4)",
            }}
          >
            {loading ? "…" : trainer?.name}
          </h1>
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
              <span>{CATEGORIES[key].label}</span>
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
          ) : entriesByTab[activeTab].length === 0 ? (
            <p style={{ textAlign: "center", color: "rgba(232,237,245,0.3)", padding: 32 }}>
              Rien ici pour le moment.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {entriesByTab[activeTab].map((entry, i) => (
                <PokemonCard key={entry.id} entry={entry} style={{ animationDelay: `${i * 0.04}s` }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
