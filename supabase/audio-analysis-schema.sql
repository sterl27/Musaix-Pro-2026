-- Musaix Pro audio-analysis schema extension
-- Apply after the base Musaix Canvas schema.

create table if not exists tracks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  storage_path text not null,
  mime_type text,
  duration_seconds numeric,
  created_at timestamptz default now()
);

create table if not exists analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references tracks(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'queued',
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists analysis_results (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references tracks(id) on delete cascade,
  job_id uuid references analysis_jobs(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  metrics jsonb not null,
  ai_summary text,
  created_at timestamptz default now()
);

alter table tracks enable row level security;
alter table analysis_jobs enable row level security;
alter table analysis_results enable row level security;

create policy "Users can read own tracks"
  on tracks for select
  using (auth.uid() = user_id);

create policy "Users can insert own tracks"
  on tracks for insert
  with check (auth.uid() = user_id);

create policy "Users can read own analysis jobs"
  on analysis_jobs for select
  using (auth.uid() = user_id);

create policy "Users can insert own analysis jobs"
  on analysis_jobs for insert
  with check (auth.uid() = user_id);

create policy "Users can read own analysis results"
  on analysis_results for select
  using (auth.uid() = user_id);

create policy "Users can insert own analysis results"
  on analysis_results for insert
  with check (auth.uid() = user_id);
