"use client";

import ParticleBackground from "@/components/ParticleBackground";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

const FEATURES = [
  {
    title: "Crée tes listes",
    text: "Indique ce que tu recherches, ce que tu peux donner, et ce qui est dispo en échanges miroir!",
  },
  {
    title: "Regarde ce qu'on les autres!",
    text: "Consulte librement ce que chaque dresseur inscrit recherche ou propose!",
  },
  {
    title: "Organise tes échanges",
    text: "Une fois que t'as fait ton choix, tu peux éditer le pokémon dans ta liste pour y indiquer le nom du dresseur avec qui tu feras l'échange, et contre quel pokémon! Une fois que c'est fait, tu pourras le marqué comme étant échangé!",
  },
  {
    title: "Tout y est!",
    text: "Les fonds, les costumes spéciaux, les 92831 versions différentes de Pikachu...tout y est, visible en un clin d'oeil!",
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen flex flex-col" style={{ background: "#0b0700" }}>
      <ParticleBackground />
      <div className="scanlines" />

      <SiteNav active="/" />

      <div className="fixed pointer-events-none" style={{ top: "8%", left: "4%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,160,20,0.04) 0%, transparent 70%)", animation: "float-orb 8s ease-in-out infinite", zIndex: 0 }} />
      <div className="fixed pointer-events-none" style={{ bottom: "12%", right: "6%", width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,120,10,0.04) 0%, transparent 70%)", animation: "float-orb 10s ease-in-out infinite 2s", zIndex: 0 }} />
      <div className="fixed pointer-events-none" style={{ bottom: -120, left: "8%", width: 700, height: 420, background: "radial-gradient(ellipse at center bottom, rgba(255,200,50,0.13) 0%, rgba(255,160,20,0.06) 45%, transparent 70%)", zIndex: 0 }} />
      <div className="fixed pointer-events-none" style={{ bottom: -100, right: "12%", width: 600, height: 380, background: "radial-gradient(ellipse at center bottom, rgba(255,180,30,0.1) 0%, rgba(255,140,0,0.04) 45%, transparent 70%)", zIndex: 0 }} />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-6xl mx-auto px-4 py-8 sm:py-16 text-center">
        <div style={{
          fontFamily: "Bebas Neue, Exo 2, sans-serif",
          fontSize: "clamp(0.75rem, 1.5vw, 0.9rem)"   /* min releve au plancher de 12px */,
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
              textShadow: "0 0 10px rgba(255,215,0,0.35)",
              animation: "title-float 4s ease-in-out infinite",
            }}
          >
            Organise tes échanges avec les membres de la communauté POGO Strasbourg!
          </h1>
        </div>

        <p style={{
          color: "rgba(232,237,245,0.55)",
          fontSize: "1rem",
          maxWidth: 640,
          lineHeight: 1.6,
          marginBottom: 40,
        }}>
          "Tu cherches quoi? Je sais pas et toi? Je sais pas.
          Ok, vous connaissez cette situation qui vous prend 15 minutes à chaque fois. Avec cette appli, vous pouvez organiser
          tous vos échanges, voir la liste des pokémons disponibles des personnes inscrites et réserver des Pokémon! Voilà un site qui va faire plaisir à Estelle!"
        </p>

        <div className="flex gap-4 flex-wrap justify-center mb-16">
          <a href="/mon-espace" className="btn-primary" style={{ textDecoration: "none", fontSize: "0.95rem", padding: "12px 28px" }}>
            Se connecter / S&apos;inscrire
          </a>
          <a href="/dresseurs" className="btn-secondary" style={{ textDecoration: "none", fontSize: "0.95rem", padding: "12px 28px" }}>
            Voir les listes des dresseurs
          </a>
        </div>

        <div className="grid gap-6 w-full" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {FEATURES.map(({ title, text }) => (
            <div key={title} className="glass-card p-5" style={{ textAlign: "left" }}>
              <h2 style={{
                fontFamily: "Exo 2, sans-serif",
                fontWeight: 700,
                color: "#ffd700",
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

      <SiteFooter />
    </div>
  );
}