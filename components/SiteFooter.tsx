"use client";

// Pied de page sobre et statique, même esprit que SiteNav.tsx : simple bordure de
// séparation, pas de glow, texte discret. Fixé en bas de l'écran (comme le header
// est fixé en haut) pour rester visible sans avoir à scroller ; `--footer-height`
// (globals.css) réserve l'espace correspondant en bas de la page.
export default function SiteFooter() {
  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between flex-wrap gap-3"
      style={{
        padding: "14px 20px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(11,7,0,0.92)",
        backdropFilter: "blur(10px)",
        fontSize: "0.78rem",
        color: "rgba(232,237,245,0.4)",
      }}
    >
      <a
        href="https://discord.gg/yR9BwR9aRg"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#0affe0", textDecoration: "none" }}
      >
        Discord Pokémon GO Strasbourg
      </a>
      <span>Fait par Vorthil</span>
    </footer>
  );
}
