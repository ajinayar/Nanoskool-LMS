import { Alert, Box, Button, Chip, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import CheckCircle from '@mui/icons-material/CheckCircle';
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked';
import CheckBoxOutlineBlank from '@mui/icons-material/CheckBoxOutlineBlank';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { errorMessage } from '@/api/client';
import { refId, refName, type ClassCourse, type ClassSection, type Quiz, type QuizAttempt, type QuizSummary } from '@/api/types';
import { useGet, useSend } from '@/lib/hooks';
import { QuizEditor, emptyQuiz, quizPayload, validateQuiz, type QuizDraft } from '@/components/QuizEditor';
import { CardGrid, ConfirmDialog, DataTable, Empty, Loading, ErrorState, PageHeader, QueryState, Section, StatCard, StatusChip, UserCell, fmtDate, fmtDateTime } from '@/components/ui';
import { BackButton, ClassSelect, FilterBar, T, WideTable, toLocalInput, useMyClasses, SHOW_EMPTY } from './common';

const isClassQuiz = (q: QuizSummary) => !!q.classId;

function DeleteQuizDialog({ quiz, onClose, onDeleted }: { quiz: QuizSummary | null; onClose: () => void; onDeleted?: () => void }) {
  const remove = useSend('delete', (q: QuizSummary) => `/quizzes/${q._id}`, {
    success: 'Quiz deleted',
    invalidate: ['/quizzes', '/dashboard', '/reports'],
    onSuccess: () => {
      onClose();
      onDeleted?.();
    },
  });
  return (
    <ConfirmDialog
      open={!!quiz}
      title="Delete this quiz?"
      message={
        <Typography>
          <b>{quiz?.title}</b> and all student attempts and scores will be deleted. This cannot be undone.
        </Typography>
      }
      danger
      confirmLabel="Delete"
      loading={remove.isPending}
      onClose={onClose}
      onConfirm={() => quiz && remove.mutate(quiz)}
    />
  );
}

/* ------------------------------------------------------------------ List */

export function TeacherQuizzesPage() {
  const navigate = useNavigate();
  const [classId, setClassId] = useState('');
  const [kind, setKind] = useState<'' | 'class' | 'course'>('');
  const q = useGet<QuizSummary[]>('/quizzes', classId ? { classId } : undefined);
  const [del, setDel] = useState<QuizSummary | null>(null);
  return (
    <>
      <PageHeader
        title="Quizzes"
        subtitle="Course quizzes from Nanoskool and quizzes you set for your classes"
        actions={
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate(`${T}/quizzes/new${classId ? `?classId=${classId}` : ''}`)}>
            New class quiz
          </Button>
        }
      />
      <Section title="All quizzes">
        <FilterBar>
            <ClassSelect value={classId} onChange={setClassId} allowAll="All classes" sx={{ minWidth: 150 }} />
            <TextField select label="Type" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} sx={{ minWidth: 140 }} slotProps={SHOW_EMPTY}>
              <MenuItem value="">All quizzes</MenuItem>
              <MenuItem value="class">Class quizzes</MenuItem>
              <MenuItem value="course">Course quizzes</MenuItem>
            </TextField>
          </FilterBar>
        <QueryState q={q}>
          {(rows) => (
            <WideTable min={760}>
            <DataTable
              rows={rows.filter((x) => !kind || (kind === 'class') === isClassQuiz(x))}
              onRowClick={(x) => navigate(`${T}/quizzes/${x._id}`)}
              empty={<Empty title="No quizzes yet" hint="Create a class quiz to check what your students have learned." />}
              columns={[
                {
                  key: 'title',
                  label: 'Quiz',
                  render: (x) => (
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>{x.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {x.questionCount} questions · {x.totalPoints} points{x.timeLimitMin ? ` · ${x.timeLimitMin} min` : ''}
                      </Typography>
                    </Box>
                  ),
                },
                {
                  key: 'for',
                  label: 'For',
                  render: (x) =>
                    isClassQuiz(x) ? (
                      <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
                        <Chip size="small" color="primary" variant="outlined" label={refName(x.classId)} />
                        {refName(x.courseId) && (
                          <Typography variant="caption" color="text.secondary">
                            {refName(x.courseId)}
                          </Typography>
                        )}
                      </Stack>
                    ) : (
                      <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
                        <Chip size="small" label="Course quiz" />
                        <Typography variant="caption" color="text.secondary">
                          {refName(x.courseId)}
                        </Typography>
                      </Stack>
                    ),
                },
                { key: 'attempts', label: 'Attempts', render: (x) => `${x.maxAttempts ?? 1} allowed` },
                { key: 'due', label: 'Closes', render: (x) => (x.dueDate ? fmtDateTime(x.dueDate) : '—') },
                { key: 'status', label: 'Status', render: (x) => <StatusChip status={x.status} /> },
                {
                  key: 'act',
                  label: '',
                  align: 'right',
                  render: (x) =>
                    isClassQuiz(x) && (
                      <Stack direction="row" sx={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => navigate(`${T}/quizzes/${x._id}/edit`)} aria-label="Edit quiz">
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => setDel(x)} aria-label="Delete quiz">
                            <DeleteOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ),
                },
              ]}
            />
            </WideTable>
          )}
        </QueryState>
      </Section>
      <DeleteQuizDialog quiz={del} onClose={() => setDel(null)} />
    </>
  );
}

/* ----------------------------------------------------------- Create/edit */

const draftFrom = (q: Quiz): QuizDraft => ({
  title: q.title,
  description: q.description ?? '',
  chapterId: q.chapterId,
  timeLimitMin: q.timeLimitMin ?? null,
  maxAttempts: q.maxAttempts ?? 1,
  // The editor expects local "YYYY-MM-DDTHH:mm"
  dueDate: q.dueDate ? toLocalInput(q.dueDate) : null,
  status: q.status,
  questions: q.questions.map((x) => ({ ...x, correct: x.correct ?? [], explanation: x.explanation ?? '' })),
});

export function TeacherQuizEditPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const editing = !!id;
  const existing = useGet<Quiz>(editing ? `/quizzes/${id}` : null);
  const [draft, setDraft] = useState<QuizDraft>(emptyQuiz);
  const [classId, setClassId] = useState(params.get('classId') ?? '');
  const [courseId, setCourseId] = useState('');
  const [err, setErr] = useState('');
  const courses = useGet<ClassCourse[]>(classId ? '/class-courses' : null, { classId });

  useEffect(() => {
    if (existing.data) {
      setDraft(draftFrom(existing.data));
      setClassId(refId(existing.data.classId));
      setCourseId(existing.data.courseId ? refId(existing.data.courseId) : '');
    }
  }, [existing.data]);

  const save = useSend<Record<string, unknown>, Quiz>(editing ? 'patch' : 'post', editing ? `/quizzes/${id}` : '/quizzes', {
    success: editing ? 'Quiz saved' : draft.status === 'published' ? 'Quiz published' : 'Quiz saved as draft',
    invalidate: ['/quizzes', '/dashboard'],
    onSuccess: (q) => navigate(`${T}/quizzes/${q._id}`, { replace: true }),
  });

  const submit = () => {
    if (!classId) return setErr('Choose the class that will take this quiz');
    const v = validateQuiz(draft);
    if (v) return setErr(v);
    if (!draft.questions.length) return setErr('Add at least one question');
    setErr('');
    save.mutate({ ...quizPayload(draft), courseId: courseId || undefined, ...(editing ? {} : { classId }) });
  };

  if (editing && existing.isLoading) return <Loading />;
  if (editing && existing.error) return <ErrorState error={existing.error} />;
  if (editing && existing.data && !existing.data.editable) return <Alert severity="info">This is a Nanoskool course quiz, so it cannot be edited here.</Alert>;

  return (
    <Box sx={{ maxWidth: 960 }}>
      <BackButton to={editing ? `${T}/quizzes/${id}` : `${T}/quizzes`}>{editing ? 'Back to quiz' : 'Quizzes'}</BackButton>
      <PageHeader title={editing ? 'Edit quiz' : 'New class quiz'} subtitle="Students see one question at a time and get their score straight away" />
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          {editing ? (
            <TextField label="Class" value={refName(existing.data?.classId)} disabled helperText="The class cannot be changed" />
          ) : (
            <ClassSelect
              value={classId}
              onChange={(v) => {
                setClassId(v);
                setCourseId('');
              }}
              required
            />
          )}
          <TextField select label="Course (optional)" value={courses.data ? courseId : ''} onChange={(e) => setCourseId(e.target.value)} disabled={!classId} slotProps={SHOW_EMPTY}>
            <MenuItem value="">Not linked to a course</MenuItem>
            {(courses.data ?? []).map((cc) => (
              <MenuItem key={cc._id} value={refId(cc.courseId)}>
                {refName(cc.courseId)}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <QuizEditor value={draft} onChange={setDraft} showDueDate />
      </Paper>
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      {save.error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(save.error)}
        </Alert>
      ) : null}
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', position: 'sticky', bottom: 0, py: 1.5, bgcolor: 'background.default' }}>
        <Button onClick={() => navigate(-1)}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : draft.status === 'published' ? (editing ? 'Save and keep published' : 'Publish quiz') : 'Save draft'}
        </Button>
      </Stack>
    </Box>
  );
}

/* ---------------------------------------------------------------- Detail */

export function QuizQuestions({ quiz }: { quiz: Quiz }) {
  const hidden = quiz.questions.some((x) => !x.correct);
  return (
    <Stack spacing={1.5}>
      {hidden && <Alert severity="info">Correct answers for Nanoskool course quizzes are hidden so students cannot see them.</Alert>}
      {quiz.questions.length === 0 && <Empty title="No questions yet" />}
      {quiz.questions.map((x, i) => (
        <Paper key={x._id ?? i} variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1, justifyContent: 'space-between' }}>
            <Typography sx={{ fontWeight: 650 }}>
              {i + 1}. {x.text}
            </Typography>
            <Chip size="small" variant="outlined" label={`${x.points} pt${x.points === 1 ? '' : 's'}`} />
          </Stack>
          <Stack spacing={0.5}>
            {x.options.map((o, oi) => {
              const right = x.correct?.includes(oi);
              const Icon = right ? CheckCircle : x.type === 'multiple' ? CheckBoxOutlineBlank : RadioButtonUnchecked;
              return (
                <Stack key={oi} direction="row" spacing={1} sx={{ alignItems: 'center', color: right ? 'success.main' : 'text.primary' }}>
                  <Icon fontSize="small" color={right ? 'success' : 'disabled'} />
                  <Typography variant="body2" sx={{ fontWeight: right ? 650 : 400 }}>
                    {o}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
          {x.explanation && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Explanation: {x.explanation}
            </Typography>
          )}
        </Paper>
      ))}
    </Stack>
  );
}

function QuizResults({ quiz }: { quiz: Quiz }) {
  const classes = useMyClasses();
  const fixedClass = quiz.classId ? refId(quiz.classId) : '';
  const [classId, setClassId] = useState(fixedClass);
  const attempts = useGet<(QuizAttempt & { studentId: { _id: string; name: string; rollNo?: string } })[]>(`/quizzes/${quiz._id}/attempts`, classId ? { classId } : undefined);
  const cls = useGet<ClassSection>(classId ? `/classes/${classId}` : null);
  const rows = attempts.data ?? [];
  const avg = rows.length ? Math.round(rows.reduce((s, a) => s + a.percent, 0) / rows.length) : null;
  const studentsTried = new Set(rows.map((a) => refId(a.studentId)));
  const best = new Map<string, number>();
  for (const a of rows) best.set(refId(a.studentId), Math.max(best.get(refId(a.studentId)) ?? 0, a.percent));
  const bestAvg = best.size ? Math.round([...best.values()].reduce((s, v) => s + v, 0) / best.size) : null;
  const notYet = (cls.data?.students ?? []).filter((s) => !studentsTried.has(s._id));
  return (
    <Section
      title="Results"
      action={
        !fixedClass && (
          <TextField select label="Class" value={classes.data ? classId : ''} onChange={(e) => setClassId(e.target.value)} sx={{ width: 190 }} slotProps={SHOW_EMPTY}>
            <MenuItem value="">All my classes</MenuItem>
            {(classes.data ?? []).map((c) => (
              <MenuItem key={c._id} value={c._id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
        )
      }
    >
      {attempts.isLoading ? (
        <Loading />
      ) : attempts.error ? (
        <ErrorState error={attempts.error} />
      ) : (
        <>
          <CardGrid min={200}>
            <StatCard label="Attempts" value={rows.length} />
            <StatCard label="Students attempted" value={cls.data ? `${studentsTried.size}/${cls.data.students?.length ?? 0}` : studentsTried.size} />
            <StatCard label="Class average" value={avg == null ? '—' : `${avg}%`} hint="all attempts" />
            <StatCard label="Average best score" value={bestAvg == null ? '—' : `${bestAvg}%`} hint="best attempt per student" />
          </CardGrid>
          <Box sx={{ mt: 2 }} />
          <DataTable
            rows={rows}
            empty={<Empty title="No attempts yet" hint={quiz.status === 'draft' ? 'Publish the quiz so students can take it.' : 'Results appear here as students finish.'} />}
            columns={[
              { key: 'student', label: 'Student', render: (a) => <UserCell name={refName(a.studentId) || 'Student'} sub={a.studentId.rollNo ? `Roll no. ${a.studentId.rollNo}` : undefined} /> },
              ...(!fixedClass && !classId ? [{ key: 'class', label: 'Class', render: (a: QuizAttempt) => refName(a.classId) || '—' }] : []),
              { key: 'score', label: 'Score', render: (a) => `${a.score}/${a.maxScore}` },
              { key: 'pct', label: '%', render: (a) => <Chip size="small" label={`${a.percent}%`} color={a.percent >= 75 ? 'success' : a.percent >= 40 ? 'default' : 'warning'} /> },
              { key: 'date', label: 'Date', render: (a) => fmtDateTime(a.submittedAt) },
            ]}
          />
          {classId && notYet.length > 0 && quiz.status === 'published' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Not attempted yet ({notYet.length})
              </Typography>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                {notYet.map((s) => (
                  <Chip key={s._id} size="small" variant="outlined" label={s.name} />
                ))}
              </Stack>
            </Box>
          )}
        </>
      )}
    </Section>
  );
}

export function TeacherQuizDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const q = useGet<Quiz>(`/quizzes/${id}`);
  const [del, setDel] = useState<Quiz | null>(null);
  const publish = useSend('patch', `/quizzes/${id}`, { success: 'Quiz published', invalidate: ['/quizzes', '/dashboard'] });
  return (
    <QueryState q={q}>
      {(quiz) => (
        <>
          <BackButton to={`${T}/quizzes`}>Quizzes</BackButton>
          <PageHeader
            title={quiz.title}
            subtitle={[
              quiz.classId ? refName(quiz.classId) : 'Course quiz',
              refName(quiz.courseId),
              `${quiz.questions.length} questions`,
              quiz.timeLimitMin ? `${quiz.timeLimitMin} min` : 'No time limit',
              `${quiz.maxAttempts ?? 1} attempt${(quiz.maxAttempts ?? 1) > 1 ? 's' : ''}`,
              quiz.dueDate ? `closes ${fmtDate(quiz.dueDate, 'D MMM, h:mm A')}` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
            actions={
              quiz.editable && (
                <>
                  {quiz.status === 'draft' && (
                    <Button variant="contained" onClick={() => publish.mutate({ status: 'published' })} disabled={publish.isPending || !quiz.questions.length}>
                      Publish
                    </Button>
                  )}
                  <Button variant="outlined" startIcon={<EditOutlined />} onClick={() => navigate(`${T}/quizzes/${quiz._id}/edit`)}>
                    Edit
                  </Button>
                  <Button color="error" startIcon={<DeleteOutlined />} onClick={() => setDel(quiz)}>
                    Delete
                  </Button>
                </>
              )
            }
          />
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <StatusChip status={quiz.status} label={quiz.status === 'draft' ? 'Draft: students cannot see it' : 'Published'} />
          </Stack>
          {quiz.description && <Typography sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>{quiz.description}</Typography>}
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, alignItems: 'start' }}>
            <Box sx={{ minWidth: 0 }}>
              <QuizResults quiz={quiz} />
            </Box>
            <Section title="Questions and answers">
              <QuizQuestions quiz={quiz} />
            </Section>
          </Box>
          <DeleteQuizDialog quiz={del} onClose={() => setDel(null)} onDeleted={() => navigate(`${T}/quizzes`, { replace: true })} />
        </>
      )}
    </QueryState>
  );
}
