"use client";

import { useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════════════════════════════
   LE RESEAU EN FILIGRANE

   Ce composant peignait des particules dorees flottantes : la signature de l'ancienne DA,
   ou tout etait pose sur un fond quasi noir. Sur du papier clair, les memes particules
   ressemblent a de la salissure, et l'or n'a plus le droit de servir de decor - il ne dit
   plus que le shiny et la chance.

   A la place, un plan de reseau tres pale : quelques lignes diagonales aux couleurs des
   trois categories du site, avec leurs stations. C'est le seul endroit ou la DA se montre
   pour elle-meme, et elle y reste sous les 8 % d'opacite : un fond qu'on remarque est un
   fond rate.

   ═══ POURQUOI C'EST STATIQUE ═══

   Un plan de reseau ne bouge pas. Et le site sert surtout sur telephone : une animation
   permanente sur six pages, c'est une boucle d'animation qui tourne en continu pour un
   decor a 7 % d'opacite. On dessine une fois, puis au redimensionnement.

   ═══ POURQUOI DU CANVAS ET DES COULEURS LUES EN JS ═══

   `var(--ligne-miroir)` n'existe pas dans un contexte canvas. Les valeurs sont donc lues
   sur l'element racine au moment du rendu, ce qui garde app/tokens.css comme source
   unique malgre tout. C'est la seule exception a la regle « aucune couleur en dur », et
   scripts/check-da.mjs nomme ce fichier explicitement pour qu'elle reste une exception.
   ═══════════════════════════════════════════════════════════════════════════════════════ */

/** Les trois lignes du reseau, dans l'ordre ou elles se croisent a l'ecran. */
const LIGNES = ["--ligne-miroir", "--ligne-cherche", "--ligne-donne"];

/** Assez pale pour ne jamais concurrencer le contenu, assez present pour se voir. */
const OPACITE = 0.07;

export default function ParticleBackground() {
  const toile = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = toile.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const styles = getComputedStyle(document.documentElement);
    const couleurs = LIGNES.map((n) => styles.getPropertyValue(n).trim() || "#888");

    function dessiner() {
      if (!c || !ctx) return;
      // Le rapport de pixels : sans lui, un trait de 3px est flou sur un ecran de
      // telephone, et un plan flou n'est plus un plan.
      const dpr = window.devicePixelRatio || 1;
      const l = window.innerWidth;
      const h = window.innerHeight;
      c.width = l * dpr;
      c.height = h * dpr;
      c.style.width = `${l}px`;
      c.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, l, h);
      ctx.globalAlpha = OPACITE;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Chaque ligne descend en diagonale avec un coude, comme sur un plan de reseau ou
      // les traces ne suivent jamais la geographie exacte mais des angles francs.
      couleurs.forEach((couleur, i) => {
        const depart = h * (0.12 + i * 0.24);
        const coude = l * (0.34 + i * 0.16);
        const arrivee = depart + h * 0.3;

        ctx.strokeStyle = couleur;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(-40, depart);
        ctx.lineTo(coude, depart);
        ctx.lineTo(coude + (arrivee - depart), arrivee);
        ctx.lineTo(l + 40, arrivee);
        ctx.stroke();

        // Les stations : un disque plein cercle de blanc, exactement comme sur un plan.
        for (const [x, y] of [[coude, depart], [coude + (arrivee - depart), arrivee]] as const) {
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.fillStyle = styles.getPropertyValue("--surface").trim() || "#fff";
          ctx.fill();
          ctx.lineWidth = 5;
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;
    }

    dessiner();
    window.addEventListener("resize", dessiner);
    return () => window.removeEventListener("resize", dessiner);
  }, []);

  return (
    <canvas
      ref={toile}
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    />
  );
}
