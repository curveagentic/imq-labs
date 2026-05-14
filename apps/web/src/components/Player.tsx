'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { usePlayer } from '@/lib/player-store';
import { Play, Pause, ChevronLeft, ChevronRight } from './Icons';

function fmt(s: number) {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${r}`;
}

export function Player() {
  const pathname = usePathname() || '/';
  const { current, isPlaying, currentTime, duration, togglePlay, next, prev, setTime, reportStream } = usePlayer();
  const audio = useRef<HTMLAudioElement | null>(null);
  const reported = useRef<string | null>(null);

  useEffect(() => {
    const el = audio.current;
    if (!el || !current) return;
    if (el.dataset.src !== current.audio_file_url) {
      el.src = current.audio_file_url;
      el.dataset.src = current.audio_file_url;
      reported.current = null;
    }
    if (isPlaying) el.play().catch(() => {});
    else el.pause();
  }, [current, isPlaying]);

  const hideOnAuth = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register');
  if (!current || hideOnAuth) return null;

  return (
    <div
      className="fixed inset-x-0 z-50 pointer-events-none"
      style={{ bottom: 'calc(64px + var(--safe-bottom))' }}
    >
      <div className="phone-width pointer-events-auto px-3">
        <div className="bg-ink-600 border border-ink-500 rounded-2xl shadow-card flex items-center gap-3 p-2.5">
          {current.cover_art_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.cover_art_url} alt="" className="w-11 h-11 rounded-lg object-cover" />
          ) : (
            <div className="w-11 h-11 rounded-lg bg-ink-500" />
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-text">{current.title}</div>
            <div className="truncate text-xs text-text-muted">{current.stage_name || 'Unknown artist'} · {fmt(currentTime)} / {fmt(duration)}</div>
          </div>
          <button onClick={prev} className="text-text-muted hover:text-text p-1" aria-label="prev"><ChevronLeft /></button>
          <button onClick={togglePlay} className="grid place-items-center w-10 h-10 rounded-full bg-wave-500 text-white" aria-label="play">
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button onClick={next} className="text-text-muted hover:text-text p-1" aria-label="next"><ChevronRight /></button>
        </div>
      </div>
      <audio
        ref={audio}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime, e.currentTarget.duration || 0)}
        onLoadedMetadata={(e) => setTime(0, e.currentTarget.duration || 0)}
        onEnded={() => { reportStream(); next(); }}
        onPause={() => {
          if (current && reported.current !== current.id && currentTime > 5) {
            reported.current = current.id;
            reportStream();
          }
        }}
      />
    </div>
  );
}
