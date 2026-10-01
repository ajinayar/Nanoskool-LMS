import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bandForPercentile, psyBand, seedPsychometric, sourceWeights, termFor, validityFlags } from '../src/lib/psychometric.js';
import { cronbachAlpha } from '../src/lib/psyQuality.js';
import { AssessmentForm, AssessmentItem, Skill, User } from '../src/models/index.js';
import { as, closeDb, resetDb, tokens, type Seeded } from './helpers.js';

let data: Seeded;
let t: Awaited<ReturnType<typeof tokens>>;
let classId: string;
let sid: string;
beforeAll(async () => {
  data = await resetDb();
  await seedPsychometric();
  t = await tokens();
  sid = String(data.students[0]._id);
  classId = String((await User.findById(sid).lean())!.classId);
});
afterAll(closeDb);

type Dim = { name: string; score: number | null; band: string | null; sources: Record<string, number | null>; range: number[] | null };
const findDim = (prof: { domains: { dimensions: Dim[] }[] }, name: string) => prof.domains.flatMap((d) => d.dimensions).find((d) => d.name === name)!;

describe('psychometric profile: basics', () => {
  it('uses Indian school terms, provisional and percentile bands, and age-based source weights', () => {
    expect(termFor(new Date('2026-05-10'))).toBe('2026-T1');
    expect(termFor(new Date('2026-09-10'))).toBe('2026-T2');
    expect(termFor(new Date('2027-02-10'))).toBe('2026-T3');
    expect([psyBand(20), psyBand(45), psyBand(65), psyBand(85), psyBand(null)]).toEqual(['growing', 'developing', 'good', 'strength', null]);
    expect([bandForPercentile(10), bandForPercentile(30), bandForPercentile(60), bandForPercentile(90)]).toEqual(['growing', 'developing', 'good', 'strength']);
    expect(sourceWeights(2).self).toBeLessThan(sourceWeights(8).self); // young children's self-report counts less
    expect(cronbachAlpha([[1, 1, 1], [0, 0, 0], [1, 1, 0], [0, 0, 1], [1, 1, 1]])).toBeGreaterThan(0.5);
  });

  it('flags answers that are too fast, all the same, contradictory or too good to be true', () => {
    const items = [
      ...Array.from({ length: 8 }, (_, i) => ({ _id: `s${i}`, type: 'scale', scaleLabels: ['1', '2', '3', '4', '5'] })),
      { _id: 'p1', type: 'scale', scaleLabels: ['1', '2', '3', '4', '5'], pairKey: 'x' },
      { _id: 'p2', type: 'scale', scaleLabels: ['1', '2', '3', '4', '5'], pairKey: 'x', reverse: true },
      { _id: 'l1', type: 'scale', scaleLabels: ['1', '2', '3', '4', '5'], validity: 'desirability' },
      { _id: 'l2', type: 'scale', scaleLabels: ['1', '2', '3', '4', '5'], validity: 'desirability' },
    ];
    const answers = items.map((i) => ({ itemId: i._id, value: 5 }));
    const start = new Date('2026-09-01T10:00:00Z');
    expect(validityFlags(items, answers, start, new Date('2026-09-01T10:00:10Z'), 6).sort()).toEqual(['desirability', 'inconsistent', 'same_answer', 'too_fast']);
    const varied = items.map((i, k) => ({ itemId: i._id, value: i.validity ? 2 : i._id === 'p2' ? 1 : (k % 5) + 1 }));
    expect(validityFlags(items, varied, start, new Date('2026-09-01T10:10:00Z'), 6)).toEqual([]);
  });

  it('seeds 12 dimensions (thinking moved to the cognitive profile) with teacher level descriptions, child and parent forms for every grade, and runs once', async () => {
    const genius = await as(t.admin).get('/api/skills');
    expect(genius.body.every((s: { framework?: string }) => s.framework !== 'psychometric')).toBe(true);
    const psy = await as(t.admin).get('/api/skills?framework=psychometric');
    expect(psy.body).toHaveLength(12);
    expect(psy.body.find((s: { name: string }) => s.name === 'Personal hygiene').anchors['3']).toMatch(/washes hands/i);
    expect(await AssessmentForm.countDocuments({ framework: 'psychometric', status: 'published', informant: { $ne: 'parent' } })).toBe(10);
    expect(await AssessmentForm.countDocuments({ framework: 'psychometric', status: 'published', informant: 'parent' })).toBe(10);
    // Grades 4–10: at least 4 items for every dimension on the child's form
    const junior = await AssessmentForm.findOne({ framework: 'psychometric', grade: 6, informant: { $ne: 'parent' }, status: 'published' }).lean();
    const items = await AssessmentItem.find({ _id: { $in: junior!.itemIds } }).lean();
    const per = new Map<string, number>();
    for (const i of items) for (const s of i.skills) per.set(String(s.skillId), (per.get(String(s.skillId)) ?? 0) + 1);
    expect(Math.min(...per.values())).toBeGreaterThanOrEqual(4);
    expect(items.filter((i) => i.validity === 'desirability').length).toBe(3);
    const before = await AssessmentItem.countDocuments({ framework: 'psychometric' });
    await Promise.all([seedPsychometric(), seedPsychometric(), seedPsychometric()]); // started three times at once
    expect(await AssessmentItem.countDocuments({ framework: 'psychometric' })).toBe(before);
    expect(await Skill.countDocuments({ framework: 'psychometric' })).toBe(12);
  });
});

describe('psychometric profile: cleaning up duplicates', () => {
  it('merges duplicate dimensions, items and forms left by an earlier double start', async () => {
    const hygiene = (await Skill.findOne({ framework: 'psychometric', key: 'hygiene' }).lean())!;
    const dupDim = await Skill.collection.insertOne({ name: hygiene.name, framework: 'psychometric', domain: 'personality', createdAt: new Date(), updatedAt: new Date() } as never);
    const item = (await AssessmentItem.findOne({ seedKey: 'self.junior.hygiene.0' }).lean())!;
    const { _id, seedKey, ...rest } = item;
    void _id;
    await AssessmentItem.collection.dropIndexes().catch(() => undefined);
    const dupItem = await AssessmentItem.collection.insertOne({ ...rest, seedKey, skills: [{ skillId: dupDim.insertedId, weight: 1 }], createdAt: new Date() } as never);
    const form = (await AssessmentForm.findOne({ framework: 'psychometric', grade: 5, informant: { $ne: 'parent' }, status: 'published' }).lean())!;
    await AssessmentForm.collection.insertOne({ title: form.title, framework: 'psychometric', grade: 5, informant: 'self', itemIds: [dupItem.insertedId], status: 'published', createdAt: new Date() } as never);
    await seedPsychometric();
    expect(await Skill.countDocuments({ framework: 'psychometric' })).toBe(12);
    expect(await AssessmentItem.countDocuments({ seedKey: 'self.junior.hygiene.0' })).toBe(1);
    expect(await AssessmentForm.countDocuments({ framework: 'psychometric', grade: 5, informant: { $ne: 'parent' }, status: 'published' })).toBe(1);
  });
});

describe('psychometric profile: consent, the child, parents and teachers', () => {
  it('needs its own parent permission and the child’s agreement', async () => {
    await as(t.parent).patch(`/api/students/${sid}/consent`, { assessment: true });
    const s = as(t.student);
    expect((await s.get('/api/assessment/me?framework=psychometric')).body.consent).toBe(false);
    expect((await s.post('/api/assessment/me/start', { framework: 'psychometric', assent: true })).status).toBe(403);
    await as(t.parent).patch(`/api/students/${sid}/consent`, { psychometric: true });
    expect((await s.post('/api/assessment/me/start', { framework: 'psychometric' })).status).toBe(400); // no assent
  });

  it('scores the child’s answers, flags answer quality and keeps it apart from the Genius Quest', async () => {
    const s = as(t.student);
    const me = await s.get('/api/assessment/me?framework=psychometric');
    expect(me.body.due).toBe(true);
    expect(me.body.needsAssent).toBe(true);
    expect(me.body.languages).toEqual(['en']);
    expect((await s.post('/api/assessment/me/start', { framework: 'psychometric', assent: true })).status).toBe(201);
    for (const it of me.body.items) {
      if (it.scaleLabels?.length) await s.put('/api/assessment/me/answers?framework=psychometric', { itemId: it._id, value: it.scaleLabels.length });
      else await s.put('/api/assessment/me/answers?framework=psychometric', { itemId: it._id, selected: [0] });
    }
    const sub = await s.post('/api/assessment/me/submit', { framework: 'psychometric' });
    expect(sub.body.status).toBe('scored');
    const calm = (await Skill.findOne({ framework: 'psychometric', key: 'calm' }).lean())!;
    const calmScore = sub.body.skillScores.find((x: { skillId: string }) => String(x.skillId) === String(calm._id));
    expect(calmScore.score).toBe(75); // "Always" to 2 statements, "Always" to 1 reversed, best option in 1 situation
    expect(calmScore.answered).toBe(4);
    expect((await s.get('/api/assessment/me')).body.lastResult).toBeNull(); // Genius Quest untouched
    const prof = (await as(t.parent).get(`/api/students/${sid}/psychometric`)).body;
    expect(prof.flags).toEqual(expect.arrayContaining(['same_answer', 'desirability']));
    expect(findDim(prof, 'Inner calm').sources.self).toBe(75);
    expect(findDim(prof, 'Inner calm').range![0]).toBeLessThan(75);
    expect(findDim(prof, 'Fitness & stamina').sources.self).toBeNull(); // no self questions for fitness
  });

  it('lets a parent fill in the home questionnaire', async () => {
    const p = as(t.parent);
    const f = await p.get(`/api/students/${sid}/parent-form`);
    expect(f.status).toBe(200);
    expect(f.body.due).toBe(true);
    expect(f.body.items.length).toBe(24);
    expect((await as(t.teacher).get(`/api/students/${sid}/parent-form`)).status).toBe(403);
    expect((await p.post(`/api/students/${sid}/parent-form/start`)).status).toBe(201);
    for (const it of f.body.items.slice(0, 20)) await p.put(`/api/students/${sid}/parent-form/answers`, { itemId: it._id, value: 4 });
    expect((await p.post(`/api/students/${sid}/parent-form/submit`)).body.status).toBe('scored');
    const prof = (await p.get(`/api/students/${sid}/psychometric`)).body;
    expect(findDim(prof, 'Grooming & appearance').sources.parent).toBe(75);
    expect((await p.get(`/api/students/${sid}/parent-form`)).body.due).toBe(false);
  });

  it('keeps one rating per teacher, uses level descriptions and averages raters', async () => {
    const grid = await as(t.teacher).get(`/api/classes/${classId}/observations`);
    expect(grid.status).toBe(200);
    const grooming = grid.body.dimensions.find((d: { name: string }) => d.name === 'Grooming & appearance');
    expect(grooming.anchors['1']).toBeTruthy();
    expect(grid.body.dimensions.map((d: { name: string }) => d.name)).not.toContain('Pattern spotting');
    expect((await as(t.teacher).put(`/api/classes/${classId}/observations`, { studentId: sid, skillId: grooming._id, level: 4 })).status).toBe(200);
    expect((await as(t.school).put(`/api/classes/${classId}/observations`, { studentId: sid, skillId: grooming._id, level: 3 })).status).toBe(200);
    expect((await as(t.teacher).put(`/api/classes/${classId}/observations`, { studentId: sid, skillId: grooming._id, level: 5 })).status).toBe(400);
    expect((await as(t.student).get(`/api/classes/${classId}/observations`)).status).toBe(403);
    const prof = (await as(t.teacher).get(`/api/students/${sid}/psychometric`)).body;
    const g = findDim(prof, 'Grooming & appearance');
    expect(g.sources.raters).toBe(2);
    expect(g.sources.teacher).toBe(82); // between Usually (72) and Always (92)
    const q = await as(t.admin).get('/api/psychometric/quality');
    expect(q.status).toBe(200);
    expect(q.body.raters[0]).toMatchObject({ pairs: 1, exact: 0, within1: 100 });
    expect(q.body.families.some((f: { informant: string }) => f.informant === 'parent')).toBe(true);
  });

  it('records PE fitness tests with sensible limits', async () => {
    const tt = as(t.teacher);
    expect((await tt.get(`/api/classes/${classId}/fitness`)).body.tests.length).toBe(6);
    expect((await tt.put(`/api/classes/${classId}/fitness`, { studentId: sid, test: 'sprint50', value: 99 })).status).toBe(400);
    expect((await tt.put(`/api/classes/${classId}/fitness`, { studentId: sid, test: 'sprint50', value: 9.8 })).status).toBe(200);
    const prof = (await as(t.parent).get(`/api/students/${sid}/psychometric`)).body;
    expect(prof.fitnessTests[0]).toMatchObject({ test: 'sprint50', value: 9.8 });
  });

  it('routes “suggest a conversation” to the counsellor only', async () => {
    const c = await as(t.teacher).post(`/api/students/${sid}/conversations`, { reason: 'Seems withdrawn at break times lately', areas: ['Social confidence'] });
    expect(c.status).toBe(201);
    expect((await as(t.parent).get(`/api/students/${sid}/conversations`)).status).toBe(403);
    expect((await as(t.teacher).patch(`/api/psychometric/conversations/${c.body._id}`, { status: 'closed' })).status).toBe(403);
    expect((await as(t.school).patch(`/api/psychometric/conversations/${c.body._id}`, { status: 'in_progress', note: 'Met with child; will follow up' })).status).toBe(200);
    const mine = await as(t.teacher).get('/api/psychometric/conversations');
    expect(mine.body.counsellor).toBe(false);
    expect(mine.body.items[0].notes).toEqual([]); // counsellor notes stay private
    const teacherId = String((await User.findOne({ email: 'teacher@demo.nanoskool.in' }).lean())!._id);
    expect((await as(t.school).patch(`/api/psychometric/counsellors/${teacherId}`, { isCounsellor: true })).status).toBe(200);
    expect((await as(t.teacher).get('/api/psychometric/conversations')).body.items[0].notes.length).toBe(1);
  });

  it('builds norms and lets a parent erase everything', async () => {
    const r = await as(t.admin).post('/api/psychometric/norms/rebuild');
    expect(r.status).toBe(200);
    const del = await as(t.parent).delete(`/api/students/${sid}/psychometric`);
    expect(del.status).toBe(200);
    expect(del.body.removed.attempts).toBe(2);
    const staff = (await as(t.teacher).get(`/api/students/${sid}/psychometric`)).body;
    expect(staff.withheld).toBe(true);
    const prof = (await as(t.parent).get(`/api/students/${sid}/psychometric`)).body;
    expect(prof.consent).toBe(false);
    expect(findDim(prof, 'Inner calm').score).toBeNull();
    expect((await as(t.teacher).put(`/api/classes/${classId}/observations`, { studentId: sid, skillId: String((await Skill.findOne({ key: 'grooming' }).lean())!._id), level: 2 })).status).toBe(403);
  });
});
