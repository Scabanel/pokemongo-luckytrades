// Types partagés entre le catalogue public, l'admin et les cartes Pokémon.
// Avant ce fichier, PokemonEntry était redéfini (presque à l'identique) dans
// AdminPanel.tsx, PokemonCard.tsx et app/page.tsx : un champ ajouté au modèle
// Prisma demandait de le répercuter à la main dans 3 endroits.

export type Team = "instinct" | "mystic" | "valor";

export interface Trainer {
  id: string;
  name: string;
  team?: Team | null;
  level?: number | null;
  friendCode?: string | null;
  city?: string;
  preferredSpriteStyle?: string | null;
  // Présent uniquement quand l'API renvoie le compte d'entrées (liste des dresseurs en admin).
  _count?: { entries: number };
}

export type EntryCategory = "want" | "give" | "mirror";

export interface PokemonEntry {
  id: string;
  pokemonName: string;
  pokemonId: number;
  category: string;
  trainerId?: string | null;
  trainer?: Trainer | null;
  tradeForPokemonName?: string | null;
  tradeForPokemonId?: number | null;
  tradeForShiny?: boolean | null;
  tradeForCustomSpriteUrl?: string | null;
  tradePartnerName?: string | null;
  linkedEntryId?: string | null;
  notes?: string | null;
  shiny?: boolean;
  gender?: string | null;
  exclusiveMove?: boolean;
  customSpriteUrl?: string | null;
  backgroundUrl?: string | null;
  priority?: number | null;
  tags?: string | null;
  quantity?: number;
  completed?: boolean;
  updatedAt?: string;
}
