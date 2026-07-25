// Regroupement des Pokémon par région (Pokédex national), pour parcourir le
// picker d'ajout en masse région par région plutôt qu'en un seul bloc de
// 1025 entrées. Bornes approximatives (certaines formes Hisui/Paldea aux
// limites peuvent être arrondies), suffisant pour une navigation pratique.
export const REGIONS: { name: string; min: number; max: number }[] = [
  { name: "Kanto", min: 1, max: 151 },
  { name: "Johto", min: 152, max: 251 },
  { name: "Hoenn", min: 252, max: 386 },
  { name: "Sinnoh", min: 387, max: 493 },
  { name: "Unova", min: 494, max: 649 },
  { name: "Kalos", min: 650, max: 721 },
  { name: "Alola", min: 722, max: 809 },
  { name: "Galar", min: 810, max: 905 },
  { name: "Paldea", min: 906, max: 1025 },
];

export function getRegionName(pokemonId: number): string {
  return REGIONS.find((r) => pokemonId >= r.min && pokemonId <= r.max)?.name ?? "Autre";
}
