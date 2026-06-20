import type { PromptSet } from '@/lib/musaix/types';

type PromptEditorProps = {
  prompt: PromptSet;
  onChange: (prompt: PromptSet) => void;
};

const fields: Array<{ key: keyof PromptSet; label: string; rows: number }> = [
  { key: 'style_prompt', label: 'Style Prompt', rows: 4 },
  { key: 'structure_prompt', label: 'Structure Prompt', rows: 4 },
  { key: 'vocal_direction', label: 'Vocal Direction', rows: 3 },
  { key: 'production_notes', label: 'Production Notes', rows: 4 },
  { key: 'negative_prompt', label: 'Negative Prompt', rows: 3 }
];

export function PromptEditor({ prompt, onChange }: PromptEditorProps) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-2xl">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Prompt Set</p>
        <h2 className="mt-2 text-xl font-semibold">Editable generator output</h2>
      </div>

      <div className="space-y-4">
        {fields.map((field) => (
          <label key={field.key} className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-300">{field.label}</span>
            <textarea
              rows={field.rows}
              value={String(prompt[field.key] ?? '')}
              onChange={(event) => onChange({ ...prompt, [field.key]: event.target.value })}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100 outline-none ring-0 transition placeholder:text-zinc-600 focus:border-pink-500"
            />
          </label>
        ))}
      </div>
    </section>
  );
}
