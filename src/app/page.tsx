import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07070a] px-6 text-zinc-100">
      <section className="max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.35em] text-pink-400">Musaix Pro v0.1</p>
        <h1 className="mt-4 text-4xl font-bold">Canvas build is locked.</h1>
        <p className="mt-4 text-zinc-400">Reference → Prompt → Project → Export. No agent swarm yet.</p>
        <Link href="/canvas" className="mt-6 inline-flex rounded-xl bg-pink-600 px-5 py-3 text-sm font-semibold text-white hover:bg-pink-500">
          Open Canvas
        </Link>
      </section>
    </main>
  );
}
