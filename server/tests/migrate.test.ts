import bcrypt from 'bcryptjs';
import mongoose, { Types } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrateLegacy } from '../src/scripts/migrate-legacy.js';
import { ClassCourse, ClassSection, Course, CourseGrant, Unit, User } from '../src/models/index.js';
import { app, closeDb, resetDb } from './helpers.js';

const oid = () => new Types.ObjectId();
let legacy: mongoose.Connection;

beforeAll(async () => {
  await resetDb();
  await mongoose.connection.db!.dropDatabase(); // start v2 empty
  legacy = await mongoose.createConnection(process.env.MONGO_URI!.replace(/\/[^/]+$/, '/nanoskool_legacy_test')).asPromise();
  await legacy.db!.dropDatabase();
  const hash = await bcrypt.hash('OldPass123', 10);
  const partner = oid(), school = oid(), g6 = oid(), divA = oid(), teacherP = oid(), studentP = oid(), parentP = oid(), course = oid(), chapter = oid(), unit = oid();
  const db = legacy.db!;
  await db.collection('partners').insertOne({ _id: partner, partner_name: 'Old Partner', partner_id: 'OP1', email: 'op@x.in', status: 1 });
  await db.collection('schools').insertOne({ _id: school, school_name: 'Old School', school_code: 'OLD', partner_id: partner, status: 1 });
  await db.collection('grades').insertOne({ _id: g6, gradename: 'Grade 6' });
  await db.collection('grade_divisions').insertOne({ _id: divA, school_id: school, grade_id: g6, division: 'a', teacher_id: teacherP, status: 1 });
  await db.collection('teachers').insertOne({ _id: teacherP, school_id: school, name: 'Old Teacher', subject_specialization: 'Robotics, AI' });
  await db.collection('students').insertOne({ _id: studentP, school_id: school, grade_id: g6, grade_division: 'A', roll_no: '7', name: 'Old Student', gender: 'Female' });
  await db.collection('parents').insertOne({ _id: parentP, student_id: studentP, parents_name: 'Old Parent', relation_to_student: 'Mother' });
  await db.collection('logins').insertMany([
    { _id: oid(), role_id: 4, reg_id: school, name: 'Old School Admin', email: 'oldschool@x.in', password: hash, real_password: 'OldPass123' },
    { _id: oid(), role_id: 5, reg_id: teacherP, name: 'Old Teacher', email: 'oldteacher@x.in', password: hash, real_password: 'OldPass123' },
    { _id: oid(), role_id: 6, reg_id: studentP, name: 'Old Student', username: 'old.student', password: hash, real_password: 'OldPass123' },
    { _id: oid(), role_id: 7, reg_id: parentP, name: 'Old Parent', email: 'oldparent@x.in', password: hash },
    { _id: oid(), role_id: 6, reg_id: oid(), name: 'Plain', email: 'plain@x.in', password: 'not-a-hash' },
  ]);
  await db.collection('courses').insertOne({ _id: course, courses_name: 'Old Robotics', course_details: 'Robots', grade_id: g6, status: 1 });
  await db.collection('chapters').insertOne({ _id: chapter, course_id: course, chapter_name: 'Intro', position: 0 });
  await db.collection('units').insertOne({ _id: unit, course_id: course, chapter_id: chapter, unit_name: 'Motors', unit_summary: 'Spin', position: 0 });
  await db.collection('unitsuploads').insertOne({ units_id: unit, units_content: ['https://cdn.x/motor.pdf', 'https://cdn.x/kit.png'] });
  await db.collection('assigncoursestoschools').insertOne({ course_id: course, school_id: school });
  await db.collection('assign_courses').insertOne({ teacher_id: teacherP, grade_division_id: divA, course_id: course });
});
afterAll(async () => {
  await legacy.db!.dropDatabase();
  await legacy.close();
  await closeDb();
});

describe('legacy migration', () => {
  it('dry run writes nothing', async () => {
    const r = await migrateLegacy(legacy.db!, { commit: false });
    expect(r.counts['users.student']).toBe(1);
    expect(await User.countDocuments()).toBe(0);
  });

  it('moves organisations, people, classes, content and access', async () => {
    const r = await migrateLegacy(legacy.db!, { commit: true });
    expect(r.skipped.some((x) => x.reason.includes('bcrypt'))).toBe(true);
    const student = await User.findOne({ username: 'old.student' }).lean();
    expect(student!.role).toBe('student');
    expect(student!.mustChangePassword).toBe(true);
    expect(JSON.stringify(student)).not.toContain('OldPass123');
    const cls = await ClassSection.findById(student!.classId).lean();
    expect(cls!.name).toBe('Grade 6 - A');
    const teacher = await User.findOne({ email: 'oldteacher@x.in' }).lean();
    expect(teacher!.subjects).toEqual(['Robotics', 'AI']);
    expect(String(cls!.classTeacherId)).toBe(String(teacher!._id));
    const parent = await User.findOne({ email: 'oldparent@x.in' }).lean();
    expect(parent!.childIds.map(String)).toEqual([String(student!._id)]);
    const unit = await Unit.findOne({ title: 'Motors' }).lean();
    expect(unit!.fileUrl).toBe('https://cdn.x/motor.pdf');
    expect(unit!.body).toContain('kit.png');
    expect(await Course.countDocuments({ title: 'Old Robotics', status: 'published' })).toBe(1);
    expect(await CourseGrant.countDocuments({ schoolId: student!.schoolId })).toBe(1);
    expect(await ClassCourse.countDocuments({ classId: cls!._id, teacherId: teacher!._id })).toBe(1);
  });

  it('is safe to re-run', async () => {
    await migrateLegacy(legacy.db!, { commit: true });
    expect(await User.countDocuments({ username: 'old.student' })).toBe(1);
  });

  it('migrated users sign in with their old password and must change it', async () => {
    const r = await request(app).post('/api/auth/login').send({ identifier: 'old.student', password: 'OldPass123' });
    expect(r.status).toBe(200);
    expect(r.body.user.mustChangePassword).toBe(true);
    const courses = await request(app).get('/api/courses').set('Authorization', `Bearer ${r.body.accessToken}`);
    expect(courses.body.items.map((c: { title: string }) => c.title)).toEqual(['Old Robotics']);
  });
});
