// lib/totals.ts — line-item and total maths shared by invoices and quotes.
import { round2 } from "@/lib/format";
import type { InvoiceItem } from "@/lib/db/types";

export function computeTotals(items: InvoiceItem[], taxRate: number, discount: number) {
  const clean: InvoiceItem[] = (items ?? [])
    .filter((i) => (i?.desc ?? "").trim() !== "" || Number(i?.qty) || Number(i?.rate))
    .map((i) => {
      const qty = round2(Number(i.qty) || 0);
      const rate = round2(Number(i.rate) || 0);
      return { desc: String(i.desc ?? ""), qty, rate, total: round2(qty * rate) };
    });

  const subtotal = round2(clean.reduce((s, i) => s + i.total, 0));
  const tax = round2(subtotal * ((Number(taxRate) || 0) / 100));
  const disc = round2(Number(discount) || 0);
  const total = round2(Math.max(0, subtotal + tax - disc));

  return { items: clean, subtotal, total };
}
