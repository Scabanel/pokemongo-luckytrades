"use client";

import { useEffect, useState } from "react";
import ParticleBackground from "@/components/ParticleBackground";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import type { Trainer } from "@/lib/types";

type TrainerWithCount = Trainer & { _count: { entries: number; shinyEntries: number } };

export default function DresseursPage() {
  const [trainers, setTrainers] = useState<TrainerWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/trainers")
      .then((r) => r.json())
      .then((data) => setTrainers(data))
      .finally(() => setLoading(false));
  }, []);

  const searchTrimmed = search.trim().toLowerCase();
  const visibleTrainers = (searchTrimmed
    ? trainers.filter((t) => t.name.toLowerCase().includes(searchTrimmed))
    : trainers
  )
    .slice()   // l'API rend un tableau partage : le trier en place muterait l'etat
    .sort((a, b) =>
      b._count.entries - a._count.entries
      || a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));

  return (
    <div className="relative min-h-screen flex flex-col" style={{ background: "#0b0700" }}>
      <ParticleBackground />
      <div className="scanlines" />

      <SiteNav active="/dresseurs" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        <header className="text-center mb-10">
          <h1
            style={{
              fontFamily: "Exo 2, sans-serif",
              fontSize: "clamp(1.4rem, 4vw, 2.2rem)",
              fontWeight: 900,
              color: "#ffd700",
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              textShadow: "0 0 8px rgba(255,215,0,0.3)",
            }}
          >
            Les dresseurs inscrits
          </h1>
          <p style={{ color: "rgba(232,237,245,0.45)", fontSize: "0.85rem", marginTop: 8 }}>
            Choisis un dresseur pour voir ce qu&apos;il recherche, peut donner, ou propose en miroir.
          </p>
        </header>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="glass-input"
          placeholder="Chercher un dresseur..."
          style={{ marginBottom: 20, maxWidth: 360, marginLeft: "auto", marginRight: "auto", display: "block" }}
        />

        {loading ? (
          <div className="grid trainer-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 90, borderRadius: 16 }} />
            ))}
          </div>
        ) : visibleTrainers.length === 0 ? (
          <p style={{ textAlign: "center", color: "rgba(232,237,245,0.3)", padding: 32 }}>
            {trainers.length === 0 ? "Aucun dresseur inscrit pour le moment." : "Aucun dresseur ne correspond à cette recherche."}
          </p>
        ) : (
          <div className="grid trainer-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
            {visibleTrainers.map((t) => (
              <a
                key={t.id}
                href={`/dresseurs/${t.id}`}
                title={t.name}
                className="glass-card p-4 trainer-card"
                style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}
              >
                <div
                  /* MASQUE SUR TELEPHONE (voir .trainer-avatar dans globals.css).
                     Ce cercle n'affiche que la PREMIERE LETTRE du nom ecrit juste a cote :
                     44px de large plus 12px de gouttiere, soit un tiers de la carte en deux
                     colonnes, pour une information qui est deja la. Il reste sur bureau, ou
                     la place ne manque pas et ou il structure la ligne. */
                  className="trainer-avatar"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "#ffd70020",
                    border: "1px solid #ffd70040",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "#ffd700",
                    fontFamily: "Exo 2, sans-serif",
                    flexShrink: 0,
                  }}
                >
                  {t.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    className="trainer-name"
                    /* Tronque plutot que de pousser la carte : un nom long faisait deborder le
                       document de 23px en deux colonnes, mesure le 2026-09-04. Le nom
                       complet reste dans l'attribut title et sur la page du dresseur. */
                    style={{ fontWeight: 700, fontSize: "0.95rem", color: "#e8edf5", marginBottom: 4 }}
                  >
                    {t.name}
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <span
                      style={
                        t._count.entries === 0
                          ? {
                              background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)",
                              color: "#ff6b6b", borderRadius: 999, padding: "2px 10px",
                              fontSize: "0.75rem", fontWeight: 700,
                            }
                          : {
                              background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.3)",
                              color: "#ffd700", borderRadius: 999, padding: "2px 10px",
                              fontSize: "0.75rem", fontWeight: 700,
                            }
                      }
                    >
                      {t._count.entries} à échanger
                    </span>
                    {t._count.shinyEntries > 0 && (
                      <span
                        style={{
                          background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)",
                          color: "rgba(255,215,0,0.85)", borderRadius: 999, padding: "2px 10px",
                          fontSize: "0.75rem", fontWeight: 700,
                        }}
                      >
                        {t._count.shinyEntries} ✨
                      </span>
                    )}
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
