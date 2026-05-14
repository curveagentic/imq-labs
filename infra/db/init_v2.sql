-- AfroStream v2 schema additions — IMQ Labs Create / Connect / Monetize features.
-- Idempotent. Layered on top of init.sql (run init.sql first).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE collaborator_kind AS ENUM ('producer', 'artist', 'engineer', 'songwriter', 'vocalist');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE creation_kind AS ENUM ('voice_idea', 'beat', 'lyrics', 'translation', 'cover', 'scene', 'mastering');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add any new values to an existing enum (idempotent).
DO $$ BEGIN
  ALTER TYPE creation_kind ADD VALUE IF NOT EXISTS 'cover';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE creation_kind ADD VALUE IF NOT EXISTS 'scene';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE creation_kind ADD VALUE IF NOT EXISTS 'mastering';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE creation_status AS ENUM ('draft', 'processing', 'ready', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE earning_kind AS ENUM ('sale', 'subscription', 'tip');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. Collaborator marketplace ---------------------------------------------
CREATE TABLE IF NOT EXISTS collaborators (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  kind            collaborator_kind NOT NULL,
  headline        VARCHAR(160),
  hourly_rate_usd NUMERIC(10,2),
  city            VARCHAR(120),
  country         VARCHAR(120),
  rating          NUMERIC(3,2) DEFAULT 0,
  rating_count    INTEGER NOT NULL DEFAULT 0,
  skills          TEXT[],
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_collab_kind     ON collaborators (kind);
CREATE INDEX IF NOT EXISTS idx_collab_country  ON collaborators (country);
CREATE INDEX IF NOT EXISTS idx_collab_avail    ON collaborators (is_available);

CREATE TABLE IF NOT EXISTS hires (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hirer_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
  brief           TEXT NOT NULL,
  budget_usd      NUMERIC(10,2),
  status          VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hires_collab ON hires (collaborator_id);
CREATE INDEX IF NOT EXISTS idx_hires_hirer  ON hires (hirer_user_id);

-- 2. Direct messages ------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at    TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_conv_part_user ON conversation_participants (user_id);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages (conversation_id, created_at DESC);

-- 3. Creations (Create hub artefacts) ------------------------------------
CREATE TABLE IF NOT EXISTS creations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind          creation_kind NOT NULL,
  title         VARCHAR(255) NOT NULL,
  prompt        TEXT,
  body          TEXT,
  audio_url     VARCHAR(512),
  cover_url     VARCHAR(512),
  meta          JSONB,
  status        creation_status NOT NULL DEFAULT 'ready',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_creations_user ON creations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creations_kind ON creations (kind);

-- 4. Monetisation --------------------------------------------------------
CREATE TABLE IF NOT EXISTS sale_listings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id     UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  track_id      UUID REFERENCES tracks(id) ON DELETE SET NULL,
  title         VARCHAR(255) NOT NULL,
  price_usd     NUMERIC(10,2) NOT NULL,
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sale_artist ON sale_listings (artist_id);

CREATE TABLE IF NOT EXISTS subscription_tiers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id     UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  price_usd     NUMERIC(10,2) NOT NULL,
  perks         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subtier_artist ON subscription_tiers (artist_id);

CREATE TABLE IF NOT EXISTS earnings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id     UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  fan_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  kind          earning_kind NOT NULL,
  amount_usd    NUMERIC(10,2) NOT NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_earnings_artist ON earnings (artist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_kind   ON earnings (kind);

-- 5. updated_at triggers for new tables
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['collaborators','conversations','creations']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;
