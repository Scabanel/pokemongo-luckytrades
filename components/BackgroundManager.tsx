"use client";

import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import backgroundCatalog from "@/data/backgrounds.json";
import validatedBackgrounds from "@/data/pokemon-backgrounds.json";
import pokemonList from "@/data/pokemon.json";

type BackgroundEntry = { label: string; url: string };
type PokeListEntry = { id: number; name: string; frenchName: string };

const POKE_LIST = pokemonList as PokeListEntry[];
const NAME_BY_ID = new Map(POKE_LIST.map((p) => [p.id, p.frenchName]));

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Interface de gestion des fonds d'événement demandée par Steven : renommer,
// remplacer l'image, supprimer une entrée des deux catalogues (génériques
// data/backgrounds.json + validés par Pokémon data/pokemon-backgrounds.json),
// avec sauvegarde qui commite sur GitHub (voir app/api/admin/backgrounds) et
// se propage donc à tout le monde après redéploiement. PokemonEntry.
// backgroundUrl est une simple chaîne d'URL sans clé étrangère (voir
// AdminPanel.tsx/BackgroundPicker) : renommer/supprimer une entrée du
// catalogue ne casse aucune fiche déjà enregistrée, ça retire juste l'option
// du sélecteur pour les futurs choix.
export default function BackgroundManager() {
  const [generic, setGeneric] = useState<BackgroundEntry[]>(backgroundCatalog as BackgroundEntry[]);
  const [perSpecies, setPerSpecies] = useState<Record<string, BackgroundEntry[]>>(
    validatedBackgrounds as Record<string, BackgroundEntry[]>
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"species" | "generic">("species");
  const [speciesSearch, setSpeciesSearch] = useState("");
  const [selectedDexId, setSelectedDexId] = useState<number | null>(null);
  const [genericSearch, setGenericSearch] = useState("");
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUpload = useRef<{ scope: "generic" | number; index: number | "new" } | null>(null);

  const speciesWithBackgrounds = useMemo(
    () => Object.keys(perSpecies).map(Number).sort((a, b) => a - b),
    [perSpecies]
  );

  const speciesResults = speciesSearch.trim().length >= 2
    ? POKE_LIST.filter((p) => p.frenchName.toLowerCase().includes(speciesSearch.trim().toLowerCase())).slice(0, 20)
    : speciesWithBackgrounds
        .map((id) => ({ id, name: "", frenchName: NAME_BY_ID.get(id) ?? `#${id}` }))
        .slice(0, 40);

  const genericFiltered = genericSearch.trim()
    ? generic.filter((b) => b.label.toLowerCase().includes(genericSearch.trim().toLowerCase()))
    : generic;

  const speciesList = selectedDexId != null ? perSpecies[String(selectedDexId)] ?? [] : [];

  function updateGeneric(next: BackgroundEntry[]) {
    setGeneric(next);
    setDirty(true);
  }
  function updateSpeciesList(dexId: number, next: BackgroundEntry[]) {
    setPerSpecies((prev) => ({ ...prev, [String(dexId)]: next }));
    setDirty(true);
  }

  function handleRename(index: number, label: string) {
    if (view === "generic") {
      const next = [...generic];
      next[index] = { ...next[index], label };
      updateGeneric(next);
    } else if (selectedDexId != null) {
      const next = [...speciesList];
      next[index] = { ...next[index], label };
      updateSpeciesList(selectedDexId, next);
    }
  }

  function handleDelete(index: number) {
    if (view === "generic") {
      updateGeneric(generic.filter((_, i) => i !== index));
    } else if (selectedDexId != null) {
      updateSpeciesList(selectedDexId, speciesList.filter((_, i) => i !== index));
    }
  }

  function triggerUpload(index: number | "new") {
    if (view === "species" && selectedDexId == null) return;
    pendingUpload.current = { scope: view === "generic" ? "generic" : selectedDexId!, index };
    fileInputRef.current?.click();
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const pending = pendingUpload.current;
    if (!file || !pending) return;

    const key = `${pending.scope}-${pending.index}`;
    setUploadingKey(key);
    try {
      const dataBase64 = await fileToBase64(file);
      const res = await fetch("/api/admin/backgrounds/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, dataBase64 }),
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      const defaultLabel = file.name.replace(/\.[^.]+$/, "");

      if (pending.scope === "generic") {
        if (pending.index === "new") {
          updateGeneric([...generic, { label: defaultLabel, url }]);
        } else {
          const next = [...generic];
          next[pending.index] = { ...next[pending.index], url };
          updateGeneric(next);
        }
      } else {
        const dexId = pending.scope;
        const list = perSpecies[String(dexId)] ?? [];
        if (pending.index === "new") {
          updateSpeciesList(dexId, [...list, { label: defaultLabel, url }]);
        } else {
          const next = [...list];
          next[pending.index] = { ...next[pending.index], url };
          updateSpeciesList(dexId, next);
        }
      }
      toast.success("Image téléversée");
    } catch {
      toast.error("Échec du téléversement");
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/backgrounds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backgrounds: generic, pokemonBackgrounds: perSpecies }),
      });
      if (!res.ok) throw new Error();
      setDirty(false);
      toast.success("Enregistré : ça se propage à tout le monde d'ici quelques minutes (redéploiement).");
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  const listToShow = view === "generic" ? genericFiltered : speciesList;
  const listIndexOffset = view === "generic"
    ? (label: string, url: string) => generic.findIndex((b) => b.label === label && b.url === url)
    : (label: string, url: string) => speciesList.findIndex((b) => b.label === label && b.url === url);

  return (
    <div className="glass-card" style={{ padding: "clamp(14px, 3vw, 24px)" }}>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChosen} />

      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h2 style={{ fontFamily: "Exo 2, sans-serif", color: "#b464ff", fontWeight: 700, fontSize: "1.15rem" }}>
          Fonds d&apos;événement
        </h2>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="btn-primary"
          style={{ opacity: !dirty || saving ? 0.5 : 1 }}
        >
          {saving ? "Enregistrement…" : dirty ? "Enregistrer les modifications" : "Enregistré"}
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {(["species", "generic"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            style={{
              padding: "6px 14px", borderRadius: 999, cursor: "pointer",
              border: "1px solid", fontFamily: "Exo 2, sans-serif", fontWeight: 600, fontSize: "0.78rem",
              ...(view === v
                ? { background: "rgba(180,100,255,0.15)", borderColor: "rgba(180,100,255,0.4)", color: "#b464ff" }
                : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#b0bac8" }),
            }}
          >
            {v === "species" ? "Fonds validés par Pokémon" : "Fonds génériques"}
          </button>
        ))}
      </div>

      {view === "species" && (
        <div className="mb-4">
          <input
            type="text"
            value={speciesSearch}
            onChange={(e) => setSpeciesSearch(e.target.value)}
            className="glass-input"
            placeholder="Chercher un Pokémon (ou parcourir ceux qui ont déjà des fonds ci-dessous)"
            style={{ marginBottom: 8 }}
          />
          <div className="flex gap-2 flex-wrap">
            {speciesResults.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedDexId(p.id)}
                style={{
                  padding: "5px 12px", borderRadius: 999, cursor: "pointer",
                  border: "1px solid", fontFamily: "Exo 2, sans-serif", fontWeight: 600, fontSize: "0.75rem",
                  ...(selectedDexId === p.id
                    ? { background: "rgba(180,100,255,0.15)", borderColor: "rgba(180,100,255,0.4)", color: "#b464ff" }
                    : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#b0bac8" }),
                }}
              >
                #{p.id} {p.frenchName}
              </button>
            ))}
          </div>
          {selectedDexId == null && (
            <p style={{ fontSize: "0.75rem", color: "rgba(232,237,245,0.35)", marginTop: 10 }}>
              Choisis un Pokémon pour voir/modifier ses fonds validés.
            </p>
          )}
        </div>
      )}

      {view === "generic" && (
        <input
          type="text"
          value={genericSearch}
          onChange={(e) => setGenericSearch(e.target.value)}
          className="glass-input"
          placeholder="Chercher un fond (ex: paris, anniversary, team leader...)"
          style={{ marginBottom: 12 }}
        />
      )}

      {(view === "generic" || selectedDexId != null) && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 12 }}>
            {listToShow.map((b) => {
              const index = listIndexOffset(b.label, b.url);
              const key = `${view === "generic" ? "generic" : selectedDexId}-${index}`;
              return (
                <div
                  key={`${b.url}-${index}`}
                  style={{
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10, padding: 8, display: "flex", flexDirection: "column", gap: 6,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.url}
                    alt={b.label}
                    style={{ width: "100%", height: 70, objectFit: "cover", borderRadius: 6, background: "rgba(0,0,0,0.3)" }}
                  />
                  <input
                    type="text"
                    value={b.label}
                    onChange={(e) => handleRename(index, e.target.value)}
                    className="glass-input"
                    style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => triggerUpload(index)}
                      disabled={uploadingKey === key}
                      style={{
                        flex: 1, padding: "4px 6px", borderRadius: 6, cursor: "pointer", fontSize: "0.75rem",
                        background: "rgba(100,220,180,0.1)", border: "1px solid rgba(100,220,180,0.3)", color: "#64dcb4",
                      }}
                    >
                      {uploadingKey === key ? "…" : "Remplacer l'image"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(index)}
                      style={{
                        padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontSize: "0.75rem",
                        background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", color: "#ff6b6b",
                      }}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => triggerUpload("new")}
            disabled={uploadingKey === `${view === "generic" ? "generic" : selectedDexId}-new`}
            className="btn-secondary"
            style={{ fontSize: "0.8rem" }}
          >
            {uploadingKey === `${view === "generic" ? "generic" : selectedDexId}-new` ? "Téléversement…" : "+ Ajouter un fond"}
          </button>
        </>
      )}
    </div>
  );
}
