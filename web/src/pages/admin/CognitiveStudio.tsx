/** Assessment studio · Part 3 · Cognitive profile ("Thinking Puzzles"): the six thinking areas and their norms. */
import { Alert, Box, Button, Paper, Stack, Switch, FormControlLabel, TextField, Typography } from '@mui/material';
import EditOutlined from '@mui/icons-material/EditOutlined';
import { useState } from 'react';
import type { AssessmentItem } from '@/api/journey';
import { useGet, useSend } from '@/lib/hooks';
import { FormDialog, QueryState } from '@/components/ui';

interface Area {
  _id: string;
  key: string;
  name: string;
  child?: string;
  icon: string;
  color?: string;
  description?: string;
  active?: boolean;
  puzzles: { little: number; junior: number; senior: number };
  kinds: { timed: number; memory: number };
  normedGrades: number[];
}
interface Overview {
  attempts: number;
  grades: number[];
  areas: Area[];
}

const STAGES = [
  ['little', 'Grades 1–3'],
  ['junior', 'Grades 4–7'],
  ['senior', 'Grades 8–10'],
] as const;

export function ThinkingAreasTab() {
  const q = useGet<Overview>('/cognitive/overview');
  const [edit, setEdit] = useState<Area | null>(null);
  return (
    <QueryState q={q}>
      {(o) => (
        <Stack spacing={2.5}>
          <Typography color="text.secondary">
            How each child thinks, measured with short puzzles that have one right answer — never with self-ratings. Results are a strengths shape across six areas, compared with the child’s own other areas. There is no overall score, IQ, rank or
            label.
          </Typography>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' } }}>
            {[
              ['🧩', `${o.areas.reduce((n, a) => n + a.puzzles.little + a.puzzles.junior + a.puzzles.senior, 0)} puzzles`, 'Across the six areas and three age groups'],
              ['🎒', `${o.grades.length} grades`, o.grades.length ? `A puzzle set is live for Grade ${o.grades[0]}–${o.grades.at(-1)}` : 'No puzzle set is live yet'],
              ['📊', `${o.attempts} children`, 'Have finished Thinking Puzzles so far'],
            ].map(([icon, big, small]) => (
              <Paper key={big} variant="outlined" sx={{ p: 2, borderRadius: 3, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Box sx={{ fontSize: 26 }}>{icon}</Box>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{big}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {small}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Box>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' } }}>
            {o.areas.map((a) => (
              <AreaCard key={a._id} a={a} onEdit={() => setEdit(a)} />
            ))}
          </Box>
          <Alert severity="info">
            Starter puzzles are original and not yet validated. Pilot them with your own students, check which puzzles almost everyone gets right or wrong, and rebuild norms (Norms tab) once 30 or more children in a grade have taken them.
          </Alert>
          {edit && <AreaDialog a={edit} onClose={() => setEdit(null)} />}
        </Stack>
      )}
    </QueryState>
  );
}

function AreaCard({ a, onEdit }: { a: Area; onEdit: () => void }) {
  const ex = useGet<AssessmentItem[]>('/assessment-items', { framework: 'cognitive', skillId: a._id, status: 'published' });
  const sample = ex.data?.find((i) => !i.stimulus) ?? ex.data?.[0];
  const c = a.color ?? '#6C4CF1';
  return (
    <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 3, borderTop: `4px solid ${c}`, opacity: a.active === false ? 0.55 : 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ width: 44, height: 44, borderRadius: '13px', bgcolor: `${c}1A`, display: 'grid', placeItems: 'center', fontSize: 24, flexShrink: 0 }}>{a.icon}</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800 }}>{a.name}</Typography>
          <Typography variant="caption" sx={{ color: c, fontWeight: 700 }}>
            Children see: {a.child}
          </Typography>
        </Box>
        <Button size="small" startIcon={<EditOutlined />} onClick={onEdit}>
          Edit
        </Button>
      </Stack>
      <Typography variant="body2">{a.description}</Typography>
      <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
        {STAGES.map(([k, label]) => (
          <Box key={k} sx={{ px: 1, py: 0.25, borderRadius: '8px', bgcolor: '#F3F3F7', fontSize: 12.5, fontWeight: 650 }}>
            {label}: {a.puzzles[k]}
          </Box>
        ))}
        {a.kinds.memory > 0 && <Box sx={{ px: 1, py: 0.25, borderRadius: '8px', bgcolor: '#FCE7F3', color: '#9D174D', fontSize: 12.5, fontWeight: 650 }}>Show-then-hide</Box>}
        {a.kinds.timed > 0 && <Box sx={{ px: 1, py: 0.25, borderRadius: '8px', bgcolor: '#FFF4E5', color: '#B45309', fontSize: 12.5, fontWeight: 650 }}>Timed</Box>}
      </Stack>
      {sample && (
        <Box sx={{ mt: 'auto', p: 1.5, borderRadius: 2, bgcolor: '#FBFAF7', border: '1px dashed #E2E0D8' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            Example puzzle
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {sample.prompt}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {(sample.options ?? []).map((o) => (o.score === 1 ? `✓ ${o.text}` : o.text)).join(' · ')}
          </Typography>
        </Box>
      )}
      <Typography variant="caption" color="text.secondary">
        {a.normedGrades.length ? `Percentile norms for Grade ${a.normedGrades.sort((x, y) => x - y).join(', ')}` : 'Bands are provisional (no norms yet)'}
      </Typography>
    </Paper>
  );
}

function AreaDialog({ a, onClose }: { a: Area; onClose: () => void }) {
  const [d, setD] = useState({ name: a.name, habit: a.child ?? '', description: a.description ?? '', active: a.active !== false });
  const save = useSend<typeof d>('patch', `/skills/${a._id}`, { success: 'Thinking area saved', invalidate: ['/cognitive/overview', '/skills'], onSuccess: onClose });
  return (
    <FormDialog open title={`Edit ${a.name}`} onClose={onClose} onSubmit={() => save.mutate(d)} loading={save.isPending}>
      <TextField label="Name for teachers and reports" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} required />
      <TextField label="Name children see" value={d.habit} onChange={(e) => setD({ ...d, habit: e.target.value })} helperText="Short and playful, e.g. “Memory Magic”" />
      <TextField label="What it means" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} multiline minRows={2} />
      <FormControlLabel control={<Switch checked={d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} />} label="Show this area in profiles" />
    </FormDialog>
  );
}

export function CognitiveNormsTab() {
  const q = useGet<Overview>('/cognitive/overview');
  const [msg, setMsg] = useState('');
  const rebuild = useSend<void, { tables: number; children: number }>('post', '/cognitive/norms/rebuild', { invalidate: ['/cognitive/overview'], onSuccess: (r) => setMsg(`Norms rebuilt: ${r.tables} tables from ${r.children} children.`) });
  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">
        Until 30 or more children of the same grade have taken Thinking Puzzles, each area shows a provisional band from the share of puzzles solved. After that, bands compare the child with children of the same grade (percentiles). Rebuild norms
        after each term.
      </Typography>
      <Box>
        <Button variant="contained" onClick={() => rebuild.mutate()} disabled={rebuild.isPending}>
          Rebuild norms
        </Button>
      </Box>
      {msg && <Alert severity="success">{msg}</Alert>}
      <QueryState q={q}>
        {(o) => (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Stack spacing={1.25}>
              {o.areas.map((a) => (
                <Stack key={a._id} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Box sx={{ fontSize: 20 }}>{a.icon}</Box>
                  <Typography sx={{ fontWeight: 650, flex: 1 }}>{a.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {a.normedGrades.length ? `Normed for Grade ${a.normedGrades.sort((x, y) => x - y).join(', ')}` : 'Provisional'}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        )}
      </QueryState>
    </Stack>
  );
}
