import { Box, CircularProgress, Typography } from '@mui/material';
import dayjs from 'dayjs';
import type { Assignment, QuizSummary } from '@/api/types';

export const S = '/student';

/** Circular progress with the value in the middle. */
export function ProgressRing({ value, size = 96, thickness = 5, color = 'secondary', label, light }: { value: number | null | undefined; size?: number; thickness?: number; color?: 'primary' | 'secondary' | 'success' | 'inherit'; label?: string; light?: boolean }) {
  const v = value ?? 0;
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <CircularProgress variant="determinate" value={100} size={size} thickness={thickness} sx={{ color: light ? 'rgba(255,255,255,0.25)' : '#E9EAF5', position: 'absolute', top: 0, left: 0 }} />
      <CircularProgress variant="determinate" value={v} size={size} thickness={thickness} color={color} sx={{ position: 'absolute', top: 0, left: 0, '& circle': { strokeLinecap: 'round' } }} />
      <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: size / 4.2, lineHeight: 1 }}>{value == null ? '—' : `${v}%`}</Typography>
          {label && <Typography sx={{ fontSize: Math.max(10, size / 9), opacity: 0.8 }}>{label}</Typography>}
        </Box>
      </Box>
    </Box>
  );
}

/** Where an assignment stands for the signed-in student. */
export type AssignmentState = 'todo' | 'overdue' | 'closed' | 'submitted' | 'returned' | 'graded';
export function assignmentState(a: Assignment): AssignmentState {
  const s = a.submission;
  if (s?.status === 'graded') return 'graded';
  if (s?.status === 'returned') return 'returned';
  if (s) return 'submitted';
  if (a.status === 'closed') return 'closed';
  if (a.dueDate && dayjs(a.dueDate).isBefore(dayjs())) return 'overdue';
  return 'todo';
}

export const quizClosed = (q: Pick<QuizSummary, 'dueDate'>) => !!(q.dueDate && dayjs(q.dueDate).isBefore(dayjs()));
export const attemptsLeft = (q: QuizSummary) => Math.max(0, (q.maxAttempts ?? 1) - (q.attemptsUsed ?? 0));

export function cheer(percent: number) {
  if (percent >= 90) return 'Outstanding work!';
  if (percent >= 75) return 'Great job!';
  if (percent >= 50) return 'Good effort. Keep practising!';
  return 'Keep going. Every try helps you learn!';
}
