export type Role = 'super_admin' | 'partner' | 'school_admin' | 'teacher' | 'student' | 'parent';

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'Super admin',
  partner: 'Partner',
  school_admin: 'School admin',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
};

export interface Ref {
  _id: string;
  name?: string;
  title?: string;
}

export interface ClassRef {
  _id: string;
  name: string;
  grade: number;
  section: string;
}

export interface User {
  _id: string;
  role: Role;
  name: string;
  email?: string;
  username?: string;
  phone?: string;
  avatarUrl?: string;
  status: 'active' | 'suspended';
  mustChangePassword?: boolean;
  schoolId?: string | Ref;
  partnerId?: string | Ref;
  classId?: string | ClassRef | null;
  rollNo?: string;
  gender?: string;
  dateOfBirth?: string;
  childIds?: (string | User)[];
  relation?: string;
  subjects?: string[];
  qualification?: string;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface Profile extends User {
  school?: { _id: string; name: string; code?: string; logoUrl?: string; academicYear?: string; nanobotBuddies?: string[] } | null;
  partner?: { _id: string; name: string; code?: string } | null;
  class?: ClassRef | null;
  children: (User & { classId?: ClassRef })[];
  prefs?: LearnPrefs;
}

export interface LearnPrefs {
  language?: string;
  calm?: boolean;
  readAloud?: boolean;
  textSize?: 'normal' | 'large' | 'xlarge';
  learnWay?: 'mixed' | 'reading' | 'listening' | 'pictures';
  buddy?: string; // NanoBot character (lib/buddies.ts)
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Partner {
  _id: string;
  name: string;
  code?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  city?: string;
  state?: string;
  country?: string;
  status: 'active' | 'inactive';
  schoolCount?: number;
}

export interface School {
  _id: string;
  name: string;
  code?: string;
  partnerId?: string | Ref;
  board?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  principalName?: string;
  logoUrl?: string;
  academicYear?: string;
  plan?: 'basic' | 'standard' | 'premium';
  aiMonthlyTokens?: number;
  nanobotBuddies?: string[];
  status: 'active' | 'inactive';
  students?: number;
  teachers?: number;
  stats?: { students: number; teachers: number; parents: number; classes: number };
  admins?: User[];
}

export interface ClassSection {
  _id: string;
  schoolId: string;
  grade: number;
  section: string;
  name: string;
  classTeacherId?: string | Ref | null;
  academicYear?: string;
  studentCount?: number;
  students?: User[];
  courses?: ClassCourse[];
  classTeacher?: User | null;
}

export interface Course {
  _id: string;
  title: string;
  description?: string;
  category?: string;
  grades?: number[];
  thumbnailUrl?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  status: 'draft' | 'published' | 'archived';
  unitCount?: number;
  completedUnits?: number;
  progress?: number;
  updatedAt?: string;
}

export type UnitType = 'lesson' | 'video' | 'pdf' | 'activity' | 'link' | 'presentation' | 'motion' | 'gallery' | 'sim3d';
export type BlockKind = 'text' | 'video' | 'presentation' | 'activity' | 'pdf' | 'link' | 'motion' | 'gallery' | 'sim3d' | 'check';
/** One piece of a learning unit's content; a unit is a list of blocks shown in order. */
export interface UnitBlock {
  _id?: string;
  key?: string; // client-side id for new blocks
  aiPending?: boolean; // client-side: fill this section with AI when it appears in the builder
  aiBrief?: string; // client-side: what the AI should write in this section (from a unit plan)
  aiFiles?: { url: string; name: string }[]; // client-side: the teacher's reference files for the AI
  kind: BlockKind;
  title?: string;
  body?: string;
  videoUrl?: string;
  fileUrl?: string;
  linkUrl?: string;
  motionUrl?: string;
  motionLoop?: boolean;
  simUrl?: string;
  deckTheme?: string;
  slides?: Slide[];
  gallery?: GalleryImage[];
  // Quick check
  question?: string;
  choices?: { _id?: string; text: string; correct?: boolean }[];
  explain?: string; // shown when right
  help?: string; // HTML shown when wrong: the idea explained more simply
}
export interface GalleryImage {
  _id?: string;
  url: string;
  caption?: string;
  alt?: string;
}

export type SlideLayout = 'title' | 'section' | 'bullets' | 'image-right' | 'image-full' | 'two-column' | 'quote' | 'icons' | 'steps' | 'fact' | 'quiz';
export interface Slide {
  _id?: string;
  layout: SlideLayout;
  title?: string;
  subtitle?: string;
  bullets?: string[];
  bullets2?: string[];
  imageUrl?: string;
  imageAlt?: string;
  notes?: string;
  background?: string;
  icon?: string; // built-in graphic (components/slides/graphics.tsx)
  icons?: string[]; // one per point (icons / steps)
  answer?: number; // quiz: the right option
}

export interface Unit {
  _id: string;
  courseId: string;
  chapterId: string;
  title: string;
  summary?: string;
  type: UnitType;
  body?: string;
  videoUrl?: string;
  fileUrl?: string;
  linkUrl?: string;
  durationMin?: number;
  position?: number;
  completed?: boolean;
  deckTheme?: string;
  slides?: Slide[];
  simUrl?: string;
  motionUrl?: string;
  motionLoop?: boolean;
  gallery?: GalleryImage[];
  blocks?: UnitBlock[];
}

export interface UnitDetail extends Unit {
  course: { _id: string; title: string; status: string };
  chapter: { _id: string; title: string };
  prev: { _id: string; title: string } | null;
  next: { _id: string; title: string } | null;
  checks?: Record<string, { passed: boolean; attempts: number }>; // the student's quick checks
  lang?: string; // language this unit is shown in
  languages?: string[]; // languages with an approved translation (always includes en)
}

export interface Chapter {
  _id: string;
  courseId: string;
  title: string;
  description?: string;
  position?: number;
  units: Unit[];
}

export interface CourseDetail extends Course {
  chapters: Chapter[];
  quizzes: QuizSummary[];
}

export interface CourseGrant {
  _id: string;
  courseId: Course;
  partnerId?: Ref | null;
  schoolId?: Ref | null;
  createdAt: string;
}

export interface ClassCourse {
  _id: string;
  schoolId: string;
  classId: ClassRef | string;
  courseId: Course | string;
  teacherId?: User | string | null;
  startDate?: string;
  endDate?: string;
}

export interface Question {
  _id?: string;
  text: string;
  type: 'single' | 'multiple' | 'true_false' | 'short';
  options: string[];
  correct?: number[];
  accepted?: string[]; // short answer: answers marked right (case and spacing ignored)
  mediaUrl?: string; // a picture the question is about
  hint?: string;
  points: number;
  explanation?: string;
}

export interface QuizSummary {
  _id: string;
  title: string;
  description?: string;
  courseId?: Ref | string | null;
  classId?: Ref | string | null;
  chapterId?: string;
  unitId?: string;
  status: 'draft' | 'published';
  timeLimitMin?: number | null;
  maxAttempts?: number;
  dueDate?: string | null;
  questionCount?: number;
  totalPoints?: number;
  attemptsUsed?: number;
  bestPercent?: number | null;
}

export interface Quiz extends QuizSummary {
  questions: Question[];
  shuffleQuestions?: boolean;
  showAnswers?: 'after_submit' | 'never';
  passPercent?: number | null;
  editable?: boolean;
  attempts?: QuizAttempt[];
  attemptsLeft?: number;
}

export interface QuizAttempt {
  _id: string;
  quizId: string;
  studentId: string | User;
  classId?: string | Ref;
  score: number;
  maxScore: number;
  percent: number;
  submittedAt: string;
}

export interface AttemptResult {
  attemptId: string;
  score: number;
  maxScore: number;
  percent: number;
  attemptsLeft: number;
  passed?: boolean | null;
  passPercent?: number | null;
  answersShown?: boolean;
  review: { questionId: string; type?: Question['type']; text: string; mediaUrl?: string; options: string[]; selected: number[]; typed?: string; correct: number[]; accepted?: string[]; isCorrect: boolean; points: number; explanation?: string }[];
}

export interface Submission {
  _id: string;
  assignmentId: string;
  studentId: string;
  text?: string;
  fileUrl?: string;
  linkUrl?: string;
  submittedAt: string;
  status: 'submitted' | 'graded' | 'returned';
  points?: number;
  feedback?: string;
  gradedAt?: string;
}

export interface Assignment {
  _id: string;
  schoolId: string;
  classId: Ref | string;
  courseId?: Ref | string | null;
  title: string;
  instructions?: string;
  kind: 'homework' | 'project' | 'activity';
  attachmentUrl?: string;
  dueDate?: string | null;
  maxPoints: number;
  status: 'draft' | 'published' | 'closed';
  createdBy: Ref | string;
  createdAt: string;
  submission?: Submission | null;
  submissionCount?: number;
  gradedCount?: number;
  roster?: { student: User; submission: Submission | null }[];
  submissions?: Submission[];
  steps?: TaskStep[] | null; // the student's own small steps ("break it into steps")
  stepsBy?: 'ai' | 'offline' | 'student' | null;
}

export interface TaskStep {
  _id?: string;
  text: string;
  minutes: number;
  done: boolean;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface Remark {
  _id: string;
  studentId: User | string;
  teacherId: User | string;
  category: 'appreciation' | 'improvement' | 'behaviour' | 'general';
  text: string;
  visibleToParent: boolean;
  createdAt: string;
}

export interface Announcement {
  _id: string;
  scope: 'global' | 'partner' | 'school' | 'class';
  schoolId?: Ref | string | null;
  classId?: Ref | string | null;
  audience: string[];
  title: string;
  body?: string;
  kind: 'announcement' | 'news' | 'newsletter';
  pinned?: boolean;
  createdBy?: (Ref & { role?: Role }) | string;
  createdAt: string;
}

export interface SchoolEvent {
  _id: string;
  schoolId?: Ref | string | null;
  classId?: Ref | string | null;
  title: string;
  description?: string;
  location?: string;
  startsAt: string;
  endsAt?: string;
}

export interface CourseProgress {
  course: Course;
  teacher?: Ref | null;
  unitCount: number;
  completedUnits: number;
  progress: number;
}

export interface StudentReport {
  student: { _id: string; name: string; rollNo?: string; avatarUrl?: string; class?: ClassRef };
  courses: CourseProgress[];
  overallProgress: number | null;
  quizzes: { count: number; averagePercent: number | null; recent: (QuizAttempt & { quizId: Ref })[] };
  assignments: {
    total: number;
    submitted: number;
    graded: number;
    averagePercent: number | null;
    pending: { _id: string; title: string; dueDate?: string; kind: string }[];
    overdue: { _id: string; title: string; dueDate?: string; kind: string }[];
  };
  attendance: { days: number; present: number; percent: number | null };
  remarks: Remark[];
}

export interface AiChat {
  _id: string;
  title: string;
  courseId?: Ref | null;
  unitId?: Ref | null;
  messages?: { role: 'user' | 'assistant'; content: string; at: string }[];
  updatedAt: string;
}

/** Many API fields come back either as an id or a populated object. */
export const refId = (v: unknown): string => (v && typeof v === 'object' ? String((v as { _id: string })._id) : String(v ?? ''));
export const refName = (v: unknown): string => (v && typeof v === 'object' ? String((v as { name?: string; title?: string }).name ?? (v as { title?: string }).title ?? '') : '');
