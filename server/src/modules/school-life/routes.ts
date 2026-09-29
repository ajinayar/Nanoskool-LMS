import { Router } from 'express';
import { z } from 'zod';
import { assertClassAccess, assertSchoolAccess, assertStudentAccess, partnerSchoolIds, schoolFilter, teacherClassIds } from '../../lib/access.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { cleanHtml } from '../../lib/sanitize.js';
import { todayIn } from '../../lib/time.js';
import { body, idParam, objectId, query } from '../../lib/validate.js';
import { authenticate, currentUser, requireRole, type AuthUser } from '../../middleware/auth.js';
import { Announcement, Attendance, Event, Remark, School, User } from '../../models/index.js';

export const schoolLifeRouter = Router();
schoolLifeRouter.use(authenticate);

/* ----------------------------------------------------------- Attendance */

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

schoolLifeRouter.get('/attendance', async (req, res) => {
  const me = currentUser(req);
  const f = query(req, z.object({ classId: objectId.optional(), studentId: objectId.optional(), date: dateStr.optional(), from: dateStr.optional(), to: dateStr.optional() }));
  if (f.classId && f.date) {
    const cls = await assertClassAccess(me, f.classId, 'read');
    const [sheet, students] = await Promise.all([
      Attendance.findOne({ classId: cls._id, date: f.date }).lean(),
      me.role === 'student' || me.role === 'parent' ? [] : User.find({ classId: cls._id, role: 'student' }).select('name rollNo avatarUrl').sort({ rollNo: 1, name: 1 }).lean(),
    ]);
    return res.json({ date: f.date, class: cls, sheet, students });
  }
  if (f.studentId || me.role === 'student') {
    const sid = me.role === 'student' ? me.id : f.studentId!;
    const student = await assertStudentAccess(me, sid);
    const range: Record<string, string> = {};
    if (f.from) range.$gte = f.from;
    if (f.to) range.$lte = f.to;
    const sheets = await Attendance.find({ classId: student.classId, 'records.studentId': student._id, ...(f.from || f.to ? { date: range } : {}) })
      .sort({ date: -1 })
      .limit(400)
      .lean();
    const days = sheets.map((s) => ({ date: s.date, status: s.records.find((r) => String(r.studentId) === String(student._id))?.status ?? 'present' }));
    const present = days.filter((d) => d.status === 'present' || d.status === 'late').length;
    return res.json({ studentId: student._id, days, summary: { total: days.length, present, percent: days.length ? Math.round((present / days.length) * 100) : null } });
  }
  if (f.classId) {
    const cls = await assertClassAccess(me, f.classId, 'read');
    const sheets = await Attendance.find({ classId: cls._id }).sort({ date: -1 }).limit(60).lean();
    return res.json(
      sheets.map((s) => ({
        date: s.date,
        present: s.records.filter((r) => r.status === 'present' || r.status === 'late').length,
        total: s.records.length,
      })),
    );
  }
  throw badRequest('Give classId (and date), or studentId');
});

schoolLifeRouter.put('/attendance', requireRole('teacher', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const data = body(
    req,
    z.object({
      classId: objectId,
      date: dateStr,
      records: z.array(z.object({ studentId: objectId, status: z.enum(['present', 'absent', 'late', 'excused']) })).max(200),
    }),
  );
  const cls = await assertClassAccess(me, data.classId, 'teach');
  const ids = new Set((await User.find({ classId: cls._id, role: 'student' }).select('_id').lean()).map((s) => String(s._id)));
  if (!data.records.every((r) => ids.has(r.studentId))) throw badRequest('Every student must belong to this class');
  const school = await School.findById(cls.schoolId).select('timezone').lean();
  const today = todayIn(school?.timezone ?? undefined);
  if (data.date > today) throw badRequest('Cannot take attendance for a future date');
  const sheet = await Attendance.findOneAndUpdate(
    { classId: cls._id, date: data.date },
    { schoolId: cls.schoolId, classId: cls._id, date: data.date, records: data.records, takenBy: me.id },
    { upsert: true, new: true },
  );
  res.json(sheet);
});

/* -------------------------------------------------------------- Remarks */

schoolLifeRouter.get('/remarks', async (req, res) => {
  const me = currentUser(req);
  const { studentId, classId } = query(req, z.object({ studentId: objectId.optional(), classId: objectId.optional() }));
  const filter: Record<string, unknown> = {};
  if (me.role === 'student') {
    filter.studentId = me.id;
  } else if (studentId) {
    await assertStudentAccess(me, studentId);
    filter.studentId = studentId;
  } else if (me.role === 'parent') {
    filter.studentId = { $in: me.childIds };
  } else if (me.role === 'teacher') {
    filter.teacherId = me.id;
  } else if (classId) {
    await assertClassAccess(me, classId, 'read');
    filter.studentId = { $in: (await User.find({ classId, role: 'student' }).select('_id').lean()).map((s) => s._id) };
  } else {
    Object.assign(filter, await schoolFilter(me));
  }
  if (me.role === 'parent' || me.role === 'student') filter.visibleToParent = true;
  const items = await Remark.find(filter).sort({ createdAt: -1 }).limit(200).populate('teacherId', 'name').populate('studentId', 'name rollNo').lean();
  res.json(items);
});

schoolLifeRouter.post('/remarks', requireRole('teacher', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const data = body(
    req,
    z.object({
      studentId: objectId,
      category: z.enum(['appreciation', 'improvement', 'behaviour', 'general']).optional(),
      text: z.string().trim().min(1).max(2000),
      visibleToParent: z.boolean().optional(),
    }),
  );
  const student = await assertStudentAccess(me, data.studentId);
  const remark = await Remark.create({ ...data, schoolId: student.schoolId, teacherId: me.id });
  res.status(201).json(remark);
});

schoolLifeRouter.delete('/remarks/:id', requireRole('teacher', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const r = await Remark.findById(idParam(req)).lean();
  if (!r) throw notFound('Remark');
  if (me.role === 'teacher' && String(r.teacherId) !== me.id) throw forbidden();
  if (me.role === 'school_admin' && String(r.schoolId) !== me.schoolId) throw forbidden();
  await Remark.deleteOne({ _id: r._id });
  res.json({ ok: true });
});

/* -------------------------------------------------------- Announcements */

/** What a user can read: global + their partner + their school + their classes, filtered by audience role. */
async function feedFilter(me: AuthUser) {
  const or: Record<string, unknown>[] = [{ scope: 'global' }];
  let schoolIds: string[] = [];
  let partnerId = me.partnerId;
  let classIds: string[] = [];
  if (me.role === 'partner') schoolIds = (await partnerSchoolIds(me.partnerId!)).map(String);
  else if (me.schoolId) schoolIds = [me.schoolId];
  if (!partnerId && me.schoolId) partnerId = String((await School.findById(me.schoolId).select('partnerId').lean())?.partnerId ?? '') || undefined;
  if (me.role === 'teacher') classIds = await teacherClassIds(me.id);
  if (me.role === 'student' && me.classId) classIds = [me.classId];
  if (me.role === 'parent') classIds = (await User.find({ _id: { $in: me.childIds } }).select('classId').lean()).map((k) => String(k.classId));
  if (partnerId) or.push({ scope: 'partner', partnerId });
  if (schoolIds.length) or.push({ scope: 'school', schoolId: { $in: schoolIds } });
  if (classIds.length) or.push({ scope: 'class', classId: { $in: classIds } });
  if (me.role === 'school_admin' || me.role === 'partner') or.push({ scope: 'class', schoolId: { $in: schoolIds } });
  if (me.role === 'super_admin') return {};
  return { $and: [{ $or: or }, { $or: [{ audience: { $size: 0 } }, { audience: me.role }, { createdBy: me._id }] }] };
}

schoolLifeRouter.get('/announcements', async (req, res) => {
  const me = currentUser(req);
  const { kind, limit } = query(req, z.object({ kind: z.enum(['announcement', 'news', 'newsletter']).optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }));
  const filter: Record<string, unknown> = { ...(await feedFilter(me)) };
  if (kind) filter.kind = kind;
  const items = await Announcement.find(filter).sort({ pinned: -1, createdAt: -1 }).limit(limit).populate('createdBy', 'name role').populate('schoolId', 'name').populate('classId', 'name').lean();
  res.json(items);
});

const announcementBody = z.object({
  scope: z.enum(['global', 'partner', 'school', 'class']),
  schoolId: objectId.optional(),
  classId: objectId.optional(),
  audience: z.array(z.enum(['school_admin', 'teacher', 'student', 'parent', 'partner'])).max(5).default([]),
  title: z.string().trim().min(1).max(200),
  body: z.string().max(50_000).optional(),
  kind: z.enum(['announcement', 'news', 'newsletter']).optional(),
  pinned: z.boolean().optional(),
});

schoolLifeRouter.post('/announcements', requireRole('super_admin', 'partner', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const data = body(req, announcementBody);
  const doc: Record<string, unknown> = { ...data, body: cleanHtml(data.body), createdBy: me.id };
  switch (data.scope) {
    case 'global':
      if (me.role !== 'super_admin') throw forbidden();
      break;
    case 'partner':
      if (me.role !== 'partner') throw forbidden();
      doc.partnerId = me.partnerId;
      break;
    case 'school': {
      if (me.role === 'teacher') throw forbidden();
      const sid = me.role === 'school_admin' ? me.schoolId : data.schoolId;
      if (!sid) throw badRequest('schoolId is required');
      await assertSchoolAccess(me, sid);
      doc.schoolId = sid;
      break;
    }
    case 'class': {
      if (!data.classId) throw badRequest('classId is required');
      const cls = await assertClassAccess(me, data.classId, 'teach');
      doc.schoolId = cls.schoolId;
      break;
    }
  }
  res.status(201).json(await Announcement.create(doc));
});

schoolLifeRouter.delete('/announcements/:id', requireRole('super_admin', 'partner', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const a = await Announcement.findById(idParam(req)).lean();
  if (!a) throw notFound('Announcement');
  const own = String(a.createdBy) === me.id;
  const schoolAdmin = me.role === 'school_admin' && String(a.schoolId) === me.schoolId;
  if (!own && !schoolAdmin && me.role !== 'super_admin') throw forbidden();
  await Announcement.deleteOne({ _id: a._id });
  res.json({ ok: true });
});

/* --------------------------------------------------------------- Events */

schoolLifeRouter.get('/events', async (req, res) => {
  const me = currentUser(req);
  const f = query(req, z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional(), schoolId: objectId.optional() }));
  const or: Record<string, unknown>[] = [{ schoolId: null }];
  if (me.role === 'super_admin') {
    if (f.schoolId) or.push({ schoolId: f.schoolId });
    else or.push({ schoolId: { $ne: null } });
  } else if (me.role === 'partner') {
    or.push({ schoolId: { $in: await partnerSchoolIds(me.partnerId!) } });
  } else if (me.schoolId) {
    or.push({ schoolId: me.schoolId, classId: null });
    let classIds: string[] = [];
    if (me.role === 'teacher') classIds = await teacherClassIds(me.id);
    if (me.role === 'student' && me.classId) classIds = [me.classId];
    if (me.role === 'parent') classIds = (await User.find({ _id: { $in: me.childIds } }).select('classId').lean()).map((k) => String(k.classId));
    if (me.role === 'school_admin') or.push({ schoolId: me.schoolId });
    if (classIds.length) or.push({ classId: { $in: classIds } });
  }
  const range: Record<string, Date> = {};
  if (f.from) range.$gte = f.from;
  if (f.to) range.$lte = f.to;
  const events = await Event.find({ $or: or, ...(f.from || f.to ? { startsAt: range } : {}) }).sort({ startsAt: 1 }).limit(300).populate('schoolId', 'name').populate('classId', 'name').lean();
  res.json(events);
});

const eventBody = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional(),
  location: z.string().trim().max(200).optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  schoolId: objectId.optional(),
  classId: objectId.optional(),
});

schoolLifeRouter.post('/events', requireRole('super_admin', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const data = body(req, eventBody);
  const doc: Record<string, unknown> = { ...data, createdBy: me.id };
  if (me.role === 'super_admin') {
    if (data.schoolId) await assertSchoolAccess(me, data.schoolId);
  } else if (me.role === 'school_admin') {
    doc.schoolId = me.schoolId;
  } else {
    if (!data.classId) throw badRequest('Teachers add events for one of their classes');
    const cls = await assertClassAccess(me, data.classId, 'teach');
    doc.schoolId = cls.schoolId;
  }
  if (data.classId && me.role !== 'teacher') {
    const cls = await assertClassAccess(me, data.classId, 'teach');
    doc.schoolId = cls.schoolId;
  }
  res.status(201).json(await Event.create(doc));
});

schoolLifeRouter.delete('/events/:id', requireRole('super_admin', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const e = await Event.findById(idParam(req)).lean();
  if (!e) throw notFound('Event');
  const ok = me.role === 'super_admin' || String(e.createdBy) === me.id || (me.role === 'school_admin' && String(e.schoolId) === me.schoolId);
  if (!ok) throw forbidden();
  await Event.deleteOne({ _id: e._id });
  res.json({ ok: true });
});
