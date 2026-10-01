import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, as, closeDb, resetDb, tokens } from './helpers.js';

let t: Awaited<ReturnType<typeof tokens>>;
beforeAll(async () => {
  await resetDb();
  t = await tokens();
});
afterAll(closeDb);

const MIME: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
  png: 'image/png',
};
async function up(name: string) {
  const file = path.join(__dirname, 'fixtures', name);
  const r = await request(app)
    .post('/api/uploads?folder=content')
    .set('Authorization', `Bearer ${t.admin}`)
    .attach('file', fs.readFileSync(file), { filename: name, contentType: MIME[name.split('.').pop()!] });
  expect(r.status).toBe(201);
  return { url: r.body.url as string, name };
}

describe('Create a unit from reference files', () => {
  it('reads Word, PowerPoint, Excel, PDF and pictures, and plans the unit from them', async () => {
    const files = [await up('magnets.docx'), await up('magnets.pptx'), await up('results.xlsx'), await up('magnets.pdf'), await up('bar-magnet.png')];
    const r = await as(t.admin).post('/api/ai/units/plan', { prompt: '', grade: 6, files });
    expect(r.status).toBe(200);
    expect(r.body.title).toMatch(/magnet/i);
    const byName = Object.fromEntries(r.body.files.map((f: { name: string; words: number }) => [f.name, f.words]));
    expect(byName['magnets.docx']).toBeGreaterThan(40);
    expect(byName['magnets.pptx']).toBeGreaterThan(8);
    expect(byName['results.xlsx']).toBeGreaterThan(5);
    expect(byName['magnets.pdf']).toBeGreaterThan(5);
    const gallery = r.body.sections.find((s: { kind: string; gallery?: unknown[] }) => s.kind === 'gallery' && s.gallery?.length);
    expect(gallery.include).toBe(true);
    expect(r.body.sections.some((s: { kind: string; fileUrl?: string }) => s.kind === 'pdf' && s.fileUrl?.endsWith('.docx'))).toBe(true);

    // Sections are written from the files' own text
    const text = await as(t.admin).post('/api/ai/blocks/generate', { kind: 'text', topic: 'Magnets', sectionTitle: 'Poles of a magnet', grade: 6, files });
    expect(text.body.patch.body).toContain('Like poles repel');
    const act = await as(t.admin).post('/api/ai/blocks/generate', { kind: 'activity', topic: 'Magnets', sectionTitle: 'Make a compass', grade: 6, files });
    expect(act.body.patch.body).toContain('sewing needle');
    const ws = await as(t.admin).post('/api/ai/blocks/generate', { kind: 'pdf', topic: 'Magnets', grade: 6, files });
    expect(ws.body.patch.fileUrl).toMatch(/\.pdf$/);
    const deck = await as(t.admin).post('/api/ai/slides/generate', { topic: 'Magnets', grade: 6, files });
    expect(JSON.stringify(deck.body.slides)).toMatch(/Magnetic or not|poles/i);
  });
  it('asks for a description or a file', async () => {
    expect((await as(t.admin).post('/api/ai/units/plan', { prompt: '' })).status).toBe(400);
  });
  it('never reads files outside the upload folder', async () => {
    const r = await as(t.admin).post('/api/ai/units/plan', { prompt: 'Magnets for grade 6', files: [{ url: '/files/../../package.json' }] });
    expect(r.status).toBe(200);
    expect(r.body.files[0].words).toBe(0);
  });
});
