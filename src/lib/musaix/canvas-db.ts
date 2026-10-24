import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { Project, PromptSet, ReferenceCard, SourceType } from './types';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value?: string | null) {
  return Boolean(value && uuidPattern.test(value));
}

// projects, references, prompts and exports are owner-only (auth.uid() = user_id) and user_id
// defaults to auth.uid(). Inserts must omit user_id: an explicit null overrides the default and
// fails the owner check for every caller.
export type CanvasErrorKind = 'config' | 'signed-out' | 'denied' | 'failed';

export class CanvasError extends Error {
  constructor(public readonly kind: CanvasErrorKind, message: string) {
    super(message);
    this.name = 'CanvasError';
  }
}

export type CanvasSession = { status: 'signed-in' | 'signed-out' | 'unconfigured'; userId: string | null };

const RLS_VIOLATION = '42501';

export function describeCanvasError(error: unknown) {
  const kind = error instanceof CanvasError ? error.kind : 'failed';
  if (kind === 'config') return 'Supabase is not configured for this deployment, so nothing can be saved. Your work stays in this tab only.';
  if (kind === 'signed-out') return 'Sign in to save canvas work. Nothing was saved; your work stays in this tab only.';
  if (kind === 'denied') return 'Supabase refused the save for this account. Nothing was saved.';
  const message = error instanceof Error && error.message ? error.message : 'Unknown error';
  return `Supabase returned an error: ${message}. Nothing was saved.`;
}

function canvasClient() {
  try {
    return createClient();
  } catch (error) {
    throw new CanvasError('config', error instanceof Error ? error.message : 'Supabase is not configured.');
  }
}

async function currentUserId(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser();
  return error || !data.user ? null : data.user.id;
}

async function ownerClient() {
  const client = canvasClient();
  if (!(await currentUserId(client))) throw new CanvasError('signed-out', 'Sign in to save canvas work.');
  return client;
}

function dbError(error: { code?: string; message?: string }) {
  return new CanvasError(error.code === RLS_VIOLATION ? 'denied' : 'failed', error.message || 'Supabase request failed.');
}

export function watchCanvasSession(onChange: (session: CanvasSession) => void) {
  let client: SupabaseClient;
  try {
    client = canvasClient();
  } catch {
    onChange({ status: 'unconfigured', userId: null });
    return () => {};
  }
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    onChange(session?.user ? { status: 'signed-in', userId: session.user.id } : { status: 'signed-out', userId: null });
  });
  return () => data.subscription.unsubscribe();
}

type ReferenceRow = {
  id: string;
  project_id: string | null;
  title: string;
  artist: string | null;
  source_type: SourceType;
  source_text: string;
  mood: string | null;
  constraints: string | null;
  tags: string[] | null;
  created_at: string;
};

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  genre: string | null;
  created_at: string;
};

type PromptRow = {
  id: string;
  project_id: string | null;
  reference_id: string | null;
  style_prompt: string;
  structure_prompt: string;
  vocal_direction: string;
  production_notes: string;
  negative_prompt: string;
  created_at: string;
};

export function mapReference(row: ReferenceRow): ReferenceCard {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    artist: row.artist,
    sourceType: row.source_type,
    sourceText: row.source_text,
    mood: row.mood,
    constraints: row.constraints,
    tags: row.tags ?? [],
    createdAt: row.created_at
  };
}

export function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    genre: row.genre,
    createdAt: row.created_at
  };
}

export function mapPrompt(row: PromptRow): PromptSet {
  return {
    id: row.id,
    projectId: row.project_id,
    referenceId: row.reference_id,
    style_prompt: row.style_prompt,
    structure_prompt: row.structure_prompt,
    vocal_direction: row.vocal_direction,
    production_notes: row.production_notes,
    negative_prompt: row.negative_prompt,
    createdAt: row.created_at
  };
}

export async function listReferences() {
  const supabase = canvasClient();
  if (!(await currentUserId(supabase))) return [];
  const { data, error } = await supabase
    .from('references')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(24);

  if (error) throw dbError(error);
  return (data ?? []).map((row) => mapReference(row as ReferenceRow));
}

export async function loadLatestProject() {
  const supabase = canvasClient();
  if (!(await currentUserId(supabase))) return null;
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw dbError(error);
  return data ? mapProject(data as ProjectRow) : null;
}

export async function createProject(input: { name: string; description?: string; genre?: string }) {
  const supabase = await ownerClient();
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: input.name || 'Untitled Musaix Project',
      description: input.description || null,
      genre: input.genre || null
    })
    .select('*')
    .single();

  if (error) throw dbError(error);
  return mapProject(data as ProjectRow);
}

export async function saveReferenceCard(input: Omit<ReferenceCard, 'id' | 'createdAt'>) {
  const supabase = await ownerClient();
  const { data, error } = await supabase
    .from('references')
    .insert({
      project_id: input.projectId ?? null,
      title: input.title || 'Untitled Reference',
      artist: input.artist || null,
      source_type: input.sourceType,
      source_text: input.sourceText,
      mood: input.mood || null,
      constraints: input.constraints || null,
      tags: input.tags ?? []
    })
    .select('*')
    .single();

  if (error) throw dbError(error);
  return mapReference(data as ReferenceRow);
}

export async function savePromptSet(input: PromptSet) {
  const supabase = await ownerClient();
  const { data, error } = await supabase
    .from('prompts')
    .insert({
      project_id: input.projectId ?? null,
      reference_id: isUuid(input.referenceId) ? input.referenceId : null,
      style_prompt: input.style_prompt,
      structure_prompt: input.structure_prompt,
      vocal_direction: input.vocal_direction,
      production_notes: input.production_notes,
      negative_prompt: input.negative_prompt,
      status: 'draft',
      model: process.env.NEXT_PUBLIC_MUSAIX_MODEL ?? null
    })
    .select('*')
    .single();

  if (error) throw dbError(error);
  return mapPrompt(data as PromptRow);
}

export async function saveMarkdownExport(input: { projectId?: string | null; promptId?: string | null; filename: string; content: string }) {
  const supabase = await ownerClient();
  const { data, error } = await supabase
    .from('exports')
    .insert({
      project_id: input.projectId ?? null,
      prompt_id: isUuid(input.promptId) ? input.promptId : null,
      filename: input.filename,
      format: 'markdown',
      content: input.content
    })
    .select('*')
    .single();

  if (error) throw dbError(error);
  return data;
}
