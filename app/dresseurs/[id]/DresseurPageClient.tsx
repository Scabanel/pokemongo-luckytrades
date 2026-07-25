"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import ParticleBackground from "@/components/ParticleBackground";
import PokemonCard from "@/components/PokemonCard";
import CardSkeleton from "@/components/CardSkeleton";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import type { PokeOption } from "@/components/AdminPanel";
import pokemonList from "@/data/pokemon.json";
import type { PokemonEntry, EntryCategory, Trainer } from "@/lib/types";
import { CATEGORIES, CATEGORY_DISPLAY_ORDER } from "@/lib/categories";
import { EMPTY_ENTRY_FILTERS, ENTRY_FILTER_CHIPS, matchesEntryFilters, type EntryFilters } from "@/lib/entryFilters";

// Chargé à la demande seulement (voir plus bas) : cette page publique est
// visitée par n'importe qui, y compris sans être connecté, et EntryForm
// entraîne dans son sillage tout le module AdminPanel (catalogues de
// costumes/fonds, ~1 Mo de JSON) qui ne sert qu'à l'admin qui édite.
const EntryForm = dynamic(() => import("@/components/AdminPanel").then((m) => ({ default: m.EntryForm })), {
  ssr: false,
});

function sortEntries(entries: PokemonEntry[]): PokemonEntry[] {
  return [...entries].sort((a, b) => {
    const pa = a.category === "want" ? (a.priority ?? 9999) : 9999;
    const pb = b.category === "want" ? (b.priority ?? 9999) : 9999;
    if (pa !== pb) return pa - pb;
    return a.pokemonId - b.pokemonId;
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

export default function DresseurPageClient({ id }: { id: string }) {
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [entries, setEntries] = useState<PokemonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<EntryCategory>("mirror");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<EntryFilters>(EMPTY_ENTRY_FILTERS);
  // Un admin qui consulte la liste publique d'un dresseur peut l'éditer
  // directement (changer un sprite, ajouter un fond...) pour l'aider, sans
  // devoir passer par son propre compte. Aucune capacité d'édition pour un
  // visiteur normal ou le dresseur lui-même sur cette page publique.
  const [isAdmin, setIsAdmin] = useState(false);
  const [allTrainers, setAllTrainers] = useState<Trainer[]>([]);
  const [editingEntry, setEditingEntry] = useState<PokemonEntry | null>(null);
  // Toutes les entrées de tous les dresseurs (pas juste celles de cette
  // page) : sert uniquement au bouton "Dispo chez N Dresseurs" sur les
  // tuiles "want" (voir components/PokemonCard.tsx), pour savoir chez qui
  // d'autre ce Pokémon est disponible.
  const [allEntries, setAllEntries] = useState<PokemonEntry[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/trainers/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/entries?trainerId=${id}`).then((r) => r.json()),
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/entries?completed=false").then((r) => r.json()),
    ])
      .then(([trainerData, trainerEntries, me, everyEntries]) => {
        if (!trainerData) {
          setNotFound(true);
          return;
        }
        setTrainer(trainerData);
        setEntries(trainerEntries);
        setAllEntries(everyEntries);
        if (me?.isAdmin) {
          setIsAdmin(true);
          fetch("/api/trainers")
            .then((r) => r.json())
            .then(setAllTrainers);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDeleteEntry = async (entryId: string) => {
    const prev = entries;
    setEntries((es) => es.filter((e) => e.id !== entryId));
    try {
      const res = await fetch(`/api/entries/${entryId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Entrée supprimée");
    } catch {
      setEntries(prev);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleCompleteEntry = async (entry: PokemonEntry) => {
    const prev = entries;
    setEntries((es) => es.filter((e) => e.id !== entry.id && e.id !== entry.linkedEntryId));
    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${entry.pokemonName} marqué comme échangé`);
    } catch {
      setEntries(prev);
      toast.error("Erreur");
    }
  };

  const handleQuantityChange = async (entry: PokemonEntry, delta: number) => {
    const current = entry.quantity ?? 1;
    const next = current + delta;
    if (next < 1) {
      handleCompleteEntry(entry);
      return;
    }
    const prev = entries;
    setEntries((es) => es.map((e) => (e.id === entry.id ? { ...e, quantity: next } : e)));
    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setEntries(prev);
      toast.error("Erreur lors de la mise à jour de la quantité");
    }
  };

  const refetchEntries = () => {
    fetch(`/api/entries?trainerId=${id}`)
      .then((r) => r.json())
      .then(setEntries);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Lien copié ! Colle-le sur Discord.");
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const handleCopyFriendCode = async () => {
    if (!trainer?.friendCode) return;
    try {
      await navigator.clipboard.writeText(trainer.friendCode);
      toast.success("Code ami copié !");
    } catch {
      toast.error("Impossible de copier le code ami");
    }
  };

  const wants = sortEntries(entries.filter((e) => e.category === "want"));
  const gives = sortEntries(entries.filter((e) => e.category === "give"));
  const mirrors = sortEntries(entries.filter((e) => e.category === "mirror"));

  const countByTab: Record<EntryCategory, number> = { mirror: mirrors.length, want: wants.length, give: gives.length };
  const entriesByTab: Record<EntryCategory, PokemonEntry[]> = { mirror: mirrors, want: wants, give: gives };
  const visibleEntries = entriesByTab[activeTab].filter((e) => matchesEntryFilters(e, search, filters));
  const anyFilterActive = search.trim() !== "" || Object.values(filters).some(Boolean);
  const activeColor = CATEGORIES[activeTab].color;

  if (!loading && notFound) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center" style={{ background: "#0b0700" }}>
        <ParticleBackground />
        <p style={{ color: "rgba(232,237,245,0.5)", marginBottom: 16 }}>Ce dresseur n&apos;existe pas.</p>
        <a href="/dresseurs" className="btn-secondary" style={{ textDecoration: "none" }}>Dresseurs</a>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col" style={{ background: "#0b0700" }}>
      <ParticleBackground />
      <div className="scanlines" />

      <SiteNav active="/dresseurs" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        <header className="text-center mb-8">
          <a href="/dresseurs" style={{ color: "rgba(232,237,245,0.35)", fontSize: "0.75rem", textDecoration: "none" }}>
            Tous les dresseurs
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
                Partager
              </button>
            )}
          </div>
          {trainer?.team && (
            <p style={{ color: "rgba(232,237,245,0.45)", fontSize: "0.85rem", marginTop: 4 }}>
              {trainer.team.charAt(0).toUpperCase() + trainer.team.slice(1)} · Niveau {trainer.level ?? "?"}
            </p>
          )}
          {trainer?.friendCode && (
            <div className="flex items-center justify-center gap-2" style={{ marginTop: 8 }}>
              <span style={{ color: "rgba(232,237,245,0.45)", fontSize: "0.85rem" }}>
                Code ami : {trainer.friendCode}
              </span>
              <button
                onClick={handleCopyFriendCode}
                className="btn-secondary"
                style={{ fontSize: "0.7rem", padding: "4px 10px" }}
              >
                Copier
              </button>
            </div>
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
            {ENTRY_FILTER_CHIPS.map(({ key, label }) => (
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
                    ? { background: "rgba(255, 215, 0,0.15)", borderColor: "rgba(255, 215, 0,0.4)", color: "#ffd700" }
                    : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", color: "rgba(232,237,245,0.5)" }),
                }}
              >
                {label}
              </button>
            ))}
            {anyFilterActive && (
              <button
                onClick={() => { setSearch(""); setFilters(EMPTY_ENTRY_FILTERS); }}
                className="btn-secondary"
                style={{ padding: "7px 14px", fontSize: "0.78rem" }}
              >
                Réinitialiser
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
                <PokemonCard
                  key={entry.id}
                  entry={entry}
                  allEntries={allEntries}
                  showTrainerBadge={false}
                  style={{ animationDelay: `${i * 0.04}s` }}
                  canEdit={isAdmin}
                  onEdit={isAdmin ? () => setEditingEntry(entry) : undefined}
                  onDelete={isAdmin ? () => handleDeleteEntry(entry.id) : undefined}
                  onComplete={isAdmin ? () => handleCompleteEntry(entry) : undefined}
                  onQuantityChange={isAdmin ? (delta) => handleQuantityChange(entry, delta) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {editingEntry && (
        <EntryForm
          mode="edit"
          entry={{ ...editingEntry, shiny: editingEntry.shiny ?? false, completed: editingEntry.completed ?? false }}
          trainers={allTrainers}
          pokeOptions={pokemonList as PokeOption[]}
          existingEntries={entries.map((e) => ({ ...e, shiny: e.shiny ?? false, completed: e.completed ?? false }))}
          isAdmin={isAdmin}
          myTrainerId={null}
          onClose={() => setEditingEntry(null)}
          onSaved={(updated: PokemonEntry) => {
            if (updated.linkedEntryId || editingEntry.linkedEntryId) {
              refetchEntries();
            } else {
              setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            }
            toast.success("Échange mis à jour");
            setEditingEntry(null);
          }}
        />
      )}

      <SiteFooter />
    </div>
  );
}
