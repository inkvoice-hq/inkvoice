"use client";

import { useState, useTransition } from "react";
import { signUp, logIn } from "@/lib/auth/actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setPendingMsg(null);
    startTransition(async () => {
      const action = mode === "signup" ? signUp : logIn;
      const result = await action(formData);
      if (result?.error) {
        setError(result.error);
      } else if (mode === "signup") {
        setPendingMsg("Check your email to confirm your account, then log in.");
      }
    });
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>I</div>
          <span style={styles.brandName}>Inkvoice</span>
        </div>

        <h1 style={styles.h1}>{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        <p style={styles.sub}>
          {mode === "signup" ? "Start invoicing in minutes." : "Log in to your workspace."}
        </p>

        <form action={handleSubmit}>
          {mode === "signup" && (
            <>
              <label style={styles.label}>BUSINESS NAME</label>
              <input name="businessName" placeholder="My Studio" style={styles.input} />
            </>
          )}

          <label style={styles.label}>EMAIL</label>
          <input name="email" type="email" required placeholder="you@studio.com" style={styles.input} />

          <label style={styles.label}>PASSWORD</label>
          <input name="password" type="password" required minLength={6} placeholder="********" style={styles.input} />

          {error && <p style={styles.error}>{error}</p>}
          {pendingMsg && <p style={styles.ok}>{pendingMsg}</p>}

          <button type="submit" disabled={isPending} style={styles.button}>
            {isPending ? "Please wait..." : mode === "signup" ? "Create Account" : "Log In"}
          </button>
        </form>

        <p
          style={styles.toggle}
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setError(null);
            setPendingMsg(null);
          }}
        >
          {mode === "signup" ? "Already have an account? Log in" : "Don't have an account? Sign up"}
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "#0a0a0d", fontFamily: "system-ui, sans-serif", padding: 20,
  },
  card: {
    background: "#111116", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18,
    padding: 40, width: "100%", maxWidth: 400, color: "#f0f0f8",
  },
  brand: { display: "flex", alignItems: "center", gap: 10, marginBottom: 28 },
  brandIcon: {
    width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center",
    justifyContent: "center", fontWeight: 800, color: "#0a0a0d",
    background: "linear-gradient(135deg,#4fffb0,#00d4ff)",
  },
  brandName: { fontSize: 18, fontWeight: 800 },
  h1: { fontSize: 26, marginBottom: 6 },
  sub: { color: "#9898b8", marginBottom: 28, fontSize: 14 },
  label: { display: "block", fontSize: 10, letterSpacing: 1.5, color: "#6e6e88", marginBottom: 6, marginTop: 14, fontFamily: "monospace" },
  input: {
    width: "100%", padding: 12, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
    background: "#18181f", color: "#fff", fontSize: 14, outline: "none",
  },
  button: {
    width: "100%", padding: 13, borderRadius: 8, border: "none", marginTop: 24,
    background: "#4fffb0", color: "#0a0a0d", fontWeight: 700, fontSize: 14, cursor: "pointer",
  },
  toggle: { color: "#4fffb0", textAlign: "center", cursor: "pointer", fontSize: 13, marginTop: 18 },
  error: { color: "#ff6b6b", fontSize: 13, marginTop: 14 },
  ok: { color: "#4fffb0", fontSize: 13, marginTop: 14 },
};
