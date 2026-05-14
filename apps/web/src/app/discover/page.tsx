'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, type Track, type Collaborator } from '@/lib/api';
import { usePlayer } from '@/lib/player-store';
import { Search, Filter, Play, Verified } from '@/components/Icons';

const TABS = ['For You', 'Artists', 'Producers', 'Beats'] as const;
type Tab = typeof TABS[number];

function fmtCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function DiscoverInner() {
  const [tab, setTab] = useState<Tab>('For You');
  const [q, setQ] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [producers, setProducers] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const player = usePlayer();

  const loadAll = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const [t, a, p] = await Promise.all([
        api.listTracks({ limit: 12, q }),
        api.listArtists(q || undefined),
        api.listCollaborators({ kind: 'producer', q: q || undefined }),
      ]);
      setTracks(t.tracks); setArtists(a.artists); setProducers(p.collaborators);
    } catch (e: any) { setErr(e?.message || 'Could not reach API'); }
    finally { setLoading(false); }
  }, [q]);
  useEffect(() => { loadAll(); }, [loadAll]);

  return (
    <div>
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold">Discover</h1>
      </header>
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
          <input
            className="input pl-10"
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search artists, songs, producers…"
          />
        </div>
        <button className="grid place-items-center w-11 h-11 rounded-xl bg-ink-700 border border-ink-500"><Filter className="text-text-muted" /></button>
      </div>

      <div className="tab-row mb-5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`tab ${tab === t ? 'tab-active' : ''}`}>{t}</button>
        ))}
      </div>

      {(tab === 'For You' || tab === 'Beats') && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Trending Songs</h2>
            <Link href="#" className="text-xs text-wave-500">See all</Link>
          </div>
          <div className="space-y-2">
            {tracks.map((t) => (
              <button
                key={t.id}
                onClick={() => player.play(t, tracks)}
                className="card flex items-center gap-3 p-3 w-full text-left"
              >
                {t.cover_art_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.cover_art_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                ) : <div className="w-12 h-12 rounded-lg bg-ink-500" />}
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-semibold">{t.title}</div>
                  <div className="truncate text-xs text-text-muted">{t.stage_name}</div>
                </div>
                <div className="flex items-center gap-2 text-text-muted">
                  <Play className="w-4 h-4" />
                  <span className="text-xs">{fmtCount(Number(t.stream_count))}</span>
                </div>
              </button>
            ))}
            {loading && tracks.length === 0 && (
              <>
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="card flex items-center gap-3 p-3 animate-pulse">
                    <div className="w-12 h-12 rounded-lg bg-ink-500" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 bg-ink-500 rounded" />
                      <div className="h-2 w-20 bg-ink-500 rounded" />
                    </div>
                  </div>
                ))}
              </>
            )}
            {!loading && tracks.length === 0 && (
              <div className="card text-text-muted text-sm">
                {err ? `Couldn't load tracks: ${err}` : 'No songs match your search.'}
              </div>
            )}
          </div>
        </section>
      )}

      {(tab === 'For You' || tab === 'Artists') && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Top Artists</h2>
            <Link href="#" className="text-xs text-wave-500">See all</Link>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {artists.slice(0, 8).map((a) => (
              <Link key={a.id} href={`/artists/${a.id}`} className="flex flex-col items-center text-center">
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-gold-500/40 bg-ink-500">
                  {a.profile_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.profile_image_url} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="mt-1 text-xs font-semibold truncate w-full flex items-center justify-center gap-1">
                  {a.stage_name}{a.is_verified && <Verified />}
                </div>
                <div className="text-[10px] text-text-muted">{a.country || '—'}</div>
              </Link>
            ))}
            {loading && artists.length === 0 && (
              <>
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 animate-pulse">
                    <div className="w-16 h-16 rounded-full bg-ink-500" />
                    <div className="h-2 w-12 bg-ink-500 rounded" />
                  </div>
                ))}
              </>
            )}
            {!loading && artists.length === 0 && <div className="col-span-4 card text-text-muted text-sm">No artists match.</div>}
          </div>
        </section>
      )}

      {tab === 'Producers' && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Top Producers</h2>
            <Link href="/connect" className="text-xs text-wave-500">Open Connect</Link>
          </div>
          <div className="space-y-2">
            {producers.map((c) => (
              <Link key={c.id} href={`/connect?id=${c.id}`} className="card flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-ink-500 overflow-hidden">
                  {c.profile_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.profile_image_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-semibold">{c.full_name}</div>
                  <div className="text-xs text-text-muted">{c.headline || c.kind}</div>
                </div>
                <span className="pill-gold">★ {Number(c.rating || 0).toFixed(1)}</span>
              </Link>
            ))}
            {loading && producers.length === 0 && (
              <>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="card flex items-center gap-3 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-ink-500" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 bg-ink-500 rounded" />
                      <div className="h-2 w-20 bg-ink-500 rounded" />
                    </div>
                  </div>
                ))}
              </>
            )}
            {!loading && producers.length === 0 && <div className="card text-text-muted text-sm">No producers match.</div>}
          </div>
        </section>
      )}
    </div>
  );
}

export default function DiscoverPage() {
  return <DiscoverInner />;
}
