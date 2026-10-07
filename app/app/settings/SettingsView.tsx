"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Tenant, TenantSettingsInput } from "@/lib/db/types";
import { updateTenantSettings, setRemindersEnabled } from "@/lib/db/tenant";
import { CURRENCY_SYMBOLS } from "@/lib/format";
import { uploadLogo, removeLogo } from "@/lib/db/logo";

const BIZ_TYPES = ["Freelancer / Solo Creator", "Small Agency", "Consultancy", "LLC / Ltd", "Corporation"];

export function SettingsView({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [tab, setTab] = useState<"business" | "invoice" | "reminders">("business");
  const [remOn, setRemOn] = useState(tenant.reminders_enabled !== false);
  const [remBusy, setRemBusy] = useState(false);
  const [remMsg, setRemMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [f, setF] = useState<TenantSettingsInput>({
    name: tenant.name ?? "",
    email: tenant.email ?? "",
    phone: tenant.phone ?? "",
    address: tenant.address ?? "",
    website: tenant.website ?? "",
    tax_reg: tenant.tax_reg ?? "",
    business_type: tenant.business_type ?? BIZ_TYPES[0],
    currency: tenant.currency ?? "USD",
    payment_terms: tenant.payment_terms ?? 30,
    default_tax_rate: Number(tenant.default_tax_rate) || 0,
    next_invoice_number: tenant.next_invoice_number ?? 1001,
    invoice_notes: tenant.invoice_notes ?? "",
    footer_message: tenant.footer_message ?? "",
  });

  function set<K extends keyof TenantSettingsInput>(k: K, v: TenantSettingsInput[K]) {
    setF((s) => ({ ...s, [k]: v }));
  }

  async function save() {
    if (!f.name.trim()) { setErr("Business name is required."); setMsg(null); return; }
    setBusy(true); setErr(null); setMsg(null);
    try {
      await updateTenantSettings(f);
      setMsg("Settings saved.");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Save failed.");
    } finally { setBusy(false); }
  }

  async function toggleReminders() {
    const next = !remOn;
    setRemBusy(true); setRemMsg(null);
    try {
      await setRemindersEnabled(next);
      setRemOn(next);
      setRemMsg(next ? "Automatic reminders are on." : "Automatic reminders are off.");
      router.refresh();
    } catch (e: any) {
      setRemMsg(e?.message || "Could not update. Please try again.");
    } finally { setRemBusy(false); }
  }

  return (
    <>
      <style>{css}</style>

      <div className="ink-topbar">
        <div className="ink-tb-title">Settings</div>
        <button className="ink-btn ink-btn-primary" onClick={save} disabled={busy}>
          {busy ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="ink-page">
        <div className="ink-settings">
          <div className="ink-snav">
            <div className={"ink-snav-item" + (tab === "business" ? " active" : "")} onClick={() => setTab("business")}>Business</div>
            <div className={"ink-snav-item" + (tab === "invoice" ? " active" : "")} onClick={() => setTab("invoice")}>Invoice Defaults</div>
            <div className={"ink-snav-item" + (tab === "reminders" ? " active" : "")} onClick={() => setTab("reminders")}>Reminders</div>
          </div>

          <div className="ink-card">
            {tab === "business" ? (
              <>
                <div className="ink-card-head"><span>Business Information</span></div>
                <div className="ink-card-body">
                  <p className="ink-hint">This appears in the header of every invoice you send.</p>
                  <div className="ink-fg">
                    <label>Logo (optional)</label>
                    {tenant.logo_url ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
                        <img src={tenant.logo_url} alt="Your logo"
                          style={{ height: 44, background: "#fff", padding: 6, borderRadius: 6 }} />
                        <button className="ink-btn ink-btn-ghost" onClick={async () => {
                          const r = await removeLogo(); alert(r.message); if (r.ok) router.refresh();
                        }}>Remove</button>
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: "#6e6e88", margin: "0 0 8px" }}>
                        No logo set &mdash; your business name is used instead.
                      </p>
                    )}
                    <input type="file" accept="image/png,image/jpeg,image/webp"
                      onChange={async (e) => {
                        const f = e.target.files?.[0]; if (!f) return;
                        const fd = new FormData(); fd.append("logo", f);
                        const r = await uploadLogo(fd); alert(r.message); if (r.ok) router.refresh();
                      }}
                      style={{ fontSize: 12, color: "#9898b8" }} />
                  </div>
                  <div className="ink-fgrid">
                    <F label="Business / Your Name" v={f.name} on={(v) => set("name", v)} ph="Zarbill Studio" />
                    <F label="Email" v={f.email ?? ""} on={(v) => set("email", v)} ph="you@studio.com" type="email" />
                  </div>
                  <div className="ink-fgrid">
                    <F label="Phone" v={f.phone ?? ""} on={(v) => set("phone", v)} ph="Phone number" />
                    <F label="Website" v={f.website ?? ""} on={(v) => set("website", v)} ph="yoursite.com" />
                  </div>
                  <F label="Address" v={f.address ?? ""} on={(v) => set("address", v)} ph="Street, city, country" area />
                  <div className="ink-fgrid">
                    <F label="Tax / VAT Registration #" v={f.tax_reg ?? ""} on={(v) => set("tax_reg", v)} ph="Optional" />
                    <div className="ink-fg">
                      <label>Business Type</label>
                      <select value={f.business_type} onChange={(e) => set("business_type", e.target.value)}>
                        {BIZ_TYPES.map((b) => <option key={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </>
            ) : tab === "reminders" ? (
              <>
                <div className="ink-card-head"><span>Automatic Payment Reminders</span></div>
                <div className="ink-card-body">
                  <p className="ink-hint">
                    When an invoice passes its due date, Zarbill emails your client for you, so you never
                    have to write the awkward &ldquo;just following up&rdquo; email yourself.
                  </p>
                  <button type="button" className={"ink-switch-row" + (remOn ? " on" : "")} onClick={toggleReminders} disabled={remBusy}>
                    <span className="ink-switch"><span /></span>
                    <span>
                      <strong>{remOn ? "Reminders are ON" : "Reminders are OFF"}</strong><br />
                      <span className="ink-switch-sub">{remBusy ? "Saving..." : "Click to turn " + (remOn ? "off" : "on")}</span>
                    </span>
                  </button>
                  {remMsg && <p className="ink-ok" style={{ marginTop: 12 }}>{remMsg}</p>}
                  <div className="ink-sched">
                    <div><b>3 days</b> after the due date<span>Friendly reminder</span></div>
                    <div><b>10 days</b> after the due date<span>Firmer: &ldquo;this invoice is overdue&rdquo;</span></div>
                    <div><b>21 days</b> after the due date<span>Final reminder</span></div>
                  </div>
                  <p className="ink-hint" style={{ marginTop: 18, marginBottom: 0 }}>
                    Emails go out under your business name with a link to the invoice, and your client&rsquo;s
                    replies go straight to {tenant.email ? <strong>{tenant.email}</strong> : "your business email (add it under Business)"}.
                    Reminders stop the moment you mark an invoice paid. In your invoice list you&rsquo;ll see
                    when a client has <strong>viewed</strong> the invoice and how many reminders were sent.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="ink-card-head"><span>Invoice Defaults</span></div>
                <div className="ink-card-body">
                  <p className="ink-hint">Applied automatically to every new invoice you create.</p>
                  <div className="ink-fgrid">
                    <div className="ink-fg">
                      <label>Currency</label>
                      <select value={f.currency} onChange={(e) => set("currency", e.target.value)}>
                        {Object.keys(CURRENCY_SYMBOLS).map((c) => (
                          <option key={c} value={c}>{c} ({CURRENCY_SYMBOLS[c]})</option>
                        ))}
                      </select>
                    </div>
                    <div className="ink-fg">
                      <label>Payment Terms (days)</label>
                      <input type="number" min="0" value={f.payment_terms}
                        onChange={(e) => set("payment_terms", parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div className="ink-fgrid">
                    <div className="ink-fg">
                      <label>Default Tax Rate (%)</label>
                      <input type="number" step="0.1" min="0" value={f.default_tax_rate}
                        onChange={(e) => set("default_tax_rate", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="ink-fg">
                      <label>Next Invoice Number</label>
                      <input type="number" min="1" value={f.next_invoice_number}
                        onChange={(e) => set("next_invoice_number", parseInt(e.target.value) || 1001)} />
                    </div>
                  </div>
                  <F label="Default Payment Instructions" v={f.invoice_notes ?? ""} on={(v) => set("invoice_notes", v)}
                    ph="Bank name / Account number / Reference: invoice number" area />
                  <F label="Invoice Footer Message" v={f.footer_message ?? ""} on={(v) => set("footer_message", v)}
                    ph="Thank you for your business!" />
                </div>
              </>
            )}

            {tab !== "reminders" && (
            <div className="ink-card-foot">
              {err && <span className="ink-err">{err}</span>}
              {msg && <span className="ink-ok">{msg}</span>}
              <button className="ink-btn ink-btn-primary" onClick={save} disabled={busy}>
                {busy ? "Saving..." : "Save Changes"}
              </button>
            </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function F({ label, v, on, ph, type = "text", area = false }: {
  label: string; v: string; on: (v: string) => void; ph?: string; type?: string; area?: boolean;
}) {
  return (
    <div className="ink-fg">
      <label>{label}</label>
      {area
        ? <textarea value={v} onChange={(e) => on(e.target.value)} placeholder={ph} />
        : <input type={type} value={v} onChange={(e) => on(e.target.value)} placeholder={ph} />}
    </div>
  );
}

const css = `
.ink-topbar { position: sticky; top: 0; z-index: 40; background: rgba(10,10,13,0.85); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); padding: 0 32px; height: 60px; display: flex; align-items: center; justify-content: space-between; }
.ink-tb-title { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
.ink-page { padding: 32px; }
.ink-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: 'Syne', sans-serif; transition: all 0.15s; }
.ink-btn-primary { background: var(--electric); color: var(--ink); box-shadow: 0 0 20px rgba(79,255,176,0.2); }
.ink-btn-primary:hover { background: #6fffbe; }
.ink-btn-primary:disabled { opacity: 0.6; cursor: default; }
.ink-settings { display: grid; grid-template-columns: 190px 1fr; gap: 20px; max-width: 900px; }
.ink-snav { display: flex; flex-direction: column; gap: 4px; }
.ink-snav-item { padding: 10px 14px; border-radius: 8px; font-size: 13px; cursor: pointer; color: var(--muted2); transition: all 0.15s; }
.ink-snav-item:hover { background: rgba(255,255,255,0.04); color: var(--text); }
.ink-snav-item.active { background: rgba(79,255,176,0.08); color: var(--electric); }
.ink-card { background: var(--ink2); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
.ink-card-head { padding: 18px 24px; border-bottom: 1px solid var(--border); font-size: 14px; font-weight: 600; }
.ink-card-body { padding: 24px; }
.ink-card-foot { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: flex-end; gap: 14px; }
.ink-hint { color: var(--muted); font-size: 12px; margin: 0 0 20px; line-height: 1.6; }
.ink-fgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.ink-fg { margin-bottom: 16px; }
.ink-fg label { display: block; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 7px; }
.ink-fg input, .ink-fg select, .ink-fg textarea { width: 100%; background: var(--ink3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 10px 13px; font-family: 'Syne', sans-serif; font-size: 13px; outline: none; }
.ink-fg input:focus, .ink-fg select:focus, .ink-fg textarea:focus { border-color: var(--electric); box-shadow: 0 0 0 3px rgba(79,255,176,0.08); }
.ink-fg textarea { resize: vertical; min-height: 80px; }
.ink-fg select option { background: var(--ink3); }
.ink-err { color: var(--electric3); font-size: 13px; }
.ink-ok { color: var(--electric); font-size: 13px; }
.ink-switch-row { display: flex; align-items: center; gap: 14px; width: 100%; text-align: left; background: var(--ink3); border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; cursor: pointer; color: var(--text); font-family: 'Syne', sans-serif; font-size: 14px; }
.ink-switch-row:disabled { opacity: 0.7; cursor: default; }
.ink-switch { width: 44px; height: 24px; border-radius: 20px; background: var(--ink4); position: relative; flex-shrink: 0; transition: background 0.15s; }
.ink-switch span { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: var(--muted2); transition: all 0.15s; }
.ink-switch-row.on .ink-switch { background: rgba(79,255,176,0.25); }
.ink-switch-row.on .ink-switch span { left: 23px; background: var(--electric); }
.ink-switch-sub { font-size: 11px; color: var(--muted); font-family: 'JetBrains Mono', monospace; }
.ink-sched { margin-top: 20px; display: grid; gap: 8px; }
.ink-sched div { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 12px 16px; border: 1px solid var(--border); border-radius: 10px; font-size: 13px; color: var(--muted2); }
.ink-sched b { color: var(--text); }
.ink-sched span { color: var(--electric2); font-size: 12px; }
@media (max-width: 760px) { .ink-settings { grid-template-columns: 1fr; } .ink-fgrid { grid-template-columns: 1fr; } }
`;
