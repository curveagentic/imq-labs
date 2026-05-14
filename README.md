# IMQ Labs — MVP scaffold

A music streaming + AI creative platform for African artists. This repo is the
**Autopilot Phase 1** scaffold: a working web MVP with full backend, schema,
audio streaming, and Fal.ai-powered thumbnail/video generation.

> **Operational realism note.** A full Spotify-grade platform with native iOS/Android,
> microservices, payouts, and live streaming is months of multi-team work.
> What's in this repo is a **single-deployable monolith** (Node API + Next.js web)
> wired against PostgreSQL and a swappable object store, with the architecture
> shaped so it can be split into the microservices described in the brief later
> without rewriting domain code.

## What's included (Phase 1)

| Layer | Status | Notes |
|---|---|---|
| Database schema (PostgreSQL) | Done | `infra/db/init.sql` — all 9 MVP tables, enums, indexes, triggers |
| Auth (JWT, bcrypt, role-based) | Done | Artist + Fan registration, login, /me |
| Music: upload, list, manage, delete | Done | Multer + local-disk storage abstraction (S3/MinIO swap-ready) |
| Music: streaming with HTTP range | Done | `/storage/*` route supports byte-range for `<audio>` |
| Playlists | Done | Create, list, add/remove tracks, view, delete |
| Follows + artist pages | Done | Public artist profiles, follow/unfollow |
| Stream tracking + analytics | Done | Stream events + per-artist totals + 7-day window |
| Support tickets + AI triage | Done | Keyword-based category/priority + canned suggestions |
| AI Creative Service (thumbnails) | Done | Fal.ai `flux/schnell`, 4 outputs per request |
| AI Creative Service (short video) | Done | Fal.ai `ltx-video`, 9:16 output |
| Web app: auth + player + search + library + artist studio | Done | Next.js 14 (App Router) + Tailwind + Zustand |
| Local one-shot launcher | Done | `scripts/run_local.sh` |
| Mobile (React Native) | **Not built** | See `apps/mobile/README.md` for the planned path |

## Repo layout

```
afrostream/
├── apps/
│   ├── web/                      Next.js 14 web app (TypeScript, Tailwind)
│   └── mobile/                   Placeholder + plan for React Native
├── services/
│   └── api/                      Node 20 / Express API (ESM, JS)
├── infra/
│   ├── db/init.sql               Idempotent Postgres schema
│   ├── docker-compose.yml        Postgres + MinIO
│   └── storage/                  Local-disk uploads (gitignored)
├── scripts/
│   ├── db_init.sh                Apply schema via psql
│   └── run_local.sh              One-shot local launcher
├── package.json                  npm workspaces root
└── README.md                     This file
```

## Quickstart

Prerequisites: Node 20+, Docker Desktop, and (optionally) `psql`.

```bash
cd afrostream
./scripts/run_local.sh
```

The launcher will:
1. Boot Postgres + MinIO via docker compose
2. Copy `.env.example` files into place if missing
3. `npm install` workspaces
4. Start API on `:4000` and web on `:3000` in parallel

Open `http://localhost:3000`. Health check: `http://localhost:4000/health`.

### Manual run (no launcher)

```bash
cd afrostream
npm install
docker compose -f infra/docker-compose.yml up -d        # postgres + minio
cp services/api/.env.example services/api/.env          # add FAL_KEY for AI
cp apps/web/.env.example apps/web/.env.local
npm run dev
```

### Apply / re-apply the schema

```bash
DATABASE_URL=postgres://afrostream:afrostream@localhost:5432/afrostream ./scripts/db_init.sh
# or
docker exec -i afrostream-postgres psql -U afrostream -d afrostream < infra/db/init.sql
```

The compose file already mounts `init.sql` to run on first DB boot, so a fresh
`stack:up` is usually enough.

## Configuration

`services/api/.env`:

```
PORT=4000
DATABASE_URL=postgres://afrostream:afrostream@localhost:5432/afrostream
JWT_SECRET=change_me_in_production_please
JWT_EXPIRES_IN=7d
STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=../../infra/storage/data
STORAGE_PUBLIC_BASE_URL=http://localhost:4000/storage
FAL_KEY=                          # required for AI thumbnail/video generation
WEB_ORIGIN=http://localhost:3000
```

`apps/web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

> **`FAL_KEY` is in the existing `openclaw_config/.env`** — use the same key
> here (`FAL_KEY=...`). Without it, AI generation endpoints return `502
> ai_generation_failed`; everything else still works.

## Demo flow (local MVP)

1. Open `http://localhost:3000` and click **Sign up**.
2. Pick **Artist**, fill the form (stage name + country required).
3. Land on **Artist Studio**. Click **Upload track**, pick an MP3 (≤ 50 MB),
   submit.
4. On the track page, click **Generate 4 thumbnails**, wait ~60s, click **Use
   this** on your favorite. The cover art is now wired up everywhere.
5. Optionally click **Generate short video** (~2–5 minutes).
6. Open an incognito window, register as **Fan**, search and play the track.
7. Submit a support ticket from `/support`; observe the AI triage suggestion.

## Notable design decisions

- **Single Express API, not microservices.** The architecture doc proposes Auth
  / Music / AI / Support as separate services. For solo-operator MVP, splitting
  on day one is premature — the cost is huge and the benefits don't show until
  team and traffic scale. Each route file (`routes/auth.js`, `routes/music.js`,
  …) is already a self-contained slice and can be carved out behind an API
  gateway later without changing the contract.
- **Local-disk storage with an S3-shaped interface.** `services/api/src/lib/storage.js`
  exposes `saveBuffer`, `saveStream`, `saveFromUrl`, `keyForUpload`, `publicUrlForKey`.
  Swap to S3/MinIO by changing only that file.
- **Range requests in pure Node.** The `/storage/*` route emits `Accept-Ranges`
  and `206 Partial Content` so HTML5 `<audio>` seeks correctly. Production should
  push this onto a CDN (CloudFront / Cloudflare R2 / similar).
- **JWT in localStorage**, refreshable by re-login. No refresh-token machinery
  in MVP. For production, switch to httpOnly refresh cookies.
- **AI synchronous flow.** `POST /api/ai/thumbnails` blocks until Fal.ai returns
  (~30–60s). For a multi-tenant production load, move to a queue (BullMQ +
  Redis or similar) and have the client poll `/api/ai/assets`.
- **No payouts.** The PRD explicitly defers payouts past MVP.

## API surface (cheat sheet)

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/users/:id
PATCH  /api/users/me

GET    /api/artists?q=
GET    /api/artists/:id
PATCH  /api/artists/me                 (artist)
POST   /api/artists/:id/follow
DELETE /api/artists/:id/follow

GET    /api/tracks?q=&genre=
GET    /api/tracks/mine                (artist)
GET    /api/tracks/:id
POST   /api/tracks                     (artist; multipart audio + cover)
PATCH  /api/tracks/:id                 (artist)
DELETE /api/tracks/:id                 (artist)

GET    /api/playlists/mine
POST   /api/playlists
GET    /api/playlists/:id
POST   /api/playlists/:id/tracks
DELETE /api/playlists/:id/tracks/:trackId
DELETE /api/playlists/:id

POST   /api/streams
GET    /api/streams/analytics/me       (artist)

POST   /api/support
GET    /api/support/mine
GET    /api/support/:id

POST   /api/ai/thumbnails              (artist)
POST   /api/ai/short-videos            (artist)
GET    /api/ai/assets?track_id=        (artist)
POST   /api/ai/assets/:id/select       (artist)

GET    /storage/<key>                  (range-aware static serve)
GET    /health
```

## Risks, assumptions, and open dependencies

| Item | Type | Impact | Notes |
|---|---|---|---|
| Mobile (RN) build | **Not delivered** | High for "cross-platform" promise | Web is mobile-responsive; the RN app is its own multi-week scope. See `apps/mobile/README.md`. |
| Microservices split | Deferred | Medium | Done as a modular monolith. Re-splitting is mechanical when traffic justifies. |
| AI generation cost | Open | Medium | Each Fal call costs real money. Add per-artist generation quotas before public launch. |
| Audio analysis (Librosa/Essentia) | Not implemented | Medium | The PRD mentions "AI analyzes audio to drive prompts." MVP uses track title + genre + artist-supplied mood/style only. Real audio feature extraction is a v1.1 task. |
| Royalty calc | Not implemented | High for monetization | `streams` table captures events but there's no rate sheet, payout schedule, or accounting model. |
| SSO (Google/Facebook) | Not implemented | Low | Email/password works; SSO is a v1.1 task. |
| Track moderation | Stub | Medium | All uploads default to `live`. Pending-review flow needs an admin panel + reviewer role. |
| Admin panel | Not implemented | Medium | Required for content moderation, support agent dashboard, analytics. |
| Email notifications | Not implemented | Medium | Support tickets and password reset will need an SMTP provider (Postmark/Resend/SES). |
| Rate limiting / abuse | Not implemented | High before public | Add Redis + `express-rate-limit` per route group. |
| Data privacy / compliance | Not addressed | High before public | GDPR data-export/erasure, copyright takedown workflow, terms/privacy pages. |
| File-size cap | 50 MB | Low | Hard-coded in `routes/tracks.js`; raise after moving to S3 multipart uploads. |
| CDN | Not configured | High at scale | Currently Node serves audio bytes — fine for demo, not for thousands of concurrent listeners. |
| Search relevance | Naive ILIKE | Low for MVP | Plan: Postgres `tsvector` for v1.1, real search (Meili/Typesense) later. |
| Test coverage | None | Medium | Add Vitest for API and Playwright for the upload→play→stream golden path. |
| CI/CD | None | Medium | Add GitHub Actions: lint, type-check, db-migrate, deploy to a single Render/Railway/Fly.io target for staging. |

## Recommended next steps (in priority order)

1. **Add a `FAL_KEY`** to `services/api/.env` and run the demo end-to-end. Confirm the AI flow works from a fresh artist account.
2. **Smoke-test on a real device** by hitting `http://<your-LAN-ip>:3000` from a phone — verify the `<audio>` range-stream and the upload-from-mobile flow.
3. **Pick a hosting target** for staging (Railway / Render / Fly.io) and write a single `Dockerfile.api` and `Dockerfile.web` so we can deploy.
4. **Add rate limiting and request logging** before any public link.
5. **Wire moderation queue + admin panel** before opening signup.
6. **Decide native-mobile path** (Expo vs bare RN) and budget the 4–6 week build.
7. **Add audio feature extraction** (Librosa via a Python sidecar service or fal.ai's audio analysis endpoints) to make AI prompts truly track-aware.
