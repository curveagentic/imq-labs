'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { LogoMark } from './Logo';

/**
 * Synchronous-first auth guard.
 *
 * - On mount, check localStorage immediately (no waiting on /me).
 * - If there's no token, render a friendly sign-in CTA — never a blank screen.
 * - If there is a token, render children optimistically and hydrate in the
 *   background; a stale token simply logs the user out.
 */
export function AuthGate({ children, requireRole }: { children: React.ReactNode; requireRole?: 'artist' | 'fan' }) {
  const { user, hydrate } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<'init' | 'no-token' | 'token'>('init');

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('afrostream_token') : null;
    if (!t) { setState('no-token'); return; }
    setState('token');
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (state === 'token' && user && requireRole && user.role !== requireRole) {
      router.replace('/home');
    }
  }, [state, user, router, requireRole]);

  if (state === 'init') {
    return <SignInCard pending />;
  }
  if (state === 'no-token') {
    return <SignInCard />;
  }
  if (requireRole && user && user.role !== requireRole) {
    return (
      <div className="card text-text-muted text-sm">
        This screen is for {requireRole} accounts.
        <Link href="/home" className="ml-1 text-wave-500 font-semibold">Back to home</Link>
      </div>
    );
  }
  return <>{children}</>;
}

function SignInCard({ pending = false }: { pending?: boolean }) {
  return (
    <div className="flex flex-col items-center text-center pt-16">
      <LogoMark size={88} />
      <h2 className="mt-4 text-2xl font-extrabold">Sign in to continue</h2>
      <p className="mt-2 text-sm text-text-muted max-w-xs">
        This screen needs an account. Log in or create one — it is free and unlocks Create, Connect, and Monetize.
      </p>
      <div className="mt-6 w-full space-y-2">
        <Link href="/login" className="btn-primary w-full">Log in</Link>
        <Link href="/register" className="btn-outline w-full">Create an account</Link>
        <Link href="/discover" className="btn-ghost w-full">Browse as a guest</Link>
      </div>
      {pending && <p className="mt-4 text-[10px] uppercase tracking-wider text-text-dim">Checking session…</p>}
    </div>
  );
}
