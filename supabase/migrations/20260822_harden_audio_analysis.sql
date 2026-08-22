-- Harden the already-deployed audio analysis schema from PR #1.

alter table tracks
  alter column user_id set not null,
  alter column created_at set not null;

alter table analysis_jobs
  alter column track_id set not null,
  alter column user_id set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

alter table analysis_results
  alter column track_id set not null,
  alter column user_id set not null,
  alter column created_at set not null;

alter table analysis_jobs
  drop constraint if exists analysis_jobs_status_check;

alter table analysis_jobs
  add constraint analysis_jobs_status_check
  check (status in ('queued', 'processing', 'complete', 'failed'));

drop policy if exists "Users can insert own analysis jobs" on analysis_jobs;
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

drop policy if exists "Users can insert own analysis results" on analysis_results;
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
