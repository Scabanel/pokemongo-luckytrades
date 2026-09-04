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
    <div className="relative min-h-screen flex flex-col" style={{ background: "var(--papier)" }}>
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
              color: "var(--encre)",
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              textShadow: "none",
            }}
          >
            Les dresseurs inscrits
          </h1>
          <p style={{ color: "var(--encre-tres-douce)", fontSize: "0.85rem", marginTop: 8 }}>
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
          <p style={{ textAlign: "center", color: "var(--encre-tres-douce)", padding: 32 }}>
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
                    background: "var(--encre)",
                    border: "var(--trait-moyen) solid var(--encre)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "var(--surface)",   // le rond est plein d encre : la lettre est le papier
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
                    style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--encre)", marginBottom: 4 }}
                  >
                    {t.name}
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <span
                      style={
                        t._count.entries === 0
                          ? {
                              background: "color-mix(in srgb, var(--alerte) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--alerte) 30%, transparent)",
                              color: "var(--alerte)", borderRadius: 999, padding: "2px 10px",
                              fontSize: "0.75rem", fontWeight: 700,
                            }
                          : {
                              background: "var(--donne-pale)", border: "1px solid var(--ligne-donne)",
                              color: "var(--ligne-donne)", borderRadius: 999, padding: "2px 10px",
                              fontSize: "0.75rem", fontWeight: 700,
                            }
                      }
                    >
                      {t._count.entries} à échanger
                    </span>
                    {t._count.shinyEntries > 0 && (
                      <span
                        style={{
                          background: "var(--or-pale)", border: "1px solid var(--or)",
                          color: "var(--encre)", borderRadius: 999, padding: "2px 10px",
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
