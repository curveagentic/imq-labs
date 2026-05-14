-- AfroStream MVP schema
-- PostgreSQL 15+
-- Idempotent init script: safe to run on a fresh DB or rerun during dev.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('artist', 'fan');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE track_status AS ENUM ('pending', 'live', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ai_asset_type AS ENUM ('thumbnail', 'short_video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ai_asset_status AS ENUM ('queued', 'processing', 'ready', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username        VARCHAR(50)  NOT NULL UNIQUE,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  full_name       VARCHAR(100) NOT NULL,
  bio             TEXT,
  profile_image_url VARCHAR(512),
  role            user_role    NOT NULL,
  is_verified     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS artists (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  stage_name    VARCHAR(100) NOT NULL UNIQUE,
  country       VARCHAR(100),
  genres        TEXT[],
  social_links  JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id         UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title             VARCHAR(255) NOT NULL,
  album             VARCHAR(255),
  genre             VARCHAR(100) NOT NULL,
  release_date      DATE,
  audio_file_url    VARCHAR(512) NOT NULL,
  cover_art_url     VARCHAR(512),
  duration_seconds  INTEGER,
  status            track_status NOT NULL DEFAULT 'pending',
  stream_count      BIGINT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playlists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id    UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  track_order INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (playlist_id, track_id)
);

CREATE TABLE IF NOT EXISTS follows (
  follower_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artist_id        UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_user_id, artist_id)
);

CREATE TABLE IF NOT EXISTS streams (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id                 UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  user_id                  UUID REFERENCES users(id) ON DELETE SET NULL,
  played_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_played_seconds  INTEGER
);

CREATE TABLE IF NOT EXISTS ai_creative_assets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id          UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  asset_type        ai_asset_type NOT NULL,
  asset_url         VARCHAR(512),
  prompt_used       TEXT,
  ai_model_version  VARCHAR(64),
  status            ai_asset_status NOT NULL DEFAULT 'queued',
  is_selected       BOOLEAN NOT NULL DEFAULT FALSE,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject     VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category    VARCHAR(64),
  status      ticket_status   NOT NULL DEFAULT 'open',
  priority    ticket_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email          ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role           ON users (role);
CREATE INDEX IF NOT EXISTS idx_artists_user_id      ON artists (user_id);
CREATE INDEX IF NOT EXISTS idx_artists_stage_name   ON artists (stage_name);
CREATE INDEX IF NOT EXISTS idx_tracks_artist_id     ON tracks (artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_title         ON tracks (title);
CREATE INDEX IF NOT EXISTS idx_tracks_genre         ON tracks (genre);
CREATE INDEX IF NOT EXISTS idx_tracks_status        ON tracks (status);
CREATE INDEX IF NOT EXISTS idx_playlists_user_id    ON playlists (user_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower     ON follows (follower_user_id);
CREATE INDEX IF NOT EXISTS idx_follows_artist       ON follows (artist_id);
CREATE INDEX IF NOT EXISTS idx_streams_track_id     ON streams (track_id);
CREATE INDEX IF NOT EXISTS idx_streams_played_at    ON streams (played_at);
CREATE INDEX IF NOT EXISTS idx_ai_assets_track_id   ON ai_creative_assets (track_id);
CREATE INDEX IF NOT EXISTS idx_ai_assets_status     ON ai_creative_assets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id      ON support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status       ON support_tickets (status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['users','artists','tracks','playlists','ai_creative_assets','support_tickets']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;
