"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, ProductInput } from "@/lib/db/types";
import { createProduct_, updateProduct, deleteProduct } from "@/lib/db/products";

const UNITS = ["per project", "per hour", "per day", "per post", "per video", "per month", "per word", "per image", "flat fee"];
const CATS = ["Content Creation", "Design", "Development", "Consulting", "Photography / Video", "Writing", "Marketing", "Other"];

const EMPTY: ProductInput = {
  name: "", description: "", price: 0, unit: "per project", category: "Content Creation",
};

export function ProductsView({ initialProducts }: { initialProducts: Product[] }) {
  const router = useRouter();
  const products = initialProducts;
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductInput>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function openNew() { setEditId(null); setForm(EMPTY); setErr(null); setModalOpen(true); }
  function openEdit(p: Product) {
    setEditId(p.id);
    setForm({
      name: p.name, description: p.description ?? "", price: p.price,
      unit: p.unit ?? "per project", category: p.category ?? "Content Creation",
    });
    setErr(null); setModalOpen(true);
  }
  function set<K extends keyof ProductInput>(k: K, v: ProductInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    if (!form.name.trim()) { setErr("Service name is required."); return; }
    setBusy(true); setErr(null);
    try {
      const payload = { ...form, price: Number(form.price) || 0 };
      if (editId) await updateProduct(editId, payload);
      else await createProduct_(payload);
      setModalOpen(false);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Something went wrong.");
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this service?")) return;
    setBusy(true);
    try { await deleteProduct(id); router.refresh(); }
    catch (e: any) { alert(e?.message || "Delete failed."); }
    finally { setBusy(false); }
  }

  return (
    <>
      <style>{css}</style>

      <div className="ink-topbar">
        <div className="ink-tb-title">Products &amp; Services</div>
        <button className="ink-btn ink-btn-primary" onClick={openNew}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Service
        </button>
      </div>

      <div className="ink-page">
        {products.length === 0 ? (
          <div className="ink-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <h3>No services yet</h3>
            <p>Add your common services with default prices, so you can drop them into invoices in one click later.</p>
            <button className="ink-btn ink-btn-primary" onClick={openNew} style={{ marginTop: 18 }}>Add your first service</button>
          </div>
        ) : (
          <div className="ink-card">
            <div className="ink-tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th><th>Description</th><th>Default Price</th><th>Unit</th><th>Category</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} onClick={() => openEdit(p)} className="ink-row">
                      <td><strong>{p.name}</strong></td>
                      <td className="ink-muted">{p.description || "—"}</td>
                      <td className="ink-mono">{Number(p.price ?? 0).toFixed(2)}</td>
                      <td className="ink-muted">{p.unit}</td>
                      <td><span className="ink-chip">{p.category || "—"}</span></td>
                      <td>
                        <button className="ink-del" onClick={(e) => { e.stopPropagation(); remove(p.id); }} title="Delete">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="ink-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="ink-modal ink-modal-sm">
            <div className="ink-modal-head">
              <h2>{editId ? "Edit Service" : "Add Service"}</h2>
              <button className="ink-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div className="ink-modal-body">
              <div className="ink-fg">
                <label>Name</label>
                <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Brand Video Production" />
              </div>
              <div className="ink-fg">
                <label>Description</label>
                <input value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Short description" />
              </div>
              <div className="ink-fgrid">
                <div className="ink-fg">
                  <label>Default Price</label>
                  <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => set("price", parseFloat(e.target.value) || 0)} placeholder="0.00" />
                </div>
                <div className="ink-fg">
                  <label>Unit</label>
                  <select value={form.unit ?? ""} onChange={(e) => set("unit", e.target.value)}>
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="ink-fg">
                <label>Category</label>
                <select value={form.category ?? ""} onChange={(e) => set("category", e.target.value)}>
                  {CATS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              {err && <p className="ink-err">{err}</p>}
            </div>
            <div className="ink-modal-foot">
              <button className="ink-btn ink-btn-ghost" onClick={() => setModalOpen(false)} disabled={busy}>Cancel</button>
              <button className="ink-btn ink-btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const css = `
.ink-topbar {
  position: sticky; top: 0; z-index: 40; background: rgba(10,10,13,0.85);
  backdrop-filter: blur(20px); border-bottom: 1px solid var(--border);
  padding: 0 32px; height: 60px; display: flex; align-items: center; justify-content: space-between;
}
.ink-tb-title { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
.ink-page { padding: 32px; }
.ink-btn {
  display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; border-radius: 8px;
  font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s;
  font-family: 'Syne', sans-serif; white-space: nowrap;
}
.ink-btn svg { width: 15px; height: 15px; }
.ink-btn-primary { background: var(--electric); color: var(--ink); box-shadow: 0 0 20px rgba(79,255,176,0.2); }
.ink-btn-primary:hover { background: #6fffbe; transform: translateY(-1px); }
.ink-btn-primary:disabled { opacity: 0.6; cursor: default; transform: none; }
.ink-btn-ghost { background: rgba(255,255,255,0.04); color: var(--text); border: 1px solid var(--border2); }
.ink-btn-ghost:hover { background: rgba(255,255,255,0.08); }
.ink-card { background: var(--ink2); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
.ink-tbl-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th {
  text-align: left; padding: 11px 20px; font-family: 'JetBrains Mono', monospace;
  font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted);
  background: var(--ink3); border-bottom: 1px solid var(--border); white-space: nowrap;
}
td { padding: 14px 20px; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.03); }
.ink-row { cursor: pointer; transition: background 0.1s; }
.ink-row:hover td { background: rgba(255,255,255,0.02); }
tr:last-child td { border-bottom: none; }
.ink-muted { color: var(--muted2); }
.ink-mono { font-family: 'JetBrains Mono', monospace; }
.ink-chip {
  display: inline-block; background: rgba(184,125,255,0.1); color: var(--violet); border-radius: 20px;
  font-size: 10px; padding: 3px 10px; font-family: 'JetBrains Mono', monospace;
}
.ink-del { background: none; border: none; cursor: pointer; color: var(--muted); padding: 6px; border-radius: 6px; transition: all 0.15s; }
.ink-del:hover { background: rgba(255,107,107,0.12); color: var(--electric3); }
.ink-del svg { width: 15px; height: 15px; }
.ink-empty { display: flex; flex-direction: column; align-items: center; padding: 80px 20px; text-align: center; color: var(--muted); }
.ink-empty svg { width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.3; }
.ink-empty h3 { font-size: 18px; color: var(--text); margin: 0 0 8px; }
.ink-empty p { font-size: 13px; max-width: 340px; line-height: 1.6; margin: 0; }
.ink-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
.ink-modal { background: var(--ink2); border: 1px solid var(--border2); border-radius: 20px; width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
.ink-modal-sm { max-width: 480px; }
.ink-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 22px 26px; border-bottom: 1px solid var(--border); }
.ink-modal-head h2 { font-family: 'Instrument Serif', serif; font-size: 22px; font-weight: 400; font-style: italic; margin: 0; }
.ink-close { background: rgba(255,255,255,0.06); border: none; border-radius: 6px; cursor: pointer; color: var(--muted); width: 30px; height: 30px; font-size: 18px; display: flex; align-items: center; justify-content: center; }
.ink-close:hover { background: rgba(255,255,255,0.1); color: var(--text); }
.ink-modal-body { padding: 24px 26px; }
.ink-modal-foot { padding: 18px 26px; border-top: 1px solid var(--border); display: flex; gap: 10px; justify-content: flex-end; }
.ink-fgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.ink-fg { margin-bottom: 16px; }
.ink-fg label { display: block; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 7px; }
.ink-fg input, .ink-fg select { width: 100%; background: var(--ink3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 10px 13px; font-family: 'Syne', sans-serif; font-size: 13px; outline: none; }
.ink-fg input:focus, .ink-fg select:focus { border-color: var(--electric); box-shadow: 0 0 0 3px rgba(79,255,176,0.08); }
.ink-fg select option { background: var(--ink3); }
.ink-err { color: var(--electric3); font-size: 13px; margin: 4px 0 0; }
`;
