import crypto from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { autoScore, skillScoresFor } from '../src/modules/skills/routes.js';
import { app, as, closeDb, resetDb, tokens, type Seeded } from './helpers.js';

let data: Seeded;
let t: Awaited<ReturnType<typeof tokens>>;
beforeAll(async () => {
  data = await resetDb();
  t = await tokens();
});
afterAll(closeDb);

const hex = () => crypto.randomBytes(12).toString('hex');
const student = () => String(data.students[0]._id);

describe('learning units: objectives, activities and outcomes', () => {
  let unitId: string;
  const o1 = hex();
  const o2 = hex();
  const quizAct = hex();
  const projectAct = hex();
  const toolAct = hex();
  let toolId: string;
  let secret: string;

  it('lets admins add objectives and activities, and checks their links', async () => {
    const admin = as(t.admin);
    unitId = String(data.courses[0].unitIds[0]);
    const tool = await admin.post('/api/tools', { name: 'Super Tutor', kind: 'super_tutor', launchUrl: 'https://tutor.example.in/launch' });
    expect(tool.status).toBe(201);
    expect(tool.body.secret.length).toBeGreaterThanOrEqual(32);
    toolId = tool.body._id;
    secret = tool.body.secret;
    expect((await admin.get('/api/tools')).body[0].secret).toBeUndefined(); // never listed again

    const bad = await admin.patch(`/api/units/${unitId}`, { objectives: [{ _id: o1, title: 'A' }], activities: [{ kind: 'project', title: 'P', objectiveIds: [hex()] }] });
    expect(bad.status).toBe(400);

    const ok = await admin.patch(`/api/units/${unitId}`, {
      objectives: [
        { _id: o1, title: 'Name the parts of a robot', criteria: 'I can point to sensors and motors', weight: 1 },
        { _id: o2, title: 'Build a simple bot', weight: 1 },
      ],
      activities: [
        { _id: quizAct, kind: 'quiz', title: 'Parts quiz', quizId: String(data.courses[0].quiz._id), objectiveIds: [o1] },
        { _id: projectAct, kind: 'project', title: 'Build and film it', objectiveIds: [o2], mediaTypes: ['photo', 'video'] },
        { _id: toolAct, kind: 'tool', title: 'Super Tutor practice', toolId, objectiveIds: [o1, o2], required: false },
      ],
    });
    expect(ok.status).toBe(200);
    expect(ok.body.objectives).toHaveLength(2);
    expect(ok.body.activities[0].scoring).toBe('auto');
    expect((await as(t.teacher).patch(`/api/units/${unitId}`, { objectives: [] })).status).toBe(403);
  });

  it('needs parent consent before photos and videos count', async () => {
    const s = as(t.student);
    const media = [{ kind: 'photo', url: '/files/evidence/x/robot.jpg' }];
    const blocked = await s.post(`/api/units/${unitId}/activities/${projectAct}/evidence`, { media, caption: 'My bot' });
    expect(blocked.status).toBe(403);
    expect((await as(t.parent).patch(`/api/students/${student()}/consent`, { media: true, assessment: true })).status).toBe(200);
    expect((await as(t.teacher).patch(`/api/students/${student()}/consent`, { media: true })).status).toBe(403);
    const r = await s.post(`/api/units/${unitId}/activities/${projectAct}/evidence`, { media, caption: 'My bot follows a line' });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('pending');
    const again = await s.post(`/api/units/${unitId}/activities/${projectAct}/evidence`, { media, caption: 'Better video' });
    expect(again.status).toBe(200); // resubmitting replaces the pending one
  });

  it('counts only teacher-verified evidence', async () => {
    let out = await as(t.student).get(`/api/units/${unitId}/outcome`);
    expect(out.body.objectives.find((o: { objectiveId: string }) => o.objectiveId === o2).score).toBeNull(); // no evidence yet, not 0

    const queue = await as(t.teacher).get('/api/evidence?status=pending');
    expect(queue.status).toBe(200);
    const item = queue.body.find((e: { activityId: string }) => e.activityId === projectAct);
    expect(item.activity.title).toBe('Build and film it');
    expect(item.objectives[0].title).toBe('Build a simple bot');
    expect((await as(t.school2).get('/api/evidence')).body).toHaveLength(0); // other school sees nothing
    expect((await as(t.teacher).post(`/api/evidence/${item._id}/review`, { status: 'verified' })).status).toBe(400);
    const rev = await as(t.teacher).post(`/api/evidence/${item._id}/review`, { status: 'verified', rubricLevel: 3, feedback: 'Great filming' });
    expect(rev.body.score).toBe(75);

    out = await as(t.student).get(`/api/units/${unitId}/outcome`);
    expect(out.body.objectives.find((o: { objectiveId: string }) => o.objectiveId === o2).score).toBe(75);
    expect(out.body.score).not.toBeNull();
    expect((await as(t.student).post(`/api/units/${unitId}/activities/${projectAct}/evidence`, { caption: 'x' })).status).toBe(409);
  });

  it('accepts signed tool results once, and rejects forged ones', async () => {
    const launch = await as(t.student).post(`/api/units/${unitId}/activities/${toolAct}/launch`);
    expect(launch.status).toBe(200);
    const url = new URL(launch.body.url);
    const token = url.searchParams.get('token')!;
    expect(url.searchParams.get('objectives')).toContain(o1);

    const payload = JSON.stringify({ token, objectiveScores: [{ objectiveId: o1, score: 90 }, { objectiveId: o2, score: 60 }], summary: 'Solid' });
    const sign = (key: string) => crypto.createHmac('sha256', key).update(payload).digest('hex');
    const send = (sig: string) => request(app).post('/api/tools/results').set('Content-Type', 'application/json').set('X-Nanoskool-Tool', toolId).set('X-Nanoskool-Signature', sig).send(payload);

    expect((await send(sign('wrong-secret'))).status).toBe(401);
    const ok = await send(sign(secret));
    expect(ok.status).toBe(201);
    expect((await send(sign(secret))).status).toBe(409); // one result per launch

    const out = await as(t.student).get(`/api/units/${unitId}/outcome`);
    const obj1 = out.body.objectives.find((o: { objectiveId: string }) => o.objectiveId === o1);
    expect(obj1.score).toBeGreaterThan(0);
    const obj2 = out.body.objectives.find((o: { objectiveId: string }) => o.objectiveId === o2);
    expect(obj2.score).toBe(Math.round((75 + 60) / 2));
  });

  it('gives teachers a class heatmap and parents a portfolio', async () => {
    const heat = await as(t.teacher).get(`/api/classes/${data.classes[0]._id}/outcomes?courseId=${data.courses[0].course._id}`);
    expect(heat.status).toBe(200);
    const me = heat.body.students.find((s: { _id: string }) => s._id === student());
    expect(me.units[0].objectives).toHaveLength(2);

    const pf = await as(t.parent).get(`/api/students/${student()}/portfolio`);
    expect(pf.status).toBe(200);
    expect(pf.body.stats.verified).toBeGreaterThanOrEqual(2);
    expect(pf.body.courses.length).toBeGreaterThan(0);

    const g = await as(t.parent).get(`/api/students/${student()}/guidance`);
    expect(g.status).toBe(200);
    expect(Array.isArray(g.body)).toBe(true);
    const cg = await as(t.teacher).get(`/api/classes/${data.classes[0]._id}/guidance`);
    expect(cg.status).toBe(200);
  });
});

describe('skills mission', () => {
  it('scores closed questions automatically', () => {
    expect(autoScore({ type: 'single', options: [{ score: 0 }, { score: 1 }] }, { selected: [1] })).toBe(1);
    expect(autoScore({ type: 'scale', scaleLabels: ['a', 'b', 'c', 'd', 'e'] }, { value: 4 })).toBe(0.75);
    expect(autoScore({ type: 'multiple', options: [{ score: 0.5 }, { score: 0.5 }, { score: 0 }] }, { selected: [0, 1] })).toBe(1);
    expect(autoScore({ type: 'open' }, { text: 'hi' })).toBeNull();
    const s = skillScoresFor([{ _id: 'a', skills: [{ skillId: 'k', weight: 1 }] }, { _id: 'b', skills: [{ skillId: 'k', weight: 3 }] }], [{ itemId: 'a', score: 1 }, { itemId: 'b', score: 0 }]);
    expect(s[0]).toEqual({ skillId: 'k', score: 25, level: 'emerging' });
  });

  it('runs from admin setup to a scored skill profile', async () => {
    const admin = as(t.admin);
    const crit = await admin.post('/api/skills', { name: 'Critical thinking' });
    const collab = await admin.post('/api/skills', { name: 'Collaboration' });
    const i1 = await admin.post('/api/assessment-items', { type: 'single', prompt: 'Which is a fair test?', options: [{ text: 'Change one thing', score: 1 }, { text: 'Change everything', score: 0 }], skills: [{ skillId: crit.body._id, weight: 1 }], bands: ['junior'] });
    const i2 = await admin.post('/api/assessment-items', { type: 'scale', prompt: 'I listen to others in a group', scaleLabels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'], skills: [{ skillId: collab.body._id, weight: 1 }], bands: ['junior'] });
    const i3 = await admin.post('/api/assessment-items', { type: 'open', prompt: 'Describe a problem you solved with friends', rubric: ['a', 'b', 'c', 'd'], skills: [{ skillId: collab.body._id, weight: 1 }], bands: ['junior'] });
    expect([i1.status, i2.status, i3.status]).toEqual([201, 201, 201]);
    expect((await admin.post('/api/assessment-items', { type: 'single', prompt: 'Only one', options: [{ text: 'x', score: 1 }], skills: [{ skillId: crit.body._id, weight: 1 }], bands: ['junior'] })).status).toBe(400);
    const form = await admin.post('/api/assessment-forms', { title: 'Quest mission', band: 'junior', itemIds: [i1.body._id, i2.body._id, i3.body._id] });
    expect((await admin.post(`/api/assessment-forms/${form.body._id}/publish`)).status).toBe(200);

    const s = as(t.student); // Grade 6 → junior band; consent was given above
    const me = await s.get('/api/assessment/me');
    expect(me.body.due).toBe(true);
    expect(me.body.items).toHaveLength(3);
    expect(me.body.items[0].options[0].score).toBeUndefined(); // no answer key sent to students
    expect((await s.post('/api/assessment/me/start')).status).toBe(201);
    await s.put('/api/assessment/me/answers', { itemId: i1.body._id, selected: [0] });
    await s.put('/api/assessment/me/answers', { itemId: i2.body._id, value: 5 });
    await s.put('/api/assessment/me/answers', { itemId: i3.body._id, text: 'We fixed our robot together' });
    const sub = await s.post('/api/assessment/me/submit');
    expect(sub.body.status).toBe('submitted'); // waits for the teacher on the open answer

    const queue = await as(t.teacher).get('/api/assessment-reviews');
    expect(queue.body).toHaveLength(1);
    expect((await as(t.teacher).post(`/api/assessment-reviews/${queue.body[0].attemptId}/score`, { itemId: i3.body._id, level: 2 })).body.status).toBe('scored');

    const prof = await as(t.parent).get(`/api/students/${student()}/skills`);
    const last = prof.body.history.at(-1);
    expect(last.skillScores.find((x: { skillId: string }) => x.skillId === crit.body._id).score).toBe(100);
    expect(last.skillScores.find((x: { skillId: string }) => x.skillId === collab.body._id).score).toBe(75); // (1 + 0.5) / 2
    expect((await s.get('/api/assessment/me')).body.due).toBe(false); // once per term
  });
});
