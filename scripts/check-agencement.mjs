#!/usr/bin/env node
// Un bloc de mise en page est-il recopie d'un fichier a l'autre ?
//
//   npm run check:agencement
//
// ═══ LA SEULE REGLE D'AGENCEMENT QUI MERITE UN SCRIPT ═══
//
// Steven, le 2026-09-04 : « Toutes les modifs d'affichages doivent etre partagees a la fois
// sur mon espace et sur les pages de dresseurs pour que les interfaces soient unifiees. »
//
// Les autres regles d'agencement (voir channelingChaos/knowledge/processes/
// agencement-interface-web-regles.md) ne sont PAS outillees, et c'est deliberé :
//
//   - « calculer le budget de place avant de choisir la geometrie », « retirer plutot que
//     comprimer » sont des erreurs d'ORDRE DE TRAVAIL. Aucun script ne les attrape;
//   - leurs consequences, elles, sont deja mesurees par check:mobile - debordements, cibles
//     trop petites, texte illisible. Une sonde de plus refarait 80 % de son travail;
//   - chercher `flex-shrink` sur des pastilles produirait des faux positifs, et un faux
//     positif sur trois signalements suffit a faire ignorer une sonde. Verifie le meme jour
//     avec une regle de halo qui accusait `margin: 0 0 4px`.
//
// La duplication, elle, est le seul de ces echecs qui soit SILENCIEUX. Une fonctionnalite
// simplement absente d'un ecran ne produit ni debordement, ni contraste rate, ni cible
// manquee : rien a mesurer. Les sections par region avaient ete ecrites deux fois, et c'est
// pour ca qu'elles manquaient sur « Mon espace » sans qu'aucune sonde ne le dise. Il a fallu
// que Steven le signale.
//
// ═══ COMMENT, ET POURQUOI PAS UN grep ═══
//
// Chercher une chaine precise ne vaudrait que pour le composant du jour. Ce script compare
// les fichiers entre eux et signale toute suite de lignes identiques assez longue pour etre
// un bloc de mise en page recopie plutot qu'une coincidence. Generique, donc valable sur
// n'importe quel projet.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

const RACINE = process.cwd();
const IGNORES = ["node_modules", ".next", ".git", "public", "backups", "data", "docs", "prisma"];

/** Une suite de cette longueur n'est plus une coincidence.
 *
 *  10 et non 5 : cinq lignes identiques arrivent naturellement (une signature de fonction,
 *  une liste de props, un bloc de fermeture). Dix lignes de suite qui se repetent, c'est un
 *  choix de mise en page qu'on a recopie. Le bloc reel de cette session en faisait 80. */
const LONGUEUR_MIN = 10;

/** Les lignes trop banales pour compter dans une suite : elles feraient coller entre elles
 *  des blocs qui n'ont rien a voir. */
function banale(ligne) {
  const t = ligne.trim();
  if (t.length < 8) return true;
  if (/^[)}\]>;,]+$\/?/.test(t)) return true;
  if (t.startsWith("import ") || t.startsWith("export ")) return true;
  if (t.startsWith("//") || t.startsWith("/*") || t.startsWith("*")) return true;
  return false;
}

const fichiers = [];
(function marcher(dossier) {
  for (const nom of readdirSync(dossier)) {
    if (IGNORES.includes(nom)) continue;
    const p = join(dossier, nom);
    if (statSync(p).isDirectory()) marcher(p);
    else if ([".tsx", ".jsx", ".css"].includes(extname(nom))) fichiers.push(p);
  }
})(RACINE);

/* Index : signature d'une fenetre de LONGUEUR_MIN lignes -> ou on l'a vue.
   On glisse une fenetre sur chaque fichier plutot que de comparer les fichiers deux a deux :
   le cout reste lineaire au nombre de lignes, et non quadratique au nombre de fichiers. */
const vues = new Map();
for (const chemin of fichiers) {
  const rel = relative(RACINE, chemin).split("\\").join("/");
  const lignes = readFileSync(chemin, "utf8").split(/\r?\n/).map((l) => l.trim());
  for (let i = 0; i + LONGUEUR_MIN <= lignes.length; i++) {
    const fenetre = lignes.slice(i, i + LONGUEUR_MIN);
    // Une fenetre a moitie banale ne prouve rien.
    if (fenetre.filter((l) => !banale(l)).length < LONGUEUR_MIN - 2) continue;
    const signature = fenetre.join("\n");
    const deja = vues.get(signature);
    if (deja) deja.push({ rel, ligne: i + 1 });
    else vues.set(signature, [{ rel, ligne: i + 1 }]);
  }
}

/* On ne garde qu'un signalement par PAIRE de fichiers : un bloc de 80 lignes recopie produit
   sinon 70 signalements pour un seul probleme, et une sonde qui repete soixante-dix fois la
   meme chose ne se lit pas. */
const parPaire = new Map();
for (const [signature, endroits] of vues) {
  const fichiersConcernes = [...new Set(endroits.map((e) => e.rel))];
  if (fichiersConcernes.length < 2) continue;
  const cle = fichiersConcernes.sort().join(" + ");
  const actuel = parPaire.get(cle);
  const extrait = signature.split("\n").find((l) => !banale(l)) ?? signature.split("\n")[0];
  if (!actuel) parPaire.set(cle, { endroits, extrait, lignes: LONGUEUR_MIN });
  else actuel.lignes += 1;   // fenetres qui se chevauchent : le bloc est plus long
}

/* ═══ UN PLAFOND GELE, PAS UN BLOCAGE ═══

   Au premier passage, cette sonde a trouve TROIS duplications anterieures a la session qui
   l'a ecrite : un gestionnaire de requete recopie, le boilerplate de deux images
   OpenGraph, un objet de styles de formulaire. Aucune n'est urgente.

   Echouer des le premier jour sur du legacy, c'est se faire ignorer au deuxieme passage -
   le defaut que ce depot a deja rencontre trois fois. Le compte est donc gele a la valeur
   CONSTATEE, avec la meme discipline que les plafonds de check:mobile : il ne peut que
   DESCENDRE. Aucune duplication nouvelle ne passe, et les trois anciennes se resorbent
   quand on touchera ces fichiers pour une autre raison.

   Corriger une duplication fait baisser ce plafond d'autant. C'est la seule modification
   autorisee sur ce nombre. */
const PLAFOND_DUPLICATIONS = 3;

const depasse = parPaire.size > PLAFOND_DUPLICATIONS;
const echecs = [];

if (depasse) {
  echecs.push(
    `${parPaire.size} paires de fichiers dupliquees, plafond ${PLAFOND_DUPLICATIONS}.\n`
    + `        Une duplication a ete AJOUTEE. Les anciennes sont tolerees, pas les nouvelles.`,
  );
}

const constats = [];
for (const [paire, info] of parPaire) {
  const message =
    `${info.lignes} lignes identiques dans deux fichiers :\n`
    + `        ${paire}\n`
    + `        ex. « ${info.extrait.slice(0, 70)} »\n`
    + `        Un bloc recopie est une divergence programmee : la prochaine retouche n'ira\n`
    + `        que d'un cote. Extraire en composant partage, qui prend les donnees et une\n`
    + `        fonction de rendu - la mise en page est commune, les capacites restent a\n`
    + `        l'appelant.`;
  // Sous le plafond, on CONSTATE sans faire echouer : les trois duplications heritees
  // restent visibles a chaque passage, sans bloquer un travail qui n'a rien a voir.
  if (depasse) echecs.push(message);
  else constats.push(message);
}

console.log("check:agencement\n");
console.log(`${fichiers.length} fichiers d'interface, suites de ${LONGUEUR_MIN}+ lignes comparees`);
console.log(`${parPaire.size} paire(s) dupliquee(s), plafond ${PLAFOND_DUPLICATIONS}\n`);

if (constats.length > 0) {
  console.log("DUPLICATIONS HERITEES, sous le plafond (a resorber quand on touchera ces fichiers) :");
  for (const x of constats) console.log(`  - ${x}\n`);
}

console.log("CE QUE CETTE SONDE NE COUVRE PAS :");
console.log("  - l'ORDRE DE TRAVAIL. Calculer le budget de place avant de choisir la");
console.log("    geometrie, retirer plutot que comprimer : ce sont les erreurs qui coutent");
console.log("    le plus cher, et aucun script ne les attrape. Elles se lisent AVANT un lot,");
console.log("    dans channelingChaos/knowledge/processes/agencement-interface-web-regles.md.");
console.log("  - les consequences d'un mauvais agencement (debordement, cible trop petite,");
console.log("    texte illisible) : c'est le travail de check:mobile, deja fait.");

if (echecs.length > 0) {
  console.log(`\n[FAIL] ${echecs.length} bloc(s) duplique(s) :\n`);
  for (const x of echecs) console.log(`  - ${x}`);
  process.exit(1);
}
/* Le verdict dit la verite plutot que « tout va bien » : il RESTE trois duplications
   heritees. Annoncer « aucun bloc recopie » alors qu'il y en a trois serait un controle qui
   ment, et un controle qui ment une fois n'est plus cru sur le reste. */
console.log(
  parPaire.size === 0
    ? "\n[OK] Aucun bloc recopie d'un fichier a l'autre."
    : `\n[OK] Aucune duplication AJOUTEE. ${parPaire.size} heritee(s), au plafond, a resorber.`,
);
