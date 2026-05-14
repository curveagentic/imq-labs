'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';

/**
 * Decorative rails shown only on >=lg screens so the phone-frame doesn't sit
 * alone in a black void. Hidden on tablet/mobile.
 */
export function DesktopRails() {
  const pathname = usePathname() || '/';
  const isAuth = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register');
  const [stats, setStats] = useState<{ artists: number; tracks: number; collaborators: number; users: number; earnings_total_usd: string } | null>(null);
  useEffect(() => { api.stats().then(setStats).catch(() => {}); }, []);

  const fmtMoney = (n: string | number) => '$' + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <>
      <aside className="hidden lg:flex fixed left-6 top-6 bottom-6 w-[26vw] max-w-md flex-col justify-between pointer-events-none z-0 pl-2">
        <div>
          <div className="flex items-center gap-2 text-2xl font-black tracking-tighter">
            <span>IMQ</span><span className="text-wave-500 text-sm tracking-[0.25em] uppercase">Labs</span>
          </div>
          <p className="mt-1 text-xs tracking-[0.3em] text-gold-400 font-medium">
            CREATE · CONNECT · GET PAID
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-3xl font-extrabold leading-tight">
              The AI music studio<br />
              for <span className="text-wave-500">African artists</span>.
            </h2>
            <p className="mt-3 text-sm text-text-muted max-w-sm">
              Record voice ideas. Generate beats. Write lyrics in any language.
              Hire producers and engineers. Sell music. Earn from fans.
              All from one app — built for the diaspora.
            </p>
          </div>

          <ul className="grid grid-cols-2 gap-2 text-xs text-text-muted">
            <li className="card !p-3"><span className="text-wave-500 font-bold">●</span> AI Beat Lab</li>
            <li className="card !p-3"><span className="text-wave-500 font-bold">●</span> Lyrics & Translation</li>
            <li className="card !p-3"><span className="text-gold-400 font-bold">●</span> Hire collaborators</li>
            <li className="card !p-3"><span className="text-gold-400 font-bold">●</span> Tips & VIP subs</li>
          </ul>
        </div>

        <p className="text-[10px] uppercase tracking-[0.3em] text-text-dim">
          {isAuth ? 'Try as Artist · amaka@afrostream.dev · password123' : '© IMQ Labs — Built for African sound.'}
        </p>
      </aside>

      <aside className="hidden lg:flex fixed right-6 top-6 bottom-6 w-[26vw] max-w-md flex-col justify-between pointer-events-none z-0 pr-2 text-right">
        <div className="self-end">
          <span className="pill-gold">Live demo</span>
        </div>

        <div className="space-y-3 self-end">
          <div className="card !p-4 max-w-xs">
            <div className="text-[10px] uppercase tracking-wider text-text-muted">Platform stats</div>
            <div className="mt-2 grid grid-cols-4 gap-3 text-left">
              <div>
                <div className="text-base font-bold">{stats?.artists ?? '—'}</div>
                <div className="text-[10px] text-text-muted">Artists</div>
              </div>
              <div>
                <div className="text-base font-bold">{stats?.tracks ?? '—'}</div>
                <div className="text-[10px] text-text-muted">Tracks</div>
              </div>
              <div>
                <div className="text-base font-bold">{stats?.collaborators ?? '—'}</div>
                <div className="text-[10px] text-text-muted">Collabs</div>
              </div>
              <div>
                <div className="text-base font-bold">{stats?.users ?? '—'}</div>
                <div className="text-[10px] text-text-muted">Users</div>
              </div>
            </div>
          </div>
          <div className="card !p-4 max-w-xs text-left">
            <div className="text-[10px] uppercase tracking-wider text-text-muted">Earnings paid through</div>
            <div className="mt-1 text-xl font-extrabold">{stats ? fmtMoney(stats.earnings_total_usd) : '—'}</div>
            <div className="text-[10px] text-text-muted">sales · subs · tips · all-time</div>
          </div>
        </div>

        <p className="text-[10px] uppercase tracking-[0.3em] text-text-dim self-end">
          Tap a phone screen →
        </p>
      </aside>
    </>
  );
}
