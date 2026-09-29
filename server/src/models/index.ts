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

const unitSchema = new Schema(
  {
    courseId: { type: oid, ref: 'Course', required: true, index: true },
    chapterId: { type: oid, ref: 'Chapter', required: true, index: true },
    title: { type: String, required: true, trim: true },
    summary: String,
    type: { type: String, enum: ['lesson', 'video', 'pdf', 'activity', 'link'], default: 'lesson' },
    body: String, // sanitised HTML
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
    name: { type: String, required: true, trim: true },
    description: String,
    levels: { emerging: String, developing: String, proficient: String, advanced: String },
    minGrade: { type: Number, default: 1 },
    maxGrade: { type: Number, default: 12 },
    color: String,
    position: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  opts,
);
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
    bands: [{ type: String, enum: GRADE_BANDS }],
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    createdBy: { type: oid, ref: 'User' },
  },
  opts,
);
export const AssessmentItem = model('AssessmentItem', itemSchema);

const formSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    band: { type: String, enum: GRADE_BANDS, required: true },
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
        score: Number, // 0–1; null until a teacher scores open work
        scoredBy: { type: oid, ref: 'User' },
        _id: false,
      },
    ],
    status: { type: String, enum: ['in_progress', 'submitted', 'scored'], default: 'in_progress', index: true },
    submittedAt: Date,
    skillScores: [{ skillId: { type: oid, ref: 'Skill' }, score: Number, level: String, _id: false }],
  },
  opts,
);
export const AssessmentAttempt = model('AssessmentAttempt', attemptSchema);



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
    type: { type: String, enum: ['single', 'multiple', 'true_false'], default: 'single' },
    options: [{ type: String }],
    correct: [{ type: Number }], // indexes into options
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
    answers: [{ questionId: oid, selected: [Number] }],
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
