/** Editors for a learning unit's objectives and outcome activities (course studio). */
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, IconButton, MenuItem, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Check from '@mui/icons-material/Check';
import { useState } from 'react';
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

const VERBS = ['Explain', 'Identify', 'Describe', 'Build', 'Compare', 'Measure', 'Predict', 'Test', 'Design', 'Sort', 'Use', 'Create'];
const IMPORTANCE: { w: number; label: string }[] = [
  { w: 1, label: 'Normal' },
  { w: 2, label: 'Important' },
  { w: 3, label: 'Key' },
];
const SHARE_COLORS = ['#7C5CFA', '#2F9E44', '#E8590C', '#1C7ED6', '#C2255C', '#0C8599', '#B7791F', '#5F3DC4'];

/**
 * Objectives: "Students will be able to…" cards. Each one is collapsed to a readable summary
 * and opens for editing. Verb starters, "I can…" success criteria, skills as tap-to-select chips,
 * and importance (normal / important / key) instead of a raw weight number.
 */
export function ObjectivesEditor({ value, onChange, skills, suggestions = [] }: { value: Objective[]; onChange: (v: Objective[]) => void; skills: Skill[]; suggestions?: string[] }) {
  const [open, setOpen] = useState<string | null>(() => value.find((o) => !o.title.trim())?._id ?? (value.length === 1 ? value[0]._id : null));
  const set = (i: number, p: Partial<Objective>) => onChange(value.map((o, j) => (j === i ? { ...o, ...p } : o)));
  const total = value.reduce((n, o) => n + (o.weight ?? 1), 0) || 1;
  const add = (title = '') => {
    const o: Objective = { _id: newId(), title, weight: 1, skillIds: [], criteria: '' };
    onChange([...value, o]);
    setOpen(o._id);
  };
  const unused = suggestions.filter((t) => !value.some((o) => o.title.trim().toLowerCase() === t.toLowerCase())).slice(0, 6);

  return (
    <Stack spacing={1.5}>
      {/* How the outcome is shared between objectives */}
      {value.length > 1 && (
        <Box>
          <Box sx={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', bgcolor: '#EEEEF2' }}>
            {value.map((o, i) => (
              <Tooltip key={o._id} title={`${i + 1}. ${o.title || 'Untitled'} · ${Math.round(((o.weight ?? 1) / total) * 100)}%`}>
                <Box sx={{ width: `${((o.weight ?? 1) / total) * 100}%`, bgcolor: SHARE_COLORS[i % SHARE_COLORS.length], borderRight: i < value.length - 1 ? '2px solid #fff' : 'none' }} />
              </Tooltip>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary">
            How much each objective counts in this unit’s learning outcome
          </Typography>
        </Box>
      )}

      {value.length === 0 && (
        <Box sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 3, p: 3, textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 600, mb: 0.5 }}>No objectives yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add 1–4 things students should be able to do by the end. Activities and outcomes are measured against them.
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => add()}>
            Add the first objective
          </Button>
        </Box>
      )}

      {value.map((o, i) => {
        const color = SHARE_COLORS[i % SHARE_COLORS.length];
        const isOpen = open === o._id;
        const pct = Math.round(((o.weight ?? 1) / total) * 100);
        const skillNames = (o.skillIds ?? []).map((id) => skills.find((s) => s._id === id)).filter(Boolean) as Skill[];
        return (
          <Box key={o._id} sx={{ borderRadius: 3, border: '1.5px solid', borderColor: isOpen ? color : '#E8E4DA', bgcolor: '#fff', overflow: 'hidden', transition: 'border-color .15s' }}>
            {/* Summary row */}
            <Stack direction="row" onClick={() => setOpen(isOpen ? null : o._id)} sx={{ alignItems: 'center', gap: 1.5, p: 1.75, cursor: 'pointer', '&:hover': { bgcolor: isOpen ? 'transparent' : '#FBFAF7' } }}>
              <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: color, color: '#fff', fontWeight: 800, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{i + 1}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 650, fontSize: 15.5, color: o.title ? 'text.primary' : 'text.disabled' }} noWrap={!isOpen}>
                  {o.title || 'New objective, click to write it'}
                </Typography>
                {!isOpen && (o.criteria || skillNames.length > 0) && (
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, mt: 0.25, flexWrap: 'wrap' }}>
                    {o.criteria && (
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 420 }}>
                        ✓ {o.criteria}
                      </Typography>
                    )}
                    {skillNames.map((s) => (
                      <Box key={s._id} component="span" sx={{ fontSize: 11.5, fontWeight: 600, px: 0.9, py: 0.1, borderRadius: 99, bgcolor: `${s.color ?? '#7C5CFA'}26`, color: '#2B2B35' }}>
                        {s.habit || s.name}
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
              <Chip size="small" label={`${pct}%`} sx={{ bgcolor: `${color}14`, color, fontWeight: 700 }} />
              <Stack direction="row" onClick={(e) => e.stopPropagation()}>
                <Reorder i={i} n={value.length} label={`objective ${i + 1}`} onMove={(d) => onChange(moveItem(value, i, d))} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
              </Stack>
              <ExpandMore sx={{ color: 'text.secondary', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
            </Stack>

            {/* Editor */}
            {isOpen && (
              <Stack spacing={2} sx={{ px: 2.25, pb: 2.25, pt: 0.5, borderTop: '1px solid #F0EDE6' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75, mt: 1 }}>
                    Students will be able to…
                  </Typography>
                  <TextField fullWidth autoFocus={!o.title} value={o.title} onChange={(e) => set(i, { title: e.target.value })} placeholder="Explain why a circuit must be closed" required slotProps={{ htmlInput: { maxLength: 200, 'aria-label': `Objective ${i + 1}` } }} />
                  {!o.title.trim() && (
                    <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', mr: 0.5 }}>
                        Start with:
                      </Typography>
                      {VERBS.map((v) => (
                        <Chip key={v} size="small" label={v} variant="outlined" onClick={() => set(i, { title: `${v} ` })} />
                      ))}
                    </Stack>
                  )}
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
                    How will you know? <Typography component="span" variant="body2" color="text.secondary">(success criteria the student reads)</Typography>
                  </Typography>
                  <TextField
                    fullWidth
                    value={(o.criteria ?? '').replace(/^I can\s*/i, '')}
                    onChange={(e) => set(i, { criteria: e.target.value ? `I can ${e.target.value.replace(/^I can\s*/i, '')}` : '' })}
                    placeholder="show that a bulb lights only when the loop is complete"
                    slotProps={{ input: { startAdornment: <Typography sx={{ fontWeight: 700, color, mr: 1, whiteSpace: 'nowrap' }}>I can</Typography> }, htmlInput: { maxLength: 490 } }}
                  />
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
                    Genius Habits it builds
                  </Typography>
                  {skills.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      Add Genius Habits in Assessment studio › Genius Habits first.
                    </Typography>
                  ) : (
                    <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
                      {skills.map((s) => {
                        const on = (o.skillIds ?? []).includes(s._id);
                        const c = s.color ?? '#7C5CFA';
                        return (
                          <Chip
                            key={s._id}
                            label={s.habit || s.name}
                            icon={on ? <Check sx={{ fontSize: '16px !important' }} /> : undefined}
                            onClick={() => set(i, { skillIds: on ? (o.skillIds ?? []).filter((x) => x !== s._id) : [...(o.skillIds ?? []), s._id] })}
                            sx={{ fontWeight: 600, bgcolor: on ? `${c}33` : 'transparent', border: '1.5px solid', borderColor: on ? c : '#E0DCD2', color: '#2B2B35', '& .MuiChip-icon': { color: '#2B2B35' } }}
                          />
                        );
                      })}
                    </Stack>
                  )}
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-end' } }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
                      How much does it count?
                    </Typography>
                    <ToggleButtonGroup size="small" exclusive value={IMPORTANCE.some((x) => x.w === (o.weight ?? 1)) ? (o.weight ?? 1) : null} onChange={(_, w) => w != null && set(i, { weight: w })}>
                      {IMPORTANCE.map((x) => (
                        <ToggleButton key={x.w} value={x.w} sx={{ px: 1.75, textTransform: 'none' }}>
                          {x.label}
                          <Typography component="span" variant="caption" sx={{ ml: 0.75, opacity: 0.6 }}>
                            ×{x.w}
                          </Typography>
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ pb: 0.75 }}>
                    = {pct}% of this unit’s outcome
                  </Typography>
                </Stack>

                <TextField label="Notes for teachers (optional)" value={o.description ?? ''} onChange={(e) => set(i, { description: e.target.value })} multiline minRows={1} placeholder="Common mistakes, how to support, extension ideas" />

                <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                  <Button size="small" onClick={() => setOpen(null)}>
                    Done
                  </Button>
                </Stack>
              </Stack>
            )}
          </Box>
        );
      })}

      {value.length > 0 && (
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button startIcon={<Add />} variant="outlined" onClick={() => add()}>
            Add objective
          </Button>
          {value.length >= 5 && (
            <Typography variant="caption" color="warning.main">
              Tip: 2–4 objectives per unit are easier to teach and assess.
            </Typography>
          )}
        </Stack>
      )}

      {unused.length > 0 && (
        <Box sx={{ p: 1.75, borderRadius: 2.5, bgcolor: '#F7F4FF' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Ideas from your lesson headings
          </Typography>
          <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
            {unused.map((t) => (
              <Chip key={t} icon={<Add />} label={t} onClick={() => add(t)} sx={{ bgcolor: '#fff' }} />
            ))}
          </Stack>
        </Box>
      )}
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
