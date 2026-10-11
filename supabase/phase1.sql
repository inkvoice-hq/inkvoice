-- =============================================================================
-- Zarbill — Phase 1 migration
-- Run ONCE in Supabase → SQL Editor. Safe to re-run (everything is "if not exists").
--   1. Payments ledger + payment link        (partial payments, Pay now)
--   2. Quotes                                 (quotes that convert to invoices)
--   3. Recurring + scheduled sending          (auto-created invoices, due-soon email)
-- =============================================================================

-- ---------- 1. PAYMENTS ------------------------------------------------------
alter table public.tenants  add column if not exists payment_link text;
alter table public.invoices add column if not exists amount_paid numeric(14,2) not null default 0;

create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id)  on delete cascade,
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  amount      numeric(14,2) not null check (amount > 0),
  paid_on     date not null default current_date,
  method      text,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_payments_tenant  on public.payments(tenant_id);
create index if not exists idx_payments_invoice on public.payments(invoice_id);

alter table public.payments enable row level security;
drop policy if exists payments_all on public.payments;
create policy payments_all on public.payments
  for all
  using      ( tenant_id in (select public.auth_tenant_ids()) )
  with check ( tenant_id in (select public.auth_tenant_ids()) );

-- Invoices already marked paid get one payment for the full amount, so the
-- ledger and the status agree from day one.
insert into public.payments (tenant_id, invoice_id, amount, paid_on, method, note)
select i.tenant_id, i.id, i.total, coalesce(i.paid_date, i.issue_date, current_date),
       'Recorded', 'Marked paid before payment tracking'
from public.invoices i
where i.status = 'paid' and i.total > 0
  and not exists (select 1 from public.payments p where p.invoice_id = i.id);

update public.invoices i
set amount_paid = coalesce((select sum(p.amount) from public.payments p where p.invoice_id = i.id), 0);

-- ---------- 2. QUOTES --------------------------------------------------------
alter table public.tenants add column if not exists next_quote_number int not null default 1001;

create table if not exists public.quotes (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenants(id) on delete cascade,
  client_id             uuid references public.clients(id) on delete set null,
  number                text not null,
  issue_date            date,
  valid_until           date,
  description           text,
  status                text not null default 'draft',  -- draft|sent|accepted|declined|converted
  tax_rate              numeric(6,3) not null default 0,
  discount              numeric(14,2) not null default 0,
  notes                 text,
  items                 jsonb not null default '[]'::jsonb,
  subtotal              numeric(14,2) not null default 0,
  total                 numeric(14,2) not null default 0,
  public_token          uuid not null default gen_random_uuid(),
  sent_at               timestamptz,
  viewed_at             timestamptz,
  accepted_at           timestamptz,
  declined_at           timestamptz,
  converted_invoice_id  uuid references public.invoices(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (tenant_id, number)
);
create unique index if not exists quotes_public_token_key on public.quotes(public_token);
create index if not exists idx_quotes_tenant on public.quotes(tenant_id);

alter table public.quotes enable row level security;
drop policy if exists quotes_all on public.quotes;
create policy quotes_all on public.quotes
  for all
  using      ( tenant_id in (select public.auth_tenant_ids()) )
  with check ( tenant_id in (select public.auth_tenant_ids()) );

drop trigger if exists trg_quotes_touch on public.quotes;
create trigger trg_quotes_touch before update on public.quotes
  for each row execute function public.touch_updated_at();

alter table public.invoices add column if not exists quote_id uuid references public.quotes(id) on delete set null;

-- ---------- 3. RECURRING + SCHEDULED SENDING ---------------------------------
alter table public.invoices
  add column if not exists recur_next_date      date,
  add column if not exists recur_parent_id      uuid references public.invoices(id) on delete set null,
  add column if not exists recur_auto_send      boolean not null default true,
  add column if not exists scheduled_send_date  date,
  add column if not exists sent_at              timestamptz,
  add column if not exists due_soon_sent        boolean not null default false;

-- Existing recurring invoices: schedule the next copy for the first
-- occurrence AFTER today (no back-dated pile-up of invoices).
update public.invoices i
set recur_next_date = (
  select min((i.issue_date + k * case i.recurring
                when 'weekly'    then interval '1 week'
                when 'monthly'   then interval '1 month'
                when 'quarterly' then interval '3 months'
                else                  interval '1 year'
              end)::date)
  from generate_series(1, 600) k
  where (i.issue_date + k * case i.recurring
           when 'weekly'    then interval '1 week'
           when 'monthly'   then interval '1 month'
           when 'quarterly' then interval '3 months'
           else                  interval '1 year'
         end)::date > current_date
)
where coalesce(i.recurring, '') <> '' and i.issue_date is not null and i.recur_next_date is null;

-- Don't send "due soon" emails for invoices that already exist.
update public.invoices set due_soon_sent = true where status <> 'paid';
