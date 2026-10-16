"use server";
import { attempt, type Result } from "@/lib/result";

import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/db/context";
import { assertCanCreate } from "@/lib/db/guard";
import type { Client, ClientInput } from "@/lib/db/types";
import { CURRENCY_SYMBOLS } from "@/lib/format";

/** Blank or unknown currency means "use the account currency". */
function cleanCurrency<T extends Partial<ClientInput>>(input: T): T {
  if (!("currency" in input)) return input;
  const c = String(input.currency || "").toUpperCase();
  return { ...input, currency: CURRENCY_SYMBOLS[c] ? c : null };
}

export async function listClients(): Promise<Client[]> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Client[];
}

export async function getClient(id: string): Promise<Client | null> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Client) ?? null;
}

async function createClient_Impl(input: ClientInput): Promise<Client> {
  await assertCanCreate("clients");
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...cleanCurrency(input), tenant_id: tenantId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Client;
}

async function updateClientImpl(id: string, input: Partial<ClientInput>): Promise<Client> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update(cleanCurrency(input))
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Client;
}

async function deleteClientImpl(id: string): Promise<void> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ---- Actions called from the browser (errors returned, not thrown) ----
export async function createClient_(input: ClientInput): Promise<Result<Client>> {
  return attempt(() => createClient_Impl(input));
}

export async function updateClient(id: string, input: Partial<ClientInput>): Promise<Result<Client>> {
  return attempt(() => updateClientImpl(id, input));
}

export async function deleteClient(id: string): Promise<Result<void>> {
  return attempt(() => deleteClientImpl(id));
}
