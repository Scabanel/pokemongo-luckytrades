"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ParticleBackground from "@/components/ParticleBackground";
import { createClient } from "@/lib/supabase/client";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--encre)",
  marginBottom: 6,
  letterSpacing: "0.06em",
  fontFamily: "Exo 2, sans-serif",
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Supabase établit automatiquement une session "recovery" à partir du
      // lien cliqué dans l'email (jeton dans l'URL, géré par le client JS).
      const supabase = createClient();
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) {
        setError(authError.message ?? "Erreur lors de la mise à jour du mot de passe");
      } else {
        setDone(true);
        setTimeout(() => router.push("/mon-espace"), 2000);
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4" style={{ background: "var(--papier)" }}>
      <ParticleBackground />

      <div className="glass-card animate-scale-in relative z-10 w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <h1 className="neon-text" style={{ fontFamily: "Exo 2, sans-serif", fontSize: "1.5rem", fontWeight: 800, color: "var(--encre)" }}>
            Nouveau mot de passe
          </h1>
        </div>

        {done ? (
          <p style={{ color: "var(--encre)", fontSize: "0.85rem", textAlign: "center" }}>
            Mot de passe mis à jour ! Redirection vers ton espace…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label style={labelStyle}>NOUVEAU MOT DE PASSE</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input"
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>

            {error && (
              <p
                style={{
                  color: "var(--alerte)",
                  fontSize: "0.8rem",
                  textAlign: "center",
                  background: "color-mix(in srgb, var(--alerte) 10%, transparent)",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid color-mix(in srgb, var(--alerte) 20%, transparent)",
                }}
              >
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4, justifyContent: "center" }}>
              {loading ? "Mise à jour…" : "Valider"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
