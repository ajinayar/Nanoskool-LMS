import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buddyFor, buddyPrompt } from '../src/lib/buddies.js';
import { as, closeDb, resetDb, tokens } from './helpers.js';

let t: Awaited<ReturnType<typeof tokens>>;
beforeAll(async () => {
  await resetDb();
  t = await tokens();
});
afterAll(closeDb);

describe('NanoBot buddies', () => {
  it('lets a student choose a buddy and NanoBot answers as that character', async () => {
    expect((await as(t.student).patch('/api/auth/me', { prefs: { buddy: 'boyfriend' } })).status).toBe(400);
    const me = await as(t.student).patch('/api/auth/me', { prefs: { buddy: 'dadi' } });
    expect(me.body.prefs.buddy).toBe('dadi');
    expect(me.body.prefs.language).toBeDefined(); // other preferences kept
    const chat = await as(t.student).post('/api/ai/chats', {});
    const r = await as(t.student).post(`/api/ai/chats/${chat.body._id}/messages`, { content: 'What is a circuit?' });
    expect(r.status).toBe(200);
    expect(r.body.message.content).toMatch(/^Dadi Maa here!/);
  });

  it('a school can limit the buddies, and a blocked choice falls back to Nano', async () => {
    const schoolId = (await as(t.school).get('/api/auth/me')).body.school._id;
    expect((await as(t.school).patch(`/api/schools/${schoolId}`, { nanobotBuddies: ['tara', 'lakshmi-maam'] })).status).toBe(200);
    expect((await as(t.student).get('/api/auth/me')).body.school.nanobotBuddies).toEqual(['tara', 'lakshmi-maam']);
    const chat = await as(t.student).post('/api/ai/chats', {});
    const r = await as(t.student).post(`/api/ai/chats/${chat.body._id}/messages`, { content: 'Hello' });
    expect(r.body.message.content).toMatch(/^Great question!/);
    expect(buddyFor('tara', ['tara'])).toBe('tara');
    expect(buddyFor('nope', null)).toBe('nano');
  });

  it('every character keeps NanoBot honest and safe', () => {
    const p = buddyPrompt('meera');
    expect(p).toMatch(/AI/);
    expect(p).toMatch(/never act as a boyfriend, girlfriend or romantic partner/);
    expect(p).toMatch(/trusted adult/);
    expect(buddyPrompt('nano')).toBe('');
  });
});
