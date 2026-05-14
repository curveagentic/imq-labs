'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuthGate } from '@/components/AuthGate';
import { useAuth } from '@/lib/auth-store';
import { api, type Creation } from '@/lib/api';
import { Bell, Mic, Users, Dollar, MoreVertical, Play } from '@/components/Icons';

function HomeInner() {
  const { user, artist } = useAuth();
  const [recent, setRecent] = useState<Creation[]>([]);

  useEffect(() => {
    api.recentCreations().then((r) => setRecent(r.creations.slice(0, 5))).catch(() => {});
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/profile" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-ink-500 grid place-items-center text-text-muted overflow-hidden">
            {user?.profile_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.profile_image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold">{(user?.full_name || '?').slice(0, 1)}</span>
            )}
          </div>
        </Link>
        <button className="relative p-2 text-text-muted">
          <Bell />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-wave-500" />
        </button>
      </header>

      <section>
        <p className="text-text-muted text-sm">{greeting},</p>
        <h1 className="text-3xl font-extrabold text-text">
          {(artist?.stage_name || user?.full_name || 'Friend').split(' ')[0]} <span className="ml-1">👋</span>
        </h1>
        <p className="text-text-muted text-sm mt-1">What do you want to do today?</p>
      </section>

      <section className="space-y-3">
        <Link href="/create" className="block">
          <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-wave-500 to-wave-700 p-4 shadow-fab">
            <div className="flex-1">
              <div className="text-white font-bold text-lg">Create</div>
              <div className="text-white/80 text-sm">Start a new song · Bring your ideas to life</div>
            </div>
            <div className="grid place-items-center w-12 h-12 rounded-xl bg-white/15">
              <Mic className="text-white" />
            </div>
          </div>
        </Link>

        <Link href="/connect" className="block">
          <div className="flex items-center gap-4 card">
            <div className="flex-1">
              <div className="text-text font-bold text-lg">Connect</div>
              <div className="text-text-muted text-sm">Find collaborators · Grow your network</div>
            </div>
            <div className="grid place-items-center w-12 h-12 rounded-xl bg-ink-600 border border-ink-500">
              <Users className="text-text-muted" />
            </div>
          </div>
        </Link>

        <Link href="/monetize" className="block">
          <div className="flex items-center gap-4 card">
            <div className="flex-1">
              <div className="text-text font-bold text-lg">Monetize</div>
              <div className="text-text-muted text-sm">Sell your music & earn from your fans</div>
            </div>
            <div className="grid place-items-center w-12 h-12 rounded-xl bg-gold-500/15 border border-gold-500/30">
              <Dollar className="text-gold-400" />
            </div>
          </div>
        </Link>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Recent Projects</h2>
          <Link href="/create" className="text-xs text-wave-500 font-medium">See all</Link>
        </div>
        {recent.length === 0 ? (
          <div className="card text-text-muted text-sm">
            No projects yet — tap <span className="text-wave-500">Create</span> to start your first one.
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((c) => (
              <Link key={c.id} href={`/create?open=${c.id}`} className="card flex items-center gap-3 p-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-ink-500 to-ink-700 grid place-items-center text-text-muted">
                  {c.kind === 'voice_idea' ? <Mic /> : c.kind === 'beat' ? <Play /> : <span className="text-xs uppercase">{c.kind[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-semibold text-sm">{c.title}</div>
                  <div className="text-xs text-text-muted capitalize">{c.kind.replace('_', ' ')} · {new Date(c.created_at).toLocaleDateString()}</div>
                </div>
                <button className="text-text-muted p-1"><MoreVertical /></button>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function HomePage() {
  return <AuthGate><HomeInner /></AuthGate>;
}
