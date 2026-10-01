import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanSvg } from '../src/lib/blockAi.js';
import { RESOURCES } from '../src/lib/resources.js';
import { as, closeDb, resetDb, tokens } from './helpers.js';

let t: Awaited<ReturnType<typeof tokens>>;
beforeAll(async () => {
  await resetDb();
  t = await tokens();
});
afterAll(closeDb);

describe('Create with AI for every section kind (offline drafts)', () => {
  const base = { topic: 'Conductors and insulators', grade: 6 };
  it('writes text, activity and a video guide', async () => {
    const a = as(t.teacher);
    const text = await a.post('/api/ai/blocks/generate', { ...base, kind: 'text' });
    expect(text.status).toBe(200);
    expect(text.body.provider).toBe('offline');
    expect(text.body.patch.body).toContain('Key idea');
    const act = await a.post('/api/ai/blocks/generate', { ...base, kind: 'activity' });
    expect(act.body.patch.body).toContain('Steps');
    const vid = await a.post('/api/ai/blocks/generate', { ...base, kind: 'video' });
    expect(vid.body.searchUrl).toMatch(/^https:\/\/www\.youtube\.com\/results\?search_query=/);
    expect(vid.body.patch.videoUrl).toBeUndefined();
  });
  it('makes a worksheet PDF and an animation file', async () => {
    const a = as(t.teacher);
    const pdf = await a.post('/api/ai/blocks/generate', { ...base, kind: 'pdf' });
    expect(pdf.status).toBe(200);
    expect(pdf.body.patch.fileUrl).toMatch(/\.pdf$/);
    const file = await a.get(pdf.body.patch.fileUrl);
    expect(file.status).toBe(200);
    expect(String(file.headers['content-type'])).toContain('pdf');
    const mo = await a.post('/api/ai/blocks/generate', { ...base, kind: 'motion', contextHtml: '<ul><li>Metals conduct</li><li>Plastic insulates</li><li>Wires are coated</li></ul>' });
    expect(mo.body.patch.motionUrl).toMatch(/\.svg$/);
    const svg = await a.get(mo.body.patch.motionUrl);
    expect(String(svg.headers['content-type'])).toContain('svg');
  });
  it('only suggests links and simulations from the trusted list', async () => {
    const a = as(t.teacher);
    const sim = await a.post('/api/ai/blocks/generate', { ...base, kind: 'sim3d' });
    expect(sim.body.patch.simUrl).toContain('circuit-construction-kit-dc');
    const link = await a.post('/api/ai/blocks/generate', { topic: 'Coding a game with blocks', grade: 4, kind: 'link' });
    expect(RESOURCES.some((r) => r.url === link.body.patch.linkUrl)).toBe(true);
  });
  it('captions gallery pictures, or suggests pictures when there are none', async () => {
    const a = as(t.teacher);
    const none = await a.post('/api/ai/blocks/generate', { ...base, kind: 'gallery' });
    expect(none.body.patch.body).toContain('Pictures to add');
    const some = await a.post('/api/ai/blocks/generate', { ...base, kind: 'gallery', gallery: [{ url: 'https://example.com/a.jpg' }] });
    expect(some.body.patch.gallery[0].alt).toBeTruthy();
  });
  it('plans a whole unit from a description, with suggested and optional sections', async () => {
    const r = await as(t.teacher).post('/api/ai/units/plan', { prompt: 'Make a unit on magnets for grade 4, 30 minutes, with a video and a worksheet' });
    expect(r.status).toBe(200);
    expect(r.body.grade).toBe(4);
    expect(r.body.durationMin).toBe(30);
    expect(r.body.title.toLowerCase()).toContain('magnets');
    const kinds = r.body.sections.filter((s: { include: boolean }) => s.include).map((s: { kind: string }) => s.kind);
    expect(kinds).toEqual(expect.arrayContaining(['text', 'video', 'pdf', 'activity']));
    expect(r.body.sections.some((s: { include: boolean }) => !s.include)).toBe(true);
    expect(r.body.objectives.length).toBeGreaterThanOrEqual(2);
  });
  it('is for staff only', async () => {
    expect((await as(t.student).post('/api/ai/blocks/generate', { ...base, kind: 'text' })).status).toBe(403);
  });
  it('strips scripts and handlers from AI animations', () => {
    const out = cleanSvg('<svg viewBox="0 0 10 10" onload="alert(1)"><script>alert(2)</script><circle cx="5" cy="5" r="4" onclick="x()"/><foreignObject><div>hi</div></foreignObject><style>@import url(http://x); .a{fill:url(http://evil)}</style><linearGradient id="g"/></svg>');
    expect(out).not.toMatch(/script|onload|onclick|foreignObject|@import|evil/);
    expect(out).toContain('viewBox');
    expect(out).toContain('linearGradient');
  });
});
