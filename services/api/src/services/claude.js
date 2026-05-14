import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

let client = null;
function getClient() {
  if (client) return client;
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured');
  client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/**
 * Low-level message call. Uses prompt caching on the system prompt so the
 * fixed instructions don't pay full tokens every call.
 */
async function call({ system, user, max_tokens = 2000, temperature = 0.8 }) {
  const c = getClient();
  const resp = await c.messages.create({
    model: MODEL,
    max_tokens,
    temperature,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
  });
  const text = resp.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return { text, usage: resp.usage };
}

const LYRICS_SYSTEM = `You are a Lagos-trained songwriter who writes hit records for African artists. Your output is structured, performable lyrics — not poetry, not essay.

Rules:
- Always return ONLY the lyrics. No preamble, no explanation, no quote marks around the song.
- Use song structure tags: [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], [Outro].
- 16 bars per verse, 8 bars per chorus, by default.
- Match the requested language. If the user says "Pidgin", write Naija Pidgin English, not standard English.
- If a language other than English is requested, write the bulk in that language but you may sprinkle English ad-libs where culturally accurate (Afrobeats and Amapiano routinely do this).
- Use real, singable lines — internal rhyme, syllable count that flows.
- No filler placeholders like "[insert hook here]".
- No content warnings, no AI disclaimers.

Adapt your style to the requested vibe (e.g. modern Afrobeats = melodic, romantic, hook-heavy; drill = sharp, percussive; gospel = scriptural references, lift).`;

export async function writeLyrics({ topic, vibe, language }) {
  const user = [
    `Write a full song.`,
    `Topic / hook: ${topic}`,
    `Vibe: ${vibe || 'modern Afrobeats'}`,
    `Primary language: ${language || 'English'}`,
    ``,
    `Output: structured lyrics with [Verse 1], [Chorus], [Verse 2], [Bridge] sections. No commentary.`,
  ].join('\n');
  return call({ system: LYRICS_SYSTEM, user, max_tokens: 1500, temperature: 0.9 });
}

const TRANSLATE_SYSTEM = `You are a world-class song translator for African and diaspora music. You translate lyrics from one language to another while preserving:
- Rhyme scheme (or replacing with culturally equivalent rhyme)
- Syllable count per line (so the original melody still scans)
- Cultural idioms (you translate the meaning, not the literal words)
- Song structure tags ([Verse], [Chorus] etc.) — keep them exactly

You output ONLY the translated lyrics. No preamble. No commentary. No notes. No quote marks around the song.

If the target language is one you write less commonly (e.g. Pidgin, Twi, Yoruba), prioritise singability and cultural feel over literal accuracy. If a word lacks a direct translation, use the closest culturally-equivalent expression.`;

export async function translateLyrics({ source_text, target_language }) {
  const user = [
    `Target language: ${target_language}`,
    ``,
    `Original lyrics:`,
    `---`,
    source_text,
    `---`,
    ``,
    `Output: the same song, translated into ${target_language}, preserving structure tags and melodic flow. No commentary.`,
  ].join('\n');
  return call({ system: TRANSLATE_SYSTEM, user, max_tokens: 2000, temperature: 0.7 });
}

/**
 * Brief enhancement layer — Creative Studio methodology in one shot.
 * Turns a casual user intent into a structured art direction brief for image/audio/video models.
 *
 * Returns { brief, final_prompt } so we can persist both and let the user
 * iterate on either.
 */
const BRIEF_SYSTEM = `You are an Art Director for a music production app. You take a casual user request and turn it into a precise, model-ready generation brief.

Output format (strict JSON, no markdown fence, no preamble):
{
  "brief": "2-3 sentence art direction stating subject, style, mood, lighting, palette, composition",
  "final_prompt": "single-line prompt optimised for the named model, dense with concrete visual nouns and adjectives. Negative-prompt safe (no 'avoid' phrasing). 300-500 chars. No text in image."
}

For ALBUM COVER targets: square composition, no faces unless the user specifically wants a portrait cover, leave room for a future title overlay, premium magazine-grade quality.
For MUSIC VIDEO SCENE targets: cinematic 16:9 framing, camera motion notes, lighting direction, no on-screen text.
For PRODUCER PORTRAIT targets: 1:1 portrait, studio environment, soft cinematic lighting.

Never output anything other than the JSON object.`;

export async function enhanceBrief({ kind, intent, model_hint }) {
  const user = [
    `Target: ${kind}`,
    `Model hint: ${model_hint || 'general image model'}`,
    `User intent: ${intent}`,
    ``,
    `Return the JSON object as specified.`,
  ].join('\n');
  const { text } = await call({ system: BRIEF_SYSTEM, user, max_tokens: 800, temperature: 0.7 });
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    const parsed = JSON.parse(text.slice(start, end + 1));
    return parsed;
  } catch {
    // Fallback: use the raw text as the prompt, leave brief empty.
    return { brief: '', final_prompt: text.trim() };
  }
}
