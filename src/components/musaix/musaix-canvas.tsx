'use client';

import { useEffect, useMemo, useState } from 'react';
import { ActionPanel } from './action-panel';
import { PromptEditor } from './prompt-editor';
import { ReferenceQueue } from './reference-queue';
import {
  createProject,
  listReferences,
  loadLatestProject,
  saveMarkdownExport,
  savePromptSet,
  saveReferenceCard
} from '@/lib/musaix/canvas-db';
import { exportPromptMarkdown } from '@/lib/musaix/export-markdown';
import type { CanvasStatus, Project, PromptSet, ReferenceCard, SourceType } from '@/lib/musaix/types';

const seedSourceText = `[Song Title: Rabbit-Skin Bridge 11]
[Artist: Rabbit Skin Bridge Band]

[Piano Intro: soft felted keys, intimate, sparse]

[Verse]
A slow grief-survival ballad built around piano, restraint, and release.

[Chorus]
Heavy piano drop, soaring vocal lift, and a final walk-away resolution.`;

const seedReference: ReferenceCard = {
  id: 'seed-rabbit-skin-bridge-11',
  title: 'Rabbit-Skin Bridge 11',
  artist: 'Rabbit Skin Bridge Band',
  sourceType: 'song',
  sourceText: seedSourceText,
  mood: 'slow sad piano ballad, grief, survival, release',
  constraints: 'slow sad piano only; no drums, no guitars, no synths'
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
    projectId: reference.projectId,
    style_prompt:
      'Slow sad piano-only cinematic ballad built from soft felted keys, intimate dynamics, sparse voicings, heavy emotional pauses, and a gradual rise into a powerful piano-led chorus.',
    structure_prompt:
      'Piano intro, Verse 1, Pre-Chorus with rising velocity, heavy piano chorus, post-chorus harmony bloom, Verse 2 pullback, piano crescendo bridge, final chorus, vulnerable solo piano outro with plate reverb fade.',
    vocal_direction:
      'Lead vocal should feel wounded but controlled, starting close and breathy, then opening into soaring sustained notes in the chorus. Harmonies should be stacked lightly without overpowering the piano.',
    production_notes:
      'Use felt piano, close mics, pedal noise, natural room tone, deep plate reverb, and dynamic velocity changes. Build power through chord density, register, sustain, and vocal intensity rather than adding extra instruments.',
    negative_prompt:
      'No drums, no guitars, no bass guitar, no synth pads, no orchestral brass, no EDM drops, no trap percussion, no upbeat pop groove, no BPM tags.'
  };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'musaix-prompt';
}

export function MusaixCanvas() {
  const [references, setReferences] = useState<ReferenceCard[]>([seedReference]);
  const [selectedReference, setSelectedReference] = useState<ReferenceCard>(seedReference);
  const [project, setProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState('Sterl Studio 06');
  const [projectDescription, setProjectDescription] = useState('Musaix Canvas v0.1 prompt workspace');
  const [sourceText, setSourceText] = useState(seedSourceText);
  const [title, setTitle] = useState('Rabbit-Skin Bridge 11');
  const [artist, setArtist] = useState('Rabbit Skin Bridge Band');
  const [sourceType, setSourceType] = useState<SourceType>('song');
  const [mood, setMood] = useState('slow sad piano ballad');
  const [constraints, setConstraints] = useState('slow sad piano only');
  const [prompt, setPrompt] = useState<PromptSet>(fallbackPrompt(seedReference));
  const [status, setStatus] = useState('Ready. Reference → Prompt → Project → Export.');
  const [mode, setMode] = useState<CanvasStatus>('ready');

  const canSavePrompt = useMemo(() => Boolean(prompt.style_prompt && prompt.structure_prompt), [prompt]);
  const promptSaved = Boolean(prompt.id);

  useEffect(() => {
    let live = true;

    async function loadCanvas() {
      try {
        const [projectRow, referenceRows] = await Promise.all([loadLatestProject(), listReferences()]);
        if (!live) return;

        if (projectRow) {
          setProject(projectRow);
          setProjectName(projectRow.name);
          setProjectDescription(projectRow.description ?? '');
        }

        if (referenceRows.length > 0) {
          setReferences(referenceRows);
          setSelectedReference(referenceRows[0]);
          setTitle(referenceRows[0].title);
          setArtist(referenceRows[0].artist ?? '');
          setSourceType(referenceRows[0].sourceType);
          setSourceText(referenceRows[0].sourceText);
          setMood(referenceRows[0].mood ?? '');
          setConstraints(referenceRows[0].constraints ?? '');
          setPrompt(fallbackPrompt(referenceRows[0]));
          setStatus('Supabase loaded. Canvas is wired.');
        }
      } catch {
        if (live) setStatus('Running with local seed. Add Supabase env vars to enable persistence.');
      }
    }

    loadCanvas();
    return () => {
      live = false;
    };
  }, []);

  function selectReference(reference: ReferenceCard) {
    setSelectedReference(reference);
    setTitle(reference.title);
    setArtist(reference.artist ?? '');
    setSourceType(reference.sourceType);
    setSourceText(reference.sourceText);
    setMood(reference.mood ?? '');
    setConstraints(reference.constraints ?? '');
    setPrompt(fallbackPrompt(reference));
    setStatus(`Selected reference: ${reference.title}`);
  }

  async function ensureProject() {
    if (project) return project;

    const created = await createProject({
      name: projectName || `${title || 'Untitled'} Project`,
      description: projectDescription,
      genre: mood
    });

    setProject(created);
    return created;
  }

  async function saveReference() {
    setMode('saving');
    setStatus('Saving reference to Supabase...');

    try {
      const activeProject = await ensureProject();
      const reference = await saveReferenceCard({
        projectId: activeProject.id,
        title: title || 'Untitled Reference',
        artist,
        sourceType,
        sourceText,
        mood,
        constraints,
        tags: [sourceType, mood].filter(Boolean)
      });

      setReferences((current) => [reference, ...current.filter((item) => item.id !== reference.id)]);
      setSelectedReference(reference);
      setPrompt(fallbackPrompt(reference));
      setStatus('Reference saved to Supabase.');
    } catch {
      const localReference: ReferenceCard = {
        id: crypto.randomUUID(),
        title: title || 'Untitled Reference',
        artist,
        sourceType,
        sourceText,
        mood,
        constraints,
        tags: [sourceType, mood].filter(Boolean)
      };

      setReferences((current) => [localReference, ...current]);
      setSelectedReference(localReference);
      setPrompt(fallbackPrompt(localReference));
      setStatus('Reference saved locally. Supabase write failed or env vars are missing.');
    } finally {
      setMode('ready');
    }
  }

  async function generatePrompt() {
    const referencePayload: ReferenceCard = selectedReference ?? {
      id: 'unsaved-reference',
      title,
      artist,
      sourceType,
      sourceText,
      mood,
      constraints
    };

    setMode('generating');
    setStatus('Generating prompt set with AI Gateway...');

    try {
      const response = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: { name: projectName, description: projectDescription },
          reference: referencePayload,
          constraints
        })
      });

      if (!response.ok) throw new Error('AI Gateway route failed.');

      const data = (await response.json()) as PromptSet;
      setPrompt({ ...emptyPrompt, ...data, projectId: project?.id ?? referencePayload.projectId, referenceId: referencePayload.id });
      setStatus('Prompt generated. Review, edit, then save.');
    } catch {
      setPrompt(fallbackPrompt(referencePayload));
      setStatus('Using local fallback prompt. Add AI_GATEWAY_API_KEY to enable live generation.');
    } finally {
      setMode('ready');
    }
  }

  async function savePrompt() {
    setMode('saving');
    setStatus('Saving prompt set to Supabase...');

    try {
      const activeProject = await ensureProject();
      const saved = await savePromptSet({
        ...prompt,
        projectId: activeProject.id,
        referenceId: selectedReference?.id ?? null
      });
      setPrompt(saved);
      setStatus('Prompt set saved to Supabase.');
    } catch {
      setStatus('Prompt remains local. Supabase write failed or env vars are missing.');
    } finally {
      setMode('ready');
    }
  }

  async function exportMarkdown() {
    setMode('exporting');
    const markdown = exportPromptMarkdown(selectedReference, prompt);
    const filename = `${slugify(selectedReference?.title ?? title)}-musaix-prompt.md`;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    try {
      await saveMarkdownExport({ projectId: project?.id, promptId: prompt.id, filename, content: markdown });
      setStatus('Markdown exported and export row saved.');
    } catch {
      setStatus('Markdown downloaded locally. Export row not saved.');
    } finally {
      setMode('ready');
    }
  }

  return (
    <main className="min-h-screen bg-[#07070a] px-5 py-6 text-zinc-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-950 to-zinc-900 p-6 shadow-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-pink-400">Musaix Pro v0.1</p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold md:text-5xl">Canvas</h1>
              <p className="mt-3 max-w-3xl text-zinc-400">Locked build path: Reference → Prompt → Project → Export. Small, real, wired.</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-400">
              Supabase: <span className="text-cyan-300">xexzplnyzblflucfvbwt</span>
            </div>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)_300px]">
          <ReferenceQueue references={references} selectedId={selectedReference.id} onSelect={selectReference} />

          <div className="space-y-5">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-2xl">
              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Input</p>
                <h2 className="mt-2 text-xl font-semibold">Reference capture</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">Project</span>
                  <input value={projectName} onChange={(event) => setProjectName(event.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100 outline-none focus:border-pink-500" />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">Project Notes</span>
                  <input value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100 outline-none focus:border-pink-500" />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">Title</span>
                  <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100 outline-none focus:border-pink-500" />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">Artist / Source</span>
                  <input value={artist} onChange={(event) => setArtist(event.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100 outline-none focus:border-pink-500" />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">Source Type</span>
                  <select value={sourceType} onChange={(event) => setSourceType(event.target.value as SourceType)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100 outline-none focus:border-pink-500">
                    <option value="song">Song</option>
                    <option value="artist">Artist</option>
                    <option value="style">Style</option>
                    <option value="lyric">Lyric</option>
                    <option value="manual">Manual</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">Mood</span>
                  <input value={mood} onChange={(event) => setMood(event.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100 outline-none focus:border-pink-500" />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">Constraints</span>
                  <input value={constraints} onChange={(event) => setConstraints(event.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100 outline-none focus:border-pink-500" />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">Source Text</span>
                  <textarea rows={14} value={sourceText} onChange={(event) => setSourceText(event.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100 outline-none focus:border-pink-500" />
                </label>
              </div>
            </section>

            <PromptEditor prompt={prompt} onChange={setPrompt} />
          </div>

          <ActionPanel
            status={status}
            mode={mode}
            canSavePrompt={canSavePrompt}
            project={project}
            selectedReference={selectedReference}
            referenceCount={references.length}
            promptSaved={promptSaved}
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
