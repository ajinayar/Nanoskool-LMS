import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { clearAiCache } from '../src/lib/llm.js';
import { Setting } from '../src/models/index.js';
import { as, closeDb, resetDb, tokens } from './helpers.js';

let t: Awaited<ReturnType<typeof tokens>>;
beforeAll(async () => {
  await resetDb();
  await Setting.deleteMany({});
  clearAiCache();
  t = await tokens();
});
afterAll(async () => {
  await Setting.deleteMany({});
  clearAiCache();
  await closeDb();
});
afterEach(() => vi.unstubAllGlobals());

const realFetch = globalThis.fetch;
/** Pretend to be Claude / OpenAI; everything else goes through. */
function fakeAi(calls: { url: string; body: any; headers: any }[]) {
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (!/api\.(anthropic|openai)\.com/.test(String(url))) return realFetch(url, init);
    calls.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : null, headers: init?.headers });
    if (String(url).includes('/models')) return new Response(JSON.stringify({ data: [{ id: 'gpt-4.1', created: 2 }, { id: 'whisper-1', created: 3 }, { id: 'claude-sonnet-4-5', created_at: '2025-09-29T00:00:00Z' }] }), { status: 200 });
    if (String(url).includes('anthropic')) return new Response(JSON.stringify({ content: [{ type: 'text', text: 'Nanoskool AI is ready' }], usage: { input_tokens: 5, output_tokens: 5 } }), { status: 200 });
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Hello from OpenAI' } }], usage: { total_tokens: 12 } }), { status: 200 });
  });
}

describe('Admin → AI settings', () => {
  it('is for the super admin only', async () => {
    expect((await as(t.teacher).get('/api/admin/ai-settings')).status).toBe(403);
    expect((await as(t.schoolAdmin ?? t.teacher).put('/api/admin/ai-settings').send({ provider: 'offline' })).status).toBe(403);
  });

  it('starts offline and needs a key before switching on', async () => {
    const r = await as(t.admin).get('/api/admin/ai-settings');
    expect(r.status).toBe(200);
    expect(r.body.provider).toBe('offline');
    expect((await as(t.admin).put('/api/admin/ai-settings').send({ provider: 'anthropic' })).status).toBe(400);
  });

  it('saves the key encrypted and never sends it back', async () => {
    const secret = 'sk-ant-test-0123456789abcdefghijWXYZ';
    const r = await as(t.admin).put('/api/admin/ai-settings').send({ provider: 'anthropic', anthropicKey: secret, anthropicModel: 'claude-sonnet-4-5' });
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.body)).not.toContain(secret);
    expect(r.body.anthropic.keyHint).toBe('…WXYZ');
    const doc = await Setting.findOne({ key: 'ai' }).lean();
    expect(JSON.stringify(doc)).not.toContain(secret);
    expect(JSON.stringify((await as(t.admin).get('/api/admin/ai-settings')).body)).not.toContain(secret);
  });

  it('tests the connection and lists models', async () => {
    const calls: { url: string; body: any; headers: any }[] = [];
    fakeAi(calls);
    const r = await as(t.admin).post('/api/admin/ai-settings/test').send({ provider: 'anthropic', model: 'claude-sonnet-4-5' });
    expect(r.body.ok).toBe(true);
    expect(calls[0].headers['x-api-key']).toBe('sk-ant-test-0123456789abcdefghijWXYZ');
    const m = await as(t.admin).post('/api/admin/ai-settings/models').send({ provider: 'openai', key: 'sk-openai-test-0123456789abcdefghij' });
    expect(m.body.models).toEqual(['gpt-4.1']); // audio/other models filtered out
  });

  it('switches every AI feature to OpenAI', async () => {
    const put = await as(t.admin).put('/api/admin/ai-settings').send({ provider: 'openai', openaiKey: 'sk-openai-test-0123456789abcdefghij', openaiModel: 'gpt-4.1' });
    expect(put.body.provider).toBe('openai');
    const calls: { url: string; body: any; headers: any }[] = [];
    fakeAi(calls);
    // NanoBot
    const chat = await as(t.student).post('/api/ai/chats').send({});
    const msg = await as(t.student).post(`/api/ai/chats/${chat.body._id}/messages`).send({ content: 'What is a circuit?' });
    expect(msg.body.message.content).toBe('Hello from OpenAI');
    expect(calls.at(-1)!.url).toContain('api.openai.com/v1/chat/completions');
    expect(calls.at(-1)!.body.model).toBe('gpt-4.1');
    expect(calls.at(-1)!.headers.authorization).toBe('Bearer sk-openai-test-0123456789abcdefghij');
    // Section writer uses the same provider
    const s = await as(t.teacher).get('/api/ai/slides/status');
    expect(s.body.provider).toBe('openai');
  });

  it('can go back offline', async () => {
    const r = await as(t.admin).put('/api/admin/ai-settings').send({ provider: 'offline' });
    expect(r.body.provider).toBe('offline');
    expect(r.body.openai.hasKey).toBe(true); // key kept for later
    expect((await as(t.teacher).get('/api/ai/slides/status')).body.provider).toBe('offline');
  });
});
