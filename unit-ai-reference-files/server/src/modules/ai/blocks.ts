/** POST /api/ai/blocks/generate — "Create with AI" for one lesson section (see lib/blockAi.ts). */
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { generateBlock } from '../../lib/blockAi.js';
import { planUnit } from '../../lib/unitPlan.js';
import { readRefFiles } from '../../lib/refFiles.js';
import { body } from '../../lib/validate.js';
import { badRequest } from '../../lib/errors.js';
import { authenticate, currentUser, requireRole } from '../../middleware/auth.js';
import { checkQuota, meter } from './slides.js';

export const blocksAiRouter = Router();
const staff = [authenticate, requireRole('super_admin', 'school_admin', 'teacher')];

blocksAiRouter.post('/ai/blocks/generate', ...staff, async (req, res) => {
  const me = currentUser(req);
  const d = body(
    req,
    z.object({
      kind: z.enum(['text', 'video', 'activity', 'pdf', 'link', 'motion', 'gallery', 'sim3d']),
      topic: z.string().trim().min(2).max(300),
      sectionTitle: z.string().trim().max(200).optional(),
      grade: z.number().int().min(1).max(12).optional(),
      instructions: z.string().trim().max(1000).optional(),
      contextHtml: z.string().max(200_000).optional(),
      gallery: z.array(z.object({ url: z.string().max(500), caption: z.string().max(300).optional(), alt: z.string().max(300).optional() })).max(60).optional(),
      files: z.array(z.object({ url: z.string().max(500), name: z.string().max(300).optional() })).max(10).optional(),
    }),
  );
  await checkQuota(me);
  const useAi = env.AI_PROVIDER === 'anthropic' && !!env.ANTHROPIC_API_KEY;
  const refs = d.files?.length ? await readRefFiles(d.files) : [];
  const r = await generateBlock({ ...d, refs }, useAi);
  if (r.tokens) await meter(me, r.tokens);
  res.json(r);
});

/** "Create the whole unit with AI": plan the unit from the teacher's description. */
blocksAiRouter.post('/ai/units/plan', ...staff, async (req, res) => {
  const me = currentUser(req);
  const d = body(
    req,
    z.object({
      prompt: z.string().trim().max(3000).default(''),
      files: z.array(z.object({ url: z.string().max(500), name: z.string().max(300).optional() })).max(10).default([]),
      grade: z.number().int().min(1).max(12).optional(),
      durationMin: z.number().int().min(5).max(600).optional(),
    }),
  );
  if (d.prompt.length < 5 && !d.files.length) throw badRequest('Describe the unit, or attach a file to build it from');
  await checkQuota(me);
  const files = await readRefFiles(d.files);
  const plan = await planUnit(d.prompt, d.grade, d.durationMin, env.AI_PROVIDER === 'anthropic' && !!env.ANTHROPIC_API_KEY, files);
  if (plan.tokens) await meter(me, plan.tokens);
  res.json(plan);
});
