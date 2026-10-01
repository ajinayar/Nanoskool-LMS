import { speechCode } from '@/lib/languages';
import { usePrefs } from '@/lib/prefs';
import { sharedContext } from '@/lib/sharedContext';
import { useContext, useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMe } from '@/auth/AuthContext';
import { useGet, useSend } from '@/lib/hooks';
import { lookFor, type Look, calmLook } from './looks';

/**
 * While developing (npm run dev) you can preview any grade's look with ?grade=3 in the address
 * bar; it is remembered for this browser tab. ?grade=off goes back to the student's own grade.
 * Built apps ignore it, so students always see the look for their real grade.
 */
const PREVIEW_KEY = 'ns.previewGrade';
export const PREVIEW_ENABLED = import.meta.env.DEV;

function readPreview(): number | null {
  if (!PREVIEW_ENABLED) return null;
  try {
    const v = Number(sessionStorage.getItem(PREVIEW_KEY));
    return v >= 1 && v <= 12 ? v : null;
  } catch {
    return null;
  }
}

interface LookState {
  look: Look;
  realGrade: number | null;
  preview: number | null;
  setPreview: (g: number | null) => void;
}
const Ctx = sharedContext<LookState | null>('look', null);

export function LookProvider({ children }: { children: ReactNode }) {
  const me = useMe();
  const [params, setParams] = useSearchParams();
  const [preview, setPreviewState] = useState<number | null>(readPreview);
  const setPreview = (g: number | null) => {
    setPreviewState(g);
    try {
      if (g) sessionStorage.setItem(PREVIEW_KEY, String(g));
      else sessionStorage.removeItem(PREVIEW_KEY);
    } catch {
      /* storage blocked: preview lasts until reload */
    }
  };
  useEffect(() => {
    if (!PREVIEW_ENABLED) return;
    const q = params.get('grade');
    if (q == null) return;
    setPreview(q === 'off' ? null : Number(q) >= 1 && Number(q) <= 12 ? Number(q) : null);
    params.delete('grade');
    setParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  const realGrade = me.class?.grade ?? null;
  const { prefs } = usePrefs();
  const plain = lookFor(preview ?? realGrade);
  const look = prefs.calm ? calmLook(plain) : plain;
  return <Ctx.Provider value={{ look, realGrade, preview, setPreview }}>{children}</Ctx.Provider>;
}

export function useLookState() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLook must be used inside the student app');
  return v;
}
export const useLook = () => useLookState().look;
/** The student look when inside the student app, otherwise null (staff pages share some screens). */
export const useOptionalLook = () => useContext(Ctx)?.look ?? null;

export interface Badge {
  key: string;
  name: string;
  description: string;
  earned: boolean;
  earnedAt: string | null;
}
export interface Rewards {
  xp: number;
  level: number;
  levelStart: number;
  nextLevelAt: number;
  streak: number;
  bestStreak: number;
  learnedToday: boolean;
  daily: { claimed: boolean; canClaim: boolean; xp: number };
  quests: { key: 'unit' | 'quiz' | 'nanobot'; label: string; done: boolean }[];
  badges: Badge[];
  recent: { kind: 'unit' | 'quiz' | 'submission' | 'claim'; label: string; xp: number; at: string }[];
}

export const useRewards = () => useGet<Rewards>('/rewards/me');
export const useClaim = (success: string) => useSend<void, Rewards & { gained: number }>('post', '/rewards/claim', { success, invalidate: ['/rewards/me'] });

/** Progress through the current level, 0–100. */
export const levelPercent = (r: Pick<Rewards, 'xp' | 'levelStart' | 'nextLevelAt'>) => Math.round(((r.xp - r.levelStart) / Math.max(1, r.nextLevelAt - r.levelStart)) * 100);

/** Friendly title for a level, used on the younger grades. */
export function levelTitle(level: number) {
  return ['Little Learner', 'Bright Spark', 'Super Learner', 'Star Explorer', 'Rising Star', 'Brain Champion', 'Knowledge Hero', 'Master Mind'][Math.min(7, level - 1)];
}

const FEMALE =
  /female|woman|girl|zira|samantha|veena|lekha|heera|kalpana|priya|swara|neerja|aditi|raveena|karen|moira|tessa|fiona|victoria|susan|allison|ava|serena|kanya|sangeeta|pallavi|shruti|swathi|vani|kajal|ananya|meera|google uk english female/i;
const MALE = /\bmale\b|\bman\b|boy|david|mark|daniel|alex|rishi|hemant|prabhat|ravi|madhur|fred|tom|aaron|arthur|valluvar|mohan|gagan|kiran|manohar|hari|google uk english male/i;

export interface VoiceStyle {
  gender: 'f' | 'm' | 'any';
  pitch: number;
  rate: number;
}

/**
 * Read text aloud with the browser's voice, in the lesson's language (e.g. "hi" → a Hindi voice).
 * `style` picks a woman's or man's voice when the device has one, and sets pitch and speed (NanoBot buddies).
 * Returns false when this device has no voice for that language.
 */
export function speak(text: string, lang = 'en', style?: VoiceStyle) {
  try {
    const s = window.speechSynthesis;
    if (!s) return false;
    s.cancel();
    const code = speechCode(lang);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = code;
    u.rate = style?.rate ?? 0.92;
    u.pitch = style?.pitch ?? 1.1;
    const base = code.slice(0, 2);
    const voices = s.getVoices();
    const forLang = voices.filter((v) => v.lang.replace('_', '-') === code);
    const forBase = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
    const pool = forLang.length ? forLang : forBase.length ? forBase : base === 'en' ? voices.filter((v) => /en[-_](IN|GB|US)/i.test(v.lang)) : [];
    const want = style?.gender === 'f' ? FEMALE : style?.gender === 'm' ? MALE : null;
    const other = style?.gender === 'f' ? MALE : style?.gender === 'm' ? FEMALE : null;
    const voice = (want && pool.find((v) => want.test(v.name))) || (other && pool.find((v) => !other.test(v.name))) || pool[0];
    if (voice) u.voice = voice;
    s.speak(u);
    return !!voice || base === 'en' || voices.length === 0;
  } catch {
    return false;
  }
}

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}
