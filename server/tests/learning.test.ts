import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiUsage, School } from '../src/models/index.js';
import { as, closeDb, resetDb, tokens, type Seeded } from './helpers.js';

let data: Seeded;
let t: Awaited<ReturnType<typeof tokens>>;
beforeAll(async () => {
  data = await resetDb();
  t = await tokens();
});
afterAll(closeDb);

const cls = (i: number) => String(data.classes[i]._id);

describe('content authoring', () => {
  it('sanitises rich text so scripts never reach students', async () => {
    const admin = as(t.admin);
    const course = await admin.post('/api/courses', { title: 'XSS test', description: '<p>ok</p><script>alert(1)</script>' });
    expect(course.body.description).toBe('<p>ok</p>');
    const ch = await admin.post(`/api/courses/${course.body._id}/chapters`, { title: 'Ch' });
    const unit = await admin.post(`/api/chapters/${ch.body._id}/units`, {
      title: 'U',
      body: '<p onclick="steal()">Hi</p><img src="x" onerror="bad()"><iframe src="https://evil.example/x"></iframe><iframe src="https://www.youtube.com/embed/abc"></iframe><a href="javascript:alert(1)">x</a>',
    });
    const body = unit.body.body as string;
    expect(body).not.toMatch(/onclick|onerror|javascript:|evil\.example/);
    expect(body).toContain('youtube.com/embed/abc');
  });

  it('orders chapters and units and gives prev/next', async () => {
    const admin = as(t.admin);
    const course = await admin.post('/api/courses', { title: 'Order test', status: 'published' });
    const a = await admin.post(`/api/courses/${course.body._id}/chapters`, { title: 'A' });
    const b = await admin.post(`/api/courses/${course.body._id}/chapters`, { title: 'B' });
    const u1 = await admin.post(`/api/chapters/${a.body._id}/units`, { title: 'A1' });
    const u2 = await admin.post(`/api/chapters/${b.body._id}/units`, { title: 'B1' });
    await admin.post(`/api/courses/${course.body._id}/chapters/reorder`, { ids: [b.body._id, a.body._id] });
    const detail = await admin.get(`/api/courses/${course.body._id}`);
    expect(detail.body.chapters.map((c: { title: string }) => c.title)).toEqual(['B', 'A']);
    const unit = await admin.get(`/api/units/${u2.body._id}`);
    expect(unit.body.prev).toBeNull();
    expect(unit.body.next._id).toBe(u1.body._id);
  });
});

describe('student learning', () => {
  it('tracks unit completion and course progress', async () => {
    const course = data.courses[0];
    const before = await as(t.student).get(`/api/courses/${course.course._id}`);
    const todo = before.body.chapters.flatMap((c: { units: { _id: string; completed: boolean }[] }) => c.units).find((u: { completed: boolean }) => !u.completed);
    expect((await as(t.student).post(`/api/units/${todo._id}/complete`)).status).toBe(200);
    expect((await as(t.student).post(`/api/units/${todo._id}/complete`)).status).toBe(200); // idempotent
    const after = await as(t.student).get(`/api/courses/${course.course._id}`);
    expect(after.body.completedUnits).toBe(before.body.completedUnits + 1);
    // Parents see the same number for their child
    const parentView = await as(t.parent).get(`/api/courses/${course.course._id}?studentId=${data.students[0]._id}`);
    expect(parentView.body.completedUnits).toBe(after.body.completedUnits);
    // Teachers cannot mark units for students
    expect((await as(t.teacher).post(`/api/units/${todo._id}/complete`)).status).toBe(403);
  });

  it('hides quiz answers from students and grades on the server', async () => {
    const quiz = data.courses[1].quiz; // Scratch: 3 questions, 2 attempts
    const view = await as(t.student).get(`/api/quizzes/${quiz._id}`);
    expect(view.status).toBe(200);
    for (const q of view.body.questions) {
      expect(q.correct).toBeUndefined();
      expect(q.explanation).toBeUndefined();
    }
    const full = quiz.questions;
    const answers = full.map((q, i) => ({ questionId: String(q._id), selected: i === 0 ? q.correct : [9] }));
    const r = await as(t.student).post(`/api/quizzes/${quiz._id}/attempts`, { answers });
    expect(r.status).toBe(201);
    expect(r.body.score).toBe(1);
    expect(r.body.maxScore).toBe(3);
    expect(r.body.review[0].isCorrect).toBe(true);
    expect(r.body.review[2].correct).toEqual([0, 1, 3]);
    // Seeded attempt + this one = 2 = maxAttempts
    const again = await as(t.student).post(`/api/quizzes/${quiz._id}/attempts`, { answers });
    expect(again.status).toBe(400);
  });

  it('runs the assignment loop: post, submit, grade, parent sees it', async () => {
    const created = await as(t.teacher).post('/api/assignments', { classId: cls(0), title: 'Build a buzzer', maxPoints: 10, dueDate: new Date(Date.now() + 86400_000).toISOString(), instructions: '<p>Go</p><script>x</script>' });
    expect(created.status).toBe(201);
    expect(created.body.instructions).toBe('<p>Go</p>');
    // Another teacher who does not teach 6-A cannot post there
    expect((await as(t.teacher3).post('/api/assignments', { classId: cls(0), title: 'Nope' })).status).toBe(403);
    // Students from another class cannot submit
    const sub = await as(t.student).post(`/api/assignments/${created.body._id}/submit`, { text: 'Done! It beeps.' });
    expect(sub.status).toBe(201);
    expect(sub.body.late).toBe(false);
    const detail = await as(t.teacher).get(`/api/assignments/${created.body._id}`);
    const row = detail.body.roster.find((r: { student: { _id: string } }) => r.student._id === String(data.students[0]._id));
    expect(row.submission.text).toBe('Done! It beeps.');
    expect((await as(t.teacher).post(`/api/submissions/${row.submission._id}/grade`, { points: 11 })).status).toBe(400);
    expect((await as(t.teacher).post(`/api/submissions/${row.submission._id}/grade`, { points: 8, feedback: 'Nice wiring' })).status).toBe(200);
    const parentList = await as(t.parent).get(`/api/assignments?studentId=${data.students[0]._id}`);
    const seen = parentList.body.find((a: { _id: string }) => a._id === created.body._id);
    expect(seen.submission.points).toBe(8);
    expect(seen.submission.feedback).toBe('Nice wiring');
    // Graded work cannot be silently changed
    expect((await as(t.student).post(`/api/assignments/${created.body._id}/submit`, { text: 'edit' })).status).toBe(400);
  });

  it('takes attendance and reports it to parents', async () => {
    const detail = await as(t.teacher).get(`/api/classes/${cls(0)}`);
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const records = detail.body.students.map((s: { _id: string }, i: number) => ({ studentId: s._id, status: i === 0 ? 'absent' : 'present' }));
    expect((await as(t.teacher).put('/api/attendance', { classId: cls(0), date, records })).status).toBe(200);
    // A student from another class cannot be marked here
    expect((await as(t.teacher).put('/api/attendance', { classId: cls(0), date, records: [{ studentId: String(data.students[9]._id), status: 'present' }] })).status).toBe(400);
    const future = new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10);
    expect((await as(t.teacher).put('/api/attendance', { classId: cls(0), date: future, records })).status).toBe(400);
    const kid = await as(t.parent).get(`/api/attendance?studentId=${data.students[0]._id}`);
    expect(kid.body.days[0]).toEqual({ date, status: 'absent' });
  });

  it('hides private remarks from parents and students but not from staff', async () => {
    await as(t.teacher).post('/api/remarks', { studentId: String(data.students[0]._id), text: 'Private note for staff', visibleToParent: false });
    const parent = await as(t.parent).get(`/api/remarks?studentId=${data.students[0]._id}`);
    expect(parent.body.some((r: { text: string }) => r.text === 'Private note for staff')).toBe(false);
    const student = await as(t.student).get('/api/remarks');
    expect(student.body.some((r: { text: string }) => r.text === 'Private note for staff')).toBe(false);
    const staff = await as(t.school).get(`/api/reports/students/${data.students[0]._id}`);
    expect(staff.body.remarks.some((r: { text: string }) => r.text === 'Private note for staff')).toBe(true);
  });
});

describe('NanoBot', () => {
  it('keeps chats private and meters usage against the school allowance', async () => {
    const chat = await as(t.student).post('/api/ai/chats', { unitId: String(data.courses[0].unitIds[0]) });
    expect(chat.status).toBe(201);
    const reply = await as(t.student).post(`/api/ai/chats/${chat.body._id}/messages`, { content: 'What is a sensor?' });
    expect(reply.status).toBe(200);
    expect(reply.body.message.role).toBe('assistant');
    expect((await as(t.teacher).get(`/api/ai/chats/${chat.body._id}`)).status).toBe(403);
    const usage = await AiUsage.findOne({ userId: data.students[0]._id }).lean();
    expect(usage!.tokens).toBeGreaterThan(0);
    // Over the allowance, the tutor stops
    await School.updateOne({ _id: data.school._id }, { aiMonthlyTokens: 1 });
    expect((await as(t.student).post(`/api/ai/chats/${chat.body._id}/messages`, { content: 'More?' })).status).toBe(400);
  });

  it('cannot open a chat about a course the student does not take', async () => {
    const ai = data.courses[2]; // Intro to AI: only 7-A
    expect((await as(t.student).post('/api/ai/chats', { courseId: String(ai.course._id) })).status).toBe(403);
  });
});
