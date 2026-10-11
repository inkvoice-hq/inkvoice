// lib/draft.ts
// Shape + storage key for an invoice made in the free generator, kept in the
// visitor's browser so it can be saved into a new account after sign-up.
export const DRAFT_KEY = "zarbill:generator-draft";

export type GeneratorDraft = {
  v: 1;
  cur: string;
  from: { name: string; email: string; address: string; vat: string };
  to: { name: string; email: string; address: string };
  num: string;
  issued: string;
  due: string;
  items: { desc: string; qty: number; rate: number }[];
  taxRate: number;
  notes: string;
  savedAt: string;
};

/** True when the visitor actually typed something worth keeping. */
export function draftHasContent(d: GeneratorDraft | null | undefined): boolean {
  if (!d || d.v !== 1) return false;
  return (d.items || []).some((i) => (i.desc || "").trim() || Number(i.rate) > 0) || !!(d.to?.name || "").trim();
}

export function readDraft(): GeneratorDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && d.v === 1 ? (d as GeneratorDraft) : null;
  } catch {
    return null;
  }
}

export function writeDraft(d: GeneratorDraft): void {
  try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* private mode etc. */ }
}

export function clearDraft(): void {
  try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}
