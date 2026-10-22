import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const db = vi.hoisted(() => ({
  session: { status: 'signed-out', userId: null } as { status: string; userId: string | null },
  saveReferenceCard: vi.fn(),
  createProject: vi.fn()
}));

vi.mock('@/lib/musaix/canvas-db', async () => {
  const actual = await vi.importActual<typeof import('@/lib/musaix/canvas-db')>('@/lib/musaix/canvas-db');
  return {
    CanvasError: actual.CanvasError,
    describeCanvasError: actual.describeCanvasError,
    watchCanvasSession: (callback: (session: typeof db.session) => void) => {
      callback(db.session);
      return () => {};
    },
    listReferences: async () => [],
    loadLatestProject: async () => null,
    createProject: db.createProject,
    saveReferenceCard: db.saveReferenceCard,
    savePromptSet: vi.fn(),
    saveMarkdownExport: vi.fn()
  };
});

import { MusaixCanvas } from '@/components/musaix/musaix-canvas';
import { CanvasError } from '@/lib/musaix/canvas-db';

beforeEach(() => {
  db.saveReferenceCard.mockReset();
  db.createProject.mockReset().mockResolvedValue({ id: 'project', name: 'Sterl Studio 06', createdAt: 'now' });
});

describe('Canvas save gating', () => {
  it('disables saving and asks for sign-in when signed out', async () => {
    db.session = { status: 'signed-out', userId: null };
    render(<MusaixCanvas />);
    expect(await screen.findByText(/sign in/i, { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Reference' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save Prompt' })).toBeDisabled();
    expect(screen.getByRole('link', { name: /sign in to save/i })).toHaveAttribute('href', '/audio');
  });

  it('saves when signed in and says so', async () => {
    db.session = { status: 'signed-in', userId: 'owner' };
    db.saveReferenceCard.mockResolvedValue({ id: 'ref', title: 'Rabbit-Skin Bridge 11', sourceType: 'song', sourceText: 'x' });
    render(<MusaixCanvas />);
    await userEvent.click(screen.getByRole('button', { name: 'Save Reference' }));
    expect(await screen.findByText('Reference saved to Supabase.')).toBeInTheDocument();
  });

  it('reports a rejected save as not saved, never as saved locally', async () => {
    db.session = { status: 'signed-in', userId: 'owner' };
    db.saveReferenceCard.mockRejectedValue(new CanvasError('denied', 'new row violates row-level security policy'));
    render(<MusaixCanvas />);
    await userEvent.click(screen.getByRole('button', { name: 'Save Reference' }));
    await waitFor(() => expect(screen.getByText(/Reference not saved/)).toBeInTheDocument());
    expect(screen.queryByText(/saved locally/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/env vars/i)).not.toBeInTheDocument();
  });
});
