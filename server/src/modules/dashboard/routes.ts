import { Router } from 'express';
import { accessibleCourseIds, assertStudentAccess, partnerSchoolIds, teacherClassIds } from '../../lib/access.js';
import { idParam } from '../../lib/validate.js';
import { authenticate, currentUser, requireRole } from '../../middleware/auth.js';
import {
  Announcement,
  Assignment,
  Attendance,
  AuditLog,
  ClassCourse,
  ClassSection,
  Course,
  CourseGrant,
  Event,
  Partner,
  Quiz,
  QuizAttempt,
  Remark,
  School,
  Submission,
  UnitProgress,
  User,
  toId,
} from '../../models/index.js';
import { studentCourseProgress } from '../curriculum/routes.js';
import { todayIn } from '../../lib/time.js';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

const upcoming = () => ({ $gte: new Date(), $lte: new Date(Date.now() + 30 * 86400_000) });

async function studentReport(studentId: string, viewerRole: string) {
  const student = await User.findById(studentId).populate('classId', 'name grade section').lean();
  if (!student) return null;
  const classId = (student.classId as { _id?: unknown } | null)?._id;
  const [courses, attempts, assignments, subs, sheets, remarks] = await Promise.all([
    studentCourseProgress(studentId, classId),
    QuizAttempt.find({ studentId, submittedAt: { $ne: null } }).sort({ submittedAt: -1 }).limit(50).populate('quizId', 'title').lean(),
    classId ? Assignment.find({ classId, status: { $ne: 'draft' } }).sort({ dueDate: -1 }).limit(50).lean() : [],
    Submission.find({ studentId }).lean(),
    classId ? Attendance.find({ classId, 'records.studentId': student._id }).select('date records').sort({ date: -1 }).limit(200).lean() : [],
    Remark.find({ studentId, ...(viewerRole === 'parent' || viewerRole === 'student' ? { visibleToParent: true } : {}) }).sort({ createdAt: -1 }).limit(20).populate('teacherId', 'name').lean(),
  ]);
  const days = sheets.map((s) => s.records.find((r) => String(r.studentId) === String(student._id))?.status ?? 'present');
  const present = days.filter((d) => d === 'present' || d === 'late').length;
  const graded = subs.filter((s) => s.status === 'graded');
  const pending = assignments.filter((a) => !subs.some((s) => String(s.assignmentId) === String(a._id)) && (!a.dueDate || a.dueDate >= new Date()));
  const overdue = assignments.filter((a) => !subs.some((s) => String(s.assignmentId) === String(a._id)) && a.dueDate && a.dueDate < new Date());
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  return {
    student: { _id: student._id, name: student.name, rollNo: student.rollNo, avatarUrl: student.avatarUrl, class: student.classId },
    courses,
    overallProgress: avg(courses.map((c) => c.progress)),
    quizzes: { count: attempts.length, averagePercent: avg(attempts.map((a) => a.percent ?? 0)), recent: attempts.slice(0, 10) },
    assignments: {
      total: assignments.length,
      submitted: subs.length,
      graded: graded.length,
      averagePercent: avg(
        graded.map((s) => {
          const a = assignments.find((x) => String(x._id) === String(s.assignmentId));
          return a?.maxPoints ? Math.round(((s.points ?? 0) / a.maxPoints) * 100) : 0;
        }),
      ),
      pending: pending.map((a) => ({ _id: a._id, title: a.title, dueDate: a.dueDate, kind: a.kind })),
      overdue: overdue.map((a) => ({ _id: a._id, title: a.title, dueDate: a.dueDate, kind: a.kind })),
    },
    attendance: { days: days.length, present, percent: days.length ? Math.round((present / days.length) * 100) : null },
    remarks,
  };
}

/** One call per portal home page. */
dashboardRouter.get('/dashboard', async (req, res) => {
  const me = currentUser(req);
  const events = (filter: Record<string, unknown>) => Event.find({ ...filter, startsAt: upcoming() }).sort({ startsAt: 1 }).limit(5).populate('schoolId', 'name').populate('classId', 'name').lean();
  switch (me.role) {
    case 'super_admin': {
      const [partners, schools, students, teachers, parents, courses, published, recentLogs] = await Promise.all([
        Partner.countDocuments(),
        School.countDocuments(),
        User.countDocuments({ role: 'student' }),
        User.countDocuments({ role: 'teacher' }),
        User.countDocuments({ role: 'parent' }),
        Course.countDocuments(),
        Course.countDocuments({ status: 'published' }),
        AuditLog.find().sort({ createdAt: -1 }).limit(10).populate('actorId', 'name role').lean(),
      ]);
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const inMonth = (from: Date, to?: Date) => ({ createdAt: to ? { $gte: from, $lt: to } : { $gte: from } });
      const [schoolsNow, schoolsPrev, studentsNow, studentsPrev, attempts, team] = await Promise.all([
        School.countDocuments(inMonth(thisMonth)),
        School.countDocuments(inMonth(lastMonth, thisMonth)),
        User.countDocuments({ role: 'student', ...inMonth(thisMonth) }),
        User.countDocuments({ role: 'student', ...inMonth(lastMonth, thisMonth) }),
        QuizAttempt.find({ submittedAt: { $gte: new Date(Date.now() - 30 * 86400_000) } }).select('percent').lean(),
        User.find({ role: 'super_admin', status: 'active' }).select('name avatarUrl lastLoginAt').sort({ lastLoginAt: -1 }).limit(6).lean(),
      ]);
      const avgQuiz = attempts.length ? Math.round(attempts.reduce((a, b) => a + (b.percent ?? 0), 0) / attempts.length) : null;
      return res.json({
        role: me.role,
        stats: { partners, schools, students, teachers, parents, courses, published },
        growth: { schoolsThisMonth: schoolsNow, schoolsLastMonth: schoolsPrev, studentsThisMonth: studentsNow, studentsLastMonth: studentsPrev, quizAverage30d: avgQuiz, quizAttempts30d: attempts.length },
        team,
        recentActivity: recentLogs,
      });
    }
    case 'partner': {
      const schoolIds = await partnerSchoolIds(me.partnerId!);
      const [schools, students, teachers, grants] = await Promise.all([
        School.find({ partnerId: me.partnerId }).sort({ name: 1 }).lean(),
        User.countDocuments({ role: 'student', schoolId: { $in: schoolIds } }),
        User.countDocuments({ role: 'teacher', schoolId: { $in: schoolIds } }),
        CourseGrant.countDocuments({ partnerId: me.partnerId }),
      ]);
      return res.json({ role: me.role, stats: { schools: schools.length, students, teachers, courses: grants }, schools });
    }
    case 'school_admin': {
      const sid = me.schoolId;
      const school = await School.findById(sid).select('timezone').lean();
      const today = todayIn(school?.timezone ?? undefined);
      const [students, teachers, parents, classes, courses, todaySheets, ev, ann] = await Promise.all([
        User.countDocuments({ role: 'student', schoolId: sid }),
        User.countDocuments({ role: 'teacher', schoolId: sid }),
        User.countDocuments({ role: 'parent', schoolId: sid }),
        ClassSection.countDocuments({ schoolId: sid }),
        accessibleCourseIds(me).then((ids) => (ids === 'all' ? 0 : ids.length)),
        Attendance.find({ schoolId: sid, date: today }).lean(),
        events({ schoolId: sid }),
        Announcement.find({ schoolId: sid }).sort({ createdAt: -1 }).limit(5).lean(),
      ]);
      const marked = todaySheets.reduce((s, x) => s + x.records.length, 0);
      const present = todaySheets.reduce((s, x) => s + x.records.filter((r) => r.status === 'present' || r.status === 'late').length, 0);

      // Growth, class overview, staff and activity for the dashboard
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const staffIds = (await User.find({ schoolId: sid, role: { $in: ['school_admin', 'teacher'] } }).select('_id').lean()).map((u) => u._id);
      const [studentsNow, studentsPrev, attempts, classRows, classCourses, studentCounts, team, recentLogs] = await Promise.all([
        User.countDocuments({ role: 'student', schoolId: sid, createdAt: { $gte: thisMonth } }),
        User.countDocuments({ role: 'student', schoolId: sid, createdAt: { $gte: lastMonth, $lt: thisMonth } }),
        QuizAttempt.find({ classId: { $in: (await ClassSection.find({ schoolId: sid }).select('_id').lean()).map((c) => c._id) }, submittedAt: { $gte: new Date(Date.now() - 30 * 86400_000) } })
          .select('percent')
          .lean(),
        ClassSection.find({ schoolId: sid }).sort({ grade: 1, section: 1 }).populate('classTeacherId', 'name avatarUrl').lean(),
        ClassCourse.aggregate([{ $match: { schoolId: sid ? toId(sid) : null } }, { $group: { _id: '$classId', n: { $sum: 1 } } }]),
        User.aggregate([{ $match: { role: 'student', schoolId: sid ? toId(sid) : null } }, { $group: { _id: '$classId', n: { $sum: 1 } } }]),
        User.find({ schoolId: sid, role: { $in: ['school_admin', 'teacher'] }, status: 'active' }).select('name avatarUrl lastLoginAt role').sort({ lastLoginAt: -1 }).limit(6).lean(),
        AuditLog.find({ actorId: { $in: staffIds } }).sort({ createdAt: -1 }).limit(10).populate('actorId', 'name role').lean(),
      ]);
      const markedIds = new Set(todaySheets.map((x) => String(x.classId)));
      const courseN = new Map(classCourses.map((x) => [String(x._id), x.n as number]));
      const studentN = new Map(studentCounts.map((x) => [String(x._id), x.n as number]));
      const avgQuiz = attempts.length ? Math.round(attempts.reduce((a, b) => a + (b.percent ?? 0), 0) / attempts.length) : null;
      return res.json({
        role: me.role,
        stats: { students, teachers, parents, classes, courses },
        attendanceToday: { classesMarked: todaySheets.length, classes, present, marked, percent: marked ? Math.round((present / marked) * 100) : null },
        growth: { studentsThisMonth: studentsNow, studentsLastMonth: studentsPrev, quizAverage30d: avgQuiz, quizAttempts30d: attempts.length },
        classes: classRows.map((c) => ({
          _id: c._id,
          name: c.name,
          grade: c.grade,
          section: c.section,
          classTeacher: c.classTeacherId ?? null,
          studentCount: studentN.get(String(c._id)) ?? 0,
          courseCount: courseN.get(String(c._id)) ?? 0,
          attendanceMarked: markedIds.has(String(c._id)),
        })),
        team,
        recentActivity: recentLogs,
        upcomingEvents: ev,
        announcements: ann,
      });
    }
    case 'teacher': {
      const classIds = await teacherClassIds(me.id);
      const [classes, ccs, assignments, ev] = await Promise.all([
        ClassSection.find({ _id: { $in: classIds } }).sort({ grade: 1, section: 1 }).lean(),
        ClassCourse.find({ teacherId: me.id }).populate('courseId', 'title thumbnailUrl').populate('classId', 'name').lean(),
        Assignment.find({ createdBy: me.id, status: 'published' }).sort({ dueDate: 1 }).limit(20).populate('classId', 'name').lean(),
        events({ $or: [{ classId: { $in: classIds } }, { schoolId: me.schoolId ?? null, classId: null }] }),
      ]);
      const studentCounts = await Promise.all(classes.map((c) => User.countDocuments({ classId: c._id, role: 'student' })));
      const toGrade = await Submission.countDocuments({ assignmentId: { $in: assignments.map((a) => a._id) }, status: 'submitted' });
      return res.json({
        role: me.role,
        stats: { classes: classes.length, students: studentCounts.reduce((a, b) => a + b, 0), courses: ccs.length, toGrade },
        classes: classes.map((c, i) => ({ ...c, studentCount: studentCounts[i] })),
        courses: ccs,
        assignments,
        upcomingEvents: ev,
      });
    }
    case 'student': {
      const report = await studentReport(me.id, me.role);
      const quizzes = await Quiz.find({ $or: [...(me.classId ? [{ classId: me.classId, status: 'published' }] : []), { schoolId: null, status: 'published', courseId: { $in: report?.courses.map((c) => (c.course as { _id: unknown })._id) ?? [] } }] })
        .select('title courseId dueDate maxAttempts timeLimitMin')
        .lean();
      const done = await QuizAttempt.find({ studentId: me.id, submittedAt: { $ne: null } }).select('quizId').lean();
      const recentUnits = await UnitProgress.find({ studentId: me.id }).sort({ completedAt: -1 }).limit(5).populate('unitId', 'title').populate('courseId', 'title').lean();
      return res.json({
        role: me.role,
        ...report,
        openQuizzes: quizzes
          .map((q) => ({ ...q, attemptsUsed: done.filter((d) => String(d.quizId) === String(q._id)).length }))
          .filter((q) => q.attemptsUsed < (q.maxAttempts ?? 1) && (!q.dueDate || q.dueDate >= new Date())),
        recentUnits,
        upcomingEvents: await events({ $or: [{ schoolId: null }, ...(me.schoolId ? [{ schoolId: me.schoolId, classId: null }] : []), ...(me.classId ? [{ classId: me.classId }] : [])] }),
      });
    }
    case 'parent': {
      const children = await Promise.all(me.childIds.map((id) => studentReport(id, me.role)));
      return res.json({ role: me.role, children: children.filter(Boolean) });
    }
  }
});

/** Full report card for one student (student, parent, their teachers, school admins). */
dashboardRouter.get('/reports/students/:id', async (req, res) => {
  const me = currentUser(req);
  const student = await assertStudentAccess(me, idParam(req));
  res.json(await studentReport(String(student._id), me.role));
});

/** School-level summary for admins: per class progress, attendance and quiz averages. */
dashboardRouter.get('/reports/schools/:id', requireRole('super_admin', 'partner', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const sid = idParam(req);
  const { assertSchoolAccess } = await import('../../lib/access.js');
  await assertSchoolAccess(me, sid);
  const classes = await ClassSection.find({ schoolId: sid }).sort({ grade: 1, section: 1 }).lean();
  const rows = await Promise.all(
    classes.map(async (c) => {
      const students = await User.find({ classId: c._id, role: 'student' }).select('_id').lean();
      const ids = students.map((s) => s._id);
      const [attempts, sheets] = await Promise.all([
        QuizAttempt.find({ studentId: { $in: ids }, submittedAt: { $ne: null } }).select('percent').lean(),
        Attendance.find({ classId: c._id }).select('records').sort({ date: -1 }).limit(30).lean(),
      ]);
      const marks = sheets.flatMap((s) => s.records);
      const present = marks.filter((r) => r.status === 'present' || r.status === 'late').length;
      const progress = await Promise.all(ids.map((id) => studentCourseProgress(String(id), c._id)));
      const flat = progress.flat().map((p) => p.progress);
      return {
        class: { _id: c._id, name: c.name, grade: c.grade, section: c.section },
        students: ids.length,
        avgProgress: flat.length ? Math.round(flat.reduce((a, b) => a + b, 0) / flat.length) : null,
        avgQuiz: attempts.length ? Math.round(attempts.reduce((a, b) => a + (b.percent ?? 0), 0) / attempts.length) : null,
        attendance30d: marks.length ? Math.round((present / marks.length) * 100) : null,
      };
    }),
  );
  res.json({ schoolId: sid, classes: rows });
});
