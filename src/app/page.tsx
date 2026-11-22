import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HomeNav, type HomeRoom } from '@/components/home/home-nav';

export const metadata: Metadata = {
  title: { absolute: 'Musaix Pro' },
  description: 'Artist-first music production. AI is the instrument, never the hand. Studio, Audio, Canvas, Research, and Visualizer are live.',
};

const rooms: readonly HomeRoom[] = [
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
  {
    href: '/visualizer',
    index: '05',
    name: 'Visualizer',
    line: 'Watch the microphone or a local file as bars, rings, and waves. Nothing is uploaded.',
  },
];

const ecosystem = [
  [
    "Musaix Pro",
    "Music technology",
    "Artist-first music production and the product ecosystem.",
    "https://musaix-pro-universe.sterl.chatgpt.site"
  ],
  [
    "Cold Case",
    "Music & artist",
    "Official artist website, releases and creative direction.",
    "https://cold-case-official.sterl.chatgpt.site"
  ],
  [
    "MUSAIX Command Center",
    "Creative tools",
    "Music, projects and lyric workflows.",
    "https://musaix-command-studio.sterl.chatgpt.site"
  ],
  [
    "AudioWeaver",
    "Audio tools",
    "Explore a tactile audio patch control surface.",
    "https://musaix-audioweaver.sterl.chatgpt.site"
  ],
  [
    "MUSAIX Retro Console",
    "Audio tools",
    "S73RL audio console and teaser workstation.",
    "https://musaix-retro-console.sterl.chatgpt.site"
  ],
  [
    "Night Drive",
    "Interactive media",
    "An original playable 3D night-driving experience.",
    "https://musaix-night-drive.sterl.chatgpt.site"
  ],
  [
    "Don Sterleone · Palm Bay",
    "Interactive media",
    "Explore the Palm Bay game project.",
    "https://palm-bay-eight.vercel.app"
  ],
  [
    "S73RL · SoundCloud",
    "Music catalog",
    "Listen to music from the S73RL catalog.",
    "https://soundcloud.com/s73rl"
  ],
  [
    "S73RL · Suno",
    "Music catalog",
    "Explore the S73RL music profile.",
    "https://suno.com/@s73rl"
  ],
  [
    "Sterling Atkinson",
    "Professional profile",
    "Connect with the founder and creator.",
    "https://www.linkedin.com/in/sterlingatkinson/"
  ]
] as const;

export default function HomePage() {
  return (
    <main className="min-h-[calc(100dvh-11rem)] bg-[radial-gradient(circle_at_top_left,rgba(255,178,111,0.16),transparent_32%),radial-gradient(circle_at_82%_12%,rgba(238,43,91,0.14),transparent_26%),hsl(var(--background))] text-foreground md:min-h-[calc(100dvh-8.25rem)]">
      <div className="mx-auto flex min-h-[calc(100dvh-11rem)] max-w-6xl flex-col px-4 pb-6 pt-4 md:min-h-[calc(100dvh-8.25rem)] md:px-8 md:pt-6 xl:px-10">
        <HomeNav rooms={rooms} />

        <section className="flex flex-1 flex-col justify-center py-6 md:py-8">
          <Badge variant="outline" className="w-fit border-primary/40 bg-transparent text-[11px] font-bold uppercase tracking-[0.28em] text-primary">
            Artist-first production suite
          </Badge>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[1.05] tracking-tight text-foreground md:mt-5 md:text-5xl md:leading-none 2xl:text-6xl">
            AI is the instrument, never the hand.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground md:mt-5 md:text-lg md:leading-7">
            Musaix Pro keeps the artist in the chair. Studio, Audio, Canvas, Research, and Visualizer are open.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full font-black uppercase tracking-widest sm:w-auto">
              <Link href="/studio">Enter Studio</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="w-full font-bold sm:w-auto">
              <Link href="/audio">Open Audio</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full font-bold sm:w-auto">
              <a href="#ecosystem">Explore SterlAI</a>
            </Button>
          </div>
        </section>

        <section aria-label="Rooms" className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-2 md:gap-5 xl:grid-cols-5">
          {rooms.map((room) => (
            <Link key={room.href} href={room.href} className="group block h-full rounded-xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="h-full border-border bg-card/90 shadow-none transition-colors group-hover:border-primary group-hover:bg-accent">
                <CardHeader className="gap-0 p-4 md:p-5">
                  <Badge variant="outline" className="w-fit border-primary/40 bg-transparent font-black tracking-[0.28em] text-primary">
                    {room.index}
                  </Badge>
                  <CardTitle className="pt-3 text-lg font-black uppercase tracking-wide group-hover:text-primary">{room.name}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{room.line}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </section>

        <section id="ecosystem" aria-labelledby="ecosystem-title" className="mt-12 border-t border-border pt-8 pb-6">
          <div className="mb-6">
            <h2 id="ecosystem-title" className="text-2xl font-black tracking-tight md:text-3xl">The SterlAI ecosystem</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">Explore the public projects, music, creative technology, and professional work of Sterling Atkinson.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ecosystem.map(([name, category, description, href]) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="group flex h-full flex-col rounded-xl border border-border bg-card/90 p-4 transition-colors hover:border-primary hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring md:p-5">
                <span className="text-xs font-bold uppercase tracking-widest text-primary">{category}</span>
                <span className="mt-2 text-lg font-bold group-hover:text-primary">{name} <span aria-hidden="true" className="text-sm">↗</span><span className="sr-only"> (opens in a new tab)</span></span>
                <span className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</span>
              </a>
            ))}
          </div>
          <p className="mt-5 text-sm text-muted-foreground">Alic3X and other projects in development are not listed as public products yet.</p>
        </section>
      </div>
    </main>
  );
}
