import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Build status',
  robots: { index: false, follow: false }
};

export default function CockpitPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(255,178,111,0.16),transparent_34%),#07070a] px-6 text-zinc-100">
      <section className="max-w-3xl rounded-3xl border border-[#4d3d31] bg-[#11100f]/90 p-8 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.35em] text-[#ffb26f]">Musaix Pro v0.1</p>
        <h1 className="mt-4 break-words text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">Audioweaver cockpit is live.</h1>
        <p className="mt-4 text-zinc-400">Studio is the operating shell. Canvas remains locked to Reference → Prompt → Project → Export.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/" className="inline-flex rounded-xl border border-[#4d3d31] px-5 py-3 text-base font-bold text-[#ffb26f]">
            Back to Musaix Pro
          </Link>
          <Link href="/audio" className="inline-flex rounded-xl bg-[#9f1239] px-5 py-3 text-base font-bold text-white">
            Open Audio
          </Link>
          <Link href="/studio" className="inline-flex rounded-xl bg-[#ffb26f] px-5 py-3 text-base font-black uppercase tracking-widest text-black hover:bg-[#ffd19d]">
            Open Studio
          </Link>
          <Link href="/canvas" className="inline-flex rounded-xl border border-[#4d3d31] px-5 py-3 text-base font-black uppercase tracking-widest text-[#ffb26f] hover:bg-[#1a1511]">
            Open Canvas
          </Link>
          <Link href="/research" className="inline-flex rounded-xl border border-[#4d3d31] px-5 py-3 text-base font-black uppercase tracking-widest text-[#ffb26f] hover:bg-[#1a1511]">
            Artist research
          </Link>
        </div>
      </section>
    </main>
  );
}
