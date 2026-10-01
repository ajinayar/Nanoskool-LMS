/**
 * "Create the whole unit with AI", step 1: turn the teacher's description into a plan —
 * title, summary, time, learning objectives, and the sections to use (suggested ones ticked,
 * extra ones offered unticked, each with a reason). The teacher adjusts the plan; then each
 * section is written by blockAi.ts.
 */
import { env } from '../config/env.js';
import { HttpError } from './errors.js';
import { logger } from './logger.js';
import { aiConfig, llm } from './llm.js';
import { refContent, refTopic, type RefFile } from './refFiles.js';
import { matchResources } from './resources.js';

export const PLAN_KINDS = ['text', 'video', 'presentation', 'activity', 'pdf', 'link', 'motion', 'gallery', 'sim3d', 'check'] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];

export interface PlanSection {
  kind: PlanKind;
  title: string;
  brief: string; // what this section should cover (passed to the section writer)
  why: string; // shown to the teacher
  include: boolean;
  fileUrl?: string; // a document section showing one of the teacher's files
  gallery?: { url: string; caption?: string; alt?: string }[]; // a gallery of the teacher's pictures
}
export interface UnitPlan {
  title: string;
  summary: string;
  durationMin: number;
  grade?: number;
  objectives: { title: string; criteria: string }[];
  sections: PlanSection[];
  provider: 'anthropic' | 'openai' | 'offline';
  tokens: number;
  files?: { name: string; kind: string; words: number; note?: string }[]; // what was read from each reference file
}

const KIND_INFO: Record<PlanKind, string> = {
  text: 'Text Editor — written explanation with examples and questions',
  video: 'Video — a video to watch with a watching guide',
  presentation: 'Presentation — slides',
  activity: 'Hands-on activity — steps to build, test or try',
  pdf: 'PDF worksheet — printable questions and tables',
  link: 'External link — a trusted website or online tool (Scratch, Code.org, Tinkercad, Wokwi, NASA…)',
  motion: 'Motion graphics — a short looping animation that explains a process',
  gallery: 'Image gallery — pictures to look at closely',
  sim3d: '3D simulation — an interactive simulation (PhET, GeoGebra) or 3D model',
  check: 'Quick check — one question students must answer before the next part opens; a wrong answer shows a simpler explanation',
};

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
/** "magnets", "conductors and insulators" → plural; "electricity", "gas" → singular. */
export const isPlural = (t: string) => /\band\b|&/.test(t) || /[^su]s$/i.test(t.trim().split(/\s+/).pop() ?? '');

/** Grade, minutes and the topic, read from a free-text description. */
export function readPrompt(prompt: string) {
  const g = prompt.match(/\b(?:grade|class|std\.?|standard)\s*(\d{1,2})\b/i) ?? prompt.match(/\b(\d{1,2})(?:st|nd|rd|th)\s*(?:grade|class|std|standard)\b/i);
  const m = prompt.match(/\b(\d{1,3})\s*(?:min(?:ute)?s?|mins)\b/i) ?? prompt.match(/\b(\d)\s*(?:hours?|hrs?)\b/i);
  const minutes = m ? (/h/i.test(m[0]) ? Number(m[1]) * 60 : Number(m[1])) : undefined;
  let topic = prompt
    .split(/[.\n]/)[0]
    .replace(/\b(?:for|to)\s+(?:grade|class|std\.?|standard)\s*\d{1,2}\b.*$/i, '')
    .replace(/\b(?:grade|class)\s*\d{1,2}\b/gi, '')
    .replace(/\b\d{1,3}\s*(?:min(?:ute)?s?|mins|hours?)\b/gi, '')
    .replace(/^\s*(?:please\s+)?(?:make|create|build|design|prepare|write|plan)\s+(?:me\s+)?(?:a|an|the)?\s*(?:learning\s+)?(?:unit|lesson|class|chapter|topic)?\s*(?:on|about|for|explaining|to teach)?\s*/i, '')
    .replace(/^(?:a|an|the)\s+(?:learning\s+)?(?:unit|lesson)\s+(?:on|about)\s+/i, '')
    .replace(/[,;:\s]+$/, '')
    .trim();
  if (topic.length < 3) topic = prompt.trim().slice(0, 80);
  return { grade: g ? Math.min(12, Math.max(1, Number(g[1]))) : undefined, minutes, topic: cap(clip(topic, 90)) };
}

const WANTS: [PlanKind, RegExp][] = [
  ['video', /\bvideos?\b|\bwatch/i],
  ['presentation', /\bslides?\b|\bpresentation|\bdeck\b|\bppt\b/i],
  ['activity', /\bactivit|\bhands[- ]on|\bexperiment|\bbuild\b|\bmake\b.*\bmodel|\bproject\b|\blab\b/i],
  ['pdf', /\bworksheet|\bpdf\b|\bhandout|\bprintable/i],
  ['link', /\bwebsite|\blink\b|\bonline tool|\bscratch\b|\bcode\.org|\btinkercad|\bwokwi/i],
  ['motion', /\banimat|\bmotion\b/i],
  ['gallery', /\bgaller|\bpictures?\b|\bphotos?\b|\bimages?\b/i],
  ['sim3d', /\bsimulat|\b3d\b|\bphet\b|\bvirtual lab/i],
];

/** Sections that use the teacher's own files: their pictures as a gallery, their documents to open. */
function attachmentSections(files: RefFile[], topic: string): PlanSection[] {
  const out: PlanSection[] = [];
  const pics = files.filter((f) => f.kind === 'image');
  if (pics.length) out.push({ kind: 'gallery', title: `Pictures: ${topic}`, brief: 'Write captions that tell students what to notice in each of the teacher’s pictures.', why: `Your ${pics.length} attached picture${pics.length === 1 ? '' : 's'}`, include: true, gallery: pics.map((f) => ({ url: f.url, caption: '', alt: '' })) });
  for (const f of files.filter((x) => ['pdf', 'docx', 'pptx', 'xlsx'].includes(x.kind)))
    out.push({ kind: 'pdf', title: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '), brief: 'Tell students what to read or do in this document.', why: 'Your attached file, for students to open', include: false, fileUrl: f.url });
  return out;
}

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;
export const fileSummary = (files: RefFile[]) => files.map((f) => ({ name: f.name, kind: f.kind, words: wordCount(f.text), note: f.note }));

/** Offline plan: a sensible lesson flow for the grade, plus anything the teacher asked for. */
export function offlinePlan(prompt: string, gradeIn?: number, minutesIn?: number, files: RefFile[] = []): UnitPlan {
  const r = readPrompt(prompt);
  const grade = gradeIn ?? r.grade;
  const fromFiles = files.length && prompt.trim().split(/\s+/).length < 4 ? refTopic(files) : undefined;
  const t = cap(clip(fromFiles ?? r.topic, 90));
  const hasRef = files.some((f) => f.text);
  const little = !!grade && grade <= 3;
  const pl = isPlural(t);
  const lower = t.toLowerCase();
  const asked = new Set(WANTS.filter(([, re]) => re.test(prompt)).map(([k]) => k));
  const hasSim = matchResources('sim', `${t} ${prompt}`, grade, 1).some((x) => ((x as { score?: number }).score ?? 0) >= 2);
  const s = (kind: PlanKind, title: string, brief: string, why: string, include: boolean): PlanSection => ({ kind, title, brief: hasRef ? `${brief} Use the teacher’s attached material.` : brief, why, include: include || asked.has(kind) });
  const sections: PlanSection[] = [
    s('text', little ? `Let’s find out: ${t}` : `What ${pl ? 'are' : 'is'} ${lower}?`, `Introduce ${t} with a hook question and an everyday example.`, 'Starts the unit with the big idea in simple words.', true),
    s('video', `Watch: ${t}`, `A short video that shows ${t} in action.`, 'Seeing it helps students who learn by watching.', !little || asked.has('video')),
    s('motion', `${t} in motion`, `An animation showing how ${t} works step by step.`, 'A moving picture makes a process easy to follow.', little),
    s('gallery', `Look closely: ${t}`, `Real-life pictures of ${t} to observe and discuss.`, 'Real examples connect the idea to daily life.', little),
    s('sim3d', `Explore: ${t}`, `An interactive simulation to experiment with ${t}.`, 'Students change things and discover the rule themselves.', hasSim && !little),
    s('activity', `Try it: ${t}`, `A hands-on activity with simple, safe materials about ${t}.`, 'Learning by doing makes it stick.', true),
    s('presentation', `${t}: slides`, `Slides summarising ${t} for class teaching.`, 'Useful if you teach it to the whole class.', false),
    s('link', `Online: ${t}`, `A trusted website or tool to practise ${t}.`, 'Extra practice at school or home.', false),
    s('pdf', `Worksheet: ${t}`, `A printable worksheet to check understanding of ${t}.`, 'Gives written evidence of learning.', !little),
    s('text', 'Remember', `A short recap of the key points about ${t}, and 2 check-yourself questions.`, 'Ends with the main points to remember.', true),
  ];
  // Quick checks: after the first explanation, and before the recap
  const check = (title: string, brief: string): PlanSection => ({ kind: 'check', title, brief, why: 'Students answer before the next part opens', include: true });
  sections.splice(1, 0, check('Quick check', `One question on the big idea of ${t}.`));
  sections.splice(sections.length - 1, 0, check('Check your understanding', `One question that brings together what students learned about ${t}.`));
  // The teacher's pictures replace the generic gallery idea; their documents are offered to open
  const extra = attachmentSections(files, t);
  if (extra.some((x) => x.kind === 'gallery')) sections.splice(sections.findIndex((x) => x.kind === 'gallery'), 1, extra.shift()!);
  sections.splice(sections.length - 1, 0, ...extra);
  return {
    title: t,
    summary: little ? `Let’s discover ${lower} with pictures, stories and a fun activity!` : `Find out what ${lower} ${pl ? 'are, how they work' : 'is, how it works'} and where we see ${pl ? 'them' : 'it'} — then try it yourself.`,
    durationMin: minutesIn ?? r.minutes ?? (little ? 20 : 40),
    grade,
    objectives: [
      { title: `Explain what ${lower} ${pl ? 'are' : 'is'}`, criteria: `I can say what ${lower} ${pl ? 'are' : 'is'} in my own words.` },
      { title: `Give examples of ${lower}`, criteria: 'I can give two examples from everyday life.' },
      { title: `Use what I know about ${lower} in an activity`, criteria: 'I can try it myself and say what happened.' },
    ],
    sections,
    provider: 'offline',
    tokens: 0,
    files: fileSummary(files),
  };
}

export async function planUnit(prompt: string, grade: number | undefined, minutes: number | undefined, useAi: boolean, files: RefFile[] = []): Promise<UnitPlan> {
  if (!useAi) return offlinePlan(prompt, grade, minutes, files);
  const r0 = readPrompt(prompt || refTopic(files) || 'this unit');
  const g = grade ?? r0.grade;
  const system = `You plan learning units for Indian schools (STEM, coding, robotics, science, maths) for ${g ? `Grade ${g} (about ${g + 5} years old)` : 'school students'}. A unit is a sequence of sections. Section kinds:\n${PLAN_KINDS.map((k) => `- ${k}: ${KIND_INFO[k]}`).join('\n')}\nPlan 5–9 sections in a good teaching order (hook → explain → see → do → check → recap), keeping each part short (3–5 minutes). Put a quick check after each main idea (usually 2–3 per unit) so students answer before moving on. Mark the ones you recommend "include": true and add 2–3 more useful optional ones with "include": false. Honour any kinds the teacher asks for. If the teacher attached reference material, base the unit on it: keep its facts, order, examples and level, fill gaps, and say in each brief which part of the material to use. Return ONLY JSON: {"title": string (max 60 chars), "summary": string (1–2 sentences for students), "durationMin": number, "objectives": [{"title": "Students will be able to…" phrased as an action, "criteria": "I can…"}] (2–4), "sections": [{"kind": one of the kinds, "title": short section title, "brief": what the section should cover (1–2 sentences), "why": why it helps (max 12 words), "include": boolean}]}. Accurate facts only.`;
  const { text, tokens } = await llm({ system, maxTokens: 2500, messages: [{ role: 'user', content: [{ type: 'text', text: `Teacher's description:\n${prompt || '(none — plan the unit from the attached material)'}${minutes ? `\nTime available: ${minutes} minutes` : ''}` }, ...refContent(files)] }] });
  let raw: Partial<UnitPlan>;
  try {
    const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const src = m ? m[1] : text;
    raw = JSON.parse(src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1));
  } catch {
    throw new HttpError(502, 'ai_error', 'The AI answer could not be read. Please try again.');
  }
  const sections = (raw.sections ?? [])
    .filter((x) => PLAN_KINDS.includes(x?.kind as PlanKind))
    .slice(0, 12)
    .map((x) => ({ kind: x.kind, title: clip(String(x.title ?? ''), 200), brief: clip(String(x.brief ?? ''), 500), why: clip(String(x.why ?? ''), 120), include: x.include !== false }));
  if (!sections.length) throw new HttpError(502, 'ai_error', 'The AI answer could not be read. Please try again.');
  return {
    title: clip(String(raw.title ?? r0.topic), 200),
    summary: clip(String(raw.summary ?? ''), 1000),
    durationMin: Math.min(600, Math.max(5, Math.round(Number(raw.durationMin) || minutes || 40))),
    grade: g,
    objectives: (raw.objectives ?? [])
      .slice(0, 6)
      .map((o) => ({ title: clip(String(o.title ?? ''), 200), criteria: clip(String(o.criteria ?? ''), 300) }))
      .filter((o) => o.title),
    sections: [...sections.filter((x) => !(files.some((f) => f.kind === 'image') && x.kind === 'gallery' && !x.include)), ...attachmentSections(files, clip(String(raw.title ?? r0.topic), 60))],
    provider: (await aiConfig()).provider === 'openai' ? 'openai' : 'anthropic',
    tokens,
    files: fileSummary(files),
  };
}
