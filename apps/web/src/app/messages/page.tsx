'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuthGate } from '@/components/AuthGate';
import { api, type Conversation } from '@/lib/api';
import { Search, Edit } from '@/components/Icons';

const TABS = ['All', 'Unread', 'Mentions'] as const;

function MessagesInner() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [tab, setTab] = useState<typeof TABS[number]>('All');
  const [q, setQ] = useState('');

  useEffect(() => {
    api.conversations().then((r) => setConversations(r.conversations)).catch(() => {});
  }, []);

  const filtered = conversations.filter((c) => {
    if (tab === 'Unread' && !c.unread_count) return false;
    if (q && !c.other_name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <header className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold">Messages</h1>
        <button className="text-text-muted p-1"><Edit /></button>
      </header>

      <div className="flex items-center mb-4 relative">
        <Search className="absolute left-3 text-text-muted w-5 h-5" />
        <input className="input pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations" />
      </div>

      <div className="flex gap-2 mb-5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pill ${tab === t ? 'bg-wave-500 text-white border border-wave-500' : 'pill-ghost'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((c) => (
          <Link key={c.id} href={`/messages/${c.id}`} className="card flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-ink-500">
              {c.other_avatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.other_avatar} alt="" className="w-full h-full object-cover" />
              )}
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-ink-700 bg-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="truncate text-sm font-semibold">{c.other_name}</div>
                <div className="text-[10px] text-text-muted ml-2">{c.last_at ? timeAgo(c.last_at) : ''}</div>
              </div>
              <div className="truncate text-xs text-text-muted">{c.last_body || 'Say hi 👋'}</div>
            </div>
            {c.unread_count > 0 && (
              <span className="grid place-items-center min-w-[20px] h-5 px-1.5 rounded-full bg-wave-500 text-white text-[10px] font-bold">
                {c.unread_count}
              </span>
            )}
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="card text-text-muted text-sm">No conversations yet — hire a collaborator from <Link className="text-wave-500" href="/connect">Connect</Link>.</div>
        )}
      </div>
    </div>
  );
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function MessagesPage() {
  return <AuthGate><MessagesInner /></AuthGate>;
}
