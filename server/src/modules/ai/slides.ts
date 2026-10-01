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
import { aiConfig, aiOn, generateImage, imageKey, llm } from '../../lib/llm.js';
import { saveFile } from '../../lib/storage.js';
import { readRefFiles, refText } from '../../lib/refFiles.js';
import { guessIcon, SLIDE_ICONS } from '../../lib/slideIcons.js';

export const slidesAiRouter = Router();
// Guard each route (not router.use): this router is mounted at /api, so a router-wide guard would block every later route
const staff = [authenticate, requireRole('super_admin', 'school_admin', 'teacher')];

type Slide = z.infer<typeof slideSchema>;
const draftSlide = slideSchema.omit({ _id: true });
const estimateTokens = (s: string) => Math.ceil(s.length / 4);
const month = () => new Date().toISOString().slice(0, 7);
const ageFor = (g?: number) =>
  !g
    ? 'school students'
    : g <= 3
      ? `Grade ${g} children (age ${g + 5}); use very short, simple sentences and friendly words`
      : g <= 7
        ? `Grade ${g} students (age ${g + 5}); clear and lively`
        : `Grade ${g} students (age ${g + 5}); precise, exam-aware`;

/* ------------------------------------------------------------------ providers */

async function askClaude(system: string, prompt: string, maxTokens = 3000) {
  return llm({ system, messages: [{ role: 'user', content: prompt }], maxTokens });
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

const ICONS = new Set<string>(SLIDE_ICONS);
/** No markdown on slides: **bold**, *italics*, `code` and leading bullets become plain text. */
export const plain = (x?: string) =>
  x
    ?.replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|\s)\*(\S[^*]*?)\*(?=\s|$|[.,!?])/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-•*]\s+/, '')
    .replace(/^#+\s*/, '')
    .trim();

/** Tidy a slide: plain text, known graphics only (a fitting one is guessed when missing), sensible quiz answer. */
export function tidySlide(s: Slide): Slide {
  const t = (v?: string) => (v === undefined ? undefined : plain(v));
  const bullets = s.bullets?.map((b) => plain(b) ?? '').filter(Boolean);
  const bullets2 = s.bullets2?.map((b) => plain(b) ?? '').filter(Boolean);
  const text = [s.title, s.subtitle, ...(bullets ?? [])].join(' ');
  const icon = s.icon && ICONS.has(s.icon) ? s.icon : ['title', 'section', 'image-right', 'fact', 'quote'].includes(s.layout) ? guessIcon(text) : undefined;
  const icons = ['icons', 'steps'].includes(s.layout) ? (bullets ?? []).map((b, i) => (s.icons?.[i] && ICONS.has(s.icons[i]) ? s.icons[i] : guessIcon(b, (['idea', 'target', 'check', 'star', 'puzzle'] as const)[i % 5]))) : undefined;
  const answer = s.layout === 'quiz' ? Math.min(Math.max(0, s.answer ?? 0), Math.max(0, (bullets?.length ?? 1) - 1)) : undefined;
  return { ...s, title: t(s.title), subtitle: t(s.subtitle), bullets, bullets2, icon, icons, answer };
}

function cleanSlides(raw: unknown): Slide[] {
  const arr = Array.isArray(raw) ? raw : raw && typeof raw === 'object' && Array.isArray((raw as { slides?: unknown }).slides) ? (raw as { slides: unknown[] }).slides : [];
  const out: Slide[] = [];
  for (const s of arr) {
    const r = draftSlide.safeParse({ ...(s as object), imageUrl: '' });
    if (r.success) out.push(tidySlide({ ...r.data, imageUrl: undefined }));
  }
  return out;
}

/** The deck style that suits the class: playful for the youngest, lively in the middle, clean and professional for seniors. */
export const themeForGrade = (g?: number) => (!g ? 'clarity' : g <= 3 ? 'playful' : g <= 7 ? 'ocean' : 'pro');

const SLIDE_SPEC = `Each slide is a JSON object with "layout" and fields:
- "title": opening slide. {"title","subtitle","icon"}
- "section": a chapter break. {"title","subtitle","icon"}
- "bullets": {"title","bullets": 3-5 short points}
- "image-right": points with a big picture. {"title","bullets","icon","imageAlt": what photo or diagram would help}
- "icons": 3-4 key ideas, each with its own picture. {"title","bullets": 3-4 short ideas (max 8 words), "icons": one graphic key per idea}
- "steps": a process or experiment in order. {"title","bullets": 3-5 steps (max 10 words), "icons": one per step}
- "two-column": compare two things. {"title","subtitle": "Left label | Right label","bullets","bullets2"}
- "fact": one striking number or fact. {"title": the number or short fact, e.g. "3,00,000 km/s", "subtitle": what it means in one sentence, "icon"}
- "quote": a big question to think about. {"title","subtitle": e.g. "Think, pair, share"}
- "quiz": a check question the class answers live. {"title": the question, "bullets": 3-4 options, "answer": index of the right option}
Every slide also gets "notes": 2-4 sentences the teacher can say.
Graphic keys ("icon"/"icons") must come from this list: ${SLIDE_ICONS.join(', ')}.
Write plain text only: no markdown, no asterisks, no emojis in titles.`;

const DESIGN = (g?: number) =>
  !g
    ? 'Mix layouts so no two neighbouring slides look the same.'
    : g <= 3
      ? 'Young children: very few words (titles under 6 words, points under 7 words), lots of pictures (prefer "icons", "steps", "fact" and "image-right"), a friendly "quiz" slide, cheerful language.'
      : g <= 7
        ? 'Lively and visual: prefer "icons", "steps", "image-right" and one "fact" slide; include 1-2 "quiz" slides; everyday Indian examples.'
        : 'Clear and professional, like a good textbook talk: precise terms, "two-column" comparisons, "steps" for processes, a "fact" slide with a real figure, 1-2 "quiz" slides that check reasoning.';

/* ------------------------------------------------------------------ offline drafts */

const strip = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
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
  let k = 0;
  for (const p of parts) {
    if (!p.items.length) continue;
    const items = p.items.slice(0, 5).map((x) => words(x, n));
    const short = items.every((x) => x.split(/\s+/).length <= 9);
    // Vary the look: ideas with pictures, a picture slide, plain points; steps when the heading sounds like a process
    const layout: Slide['layout'] = /step|how to|method|procedure|experiment|activity/i.test(p.title) ? 'steps' : short && items.length <= 4 && k % 2 === 0 ? 'icons' : k % 3 === 1 ? 'image-right' : 'bullets';
    slides.push({ layout, title: words(p.title, 10), bullets: items.slice(0, layout === 'icons' ? 4 : 5), imageAlt: layout === 'image-right' ? p.title : undefined, notes: p.items.slice(0, 3).join(' ').slice(0, 600) });
    k++;
  }
  slides.push({ layout: 'section', title: grade && grade <= 3 ? 'Great job!' : 'Recap', subtitle: `Today we learned about ${title}`, icon: 'trophy', notes: 'Ask two students to say one thing they learned.' });
  return slides;
}

export function templateDeck(topic: string, count: number, grade?: number): Slide[] {
  const little = !!grade && grade <= 3;
  // A topic phrased as a question ("How a circuit works") reads badly inside sentences, so say "it" there
  const it = /^(how|what|why|when|where|which)\b/i.test(topic.trim()) ? 'it' : topic;
  const base: Slide[] = [
    { layout: 'title', title: topic, subtitle: grade ? `Grade ${grade}` : 'Let’s explore', icon: guessIcon(topic, 'idea'), notes: `Welcome the class and introduce ${topic}.` },
    {
      layout: 'icons',
      title: little ? 'Today we will…' : 'What we will learn',
      bullets: [`What ${it} means`, `Where we see it around us`, 'How it works', 'Try it ourselves'],
      icons: ['book', 'earth', 'gear', 'tools'],
      notes: 'Share the learning goals so everyone knows where we are going.',
    },
    { layout: 'section', title: little ? 'Let’s find out!' : 'The big idea', subtitle: it === 'it' ? 'In one sentence' : `${topic} in one sentence`, icon: 'idea', notes: 'Ask the class what they already know before revealing the idea.' },
    {
      layout: 'image-right',
      title: it === 'it' ? topic : `How ${topic} works`,
      bullets: ['Start with the simplest example', 'Look at each part and its job', 'See how the parts work together'],
      icon: guessIcon(topic, 'gear'),
      imageAlt: `A labelled diagram: ${topic}`,
      notes: 'Walk through the diagram part by part.',
    },
    {
      layout: 'steps',
      title: little ? 'Your turn!' : 'Try it, step by step',
      bullets: ['Work with a partner', 'Follow the steps on your worksheet', 'Write down what you notice', 'Share with the class'],
      icons: ['people', 'book', 'pencil', 'sound'],
      notes: 'Give 10 minutes for the activity, then collect observations.',
    },
    {
      layout: 'two-column',
      title: 'Compare',
      subtitle: 'Example | Non-example',
      bullets: ['What it looks like', 'What happens'],
      bullets2: ['What is different', 'Why it does not work'],
      notes: 'Use examples and non-examples to sharpen understanding.',
    },
    { layout: 'quote', title: `What would happen if we changed one thing about ${it === 'it' ? 'this' : topic}?`, subtitle: 'Think, pair, share', notes: 'Give thinking time before pairs discuss.' },
    {
      layout: 'quiz',
      title: it === 'it' ? 'Which of these is true?' : `Which of these is about ${topic}?`,
      bullets: ['Option A (edit me)', 'Option B (edit me)', 'Option C (edit me)'],
      answer: 0,
      notes: 'Let the class vote with fingers, then reveal the answer.',
    },
    { layout: 'section', title: little ? 'Great job!' : 'Recap', subtitle: it === 'it' ? 'What we explored today' : `Today we explored ${topic}`, icon: 'trophy', notes: 'Summarise and preview the next lesson.' },
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
      files: z
        .array(z.object({ url: z.string().max(500), name: z.string().max(300).optional() }))
        .max(10)
        .optional(),
      outline: z
        .array(z.object({ title: z.string().trim().max(200), layout: slideSchema.shape.layout.optional() }))
        .max(20)
        .optional(),
    }),
  );
  if (d.outline?.length) d.count = d.outline.length;
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
  if (!(await aiOn())) {
    let slides = d.sourceHtml && strip(d.sourceHtml).length > 80 ? slidesFromHtml(d.sourceHtml, d.topic, d.grade).slice(0, d.count) : templateDeck(d.topic, d.count, d.grade);
    // Follow the teacher's outline: their titles and layouts, the draft's content where it fits
    if (d.outline?.length) slides = d.outline.map((o, i) => ({ ...(slides[i] ?? slides[slides.length - 1]), title: o.title || slides[i]?.title, layout: o.layout ?? slides[i]?.layout ?? 'bullets' }));
    return res.json({ slides: slides.map(tidySlide), provider: 'offline', theme: themeForGrade(d.grade) });
  }
  const system = `You design beautiful, engaging classroom slide decks for ${ageFor(d.grade)} in Indian schools (STEM, coding, robotics, science). Return ONLY a JSON array of slides, no prose.\n${SLIDE_SPEC}\nDesign: ${DESIGN(d.grade)} Start with a "title" slide, give every slide a fitting graphic, include at least one "quiz" slide near the end, and finish with a short recap. Never put more than 5 points on a slide. Accurate facts only.`;
  const prompt = [
    `Make a ${d.count}-slide deck about: ${d.topic}.`,
    d.outline?.length ? `Follow this outline exactly, one slide per line, in this order (use the given layout when one is shown):\n${d.outline.map((o, i) => `${i + 1}. ${o.title}${o.layout ? ` [${o.layout}]` : ''}`).join('\n')}` : '',
    'For "title" and "image-right" slides also give "imageAlt": a vivid one-sentence description of a picture to illustrate it (no words in the picture).',
    d.instructions ? `Teacher's notes: ${d.instructions}` : '',
    d.sourceHtml ? `Base it on this lesson content:\n${strip(d.sourceHtml).slice(0, 12000)}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
  const r = await askClaude(system, prompt, 4000);
  await meter(me, r.tokens);
  let slides: Slide[] = [];
  try {
    slides = cleanSlides(extractJson(r.text));
  } catch {
    /* fall through */
  }
  if (!slides.length) throw new HttpError(502, 'ai_error', 'The AI answer could not be read. Please try again.');
  res.json({ slides: slides.slice(0, d.count), provider: (await aiConfig()).provider, tokens: r.tokens, theme: themeForGrade(d.grade) });
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
  if (!(await aiOn())) return res.json({ slide: improveOffline(d.slide, d.action), provider: 'offline' });
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
  res.json({ slide: { ...out, imageUrl: d.slide.imageUrl, background: d.slide.background }, provider: (await aiConfig()).provider, tokens: r.tokens });
});

slidesAiRouter.get('/ai/slides/status', ...staff, async (_req, res) => {
  const c = await aiConfig();
  res.json({ provider: (await aiOn()) ? c.provider : 'offline', model: c.model, images: !!(await imageKey()) });
});

/* ------------------------------------------------------------------ outline first (like Gamma): agree the slides, then write them */

slidesAiRouter.post('/ai/slides/outline', ...staff, async (req, res) => {
  const me = currentUser(req);
  const d = body(
    req,
    z.object({
      topic: z.string().trim().min(2).max(300),
      grade: z.number().int().min(1).max(12).optional(),
      count: z.number().int().min(3).max(20).default(8),
      sourceHtml: z.string().max(200_000).optional(),
      instructions: z.string().trim().max(2000).optional(),
    }),
  );
  await checkQuota(me);
  const offline = () => (d.sourceHtml && strip(d.sourceHtml).length > 80 ? slidesFromHtml(d.sourceHtml, d.topic, d.grade) : templateDeck(d.topic, d.count, d.grade)).slice(0, d.count).map((x) => ({ title: x.title ?? '', layout: x.layout }));
  if (!(await aiOn())) return res.json({ outline: offline(), provider: 'offline', theme: themeForGrade(d.grade) });
  const system = `You plan classroom slide decks for ${ageFor(d.grade)} in Indian schools. Return ONLY a JSON array of {"title","layout"} — one per slide. Layouts: title, section, bullets, image-right, icons, steps, two-column, fact, quote, quiz. ${DESIGN(d.grade)} Start with "title", include at least one "quiz", end with a recap. Titles are short and specific (not "Introduction").`;
  const prompt = [`Plan ${d.count} slides about: ${d.topic}.`, d.instructions ? `Teacher's notes: ${d.instructions}` : '', d.sourceHtml ? `Base it on this lesson content:\n${strip(d.sourceHtml).slice(0, 8000)}` : ''].filter(Boolean).join('\n\n');
  const r = await askClaude(system, prompt, 1200);
  await meter(me, r.tokens);
  let outline: { title: string; layout: Slide['layout'] }[] = [];
  try {
    const raw = extractJson(r.text);
    const L = slideSchema.shape.layout;
    outline = (Array.isArray(raw) ? raw : [])
      .map((x: { title?: unknown; layout?: unknown }) => ({ title: plain(String(x?.title ?? '')) ?? '', layout: L.safeParse(x?.layout).success ? (x.layout as Slide['layout']) : 'bullets' }))
      .filter((x) => x.title)
      .slice(0, d.count);
  } catch {
    /* fall back below */
  }
  res.json({ outline: outline.length ? outline : offline(), provider: (await aiConfig()).provider, theme: themeForGrade(d.grade) });
});

/* ------------------------------------------------------------------ pictures made with AI (OpenAI image model) */

const PICTURE_STYLE = (g?: number) =>
  !g || g > 7
    ? 'Clean, modern educational illustration with soft lighting and a simple background, accurate and realistic details'
    : g <= 3
      ? "Bright, friendly children's picture-book illustration, rounded shapes, cheerful colours, simple background"
      : 'Colourful, lively educational illustration, clear shapes, simple background';

slidesAiRouter.post('/ai/slides/image', ...staff, async (req, res) => {
  const me = currentUser(req);
  const d = body(req, z.object({ prompt: z.string().trim().min(3).max(600), topic: z.string().trim().max(300).optional(), grade: z.number().int().min(1).max(12).optional() }));
  await checkQuota(me);
  const full = `${PICTURE_STYLE(d.grade)}. Show: ${d.prompt}${d.topic ? ` (for a school lesson about ${d.topic})` : ''}. Suitable for children in Indian schools, people of Indian appearance where people appear. No text, letters, numbers, labels, logos or watermarks.`;
  const png = await generateImage(full);
  const saved = await saveFile(png, 'image/png', 'content');
  await meter(me, 4000); // pictures cost more than text: count them against the school's AI allowance
  res.json({ url: saved.url });
});
