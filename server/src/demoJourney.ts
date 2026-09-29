/**
 * Demo data for the learning journey, added to an existing database (nothing is deleted):
 *   - the eight starting 21st-century skills with level descriptions
 *   - an item bank and a published skills mission for each grade band
 *   - Super Tutor and Debating App registered as built-in demo tools
 *   - learning objectives and outcome activities for every learning unit of the demo courses
 *   - parent consent for the demo students (as if the paper forms were signed)
 *
 *   npm run demo:journey
 */
import mongoose, { Types } from 'mongoose';
import { connectDb } from './db.js';
import { randomToken } from './lib/tokens.js';
import { AssessmentForm, AssessmentItem, Course, Quiz, Skill, ToolIntegration, Unit, User } from './models/index.js';

const SKILLS = [
  { name: 'Critical thinking', color: '#C9B8F4', description: 'Asks why, weighs evidence and reasons to a conclusion.' },
  { name: 'Creativity', color: '#F8AE92', description: 'Comes up with new ideas and tries different ways.' },
  { name: 'Communication', color: '#AAC4F2', description: 'Explains ideas clearly in words, pictures and demonstrations.' },
  { name: 'Collaboration', color: '#B9E3C9', description: 'Listens, shares roles and builds on others’ ideas.' },
  { name: 'Problem solving', color: '#F6DB8E', description: 'Breaks a problem down, tests and improves a solution.' },
  { name: 'Digital and AI literacy', color: '#D6E4FB', description: 'Uses technology and AI safely, and checks what it says.' },
  { name: 'Curiosity and initiative', color: '#FCE0B8', description: 'Asks questions and explores without being told.' },
  { name: 'Self-management', color: '#F8D3E6', description: 'Plans, keeps going and reflects on their own learning.' },
];
const LEVELS = {
  emerging: 'Starting to show this with help',
  developing: 'Shows this sometimes, with some support',
  proficient: 'Shows this reliably on their own',
  advanced: 'Shows this in new situations and helps others',
};

type ItemSeed = { type: 'single' | 'multiple' | 'scale' | 'open' | 'upload'; prompt: string; skills: string[]; options?: [string, number][]; scale?: string[]; rubric?: string[] };
const SCALE = ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'];
const RUBRIC = ['Idea is unclear', 'One simple idea', 'A clear idea with a reason', 'A clear, original idea with reasons and an example'];

const BANK: Record<'little' | 'junior' | 'senior', ItemSeed[]> = {
  little: [
    { type: 'single', prompt: 'Nano wants to keep ice cream cold on a hot day. What should he use?', skills: ['Problem solving', 'Critical thinking'], options: [['A cool box', 1], ['A sunny window', 0], ['A warm blanket', 0.3]] },
    { type: 'single', prompt: 'Your friend is sad because their tower fell. What do you do?', skills: ['Collaboration'], options: [['Help build it again together', 1], ['Laugh at it', 0], ['Walk away', 0]] },
    { type: 'single', prompt: 'Which one does NOT belong: apple, banana, car, mango?', skills: ['Critical thinking'], options: [['Apple', 0], ['Car', 1], ['Mango', 0]] },
    { type: 'multiple', prompt: 'Tap everything you could make with an empty box.', skills: ['Creativity'], options: [['A robot', 0.34], ['A car', 0.33], ['A house', 0.33], ['Nothing', 0]] },
    { type: 'scale', prompt: 'I ask questions when I want to know something.', skills: ['Curiosity and initiative'], scale: SCALE },
    { type: 'scale', prompt: 'I finish a puzzle even when it is hard.', skills: ['Self-management'], scale: SCALE },
    { type: 'single', prompt: 'A tablet asks for your home address. What should you do?', skills: ['Digital and AI literacy'], options: [['Ask a grown-up first', 1], ['Type it in', 0]] },
    { type: 'upload', prompt: 'Draw your dream invention and take a photo of it.', skills: ['Creativity', 'Communication'], rubric: RUBRIC },
  ],
  junior: [
    { type: 'single', prompt: 'You want to test which paper plane flies furthest. What makes it a fair test?', skills: ['Critical thinking', 'Problem solving'], options: [['Change only the plane design each time', 1], ['Throw each one differently', 0], ['Test only once', 0.2]] },
    { type: 'single', prompt: 'Your group disagrees about a project idea. What is the best next step?', skills: ['Collaboration', 'Communication'], options: [['Listen to each idea, then vote or combine', 1], ['Do your own idea anyway', 0], ['Stop working', 0]] },
    { type: 'multiple', prompt: 'Which of these can you check to see if a website is trustworthy?', skills: ['Digital and AI literacy', 'Critical thinking'], options: [['Who wrote it', 0.34], ['If other sources agree', 0.33], ['When it was updated', 0.33], ['How colourful it is', 0]] },
    { type: 'single', prompt: 'A robot keeps turning left instead of right. What do you do first?', skills: ['Problem solving'], options: [['Check one part at a time', 1], ['Rebuild everything', 0.2], ['Give up', 0]] },
    { type: 'scale', prompt: 'I try a new way when my first idea does not work.', skills: ['Creativity', 'Self-management'], scale: SCALE },
    { type: 'scale', prompt: 'I explore topics on my own after class.', skills: ['Curiosity and initiative'], scale: SCALE },
    { type: 'scale', prompt: 'I plan my homework before I start.', skills: ['Self-management'], scale: SCALE },
    { type: 'open', prompt: 'Think of a problem at your school. Describe one clever way to solve it.', skills: ['Creativity', 'Problem solving', 'Communication'], rubric: RUBRIC },
  ],
  senior: [
    { type: 'single', prompt: 'An AI chatbot gives you a surprising fact for a report. What is the best action?', skills: ['Digital and AI literacy', 'Critical thinking'], options: [['Verify it in two reliable sources', 1], ['Use it as is', 0], ['Ask the chatbot if it is sure', 0.3]] },
    { type: 'single', prompt: 'A survey of 10 friends says 90% like a new app. What is the main weakness?', skills: ['Critical thinking'], options: [['The sample is small and not random', 1], ['The app is new', 0], ['Nothing, 90% is high', 0]] },
    { type: 'single', prompt: 'Your team member misses deadlines. What do you do?', skills: ['Collaboration', 'Communication'], options: [['Talk privately, understand why, agree a plan', 1], ['Complain to the teacher first', 0.3], ['Do their part silently', 0.2]] },
    { type: 'multiple', prompt: 'Which steps belong in designing a solution?', skills: ['Problem solving'], options: [['Define the problem', 0.25], ['Prototype', 0.25], ['Test and improve', 0.25], ['Research users', 0.25], ['Skip testing to save time', 0]] },
    { type: 'scale', prompt: 'I set goals for my learning and track them.', skills: ['Self-management'], scale: SCALE },
    { type: 'scale', prompt: 'I start projects on topics that interest me.', skills: ['Curiosity and initiative'], scale: SCALE },
    { type: 'scale', prompt: 'I can explain complex ideas simply to others.', skills: ['Communication'], scale: SCALE },
    { type: 'open', prompt: 'Propose a small invention that helps your community. Explain who it helps and how you would test it.', skills: ['Creativity', 'Problem solving', 'Communication'], rubric: RUBRIC },
  ],
};
const MISSION = { little: 'Play with Nano', junior: 'Quest mission', senior: 'Skills challenge' } as const;

/** Objectives for the Electricity demo course, by unit title. Other units get general ones. */
const OBJECTIVES: Record<string, [string, string, string[]][]> = {
  'Electricity all around us': [
    ['Say what electricity is', 'I can explain electricity as a flow of charge called a current', ['Communication']],
    ['Name sources of electricity', 'I can name cells, power stations and solar panels', ['Critical thinking']],
  ],
  'The closed loop': [
    ['Explain why a circuit must be closed', 'I can show that a bulb lights only when the loop is complete', ['Critical thinking']],
    ['Build a working closed circuit', 'I can connect a cell, wires and a bulb so it lights', ['Problem solving', 'Collaboration']],
  ],
  'Conductors and insulators': [
    ['Sort materials into conductors and insulators', 'I can test objects and sort them', ['Critical thinking', 'Curiosity and initiative']],
    ['Explain why wires are coated', 'I can say why plastic covers copper wire', ['Communication']],
  ],
  'Parts of a circuit and their symbols': [
    ['Match parts to their symbols', 'I can draw the symbol for a cell, bulb, switch and wire', ['Communication']],
    ['Draw a circuit diagram', 'I can draw a diagram of a simple circuit', ['Problem solving']],
  ],
  'Series and parallel circuits': [
    ['Tell series and parallel apart', 'I can explain the difference with a diagram', ['Critical thinking']],
    ['Predict what happens when a bulb is removed', 'I can predict and test both circuit types', ['Problem solving', 'Curiosity and initiative']],
  ],
  'Project: build a paper-cup torch': [
    ['Design and build a working torch', 'I can plan, build and test my torch', ['Creativity', 'Problem solving']],
    ['Present how the torch works', 'I can explain my torch using the words circuit and switch', ['Communication', 'Collaboration']],
  ],
};

async function main() {
  await connectDb();
  const hex = () => new Types.ObjectId();

  // Skills
  const skillId = new Map<string, Types.ObjectId>();
  for (const [i, s] of SKILLS.entries()) {
    const doc = await Skill.findOneAndUpdate({ name: s.name }, { $setOnInsert: { ...s, levels: LEVELS, position: i, active: true } }, { upsert: true, new: true });
    skillId.set(s.name, doc._id);
  }
  console.log(`Skills: ${SKILLS.length}`);

  // Item bank and one published mission per band
  const admin = await User.findOne({ role: 'super_admin' }).select('_id').lean();
  for (const band of ['little', 'junior', 'senior'] as const) {
    if (await AssessmentForm.exists({ band, status: 'published' })) {
      console.log(`Mission for ${band}: already published`);
      continue;
    }
    const ids: Types.ObjectId[] = [];
    for (const it of BANK[band]) {
      const doc = await AssessmentItem.create({
        type: it.type,
        prompt: it.prompt,
        options: it.options?.map(([text, score]) => ({ text, score })),
        scaleLabels: it.scale,
        rubric: it.rubric,
        skills: it.skills.map((n) => ({ skillId: skillId.get(n), weight: 1 })),
        bands: [band],
        status: 'published',
        createdBy: admin?._id,
      });
      ids.push(doc._id);
    }
    await AssessmentForm.create({ title: MISSION[band], band, intro: 'A short set of puzzles and tasks. There are no wrong answers, only interesting ideas!', itemIds: ids, status: 'published', createdBy: admin?._id });
    console.log(`Mission for ${band}: ${ids.length} questions`);
  }

  // Tools (built-in demo versions until the real apps are connected)
  const tools: Record<string, Types.ObjectId> = {};
  for (const [name, kind, description] of [
    ['Super Tutor', 'super_tutor', 'Guided practice that reports mastery for each objective'],
    ['Debating App', 'debate', 'Argue a question and get a rubric for reasoning and speaking'],
  ] as const) {
    const found = await ToolIntegration.findOne({ name }).select('_id').lean();
    tools[kind] = found?._id ?? (await ToolIntegration.create({ name, kind, description, launchUrl: 'builtin:demo', secret: randomToken(32), active: true }))._id;
  }
  console.log('Tools: Super Tutor, Debating App (built-in demo mode)');

  // Objectives and activities for every unit of the published courses that has none yet
  const courses = await Course.find({ status: 'published' }).select('_id title').lean();
  let updated = 0;
  for (const c of courses) {
    const quiz = await Quiz.findOne({ courseId: c._id, status: 'published' }).select('_id').lean();
    const units = await Unit.find({ courseId: c._id }).sort({ position: 1 }).lean();
    for (const [ui, u] of units.entries()) {
      if (u.objectives?.length) continue;
      const defs = OBJECTIVES[u.title] ?? [
        [`Explain the key idea of "${u.title}"`, 'I can explain it in my own words', ['Communication', 'Critical thinking']],
        [`Use "${u.title}" in a small task`, 'I can try it and show my work', ['Problem solving', 'Creativity']],
      ];
      const objectives = defs.map(([title, criteria, sk]) => ({ _id: hex(), title, criteria, description: criteria, skillIds: sk.map((n) => skillId.get(n)!).filter(Boolean), weight: 1 }));
      const [o1, o2] = objectives.map((o) => o._id);
      const activities: Record<string, unknown>[] = [];
      if (quiz && ui === units.length - 1) activities.push({ _id: hex(), kind: 'quiz', title: 'Course check quiz', quizId: quiz._id, objectiveIds: [o1], scoring: 'auto', weight: 1, required: true });
      activities.push({ _id: hex(), kind: 'tool', title: 'Super Tutor practice', toolId: tools.super_tutor, objectiveIds: [o1, o2], scoring: 'auto', weight: 1, required: false, instructions: 'Practise with Super Tutor until you feel confident.' });
      activities.push({
        _id: hex(),
        kind: 'project',
        title: u.title.startsWith('Project') ? 'Upload your finished project' : 'Show what you made',
        instructions: 'Take a photo or a short video of your work and say what you learned.',
        objectiveIds: [o2],
        scoring: 'rubric',
        weight: 2,
        required: true,
        mediaTypes: ['photo', 'video', 'file'],
      });
      if (ui % 3 === 1) activities.push({ _id: hex(), kind: 'tool', title: 'Debate it', toolId: tools.debate, objectiveIds: [o1], scoring: 'auto', weight: 1, required: false, instructions: 'Argue for or against, then listen to the other side.' });
      activities.push({ _id: hex(), kind: 'reflection', title: 'What I learned', instructions: 'Write two sentences: what you learned and what you want to try next.', objectiveIds: [o1], scoring: 'rating', weight: 0.5, required: false });
      await Unit.updateOne({ _id: u._id }, { objectives, activities });
      updated++;
    }
  }
  console.log(`Learning units given objectives and activities: ${updated}`);

  // Consent for the demo students
  const r = await User.updateMany({ role: 'student', 'consent.assessment': { $ne: true } }, { consent: { assessment: true, media: true, at: new Date() } });
  console.log(`Demo consent recorded for ${r.modifiedCount} students`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await mongoose.disconnect();
  process.exit(1);
});
