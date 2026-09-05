#!/usr/bin/env node
/* Les formes regionales des VRAIES listes se distinguent-elles de leur forme de base ?
 *
 *   node --import ./scripts/resolveur-alias.mjs --experimental-strip-types --no-warnings \
 *        scripts/verifier-formes-reelles.mjs
 *
 * check:matching balaie le catalogue : exhaustif, deterministe, hors ligne, et c'est lui qui
 * garde la regle. Ce script-ci fait autre chose, une seule fois : il regarde les donnees
 * reelles, parce que c'est la que le bug a ete vu et que le catalogue ne dit rien de ce que
 * les dresseurs ont reellement saisi.
 *
 * Lecture seule, et bornee aux seules especes qui possedent une forme regionale (54 sur
 * 1025) : pas d'aspiration de table. */

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const { prisma } = await import("../lib/prisma.ts");
import { sameVariant } from "../lib/entryMatching.ts";
import { getSpriteVariants } from "../lib/spriteVariants.ts";
import { formeDuLabel, regionDuNom } from "../lib/formesRegionales.ts";

const especesRegionales = [];
for (let id = 1; id <= 1025; id++) {
  try {
    if (getSpriteVariants(id).some((v) => formeDuLabel(v.label))) especesRegionales.push(id);
  } catch { /* espece absente du catalogue */ }
}

const combien = await prisma.pokemonEntry.count({ where: { pokemonId: { in: especesRegionales } } });
console.log(`${especesRegionales.length} especes a forme regionale, ${combien} entrees reelles concernees.`);

const entrees = await prisma.pokemonEntry.findMany({
  where: { pokemonId: { in: especesRegionales } },
  select: { id: true, pokemonId: true, pokemonName: true, customSpriteUrl: true, tags: true, shiny: true, trainer: { select: { name: true } } },
});

const parEspece = new Map();
for (const e of entrees) {
  if (!parEspece.has(e.pokemonId)) parEspece.set(e.pokemonId, []);
  parEspece.get(e.pokemonId).push(e);
}

let collisions = 0;
let paires = 0;
let regionales = 0;

for (const [pokemonId, liste] of parEspece) {
  for (const e of liste) if (regionDuNom(e.pokemonName) || formeDuLabel(getSpriteVariants(pokemonId).find((v) => v.url === e.customSpriteUrl)?.label)) regionales++;

  for (let i = 0; i < liste.length; i++) {
    for (let j = i + 1; j < liste.length; j++) {
      const a = liste[i], b = liste[j];
      const formeA = regionDuNom(a.pokemonName) ?? formeDuLabel(getSpriteVariants(pokemonId).find((v) => v.url === a.customSpriteUrl)?.label);
      const formeB = regionDuNom(b.pokemonName) ?? formeDuLabel(getSpriteVariants(pokemonId).find((v) => v.url === b.customSpriteUrl)?.label);
      // On ne compare que ce qui nous interesse : une forme regionale face a une non-regionale.
      if (!!formeA === !!formeB) continue;
      paires++;
      if (sameVariant(a, b)) {
        collisions++;
        console.log(`  COLLISION #${pokemonId} : « ${a.pokemonName} » (${a.trainer?.name}) et « ${b.pokemonName} » (${b.trainer?.name}) sont consideres identiques.`);
      }
    }
  }
}

console.log(`${regionales} entrees regionales, ${paires} paires regionale/base comparees, ${collisions} collision(s).`);
await prisma.$disconnect();
process.exit(collisions === 0 ? 0 : 1);
