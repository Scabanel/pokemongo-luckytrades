"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import PokemonSprite from "./PokemonSprite";

interface Trainer {
  id: string;
  name: string;
  _count: { entries: number };
}

interface PokemonEntry {
  id: string;
  pokemonName: string;
  pokemonId: number;
  category: string;
  tradeForPokemonName?: string | null;
  tradeForPokemonId?: number | null;
  notes?: string | null;
  completed: boolean;
  trainer?: Trainer | null;
}

interface PokeOption {
  name: string;
  url: string;
  id: number;
}

interface AdminPanelProps {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [entries, setEntries] = useState<PokemonEntry[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [pokeOptions, setPokeOptions] = useState<PokeOption[]>([]);
  const [activeTab, setActiveTab] = useState<"entries" | "trainers">("entries");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PokemonEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [newTrainerName, setNewTrainerName] = useState("");

  const fetchData = useCallback(async () => {
    const [eRes, tRes] = await Promise.all([
      fetch("/api/entries?completed=false"),
      fetch("/api/trainers"),
    ]);
    setEntries(await eRes.json());
    setTrainers(await tRes.json());
    setLoadingEntries(false);
  }, []);

  useEffect(() => {
    fetchData();
    // Fetch pokemon list from PokeAPI
    fetch("https://pokeapi.co/api/v2/pokemon?limit=1010")
      .then((r) => r.json())
      .then((data) => {
        const options: PokeOption[] = data.results.map(
          (p: { name: string; url: string }, i: number) => ({
            name: p.name,
            url: p.url,
            id: i + 1,
          })
        );
        setPokeOptions(options);
      })
      .catch(() => {});
  }, [fetchData]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    onLogout();
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

  const wants = entries.filter((e) => e.category === "want");
  const gives = entries.filter((e) => e.category === "give");
  const mirrors = entries.filter((e) => e.category === "mirror");

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
          <button onClick={handleLogout} className="btn-danger">
            Déconnexion
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["entries", "trainers"] as const).map((tab) => (
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
            : `Dresseurs (${trainers.length})`}
          </button>
        ))}
      </div>

      {/* Entries tab */}
      {activeTab === "entries" && (
        <div className="space-y-8">
          {[
            { title: "🔮 Échanges miroir", color: "#b464ff", list: mirrors },
            { title: "🔍 Je recherche", color: "#0affe0", list: wants },
            { title: "🎁 Je peux donner", color: "#ffd93d", list: gives },
          ].map(({ title, color, list }) => (
            <EntrySection
              key={title}
              title={title}
              color={color}
              entries={list}
              loading={loadingEntries}
              trainers={trainers}
              pokeOptions={pokeOptions}
              deleteConfirm={deleteConfirm}
              onDelete={handleDelete}
              onComplete={handleComplete}
              onEdit={setEditingEntry}
              onDeleteConfirmChange={setDeleteConfirm}
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

      {/* Add form modal */}
      {showAddForm && (
        <AddEntryModal
          trainers={trainers}
          pokeOptions={pokeOptions}
          onClose={() => setShowAddForm(false)}
          onAdded={(entry) => {
            setEntries((prev) => [entry, ...prev]);
            toast.success(`${entry.pokemonName} ajouté !`);
            setShowAddForm(false);
          }}
        />
      )}

      {/* Edit modal */}
      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          trainers={trainers}
          pokeOptions={pokeOptions}
          onClose={() => setEditingEntry(null)}
          onUpdated={(updated) => {
            setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            toast.success("Échange mis à jour");
            setEditingEntry(null);
          }}
        />
      )}
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
  onEdit,
  onDeleteConfirmChange,
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
  onEdit: (entry: PokemonEntry) => void;
  onDeleteConfirmChange: (id: string | null) => void;
  onUpdate: (entry: PokemonEntry) => void;
}) {
  return (
    <div>
      <h2
        style={{
          fontFamily: "Exo 2, sans-serif",
          fontWeight: 700,
          color,
          marginBottom: 12,
          fontSize: "1.1rem",
        }}
      >
        {title} ({entries.length})
      </h2>

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
              onDelete={() => onDelete(entry.id)}
              onComplete={() => onComplete(entry)}
              onEdit={() => onEdit(entry)}
              onDeleteConfirm={() => onDeleteConfirmChange(entry.id)}
              onDeleteCancel={() => onDeleteConfirmChange(null)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminEntryRow({
  entry,
  trainers: _trainers,
  color,
  isDeleteConfirm,
  onDelete,
  onComplete,
  onEdit,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  entry: PokemonEntry;
  trainers: Trainer[];
  color: string;
  isDeleteConfirm: boolean;
  onDelete: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  return (
    <div
      className="flex items-center gap-4 p-4"
      style={{
        background: "rgba(255,255,255,0.03)",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.07)",
        flexWrap: "wrap",
        transition: "border-color 0.2s",
      }}
    >
      {/* Sprite */}
      <PokemonSprite pokemonId={entry.pokemonId} alt={entry.pokemonName} size={48} />

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
          {entry.trainer && (
            <span className="trainer-pill">{entry.trainer.name}</span>
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

      {/* Actions */}
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
            <button onClick={onComplete} className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
              ✓ Échangé
            </button>
            <button onClick={onEdit} className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
              ✏️ Modifier
            </button>
            <button onClick={onDeleteConfirm} className="btn-danger">
              🗑️ Supprimer
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function AddEntryModal({
  trainers,
  pokeOptions,
  onClose,
  onAdded,
}: {
  trainers: Trainer[];
  pokeOptions: PokeOption[];
  onClose: () => void;
  onAdded: (entry: PokemonEntry) => void;
}) {
  const [form, setForm] = useState({
    pokemonName: "",
    pokemonId: 0,
    category: "want" as "want" | "give" | "mirror",
    trainerId: "",
    tradeForPokemonName: "",
    tradeForPokemonId: 0,
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [pokeSearch, setPokeSearch] = useState("");
  const [tradeSearch, setTradeSearch] = useState("");
  const [showPokeSuggestions, setShowPokeSuggestions] = useState(false);
  const [showTradeSuggestions, setShowTradeSuggestions] = useState(false);
  const pokeRef = useRef<HTMLDivElement>(null);
  const tradeRef = useRef<HTMLDivElement>(null);

  const pokeSuggestions = pokeSearch.length >= 2
    ? pokeOptions.filter((p) => p.name.includes(pokeSearch.toLowerCase())).slice(0, 8)
    : [];

  const tradeSuggestions = tradeSearch.length >= 2
    ? pokeOptions.filter((p) => p.name.includes(tradeSearch.toLowerCase())).slice(0, 8)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pokemonId || !form.pokemonName) {
      toast.error("Sélectionne un Pokémon valide");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          trainerId: form.trainerId || null,
          tradeForPokemonName: form.tradeForPokemonName || null,
          tradeForPokemonId: form.tradeForPokemonId || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      const entry = await res.json();
      onAdded(entry);
    } catch {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h2
        style={{
          fontFamily: "Exo 2, sans-serif",
          fontWeight: 800,
          color: "#0affe0",
          fontSize: "1.3rem",
          marginBottom: 20,
        }}
      >
        Ajouter un échange
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Category */}
        <div>
          <label className="field-label">CATÉGORIE</label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {([
              { val: "want", label: "🔍 Je recherche", active: "rgba(10,255,224,0.15)", c: "#0affe0" },
              { val: "give", label: "🎁 Je peux donner", active: "rgba(255,217,61,0.15)", c: "#ffd93d" },
              { val: "mirror", label: "🔮 Miroir ✨", active: "rgba(180,100,255,0.15)", c: "#b464ff" },
            ] as const).map(({ val, label, active, c }) => (
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

        {/* Pokémon selector */}
        <div ref={pokeRef} style={{ position: "relative" }}>
          <label className="field-label">POKÉMON</label>
          <div className="flex gap-2 items-center mt-1">
            {form.pokemonId > 0 && (
              <PokemonSprite pokemonId={form.pokemonId} alt={form.pokemonName} size={40} />
            )}
            <div style={{ flex: 1, position: "relative" }}>
              <input
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
              />
              {showPokeSuggestions && pokeSuggestions.length > 0 && (
                <SuggestionDropdown
                  options={pokeSuggestions}
                  onSelect={(p) => {
                    setForm((f) => ({ ...f, pokemonName: p.name, pokemonId: p.id }));
                    setPokeSearch(p.name);
                    setShowPokeSuggestions(false);
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Trainer */}
        <div>
          <label className="field-label">DRESSEUR</label>
          <select
            value={form.trainerId}
            onChange={(e) => setForm((f) => ({ ...f, trainerId: e.target.value }))}
            className="glass-input mt-1"
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
                placeholder="Pokémon en échange (optionnel)..."
                autoComplete="off"
              />
              {showTradeSuggestions && tradeSuggestions.length > 0 && (
                <SuggestionDropdown
                  options={tradeSuggestions}
                  onSelect={(p) => {
                    setForm((f) => ({ ...f, tradeForPokemonName: p.name, tradeForPokemonId: p.id }));
                    setTradeSearch(p.name);
                    setShowTradeSuggestions(false);
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="field-label">NOTES (optionnel)</label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="glass-input mt-1"
            placeholder="Notes..."
          />
        </div>

        <div className="flex gap-2 justify-end mt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Ajout…" : "✓ Ajouter"}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

function EditEntryModal({
  entry,
  trainers,
  pokeOptions,
  onClose,
  onUpdated,
}: {
  entry: PokemonEntry;
  trainers: Trainer[];
  pokeOptions: PokeOption[];
  onClose: () => void;
  onUpdated: (entry: PokemonEntry) => void;
}) {
  const [form, setForm] = useState({
    trainerId: entry.trainer?.id ?? "",
    tradeForPokemonName: entry.tradeForPokemonName ?? "",
    tradeForPokemonId: entry.tradeForPokemonId ?? 0,
    notes: entry.notes ?? "",
  });
  const [tradeSearch, setTradeSearch] = useState(entry.tradeForPokemonName ?? "");
  const [showTradeSuggestions, setShowTradeSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  const tradeSuggestions = tradeSearch.length >= 2
    ? pokeOptions.filter((p) => p.name.includes(tradeSearch.toLowerCase())).slice(0, 8)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainerId: form.trainerId || null,
          tradeForPokemonName: form.tradeForPokemonName || null,
          tradeForPokemonId: form.tradeForPokemonId || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      onUpdated(updated);
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex items-center gap-3 mb-5">
        <PokemonSprite pokemonId={entry.pokemonId} alt={entry.pokemonName} size={48} />
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
            Modifier: {entry.pokemonName}
          </h2>
          <span
            style={{
              fontSize: "0.75rem",
              color: entry.category === "want" ? "#0affe0" : "#ffd93d",
              fontWeight: 600,
              fontFamily: "Exo 2, sans-serif",
            }}
          >
            {entry.category === "want" ? "Je recherche" : entry.category === "mirror" ? "Miroir ✨" : "Je peux donner"}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="field-label">DRESSEUR</label>
          <select
            value={form.trainerId}
            onChange={(e) => setForm((f) => ({ ...f, trainerId: e.target.value }))}
            className="glass-input mt-1"
          >
            <option value="">— Aucun dresseur —</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ position: "relative" }}>
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
                placeholder="Pokémon en échange..."
                autoComplete="off"
              />
              {showTradeSuggestions && tradeSuggestions.length > 0 && (
                <SuggestionDropdown
                  options={tradeSuggestions}
                  onSelect={(p) => {
                    setForm((f) => ({ ...f, tradeForPokemonName: p.name, tradeForPokemonId: p.id }));
                    setTradeSearch(p.name);
                    setShowTradeSuggestions(false);
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="field-label">NOTES</label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="glass-input mt-1"
            placeholder="Notes..."
          />
        </div>

        <div className="flex gap-2 justify-end mt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Sauvegarde…" : "✓ Sauvegarder"}
          </button>
        </div>
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
          <span>{p.name}</span>
          <span style={{ marginLeft: "auto", color: "rgba(232,237,245,0.3)", fontSize: "0.75rem" }}>
            #{p.id}
          </span>
        </button>
      ))}
    </div>
  );
}

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
