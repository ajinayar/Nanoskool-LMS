import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, closeDb, resetDb, tokens, type Seeded } from './helpers.js';

let data: Seeded;
let t: Awaited<ReturnType<typeof tokens>>;
beforeAll(async () => {
  data = await resetDb();
  t = await tokens();
});
afterAll(closeDb);

describe('learning units made of content blocks', () => {
  it('saves blocks in order, sets the main type from the first block and keeps a text body', async () => {
    const admin = as(t.admin);
    const course = await admin.get(`/api/courses/${data.courses[0].course._id}`);
    const chapterId = course.body.chapters[0]._id;
    const blocks = [
      { kind: 'video', title: 'Watch first', videoUrl: 'https://www.youtube.com/watch?v=abcdefghijk', body: '<p>Watch closely.</p>' },
      { kind: 'text', title: 'Read', body: '<p>Electricity flows in a <script>x</script>loop.</p>' },
      { kind: 'presentation', slides: [{ layout: 'title', title: 'Hello', notes: 'teacher only' }] },
      { kind: 'gallery', gallery: [{ url: 'https://example.com/a.jpg', caption: 'A' }] },
      { kind: 'sim3d', simUrl: 'https://phet.colorado.edu/sims/html/circuit/latest/circuit_en.html' },
    ];
    const r = await admin.post(`/api/chapters/${chapterId}/units`, { title: 'Block unit', blocks });
    expect(r.status).toBe(201);
    expect(r.body.type).toBe('video');
    expect(r.body.blocks.map((b: { kind: string }) => b.kind)).toEqual(['video', 'text', 'presentation', 'gallery', 'sim3d']);
    expect(r.body.body).toContain('<h2>Read</h2>');
    expect(r.body.body).not.toContain('script');
    // Reorder: text first
    const re = await admin.patch(`/api/units/${r.body._id}`, { blocks: [r.body.blocks[1], r.body.blocks[0], ...r.body.blocks.slice(2)] });
    expect(re.body.type).toBe('lesson');
    expect(re.body.blocks[0].kind).toBe('text');
    expect((await admin.patch(`/api/units/${r.body._id}`, { blocks: [{ kind: 'motion', motionUrl: 'javascript:alert(1)' }] })).status).toBe(400);
    const st = await as(t.student).get(`/api/units/${r.body._id}`);
    // Published course; slide notes are hidden from students
    if (st.status === 200) expect(st.body.blocks.find((b: { kind: string }) => b.kind === 'presentation').slides[0].notes).toBeUndefined();
  });
});
