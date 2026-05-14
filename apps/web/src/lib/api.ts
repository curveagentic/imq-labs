// When NEXT_PUBLIC_API_URL is empty the client calls the same origin — that's
// the Netlify production setup (/api/* is redirected to the Function). For
// local dev we fall back to the standalone Express on :4000.
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type Role = 'artist' | 'fan';
export type CollabKind = 'producer' | 'artist' | 'engineer' | 'songwriter' | 'vocalist';
export type CreationKind = 'voice_idea' | 'beat' | 'lyrics' | 'translation' | 'cover' | 'scene' | 'mastering';
export type EarningKind = 'sale' | 'subscription' | 'tip';

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  bio?: string | null;
  profile_image_url?: string | null;
  role: Role;
  is_verified: boolean;
}

export interface Artist {
  id: string;
  stage_name: string;
  country?: string | null;
  genres?: string[] | null;
  social_links?: Record<string, string> | null;
}

export interface Track {
  id: string;
  artist_id: string;
  title: string;
  album?: string | null;
  genre: string;
  release_date?: string | null;
  audio_file_url: string;
  cover_art_url?: string | null;
  duration_seconds?: number | null;
  status: 'pending' | 'live' | 'rejected';
  stream_count: number;
  stage_name?: string;
}

export interface Collaborator {
  id: string;
  user_id: string;
  kind: CollabKind;
  headline?: string | null;
  hourly_rate_usd?: number | null;
  city?: string | null;
  country?: string | null;
  rating: number;
  rating_count: number;
  skills?: string[] | null;
  is_available: boolean;
  full_name: string;
  username: string;
  profile_image_url?: string | null;
  is_verified?: boolean;
}

export interface Creation {
  id: string;
  kind: CreationKind;
  title: string;
  prompt?: string | null;
  body?: string | null;
  audio_url?: string | null;
  cover_url?: string | null;
  meta?: any;
  status: 'draft' | 'processing' | 'ready' | 'failed';
  created_at: string;
}

export interface Conversation {
  id: string;
  other_id: string;
  other_name: string;
  other_username: string;
  other_avatar?: string | null;
  last_body?: string | null;
  last_at?: string | null;
  unread_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
  full_name?: string;
  username?: string;
  profile_image_url?: string | null;
}

export interface AiAsset {
  id: string;
  track_id: string;
  asset_type: 'thumbnail' | 'short_video';
  asset_url: string | null;
  status: 'queued' | 'processing' | 'ready' | 'failed';
  is_selected: boolean;
  prompt_used?: string;
  error_message?: string | null;
}

export interface MonetizeOverview {
  totals: {
    total_balance: string;
    sales: string;
    subscriptions: string;
    tips: string;
    last_7d: string;
    last_30d: string;
  };
  series: { day: string; total: string }[];
  recent: { id: string; kind: EarningKind; amount_usd: string; note?: string; created_at: string; fan_name?: string; fan_username?: string }[];
  tiers: { id: string; name: string; price_usd: string; perks?: string; is_active: boolean }[];
  sales: { id: string; title: string; price_usd: string; description?: string; is_active: boolean; track_id?: string; track_title?: string }[];
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('afrostream_token');
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('afrostream_token', token);
  else localStorage.removeItem('afrostream_token');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.body && !(init.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    (err as any).status = res.status;
    (err as any).body = data;
    throw err;
  }
  return data as T;
}

export const api = {
  // Auth
  register: (body: any) => request<{ token: string; user: User; artist?: Artist }>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request<{ token: string; user: User; artist?: Artist }>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request<{ user: User; artist?: Artist }>('/api/auth/me'),

  // Tracks
  listTracks: (params?: { q?: string; genre?: string; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set('q', params.q);
    if (params?.genre) sp.set('genre', params.genre);
    if (params?.limit) sp.set('limit', String(params.limit));
    return request<{ tracks: Track[] }>(`/api/tracks${sp.toString() ? '?' + sp : ''}`);
  },
  myTracks: () => request<{ tracks: Track[] }>('/api/tracks/mine'),
  getTrack: (id: string) => request<{ track: Track }>(`/api/tracks/${id}`),
  uploadTrack: (form: FormData) => request<{ track: Track }>('/api/tracks', { method: 'POST', body: form }),
  deleteTrack: (id: string) => request<{ deleted: true }>(`/api/tracks/${id}`, { method: 'DELETE' }),

  // Artists
  listArtists: (q?: string) => {
    const sp = q ? `?q=${encodeURIComponent(q)}` : '';
    return request<{ artists: any[] }>(`/api/artists${sp}`);
  },
  getArtist: (id: string) => request<{ artist: any; tracks: Track[]; following: boolean }>(`/api/artists/${id}`),
  followArtist: (id: string) => request(`/api/artists/${id}/follow`, { method: 'POST' }),
  unfollowArtist: (id: string) => request(`/api/artists/${id}/follow`, { method: 'DELETE' }),

  // Streams
  recordStream: (track_id: string, duration?: number) =>
    request('/api/streams', { method: 'POST', body: JSON.stringify({ track_id, duration_played_seconds: duration }) }),
  myAnalytics: () => request<{ totals: { total_streams: number; streams_7d: number }; tracks: any[] }>('/api/streams/analytics/me'),

  // AI (legacy assets per track)
  generateThumbnails: (body: any) => request<{ assets: AiAsset[]; prompt: string }>('/api/ai/thumbnails', { method: 'POST', body: JSON.stringify(body) }),

  // Create hub
  recentCreations: () => request<{ creations: Creation[] }>('/api/create/recent'),
  voiceIdea: (form: FormData) => request<{ creation: Creation }>('/api/create/voice-idea', { method: 'POST', body: form }),
  generateBeat: (body: any) => request<{ creation: Creation }>('/api/create/beat', { method: 'POST', body: JSON.stringify(body) }),
  writeLyrics: (body: any) => request<{ creation: Creation }>('/api/create/lyrics', { method: 'POST', body: JSON.stringify(body) }),
  translate: (body: any) => request<{ creation: Creation }>('/api/create/translate', { method: 'POST', body: JSON.stringify(body) }),
  generateCover: (body: any) => request<{ creation: Creation }>('/api/create/cover', { method: 'POST', body: JSON.stringify(body) }),
  generateScene: (body: any) => request<{ creation: Creation }>('/api/create/scene', { method: 'POST', body: JSON.stringify(body) }),
  masterAudio: (form: FormData) => request<{ creation: Creation }>('/api/create/master', { method: 'POST', body: form }),
  deleteCreation: (id: string) => request(`/api/create/${id}`, { method: 'DELETE' }),

  // Collaborators
  listCollaborators: (params?: { kind?: string; q?: string }) => {
    const sp = new URLSearchParams();
    if (params?.kind) sp.set('kind', params.kind);
    if (params?.q) sp.set('q', params.q);
    return request<{ collaborators: Collaborator[] }>(`/api/collaborators${sp.toString() ? '?' + sp : ''}`);
  },
  hire: (body: any) => request<{ hire: any; conversation_id: string }>('/api/collaborators/hire', { method: 'POST', body: JSON.stringify(body) }),
  upsertCollabProfile: (body: any) => request<{ collaborator: Collaborator }>('/api/collaborators/me', { method: 'PUT', body: JSON.stringify(body) }),

  // Messages
  conversations: () => request<{ conversations: Conversation[] }>('/api/messages/conversations'),
  conversation: (id: string) => request<{ messages: Message[] }>(`/api/messages/conversations/${id}`),
  sendMessage: (id: string, body: string) =>
    request<{ message: Message }>(`/api/messages/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ body }) }),
  startConversation: (user_id: string, body: string) =>
    request<{ conversation_id: string; message: Message }>('/api/messages/conversations', { method: 'POST', body: JSON.stringify({ user_id, body }) }),

  // Stats
  stats: () => request<{
    users: number; artists: number; tracks: number; collaborators: number;
    conversations: number; earnings_total_usd: string;
  }>('/api/stats'),

  // Monetize
  monetizeOverview: () => request<MonetizeOverview>('/api/monetize/overview'),
  monetizeForArtist: (artistId: string) => request<{ tiers: any[]; sales: any[] }>(`/api/monetize/artist/${artistId}`),
  createSale: (body: any) => request<{ listing: any }>('/api/monetize/sales', { method: 'POST', body: JSON.stringify(body) }),
  createTier: (body: any) => request<{ tier: any }>('/api/monetize/tiers', { method: 'POST', body: JSON.stringify(body) }),
  tip: (body: any) => request<{ earning: any }>('/api/monetize/tip', { method: 'POST', body: JSON.stringify(body) }),
  subscribe: (tier_id: string) => request<{ earning: any }>('/api/monetize/subscribe', { method: 'POST', body: JSON.stringify({ tier_id }) }),
  buy: (listing_id: string) => request<{ earning: any }>('/api/monetize/buy', { method: 'POST', body: JSON.stringify({ listing_id }) }),
};
