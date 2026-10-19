"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { money, CURRENCY_SYMBOLS } from "@/lib/format";
import { unwrap } from "@/lib/result";
import {
  SOURCES, FIELDS, readStatement, normaliseLines,
  type SourceId, type Mapping, type ParsedStatement, type StatementLine, type Skipped,
} from "@/lib/statements";
import { allocate, confidence, type OpenInvoice, type Candidate } from "@/lib/reconcile";
import { prepareMatches, applyMatches, type Prepared } from "@/lib/db/reconcile";

type Row = {
  line: StatementLine; candidates: Candidate[]; duplicate: boolean;
  invoiceId: string; amount: string; fee: string; home: string; estimated: boolean; note: string | null;
  checked: boolean; score: number;
};

/** First view of a statement line: the suggested invoice (if any) and its amounts. */
function makeRow(r: Prepared["rows"][number], p: Prepared): Row {
  const inv = r.chosen ? p.invoices.find((i) => i.id === r.chosen!.invoiceId) ?? null : null;
  const a = inv ? allocate(r.line, inv, p.home, (f, t) => p.rates[f + ">" + t] ?? null) : null;
  return {
    line: r.line, candidates: r.candidates, duplicate: r.duplicate,
    invoiceId: inv?.id ?? "", score: r.chosen?.score ?? 0,
    amount: a ? a.amount.toFixed(2) : "", fee: a ? a.fee.toFixed(2) : "", home: a ? a.home.toFixed(2) : "",
    estimated: a?.estimated ?? false, note: a?.note ?? null,
    // Only clear, undisputed, not-yet-imported matches start ticked.
    checked: !!r.chosen && confidence(r.chosen.score) === "high" && !r.duplicate && !inv?.disputed,
  };
}

export function ReconcileView({ homeCurrency, openCount }: { homeCurrency: string; openCount: number }) {
  const router = useRouter();
  const [source, setSource] = useState<SourceId>("auto");
  const [fileName, setFileName] = useState("");
  const [st, setSt] = useState<ParsedStatement | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [amountIsNet, setAmountIsNet] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [dateOrder, setDateOrder] = useState<"auto" | "dmy" | "mdy" | "ymd">("auto");
  const [showCols, setShowCols] = useState(false);
  const [prep, setPrep] = useState<Prepared | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [skipped, setSkipped] = useState<Skipped[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ created: number; duplicates: number; errors: string[] } | null>(null);

  const invById = useMemo(() => new Map((prep?.invoices ?? []).map((i) => [i.id, i])), [prep]);
  const home = prep?.home || homeCurrency;

  function reset() {
    setSt(null); setPrep(null); setRows([]); setSkipped([]); setDone(null); setErr(null); setFileName("");
  }

  async function onFile(f: File | undefined) {
    reset();
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { setErr("That file is over 8 MB. Export a shorter date range."); return; }
    const parsed = readStatement(await f.text(), source, homeCurrency);
    if (!parsed) { setErr("Couldn't read any rows. Make sure it's a CSV export, not a PDF."); return; }
    setFileName(f.name); setSt(parsed); setMapping(parsed.mapping);
    setAmountIsNet(parsed.amountIsNet); setCurrency(parsed.defaultCurrency);
    const missing = parsed.mapping.date === undefined || (parsed.mapping.amount === undefined && parsed.mapping.money_in === undefined);
    setShowCols(missing || parsed.source === "bank");
  }

  const crossRate = (from: string, to: string) => prep?.rates[from + ">" + to] ?? null;

  async function findMatches() {
    if (!st) return;
    setErr(null); setBusy(true);
    try {
      const { lines, skipped } = normaliseLines(st, mapping, { amountIsNet, currency, homeCurrency, dateOrder });
      setSkipped(skipped);
      if (lines.length === 0) { setErr("No incoming payments found in this file. Check the columns below."); setShowCols(true); return; }
      const p = unwrap(await prepareMatches(lines, st.source));
      setPrep(p);
      setRows(p.rows.map((r) => makeRow(r, p)));
    } catch (e: any) { setErr(e?.message || "Couldn't read that statement."); }
    finally { setBusy(false); }
  }

  function chooseInvoice(idx: number, invoiceId: string) {
    setRows((rs) => rs.map((r, i) => {
      if (i !== idx) return r;
      const inv = invById.get(invoiceId);
      if (!inv) return { ...r, invoiceId: "", amount: "", fee: "", home: "", checked: false, note: null, score: 0 };
      const a = allocate(r.line, inv, home, crossRate);
      const c = r.candidates.find((x) => x.invoiceId === invoiceId);
      return { ...r, invoiceId, amount: a.amount.toFixed(2), fee: a.fee.toFixed(2), home: a.home.toFixed(2),
        estimated: a.estimated, note: a.note, checked: true, score: c?.score ?? 0 };
    }));
  }
  const edit = (idx: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const ticked = rows.filter((r) => r.checked && r.invoiceId && !r.duplicate);
  const counts = {
    high: rows.filter((r) => r.invoiceId && confidence(r.score) === "high" && !r.duplicate).length,
    check: rows.filter((r) => r.invoiceId && confidence(r.score) !== "high" && !r.duplicate).length,
    none: rows.filter((r) => !r.invoiceId && !r.duplicate).length,
    dup: rows.filter((r) => r.duplicate).length,
  };

  async function record() {
    if (!st || ticked.length === 0) return;
    // Two lines can't both settle more than an invoice's balance.
    const per = new Map<string, number>();
    for (const r of ticked) per.set(r.invoiceId, (per.get(r.invoiceId) || 0) + (parseFloat(r.amount) || 0));
    for (const [id, sum] of per) {
      const inv = invById.get(id);
      if (inv && sum > inv.balance + 0.01) { setErr(`${inv.number}: the ticked payments add up to more than the ${money(inv.balance, inv.currency)} still owed.`); return; }
    }
    if (!confirm(`Record ${ticked.length} payment${ticked.length === 1 ? "" : "s"}?`)) return;
    setBusy(true); setErr(null);
    try {
      const res = unwrap(await applyMatches(st.source, ticked.map((r) => ({
        invoiceId: r.invoiceId, amount: parseFloat(r.amount) || 0, fee: parseFloat(r.fee) || 0,
        home: parseFloat(r.home) || 0, estimated: r.estimated, date: r.line.date,
        sourceRef: r.line.sourceRef, payer: r.line.payer, reference: r.line.reference,
      }))));
      setDone(res);
      router.refresh();
    } catch (e: any) { setErr(e?.message || "Couldn't record the payments."); }
    finally { setBusy(false); }
  }

  const srcLabel = (id: string) => SOURCES.find((s) => s.id === id)?.label ?? id;

  return (
    <>
      <style>{css}</style>
      <div className="ink-topbar"><div className="ink-tb-title">Match payments</div></div>
      <div className="ink-page rc-wrap">
        {done ? (
          <div className="rc-card rc-done">
            <h3>{done.created} payment{done.created === 1 ? "" : "s"} recorded</h3>
            <p>
              Invoices, the dashboard and Insights now show what was paid, the fees, and what landed in {home}.
              {done.duplicates > 0 && ` ${done.duplicates} line${done.duplicates === 1 ? " was" : "s were"} already imported and skipped.`}
            </p>
            {done.errors.length > 0 && <ul className="rc-errs">{done.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
            <div className="rc-actions">
              <a className="ink-btn ink-btn-primary" href="/app/invoices">View invoices</a>
              <button className="ink-btn ink-btn-ghost" onClick={reset}>Match another statement</button>
            </div>
          </div>
        ) : !prep ? (
          <div className="rc-card">
            <h2 className="rc-h">Upload a statement</h2>
            <p className="rc-sub">
              Export your transactions from Payoneer, Wise, PayPal, Grey or your bank as a CSV file. Zarbill finds the client
              payments, matches each one to its invoice, and fills in the fees and what landed in {homeCurrency}. Nothing is
              saved until you confirm.
              {openCount === 0 && <strong> You have no unpaid invoices right now, so there&apos;s nothing to match yet.</strong>}
            </p>
            <div className="rc-grid">
              <div className="ink-fg">
                <label>Where is it from?</label>
                <select value={source} onChange={(e) => { setSource(e.target.value as SourceId); reset(); }}>
                  {SOURCES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                {SOURCES.find((s) => s.id === source)?.hint && <small className="rc-hint">Usually: {SOURCES.find((s) => s.id === source)!.hint}. Menus vary.</small>}
              </div>
              <label className="rc-drop">
                <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} />
                <strong>{fileName || "Choose a CSV file"}</strong>
                <span>{st ? `${srcLabel(st.source)} statement · ${st.rows.length} rows` : "or drag it here"}</span>
              </label>
            </div>

            {st && (
              <>
                <div className="rc-opts">
                  {(mapping.currency === undefined || mapping.currency < 0) && (
                    <div className="ink-fg">
                      <label>Currency of this statement</label>
                      <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                        {Object.keys(CURRENCY_SYMBOLS).map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="ink-fg">
                    <label>Dates in the file</label>
                    <select value={dateOrder} onChange={(e) => setDateOrder(e.target.value as typeof dateOrder)}>
                      <option value="auto">Detect automatically</option>
                      <option value="dmy">Day first (31/12/2026)</option>
                      <option value="mdy">Month first (12/31/2026)</option>
                      <option value="ymd">Year first (2026-12-31)</option>
                    </select>
                  </div>
                  <label className="rc-check">
                    <input type="checkbox" checked={amountIsNet} onChange={(e) => setAmountIsNet(e.target.checked)} />
                    <span>Amounts are already after fees{st.source === "wise" ? " (normal for Wise)" : ""}</span>
                  </label>
                </div>

                <button className="rc-toggle" onClick={() => setShowCols(!showCols)}>{showCols ? "Hide" : "Check"} columns</button>
                {showCols && (
                  <div className="rc-map">
                    {FIELDS.map((f) => (
                      <div className="rc-map-row" key={f.key}>
                        <span>{f.label}{(f.key === "date" || f.key === "amount") && <b> *</b>}</span>
                        <select value={mapping[f.key] ?? -1} onChange={(e) => setMapping({ ...mapping, [f.key]: parseInt(e.target.value, 10) })}>
                          <option value={-1}>—</option>
                          {st.headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rc-actions">
                  <button className="ink-btn ink-btn-primary" onClick={findMatches} disabled={busy}>{busy ? "Matching..." : "Find matches"}</button>
                </div>
              </>
            )}
            {err && <p className="ink-err">{err}</p>}
          </div>
        ) : (
          <>
            <div className="rc-summary">
              <div><b>{rows.length}</b> incoming payment{rows.length === 1 ? "" : "s"} in {fileName}</div>
              <div className="ok"><b>{counts.high}</b> clear match{counts.high === 1 ? "" : "es"}</div>
              <div className="mid"><b>{counts.check}</b> to check</div>
              <div><b>{counts.none}</b> not matched</div>
              {counts.dup > 0 && <div><b>{counts.dup}</b> already imported</div>}
            </div>

            <div className="rc-card rc-tbl-wrap">
              <table className="rc-tbl">
                <thead>
                  <tr><th /><th>Received</th><th>From / reference</th><th className="r">Amount</th><th>Invoice</th><th className="r">Credit to invoice</th><th className="r">Fees ({home})</th><th className="r">Landed ({home})</th></tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const inv = r.invoiceId ? invById.get(r.invoiceId) : null;
                    const conf = r.invoiceId ? confidence(r.score) : "none";
                    const reasons = r.candidates.find((c) => c.invoiceId === r.invoiceId)?.reasons ?? [];
                    return (
                      <tr key={r.line.key} className={r.duplicate ? "dup" : ""}>
                        <td><input type="checkbox" checked={r.checked} disabled={!r.invoiceId || r.duplicate}
                          onChange={(e) => edit(idx, { checked: e.target.checked })} aria-label="Record this payment" /></td>
                        <td className="mono">{r.line.date || "—"}</td>
                        <td className="from">
                          <div>{r.line.payer || r.line.text.split(" · ")[0]}</div>
                          {r.line.payer && <small>{r.line.text}</small>}
                          {r.duplicate && <span className="tag">Already imported</span>}
                        </td>
                        <td className="r mono">
                          {money(r.line.gross, r.line.currency)}
                          {r.line.fee > 0 && <small>fee {money(r.line.fee, r.line.currency)}</small>}
                        </td>
                        <td className="inv">
                          <select value={r.invoiceId} disabled={r.duplicate} onChange={(e) => chooseInvoice(idx, e.target.value)}>
                            <option value="">— Not an invoice payment —</option>
                            {r.candidates.length > 0 && (
                              <optgroup label="Suggested">
                                {r.candidates.map((c) => { const i = invById.get(c.invoiceId)!; return <option key={c.invoiceId} value={c.invoiceId}>{i.number} · {i.client_name || "—"} · {money(i.balance, i.currency)} ({c.score})</option>; })}
                              </optgroup>
                            )}
                            <optgroup label="All unpaid invoices">
                              {(prep.invoices).map((i: OpenInvoice) => <option key={i.id} value={i.id}>{i.number} · {i.client_name || "—"} · {money(i.balance, i.currency)}</option>)}
                            </optgroup>
                          </select>
                          {r.invoiceId && (
                            <div className={"conf " + conf}>
                              {conf === "high" ? "Clear match" : conf === "check" ? "Please check" : "Your choice"}
                              {reasons.length > 0 && <span> · {reasons.join(" · ")}</span>}
                            </div>
                          )}
                          {inv?.disputed && <div className="conf check">Invoice is marked disputed</div>}
                        </td>
                        <td className="r">
                          {r.invoiceId && <><input className="num" value={r.amount} onChange={(e) => edit(idx, { amount: e.target.value })} /><small>{inv?.currency}</small></>}
                        </td>
                        <td className="r">{r.invoiceId && <input className="num" value={r.fee} onChange={(e) => edit(idx, { fee: e.target.value })} />}</td>
                        <td className="r">
                          {r.invoiceId && <>
                            <input className="num" value={r.home} onChange={(e) => edit(idx, { home: e.target.value, estimated: false })} />
                            {r.estimated && <small className="est">estimate</small>}
                          </>}
                          {r.note && <small className="note">{r.note}</small>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {skipped.length > 0 && (
              <details className="rc-skipped">
                <summary>{skipped.length} line{skipped.length === 1 ? "" : "s"} skipped (conversions, transfers, pending)</summary>
                {skipped.slice(0, 50).map((s, i) => <div key={i}>Row {s.row}: {s.reason}{s.text ? " · " + s.text : ""}</div>)}
              </details>
            )}

            <div className="rc-bar">
              <span>
                {ticked.length} payment{ticked.length === 1 ? "" : "s"} ticked.
                {ticked.some((r) => r.estimated) && <> Money still sitting in a {ticked.find((r) => r.estimated)!.line.currency} balance shows an <em>estimate</em> in {home}; update it from the invoice&apos;s Payments panel once you&apos;ve converted.</>}
              </span>
              <div className="rc-actions">
                <button className="ink-btn ink-btn-ghost" onClick={reset} disabled={busy}>Start over</button>
                <button className="ink-btn ink-btn-primary" onClick={record} disabled={busy || ticked.length === 0}>
                  {busy ? "Recording..." : `Record ${ticked.length} payment${ticked.length === 1 ? "" : "s"}`}
                </button>
              </div>
            </div>
            {err && <p className="ink-err">{err}</p>}
          </>
        )}
      </div>
    </>
  );
}

const css = `
.ink-topbar { position: sticky; top: 0; z-index: 40; background: rgba(10,10,13,0.85); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); padding: 0 32px; height: 60px; display: flex; align-items: center; }
.ink-tb-title { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
.ink-page { padding: 32px; }
.ink-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: 'Syne', sans-serif; white-space: nowrap; text-decoration: none; }
.ink-btn-primary { background: var(--electric); color: var(--ink); box-shadow: 0 0 20px rgba(79,255,176,0.2); }
.ink-btn-primary:hover { background: #6fffbe; }
.ink-btn:disabled { opacity: 0.5; cursor: default; }
.ink-btn-ghost { background: rgba(255,255,255,0.04); color: var(--text); border: 1px solid var(--border2); }
.ink-fg label { display: block; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 7px; }
.ink-fg select, .rc-map select, .rc-tbl select { width: 100%; background: var(--ink3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 9px 11px; font-family: 'Syne', sans-serif; font-size: 13px; outline: none; }
.ink-err { color: var(--electric3); font-size: 13px; margin: 14px 0 0; }
.rc-wrap { max-width: 1200px; }
.rc-card { background: var(--ink2); border: 1px solid var(--border); border-radius: 16px; padding: 24px; }
.rc-h { font-family: 'Instrument Serif', serif; font-weight: 400; font-size: 26px; margin: 0 0 8px; }
.rc-sub { color: var(--muted2); font-size: 13px; line-height: 1.7; margin: 0 0 20px; max-width: 760px; }
.rc-sub strong { color: var(--gold); font-weight: 600; }
.rc-grid { display: grid; grid-template-columns: 260px 1fr; gap: 18px; align-items: start; }
.rc-hint { display: block; color: var(--muted); font-size: 11px; margin-top: 7px; line-height: 1.5; }
.rc-drop { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; border: 1.5px dashed var(--border2); border-radius: 12px; padding: 26px 16px; cursor: pointer; position: relative; text-align: center; min-height: 92px; }
.rc-drop:hover { border-color: var(--electric); }
.rc-drop input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.rc-drop strong { color: var(--electric); font-size: 14px; }
.rc-drop span { color: var(--muted); font-size: 12px; }
.rc-opts { display: grid; grid-template-columns: repeat(3, minmax(0, 240px)); gap: 16px; margin-top: 20px; align-items: end; }
.rc-check { display: flex; gap: 8px; align-items: center; font-size: 13px; color: var(--muted2); padding-bottom: 10px; cursor: pointer; }
.rc-check input { accent-color: var(--electric); }
.rc-toggle { background: none; border: none; color: var(--electric); font-size: 12px; cursor: pointer; padding: 0; margin-top: 14px; font-family: 'Syne', sans-serif; }
.rc-map { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-top: 12px; }
.rc-map-row { display: grid; grid-template-columns: 1fr 1.2fr; gap: 10px; align-items: center; font-size: 12px; color: var(--muted2); }
.rc-map-row b { color: var(--electric3); }
.rc-actions { display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end; flex-wrap: wrap; }
.rc-summary { display: flex; flex-wrap: wrap; gap: 8px 22px; font-size: 13px; color: var(--muted2); margin-bottom: 14px; }
.rc-summary b { color: var(--text); font-family: 'JetBrains Mono', monospace; }
.rc-summary .ok b { color: var(--electric); } .rc-summary .mid b { color: var(--gold); }
.rc-tbl-wrap { padding: 0; overflow-x: auto; }
.rc-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.rc-tbl th { text-align: left; padding: 10px 12px; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: 1.3px; text-transform: uppercase; color: var(--muted); background: var(--ink3); white-space: nowrap; }
.rc-tbl td { padding: 12px; border-top: 1px solid var(--border); vertical-align: top; }
.rc-tbl .r { text-align: right; }
.rc-tbl .mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; white-space: nowrap; }
.rc-tbl small { display: block; color: var(--muted); font-size: 10.5px; margin-top: 4px; line-height: 1.4; }
.rc-tbl .from { max-width: 260px; }
.rc-tbl .from small { overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.rc-tbl .inv { min-width: 260px; }
.rc-tbl .conf { font-size: 11px; margin-top: 6px; line-height: 1.45; color: var(--muted2); }
.rc-tbl .conf.high { color: var(--electric); } .rc-tbl .conf.check { color: var(--gold); }
.rc-tbl .conf span { color: var(--muted); }
.rc-tbl .num { width: 96px; background: var(--ink3); border: 1px solid var(--border); border-radius: 6px; color: var(--text); padding: 7px 8px; font-family: 'JetBrains Mono', monospace; font-size: 12px; text-align: right; outline: none; }
.rc-tbl .num:focus { border-color: var(--electric); }
.rc-tbl .est { color: var(--gold); }
.rc-tbl .note { color: var(--electric2); max-width: 160px; margin-left: auto; }
.rc-tbl tr.dup td { opacity: 0.45; }
.rc-tbl .tag { display: inline-block; margin-top: 4px; font-size: 10px; background: rgba(110,110,136,0.25); padding: 2px 7px; border-radius: 8px; }
.rc-tbl input[type=checkbox] { accent-color: var(--electric); width: 16px; height: 16px; margin-top: 2px; }
.rc-skipped { margin: 14px 0 0; color: var(--muted); font-size: 12px; }
.rc-skipped summary { cursor: pointer; margin-bottom: 6px; }
.rc-skipped div { padding: 3px 0; }
.rc-bar { margin-top: 16px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; font-size: 12px; color: var(--muted2); }
.rc-bar .rc-actions { margin-top: 0; }
.rc-done h3 { margin: 0 0 8px; font-size: 20px; }
.rc-done p { color: var(--muted2); font-size: 13px; line-height: 1.7; margin: 0; }
.rc-errs { color: var(--electric3); font-size: 12px; }
@media (max-width: 760px) {
  .ink-page { padding: 20px 16px; }
  .rc-grid, .rc-opts, .rc-map { grid-template-columns: 1fr; }
}
`;
