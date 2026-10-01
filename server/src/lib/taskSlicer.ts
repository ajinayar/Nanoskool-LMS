/** "Break it into steps": turns an assignment into 3–7 small, doable steps with minutes, in the student's language. */
import { langName } from './languages.js';
import { aiOn, llm } from './llm.js';

export interface Step {
  text: string;
  minutes: number;
}
const strip = (s = '') => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

const TEMPLATES: Record<string, Step[]> = {
  homework: [
    { text: 'Read the task and underline what you have to do', minutes: 3 },
    { text: 'Get your book, notebook and anything else you need', minutes: 2 },
    { text: 'Do the first part', minutes: 10 },
    { text: 'Do the rest', minutes: 10 },
    { text: 'Check your answers once', minutes: 5 },
    { text: 'Hand it in', minutes: 2 },
  ],
  project: [
    { text: 'Read the task and decide what you will make', minutes: 5 },
    { text: 'Draw a quick plan or list the steps', minutes: 10 },
    { text: 'Collect the materials you need', minutes: 10 },
    { text: 'Build or make the first part', minutes: 20 },
    { text: 'Finish it and test that it works', minutes: 20 },
    { text: 'Take a photo or video and write two lines about it', minutes: 10 },
    { text: 'Hand it in', minutes: 2 },
  ],
  activity: [
    { text: 'Read the steps of the activity', minutes: 3 },
    { text: 'Get everything you need ready', minutes: 5 },
    { text: 'Do the activity', minutes: 15 },
    { text: 'Write what you noticed', minutes: 5 },
    { text: 'Hand it in', minutes: 2 },
  ],
};

/** Without AI: the teacher's own numbered steps if there are any, otherwise a plan for this kind of task. */
export function offlineSteps(a: { kind?: string | null; instructions?: string | null }): Step[] {
  const items = Array.from((a.instructions ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
    .map((m) => strip(m[1]))
    .filter((x) => x.length > 2);
  if (items.length >= 2) return [...items.slice(0, 7).map((text) => ({ text: text.slice(0, 160), minutes: 5 })), { text: 'Check your work and hand it in', minutes: 3 }];
  return TEMPLATES[a.kind ?? 'homework'] ?? TEMPLATES.homework;
}

export async function sliceTask(a: { title: string; kind?: string | null; instructions?: string | null; dueDate?: Date | null }, grade?: number, lang = 'en'): Promise<{ steps: Step[]; by: 'ai' | 'offline'; tokens: number }> {
  if (!(await aiOn())) return { steps: offlineSteps(a), by: 'offline', tokens: 0 };
  const r = await llm({
    system: `You help ${grade ? `a Grade ${grade}` : 'a school'} student in India get started on schoolwork. Break the task into 3–7 small, concrete steps they can do one at a time. Each step starts with an action word, is at most 12 words, and has a realistic number of minutes (2–25). The first step must be very easy to start. Write the steps in ${langName(lang)}. Return ONLY JSON: {"steps": [{"text": string, "minutes": number}]}.`,
    messages: [{ role: 'user', content: `Task: ${a.title}\nType: ${a.kind ?? 'homework'}\n${a.dueDate ? `Due: ${a.dueDate.toISOString().slice(0, 10)}\n` : ''}Teacher's instructions: ${strip(a.instructions ?? '').slice(0, 4000) || '(none)'}` }],
    maxTokens: 800,
  });
  try {
    const m = r.text.match(/\{[\s\S]*\}/);
    const steps = ((JSON.parse(m?.[0] ?? '{}') as { steps?: Step[] }).steps ?? [])
      .slice(0, 8)
      .map((s) => ({ text: String(s.text ?? '').trim().slice(0, 160), minutes: Math.min(60, Math.max(1, Math.round(Number(s.minutes) || 5))) }))
      .filter((s) => s.text);
    if (steps.length >= 2) return { steps, by: 'ai', tokens: r.tokens };
  } catch {
    /* fall back below */
  }
  return { steps: offlineSteps(a), by: 'offline', tokens: r.tokens };
}
