'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AuthGate } from '@/components/AuthGate';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/lib/auth-store';
import { api, type Creation } from '@/lib/api';
import { Mic, Music, Pencil, Globe, Play, MoreVertical, Send, Diamond, Heart, Dollar } from '@/components/Icons';

type ToolId = 'voice_idea' | 'beat' | 'lyrics' | 'translation' | 'cover' | 'scene' | 'master';

const TOOLS: { id: ToolId; title: string; subtitle: string; Icon: any; accent?: 'gold' | 'red' }[] = [
  { id: 'voice_idea',  title: 'Record Voice Idea', subtitle: 'Capture your next hit',          Icon: Mic },
  { id: 'beat',        title: 'Generate Beat',     subtitle: 'AI music in seconds',           Icon: Music },
  { id: 'lyrics',      title: 'Write Lyrics',      subtitle: 'AI-generate full song lyrics',  Icon: Pencil },
  { id: 'translation', title: 'Translate Song',    subtitle: 'Translate worldwide',           Icon: Globe },
  { id: 'cover',       title: 'Album Cover',       subtitle: 'AI cover art for your release', Icon: Diamond, accent: 'gold' },
  { id: 'scene',       title: 'Music Video Scene', subtitle: 'Cinematic video clip',          Icon: Play,    accent: 'gold' },
  { id: 'master',      title: 'AI Mastering',      subtitle: 'Loudness + polish your audio',  Icon: Heart,   accent: 'gold' },
];

function CreateInner() {
  const { user } = useAuth();
  const [recent, setRecent] = useState<Creation[]>([]);
  const [tool, setTool] = useState<ToolId | null>(null);

  async function refresh() {
    try { const r = await api.recentCreations(); setRecent(r.creations); } catch {}
  }
  useEffect(() => { refresh(); }, []);

  return (
    <div>
      <ScreenHeader title="Create" subtitle="Turn your ideas into hit records" right={<span className="pill-gold">Pro</span>} back />

      <section className="grid grid-cols-2 gap-3">
        {TOOLS.map((t) => {
          const Icon = t.Icon;
          const ring = t.accent === 'gold'
            ? 'bg-gold-500/10 border border-gold-500/30 text-gold-400'
            : 'bg-wave-500/10 border border-wave-500/30 text-wave-500';
          return (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className="card text-left flex flex-col gap-3 hover:border-wave-500/40 transition"
            >
              <div className={`grid place-items-center w-11 h-11 rounded-xl ${ring}`}>
                <Icon />
              </div>
              <div>
                <div className="font-bold text-sm leading-tight">{t.title}</div>
                <div className="text-xs text-text-muted mt-1">{t.subtitle}</div>
              </div>
            </button>
          );
        })}
      </section>

      {user?.role === 'artist' && (
        <section className="mt-4">
          <Link href="/artist/upload" className="card flex items-center gap-3 hover:border-gold-500/40 transition">
            <div className="grid place-items-center w-11 h-11 rounded-xl bg-gold-500/10 border border-gold-500/30">
              <Send className="text-gold-400" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm leading-tight">Publish Track</div>
              <div className="text-xs text-text-muted mt-1">Upload a finished song with cover art</div>
            </div>
            <span className="text-text-muted">›</span>
          </Link>
        </section>
      )}

      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Recent Creations</h2>
          <span className="text-xs text-text-muted">{recent.length}</span>
        </div>
        {recent.length === 0 ? (
          <div className="card text-text-muted text-sm">Nothing yet. Try a tool above.</div>
        ) : (
          <div className="space-y-2">
            {recent.map((c) => <CreationRow key={c.id} c={c} onChange={refresh} />)}
          </div>
        )}
      </section>

      {tool && <ToolSheet id={tool} onClose={() => { setTool(null); refresh(); }} />}
    </div>
  );
}

function CreationRow({ c, onChange }: { c: Creation; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const isImage = c.kind === 'cover' && c.cover_url;
  const isAudio = (c.kind === 'beat' || c.kind === 'voice_idea' || c.kind === 'mastering') && c.audio_url;
  const isVideo = c.kind === 'scene' && c.audio_url;

  return (
    <div className="card p-3">
      <div className="flex items-center gap-3">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.cover_url || ''} alt="" className="w-12 h-12 rounded-lg object-cover" />
        ) : (
          <div className="grid place-items-center w-12 h-12 rounded-lg bg-gradient-to-br from-ink-500 to-ink-700 text-text-muted">
            {c.kind === 'voice_idea' ? <Mic /> : c.kind === 'beat' ? <Music /> : c.kind === 'lyrics' ? <Pencil /> : c.kind === 'translation' ? <Globe /> : c.kind === 'scene' ? <Play /> : c.kind === 'mastering' ? <Heart /> : <Dollar />}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm font-semibold">{c.title}</div>
          <div className="text-xs text-text-muted capitalize">
            {c.kind.replace('_', ' ')}
            {c.status === 'processing' && <span className="ml-2 text-wave-500">· processing…</span>}
            {c.status === 'failed' && <span className="ml-2 text-wave-500">· failed</span>}
          </div>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="text-text-muted p-1"><MoreVertical /></button>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t border-ink-500 space-y-2">
          {isImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.cover_url || ''} alt="" className="w-full rounded-xl" />
          )}
          {isAudio && <audio src={c.audio_url || ''} controls className="w-full" preload="metadata" />}
          {isVideo && <video src={c.audio_url || ''} controls className="w-full rounded-xl" preload="metadata" />}
          {c.body && <pre className="text-xs whitespace-pre-wrap text-text-muted max-h-72 overflow-auto p-2 bg-ink-800 rounded-lg">{c.body}</pre>}
          {c.prompt && <details className="text-xs"><summary className="text-text-muted cursor-pointer">Prompt</summary><pre className="mt-1 whitespace-pre-wrap text-text-muted">{c.prompt}</pre></details>}
          <div className="flex justify-end">
            <button onClick={async () => { await api.deleteCreation(c.id); onChange(); }} className="text-xs text-wave-500">Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolSheet({ id, onClose }: { id: ToolId; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid items-end" onClick={onClose}>
      <div className="phone-width w-full" onClick={(e) => e.stopPropagation()}>
        <div className="bg-ink-700 rounded-t-3xl p-5 pb-8 animate-slide-up max-h-[90vh] overflow-y-auto">
          <div className="w-12 h-1 rounded-full bg-ink-400 mx-auto mb-4" />
          {id === 'voice_idea'  && <VoiceIdeaForm onClose={onClose} />}
          {id === 'beat'        && <BeatForm onClose={onClose} />}
          {id === 'lyrics'      && <LyricsForm onClose={onClose} />}
          {id === 'translation' && <TranslateForm onClose={onClose} />}
          {id === 'cover'       && <CoverForm onClose={onClose} />}
          {id === 'scene'       && <SceneForm onClose={onClose} />}
          {id === 'master'      && <MasterForm onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

function VoiceIdeaForm({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) { alert('Microphone not available'); return; }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (e) => chunksRef.current.push(e.data);
    rec.onstop = () => {
      const b = new Blob(chunksRef.current, { type: 'audio/webm' });
      setBlob(b);
      stream.getTracks().forEach((t) => t.stop());
    };
    rec.start();
    recRef.current = rec;
    setRecording(true);
  }
  function stop() { recRef.current?.stop(); setRecording(false); }

  async function save() {
    if (!blob) return alert('Record audio first');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('audio', new File([blob], 'voice.webm', { type: 'audio/webm' }));
      fd.append('title', title || `Voice idea ${new Date().toLocaleString()}`);
      fd.append('note', note);
      await api.voiceIdea(fd);
      onClose();
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Record voice idea</h3>
      <div>
        <label className="label">Title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled" />
      </div>
      <div>
        <label className="label">Note</label>
        <textarea className="input min-h-[80px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Hook idea, key, BPM…" />
      </div>
      <div className="flex flex-col items-center gap-3">
        {!recording && !blob && <button onClick={start} className="btn-primary w-full">Start recording</button>}
        {recording && <button onClick={stop} className="btn-outline w-full">Stop</button>}
        {blob && (
          <>
            <audio controls src={URL.createObjectURL(blob)} className="w-full" />
            <div className="grid grid-cols-2 gap-2 w-full">
              <button onClick={() => setBlob(null)} className="btn-ghost">Re-record</button>
              <button onClick={save} disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save idea'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BeatForm({ onClose }: { onClose: () => void }) {
  const [bpm, setBpm] = useState(110);
  const [genre, setGenre] = useState('Afrobeats');
  const [mood, setMood] = useState('');
  const [bars, setBars] = useState(8);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Generate beat</h3>
      <p className="text-xs text-text-muted -mt-3">Real music generation via Stable Audio. Takes ~30 seconds.</p>
      <div>
        <label className="label">Genre</label>
        <select className="input" value={genre} onChange={(e) => setGenre(e.target.value)}>
          {['Afrobeats','Amapiano','Highlife','Afrohouse','Hip-Hop','R&B','Drill','Trap','House'].map((g) => <option key={g}>{g}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">BPM</label>
          <input className="input" type="number" min={60} max={200} value={bpm} onChange={(e) => setBpm(+e.target.value)} />
        </div>
        <div>
          <label className="label">Bars</label>
          <input className="input" type="number" min={4} max={32} value={bars} onChange={(e) => setBars(+e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Mood</label>
        <input className="input" value={mood} onChange={(e) => setMood(e.target.value)} placeholder="dark, hard, bouncy…" />
      </div>
      <button
        onClick={async () => {
          setBusy(true);
          try { await api.generateBeat({ bpm, genre, mood, bars }); onClose(); }
          catch (e: any) { alert(e.message); } finally { setBusy(false); }
        }}
        disabled={busy}
        className="btn-primary w-full"
      >{busy ? 'Generating beat… (~30s)' : 'Generate beat'}</button>
    </div>
  );
}

function LyricsForm({ onClose }: { onClose: () => void }) {
  const [topic, setTopic] = useState('');
  const [vibe, setVibe] = useState('modern Afrobeats');
  const [language, setLanguage] = useState('English');
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Write lyrics</h3>
      <p className="text-xs text-text-muted -mt-3">Claude Sonnet 4.6 writes a full song — verses, chorus, bridge.</p>
      <div>
        <label className="label">Topic / hook</label>
        <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Late-night drives, lost love, money moves…" />
      </div>
      <div>
        <label className="label">Vibe</label>
        <input className="input" value={vibe} onChange={(e) => setVibe(e.target.value)} />
      </div>
      <div>
        <label className="label">Language</label>
        <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
          {['English','Yoruba','Igbo','Pidgin','Twi','Swahili','Zulu','Xhosa','French','Portuguese','Spanish','Arabic'].map((l) => <option key={l}>{l}</option>)}
        </select>
      </div>
      <button
        onClick={async () => {
          if (!topic) return alert('Add a topic');
          setBusy(true);
          try { await api.writeLyrics({ topic, vibe, language }); onClose(); }
          catch (e: any) { alert(e.message); } finally { setBusy(false); }
        }}
        disabled={busy}
        className="btn-primary w-full"
      >{busy ? 'Writing…' : 'Write lyrics'}</button>
    </div>
  );
}

function TranslateForm({ onClose }: { onClose: () => void }) {
  const [src, setSrc] = useState('');
  const [target, setTarget] = useState('Yoruba');
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Translate song</h3>
      <p className="text-xs text-text-muted -mt-3">Preserves rhyme, syllable count, and cultural idioms.</p>
      <div>
        <label className="label">Lyrics</label>
        <textarea className="input min-h-[140px]" value={src} onChange={(e) => setSrc(e.target.value)} placeholder="Paste your lyrics here…" />
      </div>
      <div>
        <label className="label">Target language</label>
        <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
          {['Yoruba','Igbo','Pidgin','Twi','Swahili','Zulu','Xhosa','French','Portuguese','English','Spanish','Arabic'].map((l) => <option key={l}>{l}</option>)}
        </select>
      </div>
      <button
        onClick={async () => {
          if (!src) return alert('Paste lyrics');
          setBusy(true);
          try { await api.translate({ source_text: src, target_language: target }); onClose(); }
          catch (e: any) { alert(e.message); } finally { setBusy(false); }
        }}
        disabled={busy}
        className="btn-primary w-full"
      >{busy ? 'Translating…' : 'Translate'}</button>
    </div>
  );
}

function CoverForm({ onClose }: { onClose: () => void }) {
  const [intent, setIntent] = useState('');
  const [trackTitle, setTrackTitle] = useState('');
  const [genre, setGenre] = useState('Afrobeats');
  const [mood, setMood] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Album cover</h3>
      <p className="text-xs text-text-muted -mt-3">Claude expands your intent into an art brief, then FLUX paints it. ~20s.</p>
      <div>
        <label className="label">Concept</label>
        <textarea className="input min-h-[80px]" value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="Lagos at night, neon, a lone figure walking, cinematic" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Track</label>
          <input className="input" value={trackTitle} onChange={(e) => setTrackTitle(e.target.value)} placeholder="(optional)" />
        </div>
        <div>
          <label className="label">Genre</label>
          <select className="input" value={genre} onChange={(e) => setGenre(e.target.value)}>
            {['Afrobeats','Amapiano','Highlife','Afrohouse','Hip-Hop','R&B','Drill','Gospel','Jazz','House'].map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Mood (optional)</label>
        <input className="input" value={mood} onChange={(e) => setMood(e.target.value)} placeholder="dark, romantic, gritty…" />
      </div>
      <button
        onClick={async () => {
          if (!intent) return alert('Describe the concept');
          setBusy(true);
          try { await api.generateCover({ intent, track_title: trackTitle, genre, mood }); onClose(); }
          catch (e: any) { alert(e.message); } finally { setBusy(false); }
        }}
        disabled={busy}
        className="btn-primary w-full"
      >{busy ? 'Painting cover… (~20s)' : 'Generate cover'}</button>
    </div>
  );
}

function SceneForm({ onClose }: { onClose: () => void }) {
  const [intent, setIntent] = useState('');
  const [aspect, setAspect] = useState<'9:16'|'16:9'|'1:1'>('9:16');
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Music video scene</h3>
      <p className="text-xs text-text-muted -mt-3">Cinematic short clip via LTX-Video. ~60s.</p>
      <div>
        <label className="label">Scene description</label>
        <textarea className="input min-h-[100px]" value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="Slow tracking shot of a Lagos rooftop at sunset, dancer in white, neon city below, golden lens flare" />
      </div>
      <div>
        <label className="label">Aspect</label>
        <div className="grid grid-cols-3 gap-2">
          {(['9:16','16:9','1:1'] as const).map((a) => (
            <button key={a} type="button" onClick={() => setAspect(a)} className={aspect === a ? 'btn-primary' : 'btn-outline'}>{a}</button>
          ))}
        </div>
      </div>
      <button
        onClick={async () => {
          if (!intent) return alert('Describe the scene');
          setBusy(true);
          try { await api.generateScene({ intent, aspect_ratio: aspect }); onClose(); }
          catch (e: any) { alert(e.message); } finally { setBusy(false); }
        }}
        disabled={busy}
        className="btn-primary w-full"
      >{busy ? 'Rendering scene… (up to 60s)' : 'Generate scene'}</button>
    </div>
  );
}

function MasterForm({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">AI mastering</h3>
      <p className="text-xs text-text-muted -mt-3">Two-pass EBU R128 loudness norm + soft limiter. Streaming-ready output.</p>
      <div>
        <label className="label">Title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mastered track" />
      </div>
      <div>
        <label className="label">Audio file (MP3/WAV/FLAC)</label>
        <input className="input p-2" type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        {file && <p className="mt-1 text-xs text-text-muted">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>}
      </div>
      <button
        onClick={async () => {
          if (!file) return alert('Upload an audio file');
          setBusy(true);
          try {
            const fd = new FormData();
            fd.append('audio', file);
            fd.append('title', title || `Mastered ${file.name}`);
            await api.masterAudio(fd);
            onClose();
          } catch (e: any) { alert(e.message); } finally { setBusy(false); }
        }}
        disabled={busy}
        className="btn-primary w-full"
      >{busy ? 'Mastering…' : 'Master my track'}</button>
    </div>
  );
}

export default function CreatePage() {
  return <AuthGate><CreateInner /></AuthGate>;
}
