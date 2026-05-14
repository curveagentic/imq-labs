'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-store';
import { LogoMark } from '@/components/Logo';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<'artist' | 'fan'>('artist');
  const [form, setForm] = useState({
    email: '', username: '', password: '', full_name: '',
    stage_name: '', country: '',
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      await register({ ...form, role });
      router.push('/home');
    } catch (e: any) {
      setErr(e.body?.error || e.message || 'Registration failed');
    } finally { setBusy(false); }
  }

  return (
    <div className="pt-2">
      <div className="flex flex-col items-center mb-6">
        <LogoMark size={72} />
        <h1 className="mt-4 text-2xl font-bold text-text">Create your account</h1>
        <p className="text-text-muted text-sm">Build your sound. Build your fanbase.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5">
        <button type="button"
          onClick={() => setRole('artist')}
          className={role === 'artist' ? 'btn-primary' : 'btn-outline'}>
          Artist / Producer
        </button>
        <button type="button"
          onClick={() => setRole('fan')}
          className={role === 'fan' ? 'btn-primary' : 'btn-outline'}>
          Fan
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="label">Full name</label>
          <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Username</label>
          <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div>
          <label className="label">Password (min 8 chars)</label>
          <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
        </div>
        {role === 'artist' && (
          <>
            <div>
              <label className="label">Stage name</label>
              <input className="input" value={form.stage_name} onChange={(e) => setForm({ ...form, stage_name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Country</label>
              <input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Nigeria, Ghana, Kenya…" />
            </div>
          </>
        )}
        {err && <p className="text-wave-400 text-sm">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>

      <p className="mt-6 text-sm text-text-muted text-center">
        Have an account? <Link className="text-wave-500 font-semibold" href="/login">Log in</Link>
      </p>
    </div>
  );
}
