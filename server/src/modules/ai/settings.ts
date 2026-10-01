/** Admin → AI settings: choose Claude or OpenAI (or offline), save the API key encrypted, pick a model, test it. Super admin only. */
import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../lib/audit.js';
import { badRequest } from '../../lib/errors.js';
import { aiSettingsView, DEFAULT_MODELS, keyFor, listModels, llm, recordTest, saveAiSettings } from '../../lib/llm.js';
import { body } from '../../lib/validate.js';
import { authenticate, currentUser, requireRole } from '../../middleware/auth.js';
import { AiUsage } from '../../models/index.js';

export const aiSettingsRouter = Router();
const admin = [authenticate, requireRole('super_admin')];
const key = z.string().trim().min(20, 'That does not look like a full API key').max(300);
const model = z.string().trim().max(100).regex(/^[\w.:\-/]+$/, 'Model names use letters, numbers, dots and dashes');

aiSettingsRouter.get('/admin/ai-settings', ...admin, async (_req, res) => {
  const month = new Date().toISOString().slice(0, 7);
  const usage = await AiUsage.find({ month }).select('tokens').lean();
  res.json({ ...(await aiSettingsView()), usage: { month, tokens: usage.reduce((n, u) => n + (u.tokens ?? 0), 0), users: usage.length }, defaults: DEFAULT_MODELS });
});

aiSettingsRouter.put('/admin/ai-settings', ...admin, async (req, res) => {
  const d = body(
    req,
    z.object({
      provider: z.enum(['offline', 'anthropic', 'openai', 'nanobot']),
      anthropicKey: key.nullable().optional(),
      openaiKey: key.nullable().optional(),
      anthropicModel: model.optional(),
      openaiModel: model.optional(),
    }),
  );
  if (d.provider === 'anthropic' && !d.anthropicKey && !(await keyFor('anthropic'))) throw badRequest('Add a Claude (Anthropic) API key first');
  if (d.provider === 'openai' && !d.openaiKey && !(await keyFor('openai'))) throw badRequest('Add an OpenAI API key first');
  await saveAiSettings(d, currentUser(req).id);
  // Never log the keys themselves
  audit(req, 'ai_settings.update', 'Setting', undefined, { provider: d.provider, anthropicKey: d.anthropicKey === undefined ? 'kept' : d.anthropicKey ? 'changed' : 'removed', openaiKey: d.openaiKey === undefined ? 'kept' : d.openaiKey ? 'changed' : 'removed', anthropicModel: d.anthropicModel, openaiModel: d.openaiModel });
  res.json(await aiSettingsView());
});

/** Models the key can use (key typed now, or the saved one). */
aiSettingsRouter.post('/admin/ai-settings/models', ...admin, async (req, res) => {
  const d = body(req, z.object({ provider: z.enum(['anthropic', 'openai']), key: key.optional() }));
  const k = await keyFor(d.provider, d.key);
  if (!k) throw badRequest('Add the API key first');
  res.json({ models: await listModels(d.provider, k) });
});

/** Sends a tiny request to check the key and model work. */
aiSettingsRouter.post('/admin/ai-settings/test', ...admin, async (req, res) => {
  const d = body(req, z.object({ provider: z.enum(['anthropic', 'openai']), key: key.optional(), model }));
  const k = await keyFor(d.provider, d.key);
  if (!k) throw badRequest('Add the API key first');
  const started = Date.now();
  try {
    const r = await llm({ system: 'You are a connection test. Reply with exactly: Nanoskool AI is ready', messages: [{ role: 'user', content: 'Test' }], maxTokens: 20 }, { provider: d.provider, key: k, model: d.model });
    const msg = `Connected to ${d.model} in ${((Date.now() - started) / 1000).toFixed(1)} s — it replied “${r.text.trim().slice(0, 60)}”.`;
    await recordTest(d.provider, true, msg);
    res.json({ ok: true, message: msg });
  } catch (e) {
    const code = (e as { code?: string }).code;
    const who = d.provider === 'anthropic' ? 'Anthropic' : 'OpenAI';
    const msg =
      code === 'ai_key'
        ? `${who} did not accept this key. Check it was copied in full and that the account is active.`
        : code === 'ai_model'
          ? `The model “${d.model}” is not available for this key. Click “Load my models” and pick one.`
          : code === 'ai_busy'
            ? `${who} is busy or the account has no credit left. Add credit or try again shortly.`
            : e instanceof Error
              ? e.message
              : 'The test failed';
    await recordTest(d.provider, false, msg);
    res.json({ ok: false, message: msg });
  }
});
