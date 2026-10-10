"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth/actions";
import { authStyles as s } from "@/components/authStyles";

export function ForgotForm({ expired }: { expired: boolean }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    setError(null);
    start(async () => {
      const r = await requestPasswordReset(fd);
      if (r?.error) setError(r.error);
      else setSent(true);
    });
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <Link href="/" style={s.brand}>
          <div style={s.brandIcon}>Z</div>
          <span style={s.brandName}>Zarbill</span>
        </Link>
        <h1 style={s.h1}>Reset your password</h1>
        {sent ? (
          <p style={s.ok}>
            If an account exists for that email, a reset link is on its way. Open it on this
            device and you&apos;ll be able to choose a new password. Check your spam folder if it
            doesn&apos;t arrive within a few minutes.
          </p>
        ) : (
          <>
            <p style={s.sub}>
              {expired
                ? "That reset link has expired or was already used. Enter your email and we'll send a fresh one."
                : "Enter the email you signed up with and we'll send you a link to choose a new password."}
            </p>
            <form action={submit}>
              <label style={s.label}>EMAIL</label>
              <input name="email" type="email" required placeholder="you@studio.com" style={s.input} />
              {error && <p style={s.error}>{error}</p>}
              <button type="submit" disabled={pending} style={s.button}>
                {pending ? "Sending..." : "Send reset link"}
              </button>
            </form>
          </>
        )}
        <Link href="/login" style={s.link}>Back to log in</Link>
      </div>
    </div>
  );
}
