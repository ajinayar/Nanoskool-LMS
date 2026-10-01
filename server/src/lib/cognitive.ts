/**
 * Part 3 · Cognitive profile ("Thinking Puzzles" for children): how a child thinks, measured with short puzzles
 * that have one right answer — never with self-ratings. Separate from the Genius Habits (what a child habitually
 * does) and from the Know Yourself profile (personality, physical, values).
 *
 * Six thinking areas, each a Skill with framework 'cognitive':
 *   attention · pattern · logic · verbal · number · memory
 * Working-memory puzzles show something first and then hide it (stimulus + stimulusSec); attention puzzles have
 * a time limit (timeSec). Results are a strengths shape across areas — never one overall score, an IQ, a rank or
 * a label — and stay provisional until enough children of the same grade have taken them (percentile norms).
 * Original starter puzzles: they must be piloted before results are used beyond guiding support.
 */
import { AssessmentAttempt, AssessmentForm, AssessmentItem, ClassSection, PsyNorm, Skill, User } from '../models/index.js';
import { withLock } from './startupLock.js';
import { SELF_BANK, STAGE_GRADES, type Stage } from './psyBank.js';
import { NORM_MIN, bandForPercentile, percentileFrom, psyBand, stageFor } from './psychometric.js';

export interface CogArea {
  key: string;
  name: string; // for teachers and reports
  child: string; // what children see
  icon: string;
  color: string;
  description: string;
  /** The Know Yourself puzzle dimension it takes its starter puzzles from */
  from?: string;
}

export const COG_AREAS: CogArea[] = [
  { key: 'cog.attention', name: 'Attention & speed', child: 'Sharp Eyes', icon: '👀', color: '#0284C7', description: 'Notices small details and differences quickly and accurately.', from: 'observe' },
  { key: 'cog.pattern', name: 'Pattern & visual reasoning', child: 'Pattern Power', icon: '🧩', color: '#2563EB', description: 'Finds the rule in shapes, pictures, numbers and sequences.', from: 'pattern' },
  { key: 'cog.logic', name: 'Logical reasoning', child: 'Clever Clues', icon: '🕵️', color: '#4F46E5', description: 'Reasons step by step from clues to a sound conclusion.', from: 'logic' },
  { key: 'cog.verbal', name: 'Verbal reasoning', child: 'Word Wizard', icon: '📚', color: '#7C3AED', description: 'Understands word meanings and links between words and ideas.' },
  { key: 'cog.number', name: 'Number sense', child: 'Number Ninja', icon: '🔢', color: '#0D9488', description: 'Works with quantities, simple data and number relationships.', from: 'analyse' },
  { key: 'cog.memory', name: 'Working memory', child: 'Memory Magic', icon: '🧠', color: '#DB2777', description: 'Holds information in mind for a short time and uses it.' },
];

type Puzzle = { area: string; text: string; options: string[]; answer: number; stimulus?: string; stimulusSec?: number; timeSec?: number };
const P = (area: string, text: string, options: string[], answer: number, extra: Partial<Puzzle> = {}): Puzzle => ({ area, text, options, answer, ...extra });
const M = (stimulus: string, stimulusSec: number, text: string, options: string[], answer: number): Puzzle => ({ area: 'cog.memory', text, options, answer, stimulus, stimulusSec });

/** New puzzles for the two areas that had none, plus timed attention puzzles. */
export const COG_BANK: Record<Stage, Puzzle[]> = {
  little: [
    P('cog.verbal', 'Which one is an animal?', ['🐘 Elephant', '🚗 Car', '🍎 Apple'], 0),
    P('cog.verbal', 'Hot is to cold as up is to …', ['Down', 'High', 'Sky'], 0),
    P('cog.verbal', 'Which word goes with “shoe”?', ['Sock', 'Spoon', 'Tree'], 0),
    M('🐶 🍎 ⭐', 5, 'Which one was in the middle?', ['🐶', '🍎', '⭐', '🚗'], 1),
    M('3   8   5', 5, 'Which number was first?', ['8', '5', '3', '1'], 2),
    M('🔴 🟢 🔵 🟡', 6, 'Which colour was NOT there?', ['🔴', '🟣', '🔵', '🟢'], 1),
    P('cog.attention', 'Find the odd one fast! 🐟 🐟 🐟 🐟 🐠 🐟', ['The 2nd', 'The 4th', 'The 5th', 'The 6th'], 2, { timeSec: 25 }),
  ],
  junior: [
    P('cog.verbal', 'Which word means almost the same as “huge”?', ['Tiny', 'Enormous', 'Quick', 'Soft'], 1),
    P('cog.verbal', 'Bird is to nest as bee is to …', ['Flower', 'Honey', 'Hive', 'Garden'], 2),
    P('cog.verbal', 'Which word does NOT belong? Mango · Banana · Carrot · Grape', ['Mango', 'Banana', 'Carrot', 'Grape'], 2),
    P('cog.verbal', 'Which is the opposite of “ancient”?', ['Old', 'Modern', 'Broken', 'Large'], 1),
    M('7   2   9   4', 5, 'Which number came just after 2?', ['7', '9', '4', '2'], 1),
    M('cat · lamp · river · moon · chair', 7, 'Which word was NOT in the list?', ['lamp', 'river', 'table', 'moon'], 2),
    M('▲ ● ■ ▲ ●', 6, 'How many triangles (▲) were there?', ['1', '2', '3', '4'], 1),
    M('5   1   8   3', 6, 'What were the numbers in reverse order?', ['3 8 1 5', '5 1 8 3', '3 1 8 5', '8 3 1 5'], 0),
    P('cog.attention', 'Quick! How many 7s? 1 7 3 7 9 7 2 4 7', ['3', '4', '5', '2'], 1, { timeSec: 20 }),
  ],
  senior: [
    P('cog.verbal', 'Which word is closest in meaning to “meticulous”?', ['Careless', 'Very careful', 'Quick', 'Loud'], 1),
    P('cog.verbal', 'Author is to novel as composer is to …', ['Orchestra', 'Symphony', 'Piano', 'Audience'], 1),
    P('cog.verbal', 'Which word does NOT belong? Observe · Notice · Ignore · Perceive', ['Observe', 'Notice', 'Ignore', 'Perceive'], 2),
    P('cog.verbal', '“Every cloud has a silver lining” means …', ['Clouds are made of silver', 'Something good can come from a bad situation', 'It will rain soon', 'Bad things never end'], 1),
    M('8   3   6   1   9', 5, 'What is the sum of the first and last numbers?', ['17', '9', '15', '12'], 0),
    M('K 4 P 7 R 2', 6, 'Which letter came right after 4?', ['K', 'P', 'R', '7'], 1),
    M('river · tiger · purple · seven · spoon · cloud', 7, 'Which two words were next to each other?', ['tiger · seven', 'purple · seven', 'river · spoon', 'cloud · tiger'], 1),
    M('6   2   9   4', 6, 'Put them in order from smallest to largest. Which comes third?', ['4', '6', '9', '2'], 1),
    P('cog.attention', 'Quick! Which code is different? QX7-B2 · QX7-B2 · QX7-82 · QX7-B2', ['1st', '2nd', '3rd', '4th'], 2, { timeSec: 20 }),
  ],
};

const FROM: Record<string, string> = Object.fromEntries(COG_AREAS.filter((a) => a.from).map((a) => [a.from!, a.key]));
const ATTENTION_SEC: Record<Stage, number> = { little: 30, junior: 25, senior: 25 };

/** All puzzles for one stage: the earlier Know Yourself puzzles (now here) plus the new ones. */
export function puzzlesFor(stage: Stage): (Puzzle & { seed: string })[] {
  const moved = SELF_BANK[stage].flatMap((it, n) =>
    it.k === 'quiz' && FROM[it.dim] ? [{ ...P(FROM[it.dim], it.text, it.options, it.answer, FROM[it.dim] === 'cog.attention' ? { timeSec: ATTENTION_SEC[stage] } : {}), seed: `cog.${stage}.k${n}` }] : [],
  );
  const extra = COG_BANK[stage].map((p, n) => ({ ...p, seed: `cog.${stage}.n${n}` }));
  // Mix areas so children don't meet six memory puzzles in a row
  const all = [...moved, ...extra];
  const byArea = COG_AREAS.map((a) => all.filter((p) => p.area === a.key));
  const out: typeof all = [];
  for (let i = 0; byArea.some((l) => l[i]); i++) for (const l of byArea) if (l[i]) out.push(l[i]);
  return out;
}

export const COG_INTRO: Record<Stage, string> = {
  little: 'Thinking Puzzles! Look, think and pick an answer. Some puzzles hide a picture after a few seconds — remember it! It is fine to get some wrong. 🧩',
  junior: 'Thinking Puzzles: short puzzles about noticing, patterns, clues, words, numbers and memory. Some are timed and some hide what you saw. Do your best — this is not a test for marks.',
  senior: 'Thinking Puzzles: short reasoning, verbal, number and memory puzzles. Some are timed. Results show your thinking strengths — never a mark, rank or IQ.',
};

/* ------------------------------------------------------------------ Seeding (idempotent, once at a time) */

async function syncForm(grade: number, title: string, intro: string, itemIds: unknown[]) {
  const cur = await AssessmentForm.findOne({ framework: 'cognitive', grade, status: 'published', informant: { $ne: 'parent' } });
  const same = cur && cur.itemIds.map(String).sort().join() === itemIds.map(String).sort().join();
  if (same) return;
  if (cur && !/^Thinking Puzzles/.test(cur.title)) return; // an admin made their own; leave it alone
  if (cur && (await AssessmentAttempt.exists({ formId: cur._id }))) {
    cur.status = 'retired';
    await cur.save();
    await AssessmentForm.create({ title, framework: 'cognitive', informant: 'self', grade, intro, itemIds, status: 'published', version: (cur.version ?? 1) + 1 });
  } else if (cur) {
    cur.set({ itemIds, intro, title });
    await cur.save();
  } else await AssessmentForm.create({ title, framework: 'cognitive', informant: 'self', grade, intro, itemIds, status: 'published' });
}

export async function seedCognitive() {
  return withLock('cognitive-seed', async () => {
    const ids = new Map<string, unknown>();
    for (const [i, a] of COG_AREAS.entries()) {
      const s =
        (await Skill.findOne({ key: a.key })) ??
        (await Skill.create({ name: a.name, habit: a.child, key: a.key, framework: 'cognitive', domain: 'cognitive', assessedBy: 'quest', description: a.description, color: a.color, position: 200 + i, minGrade: 1, maxGrade: 12 }));
      ids.set(a.key, s._id);
    }
    for (const stage of Object.keys(STAGE_GRADES) as Stage[]) {
      const itemIds: unknown[] = [];
      for (const p of puzzlesFor(stage)) {
        const doc = {
          framework: 'cognitive',
          informant: 'self',
          type: 'single',
          prompt: p.text,
          options: p.options.map((text, k) => ({ text, score: k === p.answer ? 1 : 0 })),
          skills: [{ skillId: ids.get(p.area), weight: 1 }],
          grades: STAGE_GRADES[stage],
          status: 'published',
          ...(p.stimulus ? { stimulus: p.stimulus, stimulusSec: p.stimulusSec ?? 5 } : {}),
          ...(p.timeSec ? { timeSec: p.timeSec } : {}),
        };
        const existing = await AssessmentItem.findOne({ seedKey: p.seed }).select('_id').lean();
        itemIds.push(existing?._id ?? (await AssessmentItem.create({ ...doc, seedKey: p.seed }))._id);
      }
      for (const grade of STAGE_GRADES[stage]) await syncForm(grade, `Thinking Puzzles — Grade ${grade}`, COG_INTRO[stage], itemIds);
    }
  });
}

/* ------------------------------------------------------------------ The profile */

export const COG_MIN = 2; // puzzles answered in an area before it is reported

export async function cognitiveProfile(studentId: unknown) {
  const student = await User.findById(studentId).select('classId consent').lean();
  const cls = student?.classId ? await ClassSection.findById(student.classId).select('grade').lean() : null;
  const grade = cls?.grade ?? null;
  const [areas, attempts, norms] = await Promise.all([
    Skill.find({ framework: 'cognitive', active: true }).sort({ position: 1 }).lean(),
    AssessmentAttempt.find({ studentId, framework: 'cognitive', status: { $ne: 'in_progress' } })
      .sort({ submittedAt: 1 })
      .select('skillScores submittedAt answers')
      .lean(),
    grade ? PsyNorm.find({ grade }).lean() : Promise.resolve([]),
  ]);
  const latest = attempts.at(-1);
  const previous = attempts.length > 1 ? attempts.at(-2) : null;
  const normBy = new Map(norms.map((n) => [String(n.skillId), n]));
  const pick = (a: typeof latest | null | undefined, id: unknown) => {
    const s = a?.skillScores?.find((x) => String(x.skillId) === String(id));
    return s && s.score != null && (s.answered ?? 0) >= COG_MIN ? { score: s.score, answered: s.answered ?? 0 } : null;
  };
  const info = new Map(COG_AREAS.map((a) => [a.key, a]));
  const list = areas.map((a) => {
    const cur = pick(latest, a._id);
    const norm = normBy.get(String(a._id));
    const normed = !!norm && (norm.n ?? 0) >= NORM_MIN;
    const percentile = cur && normed ? percentileFrom(norm!.points, cur.score) : null;
    const meta = a.key ? info.get(a.key) : undefined;
    return {
      _id: a._id,
      key: a.key,
      name: a.name,
      child: a.habit || meta?.child || a.name,
      icon: meta?.icon ?? '🧩',
      color: a.color,
      description: a.description,
      score: cur?.score ?? null,
      answered: cur?.answered ?? 0,
      previous: pick(previous, a._id)?.score ?? null,
      percentile,
      normed,
      band: normed ? bandForPercentile(percentile) : psyBand(cur?.score),
    };
  });
  const scored = list.filter((x) => x.score != null).sort((a, b) => b.score! - a.score!);
  // Strengths relative to the child themself — never compared with classmates here
  const strengths = scored.length >= 3 ? scored.slice(0, 2).map((x) => x.key) : [];
  const growing =
    scored.length >= 3
      ? scored
          .slice(-1)
          .filter((x) => x.score! < scored[0].score! - 10)
          .map((x) => x.key)
      : [];
  return {
    grade,
    stage: stageFor(grade),
    consent: !!student?.consent?.cognitive,
    assessedAt: latest?.submittedAt ?? null,
    times: attempts.length,
    normed: list.some((x) => x.normed),
    areas: list,
    strengths,
    growing,
  };
}

/** A parent's right to erase the Thinking Puzzles results. */
export async function eraseCognitive(studentId: unknown) {
  const r = await AssessmentAttempt.deleteMany({ studentId, framework: 'cognitive' });
  return { attempts: r.deletedCount };
}
