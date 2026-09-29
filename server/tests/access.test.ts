import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ClassSection, School, User } from '../src/models/index.js';
import { as, closeDb, resetDb, tokens, type Seeded } from './helpers.js';

let data: Seeded;
let t: Awaited<ReturnType<typeof tokens>>;
let otherPartnerToken: string;
let otherSchoolId: string;

beforeAll(async () => {
  data = await resetDb();
  t = await tokens();
  // A second partner with its own school, to prove partners are isolated from each other
  const admin = as(t.admin);
  const p = await admin.post('/api/partners', { name: 'Other Partner', admin: { name: 'Other P', email: 'other.partner@example.in' } });
  const s = await admin.post('/api/schools', { name: 'Faraway School', partnerId: p.body.partner._id });
  otherSchoolId = s.body.school._id;
  const pw = await admin.post(`/api/users`, { role: 'partner', name: 'Other P2', username: 'other.p2', partnerId: p.body.partner._id, password: 'Partner2026' });
  expect(pw.status).toBe(201);
  const { login } = await import('./helpers.js');
  otherPartnerToken = await login('other.p2', 'Partner2026');
});
afterAll(closeDb);

const sid = () => String(data.school._id);
const s2 = () => String(data.school2._id);
const cls = (i: number) => String(data.classes[i]._id);
const stu = (i: number) => String(data.students[i]._id);

describe('role permissions', () => {
  it('only super admins author courses', async () => {
    for (const k of ['partner', 'school', 'teacher', 'student', 'parent'] as const) {
      expect((await as(t[k]).post('/api/courses', { title: 'Hack course' })).status, k).toBe(403);
    }
    expect((await as(t.admin).post('/api/courses', { title: 'Real course' })).status).toBe(201);
  });

  it('students and parents cannot list users or classes', async () => {
    for (const k of ['student', 'parent'] as const) {
      expect((await as(t[k]).get('/api/users')).status, k).toBe(403);
      expect((await as(t[k]).get('/api/classes')).status, k).toBe(403);
    }
  });

  it('school admins cannot create super admins or partners', async () => {
    expect((await as(t.school).post('/api/users', { role: 'super_admin', name: 'x', email: 'x1@x.in' })).status).toBe(403);
    expect((await as(t.school).post('/api/users', { role: 'partner', name: 'x', email: 'x2@x.in' })).status).toBe(400);
  });

  it('teachers cannot manage people', async () => {
    expect((await as(t.teacher).post('/api/users', { role: 'student', name: 'x', username: 'xx.yy' })).status).toBe(403);
    expect((await as(t.teacher).post(`/api/users/${stu(0)}/status`, { status: 'suspended' })).status).toBe(403);
  });
});

describe('tenant isolation', () => {
  it('a school admin sees only their own school', async () => {
    const r = await as(t.school2).get('/api/users?role=student&limit=200');
    expect(r.status).toBe(200);
    expect(r.body.items.every((u: { schoolId: { _id: string } }) => u.schoolId._id === s2())).toBe(true);
    expect((await as(t.school2).get(`/api/schools/${sid()}`)).status).toBe(403);
    expect((await as(t.school2).get(`/api/classes/${cls(0)}`)).status).toBe(403);
    expect((await as(t.school2).get(`/api/reports/students/${stu(0)}`)).status).toBe(403);
    expect((await as(t.school2).patch(`/api/users/${stu(0)}`, { name: 'Hacked' })).status).toBe(403);
    // Asking for another school's id still returns only your own school
    const sneaky = await as(t.school2).get(`/api/users?schoolId=${sid()}`);
    expect(sneaky.body.items.every((u: { schoolId: { _id: string } }) => u.schoolId._id === s2())).toBe(true);
  });

  it('a school admin cannot put a student into another school’s class', async () => {
    const r = await as(t.school2).post('/api/users', { role: 'student', name: 'Sneaky', username: 'sneaky.one', classId: cls(0) });
    expect(r.status).toBe(400);
  });

  it('partners see only their own schools', async () => {
    const mine = await as(t.partner).get('/api/schools');
    expect(mine.body.items.map((s: { _id: string }) => s._id).sort()).toEqual([sid(), s2()].sort());
    const other = await as(otherPartnerToken).get('/api/schools');
    expect(other.body.items.map((s: { _id: string }) => s._id)).toEqual([otherSchoolId]);
    expect((await as(otherPartnerToken).get(`/api/schools/${sid()}`)).status).toBe(403);
    expect((await as(otherPartnerToken).get(`/api/users?schoolId=${sid()}`)).status).toBe(403);
    expect((await as(t.partner).get(`/api/schools/${otherSchoolId}`)).status).toBe(403);
  });

  it('teachers reach only classes they teach', async () => {
    // Farhan teaches only 7-A (AI); Sneha teaches 6-A and 6-B (Scratch)
    expect((await as(t.teacher3).get(`/api/classes/${cls(2)}`)).status).toBe(200);
    expect((await as(t.teacher3).get(`/api/classes/${cls(0)}`)).status).toBe(403);
    const date = new Date().toISOString().slice(0, 10);
    expect((await as(t.teacher3).put('/api/attendance', { classId: cls(0), date, records: [] })).status).toBe(403);
    expect((await as(t.teacher3).get(`/api/reports/students/${stu(0)}`)).status).toBe(403);
    const list = await as(t.teacher3).get('/api/users?role=student&limit=200');
    expect(list.body.items.every((u: { classId: { _id: string } }) => u.classId._id === cls(2))).toBe(true);
  });

  it('parents see only their own children', async () => {
    // Parent has Aarav (6-A, students[0]) and Saanvi (6-B, students[9])
    expect((await as(t.parent).get(`/api/reports/students/${stu(0)}`)).status).toBe(200);
    expect((await as(t.parent).get(`/api/reports/students/${stu(9)}`)).status).toBe(200);
    expect((await as(t.parent).get(`/api/reports/students/${stu(1)}`)).status).toBe(403);
    expect((await as(t.parent).get(`/api/attendance?studentId=${stu(1)}`)).status).toBe(403);
    expect((await as(t.parent).get(`/api/remarks?studentId=${stu(1)}`)).status).toBe(403);
    const assignments = await as(t.parent).get(`/api/assignments?studentId=${stu(9)}`);
    expect(assignments.body.every((a: { classId: { _id: string } }) => a.classId._id === cls(1))).toBe(true);
  });

  it('students see only themselves', async () => {
    expect((await as(t.student).get(`/api/reports/students/${stu(0)}`)).status).toBe(200);
    expect((await as(t.student).get(`/api/reports/students/${stu(1)}`)).status).toBe(403);
    expect((await as(t.student).get(`/api/classes/${cls(1)}`)).status).toBe(403);
  });

  it('courses are visible only once granted to the school and assigned to the class', async () => {
    const draft = await as(t.admin).post('/api/courses', { title: 'Secret course', status: 'published' });
    const id = draft.body._id;
    expect((await as(t.school).get(`/api/courses/${id}`)).status).toBe(403);
    expect((await as(t.student).get(`/api/courses/${id}`)).status).toBe(403);
    // A partner cannot pass on a course it does not hold
    expect((await as(t.partner).post('/api/course-grants', { courseId: id, schoolId: sid() })).status).toBe(403);
    await as(t.admin).post('/api/course-grants', { courseId: id, partnerId: String(data.partner._id) });
    // Held by the partner is not enough: the school still needs its own grant
    expect((await as(t.school).post('/api/class-courses', { classId: cls(0), courseId: id })).status).toBe(400);
    expect((await as(t.partner).post('/api/course-grants', { courseId: id, schoolId: sid() })).status).toBe(201);
    expect((await as(t.school).get(`/api/courses/${id}`)).status).toBe(200);
    expect((await as(t.student).get(`/api/courses/${id}`)).status).toBe(403);
    expect((await as(t.school).post('/api/class-courses', { classId: cls(0), courseId: id, teacherId: String(data.teachers[0]._id) })).status).toBe(201);
    expect((await as(t.student).get(`/api/courses/${id}`)).status).toBe(200);
    // School 2 never got it
    expect((await as(t.school2).get(`/api/courses/${id}`)).status).toBe(403);
  });

  it('draft courses are hidden from everyone but authors', async () => {
    const list = await as(t.school).get('/api/courses?limit=100');
    expect(list.body.items.every((c: { status: string }) => c.status === 'published')).toBe(true);
  });

  it('announcements respect scope and audience', async () => {
    const staffOnly = await as(t.student).get('/api/announcements');
    expect(staffOnly.body.some((a: { title: string }) => a.title.startsWith('Staff meeting'))).toBe(false);
    const teacherFeed = await as(t.teacher).get('/api/announcements');
    expect(teacherFeed.body.some((a: { title: string }) => a.title.startsWith('Staff meeting'))).toBe(true);
    const otherSchool = await as(t.school2).get('/api/announcements');
    expect(otherSchool.body.some((a: { title: string }) => a.title.includes('Robotics Fair'))).toBe(false);
    // Teachers post only to their classes
    expect((await as(t.teacher).post('/api/announcements', { scope: 'school', title: 'x' })).status).toBe(403);
    expect((await as(t.teacher3).post('/api/announcements', { scope: 'class', classId: cls(0), title: 'x' })).status).toBe(403);
    expect((await as(t.teacher).post('/api/announcements', { scope: 'class', classId: cls(0), title: 'Bring kits' })).status).toBe(201);
  });
});

describe('data validation', () => {
  it('rejects malformed ids and bodies cleanly', async () => {
    expect((await as(t.admin).get('/api/courses/not-an-id')).status).toBe(400);
    expect((await as(t.school).post('/api/classes', { grade: 99, section: 'A' })).status).toBe(400);
    const r = await as(t.school).post('/api/users', { role: 'student', name: '' });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('bad_request');
  });

  it('blocks NoSQL operator injection in login', async () => {
    const { default: request } = await import('supertest');
    const { app } = await import('./helpers.js');
    const r = await request(app).post('/api/auth/login').send({ identifier: { $ne: null }, password: { $ne: null } });
    expect(r.status).toBe(400);
  });

  it('keeps sibling data consistent on class delete', async () => {
    expect((await as(t.school).delete(`/api/classes/${cls(0)}`)).status).toBe(400); // has students
    const c = await as(t.school).post('/api/classes', { grade: 9, section: 'Z' });
    expect((await as(t.school).delete(`/api/classes/${c.body._id}`)).status).toBe(200);
    expect(await ClassSection.exists({ _id: c.body._id })).toBeNull();
  });

  it('school admins cannot change their own plan or AI allowance', async () => {
    await as(t.school).patch(`/api/schools/${sid()}`, { plan: 'basic', aiMonthlyTokens: 999999999, name: 'Green Valley Public School' });
    const s = await School.findById(sid()).lean();
    expect(s!.plan).toBe('premium');
    expect(s!.aiMonthlyTokens).toBe(500000);
  });

  it('bulk import creates students and parents and reports bad rows', async () => {
    const r = await as(t.school).post('/api/users/import', {
      rows: [
        { name: 'Import One', grade: 6, section: 'a', rollNo: '31', parentName: 'Mom One', parentEmail: 'mom.one@example.in' },
        { name: 'Import Two', grade: 6, section: 'B', rollNo: '32', email: 'import.two@example.in' },
        { name: 'Bad Row', grade: 11, section: 'Q' },
      ],
    });
    expect(r.status).toBe(200);
    expect(r.body.created).toBe(2);
    expect(r.body.failed).toBe(1);
    expect(r.body.results[0].tempPassword).toBeTruthy();
    expect(r.body.results[1].tempPassword).toBeUndefined(); // has email: invite link instead
    const mom = await User.findOne({ email: 'mom.one@example.in' }).lean();
    expect(mom!.role).toBe('parent');
    expect(mom!.childIds.length).toBe(1);
  });
});
