import type { PokemonEntry } from "./types";
import { parseTags } from "./tags";

// Partagé entre la page publique d'un dresseur (DresseurPageClient) et son
// propre espace (AdminPanel), pour que la recherche/les filtres se comportent
// pareil partout où on regarde une liste d'échanges.
export type EntryFilters = { shiny: boolean; fond: boolean; gigamax: boolean; dynamax: boolean; costume: boolean };

export const EMPTY_ENTRY_FILTERS: EntryFilters = {
  shiny: false,
  fond: false,
  gigamax: false,
  dynamax: false,
  costume: false,
};

export const ENTRY_FILTER_CHIPS: { key: keyof EntryFilters; label: string }[] = [
  { key: "shiny", label: "✨ Shiny" },
  { key: "fond", label: "Fond" },
  { key: "gigamax", label: "Gigamax" },
  { key: "dynamax", label: "Dynamax" },
  { key: "costume", label: "Costume" },
];

// Même heuristique que components/PokemonCard.tsx pour rester cohérent avec
// les badges déjà affichés sur chaque carte (pas de champ dédié en base).
export function matchesEntryFilters(entry: PokemonEntry, search: string, filters: EntryFilters) {
  const name = entry.pokemonName.toLowerCase();
  if (search && !name.includes(search.toLowerCase())) return false;

  // Le nom seul ne suffit pas : un tag "dynamax"/"gigamax" ajouté à la main
  // sans renommer l'entrée (ex: "Duralugon" + tag "dynamax") doit aussi compter.
  const nameAndTags = (name + " " + parseTags(entry.tags).join(" ")).toLowerCase();
  const isGigamax = nameAndTags.includes("gigamax");
  const isDynamax = nameAndTags.includes("dynamax") && !isGigamax;
  const isCostume = !isGigamax && !isDynamax && name.trim().includes(" ");
  const isShiny = entry.shiny || (entry.notes?.toLowerCase().includes("shiny") ?? false);
  const hasFond = !!entry.backgroundUrl;

  if (filters.shiny && !isShiny) return false;
  if (filters.fond && !hasFond) return false;
  if (filters.gigamax && !isGigamax) return false;
  if (filters.dynamax && !isDynamax) return false;
  if (filters.costume && !isCostume) return false;
  return true;
}
