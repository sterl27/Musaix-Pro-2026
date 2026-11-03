import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  configured: true,
  userId: 'owner' as string | null,
  insertError: null as { code?: string; message: string } | null,
  inserts: [] as { table: string; row: Record<string, unknown> }[],
  queries: [] as string[]
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => {
    if (!state.configured) throw new Error('Missing Supabase public environment variables.');
    return {
      auth: {
        getUser: async () => ({ data: { user: state.userId ? { id: state.userId } : null }, error: null }),
        onAuthStateChange: (callback: (event: string, session: { user: { id: string } } | null) => void) => {
          callback('INITIAL_SESSION', state.userId ? { user: { id: state.userId } } : null);
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }
      },
      from: (table: string) => {
        state.queries.push(table);
        const row = { id: '00000000-0000-4000-8000-000000000001', name: 'P', title: 'T', source_type: 'song', source_text: 's', created_at: 'now' };
        const builder = {
          select: () => builder,
          order: () => builder,
          limit: () => Object.assign(Promise.resolve({ data: [row], error: null }), { maybeSingle: async () => ({ data: row, error: null }) }),
          single: async () => (state.insertError ? { data: null, error: state.insertError } : { data: row, error: null }),
          insert: (value: Record<string, unknown>) => {
            state.inserts.push({ table, row: value });
            return builder;
          }
        };
        return builder;
      }
    };
  }
}));

import {
  CanvasError,
  createProject,
  describeCanvasError,
  listReferences,
  loadLatestProject,
  saveMarkdownExport,
  savePromptSet,
  saveReferenceCard,
  watchCanvasSession
} from '@/lib/musaix/canvas-db';

const prompt = { style_prompt: 's', structure_prompt: 'st', vocal_direction: 'v', production_notes: 'p', negative_prompt: 'n' };
const reference = { title: 'T', sourceType: 'song' as const, sourceText: 'text' };
const writes = [
  () => createProject({ name: 'P' }),
  () => saveReferenceCard(reference),
  () => savePromptSet(prompt),
  () => saveMarkdownExport({ filename: 'x.md', content: '# x' })
];

beforeEach(() => {
  state.configured = true;
  state.userId = 'owner';
  state.insertError = null;
  state.inserts = [];
  state.queries = [];
});

describe('canvas persistence under owner-only RLS', () => {
  it('never sends user_id, so the auth.uid() column default sets the owner', async () => {
    for (const write of writes) await write();
    expect(state.inserts.map((insert) => insert.table)).toEqual(['projects', 'references', 'prompts', 'exports']);
    for (const insert of state.inserts) expect(insert.row).not.toHaveProperty('user_id');
  });

  it('refuses every write before touching the database when signed out', async () => {
    state.userId = null;
    for (const write of writes) {
      await expect(write()).rejects.toMatchObject({ kind: 'signed-out' });
    }
    expect(state.inserts).toHaveLength(0);
  });

  it('reports missing configuration as a config error, not a save', async () => {
    state.configured = false;
    await expect(saveReferenceCard(reference)).rejects.toMatchObject({ kind: 'config' });
  });

  it('classifies an RLS rejection as denied', async () => {
    state.insertError = { code: '42501', message: 'new row violates row-level security policy for table "projects"' };
    await expect(createProject({ name: 'P' })).rejects.toMatchObject({ kind: 'denied' });
  });

  it('keeps other database errors with their message', async () => {
    state.insertError = { code: '23503', message: 'insert violates foreign key constraint' };
    const error = await createProject({ name: 'P' }).catch((caught) => caught);
    expect(error).toBeInstanceOf(CanvasError);
    expect(error).toMatchObject({ kind: 'failed' });
    expect(describeCanvasError(error)).toMatch(/foreign key/);
  });

  it('skips owner-only reads when signed out instead of failing', async () => {
    state.userId = null;
    await expect(listReferences()).resolves.toEqual([]);
    await expect(loadLatestProject()).resolves.toBeNull();
    expect(state.queries).toHaveLength(0);
  });

  it('reads rows for a signed-in owner', async () => {
    await expect(listReferences()).resolves.toHaveLength(1);
    await expect(loadLatestProject()).resolves.toMatchObject({ name: 'P' });
  });

  it('describes failures honestly', () => {
    expect(describeCanvasError(new CanvasError('signed-out', 'x'))).toMatch(/sign in/i);
    expect(describeCanvasError(new CanvasError('config', 'x'))).toMatch(/not configured/i);
    expect(describeCanvasError(new CanvasError('denied', 'x'))).toMatch(/refused/i);
    for (const kind of ['signed-out', 'denied', 'failed'] as const) {
      expect(describeCanvasError(new CanvasError(kind, 'x'))).not.toMatch(/env/i);
    }
  });

  it('reports session state, and unconfigured when the client cannot be created', () => {
    const seen: unknown[] = [];
    watchCanvasSession((session) => seen.push(session))();
    state.configured = false;
    watchCanvasSession((session) => seen.push(session))();
    expect(seen).toEqual([
      { status: 'signed-in', userId: 'owner' },
      { status: 'unconfigured', userId: null }
    ]);
  });
});
