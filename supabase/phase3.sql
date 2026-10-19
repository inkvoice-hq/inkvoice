-- =============================================================================
-- Zarbill — Phase 3 migration ("invoice sent → money received")
-- Run ONCE in Supabase → SQL Editor, BEFORE pushing the Phase 3 code.
-- Safe to re-run.
--   1. Payments remember which statement line they came from (no double imports)
--   2. "Disputed" invoices (reminders pause until resolved)
-- =============================================================================

-- ---------- 1. STATEMENT MATCHING ---------------------------------------------
alter table public.payments add column if not exists source         text;     -- wise | paypal | payoneer | grey | bank | manual ...
alter table public.payments add column if not exists source_ref     text;     -- the statement's own transaction id/line
alter table public.payments add column if not exists home_estimated boolean not null default false;

create unique index if not exists payments_source_ref_key
  on public.payments(tenant_id, source, source_ref)
  where source_ref is not null;

-- ---------- 2. DISPUTES --------------------------------------------------------
alter table public.invoices add column if not exists disputed_at  timestamptz;
alter table public.invoices add column if not exists dispute_note text;
