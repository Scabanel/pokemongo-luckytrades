#!/usr/bin/env node
/* Les formes Avatar/Totemique et les fonds tiennent-ils leurs promesses ?
 *
 *   npm run check:formes-fonds
 *
 * Exhaustif, deterministe, hors ligne, aucune base de donnees. Ecrit apres les quatre
 * retours de RyN du 2026-09-06 sur le Discord, parce que trois d'entre eux etaient des
 * defauts qu'AUCUN harnais n'aurait attrapes :
 *
 *   « il y a pas moyen de selectionner directement les formes totemiques de Boreas,
 *     Fulguris, Demeteros, Amovenus ? A part en choisissant les sprites »
 *   « je cherche le shiny de sa forme avatar et le shiny de sa forme totemique, je peux
 *     pas mettre les deux »
 *   « il n'y a pas le fond mega de ce weekend dans le site »
 *   « on peut pas mettre le fond Ethernatos sur Kraboss Gmax »
 *
 * Un utilisateur qui rapporte un bug fait le travail d'un harnais absent. Celui-ci evite
 * qu'il ait a le refaire.
 */

import { readFileSync } from "node:fs";
import {
  formeDuLabel,
  formeDuNom,
  libelleForme,
  FORME_DE_BASE,
} from "../lib/formesIdentitaires.ts";
import { getSpriteVariants, variantNeedsPinnedSprite, estFormeIdentitaire } from "../lib/spriteVariants.ts";
import { formVariantKey } from "../lib/entryMatching.ts";

const echecs = [];
const controle = (nom, ok, detail) => {
  console.log(`${ok ? "[OK]  " : "[FAIL]"} ${nom} - ${detail}`);
  if (!ok) echecs.push(nom);
};

const lire = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8"));
const CATALOGUE = lire("costumes.json");
const POKEMON = lire("pokemon.json");
const FONDS_GENERIQUES = lire("backgrounds.json");
const FONDS_VALIDES = lire("pokemon-backgrounds.json");

const GENIES = [641, 642, 645, 905]; // Boreas, Fulguris, Demeteros, Amovenus

/* ═══════════════════════════════════════════════════════════════════════════════════
   1. LA FAMILLE EST-ELLE TOUJOURS FERMEE ?

   La table FORMES_NOMMEES traite Incarnate/Therian comme un cas nomme plutot que comme un
   motif general, et cette decision repose sur une MESURE : ces deux labels n'existent que
   sur ces quatre especes. Si une cinquieme apparait un jour dans le datamine, la decision
   doit etre reexaminee - et ce controle est le seul endroit qui le dira.
   ═══════════════════════════════════════════════════════════════════════════════════ */
{
  const porteuses = Object.entries(CATALOGUE)
    .filter(([, arr]) => arr.some((c) => /^(therian|incarnate)\b/i.test(c.label)))
    .map(([id]) => Number(id))
    .sort((a, b) => a - b);
  controle(
    "Avatar/Totemique n'existent que sur les quatre genies",
    JSON.stringify(porteuses) === JSON.stringify(GENIES),
    `${porteuses.length} espece(s) : ${porteuses.join(", ")}`,
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════════
   2. AUCUN LABEL ANGLAIS NE DOIT ATTEINDRE L'UTILISATEUR

   « Therian » est le nom du datamine, pas un mot d'interface francaise. Personne ne le
   cherche, et RyN ne l'a trouve qu'en fouillant les sprites. Le controle porte sur ce que
   getSpriteVariants REND, pas sur ce que le catalogue contient : c'est la sortie qui est
   montree.
   ═══════════════════════════════════════════════════════════════════════════════════ */
{
  const fautifs = [];
  for (let id = 1; id <= 1025; id++) {
    for (const v of getSpriteVariants(id)) {
      if (/\b(therian|incarnate)\b/i.test(v.label)) fautifs.push(`${id}:${v.label}`);
    }
  }
  controle(
    "Aucun libelle anglais de forme n'atteint les pickers",
    fautifs.length === 0,
    fautifs.length === 0 ? "tous traduits en Avatar / Totémique" : fautifs.join(", "),
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════════
   3. LES QUATRE GENIES OFFRENT EXACTEMENT LE CHOIX ATTENDU

   Steven, le 2026-09-06 : « c'est soit totemique soit avatar, ca peut pas etre les deux ».
   Il ne doit donc y avoir ni troisieme option, ni tuile de base en doublon - le repli
   go-icons en ajoutait une, pointant sur le MEME fichier que la tuile Avatar, ce qui
   cassait silencieusement l'identite de la forme Avatar.
   ═══════════════════════════════════════════════════════════════════════════════════ */
{
  const soucis = [];
  for (const id of GENIES) {
    const v = getSpriteVariants(id);
    const racines = new Set(v.map((x) => x.label.replace(" ✨", "")));
    if (racines.size !== 2 || !racines.has("Avatar") || !racines.has("Totémique")) {
      soucis.push(`${id} propose {${[...racines].join(", ")}}`);
    }
    const urls = v.map((x) => x.url);
    if (new Set(urls).size !== urls.length) soucis.push(`${id} a deux tuiles pour une meme image`);
    for (const x of v) {
      if (!variantNeedsPinnedSprite(x)) soucis.push(`${id} ${x.label} : sprite non fige`);
      if (x.tags.includes("costume")) soucis.push(`${id} ${x.label} : tague costume, or ce n'est pas un costume`);
    }
  }
  controle(
    "Chaque genie propose Avatar ou Totemique, et rien d'autre",
    soucis.length === 0,
    soucis.length === 0 ? "4 especes, 2 formes chacune, sprites figes, aucun tag costume" : soucis.join(" ; "),
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════════
   4. LE BUG DE RYN, REJOUE : LES DEUX SHINY DOIVENT COEXISTER

   C'est le controle qui compte. Il rejoue exactement la garde anti-doublon de l'interface
   d'ajout - meme dresseur, meme categorie, meme numero, meme shiny - et verifie qu'elle
   separe les deux formes tout en refusant un vrai doublon.

   Les deux moities sont indispensables. Une garde qui laisse tout passer resoudrait la
   plainte de RyN et casserait ce a quoi elle sert.
   ═══════════════════════════════════════════════════════════════════════════════════ */
{
  const V = getSpriteVariants(645);
  const av = V.find((x) => x.label === "Avatar ✨");
  const to = V.find((x) => x.label === "Totémique ✨");
  const clef = (url, nom) => formVariantKey(645, url, null, nom);

  const kAvatar = clef(av.url, "Démétéros Avatar ✨");
  const kTotem = clef(to.url, "Démétéros Totémique ✨");

  controle(
    "Les deux formes shiny de Demeteros coexistent",
    kAvatar !== kTotem,
    `avatar ${JSON.stringify(kAvatar)} vs totemique ${JSON.stringify(kTotem)}`,
  );
  controle(
    "Deux fois la meme forme reste un doublon",
    clef(to.url, "Démétéros Totémique ✨") === clef(null, "Démétéros Totémique"),
    "reconnue par le sprite comme par le nom, donc refusee dans les deux cas",
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════════
   5. AVATAR EST LA BASE, ET CE N'EST PAS « AUCUNE FORME »

   L'erreur symetrique de celle de Sablaireau d'Alola : separer deux entrees qui designent
   le meme Pokemon. « Demeteros » tout court designe deja la forme Avatar, donc les trois
   ecritures doivent produire la meme clef.
   ═══════════════════════════════════════════════════════════════════════════════════ */
{
  const av = getSpriteVariants(645).find((x) => x.label === "Avatar");
  const clef = (url, nom) => formVariantKey(645, url, null, nom);
  const nu = clef(null, "Démétéros");
  const parSprite = clef(av.url, "Démétéros");
  const parNom = clef(null, "Démétéros Avatar");
  controle(
    "Demeteros nu, sprite Avatar et nom Avatar sont le meme Pokemon",
    nu === parSprite && nu === parNom,
    `${JSON.stringify(nu)} / ${JSON.stringify(parSprite)} / ${JSON.stringify(parNom)}`,
  );
  controle(
    "FORME_DE_BASE se distingue de « aucune forme trouvee »",
    formeDuNom("Démétéros Avatar") === FORME_DE_BASE && formeDuNom("Démétéros") === null,
    `« Avatar » -> ${JSON.stringify(formeDuNom("Démétéros Avatar"))}, nu -> ${JSON.stringify(formeDuNom("Démétéros"))}`,
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════════
   6. LES DEUX ECRITURES SE RECONNAISSENT

   Le catalogue ecrit « Therian », l'interface ecrit « Totémique », et des entrees existantes
   portent peut-etre l'une ou l'autre. Les deux doivent mener a la meme forme, sinon une
   liste ancienne cesserait de correspondre a une liste recente.
   ═══════════════════════════════════════════════════════════════════════════════════ */
{
  const memes = [
    ["Therian", "Totémique"],
    ["Therian ✨", "Totémique ✨"],
    ["Incarnate", "Avatar"],
  ];
  const desaccords = memes.filter(([a, b]) => formeDuLabel(a) !== formeDuLabel(b));
  controle(
    "L'ecriture anglaise et l'ecriture francaise donnent la meme forme",
    desaccords.length === 0,
    desaccords.length === 0
      ? "Therian = Totémique, Incarnate = Avatar"
      : desaccords.map(([a, b]) => `${a} != ${b}`).join(", "),
  );
  controle(
    "libelleForme traduit sans toucher au reste",
    libelleForme("Therian ✨") === "Totémique ✨" && libelleForme("Alola") === "Alola" && libelleForme("Halloween 2025") === "Halloween 2025",
    `« Therian ✨ » -> « ${libelleForme("Therian ✨")} », les autres labels intacts`,
  );
  controle(
    "Une forme d'identite n'est jamais rangee dans les costumes",
    estFormeIdentitaire("Totémique") && estFormeIdentitaire("Alola") && !estFormeIdentitaire("Halloween 2025"),
    "Totémique et Alola oui, Halloween non",
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════════
   7. LES FONDS : L'UNION, PAS LE OU-EXCLUSIF

   L'interface choisissait SOIT les fonds confirmes pour ce Pokemon, SOIT le catalogue
   generique. Chacune des deux listes contenait ce que l'autre n'avait pas, donc la bascule
   ne changeait pas d'echelle : elle changeait d'univers, et faisait disparaitre des fonds
   reels. Ce controle reproduit l'union du picker et verifie qu'aucune des deux sources ne
   se perd.
   ═══════════════════════════════════════════════════════════════════════════════════ */
const sansAccent = (t) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const TOUS_LES_FONDS = (() => {
  const vus = new Set(FONDS_GENERIQUES.map((b) => b.url));
  const sup = [];
  for (const liste of Object.values(FONDS_VALIDES)) {
    for (const b of liste) {
      if (vus.has(b.url)) continue;
      vus.add(b.url);
      sup.push(b);
    }
  }
  return [...FONDS_GENERIQUES, ...sup];
})();

{
  const urls = new Set(TOUS_LES_FONDS.map((b) => b.url));
  const perdusGeneriques = FONDS_GENERIQUES.filter((b) => !urls.has(b.url));
  const perdusValides = Object.values(FONDS_VALIDES).flat().filter((b) => !urls.has(b.url));
  controle(
    "Aucun fond ne se perd dans l'union",
    perdusGeneriques.length === 0 && perdusValides.length === 0,
    `${TOUS_LES_FONDS.length} fonds au total, ${FONDS_GENERIQUES.length} generiques + ${TOUS_LES_FONDS.length - FONDS_GENERIQUES.length} venus des listes par Pokemon`,
  );

  // Les images d'evenement locales n'etaient accessibles QUE via la liste du Pokemon
  // concerne : le fond mega existait pour 26 especes et pour personne d'autre.
  const locaux = TOUS_LES_FONDS.filter((b) => b.url.includes("/event-backgrounds/"));
  controle(
    "Les fonds d'evenement locaux sont accessibles a toute espece",
    locaux.length > 0,
    `${locaux.length} images /event-backgrounds/ dans le pool commun (elles n'y etaient pas du tout avant)`,
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════════
   8. CHERCHER EN FRANCAIS DOIT MARCHER

   Les libelles nomment les Pokemon en anglais, parce qu'ils viennent des noms de fichiers
   du jeu. RyN a cherche « Ethernatos » - qui est le vrai nom francais, pas une faute - et
   n'a rien trouve. L'index ajoute donc le nom francais de tout Pokemon cite.
   ═══════════════════════════════════════════════════════════════════════════════════ */
{
  const index = new Map();
  for (const b of TOUS_LES_FONDS) {
    const plat = sansAccent(b.label);
    const alias = [];
    for (const p of POKEMON) {
      const anglais = sansAccent(p.name.split("-")[0]);
      if (anglais.length >= 4 && plat.includes(anglais)) alias.push(sansAccent(p.frenchName));
    }
    index.set(b.url, `${plat} ${alias.join(" ")}`);
  }
  const cherche = (q) => TOUS_LES_FONDS.filter((b) => index.get(b.url).includes(sansAccent(q)));

  const attendus = ["Ethernatos", "Éthernatos", "eternatus", "mega", "méga"];
  const vides = attendus.filter((q) => cherche(q).length === 0);
  controle(
    "Les recherches de RyN rendent un resultat",
    vides.length === 0,
    vides.length === 0
      ? attendus.map((q) => `${q}:${cherche(q).length}`).join("  ")
      : `sans resultat : ${vides.join(", ")}`,
  );

  // Le fond que RyN voulait, sur le Pokemon ou il le voulait. Kraboss (99) n'a qu'un seul
  // fond confirme : avant l'union, la liste par defaut comptait un element.
  const confirmesKraboss = (FONDS_VALIDES["99"] ?? []).length;
  const ethernatos = cherche("Ethernatos");
  controle(
    "Le fond Ethernatos est atteignable depuis Kraboss",
    ethernatos.length > 0 && confirmesKraboss < TOUS_LES_FONDS.length,
    `Kraboss a ${confirmesKraboss} fond(s) confirme(s), et ${TOUS_LES_FONDS.length} fonds au total sont desormais proposes`,
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════════
   9. LE LIBELLE COLLE A SA DATE

   Le scraper produit « Pokémon GO Tour Kalos28 février et 1er mars 2026 ». Une lettre
   suivie immediatement d'un chiffre n'arrive jamais dans un nom d'evenement reel.
   ═══════════════════════════════════════════════════════════════════════════════════ */
{
  const libelleFond = (l) => l.replace(/(\p{L})(\d)/gu, "$1, $2");
  const colles = TOUS_LES_FONDS.filter((b) => /\p{L}\d/u.test(b.label));
  const restants = colles.filter((b) => /\p{L}\d/u.test(libelleFond(b.label)));
  controle(
    "Aucun libelle de fond ne reste colle a sa date",
    restants.length === 0,
    `${colles.length} libelle(s) recolles, ${restants.length} resistant(s)`,
  );
}

console.log("");
if (echecs.length > 0) {
  console.log(`check-formes-fonds : ${echecs.length} ECHEC(S) - ${echecs.join(", ")}`);
  process.exit(1);
}
console.log("check-formes-fonds : tous les controles passent.");
