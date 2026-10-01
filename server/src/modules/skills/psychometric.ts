/**
 * Psychometric profile routes (separate from the Genius Habits):
 *   the child's profile · parent questionnaire · teacher observation (one rating per teacher) · PE fitness tests
 *   · "suggest a conversation" with the school counsellor · quality, norms and fairness · erasing a child's data.
 */
import { Router } from 'express';
import { z } from 'zod';
import { assertClassAccess, assertSchoolAccess, assertStudentAccess } from '../../lib/access.js';
import { audit } from '../../lib/audit.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { FLAG_TEXT, LANGS, availableLanguages, erasePsychometric, localise, psychometricProfile, termFor, validityFlags } from '../../lib/psychometric.js';
import { psychometricQuality, rebuildNorms } from '../../lib/psyQuality.js';
import { body, idParam, objectId, query } from '../../lib/validate.js';
import { authenticate, currentUser, requireRole, type AuthUser } from '../../middleware/auth.js';
import { AssessmentAttempt, AssessmentForm, AssessmentItem, ClassSection, FITNESS_TESTS, FitnessRecord, HabitObservation, PsyConversation, Skill, User, type FitnessTest } from '../../models/index.js';
import { autoScore, finalise, publishedFormFor } from './routes.js';

export const psychometricRouter = Router();
const staffRoles = ['super_admin', 'partner', 'school_admin', 'teacher'] as const;
const isStaff = (me: AuthUser) => (staffRoles as readonly string[]).includes(me.role);
const RETAKE_DAYS = 100;

async function isCounsellor(me: AuthUser) {
  if (me.role === 'super_admin' || me.role === 'school_admin') return true;
  if (me.role !== 'teacher') return false;
  return !!(await User.findById(me.id).select('isCounsellor').lean())?.isCounsellor;
}

/* ------------------------------------------------------------------ Meta */

psychometricRouter.get('/psychometric/meta', authenticate, async (req, res) => {
  const me = currentUser(req);
  res.json({
    term: termFor(),
    languages: LANGS,
    flags: FLAG_TEXT,
    fitnessTests: Object.entries(FITNESS_TESTS).map(([id, t]) => ({ id, ...t })),
    isCounsellor: await isCounsellor(me),
  });
});

/* ------------------------------------------------------------------ Profile and privacy */

psychometricRouter.get('/students/:id/psychometric', authenticate, async (req, res) => {
  const me = currentUser(req);
  const student = await assertStudentAccess(me, idParam(req));
  const profile = await psychometricProfile(student._id, { staff: isStaff(me) });
  // Without a parent's permission staff see nothing (the parent can still see and erase what exists)
  if (!profile.consent && isStaff(me)) return res.json({ ...profile, withheld: true, domains: profile.domains.map((d) => ({ ...d, score: null, band: null, dimensions: [] })), fitnessTests: [], attention: [] });
  res.json(profile);
});

/** A parent's right to erase: removes all psychometric data about the child and turns the permission off. */
psychometricRouter.delete('/students/:id/psychometric', authenticate, requireRole('parent', 'school_admin', 'super_admin'), async (req, res) => {
  const me = currentUser(req);
  const student = await assertStudentAccess(me, idParam(req));
  const removed = await erasePsychometric(student._id);
  await User.updateOne({ _id: student._id }, { 'consent.psychometric': false, 'consent.at': new Date(), 'consent.by': me.id });
  audit(req, 'psychometric.erase', 'User', student._id, removed);
  res.json({ ok: true, removed });
});

/* ------------------------------------------------------------------ Teacher observation */

/** The class grid: observed dimensions with their level descriptions, students and MY ratings this term. */
psychometricRouter.get('/classes/:id/observations', authenticate, requireRole('super_admin', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const cls = await assertClassAccess(me, idParam(req));
  const { term } = query(req, z.object({ term: z.string().regex(/^\d{4}-T[1-3]$/).optional() }));
  const t = term ?? termFor();
  const [dims, students] = await Promise.all([
    Skill.find({ framework: 'psychometric', active: true, assessedBy: { $in: ['observation', 'both'] } }).sort({ position: 1 }).lean(),
    User.find({ classId: cls._id, role: 'student' }).select('name rollNo avatarUrl consent').sort({ rollNo: 1, name: 1 }).lean(),
  ]);
  const rows = await HabitObservation.find({ studentId: { $in: students.map((s) => s._id) }, term: t }).select('studentId skillId level note by').lean();
  res.json({
    term: t,
    dimensions: dims.map((d) => ({ _id: d._id, name: d.name, domain: d.domain, color: d.color, description: d.description, anchors: d.anchors })),
    students: students.map((s) => ({ _id: s._id, name: s.name, rollNo: s.rollNo, consent: !!s.consent?.psychometric })),
    ratings: rows.filter((r) => String(r.by) === me.id),
    otherRaters: rows.filter((r) => String(r.by) !== me.id).length,
  });
});

/** Rate one student on one dimension for this term (my own rating). Level 0 clears it. */
psychometricRouter.put('/classes/:id/observations', authenticate, requireRole('super_admin', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const cls = await assertClassAccess(me, idParam(req));
  const d = body(req, z.object({ studentId: objectId, skillId: objectId, level: z.number().int().min(0).max(4), note: z.string().trim().max(500).optional() }));
  const student = await User.findOne({ _id: d.studentId, classId: cls._id, role: 'student' }).select('_id schoolId consent').lean();
  if (!student) throw notFound('Student in this class');
  if (!student.consent?.psychometric) throw forbidden('A parent has not given permission for the psychometric profile.');
  if (!(await Skill.exists({ _id: d.skillId, framework: 'psychometric' }))) throw notFound('Dimension');
  const term = termFor();
  const key = { studentId: student._id, skillId: d.skillId, term, by: me.id };
  if (d.level === 0) {
    await HabitObservation.deleteOne(key);
    return res.json({ ok: true, cleared: true });
  }
  const doc = await HabitObservation.findOneAndUpdate(key, { ...key, schoolId: student.schoolId, classId: cls._id, level: d.level, note: d.note }, { upsert: true, new: true });
  res.json(doc);
});

/* ------------------------------------------------------------------ PE fitness tests */

psychometricRouter.get('/classes/:id/fitness', authenticate, requireRole('super_admin', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const cls = await assertClassAccess(me, idParam(req));
  const t = termFor();
  const students = await User.find({ classId: cls._id, role: 'student' }).select('name rollNo gender').sort({ rollNo: 1, name: 1 }).lean();
  const records = await FitnessRecord.find({ studentId: { $in: students.map((s) => s._id) }, term: t }).select('studentId test value').lean();
  res.json({ term: t, tests: Object.entries(FITNESS_TESTS).map(([id, x]) => ({ id, ...x })), students, records });
});

psychometricRouter.put('/classes/:id/fitness', authenticate, requireRole('super_admin', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const cls = await assertClassAccess(me, idParam(req));
  const d = body(req, z.object({ studentId: objectId, test: z.enum(Object.keys(FITNESS_TESTS) as [FitnessTest, ...FitnessTest[]]), value: z.number().nullable() }));
  const student = await User.findOne({ _id: d.studentId, classId: cls._id, role: 'student' }).select('_id schoolId gender').lean();
  if (!student) throw notFound('Student in this class');
  const term = termFor();
  if (d.value == null) {
    await FitnessRecord.deleteOne({ studentId: student._id, test: d.test, term });
    return res.json({ ok: true, cleared: true });
  }
  const def = FITNESS_TESTS[d.test];
  if (d.value < def.min || d.value > def.max) throw badRequest(`${def.label}: enter a value between ${def.min} and ${def.max} ${def.unit}`);
  const doc = await FitnessRecord.findOneAndUpdate(
    { studentId: student._id, test: d.test, term },
    { studentId: student._id, test: d.test, term, value: d.value, schoolId: student.schoolId, classId: cls._id, grade: cls.grade, gender: student.gender || '', by: me.id },
    { upsert: true, new: true },
  );
  res.json(doc);
});

/* ------------------------------------------------------------------ Parent questionnaire */

async function parentContext(req: Parameters<typeof currentUser>[0]) {
  const me = currentUser(req);
  const student = await assertStudentAccess(me, idParam(req));
  const cls = student.classId ? await ClassSection.findById(student.classId).select('grade').lean() : null;
  const form = await publishedFormFor(cls?.grade, 'psychometric', 'parent');
  return { me, student, form };
}

psychometricRouter.get('/students/:id/parent-form', authenticate, requireRole('parent'), async (req, res) => {
  const { me, student, form } = await parentContext(req);
  const lang = String((req.query as { lang?: string }).lang ?? 'en');
  const inProgress = form ? await AssessmentAttempt.findOne({ studentId: student._id, formId: form._id, informant: 'parent', status: 'in_progress' }).lean() : null;
  const lastDone = await AssessmentAttempt.findOne({ studentId: student._id, framework: 'psychometric', informant: 'parent', status: { $ne: 'in_progress' } }).sort({ submittedAt: -1 }).lean();
  const due = !!form && (!lastDone || Date.now() - (lastDone.submittedAt?.getTime() ?? 0) > RETAKE_DAYS * 86400_000);
  let items: unknown[] = [];
  let languages: string[] = [];
  if (form && (due || inProgress)) {
    const raw = await AssessmentItem.find({ _id: { $in: form.itemIds } }).lean();
    const byId = new Map(raw.map((i) => [String(i._id), i]));
    const ordered = form.itemIds.map((id) => byId.get(String(id))).filter(Boolean) as typeof raw;
    languages = availableLanguages(ordered);
    items = ordered.map((i) => localise(i, languages.includes(lang) ? lang : 'en'));
  }
  res.json({
    consent: !!student.consent?.psychometric,
    childName: student.name,
    due,
    form: form ? { _id: form._id, title: form.title, intro: form.intro, questionCount: form.itemIds.length } : null,
    items,
    languages,
    attempt: inProgress ? { _id: inProgress._id, answers: inProgress.answers } : null,
    lastDoneAt: lastDone?.submittedAt ?? null,
    answeredBy: lastDone?.answeredBy && String(lastDone.answeredBy) === me.id ? 'you' : lastDone ? 'another parent' : null,
  });
});

psychometricRouter.post('/students/:id/parent-form/start', authenticate, requireRole('parent'), async (req, res) => {
  const { me, student, form } = await parentContext(req);
  if (!student.consent?.psychometric) throw forbidden('Please allow Know Yourself first (Permissions).');
  if (!form) throw notFound('Parent questionnaire');
  const open = await AssessmentAttempt.findOne({ studentId: student._id, formId: form._id, informant: 'parent', status: 'in_progress' });
  if (open) return res.json(open);
  const { lang } = z.object({ lang: z.string().max(5).optional() }).passthrough().parse(req.body ?? {});
  res.status(201).json(await AssessmentAttempt.create({ framework: 'psychometric', informant: 'parent', answeredBy: me.id, lang: lang ?? 'en', startedAt: new Date(), formId: form._id, formVersion: form.version, studentId: student._id, schoolId: student.schoolId, classId: student.classId, answers: [] }));
});

psychometricRouter.put('/students/:id/parent-form/answers', authenticate, requireRole('parent'), async (req, res) => {
  const { student } = await parentContext(req);
  const d = body(req, z.object({ itemId: objectId, value: z.number().int().min(1).max(7).optional(), selected: z.array(z.number().int().min(0).max(20)).max(20).optional() }));
  const at = await AssessmentAttempt.findOne({ studentId: student._id, informant: 'parent', status: 'in_progress' }).sort({ createdAt: -1 });
  if (!at) throw notFound('Questionnaire in progress');
  const form = await AssessmentForm.findById(at.formId).select('itemIds').lean();
  if (!form?.itemIds.some((i) => String(i) === d.itemId)) throw badRequest('That question is not in this questionnaire');
  at.answers = [...at.answers.filter((a) => String(a.itemId) !== d.itemId), { ...d, itemId: d.itemId }] as typeof at.answers;
  await at.save();
  res.json({ ok: true, answered: at.answers.length });
});

psychometricRouter.post('/students/:id/parent-form/submit', authenticate, requireRole('parent'), async (req, res) => {
  const { student } = await parentContext(req);
  const at = await AssessmentAttempt.findOne({ studentId: student._id, informant: 'parent', status: 'in_progress' }).sort({ createdAt: -1 });
  if (!at) throw notFound('Questionnaire in progress');
  const form = await AssessmentForm.findById(at.formId).lean();
  const items = await AssessmentItem.find({ _id: { $in: form?.itemIds ?? [] } }).lean();
  const byId = new Map(at.answers.map((a) => [String(a.itemId), a]));
  // Unanswered parent questions are left out (not counted as 0): parents may not know some things
  at.answers = items
    .map((it) => {
      const a = byId.get(String(it._id));
      if (!a || (a.value == null && !a.selected?.length)) return null;
      return { itemId: it._id, value: a.value, selected: a.selected, score: autoScore(it, a) };
    })
    .filter(Boolean) as typeof at.answers;
  at.submittedAt = new Date();
  at.status = 'submitted';
  at.flags = validityFlags(items, at.answers, at.startedAt, at.submittedAt, 10).filter((f) => f !== 'too_fast');
  await at.save();
  const done = await finalise(at._id);
  res.json({ status: done?.status });
});

/* ------------------------------------------------------------------ Suggest a conversation (counsellor) */

const convBody = z.object({ reason: z.string().trim().min(5).max(1000), areas: z.array(z.string().trim().max(80)).max(10).optional() });

psychometricRouter.post('/students/:id/conversations', authenticate, requireRole('super_admin', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const student = await assertStudentAccess(me, idParam(req));
  const d = body(req, convBody);
  const doc = await PsyConversation.create({ ...d, studentId: student._id, schoolId: student.schoolId, classId: student.classId, by: me.id });
  audit(req, 'psychometric.conversation', 'User', student._id);
  res.status(201).json(doc);
});

psychometricRouter.get('/students/:id/conversations', authenticate, requireRole('super_admin', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const student = await assertStudentAccess(me, idParam(req));
  const counsellor = await isCounsellor(me);
  const list = await PsyConversation.find({ studentId: student._id, ...(counsellor ? {} : { by: me.id }) }).sort({ createdAt: -1 }).populate('by', 'name').populate('notes.by', 'name').lean();
  res.json(counsellor ? list : list.map((c) => ({ ...c, notes: [] }))); // counsellor notes stay with the counsellor
});

/** The counsellor's queue (all requests in the school), or a teacher's own requests. */
psychometricRouter.get('/psychometric/conversations', authenticate, requireRole('super_admin', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const { status } = query(req, z.object({ status: z.enum(['open', 'in_progress', 'closed']).optional() }));
  const counsellor = await isCounsellor(me);
  const scope = me.role === 'super_admin' ? {} : counsellor ? { schoolId: me.schoolId } : { by: me.id };
  const list = await PsyConversation.find({ ...scope, ...(status ? { status } : {}) })
    .sort({ status: 1, createdAt: -1 })
    .limit(300)
    .populate('studentId', 'name rollNo classId')
    .populate('by', 'name')
    .populate('notes.by', 'name')
    .lean();
  res.json({ counsellor, items: counsellor ? list : list.map((c) => ({ ...c, notes: [] })) });
});

psychometricRouter.patch('/psychometric/conversations/:id', authenticate, requireRole('super_admin', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  if (!(await isCounsellor(me))) throw forbidden('Only the school counsellor can update this.');
  const c = await PsyConversation.findById(idParam(req));
  if (!c) throw notFound('Conversation request');
  if (me.role !== 'super_admin' && String(c.schoolId) !== String(me.schoolId)) throw forbidden();
  const d = body(req, z.object({ status: z.enum(['open', 'in_progress', 'closed']).optional(), note: z.string().trim().max(2000).optional() }));
  if (d.status) c.status = d.status;
  if (d.note) c.notes.push({ text: d.note, by: me.id, at: new Date() } as never);
  await c.save();
  res.json(c);
});

/** School admins choose which teachers act as counsellor. */
psychometricRouter.get('/psychometric/counsellors', authenticate, requireRole('super_admin', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const { schoolId } = query(req, z.object({ schoolId: objectId.optional() }));
  const sid = me.role === 'school_admin' ? me.schoolId : schoolId;
  if (!sid) throw badRequest('Choose a school');
  res.json(await User.find({ role: 'teacher', schoolId: sid, status: 'active' }).select('name email isCounsellor').sort({ name: 1 }).lean());
});
psychometricRouter.patch('/psychometric/counsellors/:id', authenticate, requireRole('super_admin', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const t = await User.findOne({ _id: idParam(req), role: 'teacher' });
  if (!t) throw notFound('Teacher');
  await assertSchoolAccess(me, t.schoolId);
  t.set({ isCounsellor: body(req, z.object({ isCounsellor: z.boolean() })).isCounsellor });
  await t.save();
  audit(req, 'psychometric.counsellor', 'User', t._id, { isCounsellor: t.get('isCounsellor') });
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ Quality and norms (Nanoskool admins) */

psychometricRouter.get('/psychometric/quality', authenticate, requireRole('super_admin'), async (_req, res) => {
  res.json(await psychometricQuality());
});
psychometricRouter.post('/psychometric/norms/rebuild', authenticate, requireRole('super_admin'), async (req, res) => {
  const r = await rebuildNorms();
  audit(req, 'psychometric.norms', 'PsyNorm', undefined, r);
  res.json(r);
});

