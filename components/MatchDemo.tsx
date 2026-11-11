"use client";
// components/MatchDemo.tsx
// -----------------------------------------------------------------------------
// A short, self-playing walkthrough of statement matching, with example data.
// Used on the landing page and on the locked Match payments page (Free plan).
// Three steps: upload a statement -> review the suggested matches -> done.
// It plays on its own, pauses when you hover or pick a step, and stays still
// for visitors who prefer reduced motion. Styles are self-contained.
// -----------------------------------------------------------------------------
import { useEffect, useState } from "react";

type Row = {
  date: string; payer: string; amount: string;
  invoice: string | null; level: "high" | "check" | "none"; reason: string; ticked: boolean;
};

const ROWS: Row[] = [
  { date: "14 Oct", payer: "Luminary Media", amount: "$2,060.00", invoice: "INV-1042", level: "high", reason: "Reference mentions INV-1042. Amount equals the balance.", ticked: true },
  { date: "17 Oct", payer: "BRIGHTSIDE INC", amount: "$1,180.00", invoice: "INV-1038", level: "check", reason: "Payer looks like Bright Side, Inc. $20 short, probably a transfer fee.", ticked: true },
  { date: "21 Oct", payer: "Northwind Studio", amount: "$450.00", invoice: "INV-1040", level: "high", reason: "Payer and amount both match.", ticked: true },
  { date: "25 Oct", payer: "J. Peters", amount: "$75.00", invoice: null, level: "none", reason: "No invoice fits. Left for you to decide.", ticked: false },
];

const STEPS = ["Upload your statement", "Check the matches", "Done"];
const STEP_MS = [3200, 5200, 4600];
const LEVEL_LABEL = { high: "High confidence", check: "Please check", none: "No match" } as const;

export function MatchDemo({ isZA = true }: { isZA?: boolean }) {
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (!auto || hover) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), STEP_MS[step]);
    return () => clearTimeout(t);
  }, [step, auto, hover]);

  const provider = isZA ? "Payoneer" : "Wise";
  const file = (isZA ? "payoneer" : "wise") + "-october.csv";
  const landed = isZA ? "R 63 283.50" : "$3,616.20";

  return (
    <div className="md" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <style>{css}</style>
      <div className="md-tabs" role="tablist" aria-label="Matching walkthrough">
        {STEPS.map((label, i) => (
          <button key={label} role="tab" aria-selected={step === i} className={"md-tab" + (step === i ? " on" : "") + (i < step ? " past" : "")}
            onClick={() => { setStep(i); setAuto(false); }}>
            <span className="md-tab-n">{i < step ? "✓" : i + 1}</span>
            <span className="md-tab-l">{label}</span>
          </button>
        ))}
      </div>

      <div className="md-stage" key={step} role="tabpanel">
        {step === 0 && (
          <div className="md-upload">
            <div className="md-drop">
              <div className="md-file">
                <span className="md-file-ic">CSV</span>
                <span>
                  <strong>{file}</strong>
                  <em>{provider} statement, exported from your account</em>
                </span>
              </div>
              <div className="md-prog"><div className="md-prog-fill" /></div>
            </div>
            <ul className="md-found">
              <li><b>4</b> incoming payments found</li>
              <li><b>3</b> lines skipped: fees, withdrawals and currency conversions</li>
              <li>Read in your browser. Nothing is saved until you confirm.</li>
            </ul>
          </div>
        )}

        {step === 1 && (
          <div className="md-review">
            {ROWS.map((r, i) => (
              <div className={"md-row " + r.level} key={r.payer} style={{ animationDelay: i * 0.12 + "s" }}>
                <span className={"md-tick" + (r.ticked ? " on" : "")} aria-hidden="true">{r.ticked ? "✓" : ""}</span>
                <span className="md-pay">
                  <strong>{r.payer}</strong>
                  <em>{r.date} · {r.amount}</em>
                </span>
                <span className="md-arrow" aria-hidden="true">→</span>
                <span className="md-inv">
                  <strong>{r.invoice ?? "Choose an invoice"}</strong>
                  <em>{r.reason}</em>
                </span>
                <span className={"md-pill " + r.level}>{LEVEL_LABEL[r.level]}</span>
              </div>
            ))}
            <div className="md-bar">
              <span>You stay in control: untick or change any match.</span>
              <span className="md-btn">Record 3 payments</span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="md-done">
            <div className="md-done-h"><span className="md-big-tick">✓</span> 3 invoices marked paid</div>
            <div className="md-sum">
              <div><span>Clients paid</span><b>$3,690.00</b></div>
              <div><span>{provider} fees</span><b>−$73.80</b></div>
              {isZA && <div><span>Converted at</span><b>R 17.50 per $</b></div>}
              <div className="md-sum-tot"><span>Landed in your account</span><b>{landed}</b></div>
            </div>
            <p className="md-done-p">
              Reminders stop for those invoices, the fees go into your tax-year report, and
              uploading the same statement again never records a payment twice.
            </p>
          </div>
        )}
      </div>
      <div className="md-foot">
        <span>Example data</span>
        {!auto && <button className="md-replay" onClick={() => { setStep(0); setAuto(true); }}>Play again</button>}
      </div>
    </div>
  );
}

const css = `
.md { background: #111116; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden; max-width: 860px; font-family: 'Syne', system-ui, sans-serif; color: #f0f0f8; text-align: left; }
.md-tabs { display: grid; grid-template-columns: repeat(3, 1fr); border-bottom: 1px solid rgba(255,255,255,0.08); }
.md-tab { display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: none; border: 0; border-bottom: 2px solid transparent; color: #8b8ba6; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; text-align: left; }
.md-tab + .md-tab { border-left: 1px solid rgba(255,255,255,0.08); }
.md-tab.on { color: #f0f0f8; border-bottom-color: #4fffb0; background: rgba(79,255,176,0.05); }
.md-tab:focus-visible { outline: 2px solid #4fffb0; outline-offset: -2px; }
.md-tab-n { width: 22px; height: 22px; border-radius: 11px; border: 1px solid rgba(255,255,255,0.2); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
.md-tab.on .md-tab-n { border-color: #4fffb0; color: #4fffb0; }
.md-tab.past .md-tab-n { background: #4fffb0; border-color: #4fffb0; color: #0a0a0d; }
.md-stage { padding: 22px; min-height: 348px; animation: md-in 0.35s ease both; }
@keyframes md-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

.md-drop { border: 1.5px dashed rgba(79,255,176,0.4); border-radius: 12px; padding: 22px; background: rgba(79,255,176,0.03); }
.md-file { display: flex; align-items: center; gap: 14px; }
.md-file-ic { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #0a0a0d; background: #4fffb0; border-radius: 6px; padding: 9px 7px; }
.md-file strong { display: block; font-size: 15px; }
.md-file em { display: block; font-style: normal; font-size: 12.5px; color: #8b8ba6; margin-top: 3px; }
.md-prog { height: 5px; border-radius: 3px; background: rgba(255,255,255,0.08); margin-top: 18px; overflow: hidden; }
.md-prog-fill { height: 100%; width: 100%; background: linear-gradient(90deg, #4fffb0, #00d4ff); transform-origin: left; animation: md-prog 1.6s ease-out both; }
@keyframes md-prog { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.md-found { list-style: none; padding: 0; margin: 20px 0 0; font-size: 14px; color: #b8b8d0; line-height: 2; }
.md-found li { opacity: 0; animation: md-in 0.4s ease both; }
.md-found li:nth-child(1) { animation-delay: 1.5s; } .md-found li:nth-child(2) { animation-delay: 1.8s; } .md-found li:nth-child(3) { animation-delay: 2.1s; color: #8b8ba6; font-size: 13px; }
.md-found b { color: #4fffb0; font-family: 'JetBrains Mono', monospace; margin-right: 4px; }

.md-row { display: grid; grid-template-columns: 22px minmax(0, 1fr) 16px minmax(0, 1.5fr) auto; gap: 12px; align-items: center; padding: 11px 0; border-bottom: 1px solid rgba(255,255,255,0.06); opacity: 0; animation: md-in 0.4s ease both; }
.md-row strong { display: block; font-size: 13.5px; font-weight: 600; }
.md-row em { display: block; font-style: normal; font-size: 12px; color: #8b8ba6; margin-top: 2px; line-height: 1.45; }
.md-row.none strong { color: #8b8ba6; }
.md-tick { width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid rgba(255,255,255,0.25); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
.md-tick.on { background: #4fffb0; border-color: #4fffb0; color: #0a0a0d; }
.md-arrow { color: #6e6e88; }
.md-pill { font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: 0.6px; text-transform: uppercase; padding: 4px 8px; border-radius: 20px; white-space: nowrap; }
.md-pill.high { background: rgba(79,255,176,0.12); color: #4fffb0; }
.md-pill.check { background: rgba(255,196,79,0.12); color: #ffc44f; }
.md-pill.none { background: rgba(255,255,255,0.06); color: #8b8ba6; }
.md-bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 16px; font-size: 12.5px; color: #8b8ba6; }
.md-btn { background: #4fffb0; color: #0a0a0d; font-size: 12.5px; font-weight: 700; padding: 9px 14px; border-radius: 8px; animation: md-pulse 1.6s ease-in-out 1.2s infinite; }
@keyframes md-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(79,255,176,0.45); } 50% { box-shadow: 0 0 0 8px rgba(79,255,176,0); } }

.md-done-h { font-size: 19px; font-weight: 700; display: flex; align-items: center; gap: 12px; }
.md-big-tick { width: 30px; height: 30px; border-radius: 15px; background: #4fffb0; color: #0a0a0d; display: inline-flex; align-items: center; justify-content: center; font-size: 15px; animation: md-pop 0.45s cubic-bezier(.2,1.6,.4,1) both; }
@keyframes md-pop { from { transform: scale(0); } to { transform: scale(1); } }
.md-sum { margin-top: 18px; background: rgba(79,255,176,0.05); border: 1px solid rgba(79,255,176,0.2); border-radius: 12px; padding: 14px 16px; max-width: 460px; }
.md-sum div { display: flex; justify-content: space-between; gap: 12px; font-size: 13.5px; color: #b8b8d0; padding: 4px 0; opacity: 0; animation: md-in 0.4s ease both; }
.md-sum div:nth-child(1) { animation-delay: 0.3s; } .md-sum div:nth-child(2) { animation-delay: 0.55s; } .md-sum div:nth-child(3) { animation-delay: 0.8s; } .md-sum div:nth-child(4) { animation-delay: 1.05s; }
.md-sum b { font-family: 'JetBrains Mono', monospace; font-weight: 500; color: #f0f0f8; white-space: nowrap; }
.md-sum .md-sum-tot { border-top: 1px solid rgba(79,255,176,0.2); margin-top: 6px; padding-top: 10px; font-size: 15px; color: #f0f0f8; }
.md-sum .md-sum-tot b { color: #4fffb0; font-weight: 700; }
.md-done-p { font-size: 13px; color: #8b8ba6; line-height: 1.7; margin: 16px 0 0; max-width: 520px; }

.md-foot { display: flex; justify-content: space-between; align-items: center; padding: 10px 22px; border-top: 1px solid rgba(255,255,255,0.06); font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #6e6e88; min-height: 38px; }
.md-replay { background: none; border: 1px solid rgba(255,255,255,0.18); color: #f0f0f8; font: inherit; padding: 4px 10px; border-radius: 6px; cursor: pointer; }

@media (max-width: 640px) {
  .md-tab { padding: 12px 8px; gap: 6px; font-size: 11.5px; flex-direction: column; text-align: center; }
  .md-stage { padding: 16px; min-height: 470px; }
  .md-row { grid-template-columns: 22px minmax(0, 1fr); row-gap: 4px; }
  .md-arrow { display: none; }
  .md-inv, .md-pill { grid-column: 2; }
  .md-pill { justify-self: start; }
}
@media (prefers-reduced-motion: reduce) {
  .md-stage, .md-row, .md-found li, .md-sum div, .md-prog-fill, .md-big-tick, .md-btn { animation: none; opacity: 1; }
}
`;
