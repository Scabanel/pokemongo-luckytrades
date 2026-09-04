#!/usr/bin/env node
// Le filtre des événements montre-t-il ce qui concerne Strasbourg, et RIEN d'autre ?
//
//   npm run check:evenements
//
// ═══ POURQUOI UNE SONDE PLUTOT QU'UNE RELECTURE ═══
//
// Le flux `data/upcoming-events.json` est réécrit par un cron. Une règle de filtrage relue
// une fois à la main est juste le jour où on l'écrit et se dégrade en silence à chaque
// passage du cron : un nouveau format de titre, un pays de plus, et la page se remet à
// afficher un PokéPark de Tokyo sans que personne ne le voie.
//
// Cette sonde relit la règle contre les données du jour et échoue si elle laisse passer
// quelque chose d'injouable depuis Strasbourg, ou si elle écarte un événement mondial.
//
// ═══ CE QU'ELLE NE MESURE PAS ═══
//
// Si un événement est INTERESSANT. La règle écarte ce qui n'est pas jouable depuis
// Strasbourg, et ce que la source elle-même n'a pas su classer; elle ne classe pas les
// événements restants par importance. Trancher qu'une « Maîtrise de capture » compte moins
// qu'un Community Day serait un jugement éditorial, et un script ne le rendrait pas plus
// vrai. Ce jugement reste celui de Steven.

import { readFileSync } from "node:fs";
import { motifExclusion, motsAmbigus, nomAffiche, MOTIF_NON_CLASSE } from "../lib/evenements-pertinents.ts";

const evenements = JSON.parse(readFileSync("data/upcoming-events.json", "utf8"));
const maintenant = Date.now();

/** Ce que la page montre : ni le passé, ni les autres régions. */
const actifs = evenements.filter((e) => e.end >= maintenant);
const gardes = actifs.filter((e) => motifExclusion(e) === null);
const ecartes = actifs.filter((e) => motifExclusion(e) !== null);

const echecs = [];

// ── Règle 1 : rien d'injouable ne passe ────────────────────────────────────────────────
//
// Le test ne relit pas la règle avec la règle - ce serait circulaire et toujours vert. Il
// vérifie deux invariants formulés sur le titre BRUT, sans passer par le découpage en
// morceaux de la règle, donc un bug de ce découpage ne peut pas les rendre verts tous les
// deux à la fois :
//
//   a) un événement garde qui porte une géographie doit citer la France, ou Strasbourg.
//   b) un événement garde ne doit pas appartenir a une famille d'une seule ville.
//
// Premiere version de cette regle : chercher un pays lointain dans le titre. Elle
// condamnait « LEGO Store (France, Allemagne, Australie, ...) », qui est bel et bien
// disponible en France - un evenement multi-pays cite forcement des pays lointains. Le
// critere n'etait pas la presence d'un ailleurs, mais l'ABSENCE de la France.
const sansAccent = (t) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const FAMILLES_UNE_VILLE = ["city safari", "pokepark", "safari zone", "musee des fossiles", "observatoire pokemon"];

for (const e of gardes) {
  const titre = sansAccent(e.title);
  if (titre.includes("strasbourg")) continue;

  const parenthese = titre.match(/\(([^)]*)\)/);
  if (parenthese && !parenthese[1].includes("france")) {
    echecs.push(
      `garde a tort : « ${e.title.slice(0, 60)} »\n`
      + `        Sa geographie « ${parenthese[1]} » ne cite pas la France.`,
    );
  }
  const famille = FAMILLES_UNE_VILLE.find((f) => titre.includes(f));
  if (famille) {
    echecs.push(
      `garde a tort : « ${e.title.slice(0, 60)} »\n`
      + `        C'est un « ${famille} » : un lieu unique, pas Strasbourg.`,
    );
  }
}

// ── Règle 2 : aucun événement mondial n'est perdu ──────────────────────────────────────
//
// L'erreur symétrique, et la plus coûteuse : un filtre trop serré fait disparaître le
// Community Day. Un événement sans géographie dans son titre est mondial par construction,
// donc il doit être gardé - sans exception.
for (const e of ecartes) {
  // Cette règle ne juge que le filtre GEOGRAPHIQUE. Les entrées sans catégorie sont
  // écartées pour une autre raison, et c'est la règle 5 qui surveille celle-là - la
  // confondre ici ferait échouer les « Pleine Lune », qui n'ont effectivement pas de
  // géographie mais ne sont pas des événements.
  if (motifExclusion(e) === MOTIF_NON_CLASSE) continue;
  if (!/\(/.test(e.title)) {
    echecs.push(
      `ecarte a tort : « ${e.title.slice(0, 60)} »\n`
      + `        Aucune geographie dans le titre, donc mondial, donc jouable ici.`,
    );
  }
}

// ── Règle 3 : le filtre mesure-t-il encore quelque chose ? ─────────────────────────────
//
// Une règle qui garde tout, ou qui garde zéro, n'est plus une règle. Les deux bornes
// attrapent la panne la plus sournoise : un filtre devenu inopérant reste VERT sur les deux
// règles ci-dessus, puisqu'elles ne parlent que des cas qu'il traite.
if (gardes.length === 0) {
  echecs.push("le filtre ne garde AUCUN evenement : la page serait vide.");
} else if (ecartes.length === 0 && actifs.length > 10) {
  echecs.push(
    `le filtre n'ecarte RIEN sur ${actifs.length} evenements.\n`
    + `        Le flux contenait toujours des evenements d'autres regions : filtre inoperant ?`,
  );
}

// ── Règle 4 : « category: null » veut-il toujours dire « Pleine Lune » ? ───────────────
//
// La règle écarte les entrées sans catégorie parce qu'aujourd'hui elles sont exactement les
// quatre « Pleine Lune ». C'est une correspondance CONSTATEE dans les données, pas une
// garantie du flux : si la source cesse de catégoriser les Community Day, la même ligne de
// code se mettrait à supprimer l'événement le plus important du mois, en silence.
const sansCategorie = [...new Set(evenements.filter((e) => e.category === null).map((e) => e.title))];
const inattendus = sansCategorie.filter((t) => t !== "Pleine Lune");
if (inattendus.length > 0) {
  echecs.push(
    `des entrees sans categorie ne sont plus des « Pleine Lune » : ${inattendus.join(", ")}.\n`
    + `        La regle « pas de categorie = pas un evenement » les supprimerait a tort.`,
  );
}

// ── Règle 5 : plus aucune carte ne s'appelle « ? » ─────────────────────────────────────
//
// Trois Community Day à venir n'ont pas encore de Pokémon vedette et arrivent titrés « ? ».
// `nomAffiche` leur rend un nom lisible; si cette réparation cesse de fonctionner, la page
// réaffiche des cartes anonymes sans que rien n'échoue ailleurs.
for (const e of gardes) {
  const { nom, note } = nomAffiche(e);
  if (nom.replace(/\?/g, "").replace(/✨/g, "").trim() === "") {
    echecs.push(
      `carte sans nom lisible : titre « ${e.title} », categorie « ${e.category} ».\n`
      + `        nomAffiche() devrait remplacer un titre vide par la categorie.`,
    );
  }
  if (note && nom.includes("?")) {
    echecs.push(`« ${nom} » garde un point d'interrogation alors qu'il a ete renomme.`);
  }
}

// ── Règle 6 : la liste des pays est-elle encore à jour, là où ça compte ? ──────────────
//
// Un pays inconnu est lu comme une ville, ce qui fait exclure - le sens sûr. Sauf dans une
// parenthèse qui cite AUSSI la France : là, le mot inconnu ferait passer l'événement pour
// une exclusivité d'une ville et le supprimerait à tort. On échoue sur ce cas seul, et on
// reste muet sur les autres mots inconnus, qui sont écartés de toute façon. Une sonde qui
// crierait à chaque nouveau pays du flux finirait ignorée.
const ambigus = motsAmbigus(evenements);
if (ambigus.length > 0) {
  echecs.push(
    `mot(s) inconnu(s) cite(s) avec la France : ${ambigus.join(", ")}.\n`
    + `        Ajouter les pays a PAYS dans lib/evenements-pertinents.ts, sinon ils sont\n`
    + `        pris pour des villes et leurs evenements disparaissent.`,
  );
}

console.log("check:evenements\n");
console.log(`${evenements.length} evenements dans le flux`);
console.log(`  ${evenements.length - actifs.length} passes (jamais affiches)`);
console.log(`  ${actifs.length} en cours ou a venir`);
console.log(`     ${gardes.length} gardes (jouables depuis Strasbourg)`);
console.log(`     ${ecartes.length} ecartes\n`);

console.log("ECARTES ET POURQUOI :");
for (const e of ecartes) {
  console.log(`  - ${e.title.slice(0, 52).padEnd(52)} | ${motifExclusion(e)}`);
}

console.log("\nCE QUE CETTE SONDE NE COUVRE PAS :");
console.log("  - l'INTERET d'un evenement. Elle garantit que ce qui reste est jouable");
console.log(`    depuis Strasbourg, pas que ca vaut le detour. Classer ces ${gardes.length}`);
console.log("    evenements par importance serait un jugement editorial, pas une mesure.");

if (echecs.length > 0) {
  console.log(`\n[FAIL] ${echecs.length} probleme(s) :\n`);
  for (const x of echecs) console.log(`  - ${x}`);
  process.exit(1);
}
console.log("\n[OK] Rien d'injouable n'est garde, aucun evenement mondial n'est perdu.");
