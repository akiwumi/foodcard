# Supabase setup

Run the SQL below in the Supabase SQL editor. It creates:

- Auth-backed user profiles
- Per-user cookbook storage
- Profile settings storage
- Avatar storage bucket and policies
- Automatic profile creation for newly registered users

```sql
create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  display_name text,
  diet_preference text not null default 'everything' check (
    diet_preference in ('everything', 'vegetarian', 'vegan', 'pescatarian')
  ),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_cookbook (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meal_id text not null,
  recipe jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_cookbook_user_meal_unique unique (user_id, meal_id)
);

create index if not exists recipe_cookbook_user_created_idx
on public.recipe_cookbook (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists recipe_cookbook_set_updated_at on public.recipe_cookbook;
create trigger recipe_cookbook_set_updated_at
before update on public.recipe_cookbook
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, display_name, diet_preference)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    'everything'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

alter table public.user_profiles enable row level security;
alter table public.recipe_cookbook enable row level security;

drop policy if exists "users_can_read_own_profile" on public.user_profiles;
create policy "users_can_read_own_profile"
on public.user_profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "users_can_insert_own_profile" on public.user_profiles;
create policy "users_can_insert_own_profile"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "users_can_update_own_profile" on public.user_profiles;
create policy "users_can_update_own_profile"
on public.user_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "users_can_read_own_cookbook" on public.recipe_cookbook;
create policy "users_can_read_own_cookbook"
on public.recipe_cookbook
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users_can_insert_own_cookbook" on public.recipe_cookbook;
create policy "users_can_insert_own_cookbook"
on public.recipe_cookbook
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users_can_update_own_cookbook" on public.recipe_cookbook;
create policy "users_can_update_own_cookbook"
on public.recipe_cookbook
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users_can_delete_own_cookbook" on public.recipe_cookbook;
create policy "users_can_delete_own_cookbook"
on public.recipe_cookbook
for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar_images_are_public" on storage.objects;
create policy "avatar_images_are_public"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

drop policy if exists "users_can_upload_own_avatar" on storage.objects;
create policy "users_can_upload_own_avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "users_can_update_own_avatar" on storage.objects;
create policy "users_can_update_own_avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = split_part(name, '/', 1)
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "users_can_delete_own_avatar" on storage.objects;
create policy "users_can_delete_own_avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = split_part(name, '/', 1)
);
```

## Auth settings

In Supabase Authentication:

- Add your site URL for local dev, for example `http://localhost:5173`
- Add your production Vercel URL
- Add the same URLs to Redirect URLs for password recovery

## Environment variables

Use the same variables locally and in Vercel:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_SUPABASE_REDIRECT_URL=https://your-site-url.com
```

For local development, `VITE_SUPABASE_REDIRECT_URL=http://localhost:5173` is a good default.
