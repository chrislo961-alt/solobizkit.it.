create or replace function public.protect_terminal_invoices()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text := coalesce(auth.role(), '');
  old_status text := lower(coalesce(old.status, 'draft'));
  new_status text := lower(coalesce(new.status, 'draft'));
begin
  if caller_role = 'service_role' then
    return new;
  end if;

  if old_status in ('paid', 'void') then
    if (to_jsonb(new) - array['sent_date','updated_at']) is distinct from
       (to_jsonb(old) - array['sent_date','updated_at']) then
      raise exception 'Terminal invoices cannot be modified';
    end if;
    return new;
  end if;

  if new_status = 'paid' then
    if (to_jsonb(new) - array['status','paid_date','updated_at']) is distinct from
       (to_jsonb(old) - array['status','paid_date','updated_at']) then
      raise exception 'Marking an invoice paid may only change payment status fields';
    end if;
  elsif new_status = 'void' then
    if (to_jsonb(new) - array['status','updated_at']) is distinct from
       (to_jsonb(old) - array['status','updated_at']) then
      raise exception 'Voiding an invoice may only change status fields';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_terminal_invoices_before_update on public.invoices;
create trigger protect_terminal_invoices_before_update
before update on public.invoices
for each row execute function public.protect_terminal_invoices();

create or replace function public.protect_terminal_invoice_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text := coalesce(auth.role(), '');
  target_invoice_id uuid;
  parent_status text;
begin
  if caller_role = 'service_role' then
    return coalesce(new, old);
  end if;

  target_invoice_id := coalesce(new.invoice_id, old.invoice_id);
  select lower(coalesce(status, 'draft'))
    into parent_status
    from public.invoices
   where id = target_invoice_id;

  if parent_status in ('paid', 'void') then
    raise exception 'Line items on terminal invoices cannot be modified';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists protect_terminal_invoice_items_before_write on public.invoice_items;
create trigger protect_terminal_invoice_items_before_write
before insert or update or delete on public.invoice_items
for each row execute function public.protect_terminal_invoice_items();
