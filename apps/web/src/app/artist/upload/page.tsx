'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGate } from '@/components/AuthGate';
import { ScreenHeader } from '@/components/ScreenHeader';
import { api } from '@/lib/api';

const GENRES = ['Afrobeats', 'Amapiano', 'Highlife', 'Hip-Hop', 'R&B', 'Gospel', 'Reggae', 'Afrohouse', 'Soukous', 'Other'];

function UploadInner() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('Afrobeats');
  const [release, setRelease] = useState('');
  const [audio, setAudio] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!audio) { setErr('Audio file required'); return; }
    if (!title) { setErr('Title required'); return; }
    setBusy(true);
    try {
      const form = new FormData();
      form.set('title', title);
      if (album) form.set('album', album);
      form.set('genre', genre);
      if (release) form.set('release_date', release);
      form.set('audio', audio);
      if (cover) form.set('cover', cover);
      await api.uploadTrack(form);
      router.push('/profile');
    } catch (e: any) {
      setErr(e.body?.error || e.message || 'Upload failed');
    } finally { setBusy(false); }
  }

  return (
    <div>
      <ScreenHeader title="Upload track" subtitle="Publish your music to IMQ Labs" back />
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Song title" />
        </div>
        <div>
          <label className="label">Album (optional)</label>
          <input className="input" value={album} onChange={(e) => setAlbum(e.target.value)} placeholder="Album / EP name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Genre</label>
            <select className="input" value={genre} onChange={(e) => setGenre(e.target.value)}>
              {GENRES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Release date</label>
            <input className="input" type="date" value={release} onChange={(e) => setRelease(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Audio file (MP3 / WAV / FLAC, ≤ 50 MB)</label>
          <input className="input p-2" type="file" accept="audio/*" onChange={(e) => setAudio(e.target.files?.[0] || null)} required />
          {audio && <p className="mt-1 text-xs text-text-muted">{audio.name} · {(audio.size / 1024 / 1024).toFixed(1)} MB</p>}
        </div>
        <div>
          <label className="label">Cover art (optional)</label>
          <input className="input p-2" type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] || null)} />
        </div>
        {err && <p className="text-wave-400 text-sm">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Uploading…' : 'Publish track'}</button>
      </form>
    </div>
  );
}

export default function UploadPage() {
  return <AuthGate requireRole="artist"><UploadInner /></AuthGate>;
}
