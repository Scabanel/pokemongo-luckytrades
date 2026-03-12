"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ParticleBackground from "@/components/ParticleBackground";
import AdminPanel from "@/components/AdminPanel";

export default function AdminPage() {
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
        style={{ background: "#0b0f1a" }}
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
    return <LoginForm onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <div className="relative min-h-screen" style={{ background: "#0b0f1a" }}>
      <ParticleBackground />
      <AdminPanel onLogout={() => {
        setAuthenticated(false);
        router.push("/admin");
      }} />
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error ?? "Erreur de connexion");
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4"
      style={{ background: "#0b0f1a" }}
    >
      <ParticleBackground />

      <div
        className="glass-card animate-scale-in relative z-10 w-full max-w-sm p-8"
      >
        <div className="text-center mb-8">
          <div
            className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center animate-glow-pulse"
            style={{
              background: "rgba(10,255,224,0.1)",
              border: "1px solid rgba(10,255,224,0.3)",
              fontSize: "2rem",
            }}
          >
            🔐
          </div>
          <h1
            className="neon-text"
            style={{
              fontFamily: "Exo 2, sans-serif",
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "#0affe0",
            }}
          >
            Administration
          </h1>
          <p style={{ color: "rgba(232,237,245,0.4)", fontSize: "0.85rem", marginTop: 4 }}>
            Échanges chanceux du V
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#0affe0",
                marginBottom: 6,
                letterSpacing: "0.06em",
                fontFamily: "Exo 2, sans-serif",
              }}
            >
              IDENTIFIANT
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="glass-input"
              placeholder="admin"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#0affe0",
                marginBottom: 6,
                letterSpacing: "0.06em",
                fontFamily: "Exo 2, sans-serif",
              }}
            >
              MOT DE PASSE
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p
              className="animate-fade-in-up"
              style={{
                color: "#ff6b6b",
                fontSize: "0.8rem",
                textAlign: "center",
                background: "rgba(255,107,107,0.1)",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,107,107,0.2)",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: 4, justifyContent: "center" }}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <div className="text-center mt-6">
          <a
            href="/"
            style={{ color: "rgba(232,237,245,0.3)", fontSize: "0.75rem" }}
          >
            ← Retour au catalogue
          </a>
        </div>
      </div>
    </div>
  );
}
