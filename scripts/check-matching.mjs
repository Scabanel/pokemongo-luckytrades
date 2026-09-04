#!/usr/bin/env node
// Le matching fait-il ce qu'on annonce sur la landing ?
//
//   npm run check:matching
//
// ═══ POURQUOI CE SCRIPT EXISTE ═══
//
// La landing affirme desormais que les correspondances tiennent compte du fond, de la
// taille et du genre. C'est une promesse ecrite sur la page dont le travail est d'etablir
// la confiance, et elle etait FAUSSE au moment ou on a voulu l'ecrire : le genre etait
// affiche sur la carte et ignore par `entriesMatch`.
//
// Une promesse affichee dans une interface et tenue par du code ailleurs se desynchronise
// des la premiere refonte. Celle-ci echoue en code d'erreur non nul.
//
// ═══ CE QU'IL VERIFIE ═══
//
//   1. la semantique du genre : identique a celle de la taille et du fond;
//   2. la RESTRICTION aux especes a deux apparences, demandee par Steven;
//   3. la sante de data/gender-differences.json, qui pilote cette restriction.
//
// ═══ CE QU'IL NE VERIFIE PAS ═══
//
// Que la liste de PokeAPI corresponde exactement a ce que Pokemon GO affiche. C'est un
// sur-ensemble assume, documente dans scripts/generate-gender-differences.mjs.

import { readFileSync } from "node:fs";
import { wantedGenderMatches, wantedSizeMatches, wantedBackgroundMatches } from "../lib/entryMatching.ts";

const donnees = JSON.parse(readFileSync("data/gender-differences.json", "utf8"));
const echecs = [];

/** Une espece a deux apparences (Pikachu) et une sans (Dracaufeu), pour eprouver les deux
 *  branches. Choisies parce qu'elles sont verifiables a l'oeil par n'importe qui. */
const AVEC_DIFFERENCE = 25;   // Pikachu : la queue
const SANS_DIFFERENCE = 6;    // Dracaufeu

const CAS = [
  // [ce qu'on teste, resultat obtenu, resultat attendu]
  ["genre precise, espece concernee, genres differents", wantedGenderMatches("male", "female", AVEC_DIFFERENCE), false],
  ["genre precise, espece concernee, memes genres", wantedGenderMatches("male", "male", AVEC_DIFFERENCE), true],
  ["genre precise, espece concernee, l'autre n'en a pas", wantedGenderMatches("male", null, AVEC_DIFFERENCE), false],
  ["genre NON precise, espece concernee", wantedGenderMatches(null, "female", AVEC_DIFFERENCE), true],
  ["genre vide, espece concernee", wantedGenderMatches("", "female", AVEC_DIFFERENCE), true],
  ["espece SANS difference, genres differents", wantedGenderMatches("male", "female", SANS_DIFFERENCE), true],
  ["espece SANS difference, genre precise", wantedGenderMatches("female", null, SANS_DIFFERENCE), true],

  // La meme semantique pour les deux autres, pour que la promesse de la landing soit
  // verifiee en entier et pas seulement sur sa partie nouvelle.
  ["taille precisee, tailles differentes", wantedSizeMatches("XXL", "XXS"), false],
  ["taille precisee, memes tailles", wantedSizeMatches("XXL", "XXL"), true],
  ["taille NON precisee", wantedSizeMatches(null, "XXL"), true],
  ["fond precise, fonds differents", wantedBackgroundMatches("a.png", "b.png"), false],
  ["fond precise, memes fonds", wantedBackgroundMatches("a.png", "a.png"), true],
  ["fond NON precise", wantedBackgroundMatches(null, "a.png"), true],
];

for (const [quoi, obtenu, attendu] of CAS) {
  if (obtenu !== attendu) {
    echecs.push(`${quoi} : obtenu ${obtenu}, attendu ${attendu}.`);
  }
}

// ── La sante du fichier de donnees ─────────────────────────────────────────────────────
//
// Une liste vide desactiverait la restriction en silence : le genre cesserait de compter
// partout, et les sept cas ci-dessus continueraient de passer sauf les deux qui portent sur
// Pikachu. On borne donc les deux cotes.
if (!Array.isArray(donnees.ids) || donnees.ids.length < 50) {
  echecs.push(
    `data/gender-differences.json contient ${donnees.ids?.length ?? "aucun"} espece(s).\n`
    + `        Sous 50, la liste est manifestement tronquee et la restriction ne mesure plus rien.\n`
    + `        Regenerer : node scripts/generate-gender-differences.mjs`,
  );
}
if (Array.isArray(donnees.ids) && !donnees.ids.includes(AVEC_DIFFERENCE)) {
  echecs.push(
    `Pikachu (${AVEC_DIFFERENCE}) est absent de data/gender-differences.json.\n`
    + `        C'est l'exemple meme donne par Steven, et celui affiche sur la landing.`,
  );
}
if (Array.isArray(donnees.ids) && donnees.ids.includes(SANS_DIFFERENCE)) {
  echecs.push(
    `Dracaufeu (${SANS_DIFFERENCE}) est present dans data/gender-differences.json alors qu'il\n`
    + `        n'a pas d'apparence differente. La source a change de sens.`,
  );
}

console.log("check:matching\n");
console.log(`${CAS.length} cas de correspondance, ${donnees.ids?.length ?? 0} especes a genre visible\n`);
console.log("CE QUE CETTE SONDE NE COUVRE PAS :");
console.log("  - que la liste de PokeAPI corresponde exactement a ce que Pokemon GO");
console.log("    affiche. C'est un sur-ensemble assume : la regle ne se declenche que si");
console.log("    un dresseur a delibere de renseigner un genre.");

if (echecs.length > 0) {
  console.log(`\n[FAIL] ${echecs.length} probleme(s) :\n`);
  for (const x of echecs) console.log(`  - ${x}`);
  process.exit(1);
}
console.log("\n[OK] Fond, taille et genre se comportent comme la landing l'annonce.");
