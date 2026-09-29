/**
 * The learning journey: evidence for learning objectives, teacher verification, outcome tools
 * (Super Tutor, Debating App, ...) and class outcome heatmaps.
 */
import crypto from 'node:crypto';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { assertClassAccess, assertCourseAccess, assertStudentAccess, teacherClassIds } from '../../lib/access.js';
import { audit } from '../../lib/audit.js';
import { badRequest, conflict, forbidden, notFound, unauthorized } from '../../lib/errors.js';
import { computeOutcomes, rubricScore, unitOutcome } from '../../lib/outcomes.js';
import { randomToken } from '../../lib/tokens.js';
import { body, idParam, objectId, query } from '../../lib/validate.js';
import { authenticate, currentUser, requireRole, type AuthUser } from '../../middleware/auth.js';
import { Chapter, ClassCourse, Evidence, ToolIntegration, ToolLaunch, Unit, User } from '../../models/index.js';

export const journeyRouter = Router();
/** Tools post results here with an HMAC signature instead of a user session. */
export const toolCallbackRouter = Router();

const mediaItem = z.object({ kind: z.enum(['photo', 'video', 'file', 'link']), url: z.string().trim().min(1).max(1000), name: z.string().max(200).optional() });

async function loadActivity(unitId: string, activityId: string) {
  const unit = await Unit.findById(unitId).lean();
  if (!unit) throw notFound('Learning unit');
  const activity = unit.activities?.find((a) => String(a._id) === activityId);
  if (!activity) throw notFound('Activity');
  return { unit, activity };
}

/** Evidence the viewer may see: parents never see private items; teachers see class and above. */
function visibleTo(me: AuthUser, e: { visibility?: string | null; studentId: unknown }) {
  if (me.role === 'student') return String(e.studentId) === me.id;
  if (me.role === 'parent') return e.visibility !== 'private';
  return true;
}

/* ---------------------------------------------------------- Student evidence */

journeyRouter.post('/units/:id/activities/:aid/evidence', authenticate, requireRole('student'), async (req, res) => {
  const me = currentUser(req);
  const { unit, activity } = await loadActivity(idParam(req), String(req.params.aid));
  await assertCourseAccess(me, String(unit.courseId));
  if (!['project', 'presentation', 'reflection'].includes(activity.kind)) throw badRequest('This activity is completed in its own tool');
  const data = body(req, z.object({ media: z.array(mediaItem).max(10).default([]), caption: z.string().trim().max(3000).optional() }));
  if (!data.media.length && !data.caption) throw badRequest('Add a photo, video, file or a few words about your work');
  const student = await User.findById(me.id).select('consent schoolId classId').lean();
  if (data.media.some((m) => m.kind === 'photo' || m.kind === 'video') && !student?.consent?.media) {
    throw forbidden('A parent needs to allow photos and videos first (Parent portal › Consent).');
  }
  const existing = await Evidence.findOne({ studentId: me.id, unitId: unit._id, activityId: activity._id }).sort({ updatedAt: -1 });
  if (existing && existing.status === 'verified') throw conflict('Your teacher has already checked this work');
  const doc = existing ?? new Evidence({ studentId: me.id, unitId: unit._id, courseId: unit.courseId, activityId: activity._id, schoolId: student?.schoolId, classId: student?.classId });
  doc.set({ media: data.media, caption: data.caption, objectiveIds: activity.objectiveIds, status: 'pending', source: 'student' });
  await doc.save();
  res.status(existing ? 200 : 201).json(doc);
});

journeyRouter.patch('/evidence/:id', authenticate, requireRole('student'), async (req, res) => {
  const me = currentUser(req);
  const e = await Evidence.findById(idParam(req));
  if (!e || String(e.studentId) !== me.id) throw notFound('Evidence');
  const data = body(req, z.object({ featured: z.boolean().optional(), visibility: z.enum(['private', 'class', 'parent', 'showcase']).optional() }));
  e.set(data);
  await e.save();
  res.json(e);
});

journeyRouter.delete('/evidence/:id', authenticate, requireRole('student'), async (req, res) => {
  const me = currentUser(req);
  const e = await Evidence.findById(idParam(req)).lean();
  if (!e || String(e.studentId) !== me.id) throw notFound('Evidence');
  if (e.status === 'verified') throw conflict('Checked work stays in your portfolio');
  await Evidence.deleteOne({ _id: e._id });
  res.json({ ok: true });
});

/** A learning unit's outcome for one student (student: themselves; others: ?studentId=). */
journeyRouter.get('/units/:id/outcome', authenticate, async (req, res) => {
  const me = currentUser(req);
  const unit = await Unit.findById(idParam(req)).lean();
  if (!unit) throw notFound('Learning unit');
  const { studentId } = query(req, z.object({ studentId: objectId.optional() }));
  const sid = me.role === 'student' ? me.id : studentId;
  if (!sid) throw badRequest('studentId is required');
  if (me.role !== 'student') await assertStudentAccess(me, sid);
  res.json(await unitOutcome(unit, sid));
});

/* ---------------------------------------------------------- Teacher review */

async function reviewScope(me: AuthUser): Promise<Record<string, unknown>> {
  if (me.role === 'super_admin') return {};
  if (me.role === 'school_admin') return { schoolId: me.schoolId };
  if (me.role === 'teacher') return { classId: { $in: await teacherClassIds(me.id) } };
  throw forbidden();
}

journeyRouter.get('/evidence', authenticate, requireRole('super_admin', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const f = query(req, z.object({ status: z.enum(['pending', 'verified', 'returned']).optional(), classId: objectId.optional(), unitId: objectId.optional(), limit: z.coerce.number().int().min(1).max(200).default(100) }));
  const scope = await reviewScope(me);
  if (f.classId) {
    await assertClassAccess(me, f.classId);
    scope.classId = f.classId;
  }
  const items = await Evidence.find({ ...scope, ...(f.status ? { status: f.status } : {}), ...(f.unitId ? { unitId: f.unitId } : {}) })
    .sort({ updatedAt: -1 })
    .limit(f.limit)
    .populate('studentId', 'name avatarUrl rollNo')
    .populate('classId', 'name')
    .populate('courseId', 'title')
    .lean();
  const units = await Unit.find({ _id: { $in: items.map((i) => i.unitId) } }).select('title objectives activities').lean();
  const um = new Map(units.map((u) => [String(u._id), u]));
  res.json(
    items.map((i) => {
      const u = um.get(String(i.unitId));
      const a = u?.activities?.find((x) => String(x._id) === String(i.activityId));
      return {
        ...i,
        unit: u ? { _id: u._id, title: u.title } : null,
        activity: a ? { _id: a._id, title: a.title, kind: a.kind, scoring: a.scoring, instructions: a.instructions } : null,
        objectives: (u?.objectives ?? []).filter((o) => (a?.objectiveIds ?? []).some((id) => String(id) === String(o._id))).map((o) => ({ _id: o._id, title: o.title, criteria: o.criteria })),
      };
    }),
  );
});

journeyRouter.post('/evidence/:id/review', authenticate, requireRole('super_admin', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const e = await Evidence.findById(idParam(req));
  if (!e) throw notFound('Evidence');
  await assertStudentAccess(me, String(e.studentId));
  const data = body(
    req,
    z.object({
      status: z.enum(['verified', 'returned']),
      rubricLevel: z.number().int().min(1).max(4).optional(),
      score: z.number().min(0).max(100).optional(),
      feedback: z.string().trim().max(3000).optional(),
    }),
  );
  if (data.status === 'verified' && data.rubricLevel == null && data.score == null) throw badRequest('Choose a rubric level or a score');
  e.set({
    status: data.status,
    rubricLevel: data.rubricLevel,
    score: data.status === 'verified' ? (data.score ?? rubricScore(data.rubricLevel!)) : undefined,
    feedback: data.feedback,
    verifiedBy: me.id,
    verifiedAt: new Date(),
  });
  await e.save();
  audit(req, `evidence.${data.status}`, 'Evidence', e._id);
  res.json(e);
});

/* ---------------------------------------------------------- Portfolio lists */

journeyRouter.get('/students/:id/evidence', authenticate, async (req, res) => {
  const me = currentUser(req);
  const student = await assertStudentAccess(me, idParam(req));
  const items = await Evidence.find({ studentId: student._id }).sort({ createdAt: -1 }).populate('courseId', 'title').lean();
  res.json(items.filter((e) => visibleTo(me, e)));
});

/* ---------------------------------------------------------- Class heatmap */

journeyRouter.get('/classes/:id/outcomes', authenticate, requireRole('super_admin', 'partner', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const cls = await assertClassAccess(me, idParam(req));
  const { courseId } = query(req, z.object({ courseId: objectId.optional() }));
  const ccs = await ClassCourse.find({ classId: cls._id }).populate('courseId', 'title').lean();
  const course = courseId ?? (ccs[0] ? String((ccs[0].courseId as { _id: unknown })._id) : undefined);
  if (!course) return res.json({ courses: [], course: null, units: [], students: [] });
  if (!ccs.some((c) => String((c.courseId as { _id: unknown })._id) === course)) throw badRequest('This course is not taught in this class');
  const [chapters, units, students] = await Promise.all([
    Chapter.find({ courseId: course }).select('_id position').lean(),
    Unit.find({ courseId: course }).select('title chapterId position objectives activities').lean(),
    User.find({ classId: cls._id, role: 'student' }).select('name rollNo avatarUrl').sort({ rollNo: 1, name: 1 }).lean(),
  ]);
  const chPos = new Map(chapters.map((c) => [String(c._id), c.position ?? 0]));
  units.sort((a, b) => (chPos.get(String(a.chapterId))! - chPos.get(String(b.chapterId))!) || (a.position ?? 0) - (b.position ?? 0));
  const outcomes = await computeOutcomes(units, students.map((s) => String(s._id)));
  res.json({
    courses: ccs.map((c) => c.courseId),
    course,
    units: units.map((u) => ({ _id: u._id, title: u.title, objectives: (u.objectives ?? []).map((o) => ({ _id: o._id, title: o.title })), activityCount: u.activities?.length ?? 0 })),
    students: students.map((s) => ({
      _id: s._id,
      name: s.name,
      rollNo: s.rollNo,
      units: units.map((u) => {
        const o = outcomes.get(String(s._id))!.get(String(u._id))!;
        return { unitId: o.unitId, score: o.score, band: o.band, objectives: o.objectives.map((x) => ({ objectiveId: x.objectiveId, score: x.score, band: x.band })) };
      }),
    })),
  });
});

/* ---------------------------------------------------------- Tool registry */

const toolBody = z.object({
  name: z.string().trim().min(2).max(100),
  kind: z.enum(['super_tutor', 'debate', 'other']).optional(),
  description: z.string().max(1000).optional(),
  launchUrl: z.string().trim().max(500).optional(),
  active: z.boolean().optional(),
});
const isBuiltin = (url?: string | null) => !!url && url.startsWith('builtin:');

journeyRouter.get('/tools', authenticate, async (req, res) => {
  const me = currentUser(req);
  const tools = await ToolIntegration.find(me.role === 'super_admin' ? {} : { active: true }).sort({ name: 1 }).lean();
  res.json(tools.map((t) => (me.role === 'super_admin' ? t : { _id: t._id, name: t.name, kind: t.kind, description: t.description })));
});

journeyRouter.post('/tools', authenticate, requireRole('super_admin'), async (req, res) => {
  const data = body(req, toolBody);
  if (data.launchUrl && !isBuiltin(data.launchUrl) && !/^https?:\/\//.test(data.launchUrl)) throw badRequest('Launch URL must start with https://');
  const secret = randomToken(32);
  const tool = await ToolIntegration.create({ ...data, secret });
  audit(req, 'tool.create', 'ToolIntegration', tool._id);
  // The secret is shown once, for the tool's developers to sign their results with
  res.status(201).json({ ...tool.toObject(), secret });
});

journeyRouter.patch('/tools/:id', authenticate, requireRole('super_admin'), async (req, res) => {
  const data = body(req, toolBody.partial());
  if (data.launchUrl && !isBuiltin(data.launchUrl) && !/^https?:\/\//.test(data.launchUrl)) throw badRequest('Launch URL must start with https://');
  const tool = await ToolIntegration.findByIdAndUpdate(idParam(req), data, { new: true }).lean();
  if (!tool) throw notFound('Tool');
  res.json(tool);
});

journeyRouter.post('/tools/:id/secret', authenticate, requireRole('super_admin'), async (req, res) => {
  const secret = randomToken(32);
  const tool = await ToolIntegration.findByIdAndUpdate(idParam(req), { secret }).lean();
  if (!tool) throw notFound('Tool');
  audit(req, 'tool.secret', 'ToolIntegration', tool._id);
  res.json({ secret });
});

/** Start a tool activity: a one-time token the tool sends back with the result. */
journeyRouter.post('/units/:id/activities/:aid/launch', authenticate, requireRole('student'), async (req, res) => {
  const me = currentUser(req);
  const { unit, activity } = await loadActivity(idParam(req), String(req.params.aid));
  await assertCourseAccess(me, String(unit.courseId));
  if (activity.kind !== 'tool' || !activity.toolId) throw badRequest('This activity does not use a tool');
  const tool = await ToolIntegration.findById(activity.toolId).lean();
  if (!tool?.active || !tool.launchUrl) throw conflict(`${tool?.name ?? 'This tool'} is not connected yet. Your teacher will let you know when it is ready.`);
  const token = randomToken(24);
  await ToolLaunch.create({ token, toolId: tool._id, studentId: me.id, unitId: unit._id, activityId: activity._id, expiresAt: new Date(Date.now() + 3 * 3600_000) });
  const objectives = (unit.objectives ?? []).filter((o) => (activity.objectiveIds ?? []).some((id) => String(id) === String(o._id)));
  const params = new URLSearchParams({ token, unit: unit.title, objectives: objectives.map((o) => `${o._id}:${o.title}`).join('|') });
  const url = isBuiltin(tool.launchUrl) ? `/student/tool-demo?${params}&tool=${encodeURIComponent(tool.name)}` : `${tool.launchUrl}${tool.launchUrl.includes('?') ? '&' : '?'}${params}`;
  res.json({ url, builtin: isBuiltin(tool.launchUrl) });
});

const resultBody = z.object({
  token: z.string().min(10).max(200),
  score: z.number().min(0).max(100).optional(),
  objectiveScores: z.array(z.object({ objectiveId: objectId, score: z.number().min(0).max(100) })).max(20).optional(),
  summary: z.string().max(3000).optional(),
  media: z.array(mediaItem).max(5).optional(),
});

async function saveToolResult(launch: InstanceType<typeof ToolLaunch>, data: z.infer<typeof resultBody>) {
  if (launch.usedAt) throw conflict('This result was already received');
  if (launch.expiresAt.getTime() < Date.now()) throw conflict('This activity link has expired');
  const { unit, activity } = await loadActivity(String(launch.unitId), String(launch.activityId));
  const allowed = new Set((activity.objectiveIds ?? []).map(String));
  const objectiveScores = (data.objectiveScores ?? []).filter((o) => allowed.has(o.objectiveId));
  const score = data.score ?? (objectiveScores.length ? objectiveScores.reduce((n, o) => n + o.score, 0) / objectiveScores.length : undefined);
  if (score == null) throw badRequest('Send a score or objectiveScores');
  const student = await User.findById(launch.studentId).select('schoolId classId').lean();
  const e = await Evidence.create({
    studentId: launch.studentId,
    schoolId: student?.schoolId,
    classId: student?.classId,
    courseId: unit.courseId,
    unitId: unit._id,
    activityId: activity._id,
    objectiveIds: activity.objectiveIds,
    source: 'tool',
    score: Math.round(score),
    objectiveScores,
    summary: data.summary,
    media: data.media ?? [],
    status: 'verified', // tools score their own activities
    verifiedAt: new Date(),
  });
  launch.usedAt = new Date();
  await launch.save();
  return e;
}

/** Signed callback: X-Nanoskool-Tool = tool id, X-Nanoskool-Signature = hex HMAC-SHA256(raw body, secret). */
toolCallbackRouter.post('/tools/results', async (req: Request & { rawBody?: Buffer }, res) => {
  const toolId = String(req.header('x-nanoskool-tool') ?? '');
  const sig = String(req.header('x-nanoskool-signature') ?? '');
  if (!/^[a-f0-9]{24}$/.test(toolId) || !/^[a-f0-9]{64}$/.test(sig) || !req.rawBody) throw unauthorized('Missing tool signature');
  const tool = await ToolIntegration.findById(toolId).select('+secret').lean();
  if (!tool?.active) throw unauthorized('Unknown tool');
  const expected = crypto.createHmac('sha256', tool.secret).update(req.rawBody).digest();
  const given = Buffer.from(sig, 'hex');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) throw unauthorized('Bad signature');
  const data = body(req, resultBody);
  const launch = await ToolLaunch.findOne({ token: data.token, toolId: tool._id });
  if (!launch) throw notFound('Launch');
  const e = await saveToolResult(launch, data);
  res.status(201).json({ ok: true, evidenceId: e._id });
});

/** The built-in demo tool (no external service): the student's own session submits the result. */
journeyRouter.post('/tool-launches/:token/demo-result', authenticate, requireRole('student'), async (req, res) => {
  const me = currentUser(req);
  const launch = await ToolLaunch.findOne({ token: String(req.params.token) });
  if (!launch || String(launch.studentId) !== me.id) throw notFound('Launch');
  const tool = await ToolIntegration.findById(launch.toolId).lean();
  if (!isBuiltin(tool?.launchUrl)) throw forbidden('Only the built-in demo tool can post here');
  const data = body(req, resultBody.omit({ token: true }));
  const e = await saveToolResult(launch, { ...data, token: launch.token });
  res.status(201).json({ ok: true, evidenceId: e._id, score: e.score });
});

