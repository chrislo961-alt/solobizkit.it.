alter table public.company_settings
  add column if not exists notify_estimate_responses boolean not null default true,
  add column if not exists notify_invoice_paid boolean not null default true;
