"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Invoice, InvoiceItem, Client, Product, InvoiceFormInput } from "@/lib/db/types";
import { createInvoice_, updateInvoice, deleteInvoice, markInvoicePaid } from "@/lib/db/invoices";
import { sendInvoiceEmail } from "@/lib/email/invoice";
import { money, round2, todayISO, addDaysISO, displayStatus } from "@/lib/format";

type TenantLite = {
  name: string | null; email: string | null; address: string | null; phone: string | null;
  currency: string | null; payment_terms: number | null; default_tax_rate: number | null;
  invoice_notes: string | null; footer_message: string | null;
} | null;

const STATUSES = ["draft", "unpaid", "paid"];
const RECURRING = ["", "weekly", "monthly", "quarterly", "annually"];

function emptyForm(num: string, terms: number, taxRate: number, notes: string): InvoiceFormInput {
  return {
    client_id: null, number: num, issue_date: todayISO(),
    due_date: addDaysISO(terms || 30), paid_date: null, description: "",
    status: "draft", tax_rate: taxRate || 0, discount: 0,
    notes: notes || "", recurring: "",
    items: [{ desc: "", qty: 1, rate: 0, total: 0 }],
  };
}

export function InvoicesView({
  initialInvoices, clients, products, suggestedNumber, tenant,
}: {
  initialInvoices: Invoice[]; clients: Client[]; products: Product[];
  suggestedNumber: string; tenant: TenantLite;
}) {
  const router = useRouter();
  const currency = tenant?.currency ?? "USD";
  const invoices = initialInvoices;
  const [tab, setTab] = useState<"all" | "draft" | "unpaid" | "paid" | "overdue">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<InvoiceFormInput>(
    emptyForm(suggestedNumber, tenant?.payment_terms ?? 30, tenant?.default_tax_rate ?? 0, tenant?.invoice_notes ?? "")
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    if (tab === "all") return invoices;
    return invoices.filter((i) => displayStatus(i.status, i.due_date) === tab);
  }, [invoices, tab]);

  const totals = useMemo(() => {
    const sub = round2(form.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0));
    const tax = round2(sub * ((Number(form.tax_rate) || 0) / 100));
    const disc = round2(Number(form.discount) || 0);
    return { sub, tax, disc, grand: round2(Math.max(0, sub + tax - disc)) };
  }, [form.items, form.tax_rate, form.discount]);

  function openNew() {
    setEditId(null);
    setForm(emptyForm(suggestedNumber, tenant?.payment_terms ?? 30, tenant?.default_tax_rate ?? 0, tenant?.invoice_notes ?? ""));
    setErr(null); setModalOpen(true);
  }

  function openEdit(inv: Invoice) {
    setEditId(inv.id);
    setForm({
      client_id: inv.client_id, number: inv.number,
      issue_date: inv.issue_date, due_date: inv.due_date, paid_date: inv.paid_date,
      description: inv.description ?? "", status: inv.status,
      tax_rate: Number(inv.tax_rate) || 0, discount: Number(inv.discount) || 0,
      notes: inv.notes ?? "", recurring: inv.recurring ?? "",
      items: (inv.items ?? []).length ? inv.items : [{ desc: "", qty: 1, rate: 0, total: 0 }],
    });
    setErr(null); setModalOpen(true);
  }

  function setF<K extends keyof InvoiceFormInput>(k: K, v: InvoiceFormInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function setItem(idx: number, patch: Partial<InvoiceItem>) {
    setForm((f) => {
      const items = f.items.slice();
      items[idx] = { ...items[idx], ...patch };
      const q = Number(items[idx].qty) || 0, r = Number(items[idx].rate) || 0;
      items[idx].total = round2(q * r);
      return { ...f, items };
    });
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, { desc: "", qty: 1, rate: 0, total: 0 }] }));
  }
  function removeItem(idx: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  function onDescChange(idx: number, value: string) {
    const p = products.find((x) => x.name === value);
    if (p) setItem(idx, { desc: value, rate: Number(p.price) || 0 });
    else setItem(idx, { desc: value });
  }

  async function save() {
    if (!form.number.trim()) { setErr("Invoice number is required."); return; }
    if (!form.items.some((i) => (i.desc ?? "").trim() !== "")) {
      setErr("Add at least one line item with a description."); return;
    }
    setBusy(true); setErr(null);
    try {
      if (editId) await updateInvoice(editId, form);
      else await createInvoice_(form);
      setModalOpen(false);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Something went wrong.");
    } finally { setBusy(false); }
  }

  async function onSend(id: string) {
    if (!confirm("Email this invoice to the client now?")) return;
    setBusy(true);
    try {
      const res = await sendInvoiceEmail(id);
      alert(res.message);
      if (res.ok) router.refresh();
    } catch (e: any) {
      alert(e?.message || "Send failed.");
    } finally { setBusy(false); }
  }

  async function onMarkPaid(id: string) {
    setBusy(true);
    try { await markInvoicePaid(id); router.refresh(); }
    catch (e: any) { alert(e?.message || "Failed."); }
    finally { setBusy(false); }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this invoice permanently?")) return;
    setBusy(true);
    try { await deleteInvoice(id); router.refresh(); }
    catch (e: any) { alert(e?.message || "Delete failed."); }
    finally { setBusy(false); }
  }

  const previewInv = previewId ? invoices.find((i) => i.id === previewId) ?? null : null;

  return (
    <>
      <style>{css}</style>

      <div className="ink-topbar">
        <div className="ink-tb-title">Invoices</div>
        <button className="ink-btn ink-btn-primary" onClick={openNew}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Invoice
        </button>
      </div>

      <div className="ink-page">
        <div className="ink-tabbar">
          {(["all", "draft", "unpaid", "paid", "overdue"] as const).map((t) => (
            <div key={t} className={"ink-tab" + (tab === t ? " active" : "")} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="ink-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <h3>{tab === "all" ? "No invoices yet" : "No " + tab + " invoices"}</h3>
            <p>{tab === "all" ? "Create your first invoice and get paid. Everything saves to your account." : "Try a different filter."}</p>
            {tab === "all" && <button className="ink-btn ink-btn-primary" onClick={openNew} style={{ marginTop: 18 }}>Create your first invoice</button>}
          </div>
        ) : (
          <div className="ink-card">
            <div className="ink-tbl-wrap">
              <table>
                <thead>
                  <tr><th>Invoice #</th><th>Client</th><th>Description</th><th>Amount</th><th>Issued</th><th>Due</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => {
                    const st = displayStatus(inv.status, inv.due_date);
                    return (
                      <tr key={inv.id}>
                        <td><strong className="ink-mono">{inv.number}</strong>{inv.recurring ? <span className="ink-recur">{inv.recurring}</span> : null}</td>
                        <td>{clientName(inv.client_id)}</td>
                        <td className="ink-muted ink-trunc">{inv.description || "—"}</td>
                        <td className="ink-mono ink-bold">{money(inv.total, currency)}</td>
                        <td className="ink-muted ink-mono ink-sm">{inv.issue_date || "—"}</td>
                        <td className="ink-muted ink-mono ink-sm">{inv.due_date || "—"}</td>
                        <td><span className={"ink-badge b-" + st}>{st}</span></td>
                        <td>
                          <div className="ink-acts">
                            <button className="ink-act" title="Email to client" onClick={() => onSend(inv.id)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4z"/><polyline points="4 6 12 13 20 6"/></svg>
                            </button>
                            <button className="ink-act" title="Preview" onClick={() => setPreviewId(inv.id)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                            <button className="ink-act" title="Edit" onClick={() => openEdit(inv)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            {inv.status !== "paid" && (
                              <button className="ink-act" title="Mark paid" onClick={() => onMarkPaid(inv.id)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                              </button>
                            )}
                            <button className="ink-act ink-act-del" title="Delete" onClick={() => onDelete(inv.id)}>
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
              <h2>{editId ? "Edit Invoice" : "New Invoice"}</h2>
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
                  <label>Invoice #</label>
                  <input value={form.number} onChange={(e) => setF("number", e.target.value)} placeholder="INV-1001" />
                </div>
              </div>

              <div className="ink-fgrid">
                <div className="ink-fg">
                  <label>Issue Date</label>
                  <input type="date" value={form.issue_date ?? ""} onChange={(e) => setF("issue_date", e.target.value)} />
                </div>
                <div className="ink-fg">
                  <label>Due Date</label>
                  <input type="date" value={form.due_date ?? ""} onChange={(e) => setF("due_date", e.target.value)} />
                </div>
              </div>

              <div className="ink-fg">
                <label>Project / Description</label>
                <input value={form.description ?? ""} onChange={(e) => setF("description", e.target.value)} placeholder="e.g. Social Media Package" />
              </div>

              <div className="ink-li-head">
                <div>Description</div><div className="ink-c">Qty</div><div className="ink-r">Rate</div><div className="ink-r">Amount</div><div />
              </div>
              {form.items.map((it, idx) => (
                <div className="ink-li-row" key={idx}>
                  <input
                    list="ink-prod-list"
                    value={it.desc}
                    onChange={(e) => onDescChange(idx, e.target.value)}
                    placeholder="Description"
                  />
                  <input type="number" step="any" min="0" value={it.qty}
                    onChange={(e) => setItem(idx, { qty: parseFloat(e.target.value) || 0 })} className="ink-c" />
                  <input type="number" step="0.01" min="0" value={it.rate}
                    onChange={(e) => setItem(idx, { rate: parseFloat(e.target.value) || 0 })} />
                  <div className="ink-li-amt">{money((Number(it.qty) || 0) * (Number(it.rate) || 0), currency)}</div>
                  <button className="ink-rm" onClick={() => removeItem(idx)} disabled={form.items.length === 1}>×</button>
                </div>
              ))}
              <datalist id="ink-prod-list">
                {products.map((p) => <option key={p.id} value={p.name} />)}
              </datalist>
              <button className="ink-btn ink-btn-ghost ink-btn-sm" onClick={addItem} style={{ marginTop: 6 }}>
                + Add Line Item
              </button>

              <div className="ink-fgrid" style={{ marginTop: 18 }}>
                <div className="ink-fg">
                  <label>Tax (%)</label>
                  <input type="number" step="0.1" min="0" value={form.tax_rate}
                    onChange={(e) => setF("tax_rate", parseFloat(e.target.value) || 0)} />
                </div>
                <div className="ink-fg">
                  <label>Discount</label>
                  <input type="number" step="0.01" min="0" value={form.discount}
                    onChange={(e) => setF("discount", parseFloat(e.target.value) || 0)} />
                </div>
              </div>

              <div className="ink-totals">
                <div className="ink-trow"><span>Subtotal</span><span className="ink-mono">{money(totals.sub, currency)}</span></div>
                {totals.tax > 0 && <div className="ink-trow"><span>Tax</span><span className="ink-mono">{money(totals.tax, currency)}</span></div>}
                {totals.disc > 0 && <div className="ink-trow"><span>Discount</span><span className="ink-mono ink-neg">-{money(totals.disc, currency)}</span></div>}
                <div className="ink-trow ink-grand"><span>Total</span><span>{money(totals.grand, currency)}</span></div>
              </div>

              <div className="ink-fgrid" style={{ marginTop: 18 }}>
                <div className="ink-fg">
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setF("status", e.target.value)}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s === "unpaid" ? "Unpaid / Sent" : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div className="ink-fg">
                  <label>Recurring</label>
                  <select value={form.recurring ?? ""} onChange={(e) => setF("recurring", e.target.value)}>
                    {RECURRING.map((r) => <option key={r} value={r}>{r === "" ? "Not Recurring" : r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div className="ink-fg">
                <label>Notes / Payment Instructions</label>
                <textarea value={form.notes ?? ""} onChange={(e) => setF("notes", e.target.value)} placeholder="Bank details, payment methods..." />
              </div>

              {err && <p className="ink-err">{err}</p>}
            </div>
            <div className="ink-modal-foot">
              <button className="ink-btn ink-btn-ghost" onClick={() => setModalOpen(false)} disabled={busy}>Cancel</button>
              <button className="ink-btn ink-btn-primary" onClick={save} disabled={busy}>{busy ? "Saving..." : "Save Invoice"}</button>
            </div>
          </div>
        </div>
      )}

      {previewInv && (
        <div className="ink-overlay" onClick={(e) => { if (e.target === e.currentTarget) setPreviewId(null); }}>
          <div className="ink-modal ink-modal-xl ink-preview-shell">
            <div className="ink-preview-bar">
              <strong>Invoice Preview</strong>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="ink-btn ink-btn-primary ink-btn-sm" onClick={() => window.print()}>Save as PDF</button>
                <button className="ink-close" onClick={() => setPreviewId(null)}>×</button>
              </div>
            </div>
            <div className="ink-preview-scroll">
              <div className="ink-paper">
                {previewInv.status === "paid" && <div className="ip-paid">PAID</div>}
                <div className="ip-header">
                  <div>
                    <div className="ip-logo">{tenant?.name || "Your Business"}</div>
                    <div className="ip-from">
                      {tenant?.name || "Your Business"}<br />
                      {(tenant?.address || "").split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}
                      {tenant?.email || ""}
                    </div>
                  </div>
                  <div className="ip-meta">
                    <h2>INVOICE</h2>
                    <div className="ip-num">{previewInv.number}</div>
                    <div className="ip-dates">
                      Issued: <strong>{previewInv.issue_date || "—"}</strong><br />
                      Due: <strong>{previewInv.due_date || "—"}</strong>
                    </div>
                  </div>
                </div>

                <div className="ip-parties">
                  <div>
                    <h4>FROM</h4>
                    <strong>{tenant?.name || "Your Business"}</strong>
                    <p>{tenant?.email}<br />{tenant?.phone}</p>
                  </div>
                  <div>
                    <h4>BILL TO</h4>
                    <strong>{clientName(previewInv.client_id)}</strong>
                    <p>
                      {clients.find((c) => c.id === previewInv.client_id)?.email || ""}<br />
                      {clients.find((c) => c.id === previewInv.client_id)?.phone || ""}
                    </p>
                  </div>
                </div>

                {previewInv.description && (
                  <div className="ip-project"><strong>Project:</strong> {previewInv.description}</div>
                )}

                <table className="ip-tbl">
                  <thead><tr><th>DESCRIPTION</th><th className="ink-c">QTY</th><th className="ink-r">RATE</th><th className="ink-r">AMOUNT</th></tr></thead>
                  <tbody>
                    {(previewInv.items ?? []).map((li, i) => (
                      <tr key={i}>
                        <td>{li.desc}</td>
                        <td className="ink-c">{li.qty}</td>
                        <td className="ink-r ink-mono">{money(li.rate, currency)}</td>
                        <td className="ink-r ink-mono"><strong>{money(li.total, currency)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="ip-totals">
                  <div className="ip-trow"><span>Subtotal</span><span className="ink-mono">{money(previewInv.subtotal, currency)}</span></div>
                  {Number(previewInv.tax_rate) > 0 && (
                    <div className="ip-trow"><span>Tax ({previewInv.tax_rate}%)</span>
                      <span className="ink-mono">{money(round2(Number(previewInv.subtotal) * Number(previewInv.tax_rate) / 100), currency)}</span></div>
                  )}
                  {Number(previewInv.discount) > 0 && (
                    <div className="ip-trow"><span>Discount</span><span className="ink-mono">-{money(previewInv.discount, currency)}</span></div>
                  )}
                  <div className="ip-trow ip-grand"><span>Total Due</span><span className="ink-mono">{money(previewInv.total, currency)}</span></div>
                </div>

                {previewInv.notes && (
                  <div className="ip-notes"><strong>Payment Instructions</strong><br /><br />
                    {previewInv.notes.split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}
                  </div>
                )}
                <div className="ip-footer">{tenant?.footer_message || "Thank you for your business!"}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const css = `
.ink-topbar { position: sticky; top: 0; z-index: 40; background: rgba(10,10,13,0.85); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); padding: 0 32px; height: 60px; display: flex; align-items: center; justify-content: space-between; }
.ink-tb-title { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
.ink-page { padding: 32px; }
.ink-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; font-family: 'Syne', sans-serif; white-space: nowrap; }
.ink-btn svg { width: 15px; height: 15px; }
.ink-btn-sm { padding: 6px 14px; font-size: 12px; }
.ink-btn-primary { background: var(--electric); color: var(--ink); box-shadow: 0 0 20px rgba(79,255,176,0.2); }
.ink-btn-primary:hover { background: #6fffbe; }
.ink-btn-primary:disabled { opacity: 0.6; cursor: default; }
.ink-btn-ghost { background: rgba(255,255,255,0.04); color: var(--text); border: 1px solid var(--border2); }
.ink-btn-ghost:hover { background: rgba(255,255,255,0.08); }
.ink-tabbar { display: flex; gap: 2px; padding: 4px; background: var(--ink3); border-radius: 10px; margin-bottom: 22px; width: fit-content; }
.ink-tab { padding: 8px 18px; border-radius: 7px; font-size: 13px; cursor: pointer; color: var(--muted2); font-weight: 500; transition: all 0.15s; }
.ink-tab.active { background: var(--ink2); color: var(--text); box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
.ink-card { background: var(--ink2); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
.ink-tbl-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; padding: 11px 20px; font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); background: var(--ink3); border-bottom: 1px solid var(--border); white-space: nowrap; }
td { padding: 14px 20px; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.03); }
tr:last-child td { border-bottom: none; }
tbody tr:hover td { background: rgba(255,255,255,0.02); }
.ink-muted { color: var(--muted2); }
.ink-mono { font-family: 'JetBrains Mono', monospace; }
.ink-bold { font-weight: 600; }
.ink-sm { font-size: 12px; }
.ink-c { text-align: center; }
.ink-r { text-align: right; }
.ink-neg { color: var(--electric3); }
.ink-trunc { max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ink-recur { background: rgba(0,212,255,0.1); color: var(--electric2); border-radius: 4px; font-size: 10px; padding: 2px 8px; font-family: 'JetBrains Mono', monospace; margin-left: 8px; }
.ink-badge { display: inline-flex; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 600; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.5px; }
.b-paid { background: rgba(79,255,176,0.12); color: var(--electric); }
.b-unpaid { background: rgba(255,201,64,0.12); color: var(--gold); }
.b-overdue { background: rgba(255,107,107,0.12); color: var(--electric3); }
.b-draft { background: rgba(110,110,136,0.2); color: var(--muted2); }
.ink-acts { display: flex; gap: 2px; }
.ink-act { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 6px; color: var(--muted); transition: all 0.15s; }
.ink-act:hover { background: rgba(255,255,255,0.06); color: var(--text); }
.ink-act-del:hover { background: rgba(255,107,107,0.12); color: var(--electric3); }
.ink-act svg { width: 14px; height: 14px; }
.ink-empty { display: flex; flex-direction: column; align-items: center; padding: 80px 20px; text-align: center; color: var(--muted); }
.ink-empty svg { width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.3; }
.ink-empty h3 { font-size: 18px; color: var(--text); margin: 0 0 8px; }
.ink-empty p { font-size: 13px; max-width: 340px; line-height: 1.6; margin: 0; }
.ink-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
.ink-modal { background: var(--ink2); border: 1px solid var(--border2); border-radius: 20px; width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
.ink-modal-xl { max-width: 860px; }
.ink-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 22px 26px; border-bottom: 1px solid var(--border); }
.ink-modal-head h2 { font-family: 'Instrument Serif', serif; font-size: 22px; font-weight: 400; font-style: italic; margin: 0; }
.ink-close { background: rgba(255,255,255,0.06); border: none; border-radius: 6px; cursor: pointer; color: var(--muted); width: 30px; height: 30px; font-size: 18px; display: flex; align-items: center; justify-content: center; }
.ink-close:hover { background: rgba(255,255,255,0.1); color: var(--text); }
.ink-modal-body { padding: 24px 26px; }
.ink-modal-foot { padding: 18px 26px; border-top: 1px solid var(--border); display: flex; gap: 10px; justify-content: flex-end; }
.ink-fgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.ink-fg { margin-bottom: 16px; }
.ink-fg label { display: block; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 7px; }
.ink-fg input, .ink-fg select, .ink-fg textarea { width: 100%; background: var(--ink3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 10px 13px; font-family: 'Syne', sans-serif; font-size: 13px; outline: none; }
.ink-fg input:focus, .ink-fg select:focus, .ink-fg textarea:focus { border-color: var(--electric); box-shadow: 0 0 0 3px rgba(79,255,176,0.08); }
.ink-fg textarea { resize: vertical; min-height: 70px; }
.ink-fg select option { background: var(--ink3); }
.ink-li-head { display: grid; grid-template-columns: 1fr 90px 110px 110px 32px; gap: 8px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; padding: 0 4px; margin: 18px 0 8px; }
.ink-li-row { display: grid; grid-template-columns: 1fr 90px 110px 110px 32px; gap: 8px; align-items: center; margin-bottom: 8px; }
.ink-li-row input { width: 100%; background: var(--ink3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 10px 12px; font-family: 'Syne', sans-serif; font-size: 13px; outline: none; }
.ink-li-row input:focus { border-color: var(--electric); }
.ink-li-row input.ink-c { text-align: center; }
.ink-li-amt { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--electric); text-align: right; padding: 10px 4px; }
.ink-rm { background: none; border: none; cursor: pointer; color: var(--muted); font-size: 20px; line-height: 1; border-radius: 6px; padding: 6px; }
.ink-rm:hover:not(:disabled) { background: rgba(255,107,107,0.1); color: var(--electric3); }
.ink-rm:disabled { opacity: 0.25; cursor: default; }
.ink-totals { border-top: 1px solid var(--border); padding-top: 16px; margin-top: 16px; }
.ink-trow { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: var(--muted2); }
.ink-grand { font-family: 'Instrument Serif', serif; font-size: 26px; padding-top: 12px; margin-top: 4px; border-top: 1px solid var(--border2); color: var(--text); }
.ink-grand span:last-child { color: var(--electric); }
.ink-err { color: var(--electric3); font-size: 13px; margin: 10px 0 0; }
.ink-preview-shell { background: #e8e8e8; padding: 0; }
.ink-preview-bar { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: #ddd; border-radius: 20px 20px 0 0; color: #111; }
.ink-preview-scroll { padding: 20px; }
.ink-paper { background: #fff; color: #111; border-radius: 12px; padding: 48px; font-family: 'Syne', sans-serif; }
.ip-paid {
  position: absolute; top: 90px; right: 70px; transform: rotate(-14deg);
  border: 3px solid #22c87a; color: #22c87a; border-radius: 8px;
  font-family: 'JetBrains Mono', monospace; font-size: 26px; font-weight: 700;
  letter-spacing: 5px; padding: 6px 18px; opacity: 0.85;
}
.ink-paper { position: relative; }
.ip-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
.ip-logo { font-family: 'Instrument Serif', serif; font-size: 30px; font-style: italic; }
.ip-logo span { color: #22c87a; }
.ip-from { font-size: 12px; color: #666; margin-top: 8px; line-height: 1.6; }
.ip-meta { text-align: right; }
.ip-meta h2 { font-size: 12px; letter-spacing: 4px; color: #888; font-weight: 500; margin: 0; }
.ip-num { font-size: 22px; font-weight: 800; margin-top: 4px; }
.ip-dates { margin-top: 10px; font-size: 12px; color: #666; line-height: 1.8; }
.ip-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 30px; }
.ip-parties h4 { font-size: 10px; letter-spacing: 2px; color: #999; margin: 0 0 8px; font-family: 'JetBrains Mono', monospace; }
.ip-parties strong { font-size: 15px; display: block; margin-bottom: 4px; }
.ip-parties p { font-size: 12px; color: #555; line-height: 1.7; margin: 0; }
.ip-project { background: #f9f9f9; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-size: 13px; color: #444; }
.ip-tbl { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
.ip-tbl th { background: #f7f7f7; padding: 10px 14px; font-size: 10px; letter-spacing: 1.5px; color: #999; font-family: 'JetBrains Mono', monospace; border: none; }
.ip-tbl td { padding: 11px 14px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
.ip-totals { max-width: 280px; margin-left: auto; }
.ip-trow { display: flex; justify-content: space-between; padding: 7px 0; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
.ip-grand { font-size: 19px; font-weight: 700; border-bottom: none; border-top: 2px solid #111; padding-top: 12px; margin-top: 6px; }
.ip-notes { margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; line-height: 1.7; }
.ip-footer { margin-top: 40px; text-align: center; font-size: 11px; color: #bbb; font-family: 'JetBrains Mono', monospace; }
@media print {
  .ink-sidebar, .ink-topbar, .ink-preview-bar { display: none !important; }
  .ink-overlay { position: static; background: #fff; backdrop-filter: none; padding: 0; }
  .ink-modal, .ink-preview-shell { box-shadow: none; border: none; background: #fff; max-width: none; max-height: none; overflow: visible; }
  .ink-preview-scroll { padding: 0; }
  .ink-paper { border-radius: 0; padding: 0; }
}
`;
