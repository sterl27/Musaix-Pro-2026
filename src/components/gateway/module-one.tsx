'use client';

import { useState, useSyncExternalStore } from 'react';

const FIELDS = [
  { name: 'title', label: 'Working title', hint: 'What you are calling it today.', rows: 1 },
  { name: 'lyrics', label: 'Lyrics', hint: 'The words, as you want them.', rows: 8 },
  { name: 'story', label: 'Story', hint: 'What the song is about.', rows: 4 },
  { name: 'emotion', label: 'Emotion', hint: 'The feeling you mean, not a mood board.', rows: 3 },
  { name: 'genre', label: 'Genre', hint: 'Where it sits.', rows: 2 },
  { name: 'instruments', label: 'Instruments', hint: 'What should play it.', rows: 3 },
  { name: 'inspirations', label: 'Inspirations', hint: 'Records or artists you are near. Name them yourself.', rows: 3 },
  { name: 'structure', label: 'Structure', hint: 'How the song moves.', rows: 3 },
  { name: 'cadence', label: 'Cadence', hint: 'How the line speaks and breathes.', rows: 3 },
  { name: 'notes', label: 'Notes', hint: 'Anything else that has to stay true.', rows: 3 }
] as const;

type FieldName = (typeof FIELDS)[number]['name'];
type Draft = Record<FieldName, string>;

const EMPTY: Draft = {
  title: '',
  lyrics: '',
  story: '',
  emotion: '',
  genre: '',
  instruments: '',
  inspirations: '',
  structure: '',
  cadence: '',
  notes: ''
};

function storageKey(userId: string) {
  return `musaix.module-one.v1:${userId}`;
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

let snapshotKey = '';
let snapshot: Draft = EMPTY;

function readSnapshot(userId: string): Draft {
  let raw = '';
  try {
    raw = localStorage.getItem(storageKey(userId)) ?? '';
  } catch {
    raw = '';
  }
  const key = `${userId}\n${raw}`;
  if (key === snapshotKey) return snapshot;
  snapshotKey = key;
  if (!raw) {
    snapshot = EMPTY;
    return snapshot;
  }
  try {
    snapshot = { ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) };
  } catch {
    snapshot = EMPTY;
  }
  return snapshot;
}

export function ModuleOne({ userId }: { userId: string }) {
  const stored = useSyncExternalStore(subscribe, () => readSnapshot(userId), () => EMPTY);
  const [override, setOverride] = useState<Draft | null>(null);
  const [saved, setSaved] = useState('');
  const draft = override ?? stored;

  function update(name: FieldName, value: string) {
    setSaved('');
    setOverride({ ...draft, [name]: value });
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    localStorage.setItem(storageKey(userId), JSON.stringify(draft));
    snapshotKey = '';
    setSaved('Saved on this device.');
  }

  return (
    <section className="brief-head">
      <p className="gw-kicker">Module One</p>
      <h1>Write the brief yourself.</h1>
      <p>
        Lyrics, story, emotion, genre, instruments, inspirations, structure, and cadence. No model is in this room. AI stages stay locked until this brief is yours.
      </p>
      <p className="brief-lock">Kept in this browser only. It is not uploaded.</p>
      <form className="brief-form" onSubmit={save}>
        {saved ? (
          <p className="auth-ok" role="status">
            {saved}
          </p>
        ) : null}
        {FIELDS.map(field => (
          <label key={field.name}>
            {field.label}
            {field.rows === 1 ? (
              <input name={field.name} value={draft[field.name]} placeholder={field.hint} onChange={event => update(field.name, event.target.value)} />
            ) : (
              <textarea name={field.name} rows={field.rows} value={draft[field.name]} placeholder={field.hint} onChange={event => update(field.name, event.target.value)} />
            )}
          </label>
        ))}
        <button className="gw-primary" type="submit">
          Save brief
        </button>
        <p className="auth-note">Cloud save of the brief needs a table. That waits for your OK. Nothing here calls a model.</p>
      </form>
    </section>
  );
}
