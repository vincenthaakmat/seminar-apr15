create table if not exists public.aurum_hive_accounts (
  invite_id text primary key,
  name text not null default '',
  country text not null default 'Not specified',
  amount numeric not null default 0,
  total_turnover numeric not null default 0,
  rank text not null default '',
  type text not null check (type in ('main', 'sub')),
  parent_invite_id text,
  updated_at timestamptz not null default now()
);

create index if not exists aurum_hive_accounts_parent_invite_id_idx
  on public.aurum_hive_accounts(parent_invite_id);

alter table public.aurum_hive_accounts
  add column if not exists country text not null default 'Not specified';

alter table public.aurum_hive_accounts
  add column if not exists total_turnover numeric not null default 0;

alter table public.aurum_hive_accounts
  drop constraint if exists aurum_hive_accounts_parent_invite_id_fkey;

create or replace function public.validate_aurum_hive_account()
returns trigger
language plpgsql
as $$
declare
  parent_type text;
begin
  new.rank = upper(coalesce(nullif(trim(new.rank), ''), 'NOVA'));

  if new.rank not in ('NOVA', 'VOYAGER', 'VANGUARD', 'VANGUARD PRO', 'NEXUS', 'ORACLE', 'PRIME', 'ELITE', 'MAGNAT', 'MYTHOS', 'LEGEND') then
    raise exception 'Invalid rank %. Use a supported Aurum rank.', new.rank;
  end if;

  if new.amount <= 0 and new.rank <> 'NOVA' then
    raise exception 'Only funded accounts can have a rank above NOVA.';
  end if;

  if new.parent_invite_id is null then
    if new.type <> 'main' then
      raise exception 'Root accounts must be main accounts.';
    end if;
    return new;
  end if;

  if new.parent_invite_id = new.invite_id then
    raise exception 'An account cannot be its own parent.';
  end if;

  if exists (
    with recursive ancestors(invite_id, parent_invite_id) as (
      select invite_id, parent_invite_id
      from public.aurum_hive_accounts
      where invite_id = new.parent_invite_id
      union all
      select parent.invite_id, parent.parent_invite_id
      from public.aurum_hive_accounts parent
      join ancestors child on child.parent_invite_id = parent.invite_id
    )
    select 1 from ancestors where invite_id = new.invite_id
  ) then
    raise exception 'This parent would create a loop in the Hive.';
  end if;

  select type into parent_type
  from public.aurum_hive_accounts
  where invite_id = new.parent_invite_id;

  if parent_type is null then
    return new;
  end if;

  if parent_type = 'main' and new.type <> 'sub' then
    raise exception 'Main accounts can only add sub accounts.';
  end if;

  if parent_type = 'sub' and new.type <> 'main' then
    raise exception 'Sub accounts can only add main accounts.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_aurum_hive_account_trigger on public.aurum_hive_accounts;
create trigger validate_aurum_hive_account_trigger
  before insert or update on public.aurum_hive_accounts
  for each row
  execute function public.validate_aurum_hive_account();

alter table public.aurum_hive_accounts enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'aurum_hive_accounts'
  ) then
    alter publication supabase_realtime add table public.aurum_hive_accounts;
  end if;
end;
$$;

drop policy if exists "Public can read hive accounts" on public.aurum_hive_accounts;
create policy "Public can read hive accounts"
  on public.aurum_hive_accounts
  for select
  using (true);

drop policy if exists "Public can insert hive accounts" on public.aurum_hive_accounts;
create policy "Public can insert hive accounts"
  on public.aurum_hive_accounts
  for insert
  with check (true);

drop policy if exists "Public can update hive accounts" on public.aurum_hive_accounts;
create policy "Public can update hive accounts"
  on public.aurum_hive_accounts
  for update
  using (true)
  with check (true);

drop policy if exists "Public can delete hive accounts" on public.aurum_hive_accounts;
create policy "Public can delete hive accounts"
  on public.aurum_hive_accounts
  for delete
  using (true);
