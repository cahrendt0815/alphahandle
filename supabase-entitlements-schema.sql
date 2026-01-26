-- Fintwit Performance: Subscriptions & Entitlements Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table: stores user metadata including last searched handle
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  last_handle text,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Drop existing policies if they exist
drop policy if exists "profiles read own" on public.profiles;
drop policy if exists "profiles write own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;

-- Create RLS policies for profiles
create policy "profiles read own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles write own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Subscriptions table: stores Stripe subscription data
create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  plan text check (plan in ('ape','degen','gigachad')),
  cycle text check (cycle in ('monthly','yearly')),
  status text,
  current_period_end timestamptz,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.subscriptions enable row level security;

-- Drop existing policy if exists
drop policy if exists "subs read own" on public.subscriptions;

-- Create RLS policy for subscriptions
create policy "subs read own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Entitlements table: stores user access levels and quotas
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text,
  searches_quota int,
  timeline_months int,
  refresh_at timestamptz,
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.entitlements enable row level security;

-- Drop existing policy if exists
drop policy if exists "ents read own" on public.entitlements;

-- Create RLS policy for entitlements
create policy "ents read own" on public.entitlements
  for select using (auth.uid() = user_id);

-- Usage logs table: tracks search usage for quota enforcement
create table if not exists public.usage_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  handle text,
  used_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.usage_logs enable row level security;

-- Drop existing policies if they exist
drop policy if exists "usage read own" on public.usage_logs;
drop policy if exists "usage write own" on public.usage_logs;

-- Create RLS policies for usage logs
create policy "usage read own" on public.usage_logs
  for select using (auth.uid() = user_id);

create policy "usage write own" on public.usage_logs
  for insert with check (auth.uid() = user_id);

-- Create indexes for better query performance
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_sub_id on public.subscriptions(stripe_subscription_id);
create index if not exists idx_entitlements_user_id on public.entitlements(user_id);
create index if not exists idx_usage_logs_user_id on public.usage_logs(user_id);
create index if not exists idx_usage_logs_used_at on public.usage_logs(used_at);

-- Success message
do $$
begin
  raise notice 'Schema created successfully! Tables: profiles, subscriptions, entitlements, usage_logs';
end $$;
