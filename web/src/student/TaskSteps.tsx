/**
 * "Break it into small steps": a big assignment becomes a short checklist the student ticks off.
 * Steps come from AI (or a ready-made plan without AI); the student can change, add or remove them.
 */
import { Box, Button, ButtonBase, Checkbox, CircularProgress, IconButton, LinearProgress, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AutoAwesome from '@mui/icons-material/AutoAwesomeRounded';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import AddRounded from '@mui/icons-material/AddRounded';
import Refresh from '@mui/icons-material/RefreshRounded';
import { useState } from 'react';
import { RouterLinkish } from './taskLink';
import { api, errorMessage } from '@/api/client';
import type { Assignment, TaskStep } from '@/api/types';
import { useToast } from '@/components/Toast';
import { useQueryClient } from '@tanstack/react-query';
import { tint, type Look } from './looks';

export function TaskSteps({ a, look }: { a: Assignment; look: Look }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [steps, setSteps] = useState<TaskStep[] | null>(a.steps ?? null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const little = look.band === 'little';

  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['/assignments'] }), qc.invalidateQueries({ queryKey: [`/assignments/${a._id}`] })]);
  const make = async () => {
    if (steps?.length && !window.confirm('Make new steps? Your ticks will be cleared.')) return;
    setBusy(true);
    try {
      const r = await api.post<{ steps: TaskStep[] }>(`/assignments/${a._id}/steps/generate`);
      setSteps(r.data.steps);
      void refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const save = async (next: TaskStep[]) => {
    setSteps(next);
    try {
      await api.put(`/assignments/${a._id}/steps`, { steps: next.filter((s) => s.text.trim()).map(({ text, minutes, done }) => ({ text: text.trim(), minutes, done })) });
      void refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  if (!steps?.length)
    return (
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, alignItems: { sm: 'center' }, p: 2, borderRadius: `${look.radius}px`, bgcolor: tint(look.primary, 0.06), border: `2px dashed ${tint(look.primary, 0.3)}` }}>
        <Box sx={{ fontSize: 34 }}>🪜</Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 900 }}>{little ? 'Too big? Let’s make it small!' : 'Not sure where to start?'}</Typography>
          <Typography variant="body2" color="text.secondary">
            Break this into small steps you can do one at a time.
          </Typography>
        </Box>
        <Button variant="contained" onClick={make} disabled={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <AutoAwesome />}>
          Break it into steps
        </Button>
      </Stack>
    );

  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  const left = steps.filter((s) => !s.done).reduce((n, s) => n + (s.minutes || 0), 0);
  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Typography sx={{ fontWeight: 800, flex: 1 }}>
          {done === steps.length ? (little ? '🎉 All steps done! Now hand it in.' : '✓ All steps done — hand it in below') : `${done} of ${steps.length} steps done · about ${left} min left`}
        </Typography>
        <Tooltip title={editing ? 'Done editing' : 'Change the steps'}>
          <Button size="small" onClick={() => setEditing((x) => !x)}>
            {editing ? 'Done' : 'Edit'}
          </Button>
        </Tooltip>
        <Tooltip title="Make new steps">
          <IconButton size="small" onClick={make} disabled={busy} aria-label="Make new steps">
            {busy ? <CircularProgress size={16} /> : <Refresh fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Stack>
      <LinearProgress variant="determinate" value={(done / steps.length) * 100} sx={{ height: 8, borderRadius: 999, mb: 1.5, bgcolor: look.line, '& .MuiLinearProgress-bar': { bgcolor: '#2F9E44' } }} />
      <Stack spacing={0.75}>
        {steps.map((s, i) => {
          const isNext = s === next;
          return (
            <Stack key={s._id ?? i} direction="row" sx={{ alignItems: 'center', gap: 1, p: 1, pr: 1.5, borderRadius: 2.5, border: `2px solid ${isNext ? look.primary : s.done ? '#B2F2BB' : look.line}`, bgcolor: s.done ? '#F4FCF5' : isNext ? tint(look.primary, 0.05) : '#fff' }}>
              <Checkbox checked={s.done} onChange={(e) => void save(steps.map((x, k) => (k === i ? { ...x, done: e.target.checked } : x)))} slotProps={{ input: { 'aria-label': `Step ${i + 1} done` } }} color="success" />
              {editing ? (
                <TextField size="small" fullWidth value={s.text} onChange={(e) => setSteps(steps.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)))} onBlur={() => void save(steps)} slotProps={{ htmlInput: { maxLength: 160 } }} />
              ) : (
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {isNext && <Typography sx={{ fontSize: 12, fontWeight: 900, color: look.primary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Next step</Typography>}
                  <Typography sx={{ fontWeight: isNext ? 800 : 600, textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'text.secondary' : 'text.primary' }}>{s.text}</Typography>
                </Box>
              )}
              <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {s.minutes} min
              </Typography>
              {editing && (
                <IconButton size="small" aria-label={`Remove step ${i + 1}`} onClick={() => void save(steps.filter((_, k) => k !== i))}>
                  <DeleteOutlined fontSize="small" />
                </IconButton>
              )}
            </Stack>
          );
        })}
      </Stack>
      {editing && steps.length < 12 && (
        <Button size="small" startIcon={<AddRounded />} onClick={() => setSteps([...steps, { text: '', minutes: 5, done: false }])} sx={{ mt: 1 }}>
          Add a step
        </Button>
      )}
    </Box>
  );
}

/** Today's next small step for each open assignment that has steps. */
export function NextSteps({ items, look }: { items: Assignment[]; look: Look }) {
  const rows = items
    .filter((a) => a.steps?.some((s) => !s.done) && (!a.submission || a.submission.status === 'returned'))
    .sort((x, y) => (x.dueDate ? Date.parse(x.dueDate) : 9e15) - (y.dueDate ? Date.parse(y.dueDate) : 9e15))
    .slice(0, 3);
  if (!rows.length) return null;
  return (
    <Box sx={{ mb: 3, p: 2, borderRadius: `${look.radius}px`, bgcolor: '#fff', border: `2px solid ${tint(look.primary, 0.25)}`, boxShadow: `0 5px 0 ${tint(look.primary, 0.15)}` }}>
      <Typography sx={{ fontWeight: 900, mb: 1.25 }}>🪜 My next small steps</Typography>
      <Stack spacing={1}>
        {rows.map((a) => {
          const s = a.steps!.find((x) => !x.done)!;
          const d = a.steps!.filter((x) => x.done).length;
          return (
            <ButtonBase key={a._id} component={RouterLinkish} to={a._id} sx={{ justifyContent: 'flex-start', textAlign: 'left', gap: 1.5, p: 1.25, borderRadius: 2.5, bgcolor: tint(look.primary, 0.05) }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800 }}>{s.text}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {a.title} · step {d + 1} of {a.steps!.length} · {s.minutes} min
                </Typography>
              </Box>
              <Typography sx={{ fontWeight: 900, color: look.primary }}>Go →</Typography>
            </ButtonBase>
          );
        })}
      </Stack>
    </Box>
  );
}
