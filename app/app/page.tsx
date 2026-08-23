import Link from "next/link";
import { requireTenant } from "@/lib/db/context";
import { createClient } from "@/lib/supabase/server";
import { listClients } from "@/lib/db/clients";
import { listInvoices } from "@/lib/db/invoices";
import { listProducts } from "@/lib/db/products";
import { money, displayStatus } from "@/lib/format";

export default async function DashboardPage() {
  const { email, tenantId } = await requireTenant();
  const [clients, invoices, products] = await Promise.all([
    listClients(), listInvoices(), listProducts(),
  ]);

  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants").select("currency").eq("id", tenantId).maybeSingle();
  const currency = tenant?.currency ?? "ZAR";

  const outstanding = invoices
    .filter((i) => i.status !== "paid" && i.status !== "draft")
    .reduce((s, i) => s + Number(i.total || 0), 0);
  const overdue = invoices.filter(
    (i) => displayStatus(i.status, i.due_date) === "overdue"
  ).length;
  const paidTotal = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.total || 0), 0);

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
          <div style={{ ...statCard, borderColor: "rgba(79,255,176,0.25)" }}>
            <div style={statLabel}>OUTSTANDING</div>
            <div style={{ ...statVal, color: "#4fffb0" }}>{money(outstanding, currency)}</div>
            <div style={statSub}>{overdue > 0 ? `${overdue} overdue` : "Nothing overdue"}</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>PAID TO DATE</div>
            <div style={statVal}>{money(paidTotal, currency)}</div>
            <div style={statSub}>All time</div>
          </div>
        </div>

        <div style={{ ...statRow, marginTop: 14 }}>
          <Link href="/app/invoices" style={linkReset}>
            <div style={statCard}>
              <div style={statLabel}>INVOICES</div>
              <div style={statVal}>{invoices.length}</div>
              <div style={statSub}>Manage invoices →</div>
            </div>
          </Link>
          <Link href="/app/clients" style={linkReset}>
            <div style={statCard}>
              <div style={statLabel}>CLIENTS</div>
              <div style={statVal}>{clients.length}</div>
              <div style={statSub}>Manage clients →</div>
            </div>
          </Link>
          <Link href="/app/products" style={linkReset}>
            <div style={statCard}>
              <div style={statLabel}>SERVICES</div>
              <div style={statVal}>{products.length}</div>
              <div style={statSub}>Manage services →</div>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}

const topbar: React.CSSProperties = {
  position: "sticky", top: 0, zIndex: 40, background: "rgba(10,10,13,0.85)",
  backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.07)",
  padding: "0 32px", height: 60, display: "flex", alignItems: "center",
};
const linkReset: React.CSSProperties = { textDecoration: "none", color: "inherit" };
const statRow: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, maxWidth: 760 };
const statCard: React.CSSProperties = {
  background: "#111116", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20,
};
const statLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#6e6e88",
  textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8,
};
const statVal: React.CSSProperties = { fontFamily: "'Instrument Serif', serif", fontSize: 30, lineHeight: 1, color: "#f0f0f8" };
const statSub: React.CSSProperties = { fontSize: 11, color: "#4fffb0", marginTop: 8 };
