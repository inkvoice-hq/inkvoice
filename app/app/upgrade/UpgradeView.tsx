"use client";

import { useState } from "react";

export function UpgradeView({
  plan, clientCount, invoiceCount, isZA = true,
}: { plan: string; clientCount: number; invoiceCount: number; isZA?: boolean }) {
  const currency: "ZAR" | "USD" = isZA ? "ZAR" : "USD";
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const isPaid = plan === "pro" || plan === "business";

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

  // Paystack settles in rand, so everyone is charged in ZAR.
  const price = isZA ? "R99" : "R300";
  return (
    <>
      <style>{css}</style>
      <div className="ink-topbar"><div className="ink-tb-title">Plans &amp; Billing</div></div>

      <div className="ink-page">
        {isPaid ? (
          <div className="ink-current">
            <div className="ink-badge-pro">{plan.toUpperCase()} PLAN — ACTIVE</div>
            <h2>You&apos;re all set.</h2>
            <p>Statement matching and fee and exchange-rate tracking are switched on, alongside unlimited invoicing. Thank you for being a customer.</p>
          </div>
        ) : (
          <>
            <div className="ink-usage">
              <h2>You&apos;re on the Free plan</h2>
              <p className="ink-free-line">
                Invoicing is free, with no limits: unlimited invoices, quotes and clients, plus
                reminders, recurring invoices and Pay now links. So far you have {clientCount}{" "}
                {clientCount === 1 ? "client" : "clients"} and {invoiceCount}{" "}
                {invoiceCount === 1 ? "invoice" : "invoices"}.
              </p>
              <p className="ink-free-line">
                Pro adds the money side: it matches the payments on your statements to your
                invoices and tracks fees and exchange rates, so you know what actually landed.
              </p>
            </div>


            <div className="ink-plans">
              <div className="ink-plan">
                <div className="ink-plan-name">Pro</div>
                <p className="ink-plan-sub">Know exactly what you were paid, without the admin</p>
                <div className="ink-plan-price">{price}<span>/month</span></div>
                {!isZA && <p className="ink-plan-sub">About $17 a month, depending on your bank&apos;s rate</p>}
                <ul>
                  <li>Match payments from Wise, Payoneer, PayPal and bank statements</li>
                  <li>Invoices marked paid for you, after you confirm each match</li>
                  <li>Fees and exchange rates tracked: see what actually landed</li>
                  <li>200 drafted follow-up emails a month (5 on Free)</li>
                  <li>Everything in Free, including unlimited invoicing</li>
                </ul>
                <button className="ink-btn ink-btn-primary" onClick={() => checkout("pro")} disabled={busy !== null}>
                  {busy === "pro" ? "Starting..." : "Upgrade to Pro"}
                </button>
              </div>
            </div>

            {err && <p className="ink-err">{err}</p>}
            <p className="ink-note">
              {isZA ? "Payments are processed securely by Paystack. Cards and EFT supported. " : "Payments are processed securely by Paystack. Your card is charged in South African rand (R300 a month) and your bank converts it to your currency. "}
              Your plan activates automatically once payment is confirmed.
            </p>
          </>
        )}
      </div>
    </>
  );
}

const css = `
.ink-free-line { font-size: 14px; line-height: 1.6; color: var(--muted2); margin: 10px 0 0; max-width: 640px; }
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
.ink-plan li::before { content: "✓  "; color: var(--electric); font-weight: 700; }
.ink-current { background: linear-gradient(135deg, rgba(79,255,176,0.06), rgba(0,212,255,0.06)); border: 1px solid rgba(79,255,176,0.2); border-radius: 16px; padding: 32px; }
.ink-badge-pro { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--electric); letter-spacing: 2px; margin-bottom: 10px; }
.ink-current h2 { font-family: 'Instrument Serif', serif; font-size: 30px; font-weight: 400; margin: 0 0 8px; }
.ink-current p { color: var(--muted2); font-size: 14px; margin: 0; line-height: 1.7; }
.ink-err { color: var(--electric3); font-size: 13px; margin-top: 16px; }
.ink-note { color: var(--muted); font-size: 12px; margin-top: 20px; line-height: 1.7; }
@media (max-width: 760px) { .ink-plans, .ink-bars { grid-template-columns: 1fr; } }
`;
