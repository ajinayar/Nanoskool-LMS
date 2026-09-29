import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMe } from '@/auth/AuthContext';
import { useGet, useSend } from '@/lib/hooks';
import { lookFor, type Look } from './looks';

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
const Ctx = createContext<LookState | null>(null);

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
  const look = lookFor(preview ?? realGrade);
  return <Ctx.Provider value={{ look, realGrade, preview, setPreview }}>{children}</Ctx.Provider>;
}

export function useLookState() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLook must be used inside the student app');
  return v;
}
export const useLook = () => useLookState().look;

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
export const levelPercent = (r: Pick<Rewards, 'xp' | 'levelStart' | 'nextLevelAt'>) =>
  Math.round(((r.xp - r.levelStart) / Math.max(1, r.nextLevelAt - r.levelStart)) * 100);

/** Friendly title for a level, used on the younger grades. */
export function levelTitle(level: number) {
  return ['Little Learner', 'Bright Spark', 'Super Learner', 'Star Explorer', 'Rising Star', 'Brain Champion', 'Knowledge Hero', 'Master Mind'][Math.min(7, level - 1)];
}

/** Read text aloud with the browser's voice (used on Grades 1–3). */
export function speak(text: string) {
  try {
    const s = window.speechSynthesis;
    if (!s) return false;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92;
    u.pitch = 1.1;
    const voice = s.getVoices().find((v) => /en[-_](IN|GB|US)/i.test(v.lang));
    if (voice) u.voice = voice;
    s.speak(u);
    return true;
  } catch {
    return false;
  }
}
