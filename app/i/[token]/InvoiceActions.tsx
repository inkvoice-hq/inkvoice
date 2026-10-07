"use client";

import { useEffect } from "react";
import { recordInvoiceView } from "@/lib/public-invoice";

/** Records the view once the page is actually open in a browser, and offers PDF download. */
export function InvoiceActions({ token }: { token: string }) {
  useEffect(() => {
    const t = setTimeout(() => { recordInvoiceView(token).catch(() => {}); }, 1200);
    return () => clearTimeout(t);
  }, [token]);

  return (
    <button className="hi-btn" onClick={() => window.print()}>
      Download PDF
    </button>
  );
}
