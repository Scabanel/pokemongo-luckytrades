"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ParticleBackground from "@/components/ParticleBackground";
import AdminPanel from "@/components/AdminPanel";
import AuthForm from "@/components/AuthForm";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export default function MonEspacePage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (r.ok) {
          setAuthenticated(true);
        }
      })
      .finally(() => setChecked(true));
  }, []);

  if (!checked) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: "#0b0700" }}
      >
        <div
          className="animate-glow-pulse"
          style={{
            width: 48,
            height: 48,
            border: "3px solid #0affe0",
            borderTop: "3px solid transparent",
            borderRadius: "50%",
            animation: "spin-slow 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  if (!authenticated) {
    return <AuthForm onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <div className="relative min-h-screen flex flex-col" style={{ background: "#0b0700" }}>
      <ParticleBackground />
      <SiteNav active="/mon-espace" />
      <div className="flex-1">
        <AdminPanel onLogout={() => {
          setAuthenticated(false);
          router.push("/mon-espace");
        }} />
      </div>
      <SiteFooter />
    </div>
  );
}
