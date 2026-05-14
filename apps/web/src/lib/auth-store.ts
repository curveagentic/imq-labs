'use client';
import { create } from 'zustand';
import { api, setToken, type User, type Artist } from './api';

interface AuthState {
  user: User | null;
  artist: Artist | null;
  loaded: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (body: any) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  artist: null,
  loaded: false,
  async hydrate() {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('afrostream_token');
    if (!t) { set({ loaded: true }); return; }
    try {
      const r = await api.me();
      set({ user: r.user, artist: r.artist || null, loaded: true });
    } catch {
      setToken(null);
      set({ loaded: true });
    }
  },
  async login(email, password) {
    const r = await api.login({ email, password });
    setToken(r.token);
    set({ user: r.user, artist: r.artist || null, loaded: true });
  },
  async register(body) {
    const r = await api.register(body);
    setToken(r.token);
    set({ user: r.user, artist: r.artist || null, loaded: true });
  },
  logout() {
    setToken(null);
    set({ user: null, artist: null });
  },
}));
