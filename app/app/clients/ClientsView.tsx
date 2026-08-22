"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Client, ClientInput } from "@/lib/db/types";
import { createClient_, updateClient, deleteClient } from "@/lib/db/clients";

const AVA_COLORS = ["#4fffb0", "#00d4ff", "#b87dff", "#ffc940", "#ff6b6b", "#5ce0ff"];

const EMPTY: ClientInput = {
  name: "", contact: "", email: "", phone: "", address: "",
  website: "", tax_id: "", industry: "", notes: "",
};

export function ClientsView({ initialClients }: { initialClients: Client[] }) {
  const router = useRouter();
  const clients = initialClients;
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientInput>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function openNew() {
    setEditId(null); setForm(EMPTY); setErr(null); setModalOpen(true);
  }
  function openEdit(c: Client) {
    setEditId(c.id);
    setForm({
      name: c.name, contact: c.contact ?? "", email: c.email ?? "",
      phone: c.phone ?? "", address: c.address ?? "", website: c.website ?? "",
      tax_id: c.tax_id ?? "", industry: c.industry ?? "", notes: c.notes ?? "",
    });
    setErr(null); setModalOpen(true);
  }

  function set<K extends keyof ClientInput>(k: K, v: ClientInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    if (!form.name.trim()) { setErr("Client name is required."); return; }
    setBusy(true); setErr(null);
    try {
      if (editId) await updateClient(editId, form);
      else await createClient_(form);
      setModalOpen(false);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this client? This cannot be undone.")) return;
    setBusy(true);
    try {
      await deleteClient(id);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <style>{css}</style>

      <div className="ink-topbar">
        <div className="ink-tb-title">Clients</div>
        <button className="ink-btn ink-btn-primary" onClick={openNew}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Client
        </button>
      </div>

      <div className="ink-page">
        {clients.length === 0 ? (
          <div className="ink-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            <h3>No clients yet</h3>
            <p>Add your first client to start invoicing. Everything saves to your account and syncs across devices.</p>
            <button className="ink-btn ink-btn-primary" onClick={openNew} style={{ marginTop: 18 }}>Add your first client</button>
          </div>
        ) : (
          <div className="ink-client-grid">
            {clients.map((c, i) => (
              <div key={c.id} className="ink-client-card" onClick={() => openEdit(c)}>
                <div className="ink-cc-top">
                  <div className="ink-cc-ava" style={{ background: AVA_COLORS[i % AVA_COLORS.length] }}>
                    {(c.name || "?")[0].toUpperCase()}
                  </div>
                  <div className="ink-cc-info">
                    <h3>{c.name}</h3>
                    <p>{c.email || c.phone || c.industry || "—"}</p>
                  </div>
                </div>
                <div className="ink-cc-meta">
                  {c.industry && <span className="ink-chip">{c.industry}</span>}
                  {c.contact && <span className="ink-cc-contact">{c.contact}</span>}
                </div>
                <button
                  className="ink-cc-del"
                  onClick={(e) => { e.stopPropagation(); remove(c.id); }}
                  title="Delete client"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="ink-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="ink-modal">
            <div className="ink-modal-head">
              <h2>{editId ? "Edit Client" : "New Client"}</h2>
              <button className="ink-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div className="ink-modal-body">
              <div className="ink-fgrid">
                <Field label="Company / Name" value={form.name} onChange={(v) => set("name", v)} placeholder="Acme Corp" />
                <Field label="Contact Person" value={form.contact ?? ""} onChange={(v) => set("contact", v)} placeholder="Jane Smith" />
              </div>
              <div className="ink-fgrid">
                <Field label="Email" value={form.email ?? ""} onChange={(v) => set("email", v)} placeholder="jane@acme.com" type="email" />
                <Field label="Phone" value={form.phone ?? ""} onChange={(v) => set("phone", v)} placeholder="+27 ..." />
              </div>
              <Field label="Address" value={form.address ?? ""} onChange={(v) => set("address", v)} placeholder="123 Business St, City" textarea />
              <div className="ink-fgrid">
                <Field label="Website" value={form.website ?? ""} onChange={(v) => set("website", v)} placeholder="acme.com" />
                <Field label="Tax / VAT Number" value={form.tax_id ?? ""} onChange={(v) => set("tax_id", v)} placeholder="Optional" />
              </div>
              <div className="ink-fg">
                <label>Industry</label>
                <select value={form.industry ?? ""} onChange={(e) => set("industry", e.target.value)}>
                  <option value="">General</option>
                  <option>Media &amp; Content</option><option>Technology</option>
                  <option>Marketing &amp; Advertising</option><option>E-Commerce</option>
                  <option>Fashion &amp; Beauty</option><option>Music &amp; Entertainment</option>
                  <option>Education</option><option>Health &amp; Wellness</option>
                  <option>Finance</option><option>Other</option>
                </select>
              </div>
              <Field label="Notes" value={form.notes ?? ""} onChange={(v) => set("notes", v)} placeholder="Any notes about this client..." textarea />
              {err && <p className="ink-err">{err}</p>}
            </div>
            <div className="ink-modal-foot">
              <button className="ink-btn ink-btn-ghost" onClick={() => setModalOpen(false)} disabled={busy}>Cancel</button>
              <button className="ink-btn ink-btn-primary" onClick={save} disabled={busy}>
                {busy ? "Saving..." : "Save Client"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text", textarea = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; textarea?: boolean;
}) {
  return (
    <div className="ink-fg">
      <label>{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
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
.ink-client-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.ink-client-card {
  background: var(--ink2); border: 1px solid var(--border); border-radius: 16px; padding: 22px;
  cursor: pointer; transition: all 0.2s; position: relative;
}
.ink-client-card:hover { border-color: rgba(79,255,176,0.3); transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,0.4); }
.ink-cc-top { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px; }
.ink-cc-ava {
  width: 46px; height: 46px; border-radius: 14px; display: flex; align-items: center;
  justify-content: center; font-size: 18px; font-weight: 700; color: var(--ink); flex-shrink: 0;
}
.ink-cc-info h3 { font-size: 15px; font-weight: 700; margin: 0 0 3px; }
.ink-cc-info p { font-size: 12px; color: var(--muted2); margin: 0; }
.ink-cc-meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.ink-chip {
  background: rgba(184,125,255,0.1); color: var(--violet); border-radius: 20px;
  font-size: 10px; padding: 3px 10px; font-family: 'JetBrains Mono', monospace;
}
.ink-cc-contact { font-size: 11px; color: var(--muted); }
.ink-cc-del {
  position: absolute; top: 16px; right: 16px; background: none; border: none; cursor: pointer;
  color: var(--muted); padding: 6px; border-radius: 6px; opacity: 0; transition: all 0.15s;
}
.ink-client-card:hover .ink-cc-del { opacity: 1; }
.ink-cc-del:hover { background: rgba(255,107,107,0.12); color: var(--electric3); }
.ink-cc-del svg { width: 15px; height: 15px; }
.ink-empty { display: flex; flex-direction: column; align-items: center; padding: 80px 20px; text-align: center; color: var(--muted); }
.ink-empty svg { width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.3; }
.ink-empty h3 { font-size: 18px; color: var(--text); margin: 0 0 8px; }
.ink-empty p { font-size: 13px; max-width: 340px; line-height: 1.6; margin: 0; }
.ink-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px);
  z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px;
}
.ink-modal {
  background: var(--ink2); border: 1px solid var(--border2); border-radius: 20px;
  width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
.ink-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 22px 26px; border-bottom: 1px solid var(--border);
}
.ink-modal-head h2 { font-family: 'Instrument Serif', serif; font-size: 22px; font-weight: 400; font-style: italic; margin: 0; }
.ink-close {
  background: rgba(255,255,255,0.06); border: none; border-radius: 6px; cursor: pointer;
  color: var(--muted); width: 30px; height: 30px; font-size: 18px;
  display: flex; align-items: center; justify-content: center;
}
.ink-close:hover { background: rgba(255,255,255,0.1); color: var(--text); }
.ink-modal-body { padding: 24px 26px; }
.ink-modal-foot { padding: 18px 26px; border-top: 1px solid var(--border); display: flex; gap: 10px; justify-content: flex-end; }
.ink-fgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.ink-fg { margin-bottom: 16px; }
.ink-fg label {
  display: block; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted);
  text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 7px;
}
.ink-fg input, .ink-fg select, .ink-fg textarea {
  width: 100%; background: var(--ink3); border: 1px solid var(--border); border-radius: 8px;
  color: var(--text); padding: 10px 13px; font-family: 'Syne', sans-serif; font-size: 13px; outline: none;
}
.ink-fg input:focus, .ink-fg select:focus, .ink-fg textarea:focus {
  border-color: var(--electric); box-shadow: 0 0 0 3px rgba(79,255,176,0.08);
}
.ink-fg textarea { resize: vertical; min-height: 70px; }
.ink-fg select option { background: var(--ink3); }
.ink-err { color: var(--electric3); font-size: 13px; margin: 4px 0 0; }
`;
