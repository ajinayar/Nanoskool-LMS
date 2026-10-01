/**
 * "Create with AI" for every kind of lesson section.
 *
 *   text / activity   the written lesson part or the activity steps
 *   video             a watching guide (before / while / after) and a YouTube search to find a video
 *   pdf               a printable worksheet, rendered to a PDF file
 *   link / sim3d      a website or simulation picked ONLY from the trusted list in resources.ts, plus what to do there
 *   motion            an animated SVG explainer (stored as a file), plus notes
 *   gallery           captions and alt text for the uploaded pictures (the AI looks at them), or picture ideas
 *
 * Every kind also has an offline draft, so it works without an AI key.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sanitizeHtml from 'sanitize-html';
import { env } from '../config/env.js';
import { HttpError } from './errors.js';
import { logger } from './logger.js';
import { matchResources, RESOURCES, type Resource } from './resources.js';
import { cleanHtml } from './sanitize.js';
import { aiConfig, llm } from './llm.js';
import { refContent, refPassages, type RefFile } from './refFiles.js';
import { isPlural } from './unitPlan.js';
import { saveFile } from './storage.js';
import { worksheetPdf, type Worksheet } from './worksheetPdf.js';

export type BlockKindAi = 'text' | 'video' | 'activity' | 'pdf' | 'link' | 'motion' | 'gallery' | 'sim3d' | 'check';

export interface BlockAiInput {
  kind: BlockKindAi;
  topic: string; // unit title
  sectionTitle?: string;
  grade?: number;
  instructions?: string;
  contextHtml?: string; // the rest of the unit's text
  gallery?: { url: string; caption?: string; alt?: string }[];
  refs?: RefFile[]; // the teacher's reference files, already read
}

export interface BlockAiPatch {
  title?: string;
  body?: string;
  videoUrl?: string;
  fileUrl?: string;
  linkUrl?: string;
  motionUrl?: string;
  simUrl?: string;
  gallery?: { url: string; caption?: string; alt?: string }[];
  question?: string;
  choices?: { text: string; correct: boolean }[];
  explain?: string;
  help?: string;
}

export interface BlockAiResult {
  patch: BlockAiPatch;
  provider: 'anthropic' | 'openai' | 'offline';
  tokens: number;
  message?: string;
  searchUrl?: string; // video: where to look for a video
  resource?: { title: string; url: string; about: string };
}

type Content = { type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } } | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } };

const strip = (s = '') =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
const esc = (s = '') => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const age = (g?: number) =>
  !g
    ? 'school students'
    : g <= 3
      ? `Grade ${g} children (about ${g + 5} years old): very short sentences, simple friendly words`
      : g <= 7
        ? `Grade ${g} students (about ${g + 5}): clear and lively`
        : `Grade ${g} students (about ${g + 5}): precise and exam-aware`;
const little = (g?: number) => !!g && g <= 3;
/** The subject of a title for offline sentences: "What is electricity?" → "electricity". */
export function subjectOf(title: string) {
  let t = title.trim().replace(/[?!.:]+$/, '');
  t = t.replace(/^(what|why|how|where|when)\s+(is|are|do|does|can|makes?)\s+(an?\s+|the\s+)?/i, '').replace(/^(try it|watch|explore|let'?s (learn|find out)( about)?)\s*[:\-–]?\s*/i, '');
  if (t && !/^[A-Z]{2,}/.test(t)) t = t[0].toLowerCase() + t.slice(1);
  return t || title;
}

async function callClaude(system: string, content: Content[], maxTokens: number) {
  return llm({ system, messages: [{ role: 'user', content }], maxTokens });
}

function json<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const src = fenced ? fenced[1] : text;
  const start = src.search(/[[{]/);
  const end = src.lastIndexOf(src[start] === '[' ? ']' : '}');
  if (start < 0 || end < start) throw new HttpError(502, 'ai_error', 'The AI answer could not be read. Please try again.');
  try {
    return JSON.parse(src.slice(start, end + 1)) as T;
  } catch {
    throw new HttpError(502, 'ai_error', 'The AI answer could not be read. Please try again.');
  }
}

const HTML_RULES = 'Use only these HTML tags: <p>, <h3>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>, <table>, <tr>, <th>, <td>. Wrap text in <li> and table cells in <p>. No inline styles, no images, no links.';

/* ------------------------------------------------------------------ animated SVG (motion graphics) */

const SVG_TAGS = [
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'defs',
  'linearGradient',
  'radialGradient',
  'stop',
  'style',
  'title',
  'desc',
  'animate',
  'animateTransform',
  'animateMotion',
  'clipPath',
  'mask',
];
const SVG_ATTRS =
  'viewBox xmlns width height x y x1 y1 x2 y2 cx cy r rx ry d points fill stroke stroke-width stroke-linecap stroke-linejoin stroke-dasharray stroke-dashoffset opacity fill-opacity stroke-opacity fill-rule transform transform-origin class id style font-size font-family font-weight font-style text-anchor dominant-baseline letter-spacing dx dy offset stop-color stop-opacity gradientUnits gradientTransform attributeName attributeType from to by values dur begin end repeatCount keyTimes keySplines calcMode type additive accumulate path rotate keyPoints clip-path mask preserveAspectRatio role aria-label'.split(
    ' ',
  );

/** Keep only drawing and animation: no scripts, event handlers, links, external files or embedded HTML. */
export function cleanSvg(svg: string): string {
  const inner = svg.slice(svg.indexOf('<svg'), svg.lastIndexOf('</svg>') + 6);
  if (!inner.startsWith('<svg')) throw new HttpError(502, 'ai_error', 'The AI animation could not be read. Please try again.');
  let out = sanitizeHtml(inner, {
    allowedTags: SVG_TAGS,
    allowedAttributes: { '*': SVG_ATTRS },
    allowVulnerableTags: true, // <style> is needed for CSS animation; its content is filtered below
    parser: { lowerCaseTags: false, lowerCaseAttributeNames: false },
    allowedSchemes: [],
  });
  out = out
    .replace(/@import[^;]*;?/gi, '')
    .replace(/url\(\s*(?!['"]?#)[^)]*\)/gi, 'none')
    .replace(/expression\s*\(/gi, '')
    .replace(/javascript:/gi, '');
  if (!/xmlns=/.test(out)) out = out.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  return out;
}

const PALETTE = ['#7C5CFA', '#F08C00', '#0CA678', '#E8590C', '#1C7ED6', '#C04CD8'];

/** Offline animation: the topic, then three key points appearing one after another, with a spinning "idea" icon. Loops every 12 s. */
export function templateMotionSvg(title: string, points: string[]): string {
  const pts = points.slice(0, 3).map((p) => (p.length > 46 ? `${p.slice(0, 44)}…` : p));
  const t = title.length > 34 ? `${title.slice(0, 32)}…` : title;
  const rows = pts
    .map(
      (p, i) =>
        `<g class="pt p${i}"><circle cx="330" cy="${190 + i * 78}" r="24" fill="${PALETTE[i + 1]}"/><text x="330" y="${199 + i * 78}" text-anchor="middle" font-size="24" font-weight="800" fill="#fff">${i + 1}</text><text x="372" y="${198 + i * 78}" font-size="24" font-weight="600" fill="#1F1D2B">${esc(p)}</text></g>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" font-family="Nunito, Helvetica, Arial, sans-serif" role="img" aria-label="${esc(title)}">
<style>
.bg{animation:hue 12s ease-in-out infinite}
.orb{transform-origin:150px 300px;animation:spin 6s linear infinite}
.pulse{transform-origin:150px 300px;animation:pulse 2s ease-in-out infinite}
.ttl{animation:drop 12s ease-out infinite}
.pt{opacity:0;animation:show 12s ease-out infinite}
.p0{animation-delay:1.5s}.p1{animation-delay:3.5s}.p2{animation-delay:5.5s}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
@keyframes drop{0%{opacity:0;transform:translateY(-20px)}6%,92%{opacity:1;transform:translateY(0)}100%{opacity:0}}
@keyframes show{0%{opacity:0;transform:translateX(30px)}6%,75%{opacity:1;transform:translateX(0)}85%,100%{opacity:0}}
@keyframes hue{0%,100%{fill:#F4F0FF}50%{fill:#FFF4E5}}
</style>
<rect class="bg" width="960" height="540" rx="32" fill="#F4F0FF"/>
<g class="orb"><circle cx="150" cy="170" r="16" fill="${PALETTE[1]}"/><circle cx="280" cy="300" r="12" fill="${PALETTE[2]}"/><circle cx="150" cy="430" r="14" fill="${PALETTE[3]}"/><circle cx="20" cy="300" r="10" fill="${PALETTE[4]}"/></g>
<g class="pulse"><circle cx="150" cy="300" r="78" fill="${PALETTE[0]}"/><path d="M150 252a36 36 0 0 0-20 66v14h40v-14a36 36 0 0 0-20-66z" fill="#FFE58A"/><rect x="132" y="338" width="36" height="10" rx="4" fill="#fff"/></g>
<text class="ttl" x="300" y="112" font-size="40" font-weight="900" fill="${PALETTE[0]}">${esc(t)}</text>
${rows}
</svg>`;
}

/* ------------------------------------------------------------------ offline drafts */

function pointsFrom(html = '', topic: string): string[] {
  const items = Array.from(html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
    .map((m) => strip(m[1]))
    .filter((x) => x.length > 3 && x.length < 90);
  if (items.length >= 3) return items.slice(0, 3);
  return [`What ${topic} is`, `Where we see it around us`, `Why it matters`];
}

function offlineText(i: BlockAiInput): BlockAiPatch {
  const t = subjectOf(i.sectionTitle || i.topic);
  const small = little(i.grade);
  return {
    title: i.sectionTitle || i.topic,
    body: small
      ? `<p>Have you ever wondered about <strong>${esc(t)}</strong>? Let’s find out together!</p><blockquote><p><strong>Key idea:</strong> write the one thing to remember about ${esc(t)}.</p></blockquote><ul><li><p>Look around you. Where can you see it?</p></li><li><p>Tell a friend one thing you notice.</p></li><li><p>Draw a picture of it.</p></li></ul><h3>Check yourself</h3><ol><li><p>What ${isPlural(t) ? 'are' : 'is'} ${esc(t)}?</p></li><li><p>Can you find one at home?</p></li></ol>`
      : `<p>Start with a question: <strong>what do you already know about ${esc(t)}?</strong> Write down one idea before you read on.</p><blockquote><p><strong>Key idea:</strong> explain ${esc(t)} in one clear sentence here.</p></blockquote><p>Describe the idea step by step. Use an everyday example students know, then a picture or diagram.</p><ul><li><p>First point about ${esc(t)}</p></li><li><p>Second point, with an example</p></li><li><p>Third point: why it matters</p></li></ul><blockquote><p><strong>Did you know?</strong> add a surprising fact about ${esc(t)}.</p></blockquote><h3>Check yourself</h3><ol><li><p>In your own words, what ${isPlural(t) ? 'are' : 'is'} ${esc(t)}?</p></li><li><p>Give one example from daily life.</p></li><li><p>What would happen if it were missing?</p></li></ol>`,
  };
}

function offlineActivity(i: BlockAiInput): BlockAiPatch {
  const t = subjectOf(i.sectionTitle || i.topic);
  return {
    title: i.sectionTitle || `Try it: ${i.topic}`,
    body: `<p><strong>You need:</strong></p><ul><li><p>a notebook and pencil</p></li><li><p>simple materials for ${esc(t)} (list them here)</p></li><li><p>a partner</p></li></ul><p><strong>Steps:</strong></p><ol><li><p>Predict: what do you think will happen? Write it down.</p></li><li><p>Set up the materials as shown by your teacher.</p></li><li><p>Try it and watch carefully. Change one thing and try again.</p></li><li><p>Record what you see in a table.</p></li><li><p>Compare with your prediction. Were you right?</p></li></ol><blockquote><p><strong>Safety:</strong> handle materials carefully and ask an adult if you are unsure.</p></blockquote><h3>Think about it</h3><p>Why did it happen that way? Where else could you use this idea?</p>`,
  };
}

function videoGuide(i: BlockAiInput): BlockAiPatch {
  const t = subjectOf(i.sectionTitle || i.topic);
  return {
    title: i.sectionTitle || `Watch: ${i.topic}`,
    body: `<p><strong>Before you watch:</strong> what do you think ${esc(t)} means?</p><p><strong>While you watch, look for:</strong></p><ul><li><p>the main idea</p></li><li><p>one example shown in the video</p></li><li><p>a new word to remember</p></li></ul><p><strong>After watching:</strong></p><ol><li><p>What was the most interesting part?</p></li><li><p>Explain one thing from the video to a partner.</p></li></ol>`,
  };
}

function offlineWorksheet(i: BlockAiInput): Worksheet {
  const t = subjectOf(i.sectionTitle || i.topic);
  const small = little(i.grade);
  return {
    title: i.sectionTitle || i.topic,
    subtitle: `${i.grade ? `Grade ${i.grade} · ` : ''}Worksheet`,
    instructions: small ? 'Read each question. Draw or write your answer.' : 'Answer every question in full sentences. Show your thinking.',
    sections: [
      { heading: 'Warm-up', kind: 'questions', items: [`Write one thing you already know about ${t}.`], lines: 2 },
      { heading: 'Questions', kind: 'questions', items: [`What is ${t}?`, 'Give one example from everyday life.', 'Why is it important?'], lines: small ? 2 : 3 },
      { heading: 'Draw and label', kind: 'draw', items: [`Draw a picture that shows ${t}. Label two parts.`] },
      { heading: 'I can…', kind: 'checklist', items: [`explain ${t} in my own words`, 'give an example', 'ask a good question about it'] },
    ],
  };
}

function resourceNotes(r: Resource, i: BlockAiInput): string {
  const steps =
    r.kind === 'sim'
      ? [`Open the simulation and look at everything on the screen.`, `Change one thing at a time and watch what happens.`, `Find out how ${esc(subjectOf(i.sectionTitle || i.topic))} works.`, 'Write down one rule you discovered.']
      : [`Open ${esc(r.title)} (it opens in a new tab).`, `Use it to ${esc(r.about)}.`, `Find one thing that connects to ${esc(subjectOf(i.sectionTitle || i.topic))}.`, 'Come back and share what you found.'];
  return `<p><strong>What to do:</strong></p><ol>${steps.map((s) => `<li><p>${s}</p></li>`).join('')}</ol><p><strong>Question:</strong> what surprised you?</p>`;
}

/* ------------------------------------------------------------------ offline sections from the teacher's files */

const sentences = (ps: string[]) =>
  ps
    .flatMap((p) => p.split(/(?<=[.!?])\s+/))
    .map((x) => x.trim())
    .filter((x) => x.length > 25 && x.length < 220);

/** A text or activity section made from the most relevant passages of the attached files. */
function fromRefs(i: BlockAiInput, refs: RefFile[]): BlockAiPatch {
  const about = `${i.sectionTitle ?? ''} ${i.topic} ${i.instructions ?? ''}`;
  const ps = refPassages(refs, i.kind === 'activity' ? `${about} steps materials activity experiment make build try` : about, i.kind === 'activity' ? 8 : 6);
  const t = subjectOf(i.sectionTitle || i.topic);
  if (i.kind === 'activity') {
    return { title: i.sectionTitle || `Try it: ${i.topic}`, body: `<p><strong>Steps:</strong></p><ol>${ps.slice(0, 7).map((p) => `<li><p>${esc(p)}</p></li>`).join('')}</ol><h3>Think about it</h3><p>What happened, and why? Where else could you use this?</p>` };
  }
  const [first, ...rest] = ps;
  const key = sentences([first ?? ''])[0];
  return {
    title: i.sectionTitle || t,
    body: `${first ? `<p>${esc(first)}</p>` : ''}${key ? `<blockquote><p><strong>Key idea:</strong> ${esc(key)}</p></blockquote>` : ''}${rest.map((p) => `<p>${esc(p)}</p>`).join('')}<h3>Check yourself</h3><ol><li><p>In your own words, what ${isPlural(t) ? 'are' : 'is'} ${esc(t)}?</p></li><li><p>Give one example from what you read.</p></li></ol>`,
  };
}

/** A worksheet from the attached files: fill-in-the-blanks from real sentences, then questions. */
function worksheetFromRefs(i: BlockAiInput, refs: RefFile[]): Worksheet {
  const ss = sentences(refPassages(refs, `${i.sectionTitle ?? ''} ${i.topic}`, 10));
  const blanks = ss.slice(0, 5).map((x) => {
    const w = x.split(/\s+/).map((w) => w.replace(/[^A-Za-z-]/g, '')).filter((w) => w.length > 5).sort((a, b) => b.length - a.length)[0];
    return w ? x.replace(new RegExp(`\\b${w}\\b`), '____') : x;
  });
  const base = offlineWorksheet(i);
  return { ...base, sections: [{ heading: 'Fill in the blanks', kind: 'fill', items: blanks }, ...base.sections.slice(1)] };
}

/* ------------------------------------------------------------------ quick check (offline) */

/** A multiple-choice question made from a real sentence of the lesson: one key word is hidden, other lesson words are the wrong choices. */
export function offlineCheck(i: BlockAiInput, refs: RefFile[] = []): BlockAiPatch {
  const text = `${strip(i.contextHtml)} ${refs.map((f) => f.text).join(' ')}`;
  const ss = sentences([text]).filter((x) => x.split(/\s+/).length >= 6);
  const STOP = /^(because|between|through|without|another|example|students|teacher|something|everything|different|important|remember|question|answer|yourself)$/i;
  const wordsOf = (x: string) => x.split(/\s+/).map((w) => w.replace(/[^A-Za-z-]/g, '')).filter((w) => w.length >= 5 && !STOP.test(w));
  const pool = [...new Set(wordsOf(text).map((w) => w.toLowerCase()))];
  for (const sen of ss) {
    const key = wordsOf(sen).sort((a, b) => b.length - a.length)[0];
    if (!key) continue;
    const wrong = pool.filter((w) => w !== key.toLowerCase() && Math.abs(w.length - key.length) <= 4).slice(0, 3);
    if (wrong.length < 2) continue;
    const choices = [{ text: key, correct: true }, ...wrong.map((w) => ({ text: w, correct: false }))].sort((a, b) => a.text.localeCompare(b.text));
    return {
      title: i.sectionTitle || 'Quick check',
      question: `Fill the gap: “${sen.replace(new RegExp(`\\b${key}\\b`), '_____')}”`,
      choices,
      explain: `Yes! “${sen}”`,
      help: `<p>Not quite. Read this again slowly:</p><blockquote><p>${esc(sen)}</p></blockquote><p>Which word fits the gap? Try once more.</p>`,
    };
  }
  const t = subjectOf(i.sectionTitle || i.topic);
  return {
    title: i.sectionTitle || 'Quick check',
    question: `Which sentence about ${t} is true? (Teacher: write the question and choices.)`,
    choices: [
      { text: 'Write the right answer here', correct: true },
      { text: 'Write a common mistake here', correct: false },
      { text: 'Write another wrong answer here', correct: false },
    ],
    explain: 'Say why this answer is right.',
    help: `<p>Explain the idea more simply here, with an everyday example.</p>`,
  };
}

/* ------------------------------------------------------------------ images for the AI to look at */

async function imageContent(url: string): Promise<Content | null> {
  const m = url.match(/\/files\/(.+)$/);
  if (!m) return null;
  const ext = path.extname(m[1]).slice(1).toLowerCase();
  const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' }[ext];
  if (!mime) return null;
  const root = path.resolve(env.UPLOAD_DIR);
  const file = path.resolve(root, decodeURIComponent(m[1]));
  if (!file.startsWith(root + path.sep)) return null;
  try {
    const buf = await fs.readFile(file);
    if (buf.length > 4_500_000) return null;
    return { type: 'image', source: { type: 'base64', media_type: mime, data: buf.toString('base64') } };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ main */

export async function generateBlock(i: BlockAiInput, useAi: boolean): Promise<BlockAiResult> {
  const t = i.sectionTitle || i.topic;
  const refs = i.refs ?? [];
  const hasRef = refs.some((f) => f.text || f.bytes);
  const ctx = i.contextHtml ? `\n\nThe rest of the lesson says:\n${strip(i.contextHtml).slice(0, 6000)}` : '';
  const ask = `Unit: ${i.topic}${i.sectionTitle ? `\nThis section: ${i.sectionTitle}` : ''}${i.instructions ? `\nTeacher's request: ${i.instructions}` : ''}${ctx}`;
  // The teacher's files go with every request, so sections are written from their material
  const base: Content[] = [{ type: 'text', text: hasRef ? `${ask}\n\nUse the teacher's reference material below as the main source: keep its facts, examples and level.` : ask }, ...refContent(refs, 25_000)];
  const sys = (job: string) => `You help teachers in Indian schools (STEM, coding, robotics, science, maths) build lessons for ${age(i.grade)}. ${job} Accurate facts only. Return ONLY JSON, no prose.`;
  let tokens = 0;
  const claude = async <T>(job: string, content: Content[], max = 2500) => {
    const r = await callClaude(sys(job), content, max);
    tokens += r.tokens;
    return json<T>(r.text);
  };
  const provider: BlockAiResult['provider'] = useAi ? ((await aiConfig()).provider === 'openai' ? 'openai' : 'anthropic') : 'offline';

  switch (i.kind) {
    case 'text':
    case 'activity': {
      if (!useAi) {
        if (refs.some((f) => f.text)) return { patch: fromRefs(i, refs), provider, tokens, message: 'Written from your attached files. Check and edit it.' };
        return { patch: i.kind === 'text' ? offlineText(i) : offlineActivity(i), provider, tokens };
      }
      const job =
        i.kind === 'text'
          ? `Write one section of a lesson: a hook question, the explanation with an everyday example, a "Key idea" blockquote, and 2–3 "Check yourself" questions under an <h3>. ${i.grade && i.grade <= 3 ? '120–200 words.' : '250–450 words.'} ${HTML_RULES} Reply as {"title": short section title, "html": string}.`
          : `Write a hands-on classroom activity: "You need" list (cheap, safe materials found in Indian schools/homes), numbered steps, a "Safety" blockquote if needed, and a "Think about it" question under an <h3>. ${HTML_RULES} Reply as {"title": short activity title, "html": string}.`;
      const r = await claude<{ title?: string; html: string }>(job, base);
      return { patch: { title: r.title?.slice(0, 200), body: cleanHtml(r.html) }, provider, tokens };
    }
    case 'video': {
      let patch = videoGuide(i);
      let query = `${t} explained${i.grade && i.grade <= 7 ? ' for kids' : ''}`;
      if (useAi) {
        const r = await claude<{ title?: string; html: string; searchQuery?: string }>(
          `Write a short watching guide for a video on this topic: "Before you watch" question, "While you watch, look for" list (3 things), "After watching" questions (2). ${HTML_RULES} Also give the best YouTube search words to find a good, age-appropriate video. Reply as {"title": string, "html": string, "searchQuery": string}. Do not invent video links.`,
          base,
          1500,
        );
        patch = { title: r.title?.slice(0, 200), body: cleanHtml(r.html) };
        if (r.searchQuery) query = r.searchQuery.slice(0, 120);
      }
      return { patch, provider, tokens, searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, message: 'Watching guide written. Pick a video from the YouTube search and paste its link.' };
    }
    case 'pdf': {
      let ws = refs.some((f) => f.text) ? worksheetFromRefs(i, refs) : offlineWorksheet(i);
      if (useAi) {
        const r = await claude<Worksheet>(
          `Design a one- or two-page printable worksheet. Reply as {"title": string, "subtitle": string, "instructions": string, "sections": [{"heading": string, "kind": "questions" | "fill" | "table" | "draw" | "checklist", "items": string[], "lines"?: number}]}. "fill" items are sentences with ____ blanks; "table" has ONE item with column names separated by | and "lines" = number of rows; "draw" items are drawing tasks; "checklist" items are short "I can…" endings; "lines" is answer lines per question (1–4). 3–5 sections, plain text only (no emoji).`,
          base,
          2500,
        );
        if (Array.isArray(r.sections) && r.sections.length) ws = { ...r, title: r.title || t, sections: r.sections.slice(0, 8).map((s) => ({ ...s, items: (s.items ?? []).slice(0, 12).map(String) })) };
      }
      const pdf = await worksheetPdf(ws);
      const { url } = await saveFile(pdf, 'application/pdf', 'content', 'worksheet.pdf');
      return {
        patch: { title: ws.title.slice(0, 200), fileUrl: url, body: `<p>${esc(ws.instructions ?? 'Print this worksheet or fill it in on screen.')}</p>` },
        provider,
        tokens,
        message: 'Worksheet PDF made. Open it to check, then replace it any time.',
      };
    }
    case 'link':
    case 'sim3d': {
      const kind = i.kind === 'link' ? 'link' : 'sim';
      const cands = matchResources(kind, `${i.topic} ${i.sectionTitle ?? ''} ${i.instructions ?? ''} ${strip(i.contextHtml).slice(0, 400)}`, i.grade, useAi ? 14 : 3) as (Resource & { score?: number })[];
      let pick = cands[0];
      let body = pick ? resourceNotes(pick, i) : '';
      let title = pick?.title;
      if (useAi && cands.length) {
        const r = await claude<{ resourceId: string; title?: string; html: string }>(
          `Choose the ONE most useful ${kind === 'sim' ? 'simulation' : 'website'} for this lesson from the list (by id; never invent one), then write short "What to do" steps (3–5) and 1–2 questions for students. ${HTML_RULES} Reply as {"resourceId": string, "title": section title, "html": string}.\n\nList:\n${cands.map((c) => `${c.id}: ${c.title} — ${c.about} (grades ${c.grades[0]}–${c.grades[1]})`).join('\n')}`,
          base,
          1500,
        );
        const chosen = RESOURCES.find((x) => x.id === r.resourceId && x.kind === kind);
        if (chosen) pick = chosen;
        body = cleanHtml(r.html) || resourceNotes(pick, i);
        title = r.title || pick.title;
      }
      if (!pick || (!useAi && !(pick as { score?: number }).score))
        return { patch: {}, provider, tokens, message: `No ${kind === 'sim' ? 'simulation' : 'website'} in Nanoskool’s trusted list matches this topic yet. Paste a link you trust, or ask the admin to add one.` };
      const weak = !useAi && ((pick as { score?: number }).score ?? 0) < 2;
      return {
        patch: { title: title?.slice(0, 200), body, ...(kind === 'sim' ? { simUrl: pick.url } : { linkUrl: pick.url }) },
        provider,
        tokens,
        resource: { title: pick.title, url: pick.url, about: pick.about },
        message: weak ? `Nothing matched the topic closely, so “${pick.title}” was chosen. Change it if it doesn’t fit.` : `Picked “${pick.title}” from Nanoskool’s trusted list. Open it to check it fits.`,
      };
    }
    case 'motion': {
      let points = pointsFrom(i.contextHtml, t);
      let svg = templateMotionSvg(t, points);
      let body = `<p>Watch the animation. Then say the ${points.length} key ideas in your own words.</p>`;
      let title = i.sectionTitle || `${i.topic} in motion`;
      if (useAi) {
        const r = await claude<{ title?: string; svg: string; html?: string; points?: string[] }>(
          `Create a short looping explainer animation as ONE self-contained animated SVG (viewBox "0 0 960 540", rounded background, bright child-friendly colours, large readable text, CSS @keyframes inside <style>, 8–14 second loop, shapes and labels that build up step by step to explain the idea). No <script>, no <image>, no <foreignObject>, no links, no external fonts or files. Also write 1–3 sentences telling students what to watch for (${HTML_RULES}). Reply as {"title": string, "svg": string, "html": string}.`,
          base,
          7000,
        );
        svg = cleanSvg(r.svg ?? '');
        if (r.html) body = cleanHtml(r.html);
        if (r.title) title = r.title;
        points = [];
      }
      const { url } = await saveFile(Buffer.from(svg, 'utf8'), 'image/svg+xml', 'content', 'motion.svg');
      return {
        patch: { title: title.slice(0, 200), motionUrl: url, body },
        provider,
        tokens,
        message: useAi ? 'Animation drawn by AI. Play it and check it is correct.' : 'A simple animated title card was made. With an AI key, a full explainer animation is drawn.',
      };
    }
    case 'check': {
      if (!useAi) return { patch: offlineCheck(i, refs), provider, tokens, message: 'A quick question was made from the lesson text. Check the right answer is marked.' };
      const r = await claude<{ title?: string; question: string; choices: { text: string; correct: boolean }[]; explain: string; help: string }>(
        `Write ONE quick check question that tests understanding (not memory) of what students have just learned in the lesson so far. 3–4 short choices, exactly one correct; wrong choices should be common misconceptions. "explain": 1–2 sentences on why the right answer is right. "help": for a student who got it wrong — explain the idea again more simply, step by step, with an everyday example, WITHOUT giving the answer away (${HTML_RULES}). Reply as {"title": short title, "question": string, "choices": [{"text": string, "correct": boolean}], "explain": string, "help": string}.`,
        base,
        1500,
      );
      const choices = (r.choices ?? []).slice(0, 5).map((c) => ({ text: String(c.text ?? '').slice(0, 300), correct: !!c.correct }));
      if (choices.filter((c) => c.correct).length !== 1 || choices.length < 2) return { patch: offlineCheck(i, refs), provider, tokens, message: 'The AI question was not usable, so one was made from the lesson text.' };
      return { patch: { title: r.title?.slice(0, 200), question: String(r.question ?? '').slice(0, 1000), choices, explain: String(r.explain ?? '').slice(0, 2000), help: cleanHtml(r.help ?? '') }, provider, tokens };
    }
    case 'gallery': {
      const pics = i.gallery ?? [];
      if (!pics.length) {
        let body = `<p><strong>Pictures to add:</strong></p><ul><li><p>a real-life photo of ${esc(t)}</p></li><li><p>a labelled diagram</p></li><li><p>an example and a non-example</p></li><li><p>${esc(t)} in India or at home</p></li></ul>`;
        if (useAi) {
          const r = await claude<{ html: string }>(
            `List 4–6 specific pictures a teacher should find or take for a picture gallery on this topic, each with what students should notice. ${HTML_RULES} Reply as {"html": string}.`,
            base,
            1000,
          );
          body = cleanHtml(r.html);
        }
        return { patch: { body }, provider, tokens, message: 'AI can’t make photos. Here are picture ideas — upload the pictures, then use Create with AI again to write the captions.' };
      }
      if (!useAi) {
        return {
          patch: { gallery: pics.map((g, n) => ({ ...g, caption: g.caption?.trim() || `Picture ${n + 1}: look closely. What do you notice about ${t}?`, alt: g.alt?.trim() || `Picture ${n + 1} about ${t}` })) },
          provider,
          tokens,
          message: 'Offline: simple captions added. With an AI key, the AI looks at each picture and writes real captions and alt text.',
        };
      }
      const content: Content[] = [{ type: 'text', text: `${ask}\n\nThere are ${pics.length} pictures, in order.` }];
      for (const [n, g] of pics.slice(0, 12).entries()) {
        const img = await imageContent(g.url);
        content.push({ type: 'text', text: `Picture ${n + 1}${g.caption ? ` (teacher's caption: ${g.caption})` : ''}:` });
        if (img) content.push(img);
        else content.push({ type: 'text', text: '(image not available — write a caption from the teacher caption and topic)' });
      }
      const r = await claude<{ images: { caption: string; alt: string }[] }>(
        `For each picture write a caption that tells students what to notice (max 20 words) and alt text that describes the picture for blind students (max 25 words). Reply as {"images": [{"caption": string, "alt": string}]} in the same order.`,
        content,
        2000,
      );
      const out = pics.map((g, n) => ({ ...g, caption: r.images?.[n]?.caption?.slice(0, 300) ?? g.caption, alt: r.images?.[n]?.alt?.slice(0, 300) ?? g.alt }));
      return { patch: { gallery: out }, provider, tokens, message: 'Captions and alt text written. Check each one.' };
    }
  }
}
