import { Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, LinearProgress, Paper, Radio, Stack, TextField, Typography } from '@mui/material';
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
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import dayjs from 'dayjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/api/client';
import { refName, type AttemptResult, type Quiz, type QuizSummary } from '@/api/types';
import { useGet } from '@/lib/hooks';
import { useToast } from '@/components/Toast';
import { DataTable, Empty, QueryState, Section, fmtDate, fmtDateTime } from '@/components/ui';
import { BackButton, useTab } from '@/pages/teacher/common';
import { ProgressRing, S, attemptsLeft, cheer, quizClosed } from './common';
import { useLook } from '@/student/useLook';
import { tint, type Look } from '@/student/looks';
import { CardButton, EmptyPlay, Fact, PageTitle, PillTabs, PlayCard, Sticker } from '@/student/playful';

/* ------------------------------------------------------------------ List */

const TABS = ['open', 'done'] as const;

function QuizCard({ x, i, look }: { x: QuizSummary; i: number; look: Look }) {
  const closed = quizClosed(x);
  const left = attemptsLeft(x);
  const tried = (x.attemptsUsed ?? 0) > 0;
  const color = closed || left === 0 ? '#8A8FA3' : look.tiles[i % look.tiles.length];
  const best = x.bestPercent;
  const emoji = best != null && best >= 90 ? '🏆' : best != null && best >= 75 ? '🌟' : tried ? '🎯' : ['🧠', '🚀', '🧩', '💡', '🔬'][i % 5];
  return (
    <PlayCard look={look} color={color} to={`${S}/quizzes/${x._id}`} dim={closed || left === 0}>
      <Box sx={{ position: 'absolute', top: -10, right: 14 }}>
        {closed ? (
          <Sticker color="#8A8FA3">Closed</Sticker>
        ) : left === 0 ? (
          <Sticker color="#8A8FA3" tilt={-4}>
            Done
          </Sticker>
        ) : !tried ? (
          <Sticker color={look.accent}>NEW!</Sticker>
        ) : best != null && best >= 75 ? (
          <Sticker color="#23B26D" tilt={-5}>
            ⭐ Best {best}%
          </Sticker>
        ) : null}
      </Box>
      <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center' }}>
        <Box sx={{ width: 58, height: 58, borderRadius: '18px', bgcolor: tint(color, 0.16), border: `2px solid ${tint(color, 0.3)}`, display: 'grid', placeItems: 'center', fontSize: 30, transform: `rotate(${i % 2 ? 5 : -5}deg)`, flexShrink: 0 }}>
          {emoji}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 900, fontSize: 17.5, color: look.ink, lineHeight: 1.25 }}>{x.title}</Typography>
          <Typography variant="body2" sx={{ color: look.ink2, fontWeight: 600 }} noWrap>
            {refName(x.courseId) || refName(x.classId) || 'Quiz'}
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
        <Fact look={look}>❓ {x.questionCount} questions</Fact>
        <Fact look={look}>⏱️ {x.timeLimitMin ? `${x.timeLimitMin} min` : 'No time limit'}</Fact>
        <Fact look={look}>
          🎟️ {left} {left === 1 ? 'try' : 'tries'} left
        </Fact>
        {x.dueDate && (
          <Fact look={look}>
            📅 {closed ? 'Closed' : 'Closes'} {fmtDate(x.dueDate, 'D MMM')}
          </Fact>
        )}
      </Stack>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 'auto' }}>
        <CardButton color={color}>{closed || left === 0 ? 'See results' : tried ? 'Try again 🔁' : 'Play quiz ▶'}</CardButton>
        {best != null && (
          <Typography variant="body2" sx={{ fontWeight: 800, color: best >= 75 ? '#23B26D' : look.ink2 }}>
            Best: {best}%
          </Typography>
        )}
      </Stack>
    </PlayCard>
  );
}

export function StudentQuizzesPage() {
  const look = useLook();
  const q = useGet<QuizSummary[]>('/quizzes');
  const [tab, setTab] = useTab(TABS, 'open');
  return (
    <Box sx={{ maxWidth: 1180, mx: 'auto' }}>
      <PageTitle look={look} emoji="🧠" title={look.words.quizzes} subtitle="Test what you have learned. You get your score straight away!" />
      <QueryState q={q}>
        {(items) => {
          const open = items.filter((x) => !quizClosed(x) && attemptsLeft(x) > 0);
          const done = items.filter((x) => !open.includes(x));
          const rows = tab === 'open' ? open : done;
          return (
            <>
              <PillTabs
                look={look}
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: 'open', label: 'Ready to play', n: open.length, emoji: '🎮' },
                  { value: 'done', label: 'Finished or closed', n: done.length, emoji: '✅' },
                ]}
              />
              {rows.length === 0 ? (
                <EmptyPlay
                  look={look}
                  emoji={tab === 'open' ? '🎈' : '📭'}
                  title={tab === 'open' ? 'No quizzes waiting for you' : 'No finished quizzes yet'}
                  text={tab === 'open' ? 'New quizzes from your teachers and courses show up here.' : 'Quizzes you have used all your tries on show here.'}
                />
              ) : (
                <Box sx={{ display: 'grid', gap: 2.5, pt: 1, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                  {rows.map((x, i) => (
                    <QuizCard key={x._id} x={x} i={i} look={look} />
                  ))}
                </Box>
              )}
            </>
          );
        }}
      </QueryState>
    </Box>
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
          {phase === 'intro' && (
            <Intro
              quiz={quiz}
              onStart={() => {
                setRunKey((k) => k + 1);
                setPhase('taking');
              }}
            />
          )}
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
          {phase === 'result' && result && (
            <Results
              quiz={quiz}
              result={result}
              onAgain={() => {
                setRunKey((k) => k + 1);
                setPhase('taking');
              }}
              onBack={() => setPhase('intro')}
            />
          )}
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
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [hints, setHints] = useState<Record<string, boolean>>({});
  const [confirm, setConfirm] = useState(false);
  const [leave, setLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const deadline = quiz.timeLimitMin ? startedAt.getTime() + quiz.timeLimitMin * 60_000 : null;
  const [remaining, setRemaining] = useState(deadline ? Math.round((deadline - Date.now()) / 1000) : 0);
  const submitted = useRef(false);
  const answersRef = useRef(answers);
  const textsRef = useRef(texts);
  useEffect(() => {
    answersRef.current = answers;
    textsRef.current = texts;
  }, [answers, texts]);

  const submit = useCallback(
    async (auto = false) => {
      if (submitted.current) return;
      submitted.current = true;
      setBusy(true);
      setError('');
      try {
        const payload = {
          answers: quiz.questions.map((x) => (x.type === 'short' ? { questionId: x._id!, selected: [], text: (textsRef.current[x._id!] ?? '').trim() } : { questionId: x._id!, selected: answersRef.current[x._id!] ?? [] })),
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
  const isDone = (qq: Quiz['questions'][number]) => (qq.type === 'short' ? !!(texts[qq._id!] ?? '').trim() : (answers[qq._id!] ?? []).length > 0);
  const answered = quiz.questions.filter(isDone).length;
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
          <Chip icon={<TimerOutlined />} label={mmss(remaining)} color={lowTime ? 'error' : 'default'} sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 84 }} aria-label={`Time left ${mmss(remaining)}`} />
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
          const done = isDone(qq);
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
          {x.type === 'short' ? 'Type your answer' : multiple ? 'Choose all the answers that are correct' : 'Choose one answer'} · {x.points} point{x.points === 1 ? '' : 's'}
        </Typography>
        {x.mediaUrl && <Box component="img" src={x.mediaUrl} alt="" sx={{ maxWidth: '100%', maxHeight: 320, borderRadius: 3, mb: 2.5, display: 'block' }} />}
        {x.type === 'short' && (
          <TextField
            fullWidth
            autoFocus
            placeholder="Your answer"
            value={texts[qid] ?? ''}
            onChange={(e) => setTexts((t) => ({ ...t, [qid]: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && index < total - 1 && setIndex(index + 1)}
            slotProps={{ input: { sx: { fontSize: 20, fontWeight: 600, borderRadius: 3, bgcolor: '#fff' } }, htmlInput: { 'aria-label': 'Your answer', maxLength: 300 } }}
          />
        )}
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
        {x.hint && (
          <Box sx={{ mt: 2 }}>
            {hints[qid] ? (
              <Alert severity="warning" icon={<LightbulbOutlined />} sx={{ borderRadius: 3 }}>
                {x.hint}
              </Alert>
            ) : (
              <Button size="small" color="warning" startIcon={<LightbulbOutlined />} onClick={() => setHints((h) => ({ ...h, [qid]: true }))}>
                Need a hint?
              </Button>
            )}
          </Box>
        )}
      </Paper>
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" onClick={() => submit()}>
              Retry
            </Button>
          }
        >
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
        {result.passed != null && (
          <Chip
            icon={result.passed ? <CheckCircle /> : undefined}
            label={result.passed ? `Passed · pass mark ${result.passPercent}%` : `Pass mark is ${result.passPercent}% — keep going!`}
            color={result.passed ? 'success' : 'warning'}
            sx={{ mb: 2, fontWeight: 700, ...(great ? { bgcolor: '#fff', color: 'success.dark', '& .MuiChip-icon': { color: 'success.main' } } : {}) }}
          />
        )}
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
        {result.answersShown === false && (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            Your teacher will go through the right answers with you. Here you can see which ones you got right.
          </Alert>
        )}
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
                {r.mediaUrl && <Box component="img" src={r.mediaUrl} alt="" sx={{ maxWidth: 260, maxHeight: 160, borderRadius: 2, mb: 0.5 }} />}
                {r.type === 'short' && (
                  <>
                    <Typography variant="body2">
                      Your answer:{' '}
                      <Box component="b" sx={{ color: r.isCorrect ? 'success.dark' : r.typed ? 'error.main' : 'text.secondary' }}>
                        {r.typed || 'no answer'}
                      </Box>
                    </Typography>
                    {!r.isCorrect && !!r.accepted?.length && (
                      <Typography variant="body2" sx={{ color: 'success.dark' }}>
                        Right answer: <b>{r.accepted.join(' / ')}</b>
                      </Typography>
                    )}
                  </>
                )}
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
                {r.type !== 'short' && r.selected.length === 0 && (
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
