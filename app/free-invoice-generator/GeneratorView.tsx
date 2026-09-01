"use client";

import { useState, useMemo } from "react";

const SYMBOLS: Record<string, string> = { ZAR: "R", USD: "$", GBP: "£", EUR: "€", AUD: "A$", CAD: "C$" };

type Item = { desc: string; qty: number; rate: number };

function money(n: number, cur: string) {
  const sym = SYMBOLS[cur] ?? "";
  const [w, d] = Math.abs(n).toFixed(2).split(".");
  return sym + w.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + "." + d;
}

function niceDate(d: string) {
  if (!d) return "—";
  const m = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const p = d.split("-");
  if (p.length !== 3) return d;
  return parseInt(p[2], 10) + " " + m[parseInt(p[1], 10) - 1] + " " + p[0];
}

export function GeneratorView() {
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

  const [cur, setCur] = useState("ZAR");
  const [from, setFrom] = useState({ name: "", email: "", address: "", vat: "" });
  const [to, setTo] = useState({ name: "", email: "", address: "" });
  const [num, setNum] = useState("INV-1001");
  const [issued, setIssued] = useState(today);
  const [due, setDue] = useState(in30);
  const [items, setItems] = useState<Item[]>([{ desc: "", qty: 1, rate: 0 }]);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");

  const totals = useMemo(() => {
    const sub = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);
    const tax = sub * ((Number(taxRate) || 0) / 100);
    return { sub, tax, total: sub + tax };
  }, [items, taxRate]);

  function setItem(i: number, patch: Partial<Item>) {
    setItems((arr) => arr.map((it, n) => (n === i ? { ...it, ...patch } : it)));
  }

  return (
    <div className="gen-grid">
      <div className="gen-form">
        <div className="gen-row">
          <label>Currency
            <select value={cur} onChange={(e) => setCur(e.target.value)}>
              {Object.keys(SYMBOLS).map((c) => <option key={c} value={c}>{c} ({SYMBOLS[c]})</option>)}
            </select>
          </label>
          <label>Invoice number
            <input value={num} onChange={(e) => setNum(e.target.value)} />
          </label>
        </div>

        <h3>Your details</h3>
        <label>Business or your name
          <input value={from.name} onChange={(e) => setFrom({ ...from, name: e.target.value })} placeholder="Studio Kaya" />
        </label>
        <div className="gen-row">
          <label>Email
            <input value={from.email} onChange={(e) => setFrom({ ...from, email: e.target.value })} placeholder="you@studio.com" />
          </label>
          <label>VAT or tax number
            <input value={from.vat} onChange={(e) => setFrom({ ...from, vat: e.target.value })} placeholder="Optional" />
          </label>
        </div>
        <label>Address
          <textarea value={from.address} onChange={(e) => setFrom({ ...from, address: e.target.value })} placeholder="123 Long Street, Cape Town" />
        </label>

        <h3>Bill to</h3>
        <label>Client name
          <input value={to.name} onChange={(e) => setTo({ ...to, name: e.target.value })} placeholder="Luminary Media" />
        </label>
        <div className="gen-row">
          <label>Client email
            <input value={to.email} onChange={(e) => setTo({ ...to, email: e.target.value })} placeholder="accounts@client.com" />
          </label>
          <label>Client address
            <input value={to.address} onChange={(e) => setTo({ ...to, address: e.target.value })} placeholder="Optional" />
          </label>
        </div>

        <h3>Dates</h3>
        <div className="gen-row">
          <label>Issued
            <input type="date" value={issued} onChange={(e) => setIssued(e.target.value)} />
          </label>
          <label>Due
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
        </div>

        <h3>What you are charging for</h3>
        {items.map((it, i) => (
          <div className="gen-item" key={i}>
            <input value={it.desc} onChange={(e) => setItem(i, { desc: e.target.value })} placeholder="Brand video — 90 sec" />
            <input type="number" min="0" step="any" value={it.qty} onChange={(e) => setItem(i, { qty: parseFloat(e.target.value) || 0 })} />
            <input type="number" min="0" step="0.01" value={it.rate} onChange={(e) => setItem(i, { rate: parseFloat(e.target.value) || 0 })} />
            <button onClick={() => setItems(items.filter((_, n) => n !== i))} disabled={items.length === 1} aria-label="Remove line">×</button>
          </div>
        ))}
        <button className="gen-add" onClick={() => setItems([...items, { desc: "", qty: 1, rate: 0 }])}>
          Add another line
        </button>

        <div className="gen-row">
          <label>Tax rate (%)
            <input type="number" min="0" step="0.1" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} />
          </label>
        </div>

        <label>Payment instructions
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={"Bank: FNB\nAccount: 000000000\nReference: " + num} />
        </label>

        <button className="gen-print" onClick={() => window.print()}>Download as PDF</button>
        <p className="gen-fine">Opens your print dialog — choose &ldquo;Save as PDF&rdquo;. Nothing is uploaded or stored.</p>
      </div>

      <div className="gen-preview">
        <div className="gen-paper" id="gen-paper">
          <div className="gp-top">
            <div>
              <div className="gp-logo">{from.name || "Your business"}</div>
              <div className="gp-small">
                {from.address.split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}
                {from.email}
                {from.vat ? <><br />VAT {from.vat}</> : null}
              </div>
            </div>
            <div className="gp-meta">
              <div className="gp-kicker">Tax Invoice</div>
              <div className="gp-num">{num || "—"}</div>
              <div className="gp-small">
                Issued {niceDate(issued)}<br />
                Due {niceDate(due)}
              </div>
            </div>
          </div>

          <div className="gp-billto">
            <div className="gp-label">Bill to</div>
            <strong>{to.name || "Your client"}</strong>
            <div className="gp-small">{to.email}<br />{to.address}</div>
          </div>

          <table className="gp-tbl">
            <thead>
              <tr><th>Description</th><th className="c">Qty</th><th className="r">Rate</th><th className="r">Amount</th></tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td>{it.desc || "—"}</td>
                  <td className="c">{it.qty}</td>
                  <td className="r">{money(it.rate, cur)}</td>
                  <td className="r"><strong>{money((it.qty || 0) * (it.rate || 0), cur)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="gp-totals">
            <div><span>Subtotal</span><span>{money(totals.sub, cur)}</span></div>
            {taxRate > 0 && <div><span>Tax ({taxRate}%)</span><span>{money(totals.tax, cur)}</span></div>}
            <div className="gp-grand"><span>Total due</span><span>{money(totals.total, cur)}</span></div>
          </div>

          {notes && (
            <div className="gp-notes">
              <strong>Payment instructions</strong><br />
              {notes.split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
