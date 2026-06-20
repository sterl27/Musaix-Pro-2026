import type { ReferenceCard } from '@/lib/musaix/types';

type ReferenceQueueProps = {
  references: ReferenceCard[];
  selectedId: string | null;
  onSelect: (reference: ReferenceCard) => void;
};

export function ReferenceQueue({ references, selectedId, onSelect }: ReferenceQueueProps) {
  return (
    <aside className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-2xl">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Reference Queue</p>
        <h2 className="mt-2 text-xl font-semibold">Captured inputs</h2>
      </div>

      <div className="space-y-3">
        {references.map((reference) => (
          <button
            key={reference.id}
            type="button"
            onClick={() => onSelect(reference)}
            className={`w-full rounded-xl border p-3 text-left transition ${
              selectedId === reference.id
                ? 'border-pink-500 bg-pink-500/10'
                : 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="line-clamp-1 font-medium">{reference.title}</h3>
              <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] uppercase text-zinc-400">
                {reference.sourceType}
              </span>
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-zinc-400">{reference.sourceText}</p>
            {reference.constraints ? <p className="mt-2 text-xs text-pink-300">{reference.constraints}</p> : null}
          </button>
        ))}
      </div>
    </aside>
  );
}
