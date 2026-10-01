/**
 * "Create questions with AI" for the quiz builder: from the course's own lessons, a topic, or both.
 * With AI off it still makes useful drafts from the lesson text (fill-the-gap, true/false and short answers).
 */
import { HttpError } from './errors.js';
import { llm } from './llm.js';

export type QType = 'single' | 'multiple' | 'true_false' | 'short';
export interface DraftQuestion {
  type: QType;
  text: string;
  options: string[];
  correct: number[];
  accepted?: string[];
  explanation?: string;
  hint?: string;
  points: number;
}
export interface QuizAiInput {
  topic?: string;
  sourceText?: string; // the lessons' text, already stripped of HTML
  grade?: number;
  count: number;
  types: QType[];
  difficulty: 'easy' | 'mixed' | 'hard';
  avoid?: string[]; // questions already in the quiz
}

export const stripHtml = (s = '') =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

const TYPE_TEXT: Record<QType, string> = {
  single: 'one correct answer out of 4 options',
  multiple: 'two or three correct answers out of 4–5 options',
  true_false: 'a statement that is True or False (options exactly ["True","False"])',
  short: 'a short typed answer of 1–3 words, with every acceptable spelling or form in "accepted"',
};

function clean(q: Partial<DraftQuestion>): DraftQuestion | null {
  const type = (['single', 'multiple', 'true_false', 'short'] as const).includes(q.type as QType) ? (q.type as QType) : 'single';
  const text = String(q.text ?? '')
    .trim()
    .slice(0, 2000);
  if (!text) return null;
  let options = (q.options ?? [])
    .map((o) => String(o).trim().slice(0, 500))
    .filter(Boolean)
    .slice(0, 8);
  let correct = [...new Set((q.correct ?? []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < options.length))].sort();
  const accepted = (q.accepted ?? [])
    .map((a) => String(a).trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, 10);
  if (type === 'true_false') {
    const truth = correct[0] === 1 ? 1 : 0;
    options = ['True', 'False'];
    correct = [truth];
  }
  if (type === 'short') {
    if (!accepted.length) return null;
    options = [];
    correct = [];
  } else {
    if (options.length < 2 || !correct.length) return null;
    if (type === 'single' && correct.length !== 1) correct = [correct[0]];
  }
  return {
    type,
    text,
    options,
    correct,
    ...(type === 'short' ? { accepted } : {}),
    explanation: q.explanation ? String(q.explanation).slice(0, 2000) : undefined,
    hint: q.hint ? String(q.hint).slice(0, 500) : undefined,
    points: Math.max(1, Math.min(10, Number(q.points) || 1)),
  };
}

function readJson(text: string): { questions?: Partial<DraftQuestion>[] } {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const src = fenced ? fenced[1] : text;
  const start = src.indexOf('{');
  const end = src.lastIndexOf('}');
  if (start < 0 || end < start) throw new HttpError(502, 'ai_error', 'The AI answer could not be read. Please try again.');
  try {
    return JSON.parse(src.slice(start, end + 1));
  } catch {
    throw new HttpError(502, 'ai_error', 'The AI answer could not be read. Please try again.');
  }
}

async function withAi(i: QuizAiInput) {
  const who = !i.grade ? 'school students' : i.grade <= 3 ? `Grade ${i.grade} children (very short, simple sentences)` : `Grade ${i.grade} students`;
  const system = [
    `You write quiz questions for ${who} in Indian schools. Questions check understanding and application, not memorised wording.`,
    'Wrong options must be plausible common mistakes, similar in length to the right answer. Never use "All of the above" or "None of the above".',
    'Each question gets a one-sentence explanation of why the answer is right, and a gentle hint that does not give the answer away.',
    'Reply with JSON only: {"questions":[{"type","text","options","correct","accepted","explanation","hint","points"}]}. "correct" holds 0-based indexes into "options".',
  ].join('\n');
  const user = [
    `Write ${i.count} questions. Difficulty: ${i.difficulty}.`,
    `Use these question types, mixed: ${i.types.map((t) => `${t} (${TYPE_TEXT[t]})`).join('; ')}.`,
    i.topic ? `Topic: ${i.topic}` : '',
    i.sourceText ? `Base every question on this lesson content only:\n"""\n${i.sourceText.slice(0, 24_000)}\n"""` : '',
    i.avoid?.length ? `Do not repeat these existing questions:\n- ${i.avoid.slice(0, 40).join('\n- ')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
  const r = await llm({ system, messages: [{ role: 'user', content: user }], maxTokens: 4000 });
  const out = (readJson(r.text).questions ?? []).map(clean).filter((q): q is DraftQuestion => !!q && i.types.includes(q.type));
  return { questions: out.slice(0, i.count), tokens: r.tokens };
}

/* ------------------------------------------------------------------ offline drafts from the lesson text */

const STOP =
  /^(because|between|through|without|another|example|students|teacher|something|everything|different|important|remember|question|answer|yourself|these|those|their|there|which|where|while|about|other|would|could|should|around|every|makes|using|always|never|often|people|things|really|after|before|being|first|course|lesson|lessons|today|might|until|again|still|later|little|great|today|start|thing)$/i;
const sentencesOf = (t: string) =>
  t
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 30 && x.length < 220 && x.split(/\s+/).length >= 6 && !/\?$/.test(x));
const wordsOf = (x: string) =>
  x
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z-]/g, ''))
    .filter((w) => w.length >= 5 && !STOP.test(w));

export function offlineQuestions(i: QuizAiInput): DraftQuestion[] {
  const text = i.sourceText ?? '';
  const ss = sentencesOf(text);
  const pool = [...new Set(wordsOf(text).map((w) => w.toLowerCase()))];
  const out: DraftQuestion[] = [];
  const used = new Set<string>();
  let t = 0;
  for (const sen of ss) {
    if (out.length >= i.count) break;
    const key = wordsOf(sen).sort((a, b) => b.length - a.length)[0];
    if (!key || used.has(key.toLowerCase())) continue;
    const wrong = pool.filter((w) => w !== key.toLowerCase() && Math.abs(w.length - key.length) <= 4 && !sen.toLowerCase().includes(w)).slice(0, 3);
    const type = i.types[t % i.types.length];
    const gap = sen.replace(new RegExp(`\\b${key}\\b`), '_____');
    let q: DraftQuestion | null = null;
    if ((type === 'single' || type === 'multiple') && wrong.length >= 3) {
      const opts = [key, ...wrong].sort((a, b) => a.localeCompare(b));
      q = { type: 'single', text: `Which word fills the gap? “${gap}”`, options: opts, correct: [opts.indexOf(key)], explanation: `“${sen}”`, hint: 'Read the sentence aloud with each word and choose the one that makes sense.', points: 1 };
    } else if (type === 'true_false' && wrong.length >= 1) {
      const isTrue = t % 2 === 0;
      q = {
        type: 'true_false',
        text: isTrue ? sen : sen.replace(new RegExp(`\\b${key}\\b`), wrong[0]),
        options: ['True', 'False'],
        correct: [isTrue ? 0 : 1],
        explanation: isTrue ? 'Yes — this is what the lesson says.' : `It should say: “${sen}”`,
        hint: 'Check each important word against the lesson.',
        points: 1,
      };
    } else if (type === 'short') {
      q = { type: 'short', text: `Fill the gap: “${gap}”`, options: [], correct: [], accepted: [key], explanation: `“${sen}”`, hint: `The word starts with “${key[0]}”.`, points: 1 };
    }
    if (q) {
      out.push(q);
      used.add(key.toLowerCase());
      t++;
    }
  }
  // Nothing to build from: a few placeholders the teacher completes
  const topic = i.topic || 'this topic';
  for (let n = 0; !out.length && n < Math.min(3, i.count); n++) {
    const type = i.types[n % i.types.length];
    out.push(
      type === 'short'
        ? { type, text: `(Teacher: write a question about ${topic} with a one-word answer)`, options: [], correct: [], accepted: ['answer'], points: 1 }
        : type === 'true_false'
          ? { type, text: `(Teacher: write a true or false statement about ${topic})`, options: ['True', 'False'], correct: [0], points: 1 }
          : { type: 'single', text: `(Teacher: write a question about ${topic})`, options: ['The right answer', 'A common mistake', 'Another wrong answer', 'A third wrong answer'], correct: [0], points: 1 },
    );
  }
  return out.slice(0, i.count);
}

export async function generateQuestions(i: QuizAiInput, useAi: boolean): Promise<{ questions: DraftQuestion[]; provider: 'ai' | 'offline'; tokens: number }> {
  if (useAi) {
    const r = await withAi(i);
    if (r.questions.length) return { questions: r.questions, provider: 'ai', tokens: r.tokens };
  }
  return { questions: offlineQuestions(i), provider: 'offline', tokens: 0 };
}
