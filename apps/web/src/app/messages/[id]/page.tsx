'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { AuthGate } from '@/components/AuthGate';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/lib/auth-store';
import { api, type Message } from '@/lib/api';
import { Send } from '@/components/Icons';

function ThreadInner() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try { const r = await api.conversation(id); setMsgs(r.messages); }
    catch {}
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { ref.current?.scrollTo({ top: 99999, behavior: 'smooth' }); }, [msgs]);

  const otherName = msgs.find((m) => m.sender_user_id !== user?.id)?.full_name || 'Conversation';

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      <ScreenHeader title={otherName} back />
      <div ref={ref} className="flex-1 overflow-y-auto space-y-2 pb-3">
        {msgs.map((m) => {
          const mine = m.sender_user_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm ${mine ? 'bg-wave-500 text-white rounded-br-md' : 'bg-ink-600 text-text rounded-bl-md'}`}>
                {m.body.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                <div className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-text-muted'}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        {msgs.length === 0 && <div className="text-text-muted text-sm text-center mt-10">No messages yet — say hi 👋</div>}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!draft.trim() || busy) return;
          setBusy(true);
          try {
            const r = await api.sendMessage(id, draft.trim());
            setMsgs((m) => [...m, { ...r.message, full_name: user?.full_name }]);
            setDraft('');
          } catch (e: any) { alert(e.message); } finally { setBusy(false); }
        }}
        className="flex items-center gap-2 pt-2"
      >
        <input className="input flex-1" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message…" />
        <button className="grid place-items-center w-11 h-11 rounded-xl bg-wave-500 text-white"><Send /></button>
      </form>
    </div>
  );
}

export default function ThreadPage() {
  return <AuthGate><ThreadInner /></AuthGate>;
}
