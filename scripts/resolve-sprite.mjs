// Résout, pour un pokemonId donné, la meilleure URL de sprite PokeAPI
// réellement disponible (vérifiée par une requête HEAD), en préférant
// l'animé quand il existe. Utilisé pour figer un sprite qui MARCHE dans les
// données générées (data/missing-in-go.json), plutôt que de laisser le
// navigateur retenter plusieurs URLs à chaque affichage : cette dernière
// approche (l'ancienne, dans components/PokemonSprite.tsx) s'est révélée
// peu fiable en pratique - certaines tuiles restaient cassées indéfiniment
// sans jamais retenter l'URL suivante (observé en prod comme en local),
// pour des raisons qui restent floues (course entre plusieurs centaines de
// requêtes vers le même hôte, peut-être). Résoudre une fois côté serveur,
// au moment de la génération, élimine complètement la classe de bug.
const BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

// shiny: insère un sous-dossier "shiny/" juste avant le nom de fichier sur
// chacune des 4 sources (structure vérifiée par requête HEAD) — utilisé pour
// la section "Sans version shiny" de pas-encore-sortis, où montrer le sprite
// normal serait trompeur (ce qui manque, justement, c'est le shiny).
function candidatesFor(pokemonId, shiny = false) {
  const shinySeg = shiny ? "shiny/" : "";
  return [
    { url: `${BASE}/versions/generation-v/black-white/animated/${shinySeg}${pokemonId}.gif`, animated: true },
    { url: `${BASE}/other/showdown/${shinySeg}${pokemonId}.gif`, animated: true },
    { url: `${BASE}/${shinySeg}${pokemonId}.png`, animated: false },
    { url: `${BASE}/other/official-artwork/${shinySeg}${pokemonId}.png`, animated: false },
  ];
}

async function headOk(url) {
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function resolveSpriteUrl(pokemonId, shiny = false) {
  for (const candidate of candidatesFor(pokemonId, shiny)) {
    if (await headOk(candidate.url)) return candidate;
  }
  return null;
}

// Résout une liste de pokemonId en parallèle (limité) plutôt qu'en
// séquentiel - une centaine d'entrées en HEAD séquentiel serait trop lent.
export async function resolveSprites(ids, concurrency = 8, shiny = false) {
  const results = new Map();
  let cursor = 0;
  async function worker() {
    while (cursor < ids.length) {
      const id = ids[cursor++];
      results.set(id, await resolveSpriteUrl(id, shiny));
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// Enrichit une liste d'entrées {id, name} avec {spriteUrl, animated} résolus.
// Entrée conservée même si aucune URL ne répond (spriteUrl: null) : le
// front retombe alors sur official-artwork sans garantie, plutôt que de
// faire disparaître l'entrée silencieusement. shiny: pour "Sans version
// shiny", montrer le sprite normal serait trompeur - ce qui manque, c'est
// justement le rendu chromatique.
export async function attachResolvedSprites(entries, concurrency = 8, shiny = false) {
  const ids = entries.map((e) => e.id);
  const resolved = await resolveSprites(ids, concurrency, shiny);
  return entries.map((e) => {
    const r = resolved.get(e.id);
    return { ...e, spriteUrl: r?.url ?? null, animated: r?.animated ?? false };
  });
}
