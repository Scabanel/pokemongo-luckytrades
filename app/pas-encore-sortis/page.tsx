"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ParticleBackground from "@/components/ParticleBackground";
import PokemonSprite from "@/components/PokemonSprite";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import missingInGo from "@/data/missing-in-go.json";

const MISSING_COLOR = "#ff6b6b";

type MissingEntry = { id: number; name: string };
type MissingCategory = keyof typeof missingInGo;
type Exclusion = { id: string; category: string; pokemonId: number };

const MISSING_SECTIONS: { key: MissingCategory; title: string; hint: string }[] = [
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
    hint: "Espèce pouvant Gigamax dans les jeux principaux, mais pas encore dans GO.",
  },
  {
    key: "missingMega",
    title: "Sans Méga-Évolution",
    hint: "Méga-Évolution existante dans les jeux principaux, mais pas encore disponible dans GO.",
  },
];

export default function PasEncoreSortisPage() {
  const [search, setSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [exclusions, setExclusions] = useState<Exclusion[]>([]);
  const q = search.trim().toLowerCase();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setIsAdmin(!!data?.isAdmin))
      .catch(() => {});
    fetch("/api/missing-exclusions")
      .then((r) => (r.ok ? r.json() : []))
      .then(setExclusions)
      .catch(() => {});
  }, []);

  const isExcluded = (category: MissingCategory, pokemonId: number) =>
    exclusions.some((e) => e.category === category && e.pokemonId === pokemonId);

  const filterList = (category: MissingCategory, list: MissingEntry[]) =>
    list
      .filter((p) => !isExcluded(category, p.id))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true));

  const handleExclude = async (category: MissingCategory, entry: MissingEntry) => {
    try {
      const res = await fetch("/api/missing-exclusions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, pokemonId: entry.id }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setExclusions((prev) => [...prev, created]);
      toast.success(`${entry.name} retiré de la liste`);
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col" style={{ background: "#0b0700" }}>
      <ParticleBackground />
      <div className="scanlines" />

      <SiteNav active="/pas-encore-sortis" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        <header className="text-center mb-8">
          <h1
            style={{
              fontFamily: "Exo 2, sans-serif",
              fontSize: "clamp(1.4rem, 4vw, 2.2rem)",
              fontWeight: 900,
              color: MISSING_COLOR,
              textTransform: "uppercase",
              textShadow: "0 0 20px rgba(255,107,107,0.35)",
            }}
          >
            Pokémon pas encore disponibles
          </h1>
          <p style={{ color: "rgba(232,237,245,0.45)", fontSize: "0.85rem", marginTop: 6 }}>
            Pokémon, formes ou variantes chromatiques qui manquent encore à l&apos;appel.
          </p>
        </header>

        <div
          style={{
            background: "rgba(8,11,20,0.5)",
            backdropFilter: "blur(10px)",
            border: `1px solid ${MISSING_COLOR}18`,
            borderTop: `2px solid ${MISSING_COLOR}`,
            borderRadius: 10,
            padding: 20,
          }}
        >
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
              const list = filterList(key, missingInGo[key] as MissingEntry[]);
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
                        <div
                          key={p.id}
                          className="relative flex flex-col items-center gap-1"
                          style={{ padding: 6 }}
                        >
                          {isAdmin && (
                            <button
                              onClick={() => handleExclude(key, p)}
                              title="Retirer ce Pokémon de la liste"
                              style={{
                                position: "absolute",
                                top: -2,
                                right: -2,
                                width: 18,
                                height: 18,
                                borderRadius: "50%",
                                background: "rgba(255,107,107,0.15)",
                                border: "1px solid rgba(255,107,107,0.5)",
                                color: "#ff6b6b",
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                lineHeight: 1,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              x
                            </button>
                          )}
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
      </div>

      <SiteFooter />
    </div>
  );
}
