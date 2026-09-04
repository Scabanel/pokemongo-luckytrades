#!/usr/bin/env node
// Genere data/generations.json : les bornes de chaque generation et le nom de sa region.
//
//   node scripts/generate-generations.mjs
//
// ═══ POURQUOI ═══
//
// Steven, le 2026-09-04 : « il faudrait afficher des separateurs selon les regions /
// generations ca rendra aussi les choses plus lisibles. »
//
// Les bornes de generation sont archi-connues et stables, et c'est exactement pourquoi la
// tentation est de les ecrire de memoire. Le meme raisonnement que pour
// data/gender-differences.json s'applique : une borne fausse d'une unite range un Pokemon
// dans la mauvaise region, personne ne le remarque, et le separateur qui devait clarifier
// se met a mentir. Une requete suffit a ne pas avoir a se demander si 905 est Galar ou
// Paldea.
//
// Les entrees du site sont deja triees par numero de Pokedex (voir sortEntries dans
// app/dresseurs/[id]/DresseurPageClient.tsx), donc les generations y sont contigues : il
// suffit de comparer chaque numero aux bornes, sans regrouper ni retrier.
//
// Le fichier est genere et versionne, pas appele a l'execution : une nouvelle generation
// sort tous les trois ans environ.

import { writeFileSync } from "node:fs";

/** Les noms francais des regions. PokeAPI les rend en anglais, et « Unova » n'est pas le
 *  nom que les joueurs francophones utilisent - c'est Unys. Les autres sont identiques,
 *  mais on les ecrit toutes ici pour que la liste soit lisible d'un coup d'oeil. */
const NOMS_FR = {
  kanto: "Kanto",
  johto: "Johto",
  hoenn: "Hoenn",
  sinnoh: "Sinnoh",
  unova: "Unys",
  kalos: "Kalos",
  alola: "Alola",
  galar: "Galar",
  paldea: "Paldea",
};

const REQUETE = `query {
  pokemon_v2_generation(order_by: {id: asc}) {
    id
    pokemon_v2_region { name }
    pokemon_v2_pokemonspecies_aggregate { aggregate { min { id } max { id } count } }
  }
}`;

const reponse = await fetch("https://beta.pokeapi.co/graphql/v1beta", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: REQUETE }),
});

if (!reponse.ok) {
  console.error(`[FAIL] PokeAPI a repondu ${reponse.status}. Fichier NON modifie.`);
  process.exit(2);
}

const generations = (await reponse.json())?.data?.pokemon_v2_generation;
if (!Array.isArray(generations) || generations.length < 8) {
  console.error(`[FAIL] ${generations?.length ?? "aucune"} generation(s) recue(s). Fichier NON modifie.`);
  process.exit(2);
}

const bornes = generations.map((g) => {
  const a = g.pokemon_v2_pokemonspecies_aggregate.aggregate;
  const region = g.pokemon_v2_region?.name;
  return {
    generation: g.id,
    region: NOMS_FR[region] ?? region ?? `Generation ${g.id}`,
    du: a.min.id,
    au: a.max.id,
    especes: a.count,
  };
});

// Les bornes doivent se suivre sans trou ni chevauchement, sinon un Pokemon tomberait dans
// aucune section ou dans deux. On refuse d'ecrire plutot que de produire un fichier qui
// range mal en silence.
for (let i = 1; i < bornes.length; i++) {
  if (bornes[i].du !== bornes[i - 1].au + 1) {
    console.error(
      `[FAIL] trou ou chevauchement entre ${bornes[i - 1].region} (jusqu'a ${bornes[i - 1].au})`
      + ` et ${bornes[i].region} (a partir de ${bornes[i].du}). Fichier NON modifie.`,
    );
    process.exit(2);
  }
}

writeFileSync("data/generations.json", `${JSON.stringify({
  _source: "PokeAPI GraphQL, pokemon_v2_generation et son agregat d'especes",
  _releve_le: new Date().toISOString().slice(0, 10),
  _regenerer: "node scripts/generate-generations.mjs",
  bornes,
}, null, 2)}\n`);

console.log(`${bornes.length} generations, ${bornes.at(-1).au} especes couvertes.`);
for (const b of bornes) console.log(`  ${b.region.padEnd(8)} ${String(b.du).padStart(4)}-${String(b.au).padStart(4)}  (${b.especes})`);
