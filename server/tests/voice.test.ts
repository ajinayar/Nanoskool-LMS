import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, closeDb, resetDb, tokens } from './helpers.js';

let t: Awaited<ReturnType<typeof tokens>>;
beforeAll(async () => {
  await resetDb();
  t = await tokens();
});
afterAll(closeDb);

describe('ElevenLabs voices (server keeps the key)', () => {
  it('answers straight away (no hanging request) and says when voice is not set up', async () => {
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_AGENT_ID;
    const r = await as(t.student).get('/api/convai-token').timeout(5000);
    expect(r.status).toBe(503);
    expect((await as(t.teacher).get('/api/convai-token')).status).toBe(403);
    const tts = await as(t.student).post('/api/ai/tts', { text: 'Hello', voiceId: 'abcdefghij1234567890' });
    expect(tts.status).toBe(503);
    expect((await as(t.student).post('/api/ai/tts', { text: 'Hello', voiceId: '../../evil' })).status).toBe(400);
  });
});
