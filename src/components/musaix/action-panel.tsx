import type { CanvasStatus, Project, ReferenceCard } from '@/lib/musaix/types';

type ActionPanelProps = {
  status: string;
  mode: CanvasStatus;
  canSavePrompt: boolean;
  project: Project | null;
  selectedReference: ReferenceCard | null;
  referenceCount: number;
  promptSaved: boolean;
  onSaveReference: () => void;
  onGeneratePrompt: () => void;
  onSavePrompt: () => void;
  onExportMarkdown: () => void;
};

export function ActionPanel({
  status,
  mode,
  canSavePrompt,
  project,
  selectedReference,
  referenceCount,
  promptSaved,
  onSaveReference,
  onGeneratePrompt,
  onSavePrompt,
  onExportMarkdown
}: ActionPanelProps) {
  const busy = mode === 'saving' || mode === 'generating' || mode === 'exporting';

  return (
    <aside className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-2xl">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Metadata</p>
        <h2 className="mt-2 text-xl font-semibold">Ship panel</h2>
      </div>

      <div className="mb-5 grid gap-3 text-sm">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Project</p>
          <p className="mt-2 font-medium text-zinc-100">{project?.name ?? 'No project yet'}</p>
          <p className="mt-1 text-xs text-zinc-500">{project?.id ?? 'Created on first save'}</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Reference</p>
          <p className="mt-2 line-clamp-1 font-medium text-zinc-100">{selectedReference?.title ?? 'None selected'}</p>
          <p className="mt-1 text-xs text-zinc-500">{referenceCount} captured • {promptSaved ? 'prompt saved' : 'prompt draft'}</p>
        </div>
      </div>

      <div className="grid gap-3">
        <button type="button" onClick={onSaveReference} disabled={busy} className="rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">
          Save Reference
        </button>
        <button type="button" onClick={onGeneratePrompt} disabled={busy} className="rounded-xl bg-pink-600 px-4 py-3 text-sm font-semibold text-white hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-40">
          Generate Prompt
        </button>
        <button
          type="button"
          onClick={onSavePrompt}
          disabled={!canSavePrompt || busy}
          className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save Prompt
        </button>
        <button type="button" onClick={onExportMarkdown} disabled={!canSavePrompt || busy} className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40">
          Export Markdown
        </button>
      </div>

      <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">
        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Status</p>
        <p className="mt-2">{status}</p>
      </div>

      <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-400">
        <p className="font-semibold text-zinc-300">v0.1 scope lock</p>
        <p className="mt-2">Reference → Prompt → Project → Export only. No agent swarm, Pinecone, Chroma, Spotify, Ableton, or Drive sync.</p>
      </div>
    </aside>
  );
}
