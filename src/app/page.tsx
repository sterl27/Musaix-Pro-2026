import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Musaix Pro',
  description: 'Artist-first music production. AI is the instrument, never the hand. Studio, Audio, Canvas, and Research are live.',
};

const rooms = [
  {
    href: '/studio',
    index: '01',
    name: 'Studio',
    line: 'The Audioweaver cockpit and a two-track recorder. Play, record, and export in the browser.',
  },
  {
    href: '/audio',
    index: '02',
    name: 'Audio',
    line: 'Drop one song. The player stays with you through Studio and Canvas until you choose to save it.',
  },
  {
    href: '/canvas',
    index: '03',
    name: 'Canvas',
    line: 'Reference, prompt, project, export. A locked path from a song to a production brief.',
  },
  {
    href: '/research',
    index: '04',
    name: 'Research',
    line: 'Look up a public artist record and keep your own notes. This room does not write an analysis.',
  },
] as const;

export default function HomePage() {
  return (
    <main className="min-h-[calc(100dvh-11rem)] bg-[radial-gradient(circle_at_top_left,rgba(255,178,111,0.16),transparent_32%),radial-gradient(circle_at_82%_12%,rgba(238,43,91,0.14),transparent_26%),#07070a] text-zinc-100 sm:min-h-[calc(100dvh-8.25rem)]">
      <div className="mx-auto flex min-h-[calc(100dvh-11rem)] max-w-6xl flex-col px-5 pb-4 pt-6 sm:min-h-[calc(100dvh-8.25rem)] sm:px-8 sm:pt-6">
        <nav aria-label="Workspace" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-white/10 pb-5">
          <Link href="/" className="text-lg font-extrabold tracking-tight text-[#f6f6fa]">
            MUSAIX <span className="text-[#ee2b5b]">PRO</span>
          </Link>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#a2a2ae]">
            <Link className="hover:text-white" href="/studio">
              Studio
            </Link>
            <Link className="hover:text-white" href="/audio">
              Audio
            </Link>
            <Link className="hover:text-white" href="/canvas">
              Canvas
            </Link>
            <Link className="hover:text-white" href="/research">
              Research
            </Link>
          </div>
        </nav>

        <section className="flex flex-1 flex-col justify-center py-8 sm:py-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-[#ffb26f]">Artist-first production suite</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl">
            AI is the instrument, never the hand.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Musaix Pro keeps the artist in the chair. Studio, Audio, Canvas, and Research are open.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/studio"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#ffb26f] px-5 py-3 text-sm font-black uppercase tracking-widest text-black hover:bg-[#ffd19d]"
            >
              Enter Studio
            </Link>
            <Link
              href="/audio"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#ee2b5b] px-5 py-3 text-sm font-bold text-white hover:bg-[#ff3c6c]"
            >
              Open Audio
            </Link>
          </div>
        </section>

        <section aria-label="Rooms" className="grid gap-3 pb-2 sm:grid-cols-2 lg:grid-cols-4">
          {rooms.map((room) => (
            <Link
              key={room.href}
              href={room.href}
              className="group flex min-h-44 flex-col rounded-2xl border border-[#4d3d31] bg-[#11100f]/90 p-5 transition hover:border-[#ffb26f] hover:bg-[#1a1511]"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[#d99a62]">{room.index}</span>
              <span className="mt-3 text-lg font-black uppercase tracking-wide text-white group-hover:text-[#ffb26f]">{room.name}</span>
              <span className="mt-2 text-sm leading-relaxed text-zinc-400">{room.line}</span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
