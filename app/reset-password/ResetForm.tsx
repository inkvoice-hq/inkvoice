"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePassword } from "@/lib/auth/actions";
import { authStyles as s } from "@/components/authStyles";

export function ResetForm({ email }: { email: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    setError(null);
    const pw = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (pw !== confirm) { setError("The two passwords don't match."); return; }
    start(async () => {
      const r = await updatePassword(pw);
      if (!r.ok) { setError(r.message); return; }
      setDone(true);
      setTimeout(() => router.push("/app"), 1200);
    });
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.brand}>
          <div style={s.brandIcon}>Z</div>
          <span style={s.brandName}>Zarbill</span>
        </div>
        <h1 style={s.h1}>Choose a new password</h1>
        <p style={s.sub}>For {email}</p>
        {done ? (
          <p style={s.ok}>Password updated. Taking you to your dashboard...</p>
        ) : (
          <form action={submit}>
            <label style={s.label}>NEW PASSWORD</label>
            <input name="password" type="password" required minLength={6} autoComplete="new-password" style={s.input} />
            <label style={s.label}>CONFIRM NEW PASSWORD</label>
            <input name="confirm" type="password" required minLength={6} autoComplete="new-password" style={s.input} />
            {error && <p style={s.error}>{error}</p>}
            <button type="submit" disabled={pending} style={s.button}>
              {pending ? "Saving..." : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
