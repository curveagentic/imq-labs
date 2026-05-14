'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-store';
import { LogoMark } from '@/components/Logo';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await login(email, password);
      router.push('/home');
    } catch (e: any) {
      setErr(e.message || 'Login failed');
    } finally { setBusy(false); }
  }

  function fillDemo(kind: 'artist' | 'fan') {
    setEmail(kind === 'artist' ? 'amaka@afrostream.dev' : 'fan@afrostream.dev');
    setPassword('password123');
  }

  return (
    <div className="pt-2">
      <div className="flex flex-col items-center mb-8">
        <LogoMark size={72} />
        <h1 className="mt-4 text-2xl font-bold text-text">Welcome back</h1>
        <p className="text-text-muted text-sm">Log in to keep creating.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {err && <p className="text-wave-400 text-sm">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</button>
      </form>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button onClick={() => fillDemo('artist')} className="btn-ghost text-xs">Try as Artist</button>
        <button onClick={() => fillDemo('fan')}    className="btn-ghost text-xs">Try as Fan</button>
      </div>

      <p className="mt-6 text-sm text-text-muted text-center">
        New here? <Link className="text-wave-500 font-semibold" href="/register">Create an account</Link>
      </p>
    </div>
  );
}
