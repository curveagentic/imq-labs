import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const exec = promisify(execFile);

/**
 * AI Mastering via FFmpeg.
 *
 * Two-pass EBU R128 loudness normalisation to a streaming-friendly target
 * (-14 LUFS integrated, -1 dB true peak), followed by a soft limiter and
 * gentle high-shelf to add air. Real audio improvement, no external API.
 *
 * Input: any audio file Buffer.
 * Output: mastered MP3 Buffer (constant bitrate 192 kbps).
 */
export async function masterAudio(inputBuffer, { format = 'mp3' } = {}) {
  const tmp = path.join(os.tmpdir(), `afrostream-master-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const inPath = `${tmp}.in`;
  const outPath = `${tmp}.out.${format}`;
  fs.writeFileSync(inPath, inputBuffer);

  try {
    // Pass 1: measure loudness.
    const { stderr: statsStderr } = await exec('ffmpeg', [
      '-hide_banner', '-nostats',
      '-i', inPath,
      '-af', 'loudnorm=I=-14:LRA=11:TP=-1.0:print_format=json',
      '-f', 'null', '-',
    ]).catch((e) => ({ stderr: String(e.stderr || e.message) }));

    const m = statsStderr.match(/\{[\s\S]*?"target_offset"[\s\S]*?\}/);
    let measured = null;
    if (m) { try { measured = JSON.parse(m[0]); } catch {} }

    // Pass 2: apply normalisation + light high-shelf + soft limiter.
    const linearNorm = measured
      ? `loudnorm=I=-14:LRA=11:TP=-1.0:measured_I=${measured.input_i}:measured_LRA=${measured.input_lra}:measured_TP=${measured.input_tp}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true`
      : `loudnorm=I=-14:LRA=11:TP=-1.0`;
    const filter = [
      linearNorm,
      'highshelf=g=2:f=8000',           // gentle air
      'acompressor=threshold=-18dB:ratio=1.6:attack=8:release=180:makeup=2',
      'alimiter=limit=0.95',
    ].join(',');

    await exec('ffmpeg', [
      '-y', '-hide_banner', '-nostats',
      '-i', inPath,
      '-af', filter,
      '-codec:a', format === 'wav' ? 'pcm_s16le' : 'libmp3lame',
      '-b:a', '192k',
      '-ar', '44100',
      outPath,
    ]);

    const buf = fs.readFileSync(outPath);
    return {
      buffer: buf,
      mime: format === 'wav' ? 'audio/wav' : 'audio/mpeg',
      ext: format,
      stats: measured,
    };
  } finally {
    try { fs.unlinkSync(inPath); } catch {}
    try { fs.unlinkSync(outPath); } catch {}
  }
}
