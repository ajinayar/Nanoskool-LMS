/**
 * The student portfolio (verified evidence, outcomes and skill growth) and the Learning GPS:
 * rule-based guidance written three ways, for the student, the teacher and the parent.
 * Rules are simple and explainable on purpose; every suggestion says why it was made.
 */
import { Router } from 'express';
import { z } from 'zod';
import { assertClassAccess, assertStudentAccess } from '../../lib/access.js';
import { computeOutcomes, type UnitOutcome } from '../../lib/outcomes.js';
import { idParam, objectId, query } from '../../lib/validate.js';
import { authenticate, currentUser, requireRole } from '../../middleware/auth.js';
import { AssessmentAttempt, Assignment, Chapter, ClassCourse, ClassSection, Evidence, School, Skill, Submission, Unit, UnitProgress, User } from '../../models/index.js';

export const portfolioRouter = Router();
portfolioRouter.use(authenticate);

type Audience = 'student' | 'teacher' | 'parent';

/** Courses of a class with their units in teaching order. */
async function classUnits(classId: unknown) {
  if (!classId) return { courses: [] as { _id: string; title: string; thumbnailUrl?: string }[], units: [] as Awaited<ReturnType<typeof loadUnits>> };
  const ccs = await ClassCourse.find({ classId }).populate('courseId', 'title thumbnailUrl').lean();
  const courses = ccs.map((c) => c.courseId as unknown as { _id: string; title: string; thumbnailUrl?: string }).filter(Boolean);
  return { courses, units: await loadUnits(courses.map((c) => c._id)) };
}
async function loadUnits(courseIds: unknown[]) {
  const [chapters, units] = await Promise.all([
    Chapter.find({ courseId: { $in: courseIds } }).select('_id position').lean(),
    Unit.find({ courseId: { $in: courseIds } }).select('title courseId chapterId position objectives activities').lean(),
  ]);
  const pos = new Map(chapters.map((c) => [String(c._id), c.position ?? 0]));
  return units.sort((a, b) => String(a.courseId).localeCompare(String(b.courseId)) || pos.get(String(a.chapterId))! - pos.get(String(b.chapterId))! || (a.position ?? 0) - (b.position ?? 0));
}

async function skillProfile(studentId: unknown) {
  const [skills, attempts] = await Promise.all([
    Skill.find({ active: true }).sort({ position: 1 }).lean(),
    AssessmentAttempt.find({ studentId, status: { $ne: 'in_progress' } }).sort({ submittedAt: 1 }).select('skillScores submittedAt status').lean(),
  ]);
  const first = attempts[0];
  const latest = attempts.at(-1);
  const get = (a: typeof first | undefined, id: unknown) => a?.skillScores?.find((s) => String(s.skillId) === String(id));
  return {
    assessedAt: latest?.submittedAt ?? null,
    attempts: attempts.length,
    skills: skills.map((s) => ({ _id: s._id, name: s.name, color: s.color, first: get(first, s._id)?.score ?? null, latest: get(latest, s._id)?.score ?? null, level: get(latest, s._id)?.level ?? null })),
  };
}

/* -------------------------------------------------------------- Portfolio */

portfolioRouter.get('/students/:id/portfolio', async (req, res) => {
  const me = currentUser(req);
  const student = await assertStudentAccess(me, idParam(req));
  const [cls, school] = await Promise.all([
    student.classId ? ClassSection.findById(student.classId).select('name grade academicYear').lean() : null,
    student.schoolId ? School.findById(student.schoolId).select('name logoUrl').lean() : null,
  ]);
  const { courses, units } = await classUnits(student.classId);
  const sid = String(student._id);
  const [outcomes, evidence, skills] = await Promise.all([
    computeOutcomes(units, [sid]),
    Evidence.find({ studentId: sid }).sort({ createdAt: -1 }).lean(),
    skillProfile(sid),
  ]);
  const visible = evidence.filter((e) => (me.role === 'student' ? true : me.role === 'parent' ? e.visibility !== 'private' : true));
  const oc = outcomes.get(sid)!;
  const unitRows = units.map((u) => {
    const o = oc.get(String(u._id))!;
    const ev = visible.filter((e) => String(e.unitId) === String(u._id)).map((e) => ({ ...e, activityTitle: u.activities?.find((a) => String(a._id) === String(e.activityId))?.title }));
    return { _id: u._id, title: u.title, courseId: u.courseId, score: o.score, band: o.band, objectives: o.objectives, evidence: ev };
  });
  const scored = unitRows.filter((u) => u.score != null);
  res.json({
    student: { _id: student._id, name: student.name, avatarUrl: student.avatarUrl, interests: student.interests ?? [], class: cls, school },
    stats: {
      evidence: visible.length,
      verified: visible.filter((e) => e.status === 'verified').length,
      unitsWithOutcome: scored.length,
      averageOutcome: scored.length ? Math.round(scored.reduce((n, u) => n + (u.score ?? 0), 0) / scored.length) : null,
      mastered: scored.filter((u) => u.band === 'mastered').length,
    },
    skills,
    courses: courses.map((c) => ({ ...c, units: unitRows.filter((u) => String(u.courseId) === String(c._id)) })),
    featured: visible.filter((e) => e.featured && e.status === 'verified'),
  });
});

/* -------------------------------------------------------------- Learning GPS */

interface Advice {
  key: string;
  kind: 'setup' | 'next' | 'reroute' | 'alert' | 'strength';
  title: string;
  text: string;
  why: string;
  action?: { label: string; to: string };
}

/** Everyday ideas per skill, matched by name so admins can rename skills freely. */
const SKILL_TIPS: { match: RegExp; student: string; parent: string; teacher: string }[] = [
  { match: /critical/i, student: 'Before you answer, ask "why?" and "how do I know?"', parent: 'At dinner, ask "how do you know that?" about something they learned today.', teacher: 'Add "explain your reasoning" prompts and short debates to the next units.' },
  { match: /creativ/i, student: 'Try making one thing in a new way this week, even if it goes wrong.', parent: 'Give a box of household junk and 20 minutes to invent something.', teacher: 'Offer open-ended project choices instead of one right answer.' },
  { match: /communicat/i, student: 'Record a 1-minute video explaining what you built.', parent: 'Ask them to teach you one thing from school, like a small teacher.', teacher: 'Use short presentations or the Debating App at the end of units.' },
  { match: /collaborat/i, student: 'In your next group task, ask each friend for one idea.', parent: 'Cook or build something together and let them lead one step.', teacher: 'Pair with a strong collaborator and give each group member a role.' },
  { match: /problem/i, student: 'When stuck, break the problem into three small steps.', parent: 'Let them solve a small real problem at home before you help.', teacher: 'Use build-and-test tasks where the first try is expected to fail.' },
  { match: /digital|ai/i, student: 'Ask NanoBot to explain a hard idea, then check it in your book.', parent: 'Talk together about which websites and apps can be trusted.', teacher: 'Include a short "check the source" step in research tasks.' },
  { match: /curio|initiative/i, student: 'Write down one question each day and look for the answer.', parent: 'Visit a museum, park or workshop and let them ask the questions.', teacher: 'Start units with a puzzling question and let students propose investigations.' },
  { match: /self|manage/i, student: 'Plan your week: pick one lesson a day and tick it off.', parent: 'Agree a small daily routine for homework and praise sticking to it.', teacher: 'Share a weekly checklist and check in briefly each Monday.' },
];
const tipFor = (name: string, who: Audience) => SKILL_TIPS.find((t) => t.match.test(name))?.[who] ?? '';

async function guidanceFor(studentId: string, audience: Audience): Promise<Advice[]> {
  const student = await User.findById(studentId).select('name consent classId').lean();
  if (!student) return [];
  const first = student.name.split(' ')[0];
  const { units } = await classUnits(student.classId);
  const [outcomes, done, skills, lastAttempt, returned, pending, subs, assignments] = await Promise.all([
    computeOutcomes(units, [studentId]),
    UnitProgress.find({ studentId }).select('unitId').lean(),
    skillProfile(studentId),
    AssessmentAttempt.findOne({ studentId, status: { $ne: 'in_progress' } }).sort({ submittedAt: -1 }).lean(),
    Evidence.find({ studentId, status: 'returned' }).sort({ updatedAt: -1 }).limit(3).lean(),
    Evidence.countDocuments({ studentId, status: 'pending' }),
    Submission.find({ studentId }).select('assignmentId').lean(),
    student.classId ? Assignment.find({ classId: student.classId, status: 'published', dueDate: { $lt: new Date() } }).select('title dueDate').lean() : [],
  ]);
  const oc = outcomes.get(studentId)!;
  const doneIds = new Set(done.map((d) => String(d.unitId)));
  const out: Advice[] = [];
  const say = (s: string, t: string, p: string) => (audience === 'student' ? s : audience === 'teacher' ? t : p);

  // Setup: consent and the skills mission
  if (!student.consent?.assessment || !student.consent?.media) {
    out.push({
      key: 'consent',
      kind: 'setup',
      title: say('Ask a grown-up to say yes', 'Consent missing', 'Please give your consent'),
      text: say('A parent needs to allow your skills mission and project photos.', `${first}'s parent has not yet allowed the skills mission and/or photo and video evidence.`, `Allow ${first}'s skills mission and project photos so their work can count.`),
      why: 'Children’s data is only used with a parent’s permission.',
      action: audience === 'parent' ? { label: 'Give consent', to: 'consent' } : undefined,
    });
  }
  const due = !lastAttempt || Date.now() - (lastAttempt.submittedAt?.getTime() ?? 0) > 100 * 86400_000;
  if (student.consent?.assessment && due) {
    out.push({
      key: 'mission',
      kind: 'setup',
      title: say('Start your skills mission', 'Skills mission not taken this term', 'Skills mission is ready'),
      text: say('A short, fun set of puzzles and tasks that shows what you are great at.', `${first} has not taken this term's skills mission.`, `${first} can take this term's skills mission from their home page.`),
      why: 'It shows strengths and growth in 21st-century skills each term.',
      action: audience === 'student' ? { label: 'Start', to: 'assessment' } : undefined,
    });
  }

  // Rerouting: units not yet achieved
  const weak = units
    .map((u) => ({ u, o: oc.get(String(u._id)) as UnitOutcome }))
    .filter(({ o }) => o.band === 'not_yet' || o.band === 'approaching')
    .slice(0, 2);
  for (const { u, o } of weak) {
    const obj = [...o.objectives].filter((x) => x.score != null).sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
    const what = obj?.title ?? u.title;
    out.push({
      key: `reroute-${u._id}`,
      kind: 'reroute',
      title: say(`You're close on "${u.title}"`, `${first}: ${o.score}% in "${u.title}"`, `${first} is still working on "${u.title}"`),
      text: say(`Try the practice again and focus on: ${what}.`, `Weakest objective: "${what}" (${obj?.score ?? '—'}%). Plan a short reteach or a Super Tutor practice.`, `Ask ${first} to explain "${what}" to you at home. Praise the effort, not the mark.`),
      why: `Learning outcome ${o.score}% is below 70%.`,
      action: audience === 'student' ? { label: 'Open lesson', to: `units/${u._id}` } : undefined,
    });
  }

  // Work sent back by the teacher
  for (const e of returned) {
    const u = units.find((x) => String(x._id) === String(e.unitId));
    const a = u?.activities?.find((x) => String(x._id) === String(e.activityId));
    if (audience === 'teacher') continue;
    out.push({
      key: `returned-${e._id}`,
      kind: 'alert',
      title: say(`Try again: ${a?.title ?? 'your project'}`, '', `${a?.title ?? 'A project'} was sent back`),
      text: e.feedback ? `Teacher: "${e.feedback}"` : say('Your teacher asked you to improve it.', '', `The teacher asked ${first} to improve it.`),
      why: 'Your teacher returned this work with a note.',
      action: audience === 'student' && u ? { label: 'Open', to: `units/${u._id}` } : undefined,
    });
  }

  // Evidence still missing from lessons already finished
  const missing = units.filter((u) => doneIds.has(String(u._id)) && (oc.get(String(u._id))?.missingRequired ?? 0) > 0);
  if (missing.length) {
    const n = missing.reduce((s, u) => s + (oc.get(String(u._id))?.missingRequired ?? 0), 0);
    out.push({
      key: 'missing',
      kind: 'alert',
      title: say('Show what you learned', `${n} activities missing`, 'Some projects are not uploaded yet'),
      text: say(`${n} activit${n === 1 ? 'y is' : 'ies are'} waiting in lessons you finished, starting with "${missing[0].title}".`, `${first} finished ${missing.length} lesson(s) without the required activities.`, `${first} finished lessons but has not uploaded ${n} activit${n === 1 ? 'y' : 'ies'} yet.`),
      why: 'Outcomes need evidence from each learning unit.',
      action: audience === 'student' ? { label: 'Open', to: `units/${missing[0]._id}` } : undefined,
    });
  }
  if (audience === 'teacher' && pending) {
    out.push({ key: 'pending', kind: 'alert', title: `${pending} upload${pending === 1 ? '' : 's'} to check`, text: `${first} is waiting for your rubric score.`, why: 'Only verified evidence counts.', action: { label: 'Review', to: 'evidence' } });
  }
  const overdue = assignments.filter((a) => !subs.some((s) => String(s.assignmentId) === String(a._id)));
  if (overdue.length) {
    out.push({
      key: 'overdue',
      kind: 'alert',
      title: say(`${overdue.length} homework overdue`, `${overdue.length} overdue assignment${overdue.length === 1 ? '' : 's'}`, `${overdue.length} homework overdue`),
      text: say(`Start with "${overdue[0].title}".`, `Oldest: "${overdue[0].title}".`, `Please remind ${first} about "${overdue[0].title}".`),
      why: 'The due date has passed.',
      action: audience === 'student' ? { label: 'Open', to: 'assignments' } : undefined,
    });
  }

  // Skills: grow the weakest, celebrate the strongest
  const rated = skills.skills.filter((s) => s.latest != null).sort((a, b) => (a.latest ?? 0) - (b.latest ?? 0));
  if (rated.length) {
    const low = rated[0];
    const high = rated.at(-1)!;
    out.push({ key: 'skill-grow', kind: 'next', title: say(`Grow your ${low.name.toLowerCase()}`, `Focus skill: ${low.name} (${low.latest})`, `Help ${first} grow ${low.name.toLowerCase()}`), text: tipFor(low.name, audience), why: `Lowest score in the last skills mission (${low.level}).` });
    if (high !== low) out.push({ key: 'skill-strength', kind: 'strength', title: say(`You shine at ${high.name.toLowerCase()}!`, `Strength: ${high.name} (${high.latest})`, `${first} is strong at ${high.name.toLowerCase()}`), text: say('Keep using it: help a friend with it this week.', `Use ${first} as a peer helper for ${high.name.toLowerCase()} tasks.`, 'Tell them you noticed. Specific praise builds confidence.'), why: 'Highest score in the last skills mission.' });
  }

  // Next turn: the next lesson not yet finished
  const next = units.find((u) => !doneIds.has(String(u._id)));
  if (next) {
    out.push({
      key: 'next',
      kind: 'next',
      title: say(`Next turn: ${next.title}`, `Next lesson: ${next.title}`, `Coming up: ${next.title}`),
      text: say(`${next.objectives?.length ?? 0} things to learn, then show what you learned.`, `${next.objectives?.length ?? 0} objectives, ${next.activities?.length ?? 0} outcome activities.`, `Ask ${first} what they are learning in "${next.title}" this week.`),
      why: 'The next learning unit in the course.',
      action: audience === 'student' ? { label: 'Go', to: `units/${next._id}` } : undefined,
    });
  }
  return out;
}

portfolioRouter.get('/students/:id/guidance', async (req, res) => {
  const me = currentUser(req);
  const student = await assertStudentAccess(me, idParam(req));
  const { audience } = query(req, z.object({ audience: z.enum(['student', 'teacher', 'parent']).optional() }));
  const who: Audience = me.role === 'student' ? 'student' : me.role === 'parent' ? 'parent' : (audience ?? 'teacher');
  res.json(await guidanceFor(String(student._id), who));
});

/** Class view for teachers: which objectives to reteach, and what is waiting. */
portfolioRouter.get('/classes/:id/guidance', requireRole('super_admin', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const cls = await assertClassAccess(me, idParam(req));
  const { courseId } = query(req, z.object({ courseId: objectId.optional() }));
  const { units } = await classUnits(cls._id);
  const scoped = courseId ? units.filter((u) => String(u.courseId) === courseId) : units;
  const students = await User.find({ classId: cls._id, role: 'student' }).select('name consent').lean();
  const ids = students.map((s) => String(s._id));
  const [outcomes, pending, assessed] = await Promise.all([
    computeOutcomes(scoped, ids),
    Evidence.countDocuments({ classId: cls._id, status: 'pending' }),
    AssessmentAttempt.distinct('studentId', { classId: cls._id, status: { $ne: 'in_progress' } }),
  ]);
  const reteach: { unitId: string; unit: string; objective: string; students: string[] }[] = [];
  for (const u of scoped) {
    for (const o of u.objectives ?? []) {
      const struggling = students.filter((s) => {
        const x = outcomes.get(String(s._id))!.get(String(u._id))!.objectives.find((y) => y.objectiveId === String(o._id));
        return x?.band === 'not_yet' || x?.band === 'approaching';
      });
      if (struggling.length >= Math.max(2, Math.ceil(students.length * 0.25))) reteach.push({ unitId: String(u._id), unit: u.title, objective: o.title, students: struggling.map((s) => s.name) });
    }
  }
  res.json({
    reteach: reteach.slice(0, 8),
    pendingEvidence: pending,
    noConsent: students.filter((s) => !s.consent?.assessment || !s.consent?.media).map((s) => s.name),
    notAssessed: students.filter((s) => !assessed.some((a) => String(a) === String(s._id))).map((s) => s.name),
  });
});
