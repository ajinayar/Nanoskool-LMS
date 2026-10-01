import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { COG_AREAS, puzzlesFor, seedCognitive } from '../src/lib/cognitive.js';
import { seedPsychometric } from '../src/lib/psychometric.js';
import { AssessmentForm, AssessmentItem, Skill, User } from '../src/models/index.js';
import { as, closeDb, resetDb, tokens, type Seeded } from './helpers.js';

let data: Seeded;
let t: Awaited<ReturnType<typeof tokens>>;
let sid: string;
beforeAll(async () => {
  data = await resetDb();
  // An older install: the thinking dimensions were part of Know Yourself
  await Skill.create({ name: 'Logical reasoning', key: 'logic', framework: 'psychometric', domain: 'cognitive', assessedBy: 'quest', active: true });
  await seedPsychometric();
  await seedCognitive();
  t = await tokens();
  sid = String(data.students[0]._id);
});
afterAll(closeDb);

describe('Part 3 · cognitive profile (Thinking Puzzles)', () => {
  it('has six thinking areas with enough puzzles for every stage, including memory and timed puzzles', async () => {
    for (const stage of ['little', 'junior', 'senior'] as const) {
      const ps = puzzlesFor(stage);
      for (const a of COG_AREAS) expect(ps.filter((p) => p.area === a.key).length).toBeGreaterThanOrEqual(stage === 'little' ? 3 : 4);
      expect(ps.some((p) => p.stimulus && p.stimulusSec)).toBe(true);
      expect(ps.some((p) => p.timeSec)).toBe(true);
      expect(ps.every((p) => p.answer >= 0 && p.answer < p.options.length)).toBe(true);
      expect(ps[0].area).not.toBe(ps[1].area); // areas are mixed, not in blocks
    }
    const areas = await as(t.admin).get('/api/skills?framework=cognitive');
    expect(areas.body.map((s: { name: string }) => s.name)).toEqual(COG_AREAS.map((a) => a.name));
    expect(await AssessmentForm.countDocuments({ framework: 'cognitive', status: 'published' })).toBe(10);
    await seedCognitive(); // runs again without duplicates
    expect(await Skill.countDocuments({ framework: 'cognitive' })).toBe(6);
    expect(await AssessmentForm.countDocuments({ framework: 'cognitive', status: 'published' })).toBe(10);
  });

  it('takes thinking out of Know Yourself and keeps the three parts apart', async () => {
    expect((await Skill.findOne({ framework: 'psychometric', key: 'logic' }).lean())!.active).toBe(false);
    const psyForm = await AssessmentForm.findOne({ framework: 'psychometric', grade: 6, informant: { $ne: 'parent' }, status: 'published' }).lean();
    const psyItems = await AssessmentItem.find({ _id: { $in: psyForm!.itemIds } }).lean();
    expect(psyItems.some((i) => /What comes next/.test(i.prompt))).toBe(false);
    const genius = await as(t.admin).get('/api/skills');
    expect(genius.body.some((s: { framework?: string }) => s.framework === 'cognitive')).toBe(false);
    const psy = await as(t.admin).get('/api/skills?framework=psychometric');
    expect(psy.body.some((s: { framework?: string }) => s.framework === 'cognitive')).toBe(false);
  });

  it('needs its own parent permission and the child’s agreement', async () => {
    await as(t.parent).patch(`/api/students/${sid}/consent`, { assessment: true, psychometric: true });
    const s = as(t.student);
    expect((await s.get('/api/assessment/me?framework=cognitive')).body.consent).toBe(false);
    expect((await s.post('/api/assessment/me/start', { framework: 'cognitive', assent: true })).status).toBe(403);
    await as(t.parent).patch(`/api/students/${sid}/consent`, { cognitive: true });
    expect((await s.post('/api/assessment/me/start', { framework: 'cognitive' })).status).toBe(400); // no assent
  });

  it('sends puzzles without answers, scores right answers and shows a strengths shape — no overall score', async () => {
    const s = as(t.student);
    const me = (await s.get('/api/assessment/me?framework=cognitive')).body;
    expect(me.due).toBe(true);
    expect(me.needsAssent).toBe(true);
    expect(JSON.stringify(me.items)).not.toMatch(/"score"/);
    expect(me.items.some((i: { stimulus?: string; stimulusSec?: number }) => i.stimulus && i.stimulusSec)).toBe(true);
    expect((await s.post('/api/assessment/me/start', { framework: 'cognitive', assent: true })).status).toBe(201);
    const full = await AssessmentItem.find({ _id: { $in: me.items.map((i: { _id: string }) => i._id) } })
      .populate('skills.skillId', 'key')
      .lean();
    for (const it of full) {
      const key = (it.skills[0].skillId as unknown as { key: string }).key;
      const right = it.options.findIndex((o) => o.score === 1);
      // Right everywhere except memory, where every answer is wrong
      const pick = key === 'cog.memory' ? (right + 1) % it.options.length : right;
      await s.put('/api/assessment/me/answers?framework=cognitive', { itemId: String(it._id), selected: [pick], ms: 4000 });
    }
    const sub = await s.post('/api/assessment/me/submit', { framework: 'cognitive' });
    expect(sub.body.status).toBe('scored');
    expect((await s.get('/api/assessment/me')).body.lastResult).toBeNull(); // Genius Quest untouched

    const prof = (await as(t.parent).get(`/api/students/${sid}/cognitive`)).body;
    expect(prof.areas).toHaveLength(6);
    expect(prof).not.toHaveProperty('score');
    const memory = prof.areas.find((a: { key: string }) => a.key === 'cog.memory');
    const logic = prof.areas.find((a: { key: string }) => a.key === 'cog.logic');
    expect(memory.score).toBe(0);
    expect(logic.score).toBe(100);
    expect(logic.band).toBe('strength'); // provisional until enough children in the grade
    expect(logic.normed).toBe(false);
    expect(prof.growing).toEqual(['cog.memory']);
    expect(prof.strengths).toHaveLength(2);
    expect((await s.get('/api/assessment/me?framework=cognitive')).body.due).toBe(false); // once a term
  });

  it('hides results from staff without permission and lets a parent erase them', async () => {
    expect((await as(t.teacher).get(`/api/students/${sid}/cognitive`)).body.areas).toHaveLength(6);
    expect((await as(t.parent).delete(`/api/students/${sid}/cognitive`)).body.removed.attempts).toBe(1);
    const after = (await as(t.teacher).get(`/api/students/${sid}/cognitive`)).body;
    expect(after.withheld).toBe(true);
    expect((await User.findById(sid).lean())!.consent!.cognitive).toBe(false);
    expect((await User.findById(sid).lean())!.consent!.psychometric).toBe(true); // Know Yourself permission untouched
  });

  it('gives the studio an overview and rebuilds norms (super admin only)', async () => {
    const o = await as(t.admin).get('/api/cognitive/overview');
    expect(o.body.areas).toHaveLength(6);
    expect(o.body.areas.find((a: { key: string }) => a.key === 'cog.memory').kinds.memory).toBeGreaterThan(0);
    expect(o.body.grades).toHaveLength(10);
    expect((await as(t.teacher).get('/api/cognitive/overview')).status).toBe(403);
    expect((await as(t.admin).post('/api/cognitive/norms/rebuild')).status).toBe(200);
  });
});
