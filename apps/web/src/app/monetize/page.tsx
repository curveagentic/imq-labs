'use client';
import { useEffect, useState } from 'react';
import { AuthGate } from '@/components/AuthGate';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/lib/auth-store';
import { api, type MonetizeOverview } from '@/lib/api';
import { Dollar, Diamond, Heart, TrendUp } from '@/components/Icons';

function MonetizeInner() {
  const { user } = useAuth();
  const [data, setData] = useState<MonetizeOverview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | 'sale' | 'tier'>(null);

  async function load() {
    try { setData(await api.monetizeOverview()); }
    catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { if (user?.role === 'artist') load(); }, [user]);

  if (user?.role !== 'artist') {
    return (
      <div>
        <ScreenHeader title="Monetize" subtitle="Multiple ways to earn" back />
        <div className="card text-text-muted text-sm">
          Monetize is for artist accounts. Sign up as an Artist / Producer to enable sales, subscriptions, and tips.
        </div>
      </div>
    );
  }

  return (
    <div>
      <ScreenHeader title="Monetize" subtitle="Multiple ways to earn" back />

      <section className="space-y-3 mb-6">
        <button onClick={() => setSheet('sale')} className="card w-full flex items-center gap-3 text-left">
          <div className="grid place-items-center w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/30"><Dollar className="text-gold-400" /></div>
          <div className="flex-1">
            <div className="font-bold text-sm">Sell Your Music</div>
            <div className="text-xs text-text-muted">Upload your tracks and set your price</div>
          </div>
          <span className="text-text-muted">›</span>
        </button>
        <button onClick={() => setSheet('tier')} className="card w-full flex items-center gap-3 text-left">
          <div className="grid place-items-center w-12 h-12 rounded-xl bg-wave-500/10 border border-wave-500/30"><Diamond className="text-wave-500" /></div>
          <div className="flex-1">
            <div className="font-bold text-sm">VIP Fan Subscriptions</div>
            <div className="text-xs text-text-muted">Earn monthly from your biggest supporters</div>
          </div>
          <span className="text-text-muted">›</span>
        </button>
        <div className="card flex items-center gap-3">
          <div className="grid place-items-center w-12 h-12 rounded-xl bg-wave-500/10 border border-wave-500/30"><Heart className="text-wave-500" /></div>
          <div className="flex-1">
            <div className="font-bold text-sm">Tips & Support</div>
            <div className="text-xs text-text-muted">Let fans support you directly</div>
          </div>
          <span className="text-text-muted">on</span>
        </div>
      </section>

      <section className="card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-text-muted">Earnings Overview</div>
            <div className="text-xs text-text-muted">Total Balance</div>
            <div className="text-3xl font-extrabold mt-1">${Number(data?.totals?.total_balance || 0).toFixed(2)}</div>
          </div>
          <SparkChart data={data?.series || []} />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <Stat label="Sales"  value={data?.totals?.sales} />
          <Stat label="Subs"   value={data?.totals?.subscriptions} />
          <Stat label="Tips"   value={data?.totals?.tips} />
        </div>
      </section>

      {data?.recent && data.recent.length > 0 && (
        <section className="mt-6">
          <h2 className="text-base font-semibold mb-3">Recent activity</h2>
          <div className="space-y-2">
            {data.recent.slice(0, 8).map((r) => (
              <div key={r.id} className="card flex items-center gap-3">
                <div className="grid place-items-center w-9 h-9 rounded-lg bg-ink-500 text-text-muted">
                  {r.kind === 'tip' ? <Heart className="w-4 h-4" /> : r.kind === 'sale' ? <Dollar className="w-4 h-4" /> : <Diamond className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm">{r.note || r.kind}</div>
                  <div className="text-xs text-text-muted">{r.fan_name || 'Anon'} · {new Date(r.created_at).toLocaleDateString()}</div>
                </div>
                <div className="text-sm font-bold text-gold-400">+${Number(r.amount_usd).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {err && <p className="mt-4 text-wave-400 text-sm">{err}</p>}

      {sheet && <FormSheet kind={sheet} onClose={() => { setSheet(null); load(); }} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl bg-ink-600 border border-ink-500 p-3">
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="text-base font-bold">${Number(value || 0).toFixed(0)}</div>
    </div>
  );
}

function SparkChart({ data }: { data: { day: string; total: string }[] }) {
  if (!data.length) return (
    <div className="grid place-items-center w-24 h-12 text-gold-400"><TrendUp /></div>
  );
  const values = data.map((d) => Number(d.total));
  const max = Math.max(...values, 1);
  const w = 120, h = 48;
  const step = w / Math.max(values.length - 1, 1);
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} className="text-gold-400">
      <path d={path} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FormSheet({ kind, onClose }: { kind: 'sale' | 'tier'; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid items-end" onClick={onClose}>
      <div className="phone-width w-full" onClick={(e) => e.stopPropagation()}>
        <div className="bg-ink-700 rounded-t-3xl p-5 pb-8 animate-slide-up">
          <div className="w-12 h-1 rounded-full bg-ink-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-3">{kind === 'sale' ? 'Add sale listing' : 'Create subscription tier'}</h3>
          <div className="space-y-3">
            <div>
              <label className="label">{kind === 'sale' ? 'Title' : 'Tier name'}</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'sale' ? 'Beat pack vol. 1' : 'VIP Insider'} />
            </div>
            <div>
              <label className="label">Price (USD)</label>
              <input className="input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="9.99" />
            </div>
            <div>
              <label className="label">{kind === 'sale' ? 'Description' : 'Perks'}</label>
              <textarea className="input min-h-[80px]" value={body} onChange={(e) => setBody(e.target.value)} placeholder={kind === 'sale' ? 'What\'s included…' : 'Early access, behind the scenes, monthly stems…'} />
            </div>
            <button
              disabled={busy}
              className="btn-primary w-full"
              onClick={async () => {
                if (!title || !price) return alert('Title and price required');
                setBusy(true);
                try {
                  if (kind === 'sale') await api.createSale({ title, price_usd: Number(price), description: body });
                  else await api.createTier({ name: title, price_usd: Number(price), perks: body });
                  onClose();
                } catch (e: any) { alert(e.message); } finally { setBusy(false); }
              }}
            >{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MonetizePage() {
  return <AuthGate><MonetizeInner /></AuthGate>;
}
