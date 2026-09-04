import type { PokemonEntry } from "./types";
import { parseTags } from "./tags";
import { canonicalCustomSpriteUrl } from "./spriteVariants";
import genderDifferences from "@/data/gender-differences.json";

// Partagé entre components/PokemonCard.tsx (badges want/give réciproques,
// "Dispo chez X Dresseurs"/"X Dresseurs recherchent ce Pokémon") et tout
// code qui a besoin de savoir si deux entrées se correspondent (ex: filtre
// "Que je possède" sur la page publique d'un dresseur). Centralisé pour ne
// PAS refaire cette comparaison à la main ailleurs : voir docs/CONTEXT.md,
// deux bugs réels sont déjà venus d'une logique de matching dupliquée/
// divergente entre plusieurs endroits.

// Identité de forme/costume d'une entrée : pokemonId+shiny ne suffisent pas
// (ex: les races de Paldea de Tauros partagent le même pokemonId ET le même
// pokemonName "Tauros", seul customSpriteUrl distingue la race exacte).
// "fond" est ignoré ici (voir wantedBackgroundMatches plus bas, qui le gère
// à part). customSpriteUrl passe par canonicalCustomSpriteUrl : un sprite de
// base figé (ajout solo) et un sprite de base laissé vide (ajout en masse)
// sont la même variante.
const FORM_TAGS = new Set(["costume", "gigamax", "dynamax"]);
export function formVariantKey(pokemonId: number, customSpriteUrl: string | null | undefined, rawTags: string | null | undefined): string {
  const relevantTags = parseTags(rawTags).filter((t) => FORM_TAGS.has(t.toLowerCase())).sort().join(",");
  return `${canonicalCustomSpriteUrl(pokemonId, customSpriteUrl)}|${relevantTags}`;
}

// "fond" reste hors de formVariantKey (ce n'est pas une forme différente du
// Pokémon), mais un WANT n'est pas toujours indifférent au fond : beaucoup
// de dresseurs recherchent justement le souvenir d'un événement/lieu précis.
// Un want SANS fond précisé reste satisfait par n'importe quel give/mirror
// (fond ou pas) ; un want AVEC un fond précisé n'est satisfait que par un
// give/mirror ayant EXACTEMENT ce même fond.
export function wantedBackgroundMatches(wantBackgroundUrl: string | null | undefined, otherBackgroundUrl: string | null | undefined): boolean {
  return !wantBackgroundUrl || wantBackgroundUrl === otherBackgroundUrl;
}

// Records de taille (le plus petit/grand jamais capturé d'une espèce) :
// recherchés/échangés pour eux-mêmes en Pokémon GO. Même principe que le
// fond : un want SANS taille précisée reste satisfait par n'importe quelle
// taille (ou aucune) côté give ; un want AVEC une taille précisée n'est
// satisfait que par un give ayant EXACTEMENT cette même taille.
export const POKEMON_SIZES = ["XXS", "XS", "XL", "XXL"] as const;
export type PokemonSize = (typeof POKEMON_SIZES)[number];
export function wantedSizeMatches(wantSize: string | null | undefined, otherSize: string | null | undefined): boolean {
  return !wantSize || wantSize === otherSize;
}

/* ═══ LE GENRE ENTRE DANS LE MATCHING ═══
   Ajoute le 2026-09-04.

   Steven, en demandant d'annoncer sur la landing que « le matching de recherche fonctionne
   sur ca aussi » pour les fonds, les tailles ET les genres. La verification a montre que
   c'etait vrai des deux premiers et faux du troisieme : le genre etait affiche sur la carte
   (GenderBadge) mais `entriesMatch` l'ignorait completement. Plutot que d'ecrire une
   promesse fausse sur la page dont le travail est d'etablir la confiance, la promesse est
   rendue vraie.

   Meme semantique exacte que la taille et le fond, pour qu'il n'y ait pas trois regles a
   retenir : un want SANS genre precise reste satisfait par n'importe quel give; un want
   AVEC un genre precise n'est satisfait que par ce genre-la.

   ═══ CE QUE CA CHANGE POUR LES ENTREES EXISTANTES ═══

   Un « Je recherche » qui portait deja un genre voit desormais moins de correspondances
   qu'avant. C'est le comportement attendu - si on a precise un genre, c'est qu'on le veut -
   mais c'est bien un changement de comportement sur des donnees reelles, pas un simple
   ajout. Il vit sur la branche v2-refonte-da et pas en production. */
/** Les especes dont le male et la femelle n ont pas la meme apparence a l ecran.
 *  Genere : voir scripts/generate-gender-differences.mjs. */
const ESPECES_A_GENRE_VISIBLE = new Set<number>(genderDifferences.ids);

export function wantedGenderMatches(
  wantGender: string | null | undefined,
  otherGender: string | null | undefined,
  pokemonId: number,
): boolean {
  // ═══ RESTREINT AUX ESPECES A DEUX APPARENCES ═══
  //
  // Steven, apres coup : « Restreint aux especes a apparence differentes selon le genre. »
  //
  // Sur une espece dont le male et la femelle sont identiques a l'ecran, le genre n'est
  // qu'une etiquette : filtrer dessus ferait disparaitre des correspondances parfaitement
  // valables, parce que quelqu'un a rempli un champ sans y attacher d'intention. Sur un
  // Pikachu, dont la queue differe, c'est l'inverse : c'est bien un autre Pokemon a l'oeil.
  //
  // La liste vient de data/gender-differences.json, genere depuis PokeAPI (voir
  // scripts/generate-gender-differences.mjs). Elle n'a PAS ete ecrite de memoire : une
  // liste fausse dans un sens fait disparaitre des correspondances legitimes, dans l'autre
  // elle en laisse passer de mauvaises, et dans les deux cas en silence.
  if (!ESPECES_A_GENRE_VISIBLE.has(pokemonId)) return true;

  // Seuls "male" et "female" sont des genres au sens de GenderBadge. Toute autre valeur
  // (chaine vide, null, valeur heritee) est traitee comme « peu importe », ce qui evite
  // qu'un champ mal rempli fasse disparaitre des correspondances en silence.
  const precise = wantGender === "male" || wantGender === "female";
  return !precise || wantGender === otherGender;
}

// Même espèce/variante/shiny, indépendamment de la catégorie ou du fond
// (voir wantedBackgroundMatches pour le fond, géré à part par les
// catégories qui en ont besoin).
export function sameVariant(a: PokemonEntry, b: PokemonEntry): boolean {
  if (a.pokemonId !== b.pokemonId) return false;
  if (!!a.shiny !== !!b.shiny) return false;
  return formVariantKey(a.pokemonId, a.customSpriteUrl, a.tags) === formVariantKey(b.pokemonId, b.customSpriteUrl, b.tags);
}

// True si `give` (catégorie "give" UNIQUEMENT, actif, non lié à un autre
// échange) satisfait exactement ce que `want` recherche (même
// espèce/variante/shiny, et le fond/la taille si le want en précise un). "mirror" ne
// compte PAS comme un give ici : un échange miroir ne reste dans son propre
// bassin réciproque (voir entriesMatchMirror ci-dessous), il ne satisfait
// jamais un "Je recherche" de quelqu'un d'autre. Ne vérifie PAS que `want`
// est lui-même une entrée "want" active/non liée : à l'appelant de filtrer
// ça avant, selon le sens dans lequel il utilise la comparaison (voir les
// usages dans PokemonCard.tsx pour l'exemple).
export function entriesMatch(want: PokemonEntry, give: PokemonEntry): boolean {
  if (give.completed || give.linkedEntryId) return false;
  if (give.category !== "give") return false;
  if (!sameVariant(want, give)) return false;
  if (!wantedBackgroundMatches(want.backgroundUrl, give.backgroundUrl)) return false;
  if (!wantedSizeMatches(want.size, give.size)) return false;
  if (!wantedGenderMatches(want.gender, give.gender, want.pokemonId)) return false;
  return true;
}

// Paire symétrique "échange miroir" : les DEUX entrées doivent être
// "mirror" (un mirror ne matche jamais un want/give, voir entriesMatch
// ci-dessus). Ni l'une ni l'autre n'est "la demandeuse" au sens d'un want,
// donc pas de traitement à part pour le fond ici (ignoré, comme pour un
// give classique sans want en face).
export function entriesMatchMirror(a: PokemonEntry, b: PokemonEntry): boolean {
  if (a.category !== "mirror" || b.category !== "mirror") return false;
  if (b.completed || b.linkedEntryId) return false;
  return sameVariant(a, b);
}
