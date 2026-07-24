"use client";

import { useEffect, useState } from "react";
import ParticleBackground from "@/components/ParticleBackground";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import type { Trainer } from "@/lib/types";

type TrainerWithCount = Trainer & { _count: { entries: number } };

export default function DresseursPage() {
  const [trainers, setTrainers] = useState<TrainerWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trainers")
      .then((r) => r.json())
      .then((data) => setTrainers(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col" style={{ background: "#0b0700" }}>
      <ParticleBackground />
      <div className="scanlines" />

      <SiteNav active="/dresseurs" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 flex-1 w-full">
        <header className="text-center mb-10">
          <h1
            style={{
              fontFamily: "Exo 2, sans-serif",
              fontSize: "clamp(1.4rem, 4vw, 2.2rem)",
              fontWeight: 900,
              color: "#ffd700",
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              textShadow: "0 0 20px rgba(255,215,0,0.4)",
            }}
          >
            Les dresseurs inscrits
          </h1>
          <p style={{ color: "rgba(232,237,245,0.45)", fontSize: "0.85rem", marginTop: 8 }}>
            Choisis un dresseur pour voir ce qu&apos;il recherche, peut donner, ou propose en miroir.
          </p>
        </header>

        {loading ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 90, borderRadius: 16 }} />
            ))}
          </div>
        ) : trainers.length === 0 ? (
          <p style={{ textAlign: "center", color: "rgba(232,237,245,0.3)", padding: 32 }}>
            Aucun dresseur inscrit pour le moment.
          </p>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {trainers.map((t) => (
              <a
                key={t.id}
                href={`/dresseurs/${t.id}`}
                className="glass-card p-4"
                style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "#0affe020",
                    border: "1px solid #0affe040",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "#0affe0",
                    fontFamily: "Exo 2, sans-serif",
                    flexShrink: 0,
                  }}
                >
                  {t.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#e8edf5" }}>
                    {t.name}
                  </div>
                  <div style={{ color: "rgba(232,237,245,0.4)", fontSize: "0.75rem", display: "flex", gap: 6, alignItems: "center" }}>
                    {t.team && <span>Niveau {t.level ?? "?"}</span>}
                    <span>{t._count.entries} échange{t._count.entries !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
