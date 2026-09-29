import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  Paper,
  Radio,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ArrowForward from '@mui/icons-material/ArrowForward';
import TimerOutlined from '@mui/icons-material/TimerOutlined';
import CheckCircle from '@mui/icons-material/CheckCircle';
import HighlightOff from '@mui/icons-material/HighlightOff';
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined';
import CelebrationOutlined from '@mui/icons-material/CelebrationOutlined';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Replay from '@mui/icons-material/Replay';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import dayjs from 'dayjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/api/client';
import { refName, type AttemptResult, type Quiz, type QuizSummary } from '@/api/types';
import { useGet } from '@/lib/hooks';
import { useToast } from '@/components/Toast';
import { DataTable, Empty, PageHeader, QueryState, Section, fmtDate, fmtDateTime } from '@/components/ui';
import { BackButton, UrlTabs, useTab } from '@/pages/teacher/common';
import { ProgressRing, S, attemptsLeft, cheer, quizClosed } from './common';

/* ------------------------------------------------------------------ List */

const TABS = ['open', 'done'] as const;

function QuizCard({ x }: { x: QuizSummary }) {
  const closed = quizClosed(x);
  const left = attemptsLeft(x);
  const tried = (x.attemptsUsed ?? 0) > 0;
  return (
    <Paper
      variant="outlined"
      component={RouterLink}
      to={`${S}/quizzes/${x._id}`}
      sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', textDecoration: 'none', color: 'inherit', '&:hover': { bgcolor: '#FAFBFE' }, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}
    >
      <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: tried ? 'rgba(46,157,97,0.12)' : 'rgba(242,139,48,0.14)', color: tried ? 'success.main' : 'secondary.main', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        {tried ? <EmojiEventsOutlined /> : <QuizOutlined />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 180 }}>
        <Typography sx={{ fontWeight: 650 }}>{x.title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {[refName(x.courseId) || refName(x.classId), `${x.questionCount} questions`, x.timeLimitMin ? `${x.timeLimitMin} min` : 'No time limit', x.dueDate ? `${closed ? 'closed' : 'closes'} ${fmtDate(x.dueDate, 'D MMM, h:mm A')}` : '']
            .filter(Boolean)
            .join(' · ')}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
        <Chip size="small" variant="outlined" label={`Attempts ${x.attemptsUsed ?? 0}/${x.maxAttempts ?? 1}`} />
        {x.bestPercent != null && <Chip size="small" color={x.bestPercent >= 75 ? 'success' : 'default'} label={`Best ${x.bestPercent}%`} />}
        {closed ? <Chip size="small" label="Closed" /> : left > 0 ? <Chip size="small" color="secondary" label={tried ? 'Try again' : 'New'} /> : null}
      </Stack>
    </Paper>
  );
}

export function StudentQuizzesPage() {
  const q = useGet<QuizSummary[]>('/quizzes');
  const [tab, setTab] = useTab(TABS, 'open');
  return (
    <>
      <PageHeader title="Quizzes" subtitle="Test what you have learned. You get your score straight away!" />
      <QueryState q={q}>
        {(items) => {
          const open = items.filter((x) => !quizClosed(x) && attemptsLeft(x) > 0);
          const done = items.filter((x) => !open.includes(x));
          const rows = tab === 'open' ? open : done;
          return (
            <>
              <UrlTabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: 'open', label: `Ready to take (${open.length})` },
                  { value: 'done', label: `Finished or closed (${done.length})` },
                ]}
              />
              {rows.length === 0 ? (
                <Empty title={tab === 'open' ? 'No quizzes waiting for you' : 'No finished quizzes yet'} hint={tab === 'open' ? 'New quizzes from your teachers and courses show up here.' : 'Quizzes you have used all attempts on show here.'} />
              ) : (
                <Stack spacing={1.5}>
                  {rows.map((x) => (
                    <QuizCard key={x._id} x={x} />
                  ))}
                </Stack>
              )}
            </>
          );
        }}
      </QueryState>
    </>
  );
}

/* ------------------------------------------------------------- Taker */

type Phase = 'intro' | 'taking' | 'result';

export function StudentQuizPage() {
  const { id } = useParams();
  const q = useGet<Quiz>(`/quizzes/${id}`);
  const [phase, setPhase] = useState<Phase>('intro');
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [runKey, setRunKey] = useState(0);
  return (
    <QueryState q={q}>
      {(quiz) => (
        <Box sx={{ maxWidth: 860, mx: 'auto' }}>
          {phase !== 'taking' && <BackButton to={`${S}/quizzes`}>Quizzes</BackButton>}
          {phase === 'intro' && <Intro quiz={quiz} onStart={() => { setRunKey((k) => k + 1); setPhase('taking'); }} />}
          {phase === 'taking' && (
            <Taker
              key={runKey}
              quiz={quiz}
              onDone={(r) => {
                setResult(r);
                setPhase('result');
              }}
              onCancel={() => setPhase('intro')}
            />
          )}
          {phase === 'result' && result && <Results quiz={quiz} result={result} onAgain={() => { setRunKey((k) => k + 1); setPhase('taking'); }} onBack={() => setPhase('intro')} />}
        </Box>
      )}
    </QueryState>
  );
}

function Intro({ quiz, onStart }: { quiz: Quiz; onStart: () => void }) {
  const closed = quizClosed(quiz);
  const left = quiz.attemptsLeft ?? 0;
  const best = quiz.attempts?.length ? Math.max(...quiz.attempts.map((a) => a.percent)) : null;
  const canStart = quiz.status === 'published' && !closed && left > 0 && quiz.questions.length > 0;
  return (
    <>
      <Paper sx={{ p: { xs: 3, md: 4 }, mb: 3, borderRadius: 4, textAlign: 'center', background: 'linear-gradient(160deg, rgba(63,61,191,0.06), rgba(242,139,48,0.10))' }} variant="outlined">
        <Box sx={{ width: 64, height: 64, mx: 'auto', mb: 2, borderRadius: 4, bgcolor: 'secondary.main', color: '#fff', display: 'grid', placeItems: 'center' }}>
          <QuizOutlined sx={{ fontSize: 34 }} />
        </Box>
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          {quiz.title}
        </Typography>
        {quiz.description && (
          <Typography color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-wrap', maxWidth: 560, mx: 'auto' }}>
            {quiz.description}
          </Typography>
        )}
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          <Chip label={`${quiz.questions.length} questions`} />
          <Chip icon={<TimerOutlined />} label={quiz.timeLimitMin ? `${quiz.timeLimitMin} minutes` : 'No time limit'} />
          <Chip label={`${left} of ${quiz.maxAttempts ?? 1} attempts left`} color={left ? 'default' : 'warning'} />
          {quiz.dueDate && <Chip label={`${closed ? 'Closed' : 'Closes'} ${fmtDateTime(quiz.dueDate)}`} color={closed ? 'default' : 'info'} variant="outlined" />}
          {best != null && <Chip color={best >= 75 ? 'success' : 'default'} icon={<EmojiEventsOutlined />} label={`Best score ${best}%`} />}
        </Stack>
        {canStart ? (
          <>
            <Button variant="contained" size="large" color="secondary" startIcon={<PlayArrow />} onClick={onStart} sx={{ px: 4, py: 1.25, fontSize: 16 }}>
              {quiz.attempts?.length ? 'Try again' : 'Start quiz'}
            </Button>
            {quiz.timeLimitMin ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                The timer starts when you press start. Your answers are handed in automatically when time runs out.
              </Typography>
            ) : null}
          </>
        ) : (
          <Alert severity="info" sx={{ display: 'inline-flex', textAlign: 'left' }}>
            {closed ? 'This quiz is closed.' : left <= 0 ? 'You have used all your attempts on this quiz.' : quiz.questions.length === 0 ? 'This quiz has no questions yet.' : 'This quiz is not open yet.'}
          </Alert>
        )}
      </Paper>
      <Section title="Your attempts">
        <DataTable
          rows={quiz.attempts ?? []}
          empty={<Empty title="No attempts yet" hint="Your scores will show here." />}
          columns={[
            { key: 'n', label: '#', width: 50, render: (a) => (quiz.attempts!.length - quiz.attempts!.indexOf(a)).toString() },
            { key: 'score', label: 'Score', render: (a) => `${a.score}/${a.maxScore}` },
            { key: 'pct', label: '%', render: (a) => <Chip size="small" label={`${a.percent}%`} color={a.percent >= 75 ? 'success' : a.percent >= 40 ? 'default' : 'warning'} /> },
            { key: 'date', label: 'When', render: (a) => fmtDateTime(a.submittedAt) },
          ]}
        />
      </Section>
    </>
  );
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function Taker({ quiz, onDone, onCancel }: { quiz: Quiz; onDone: (r: AttemptResult) => void; onCancel: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [startedAt] = useState(() => new Date());
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [confirm, setConfirm] = useState(false);
  const [leave, setLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const deadline = quiz.timeLimitMin ? startedAt.getTime() + quiz.timeLimitMin * 60_000 : null;
  const [remaining, setRemaining] = useState(deadline ? Math.round((deadline - Date.now()) / 1000) : 0);
  const submitted = useRef(false);
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const submit = useCallback(
    async (auto = false) => {
      if (submitted.current) return;
      submitted.current = true;
      setBusy(true);
      setError('');
      try {
        const payload = {
          answers: quiz.questions.map((x) => ({ questionId: x._id!, selected: answersRef.current[x._id!] ?? [] })),
          startedAt: startedAt.toISOString(),
        };
        const r = await api.post<AttemptResult>(`/quizzes/${quiz._id}/attempts`, payload);
        if (auto) toast.info("Time's up! Your answers were handed in.");
        await Promise.all(['/quizzes', '/dashboard', '/reports', '/rewards'].map((p) => qc.invalidateQueries({ predicate: (k) => typeof k.queryKey[0] === 'string' && (k.queryKey[0] as string).startsWith(p) })));
        onDone(r.data);
      } catch (err) {
        submitted.current = false;
        setError(errorMessage(err, 'Could not hand in your answers. Check your connection and try again.'));
      } finally {
        setBusy(false);
        setConfirm(false);
      }
    },
    [quiz, startedAt, toast, qc, onDone],
  );

  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        clearInterval(t);
        submit(true);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [deadline, submit]);

  // Warn before closing the tab mid-quiz
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (!submitted.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  const total = quiz.questions.length;
  const x = quiz.questions[index];
  const qid = x._id!;
  const sel = answers[qid] ?? [];
  const answered = quiz.questions.filter((qq) => (answers[qq._id!] ?? []).length > 0).length;
  const multiple = x.type === 'multiple';
  const toggle = (oi: number) =>
    setAnswers((a) => {
      const cur = a[qid] ?? [];
      return { ...a, [qid]: multiple ? (cur.includes(oi) ? cur.filter((v) => v !== oi) : [...cur, oi].sort()) : [oi] };
    });
  const lowTime = deadline != null && remaining <= 60;

  return (
    <>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1 }}>
        <Button startIcon={<ArrowBack />} onClick={() => setLeave(true)} size="small">
          Leave quiz
        </Button>
        <Typography sx={{ fontWeight: 650, flex: 1, textAlign: 'center' }} noWrap>
          {quiz.title}
        </Typography>
        {deadline ? (
          <Chip
            icon={<TimerOutlined />}
            label={mmss(remaining)}
            color={lowTime ? 'error' : 'default'}
            sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 84 }}
            aria-label={`Time left ${mmss(remaining)}`}
          />
        ) : (
          <Box sx={{ width: 84 }} />
        )}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          Question {index + 1} of {total}
        </Typography>
        <LinearProgress variant="determinate" value={((index + 1) / total) * 100} sx={{ flex: 1, height: 8, borderRadius: 4 }} color="secondary" />
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {answered} answered
        </Typography>
      </Stack>
      <Stack direction="row" spacing={0.75} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.75 }}>
        {quiz.questions.map((qq, i) => {
          const done = (answers[qq._id!] ?? []).length > 0;
          return (
            <Box
              key={qq._id}
              component="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to question ${i + 1}${done ? ', answered' : ''}`}
              sx={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                border: '2px solid',
                borderColor: i === index ? 'secondary.main' : done ? 'primary.main' : '#D5D7E5',
                bgcolor: done ? 'primary.main' : '#fff',
                color: done ? '#fff' : 'text.primary',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                p: 0,
              }}
            >
              {i + 1}
            </Box>
          );
        })}
      </Stack>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 4, mb: 2 }}>
        <Typography variant="h5" sx={{ mb: 0.5, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
          {x.text}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {multiple ? 'Choose all the answers that are correct' : 'Choose one answer'} · {x.points} point{x.points === 1 ? '' : 's'}
        </Typography>
        <Stack spacing={1.25}>
          {x.options.map((o, oi) => {
            const on = sel.includes(oi);
            return (
              <Paper
                key={oi}
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  borderWidth: 2,
                  borderColor: on ? 'primary.main' : '#E4E6F0',
                  bgcolor: on ? 'rgba(63,61,191,0.06)' : '#fff',
                  transition: 'all .15s',
                  '&:hover': { borderColor: 'primary.light' },
                }}
              >
                <FormControlLabel
                  sx={{ m: 0, width: '100%', px: 1.5, py: 0.75 }}
                  control={multiple ? <Checkbox checked={on} onChange={() => toggle(oi)} /> : <Radio checked={on} onChange={() => toggle(oi)} name={`q-${qid}`} />}
                  label={<Typography sx={{ fontWeight: on ? 600 : 400 }}>{o}</Typography>}
                />
              </Paper>
            );
          })}
        </Stack>
      </Paper>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => submit()}>Retry</Button>}>
          {error}
        </Alert>
      )}
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Button startIcon={<ArrowBack />} disabled={index === 0} onClick={() => setIndex(index - 1)}>
          Back
        </Button>
        {index < total - 1 ? (
          <Button variant="contained" endIcon={<ArrowForward />} onClick={() => setIndex(index + 1)}>
            Next
          </Button>
        ) : (
          <Button variant="contained" color="secondary" onClick={() => setConfirm(true)} disabled={busy}>
            Finish quiz
          </Button>
        )}
      </Stack>
      {index < total - 1 && (
        <Box sx={{ textAlign: 'right', mt: 1 }}>
          <Button size="small" onClick={() => setConfirm(true)} disabled={busy}>
            Finish early
          </Button>
        </Box>
      )}
      <Dialog open={confirm} onClose={() => !busy && setConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Hand in your answers?</DialogTitle>
        <DialogContent>
          {answered < total ? (
            <Alert severity="warning">
              You have not answered {total - answered} question{total - answered === 1 ? '' : 's'} yet. Unanswered questions get no points.
            </Alert>
          ) : (
            <Typography>You answered every question. Ready to see your score?</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(false)} disabled={busy}>
            Keep working
          </Button>
          <Button variant="contained" color="secondary" onClick={() => submit()} disabled={busy}>
            {busy ? 'Handing in…' : 'Hand in'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={leave} onClose={() => setLeave(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Leave this quiz?</DialogTitle>
        <DialogContent>
          <Typography>Your answers will not be saved and this attempt will not count.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeave(false)}>Stay</Button>
          <Button
            color="error"
            onClick={() => {
              submitted.current = true;
              onCancel();
            }}
          >
            Leave
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function Results({ quiz, result, onAgain, onBack }: { quiz: Quiz; result: AttemptResult; onAgain: () => void; onBack: () => void }) {
  const navigate = useNavigate();
  const great = result.percent >= 75;
  const right = result.review.filter((r) => r.isCorrect).length;
  const open = quiz.status === 'published' && !quizClosed(quiz) && result.attemptsLeft > 0;
  return (
    <>
      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          mb: 3,
          borderRadius: 4,
          textAlign: 'center',
          color: great ? '#fff' : 'text.primary',
          background: great ? 'linear-gradient(135deg, #2E9D61 0%, #3F3DBF 100%)' : 'linear-gradient(160deg, rgba(63,61,191,0.06), rgba(242,139,48,0.10))',
          position: 'relative',
          overflow: 'hidden',
        }}
        variant={great ? 'elevation' : 'outlined'}
      >
        {great && (
          <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', '@keyframes floatUp': { from: { transform: 'translateY(40px)', opacity: 0 }, '30%': { opacity: 1 }, to: { transform: 'translateY(-220px)', opacity: 0 } } }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: `${(i * 7.3) % 100}%`,
                  width: 10,
                  height: 10,
                  borderRadius: i % 2 ? '50%' : '2px',
                  bgcolor: ['#F28B30', '#FFD166', '#fff', '#6CC99A'][i % 4],
                  animation: `floatUp ${2.4 + (i % 5) * 0.4}s ease-out ${(i % 7) * 0.25}s 2`,
                  opacity: 0,
                }}
              />
            ))}
          </Box>
        )}
        {great ? <CelebrationOutlined sx={{ fontSize: 44, mb: 1 }} /> : <EmojiEventsOutlined sx={{ fontSize: 40, mb: 1, color: 'secondary.main' }} />}
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
          {cheer(result.percent)}
        </Typography>
        <Typography sx={{ opacity: 0.9, mb: 2 }}>
          You got {right} of {result.review.length} questions right in {quiz.title}.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <ProgressRing value={result.percent} size={128} color={great ? 'inherit' : 'secondary'} light={great} label={`${result.score}/${result.maxScore} pts`} />
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'center' }}>
          {open && (
            <Button variant={great ? 'outlined' : 'contained'} color={great ? 'inherit' : 'secondary'} startIcon={<Replay />} onClick={onAgain}>
              Try again ({result.attemptsLeft} left)
            </Button>
          )}
          <Button variant={great ? 'contained' : 'outlined'} color={great ? 'inherit' : 'primary'} sx={great ? { color: 'primary.main', bgcolor: '#fff', '&:hover': { bgcolor: '#F0F1F8' } } : undefined} onClick={() => navigate(`${S}/quizzes`)}>
            Back to quizzes
          </Button>
          <Button color="inherit" onClick={onBack}>
            See all attempts
          </Button>
        </Stack>
      </Paper>
      <Section title="Check your answers">
        <Stack spacing={1.5}>
          {result.review.map((r, i) => (
            <Paper key={r.questionId} variant="outlined" sx={{ p: 2, borderLeft: 4, borderLeftColor: r.isCorrect ? 'success.main' : 'error.main' }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', mb: 1 }}>
                {r.isCorrect ? <CheckCircle color="success" /> : <HighlightOff color="error" />}
                <Typography sx={{ fontWeight: 650, flex: 1 }}>
                  {i + 1}. {r.text}
                </Typography>
                <Chip size="small" label={`${r.points} pt${r.points === 1 ? '' : 's'}`} color={r.isCorrect ? 'success' : 'default'} variant="outlined" />
              </Stack>
              <Stack spacing={0.5} sx={{ pl: 4 }}>
                {r.options.map((o, oi) => {
                  const isRight = r.correct.includes(oi);
                  const picked = r.selected.includes(oi);
                  return (
                    <Stack key={oi} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: isRight ? 'success.main' : picked ? 'error.main' : '#D5D7E5', flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontWeight: isRight || picked ? 650 : 400, color: isRight ? 'success.dark' : picked ? 'error.main' : 'text.primary' }}>
                        {o}
                      </Typography>
                      {picked && <Chip size="small" label="Your answer" variant="outlined" sx={{ height: 20 }} />}
                      {isRight && <Chip size="small" label="Correct" color="success" sx={{ height: 20 }} />}
                    </Stack>
                  );
                })}
                {r.selected.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    You did not answer this one.
                  </Typography>
                )}
              </Stack>
              {r.explanation && (
                <Alert severity="info" icon={false} sx={{ mt: 1.5 }}>
                  {r.explanation}
                </Alert>
              )}
            </Paper>
          ))}
        </Stack>
      </Section>
      <Typography variant="caption" color="text.secondary">
        Submitted {dayjs().format('D MMM YYYY, h:mm A')}
      </Typography>
    </>
  );
}
