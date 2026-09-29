/**
 * Rewards are earned by learning, never bought or granted by hand. Everything except the
 * daily-reward claim is worked out from real activity (finished units, quiz attempts,
 * submitted homework), so the totals cannot drift from what the student actually did.
 */
import { AiChat, Assignment, QuizAttempt, RewardClaim, School, Submission, UnitProgress, User } from '../../models/index.js';
import { todayIn } from '../../lib/time.js';
import { studentCourseProgress } from '../curriculum/routes.js';

export const XP_RULES = {
  unit: 10, // each finished unit
  quizBase: 5, // best attempt per quiz: 5 + percent / 5 (so 5–25)
  submission: 15, // each assignment handed in
  onTime: 5, // … handed in before the due date
  goodGrade: 10, // … graded 80% or more
  claimBase: 5, // daily reward: 5 + 1 per streak day (up to +5)
};

/** Total XP needed to reach a level: L1 0, L2 100, L3 300, L4 600, L5 1000 … */
export const levelStart = (level: number) => 50 * level * (level - 1);
export function levelFor(xp: number) {
  let level = 1;
  while (xp >= levelStart(level + 1)) level++;
  return level;
}

export interface RewardEvent {
  kind: 'unit' | 'quiz' | 'submission' | 'claim';
  label: string;
  xp: number;
  at: Date;
  percent?: number;
  onTime?: boolean;
}

export const BADGES = [
  { key: 'first-step', name: 'First step', description: 'Finish your first lesson' },
  { key: 'bookworm', name: 'Bookworm', description: 'Finish 10 lessons' },
  { key: 'explorer', name: 'Knowledge explorer', description: 'Finish 25 lessons' },
  { key: 'quiz-starter', name: 'Quiz starter', description: 'Complete your first quiz' },
  { key: 'quiz-whiz', name: 'Quiz whiz', description: 'Score 90% or more in a quiz' },
  { key: 'perfect', name: 'Perfect score', description: 'Get every answer right in a quiz' },
  { key: 'homework-hero', name: 'Homework hero', description: 'Hand in your first assignment' },
  { key: 'on-time', name: 'Right on time', description: 'Hand in 5 assignments before the due date' },
  { key: 'streak-3', name: 'On a roll', description: 'Learn 3 days in a row' },
  { key: 'streak-7', name: 'Week warrior', description: 'Learn 7 days in a row' },
  { key: 'course-complete', name: 'Course champion', description: 'Finish every lesson in a course' },
  { key: 'level-5', name: 'Rising star', description: 'Reach level 5' },
] as const;

const DAY = 86400_000;
function prevDay(day: string) {
  return new Date(new Date(`${day}T12:00:00Z`).getTime() - DAY).toISOString().slice(0, 10);
}

/** Longest run of consecutive days, and the run that ends today (or yesterday, still alive). */
export function streaks(days: Set<string>, today: string) {
  let current = 0;
  let d = days.has(today) ? today : prevDay(today);
  while (days.has(d)) {
    current++;
    d = prevDay(d);
  }
  let best = 0;
  for (const day of days) {
    if (days.has(prevDay(day))) continue; // not the start of a run
    let len = 0;
    let x = day;
    while (days.has(x)) {
      len++;
      x = new Date(new Date(`${x}T12:00:00Z`).getTime() + DAY).toISOString().slice(0, 10);
    }
    best = Math.max(best, len);
  }
  return { current, best: Math.max(best, current) };
}

export async function rewardsFor(studentId: string) {
  const student = await User.findById(studentId).select('schoolId classId').lean();
  const school = student?.schoolId ? await School.findById(student.schoolId).select('timezone').lean() : null;
  const tz = school?.timezone ?? 'Asia/Kolkata';
  const dayOf = (at: Date) => todayIn(tz, at);
  const today = dayOf(new Date());

  const [units, attempts, subs, claims, chatsToday, courses] = await Promise.all([
    UnitProgress.find({ studentId }).select('completedAt unitId').populate('unitId', 'title').lean(),
    QuizAttempt.find({ studentId, submittedAt: { $ne: null } }).select('quizId percent submittedAt').populate('quizId', 'title').lean(),
    Submission.find({ studentId }).select('assignmentId submittedAt late status points').lean(),
    RewardClaim.find({ studentId }).select('day xp createdAt').lean(),
    AiChat.countDocuments({ userId: studentId, updatedAt: { $gte: new Date(Date.now() - DAY) } }),
    studentCourseProgress(studentId, student?.classId),
  ]);
  const assignments = await Assignment.find({ _id: { $in: subs.map((s) => s.assignmentId) } }).select('title maxPoints').lean();
  const asg = new Map(assignments.map((a) => [String(a._id), a]));

  const events: RewardEvent[] = [];
  for (const u of units) {
    events.push({ kind: 'unit', label: (u.unitId as { title?: string } | null)?.title ?? 'Lesson', xp: XP_RULES.unit, at: u.completedAt ?? new Date() });
  }
  // Only the best attempt per quiz counts, so retaking a quiz cannot farm XP
  const best = new Map<string, (typeof attempts)[number]>();
  for (const a of attempts) {
    const k = String((a.quizId as { _id?: unknown } | null)?._id ?? a.quizId);
    const cur = best.get(k);
    if (!cur || (a.percent ?? 0) > (cur.percent ?? 0)) best.set(k, a);
  }
  for (const a of best.values()) {
    events.push({ kind: 'quiz', label: (a.quizId as { title?: string } | null)?.title ?? 'Quiz', xp: XP_RULES.quizBase + Math.round((a.percent ?? 0) / 5), at: a.submittedAt!, percent: a.percent ?? 0 });
  }
  for (const s of subs) {
    const a = asg.get(String(s.assignmentId));
    let xp = XP_RULES.submission;
    if (!s.late) {
      xp += XP_RULES.onTime;
    }
    if (s.status === 'graded' && s.points != null && a?.maxPoints && s.points / a.maxPoints >= 0.8) xp += XP_RULES.goodGrade;
    events.push({ kind: 'submission', label: a?.title ?? 'Assignment', xp, at: s.submittedAt ?? new Date(), onTime: !s.late });
  }
  for (const c of claims) events.push({ kind: 'claim', label: 'Daily reward', xp: c.xp, at: c.createdAt ?? new Date() });
  events.sort((a, b) => a.at.getTime() - b.at.getTime());

  // Learning days: claiming a reward is not learning, so it does not keep a streak alive
  const learnDays = new Set(events.filter((e) => e.kind !== 'claim').map((e) => dayOf(e.at)));
  const streak = streaks(learnDays, today);

  // Replay history so each badge knows when it was earned
  const earned = new Map<string, Date>();
  const mark = (key: string, at: Date) => !earned.has(key) && earned.set(key, at);
  let unitN = 0;
  let onTimeN = 0;
  let xp = 0;
  const seenDays = new Set<string>();
  for (const e of events) {
    xp += e.xp;
    if (e.kind === 'unit') {
      unitN++;
      if (unitN >= 1) mark('first-step', e.at);
      if (unitN >= 10) mark('bookworm', e.at);
      if (unitN >= 25) mark('explorer', e.at);
    } else if (e.kind === 'quiz') {
      mark('quiz-starter', e.at);
      const pct = e.percent ?? 0;
      if (pct >= 90) mark('quiz-whiz', e.at);
      if (pct >= 100) mark('perfect', e.at);
    } else if (e.kind === 'submission') {
      mark('homework-hero', e.at);
      if (e.onTime) onTimeN++;
      if (onTimeN >= 5) mark('on-time', e.at);
    }
    if (e.kind !== 'claim') {
      seenDays.add(dayOf(e.at));
      const run = streaks(seenDays, dayOf(e.at)).current;
      if (run >= 3) mark('streak-3', e.at);
      if (run >= 7) mark('streak-7', e.at);
    }
    if (levelFor(xp) >= 5) mark('level-5', e.at);
  }
  if (courses.some((c) => c.unitCount > 0 && c.completedUnits >= c.unitCount)) mark('course-complete', units.at(-1)?.completedAt ?? new Date());

  const level = levelFor(xp);
  const todayEvents = events.filter((e) => dayOf(e.at) === today);
  const learnedToday = todayEvents.some((e) => e.kind !== 'claim');
  const claimedToday = claims.some((c) => c.day === today);

  return {
    xp,
    level,
    levelStart: levelStart(level),
    nextLevelAt: levelStart(level + 1),
    streak: streak.current,
    bestStreak: streak.best,
    learnedToday,
    daily: {
      claimed: claimedToday,
      canClaim: learnedToday && !claimedToday,
      xp: XP_RULES.claimBase + Math.min(streak.current, 5),
    },
    quests: [
      { key: 'unit', label: 'Finish a lesson', done: todayEvents.some((e) => e.kind === 'unit') },
      { key: 'quiz', label: 'Try a quiz', done: todayEvents.some((e) => e.kind === 'quiz') },
      { key: 'nanobot', label: 'Ask NanoBot a question', done: chatsToday > 0 },
    ],
    badges: BADGES.map((b) => ({ ...b, earned: earned.has(b.key), earnedAt: earned.get(b.key) ?? null })),
    recent: events.slice(-8).reverse().map(({ percent: _p, onTime: _o, ...e }) => e),
    today,
  };
}

export async function claimDaily(studentId: string) {
  const state = await rewardsFor(studentId);
  if (state.daily.claimed) return { ok: false as const, reason: 'You have already opened today’s reward. Come back tomorrow!' };
  if (!state.learnedToday) return { ok: false as const, reason: 'Finish a lesson, quiz or assignment today to unlock your reward.' };
  try {
    await RewardClaim.create({ studentId, day: state.today, xp: state.daily.xp });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return { ok: false as const, reason: 'You have already opened today’s reward. Come back tomorrow!' };
    throw err;
  }
  return { ok: true as const, gained: state.daily.xp };
}
