/** POST /api/ai/blocks/generate — "Create with AI" for one lesson section (see lib/blockAi.ts). */
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { generateBlock } from '../../lib/blockAi.js';
import { planUnit } from '../../lib/unitPlan.js';
import { aiOn } from '../../lib/llm.js';
import { readRefFiles } from '../../lib/refFiles.js';
import { body } from '../../lib/validate.js';
import { badRequest } from '../../lib/errors.js';
import { authenticate, currentUser, requireRole } from '../../middleware/auth.js';
import { checkQuota, meter } from './slides.js';
import { generateQuestions, stripHtml } from '../../lib/quizAi.js';
import { accessibleCourseIds } from '../../lib/access.js';
import { forbidden } from '../../lib/errors.js';
import { Unit } from '../../models/index.js';

export const blocksAiRouter = Router();
const staff = [authenticate, requireRole('super_admin', 'school_admin', 'teacher')];

blocksAiRouter.post('/ai/blocks/generate', ...staff, async (req, res) => {
  const me = currentUser(req);
  const d = body(
    req,
    z.object({
      kind: z.enum(['text', 'video', 'activity', 'pdf', 'link', 'motion', 'gallery', 'sim3d', 'check']),
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
  const useAi = await aiOn();
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
  const plan = await planUnit(d.prompt, d.grade, d.durationMin, await aiOn(), files);
  if (plan.tokens) await meter(me, plan.tokens);
  res.json(plan);
});

/** "Create questions with AI" in the quiz builder: from the course's lessons (chapter or units), a topic, or both. */
blocksAiRouter.post('/ai/quizzes/generate', ...staff, async (req, res) => {
  const me = currentUser(req);
  const d = body(
    req,
    z.object({
      topic: z.string().trim().max(300).optional(),
      courseId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
      chapterId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
      unitIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(40).optional(),
      grade: z.number().int().min(1).max(12).optional(),
      count: z.number().int().min(1).max(20).default(5),
      types: z.array(z.enum(['single', 'multiple', 'true_false', 'short'])).min(1).max(4).default(['single']),
      difficulty: z.enum(['easy', 'mixed', 'hard']).default('mixed'),
      avoid: z.array(z.string().max(500)).max(200).optional(),
    }),
  );
  let sourceText = '';
  if (d.courseId || d.chapterId || d.unitIds?.length) {
    const filter = d.unitIds?.length ? { _id: { $in: d.unitIds } } : d.chapterId ? { chapterId: d.chapterId } : { courseId: d.courseId };
    const units = await Unit.find(filter).select('courseId title summary body blocks').sort({ position: 1 }).limit(60).lean();
    const allowed = await accessibleCourseIds(me);
    if (allowed !== 'all' && units.some((u) => !allowed.includes(String(u.courseId)))) throw forbidden();
    sourceText = units
      .map((u) => [u.title, u.summary, stripHtml(u.body ?? ''), ...((u.blocks ?? []) as { title?: string; body?: string; question?: string }[]).map((b) => `${b.title ?? ''} ${stripHtml(b.body ?? '')}`)].filter(Boolean).join('. '))
      .join('\n\n');
  }
  if (!sourceText && (d.topic?.length ?? 0) < 2) throw badRequest('Choose lessons to write questions from, or type a topic');
  await checkQuota(me);
  const r = await generateQuestions({ ...d, sourceText }, await aiOn());
  if (r.tokens) await meter(me, r.tokens);
  res.json(r);
});
