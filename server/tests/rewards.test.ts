import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RewardClaim, UnitProgress } from '../src/models/index.js';
import { levelFor, levelStart, streaks } from '../src/modules/rewards/engine.js';
import { as, closeDb, resetDb, tokens, type Seeded } from './helpers.js';

let data: Seeded;
let t: Awaited<ReturnType<typeof tokens>>;
beforeAll(async () => {
  data = await resetDb();
  t = await tokens();
});
afterAll(closeDb);

describe('rewards maths', () => {
  it('levels grow with XP', () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(99)).toBe(1);
    expect(levelFor(100)).toBe(2);
    expect(levelFor(300)).toBe(3);
    expect(levelStart(5)).toBe(1000);
  });
  it('counts a streak that ends today or yesterday', () => {
    const days = new Set(['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-25', '2026-09-26']);
    expect(streaks(days, '2026-09-26')).toEqual({ current: 2, best: 3 });
    expect(streaks(days, '2026-09-27').current).toBe(2); // still alive until the day ends
    expect(streaks(days, '2026-09-28').current).toBe(0);
  });
});

describe('rewards API', () => {
  it('gives a student their rewards, earned from real learning', async () => {
    const student = data.students[0];
    await UnitProgress.deleteMany({ studentId: student._id, completedAt: { $gte: new Date(Date.now() - 2 * 86400_000) } });
    const r = await as(t.student).get('/api/rewards/me');
    expect(r.status).toBe(200);
    expect(r.body.badges).toHaveLength(12);
    expect(r.body.level).toBeGreaterThanOrEqual(1);
    expect(r.body.quests.map((q: { key: string }) => q.key)).toEqual(['unit', 'quiz', 'nanobot']);
  });

  it('keeps the daily reward locked until the student learns something today', async () => {
    const s = as(t.student);
    await RewardClaim.deleteMany({});
    const before = await s.get('/api/rewards/me');
    if (!before.body.learnedToday) {
      const locked = await s.post('/api/rewards/claim');
      expect(locked.status).toBe(400);
    }
    // Finish a lesson that is not done yet
    const dash = await s.get('/api/dashboard');
    let unitId: string | undefined;
    for (const cp of dash.body.courses) {
      const detail = await s.get(`/api/courses/${cp.course._id}`);
      unitId = detail.body.chapters.flatMap((c: { units: { _id: string; completed?: boolean }[] }) => c.units).find((u: { completed?: boolean }) => !u.completed)?._id;
      if (unitId) break;
    }
    expect(unitId).toBeTruthy();
    expect((await s.post(`/api/units/${unitId}/complete`)).status).toBeLessThan(300);

    const after = await s.get('/api/rewards/me');
    expect(after.body.xp).toBe(before.body.xp + 10);
    expect(after.body.learnedToday).toBe(true);
    expect(after.body.quests.find((q: { key: string }) => q.key === 'unit').done).toBe(true);
    expect(after.body.daily.canClaim).toBe(true);

    const claim = await s.post('/api/rewards/claim');
    expect(claim.status).toBe(200);
    expect(claim.body.gained).toBe(after.body.daily.xp);
    expect(claim.body.xp).toBe(after.body.xp + claim.body.gained);
    expect((await s.post('/api/rewards/claim')).status).toBe(400); // once a day
  });

  it('only students can claim, and only people who can see the student can view', async () => {
    expect((await as(t.teacher).post('/api/rewards/claim')).status).toBe(403);
    const id = String(data.students[0]._id);
    expect((await as(t.parent).get(`/api/rewards/students/${id}`)).status).toBe(200);
    expect([403, 404]).toContain((await as(t.school2).get(`/api/rewards/students/${id}`)).status);
  });
});
