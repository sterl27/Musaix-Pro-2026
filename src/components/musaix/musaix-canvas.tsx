'use client';

import { useMemo, useState } from 'react';
import { ActionPanel } from './action-panel';
import { PromptEditor } from './prompt-editor';
import { ReferenceQueue } from './reference-queue';
import { exportPromptMarkdown } from '@/lib/musaix/export-markdown';
import type { PromptSet, ReferenceCard } from '@/lib/musaix/types';

const rabbitSkinBridgeText = `[Song Title: Rabbit-Skin Bridge 11]
[Artist: Rabbit Skin Bridge Band]

[Piano Intro: soft felted keys, intimate, sparse]

[Verse 1]
It’s a long road back from where we broke,
I’ll find a way through all this cold.
The morning light is thin as smoke,
I’m losing everything I hold.

Nothing left for you to take,
No more vows for me to keep.
Just the ghost of what we made,
Still whispering in my sleep.

[Pre-Chorus: building tension, rising piano velocity]
But I won’t stay buried,
I won’t stay blind.
I’ll carry the fire
Out of the night.

[Chorus: Heavy Piano Drop | full power | soaring vocals]
In my reflection,
I see us on the other side,
Facing the sun.

You can’t hold what’s mine,
My heart still knows how to survive.
No protection,
No history left to hide,
Starting again,
Walking away.

It’s the holy, heavy logic of a cry.

[Post-Chorus: stacked harmonies | ethereal reverb bloom]
The gravity of a cry,
The mercy in goodbye,
The healing water of a cry.

[Verse 2: piano pulls back, soft intensity]
I held the silence like a blade,
Felt every word we never said.
Searched for the signal in your face,
Found only static there instead.

Don’t look back before the bend,
Don’t name the wound before it mends.
I had to break to understand
The light was waiting in my hands.

[Bridge: orchestral brass swells | crescendo]
No glass verdict,
No borrowed shame,
Can steal the marrow
From my name.

Let the old world
Fall behind.
I was never lost,
Just hard to find.

[Final Chorus: Heavy Piano Drop | epic crescendo | intensive high notes]
In my reflection,
I see us on the other side,
Facing the sun.

You can’t hold what’s mine,
My heart still knows how to survive.

[Outro: solo piano | vulnerable | slow fade]
I’ll find the way...
Starting again...
Walking away...

[Fade with plate reverb]
[End]`;

const initialReference: ReferenceCard = {
  id: 'rabbit-skin-bridge-11',
  title: 'Rabbit-Skin Bridge 11',
  artist: 'Rabbit Skin Bridge Band',
  sourceType: 'song',
  sourceText: rabbitSkinBridgeText,
  mood: 'slow sad piano ballad, grief, survival, release',
  constraints: 'slow sad piano only; no drums, no guitars, no synths, no orchestral brass'
};

const emptyPrompt: PromptSet = {
  style_prompt: '',
  structure_prompt: '',
  vocal_direction: '',
  production_notes: '',
  negative_prompt: ''
};

function fallbackPrompt(reference: ReferenceCard): PromptSet {
  return {
    referenceId: reference.id,
    style_prompt:
      'Slow sad piano-only cinematic ballad built from soft felted keys, intimate dynamics, sparse voicings, heavy emotional pauses, and a gradual rise into a powerful piano-led chorus. Keep the sound human, raw, and restrained.',
    structure_prompt:
      'Piano intro, Verse 1, Pre-Chorus with rising velocity, heavy piano chorus, post-chorus harmony bloom, Verse 2 pullback, bridge as piano crescendo only, final chorus with full chord weight, vulnerable solo piano outro with plate reverb fade.',
    vocal_direction:
      'Lead vocal should feel wounded but controlled, starting close and breathy, then opening into soaring sustained notes in the chorus. Harmonies should be stacked lightly in the post-chorus without overpowering the piano.',
    production_notes:
      'Use felt piano, close mics, pedal noise, natural room tone, deep plate reverb, and dynamic velocity changes. Build power through chord density, register, sustain, and vocal intensity rather than adding extra instruments.',
    negative_prompt:
      'No drums, no guitars, no bass guitar, no synth pads, no orchestral brass, no EDM drops, no trap percussion, no upbeat pop groove, no busy arrangement, no BPM tags.'
  };
}

export function MusaixCanvas() {
  const [references, setReferences] = useState<ReferenceCard[]>([initialReference]);
  const [selectedReference, setSelectedReference] = useState<ReferenceCard>(initialReference);
  const [sourceText, setSourceText] = useState(rabbitSkinBridgeText);
  const [title, setTitle] = useState('Rabbit-Skin Bridge 11');
  const [constraints, setConstraints] = useState('slow sad piano only');
  const [prompt, setPrompt] = useState<PromptSet>(fallbackPrompt(initialReference));
  const [status, setStatus] = useState('Ready. v0.1 scope locked.');

  const canSavePrompt = useMemo(() => Boolean(prompt.style_prompt && prompt.structure_prompt), [prompt]);

  async function saveReference() {
    const reference: ReferenceCard = {
      id: crypto.randomUUID(),
      title: title || 'Untitled Reference',
      artist: 'Rabbit Skin Bridge Band',
      sourceType: 'song',
      sourceText,
      mood: 'slow sad piano ballad',
      constraints
    };

    setReferences((current) => [reference, ...current]);
    setSelectedReference(reference);
    setStatus('Reference saved locally. Supabase insert is ready for env-backed wiring.');
  }

  async function generatePrompt() {
    setStatus('Generating prompt set...');

    try {
      const response = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: selectedReference, constraints })
      });

      if (!response.ok) throw new Error('AI Gateway route failed.');

      const data = (await response.json()) as PromptSet;
      setPrompt(data);
      setStatus('Prompt generated from AI Gateway.');
    } catch {
      const data = fallbackPrompt(selectedReference);
      setPrompt(data);
      setStatus('Using local fallback prompt. Add AI_GATEWAY_API_KEY to enable generation.');
    }
  }

  async function savePrompt() {
    setStatus('Prompt saved locally. Supabase insert is next once env vars are configured.');
  }

  function exportMarkdown() {
    const markdown = exportPromptMarkdown(selectedReference, prompt);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedReference.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-musaix-prompt.md`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus('Markdown export created.');
  }

  return (
    <main className="min-h-screen bg-[#07070a] px-5 py-6 text-zinc-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-950 to-zinc-900 p-6 shadow-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-pink-400">Musaix Pro v0.1</p>
          <h1 className="mt-3 text-3xl font-bold md:text-5xl">Canvas</h1>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Locked build path: Reference → Prompt → Project → Export. Small, real, wired.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)_280px]">
          <ReferenceQueue references={references} selectedId={selectedReference.id} onSelect={setSelectedReference} />

          <div className="space-y-5">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-2xl">
              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Input</p>
                <h2 className="mt-2 text-xl font-semibold">Reference capture</h2>
              </div>

              <div className="grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">Title</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100 outline-none focus:border-pink-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">Constraint</span>
                  <input
                    value={constraints}
                    onChange={(event) => setConstraints(event.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100 outline-none focus:border-pink-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">Source Text</span>
                  <textarea
                    rows={14}
                    value={sourceText}
                    onChange={(event) => setSourceText(event.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100 outline-none focus:border-pink-500"
                  />
                </label>
              </div>
            </section>

            <PromptEditor prompt={prompt} onChange={setPrompt} />
          </div>

          <ActionPanel
            status={status}
            canSavePrompt={canSavePrompt}
            onSaveReference={saveReference}
            onGeneratePrompt={generatePrompt}
            onSavePrompt={savePrompt}
            onExportMarkdown={exportMarkdown}
          />
        </div>
      </div>
    </main>
  );
}
