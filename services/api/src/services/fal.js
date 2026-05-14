import { fal } from '@fal-ai/client';

if (process.env.FAL_KEY) {
  fal.config({ credentials: process.env.FAL_KEY });
}

const IMAGE_MODEL = 'fal-ai/flux/schnell';        // legacy thumbnails
const COVER_MODEL = 'fal-ai/flux/dev';             // album covers — higher quality
const VIDEO_MODEL = 'fal-ai/ltx-video';
const AUDIO_MODEL = 'fal-ai/stable-audio';         // text → music

export async function generateThumbnails({ prompt, count = 4 }) {
  if (!process.env.FAL_KEY) throw new Error('FAL_KEY not configured');

  const result = await fal.subscribe(IMAGE_MODEL, {
    input: {
      prompt,
      num_images: Math.min(count, 4),
      image_size: 'square_hd',
      enable_safety_checker: true,
    },
    logs: false,
  });

  const images = (result?.data?.images || result?.images || []).map((img) => ({
    url: img.url,
    width: img.width,
    height: img.height,
  }));

  return { images, model: IMAGE_MODEL };
}

export async function generateShortVideo({ prompt }) {
  if (!process.env.FAL_KEY) throw new Error('FAL_KEY not configured');

  const result = await fal.subscribe(VIDEO_MODEL, {
    input: {
      prompt,
      aspect_ratio: '9:16',
    },
    logs: false,
  });

  const video = result?.data?.video || result?.video;
  return {
    url: video?.url,
    model: VIDEO_MODEL,
  };
}

export function buildThumbnailPrompt({ trackTitle, genre, mood, style }) {
  const parts = [
    `album cover art for "${trackTitle}"`,
    genre ? `${genre} music` : null,
    mood ? `${mood} mood` : null,
    style ? `${style} style` : 'modern, vibrant, cinematic, African aesthetic',
    'high quality, professional album art, no text, no watermark',
  ].filter(Boolean);
  return parts.join(', ');
}

export function buildVideoPrompt({ trackTitle, genre, mood, style }) {
  const parts = [
    `cinematic short music video clip inspired by "${trackTitle}"`,
    genre ? `${genre} music` : null,
    mood ? `${mood} mood` : null,
    style ? `${style} style` : 'vibrant, dynamic motion, African aesthetic',
    'no text overlay, no watermark',
  ].filter(Boolean);
  return parts.join(', ');
}

// ---------- Album cover (FLUX dev) ---------------------------------------
export async function generateAlbumCover({ prompt, image_size = 'square_hd' }) {
  if (!process.env.FAL_KEY) throw new Error('FAL_KEY not configured');
  const result = await fal.subscribe(COVER_MODEL, {
    input: {
      prompt,
      image_size,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: true,
    },
    logs: false,
  });
  const img = (result?.data?.images || result?.images || [])[0];
  return { url: img?.url, width: img?.width, height: img?.height, model: COVER_MODEL };
}

// ---------- Music video scene (LTX) — explicit duration -----------------
export async function generateMusicVideoScene({ prompt, aspect_ratio = '9:16' }) {
  if (!process.env.FAL_KEY) throw new Error('FAL_KEY not configured');
  const result = await fal.subscribe(VIDEO_MODEL, {
    input: { prompt, aspect_ratio },
    logs: false,
  });
  const video = result?.data?.video || result?.video;
  return { url: video?.url, model: VIDEO_MODEL };
}

// ---------- Beat / music gen (stable-audio) ------------------------------
export async function generateBeatAudio({ prompt, seconds_total = 20 }) {
  if (!process.env.FAL_KEY) throw new Error('FAL_KEY not configured');
  const result = await fal.subscribe(AUDIO_MODEL, {
    input: {
      prompt,
      seconds_total,
      steps: 100,
    },
    logs: false,
  });
  const audio = result?.data?.audio_file || result?.audio_file || result?.data?.audio || result?.audio;
  return { url: audio?.url, model: AUDIO_MODEL };
}

export function buildBeatPrompt({ genre, bpm, mood, bars }) {
  const parts = [
    `${genre} beat instrumental`,
    `${bpm} BPM`,
    `${bars} bars`,
    mood ? `${mood} mood` : 'energetic',
    'drums, bass, melodic lead',
    'studio quality, no vocals',
  ].filter(Boolean);
  return parts.join(', ');
}

export function buildCoverPromptFromArtist({ trackTitle, genre, mood, style }) {
  const parts = [
    `album cover artwork for "${trackTitle}"`,
    genre ? `${genre} record sleeve aesthetic` : null,
    mood ? `${mood} mood` : null,
    style ? style : 'modern editorial, cinematic, premium, vibrant, African aesthetic',
    'high resolution, magazine cover quality',
    'no text, no letters, no watermark, no logo',
  ].filter(Boolean);
  return parts.join(', ');
}
