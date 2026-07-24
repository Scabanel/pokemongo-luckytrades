"use client";

import ParticleBackground from "@/components/ParticleBackground";

const FEATURES = [
  {
    title: "Crée ta liste",
    text: "Indique ce que tu recherches, ce que tu peux donner, et tes échanges miroir. Toi seul peux la modifier.",
  },
  {
    title: "Parcours les autres dresseurs",
    text: "Consulte librement ce que chaque dresseur inscrit recherche ou propose, sans même avoir de compte.",
  },
  {
    title: "Organisez vos échanges",
    text: "Repérez une correspondance, contactez-vous en jeu, et marquez l'échange comme conclu une fois fait.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen flex flex-col" style={{ background: "#0b0700" }}>
      <ParticleBackground />
      <div className="scanlines" />

      <div className="fixed pointer-events-none" style={{ top: "8%", left: "4%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,160,20,0.04) 0%, transparent 70%)", animation: "float-orb 8s ease-in-out infinite", zIndex: 0 }} />
      <div className="fixed pointer-events-none" style={{ bottom: "12%", right: "6%", width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,120,10,0.04) 0%, transparent 70%)", animation: "float-orb 10s ease-in-out infinite 2s", zIndex: 0 }} />
      <div className="fixed pointer-events-none" style={{ bottom: -120, left: "8%", width: 700, height: 420, background: "radial-gradient(ellipse at center bottom, rgba(255,200,50,0.13) 0%, rgba(255,160,20,0.06) 45%, transparent 70%)", zIndex: 0 }} />
      <div className="fixed pointer-events-none" style={{ bottom: -100, right: "12%", width: 600, height: 380, background: "radial-gradient(ellipse at center bottom, rgba(255,180,30,0.1) 0%, rgba(255,140,0,0.04) 45%, transparent 70%)", zIndex: 0 }} />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto px-4 py-16 text-center">
        <div style={{
          fontFamily: "Bebas Neue, Exo 2, sans-serif",
          fontSize: "clamp(0.7rem, 1.5vw, 0.9rem)",
          letterSpacing: "0.35em",
          color: "rgba(255,180,30,0.6)",
          marginBottom: 10,
          textTransform: "uppercase",
        }}>
          Pokémon GO · Lucky Trades
        </div>

        <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" alt="Poké Ball" width={40} height={40} className="animate-bounce-soft" style={{ imageRendering: "pixelated", opacity: 0.85 }} />
          <h1
            style={{
              fontFamily: "Exo 2, sans-serif",
              fontSize: "clamp(1.8rem, 6vw, 3.2rem)",
              fontWeight: 900,
              color: "#ffd700",
              letterSpacing: "-0.03em",
              textTransform: "uppercase",
              textShadow: "0 0 20px rgba(255,215,0,0.5), 0 0 50px rgba(255,180,0,0.2)",
              animation: "title-float 4s ease-in-out infinite",
            }}
          >
            Organisez vos échanges chanceux
          </h1>
        </div>

        <p style={{
          color: "rgba(232,237,245,0.55)",
          fontSize: "1rem",
          maxWidth: 560,
          lineHeight: 1.6,
          marginBottom: 40,
        }}>
          Un carnet d&apos;échanges partagé entre dresseurs Pokémon GO. Chacun crée
          son propre compte et gère sa propre liste (recherches, dons, miroirs)
          et peut consulter celles de tous les autres.
        </p>

        <div className="flex gap-4 flex-wrap justify-center mb-16">
          <a href="/mon-espace" className="btn-primary" style={{ textDecoration: "none", fontSize: "0.95rem", padding: "12px 28px" }}>
            Se connecter / S&apos;inscrire
          </a>
          <a href="/dresseurs" className="btn-secondary" style={{ textDecoration: "none", fontSize: "0.95rem", padding: "12px 28px" }}>
            Voir les listes des dresseurs
          </a>
        </div>

        <div className="grid gap-6 w-full" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {FEATURES.map(({ title, text }) => (
            <div key={title} className="glass-card p-5" style={{ textAlign: "left" }}>
              <h2 style={{
                fontFamily: "Exo 2, sans-serif",
                fontWeight: 700,
                color: "#0affe0",
                fontSize: "1rem",
                marginBottom: 6,
              }}>
                {title}
              </h2>
              <p style={{ color: "rgba(232,237,245,0.5)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
