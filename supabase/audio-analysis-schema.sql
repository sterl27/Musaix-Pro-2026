-- Musaix Pro audio-analysis schema extension
-- Apply after the base Musaix Canvas schema.

create table if not exists tracks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  storage_path text not null,
  mime_type text,
  duration_seconds numeric,
  created_at timestamptz not null default now()
);

create table if not exists analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references tracks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'complete', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists analysis_results (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references tracks(id) on delete cascade,
  job_id uuid references analysis_jobs(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  metrics jsonb not null,
  ai_summary text,
  created_at timestamptz not null default now()
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
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from tracks as owned_track
      where owned_track.id = analysis_jobs.track_id
        and owned_track.user_id = auth.uid()
    )
  );

create policy "Users can read own analysis results"
  on analysis_results for select
  using (auth.uid() = user_id);

create policy "Users can insert own analysis results"
  on analysis_results for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from tracks as owned_track
      where owned_track.id = analysis_results.track_id
        and owned_track.user_id = auth.uid()
    )
    and (
      job_id is null
      or exists (
        select 1 from analysis_jobs as owned_job
        where owned_job.id = analysis_results.job_id
          and owned_job.track_id = analysis_results.track_id
          and owned_job.user_id = auth.uid()
      )
    )
  );
