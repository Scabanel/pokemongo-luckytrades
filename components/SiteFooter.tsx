"use client";

import { useEffect, useState } from "react";

// Pied de page sobre et statique, même esprit que SiteNav.tsx : simple bordure de
// séparation, pas de glow, texte discret. Fixé en bas de l'écran (comme le header
// est fixé en haut) pour rester visible sans avoir à scroller ; `--footer-height`
// (globals.css) réserve l'espace correspondant en bas de la page.
export default function SiteFooter() {
  const [trainerCount, setTrainerCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/trainers/count")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setTrainerCount(data?.count ?? null))
      .catch(() => {});
  }, []);

  return (
    <footer
      className="site-footer fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between"
      style={{
        borderTop: "1px solid var(--trait-leger)",
        background: "color-mix(in srgb, var(--papier) 92%, transparent)",
        color: "var(--encre-tres-douce)",
      }}
    >
      <a
        href="https://discord.gg/yR9BwR9aRg"
        target="_blank"
        rel="noopener noreferrer"
        className="site-footer-link"
        style={{ color: "var(--encre)", textDecoration: "none" }}
      >
        Discord Pokémon GO Strasbourg
      </a>
      <a
        href="/fonctionnalites"
        className="site-footer-link"
        style={{ color: "var(--ligne-miroir)", textDecoration: "none", fontWeight: 600 }}
      >
        Infos et Majs
      </a>
      {trainerCount != null && (
        <span className="site-footer-link">
          {trainerCount} dresseur{trainerCount > 1 ? "s" : ""} inscrit{trainerCount > 1 ? "s" : ""}
        </span>
      )}
      <span className="site-footer-link" style={{ color: "var(--encre)", textDecoration: "none" }}>Fait par Vorthil</span>
    </footer>
  );
}
