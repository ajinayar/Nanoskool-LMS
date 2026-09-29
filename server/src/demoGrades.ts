/**
 * Adds one demo student for every grade from 1 to 10 at Green Valley Public School, so you
 * can see how the student app changes with age. Each student gets a class (Grade N - A),
 * the same courses as Grade 6 - A, and a little learning history (a 2-day streak, a few
 * finished lessons) so stars, levels and badges have something to show.
 *
 *   npm run demo:grades
 *
 * Sign in as grade1.demo … grade10.demo with the password Demo@1234.
 * Safe to re-run: existing classes and students are reused, nothing is deleted.
 */
import mongoose from 'mongoose';
import { connectDb } from './db.js';
import { hashPassword } from './lib/accounts.js';
import { Chapter, ClassCourse, ClassSection, School, Unit, UnitProgress, User } from './models/index.js';
import { DEMO_PASSWORD } from './seed.js';

const NAMES = ['Anaya Pillai', 'Kabir Das', 'Ira Menon', 'Vihaan Rao', 'Diya Thomas', 'Arjun Nair', 'Meera Iyer', 'Rohan Joseph', 'Sara Mathew', 'Aditya Varma'];

async function main() {
  await connectDb();
  const school = await School.findOne({ code: 'GVPS' });
  if (!school) throw new Error('Green Valley Public School (GVPS) not found. Run "npm run seed" first.');
  const template = await ClassSection.findOne({ schoolId: school._id, grade: 6, section: 'A' });
  const courses = template ? await ClassCourse.find({ classId: template._id }).lean() : [];
  const hash = await hashPassword(DEMO_PASSWORD);
  const DAY = 86400_000;

  for (let grade = 1; grade <= 10; grade++) {
    let cls = await ClassSection.findOne({ schoolId: school._id, grade, section: 'A' });
    if (!cls) {
      cls = await ClassSection.create({ schoolId: school._id, grade, section: 'A', name: `Grade ${grade} - A`, academicYear: school.academicYear ?? '2026-27', classTeacherId: template?.classTeacherId });
    }
    for (const cc of courses) {
      await ClassCourse.updateOne(
        { classId: cls._id, courseId: cc.courseId },
        { $setOnInsert: { classId: cls._id, courseId: cc.courseId, schoolId: school._id, teacherId: cc.teacherId } },
        { upsert: true },
      );
    }
    const username = `grade${grade}.demo`;
    let student = await User.findOne({ username });
    if (!student) {
      student = await User.create({
        role: 'student',
        name: NAMES[grade - 1],
        username,
        passwordHash: hash,
        mustChangePassword: false,
        schoolId: school._id,
        partnerId: school.partnerId,
        classId: cls._id,
        rollNo: String(100 + grade),
      });
    }
    // A little history: lessons finished yesterday and the day before (a 2-day streak)
    if (!(await UnitProgress.exists({ studentId: student._id }))) {
      const first = courses[0];
      if (first) {
        const chapters = await Chapter.find({ courseId: first.courseId }).sort({ order: 1 }).select('_id').lean();
        const units = await Unit.find({ chapterId: { $in: chapters.map((c) => c._id) } }).sort({ order: 1 }).limit(3).lean();
        for (const [i, u] of units.entries()) {
          await UnitProgress.create({ studentId: student._id, courseId: first.courseId, unitId: u._id, completedAt: new Date(Date.now() - (i === 0 ? 2 : 1) * DAY) });
        }
      }
    }
    console.log(`Grade ${grade}: ${username} (${student.name})`);
  }
  console.log(`\nPassword for all demo students: ${DEMO_PASSWORD}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await mongoose.disconnect();
  process.exit(1);
});
