import { Schema, model, Types } from 'mongoose';

export * from './User.js';

const oid = Schema.Types.ObjectId;
const opts = { timestamps: true } as const;

/* ---------------------------------------------------------------- Auth */

const refreshTokenSchema = new Schema(
  {
    userId: { type: oid, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
    userAgent: String,
  },
  opts,
);
export const RefreshToken = model('RefreshToken', refreshTokenSchema);

const passwordResetSchema = new Schema(
  {
    userId: { type: oid, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: Date,
    purpose: { type: String, enum: ['reset', 'invite'], default: 'reset' },
  },
  opts,
);
export const PasswordReset = model('PasswordReset', passwordResetSchema);

/* ------------------------------------------------------- Organisations */

const partnerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
    contactName: String,
    contactEmail: { type: String, lowercase: true, trim: true },
    contactPhone: String,
    city: String,
    state: String,
    country: { type: String, default: 'India' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  opts,
);
export const Partner = model('Partner', partnerSchema);

const schoolSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
    partnerId: { type: oid, ref: 'Partner', index: true },
    board: String, // CBSE, ICSE, State...
    address: String,
    city: String,
    state: String,
    pinCode: String,
    country: { type: String, default: 'India' },
    phone: String,
    email: { type: String, lowercase: true, trim: true },
    website: String,
    principalName: String,
    logoUrl: String,
    academicYear: { type: String, default: '2026-27' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    plan: { type: String, enum: ['basic', 'standard', 'premium'], default: 'standard' },
    aiMonthlyTokens: { type: Number, default: 200000 },
    nanobotBuddies: { type: [String], default: undefined }, // NanoBot characters students may choose; empty = all
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  opts,
);
export const School = model('School', schoolSchema);

const classSchema = new Schema(
  {
    schoolId: { type: oid, ref: 'School', required: true, index: true },
    grade: { type: Number, required: true, min: 1, max: 12 },
    section: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, trim: true }, // e.g. "Grade 6 - A"
    classTeacherId: { type: oid, ref: 'User' },
    academicYear: String,
  },
  opts,
);
classSchema.index({ schoolId: 1, grade: 1, section: 1, academicYear: 1 }, { unique: true });
export const ClassSection = model('ClassSection', classSchema);

/* ----------------------------------------------------------- Curriculum */

const courseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, trim: true },
    description: String,
    category: { type: String, trim: true }, // Robotics, Coding, AI, Electronics...
    grades: [{ type: Number, min: 1, max: 12 }],
    thumbnailUrl: String,
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
    createdBy: { type: oid, ref: 'User' },
  },
  opts,
);
export const Course = model('Course', courseSchema);

const chapterSchema = new Schema(
  {
    courseId: { type: oid, ref: 'Course', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: String,
    position: { type: Number, default: 0 },
  },
  opts,
);
export const Chapter = model('Chapter', chapterSchema);

const slideSubSchema = new Schema(
  {
    layout: { type: String, enum: ['title', 'section', 'bullets', 'image-right', 'image-full', 'two-column', 'quote', 'icons', 'steps', 'fact', 'quiz'], default: 'bullets' },
    title: String,
    subtitle: String,
    bullets: [String],
    bullets2: [String],
    imageUrl: String,
    imageAlt: String,
    notes: String,
    background: String,
    icon: String,
    icons: [String],
    answer: Number,
  },
  { _id: true },
);
export const BLOCK_KINDS = ['text', 'video', 'presentation', 'activity', 'pdf', 'link', 'motion', 'gallery', 'sim3d', 'check'] as const;
/** One piece of a learning unit's content. A unit is a list of blocks shown one after another, in order. */
const blockSchema = new Schema({
  kind: { type: String, enum: BLOCK_KINDS, required: true },
  title: String, // optional heading shown above the block
  body: String, // sanitised HTML: the text, activity steps, or notes under a media block
  videoUrl: String,
  fileUrl: String,
  linkUrl: String,
  motionUrl: String,
  motionLoop: { type: Boolean, default: true },
  simUrl: String,
  deckTheme: String,
  slides: [slideSubSchema],
  gallery: [{ url: { type: String, required: true }, caption: String, alt: String }],
  // Quick check: a question students answer before the next part of the lesson opens
  question: String,
  choices: [{ text: String, correct: { type: Boolean, default: false } }],
  explain: String, // shown when they get it right: why it is right
  help: String, // shown when they get it wrong: the idea explained more simply
});

/**
 * A unit in another language. Made by AI (or copied for a teacher to translate) as a draft;
 * students only see it once a teacher approves it. `sourceHash` shows when the English has changed since.
 */
const translationSchema = new Schema(
  {
    lang: { type: String, required: true },
    status: { type: String, enum: ['draft', 'approved'], default: 'draft' },
    by: { type: String, enum: ['ai', 'copy', 'teacher'], default: 'ai' },
    title: String,
    summary: String,
    blocks: { type: Schema.Types.Mixed, default: [] }, // [{ id, title, body, slides, gallery, question, choices, explain, help }]
    objectives: { type: Schema.Types.Mixed, default: [] }, // [{ id, title, criteria }]
    sourceHash: String,
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
  },
  { timestamps: true },
);

const unitSchema = new Schema(
  {
    // The unit's content, block by block (text, video, slides, activity, document, link, animation, gallery, 3D simulation).
    // Older units have no blocks; their single-type fields below are read as one or two blocks.
    blocks: [blockSchema],
    translations: [translationSchema],
    courseId: { type: oid, ref: 'Course', required: true, index: true },
    chapterId: { type: oid, ref: 'Chapter', required: true, index: true },
    title: { type: String, required: true, trim: true },
    summary: String,
    type: { type: String, enum: ['lesson', 'video', 'pdf', 'activity', 'link', 'presentation', 'motion', 'gallery', 'sim3d'], default: 'lesson' },
    // 3D simulation: a 3D model (.glb/.gltf) students can turn and zoom, or an embedded simulation (PhET, Sketchfab, GeoGebra…)
    simUrl: String,
    // Motion graphics: an animation (Lottie .json, GIF, looping .mp4/.webm, or an embed link)
    motionUrl: String,
    motionLoop: { type: Boolean, default: true },
    // Image gallery: pictures with captions students can open full size
    gallery: [{ url: { type: String, required: true }, caption: String, alt: String }],
    body: String, // sanitised HTML
    // Slide deck for 'presentation' units (built in the course studio, optionally with AI)
    deckTheme: { type: String, default: 'clarity' },
    slides: [
      {
        layout: { type: String, enum: ['title', 'section', 'bullets', 'image-right', 'image-full', 'two-column', 'quote', 'icons', 'steps', 'fact', 'quiz'], default: 'bullets' },
        title: String,
        subtitle: String,
        bullets: [String],
        bullets2: [String],
        imageUrl: String,
        imageAlt: String,
        notes: String,
        background: String,
        icon: String,
        icons: [String],
        answer: Number,
      },
    ],
    videoUrl: String,
    fileUrl: String,
    linkUrl: String,
    durationMin: { type: Number, default: 10 },
    position: { type: Number, default: 0 },
    // What the child should be able to do after this learning unit
    objectives: [
      {
        title: { type: String, required: true, trim: true },
        description: String,
        criteria: String, // "I can ..." success criteria
        skillIds: [{ type: oid, ref: 'Skill' }],
        weight: { type: Number, default: 1, min: 0 },
      },
    ],
    // Outcome activities at the end of the unit; each one checks some objectives
    activities: [
      {
        kind: { type: String, enum: ['quiz', 'project', 'presentation', 'reflection', 'tool'], required: true },
        title: { type: String, required: true, trim: true },
        instructions: String,
        quizId: { type: oid, ref: 'Quiz' },
        toolId: { type: oid, ref: 'ToolIntegration' },
        objectiveIds: [{ type: oid }],
        scoring: { type: String, enum: ['auto', 'rubric', 'rating'], default: 'rubric' },
        weight: { type: Number, default: 1, min: 0 },
        required: { type: Boolean, default: true },
        mediaTypes: [{ type: String, enum: ['photo', 'video', 'file', 'link'] }],
      },
    ],
  },
  opts,
);
export const Unit = model('Unit', unitSchema);

/* ------------------------------------------------ Learning journey */

/** External practice tools (Super Tutor, Debating App, ...) that report results back. */
const toolSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    kind: { type: String, enum: ['super_tutor', 'debate', 'other'], default: 'other' },
    description: String,
    launchUrl: { type: String, trim: true },
    secret: { type: String, required: true, select: false }, // shared HMAC secret for result callbacks
    active: { type: Boolean, default: true },
  },
  opts,
);
export const ToolIntegration = model('ToolIntegration', toolSchema);

/** Proof that a student met (part of) a learning objective: a scored upload, a tool result, a quiz. */
const evidenceSchema = new Schema(
  {
    studentId: { type: oid, ref: 'User', required: true, index: true },
    schoolId: { type: oid, ref: 'School', index: true },
    classId: { type: oid, ref: 'ClassSection', index: true },
    courseId: { type: oid, ref: 'Course', required: true, index: true },
    unitId: { type: oid, ref: 'Unit', required: true, index: true },
    activityId: { type: oid, required: true },
    objectiveIds: [{ type: oid }],
    source: { type: String, enum: ['student', 'tool'], default: 'student' },
    media: [
      {
        kind: { type: String, enum: ['photo', 'video', 'file', 'link'] },
        url: String,
        name: String,
        _id: false,
      },
    ],
    caption: String, // the child's own words: what I made, what I learned
    score: { type: Number, min: 0, max: 100 }, // set by the teacher's rubric or the tool
    objectiveScores: [{ objectiveId: oid, score: Number, _id: false }], // tools may score each objective
    rubricLevel: { type: Number, min: 1, max: 4 },
    feedback: String,
    summary: String, // from a tool
    status: { type: String, enum: ['pending', 'verified', 'returned'], default: 'pending', index: true },
    verifiedBy: { type: oid, ref: 'User' },
    verifiedAt: Date,
    visibility: { type: String, enum: ['private', 'class', 'parent', 'showcase'], default: 'parent' },
    featured: { type: Boolean, default: false },
  },
  opts,
);
evidenceSchema.index({ studentId: 1, unitId: 1, activityId: 1 });
export const Evidence = model('Evidence', evidenceSchema);

/** One-time launch of a tool activity; the tool returns this token with its result. */
const toolLaunchSchema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    toolId: { type: oid, ref: 'ToolIntegration', required: true },
    studentId: { type: oid, ref: 'User', required: true },
    unitId: { type: oid, ref: 'Unit', required: true },
    activityId: { type: oid, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: Date,
  },
  opts,
);
export const ToolLaunch = model('ToolLaunch', toolLaunchSchema);

/* ------------------------------------------------ Skills assessment */

const skillSchema = new Schema(
  {
    name: { type: String, required: true, trim: true }, // academic name, for teachers and reports
    habit: { type: String, trim: true }, // Genius Habit name children and parents see, e.g. "Sharp Thinker"
    // Genius Habits (the 8 habits) or a dimension of the psychometric profile
    framework: { type: String, enum: ['genius', 'psychometric', 'cognitive'], default: 'genius', index: true },
    // Psychometric only: the area it belongs to
    domain: { type: String, enum: ['personality', 'physical', 'spiritual', 'cognitive'] },
    // How it is best assessed: questions, teacher observation, or both
    assessedBy: { type: String, enum: ['quest', 'observation', 'both'], default: 'quest' },
    description: String,
    // What each growth stage looks like for this habit
    levels: { seed: String, sprout: String, sapling: String, bloom: String, fruit: String, emerging: String, developing: String, proficient: String, advanced: String },
    // Psychometric: what each observation level looks like for this dimension (1 Rarely … 4 Always)
    anchors: { 1: String, 2: String, 3: String, 4: String },
    key: String, // starter dimension key, e.g. hygiene
    minGrade: { type: Number, default: 1 },
    maxGrade: { type: Number, default: 12 },
    color: String,
    position: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  opts,
);
// One starter dimension per key: stops duplicates even if start-up runs twice at once
skillSchema.index({ key: 1 }, { unique: true, sparse: true });
export const Skill = model('Skill', skillSchema);

export const GRADE_BANDS = ['little', 'junior', 'senior'] as const; // grades 1–3, 4–7, 8–12
const itemSchema = new Schema(
  {
    type: { type: String, enum: ['single', 'multiple', 'scale', 'open', 'upload'], required: true },
    prompt: { type: String, required: true },
    mediaUrl: String,
    options: [{ text: String, score: { type: Number, min: 0, max: 1, default: 0 } }], // single/multiple: credit per option
    scaleLabels: [String], // scale: e.g. Never … Always (5 points)
    rubric: [String], // open/upload: 4 level descriptions
    skills: [{ skillId: { type: oid, ref: 'Skill' }, weight: { type: Number, default: 1 }, _id: false }],
    framework: { type: String, enum: ['genius', 'psychometric', 'cognitive'], default: 'genius', index: true }, // Genius Quest item or psychometric item
    reverse: { type: Boolean, default: false }, // self-rating scale scored the other way round (psychometric reverse-keyed item)
    // Psychometric only
    informant: { type: String, enum: ['self', 'parent'], default: 'self' }, // who answers: the child or a parent
    validity: { type: String, enum: ['', 'desirability'], default: '' }, // answer-quality item, not scored into any dimension
    pairKey: String, // items sharing a pairKey ask the same thing in opposite directions (consistency check)
    // Cognitive puzzles only
    stimulus: String, // shown first, then hidden (working memory): e.g. "7 2 9 4"
    stimulusSec: Number, // how long the stimulus stays on screen
    timeSec: Number, // time allowed for the puzzle (attention & speed); unanswered when time runs out
    seedKey: { type: String, index: { unique: true, sparse: true } }, // starter items, so updates can add new ones without duplicates
    translations: [
      {
        lang: { type: String, required: true }, // hi, ml, ta, kn, te, mr, bn
        prompt: String,
        options: [String],
        scaleLabels: [String],
        backTranslation: String, // translated back to English by a second person, to check meaning
        status: { type: String, enum: ['draft', 'approved'], default: 'draft' },
        _id: false,
      },
    ],
    grades: [{ type: Number, min: 1, max: 12 }], // each grade on its own (1–10)
    bands: [{ type: String, enum: GRADE_BANDS }], // legacy, converted to grades on startup
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    createdBy: { type: oid, ref: 'User' },
  },
  opts,
);
export const AssessmentItem = model('AssessmentItem', itemSchema);

const formSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    framework: { type: String, enum: ['genius', 'psychometric', 'cognitive'], default: 'genius', index: true },
    grade: { type: Number, min: 1, max: 12, index: true }, // one published form per grade and framework
    informant: { type: String, enum: ['self', 'parent'], default: 'self' }, // psychometric: the child's form or the parent's
    band: { type: String, enum: GRADE_BANDS }, // legacy
    intro: String,
    itemIds: [{ type: oid, ref: 'AssessmentItem' }],
    timeLimitMin: Number,
    status: { type: String, enum: ['draft', 'published', 'retired'], default: 'draft' },
    version: { type: Number, default: 1 },
    createdBy: { type: oid, ref: 'User' },
  },
  opts,
);
export const AssessmentForm = model('AssessmentForm', formSchema);

const attemptSchema = new Schema(
  {
    formId: { type: oid, ref: 'AssessmentForm', required: true, index: true },
    formVersion: Number,
    framework: { type: String, enum: ['genius', 'psychometric', 'cognitive'], default: 'genius', index: true },
    informant: { type: String, enum: ['self', 'parent'], default: 'self' },
    answeredBy: { type: oid, ref: 'User' }, // the parent, for a parent questionnaire
    lang: { type: String, default: 'en' },
    assent: Boolean, // the child agreed to take part
    startedAt: Date,
    flags: [String], // answer-quality: too_fast, same_answer, inconsistent, desirability
    studentId: { type: oid, ref: 'User', required: true, index: true },
    schoolId: { type: oid, ref: 'School', index: true },
    classId: { type: oid, ref: 'ClassSection' },
    answers: [
      {
        itemId: { type: oid, ref: 'AssessmentItem' },
        selected: [Number],
        value: Number,
        text: String,
        fileUrl: String,
        ms: Number, // cognitive: time taken to answer
        score: Number, // 0–1; null until a teacher scores open work
        scoredBy: { type: oid, ref: 'User' },
        _id: false,
      },
    ],
    status: { type: String, enum: ['in_progress', 'submitted', 'scored'], default: 'in_progress', index: true },
    submittedAt: Date,
    skillScores: [{ skillId: { type: oid, ref: 'Skill' }, score: Number, level: String, answered: Number, _id: false }],
  },
  opts,
);
export const AssessmentAttempt = model('AssessmentAttempt', attemptSchema);

/**
 * Teacher observation of a psychometric dimension (hygiene, grooming, manners, fitness… are seen, not asked).
 * One rating per student, dimension, term and teacher; two teachers rating the same child lets us check agreement.
 *   level 1 Rarely · 2 Sometimes · 3 Usually · 4 Always
 */
const observationSchema = new Schema(
  {
    studentId: { type: oid, ref: 'User', required: true, index: true },
    schoolId: { type: oid, ref: 'School', index: true },
    classId: { type: oid, ref: 'ClassSection', index: true },
    skillId: { type: oid, ref: 'Skill', required: true },
    term: { type: String, required: true }, // e.g. 2026-T2
    level: { type: Number, min: 1, max: 4, required: true },
    note: String,
    by: { type: oid, ref: 'User' },
  },
  opts,
);
observationSchema.index({ studentId: 1, skillId: 1, term: 1, by: 1 }, { unique: true });
export const HabitObservation = model('HabitObservation', observationSchema);

/** Standard PE fitness tests (no BMI). Scored against children of the same grade. */
export const FITNESS_TESTS = {
  sprint50: { label: '50 m sprint', unit: 's', better: 'lower', skill: 'fitness', min: 5, max: 30 },
  run600: { label: '600 m run/walk', unit: 'min', better: 'lower', skill: 'fitness', min: 1.5, max: 12 },
  plank: { label: 'Plank hold', unit: 's', better: 'higher', skill: 'fitness', min: 0, max: 600 },
  sitReach: { label: 'Sit and reach', unit: 'cm', better: 'higher', skill: 'motor', min: -30, max: 60 },
  broadJump: { label: 'Standing broad jump', unit: 'cm', better: 'higher', skill: 'motor', min: 20, max: 350 },
  flamingo: { label: 'Flamingo balance (falls in 60 s)', unit: 'falls', better: 'lower', skill: 'motor', min: 0, max: 30 },
} as const;
export type FitnessTest = keyof typeof FITNESS_TESTS;
const fitnessSchema = new Schema(
  {
    studentId: { type: oid, ref: 'User', required: true, index: true },
    schoolId: { type: oid, ref: 'School', index: true },
    classId: { type: oid, ref: 'ClassSection', index: true },
    grade: Number,
    gender: String,
    term: { type: String, required: true },
    test: { type: String, enum: Object.keys(FITNESS_TESTS), required: true },
    value: { type: Number, required: true },
    by: { type: oid, ref: 'User' },
  },
  opts,
);
fitnessSchema.index({ studentId: 1, test: 1, term: 1 }, { unique: true });
export const FitnessRecord = model('FitnessRecord', fitnessSchema);

/** Norms: score distribution per grade and dimension, rebuilt from real results (percentiles). */
const normSchema = new Schema(
  {
    skillId: { type: oid, ref: 'Skill', required: true },
    grade: { type: Number, required: true },
    n: Number,
    mean: Number,
    sd: Number,
    alpha: Number,
    points: [Number], // score at percentiles 0,5,10…100 (21 points)
    builtAt: Date,
  },
  opts,
);
normSchema.index({ skillId: 1, grade: 1 }, { unique: true });
export const PsyNorm = model('PsyNorm', normSchema);

/** "Suggest a conversation": a teacher asks the school counsellor to talk with a child. Staff only. */
const conversationSchema = new Schema(
  {
    studentId: { type: oid, ref: 'User', required: true, index: true },
    schoolId: { type: oid, ref: 'School', index: true },
    classId: { type: oid, ref: 'ClassSection' },
    reason: { type: String, required: true },
    areas: [String], // dimension names, optional
    status: { type: String, enum: ['open', 'in_progress', 'closed'], default: 'open', index: true },
    notes: [{ text: String, by: { type: oid, ref: 'User' }, at: Date, _id: false }],
    by: { type: oid, ref: 'User' },
  },
  opts,
);
export const PsyConversation = model('PsyConversation', conversationSchema);



/** A course made available to a partner (all its schools can use it) or directly to a school. */
const courseGrantSchema = new Schema(
  {
    courseId: { type: oid, ref: 'Course', required: true, index: true },
    partnerId: { type: oid, ref: 'Partner', index: true },
    schoolId: { type: oid, ref: 'School', index: true },
    grantedBy: { type: oid, ref: 'User' },
    viaPartnerId: { type: oid, ref: 'Partner' }, // set when a partner passed its course on to a school
  },
  opts,
);
export const CourseGrant = model('CourseGrant', courseGrantSchema);

/** A course scheduled for one class, taught by one teacher. */
const classCourseSchema = new Schema(
  {
    schoolId: { type: oid, ref: 'School', required: true, index: true },
    classId: { type: oid, ref: 'ClassSection', required: true, index: true },
    courseId: { type: oid, ref: 'Course', required: true, index: true },
    teacherId: { type: oid, ref: 'User', index: true },
    startDate: Date,
    endDate: Date,
  },
  opts,
);
classCourseSchema.index({ classId: 1, courseId: 1 }, { unique: true });
export const ClassCourse = model('ClassCourse', classCourseSchema);

const unitProgressSchema = new Schema(
  {
    studentId: { type: oid, ref: 'User', required: true, index: true },
    courseId: { type: oid, ref: 'Course', required: true, index: true },
    unitId: { type: oid, ref: 'Unit', required: true },
    completedAt: { type: Date, default: Date.now },
  },
  opts,
);
unitProgressSchema.index({ studentId: 1, unitId: 1 }, { unique: true });
export const UnitProgress = model('UnitProgress', unitProgressSchema);

/** One daily-reward claim per student per school day (YYYY-MM-DD in the school's timezone). */
const rewardClaimSchema = new Schema(
  {
    studentId: { type: oid, ref: 'User', required: true, index: true },
    day: { type: String, required: true },
    xp: { type: Number, required: true },
  },
  opts,
);
rewardClaimSchema.index({ studentId: 1, day: 1 }, { unique: true });
export const RewardClaim = model('RewardClaim', rewardClaimSchema);

/* ----------------------------------------------------------- Assessment */

const questionSchema = new Schema(
  {
    text: { type: String, required: true },
    type: { type: String, enum: ['single', 'multiple', 'true_false', 'short'], default: 'single' },
    options: [{ type: String }],
    correct: [{ type: Number }], // indexes into options
    accepted: [{ type: String }], // short answer: answers marked right (case and spacing ignored)
    mediaUrl: String, // a picture the question is about
    hint: String, // shown to students on request while answering
    points: { type: Number, default: 1 },
    explanation: String,
  },
  { _id: true },
);

const quizSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: String,
    courseId: { type: oid, ref: 'Course', index: true },
    chapterId: { type: oid, ref: 'Chapter' },
    unitId: { type: oid, ref: 'Unit' },
    // Content quizzes are authored centrally (schoolId empty); teachers can author class quizzes
    schoolId: { type: oid, ref: 'School', index: true },
    classId: { type: oid, ref: 'ClassSection', index: true },
    questions: [questionSchema],
    timeLimitMin: Number,
    maxAttempts: { type: Number, default: 1 },
    dueDate: Date,
    shuffleQuestions: { type: Boolean, default: false }, // each student sees the questions in a different order
    showAnswers: { type: String, enum: ['after_submit', 'never'], default: 'after_submit' }, // when students see right answers
    passPercent: Number, // optional pass mark, e.g. 60
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    createdBy: { type: oid, ref: 'User' },
  },
  opts,
);
export const Quiz = model('Quiz', quizSchema);

const quizAttemptSchema = new Schema(
  {
    quizId: { type: oid, ref: 'Quiz', required: true, index: true },
    studentId: { type: oid, ref: 'User', required: true, index: true },
    classId: { type: oid, ref: 'ClassSection', index: true },
    answers: [{ questionId: oid, selected: [Number], text: String }],
    score: Number,
    maxScore: Number,
    percent: Number,
    startedAt: { type: Date, default: Date.now },
    submittedAt: Date,
  },
  opts,
);
export const QuizAttempt = model('QuizAttempt', quizAttemptSchema);

const assignmentSchema = new Schema(
  {
    schoolId: { type: oid, ref: 'School', required: true, index: true },
    classId: { type: oid, ref: 'ClassSection', required: true, index: true },
    courseId: { type: oid, ref: 'Course' },
    title: { type: String, required: true, trim: true },
    instructions: String, // sanitised HTML
    kind: { type: String, enum: ['homework', 'project', 'activity'], default: 'homework' },
    attachmentUrl: String,
    attachmentName: String,
    dueDate: Date,
    maxPoints: { type: Number, default: 10 },
    status: { type: String, enum: ['draft', 'published', 'closed'], default: 'published' },
    createdBy: { type: oid, ref: 'User', required: true },
  },
  opts,
);
export const Assignment = model('Assignment', assignmentSchema);

const submissionSchema = new Schema(
  {
    assignmentId: { type: oid, ref: 'Assignment', required: true, index: true },
    studentId: { type: oid, ref: 'User', required: true, index: true },
    text: String,
    fileUrl: String,
    fileName: String,
    linkUrl: String,
    submittedAt: { type: Date, default: Date.now },
    late: { type: Boolean, default: false },
    status: { type: String, enum: ['submitted', 'graded', 'returned'], default: 'submitted' },
    points: Number,
    feedback: String,
    gradedBy: { type: oid, ref: 'User' },
    gradedAt: Date,
  },
  opts,
);
submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
export const Submission = model('Submission', submissionSchema);

/* ---------------------------------------------------- School operations */

const attendanceSchema = new Schema(
  {
    schoolId: { type: oid, ref: 'School', required: true, index: true },
    classId: { type: oid, ref: 'ClassSection', required: true, index: true },
    date: { type: String, required: true }, // YYYY-MM-DD in school time
    records: [
      {
        studentId: { type: oid, ref: 'User' },
        status: { type: String, enum: ['present', 'absent', 'late', 'excused'], default: 'present' },
        _id: false,
      },
    ],
    takenBy: { type: oid, ref: 'User' },
  },
  opts,
);
attendanceSchema.index({ classId: 1, date: 1 }, { unique: true });
export const Attendance = model('Attendance', attendanceSchema);

const remarkSchema = new Schema(
  {
    schoolId: { type: oid, ref: 'School', required: true, index: true },
    studentId: { type: oid, ref: 'User', required: true, index: true },
    teacherId: { type: oid, ref: 'User', required: true },
    category: { type: String, enum: ['appreciation', 'improvement', 'behaviour', 'general'], default: 'general' },
    text: { type: String, required: true },
    visibleToParent: { type: Boolean, default: true },
  },
  opts,
);
export const Remark = model('Remark', remarkSchema);

export const ANNOUNCE_SCOPES = ['global', 'partner', 'school', 'class'] as const;
const announcementSchema = new Schema(
  {
    scope: { type: String, enum: ANNOUNCE_SCOPES, required: true, index: true },
    partnerId: { type: oid, ref: 'Partner', index: true },
    schoolId: { type: oid, ref: 'School', index: true },
    classId: { type: oid, ref: 'ClassSection', index: true },
    audience: [{ type: String }], // roles; empty = everyone in scope
    title: { type: String, required: true, trim: true },
    body: String,
    kind: { type: String, enum: ['announcement', 'news', 'newsletter'], default: 'announcement' },
    pinned: { type: Boolean, default: false },
    createdBy: { type: oid, ref: 'User' },
  },
  opts,
);
export const Announcement = model('Announcement', announcementSchema);

const eventSchema = new Schema(
  {
    schoolId: { type: oid, ref: 'School', index: true }, // empty = company-wide event
    classId: { type: oid, ref: 'ClassSection' },
    title: { type: String, required: true, trim: true },
    description: String,
    location: String,
    startsAt: { type: Date, required: true, index: true },
    endsAt: Date,
    createdBy: { type: oid, ref: 'User' },
  },
  opts,
);
export const Event = model('Event', eventSchema);

/* -------------------------------------------------------------------- AI */

const aiChatSchema = new Schema(
  {
    userId: { type: oid, ref: 'User', required: true, index: true },
    schoolId: { type: oid, ref: 'School', index: true },
    title: { type: String, default: 'New conversation' },
    courseId: { type: oid, ref: 'Course' },
    unitId: { type: oid, ref: 'Unit' },
    externalChatId: String, // id on the NanoBot service when AI_PROVIDER=nanobot
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant'] },
        content: String,
        tokens: Number,
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
  },
  opts,
);
export const AiChat = model('AiChat', aiChatSchema);

const aiUsageSchema = new Schema(
  {
    schoolId: { type: oid, ref: 'School', index: true },
    userId: { type: oid, ref: 'User', index: true },
    month: { type: String, required: true, index: true }, // YYYY-MM
    tokens: { type: Number, default: 0 },
  },
  opts,
);
aiUsageSchema.index({ userId: 1, month: 1 }, { unique: true });
export const AiUsage = model('AiUsage', aiUsageSchema);

/** App-wide settings set by the super admin (e.g. which AI provider to use). Secrets are stored encrypted. */
const settingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, default: {} },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, minimize: false },
);
export const Setting = model('Setting', settingSchema);

/** A student's answers to a quick check inside a unit (used to unlock the next part and to show teachers what was hard). */
const checkAnswerSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    blockId: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    firstTry: { type: Boolean, default: false }, // right on the first attempt
    choices: [Number], // every choice picked, in order
  },
  { timestamps: true },
);
checkAnswerSchema.index({ studentId: 1, unitId: 1, blockId: 1 }, { unique: true });
export const CheckAnswer = model('CheckAnswer', checkAnswerSchema);

/** A student's own small steps for an assignment ("break it into steps"), ticked off one by one. */
const taskPlanSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    steps: [{ text: { type: String, required: true }, minutes: { type: Number, default: 5 }, done: { type: Boolean, default: false } }],
    by: { type: String, enum: ['ai', 'offline', 'student'], default: 'offline' },
  },
  { timestamps: true },
);
taskPlanSchema.index({ studentId: 1, assignmentId: 1 }, { unique: true });
export const TaskPlan = model('TaskPlan', taskPlanSchema);

/* ----------------------------------------------------------------- Audit */

const auditSchema = new Schema(
  {
    actorId: { type: oid, ref: 'User' },
    action: { type: String, required: true },
    entity: String,
    entityId: String,
    meta: Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
export const AuditLog = model('AuditLog', auditSchema);

export const toId = (v: unknown) => new Types.ObjectId(String(v));

/* ------------------------------------------------ Doors to performance (nanoskool.com programmes) */

/** One of Nanoskool's programmes: 8 "doors to learning" and 4 support platforms. Schools opt in through their partner. */
const doorSchema = new Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. shaktimath
    kind: { type: String, enum: ['door', 'platform'], default: 'door', index: true },
    name: { type: String, required: true, trim: true },
    tagline: String, // e.g. "Understand · Practise · Progress"
    description: String,
    audience: String, // who it is for, e.g. "Grades 6–9"
    url: String, // the programme page on nanoskool.com
    logoUrl: String,
    color: String,
    position: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  opts,
);
export const Door = model('Door', doorSchema);

/** A door opened for a partner (it can pass it on) or for one school — the same chain as course grants. */
const doorGrantSchema = new Schema(
  {
    doorId: { type: oid, ref: 'Door', required: true, index: true },
    partnerId: { type: oid, ref: 'Partner', index: true },
    schoolId: { type: oid, ref: 'School', index: true },
    grantedBy: { type: oid, ref: 'User' },
    viaPartnerId: { type: oid, ref: 'Partner' }, // set when a partner opened its door for a school
  },
  opts,
);
export const DoorGrant = model('DoorGrant', doorGrantSchema);

/** A teacher the school admin put on a door's team at their school. */
const doorTeamSchema = new Schema(
  {
    doorId: { type: oid, ref: 'Door', required: true, index: true },
    schoolId: { type: oid, ref: 'School', required: true, index: true },
    teacherId: { type: oid, ref: 'User', required: true, index: true },
    lead: { type: Boolean, default: false }, // the teacher who coordinates the door at this school
    addedBy: { type: oid, ref: 'User' },
  },
  opts,
);
doorTeamSchema.index({ doorId: 1, schoolId: 1, teacherId: 1 }, { unique: true });
export const DoorTeam = model('DoorTeam', doorTeamSchema);
