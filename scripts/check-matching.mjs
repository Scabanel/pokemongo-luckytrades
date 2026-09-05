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
import { wantedGenderMatches, wantedSizeMatches, wantedBackgroundMatches, sameVariant } from "../lib/entryMatching.ts";
import { getSpriteVariants } from "../lib/spriteVariants.ts";
import { formeDuLabel, REGIONS } from "../lib/formesRegionales.ts";

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

/* ═══ AUCUNE FORME REGIONALE NE SE CONFOND AVEC SA FORME DE BASE ═══

   Steven, le 2026-09-05, capture a l'appui : « Sablaireau et Sablaireau d'Alola, l'app ne
   fait pas la distinction et considere que les deux sont la forme normale. » Puis, le cas
   corrige : « Fais ca pour toutes les formes regionales. Que ca soit une regle forte. »

   Une regle forte ne se verifie pas sur l'exemple qui l'a fait naitre. Ce bloc ne teste donc
   pas Sablaireau : il BALAIE tout le catalogue de sprites et eprouve chaque espece qui
   possede une forme regionale, quelle que soit la region. Une cinquieme region ajoutee un
   jour au catalogue entrera dans ce balayage sans que personne ait a y penser.

   ═══ LE BUG D'ORIGINE ═══

   `canonicalCustomSpriteUrl` ne reconnait que les sprites du catalogue PokeMiners et renvoie
   « forme de base » pour toute autre URL. L'entree « Sablaireau d'Alola » de la liste de
   Steven portait un GIF anime PokeAPI, inconnu du catalogue : elle se retrouvait a egalite
   avec un Sablaireau normal, et les deux s'affichaient « 1 dispo » l'un chez l'autre.

   Les trois situations ci-dessous couvrent les deux erreurs possibles, pas seulement celle
   qui a ete signalee. Se tromper dans l'autre sens - separer deux representations d'une
   MEME forme - est tout aussi grave et beaucoup plus discret : un dresseur ne verrait
   simplement plus quelqu'un qui a exactement ce qu'il cherche, sans rien pour l'alerter. */

const entree = (pokemonId, nom, url) => ({
  id: `${pokemonId}|${nom}|${url ?? ""}`, pokemonId, pokemonName: nom, customSpriteUrl: url,
  tags: null, shiny: false, category: "give", completed: false, linkedEntryId: null,
});

/* Le GIF anime PokeAPI : la forme d'URL exacte qui a produit le bug. Elle n'est dans aucun
   catalogue, donc seul le NOM de l'entree peut trahir la forme regionale. */
const URL_ETRANGERE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/10102.gif";

/** Le mot francais qui apparait dans un nom d'entree reel : « Sablaireau d'Alola ». */
const PREPOSITION = { alola: "d'Alola", galar: "de Galar", hisui: "de Hisui", paldea: "de Paldea" };

let especesBalayees = 0;
let formesBalayees = 0;
const parRegion = Object.fromEntries(REGIONS.map((r) => [r, 0]));

for (let pokemonId = 1; pokemonId <= 1025; pokemonId++) {
  let variantes;
  try { variantes = getSpriteVariants(pokemonId); } catch { continue; }
  const regionales = variantes.filter((v) => formeDuLabel(v.label));
  if (regionales.length === 0) continue;
  especesBalayees++;

  const base = entree(pokemonId, "Espece", null);

  for (const variante of regionales) {
    const forme = formeDuLabel(variante.label);
    const region = forme.split(" ")[0];
    formesBalayees++;
    if (parRegion[region] !== undefined) parRegion[region]++;

    // 1. Le sprite du catalogue suffit a distinguer la forme de la base. C'etait deja vrai
    //    avant le correctif, et ca doit le rester.
    if (sameVariant(entree(pokemonId, "Espece", variante.url), base)) {
      echecs.push(`#${pokemonId} « ${variante.label} » (sprite du catalogue) est confondu avec la forme de base.`);
    }

    // 2. Le NOM suffit, meme avec un sprite qu'aucun catalogue ne connait. C'est le bug
    //    exact signale par Steven.
    const nomRegional = `Espece ${PREPOSITION[region] ?? region}`;
    if (sameVariant(entree(pokemonId, nomRegional, URL_ETRANGERE), base)) {
      echecs.push(`#${pokemonId} « ${nomRegional} » avec un sprite hors catalogue est confondu avec la forme de base.`);
    }

    // 3. L'erreur symetrique : deux representations d'une MEME forme doivent se reconnaitre.
    //    Uniquement pour les formes sans sous-forme - « Tauros de Paldea » ne dit pas
    //    laquelle des trois races il designe, donc on ne devine pas (voir lib/formesRegionales.ts).
    if (forme === region && !sameVariant(entree(pokemonId, nomRegional, URL_ETRANGERE), entree(pokemonId, "Espece", variante.url))) {
      echecs.push(`#${pokemonId} « ${variante.label} » : le sprite du catalogue et le nom « ${nomRegional} » ne se reconnaissent pas comme la meme forme.`);
    }
  }

  // 4. Les sous-formes d'une meme region restent distinctes entre elles : Tauros de Paldea a
  //    trois races (Combat, Blaze, Aqua) sous le meme pokemonId ET le meme nom, Darmanitan de
  //    Galar deux formes. Les fusionner serait le bug d'origine deplace d'un cran.
  const sousFormes = [...new Set(regionales.map((v) => formeDuLabel(v.label)))];
  for (let i = 0; i < sousFormes.length; i++) {
    for (let j = i + 1; j < sousFormes.length; j++) {
      const a = regionales.find((v) => formeDuLabel(v.label) === sousFormes[i]);
      const b = regionales.find((v) => formeDuLabel(v.label) === sousFormes[j]);
      if (sameVariant(entree(pokemonId, "Espece", a.url), entree(pokemonId, "Espece", b.url))) {
        echecs.push(`#${pokemonId} « ${a.label} » et « ${b.label} » sont confondus alors que ce sont deux formes differentes.`);
      }
    }
  }
}

// Une sonde qui ne trouve plus rien a mesurer passe au vert sans rien prouver. Si le
// catalogue change de forme et que le balayage tombe a zero, c'est un echec.
if (especesBalayees < 50) {
  echecs.push(`le balayage n'a trouve que ${especesBalayees} especes a forme regionale : la sonde ne mesure plus rien.`);
}
for (const [region, n] of Object.entries(parRegion)) {
  if (n === 0) echecs.push(`aucune forme de ${region} balayee : la region est sortie du catalogue ou de la detection.`);
}

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
console.log(`${CAS.length} cas de correspondance, ${donnees.ids?.length ?? 0} especes a genre visible`);
console.log(`${formesBalayees} formes regionales balayees sur ${especesBalayees} especes (${Object.entries(parRegion).map(([r, n]) => `${r} ${n}`).join(", ")})\n`);
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
