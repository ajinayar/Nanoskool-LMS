/**
 * Demo data: one partner, one school, three classes, teachers, students, parents,
 * three published courses with lessons and quizzes, plus activity.
 *
 *   npm run seed            # refuses to run on a non-empty database
 *   npm run seed -- --reset # wipes the database first (never on production!)
 */
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { connectDb } from './db.js';
import { hashPassword } from './lib/accounts.js';
import {
  Announcement,
  Assignment,
  Attendance,
  Chapter,
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
  Unit,
  UnitProgress,
  User,
} from './models/index.js';

export const DEMO_PASSWORD = 'Demo@1234';
export const ADMIN_PASSWORD = 'Admin@12345';

const lesson = (title: string, points: string[], activity: string) =>
  `<h2>${title}</h2><p>In this lesson you will learn:</p><ul>${points.map((p) => `<li>${p}</li>`).join('')}</ul><h3>Try it</h3><p>${activity}</p>`;

const COURSES = [
  {
    title: 'Robotics Foundations',
    category: 'Robotics',
    grades: [6, 7],
    level: 'beginner' as const,
    description: '<p>Build and program simple robots: sensors, motors, and the sense-think-act loop.</p>',
    chapters: [
      {
        title: 'What is a robot?',
        units: [
          { title: 'Robots around us', type: 'lesson', body: lesson('Robots around us', ['What makes a machine a robot', 'Sense, think, act', 'Robots in homes, farms and hospitals'], 'List three robots you have seen and write which part senses, thinks and acts.') },
          { title: 'Meet the robot kit', type: 'video', videoUrl: 'https://www.youtube.com/embed/8wHJKFe2Z-s', body: '<p>Watch the video and name each part of the kit.</p>' },
          { title: 'Safety in the lab', type: 'lesson', body: lesson('Safety in the lab', ['Handling batteries', 'Working with motors', 'Keeping the workspace tidy'], 'Make a safety poster for your lab table.') },
        ],
      },
      {
        title: 'Sensors and motors',
        units: [
          { title: 'How sensors work', type: 'lesson', body: lesson('How sensors work', ['Light, distance and touch sensors', 'Analog vs digital signals', 'Reading sensor values'], 'Use the distance sensor to measure your desk from three spots.') },
          { title: 'Driving a DC motor', type: 'activity', body: lesson('Driving a DC motor', ['Motor direction', 'Speed control with PWM', 'Why motors need a driver'], 'Make the motor spin forward for 2 seconds, then backward.') },
        ],
      },
      {
        title: 'Your first robot program',
        units: [
          { title: 'Sense-think-act in code', type: 'lesson', body: lesson('Sense-think-act in code', ['Loops', 'If-else decisions', 'Combining a sensor with a motor'], 'Program the robot to stop when something is closer than 10 cm.') },
          { title: 'Line-following challenge', type: 'activity', body: lesson('Line-following challenge', ['Two light sensors', 'Turning logic', 'Testing and fixing'], 'Get your robot around the black track in under 60 seconds.') },
        ],
      },
    ],
    quiz: {
      title: 'Robotics Foundations check',
      questions: [
        { text: 'Which three steps describe how a robot works?', options: ['Sense, think, act', 'Push, pull, lift', 'Read, write, erase', 'Start, stop, pause'], correct: [0] },
        { text: 'A distance sensor measures…', options: ['Temperature', 'How far away an object is', 'Colour', 'Sound'], correct: [1] },
        { text: 'PWM is used to control a motor’s…', options: ['Colour', 'Weight', 'Speed', 'Size'], correct: [2] },
        { text: 'Batteries should be kept away from water.', type: 'true_false', options: ['True', 'False'], correct: [0] },
      ],
    },
  },
  {
    title: 'Coding with Scratch',
    category: 'Coding',
    grades: [5, 6],
    level: 'beginner' as const,
    description: '<p>Learn to code by making games and stories with Scratch blocks.</p>',
    chapters: [
      {
        title: 'Getting started',
        units: [
          { title: 'The Scratch editor', type: 'lesson', body: lesson('The Scratch editor', ['Stage and sprites', 'Block categories', 'Saving a project'], 'Open Scratch and make the cat say hello.') },
          { title: 'Motion and events', type: 'lesson', body: lesson('Motion and events', ['When flag clicked', 'Move and turn', 'Glide to a point'], 'Make a sprite draw a square path.') },
        ],
      },
      {
        title: 'Making a game',
        units: [
          { title: 'Variables and score', type: 'lesson', body: lesson('Variables and score', ['Creating a variable', 'Changing it on events', 'Showing it on stage'], 'Add a score that goes up when you catch an apple.') },
          { title: 'Build: Catch the apple', type: 'activity', body: lesson('Catch the apple', ['Random positions', 'Touching sprite?', 'Game over'], 'Finish the game and share it with your class.') },
        ],
      },
    ],
    quiz: {
      title: 'Scratch basics quiz',
      questions: [
        { text: 'Which block starts a script when the green flag is clicked?', options: ['when this sprite clicked', 'when green flag clicked', 'forever', 'wait 1 seconds'], correct: [1] },
        { text: 'A variable is used to…', options: ['Store a value that can change', 'Draw a costume', 'Play a sound', 'Delete a sprite'], correct: [0] },
        { text: 'Which are Scratch block categories? (choose all)', type: 'multiple', options: ['Motion', 'Looks', 'Spreadsheets', 'Sound'], correct: [0, 1, 3] },
      ],
    },
  },
  {
    title: 'Introduction to AI',
    category: 'Artificial Intelligence',
    grades: [7, 8],
    level: 'intermediate' as const,
    description: '<p>What AI is, how machines learn from data, and how to use AI responsibly.</p>',
    chapters: [
      {
        title: 'AI all around',
        units: [
          { title: 'What is artificial intelligence?', type: 'lesson', body: lesson('What is AI?', ['AI vs normal programs', 'Examples in daily life', 'What AI cannot do'], 'Find three apps on a phone that use AI.') },
          { title: 'Training data', type: 'lesson', body: lesson('Training data', ['Examples and labels', 'Why more data helps', 'Bias in data'], 'Sort 20 picture cards into labels to train a “model”.') },
        ],
      },
      {
        title: 'Responsible AI',
        units: [{ title: 'Fairness and safety', type: 'lesson', body: lesson('Fairness and safety', ['Bias', 'Privacy', 'Checking AI answers'], 'Discuss: when should a person, not AI, make the decision?') }],
      },
    ],
    quiz: {
      title: 'AI concepts quiz',
      questions: [
        { text: 'Machine learning models learn from…', options: ['Data', 'Magic', 'Only rules written by hand', 'Electricity'], correct: [0] },
        { text: 'Biased training data can make AI unfair.', type: 'true_false', options: ['True', 'False'], correct: [0] },
      ],
    },
  },
];

const FIRST = ['Aarav', 'Diya', 'Vihaan', 'Ananya', 'Arjun', 'Ishita', 'Kabir', 'Meera', 'Reyansh', 'Saanvi', 'Advait', 'Kiara', 'Rohan', 'Tara', 'Nikhil', 'Zoya', 'Dev', 'Aditi', 'Farhan', 'Nila', 'Omar', 'Pooja', 'Rahul', 'Sneha'];
const LAST = ['Nair', 'Menon', 'Sharma', 'Iyer', 'Pillai', 'Reddy', 'Khan', 'Das', 'Joseph', 'Varghese', 'Gupta', 'Rao'];

function schoolDays(n: number) {
  const out: string[] = [];
  const d = new Date();
  while (out.length < n) {
    d.setDate(d.getDate() - 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export async function seed({ quiet = false } = {}) {
  const log = (...a: unknown[]) => !quiet && console.log(...a);
  const demoHash = await hashPassword(DEMO_PASSWORD);
  const mk = (data: Record<string, unknown>) => User.create({ passwordHash: demoHash, mustChangePassword: false, ...data });

  const admin = await User.create({
    role: 'super_admin',
    name: 'Nanoskool Admin',
    email: 'admin@nanoskool.in',
    passwordHash: await hashPassword(ADMIN_PASSWORD),
  });

  const partner = await Partner.create({ name: 'Kerala STEM Partners', code: 'KSP', contactName: 'Anil Kumar', contactEmail: 'partner@demo.nanoskool.in', city: 'Kochi', state: 'Kerala' });
  await mk({ role: 'partner', name: 'Anil Kumar', email: 'partner@demo.nanoskool.in', partnerId: partner._id });

  const school = await School.create({
    name: 'Green Valley Public School',
    code: 'GVPS',
    partnerId: partner._id,
    board: 'CBSE',
    city: 'Kochi',
    state: 'Kerala',
    pinCode: '682020',
    principalName: 'Dr. Lakshmi Menon',
    email: 'office@greenvalley.example',
    academicYear: '2026-27',
    plan: 'premium',
    aiMonthlyTokens: 500000,
  });
  const school2 = await School.create({ name: 'Riverside Academy', code: 'RSA', partnerId: partner._id, board: 'ICSE', city: 'Thrissur', state: 'Kerala' });
  await mk({ role: 'school_admin', name: 'Priya Nair', email: 'school@demo.nanoskool.in', schoolId: school._id, partnerId: partner._id });
  await mk({ role: 'school_admin', name: 'Joseph Mathew', email: 'riverside@demo.nanoskool.in', schoolId: school2._id, partnerId: partner._id });

  const teachers = await Promise.all([
    mk({ role: 'teacher', name: 'Rahul Menon', email: 'teacher@demo.nanoskool.in', schoolId: school._id, partnerId: partner._id, subjects: ['Robotics', 'Science'] }),
    mk({ role: 'teacher', name: 'Sneha Iyer', email: 'sneha.teacher@demo.nanoskool.in', schoolId: school._id, partnerId: partner._id, subjects: ['Coding', 'Maths'] }),
    mk({ role: 'teacher', name: 'Farhan Khan', email: 'farhan.teacher@demo.nanoskool.in', schoolId: school._id, partnerId: partner._id, subjects: ['AI', 'Computer Science'] }),
  ]);

  const classes = await Promise.all([
    ClassSection.create({ schoolId: school._id, grade: 6, section: 'A', name: 'Grade 6 - A', classTeacherId: teachers[0]._id, academicYear: '2026-27' }),
    ClassSection.create({ schoolId: school._id, grade: 6, section: 'B', name: 'Grade 6 - B', classTeacherId: teachers[1]._id, academicYear: '2026-27' }),
    ClassSection.create({ schoolId: school._id, grade: 7, section: 'A', name: 'Grade 7 - A', classTeacherId: teachers[2]._id, academicYear: '2026-27' }),
  ]);

  // Students: 8 per class. The first student of 6-A has an email login; the rest use usernames.
  const students: Awaited<ReturnType<typeof mk>>[] = [];
  let n = 0;
  for (const cls of classes) {
    for (let i = 1; i <= 8; i++) {
      const name = `${FIRST[n % FIRST.length]} ${LAST[(n * 7) % LAST.length]}`;
      const first = n === 0;
      students.push(
        await mk({
          role: 'student',
          name,
          email: first ? 'student@demo.nanoskool.in' : undefined,
          username: first ? 'aarav.gvps' : `${name.split(' ')[0].toLowerCase()}.${cls.grade}${cls.section.toLowerCase()}${i}`,
          schoolId: school._id,
          partnerId: partner._id,
          classId: cls._id,
          rollNo: String(i).padStart(2, '0'),
          gender: n % 2 ? 'female' : 'male',
        }),
      );
      n++;
    }
  }
  await mk({ role: 'parent', name: 'Suresh Nair', email: 'parent@demo.nanoskool.in', phone: '+91 98470 00000', relation: 'Father', schoolId: school._id, partnerId: partner._id, childIds: [students[0]._id, students[9]._id] });
  for (const s of students.slice(1, 9)) {
    await mk({ role: 'parent', name: `Parent of ${s.name}`, username: `parent.${s.username}`, schoolId: school._id, partnerId: partner._id, childIds: [s._id], relation: 'Mother' });
  }

  // Courses
  const courses = [];
  for (const c of COURSES) {
    const course = await Course.create({ title: c.title, category: c.category, grades: c.grades, level: c.level, description: c.description, status: 'published', createdBy: admin._id });
    let unitIds: mongoose.Types.ObjectId[] = [];
    for (const [ci, ch] of c.chapters.entries()) {
      const chapter = await Chapter.create({ courseId: course._id, title: ch.title, position: ci });
      for (const [ui, u] of ch.units.entries()) {
        const unit = await Unit.create({ ...u, courseId: course._id, chapterId: chapter._id, position: ui, durationMin: 15 + ui * 5, summary: `${u.title} — ${c.title}` });
        unitIds.push(unit._id);
      }
    }
    const quiz = await Quiz.create({
      title: c.quiz.title,
      courseId: course._id,
      status: 'published',
      maxAttempts: 2,
      timeLimitMin: 10,
      createdBy: admin._id,
      questions: c.quiz.questions.map((q) => ({ type: 'single', points: 1, ...q, explanation: `The correct answer is: ${q.correct.map((i) => q.options[i]).join(', ')}.` })),
    });
    courses.push({ course, unitIds, quiz });
    unitIds = [];
  }
  // A draft course only the super admin sees
  await Course.create({ title: 'Electronics Lab (draft)', category: 'Electronics', grades: [8, 9], status: 'draft', createdBy: admin._id, description: '<p>Circuits, LEDs and breadboards.</p>' });

  for (const { course } of courses) {
    await CourseGrant.create({ courseId: course._id, partnerId: partner._id, grantedBy: admin._id });
    await CourseGrant.create({ courseId: course._id, schoolId: school._id, viaPartnerId: partner._id, grantedBy: admin._id });
  }

  // Timetable of courses per class
  const [robotics, scratch, ai] = courses;
  const plan = [
    { cls: classes[0], c: robotics, t: teachers[0] },
    { cls: classes[0], c: scratch, t: teachers[1] },
    { cls: classes[1], c: robotics, t: teachers[0] },
    { cls: classes[1], c: scratch, t: teachers[1] },
    { cls: classes[2], c: robotics, t: teachers[0] },
    { cls: classes[2], c: ai, t: teachers[2] },
  ];
  for (const p of plan) await ClassCourse.create({ schoolId: school._id, classId: p.cls._id, courseId: p.c.course._id, teacherId: p.t._id, startDate: new Date('2026-06-15') });

  // Progress, quiz attempts
  for (const [i, s] of students.entries()) {
    const cls = classes.find((c) => String(c._id) === String(s.classId))!;
    for (const p of plan.filter((x) => x.cls === cls)) {
      const doneCount = Math.max(1, Math.round(p.c.unitIds.length * (((i * 37) % 90) + 10) / 100));
      for (const uid of p.c.unitIds.slice(0, doneCount)) await UnitProgress.create({ studentId: s._id, courseId: p.c.course._id, unitId: uid, completedAt: new Date(Date.now() - ((i * 3) % 20) * 86400_000) });
      if (i % 3 !== 2) {
        const total = p.c.quiz.questions.length;
        const score = Math.max(1, total - (i % total));
        await QuizAttempt.create({ quizId: p.c.quiz._id, studentId: s._id, classId: cls._id, answers: [], score, maxScore: total, percent: Math.round((score / total) * 100), submittedAt: new Date(Date.now() - (i % 10) * 86400_000) });
      }
    }
  }

  // Assignments and submissions
  const due = (days: number) => new Date(Date.now() + days * 86400_000);
  const a1 = await Assignment.create({ schoolId: school._id, classId: classes[0]._id, courseId: robotics.course._id, title: 'Sketch your dream robot', instructions: '<p>Draw a robot that helps at home. Label its sensors and motors.</p>', kind: 'project', dueDate: due(5), maxPoints: 20, createdBy: teachers[0]._id });
  const a2 = await Assignment.create({ schoolId: school._id, classId: classes[0]._id, courseId: scratch.course._id, title: 'Animate your name', instructions: '<p>Make each letter of your name move in Scratch. Upload the .sb3 file.</p>', kind: 'homework', dueDate: due(-2), maxPoints: 10, createdBy: teachers[1]._id });
  await Assignment.create({ schoolId: school._id, classId: classes[2]._id, courseId: ai.course._id, title: 'AI in my town', instructions: '<p>Find two places in your town where AI is used. Write 5 lines about each.</p>', kind: 'homework', dueDate: due(7), maxPoints: 10, createdBy: teachers[2]._id });
  for (const s of students.slice(0, 6)) {
    await Submission.create({ assignmentId: a2._id, studentId: s._id, text: 'My Scratch project is attached.', submittedAt: due(-3), status: s === students[0] || s === students[1] ? 'graded' : 'submitted', points: s === students[0] ? 9 : s === students[1] ? 7 : undefined, feedback: s === students[0] ? 'Lovely animation, great use of glide blocks!' : undefined, gradedBy: teachers[1]._id });
  }
  await Submission.create({ assignmentId: a1._id, studentId: students[2]._id, text: 'Robot that waters plants using a soil moisture sensor.' });

  // Attendance for the last 10 school days
  for (const cls of classes) {
    const clsStudents = students.filter((s) => String(s.classId) === String(cls._id));
    for (const [di, date] of schoolDays(10).entries()) {
      await Attendance.create({
        schoolId: school._id,
        classId: cls._id,
        date,
        takenBy: cls.classTeacherId,
        records: clsStudents.map((s, si) => ({ studentId: s._id, status: (si + di) % 11 === 0 ? 'absent' : (si + di) % 13 === 0 ? 'late' : 'present' })),
      });
    }
  }

  await Remark.create({ schoolId: school._id, studentId: students[0]._id, teacherId: teachers[0]._id, category: 'appreciation', text: 'Aarav built the fastest line-follower in class this week!' });
  await Remark.create({ schoolId: school._id, studentId: students[0]._id, teacherId: teachers[1]._id, category: 'improvement', text: 'Please submit Scratch homework on time.' });
  await Remark.create({ schoolId: school._id, studentId: students[9]._id, teacherId: teachers[1]._id, category: 'general', text: 'Good participation in the coding club.' });

  await Announcement.create({ scope: 'global', title: 'Welcome to the new Nanoskool', body: '<p>The platform has been rebuilt: faster, safer, and with NanoBot built in.</p>', kind: 'news', pinned: true, createdBy: admin._id });
  await Announcement.create({ scope: 'school', schoolId: school._id, title: 'Science & Robotics Fair on the 20th', body: '<p>Every class will show one project. Parents are welcome.</p>', createdBy: admin._id });
  await Announcement.create({ scope: 'class', schoolId: school._id, classId: classes[0]._id, title: 'Bring your robot kits on Monday', body: '<p>We will start the line-following challenge.</p>', createdBy: teachers[0]._id });
  await Announcement.create({ scope: 'school', schoolId: school._id, audience: ['teacher'], title: 'Staff meeting Friday 3 pm', createdBy: admin._id });

  const at = (days: number, h = 10) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(h, 0, 0, 0);
    return d;
  };
  await Event.create({ schoolId: school._id, title: 'Science & Robotics Fair', startsAt: at(12), endsAt: at(12, 15), location: 'Main hall', createdBy: admin._id });
  await Event.create({ schoolId: school._id, title: 'Parent-teacher meeting', startsAt: at(5, 9), location: 'Classrooms', createdBy: admin._id });
  await Event.create({ schoolId: school._id, classId: classes[0]._id, title: 'Robot kit day (6-A)', startsAt: at(2, 11), createdBy: teachers[0]._id });
  await Event.create({ title: 'National Coding Olympiad registration closes', startsAt: at(20, 17), createdBy: admin._id });

  log('\nSeed complete. Sign in with:');
  log(`  Super admin   admin@nanoskool.in            ${ADMIN_PASSWORD}`);
  log(`  Partner       partner@demo.nanoskool.in     ${DEMO_PASSWORD}`);
  log(`  School admin  school@demo.nanoskool.in      ${DEMO_PASSWORD}`);
  log(`  Teacher       teacher@demo.nanoskool.in     ${DEMO_PASSWORD}`);
  log(`  Student       student@demo.nanoskool.in     ${DEMO_PASSWORD}  (or username aarav.gvps)`);
  log(`  Parent        parent@demo.nanoskool.in      ${DEMO_PASSWORD}`);
  return { admin, partner, school, school2, classes, teachers, students, courses };
}

const isMain = process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js');
if (isMain) {
  (async () => {
    await connectDb();
    const reset = process.argv.includes('--reset');
    if (reset) {
      if (env.NODE_ENV === 'production') throw new Error('Refusing to reset a production database');
      await mongoose.connection.db!.dropDatabase();
    } else if ((await User.countDocuments()) > 0) {
      console.error('Database is not empty. Use --reset to wipe it (development only).');
      process.exit(1);
    }
    // Ensure unique indexes exist before inserting
    await Promise.all(mongoose.modelNames().map((m) => mongoose.model(m).syncIndexes()));
    await seed();
    await mongoose.disconnect();
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
