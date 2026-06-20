export type ReferenceCard = {
  id: string;
  projectId?: string | null;
  title: string;
  artist?: string | null;
  sourceType: 'song' | 'artist' | 'style' | 'lyric' | 'manual';
  sourceText: string;
  mood?: string | null;
  constraints?: string | null;
  createdAt?: string;
};

export type PromptSet = {
  id?: string;
  referenceId?: string | null;
  style_prompt: string;
  structure_prompt: string;
  vocal_direction: string;
  production_notes: string;
  negative_prompt: string;
};

export type Project = {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
};
