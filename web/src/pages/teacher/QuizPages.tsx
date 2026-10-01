import { Alert, Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import LibraryBooksOutlined from '@mui/icons-material/LibraryBooksOutlined';
import LockClockOutlined from '@mui/icons-material/LockClockOutlined';
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import dayjs from 'dayjs';
import { IconTile, MiniStat, MiniStats, RowMenu, Segmented, StatusDot, Toolbar, WhenCell } from '@/components/ListKit';
import Add from '@mui/icons-material/Add';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { errorMessage } from '@/api/client';
import { refId, refName, type ClassCourse, type ClassSection, type Quiz, type QuizAttempt, type QuizSummary } from '@/api/types';
import { useGet, useSend } from '@/lib/hooks';
import { QuestionReadout, QuizStudio, emptyQuiz, quizPayload, quizToDraft, validateQuiz, type QuizDraft } from '@/components/QuizEditor';
import { CardGrid, ConfirmDialog, DataTable, Empty, Loading, ErrorState, PageHeader, QueryState, Section, StatCard, StatusChip, UserCell, fmtDate, fmtDateTime } from '@/components/ui';
import { BackButton, ClassSelect, T, WideTable, toLocalInput, useMyClasses, SHOW_EMPTY } from './common';

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
  const [kind, setKind] = useState<'' | 'class' | 'course' | 'draft'>('');
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
      <QueryState q={q}>
        {(rows) => {
          const now = dayjs();
          const cls = rows.filter(isClassQuiz);
          const open = rows.filter((x) => x.status === 'published' && (!x.dueDate || dayjs(x.dueDate).isAfter(now)));
          const closing = open.filter((x) => x.dueDate && dayjs(x.dueDate).diff(now, 'day') < 7).length;
          const drafts = rows.filter((x) => x.status === 'draft').length;
          const shown = rows.filter((x) => (kind === 'draft' ? x.status === 'draft' : !kind || (kind === 'class') === isClassQuiz(x)));
          return (
            <>
              <MiniStats>
                <MiniStat tone="indigo" icon={<QuizOutlined />} value={cls.length} label="My class quizzes" active={kind === 'class'} onClick={() => setKind(kind === 'class' ? '' : 'class')} />
                <MiniStat tone="teal" icon={<LibraryBooksOutlined />} value={rows.length - cls.length} label="Course quizzes" hint="From Nanoskool courses" active={kind === 'course'} onClick={() => setKind(kind === 'course' ? '' : 'course')} />
                <MiniStat tone="orange" icon={<LockClockOutlined />} value={closing} label="Closing this week" />
                <MiniStat tone="grey" icon={<EditNoteOutlined />} value={drafts} label="Drafts" active={kind === 'draft'} onClick={() => setKind(kind === 'draft' ? '' : 'draft')} />
              </MiniStats>
              <Card>
                <CardContent>
                  <Toolbar right={`${shown.length} of ${rows.length} shown`}>
                    <ClassSelect value={classId} onChange={setClassId} allowAll="All classes" />
                    <Segmented
                      label="Quiz type"
                      value={kind}
                      onChange={setKind}
                      options={[
                        { value: '', label: 'All', count: rows.length },
                        { value: 'class', label: 'Class quizzes', count: cls.length },
                        { value: 'course', label: 'Course quizzes', count: rows.length - cls.length },
                        ...(drafts ? [{ value: 'draft' as const, label: 'Drafts', count: drafts }] : []),
                      ]}
                    />
                  </Toolbar>
                  <WideTable min={800}>
                    <DataTable
                      rows={shown}
                      onRowClick={(x) => navigate(`${T}/quizzes/${x._id}`)}
                      empty={<Empty title="No quizzes here" hint="Create a class quiz to check what your students have learned." />}
                      columns={[
                        {
                          key: 'title',
                          label: 'Quiz',
                          render: (x) => (
                            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
                              <IconTile tone={isClassQuiz(x) ? 'indigo' : 'teal'}>{isClassQuiz(x) ? <QuizOutlined /> : <LibraryBooksOutlined />}</IconTile>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 700 }}>{x.title}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {x.questionCount} questions · {x.totalPoints} points{x.timeLimitMin ? ` · ${x.timeLimitMin} min` : ' · no time limit'}
                                </Typography>
                              </Box>
                            </Stack>
                          ),
                        },
                        {
                          key: 'for',
                          label: 'For',
                          render: (x) =>
                            isClassQuiz(x) ? (
                              <Box>
                                <Chip size="small" variant="outlined" label={refName(x.classId)} sx={{ fontWeight: 650 }} />
                                {refName(x.courseId) && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    {refName(x.courseId)}
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                                  {refName(x.courseId)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Course quiz · all your classes on this course
                                </Typography>
                              </Box>
                            ),
                        },
                        {
                          key: 'attempts',
                          label: 'Tries',
                          render: (x) => (
                            <Typography variant="body2" sx={{ fontWeight: 650 }}>
                              {(x.maxAttempts ?? 1) === 1 ? '1 try' : `${x.maxAttempts} tries`}
                            </Typography>
                          ),
                        },
                        { key: 'due', label: 'Closes', render: (x) => <WhenCell date={x.dueDate} empty="Always open" pastWord="Closed" /> },
                        { key: 'status', label: 'Status', render: (x) => <StatusDot status={x.status} /> },
                        {
                          key: 'act',
                          label: '',
                          align: 'right',
                          render: (x) => (
                            <RowMenu
                              label={`Actions for ${x.title}`}
                              actions={[
                                { label: 'See results', icon: <InsightsOutlined />, onClick: () => navigate(`${T}/quizzes/${x._id}`) },
                                ...(isClassQuiz(x)
                                  ? [
                                      { label: 'Edit', icon: <EditOutlined />, onClick: () => navigate(`${T}/quizzes/${x._id}/edit`) },
                                      { label: 'Delete', icon: <DeleteOutlined />, onClick: () => setDel(x), danger: true },
                                    ]
                                  : []),
                              ]}
                            />
                          ),
                        },
                      ]}
                    />
                  </WideTable>
                </CardContent>
              </Card>
            </>
          );
        }}
      </QueryState>
      <DeleteQuizDialog quiz={del} onClose={() => setDel(null)} />
    </>
  );
}

/* ----------------------------------------------------------- Create/edit */

const draftFrom = (q: Quiz): QuizDraft => quizToDraft(q, toLocalInput);

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

  const back = () => navigate(editing ? `${T}/quizzes/${id}` : `${T}/quizzes`);
  return (
    <QuizStudio
      heading={editing ? `Edit quiz · ${refName(existing.data?.classId)}` : 'New class quiz'}
      draft={draft}
      onChange={setDraft}
      showDueDate
      courseId={courseId || undefined}
      onClose={back}
      onSave={submit}
      saving={save.isPending}
      saveLabel={draft.status === 'published' ? (editing ? 'Save' : 'Publish') : 'Save draft'}
      error={err || (save.error ? errorMessage(save.error) : null)}
      extraSettings={
        <>
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
          <TextField
            select
            label="Course (optional)"
            value={courses.data ? courseId : ''}
            onChange={(e) => setCourseId(e.target.value)}
            disabled={!classId}
            slotProps={SHOW_EMPTY}
            helperText={courseId ? 'AI can write questions from this course’s lessons' : undefined}
          >
            <MenuItem value="">Not linked to a course</MenuItem>
            {(courses.data ?? []).map((cc) => (
              <MenuItem key={cc._id} value={refId(cc.courseId)}>
                {refName(cc.courseId)}
              </MenuItem>
            ))}
          </TextField>
        </>
      }
    />
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
        <QuestionReadout key={x._id ?? i} q={x} index={i} />
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
