'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenHeader';
import { api, type Track } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { usePlayer } from '@/lib/player-store';
import { Verified, Play, Heart, Diamond, Dollar, Send } from '@/components/Icons';

interface StoreData { tiers: any[]; sales: any[] }
type Tab = 'Music' | 'Beats' | 'VIP' | 'About';

export default function ArtistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const player = usePlayer();
  const [data, setData] = useState<{ artist: any; tracks: Track[]; following: boolean } | null>(null);
  const [store, setStore] = useState<StoreData | null>(null);
  const [tab, setTab] = useState<Tab>('Music');
  const [tipOpen, setTipOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [a, s] = await Promise.all([
      api.getArtist(id),
      api.monetizeForArtist(id),
    ]);
    setData(a);
    setStore(s);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function toggleFollow() {
    if (!data) return;
    if (!user) { window.location.href = '/login'; return; }
    if (data.following) await api.unfollowArtist(data.artist.id);
    else await api.followArtist(data.artist.id);
    load();
  }

  async function buy(listingId: string) {
    if (!user) { window.location.href = '/login'; return; }
    setBusy(listingId);
    try {
      await api.buy(listingId);
      setToast('Purchase recorded — funds sent to the artist.');
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) { alert(e.message); } finally { setBusy(null); }
  }

  async function subscribe(tierId: string) {
    if (!user) { window.location.href = '/login'; return; }
    setBusy(tierId);
    try {
      await api.subscribe(tierId);
      setToast('Subscribed — welcome to the inner circle.');
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) { alert(e.message); } finally { setBusy(null); }
  }

  if (!data) {
    return (
      <div>
        <ScreenHeader title="Artist" back />
        <div className="relative -mx-5 mb-4 h-32 bg-ink-700 animate-pulse" />
        <div className="flex items-end gap-3 -mt-16 mb-4 px-1">
          <div className="w-24 h-24 rounded-full bg-ink-500 border-4 border-ink-900 animate-pulse" />
          <div className="flex-1 space-y-2 pb-1">
            <div className="h-5 w-32 bg-ink-500 rounded animate-pulse" />
            <div className="h-3 w-24 bg-ink-500 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[1,2,3,4].map((i) => <div key={i} className="h-10 bg-ink-500 rounded-xl animate-pulse" />)}
        </div>
        <div className="space-y-2">
          {[1,2,3].map((i) => (
            <div key={i} className="card flex items-center gap-3 animate-pulse">
              <div className="w-12 h-12 rounded-lg bg-ink-500" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 bg-ink-500 rounded" />
                <div className="h-2 w-20 bg-ink-500 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  const a = data.artist;

  return (
    <div>
      <ScreenHeader title={a.stage_name} back />

      {/* Cover banner */}
      <div className="relative -mx-5 mb-4 h-32 bg-gradient-to-br from-wave-500/30 via-ink-700 to-gold-500/20 overflow-hidden">
        {a.profile_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.profile_image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm scale-110" />
        )}
      </div>

      <div className="flex items-end gap-3 -mt-16 mb-4 px-1">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-ink-900 bg-ink-500 shadow-lg">
          {a.profile_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.profile_image_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex-1 min-w-0 pb-1">
          <h1 className="text-xl font-extrabold flex items-center gap-1">
            {a.stage_name}{a.is_verified && <Verified />}
          </h1>
          <p className="text-xs text-text-muted">{a.country}{a.genres?.length ? ' · ' + a.genres.join(', ') : ''}</p>
        </div>
      </div>

      {a.bio && <p className="text-sm text-text-muted mb-4">{a.bio}</p>}

      <div className="grid grid-cols-4 gap-2 mb-5">
        <button onClick={toggleFollow} className={data.following ? 'btn-ghost' : 'btn-primary'}>
          {data.following ? 'Following' : 'Follow'}
        </button>
        <Link
          href={user ? `/messages` : `/login`}
          onClick={async (e) => {
            if (!user) return;
            e.preventDefault();
            try {
              const r = await api.startConversation(a.user_id, `Hey ${a.stage_name} — love your sound 🔥`);
              window.location.href = `/messages/${r.conversation_id}`;
            } catch { window.location.href = '/messages'; }
          }}
          className="btn-ghost"
        >Message</Link>
        <button onClick={() => user ? setTipOpen(true) : (window.location.href = '/login')} className="btn-gold flex items-center justify-center gap-1">
          <Heart className="w-4 h-4" /> Tip
        </button>
        <button className="btn-ghost" aria-label="Share"><Send className="w-4 h-4" /></button>
      </div>

      <div className="tab-row mb-4">
        {(['Music','Beats','VIP','About'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`tab ${tab === t ? 'tab-active' : ''}`}>{t}</button>
        ))}
      </div>

      {tab === 'Music' && (
        <div className="space-y-2">
          {data.tracks.length === 0 ? (
            <div className="card text-text-muted text-sm">No tracks released yet.</div>
          ) : data.tracks.map((t) => (
            <button
              key={t.id}
              onClick={() => player.play({ ...t, stage_name: a.stage_name }, data.tracks.map((tt) => ({ ...tt, stage_name: a.stage_name })))}
              className="card flex items-center gap-3 w-full text-left"
            >
              {t.cover_art_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.cover_art_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
              ) : <div className="w-12 h-12 rounded-lg bg-ink-500" />}
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-semibold">{t.title}</div>
                <div className="text-xs text-text-muted">{t.album || t.genre} · {Math.floor(Number(t.duration_seconds) / 60)}:{String(Number(t.duration_seconds) % 60).padStart(2,'0')}</div>
              </div>
              <Play className="text-text-muted" />
            </button>
          ))}
        </div>
      )}

      {tab === 'Beats' && (
        <div className="space-y-2">
          {!store?.sales?.length ? (
            <div className="card text-text-muted text-sm">No beats or stems for sale yet.</div>
          ) : store.sales.map((s) => (
            <div key={s.id} className="card flex items-center gap-3">
              <div className="grid place-items-center w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/30">
                <Dollar className="text-gold-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-semibold">{s.title}</div>
                <div className="text-xs text-text-muted">{s.description || 'Royalty-free · 24-bit WAV'}</div>
              </div>
              <button onClick={() => buy(s.id)} disabled={busy === s.id} className="btn-gold !py-1.5 !px-3 text-sm">
                {busy === s.id ? '…' : `$${Number(s.price_usd).toFixed(0)}`}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'VIP' && (
        <div className="space-y-2">
          {!store?.tiers?.length ? (
            <div className="card text-text-muted text-sm">No subscription tiers yet.</div>
          ) : store.tiers.map((t) => (
            <div key={t.id} className="card">
              <div className="flex items-center gap-2 mb-1">
                <Diamond className="text-wave-500 w-4 h-4" />
                <div className="font-bold">{t.name}</div>
              </div>
              <div className="text-xs text-text-muted mb-3">{t.perks}</div>
              <button onClick={() => subscribe(t.id)} disabled={busy === t.id} className="btn-primary w-full">
                {busy === t.id ? 'Subscribing…' : `Subscribe · $${Number(t.price_usd).toFixed(2)}/mo`}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'About' && (
        <div className="card space-y-3">
          {a.bio && (
            <div>
              <div className="text-xs uppercase tracking-wider text-text-muted mb-1">Bio</div>
              <div className="text-sm">{a.bio}</div>
            </div>
          )}
          <div>
            <div className="text-xs uppercase tracking-wider text-text-muted mb-1">From</div>
            <div className="text-sm">{a.country || '—'}</div>
          </div>
          {a.genres?.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-text-muted mb-1">Genres</div>
              <div className="flex flex-wrap gap-1.5">
                {a.genres.map((g: string) => <span key={g} className="pill-ghost">{g}</span>)}
              </div>
            </div>
          )}
          <div className="pt-2 border-t border-ink-500/50">
            <div className="text-xs uppercase tracking-wider text-text-muted mb-1">Released</div>
            <div className="text-sm">{data.tracks.length} live track{data.tracks.length === 1 ? '' : 's'} on IMQ Labs</div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 bg-gold-500 text-ink-900 px-4 py-2 rounded-xl font-semibold shadow-fab animate-slide-up">
          {toast}
        </div>
      )}

      {tipOpen && <TipSheet artistId={a.id} onClose={() => setTipOpen(false)} onDone={() => { setTipOpen(false); setToast('Thanks for the tip 💛'); setTimeout(() => setToast(null), 3000); }} />}
    </div>
  );
}

function TipSheet({ artistId, onClose, onDone }: { artistId: string; onClose: () => void; onDone: () => void }) {
  const [amt, setAmt] = useState(5);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid items-end" onClick={onClose}>
      <div className="phone-width w-full" onClick={(e) => e.stopPropagation()}>
        <div className="bg-ink-700 rounded-t-3xl p-5 pb-8 animate-slide-up">
          <div className="w-12 h-1 rounded-full bg-ink-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-3">Send a tip</h3>
          <div className="flex gap-2 mb-3">
            {[1, 5, 10, 25].map((n) => (
              <button key={n} onClick={() => setAmt(n)} className={amt === n ? 'btn-primary flex-1' : 'btn-outline flex-1'}>${n}</button>
            ))}
          </div>
          <input className="input mb-3" type="number" min={1} value={amt} onChange={(e) => setAmt(Number(e.target.value))} />
          <input className="input mb-4" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />
          <button
            disabled={busy}
            className="btn-primary w-full"
            onClick={async () => {
              setBusy(true);
              try { await api.tip({ artist_id: artistId, amount_usd: amt, note }); onDone(); }
              catch (e: any) { alert(e.message); } finally { setBusy(false); }
            }}
          >{busy ? 'Sending…' : `Tip $${amt}`}</button>
        </div>
      </div>
    </div>
  );
}
