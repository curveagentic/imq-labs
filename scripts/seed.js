// Seed the local AfroStream DB with mock artists, fans, tracks, playlists.
// Generates small spoken-title MP3s via macOS `say` + `afconvert` so streaming
// is demonstrably real, not just rows in a table.
//
// Usage:
//   cd afrostream
//   node --env-file=services/api/.env scripts/seed.js
//
// Idempotent: re-running upserts users/artists by email/stage_name and skips
// tracks whose title already exists for that artist.

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STORAGE_DIR = path.join(ROOT, 'infra/storage/data');
const PUBLIC_BASE = process.env.STORAGE_PUBLIC_BASE_URL || 'http://localhost:4000/storage';
const TMP = path.join(STORAGE_DIR, 'seed/_tmp');

fs.mkdirSync(TMP, { recursive: true });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const PASSWORD = 'password123';

const ARTISTS = [
  {
    email: 'amaka@afrostream.dev', username: 'amaka', full_name: 'Amaka Eze',
    stage_name: 'Amaka', country: 'Nigeria', genres: ['Afrobeats', 'R&B'],
    bio: 'Lagos-born Afrobeats vocalist. Sun-soaked melodies, late-night grooves.',
    voice: 'Samantha',
    tracks: [
      { title: 'Lagos Lights', album: 'Sun Dance', genre: 'Afrobeats', mood: 'sunset, neon, cinematic' },
      { title: 'Highway Lover', album: 'Sun Dance', genre: 'Afrobeats', mood: 'romantic dusk' },
      { title: 'Slow Burn', album: 'Singles', genre: 'R&B', mood: 'smooth, late-night' },
    ],
  },
  {
    email: 'kojo@afrostream.dev', username: 'kojo', full_name: 'Kojo Mensah',
    stage_name: 'Kojo M', country: 'Ghana', genres: ['Highlife', 'Afrohouse'],
    bio: 'Accra producer and instrumentalist. Highlife guitars meet four-on-the-floor.',
    voice: 'Daniel',
    tracks: [
      { title: 'Accra at Dawn', album: 'Coastline', genre: 'Highlife', mood: 'warm, golden' },
      { title: 'Beach Drive', album: 'Coastline', genre: 'Afrohouse', mood: 'driving, rhythmic' },
    ],
  },
  {
    email: 'zola@afrostream.dev', username: 'zola', full_name: 'Zola Ndlovu',
    stage_name: 'Zola N', country: 'South Africa', genres: ['Amapiano', 'Afrohouse'],
    bio: 'Joburg DJ. Log drums, basslines, and that 4 AM feeling.',
    voice: 'Karen',
    tracks: [
      { title: 'Maboneng Nights', album: 'Piano Sessions', genre: 'Amapiano', mood: 'club, vibrant' },
      { title: 'Log Drum Anthem', album: 'Piano Sessions', genre: 'Amapiano', mood: 'energetic, high-tempo' },
      { title: 'Sunrise Joburg', album: 'Singles', genre: 'Afrohouse', mood: 'uplifting, dawn' },
    ],
  },
  {
    email: 'tunde@afrostream.dev', username: 'tunde', full_name: 'Tunde Bakare',
    stage_name: 'Tunde B', country: 'Nigeria', genres: ['Hip-Hop', 'Afrobeats'],
    bio: 'Abuja-based emcee. Sharp bars, deep low end.',
    voice: 'Alex',
    tracks: [
      { title: 'No Brakes', album: 'Capital City', genre: 'Hip-Hop', mood: 'aggressive, dark' },
      { title: 'Block Anthem', album: 'Capital City', genre: 'Hip-Hop', mood: 'street, gritty' },
    ],
  },
];

const FANS = [
  { email: 'fan@afrostream.dev', username: 'demo_fan', full_name: 'Demo Fan' },
  { email: 'chiamaka@afrostream.dev', username: 'chiamaka', full_name: 'Chiamaka Okeke' },
];

function shellQuote(s) { return `'${String(s).replace(/'/g, "'\\''")}'`; }

function generateAudio(outMp3, voice, text) {
  const aiff = path.join(TMP, `${path.basename(outMp3, '.mp3')}.aiff`);
  // Use `say` to make a short spoken AIFF, then convert to MP3 via ffmpeg.
  execSync(`say -v ${shellQuote(voice)} -o ${shellQuote(aiff)} ${shellQuote(text)}`);
  execSync(`ffmpeg -y -i ${shellQuote(aiff)} -codec:a libmp3lame -qscale:a 4 ${shellQuote(outMp3)} 2>/dev/null`);
  fs.unlinkSync(aiff);
  const stat = fs.statSync(outMp3);
  return stat.size;
}

async function upsertUser({ email, username, full_name, role, bio = null, profile_image_url = null }) {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const r = await pool.query(
    `INSERT INTO users (email, username, password_hash, full_name, role, bio, profile_image_url, is_verified)
     VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE)
     ON CONFLICT (email) DO UPDATE SET
       username = EXCLUDED.username,
       full_name = EXCLUDED.full_name,
       role = EXCLUDED.role,
       bio = EXCLUDED.bio,
       profile_image_url = EXCLUDED.profile_image_url,
       is_verified = TRUE
     RETURNING id, role`,
    [email, username, hash, full_name, role, bio, profile_image_url]
  );
  return r.rows[0];
}

async function upsertArtist(userId, { stage_name, country, genres }) {
  const r = await pool.query(
    `INSERT INTO artists (user_id, stage_name, country, genres)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (user_id) DO UPDATE SET
       stage_name = EXCLUDED.stage_name,
       country    = EXCLUDED.country,
       genres     = EXCLUDED.genres
     RETURNING id`,
    [userId, stage_name, country, genres]
  );
  return r.rows[0];
}

async function trackExists(artistId, title) {
  const r = await pool.query(`SELECT id FROM tracks WHERE artist_id = $1 AND title = $2`, [artistId, title]);
  return r.rows[0]?.id || null;
}

async function insertTrack(artistId, t, audioUrl, coverUrl, durationSeconds) {
  const r = await pool.query(
    `INSERT INTO tracks
       (artist_id, title, album, genre, audio_file_url, cover_art_url, duration_seconds, status, stream_count)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'live',$8)
     RETURNING id`,
    [artistId, t.title, t.album, t.genre, audioUrl, coverUrl, durationSeconds, t.stream_count || 0]
  );
  return r.rows[0].id;
}

async function bumpStreams(trackId, count) {
  if (!count) return;
  for (let i = 0; i < count; i++) {
    await pool.query(`INSERT INTO streams (track_id, played_at, duration_played_seconds) VALUES ($1, NOW() - ($2 || ' minutes')::interval, $3)`,
      [trackId, Math.floor(Math.random() * 10000), 30 + Math.floor(Math.random() * 90)]);
  }
  await pool.query(`UPDATE tracks SET stream_count = stream_count + $1 WHERE id = $2`, [count, trackId]);
}

(async () => {
  console.log('Seeding AfroStream...');

  // Profile images for artists (picsum + seed for stable placeholders).
  const artistImage = (seed) => `https://picsum.photos/seed/${seed}/300/300`;
  const coverImage  = (seed) => `https://picsum.photos/seed/${seed}/600/600`;

  const artistIds = {};

  for (let i = 0; i < ARTISTS.length; i++) {
    const a = ARTISTS[i];
    const u = await upsertUser({
      email: a.email, username: a.username, full_name: a.full_name,
      role: 'artist', bio: a.bio, profile_image_url: artistImage(a.username),
    });
    const art = await upsertArtist(u.id, { stage_name: a.stage_name, country: a.country, genres: a.genres });
    artistIds[a.username] = art.id;
    console.log(`  artist: ${a.stage_name} (${u.id})`);

    for (let j = 0; j < a.tracks.length; j++) {
      const t = a.tracks[j];
      const existing = await trackExists(art.id, t.title);
      if (existing) { console.log(`    skip (exists): ${t.title}`); continue; }

      const fname = `${a.username}_${t.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.mp3`;
      const relKey = `seed/${a.username}/${fname}`;
      const audioPath = path.join(STORAGE_DIR, relKey);
      fs.mkdirSync(path.dirname(audioPath), { recursive: true });

      const text = `${t.title}, by ${a.stage_name}. This is a demo track on AfroStream.`;
      let durationSeconds = 8;
      try {
        const size = generateAudio(audioPath, a.voice, text);
        // crude duration estimate ~ size_bytes / (avg_bitrate/8). LAME q=4 ~ 165 kbps.
        durationSeconds = Math.max(5, Math.round(size / (165_000 / 8)));
      } catch (e) {
        console.warn(`  audio gen failed (${t.title}): ${e.message}; writing 1-byte placeholder`);
        fs.writeFileSync(audioPath, Buffer.from([0]));
      }

      const audioUrl = `${PUBLIC_BASE}/${relKey}`;
      const coverUrl = coverImage(`${a.username}-${j}`);
      const streams  = 50 + Math.floor(Math.random() * 1500);
      const tid = await insertTrack(art.id, { ...t, stream_count: 0 }, audioUrl, coverUrl, durationSeconds);
      await bumpStreams(tid, streams);
      console.log(`    track: ${t.title} (~${durationSeconds}s, ${streams} streams)`);
    }
  }

  // Fans
  for (const f of FANS) {
    const u = await upsertUser({
      email: f.email, username: f.username, full_name: f.full_name, role: 'fan',
      profile_image_url: artistImage(f.username),
    });
    console.log(`  fan: ${f.full_name} (${u.id})`);
  }

  // Demo follows: demo_fan follows everyone
  const fanRow = (await pool.query(`SELECT id FROM users WHERE email = 'fan@afrostream.dev'`)).rows[0];
  for (const id of Object.values(artistIds)) {
    await pool.query(
      `INSERT INTO follows (follower_user_id, artist_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [fanRow.id, id]
    );
  }

  // Demo playlist for demo_fan
  const pl = await pool.query(
    `INSERT INTO playlists (user_id, name, description) VALUES ($1, 'AfroStream Starter', 'Pre-loaded demo playlist')
     ON CONFLICT DO NOTHING RETURNING id`,
    [fanRow.id]
  );
  let playlistId;
  if (pl.rowCount > 0) {
    playlistId = pl.rows[0].id;
    const tracks = (await pool.query(`SELECT id FROM tracks ORDER BY stream_count DESC LIMIT 6`)).rows;
    for (let i = 0; i < tracks.length; i++) {
      await pool.query(
        `INSERT INTO playlist_tracks (playlist_id, track_id, track_order) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [playlistId, tracks[i].id, i + 1]
      );
    }
    console.log(`  playlist: AfroStream Starter (${tracks.length} tracks)`);
  } else {
    const existing = await pool.query(
      `SELECT id FROM playlists WHERE user_id = $1 AND name = 'AfroStream Starter'`,
      [fanRow.id]
    );
    playlistId = existing.rows[0]?.id;
    console.log('  playlist: already exists');
  }

  // ---------------------------------------------------------------------
  // v2 seed — collaborators, creations, monetisation, conversations
  // (only runs if v2 tables exist; safe to no-op on an old DB).
  // ---------------------------------------------------------------------
  const v2 = await pool.query(`SELECT to_regclass('collaborators') IS NOT NULL AS ok`);
  if (v2.rows[0].ok) {
    console.log('\nSeeding v2 (collaborators / monetize / conversations)...');

    const COLLABORATORS = [
      { email: 'youngd@afrostream.dev',    username: 'youngd',    full_name: 'Young D',     kind: 'producer', headline: '808 architect',           hourly_rate: 90,  city: 'Lagos',       country: 'Nigeria',    skills: ['Afrobeats','Drill','808s'], rating: 4.8, rating_count: 128 },
      { email: 'beatsbyjay@afrostream.dev', username: 'beatsbyjay', full_name: 'BeatzbyJay',  kind: 'producer', headline: 'Amapiano specialist',     hourly_rate: 75,  city: 'Accra',       country: 'Ghana',      skills: ['Amapiano','Highlife','Logic Pro'], rating: 4.9, rating_count: 96 },
      { email: 'mixmaster@afrostream.dev', username: 'mixmaster', full_name: 'MixMaster',   kind: 'engineer', headline: 'Mixing & mastering',     hourly_rate: 120, city: 'Los Angeles', country: 'USA',        skills: ['Mixing','Mastering','Pro Tools'], rating: 4.7, rating_count: 87 },
      { email: 'soundkraft@afrostream.dev', username: 'soundkraft', full_name: 'SoundKraft',  kind: 'songwriter', headline: 'Hooks & toplines',     hourly_rate: 60,  city: 'Nairobi',     country: 'Kenya',      skills: ['Toplines','Hooks','Yoruba/English'], rating: 4.6, rating_count: 74 },
    ];

    for (const c of COLLABORATORS) {
      const u = await upsertUser({
        email: c.email, username: c.username, full_name: c.full_name, role: 'fan',
        bio: c.headline, profile_image_url: artistImage(c.username),
      });
      await pool.query(
        `INSERT INTO collaborators (user_id, kind, headline, hourly_rate_usd, city, country, skills, is_available, rating, rating_count)
         VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,$8,$9)
         ON CONFLICT (user_id) DO UPDATE SET
           kind=EXCLUDED.kind, headline=EXCLUDED.headline,
           hourly_rate_usd=EXCLUDED.hourly_rate_usd,
           city=EXCLUDED.city, country=EXCLUDED.country, skills=EXCLUDED.skills,
           rating=EXCLUDED.rating, rating_count=EXCLUDED.rating_count`,
        [u.id, c.kind, c.headline, c.hourly_rate, c.city, c.country, c.skills, c.rating, c.rating_count]
      );
      console.log(`  collaborator: ${c.full_name} (${c.kind})`);
    }

    // Sample creations for first artist (Amaka)
    const amakaUser = (await pool.query(`SELECT id FROM users WHERE email='amaka@afrostream.dev'`)).rows[0];
    if (amakaUser) {
      const seedCreations = [
        { kind: 'voice_idea', title: 'Hook idea — Lagos Lights', body: 'Sing on the bridge: "Lagos Lights, take me higher"' },
        { kind: 'beat',       title: 'Afrobeats beat · 110bpm',  body: null,
          meta: { bpm: 110, genre: 'Afrobeats', bars: 8 } },
        { kind: 'lyrics',     title: 'Lyrics: late night drives', body: '[Verse 1]\nLate night drives, city in my view\nLagos lights blinking like they know me too\n[Chorus]\nDrive slow, take it slow\nLagos love, here we go' },
      ];
      for (const c of seedCreations) {
        await pool.query(
          `INSERT INTO creations (user_id, kind, title, body, meta, status)
           VALUES ($1,$2,$3,$4,$5,'ready')
           ON CONFLICT DO NOTHING`,
          [amakaUser.id, c.kind, c.title, c.body, c.meta ? JSON.stringify(c.meta) : null]
        );
      }
      console.log('  creations: 3 demo items for Amaka');
    }

    // Monetisation: tiers + sale listings + earnings for Amaka
    const amakaArtist = (await pool.query(
      `SELECT a.id FROM artists a JOIN users u ON u.id = a.user_id WHERE u.email='amaka@afrostream.dev'`
    )).rows[0];
    if (amakaArtist) {
      await pool.query(
        `INSERT INTO subscription_tiers (artist_id, name, price_usd, perks)
         VALUES ($1,'VIP Insider',9.99,'Early access · Behind the scenes · Monthly stems'),
                ($1,'Studio Pass',19.99,'Everything in VIP + monthly Zoom listening party')
         ON CONFLICT DO NOTHING`,
        [amakaArtist.id]
      );
      await pool.query(
        `INSERT INTO sale_listings (artist_id, title, price_usd, description)
         VALUES ($1,'Lagos Lights — exclusive stems',25.00,'24-bit WAV stems, no clearance'),
                ($1,'Beat pack vol. 1',49.00,'10 royalty-free Afrobeats / R&B beats')
         ON CONFLICT DO NOTHING`,
        [amakaArtist.id]
      );

      const fanRow = (await pool.query(`SELECT id FROM users WHERE email = 'fan@afrostream.dev'`)).rows[0];
      const days = 14;
      for (let i = 0; i < days; i++) {
        const kind = ['tip','sale','subscription'][i % 3];
        const amt = ({ tip: [3, 5, 8, 12][i % 4], sale: [25, 49][i % 2], subscription: [9.99, 19.99][i % 2] })[kind];
        await pool.query(
          `INSERT INTO earnings (artist_id, fan_user_id, kind, amount_usd, note, created_at)
           VALUES ($1,$2,$3,$4,$5, NOW() - ($6 || ' days')::interval)
           ON CONFLICT DO NOTHING`,
          [amakaArtist.id, fanRow?.id || null, kind, amt, kind === 'tip' ? 'Big fan!' : kind === 'sale' ? 'Bought stems' : 'Joined VIP', i]
        );
      }
      console.log('  monetize: 2 tiers + 2 sales + 14 earnings');
    }

    // A demo conversation between fan and Amaka
    const amaka = (await pool.query(`SELECT id FROM users WHERE email='amaka@afrostream.dev'`)).rows[0];
    const fanRow = (await pool.query(`SELECT id FROM users WHERE email='fan@afrostream.dev'`)).rows[0];
    if (amaka && fanRow) {
      const existing = await pool.query(
        `SELECT cp1.conversation_id
         FROM conversation_participants cp1
         JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
         WHERE cp1.user_id = $1 AND cp2.user_id = $2`,
        [amaka.id, fanRow.id]
      );
      let convId;
      if (existing.rowCount > 0) {
        convId = existing.rows[0].conversation_id;
      } else {
        const conv = await pool.query(`INSERT INTO conversations DEFAULT VALUES RETURNING id`);
        convId = conv.rows[0].id;
        await pool.query(
          `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1,$2),($1,$3)`,
          [convId, amaka.id, fanRow.id]
        );
        await pool.query(
          `INSERT INTO messages (conversation_id, sender_user_id, body, created_at) VALUES
            ($1,$2,'Yo! I love this beat 🔥', NOW() - interval '2 minutes'),
            ($1,$3,'Glad you like it — new one dropping soon', NOW() - interval '1 minute')`,
          [convId, fanRow.id, amaka.id]
        );
        console.log('  conversation: fan ↔ amaka (2 messages)');
      }
    }
  } else {
    console.log('\nv2 tables not present — run init_v2.sql to enable Connect / Monetize / Messages seeds.');
  }

  console.log('\nDone.');
  console.log('Login with any email above, password: password123');
  console.log('  artist:  amaka@afrostream.dev / password123');
  console.log('  fan:     fan@afrostream.dev   / password123');
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
