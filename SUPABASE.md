# Supabase setup

Create this table for saved cookbook recipes:

```sql
create table if not exists public.recipe_cookbook (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  meal_id text not null,
  recipe jsonb not null,
  created_at timestamptz not null default now(),
  unique (profile_id, meal_id)
);

alter table public.recipe_cookbook enable row level security;

create policy "Allow anonymous cookbook reads"
on public.recipe_cookbook
for select
to anon
using (true);

create policy "Allow anonymous cookbook inserts"
on public.recipe_cookbook
for insert
to anon
with check (true);

create policy "Allow anonymous cookbook updates"
on public.recipe_cookbook
for update
to anon
using (true)
with check (true);

create policy "Allow anonymous cookbook deletes"
on public.recipe_cookbook
for delete
to anon
using (true);
```

Then copy `.env.example` to `.env` and fill in your Supabase project URL and anon key.
