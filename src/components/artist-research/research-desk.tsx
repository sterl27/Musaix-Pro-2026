'use client';

import { useMemo, useState, type FormEvent } from 'react';
import {
  NOTE_CAP,
  NOTE_LIMIT,
  NOTE_TOPICS,
  PASSAGE_LIMIT,
  briefFilename,
  buildResearchBrief,
  externalSearchLinks,
  passageStats,
  prepareNote,
  readPassage,
  type NoteTopic,
  type ResearchNote,
} from '@/lib/artist-research/desk';
import type { PublicIdentity, PublicSource, SourceKind } from '@/lib/artist-research/types';

const TOPIC_LABEL: Record<NoteTopic, string> = {
  general: 'General',
  vocabulary: 'Vocabulary',
  rhyme: 'Rhyme on the page',
  punchlines: 'Punchlines',
  narrative: 'Narrative and persona',
  hooks: 'Hooks',
  delivery: 'Delivery notes',
};

const KIND_LABEL: Record<SourceKind, string> = {
  catalog_record: 'Catalog record',
  encyclopedia_summary: 'Encyclopedia summary',
  interview: 'Interview',
  review: 'Review',
  criticism: 'Criticism',
  artist_statement: 'Artist statement',
};

export function ResearchDesk({
  identity,
  sources,
  onLeave,
  onDirty,
}: {
  identity: PublicIdentity;
  sources: PublicSource[];
  onLeave: () => void;
  onDirty: (dirty: boolean) => void;
}) {
  const [passage, setPassage] = useState('');
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [topic, setTopic] = useState<NoteTopic>('general');
  const [noteText, setNoteText] = useState('');
  const [noteUrl, setNoteUrl] = useState('');
  const [noteError, setNoteError] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const parsed = readPassage(passage);
  const stats = parsed.ok && parsed.text ? passageStats(parsed.text) : null;
  const dirty = Boolean(parsed.ok && parsed.text) || notes.length > 0;
  const links = useMemo(() => externalSearchLinks(identity.name), [identity.name]);

  function mark(nextPassage: string, nextNotes: ResearchNote[]) {
    const nextParsed = readPassage(nextPassage);
    onDirty(Boolean(nextParsed.ok && nextParsed.text) || nextNotes.length > 0);
  }

  function addNote(event: FormEvent) {
    event.preventDefault();
    if (notes.length >= NOTE_CAP) {
      setNoteError(`This desk keeps ${NOTE_CAP} notes.`);
      return;
    }
    const prepared = prepareNote({ topic, text: noteText, url: noteUrl });
    if (!prepared.ok) {
      setNoteError(prepared.message);
      return;
    }
    const next = [...notes, { ...prepared.note, id: `note-${notes.length + 1}-${topic}` }];
    setNotes(next);
    setNoteText('');
    setNoteUrl('');
    setNoteError('');
    mark(passage, next);
  }

  function removeNote(id: string) {
    const next = notes.filter((note) => note.id !== id);
    setNotes(next);
    mark(passage, next);
  }

  function download() {
    const markdown = buildResearchBrief({ identity, sources, notes, passage: parsed.ok ? parsed.text : '' });
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = briefFilename(identity.name);
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="research-result" data-state="workspace">
      <p className="research-banner">Working brief. Not an AI analysis. No model was called and no audio was measured.</p>
      <div className="research-row">
        <h2>{identity.name}</h2>
        {confirmLeave ? (
          <div className="research-actions">
            <button className="research-secondary" type="button" onClick={onLeave}>
              Clear notes and leave
            </button>
            <button className="research-secondary" type="button" onClick={() => setConfirmLeave(false)}>
              Stay
            </button>
          </div>
        ) : (
          <button className="research-secondary" type="button" onClick={() => (dirty ? setConfirmLeave(true) : onLeave())}>
            Choose a different record
          </button>
        )}
      </div>
      <p>{identity.disambiguation || 'No short catalog description was returned.'}</p>
      <p className="research-meta">{[identity.kind, identity.area].filter(Boolean).join(' · ') || 'Catalog record'}</p>
      {identity.aliases?.length ? <p className="research-meta">Also listed as {identity.aliases.join(', ')}</p> : null}
      <h3>Pages requested</h3>
      <LinkList items={identity.urls.map((url) => ({ href: url.href, label: url.label, detail: 'Fetched as a catalog page for this record.' }))} />
      <h3>Text fetched for this record</h3>
      <p className="research-note">This is catalog text that was actually fetched. It is not a lyric analysis.</p>
      {sources.length ? (
        <ul className="research-sources">
          {sources.map((source) => (
            <li key={source.id} className="research-source">
              <h4>{source.title}</h4>
              <p className="research-meta">
                {KIND_LABEL[source.kind]} · {source.publisher} · Retrieved {source.retrievedAt}
              </p>
              <blockquote cite={source.url}>
                <p>{source.excerpt}</p>
              </blockquote>
              <a href={source.url} target="_blank" rel="noreferrer">
                Open catalog page
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p>No catalog excerpt was stored.</p>
      )}
      <h3>Search links</h3>
      <p className="research-note">These open a public search. They are not citations, and this page does not read them.</p>
      <LinkList items={links} />
      <form className="research-desk-form" onSubmit={addNote}>
        <h3>Your notes</h3>
        <p className="research-note">Notes are your own and stay in this tab until you download a brief or leave the record.</p>
        <label>
          Topic
          <select value={topic} onChange={(event) => setTopic(event.target.value as NoteTopic)}>
            {NOTE_TOPICS.map((item) => (
              <option key={item} value={item}>
                {TOPIC_LABEL[item]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Note
          <textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} maxLength={NOTE_LIMIT} rows={3} required />
        </label>
        <label>
          Optional link
          <input value={noteUrl} onChange={(event) => setNoteUrl(event.target.value)} type="url" placeholder="https://" inputMode="url" />
        </label>
        <button className="research-secondary" type="submit">
          Add note
        </button>
        {noteError ? <p role="alert">{noteError}</p> : null}
      </form>
      {notes.length ? (
        <ul className="research-sources">
          {notes.map((note) => (
            <li key={note.id} className="research-source">
              <h4>{TOPIC_LABEL[note.topic]}</h4>
              <p>{note.text}</p>
              {note.url ? (
                <a href={note.url} target="_blank" rel="noreferrer">
                  Link you attached
                </a>
              ) : null}
              <button className="research-secondary" type="button" onClick={() => removeNote(note.id)}>
                Remove {TOPIC_LABEL[note.topic]} note
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="research-note">No notes yet.</p>
      )}
      <div className="research-desk-form">
        <h3>Short passage you have the right to study</h3>
        <label htmlFor="research-passage">Paste at most {PASSAGE_LIMIT} characters. Do not paste a full song or a lyric-site dump.</label>
        <textarea id="research-passage" value={passage} onChange={(event) => { setPassage(event.target.value); mark(event.target.value, notes); }} maxLength={PASSAGE_LIMIT} rows={5} />
        <p className="research-meta">{passage.trim().length} / {PASSAGE_LIMIT}</p>
        {!parsed.ok ? <p role="alert">{parsed.message}</p> : null}
        <p className="research-note">Counts below describe this paste only. They are not rhyme quality, timing, or a measurement of a recording.</p>
        {stats ? <PassageFigure stats={stats} /> : <p className="research-note">Paste a passage to see word and line counts.</p>}
      </div>
      <button className="research-primary" type="button" onClick={download}>
        Download research brief
      </button>
    </div>
  );
}

export function SearchLinks({ name }: { name: string }) {
  const links = externalSearchLinks(name);
  if (!links.length) return null;
  return (
    <>
      <h3>Keep looking</h3>
      <p className="research-note">These open a public search for the name you typed. This page has not read them.</p>
      <LinkList items={links} />
    </>
  );
}

function LinkList({ items }: { items: { href: string; label: string; detail: string }[] }) {
  if (!items.length) return <p>No links were available.</p>;
  return (
    <ul className="research-search-list">
      {items.map((item) => (
        <li key={item.href}>
          <a href={item.href} target="_blank" rel="noreferrer">
            {item.label}
          </a>
          <span className="research-meta"> {item.detail}</span>
        </li>
      ))}
    </ul>
  );
}

function PassageFigure({ stats }: { stats: NonNullable<ReturnType<typeof passageStats>> }) {
  const maxRepeat = Math.max(1, ...stats.repeatedWords.map((item) => item.count));
  return (
    <figure>
      <figcaption>Counts of the pasted passage</figcaption>
      <ul className="research-facts">
        <li>{stats.characters} characters</li>
        <li>{stats.words} words</li>
        <li>{stats.lines} lines</li>
        <li>{stats.uniqueWords} unique content words</li>
      </ul>
      <h4>Words that occur more than once</h4>
      {stats.repeatedWords.length ? (
        <ul className="research-stats">
          {stats.repeatedWords.map((item) => (
            <li key={item.word} className="research-stat">
              <span>{item.word}</span>
              <span className="research-stat-bar" aria-hidden="true">
                <span style={{ width: `${Math.max(8, (item.count / maxRepeat) * 100)}%` }} />
              </span>
              <span>
                {item.count} {item.count === 1 ? 'time' : 'times'}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>No content word in this passage repeats.</p>
      )}
      <h4>Last word on a line, when that word repeats</h4>
      <p className="research-note">This is the final word of a typed line. It is not a rhyme transcription or a timed performance.</p>
      {stats.repeatedLineEndings.length ? (
        <ul>
          {stats.repeatedLineEndings.map((item) => (
            <li key={item.word}>
              {item.word}: {item.count} lines
            </li>
          ))}
        </ul>
      ) : (
        <p>No line-ending word repeats in this passage.</p>
      )}
    </figure>
  );
}
