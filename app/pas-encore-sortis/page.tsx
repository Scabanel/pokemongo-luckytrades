"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ParticleBackground from "@/components/ParticleBackground";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import missingInGo from "@/data/missing-in-go.json";
import pokemonList from "@/data/pokemon.json";

const MISSING_COLOR = "#ff6b6b";
// Dernier recours si spriteUrl est absent (jamais résolu, ou cas d'un ajout
// manuel qui n'en a pas) : official-artwork est maintenu à jour pour chaque
// nouvelle espèce.
const FALLBACK_SPRITE_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";
const NAME_BY_ID = new Map(pokemonList.map((p) => [p.id, p.frenchName]));

// spriteUrl/animated sont résolus et figés une fois pour toutes au moment de
// la génération (scripts/resolve-sprite.mjs), plutôt que retentés à chaque
// affichage par le navigateur (components/PokemonSprite.tsx) : cette
// dernière approche s'est révélée peu fiable pour cette page précise (une
// bonne partie des tuiles restait cassée indéfiniment sans jamais retenter
// l'URL suivante, observé en prod comme en local). Les entrées ajoutées à la
// main (voir Inclusion ci-dessous) n'ont pas de spriteUrl pré-résolu : le
// fallback official-artwork couvre ce cas.
type MissingEntry = { id: number; name: string; spriteUrl: string | null; animated: boolean };
type MissingCategory = keyof typeof missingInGo;
type Exclusion = { id: string; category: string; pokemonId: number };
type Inclusion = { id: string; category: string; pokemonId: number };

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
    key: "missingDynamax",
    title: "Sans Dynamax",
    hint: "Présents dans le jeu, mais leur forme Dynamax n'est pas encore sortie.",
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
  const [inclusions, setInclusions] = useState<Inclusion[]>([]);
  const [addCategory, setAddCategory] = useState<MissingCategory>("missingEntirely");
  const [addQuery, setAddQuery] = useState("");
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
    fetch("/api/missing-inclusions")
      .then((r) => (r.ok ? r.json() : []))
      .then(setInclusions)
      .catch(() => {});
  }, []);

  const isExcluded = (category: MissingCategory, pokemonId: number) =>
    exclusions.some((e) => e.category === category && e.pokemonId === pokemonId);

  const buildList = (category: MissingCategory): (MissingEntry & { inclusionId?: string })[] => {
    const base = (missingInGo[category] as MissingEntry[]).filter((p) => !isExcluded(category, p.id));
    const manual = inclusions
      .filter((inc) => inc.category === category && !base.some((p) => p.id === inc.pokemonId))
      .map((inc) => ({
        id: inc.pokemonId,
        name: NAME_BY_ID.get(inc.pokemonId) ?? `#${inc.pokemonId}`,
        spriteUrl: null,
        animated: false,
        inclusionId: inc.id,
      }));
    return [...base, ...manual]
      .sort((a, b) => a.id - b.id)
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true));
  };

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

  const handleRemoveInclusion = async (inclusionId: string, name: string) => {
    try {
      const res = await fetch(`/api/missing-inclusions/${inclusionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setInclusions((prev) => prev.filter((inc) => inc.id !== inclusionId));
      toast.success(`${name} retiré de la liste`);
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleAdd = async (pokemonId: number, name: string) => {
    try {
      const res = await fetch("/api/missing-inclusions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: addCategory, pokemonId }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setInclusions((prev) => [...prev, created]);
      setAddQuery("");
      toast.success(`${name} ajouté à la liste`);
    } catch {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const addQueryTrimmed = addQuery.trim().toLowerCase();
  const addMatches =
    addQueryTrimmed.length > 0
      ? pokemonList.filter((p) => p.frenchName.toLowerCase().includes(addQueryTrimmed)).slice(0, 8)
      : [];

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

        {isAdmin && (
          <div
            className="relative flex flex-wrap items-center gap-2 mb-4"
            style={{
              background: "rgba(255,107,107,0.06)",
              border: "1px solid rgba(255,107,107,0.25)",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <select
              value={addCategory}
              onChange={(e) => setAddCategory(e.target.value as MissingCategory)}
              className="glass-input"
              style={{ maxWidth: 220 }}
            >
              {MISSING_SECTIONS.map(({ key, title }) => (
                <option key={key} value={key}>{title}</option>
              ))}
            </select>
            <div className="relative" style={{ flex: "1 1 220px", maxWidth: 280 }}>
              <input
                type="text"
                value={addQuery}
                onChange={(e) => setAddQuery(e.target.value)}
                placeholder="Ajouter un Pokémon manquant..."
                className="glass-input"
                style={{ width: "100%" }}
              />
              {addMatches.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    background: "#141926",
                    border: "1px solid rgba(255,107,107,0.3)",
                    borderRadius: 10,
                    zIndex: 20,
                    overflow: "hidden",
                  }}
                >
                  {addMatches.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAdd(p.id, p.frenchName)}
                      style={{
                        width: "100%", textAlign: "left", padding: "8px 12px",
                        background: "transparent", border: "none", cursor: "pointer",
                        color: "#e8edf5", fontSize: "0.85rem",
                      }}
                    >
                      {p.frenchName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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
              const list = buildList(key);
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
                              onClick={() =>
                                p.inclusionId
                                  ? handleRemoveInclusion(p.inclusionId, p.name)
                                  : handleExclude(key, p)
                              }
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
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.spriteUrl ?? `${FALLBACK_SPRITE_BASE}/${p.id}.png`}
                            alt={p.name}
                            width={76}
                            height={76}
                            loading="lazy"
                            style={{ width: 76, height: 76, objectFit: "contain", imageRendering: "pixelated" }}
                            onError={(e) => {
                              const img = e.currentTarget;
                              const fallback = `${FALLBACK_SPRITE_BASE}/${p.id}.png`;
                              if (img.src !== fallback) img.src = fallback;
                            }}
                          />
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
