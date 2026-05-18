-- Aurum app usage monitoring.
-- Run this in the Supabase SQL editor for the same project used by the Hive.
-- This table stores lightweight, pseudonymous app usage events.

create table if not exists public.aurum_app_usage_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  session_id text not null,
  event_type text not null default 'page_view',
  path text,
  app_version text,
  device_type text,
  os text,
  browser text,
  user_agent text,
  locale text,
  timezone text,
  screen_width integer,
  screen_height integer,
  country text,
  country_code text,
  country_source text,
  referrer text,
  hive_action text,
  hive_referral_id text,
  hive_search_term text,
  hive_result_count integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.aurum_app_usage_events
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.aurum_app_usage_events
  add column if not exists hive_action text,
  add column if not exists hive_referral_id text,
  add column if not exists hive_search_term text,
  add column if not exists hive_result_count integer;

create index if not exists aurum_app_usage_events_created_at_idx
  on public.aurum_app_usage_events (created_at desc);

create index if not exists aurum_app_usage_events_visitor_idx
  on public.aurum_app_usage_events (visitor_id, created_at desc);

create index if not exists aurum_app_usage_events_session_idx
  on public.aurum_app_usage_events (session_id, created_at desc);

create index if not exists aurum_app_usage_events_hive_referral_idx
  on public.aurum_app_usage_events (hive_referral_id, created_at desc)
  where hive_referral_id is not null;

create index if not exists aurum_app_usage_events_hive_search_idx
  on public.aurum_app_usage_events (hive_search_term, created_at desc)
  where hive_search_term is not null;

alter table public.aurum_app_usage_events enable row level security;

drop policy if exists "Allow app usage event inserts" on public.aurum_app_usage_events;
create policy "Allow app usage event inserts"
  on public.aurum_app_usage_events
  for insert
  to anon
  with check (
    visitor_id <> ''
    and session_id <> ''
    and event_type in (
      'page_view',
      'heartbeat',
      'app_open',
      'hive_open',
      'hive_load',
      'hive_search',
      'hive_account_add',
      'hive_account_delete'
    )
  );

-- The static control panel uses the publishable Supabase key, so this SELECT
-- policy makes dashboard data readable to anyone who can open the panel file.
-- Host aurum-monitor.html somewhere private if the data should be restricted.
drop policy if exists "Allow monitor panel reads" on public.aurum_app_usage_events;
create policy "Allow monitor panel reads"
  on public.aurum_app_usage_events
  for select
  to anon
  using (true);
