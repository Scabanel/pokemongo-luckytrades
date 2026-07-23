"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import PokemonSprite from "./PokemonSprite";
import pokemonList from "@/data/pokemon.json";
import costumeCatalog from "@/data/costumes.json";
import backgroundCatalog from "@/data/backgrounds.json";
import validatedBackgrounds from "@/data/pokemon-backgrounds.json";
import type { Trainer, PokemonEntry as SharedPokemonEntry, EntryCategory } from "@/lib/types";
import { CATEGORIES, CATEGORY_DISPLAY_ORDER } from "@/lib/categories";
import { createClient } from "@/lib/supabase/client";

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

interface PokeOption {
  name: string;       // English (internal, for pokemonId resolution)
  id: number;
  frenchName: string; // French (displayed + stored as pokemonName)
}

interface AdminPanelProps {
  onLogout: () => void;
}

// Options du sélecteur de catégorie dans les formulaires d'ajout/modification
// (dupliqué à l'identique dans les deux modales avant cette extraction).
// La couleur vient de lib/categories.ts ; le libellé compact ("Miroir ✨") et
// la teinte "active" restent spécifiques à ce composant.
const CATEGORY_PICKER_OPTIONS = [
  { val: "want" as const, label: "🔍 Je recherche", active: "rgba(10,255,224,0.15)", c: CATEGORIES.want.color },
  { val: "give" as const, label: "🎁 Je peux donner", active: "rgba(255,217,61,0.15)", c: CATEGORIES.give.color },
  { val: "mirror" as const, label: "🔮 Miroir ✨", active: "rgba(180,100,255,0.15)", c: CATEGORIES.mirror.color },
];

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [entries, setEntries] = useState<PokemonEntry[]>([]);
  const [trainers, setTrainers] = useState<TrainerWithCount[]>([]);
  const [pokeOptions, setPokeOptions] = useState<PokeOption[]>([]);
  const [me, setMe] = useState<{ trainer: Trainer | null; isAdmin: boolean }>({ trainer: null, isAdmin: false });
  const [activeTab, setActiveTab] = useState<"entries" | "trainers" | "account">("entries");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PokemonEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [newTrainerName, setNewTrainerName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

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

  const handleExport = async () => {
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `luckytrades-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export téléchargé ✓");
    } catch {
      toast.error("Erreur lors de l'export");
    }
  };

  const handleDelete = async (id: string) => {
    const prev = entries;
    setEntries((e) => e.filter((x) => x.id !== id));
    setDeleteConfirm(null);

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
    setEntries((e) => e.filter((x) => x.id !== entry.id));

    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${entry.pokemonName} marqué comme échangé ✓`);
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
      toast.success(`${ids.length} entrée${ids.length > 1 ? "s" : ""} marquée${ids.length > 1 ? "s" : ""} échangée${ids.length > 1 ? "s" : ""} ✓`);
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
      const pa = a.priority ?? 9999;
      const pb = b.priority ?? 9999;
      if (pa !== pb) return pa - pb;
      return a.pokemonName.localeCompare(b.pokemonName, "fr", { sensitivity: "base" });
    });

  const wants = sortEntries(entries.filter((e) => e.category === "want"));
  const gives = sortEntries(entries.filter((e) => e.category === "give"));
  const mirrors = sortEntries(entries.filter((e) => e.category === "mirror"));

  return (
    <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1
            className="neon-text"
            style={{
              fontFamily: "Exo 2, sans-serif",
              fontSize: "1.8rem",
              fontWeight: 800,
              color: "#0affe0",
            }}
          >
            ⚙️ Administration
          </h1>
          <p style={{ color: "rgba(232,237,245,0.4)", fontSize: "0.85rem" }}>
            Gestion des échanges chanceux du V
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <a href="/" className="btn-secondary" style={{ textDecoration: "none" }}>
            ← Catalogue
          </a>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary"
          >
            + Ajouter un échange
          </button>
          <button
            onClick={handleExport}
            style={{
              padding: "8px 16px", borderRadius: 12, cursor: "pointer",
              background: "rgba(100,180,255,0.08)", border: "1px solid rgba(100,180,255,0.25)",
              color: "#64b4ff", fontFamily: "Exo 2, sans-serif", fontWeight: 600, fontSize: "0.85rem",
            }}
          >
            ⬇ Export JSON
          </button>
          <button onClick={handleLogout} className="btn-danger">
            Déconnexion
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["entries", ...(isAdmin ? (["trainers"] as const) : []), "account"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 20px",
              borderRadius: 12,
              fontFamily: "Exo 2, sans-serif",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              border: "1px solid",
              transition: "all 0.2s",
              ...(activeTab === tab
                ? {
                    background: "rgba(10,255,224,0.15)",
                    borderColor: "rgba(10,255,224,0.4)",
                    color: "#0affe0",
                  }
                : {
                    background: "rgba(255,255,255,0.04)",
                    borderColor: "rgba(255,255,255,0.1)",
                    color: "#b0bac8",
                  }),
            }}
          >
            {tab === "entries"
            ? `Échanges (${entries.length}) · Miroir ${mirrors.length} · Want ${wants.length} · Give ${gives.length}`
            : tab === "trainers"
            ? `Dresseurs (${trainers.length})`
            : "Mon compte"}
          </button>
        ))}
      </div>

      {/* Entries tab */}
      {activeTab === "entries" && (
        <div className="space-y-8">
          {selectedIds.size > 0 && (
            <div
              className="flex items-center gap-3 flex-wrap p-3"
              style={{
                background: "rgba(10,255,224,0.06)",
                border: "1px solid rgba(10,255,224,0.25)",
                borderRadius: 12,
              }}
            >
              <span style={{ fontFamily: "Exo 2, sans-serif", fontWeight: 700, color: "#0affe0", fontSize: "0.85rem" }}>
                {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
              </span>
              <button onClick={handleBulkComplete} className="btn-success">
                ✓ Marquer échangé{selectedIds.size > 1 ? "s" : ""}
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
                  🗑️ Supprimer
                </button>
              )}
              <button onClick={clearSelection} className="btn-secondary" style={{ padding: "6px 12px", marginLeft: "auto" }}>
                Annuler la sélection
              </button>
            </div>
          )}

          {CATEGORY_DISPLAY_ORDER.map((key) => ({
            title: `${CATEGORIES[key].icon} ${CATEGORIES[key].label}`,
            color: CATEGORIES[key].color,
            list: { mirror: mirrors, want: wants, give: gives }[key],
          })).map(({ title, color, list }) => (
            <EntrySection
              key={title}
              title={title}
              color={color}
              entries={list}
              loading={loadingEntries}
              trainers={trainers}
              pokeOptions={pokeOptions}
              deleteConfirm={deleteConfirm}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectSection}
              onDelete={handleDelete}
              onComplete={handleComplete}
              onQuantityChange={handleQuantityChange}
              onEdit={setEditingEntry}
              onDeleteConfirmChange={setDeleteConfirm}
              canEditEntry={canEditEntry}
              onUpdate={(updated) =>
                setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
              }
            />
          ))}
        </div>
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
              color: "#0affe0",
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
                      background: "#0affe020",
                      border: "1px solid #0affe040",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "#0affe0",
                      fontFamily: "Exo 2, sans-serif",
                    }}
                  >
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t.name}</div>
                    <div style={{ color: "rgba(232,237,245,0.4)", fontSize: "0.75rem" }}>
                      {t._count.entries} échange{t._count.entries !== 1 ? "s" : ""}
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

      {/* Add form modal */}
      {showAddForm && (
        <EntryForm
          mode="add"
          trainers={trainers}
          pokeOptions={pokeOptions}
          existingEntries={entries}
          isAdmin={isAdmin}
          myTrainerId={myTrainerId}
          onClose={() => setShowAddForm(false)}
          onSaved={(entry) => {
            setEntries((prev) => [entry, ...prev]);
            toast.success(`${entry.pokemonName} ajouté !`);
            // La modale reste ouverte pour enchaîner les ajouts (ex: après une
            // session de jeu avec plusieurs échanges) — elle se ferme via
            // le bouton "Terminé" ou le clic en dehors.
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
          isAdmin={isAdmin}
          myTrainerId={myTrainerId}
          onClose={() => setEditingEntry(null)}
          onSaved={(updated) => {
            setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTeam(trainer?.team ?? "");
    setLevel(trainer?.level != null ? String(trainer.level) : "");
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
        body: JSON.stringify({ team: team || null, level: level ? Number(level) : null }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      onSaved(updated);
      toast.success("Profil mis à jour ✓");
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6" style={{ maxWidth: 500 }}>
      <h2 style={{ fontFamily: "Exo 2, sans-serif", fontWeight: 700, color: "#0affe0", marginBottom: 16 }}>
        Mon compte — {trainer.name}
      </h2>
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div>
          <label className="field-label">ÉQUIPE</label>
          <select value={team} onChange={(e) => setTeam(e.target.value)} className="glass-input mt-1" required>
            <option value="" disabled>— Choisis ton équipe —</option>
            <option value="instinct">⚡ Instinct</option>
            <option value="mystic">💧 Mystic</option>
            <option value="valor">🔥 Valor</option>
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
        <button type="submit" className="btn-primary" disabled={loading} style={{ alignSelf: "flex-start" }}>
          {loading ? "Sauvegarde…" : "✓ Sauvegarder"}
        </button>
      </form>
    </div>
  );
}

function EntrySection({
  title,
  color,
  entries,
  loading,
  trainers,
  pokeOptions,
  deleteConfirm,
  onDelete,
  onComplete,
  onQuantityChange,
  onEdit,
  onDeleteConfirmChange,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  canEditEntry,
}: {
  title: string;
  color: string;
  entries: PokemonEntry[];
  loading: boolean;
  trainers: Trainer[];
  pokeOptions: PokeOption[];
  deleteConfirm: string | null;
  onDelete: (id: string) => void;
  onComplete: (entry: PokemonEntry) => void;
  onQuantityChange: (entry: PokemonEntry, delta: number) => void;
  onEdit: (entry: PokemonEntry) => void;
  onDeleteConfirmChange: (id: string | null) => void;
  onUpdate: (entry: PokemonEntry) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
  canEditEntry: (entry: PokemonEntry) => boolean;
}) {
  const ids = entries.filter(canEditEntry).map((e) => e.id);
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
  const someSelected = !allSelected && ids.some((id) => selectedIds.has(id));

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {ids.length > 0 && (
          <SelectAllCheckbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={() => onToggleSelectAll(ids)}
          />
        )}
        <h2
          style={{
            fontFamily: "Exo 2, sans-serif",
            fontWeight: 700,
            color,
            fontSize: "1.1rem",
          }}
        >
          {title} ({entries.length})
        </h2>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 80, borderRadius: 16 }} />
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
        <div className="space-y-3">
          {entries.map((entry) => (
            <AdminEntryRow
              key={entry.id}
              entry={entry}
              trainers={trainers}
              color={color}
              isDeleteConfirm={deleteConfirm === entry.id}
              isSelected={selectedIds.has(entry.id)}
              onDelete={() => onDelete(entry.id)}
              onComplete={() => onComplete(entry)}
              onQuantityChange={(delta) => onQuantityChange(entry, delta)}
              onEdit={() => onEdit(entry)}
              onDeleteConfirm={() => onDeleteConfirmChange(entry.id)}
              onDeleteCancel={() => onDeleteConfirmChange(null)}
              onToggleSelect={() => onToggleSelect(entry.id)}
              canEdit={canEditEntry(entry)}
            />
          ))}
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
      style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#0affe0" }}
      aria-label="Tout sélectionner"
    />
  );
}

function AdminEntryRow({
  entry,
  trainers: _trainers,
  color,
  isDeleteConfirm,
  isSelected,
  onDelete,
  onComplete,
  onQuantityChange,
  onEdit,
  onDeleteConfirm,
  onDeleteCancel,
  onToggleSelect,
  canEdit,
}: {
  entry: PokemonEntry;
  trainers: Trainer[];
  color: string;
  isDeleteConfirm: boolean;
  isSelected: boolean;
  onDelete: () => void;
  onComplete: () => void;
  onQuantityChange: (delta: number) => void;
  onEdit: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onToggleSelect: () => void;
  canEdit: boolean;
}) {
  const quantity = entry.quantity ?? 1;
  return (
    <div
      className="flex items-center gap-4 p-4"
      style={{
        background: isSelected ? "rgba(10,255,224,0.05)" : "rgba(255,255,255,0.03)",
        borderRadius: 16,
        border: `1px solid ${isSelected ? "rgba(10,255,224,0.3)" : "rgba(255,255,255,0.07)"}`,
        flexWrap: "wrap",
        transition: "border-color 0.2s, background 0.2s",
      }}
    >
      {/* Selection checkbox — masquée si le compte ne peut pas agir sur cette entrée */}
      {canEdit && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#0affe0", flexShrink: 0 }}
          aria-label={`Sélectionner ${entry.pokemonName}`}
        />
      )}

      {/* Priority badge */}
      {entry.priority != null && (
        <div style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
          background: entry.priority === 1 ? "rgba(255,215,0,0.2)" : entry.priority === 2 ? "rgba(192,192,192,0.15)" : entry.priority === 3 ? "rgba(205,127,50,0.15)" : "rgba(100,180,255,0.12)",
          border: `2px solid ${entry.priority === 1 ? "#ffd700" : entry.priority === 2 ? "#c0c0c0" : entry.priority === 3 ? "#cd7f32" : "#64b4ff"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.7rem", fontWeight: 800,
          color: entry.priority === 1 ? "#ffd700" : entry.priority === 2 ? "#d4d4d4" : entry.priority === 3 ? "#e09850" : "#64b4ff",
          fontFamily: "Exo 2, sans-serif",
        }}>
          {entry.priority}
        </div>
      )}

      {/* Sprite (+ fond d'événement en arrière-plan si défini) */}
      <div style={{
        width: 48, height: 48, borderRadius: 10, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        ...(entry.backgroundUrl && {
          backgroundImage: `url(${entry.backgroundUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }),
      }}>
        <PokemonSprite pokemonId={entry.pokemonId} alt={entry.pokemonName} size={48} shiny={entry.shiny || (entry.notes?.toLowerCase().includes("shiny") ?? false)} customSpriteUrl={entry.customSpriteUrl} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            style={{
              fontFamily: "Exo 2, sans-serif",
              fontWeight: 700,
              textTransform: "capitalize",
              fontSize: "0.95rem",
              color: color,
            }}
          >
            {entry.pokemonName}
          </span>
          {(entry.shiny || (entry.notes?.toLowerCase().includes("shiny") ?? false)) && (
            <span style={{
              background: "rgba(255,215,0,0.15)",
              border: "1px solid rgba(255,215,0,0.5)",
              borderRadius: 999,
              padding: "1px 7px",
              fontSize: "0.65rem",
              fontWeight: 700,
              color: "#ffd700",
              fontFamily: "Exo 2, sans-serif",
            }}>✨ Shiny</span>
          )}
          {entry.trainer && (
            <span className="trainer-pill">{entry.trainer.name}</span>
          )}
          {quantity > 1 && (
            <span style={{
              background: "rgba(100,180,255,0.15)",
              border: "1px solid rgba(100,180,255,0.5)",
              borderRadius: 999,
              padding: "1px 8px",
              fontSize: "0.65rem",
              fontWeight: 800,
              color: "#64b4ff",
              fontFamily: "Exo 2, sans-serif",
            }}>×{quantity}</span>
          )}
        </div>
        <div
          style={{ color: "rgba(232,237,245,0.45)", fontSize: "0.75rem", marginTop: 2 }}
        >
          {entry.tradeForPokemonName ? (
            <>
              ⇄ <span style={{ textTransform: "capitalize" }}>{entry.tradeForPokemonName}</span>
            </>
          ) : (
            "Pas d'échange spécifié"
          )}
          {entry.notes && ` · ${entry.notes}`}
        </div>
      </div>

      {/* Actions — masquées si le compte connecté n'est pas propriétaire de cette entrée (ni admin) */}
      {canEdit && (
      <div className="flex items-center gap-2 flex-wrap">
        {isDeleteConfirm ? (
          <>
            <span style={{ fontSize: "0.8rem", color: "#ff6b6b" }}>Confirmer ?</span>
            <button onClick={onDelete} className="btn-danger">
              Oui
            </button>
            <button onClick={onDeleteCancel} className="btn-secondary" style={{ padding: "6px 12px" }}>
              Non
            </button>
          </>
        ) : (
          <>
            <button
              onClick={quantity > 1 ? () => onQuantityChange(-1) : onComplete}
              className="btn-success"
            >
              {quantity > 1 ? "✓ −1 (donné)" : "✓ Échangé"}
            </button>
            {quantity > 1 && (
              <button
                onClick={() => onQuantityChange(1)}
                className="btn-secondary"
                style={{ padding: "6px 10px", fontSize: "0.85rem", fontWeight: 800 }}
                aria-label="Ajouter un exemplaire"
                title="Corriger : +1 exemplaire"
              >
                +1
              </button>
            )}
            <button onClick={onEdit} className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
              ✏️ Modifier
            </button>
            <button onClick={onDeleteConfirm} className="btn-danger">
              🗑️ Supprimer
            </button>
          </>
        )}
      </div>
      )}
    </div>
  );
}

// Formulaire unique pour l'ajout et la modification d'un échange : avant cette
// fusion, AddEntryModal et EditEntryModal étaient ~85% identiques (catégorie,
// dresseur, en-échange-de, notes, tags, priorité, shiny, sprite) et toute
// modification d'un champ devait être répercutée à la main dans les deux.
// Seuls diffèrent : le sélecteur de Pokémon (uniquement à l'ajout, on ne
// change pas le Pokémon d'une entrée existante), le endpoint POST/PATCH,
// et le comportement "reste ouvert pour enchaîner" propre à l'ajout.
type EntryFormProps =
  | {
      mode: "add";
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
      isAdmin: boolean;
      myTrainerId: string | null;
      onClose: () => void;
      onSaved: (entry: PokemonEntry) => void;
    };

function EntryForm(props: EntryFormProps) {
  const { mode, trainers, pokeOptions, isAdmin, myTrainerId, onClose, onSaved } = props;
  const entry = mode === "edit" ? props.entry : undefined;
  const existingEntries = mode === "add" ? props.existingEntries : undefined;

  const [form, setForm] = useState(() =>
    entry
      ? {
          pokemonName: entry.pokemonName,
          pokemonId: entry.pokemonId,
          category: entry.category as EntryCategory,
          trainerId: entry.trainer?.id ?? "",
          tradeForPokemonName: entry.tradeForPokemonName ?? "",
          tradeForPokemonId: entry.tradeForPokemonId ?? 0,
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
          category: "want" as EntryCategory,
          // Un compte non-admin ne peut créer que sous son propre dresseur
          // (de toute façon forcé côté serveur, voir app/api/entries/route.ts).
          trainerId: isAdmin ? "" : myTrainerId ?? "",
          tradeForPokemonName: "",
          tradeForPokemonId: 0,
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
  const [addedCount, setAddedCount] = useState(0);
  const pokeRef = useRef<HTMLDivElement>(null);
  const tradeRef = useRef<HTMLDivElement>(null);
  const pokeInputRef = useRef<HTMLInputElement>(null);

  const pokeSuggestions = pokeSearch.length >= 2
    ? pokeOptions.filter((p) => p.frenchName.toLowerCase().includes(pokeSearch.toLowerCase())).slice(0, 8)
    : [];

  const tradeSuggestions = tradeSearch.length >= 2
    ? pokeOptions.filter((p) => p.frenchName.toLowerCase().includes(tradeSearch.toLowerCase())).slice(0, 8)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "add") {
      if (!form.pokemonId || !form.pokemonName) {
        toast.error("Sélectionne un Pokémon valide");
        return;
      }
      if (form.category === "want") {
        const duplicate = existingEntries!.find(
          (x) => x.category === "want" && x.pokemonId === form.pokemonId && !!x.shiny === form.shiny
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
        tradeForPokemonName: form.tradeForPokemonName || null,
        tradeForPokemonId: form.tradeForPokemonId || null,
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
          tradeForPokemonName: "",
          tradeForPokemonId: 0,
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
    <ModalOverlay onClose={onClose}>
      {mode === "add" ? (
        <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: 20 }}>
          <h2
            style={{
              fontFamily: "Exo 2, sans-serif",
              fontWeight: 800,
              color: "#0affe0",
              fontSize: "1.3rem",
            }}
          >
            Ajouter un échange
          </h2>
          {addedCount > 0 && (
            <span
              className="animate-fade-in-up"
              style={{
                background: "rgba(10,255,224,0.12)",
                border: "1px solid rgba(10,255,224,0.35)",
                borderRadius: 999,
                padding: "3px 12px",
                fontSize: "0.75rem",
                fontWeight: 800,
                color: "#0affe0",
                fontFamily: "Exo 2, sans-serif",
              }}
            >
              ✓ {addedCount} ajouté{addedCount > 1 ? "s" : ""}
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
                color: "#0affe0",
                fontSize: "1.2rem",
                textTransform: "capitalize",
              }}
            >
              Modifier: {entry!.pokemonName}
            </h2>
            <span
              style={{
                fontSize: "0.75rem",
                color: form.category === "want" ? "#0affe0" : form.category === "mirror" ? "#b464ff" : "#ffd93d",
                fontWeight: 600,
                fontFamily: "Exo 2, sans-serif",
              }}
            >
              {form.category === "want" ? "Je recherche" : form.category === "mirror" ? "Miroir ✨" : "Je peux donner"}
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

        {/* Trainer — figé au dresseur du compte connecté pour un non-admin
            (déjà forcé côté serveur, le disabled est ici du confort/clarté UI) */}
        <div>
          <label className="field-label">DRESSEUR</label>
          <select
            value={form.trainerId}
            onChange={(e) => setForm((f) => ({ ...f, trainerId: e.target.value }))}
            className="glass-input mt-1"
            disabled={!isAdmin}
          >
            <option value="">— Aucun dresseur —</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Trade for */}
        <div ref={tradeRef} style={{ position: "relative" }}>
          <label className="field-label">EN ÉCHANGE DE</label>
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
                placeholder={mode === "add" ? "Pokémon en échange (optionnel)..." : "Pokémon en échange..."}
                autoComplete="off"
              />
              {showTradeSuggestions && tradeSuggestions.length > 0 && (
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

        {/* Tags */}
        <div>
          <label className="field-label">TAGS (optionnel)</label>
          <TagInput tags={form.tags} onChange={(tags) => setForm((f) => ({ ...f, tags }))} />
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

        {/* Shiny */}
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

        {/* Sprite personnalisé */}
        {(mode === "edit" || form.pokemonId > 0) && (
          <div>
            <label className="field-label">SPRITE PERSONNALISÉ (optionnel)</label>
            <SpritePicker
              pokemonId={mode === "edit" ? entry!.pokemonId : form.pokemonId}
              pokemonName={mode === "edit" ? entry!.pokemonName : form.pokemonName}
              currentUrl={form.customSpriteUrl}
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
            onSelect={(url) => setForm((f) => ({ ...f, backgroundUrl: url }))}
          />
        </div>

        <div className="flex gap-2 justify-end mt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            {mode === "add" ? (addedCount > 0 ? "Terminé" : "Annuler") : "Annuler"}
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {mode === "add" ? (loading ? "Ajout…" : "✓ Ajouter") : (loading ? "Sauvegarde…" : "✓ Sauvegarder")}
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
        border: "1px solid rgba(10,255,224,0.2)",
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
            ((e.currentTarget as HTMLButtonElement).style.background = "rgba(10,255,224,0.08)")
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
    .map(({ path, label }) => ({ url: getByPath(sprites, path), label: prefix ? `${prefix} — ${label}` : label }))
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
  return COSTUME_CATALOG[String(pokemonId)] ?? [];
}

function SpritePicker({
  pokemonId,
  pokemonName,
  currentUrl,
  onSelect,
}: {
  pokemonId: number;
  pokemonName: string;
  currentUrl: string | null;
  onSelect: (url: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sprites, setSprites] = useState<{ url: string; label: string }[]>([]);
  const [fetched, setFetched] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [showCostumes, setShowCostumes] = useState(false);
  const officialCostumes = getOfficialCostumes(pokemonId);

  // Reset cache when Pokémon changes
  useEffect(() => {
    setFetched(false);
    setSprites([]);
  }, [pokemonId]);

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
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt="sprite" style={{ width: 48, height: 48, objectFit: "contain", imageRendering: "pixelated", background: "rgba(255,255,255,0.05)", borderRadius: 8 }} />
        )}
        <button
          type="button"
          onClick={handleOpen}
          style={{
            padding: "6px 14px", borderRadius: 10, cursor: "pointer",
            background: "rgba(10,255,224,0.08)", border: "1px solid rgba(10,255,224,0.25)",
            color: "#0affe0", fontFamily: "Exo 2, sans-serif", fontWeight: 600, fontSize: "0.8rem",
          }}
        >
          🎨 Sélectionner sprite
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
            ✕ Retirer
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
            className="glass-card"
            style={{ maxWidth: 580, width: "100%", maxHeight: "88vh", padding: 24, overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontFamily: "Exo 2, sans-serif", color: "#0affe0", fontWeight: 700, fontSize: "1.1rem" }}>
                Sprites — <span style={{ textTransform: "capitalize" }}>{pokemonName}</span>
              </h3>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#e8edf5", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>
            </div>

            {fetching ? (
              <div style={{ textAlign: "center", padding: 32, color: "rgba(232,237,245,0.4)" }}>Chargement…</div>
            ) : sprites.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, marginBottom: 20 }}>
                {sprites.map(({ url, label }) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => { onSelect(url); setOpen(false); }}
                    style={{
                      background: currentUrl === url ? "rgba(10,255,224,0.15)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${currentUrl === url ? "rgba(10,255,224,0.4)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 10, padding: 10, cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={label}
                      style={{ width: 80, height: 80, objectFit: "contain", imageRendering: "pixelated" }}
                      onError={(e) => {
                        // Hide the whole button when the image is broken
                        const btn = (e.currentTarget as HTMLImageElement).closest("button");
                        if (btn) btn.style.display = "none";
                      }}
                    />
                    <span style={{ fontSize: "0.6rem", color: "rgba(232,237,245,0.55)", textAlign: "center", wordBreak: "break-word", lineHeight: 1.2 }}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            ) : fetched ? (
              <p style={{ color: "rgba(232,237,245,0.4)", marginBottom: 16 }}>
                Aucun sprite trouvé via PokéAPI pour ce Pokémon.
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
                <span>🎭 Costumes officiels Pokémon GO ({officialCostumes.length})</span>
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
                  ✓ Utiliser
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={label}
              style={{ width: 72, height: 72, objectFit: "contain", imageRendering: "pixelated" }}
              onError={(e) => {
                const btn = (e.currentTarget as HTMLImageElement).closest("button");
                if (btn) btn.style.display = "none";
              }}
            />
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
  onSelect,
}: {
  pokemonId: number;
  currentUrl: string | null;
  onSelect: (url: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

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
          🖼️ Sélectionner un fond{validated.length > 0 ? ` (${validated.length} confirmés)` : ""}
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
            ✕ Retirer
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
            className="glass-card"
            style={{ maxWidth: 580, width: "100%", maxHeight: "88vh", padding: 24, overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontFamily: "Exo 2, sans-serif", color: "#b464ff", fontWeight: 700, fontSize: "1.1rem" }}>
                {showAll || validated.length === 0
                  ? `Tous les fonds (${BACKGROUND_CATALOG.length})`
                  : `Fonds confirmés pour ce Pokémon (${validated.length})`}
              </h3>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#e8edf5", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>
            </div>

            {validated.length > 0 && (
              <p style={{ fontSize: "0.7rem", color: "rgba(232,237,245,0.4)", marginBottom: 10 }}>
                {showAll
                  ? "Liste complète — rien ne garantit que ce Pokémon a réellement eu ce fond."
                  : "Confirmés événement par événement (source : margxt.fr)."}
                {" "}
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  style={{ background: "none", border: "none", color: "#b464ff", cursor: "pointer", textDecoration: "underline", fontSize: "0.7rem", padding: 0 }}
                >
                  {showAll ? "← Revenir aux fonds confirmés" : "Voir tous les fonds à la place →"}
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

// ─── TagInput ─────────────────────────────────────────────────────────────────

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
};
const DEFAULT_TAG_COLOR = { bg: "rgba(100,180,255,0.15)", text: "#64b4ff", border: "rgba(100,180,255,0.4)" };

function getTagColor(tag: string) {
  return TAG_COLORS[tag.toLowerCase()] ?? DEFAULT_TAG_COLOR;
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed]);
    setInput("");
  };

  return (
    <div style={{ marginTop: 6 }}>
      {tags.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-2">
          {tags.map((tag) => {
            const c = getTagColor(tag);
            return (
              <span
                key={tag}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  background: c.bg, border: `1px solid ${c.border}`,
                  borderRadius: 999, padding: "2px 8px 2px 10px",
                  fontSize: "0.72rem", fontWeight: 700, color: c.text,
                  fontFamily: "Exo 2, sans-serif",
                }}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => onChange(tags.filter((t) => t !== tag))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: c.text, opacity: 0.7, padding: 0, lineHeight: 1, fontSize: "0.8rem" }}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          className="glass-input"
          placeholder="Ex: halloween, gigamax, costume..."
          style={{ flex: 1, fontSize: "0.82rem" }}
        />
        <button
          type="button"
          onClick={add}
          style={{
            padding: "6px 12px", borderRadius: 10, cursor: "pointer",
            background: "rgba(100,180,255,0.1)", border: "1px solid rgba(100,180,255,0.3)",
            color: "#64b4ff", fontFamily: "Exo 2, sans-serif", fontWeight: 700, fontSize: "0.8rem",
          }}
        >
          + Ajouter
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ModalOverlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        background: "rgba(11,15,26,0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 200,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="glass-card animate-scale-in w-full overflow-y-auto"
        style={{ maxWidth: 520, maxHeight: "90vh", padding: 28 }}
      >
        {children}
      </div>
    </div>
  );
}
