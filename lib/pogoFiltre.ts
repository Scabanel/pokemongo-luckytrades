import type { PokemonEntry } from "@/lib/types";

/* ═══════════════════════════════════════════════════════════════════════════════════════
   LA CHAINE DE RECHERCHE A COLLER DANS POKEMON GO

   Steven, le 2026-09-04 : « faut faciliter que l'autre puisse voir rapidement ce que tu as
   en degainant le QR code par exemple, ou le filtre directement a copier aussi. »

   L'idee : on se croise a un raid, l'autre joueur colle une chaine dans SA recherche
   Pokemon GO, et son jeu lui montre immediatement ce qu'il possede de la liste. Aucune
   comparaison a faire de tete, aucun aller-retour entre deux telephones.

   ═══ POURQUOI DES NUMEROS DE POKEDEX ET PAS DES NOMS ═══

   `lib/pogoShinyFilter.ts` avait deja fait ce choix, et il est juste : la recherche du jeu
   accepte les numeros, et un numero ne depend ni de la langue de l'appli de l'autre
   joueur, ni de l'orthographe exacte d'un nom accentue. « Metalosse » colle chez un
   francophone et rate chez tout le monde d'autre; « 376 » colle partout.

   ═══ LA SYNTAXE ═══

   Dans Pokemon GO, la virgule est un OU et l'esperluette un ET. Donc :

     376,384,445              l'un de ces trois Pokemon
     chromatique&376,384,445  ... et chromatique

   ═══ PAS DE `!echange` ═══

   La premiere version en mettait un, au motif qu'un Pokemon deja echange ne peut plus
   l'etre. Steven, le 2026-09-05 : « faut pas mettre echange dans le filtre ».

   Il a raison, et pour une raison que je n'avais pas vue : ce filtre est colle par
   L'AUTRE joueur, dans SON jeu, pour voir ce qu'IL possede. « Deja echange » decrit
   l'etat des Pokemon de celui qui partage, pas de celui qui cherche. Le terme n'avait donc
   rien a filtrer chez lui, et pouvait au contraire ecarter a tort ses propres Pokemon
   marques comme echanges - alors qu'ils sont precisement ceux qu'il pourrait redonner.
   ═══════════════════════════════════════════════════════════════════════════════════════ */

/** Ce qu'on peut copier pour une liste. */
export type Filtre = {
  /** La chaine a coller telle quelle. */
  chaine: string;
  /** Combien de Pokemon distincts elle couvre. Affiche a cote du bouton. */
  pokemon: number;
  /** Longueur de la chaine, pour que l'utilisateur voie ce qu'il colle. */
  taille: number;
};

function numeros(entries: PokemonEntry[], seulementShiny: boolean): number[] {
  const retenues = seulementShiny ? entries.filter((e) => e.shiny) : entries;
  return Array.from(new Set(retenues.map((e) => e.pokemonId))).sort((a, b) => a - b);
}

/**
 * Le filtre pour toute une liste, ou `null` si elle est vide.
 *
 * Toujours calcule sur la liste ENTIERE de la categorie, jamais sur ce que la recherche ou
 * les etiquettes affichent a l'instant : on partage une liste, pas un ecran.
 */
export function construireFiltre(
  entries: PokemonEntry[],
  options: { seulementShiny?: boolean } = {},
): Filtre | null {
  const ids = numeros(entries, options.seulementShiny ?? false);
  if (ids.length === 0) return null;
  const prefixe = options.seulementShiny ? "chromatique&" : "";
  const chaine = prefixe + ids.join(",");
  return { chaine, pokemon: ids.length, taille: chaine.length };
}
