import { Router } from 'express';
import { z } from 'zod';
import {
  accessibleCourseIds,
  assertClassAccess,
  assertCourseAccess,
  assertSchoolAccess,
  assertStudentAccess,
} from '../../lib/access.js';
import { audit } from '../../lib/audit.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { cleanHtml } from '../../lib/sanitize.js';
import { body, escapeRegex, idParam, objectId, pageQuery, query } from '../../lib/validate.js';
import { authenticate, currentUser, requireRole } from '../../middleware/auth.js';
import { unitOutcome } from '../../lib/outcomes.js';
import { Types } from 'mongoose';
import {
  Chapter,
  ClassCourse,
  ClassSection,
  Course,
  CourseGrant,
  Partner,
  Quiz,
  School,
  ToolIntegration,
  Unit,
  UnitProgress,
  User,
} from '../../models/index.js';

export const curriculumRouter = Router();
curriculumRouter.use(authenticate);

/* -------------------------------------------------------------- Courses */

const courseBody = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().max(5000).optional(),
  category: z.string().trim().max(60).optional(),
  grades: z.array(z.number().int().min(1).max(12)).max(12).optional(),
  thumbnailUrl: z.string().trim().max(500).optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

async function courseStats(courseIds: string[], studentId?: string) {
  const units = await Unit.find({ courseId: { $in: courseIds } }).select('courseId').lean();
  const totals = new Map<string, number>();
  for (const u of units) totals.set(String(u.courseId), (totals.get(String(u.courseId)) ?? 0) + 1);
  const done = new Map<string, number>();
  if (studentId) {
    const prog = await UnitProgress.find({ studentId, courseId: { $in: courseIds } }).select('courseId').lean();
    for (const p of prog) done.set(String(p.courseId), (done.get(String(p.courseId)) ?? 0) + 1);
  }
  return { totals, done };
}

curriculumRouter.get('/courses', async (req, res) => {
  const me = currentUser(req);
  const { page, limit, q } = query(req, pageQuery);
  const f = query(req, z.object({ status: z.string().optional(), category: z.string().optional(), studentId: objectId.optional() }).passthrough());
  const filter: Record<string, unknown> = {};
  const ids = await accessibleCourseIds(me);
  if (ids !== 'all') {
    filter._id = { $in: ids };
    filter.status = 'published';
  } else if (f.status) filter.status = f.status;
  if (f.category) filter.category = f.category;
  if (q) filter.title = new RegExp(escapeRegex(q), 'i');
  const [items, total] = await Promise.all([
    Course.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Course.countDocuments(filter),
  ]);
  // Students see their own progress; parents and teachers can ask for one student's
  let studentId: string | undefined;
  if (me.role === 'student') studentId = me.id;
  else if (f.studentId) {
    await assertStudentAccess(me, f.studentId);
    studentId = f.studentId;
  }
  const { totals, done } = await courseStats(items.map((c) => String(c._id)), studentId);
  res.json({
    items: items.map((c) => {
      const t = totals.get(String(c._id)) ?? 0;
      const d = done.get(String(c._id)) ?? 0;
      return { ...c, unitCount: t, ...(studentId ? { completedUnits: d, progress: t ? Math.round((d / t) * 100) : 0 } : {}) };
    }),
    total,
    page,
    limit,
  });
});

curriculumRouter.post('/courses', requireRole('super_admin'), async (req, res) => {
  const data = body(req, courseBody);
  const course = await Course.create({ ...data, description: cleanHtml(data.description), createdBy: currentUser(req).id });
  audit(req, 'course.create', 'Course', course._id);
  res.status(201).json(course);
});

curriculumRouter.get('/courses/:id', async (req, res) => {
  const me = currentUser(req);
  const id = idParam(req);
  await assertCourseAccess(me, id);
  const course = await Course.findById(id).lean();
  if (!course) throw notFound('Course');
  if (me.role !== 'super_admin' && course.status !== 'published') throw notFound('Course');
  const [chapters, units, quizzes] = await Promise.all([
    Chapter.find({ courseId: id }).sort({ position: 1, createdAt: 1 }).lean(),
    Unit.find({ courseId: id }).select('-body').sort({ position: 1, createdAt: 1 }).lean(),
    Quiz.find({ courseId: id, schoolId: null, ...(me.role === 'super_admin' ? {} : { status: 'published' }) })
      .select('title chapterId unitId status questions timeLimitMin maxAttempts')
      .lean(),
  ]);
  const { studentId } = query(req, z.object({ studentId: objectId.optional() }).passthrough());
  let completed = new Set<string>();
  const sid = me.role === 'student' ? me.id : studentId;
  if (sid) {
    if (sid !== me.id) await assertStudentAccess(me, sid);
    const prog = await UnitProgress.find({ studentId: sid, courseId: id }).select('unitId').lean();
    completed = new Set(prog.map((p) => String(p.unitId)));
  }
  res.json({
    ...course,
    chapters: chapters.map((ch) => ({
      ...ch,
      units: units.filter((u) => String(u.chapterId) === String(ch._id)).map((u) => ({ ...u, completed: completed.has(String(u._id)) })),
    })),
    quizzes: quizzes.map((q) => ({ ...q, questionCount: q.questions?.length ?? 0, questions: undefined })),
    unitCount: units.length,
    completedUnits: completed.size,
    progress: units.length ? Math.round((completed.size / units.length) * 100) : 0,
  });
});

curriculumRouter.patch('/courses/:id', requireRole('super_admin'), async (req, res) => {
  const data = body(req, courseBody.partial());
  if (data.description !== undefined) data.description = cleanHtml(data.description);
  const course = await Course.findByIdAndUpdate(idParam(req), data, { new: true });
  if (!course) throw notFound('Course');
  audit(req, 'course.update', 'Course', course._id);
  res.json(course);
});

curriculumRouter.delete('/courses/:id', requireRole('super_admin'), async (req, res) => {
  const id = idParam(req);
  if (await ClassCourse.exists({ courseId: id })) {
    await Course.updateOne({ _id: id }, { status: 'archived' });
    return res.json({ ok: true, archived: true });
  }
  await Promise.all([
    Course.deleteOne({ _id: id }),
    Chapter.deleteMany({ courseId: id }),
    Unit.deleteMany({ courseId: id }),
    CourseGrant.deleteMany({ courseId: id }),
    Quiz.deleteMany({ courseId: id, schoolId: null }),
  ]);
  audit(req, 'course.delete', 'Course', id);
  res.json({ ok: true, deleted: true });
});

/* ------------------------------------------------------------- Chapters */

const chapterBody = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  position: z.number().int().min(0).optional(),
});

curriculumRouter.post('/courses/:id/chapters', requireRole('super_admin'), async (req, res) => {
  const courseId = idParam(req);
  if (!(await Course.exists({ _id: courseId }))) throw notFound('Course');
  const data = body(req, chapterBody);
  const position = data.position ?? (await Chapter.countDocuments({ courseId }));
  res.status(201).json(await Chapter.create({ ...data, courseId, position }));
});

curriculumRouter.patch('/chapters/:id', requireRole('super_admin'), async (req, res) => {
  const ch = await Chapter.findByIdAndUpdate(idParam(req), body(req, chapterBody.partial()), { new: true });
  if (!ch) throw notFound('Chapter');
  res.json(ch);
});

curriculumRouter.delete('/chapters/:id', requireRole('super_admin'), async (req, res) => {
  const id = idParam(req);
  const units = await Unit.find({ chapterId: id }).select('_id').lean();
  await Promise.all([
    Chapter.deleteOne({ _id: id }),
    Unit.deleteMany({ chapterId: id }),
    UnitProgress.deleteMany({ unitId: { $in: units.map((u) => u._id) } }),
  ]);
  res.json({ ok: true });
});

const reorderBody = z.object({ ids: z.array(objectId).min(1).max(500) });

curriculumRouter.post('/courses/:id/chapters/reorder', requireRole('super_admin'), async (req, res) => {
  const { ids } = body(req, reorderBody);
  await Promise.all(ids.map((id, i) => Chapter.updateOne({ _id: id, courseId: idParam(req) }, { position: i })));
  res.json({ ok: true });
});

/* ---------------------------------------------------------------- Units */

const unitBody = z.object({
  title: z.string().trim().min(1).max(200),
  summary: z.string().max(1000).optional(),
  type: z.enum(['lesson', 'video', 'pdf', 'activity', 'link']).optional(),
  body: z.string().max(500_000).optional(),
  videoUrl: z.string().trim().max(500).optional(),
  fileUrl: z.string().trim().max(500).optional(),
  linkUrl: z.string().trim().max(500).optional(),
  durationMin: z.number().int().min(1).max(600).optional(),
  position: z.number().int().min(0).optional(),
  objectives: z
    .array(
      z.object({
        _id: objectId.optional(),
        title: z.string().trim().min(1).max(200),
        description: z.string().max(2000).optional(),
        criteria: z.string().max(500).optional(),
        skillIds: z.array(objectId).max(10).optional(),
        weight: z.number().min(0).max(100).optional(),
      }),
    )
    .max(20)
    .optional(),
  activities: z
    .array(
      z.object({
        _id: objectId.optional(),
        kind: z.enum(['quiz', 'project', 'presentation', 'reflection', 'tool']),
        title: z.string().trim().min(1).max(200),
        instructions: z.string().max(5000).optional(),
        quizId: objectId.optional().nullable(),
        toolId: objectId.optional().nullable(),
        objectiveIds: z.array(objectId).max(20).optional(),
        scoring: z.enum(['auto', 'rubric', 'rating']).optional(),
        weight: z.number().min(0).max(100).optional(),
        required: z.boolean().optional(),
        mediaTypes: z.array(z.enum(['photo', 'video', 'file', 'link'])).max(4).optional(),
      }),
    )
    .max(50)
    .optional(),
});

/** Objectives and activities must reference each other, quizzes and tools correctly. */
async function checkJourney(data: z.infer<typeof unitBody> | Partial<z.infer<typeof unitBody>>, courseId: unknown, existing?: { objectives?: { _id?: unknown }[] }) {
  if (data.objectives) for (const o of data.objectives) if (!o._id) o._id = String(new Types.ObjectId());
  const objectiveIds = new Set((data.objectives ?? existing?.objectives ?? []).map((o) => String(o._id)));
  for (const a of data.activities ?? []) {
    const bad = (a.objectiveIds ?? []).filter((id) => !objectiveIds.has(id));
    if (bad.length) throw badRequest(`Activity "${a.title}" checks an objective that is not in this unit`);
    if (a.kind === 'quiz') {
      if (!a.quizId) throw badRequest(`Choose the quiz for "${a.title}"`);
      if (!(await Quiz.exists({ _id: a.quizId, courseId }))) throw badRequest(`The quiz for "${a.title}" is not part of this course`);
      a.scoring = 'auto';
    }
    if (a.kind === 'tool') {
      if (!a.toolId) throw badRequest(`Choose the tool for "${a.title}"`);
      if (!(await ToolIntegration.exists({ _id: a.toolId }))) throw badRequest(`Tool for "${a.title}" not found`);
      a.scoring = 'auto';
    }
  }
}

curriculumRouter.post('/chapters/:id/units', requireRole('super_admin'), async (req, res) => {
  const chapter = await Chapter.findById(idParam(req)).lean();
  if (!chapter) throw notFound('Chapter');
  const data = body(req, unitBody);
  await checkJourney(data, chapter.courseId);
  const position = data.position ?? (await Unit.countDocuments({ chapterId: chapter._id }));
  const unit = await Unit.create({ ...data, body: cleanHtml(data.body), courseId: chapter.courseId, chapterId: chapter._id, position });
  res.status(201).json(unit);
});

curriculumRouter.post('/chapters/:id/units/reorder', requireRole('super_admin'), async (req, res) => {
  const { ids } = body(req, reorderBody);
  await Promise.all(ids.map((id, i) => Unit.updateOne({ _id: id, chapterId: idParam(req) }, { position: i })));
  res.json({ ok: true });
});

curriculumRouter.get('/units/:id', async (req, res) => {
  const me = currentUser(req);
  const unit = await Unit.findById(idParam(req)).lean();
  if (!unit) throw notFound('Unit');
  await assertCourseAccess(me, String(unit.courseId));
  const [course, chapter, siblings, done] = await Promise.all([
    Course.findById(unit.courseId).select('title status').lean(),
    Chapter.findById(unit.chapterId).select('title position').lean(),
    Unit.find({ courseId: unit.courseId }).select('_id chapterId position title').lean(),
    me.role === 'student' ? UnitProgress.exists({ studentId: me.id, unitId: unit._id }) : null,
  ]);
  if (me.role !== 'super_admin' && course?.status !== 'published') throw notFound('Unit');
  // Order across chapters to give prev/next navigation
  const chapters = await Chapter.find({ courseId: unit.courseId }).select('_id position').lean();
  const chPos = new Map(chapters.map((c) => [String(c._id), c.position ?? 0]));
  const ordered = siblings.sort((a, b) => (chPos.get(String(a.chapterId))! - chPos.get(String(b.chapterId))!) || (a.position ?? 0) - (b.position ?? 0));
  const idx = ordered.findIndex((u) => String(u._id) === String(unit._id));
  const outcome = me.role === 'student' ? await unitOutcome(unit, me.id) : null;
  const tools = (unit.activities ?? []).some((a) => a.toolId)
    ? await ToolIntegration.find({ _id: { $in: unit.activities!.map((a) => a.toolId).filter(Boolean) } }).select('name kind description active launchUrl').lean()
    : [];
  res.json({
    ...unit,
    tools: tools.map((t) => ({ _id: t._id, name: t.name, kind: t.kind, description: t.description, connected: t.active && !!t.launchUrl })),
    outcome,
    course,
    chapter,
    completed: !!done,
    prev: idx > 0 ? { _id: ordered[idx - 1]._id, title: ordered[idx - 1].title } : null,
    next: idx < ordered.length - 1 ? { _id: ordered[idx + 1]._id, title: ordered[idx + 1].title } : null,
  });
});

curriculumRouter.patch('/units/:id', requireRole('super_admin'), async (req, res) => {
  const data = body(req, unitBody.partial());
  if (data.body !== undefined) data.body = cleanHtml(data.body);
  const current = await Unit.findById(idParam(req)).select('courseId objectives').lean();
  if (!current) throw notFound('Unit');
  await checkJourney(data, current.courseId, current);
  const unit = await Unit.findByIdAndUpdate(idParam(req), data, { new: true });
  if (!unit) throw notFound('Unit');
  res.json(unit);
});

curriculumRouter.delete('/units/:id', requireRole('super_admin'), async (req, res) => {
  const id = idParam(req);
  await Promise.all([Unit.deleteOne({ _id: id }), UnitProgress.deleteMany({ unitId: id })]);
  res.json({ ok: true });
});

curriculumRouter.post('/units/:id/complete', requireRole('student'), async (req, res) => {
  const me = currentUser(req);
  const unit = await Unit.findById(idParam(req)).lean();
  if (!unit) throw notFound('Unit');
  await assertCourseAccess(me, String(unit.courseId));
  await UnitProgress.updateOne(
    { studentId: me.id, unitId: unit._id },
    { $setOnInsert: { courseId: unit.courseId, completedAt: new Date() } },
    { upsert: true },
  );
  res.json({ ok: true, completed: true });
});

curriculumRouter.delete('/units/:id/complete', requireRole('student'), async (req, res) => {
  await UnitProgress.deleteOne({ studentId: currentUser(req).id, unitId: idParam(req) });
  res.json({ ok: true, completed: false });
});

/* ------------------------------------------------------- Course grants */

curriculumRouter.get('/course-grants', requireRole('super_admin', 'partner', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const f = query(req, z.object({ courseId: objectId.optional(), partnerId: objectId.optional(), schoolId: objectId.optional() }));
  const filter: Record<string, unknown> = {};
  if (f.courseId) filter.courseId = f.courseId;
  if (me.role === 'super_admin') {
    if (f.partnerId) filter.partnerId = f.partnerId;
    if (f.schoolId) filter.schoolId = f.schoolId;
  } else if (me.role === 'partner') {
    if (f.schoolId) {
      await assertSchoolAccess(me, f.schoolId);
      filter.schoolId = f.schoolId;
    } else filter.partnerId = me.partnerId;
  } else {
    filter.schoolId = me.schoolId;
  }
  const grants = await CourseGrant.find(filter)
    .populate('courseId', 'title category grades status thumbnailUrl')
    .populate('partnerId', 'name')
    .populate('schoolId', 'name')
    .sort({ createdAt: -1 })
    .lean();
  res.json(grants);
});

curriculumRouter.post('/course-grants', requireRole('super_admin', 'partner'), async (req, res) => {
  const me = currentUser(req);
  const data = body(
    req,
    z.object({ courseId: objectId, partnerId: objectId.optional(), schoolId: objectId.optional() }).refine((d) => !!d.partnerId !== !!d.schoolId, {
      message: 'Give either partnerId or schoolId',
    }),
  );
  const course = await Course.findById(data.courseId).lean();
  if (!course) throw notFound('Course');
  if (me.role === 'partner') {
    // Partners pass on courses they hold to their own schools
    if (!data.schoolId) throw forbidden();
    await assertSchoolAccess(me, data.schoolId);
    if (!(await CourseGrant.exists({ courseId: data.courseId, partnerId: me.partnerId }))) throw forbidden('This course is not assigned to your organisation');
  } else {
    if (data.partnerId && !(await Partner.exists({ _id: data.partnerId }))) throw notFound('Partner');
    if (data.schoolId && !(await School.exists({ _id: data.schoolId }))) throw notFound('School');
  }
  const existing = await CourseGrant.findOne(data).lean();
  if (existing) return res.json(existing);
  const grant = await CourseGrant.create({ ...data, grantedBy: me.id, viaPartnerId: me.role === 'partner' ? me.partnerId : undefined });
  audit(req, 'course.grant', 'Course', data.courseId, data);
  res.status(201).json(grant);
});

curriculumRouter.delete('/course-grants/:id', requireRole('super_admin', 'partner'), async (req, res) => {
  const me = currentUser(req);
  const grant = await CourseGrant.findById(idParam(req)).lean();
  if (!grant) throw notFound('Grant');
  if (me.role === 'partner') {
    if (!grant.schoolId) throw forbidden();
    await assertSchoolAccess(me, grant.schoolId);
  }
  await CourseGrant.deleteOne({ _id: grant._id });
  if (grant.partnerId) {
    const schools = await School.find({ partnerId: grant.partnerId }).select('_id').lean();
    await CourseGrant.deleteMany({ courseId: grant.courseId, schoolId: { $in: schools.map((s) => s._id) }, viaPartnerId: grant.partnerId });
  }
  audit(req, 'course.revoke', 'Course', grant.courseId);
  res.json({ ok: true });
});

/* -------------------------------------------------- Courses in classes */

curriculumRouter.get('/class-courses', async (req, res) => {
  const me = currentUser(req);
  const { classId, schoolId } = query(req, z.object({ classId: objectId.optional(), schoolId: objectId.optional() }));
  const filter: Record<string, unknown> = {};
  if (classId) {
    await assertClassAccess(me, classId, 'read');
    filter.classId = classId;
  } else if (me.role === 'teacher') {
    filter.teacherId = me.id;
  } else if (me.role === 'school_admin') {
    filter.schoolId = me.schoolId;
  } else if (schoolId) {
    await assertSchoolAccess(me, schoolId);
    filter.schoolId = schoolId;
  } else if (me.role === 'student') {
    filter.classId = me.classId;
  } else throw badRequest('classId or schoolId is required');
  const items = await ClassCourse.find(filter)
    .populate('courseId', 'title category thumbnailUrl grades level')
    .populate('classId', 'name grade section')
    .populate('teacherId', 'name email')
    .lean();
  res.json(items);
});

const classCourseBody = z.object({
  classId: objectId,
  courseId: objectId,
  teacherId: objectId.optional().nullable(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

curriculumRouter.post('/class-courses', requireRole('super_admin', 'partner', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const data = body(req, classCourseBody);
  const cls = await assertClassAccess(me, data.classId, 'teach');
  // The course must be available to the school
  if (!(await CourseGrant.exists({ courseId: data.courseId, schoolId: cls.schoolId }))) throw badRequest('This course is not available to the school yet');
  if (data.teacherId && !(await User.exists({ _id: data.teacherId, role: 'teacher', schoolId: cls.schoolId }))) {
    throw badRequest('Teacher does not belong to this school');
  }
  const item = await ClassCourse.findOneAndUpdate(
    { classId: cls._id, courseId: data.courseId },
    { ...data, schoolId: cls.schoolId },
    { upsert: true, new: true },
  );
  audit(req, 'class.course.assign', 'ClassSection', cls._id, { courseId: data.courseId });
  res.status(201).json(item);
});

curriculumRouter.patch('/class-courses/:id', requireRole('super_admin', 'partner', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const cc = await ClassCourse.findById(idParam(req)).lean();
  if (!cc) throw notFound('Assignment');
  await assertClassAccess(me, String(cc.classId), 'teach');
  const data = body(req, classCourseBody.pick({ teacherId: true, startDate: true, endDate: true }).partial());
  if (data.teacherId && !(await User.exists({ _id: data.teacherId, role: 'teacher', schoolId: cc.schoolId }))) {
    throw badRequest('Teacher does not belong to this school');
  }
  res.json(await ClassCourse.findByIdAndUpdate(cc._id, data, { new: true }));
});

curriculumRouter.delete('/class-courses/:id', requireRole('super_admin', 'partner', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const cc = await ClassCourse.findById(idParam(req)).lean();
  if (!cc) throw notFound('Assignment');
  await assertClassAccess(me, String(cc.classId), 'teach');
  await ClassCourse.deleteOne({ _id: cc._id });
  res.json({ ok: true });
});

/* ------------------------------------------------------------- Progress */

/** A class's progress grid: every student x every course in the class. */
curriculumRouter.get('/progress/classes/:id', requireRole('super_admin', 'partner', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const cls = await assertClassAccess(me, idParam(req), 'read');
  const [students, ccs] = await Promise.all([
    User.find({ classId: cls._id, role: 'student' }).select('name rollNo avatarUrl').sort({ rollNo: 1, name: 1 }).lean(),
    ClassCourse.find({ classId: cls._id }).populate('courseId', 'title').lean(),
  ]);
  const courseIds = ccs.map((c) => String((c.courseId as { _id: unknown })._id));
  const { totals } = await courseStats(courseIds);
  const prog = await UnitProgress.find({ studentId: { $in: students.map((s) => s._id) }, courseId: { $in: courseIds } })
    .select('studentId courseId')
    .lean();
  const counts = new Map<string, number>();
  for (const p of prog) {
    const k = `${p.studentId}:${p.courseId}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  res.json({
    class: cls,
    courses: ccs.map((c) => ({ _id: (c.courseId as { _id: unknown })._id, title: (c.courseId as { title?: string }).title, unitCount: totals.get(String((c.courseId as { _id: unknown })._id)) ?? 0 })),
    students: students.map((s) => ({
      ...s,
      progress: Object.fromEntries(
        courseIds.map((cid) => {
          const t = totals.get(cid) ?? 0;
          const d = counts.get(`${s._id}:${cid}`) ?? 0;
          return [cid, t ? Math.round((d / t) * 100) : 0];
        }),
      ),
    })),
  });
});

export async function studentCourseProgress(studentId: string, classId?: unknown) {
  if (!classId) return [];
  const ccs = await ClassCourse.find({ classId }).populate('courseId', 'title category thumbnailUrl').populate('teacherId', 'name').lean();
  const ids = ccs.map((c) => String((c.courseId as { _id: unknown })._id));
  const { totals, done } = await courseStats(ids, studentId);
  return ccs.map((c) => {
    const id = String((c.courseId as { _id: unknown })._id);
    const t = totals.get(id) ?? 0;
    const d = done.get(id) ?? 0;
    return { course: c.courseId, teacher: c.teacherId, unitCount: t, completedUnits: d, progress: t ? Math.round((d / t) * 100) : 0 };
  });
}

curriculumRouter.get('/progress/students/:id', async (req, res) => {
  const me = currentUser(req);
  const student = await assertStudentAccess(me, idParam(req));
  const cls = student.classId ? await ClassSection.findById(student.classId).select('name grade section').lean() : null;
  const recent = await UnitProgress.find({ studentId: student._id }).sort({ completedAt: -1 }).limit(10).populate('unitId', 'title').populate('courseId', 'title').lean();
  res.json({
    student: { _id: student._id, name: student.name, rollNo: student.rollNo, class: cls },
    courses: await studentCourseProgress(String(student._id), student.classId),
    recent,
  });
});
