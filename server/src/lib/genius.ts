/**
 * Genius Habits: the growth stages every habit moves through.
 *
 *   Seed 0–29 · Sprout 30–49 · Sapling 50–69 · Bloom 70–84 · Fruit 85+ and teacher-verified evidence
 *
 * Fruit (the "genius" stage) can never come from quest answers alone: the child also needs verified
 * work (a project, presentation or tool result scoring 75+) on an objective that builds that habit.
 */
import { Evidence, HabitObservation, Skill, Unit } from '../models/index.js';

export const STAGES = ['seed', 'sprout', 'sapling', 'bloom', 'fruit'] as const;
export type Stage = (typeof STAGES)[number];

/** Stage from a quest score alone (tops out at Bloom). */
export const stageForScore = (score: number): Stage => (score >= 70 ? 'bloom' : score >= 50 ? 'sapling' : score >= 30 ? 'sprout' : 'seed');

/** Stage including the Fruit rule. */
export const stageFor = (score: number | null | undefined, hasEvidence: boolean): Stage | null => {
  if (score == null) return null;
  if (score >= 85 && hasEvidence) return 'fruit';
  return stageForScore(score);
};

/** Skills (habits) this student has strong, verified evidence for. */
export async function habitsWithEvidence(studentId: unknown): Promise<Set<string>> {
  const ev = await Evidence.find({ studentId, status: 'verified', score: { $gte: 75 } }).select('unitId objectiveIds').lean();
  if (!ev.length) return new Set();
  const units = await Unit.find({ _id: { $in: [...new Set(ev.map((e) => String(e.unitId)))] } }).select('objectives').lean();
  const byObjective = new Map<string, string[]>();
  for (const u of units) for (const o of u.objectives ?? []) byObjective.set(String(o._id), (o.skillIds ?? []).map(String));
  const out = new Set<string>();
  for (const e of ev) for (const oid of e.objectiveIds ?? []) for (const s of byObjective.get(String(oid)) ?? []) out.add(s);
  return out;
}

/** Child-facing names (the academic name stays for teachers and reports). */
export const HABIT_NAMES: [RegExp, string][] = [
  [/critical/i, 'Sharp Thinker'],
  [/creativ/i, 'Idea Maker'],
  [/communicat/i, 'Clear Communicator'],
  [/collaborat/i, 'Team Builder'],
  [/problem/i, 'Problem Cracker'],
  [/digital|\bai\b/i, 'Tech & AI Smart'],
  [/curio|initiative/i, 'Curious Explorer'],
  [/self.?manage/i, 'Self Leader'],
];
export const habitNameFor = (name: string) => HABIT_NAMES.find(([re]) => re.test(name))?.[1] ?? name;

export const STAGE_TEXT: Record<Stage, string> = {
  seed: 'The habit is just starting to show',
  sprout: 'Uses it with help and reminders',
  sapling: 'Uses it on their own, reliably',
  bloom: 'Uses it confidently, by choice, in new situations',
  fruit: 'Creates something original with it, or helps others grow it',
};

/** Idempotent: give the Genius Habits their child-facing names and five stage descriptions. */
export async function migrateHabits() {
  const skills = await Skill.find({ framework: { $nin: ['psychometric', 'cognitive'] } });
  for (const s of skills) {
    let changed = false;
    if (!s.get('habit')) {
      s.set('habit', habitNameFor(s.name));
      changed = true;
    }
    const old = (s.get('levels') ?? {}) as Record<string, string | undefined>;
    if (!old.fruit) {
      s.set('levels', {
        seed: old.seed ?? old.emerging ?? STAGE_TEXT.seed,
        sprout: old.sprout ?? old.developing ?? STAGE_TEXT.sprout,
        sapling: old.sapling ?? old.proficient ?? STAGE_TEXT.sapling,
        bloom: old.bloom ?? old.advanced ?? STAGE_TEXT.bloom,
        fruit: old.fruit ?? STAGE_TEXT.fruit,
      });
      changed = true;
    }
    if (changed) await s.save();
  }
}
