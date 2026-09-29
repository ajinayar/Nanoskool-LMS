import { Router } from 'express';
import { z } from 'zod';
import { accessibleCourseIds, assertClassAccess, assertStudentAccess, schoolFilter, teacherClassIds } from '../../lib/access.js';
import { audit } from '../../lib/audit.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { cleanHtml } from '../../lib/sanitize.js';
import { body, idParam, objectId, query } from '../../lib/validate.js';
import { authenticate, currentUser, requireRole, type AuthUser } from '../../middleware/auth.js';
import { Assignment, ClassCourse, Quiz, QuizAttempt, Submission, User } from '../../models/index.js';

export const assessmentRouter = Router();
assessmentRouter.use(authenticate);

/* -------------------------------------------------------------- Quizzes */

const questionBody = z
  .object({
    _id: objectId.optional(),
    text: z.string().trim().min(1).max(2000),
    type: z.enum(['single', 'multiple', 'true_false']).default('single'),
    options: z.array(z.string().trim().min(1).max(500)).min(2).max(8),
    correct: z.array(z.number().int().min(0)).min(1),
    points: z.number().min(0).max(100).default(1),
    explanation: z.string().max(2000).optional(),
  })
  .refine((q) => q.correct.every((c) => c < q.options.length), { message: 'Correct answer index out of range' })
  .refine((q) => q.type === 'multiple' || q.correct.length === 1, { message: 'Single-answer questions need exactly one correct option' });

const quizBody = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  courseId: objectId.optional(),
  chapterId: objectId.optional(),
  unitId: objectId.optional(),
  classId: objectId.optional(),
  questions: z.array(questionBody).max(200).default([]),
  timeLimitMin: z.number().int().min(1).max(300).optional().nullable(),
  maxAttempts: z.number().int().min(1).max(20).optional(),
  dueDate: z.coerce.date().optional().nullable(),
  status: z.enum(['draft', 'published']).optional(),
});

type QuizLean = { _id: unknown; schoolId?: unknown; classId?: unknown; courseId?: unknown; status?: string; createdBy?: unknown };

async function canEditQuiz(me: AuthUser, quiz: QuizLean) {
  if (me.role === 'super_admin') return !quiz.schoolId;
  if (me.role === 'teacher') return !!quiz.classId && (await teacherClassIds(me.id)).includes(String(quiz.classId));
  return false;
}

/** Whether the user may open the quiz (take it, or see results). */
async function canViewQuiz(me: AuthUser, quiz: QuizLean) {
  if (await canEditQuiz(me, quiz)) return true;
  if (me.role === 'super_admin') return true;
  if (quiz.classId) {
    try {
      await assertClassAccess(me, String(quiz.classId), 'read');
    } catch {
      return false;
    }
    return me.role === 'student' || me.role === 'parent' ? quiz.status === 'published' : true;
  }
  // Content quiz: open to anyone with access to its course
  if (quiz.status !== 'published' || !quiz.courseId) return false;
  const ids = await accessibleCourseIds(me);
  return ids === 'all' || ids.includes(String(quiz.courseId));
}

function hideAnswers(quiz: Record<string, unknown>) {
  const qs = (quiz.questions as Record<string, unknown>[] | undefined) ?? [];
  return { ...quiz, questions: qs.map(({ correct: _c, explanation: _e, ...rest }) => rest) };
}

assessmentRouter.get('/quizzes', async (req, res) => {
  const me = currentUser(req);
  const f = query(req, z.object({ courseId: objectId.optional(), classId: objectId.optional() }));
  let filter: Record<string, unknown>;
  if (me.role === 'super_admin') {
    filter = { schoolId: null };
    if (f.courseId) filter.courseId = f.courseId;
  } else {
    const courseIds = await accessibleCourseIds(me);
    let classIds: string[] = [];
    if (me.role === 'teacher') classIds = await teacherClassIds(me.id);
    else if (me.role === 'student') classIds = me.classId ? [me.classId] : [];
    else if (me.role === 'parent') classIds = (await User.find({ _id: { $in: me.childIds } }).select('classId').lean()).map((k) => String(k.classId));
    const or: Record<string, unknown>[] = [{ schoolId: null, status: 'published', courseId: { $in: courseIds === 'all' ? [] : courseIds } }];
    if (me.role === 'school_admin' || me.role === 'partner') or.push({ ...(await schoolFilter(me)), classId: { $ne: null } });
    else if (classIds.length) or.push({ classId: { $in: classIds }, ...(me.role === 'teacher' ? {} : { status: 'published' }) });
    filter = { $or: or };
    if (f.courseId) filter.courseId = f.courseId;
    if (f.classId) filter = { $and: [filter, { $or: [{ classId: f.classId }, { schoolId: null }] }] };
  }
  const quizzes = await Quiz.find(filter).sort({ createdAt: -1 }).populate('courseId', 'title').populate('classId', 'name').lean();
  let attempts: { quizId: unknown; percent?: number | null }[] = [];
  if (me.role === 'student') attempts = await QuizAttempt.find({ studentId: me.id, submittedAt: { $ne: null } }).select('quizId percent').lean();
  res.json(
    quizzes.map((q) => {
      const mine = attempts.filter((a) => String(a.quizId) === String(q._id));
      return {
        ...q,
        questions: undefined,
        questionCount: q.questions?.length ?? 0,
        totalPoints: (q.questions ?? []).reduce((s, x) => s + (x.points ?? 1), 0),
        ...(me.role === 'student'
          ? { attemptsUsed: mine.length, bestPercent: mine.length ? Math.max(...mine.map((a) => a.percent ?? 0)) : null }
          : {}),
      };
    }),
  );
});

assessmentRouter.post('/quizzes', requireRole('super_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const data = body(req, quizBody);
  const doc: Record<string, unknown> = { ...data, createdBy: me.id, description: cleanHtml(data.description) };
  if (me.role === 'super_admin') {
    if (!data.courseId) throw badRequest('courseId is required for content quizzes');
    delete doc.classId;
  } else {
    if (!data.classId) throw badRequest('classId is required');
    const cls = await assertClassAccess(me, data.classId, 'teach');
    doc.schoolId = cls.schoolId;
  }
  const quiz = await Quiz.create(doc);
  audit(req, 'quiz.create', 'Quiz', quiz._id);
  res.status(201).json(quiz);
});

assessmentRouter.get('/quizzes/:id', async (req, res) => {
  const me = currentUser(req);
  const quiz = await Quiz.findById(idParam(req)).populate('courseId', 'title').populate('classId', 'name').lean();
  if (!quiz) throw notFound('Quiz');
  const plain = { ...quiz, courseId: (quiz.courseId as { _id?: unknown } | null)?._id ?? quiz.courseId, classId: (quiz.classId as { _id?: unknown } | null)?._id ?? quiz.classId };
  if (!(await canViewQuiz(me, plain))) throw forbidden();
  const editable = await canEditQuiz(me, plain);
  if (me.role === 'student') {
    const attempts = await QuizAttempt.find({ quizId: quiz._id, studentId: me.id, submittedAt: { $ne: null } }).sort({ submittedAt: -1 }).lean();
    return res.json({ ...hideAnswers(quiz), attempts, attemptsLeft: Math.max(0, (quiz.maxAttempts ?? 1) - attempts.length), editable: false });
  }
  res.json(editable || me.role === 'super_admin' ? { ...quiz, editable } : { ...hideAnswers(quiz), editable });
});

assessmentRouter.patch('/quizzes/:id', requireRole('super_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const quiz = await Quiz.findById(idParam(req)).lean();
  if (!quiz) throw notFound('Quiz');
  if (!(await canEditQuiz(me, quiz))) throw forbidden();
  const data = body(req, quizBody.partial().omit({ classId: true }));
  if (data.description !== undefined) data.description = cleanHtml(data.description);
  res.json(await Quiz.findByIdAndUpdate(quiz._id, data, { new: true }));
});

assessmentRouter.delete('/quizzes/:id', requireRole('super_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const quiz = await Quiz.findById(idParam(req)).lean();
  if (!quiz) throw notFound('Quiz');
  if (!(await canEditQuiz(me, quiz))) throw forbidden();
  await Promise.all([Quiz.deleteOne({ _id: quiz._id }), QuizAttempt.deleteMany({ quizId: quiz._id })]);
  res.json({ ok: true });
});

/** Students submit all answers at once; grading happens here, never on the client. */
assessmentRouter.post('/quizzes/:id/attempts', requireRole('student'), async (req, res) => {
  const me = currentUser(req);
  const quiz = await Quiz.findById(idParam(req)).lean();
  if (!quiz) throw notFound('Quiz');
  if (!(await canViewQuiz(me, quiz)) || quiz.status !== 'published') throw forbidden();
  if (quiz.dueDate && quiz.dueDate < new Date()) throw badRequest('This quiz is closed');
  const used = await QuizAttempt.countDocuments({ quizId: quiz._id, studentId: me.id, submittedAt: { $ne: null } });
  if (used >= (quiz.maxAttempts ?? 1)) throw badRequest('No attempts left');
  const { answers, startedAt } = body(
    req,
    z.object({
      answers: z.array(z.object({ questionId: objectId, selected: z.array(z.number().int().min(0)).max(8) })).max(200),
      startedAt: z.coerce.date().optional(),
    }),
  );
  let score = 0;
  let maxScore = 0;
  const review = quiz.questions.map((q) => {
    const pts = q.points ?? 1;
    maxScore += pts;
    const ans = answers.find((a) => a.questionId === String(q._id));
    const selected = [...new Set(ans?.selected ?? [])].sort();
    const correct = [...(q.correct ?? [])].sort();
    const isCorrect = selected.length === correct.length && selected.every((v, i) => v === correct[i]);
    if (isCorrect) score += pts;
    return { questionId: q._id, text: q.text, options: q.options, selected, correct, isCorrect, points: isCorrect ? pts : 0, explanation: q.explanation };
  });
  const percent = maxScore ? Math.round((score / maxScore) * 100) : 0;
  const attempt = await QuizAttempt.create({
    quizId: quiz._id,
    studentId: me.id,
    classId: me.classId,
    answers: answers.map((a) => ({ questionId: a.questionId, selected: a.selected })),
    score,
    maxScore,
    percent,
    startedAt: startedAt ?? new Date(),
    submittedAt: new Date(),
  });
  res.status(201).json({ attemptId: attempt._id, score, maxScore, percent, review, attemptsLeft: (quiz.maxAttempts ?? 1) - used - 1 });
});

assessmentRouter.get('/quizzes/:id/attempts', async (req, res) => {
  const me = currentUser(req);
  const quiz = await Quiz.findById(idParam(req)).lean();
  if (!quiz) throw notFound('Quiz');
  if (!(await canViewQuiz(me, quiz))) throw forbidden();
  const f = query(req, z.object({ classId: objectId.optional(), studentId: objectId.optional() }));
  const filter: Record<string, unknown> = { quizId: quiz._id, submittedAt: { $ne: null } };
  if (f.studentId && me.role !== 'student') {
    await assertStudentAccess(me, f.studentId);
    const attempts = await QuizAttempt.find({ ...filter, studentId: f.studentId }).sort({ submittedAt: -1 }).populate('studentId', 'name rollNo').populate('classId', 'name').lean();
    return res.json(attempts);
  }
  if (me.role === 'student') filter.studentId = me.id;
  else if (me.role === 'parent') filter.studentId = { $in: me.childIds };
  else if (me.role === 'teacher') {
    const ids = await teacherClassIds(me.id);
    if (f.classId && !ids.includes(f.classId)) throw forbidden();
    filter.classId = f.classId ?? { $in: ids };
  } else if (me.role !== 'super_admin') {
    const students = await User.find({ ...(await schoolFilter(me)), role: 'student' }).select('_id').lean();
    filter.studentId = { $in: students.map((s) => s._id) };
    if (f.classId) filter.classId = f.classId;
  } else if (f.classId) filter.classId = f.classId;
  const attempts = await QuizAttempt.find(filter).sort({ submittedAt: -1 }).populate('studentId', 'name rollNo').populate('classId', 'name').lean();
  res.json(attempts);
});

/* ------------------------------------------------ Assignments/projects */

const assignmentBody = z.object({
  classId: objectId,
  courseId: objectId.optional().nullable(),
  title: z.string().trim().min(1).max(200),
  instructions: z.string().max(100_000).optional(),
  kind: z.enum(['homework', 'project', 'activity']).optional(),
  attachmentUrl: z.string().trim().max(500).optional(),
  attachmentName: z.string().trim().max(200).optional(),
  dueDate: z.coerce.date().optional().nullable(),
  maxPoints: z.number().min(0).max(1000).optional(),
  status: z.enum(['draft', 'published', 'closed']).optional(),
});

async function classIdsFor(me: AuthUser): Promise<string[] | null> {
  if (me.role === 'teacher') return teacherClassIds(me.id);
  if (me.role === 'student') return me.classId ? [me.classId] : [];
  if (me.role === 'parent') return (await User.find({ _id: { $in: me.childIds } }).select('classId').lean()).map((k) => String(k.classId));
  return null; // admins: school filter instead
}

assessmentRouter.get('/assignments', async (req, res) => {
  const me = currentUser(req);
  const f = query(req, z.object({ classId: objectId.optional(), studentId: objectId.optional() }));
  const filter: Record<string, unknown> = {};
  const classIds = await classIdsFor(me);
  let child: Awaited<ReturnType<typeof assertStudentAccess>> | undefined;
  if (f.studentId && me.role !== 'student') child = await assertStudentAccess(me, f.studentId);
  if (child) {
    filter.classId = child.classId ?? null;
    if (me.role === 'parent') filter.status = { $ne: 'draft' };
  } else if (classIds) {
    if (f.classId && !classIds.includes(f.classId)) throw forbidden();
    filter.classId = f.classId ?? { $in: classIds };
    if (me.role !== 'teacher') filter.status = { $ne: 'draft' };
  } else {
    Object.assign(filter, await schoolFilter(me));
    if (f.classId) filter.classId = f.classId;
  }
  const items = await Assignment.find(filter).sort({ dueDate: 1, createdAt: -1 }).populate('classId', 'name').populate('courseId', 'title').populate('createdBy', 'name').lean();
  const ids = items.map((a) => a._id);
  // Student (or a parent looking at one child) sees their own submission state
  let studentId: string | undefined;
  if (me.role === 'student') studentId = me.id;
  else if (child) studentId = String(child._id);
  if (studentId) {
    const subs = await Submission.find({ assignmentId: { $in: ids }, studentId }).lean();
    return res.json(items.map((a) => ({ ...a, submission: subs.find((s) => String(s.assignmentId) === String(a._id)) ?? null })));
  }
  const counts = await Promise.all(ids.map((id) => Submission.countDocuments({ assignmentId: id })));
  const graded = await Promise.all(ids.map((id) => Submission.countDocuments({ assignmentId: id, status: 'graded' })));
  res.json(items.map((a, i) => ({ ...a, submissionCount: counts[i], gradedCount: graded[i] })));
});

assessmentRouter.post('/assignments', requireRole('teacher', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const data = body(req, assignmentBody);
  const cls = await assertClassAccess(me, data.classId, 'teach');
  if (data.courseId && !(await ClassCourse.exists({ classId: cls._id, courseId: data.courseId }))) throw badRequest('Course is not taught in this class');
  const a = await Assignment.create({ ...data, instructions: cleanHtml(data.instructions), schoolId: cls.schoolId, createdBy: me.id });
  audit(req, 'assignment.create', 'Assignment', a._id);
  res.status(201).json(a);
});

async function loadAssignment(me: AuthUser, id: string, mode: 'read' | 'teach') {
  const a = await Assignment.findById(id).lean();
  if (!a) throw notFound('Assignment');
  await assertClassAccess(me, String(a.classId), mode);
  if (mode === 'read' && (me.role === 'student' || me.role === 'parent') && a.status === 'draft') throw notFound('Assignment');
  return a;
}

assessmentRouter.get('/assignments/:id', async (req, res) => {
  const me = currentUser(req);
  const a = await loadAssignment(me, idParam(req), 'read');
  const full = await Assignment.findById(a._id).populate('classId', 'name').populate('courseId', 'title').populate('createdBy', 'name').lean();
  if (me.role === 'student') {
    return res.json({ ...full, submission: await Submission.findOne({ assignmentId: a._id, studentId: me.id }).lean() });
  }
  if (me.role === 'parent') {
    return res.json({ ...full, submissions: await Submission.find({ assignmentId: a._id, studentId: { $in: me.childIds } }).lean() });
  }
  const [students, subs] = await Promise.all([
    User.find({ classId: a.classId, role: 'student' }).select('name rollNo').sort({ rollNo: 1, name: 1 }).lean(),
    Submission.find({ assignmentId: a._id }).lean(),
  ]);
  res.json({ ...full, roster: students.map((s) => ({ student: s, submission: subs.find((x) => String(x.studentId) === String(s._id)) ?? null })) });
});

assessmentRouter.patch('/assignments/:id', requireRole('teacher', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const a = await loadAssignment(me, idParam(req), 'teach');
  const data = body(req, assignmentBody.omit({ classId: true }).partial());
  if (data.instructions !== undefined) data.instructions = cleanHtml(data.instructions);
  res.json(await Assignment.findByIdAndUpdate(a._id, data, { new: true }));
});

assessmentRouter.delete('/assignments/:id', requireRole('teacher', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const a = await loadAssignment(me, idParam(req), 'teach');
  await Promise.all([Assignment.deleteOne({ _id: a._id }), Submission.deleteMany({ assignmentId: a._id })]);
  res.json({ ok: true });
});

assessmentRouter.post('/assignments/:id/submit', requireRole('student'), async (req, res) => {
  const me = currentUser(req);
  const a = await loadAssignment(me, idParam(req), 'read');
  if (a.status !== 'published') throw badRequest('This assignment is not accepting submissions');
  const data = body(
    req,
    z
      .object({
        text: z.string().max(20_000).optional(),
        fileUrl: z.string().trim().max(500).optional(),
        fileName: z.string().trim().max(200).optional(),
        linkUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
      })
      .refine((d) => d.text || d.fileUrl || d.linkUrl, { message: 'Add text, a file or a link' }),
  );
  const existing = await Submission.findOne({ assignmentId: a._id, studentId: me.id });
  if (existing?.status === 'graded') throw badRequest('Already graded; ask your teacher to return it for changes');
  const sub = await Submission.findOneAndUpdate(
    { assignmentId: a._id, studentId: me.id },
    { ...data, submittedAt: new Date(), status: 'submitted', late: !!(a.dueDate && a.dueDate < new Date()) },
    { upsert: true, new: true },
  );
  res.status(201).json(sub);
});

assessmentRouter.post('/submissions/:id/grade', requireRole('teacher', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const sub = await Submission.findById(idParam(req));
  if (!sub) throw notFound('Submission');
  const a = await loadAssignment(me, String(sub.assignmentId), 'teach');
  const data = body(req, z.object({ points: z.number().min(0), feedback: z.string().max(5000).optional(), status: z.enum(['graded', 'returned']).default('graded') }));
  if (data.points > (a.maxPoints ?? 10)) throw badRequest(`Points cannot exceed ${a.maxPoints}`);
  Object.assign(sub, data, { gradedBy: me.id, gradedAt: new Date() });
  await sub.save();
  res.json(sub);
});
