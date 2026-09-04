"use client";

import { useState } from "react";
import ParticleBackground from "@/components/ParticleBackground";
import { createClient } from "@/lib/supabase/client";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#ffd700",
  marginBottom: 6,
  letterSpacing: "0.06em",
  fontFamily: "Exo 2, sans-serif",
};

type Mode = "login" | "signup" | "forgot";

export default function AuthForm({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [team, setTeam] = useState("");
  const [level, setLevel] = useState("");
  const [friendCode, setFriendCode] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const resetMessages = () => {
    setError("");
    setInfo("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (!authError) {
        onSuccess();
      } else {
        setError(authError.message ?? "Erreur de connexion");
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          displayName,
          team: team || null,
          level: level ? Number(level) : null,
          friendCode: friendCode || null,
          city,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setInfo("Compte créé ! Tu peux te connecter directement.");
        setMode("login");
      } else {
        setError(data.error ?? "Erreur lors de l'inscription");
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/mon-espace/reset-password`,
      });
      setInfo("Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé.");
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<Mode, string> = {
    login: "Connexion",
    signup: "Créer un compte",
    forgot: "Mot de passe oublié",
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4" style={{ background: "#0b0700" }}>
      <ParticleBackground />

      <div className="glass-card animate-scale-in relative z-10 w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <h1 className="neon-text" style={{ fontFamily: "Exo 2, sans-serif", fontSize: "1.5rem", fontWeight: 800, color: "#ffd700" }}>
            {titles[mode]}
          </h1>
          <p style={{ color: "rgba(232,237,245,0.4)", fontSize: "0.85rem", marginTop: 4 }}>
            Échanges chanceux du V
          </p>
        </div>

        {mode === "login" && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label style={labelStyle}>EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input"
                placeholder="toi@exemple.com"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label style={labelStyle}>MOT DE PASSE</label>
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
            <Messages error={error} info={info} />
            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4, justifyContent: "center" }}>
              {loading ? "Connexion…" : "Se connecter"}
            </button>
            <div className="text-center flex flex-col gap-2 mt-2">
              <button
                type="button"
                onClick={() => { resetMessages(); setMode("forgot"); }}
                style={{ color: "rgba(232,237,245,0.68)", fontSize: "0.8125rem", background: "none", minHeight: 44, display: "inline-flex", alignItems: "center", padding: "0 8px" }}
              >
                Mot de passe oublié ?
              </button>
              <button
                type="button"
                onClick={() => { resetMessages(); setMode("signup"); }}
                style={{ color: "#ffd700", fontSize: "0.8125rem", background: "none", minHeight: 44, display: "inline-flex", alignItems: "center", padding: "0 8px" }}
              >
                Pas encore de compte ? Inscris-toi
              </button>
            </div>
          </form>
        )}

        {mode === "signup" && (
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <div>
              <label style={labelStyle}>NOM DE DRESSEUR</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="glass-input"
                placeholder="Ton pseudo Pokémon GO"
                required
              />
            </div>
            <div>
              <label style={labelStyle}>EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input"
                placeholder="toi@exemple.com"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label style={labelStyle}>MOT DE PASSE</label>
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
            <div>
              <label style={labelStyle}>VILLE</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="glass-input"
                placeholder="Ta ville"
                required
              />
            </div>
            <div>
              <label style={labelStyle}>ÉQUIPE</label>
              <select value={team} onChange={(e) => setTeam(e.target.value)} className="glass-input" required>
                <option value="" disabled>Choisis ton équipe</option>
                <option value="instinct">Instinct</option>
                <option value="mystic">Mystic</option>
                <option value="valor">Valor</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>NIVEAU</label>
              <input
                type="number"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="glass-input"
                placeholder="1-80"
                min={1}
                max={80}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>CODE AMI (optionnel)</label>
              <input
                type="text"
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value)}
                className="glass-input"
                placeholder="0000 0000 0000"
              />
            </div>
            <Messages error={error} info={info} />
            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4, justifyContent: "center" }}>
              {loading ? "Création…" : "Créer mon compte"}
            </button>
            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => { resetMessages(); setMode("login"); }}
                style={{ color: "#ffd700", fontSize: "0.8125rem", background: "none", minHeight: 44, display: "inline-flex", alignItems: "center", padding: "0 8px" }}
              >
                Déjà un compte ? Connecte-toi
              </button>
            </div>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={handleForgot} className="flex flex-col gap-4">
            <div>
              <label style={labelStyle}>EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input"
                placeholder="toi@exemple.com"
                autoComplete="email"
                required
              />
            </div>
            <Messages error={error} info={info} />
            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4, justifyContent: "center" }}>
              {loading ? "Envoi…" : "Envoyer le lien de réinitialisation"}
            </button>
            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => { resetMessages(); setMode("login"); }}
                style={{ color: "#ffd700", fontSize: "0.8125rem", background: "none", minHeight: 44, display: "inline-flex", alignItems: "center", padding: "0 8px" }}
              >
                Retour à la connexion
              </button>
            </div>
          </form>
        )}

        <div className="text-center mt-6">
          <a href="/dresseurs" style={{ color: "rgba(232,237,245,0.68)", fontSize: "0.8125rem", minHeight: 44, display: "inline-flex", alignItems: "center", padding: "0 8px" }}>
            Voir les dresseurs
          </a>
        </div>
      </div>
    </div>
  );
}

function Messages({ error, info }: { error: string; info: string }) {
  return (
    <>
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
      {info && (
        <p
          className="animate-fade-in-up"
          style={{
            color: "#ffd700",
            fontSize: "0.8rem",
            textAlign: "center",
            background: "rgba(255, 215, 0,0.1)",
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid rgba(255, 215, 0,0.2)",
          }}
        >
          {info}
        </p>
      )}
    </>
  );
}
