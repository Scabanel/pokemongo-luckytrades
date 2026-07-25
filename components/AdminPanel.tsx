"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import PokemonSprite from "./PokemonSprite";
import PokemonCard from "./PokemonCard";
import CardSkeleton from "./CardSkeleton";
import pokemonList from "@/data/pokemon.json";
import costumeCatalog from "@/data/costumes.json";
import backgroundCatalog from "@/data/backgrounds.json";
import validatedBackgrounds from "@/data/pokemon-backgrounds.json";
import type { Trainer, PokemonEntry as SharedPokemonEntry, EntryCategory } from "@/lib/types";
import { CATEGORIES, CATEGORY_DISPLAY_ORDER } from "@/lib/categories";
import { createClient } from "@/lib/supabase/client";
import { EMPTY_ENTRY_FILTERS, ENTRY_FILTER_CHIPS, matchesEntryFilters, type EntryFilters } from "@/lib/entryFilters";
import BulkAddPicker from "./BulkAddPicker";
import { isGoIconUrl, GO_ICON_CROP_STYLE } from "@/lib/spriteCrop";

// La liste des dresseurs en admin inclut toujours le compte d'entrées
// (contrairement à PokemonEntry.trainer ailleurs, qui n'en a pas besoin).
type TrainerWithCount = Trainer & { _count: { entries: number } };

// Les champs requis ici (shiny/completed) sont optionnels dans le type
// partagé mais toujours renvoyés par l'API entries — on les rend requis
// localement pour éviter des vérifications `?? false` partout dans ce fichier.
interface PokemonEntry extends SharedPokemonEntry {
  shiny: boolean;
  completed: boolean;
}

export interface PokeOption {
  name: string;       // English (internal, for pokemonId resolution)
  id: number;
  frenchName: string; // French (displayed + stored as pokemonName)
}

interface AdminPanelProps {
  onLogout: () => void;
}

// Options du sélecteur de catégorie dans les formulaires d'ajout/modification
// (dupliqué à l'identique dans les deux modales avant cette extraction).
// La couleur vient de lib/categories.ts ; le libellé compact ("Miroir") et
// la teinte "active" restent spécifiques à ce composant.
const CATEGORY_PICKER_OPTIONS = [
  { val: "want" as const, label: "Je recherche", active: "rgba(78,168,255,0.15)", c: CATEGORIES.want.color },
  { val: "give" as const, label: "Je peux donner", active: "rgba(255,217,61,0.15)", c: CATEGORIES.give.color },
  { val: "mirror" as const, label: "Miroir", active: "rgba(180,100,255,0.15)", c: CATEGORIES.mirror.color },
];

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [entries, setEntries] = useState<PokemonEntry[]>([]);
  const [trainers, setTrainers] = useState<TrainerWithCount[]>([]);
  const [pokeOptions, setPokeOptions] = useState<PokeOption[]>([]);
  const [me, setMe] = useState<{ trainer: Trainer | null; isAdmin: boolean }>({ trainer: null, isAdmin: false });
  const [activeTab, setActiveTab] = useState<"entries" | "trainers" | "account">("entries");
  const [activeCategory, setActiveCategory] = useState<EntryCategory>("mirror");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PokemonEntry | null>(null);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [newTrainerName, setNewTrainerName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<EntryFilters>(EMPTY_ENTRY_FILTERS);
  // Bouton d'ajout flottant : au-delà d'un scroll, remonter tout en haut pour
  // ajouter un Pokémon devient vite pénible sur une longue liste.
  const [showFloatingAdd, setShowFloatingAdd] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowFloatingAdd(window.scrollY > 320);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isAdmin = me.isAdmin;
  const myTrainerId = me.trainer?.id ?? null;
  const canEditEntry = useCallback(
    (entry: PokemonEntry) => isAdmin || entry.trainer?.id === myTrainerId,
    [isAdmin, myTrainerId]
  );

  const fetchData = useCallback(async () => {
    const [eRes, tRes, meRes] = await Promise.all([
      fetch("/api/entries?completed=false"),
      fetch("/api/trainers"),
      fetch("/api/auth/me"),
    ]);
    setEntries(await eRes.json());
    setTrainers(await tRes.json());
    if (meRes.ok) {
      const meData = await meRes.json();
      setMe({ trainer: meData.trainer, isAdmin: meData.isAdmin });
    }
    setLoadingEntries(false);
  }, []);

  useEffect(() => {
    fetchData();
    // Liste des Pokémon (FR/EN) figée dans le repo (data/pokemon.json) : plus besoin
    // d'appeler PokeAPI + GraphQL à chaque ouverture de l'admin. Regénérer avec
    // `npm run gen:pokemon` si une nouvelle génération de Pokémon sort.
    setPokeOptions(pokemonList as PokeOption[]);
  }, [fetchData]);

  // Retire de la sélection les entrées qui ont disparu de la liste (marquées
  // échangées ou supprimées individuellement pendant qu'elles étaient sélectionnées).
  useEffect(() => {
    setSelectedIds((prev) => {
      const validIds = new Set(entries.map((e) => e.id));
      const next = new Set(Array.from(prev).filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [entries]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    onLogout();
  };

  const handleDelete = async (id: string) => {
    const prev = entries;
    setEntries((e) => e.filter((x) => x.id !== id));

    try {
      const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Entrée supprimée");
    } catch {
      setEntries(prev);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleComplete = async (entry: PokemonEntry) => {
    const prev = entries;
    // Une entrée liée (want<->give, voir Item 7) est marquée échangée des
    // deux côtés par le serveur : la retirer aussi localement évite de
    // laisser sa "moitié" affichée jusqu'au prochain rechargement.
    setEntries((e) => e.filter((x) => x.id !== entry.id && x.id !== entry.linkedEntryId));

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

  // Décrémente/incrémente la quantité directement depuis la liste (ex: donner
  // 1 des 20 Mewtwo restants) sans ouvrir la modale d'édition. À 0, propose
  // de marquer l'entrée comme échangée plutôt que de laisser une quantité
  // négative ou nulle affichée.
  const handleQuantityChange = async (entry: PokemonEntry, delta: number) => {
    const current = entry.quantity ?? 1;
    const next = current + delta;
    if (next < 1) {
      handleComplete(entry);
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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectSection = (ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      const next = new Set(prev);
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setBulkDeleteConfirm(false);
  };

  const handleBulkComplete = async () => {
    const ids = Array.from(selectedIds);
    setEntries((e) => e.filter((x) => !selectedIds.has(x.id)));
    clearSelection();

    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/entries/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: true }),
        }).then((res) => {
          if (!res.ok) throw new Error();
        })
      )
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      toast.error(`${failed} entrée${failed > 1 ? "s n'ont" : " n'a"} pas pu être marquée${failed > 1 ? "s" : ""} échangée${failed > 1 ? "s" : ""}`);
      fetchData();
    } else {
      toast.success(`${ids.length} entrée${ids.length > 1 ? "s" : ""} marquée${ids.length > 1 ? "s" : ""} échangée${ids.length > 1 ? "s" : ""}`);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    setEntries((e) => e.filter((x) => !selectedIds.has(x.id)));
    clearSelection();

    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/entries/${id}`, { method: "DELETE" }).then((res) => {
          if (!res.ok) throw new Error();
        })
      )
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      toast.error(`${failed} entrée${failed > 1 ? "s n'ont" : " n'a"} pas pu être supprimée${failed > 1 ? "s" : ""}`);
      fetchData();
    } else {
      toast.success(`${ids.length} entrée${ids.length > 1 ? "s" : ""} supprimée${ids.length > 1 ? "s" : ""}`);
    }
  };

  const handleAddTrainer = async () => {
    if (!newTrainerName.trim()) return;
    try {
      const res = await fetch("/api/trainers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTrainerName.trim() }),
      });
      if (!res.ok) throw new Error();
      const t = await res.json();
      setTrainers((prev) => {
        const exists = prev.find((x) => x.id === t.id);
        return exists ? prev : [...prev, t].sort((a, b) => a.name.localeCompare(b.name));
      });
      setNewTrainerName("");
      toast.success(`Dresseur "${t.name}" ajouté`);
    } catch {
      toast.error("Erreur lors de l'ajout du dresseur");
    }
  };

  const handleDeleteTrainer = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/trainers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTrainers((prev) => prev.filter((t) => t.id !== id));
      setEntries((prev) => prev.map((e) => e.trainer?.id === id ? { ...e, trainer: null } : e));
      toast.success(`Dresseur "${name}" supprimé`);
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const sortEntries = (list: PokemonEntry[]) =>
    [...list].sort((a, b) => {
      const pa = a.category === "want" ? (a.priority ?? 9999) : 9999;
      const pb = b.category === "want" ? (b.priority ?? 9999) : 9999;
      if (pa !== pb) return pa - pb;
      return a.pokemonId - b.pokemonId;
    });

  const wants = sortEntries(entries.filter((e) => e.category === "want"));
  const gives = sortEntries(entries.filter((e) => e.category === "give"));
  const mirrors = sortEntries(entries.filter((e) => e.category === "mirror"));

  // Uniquement les entrées du dresseur connecté, même pour l'admin.
  const myWants = wants.filter((e) => e.trainer?.id === myTrainerId);
  const myGives = gives.filter((e) => e.trainer?.id === myTrainerId);
  const myMirrors = mirrors.filter((e) => e.trainer?.id === myTrainerId);

  const listWants = myWants.filter((e) => matchesEntryFilters(e, search, filters));
  const listGives = myGives.filter((e) => matchesEntryFilters(e, search, filters));
  const listMirrors = myMirrors.filter((e) => matchesEntryFilters(e, search, filters));
  const anyFilterActive = search.trim() !== "" || Object.values(filters).some(Boolean);

  // Une seule catégorie visible à la fois (mirror/want/give), comme sur la
  // page publique d'un dresseur : plus lisible qu'empiler les 3 sections.
  const listByCategory: Record<EntryCategory, PokemonEntry[]> = { mirror: listMirrors, want: listWants, give: listGives };
  const countByCategory: Record<EntryCategory, number> = {
    mirror: myMirrors.length,
    want: myWants.length,
    give: myGives.length,
  };
  const activeCategoryColor = CATEGORIES[activeCategory].color;

  return (
    <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
      {/* Barre d'outils admin : onglets de section + actions de compte.
          Volontairement discrète (petits boutons compacts) pour laisser la
          place à l'en-tête façon page publique juste en dessous. */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {(["entries", ...(isAdmin ? (["trainers"] as const) : []), "account"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "7px 16px",
                borderRadius: 10,
                fontFamily: "Exo 2, sans-serif",
                fontWeight: 600,
                fontSize: "0.78rem",
                cursor: "pointer",
                border: "1px solid",
                transition: "all 0.2s",
                ...(activeTab === tab
                  ? {
                      background: "rgba(255, 215, 0,0.15)",
                      borderColor: "rgba(255, 215, 0,0.4)",
                      color: "#ffd700",
                    }
                  : {
                      background: "rgba(255,255,255,0.04)",
                      borderColor: "rgba(255,255,255,0.1)",
                      color: "#b0bac8",
                    }),
              }}
            >
              {tab === "entries"
              ? `Mes échanges (${myMirrors.length + myWants.length + myGives.length})`
              : tab === "trainers"
              ? `Dresseurs (${trainers.length})`
              : "Mon compte"}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href="/dresseurs" className="btn-secondary" style={{ textDecoration: "none", fontSize: "0.8rem", padding: "7px 14px" }}>
            Dresseurs
          </a>
          <button onClick={() => setShowAddForm(true)} className="btn-primary" style={{ fontSize: "0.8rem", padding: "7px 14px" }}>
            +Ajouter un Pokémon
          </button>
          <button onClick={() => setShowBulkAdd(true)} className="btn-secondary" style={{ fontSize: "0.8rem", padding: "7px 14px" }}>
            Ajouter plusieurs Pokémon
          </button>
          <button onClick={handleLogout} className="btn-danger" style={{ fontSize: "0.8rem", padding: "7px 14px" }}>
            Déconnexion
          </button>
        </div>
      </div>

      {/* Entries tab (mes échanges) : en-tête et disposition reprennent la
          page publique d'un dresseur (app/dresseurs/[id]) pour que "Mon
          espace" ressemble à ce que voit n'importe quel visiteur. */}
      {activeTab === "entries" && (
        <>
          <header className="text-center mb-8">
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
              {me.trainer?.name ?? "Mon espace"}
            </h1>
            <p style={{ color: "rgba(232,237,245,0.45)", fontSize: "0.85rem", marginTop: 4 }}>
              {me.trainer?.team
                ? `${me.trainer.team.charAt(0).toUpperCase() + me.trainer.team.slice(1)} · Niveau ${me.trainer.level ?? "?"}`
                : "Gère ta liste d'échanges"}
            </p>
          </header>

          <div className="flex gap-2 mb-5 flex-wrap justify-center">
            {CATEGORY_DISPLAY_ORDER.map((key) => (
              <button
                key={key}
                onClick={() => { setActiveCategory(key); clearSelection(); }}
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
                  ...(activeCategory === key
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
                <span>{CATEGORIES[key].label}</span>
                <span
                  style={{
                    background: activeCategory === key ? `${CATEGORIES[key].color}18` : "rgba(255,255,255,0.05)",
                    border: `1px solid ${activeCategory === key ? `${CATEGORIES[key].color}38` : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 4,
                    padding: "1px 7px",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: activeCategory === key ? CATEGORIES[key].color : "rgba(232,237,245,0.3)",
                  }}
                >
                  {loadingEntries ? "…" : countByCategory[key]}
                </span>
              </button>
            ))}
          </div>

          {!loadingEntries && (
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

          {selectedIds.size > 0 && (
            <div
              className="flex items-center gap-3 flex-wrap p-3 mb-5"
              style={{
                background: "rgba(255, 215, 0,0.06)",
                border: "1px solid rgba(255, 215, 0,0.25)",
                borderRadius: 12,
              }}
            >
              <span style={{ fontFamily: "Exo 2, sans-serif", fontWeight: 700, color: "#ffd700", fontSize: "0.85rem" }}>
                {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
              </span>
              <button onClick={handleBulkComplete} className="btn-success">
                Marquer échangé{selectedIds.size > 1 ? "s" : ""}
              </button>
              {bulkDeleteConfirm ? (
                <>
                  <span style={{ fontSize: "0.8rem", color: "#ff6b6b" }}>
                    Supprimer {selectedIds.size} entrée{selectedIds.size > 1 ? "s" : ""} ?
                  </span>
                  <button onClick={handleBulkDelete} className="btn-danger">
                    Oui
                  </button>
                  <button onClick={() => setBulkDeleteConfirm(false)} className="btn-secondary" style={{ padding: "6px 12px" }}>
                    Non
                  </button>
                </>
              ) : (
                <button onClick={() => setBulkDeleteConfirm(true)} className="btn-danger">
                  Supprimer
                </button>
              )}
              <button onClick={clearSelection} className="btn-secondary" style={{ padding: "6px 12px", marginLeft: "auto" }}>
                Annuler la sélection
              </button>
            </div>
          )}

          <div
            style={{
              background: "rgba(8,11,20,0.5)",
              backdropFilter: "blur(10px)",
              border: `1px solid ${activeCategoryColor}18`,
              borderTop: `2px solid ${activeCategoryColor}`,
              borderRadius: 10,
              padding: 20,
              minHeight: 300,
            }}
          >
            <EntrySection
              entries={listByCategory[activeCategory]}
              loading={loadingEntries}
              showTrainerBadge={false}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectSection}
              onDelete={handleDelete}
              onComplete={handleComplete}
              onQuantityChange={handleQuantityChange}
              onEdit={setEditingEntry}
              canEditEntry={canEditEntry}
            />
          </div>
        </>
      )}

      {/* Trainers tab */}
      {activeTab === "trainers" && (
        <div
          className="glass-card p-6"
          style={{ maxWidth: 500 }}
        >
          <h2
            style={{
              fontFamily: "Exo 2, sans-serif",
              fontWeight: 700,
              color: "#ffd700",
              marginBottom: 16,
            }}
          >
            Gestion des dresseurs
          </h2>

          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={newTrainerName}
              onChange={(e) => setNewTrainerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTrainer()}
              className="glass-input"
              placeholder="Nom du dresseur..."
            />
            <button onClick={handleAddTrainer} className="btn-primary" style={{ whiteSpace: "nowrap" }}>
              Ajouter
            </button>
          </div>

          <div className="space-y-2">
            {trainers.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "#ffd70020",
                      border: "1px solid #ffd70040",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "#ffd700",
                      fontFamily: "Exo 2, sans-serif",
                    }}
                  >
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t.name}</div>
                    <div style={{ color: "rgba(232,237,245,0.4)", fontSize: "0.75rem" }}>
                      {t._count.entries} Pokémon à échanger
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteTrainer(t.id, t.name)}
                  className="btn-danger"
                  style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                >
                  Supprimer
                </button>
              </div>
            ))}
            {trainers.length === 0 && (
              <p style={{ color: "rgba(232,237,245,0.3)", textAlign: "center", padding: 16 }}>
                Aucun dresseur enregistré
              </p>
            )}
          </div>
        </div>
      )}

      {/* Account tab */}
      {activeTab === "account" && (
        <MyAccountPanel
          trainer={me.trainer}
          onSaved={(updated) => setMe((m) => ({ ...m, trainer: updated }))}
        />
      )}

      {/* Bouton d'ajout flottant, visible dès qu'on a scrollé */}
      {activeTab === "entries" && showFloatingAdd && !showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary"
          style={{
            position: "fixed",
            bottom: "calc(var(--footer-height) + 16px)",
            right: 20,
            zIndex: 150,
            borderRadius: 999,
            padding: "14px 22px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
          }}
        >
          +Ajouter un Pokémon
        </button>
      )}

      {/* Add form modal */}
      {showAddForm && (
        <EntryForm
          mode="add"
          defaultCategory={activeCategory}
          trainers={trainers}
          pokeOptions={pokeOptions}
          existingEntries={entries}
          isAdmin={isAdmin}
          myTrainerId={myTrainerId}
          onClose={() => setShowAddForm(false)}
          onSaved={(entry) => {
            if (entry.linkedEntryId) {
              // Idem édition : l'entrée liée à SOI a aussi été mise à jour
              // côté serveur, un simple ajout local la laisserait obsolète.
              fetchData();
            } else {
              setEntries((prev) => [entry, ...prev]);
            }
            toast.success(`${entry.pokemonName} ajouté !`);
            // La modale reste ouverte pour enchaîner les ajouts (ex: après une
            // session de jeu avec plusieurs échanges) — elle se ferme via
            // le bouton "Terminé" ou le clic en dehors.
          }}
        />
      )}

      {/* Bulk add picker */}
      {showBulkAdd && (
        <BulkAddPicker
          defaultCategory={activeCategory}
          trainerId={myTrainerId}
          onClose={() => setShowBulkAdd(false)}
          onAdded={() => {
            fetchData();
            setShowBulkAdd(false);
          }}
        />
      )}

      {/* Edit modal */}
      {editingEntry && (
        <EntryForm
          mode="edit"
          entry={editingEntry}
          trainers={trainers}
          pokeOptions={pokeOptions}
          existingEntries={entries}
          isAdmin={isAdmin}
          myTrainerId={myTrainerId}
          onClose={() => setEditingEntry(null)}
          onSaved={(updated) => {
            // Un lien want<->give synchronise aussi l'autre entrée côté
            // serveur (Pokémon échangé, partenaire) : un simple patch local
            // de l'entrée éditée laisserait son "autre moitié" affichée avec
            // des données obsolètes tant que la page n'est pas rechargée.
            if (updated.linkedEntryId || editingEntry.linkedEntryId) {
              fetchData();
            } else {
              setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            }
            toast.success("Échange mis à jour");
            setEditingEntry(null);
          }}
        />
      )}
    </div>
  );
}

function MyAccountPanel({
  trainer,
  onSaved,
}: {
  trainer: Trainer | null;
  onSaved: (trainer: Trainer) => void;
}) {
  const [team, setTeam] = useState(trainer?.team ?? "");
  const [level, setLevel] = useState(trainer?.level != null ? String(trainer.level) : "");
  const [friendCode, setFriendCode] = useState(trainer?.friendCode ?? "");
  const [spriteStyle, setSpriteStyle] = useState(trainer?.preferredSpriteStyle ?? "static");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTeam(trainer?.team ?? "");
    setLevel(trainer?.level != null ? String(trainer.level) : "");
    setFriendCode(trainer?.friendCode ?? "");
    setSpriteStyle(trainer?.preferredSpriteStyle ?? "static");
  }, [trainer]);

  if (!trainer) {
    return (
      <div className="glass-card p-6" style={{ maxWidth: 500 }}>
        <p style={{ color: "rgba(232,237,245,0.4)" }}>
          Ton compte n&apos;est rattaché à aucun dresseur pour le moment. Contacte l&apos;admin.
        </p>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/trainers/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team: team || null,
          level: level ? Number(level) : null,
          friendCode: friendCode || null,
          preferredSpriteStyle: spriteStyle,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      onSaved(updated);
      toast.success("Profil mis à jour");
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6" style={{ maxWidth: 500 }}>
      <h2 style={{ fontFamily: "Exo 2, sans-serif", fontWeight: 700, color: "#ffd700", marginBottom: 16 }}>
        Mon compte ({trainer.name})
      </h2>
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div>
          <label className="field-label">ÉQUIPE</label>
          <select value={team} onChange={(e) => setTeam(e.target.value)} className="glass-input mt-1" required>
            <option value="" disabled>Choisis ton équipe</option>
            <option value="instinct">Instinct</option>
            <option value="mystic">Mystic</option>
            <option value="valor">Valor</option>
          </select>
        </div>
        <div>
          <label className="field-label">NIVEAU</label>
          <input
            type="number"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="glass-input mt-1"
            placeholder="1-80"
            min={1}
            max={80}
            required
            style={{ width: 120 }}
          />
        </div>
        <div>
          <label className="field-label">CODE AMI (optionnel)</label>
          <input
            type="text"
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value)}
            className="glass-input mt-1"
            placeholder="0000 0000 0000"
          />
        </div>
        <div>
          <label className="field-label">STYLE DE SPRITE PAR DÉFAUT</label>
          <select value={spriteStyle} onChange={(e) => setSpriteStyle(e.target.value)} className="glass-input mt-1">
            <option value="static">Statique (icône officielle Pokémon GO)</option>
            <option value="animated">Animé (Gen V / Showdown)</option>
          </select>
          <p style={{ fontSize: "0.7rem", color: "rgba(232,237,245,0.4)", marginTop: 4 }}>
            S&apos;applique instantanément à tous tes Pokémon (sauf ceux avec un sprite personnalisé).
          </p>
        </div>
        <button type="submit" className="btn-primary" disabled={loading} style={{ alignSelf: "flex-start" }}>
          {loading ? "Sauvegarde…" : "Sauvegarder"}
        </button>
      </form>
    </div>
  );
}

function EntrySection({
  entries,
  loading,
  showTrainerBadge,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onDelete,
  onComplete,
  onQuantityChange,
  onEdit,
  canEditEntry,
}: {
  entries: PokemonEntry[];
  loading: boolean;
  showTrainerBadge: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
  onDelete: (id: string) => void;
  onComplete: (entry: PokemonEntry) => void;
  onQuantityChange: (entry: PokemonEntry, delta: number) => void;
  onEdit: (entry: PokemonEntry) => void;
  canEditEntry: (entry: PokemonEntry) => boolean;
}) {
  const ids = entries.filter(canEditEntry).map((e) => e.id);
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
  const someSelected = !allSelected && ids.some((id) => selectedIds.has(id));

  return (
    <div>
      {/* Le nom + le compte de la catégorie active sont déjà affichés dans
          l'onglet de catégorie au-dessus : ici uniquement la sélection groupée. */}
      {ids.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <SelectAllCheckbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={() => onToggleSelectAll(ids)}
          />
          <span style={{ fontFamily: "Exo 2, sans-serif", fontSize: "0.78rem", color: "rgba(232,237,245,0.4)" }}>
            Tout sélectionner
          </span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : entries.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 24,
            color: "rgba(232,237,245,0.3)",
            background: "rgba(255,255,255,0.02)",
            borderRadius: 16,
            border: "1px dashed rgba(255,255,255,0.08)",
          }}
        >
          Aucune entrée
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {entries.map((entry) => {
            const editable = canEditEntry(entry);
            return (
              <PokemonCard
                key={entry.id}
                entry={entry}
                showTrainerBadge={showTrainerBadge}
                selectable={editable}
                selected={selectedIds.has(entry.id)}
                onToggleSelect={() => onToggleSelect(entry.id)}
                selectionActive={selectedIds.size > 0}
                canEdit={editable}
                onEdit={() => onEdit(entry)}
                onDelete={() => onDelete(entry.id)}
                onComplete={() => onComplete(entry)}
                onQuantityChange={(delta) => onQuantityChange(entry, delta)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function SelectAllCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#ffd700" }}
      aria-label="Tout sélectionner"
    />
  );
}

// Formulaire unique pour l'ajout et la modification d'un échange : avant cette
// fusion, AddEntryModal et EditEntryModal étaient ~85% identiques (catégorie,
// dresseur, en-échange-de, notes, tags, priorité, shiny, sprite) et toute
// modification d'un champ devait être répercutée à la main dans les deux.
// Seuls diffèrent : le sélecteur de Pokémon (uniquement à l'ajout, on ne
// change pas le Pokémon d'une entrée existante), le endpoint POST/PATCH,
// et le comportement "reste ouvert pour enchaîner" propre à l'ajout.
export type EntryFormProps =
  | {
      mode: "add";
      defaultCategory: EntryCategory;
      trainers: Trainer[];
      pokeOptions: PokeOption[];
      existingEntries: PokemonEntry[];
      isAdmin: boolean;
      myTrainerId: string | null;
      onClose: () => void;
      onSaved: (entry: PokemonEntry) => void;
    }
  | {
      mode: "edit";
      entry: PokemonEntry;
      trainers: Trainer[];
      pokeOptions: PokeOption[];
      existingEntries: PokemonEntry[];
      isAdmin: boolean;
      myTrainerId: string | null;
      onClose: () => void;
      onSaved: (entry: PokemonEntry) => void;
    };

export function EntryForm(props: EntryFormProps) {
  const { mode, trainers, pokeOptions, isAdmin, myTrainerId, onClose, onSaved, existingEntries } = props;
  const entry = mode === "edit" ? props.entry : undefined;

  const [form, setForm] = useState(() =>
    entry
      ? {
          pokemonName: entry.pokemonName,
          pokemonId: entry.pokemonId,
          category: entry.category as EntryCategory,
          trainerId: entry.trainer?.id ?? "",
          tradePartnerName: entry.tradePartnerName ?? "",
          tradeForPokemonName: entry.tradeForPokemonName ?? "",
          tradeForPokemonId: entry.tradeForPokemonId ?? 0,
          linkedEntryId: entry.linkedEntryId ?? (null as string | null),
          notes: entry.notes ?? "",
          shiny: entry.shiny ?? false,
          customSpriteUrl: entry.customSpriteUrl ?? (null as string | null),
          backgroundUrl: entry.backgroundUrl ?? (null as string | null),
          priority: entry.priority ?? (null as number | null),
          tags: parseTags(entry.tags),
          quantity: entry.quantity ?? 1,
        }
      : {
          pokemonName: "",
          pokemonId: 0,
          category: (mode === "add" ? props.defaultCategory : "want") as EntryCategory,
          // Par défaut sur soi-même, y compris pour l'admin : "Mon espace"
          // doit rester la même expérience simple pour tout le monde (pas
          // besoin de choisir un dresseur pour ajouter à sa propre liste).
          // Un compte non-admin ne peut de toute façon créer que sous son
          // propre dresseur, forcé côté serveur (app/api/entries/route.ts) ;
          // l'admin garde le champ DRESSEUR pour réassigner s'il le souhaite.
          trainerId: myTrainerId ?? "",
          tradePartnerName: "",
          tradeForPokemonName: "",
          tradeForPokemonId: 0,
          linkedEntryId: null as string | null,
          notes: "",
          shiny: false,
          customSpriteUrl: null as string | null,
          backgroundUrl: null as string | null,
          priority: null as number | null,
          tags: [] as string[],
          quantity: 1,
        }
  );
  const [loading, setLoading] = useState(false);
  const [pokeSearch, setPokeSearch] = useState("");
  const [tradeSearch, setTradeSearch] = useState(entry?.tradeForPokemonName ?? "");
  const [showPokeSuggestions, setShowPokeSuggestions] = useState(false);
  const [showTradeSuggestions, setShowTradeSuggestions] = useState(false);
  const [showPartnerSuggestions, setShowPartnerSuggestions] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  // "Plus d'options" reste replié par défaut pour réduire la friction d'un
  // ajout simple (le cas le plus fréquent) ; s'ouvre automatiquement en
  // modification si l'entrée a déjà l'un de ces champs renseigné, pour ne
  // jamais cacher une donnée existante sans que ce soit visible.
  const [showAdvanced, setShowAdvanced] = useState(() => {
    if (!entry) return false;
    return !!(
      entry.tradeForPokemonName ||
      entry.notes ||
      parseTags(entry.tags).length > 0 ||
      entry.priority ||
      (entry.quantity ?? 1) > 1 ||
      entry.customSpriteUrl ||
      entry.backgroundUrl
    );
  });
  // Compteurs incrémentés pour signaler à SpritePicker/BackgroundPicker de
  // s'ouvrir automatiquement quand on active un tag Costume/Dynamax/Gigamax
  // (sprite) ou Fond (fond d'événement) : simple changement de valeur détecté
  // par un useEffect côté picker, plutôt qu'un state "open" contrôlé par le
  // parent (éviterait de dupliquer toute la logique d'ouverture/fermeture).
  const [spriteAutoOpenKey, setSpriteAutoOpenKey] = useState(0);
  const [backgroundAutoOpenKey, setBackgroundAutoOpenKey] = useState(0);
  const pokeRef = useRef<HTMLDivElement>(null);
  const tradeRef = useRef<HTMLDivElement>(null);
  const partnerRef = useRef<HTMLDivElement>(null);
  const pokeInputRef = useRef<HTMLInputElement>(null);

  const pokeSuggestions = pokeSearch.length >= 2
    ? pokeOptions.filter((p) => p.frenchName.toLowerCase().includes(pokeSearch.toLowerCase())).slice(0, 8)
    : [];

  const tradeSuggestions = tradeSearch.length >= 2
    ? pokeOptions.filter((p) => p.frenchName.toLowerCase().includes(tradeSearch.toLowerCase())).slice(0, 8)
    : [];

  const partnerSuggestions = form.tradePartnerName.length >= 1
    ? trainers.filter((t) => t.name.toLowerCase().includes(form.tradePartnerName.toLowerCase())).slice(0, 8)
    : [];

  // Association automatique want <-> give (voir Item 7 du plan) : le
  // Pokémon qu'on reçoit (want) et celui qu'on donne en échange (give) sont
  // deux entrées à SOI de catégories opposées, pas un simple texte libre.
  // Choisir l'une lie les deux : la modif de l'une répercute automatiquement
  // sur l'autre (voir sync côté API POST/PATCH /api/entries).
  const oppositeCategory: EntryCategory | null =
    form.category === "want" ? "give" : form.category === "give" ? "want" : null;
  const linkableEntries =
    oppositeCategory && form.trainerId
      ? existingEntries.filter(
          (e) => e.trainer?.id === form.trainerId && e.category === oppositeCategory && e.id !== entry?.id
        )
      : [];
  const linkedEntry = form.linkedEntryId
    ? existingEntries.find((e) => e.id === form.linkedEntryId) ?? null
    : null;
  const linkSuggestions =
    tradeSearch.length >= 1
      ? linkableEntries.filter((le) => le.pokemonName.toLowerCase().includes(tradeSearch.toLowerCase())).slice(0, 8)
      : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "add") {
      if (!form.pokemonId || !form.pokemonName) {
        toast.error("Sélectionne un Pokémon valide");
        return;
      }
      if (form.category === "want") {
        // Un même numéro de Pokédex peut légitimement apparaître plusieurs
        // fois (formes/costumes différents : Zarbi A/B/C..., Deoxys Attaque/
        // Défense, Pikachu déguisé...) : le nom (variante) doit aussi
        // correspondre pour que ce soit un vrai doublon, pas juste le même
        // numéro national. Et surtout : ne comparer qu'à SES PROPRES entrées
        // — existingEntries contient celles de tout le monde (catalogue
        // partagé), comparer sans filtrer par dresseur bloquait un ajout dès
        // qu'un AUTRE dresseur avait déjà le même Pokémon dans sa liste.
        const duplicate = existingEntries!.find(
          (x) =>
            x.category === "want" &&
            x.trainer?.id === form.trainerId &&
            x.pokemonId === form.pokemonId &&
            !!x.shiny === form.shiny &&
            x.pokemonName.trim().toLowerCase() === form.pokemonName.trim().toLowerCase()
        );
        if (duplicate) {
          toast.error(`${form.pokemonName}${form.shiny ? " ✨ Shiny" : ""} est déjà dans "Je recherche"`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const payload = {
        pokemonName: form.pokemonName,
        pokemonId: form.pokemonId,
        category: form.category,
        shiny: form.shiny,
        customSpriteUrl: form.customSpriteUrl,
        backgroundUrl: form.backgroundUrl,
        trainerId: form.trainerId || null,
        tradePartnerName: form.tradePartnerName.trim() || null,
        tradeForPokemonName: form.tradeForPokemonName || null,
        tradeForPokemonId: form.tradeForPokemonId || null,
        linkedEntryId: form.linkedEntryId,
        notes: form.notes || null,
        priority: form.priority || null,
        tags: form.tags,
        quantity: form.quantity,
      };
      const res = mode === "add"
        ? await fetch("/api/entries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/entries/${entry!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      onSaved(saved);

      if (mode === "add") {
        setAddedCount((n) => n + 1);
        // Garde la catégorie + le dresseur (souvent identiques pour plusieurs
        // Pokémon d'affilée après une session de jeu) et ne réinitialise que
        // le reste, pour enchaîner les ajouts sans rouvrir la modale.
        setForm((f) => ({
          pokemonName: "",
          pokemonId: 0,
          category: f.category,
          trainerId: f.trainerId,
          tradePartnerName: f.tradePartnerName,
          tradeForPokemonName: "",
          tradeForPokemonId: 0,
          linkedEntryId: null,
          notes: "",
          shiny: false,
          customSpriteUrl: null,
          backgroundUrl: null,
          priority: null,
          tags: [],
          quantity: 1,
        }));
        setPokeSearch("");
        setTradeSearch("");
        pokeInputRef.current?.focus();
      }
    } catch {
      toast.error(mode === "add" ? "Erreur lors de l'ajout" : "Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay>
      {mode === "add" ? (
        <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: 20 }}>
          <h2
            style={{
              fontFamily: "Exo 2, sans-serif",
              fontWeight: 800,
              color: "#ffd700",
              fontSize: "1.3rem",
            }}
          >
            Ajouter un échange
          </h2>
          {addedCount > 0 && (
            <span
              className="animate-fade-in-up"
              style={{
                background: "rgba(255, 215, 0,0.12)",
                border: "1px solid rgba(255, 215, 0,0.35)",
                borderRadius: 999,
                padding: "3px 12px",
                fontSize: "0.75rem",
                fontWeight: 800,
                color: "#ffd700",
                fontFamily: "Exo 2, sans-serif",
              }}
            >
              {addedCount} ajouté{addedCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-5">
          <PokemonSprite pokemonId={entry!.pokemonId} alt={entry!.pokemonName} size={48} shiny={form.shiny} customSpriteUrl={form.customSpriteUrl} />
          <div>
            <h2
              style={{
                fontFamily: "Exo 2, sans-serif",
                fontWeight: 800,
                color: "#ffd700",
                fontSize: "1.2rem",
                textTransform: "capitalize",
              }}
            >
              Modifier: {entry!.pokemonName}
            </h2>
            <span
              style={{
                fontSize: "0.75rem",
                color: form.category === "want" ? "#4ea8ff" : form.category === "mirror" ? "#b464ff" : "#ffd93d",
                fontWeight: 600,
                fontFamily: "Exo 2, sans-serif",
              }}
            >
              {form.category === "want" ? "Je recherche" : form.category === "mirror" ? "Miroir" : "Je peux donner"}
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Category */}
        <div>
          <label className="field-label">CATÉGORIE</label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {CATEGORY_PICKER_OPTIONS.map(({ val, label, active, c }) => (
              <button
                key={val}
                type="button"
                onClick={() => setForm((f) => ({ ...f, category: val }))}
                style={{
                  flex: 1, minWidth: 100, padding: "8px 6px", borderRadius: 10,
                  border: "1px solid", cursor: "pointer", fontFamily: "Exo 2, sans-serif",
                  fontWeight: 600, fontSize: "0.8rem", transition: "all 0.2s",
                  ...(form.category === val
                    ? { background: active, borderColor: c, color: c }
                    : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#b0bac8" }),
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Pokémon selector — uniquement à l'ajout, le Pokémon d'une entrée existante ne change pas */}
        {mode === "add" && (
          <div ref={pokeRef} style={{ position: "relative" }}>
            <label className="field-label">POKÉMON</label>
            <div className="flex gap-2 items-center mt-1">
              {form.pokemonId > 0 && (
                <PokemonSprite pokemonId={form.pokemonId} alt={form.pokemonName} size={40} shiny={form.shiny} customSpriteUrl={form.customSpriteUrl} />
              )}
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  ref={pokeInputRef}
                  type="text"
                  value={pokeSearch}
                  onChange={(e) => {
                    setPokeSearch(e.target.value);
                    setShowPokeSuggestions(true);
                    if (!e.target.value) setForm((f) => ({ ...f, pokemonName: "", pokemonId: 0 }));
                  }}
                  onFocus={() => setShowPokeSuggestions(true)}
                  className="glass-input"
                  placeholder="Chercher un Pokémon..."
                  autoComplete="off"
                  autoFocus
                />
                {showPokeSuggestions && pokeSuggestions.length > 0 && (
                  <SuggestionDropdown
                    options={pokeSuggestions}
                    onSelect={(p) => {
                      setForm((f) => ({ ...f, pokemonName: p.frenchName, pokemonId: p.id }));
                      setPokeSearch(p.frenchName);
                      setShowPokeSuggestions(false);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dresseur : uniquement pour l'admin (un compte normal ne peut de
            toute façon créer que sous son propre dresseur, déjà forcé côté
            serveur : lui montrer un menu figé n'apporterait que du bruit). */}
        {isAdmin && (
          <div>
            <label className="field-label">DRESSEUR</label>
            <select
              value={form.trainerId}
              onChange={(e) => setForm((f) => ({ ...f, trainerId: e.target.value }))}
              className="glass-input mt-1"
            >
              <option value="">Aucun dresseur</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Échanger avec : qui est le partenaire de l'échange (pas le
            propriétaire de l'entrée, voir DRESSEUR ci-dessus). Champ texte
            libre avec suggestions parmi les dresseurs déjà présents, mais
            accepte aussi un pseudo qui n'existe pas encore. */}
        {(form.category === "mirror" || form.category === "give" || form.category === "want") && (
          <div ref={partnerRef} style={{ position: "relative" }}>
            <label className="field-label">
              {form.category === "mirror"
                ? "ÉCHANGER AVEC"
                : form.category === "give"
                ? "JE PEUX DONNER À"
                : "ÉCHANGER AVEC (qui te le donne)"}
            </label>
            <input
              type="text"
              value={form.tradePartnerName}
              onChange={(e) => {
                setForm((f) => ({ ...f, tradePartnerName: e.target.value }));
                setShowPartnerSuggestions(true);
              }}
              onFocus={() => setShowPartnerSuggestions(true)}
              className="glass-input mt-1"
              placeholder="Pseudo du dresseur..."
              autoComplete="off"
            />
            {showPartnerSuggestions && partnerSuggestions.length > 0 && (
              <div
                style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
                  background: "#141824", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10, marginTop: 4, maxHeight: 220, overflowY: "auto",
                }}
              >
                {partnerSuggestions.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, tradePartnerName: t.name }));
                      setShowPartnerSuggestions(false);
                    }}
                    className="flex items-center gap-2"
                    style={{
                      width: "100%", padding: "8px 12px", background: "none", border: "none",
                      cursor: "pointer", textAlign: "left", color: "#e8edf5",
                      fontFamily: "Exo 2, sans-serif", fontSize: "0.85rem",
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Shiny : reste visible par défaut, c'est le champ le plus souvent utilisé */}
        <div>
          <label className="field-label">SHINY</label>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, shiny: !f.shiny }))}
            style={{
              marginTop: 4,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 10,
              border: "1px solid",
              cursor: "pointer",
              fontFamily: "Exo 2, sans-serif",
              fontWeight: 600,
              fontSize: "0.85rem",
              transition: "all 0.2s",
              ...(form.shiny
                ? { background: "rgba(255,215,0,0.15)", borderColor: "rgba(255,215,0,0.5)", color: "#ffd700" }
                : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#b0bac8" }),
            }}
          >
            ✨ {form.shiny ? "Shiny activé" : "Pas shiny"}
          </button>
        </div>

        {/* Tags : liste fermée (voir SELECTABLE_TAGS), à côté de SHINY pour
            rester aussi accessible - ce sont les attributs les plus souvent
            utilisés pour filtrer/reconnaître une entrée. */}
        <div>
          <label className="field-label">TAGS</label>
          <div className="flex gap-2 flex-wrap mt-1">
            {SELECTABLE_TAGS.map(({ key, label }) => {
              const active = form.tags.includes(key);
              const c = getTagColor(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setForm((f) => ({
                      ...f,
                      tags: active ? f.tags.filter((t) => t !== key) : [...f.tags, key],
                    }));
                    // On n'ouvre la section concernée qu'en activant le tag
                    // (pas en le retirant), pour que le dresseur tombe
                    // directement sur le bon sprite/fond à choisir.
                    if (!active) {
                      setShowAdvanced(true);
                      if (key === "fond") setBackgroundAutoOpenKey((k) => k + 1);
                      else setSpriteAutoOpenKey((k) => k + 1);
                    }
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    border: "1px solid",
                    cursor: "pointer",
                    fontFamily: "Exo 2, sans-serif",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    transition: "all 0.2s",
                    ...(active
                      ? { background: c.bg, borderColor: c.border, color: c.text }
                      : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#b0bac8" }),
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Le reste (en échange de, notes, priorité, quantité, sprite,
            fond) est replié par défaut : un ajout simple n'a besoin que de
            catégorie + Pokémon + shiny, le reste est occasionnel. */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-start",
            padding: "6px 4px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#ffd700",
            fontFamily: "Exo 2, sans-serif",
            fontWeight: 700,
            fontSize: "0.8rem",
          }}
        >
          <span style={{ transform: showAdvanced ? "rotate(90deg)" : "none", transition: "transform 0.15s", display: "inline-block" }}>▸</span>
          {showAdvanced ? "Moins d'options" : "Plus d'options"}
        </button>

        {showAdvanced && (
          <>
            {/* Trade for */}
            <div ref={tradeRef} style={{ position: "relative" }}>
              <label className="field-label">EN ÉCHANGE DE</label>

              {linkedEntry ? (
                // Lié à une de tes propres entrées de l'autre catégorie (want
                // <-> give) : le Pokémon échangé est synchronisé automatiquement
                // des deux côtés, voir Item 7 du plan.
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <PokemonSprite
                    pokemonId={linkedEntry.pokemonId}
                    alt={linkedEntry.pokemonName}
                    size={40}
                    shiny={linkedEntry.shiny === true}
                    customSpriteUrl={linkedEntry.customSpriteUrl}
                  />
                  <span style={{ color: "#e8edf5", fontSize: "0.85rem" }}>{linkedEntry.pokemonName}</span>
                  {linkedEntry.shiny && (
                    <span style={{ fontSize: "0.7rem", color: "#ffd700" }}>✨ Shiny</span>
                  )}
                  {parseTags(linkedEntry.tags).map((tag) => (
                    <span key={tag} style={{ fontSize: "0.65rem", color: "rgba(232,237,245,0.5)", textTransform: "capitalize" }}>
                      {tag}
                    </span>
                  ))}
                  <span style={{ fontSize: "0.7rem", color: "rgba(232,237,245,0.4)" }}>
                    (lié à ton entrée « {oppositeCategory === "give" ? "Je peux donner" : "Je recherche"} »)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, linkedEntryId: null, tradeForPokemonName: "", tradeForPokemonId: 0 }));
                      setTradeSearch("");
                    }}
                    className="btn-secondary"
                    style={{ fontSize: "0.7rem", padding: "4px 10px" }}
                  >
                    Délier
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 items-center mt-1">
                  {form.tradeForPokemonId > 0 && (
                    <PokemonSprite pokemonId={form.tradeForPokemonId} alt={form.tradeForPokemonName} size={40} />
                  )}
                  <div style={{ flex: 1, position: "relative" }}>
                    <input
                      type="text"
                      value={tradeSearch}
                      onChange={(e) => {
                        setTradeSearch(e.target.value);
                        setShowTradeSuggestions(true);
                        if (!e.target.value) setForm((f) => ({ ...f, tradeForPokemonName: "", tradeForPokemonId: 0 }));
                      }}
                      onFocus={() => setShowTradeSuggestions(true)}
                      className="glass-input"
                      placeholder={
                        oppositeCategory
                          ? "Nom du Pokémon disponible à l'échange..."
                          : mode === "add"
                          ? "Pokémon en échange (optionnel)..."
                          : "Pokémon en échange..."
                      }
                      autoComplete="off"
                    />
                    {/* Pour want/give : propose uniquement ce que tu as déjà
                        disponible dans ta propre liste opposée, et lie les
                        deux entrées (voir Item 7 du plan). Pour miroir : pas
                        de lien possible, autocomplete générique sur le nom. */}
                    {oppositeCategory
                      ? showTradeSuggestions && linkSuggestions.length > 0 && (
                          <div
                            style={{
                              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
                              background: "#141926", border: "1px solid rgba(255,215,0,0.2)",
                              borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                            }}
                          >
                            {linkSuggestions.map((le) => {
                              const leTags = parseTags(le.tags);
                              return (
                                <button
                                  key={le.id}
                                  type="button"
                                  onClick={() => {
                                    setForm((f) => ({ ...f, linkedEntryId: le.id, tradeForPokemonName: le.pokemonName, tradeForPokemonId: le.pokemonId }));
                                    setTradeSearch(le.pokemonName);
                                    setShowTradeSuggestions(false);
                                  }}
                                  className="flex items-center gap-2"
                                  style={{
                                    width: "100%", padding: "8px 12px", background: "none", border: "none",
                                    cursor: "pointer", textAlign: "left", color: "#e8edf5",
                                    fontFamily: "Exo 2, sans-serif", fontSize: "0.85rem",
                                  }}
                                >
                                  <PokemonSprite
                                    pokemonId={le.pokemonId}
                                    alt={le.pokemonName}
                                    size={28}
                                    shiny={le.shiny === true}
                                    customSpriteUrl={le.customSpriteUrl}
                                  />
                                  <span className="flex flex-col">
                                    <span>{le.pokemonName}</span>
                                    {(le.shiny || leTags.length > 0) && (
                                      <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                        {le.shiny && (
                                          <span style={{ fontSize: "0.65rem", color: "#ffd700" }}>✨ Shiny</span>
                                        )}
                                        {leTags.map((tag) => (
                                          <span key={tag} style={{ fontSize: "0.65rem", color: "rgba(232,237,245,0.5)", textTransform: "capitalize" }}>
                                            {tag}
                                          </span>
                                        ))}
                                      </span>
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )
                      : showTradeSuggestions && tradeSuggestions.length > 0 && (
                          <SuggestionDropdown
                            options={tradeSuggestions}
                            onSelect={(p) => {
                              setForm((f) => ({ ...f, tradeForPokemonName: p.frenchName, tradeForPokemonId: p.id }));
                              setTradeSearch(p.frenchName);
                              setShowTradeSuggestions(false);
                            }}
                          />
                        )}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="field-label">{mode === "add" ? "NOTES (optionnel)" : "NOTES"}</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="glass-input mt-1"
                placeholder="Notes..."
              />
            </div>

            {/* Priority (want only) */}
            {form.category === "want" && (
              <div>
                <label className="field-label">PRIORITÉ (1–10, optionnel)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={form.priority ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value ? Number(e.target.value) : null }))}
                  className="glass-input mt-1"
                  placeholder="Ex : 1 = priorité max"
                  style={{ width: 180 }}
                />
              </div>
            )}

            {/* Quantité (give/mirror) — évite de dupliquer la même entrée N fois
                quand on a plusieurs exemplaires du même Pokémon à donner. */}
            {form.category !== "want" && (
              <div>
                <label className="field-label">QUANTITÉ</label>
                <input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: Math.max(1, Number(e.target.value) || 1) }))}
                  className="glass-input mt-1"
                  style={{ width: 120 }}
                />
              </div>
            )}

            {/* Sprite personnalisé */}
            {(mode === "edit" || form.pokemonId > 0) && (
              <div>
                <label className="field-label">SPRITE PERSONNALISÉ (optionnel)</label>
                <SpritePicker
                  pokemonId={mode === "edit" ? entry!.pokemonId : form.pokemonId}
                  pokemonName={mode === "edit" ? entry!.pokemonName : form.pokemonName}
                  currentUrl={form.customSpriteUrl}
                  shiny={form.shiny}
                  autoOpenKey={spriteAutoOpenKey}
                  onSelect={(url) => setForm((f) => ({ ...f, customSpriteUrl: url }))}
                />
              </div>
            )}

            {/* Fond d'événement (optionnel) */}
            <div>
              <label className="field-label">FOND D'ÉVÉNEMENT (optionnel)</label>
              <BackgroundPicker
                pokemonId={mode === "edit" ? entry!.pokemonId : form.pokemonId}
                currentUrl={form.backgroundUrl}
                autoOpenKey={backgroundAutoOpenKey}
                onSelect={(url) => setForm((f) => ({ ...f, backgroundUrl: url }))}
              />
            </div>
          </>
        )}

        <div className="flex gap-2 justify-end mt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            {mode === "add" ? (addedCount > 0 ? "Terminé" : "Annuler") : "Annuler"}
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {mode === "add" ? (loading ? "Ajout…" : "Ajouter") : (loading ? "Sauvegarde…" : "Sauvegarder")}
          </button>
        </div>
        {mode === "add" && addedCount > 0 && (
          <p style={{ textAlign: "center", fontSize: "0.75rem", color: "rgba(232,237,245,0.35)", margin: 0 }}>
            Continue à chercher pour enchaîner les ajouts, ou clique sur « Terminé ».
          </p>
        )}
      </form>
    </ModalOverlay>
  );
}

function SuggestionDropdown({
  options,
  onSelect,
}: {
  options: PokeOption[];
  onSelect: (p: PokeOption) => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 4px)",
        left: 0,
        right: 0,
        background: "#141926",
        border: "1px solid rgba(255, 215, 0,0.2)",
        borderRadius: 12,
        zIndex: 100,
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      {options.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect(p)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            color: "#e8edf5",
            fontSize: "0.85rem",
            transition: "background 0.15s",
            textTransform: "capitalize",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255, 215, 0,0.08)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`}
            alt={p.name}
            width={28}
            height={28}
            style={{ imageRendering: "pixelated" }}
          />
          <span>{p.frenchName}</span>
          <span style={{ marginLeft: "auto", color: "rgba(232,237,245,0.3)", fontSize: "0.75rem" }}>
            #{p.id}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

// ─── Sprite picker helpers ────────────────────────────────────────────────────

const SPRITE_PATHS: { path: string; label: string }[] = [
  { path: "versions.generation-v.black-white.animated.front_default", label: "Animé Gen V" },
  { path: "versions.generation-v.black-white.animated.front_shiny", label: "Animé Gen V ✨" },
  { path: "other.showdown.front_default", label: "Showdown" },
  { path: "other.showdown.front_shiny", label: "Showdown ✨" },
  { path: "front_default", label: "Front" },
  { path: "front_shiny", label: "Front ✨" },
  { path: "other.home.front_default", label: "HOME" },
  { path: "other.home.front_shiny", label: "HOME ✨" },
  { path: "other.official-artwork.front_default", label: "Artwork" },
  { path: "other.official-artwork.front_shiny", label: "Artwork ✨" },
];

function getByPath(obj: Record<string, unknown>, path: string): string | null {
  const keys = path.split(".");
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[k];
  }
  return typeof cur === "string" && cur.startsWith("http") ? cur : null;
}

function extractSprites(sprites: Record<string, unknown>, prefix: string): { url: string; label: string }[] {
  return SPRITE_PATHS
    .map(({ path, label }) => ({ url: getByPath(sprites, path), label: prefix ? `${prefix} (${label})` : label }))
    .filter((s): s is { url: string; label: string } => s.url !== null);
}

async function fetchAllSprites(pokemonId: number): Promise<{ url: string; label: string }[]> {
  // 1. Fetch species to get all varieties
  const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`);
  if (!speciesRes.ok) throw new Error("species not found");
  const species = await speciesRes.json();

  const varieties: { is_default: boolean; pokemon: { name: string; url: string } }[] = species.varieties ?? [];

  // 2. Fetch each variety in parallel (cap at 20 to avoid excessive calls)
  const toFetch = varieties.slice(0, 20);
  const results = await Promise.allSettled(
    toFetch.map((v) => fetch(v.pokemon.url).then((r) => r.json()))
  );

  const all: { url: string; label: string }[] = [];
  results.forEach((result, i) => {
    if (result.status !== "fulfilled") return;
    const data = result.value;
    const variety = toFetch[i];
    // Use short name: remove base pokemon prefix for readability
    const rawName = variety.pokemon.name;
    const baseName = species.name as string;
    const shortName = rawName === baseName ? "Base" : rawName.replace(`${baseName}-`, "");
    const label = variety.is_default ? "Base" : shortName;
    const sprites = extractSprites(data.sprites, label === "Base" ? "" : label);
    all.push(...sprites);
  });

  // Deduplicate by URL
  const seen = new Set<string>();
  return all.filter(({ url }) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

// ─── Costumes officiels Pokémon GO ────────────────────────────────────────────
// Catalogue généré depuis PokeMiners/pogo_assets (npm run gen:costumes) :
// remplace l'ancien système qui devinait ~24 suffixes Pokekalos à la main —
// ici ce sont les vraies icônes du jeu, avec tous les costumes historiques.

type CostumeEntry = { label: string; url: string };
const COSTUME_CATALOG = costumeCatalog as Record<string, CostumeEntry[]>;

function getOfficialCostumes(pokemonId: number): CostumeEntry[] {
  // Les Méga-Évolutions ne servent à rien dans cette appli (pas de mécanique
  // Méga dans les échanges/recherches Pokémon GO) : on les exclut partout.
  return (COSTUME_CATALOG[String(pokemonId)] ?? []).filter((c) => !c.label.startsWith("Mega"));
}

function SpritePicker({
  pokemonId,
  pokemonName,
  currentUrl,
  shiny = false,
  autoOpenKey,
  onSelect,
}: {
  pokemonId: number;
  pokemonName: string;
  currentUrl: string | null;
  shiny?: boolean;
  autoOpenKey?: number;
  onSelect: (url: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sprites, setSprites] = useState<{ url: string; label: string }[]>([]);
  const [fetched, setFetched] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [showCostumes, setShowCostumes] = useState(false);
  // Ne propose que la variante qui correspond au shiny coché sur le
  // formulaire : montrer des sprites non-shiny quand on cherche un sprite
  // shiny (et inversement) n'a jamais de sens.
  const matchesShiny = (label: string) => label.includes("✨") === shiny;
  const visibleSprites = sprites.filter((s) => matchesShiny(s.label));
  const officialCostumes = getOfficialCostumes(pokemonId).filter((c) => matchesShiny(c.label));

  // Reset cache when Pokémon changes
  useEffect(() => {
    setFetched(false);
    setSprites([]);
  }, [pokemonId]);

  // Activer un tag Costume/Dynamax/Gigamax doit ouvrir directement ce picker
  // sur la section "Costumes officiels Pokémon GO" (c'est là que vivent ces
  // variantes), pour que le dresseur tombe sur le bon sprite sans chercher.
  useEffect(() => {
    if (!autoOpenKey) return;
    setShowCostumes(true);
    handleOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenKey]);

  const handleOpen = async () => {
    setOpen(true);
    if (fetched) return;
    setFetching(true);
    try {
      const all = await fetchAllSprites(pokemonId);
      setSprites(all);
    } catch {
      // Fallback to single pokemon fetch
      try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
        const data = await res.json();
        setSprites(extractSprites(data.sprites, ""));
      } catch {
        setSprites([]);
      }
    } finally {
      setFetching(false);
      setFetched(true);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 4 }}>
        {currentUrl && (
          <span style={{ display: "inline-block", width: 48, height: 48, overflow: "hidden", background: "rgba(255,255,255,0.05)", borderRadius: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentUrl}
              alt="sprite"
              style={{
                width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated",
                ...(isGoIconUrl(currentUrl) ? GO_ICON_CROP_STYLE : {}),
              }}
            />
          </span>
        )}
        <button
          type="button"
          onClick={handleOpen}
          style={{
            padding: "6px 14px", borderRadius: 10, cursor: "pointer",
            background: "rgba(255, 215, 0,0.08)", border: "1px solid rgba(255, 215, 0,0.25)",
            color: "#ffd700", fontFamily: "Exo 2, sans-serif", fontWeight: 600, fontSize: "0.8rem",
          }}
        >
          Sélectionner sprite
        </button>
        {currentUrl && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            style={{
              padding: "6px 10px", borderRadius: 10, cursor: "pointer",
              background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.25)",
              color: "#ff6b6b", fontFamily: "Exo 2, sans-serif", fontWeight: 600, fontSize: "0.8rem",
            }}
          >
            Retirer
          </button>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: "rgba(11,15,26,0.92)", backdropFilter: "blur(10px)", zIndex: 400 }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            className="glass-card overflow-y-auto"
            style={{ maxWidth: 580, width: "100%", maxHeight: "calc(100dvh - 32px)", padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontFamily: "Exo 2, sans-serif", color: "#ffd700", fontWeight: 700, fontSize: "1.1rem" }}>
                Sprites : <span style={{ textTransform: "capitalize" }}>{pokemonName}</span>
              </h3>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#e8edf5", cursor: "pointer", fontSize: "0.8rem", padding: "4px 10px" }}>Fermer</button>
            </div>

            {fetching ? (
              <div style={{ textAlign: "center", padding: 32, color: "rgba(232,237,245,0.4)" }}>Chargement…</div>
            ) : visibleSprites.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, marginBottom: 20 }}>
                {visibleSprites.map(({ url, label }) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => { onSelect(url); setOpen(false); }}
                    style={{
                      background: currentUrl === url ? "rgba(255, 215, 0,0.15)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${currentUrl === url ? "rgba(255, 215, 0,0.4)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 10, padding: 10, cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    }}
                  >
                    <span style={{ display: "block", width: 80, height: 80, overflow: "hidden" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={label}
                        style={{
                          width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated",
                          ...(isGoIconUrl(url) ? GO_ICON_CROP_STYLE : {}),
                        }}
                        onError={(e) => {
                          // Hide the whole button when the image is broken
                          const btn = (e.currentTarget as HTMLImageElement).closest("button");
                          if (btn) btn.style.display = "none";
                        }}
                      />
                    </span>
                    <span style={{ fontSize: "0.6rem", color: "rgba(232,237,245,0.55)", textAlign: "center", wordBreak: "break-word", lineHeight: 1.2 }}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            ) : fetched ? (
              <p style={{ color: "rgba(232,237,245,0.4)", marginBottom: 16 }}>
                {sprites.length > 0
                  ? `Aucun sprite ${shiny ? "shiny" : "normal"} trouvé via PokéAPI pour ce Pokémon.`
                  : "Aucun sprite trouvé via PokéAPI pour ce Pokémon."}
              </p>
            ) : null}

            {/* Costumes officiels Pokémon GO */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setShowCostumes((v) => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "rgba(255,153,0,0.08)", border: "1px solid rgba(255,153,0,0.3)",
                  borderRadius: 10, padding: "7px 14px", cursor: "pointer",
                  color: "#ff9900", fontFamily: "Exo 2, sans-serif", fontWeight: 700, fontSize: "0.8rem",
                  width: "100%", justifyContent: "space-between",
                }}
              >
                <span>Costumes officiels Pokémon GO ({officialCostumes.length})</span>
                <span style={{ opacity: 0.7 }}>{showCostumes ? "▲" : "▼"}</span>
              </button>
              {showCostumes && (
                <CostumeGrid
                  costumes={officialCostumes}
                  currentUrl={currentUrl}
                  onSelect={(url) => { onSelect(url); setOpen(false); }}
                />
              )}
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
              <label className="field-label">URL MANUELLE</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  className="glass-input"
                  placeholder="https://..."
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  style={{ whiteSpace: "nowrap" }}
                  disabled={!manualUrl.startsWith("http")}
                  onClick={() => { onSelect(manualUrl); setOpen(false); setManualUrl(""); }}
                >
                  Utiliser
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CostumeGrid({
  costumes,
  currentUrl,
  onSelect,
}: {
  costumes: { label: string; url: string }[];
  currentUrl: string | null;
  onSelect: (url: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = search.trim()
    ? costumes.filter((c) => c.label.toLowerCase().includes(search.trim().toLowerCase()))
    : costumes;

  if (costumes.length === 0) {
    return (
      <p style={{ fontSize: "0.75rem", color: "rgba(232,237,245,0.4)", marginTop: 10 }}>
        Aucun costume officiel connu pour ce Pokémon (pas encore sorti dans Pokémon GO, ou pas de costume).
      </p>
    );
  }

  return (
    <div style={{ marginTop: 10 }}>
      {costumes.length > 12 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="glass-input"
          placeholder="Chercher (ex: halloween, gofest, anniversary...)"
          style={{ marginBottom: 8, fontSize: "0.8rem" }}
        />
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 6, maxHeight: 360, overflowY: "auto" }}>
        {filtered.map(({ url, label }) => (
          <button
            key={url}
            type="button"
            onClick={() => onSelect(url)}
            style={{
              background: currentUrl === url ? "rgba(255,153,0,0.2)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${currentUrl === url ? "rgba(255,153,0,0.5)" : "rgba(255,255,255,0.07)"}`,
              borderRadius: 10, padding: 8, cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
            }}
          >
            <span style={{ display: "block", width: 72, height: 72, overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={label}
                style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated", ...GO_ICON_CROP_STYLE }}
                onError={(e) => {
                  const btn = (e.currentTarget as HTMLImageElement).closest("button");
                  if (btn) btn.style.display = "none";
                }}
              />
            </span>
            <span style={{ fontSize: "0.58rem", color: "rgba(255,153,0,0.8)", textAlign: "center", wordBreak: "break-word", lineHeight: 1.2 }}>
              {label}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p style={{ fontSize: "0.75rem", color: "rgba(232,237,245,0.35)", gridColumn: "1 / -1" }}>
            Aucun costume ne correspond à « {search} ».
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Fonds d'événement ────────────────────────────────────────────────────────
// Catalogue généré depuis PokeMiners/pogo_assets (Images/LocationCards) : voir
// docs/research-fond-backgrounds.md pour le détail de la recherche. Génériques
// (pas liés à un Pokémon précis dans les données du jeu), donc affichés en
// popup à part plutôt que dans le sélecteur de sprite du Pokémon.

type BackgroundEntry = { label: string; url: string };
const BACKGROUND_CATALOG = backgroundCatalog as BackgroundEntry[];
// dexId -> fonds confirmés pour ce Pokémon précis (source : margxt.fr, voir
// docs/research-fond-backgrounds.md). Contrairement à BACKGROUND_CATALOG
// (générique, n'importe quel fond sur n'importe quel Pokémon), cette liste
// est validée événement par événement — priorité à afficher en premier.
const VALIDATED_BACKGROUNDS = validatedBackgrounds as Record<string, BackgroundEntry[]>;

function BackgroundPicker({
  pokemonId,
  currentUrl,
  autoOpenKey,
  onSelect,
}: {
  pokemonId: number;
  currentUrl: string | null;
  autoOpenKey?: number;
  onSelect: (url: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!autoOpenKey) return;
    // Signal ponctuel du parent (tag "Fond" activé) : ouvrir la popup en
    // réaction est le comportement voulu, pas un enchaînement de re-renders
    // à éviter.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, [autoOpenKey]);

  const validated = VALIDATED_BACKGROUNDS[String(pokemonId)] ?? [];
  const source = showAll || validated.length === 0 ? BACKGROUND_CATALOG : validated;
  const filtered = search.trim()
    ? source.filter((b) => b.label.toLowerCase().includes(search.trim().toLowerCase()))
    : source;

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 4 }}>
        {currentUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt="fond" style={{ width: 48, height: 48, objectFit: "cover", background: "rgba(255,255,255,0.05)", borderRadius: 8 }} />
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            padding: "6px 14px", borderRadius: 10, cursor: "pointer",
            background: "rgba(180,100,255,0.08)", border: "1px solid rgba(180,100,255,0.25)",
            color: "#b464ff", fontFamily: "Exo 2, sans-serif", fontWeight: 600, fontSize: "0.8rem",
          }}
        >
          Sélectionner un fond{validated.length > 0 ? ` (${validated.length} confirmés)` : ""}
        </button>
        {currentUrl && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            style={{
              padding: "6px 10px", borderRadius: 10, cursor: "pointer",
              background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.25)",
              color: "#ff6b6b", fontFamily: "Exo 2, sans-serif", fontWeight: 600, fontSize: "0.8rem",
            }}
          >
            Retirer
          </button>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: "rgba(11,15,26,0.92)", backdropFilter: "blur(10px)", zIndex: 400 }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            className="glass-card overflow-y-auto"
            style={{ maxWidth: 580, width: "100%", maxHeight: "calc(100dvh - 32px)", padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontFamily: "Exo 2, sans-serif", color: "#b464ff", fontWeight: 700, fontSize: "1.1rem" }}>
                {showAll || validated.length === 0
                  ? `Tous les fonds (${BACKGROUND_CATALOG.length})`
                  : `Fonds confirmés pour ce Pokémon (${validated.length})`}
              </h3>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#e8edf5", cursor: "pointer", fontSize: "0.8rem", padding: "4px 10px" }}>Fermer</button>
            </div>

            {validated.length > 0 && (
              <p style={{ fontSize: "0.7rem", color: "rgba(232,237,245,0.4)", marginBottom: 10 }}>
                {showAll
                  ? "Liste complète : rien ne garantit que ce Pokémon a réellement eu ce fond."
                  : "Confirmés événement par événement (source : margxt.fr)."}
                {" "}
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  style={{ background: "none", border: "none", color: "#b464ff", cursor: "pointer", textDecoration: "underline", fontSize: "0.7rem", padding: 0 }}
                >
                  {showAll ? "Revenir aux fonds confirmés" : "Voir tous les fonds à la place"}
                </button>
              </p>
            )}

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input"
              placeholder="Chercher (ex: paris, anniversary, team leader...)"
              style={{ marginBottom: 12 }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8, maxHeight: 420, overflowY: "auto" }}>
              {filtered.map(({ url, label }) => (
                <button
                  key={url + label}
                  type="button"
                  onClick={() => { onSelect(url); setOpen(false); }}
                  style={{
                    background: currentUrl === url ? "rgba(180,100,255,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${currentUrl === url ? "rgba(180,100,255,0.4)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 10, padding: 6, cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={label}
                    style={{ width: 90, height: 60, objectFit: "cover", borderRadius: 6 }}
                    onError={(e) => {
                      const btn = (e.currentTarget as HTMLImageElement).closest("button");
                      if (btn) btn.style.display = "none";
                    }}
                  />
                  <span style={{ fontSize: "0.6rem", color: "rgba(232,237,245,0.6)", textAlign: "center", wordBreak: "break-word", lineHeight: 1.2 }}>
                    {label}
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p style={{ fontSize: "0.75rem", color: "rgba(232,237,245,0.35)", gridColumn: "1 / -1" }}>
                  Aucun fond ne correspond à « {search} ».
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

const TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  halloween:    { bg: "rgba(255,107,0,0.18)",   text: "#ff6b00", border: "rgba(255,107,0,0.5)" },
  noel:         { bg: "rgba(80,200,255,0.18)",   text: "#50c8ff", border: "rgba(80,200,255,0.5)" },
  "noël":       { bg: "rgba(80,200,255,0.18)",   text: "#50c8ff", border: "rgba(80,200,255,0.5)" },
  holiday:      { bg: "rgba(80,200,255,0.18)",   text: "#50c8ff", border: "rgba(80,200,255,0.5)" },
  anniversaire: { bg: "rgba(255,215,0,0.18)",    text: "#ffd700", border: "rgba(255,215,0,0.5)" },
  fete:         { bg: "rgba(255,215,0,0.18)",    text: "#ffd700", border: "rgba(255,215,0,0.5)" },
  "fête":       { bg: "rgba(255,215,0,0.18)",    text: "#ffd700", border: "rgba(255,215,0,0.5)" },
  gigamax:      { bg: "rgba(255,40,140,0.18)",   text: "#ff288c", border: "rgba(255,40,140,0.5)" },
  dynamax:      { bg: "rgba(210,40,40,0.18)",    text: "#e03030", border: "rgba(210,40,40,0.5)" },
  costume:      { bg: "rgba(200,100,255,0.18)",  text: "#c864ff", border: "rgba(200,100,255,0.5)" },
  evenement:    { bg: "rgba(180,100,255,0.18)",  text: "#b464ff", border: "rgba(180,100,255,0.5)" },
  "événement":  { bg: "rgba(180,100,255,0.18)",  text: "#b464ff", border: "rgba(180,100,255,0.5)" },
  fond:         { bg: "rgba(100,220,180,0.18)",  text: "#64dcb4", border: "rgba(100,220,180,0.5)" },
};
const DEFAULT_TAG_COLOR = { bg: "rgba(100,180,255,0.15)", text: "#64b4ff", border: "rgba(100,180,255,0.4)" };

// Seuls tags proposés à la création/modification (voir le bloc TAGS à côté de
// SHINY) : liste fermée plutôt que du texte libre, pour que gigamax/dynamax/
// costume restent fiables (utilisés pour la détection sur PokemonCard.tsx et
// les filtres de recherche) au lieu de dépendre d'une saisie manuelle
// cohérente. D'anciens tags libres (halloween, noël...) peuvent encore exister
// sur des entrées créées avant ce changement ; ce formulaire ne les propose
// plus, mais ne les efface pas non plus.
const SELECTABLE_TAGS: { key: string; label: string }[] = [
  { key: "costume", label: "Costume" },
  { key: "fond", label: "Fond" },
  { key: "dynamax", label: "Dynamax" },
  { key: "gigamax", label: "Gigamax" },
];

function getTagColor(tag: string) {
  return TAG_COLORS[tag.toLowerCase()] ?? DEFAULT_TAG_COLOR;
}

// ─────────────────────────────────────────────────────────────────────────────

function ModalOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        background: "rgba(11,15,26,0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 200,
      }}
    >
      <div
        className="glass-card animate-scale-in w-full overflow-y-auto"
        style={{ maxWidth: 520, maxHeight: "calc(100dvh - 32px)", padding: 28 }}
      >
        {children}
      </div>
    </div>
  );
}
