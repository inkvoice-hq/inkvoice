// Shared styles for the public auth screens (forgot / reset password),
// matching the login page.
import type React from "react";

export const authStyles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "#0a0a0d", fontFamily: "system-ui, sans-serif", padding: 20,
  },
  card: {
    background: "#111116", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18,
    padding: 40, width: "100%", maxWidth: 400, color: "#f0f0f8",
  },
  brand: { display: "flex", alignItems: "center", gap: 10, marginBottom: 28, textDecoration: "none", color: "#f0f0f8" },
  brandIcon: {
    width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center",
    justifyContent: "center", fontWeight: 800, color: "#0a0a0d",
    background: "linear-gradient(135deg,#4fffb0,#00d4ff)",
  },
  brandName: { fontSize: 18, fontWeight: 800 },
  h1: { fontSize: 26, marginBottom: 6 },
  sub: { color: "#9898b8", marginBottom: 20, fontSize: 14, lineHeight: 1.6 },
  label: { display: "block", fontSize: 10, letterSpacing: 1.5, color: "#6e6e88", marginBottom: 6, marginTop: 14, fontFamily: "monospace" },
  input: {
    width: "100%", padding: 12, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
    background: "#18181f", color: "#fff", fontSize: 16, outline: "none",
  },
  button: {
    width: "100%", padding: 13, borderRadius: 8, border: "none", marginTop: 24,
    background: "#4fffb0", color: "#0a0a0d", fontWeight: 700, fontSize: 14, cursor: "pointer",
  },
  link: { color: "#4fffb0", textAlign: "center", display: "block", fontSize: 13, marginTop: 18, textDecoration: "none" },
  error: { color: "#ff6b6b", fontSize: 13, marginTop: 14 },
  ok: { color: "#4fffb0", fontSize: 13, marginTop: 14, lineHeight: 1.6 },
};
