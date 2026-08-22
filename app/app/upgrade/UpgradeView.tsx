"use client";

import { useState } from "react";
import { PLAN_LIMITS } from "@/lib/plans";

export function UpgradeView({
  plan, clientCount, invoiceCount,
}: { plan: string; clientCount: number; invoiceCount: number }) {
  const [currency, setCurrency] = useState<"ZAR" | "USD">("ZAR");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const isPaid = plan === "pro" || plan === "business";
  const free = PLAN_LIMITS.free;

  async function checkout(target: "pro" | "business") {
    setBusy(target); setErr(null);
    try {
      const res = await fetch("/api/paystack/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: target, currency }),
      });
      const data = await res.json();
      if (data?.url) window.location.href = data.url;
      else setErr(data?.error ?? "Could not start checkout.");
    } catch (e: any) {
      setErr(e?.message ?? "Network error.");
    } finally { setBusy(null); }
  }

  const price = (p: "pro" | "business") =>
    currency === "ZAR"
      ? (p === "pro" ? "R99" : "R699")
      : (p === "pro" ? "$18" : "$49");

  return (
    <>
      <style>{css}</style>
      <div className="ink-topbar"><div className="ink-tb-title">Plans &amp; Billing</div></div>

      <div className="ink-page">
        {isPaid ? (
          <div className="ink-current">
            <div className="ink-badge-pro">{plan.toUpperCase()} PLAN — ACTIVE</div>
            <h2>You&apos;re all set.</h2>
            <p>Unlimited clients and invoices, plus everything Zarbill offers. Thank you for being a customer.</p>
          </div>
        ) : (
          <>
            <div className="ink-usage">
              <h2>You&apos;re on the Free plan</h2>
              <div className="ink-bars">
                <Usage label="Clients" used={clientCount} max={free.maxClients} />
                <Usage label="Invoices" used={invoiceCount} max={free.maxInvoices} />
              </div>
            </div>

            <div className="ink-curr-toggle">
              <button className={currency === "ZAR" ? "on" : ""} onClick={() => setCurrency("ZAR")}>Pay in Rand</button>
              <button className={currency === "USD" ? "on" : ""} onClick={() => setCurrency("USD")}>Pay in USD</button>
            </div>

            <div className="ink-plans">
              <div className="ink-plan">
                <div className="ink-plan-name">Pro</div>
                <p className="ink-plan-sub">For freelancers and creators</p>
                <div className="ink-plan-price">{price("pro")}<span>/month</span></div>
                <ul>
                  <li>Unlimited invoices</li>
                  <li>Unlimited clients</li>
                  <li>Unlimited services</li>
                  <li>Custom branding &amp; multi-currency</li>
                  <li>PDF export</li>
                </ul>
                <button className="ink-btn ink-btn-primary" onClick={() => checkout("pro")} disabled={busy !== null}>
                  {busy === "pro" ? "Starting..." : "Upgrade to Pro"}
                </button>
              </div>

              <div className="ink-plan ink-plan-alt">
                <div className="ink-plan-name">Business</div>
                <p className="ink-plan-sub">For small agencies</p>
                <div className="ink-plan-price">{price("business")}<span>/month</span></div>
                <ul>
                  <li>Everything in Pro</li>
                  <li>Team members (coming soon)</li>
                  <li>Priority support</li>
                </ul>
                <button className="ink-btn ink-btn-violet" onClick={() => checkout("business")} disabled={busy !== null}>
                  {busy === "business" ? "Starting..." : "Upgrade to Business"}
                </button>
              </div>
            </div>

            {err && <p className="ink-err">{err}</p>}
            <p className="ink-note">
              Payments are processed securely by Paystack. Cards and EFT supported.
              Your plan activates automatically once payment is confirmed.
            </p>
          </>
        )}
      </div>
    </>
  );
}

function Usage({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max < 0 ? 0 : Math.min(100, Math.round((used / max) * 100));
  const full = max >= 0 && used >= max;
  return (
    <div className="ink-usage-item">
      <div className="ink-usage-top">
        <span>{label}</span>
        <span className={full ? "ink-full" : ""}>{used} / {max < 0 ? "unlimited" : max}</span>
      </div>
      <div className="ink-bar"><div className="ink-bar-fill" style={{ width: pct + "%", background: full ? "var(--electric3)" : "var(--electric)" }} /></div>
    </div>
  );
}

const css = `
.ink-topbar { position: sticky; top: 0; z-index: 40; background: rgba(10,10,13,0.85); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); padding: 0 32px; height: 60px; display: flex; align-items: center; }
.ink-tb-title { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
.ink-page { padding: 32px; max-width: 860px; }
.ink-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 11px 18px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; font-family: 'Syne', sans-serif; width: 100%; transition: all 0.15s; }
.ink-btn-primary { background: var(--electric); color: var(--ink); }
.ink-btn-primary:hover { background: #6fffbe; }
.ink-btn-violet { background: linear-gradient(135deg, var(--violet), var(--electric2)); color: #fff; }
.ink-btn:disabled { opacity: 0.6; cursor: default; }
.ink-usage { background: var(--ink2); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
.ink-usage h2 { font-family: 'Instrument Serif', serif; font-size: 24px; font-weight: 400; margin: 0 0 18px; }
.ink-bars { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.ink-usage-top { display: flex; justify-content: space-between; font-size: 13px; color: var(--muted2); margin-bottom: 7px; }
.ink-full { color: var(--electric3); font-weight: 600; }
.ink-bar { height: 6px; background: var(--ink4); border-radius: 3px; overflow: hidden; }
.ink-bar-fill { height: 100%; border-radius: 3px; }
.ink-curr-toggle { display: inline-flex; gap: 2px; padding: 4px; background: var(--ink3); border-radius: 10px; margin-bottom: 20px; }
.ink-curr-toggle button { padding: 8px 18px; border-radius: 7px; font-size: 13px; cursor: pointer; border: none; background: none; color: var(--muted2); font-family: 'Syne', sans-serif; font-weight: 500; }
.ink-curr-toggle button.on { background: var(--ink2); color: var(--text); }
.ink-plans { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.ink-plan { background: var(--ink2); border: 1px solid var(--border); border-radius: 16px; padding: 26px; }
.ink-plan-alt { border-color: rgba(184,125,255,0.3); }
.ink-plan-name { font-size: 18px; font-weight: 700; }
.ink-plan-sub { color: var(--muted2); font-size: 13px; margin: 4px 0 18px; }
.ink-plan-price { font-family: 'Instrument Serif', serif; font-size: 40px; line-height: 1; margin-bottom: 20px; }
.ink-plan-price span { font-size: 15px; color: var(--muted2); font-family: 'Syne', sans-serif; }
.ink-plan ul { list-style: none; padding: 0; margin: 0 0 22px; }
.ink-plan li { font-size: 13px; color: var(--muted2); padding: 5px 0; }
.ink-plan li::before { content: "check "; color: var(--electric); font-weight: 700; }
.ink-current { background: linear-gradient(135deg, rgba(79,255,176,0.06), rgba(0,212,255,0.06)); border: 1px solid rgba(79,255,176,0.2); border-radius: 16px; padding: 32px; }
.ink-badge-pro { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--electric); letter-spacing: 2px; margin-bottom: 10px; }
.ink-current h2 { font-family: 'Instrument Serif', serif; font-size: 30px; font-weight: 400; margin: 0 0 8px; }
.ink-current p { color: var(--muted2); font-size: 14px; margin: 0; line-height: 1.7; }
.ink-err { color: var(--electric3); font-size: 13px; margin-top: 16px; }
.ink-note { color: var(--muted); font-size: 12px; margin-top: 20px; line-height: 1.7; }
@media (max-width: 760px) { .ink-plans, .ink-bars { grid-template-columns: 1fr; } }
`;
