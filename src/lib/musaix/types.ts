export type SourceType = 'song' | 'artist' | 'style' | 'lyric' | 'manual';

export type ReferenceCard = {
  id: string;
  projectId?: string | null;
  title: string;
  artist?: string | null;
  sourceType: SourceType;
  sourceText: string;
  mood?: string | null;
  constraints?: string | null;
  tags?: string[];
  createdAt?: string;
};

export type PromptSet = {
  id?: string;
  projectId?: string | null;
  referenceId?: string | null;
  style_prompt: string;
  structure_prompt: string;
  vocal_direction: string;
  production_notes: string;
  negative_prompt: string;
  createdAt?: string;
};

export type Project = {
  id: string;
  name: string;
  description?: string | null;
  genre?: string | null;
  createdAt?: string;
};

export type CanvasStatus = 'ready' | 'saving' | 'generating' | 'exporting' | 'error';
