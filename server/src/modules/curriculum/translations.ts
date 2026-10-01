/**
 * Unit languages and quick checks.
 *   GET    /units/:id/translations            list languages with status (draft / approved / out of date)
 *   GET    /units/:id/translations/:lang      the English source and the translation, side by side
 *   POST   /units/:id/translations/:lang/generate   AI draft (or a copy of the English to translate by hand)
 *   PUT    /units/:id/translations/:lang      save edits; status "approved" makes it visible to students
 *   DELETE /units/:id/translations/:lang
 *   POST   /units/:id/checks/:blockId         a student answers a quick check
 */
import { Router } from 'express';
import { z } from 'zod';
import { badRequest, notFound } from '../../lib/errors.js';
import { LANG_CODES, LANGUAGES, type LangCode } from '../../lib/languages.js';
import { checkQuota, meter } from '../ai/slides.js';
import { hashOf, sourceOf, translateUnit, type TContent } from '../../lib/translate.js';
import { body, idParam } from '../../lib/validate.js';
import { audit } from '../../lib/audit.js';
import { authenticate, currentUser, requireRole } from '../../middleware/auth.js';
import { assertCourseAccess } from '../../lib/access.js';
import { CheckAnswer, Course, Unit } from '../../models/index.js';

export const translationsRouter = Router();
const admin = [authenticate, requireRole('super_admin')];
const langParam = (raw: unknown) => {
  const r = z.enum(LANG_CODES).safeParse(raw);
  if (!r.success || r.data === 'en') throw badRequest('Choose a language other than English');
  return r.data as LangCode;
};

/** Replace one language's translation (the whole list is rewritten: simple and works on every MongoDB-compatible database). */
async function putTranslation(unitId: string, lang: string, doc: Record<string, unknown>) {
  const u = await loadUnit(unitId);
  const list = u.toObject().translations.filter((x) => x.lang !== lang);
  await Unit.updateOne({ _id: u._id }, { $set: { translations: [...list, doc] } });
  const fresh = await loadUnit(unitId);
  return fresh.translations.find((x) => x.lang === lang)!.toObject();
}

async function loadUnit(id: string) {
  const u = await Unit.findById(id);
  if (!u) throw notFound('Unit');
  return u;
}

translationsRouter.get('/units/:id/translations', ...admin, async (req, res) => {
  const u = await loadUnit(idParam(req));
  const hash = hashOf(sourceOf(u.toObject()));
  res.json({
    languages: Object.entries(LANGUAGES)
      .filter(([c]) => c !== 'en')
      .map(([code, l]) => {
        const t = u.translations.find((x) => x.lang === code);
        return { code, ...l, status: t?.status ?? null, by: t?.by ?? null, updatedAt: t?.updatedAt ?? null, outOfDate: !!t && t.sourceHash !== hash };
      }),
  });
});

translationsRouter.get('/units/:id/translations/:lang', ...admin, async (req, res) => {
  const lang = langParam(req.params.lang);
  const u = await loadUnit(idParam(req));
  const source = sourceOf(u.toObject());
  const t = u.translations.find((x) => x.lang === lang);
  res.json({ lang, language: LANGUAGES[lang], source, translation: t ? { ...t.toObject(), outOfDate: t.sourceHash !== hashOf(source) } : null });
});

translationsRouter.post('/units/:id/translations/:lang/generate', ...admin, async (req, res) => {
  const me = currentUser(req);
  const lang = langParam(req.params.lang);
  const u = await loadUnit(idParam(req));
  await checkQuota(me);
  const course = await Course.findById(u.courseId).select('grades').lean();
  const grade = course?.grades?.length ? Math.min(...course.grades) : undefined;
  const source = sourceOf(u.toObject());
  const r = await translateUnit(source, lang, grade);
  if (r.tokens) await meter(me, r.tokens);
  const doc = { lang, status: 'draft' as const, by: r.by, title: r.content.title, summary: r.content.summary, blocks: r.content.blocks, objectives: r.content.objectives, sourceHash: hashOf(source), updatedBy: me.id };
  const fresh = await putTranslation(String(u._id), lang, doc);
  audit(req, 'unit.translate', 'Unit', u._id, { lang, by: r.by });
  res.json({ by: r.by, translation: { ...fresh, outOfDate: false } });
});

const tBlock = z.object({
  id: z.string().max(40),
  kind: z.string().max(20).optional(),
  title: z.string().max(200).optional(),
  body: z.string().max(300_000).optional(),
  slides: z.array(z.object({ title: z.string().max(300).optional(), subtitle: z.string().max(300).optional(), bullets: z.array(z.string().max(500)).max(12).optional(), bullets2: z.array(z.string().max(500)).max(12).optional(), notes: z.string().max(4000).optional(), imageAlt: z.string().max(300).optional() })).max(80).optional(),
  gallery: z.array(z.object({ caption: z.string().max(300).optional(), alt: z.string().max(300).optional() })).max(60).optional(),
  question: z.string().max(1000).optional(),
  choices: z.array(z.string().max(300)).max(6).optional(),
  explain: z.string().max(2000).optional(),
  help: z.string().max(20_000).optional(),
});

translationsRouter.put('/units/:id/translations/:lang', ...admin, async (req, res) => {
  const me = currentUser(req);
  const lang = langParam(req.params.lang);
  const d = body(req, z.object({ title: z.string().trim().min(1).max(200), summary: z.string().max(1000).optional(), objectives: z.array(z.object({ id: z.string(), title: z.string().max(300).optional(), criteria: z.string().max(500).optional() })).max(30).default([]), blocks: z.array(tBlock).max(60).default([]), status: z.enum(['draft', 'approved']) }));
  const u = await loadUnit(idParam(req));
  const source = sourceOf(u.toObject());
  const { cleanHtml } = await import('../../lib/sanitize.js');
  const content: TContent = { title: d.title, summary: d.summary, objectives: d.objectives, blocks: d.blocks.map((b) => ({ ...b, body: b.body !== undefined ? cleanHtml(b.body) : undefined, help: b.help !== undefined ? cleanHtml(b.help) : undefined })) };
  const old = u.translations.find((x) => x.lang === lang);
  const doc = {
    lang,
    status: d.status,
    by: old?.by === 'ai' ? 'ai' : 'teacher',
    ...content,
    // Approving confirms the translation matches the current English
    sourceHash: d.status === 'approved' ? hashOf(source) : (old?.sourceHash ?? hashOf(source)),
    updatedBy: me.id,
    ...(d.status === 'approved' ? { reviewedBy: me.id, reviewedAt: new Date() } : {}),
  };
  const t = await putTranslation(String(u._id), lang, doc);
  if (d.status === 'approved') audit(req, 'unit.translation.approve', 'Unit', u._id, { lang });
  res.json({ translation: { ...t, outOfDate: t.sourceHash !== hashOf(source) } });
});

translationsRouter.delete('/units/:id/translations/:lang', ...admin, async (req, res) => {
  const lang = langParam(req.params.lang);
  const u = await loadUnit(idParam(req));
  await Unit.updateOne({ _id: u._id }, { $set: { translations: u.toObject().translations.filter((x) => x.lang !== lang) } });
  res.json({ ok: true });
});

/** A student answers a quick check. Right → why it is right; wrong → a simpler explanation and another try. */
translationsRouter.post('/units/:id/checks/:blockId', authenticate, requireRole('student'), async (req, res) => {
  const me = currentUser(req);
  const { choice, lang } = body(req, z.object({ choice: z.number().int().min(0).max(5), lang: z.enum(LANG_CODES).optional() }));
  const u = await Unit.findById(idParam(req)).select('courseId blocks translations').lean();
  if (!u) throw notFound('Unit');
  await assertCourseAccess(me, String(u.courseId));
  const block = (u.blocks ?? []).find((b) => String(b._id) === req.params.blockId && b.kind === 'check');
  if (!block?.choices?.[choice]) throw badRequest('That answer is not one of the choices');
  const correct = !!block.choices[choice].correct;
  const prev = await CheckAnswer.findOne({ studentId: me.id, unitId: u._id, blockId: req.params.blockId }).lean();
  const attempts = (prev?.attempts ?? 0) + 1;
  await CheckAnswer.updateOne(
    { studentId: me.id, unitId: u._id, blockId: req.params.blockId },
    { $set: { attempts, passed: !!prev?.passed || correct, ...(prev ? {} : { firstTry: correct }) }, $push: { choices: choice } },
    { upsert: true },
  );
  // Explanations in the student's language when an approved translation exists
  const t = lang && lang !== 'en' ? (u.translations ?? []).find((x) => x.lang === lang && x.status === 'approved') : undefined;
  const tb = (t?.blocks as { id: string; explain?: string; help?: string }[] | undefined)?.find((x) => x.id === req.params.blockId);
  res.json({ correct, attempts, explain: correct ? (tb?.explain ?? block.explain ?? '') : undefined, help: correct ? undefined : (tb?.help ?? block.help ?? '') });
});
