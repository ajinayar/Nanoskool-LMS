import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Radio,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import Close from '@mui/icons-material/Close';
import dayjs from 'dayjs';
import type { Question } from '@/api/types';

export interface QuizDraft {
  title: string;
  description?: string;
  chapterId?: string;
  timeLimitMin?: number | null;
  maxAttempts?: number;
  dueDate?: string | null;
  status: 'draft' | 'published';
  questions: Question[];
}

export const emptyQuestion = (): Question => ({ text: '', type: 'single', options: ['', ''], correct: [0], points: 1, explanation: '' });

export const emptyQuiz = (): QuizDraft => ({ title: '', description: '', timeLimitMin: null, maxAttempts: 1, dueDate: null, status: 'draft', questions: [emptyQuestion()] });

/** Returns a message if the quiz cannot be saved, else null. */
export function validateQuiz(q: QuizDraft): string | null {
  if (!q.title.trim()) return 'Give the quiz a title';
  if (q.status === 'published' && !q.questions.length) return 'Add at least one question before publishing';
  for (const [i, x] of q.questions.entries()) {
    if (!x.text.trim()) return `Question ${i + 1} needs text`;
    if (x.options.length < 2 || x.options.some((o) => !o.trim())) return `Question ${i + 1}: fill in every option (at least two)`;
    if (!x.correct?.length) return `Question ${i + 1}: mark the correct answer`;
  }
  return null;
}

/** Strip client-only fields before sending to the API. */
export function quizPayload(q: QuizDraft) {
  return {
    ...q,
    timeLimitMin: q.timeLimitMin || null,
    dueDate: q.dueDate ? new Date(q.dueDate).toISOString() : null,
    chapterId: q.chapterId || undefined,
    questions: q.questions.map(({ _id, ...rest }) => ({ ...(_id ? { _id } : {}), ...rest, points: Number(rest.points) || 1 })),
  };
}

/**
 * Controlled quiz builder: settings + questions with single, multiple or true/false answers.
 * `chapters` shows a chapter picker (content quizzes).
 */
export function QuizEditor({ value, onChange, chapters, showDueDate }: { value: QuizDraft; onChange: (q: QuizDraft) => void; chapters?: { _id: string; title: string }[]; showDueDate?: boolean }) {
  const set = (patch: Partial<QuizDraft>) => onChange({ ...value, ...patch });
  const setQ = (i: number, patch: Partial<Question>) => set({ questions: value.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) });
  const move = (i: number, d: -1 | 1) => {
    const qs = [...value.questions];
    const j = i + d;
    if (j < 0 || j >= qs.length) return;
    [qs[i], qs[j]] = [qs[j], qs[i]];
    set({ questions: qs });
  };
  const total = value.questions.reduce((s, q) => s + (Number(q.points) || 0), 0);

  return (
    <Stack spacing={2}>
      <TextField label="Quiz title" value={value.title} onChange={(e) => set({ title: e.target.value })} required />
      <TextField label="Instructions (optional)" value={value.description ?? ''} onChange={(e) => set({ description: e.target.value })} multiline minRows={2} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {chapters && (
          <TextField select label="Chapter" value={value.chapterId ?? ''} onChange={(e) => set({ chapterId: e.target.value || undefined })}>
            <MenuItem value="">Whole course</MenuItem>
            {chapters.map((c) => (
              <MenuItem key={c._id} value={c._id}>
                {c.title}
              </MenuItem>
            ))}
          </TextField>
        )}
        <TextField label="Time limit (minutes)" type="number" value={value.timeLimitMin ?? ''} onChange={(e) => set({ timeLimitMin: e.target.value ? Number(e.target.value) : null })} helperText="Empty = no limit" />
        <TextField label="Attempts allowed" type="number" value={value.maxAttempts ?? 1} onChange={(e) => set({ maxAttempts: Math.max(1, Number(e.target.value) || 1) })} />
        {showDueDate && (
          <TextField label="Closes on" type="datetime-local" value={value.dueDate ? dayjs(value.dueDate).format('YYYY-MM-DDTHH:mm') : ''} onChange={(e) => set({ dueDate: e.target.value || null })} slotProps={{ inputLabel: { shrink: true } }} />
        )}
      </Stack>
      <FormControlLabel control={<Switch checked={value.status === 'published'} onChange={(e) => set({ status: e.target.checked ? 'published' : 'draft' })} />} label={value.status === 'published' ? 'Published: students can take it' : 'Draft: hidden from students'} />
      <Divider />
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Questions ({value.questions.length}) · {total} points
        </Typography>
        <Button startIcon={<Add />} onClick={() => set({ questions: [...value.questions, emptyQuestion()] })}>
          Add question
        </Button>
      </Stack>
      {value.questions.map((q, i) => (
        <Paper key={i} variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
            <Typography sx={{ fontWeight: 700, minWidth: 28 }}>Q{i + 1}</Typography>
            <TextField
              select
              label="Type"
              value={q.type}
              sx={{ width: 240, flexShrink: 0 }}
              onChange={(e) => {
                const type = e.target.value as Question['type'];
                if (type === 'true_false') setQ(i, { type, options: ['True', 'False'], correct: [0] });
                else setQ(i, { type, correct: type === 'single' ? [q.correct?.[0] ?? 0] : q.correct });
              }}
            >
              <MenuItem value="single">One correct answer</MenuItem>
              <MenuItem value="multiple">Several correct answers</MenuItem>
              <MenuItem value="true_false">True / false</MenuItem>
            </TextField>
            <TextField label="Points" type="number" value={q.points} onChange={(e) => setQ(i, { points: Number(e.target.value) })} sx={{ width: 90 }} />
            <Box sx={{ flex: 1 }} />
            <Tooltip title="Move up">
              <span>
                <IconButton size="small" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUpward fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Move down">
              <span>
                <IconButton size="small" disabled={i === value.questions.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDownward fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Delete question">
              <IconButton size="small" color="error" onClick={() => set({ questions: value.questions.filter((_, j) => j !== i) })}>
                <DeleteOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
          <TextField label="Question" value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} multiline required sx={{ mb: 1.5 }} />
          <Typography variant="caption" color="text.secondary">
            Tick the correct answer{q.type === 'multiple' ? 's' : ''}
          </Typography>
          <Stack spacing={1} sx={{ mt: 0.5 }}>
            {q.options.map((opt, oi) => {
              const checked = q.correct?.includes(oi) ?? false;
              const toggle = () =>
                setQ(i, { correct: q.type === 'multiple' ? (checked ? q.correct!.filter((c) => c !== oi) : [...(q.correct ?? []), oi].sort()) : [oi] });
              return (
                <Stack key={oi} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  {q.type === 'multiple' ? <Checkbox checked={checked} onChange={toggle} /> : <Radio checked={checked} onChange={toggle} />}
                  <TextField
                    placeholder={`Option ${oi + 1}`}
                    value={opt}
                    disabled={q.type === 'true_false'}
                    onChange={(e) => setQ(i, { options: q.options.map((o, k) => (k === oi ? e.target.value : o)) })}
                  />
                  {q.type !== 'true_false' && q.options.length > 2 && (
                    <IconButton
                      size="small"
                      aria-label="Remove option"
                      onClick={() =>
                        setQ(i, {
                          options: q.options.filter((_, k) => k !== oi),
                          correct: (q.correct ?? []).filter((c) => c !== oi).map((c) => (c > oi ? c - 1 : c)),
                        })
                      }
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
              );
            })}
            {q.type !== 'true_false' && q.options.length < 8 && (
              <Box>
                <Button size="small" startIcon={<Add />} onClick={() => setQ(i, { options: [...q.options, ''] })}>
                  Add option
                </Button>
              </Box>
            )}
          </Stack>
          <TextField label="Explanation shown after submitting (optional)" value={q.explanation ?? ''} onChange={(e) => setQ(i, { explanation: e.target.value })} sx={{ mt: 1.5 }} />
        </Paper>
      ))}
    </Stack>
  );
}
