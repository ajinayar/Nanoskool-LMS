/**
 * A quick check inside a lesson: one question with choices.
 *   Right → a short "why it's right" and the next part of the lesson opens.
 *   Wrong → the idea explained more simply, then another try (the answer is never given away).
 * For students the answer is checked by the server; in previews (course studio, teachers) it is checked here.
 */
import { Box, Button, ButtonBase, CircularProgress, Stack, Typography } from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircleRounded';
import Cancel from '@mui/icons-material/CancelRounded';
import Lock from '@mui/icons-material/LockRounded';
import Replay from '@mui/icons-material/ReplayRounded';
import VolumeUp from '@mui/icons-material/VolumeUpRounded';
import { useState } from 'react';
import { api, errorMessage } from '@/api/client';
import type { UnitBlock } from '@/api/types';
import { RichText } from '@/components/ui';

type Result = { correct: boolean; explain?: string; help?: string; attempts: number };

export function QuickCheck({
  b,
  unitId,
  lang,
  passed,
  onPassed,
  color = '#D6336C',
  radius = 16,
  big,
  calm,
  onListen,
  onAskNano,
}: {
  b: UnitBlock;
  unitId?: string; // set for students: answers are checked and saved by the server
  lang?: string;
  passed?: boolean;
  onPassed?: () => void;
  color?: string;
  radius?: number;
  big?: boolean; // younger grades: bigger buttons
  calm?: boolean;
  onListen?: (text: string) => void;
  onAskNano?: () => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [res, setRes] = useState<Result | null>(passed ? { correct: true, attempts: 1 } : null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const choices = (b.choices ?? []).filter((c) => c.text?.trim());
  const done = res?.correct;
  // Parents see the question but not the answers, so it can't be tried here
  const canTry = !!unitId || choices.some((c) => c.correct !== undefined);

  const answer = async (i: number) => {
    if (done || busy) return;
    setPicked(i);
    setErr(null);
    if (!unitId || !b._id) {
      // Preview: check here
      const correct = !!choices[i].correct;
      setRes((r) => ({ correct, attempts: (r?.attempts ?? 0) + 1, explain: correct ? b.explain : undefined, help: correct ? undefined : b.help }));
      if (correct) onPassed?.();
      else wobble();
      return;
    }
    setBusy(true);
    try {
      const r = await api.post<Result>(`/units/${unitId}/checks/${b._id}`, { choice: (b.choices ?? []).indexOf(choices[i]), lang });
      setRes(r.data);
      if (r.data.correct) onPassed?.();
      else wobble();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const wobble = () => {
    if (calm) return;
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };
  const retry = () => {
    setPicked(null);
    setRes(null);
  };

  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: big ? 21 : 18, lineHeight: 1.35, flex: 1 }}>{b.question || 'Question'}</Typography>
        {onListen && (
          <ButtonBase onClick={() => onListen([b.question, ...choices.map((c, i) => `${String.fromCharCode(65 + i)}. ${c.text}`)].join('. '))} aria-label="Listen to the question" sx={{ borderRadius: '50%', p: 0.75, color, bgcolor: `${color}14` }}>
            <VolumeUp />
          </ButtonBase>
        )}
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gap: 1.25,
          gridTemplateColumns: { xs: '1fr', sm: choices.length > 2 && choices.every((c) => c.text.length < 40) ? '1fr 1fr' : '1fr' },
          ...(shake ? { animation: 'qc-shake .4s', '@keyframes qc-shake': { '0%,100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-6px)' }, '75%': { transform: 'translateX(6px)' } } } : {}),
        }}
      >
        {choices.map((c, i) => {
          const isPicked = picked === i;
          const state = done && (isPicked || passed) && (unitId ? isPicked : c.correct) ? 'right' : res && !res.correct && isPicked ? 'wrong' : 'idle';
          const tone = state === 'right' ? '#2B8A3E' : state === 'wrong' ? '#C92A2A' : color;
          return (
            <ButtonBase
              key={c._id ?? i}
              onClick={() => answer(i)}
              disabled={!canTry || !!done || (!!res && !res.correct)}
              sx={{
                justifyContent: 'flex-start',
                textAlign: 'left',
                gap: 1.25,
                p: big ? 1.75 : 1.4,
                borderRadius: `${Math.min(radius, 18)}px`,
                border: '2px solid',
                borderColor: state === 'idle' ? `${color}40` : tone,
                bgcolor: state === 'right' ? '#EBFBEE' : state === 'wrong' ? '#FFF5F5' : '#fff',
                boxShadow: calm || state !== 'idle' ? 'none' : `0 3px 0 ${color}26`,
                transition: calm ? 'none' : 'transform .1s, border-color .15s',
                '&:hover': { borderColor: done ? undefined : color },
                '&:active': { transform: calm ? 'none' : 'translateY(2px)' },
                '&.Mui-disabled': { opacity: state === 'idle' && done ? 0.55 : 1 },
              }}
            >
              <Box sx={{ width: big ? 34 : 28, height: big ? 34 : 28, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: big ? 16 : 14, bgcolor: state === 'idle' ? `${color}14` : tone, color: state === 'idle' ? color : '#fff' }}>
                {state === 'right' ? <CheckCircle sx={{ fontSize: 20 }} /> : state === 'wrong' ? <Cancel sx={{ fontSize: 20 }} /> : String.fromCharCode(65 + i)}
              </Box>
              <Typography sx={{ fontWeight: 650, fontSize: big ? 18 : 16 }}>{c.text}</Typography>
              {busy && isPicked && <CircularProgress size={16} sx={{ ml: 'auto' }} />}
            </ButtonBase>
          );
        })}
      </Box>

      {!canTry && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Students answer this in their lesson before the next part opens.
        </Typography>
      )}
      {err && <Typography sx={{ color: 'error.main', mt: 1.5 }}>{err}</Typography>}

      {done && (
        <Box sx={{ mt: 2, p: 1.75, borderRadius: `${Math.min(radius, 16)}px`, bgcolor: '#EBFBEE', border: '1px solid #B2F2BB' }}>
          <Typography sx={{ fontWeight: 800, color: '#2B8A3E', mb: res?.explain ? 0.5 : 0 }}>{passed && picked === null ? '✓ You got this one already' : big ? '🎉 Yes! Well done!' : '✓ That’s right!'}</Typography>
          {res?.explain && <Typography>{res.explain}</Typography>}
        </Box>
      )}

      {res && !res.correct && (
        <Box sx={{ mt: 2, p: 1.75, borderRadius: `${Math.min(radius, 16)}px`, bgcolor: '#FFF9DB', border: '1px solid #FFE066' }}>
          <Typography sx={{ fontWeight: 800, color: '#8F6400', mb: 0.75 }}>{big ? 'Almost! Let’s look again 👀' : 'Not quite — here it is another way'}</Typography>
          {res.help ? <RichText html={res.help} /> : <Typography>Read the part above once more, then try again.</Typography>}
          <Stack direction="row" sx={{ gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
            <Button variant="contained" startIcon={<Replay />} onClick={retry}>
              Try again
            </Button>
            {onAskNano && <Button onClick={onAskNano}>Ask NanoBot to explain</Button>}
          </Stack>
        </Box>
      )}
    </Box>
  );
}

/** Shown in place of the rest of the lesson until the check above is answered. */
export function LockedRest({ color = '#D6336C', radius = 16, count }: { color?: string; radius?: number; count: number }) {
  return (
    <Box sx={{ p: 2.5, borderRadius: `${radius}px`, border: `2px dashed ${color}55`, bgcolor: `${color}08`, textAlign: 'center' }}>
      <Lock sx={{ color, fontSize: 30, mb: 0.5 }} />
      <Typography sx={{ fontWeight: 800 }}>Answer the quick check to open the next part</Typography>
      <Typography variant="body2" color="text.secondary">
        {count} more part{count === 1 ? '' : 's'} waiting for you
      </Typography>
    </Box>
  );
}
