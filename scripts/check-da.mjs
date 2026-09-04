#!/usr/bin/env node
// La direction artistique tient-elle ? Calcule, pas juge a l'oeil.
//
//   npm run check:da
//
// ═══ POURQUOI CE SCRIPT EXISTE ═══
//
// Une regle de DA ecrite en prose finit violee ailleurs dans le systeme. « Le jaune ne
// passe pas sur du blanc » est vrai, se lit en trois secondes, et se reintroduit six
// semaines plus tard dans un composant que personne ne relit. Un rapport de contraste se
// calcule; il n'y a rien a juger.
//
// Le site est passe d'un fond quasi noir a du papier clair le 2026-09-04. C'est exactement
// le moment ou toutes les couleurs heritees deviennent fausses d'un coup : #ffd93d en texte
// donnait 11:1 sur du noir et donne 1,4:1 sur du blanc. Sans mesure, la moitie passerait.
//
// ═══ CE QU'IL NE MESURE PAS ═══
//
// La BEAUTE, et la justesse du parti pris. Il dit si les couleurs sont lisibles, si l'or
// reste reserve a la chance et si le langage du plan de reseau est respecte. Il ne dit pas
// si le plan de tram etait la bonne idee.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

const RACINE = process.cwd();
const TOKENS = "app/tokens.css";

/* ────────────────────────────────────────────────────────────────────────────────────────
   Contraste WCAG. Formule officielle, pas une approximation :
   la luminance relative pondere les canaux (0.2126 / 0.7152 / 0.0722) apres linearisation.
   ──────────────────────────────────────────────────────────────────────────────────────── */
function canaux(hex) {
  const h = hex.replace("#", "");
  const plein = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(plein.slice(i, i + 2), 16) / 255);
}
function luminance(hex) {
  const [r, v, b] = canaux(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * v + 0.0722 * b;
}
function contraste(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/* ──────────────────────────────────────────────────────────────────────────────────────── */

const echecs = [];
const source = readFileSync(join(RACINE, TOKENS), "utf8");

/** Les tokens declares, resolus : `--teal: var(--ligne-cherche)` suit l'alias. */
const brut = {};
for (const [, nom, val] of source.matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/gim)) {
  brut[nom] = val.trim();
}
function resoudre(nom, profondeur = 0) {
  const v = brut[nom];
  if (v === undefined || profondeur > 8) return null;
  const alias = v.match(/^var\((--[a-z0-9-]+)\)$/);
  if (alias) return resoudre(alias[1], profondeur + 1);
  return /^#[0-9a-f]{3,6}$/i.test(v) ? v : null;
}
const couleurs = {};
for (const nom of Object.keys(brut)) {
  const v = resoudre(nom);
  if (v) couleurs[nom] = v;
}

// ── Regle 1 : chaque couleur de texte lit sur son fond ─────────────────────────────────
//
// AA demande 4,5:1 pour du texte courant et 3:1 pour les elements d'interface et le gros
// texte. On declare ici les paires REELLEMENT utilisees dans l'interface, parce qu'un
// produit cartesien de tous les tokens produirait des dizaines de paires qui n'existent
// nulle part et noierait les vraies dans le bruit.
const PAIRES = [
  // [texte, fond, seuil, ce que c'est]
  ["--encre", "--papier", 4.5, "texte principal sur la page"],
  ["--encre", "--surface", 4.5, "texte principal sur une carte"],
  ["--encre-douce", "--papier", 4.5, "texte secondaire"],
  ["--encre-douce", "--surface", 4.5, "texte secondaire sur carte"],
  ["--encre-tres-douce", "--surface", 4.5, "mentions et horodatages"],
  ["--ligne-miroir", "--surface", 4.5, "libelle de la ligne miroir"],
  ["--ligne-cherche", "--surface", 4.5, "libelle de la ligne recherche"],
  ["--ligne-donne", "--surface", 4.5, "libelle de la ligne donne"],
  ["--ligne-miroir", "--miroir-pale", 4.5, "pastille miroir"],
  ["--ligne-cherche", "--cherche-pale", 4.5, "pastille recherche"],
  ["--ligne-donne", "--donne-pale", 4.5, "pastille donne"],
  ["--or-encre", "--or", 4.5, "texte pose sur l'or"],
  ["--encre", "--or-pale", 4.5, "texte sur l'or pale"],
  ["--alerte", "--surface", 4.5, "message d'alerte"],
  ["--alerte", "--alerte-pale", 4.5, "pastille d'alerte"],
  ["--bon", "--surface", 4.5, "message de validation"],
  ["--bon", "--bon-pale", 4.5, "pastille de validation"],
  ["--medaille-or", "--surface", 4.5, "medaille or"],
  ["--medaille-argent", "--surface", 4.5, "medaille argent"],
  ["--medaille-bronze", "--surface", 4.5, "medaille bronze"],
  ["--tag-saison", "--surface", 4.5, "etiquette saison"],
  ["--tag-fete", "--surface", 4.5, "etiquette fete"],
  ["--tag-max", "--surface", 4.5, "etiquette max"],
  ["--tag-costume", "--surface", 4.5, "etiquette costume"],
  ["--tag-fond", "--surface", 4.5, "etiquette fond"],
  ["--tag-neutre", "--surface", 4.5, "etiquette neutre"],
  ["--male", "--surface", 4.5, "badge male"],
  ["--femelle", "--surface", 4.5, "badge femelle"],
  ["--trait", "--papier", 3.0, "trait structurel"],
  ["--trait-leger", "--surface", 1.2, "separation mineure"],
  ["--surface-creuse", "--surface", 1.05, "champ creux sur carte"],
];

for (const [avant, arriere, seuil, quoi] of PAIRES) {
  const a = couleurs[avant];
  const b = couleurs[arriere];
  if (!a || !b) {
    echecs.push(`token manquant ou non resolu dans « ${quoi} » : ${!a ? avant : arriere}.`);
    continue;
  }
  const r = contraste(a, b);
  if (r < seuil) {
    echecs.push(
      `contraste insuffisant, ${quoi} : ${r.toFixed(2)}:1, minimum ${seuil}:1.\n`
      + `        ${avant} ${a} sur ${arriere} ${b}.`,
    );
  }
}

/* ────────────────────────────────────────────────────────────────────────────────────────
   Le balayage des fichiers, partage par les regles 2 a 4.
   ──────────────────────────────────────────────────────────────────────────────────────── */

/** ParticleBackground peint dans un canvas : `var()` n'y existe pas, il lit les tokens en
 *  JavaScript. C'est la SEULE exception, nommee ici pour qu'elle reste une exception et
 *  pas une porte ouverte. */
const CANVAS = ["components/ParticleBackground.tsx"];
const IGNORES = ["node_modules", ".next", ".git", "public", "backups", "data", "docs", "scripts"];

/**
 * Le code, sans les commentaires.
 *
 * Sans ca, la sonde echouait sur sa propre documentation : `tram.css` explique en prose
 * que « #ffd700 comptait 190 usages », et cette phrase etait comptee comme une couleur en
 * dur. Un controle qui reproche a un commentaire d'expliquer le controle finit desactive,
 * et c'est la panne que tout ce depot cherche a eviter.
 *
 * Les `//` ne sont retires qu'en debut de ligne : `https://` vit au milieu des chaines.
 */
function sansCommentaires(texte) {
  return texte
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const fichiers = [];
(function marcher(dossier) {
  for (const nom of readdirSync(dossier)) {
    if (IGNORES.includes(nom)) continue;
    const p = join(dossier, nom);
    if (statSync(p).isDirectory()) marcher(p);
    else if ([".ts", ".tsx", ".css"].includes(extname(nom))) fichiers.push(p);
  }
})(RACINE);

// ── Regle 2 : aucune couleur en dur hors du fichier de tokens ──────────────────────────
//
// C'est la regle qui fait tenir toutes les autres. Tant qu'un composant peut ecrire
// #ffd700 dans un style en ligne, le calcul de contraste ci-dessus ne mesure qu'une
// intention, pas ce qui s'affiche.
const enDur = [];
for (const f of fichiers) {
  const rel = relative(RACINE, f).split("\\").join("/");
  if (rel === TOKENS || CANVAS.includes(rel)) continue;
  const s = sansCommentaires(readFileSync(f, "utf8"));
  let n = 0;
  for (const [ligne] of s.split("\n").entries()) void ligne;
  s.split("\n").forEach((texte, i) => {
    const hex = texte.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    const rgb = texte.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/g) || [];
    if (hex.length + rgb.length > 0) {
      n += hex.length + rgb.length;
      if (enDur.length < 6) enDur.push(`${rel}:${i + 1}  ${(hex[0] || rgb[0])}`);
    }
  });
  if (n > 0) enDur.total = (enDur.total || 0) + n;
}
if ((enDur.total || 0) > 0) {
  echecs.push(
    `${enDur.total} couleur(s) en dur hors de ${TOKENS} :\n`
    + enDur.map((x) => `          ${x}`).join("\n")
    + `\n        Chacune echappe au calcul de contraste ci-dessus.`,
  );
}

// ── Regle 3 : l'or ne parle que de chance ──────────────────────────────────────────────
//
// #ffd700 comptait 182 usages : la couleur de tout, donc la couleur de rien. Le token --or
// n'a le droit d'apparaitre que la ou il veut dire shiny, medaille ou chance. On compte ses
// usages plutot que d'inspecter leur intention, qu'un script ne peut pas lire : au-dela
// d'un plafond, il a recommence a servir de couleur d'accent generique.
const PLAFOND_OR = 24;
let usagesOr = 0;
for (const f of fichiers) {
  const rel = relative(RACINE, f).split("\\").join("/");
  if (rel === TOKENS) continue;
  usagesOr += (readFileSync(f, "utf8").match(/var\(--or[a-z-]*\)/g) || []).length;
}
if (usagesOr > PLAFOND_OR) {
  echecs.push(
    `l'or est utilise ${usagesOr} fois, plafond ${PLAFOND_OR}.\n`
    + `        Il ne doit dire qu'une chose : shiny, medaille, chance. Au-dela il redevient\n`
    + `        une couleur d'accent generique, et ne signale plus rien.`,
  );
}

// ── Regle 4 : un plan de reseau n'a ni ombre ni halo ───────────────────────────────────
//
// L'ancienne DA hierarchisait par la lueur : glow, backdrop-filter, ombres colorees. Le
// plan de tram hierarchise par l'epaisseur du trait. Laisser les deux cohabiter donnerait
// ni l'un ni l'autre.
//
// `box-shadow: inset` est autorise : c'est le lisere plein qui marque l'onglet actif, pas
// une ombre portee.
const INTERDITS = [
  [/backdrop-filter\s*:/gi, "backdrop-filter", "le verre depoli appartient a l'ancienne DA"],
  [/text-shadow\s*:(?!\s*none)/gi, "text-shadow", "un plan de reseau n'a pas de texte lumineux"],
  [/textShadow\s*:\s*["'](?!none)/g, "textShadow", "un plan de reseau n'a pas de texte lumineux"],
  /* ═══ LA FORME D'UN HALO, PAS LE NOM DE SA PROPRIETE ═══

     Trois halos avaient survecu au nettoyage parce qu'ils ne s'appelaient ni box-shadow ni
     boxShadow : `getPriorityStyle` renvoyait un champ nomme `shadow`, applique plus loin.
     Chercher les noms de propriete ratait donc exactement les cas les moins visibles.

     Un halo se reconnait a sa forme : deux decalages nuls, un flou, puis une COULEUR.
     `0 0 12px rgba(...)` est toujours une lueur, quel que soit le nom de la variable qui
     la transporte. Une vraie ombre portee, elle, a un decalage.

     Premiere version : elle cherchait `0 0 Npx` sans exiger la couleur, et signalait
     `margin: "0 0 4px"` - un raccourci de marge a exactement la meme forme. Deux faux
     positifs sur trois signalements, ce qui est le debut d'une sonde qu'on ignore. */
  [/0\s+0\s+\d+px\s+(?:var\(|color-mix|rgba?\(|#)/g, "valeur en forme de halo",
    "une lueur, quel que soit le nom de la propriete qui la porte"],
];
for (const f of fichiers) {
  const rel = relative(RACINE, f).split("\\").join("/");
  if (rel === TOKENS) continue;
  const s = sansCommentaires(readFileSync(f, "utf8"));
  for (const [motif, nom, pourquoi] of INTERDITS) {
    const n = (s.match(motif) || []).length;
    if (n > 0) echecs.push(`${rel} : ${n} ${nom}. ${pourquoi}.`);
  }
}

/* ──────────────────────────────────────────────────────────────────────────────────────── */

console.log("check:da\n");
console.log(`${Object.keys(couleurs).length} tokens de couleur, ${PAIRES.length} paires verifiees\n`);
console.log("PAIRE                                          RATIO   MIN");
for (const [avant, arriere, seuil, quoi] of PAIRES) {
  const a = couleurs[avant]; const b = couleurs[arriere];
  const r = a && b ? contraste(a, b) : 0;
  const etat = r >= seuil ? " " : "!";
  console.log(`${etat} ${quoi.padEnd(44)} ${r.toFixed(2).padStart(5)}  ${String(seuil).padStart(4)}`);
}

console.log("\nCE QUE CETTE SONDE NE COUVRE PAS :");
console.log("  - la BEAUTE, et la justesse du parti pris. Elle dit si les couleurs sont");
console.log("    lisibles et si l'or reste reserve a la chance; pas si le plan de tram");
console.log("    etait la bonne idee. Ce jugement reste celui de Steven.");
console.log("  - le contraste des IMAGES. Un sprite clair sur une carte blanche n'est pas");
console.log("    mesure ici : ces valeurs ne concernent que les couleurs declarees.");

if (echecs.length > 0) {
  console.log(`\n[FAIL] ${echecs.length} probleme(s) :\n`);
  for (const x of echecs) console.log(`  - ${x}`);
  process.exit(1);
}
console.log("\n[OK] Contrastes tenus, or reserve a la chance, aucune couleur en dur.");
