// Génère data/pokemon.json : liste statique {id, name, frenchName} pour les 1025 Pokémon.
// Objectif : supprimer les 2 appels API (PokeAPI REST + GraphQL) faits au chargement
// de l'admin à chaque fois — la liste ne change quasiment jamais, autant la figer.
//
// À relancer uniquement si une nouvelle génération de Pokémon sort (npm run gen:pokemon).

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "pokemon.json");
const LIMIT = 1025;

async function main() {
  console.log(`Fetching ${LIMIT} Pokémon (EN) + noms FR...`);

  const [listRes, gqlRes] = await Promise.all([
    fetch(`https://pokeapi.co/api/v2/pokemon?limit=${LIMIT}`),
    fetch("https://beta.pokeapi.co/graphql/v1beta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{ pokemon_v2_pokemonspeciesname(where: {language_id: {_eq: 5}}) { name pokemon_species_id } }`,
      }),
    }),
  ]);

  if (!listRes.ok) throw new Error(`PokeAPI list failed: ${listRes.status}`);
  const listData = await listRes.json();

  let frenchMap = new Map();
  if (gqlRes.ok) {
    const gqlData = await gqlRes.json();
    frenchMap = new Map(
      (gqlData.data?.pokemon_v2_pokemonspeciesname ?? []).map(
        ({ name, pokemon_species_id }) => [pokemon_species_id, name]
      )
    );
  } else {
    console.warn("GraphQL request failed, noms FR indisponibles — fallback sur noms EN.");
  }

  const options = listData.results.map((p, i) => {
    const id = i + 1;
    return {
      id,
      name: p.name,
      frenchName: frenchMap.get(id) ?? p.name,
    };
  });

  await writeFile(OUT_PATH, JSON.stringify(options, null, 2) + "\n", "utf-8");
  console.log(`✓ ${options.length} Pokémon écrits dans ${path.relative(process.cwd(), OUT_PATH)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
