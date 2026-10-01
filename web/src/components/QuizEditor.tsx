/**
 * Quiz Studio: the full-screen quiz builder used by Nanoskool authors (course quizzes) and teachers (class quizzes).
 * Left: the question list. Centre: the selected question (or a student preview). Right: quiz settings and a readiness check.
 * Questions can be typed, written with AI from the course's lessons or a topic, or pasted in from a document.
 */
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import CheckBoxOutlined from '@mui/icons-material/CheckBoxOutlined';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Close from '@mui/icons-material/Close';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import ContentPasteOutlined from '@mui/icons-material/ContentPasteOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import RadioButtonCheckedOutlined from '@mui/icons-material/RadioButtonCheckedOutlined';
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked';
import ShortTextOutlined from '@mui/icons-material/ShortTextOutlined';
import ThumbsUpDownOutlined from '@mui/icons-material/ThumbsUpDownOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import dayjs from 'dayjs';
import { useState, type ReactElement, type ReactNode } from 'react';
import { api, errorMessage } from '@/api/client';
import type { Question, Quiz } from '@/api/types';
import { UploadButton } from './ui';

/* ================================================================ model */

export interface QuizDraft {
  title: string;
  description?: string;
  chapterId?: string;
  timeLimitMin?: number | null;
  maxAttempts?: number;
  dueDate?: string | null;
  status: 'draft' | 'published';
  shuffleQuestions?: boolean;
  showAnswers?: 'after_submit' | 'never';
  passPercent?: number | null;
  questions: Question[];
}

type QType = Question['type'];

export const emptyQuestion = (type: QType = 'single'): Question =>
  type === 'true_false'
    ? { text: '', type, options: ['True', 'False'], correct: [0], points: 1, explanation: '', hint: '' }
    : type === 'short'
      ? { text: '', type, options: [], correct: [], accepted: [], points: 1, explanation: '', hint: '' }
      : { text: '', type, options: ['', '', '', ''], correct: type === 'multiple' ? [] : [0], points: 1, explanation: '', hint: '' };

export const emptyQuiz = (): QuizDraft => ({ title: '', description: '', timeLimitMin: null, maxAttempts: 1, dueDate: null, status: 'draft', shuffleQuestions: false, showAnswers: 'after_submit', passPercent: null, questions: [emptyQuestion()] });

/** A saved quiz → editable draft. `localDate` turns the due date into the "YYYY-MM-DDTHH:mm" the date field expects. */
export const quizToDraft = (q: Quiz, localDate?: (iso: string) => string): QuizDraft => ({
  title: q.title,
  description: q.description ?? '',
  chapterId: q.chapterId ?? undefined,
  timeLimitMin: q.timeLimitMin ?? null,
  maxAttempts: q.maxAttempts ?? 1,
  dueDate: q.dueDate ? (localDate ? localDate(q.dueDate) : q.dueDate) : null,
  status: q.status,
  shuffleQuestions: !!q.shuffleQuestions,
  showAnswers: q.showAnswers ?? 'after_submit',
  passPercent: q.passPercent ?? null,
  questions: q.questions.map((x) => ({ ...x, correct: x.correct ?? [], accepted: x.accepted ?? [], explanation: x.explanation ?? '', hint: x.hint ?? '' })),
});

/** What is missing from one question, or null when it is ready. */
export function questionIssue(x: Question): string | null {
  if (!x.text.trim()) return 'Write the question';
  if (x.type === 'short') return x.accepted?.some((a) => a.trim()) ? null : 'Add at least one accepted answer';
  if (x.options.length < 2 || x.options.some((o) => !o.trim())) return 'Fill in every option (at least two)';
  if (!x.correct?.length) return x.type === 'multiple' ? 'Tick the correct answers' : 'Mark the correct answer';
  return null;
}

/** Returns a message if the quiz cannot be saved, else null. */
export function validateQuiz(q: QuizDraft): string | null {
  if (!q.title.trim()) return 'Give the quiz a title';
  if (q.status === 'published' && !q.questions.length) return 'Add at least one question before publishing';
  for (const [i, x] of q.questions.entries()) {
    const issue = questionIssue(x);
    if (issue) return `Question ${i + 1}: ${issue.charAt(0).toLowerCase()}${issue.slice(1)}`;
  }
  if (q.passPercent != null && (q.passPercent < 1 || q.passPercent > 100)) return 'The pass mark must be between 1% and 100%';
  return null;
}

/** Strip client-only fields before sending to the API. */
export function quizPayload(q: QuizDraft) {
  return {
    ...q,
    timeLimitMin: q.timeLimitMin || null,
    dueDate: q.dueDate ? new Date(q.dueDate).toISOString() : null,
    chapterId: q.chapterId || undefined,
    passPercent: q.passPercent || null,
    shuffleQuestions: !!q.shuffleQuestions,
    showAnswers: q.showAnswers ?? 'after_submit',
    questions: q.questions.map(({ _id, accepted, mediaUrl, hint, explanation, ...rest }) => {
      const short = rest.type === 'short';
      return {
        ...(_id ? { _id } : {}),
        ...rest,
        options: short ? [] : rest.options,
        correct: short ? [] : (rest.correct ?? []),
        ...(short ? { accepted: (accepted ?? []).map((a) => a.trim()).filter(Boolean) } : {}),
        ...(mediaUrl ? { mediaUrl } : {}),
        ...(hint?.trim() ? { hint: hint.trim() } : {}),
        ...(explanation?.trim() ? { explanation: explanation.trim() } : {}),
        points: Number(rest.points) || 1,
      };
    }),
  };
}

/* ================================================================ paste import */

/**
 * Reads questions typed or copied from a document:
 *   1. Which gas do plants take in?
 *   a) Oxygen
 *   *b) Carbon dioxide        ← a star marks the right option (or "Answer: b")
 *   Answer: current | electric current   ← no options = short answer
 *   Hint: …  /  Explanation: …
 * Blocks are separated by a blank line or a new number.
 */
export function parsePastedQuestions(text: string): Question[] {
  const lines = text.replace(/\r/g, '').split('\n');
  const blocks: string[][] = [];
  let cur: string[] = [];
  const flush = () => {
    if (cur.some((l) => l.trim())) blocks.push(cur);
    cur = [];
  };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (!l.trim()) {
      flush();
      continue;
    }
    if (/^\s*(Q\s*)?\d+\s*[).:]\s+/i.test(l) && cur.length) flush();
    cur.push(l);
  }
  flush();

  const OPT = /^\s*(\*)?\s*(?:\(?([a-hA-H])[).:]|[-•])\s+(.*?)\s*(\*)?\s*$/;
  const out: Question[] = [];
  for (const b of blocks) {
    let qText = '';
    const options: string[] = [];
    const correct: number[] = [];
    let answer = '';
    let hint = '';
    let explanation = '';
    for (const l of b) {
      const meta = l.match(/^\s*(answer|ans|correct|hint|explanation|why)\s*[:-]\s*(.*)$/i);
      if (meta) {
        const k = meta[1].toLowerCase();
        if (k === 'hint') hint = meta[2];
        else if (k === 'explanation' || k === 'why') explanation = meta[2];
        else answer = meta[2];
        continue;
      }
      const o = !qText ? null : l.match(OPT);
      if (o) {
        if (o[1] || o[4]) correct.push(options.length);
        options.push(o[3]);
        continue;
      }
      const t = l.replace(/^\s*(Q\s*)?\d+\s*[).:]\s+/i, '').trim();
      qText = qText ? `${qText} ${t}` : t;
    }
    if (!qText) continue;
    const isTF = options.length === 2 && /^true$/i.test(options[0].trim()) && /^false$/i.test(options[1].trim());
    if (!options.length && /^(true|false)$/i.test(answer.trim())) {
      out.push({ text: qText, type: 'true_false', options: ['True', 'False'], correct: [/^true$/i.test(answer.trim()) ? 0 : 1], points: 1, hint, explanation });
      continue;
    }
    if (!options.length) {
      out.push({ text: qText, type: 'short', options: [], correct: [], accepted: answer.split(/\s*[|/]\s*|\s*,\s*/).filter(Boolean), points: 1, hint, explanation });
      continue;
    }
    if (!correct.length && answer) {
      for (const tok of answer.split(/[\s,&]+/)) {
        const letter = tok.trim().match(/^\(?([a-hA-H])\)?\.?$/);
        if (letter) correct.push(letter[1].toLowerCase().charCodeAt(0) - 97);
        else if (/^(true|false)$/i.test(tok) && isTF) correct.push(/^true$/i.test(tok) ? 0 : 1);
        else {
          const idx = options.findIndex((x) => x.trim().toLowerCase() === answer.trim().toLowerCase());
          if (idx >= 0) correct.push(idx);
        }
      }
    }
    const right = [...new Set(correct.filter((c) => c < options.length))].sort();
    out.push({
      text: qText,
      type: isTF ? 'true_false' : right.length > 1 ? 'multiple' : 'single',
      options: isTF ? ['True', 'False'] : options,
      correct: right.length ? right : isTF ? [0] : [],
      points: 1,
      hint,
      explanation,
    });
  }
  return out;
}

/* ================================================================ look */

export const TYPES: { type: QType; label: string; short: string; hint: string; icon: ReactNode; color: string }[] = [
  { type: 'single', label: 'One answer', short: 'One', hint: 'Pick one right option', icon: <RadioButtonCheckedOutlined fontSize="small" />, color: '#4F6BED' },
  { type: 'multiple', label: 'Several answers', short: 'Several', hint: 'Tick every right option', icon: <CheckBoxOutlined fontSize="small" />, color: '#8B5CF6' },
  { type: 'true_false', label: 'True or false', short: 'T / F', hint: 'A statement to judge', icon: <ThumbsUpDownOutlined fontSize="small" />, color: '#0EA5A4' },
  { type: 'short', label: 'Short answer', short: 'Typed', hint: 'Students type a word or two', icon: <ShortTextOutlined fontSize="small" />, color: '#F59E0B' },
];
const typeOf = (t: QType) => TYPES.find((x) => x.type === t) ?? TYPES[0];
const LETTER = 'ABCDEFGH';

/** Change a question's type, keeping what still fits. */
function retype(q: Question, type: QType): Question {
  if (type === q.type) return q;
  if (type === 'true_false') return { ...q, type, options: ['True', 'False'], correct: [q.type === 'true_false' ? (q.correct?.[0] ?? 0) : 0] };
  if (type === 'short') return { ...q, type, accepted: q.accepted?.length ? q.accepted : q.type !== 'true_false' && q.correct?.length ? q.correct.map((c) => q.options[c]).filter(Boolean) : [] };
  const options = q.type === 'true_false' || q.type === 'short' || q.options.length < 2 ? (q.accepted?.length ? [...q.accepted.slice(0, 1), '', '', ''] : ['', '', '', '']) : q.options;
  const was = q.type === 'short' && q.accepted?.length ? [0] : (q.correct ?? []);
  return { ...q, type, options, correct: type === 'single' ? [was[0] ?? 0] : was };
}

/* ================================================================ studio */

export interface QuizStudioProps {
  draft: QuizDraft;
  onChange: (q: QuizDraft) => void;
  heading: string;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  error?: string | null;
  /** Content quizzes: pick the chapter; also offered as AI sources. */
  chapters?: { _id: string; title: string }[];
  showDueDate?: boolean;
  /** Extra settings at the top of the settings panel (e.g. the teacher's class and course). */
  extraSettings?: ReactNode;
  /** The course whose lessons AI can write questions from. */
  courseId?: string;
  loading?: boolean;
}

export function QuizStudio(p: QuizStudioProps) {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('lg'));
  const mid = useMediaQuery(theme.breakpoints.up('md'));
  const { draft, onChange } = p;
  const [sel, setSel] = useState(0);
  const [preview, setPreview] = useState(false);
  const [panel, setPanel] = useState<'questions' | 'edit' | 'settings'>('edit');
  const [addAnchor, setAddAnchor] = useState<HTMLElement | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);

  const set = (patch: Partial<QuizDraft>) => onChange({ ...draft, ...patch });
  const qs = draft.questions;
  const cur = Math.min(sel, Math.max(0, qs.length - 1));
  const setQ = (i: number, next: Question) => set({ questions: qs.map((q, j) => (j === i ? next : q)) });
  const add = (more: Question[]) => {
    // Replace a single untouched starter question instead of leaving it empty at the top
    const blank = qs.length === 1 && !qs[0].text.trim() && qs[0].options.every((o) => !o.trim() || qs[0].type === 'true_false');
    const base = blank ? [] : qs;
    set({ questions: [...base, ...more] });
    setSel(base.length);
    setPreview(false);
    if (!mid) setPanel('edit');
  };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= qs.length) return;
    const next = [...qs];
    [next[i], next[j]] = [next[j], next[i]];
    set({ questions: next });
    setSel(j);
  };
  const remove = (i: number) => {
    set({ questions: qs.filter((_, j) => j !== i) });
    setSel(Math.max(0, i - 1));
  };
  const duplicate = (i: number) => {
    const { _id, ...copy } = qs[i];
    void _id;
    const next = [...qs];
    next.splice(i + 1, 0, { ...copy, options: [...copy.options], correct: [...(copy.correct ?? [])], accepted: [...(copy.accepted ?? [])] });
    set({ questions: next });
    setSel(i + 1);
  };

  const total = qs.reduce((s, q) => s + (Number(q.points) || 0), 0);
  const issues = qs.map(questionIssue);
  const ready = issues.filter((x) => !x).length;

  const rail = (
    <QuestionRail
      questions={qs}
      issues={issues}
      selected={preview ? -1 : cur}
      onSelect={(i) => {
        setSel(i);
        setPreview(false);
        if (!mid) setPanel('edit');
      }}
      onMove={move}
      onAdd={(e) => setAddAnchor(e)}
      onAi={() => setAiOpen(true)}
      onPaste={() => setPasteOpen(true)}
    />
  );
  const centre = preview ? (
    <StudentPreview draft={draft} />
  ) : qs.length === 0 ? (
    <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', py: 10 }}>
      <Typography variant="h6">No questions yet</Typography>
      <Typography color="text.secondary">Add one yourself, let AI write a set from the lessons, or paste questions from a document.</Typography>
      <Stack direction="row" spacing={1}>
        <Button variant="contained" startIcon={<Add />} onClick={(e) => setAddAnchor(e.currentTarget)}>
          Add question
        </Button>
        <Button startIcon={<AutoAwesomeOutlined />} onClick={() => setAiOpen(true)}>
          Create with AI
        </Button>
      </Stack>
    </Stack>
  ) : (
    <QuestionEditor key={cur} index={cur} count={qs.length} q={qs[cur]} onChange={(n) => setQ(cur, n)} onDuplicate={() => duplicate(cur)} onDelete={() => remove(cur)} onMove={(d) => move(cur, d)} />
  );
  const settings = (
    <SettingsPanel draft={draft} set={set} chapters={p.chapters} showDueDate={p.showDueDate} extra={p.extraSettings} ready={ready} count={qs.length} issues={issues} onJump={(i) => (setSel(i), setPreview(false), !mid && setPanel('edit'))} />
  );

  return (
    <Dialog open fullScreen onClose={p.onClose} slotProps={{ paper: { sx: { bgcolor: 'background.default' } } }}>
      {/* ----------------------------------------------------------- top bar */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', px: { xs: 1, md: 2 }, py: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Tooltip title="Close without saving">
          <IconButton onClick={p.onClose} aria-label="Close">
            <ArrowBack />
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
            {p.heading}
          </Typography>
          <TextField
            variant="standard"
            placeholder="Untitled quiz"
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            fullWidth
            slotProps={{ input: { disableUnderline: true, sx: { fontSize: { xs: 17, md: 20 }, fontWeight: 700 } }, htmlInput: { 'aria-label': 'Quiz title', maxLength: 200 } }}
          />
        </Box>
        {mid && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Chip size="small" label={`${qs.length} question${qs.length === 1 ? '' : 's'}`} />
            <Chip size="small" label={`${total} point${total === 1 ? '' : 's'}`} />
            <Chip size="small" color={draft.status === 'published' ? 'success' : 'default'} variant={draft.status === 'published' ? 'filled' : 'outlined'} label={draft.status === 'published' ? 'Published' : 'Draft'} />
          </Stack>
        )}
        <ToggleButtonGroup size="small" exclusive value={preview ? 'preview' : 'edit'} onChange={(_, v) => v && setPreview(v === 'preview')}>
          <ToggleButton value="edit" aria-label="Edit">
            <EditOutlined fontSize="small" />
            {mid && <Box sx={{ ml: 0.75 }}>Edit</Box>}
          </ToggleButton>
          <ToggleButton value="preview" aria-label="Preview">
            <VisibilityOutlined fontSize="small" />
            {mid && <Box sx={{ ml: 0.75 }}>Preview</Box>}
          </ToggleButton>
        </ToggleButtonGroup>
        <Button variant="contained" onClick={p.onSave} disabled={p.saving || p.loading}>
          {p.saving ? 'Saving…' : (p.saveLabel ?? 'Save')}
        </Button>
      </Stack>
      {p.error && (
        <Alert severity="error" sx={{ borderRadius: 0 }}>
          {p.error}
        </Alert>
      )}

      {/* ----------------------------------------------------------- body */}
      {p.loading ? (
        <Stack sx={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Stack>
      ) : mid ? (
        <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: wide ? '280px 1fr 340px' : '260px 1fr', overflow: 'hidden' }}>
          <Box sx={{ borderRight: 1, borderColor: 'divider', overflow: 'auto', bgcolor: 'background.paper' }}>{rail}</Box>
          <Box sx={{ overflow: 'auto', p: { md: 3, xl: 4 } }}>
            <Box sx={{ maxWidth: 820, mx: 'auto' }}>
              {centre}
              {!wide && <Box sx={{ mt: 4 }}>{settings}</Box>}
            </Box>
          </Box>
          {wide && <Box sx={{ borderLeft: 1, borderColor: 'divider', overflow: 'auto', bgcolor: 'background.paper' }}>{settings}</Box>}
        </Box>
      ) : (
        <>
          <Tabs value={panel} onChange={(_, v) => setPanel(v)} variant="fullWidth" sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
            <Tab value="questions" label={`Questions (${qs.length})`} />
            <Tab value="edit" label={preview ? 'Preview' : `Q${cur + 1}`} />
            <Tab value="settings" label="Settings" />
          </Tabs>
          <Box sx={{ flex: 1, overflow: 'auto', p: panel === 'edit' ? 2 : 0 }}>{panel === 'questions' ? rail : panel === 'settings' ? settings : centre}</Box>
        </>
      )}

      <Menu anchorEl={addAnchor} open={!!addAnchor} onClose={() => setAddAnchor(null)}>
        {TYPES.map((t) => (
          <MenuItem
            key={t.type}
            onClick={() => {
              setAddAnchor(null);
              add([emptyQuestion(t.type)]);
            }}
          >
            <ListItemIcon sx={{ color: t.color }}>{t.icon}</ListItemIcon>
            <ListItemText primary={t.label} secondary={t.hint} />
          </MenuItem>
        ))}
      </Menu>
      {aiOpen && <AiQuestionsDialog courseId={p.courseId} chapters={p.chapters} existing={qs.map((q) => q.text).filter(Boolean)} onClose={() => setAiOpen(false)} onAdd={(more) => (add(more), setAiOpen(false))} />}
      {pasteOpen && <PasteDialog onClose={() => setPasteOpen(false)} onAdd={(more) => (add(more), setPasteOpen(false))} />}
    </Dialog>
  );
}

/* ---------------------------------------------------------------- left rail */

function QuestionRail({
  questions,
  issues,
  selected,
  onSelect,
  onMove,
  onAdd,
  onAi,
  onPaste,
}: {
  questions: Question[];
  issues: (string | null)[];
  selected: number;
  onSelect: (i: number) => void;
  onMove: (i: number, d: -1 | 1) => void;
  onAdd: (el: HTMLElement) => void;
  onAi: () => void;
  onPaste: () => void;
}) {
  return (
    <Stack sx={{ p: 1.5, gap: 1.5 }}>
      <Stack direction="row" spacing={1}>
        <Button fullWidth variant="contained" startIcon={<Add />} onClick={(e) => onAdd(e.currentTarget)}>
          Add question
        </Button>
      </Stack>
      <Stack direction="row" spacing={1}>
        <Button fullWidth size="small" variant="outlined" startIcon={<AutoAwesomeOutlined />} onClick={onAi} sx={{ borderStyle: 'dashed' }}>
          With AI
        </Button>
        <Button fullWidth size="small" variant="outlined" startIcon={<ContentPasteOutlined />} onClick={onPaste} sx={{ borderStyle: 'dashed' }}>
          Paste
        </Button>
      </Stack>
      <Divider />
      {questions.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
          Questions appear here.
        </Typography>
      )}
      <Stack spacing={0.75} component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {questions.map((q, i) => {
          const t = typeOf(q.type);
          const on = i === selected;
          return (
            <Box
              component="li"
              key={i}
              onClick={() => onSelect(i)}
              sx={{
                position: 'relative',
                display: 'flex',
                gap: 1,
                alignItems: 'flex-start',
                p: 1,
                pr: 4,
                borderRadius: 2,
                cursor: 'pointer',
                border: 1,
                borderColor: on ? t.color : 'transparent',
                bgcolor: on ? alpha(t.color, 0.08) : 'transparent',
                '&:hover': { bgcolor: on ? alpha(t.color, 0.1) : 'action.hover' },
                '&:hover .rail-move': { opacity: 1 },
              }}
            >
              <Box sx={{ width: 28, height: 28, flexShrink: 0, borderRadius: 1.5, display: 'grid', placeItems: 'center', bgcolor: alpha(t.color, 0.14), color: t.color }}>{t.icon}</Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                  Q{i + 1} · {t.short} · {q.points} pt{q.points === 1 ? '' : 's'}
                  {q.mediaUrl && <ImageOutlined sx={{ fontSize: 13 }} />}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 550, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', color: q.text.trim() ? 'text.primary' : 'text.disabled' }}>
                  {q.text.trim() || 'Untitled question'}
                </Typography>
              </Box>
              {issues[i] && (
                <Tooltip title={issues[i]}>
                  <WarningAmberRounded sx={{ position: 'absolute', right: 8, top: 10, fontSize: 18, color: 'warning.main' }} aria-label={`Question ${i + 1}: ${issues[i]}`} />
                </Tooltip>
              )}
              <Stack className="rail-move" sx={{ position: 'absolute', right: 2, bottom: 2, opacity: on ? 1 : 0, transition: 'opacity .15s' }}>
                <IconButton
                  size="small"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(i, -1);
                  }}
                  sx={{ p: 0.25 }}
                >
                  <ArrowUpward sx={{ fontSize: 14 }} />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label="Move down"
                  disabled={i === questions.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(i, 1);
                  }}
                  sx={{ p: 0.25 }}
                >
                  <ArrowDownward sx={{ fontSize: 14 }} />
                </IconButton>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}

/* ---------------------------------------------------------------- centre: one question */

function QuestionEditor({ q, index, count, onChange, onDuplicate, onDelete, onMove }: { q: Question; index: number; count: number; onChange: (q: Question) => void; onDuplicate: () => void; onDelete: () => void; onMove: (d: -1 | 1) => void }) {
  const set = (patch: Partial<Question>) => onChange({ ...q, ...patch });
  const t = typeOf(q.type);
  const [showHint, setShowHint] = useState(!!q.hint || !!q.explanation);
  const issue = questionIssue(q);

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="overline" sx={{ color: t.color, fontWeight: 800, letterSpacing: 1 }}>
          Question {index + 1} of {count}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Move up">
          <span>
            <IconButton size="small" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move question up">
              <ArrowUpward fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Move down">
          <span>
            <IconButton size="small" disabled={index === count - 1} onClick={() => onMove(1)} aria-label="Move question down">
              <ArrowDownward fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Duplicate">
          <IconButton size="small" onClick={onDuplicate} aria-label="Duplicate question">
            <ContentCopyOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete question">
          <IconButton size="small" color="error" onClick={onDelete} aria-label="Delete question">
            <DeleteOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* type tiles */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1 }} role="radiogroup" aria-label="Question type">
        {TYPES.map((x) => {
          const on = x.type === q.type;
          return (
            <Box
              key={x.type}
              role="radio"
              aria-checked={on}
              tabIndex={0}
              onClick={() => onChange(retype(q, x.type))}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onChange(retype(q, x.type)))}
              sx={{
                p: 1.25,
                borderRadius: 2,
                cursor: 'pointer',
                border: 1.5,
                borderColor: on ? x.color : 'divider',
                bgcolor: on ? alpha(x.color, 0.08) : 'background.paper',
                transition: 'all .15s',
                '&:hover': { borderColor: x.color },
                '&:focus-visible': { outline: `2px solid ${x.color}`, outlineOffset: 2 },
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: on ? x.color : 'text.secondary' }}>
                {x.icon}
                <Typography variant="body2" sx={{ fontWeight: 700, color: on ? x.color : 'text.primary' }}>
                  {x.label}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, mt: 0.25 }}>
                {x.hint}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3 }}>
        <TextField
          placeholder={q.type === 'true_false' ? 'Write a statement, e.g. “Copper is a good conductor.”' : 'Type the question…'}
          value={q.text}
          onChange={(e) => set({ text: e.target.value })}
          multiline
          minRows={2}
          fullWidth
          variant="standard"
          slotProps={{ input: { disableUnderline: true, sx: { fontSize: 19, fontWeight: 600, lineHeight: 1.45 } }, htmlInput: { 'aria-label': 'Question text', maxLength: 2000 } }}
        />
        {q.mediaUrl ? (
          <Box sx={{ position: 'relative', mt: 1.5, display: 'inline-block' }}>
            <Box component="img" src={q.mediaUrl} alt="" sx={{ maxWidth: '100%', maxHeight: 260, borderRadius: 2, border: 1, borderColor: 'divider', display: 'block' }} />
            <IconButton size="small" aria-label="Remove picture" onClick={() => set({ mediaUrl: '' })} sx={{ position: 'absolute', top: 6, right: 6, bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'background.paper' } }}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
        ) : (
          <Box sx={{ mt: 1 }}>
            <UploadButton folder="quiz" accept="image/*" label="Add a picture" onUploaded={(url) => set({ mediaUrl: url })} />
          </Box>
        )}
      </Paper>

      {/* answers */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {q.type === 'short' ? 'Accepted answers' : q.type === 'multiple' ? 'Options · tick every right answer' : q.type === 'true_false' ? 'Which is right?' : 'Options · tap the letter of the right answer'}
        </Typography>
        {q.type === 'short' ? <AcceptedEditor value={q.accepted ?? []} onChange={(accepted) => set({ accepted })} /> : <OptionsEditor q={q} set={set} />}
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <TextField label="Points" type="number" value={q.points} onChange={(e) => set({ points: Math.max(0, Math.min(100, Number(e.target.value))) })} sx={{ width: { sm: 120 } }} slotProps={{ htmlInput: { min: 0, max: 100 } }} />
        {!showHint && (
          <Button startIcon={<LightbulbOutlined />} onClick={() => setShowHint(true)} sx={{ alignSelf: 'flex-start' }}>
            Add a hint and explanation
          </Button>
        )}
      </Stack>
      {showHint && (
        <Stack spacing={2}>
          <TextField
            label="Hint (students can open it while answering)"
            value={q.hint ?? ''}
            onChange={(e) => set({ hint: e.target.value })}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LightbulbOutlined fontSize="small" color="warning" />
                  </InputAdornment>
                ),
              },
              htmlInput: { maxLength: 500 },
            }}
          />
          <TextField label="Explanation (shown after submitting)" value={q.explanation ?? ''} onChange={(e) => set({ explanation: e.target.value })} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 2000 } }} />
        </Stack>
      )}
      {issue && (
        <Alert severity="warning" icon={<WarningAmberRounded />} sx={{ borderRadius: 2 }}>
          {issue}
        </Alert>
      )}
    </Stack>
  );
}

function OptionsEditor({ q, set }: { q: Question; set: (p: Partial<Question>) => void }) {
  const tf = q.type === 'true_false';
  const toggle = (i: number) => {
    const has = q.correct?.includes(i);
    set({ correct: q.type === 'multiple' ? (has ? q.correct!.filter((c) => c !== i) : [...(q.correct ?? []), i].sort()) : [i] });
  };
  const removeAt = (i: number) => set({ options: q.options.filter((_, k) => k !== i), correct: (q.correct ?? []).filter((c) => c !== i).map((c) => (c > i ? c - 1 : c)) });
  if (tf)
    return (
      <Stack direction="row" spacing={1.5}>
        {['True', 'False'].map((o, i) => {
          const on = q.correct?.[0] === i;
          return (
            <Button
              key={o}
              fullWidth
              size="large"
              variant={on ? 'contained' : 'outlined'}
              color={on ? 'success' : 'inherit'}
              startIcon={on ? <CheckCircle /> : <RadioButtonUnchecked />}
              onClick={() => set({ correct: [i] })}
              sx={{ py: 1.5, borderRadius: 2.5, fontWeight: 700 }}
            >
              {o}
            </Button>
          );
        })}
      </Stack>
    );
  return (
    <Stack spacing={1}>
      {q.options.map((o, i) => {
        const on = !!q.correct?.includes(i);
        return (
          <Stack
            key={i}
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', p: 0.75, pl: 1, borderRadius: 2.5, border: 1.5, borderColor: on ? 'success.main' : 'divider', bgcolor: on ? (t) => alpha(t.palette.success.main, 0.06) : 'background.paper' }}
          >
            <Tooltip title={on ? 'Right answer' : 'Mark as right'}>
              <Box
                role={q.type === 'multiple' ? 'checkbox' : 'radio'}
                aria-checked={on}
                aria-label={`Option ${LETTER[i]} is right`}
                tabIndex={0}
                onClick={() => toggle(i)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle(i))}
                sx={{
                  width: 32,
                  height: 32,
                  flexShrink: 0,
                  borderRadius: q.type === 'multiple' ? 1.5 : '50%',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: 14,
                  bgcolor: on ? 'success.main' : 'action.hover',
                  color: on ? '#fff' : 'text.secondary',
                  '&:hover': { bgcolor: on ? 'success.dark' : 'action.selected' },
                }}
              >
                {on ? <CheckCircle sx={{ fontSize: 18 }} /> : LETTER[i]}
              </Box>
            </Tooltip>
            <TextField
              variant="standard"
              fullWidth
              placeholder={`Option ${LETTER[i]}`}
              value={o}
              onChange={(e) => set({ options: q.options.map((x, k) => (k === i ? e.target.value : x)) })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && i === q.options.length - 1 && q.options.length < 8) {
                  e.preventDefault();
                  set({ options: [...q.options, ''] });
                }
              }}
              slotProps={{ input: { disableUnderline: true }, htmlInput: { 'aria-label': `Option ${LETTER[i]}`, maxLength: 500 } }}
            />
            {q.options.length > 2 && (
              <IconButton size="small" aria-label={`Remove option ${LETTER[i]}`} onClick={() => removeAt(i)}>
                <Close fontSize="small" />
              </IconButton>
            )}
          </Stack>
        );
      })}
      {q.options.length < 8 && (
        <Box>
          <Button size="small" startIcon={<Add />} onClick={() => set({ options: [...q.options, ''] })}>
            Add option
          </Button>
        </Box>
      )}
    </Stack>
  );
}

function AcceptedEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState('');
  const commit = () => {
    const parts = text
      .split(/[|,]/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (!parts.length) return;
    onChange([...new Set([...value, ...parts])].slice(0, 10));
    setText('');
  };
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5 }}>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mb: value.length ? 1.5 : 0 }}>
        {value.map((a) => (
          <Chip key={a} label={a} color="success" variant="outlined" icon={<CheckCircle />} onDelete={() => onChange(value.filter((x) => x !== a))} />
        ))}
      </Stack>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          fullWidth
          placeholder={value.length ? 'Another way to write it…' : 'Type a right answer and press Enter'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commit())}
          onBlur={commit}
          slotProps={{ htmlInput: { 'aria-label': 'Accepted answer', maxLength: 200 } }}
        />
        <Button onClick={commit} disabled={!text.trim() || value.length >= 10}>
          Add
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        Capital letters, extra spaces and a full stop at the end don&apos;t matter. Add other spellings students might use.
      </Typography>
    </Paper>
  );
}

/* ---------------------------------------------------------------- right: settings + readiness */

function SettingsPanel({
  draft,
  set,
  chapters,
  showDueDate,
  extra,
  ready,
  count,
  issues,
  onJump,
}: {
  draft: QuizDraft;
  set: (p: Partial<QuizDraft>) => void;
  chapters?: { _id: string; title: string }[];
  showDueDate?: boolean;
  extra?: ReactNode;
  ready: number;
  count: number;
  issues: (string | null)[];
  onJump: (i: number) => void;
}) {
  const firstBad = issues.findIndex(Boolean);
  const checks = [
    { ok: !!draft.title.trim(), label: 'Quiz has a title' },
    { ok: count > 0, label: 'At least one question' },
    { ok: count > 0 && ready === count, label: count ? `${ready} of ${count} questions complete` : 'Questions complete', jump: firstBad >= 0 ? firstBad : undefined },
  ];
  const allOk = checks.every((c) => c.ok);
  return (
    <Stack spacing={2.5} sx={{ p: 2.5 }}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderColor: allOk ? 'success.light' : 'warning.light', bgcolor: (t) => alpha(allOk ? t.palette.success.main : t.palette.warning.main, 0.05) }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {allOk ? 'Ready to go' : 'Before students see it'}
        </Typography>
        <Stack spacing={0.75}>
          {checks.map((c) => (
            <Stack key={c.label} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              {c.ok ? <CheckCircle fontSize="small" color="success" /> : <RadioButtonUnchecked fontSize="small" color="warning" />}
              <Typography variant="body2" sx={{ flex: 1 }}>
                {c.label}
              </Typography>
              {!c.ok && c.jump != null && (
                <Button size="small" onClick={() => onJump(c.jump!)}>
                  Fix
                </Button>
              )}
            </Stack>
          ))}
        </Stack>
      </Paper>

      <Box>
        <Typography variant="overline" color="text.secondary">
          Visibility
        </Typography>
        <ToggleButtonGroup fullWidth size="small" exclusive value={draft.status} onChange={(_, v) => v && set({ status: v })} sx={{ mt: 0.5 }}>
          <ToggleButton value="draft">Draft</ToggleButton>
          <ToggleButton value="published" color="success">
            Published
          </ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          {draft.status === 'published' ? 'Students can take it now.' : 'Hidden from students until you publish.'}
        </Typography>
      </Box>

      {extra && <Stack spacing={2}>{extra}</Stack>}

      <TextField label="Instructions for students" value={draft.description ?? ''} onChange={(e) => set({ description: e.target.value })} multiline minRows={2} placeholder="e.g. Read each question carefully. You can use a pencil and paper." />
      {chapters && (
        <TextField select label="Chapter" value={draft.chapterId ?? ''} onChange={(e) => set({ chapterId: e.target.value || undefined })} slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}>
          <MenuItem value="">Whole course</MenuItem>
          {chapters.map((c) => (
            <MenuItem key={c._id} value={c._id}>
              {c.title}
            </MenuItem>
          ))}
        </TextField>
      )}

      <Typography variant="overline" color="text.secondary" sx={{ mb: -1.5 }}>
        Taking the quiz
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        <TextField
          label="Time limit"
          type="number"
          value={draft.timeLimitMin ?? ''}
          onChange={(e) => set({ timeLimitMin: e.target.value ? Math.max(1, Math.min(300, Number(e.target.value))) : null })}
          placeholder="None"
          slotProps={{ input: { endAdornment: <InputAdornment position="end">min</InputAdornment> }, inputLabel: { shrink: true } }}
        />
        <TextField label="Attempts" type="number" value={draft.maxAttempts ?? 1} onChange={(e) => set({ maxAttempts: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} slotProps={{ htmlInput: { min: 1, max: 20 } }} />
        <TextField
          label="Pass mark"
          type="number"
          value={draft.passPercent ?? ''}
          onChange={(e) => set({ passPercent: e.target.value ? Math.max(1, Math.min(100, Number(e.target.value))) : null })}
          placeholder="None"
          slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> }, inputLabel: { shrink: true } }}
        />
        {showDueDate && (
          <TextField
            label="Closes on"
            type="datetime-local"
            value={draft.dueDate ? dayjs(draft.dueDate).format('YYYY-MM-DDTHH:mm') : ''}
            onChange={(e) => set({ dueDate: e.target.value || null })}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ gridColumn: '1 / -1' }}
          />
        )}
      </Box>
      <FormControlLabel control={<Switch checked={!!draft.shuffleQuestions} onChange={(e) => set({ shuffleQuestions: e.target.checked })} />} label={<Typography variant="body2">Shuffle question order for each student</Typography>} />
      <TextField select label="After submitting, students see" value={draft.showAnswers ?? 'after_submit'} onChange={(e) => set({ showAnswers: e.target.value as QuizDraft['showAnswers'] })}>
        <MenuItem value="after_submit">Their score, the right answers and explanations</MenuItem>
        <MenuItem value="never">Only their score</MenuItem>
      </TextField>
    </Stack>
  );
}

/* ---------------------------------------------------------------- preview */

function StudentPreview({ draft }: { draft: QuizDraft }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<Record<number, number[]>>({});
  const [typed, setTyped] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [hint, setHint] = useState<Record<number, boolean>>({});
  const qs = draft.questions;
  if (!qs.length) return <Alert severity="info">Add questions to preview the quiz.</Alert>;
  const n = Math.min(i, qs.length - 1);
  const q = qs[n];
  const t = typeOf(q.type);
  const mine = picked[n] ?? [];
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[.!?;:,]+$/, '')
      .trim();
  const right = q.type === 'short' ? (q.accepted ?? []).some((a) => norm(a) === norm(typed[n] ?? '')) : [...mine].sort().join() === [...(q.correct ?? [])].sort().join();
  const pick = (oi: number) => {
    if (checked[n]) return;
    setPicked({ ...picked, [n]: q.type === 'multiple' ? (mine.includes(oi) ? mine.filter((x) => x !== oi) : [...mine, oi]) : [oi] });
  };
  const COLORS = ['#4F6BED', '#F472B6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EF4444', '#84CC16'];
  return (
    <Stack spacing={2}>
      <Alert severity="info" icon={<VisibilityOutlined />} sx={{ borderRadius: 2 }}>
        This is how students see the quiz. Answers you try here are not saved.
      </Alert>
      <Paper sx={{ borderRadius: 4, overflow: 'hidden', border: 1, borderColor: 'divider' }} elevation={0}>
        <Box sx={{ px: 3, py: 2, background: `linear-gradient(135deg, ${alpha(t.color, 0.16)}, ${alpha('#F472B6', 0.12)})` }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: t.color }}>
            Question {n + 1} of {qs.length} · {q.points} point{q.points === 1 ? '' : 's'}
            {draft.timeLimitMin ? ` · ${draft.timeLimitMin} min quiz` : ''}
          </Typography>
          <Box sx={{ height: 6, borderRadius: 3, bgcolor: alpha('#000', 0.06), mt: 1 }}>
            <Box sx={{ height: 6, borderRadius: 3, bgcolor: t.color, width: `${((n + 1) / qs.length) * 100}%`, transition: 'width .3s' }} />
          </Box>
        </Box>
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {q.text || (
              <Box component="span" sx={{ color: 'text.disabled' }}>
                Untitled question
              </Box>
            )}
          </Typography>
          {q.mediaUrl && <Box component="img" src={q.mediaUrl} alt="" sx={{ maxWidth: '100%', maxHeight: 280, borderRadius: 3, mb: 2, display: 'block' }} />}
          {q.type === 'short' ? (
            <TextField fullWidth placeholder="Type your answer" value={typed[n] ?? ''} onChange={(e) => setTyped({ ...typed, [n]: e.target.value })} disabled={checked[n]} slotProps={{ input: { sx: { fontSize: 18, borderRadius: 3 } } }} />
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: q.options.length <= 2 ? '1fr 1fr' : '1fr 1fr' }, gap: 1.25 }}>
              {q.options.map((o, oi) => {
                const on = mine.includes(oi);
                const c = COLORS[oi % COLORS.length];
                const good = checked[n] && q.correct?.includes(oi);
                const bad = checked[n] && on && !q.correct?.includes(oi);
                return (
                  <Box
                    key={oi}
                    onClick={() => pick(oi)}
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      cursor: checked[n] ? 'default' : 'pointer',
                      border: 2,
                      borderColor: good ? 'success.main' : bad ? 'error.main' : on ? c : 'divider',
                      bgcolor: good ? (th) => alpha(th.palette.success.main, 0.1) : on ? alpha(c, 0.1) : 'background.paper',
                      display: 'flex',
                      gap: 1.25,
                      alignItems: 'center',
                      transition: 'transform .1s',
                      '&:active': { transform: 'scale(.98)' },
                    }}
                  >
                    <Box sx={{ width: 30, height: 30, borderRadius: q.type === 'multiple' ? 1.5 : '50%', display: 'grid', placeItems: 'center', bgcolor: on ? c : alpha(c, 0.15), color: on ? '#fff' : c, fontWeight: 800, flexShrink: 0 }}>
                      {q.type === 'true_false' ? (oi === 0 ? '✓' : '✗') : LETTER[oi]}
                    </Box>
                    <Typography sx={{ fontWeight: 600 }}>
                      {o || (
                        <Box component="span" sx={{ color: 'text.disabled' }}>
                          Option {LETTER[oi]}
                        </Box>
                      )}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}
          {q.hint && (
            <Box sx={{ mt: 2 }}>
              {hint[n] ? (
                <Alert severity="warning" icon={<LightbulbOutlined />} sx={{ borderRadius: 2 }}>
                  {q.hint}
                </Alert>
              ) : (
                <Button size="small" color="warning" startIcon={<LightbulbOutlined />} onClick={() => setHint({ ...hint, [n]: true })}>
                  Need a hint?
                </Button>
              )}
            </Box>
          )}
          {checked[n] && (
            <Alert severity={right ? 'success' : 'error'} sx={{ mt: 2, borderRadius: 2 }}>
              {right ? 'Correct!' : q.type === 'short' ? `Accepted: ${(q.accepted ?? []).join(', ') || '—'}` : 'Not quite.'}
              {q.explanation ? ` ${q.explanation}` : ''}
            </Alert>
          )}
          <Stack direction="row" spacing={1} sx={{ mt: 3, justifyContent: 'space-between' }}>
            <Button disabled={n === 0} onClick={() => setI(n - 1)}>
              Back
            </Button>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => setChecked({ ...checked, [n]: !checked[n] })}>
                {checked[n] ? 'Try again' : 'Check answer'}
              </Button>
              <Button variant="contained" disabled={n === qs.length - 1} onClick={() => setI(n + 1)}>
                Next
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
      {draft.passPercent ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Students pass with {draft.passPercent}% or more.
        </Typography>
      ) : null}
    </Stack>
  );
}

/* ---------------------------------------------------------------- AI */

interface GenResult {
  questions: Question[];
  provider: 'ai' | 'offline';
}

function AiQuestionsDialog({ courseId, chapters, existing, onClose, onAdd }: { courseId?: string; chapters?: { _id: string; title: string }[]; existing: string[]; onClose: () => void; onAdd: (qs: Question[]) => void }) {
  const [source, setSource] = useState<'course' | 'topic'>(courseId ? 'course' : 'topic');
  const [chapterId, setChapterId] = useState('');
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [types, setTypes] = useState<QType[]>(['single', 'true_false']);
  const [difficulty, setDifficulty] = useState<'easy' | 'mixed' | 'hard'>('mixed');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<GenResult | null>(null);
  const [keep, setKeep] = useState<Set<number>>(new Set());

  const run = async () => {
    setErr('');
    if (source === 'topic' && topic.trim().length < 2) return setErr('Type a topic');
    if (!types.length) return setErr('Choose at least one question type');
    setBusy(true);
    try {
      const body = { count, types, difficulty, avoid: existing.slice(0, 200), ...(source === 'course' ? (chapterId ? { chapterId } : { courseId }) : {}), ...(topic.trim() ? { topic: topic.trim() } : {}) };
      const r = (await api.post<GenResult>('/ai/quizzes/generate', body)).data;
      setResult(r);
      setKeep(new Set(r.questions.map((_, i) => i)));
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoAwesomeOutlined color="primary" /> {result ? 'Choose the questions to add' : 'Create questions with AI'}
      </DialogTitle>
      <DialogContent dividers>
        {!result ? (
          <Stack spacing={2.5}>
            {courseId && (
              <ToggleButtonGroup fullWidth exclusive size="small" value={source} onChange={(_, v) => v && setSource(v)}>
                <ToggleButton value="course">From the lessons</ToggleButton>
                <ToggleButton value="topic">From a topic</ToggleButton>
              </ToggleButtonGroup>
            )}
            {source === 'course' && courseId && chapters && chapters.length > 0 && (
              <TextField select label="Lessons from" value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
                <MenuItem value="">The whole course</MenuItem>
                {chapters.map((c) => (
                  <MenuItem key={c._id} value={c._id}>
                    {c.title}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              label={source === 'course' ? 'Focus (optional)' : 'Topic'}
              placeholder={source === 'course' ? 'e.g. conductors and insulators' : 'e.g. Parts of a plant, Grade 4'}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              autoFocus={source === 'topic'}
            />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Question types
              </Typography>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                {TYPES.map((t) => {
                  const on = types.includes(t.type);
                  return (
                    <Chip key={t.type} icon={t.icon as ReactElement} label={t.label} color={on ? 'primary' : 'default'} variant={on ? 'filled' : 'outlined'} onClick={() => setTypes(on ? types.filter((x) => x !== t.type) : [...types, t.type])} />
                  );
                })}
              </Stack>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select label="How many" value={count} onChange={(e) => setCount(Number(e.target.value))} sx={{ minWidth: 120 }}>
                {[3, 5, 8, 10, 15, 20].map((n) => (
                  <MenuItem key={n} value={n}>
                    {n} questions
                  </MenuItem>
                ))}
              </TextField>
              <Box sx={{ flex: 1 }}>
                <ToggleButtonGroup fullWidth exclusive size="small" value={difficulty} onChange={(_, v) => v && setDifficulty(v)} sx={{ height: '100%' }}>
                  <ToggleButton value="easy">Easy</ToggleButton>
                  <ToggleButton value="mixed">Mixed</ToggleButton>
                  <ToggleButton value="hard">Challenging</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Stack>
            {err && <Alert severity="error">{err}</Alert>}
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            {result.provider === 'offline' && (
              <Alert severity="info">{source === 'course' ? 'AI is switched off, so these drafts were made straight from the lesson text. Check and polish them after adding.' : 'AI is switched off, so these are outlines for you to complete.'}</Alert>
            )}
            {result.questions.length === 0 && <Alert severity="warning">No questions could be made. Try a topic, or choose lessons with more text.</Alert>}
            {result.questions.map((q, i) => {
              const on = keep.has(i);
              const t = typeOf(q.type);
              return (
                <Paper
                  key={i}
                  variant="outlined"
                  onClick={() => {
                    const k = new Set(keep);
                    if (on) k.delete(i);
                    else k.add(i);
                    setKeep(k);
                  }}
                  sx={{ p: 1.5, borderRadius: 2.5, cursor: 'pointer', display: 'flex', gap: 1, borderColor: on ? 'primary.main' : 'divider', opacity: on ? 1 : 0.6 }}
                >
                  <Checkbox checked={on} sx={{ p: 0.5, alignSelf: 'flex-start' }} slotProps={{ input: { 'aria-label': `Keep question ${i + 1}` } }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" sx={{ color: t.color, fontWeight: 700 }}>
                      {t.label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {q.text}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {q.type === 'short' ? `Answer: ${(q.accepted ?? []).join(' / ')}` : q.options.map((o, oi) => `${q.correct?.includes(oi) ? '✓ ' : ''}${o}`).join(' · ')}
                    </Typography>
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {result ? (
          <>
            <Button onClick={() => setResult(null)}>Back</Button>
            <Button onClick={run} disabled={busy}>
              {busy ? 'Writing…' : 'Try again'}
            </Button>
            <Button variant="contained" disabled={!keep.size} onClick={() => onAdd(result.questions.filter((_, i) => keep.has(i)).map((q) => ({ ...q, hint: q.hint ?? '', explanation: q.explanation ?? '', accepted: q.accepted ?? [] })))}>
              Add {keep.size} question{keep.size === 1 ? '' : 's'}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="contained" onClick={run} disabled={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeOutlined />}>
              {busy ? 'Writing questions…' : 'Write questions'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- paste */

const PASTE_EXAMPLE = `1. Which of these is a conductor?
a) Rubber
*b) Copper
c) Wood

2. A switch opens and closes a circuit.
Answer: True

3. What flows in a closed circuit?
Answer: current | electric current
Hint: It starts with “c”`;

function PasteDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (qs: Question[]) => void }) {
  const [text, setText] = useState('');
  const parsed = text.trim() ? parsePastedQuestions(text) : [];
  const ok = parsed.filter((q) => !questionIssue(q)).length;
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ContentPasteOutlined color="primary" /> Paste questions
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Box>
            <TextField
              multiline
              minRows={14}
              maxRows={22}
              fullWidth
              placeholder={PASTE_EXAMPLE}
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
              slotProps={{ input: { sx: { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13 } } }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Number each question. Put a <b>*</b> before the right option, or write <b>Answer: b</b>. With no options, <b>Answer:</b> makes a short-answer question (separate other spellings with <b>|</b>). <b>Hint:</b> and <b>Explanation:</b> lines
              work too.
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {parsed.length ? `${parsed.length} question${parsed.length === 1 ? '' : 's'} found · ${ok} ready` : 'Preview'}
            </Typography>
            <Stack spacing={1}>
              {!parsed.length && (
                <Typography variant="body2" color="text.secondary">
                  Questions appear here as you paste.
                </Typography>
              )}
              {parsed.map((q, i) => {
                const issue = questionIssue(q);
                const t = typeOf(q.type);
                return (
                  <Paper key={i} variant="outlined" sx={{ p: 1.25, borderRadius: 2, borderColor: issue ? 'warning.main' : 'divider' }}>
                    <Typography variant="caption" sx={{ color: t.color, fontWeight: 700 }}>
                      {i + 1}. {t.label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {q.text}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {q.type === 'short' ? `Answer: ${(q.accepted ?? []).join(' / ') || '—'}` : q.options.map((o, oi) => `${q.correct?.includes(oi) ? '✓ ' : ''}${o}`).join(' · ')}
                    </Typography>
                    {issue && (
                      <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                        {issue} — you can fix it after adding.
                      </Typography>
                    )}
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!parsed.length} onClick={() => onAdd(parsed)}>
          Add {parsed.length || ''} question{parsed.length === 1 ? '' : 's'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- read-only question (quiz detail pages) */

export function QuestionReadout({ q, index }: { q: Question; index: number }) {
  const t = typeOf(q.type);
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
      <Stack direction="row" spacing={1.25} sx={{ mb: 1, alignItems: 'flex-start' }}>
        <Box sx={{ width: 28, height: 28, flexShrink: 0, borderRadius: 1.5, display: 'grid', placeItems: 'center', bgcolor: alpha(t.color, 0.14), color: t.color }}>{t.icon}</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary">
            Q{index + 1} · {t.label}
          </Typography>
          <Typography sx={{ fontWeight: 600 }}>{q.text}</Typography>
        </Box>
        <Chip size="small" variant="outlined" label={`${q.points ?? 1} pt${(q.points ?? 1) === 1 ? '' : 's'}`} />
      </Stack>
      <Box sx={{ pl: 5 }}>
        {q.mediaUrl && <Box component="img" src={q.mediaUrl} alt="" sx={{ maxWidth: '100%', maxHeight: 200, borderRadius: 2, mb: 1, display: 'block' }} />}
        {q.type === 'short' ? (
          q.accepted?.length ? (
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
              {q.accepted.map((a) => (
                <Chip key={a} size="small" color="success" variant="outlined" icon={<CheckCircle />} label={a} />
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Students type their answer.
            </Typography>
          )
        ) : (
          <Stack spacing={0.5}>
            {q.options.map((o, oi) => {
              const right = q.correct?.includes(oi);
              return (
                <Stack key={oi} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  {right ? <CheckCircle fontSize="small" color="success" /> : <RadioButtonUnchecked fontSize="small" color="disabled" />}
                  <Typography variant="body2" sx={{ fontWeight: right ? 650 : 400, color: right ? 'success.main' : 'text.primary' }}>
                    {o}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        )}
        {q.hint && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <LightbulbOutlined sx={{ fontSize: 16 }} color="warning" /> {q.hint}
          </Typography>
        )}
        {q.explanation && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Explanation: {q.explanation}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
