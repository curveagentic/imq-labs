# Deploying IMQ Labs (Supabase + Netlify)

End-to-end runbook for taking this repo from local-only to a live, publicly
accessible site backed by Supabase (Postgres + Storage) with the API running
as a Netlify Function.

## Architecture (production)

```
                       ┌────────────────────────────┐
                       │           Netlify          │
  Browser ────────►    │                            │
                       │  ┌──────────────────────┐  │
                       │  │ Next.js static / SSR │  │
                       │  └──────────────────────┘  │
                       │  ┌──────────────────────┐  │
   /api/* ─────────────┼─►│  Netlify Function    │  │
   /storage/*          │  │  (Express via        │  │
   /health             │  │   serverless-http)   │  │
                       │  └──────────┬───────────┘  │
                       └─────────────┼──────────────┘
                                     ▼
                       ┌────────────────────────────┐
                       │          Supabase          │
                       │   Postgres + Storage       │
                       └────────────────────────────┘
```

- Same-origin in production. The frontend calls `/api/...`; Netlify rewrites
  it to the Function at `/.netlify/functions/api/api/...`.
- `STORAGE_DRIVER=supabase` makes the API upload to Supabase Storage and
  persist Supabase public URLs in the DB. The `/storage/*` route is kept as
  a 302 redirect for any legacy `localhost:4000/storage/...` rows.

## 1. Create the Supabase project

1. https://supabase.com → **New project**. Pick a region close to your users.
2. Wait for it to provision, then open **SQL Editor → New query**.
3. Paste the contents of [`infra/db/supabase_schema.sql`](infra/db/supabase_schema.sql) and run it.
   It is idempotent and combines `init.sql` + `init_v2.sql`.
4. **Storage → Create a new bucket**: name `imq-labs`, **Public** = on.
   (Public is the simplest path; for signed URLs see the hardening notes below.)
5. **Project Settings → API**: copy three values for later
   - `Project URL`            → `SUPABASE_URL`
   - `service_role` key       → `SUPABASE_SERVICE_ROLE_KEY` *(never ship to the browser)*
   - `anon` key               → only needed if you later move the client onto Supabase Auth
6. **Project Settings → Database → Connection pooling**: copy the
   **Transaction mode** URI (port `6543`). That is the value you put in
   `DATABASE_URL`. Do NOT use the direct connection (5432) — Netlify Functions
   are short-lived and will exhaust direct connections quickly.

## 2. Push the code to GitHub / GitLab

Netlify deploys from a Git remote.

```bash
cd /Users/michaeljules-vialva/Ava/afrostream
git init && git add . && git commit -m "feat: supabase + netlify deploy"
git remote add origin <your-empty-repo-url>
git push -u origin main
```

## 3. Create the Netlify site

1. https://app.netlify.com → **Add new site → Import an existing project** → pick the repo.
2. Netlify will read [`netlify.toml`](netlify.toml). Confirm:
   - Base directory:    `apps/web`
   - Build command:     `npm install --workspaces --include-workspace-root && npm --workspace apps/web run build`
   - Publish directory: `apps/web/.next`
   - Functions dir:     `netlify/functions`
3. **Site settings → Environment variables** — add **all** of these:

| Key                          | Value |
|------------------------------|-------|
| `DATABASE_URL`               | Supabase pooler URI on port 6543, `?sslmode=require` |
| `JWT_SECRET`                 | 64+ random chars (`openssl rand -hex 32`) |
| `JWT_EXPIRES_IN`             | `7d` |
| `STORAGE_DRIVER`             | `supabase` |
| `SUPABASE_URL`               | Project URL from step 1.5 |
| `SUPABASE_SERVICE_ROLE_KEY`  | service_role key from step 1.5 |
| `SUPABASE_STORAGE_BUCKET`    | `imq-labs` |
| `FAL_KEY`                    | Your Fal.ai API key (optional but AI routes will 502 without it) |
| `ANTHROPIC_API_KEY`          | Your Anthropic key (optional; lyrics fall back to a heuristic) |
| `WEB_ORIGIN`                 | Your Netlify site URL, e.g. `https://imq-labs.netlify.app` |
| `NEXT_PUBLIC_API_URL`        | **leave empty** — same-origin call in production |

4. Click **Deploy**. The first build takes ~3-5 min (Next.js + Function bundle).

## 4. Verify

After deploy finishes:

```bash
# Database + function healthcheck
curl https://<your-site>.netlify.app/health
# → {"status":"ok","db":"up"}

# Anonymous public read of tracks
curl https://<your-site>.netlify.app/api/tracks
# → {"tracks":[ ... ]}
```

Open the site, register a fan or artist, and verify:
1. Sign-up → land on home/discover.
2. As an artist, upload a track ≤ ~5 MB (see size cap below).
3. The audio plays in the player (cover art too if attached).
4. Logged-out incognito search finds the track.

## 5. Custom domain (optional)

Site settings → Domain management → Add custom domain.
Netlify provisions a free Let's Encrypt cert automatically.
Once the apex is live, update `WEB_ORIGIN` to `https://your-domain.com`
and trigger a redeploy.

## Known constraints + hardening notes

### Upload size cap

Netlify synchronous-invocation Functions cap the request body at **~6 MB**.
The current code uses Multer in-memory uploads up to 50 MB (tracks) and 30 MB
(creations). A file larger than 6 MB will return `413 Payload Too Large`.

**Short-term workaround**: enforce a 5 MB cap on the client.

**Production fix**: switch to direct-to-Supabase signed upload URLs. Pattern:
```
client → POST /api/tracks/upload-url   (API returns a Supabase signed URL)
client → PUT  <signed-url> binary       (goes straight to Supabase Storage)
client → POST /api/tracks               (commits metadata + the stored URL)
```
That bypasses the function for the binary payload entirely. The storage
abstraction in `services/api/src/lib/storage.js` is already Supabase-shaped,
so the signed-URL endpoint is a small addition rather than a rewrite.

### Function timeout

Free-tier Netlify Functions time out at **10 s**. The AI routes
(`/api/ai/thumbnails`, `/api/ai/short-videos`, `/api/create/beat`,
`/api/create/scene`) call Fal.ai synchronously and take 30–120 s.
**They will time out on the free tier.** Options:
- Upgrade to Netlify Background Functions (15-minute timeout) for those routes.
- Or move AI generation to a queue (BullMQ + Redis / Supabase Edge Functions)
  and have the client poll `/api/ai/assets?track_id=...` for status.

### Auth model

The app uses a custom JWT (issued by `/api/auth/login`, verified in
`services/api/src/middleware/auth.js`) and stores `password_hash` in the
`users` table. This is **not** Supabase Auth — the schema migration
deliberately keeps RLS disabled so the service-role connection can read/write
freely. If you later want to move users onto Supabase Auth (Google/Apple SSO,
magic links, etc.), the path is:
1. Backfill the `users.id` column with the Supabase `auth.users.id` UUIDs.
2. Enable RLS and add per-table policies keyed on `auth.uid()`.
3. Replace the client `Authorization: Bearer <jwt>` flow with Supabase JS.

### Database pooling

Always use the **Transaction-mode pooler** (`...pooler.supabase.com:6543`),
not the direct DB host (`db.<ref>.supabase.co:5432`). Each function invocation
gets a fresh socket; the pooler reuses them on the server side.

## Local development (unchanged)

The local dev flow still works as before:

```bash
docker compose -f infra/docker-compose.yml up -d   # local Postgres + MinIO
cp services/api/.env.example services/api/.env     # STORAGE_DRIVER=local
cp apps/web/.env.example apps/web/.env.local
npm install
npm run dev                                        # api :4000, web :3030
```

If you want to dev-test against the real Supabase project, set
`DATABASE_URL`, `STORAGE_DRIVER=supabase`, `SUPABASE_URL`, and
`SUPABASE_SERVICE_ROLE_KEY` in `services/api/.env` and skip docker compose.

## Files touched by the migration

| File                                                | Purpose |
|-----------------------------------------------------|---------|
| `infra/db/supabase_schema.sql`                      | Single idempotent migration for Supabase |
| `services/api/src/lib/storage.js`                   | Supabase Storage driver (with local fallback) |
| `services/api/src/routes/storage.js`                | 302 redirect in supabase mode, range-serve in local mode |
| `services/api/src/app.js`                           | Express app factory (split out of server.js) |
| `services/api/src/server.js`                        | Local-only `app.listen()` entry |
| `services/api/package.json`                         | `@supabase/supabase-js`, `serverless-http` |
| `services/api/.env.example`                         | New Supabase + storage-driver env vars |
| `netlify/functions/api.js`                          | Express → Netlify Function handler |
| `netlify/functions/package.json`                    | `{ "type": "module" }` so the function loads ESM |
| `netlify.toml`                                      | Build + functions + `/api/*`, `/storage/*` redirects |
| `apps/web/next.config.mjs`                          | Same-origin in prod, proxy only in dev |
| `apps/web/src/lib/api.ts`                           | `NEXT_PUBLIC_API_URL` empty = same-origin |
| `apps/web/.env.example`                             | Documented the same-origin production setting |
| `package.json`                                      | `@netlify/plugin-nextjs` dev dep |
