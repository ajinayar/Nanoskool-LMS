/**
 * Content quizzes: the super admin's builder dialog, an attempts table, and the
 * read-only quiz page used by the admin, partner and school portals.
 */
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircle';
import EditOutlined from '@mui/icons-material/EditOutlined';
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { errorMessage } from '@/api/client';
import { refId, refName, type Quiz, type QuizAttempt } from '@/api/types';
import { useMe } from '@/auth/AuthContext';
import { useGet, useSend } from '@/lib/hooks';
import { useBase } from '@/pages/shared/CommonPages';
import { QuizEditor, emptyQuiz, quizPayload, validateQuiz, type QuizDraft } from './QuizEditor';
import { useToast } from './Toast';
import { CardGrid, DataTable, Empty, Loading, PageHeader, QueryState, RichText, Section, StatCard, StatusChip, fmtDateTime, pct } from './ui';
import { BackLink, FormError } from './AdminCommon';

export const quizToDraft = (q: Quiz): QuizDraft => ({
  title: q.title,
  description: q.description ?? '',
  chapterId: q.chapterId ?? undefined,
  timeLimitMin: q.timeLimitMin ?? null,
  maxAttempts: q.maxAttempts ?? 1,
  dueDate: q.dueDate ?? null,
  status: q.status,
  questions: q.questions.map((x) => ({ ...x, correct: x.correct ?? [0], explanation: x.explanation ?? '' })),
});

/** Create (no quizId) or edit a content quiz for a course. */
export function QuizEditDialog({ courseId, quizId, chapters, onClose }: { courseId: string; quizId?: string; chapters: { _id: string; title: string }[]; onClose: () => void }) {
  const theme = useTheme();
  const small = useMediaQuery(theme.breakpoints.down('sm'));
  const toast = useToast();
  const existing = useGet<Quiz>(quizId ? `/quizzes/${quizId}` : null);
  const [draft, setDraft] = useState<QuizDraft | null>(quizId ? null : emptyQuiz());
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (quizId && existing.data) setDraft((d) => d ?? quizToDraft(existing.data!));
  }, [quizId, existing.data]);
  const save = useSend<Record<string, unknown>>(quizId ? 'patch' : 'post', quizId ? `/quizzes/${quizId}` : '/quizzes', {
    invalidate: ['/quizzes', `/courses/${courseId}`],
    onSuccess: () => {
      toast.success(quizId ? 'Quiz saved' : 'Quiz created');
      onClose();
    },
  });
  const submit = () => {
    if (!draft) return;
    const v = validateQuiz(draft);
    setErr(v);
    if (v) return;
    save.mutate({ ...quizPayload(draft), ...(quizId ? {} : { courseId }) });
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" fullScreen={small} scroll="paper">
      <DialogTitle>{quizId ? 'Edit quiz' : 'New quiz'}</DialogTitle>
      <DialogContent dividers>
        {existing.error ? <Alert severity="error">{errorMessage(existing.error)}</Alert> : !draft ? <Loading /> : <QuizEditor value={draft} onChange={setDraft} chapters={chapters} />}
      </DialogContent>
      {(!!err || !!save.error) && (
        <Box sx={{ px: 3, pt: 1.5 }}>
          <FormError message={err} error={save.error} />
        </Box>
      )}
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={save.isPending || !draft}>
          {save.isPending ? 'Saving…' : quizId ? 'Save quiz' : 'Create quiz'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type PopAttempt = QuizAttempt & { studentId: { _id: string; name: string; rollNo?: string } | string; classId?: { _id: string; name: string } | string };

export function AttemptsTable({ quizId }: { quizId: string }) {
  const q = useGet<PopAttempt[]>(`/quizzes/${quizId}/attempts`);
  return (
    <QueryState q={q}>
      {(rows) => (
        <DataTable
          rows={rows}
          empty={<Empty title="No attempts yet" hint="Results appear here once students submit the quiz." />}
          columns={[
            { key: 'student', label: 'Student', render: (a) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{refName(a.studentId) || 'Student'}</Typography> },
            { key: 'class', label: 'Class', render: (a) => refName(a.classId) || '—' },
            { key: 'score', label: 'Score', align: 'right', render: (a) => `${a.score}/${a.maxScore}` },
            { key: 'pct', label: '%', align: 'right', render: (a) => <Chip size="small" label={`${a.percent}%`} color={a.percent >= 75 ? 'success' : a.percent >= 40 ? 'default' : 'warning'} /> },
            { key: 'at', label: 'Submitted', render: (a) => fmtDateTime(a.submittedAt) },
          ]}
        />
      )}
    </QueryState>
  );
}

export function AttemptsDialog({ quizId, title, onClose }: { quizId: string; title: string; onClose: () => void }) {
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Attempts · {title}</DialogTitle>
      <DialogContent dividers>
        <AttemptsTable quizId={quizId} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

/** quizzes/:id — questions and results. Super admins can edit content quizzes here. */
export function QuizDetailPage() {
  const { id } = useParams();
  const me = useMe();
  const base = useBase();
  const q = useGet<Quiz>(`/quizzes/${id}`);
  const attempts = useGet<PopAttempt[]>(`/quizzes/${id}/attempts`);
  const [editing, setEditing] = useState(false);
  const courseId = q.data ? refId(q.data.courseId) : '';
  const course = useGet<{ chapters: { _id: string; title: string }[] }>(editing && courseId ? `/courses/${courseId}` : null);
  return (
    <QueryState q={q}>
      {(quiz) => {
        const showAnswers = quiz.questions.some((x) => x.correct?.length);
        const rows = attempts.data ?? [];
        const avg = rows.length ? Math.round(rows.reduce((s, a) => s + a.percent, 0) / rows.length) : null;
        const totalPoints = quiz.questions.reduce((s, x) => s + (x.points ?? 1), 0);
        return (
          <>
            {courseId && <BackLink to={me.role === 'super_admin' ? `${base}/courses/${courseId}/edit?tab=quizzes` : `${base}/courses/${courseId}`} label={refName(quiz.courseId) || 'Back to course'} />}
            <PageHeader
              title={quiz.title}
              subtitle={[refName(quiz.courseId), refName(quiz.classId)].filter(Boolean).join(' · ') || 'Quiz'}
              actions={
                <>
                  <StatusChip status={quiz.status} />
                  {me.role === 'super_admin' && quiz.editable && (
                    <Button variant="contained" startIcon={<EditOutlined />} onClick={() => setEditing(true)}>
                      Edit quiz
                    </Button>
                  )}
                  {courseId && me.role !== 'super_admin' && (
                    <Button component={RouterLink} to={`${base}/courses/${courseId}`}>
                      Open course
                    </Button>
                  )}
                </>
              }
            />
            <CardGrid min={180}>
              <StatCard label="Questions" value={quiz.questions.length} hint={`${totalPoints} points`} />
              <StatCard label="Time limit" value={quiz.timeLimitMin ? `${quiz.timeLimitMin} min` : 'None'} />
              <StatCard label="Attempts allowed" value={quiz.maxAttempts ?? 1} />
              <StatCard label="Average score" value={pct(avg)} hint={`${rows.length} attempts`} />
            </CardGrid>
            <Box sx={{ mt: 3 }} />
            {quiz.description && (
              <Section title="Instructions">
                <RichText html={quiz.description} />
              </Section>
            )}
            <Section title="Questions">
              {!showAnswers && quiz.questions.length > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Correct answers are visible to Nanoskool authors and class teachers only.
                </Alert>
              )}
              {quiz.questions.length === 0 ? (
                <Empty title="No questions yet" />
              ) : (
                <Stack spacing={1.5}>
                  {quiz.questions.map((x, i) => (
                    <Paper key={x._id ?? i} variant="outlined" sx={{ p: 2 }}>
                      <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'baseline' }}>
                        <Typography sx={{ fontWeight: 700 }}>Q{i + 1}.</Typography>
                        <Typography sx={{ flex: 1, fontWeight: 550 }}>{x.text}</Typography>
                        <Chip size="small" variant="outlined" label={`${x.points ?? 1} pt${(x.points ?? 1) === 1 ? '' : 's'}`} />
                      </Stack>
                      <Stack spacing={0.5} sx={{ pl: 3.5 }}>
                        {x.options.map((o, oi) => {
                          const right = x.correct?.includes(oi);
                          return (
                            <Stack key={oi} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                              {right ? <CheckCircle fontSize="small" color="success" /> : <RadioButtonUnchecked fontSize="small" color="disabled" />}
                              <Typography variant="body2" sx={{ fontWeight: right ? 650 : 400 }}>
                                {o}
                              </Typography>
                            </Stack>
                          );
                        })}
                      </Stack>
                      {x.explanation && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, pl: 3.5 }}>
                          {x.explanation}
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Stack>
              )}
            </Section>
            <Section title="Results">
              <AttemptsTable quizId={quiz._id} />
            </Section>
            {editing && courseId && (course.data || course.error) && <QuizEditDialog courseId={courseId} quizId={quiz._id} chapters={course.data?.chapters ?? []} onClose={() => setEditing(false)} />}
          </>
        );
      }}
    </QueryState>
  );
}

