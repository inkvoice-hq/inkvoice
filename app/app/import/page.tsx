import type { Metadata } from "next";
import { requireTenant } from "@/lib/db/context";
import { ImportView } from "./ImportView";

export const metadata: Metadata = { title: "Import & export" };

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireTenant();
  const { type } = await searchParams;
  return <ImportView initialType={type === "invoices" ? "invoices" : "clients"} />;
}
