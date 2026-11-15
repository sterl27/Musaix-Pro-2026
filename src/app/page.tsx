import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HomeNav, type HomeRoom } from '@/components/home/home-nav';

export const metadata: Metadata = {
  title: 'Musaix Pro',
  description: 'Artist-first music production. AI is the instrument, never the hand. Studio, Audio, Canvas, and Research are live.',
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
];

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
            Musaix Pro keeps the artist in the chair. Studio, Audio, Canvas, and Research are open.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full font-black uppercase tracking-widest sm:w-auto">
              <Link href="/studio">Enter Studio</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="w-full font-bold sm:w-auto">
              <Link href="/audio">Open Audio</Link>
            </Button>
          </div>
        </section>

        <section aria-label="Rooms" className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-2 md:gap-5 xl:grid-cols-4">
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
      </div>
    </main>
  );
}
