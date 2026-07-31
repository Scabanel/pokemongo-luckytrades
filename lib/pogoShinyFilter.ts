import type { PokemonEntry } from "@/lib/types";

// Pokémon GO permet de filtrer sa collection avec des commandes texte dans
// la barre de recherche (ex: "chromatique&!échangé&151,239,240,251,..."),
// très utilisé pour les échanges à distance : ça ne montre que les shiny non
// échangés dont le numéro de Pokédex est dans la liste donnée. Génère la
// même commande à partir d'une liste de l'appli (miroir/recherche/donne),
// pour la coller directement dans Pokémon GO plutôt que de la retaper à la
// main. Toujours calculée sur la liste ENTIÈRE de la catégorie (pas filtrée
// par la recherche/les chips du moment) : c'est un export de la liste, pas
// de ce qui est actuellement affiché à l'écran.
export function buildPogoShinyFilter(entries: PokemonEntry[]): string | null {
  const dexIds = Array.from(new Set(entries.filter((e) => e.shiny).map((e) => e.pokemonId))).sort((a, b) => a - b);
  if (dexIds.length === 0) return null;
  return `chromatique&!échangé&${dexIds.join(",")}`;
}
