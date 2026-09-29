/**
 * Learning outcomes: how much of each learning objective a student has achieved.
 *
 *   activity score   quiz = best attempt %, project/presentation/reflection = the teacher's verified
 *                    rubric score, tool = the verified result (optionally scored per objective)
 *   objective %      weighted average (activity weight) of the scored activities that check it
 *   unit %           weighted average (objective weight) of the objectives that have evidence
 *
 * An objective with no evidence yet has no score (null), never 0%.
 */
import { Types } from 'mongoose';
import { Evidence, QuizAttempt } from '../models/index.js';

export type Band = 'mastered' | 'achieved' | 'approaching' | 'not_yet';
export const bandFor = (pct: number | null): Band | null =>
  pct == null ? null : pct >= 90 ? 'mastered' : pct >= 70 ? 'achieved' : pct >= 40 ? 'approaching' : 'not_yet';

export interface UnitLike {
  _id: Types.ObjectId | string;
  courseId?: Types.ObjectId | string;
  objectives?: { _id?: Types.ObjectId | string; title: string; weight?: number }[];
  activities?: { _id?: Types.ObjectId | string; kind: string; title: string; quizId?: Types.ObjectId | string | null; objectiveIds?: (Types.ObjectId | string)[]; weight?: number; required?: boolean }[];
}

export interface ActivityState {
  activityId: string;
  status: 'not_started' | 'pending' | 'returned' | 'scored';
  score: number | null;
  evidenceId?: string;
}
export interface ObjectiveOutcome {
  objectiveId: string;
  title: string;
  score: number | null;
  band: Band | null;
}
export interface UnitOutcome {
  unitId: string;
  score: number | null;
  band: Band | null;
  objectives: ObjectiveOutcome[];
  activities: ActivityState[];
  missingRequired: number; // required activities with no evidence at all
}

const S = (v: unknown) => String(v);

/** Outcomes for many students × many units, with two queries in total. */
export async function computeOutcomes(units: UnitLike[], studentIds: string[]) {
  const unitIds = units.map((u) => u._id);
  const quizIds = units.flatMap((u) => (u.activities ?? []).filter((a) => a.kind === 'quiz' && a.quizId).map((a) => a.quizId!));
  const [evidence, attempts] = await Promise.all([
    Evidence.find({ studentId: { $in: studentIds }, unitId: { $in: unitIds } }).sort({ updatedAt: -1 }).lean(),
    quizIds.length ? QuizAttempt.find({ studentId: { $in: studentIds }, quizId: { $in: quizIds }, submittedAt: { $ne: null } }).select('studentId quizId percent').lean() : [],
  ]);
  // latest evidence per (student, activity)
  const ev = new Map<string, (typeof evidence)[number]>();
  for (const e of evidence) {
    const k = `${S(e.studentId)}:${S(e.activityId)}`;
    if (!ev.has(k)) ev.set(k, e);
  }
  const best = new Map<string, number>();
  for (const a of attempts) {
    const k = `${S(a.studentId)}:${S(a.quizId)}`;
    best.set(k, Math.max(best.get(k) ?? 0, a.percent ?? 0));
  }

  const out = new Map<string, Map<string, UnitOutcome>>();
  for (const sid of studentIds) {
    const perUnit = new Map<string, UnitOutcome>();
    for (const u of units) {
      const acts: ActivityState[] = [];
      // objective id -> list of [score, weight]
      const parts = new Map<string, [number, number][]>();
      let missingRequired = 0;
      for (const a of u.activities ?? []) {
        const aid = S(a._id);
        let state: ActivityState = { activityId: aid, status: 'not_started', score: null };
        let perObjective: Map<string, number> | null = null;
        if (a.kind === 'quiz') {
          const b = a.quizId ? best.get(`${sid}:${S(a.quizId)}`) : undefined;
          if (b != null) state = { activityId: aid, status: 'scored', score: Math.round(b) };
        } else {
          const e = ev.get(`${sid}:${aid}`);
          if (e) {
            state = {
              activityId: aid,
              evidenceId: S(e._id),
              status: e.status === 'verified' ? 'scored' : e.status === 'returned' ? 'returned' : 'pending',
              score: e.status === 'verified' && e.score != null ? Math.round(e.score) : null,
            };
            if (e.status === 'verified' && e.objectiveScores?.length) perObjective = new Map(e.objectiveScores.map((o) => [S(o.objectiveId), o.score ?? 0]));
          }
        }
        if (state.status === 'not_started' && a.required !== false) missingRequired++;
        acts.push(state);
        if (state.status !== 'scored') continue;
        for (const oid of a.objectiveIds ?? []) {
          const sc = perObjective?.get(S(oid)) ?? state.score;
          if (sc == null) continue;
          const list = parts.get(S(oid)) ?? [];
          list.push([sc, a.weight ?? 1]);
          parts.set(S(oid), list);
        }
      }
      const objectives: ObjectiveOutcome[] = (u.objectives ?? []).map((o) => {
        const list = parts.get(S(o._id));
        const w = list?.reduce((n, [, wt]) => n + wt, 0) ?? 0;
        const score = list && w > 0 ? Math.round(list.reduce((n, [sc, wt]) => n + sc * wt, 0) / w) : null;
        return { objectiveId: S(o._id), title: o.title, score, band: bandFor(score) };
      });
      const scored = objectives.map((o, i) => [o.score, (u.objectives ?? [])[i]?.weight ?? 1] as const).filter(([sc]) => sc != null) as [number, number][];
      const wsum = scored.reduce((n, [, wt]) => n + wt, 0);
      // A unit with activities but no objectives still gets a score from its activities
      let score = wsum > 0 ? Math.round(scored.reduce((n, [sc, wt]) => n + sc * wt, 0) / wsum) : null;
      if (score == null && !(u.objectives ?? []).length) {
        const s2 = acts.filter((a) => a.score != null);
        if (s2.length) score = Math.round(s2.reduce((n, a) => n + (a.score ?? 0), 0) / s2.length);
      }
      perUnit.set(S(u._id), { unitId: S(u._id), score, band: bandFor(score), objectives, activities: acts, missingRequired });
    }
    out.set(sid, perUnit);
  }
  return out;
}

export async function unitOutcome(unit: UnitLike, studentId: string) {
  return (await computeOutcomes([unit], [studentId])).get(studentId)!.get(S(unit._id))!;
}

/** Rubric level 1–4 → score. */
export const rubricScore = (level: number) => Math.round((Math.min(4, Math.max(1, level)) / 4) * 100);
