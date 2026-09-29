import { Box, Button, Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';
import ClassOutlined from '@mui/icons-material/ClassOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import GradingOutlined from '@mui/icons-material/GradingOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import Add from '@mui/icons-material/Add';
import dayjs from 'dayjs';
import { Link as RouterLink } from 'react-router-dom';
import { refId, refName, type Assignment, type ClassCourse, type ClassSection, type SchoolEvent } from '@/api/types';
import { useMe } from '@/auth/AuthContext';
import { useGet } from '@/lib/hooks';
import { CardGrid, DueDate, Empty, PageHeader, QueryState, Section, StatCard } from '@/components/ui';
import { AnnouncementsWidget, EventsWidget } from '@/pages/shared/CommonPages';
import { CourseThumb } from '@/pages/shared/CoursePages';
import { KIND_LABEL, T } from './common';

interface TeacherDash {
  stats: { classes: number; students: number; courses: number; toGrade: number };
  classes: (ClassSection & { studentCount: number })[];
  courses: ClassCourse[];
  assignments: Assignment[];
  upcomingEvents: SchoolEvent[];
}

export function TeacherDashboard() {
  const me = useMe();
  const q = useGet<TeacherDash>('/dashboard');
  // The list endpoint carries submission counts, which the dashboard does not
  const assignments = useGet<Assignment[]>('/assignments');
  const hour = dayjs().hour();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <>
      <PageHeader
        title={`${greet}, ${me.name.split(' ')[0]}`}
        subtitle={`${me.school?.name ?? ''} · ${dayjs().format('dddd, D MMMM')}`}
        actions={
          <>
            <Button variant="outlined" startIcon={<EventAvailableOutlined />} component={RouterLink} to={`${T}/attendance`}>
              Take attendance
            </Button>
            <Button variant="contained" startIcon={<Add />} component={RouterLink} to={`${T}/assignments?new=1`}>
              New assignment
            </Button>
          </>
        }
      />
      <QueryState q={q}>
        {(d) => {
          const soon = (assignments.data ?? [])
            .filter((a) => a.status === 'published' && (!a.dueDate || dayjs(a.dueDate).isAfter(dayjs().subtract(3, 'day'))))
            .sort((a, b) => (a.dueDate ? dayjs(a.dueDate).valueOf() : Infinity) - (b.dueDate ? dayjs(b.dueDate).valueOf() : Infinity))
            .slice(0, 6);
          return (
            <>
              <CardGrid min={210}>
                <StatCard label="My classes" value={d.stats.classes} icon={<ClassOutlined />} />
                <StatCard label="Students" value={d.stats.students} icon={<GroupsOutlined />} />
                <StatCard label="Courses I teach" value={d.stats.courses} icon={<MenuBookOutlined />} />
                <StatCard
                  label="Waiting to be graded"
                  value={d.stats.toGrade}
                  icon={<GradingOutlined />}
                  color={d.stats.toGrade ? 'secondary.main' : 'primary.main'}
                  hint={d.stats.toGrade ? 'submissions' : 'All caught up'}
                />
              </CardGrid>
              <Box sx={{ mt: 3, display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, alignItems: 'start' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Section title="My classes" action={<Button component={RouterLink} to={`${T}/classes`}>All classes</Button>}>
                    {d.classes.length === 0 ? (
                      <Empty title="No classes yet" hint="Your school admin assigns classes to you." />
                    ) : (
                      <CardGrid min={180}>
                        {d.classes.map((c) => (
                          <Card key={c._id}>
                            <CardActionArea component={RouterLink} to={`${T}/classes/${c._id}`}>
                              <CardContent>
                                <Typography variant="h6">{c.name}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {c.studentCount} students
                                </Typography>
                                {refId(c.classTeacherId) === me._id && <Chip size="small" color="secondary" label="Class teacher" sx={{ mt: 1 }} />}
                              </CardContent>
                            </CardActionArea>
                          </Card>
                        ))}
                      </CardGrid>
                    )}
                  </Section>
                  <Section title="Assignments due soon" action={<Button component={RouterLink} to={`${T}/assignments`}>All assignments</Button>}>
                    {assignments.isLoading ? null : soon.length === 0 ? (
                      <Empty title="Nothing due soon" hint="Published assignments with upcoming due dates show up here." />
                    ) : (
                      <Stack divider={<Box sx={{ borderTop: '1px solid #E4E6F0' }} />}>
                        {soon.map((a) => (
                          <Stack
                            key={a._id}
                            direction={{ xs: 'column', sm: 'row' }}
                            component={RouterLink}
                            to={`${T}/assignments/${a._id}`}
                            spacing={1}
                            sx={{ py: 1.25, textDecoration: 'none', color: 'inherit', alignItems: { sm: 'center' }, '&:hover': { bgcolor: '#FAFBFE' } }}
                          >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 600 }}>{a.title}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {refName(a.classId)} · {KIND_LABEL[a.kind]}
                              </Typography>
                            </Box>
                            <DueDate date={a.dueDate} />
                            <Stack direction="row" spacing={1}>
                              <Chip size="small" label={`${a.submissionCount ?? 0} submitted`} />
                              {(a.submissionCount ?? 0) > (a.gradedCount ?? 0) && <Chip size="small" color="warning" label={`${(a.submissionCount ?? 0) - (a.gradedCount ?? 0)} to grade`} />}
                            </Stack>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </Section>
                  <Section title="My courses" action={<Button component={RouterLink} to={`${T}/courses`}>Catalogue</Button>}>
                    {d.courses.length === 0 ? (
                      <Empty title="No courses assigned to you yet" />
                    ) : (
                      <CardGrid min={200}>
                        {d.courses.map((cc) => {
                          const course = cc.courseId as { _id: string; title: string; thumbnailUrl?: string };
                          return (
                            <Card key={cc._id} sx={{ overflow: 'hidden' }}>
                              <CardActionArea component={RouterLink} to={`${T}/courses/${course._id}`}>
                                <CourseThumb course={course} height={70} />
                                <CardContent sx={{ py: 1.5 }}>
                                  <Typography sx={{ fontWeight: 650 }}>{course.title}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {refName(cc.classId)}
                                  </Typography>
                                </CardContent>
                              </CardActionArea>
                            </Card>
                          );
                        })}
                      </CardGrid>
                    )}
                  </Section>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <EventsWidget events={d.upcomingEvents} />
                  <AnnouncementsWidget />
                </Box>
              </Box>
            </>
          );
        }}
      </QueryState>
    </>
  );
}
