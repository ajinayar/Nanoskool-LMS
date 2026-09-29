/**
 * 21st-century skills: the skill library, the item bank, assessment forms per grade band,
 * the student's entry (and termly) skills mission, teacher review of open answers, skill scores
 * and parent consent.
 */
import { Router } from 'express';
import { z } from 'zod';
import { assertStudentAccess, teacherClassIds } from '../../lib/access.js';
import { audit } from '../../lib/audit.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { body, idParam, objectId, query } from '../../lib/validate.js';
import { authenticate, currentUser, requireRole, type AuthUser } from '../../middleware/auth.js';
import { AssessmentAttempt, AssessmentForm, AssessmentItem, ClassSection, GRADE_BANDS, Skill, User } from '../../models/index.js';

export const skillsRouter = Router();
skillsRouter.use(authenticate);

type BandT = (typeof GRADE_BANDS)[number];
export const bandForGrade = (grade?: number | null): BandT => (!grade || grade <= 3 ? 'little' : grade <= 7 ? 'junior' : 'senior');
export const levelFor = (score: number) => (score >= 80 ? 'advanced' : score >= 60 ? 'proficient' : score >= 40 ? 'developing' : 'emerging');
const RETAKE_AFTER_DAYS = 100; // one mission per term

/* -------------------------------------------------------------- Skills */

const skillBody = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().max(1000).optional(),
  levels: z.object({ emerging: z.string().max(300), developing: z.string().max(300), proficient: z.string().max(300), advanced: z.string().max(300) }).partial().optional(),
  minGrade: z.number().int().min(1).max(12).optional(),
  maxGrade: z.number().int().min(1).max(12).optional(),
  color: z.string().max(20).optional(),
  position: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

skillsRouter.get('/skills', async (req, res) => {
  const { all } = query(req, z.object({ all: z.coerce.boolean().optional() }));
  const me = currentUser(req);
  res.json(await Skill.find(all && me.role === 'super_admin' ? {} : { active: true }).sort({ position: 1, name: 1 }).lean());
});
skillsRouter.post('/skills', requireRole('super_admin'), async (req, res) => {
  const data = body(req, skillBody);
  const skill = await Skill.create({ ...data, position: data.position ?? (await Skill.countDocuments()) });
  audit(req, 'skill.create', 'Skill', skill._id);
  res.status(201).json(skill);
});
skillsRouter.patch('/skills/:id', requireRole('super_admin'), async (req, res) => {
  const skill = await Skill.findByIdAndUpdate(idParam(req), body(req, skillBody.partial()), { new: true });
  if (!skill) throw notFound('Skill');
  res.json(skill);
});

/* -------------------------------------------------------------- Item bank */

const itemBody = z.object({
  type: z.enum(['single', 'multiple', 'scale', 'open', 'upload']),
  prompt: z.string().trim().min(3).max(3000),
  mediaUrl: z.string().trim().max(500).optional().or(z.literal('')),
  options: z.array(z.object({ text: z.string().trim().min(1).max(500), score: z.number().min(0).max(1) })).max(8).optional(),
  scaleLabels: z.array(z.string().trim().max(60)).max(7).optional(),
  rubric: z.array(z.string().trim().max(500)).max(4).optional(),
  skills: z.array(z.object({ skillId: objectId, weight: z.number().min(0.1).max(10) })).min(1).max(5),
  bands: z.array(z.enum(GRADE_BANDS)).min(1),
  status: z.enum(['draft', 'published']).optional(),
});
function checkItem(d: Partial<z.infer<typeof itemBody>>) {
  if ((d.type === 'single' || d.type === 'multiple') && (d.options?.length ?? 0) < 2) throw badRequest('Add at least two options');
  if (d.type === 'single' && d.options && !d.options.some((o) => o.score > 0)) throw badRequest('Give at least one option some credit');
  if (d.type === 'scale' && (d.scaleLabels?.length ?? 0) < 3) throw badRequest('A scale needs 3 to 7 labels');
}

skillsRouter.get('/assessment-items', requireRole('super_admin'), async (req, res) => {
  const f = query(req, z.object({ band: z.enum(GRADE_BANDS).optional(), skillId: objectId.optional(), status: z.enum(['draft', 'published']).optional() }));
  res.json(
    await AssessmentItem.find({ ...(f.band ? { bands: f.band } : {}), ...(f.skillId ? { 'skills.skillId': f.skillId } : {}), ...(f.status ? { status: f.status } : {}) })
      .sort({ updatedAt: -1 })
      .lean(),
  );
});
skillsRouter.post('/assessment-items', requireRole('super_admin'), async (req, res) => {
  const data = body(req, itemBody);
  checkItem(data);
  res.status(201).json(await AssessmentItem.create({ ...data, createdBy: currentUser(req).id }));
});
skillsRouter.patch('/assessment-items/:id', requireRole('super_admin'), async (req, res) => {
  const data = body(req, itemBody.partial());
  const cur = await AssessmentItem.findById(idParam(req)).lean();
  if (!cur) throw notFound('Item');
  checkItem({ ...cur, ...data } as z.infer<typeof itemBody>);
  res.json(await AssessmentItem.findByIdAndUpdate(cur._id, data, { new: true }).lean());
});
skillsRouter.delete('/assessment-items/:id', requireRole('super_admin'), async (req, res) => {
  const id = idParam(req);
  if (await AssessmentForm.exists({ itemIds: id, status: 'published' })) throw conflict('This item is in a published form. Remove it from the form first.');
  await AssessmentItem.deleteOne({ _id: id });
  await AssessmentForm.updateMany({ itemIds: id }, { $pull: { itemIds: id } });
  res.json({ ok: true });
});

/* -------------------------------------------------------------- Forms */

const formBody = z.object({
  title: z.string().trim().min(2).max(200),
  band: z.enum(GRADE_BANDS),
  intro: z.string().max(2000).optional(),
  itemIds: z.array(objectId).max(80).optional(),
  timeLimitMin: z.number().int().min(1).max(180).optional().nullable(),
});

skillsRouter.get('/assessment-forms', requireRole('super_admin'), async (_req, res) => {
  const forms = await AssessmentForm.find().sort({ band: 1, updatedAt: -1 }).lean();
  const counts = await AssessmentAttempt.aggregate([{ $group: { _id: '$formId', n: { $sum: 1 } } }]);
  const n = new Map(counts.map((c) => [String(c._id), c.n as number]));
  res.json(forms.map((f) => ({ ...f, attemptCount: n.get(String(f._id)) ?? 0 })));
});
skillsRouter.post('/assessment-forms', requireRole('super_admin'), async (req, res) => {
  res.status(201).json(await AssessmentForm.create({ ...body(req, formBody), createdBy: currentUser(req).id }));
});
skillsRouter.patch('/assessment-forms/:id', requireRole('super_admin'), async (req, res) => {
  const data = body(req, formBody.partial());
  const form = await AssessmentForm.findById(idParam(req));
  if (!form) throw notFound('Form');
  // Changing the questions of a form children have taken makes a new version, so results stay comparable
  const changed = data.itemIds && data.itemIds.join() !== form.itemIds.map(String).join();
  if (changed && (await AssessmentAttempt.exists({ formId: form._id }))) form.version = (form.version ?? 1) + 1;
  form.set(data);
  await form.save();
  res.json(form);
});
skillsRouter.post('/assessment-forms/:id/publish', requireRole('super_admin'), async (req, res) => {
  const form = await AssessmentForm.findById(idParam(req));
  if (!form) throw notFound('Form');
  if (!form.itemIds.length) throw badRequest('Add questions before publishing');
  const items = await AssessmentItem.find({ _id: { $in: form.itemIds } }).select('status').lean();
  await AssessmentItem.updateMany({ _id: { $in: items.filter((i) => i.status !== 'published').map((i) => i._id) } }, { status: 'published' });
  await AssessmentForm.updateMany({ band: form.band, status: 'published', _id: { $ne: form._id } }, { status: 'retired' });
  form.status = 'published';
  await form.save();
  audit(req, 'assessment.publish', 'AssessmentForm', form._id);
  res.json(form);
});

/* -------------------------------------------------------------- Scoring */

interface ScorableItem {
  type: string;
  options?: { text?: string | null; score?: number | null }[] | null;
  scaleLabels?: string[] | null;
}
type AnswerT = { itemId?: unknown; selected?: number[]; value?: number | null; text?: string | null; fileUrl?: string | null; score?: number | null };

/** 0–1 credit for closed items; null for open work a teacher scores. */
export function autoScore(item: ScorableItem, a: AnswerT): number | null {
  if (item.type === 'single') {
    const o = item.options?.[a.selected?.[0] ?? -1];
    return o ? (o.score ?? 0) : 0;
  }
  if (item.type === 'multiple') {
    const opts = item.options ?? [];
    const best = opts.reduce((n, o) => n + (o.score ?? 0), 0) || 1;
    const sel = (a.selected ?? []).map((i) => opts[i]).filter(Boolean);
    const gain = sel.reduce((n, o) => n + (o.score ?? 0), 0);
    const wrong = sel.filter((o) => !o.score).length;
    return Math.max(0, Math.min(1, gain / best - wrong / Math.max(1, opts.length)));
  }
  if (item.type === 'scale') {
    const n = item.scaleLabels?.length ?? 5;
    return a.value == null ? 0 : Math.max(0, Math.min(1, (a.value - 1) / (n - 1)));
  }
  return null;
}

export function skillScoresFor(items: { _id: unknown; skills: { skillId?: unknown; weight?: number | null }[] }[], answers: AnswerT[]) {
  const byId = new Map(items.map((i) => [String(i._id), i]));
  const acc = new Map<string, [number, number]>();
  for (const a of answers) {
    if (a.score == null) continue;
    const it = byId.get(String(a.itemId));
    for (const s of it?.skills ?? []) {
      const k = String(s.skillId);
      const [num, den] = acc.get(k) ?? [0, 0];
      acc.set(k, [num + a.score * (s.weight ?? 1), den + (s.weight ?? 1)]);
    }
  }
  return [...acc.entries()].map(([skillId, [num, den]]) => {
    const score = Math.round((num / den) * 100);
    return { skillId, score, level: levelFor(score) };
  });
}

async function finalise(attemptId: unknown) {
  const at = await AssessmentAttempt.findById(attemptId);
  if (!at) return null;
  const items = await AssessmentItem.find({ _id: { $in: at.answers.map((a) => a.itemId) } }).select('skills').lean();
  const pending = at.answers.some((a) => a.score == null);
  at.set({ skillScores: skillScoresFor(items, at.answers), status: pending ? 'submitted' : 'scored' });
  await at.save();
  return at;
}

/* -------------------------------------------------------------- The student's mission */

async function publishedFormFor(grade?: number | null) {
  return AssessmentForm.findOne({ band: bandForGrade(grade), status: 'published' }).lean();
}

/** What the student sees: whether a mission is due, and the questions without their answers. */
skillsRouter.get('/assessment/me', requireRole('student'), async (req, res) => {
  const me = currentUser(req);
  const student = await User.findById(me.id).select('consent classId').lean();
  const cls = student?.classId ? await ClassSection.findById(student.classId).select('grade').lean() : null;
  const form = await publishedFormFor(cls?.grade);
  const latest = await AssessmentAttempt.findOne({ studentId: me.id }).sort({ createdAt: -1 }).lean();
  const lastDone = await AssessmentAttempt.findOne({ studentId: me.id, status: { $ne: 'in_progress' } }).sort({ submittedAt: -1 }).lean();
  const due = !!form && (!lastDone || Date.now() - (lastDone.submittedAt?.getTime() ?? 0) > RETAKE_AFTER_DAYS * 86400_000);
  const inProgress = latest?.status === 'in_progress' && form && String(latest.formId) === String(form._id) ? latest : null;
  let items: unknown[] = [];
  if (form && (due || inProgress)) {
    const raw = await AssessmentItem.find({ _id: { $in: form.itemIds } }).lean();
    const byId = new Map(raw.map((i) => [String(i._id), i]));
    items = form.itemIds
      .map((id) => byId.get(String(id)))
      .filter(Boolean)
      .map((i) => ({ _id: i!._id, type: i!.type, prompt: i!.prompt, mediaUrl: i!.mediaUrl, options: (i!.options ?? []).map((o) => ({ text: o.text })), scaleLabels: i!.scaleLabels }));
  }
  res.json({
    consent: !!student?.consent?.assessment,
    due,
    form: form ? { _id: form._id, title: form.title, intro: form.intro, band: form.band, timeLimitMin: form.timeLimitMin, questionCount: form.itemIds.length } : null,
    items,
    attempt: inProgress ? { _id: inProgress._id, answers: inProgress.answers } : null,
    lastResult: lastDone ? { status: lastDone.status, submittedAt: lastDone.submittedAt, skillScores: lastDone.skillScores } : null,
  });
});

skillsRouter.post('/assessment/me/start', requireRole('student'), async (req, res) => {
  const me = currentUser(req);
  const student = await User.findById(me.id).select('consent classId schoolId').lean();
  if (!student?.consent?.assessment) throw forbidden('A parent needs to allow the skills mission first.');
  const cls = student.classId ? await ClassSection.findById(student.classId).select('grade').lean() : null;
  const form = await publishedFormFor(cls?.grade);
  if (!form) throw notFound('Skills mission');
  const open = await AssessmentAttempt.findOne({ studentId: me.id, formId: form._id, status: 'in_progress' });
  if (open) return res.json(open);
  const at = await AssessmentAttempt.create({ formId: form._id, formVersion: form.version, studentId: me.id, schoolId: student.schoolId, classId: student.classId, answers: [] });
  res.status(201).json(at);
});

const answerBody = z.object({
  itemId: objectId,
  selected: z.array(z.number().int().min(0).max(20)).max(20).optional(),
  value: z.number().int().min(1).max(7).optional(),
  text: z.string().max(5000).optional(),
  fileUrl: z.string().max(1000).optional(),
});

skillsRouter.put('/assessment/me/answers', requireRole('student'), async (req, res) => {
  const me = currentUser(req);
  const data = body(req, answerBody);
  const at = await AssessmentAttempt.findOne({ studentId: me.id, status: 'in_progress' }).sort({ createdAt: -1 });
  if (!at) throw notFound('Mission in progress');
  const form = await AssessmentForm.findById(at.formId).select('itemIds').lean();
  if (!form?.itemIds.some((i) => String(i) === data.itemId)) throw badRequest('That question is not in your mission');
  const rest = at.answers.filter((a) => String(a.itemId) !== data.itemId);
  at.answers = [...rest, { ...data, itemId: data.itemId }] as typeof at.answers;
  await at.save();
  res.json({ ok: true, answered: at.answers.length });
});

skillsRouter.post('/assessment/me/submit', requireRole('student'), async (req, res) => {
  const me = currentUser(req);
  const at = await AssessmentAttempt.findOne({ studentId: me.id, status: 'in_progress' }).sort({ createdAt: -1 });
  if (!at) throw notFound('Mission in progress');
  const form = await AssessmentForm.findById(at.formId).lean();
  const items = await AssessmentItem.find({ _id: { $in: form?.itemIds ?? [] } }).lean();
  const byId = new Map(at.answers.map((a) => [String(a.itemId), a]));
  // Unanswered closed questions count as 0; unanswered open ones are simply left out
  at.answers = items
    .map((it) => {
      const a: AnswerT = byId.get(String(it._id)) ?? { itemId: it._id };
      const open = it.type === 'open' || it.type === 'upload';
      if (open && !a.text && !a.fileUrl) return null;
      return { itemId: it._id, selected: a.selected, value: a.value, text: a.text, fileUrl: a.fileUrl, score: open ? null : autoScore(it, a) };
    })
    .filter(Boolean) as typeof at.answers;
  at.submittedAt = new Date();
  at.status = 'submitted';
  await at.save();
  const done = await finalise(at._id);
  res.json({ status: done?.status, skillScores: done?.skillScores });
});

/* -------------------------------------------------------------- Teacher review of open work */

async function attemptScope(me: AuthUser): Promise<Record<string, unknown>> {
  if (me.role === 'super_admin') return {};
  if (me.role === 'school_admin') return { schoolId: me.schoolId };
  if (me.role === 'teacher') return { classId: { $in: await teacherClassIds(me.id) } };
  throw forbidden();
}

skillsRouter.get('/assessment-reviews', requireRole('super_admin', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const attempts = await AssessmentAttempt.find({ ...(await attemptScope(me)), status: 'submitted' }).sort({ submittedAt: 1 }).limit(100).populate('studentId', 'name rollNo').populate('classId', 'name').lean();
  const items = await AssessmentItem.find({ _id: { $in: attempts.flatMap((a) => a.answers.filter((x) => x.score == null).map((x) => x.itemId)) } }).lean();
  const im = new Map(items.map((i) => [String(i._id), i]));
  res.json(
    attempts.flatMap((a) =>
      a.answers
        .filter((x) => x.score == null)
        .map((x) => {
          const it = im.get(String(x.itemId));
          return { attemptId: a._id, student: a.studentId, class: a.classId, submittedAt: a.submittedAt, itemId: x.itemId, prompt: it?.prompt, type: it?.type, rubric: it?.rubric ?? [], text: x.text, fileUrl: x.fileUrl };
        }),
    ),
  );
});

skillsRouter.post('/assessment-reviews/:id/score', requireRole('super_admin', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const { itemId, level } = body(req, z.object({ itemId: objectId, level: z.number().int().min(1).max(4) }));
  const at = await AssessmentAttempt.findOne({ _id: idParam(req), ...(await attemptScope(me)) });
  if (!at) throw notFound('Attempt');
  const ans = at.answers.find((a) => String(a.itemId) === itemId);
  if (!ans) throw notFound('Answer');
  ans.score = level / 4;
  ans.scoredBy = me.id as never;
  await at.save();
  const done = await finalise(at._id);
  res.json({ status: done?.status });
});

/* -------------------------------------------------------------- Skill profile and consent */

skillsRouter.get('/students/:id/skills', async (req, res) => {
  const me = currentUser(req);
  const student = await assertStudentAccess(me, idParam(req));
  const [skills, attempts] = await Promise.all([
    Skill.find({ active: true }).sort({ position: 1 }).lean(),
    AssessmentAttempt.find({ studentId: student._id, status: { $ne: 'in_progress' } }).sort({ submittedAt: 1 }).populate('formId', 'title band').lean(),
  ]);
  res.json({
    skills,
    consent: student.consent ?? { assessment: false, media: false },
    history: attempts.map((a) => ({ _id: a._id, form: a.formId, status: a.status, submittedAt: a.submittedAt, skillScores: a.skillScores })),
  });
});

skillsRouter.patch('/students/:id/consent', requireRole('parent', 'school_admin', 'super_admin'), async (req, res) => {
  const me = currentUser(req);
  const student = await assertStudentAccess(me, idParam(req));
  const data = body(req, z.object({ assessment: z.boolean().optional(), media: z.boolean().optional() }));
  const consent = { ...(student.consent ?? {}), ...data, at: new Date(), by: me.id };
  await User.updateOne({ _id: student._id }, { consent });
  audit(req, 'consent.update', 'User', student._id, data);
  res.json(consent);
});
