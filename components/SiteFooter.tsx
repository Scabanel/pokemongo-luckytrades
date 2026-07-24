"use client";

// Pied de page sobre et statique, même esprit que SiteNav.tsx : simple bordure de
// séparation, pas de glow, texte discret.
export default function SiteFooter() {
  return (
    <footer
      className="relative z-10 flex items-center justify-between flex-wrap gap-3"
      style={{
        padding: "14px 20px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
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
