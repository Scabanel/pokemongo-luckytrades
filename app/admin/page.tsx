"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ParticleBackground from "@/components/ParticleBackground";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import BackgroundManager from "@/components/BackgroundManager";

// Interface admin dédiée, distincte de "Mon espace" (gestion des
// dresseurs/échanges) : regroupe les fonctionnalités jusque-là éparpillées
// (dresseurs dans AdminPanel, modération "pas encore sortis" sur sa propre
// page publique, export sans aucun bouton) derrière un seul point d'entrée,
// plus la nouvelle gestion des fonds d'événement (voir BackgroundManager).
export default function AdminPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setIsAdmin(!!data?.isAdmin))
      .finally(() => setChecked(true));
  }, []);

  useEffect(() => {
    if (checked && !isAdmin) router.replace("/mon-espace");
  }, [checked, isAdmin, router]);

  if (!checked || !isAdmin) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "var(--papier)" }}>
        <div
          className="animate-glow-pulse"
          style={{ width: 48, height: 48, border: "3px solid var(--encre)", borderTop: "3px solid transparent", borderRadius: "50%", animation: "spin-slow 0.8s linear infinite" }}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col" style={{ background: "var(--papier)" }}>
      <ParticleBackground />
      <SiteNav active="/admin" />
      <div className="flex-1" style={{ maxWidth: 1100, margin: "0 auto", width: "100%", padding: "24px clamp(12px, 4vw, 24px)" }}>
        <h1 style={{ fontFamily: "Exo 2, sans-serif", color: "var(--encre)", fontWeight: 800, fontSize: "1.6rem", marginBottom: 6 }}>
          Administration
        </h1>
        <p style={{ color: "var(--encre-tres-douce)", fontSize: "0.85rem", marginBottom: 20 }}>
          Toutes les fonctionnalités réservées à l&apos;administration, au même endroit.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
          <AdminCard
            title="Dresseurs & échanges"
            desc="Ajouter/supprimer un dresseur, réassigner une entrée, modérer les échanges."
            href="/mon-espace"
          />
          <AdminCard
            title="Pokémon pas encore sortis"
            desc="Ajouter/retirer manuellement une espèce ou une variante de la liste."
            href="/pas-encore-sortis"
          />
          <ExportCard />
        </div>

        <BackgroundManager />
      </div>
      <SiteFooter />
    </div>
  );
}

function AdminCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <a
      href={href}
      className="glass-card"
      style={{ padding: 16, textDecoration: "none", display: "block", transition: "transform 0.15s" }}
    >
      <h3 style={{ fontFamily: "Exo 2, sans-serif", color: "var(--encre)", fontWeight: 700, fontSize: "0.95rem", marginBottom: 6 }}>
        {title}
      </h3>
      <p style={{ color: "var(--encre-tres-douce)", fontSize: "0.78rem", lineHeight: 1.4 }}>{desc}</p>
    </a>
  );
}

function ExportCard() {
  return (
    <div className="glass-card" style={{ padding: 16 }}>
      <h3 style={{ fontFamily: "Exo 2, sans-serif", color: "var(--encre)", fontWeight: 700, fontSize: "0.95rem", marginBottom: 6 }}>
        Export des données
      </h3>
      <p style={{ color: "var(--encre-tres-douce)", fontSize: "0.78rem", lineHeight: 1.4, marginBottom: 10 }}>
        Télécharge un export complet (dresseurs, échanges) au format JSON.
      </p>
      <a href="/api/export" className="btn-secondary" style={{ fontSize: "0.78rem", display: "inline-block", textDecoration: "none" }}>
        Télécharger
      </a>
    </div>
  );
}
