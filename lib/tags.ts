// Partagé entre components/PokemonCard.tsx et lib/entryFilters.ts pour que
// la détection Gigamax/Dynamax (nom ET tags) reste cohérente partout.
export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}
