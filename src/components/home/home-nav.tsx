'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export type HomeRoom = {
  href: string;
  index: string;
  name: string;
  line: string;
};

export function HomeNav({ rooms }: { rooms: readonly HomeRoom[] }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border pb-4 md:pb-5">
      <Link href="/" className="text-lg font-extrabold tracking-tight text-foreground">
        MUSAIX <span className="text-secondary">PRO</span>
      </Link>
      <nav aria-label="Workspace" className="hidden items-center gap-1 md:flex">
        {rooms.map((room) => (
          <Button key={room.href} asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
            <Link href={room.href}>{room.name}</Link>
          </Button>
        ))}
      </nav>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-full max-w-full border-border pb-28 sm:max-w-sm">
          <SheetHeader className="pr-8 text-left">
            <SheetTitle>Musaix Pro</SheetTitle>
            <SheetDescription>Four live rooms.</SheetDescription>
          </SheetHeader>
          <nav aria-label="Mobile workspace" className="mt-8 flex flex-col gap-2">
            {rooms.map((room) => (
              <Link key={room.href} href={room.href} className="rounded-xl border border-border px-4 py-3 hover:border-primary hover:bg-accent">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">{room.index}</span>
                <span className="mt-1 block text-base font-semibold text-foreground">{room.name}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{room.line}</span>
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
