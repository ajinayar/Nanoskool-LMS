/** The signed-in person's learning preferences (language, calm mode, read aloud, text size, way of learning). */
import { useCallback } from 'react';
import { api } from '@/api/client';
import type { LearnPrefs } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';

export const DEFAULT_PREFS: Required<LearnPrefs> = { language: 'en', calm: false, readAloud: false, textSize: 'normal', learnWay: 'mixed', buddy: 'nano' };

export function usePrefs() {
  const { user, reload } = useAuth();
  const prefs: Required<LearnPrefs> = { ...DEFAULT_PREFS, ...(user?.prefs ?? {}) } as Required<LearnPrefs>;
  const setPrefs = useCallback(
    async (p: Partial<LearnPrefs>) => {
      await api.patch('/auth/me', { prefs: p });
      await reload();
    },
    [reload],
  );
  return { prefs, setPrefs };
}

/** How much bigger lesson text is for each text size. */
export const TEXT_SCALE = { normal: 1, large: 1.15, xlarge: 1.3 } as const;
