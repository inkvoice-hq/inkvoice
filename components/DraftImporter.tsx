"use client";
// Picks up an invoice made in the free generator (saved in this browser) and
// saves it into the account the first time the person lands in the app.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { readDraft, clearDraft, draftHasContent } from "@/lib/draft";
import { importGeneratorDraft } from "@/lib/db/import-draft";

let started = false; // guards against double-run in development

export function DraftImporter() {
  const router = useRouter();
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (started) return;
    const d = readDraft();
    if (!d || !draftHasContent(d)) return;
    started = true;
    importGeneratorDraft(d)
      .then((r) => {
        if (r.ok) {
          clearDraft();
          setSaved(r.number || "your invoice");
          router.refresh();
        } else if (r.message === "Nothing to import.") {
          clearDraft();
        }
      })
      .catch(() => { started = false; });
  }, [router]);

  if (!saved) return null;
  return (
    <div className="ink-draft-toast" role="status">
      <span>
        <strong>Invoice {saved} saved to your account.</strong> Your client and business details came across too.
      </span>
      <Link href="/app/invoices" onClick={() => setSaved(null)}>View invoice</Link>
      <button onClick={() => setSaved(null)} aria-label="Dismiss">×</button>
    </div>
  );
}
