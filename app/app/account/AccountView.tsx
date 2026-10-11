"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { updatePassword, logOut } from "@/lib/auth/actions";

export function AccountView({ email, bizName, plan, since }: {
  email: string; bizName: string; plan: string; since: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null); setMsg(null);
    const fd = new FormData(e.currentTarget);
    const current = String(fd.get("current") ?? "");
    const next = String(fd.get("next") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (next !== confirm) { setErr("The new passwords don't match."); return; }
    setBusy(true);
    try {
      const r = await updatePassword(next, current);
      if (r.ok) { setMsg("Password updated."); formRef.current?.reset(); }
      else setErr(r.message);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong.");
    } finally { setBusy(false); }
  }

  const memberSince = since
    ? new Date(since).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <>
      <style>{css}</style>
      <div className="ink-topbar">
        <div className="ink-tb-title">Account</div>
      </div>

      <div className="ink-page">
        <div className="ac-grid">
          <div className="ink-card">
            <div className="ink-card-head"><span>Your account</span></div>
            <div className="ink-card-body">
              <div className="ac-row"><span>Email</span><strong>{email}</strong></div>
              <div className="ac-row"><span>Business</span><strong>{bizName}</strong></div>
              <div className="ac-row">
                <span>Plan</span>
                <strong className="ac-plan">{plan.toUpperCase()}</strong>
                <Link href="/app/upgrade" className="ac-link">Change plan</Link>
              </div>
              {memberSince && <div className="ac-row"><span>Member since</span><strong>{memberSince}</strong></div>}
              <p className="ink-hint" style={{ marginTop: 16 }}>
                Business details, logo and invoice defaults live in <Link href="/app/settings" className="ac-link">Settings</Link>.
              </p>
            </div>
          </div>

          <div className="ink-card">
            <div className="ink-card-head"><span>Change password</span></div>
            <form ref={formRef} className="ink-card-body" onSubmit={onChangePassword}>
              <div className="ink-fg">
                <label>Current password</label>
                <input name="current" type="password" required autoComplete="current-password" />
              </div>
              <div className="ink-fg">
                <label>New password</label>
                <input name="next" type="password" required minLength={6} autoComplete="new-password" />
              </div>
              <div className="ink-fg">
                <label>Confirm new password</label>
                <input name="confirm" type="password" required minLength={6} autoComplete="new-password" />
              </div>
              <div className="ac-actions">
                <Link href="/forgot-password" className="ac-link ac-small">Forgot your current password?</Link>
                <button className="ink-btn ink-btn-primary" type="submit" disabled={busy}>
                  {busy ? "Saving..." : "Update password"}
                </button>
              </div>
              {err && <p className="ink-err">{err}</p>}
              {msg && <p className="ink-ok">{msg}</p>}
            </form>
          </div>

          <div className="ink-card">
            <div className="ink-card-head"><span>Your data</span></div>
            <div className="ink-card-body ac-session">
              <p className="ink-hint" style={{ margin: 0 }}>
                Download your clients, invoices, quotes and payments as CSV, or import from another tool.
              </p>
              <Link href="/app/import" className="ink-btn ink-btn-ghost">Import &amp; export</Link>
            </div>
          </div>

          <div className="ink-card">
            <div className="ink-card-head"><span>Session</span></div>
            <div className="ink-card-body ac-session">
              <p className="ink-hint" style={{ margin: 0 }}>Signed in as {email}</p>
              <form action={logOut}>
                <button className="ink-btn ink-btn-ghost" type="submit">Log out</button>
              </form>
            </div>
          </div>

          <p className="ink-hint">
            Need to delete your account or change your email address? Email{" "}
            <a href="mailto:support@zarbill.com" className="ac-link">support@zarbill.com</a> and we&apos;ll sort it out.
          </p>
        </div>
      </div>
    </>
  );
}

const css = `
.ink-topbar { position: sticky; top: 0; z-index: 40; background: rgba(10,10,13,0.85); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); padding: 0 32px; height: 60px; display: flex; align-items: center; justify-content: space-between; }
.ink-tb-title { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
.ink-page { padding: 32px; }
.ink-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: 'Syne', sans-serif; transition: all 0.15s; white-space: nowrap; }
.ink-btn-primary { background: var(--electric); color: var(--ink); box-shadow: 0 0 20px rgba(79,255,176,0.2); }
.ink-btn-primary:hover { background: #6fffbe; }
.ink-btn-primary:disabled { opacity: 0.6; cursor: default; }
.ink-btn-ghost { text-decoration: none; background: rgba(255,255,255,0.04); color: var(--text); border: 1px solid var(--border2); }
.ink-btn-ghost:hover { background: rgba(255,107,107,0.1); color: var(--electric3); border-color: rgba(255,107,107,0.3); }
.ink-card { background: var(--ink2); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
.ink-card-head { padding: 18px 24px; border-bottom: 1px solid var(--border); font-size: 14px; font-weight: 600; }
.ink-card-body { padding: 24px; }
.ink-hint { color: var(--muted); font-size: 12px; margin: 0; line-height: 1.6; }
.ink-fg { margin-bottom: 16px; }
.ink-fg label { display: block; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 7px; }
.ink-fg input { width: 100%; background: var(--ink3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 10px 13px; font-family: 'Syne', sans-serif; font-size: 16px; outline: none; }
.ink-fg input:focus { border-color: var(--electric); box-shadow: 0 0 0 3px rgba(79,255,176,0.08); }
.ink-err { color: var(--electric3); font-size: 13px; margin: 14px 0 0; }
.ink-ok { color: var(--electric); font-size: 13px; margin: 14px 0 0; }
.ac-grid { display: grid; gap: 20px; max-width: 640px; }
.ac-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
.ac-row span { width: 120px; flex-shrink: 0; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1.5px; }
.ac-row strong { font-weight: 600; word-break: break-all; }
.ac-plan { color: var(--electric); font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.ac-link { color: var(--electric); text-decoration: none; font-size: 13px; }
.ac-link:hover { text-decoration: underline; }
.ac-row .ac-link { margin-left: auto; }
.ac-small { font-size: 12px; }
.ac-actions { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-top: 6px; }
.ac-session { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
@media (max-width: 640px) { .ink-page { padding: 20px 16px; } .ac-row { flex-wrap: wrap; } .ac-row span { width: 100%; } }
`;
