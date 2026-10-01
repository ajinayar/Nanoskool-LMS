/** Journey panels for adults looking at one student: guidance in their own voice, consent, skills and the portfolio. */
import { Alert, Box, Card, CardContent, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import type { Advice, Portfolio } from '@/api/journey';
import { useGet, useSend } from '@/lib/hooks';
import { QueryState } from '@/components/ui';
import { GuidanceList, PortfolioView } from '@/components/JourneyViews';

interface Consent {
  assessment?: boolean;
  psychometric?: boolean;
  cognitive?: boolean;
  media?: boolean;
  at?: string;
}

/** Parent consent for the termly checks (Genius Quest, Know Yourself and Thinking Puzzles) and for photo/video evidence. */
export function ConsentCard({ studentId }: { studentId: string }) {
  const q = useGet<{ consent: Consent }>(`/students/${studentId}/skills`);
  const save = useSend<Consent>('patch', `/students/${studentId}/consent`, { success: 'Saved', invalidate: [`/students/${studentId}`] });
  return (
    <Card>
      <CardContent>
        <Typography sx={{ fontWeight: 650, mb: 0.5 }}>Permissions</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Photos and videos stay inside the school’s Nanoskool account and are only seen by the child, their teachers and you.
        </Typography>
        <QueryState q={q}>
          {(d) => (
            <Stack>
              <FormControlLabel control={<Switch checked={!!d.consent.assessment} onChange={(e) => save.mutate({ assessment: e.target.checked })} />} label="Allow the Genius Quest (a termly check of the 8 Genius Habits)" />
              <FormControlLabel control={<Switch checked={!!d.consent.psychometric} onChange={(e) => save.mutate({ psychometric: e.target.checked })} />} label="Allow Know Yourself (a personal profile — see the Know Yourself tab)" />
              <FormControlLabel control={<Switch checked={!!d.consent.cognitive} onChange={(e) => save.mutate({ cognitive: e.target.checked })} />} label="Allow Thinking Puzzles (a cognitive profile — see the Thinking Puzzles tab)" />
              <FormControlLabel control={<Switch checked={!!d.consent.media} onChange={(e) => save.mutate({ media: e.target.checked })} />} label="Allow photos and videos of projects as evidence" />
            </Stack>
          )}
        </QueryState>
      </CardContent>
    </Card>
  );
}

/** Guidance for one student, in the viewer's voice (teacher or parent). */
export function GuidanceCard({ studentId, audience, base, title }: { studentId: string; audience: 'teacher' | 'parent'; base?: string; title?: string }) {
  const q = useGet<Advice[]>(`/students/${studentId}/guidance`, { audience });
  return (
    <Card>
      <CardContent>
        <Typography sx={{ fontWeight: 650, mb: 0.25 }}>{title ?? (audience === 'parent' ? 'How you can help this week' : 'Suggested next steps')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Like directions on a map: where they are, the next turn, and when to reroute.
        </Typography>
        <QueryState q={q}>{(a) => <GuidanceList advice={audience === 'parent' ? a.filter((x) => x.key !== 'consent') : a} base={base} />}</QueryState>
      </CardContent>
    </Card>
  );
}

export function PortfolioSection({ studentId }: { studentId: string }) {
  const q = useGet<Portfolio>(`/students/${studentId}/portfolio`);
  return <QueryState q={q}>{(p) => <PortfolioView p={p} />}</QueryState>;
}

/** Parent tab: guidance and permissions side by side. */
export function ParentJourneyTab({ studentId }: { studentId: string }) {
  const g = useGet<Advice[]>(`/students/${studentId}/guidance`, { audience: 'parent' });
  const needsConsent = (g.data ?? []).some((a) => a.key === 'consent');
  return (
    <Stack spacing={2.5}>
      {needsConsent && <Alert severity="info">Please turn on the permissions below so your child can take the Genius Quest and Know Yourself, and share project photos and videos.</Alert>}
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1.6fr 1fr' }, alignItems: 'start' }}>
        <GuidanceCard studentId={studentId} audience="parent" />
        <ConsentCard studentId={studentId} />
      </Box>
    </Stack>
  );
}
