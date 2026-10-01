/**
 * AI help for the presentation maker: draft a whole deck from a topic (or from the lesson text),
 * and rewrite one slide ("simpler", "shorter", "add an example", "speaker notes"...).
 * Uses the same provider switch as NanoBot: mock (offline, rule-based), anthropic, or nanobot (falls back to mock).
 */
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { badRequest, HttpError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { body } from '../../lib/validate.js';
import { authenticate, currentUser, requireRole, type AuthUser } from '../../middleware/auth.js';
import { AiUsage } from '../../models/index.js';
import { slideSchema } from '../curriculum/routes.js';
import { quota } from './routes.js';
import { readRefFiles, refText } from '../../lib/refFiles.js';

export const slidesAiRouter = Router();
// Guard each route (not router.use): this router is mounted at /api, so a router-wide guard would block every later route
const staff = [authenticate, requireRole('super_admin', 'school_admin', 'teacher')];

type Slide = z.infer<typeof slideSchema>;
const draftSlide = slideSchema.omit({ _id: true });
const estimateTokens = (s: string) => Math.ceil(s.length / 4);
const month = () => new Date().toISOString().slice(0, 7);
const ageFor = (g?: number) => (!g ? 'school students' : g <= 3 ? `Grade ${g} children (age ${g + 5}); use very short, simple sentences and friendly words` : g <= 7 ? `Grade ${g} students (age ${g + 5}); clear and lively` : `Grade ${g} students (age ${g + 5}); precise, exam-aware`);

/* ------------------------------------------------------------------ providers */

async function askClaude(system: string, prompt: string, maxTokens = 3000) {
  if (!env.ANTHROPIC_API_KEY) throw new HttpError(503, 'ai_unavailable', 'AI is not configured: add ANTHROPIC_API_KEY to server/.env');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: env.ANTHROPIC_MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!r.ok) {
    logger.warn({ status: r.status, body: (await r.text()).slice(0, 300) }, 'anthropic slides error');
    throw new HttpError(502, 'ai_error', 'The AI service did not answer. Try again in a minute.');
  }
  const data = (await r.json()) as { content: { type: string; text?: string }[]; usage?: { input_tokens: number; output_tokens: number } };
  const text = data.content.filter((c) => c.type === 'text').map((c) => c.text).join('');
  return { text, tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? estimateTokens(text)) };
}

/** Pull the first JSON value out of a model reply (it may wrap it in prose or ``` fences). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const src = fenced ? fenced[1] : text;
  const start = src.search(/[[{]/);
  if (start < 0) throw new Error('no json');
  const open = src[start];
  const close = open === '[' ? ']' : '}';
  const end = src.lastIndexOf(close);
  return JSON.parse(src.slice(start, end + 1));
}

function cleanSlides(raw: unknown): Slide[] {
  const arr = Array.isArray(raw) ? raw : raw && typeof raw === 'object' && Array.isArray((raw as { slides?: unknown }).slides) ? (raw as { slides: unknown[] }).slides : [];
  const out: Slide[] = [];
  for (const s of arr) {
    const r = draftSlide.safeParse({ ...(s as object), imageUrl: '' });
    if (r.success) out.push({ ...r.data, imageUrl: undefined });
  }
  return out;
}

const SLIDE_SPEC = `Each slide is a JSON object: {"layout": one of "title","section","bullets","image-right","two-column","quote", "title": string, "subtitle"?: string, "bullets"?: string[] (max 5, each under 14 words), "bullets2"?: string[] (only for two-column), "imageAlt"?: a short description of a helpful picture for this slide (only for image-right), "notes": 2-4 sentences the teacher can say}.`;

/* ------------------------------------------------------------------ offline drafts */

const strip = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const words = (s: string, n: number) => {
  const w = s.split(/\s+/);
  return w.length <= n ? s : `${w.slice(0, n).join(' ')}…`;
};

/** Turn lesson HTML into slides: one slide per heading, its list items (or sentences) as bullets. */
export function slidesFromHtml(html: string, title: string, grade?: number): Slide[] {
  const parts: { title: string; items: string[] }[] = [];
  const re = /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>|<li[^>]*>([\s\S]*?)<\/li>|<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  let cur: { title: string; items: string[] } | null = null;
  while ((m = re.exec(html))) {
    if (m[1] !== undefined) {
      cur = { title: strip(m[1]), items: [] };
      parts.push(cur);
    } else {
      const t = strip(m[2] ?? m[3] ?? '');
      if (!t) continue;
      if (!cur) {
        cur = { title, items: [] };
        parts.push(cur);
      }
      const bits = m[2] !== undefined ? [t] : t.split(/(?<=[.!?])\s+/);
      cur.items.push(...bits.filter(Boolean));
    }
  }
  const n = grade && grade <= 3 ? 8 : 12;
  const slides: Slide[] = [{ layout: 'title', title, subtitle: grade ? `Grade ${grade}` : 'Let’s learn', notes: `Introduce today's topic: ${title}.` }];
  for (const p of parts) {
    if (!p.items.length) continue;
    const items = p.items.slice(0, 5).map((x) => words(x, n));
    slides.push({ layout: items.length >= 4 ? 'image-right' : 'bullets', title: words(p.title, 10), bullets: items, imageAlt: items.length >= 4 ? p.title : undefined, notes: p.items.slice(0, 3).join(' ').slice(0, 600) });
  }
  return slides;
}

export function templateDeck(topic: string, count: number, grade?: number): Slide[] {
  const little = !!grade && grade <= 3;
  const base: Slide[] = [
    { layout: 'title', title: topic, subtitle: grade ? `Grade ${grade}` : 'Let’s explore', notes: `Welcome the class and introduce ${topic}.` },
    { layout: 'bullets', title: little ? 'Today we will…' : 'What we will learn', bullets: [`What ${topic} means`, `Where we see ${topic} around us`, 'How it works, step by step', 'Try it ourselves'], notes: 'Share the learning goals so everyone knows where we are going.' },
    { layout: 'section', title: little ? 'Let’s find out!' : 'The big idea', subtitle: `${topic} in one sentence`, notes: 'Ask the class what they already know before revealing the idea.' },
    { layout: 'image-right', title: `How ${topic} works`, bullets: ['Start with the simplest example', 'Look at each part and its job', 'See how the parts work together'], imageAlt: `A labelled diagram of ${topic}`, notes: 'Walk through the diagram part by part.' },
    { layout: 'two-column', title: 'Compare', bullets: ['Example', 'What happens'], bullets2: ['Non-example', 'What is different'], notes: 'Use examples and non-examples to sharpen understanding.' },
    { layout: 'bullets', title: little ? 'Your turn!' : 'Try it', bullets: ['Work with a partner', 'Follow the steps on your worksheet', 'Write down what you notice'], notes: 'Give 10 minutes for the activity, then collect observations.' },
    { layout: 'quote', title: `“What would happen if we changed one thing about ${topic}?”`, subtitle: 'Think, pair, share', notes: 'Give thinking time before pairs discuss.' },
    { layout: 'bullets', title: 'Quick check', bullets: ['One thing I learned', 'One question I still have', 'One place I will see this at home'], notes: 'Use as an exit ticket.' },
    { layout: 'section', title: little ? 'Great job!' : 'Recap', subtitle: `Today we explored ${topic}`, notes: 'Summarise and preview the next lesson.' },
  ];
  if (count >= base.length) return base;
  // keep first and last, drop from the middle
  return [...base.slice(0, count - 1), base[base.length - 1]];
}

function improveOffline(s: Slide, action: string): Slide {
  const b = s.bullets ?? [];
  switch (action) {
    case 'shorten':
      return { ...s, bullets: b.slice(0, 3).map((x) => words(x, 8)), subtitle: s.subtitle ? words(s.subtitle, 10) : s.subtitle };
    case 'simplify':
      return { ...s, bullets: b.map((x) => words(x.replace(/\([^)]*\)/g, '').replace(/;.*/, ''), 8)) };
    case 'example':
      return { ...s, bullets: [...b.slice(0, 4), `For example: ${s.title ?? 'try it'} at home or in class`] };
    case 'notes':
      return { ...s, notes: [`On this slide we look at ${s.title ?? 'this idea'}.`, ...b.map((x) => `Explain: ${x}.`), 'Ask one student to say it in their own words.'].join(' ') };
    case 'question':
      return { ...s, bullets: [...b.slice(0, 4), `Question: why does ${s.title?.toLowerCase() ?? 'this'} matter?`] };
    default:
      return s;
  }
}

/* ------------------------------------------------------------------ routes */

export async function meter(me: AuthUser, tokens: number) {
  await AiUsage.updateOne({ userId: me.id, month: month() }, { $inc: { tokens }, $setOnInsert: { schoolId: me.schoolId } }, { upsert: true });
}
export async function checkQuota(me: AuthUser) {
  const q = await quota(me);
  if (q.limit !== null && q.used >= q.limit) throw badRequest('This month’s AI allowance has been used');
}

slidesAiRouter.post('/ai/slides/generate', ...staff, async (req, res) => {
  const me = currentUser(req);
  const d = body(
    req,
    z.object({
      topic: z.string().trim().min(2).max(300),
      grade: z.number().int().min(1).max(12).optional(),
      count: z.number().int().min(3).max(20).default(8),
      sourceHtml: z.string().max(200_000).optional(),
      instructions: z.string().trim().max(2000).optional(),
      files: z.array(z.object({ url: z.string().max(500), name: z.string().max(300).optional() })).max(10).optional(),
    }),
  );
  await checkQuota(me);
  // Slides from the teacher's attached files: their text becomes the lesson source
  if (d.files?.length) {
    const ref = refText(await readRefFiles(d.files), 30_000);
    if (ref) {
      const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const html = ref
        .split('\n')
        .map((l) => (/^(##|===)/.test(l) ? `<h2>${esc(l.replace(/^(##|===)\s*|\s*===$/g, ''))}</h2>` : l.trim() ? (l.startsWith('• ') ? `<li>${esc(l.slice(2))}</li>` : `<p>${esc(l)}</p>`) : ''))
        .join('');
      d.sourceHtml = `${d.sourceHtml ?? ''}${html}`;
    }
  }
  if (env.AI_PROVIDER !== 'anthropic') {
    const slides = d.sourceHtml && strip(d.sourceHtml).length > 80 ? slidesFromHtml(d.sourceHtml, d.topic, d.grade).slice(0, d.count) : templateDeck(d.topic, d.count, d.grade);
    return res.json({ slides, provider: 'offline' });
  }
  const system = `You design clear, engaging classroom slide decks for ${ageFor(d.grade)} in Indian schools (STEM, coding, robotics, science). Return ONLY a JSON array of slides, no prose. ${SLIDE_SPEC} Start with a "title" slide and end with a recap. Vary the layouts. Accurate facts only.`;
  const prompt = [`Make a ${d.count}-slide deck about: ${d.topic}.`, d.instructions ? `Teacher's notes: ${d.instructions}` : '', d.sourceHtml ? `Base it on this lesson content:\n${strip(d.sourceHtml).slice(0, 12000)}` : ''].filter(Boolean).join('\n\n');
  const r = await askClaude(system, prompt, 4000);
  await meter(me, r.tokens);
  let slides: Slide[] = [];
  try {
    slides = cleanSlides(extractJson(r.text));
  } catch {
    /* fall through */
  }
  if (!slides.length) throw new HttpError(502, 'ai_error', 'The AI answer could not be read. Please try again.');
  res.json({ slides: slides.slice(0, d.count), provider: 'anthropic', tokens: r.tokens });
});

slidesAiRouter.post('/ai/slides/improve', ...staff, async (req, res) => {
  const me = currentUser(req);
  const d = body(
    req,
    z.object({
      slide: draftSlide,
      action: z.enum(['simplify', 'shorten', 'example', 'notes', 'question', 'custom']),
      instruction: z.string().trim().max(500).optional(),
      grade: z.number().int().min(1).max(12).optional(),
      topic: z.string().trim().max(300).optional(),
    }),
  );
  await checkQuota(me);
  if (env.AI_PROVIDER !== 'anthropic') return res.json({ slide: improveOffline(d.slide, d.action), provider: 'offline' });
  const ask: Record<string, string> = {
    simplify: 'Rewrite it in simpler words for the age group.',
    shorten: 'Make it shorter: at most 3 bullets of under 10 words.',
    example: 'Add one concrete, everyday example.',
    notes: 'Write helpful speaker notes (3-5 sentences) for the teacher; keep the slide text as it is.',
    question: 'Add one short check-for-understanding question as the last bullet.',
    custom: d.instruction ?? 'Improve it.',
  };
  const system = `You edit one classroom slide for ${ageFor(d.grade)}. Return ONLY the edited slide as a JSON object. ${SLIDE_SPEC} Keep the same layout unless asked.`;
  const r = await askClaude(system, `${d.topic ? `Deck topic: ${d.topic}\n` : ''}Slide:\n${JSON.stringify(d.slide)}\n\nTask: ${ask[d.action]}`, 1500);
  await meter(me, r.tokens);
  let out: Slide | undefined;
  try {
    out = cleanSlides([extractJson(r.text)])[0];
  } catch {
    /* ignore */
  }
  if (!out) throw new HttpError(502, 'ai_error', 'The AI answer could not be read. Please try again.');
  res.json({ slide: { ...out, imageUrl: d.slide.imageUrl, background: d.slide.background }, provider: 'anthropic', tokens: r.tokens });
});

slidesAiRouter.get('/ai/slides/status', ...staff, (_req, res) => {
  res.json({ provider: env.AI_PROVIDER === 'anthropic' && env.ANTHROPIC_API_KEY ? 'anthropic' : 'offline' });
});
