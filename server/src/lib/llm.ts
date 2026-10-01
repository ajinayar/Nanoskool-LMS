/**
 * One place for every AI call in Nanoskool (NanoBot, slides, sections, unit plans, reading files).
 *
 * The provider and API key come from Admin → AI settings (stored encrypted in the database);
 * if nothing is saved there, server/.env is used (AI_PROVIDER, ANTHROPIC_API_KEY, OPENAI_API_KEY).
 *
 *   offline    no AI: every feature gives a ready-made starter draft
 *   anthropic  Claude (Messages API)
 *   openai     ChatGPT models (Chat Completions API)
 *   nanobot    the existing NanoBot service for the tutor chat; content tools work offline
 */
import { env } from '../config/env.js';
import { Setting } from '../models/index.js';
import { HttpError } from './errors.js';
import { logger } from './logger.js';
import { open, seal } from './secretBox.js';

export type AiProvider = 'offline' | 'anthropic' | 'openai' | 'nanobot';
export type LlmContent = { type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } } | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } };
export type LlmMessage = { role: 'user' | 'assistant'; content: string | LlmContent[] };

export const DEFAULT_MODELS = { anthropic: 'claude-sonnet-4-5', openai: 'gpt-4.1' } as const;

interface Stored {
  provider?: AiProvider;
  anthropicKey?: string; // sealed
  openaiKey?: string; // sealed
  anthropicModel?: string;
  openaiModel?: string;
  lastTest?: { provider: string; ok: boolean; message: string; at: string };
}
export interface AiConfig {
  provider: AiProvider;
  model: string;
  key?: string;
  source: 'settings' | 'env';
}

let cache: { at: number; value: Stored | null } | null = null;
async function stored(): Promise<Stored | null> {
  if (cache && Date.now() - cache.at < 15_000) return cache.value;
  const doc = await Setting.findOne({ key: 'ai' }).lean();
  cache = { at: Date.now(), value: (doc?.value as Stored) ?? null };
  return cache.value;
}
export const clearAiCache = () => (cache = null);

/** The provider, model and key every AI feature should use right now. */
export async function aiConfig(): Promise<AiConfig> {
  const s = await stored();
  if (s?.provider) {
    const p = s.provider;
    if (p === 'anthropic') return { provider: p, model: s.anthropicModel || DEFAULT_MODELS.anthropic, key: open(s.anthropicKey), source: 'settings' };
    if (p === 'openai') return { provider: p, model: s.openaiModel || DEFAULT_MODELS.openai, key: open(s.openaiKey), source: 'settings' };
    return { provider: p, model: '', source: 'settings' };
  }
  const e = env.AI_PROVIDER;
  if (e === 'anthropic') return { provider: 'anthropic', model: env.ANTHROPIC_MODEL, key: env.ANTHROPIC_API_KEY, source: 'env' };
  if (e === 'openai') return { provider: 'openai', model: env.OPENAI_MODEL, key: env.OPENAI_API_KEY, source: 'env' };
  return { provider: e === 'nanobot' ? 'nanobot' : 'offline', model: '', source: 'env' };
}

/** The OpenAI key used for pictures (Claude cannot draw), whichever provider writes the text. */
export async function imageKey() {
  const s = await stored();
  const k = s?.openaiKey ? open(s.openaiKey) : env.OPENAI_API_KEY;
  return k || undefined;
}

/** Make one picture with OpenAI's image model. Returns PNG bytes. */
export async function generateImage(prompt: string, size: '1536x1024' | '1024x1024' = '1536x1024'): Promise<Buffer> {
  const key = await imageKey();
  if (!key) throw new HttpError(400, 'no_image_ai', 'Add an OpenAI key in Admin → AI settings to make pictures with AI');
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-image-1', prompt: prompt.slice(0, 3000), size, quality: 'medium', n: 1 }),
  });
  const d = (await r.json().catch(() => ({}))) as { data?: { b64_json?: string }[]; error?: { message?: string } };
  if (!r.ok || !d.data?.[0]?.b64_json) {
    logger.warn({ status: r.status, err: d.error?.message }, 'image generation failed');
    throw new HttpError(502, 'ai_error', d.error?.message?.includes('safety') ? 'That picture could not be made. Try a different description.' : 'The picture could not be made right now. Please try again.');
  }
  return Buffer.from(d.data[0].b64_json, 'base64');
}

/** True when content tools (slides, sections, plans) should call a real AI. */
export async function aiOn() {
  const c = await aiConfig();
  return (c.provider === 'anthropic' || c.provider === 'openai') && !!c.key;
}

/* ------------------------------------------------------------------ settings (admin) */

const last4 = (k?: string) => (k ? `…${k.slice(-4)}` : null);

export async function aiSettingsView() {
  const s = (await stored()) ?? {};
  const c = await aiConfig();
  return {
    provider: c.provider,
    source: c.source,
    anthropic: {
      hasKey: !!open(s.anthropicKey) || (!s.provider && !!env.ANTHROPIC_API_KEY),
      keyHint: last4(open(s.anthropicKey)) ?? (env.ANTHROPIC_API_KEY ? `${last4(env.ANTHROPIC_API_KEY)} (from server/.env)` : null),
      model: s.anthropicModel || env.ANTHROPIC_MODEL || DEFAULT_MODELS.anthropic,
    },
    openai: {
      hasKey: !!open(s.openaiKey) || (!s.provider && !!env.OPENAI_API_KEY),
      keyHint: last4(open(s.openaiKey)) ?? (env.OPENAI_API_KEY ? `${last4(env.OPENAI_API_KEY)} (from server/.env)` : null),
      model: s.openaiModel || env.OPENAI_MODEL || DEFAULT_MODELS.openai,
    },
    nanobotConfigured: !!env.NANOBOT_SERVICE_SECRET,
    lastTest: s.lastTest ?? null,
  };
}

export async function saveAiSettings(p: { provider: AiProvider; anthropicKey?: string | null; openaiKey?: string | null; anthropicModel?: string; openaiModel?: string }, userId: string) {
  const s: Stored = { ...((await stored()) ?? {}) };
  s.provider = p.provider;
  // A key is only changed when a new one is typed (undefined = keep, null = remove)
  if (p.anthropicKey !== undefined) s.anthropicKey = p.anthropicKey ? seal(p.anthropicKey.trim()) : undefined;
  if (p.openaiKey !== undefined) s.openaiKey = p.openaiKey ? seal(p.openaiKey.trim()) : undefined;
  // Carry over keys from server/.env the first time settings are saved, so switching providers keeps working
  if (!s.anthropicKey && p.anthropicKey === undefined && env.ANTHROPIC_API_KEY) s.anthropicKey = seal(env.ANTHROPIC_API_KEY);
  if (!s.openaiKey && p.openaiKey === undefined && env.OPENAI_API_KEY) s.openaiKey = seal(env.OPENAI_API_KEY);
  if (p.anthropicModel) s.anthropicModel = p.anthropicModel.trim();
  if (p.openaiModel) s.openaiModel = p.openaiModel.trim();
  await Setting.updateOne({ key: 'ai' }, { $set: { value: s, updatedBy: userId } }, { upsert: true });
  clearAiCache();
}

export async function recordTest(provider: string, ok: boolean, message: string) {
  const s: Stored = { ...((await stored()) ?? {}), lastTest: { provider, ok, message, at: new Date().toISOString() } };
  await Setting.updateOne({ key: 'ai' }, { $set: { value: s } }, { upsert: true });
  clearAiCache();
}

/** Key for one provider: a new one being tested, the saved one, or server/.env. */
export async function keyFor(provider: 'anthropic' | 'openai', typed?: string) {
  if (typed?.trim()) return typed.trim();
  const s = await stored();
  return open(provider === 'anthropic' ? s?.anthropicKey : s?.openaiKey) ?? (provider === 'anthropic' ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY);
}

/** The models this key can use, newest first (for the model picker). */
export async function listModels(provider: 'anthropic' | 'openai', key: string): Promise<string[]> {
  const r =
    provider === 'anthropic'
      ? await fetch('https://api.anthropic.com/v1/models?limit=100', { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' } })
      : await fetch('https://api.openai.com/v1/models', { headers: { authorization: `Bearer ${key}` } });
  if (r.status === 401 || r.status === 403) throw new HttpError(400, 'ai_key', 'The API key was not accepted. Check it and try again.');
  if (!r.ok) throw new HttpError(502, 'ai_error', `The AI service answered with an error (${r.status}).`);
  const d = (await r.json()) as { data?: { id: string; created?: number; created_at?: string }[] };
  const ids = (d.data ?? []).sort((a, b) => (b.created ?? Date.parse(b.created_at ?? '0') / 1000) - (a.created ?? Date.parse(a.created_at ?? '0') / 1000)).map((m) => m.id);
  // OpenAI lists every kind of model; keep the chat ones
  return provider === 'openai' ? ids.filter((id) => /^(gpt-|o\d|chatgpt-)/.test(id) && !/(audio|realtime|transcribe|tts|image|search|instruct|embedding|moderation)/.test(id)) : ids;
}

/* ------------------------------------------------------------------ calling the AI */

function toOpenAi(c: string | LlmContent[]) {
  if (typeof c === 'string') return c;
  return c.map((p) =>
    p.type === 'text'
      ? { type: 'text', text: p.text }
      : p.type === 'image'
        ? { type: 'image_url', image_url: { url: `data:${p.source.media_type};base64,${p.source.data}` } }
        : { type: 'file', file: { filename: 'reference.pdf', file_data: `data:application/pdf;base64,${p.source.data}` } },
  );
}

/**
 * Ask the configured AI. Returns the text and tokens used.
 * `override` is used by the settings page to test a key before it is saved.
 */
export async function llm(o: { system: string; messages: LlmMessage[]; maxTokens: number }, override?: { provider: 'anthropic' | 'openai'; key: string; model: string }): Promise<{ text: string; tokens: number }> {
  const c = override ? { ...override, source: 'settings' as const } : await aiConfig();
  if ((c.provider !== 'anthropic' && c.provider !== 'openai') || !c.key) throw new HttpError(503, 'ai_unavailable', 'AI is not set up. A super admin can add a Claude or OpenAI key in Admin → AI settings.');
  let r: Response;
  try {
    r =
      c.provider === 'anthropic'
        ? await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-api-key': c.key, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model: c.model, max_tokens: o.maxTokens, system: o.system, messages: o.messages }),
          })
        : await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${c.key}` },
            body: JSON.stringify({ model: c.model, max_completion_tokens: o.maxTokens, messages: [{ role: 'system', content: o.system }, ...o.messages.map((m) => ({ role: m.role, content: toOpenAi(m.content) }))] }),
          });
  } catch (e) {
    logger.warn({ err: String(e), provider: c.provider }, 'AI request failed');
    throw new HttpError(502, 'ai_error', 'Could not reach the AI service. Check the internet connection.');
  }
  if (!r.ok) {
    const bodyText = (await r.text()).slice(0, 400);
    logger.warn({ status: r.status, provider: c.provider, body: bodyText }, 'AI error');
    if (r.status === 401 || r.status === 403) throw new HttpError(502, 'ai_key', 'The AI key was not accepted. A super admin can update it in Admin → AI settings.');
    if (r.status === 404 || /model/i.test(bodyText)) throw new HttpError(502, 'ai_model', `The AI model “${c.model}” is not available for this key. Pick another in Admin → AI settings.`);
    if (r.status === 429) throw new HttpError(502, 'ai_busy', 'The AI service is busy or the account has run out of credit. Try again in a minute.');
    throw new HttpError(502, 'ai_error', 'The AI service did not answer. Try again in a minute.');
  }
  if (c.provider === 'anthropic') {
    const d = (await r.json()) as { content: { type: string; text?: string }[]; usage?: { input_tokens: number; output_tokens: number } };
    return {
      text: d.content
        .filter((x) => x.type === 'text')
        .map((x) => x.text)
        .join(''),
      tokens: (d.usage?.input_tokens ?? 0) + (d.usage?.output_tokens ?? 0),
    };
  }
  const d = (await r.json()) as { choices?: { message?: { content?: string } }[]; usage?: { total_tokens?: number } };
  return { text: d.choices?.[0]?.message?.content ?? '', tokens: d.usage?.total_tokens ?? 0 };
}
