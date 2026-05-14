'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuthGate } from '@/components/AuthGate';
import { useAuth } from '@/lib/auth-store';
import { api, type Track } from '@/lib/api';
import { usePlayer } from '@/lib/player-store';
import { Verified, MoreVertical, Send, Play } from '@/components/Icons';

const TABS = ['Music', 'Videos', 'About'] as const;

function ProfileInner() {
  const { user, artist, logout } = useAuth();
  const player = usePlayer();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [followers, setFollowers] = useState<number>(0);
  const [following, setFollowing] = useState<number>(0);
  const [tab, setTab] = useState<typeof TABS[number]>('Music');

  useEffect(() => {
    if (!user) return;
    if (artist?.id) {
      api.getArtist(artist.id).then((r) => {
        setTracks(r.tracks);
      }).catch(() => {});
    }
    // simple counts via list endpoints (real app would aggregate server-side)
    api.listArtists().then((r) => setFollowing(r.artists.length)).catch(() => {});
  }, [user, artist]);

  return (
    <div>
      <header className="flex items-center justify-between mb-3">
        <button onClick={logout} className="text-text-muted text-xs">Log out</button>
        <button className="text-text-muted p-1"><MoreVertical /></button>
      </header>

      <div className="flex items-center justify-around mb-4">
        <div className="text-center">
          <div className="text-xl font-extrabold">{following}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider">Following</div>
        </div>
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-ink-500 border-2 border-gold-500 overflow-hidden">
            {user?.profile_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.profile_image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-2xl font-bold text-text-muted">
                {(user?.full_name || '?').slice(0, 1)}
              </div>
            )}
          </div>
          {user?.is_verified && <span className="absolute bottom-0 right-0"><Verified /></span>}
        </div>
        <div className="text-center">
          <div className="text-xl font-extrabold">{followers}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider">Followers</div>
        </div>
      </div>

      <div className="text-center mb-4">
        <h1 className="text-xl font-extrabold flex items-center justify-center gap-1">
          {artist?.stage_name || user?.full_name}{user?.is_verified && <Verified />}
        </h1>
        <p className="text-xs text-text-muted">
          {user?.role === 'artist' ? `Artist · Producer` : 'Fan'}
        </p>
        {user?.bio && <p className="mt-2 text-sm text-text-muted">{user.bio}</p>}
        {artist?.country && <p className="mt-1 text-xs text-text-muted">📍 {artist.country}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5">
        <button className="btn-primary col-span-1">Follow</button>
        <Link href="/messages" className="btn-ghost col-span-1">Message</Link>
        <button className="btn-ghost col-span-1"><Send /></button>
      </div>

      <div className="tab-row mb-4">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`tab ${tab === t ? 'tab-active' : ''}`}>{t}</button>
        ))}
      </div>

      {tab === 'Music' && (
        <div className="space-y-2">
          {tracks.map((t) => (
            <button
              key={t.id}
              onClick={() => player.play(t, tracks)}
              className="card flex items-center gap-3 w-full text-left"
            >
              {t.cover_art_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.cover_art_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
              ) : <div className="w-12 h-12 rounded-lg bg-ink-500" />}
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-semibold">{t.title}</div>
                <div className="text-xs text-text-muted">{Math.floor(Number(t.duration_seconds) / 60)}:{String(Number(t.duration_seconds) % 60).padStart(2,'0')}</div>
              </div>
              <Play className="text-text-muted" />
            </button>
          ))}
          {tracks.length === 0 && <div className="card text-text-muted text-sm">No tracks yet.</div>}
        </div>
      )}

      {tab === 'Videos' && (
        <div className="card text-text-muted text-sm">No videos uploaded yet. Generate one in <Link href="/create" className="text-wave-500">Create</Link>.</div>
      )}

      {tab === 'About' && (
        <div className="card space-y-2">
          <div><span className="text-text-muted text-xs">Email </span><span className="text-sm">{user?.email}</span></div>
          <div><span className="text-text-muted text-xs">Username </span><span className="text-sm">@{user?.username}</span></div>
          {artist?.country && <div><span className="text-text-muted text-xs">Country </span><span className="text-sm">{artist.country}</span></div>}
          {artist?.genres && <div><span className="text-text-muted text-xs">Genres </span><span className="text-sm">{artist.genres.join(', ')}</span></div>}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return <AuthGate><ProfileInner /></AuthGate>;
}
