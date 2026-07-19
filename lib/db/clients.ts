"use server";

import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/db/context";
import type { Client, ClientInput } from "@/lib/db/types";

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

export async function createClient_(input: ClientInput): Promise<Client> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...input, tenant_id: tenantId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Client;
}

export async function updateClient(id: string, input: Partial<ClientInput>): Promise<Client> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update(input)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Client;
}

export async function deleteClient(id: string): Promise<void> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}
