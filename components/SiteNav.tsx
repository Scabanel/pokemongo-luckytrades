"use client";

// Header sobre et statique inspiré de la DA VertiForge (channelingChaos/tools/vertiforge) :
// barre fixe en haut, fond sombre quasi opaque, simple bordure de séparation, pas de glow ni de
// néon. Contraste avec le reste du site (particules, ombres colorées) qui reste réservé au
// contenu de chaque page, pas à la navigation elle-même.
const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/dresseurs", label: "Dresseurs" },
  { href: "/pas-encore-sortis", label: "Pas encore disponibles" },
  { href: "/evenements", label: "Événements" },
  { href: "/mon-espace", label: "Mon espace" },
];

export default function SiteNav({ active }: { active: string }) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-4 flex-wrap"
      style={{
        padding: "12px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(11,7,0,0.92)",
        backdropFilter: "blur(10px)",
      }}
    >
      <a
        href="/"
        className="flex items-center gap-2"
        style={{ textDecoration: "none" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"
          alt=""
          width={22}
          height={22}
          style={{ imageRendering: "pixelated" }}
        />
        <span
          style={{
            fontFamily: "Exo 2, sans-serif",
            fontWeight: 900,
            fontSize: "1.05rem",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "#ffd700",
            textShadow: "0 0 12px rgba(255,215,0,0.35)",
          }}
        >
          Échanges Pokémon Go Strasbourg!
        </span>
      </a>
      <nav className="flex gap-2 flex-wrap" style={{ marginLeft: "auto" }}>
        {LINKS.map(({ href, label }) => (
          <a
            key={href}
            href={href}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              fontFamily: "Exo 2, sans-serif",
              fontWeight: 600,
              fontSize: "0.78rem",
              letterSpacing: "0.02em",
              textDecoration: "none",
              border: "1px solid",
              transition: "border-color 0.15s, color 0.15s, background 0.15s",
              ...(active === href
                ? {
                    background: "rgba(10,255,224,0.12)",
                    borderColor: "rgba(10,255,224,0.4)",
                    color: "#ffd700",
                  }
                : {
                    background: "transparent",
                    borderColor: "rgba(255,255,255,0.08)",
                    color: "rgba(232,237,245,0.5)",
                  }),
            }}
          >
            {label}
          </a>
        ))}
      </nav>
    </header>
  );
}
