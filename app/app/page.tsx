import Link from "next/link";
import { requireTenant } from "@/lib/db/context";
import { listClients } from "@/lib/db/clients";

export default async function DashboardPage() {
  const { email } = await requireTenant();
  const clients = await listClients();

  return (
    <>
      <div style={topbar}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.3px" }}>Dashboard</div>
      </div>
      <div style={{ padding: 32 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 34, fontWeight: 400, margin: "0 0 6px" }}>
            Welcome back
          </h1>
          <p style={{ color: "#9898b8", fontSize: 14, margin: 0 }}>{email}</p>
        </div>

        <div style={statRow}>
          <Link href="/app/clients" style={{ textDecoration: "none" }}>
            <div style={statCard}>
              <div style={statLabel}>CLIENTS</div>
              <div style={statVal}>{clients.length}</div>
              <div style={statSub}>Manage your clients →</div>
            </div>
          </Link>
          <Link href="/app/invoices" style={{ textDecoration: "none" }}>
            <div style={statCard}>
              <div style={statLabel}>INVOICES</div>
              <div style={statVal}>—</div>
              <div style={statSub}>Manage invoices →</div>
            </div>
          </Link>
          <Link href="/app/products" style={{ textDecoration: "none" }}>
            <div style={statCard}>
              <div style={statLabel}>PRODUCTS</div>
              <div style={statVal}>—</div>
              <div style={statSub}>Manage services →</div>
            </div>
          </Link>
        </div>

        <p style={{ color: "#6e6e88", fontSize: 13, marginTop: 28, lineHeight: 1.7, maxWidth: 560 }}>
          Everything is live and database-backed. Create clients, save your services, and send invoices — it all syncs to your account.
        </p>
      </div>
    </>
  );
}

const topbar: React.CSSProperties = {
  position: "sticky", top: 0, zIndex: 40, background: "rgba(10,10,13,0.85)",
  backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.07)",
  padding: "0 32px", height: 60, display: "flex", alignItems: "center",
};
const statRow: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, maxWidth: 720 };
const statCard: React.CSSProperties = {
  background: "#111116", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20,
};
const statLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#6e6e88",
  textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8,
};
const statVal: React.CSSProperties = { fontFamily: "'Instrument Serif', serif", fontSize: 30, lineHeight: 1, color: "#f0f0f8" };
const statSub: React.CSSProperties = { fontSize: 11, color: "#4fffb0", marginTop: 8 };
