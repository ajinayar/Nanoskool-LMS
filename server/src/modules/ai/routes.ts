/**
 * NanoBot AI tutor. The API keeps every conversation and meters tokens per school,
 * whatever provider answers:
 *  - mock:      offline answers for development and demos
 *  - nanobot:   forwards to the existing chatbot service (chatbot.nanoskool.in)
 *  - anthropic: calls the Claude Messages API directly
 */
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { assertCourseAccess } from '../../lib/access.js';
import { badRequest, forbidden, HttpError, notFound } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { body, idParam, objectId } from '../../lib/validate.js';
import { authenticate, currentUser, type AuthUser } from '../../middleware/auth.js';
import { AiChat, AiUsage, Course, School, Unit } from '../../models/index.js';

export const aiRouter = Router();
aiRouter.use(authenticate);

const month = () => new Date().toISOString().slice(0, 7);
const estimateTokens = (s: string) => Math.ceil(s.length / 4);
const stripHtml = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

type Msg = { role: 'user' | 'assistant'; content: string };
interface Ctx {
  user: AuthUser;
  courseTitle?: string;
  unitTitle?: string;
  unitText?: string;
  externalChatId?: string | null;
}

function systemPrompt(ctx: Ctx) {
  const who = ctx.user.role === 'teacher' ? 'a teacher planning lessons' : ctx.user.role === 'parent' ? 'a parent helping their child' : 'a school student';
  return [
    'You are NanoBot, the friendly STEM tutor inside the Nanoskool learning platform for schools in India.',
    `You are talking with ${who}. Keep answers accurate, encouraging and age-appropriate.`,
    'Explain step by step, use simple examples from robotics, coding, electronics and science, and ask a short check-for-understanding question when useful.',
    'For homework, guide the student to the answer instead of just giving it.',
    'Never ask for or repeat personal information. Politely refuse unsafe or off-topic requests and steer back to learning.',
    ctx.courseTitle ? `Current course: ${ctx.courseTitle}.` : '',
    ctx.unitTitle ? `Current unit: ${ctx.unitTitle}.` : '',
    ctx.unitText ? `Unit content for reference:\n${ctx.unitText.slice(0, 8000)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

async function mockReply(history: Msg[], ctx: Ctx) {
  const q = history.at(-1)?.content ?? '';
  const topic = ctx.unitTitle ?? ctx.courseTitle ?? 'your topic';
  return {
    text: `Great question! Let's think about "${q.slice(0, 120)}" together in the context of ${topic}.\n\n1. Start with what you already know about it.\n2. Break the problem into small steps.\n3. Try one step, then check the result.\n\n(Offline demo answer: set AI_PROVIDER to "anthropic" or "nanobot" for real tutoring.)\n\nWhat do you think the first step should be?`,
    tokens: estimateTokens(q) + 120,
  };
}

async function anthropicReply(history: Msg[], ctx: Ctx) {
  if (!env.ANTHROPIC_API_KEY) throw new HttpError(503, 'ai_unavailable', 'AI tutor is not configured');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: env.ANTHROPIC_MODEL, max_tokens: 1024, system: systemPrompt(ctx), messages: history.slice(-20) }),
  });
  if (!r.ok) {
    logger.error({ status: r.status, body: (await r.text()).slice(0, 500) }, 'Anthropic API error');
    throw new HttpError(502, 'ai_error', 'The AI tutor could not answer right now');
  }
  const data = (await r.json()) as { content: { type: string; text?: string }[]; usage?: { input_tokens: number; output_tokens: number } };
  const text = data.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  return { text, tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? estimateTokens(text)) };
}

/** Service token for the legacy NanoBot service, which expects the old JWT claims. */
function nanobotToken(user: AuthUser) {
  if (!env.NANOBOT_SERVICE_SECRET) throw new HttpError(503, 'ai_unavailable', 'NanoBot is not configured');
  return jwt.sign({ _id: user.id, name: user.name, role_name: user.role, reg_id: user.id, school_id: user.schoolId }, env.NANOBOT_SERVICE_SECRET, { expiresIn: '5m' });
}

async function nanobotReply(history: Msg[], ctx: Ctx) {
  const base = env.NANOBOT_URL.replace(/\/$/, '');
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${nanobotToken(ctx.user)}` };
  let chatId = ctx.externalChatId;
  if (!chatId) {
    const r = await fetch(`${base}/new_chat`, { method: 'POST', headers, body: '{}' });
    const d = (await r.json().catch(() => ({}))) as { chat_id?: string };
    if (!r.ok || !d.chat_id) throw new HttpError(502, 'ai_error', 'NanoBot could not start a chat');
    chatId = d.chat_id;
  }
  const q = history.at(-1)?.content ?? '';
  const r = await fetch(`${base}/chat/${encodeURIComponent(chatId)}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: q, subject_name: ctx.unitTitle ?? ctx.courseTitle ?? '' }),
  });
  const d = (await r.json().catch(() => ({}))) as { status?: string; data?: { type: string; query: string }[] };
  if (!r.ok || d.status !== 'success') throw new HttpError(502, 'ai_error', 'NanoBot could not answer right now');
  const text = (d.data ?? []).filter((m) => m.type !== 'human').map((m) => m.query).join('\n');
  return { text, tokens: estimateTokens(q) + estimateTokens(text), externalChatId: chatId };
}

async function quota(user: AuthUser) {
  const m = month();
  if (!user.schoolId) {
    const used = (await AiUsage.findOne({ userId: user.id, month: m }).lean())?.tokens ?? 0;
    return { month: m, used, limit: user.role === 'super_admin' ? null : env.AI_DEFAULT_MONTHLY_TOKENS, mine: used };
  }
  const school = await School.findById(user.schoolId).select('aiMonthlyTokens').lean();
  const rows = await AiUsage.find({ schoolId: user.schoolId, month: m }).lean();
  const used = rows.reduce((s, r) => s + (r.tokens ?? 0), 0);
  const mine = rows.find((r) => String(r.userId) === user.id)?.tokens ?? 0;
  return { month: m, used, limit: school?.aiMonthlyTokens ?? env.AI_DEFAULT_MONTHLY_TOKENS, mine };
}

aiRouter.get('/ai/usage', async (req, res) => {
  res.json({ provider: env.AI_PROVIDER, ...(await quota(currentUser(req))) });
});

aiRouter.get('/ai/chats', async (req, res) => {
  const chats = await AiChat.find({ userId: currentUser(req).id }).select('title courseId unitId updatedAt createdAt').sort({ updatedAt: -1 }).limit(100).populate('courseId', 'title').populate('unitId', 'title').lean();
  res.json(chats);
});

aiRouter.post('/ai/chats', async (req, res) => {
  const me = currentUser(req);
  const data = body(req, z.object({ courseId: objectId.optional(), unitId: objectId.optional(), title: z.string().trim().max(120).optional() }));
  if (data.unitId) {
    const unit = await Unit.findById(data.unitId).select('courseId').lean();
    if (!unit) throw notFound('Unit');
    data.courseId = String(unit.courseId);
  }
  if (data.courseId) await assertCourseAccess(me, data.courseId);
  const chat = await AiChat.create({ ...data, userId: me.id, schoolId: me.schoolId });
  res.status(201).json(chat);
});

aiRouter.get('/ai/chats/:id', async (req, res) => {
  const chat = await AiChat.findById(idParam(req)).populate('courseId', 'title').populate('unitId', 'title').lean();
  if (!chat) throw notFound('Chat');
  if (String(chat.userId) !== currentUser(req).id) throw forbidden();
  res.json(chat);
});

aiRouter.delete('/ai/chats/:id', async (req, res) => {
  const r = await AiChat.deleteOne({ _id: idParam(req), userId: currentUser(req).id });
  if (!r.deletedCount) throw notFound('Chat');
  res.json({ ok: true });
});

aiRouter.post('/ai/chats/:id/messages', async (req, res) => {
  const me = currentUser(req);
  const { content } = body(req, z.object({ content: z.string().trim().min(1).max(2000) }));
  const chat = await AiChat.findById(idParam(req));
  if (!chat) throw notFound('Chat');
  if (String(chat.userId) !== me.id) throw forbidden();
  const q = await quota(me);
  if (q.limit !== null && q.used >= q.limit) throw badRequest('Your school has used this month\'s AI allowance');

  const [course, unit] = await Promise.all([
    chat.courseId ? Course.findById(chat.courseId).select('title').lean() : null,
    chat.unitId ? Unit.findById(chat.unitId).select('title body summary').lean() : null,
  ]);
  const ctx: Ctx = {
    user: me,
    courseTitle: course?.title,
    unitTitle: unit?.title,
    unitText: unit ? stripHtml(`${unit.summary ?? ''} ${unit.body ?? ''}`) : undefined,
    externalChatId: chat.externalChatId,
  };
  const history: Msg[] = [...chat.messages.map((m) => ({ role: m.role as Msg['role'], content: m.content ?? '' })), { role: 'user', content }];
  const provider = env.AI_PROVIDER === 'anthropic' ? anthropicReply : env.AI_PROVIDER === 'nanobot' ? nanobotReply : mockReply;
  const reply = await provider(history, ctx);

  chat.messages.push({ role: 'user', content, tokens: estimateTokens(content), at: new Date() });
  chat.messages.push({ role: 'assistant', content: reply.text, tokens: reply.tokens, at: new Date() });
  if (chat.messages.length <= 2 && chat.title === 'New conversation') chat.title = content.slice(0, 60);
  if ('externalChatId' in reply && reply.externalChatId) chat.externalChatId = reply.externalChatId as string;
  await chat.save();
  await AiUsage.updateOne(
    { userId: me.id, month: month() },
    { $inc: { tokens: reply.tokens }, $setOnInsert: { schoolId: me.schoolId } },
    { upsert: true },
  );
  res.json({ message: chat.messages.at(-1), title: chat.title });
});
