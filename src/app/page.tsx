import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(255,178,111,0.16),transparent_34%),#07070a] px-6 text-zinc-100">
      <section className="max-w-3xl rounded-3xl border border-[#4d3d31] bg-[#11100f]/90 p-8 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.35em] text-[#ffb26f]">Musaix Pro v0.1</p>
        <h1 className="mt-4 text-5xl font-black uppercase tracking-tight text-white">Audioweaver cockpit is live.</h1>
        <p className="mt-4 text-zinc-400">Studio is the operating shell. Canvas remains locked to Reference → Prompt → Project → Export.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/studio" className="inline-flex rounded-xl bg-[#ffb26f] px-5 py-3 text-sm font-black uppercase tracking-widest text-black hover:bg-[#ffd19d]">
            Open Studio
          </Link>
          <Link href="/canvas" className="inline-flex rounded-xl border border-[#4d3d31] px-5 py-3 text-sm font-black uppercase tracking-widest text-[#ffb26f] hover:bg-[#1a1511]">
            Open Canvas
          </Link>
        </div>
      </section>
    </main>
  );
}
