#!/usr/bin/env node
// Le site est-il utilisable au pouce ? Mesuré, pas estimé.
//
//   npm run build && npx next start -p 3002
//   npm run check:mobile
//
// ═══ POURQUOI CE BANC EXISTE ═══
//
// Steven, le 2026-09-04 : rendre le site meilleur sur mobile surtout. Avant d'y toucher,
// il fallait savoir de quoi on partait, et les chiffres etaient sans appel : du texte a
// 8,32px dans des cibles de 22px sur la navigation de TOUTES les pages, 1 008 textes sous
// 12px sur « Pas encore disponibles », et cette page haute de 43 166px - cinquante ecrans
// de telephone.
//
// Sans ce banc, « c'est mieux » resterait invérifiable : ni par Steven, ni par moi le
// lendemain. Avec lui, chaque lot du plan (docs/plan-refonte-ui-2026-09.md) annonce un
// objectif chiffre et on sait s'il est atteint.
//
// ═══ CE QU'IL MESURE, ET POURQUOI CES QUATRE CHOSES ═══
//
//   cibles tactiles    Sous 44px, un doigt rate. Ce n'est pas un gout, c'est la taille
//                      moyenne d'une pulpe de pouce.
//   plancher de texte  Sous 12px, on ne lit pas un libellé sur un telephone tenu a bout de
//                      bras. La navigation etait a 8,32px.
//   debordement        Une barre qui defile horizontalement sans le dire cache son dernier
//                      onglet. `scrollWidth` ne le voit pas : on mesure donc aussi les
//                      elements qui sortent de leur conteneur DEFILANT.
//   contenu recouvert  Les particules decoratives passaient par-dessus le texte. Un halo
//                      sur un sous-titre est de la lisibilite perdue, pas un parti pris.
//
// ═══ CE QU'IL NE MESURE PAS, ET IL FAUT LE DIRE ═══
//
// La BEAUTE. Aucun script ne dit si une page est belle; celui-ci dit si elle est lisible,
// atteignable et contenue. Le jugement sur le rendu reste celui de Steven.
//
// Et un VRAI telephone. Chrome pilote a 375px n'est pas iOS Safari : ni le rendu des
// polices, ni le defilement inertiel, ni les unites de viewport avec la barre du
// navigateur ne sont eprouves ici.

import { chromium } from "playwright-core";

const CHROME = String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const BASE = process.env.CHECK_URL ?? "http://localhost:3002";

/** Les six pages du site. TOUTES, pas un echantillon : la navigation est partagee, donc
 *  un defaut sur elle se compte six fois - et c'est exactement ce qui le rend prioritaire. */
const PAGES = ["/", "/dresseurs", "/evenements", "/fonctionnalites", "/mon-espace", "/pas-encore-sortis"];

/** 375px est l'iPhone SE, le plus petit ecran encore courant : ce qui passe la y passe
 *  partout. 768px attrape la tablette, ou beaucoup de sites cassent entre deux regles.
 *  1440px est le laptop de reference. */
const LARGEURS = [375, 768, 1440];

/**
 * ═══ LE PROFIL A ENCOCHE, ET POURQUOI IL A FALLU L'AJOUTER ═══
 *
 * Chrome pilote rend `env(safe-area-inset-bottom)` a 0px : il n'a pas d'encoche. Tous les
 * iPhone depuis le X en ont une, et la barre de gestes du systeme mange environ 34px de
 * plus en bas de l'ecran.
 *
 * Ce n'est pas un detail cosmetique, c'est une geometrie differente. Le 2026-09-04, Steven
 * a photographie le bouton « +Ajouter un Pokemon » passant derriere la barre d'onglets sur
 * son telephone, alors que ce banc etait vert : a zone sure nulle la barre fait 57px et le
 * bouton passait 7px au-dessus; a 34px elle en fait 91 et le bouton tombe 27px dedans.
 *
 * Mesurer uniquement a zone sure nulle, c'est donc tester la minorite des telephones. Le
 * profil ci-dessous rejoue 375px avec l'encoche simulee, en surchargeant exactement ce que
 * le systeme surcharge.
 *
 * La simulation reste une simulation : elle reproduit la geometrie, pas iOS Safari.
 */
const ENCOCHE_PX = 34;

/** Les configurations mesurees : trois largeurs, plus 375px avec encoche. */
const PROFILS = [
  ...LARGEURS.map((largeur) => ({ largeur, encoche: 0, nom: `${largeur}` })),
  { largeur: 375, encoche: ENCOCHE_PX, nom: "375+enc" },
];

/** Planchers. Ce sont des PLANCHERS et non des cibles : on ne les ajuste pas pour faire
 *  passer un lot. Si un lot demande de les baisser, c'est le lot qui est faux. */
const CIBLE_MIN_PX = 44;
const TEXTE_MIN_PX = 12;

/** Hauteurs au-dela desquelles une page cesse d'etre parcourable au pouce, par largeur.
 *  Gelees a la valeur constatee APRES chaque lot, et jamais relevees - meme discipline que
 *  les plafonds de dette : relever un plafond desactive le controle en lui laissant l'air
 *  d'un controle. */
const HAUTEUR_MAX = {
  // ═══ GELES A LA VALEUR ATTEINTE LE 2026-09-04, PAS A UNE AMBITION ═══
  //
  // Les valeurs de depart etaient mes ESTIMATIONS avant travail (3 400 pour /dresseurs,
  // 8 000 pour /evenements). Deux sont restees hors d'atteinte de peu - 3 864 et 8 040 -
  // et les relever a un chiffre rond serait exactement le geste que ce fichier interdit
  // ailleurs : desactiver un controle en lui laissant l'air d'un controle.
  //
  // Ils sont donc geles a ce qui est MESURE aujourd'hui, avec 2 % de marge pour absorber
  // une ligne de donnee de plus en production. Ils ne peuvent que descendre : corriger un
  // ecran fait baisser son plafond d'autant.
  //
  // Rappel des valeurs AVANT cette passe, pour mesurer le chemin parcouru :
  //   /                    1 549  ->  1 651   (+102 : le pied est passe dans le flux)
  //   /dresseurs           6 725  ->  3 864   (-43 %)  [passe au budget par carte]
  //   /evenements         13 759  ->  8 040   (-42 %)  [passe au budget par carte]
  //   /fonctionnalites     3 926  ->  4 090   (+164 : idem, le pied)
  //   /mon-espace            948  ->    960
  //   /pas-encore-sortis  43 166  ->  1 115   (-97 %)
  /* ═══ L'ACCUEIL N'A PLUS DE PLAFOND, ET C'EST UN AVEU ═══

     Il en a eu deux : 1 700, gele sur une page d'accueil qui n'etait qu'un placeholder,
     puis 2 500 quand elle est devenue une vraie landing. En relevant le second j'ai ecrit
     qu'il ne pourrait plus que descendre. Une section de plus, demandee par Steven, et il
     etait de nouveau depasse.

     Deux echecs de suite sur la meme page ne disent pas que la page a tort : ils disent que
     la REGLE est mal appliquee a celle-la. Un plafond absolu a du sens quand la brievete
     d'une page est un acquis qu'on protege - « Pas encore disponibles » est passee de
     43 166px a 1 100px, et ce chiffre-la doit etre defendu. La longueur d'une landing, elle,
     est un choix editorial : elle grandit chaque fois qu'on a une chose vraie de plus a
     dire, et un plafond qui vire au rouge a chaque section ajoutee serait ignore au
     troisieme passage.

     Ce qu'on veut vraiment tenir sur une landing n'est pas sa longueur totale, c'est que la
     proposition de valeur et le bouton principal soient lisibles SANS DEFILER. C'est
     mesurable, ca ne bouge pas quand on ajoute une section en bas, et c'est verifie plus
     bas par la regle « au-dessus de la ligne de flottaison ».

     Meme raisonnement que pour /evenements, passee du plafond absolu au budget par carte. */
  "/fonctionnalites": 4200,
  "/mon-espace": 1000,
  "/pas-encore-sortis": 1200,
};

// ═══ LES PAGES QUI GRANDISSENT AVEC LES DONNEES NE SE JUGENT PAS EN PIXELS ABSOLUS ═══
//
// Constate le 2026-09-04 en poussant en production : le rebase a ramene 22 commits du cron
// (backup quotidien, refresh evenements), /evenements est passe de 8 040 a 8 898px et la
// sonde est passee au rouge. Aucune regression : le flux avait simplement gagne des
// evenements.
//
// Un plafond en pixels absolus sur une page nourrie par un cron quotidien vire au rouge
// tous les quelques jours pour une raison qui n'est pas un defaut. Et une sonde qui crie au
// loup finit par etre ignoree - c'est la meme panne que la sonde muette, par l'autre bout :
// dans les deux cas elle cesse de dire quoi que ce soit.
//
// Ce qu'on veut vraiment tenir n'est pas la longueur de la page, c'est le cout d'UNE carte.
// Ce budget-la ne bouge pas quand le flux grossit, et il attrape la vraie regression : une
// carte qui grandit. La longueur totale reste affichee, sans etre un critere.
//
// On mesure la GRILLE, pas le document. Diviser la hauteur de la page par le nombre de
// cartes ferait entrer l'en-tete et le pied - environ 400px constants - dans le cout d'une
// carte : a 60 cartes ils pesent 7px chacune, mais un jour creux a 10 evenements ils en
// pesent 40, et la sonde virerait au rouge alors que rien n'a bouge. La hauteur de la
// grille divisee par ses enfants ne depend que des cartes.
//
// Budgets releves le 2026-09-04 sur la grille seule, arrondis au-dessus avec ~8 % de marge
// pour absorber une carte a titre long. Comme les plafonds, ils ne peuvent que descendre.
const COUT_PAR_ELEMENT = {
  "/evenements": { grille: ".event-grid", budget: 140 },   // mesure 131px le 2026-09-04
  "/dresseurs": { grille: ".trainer-grid", budget: 58 },    // mesure 53px le 2026-09-04
};

const echecs = [];
const tableau = [];

const nav = await chromium.launch({ executablePath: CHROME, headless: true });
const contexte = await nav.newContext();
const page = await contexte.newPage();
const erreursJs = [];
page.on("pageerror", (e) => erreursJs.push(String(e).slice(0, 100)));

for (const profil of PROFILS) {
  const { largeur, encoche, nom: nomProfil } = profil;
  for (const chemin of PAGES) {
    await page.setViewportSize({ width: largeur, height: 900 });
    try {
      await page.goto(BASE + chemin, { waitUntil: "load", timeout: 45_000 });
    } catch {
      echecs.push(`${chemin}@${nomProfil} : la page n'a pas charge. Le serveur tourne-t-il sur ${BASE} ?`);
      continue;
    }
    // On surcharge exactement ce que le systeme surcharge sur un telephone a encoche :
    // la zone sure ajoutee sous la barre d'onglets, et la place que le reste de la page
    // doit lui reserver. Injecte APRES le chargement, donc avant toute mesure.
    if (encoche > 0) {
      await page.addStyleTag({
        content: `
          .mobile-tabs { padding-bottom: ${encoche}px !important; }
          :root { --bas-occupe: calc(var(--tabs-height) + ${encoche}px) !important; }
          body { padding-bottom: calc(var(--tabs-height) + ${encoche}px) !important; }
        `,
      });
    }

    // ═══ LE TEMOIN : COMMENT SAVOIR QUE LA REGLE « DERRIERE LA BARRE » TIRE ═══
    //
    // Le bouton « +Ajouter un Pokemon » n'existe qu'une fois connecte et apres defilement.
    // Ce banc visite les pages en anonyme, donc il ne le rencontrera jamais : sa regle
    // pourrait etre cassee sans que rien ne vire au rouge, ce qui est precisement la panne
    // que ce projet cherche a eviter partout ailleurs.
    //
    //   CHECK_TEMOIN=1 npm run check:mobile
    //
    // injecte un bouton fixe avec l'ANCIENNE geometrie, celle qui a produit la capture de
    // Steven. Le banc DOIT alors echouer sur le profil 375+enc. S'il reste vert, la regle
    // ne mesure plus rien et c'est elle qu'il faut reparer.
    if (process.env.CHECK_TEMOIN === "1") {
      await page.evaluate(() => {
        const b = document.createElement("button");
        b.textContent = "temoin +Ajouter un Pokemon";
        b.style.cssText = "position:fixed;right:20px;z-index:150;bottom:calc(var(--footer-height) + 16px)";
        document.body.appendChild(b);
      });
    }

    // Les particules et les listes montent apres le premier rendu.
    await page.waitForTimeout(1800);

    const m = await page.evaluate(({ cibleMin, texteMin, selecteurGrille }) => {
      const vw = window.innerWidth;

      // ── Cibles tactiles ──
      const cibles = [];
      for (const el of document.querySelectorAll("button, a, input, select, textarea, [role=button], [role=tab]")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;              // invisible, pas cliquable
        if (getComputedStyle(el).visibility === "hidden") continue;
        // ═══ UNE TOLERANCE D'UN DEMI-PIXEL, ET DES VALEURS NON ARRONDIES ═══
        //
        // Premiere version : un champ de recherche haut de 43,98px etait signale, et le
        // message affichait « 343x44px » apres arrondi - donc un reproche qui se
        // contredisait lui-meme, puisque 44 n'est pas sous 44. Un controle qui dit une
        // chose absurde perd sa credibilite sur tout le reste de sa liste.
        //
        // Un demi-pixel de tolerance : 43,98px n'est pas un defaut tactile, c'est un
        // arrondi de mise en page. Et les valeurs affichees gardent une decimale, pour
        // qu'on puisse toujours verifier le reproche.
        if (r.height < cibleMin - 0.5 || r.width < cibleMin - 0.5) {
          cibles.push({
            w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
            t: (el.textContent || el.getAttribute("aria-label") || el.getAttribute("placeholder") || "").trim().slice(0, 30),
          });
        }
      }

      // ── Plancher de texte ──
      //
      // Seuls les elements FEUILLES portant du texte : compter un conteneur reviendrait a
      // compter le meme texte plusieurs fois et gonflerait le chiffre sans rien dire.
      const petits = [];
      for (const el of document.querySelectorAll("*")) {
        if (el.children.length > 0) continue;
        const txt = (el.textContent || "").trim();
        if (txt.length < 2) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs > 0 && fs < texteMin) petits.push({ fs: Math.round(fs * 100) / 100, t: txt.slice(0, 30) });
      }

      // ── Debordement, y compris DANS un conteneur defilant ──
      //
      // `scrollWidth` du document ne voyait rien alors que le dernier onglet de la
      // navigation etait hors ecran : il vit dans une barre en `overflow-x: auto`, donc le
      // document est content. On mesure donc les deux.
      const debordDocument = Math.max(0, document.documentElement.scrollWidth - vw);
      const cachesDansBarre = [];
      for (const conteneur of document.querySelectorAll("*")) {
        const st = getComputedStyle(conteneur);
        if (!/auto|scroll/.test(st.overflowX)) continue;
        if (conteneur.scrollWidth <= conteneur.clientWidth + 1) continue;
        for (const enfant of conteneur.children) {
          const rc = conteneur.getBoundingClientRect();
          const re = enfant.getBoundingClientRect();
          if (re.width > 0 && re.right > rc.right + 1) {
            cachesDansBarre.push({
              t: (enfant.textContent || "").trim().slice(0, 30),
              d: Math.round(re.right - rc.right),
            });
          }
        }
      }

      // ── Contenu recouvert par un element qui n'aurait pas du ──
      //
      // On prend le point CENTRAL d'un texte et on demande qui est dessus. Si ce n'est ni
      // lui ni un de ses parents, quelque chose passe devant.
      //
      // ═══ DEUX CORRECTIONS APPORTEES LE JOUR MEME, ET IL FAUT LES DIRE ═══
      //
      // 1. LES BARRES FIXES SONT IGNOREES. Premiere version : elle signalait du contenu
      //    passant sous le pied de page en `position: fixed`, ce qui est le comportement
      //    NORMAL d'une barre fixe pendant un defilement. Un faux positif se fait
      //    desactiver plus vite qu'il ne se corrige, et il emporte les vrais avec lui.
      //
      // 2. CE QUE CETTE REGLE NE PEUT PAS VOIR. `elementFromPoint` ignore tout element en
      //    `pointer-events: none` - c'est-a-dire precisement le cas d'un calque decoratif.
      //    J'avais ecrit cette regle POUR attraper des particules passant sur le texte, et
      //    elle en est structurellement incapable.
      //
      //    Verification faite autrement, en lisant le code : ParticleBackground est en
      //    `fixed inset-0 pointer-events-none z-0`, donc derriere le contenu et non
      //    cliquable. Mon soupcon de depart etait FAUX, et un lot entier du plan a ete
      //    retire grace a cette verification.
      const recouverts = [];
      const textes = [...document.querySelectorAll("h1, h2, h3, p, span, label, td, th")]
        .filter((el) => el.children.length === 0 && (el.textContent || "").trim().length > 3);
      for (const el of textes.slice(0, 220)) {          // borne : 1 000 tests figeraient la page
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) continue;
        if (r.bottom < 0 || r.top > window.innerHeight) continue;   // hors ecran, non juge
        const dessus = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (!dessus) continue;
        if (dessus === el || el.contains(dessus) || dessus.contains(el)) continue;
        // Une barre fixe ou collante au-dessus du contenu qui defile n'est pas un defaut :
        // c'est ce qu'on lui demande. On remonte ses parents, l'element trouve etant
        // souvent un enfant de la barre.
        let fixe = false;
        for (let n = dessus; n && n !== document.body; n = n.parentElement) {
          if (/fixed|sticky/.test(getComputedStyle(n).position)) { fixe = true; break; }
        }
        if (fixe) continue;
        recouverts.push({
          t: (el.textContent || "").trim().slice(0, 30),
          par: dessus.tagName.toLowerCase() + (dessus.className ? "." + String(dessus.className).split(" ")[0] : ""),
        });
      }

      // ═══ AU-DESSUS DE LA LIGNE DE FLOTTAISON ═══
      //
      // Remplace le plafond de hauteur de l'accueil, qui a echoue deux fois de suite parce
      // qu'il mesurait la mauvaise chose (voir HAUTEUR_MAX). Ce qui compte sur une landing
      // n'est pas sa longueur mais ce qu'on voit sans defiler : le titre qui dit ce que
      // c'est, et le bouton qui permet d'agir. Une landing peut s'allonger autant qu'elle a
      // de choses vraies a dire; elle ne peut pas cacher son titre.
      const h1 = document.querySelector("h1");
      const actionPrincipale = document.querySelector(".btn-primary");
      const flottaison = {
        h1: h1 ? Math.round(h1.getBoundingClientRect().bottom) : null,
        action: actionPrincipale ? Math.round(actionPrincipale.getBoundingClientRect().bottom) : null,
        ecran: window.innerHeight,
      };

      // ═══ UN BOUTON FIXE DERRIERE LA BARRE D'ONGLETS ═══
      //
      // La regle « contenu recouvert » ci-dessus ignore volontairement ce qui est masque
      // par une barre fixe ou collante : du contenu qui defile SOUS une barre, c'est ce
      // qu'on demande a la barre. Ce raisonnement est juste pour du contenu dans le flux,
      // et faux pour un element lui-meme FIXE : celui-la est cense rester visible en
      // permanence, il ne defile jamais hors de la barre, il est perdu pour de bon.
      //
      // Signale par Steven sur un vrai telephone le 2026-09-04, capture a l'appui : le
      // bouton « +Ajouter un Pokemon » se calait sur --footer-height, une hauteur qui
      // n'existe plus en bas d'ecran depuis que le pied est repasse dans le flux. Il
      // passait donc derriere les onglets. Mon banc etait vert : c'est exactement l'angle
      // mort que cette regle ferme.
      //
      // Inerte au-dessus de 640px, ou la barre d'onglets est en display:none et n'a donc
      // aucune surface.
      const sousLaBarre = [];
      const barre = document.querySelector(".mobile-tabs");
      const rBarre = barre ? barre.getBoundingClientRect() : null;
      if (rBarre && rBarre.height > 0) {
        for (const el of document.querySelectorAll("button, a, input, select, [role=button]")) {
          if (barre.contains(el)) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (getComputedStyle(el).visibility === "hidden") continue;
          // Seuls les elements FIXES sont juges : un element du flux qui croise la barre
          // est simplement du contenu qu'on n'a pas encore fait defiler.
          let ancre = false;
          for (let n = el; n && n !== document.body; n = n.parentElement) {
            if (/fixed|sticky/.test(getComputedStyle(n).position)) { ancre = true; break; }
          }
          if (!ancre) continue;
          const chevauche = r.bottom > rBarre.top && r.top < rBarre.bottom;
          if (chevauche) {
            sousLaBarre.push({
              t: (el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 34),
              bas: Math.round(r.bottom),
              hautBarre: Math.round(rBarre.top),
            });
          }
        }
      }

      return {
        cibles, petits, debordDocument, cachesDansBarre, recouverts, sousLaBarre,
        flottaison,
        hauteur: document.documentElement.scrollHeight,
        // La page peut porter PLUSIEURS grilles de la meme classe (/dresseurs en a deux,
        // les actifs et les autres). On somme les hauteurs et les enfants des deux : le
        // cout moyen d'une carte est le meme des deux cotes, et n'en mesurer qu'une
        // laisserait la seconde sans surveillance.
        grille: (() => {
          if (!selecteurGrille) return null;
          const g = [...document.querySelectorAll(selecteurGrille)];
          if (g.length === 0) return { hauteur: 0, items: 0 };
          return {
            hauteur: Math.round(g.reduce((s, e) => s + e.getBoundingClientRect().height, 0)),
            items: g.reduce((s, e) => s + e.children.length, 0),
          };
        })(),
      };
    }, {
      cibleMin: CIBLE_MIN_PX,
      texteMin: TEXTE_MIN_PX,
      selecteurGrille: COUT_PAR_ELEMENT[chemin]?.grille || null,
    });

    tableau.push({ largeur, nomProfil, chemin, ...m });

    const ou = `${chemin}@${nomProfil}`;
    if (m.debordDocument > 0) {
      echecs.push(`${ou} : le document deborde de ${m.debordDocument}px.`);
    }
    for (const c of m.cachesDansBarre.slice(0, 3)) {
      echecs.push(
        `${ou} : « ${c.t} » sort de sa barre defilante de ${c.d}px.\n`
        + `        Un lien qu'il faut deviner puis faire defiler n'est pas atteignable.`,
      );
    }
    if (m.cibles.length > 0) {
      const pire = m.cibles.sort((a, b) => a.w * a.h - b.w * b.h)[0];
      echecs.push(
        `${ou} : ${m.cibles.length} cible(s) sous ${CIBLE_MIN_PX}px, la pire ${pire.w}x${pire.h}px (« ${pire.t} »).`,
      );
    }
    if (m.petits.length > 0) {
      const pire = m.petits.sort((a, b) => a.fs - b.fs)[0];
      echecs.push(
        `${ou} : ${m.petits.length} texte(s) sous ${TEXTE_MIN_PX}px, le pire a ${pire.fs}px (« ${pire.t} »).`,
      );
    }
    if (m.recouverts.length > 0) {
      const x = m.recouverts[0];
      echecs.push(
        `${ou} : ${m.recouverts.length} texte(s) recouvert(s), ex. « ${x.t} » par <${x.par}>.`,
      );
    }
    for (const b of (m.sousLaBarre || []).slice(0, 3)) {
      echecs.push(
        `${ou} : « ${b.t} » est fixe et passe derriere la barre d'onglets.\n`
        + `        Son bas est a ${b.bas}px, la barre commence a ${b.hautBarre}px.\n`
        + `        Un element fixe ne defile jamais hors de la barre : il est perdu.`,
      );
    }
    const plafond = HAUTEUR_MAX[chemin];
    if (largeur === 375 && encoche === 0 && plafond && m.hauteur > plafond) {
      echecs.push(
        `${ou} : ${m.hauteur}px de haut, plafond ${plafond}px.\n`
        + `        ${Math.round(m.hauteur / 900)} ecrans de telephone a parcourir.`,
      );
    }
    // La ligne de flottaison ne concerne que la landing : c'est la seule page dont le
    // travail est de convaincre quelqu'un qui ne connait pas encore le site.
    if (chemin === "/" && encoche === 0 && m.flottaison) {
      const { h1, action, ecran } = m.flottaison;
      if (h1 === null) {
        echecs.push(`${ou} : aucun h1 sur la landing. Un visiteur ne sait pas ce qu'il regarde.`);
      } else if (h1 > ecran) {
        echecs.push(
          `${ou} : le titre finit a ${h1}px, sous la ligne de flottaison (${ecran}px).\n`
          + `        La proposition de valeur doit se lire sans defiler.`,
        );
      }
      if (action === null) {
        echecs.push(`${ou} : aucun bouton principal (.btn-primary) sur la landing.`);
      } else if (action > ecran) {
        echecs.push(
          `${ou} : le bouton principal finit a ${action}px, sous la ligne de flottaison (${ecran}px).\n`
          + `        Un visiteur doit pouvoir agir sans chercher.`,
        );
      }
    }

    const parItem = COUT_PAR_ELEMENT[chemin];
    if (largeur === 375 && encoche === 0 && parItem) {
      // Zero element trouve = soit la page est vide, soit le selecteur ne correspond plus a
      // rien apres un renommage de classe. Dans les deux cas la sonde ne mesure PLUS rien,
      // et se taire serait le pire des deux comportements possibles.
      if (!m.grille || m.grille.items === 0) {
        echecs.push(
          `${ou} : aucune carte sous « ${parItem.grille} ».\n`
          + `        Le budget par carte ne mesure plus rien - classe renommee, ou page vide.`,
        );
      } else {
        const cout = Math.round(m.grille.hauteur / m.grille.items);
        if (cout > parItem.budget) {
          echecs.push(
            `${ou} : ${cout}px par carte (${m.grille.items} cartes, grille ${m.grille.hauteur}px),`
            + ` budget ${parItem.budget}px.\n`
            + `        La page a le droit de s'allonger quand le flux grossit, pas la carte.`,
          );
        }
      }
    }
  }
}
await nav.close();

console.log("check:mobile\n");
console.log(`${PAGES.length} pages x ${PROFILS.length} profils = ${tableau.length} mesures`);
console.log(`(« 375+enc » simule les ${ENCOCHE_PX}px de zone sure d'un iPhone a encoche)\n`);
console.log("PROFIL   PAGE                  CIBLES<44  TEXTE<12  RECOUVERTS  HAUTEUR    PX/CARTE");
for (const t of tableau) {
  console.log(
    `${String(t.nomProfil).padEnd(9)}${t.chemin.padEnd(22)}`
    + `${String(t.cibles.length).padEnd(11)}${String(t.petits.length).padEnd(10)}`
    + `${String(t.recouverts.length).padEnd(12)}${String(t.hauteur + "px").padEnd(11)}`
    // Affiche le cout par carte la ou il est le critere, un tiret ailleurs : une colonne
    // vide laisserait croire a une mesure ratee plutot qu'a une mesure sans objet.
    + (t.grille && t.grille.items
        ? `${Math.round(t.grille.hauteur / t.grille.items)}px (${t.grille.items})`
        : "-"),
  );
}

if (erreursJs.length > 0) {
  console.log("\nERREURS JAVASCRIPT :");
  for (const e of [...new Set(erreursJs)].slice(0, 5)) console.log(`  ${e}`);
}

console.log("\nCE QUE CE BANC NE COUVRE PAS :");
console.log("  - la BEAUTE. Il dit si une page est lisible, atteignable et contenue,");
console.log("    jamais si elle est belle. Ce jugement reste celui de Steven.");
console.log("  - un VRAI telephone. Chrome a 375px n'est pas iOS Safari : polices,");
console.log("    defilement inertiel et unites de viewport ne sont pas eprouves ici.");
console.log("  - les calques DECORATIFS passant sur le texte. elementFromPoint ignore");
console.log("    pointer-events: none, donc la regle de recouvrement en est aveugle par");
console.log("    construction. Ce cas se verifie en lisant le z-index, pas ici.");

if (echecs.length === 0) {
  console.log("\n[OK] Planchers tactiles et de lisibilite tenus, rien de recouvert,");
  console.log("     hauteurs sous plafond, cout par carte sous budget.");
  process.exit(0);
}
console.log(`\n[FAIL] ${echecs.length} probleme(s) :\n`);
for (const e of echecs) console.log(`  - ${e}`);
console.log("\nLes planchers ne s'ajustent pas pour faire passer un lot : si un lot demande");
console.log("de les baisser, c'est le lot qui est faux.");
process.exit(1);
