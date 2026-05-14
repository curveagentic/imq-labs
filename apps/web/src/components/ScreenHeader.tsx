'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from './Icons';

export function ScreenHeader({
  title, right, back = false, subtitle,
}: { title: string; right?: React.ReactNode; back?: boolean; subtitle?: string }) {
  const router = useRouter();
  return (
    <header className="flex items-center mb-5">
      {back ? (
        <button onClick={() => router.back()} className="p-1 -ml-1 text-text-muted hover:text-text">
          <ChevronLeft />
        </button>
      ) : <div className="w-7" />}
      <div className="flex-1 text-center">
        <h1 className="text-xl font-bold text-text">{title}</h1>
        {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="w-7 flex justify-end">{right}</div>
    </header>
  );
}
