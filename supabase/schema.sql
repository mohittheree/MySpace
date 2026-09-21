-- MySpace database schema and RLS policies.
-- Run this entire file in the Supabase SQL Editor.
-- This script creates tables only; it does not use a service-role key.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'MySpace member',
  created_at timestamptz not null default now()
);

create table if not exists public.academics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  exam_name text not null,
  marks numeric not null check (marks >= 0),
  max_marks numeric not null check (max_marks > 0 and marks <= max_marks),
  date date not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default 'Personal',
  progress integer not null default 0 check (progress between 0 and 100),
  deadline date,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  date date not null,
  category text not null default 'Personal',
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'Exploring',
  category text not null default 'Personal',
  created_at timestamptz not null default now()
);

create table if not exists public.interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'General',
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  category text not null default 'Personal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_notes_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_updated_at on public.notes;
create trigger notes_updated_at
before update on public.notes
for each row execute function public.set_notes_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, ''), '@', 1), 'MySpace member')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Lock down every exposed table. Anonymous users receive no table privileges.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['profiles', 'academics', 'goals', 'achievements', 'projects', 'interests', 'notes'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
  end loop;
end $$;

-- Profiles are owned by the auth user through profiles.id.
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;

create policy profiles_select_own on public.profiles
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id);

create policy profiles_insert_own on public.profiles
for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = id);

create policy profiles_update_own on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy profiles_delete_own on public.profiles
for delete to authenticated
using ((select auth.uid()) = id);

-- All other tables are owned by their user_id.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['academics', 'goals', 'achievements', 'projects', 'interests', 'notes'] loop
    execute format('drop policy if exists %I_select_own on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_insert_own on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_update_own on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_delete_own on public.%I', table_name, table_name);

    execute format('create policy %I_select_own on public.%I for select to authenticated using ((select auth.uid()) is not null and (select auth.uid()) = user_id)', table_name, table_name);
    execute format('create policy %I_insert_own on public.%I for insert to authenticated with check ((select auth.uid()) is not null and (select auth.uid()) = user_id)', table_name, table_name);
    execute format('create policy %I_update_own on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name, table_name);
    execute format('create policy %I_delete_own on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name, table_name);
  end loop;
end $$;

create index if not exists academics_user_id_idx on public.academics(user_id);
create index if not exists goals_user_id_idx on public.goals(user_id);
create index if not exists achievements_user_id_idx on public.achievements(user_id);
create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists interests_user_id_idx on public.interests(user_id);
create index if not exists notes_user_id_idx on public.notes(user_id);
