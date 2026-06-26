import type { SupabaseClient } from "@supabase/supabase-js";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MusaixTrackStatus =
  | "draft"
  | "uploaded"
  | "analyzing"
  | "analyzed"
  | "failed"
  | "archived";

export type MusaixSourceType = "upload" | "generated" | "reference" | "external";

export type MusaixTrack = {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  artist: string | null;
  source_type: MusaixSourceType;
  audio_path: string | null;
  waveform_path: string | null;
  cover_path: string | null;
  duration_sec: number | null;
  tempo_bpm: number | null;
  estimated_key: string | null;
  status: MusaixTrackStatus;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type MusaixAudioReport = {
  id: string;
  user_id: string;
  track_id: string;
  report_version: string;
  skill: string;
  hook_score: number | null;
  replay_score: number | null;
  energy_score: number | null;
  dynamics_score: number | null;
  structure_score: number | null;
  mix_balance_score: number | null;
  commercial_signal: number | null;
  summary: Json;
  mix_critique: Json;
  alic3x_observations: Json;
  raw_report: Json;
  created_at: string;
};

export type MusaixReportSection = {
  id: string;
  user_id: string;
  report_id: string;
  track_id: string;
  label: string;
  start_sec: number;
  end_sec: number;
  confidence: number;
  created_at: string;
};

export type MusaixHookCandidate = {
  id: string;
  user_id: string;
  report_id: string;
  track_id: string;
  start_sec: number;
  end_sec: number;
  hook_score: number;
  replay_score: number;
  reason: string | null;
  created_at: string;
};

export type MusaixMemoryItem = {
  id: string;
  user_id: string;
  source_track_id: string | null;
  source_report_id: string | null;
  item_type:
    | "artist_profile"
    | "track_report"
    | "lyric_note"
    | "prompt"
    | "reference"
    | "mix_note"
    | "persona"
    | "workflow"
    | "other";
  title: string;
  content: string | null;
  data: Json;
  tags: string[];
  embedding_status: "pending" | "indexed" | "failed" | "skipped";
  created_at: string;
  updated_at: string;
};

export type MusaixReportExport = {
  id: string;
  user_id: string;
  track_id: string | null;
  report_id: string | null;
  export_type: "pdf" | "json" | "markdown" | "csv" | "wav" | "zip";
  storage_path: string | null;
  filename: string | null;
  metadata: Json;
  created_at: string;
};

export type MusaixSupabase = SupabaseClient<any>;

export const MUSAIX_BUCKETS = {
  audio: "musaix-audio",
  waveforms: "musaix-waveforms",
  reports: "musaix-reports",
  covers: "musaix-covers",
} as const;
