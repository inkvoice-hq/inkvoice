// app/signup-complete/page.tsx
// Shown right after someone creates an account (before they confirm their
// email). Its own URL lets Google Ads count a sign-up with a simple
// "page URL contains signup-complete" rule; no extra code needed in Google.
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Check your email — Zarbill",
  robots: { index: false, follow: false },
};

export default async function SignupComplete({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const fromGenerator = from === "generator";
  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={brandIcon}>Z</div>
          <span style={{ fontSize: 18, fontWeight: 800 }}>Zarbill</span>
        </div>
        <h1 style={{ fontSize: 26, margin: "0 0 10px" }}>Check your email</h1>
        <p style={{ color: "#c8c8dc", fontSize: 15, lineHeight: 1.6, margin: "0 0 18px" }}>
          We&apos;ve sent you a confirmation link. Tap it{fromGenerator ? " on this device" : ""} to finish
          creating your account{fromGenerator ? ", and your invoice will be waiting" : ""}.
        </p>
        <p style={{ color: "#9898b8", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          Can&apos;t find it? Check your spam or promotions folder. It comes from Zarbill.
        </p>
        <p style={{ fontSize: 13, marginTop: 24 }}>
          <Link href="/login" style={{ color: "#4fffb0", textDecoration: "none" }}>Already confirmed? Log in</Link>
        </p>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
  background: "#0a0a0d", fontFamily: "system-ui, sans-serif", padding: 20,
};
const card: React.CSSProperties = {
  background: "#111116", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18,
  padding: 40, width: "100%", maxWidth: 400, color: "#f0f0f8",
};
const brandIcon: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center",
  justifyContent: "center", fontWeight: 800, color: "#0a0a0d",
  background: "linear-gradient(135deg,#4fffb0,#00d4ff)",
};
