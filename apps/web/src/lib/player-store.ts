'use client';
import { create } from 'zustand';
import { api, type Track } from './api';

interface PlayerState {
  current: Track | null;
  queue: Track[];
  index: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  setCurrent: (t: Track | null) => void;
  playOne: (t: Track) => void;
  playQueue: (tracks: Track[], startIndex?: number) => void;
  /** Play a single track within an optional queue. Convenience wrapper. */
  play: (t: Track, queue?: Track[]) => void;
  next: () => void;
  prev: () => void;
  togglePlay: () => void;
  setTime: (t: number, d: number) => void;
  reportStream: () => void;
}

export const usePlayer = create<PlayerState>((set, get) => ({
  current: null,
  queue: [],
  index: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  setCurrent: (t) => set({ current: t, isPlaying: !!t }),
  playOne: (t) => set({ current: t, queue: [t], index: 0, isPlaying: true, currentTime: 0 }),
  play: (t, queue) => {
    const list = queue && queue.length ? queue : [t];
    const i = Math.max(0, list.findIndex((x) => x.id === t.id));
    set({ queue: list, index: i, current: list[i] || t, isPlaying: true, currentTime: 0 });
  },
  playQueue: (tracks, startIndex = 0) => {
    if (!tracks.length) return;
    const i = Math.min(Math.max(0, startIndex), tracks.length - 1);
    set({ queue: tracks, index: i, current: tracks[i], isPlaying: true, currentTime: 0 });
  },
  next: () => {
    const { queue, index } = get();
    if (index + 1 >= queue.length) return;
    const i = index + 1;
    set({ index: i, current: queue[i], isPlaying: true, currentTime: 0 });
  },
  prev: () => {
    const { queue, index } = get();
    if (index <= 0) return;
    const i = index - 1;
    set({ index: i, current: queue[i], isPlaying: true, currentTime: 0 });
  },
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setTime: (t, d) => set({ currentTime: t, duration: d }),
  reportStream: () => {
    const { current, currentTime } = get();
    if (current) api.recordStream(current.id, Math.floor(currentTime)).catch(() => {});
  },
}));
