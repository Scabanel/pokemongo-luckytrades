"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import PokemonSprite from "./PokemonSprite";
import type { PokemonEntry } from "@/lib/types";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { parseTags, REGIONAL_FORM_NAME } from "@/lib/tags";
import gigantamaxIcons from "@/data/gigantamax-icons.json";
import pokemonList from "@/data/pokemon.json";
import legendarySpecies from "@/data/legendary-species.json";
import { getGenderForCustomSprite } from "@/lib/spriteVariants";
import { entriesMatch, entriesMatchMirror } from "@/lib/entryMatching";

// Sprite officiel de forme Gigamax (aspect réellement différent en jeu), pour
// la poignée d'espèces qui en ont un, voir scripts/generate-costume-catalog.mjs.
// Aucun override équivalent pour Dynamax : ça ne change pas l'apparence dans GO.
const GIGANTAMAX_ICON_BASE = "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon%20-%20256x256/Addressable%20Assets";
const GIGANTAMAX_ICONS = gigantamaxIcons as Record<string, string[]>;
const ENGLISH_NAME_BY_ID = new Map(pokemonList.map((p) => [p.id, p.name]));
// Légendaires/Mythiques/Ultra-Chimères (voir lib/entryFilters.ts, même
// source) : calculé à partir du pokemonId plutôt que stocké en base, pour que
// le badge s'affiche automatiquement sur TOUTES les entrées existantes ET
// futures sans backfill à maintenir (même logique que le badge Dynamax/Gigamax
// ci-dessous, déjà dérivé du tag/nom plutôt que d'un champ dédié).
const LEGENDARY_SPECIES = new Set(legendarySpecies as number[]);

function getGigantamaxSpriteUrl(pokemonId: number, shiny: boolean): string | null {
  const files = GIGANTAMAX_ICONS[String(pokemonId)];
  if (!files) return null;
  const filename = shiny && files[1] ? files[1] : files[0];
  return `${GIGANTAMAX_ICON_BASE}/${encodeURIComponent(filename)}`;
}

const TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  halloween:    { bg: "color-mix(in srgb, var(--tag-fete) 20%, transparent)",   text: "var(--tag-fete)", border: "color-mix(in srgb, var(--tag-fete) 50%, transparent)" },
  noel:         { bg: "color-mix(in srgb, var(--tag-saison) 20%, transparent)",   text: "var(--tag-saison)", border: "color-mix(in srgb, var(--tag-saison) 50%, transparent)" },
  "noël":       { bg: "color-mix(in srgb, var(--tag-saison) 20%, transparent)",   text: "var(--tag-saison)", border: "color-mix(in srgb, var(--tag-saison) 50%, transparent)" },
  holiday:      { bg: "color-mix(in srgb, var(--tag-saison) 20%, transparent)",   text: "var(--tag-saison)", border: "color-mix(in srgb, var(--tag-saison) 50%, transparent)" },
  anniversaire: { bg: "color-mix(in srgb, var(--tag-fete) 20%, transparent)",    text: "var(--tag-fete)", border: "color-mix(in srgb, var(--tag-fete) 50%, transparent)" },
  fete:         { bg: "color-mix(in srgb, var(--tag-fete) 20%, transparent)",    text: "var(--tag-fete)", border: "color-mix(in srgb, var(--tag-fete) 50%, transparent)" },
  "fête":       { bg: "color-mix(in srgb, var(--tag-fete) 20%, transparent)",    text: "var(--tag-fete)", border: "color-mix(in srgb, var(--tag-fete) 50%, transparent)" },
  gigamax:      { bg: "color-mix(in srgb, var(--tag-max) 20%, transparent)",   text: "var(--tag-max)", border: "color-mix(in srgb, var(--tag-max) 50%, transparent)" },
  dynamax:      { bg: "color-mix(in srgb, var(--tag-max) 20%, transparent)",    text: "var(--tag-max)", border: "color-mix(in srgb, var(--tag-max) 50%, transparent)" },
  costume:      { bg: "color-mix(in srgb, var(--tag-costume) 20%, transparent)",  text: "var(--tag-costume)", border: "color-mix(in srgb, var(--tag-costume) 50%, transparent)" },
  evenement:    { bg: "color-mix(in srgb, var(--ligne-miroir) 20%, transparent)",  text: "var(--ligne-miroir)", border: "color-mix(in srgb, var(--ligne-miroir) 50%, transparent)" },
  "événement":  { bg: "color-mix(in srgb, var(--ligne-miroir) 20%, transparent)",  text: "var(--ligne-miroir)", border: "color-mix(in srgb, var(--ligne-miroir) 50%, transparent)" },
  fond:         { bg: "color-mix(in srgb, var(--tag-fond) 20%, transparent)",  text: "var(--tag-fond)", border: "color-mix(in srgb, var(--tag-fond) 50%, transparent)" },
  legendaire:   { bg: "color-mix(in srgb, var(--or) 20%, transparent)",    text: "var(--or)", border: "color-mix(in srgb, var(--or) 50%, transparent)" },
};

const DEFAULT_TAG_COLOR = { bg: "color-mix(in srgb, var(--tag-neutre) 15%, transparent)", text: "var(--tag-neutre)", border: "color-mix(in srgb, var(--tag-neutre) 40%, transparent)" };
function getTagColor(tag: string) { return TAG_COLORS[tag.toLowerCase()] ?? DEFAULT_TAG_COLOR; }

// Badge ♂/♀ en haut à gauche du sprite : bleu/rouge classique des jeux
// Pokémon, pour distinguer les quelques espèces à sprite différent selon
// le genre (Pyroar, Frillish, Indeedee...).
function GenderBadge({ gender, size = 20 }: { gender: string | null | undefined; size?: number }) {
  if (gender !== "male" && gender !== "female") return null;
  const isMale = gender === "male";
  return (
    <span
      className="absolute"
      style={{
        top: 2, left: 2, zIndex: 1,
        width: size, height: size, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isMale ? "var(--ligne-cherche)" : "var(--tag-max)",
        color: "var(--surface)", fontWeight: 800, fontSize: size * 0.65,
        boxShadow: "none",
      }}
    >
      {isMale ? "♂" : "♀"}
    </span>
  );
}

function getEventTheme(name: string, tags: string[]): {
  borderColor: string; boxShadow: string; glow: string;
} | null {
  const combined = (name + " " + tags.join(" ")).toLowerCase();
  if (combined.includes("gigamax")) return {
    borderColor: "color-mix(in srgb, var(--tag-max) 40%, transparent)",
    boxShadow: "none",
    glow: "radial-gradient(circle, color-mix(in srgb, var(--tag-max) 35%, transparent) 0%, transparent 70%)",
  };
  if (combined.includes("dynamax")) return {
    borderColor: "color-mix(in srgb, var(--tag-max) 40%, transparent)",
    boxShadow: "none",
    glow: "radial-gradient(circle, color-mix(in srgb, var(--tag-max) 35%, transparent) 0%, transparent 70%)",
  };
  if (combined.includes("halloween")) return {
    borderColor: "color-mix(in srgb, var(--tag-fete) 40%, transparent)",
    boxShadow: "none",
    glow: "radial-gradient(circle, color-mix(in srgb, var(--tag-fete) 30%, transparent) 0%, transparent 70%)",
  };
  if (combined.includes("noël") || combined.includes("noel") || combined.includes("holiday")) return {
    borderColor: "color-mix(in srgb, var(--tag-saison) 40%, transparent)",
    boxShadow: "none",
    glow: "radial-gradient(circle, color-mix(in srgb, var(--tag-saison) 30%, transparent) 0%, transparent 70%)",
  };
  if (combined.includes("anniversaire") || combined.includes("fête") || combined.includes("fete") || combined.includes("chapeau")) return {
    borderColor: "color-mix(in srgb, var(--encre) 40%, transparent)",
    boxShadow: "none",
    glow: "radial-gradient(circle, color-mix(in srgb, var(--encre) 30%, transparent) 0%, transparent 70%)",
  };
  if (!REGIONAL_FORM_NAME.test(name) && name.trim().includes(" ")) return {
    borderColor: "color-mix(in srgb, var(--tag-costume) 30%, transparent)",
    boxShadow: "none",
    glow: "radial-gradient(circle, color-mix(in srgb, var(--tag-costume) 25%, transparent) 0%, transparent 70%)",
  };
  return null;
}

interface PokemonCardProps {
  entry: PokemonEntry;
  style?: React.CSSProperties;
  // Props ci-dessous optionnelles : uniquement utilisées par la vue "Mon espace"
  // (components/AdminPanel.tsx). Les pages publiques (catalogue d'un dresseur)
  // n'en passent aucune et gardent une carte purement en lecture seule.
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  // Une fois qu'au moins une tuile est sélectionnée, cliquer n'importe où sur
  // les autres bascule leur sélection au lieu d'ouvrir la fiche détail :
  // évite de viser la petite pastille à chaque tuile pour une sélection groupée.
  selectionActive?: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onComplete?: () => void;
  onQuantityChange?: (delta: number) => void;
  // Le bord vert + pastille dresseur signalent "cette entrée est assignée à
  // un dresseur précis" dans une liste qui en mélange plusieurs (catalogue
  // partagé, vue "Tous les dresseurs"). Inutile et redondant sur une liste
  // qui n'appartient déjà qu'à une seule personne (page publique d'un
  // dresseur, "Mes échanges") : `false` masque ce badge dans ce cas.
  showTrainerBadge?: boolean;
  // Toutes les entrées de tous les dresseurs (pas juste celles de cette
  // liste) : sert uniquement à calculer, pour une entrée "want", chez quels
  // autres dresseurs ce Pokémon est disponible (bouton "Dispo chez N
  // Dresseurs"). Recalculé automatiquement à chaque nouveau fetch du parent
  // (useMemo dérivé), pas de polling dédié.
  allEntries?: PokemonEntry[];
  // Id du dresseur actuellement connecté qui REGARDE la page (pas forcément
  // le propriétaire de cette entrée) : sert à distinguer "mon propre want"
  // (bouton Dispo chez N Dresseurs) de "le want de quelqu'un d'autre que je
  // regarde" (jamais ce bouton-là), et à détecter si CE visiteur recherche
  // lui-même ce Pokémon sur une tuile give/mirror d'un autre dresseur.
  viewerTrainerId?: string | null;
}


// Libellé spécifique à cette carte (diffère volontairement de "Échanges miroir"
// utilisé ailleurs) — couleur et glow, eux, viennent de lib/categories.ts.
const CATEGORY_LABEL: Record<string, string> = {
  want: "Je recherche",
  give: "Je peux donner",
  mirror: "Échange miroir",
};

function getPriorityStyle(priority: number): { bg: string; border: string; color: string; shadow: string } {
    // La premiere place etait #ffd700 : la migration l a prise pour de l or decoratif et
  // l a passee en encre, ce qui laissait un podium sans premiere place a cote d un argent
  // et d un bronze intacts. Une medaille est exactement ce a quoi l or a droit.
  if (priority === 1) return { bg: "var(--or-pale)", border: "var(--medaille-or)", color: "var(--medaille-or)", shadow: "none" };
  if (priority === 2) return { bg: "color-mix(in srgb, var(--medaille-argent) 20%, transparent)", border: "var(--medaille-argent)", color: "var(--medaille-argent)", shadow: "none" };
  if (priority === 3) return { bg: "color-mix(in srgb, var(--medaille-bronze) 20%, transparent)", border: "var(--medaille-bronze)", color: "var(--medaille-bronze)", shadow: "none" };
  return { bg: "color-mix(in srgb, var(--tag-neutre) 15%, transparent)", border: "var(--tag-neutre)", color: "var(--tag-neutre)", shadow: "none" };
}

export default function PokemonCard({
  entry,
  style,
  selectable,
  selected,
  onToggleSelect,
  selectionActive,
  canEdit,
  onEdit,
  onDelete,
  onComplete,
  onQuantityChange,
  showTrainerBadge = true,
  allEntries,
  viewerTrainerId,
}: PokemonCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [showAvailableFrom, setShowAvailableFrom] = useState(false);
  const [showWantedBy, setShowWantedBy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const quantity = entry.quantity ?? 1;
  const hasTrainerBadge = showTrainerBadge && !!entry.trainer;
  const closeDetail = () => {
    setShowDetail(false);
    setConfirmDelete(false);
  };
  const trainerColor = entry.trainer ? "var(--bon)" : "var(--encre)";
  const isMirror = entry.category === "mirror";
  const isShiny = entry.shiny === true || (entry.notes?.toLowerCase().includes("shiny") ?? false);
  const hasPriority = entry.priority != null && entry.priority >= 1 && entry.priority <= 10;
  const priorityStyle = hasPriority ? getPriorityStyle(entry.priority!) : null;

  const tags = parseTags(entry.tags);
  // Badge "légendaire" calculé au rendu (voir LEGENDARY_SPECIES plus haut),
  // jamais stocké en base : ajouté uniquement à la liste affichée, pas à
  // `tags`/`nameAndTags` qui servent à la détection Dynamax/Gigamax.
  const displayTags = LEGENDARY_SPECIES.has(entry.pokemonId) && !tags.some((t) => t.toLowerCase() === "legendaire")
    ? [...tags, "legendaire"]
    : tags;
  // entry.gender n'existe que pour les entrées ajoutées après l'introduction
  // du champ : pour les plus anciennes (gender null mais customSpriteUrl
  // pointant déjà vers un costume genré), on le retrouve a posteriori.
  const displayGender = entry.gender ?? getGenderForCustomSprite(entry.pokemonId, entry.customSpriteUrl);
  // Le nom du Pokémon ne contient pas toujours "Dynamax"/"Gigamax" (ex: un
  // tag "dynamax" ajouté à la main sur "Duralugon" sans renommer l'entrée) :
  // vérifie aussi les tags, pas seulement le nom.
  const nameAndTags = (entry.pokemonName + " " + tags.join(" ")).toLowerCase();
  const isDynamax = nameAndTags.includes("dynamax") && !nameAndTags.includes("gigamax");
  const isGigamax = nameAndTags.includes("gigamax");
  // Pour les espèces qui Gigamax réellement dans GO, PokemonSprite tente
  // d'abord leur vrai visuel Gigamax (animé Showdown, puis icône statique
  // officielle) avant la chaîne de sprites normale.
  const gigantamaxSlug = isGigamax ? ENGLISH_NAME_BY_ID.get(entry.pokemonId) ?? null : null;
  const gigantamaxIconUrl = isGigamax ? getGigantamaxSpriteUrl(entry.pokemonId, isShiny) : null;
  // Statique (icône officielle Pokémon GO) par défaut pour tout le monde,
  // sauf pour un dresseur ayant explicitement choisi "animated" (voir
  // MyAccountPanel / Trainer.preferredSpriteStyle).
  const preferStatic = entry.trainer?.preferredSpriteStyle !== "animated";
  const eventTheme = getEventTheme(entry.pokemonName, tags);
  const categoryColor = getCategory(entry.category)?.color ?? CATEGORIES.want.color;
  const categoryGlow = getCategory(entry.category)?.glow ?? CATEGORIES.give.glow;

  // Dresseurs (autres que soi) ayant ce Pokémon dispo en "give" (pas
  // "mirror" : un échange miroir reste dans son propre bassin réciproque,
  // voir entryMatching.ts) : masqué si un partenaire est déjà associé
  // (linkedEntryId) ou si ce n'est pas une entrée "want". Dérivé de
  // allEntries, donc se met à jour tout
  // seul dès que le parent refetch (pas de polling séparé à gérer ici).
  // N'a de sens que sur SA PROPRE entrée want : sur la page publique d'un
  // AUTRE dresseur, ses want à lui ne nous regardent pas — d'où le check
  // entryTrainerId === viewerTrainerId (le visiteur connecté, pas forcément
  // le propriétaire de la tuile qu'on regarde).
  const entryTrainerId = entry.trainer?.id;
  const isOwnEntry = viewerTrainerId != null && entryTrainerId === viewerTrainerId;
  const availableFrom = useMemo(() => {
    if (entry.category !== "want" || entry.linkedEntryId || !allEntries || !isOwnEntry) return [];
    const seen = new Set<string>();
    const matches: { id: string; name: string }[] = [];
    for (const other of allEntries) {
      const otherTrainerId = other.trainer?.id;
      if (!otherTrainerId || otherTrainerId === entryTrainerId) continue;
      if (!entriesMatch(entry, other)) continue;
      if (seen.has(otherTrainerId)) continue;
      seen.add(otherTrainerId);
      matches.push({ id: otherTrainerId, name: other.trainer!.name });
    }
    return matches;
  }, [allEntries, entry, entryTrainerId, isOwnEntry]);

  // Symétrique : sur SA PROPRE entrée "give" (pas "mirror" — voir demande de
  // Steven), qui d'autre la recherche ? Affiche "X Dresseurs recherchent ce
  // Pokémon", même principe que availableFrom mais dans l'autre sens (entry
  // est ici le give/donneur, other doit être un want qui LE recherche).
  const wantedBy = useMemo(() => {
    if (entry.category !== "give" || entry.linkedEntryId || entry.completed || !allEntries || !isOwnEntry) return [];
    const seen = new Set<string>();
    const matches: { id: string; name: string }[] = [];
    for (const other of allEntries) {
      const otherTrainerId = other.trainer?.id;
      if (!otherTrainerId || otherTrainerId === entryTrainerId) continue;
      if (other.category !== "want" || other.completed || other.linkedEntryId) continue;
      if (!entriesMatch(other, entry)) continue;
      if (seen.has(otherTrainerId)) continue;
      seen.add(otherTrainerId);
      matches.push({ id: otherTrainerId, name: other.trainer!.name });
    }
    return matches;
  }, [allEntries, entry, entryTrainerId, isOwnEntry]);

  // Inverse du calcul ci-dessus : sur une tuile give/mirror qui N'appartient
  // PAS au visiteur, est-ce que LUI a une entrée correspondante chez lui ?
  // Pour "give" : est-ce qu'il le recherche (want, "Vous recherchez celui-ci !").
  // Pour "mirror" : est-ce qu'il l'a AUSSI en miroir (mirror uniquement — un
  // miroir ne matche jamais un "Je recherche", voir entryMatching.ts).
  const viewerWantsThis = useMemo(() => {
    if (isOwnEntry || !viewerTrainerId || !allEntries || entry.completed) return false;
    if (entry.category === "give") {
      return allEntries.some((other) =>
        other.trainer?.id === viewerTrainerId &&
        other.category === "want" &&
        !other.completed &&
        !other.linkedEntryId &&
        entriesMatch(other, entry)
      );
    }
    if (entry.category === "mirror") {
      if (entry.linkedEntryId) return false;
      return allEntries.some((other) =>
        other.trainer?.id === viewerTrainerId &&
        !other.linkedEntryId &&
        entriesMatchMirror(entry, other)
      );
    }
    return false;
  }, [allEntries, viewerTrainerId, isOwnEntry, entry]);

  // Symétrique : sur une tuile want qui N'appartient PAS au visiteur, est-ce
  // que LUI peut donner ce Pokémon (give uniquement, non lié, même forme/shiny) ?
  // Affiche "Tu as celui recherché !".
  const viewerHasThis = useMemo(() => {
    if (isOwnEntry || !viewerTrainerId || !allEntries) return false;
    if (entry.category !== "want") return false;
    if (entry.completed || entry.linkedEntryId) return false;
    return allEntries.some((other) =>
      other.trainer?.id === viewerTrainerId &&
      !other.linkedEntryId &&
      entriesMatch(entry, other)
    );
  }, [allEntries, viewerTrainerId, isOwnEntry, entry]);

  /* ═══════════════════════════════════════════════════════════════════════════════════
     UNE SEULE LIGNE SOUS LE NOM

     Steven, capture a l'appui : « C'est illisible. Corrige le probleme ! »

     La tuile pouvait empiler SIX lignes secondaires - reserve par, etiquettes, notes,
     pastille d'echange, « N dispo », « N recherche », « Recherche ! ». Sur un carre de
     146px il y a la place pour le sprite, le nom, et une ligne. J'avais essaye de faire
     tenir les six en autorisant la compression : le resultat etait des pastilles ecrasees
     a « gi », « f », « o » et des textes qui se chevauchaient. Comprimer six choses dans
     la place d'une ne donne pas six choses plus petites, ca donne six choses illisibles.

     Une seule ligne s'affiche donc, choisie par ordre d'importance pour quelqu'un qui
     PARCOURT une grille :

       1. reserve   l'entree est prise. C'est l'etat qui change tout, avant l'identite.
       2. echange   contre quoi elle part, si ce n'est pas encore attribue a quelqu'un.
       3. signal    « Recherche ! », « Toi aussi en miroir ! » : la correspondance avec le
                    visiteur, plus utile qu'un costume.
       4. qualificatifs  costume, taille, legendaire : l'identite fine du Pokemon.
       5. action    « N dispo », « N recherche » : utile mais consultable en ouvrant.

     Les notes ne sont plus sur la tuile du tout : un champ libre n'a pas de longueur
     previsible, donc pas de place previsible. Tout le reste est dans la fiche, qui s'ouvre
     au clic et ne manque pas de place.
     ═══════════════════════════════════════════════════════════════════════════════════ */
  // Les etiquettes ne comptent plus : elles ne sont plus affichees sur la tuile. Les
  // laisser dans cette condition ferait choisir la ligne « qualificatifs » pour une entree
  // dont le seul qualificatif est une etiquette, et la ligne s'afficherait vide.
  const aQualificatifsVisibles = !!entry.size || !!entry.exclusiveMove;
  const ligneTuile: "reserve" | "echange" | "signal" | "qualificatifs" | "action" | null =
    entry.tradePartnerName ? "reserve"
    : (entry.tradeForPokemonName && entry.tradeForPokemonId) ? "echange"
    : (viewerWantsThis || viewerHasThis) ? "signal"
    : aQualificatifsVisibles ? "qualificatifs"
    : (availableFrom.length > 0 || wantedBy.length > 0) ? "action"
    : null;

  useEffect(() => { setMounted(true); }, []);

  const modal = showDetail && (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        background: "color-mix(in srgb, var(--papier) 88%, transparent)",
        zIndex: 300,
      }}
      onClick={closeDetail}
    >
      <div
        className="glass-card animate-scale-in flex flex-col items-center relative overflow-y-auto"
        style={{
          maxWidth: 340,
          width: "100%",
          maxHeight: "calc(100dvh - 32px)",
          overscrollBehavior: "contain",
          padding: 32,
          ...(entry.backgroundUrl && {
            backgroundImage: `linear-gradient(color-mix(in srgb, var(--papier) 55%, transparent), color-mix(in srgb, var(--papier) 80%, transparent)), url(${entry.backgroundUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }),
          ...(isMirror && {
            borderColor: "color-mix(in srgb, var(--ligne-miroir) 30%, transparent)",
            boxShadow: "none",
          }),
          ...(hasTrainerBadge && {
            borderColor: "color-mix(in srgb, var(--bon) 50%, transparent)",
            boxShadow: "none",
          }),
          ...(viewerWantsThis && {
            borderColor: "color-mix(in srgb, var(--tag-max) 50%, transparent)",
            boxShadow: "none",
          }),
          ...(viewerHasThis && {
            borderColor: "color-mix(in srgb, var(--tag-saison) 50%, transparent)",
            boxShadow: "none",
          }),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={closeDetail}
          style={{
            position: "absolute", top: 12, right: 12,
            background: "var(--trait-leger)", border: "1px solid var(--trait-leger)",
            borderRadius: 8, color: "var(--encre)", cursor: "pointer",
            fontSize: "0.75rem", padding: "4px 10px",
          }}
        >
          Fermer
        </button>

        {/* Priority badge in modal */}
        {hasPriority && (
          <div
            style={{
              position: "absolute", top: 12, left: 12,
              width: 28, height: 28, borderRadius: "50%",
              background: priorityStyle!.bg,
              border: `2px solid ${priorityStyle!.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.75rem", fontWeight: 800,
              color: priorityStyle!.color,
              fontFamily: "Exo 2, sans-serif",
              boxShadow: priorityStyle!.shadow,
            }}
          >
            {entry.priority}
          </div>
        )}

        {/* Category + shiny + special badges */}
        <div className="flex gap-2 flex-wrap justify-center" style={{ marginBottom: 12 }}>
          <span style={{
            background: `${categoryColor}18`,
            border: `1px solid ${categoryColor}40`,
            borderRadius: 999, padding: "3px 12px",
            fontSize: "0.75rem", fontWeight: 700,
            color: categoryColor,
            fontFamily: "Exo 2, sans-serif",
          }}>
            {CATEGORY_LABEL[entry.category] ?? entry.category}
          </span>
          {(entry.quantity ?? 1) > 1 && (
            <span style={{
              background: "color-mix(in srgb, var(--tag-neutre) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--tag-neutre) 50%, transparent)",
              borderRadius: 999, padding: "3px 12px",
              fontSize: "0.75rem", fontWeight: 800, color: "var(--tag-neutre)",
              fontFamily: "Exo 2, sans-serif",
            }}>×{entry.quantity} disponibles</span>
          )}
          {isGigamax && (
            <span style={{
              background: "color-mix(in srgb, var(--tag-max) 18%, transparent)", border: "1px solid color-mix(in srgb, var(--tag-max) 50%, transparent)",
              borderRadius: 999, padding: "3px 12px",
              fontSize: "0.75rem", fontWeight: 800, color: "var(--tag-max)",
              fontFamily: "Exo 2, sans-serif",
            }}>Gigamax</span>
          )}
          {isDynamax && (
            <span style={{
              background: "color-mix(in srgb, var(--tag-max) 18%, transparent)", border: "1px solid color-mix(in srgb, var(--tag-max) 50%, transparent)",
              borderRadius: 999, padding: "3px 12px",
              fontSize: "0.75rem", fontWeight: 800, color: "var(--tag-max)",
              fontFamily: "Exo 2, sans-serif",
            }}>Dynamax</span>
          )}
          {isShiny && (
            <span style={{
              background: "color-mix(in srgb, var(--encre) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--encre) 50%, transparent)",
              borderRadius: 999, padding: "3px 12px",
              fontSize: "0.75rem", fontWeight: 700, color: "var(--encre)",
              fontFamily: "Exo 2, sans-serif",
            }}>✨ Shiny</span>
          )}
          {entry.exclusiveMove && (
            <span style={{
              background: "color-mix(in srgb, var(--encre) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--encre) 50%, transparent)",
              borderRadius: 999, padding: "3px 12px",
              fontSize: "0.75rem", fontWeight: 700, color: "var(--encre)",
              fontFamily: "Exo 2, sans-serif",
            }}>Attaque exclusive</span>
          )}
          {entry.size && (
            <span style={{
              background: "color-mix(in srgb, var(--tag-fond) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--tag-fond) 50%, transparent)",
              borderRadius: 999, padding: "3px 12px",
              fontSize: "0.75rem", fontWeight: 700, color: "var(--tag-fond)",
              fontFamily: "Exo 2, sans-serif",
            }}>{entry.size}</span>
          )}
        </div>

        {/* Tags in modal : dynamax/gigamax ont déjà leur badge dédié juste
            au-dessus, les remontrer ici ferait doublon (ex: "Dynamax" +
            "dynamax") */}
        {displayTags.filter((t) => !["dynamax", "gigamax"].includes(t.toLowerCase())).length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center mb-3">
            {displayTags.filter((t) => !["dynamax", "gigamax"].includes(t.toLowerCase())).map((tag) => {
              const c = getTagColor(tag);
              return (
                <span key={tag} style={{
                  background: c.bg, border: `1px solid ${c.border}`,
                  borderRadius: 999, padding: "2px 10px",
                  fontSize: "0.75rem", fontWeight: 700, color: c.text,
                  fontFamily: "Exo 2, sans-serif",
                }}>{tag}</span>
              );
            })}
          </div>
        )}

        {/* Trainer */}
        {hasTrainerBadge && entry.trainer && (
          <div className="flex items-center gap-2 mb-3">
            <div
              style={{
                width: 24, height: 24, borderRadius: "50%",
                background: trainerColor, color: "var(--papier)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.75rem", fontWeight: 700,
              }}
            >
              {entry.trainer.name.charAt(0).toUpperCase()}
            </div>
            <span style={{
              background: `${trainerColor}18`, border: `1px solid ${trainerColor}40`,
              borderRadius: 999, padding: "3px 12px",
              fontSize: "0.75rem", fontWeight: 600, color: trainerColor,
              fontFamily: "Exo 2, sans-serif",
            }}>
              {entry.trainer.name}
            </span>
          </div>
        )}

        {/* Big sprite */}
        <div className="relative mb-4">
          <div
            className="absolute inset-0 rounded-full blur-2xl opacity-30"
            style={{ background: eventTheme?.glow ?? categoryGlow }}
          />
          <GenderBadge gender={displayGender} size={28} />
          <PokemonSprite
            pokemonId={entry.pokemonId}
            alt={entry.pokemonName}
            size={202}
            shiny={isShiny}
            customSpriteUrl={entry.customSpriteUrl}
            preferStatic={preferStatic}
            gigantamaxSlug={gigantamaxSlug}
            gigantamaxIconUrl={gigantamaxIconUrl}
          />
        </div>

        {/* Name */}
        <h2
          className="text-center font-bold mb-2"
          style={{
            fontFamily: "Exo 2, sans-serif", fontSize: "1.2rem",
            color: "var(--encre)", wordBreak: "break-word",
          }}
        >
          {entry.pokemonName}
        </h2>

        {/* Réservé par : qui a accepté l'échange (voir tradePartnerName) */}
        {entry.tradePartnerName && (
          <p
            className="text-center mb-2"
            style={{ fontSize: "0.78rem", color: "var(--encre)", fontWeight: 600 }}
          >
            Réservé par {entry.tradePartnerName}
          </p>
        )}

        {/* Notes */}
        {entry.notes && (
          <p
            className="text-center mb-3"
            style={{ fontSize: "0.8rem", color: "var(--encre-douce)", maxWidth: 260 }}
          >
            {entry.notes}
          </p>
        )}

        {/* Exchange */}
        {entry.tradeForPokemonName && entry.tradeForPokemonId && (
          <div
            className="flex items-center gap-3 mt-2 p-3"
            style={{
              background: hasTrainerBadge ? "color-mix(in srgb, var(--bon) 10%, transparent)" : "color-mix(in srgb, var(--encre) 7%, transparent)",
              border: hasTrainerBadge ? "1px solid color-mix(in srgb, var(--bon) 35%, transparent)" : "1px solid color-mix(in srgb, var(--encre) 20%, transparent)",
              borderRadius: 12,
              width: "100%",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "var(--encre)", fontWeight: 600 }}>
              {entry.category === "want" ? "Je donne" : entry.category === "mirror" ? "Échange" : "Je reçois"}
            </span>
            <PokemonSprite
              pokemonId={entry.tradeForPokemonId}
              alt={entry.tradeForPokemonName}
              size={48}
              shiny={entry.tradeForShiny === true}
              customSpriteUrl={entry.tradeForCustomSpriteUrl}
              preferStatic={preferStatic}
            />
            <span style={{ fontSize: "0.85rem", color: "var(--encre)", fontWeight: 500 }}>
              {entry.tradeForPokemonName}
            </span>
          </div>
        )}

        {/* Actions (Mon espace uniquement) */}
        {canEdit && (
          <div
            className="w-full flex flex-col items-center gap-2 mt-4 pt-4"
            style={{ borderTop: "1px solid var(--trait-leger)" }}
          >
            {confirmDelete ? (
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span style={{ fontSize: "0.8rem", color: "var(--alerte)" }}>Supprimer cette entrée ?</span>
                <button onClick={() => onDelete?.()} className="btn-danger">Oui</button>
                <button onClick={() => setConfirmDelete(false)} className="btn-secondary" style={{ padding: "6px 12px" }}>
                  Non
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <button
                  onClick={() => (quantity > 1 ? onQuantityChange?.(-1) : onComplete?.())}
                  className="btn-success"
                >
                  {quantity > 1 ? "−1 (donné)" : "Échangé"}
                </button>
                {quantity > 1 && (
                  <button
                    onClick={() => onQuantityChange?.(1)}
                    className="btn-secondary"
                    style={{ padding: "clamp(4px, 1.5vw, 6px) clamp(7px, 2.5vw, 10px)", fontSize: "clamp(0.72rem, 3vw, 0.85rem)", fontWeight: 800 }}
                    title="Corriger : +1 exemplaire"
                  >
                    +1
                  </button>
                )}
                <button
                  onClick={() => { closeDetail(); onEdit?.(); }}
                  className="btn-secondary"
                  style={{ padding: "clamp(4px, 1.5vw, 6px) clamp(9px, 3vw, 12px)", fontSize: "clamp(0.68rem, 3vw, 0.8rem)" }}
                >
                  Modifier
                </button>
                <button onClick={() => setConfirmDelete(true)} className="btn-danger">
                  Supprimer
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div
        className="glass-card animate-scale-in tuile-pokemon p-2 sm:p-3 md:p-4 flex flex-col items-center relative cursor-pointer select-none"
        style={{
          ...style,
          ...(entry.backgroundUrl && {
            backgroundImage: `linear-gradient(color-mix(in srgb, var(--papier) 55%, transparent), color-mix(in srgb, var(--papier) 75%, transparent)), url(${entry.backgroundUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }),
          ...(hasPriority && entry.priority === 1 && {
            borderColor: "color-mix(in srgb, var(--encre) 50%, transparent)",
            boxShadow: "none",
          }),
          ...(hasPriority && entry.priority === 2 && {
            borderColor: "color-mix(in srgb, var(--medaille-argent) 50%, transparent)",
            boxShadow: "none",
          }),
          ...(hasPriority && entry.priority === 3 && {
            borderColor: "color-mix(in srgb, var(--medaille-bronze) 50%, transparent)",
            boxShadow: "none",
          }),
          ...(hasTrainerBadge && {
            borderColor: "color-mix(in srgb, var(--bon) 50%, transparent)",
            boxShadow: "none",
          }),
          ...(viewerWantsThis && {
            borderColor: "color-mix(in srgb, var(--tag-max) 50%, transparent)",
            boxShadow: "none",
          }),
          ...(viewerHasThis && {
            borderColor: "color-mix(in srgb, var(--tag-saison) 50%, transparent)",
            boxShadow: "none",
          }),
          ...(selected && {
            borderColor: "color-mix(in srgb, var(--encre) 60%, transparent)",
            boxShadow: "none",
          }),
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onClick={() => {
          if (selectable && selectionActive) onToggleSelect?.();
          else setShowDetail(true);
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "scale(1.03)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
        }}
      >
        {/* ═══ LA COLONNE DU COIN HAUT GAUCHE ═══

            Steven : « Place mieux l'icone Dynamax et Gigamax. Il faut qu'ils soient
            affiches juste en dessous de l'icone shiny, comme il est bien aligne la c'est
            le bon endroit. »

            Ces trois marqueurs - shiny, forme Dynamax/Gigamax, rang de priorite - se
            posaient jusqu'ici chacun de son cote, avec des decalages calcules a la main du
            genre `top: isShiny ? 30 : 3`. Cette arithmetique a deja produit un bug : le
            sparkle avait herite de la condition du badge de priorite et se poussait
            lui-meme a 30px alors qu'il ne s'affiche que quand isShiny est vrai.

            Une colonne flex supprime le calcul. Chaque marqueur se place tout seul sous le
            precedent, dans l'ordre du JSX, et en ajouter un quatrieme ne demandera de
            toucher a aucun decalage. */}
        <div
          className="flex flex-col items-center"
          style={{ position: "absolute", top: 3, left: 4, zIndex: 10, gap: 2 }}
        >
          {isShiny && (
            <span
              aria-label="Shiny"
              title="Shiny"
              style={{ fontSize: 16, lineHeight: 1 }}
            >
              ✨
            </span>
          )}

          {/* Le logo officiel de la forme. Il etait pose en bas a droite du sprite, ou il
              se melangeait au dessin; ici il rejoint les autres marqueurs d'etat, qui sont
              tous des informations SUR la carte et non des elements du Pokemon. */}
          {(isGigamax || isDynamax) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={isGigamax ? "/gigamax.png" : "/dynamax.png"}
              alt={isGigamax ? "Gigamax" : "Dynamax"}
              title={isGigamax ? "Gigamax" : "Dynamax"}
              style={{ width: 18, height: 18, display: "block" }}
            />
          )}

          {hasPriority && (
            <div
              style={{
                width: 22, height: 22, borderRadius: "50%",
                background: priorityStyle!.bg,
                border: `2px solid ${priorityStyle!.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.75rem", fontWeight: 800,
                color: priorityStyle!.color,
                fontFamily: "Exo 2, sans-serif",
                boxShadow: priorityStyle!.shadow,
              }}
            >
              {entry.priority}
            </div>
          )}
        </div>

        {/* Sélection multiple (Mon espace uniquement) */}
        {selectable && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
            aria-label={selected ? `Désélectionner ${entry.pokemonName}` : `Sélectionner ${entry.pokemonName}`}
            style={{
              position: "absolute", top: 3, right: 3, zIndex: 10,
              width: 26, height: 26, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              background: selected ? "var(--encre)" : "color-mix(in srgb, var(--papier) 70%, transparent)",
              border: `2px solid ${selected ? "var(--encre)" : "var(--trait-leger)"}`,
              color: selected ? "var(--papier)" : "var(--encre-tres-douce)",
              fontSize: "0.75rem",
              fontWeight: 900,
              // Selection marquee par un trait, pas par une lueur : le halo appartenait au
              // fond sombre, et sur du papier il salit la carte au lieu de la designer.
              boxShadow: "none",
              outline: selected ? "var(--trait-fort) solid var(--encre)" : "none",
              outlineOffset: 1,
              transition: "all 0.12s",
            }}
          />
        )}


        {/* Top-right badges.
            Decales vers le bas quand la selection multiple est active : le cercle de
            selection occupe desormais ce coin, apres etre rentre dans la carte pour
            survivre au decoupage de la tuile carree. */}
        <div
          className="absolute right-3 flex flex-col items-end gap-1"
          style={{ top: selectable ? 34 : 12 }}
        >
          {(entry.quantity ?? 1) > 1 && (
            <div style={{
              background: "color-mix(in srgb, var(--tag-neutre) 20%, transparent)", border: "1px solid color-mix(in srgb, var(--tag-neutre) 55%, transparent)",
              borderRadius: 8, padding: "1px 6px", fontSize: "0.75rem", fontWeight: 800,
              color: "var(--tag-neutre)", fontFamily: "Exo 2, sans-serif", letterSpacing: "0.05em",
            }}>×{entry.quantity}</div>
          )}
          {isMirror && (
            <div
              style={{
                background: "color-mix(in srgb, var(--ligne-miroir) 18%, transparent)",
                border: "1px solid color-mix(in srgb, var(--ligne-miroir) 40%, transparent)",
                borderRadius: 8,
                padding: "1px 6px",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--ligne-miroir)",
                fontFamily: "Exo 2, sans-serif",
                letterSpacing: "0.04em",
              }}
            >
              MIROIR
            </div>
          )}
          {/* Le badge shiny a quitte cette colonne : il est devenu une icone seule, en
              haut a gauche. Voir plus haut. */}

        </div>

        {/* Le logo Dynamax/Gigamax a quitte le bas de la tuile : voir le bloc du sprite,
            ou il est desormais pose. Il etait ancre en bas a droite, la ou s'empilent les
            etiquettes, et passait dessus - signale par Steven, capture a l'appui. */}

        {/* ═══ LA LOUPE, POUR DIRE QUE LA TUILE S'OUVRE ═══

            Steven, le 2026-09-04 : « il faut pas afficher les notes des dresseurs sur les
            tuiles aussi. C'est trop risque. Un icone de loupe sera mieux. Les gens
            cliqueront sur les tuiles. »

            Les notes sont un champ libre : leur longueur est imprevisible, donc la hauteur
            de la tuile l'etait aussi. Elles ont quitte la tuile. Mais retirer une
            information sans dire ou elle est passee, c'est la perdre : la loupe est le
            signal qu'il y a plus a voir, et que c'est ici qu'on appuie.

            Dessinee en SVG et non en emoji : la regle du projet interdit les symboles
            decoratifs dans l'interface, avec le sparkle du shiny pour seule exception. Un
            trace vectoriel n'est pas un caractere, il suit la couleur du texte, et il reste
            net a toutes les tailles. */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute", bottom: 4, right: 4, zIndex: 4,
            width: 16, height: 16, color: "var(--encre-tres-douce)",
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="6.8" cy="6.8" r="4.4" />
            <line x1="10.2" y1="10.2" x2="14" y2="14" strokeLinecap="round" />
          </svg>
        </span>

        {/* Trainer pill */}
        {hasTrainerBadge && entry.trainer && (
          <div className="absolute top-3 left-3 flex items-center gap-1" style={{ zIndex: 1, maxWidth: "60%" }}>
            <div
              style={{
                width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                background: "var(--bon)", color: "var(--papier)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.75rem", fontWeight: 700,
              }}
            >
              {entry.trainer.name.charAt(0).toUpperCase()}
            </div>
            <span
              style={{
                background: "color-mix(in srgb, var(--bon) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--bon) 40%, transparent)",
                borderRadius: 999, padding: "2px 8px", fontSize: "0.75rem",
                fontWeight: 600, color: "var(--bon)", letterSpacing: "0.03em",
                fontFamily: "Exo 2, sans-serif", whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis", maxWidth: 80,
              }}
            >
              {entry.trainer.name}
            </span>
          </div>
        )}

        {/* Main sprite : largeur en % (maxWidth 134px) plutôt que fixe, pour
            rétrécir avec la carte quand la grille passe à 3+ colonnes sur
            mobile (voir prop `fluid` de PokemonSprite) sans la faire déborder. */}
        <div className="mt-7 mb-2 relative" style={{ width: "100%", maxWidth: 134, aspectRatio: "1" }}>
          <div
            className="absolute inset-0 rounded-full blur-xl opacity-25"
            style={{ background:
              hasTrainerBadge ? "radial-gradient(circle, var(--bon) 0%, transparent 70%)" :
              entry.priority === 1 ? "radial-gradient(circle, var(--encre) 0%, transparent 70%)" :
              entry.priority === 2 ? "radial-gradient(circle, var(--medaille-argent) 0%, transparent 70%)" :
              entry.priority === 3 ? "radial-gradient(circle, var(--medaille-bronze) 0%, transparent 70%)" :
              undefined
            }}
          />
          <GenderBadge gender={displayGender} size={20} />
          <PokemonSprite
            pokemonId={entry.pokemonId}
            alt={entry.pokemonName}
            size={134}
            fluid
            shiny={isShiny}
            customSpriteUrl={entry.customSpriteUrl}
            preferStatic={preferStatic}
            gigantamaxSlug={gigantamaxSlug}
            gigantamaxIconUrl={gigantamaxIconUrl}
          />
        </div>

        {/* Name */}
        <h3
          className="text-center font-bold"
          style={{
            fontFamily: "Exo 2, sans-serif", fontSize: "0.82rem",
            color: "var(--encre)", lineHeight: 1.3, marginBottom: 4,
            maxWidth: "100%", wordBreak: "break-word",
          }}
        >
          {entry.pokemonName}
        </h3>

        {/* Réservé par : qui a accepté l'échange (voir tradePartnerName) */}
        {ligneTuile === "reserve" && entry.tradePartnerName && (
          <p
            className="text-center"
            style={{ fontSize: "0.75rem", color: "var(--encre)", fontWeight: 700, marginBottom: 2, lineHeight: 1.2 }}
          >
            Réservé par {entry.tradePartnerName}
          </p>
        )}

        {/* ═══ UNE SEULE LIGNE D'ETIQUETTES, ET NON UNE PILE ═══

            Steven, le 2026-09-04, capture a l'appui : « Il y a un probleme de tuiles la. Il
            faut revoir les tags et les infos de facon qu'il n'y en ait pas d'inutiles et
            que tout soit toujours lisible. »

            La taille, l'attaque exclusive et les tags occupaient TROIS blocs empiles, chacun
            conditionnel. Une tuile pouvait donc mesurer trois lignes de plus qu'une autre,
            et c'est ce qui cassait l'alignement de la grille : chaque rangee prenait la
            hauteur de sa carte la plus bavarde et laissait les autres a moitie vides.

            Toutes ces informations sont de meme nature - un qualificatif court sur un
            Pokemon - donc elles tiennent sur une seule ligne qui passe a la ligne si besoin,
            avec un plafond a trois et un « +N » pour le reste. Le detail complet reste dans
            la fiche, qui s'ouvre au clic. */}
        {ligneTuile === "qualificatifs" && (() => {
          const qualificatifs: { cle: string; texte: string; couleurs: { bg: string; text: string; border: string } }[] = [];
          if (entry.size) {
            qualificatifs.push({
              cle: `taille-${entry.size}`, texte: entry.size,
              couleurs: getTagColor("fond"),
            });
          }
          if (entry.exclusiveMove) {
            qualificatifs.push({
              cle: "attaque", texte: "Attaque excl.",
              couleurs: { bg: "var(--surface-creuse)", text: "var(--encre)", border: "var(--encre)" },
            });
          }
          /* ═══ LES ETIQUETTES QUI NE DISENT RIEN NE S'AFFICHENT PAS ═══

             Steven, le 2026-09-04, capture a l'appui : « C'est illisible. Deja pas besoin
             d'afficher les tags fonds ou dynamax ou gigamax si ca se voit avec les fonds ou
             icones ! »

             Il a raison, et c'est le coeur du probleme de place :

               « fond »              le fond d'evenement EST l'image de fond de la tuile;
               « dynamax »/« gigamax »  le logo officiel est pose sur le sprite.

             Ces trois etiquettes repetaient donc en mots ce que la tuile montrait deja en
             image, et elles mangeaient toute la largeur - au point que les pastilles
             restantes se retrouvaient ecrasees a « gi », « f », « o ». Une etiquette n'a de
             valeur que si elle ajoute une information invisible autrement.

             Elles restent dans la fiche, ou la place ne manque pas et ou elles servent de
             rappel explicite. */
          /* ═══ AUCUNE ETIQUETTE SUR LA TUILE ═══

             Steven, le 2026-09-04 : « Justement retire les etiquettes creees c'est plus
             utile ! Legendaire pas besoin de l'afficher sur la tuile le filtre fera le
             travail. »

             Sa regle est simple et elle se tient : ce que le FILTRE sait trouver, ou que
             l'IMAGE montre deja, n'a rien a faire sur la tuile. Shiny, fond, costume,
             gigamax, dynamax, legendaire ont tous leur pastille de filtre en haut de page,
             et le costume comme le fond se voient sur la carte. Les afficher en mots
             revenait a payer de la place pour redire ce qui est deja accessible autrement.

             Il reste ce que ni le filtre ni l'image ne donnent : le record de TAILLE et
             l'ATTAQUE EXCLUSIVE. Aucun des deux n'a de pastille de filtre (voir
             ENTRY_FILTER_CHIPS), aucun des deux ne se lit sur le sprite, et les deux
             changent la valeur d'un echange.

             Toutes les etiquettes restent dans la fiche, qui s'ouvre au clic. */
          if (qualificatifs.length === 0) return null;

          // Deux au plus, et non trois : sur un carre de 146px, une troisieme pastille
          // pousse la ligne a deux hauteurs et fait deborder le budget de la tuile.
          const MAX = 2;
          const visibles = qualificatifs.slice(0, MAX);
          const reste = qualificatifs.length - visibles.length;
          return (
            <div
              className="flex flex-wrap gap-1 justify-center"
              style={{ maxWidth: "100%", marginBottom: 4 }}
            >
              {visibles.map((q) => (
                <span key={q.cle} style={{
                  background: q.couleurs.bg, border: `1px solid ${q.couleurs.border}`,
                  borderRadius: 999, padding: "1px 6px",
                  fontSize: "0.75rem", fontWeight: 700, color: q.couleurs.text,
                  fontFamily: "Exo 2, sans-serif",
                  // Une pastille ne rapetisse pas et ne se casse pas sur deux lignes :
                  // elle se TRONQUE. « legendaire » debordait de 6px a droite faute de
                  // pouvoir faire l'un ou l'autre. Le libelle complet reste en infobulle.
                  maxWidth: "100%", whiteSpace: "nowrap",
                  overflow: "hidden", textOverflow: "ellipsis",
                }} title={q.texte}>{q.texte}</span>
              ))}
              {reste > 0 && (
                <span
                  title={qualificatifs.slice(MAX).map((q) => q.texte).join(", ")}
                  style={{
                    background: "var(--trait-leger)", border: "1px solid var(--trait-leger)",
                    borderRadius: 999, padding: "1px 5px",
                    fontSize: "0.75rem", fontWeight: 700, color: "var(--encre-tres-douce)",
                    fontFamily: "Exo 2, sans-serif",
                  }}
                >+{reste}</span>
              )}
            </div>
          );
        })()}

        {/* Les notes ne sont PLUS sur la tuile. Un champ libre n'a pas de longueur
            previsible, donc pas de place previsible : c'etait le principal responsable des
            hauteurs inegales, et sur un carre il n'y a de place que pour UNE ligne
            secondaire, qui sert a dire un etat (reserve, echange) plutot qu'un commentaire.
            Le texte entier est dans la fiche, qui s'ouvre au clic. */}

        {/* Exchange badge */}
        {ligneTuile === "echange" && entry.tradeForPokemonName && entry.tradeForPokemonId && (
          /* ═══ LA PASTILLE QUI SORTAIT DE SA CARTE ═══

             Sur la capture de Steven, « Je donne [sprite] Kyogr... » s'etalait par-dessus
             les deux tuiles voisines. La cause : trois elements en `white-space: nowrap`
             cote a cote, dont le libelle de categorie, sans aucune largeur maximale ni
             decoupe sur le conteneur. La pastille faisait donc la largeur de son contenu,
             quelle que soit celle de la tuile.

             Deux corrections, et la premiere est une SUPPRESSION : le libelle de categorie
             degage. « Je donne » s'affichait sur chaque carte d'un onglet qui s'appelle
             deja « peut donner », donc il repetait le titre de l'ecran en volant la moitie
             de la largeur. C'est exactement l'information inutile que Steven demande de
             retirer. Le sprite echange et son nom suffisent, et la fiche donne le detail.

             Ensuite le conteneur est borne a la largeur de la tuile et decoupe ce qui
             depasse, pour qu'aucune valeur de donnee ne puisse plus le faire grandir. */
          <div
            className="exchange-badge mt-auto"
            style={{
              marginTop: "auto", paddingTop: 4,
              maxWidth: "100%", overflow: "hidden",
              ...(hasTrainerBadge && { background: "color-mix(in srgb, var(--bon) 12%, transparent)", borderColor: "color-mix(in srgb, var(--bon) 40%, transparent)" }),
            }}
            title={`${entry.category === "want" ? "Je donne" : entry.category === "mirror" ? "Échange" : "Je reçois"} : ${entry.tradeForPokemonName}`}
          >
            <PokemonSprite
              pokemonId={entry.tradeForPokemonId}
              alt={entry.tradeForPokemonName}
              size={26}
              shiny={entry.tradeForShiny === true}
              customSpriteUrl={entry.tradeForCustomSpriteUrl}
              preferStatic={preferStatic}
            />
            <span style={{
              fontSize: "0.75rem", color: "var(--encre)", fontWeight: 600,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              minWidth: 0,
            }}>
              {entry.tradeForPokemonName}
            </span>
          </div>
        )}

        {/* Dispo chez d'autres dresseurs (want uniquement, pas déjà associé) */}
        {ligneTuile === "action" && availableFrom.length > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowAvailableFrom(true); }}
            className="mt-auto"
            style={{
              marginTop: 6, padding: "4px 12px", borderRadius: 999, cursor: "pointer",
              background: "color-mix(in srgb, var(--encre) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--encre) 30%, transparent)",
              color: "var(--encre)", fontFamily: "Exo 2, sans-serif", fontWeight: 700, fontSize: "0.75rem",
              whiteSpace: "nowrap",
            }}
          >
            {/* Toujours la version courte : la grille va jusqu'à 6-7
                colonnes (voir grid-cols-* dans DresseurPageClient/AdminPanel),
                donc la tuile reste étroite même sur un écran large, pas
                seulement sur mobile — un split "long sur desktop, court sur
                mobile" basé sur la largeur de PAGE (comme essayé avant)
                déborde quand même dès que la grille est dense. */}
            {availableFrom.length} dispo
          </button>
        )}

        {/* Symétrique de "Dispo chez" mais côté "Je peux donner" : qui
            recherche ce Pokémon précis (voir wantedBy plus haut). */}
        {ligneTuile === "action" && wantedBy.length > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowWantedBy(true); }}
            className="mt-auto"
            style={{
              marginTop: 6, padding: "4px 12px", borderRadius: 999, cursor: "pointer",
              background: "color-mix(in srgb, var(--tag-saison) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--tag-saison) 30%, transparent)",
              color: "var(--tag-saison)", fontFamily: "Exo 2, sans-serif", fontWeight: 700, fontSize: "0.75rem",
              whiteSpace: "nowrap",
            }}
          >
            {wantedBy.length} recherché{wantedBy.length > 1 ? "s" : ""}
          </button>
        )}

        {/* Sur la liste "peut donner" d'un AUTRE dresseur : ce visiteur
            précis le recherche lui-même dans sa propre liste. Sur sa liste
            "miroir" : ce visiteur l'a AUSSI en miroir (voir viewerWantsThis
            plus haut, deux bassins de matching séparés). */}
        {ligneTuile === "signal" && viewerWantsThis && (
          <div
            className="mt-auto"
            style={{
              marginTop: 6, padding: "4px 12px", borderRadius: 999,
              background: "color-mix(in srgb, var(--tag-max) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--tag-max) 35%, transparent)",
              color: "var(--tag-max)", fontFamily: "Exo 2, sans-serif", fontWeight: 700, fontSize: "0.75rem",
              whiteSpace: "nowrap",
            }}
          >
            {entry.category === "mirror" ? "Toi aussi en miroir !" : "Recherché !"}
          </div>
        )}

        {/* Symétrique : sur la liste "recherche" d'un AUTRE dresseur, ce
            visiteur peut lui-même donner ce Pokémon. */}
        {ligneTuile === "signal" && viewerHasThis && (
          <div
            className="mt-auto"
            style={{
              marginTop: 6, padding: "4px 12px", borderRadius: 999,
              background: "color-mix(in srgb, var(--tag-saison) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--tag-saison) 35%, transparent)",
              color: "var(--tag-saison)", fontFamily: "Exo 2, sans-serif", fontWeight: 700, fontSize: "0.75rem",
              whiteSpace: "nowrap",
            }}
          >
            Tu l&apos;as !
          </div>
        )}
      </div>

      {/* Modal rendered in document.body via portal to avoid transform clipping */}
      {mounted && modal && createPortal(modal, document.body)}
      {mounted && showAvailableFrom && (
        <TrainerListModal
          title={`${entry.pokemonName} dispo chez`}
          trainers={availableFrom}
          onClose={() => setShowAvailableFrom(false)}
        />
      )}
      {mounted && showWantedBy && (
        <TrainerListModal
          title={`${entry.pokemonName} recherché par`}
          trainers={wantedBy}
          onClose={() => setShowWantedBy(false)}
        />
      )}
    </>
  );
}

// Liste de dresseurs cliquable en popup, partagée par "Dispo chez"/"Recherché
// par" ci-dessus : même contenu (nom + lien vers leur page), seul le titre
// et la liste changent.
function TrainerListModal({
  title,
  trainers,
  onClose,
}: {
  title: string;
  trainers: { id: string; name: string }[];
  onClose: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "color-mix(in srgb, var(--papier) 88%, transparent)", backdropFilter: "blur(12px)", zIndex: 350 }}
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      <div
        className="glass-card overflow-y-auto"
        style={{ maxWidth: 360, width: "100%", maxHeight: "calc(100dvh - 32px)", overscrollBehavior: "contain", padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontFamily: "Exo 2, sans-serif", color: "var(--encre)", fontWeight: 700, fontSize: "1rem" }}>
            {title}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "1px solid var(--trait-leger)", borderRadius: 8, color: "var(--encre)", cursor: "pointer", fontSize: "0.8rem", padding: "4px 10px" }}>
            Fermer
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {trainers.map((t) => (
            <Link
              key={t.id}
              href={`/dresseurs/${t.id}`}
              className="glass-card"
              style={{ textDecoration: "none", padding: "10px 14px", color: "var(--encre)", fontFamily: "Exo 2, sans-serif", fontWeight: 600, fontSize: "0.85rem" }}
            >
              {t.name}
            </Link>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
