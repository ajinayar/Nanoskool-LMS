/** Types for the learning journey: objectives, outcome activities, evidence, skills and guidance. */
import type { Ref } from './types';

export type ActivityKind = 'quiz' | 'project' | 'presentation' | 'reflection' | 'tool';
export type MediaKind = 'photo' | 'video' | 'file' | 'link';
export type OutcomeBand = 'mastered' | 'achieved' | 'approaching' | 'not_yet';
export type GradeBand = 'little' | 'junior' | 'senior';

export interface Objective {
  _id: string;
  title: string;
  description?: string;
  criteria?: string;
  skillIds?: string[];
  weight?: number;
}

export interface Activity {
  _id: string;
  kind: ActivityKind;
  title: string;
  instructions?: string;
  quizId?: string | null;
  toolId?: string | null;
  objectiveIds: string[];
  scoring?: 'auto' | 'rubric' | 'rating';
  weight?: number;
  required?: boolean;
  mediaTypes?: MediaKind[];
}

export interface Tool {
  _id: string;
  name: string;
  kind: 'super_tutor' | 'debate' | 'other';
  description?: string;
  launchUrl?: string;
  active?: boolean;
  connected?: boolean;
  secret?: string;
}

export interface ActivityState {
  activityId: string;
  status: 'not_started' | 'pending' | 'returned' | 'scored';
  score: number | null;
  evidenceId?: string;
}
export interface ObjectiveOutcome {
  objectiveId: string;
  title: string;
  score: number | null;
  band: OutcomeBand | null;
}
export interface UnitOutcome {
  unitId: string;
  score: number | null;
  band: OutcomeBand | null;
  objectives: ObjectiveOutcome[];
  activities: ActivityState[];
  missingRequired: number;
}

export interface EvidenceMedia {
  kind: MediaKind;
  url: string;
  name?: string;
}
export interface Evidence {
  _id: string;
  studentId: string | (Ref & { avatarUrl?: string; rollNo?: string });
  classId?: string | Ref;
  courseId: string | (Ref & { title?: string });
  unitId: string;
  activityId: string;
  objectiveIds: string[];
  source: 'student' | 'tool';
  media: EvidenceMedia[];
  caption?: string;
  summary?: string;
  score?: number;
  rubricLevel?: number;
  feedback?: string;
  status: 'pending' | 'verified' | 'returned';
  visibility: 'private' | 'class' | 'parent' | 'showcase';
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
  // added by the review list / portfolio
  unit?: { _id: string; title: string } | null;
  activity?: { _id: string; title: string; kind: ActivityKind; scoring?: string; instructions?: string } | null;
  objectives?: { _id: string; title: string; criteria?: string }[];
  activityTitle?: string;
}

export interface Skill {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  levels?: { emerging?: string; developing?: string; proficient?: string; advanced?: string };
  minGrade?: number;
  maxGrade?: number;
  position?: number;
  active?: boolean;
}

export type ItemType = 'single' | 'multiple' | 'scale' | 'open' | 'upload';
export interface AssessmentItem {
  _id: string;
  type: ItemType;
  prompt: string;
  mediaUrl?: string;
  options?: { text: string; score?: number }[];
  scaleLabels?: string[];
  rubric?: string[];
  skills?: { skillId: string; weight: number }[];
  bands?: GradeBand[];
  status?: 'draft' | 'published';
}
export interface AssessmentForm {
  _id: string;
  title: string;
  band: GradeBand;
  intro?: string;
  itemIds: string[];
  timeLimitMin?: number | null;
  status: 'draft' | 'published' | 'retired';
  version: number;
  attemptCount?: number;
  questionCount?: number;
}
export interface SkillScore {
  skillId: string;
  score: number;
  level: 'emerging' | 'developing' | 'proficient' | 'advanced';
}
export interface MyMission {
  consent: boolean;
  due: boolean;
  form: (Pick<AssessmentForm, '_id' | 'title' | 'intro' | 'band' | 'timeLimitMin'> & { questionCount: number }) | null;
  items: AssessmentItem[];
  attempt: { _id: string; answers: { itemId: string; selected?: number[]; value?: number; text?: string; fileUrl?: string }[] } | null;
  lastResult: { status: string; submittedAt: string; skillScores: SkillScore[] } | null;
}

export interface Advice {
  key: string;
  kind: 'setup' | 'next' | 'reroute' | 'alert' | 'strength';
  title: string;
  text: string;
  why: string;
  action?: { label: string; to: string };
}

export interface PortfolioSkill {
  _id: string;
  name: string;
  color?: string;
  first: number | null;
  latest: number | null;
  level: SkillScore['level'] | null;
}
export interface Portfolio {
  student: { _id: string; name: string; avatarUrl?: string; interests: string[]; class?: { name: string; grade: number; academicYear?: string } | null; school?: { name: string; logoUrl?: string } | null };
  stats: { evidence: number; verified: number; unitsWithOutcome: number; averageOutcome: number | null; mastered: number };
  skills: { assessedAt: string | null; attempts: number; skills: PortfolioSkill[] };
  courses: { _id: string; title: string; thumbnailUrl?: string; units: { _id: string; title: string; score: number | null; band: OutcomeBand | null; objectives: ObjectiveOutcome[]; evidence: Evidence[] }[] }[];
  featured: Evidence[];
}

export const BAND_LABEL: Record<OutcomeBand, string> = { mastered: 'Mastered', achieved: 'Achieved', approaching: 'Approaching', not_yet: 'Not yet' };
export const BAND_TONE: Record<OutcomeBand, [string, string]> = {
  mastered: ['#E6DCFB', '#4C2F9C'],
  achieved: ['#D3EEDD', '#1D6B3E'],
  approaching: ['#FCE0B8', '#86500A'],
  not_yet: ['#FBD5C6', '#9A3A16'],
};
export const LEVEL_LABEL: Record<SkillScore['level'], string> = { emerging: 'Emerging', developing: 'Developing', proficient: 'Proficient', advanced: 'Advanced' };
export const ACTIVITY_LABEL: Record<ActivityKind, string> = { quiz: 'Quiz', project: 'Project', presentation: 'Presentation', reflection: 'Reflection', tool: 'Tool' };
export const BAND_GRADES: Record<GradeBand, string> = { little: 'Grades 1–3', junior: 'Grades 4–7', senior: 'Grades 8–10' };

/** A new id for objectives and activities created in the browser (a valid Mongo ObjectId). */
export const newId = () =>
  Math.floor(Date.now() / 1000).toString(16).padStart(8, '0') +
  Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('');
