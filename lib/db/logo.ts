"use server";

import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/db/context";

export async function uploadLogo(formData: FormData): Promise<{ ok: boolean; url?: string; message: string }> {
  const { tenantId } = await requireTenant();
  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) return { ok: false, message: "No file selected." };
  if (file.size > 1_000_000) return { ok: false, message: "Logo must be under 1MB." };
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    return { ok: false, message: "Use a PNG, JPG or WebP image." };
  }

  const supabase = await createClient();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = tenantId + "/logo." + ext;

  const { error: upErr } = await supabase.storage
    .from("logos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) return { ok: false, message: upErr.message };

  const { data: pub } = supabase.storage.from("logos").getPublicUrl(path);
  const url = pub.publicUrl + "?v=" + Date.now();

  const { error: dbErr } = await supabase
    .from("tenants").update({ logo_url: url }).eq("id", tenantId);
  if (dbErr) return { ok: false, message: dbErr.message };

  return { ok: true, url, message: "Logo updated." };
}

export async function removeLogo(): Promise<{ ok: boolean; message: string }> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { error } = await supabase
    .from("tenants").update({ logo_url: null }).eq("id", tenantId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Logo removed." };
}
