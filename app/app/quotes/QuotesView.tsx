"use client";

import { unwrap } from "@/lib/result";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Quote, QuoteFormInput, InvoiceItem, Client, Product, QuoteStatus } from "@/lib/db/types";
import { createQuote, updateQuote, deleteQuote, setQuoteStatus, convertQuoteToInvoice } from "@/lib/db/quotes";
import { sendQuoteEmail } from "@/lib/email/quote";
import { money, round2, todayISO, addDaysISO } from "@/lib/format";
import { invoiceCss } from "../invoices/InvoicesView";

type Tab = "all" | QuoteStatus | "expired";

function emptyForm(num: string, taxRate: number): QuoteFormInput {
  return {
    client_id: null, number: num, issue_date: todayISO(), valid_until: addDaysISO(30),
    description: "", tax_rate: taxRate, discount: 0, notes: "",
    items: [{ desc: "", qty: 1, rate: 0, total: 0 }],
  };
}

function shortDate(d: string | null): string {
  if (!d) return "—";
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const [y, mo, da] = d.slice(0, 10).split("-");
  return parseInt(da, 10) + " " + m[parseInt(mo, 10) - 1] + " " + y;
}

function quoteStatus(q: Quote): string {
  if (q.status === "sent" && q.valid_until && q.valid_until < todayISO()) return "expired";
  return q.status;
}

export function QuotesView({ initialQuotes, clients, products, suggestedNumber, currency, defaultTaxRate }: {
  initialQuotes: Quote[]; clients: Client[]; products: Product[];
  suggestedNumber: string; currency: string; defaultTaxRate: number;
}) {
  const router = useRouter();
  const quotes = initialQuotes;
  const [tab, setTab] = useState<Tab>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<QuoteFormInput>(emptyForm(suggestedNumber, defaultTaxRate));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? "—";
  const filtered = useMemo(() => tab === "all" ? quotes : quotes.filter((q) => quoteStatus(q) === tab), [quotes, tab]);

  const totals = useMemo(() => {
    const sub = round2(form.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0));
    const tax = round2(sub * ((Number(form.tax_rate) || 0) / 100));
    const disc = round2(Number(form.discount) || 0);
    return { sub, tax, disc, grand: round2(Math.max(0, sub + tax - disc)) };
  }, [form.items, form.tax_rate, form.discount]);

  const accepted = quotes.filter((q) => q.status === "accepted").length;

  function openNew() {
    setEditId(null); setForm(emptyForm(suggestedNumber, defaultTaxRate)); setErr(null); setModalOpen(true);
  }
  function openEdit(q: Quote) {
    setEditId(q.id);
    setForm({
      client_id: q.client_id, number: q.number, issue_date: q.issue_date, valid_until: q.valid_until,
      description: q.description ?? "", tax_rate: Number(q.tax_rate) || 0, discount: Number(q.discount) || 0,
      notes: q.notes ?? "", items: (q.items ?? []).length ? q.items : [{ desc: "", qty: 1, rate: 0, total: 0 }],
    });
    setErr(null); setModalOpen(true);
  }
  function setF<K extends keyof QuoteFormInput>(k: K, v: QuoteFormInput[K]) { setForm((f) => ({ ...f, [k]: v })); }
  function setItem(idx: number, patch: Partial<InvoiceItem>) {
    setForm((f) => {
      const items = f.items.slice();
      items[idx] = { ...items[idx], ...patch };
      items[idx].total = round2((Number(items[idx].qty) || 0) * (Number(items[idx].rate) || 0));
      return { ...f, items };
    });
  }
  function addProduct(id: string) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setForm((f) => {
      const items = f.items.slice();
      const price = Number(p.price) || 0;
      const line = { desc: p.name, qty: 1, rate: price, total: round2(price) };
      const last = items[items.length - 1];
      if (last && !(last.desc ?? "").trim() && !Number(last.rate)) items[items.length - 1] = line;
      else items.push(line);
      return { ...f, items };
    });
  }

  async function save() {
    if (!form.number.trim()) { setErr("Quote number is required."); return; }
    if (!form.items.some((i) => (i.desc ?? "").trim() !== "")) { setErr("Add at least one line item with a description."); return; }
    setBusy(true); setErr(null);
    try {
      if (editId) unwrap(await updateQuote(editId, form)); else unwrap(await createQuote(form));
      setModalOpen(false); router.refresh();
    } catch (e: any) { setErr(e?.message || "Something went wrong."); }
    finally { setBusy(false); }
  }

  async function run(fn: () => Promise<unknown>, after?: (r: any) => void) {
    setBusy(true);
    try { const r = await fn(); after?.(r); router.refresh(); }
    catch (e: any) { alert(e?.message || "Something went wrong."); }
    finally { setBusy(false); }
  }

  const onSend = (q: Quote) => {
    if (!confirm("Email quote " + q.number + " to " + clientName(q.client_id) + "?")) return;
    run(() => sendQuoteEmail(q.id), (r) => alert(r.message));
  };
  const onConvert = (q: Quote) => {
    if (!confirm("Create an invoice from quote " + q.number + "? All lines, tax and notes are copied across.")) return;
    run(async () => unwrap(await convertQuoteToInvoice(q.id)), (r) => {
      if (confirm("Invoice " + r.number + " created as a draft. Open your invoices now?")) window.location.assign("/app/invoices");
    });
  };
  const onDelete = (q: Quote) => {
    if (!confirm("Delete quote " + q.number + " permanently?")) return;
    run(async () => unwrap(await deleteQuote(q.id)));
  };
  const onStatus = (q: Quote, s: QuoteStatus) => run(async () => unwrap(await setQuoteStatus(q.id, s)));
  const onCopyLink = async (q: Quote) => {
    const url = window.location.origin + "/q/" + q.public_token;
    try { await navigator.clipboard.writeText(url); alert("Client link copied:\n\n" + url); }
    catch { prompt("Copy this client link:", url); }
  };

  return (
    <>
      <style>{invoiceCss + quoteCss}</style>

      <div className="ink-topbar">
        <div className="ink-tb-title">Quotes</div>
        <button className="ink-btn ink-btn-primary" onClick={openNew}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Quote
        </button>
      </div>

      <div className="ink-page">
        {accepted > 0 && (
          <div className="qt-banner">
            <strong>{accepted} accepted quote{accepted === 1 ? "" : "s"}</strong> ready to invoice. Use the
            <span className="qt-inline">&rarr; Invoice</span> button to turn {accepted === 1 ? "it" : "them"} into an invoice with nothing to retype.
          </div>
        )}

        <div className="ink-tabbar qt-tabs">
          {(["all", "draft", "sent", "accepted", "declined", "expired", "converted"] as const).map((t) => (
            <div key={t} className={"ink-tab" + (tab === t ? " active" : "")} onClick={() => setTab(t)}>
              {t === "converted" ? "Invoiced" : t.charAt(0).toUpperCase() + t.slice(1)}
            </div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="ink-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>
            <h3>{tab === "all" ? "No quotes yet" : "Nothing here"}</h3>
            <p>{tab === "all"
              ? "Send a quote before you start the work. Your client accepts it online in one click, and you turn it into an invoice without retyping a thing."
              : "Try a different filter."}</p>
            {tab === "all" && (clients.length === 0
              ? <a className="ink-btn ink-btn-primary" href="/app/clients" style={{ marginTop: 18, textDecoration: "none" }}>Add a client first</a>
              : <button className="ink-btn ink-btn-primary" onClick={openNew} style={{ marginTop: 18 }}>Create your first quote</button>)}
          </div>
        ) : (
          <div className="ink-card">
            <div className="ink-tbl-wrap">
              <table>
                <thead>
                  <tr><th>Quote #</th><th>Client</th><th>Description</th><th>Amount</th><th>Date</th><th>Valid until</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map((q) => {
                    const st = quoteStatus(q);
                    const done = q.status === "converted";
                    return (
                      <tr key={q.id}>
                        <td><strong className="ink-mono">{q.number}</strong></td>
                        <td>{clientName(q.client_id)}</td>
                        <td className="ink-muted ink-trunc">{q.description || "—"}</td>
                        <td className="ink-mono ink-bold">{money(q.total, currency)}</td>
                        <td className="ink-muted ink-mono ink-sm">{shortDate(q.issue_date)}</td>
                        <td className="ink-muted ink-mono ink-sm">{shortDate(q.valid_until)}</td>
                        <td>
                          <span className={"ink-badge q-" + st}>{st === "converted" ? "invoiced" : st}</span>
                          {q.viewed_at && q.status === "sent" && <div className="ink-track"><span className="v">&#9679; Viewed</span></div>}
                        </td>
                        <td>
                          <div className="ink-acts">
                            {!done && (
                              <button className="qt-convert" title="Turn into an invoice" disabled={busy} onClick={() => onConvert(q)}>&rarr; Invoice</button>
                            )}
                            {!done && (
                              <button className="ink-act" title="Email to client" disabled={busy} onClick={() => onSend(q)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4z"/><polyline points="4 6 12 13 20 6"/></svg>
                              </button>
                            )}
                            <a className="ink-act" title="Preview (what your client sees)" href={"/q/" + q.public_token} target="_blank" rel="noopener noreferrer">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </a>
                            {q.status !== "draft" && !done && (
                              <button className="ink-act" title="Copy client link" onClick={() => onCopyLink(q)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                              </button>
                            )}
                            {!done && (
                              <button className="ink-act" title="Edit" onClick={() => openEdit(q)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                            )}
                            {!done && q.status !== "accepted" && (
                              <button className="ink-act" title="Mark accepted (client agreed another way)" onClick={() => onStatus(q, "accepted")}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                              </button>
                            )}
                            {!done && q.status !== "declined" && q.status !== "draft" && (
                              <button className="ink-act" title="Mark declined" onClick={() => onStatus(q, "declined")}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            )}
                            <button className="ink-act ink-act-del" title="Delete" onClick={() => onDelete(q)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="ink-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="ink-modal ink-modal-xl">
            <div className="ink-modal-head">
              <h2>{editId ? "Edit Quote" : "New Quote"}</h2>
              <button className="ink-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div className="ink-modal-body">
              <div className="ink-fgrid">
                <div className="ink-fg">
                  <label>Client</label>
                  <select value={form.client_id ?? ""} onChange={(e) => setF("client_id", e.target.value || null)}>
                    <option value="">— Select Client —</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="ink-fg">
                  <label>Quote #</label>
                  <input value={form.number} onChange={(e) => setF("number", e.target.value)} placeholder="QUO-1001" />
                </div>
              </div>
              <div className="ink-fgrid">
                <div className="ink-fg">
                  <label>Date</label>
                  <input type="date" value={form.issue_date ?? ""} onChange={(e) => setF("issue_date", e.target.value)} />
                </div>
                <div className="ink-fg">
                  <label>Valid until</label>
                  <input type="date" value={form.valid_until ?? ""} onChange={(e) => setF("valid_until", e.target.value)} />
                </div>
              </div>
              <div className="ink-fg">
                <label>Project / Description</label>
                <input value={form.description ?? ""} onChange={(e) => setF("description", e.target.value)} placeholder="e.g. Website redesign" />
              </div>

              {products.length > 0 && (
                <div className="ink-fg" style={{ marginTop: 18, marginBottom: 4 }}>
                  <label>Add a saved service</label>
                  <select value="" onChange={(e) => { if (e.target.value) addProduct(e.target.value); }}>
                    <option value="">Choose a service to add</option>
                    {products.map((pr) => <option key={pr.id} value={pr.id}>{pr.name} ({money(Number(pr.price) || 0, currency)})</option>)}
                  </select>
                </div>
              )}
              <div className="ink-li-head">
                <div>Description</div><div className="ink-c">Qty</div><div className="ink-r">Rate</div><div className="ink-r">Amount</div><div />
              </div>
              {form.items.map((it, idx) => (
                <div className="ink-li-row" key={idx}>
                  <input value={it.desc} onChange={(e) => setItem(idx, { desc: e.target.value })} placeholder="Description" />
                  <label className="ink-li-lbl"><span>Qty</span><input type="number" step="any" min="0" value={it.qty}
                    onChange={(e) => setItem(idx, { qty: parseFloat(e.target.value) || 0 })} className="ink-c" /></label>
                  <label className="ink-li-lbl"><span>Rate</span><input type="number" step="0.01" min="0" value={it.rate}
                    onChange={(e) => setItem(idx, { rate: parseFloat(e.target.value) || 0 })} /></label>
                  <div className="ink-li-amt">{money((Number(it.qty) || 0) * (Number(it.rate) || 0), currency)}</div>
                  <button className="ink-rm" onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))} disabled={form.items.length === 1}>×</button>
                </div>
              ))}
              <button className="ink-btn ink-btn-ghost ink-btn-sm" style={{ marginTop: 6 }}
                onClick={() => setForm((f) => ({ ...f, items: [...f.items, { desc: "", qty: 1, rate: 0, total: 0 }] }))}>
                + Add Line Item
              </button>

              <div className="ink-fgrid" style={{ marginTop: 18 }}>
                <div className="ink-fg">
                  <label>Tax (%)</label>
                  <input type="number" step="0.1" min="0" value={form.tax_rate} onChange={(e) => setF("tax_rate", parseFloat(e.target.value) || 0)} />
                </div>
                <div className="ink-fg">
                  <label>Discount</label>
                  <input type="number" step="0.01" min="0" value={form.discount} onChange={(e) => setF("discount", parseFloat(e.target.value) || 0)} />
                </div>
              </div>

              <div className="ink-totals">
                <div className="ink-trow"><span>Subtotal</span><span className="ink-mono">{money(totals.sub, currency)}</span></div>
                {totals.tax > 0 && <div className="ink-trow"><span>Tax</span><span className="ink-mono">{money(totals.tax, currency)}</span></div>}
                {totals.disc > 0 && <div className="ink-trow"><span>Discount</span><span className="ink-mono ink-neg">-{money(totals.disc, currency)}</span></div>}
                <div className="ink-trow ink-grand"><span>Total</span><span>{money(totals.grand, currency)}</span></div>
              </div>

              <div className="ink-fg" style={{ marginTop: 18 }}>
                <label>Notes (scope, timeline, terms)</label>
                <textarea value={form.notes ?? ""} onChange={(e) => setF("notes", e.target.value)}
                  placeholder="e.g. 50% deposit on acceptance. Two rounds of revisions included." />
              </div>
              {err && <p className="ink-err">{err}</p>}
            </div>
            <div className="ink-modal-foot">
              <button className="ink-btn ink-btn-ghost" onClick={() => setModalOpen(false)} disabled={busy}>Cancel</button>
              <button className="ink-btn ink-btn-primary" onClick={save} disabled={busy}>{busy ? "Saving..." : "Save Quote"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const quoteCss = `
.q-draft { background: rgba(110,110,136,0.2); color: var(--muted2); }
.q-sent { background: rgba(255,201,64,0.12); color: var(--gold); }
.q-accepted { background: rgba(79,255,176,0.12); color: var(--electric); }
.q-declined, .q-expired { background: rgba(255,107,107,0.12); color: var(--electric3); }
.q-converted { background: rgba(0,212,255,0.12); color: var(--electric2); }
.qt-convert { background: rgba(79,255,176,0.1); color: var(--electric); border: 1px solid rgba(79,255,176,0.3); border-radius: 6px; font-size: 11px; font-weight: 700; padding: 5px 9px; cursor: pointer; white-space: nowrap; margin-right: 4px; font-family: 'Syne', sans-serif; }
.qt-convert:hover { background: rgba(79,255,176,0.18); }
.qt-banner { background: rgba(79,255,176,0.07); border: 1px solid rgba(79,255,176,0.25); border-radius: 12px; padding: 12px 16px; font-size: 13px; margin-bottom: 18px; color: var(--muted2); }
.qt-banner strong { color: var(--electric); }
.qt-inline { color: var(--electric); font-weight: 700; margin: 0 4px; }
.qt-tabs { flex-wrap: wrap; }
a.ink-act { display: inline-flex; }
`;
