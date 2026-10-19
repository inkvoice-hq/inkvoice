"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";
import { unwrap } from "@/lib/result";
import { draftFollowUp, sendFollowUp, discardFollowUp } from "@/lib/db/followups";
import { sendInvoiceEmail } from "@/lib/email/invoice";
import type { NextStep } from "@/lib/insights";

export type FollowUpRow = {
  id: string; number: string; client: string; hasEmail: boolean;
  balance: number; currency: string; dueDate: string; overdueDays: number;
  viewed: boolean; sentByZarbill: boolean; reminders: number; partial: boolean;
  payer: string; payerLabel: string; step: NextStep; lastPersonal: string | null;
};
type Tone = "friendly" | "firm" | "final";

export function FollowUpsView({ rows, usage }: { rows: FollowUpRow[]; usage: { used: number; limit: number; enabled: boolean } }) {
  const router = useRouter();
  const [open, setOpen] = useState<FollowUpRow | null>(null);
  const [tone, setTone] = useState<Tone>("friendly");
  const [note, setNote] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState<"" | "draft" | "send">("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [used, setUsed] = useState(usage.used);

  const needs = rows.filter((r) => r.step.priority >= 40);
  const soon = rows.filter((r) => r.step.priority < 40);

  function start(r: FollowUpRow) {
    setOpen(r); setTone(r.step.tone); setNote(""); setDraftId(null); setSubject(""); setBody(""); setErr(null); setDone(null);
  }
  async function close() {
    if (draftId && !done) { try { await discardFollowUp(draftId); } catch { /* ignore */ } }
    setOpen(null);
  }
  async function generate() {
    if (!open) return;
    setBusy("draft"); setErr(null);
    try {
      if (draftId) { try { await discardFollowUp(draftId); } catch { /* ignore */ } }
      const d = unwrap(await draftFollowUp(open.id, tone, note));
      setDraftId(d.id); setSubject(d.subject); setBody(d.body); setUsed((u) => u + 1);
    } catch (e: any) { setErr(e?.message || "Couldn't write a draft."); }
    finally { setBusy(""); }
  }
  async function send() {
    if (!draftId) return;
    if (!confirm("Send this email to " + open?.client + " now?")) return;
    setBusy("send"); setErr(null);
    try {
      const r = unwrap(await sendFollowUp(draftId, subject, body));
      setDone("Sent to " + r.to + ". Automatic reminders will wait at least 3 days.");
      router.refresh();
    } catch (e: any) { setErr(e?.message || "Couldn't send."); }
    finally { setBusy(""); }
  }

  const left = Math.max(0, usage.limit - used);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Invoice never emailed from Zarbill: send it right here, no drafting needed.
  async function sendInvoiceNow(r: FollowUpRow) {
    if (!confirm("Email invoice " + r.number + " to " + r.client + " now?")) return;
    setSendingId(r.id);
    try {
      const res = await sendInvoiceEmail(r.id);
      alert(res.message);
      if (res.ok) router.refresh();
    } catch (e: any) {
      alert(e?.message || "Send failed.");
    } finally { setSendingId(null); }
  }

  return (
    <>
      <style>{css}</style>
      <div className="ink-topbar">
        <div className="ink-tb-title">Follow-ups</div>
        <div className="fu-usage">{usage.enabled ? `${left} of ${usage.limit} AI drafts left this month` : "AI drafting not switched on"}</div>
      </div>

      <div className="ink-page fu-wrap">
        <p className="fu-intro">
          Automatic reminders go out on their own. This page is for the ones that need a personal touch: Zarbill looks at
          whether the client opened the invoice, what they&apos;ve paid, and how they usually pay, then suggests what to do.
          Claude can draft the email for you; you edit it and decide whether to send it.
        </p>

        {needs.length === 0 ? (
          <div className="fu-empty">
            <h3>No one needs chasing right now</h3>
            <p>Overdue and soon-due invoices that need attention will show up here.</p>
          </div>
        ) : (
          <div className="fu-list">
            {needs.map((r) => (
              <div className="fu-card" key={r.id}>
                <div className="fu-main">
                  <div className="fu-top">
                    <strong className="fu-num">{r.number}</strong>
                    <span className="fu-client">{r.client}</span>
                    <span className="fu-amt">{money(r.balance, r.currency)}</span>
                  </div>
                  <div className="fu-step">
                    <span className={"fu-pri p" + (r.step.priority >= 85 ? "3" : r.step.priority >= 60 ? "2" : "1")}>{r.step.title}</span>
                    <span className="fu-detail">{r.step.detail}</span>
                  </div>
                  <div className="fu-facts">
                    <span>{r.overdueDays > 0 ? `${r.overdueDays} days overdue` : r.overdueDays === 0 ? "Due today" : `Due in ${-r.overdueDays} days`}</span>
                    <span className={r.viewed ? "ok" : "warn"}>{r.sentByZarbill ? (r.viewed ? "Opened" : "Not opened") : "Not sent via Zarbill"}</span>
                    <span>{r.reminders} auto reminder{r.reminders === 1 ? "" : "s"}</span>
                    {r.partial && <span className="ok">Part paid</span>}
                    <span>{r.payer}</span>
                    {r.lastPersonal && <span>Personal follow-up sent {r.lastPersonal.slice(0, 10)}</span>}
                  </div>
                </div>
                <div className="fu-cta">
                  {r.hasEmail
                    ? (r.step.title === "Send the invoice"
                      ? <button className="ink-btn ink-btn-primary" onClick={() => sendInvoiceNow(r)} disabled={sendingId === r.id}>
                          {sendingId === r.id ? "Sending..." : "Send invoice now"}
                        </button>
                      : <button className="ink-btn ink-btn-primary" onClick={() => start(r)} disabled={!usage.enabled}>Draft with Claude</button>)
                    : <a className="fu-link" href="/app/clients">Add client email first</a>}
                </div>
              </div>
            ))}
          </div>
        )}

        {soon.length > 0 && (
          <details className="fu-soon">
            <summary>No action needed right now ({soon.length}): not due yet, or paused</summary>
            {soon.map((r) => (
              <div key={r.id} className="fu-soon-row">
                <span className="fu-num">{r.number}</span> {r.client} · {money(r.balance, r.currency)} · {r.step.detail}
              </div>
            ))}
          </details>
        )}
      </div>

      {open && (
        <div className="ink-overlay" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="ink-modal">
            <div className="ink-modal-head">
              <h2>Follow up · {open.number}</h2>
              <button className="ink-close" onClick={close}>×</button>
            </div>
            <div className="ink-modal-body">
              <p className="fu-context">
                <strong>{open.step.title}.</strong> {open.step.detail}
              </p>

              {done ? (
                <p className="fu-done">{done}</p>
              ) : (
                <>
                  <div className="fu-tones">
                    {(["friendly", "firm", "final"] as const).map((t) => (
                      <button key={t} className={tone === t ? "on" : ""} onClick={() => setTone(t)}>
                        {t === "friendly" ? "Friendly" : t === "firm" ? "Firm" : "Final notice"}
                      </button>
                    ))}
                  </div>
                  <div className="ink-fg">
                    <label>Anything Claude should know? (optional)</label>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                      placeholder="e.g. We spoke on Tuesday and she said finance would pay this week" />
                  </div>
                  <button className="ink-btn ink-btn-ghost" onClick={generate} disabled={busy !== "" || left <= 0}>
                    {busy === "draft" ? "Claude is writing..." : draftId ? "Rewrite" : "Write draft"}
                  </button>

                  {draftId && (
                    <div className="fu-draft">
                      <div className="ink-fg">
                        <label>Subject</label>
                        <input value={subject} onChange={(e) => setSubject(e.target.value)} />
                      </div>
                      <div className="ink-fg">
                        <label>Message (edit freely)</label>
                        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={9} />
                      </div>
                      <p className="fu-note">
                        {"The invoice amount, a "}<strong>Pay now</strong>{" button (if you've added a payment link) and a "}
                        <strong>View invoice</strong>{" button are added under your message. Replies go to your email."}
                      </p>
                    </div>
                  )}
                </>
              )}
              {err && <p className="ink-err">{err}</p>}
            </div>
            <div className="ink-modal-foot">
              <button className="ink-btn ink-btn-ghost" onClick={close}>{done ? "Close" : "Cancel"}</button>
              {draftId && !done && (
                <button className="ink-btn ink-btn-primary" onClick={send} disabled={busy !== ""}>
                  {busy === "send" ? "Sending..." : "Send to " + open.client}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const css = `
.ink-topbar { position: sticky; top: 0; z-index: 40; background: rgba(10,10,13,0.85); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); padding: 0 32px; height: 60px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.ink-tb-title { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
.ink-page { padding: 32px; }
.ink-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: 'Syne', sans-serif; white-space: nowrap; transition: all 0.15s; }
.ink-btn-primary { background: var(--electric); color: var(--ink); box-shadow: 0 0 20px rgba(79,255,176,0.2); }
.ink-btn-primary:hover { background: #6fffbe; }
.ink-btn:disabled { opacity: 0.5; cursor: default; }
.ink-btn-ghost { background: rgba(255,255,255,0.04); color: var(--text); border: 1px solid var(--border2); }
.ink-btn-ghost:hover { background: rgba(255,255,255,0.08); }
.ink-fg { margin: 14px 0; }
.ink-fg label { display: block; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 7px; }
.ink-fg input, .ink-fg textarea { width: 100%; background: var(--ink3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 10px 13px; font-family: 'Syne', sans-serif; font-size: 14px; outline: none; line-height: 1.55; resize: vertical; }
.ink-fg input:focus, .ink-fg textarea:focus { border-color: var(--electric); }
.ink-err { color: var(--electric3); font-size: 13px; margin: 12px 0 0; }
.ink-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
.ink-modal { background: var(--ink2); border: 1px solid var(--border2); border-radius: 20px; width: 100%; max-width: 640px; max-height: 92vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
.ink-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border); }
.ink-modal-head h2 { font-family: 'Instrument Serif', serif; font-size: 22px; font-weight: 400; font-style: italic; margin: 0; }
.ink-close { background: rgba(255,255,255,0.06); border: none; border-radius: 6px; cursor: pointer; color: var(--muted); width: 30px; height: 30px; font-size: 18px; }
.ink-modal-body { padding: 20px 24px; }
.ink-modal-foot { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; gap: 10px; justify-content: flex-end; }
.fu-usage { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted2); }
.fu-wrap { max-width: 980px; }
.fu-intro { color: var(--muted2); font-size: 13px; line-height: 1.7; margin: 0 0 22px; max-width: 760px; }
.fu-empty { background: var(--ink2); border: 1px solid var(--border); border-radius: 14px; padding: 36px; text-align: center; color: var(--muted2); }
.fu-empty h3 { color: var(--text); margin: 0 0 6px; }
.fu-list { display: grid; gap: 12px; }
.fu-card { background: var(--ink2); border: 1px solid var(--border); border-radius: 14px; padding: 18px 20px; display: flex; gap: 18px; align-items: center; justify-content: space-between; }
.fu-top { display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; }
.fu-num { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 13px; }
.fu-client { color: var(--muted2); font-size: 13px; }
.fu-amt { font-family: 'JetBrains Mono', monospace; color: var(--electric); font-size: 13px; }
.fu-step { margin: 10px 0 8px; display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
.fu-pri { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }
.fu-pri.p3 { background: rgba(255,107,107,0.14); color: var(--electric3); }
.fu-pri.p2 { background: rgba(255,201,64,0.14); color: var(--gold); }
.fu-pri.p1 { background: rgba(0,212,255,0.12); color: var(--electric2); }
.fu-detail { font-size: 13px; color: var(--text); line-height: 1.5; }
.fu-facts { display: flex; flex-wrap: wrap; gap: 6px 14px; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: var(--muted); }
.fu-facts .ok { color: var(--electric); } .fu-facts .warn { color: var(--gold); }
.fu-link { color: var(--electric); font-size: 13px; text-decoration: none; white-space: nowrap; }
.fu-soon { margin-top: 22px; color: var(--muted2); font-size: 13px; }
.fu-soon summary { cursor: pointer; margin-bottom: 10px; }
.fu-soon-row { padding: 6px 0; border-top: 1px solid var(--border); font-size: 12px; }
.fu-context { background: var(--ink3); border-radius: 10px; padding: 12px 14px; font-size: 13px; line-height: 1.6; color: var(--muted2); margin: 0 0 6px; }
.fu-context strong { color: var(--text); }
.fu-tones { display: inline-flex; gap: 2px; padding: 4px; background: var(--ink3); border-radius: 10px; margin-top: 12px; }
.fu-tones button { background: none; border: none; color: var(--muted2); padding: 7px 14px; border-radius: 7px; cursor: pointer; font-family: 'Syne', sans-serif; font-size: 13px; }
.fu-tones button.on { background: var(--ink2); color: var(--text); box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
.fu-draft { margin-top: 10px; border-top: 1px solid var(--border); padding-top: 4px; }
.fu-note { font-size: 11.5px; color: var(--muted); line-height: 1.6; margin: 0; }
.fu-done { background: rgba(79,255,176,0.08); border: 1px solid rgba(79,255,176,0.3); color: var(--electric); border-radius: 10px; padding: 12px 14px; font-size: 13px; }
@media (max-width: 700px) {
  .ink-page { padding: 20px 16px; }
  .ink-topbar { padding: 0 16px; }
  .fu-usage { display: none; }
  .fu-card { flex-direction: column; align-items: stretch; }
  .fu-cta .ink-btn { width: 100%; justify-content: center; }
}
`;
