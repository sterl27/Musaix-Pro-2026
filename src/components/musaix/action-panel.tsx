type ActionPanelProps = {
  status: string;
  canSavePrompt: boolean;
  onSaveReference: () => void;
  onGeneratePrompt: () => void;
  onSavePrompt: () => void;
  onExportMarkdown: () => void;
};

export function ActionPanel({
  status,
  canSavePrompt,
  onSaveReference,
  onGeneratePrompt,
  onSavePrompt,
  onExportMarkdown
}: ActionPanelProps) {
  return (
    <aside className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-2xl">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Actions</p>
        <h2 className="mt-2 text-xl font-semibold">Ship panel</h2>
      </div>

      <div className="grid gap-3">
        <button type="button" onClick={onSaveReference} className="rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-white">
          Save Reference
        </button>
        <button type="button" onClick={onGeneratePrompt} className="rounded-xl bg-pink-600 px-4 py-3 text-sm font-semibold text-white hover:bg-pink-500">
          Generate Prompt
        </button>
        <button
          type="button"
          onClick={onSavePrompt}
          disabled={!canSavePrompt}
          className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save Prompt
        </button>
        <button type="button" onClick={onExportMarkdown} className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-500">
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
