import { Alert, Avatar, Box, Button, Card, CardContent, Chip, Divider, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import ChevronRight from '@mui/icons-material/ChevronRight';
import ArrowBack from '@mui/icons-material/ArrowBack';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import { Link as RouterLink, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { refId, refName, type Assignment, type Quiz, type QuizAttempt, type Remark, type StudentReport } from '@/api/types';
import { useMe } from '@/auth/AuthContext';
import { useGet } from '@/lib/hooks';
import { ReportCardView } from '@/components/ReportCard';
import { CardGrid, DataTable, DueDate, Empty, Loading, ErrorState, PageHeader, Progress, QueryState, Section, StatusChip, fmtDate, fmtDateTime } from '@/components/ui';
import { AnnouncementsWidget, EventsWidget } from '@/pages/shared/CommonPages';
import { RemarkChip } from '@/pages/teacher/RemarkPages';
import { BackButton, KIND_LABEL, UrlTabs, WideTable, useTab } from '@/pages/teacher/common';
import { isLate } from '@/pages/teacher/AssignmentPages';
import { AttendanceHistoryView, type AttendanceHistory } from '@/pages/student/StudentProgress';
import { ParentJourneyTab, PortfolioSection } from '@/pages/shared/JourneyPages';
import { ParentKnowYourself } from '@/components/PsychometricViews';
import { ParentThinking } from '@/components/CognitiveViews';
import { assignmentState } from '@/pages/student/common';

const P = '/parent';

interface ParentDash {
  children: StudentReport[];
}

const useParentDash = () => useGet<ParentDash>('/dashboard');

function Metric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: ReactNode; tone?: 'good' | 'warn' | 'bad' }) {
  const color = tone === 'good' ? 'success.main' : tone === 'warn' ? 'warning.main' : tone === 'bad' ? 'error.main' : 'text.primary';
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
          {label}
        </Typography>
        <Typography sx={{ fontWeight: 700, color }}>{value}</Typography>
      </Box>
    </Stack>
  );
}

const toneFor = (v: number | null | undefined, good: number, warn: number) => (v == null ? undefined : v >= good ? 'good' : v >= warn ? 'warn' : 'bad');

export function ChildSummaryCard({ r }: { r: StudentReport }) {
  const pending = r.assignments.pending.length;
  const overdue = r.assignments.overdue.length;
  const latest = r.remarks[0];
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
          <Avatar src={r.student.avatarUrl} sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 22 }}>
            {r.student.name[0]}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6">{r.student.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {r.student.class?.name ?? 'No class'}
              {r.student.rollNo ? ` · Roll no. ${r.student.rollNo}` : ''}
            </Typography>
          </Box>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Overall course progress
        </Typography>
        <Progress value={r.overallProgress} />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
          <Metric icon={<EventAvailableOutlined fontSize="small" />} label="Attendance" value={r.attendance.percent == null ? '—' : `${r.attendance.percent}%`} tone={toneFor(r.attendance.percent, 90, 75)} />
          <Metric icon={<QuizOutlined fontSize="small" />} label="Quiz average" value={r.quizzes.averagePercent == null ? '—' : `${r.quizzes.averagePercent}%`} tone={toneFor(r.quizzes.averagePercent, 75, 40)} />
          <Metric icon={<AssignmentOutlined fontSize="small" />} label="Assignments pending" value={pending} />
          <Metric icon={<AssignmentOutlined fontSize="small" />} label="Overdue" value={overdue} tone={overdue ? 'bad' : 'good'} />
        </Box>
        <Divider sx={{ my: 2 }} />
        {latest ? (
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Latest remark
              </Typography>
              <RemarkChip category={latest.category} />
            </Stack>
            <Typography variant="body2">{latest.text}</Typography>
            <Typography variant="caption" color="text.secondary">
              {refName(latest.teacherId)} · {fmtDate(latest.createdAt)}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No teacher remarks yet.
          </Typography>
        )}
      </CardContent>
      <Box sx={{ p: 2, pt: 0 }}>
        <Button fullWidth variant="contained" endIcon={<ChevronRight />} component={RouterLink} to={`${P}/children/${r.student._id}`}>
          View full report
        </Button>
      </Box>
    </Card>
  );
}

export function ParentHome() {
  const me = useMe();
  const q = useParentDash();
  return (
    <>
      <PageHeader title={`Welcome, ${me.name.split(' ')[0]}`} subtitle={`${me.school?.name ?? ''} · How your ${me.children.length === 1 ? 'child is' : 'children are'} doing`} />
      <QueryState q={q}>
        {(d) =>
          d.children.length === 0 ? (
            <Empty title="No children linked to your account" hint="Ask the school office to link your child to this account." />
          ) : (
            <CardGrid min={320}>
              {d.children.map((r) => (
                <ChildSummaryCard key={r.student._id} r={r} />
              ))}
            </CardGrid>
          )
        }
      </QueryState>
      <Box sx={{ mt: 3, display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, alignItems: 'start' }}>
        <EventsWidget />
        <AnnouncementsWidget />
      </Box>
    </>
  );
}

/** "My children": one child goes straight to their page, several get a chooser. */
export function ParentChildrenPage() {
  const me = useMe();
  const q = useParentDash();
  if (me.children.length === 1) return <Navigate to={`${P}/children/${me.children[0]._id}`} replace />;
  return (
    <>
      <PageHeader title="My children" subtitle="Choose a child to see their full report" />
      <QueryState q={q}>
        {(d) =>
          d.children.length === 0 ? (
            <Empty title="No children linked to your account" hint="Ask the school office to link your child to this account." />
          ) : (
            <CardGrid min={320}>
              {d.children.map((r) => (
                <ChildSummaryCard key={r.student._id} r={r} />
              ))}
            </CardGrid>
          )
        }
      </QueryState>
    </>
  );
}

const TABS = ['overview', 'journey', 'portfolio', 'profile', 'thinking', 'assignments', 'attendance', 'remarks'] as const;

export function ParentChildPage() {
  const { id } = useParams();
  const me = useMe();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [tab, setTab] = useTab(TABS, 'overview');
  const child = me.children.find((c) => c._id === id);
  const report = useGet<StudentReport>(child ? `/reports/students/${id}` : null);
  if (!child) return <Alert severity="warning">This child is not linked to your account.</Alert>;
  const classId = child.classId && typeof child.classId === 'object' ? child.classId._id : refId(child.classId);
  return (
    <>
      {me.children.length > 1 && <BackButton to={`${P}/children`}>My children</BackButton>}
      <PageHeader
        title={child.name}
        subtitle={[child.classId && typeof child.classId === 'object' ? child.classId.name : '', child.rollNo ? `Roll no. ${child.rollNo}` : ''].filter(Boolean).join(' · ')}
        actions={
          me.children.length > 1 ? (
            <ToggleButtonGroup size="small" exclusive value={id} onChange={(_, v) => v && navigate(`${P}/children/${v}?${params.toString()}`)} aria-label="Switch child">
              {me.children.map((c) => (
                <ToggleButton key={c._id} value={c._id} sx={{ px: 2 }}>
                  <Avatar src={c.avatarUrl} sx={{ width: 22, height: 22, fontSize: 12, mr: 1, bgcolor: 'primary.light' }}>
                    {c.name[0]}
                  </Avatar>
                  {c.name.split(' ')[0]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          ) : undefined
        }
      />
      <UrlTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'journey', label: 'Guidance' },
          { value: 'portfolio', label: 'Portfolio' },
          { value: 'profile', label: 'Know Yourself' },
          { value: 'thinking', label: 'Thinking Puzzles' },
          { value: 'assignments', label: 'Assignments' },
          { value: 'attendance', label: 'Attendance' },
          { value: 'remarks', label: 'Remarks' },
        ]}
      />
      {tab === 'overview' && (report.isLoading ? <Loading /> : report.error ? <ErrorState error={report.error} /> : report.data ? <ReportCardView report={report.data} compact courseLink={(cid) => `${P}/courses/${cid}?studentId=${id}`} /> : null)}
      {tab === 'assignments' && <ChildAssignments studentId={id!} classId={classId} />}
      {tab === 'attendance' && <ChildAttendance studentId={id!} />}
      {tab === 'remarks' && <ChildRemarks studentId={id!} />}
      {tab === 'journey' && <ParentJourneyTab studentId={id!} />}
      {tab === 'portfolio' && <PortfolioSection studentId={id!} />}
      {tab === 'profile' && <ParentKnowYourself studentId={id!} />}
      {tab === 'thinking' && <ParentThinking studentId={id!} childName={child.name} />}
    </>
  );
}

function ChildAssignments({ studentId, classId }: { studentId: string; classId: string }) {
  const q = useGet<Assignment[]>('/assignments', { studentId });
  return (
    <Section title="Assignments">
      <QueryState q={q}>
        {(items) => {
          // The API returns assignments for all of a parent's children; keep this child's class only
          const rows = items.filter((a) => refId(a.classId) === classId);
          return (
            <WideTable min={820}>
              <DataTable
                rows={rows}
                empty={<Empty title="No assignments yet" />}
                columns={[
                  {
                    key: 'title',
                    label: 'Assignment',
                    render: (a) => (
                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>{a.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {KIND_LABEL[a.kind]}
                          {refName(a.courseId) ? ` · ${refName(a.courseId)}` : ''}
                          {refName(a.createdBy) ? ` · ${refName(a.createdBy)}` : ''}
                        </Typography>
                      </Box>
                    ),
                  },
                  { key: 'class', label: 'Class', render: (a) => refName(a.classId) },
                  { key: 'due', label: 'Due', render: (a) => <DueDate date={a.dueDate} /> },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (a) => {
                      const st = assignmentState(a);
                      const label = { todo: 'Not submitted', overdue: 'Overdue', closed: 'Closed', submitted: 'Submitted', returned: 'Returned for changes', graded: 'Graded' }[st];
                      const chip = { todo: 'pending', overdue: 'overdue', closed: 'closed', submitted: 'submitted', returned: 'returned', graded: 'graded' }[st];
                      return (
                        <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
                          <StatusChip status={chip} label={label} />
                          {a.submission && (
                            <Typography variant="caption" color="text.secondary">
                              {fmtDateTime(a.submission.submittedAt)}
                              {isLate(a.submission, a.dueDate) ? ' · late' : ''}
                            </Typography>
                          )}
                        </Stack>
                      );
                    },
                  },
                  {
                    key: 'grade',
                    label: 'Grade',
                    render: (a) =>
                      a.submission?.status === 'graded' ? (
                        <Typography sx={{ fontWeight: 700 }}>
                          {a.submission.points}/{a.maxPoints}
                        </Typography>
                      ) : (
                        '—'
                      ),
                  },
                  {
                    key: 'fb',
                    label: 'Teacher feedback',
                    render: (a) =>
                      a.submission?.feedback ? (
                        <Typography variant="body2" sx={{ maxWidth: 320, whiteSpace: 'pre-wrap' }}>
                          {a.submission.feedback}
                        </Typography>
                      ) : (
                        '—'
                      ),
                  },
                ]}
              />
            </WideTable>
          );
        }}
      </QueryState>
    </Section>
  );
}

function ChildAttendance({ studentId }: { studentId: string }) {
  const q = useGet<AttendanceHistory>('/attendance', { studentId });
  return (
    <Section title="Attendance">
      <QueryState q={q}>{(d) => <AttendanceHistoryView data={d} limit={120} />}</QueryState>
    </Section>
  );
}

function ChildRemarks({ studentId }: { studentId: string }) {
  const q = useGet<Remark[]>('/remarks', { studentId });
  return (
    <Section title="Teacher remarks">
      <QueryState q={q}>
        {(items) =>
          items.length === 0 ? (
            <Empty title="No remarks yet" hint="Notes from teachers about your child will appear here." />
          ) : (
            <Stack spacing={1.5}>
              {items.map((r) => (
                <Paper key={r._id} variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                    <RemarkChip category={r.category} />
                    <Typography variant="caption" color="text.secondary">
                      {refName(r.teacherId)} · {fmtDate(r.createdAt)}
                    </Typography>
                  </Stack>
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>{r.text}</Typography>
                </Paper>
              ))}
            </Stack>
          )
        }
      </QueryState>
    </Section>
  );
}

/** Quiz linked from the shared course view: the quiz summary and each child's attempts. */
export function ParentQuizPage() {
  const { id } = useParams();
  const me = useMe();
  const [params] = useSearchParams();
  const only = params.get('studentId');
  const quiz = useGet<Quiz>(`/quizzes/${id}`);
  const attempts = useGet<(QuizAttempt & { studentId: { _id: string; name: string } })[]>(`/quizzes/${id}/attempts`);
  const navigate = useNavigate();
  // A class quiz is only for children in that class
  const kids = me.children.filter((c) => (!only || c._id === only) && (!quiz.data?.classId || refId(c.classId) === refId(quiz.data.classId)));
  return (
    <QueryState q={quiz}>
      {(qz) => (
        <>
          <Button size="small" startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 1, ml: -1 }}>
            Back
          </Button>
          <PageHeader
            title={qz.title}
            subtitle={[
              refName(qz.courseId) || refName(qz.classId),
              `${qz.questions.length} questions`,
              qz.timeLimitMin ? `${qz.timeLimitMin} min` : 'No time limit',
              `${qz.maxAttempts ?? 1} attempt${(qz.maxAttempts ?? 1) > 1 ? 's' : ''} allowed`,
              qz.dueDate ? `closes ${fmtDate(qz.dueDate, 'D MMM, h:mm A')}` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          />
          {qz.description && <Typography sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>{qz.description}</Typography>}
          {attempts.isLoading ? (
            <Loading />
          ) : attempts.error ? (
            <ErrorState error={attempts.error} />
          ) : kids.length === 0 ? (
            <Empty title="This quiz is not for your children's classes" />
          ) : (
            kids.map((c) => {
              const mine = (attempts.data ?? []).filter((a) => refId(a.studentId) === c._id);
              const best = mine.length ? Math.max(...mine.map((a) => a.percent)) : null;
              return (
                <Section key={c._id} title={c.name} action={best != null ? <Chip color={best >= 75 ? 'success' : 'default'} label={`Best ${best}%`} /> : <Chip variant="outlined" label="Not attempted" />}>
                  <DataTable
                    rows={mine}
                    empty={<Empty title="No attempts yet" hint={qz.dueDate && dayjs(qz.dueDate).isBefore(dayjs()) ? 'This quiz is closed.' : `${c.name.split(' ')[0]} has not taken this quiz yet.`} />}
                    columns={[
                      { key: 'score', label: 'Score', render: (a) => `${a.score}/${a.maxScore}` },
                      { key: 'pct', label: '%', render: (a) => <Chip size="small" label={`${a.percent}%`} color={a.percent >= 75 ? 'success' : a.percent >= 40 ? 'default' : 'warning'} /> },
                      { key: 'date', label: 'Taken', render: (a) => fmtDateTime(a.submittedAt) },
                    ]}
                  />
                </Section>
              );
            })
          )}
        </>
      )}
    </QueryState>
  );
}
