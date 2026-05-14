'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenHeader';
import { api, type Collaborator } from '@/lib/api';
import { Search, Filter, Star } from '@/components/Icons';

const KINDS = ['all', 'producer', 'artist', 'engineer'] as const;
type Kind = typeof KINDS[number];

function ConnectInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [kind, setKind] = useState<Kind>('all');
  const [q, setQ] = useState('');
  const [list, setList] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [hire, setHire] = useState<Collaborator | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await api.listCollaborators({ kind, q });
      setList(r.collaborators);
    } catch (e: any) { setErr(e?.message || 'Could not reach API'); }
    finally { setLoading(false); }
  }, [kind, q]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = params.get('id');
    if (!id) return;
    const c = list.find((x) => x.id === id);
    if (c) setHire(c);
  }, [params, list]);

  return (
    <div>
      <ScreenHeader title="Connect" subtitle="Find the perfect collaborators" back />

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
          <input className="input pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, skill, location…" />
        </div>
        <button className="grid place-items-center w-11 h-11 rounded-xl bg-ink-700 border border-ink-500"><Filter className="text-text-muted" /></button>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto scroll-x">
        {KINDS.map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`pill ${kind === k ? 'bg-wave-500 text-white border border-wave-500' : 'pill-ghost'}`}
          >
            {k === 'all' ? 'All' : k[0].toUpperCase() + k.slice(1) + 's'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {list.map((c) => (
          <div key={c.id} className="card flex items-center gap-3">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-ink-500">
              {c.profile_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.profile_image_url} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-semibold">{c.full_name}</div>
              <div className="text-xs text-text-muted capitalize">{c.kind}{c.headline ? ' · ' + c.headline : ''}</div>
              <div className="flex items-center gap-2 mt-1">
                <Star className="text-gold-400 w-3 h-3" />
                <span className="text-xs text-gold-400">{Number(c.rating || 0).toFixed(1)} ({c.rating_count})</span>
                <span className="text-xs text-text-muted">· {c.city || c.country || '—'}</span>
              </div>
            </div>
            <button onClick={() => setHire(c)} className="btn-primary px-3 py-1.5 text-sm">Hire</button>
          </div>
        ))}
        {loading && list.length === 0 && (
          <>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card flex items-center gap-3 animate-pulse">
                <div className="w-14 h-14 rounded-full bg-ink-500" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-ink-500 rounded" />
                  <div className="h-2 w-24 bg-ink-500 rounded" />
                  <div className="h-2 w-20 bg-ink-500 rounded" />
                </div>
                <div className="w-16 h-8 rounded-xl bg-ink-500" />
              </div>
            ))}
          </>
        )}
        {!loading && list.length === 0 && <div className="card text-text-muted text-sm">{err ? `Couldn't load: ${err}` : 'No collaborators match.'}</div>}
      </div>

      {hire && <HireSheet c={hire} onClose={(convoId) => {
        setHire(null);
        if (convoId) router.push(`/messages/${convoId}`);
      }} />}
    </div>
  );
}

function HireSheet({ c, onClose }: { c: Collaborator; onClose: (convoId?: string) => void }) {
  const [brief, setBrief] = useState('');
  const [budget, setBudget] = useState<string>('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid items-end" onClick={() => onClose()}>
      <div className="phone-width w-full" onClick={(e) => e.stopPropagation()}>
        <div className="bg-ink-700 rounded-t-3xl p-5 pb-8 animate-slide-up">
          <div className="w-12 h-1 rounded-full bg-ink-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-1">Hire {c.full_name}</h3>
          <p className="text-text-muted text-sm mb-4 capitalize">{c.kind}{c.hourly_rate_usd ? ` · $${c.hourly_rate_usd}/hr` : ''}</p>
          <div className="space-y-3">
            <div>
              <label className="label">Brief</label>
              <textarea className="input min-h-[100px]" value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="What do you need? Genre, deliverables, timing…" />
            </div>
            <div>
              <label className="label">Budget (USD)</label>
              <input className="input" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. 250" />
            </div>
            <button
              disabled={busy}
              onClick={async () => {
                if (brief.length < 5) return alert('Brief is too short');
                setBusy(true);
                try {
                  const r = await api.hire({
                    collaborator_id: c.id, brief,
                    budget_usd: budget ? Number(budget) : undefined,
                  });
                  onClose(r.conversation_id);
                } catch (e: any) { alert(e.message); } finally { setBusy(false); }
              }}
              className="btn-primary w-full"
            >{busy ? 'Sending…' : 'Send hire request'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={<div className="text-text-muted text-sm">Loading…</div>}>
      <ConnectInner />
    </Suspense>
  );
}
