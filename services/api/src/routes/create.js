import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { pool } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { keyForUpload, saveBuffer, saveFromUrl } from '../lib/storage.js';
import { writeLyrics, translateLyrics, enhanceBrief } from '../services/claude.js';
import {
  generateBeatAudio, buildBeatPrompt,
  generateAlbumCover, buildCoverPromptFromArtist,
  generateMusicVideoScene,
} from '../services/fal.js';
import { masterAudio } from '../services/mastering.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

router.get('/recent', requireAuth, async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT id, kind, title, prompt, body, audio_url, cover_url, status, meta, created_at
       FROM creations WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 30`,
      [req.user.id]
    );
    res.json({ creations: r.rows });
  } catch (e) { next(e); }
});

router.post('/voice-idea', requireAuth, upload.single('audio'), async (req, res, next) => {
  try {
    const title = (req.body?.title || 'Voice idea').toString().slice(0, 255);
    const note  = (req.body?.note  || '').toString().slice(0, 2000);
    if (!req.file) throw new HttpError(400, 'audio_required');

    const key = keyForUpload(`creations/${req.user.id}/voice`, req.file.originalname || '.webm');
    const url = await saveBuffer(key, req.file.buffer);

    const r = await pool.query(
      `INSERT INTO creations (user_id, kind, title, body, audio_url, status)
       VALUES ($1,'voice_idea',$2,$3,$4,'ready') RETURNING *`,
      [req.user.id, title, note, url]
    );
    res.status(201).json({ creation: r.rows[0] });
  } catch (e) { next(e); }
});

const BeatSchema = z.object({
  bpm: z.coerce.number().int().min(60).max(200).default(110),
  genre: z.string().max(64).default('Afrobeats'),
  mood: z.string().max(120).optional(),
  bars: z.coerce.number().int().min(4).max(32).default(8),
});

router.post('/beat', requireAuth, async (req, res, next) => {
  try {
    const data = BeatSchema.parse(req.body);
    const title = `${data.genre} beat · ${data.bpm}bpm`;
    const prompt = buildBeatPrompt(data);

    // Insert as processing so the UI can poll; we update once Fal returns.
    const ins = await pool.query(
      `INSERT INTO creations (user_id, kind, title, prompt, status, meta)
       VALUES ($1,'beat',$2,$3,'processing',$4) RETURNING *`,
      [req.user.id, title, prompt, JSON.stringify(data)]
    );
    const id = ins.rows[0].id;

    // Run audio gen synchronously — fal.subscribe blocks until ready.
    try {
      const seconds = Math.min(60, Math.max(10, data.bars * (60 / data.bpm) * 4));
      const out = await generateBeatAudio({ prompt, seconds_total: Math.round(seconds) });
      if (!out.url) throw new Error('no audio url returned from fal');
      const key = keyForUpload(`creations/${req.user.id}/beat`, 'beat.wav');
      const stored = await saveFromUrl(key, out.url);
      const meta = { ...data, model: out.model, seconds };
      const upd = await pool.query(
        `UPDATE creations SET audio_url=$1, status='ready', meta=$2 WHERE id=$3 RETURNING *`,
        [stored, JSON.stringify(meta), id]
      );
      res.status(201).json({ creation: upd.rows[0] });
    } catch (err) {
      const meta = { ...data, error: err.message };
      const upd = await pool.query(
        `UPDATE creations SET status='failed', meta=$1 WHERE id=$2 RETURNING *`,
        [JSON.stringify(meta), id]
      );
      throw new HttpError(502, `beat_gen_failed: ${err.message}`);
    }
  } catch (e) { next(e); }
});

// ---------- Mastering ---------------------------------------------------
router.post('/master', requireAuth, upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, 'audio_required');
    const title = (req.body?.title || 'Mastered track').toString().slice(0, 255);

    const original = await saveBuffer(
      keyForUpload(`creations/${req.user.id}/master/original`, req.file.originalname || '.mp3'),
      req.file.buffer
    );

    let mastered;
    try {
      mastered = await masterAudio(req.file.buffer, { format: 'mp3' });
    } catch (err) {
      throw new HttpError(502, `mastering_failed: ${err.message}`);
    }

    const masteredKey = keyForUpload(`creations/${req.user.id}/master/out`, 'mastered.mp3');
    const masteredUrl = await saveBuffer(masteredKey, mastered.buffer);

    const meta = { original_url: original, stats: mastered.stats || null };
    const r = await pool.query(
      `INSERT INTO creations (user_id, kind, title, audio_url, meta, status)
       VALUES ($1,'mastering',$2,$3,$4,'ready') RETURNING *`,
      [req.user.id, title, masteredUrl, JSON.stringify(meta)]
    );
    res.status(201).json({ creation: r.rows[0] });
  } catch (e) { next(e); }
});

// ---------- Album cover -------------------------------------------------
const CoverSchema = z.object({
  intent: z.string().min(2).max(500),
  track_title: z.string().max(120).optional(),
  genre: z.string().max(60).optional(),
  mood: z.string().max(120).optional(),
});

router.post('/cover', requireAuth, async (req, res, next) => {
  try {
    const data = CoverSchema.parse(req.body);

    // Brief enhancement via Claude (Creative-Studio style two-step).
    let brief = '', finalPrompt;
    try {
      const enriched = await enhanceBrief({
        kind: 'album cover',
        intent: data.intent,
        model_hint: 'flux/dev square 1:1',
      });
      brief = enriched.brief;
      finalPrompt = enriched.final_prompt;
    } catch {
      finalPrompt = buildCoverPromptFromArtist({
        trackTitle: data.track_title || 'Untitled',
        genre: data.genre || 'Afrobeats',
        mood: data.mood,
      });
    }

    const ins = await pool.query(
      `INSERT INTO creations (user_id, kind, title, prompt, status, meta)
       VALUES ($1,'cover',$2,$3,'processing',$4) RETURNING *`,
      [req.user.id, `Cover: ${data.intent.slice(0, 60)}`, finalPrompt, JSON.stringify({ brief, ...data })]
    );
    const id = ins.rows[0].id;

    try {
      const out = await generateAlbumCover({ prompt: finalPrompt });
      if (!out.url) throw new Error('no image url from fal');
      const key = keyForUpload(`creations/${req.user.id}/cover`, 'cover.jpg');
      const stored = await saveFromUrl(key, out.url);
      const upd = await pool.query(
        `UPDATE creations SET cover_url=$1, status='ready', meta=$2 WHERE id=$3 RETURNING *`,
        [stored, JSON.stringify({ brief, ...data, model: out.model }), id]
      );
      res.status(201).json({ creation: upd.rows[0] });
    } catch (err) {
      await pool.query(
        `UPDATE creations SET status='failed', meta=$1 WHERE id=$2`,
        [JSON.stringify({ brief, ...data, error: err.message }), id]
      );
      throw new HttpError(502, `cover_gen_failed: ${err.message}`);
    }
  } catch (e) { next(e); }
});

// ---------- Music video scene -------------------------------------------
const SceneSchema = z.object({
  intent: z.string().min(2).max(500),
  aspect_ratio: z.enum(['9:16','16:9','1:1']).default('9:16'),
});

router.post('/scene', requireAuth, async (req, res, next) => {
  try {
    const data = SceneSchema.parse(req.body);

    let brief = '', finalPrompt;
    try {
      const enriched = await enhanceBrief({
        kind: 'music video scene',
        intent: data.intent,
        model_hint: `ltx-video ${data.aspect_ratio}`,
      });
      brief = enriched.brief;
      finalPrompt = enriched.final_prompt;
    } catch {
      finalPrompt = data.intent;
    }

    const ins = await pool.query(
      `INSERT INTO creations (user_id, kind, title, prompt, status, meta)
       VALUES ($1,'scene',$2,$3,'processing',$4) RETURNING *`,
      [req.user.id, `Scene: ${data.intent.slice(0, 60)}`, finalPrompt, JSON.stringify({ brief, ...data })]
    );
    const id = ins.rows[0].id;

    try {
      const out = await generateMusicVideoScene({ prompt: finalPrompt, aspect_ratio: data.aspect_ratio });
      if (!out.url) throw new Error('no video url from fal');
      const key = keyForUpload(`creations/${req.user.id}/scene`, 'scene.mp4');
      const stored = await saveFromUrl(key, out.url);
      const upd = await pool.query(
        `UPDATE creations SET audio_url=$1, status='ready', meta=$2 WHERE id=$3 RETURNING *`,
        [stored, JSON.stringify({ brief, ...data, model: out.model }), id]
      );
      // We store the mp4 in audio_url to keep schema simple. UI knows from kind=scene.
      res.status(201).json({ creation: upd.rows[0] });
    } catch (err) {
      await pool.query(
        `UPDATE creations SET status='failed', meta=$1 WHERE id=$2`,
        [JSON.stringify({ brief, ...data, error: err.message }), id]
      );
      throw new HttpError(502, `scene_gen_failed: ${err.message}`);
    }
  } catch (e) { next(e); }
});

const LyricsSchema = z.object({
  topic: z.string().min(2).max(280),
  vibe: z.string().max(120).optional(),
  language: z.string().max(40).default('English'),
});

const PROMPTS = {
  lyrics: ({ topic, vibe, language }) => `Write a 16-bar verse and 8-bar chorus in ${language} about: ${topic}. Vibe: ${vibe || 'modern Afrobeats'}.`,
  translate: ({ source_text, target_language }) => `Translate the following lyrics to ${target_language}, preserving rhyme and rhythm where possible:\n\n${source_text}`,
};

router.post('/lyrics', requireAuth, async (req, res, next) => {
  try {
    const data = LyricsSchema.parse(req.body);
    const title = `Lyrics: ${data.topic.slice(0, 60)}`;
    const prompt = PROMPTS.lyrics(data);

    let body, meta;
    try {
      const out = await writeLyrics(data);
      body = out.text.trim();
      meta = { ...data, model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6', usage: out.usage };
    } catch (err) {
      // Graceful fallback: heuristic draft so the user still sees something
      // and the failure surfaces in the meta field for debugging.
      body = generateLyricsDraft(data);
      meta = { ...data, error: err.message, fallback: true };
    }

    const r = await pool.query(
      `INSERT INTO creations (user_id, kind, title, prompt, body, status, meta)
       VALUES ($1,'lyrics',$2,$3,$4,'ready',$5) RETURNING *`,
      [req.user.id, title, prompt, body, JSON.stringify(meta)]
    );
    res.status(201).json({ creation: r.rows[0] });
  } catch (e) { next(e); }
});

const TranslateSchema = z.object({
  source_text: z.string().min(2).max(4000),
  target_language: z.string().min(2).max(60),
});

router.post('/translate', requireAuth, async (req, res, next) => {
  try {
    const data = TranslateSchema.parse(req.body);
    const title = `Translate → ${data.target_language}`;
    const prompt = PROMPTS.translate(data);

    let body, meta;
    try {
      const out = await translateLyrics(data);
      body = out.text.trim();
      meta = { target_language: data.target_language, model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6', usage: out.usage };
    } catch (err) {
      body = `[${data.target_language}]\n\n${data.source_text}`;
      meta = { target_language: data.target_language, error: err.message, fallback: true };
    }

    const r = await pool.query(
      `INSERT INTO creations (user_id, kind, title, prompt, body, status, meta)
       VALUES ($1,'translation',$2,$3,$4,'ready',$5) RETURNING *`,
      [req.user.id, title, prompt, body, JSON.stringify(meta)]
    );
    res.status(201).json({ creation: r.rows[0] });
  } catch (e) { next(e); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const r = await pool.query(
      `DELETE FROM creations WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (r.rowCount === 0) throw new HttpError(404, 'creation_not_found');
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

function generateLyricsDraft({ topic, vibe, language }) {
  const v = vibe || 'modern Afrobeats';
  const t = topic.replace(/[\.\?!]+$/, '');
  const lines = [
    `[Verse 1 — ${language}]`,
    `Yeah, I'm thinking 'bout ${t}, every single day`,
    `Lights down low, the city has its way`,
    `Feel the ${v.split(/[ ,]+/)[0] || 'rhythm'} pulling, can't escape the sound`,
    `Heart still racing, feet still on the ground`,
    `Promise to my people, never break the chain`,
    `Through the highs and lows, we keep the same lane`,
    `Hold the line, hold the line, ${t.split(' ')[0] || 'we'} in the frame`,
    `Pen on paper, writing my name, my name`,
    '',
    `[Chorus]`,
    `${t} — that's all I need`,
    `Sky high, free indeed`,
    `Beat drop, fans concede`,
    `${language} loud, planted seed`,
  ];
  return lines.join('\n');
}

export default router;
