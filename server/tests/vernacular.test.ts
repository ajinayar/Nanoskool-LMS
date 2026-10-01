import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { clearAiCache } from '../src/lib/llm.js';
import { Setting } from '../src/models/index.js';
import { as, closeDb, resetDb, tokens, type Seeded } from './helpers.js';

let data: Seeded;
let t: Awaited<ReturnType<typeof tokens>>;
let unitId: string;
let checkId: string;
beforeAll(async () => {
  data = await resetDb();
  await Setting.deleteMany({});
  clearAiCache();
  t = await tokens();
  // A published course the demo student can open
  const admin = as(t.admin);
  const course = await admin.get(`/api/courses/${data.courses[0].course._id}`);
  const chapterId = course.body.chapters[0]._id;
  const r = await admin.post(`/api/chapters/${chapterId}/units`, {
    title: 'Magnets',
    summary: 'What magnets attract.',
    blocks: [
      { kind: 'text', title: 'What is a magnet?', body: '<p>A magnet attracts iron and nickel.</p>' },
      { kind: 'check', title: 'Quick check', question: 'What does a magnet attract?', choices: [{ text: 'Plastic', correct: false }, { text: 'Iron', correct: true }, { text: 'Wood', correct: false }], explain: 'Iron is a magnetic material.', help: '<p>Think of a fridge door.</p>' },
      { kind: 'text', title: 'Poles', body: '<p>Like poles repel.</p>' },
    ],
  });
  expect(r.status).toBe(201);
  unitId = r.body._id;
  checkId = r.body.blocks[1]._id;
});
afterAll(async () => {
  await Setting.deleteMany({});
  clearAiCache();
  await closeDb();
});
afterEach(() => vi.unstubAllGlobals());

describe('Quick checks', () => {
  it('hides answers from students and unlocks after a right answer', async () => {
    const st = as(t.student);
    const u = await st.get(`/api/units/${unitId}`);
    expect(u.status).toBe(200);
    const block = u.body.blocks.find((b: { kind: string }) => b.kind === 'check');
    expect(JSON.stringify(block)).not.toMatch(/"correct"|Iron is a magnetic|fridge/);
    const wrong = await st.post(`/api/units/${unitId}/checks/${checkId}`).send({ choice: 0 });
    expect(wrong.body).toMatchObject({ correct: false, attempts: 1 });
    expect(wrong.body.help).toContain('fridge');
    expect(wrong.body.explain).toBeUndefined();
    const right = await st.post(`/api/units/${unitId}/checks/${checkId}`).send({ choice: 1 });
    expect(right.body).toMatchObject({ correct: true, attempts: 2, explain: 'Iron is a magnetic material.' });
    const again = await st.get(`/api/units/${unitId}`);
    expect(again.body.checks[checkId]).toEqual({ passed: true, attempts: 2 });
  });
  it('only students answer, and only real choices', async () => {
    expect((await as(t.teacher).post(`/api/units/${unitId}/checks/${checkId}`).send({ choice: 1 })).status).toBe(403);
    expect((await as(t.student).post(`/api/units/${unitId}/checks/${checkId}`).send({ choice: 5 })).status).toBe(400);
  });
  it('AI (offline) writes a check from the lesson text', async () => {
    const r = await as(t.admin).post('/api/ai/blocks/generate', { kind: 'check', topic: 'Magnets', grade: 6, contextHtml: '<p>A magnet attracts objects made of iron, nickel and cobalt. These materials are called magnetic materials.</p>' });
    expect(r.body.patch.question).toMatch(/_____/);
    expect(r.body.patch.choices.filter((c: { correct: boolean }) => c.correct)).toHaveLength(1);
  });
  it('the unit planner puts checks between parts', async () => {
    const r = await as(t.admin).post('/api/ai/units/plan', { prompt: 'Magnets for grade 6' });
    expect(r.body.sections.filter((s: { kind: string; include: boolean }) => s.kind === 'check' && s.include).length).toBeGreaterThanOrEqual(2);
  });
});

describe('Units in Indian languages', () => {
  it('copies the English for hand translation when AI is off; students see only approved translations', async () => {
    const admin = as(t.admin);
    const list = await admin.get(`/api/units/${unitId}/translations`);
    expect(list.body.languages.find((l: { code: string }) => l.code === 'hi').status).toBeNull();
    const g = await admin.post(`/api/units/${unitId}/translations/hi/generate`);
    expect(g.status).toBe(200);
    expect(g.body.by).toBe('copy');
    expect(g.body.translation.status).toBe('draft');
    const draft = g.body.translation;
    // Draft is not shown to students
    await as(t.student).patch('/api/auth/me').send({ prefs: { language: 'hi' } });
    expect((await as(t.student).get(`/api/units/${unitId}`)).body.lang).toBe('en');
    // The teacher translates and approves
    const blocks = draft.blocks.map((b: { id: string; kind: string }) =>
      b.kind === 'check' ? { ...b, title: 'झटपट जाँच', question: 'चुंबक किसे आकर्षित करता है?', choices: ['प्लास्टिक', 'लोहा (iron)', 'लकड़ी'], explain: 'लोहा एक चुंबकीय पदार्थ है।', help: '<p>फ्रिज के दरवाज़े के बारे में सोचो।</p>' } : b.title === 'What is a magnet?' ? { ...b, title: 'चुंबक क्या है?', body: '<p>चुंबक लोहे और निकल को आकर्षित करता है।<script>x</script></p>' } : b,
    );
    const put = await admin.put(`/api/units/${unitId}/translations/hi`).send({ title: 'चुंबक', summary: 'चुंबक क्या आकर्षित करते हैं।', blocks, objectives: draft.objectives, status: 'approved' });
    expect(put.status).toBe(200);
    expect(put.body.translation.status).toBe('approved');
    const st = await as(t.student).get(`/api/units/${unitId}`);
    expect(st.body.lang).toBe('hi');
    expect(st.body.title).toBe('चुंबक');
    expect(st.body.languages).toEqual(['en', 'hi']);
    const first = st.body.blocks[0];
    expect(first.title).toBe('चुंबक क्या है?');
    expect(first.body).not.toContain('script');
    expect(st.body.blocks[1].choices[1].text).toBe('लोहा (iron)');
    // English on request
    expect((await as(t.student).get(`/api/units/${unitId}?lang=en`)).body.title).toBe('Magnets');
    // Explanations come in the student's language
    const ans = await as(t.student).post(`/api/units/${unitId}/checks/${checkId}`).send({ choice: 0, lang: 'hi' });
    expect(ans.body.help).toContain('फ्रिज');
  });
  it('marks a translation out of date when the English changes', async () => {
    const admin = as(t.admin);
    const u = await admin.get(`/api/units/${unitId}`);
    await admin.patch(`/api/units/${unitId}`, { blocks: [...u.body.blocks, { kind: 'text', title: 'New part', body: '<p>Added later.</p>' }] });
    const list = await admin.get(`/api/units/${unitId}/translations`);
    expect(list.body.languages.find((l: { code: string }) => l.code === 'hi')).toMatchObject({ status: 'approved', outOfDate: true });
  });
  it('translates with AI when it is switched on', async () => {
    await as(t.admin).put('/api/admin/ai-settings').send({ provider: 'openai', openaiKey: 'sk-openai-test-0123456789abcdefghij', openaiModel: 'gpt-4.1' });
    const real = globalThis.fetch;
    const prompts: string[] = [];
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      if (!String(url).includes('api.openai.com')) return real(url, init);
      const b = JSON.parse(String(init!.body));
      prompts.push(b.messages[0].content);
      const piece = JSON.parse(b.messages[1].content);
      // Pretend translation: prefix every string with "HI:"
      const tr = (v: unknown): unknown => (typeof v === 'string' ? (v.startsWith('<') ? v.replace(/>([^<]+)</g, '>HI:$1<') : `HI:${v}`) : Array.isArray(v) ? v.map(tr) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'id' || k === 'kind' ? x : tr(x)])) : v);
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(tr(piece)) } }], usage: { total_tokens: 10 } }), { status: 200 });
    });
    const g = await as(t.admin).post(`/api/units/${unitId}/translations/ml/generate`);
    expect(g.body.by).toBe('ai');
    expect(g.body.translation.title).toBe('HI:Magnets');
    expect(g.body.translation.blocks[0].body).toContain('HI:A magnet');
    expect(prompts[0]).toMatch(/Malayalam/);
    await as(t.admin).put('/api/admin/ai-settings').send({ provider: 'offline' });
  });
  it('is for the super admin only', async () => {
    expect((await as(t.teacher).post(`/api/units/${unitId}/translations/hi/generate`)).status).toBe(403);
    expect((await as(t.admin).post(`/api/units/${unitId}/translations/en/generate`)).status).toBe(400);
  });
});

describe('Learning preferences', () => {
  it('saves preferences one at a time', async () => {
    const st = as(t.student);
    await st.patch('/api/auth/me').send({ prefs: { calm: true } });
    const r = await st.patch('/api/auth/me').send({ prefs: { textSize: 'large', learnWay: 'listening' } });
    expect(r.body.prefs).toMatchObject({ language: 'hi', calm: true, textSize: 'large', learnWay: 'listening' });
    expect((await st.patch('/api/auth/me').send({ prefs: { language: 'xx' } })).status).toBe(400);
  });
});

describe('Break an assignment into steps', () => {
  it('makes small steps for the student, saves ticks, and shows them in the list', async () => {
    const list = await as(t.student).get('/api/assignments');
    expect(list.status).toBe(200);
    const a = list.body.find((x: { submission: unknown }) => !x.submission) ?? list.body[0];
    expect(a).toBeTruthy();
    const g = await as(t.student).post(`/api/assignments/${a._id}/steps/generate`);
    expect(g.status).toBe(200);
    expect(g.body.steps.length).toBeGreaterThanOrEqual(3);
    const ticked = g.body.steps.map((s: { text: string; minutes: number }, i: number) => ({ text: s.text, minutes: s.minutes, done: i === 0 }));
    const put = await as(t.student).put(`/api/assignments/${a._id}/steps`).send({ steps: ticked });
    expect(put.body.steps[0].done).toBe(true);
    const again = await as(t.student).get('/api/assignments');
    expect(again.body.find((x: { _id: string }) => x._id === a._id).steps[0].done).toBe(true);
    expect((await as(t.teacher).post(`/api/assignments/${a._id}/steps/generate`)).status).toBe(403);
  });
});
