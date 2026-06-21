-- Musaix Canvas v0.1
-- Scope lock: Reference -> Prompt -> Project -> Export

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  tempo integer default 120,
  key text default 'C',
  genre text,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  user_id uuid references auth.users(id) on delete set null
);

alter table public.projects add column if not exists description text;
alter table public.projects add column if not exists tempo integer default 120;
alter table public.projects add column if not exists key text default 'C';
alter table public.projects add column if not exists genre text;
alter table public.projects add column if not exists updated_at timestamp with time zone not null default timezone('utc'::text, now());
alter table public.projects add column if not exists user_id uuid references auth.users(id) on delete set null;

create or replace trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create table if not exists public."references" (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  artist text,
  source_type text not null default 'manual',
  source_text text not null,
  mood text,
  constraints text,
  tags text[] not null default '{}',
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create or replace trigger set_references_updated_at
before update on public."references"
for each row execute function public.set_updated_at();

create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  reference_id uuid references public."references"(id) on delete set null,
  style_prompt text not null default '',
  structure_prompt text not null default '',
  vocal_direction text not null default '',
  production_notes text not null default '',
  negative_prompt text not null default '',
  status text not null default 'draft',
  model text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create or replace trigger set_prompts_updated_at
before update on public.prompts
for each row execute function public.set_updated_at();

create table if not exists public.exports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  prompt_id uuid references public.prompts(id) on delete set null,
  format text not null default 'markdown',
  filename text,
  content text not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.projects enable row level security;
alter table public."references" enable row level security;
alter table public.prompts enable row level security;
alter table public.exports enable row level security;

grant select, insert, update, delete on public.projects to anon, authenticated;
grant select, insert, update, delete on public."references" to anon, authenticated;
grant select, insert, update, delete on public.prompts to anon, authenticated;
grant select, insert, update, delete on public.exports to anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and policyname = 'canvas_dev_select_projects') then
    create policy "canvas_dev_select_projects" on public.projects for select using (auth.uid() = user_id or user_id is null);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and policyname = 'canvas_dev_insert_projects') then
    create policy "canvas_dev_insert_projects" on public.projects for insert with check (auth.uid() = user_id or user_id is null);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and policyname = 'canvas_dev_update_projects') then
    create policy "canvas_dev_update_projects" on public.projects for update using (auth.uid() = user_id or user_id is null) with check (auth.uid() = user_id or user_id is null);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'references' and policyname = 'canvas_dev_select_references') then
    create policy "canvas_dev_select_references" on public."references" for select using (auth.uid() = user_id or user_id is null);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'references' and policyname = 'canvas_dev_insert_references') then
    create policy "canvas_dev_insert_references" on public."references" for insert with check (auth.uid() = user_id or user_id is null);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'references' and policyname = 'canvas_dev_update_references') then
    create policy "canvas_dev_update_references" on public."references" for update using (auth.uid() = user_id or user_id is null) with check (auth.uid() = user_id or user_id is null);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'prompts' and policyname = 'canvas_dev_select_prompts') then
    create policy "canvas_dev_select_prompts" on public.prompts for select using (auth.uid() = user_id or user_id is null);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'prompts' and policyname = 'canvas_dev_insert_prompts') then
    create policy "canvas_dev_insert_prompts" on public.prompts for insert with check (auth.uid() = user_id or user_id is null);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'prompts' and policyname = 'canvas_dev_update_prompts') then
    create policy "canvas_dev_update_prompts" on public.prompts for update using (auth.uid() = user_id or user_id is null) with check (auth.uid() = user_id or user_id is null);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'exports' and policyname = 'canvas_dev_select_exports') then
    create policy "canvas_dev_select_exports" on public.exports for select using (auth.uid() = user_id or user_id is null);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'exports' and policyname = 'canvas_dev_insert_exports') then
    create policy "canvas_dev_insert_exports" on public.exports for insert with check (auth.uid() = user_id or user_id is null);
  end if;
end $$;

create index if not exists references_project_id_created_at_idx on public."references"(project_id, created_at desc);
create index if not exists prompts_reference_id_created_at_idx on public.prompts(reference_id, created_at desc);
create index if not exists exports_prompt_id_created_at_idx on public.exports(prompt_id, created_at desc);
