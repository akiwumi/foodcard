# Supabase setup

Run this SQL in the Supabase SQL editor to create cookbook storage for the app.

```sql
create extension if not exists pgcrypto;

create table if not exists public.recipe_cookbook (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  meal_id text not null,
  recipe jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_cookbook_profile_meal_unique unique (profile_id, meal_id)
);

create index if not exists recipe_cookbook_profile_created_idx
on public.recipe_cookbook (profile_id, created_at desc);

create or replace function public.set_recipe_cookbook_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recipe_cookbook_set_updated_at on public.recipe_cookbook;

create trigger recipe_cookbook_set_updated_at
before update on public.recipe_cookbook
for each row
execute function public.set_recipe_cookbook_updated_at();

alter table public.recipe_cookbook enable row level security;

drop policy if exists "recipe_cookbook_anon_select" on public.recipe_cookbook;
drop policy if exists "recipe_cookbook_anon_insert" on public.recipe_cookbook;
drop policy if exists "recipe_cookbook_anon_update" on public.recipe_cookbook;
drop policy if exists "recipe_cookbook_anon_delete" on public.recipe_cookbook;

create policy "recipe_cookbook_anon_select"
on public.recipe_cookbook
for select
to anon
using (true);

create policy "recipe_cookbook_anon_insert"
on public.recipe_cookbook
for insert
to anon
with check (true);

create policy "recipe_cookbook_anon_update"
on public.recipe_cookbook
for update
to anon
using (true)
with check (true);

create policy "recipe_cookbook_anon_delete"
on public.recipe_cookbook
for delete
to anon
using (true);
```

Copy `.env.example` to `.env` and fill in your Supabase project URL and anon key.
