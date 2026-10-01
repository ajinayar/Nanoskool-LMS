/**
 * Units in Indian languages. AI translates a unit (title, summary, objectives and every section's text,
 * slides, captions and quick checks) into a draft; a teacher reviews and approves it before students see it.
 * Without AI, the English is copied into the draft for a teacher to translate by hand.
 */
import crypto from 'node:crypto';
import { HttpError } from './errors.js';
import { LANGUAGES, type LangCode } from './languages.js';
import { aiOn, llm } from './llm.js';
import { cleanHtml } from './sanitize.js';

export interface TBlock {
  id: string;
  kind?: string;
  title?: string;
  body?: string;
  slides?: { title?: string; subtitle?: string; bullets?: string[]; bullets2?: string[]; notes?: string; imageAlt?: string }[];
  gallery?: { caption?: string; alt?: string }[];
  question?: string;
  choices?: string[];
  explain?: string;
  help?: string;
}
export interface TContent {
  title: string;
  summary?: string;
  objectives: { id: string; title?: string; criteria?: string }[];
  blocks: TBlock[];
}

type UnitLike = {
  title: string;
  summary?: string | null;
  objectives?: { _id?: unknown; title?: string | null; criteria?: string | null }[];
  blocks?: {
    _id?: unknown;
    kind: string;
    title?: string | null;
    body?: string | null;
    slides?: { title?: string | null; subtitle?: string | null; bullets?: string[]; bullets2?: string[]; notes?: string | null; imageAlt?: string | null }[];
    gallery?: { caption?: string | null; alt?: string | null }[];
    question?: string | null;
    choices?: { text?: string | null }[];
    explain?: string | null;
    help?: string | null;
  }[];
};

const nz = <T>(v: T | null | undefined) => (v == null || v === '' ? undefined : v);

/** The English text of a unit that needs translating. */
export function sourceOf(u: UnitLike): TContent {
  return {
    title: u.title,
    summary: nz(u.summary),
    objectives: (u.objectives ?? []).map((o) => ({ id: String(o._id), title: nz(o.title), criteria: nz(o.criteria) })),
    blocks: (u.blocks ?? []).map((b) => ({
      id: String(b._id),
      kind: b.kind,
      title: nz(b.title),
      body: nz(b.body),
      slides: b.slides?.length ? b.slides.map((s) => ({ title: nz(s.title), subtitle: nz(s.subtitle), bullets: s.bullets?.length ? s.bullets : undefined, bullets2: s.bullets2?.length ? s.bullets2 : undefined, notes: nz(s.notes), imageAlt: nz(s.imageAlt) })) : undefined,
      gallery: b.gallery?.length ? b.gallery.map((g) => ({ caption: nz(g.caption), alt: nz(g.alt) })) : undefined,
      question: nz(b.question),
      choices: b.choices?.length ? b.choices.map((c) => c.text ?? '') : undefined,
      explain: nz(b.explain),
      help: nz(b.help),
    })),
  };
}

export const hashOf = (c: TContent) => crypto.createHash('sha1').update(JSON.stringify(c)).digest('hex').slice(0, 16);

const rules = (lang: LangCode, grade?: number) =>
  `Translate school lesson content from English into ${LANGUAGES[lang].name} (${LANGUAGES[lang].native}) for ${grade ? `Grade ${grade} students in India` : 'school students in India'}. ` +
  'Use the simple, natural language children speak at home and in school, not formal or literary words. ' +
  'For important science, maths and technology terms, write the usual word students would use and put the English term in brackets the first time, e.g. "परिपथ (circuit)". Keep numbers, units, formulas, code and names of apps or websites as they are. ' +
  'Keep every HTML tag and attribute exactly as it is and only translate the text between tags. Return ONLY JSON with exactly the same keys and structure as the input.';

/** Make each value in the translated object safe (HTML cleaned, only known keys kept). */
function tidy(src: TContent, out: Partial<TContent>): TContent {
  const str = (v: unknown, fallback?: string) => (typeof v === 'string' && v.trim() ? v.slice(0, 300_000) : fallback);
  const arr = (v: unknown, fallback?: string[]) => (Array.isArray(v) ? v.map((x) => String(x).slice(0, 500)) : fallback);
  return {
    title: str(out.title, src.title)!.slice(0, 200),
    summary: str(out.summary, src.summary),
    objectives: src.objectives.map((o) => {
      const t = out.objectives?.find((x) => x?.id === o.id) as TContent['objectives'][number] | undefined;
      return { id: o.id, title: str(t?.title, o.title), criteria: str(t?.criteria, o.criteria) };
    }),
    blocks: src.blocks.map((b) => {
      const t = (out.blocks?.find((x) => x?.id === b.id) ?? {}) as TBlock;
      return {
        id: b.id,
        kind: b.kind,
        title: str(t.title, b.title),
        body: b.body ? cleanHtml(str(t.body, b.body)) : undefined,
        slides: b.slides?.map((s, i) => {
          const ts = t.slides?.[i] ?? {};
          return { title: str(ts.title, s.title), subtitle: str(ts.subtitle, s.subtitle), bullets: arr(ts.bullets, s.bullets), bullets2: arr(ts.bullets2, s.bullets2), notes: str(ts.notes, s.notes), imageAlt: str(ts.imageAlt, s.imageAlt) };
        }),
        gallery: b.gallery?.map((g, i) => ({ caption: str(t.gallery?.[i]?.caption, g.caption), alt: str(t.gallery?.[i]?.alt, g.alt) })),
        question: str(t.question, b.question),
        choices: b.choices ? b.choices.map((c, i) => str(t.choices?.[i], c)!) : undefined,
        explain: str(t.explain, b.explain),
        help: b.help ? cleanHtml(str(t.help, b.help)) : undefined,
      };
    }),
  };
}

function parse(text: string): unknown {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const s = m ? m[1] : text;
  try {
    return JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
  } catch {
    throw new HttpError(502, 'ai_error', 'The AI translation could not be read. Please try again.');
  }
}

/** Translate with AI, a piece at a time (the unit's heading, then each section), so long units fit. */
export async function translateUnit(src: TContent, lang: LangCode, grade?: number): Promise<{ content: TContent; by: 'ai' | 'copy'; tokens: number }> {
  if (!(await aiOn())) return { content: src, by: 'copy', tokens: 0 };
  let tokens = 0;
  const ask = async <T>(piece: T): Promise<T> => {
    const r = await llm({ system: rules(lang, grade), messages: [{ role: 'user', content: JSON.stringify(piece) }], maxTokens: Math.min(16000, 1200 + Math.ceil(JSON.stringify(piece).length / 1.5)) });
    tokens += r.tokens;
    return parse(r.text) as T;
  };
  const head = await ask({ title: src.title, summary: src.summary, objectives: src.objectives });
  const blocks: TBlock[] = [];
  for (const b of src.blocks) {
    const hasText = b.title || b.body || b.slides || b.gallery?.some((g) => g.caption || g.alt) || b.question || b.help;
    blocks.push(hasText ? { ...(await ask(b)), id: b.id } : b);
  }
  return { content: tidy(src, { ...(head as Partial<TContent>), blocks }), by: 'ai', tokens };
}

/** Put an approved translation over the English for students. Media and settings stay from the English unit. */
export function applyTranslation<U extends UnitLike & Record<string, unknown>>(u: U, t: TContent): U {
  const tb = new Map(t.blocks.map((b) => [b.id, b]));
  const to = new Map(t.objectives.map((o) => [o.id, o]));
  return {
    ...u,
    title: t.title || u.title,
    summary: t.summary ?? u.summary,
    objectives: (u.objectives ?? []).map((o) => {
      const x = to.get(String(o._id));
      return x ? { ...o, title: x.title ?? o.title, criteria: x.criteria ?? o.criteria } : o;
    }),
    blocks: (u.blocks ?? []).map((b) => {
      const x = tb.get(String(b._id));
      if (!x) return b;
      return {
        ...b,
        title: x.title ?? b.title,
        body: x.body ?? b.body,
        slides: b.slides?.map((s, i) => ({ ...s, ...Object.fromEntries(Object.entries(x.slides?.[i] ?? {}).filter(([, v]) => v !== undefined)) })),
        gallery: b.gallery?.map((g, i) => ({ ...g, caption: x.gallery?.[i]?.caption ?? g.caption, alt: x.gallery?.[i]?.alt ?? g.alt })),
        question: x.question ?? b.question,
        choices: b.choices?.map((c, i) => ({ ...c, text: x.choices?.[i] ?? c.text })),
        explain: x.explain ?? b.explain,
        help: x.help ?? b.help,
      };
    }),
  };
}
