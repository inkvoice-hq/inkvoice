"use client";

import { useState, useTransition, useEffect } from "react";
import { readDraft, draftHasContent } from "@/lib/draft";
import Link from "next/link";
import { signUp, logIn } from "@/lib/auth/actions";
import { trackSignup } from "@/lib/track";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [fromGenerator, setFromGenerator] = useState(false);
  const [prefill, setPrefill] = useState({ businessName: "", email: "" });

  // Arriving from the free generator (or ?mode=signup): open on sign-up and
  // pre-fill from the invoice they just made.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("mode") === "signup") setMode("signup");
    const d = readDraft();
    if (d && draftHasContent(d)) {
      setFromGenerator(q.get("from") === "generator" || q.get("mode") === "signup");
      setPrefill({ businessName: d.from?.name || "", email: d.from?.email || "" });
    }
    if (q.get("error") === "link") setError("That link has expired. Log in, or sign up again to get a fresh one.");
  }, []);

  function handleSubmit(formData: FormData) {
    setError(null);
    setPendingMsg(null);
    startTransition(async () => {
      const action = mode === "signup" ? signUp : logIn;
      const result = await action(formData);
      if (result?.error) {
        setError(result.error);
      } else if (mode === "signup") {
        // Both paths land on a URL containing "signup-complete", which is
        // what the Google Ads sign-up conversion looks for.
        await trackSignup();
        window.location.assign(result?.redirectTo
          ? result.redirectTo + "?signup-complete=1"
          : "/signup-complete" + (fromGenerator ? "?from=generator" : ""));
      }
    });
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>Z</div>
          <span style={styles.brandName}>Zarbill</span>
        </div>

        {fromGenerator && (
          <div style={styles.banner}>
            <strong>Your invoice is saved.</strong>{" "}
            {(mode === "signup" ? "Create your free account" : "Log in") + " and it'll be waiting in your Invoices, with your client added."}
          </div>
        )}

        <h1 style={styles.h1}>{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        <p style={styles.sub}>
          {mode === "signup" ? "Start invoicing in minutes." : "Log in to your workspace."}
        </p>

        <form action={handleSubmit}>
          {mode === "signup" && (
            <>
              <label style={styles.label}>BUSINESS NAME</label>
              <input name="businessName" placeholder="My Studio" style={styles.input} defaultValue={prefill.businessName} key={"b" + prefill.businessName} />
            </>
          )}

          <label style={styles.label}>EMAIL</label>
          <input name="email" type="email" required placeholder="you@studio.com" style={styles.input} defaultValue={prefill.email} key={"e" + prefill.email} />

          <label style={styles.label}>PASSWORD</label>
          <input name="password" type="password" required minLength={6} placeholder="********" style={styles.input} />

          {mode === "login" && (
            <Link href="/forgot-password" style={styles.forgot}>Forgot password?</Link>
          )}

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
  forgot: { display: "block", textAlign: "right", color: "#9898b8", fontSize: 12, marginTop: 8, textDecoration: "none" },
  error: { color: "#ff6b6b", fontSize: 13, marginTop: 14 },
  banner: {
    background: "rgba(79,255,176,0.08)", border: "1px solid rgba(79,255,176,0.3)", color: "#d8ffe9",
    borderRadius: 10, padding: "12px 14px", fontSize: 13, lineHeight: 1.55, marginBottom: 22,
  },
  ok: { color: "#4fffb0", fontSize: 13, marginTop: 14 },
};
