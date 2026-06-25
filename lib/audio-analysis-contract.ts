export type MusaixAudioMetrics = {
  rms_mean: number;
  rms_max: number;
  zero_crossing_rate_mean: number;
  spectral_centroid_mean: number;
  spectral_rolloff_mean: number;
  tempo_bpm: number;
  chroma_mean: number[];
};

export type MusaixAnalysisResponse = {
  filename: string;
  sample_rate: number;
  duration_seconds: number;
  metrics: MusaixAudioMetrics;
};

export type MusaixAnalysisJobStatus = "queued" | "processing" | "complete" | "failed";

export type MusaixAnalysisJob = {
  id: string;
  trackId: string;
  ownerId: string;
  status: MusaixAnalysisJobStatus;
  result?: MusaixAnalysisResponse;
  error?: string;
  createdAt: string;
  updatedAt?: string;
};
