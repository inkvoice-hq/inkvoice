"use client";

import { useEffect } from "react";
import { recordInvoiceView } from "@/lib/public-invoice";

/** Records the view once the page is open in a browser; Pay now + PDF download. */
export function InvoiceActions({ token, payUrl, payLabel }: { token: string; payUrl?: string | null; payLabel?: string }) {
  useEffect(() => {
    const t = setTimeout(() => { recordInvoiceView(token).catch(() => {}); }, 1200);
    return () => clearTimeout(t);
  }, [token]);

  return (
    <div className="hi-actions">
      {payUrl && (
        <a className="hi-pay" href={payUrl} target="_blank" rel="noopener noreferrer">{payLabel || "Pay now"}</a>
      )}
      <button className={"hi-btn" + (payUrl ? " hi-btn-ghost" : "")} onClick={() => window.print()}>
        Download PDF
      </button>
    </div>
  );
}
