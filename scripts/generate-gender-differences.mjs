#!/usr/bin/env node
// Genere data/gender-differences.json : les especes dont l'APPARENCE differe selon le genre.
//
//   node scripts/generate-gender-differences.mjs
//
// ═══ POURQUOI CE FICHIER EXISTE ═══
//
// Steven, le 2026-09-04 : « Restreint aux especes a apparence differentes selon le genre. »
//
// Le genre venait d'entrer dans le matching pour toutes les especes. La restriction demandee
// suppose de savoir lesquelles ont vraiment deux apparences, et cette connaissance n'est
// nulle part dans le depot : verifie, data/go-icons.json ne contient AUCUN fichier marque
// `.g2.` - les icones de Pokemon GO ne distinguent pas le genre sur le sprite de base. Le
// `(2)` de data/costumes.json ne concerne que les costumes.
//
// L'ecrire de memoire etait exclu. Une liste fausse dans un sens fait disparaitre des
// correspondances legitimes, dans l'autre elle en laisse passer de mauvaises, et dans les
// deux cas en silence. PokeAPI porte un booleen fait exactement pour cette question,
// `has_gender_differences`, et son point d'acces GraphQL le rend en une seule requete.
//
// ═══ LA LIMITE DE CETTE SOURCE, ET IL FAUT LA DIRE ═══
//
// Le booleen de PokeAPI decrit les JEUX PRINCIPAUX, pas Pokemon GO. C'est donc un
// sur-ensemble : quelques especes y sont marquees alors que GO ne montre pas la difference.
// La consequence est bornee et acceptable - la regle de matching ne se declenche que si un
// dresseur a DELIBEREMENT renseigne un genre sur son entree. A l'inverse, aucune espece que
// GO differencie n'est absente de cette liste, ce qui est le sens qui compte.
//
// Le fichier est genere et versionne, pas appele a l'execution : la liste ne change qu'a la
// sortie d'une nouvelle generation, et une page publique n'a pas a dependre de PokeAPI.

import { writeFileSync } from "node:fs";

const POINT_ACCES = "https://beta.pokeapi.co/graphql/v1beta";
const REQUETE = `query {
  pokemon_v2_pokemonspecies(where: {has_gender_differences: {_eq: true}}, order_by: {id: asc}) {
    id
    name
  }
}`;

const reponse = await fetch(POINT_ACCES, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: REQUETE }),
});

if (!reponse.ok) {
  console.error(`[FAIL] PokeAPI a repondu ${reponse.status}. Fichier NON modifie.`);
  process.exit(2);
}

const charge = await reponse.json();
const especes = charge?.data?.pokemon_v2_pokemonspecies;

// Une reponse vide ecraserait le fichier par une liste vide, ce qui desactiverait la regle
// de matching en silence. On refuse plutot que d'ecrire.
if (!Array.isArray(especes) || especes.length < 50) {
  console.error(`[FAIL] reponse inattendue (${especes?.length ?? "aucune"} especes). Fichier NON modifie.`);
  process.exit(2);
}

const contenu = {
  _source: "PokeAPI GraphQL, champ has_gender_differences des pokemon_v2_pokemonspecies",
  _releve_le: new Date().toISOString().slice(0, 10),
  _limite: "Decrit les jeux principaux, pas Pokemon GO. Sur-ensemble assume : voir le bandeau de scripts/generate-gender-differences.mjs.",
  _regenerer: "node scripts/generate-gender-differences.mjs",
  ids: especes.map((e) => e.id),
  noms: Object.fromEntries(especes.map((e) => [e.id, e.name])),
};

writeFileSync("data/gender-differences.json", `${JSON.stringify(contenu, null, 2)}\n`);
console.log(`${especes.length} especes a apparence differente selon le genre.`);
console.log(`Premieres : ${especes.slice(0, 8).map((e) => `${e.id} ${e.name}`).join(", ")}`);
