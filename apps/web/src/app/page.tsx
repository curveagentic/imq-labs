'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, type Track } from '@/lib/api';
import { LogoMark } from '@/components/Logo';
import {
  Mic, Music, Pencil, Globe, Users, Dollar, Heart, Diamond,
  Play, Verified, ChevronRight, Star, TrendUp,
} from '@/components/Icons';

interface Stats { users: number; artists: number; tracks: number; collaborators: number; conversations: number; earnings_total_usd: string }
interface ArtistRow { id: string; stage_name: string; country?: string; genres?: string[]; profile_image_url?: string; is_verified?: boolean }

const PILLARS = [
  { Icon: Mic,    title: 'Create',   pitch: 'Record voice ideas. Generate beats with AI. Write lyrics in any African language. Translate hits across the diaspora.', href: '/create' },
  { Icon: Users,  title: 'Connect',  pitch: 'Hire producers, engineers, songwriters, and feature artists. Direct-message any collaborator. Build your team.', href: '/connect' },
  { Icon: Dollar, title: 'Get Paid', pitch: 'Sell beats and stems. Open VIP fan tiers. Accept tips. Cash out — keep the bulk of every dollar your fans send.', href: '/monetize' },
];

const TOOLS = [
  { Icon: Mic,    title: 'Voice Ideas',  body: 'Record hooks and verses with one tap. Save, tag, and revisit later.' },
  { Icon: Music,  title: 'AI Beat Lab',  body: 'Generate Afrobeats, Amapiano, Drill, R&B beats. Pick BPM, mood, bar count.' },
  { Icon: Pencil, title: 'Lyric Writer', body: 'AI-generate or co-write verses, hooks, and bridges. Multi-language ready.' },
  { Icon: Globe,  title: 'Translator',   body: 'Translate songs into Yoruba, Pidgin, Twi, Swahili, Zulu, French, Portuguese.' },
  { Icon: Diamond,title: 'VIP Subscriptions', body: 'Tiered monthly access for super-fans. Early drops, stems, listening parties.' },
  { Icon: Heart,  title: 'Direct Tips',  body: 'Fans send tips track-side or from your profile. Funds settle to your wallet.' },
];

export default function Landing() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [artists, setArtists] = useState<ArtistRow[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);

  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
    api.listArtists().then((r) => setArtists(r.artists)).catch(() => {});
    api.listTracks({ limit: 6 }).then((r) => setTracks(r.tracks)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      <TopNav />
      <Hero />
      <Pillars />
      <Showcase tracks={tracks} artists={artists} />
      <StatBar stats={stats} />
      <FeaturedArtists artists={artists} />
      <Tools />
      <FinalCTA />
      <Footer />
    </div>
  );
}

function TopNav() {
  return (
    <nav className="sticky top-0 z-50 bg-ink-900/80 backdrop-blur-md border-b border-ink-500/50">
      <div className="max-w-7xl mx-auto px-5 lg:px-10 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tighter">
          <LogoMark size={32} /><span>IMQ</span><span className="text-wave-500 text-sm tracking-[0.25em] uppercase">Labs</span>
        </Link>
        <div className="hidden md:flex items-center gap-7 text-sm">
          <a href="#create"   className="text-text-muted hover:text-text">Create</a>
          <a href="#connect"  className="text-text-muted hover:text-text">Connect</a>
          <a href="#monetize" className="text-text-muted hover:text-text">Get Paid</a>
          <a href="#artists"  className="text-text-muted hover:text-text">Artists</a>
          <Link href="/discover" className="text-text-muted hover:text-text">Discover</Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="text-sm text-text-muted hover:text-text px-3 py-2">Log in</Link>
          <Link href="/register" className="btn-primary !py-2 !px-4 text-sm">Sign up free</Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            'radial-gradient(40rem 30rem at 80% 0%, rgba(255,26,46,0.30), transparent 60%),' +
            'radial-gradient(30rem 30rem at 10% 90%, rgba(212,168,72,0.18), transparent 60%)',
        }}
      />
      <div className="max-w-7xl mx-auto px-5 lg:px-10 pt-12 pb-16 md:pt-20 md:pb-28 grid lg:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <span className="pill-gold inline-flex items-center gap-1">
            <Star className="w-3 h-3" /> Now open to African artists worldwide
          </span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]">
            The AI music studio for{' '}
            <span className="text-wave-500">African artists</span>.
          </h1>
          <p className="text-lg text-text-muted max-w-xl">
            Make beats. Write lyrics in any language. Find producers and engineers worldwide.
            Sell music, take subscriptions, accept tips — and keep the bulk of what your fans send.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/register" className="btn-primary !px-6 !py-3 text-base">Start free — it takes 30 seconds</Link>
            <Link href="/discover" className="btn-outline !px-6 !py-3 text-base">Listen to the catalogue</Link>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <div className="flex -space-x-2">
              {['amaka','kojo','zola','tunde','sade_b'].map((s) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={s} src={`https://picsum.photos/seed/${s}/64/64`} alt="" className="w-8 h-8 rounded-full border-2 border-ink-900 object-cover" />
              ))}
            </div>
            <span>Joined this week — Amaka, Kojo M, Zola N, Tunde B…</span>
          </div>
        </div>

        <div className="relative">
          <PhoneMock screen="home" />
        </div>
      </div>
    </section>
  );
}

function PhoneMock({ screen, scale = 1, rotate = 0, label }: { screen: 'home' | 'create' | 'discover' | 'connect' | 'monetize' | 'messages' | 'profile'; scale?: number; rotate?: number; label?: string }) {
  return (
    <div
      className="relative mx-auto rounded-[36px] border border-ink-500 bg-ink-900 shadow-2xl overflow-hidden"
      style={{
        width: 280 * scale,
        height: 580 * scale,
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        boxShadow: '0 30px 60px -20px rgba(255, 26, 46, 0.3), 0 0 0 1px rgba(255,255,255,0.04)',
      }}
    >
      <div className="absolute top-0 inset-x-0 h-7 bg-ink-900 flex items-center justify-between px-5 text-[10px] text-text-muted">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <span>●●●●</span><span>5G</span><span>●</span>
        </div>
      </div>
      <div className="absolute inset-x-0 top-7 bottom-0 overflow-hidden">
        <ScreenSnapshot screen={screen} />
      </div>
      {label && (
        <div className="absolute bottom-3 inset-x-0 text-center text-[10px] text-text-muted uppercase tracking-wider">{label}</div>
      )}
    </div>
  );
}

function ScreenSnapshot({ screen }: { screen: 'home' | 'create' | 'discover' | 'connect' | 'monetize' | 'messages' | 'profile' }) {
  if (screen === 'home') return (
    <div className="p-4 space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-full bg-ink-500" />
        <Bell />
      </div>
      <div>
        <div className="text-text-muted text-[10px]">Good morning,</div>
        <div className="text-xl font-extrabold">Amaka 👋</div>
      </div>
      <div className="bg-gradient-to-br from-wave-500 to-wave-700 rounded-2xl p-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="text-white font-bold text-sm">Create</div>
          <div className="text-white/80 text-[10px]">Start a new song</div>
        </div>
        <div className="w-9 h-9 rounded-lg bg-white/20 grid place-items-center"><Mic className="text-white w-4 h-4" /></div>
      </div>
      <div className="card !p-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="font-bold text-sm">Connect</div>
          <div className="text-text-muted text-[10px]">Find collaborators</div>
        </div>
        <div className="w-9 h-9 rounded-lg bg-ink-600 grid place-items-center"><Users className="text-text-muted w-4 h-4" /></div>
      </div>
      <div className="card !p-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="font-bold text-sm">Monetize</div>
          <div className="text-text-muted text-[10px]">Sell music · earn from fans</div>
        </div>
        <div className="w-9 h-9 rounded-lg bg-gold-500/15 grid place-items-center"><Dollar className="text-gold-400 w-4 h-4" /></div>
      </div>
    </div>
  );
  if (screen === 'create') return (
    <div className="p-4 space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-text-muted">‹</span>
        <div className="font-bold text-sm">Create</div>
        <span className="pill-gold !py-0.5 !px-2 text-[9px]">Pro</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { I: Mic,    t: 'Voice Idea' },
          { I: Music,  t: 'Beat' },
          { I: Pencil, t: 'Lyrics' },
          { I: Globe,  t: 'Translate' },
        ].map(({ I, t }) => (
          <div key={t} className="card !p-3">
            <div className="w-8 h-8 rounded-lg bg-wave-500/10 border border-wave-500/30 grid place-items-center mb-2">
              <I className="text-wave-500 w-4 h-4" />
            </div>
            <div className="font-bold text-[10px]">{t}</div>
          </div>
        ))}
      </div>
    </div>
  );
  if (screen === 'discover') return (
    <div className="p-4 space-y-3 text-xs">
      <div className="font-bold text-base">Discover</div>
      <div className="flex gap-2">
        <div className="bg-wave-500 text-white pill !py-1 !px-2 text-[10px]">For You</div>
        <div className="pill-ghost !py-1 !px-2 text-[10px]">Artists</div>
        <div className="pill-ghost !py-1 !px-2 text-[10px]">Beats</div>
      </div>
      <div className="text-[10px] font-semibold">Trending Songs</div>
      {['Lagos Lights','Sun Dance','Maboneng Nights'].map((t, i) => (
        <div key={t} className="card !p-2 flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-ink-500" />
          <div className="flex-1">
            <div className="font-semibold text-[10px]">{t}</div>
            <div className="text-text-muted text-[9px]">{['Amaka','Kojo M','Zola N'][i]}</div>
          </div>
          <Play className="text-text-muted w-3 h-3" />
        </div>
      ))}
    </div>
  );
  if (screen === 'connect') return (
    <div className="p-4 space-y-3 text-xs">
      <div className="font-bold text-sm">Connect</div>
      <div className="flex gap-1">
        {['All','Producers','Engineers'].map((p) => <div key={p} className="pill-ghost !py-0.5 !px-2 text-[9px]">{p}</div>)}
      </div>
      {[{ n: 'Young D', k: 'Producer · Lagos', r: 4.8 }, { n: 'BeatzbyJay', k: 'Producer · Accra', r: 4.9 }, { n: 'MixMaster', k: 'Engineer · LA', r: 4.7 }].map((c) => (
        <div key={c.n} className="card !p-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-ink-500" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[10px] truncate">{c.n}</div>
            <div className="text-text-muted text-[9px] truncate">{c.k}</div>
          </div>
          <div className="bg-wave-500 text-white text-[9px] px-2 py-0.5 rounded">Hire</div>
        </div>
      ))}
    </div>
  );
  if (screen === 'monetize') return (
    <div className="p-4 space-y-3 text-xs">
      <div className="font-bold text-sm">Monetize</div>
      {[{ I: Dollar, t: 'Sell Your Music', c: 'gold' }, { I: Diamond, t: 'VIP Fan Subs', c: 'wave' }, { I: Heart, t: 'Tips & Support', c: 'wave' }].map(({ I, t, c }) => (
        <div key={t} className="card !p-2 flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg ${c === 'gold' ? 'bg-gold-500/15 border border-gold-500/30' : 'bg-wave-500/15 border border-wave-500/30'} grid place-items-center`}>
            <I className={c === 'gold' ? 'text-gold-400 w-3 h-3' : 'text-wave-500 w-3 h-3'} />
          </div>
          <div className="text-[10px] font-bold flex-1">{t}</div>
        </div>
      ))}
      <div className="card !p-3">
        <div className="text-[9px] text-text-muted">Total Balance</div>
        <div className="text-lg font-extrabold">$3,240.00</div>
        <TrendUp className="text-gold-400 w-16 h-6 mt-1" />
      </div>
    </div>
  );
  if (screen === 'messages') return (
    <div className="p-4 space-y-2 text-xs">
      <div className="font-bold text-sm">Messages</div>
      <div className="flex gap-1">
        <div className="bg-wave-500 text-white pill !py-0.5 !px-2 text-[9px]">All</div>
        <div className="pill-ghost !py-0.5 !px-2 text-[9px]">Unread</div>
      </div>
      {[{ n: 'Young D', m: 'Yo, sending the beat', t: '2m', u: 1 }, { n: 'BeatzbyJay', m: 'Stems ready ✅', t: '1h', u: 0 }, { n: 'Demo Fan', m: 'Mad love 🔥', t: '3h', u: 2 }].map((c) => (
        <div key={c.n} className="card !p-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-ink-500" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[10px]">{c.n}</span>
              <span className="text-text-muted text-[9px]">{c.t}</span>
            </div>
            <div className="text-text-muted text-[9px] truncate">{c.m}</div>
          </div>
          {c.u > 0 && <div className="bg-wave-500 text-white text-[9px] rounded-full px-1.5">{c.u}</div>}
        </div>
      ))}
    </div>
  );
  if (screen === 'profile') return (
    <div className="p-4 space-y-3 text-xs">
      <div className="flex items-center justify-around">
        <div className="text-center"><div className="text-base font-extrabold">128</div><div className="text-text-muted text-[9px]">Following</div></div>
        <div className="w-16 h-16 rounded-full bg-ink-500 border-2 border-gold-500" />
        <div className="text-center"><div className="text-base font-extrabold">10.2K</div><div className="text-text-muted text-[9px]">Followers</div></div>
      </div>
      <div className="text-center">
        <div className="font-extrabold text-sm flex items-center justify-center gap-1">Amaka <Verified /></div>
        <div className="text-[10px] text-text-muted">Artist · Producer</div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <div className="btn-primary !py-1 text-[10px]">Follow</div>
        <div className="btn-ghost !py-1 text-[10px]">Message</div>
        <div className="btn-ghost !py-1 text-[10px]">Tip</div>
      </div>
      <div className="border-b border-ink-500"><span className="inline-block pb-2 text-[10px] text-wave-500 border-b-2 border-wave-500">Music</span></div>
      <div className="card !p-2 flex items-center gap-2">
        <div className="w-7 h-7 rounded bg-ink-500" />
        <div className="flex-1 text-[10px] font-semibold">Lagos Lights</div>
        <Play className="text-text-muted w-3 h-3" />
      </div>
    </div>
  );
  return null;
}

function Bell() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="text-text-muted">
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Pillars() {
  return (
    <section id="pillars" className="max-w-7xl mx-auto px-5 lg:px-10 py-16">
      <div className="grid md:grid-cols-3 gap-4">
        {PILLARS.map((p, i) => {
          const Icon = p.Icon;
          return (
            <Link key={p.title} id={p.title.toLowerCase().replace(' ','-')} href={p.href} className="card group hover:border-wave-500/40 transition">
              <div className={`grid place-items-center w-12 h-12 rounded-2xl mb-4 ${i === 2 ? 'bg-gold-500/10 border border-gold-500/30' : 'bg-wave-500/10 border border-wave-500/30'}`}>
                <Icon className={i === 2 ? 'text-gold-400' : 'text-wave-500'} />
              </div>
              <h3 className="text-xl font-extrabold mb-2">{p.title}</h3>
              <p className="text-sm text-text-muted">{p.pitch}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm text-wave-500 font-semibold opacity-0 group-hover:opacity-100 transition">
                Open <ChevronRight className="w-4 h-4" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function Showcase({ tracks, artists }: { tracks: Track[]; artists: ArtistRow[] }) {
  return (
    <section className="py-20 border-y border-ink-500/40 bg-ink-800/40">
      <div className="max-w-7xl mx-auto px-5 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight">A studio that lives in your pocket.</h2>
          <p className="mt-3 text-text-muted">Every screen does one thing well. Designed for thumb-first creators, not desktop suits.</p>
        </div>

        {/* 7-phone showcase on desktop, scrollable on mobile */}
        <div className="hidden lg:grid grid-cols-4 gap-4 items-end">
          <PhoneMock screen="home"     scale={0.78} label="Home" />
          <PhoneMock screen="create"   scale={0.78} label="Create" />
          <PhoneMock screen="discover" scale={0.78} label="Discover" />
          <PhoneMock screen="connect"  scale={0.78} label="Connect" />
        </div>
        <div className="hidden lg:grid grid-cols-3 gap-4 items-start mt-6 max-w-4xl mx-auto">
          <PhoneMock screen="monetize" scale={0.78} label="Monetize" />
          <PhoneMock screen="messages" scale={0.78} label="Messages" />
          <PhoneMock screen="profile"  scale={0.78} label="Profile" />
        </div>

        {/* Mobile: horizontal carousel */}
        <div className="lg:hidden flex gap-4 overflow-x-auto -mx-5 px-5 pb-4 snap-x">
          {(['home','create','discover','connect','monetize','messages','profile'] as const).map((s) => (
            <div key={s} className="flex-shrink-0 snap-center">
              <PhoneMock screen={s} scale={0.7} label={s} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatBar({ stats }: { stats: Stats | null }) {
  const items = [
    { label: 'Artists',       value: stats?.artists ?? '—' },
    { label: 'Tracks',        value: stats?.tracks  ?? '—' },
    { label: 'Collaborators', value: stats?.collaborators ?? '—' },
    { label: 'Paid out',      value: stats ? '$' + Number(stats.earnings_total_usd).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—' },
  ];
  return (
    <section className="max-w-7xl mx-auto px-5 lg:px-10 py-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((s) => (
          <div key={s.label} className="card text-center !py-5">
            <div className="text-3xl md:text-4xl font-black text-wave-500">{s.value}</div>
            <div className="text-[11px] uppercase tracking-widest text-text-muted mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedArtists({ artists }: { artists: ArtistRow[] }) {
  return (
    <section id="artists" className="max-w-7xl mx-auto px-5 lg:px-10 py-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight">Made in Africa.</h2>
          <p className="mt-2 text-text-muted">From Lagos to Accra to Cape Town to Cairo. Real artists already shipping on IMQ Labs.</p>
        </div>
        <Link href="/discover" className="hidden md:inline text-sm text-wave-500 font-semibold">See the full roster →</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {artists.slice(0, 12).map((a) => (
          <Link key={a.id} href={`/artists/${a.id}`} className="card !p-4 hover:border-wave-500/40 transition text-center">
            <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-gold-500/40 bg-ink-500">
              {a.profile_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.profile_image_url} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="mt-3 font-bold text-sm flex items-center justify-center gap-1">
              {a.stage_name}{a.is_verified && <Verified />}
            </div>
            <div className="text-[10px] text-text-muted">{a.country}</div>
            {a.genres?.[0] && <div className="mt-1 pill-ghost !py-0.5 !px-2 text-[9px] inline-flex">{a.genres[0]}</div>}
          </Link>
        ))}
      </div>
    </section>
  );
}

function Tools() {
  return (
    <section className="max-w-7xl mx-auto px-5 lg:px-10 py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl md:text-5xl font-black tracking-tight">Six tools. One app.</h2>
        <p className="mt-3 text-text-muted">No more switching between five different platforms to release one song.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {TOOLS.map((t) => {
          const Icon = t.Icon;
          return (
            <div key={t.title} className="card">
              <div className="w-11 h-11 rounded-xl bg-wave-500/10 border border-wave-500/30 grid place-items-center mb-3">
                <Icon className="text-wave-500" />
              </div>
              <h3 className="font-bold text-lg mb-1">{t.title}</h3>
              <p className="text-sm text-text-muted">{t.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative overflow-hidden border-y border-ink-500/40">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(40rem 30rem at 50% 50%, rgba(255,26,46,0.18), transparent 60%)',
        }}
      />
      <div className="max-w-3xl mx-auto px-5 lg:px-10 py-20 text-center space-y-6">
        <h2 className="text-4xl md:text-6xl font-black tracking-tight">Your next hit. Your way.</h2>
        <p className="text-lg text-text-muted">
          Sign up free. Make a beat in 60 seconds. Open your fan store. Get paid by your second day.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/register" className="btn-primary !px-6 !py-3 text-base">Start free</Link>
          <Link href="/login" className="btn-outline !px-6 !py-3 text-base">I already have an account</Link>
        </div>
        <p className="text-xs text-text-dim">No credit card. Cancel anytime. Built for the African diaspora.</p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="max-w-7xl mx-auto px-5 lg:px-10 py-10 text-sm text-text-muted">
      <div className="grid md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 text-lg font-black tracking-tighter mb-2">
            <LogoMark size={24} /><span>IMQ</span><span className="text-wave-500 text-xs tracking-[0.25em] uppercase">Labs</span>
          </div>
          <p className="text-xs text-text-dim max-w-xs">
            The AI-native music studio built for African artists worldwide.
          </p>
        </div>
        <div>
          <div className="text-text font-semibold mb-2">App</div>
          <ul className="space-y-1 text-xs">
            <li><Link href="/discover" className="hover:text-text">Discover</Link></li>
            <li><Link href="/connect"  className="hover:text-text">Connect</Link></li>
            <li><Link href="/create"   className="hover:text-text">Create</Link></li>
            <li><Link href="/monetize" className="hover:text-text">Monetize</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-text font-semibold mb-2">Account</div>
          <ul className="space-y-1 text-xs">
            <li><Link href="/register" className="hover:text-text">Sign up</Link></li>
            <li><Link href="/login"    className="hover:text-text">Log in</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-text font-semibold mb-2">Built for</div>
          <ul className="space-y-1 text-xs">
            <li>Nigeria · Ghana · Kenya</li>
            <li>South Africa · Senegal</li>
            <li>Egypt · Ethiopia · UK · US</li>
          </ul>
        </div>
      </div>
      <div className="mt-10 pt-6 border-t border-ink-500/40 text-xs text-text-dim flex items-center justify-between">
        <span>© IMQ Labs · Made for African sound.</span>
        <span>CREATE · CONNECT · GET PAID</span>
      </div>
    </footer>
  );
}
