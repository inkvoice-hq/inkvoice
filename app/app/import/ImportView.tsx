"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parseCSV, parseAmount, parseDate, detectDateOrder, type DateOrder } from "@/lib/csv";
import { importClients, importInvoices, type ImportResult } from "@/lib/db/import";

type Kind = "clients" | "invoices";
type Field = { key: string; label: string; required?: boolean; synonyms: string[] };

const FIELDS: Record<Kind, Field[]> = {
  clients: [
    { key: "name", label: "Client / company name", required: true, synonyms: ["name", "client", "client name", "customer", "customer name", "company", "company name", "display name", "business name", "organization", "organisation", "account name"] },
    { key: "contact", label: "Contact person", synonyms: ["contact", "contact name", "contact person", "full name", "primary contact", "attention"] },
    { key: "email", label: "Email", synonyms: ["email", "e mail", "email address", "client email", "customer email", "primary email", "contact email", "billing email"] },
    { key: "phone", label: "Phone", synonyms: ["phone", "telephone", "tel", "mobile", "cell", "phone number", "work phone", "contact phone"] },
    { key: "address", label: "Address", synonyms: ["address", "billing address", "street", "street address", "address line 1", "address 1", "billing street", "address1"] },
    { key: "tax_id", label: "Tax / VAT number", synonyms: ["vat", "vat number", "vat no", "tax id", "tax number", "tax no", "tax reg", "tax registration", "vat id", "gst number", "ein"] },
    { key: "website", label: "Website", synonyms: ["website", "web", "url", "site", "web site"] },
    { key: "notes", label: "Notes", synonyms: ["notes", "note", "comments", "comment", "remarks"] },
  ],
  invoices: [
    { key: "number", label: "Invoice number", required: true, synonyms: ["invoice number", "invoice no", "invoice", "number", "invoice id", "inv", "inv no", "inv number", "invoice num", "document number", "reference"] },
    { key: "client", label: "Client name", synonyms: ["client", "client name", "customer", "customer name", "company", "company name", "bill to", "billed to", "display name"] },
    { key: "client_email", label: "Client email", synonyms: ["email", "client email", "customer email", "email address", "billing email"] },
    { key: "issue_date", label: "Issue date", synonyms: ["date", "invoice date", "issue date", "issued", "date issued", "created", "created date", "issued on"] },
    { key: "due_date", label: "Due date", synonyms: ["due date", "due", "due on", "payment due", "date due"] },
    { key: "total", label: "Invoice total", required: true, synonyms: ["total", "invoice total", "total amount", "grand total", "amount", "invoice amount", "total incl tax", "total inc vat"] },
    { key: "amount_paid", label: "Amount paid", synonyms: ["amount paid", "paid", "paid amount", "payments", "total paid", "payment amount"] },
    { key: "balance", label: "Balance due (if no 'paid' column)", synonyms: ["balance", "balance due", "amount due", "outstanding", "due amount", "open balance", "amount outstanding"] },
    { key: "status", label: "Status", synonyms: ["status", "state", "invoice status", "payment status"] },
    { key: "paid_date", label: "Date paid", synonyms: ["paid date", "date paid", "payment date", "paid on", "last payment date"] },
    { key: "description", label: "Description", synonyms: ["description", "memo", "project", "subject", "summary", "title", "notes", "item"] },
    { key: "currency", label: "Currency (if mixed)", synonyms: ["currency", "currency code", "invoice currency", "ccy"] },
  ],
};

const norm = (h: string) => h.toLowerCase().replace(/[#_\-.:()/]+/g, " ").replace(/\s+/g, " ").trim();

function guessMapping(kind: Kind, headers: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  const used = new Set<number>();
  const H = headers.map(norm);
  // exact synonym first, then "contains"
  for (const pass of [0, 1]) {
    for (const f of FIELDS[kind]) {
      if (out[f.key] !== undefined) continue;
      const idx = H.findIndex((h, i) => !used.has(i) && f.synonyms.some((syn) => pass === 0 ? h === syn : h.includes(syn) && syn.length > 3));
      if (idx >= 0) { out[f.key] = idx; used.add(idx); }
    }
  }
  return out;
}

export function ImportView({ initialType }: { initialType: Kind }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>(initialType);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<string[][]>([]);
  const [map, setMap] = useState<Record<string, number>>({});
  const [dateOrder, setDateOrder] = useState<DateOrder>("auto");
  const [remind, setRemind] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const headers = rows[0] ?? [];
  const body = rows.slice(1);

  function reset(k: Kind) { setKind(k); setRows([]); setMap({}); setFileName(""); setResult(null); setErr(null); }

  async function onFile(f: File | undefined) {
    setErr(null); setResult(null);
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setErr("That file is over 5 MB. Split it into smaller files."); return; }
    const text = await f.text();
    const parsed = parseCSV(text);
    if (parsed.length < 2) { setErr("Couldn't find any rows. Make sure it's a CSV file with a header row."); return; }
    setFileName(f.name); setRows(parsed); setMap(guessMapping(kind, parsed[0]));
  }

  const col = (r: string[], k: string) => (map[k] !== undefined && map[k] >= 0 ? (r[map[k]] ?? "") : "");

  const order = useMemo(() => {
    if (dateOrder !== "auto") return dateOrder;
    const samples = body.slice(0, 200).flatMap((r) => [col(r, "issue_date"), col(r, "due_date")]);
    return detectDateOrder(samples);
  }, [dateOrder, body, map]); // eslint-disable-line react-hooks/exhaustive-deps

  const mapped = useMemo(() => {
    if (kind === "clients") {
      return body.map((r) => ({
        name: col(r, "name"), contact: col(r, "contact"), email: col(r, "email"), phone: col(r, "phone"),
        address: col(r, "address"), tax_id: col(r, "tax_id"), website: col(r, "website"), notes: col(r, "notes"),
      }));
    }
    return body.map((r) => {
      const total = parseAmount(col(r, "total"));
      let paid = parseAmount(col(r, "amount_paid"));
      const bal = parseAmount(col(r, "balance"));
      if (paid === null && bal !== null && total !== null) paid = Math.max(0, Math.round((total - bal) * 100) / 100);
      return {
        number: col(r, "number"), client: col(r, "client"), client_email: col(r, "client_email"),
        issue_date: parseDate(col(r, "issue_date"), order), due_date: parseDate(col(r, "due_date"), order),
        total, amount_paid: paid, status: col(r, "status"),
        paid_date: parseDate(col(r, "paid_date"), order), description: col(r, "description"),
        currency: col(r, "currency"),
      };
    });
  }, [kind, body, map, order]); // eslint-disable-line react-hooks/exhaustive-deps

  const missing = FIELDS[kind].filter((f) => f.required && (map[f.key] === undefined || map[f.key] < 0));
  const invalid = kind === "invoices" ? (mapped as any[]).filter((r) => !r.number || r.total === null).length : (mapped as any[]).filter((r) => !r.name && !r.email).length;

  async function runImport() {
    setBusy(true); setErr(null); setResult(null);
    try {
      const total: ImportResult = { created: 0, skipped: 0, limited: 0, messages: [] };
      const size = 500;
      for (let i = 0; i < mapped.length; i += size) {
        const chunk = mapped.slice(i, i + size);
        const r = kind === "clients"
          ? await importClients(chunk as any)
          : await importInvoices(chunk as any, { remind });
        total.created += r.created; total.skipped += r.skipped; total.limited += r.limited;
        for (const m of r.messages) if (!total.messages.includes(m)) total.messages.push(m);
      }
      setResult(total);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Import failed.");
    } finally { setBusy(false); }
  }

  const fmt = (v: any) => (v === null || v === undefined || v === "" ? "—" : String(v));

  return (
    <>
      <style>{css}</style>
      <div className="ink-topbar"><div className="ink-tb-title">Import &amp; export</div></div>

      <div className="ink-page im-wrap">
        <div className="ink-card">
          <div className="ink-card-head"><span>Export your data</span></div>
          <div className="ink-card-body">
            <p className="ink-hint">Download everything as CSV files that open in Excel, Google Sheets or any accounting tool. Your data is always yours.</p>
            <div className="im-exports">
              <a className="ink-btn ink-btn-ghost" href="/app/export/clients">Clients</a>
              <a className="ink-btn ink-btn-ghost" href="/app/export/invoices">Invoices</a>
              <a className="ink-btn ink-btn-ghost" href="/app/export/quotes">Quotes</a>
              <a className="ink-btn ink-btn-ghost" href="/app/export/payments">Payments</a>
            </div>
          </div>
        </div>

        <div className="ink-card">
          <div className="ink-card-head"><span>Import from another tool</span></div>
          <div className="ink-card-body">
            <div className="im-tabs">
              <button className={kind === "clients" ? "on" : ""} onClick={() => reset("clients")}>Clients</button>
              <button className={kind === "invoices" ? "on" : ""} onClick={() => reset("invoices")}>Invoice history</button>
            </div>
            <p className="ink-hint">
              {kind === "clients"
                ? "Export your client or customer list as CSV from Wave, Zoho, FreshBooks, QuickBooks, Invoice Ninja, a spreadsheet or anywhere else, then upload it here. Duplicates (same name or email) are skipped."
                : "Bring your past invoices across so your records and totals are complete. Each invoice is imported with its number, client, dates, total and what's been paid. Clients that don't exist yet are created. Duplicate invoice numbers are skipped."}
            </p>

            <label className="im-drop">
              <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} />
              <strong>{fileName || "Choose a CSV file"}</strong>
              <span>{fileName ? `${body.length} row${body.length === 1 ? "" : "s"} found · click to choose a different file` : "or drag it here"}</span>
            </label>

            {headers.length > 0 && (
              <>
                <h4 className="im-h">Match your columns</h4>
                <p className="ink-hint" style={{ marginBottom: 12 }}>We&apos;ve guessed where we could. Check each one.</p>
                <div className="im-map">
                  {FIELDS[kind].map((f) => (
                    <div className="im-map-row" key={f.key}>
                      <span>{f.label}{f.required && <b> *</b>}</span>
                      <select value={map[f.key] ?? -1} onChange={(e) => setMap({ ...map, [f.key]: parseInt(e.target.value, 10) })}>
                        <option value={-1}>— Don&apos;t import —</option>
                        {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                {kind === "invoices" && (
                  <div className="im-opts">
                    <div className="ink-fg">
                      <label>Date format in your file</label>
                      <select value={dateOrder} onChange={(e) => setDateOrder(e.target.value as DateOrder)}>
                        <option value="auto">Detect automatically ({order === "mdy" ? "month first" : "day first"})</option>
                        <option value="dmy">Day first: 31/12/2026</option>
                        <option value="mdy">Month first: 12/31/2026</option>
                        <option value="ymd">Year first: 2026-12-31</option>
                      </select>
                    </div>
                    <label className="im-check">
                      <input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} />
                      <span>Send automatic payment reminders for imported unpaid invoices
                        <small>Off by default, so clients aren&apos;t emailed about old invoices the moment you import.</small>
                      </span>
                    </label>
                  </div>
                )}

                <h4 className="im-h">Preview</h4>
                <div className="im-preview">
                  <table>
                    <thead>
                      <tr>{(kind === "clients"
                        ? ["Name", "Contact", "Email", "Phone"]
                        : ["Number", "Client", "Issued", "Due", "Total", "Paid", "Status"]).map((h) => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {(mapped as any[]).slice(0, 6).map((r, i) => (
                        <tr key={i}>
                          {kind === "clients"
                            ? [r.name, r.contact, r.email, r.phone].map((v, j) => <td key={j}>{fmt(v)}</td>)
                            : [r.number, r.client, r.issue_date, r.due_date, r.total?.toFixed?.(2), r.amount_paid?.toFixed?.(2), r.status].map((v, j) => <td key={j}>{fmt(v)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {missing.length > 0 && <p className="ink-err">Choose a column for: {missing.map((m) => m.label).join(", ")}.</p>}
                {missing.length === 0 && invalid > 0 && (
                  <p className="im-warn">{invalid} row{invalid === 1 ? "" : "s"} can&apos;t be read (missing {kind === "clients" ? "a name" : "a number or total"}) and will be skipped.</p>
                )}

                <div className="im-go">
                  <button className="ink-btn ink-btn-primary" disabled={busy || missing.length > 0 || body.length === 0} onClick={runImport}>
                    {busy ? "Importing..." : `Import ${body.length - invalid} ${kind === "clients" ? "client" : "invoice"}${body.length - invalid === 1 ? "" : "s"}`}
                  </button>
                </div>
              </>
            )}

            {err && <p className="ink-err">{err}</p>}
            {result && (
              <div className="im-result">
                <strong>Done.</strong> {result.created} imported{result.skipped ? `, ${result.skipped} skipped (duplicates or unreadable rows)` : ""}.
                {result.messages.map((m, i) => <div key={i}>{m}</div>)}
                <div style={{ marginTop: 8 }}>
                  <a href={kind === "clients" ? "/app/clients" : "/app/invoices"}>View {kind === "clients" ? "clients" : "invoices"} &rarr;</a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const css = `
.ink-topbar { position: sticky; top: 0; z-index: 40; background: rgba(10,10,13,0.85); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); padding: 0 32px; height: 60px; display: flex; align-items: center; justify-content: space-between; }
.ink-tb-title { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
.ink-page { padding: 32px; }
.ink-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: 'Syne', sans-serif; transition: all 0.15s; text-decoration: none; white-space: nowrap; }
.ink-btn-primary { background: var(--electric); color: var(--ink); box-shadow: 0 0 20px rgba(79,255,176,0.2); }
.ink-btn-primary:hover { background: #6fffbe; }
.ink-btn-primary:disabled { opacity: 0.5; cursor: default; }
.ink-btn-ghost { background: rgba(255,255,255,0.04); color: var(--text); border: 1px solid var(--border2); }
.ink-btn-ghost:hover { background: rgba(255,255,255,0.08); }
.ink-card { background: var(--ink2); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
.ink-card-head { padding: 18px 24px; border-bottom: 1px solid var(--border); font-size: 14px; font-weight: 600; }
.ink-card-body { padding: 24px; }
.ink-hint { color: var(--muted); font-size: 12px; margin: 0 0 16px; line-height: 1.6; }
.ink-fg { margin-bottom: 14px; }
.ink-fg label { display: block; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 7px; }
.ink-fg select, .im-map select { width: 100%; background: var(--ink3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 9px 12px; font-family: 'Syne', sans-serif; font-size: 13px; outline: none; }
.ink-err { color: var(--electric3); font-size: 13px; margin: 12px 0 0; }
.im-wrap { display: grid; gap: 20px; max-width: 860px; }
.im-exports { display: flex; gap: 10px; flex-wrap: wrap; }
.im-tabs { display: inline-flex; gap: 2px; padding: 4px; background: var(--ink3); border-radius: 10px; margin-bottom: 14px; }
.im-tabs button { background: none; border: none; color: var(--muted2); padding: 8px 16px; border-radius: 7px; cursor: pointer; font-family: 'Syne', sans-serif; font-size: 13px; }
.im-tabs button.on { background: var(--ink2); color: var(--text); box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
.im-drop { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; border: 1.5px dashed var(--border2); border-radius: 12px; padding: 28px 16px; cursor: pointer; position: relative; text-align: center; transition: border-color 0.15s; }
.im-drop:hover { border-color: var(--electric); }
.im-drop input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.im-drop strong { font-size: 14px; color: var(--electric); }
.im-drop span { font-size: 12px; color: var(--muted); }
.im-h { font-size: 13px; margin: 24px 0 6px; }
.im-map { display: grid; gap: 8px; }
.im-map-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: center; font-size: 13px; color: var(--muted2); }
.im-map-row b { color: var(--electric3); }
.im-opts { margin-top: 18px; display: grid; gap: 4px; }
.im-check { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; cursor: pointer; }
.im-check input { margin-top: 3px; accent-color: var(--electric); }
.im-check small { display: block; color: var(--muted); font-size: 11px; margin-top: 3px; }
.im-preview { overflow-x: auto; border: 1px solid var(--border); border-radius: 10px; }
.im-preview table { width: 100%; border-collapse: collapse; font-size: 12px; }
.im-preview th { text-align: left; padding: 8px 12px; background: var(--ink3); font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--muted); white-space: nowrap; }
.im-preview td { padding: 8px 12px; border-top: 1px solid var(--border); white-space: nowrap; max-width: 220px; overflow: hidden; text-overflow: ellipsis; }
.im-warn { color: var(--gold); font-size: 12px; margin: 12px 0 0; }
.im-go { margin-top: 18px; display: flex; justify-content: flex-end; }
.im-result { margin-top: 18px; background: rgba(79,255,176,0.07); border: 1px solid rgba(79,255,176,0.25); border-radius: 10px; padding: 14px 16px; font-size: 13px; line-height: 1.7; }
.im-result a { color: var(--electric); font-weight: 600; text-decoration: none; }
@media (max-width: 640px) { .ink-page { padding: 20px 16px; } .im-map-row { grid-template-columns: 1fr; gap: 4px; } }
`;
