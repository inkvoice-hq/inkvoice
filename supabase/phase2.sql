-- =============================================================================
-- Zarbill — Phase 2 migration
-- Run ONCE in Supabase → SQL Editor, BEFORE pushing the Phase 2 code.
-- Safe to re-run.
--   1. A currency per client, invoice and quote (account currency = "home")
--   2. Exchange rate + fees on payments (what actually landed in the bank)
--   3. Daily exchange-rate cache
--   4. Claude-drafted follow-up emails (drafts, approvals, usage)
-- =============================================================================

-- ---------- 1. CURRENCY PER CLIENT / INVOICE / QUOTE --------------------------
alter table public.clients  add column if not exists currency text;          -- null = account currency
alter table public.invoices add column if not exists currency text;
alter table public.invoices add column if not exists fx_rate  numeric(18,8);  -- home units per 1 invoice unit
alter table public.quotes   add column if not exists currency text;

-- Everything that exists today was billed in the account currency.
update public.invoices i set currency = t.currency from public.tenants t
  where i.tenant_id = t.id and i.currency is null;
update public.quotes q set currency = t.currency from public.tenants t
  where q.tenant_id = t.id and q.currency is null;
update public.invoices set fx_rate = 1 where fx_rate is null;

-- ---------- 2. FEES + WHAT ACTUALLY ARRIVED -----------------------------------
-- amount      = credited against the invoice, in the INVOICE currency
-- home_amount = what landed in the bank, in the ACCOUNT currency (after fees)
-- fee         = fees deducted, in the ACCOUNT currency
alter table public.payments add column if not exists home_amount numeric(14,2);
alter table public.payments add column if not exists fee numeric(14,2) not null default 0;
update public.payments set home_amount = amount where home_amount is null;

-- ---------- 3. EXCHANGE-RATE CACHE (shared, read-only for users) ---------------
create table if not exists public.fx_rates (
  day         date primary key,
  base        text not null default 'USD',
  rates       jsonb not null,
  fetched_at  timestamptz not null default now()
);
alter table public.fx_rates enable row level security;
drop policy if exists fx_rates_read on public.fx_rates;
create policy fx_rates_read on public.fx_rates for select using ( auth.uid() is not null );

-- ---------- 4. CLAUDE-DRAFTED FOLLOW-UPS --------------------------------------
create table if not exists public.ai_drafts (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id)  on delete cascade,
  invoice_id     uuid not null references public.invoices(id) on delete cascade,
  tone           text,
  subject        text not null,
  body           text not null,
  status         text not null default 'draft',   -- draft | sent | discarded
  model          text,
  input_tokens   int,
  output_tokens  int,
  created_at     timestamptz not null default now(),
  sent_at        timestamptz
);
create index if not exists idx_ai_drafts_tenant  on public.ai_drafts(tenant_id, created_at);
create index if not exists idx_ai_drafts_invoice on public.ai_drafts(invoice_id);

alter table public.ai_drafts enable row level security;
drop policy if exists ai_drafts_all on public.ai_drafts;
create policy ai_drafts_all on public.ai_drafts
  for all
  using      ( tenant_id in (select public.auth_tenant_ids()) )
  with check ( tenant_id in (select public.auth_tenant_ids()) );
