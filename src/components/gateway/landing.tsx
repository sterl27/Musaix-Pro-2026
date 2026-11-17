import Link from 'next/link';
import { GatewayFrame } from './shell';

const BRIEF_FIELDS = [
  ['Lyrics', 'Your words'],
  ['Story', 'What it is about'],
  ['Emotion', 'The feeling you mean'],
  ['Genre', 'Where it sits'],
  ['Instruments', 'What plays it'],
  ['Inspirations', 'Who you are near'],
  ['Structure', 'How it moves'],
  ['Cadence', 'How it speaks']
] as const;

export function LandingPage() {
  return (
    <GatewayFrame>
      <section className="gw-hero">
        <div className="gw-hero-copy">
          <p className="gw-kicker">For artists who finish the song first</p>
          <h1>
            AI is the instrument. <em>Never the hand.</em>
          </h1>
        </div>
        <div>
          <p className="gw-lede">
            Musaix Pro is an artist-first music production suite. You record, you edit, and you decide. A model does not get the song until you have written what it is.
          </p>
          <p className="gw-why">
            A prompt can invent a track and skip every decision a record is made of. Musaix Pro starts on the other side of that: the human brief is finished before any AI stage unlocks.
          </p>
          <div className="gw-actions">
            <Link className="gw-primary" href="/sign-up?next=/brief">
              Get early access
            </Link>
            <Link className="gw-secondary" href="/sign-in?next=/brief">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="gw-section" id="loop">
        <p className="gw-kicker">The human-first loop</p>
        <h2>Record. Then edit. Then create.</h2>
        <div className="gw-loop">
          <article className="gw-step">
            <span>01</span>
            <h3>Record</h3>
            <p>The song starts as a performance. A voice, a take, a beat in the room. Open it, play it, and record against it. The capture stays yours.</p>
          </article>
          <article className="gw-step">
            <span>02</span>
            <h3>Edit</h3>
            <p>You shape what you meant. Lyrics, structure, emotion, cadence. Those are edits, not prompts. Module One is where you write them down yourself.</p>
          </article>
          <article className="gw-step">
            <span>03</span>
            <h3>Create</h3>
            <p>Only then does an instrument come out. AI stages stay locked until the brief is yours. When they open, they play inside work you already made.</p>
          </article>
        </div>
      </section>

      <section className="gw-section" id="module-one">
        <div className="gw-split">
          <div>
            <p className="gw-kicker">Module One</p>
            <h2>The brief comes first.</h2>
            <p>
              Module One is the creative brief you fill out with no AI in the chair. Lyrics, story, emotion, genre, instruments, inspirations, structure, and cadence. That page is the hand. Nothing downstream is allowed to write it.
            </p>
            <div className="gw-actions">
              <Link className="gw-primary" href="/sign-up?next=/brief">
                Start your brief
              </Link>
            </div>
          </div>
          <article className="gw-sheet" aria-label="Module One fields">
            <header>
              <p>Human only · AI locked</p>
              <h2>Module One</h2>
            </header>
            <ol>
              {BRIEF_FIELDS.map(([label, note]) => (
                <li key={label}>
                  <span>{label}</span>
                  <i>{note}</i>
                </li>
              ))}
            </ol>
          </article>
        </div>
      </section>

      <section className="gw-section" id="workbench">
        <p className="gw-kicker">What is here</p>
        <h2>A suite around the brief.</h2>
        <div className="gw-cards">
          <article className="gw-card">
            <h3>The gate</h3>
            <p>Module One is required before AI stages. Those stages are not open yet. The brief is the thing you can start today.</p>
          </article>
          <article className="gw-card">
            <h3>The workbench</h3>
            <ul>
              <li>
                <Link href="/audio">Audio</Link> opens a song and keeps it playing.
              </li>
              <li>
                <Link href="/studio">Studio</Link> records a take against a beat.
              </li>
              <li>
                <Link href="/canvas">Canvas</Link> runs Reference, Prompt, Project, Export.
              </li>
              <li>
                <Link href="/research">Research</Link> looks up public catalogs. No model call.
              </li>
              <li>
                <Link href="/visualizer">Visualizer</Link> reacts to a microphone or a local file. No upload.
              </li>
            </ul>
          </article>
          <article className="gw-card">
            <h3>The rule</h3>
            <p>AI is the instrument, never the hand. It does not get the first draft of your intent, your lyrics, or your structure.</p>
          </article>
        </div>
      </section>

      <section className="gw-close">
        <p className="gw-kicker">Early access</p>
        <h2>Start with the brief.</h2>
        <p>Create an account, confirm your email, and Module One is the first room. Sign in if you already have one.</p>
        <div className="gw-actions">
          <Link className="gw-primary" href="/sign-up?next=/brief">
            Get early access
          </Link>
          <Link className="gw-secondary" href="/sign-in?next=/brief">
            Sign in
          </Link>
        </div>
      </section>
    </GatewayFrame>
  );
}
