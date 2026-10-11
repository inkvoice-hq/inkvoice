"use server";
import { attempt, type Result } from "@/lib/result";

import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/db/context";
import type { Product, ProductInput } from "@/lib/db/types";

export async function listProducts(): Promise<Product[]> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

async function createProduct_Impl(input: ProductInput): Promise<Product> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({ ...input, tenant_id: tenantId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Product;
}

async function updateProductImpl(id: string, input: Partial<ProductInput>): Promise<Product> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update(input)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Product;
}

async function deleteProductImpl(id: string): Promise<void> {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ---- Actions called from the browser (errors returned, not thrown) ----
export async function createProduct_(input: ProductInput): Promise<Result<Product>> {
  return attempt(() => createProduct_Impl(input));
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Result<Product>> {
  return attempt(() => updateProductImpl(id, input));
}

export async function deleteProduct(id: string): Promise<Result<void>> {
  return attempt(() => deleteProductImpl(id));
}
