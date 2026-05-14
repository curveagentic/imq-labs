-- IMQ Labs — single-file schema for Supabase Postgres.
-- Combines init.sql + init_v2.sql. Idempotent: safe to re-run.
-- Run this once in the Supabase SQL editor when bootstrapping the project.

create extension if not exists "pgcrypto";

-- ===== enums =================================================================
do $$ begin
  create type user_role as enum ('artist', 'fan');
exception when duplicate_object then null; end $$;

do $$ begin
  create type track_status as enum ('pending', 'live', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_asset_type as enum ('thumbnail', 'short_video');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_asset_status as enum ('queued', 'processing', 'ready', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ticket_status as enum ('open', 'in_progress', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ticket_priority as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type collaborator_kind as enum ('producer', 'artist', 'engineer', 'songwriter', 'vocalist');
exception when duplicate_object then null; end $$;

do $$ begin
  create type creation_kind as enum ('voice_idea', 'beat', 'lyrics', 'translation', 'cover', 'scene', 'mastering');
exception when duplicate_object then null; end $$;

do $$ begin alter type creation_kind add value if not exists 'cover';     exception when duplicate_object then null; end $$;
do $$ begin alter type creation_kind add value if not exists 'scene';     exception when duplicate_object then null; end $$;
do $$ begin alter type creation_kind add value if not exists 'mastering'; exception when duplicate_object then null; end $$;

do $$ begin
  create type creation_status as enum ('draft', 'processing', 'ready', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type earning_kind as enum ('sale', 'subscription', 'tip');
exception when duplicate_object then null; end $$;

-- ===== core tables ===========================================================
create table if not exists users (
  id              uuid primary key default gen_random_uuid(),
  username        varchar(50)  not null unique,
  email           varchar(255) not null unique,
  password_hash   varchar(255) not null,
  full_name       varchar(100) not null,
  bio             text,
  profile_image_url varchar(512),
  role            user_role    not null,
  is_verified     boolean      not null default false,
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now()
);

create table if not exists artists (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references users(id) on delete cascade,
  stage_name    varchar(100) not null unique,
  country       varchar(100),
  genres        text[],
  social_links  jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists tracks (
  id                uuid primary key default gen_random_uuid(),
  artist_id         uuid not null references artists(id) on delete cascade,
  title             varchar(255) not null,
  album             varchar(255),
  genre             varchar(100) not null,
  release_date      date,
  audio_file_url    varchar(512) not null,
  cover_art_url     varchar(512),
  duration_seconds  integer,
  status            track_status not null default 'pending',
  stream_count      bigint not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists playlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  name        varchar(255) not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists playlist_tracks (
  playlist_id uuid not null references playlists(id) on delete cascade,
  track_id    uuid not null references tracks(id) on delete cascade,
  track_order integer not null,
  created_at  timestamptz not null default now(),
  primary key (playlist_id, track_id)
);

create table if not exists follows (
  follower_user_id uuid not null references users(id) on delete cascade,
  artist_id        uuid not null references artists(id) on delete cascade,
  created_at       timestamptz not null default now(),
  primary key (follower_user_id, artist_id)
);

create table if not exists streams (
  id                       uuid primary key default gen_random_uuid(),
  track_id                 uuid not null references tracks(id) on delete cascade,
  user_id                  uuid references users(id) on delete set null,
  played_at                timestamptz not null default now(),
  duration_played_seconds  integer
);

create table if not exists ai_creative_assets (
  id                uuid primary key default gen_random_uuid(),
  track_id          uuid not null references tracks(id) on delete cascade,
  asset_type        ai_asset_type not null,
  asset_url         varchar(512),
  prompt_used       text,
  ai_model_version  varchar(64),
  status            ai_asset_status not null default 'queued',
  is_selected       boolean not null default false,
  error_message     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  subject     varchar(255) not null,
  description text not null,
  category    varchar(64),
  status      ticket_status   not null default 'open',
  priority    ticket_priority not null default 'medium',
  assigned_to uuid references users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ===== v2 tables =============================================================
create table if not exists collaborators (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references users(id) on delete cascade,
  kind            collaborator_kind not null,
  headline        varchar(160),
  hourly_rate_usd numeric(10,2),
  city            varchar(120),
  country         varchar(120),
  rating          numeric(3,2) default 0,
  rating_count    integer not null default 0,
  skills          text[],
  is_available    boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists hires (
  id              uuid primary key default gen_random_uuid(),
  hirer_user_id   uuid not null references users(id) on delete cascade,
  collaborator_id uuid not null references collaborators(id) on delete cascade,
  brief           text not null,
  budget_usd      numeric(10,2),
  status          varchar(32) not null default 'pending',
  created_at      timestamptz not null default now()
);

create table if not exists conversations (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists conversation_participants (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  last_read_at    timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_user_id  uuid not null references users(id) on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now()
);

create table if not exists creations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  kind          creation_kind not null,
  title         varchar(255) not null,
  prompt        text,
  body          text,
  audio_url     varchar(512),
  cover_url     varchar(512),
  meta          jsonb,
  status        creation_status not null default 'ready',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists sale_listings (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references artists(id) on delete cascade,
  track_id      uuid references tracks(id) on delete set null,
  title         varchar(255) not null,
  price_usd     numeric(10,2) not null,
  description   text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists subscription_tiers (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references artists(id) on delete cascade,
  name          varchar(100) not null,
  price_usd     numeric(10,2) not null,
  perks         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists earnings (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references artists(id) on delete cascade,
  fan_user_id   uuid references users(id) on delete set null,
  kind          earning_kind not null,
  amount_usd    numeric(10,2) not null,
  note          text,
  created_at    timestamptz not null default now()
);

-- ===== indexes ===============================================================
create index if not exists idx_users_email          on users (email);
create index if not exists idx_users_role           on users (role);
create index if not exists idx_artists_user_id      on artists (user_id);
create index if not exists idx_artists_stage_name   on artists (stage_name);
create index if not exists idx_tracks_artist_id     on tracks (artist_id);
create index if not exists idx_tracks_title         on tracks (title);
create index if not exists idx_tracks_genre         on tracks (genre);
create index if not exists idx_tracks_status        on tracks (status);
create index if not exists idx_playlists_user_id    on playlists (user_id);
create index if not exists idx_follows_follower     on follows (follower_user_id);
create index if not exists idx_follows_artist       on follows (artist_id);
create index if not exists idx_streams_track_id    on streams (track_id);
create index if not exists idx_streams_played_at   on streams (played_at);
create index if not exists idx_ai_assets_track_id   on ai_creative_assets (track_id);
create index if not exists idx_ai_assets_status     on ai_creative_assets (status);
create index if not exists idx_tickets_user_id      on support_tickets (user_id);
create index if not exists idx_tickets_status       on support_tickets (status);
create index if not exists idx_collab_kind          on collaborators (kind);
create index if not exists idx_collab_country       on collaborators (country);
create index if not exists idx_collab_avail         on collaborators (is_available);
create index if not exists idx_hires_collab         on hires (collaborator_id);
create index if not exists idx_hires_hirer          on hires (hirer_user_id);
create index if not exists idx_conv_part_user       on conversation_participants (user_id);
create index if not exists idx_msg_conv             on messages (conversation_id, created_at desc);
create index if not exists idx_creations_user       on creations (user_id, created_at desc);
create index if not exists idx_creations_kind       on creations (kind);
create index if not exists idx_sale_artist          on sale_listings (artist_id);
create index if not exists idx_subtier_artist       on subscription_tiers (artist_id);
create index if not exists idx_earnings_artist      on earnings (artist_id, created_at desc);
create index if not exists idx_earnings_kind        on earnings (kind);

-- ===== updated_at trigger ====================================================
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

do $$
declare t text;
begin
  for t in select unnest(array[
    'users','artists','tracks','playlists','ai_creative_assets','support_tickets',
    'collaborators','conversations','creations'
  ]) loop
    execute format('drop trigger if exists trg_%I_updated_at on %I', t, t);
    execute format(
      'create trigger trg_%I_updated_at before update on %I for each row execute function set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ===== row-level security ====================================================
-- The API authenticates with its own JWT and uses a privileged Postgres
-- connection from the backend. RLS stays enabled as defense-in-depth for
-- Supabase Data API access; the backend owner role can still operate directly.
alter table users                     enable row level security;
alter table artists                   enable row level security;
alter table tracks                    enable row level security;
alter table playlists                 enable row level security;
alter table playlist_tracks           enable row level security;
alter table follows                   enable row level security;
alter table streams                   enable row level security;
alter table ai_creative_assets        enable row level security;
alter table support_tickets           enable row level security;
alter table collaborators             enable row level security;
alter table hires                     enable row level security;
alter table conversations             enable row level security;
alter table conversation_participants enable row level security;
alter table messages                  enable row level security;
alter table creations                 enable row level security;
alter table sale_listings             enable row level security;
alter table subscription_tiers        enable row level security;
alter table earnings                  enable row level security;

-- ===== Supabase Storage ======================================================
-- Public media bucket used by the backend storage driver. The backend uploads
-- with the service role; public reads keep audio and artwork URLs simple.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imq-labs',
  'imq-labs',
  true,
  52428800,
  array[
    'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/mp4', 'audio/ogg',
    'audio/webm', 'video/mp4', 'video/webm', 'image/png', 'image/jpeg',
    'image/webp', 'image/gif', 'application/octet-stream'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
