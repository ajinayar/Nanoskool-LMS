/**
 * Psychometric profile ("Know Yourself"): separate from the 8 Genius Habits.
 * Three areas — personality · physical · spiritual (values, not religion) — (thinking moved to the cognitive profile)
 * each with dimensions stored as Skill documents with framework 'psychometric'.
 *
 * Built to follow the ITC Guidelines on Test Use and the AERA/APA/NCME Standards where a school can:
 *   · several sources: the child (self), a parent, teachers (two can rate), and objective PE fitness tests
 *   · a dimension is only reported from a source with enough answers (MIN_ITEMS)
 *   · answer-quality checks (too fast, same answer, contradictions, "too good to be true")
 *   · percentile norms per grade once enough children have taken it; fixed bands are marked provisional
 *   · a score range (standard error), not a single exact number
 * It is a screening profile to guide support, never a diagnosis or a label.
 */
import { AssessmentAttempt, AssessmentForm, AssessmentItem, ClassSection, FITNESS_TESTS, FitnessRecord, HabitObservation, PsyConversation, PsyNorm, Skill, User, type FitnessTest } from '../models/index.js';
import { withLock } from './startupLock.js';
import { INTRO, PARENT_BANK, PSY_DIMENSIONS, SCALES, SELF_BANK, STAGE_GRADES, type ItemSeed, type Stage } from './psyBank.js';

export { PSY_DIMENSIONS } from './psyBank.js';
/** Thinking (observation & analysis) moved to Part 3 · Cognitive profile — see lib/cognitive.ts. */
export const PSY_DOMAINS = ['personality', 'physical', 'spiritual'] as const;
export type PsyDomain = (typeof PSY_DOMAINS)[number] | 'cognitive';

export const PSY_BANDS = ['growing', 'developing', 'good', 'strength'] as const;
export type PsyBand = (typeof PSY_BANDS)[number];
/** Provisional bands on the 0–100 score, used until norms exist. */
export const psyBand = (score: number | null | undefined): PsyBand | null => (score == null ? null : score >= 80 ? 'strength' : score >= 60 ? 'good' : score >= 40 ? 'developing' : 'growing');
/** Norm-referenced bands on the percentile (about ±1 SD around the middle). */
export const bandForPercentile = (p: number | null | undefined): PsyBand | null => (p == null ? null : p >= 85 ? 'strength' : p >= 50 ? 'good' : p >= 16 ? 'developing' : 'growing');

export const MIN_ITEMS = { self: 3, parent: 2 } as const; // fewer answers than this → not reported from that source
export const NORM_MIN = 30; // children needed in a grade before percentiles replace the provisional bands
const DEFAULT_SD = 18;
const DEFAULT_ALPHA = 0.7;
export const stageFor = (grade?: number | null): Stage => (!grade || grade <= 3 ? 'little' : grade <= 7 ? 'junior' : 'senior');

/** Indian school terms: Apr–Jul = T1, Aug–Nov = T2, Dec–Mar = T3 (of the session that began in April). */
export function termFor(d = new Date()) {
  const m = d.getMonth() + 1;
  const y = m >= 4 ? d.getFullYear() : d.getFullYear() - 1;
  const t = m >= 4 && m <= 7 ? 1 : m >= 8 && m <= 11 ? 2 : 3;
  return `${y}-T${t}`;
}
/** Teacher observation: 1 Rarely · 2 Sometimes · 3 Usually · 4 Always → score. */
export const OBS_SCORE: Record<number, number> = { 1: 20, 2: 50, 3: 72, 4: 92 };

/** How much each source counts. Young children report less reliably, so adults count more for Grades 1–3. */
export function sourceWeights(grade?: number | null) {
  return stageFor(grade) === 'little' ? { self: 0.2, parent: 0.3, teacher: 0.3, fitness: 0.3 } : { self: 0.4, parent: 0.2, teacher: 0.3, fitness: 0.3 };
}

/* ------------------------------------------------------------------ Languages */

export const LANGS: Record<string, string> = { en: 'English', hi: 'हिन्दी', ml: 'മലയാളം', ta: 'தமிழ்', kn: 'ಕನ್ನಡ', te: 'తెలుగు', mr: 'मराठी', bn: 'বাংলা', gu: 'ગુજરાતી', pa: 'ਪੰਜਾਬੀ', or: 'ଓଡ଼ିଆ' };
type Localisable = {
  _id: unknown;
  type: string;
  prompt: string;
  mediaUrl?: string | null;
  options?: { text?: string | null }[] | null;
  scaleLabels?: string[] | null;
  stimulus?: string | null;
  stimulusSec?: number | null;
  timeSec?: number | null;
  translations?: { lang: string; prompt?: string | null; options?: string[] | null; scaleLabels?: string[] | null; status?: string | null }[] | null;
};
/** Only translations approved after back-translation are shown to children. */
export function localise(i: Localisable, lang: string) {
  const t = lang === 'en' ? null : i.translations?.find((x) => x.lang === lang && x.status === 'approved');
  return {
    _id: i._id,
    type: i.type,
    prompt: t?.prompt || i.prompt,
    mediaUrl: i.mediaUrl,
    options: (i.options ?? []).map((o, k) => ({ text: t?.options?.[k] || o.text })),
    scaleLabels: (i.scaleLabels ?? []).map((l, k) => t?.scaleLabels?.[k] || l),
    ...(i.stimulus ? { stimulus: i.stimulus, stimulusSec: i.stimulusSec ?? 5 } : {}),
    ...(i.timeSec ? { timeSec: i.timeSec } : {}),
  };
}
/** Languages in which every item of a form has an approved translation. */
export function availableLanguages(items: Localisable[]) {
  if (!items.length) return [];
  const langs = Object.keys(LANGS).filter((l) => l !== 'en' && items.every((i) => i.translations?.some((t) => t.lang === l && t.status === 'approved')));
  return ['en', ...langs];
}

/* ------------------------------------------------------------------ Answer-quality checks */

type FlagItem = { _id: unknown; type: string; scaleLabels?: string[] | null; reverse?: boolean | null; validity?: string | null; pairKey?: string | null };
type FlagAnswer = { itemId?: unknown; value?: number | null; selected?: number[] | null };
export const FLAG_TEXT: Record<string, string> = {
  too_fast: 'Answered very quickly',
  same_answer: 'Same answer for almost every statement',
  inconsistent: 'Some answers contradict each other',
  desirability: 'Chose “perfect” answers to “too good to be true” statements',
};
export function validityFlags(items: FlagItem[], answers: FlagAnswer[], startedAt?: Date | null, submittedAt?: Date | null, grade?: number | null) {
  const flags: string[] = [];
  const byId = new Map(items.map((i) => [String(i._id), i]));
  const answered = answers.filter((a) => a.value != null || a.selected?.length);
  if (startedAt && submittedAt && answered.length >= 8) {
    const perItem = (submittedAt.getTime() - startedAt.getTime()) / 1000 / answered.length;
    if (perItem < (stageFor(grade) === 'little' ? 3 : 2)) flags.push('too_fast');
  }
  const scale = answers.filter((a) => a.value != null && byId.get(String(a.itemId))?.type === 'scale' && !byId.get(String(a.itemId))?.validity);
  if (scale.length >= 8) {
    const counts = new Map<number, number>();
    for (const a of scale) counts.set(a.value!, (counts.get(a.value!) ?? 0) + 1);
    if (Math.max(...counts.values()) / scale.length >= 0.9) flags.push('same_answer');
  }
  // A statement and its reverse both strongly agreed with
  const pairs = new Map<string, { item: FlagItem; value: number }[]>();
  for (const a of scale) {
    const it = byId.get(String(a.itemId))!;
    if (it.pairKey) pairs.set(it.pairKey, [...(pairs.get(it.pairKey) ?? []), { item: it, value: a.value! }]);
  }
  let bad = 0;
  let total = 0;
  for (const list of pairs.values()) {
    const pos = list.find((x) => !x.item.reverse);
    const neg = list.find((x) => x.item.reverse);
    if (!pos || !neg) continue;
    total++;
    const top = (x: { item: FlagItem; value: number }) => x.value >= (x.item.scaleLabels?.length ?? 5) - (x.item.scaleLabels?.length === 3 ? 0 : 1);
    if (top(pos) && top(neg)) bad++;
  }
  if (total && bad >= Math.max(1, Math.ceil(total / 3))) flags.push('inconsistent');
  const lies = answers.filter((a) => a.value != null && byId.get(String(a.itemId))?.validity === 'desirability');
  const maxed = lies.filter((a) => a.value === (byId.get(String(a.itemId))?.scaleLabels?.length ?? 5)).length;
  if (lies.length >= 2 && maxed >= 2) flags.push('desirability');
  return flags;
}

/* ------------------------------------------------------------------ Fitness tests (objective) */

/** Percentile (0–100) of each fitness result among children of the same grade (and gender, when there are enough) this term. */
async function fitnessScores(studentId: unknown) {
  const mine = await FitnessRecord.find({ studentId }).sort({ term: -1 }).lean();
  if (!mine.length) return { byDim: new Map<string, number>(), tests: [] as { test: FitnessTest; label: string; value: number; unit: string; percentile: number | null; term: string }[] };
  const term = mine[0].term;
  const latest = mine.filter((r) => r.term === term);
  const tests = [];
  const dimAcc = new Map<string, number[]>();
  for (const r of latest) {
    const def = FITNESS_TESTS[r.test as FitnessTest];
    const peers = await FitnessRecord.find({ test: r.test, term, grade: r.grade }).select('value gender').lean();
    const sameGender = peers.filter((p) => p.gender && p.gender === r.gender);
    const pool = sameGender.length >= 10 ? sameGender : peers;
    let percentile: number | null = null;
    if (pool.length >= 5) {
      const better = def.better === 'lower' ? pool.filter((p) => p.value > r.value).length : pool.filter((p) => p.value < r.value).length;
      const same = pool.filter((p) => p.value === r.value).length;
      percentile = Math.round(((better + same / 2) / pool.length) * 100);
      dimAcc.set(def.skill, [...(dimAcc.get(def.skill) ?? []), percentile]);
    }
    tests.push({ test: r.test as FitnessTest, label: def.label, value: r.value, unit: def.unit, percentile, term });
  }
  const byDim = new Map([...dimAcc].map(([k, v]) => [k, Math.round(v.reduce((a, b) => a + b, 0) / v.length)]));
  return { byDim, tests };
}

/* ------------------------------------------------------------------ The profile */

export const percentileFrom = (points: number[] | null | undefined, score: number) => {
  if (!points?.length) return null;
  // points = score at percentiles 0, 5, 10 … 100
  let i = 0;
  while (i < points.length - 1 && points[i + 1] <= score) i++;
  if (i >= points.length - 1) return 99;
  const lo = points[i];
  const hi = points[i + 1];
  const frac = hi > lo ? (score - lo) / (hi - lo) : 0.5;
  return Math.max(1, Math.min(99, Math.round((i + Math.max(0, Math.min(1, frac))) * 5)));
};

export async function psychometricProfile(studentId: unknown, opts: { staff?: boolean } = {}) {
  const student = await User.findById(studentId).select('classId consent').lean();
  const cls = student?.classId ? await ClassSection.findById(student.classId).select('grade').lean() : null;
  const grade = cls?.grade ?? null;
  const w = sourceWeights(grade);
  const [dims, selfAttempts, parentAttempt, obs, fitness, norms] = await Promise.all([
    Skill.find({ framework: 'psychometric', active: true }).sort({ position: 1 }).lean(),
    AssessmentAttempt.find({ studentId, framework: 'psychometric', informant: { $ne: 'parent' }, status: { $ne: 'in_progress' } })
      .sort({ submittedAt: 1 })
      .select('skillScores submittedAt flags lang')
      .lean(),
    AssessmentAttempt.findOne({ studentId, framework: 'psychometric', informant: 'parent', status: { $ne: 'in_progress' } })
      .sort({ submittedAt: -1 })
      .select('skillScores submittedAt')
      .lean(),
    HabitObservation.find({ studentId }).sort({ term: 1, updatedAt: 1 }).lean(),
    fitnessScores(studentId),
    grade ? PsyNorm.find({ grade }).lean() : Promise.resolve([]),
  ]);
  const first = selfAttempts[0];
  const latest = selfAttempts.at(-1);
  const pick = (a: { skillScores?: { skillId?: unknown; score?: number | null; answered?: number | null }[] } | null | undefined, id: unknown, min: number) => {
    const s = a?.skillScores?.find((x) => String(x.skillId) === String(id));
    if (!s || s.score == null) return null;
    return (s.answered ?? min) >= min ? s.score : null; // not enough answers → not reported
  };
  const lastTerm = obs.at(-1)?.term;
  const obsBy = new Map<string, number[]>();
  for (const o of obs.filter((x) => x.term === lastTerm)) obsBy.set(String(o.skillId), [...(obsBy.get(String(o.skillId)) ?? []), o.level]);
  const normBy = new Map(norms.map((n) => [String(n.skillId), n]));

  const dimensions = dims.map((d) => {
    const self = pick(latest, d._id, MIN_ITEMS.self);
    const parent = pick(parentAttempt, d._id, MIN_ITEMS.parent);
    const levels = obsBy.get(String(d._id)) ?? [];
    const teacherLevel = levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : null;
    const teacher = teacherLevel == null ? null : Math.round(OBS_SCORE[Math.floor(teacherLevel)] + (OBS_SCORE[Math.ceil(teacherLevel)] - OBS_SCORE[Math.floor(teacherLevel)]) * (teacherLevel % 1));
    const fit = d.key ? (fitness.byDim.get(d.key) ?? null) : null;
    const parts = [
      [self, w.self],
      [parent, w.parent],
      [teacher, w.teacher],
      [fit, w.fitness],
    ].filter(([v]) => v != null) as [number, number][];
    const wsum = parts.reduce((n, [, x]) => n + x, 0);
    const score = parts.length ? Math.round(parts.reduce((n, [v, x]) => n + v * x, 0) / wsum) : null;
    const norm = normBy.get(String(d._id));
    const normed = !!norm && (norm.n ?? 0) >= NORM_MIN;
    const percentile = score != null && normed ? percentileFrom(norm!.points, score) : null;
    const sd = normed && norm!.sd ? norm!.sd : DEFAULT_SD;
    const alpha = normed && norm!.alpha != null ? norm!.alpha : DEFAULT_ALPHA;
    // Standard error of measurement, shrinking as more sources agree
    const sem = Math.round((sd * Math.sqrt(Math.max(0.05, 1 - alpha))) / Math.sqrt(Math.max(1, parts.length)));
    return {
      _id: d._id,
      key: d.key,
      name: d.name,
      domain: (d.domain ?? 'personality') as PsyDomain,
      color: d.color,
      description: d.description,
      assessedBy: d.assessedBy,
      sources: { self, parent, teacher, fitness: fit, raters: levels.length },
      quest: self,
      firstQuest: pick(first, d._id, MIN_ITEMS.self),
      observedLevel: teacherLevel == null ? null : Math.round(teacherLevel),
      score,
      range: score == null ? null : [Math.max(0, score - sem), Math.min(100, score + sem)],
      percentile,
      normed,
      band: normed ? bandForPercentile(percentile) : psyBand(score),
    };
  });
  const flags = latest?.flags ?? [];
  // Staff only: areas low from two or more sources are worth a gentle conversation (never a diagnosis)
  const attention = opts.staff ? dimensions.filter((d) => [d.sources.self, d.sources.parent, d.sources.teacher, d.sources.fitness].filter((v) => v != null && v < 40).length >= 2).map((d) => d.name) : undefined;
  return {
    grade,
    consent: !!student?.consent?.psychometric,
    assessedAt: latest?.submittedAt ?? null,
    parentAt: parentAttempt?.submittedAt ?? null,
    observedAt: obs.at(-1)?.updatedAt ?? null,
    flags,
    flagText: flags.map((f) => FLAG_TEXT[f] ?? f),
    weights: w,
    normed: dimensions.some((d) => d.normed),
    fitnessTests: fitness.tests,
    attention,
    domains: PSY_DOMAINS.map((id) => {
      const list = dimensions.filter((d) => d.domain === id);
      const scored = list.filter((d) => d.score != null);
      const avg = scored.length ? Math.round(scored.reduce((n, d) => n + d.score!, 0) / scored.length) : null;
      const pct = scored.filter((d) => d.percentile != null);
      const avgPct = pct.length === scored.length && pct.length ? Math.round(pct.reduce((n, d) => n + d.percentile!, 0) / pct.length) : null;
      return { id, score: avg, band: avgPct != null ? bandForPercentile(avgPct) : psyBand(avg), dimensions: list };
    }),
  };
}

/* ------------------------------------------------------------------ Starter catalogue (idempotent) */

async function upsertItem(seedKey: string, doc: Record<string, unknown>) {
  const existing = (await AssessmentItem.findOne({ seedKey })) ?? (await AssessmentItem.findOne({ framework: 'psychometric', seedKey: { $exists: false }, prompt: doc.prompt, grades: (doc.grades as number[])[0] }));
  if (existing) {
    if (!existing.get('seedKey')) {
      existing.set({ seedKey, informant: doc.informant, pairKey: doc.pairKey, validity: doc.validity });
      await existing.save();
    }
    return existing._id;
  }
  return (await AssessmentItem.create({ ...doc, seedKey }))._id;
}

function itemDoc(it: ItemSeed, ids: Map<string, unknown>, grades: number[], labels: string[], informant: 'self' | 'parent') {
  const base = { framework: 'psychometric', informant, grades, status: 'published' };
  if (it.k === 'lie') return { ...base, type: 'scale', prompt: it.text, scaleLabels: labels, validity: 'desirability', skills: [] };
  const skills = [{ skillId: ids.get(it.dim), weight: 1 }];
  if (it.k === 'me') return { ...base, type: 'scale', prompt: it.text, scaleLabels: labels, reverse: !!it.reverse, pairKey: it.pair, skills };
  if (it.k === 'sit') return { ...base, type: 'single', prompt: it.text, options: it.options.map(([text, score]) => ({ text, score })), skills };
  return { ...base, type: 'single', prompt: it.text, options: it.options.map((text, i) => ({ text, score: i === it.answer ? 1 : 0 })), skills };
}

/** Keeps each seeded form in step with the starter item set; a form children have taken gets a new version. */
async function syncForm(grade: number, informant: 'self' | 'parent', title: string, intro: string, itemIds: unknown[]) {
  const q = { framework: 'psychometric', grade, status: 'published', ...(informant === 'parent' ? { informant: 'parent' } : { informant: { $ne: 'parent' } }) };
  const cur = await AssessmentForm.findOne(q);
  const same = cur && cur.itemIds.map(String).sort().join() === itemIds.map(String).sort().join();
  if (same) return;
  if (cur && !/^Know Yourself/.test(cur.title)) return; // an admin made their own; leave it alone
  if (cur) {
    if (await AssessmentAttempt.exists({ formId: cur._id })) {
      cur.status = 'retired';
      await cur.save();
      await AssessmentForm.create({ title, framework: 'psychometric', informant, grade, intro, itemIds, status: 'published', version: (cur.version ?? 1) + 1 });
    } else {
      cur.set({ itemIds, intro, title });
      await cur.save();
    }
    return;
  }
  await AssessmentForm.create({ title, framework: 'psychometric', informant, grade, intro, itemIds, status: 'published' });
}

/**
 * Removes duplicates left by start-up running twice at the same time (before the lock existed):
 * keeps the oldest copy of each dimension, item and form, and moves every reference onto it.
 */
export async function dedupePsychometric() {
  const out = { dimensions: 0, items: 0, forms: 0 };
  // Dimensions: same name
  const dims = await Skill.find({ framework: 'psychometric' }).sort({ createdAt: 1, _id: 1 }).lean();
  const keepDim = new Map<string, string>();
  const dimMap = new Map<string, string>(); // duplicate id → kept id
  for (const d of dims) {
    const k = d.name.trim().toLowerCase(); // same name = same dimension (starter copies all share a name)
    const kept = keepDim.get(k);
    if (kept) dimMap.set(String(d._id), kept);
    else keepDim.set(k, String(d._id));
  }
  if (dimMap.size) {
    const dupIds = [...dimMap.keys()];
    for (const it of await AssessmentItem.find({ 'skills.skillId': { $in: dupIds } })) {
      const seen = new Set<string>();
      it.set(
        'skills',
        it.skills.map((s) => ({ skillId: dimMap.get(String(s.skillId)) ?? String(s.skillId), weight: s.weight })).filter((s) => (seen.has(s.skillId) ? false : (seen.add(s.skillId), true))),
      );
      await it.save();
    }
    for (const o of await HabitObservation.find({ skillId: { $in: dupIds } })) {
      const to = dimMap.get(String(o.skillId))!;
      const clash = await HabitObservation.exists({ studentId: o.studentId, skillId: to, term: o.term, by: o.by });
      if (clash) await o.deleteOne();
      else await HabitObservation.updateOne({ _id: o._id }, { skillId: to });
    }
    for (const a of await AssessmentAttempt.find({ 'skillScores.skillId': { $in: dupIds } })) {
      a.set(
        'skillScores',
        a.skillScores.map((s) => ({ ...((s as { toObject?: () => object }).toObject?.() ?? s), skillId: dimMap.get(String(s.skillId)) ?? s.skillId })),
      );
      await a.save();
    }
    await PsyNorm.deleteMany({ skillId: { $in: dupIds } });
    await Skill.deleteMany({ _id: { $in: dupIds } });
    out.dimensions = dupIds.length;
  }
  // Items: same seedKey
  const items = await AssessmentItem.find({ framework: 'psychometric', seedKey: { $exists: true } })
    .sort({ createdAt: 1, _id: 1 })
    .select('seedKey')
    .lean();
  const keepItem = new Map<string, string>();
  const itemMap = new Map<string, string>();
  for (const i of items) {
    const kept = keepItem.get(i.seedKey!);
    if (kept) itemMap.set(String(i._id), kept);
    else keepItem.set(i.seedKey!, String(i._id));
  }
  if (itemMap.size) {
    const dupIds = [...itemMap.keys()];
    for (const f of await AssessmentForm.find({ itemIds: { $in: dupIds } })) {
      const seen = new Set<string>();
      f.set(
        'itemIds',
        f.itemIds.map((x) => itemMap.get(String(x)) ?? String(x)).filter((x) => (seen.has(x) ? false : (seen.add(x), true))),
      );
      await f.save();
    }
    for (const a of await AssessmentAttempt.find({ 'answers.itemId': { $in: dupIds } })) {
      a.set(
        'answers',
        a.answers.map((x) => ({ ...((x as { toObject?: () => object }).toObject?.() ?? x), itemId: itemMap.get(String(x.itemId)) ?? x.itemId })),
      );
      await a.save();
    }
    await AssessmentItem.deleteMany({ _id: { $in: dupIds } });
    out.items = dupIds.length;
  }
  // Forms: one published form per grade and informant
  const forms = await AssessmentForm.find({ framework: 'psychometric', status: 'published' }).sort({ createdAt: 1, _id: 1 });
  const keepForm = new Set<string>();
  for (const f of forms) {
    const k = `${f.grade}:${f.informant === 'parent' ? 'parent' : 'self'}`;
    if (!keepForm.has(k)) {
      keepForm.add(k);
      continue;
    }
    if (await AssessmentAttempt.exists({ formId: f._id })) {
      f.status = 'retired';
      await f.save();
    } else await f.deleteOne();
    out.forms++;
  }
  await Skill.syncIndexes().catch(() => undefined);
  await AssessmentItem.syncIndexes().catch(() => undefined);
  return out;
}

/** Adds (or tops up) the psychometric catalogue, once at a time. Genius Habits are never touched. */
export async function seedPsychometric() {
  return withLock('psychometric-seed', async () => {
    await dedupePsychometric();
    await seedCatalogue();
  });
}

async function seedCatalogue() {
  const ids = new Map<string, unknown>();
  // Observation & analysis moved to Part 3 (cognitive profile): keep old results, stop using these dimensions here
  const moved = PSY_DIMENSIONS.filter((d) => d.domain === 'cognitive').map((d) => d.key);
  const movedIds = (
    await Skill.find({ framework: 'psychometric', key: { $in: moved } })
      .select('_id')
      .lean()
  ).map((d) => d._id);
  if (movedIds.length) {
    await Skill.updateMany({ _id: { $in: movedIds }, active: true }, { active: false });
    await AssessmentItem.updateMany({ framework: 'psychometric', 'skills.skillId': { $in: movedIds }, status: 'published' }, { status: 'draft' });
  }
  for (const [i, d] of PSY_DIMENSIONS.entries()) {
    if (d.domain === 'cognitive') continue;
    let s = (await Skill.findOne({ framework: 'psychometric', key: d.key })) ?? (await Skill.findOne({ framework: 'psychometric', name: d.name }));
    if (!s) s = await Skill.create({ name: d.name, key: d.key, framework: 'psychometric', domain: d.domain, assessedBy: d.assessedBy, description: d.description, color: d.color, position: 100 + i, minGrade: 1, maxGrade: 12 });
    const patch: Record<string, unknown> = {};
    if (!s.get('key')) patch.key = d.key;
    if (d.anchors && !s.get('anchors')?.['1']) patch.anchors = { 1: d.anchors[0], 2: d.anchors[1], 3: d.anchors[2], 4: d.anchors[3] };
    if (Object.keys(patch).length) {
      s.set(patch);
      await s.save();
    }
    ids.set(d.key, s._id);
  }
  for (const stage of Object.keys(SELF_BANK) as Stage[]) {
    const labels = stage === 'little' ? SCALES.little : SCALES.five;
    const itemIds: unknown[] = [];
    for (const [n, it] of SELF_BANK[stage].entries()) {
      if (it.k === 'quiz') continue; // puzzles now belong to Part 3 · Thinking Puzzles (cognitive profile)
      itemIds.push(await upsertItem(`self.${stage}.${it.k === 'lie' ? 'validity' : it.dim}.${n}`, itemDoc(it, ids, STAGE_GRADES[stage], labels, 'self')));
    }
    for (const grade of STAGE_GRADES[stage]) await syncForm(grade, 'self', `Know Yourself — Grade ${grade}`, INTRO[stage], itemIds);
  }
  const parentIds: unknown[] = [];
  const all = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  for (const [n, it] of PARENT_BANK.entries()) parentIds.push(await upsertItem(`parent.${it.k === 'lie' ? 'validity' : it.dim}.${n}`, itemDoc(it, ids, all, SCALES.five, 'parent')));
  for (const grade of all) await syncForm(grade, 'parent', `Know Yourself — parent questionnaire, Grade ${grade}`, INTRO.parent, parentIds);
  // Observation ratings are now one per teacher: drop the old one-per-student index if it is still there
  await HabitObservation.collection.dropIndex('studentId_1_skillId_1_term_1').catch(() => undefined);
  await HabitObservation.syncIndexes().catch(() => undefined);
}

/* ------------------------------------------------------------------ Privacy */

/** Everything psychometric about one child (parent's right to erase). Genius Habits and schoolwork are kept. */
export async function erasePsychometric(studentId: unknown) {
  const r = await Promise.all([AssessmentAttempt.deleteMany({ studentId, framework: 'psychometric' }), HabitObservation.deleteMany({ studentId }), FitnessRecord.deleteMany({ studentId }), PsyConversation.deleteMany({ studentId })]);
  return { attempts: r[0].deletedCount, observations: r[1].deletedCount, fitness: r[2].deletedCount, conversations: r[3].deletedCount };
}

/** Deletes psychometric data older than the retention period (PSY_RETENTION_MONTHS, default 36). */
export async function purgeOldPsychometric(months = Number(process.env.PSY_RETENTION_MONTHS ?? 36)) {
  if (!months || months < 1) return;
  const before = new Date(Date.now() - months * 30.44 * 86400_000);
  await Promise.all([
    AssessmentAttempt.deleteMany({ framework: { $in: ['psychometric', 'cognitive'] }, createdAt: { $lt: before } }),
    HabitObservation.deleteMany({ createdAt: { $lt: before } }),
    FitnessRecord.deleteMany({ createdAt: { $lt: before } }),
    PsyConversation.deleteMany({ status: 'closed', updatedAt: { $lt: before } }),
  ]);
}
