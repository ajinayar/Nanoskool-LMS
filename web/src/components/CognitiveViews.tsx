/**
 * Part 3 · Cognitive profile ("Thinking Puzzles"), kept apart from the Genius Habits and Know Yourself.
 *   CogProfileView   six thinking areas as a strengths shape (never one overall score, IQ or rank)
 *   CognitiveSection staff view of one student
 *   ParentThinking   the parent's view: permission, the profile and erasing data
 */
import { Alert, Box, Button, Card, CardContent, FormControlLabel, LinearProgress, Stack, Switch, Typography } from '@mui/material';
import { useState } from 'react';
import type { CogArea, CogProfile } from '@/api/journey';
import { useGet, useSend } from '@/lib/hooks';
import { ConfirmDialog, QueryState, fmtDate } from '@/components/ui';
import { PsyBandChip } from './PsychometricViews';

const soft = (hex = '#6C4CF1', a = 0.12) =>
  `${hex}${Math.round(a * 255)
    .toString(16)
    .padStart(2, '0')}`;

function AreaTile({ a, child, strong, grow }: { a: CogArea; child: boolean; strong: boolean; grow: boolean }) {
  const c = a.color ?? '#6C4CF1';
  const delta = a.score != null && a.previous != null ? a.score - a.previous : null;
  return (
    <Box sx={{ p: child ? 2.25 : 2, borderRadius: child ? '22px' : '16px', bgcolor: '#fff', border: `${strong ? 2 : 1}px solid ${strong ? c : '#E7E6EE'}`, position: 'relative', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      {(strong || grow) && (
        <Box sx={{ position: 'absolute', top: -10, right: 12, px: 1, py: 0.2, borderRadius: 999, fontSize: 11.5, fontWeight: 800, color: '#fff', bgcolor: strong ? c : '#B45309' }}>
          {strong ? (child ? '⭐ Top power' : 'Strongest') : child ? '🌱 Grow next' : 'Grow next'}
        </Box>
      )}
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <Box sx={{ width: child ? 52 : 42, height: child ? 52 : 42, borderRadius: '14px', bgcolor: soft(c), display: 'grid', placeItems: 'center', fontSize: child ? 28 : 22, flexShrink: 0 }}>{a.icon}</Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: child ? 17 : 15, lineHeight: 1.25 }}>{child ? a.child : a.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {child ? a.name : a.child}
          </Typography>
        </Box>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={a.score ?? 0}
        aria-label={`${a.name}: ${a.score ?? 'not yet'}`}
        sx={{ height: child ? 12 : 8, borderRadius: 999, bgcolor: '#F0EFF4', '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: a.band ? c : '#D0CFD6' } }}
      />
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <PsyBandChip band={a.band} child={child} />
        {!child && a.score != null && (
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
            {a.score}% solved{a.percentile != null ? ` · percentile ${a.percentile}` : ''}
          </Typography>
        )}
      </Stack>
      {delta != null && delta !== 0 && (
        <Typography variant="caption" sx={{ fontWeight: 700, color: delta > 0 ? '#15803D' : 'text.secondary' }}>
          {delta > 0 ? `▲ ${delta} since last time` : child ? 'A little different from last time' : `▼ ${-delta} since last time`}
        </Typography>
      )}
      {!child && a.description && (
        <Typography variant="caption" color="text.secondary">
          {a.description}
        </Typography>
      )}
    </Box>
  );
}

export function CogProfileView({ p, audience = 'adult' }: { p: CogProfile; audience?: 'adult' | 'child' }) {
  const child = audience === 'child';
  if (p.withheld) return <Alert severity="info">A parent has not given permission for Thinking Puzzles, so the cognitive profile is not shown.</Alert>;
  const scored = p.areas.filter((a) => a.score != null);
  if (!scored.length) return <Alert severity="info">{child ? 'Play Thinking Puzzles to see your thinking super powers here!' : 'No results yet. The cognitive profile fills in when the child finishes Thinking Puzzles (once a term).'}</Alert>;
  const name = (k: string) => p.areas.find((a) => a.key === k);
  return (
    <Stack spacing={2}>
      {p.strengths.length > 0 && (
        <Box sx={{ p: child ? 2.25 : 2, borderRadius: child ? '22px' : '16px', background: 'linear-gradient(120deg, #F3EEFF, #EEF4FF)', border: '1px solid #E4DCFA' }}>
          <Typography sx={{ fontWeight: 800, fontSize: child ? 19 : 16 }}>
            {child ? 'Your thinking super powers: ' : 'Strongest areas: '}
            {p.strengths.map((k) => (child ? `${name(k)?.icon} ${name(k)?.child}` : name(k)?.name)).join(child ? '  ' : ' and ')}
          </Typography>
          {p.growing.length > 0 && (
            <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: child ? 16 : 14 }}>
              {child
                ? `Next to grow: ${p.growing.map((k) => `${name(k)?.icon} ${name(k)?.child}`).join(', ')} — practise and it gets stronger!`
                : `Area to grow next: ${p.growing.map((k) => name(k)?.name).join(', ')}. Compared with the child’s own other areas, not with classmates.`}
            </Typography>
          )}
        </Box>
      )}
      <Box sx={{ display: 'grid', gap: 2, pt: 0.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' } }}>
        {p.areas.map((a) => (
          <AreaTile key={a._id} a={a} child={child} strong={p.strengths.includes(a.key)} grow={p.growing.includes(a.key)} />
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary">
        {child
          ? 'Brains grow with practice! This shows how you did today — it will change as you learn and grow.'
          : `A screening profile of thinking strengths to guide teaching — not an IQ test, a diagnosis or a mark, and never used for admissions, streaming or ranking. There is deliberately no overall score. ${p.normed ? 'Bands compare with children of the same grade (percentiles).' : 'Bands are provisional until enough children in this grade have taken it.'}${p.assessedAt ? ` Puzzles taken ${fmtDate(p.assessedAt)}.` : ''}`}
      </Typography>
    </Stack>
  );
}

/** Staff: the cognitive profile of one student. */
export function CognitiveSection({ studentId }: { studentId: string }) {
  const q = useGet<CogProfile>(`/students/${studentId}/cognitive`);
  return <QueryState q={q}>{(p) => <CogProfileView p={p} />}</QueryState>;
}

/** Parent: permission, the profile and the right to erase. */
export function ParentThinking({ studentId, childName }: { studentId: string; childName?: string }) {
  const q = useGet<CogProfile>(`/students/${studentId}/cognitive`);
  const consent = useSend<{ cognitive: boolean }>('patch', `/students/${studentId}/consent`, { success: 'Saved', invalidate: [`/students/${studentId}`] });
  const erase = useSend<void>('delete', `/students/${studentId}/cognitive`, { success: 'All Thinking Puzzles results were deleted', invalidate: [`/students/${studentId}`], onSuccess: () => setConfirm(false) });
  const [confirm, setConfirm] = useState(false);
  const first = childName?.split(' ')[0] ?? 'your child';
  return (
    <QueryState q={q}>
      {(p) => (
        <Stack spacing={2.5}>
          <Card>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Thinking Puzzles — how {first} thinks</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Once a term your child solves short, playful puzzles about noticing details, patterns, clues, words, numbers and memory. The result shows their thinking strengths across six areas — there is no overall score or IQ, and it is never
                used for admissions, streaming or ranking. Your child is asked if they agree before starting. You can delete the results at any time.
              </Typography>
              <FormControlLabel control={<Switch checked={p.consent} onChange={(e) => consent.mutate({ cognitive: e.target.checked })} />} label="I allow Thinking Puzzles for my child" />
            </CardContent>
          </Card>
          <Typography sx={{ fontWeight: 700, fontSize: 17 }}>Thinking strengths</Typography>
          <CogProfileView p={{ ...p, withheld: false }} />
          {p.times > 0 && (
            <Box>
              <Button color="error" size="small" onClick={() => setConfirm(true)}>
                Delete all Thinking Puzzles results
              </Button>
            </Box>
          )}
          <ConfirmDialog
            open={confirm}
            danger
            title="Delete all Thinking Puzzles results?"
            message="This permanently removes your child’s puzzle answers and the cognitive profile, and turns the permission off. Genius Habits, Know Yourself and schoolwork are not affected."
            confirmLabel="Delete permanently"
            loading={erase.isPending}
            onClose={() => setConfirm(false)}
            onConfirm={() => erase.mutate()}
          />
        </Stack>
      )}
    </QueryState>
  );
}
