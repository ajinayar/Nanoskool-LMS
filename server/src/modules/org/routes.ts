import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { assertClassAccess, assertSchoolAccess, partnerSchoolIds, teacherClassIds } from '../../lib/access.js';
import { createAccount } from '../../lib/accounts.js';
import { audit } from '../../lib/audit.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { body, escapeRegex, idParam, objectId, pageQuery, query } from '../../lib/validate.js';
import { authenticate, currentUser, requireRole, type AuthUser } from '../../middleware/auth.js';
import { ClassCourse, ClassSection, Partner, School, User } from '../../models/index.js';

export const orgRouter = Router();
orgRouter.use(authenticate);

const adminSeed = z.object({ name: z.string().trim().min(1), email: z.string().trim().email() }).optional();

/* ------------------------------------------------------------ Partners */

const partnerBody = z.object({
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().max(20).optional().transform((v) => v || undefined),
  contactName: z.string().trim().max(120).optional(),
  contactEmail: z.string().trim().email().optional().or(z.literal('')),
  contactPhone: z.string().trim().max(30).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

orgRouter.get('/partners', requireRole('super_admin'), async (req, res) => {
  const { page, limit, q } = query(req, pageQuery);
  const filter = q ? { name: new RegExp(escapeRegex(q), 'i') } : {};
  const [items, total] = await Promise.all([
    Partner.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Partner.countDocuments(filter),
  ]);
  const counts = await Promise.all(items.map((p) => School.countDocuments({ partnerId: p._id })));
  res.json({ items: items.map((p, i) => ({ ...p, schoolCount: counts[i] })), total, page, limit });
});

orgRouter.post('/partners', requireRole('super_admin'), async (req, res) => {
  const data = body(req, partnerBody.extend({ admin: adminSeed }));
  const { admin, ...fields } = data;
  const partner = await Partner.create(fields);
  let account;
  if (admin) account = await createAccount({ role: 'partner', name: admin.name, email: admin.email, partnerId: partner._id });
  audit(req, 'partner.create', 'Partner', partner._id);
  res.status(201).json({ partner, admin: account?.user });
});

orgRouter.get('/partners/:id', requireRole('super_admin', 'partner'), async (req, res) => {
  const id = idParam(req);
  const me = currentUser(req);
  if (me.role === 'partner' && me.partnerId !== id) throw forbidden();
  const partner = await Partner.findById(id).lean();
  if (!partner) throw notFound('Partner');
  const [schools, users] = await Promise.all([
    School.find({ partnerId: id }).sort({ name: 1 }).lean(),
    User.find({ role: 'partner', partnerId: id }).lean(),
  ]);
  res.json({ ...partner, schools, users });
});

orgRouter.patch('/partners/:id', requireRole('super_admin'), async (req, res) => {
  const partner = await Partner.findByIdAndUpdate(idParam(req), body(req, partnerBody.partial()), { new: true });
  if (!partner) throw notFound('Partner');
  audit(req, 'partner.update', 'Partner', partner._id);
  res.json(partner);
});

orgRouter.post('/partners/:id/users', requireRole('super_admin'), async (req, res) => {
  const partnerId = idParam(req);
  if (!(await Partner.exists({ _id: partnerId }))) throw notFound('Partner');
  const data = body(req, z.object({ name: z.string().trim().min(1), email: z.string().trim().email() }));
  const { user } = await createAccount({ role: 'partner', ...data, partnerId });
  res.status(201).json(user);
});

/* ------------------------------------------------------------- Schools */

const schoolBody = z.object({
  name: z.string().trim().min(2).max(200),
  code: z.string().trim().max(20).optional().transform((v) => v || undefined),
  partnerId: objectId.optional(),
  board: z.string().trim().max(40).optional(),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  pinCode: z.string().trim().max(12).optional(),
  country: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  website: z.string().trim().max(200).optional(),
  principalName: z.string().trim().max(120).optional(),
  logoUrl: z.string().trim().max(500).optional(),
  academicYear: z.string().trim().max(20).optional(),
  plan: z.enum(['basic', 'standard', 'premium']).optional(),
  aiMonthlyTokens: z.number().int().min(0).max(100_000_000).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

orgRouter.get('/schools', requireRole('super_admin', 'partner'), async (req, res) => {
  const me = currentUser(req);
  const { page, limit, q } = query(req, pageQuery);
  const { partnerId } = query(req, z.object({ partnerId: objectId.optional() }).passthrough());
  const filter: Record<string, unknown> = {};
  if (me.role === 'partner') filter.partnerId = me.partnerId;
  else if (partnerId) filter.partnerId = partnerId;
  if (q) filter.name = new RegExp(escapeRegex(q), 'i');
  const [items, total] = await Promise.all([
    School.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).populate('partnerId', 'name').lean(),
    School.countDocuments(filter),
  ]);
  const stats = await Promise.all(
    items.map(async (s) => ({
      students: await User.countDocuments({ schoolId: s._id, role: 'student' }),
      teachers: await User.countDocuments({ schoolId: s._id, role: 'teacher' }),
    })),
  );
  res.json({ items: items.map((s, i) => ({ ...s, ...stats[i] })), total, page, limit });
});

orgRouter.post('/schools', requireRole('super_admin', 'partner'), async (req, res) => {
  const me = currentUser(req);
  const data = body(req, schoolBody.extend({ admin: adminSeed }));
  const { admin, ...fields } = data;
  if (me.role === 'partner') {
    fields.partnerId = me.partnerId;
    delete fields.plan;
    delete fields.aiMonthlyTokens;
  }
  const school = await School.create(fields);
  let account;
  if (admin) {
    account = await createAccount({ role: 'school_admin', name: admin.name, email: admin.email, schoolId: school._id, partnerId: school.partnerId });
  }
  audit(req, 'school.create', 'School', school._id);
  res.status(201).json({ school, admin: account?.user });
});

orgRouter.get('/schools/:id', async (req, res) => {
  const id = idParam(req);
  const me = currentUser(req);
  if (me.role !== 'super_admin' && me.role !== 'partner' && me.schoolId !== id) throw forbidden();
  await assertSchoolAccess(me, id);
  const school = await School.findById(id).populate('partnerId', 'name').lean();
  if (!school) throw notFound('School');
  const [students, teachers, parents, classes, admins] = await Promise.all([
    User.countDocuments({ schoolId: id, role: 'student' }),
    User.countDocuments({ schoolId: id, role: 'teacher' }),
    User.countDocuments({ schoolId: id, role: 'parent' }),
    ClassSection.countDocuments({ schoolId: id }),
    me.role === 'student' || me.role === 'parent' ? [] : User.find({ schoolId: id, role: 'school_admin' }).select('name email status').lean(),
  ]);
  res.json({ ...school, stats: { students, teachers, parents, classes }, admins });
});

orgRouter.patch('/schools/:id', requireRole('super_admin', 'partner', 'school_admin'), async (req, res) => {
  const id = idParam(req);
  const me = currentUser(req);
  await assertSchoolAccess(me, id);
  const data = body(req, schoolBody.partial());
  if (me.role !== 'super_admin') {
    delete data.partnerId;
    delete data.plan;
    delete data.aiMonthlyTokens;
    if (me.role === 'school_admin') delete data.status;
  }
  const school = await School.findByIdAndUpdate(id, data, { new: true });
  audit(req, 'school.update', 'School', id);
  res.json(school);
});

/* ------------------------------------------------------------- Classes */

const classBody = z.object({
  grade: z.number().int().min(1).max(12),
  section: z.string().trim().min(1).max(10),
  name: z.string().trim().max(60).optional(),
  classTeacherId: objectId.optional().nullable(),
  academicYear: z.string().trim().max(20).optional(),
});

async function resolveSchoolId(me: AuthUser, schoolId?: string) {
  if (me.role === 'school_admin' || me.role === 'teacher') return me.schoolId!;
  if (!schoolId) throw badRequest('schoolId is required');
  await assertSchoolAccess(me, schoolId);
  return schoolId;
}

orgRouter.get('/classes', requireRole('super_admin', 'partner', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const { schoolId } = query(req, z.object({ schoolId: objectId.optional() }));
  const filter: Record<string, unknown> = { schoolId: await resolveSchoolId(me, schoolId) };
  if (me.role === 'teacher') filter._id = { $in: await teacherClassIds(me.id) };
  const classes = await ClassSection.find(filter).sort({ grade: 1, section: 1 }).populate('classTeacherId', 'name').lean();
  const counts = await Promise.all(classes.map((c) => User.countDocuments({ classId: c._id, role: 'student' })));
  res.json(classes.map((c, i) => ({ ...c, studentCount: counts[i] })));
});

async function assertTeacherInSchool(teacherId: string | null | undefined, schoolId: string) {
  if (!teacherId) return;
  const t = await User.exists({ _id: teacherId, role: 'teacher', schoolId });
  if (!t) throw badRequest('Teacher does not belong to this school');
}

orgRouter.post('/classes', requireRole('super_admin', 'partner', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const data = body(req, classBody.extend({ schoolId: objectId.optional() }));
  const schoolId = await resolveSchoolId(me, data.schoolId);
  await assertTeacherInSchool(data.classTeacherId, schoolId);
  const school = await School.findById(schoolId).select('academicYear').lean();
  const cls = await ClassSection.create({
    ...data,
    schoolId,
    name: data.name || `Grade ${data.grade} - ${data.section.toUpperCase()}`,
    academicYear: data.academicYear ?? school?.academicYear,
  });
  audit(req, 'class.create', 'ClassSection', cls._id);
  res.status(201).json(cls);
});

orgRouter.get('/classes/:id', async (req, res) => {
  const me = currentUser(req);
  const cls = await assertClassAccess(me, idParam(req), 'read');
  const [students, courses, teacher] = await Promise.all([
    me.role === 'student' || me.role === 'parent'
      ? []
      : User.find({ classId: cls._id, role: 'student' }).select('name email username rollNo avatarUrl status gender').sort({ rollNo: 1, name: 1 }).lean(),
    ClassCourse.find({ classId: cls._id }).populate('courseId', 'title category thumbnailUrl').populate('teacherId', 'name').lean(),
    cls.classTeacherId ? User.findById(cls.classTeacherId).select('name email').lean() : null,
  ]);
  res.json({ ...cls, classTeacher: teacher, students, courses });
});

orgRouter.patch('/classes/:id', requireRole('super_admin', 'partner', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const cls = await assertClassAccess(me, idParam(req), 'teach');
  const data = body(req, classBody.partial());
  await assertTeacherInSchool(data.classTeacherId, String(cls.schoolId));
  const updated = await ClassSection.findByIdAndUpdate(cls._id, data, { new: true });
  res.json(updated);
});

orgRouter.delete('/classes/:id', requireRole('super_admin', 'partner', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const cls = await assertClassAccess(me, idParam(req), 'teach');
  if (await User.exists({ classId: cls._id, role: 'student' })) throw badRequest('Move the students out of this class first');
  await ClassCourse.deleteMany({ classId: cls._id });
  await ClassSection.deleteOne({ _id: cls._id });
  audit(req, 'class.delete', 'ClassSection', cls._id);
  res.json({ ok: true });
});

/* --------------------------------------------------------------- People */

const MANAGED: Record<string, string[]> = {
  super_admin: ['super_admin', 'partner', 'school_admin', 'teacher', 'student', 'parent'],
  partner: ['school_admin', 'teacher', 'student', 'parent'],
  school_admin: ['school_admin', 'teacher', 'student', 'parent'],
};

async function assertCanManage(me: AuthUser, target: { role: string; schoolId?: unknown; partnerId?: unknown }) {
  const allowed = MANAGED[me.role];
  if (!allowed || !allowed.includes(target.role)) throw forbidden();
  if (me.role === 'super_admin') return;
  if (!target.schoolId) throw forbidden();
  await assertSchoolAccess(me, target.schoolId);
}

const personBody = z.object({
  role: z.enum(['super_admin', 'partner', 'school_admin', 'teacher', 'student', 'parent']),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().optional().or(z.literal('')),
  username: z.string().trim().min(3).max(60).regex(/^[a-zA-Z0-9._-]+$/).optional().or(z.literal('')),
  password: z.string().optional(),
  phone: z.string().trim().max(30).optional(),
  schoolId: objectId.optional(),
  partnerId: objectId.optional(),
  classId: objectId.optional().nullable(),
  rollNo: z.string().trim().max(30).optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(['male', 'female', 'other', '']).optional(),
  childIds: z.array(objectId).max(10).optional(),
  relation: z.string().trim().max(30).optional(),
  subjects: z.array(z.string().trim().max(60)).max(20).optional(),
  qualification: z.string().trim().max(120).optional(),
});

async function checkRelations(schoolId: string | undefined, data: { classId?: string | null; childIds?: string[] }) {
  if (data.classId) {
    const ok = await ClassSection.exists({ _id: data.classId, schoolId });
    if (!ok) throw badRequest('Class does not belong to this school');
  }
  if (data.childIds?.length) {
    const n = await User.countDocuments({ _id: { $in: data.childIds }, role: 'student', schoolId });
    if (n !== data.childIds.length) throw badRequest('Every child must be a student of this school');
  }
}

orgRouter.get('/users', requireRole('super_admin', 'partner', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const { page, limit, q } = query(req, pageQuery);
  const f = query(
    req,
    z
      .object({
        role: z.enum(['super_admin', 'partner', 'school_admin', 'teacher', 'student', 'parent']).optional(),
        schoolId: objectId.optional(),
        partnerId: objectId.optional(),
        classId: objectId.optional(),
        status: z.enum(['active', 'suspended']).optional(),
      })
      .passthrough(),
  );
  const filter: Record<string, unknown> = {};
  if (f.role) filter.role = f.role;
  if (f.status) filter.status = f.status;
  if (f.classId) filter.classId = f.classId;
  if (me.role === 'super_admin') {
    if (f.schoolId) filter.schoolId = f.schoolId;
    if (f.partnerId) filter.partnerId = f.partnerId;
  } else if (me.role === 'partner') {
    const ids = await partnerSchoolIds(me.partnerId!);
    if (f.schoolId && !ids.some((i) => String(i) === f.schoolId)) throw forbidden();
    filter.schoolId = f.schoolId ?? { $in: ids };
  } else if (me.role === 'school_admin') {
    filter.schoolId = me.schoolId;
  } else {
    // Teachers can list students (and their parents) only in the classes they teach
    const classIds = await teacherClassIds(me.id);
    if (f.classId && !classIds.includes(f.classId)) throw forbidden();
    if (f.role === 'parent') {
      const kids = await User.find({ classId: f.classId ?? { $in: classIds }, role: 'student' }).select('_id').lean();
      filter.childIds = { $in: kids.map((k) => k._id) };
      delete filter.classId;
    } else {
      filter.role = 'student';
      filter.classId = f.classId ?? { $in: classIds };
    }
    filter.schoolId = me.schoolId;
  }
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { username: rx }, { rollNo: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('classId', 'name grade section')
      .populate('schoolId', 'name')
      .populate('childIds', 'name classId')
      .lean(),
    User.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit });
});

orgRouter.post('/users', requireRole('super_admin', 'partner', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const data = body(req, personBody);
  if (me.role === 'school_admin') data.schoolId = me.schoolId;
  if (['school_admin', 'teacher', 'student', 'parent'].includes(data.role) && !data.schoolId) throw badRequest('schoolId is required');
  if (data.role === 'partner' && !data.partnerId) throw badRequest('partnerId is required');
  await assertCanManage(me, data);
  if (data.schoolId) {
    const school = await School.findById(data.schoolId).select('partnerId').lean();
    if (!school) throw notFound('School');
    if (data.role !== 'partner') data.partnerId = school.partnerId ? String(school.partnerId) : undefined;
  }
  await checkRelations(data.schoolId, data);
  if (data.role !== 'student') delete data.classId;
  if (data.role !== 'parent') delete data.childIds;
  const { user, tempPassword } = await createAccount({ ...data, email: data.email || undefined, username: data.username || undefined });
  audit(req, 'user.create', 'User', user._id, { role: data.role });
  res.status(201).json({ user, tempPassword });
});

/**
 * Bulk import students (and optionally their parents) from rows the client parsed from CSV/Excel.
 * A row fails on its own; the rest are still created.
 */
orgRouter.post('/users/import', requireRole('super_admin', 'partner', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const { rows, schoolId: sid } = body(
    req,
    z.object({
      schoolId: objectId.optional(),
      rows: z
        .array(
          z.object({
            name: z.string().trim().min(1),
            email: z.string().trim().email().optional().or(z.literal('')),
            username: z.string().trim().optional(),
            grade: z.coerce.number().int().min(1).max(12),
            section: z.string().trim().min(1),
            rollNo: z.string().trim().optional(),
            gender: z.string().trim().optional(),
            parentName: z.string().trim().optional(),
            parentEmail: z.string().trim().email().optional().or(z.literal('')),
            parentPhone: z.string().trim().optional(),
          }),
        )
        .min(1)
        .max(1000),
    }),
  );
  const schoolId = await resolveSchoolId(me, sid);
  const school = await School.findById(schoolId).lean();
  if (!school) throw notFound('School');
  const classes = await ClassSection.find({ schoolId }).lean();
  const results: { row: number; ok: boolean; name: string; username?: string; tempPassword?: string; error?: string }[] = [];
  for (const [i, r] of rows.entries()) {
    try {
      const cls = classes.find((c) => c.grade === r.grade && c.section === r.section.toUpperCase());
      if (!cls) throw new Error(`No class Grade ${r.grade} - ${r.section}`);
      const username =
        r.username || (r.email ? undefined : `${(school.code || 'ns').toLowerCase()}.${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}${r.rollNo ? '.' + r.rollNo.toLowerCase().replace(/[^a-z0-9]/g, '') : Math.floor(Math.random() * 900 + 100)}`);
      const gender = ['male', 'female', 'other'].includes((r.gender ?? '').toLowerCase()) ? r.gender!.toLowerCase() : '';
      const { user, tempPassword } = await createAccount({
        role: 'student',
        name: r.name,
        email: r.email || undefined,
        username,
        schoolId,
        partnerId: school.partnerId,
        classId: cls._id,
        rollNo: r.rollNo,
        gender,
      });
      if (r.parentEmail) {
        const existing = await User.findOne({ email: r.parentEmail.toLowerCase(), role: 'parent', schoolId });
        if (existing) {
          await User.updateOne({ _id: existing._id }, { $addToSet: { childIds: user._id } });
        } else {
          await createAccount({
            role: 'parent',
            name: r.parentName || `Parent of ${r.name}`,
            email: r.parentEmail,
            phone: r.parentPhone,
            schoolId,
            partnerId: school.partnerId,
            childIds: [user._id],
          });
        }
      }
      results.push({ row: i + 1, ok: true, name: r.name, username: user.username ?? undefined, tempPassword });
    } catch (err) {
      const msg = (err as { code?: number }).code === 11000 ? 'Email or username already exists' : (err as Error).message;
      results.push({ row: i + 1, ok: false, name: r.name, error: msg });
    }
  }
  audit(req, 'user.import', 'School', schoolId, { created: results.filter((r) => r.ok).length });
  res.json({ created: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results });
});

orgRouter.get('/users/:id', requireRole('super_admin', 'partner', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const user = await User.findById(idParam(req)).populate('classId', 'name grade section').populate('childIds', 'name classId rollNo').populate('schoolId', 'name').lean();
  if (!user) throw notFound('User');
  if (me.role === 'teacher') {
    const classIds = await teacherClassIds(me.id);
    const visible =
      (user.role === 'student' && user.classId && classIds.includes(String((user.classId as { _id?: unknown })._id ?? user.classId))) ||
      String(user._id) === me.id;
    if (!visible) throw forbidden();
  } else {
    await assertCanManage(me, { role: user.role, schoolId: (user.schoolId as { _id?: unknown } | null)?._id ?? user.schoolId });
  }
  const parents = user.role === 'student' ? await User.find({ role: 'parent', childIds: user._id }).select('name email phone relation').lean() : [];
  res.json({ ...user, parents });
});

orgRouter.patch('/users/:id', requireRole('super_admin', 'partner', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const target = await User.findById(idParam(req)).lean();
  if (!target) throw notFound('User');
  await assertCanManage(me, target);
  const data = body(req, personBody.omit({ role: true, password: true, schoolId: true, partnerId: true }).partial());
  await checkRelations(target.schoolId ? String(target.schoolId) : undefined, data);
  if (target.role !== 'student') delete data.classId;
  if (target.role !== 'parent') delete data.childIds;
  const { email, username, ...rest } = data;
  const update: Record<string, unknown> = { $set: rest };
  const unset: Record<string, 1> = {};
  if (email !== undefined) {
    if (email) (update.$set as Record<string, unknown>).email = email.toLowerCase();
    else unset.email = 1;
  }
  if (username !== undefined) {
    if (username) (update.$set as Record<string, unknown>).username = username.toLowerCase();
    else unset.username = 1;
  }
  const willHaveEmail = email !== undefined ? !!email : !!target.email;
  const willHaveUsername = username !== undefined ? !!username : !!target.username;
  if (!willHaveEmail && !willHaveUsername) throw badRequest('A user needs an email or a username to sign in');
  if (Object.keys(unset).length) update.$unset = unset;
  await User.updateOne({ _id: target._id }, update);
  const updated = await User.findById(target._id).lean();
  audit(req, 'user.update', 'User', target._id);
  res.json(updated);
});

orgRouter.post('/users/:id/status', requireRole('super_admin', 'partner', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const { status } = body(req, z.object({ status: z.enum(['active', 'suspended']) }));
  const target = await User.findById(idParam(req)).lean();
  if (!target) throw notFound('User');
  if (String(target._id) === me.id) throw badRequest('You cannot change your own status');
  await assertCanManage(me, target);
  await User.updateOne({ _id: target._id }, { status });
  audit(req, `user.${status}`, 'User', target._id);
  res.json({ ok: true, status });
});

/** Admin-triggered password reset: emails a link, or returns a one-time password for accounts without email. */
orgRouter.post('/users/:id/reset-password', requireRole('super_admin', 'partner', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const target = await User.findById(idParam(req));
  if (!target) throw notFound('User');
  await assertCanManage(me, target);
  const { issueResetLink, hashPassword } = await import('../../lib/accounts.js');
  const { tempPassword } = await import('../../lib/tokens.js');
  const { sendMail } = await import('../../lib/mailer.js');
  audit(req, 'user.reset_password', 'User', target._id);
  if (target.email) {
    const link = await issueResetLink(target._id, 'reset');
    await sendMail(target.email, 'Reset your Nanoskool password', `Hello ${target.name},\n\nYour school has reset your password. Set a new one here (valid for 1 hour):\n${link}`);
    return res.json({ ok: true, emailed: true });
  }
  const pw = tempPassword();
  target.passwordHash = await hashPassword(pw);
  target.mustChangePassword = true;
  await target.save();
  res.json({ ok: true, emailed: false, tempPassword: pw });
});

export const toObjectIds = (ids: string[]) => ids.map((i) => new Types.ObjectId(i));
