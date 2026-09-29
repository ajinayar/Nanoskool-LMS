import { Box, Button, Card, CardContent, Chip, Paper, Skeleton, Stack, Typography } from '@mui/material';
import PlayArrow from '@mui/icons-material/PlayArrow';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined';
import RocketLaunchOutlined from '@mui/icons-material/RocketLaunchOutlined';
import StarOutlined from '@mui/icons-material/StarOutlined';
import TaskAltOutlined from '@mui/icons-material/TaskAltOutlined';
import dayjs from 'dayjs';
import { Link as RouterLink } from 'react-router-dom';
import { refName, type CourseDetail, type CourseProgress, type QuizSummary, type SchoolEvent, type StudentReport } from '@/api/types';
import { useMe } from '@/auth/AuthContext';
import { useGet } from '@/lib/hooks';
import { CardGrid, Empty, Progress, QueryState, Section, fmtDate } from '@/components/ui';
import { AnnouncementsWidget, EventsWidget } from '@/pages/shared/CommonPages';
import { CourseThumb } from '@/pages/shared/CoursePages';
import { RemarkChip } from '@/pages/teacher/RemarkPages';
import { ProgressRing, S, attemptsLeft, quizClosed } from './common';

type StudentDash = StudentReport & { upcomingEvents: SchoolEvent[]; recentUnits: { _id: string; unitId: { _id: string; title: string }; courseId: { _id: string; title: string }; completedAt: string }[] };

/** Course card that looks up the next unfinished unit so "Continue" goes straight there. */
function ContinueCard({ cp }: { cp: CourseProgress }) {
  const detail = useGet<CourseDetail>(`/courses/${cp.course._id}`);
  const units = detail.data?.chapters.flatMap((ch) => ch.units) ?? [];
  const next = units.find((u) => !u.completed);
  const done = cp.unitCount > 0 && cp.completedUnits >= cp.unitCount;
  const to = next ? `${S}/units/${next._id}` : `${S}/courses/${cp.course._id}`;
  return (
    <Card sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <CourseThumb course={cp.course} height={84} />
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ lineHeight: 1.3 }}>
          {cp.course.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {cp.completedUnits} of {cp.unitCount} units done{refName(cp.teacher) ? ` · ${refName(cp.teacher)}` : ''}
        </Typography>
        <Progress value={cp.progress} />
        <Box sx={{ flex: 1, minHeight: 12 }} />
        {detail.isLoading ? (
          <Skeleton height={36} />
        ) : done ? (
          <Button variant="outlined" color="success" startIcon={<EmojiEventsOutlined />} component={RouterLink} to={`${S}/courses/${cp.course._id}`}>
            Completed! Review course
          </Button>
        ) : (
          <>
            {next && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ mb: 0.5 }}>
                Up next: {next.title}
              </Typography>
            )}
            <Button variant="contained" startIcon={<PlayArrow />} component={RouterLink} to={to}>
              {cp.completedUnits ? 'Continue' : 'Start course'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon, label, value, hint, color }: { icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string; color: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'center', height: '100%' }}>
      <Box sx={{ width: 44, height: 44, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: `${color}1F`, color, flexShrink: 0 }}>{icon}</Box>
      <Box>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5">{value}</Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

export function StudentHome() {
  const me = useMe();
  const q = useGet<StudentDash>('/dashboard');
  const quizzes = useGet<QuizSummary[]>('/quizzes');
  const first = me.name.split(' ')[0];
  const hour = dayjs().hour();
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <QueryState q={q}>
      {(d) => {
        const openQuizzes = (quizzes.data ?? []).filter((x) => !quizClosed(x) && attemptsLeft(x) > 0);
        const toDo = d.assignments.overdue.length + d.assignments.pending.length;
        const p = d.overallProgress ?? 0;
        return (
          <>
            <Paper
              sx={{
                p: { xs: 2.5, md: 3.5 },
                mb: 3,
                color: '#fff',
                borderRadius: 4,
                background: 'linear-gradient(120deg, #3F3DBF 0%, #6B69E0 60%, #F28B30 140%)',
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 3,
                alignItems: { sm: 'center' },
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography sx={{ opacity: 0.85 }}>{hello}</Typography>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 800, mb: 1 }}>
                  Hi {first}!
                </Typography>
                <Typography sx={{ opacity: 0.92, maxWidth: 520 }}>
                  {p >= 100
                    ? 'You have finished every course. Amazing! Time to review and show off your robots.'
                    : p >= 50
                      ? 'You are more than halfway there. Keep the momentum going!'
                      : p > 0
                        ? 'Nice start! A little every day adds up fast.'
                        : 'Ready for your first lesson? Let us build something cool today.'}
                </Typography>
                {d.student.class && <Chip label={d.student.class.name} size="small" sx={{ mt: 1.5, bgcolor: 'rgba(255,255,255,0.18)', color: '#fff' }} />}
              </Box>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <ProgressRing value={d.overallProgress} size={112} color="inherit" light label="overall" />
              </Stack>
            </Paper>

            <CardGrid min={200}>
              <MiniStat icon={<AssignmentOutlined />} label="Assignments to do" value={toDo} hint={d.assignments.overdue.length ? `${d.assignments.overdue.length} overdue` : 'None overdue'} color="#3F3DBF" />
              <MiniStat icon={<QuizOutlined />} label="Open quizzes" value={quizzes.isLoading ? '…' : openQuizzes.length} hint={d.quizzes.averagePercent != null ? `Your average ${d.quizzes.averagePercent}%` : 'No quizzes yet'} color="#F28B30" />
              <MiniStat icon={<EventAvailableOutlined />} label="Attendance" value={d.attendance.percent == null ? '—' : `${d.attendance.percent}%`} hint={`${d.attendance.present} of ${d.attendance.days} days`} color="#2E9D61" />
              <MiniStat icon={<StarOutlined />} label="Assignment grades" value={d.assignments.averagePercent == null ? '—' : `${d.assignments.averagePercent}%`} hint={`${d.assignments.graded} graded`} color="#C2417B" />
            </CardGrid>

            <Box sx={{ mt: 3, display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, alignItems: 'start' }}>
              <Box sx={{ minWidth: 0 }}>
                <Section
                  title={
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <RocketLaunchOutlined color="secondary" /> <span>Continue learning</span>
                    </Stack>
                  }
                  action={<Button component={RouterLink} to={`${S}/courses`}>All courses</Button>}
                >
                  {d.courses.length === 0 ? (
                    <Empty title="No courses yet" hint="Your teacher will add courses to your class soon." />
                  ) : (
                    <CardGrid min={220}>
                      {d.courses.map((cp) => (
                        <ContinueCard key={cp.course._id} cp={cp} />
                      ))}
                    </CardGrid>
                  )}
                </Section>

                <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                  <Section title="Assignments" action={<Button component={RouterLink} to={`${S}/assignments`}>See all</Button>}>
                    {toDo === 0 ? (
                      <Stack sx={{ alignItems: 'center', py: 3, textAlign: 'center' }} spacing={1}>
                        <TaskAltOutlined color="success" sx={{ fontSize: 40 }} />
                        <Typography sx={{ fontWeight: 600 }}>All caught up!</Typography>
                        <Typography variant="body2" color="text.secondary">
                          No assignments waiting for you.
                        </Typography>
                      </Stack>
                    ) : (
                      <Stack spacing={1}>
                        {[...d.assignments.overdue.map((a) => ({ ...a, late: true })), ...d.assignments.pending.map((a) => ({ ...a, late: false }))].slice(0, 5).map((a) => (
                          <Paper
                            key={a._id}
                            variant="outlined"
                            component={RouterLink}
                            to={`${S}/assignments/${a._id}`}
                            sx={{ p: 1.5, textDecoration: 'none', color: 'inherit', borderLeft: 4, borderLeftColor: a.late ? 'error.main' : 'primary.main', '&:hover': { bgcolor: '#FAFBFE' } }}
                          >
                            <Typography sx={{ fontWeight: 600 }}>{a.title}</Typography>
                            <Typography variant="body2" color={a.late ? 'error.main' : 'text.secondary'}>
                              {a.late ? `Overdue since ${fmtDate(a.dueDate, 'D MMM')}` : a.dueDate ? `Due ${dayjs(a.dueDate).format('ddd D MMM, h:mm A')}` : 'No due date'}
                            </Typography>
                          </Paper>
                        ))}
                      </Stack>
                    )}
                  </Section>
                  <Section title="Quizzes to try" action={<Button component={RouterLink} to={`${S}/quizzes`}>See all</Button>}>
                    {quizzes.isLoading ? (
                      <Skeleton height={60} />
                    ) : openQuizzes.length === 0 ? (
                      <Empty title="No open quizzes" hint="New quizzes from your teacher show up here." />
                    ) : (
                      <Stack spacing={1}>
                        {openQuizzes.slice(0, 5).map((x) => (
                          <Paper
                            key={x._id}
                            variant="outlined"
                            component={RouterLink}
                            to={`${S}/quizzes/${x._id}`}
                            sx={{ p: 1.5, textDecoration: 'none', color: 'inherit', borderLeft: 4, borderLeftColor: 'secondary.main', '&:hover': { bgcolor: '#FAFBFE' } }}
                          >
                            <Typography sx={{ fontWeight: 600 }}>{x.title}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {x.questionCount} questions{x.timeLimitMin ? ` · ${x.timeLimitMin} min` : ''}
                              {x.attemptsUsed ? ` · best ${x.bestPercent}%` : ' · new'}
                              {x.dueDate ? ` · closes ${fmtDate(x.dueDate, 'D MMM')}` : ''}
                            </Typography>
                          </Paper>
                        ))}
                      </Stack>
                    )}
                  </Section>
                </Box>

                <Section title="What your teachers say">
                  {d.remarks.length === 0 ? (
                    <Empty title="No remarks yet" />
                  ) : (
                    <Stack spacing={1.5}>
                      {d.remarks.slice(0, 3).map((r) => (
                        <Box key={r._id} sx={{ p: 1.5, borderRadius: 2, bgcolor: r.category === 'appreciation' ? 'rgba(46,157,97,0.08)' : '#FAFBFE' }}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                            <RemarkChip category={r.category} />
                            <Typography variant="caption" color="text.secondary">
                              {refName(r.teacherId)} · {fmtDate(r.createdAt)}
                            </Typography>
                          </Stack>
                          <Typography>{r.text}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Section>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <EventsWidget events={d.upcomingEvents} />
                <AnnouncementsWidget />
                {d.recentUnits?.length > 0 && (
                  <Section title="Recently completed">
                    <Stack spacing={1}>
                      {d.recentUnits.map((u) => (
                        <Stack key={u._id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <TaskAltOutlined color="success" fontSize="small" />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                              {u.unitId?.title ?? 'Unit'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {u.courseId?.title} · {fmtDate(u.completedAt, 'D MMM')}
                            </Typography>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                  </Section>
                )}
              </Box>
            </Box>
          </>
        );
      }}
    </QueryState>
  );
}

