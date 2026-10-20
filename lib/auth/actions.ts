"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface AuthResult {
  error?: string;
  /** Set after a successful sign-up that is already logged in (no email confirmation). */
  redirectTo?: string;
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const businessName = String(formData.get("businessName") ?? "My Business").trim();

  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const supabase = await createClient();

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://zarbill.com").replace(/\/$/, "");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Confirmation link logs them straight in (see app/auth/callback).
      emailRedirectTo: site + "/auth/callback?next=/app",
      // Remembered so the workspace gets the right name after confirming.
      data: { business_name: businessName || "My Business" },
    },
  });
  if (error) return { error: error.message };
  if (!data.user) return { error: "Sign up failed. Please try again." };

  if (data.session) {
    const { error: bootErr } = await supabase.rpc("bootstrap_tenant", {
      p_business_name: businessName,
      p_email: email,
    });
    if (bootErr) return { error: "Account created, but workspace setup failed: " + bootErr.message };
    // The browser navigates, so it can record the sign-up for Google Ads first.
    return { redirectTo: "/app" };
  }

  return {};
}

export async function logIn(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect("/app");
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://zarbill.com").replace(/\/$/, "");

/**
 * Change the logged-in user's password.
 * Pass `current` from the Account page (we verify it first); omit it on the
 * reset-password page, where the user arrived via the emailed reset link.
 */
export async function updatePassword(
  next: string,
  current?: string
): Promise<{ ok: boolean; message: string }> {
  if (!next || next.length < 6) return { ok: false, message: "New password must be at least 6 characters." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, message: "Your session has expired. Please log in again." };

  if (current !== undefined) {
    const { error: checkErr } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
    if (checkErr) return { ok: false, message: "Your current password is incorrect." };
    if (current === next) return { ok: false, message: "New password must be different from the current one." };
  }

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Password updated." };
}

/** Email a password-reset link. Always reports success so emails can't be probed. */
export async function requestPasswordReset(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email address." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: SITE_URL + "/auth/callback?next=/reset-password",
  });
  return {};
}
