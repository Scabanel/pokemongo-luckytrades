"use client";

// Pied de page sobre et statique, même esprit que SiteNav.tsx : simple bordure de
// séparation, pas de glow, texte discret. Fixé en bas de l'écran (comme le header
// est fixé en haut) pour rester visible sans avoir à scroller ; `--footer-height`
// (globals.css) réserve l'espace correspondant en bas de la page.
export default function SiteFooter() {
  return (
    <footer
      className="site-footer fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(11,7,0,0.92)",
        backdropFilter: "blur(10px)",
        color: "rgba(232,237,245,0.4)",
      }}
    >
      <a
        href="https://discord.gg/yR9BwR9aRg"
        target="_blank"
        rel="noopener noreferrer"
        className="site-footer-link"
        style={{ color: "#ffd700", textDecoration: "none" }}
      >
        Discord Pokémon GO Strasbourg
      </a>
      <a
        href="/fonctionnalites"
        className="site-footer-link"
        style={{ color: "#b464ff", textDecoration: "none", fontWeight: 600 }}
      >
        Infos et Majs
      </a>
      <span className="site-footer-link" style={{ color: "#ffd700", textDecoration: "none" }}>Fait par Vorthil</span>
    </footer>
  );
}
