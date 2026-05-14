// Generate real images for the AfroStream demo via the Higgsfield CLI.
//
// What it covers:
//   - Artist profile portraits (Soul V2, country/genre-tuned)
//   - Collaborator portraits (Soul V2, kind-tuned)
//   - Fan portraits (Soul V2, diverse)
//   - Album cover art per artist (GPT Image 2, genre-tuned)
//
// Idempotent: skips any local file that already exists. Updates the database
// URLs at the end. Parallelism kept conservative (4 in flight) so the CLI
// doesn't choke and the user's credits aren't spent re-trying.
//
// Usage:
//   node --env-file=services/api/.env scripts/generate_images.js
//   FORCE=1 ...    # regenerate even if local file exists
//   ONLY=artists ...  # restrict batch: artists | collaborators | fans | covers

import { Pool } from 'pg';
import path from 'node:path';
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STORAGE_DIR = path.join(ROOT, 'infra/storage/data');
const IMG_DIR = path.join(STORAGE_DIR, 'seed/_images');
const PUBLIC_BASE = process.env.STORAGE_PUBLIC_BASE_URL || 'http://localhost:4000/storage';
const PUBLIC_KEY_PREFIX = 'seed/_images';

const PARALLELISM = 4;
const FORCE = process.env.FORCE === '1';
const ONLY = (process.env.ONLY || '').toLowerCase();

fs.mkdirSync(IMG_DIR, { recursive: true });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function publicUrlFor(filename) {
  return `${PUBLIC_BASE}/${PUBLIC_KEY_PREFIX}/${filename}`;
}

async function downloadTo(url, dest) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${r.status} ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return dest;
}

function higgsfield(args, timeoutMs = 240_000) {
  return new Promise((resolve, reject) => {
    execFile('higgsfield', args, { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(`higgsfield failed: ${err.message}\n${stderr}`));
      resolve(stdout);
    });
  });
}

async function generateImage({ model, prompt, aspect = '1:1', quality }) {
  const args = [
    'generate', 'create', model,
    '--prompt', prompt,
    '--aspect_ratio', aspect,
    '--wait',
    '--json',
  ];
  if (quality) args.push('--quality', quality);
  const out = await higgsfield(args);
  // CLI emits one or more concatenated JSON values. Find the first `[`.
  const start = out.indexOf('[');
  const json = JSON.parse(out.slice(start));
  const item = json[0];
  if (!item?.result_url) throw new Error('no result_url in response');
  return item.result_url;
}

async function generateAndStore({ slug, model, prompt, aspect = '1:1', quality }) {
  const filename = `${slug}.png`;
  const dest = path.join(IMG_DIR, filename);
  if (!FORCE && fs.existsSync(dest) && fs.statSync(dest).size > 5000) {
    return { slug, url: publicUrlFor(filename), cached: true };
  }
  const url = await generateImage({ model, prompt, aspect, quality });
  await downloadTo(url, dest);
  return { slug, url: publicUrlFor(filename), cached: false };
}

// -------- Prompt builders -----------------------------------------------

const COUNTRY_LOOK = {
  Nigeria: 'rich West African features, dark melanin skin tone',
  Ghana: 'West African features, dark skin tone, warm complexion',
  Kenya: 'East African features, dark melanin skin tone',
  'South Africa': 'Southern African features, dark melanin skin tone',
  Senegal: 'West African features, dark melanin skin tone',
  Egypt: 'North African features, golden brown skin tone',
  Ethiopia: 'East African features, warm bronze skin tone',
  USA: 'African-American features',
  UK: 'Black British features',
  Canada: 'Black Canadian features',
  Germany: 'Afro-European features',
};

const GENRE_VIBE = {
  Afrobeats: 'modern Lagos street fashion, neon accents, gold chain, confident smile',
  'R&B': 'soft warm lighting, satin or velvet textures, intimate studio mood',
  Highlife: 'classic warm tones, vintage Accra aesthetic, suede or linen',
  Afrohouse: 'cinematic club lighting, modern minimalist outfit',
  'Hip-Hop': 'streetwear, oversized hoodie, dramatic shadows, urban backdrop',
  Amapiano: 'Joburg festival energy, bucket hat, bright statement piece',
  Afropop: 'sunlit outdoor portrait, bright colorful African print',
  Gengetone: 'Nairobi street vibe, tracksuit, cool stance',
  Drill: 'monochrome cold cinematic lighting, balaclava-adjacent silhouette, sharp jawline',
  Afrobeat: 'jazz-influenced earthy tones, saxophone or instrument in shot, intellectual look',
  Jazz: 'moody amber lighting, dark suit, contemplative mood',
  Soul: 'warm dim spotlight, vintage microphone aesthetic',
  Gospel: 'soft halo lighting, modest elegant attire, serene expression',
  Mbalax: 'Dakar coastal sunlight, traditional-modern fusion outfit',
  Shaabi: 'Cairo nightlife glow, gold jewelry, sharp eye makeup',
  Mahraganat: 'Cairo street energy, oversized sunglasses, neon backdrop',
  Bongo: 'Dar es Salaam warm sunlight, colourful kitenge',
  House: 'sleek modern minimalist palette, monochrome',
  'Ethio-Jazz': 'soft Addis Ababa twilight, traditional pattern accent, vintage piano keys',
};

function artistPrompt(a) {
  const features = COUNTRY_LOOK[a.country] || 'African features, dark melanin skin tone';
  const genre = a.genres?.[0] || 'Afrobeats';
  const vibe = GENRE_VIBE[genre] || 'cinematic studio portrait';
  const female = ['amaka','sade_b','efya','wanjiku','thandi','lerato','aida'].includes(a.username);
  const subject = female ? 'a confident young African woman' : 'a confident young African man';
  return [
    `Professional editorial portrait headshot of ${subject},`,
    `${features},`,
    `${vibe},`,
    `${genre} artist energy, ${a.country} cultural cues,`,
    `cinematic depth of field, soft red and gold rim light, dark background,`,
    `looking directly at camera, sharp focus on eyes,`,
    `magazine cover quality, no text, no watermark, no logo`,
  ].join(' ');
}

function collabPrompt(c) {
  const female = ['aria','soprano','lola_q','topline'].includes(c.username);
  const subject = female ? 'a young African woman' : 'a young African man';
  const features = COUNTRY_LOOK[c.country] || 'African features, dark melanin skin tone';
  const kindVibe = {
    producer:   'in a modern home studio, headphones around neck, MIDI keyboard behind, focused expression',
    engineer:   'at a mixing console, large studio monitors, subtle blue rim light, technical mood',
    songwriter: 'with a leather notebook and pen, soft natural window light, thoughtful expression',
    vocalist:   'in a vocal booth with a large diaphragm microphone, dramatic spotlight',
    artist:     'in fashion-forward studio attire, confident pose, neutral backdrop',
  }[c.kind] || 'studio portrait';
  return [
    `Professional portrait of ${subject}, ${c.kind} for music production,`,
    `${features},`,
    `${kindVibe},`,
    `${c.city} aesthetic,`,
    `cinematic editorial lighting, depth of field,`,
    `looking thoughtfully off-camera or directly at lens,`,
    `magazine quality, no text, no watermark, no logo`,
  ].join(' ');
}

function fanPrompt(f) {
  const seed = f.username;
  const themes = [
    'wearing wireless headphones, vibing to a song, soft pastel background, warm smile',
    'walking through a vibrant Lagos market, candid moment, golden hour',
    'sitting at a sunny café in Accra, phone in hand, relaxed pose',
    'at a Nairobi rooftop bar, neon city lights, joyful expression',
    'in a Joburg amapiano party, dancing, cinematic neon light',
    'in a Dakar street, traditional-modern outfit, sunlit candid',
    'sitting on a couch with vinyl records, warm bedroom light, smiling',
    'African diaspora university student, library backdrop, smart casual',
    'fashion-forward in colourful Ankara print, daylight portrait',
    'late-evening commute portrait, headphones, ambient city blur',
  ];
  const idx = Math.abs(hash(seed)) % themes.length;
  return [
    `Candid lifestyle portrait of a young African music fan,`,
    `African features, dark melanin skin tone,`,
    `${themes[idx]},`,
    `cinematic depth of field, natural color grade,`,
    `looking authentic, magazine quality, no text, no watermark, no logo`,
  ].join(' ');
}

function coverPrompt(a) {
  const genre = a.genres?.[0] || 'Afrobeats';
  const themeMap = {
    Afrobeats: 'sunset Lagos skyline, neon accents, abstract motion blur of dancers',
    'R&B': 'velvet curtain in deep red, single vintage microphone, warm ambient glow',
    Highlife: 'palm trees at golden hour, vintage warm tones, retro Accra coastline',
    Afrohouse: 'modern abstract waves of gold and black, club lighting',
    'Hip-Hop': 'concrete urban texture, graffiti, cinematic shadow play, bold typography space',
    Amapiano: 'log drum motif abstracted into geometry, deep purple and gold',
    Afropop: 'bright tropical palette, abstract flowers and dancing shapes',
    Gengetone: 'Nairobi street mural, spray paint texture, bold high contrast',
    Drill: 'cold cinematic monochrome with single red highlight, geometric grid',
    Afrobeat: 'saxophone silhouette over Calabar sunset, vintage poster aesthetic',
    Jazz: 'smoky piano keys in warm amber light, vintage poster feel',
    Soul: 'velvet red curtain, vinyl record sleeve aesthetic, vintage soft grain',
    Gospel: 'soft golden light through stained glass, ethereal mood',
    Mbalax: 'Dakar coastline at twilight, percussion silhouettes',
    Shaabi: 'Cairo night street, neon Arabic-inspired calligraphy negative space, no text',
    Mahraganat: 'high-saturation Cairo neon, futuristic shaabi aesthetic',
    Bongo: 'Dar es Salaam beach palms, warm orange and turquoise palette',
    House: 'minimalist deep red and black, single bold geometric shape',
    'Ethio-Jazz': 'Addis Ababa highlands at dusk, vintage album sleeve grain',
  };
  return [
    `Album cover artwork, square format,`,
    `${genre} record sleeve,`,
    `${themeMap[genre] || 'cinematic abstract African aesthetic'},`,
    `bold, premium, modern editorial design,`,
    `clean composition with room for a title,`,
    `award-winning album art, no text, no letters, no watermark, no logo, no faces`,
  ].join(' ');
}

function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }

// -------- Batch runner ---------------------------------------------------

async function runBatch(jobs, label) {
  console.log(`\n${label} — ${jobs.length} job(s)`);
  let done = 0;
  const results = [];
  for (let i = 0; i < jobs.length; i += PARALLELISM) {
    const slice = jobs.slice(i, i + PARALLELISM);
    const settled = await Promise.allSettled(slice.map(async (j) => {
      const r = await generateAndStore(j.gen);
      done++;
      process.stdout.write(`  [${done}/${jobs.length}] ${r.cached ? 'cached' : 'gen'}  ${j.gen.slug}\n`);
      return { job: j, ...r };
    }));
    for (const s of settled) {
      if (s.status === 'fulfilled') results.push(s.value);
      else console.error('  !! failed:', s.reason?.message || s.reason);
    }
  }
  return results;
}

// -------- Main ----------------------------------------------------------

(async () => {
  console.log('AfroStream — Higgsfield image generation');
  console.log('  storage:', IMG_DIR);
  console.log('  force:', FORCE, ' only:', ONLY || '(all)');

  const artists = (await pool.query(`
    SELECT a.id as artist_id, a.stage_name, a.country, a.genres,
           u.id as user_id, u.username, u.full_name
    FROM artists a JOIN users u ON u.id = a.user_id
    ORDER BY a.created_at ASC
  `)).rows;

  const collaborators = (await pool.query(`
    SELECT c.id, c.kind, c.city, c.country,
           u.id as user_id, u.username, u.full_name
    FROM collaborators c JOIN users u ON u.id = c.user_id
    ORDER BY c.created_at ASC
  `)).rows;

  // Pick the fans (users with role=fan, but exclude collaborator-user records
  // which are stored as role=fan too — find by EXISTENCE in collaborators).
  const fans = (await pool.query(`
    SELECT u.id as user_id, u.username, u.full_name
    FROM users u
    WHERE u.role = 'fan'
      AND NOT EXISTS (SELECT 1 FROM collaborators c WHERE c.user_id = u.id)
    ORDER BY u.created_at ASC
  `)).rows;

  console.log(`\n  found: ${artists.length} artists · ${collaborators.length} collaborators · ${fans.length} fans`);

  // ----- Build job lists -----
  const artistJobs = artists.map((a) => ({
    kind: 'artist', record: a,
    gen: {
      slug: `artist_${a.username}`,
      model: 'text2image_soul_v2',
      prompt: artistPrompt(a),
      aspect: '1:1',
      quality: '1.5k',
    },
  }));

  const collabJobs = collaborators.map((c) => ({
    kind: 'collaborator', record: c,
    gen: {
      slug: `collab_${c.username}`,
      model: 'text2image_soul_v2',
      prompt: collabPrompt(c),
      aspect: '1:1',
      quality: '1.5k',
    },
  }));

  const fanJobs = fans.map((f) => ({
    kind: 'fan', record: f,
    gen: {
      slug: `fan_${f.username}`,
      model: 'text2image_soul_v2',
      prompt: fanPrompt(f),
      aspect: '1:1',
      quality: '1.5k',
    },
  }));

  const coverJobs = artists.map((a) => ({
    kind: 'cover', record: a,
    gen: {
      slug: `cover_${a.username}`,
      model: 'gpt_image_2',
      prompt: coverPrompt(a),
      aspect: '1:1',
      quality: 'high',
    },
  }));

  const allBatches = [
    { label: 'Album covers',         jobs: coverJobs,   only: 'covers' },
    { label: 'Artist portraits',     jobs: artistJobs,  only: 'artists' },
    { label: 'Collaborator portraits', jobs: collabJobs, only: 'collaborators' },
    { label: 'Fan portraits',        jobs: fanJobs,     only: 'fans' },
  ];

  const allResults = {};
  for (const batch of allBatches) {
    if (ONLY && ONLY !== batch.only) continue;
    const r = await runBatch(batch.jobs, batch.label);
    allResults[batch.only] = r;
  }

  // ----- Update DB --------------------------------------------------------
  console.log('\nUpdating database URLs...');

  for (const r of (allResults.artists || [])) {
    await pool.query(`UPDATE users SET profile_image_url = $1 WHERE id = $2`, [r.url, r.job.record.user_id]);
  }
  for (const r of (allResults.collaborators || [])) {
    await pool.query(`UPDATE users SET profile_image_url = $1 WHERE id = $2`, [r.url, r.job.record.user_id]);
  }
  for (const r of (allResults.fans || [])) {
    await pool.query(`UPDATE users SET profile_image_url = $1 WHERE id = $2`, [r.url, r.job.record.user_id]);
  }
  for (const r of (allResults.covers || [])) {
    await pool.query(`UPDATE tracks SET cover_art_url = $1 WHERE artist_id = $2`, [r.url, r.job.record.artist_id]);
  }

  console.log('Done. Image URLs written to users.profile_image_url and tracks.cover_art_url.');
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
