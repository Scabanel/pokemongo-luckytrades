"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import ParticleBackground from "@/components/ParticleBackground";
import PokemonCard from "@/components/PokemonCard";
import CardSkeleton from "@/components/CardSkeleton";
import PartageListe from "@/components/PartageListe";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import type { PokeOption } from "@/components/AdminPanel";
import pokemonList from "@/data/pokemon.json";
import type { PokemonEntry, EntryCategory, Trainer } from "@/lib/types";
import { CATEGORIES, CATEGORY_DISPLAY_ORDER } from "@/lib/categories";
import { EMPTY_ENTRY_FILTERS, ENTRY_FILTER_CHIPS, matchesEntryFilters, type EntryFilters } from "@/lib/entryFilters";
import { entriesMatch } from "@/lib/entryMatching";
import GrilleParRegion from "@/components/GrilleParRegion";

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
  // "Que je possède" (onglet "X recherche" de quelqu'un d'autre) : ne montre
  // que les Pokémon recherchés que LE VISITEUR a déjà en give/mirror,
  // évite de scroller toute la liste pour retrouver les quelques
  // correspondances (voir CopyPogoShinyFilterButton pour un besoin voisin).
  const [onlyOwned, setOnlyOwned] = useState(false);
  // Symétrique sur l'onglet "X peut donner" de quelqu'un d'autre : ne montre
  // que ce que LE VISITEUR recherche lui-même dans sa propre liste "Je
  // recherche".
  const [onlyWanted, setOnlyWanted] = useState(false);
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
  // Id du dresseur connecté qui REGARDE cette page (peut différer de `trainer`
  // ci-dessus, qui est le propriétaire du catalogue affiché) : distingue "je
  // regarde mon propre catalogue" de "je regarde celui de quelqu'un d'autre"
  // pour les tuiles want/give viewer-dépendantes (voir PokemonCard.tsx).
  const [viewerTrainerId, setViewerTrainerId] = useState<string | null>(null);

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
        setViewerTrainerId(me?.trainer?.id ?? null);
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
  // "Que je possède"/"Que je recherche" n'ont de sens que sur le catalogue de
  // QUELQU'UN D'AUTRE (sur son propre catalogue, "ce que je recherche que je
  // possède déjà" n'aide personne).
  const isViewingOther = viewerTrainerId != null && viewerTrainerId !== trainer?.id;
  const showOnlyOwnedToggle = activeTab === "want" && isViewingOther;
  const showOnlyWantedToggle = activeTab === "give" && isViewingOther;
  const viewerOwnEntries = allEntries.filter((e) => e.trainer?.id === viewerTrainerId);
  // entriesMatch ne valide QUE le rôle "give" (2e argument) — catégorie
  // "give", non complété, non lié (voir lib/entryMatching.ts). Le rôle
  // "want" (1er argument) n'est pas validé par la fonction : "Que je
  // possède" passe `e` en position want, qui vient déjà de l'onglet "want"
  // (donc sûr) ; "Que je recherche" passe `mine` en position want, qui vient
  // de TOUTES les entrées du visiteur (want/give/mirror mélangées) — sans ce
  // filtre explicite sur la catégorie et le lien, une entrée "give"/"mirror"
  // du visiteur, ou un want déjà réservé, compterait à tort comme "je le
  // recherche".
  const viewerActiveWants = viewerOwnEntries.filter((e) => e.category === "want" && !e.linkedEntryId);
  const visibleEntries = entriesByTab[activeTab]
    .filter((e) => matchesEntryFilters(e, search, filters))
    .filter((e) => !onlyOwned || !showOnlyOwnedToggle || viewerOwnEntries.some((mine) => entriesMatch(e, mine)))
    .filter((e) => !onlyWanted || !showOnlyWantedToggle || viewerActiveWants.some((mine) => entriesMatch(mine, e)));
  const anyFilterActive =
    search.trim() !== "" ||
    Object.values(filters).some(Boolean) ||
    (onlyOwned && showOnlyOwnedToggle) ||
    (onlyWanted && showOnlyWantedToggle);
  const activeColor = CATEGORIES[activeTab].color;

  if (!loading && notFound) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center" style={{ background: "var(--papier)" }}>
        <ParticleBackground />
        <p style={{ color: "var(--encre-tres-douce)", marginBottom: 16 }}>Ce dresseur n&apos;existe pas.</p>
        <a href="/dresseurs" className="btn-secondary" style={{ textDecoration: "none" }}>Dresseurs</a>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col" style={{ background: "var(--papier)" }}>
      <ParticleBackground />
      <div className="scanlines" />

      <SiteNav active="/dresseurs" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        <header className="text-center mb-8">
          <a
            href="/dresseurs"
            style={{
              color: "var(--encre-douce)", fontSize: "0.8125rem", textDecoration: "underline",
              minHeight: 44, display: "inline-flex", alignItems: "center", padding: "0 8px",
            }}
          >
            Tous les dresseurs
          </a>
          <div className="flex items-center justify-center gap-3 flex-wrap" style={{ marginTop: 6 }}>
            <h1
              style={{
                fontFamily: "Exo 2, sans-serif",
                fontSize: "clamp(1.4rem, 4vw, 2.2rem)",
                fontWeight: 900,
                color: "var(--encre)",
                textTransform: "uppercase",
                textShadow: "none",
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
            <p style={{ color: "var(--encre-tres-douce)", fontSize: "0.85rem", marginTop: 4 }}>
              {trainer.team.charAt(0).toUpperCase() + trainer.team.slice(1)} · Niveau {trainer.level ?? "?"}
            </p>
          )}
          {trainer?.friendCode && (
            <div className="flex items-center justify-center gap-2" style={{ marginTop: 8 }}>
              <span style={{ color: "var(--encre-tres-douce)", fontSize: "0.85rem" }}>
                Code ami : {trainer.friendCode}
              </span>
              <button
                onClick={handleCopyFriendCode}
                className="btn-secondary"
                style={{ fontSize: "0.75rem", padding: "4px 10px" }}
              >
                Copier
              </button>
            </div>
          )}
        </header>

        <div className="flex gap-2 mb-5 flex-wrap justify-center mobile-fit-row">
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
                // 42px de haut avant : sous le plancher de 44, mesure a 768 et 1440px des
                // que la page des cartes est entree dans le banc.
                minHeight: 44,
                fontFamily: "Exo 2, sans-serif",
                fontWeight: 800,
                fontSize: "0.8125rem",
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
                      background: "var(--surface-creuse)",
                      borderColor: "var(--trait-leger)",
                      color: "var(--encre-tres-douce)",
                    }),
              }}
            >
              <span>{tabLabel(key, trainer?.name ?? "…")}</span>
              <span
                style={{
                  background: activeTab === key ? `${CATEGORIES[key].color}18` : "var(--surface-creuse)",
                  border: `1px solid ${activeTab === key ? `${CATEGORIES[key].color}38` : "var(--trait-leger)"}`,
                  borderRadius: 4,
                  padding: "1px 7px",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  color: activeTab === key ? CATEGORIES[key].color : "var(--encre-tres-douce)",
                }}
              >
                {loading ? "…" : countByTab[key]}
              </span>
            </button>
          ))}
        </div>

        {!loading && (
          <div className="flex flex-wrap items-center gap-2 mb-5 justify-center mobile-fit-row">
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
                  // Plancher tactile : ces pastilles faisaient 26px de haut, mesure par
                  // check:mobile des que la page des cartes est entree dans le banc. Les
                  // trois familles de pastilles de cette page avaient le meme defaut.
                  minHeight: 44,
                  // Et minWidth : « Fond » mesurait 42,8px de large pour 44 de haut. Un
                  // plancher tactile vaut dans les DEUX sens, sinon une pastille a libelle
                  // court reste ratable.
                  minWidth: 44,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 14px",
                  borderRadius: 999,
                  fontFamily: "Exo 2, sans-serif",
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                  border: "1px solid",
                  transition: "all 0.12s",
                  ...(filters[key]
                    ? { background: "color-mix(in srgb, var(--encre) 15%, transparent)", borderColor: "color-mix(in srgb, var(--encre) 40%, transparent)", color: "var(--encre)" }
                    : { background: "var(--trait-leger)", borderColor: "var(--trait-leger)", color: "var(--encre-tres-douce)" }),
                }}
              >
                {label}
              </button>
            ))}
            {showOnlyOwnedToggle && (
              <button
                onClick={() => setOnlyOwned((v) => !v)}
                style={{
                  // Plancher tactile : ces pastilles faisaient 26px de haut, mesure par
                  // check:mobile des que la page des cartes est entree dans le banc. Les
                  // trois familles de pastilles de cette page avaient le meme defaut.
                  minHeight: 44,
                  // Et minWidth : « Fond » mesurait 42,8px de large pour 44 de haut. Un
                  // plancher tactile vaut dans les DEUX sens, sinon une pastille a libelle
                  // court reste ratable.
                  minWidth: 44,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 14px",
                  borderRadius: 999,
                  fontFamily: "Exo 2, sans-serif",
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                  border: "1px solid",
                  transition: "all 0.12s",
                  ...(onlyOwned
                    ? { background: "color-mix(in srgb, var(--tag-saison) 15%, transparent)", borderColor: "color-mix(in srgb, var(--tag-saison) 40%, transparent)", color: "var(--tag-saison)" }
                    : { background: "var(--trait-leger)", borderColor: "var(--trait-leger)", color: "var(--encre-tres-douce)" }),
                }}
              >
                Que je possède
              </button>
            )}
            {showOnlyWantedToggle && (
              <button
                onClick={() => setOnlyWanted((v) => !v)}
                style={{
                  // Plancher tactile : ces pastilles faisaient 26px de haut, mesure par
                  // check:mobile des que la page des cartes est entree dans le banc. Les
                  // trois familles de pastilles de cette page avaient le meme defaut.
                  minHeight: 44,
                  // Et minWidth : « Fond » mesurait 42,8px de large pour 44 de haut. Un
                  // plancher tactile vaut dans les DEUX sens, sinon une pastille a libelle
                  // court reste ratable.
                  minWidth: 44,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 14px",
                  borderRadius: 999,
                  fontFamily: "Exo 2, sans-serif",
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                  border: "1px solid",
                  transition: "all 0.12s",
                  ...(onlyWanted
                    ? { background: "color-mix(in srgb, var(--encre) 15%, transparent)", borderColor: "color-mix(in srgb, var(--encre) 40%, transparent)", color: "var(--encre)" }
                    : { background: "var(--trait-leger)", borderColor: "var(--trait-leger)", color: "var(--encre-tres-douce)" }),
                }}
              >
                Que je recherche
              </button>
            )}
            {anyFilterActive && (
              <button
                onClick={() => { setSearch(""); setFilters(EMPTY_ENTRY_FILTERS); setOnlyOwned(false); setOnlyWanted(false); }}
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
            background: "color-mix(in srgb, var(--papier) 50%, transparent)",
            border: `1px solid ${activeColor}18`,
            borderTop: `2px solid ${activeColor}`,
            borderRadius: 10,
            padding: 20,
            minHeight: 300,
          }}
        >
          {/* Le QR code et le filtre a coller dans le jeu. Remplace un bouton secondaire
              qui ne copiait que les shiny et se perdait en haut de la liste : Steven veut
              pouvoir degainer sa liste en dix secondes devant quelqu un. */}
          {!loading && (
            <PartageListe
              nomDresseur={trainer?.name ?? "ce dresseur"}
              entriesParCategorie={entriesByTab}
              categorieActive={activeTab}
            />
          )}
          {loading ? (
            <div className="grid grille-tuiles gap-3">
              {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : visibleEntries.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--encre-tres-douce)", padding: 32 }}>
              {anyFilterActive ? "Aucun résultat pour ces filtres." : "Rien ici pour le moment."}
            </p>
          ) : (
            /* Meme mise en page que « Mon espace », par le meme composant : voir
               components/GrilleParRegion.tsx pour la raison. */
            <GrilleParRegion
              entries={visibleEntries}
              carte={(entry) => (
                <PokemonCard
                  key={entry.id}
                  entry={entry}
                  allEntries={allEntries}
                  viewerTrainerId={viewerTrainerId}
                  showTrainerBadge={false}
                  canEdit={isAdmin}
                  onEdit={isAdmin ? () => setEditingEntry(entry) : undefined}
                  onDelete={isAdmin ? () => handleDeleteEntry(entry.id) : undefined}
                  onComplete={isAdmin ? () => handleCompleteEntry(entry) : undefined}
                  onQuantityChange={isAdmin ? (delta) => handleQuantityChange(entry, delta) : undefined}
                />
              )}
            />
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
