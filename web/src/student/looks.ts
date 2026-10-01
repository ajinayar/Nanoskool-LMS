/**
 * The student app changes with the student's grade. Every grade has its own "look": colours,
 * letter shapes, size, how playful the layout is, a mascot for the youngest, and the words used
 * for things ("My tasks" for Grade 1, "Assignments" for Grade 8).
 *
 * Three layout families carry the looks:
 *   little  (Grades 1–3)  most playful: big picture tiles, painted art, stars, a bottom tab bar, read-aloud
 *   junior  (Grades 4–7)  still playful: rounded letters, bright colours, Nano the robot, chunky buttons, XP and badges
 *   senior  (Grades 8–10) a little calmer but still fun: rounded letters, colourful banners, Nano, study planner layout
 * Every step is only a small change from the one before, so older students still feel at home.
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

const LITTLE_WORDS: Words = { home: 'Home', courses: 'Lessons', assignments: 'My tasks', quizzes: 'Quiz games', progress: 'How I’m doing', rewards: 'My stars', nanobot: 'Ask Nano', points: 'stars', level: 'Level' };
const JUNIOR_WORDS: Words = { home: 'Home', courses: 'My courses', assignments: 'Assignments', quizzes: 'Quizzes', progress: 'My progress', rewards: 'Rewards', nanobot: 'NanoBot', points: 'XP', level: 'Level' };
const SENIOR_WORDS: Words = { home: 'Home', courses: 'My courses', assignments: 'Assignments', quizzes: 'Quizzes', progress: 'My progress', rewards: 'Rewards', nanobot: 'NanoBot', points: 'XP', level: 'Level' };

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
    tagline: 'Every lesson is a new trail!',
    font: NUNITO,
    headingWeight: 900,
    fontSize: 15.5,
    radius: 24,
    bg: 'linear-gradient(180deg, #D9F3D0 0%, #F4FBE8 45%, #FFFBEA 100%)',
    ink: '#1F2A22',
    ink2: '#4E5E52',
    line: '#DCEBD5',
    primary: '#1E9A55',
    accent: '#FF9F1C',
    soft: '#E4F6E6',
    tiles: ['#1E9A55', '#FF9F1C', '#FF6B5B', '#3B8BFF', '#9B6BFF'],
    hero: 'linear-gradient(120deg, #178A4B 0%, #2FB36A 55%, #9BD24F 100%)',
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
    tagline: 'Try it, test it, build it!',
    font: NUNITO,
    headingWeight: 900,
    fontSize: 15.5,
    radius: 24,
    bg: 'linear-gradient(180deg, #D4F4F5 0%, #EFF0FF 55%, #FFF6FB 100%)',
    ink: '#1C2A33',
    ink2: '#4F606B',
    line: '#D6E8EC',
    primary: '#0C98A2',
    accent: '#FF6F3C',
    soft: '#DDF4F5',
    tiles: ['#0C98A2', '#FF6F3C', '#8B6BFF', '#FFB800', '#F0508B'],
    hero: 'linear-gradient(120deg, #0B7F8A 0%, #11A9B2 55%, #6DD3C3 100%)',
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
    tagline: 'Level up one lesson at a time!',
    font: NUNITO,
    headingWeight: 900,
    fontSize: 15.5,
    radius: 22,
    bg: 'linear-gradient(180deg, #E4E6FF 0%, #F4EFFF 50%, #FFF1F8 100%)',
    ink: '#1D1F3A',
    ink2: '#565A78',
    line: '#E0E2F4',
    primary: '#5B4CF0',
    accent: '#F0479A',
    soft: '#ECEBFF',
    tiles: ['#5B4CF0', '#F0479A', '#16BFA8', '#FFA41B', '#1AA7EC'],
    hero: 'linear-gradient(120deg, #4231C8 0%, #5B4CF0 50%, #B45CF6 100%)',
    heroInk: '#FFFFFF',
    scene: 'quest',
    mascot: { body: '#7C83FF', belly: '#E6E7FF', accessory: 'headphones' },
    words: JUNIOR_WORDS,
  },
  7: {
    ...base,
    grade: 7,
    band: 'junior',
    name: 'Maker Studio',
    tagline: 'Your space to learn, make and share!',
    font: NUNITO,
    headingWeight: 850,
    fontSize: 15.5,
    radius: 22,
    bg: 'linear-gradient(180deg, #D8F1EE 0%, #EEF4FF 55%, #FFF4EC 100%)',
    ink: '#18212B',
    ink2: '#536070',
    line: '#DAE6E8',
    primary: '#0E8C80',
    accent: '#8B4DF5',
    soft: '#DFF2F0',
    tiles: ['#0E8C80', '#8B4DF5', '#FF6A3D', '#2F7BFF', '#F2B200'],
    hero: 'linear-gradient(120deg, #0B6F66 0%, #0E8C80 50%, #3FB8A6 100%)',
    heroInk: '#FFFFFF',
    scene: 'lab',
    mascot: { body: '#3FC3B3', belly: '#DDF6F2', accessory: 'goggles' },
    words: JUNIOR_WORDS,
  },
  8: {
    ...base,
    grade: 8,
    band: 'senior',
    name: 'Mission Control',
    tagline: 'Plan your week, power up your progress!',
    font: NUNITO,
    headingWeight: 850,
    fontSize: 15,
    radius: 20,
    bg: 'linear-gradient(180deg, #E3ECFF 0%, #F2F6FF 50%, #FDF8FF 100%)',
    ink: '#141B2E',
    ink2: '#525C73',
    line: '#DFE5F2',
    primary: '#2F6BF2',
    accent: '#FF7A45',
    soft: '#E8EFFE',
    tiles: ['#2F6BF2', '#FF7A45', '#14B88A', '#F5B300', '#9D5CF6'],
    hero: 'linear-gradient(120deg, #1E3FAE 0%, #2F6BF2 55%, #5AA8FF 100%)',
    heroInk: '#FFFFFF',
    scene: 'space',
    mascot: { body: '#6D9BFF', belly: '#E3ECFF', accessory: 'headphones' },
    sidebar: { bg: '#FFFFFF', ink: '#141B2E', ink2: '#5B6479', active: '#E8EFFE' },
    words: SENIOR_WORDS,
  },
  9: {
    ...base,
    grade: 9,
    band: 'senior',
    name: 'Momentum',
    tagline: 'Small steps every day add up to big wins!',
    font: NUNITO,
    headingWeight: 850,
    fontSize: 15,
    radius: 20,
    bg: 'linear-gradient(180deg, #D9F2E6 0%, #F0F8F3 50%, #FFF8EC 100%)',
    ink: '#0F1A16',
    ink2: '#4F5E57',
    line: '#D9E8E0',
    primary: '#0B9467',
    accent: '#FF9F1C',
    soft: '#E1F4EB',
    tiles: ['#0B9467', '#FF9F1C', '#2F7BFF', '#F0506E', '#8B5CF6'],
    hero: 'linear-gradient(120deg, #07704E 0%, #0B9467 55%, #4CC38A 100%)',
    heroInk: '#FFFFFF',
    scene: 'jungle',
    mascot: { body: '#3DC48C', belly: '#DDF5EA', accessory: 'hat' },
    sidebar: { bg: '#FFFFFF', ink: '#0F1A16', ink2: '#5A6962', active: '#E1F4EB' },
    words: SENIOR_WORDS,
  },
  10: {
    ...base,
    grade: 10,
    band: 'senior',
    name: 'Launch Pad',
    tagline: 'Board year? You’ve got this — one step at a time!',
    font: NUNITO,
    headingWeight: 850,
    fontSize: 15,
    radius: 18,
    bg: 'linear-gradient(180deg, #FFE9DC 0%, #FFF5EC 50%, #F3F1FF 100%)',
    ink: '#1D1A24',
    ink2: '#5E5866',
    line: '#EFE3DA',
    primary: '#E4572E',
    accent: '#6C4CF1',
    soft: '#FFEDE4',
    tiles: ['#E4572E', '#6C4CF1', '#14A38B', '#F5A700', '#2F7BFF'],
    hero: 'linear-gradient(120deg, #C43E1B 0%, #E4572E 50%, #FF9150 100%)',
    heroInk: '#FFFFFF',
    scene: 'quest',
    mascot: { body: '#FF8A5B', belly: '#FFE7DB', accessory: 'helmet' },
    sidebar: { bg: '#FFFFFF', ink: '#1D1A24', ink2: '#655E6C', active: '#FFEDE4' },
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
  // How playful each band is: 3 = Grades 1–3, 2 = Grades 4–7, 1 = Grades 8–10 (each a small step from the last)
  const play = little ? 3 : senior ? 1 : 2;
  const heading = { fontWeight: look.headingWeight, letterSpacing: '-0.005em' };
  const press = play + 1; // depth of the chunky "pressable" button edge, in px
  const t = createTheme({
    palette: {
      mode: 'light',
      primary: { main: look.primary, contrastText: look.primaryInk },
      secondary: { main: look.accent, contrastText: '#FFFFFF' },
      background: { default: 'transparent', paper: look.surface },
      text: { primary: look.ink, secondary: look.ink2 },
      divider: look.line,
      success: { main: '#23B26D' },
      error: { main: '#E0463A' },
      warning: { main: '#E59A0B' },
    },
    shape: { borderRadius: Math.round(look.radius / 2) },
    typography: {
      fontFamily: look.font,
      fontSize: look.fontSize,
      h4: { ...heading, fontSize: little ? '2.1rem' : senior ? '1.8rem' : '1.95rem' },
      h5: { ...heading, fontSize: little ? '1.55rem' : senior ? '1.35rem' : '1.45rem' },
      h6: { ...heading, fontSize: little ? '1.2rem' : senior ? '1.08rem' : '1.12rem' },
      subtitle1: { fontWeight: 700 },
      body2: { fontWeight: 500 },
      button: { textTransform: 'none', fontWeight: little ? 800 : 800, letterSpacing: 0 },
    },
    components: {
      MuiCard: {
        defaultProps: { variant: 'elevation', elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: look.radius,
            border: little ? '1px solid transparent' : `2px solid ${tint(look.primary, 0.16)}`,
            boxShadow: little ? '0 5px 0 rgba(40,30,80,0.06), 0 2px 12px rgba(40,30,80,0.05)' : `0 ${play + 3}px 0 ${tint(look.primary, 0.13)}, 0 2px 12px rgba(40,30,80,0.04)`,
          },
        },
      },
      MuiCardContent: { styleOverrides: { root: { padding: little ? 20 : 18, '&:last-child': { paddingBottom: little ? 20 : 18 } } } },
      MuiPaper: { styleOverrides: { rounded: { borderRadius: Math.round(look.radius * 0.8) }, outlined: { borderColor: look.line } } },
      MuiButton: {
        defaultProps: { disableElevation: true, size: little ? 'large' : 'medium' },
        styleOverrides: {
          root: {
            borderRadius: 999,
            paddingLeft: little ? 22 : 18,
            paddingRight: little ? 22 : 18,
            minHeight: little ? 48 : senior ? 40 : 42,
            transition: 'transform .12s, box-shadow .12s',
            '&:active': { transform: `translateY(${Math.min(2, press)}px)` },
          },
          outlined: { borderWidth: 2, '&:hover': { borderWidth: 2 } },
        },
        variants: [
          { props: { variant: 'contained', color: 'primary' }, style: { boxShadow: `0 ${press}px 0 ${shade(look.primary)}`, '&:hover': { boxShadow: `0 ${press}px 0 ${shade(look.primary)}` }, '&:active': { boxShadow: `0 1px 0 ${shade(look.primary)}` } } },
          { props: { variant: 'contained', color: 'secondary' }, style: { boxShadow: `0 ${press}px 0 ${shade(look.accent)}`, '&:hover': { boxShadow: `0 ${press}px 0 ${shade(look.accent)}` } } },
        ],
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 800, borderRadius: 999 } } },
      MuiLinearProgress: { styleOverrides: { root: { height: little ? 14 : senior ? 9 : 11, borderRadius: 999, backgroundColor: look.soft }, bar: { borderRadius: 999 } } },
      MuiTextField: { defaultProps: { size: little ? 'medium' : 'small' } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 14, backgroundColor: '#FFFFFF' } } },
      MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 800 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: look.radius } } },
      MuiTableCell: { styleOverrides: { root: { borderColor: look.line }, head: { color: look.ink2, fontWeight: 700, fontSize: 12.5 } } },
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
/** Blend a colour toward a soft grey (used by calm mode). */
export function soften(hex: string, amount = 0.4) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  const g = [0x9a, 0x9e, 0xae];
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c, i) => Math.round(c * (1 - amount) + g[i] * amount).toString(16).padStart(2, '0')).join('')}`;
}

/** Calm mode: softer colours, a plain background and no painted backdrop. */
export function calmLook(look: Look): Look {
  return {
    ...look,
    primary: soften(look.primary, 0.3),
    accent: soften(look.accent, 0.4),
    tiles: look.tiles.map((t) => soften(t, 0.45)),
    bg: '#F6F5F2',
    hero: `linear-gradient(135deg, ${soften(look.primary, 0.55)} 0%, ${soften(look.primary, 0.35)} 100%)`,
    art: look.art ? { ...look.art, backdrop: '', heroVideo: undefined } : undefined,
    scene: undefined,
  };
}

export function tint(hex: string, alpha = 0.14) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
