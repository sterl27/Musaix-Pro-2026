-- Musaix Pro v2 Audio Intelligence Foundation
-- Applied to Supabase project xexzplnyzblflucfvbwt on 2026-06-26.
-- Non-destructive: creates v2 tables, indexes, RLS policies, and private storage buckets.

create extension if not exists pgcrypto;

create table if not exists public.musaix_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  artist text,
  source_type text not null default 'upload' check (source_type in ('upload','generated','reference','external')),
  audio_path text,
  waveform_path text,
  cover_path text,
  duration_sec numeric,
  tempo_bpm numeric,
  estimated_key text,
  status text not null default 'draft' check (status in ('draft','uploaded','analyzing','analyzed','failed','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.musaix_audio_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.musaix_tracks(id) on delete cascade,
  report_version text not null default '1.0.0',
  skill text not null default 'musaix-librosa-audio-intelligence',
  hook_score numeric,
  replay_score numeric,
  energy_score numeric,
  dynamics_score numeric,
  structure_score numeric,
  mix_balance_score numeric,
  commercial_signal numeric,
  summary jsonb not null default '{}'::jsonb,
  mix_critique jsonb not null default '{}'::jsonb,
  alic3x_observations jsonb not null default '[]'::jsonb,
  raw_report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.musaix_report_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid not null references public.musaix_audio_reports(id) on delete cascade,
  track_id uuid not null references public.musaix_tracks(id) on delete cascade,
  label text not null,
  start_sec numeric not null,
  end_sec numeric not null,
  confidence numeric not null default 0.5,
  created_at timestamptz not null default now()
);

create table if not exists public.musaix_hook_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid not null references public.musaix_audio_reports(id) on delete cascade,
  track_id uuid not null references public.musaix_tracks(id) on delete cascade,
  start_sec numeric not null,
  end_sec numeric not null,
  hook_score numeric not null,
  replay_score numeric not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.musaix_memory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_track_id uuid references public.musaix_tracks(id) on delete set null,
  source_report_id uuid references public.musaix_audio_reports(id) on delete set null,
  item_type text not null check (item_type in ('artist_profile','track_report','lyric_note','prompt','reference','mix_note','persona','workflow','other')),
  title text not null,
  content text,
  data jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}'::text[],
  embedding_status text not null default 'pending' check (embedding_status in ('pending','indexed','failed','skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.musaix_report_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid references public.musaix_tracks(id) on delete set null,
  report_id uuid references public.musaix_audio_reports(id) on delete set null,
  export_type text not null default 'pdf' check (export_type in ('pdf','json','markdown','csv','wav','zip')),
  storage_path text,
  filename text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_musaix_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_musaix_tracks_updated_at on public.musaix_tracks;
create trigger set_musaix_tracks_updated_at before update on public.musaix_tracks
for each row execute function public.set_musaix_updated_at();

drop trigger if exists set_musaix_memory_items_updated_at on public.musaix_memory_items;
create trigger set_musaix_memory_items_updated_at before update on public.musaix_memory_items
for each row execute function public.set_musaix_updated_at();

alter table public.musaix_tracks enable row level security;
alter table public.musaix_audio_reports enable row level security;
alter table public.musaix_report_sections enable row level security;
alter table public.musaix_hook_candidates enable row level security;
alter table public.musaix_memory_items enable row level security;
alter table public.musaix_report_exports enable row level security;

-- Owner policies. Service role bypasses RLS for backend analysis workers.
do $$
declare
  t text;
begin
  foreach t in array array[
    'musaix_tracks',
    'musaix_audio_reports',
    'musaix_report_sections',
    'musaix_hook_candidates',
    'musaix_memory_items',
    'musaix_report_exports'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format('create policy %I on public.%I for select using (auth.uid() = user_id)', t || '_select_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id)', t || '_insert_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format('create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_update_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);
    execute format('create policy %I on public.%I for delete using (auth.uid() = user_id)', t || '_delete_own', t);
  end loop;
end $$;

create index if not exists idx_musaix_tracks_user_id on public.musaix_tracks(user_id);
create index if not exists idx_musaix_tracks_project_id on public.musaix_tracks(project_id);
create index if not exists idx_musaix_tracks_status on public.musaix_tracks(status);
create index if not exists idx_musaix_audio_reports_track_id on public.musaix_audio_reports(track_id);
create index if not exists idx_musaix_report_sections_track_id on public.musaix_report_sections(track_id);
create index if not exists idx_musaix_hook_candidates_track_id on public.musaix_hook_candidates(track_id);
create index if not exists idx_musaix_memory_items_user_id on public.musaix_memory_items(user_id);
create index if not exists idx_musaix_memory_items_tags on public.musaix_memory_items using gin(tags);
create index if not exists idx_musaix_memory_items_data on public.musaix_memory_items using gin(data);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('musaix-audio', 'musaix-audio', false, 104857600, array['audio/mpeg','audio/wav','audio/x-wav','audio/flac','audio/mp4','audio/aac','audio/ogg']),
  ('musaix-waveforms', 'musaix-waveforms', false, 10485760, array['application/json','image/png','image/svg+xml']),
  ('musaix-reports', 'musaix-reports', false, 52428800, array['application/pdf','application/json','text/markdown','text/csv','application/zip']),
  ('musaix-covers', 'musaix-covers', false, 10485760, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
