// Full-build seed for AfroStream.
//
// Adds a large roster on top of `seed.js` so every screen looks populated
// during demos: ~16 artists, ~10 fans, ~14 collaborators across 5 kinds,
// 2-4 tracks per artist with realistic stream counts, sale listings and
// subscription tiers for every artist, 60 days of varied earnings history
// across multiple artists, ~14 cross-conversations, and a stock of
// creations for the demo accounts.
//
// Idempotent: safe to re-run. Uses ON CONFLICT to upsert.
//
// Usage:
//   node --env-file=services/api/.env scripts/seed_full.js

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
const SHARED_KEY = 'seed/_shared/afrostream_demo.mp3';
const SHARED_PATH = path.join(STORAGE_DIR, SHARED_KEY);
const SHARED_URL = `${PUBLIC_BASE}/${SHARED_KEY}`;

fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(path.dirname(SHARED_PATH), { recursive: true });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const PASSWORD = 'password123';

function ensureSharedAudio() {
  if (fs.existsSync(SHARED_PATH) && fs.statSync(SHARED_PATH).size > 1000) return;
  const aiff = path.join(TMP, 'shared.aiff');
  const text = 'This is a demo track on AfroStream. Stream, share, and enjoy the sound of the African continent.';
  try {
    execSync(`say -v 'Samantha' -o '${aiff}' '${text.replace(/'/g, "'\\''")}'`);
    execSync(`ffmpeg -y -i '${aiff}' -codec:a libmp3lame -qscale:a 4 '${SHARED_PATH}' 2>/dev/null`);
    fs.unlinkSync(aiff);
  } catch (e) {
    console.warn('shared audio gen failed:', e.message, '— writing 1-byte placeholder');
    fs.writeFileSync(SHARED_PATH, Buffer.from([0]));
  }
}

const ARTISTS = [
  { username: 'amaka',     full_name: 'Amaka Eze',      stage: 'Amaka',         country: 'Nigeria',      genres: ['Afrobeats','R&B'],          bio: 'Lagos-born Afrobeats vocalist. Sun-soaked melodies, late-night grooves.' },
  { username: 'kojo',      full_name: 'Kojo Mensah',    stage: 'Kojo M',        country: 'Ghana',        genres: ['Highlife','Afrohouse'],     bio: 'Accra producer. Highlife guitars meet four-on-the-floor.' },
  { username: 'zola',      full_name: 'Zola Ndlovu',    stage: 'Zola N',        country: 'South Africa', genres: ['Amapiano','Afrohouse'],     bio: 'Joburg DJ. Log drums, basslines, 4 AM energy.' },
  { username: 'tunde',     full_name: 'Tunde Bakare',   stage: 'Tunde B',       country: 'Nigeria',      genres: ['Hip-Hop','Afrobeats'],      bio: 'Abuja emcee. Sharp bars, deep low end.' },
  { username: 'fela_jr',   full_name: 'Femi Adeyemi',   stage: 'Fela Jr',       country: 'Nigeria',      genres: ['Afrobeat','Jazz'],          bio: 'Saxophonist and bandleader. Carrying the torch from Calabar to Berlin.' },
  { username: 'chidi',     full_name: 'Chidi Okafor',   stage: 'Chidi',         country: 'Nigeria',      genres: ['Afrobeats','Gospel'],        bio: 'Enugu vocalist. Sunday morning energy, midnight prayers.' },
  { username: 'sade_b',    full_name: 'Sade Bello',     stage: 'Sade B',        country: 'Nigeria',      genres: ['R&B','Soul'],                bio: 'London-via-Lagos. Velvet vocals, late-90s warmth.' },
  { username: 'kwame',     full_name: 'Kwame Asante',   stage: 'KW',            country: 'Ghana',        genres: ['Drill','Hip-Hop'],          bio: 'Kumasi to Croydon. Drill cadence, Twi punchlines.' },
  { username: 'efya',      full_name: 'Efya Owusu',     stage: 'Efya',          country: 'Ghana',        genres: ['Highlife','R&B'],           bio: 'East Legon. Songwriter, vocalist, painter.' },
  { username: 'sauti',     full_name: 'Maina Kamau',    stage: 'Sauti K',       country: 'Kenya',        genres: ['Gengetone','Afropop'],      bio: 'Nairobi rapper. Sheng, sneakers, and the Jubilee Line.' },
  { username: 'wanjiku',   full_name: 'Wanjiku Kamau',  stage: 'Wanjiku',       country: 'Kenya',        genres: ['Afropop','Bongo'],           bio: 'Kasarani born. Soft melodies, sharp lyrics.' },
  { username: 'thandi',    full_name: 'Thandiwe Khumalo', stage: 'Thandi',       country: 'South Africa', genres: ['Amapiano','House'],         bio: 'Soweto vocals. Festival anthems.' },
  { username: 'lerato',    full_name: 'Lerato Mokoena', stage: 'Lerato',        country: 'South Africa', genres: ['Amapiano','Soul'],          bio: 'Pretoria DJ. Smooth log drums, smooth flow.' },
  { username: 'youssou',   full_name: 'Youssou Diop',   stage: 'Youssou D',     country: 'Senegal',       genres: ['Mbalax','Afrobeats'],       bio: 'Dakar percussionist. New school Mbalax.' },
  { username: 'aida',      full_name: 'Aida Nasser',    stage: 'Aida',          country: 'Egypt',         genres: ['Shaabi','Mahraganat'],      bio: 'Cairo nightlife. Auto-tune and tabla.' },
  { username: 'mulugeta',  full_name: 'Mulugeta Tadesse', stage: 'Mulugeta',     country: 'Ethiopia',      genres: ['Ethio-Jazz','Jazz'],        bio: 'Addis pianist. Mulatu disciple, future-bound.' },
];

const TRACK_TEMPLATES = {
  Afrobeats: ['Lagos Lights','Mainland Love','Sunset Riddim','Vibes Only','Night Tide','Owo','Casablanca','Sweet Mistake'],
  'R&B':     ['Slow Burn','Late Reply','Sade Mood','Velvet','3 AM'],
  Highlife:  ['Accra at Dawn','Coastal Drive','Gold Coast','Sundown'],
  Afrohouse: ['Beach Drive','Maboneng Nights','Sunrise Joburg','Cape Wind'],
  'Hip-Hop': ['No Brakes','Block Anthem','Capital','Top Shotta'],
  Amapiano:  ['Log Drum Anthem','Maboneng Nights','Piano Therapy','Soweto Skies','Asibe Happy'],
  Afropop:   ['Niger Delta','Sheng Up','Mombasa Road','Wanjiku\'s Theme'],
  Gengetone: ['Maandamano','Boychild','Ngoma'],
  Drill:     ['Brixton Run','Croydon Cold','Trench Talk'],
  Afrobeat:  ['Berlin Calabar','Open Lagos','Carry Go'],
  Jazz:      ['Mulatu Tribute','Addis Blue','Saxophone Sundown'],
  Soul:      ['Heritage','Brown Skin','Marvin\'s Letter'],
  Gospel:    ['Sunday Morning','Praise','Onye Oma'],
  Mbalax:    ['Sabar','Dakar Skyline','Goree'],
  Shaabi:    ['Tahrir','Khan Khalili','Microbus'],
  Mahraganat:['Cairo Night','Auto-Tune Habibi'],
  Bongo:     ['Bongo Flava','Dar Sun'],
  House:     ['Fourways','Sandton 5 AM'],
  'Ethio-Jazz': ['Yekatit','Tezeta','Anchi Hoye'],
};

const FANS = [
  { username: 'demo_fan',    full_name: 'Demo Fan' },
  { username: 'chiamaka',    full_name: 'Chiamaka Okeke' },
  { username: 'kingsley',    full_name: 'Kingsley Adebayo' },
  { username: 'aisha',       full_name: 'Aisha Bello' },
  { username: 'nyasha',      full_name: 'Nyasha Moyo' },
  { username: 'oluwaseun',   full_name: 'Oluwaseun Adeyinka' },
  { username: 'fatou',       full_name: 'Fatou Diallo' },
  { username: 'tariq',       full_name: 'Tariq Hassan' },
  { username: 'amina',       full_name: 'Amina Suleiman' },
  { username: 'jelani',      full_name: 'Jelani Carter' },
];

const COLLABORATORS = [
  { username: 'youngd',      full_name: 'Young D',       kind: 'producer',   headline: '808 architect',           hourly_rate: 90,  city: 'Lagos',       country: 'Nigeria',    skills: ['Afrobeats','Drill','808s'],         rating: 4.8, rating_count: 128 },
  { username: 'beatsbyjay',  full_name: 'BeatzbyJay',    kind: 'producer',   headline: 'Amapiano specialist',     hourly_rate: 75,  city: 'Accra',       country: 'Ghana',       skills: ['Amapiano','Highlife','Logic Pro'],  rating: 4.9, rating_count: 96  },
  { username: 'mixmaster',   full_name: 'MixMaster',     kind: 'engineer',   headline: 'Mixing & mastering',      hourly_rate: 120, city: 'Los Angeles', country: 'USA',         skills: ['Mixing','Mastering','Pro Tools'],   rating: 4.7, rating_count: 87  },
  { username: 'soundkraft',  full_name: 'SoundKraft',    kind: 'songwriter', headline: 'Hooks & toplines',        hourly_rate: 60,  city: 'Nairobi',     country: 'Kenya',       skills: ['Toplines','Hooks','Yoruba/English'],rating: 4.6, rating_count: 74  },
  { username: 'finesse',     full_name: 'Finesse Kid',   kind: 'producer',   headline: 'Drill / trap / Afrobeats', hourly_rate: 110, city: 'London',      country: 'UK',          skills: ['Drill','Trap','FL Studio'],          rating: 4.5, rating_count: 41 },
  { username: 'wavekraft',   full_name: 'WaveKraft',     kind: 'producer',   headline: 'Afro-house architect',    hourly_rate: 95,  city: 'Cape Town',   country: 'South Africa',skills: ['Afro-house','Tech-house','Ableton'], rating: 4.8, rating_count: 68 },
  { username: 'studio_one',  full_name: 'Studio One',    kind: 'engineer',   headline: 'Analogue mastering',      hourly_rate: 150, city: 'Atlanta',     country: 'USA',         skills: ['Mastering','SSL','API'],            rating: 4.9, rating_count: 134 },
  { username: 'ink_pen',     full_name: 'InkPen',        kind: 'songwriter', headline: 'Concept-first writer',     hourly_rate: 70,  city: 'Toronto',     country: 'Canada',      skills: ['Concept','Story','Hooks'],          rating: 4.6, rating_count: 52 },
  { username: 'aria',        full_name: 'Aria',          kind: 'vocalist',   headline: 'Hook vocals · session',    hourly_rate: 80,  city: 'Lagos',       country: 'Nigeria',     skills: ['Hooks','Adlibs','Pidgin'],          rating: 4.7, rating_count: 61 },
  { username: 'soprano',     full_name: 'Soprano',       kind: 'vocalist',   headline: 'Studio backups',          hourly_rate: 65,  city: 'Accra',       country: 'Ghana',       skills: ['Backups','Harmonies','Twi'],        rating: 4.5, rating_count: 38 },
  { username: 'ace_b',       full_name: 'Ace B',         kind: 'artist',     headline: 'Open to features',         hourly_rate: 200, city: 'Lagos',       country: 'Nigeria',     skills: ['Verses','Hooks','Energy'],          rating: 4.9, rating_count: 152 },
  { username: 'lola_q',      full_name: 'Lola Q',        kind: 'artist',     headline: 'Feature vocalist',         hourly_rate: 180, city: 'London',      country: 'UK',          skills: ['Vocals','Bridges','Yoruba'],        rating: 4.8, rating_count: 99 },
  { username: 'maverick',    full_name: 'Maverick',      kind: 'engineer',   headline: 'Mix engineer · vocals',    hourly_rate: 100, city: 'Berlin',      country: 'Germany',     skills: ['Vocal Mix','RX','Mastering'],       rating: 4.7, rating_count: 47 },
  { username: 'topline',     full_name: 'Topline',       kind: 'songwriter', headline: 'Melodic toplines',         hourly_rate: 55,  city: 'Cape Town',   country: 'South Africa',skills: ['Toplines','Demos','Zulu/English'],  rating: 4.5, rating_count: 29 },
];

const COVER = (seed) => `https://picsum.photos/seed/${seed}/600/600`;
const AVATAR = (seed) => `https://picsum.photos/seed/${seed}/300/300`;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randint = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

async function upsertUser({ email, username, full_name, role, bio = null, profile_image_url = null }) {
  // Look up by email OR username so we handle both unique constraints.
  const existing = await pool.query(
    `SELECT id FROM users WHERE email = $1 OR username = $2 LIMIT 1`,
    [email, username]
  );
  if (existing.rowCount > 0) {
    const r = await pool.query(
      `UPDATE users SET
         email = $2, username = $3, full_name = $4, role = $5,
         bio = COALESCE($6, bio),
         profile_image_url = COALESCE($7, profile_image_url),
         is_verified = TRUE
       WHERE id = $1
       RETURNING id, role`,
      [existing.rows[0].id, email, username, full_name, role, bio, profile_image_url]
    );
    return r.rows[0];
  }
  const hash = await bcrypt.hash(PASSWORD, 10);
  const r = await pool.query(
    `INSERT INTO users (email, username, password_hash, full_name, role, bio, profile_image_url, is_verified)
     VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE)
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
  return r.rows[0].id;
}

async function trackExists(artistId, title) {
  const r = await pool.query(`SELECT id FROM tracks WHERE artist_id = $1 AND title = $2`, [artistId, title]);
  return r.rows[0]?.id || null;
}

async function insertTrack(artistId, { title, album, genre }, audioUrl, coverUrl, durationSeconds, streamCount) {
  const r = await pool.query(
    `INSERT INTO tracks (artist_id, title, album, genre, audio_file_url, cover_art_url, duration_seconds, status, stream_count)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'live',$8)
     RETURNING id`,
    [artistId, title, album, genre, audioUrl, coverUrl, durationSeconds, streamCount]
  );
  return r.rows[0].id;
}

(async () => {
  console.log('AfroStream — full-build seed');
  ensureSharedAudio();
  console.log('  shared demo audio:', SHARED_PATH, fs.statSync(SHARED_PATH).size, 'bytes');

  // ---- Artists ----
  const artistRecord = {};
  for (const a of ARTISTS) {
    const email = `${a.username}@afrostream.dev`;
    const u = await upsertUser({
      email, username: a.username, full_name: a.full_name,
      role: 'artist', bio: a.bio, profile_image_url: AVATAR(a.username),
    });
    const aid = await upsertArtist(u.id, { stage_name: a.stage, country: a.country, genres: a.genres });
    artistRecord[a.username] = { user_id: u.id, artist_id: aid, ...a };

    // 2-4 tracks per artist
    const trackCount = randint(2, 4);
    for (let i = 0; i < trackCount; i++) {
      const genre = pick(a.genres);
      const titlePool = TRACK_TEMPLATES[genre] || ['Untitled', 'New Song', 'Demo'];
      const title = pick(titlePool) + ' ' + (i > 0 ? `(${i + 1})` : '');
      const existing = await trackExists(aid, title);
      if (existing) continue;
      const duration = randint(120, 240);
      const streams = randint(800, 50000);
      const album = i < 2 ? 'Singles' : 'EP One';
      await insertTrack(
        aid,
        { title, album, genre },
        SHARED_URL,
        COVER(`${a.username}-${i}`),
        duration,
        streams
      );
    }
    console.log('  artist:', a.stage, '·', a.country, '·', trackCount, 'tracks');
  }

  // ---- Fans ----
  const fanRecord = {};
  for (const f of FANS) {
    const u = await upsertUser({
      email: `${f.username}@afrostream.dev`,
      username: f.username, full_name: f.full_name, role: 'fan',
      profile_image_url: AVATAR(f.username),
    });
    fanRecord[f.username] = { user_id: u.id, ...f };
  }
  console.log(`  fans: ${FANS.length}`);

  // ---- Collaborators ----
  const collabRecord = {};
  for (const c of COLLABORATORS) {
    const u = await upsertUser({
      email: `${c.username}@afrostream.dev`,
      username: c.username, full_name: c.full_name, role: 'fan',
      bio: c.headline, profile_image_url: AVATAR(c.username),
    });
    const r = await pool.query(
      `INSERT INTO collaborators (user_id, kind, headline, hourly_rate_usd, city, country, skills, is_available, rating, rating_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,$8,$9)
       ON CONFLICT (user_id) DO UPDATE SET
         kind=EXCLUDED.kind, headline=EXCLUDED.headline,
         hourly_rate_usd=EXCLUDED.hourly_rate_usd,
         city=EXCLUDED.city, country=EXCLUDED.country, skills=EXCLUDED.skills,
         rating=EXCLUDED.rating, rating_count=EXCLUDED.rating_count
       RETURNING id`,
      [u.id, c.kind, c.headline, c.hourly_rate, c.city, c.country, c.skills, c.rating, c.rating_count]
    );
    collabRecord[c.username] = { user_id: u.id, collab_id: r.rows[0].id, ...c };
  }
  console.log(`  collaborators: ${COLLABORATORS.length}`);

  // ---- Follows: every fan follows 3-6 random artists ----
  const allArtistIds = Object.values(artistRecord).map((a) => a.artist_id);
  for (const f of Object.values(fanRecord)) {
    const n = randint(3, 6);
    const picks = [...allArtistIds].sort(() => 0.5 - Math.random()).slice(0, n);
    for (const aid of picks) {
      await pool.query(
        `INSERT INTO follows (follower_user_id, artist_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [f.user_id, aid]
      );
    }
  }

  // ---- Subscription tiers + sale listings for every artist ----
  for (const a of Object.values(artistRecord)) {
    const aid = a.artist_id;
    await pool.query(`DELETE FROM subscription_tiers WHERE artist_id=$1`, [aid]);
    await pool.query(
      `INSERT INTO subscription_tiers (artist_id, name, price_usd, perks)
       VALUES ($1,'VIP Insider',9.99,'Early access · Behind the scenes · Monthly stems'),
              ($1,'Studio Pass',19.99,'Everything in VIP + monthly listening party'),
              ($1,'Inner Circle',49.99,'All perks + 1-on-1 Zoom + free merch')`,
      [aid]
    );
    await pool.query(`DELETE FROM sale_listings WHERE artist_id=$1`, [aid]);
    await pool.query(
      `INSERT INTO sale_listings (artist_id, title, price_usd, description)
       VALUES ($1,'Beat pack vol. 1',39.00,'10 royalty-free beats · 24-bit WAV'),
              ($1,'Exclusive stems',49.00,'Full session stems · trackouts')`,
      [aid]
    );
  }
  console.log(`  sales + tiers seeded for all ${Object.values(artistRecord).length} artists`);

  // ---- 60-day earnings history across artists ----
  const fanIds = Object.values(fanRecord).map((f) => f.user_id);
  let earningsRowCount = 0;
  for (const a of Object.values(artistRecord)) {
    await pool.query(`DELETE FROM earnings WHERE artist_id=$1`, [a.artist_id]);
    const daysOfActivity = randint(20, 60);
    for (let i = 0; i < daysOfActivity; i++) {
      const kind = pick(['tip', 'tip', 'sale', 'subscription', 'tip']);
      const amount = ({
        tip: pick([3, 5, 7, 10, 15, 25]),
        sale: pick([39, 49]),
        subscription: pick([9.99, 19.99, 49.99]),
      })[kind];
      const note = kind === 'tip' ? pick(['Love this song 🔥', 'Keep it up!', 'Vibes!', 'From Lagos with love', 'New fan from Nairobi'])
        : kind === 'sale' ? pick(['Bought beats', 'Bought stems'])
        : pick(['Joined VIP', 'Upgraded to Studio Pass', 'Inner Circle sign-up']);
      await pool.query(
        `INSERT INTO earnings (artist_id, fan_user_id, kind, amount_usd, note, created_at)
         VALUES ($1,$2,$3,$4,$5, NOW() - ($6 || ' days')::interval - ($7 || ' hours')::interval)`,
        [a.artist_id, pick(fanIds), kind, amount, note, i, randint(0, 23)]
      );
      earningsRowCount++;
    }
  }
  console.log(`  earnings: ${earningsRowCount} rows across ${Object.values(artistRecord).length} artists`);

  // ---- Conversations: each fan messages 1-3 artists or collaborators ----
  const collabUserIds = Object.values(collabRecord).map((c) => c.user_id);
  const artistUserIds = Object.values(artistRecord).map((a) => a.user_id);
  let convCount = 0;
  for (const f of Object.values(fanRecord)) {
    const n = randint(1, 3);
    const targets = [...collabUserIds, ...artistUserIds].sort(() => 0.5 - Math.random()).slice(0, n);
    for (const t of targets) {
      // Skip if existing
      const existing = await pool.query(
        `SELECT cp1.conversation_id
         FROM conversation_participants cp1
         JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
         WHERE cp1.user_id = $1 AND cp2.user_id = $2`,
        [f.user_id, t]
      );
      if (existing.rowCount > 0) continue;

      const conv = await pool.query(`INSERT INTO conversations DEFAULT VALUES RETURNING id`);
      const convId = conv.rows[0].id;
      await pool.query(
        `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1,$2),($1,$3)`,
        [convId, f.user_id, t]
      );
      const msgsCount = randint(2, 6);
      for (let i = 0; i < msgsCount; i++) {
        const sender = i % 2 === 0 ? f.user_id : t;
        const body = i === 0
          ? pick(['Yo! Love your sound 🔥', 'Saw your last drop, mad!', 'Are you taking on features?', 'Need a producer — interested?', 'Big fan from Lagos. Quick question…'])
          : pick(['Send me a brief', 'What\'s the budget?', 'Send the reference track', 'I can do it next week', 'Yeah I\'m down', 'Let\'s talk numbers', 'Love that energy', 'Drop a WhatsApp']);
        await pool.query(
          `INSERT INTO messages (conversation_id, sender_user_id, body, created_at)
           VALUES ($1,$2,$3, NOW() - ($4 || ' hours')::interval)`,
          [convId, sender, body, msgsCount - i]
        );
      }
      convCount++;
    }
  }
  console.log(`  conversations: ${convCount} threads`);

  // ---- Creations: Amaka gets a rich library ----
  if (artistRecord.amaka) {
    const uid = artistRecord.amaka.user_id;
    await pool.query(`DELETE FROM creations WHERE user_id=$1`, [uid]);
    const creations = [
      { kind: 'voice_idea', title: 'Hook — Lagos Lights',       body: 'Sing on the bridge: "Lagos Lights, take me higher"' },
      { kind: 'voice_idea', title: 'Verse idea — Highway Lover', body: 'Drive slow under the lights, sing soft about goodbye' },
      { kind: 'beat',       title: 'Afrobeats beat · 110bpm',    body: null, meta: { bpm: 110, genre: 'Afrobeats', bars: 8  } },
      { kind: 'beat',       title: 'Amapiano beat · 116bpm',     body: null, meta: { bpm: 116, genre: 'Amapiano',  bars: 16 } },
      { kind: 'beat',       title: 'R&B beat · 92bpm',           body: null, meta: { bpm: 92,  genre: 'R&B',       bars: 8  } },
      { kind: 'lyrics',     title: 'Lyrics: late night drives',  body: '[Verse 1]\nLate night drives, city in my view\nLagos lights blinking like they know me too\n[Chorus]\nDrive slow, take it slow\nLagos love, here we go' },
      { kind: 'lyrics',     title: 'Lyrics: Sun Dance hook',     body: '[Hook]\nSun dance, sun dance\nMove like the river runs\nSun dance, sun dance\nUntil my heart\'s undone' },
      { kind: 'translation',title: 'Translate → Yoruba',         body: '[Yoruba]\n\nLagos Lights, ti o ba fẹ́, jọ̀wọ́ máa pẹ̀lú mi\nMa mu, ma mu, gba mi lọ́wọ́\n[chorus] máa wá, máa wá, jọ́wọ́ ku.' },
    ];
    for (const c of creations) {
      await pool.query(
        `INSERT INTO creations (user_id, kind, title, body, meta, status)
         VALUES ($1,$2,$3,$4,$5,'ready')`,
        [uid, c.kind, c.title, c.body, c.meta ? JSON.stringify(c.meta) : null]
      );
    }
    console.log(`  creations: ${creations.length} for Amaka`);
  }

  // ---- Demo fan also has a few creations so the Recent Projects rail isn't empty for fans ----
  if (fanRecord.demo_fan) {
    const uid = fanRecord.demo_fan.user_id;
    await pool.query(`DELETE FROM creations WHERE user_id=$1`, [uid]);
    await pool.query(
      `INSERT INTO creations (user_id, kind, title, body, meta, status) VALUES
        ($1, 'lyrics', 'Lyrics: weekend mood', '[Verse]\nFriday hit, the city alive\n[Chorus]\nLet the weekend ride', NULL, 'ready'),
        ($1, 'beat',   'Hip-Hop beat · 88bpm', NULL, $2, 'ready')`,
      [uid, JSON.stringify({ bpm: 88, genre: 'Hip-Hop', bars: 8 })]
    );
    console.log('  creations: 2 for Demo Fan');
  }

  // ---- Stream rows so trending counts are realistic ----
  // (stream_count column was set above; here we just sample some streams rows for analytics)
  const allFans = Object.values(fanRecord).map((f) => f.user_id);
  const sampleTracks = (await pool.query(`SELECT id FROM tracks LIMIT 30`)).rows;
  for (const t of sampleTracks) {
    const n = randint(3, 15);
    for (let i = 0; i < n; i++) {
      await pool.query(
        `INSERT INTO streams (track_id, user_id, played_at, duration_played_seconds)
         VALUES ($1,$2, NOW() - ($3 || ' hours')::interval, $4)`,
        [t.id, pick(allFans), randint(1, 24 * 14), randint(30, 180)]
      );
    }
  }
  console.log(`  streams: sampled across ${sampleTracks.length} tracks`);

  // ---- Final ----
  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users)         AS users,
      (SELECT COUNT(*) FROM artists)       AS artists,
      (SELECT COUNT(*) FROM tracks WHERE status='live') AS tracks,
      (SELECT COUNT(*) FROM collaborators) AS collaborators,
      (SELECT COUNT(*) FROM earnings)      AS earnings,
      (SELECT COUNT(*) FROM conversations) AS conversations,
      (SELECT COUNT(*) FROM messages)      AS messages,
      (SELECT COUNT(*) FROM creations)     AS creations
  `);
  console.log('\nFinal counts:');
  console.log('  ', counts.rows[0]);
  console.log('\nLogin with any seeded email; password is "password123".');
  console.log('  artist demo: amaka@afrostream.dev  / password123');
  console.log('  fan demo:    fan@afrostream.dev    / password123');
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
