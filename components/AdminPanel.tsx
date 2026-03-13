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
  shiny: boolean;
  customSpriteUrl?: string | null;
  tradeForPokemonName?: string | null;
  tradeForPokemonId?: number | null;
  notes?: string | null;
  priority?: number | null;
  tags?: string | null;
  completed: boolean;
  trainer?: Trainer | null;
}

interface PokeOption {
  name: string;       // English (internal, for pokemonId resolution)
  url: string;
  id: number;
  frenchName: string; // French (displayed + stored as pokemonName)
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
    // Fetch Pokémon list + French names in parallel
    Promise.all([
      fetch("https://pokeapi.co/api/v2/pokemon?limit=1025").then((r) => r.json()),
      fetch("https://beta.pokeapi.co/graphql/v1beta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `{ pokemon_v2_pokemonspeciesname(where: {language_id: {_eq: 5}}) { name pokemon_species_id } }`,
        }),
      })
        .then((r) => r.json())
        .catch(() => ({ data: { pokemon_v2_pokemonspeciesname: [] } })),
    ])
      .then(([listData, gqlData]) => {
        const frenchMap = new Map<number, string>(
          ((gqlData.data?.pokemon_v2_pokemonspeciesname ?? []) as { name: string; pokemon_species_id: number }[])
            .map(({ name, pokemon_species_id }) => [pokemon_species_id, name])
        );
        const options: PokeOption[] = listData.results.map(
          (p: { name: string; url: string }, i: number) => ({
            name: p.name,
            url: p.url,
            id: i + 1,
            frenchName: frenchMap.get(i + 1) ?? p.name,
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
          existingEntries={entries}
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

      {/* Sprite */}
      <PokemonSprite pokemonId={entry.pokemonId} alt={entry.pokemonName} size={48} shiny={entry.shiny || (entry.notes?.toLowerCase().includes("shiny") ?? false)} customSpriteUrl={entry.customSpriteUrl} />

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
  existingEntries,
  onClose,
  onAdded,
}: {
  trainers: Trainer[];
  pokeOptions: PokeOption[];
  existingEntries: PokemonEntry[];
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
    shiny: false,
    customSpriteUrl: null as string | null,
    priority: null as number | null,
    tags: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [pokeSearch, setPokeSearch] = useState("");
  const [tradeSearch, setTradeSearch] = useState("");
  const [showPokeSuggestions, setShowPokeSuggestions] = useState(false);
  const [showTradeSuggestions, setShowTradeSuggestions] = useState(false);
  const pokeRef = useRef<HTMLDivElement>(null);
  const tradeRef = useRef<HTMLDivElement>(null);

  const pokeSuggestions = pokeSearch.length >= 2
    ? pokeOptions.filter((p) => p.frenchName.toLowerCase().includes(pokeSearch.toLowerCase())).slice(0, 8)
    : [];

  const tradeSuggestions = tradeSearch.length >= 2
    ? pokeOptions.filter((p) => p.frenchName.toLowerCase().includes(tradeSearch.toLowerCase())).slice(0, 8)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pokemonId || !form.pokemonName) {
      toast.error("Sélectionne un Pokémon valide");
      return;
    }
    if (form.category === "want") {
      const duplicate = existingEntries.find(
        (e) => e.category === "want" && e.pokemonId === form.pokemonId && !!e.shiny === form.shiny
      );
      if (duplicate) {
        toast.error(`${form.pokemonName}${form.shiny ? " ✨ Shiny" : ""} est déjà dans "Je recherche"`);
        return;
      }
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
          priority: form.priority || null,
          tags: form.tags,
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
              <PokemonSprite pokemonId={form.pokemonId} alt={form.pokemonName} size={40} shiny={form.shiny} customSpriteUrl={form.customSpriteUrl} />
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
                    setForm((f) => ({ ...f, pokemonName: p.frenchName, pokemonId: p.id }));
                    setPokeSearch(p.frenchName);
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
          <label className="field-label">NOTES (optionnel)</label>
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
        {form.pokemonId > 0 && (
          <div>
            <label className="field-label">SPRITE PERSONNALISÉ (optionnel)</label>
            <SpritePicker
              pokemonId={form.pokemonId}
              pokemonName={form.pokemonName}
              currentUrl={form.customSpriteUrl}
              onSelect={(url) => setForm((f) => ({ ...f, customSpriteUrl: url }))}
            />
          </div>
        )}

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
    category: entry.category as "want" | "give" | "mirror",
    trainerId: entry.trainer?.id ?? "",
    tradeForPokemonName: entry.tradeForPokemonName ?? "",
    tradeForPokemonId: entry.tradeForPokemonId ?? 0,
    notes: entry.notes ?? "",
    shiny: entry.shiny,
    customSpriteUrl: entry.customSpriteUrl ?? null as string | null,
    priority: entry.priority ?? null as number | null,
    tags: parseTags(entry.tags),
  });
  const [tradeSearch, setTradeSearch] = useState(entry.tradeForPokemonName ?? "");
  const [showTradeSuggestions, setShowTradeSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  const tradeSuggestions = tradeSearch.length >= 2
    ? pokeOptions.filter((p) => p.frenchName.toLowerCase().includes(tradeSearch.toLowerCase())).slice(0, 8)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          shiny: form.shiny,
          customSpriteUrl: form.customSpriteUrl,
          trainerId: form.trainerId || null,
          tradeForPokemonName: form.tradeForPokemonName || null,
          tradeForPokemonId: form.tradeForPokemonId || null,
          notes: form.notes || null,
          priority: form.priority || null,
          tags: form.tags,
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
        <PokemonSprite pokemonId={entry.pokemonId} alt={entry.pokemonName} size={48} shiny={form.shiny} customSpriteUrl={form.customSpriteUrl} />
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
              color: form.category === "want" ? "#0affe0" : form.category === "mirror" ? "#b464ff" : "#ffd93d",
              fontWeight: 600,
              fontFamily: "Exo 2, sans-serif",
            }}
          >
            {form.category === "want" ? "Je recherche" : form.category === "mirror" ? "Miroir ✨" : "Je peux donner"}
          </span>
        </div>
      </div>

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
                    setForm((f) => ({ ...f, tradeForPokemonName: p.frenchName, tradeForPokemonId: p.id }));
                    setTradeSearch(p.frenchName);
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
        <div>
          <label className="field-label">SPRITE PERSONNALISÉ (optionnel)</label>
          <SpritePicker
            pokemonId={entry.pokemonId}
            pokemonName={entry.pokemonName}
            currentUrl={form.customSpriteUrl}
            onSelect={(url) => setForm((f) => ({ ...f, customSpriteUrl: url }))}
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

// ─── Pokekalos GO sprites ─────────────────────────────────────────────────────

const POKEKALOS_BASE = "https://www.media.pokekalos.fr/img/pokemon/pokego";

const POKEKALOS_SUFFIXES: { slug: string; label: string }[] = [
  { slug: "", label: "Normal GO" },
  { slug: "-halloween", label: "Halloween" },
  { slug: "-halloween2021", label: "Halloween '21" },
  { slug: "-halloween2022", label: "Halloween '22" },
  { slug: "-halloween2023", label: "Halloween '23" },
  { slug: "-halloween2024", label: "Halloween '24" },
  { slug: "-noel", label: "Noël" },
  { slug: "-noel-2023", label: "Noël '23" },
  { slug: "-noel24", label: "Noël '24" },
  { slug: "-holiday2020", label: "Holiday '20" },
  { slug: "-holiday2021", label: "Holiday '21" },
  { slug: "-anniversaire", label: "Anniversaire" },
  { slug: "-capitaine", label: "Capitaine" },
  { slug: "-summer", label: "Summer" },
  { slug: "-costume-2022", label: "Costume '22" },
  { slug: "-gigamax", label: "Gigamax" },
  { slug: "-a", label: "Alolan" },
  { slug: "-h", label: "Hisuian" },
  { slug: "-g", label: "Galarian" },
  { slug: "-detective", label: "Détective" },
  { slug: "-pokemonday20", label: "Pokémon Day '20" },
  { slug: "-pokemonday21", label: "Pokémon Day '21" },
  { slug: "-libre", label: "Libre" },
  { slug: "-flying", label: "Vol" },
  { slug: "-original", label: "Original" },
];

function toPokekalosSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(" ")[0]
    .replace(/[^a-z0-9]/g, "");
}

function generatePokekalosSprites(pokemonName: string): { url: string; label: string }[] {
  const base = toPokekalosSlug(pokemonName);
  if (!base) return [];
  const results: { url: string; label: string }[] = [];
  for (const { slug, label } of POKEKALOS_SUFFIXES) {
    results.push({ url: `${POKEKALOS_BASE}/${base}${slug}.png`, label });
    results.push({ url: `${POKEKALOS_BASE}/${base}${slug}-s.png`, label: `${label} ✨` });
  }
  return results;
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
  const [showPokekalos, setShowPokekalos] = useState(false);
  const pokekalosSprites = generatePokekalosSprites(pokemonName);

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

            {/* Pokekalos GO section */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setShowPokekalos((v) => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "rgba(255,153,0,0.08)", border: "1px solid rgba(255,153,0,0.3)",
                  borderRadius: 10, padding: "7px 14px", cursor: "pointer",
                  color: "#ff9900", fontFamily: "Exo 2, sans-serif", fontWeight: 700, fontSize: "0.8rem",
                  width: "100%", justifyContent: "space-between",
                }}
              >
                <span>🎮 Sprites Pokémon GO (Pokekalos) — variantes événement</span>
                <span style={{ opacity: 0.7 }}>{showPokekalos ? "▲" : "▼"}</span>
              </button>
              {showPokekalos && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ fontSize: "0.7rem", color: "rgba(232,237,245,0.4)", marginBottom: 8 }}>
                    Les tuiles cassées sont masquées automatiquement. Basé sur : <strong style={{ color: "rgba(232,237,245,0.6)" }}>{toPokekalosSlug(pokemonName)}</strong>
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 6 }}>
                    {pokekalosSprites.map(({ url, label }) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => { onSelect(url); setOpen(false); }}
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
                  </div>
                </div>
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
