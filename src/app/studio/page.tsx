import Link from 'next/link';
import {
  Bell,
  Blocks,
  CircleUserRound,
  Command,
  Disc3,
  HelpCircle,
  Library,
  PanelLeft,
  RadioTower,
  Search,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Wifi,
} from 'lucide-react';

const patches = [
  ['Moody Noir', 'Granular black tape texture', '✦✦✦✦☆'],
  ['Audio Weaver', 'Orion drone processor', '✦✦✦✦☆'],
  ['Synth Enigma', 'Noir pulse arpeggiator', '✦✦✦☆☆'],
  ['Particle Light', 'Airy spectral shimmer', '✦✦✦✦☆'],
  ['Synth Study', 'Warm analog sequence', '✦✦✦✦☆'],
  ['Synth Twerks', 'Low-end motion rack', '✦✦✦☆☆'],
  ['Synth Falmosic', 'Mellow chorus field', '✦✦✦✦☆'],
  ['Synth Sounds', 'Wide cinematic stack', '✦✦✦☆☆'],
  ['Synth Eemk Friss', 'Tape-warped lead', '✦✦✦✦☆'],
];

const navItems = [
  ['Mixer', SlidersHorizontal],
  ['Transport', Disc3],
  ['Library', Library],
  ['Market', ShoppingCart],
  ['Agents', Blocks],
];

const pads = ['TAP', 'SEQ', 'PERC', 'SYNTH', 'FX'];

function VuMeter({ label }: { label: string }) {
  return (
    <div className="relative h-24 overflow-hidden rounded-md border border-[#5b4937] bg-[#f3dfb9] shadow-[inset_0_0_28px_rgba(66,37,9,0.25)]">
      <div className="absolute left-3 top-2 text-[9px] font-black text-[#2d271d]">{label}</div>
      <div className="absolute left-1/2 top-10 -translate-x-1/2 text-sm font-black text-[#4a3521]">VU</div>
      <div className="absolute left-1/2 top-12 h-14 w-32 -translate-x-1/2 rounded-t-full border-t border-dashed border-[#876f4f]" />
      <div className="absolute bottom-8 left-14 h-1 w-20 origin-left rotate-[35deg] rounded-full bg-[#d94e4e] shadow-[0_0_10px_rgba(217,78,78,0.45)]" />
    </div>
  );
}

function Knob({ label, rotate }: { label: string; rotate: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <span className="text-[11px] font-black uppercase tracking-[0.38em] text-[#d99a62]">{label}</span>
      <div className="relative h-28 w-28 rounded-full border border-[#3e3329] bg-[radial-gradient(circle_at_35%_30%,#4b4b4b,#202023_55%,#0c0c0d)] shadow-[0_0_35px_rgba(0,0,0,0.65),inset_0_0_18px_rgba(255,255,255,0.06)]">
        <div className="absolute inset-[-8px] rounded-full border border-dashed border-[#3b342f]" />
        <div className={`absolute left-1/2 top-1/2 h-1 w-10 origin-left rounded-full bg-[#f2a766] shadow-[0_0_12px_rgba(242,167,102,0.55)] ${rotate}`} />
      </div>
    </div>
  );
}

function ParticleCore() {
  return (
    <div className="relative flex min-h-[620px] flex-1 flex-col overflow-hidden rounded-md border border-[#514334] bg-[radial-gradient(circle_at_52%_45%,rgba(104,148,96,0.2),transparent_34%),linear-gradient(180deg,#111110,#050505)] shadow-[inset_0_0_80px_rgba(0,0,0,0.7)]">
      <div className="flex items-center justify-between px-8 pt-8">
        <SlidersHorizontal className="h-5 w-5 text-[#d79b63]" />
        <h2 className="text-2xl font-light uppercase tracking-[0.08em] text-[#c7b2a0]">Audioweaver</h2>
        <div className="flex gap-2 text-sm font-black text-[#e8ad70]">
          <span className="rounded-md border border-[#e8ad70] px-2 py-1">A/A</span>
          <span className="rounded-md border border-[#56493d] px-2 py-1 text-[#685a4f]">B/B</span>
        </div>
      </div>

      <div className="absolute left-1/2 top-[52%] h-[460px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(152,211,129,0.14),rgba(225,197,128,0.08)_36%,transparent_68%)] blur-md" />
      <div className="relative m-auto grid h-[460px] w-[620px] place-items-center">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-dotted border-[#d8cf9a]/60 shadow-[0_0_24px_rgba(176,212,138,0.14)]"
            style={{
              width: `${210 + i * 38}px`,
              height: `${110 + i * 24}px`,
              transform: `rotate(${i * 19}deg) translate(${i % 2 ? 12 : -8}px, ${i % 3 ? 8 : -12}px)`,
            }}
          />
        ))}
        {Array.from({ length: 26 }).map((_, i) => (
          <span
            key={i}
            className="absolute h-2 w-2 rounded-full bg-[#e7d89a] shadow-[0_0_12px_rgba(231,216,154,0.6)]"
            style={{
              left: `${18 + ((i * 23) % 64)}%`,
              top: `${18 + ((i * 31) % 58)}%`,
              opacity: 0.35 + (i % 4) * 0.13,
            }}
          />
        ))}
        <div className="h-72 w-96 rounded-[48%] border border-[#b7d694]/30 bg-[radial-gradient(circle_at_45%_40%,rgba(144,211,129,0.32),transparent_42%)] shadow-[0_0_90px_rgba(139,198,111,0.16)]" />
      </div>
    </div>
  );
}

export default function StudioPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0a] text-[#eee2cd]">
      <div className="flex min-h-screen overflow-hidden border-x border-[#352b23] bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px),radial-gradient(circle_at_top_left,rgba(247,167,93,0.11),transparent_34%),#090909] bg-[length:28px_28px,100%_100%,100%_100%]">
        <aside className="flex w-24 flex-col items-center justify-between border-r border-[#3d3128] bg-[#11100f]/88 py-7">
          <div className="flex flex-col gap-10">
            {navItems.map(([name, Icon]) => (
              <Link key={name as string} href={name === 'Library' ? '/canvas' : '/studio'} className="group flex flex-col items-center gap-2 text-[#c9a98a] hover:text-[#ffbd78]">
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-wider">{name as string}</span>
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-6 text-[#c9a98a]">
            <HelpCircle className="h-5 w-5" />
            <Terminal className="h-5 w-5" />
          </div>
        </aside>

        <section className="flex flex-1 flex-col">
          <header className="flex h-20 items-center justify-between border-b border-[#3d3128] px-9">
            <div className="flex items-baseline gap-7">
              <h1 className="text-5xl font-black uppercase tracking-tight text-[#ffb26f] drop-shadow-[0_0_14px_rgba(255,178,111,0.2)]">Musaix Pro</h1>
              <span className="h-8 border-l border-[#4d3d31]" />
              <p className="text-2xl font-semibold uppercase tracking-[0.32em] text-[#f0a765]">Audioweaver Plugin</p>
            </div>
            <div className="flex items-center gap-6 text-[#c8ad94]">
              <Settings className="h-5 w-5" />
              <PanelLeft className="h-5 w-5" />
              <span className="h-7 border-l border-[#4d3d31]" />
              <Command className="h-8 w-8 rounded-md border border-[#e1a066] p-1 text-[#e1a066]" />
              <Bell className="h-5 w-5" />
              <CircleUserRound className="h-5 w-5" />
            </div>
          </header>

          <div className="grid flex-1 grid-cols-[430px_minmax(480px,1fr)_500px] gap-6 p-5">
            <section className="rounded-md border border-[#514334] bg-[#11100f]/88 p-7 shadow-[inset_0_0_45px_rgba(255,255,255,0.02)]">
              <div className="grid grid-cols-2 gap-5">
                <VuMeter label="L" />
                <VuMeter label="R" />
              </div>
              <h3 className="mt-5 text-center text-sm font-black uppercase text-[#cdb8a1]">Performance Controls</h3>

              <div className="mt-8 grid grid-cols-[96px_1fr] gap-10">
                <div className="flex flex-col gap-4">
                  {pads.map((pad, index) => (
                    <button
                      key={pad}
                      className={`h-24 rounded-md border border-[#ead28f] text-lg font-semibold text-[#20150d] shadow-[0_0_25px_rgba(223,255,135,0.35),inset_0_0_18px_rgba(255,255,255,0.18)] ${
                        index === 2 ? 'bg-[#ffe492]' : 'bg-[#b6ff83]'
                      }`}
                    >
                      {pad}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col items-center justify-between pb-16 pt-6">
                  <Knob label="Volume" rotate="-rotate-[36deg]" />
                  <Knob label="Balance" rotate="rotate-[-90deg]" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 border-t border-[#4a3d31] pt-8 text-center text-[9px] uppercase text-[#8f7b67]">
                <div>MIDI CC<br /><span className="text-[#55483e]">Record</span></div>
                <div>Monitor<br /><span className="text-[#55483e]">Input</span></div>
              </div>

              <div className="mt-16 flex items-center justify-between border-t border-[#4a3d31] pt-7">
                <div className="text-3xl font-black uppercase text-white">Musaix <span className="rounded border border-[#d69357] px-1 text-xs text-[#d69357]">PRO</span></div>
                <Link href="/canvas" className="rounded-md border border-[#5a4738] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#ffb26f] hover:bg-[#ffb26f] hover:text-black">Canvas</Link>
              </div>
            </section>

            <ParticleCore />

            <section className="rounded-md border border-[#514334] bg-[#171514]/92 p-6">
              <h3 className="text-sm font-black uppercase tracking-wide text-[#cdb8a1]">Patch Browser</h3>
              <div className="mt-4 flex items-center gap-3 rounded-md border border-[#2d2927] bg-black/70 px-4 py-3 text-[#706861]">
                <Search className="h-5 w-5" />
                <span>Search...</span>
              </div>
              <div className="mt-4 divide-y divide-[#3c332b] border-y border-[#3c332b]">
                {patches.map(([name, desc, rating], index) => (
                  <button key={name} className="grid w-full grid-cols-[52px_1fr_auto] items-center gap-4 py-3 text-left hover:bg-[#241f1a]">
                    <span className="grid h-12 w-12 place-items-center rounded-md border border-[#322b25] bg-[radial-gradient(circle_at_35%_35%,rgba(158,237,129,0.55),rgba(31,35,30,0.9))] text-[#e9d7a8]">
                      <Sparkles className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-base font-bold text-[#eee2cd]">{name}</span>
                      <span className="text-xs text-[#9c8876]">{desc}</span>
                    </span>
                    <span className="font-black tracking-wider text-[#d59658]">{rating}</span>
                  </button>
                ))}
              </div>
              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between text-xs font-black uppercase text-[#cdb8a1]">
                  <span>Integrations / Linked Agents</span>
                  <span className="flex items-center gap-2 text-[#6fff79]"><RadioTower className="h-4 w-4" /><Wifi className="h-4 w-4" /></span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {['YouTube Music', 'Spotify', 'SoundCloud'].map((service) => (
                    <div key={service} className="rounded-md border border-[#2e2a27] bg-black/60 p-3 text-center text-[10px] font-black uppercase text-white">
                      <div className="mb-2 mx-auto h-7 w-7 rounded bg-white/90" />
                      {service}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <footer className="flex h-8 items-center justify-between border-t border-[#3d3128] px-7 text-[10px] uppercase tracking-widest text-[#6f5f51]">
            <span>Status: <b className="text-[#74ff67]">Connected</b></span>
            <span>Documentation · Privacy Policy · Changelog · © 2026 Musaix Technologies</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
