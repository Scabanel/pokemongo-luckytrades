// Partagé entre components/PokemonCard.tsx et lib/entryFilters.ts pour que
// la détection Gigamax/Dynamax (nom ET tags) reste cohérente partout.
export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

// Formes régionales (Alola/Galar/Hisui/Paldea) : jamais taguées "costume" à
// la création (voir REGIONAL_FORM_PREFIX dans lib/spriteVariants.ts, donc
// entry.tags reste null), mais leur nom contient quand même un espace
// ("Sabelette Alola", "Electhor de Galar"...) — sans cette exclusion,
// toute heuristique "nom à espace = costume" (lib/entryFilters.ts,
// components/PokemonCard.tsx) les comptait à tort. Vérifié sur les 70
// entrées régionales réelles en prod (toutes tags:null) : cette regex les
// couvre en entier, sans faux positif sur les ~1160 autres noms distincts
// de la base.
export const REGIONAL_FORM_NAME = /\b(alolan?|galarian|hisuian|paldean?)\b|\bd[e']\s*(alola|galar|hisui|paldea)\b/i;
