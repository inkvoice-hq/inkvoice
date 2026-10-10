import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password?expired=1");
  return <ResetForm email={user.email ?? ""} />;
}
