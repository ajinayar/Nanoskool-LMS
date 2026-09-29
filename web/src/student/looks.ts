/**
 * The student app changes with the student's grade. Every grade has its own "look": colours,
 * letter shapes, size, how playful the layout is, a mascot for the youngest, and the words used
 * for things ("My tasks" for Grade 1, "Assignments" for Grade 8).
 *
 * Three layout families carry the looks:
 *   little  (Grades 1–3)  big picture tiles, a mascot, stars, a bottom tab bar, read-aloud
 *   junior  (Grades 4–7)  friendly but tidier, XP levels, badges, quests, top navigation
 *   senior  (Grades 8–10) calm study dashboard, deadlines first, rewards kept in the background
 */
import { createTheme, type Theme } from '@mui/material/styles';
import bgMeadow from '@/assets/little/bg-meadow.webp';
import bgOcean from '@/assets/little/bg-ocean.webp';
import bgSpace from '@/assets/little/bg-space.webp';
import heroMeadow from '@/assets/little/hero-meadow.webp';
import heroOcean from '@/assets/little/hero-ocean.webp';
import heroOceanVideo from '@/assets/little/hero-ocean.mp4';
import heroSpace from '@/assets/little/hero-space.webp';
import nano1 from '@/assets/little/nano-1.webp';
import nano2 from '@/assets/little/nano-2.webp';
import nano3 from '@/assets/little/nano-3.webp';

export type Band = 'little' | 'junior' | 'senior';
export type Scene = 'meadow' | 'ocean' | 'space' | 'jungle' | 'lab' | 'quest';
export type Accessory = 'flower' | 'snorkel' | 'helmet' | 'hat' | 'goggles' | 'headphones';

export interface Words {
  home: string;
  courses: string;
  assignments: string;
  quizzes: string;
  progress: string;
  rewards: string;
  nanobot: string;
  points: string; // what XP is called
  level: string;
}

export interface Look {
  grade: number;
  band: Band;
  name: string; // name of the grade's world
  tagline: string;
  font: string;
  headingWeight: number;
  fontSize: number; // MUI base size in px
  radius: number; // card radius
  bg: string; // page background (CSS)
  surface: string;
  ink: string;
  ink2: string;
  line: string;
  primary: string;
  primaryInk: string;
  accent: string;
  soft: string; // tinted panel background
  tiles: string[]; // colours for picture tiles / categories
  hero: string; // hero banner background (CSS)
  heroInk: string;
  scene?: Scene;
  mascot?: { body: string; belly: string; accessory: Accessory };
  /** Painted artwork for the youngest grades: page backdrop, hero scene and Nano */
  art?: { backdrop: string; hero: string; heroVideo?: string; nano: string; ribbon: string };
  sidebar?: { bg: string; ink: string; ink2: string; active: string };
  words: Words;
}

const NUNITO = '"Nunito Variable", "Nunito", "Inter Variable", system-ui, sans-serif';
const INTER = '"Inter Variable", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

const LITTLE_WORDS: Words = { home: 'Home', courses: 'Lessons', assignments: 'My tasks', quizzes: 'Quiz games', progress: 'How I’m doing', rewards: 'My stars', nanobot: 'Ask Nano', points: 'stars', level: 'Level' };
const JUNIOR_WORDS: Words = { home: 'Home', courses: 'My courses', assignments: 'Assignments', quizzes: 'Quizzes', progress: 'My progress', rewards: 'Rewards', nanobot: 'NanoBot', points: 'XP', level: 'Level' };
const SENIOR_WORDS: Words = { home: 'Dashboard', courses: 'Courses', assignments: 'Assignments', quizzes: 'Quizzes', progress: 'Performance', rewards: 'Achievements', nanobot: 'AI tutor', points: 'XP', level: 'Level' };

const base = { surface: '#FFFFFF', ink: '#1E2233', ink2: '#5D6275', line: '#E6E8F0', primaryInk: '#FFFFFF' };

export const LOOKS: Record<number, Look> = {
  1: {
    ...base,
    grade: 1,
    band: 'little',
    name: 'Sunny Meadow',
    tagline: 'Play, learn and grow!',
    font: NUNITO,
    headingWeight: 900,
    fontSize: 16,
    radius: 28,
    bg: 'linear-gradient(180deg, #CDEBFF 0%, #FFF7DA 60%, #FFFBEF 100%)',
    ink: '#2A2440',
    primary: '#FF8A1F',
    accent: '#FFC928',
    soft: '#FFF3D6',
    tiles: ['#FF6B6B', '#FFB020', '#2FBF71', '#3E9BFF', '#A56BFF'],
    hero: 'linear-gradient(180deg, #7CCBFF 0%, #B9E6FF 55%, #9BE07A 55.1%, #6CCB55 100%)',
    heroInk: '#2A2440',
    scene: 'meadow',
    mascot: { body: '#FFD23F', belly: '#FFF1B8', accessory: 'flower' },
    art: { backdrop: bgMeadow, hero: heroMeadow, nano: nano1, ribbon: '#8B5CF6' },
    words: { ...LITTLE_WORDS, progress: 'My garden' },
  },
  2: {
    ...base,
    grade: 2,
    band: 'little',
    name: 'Ocean Friends',
    tagline: 'Dive in and discover!',
    font: NUNITO,
    headingWeight: 900,
    fontSize: 16,
    radius: 26,
    bg: 'linear-gradient(180deg, #C4F3F1 0%, #EAFBFF 60%, #F6FEFF 100%)',
    ink: '#16324A',
    primary: '#0AA5B5',
    accent: '#FF7A59',
    soft: '#DDF7F6',
    tiles: ['#FF7A59', '#FFC23D', '#18B99A', '#3D8BFF', '#9B6BFF'],
    hero: 'linear-gradient(180deg, #7FE0F0 0%, #3FC1D9 55%, #1B8FB8 100%)',
    heroInk: '#FFFFFF',
    scene: 'ocean',
    mascot: { body: '#5BD3E8', belly: '#DDF8FC', accessory: 'snorkel' },
    art: { backdrop: bgOcean, hero: heroOcean, heroVideo: heroOceanVideo, nano: nano2, ribbon: '#FF7A59' },
    words: { ...LITTLE_WORDS, assignments: 'Homework', progress: 'My progress' },
  },
  3: {
    ...base,
    grade: 3,
    band: 'little',
    name: 'Star Rangers',
    tagline: 'Blast off to learning!',
    font: NUNITO,
    headingWeight: 850,
    fontSize: 15.5,
    radius: 24,
    bg: 'linear-gradient(180deg, #ECE8FF 0%, #FFF0F7 70%, #FFF7FB 100%)',
    ink: '#221E45',
    primary: '#6C4CF1',
    accent: '#FFB547',
    soft: '#EFEBFF',
    tiles: ['#FF6B8B', '#FFB547', '#2DC08A', '#4C8DFF', '#8F6BFF'],
    hero: 'linear-gradient(160deg, #1D1B55 0%, #3D2B8E 60%, #6A3FB5 100%)',
    heroInk: '#FFFFFF',
    scene: 'space',
    mascot: { body: '#9C8CFF', belly: '#EAE6FF', accessory: 'helmet' },
    art: { backdrop: bgSpace, hero: heroSpace, nano: nano3, ribbon: '#FF6B8B' },
    words: { ...LITTLE_WORDS, assignments: 'Homework', quizzes: 'Quizzes', progress: 'My progress' },
  },
  4: {
    ...base,
    grade: 4,
    band: 'junior',
    name: 'Jungle Explorers',
    tagline: 'Every lesson is a new trail.',
    font: NUNITO,
    headingWeight: 800,
    fontSize: 15,
    radius: 22,
    bg: 'linear-gradient(180deg, #E8F6E4 0%, #FBFAF1 55%, #FFFDF6 100%)',
    ink: '#1F2A22',
    ink2: '#56645A',
    line: '#E1E9DD',
    primary: '#1E9A55',
    accent: '#F59E0B',
    soft: '#E7F5EA',
    tiles: ['#1E9A55', '#F59E0B', '#EF6A4C', '#3B82F6', '#8B5CF6'],
    hero: 'linear-gradient(120deg, #1C7C4A 0%, #2FA864 60%, #8BCB4F 100%)',
    heroInk: '#FFFFFF',
    scene: 'jungle',
    mascot: { body: '#4CC274', belly: '#DDF5E4', accessory: 'hat' },
    words: JUNIOR_WORDS,
  },
  5: {
    ...base,
    grade: 5,
    band: 'junior',
    name: 'Inventors’ Lab',
    tagline: 'Try it, test it, build it.',
    font: NUNITO,
    headingWeight: 800,
    fontSize: 15,
    radius: 20,
    bg: 'linear-gradient(180deg, #E4F5F6 0%, #F6F3FF 60%, #FBFAFF 100%)',
    ink: '#1C2A33',
    ink2: '#556570',
    line: '#DDE8EC',
    primary: '#0B8A93',
    accent: '#FF6F3C',
    soft: '#E2F4F5',
    tiles: ['#0B8A93', '#FF6F3C', '#7C5CFA', '#F4B400', '#E0457B'],
    hero: 'linear-gradient(120deg, #0B6F7A 0%, #0F9AA3 55%, #5FC6B8 100%)',
    heroInk: '#FFFFFF',
    scene: 'lab',
    mascot: { body: '#FF9A55', belly: '#FFE6D4', accessory: 'goggles' },
    words: JUNIOR_WORDS,
  },
  6: {
    ...base,
    grade: 6,
    band: 'junior',
    name: 'Quest Mode',
    tagline: 'Level up one lesson at a time.',
    font: INTER,
    headingWeight: 700,
    fontSize: 14.5,
    radius: 18,
    bg: 'linear-gradient(180deg, #EEF0FF 0%, #F8F6FF 50%, #FDF7FB 100%)',
    ink: '#1D1F3A',
    ink2: '#5A5E7A',
    line: '#E3E5F3',
    primary: '#4F46E5',
    accent: '#EC4899',
    soft: '#EEEEFE',
    tiles: ['#4F46E5', '#EC4899', '#14B8A6', '#F59E0B', '#0EA5E9'],
    hero: 'linear-gradient(120deg, #3730A3 0%, #4F46E5 55%, #A855F7 100%)',
    heroInk: '#FFFFFF',
    scene: 'quest',
    mascot: { body: '#7C83FF', belly: '#E6E7FF', accessory: 'headphones' },
    words: JUNIOR_WORDS,
  },
  7: {
    ...base,
    grade: 7,
    band: 'junior',
    name: 'Studio',
    tagline: 'Your space to learn and make.',
    font: INTER,
    headingWeight: 650,
    fontSize: 14.5,
    radius: 16,
    bg: '#F3F5F7',
    ink: '#18212B',
    ink2: '#5B6572',
    line: '#E1E5EA',
    primary: '#0F766E',
    accent: '#7C3AED',
    soft: '#E6F2F1',
    tiles: ['#0F766E', '#7C3AED', '#E4572E', '#2563EB', '#CA8A04'],
    hero: 'linear-gradient(120deg, #0F3B3A 0%, #115E59 55%, #0F766E 100%)',
    heroInk: '#FFFFFF',
    words: JUNIOR_WORDS,
  },
  8: {
    ...base,
    grade: 8,
    band: 'senior',
    name: 'Focus',
    tagline: 'Plan your week, own your progress.',
    font: INTER,
    headingWeight: 600,
    fontSize: 14,
    radius: 14,
    bg: '#F5F6F8',
    ink: '#111827',
    ink2: '#5B6474',
    line: '#E5E7EB',
    primary: '#2563EB',
    accent: '#0EA5E9',
    soft: '#EEF3FE',
    tiles: ['#2563EB', '#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6'],
    hero: '#FFFFFF',
    heroInk: '#111827',
    sidebar: { bg: '#FFFFFF', ink: '#111827', ink2: '#6B7280', active: '#EEF3FE' },
    words: SENIOR_WORDS,
  },
  9: {
    ...base,
    grade: 9,
    band: 'senior',
    name: 'Momentum',
    tagline: 'Consistency beats cramming.',
    font: INTER,
    headingWeight: 600,
    fontSize: 14,
    radius: 12,
    bg: '#F3F5F4',
    ink: '#0F1A16',
    ink2: '#56615C',
    line: '#E2E7E4',
    primary: '#047857',
    accent: '#F59E0B',
    soft: '#E7F3EE',
    tiles: ['#047857', '#F59E0B', '#2563EB', '#DC2626', '#7C3AED'],
    hero: '#FFFFFF',
    heroInk: '#0F1A16',
    sidebar: { bg: '#0F1F1A', ink: '#F1F5F3', ink2: '#9FB2AA', active: 'rgba(255,255,255,0.09)' },
    words: SENIOR_WORDS,
  },
  10: {
    ...base,
    grade: 10,
    band: 'senior',
    name: 'Board Ready',
    tagline: 'Your board year, one clear step at a time.',
    font: INTER,
    headingWeight: 600,
    fontSize: 14,
    radius: 10,
    bg: '#F6F5F2',
    ink: '#111111',
    ink2: '#5C5A55',
    line: '#E6E3DC',
    primary: '#18181B',
    accent: '#D97706',
    soft: '#F3EFE6',
    tiles: ['#18181B', '#D97706', '#2563EB', '#059669', '#DB2777'],
    hero: '#FFFFFF',
    heroInk: '#111111',
    sidebar: { bg: '#FFFFFF', ink: '#111111', ink2: '#6B6860', active: '#F3EFE6' },
    words: SENIOR_WORDS,
  },
};

/** Grades above 10 use the Grade 10 look; a student without a class gets the Grade 6 look. */
export function lookFor(grade?: number | null): Look {
  if (!grade) return LOOKS[6];
  return LOOKS[Math.min(10, Math.max(1, Math.round(grade)))];
}

const themes = new Map<number, Theme>();
export function themeFor(look: Look): Theme {
  const hit = themes.get(look.grade);
  if (hit) return hit;
  const little = look.band === 'little';
  const senior = look.band === 'senior';
  const heading = { fontWeight: look.headingWeight, letterSpacing: senior ? '-0.015em' : little ? '-0.005em' : '-0.01em' };
  const t = createTheme({
    palette: {
      mode: 'light',
      primary: { main: look.primary, contrastText: look.primaryInk },
      secondary: { main: look.accent, contrastText: '#FFFFFF' },
      background: { default: 'transparent', paper: look.surface },
      text: { primary: look.ink, secondary: look.ink2 },
      divider: look.line,
      success: { main: little ? '#23B26D' : '#16A34A' },
      error: { main: '#E0463A' },
      warning: { main: '#E59A0B' },
    },
    shape: { borderRadius: Math.round(look.radius / 2) },
    typography: {
      fontFamily: look.font,
      fontSize: look.fontSize,
      h4: { ...heading, fontSize: little ? '2.1rem' : senior ? '1.6rem' : '1.85rem' },
      h5: { ...heading, fontSize: little ? '1.55rem' : senior ? '1.25rem' : '1.4rem' },
      h6: { ...heading, fontSize: little ? '1.2rem' : senior ? '1rem' : '1.08rem' },
      subtitle1: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: little ? 800 : senior ? 500 : 700, letterSpacing: 0 },
    },
    components: {
      MuiCard: {
        defaultProps: { variant: senior ? 'outlined' : 'elevation', elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: look.radius,
            borderColor: look.line,
            boxShadow: senior ? 'none' : little ? '0 6px 0 rgba(40,30,80,0.06), 0 2px 10px rgba(40,30,80,0.06)' : '0 1px 2px rgba(20,20,50,0.05), 0 4px 16px rgba(20,20,50,0.05)',
          },
        },
      },
      MuiCardContent: { styleOverrides: { root: { padding: little ? 20 : 18, '&:last-child': { paddingBottom: little ? 20 : 18 } } } },
      MuiPaper: { styleOverrides: { rounded: { borderRadius: Math.round(look.radius * 0.8) }, outlined: { borderColor: look.line } } },
      MuiButton: {
        defaultProps: { disableElevation: true, size: little ? 'large' : 'medium' },
        styleOverrides: {
          root: { borderRadius: senior ? 8 : 999, paddingLeft: little ? 22 : 16, paddingRight: little ? 22 : 16, minHeight: little ? 48 : senior ? 36 : 40 },
        },
        variants: little ? [{ props: { variant: 'contained', color: 'primary' }, style: { boxShadow: `0 4px 0 ${shade(look.primary)}`, '&:hover': { boxShadow: `0 4px 0 ${shade(look.primary)}` } } }] : [],
      },
      MuiChip: { styleOverrides: { root: { fontWeight: little ? 800 : 600, borderRadius: senior ? 6 : 999 } } },
      MuiLinearProgress: { styleOverrides: { root: { height: little ? 14 : senior ? 6 : 10, borderRadius: 999, backgroundColor: look.soft }, bar: { borderRadius: 999 } } },
      MuiTextField: { defaultProps: { size: little ? 'medium' : 'small' } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: senior ? 8 : 14, backgroundColor: '#FFFFFF' } } },
      MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 700 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: look.radius } } },
      MuiTableCell: { styleOverrides: { root: { borderColor: look.line }, head: { color: look.ink2, fontWeight: 600, fontSize: 12.5 } } },
    },
  });
  themes.set(look.grade, t);
  return t;
}

/** A darker shade of a hex colour (for the chunky "pressable" button edge on little grades). */
export function shade(hex: string, amount = 0.22) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.round(c * (1 - amount)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('')}`;
}

/** Light tint of a hex colour, for icon backgrounds. */
export function tint(hex: string, alpha = 0.14) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
