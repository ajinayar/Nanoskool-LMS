import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { extractJson, slidesFromHtml, templateDeck, themeForGrade, tidySlide } from '../src/modules/ai/slides.js';
import { as, closeDb, resetDb, tokens, type Seeded } from './helpers.js';

let data: Seeded;
let t: Awaited<ReturnType<typeof tokens>>;
beforeAll(async () => {
  data = await resetDb();
  t = await tokens();
});
afterAll(closeDb);

describe('presentation units', () => {
  it('drafts slides offline from a topic or from lesson HTML', () => {
    expect(templateDeck('Magnets', 5, 2)).toHaveLength(5);
    const s = slidesFromHtml('<h2>What is a circuit?</h2><p>A circuit is a loop. Current flows around it.</p><h2>Parts</h2><ul><li>Cell</li><li>Wire</li><li>Bulb</li></ul>', 'Circuits', 6);
    expect(s[0].layout).toBe('title');
    expect(s.find((x) => x.title === 'Parts')?.bullets).toEqual(['Cell', 'Wire', 'Bulb']);
    expect(extractJson('Here you go:\n```json\n[{"layout":"title","title":"Hi"}]\n```')).toEqual([{ layout: 'title', title: 'Hi' }]);
  });

  it('generates and improves slides through the API (offline provider)', async () => {
    const admin = as(t.admin);
    const g = await admin.post('/api/ai/slides/generate', { topic: 'Simple machines', count: 6, grade: 4 });
    expect(g.status).toBe(200);
    expect(g.body.slides).toHaveLength(6);
    const imp = await admin.post('/api/ai/slides/improve', { slide: { layout: 'bullets', title: 'Levers', bullets: ['A lever is a bar that turns on a point called a fulcrum'] }, action: 'notes' });
    expect(imp.status).toBe(200);
    expect(imp.body.slide.notes).toContain('Levers');
    expect((await as(t.student).post('/api/ai/slides/generate', { topic: 'x y' })).status).toBe(403);
  });

  it('saves a deck on a unit and hides speaker notes from students', async () => {
    const unitId = String(data.courses[0].unitIds[1]);
    const bad = await as(t.admin).patch(`/api/units/${unitId}`, { type: 'presentation', slides: [{ layout: 'image-right', title: 'x', imageUrl: 'javascript:alert(1)' }] });
    expect(bad.status).toBe(400);
    const ok = await as(t.admin).patch(`/api/units/${unitId}`, {
      type: 'presentation',
      deckTheme: 'ocean',
      slides: [
        { layout: 'title', title: 'Robots', subtitle: 'Grade 6', notes: 'Welcome everyone' },
        { layout: 'bullets', title: 'Parts', bullets: ['Sensors', 'Motors'], notes: 'Point at each part' },
      ],
    });
    expect(ok.status).toBe(200);
    expect(ok.body.slides).toHaveLength(2);
    const asStudent = await as(t.student).get(`/api/units/${unitId}`);
    expect(asStudent.body.slides[1].title).toBe('Parts');
    expect(asStudent.body.slides[1].notes).toBeUndefined();
    const asTeacher = await as(t.teacher).get(`/api/units/${unitId}`);
    expect(asTeacher.body.slides[1].notes).toBe('Point at each part');
  });
});

describe('genius habit stages', async () => {
  const { stageFor, stageForScore, habitNameFor } = await import('../src/lib/genius.js');
  it('grows Seed → Sprout → Sapling → Bloom, and Fruit only with verified evidence', () => {
    expect([10, 30, 55, 72, 99].map(stageForScore)).toEqual(['seed', 'sprout', 'sapling', 'bloom', 'bloom']);
    expect(stageFor(90, false)).toBe('bloom');
    expect(stageFor(90, true)).toBe('fruit');
    expect(stageFor(80, true)).toBe('bloom');
    expect(stageFor(null, true)).toBeNull();
    expect(habitNameFor('Critical thinking')).toBe('Sharp Thinker');
  });

  it('makes visual, age-appropriate decks: graphics, new layouts, plain text and a style for the grade', async () => {
    const tidy = tidySlide({ layout: 'icons', title: '**Open** vs closed', bullets: ['**Closed circuit**: current flows', '- A battery pushes current'], icons: ['not-a-key'] });
    expect(tidy.title).toBe('Open vs closed');
    expect(tidy.bullets).toEqual(['Closed circuit: current flows', 'A battery pushes current']);
    expect(tidy.icons).toHaveLength(2);
    expect(tidy.icons?.[1]).toBe('battery');
    expect(tidySlide({ layout: 'quiz', title: 'Q', bullets: ['a', 'b'], answer: 7 }).answer).toBe(1);
    expect([themeForGrade(2), themeForGrade(6), themeForGrade(10)]).toEqual(['playful', 'ocean', 'pro']);
    const g = await as(t.admin).post('/api/ai/slides/generate', { topic: 'Simple circuits', count: 9, grade: 2 });
    expect(g.body.theme).toBe('playful');
    const layouts = g.body.slides.map((x: { layout: string }) => x.layout);
    expect(layouts).toEqual(expect.arrayContaining(['icons', 'steps', 'quiz']));
    expect(g.body.slides[0].icon).toBeTruthy();
  });

  it('plans an outline first, follows it, and explains when AI pictures need a key', async () => {
    const o = await as(t.teacher).post('/api/ai/slides/outline', { topic: 'How a simple circuit works', count: 6, grade: 9 });
    expect(o.status).toBe(200);
    expect(o.body.outline).toHaveLength(6);
    expect(o.body.theme).toBe('pro');
    expect(o.body.outline[0].title).not.toMatch(/How How/);
    const outline = [
      { title: 'Circuits', layout: 'title' },
      { title: 'Build one', layout: 'steps' },
      { title: 'Check yourself', layout: 'quiz' },
    ];
    const g = await as(t.teacher).post('/api/ai/slides/generate', { topic: 'Circuits', grade: 9, outline });
    expect(g.body.slides.map((x: { title: string }) => x.title)).toEqual(['Circuits', 'Build one', 'Check yourself']);
    expect(g.body.slides.map((x: { layout: string }) => x.layout)).toEqual(['title', 'steps', 'quiz']);
    expect((await as(t.teacher).get('/api/ai/slides/status')).body.images).toBe(false);
    const img = await as(t.teacher).post('/api/ai/slides/image', { prompt: 'A battery and a bulb joined by wires' });
    expect(img.status).toBe(400);
    expect(img.body.message ?? img.body.error?.message ?? '').toMatch(/OpenAI key/);
    expect((await as(t.student).post('/api/ai/slides/outline', { topic: 'Circuits' })).status).toBe(403);
  });
});
