"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface AuthResult {
  error?: string;
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const businessName = String(formData.get("businessName") ?? "My Business").trim();

  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  if (!data.user) return { error: "Sign up failed. Please try again." };

  if (data.session) {
    const { error: bootErr } = await supabase.rpc("bootstrap_tenant", {
      p_business_name: businessName,
      p_email: email,
    });
    if (bootErr) return { error: "Account created, but workspace setup failed: " + bootErr.message };
    redirect("/app");
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
