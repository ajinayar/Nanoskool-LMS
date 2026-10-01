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
  habit?: string;
  framework?: Framework;
  domain?: PsyDomain;
  assessedBy?: 'quest' | 'observation' | 'both';
  anchors?: Partial<Record<'1' | '2' | '3' | '4', string>>;
  key?: string;
  levels?: Partial<Record<Stage, string>>;
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
  grades?: number[];
  status?: 'draft' | 'published';
  reverse?: boolean;
  framework?: Framework;
  informant?: 'self' | 'parent';
  validity?: '' | 'desirability';
  pairKey?: string;
  stimulus?: string; // cognitive: shown first, then hidden (working memory)
  stimulusSec?: number | null;
  timeSec?: number | null; // cognitive: time allowed (attention & speed)
  translations?: ItemTranslation[];
}
export interface ItemTranslation {
  lang: string;
  prompt?: string;
  options?: string[];
  scaleLabels?: string[];
  backTranslation?: string;
  status?: 'draft' | 'approved';
}
export interface AssessmentForm {
  _id: string;
  title: string;
  grade: number;
  informant?: 'self' | 'parent';
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
  level: Stage;
}
export interface MyMission {
  consent: boolean;
  due: boolean;
  form: (Pick<AssessmentForm, '_id' | 'title' | 'intro' | 'grade' | 'timeLimitMin'> & { questionCount: number }) | null;
  items: AssessmentItem[];
  attempt: { _id: string; answers: { itemId: string; selected?: number[]; value?: number; text?: string; fileUrl?: string }[] } | null;
  lastResult: { status: string; submittedAt: string; skillScores: SkillScore[] } | null;
  needsAssent?: boolean;
  languages?: string[];
  lang?: string;
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
  name: string; // academic name
  habit?: string; // Genius Habit name
  color?: string;
  first: number | null;
  latest: number | null;
  firstStage?: Stage | null;
  level: Stage | null;
  hasEvidence?: boolean;
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
/* Genius Habits: every habit grows Seed → Sprout → Sapling → Bloom → Fruit (Fruit = genius, needs verified work). */
export type Stage = 'seed' | 'sprout' | 'sapling' | 'bloom' | 'fruit';
export const STAGES: Stage[] = ['seed', 'sprout', 'sapling', 'bloom', 'fruit'];
export const STAGE_INFO: Record<Stage, { label: string; icon: string; range: string; adult: string; child: string; color: string; soft: string }> = {
  seed: { label: 'Seed', icon: '🌰', range: '0–29', adult: 'The habit is just starting to show', child: 'Your seed is planted!', color: '#8D6E4E', soft: '#F3EBE1' },
  sprout: { label: 'Sprout', icon: '🌱', range: '30–49', adult: 'Uses it with help and reminders', child: 'It’s sprouting!', color: '#5C9E2F', soft: '#EAF5E0' },
  sapling: { label: 'Sapling', icon: '🌿', range: '50–69', adult: 'Uses it on their own, reliably', child: 'You’re growing strong!', color: '#2F8F5B', soft: '#DDF2E7' },
  bloom: { label: 'Bloom', icon: '🌸', range: '70–84', adult: 'Uses it confidently, by choice, in new situations', child: 'You’re blooming!', color: '#C2477E', soft: '#FBE3EE' },
  fruit: { label: 'Fruit', icon: '🍎', range: '85+ and verified work', adult: 'Creates something original with it, or helps others grow it: the genius stage', child: 'Your tree is bearing fruit, genius!', color: '#D9480F', soft: '#FFE8D9' },
};
export const LEVEL_LABEL: Record<Stage, string> = Object.fromEntries(STAGES.map((s) => [s, STAGE_INFO[s].label])) as Record<Stage, string>;
export const stageLabel = (s?: Stage | null) => (s ? `${STAGE_INFO[s].icon} ${STAGE_INFO[s].label}` : 'Not yet');
export const ACTIVITY_LABEL: Record<ActivityKind, string> = { quiz: 'Quiz', project: 'Project', presentation: 'Presentation', reflection: 'Reflection', tool: 'Tool' };
export const GRADES_1_10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
/** "1–3, 5" style label for a list of grades. */
export function gradesLabel(g?: number[]) {
  const list = [...new Set(g ?? [])].sort((a, b) => a - b);
  if (!list.length) return '—';
  const parts: string[] = [];
  for (let i = 0; i < list.length; i++) {
    let j = i;
    while (j + 1 < list.length && list[j + 1] === list[j] + 1) j++;
    parts.push(j > i + 1 ? `${list[i]}–${list[j]}` : j === i + 1 ? `${list[i]}, ${list[j]}` : `${list[i]}`);
    i = j;
  }
  return parts.join(', ');
}

/** A new id for objectives and activities created in the browser (a valid Mongo ObjectId). */
export const newId = () =>
  Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, '0') + Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('');

/* ------------------------------------------------------------------ Psychometric profile ("Know Yourself") */

/** Three separate parts: the 8 Genius Habits, the psychometric profile (Know Yourself) and the cognitive profile (Thinking Puzzles). */
export type Framework = 'genius' | 'psychometric' | 'cognitive';
export type PsyDomain = 'personality' | 'physical' | 'spiritual' | 'cognitive';
export type PsyBand = 'growing' | 'developing' | 'good' | 'strength';
/** Thinking moved to Part 3 · Cognitive profile; 'cognitive' stays only for older data. */
export const PSY_DOMAINS: PsyDomain[] = ['personality', 'physical', 'spiritual'];
export const PSY_DOMAIN_INFO: Record<PsyDomain, { label: string; child: string; icon: string; color: string; soft: string; about: string }> = {
  personality: { label: 'Personality', child: 'Me and others', icon: '😊', color: '#7C3AED', soft: '#F3EEFF', about: 'Personal hygiene, grooming, etiquette, manners and social confidence.' },
  physical: { label: 'Physical', child: 'My body', icon: '🏃', color: '#16A34A', soft: '#ECFDF3', about: 'Fitness and stamina, coordination, healthy habits, sportsmanship and safety.' },
  spiritual: { label: 'Spiritual (values)', child: 'My heart', icon: '🕊️', color: '#EA8A00', soft: '#FFF6E5', about: 'Inner calm, honesty, gratitude, kindness and care for life — values, not religion.' },
  cognitive: { label: 'Thinking (moved to the cognitive profile)', child: 'My thinking', icon: '🔍', color: '#2563EB', soft: '#EEF4FF', about: 'Now measured with Thinking Puzzles in Part 3 · Cognitive profile.' },
};
export const PSY_BAND_INFO: Record<PsyBand, { label: string; child: string; color: string; soft: string }> = {
  growing: { label: 'Growing area', child: 'Let’s grow this', color: '#B45309', soft: '#FFF4E5' },
  developing: { label: 'Developing', child: 'Getting there', color: '#A16207', soft: '#FEF9C3' },
  good: { label: 'Good', child: 'Doing well', color: '#15803D', soft: '#ECFDF3' },
  strength: { label: 'Strength', child: 'Super strength!', color: '#6D28D9', soft: '#F3EEFF' },
};
export const OBS_LEVELS = ['', 'Rarely', 'Sometimes', 'Usually', 'Always'] as const;
export interface PsyDimension {
  _id: string;
  name: string;
  domain: PsyDomain;
  color?: string;
  description?: string;
  assessedBy?: 'quest' | 'observation' | 'both';
  quest: number | null;
  firstQuest: number | null;
  observedLevel: number | null;
  score: number | null;
  band: PsyBand | null;
  sources: { self: number | null; parent: number | null; teacher: number | null; fitness: number | null; raters: number };
  range: [number, number] | null;
  percentile: number | null;
  normed: boolean;
}
export interface PsyProfile {
  grade?: number | null;
  consent?: boolean;
  withheld?: boolean;
  assessedAt: string | null;
  parentAt?: string | null;
  flags?: string[];
  flagText?: string[];
  normed?: boolean;
  weights?: { self: number; parent: number; teacher: number; fitness: number };
  fitnessTests?: { test: string; label: string; value: number; unit: string; percentile: number | null; term: string }[];
  attention?: string[];
  observedAt: string | null;
  domains: { id: PsyDomain; score: number | null; band: PsyBand | null; dimensions: PsyDimension[] }[];
}

/* ------------------------------------------------------------------ Cognitive profile ("Thinking Puzzles") */

export interface CogArea {
  _id: string;
  key: string;
  name: string;
  child: string;
  icon: string;
  color?: string;
  description?: string;
  score: number | null;
  answered: number;
  previous: number | null;
  percentile: number | null;
  normed: boolean;
  band: PsyBand | null;
}
export interface CogProfile {
  grade: number | null;
  stage: 'little' | 'junior' | 'senior';
  consent: boolean;
  withheld?: boolean;
  assessedAt: string | null;
  times: number;
  normed: boolean;
  areas: CogArea[];
  strengths: string[];
  growing: string[];
}

export const LANG_NAMES: Record<string, string> = { en: 'English', hi: 'हिन्दी', ml: 'മലയാളം', ta: 'தமிழ்', kn: 'ಕನ್ನಡ', te: 'తెలుగు', mr: 'मराठी', bn: 'বাংলা', gu: 'ગુજરાતી', pa: 'ਪੰਜਾਬੀ', or: 'ଓଡ଼ିଆ' };
