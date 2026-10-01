/**
 * Quality evidence for the psychometric profile (AERA/APA/NCME Standards, ITC Guidelines):
 *   reliability (Cronbach's alpha) per dimension and form family, item statistics (mean, item–rest correlation),
 *   a simple fairness check (differential item functioning by gender and by language, matched on total score),
 *   answer-quality flag rates, teacher agreement, and percentile norms per grade.
 */
import { AssessmentAttempt, AssessmentForm, AssessmentItem, HabitObservation, PsyNorm, Skill, User } from '../models/index.js';
import { MIN_ITEMS } from './psychometric.js';

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const variance = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
};
function corr(a: number[], b: number[]) {
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : null;
}
/** Cronbach's alpha for a matrix of complete cases (rows = children, columns = items). */
export function cronbachAlpha(rows: number[][]) {
  const k = rows[0]?.length ?? 0;
  if (k < 2 || rows.length < 3) return null;
  const itemVar = Array.from({ length: k }, (_, j) => variance(rows.map((r) => r[j]))).reduce((a, b) => a + b, 0);
  const totalVar = variance(rows.map((r) => r.reduce((a, b) => a + b, 0)));
  if (!totalVar) return null;
  return Math.round((k / (k - 1)) * (1 - itemVar / totalVar) * 100) / 100;
}
const round = (x: number | null, d = 2) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d);
const gradesLabel = (g: number[]) => (g.length ? (g.length > 1 ? `Grades ${Math.min(...g)}–${Math.max(...g)}` : `Grade ${g[0]}`) : '');

export async function psychometricQuality() {
  const [dims, forms] = await Promise.all([Skill.find({ framework: 'psychometric' }).sort({ position: 1 }).lean(), AssessmentForm.find({ framework: 'psychometric', status: { $in: ['published', 'retired'] } }).lean()]);
  // Forms with the same questions form one family (e.g. Grades 1–3 share items)
  const families = new Map<string, { informant: string; grades: number[]; formIds: string[]; itemIds: string[] }>();
  for (const f of forms) {
    const key = `${f.informant ?? 'self'}:${f.itemIds.map(String).sort().join(',')}`;
    const fam = families.get(key) ?? { informant: f.informant ?? 'self', grades: [], formIds: [], itemIds: f.itemIds.map(String) };
    if (f.grade && !fam.grades.includes(f.grade)) fam.grades.push(f.grade);
    fam.formIds.push(String(f._id));
    families.set(key, fam);
  }
  const out = [];
  for (const fam of families.values()) {
    const [items, attempts] = await Promise.all([
      AssessmentItem.find({ _id: { $in: fam.itemIds } }).lean(),
      AssessmentAttempt.find({ formId: { $in: fam.formIds }, status: 'scored' })
        .select('studentId answers flags lang')
        .lean(),
    ]);
    const students = await User.find({ _id: { $in: attempts.map((a) => a.studentId) } })
      .select('gender')
      .lean();
    const gender = new Map(students.map((s) => [String(s._id), s.gender || '']));
    const score = (a: (typeof attempts)[number], id: unknown) => a.answers.find((x) => String(x.itemId) === String(id))?.score ?? null;
    const flagRate: Record<string, number> = {};
    for (const a of attempts) for (const f of a.flags ?? []) flagRate[f] = (flagRate[f] ?? 0) + 1;
    const dimsOut = [];
    for (const d of dims) {
      const its = items.filter((i) => i.skills.some((s) => String(s.skillId) === String(d._id)));
      if (!its.length) continue;
      const complete = attempts.filter((a) => its.every((i) => score(a, i._id) != null));
      const rows = complete.map((a) => its.map((i) => score(a, i._id)!));
      const alpha = cronbachAlpha(rows);
      const totals = rows.map((r) => r.reduce((x, y) => x + y, 0));
      const itemStats = its.map((it, j) => {
        const col = rows.map((r) => r[j]);
        const rest = rows.map((r, i) => totals[i] - r[j]);
        // Fairness: compare groups matched on the rest score (3 bands)
        const dif = (groupOf: (a: (typeof complete)[number]) => string, g1: string, g2: string) => {
          const n1 = complete.filter((a) => groupOf(a) === g1).length;
          const n2 = complete.filter((a) => groupOf(a) === g2).length;
          if (n1 < 20 || n2 < 20) return null;
          const sorted = [...rest].sort((a, b) => a - b);
          const cut = [sorted[Math.floor(sorted.length / 3)], sorted[Math.floor((2 * sorted.length) / 3)]];
          let diff = 0;
          let wsum = 0;
          for (let band = 0; band < 3; band++) {
            const inBand = (i: number) => (band === 0 ? rest[i] <= cut[0] : band === 1 ? rest[i] > cut[0] && rest[i] <= cut[1] : rest[i] > cut[1]);
            const a = complete
              .map((c, i) => [c, i] as const)
              .filter(([c, i]) => inBand(i) && groupOf(c) === g1)
              .map(([, i]) => col[i]);
            const b = complete
              .map((c, i) => [c, i] as const)
              .filter(([c, i]) => inBand(i) && groupOf(c) === g2)
              .map(([, i]) => col[i]);
            if (!a.length || !b.length) continue;
            const wgt = Math.min(a.length, b.length);
            diff += (mean(a) - mean(b)) * wgt;
            wsum += wgt;
          }
          return wsum ? round(diff / wsum) : null;
        };
        const difGender = dif((a) => gender.get(String(a.studentId)) ?? '', 'female', 'male');
        const difLang = dif((a) => (a.lang && a.lang !== 'en' ? 'other' : 'en'), 'en', 'other');
        const itemRest = rows.length >= 5 && its.length >= 2 ? round(corr(col, rest)) : null;
        const problems = [];
        if (itemRest != null && itemRest < 0.2) problems.push('Does not fit the other items well');
        if (rows.length >= 20 && (mean(col) > 0.95 || mean(col) < 0.05)) problems.push(mean(col) > 0.95 ? 'Almost everyone gets full marks' : 'Almost no one gets credit');
        if (difGender != null && Math.abs(difGender) >= 0.15) problems.push(`Possible bias by gender (${difGender > 0 ? 'girls' : 'boys'} score higher at the same level)`);
        if (difLang != null && Math.abs(difLang) >= 0.15) problems.push('Possible bias by language');
        return { _id: it._id, prompt: it.prompt, reverse: it.reverse, n: col.length, mean: round(mean(col)), itemRest, difGender, difLang, problems };
      });
      dimsOut.push({
        _id: d._id,
        name: d.name,
        domain: d.domain,
        items: its.length,
        n: rows.length,
        alpha,
        status: rows.length < 30 ? 'pilot' : alpha == null ? 'pilot' : alpha >= 0.7 ? 'good' : alpha >= 0.6 ? 'fair' : 'weak',
        tooFewItems: its.length < (fam.informant === 'parent' ? MIN_ITEMS.parent : MIN_ITEMS.self),
        itemStats,
      });
    }
    out.push({
      informant: fam.informant,
      grades: fam.grades.sort((a, b) => a - b),
      label: `${fam.informant === 'parent' ? 'Parent form' : 'Child form'} · ${gradesLabel(fam.grades.sort((a, b) => a - b))}`,
      attempts: attempts.length,
      flagRate,
      dimensions: dimsOut,
    });
  }
  out.sort((a, b) => (a.informant === b.informant ? (a.grades[0] ?? 0) - (b.grades[0] ?? 0) : a.informant === 'self' ? -1 : 1));
  return { families: out, raters: await raterAgreement(), norms: await PsyNorm.find().select('skillId grade n mean sd alpha builtAt').lean() };
}

/** Agreement between two teachers rating the same child on the same dimension in the same term. */
export async function raterAgreement() {
  const all = await HabitObservation.find().select('studentId skillId term level').lean();
  const grouped = new Map<string, { k: unknown; levels: number[] }>();
  for (const o of all) {
    const key = `${o.studentId}:${o.skillId}:${o.term}`;
    const g = grouped.get(key) ?? { k: o.skillId, levels: [] };
    g.levels.push(o.level);
    grouped.set(key, g);
  }
  const rows = [...grouped.values()].filter((g) => g.levels.length >= 2).map((g) => ({ _id: { k: g.k }, levels: g.levels }));
  const dims = await Skill.find({ framework: 'psychometric' }).select('name').lean();
  const name = new Map(dims.map((d) => [String(d._id), d.name]));
  const by = new Map<string, { pairs: number; exact: number; within1: number }>();
  for (const r of rows) {
    const [a, b] = r.levels as number[];
    const k = String(r._id.k);
    const cur = by.get(k) ?? { pairs: 0, exact: 0, within1: 0 };
    cur.pairs++;
    if (a === b) cur.exact++;
    if (Math.abs(a - b) <= 1) cur.within1++;
    by.set(k, cur);
  }
  return [...by.entries()].map(([k, v]) => ({ skillId: k, name: name.get(k) ?? 'Dimension', pairs: v.pairs, exact: Math.round((v.exact / v.pairs) * 100), within1: Math.round((v.within1 / v.pairs) * 100) }));
}

/** Rebuilds percentile norms per grade and dimension (or thinking area) from each child's latest score. */
export async function rebuildNorms(framework: 'psychometric' | 'cognitive' = 'psychometric') {
  const forms = await AssessmentForm.find({ framework, informant: { $ne: 'parent' } })
    .select('grade')
    .lean();
  const gradeOf = new Map(forms.map((f) => [String(f._id), f.grade]));
  const attempts = await AssessmentAttempt.find({ framework, informant: { $ne: 'parent' }, status: 'scored' })
    .sort({ submittedAt: 1 })
    .select('studentId formId skillScores flags')
    .lean();
  const latest = new Map<string, (typeof attempts)[number]>();
  for (const a of attempts) if (!(a.flags ?? []).length) latest.set(String(a.studentId), a); // flagged answers are left out of norms
  const pools = new Map<string, number[]>();
  for (const a of latest.values()) {
    const g = gradeOf.get(String(a.formId));
    if (!g) continue;
    for (const s of a.skillScores ?? []) {
      if (s.score == null || (s.answered ?? MIN_ITEMS.self) < MIN_ITEMS.self) continue;
      const k = `${s.skillId}:${g}`;
      pools.set(k, [...(pools.get(k) ?? []), s.score]);
    }
  }
  const q = framework === 'psychometric' ? await psychometricQuality() : { families: [] as Awaited<ReturnType<typeof psychometricQuality>>['families'] };
  const alphaFor = (skillId: string, grade: number) => q.families.find((f) => f.informant === 'self' && f.grades.includes(grade))?.dimensions.find((d) => String(d._id) === skillId)?.alpha ?? null;
  let n = 0;
  for (const [k, xs] of pools) {
    const [skillId, g] = k.split(':');
    const sorted = [...xs].sort((a, b) => a - b);
    const points = Array.from({ length: 21 }, (_, i) => sorted[Math.min(sorted.length - 1, Math.round((i / 20) * (sorted.length - 1)))]);
    await PsyNorm.updateOne({ skillId, grade: Number(g) }, { n: xs.length, mean: Math.round(mean(xs) * 10) / 10, sd: Math.round(Math.sqrt(variance(xs)) * 10) / 10, alpha: alphaFor(skillId, Number(g)), points, builtAt: new Date() }, { upsert: true });
    n++;
  }
  return { tables: n, children: latest.size };
}
