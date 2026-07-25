// Les icônes Pokémon GO (PokeMiners/pogo_assets, "Addressable Assets") sont
// des canevas 256x256 où le personnage n'occupe réellement qu'environ 40-50%
// de la surface (marge réservée aux effets/à l'ombre) : affichées telles
// quelles, elles paraissent minuscules dans une tuile carrée. On zoome et
// recadre au centre (légèrement décalé vers le bas, cohérent avec la marge
// du haut plus généreuse observée sur l'ensemble des icônes) pour qu'elles
// remplissent vraiment la tuile. Ne s'applique qu'à ces icônes précises : les
// sprites animés/artwork officiel (PokeAPI, Showdown) n'ont pas ce problème
// et seraient rognés à tort avec le même traitement.
const GO_ICON_HOST = "pogo_assets";

export function isGoIconUrl(url: string | null | undefined): boolean {
  return !!url && url.includes(GO_ICON_HOST);
}

export const GO_ICON_CROP_STYLE = {
  transform: "scale(1.55)",
  transformOrigin: "50% 55%",
} as const;
