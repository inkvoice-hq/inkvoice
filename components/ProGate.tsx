// components/ProGate.tsx
// Shown in place of a Pro-only feature for accounts on the Free plan.
import Link from "next/link";

export function ProGate({ title, children, points }: { title: string; children: React.ReactNode; points?: string[] }) {
  return (
    <div style={card}>
      <div style={badge}>PRO</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "10px 0 8px" }}>{title}</h2>
      <p style={{ color: "#b8b8d0", fontSize: 14, lineHeight: 1.6, margin: 0, maxWidth: 560 }}>{children}</p>
      {points && points.length > 0 && (
        <ul style={{ margin: "14px 0 0", paddingLeft: 18, color: "#d8d8ea", fontSize: 13.5, lineHeight: 1.8 }}>
          {points.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 18, flexWrap: "wrap" }}>
        <Link href="/app/upgrade" style={btn}>Upgrade to Pro</Link>
        <span style={{ fontSize: 12, color: "#8888a8" }}>Cancel anytime. 14-day money-back guarantee.</span>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#111116", border: "1px solid rgba(79,255,176,0.25)", borderRadius: 16,
  padding: 24, maxWidth: 760,
};
const badge: React.CSSProperties = {
  display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#0a0a0d",
  background: "#4fffb0", borderRadius: 6, padding: "3px 8px", fontFamily: "monospace",
};
const btn: React.CSSProperties = {
  background: "#4fffb0", color: "#0a0a0d", fontSize: 13, fontWeight: 700, padding: "10px 16px",
  borderRadius: 8, textDecoration: "none",
};
