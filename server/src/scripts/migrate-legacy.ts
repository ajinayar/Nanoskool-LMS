/**
 * One-off migration from the old Nanoskool database (v1: Nanoskool-MS / SU-MS / Mobile-MS)
 * into the v2 schema.
 *
 *   LEGACY_MONGO_URI=mongodb://.../prodnanoskooldb MONGO_URI=mongodb://.../nanoskool_v2 \
 *     npm run migrate:legacy              # dry run: reads everything, writes nothing, prints a report
 *   ... npm run migrate:legacy -- --commit   # writes (upserts by the old _id, so it can be re-run)
 *
 * What moves: partners, schools, grades + divisions (as classes), every login with its profile
 * (super admins, partners, school admins, teachers, students, parents), courses, chapters, units
 * (with their uploaded content), course grants to partners and schools, and teacher/class/course
 * assignments.
 *
 * Security: bcrypt password hashes are carried over so people can still sign in, but every
 * migrated account must choose a new password at first sign-in because v1 also kept plaintext
 * copies. The `real_password` field is never read or copied.
 */
import mongoose, { Types } from 'mongoose';
import { connectDb } from '../db.js';
import { ClassCourse, ClassSection, Chapter, Course, CourseGrant, Partner, School, Unit, User, type Role } from '../models/index.js';

/** v1 numeric role ids (from RolePermission.json and the controllers). Adjust if your data differs. */
export const LEGACY_ROLES: Record<number, Role> = {
  1: 'super_admin',
  2: 'super_admin', // company staff
  3: 'partner',
  4: 'school_admin',
  5: 'teacher',
  6: 'student',
  7: 'parent',
  8: 'teacher', // resource person
};

type Doc = Record<string, unknown> & { _id: Types.ObjectId };
const s = (v: unknown) => (v == null ? undefined : String(v).trim() || undefined);
const id = (v: unknown) => (v && Types.ObjectId.isValid(String(v)) ? new Types.ObjectId(String(v)) : undefined);
const isBcrypt = (h: unknown) => typeof h === 'string' && /^\$2[aby]\$\d{2}\$/.test(h);
const alive = (d: Doc) => d.isDeleted !== true;
const gradeNumber = (name: unknown) => {
  const m = String(name ?? '').match(/\d{1,2}/);
  const n = m ? Number(m[0]) : NaN;
  return n >= 1 && n <= 12 ? n : undefined;
};

export interface MigrationReport {
  counts: Record<string, number>;
  skipped: { entity: string; id: string; reason: string }[];
}

export async function migrateLegacy(legacy: mongoose.mongo.Db, opts: { commit: boolean }): Promise<MigrationReport> {
  const report: MigrationReport = { counts: {}, skipped: [] };
  const count = (k: string) => (report.counts[k] = (report.counts[k] ?? 0) + 1);
  const skip = (entity: string, d: { _id: unknown }, reason: string) => report.skipped.push({ entity, id: String(d._id), reason });
  const col = async (name: string) => (await legacy.listCollections({ name }).hasNext() ? ((await legacy.collection(name).find({}).toArray()) as Doc[]) : []);
  const upsert = async (model: mongoose.Model<any>, _id: Types.ObjectId, doc: Record<string, unknown>) => {
    if (opts.commit) await model.updateOne({ _id }, { $set: doc }, { upsert: true, strict: false });
  };

  const [partners, schools, grades, divisions, logins, students, teachers, parents, courses, chapters, units, uploads, toPartner, toSchool, toTeacher] = await Promise.all(
    ['partners', 'schools', 'grades', 'grade_divisions', 'logins', 'students', 'teachers', 'parents', 'courses', 'chapters', 'units', 'unitsuploads', 'assigncoursestopartners', 'assigncoursestoschools', 'assign_courses'].map(col),
  );

  /* Organisations */
  for (const p of partners.filter(alive)) {
    const name = s(p.partner_name);
    if (!name) {
      skip('partner', p, 'no name');
      continue;
    }
    await upsert(Partner, p._id, {
      name,
      code: s(p.partner_id),
      contactName: s(p.contact_person),
      contactEmail: s(p.email)?.toLowerCase(),
      contactPhone: s(p.mobile),
      status: Number(p.status ?? 1) === 1 ? 'active' : 'inactive',
    });
    count('partners');
  }
  for (const sc of schools.filter(alive)) {
    const name = s(sc.school_name);
    if (!name) {
      skip('school', sc, 'no name');
      continue;
    }
    await upsert(School, sc._id, {
      name,
      code: s(sc.school_code) ?? s(sc.School_id),
      partnerId: id(sc.partner_id),
      address: s(sc.school_address),
      pinCode: s(sc.school_pin_code),
      website: s(sc.school_website),
      email: s(sc.school_email)?.toLowerCase(),
      principalName: s(sc.principal_name),
      phone: s(sc.principal_contact_no) ?? s(sc.admin_contact_no),
      logoUrl: s(sc.school_logo),
      status: Number(sc.status ?? 1) === 1 ? 'active' : 'inactive',
    });
    count('schools');
  }

  /* Classes = grade + division within a school */
  const gradeNum = new Map(grades.map((g) => [String(g._id), gradeNumber(g.gradename)]));
  const classKey = (schoolId: unknown, gradeId: unknown, division: unknown) => `${schoolId}|${gradeNum.get(String(gradeId))}|${String(division ?? '').trim().toUpperCase()}`;
  const classByKey = new Map<string, Types.ObjectId>();
  const classByDivisionId = new Map<string, Types.ObjectId>();
  for (const d of divisions.filter(alive)) {
    const grade = gradeNum.get(String(d.grade_id));
    const section = s(d.division)?.toUpperCase();
    if (!grade || !section || !d.school_id) {
      skip('class', d, 'missing school, grade or division');
      continue;
    }
    const key = classKey(d.school_id, d.grade_id, section);
    if (classByKey.has(key)) {
      classByDivisionId.set(String(d._id), classByKey.get(key)!);
      continue;
    }
    await upsert(ClassSection, d._id, { schoolId: id(d.school_id), grade, section, name: `Grade ${grade} - ${section}`, classTeacherId: id(d.teacher_id) });
    classByKey.set(key, d._id);
    classByDivisionId.set(String(d._id), d._id);
    count('classes');
  }

  /* People: one v2 user per v1 login, enriched from the matching profile record */
  const profileOf = new Map<string, Doc>();
  for (const x of [...students, ...teachers, ...parents, ...partners, ...schools]) profileOf.set(String(x._id), x);
  const userIdForProfile = new Map<string, Types.ObjectId>(); // v1 profile _id -> v2 user _id
  const seenEmail = new Set<string>();
  const seenUsername = new Set<string>();
  const parentLinks: { userId: Types.ObjectId; studentProfileId: string }[] = [];
  const pendingStudents: { userId: Types.ObjectId; key: string }[] = [];

  for (const l of logins.filter(alive)) {
    const role = LEGACY_ROLES[Number(l.role_id)];
    if (!role) {
      skip('login', l, `unknown role_id ${l.role_id}`);
      continue;
    }
    if (!isBcrypt(l.password)) {
      skip('login', l, 'password is not a bcrypt hash');
      continue;
    }
    const prof = profileOf.get(String(l.reg_id)) ?? profileOf.get(String(l.details_id));
    let email = s(l.email)?.toLowerCase();
    let username = s(l.username)?.toLowerCase();
    if (email && seenEmail.has(email)) email = undefined;
    if (username && (seenUsername.has(username) || username === email)) username = undefined;
    if (!email && !username) {
      skip('login', l, 'duplicate or missing email/username');
      continue;
    }
    if (email) seenEmail.add(email);
    if (username) seenUsername.add(username);

    const doc: Record<string, unknown> = {
      role,
      name: s(l.name) ?? s(prof?.name) ?? s(prof?.parents_name) ?? s(prof?.partner_name) ?? s(prof?.school_name) ?? 'Nanoskool user',
      email,
      username,
      passwordHash: l.password,
      mustChangePassword: true,
      status: 'active',
      avatarUrl: s(l.profile_img) ?? s(prof?.profile_url),
    };
    if (role === 'partner') doc.partnerId = id(l.reg_id);
    if (role === 'school_admin') {
      doc.schoolId = id(l.reg_id);
      const sc = schools.find((x) => String(x._id) === String(l.reg_id));
      doc.partnerId = id(sc?.partner_id);
    }
    if (prof && (role === 'teacher' || role === 'student' || role === 'parent')) {
      doc.schoolId = id(prof.school_id);
      doc.phone = s(prof.mobile) ?? s(prof.contact_num);
      const sc = schools.find((x) => String(x._id) === String(prof.school_id));
      doc.partnerId = id(sc?.partner_id);
    }
    if (role === 'teacher' && prof) {
      doc.qualification = s(prof.qualification);
      const spec = s(prof.subject_specialization);
      if (spec) doc.subjects = spec.split(/[,/]/).map((x) => x.trim()).filter(Boolean);
    }
    if (role === 'student' && prof) {
      doc.rollNo = s(prof.roll_no);
      const g = s(prof.gender)?.toLowerCase();
      doc.gender = g === 'male' || g === 'female' ? g : g ? 'other' : '';
      pendingStudents.push({ userId: l._id, key: classKey(prof.school_id, prof.grade_id, prof.grade_division) });
    }
    if (role === 'parent' && prof?.student_id) {
      doc.relation = s(prof.relation_to_student);
      parentLinks.push({ userId: l._id, studentProfileId: String(prof.student_id) });
    }
    await upsert(User, l._id, doc);
    if (prof) userIdForProfile.set(String(prof._id), l._id);
    count(`users.${role}`);
  }

  for (const p of pendingStudents) {
    const classId = classByKey.get(p.key);
    if (classId) await upsert(User, p.userId, { classId });
    else report.skipped.push({ entity: 'student-class', id: String(p.userId), reason: `no class for ${p.key}` });
  }
  // Parents: group every child a parent login points at (v1 stored one parent row per child)
  const kids = new Map<string, Types.ObjectId[]>();
  for (const link of parentLinks) {
    const child = userIdForProfile.get(link.studentProfileId);
    if (!child) continue;
    const k = String(link.userId);
    kids.set(k, [...(kids.get(k) ?? []), child]);
  }
  for (const [parentId, childIds] of kids) {
    await upsert(User, new Types.ObjectId(parentId), { childIds });
    count('parent-links');
  }
  // Class teachers were stored as teacher profile ids; point them at the teacher's login
  if (opts.commit) {
    for (const c of await ClassSection.find({ classTeacherId: { $ne: null } }).lean()) {
      const u = userIdForProfile.get(String(c.classTeacherId));
      await ClassSection.updateOne({ _id: c._id }, u ? { classTeacherId: u } : { $unset: { classTeacherId: 1 } });
    }
  }

  /* Curriculum */
  for (const c of courses.filter(alive)) {
    const title = s(c.courses_name);
    if (!title) {
      skip('course', c, 'no title');
      continue;
    }
    const g = gradeNum.get(String(c.grade_id)) ?? gradeNumber(c.grade);
    await upsert(Course, c._id, {
      title,
      description: s(c.course_details),
      thumbnailUrl: s(c.course_thumbnail) ?? s(c.course_image),
      grades: g ? [g] : [],
      category: s(c.courses_type),
      status: Number(c.status ?? 1) === 1 ? 'published' : 'draft',
    });
    count('courses');
  }
  for (const ch of chapters.filter(alive)) {
    if (!ch.course_id) {
      skip('chapter', ch, 'no course');
      continue;
    }
    await upsert(Chapter, ch._id, { courseId: id(ch.course_id), title: s(ch.chapter_name) ?? 'Chapter', description: s(ch.chapter_description), position: Number(ch.position ?? 0) });
    count('chapters');
  }
  const contentByUnit = new Map<string, string[]>();
  for (const u of uploads.filter(alive)) {
    const list = Array.isArray(u.units_content) ? (u.units_content as unknown[]).map(String) : [];
    contentByUnit.set(String(u.units_id), [...(contentByUnit.get(String(u.units_id)) ?? []), ...list]);
  }
  for (const u of units.filter(alive)) {
    if (!u.chapter_id || !u.course_id) {
      skip('unit', u, 'no chapter or course');
      continue;
    }
    const files = contentByUnit.get(String(u._id)) ?? [];
    const video = files.find((f) => /\.(mp4|webm|mov)(\?|$)/i.test(f) || /youtu|vimeo/i.test(f));
    const pdf = files.find((f) => /\.pdf(\?|$)/i.test(f));
    const others = files.filter((f) => f !== video && f !== pdf);
    const esc = (x: string) => x.replace(/[<>"]/g, '');
    await upsert(Unit, u._id, {
      courseId: id(u.course_id),
      chapterId: id(u.chapter_id),
      title: s(u.unit_name) ?? 'Unit',
      summary: s(u.unit_summary),
      type: video ? 'video' : pdf ? 'pdf' : 'lesson',
      videoUrl: video,
      fileUrl: pdf,
      body: others.length ? `<p>Resources:</p><ul>${others.map((f) => `<li><a href="${esc(f)}">${esc(f.split('/').pop() ?? f)}</a></li>`).join('')}</ul>` : undefined,
      position: Number(u.position ?? 0),
    });
    count('units');
  }

  /* Access */
  for (const g of toPartner.filter(alive)) {
    if (!g.course_id || !g.partner_id) continue;
    await upsert(CourseGrant, g._id, { courseId: id(g.course_id), partnerId: id(g.partner_id) });
    count('grants.partner');
  }
  for (const g of toSchool.filter(alive)) {
    if (!g.course_id || !g.school_id) continue;
    await upsert(CourseGrant, g._id, { courseId: id(g.course_id), schoolId: id(g.school_id) });
    count('grants.school');
  }
  for (const a of toTeacher.filter(alive)) {
    const classId = classByDivisionId.get(String(a.grade_division_id));
    const teacherUser = userIdForProfile.get(String(a.teacher_id));
    if (!classId || !a.course_id) {
      skip('class-course', a, 'class or course not found');
      continue;
    }
    const cls = divisions.find((d) => String(d._id) === String(a.grade_division_id));
    if (opts.commit) {
      await ClassCourse.updateOne(
        { classId, courseId: id(a.course_id) },
        { $set: { schoolId: id(cls?.school_id), teacherId: teacherUser } },
        { upsert: true },
      );
      // Make sure the school can use the course it is already teaching
      await CourseGrant.updateOne({ courseId: id(a.course_id), schoolId: id(cls?.school_id) }, { $setOnInsert: { courseId: id(a.course_id), schoolId: id(cls?.school_id) } }, { upsert: true });
    }
    count('class-courses');
  }
  return report;
}

const isMain = process.argv[1]?.endsWith('migrate-legacy.ts') || process.argv[1]?.endsWith('migrate-legacy.js');
if (isMain) {
  (async () => {
    const legacyUri = process.env.LEGACY_MONGO_URI;
    if (!legacyUri) throw new Error('Set LEGACY_MONGO_URI to the v1 database');
    const commit = process.argv.includes('--commit');
    await connectDb();
    const legacyConn = await mongoose.createConnection(legacyUri).asPromise();
    const report = await migrateLegacy(legacyConn.db!, { commit });
    console.log(commit ? 'Migration written.' : 'DRY RUN (nothing written). Re-run with --commit to write.');
    console.table(report.counts);
    console.log(`${report.skipped.length} records skipped`);
    for (const x of report.skipped.slice(0, 50)) console.log(`  ${x.entity} ${x.id}: ${x.reason}`);
    await legacyConn.close();
    await mongoose.disconnect();
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
