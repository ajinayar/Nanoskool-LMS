/** Editors for a learning unit's objectives and outcome activities (course studio). */
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import { ACTIVITY_LABEL, newId, type Activity, type ActivityKind, type MediaKind, type Objective, type Skill, type Tool } from '@/api/journey';
import type { QuizSummary } from '@/api/types';

function moveItem<T>(arr: T[], i: number, d: -1 | 1) {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function Reorder({ i, n, onMove, onRemove, label }: { i: number; n: number; onMove: (d: -1 | 1) => void; onRemove: () => void; label: string }) {
  return (
    <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
      <IconButton size="small" aria-label={`Move ${label} up`} disabled={i === 0} onClick={() => onMove(-1)}>
        <ArrowUpward fontSize="small" />
      </IconButton>
      <IconButton size="small" aria-label={`Move ${label} down`} disabled={i === n - 1} onClick={() => onMove(1)}>
        <ArrowDownward fontSize="small" />
      </IconButton>
      <Tooltip title="Remove">
        <IconButton size="small" aria-label={`Remove ${label}`} onClick={onRemove}>
          <DeleteOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

export function ObjectivesEditor({ value, onChange, skills }: { value: Objective[]; onChange: (v: Objective[]) => void; skills: Skill[] }) {
  const set = (i: number, p: Partial<Objective>) => onChange(value.map((o, j) => (j === i ? { ...o, ...p } : o)));
  const total = value.reduce((n, o) => n + (o.weight ?? 1), 0) || 1;
  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        What should a child be able to do after this learning unit? Add one or more objectives. Weights set how much each counts in the unit's learning outcome.
      </Typography>
      {value.length === 0 && <Alert severity="info">No objectives yet. Add at least one so outcomes can be measured.</Alert>}
      {value.map((o, i) => (
        <Paper key={o._id} variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
            <Chip size="small" label={`Objective ${i + 1}`} />
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
              counts {Math.round(((o.weight ?? 1) / total) * 100)}% of the unit
            </Typography>
            <Reorder i={i} n={value.length} label={`objective ${i + 1}`} onMove={(d) => onChange(moveItem(value, i, d))} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
          </Stack>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField label="Objective" value={o.title} onChange={(e) => set(i, { title: e.target.value })} required placeholder="Build a working closed circuit" />
              <TextField label="Weight" type="number" value={o.weight ?? 1} onChange={(e) => set(i, { weight: Math.max(0, Number(e.target.value) || 0) })} sx={{ width: { sm: 120 } }} slotProps={{ htmlInput: { min: 0, max: 100, step: 0.5 } }} />
            </Stack>
            <TextField label="Short description" value={o.description ?? ''} onChange={(e) => set(i, { description: e.target.value })} multiline minRows={2} />
            <TextField label="Success criteria (I can…)" value={o.criteria ?? ''} onChange={(e) => set(i, { criteria: e.target.value })} placeholder="I can connect a cell, wires and a bulb so it lights" />
            <TextField
              select
              label="Skills it builds"
              value={o.skillIds ?? []}
              onChange={(e) => set(i, { skillIds: typeof e.target.value === 'string' ? e.target.value.split(',') : (e.target.value as string[]) })}
              slotProps={{ select: { multiple: true, renderValue: (v) => (v as string[]).map((id) => skills.find((s) => s._id === id)?.name ?? '').join(', ') } }}
              helperText={skills.length ? undefined : 'Add skills in Assessment › Skills first'}
            >
              {skills.map((s) => (
                <MenuItem key={s._id} value={s._id}>
                  <Checkbox size="small" checked={(o.skillIds ?? []).includes(s._id)} />
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Paper>
      ))}
      <Box>
        <Button startIcon={<Add />} onClick={() => onChange([...value, { _id: newId(), title: '', weight: 1, skillIds: [] }])}>
          Add objective
        </Button>
      </Box>
    </Stack>
  );
}

const KINDS: { value: ActivityKind; label: string; hint: string }[] = [
  { value: 'quiz', label: 'Quiz', hint: 'One of this course’s quizzes, scored automatically' },
  { value: 'project', label: 'Project', hint: 'Photos or videos of work, scored by the teacher with a rubric' },
  { value: 'presentation', label: 'Presentation', hint: 'Slides or a recorded talk, scored by the teacher' },
  { value: 'reflection', label: 'Reflection', hint: 'A short "what I learned" note, rated by the teacher' },
  { value: 'tool', label: 'Tool (Super Tutor, Debating App…)', hint: 'The tool reports the score' },
];
const MEDIA: MediaKind[] = ['photo', 'video', 'file', 'link'];

export function ActivitiesEditor({ value, onChange, objectives, quizzes, tools }: { value: Activity[]; onChange: (v: Activity[]) => void; objectives: Objective[]; quizzes: QuizSummary[]; tools: Tool[] }) {
  const set = (i: number, p: Partial<Activity>) => onChange(value.map((a, j) => (j === i ? { ...a, ...p } : a)));
  const add = (kind: ActivityKind) =>
    onChange([
      ...value,
      {
        _id: newId(),
        kind,
        title: kind === 'quiz' ? 'Check quiz' : kind === 'project' ? 'Show what you made' : kind === 'reflection' ? 'What I learned' : kind === 'presentation' ? 'Present your work' : 'Practice',
        objectiveIds: objectives.map((o) => o._id),
        weight: 1,
        required: kind !== 'tool',
        mediaTypes: kind === 'project' || kind === 'presentation' ? ['photo', 'video', 'file'] : [],
        toolId: kind === 'tool' ? (tools[0]?._id ?? null) : null,
        quizId: kind === 'quiz' ? (quizzes[0]?._id ?? null) : null,
      },
    ]);
  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Activities at the end of the learning unit collect evidence for its objectives. Add as many as you need; each one says which objectives it checks.
      </Typography>
      {!objectives.length && <Alert severity="warning">Add objectives first, so each activity can say what it checks.</Alert>}
      {value.map((a, i) => (
        <Paper key={a._id} variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
            <Chip size="small" label={`${i + 1} · ${ACTIVITY_LABEL[a.kind]}`} />
            <Box sx={{ flex: 1 }} />
            <Reorder i={i} n={value.length} label={`activity ${i + 1}`} onMove={(d) => onChange(moveItem(value, i, d))} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
          </Stack>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField select label="Type" value={a.kind} onChange={(e) => set(i, { kind: e.target.value as ActivityKind })} sx={{ width: { sm: 240 } }}>
                {KINDS.map((k) => (
                  <MenuItem key={k.value} value={k.value}>
                    {k.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField label="Title" value={a.title} onChange={(e) => set(i, { title: e.target.value })} required />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: -0.5 }}>
              {KINDS.find((k) => k.value === a.kind)?.hint}
            </Typography>
            {a.kind === 'quiz' && (
              <TextField select label="Quiz" value={a.quizId ?? ''} onChange={(e) => set(i, { quizId: e.target.value })} required helperText={quizzes.length ? undefined : 'Create a quiz in the Quizzes tab first'}>
                {quizzes.map((q) => (
                  <MenuItem key={q._id} value={q._id}>
                    {q.title}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {a.kind === 'tool' && (
              <TextField select label="Tool" value={a.toolId ?? ''} onChange={(e) => set(i, { toolId: e.target.value })} required helperText={tools.length ? undefined : 'Register tools in Assessment › Tools first'}>
                {tools.map((t) => (
                  <MenuItem key={t._id} value={t._id}>
                    {t.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField label="Instructions for the student" value={a.instructions ?? ''} onChange={(e) => set(i, { instructions: e.target.value })} multiline minRows={2} />
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Checks these objectives
              </Typography>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                {objectives.map((o, oi) => {
                  const on = a.objectiveIds.includes(o._id);
                  return <Chip key={o._id} label={`${oi + 1}. ${o.title || 'Untitled'}`} color={on ? 'primary' : 'default'} variant={on ? 'filled' : 'outlined'} onClick={() => set(i, { objectiveIds: on ? a.objectiveIds.filter((x) => x !== o._id) : [...a.objectiveIds, o._id] })} />;
                })}
              </Stack>
            </Box>
            {(a.kind === 'project' || a.kind === 'presentation') && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Students can upload
                </Typography>
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {MEDIA.map((m) => {
                    const on = (a.mediaTypes ?? []).includes(m);
                    return <Chip key={m} label={m} sx={{ textTransform: 'capitalize' }} color={on ? 'primary' : 'default'} variant={on ? 'filled' : 'outlined'} onClick={() => set(i, { mediaTypes: on ? (a.mediaTypes ?? []).filter((x) => x !== m) : [...(a.mediaTypes ?? []), m] })} />;
                  })}
                </Stack>
              </Box>
            )}
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField label="Weight" type="number" value={a.weight ?? 1} onChange={(e) => set(i, { weight: Math.max(0, Number(e.target.value) || 0) })} sx={{ width: 120 }} slotProps={{ htmlInput: { min: 0, max: 100, step: 0.5 } }} />
              {(a.kind === 'project' || a.kind === 'presentation' || a.kind === 'reflection') && (
                <TextField select label="Scored by" value={a.scoring ?? 'rubric'} onChange={(e) => set(i, { scoring: e.target.value as Activity['scoring'] })} sx={{ width: 200 }}>
                  <MenuItem value="rubric">Teacher rubric (1–4)</MenuItem>
                  <MenuItem value="rating">Teacher rating (0–100)</MenuItem>
                </TextField>
              )}
              <FormControlLabel control={<Checkbox checked={a.required !== false} onChange={(e) => set(i, { required: e.target.checked })} />} label="Required" />
            </Stack>
          </Stack>
        </Paper>
      ))}
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        {KINDS.map((k) => (
          <Button key={k.value} size="small" variant="outlined" startIcon={<Add />} onClick={() => add(k.value)}>
            {k.value === 'tool' ? 'Tool' : k.label}
          </Button>
        ))}
      </Stack>
    </Stack>
  );
}

/** Problems that would make the server refuse the unit, in plain words. */
export function journeyProblems(objectives: Objective[], activities: Activity[]) {
  if (objectives.some((o) => !o.title.trim())) return 'Every objective needs a title';
  if (activities.some((a) => !a.title.trim())) return 'Every activity needs a title';
  if (activities.some((a) => a.kind === 'quiz' && !a.quizId)) return 'Choose a quiz for each quiz activity';
  if (activities.some((a) => a.kind === 'tool' && !a.toolId)) return 'Choose a tool for each tool activity';
  if (activities.some((a) => !a.objectiveIds.length) && objectives.length) return 'Each activity should check at least one objective';
  return null;
}
