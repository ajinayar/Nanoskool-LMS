import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { offlineQuestions } from '../src/lib/quizAi.js';
import { normAnswer } from '../src/modules/assessment/routes.js';
import { as, closeDb, resetDb, tokens, type Seeded } from './helpers.js';

let data: Seeded;
let t: Awaited<ReturnType<typeof tokens>>;
const cls = (i: number) => String(data.classes[i]._id);
beforeAll(async () => {
  data = await resetDb();
  t = await tokens();
});
afterAll(closeDb);

describe('advanced quiz builder', () => {
  it('validates the new question types', async () => {
    const bad = await as(t.teacher).post('/api/quizzes', { classId: cls(0), title: 'Bad', questions: [{ type: 'short', text: 'Capital of Kerala?', points: 1 }] });
    expect(bad.status).toBe(400); // short answer needs an accepted answer
    const bad2 = await as(t.teacher).post('/api/quizzes', { classId: cls(0), title: 'Bad', questions: [{ type: 'single', text: 'x', options: ['a'], correct: [0] }] });
    expect(bad2.status).toBe(400);
  });

  it('grades short answers ignoring case and spacing, hides accepted answers, and reports the pass mark', async () => {
    const q = await as(t.teacher).post('/api/quizzes', {
      classId: cls(0),
      title: 'Circuits mix',
      status: 'published',
      passPercent: 60,
      shuffleQuestions: true,
      questions: [
        { type: 'short', text: 'What flows in a closed circuit?', accepted: ['current', 'electric current'], points: 2, hint: 'It starts with c', mediaUrl: '/files/circuit.png' },
        { type: 'true_false', text: 'Copper is a conductor.', options: ['True', 'False'], correct: [0] },
        { type: 'single', text: 'Which is an insulator?', options: ['Iron', 'Rubber', 'Copper'], correct: [1] },
      ],
    });
    expect(q.status).toBe(201);
    const view = (await as(t.student).get(`/api/quizzes/${q.body._id}`)).body;
    const short = view.questions.find((x: { type: string }) => x.type === 'short');
    expect(short.accepted).toBeUndefined();
    expect(short.hint).toBe('It starts with c');
    expect(short.mediaUrl).toBe('/files/circuit.png');
    const ids = Object.fromEntries(q.body.questions.map((x: { type: string; _id: string }) => [x.type, x._id]));
    const r = await as(t.student).post(`/api/quizzes/${q.body._id}/attempts`, {
      answers: [
        { questionId: ids.short, text: '  Electric   CURRENT. ' },
        { questionId: ids.true_false, selected: [0] },
        { questionId: ids.single, selected: [0] },
      ],
    });
    expect(r.status).toBe(201);
    expect(r.body.score).toBe(3);
    expect(r.body.maxScore).toBe(4);
    expect(r.body.passed).toBe(true);
    expect(r.body.review.find((x: { type: string }) => x.type === 'short').accepted).toEqual(['current', 'electric current']);
  });

  it('can keep the right answers hidden after submitting', async () => {
    const q = await as(t.teacher).post('/api/quizzes', { classId: cls(0), title: 'Secret', status: 'published', showAnswers: 'never', questions: [{ type: 'single', text: '2+2?', options: ['3', '4'], correct: [1], explanation: 'Four' }] });
    const r = await as(t.student).post(`/api/quizzes/${q.body._id}/attempts`, { answers: [{ questionId: q.body.questions[0]._id, selected: [0] }] });
    expect(r.body.answersShown).toBe(false);
    expect(r.body.review[0].correct).toEqual([]);
    expect(r.body.review[0].explanation).toBeUndefined();
  });

  it('writes draft questions from lesson text even with AI off', async () => {
    const text =
      'A circuit is a closed loop that lets electricity flow. A battery pushes the current around the circuit. Copper wires carry the current because copper is a conductor. Rubber stops the current because rubber is an insulator. A switch opens and closes the circuit.';
    const qs = offlineQuestions({ sourceText: text, count: 4, types: ['single', 'true_false', 'short'], difficulty: 'mixed' });
    expect(qs.length).toBeGreaterThanOrEqual(3);
    expect(new Set(qs.map((q) => q.type)).size).toBeGreaterThanOrEqual(2);
    for (const q of qs) {
      if (q.type === 'short') expect(q.accepted?.length).toBeGreaterThan(0);
      else expect(q.correct.length).toBe(1);
    }
    const r = await as(t.teacher).post('/api/ai/quizzes/generate', { topic: 'Simple circuits', count: 3, types: ['single'] });
    expect(r.status).toBe(200);
    expect(r.body.provider).toBe('offline');
    expect(r.body.questions.length).toBeGreaterThan(0);
    expect((await as(t.student).post('/api/ai/quizzes/generate', { topic: 'x y' })).status).toBe(403);
    expect(normAnswer(' Hello  World! ')).toBe('hello world');
  });
});
