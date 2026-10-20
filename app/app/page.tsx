import Link from "next/link";
import { requireTenant } from "@/lib/db/context";
import { createClient } from "@/lib/supabase/server";
import { listClients } from "@/lib/db/clients";
import { listInvoices } from "@/lib/db/invoices";
import { listProducts } from "@/lib/db/products";
import { money, displayStatus, balanceDue, curOf, toHome, todayISO } from "@/lib/format";
import { clientProfiles, profileFor, nextStep, forecast, type InvoiceRow } from "@/lib/insights";

export default async function DashboardPage() {
  const { email, tenantId } = await requireTenant();
  const [clients, invoices, products] = await Promise.all([
    listClients(), listInvoices(), listProducts(),
  ]);

  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants").select("currency").eq("id", tenantId).maybeSingle();
  const currency = tenant?.currency ?? "ZAR";

  // Everything is shown in the account currency. Foreign invoices are
  // converted at the rate stored when they were created.
  const open = invoices.filter((i) => i.status !== "paid" && i.status !== "draft");
  const outstanding = open.reduce((s, i) => s + toHome(balanceDue(i), i.fx_rate), 0);
  const foreignOpen = new Map<string, number>();
  for (const i of open) {
    const c = curOf(i, currency);
    if (c !== currency) foreignOpen.set(c, (foreignOpen.get(c) || 0) + balanceDue(i));
  }
  const overdue = invoices.filter(
    (i) => displayStatus(i.status, i.due_date) === "overdue"
  ).length;

  // Money actually received (what landed in the bank, in the account currency).
  const { data: pays } = await supabase.from("payments").select("home_amount, amount").eq("tenant_id", tenantId);
  const paidTotal = (pays ?? []).reduce((s, p: any) => s + Number(p.home_amount ?? p.amount ?? 0), 0);

  const rows = invoices as unknown as InvoiceRow[];
  const today = todayISO();
  const profiles = clientProfiles(rows);
  const needFollowUp = open.filter((i) => nextStep(i as unknown as InvoiceRow, profileFor(profiles, i.client_id), today).priority >= 60).length;
  const next30 = forecast(rows, currency, today).buckets[0].amount;

  // Getting started: shown until the first payment is recorded.
  const steps = [
    { done: clients.length > 0, title: "Add your first client", detail: "Name, email and the currency they pay in.", href: "/app/clients", cta: "Add a client" },
    { done: invoices.length > 0, title: "Create an invoice", detail: "Or turn a quote into one.", href: "/app/invoices", cta: "New invoice" },
    { done: invoices.some((i) => !!i.sent_at), title: "Email it from Zarbill", detail: "Reminders and tracking only start once Zarbill has sent it.", href: "/app/invoices", cta: "Send it" },
    { done: (pays ?? []).length > 0, title: "Record the payment when it lands", detail: "Mark it paid, or upload your Wise, Payoneer, PayPal or bank statement to match it.", href: "/app/reconcile", cta: "Match payments" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const nextIdx = steps.findIndex((s) => !s.done);
  const showSetup = nextIdx >= 0;
  const isNew = invoices.length === 0;

  return (
    <>
      <div style={topbar}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.3px" }}>Dashboard</div>
      </div>
      <div style={{ padding: 32 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 34, fontWeight: 400, margin: "0 0 6px" }}>
            {isNew ? "Welcome to Zarbill" : "Welcome back"}
          </h1>
          <p style={{ color: "#9898b8", fontSize: 14, margin: 0 }}>{email}</p>
        </div>

        {showSetup && (
          <div style={setupCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Get set up</div>
              <div style={statLabel}>{doneCount} of {steps.length} done</div>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, margin: "10px 0 6px" }}>
              <div style={{ height: 4, width: `${(doneCount / steps.length) * 100}%`, background: "#4fffb0", borderRadius: 4 }} />
            </div>
            <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {steps.map((st, i) => (
                <li key={st.title} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0", borderTop: i ? "1px solid rgba(255,255,255,0.06)" : "none", opacity: st.done ? 0.55 : 1 }}>
                  <span style={{ ...stepDot, ...(st.done ? { background: "#4fffb0", color: "#0a0a0d", borderColor: "#4fffb0" } : i === nextIdx ? { borderColor: "#4fffb0", color: "#4fffb0" } : {}) }}>
                    {st.done ? "✓" : i + 1}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 600, textDecoration: st.done ? "line-through" : "none" }}>{st.title}</span>
                    {!st.done && <span style={{ display: "block", fontSize: 12, color: "#9898b8", marginTop: 2 }}>{st.detail}</span>}
                  </span>
                  {i === nextIdx && <Link href={st.href} style={stepBtn}>{st.cta}</Link>}
                </li>
              ))}
            </ol>
            <div style={{ fontSize: 12, color: "#6e6e88", marginTop: 6 }}>
              Your main currency is {currency}, used for totals and what landed in your account.{" "}
              <Link href="/app/settings" style={{ color: "#4fffb0" }}>Change it in Settings</Link>
            </div>
          </div>
        )}

        <div style={statRow}>
          <div style={{ ...statCard, borderColor: "rgba(79,255,176,0.25)" }}>
            <div style={statLabel}>OUTSTANDING</div>
            <div style={{ ...statVal, color: "#4fffb0" }}>{money(outstanding, currency)}</div>
            <div style={statSub}>{overdue > 0 ? `${overdue} overdue` : "Nothing overdue"}</div>
            {foreignOpen.size > 0 && (
              <div style={{ fontSize: 11, color: "#6e6e88", marginTop: 6 }}>
                Includes {Array.from(foreignOpen.entries()).map(([c, v]) => money(v, c)).join(" + ")}, converted at invoice-date rates
              </div>
            )}
          </div>
          <div style={statCard}>
            <div style={statLabel}>PAID TO DATE</div>
            <div style={statVal}>{money(paidTotal, currency)}</div>
            <div style={statSub}>All time, after fees</div>
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

        <div style={{ ...statRow, marginTop: 14 }}>
          <Link href="/app/follow-ups" style={linkReset}>
            <div style={{ ...statCard, ...(needFollowUp > 0 ? { border: "1px solid rgba(255,201,64,0.3)" } : {}) }}>
              <div style={statLabel}>NEEDS A FOLLOW-UP</div>
              <div style={statVal}>{needFollowUp}</div>
              <div style={statSub}>{needFollowUp > 0 ? "See who to chase →" : "All under control →"}</div>
            </div>
          </Link>
          <Link href="/app/insights" style={linkReset}>
            <div style={statCard}>
              <div style={statLabel}>EXPECTED NEXT 30 DAYS</div>
              <div style={statVal}>{money(next30, currency)}</div>
              <div style={statSub}>Cash forecast →</div>
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
const setupCard: React.CSSProperties = {
  background: "#111116", border: "1px solid rgba(79,255,176,0.25)", borderRadius: 16, padding: 20, maxWidth: 760, marginBottom: 14,
};
const stepDot: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 13, border: "1px solid rgba(255,255,255,0.18)", color: "#9898b8",
  display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0,
};
const stepBtn: React.CSSProperties = {
  background: "#4fffb0", color: "#0a0a0d", fontSize: 12, fontWeight: 700, padding: "8px 12px", borderRadius: 8,
  textDecoration: "none", whiteSpace: "nowrap",
};
const statSub: React.CSSProperties = { fontSize: 11, color: "#4fffb0", marginTop: 8 };
