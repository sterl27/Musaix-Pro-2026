create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.references (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  artist text,
  source_type text not null default 'manual',
  source_text text not null,
  mood text,
  constraints text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  reference_id uuid references public.references(id) on delete set null,
  style_prompt text not null default '',
  structure_prompt text not null default '',
  vocal_direction text not null default '',
  production_notes text not null default '',
  negative_prompt text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  prompt_id uuid references public.prompts(id) on delete set null,
  export_type text not null default 'markdown',
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.references enable row level security;
alter table public.prompts enable row level security;
alter table public.exports enable row level security;

create policy "allow anon read projects" on public.projects for select using (true);
create policy "allow anon write projects" on public.projects for insert with check (true);
create policy "allow anon read references" on public.references for select using (true);
create policy "allow anon write references" on public.references for insert with check (true);
create policy "allow anon read prompts" on public.prompts for select using (true);
create policy "allow anon write prompts" on public.prompts for insert with check (true);
create policy "allow anon read exports" on public.exports for select using (true);
create policy "allow anon write exports" on public.exports for insert with check (true);
