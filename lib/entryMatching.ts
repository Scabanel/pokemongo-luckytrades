import type { PokemonEntry } from "./types";
import { parseTags } from "./tags";
import { canonicalCustomSpriteUrl } from "./spriteVariants";

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

// True si `give` (give ou mirror, actif, non lié à un autre échange) satisfait
// exactement ce que `want` recherche (même espèce/variante/shiny, et le fond
// si le want en précise un). Ne vérifie PAS que `want` est lui-même une
// entrée "want" active/non liée : à l'appelant de filtrer ça avant, selon le
// sens dans lequel il utilise la comparaison (voir les 3 usages dans
// PokemonCard.tsx pour l'exemple).
export function entriesMatch(want: PokemonEntry, give: PokemonEntry): boolean {
  if (give.completed || give.linkedEntryId) return false;
  if (give.category !== "give" && give.category !== "mirror") return false;
  if (give.pokemonId !== want.pokemonId) return false;
  if (!!give.shiny !== !!want.shiny) return false;
  if (formVariantKey(give.pokemonId, give.customSpriteUrl, give.tags) !== formVariantKey(want.pokemonId, want.customSpriteUrl, want.tags)) return false;
  if (!wantedBackgroundMatches(want.backgroundUrl, give.backgroundUrl)) return false;
  return true;
}
