/** Teacher home: a welcome banner with today at a glance, colourful stats, classes, work due and courses. */
import { Box, Button, Card, CardContent, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import ClassOutlined from '@mui/icons-material/ClassOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import GradingOutlined from '@mui/icons-material/GradingOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import RateReviewOutlined from '@mui/icons-material/RateReviewOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import ArrowForward from '@mui/icons-material/ArrowForward';
import Add from '@mui/icons-material/Add';
import StarRounded from '@mui/icons-material/StarRounded';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { refId, refName, type Assignment, type ClassCourse, type ClassSection, type SchoolEvent } from '@/api/types';
import { useMe } from '@/auth/AuthContext';
import { useGet } from '@/lib/hooks';
import { Empty, QueryState } from '@/components/ui';
import { AnnouncementsWidget, EventsWidget } from '@/pages/shared/CommonPages';
import { KIND_LABEL, T } from './common';
import { GRADE_COLOR, gradeColor, tintHex } from '@/components/gradeColors';

interface TeacherDash {
  stats: { classes: number; students: number; courses: number; toGrade: number };
  classes: (ClassSection & { studentCount: number })[];
  courses: ClassCourse[];
  assignments: Assignment[];
  upcomingEvents: SchoolEvent[];
}

const tint = tintHex;

const sectionCard = { borderRadius: '18px', border: '1px solid #E6E7F1', boxShadow: '0 1px 2px rgba(20,20,50,0.04), 0 8px 24px rgba(20,20,50,0.04)' };

function SectionTitle({ title, to, action }: { title: string; to?: string; action?: string }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.75 }}>
      <Typography component="h2" sx={{ fontWeight: 750, fontSize: 18 }}>
        {title}
      </Typography>
      {to && (
        <Button size="small" component={RouterLink} to={to} endIcon={<ArrowForward sx={{ fontSize: '16px !important' }} />}>
          {action}
        </Button>
      )}
    </Stack>
  );
}

function Stat({ icon, label, value, hint, color, to, highlight }: { icon: ReactNode; label: string; value: ReactNode; hint?: string; color: string; to: string; highlight?: boolean }) {
  return (
    <Box
      component={RouterLink}
      to={to}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: 2.25,
        borderRadius: '18px',
        textDecoration: 'none',
        color: highlight ? '#fff' : 'inherit',
        background: highlight ? `linear-gradient(135deg, ${color}, ${tint(color, 0.8)})` : '#fff',
        border: highlight ? 'none' : '1px solid #E6E7F1',
        boxShadow: highlight ? `0 10px 24px ${tint(color, 0.3)}` : '0 1px 2px rgba(20,20,50,0.04)',
        transition: 'transform .15s, box-shadow .15s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 12px 28px ${tint(color, highlight ? 0.35 : 0.14)}` },
      }}
    >
      <Box aria-hidden sx={{ position: 'absolute', right: -18, top: -18, width: 90, height: 90, borderRadius: '50%', bgcolor: highlight ? 'rgba(255,255,255,0.14)' : tint(color, 0.07) }} />
      <Box sx={{ width: 42, height: 42, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: highlight ? 'rgba(255,255,255,0.2)' : tint(color, 0.12), color: highlight ? '#fff' : color, mb: 1.5, position: 'relative' }}>{icon}</Box>
      <Typography sx={{ fontSize: 32, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em', position: 'relative' }}>{value}</Typography>
      <Typography sx={{ fontWeight: 650, mt: 0.5, position: 'relative' }}>{label}</Typography>
      {hint && <Typography sx={{ fontSize: 13, opacity: highlight ? 0.9 : 0.65, position: 'relative' }}>{hint}</Typography>}
    </Box>
  );
}

function QuickAction({ icon, label, to, color }: { icon: ReactNode; label: string; to: string; color: string }) {
  return (
    <Box component={RouterLink} to={to} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, py: 1.5, px: 0.5, minWidth: 0, borderRadius: '14px', textDecoration: 'none', color: 'inherit', border: '1px solid #EEEFF6', transition: 'transform .15s', '&:hover': { bgcolor: tint(color, 0.06), borderColor: tint(color, 0.3), transform: 'translateY(-2px)' } }}>
      <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: tint(color, 0.12), color, display: 'grid', placeItems: 'center', '& svg': { fontSize: 21 } }}>{icon}</Box>
      <Typography sx={{ fontWeight: 650, fontSize: 13, textAlign: 'center', lineHeight: 1.2 }}>{label}</Typography>
    </Box>
  );
}

export function TeacherDashboard() {
  const me = useMe();
  const q = useGet<TeacherDash>('/dashboard');
  // The list endpoint carries submission counts, which the dashboard does not
  const assignments = useGet<Assignment[]>('/assignments');
  const hour = dayjs().hour();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <QueryState q={q}>
      {(d) => {
        const all = assignments.data ?? [];
        const soon = all
          .filter((a) => a.status === 'published' && (!a.dueDate || dayjs(a.dueDate).isAfter(dayjs().subtract(3, 'day'))))
          .sort((a, b) => (a.dueDate ? dayjs(a.dueDate).valueOf() : Infinity) - (b.dueDate ? dayjs(b.dueDate).valueOf() : Infinity))
          .slice(0, 5);
        const dueWeek = all.filter((a) => a.status === 'published' && a.dueDate && dayjs(a.dueDate).isAfter(dayjs()) && dayjs(a.dueDate).isBefore(dayjs().add(7, 'day'))).length;
        const nextEvent = d.upcomingEvents[0];
        const sizeOf = (a: Assignment) => d.classes.find((c) => c._id === refId(a.classId))?.studentCount ?? 0;
        const glance = [
          d.stats.toGrade ? `${d.stats.toGrade} submission${d.stats.toGrade === 1 ? '' : 's'} to grade` : 'Nothing waiting to be graded',
          dueWeek ? `${dueWeek} assignment${dueWeek === 1 ? '' : 's'} due this week` : null,
          nextEvent ? `next: ${nextEvent.title} on ${dayjs(nextEvent.startsAt).format('D MMM')}` : null,
        ].filter(Boolean);
        const groupMap = new Map<string, { course: { _id: string; title: string; thumbnailUrl?: string }; classes: ClassSection[] }>();
        for (const cc of d.courses) {
          const course = cc.courseId as { _id: string; title: string; thumbnailUrl?: string };
          const g = groupMap.get(course._id) ?? { course, classes: [] };
          const cls = d.classes.find((c) => c._id === refId(cc.classId));
          if (cls) g.classes.push(cls);
          groupMap.set(course._id, g);
        }
        const groups = [...groupMap.values()].map((g) => ({ ...g, classes: g.classes.sort((a, b) => a.grade - b.grade || a.section.localeCompare(b.section)) }));
        const classes = [...d.classes].sort((a, b) => (a.grade ?? 0) - (b.grade ?? 0) || a.name.localeCompare(b.name));
        return (
          <>
            {/* Welcome banner */}
            <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: '22px', p: { xs: 3, md: 4 }, mb: 3, color: '#fff', background: 'linear-gradient(120deg, #2C2A93 0%, #3F3DBF 45%, #7B5CF0 100%)', boxShadow: '0 16px 40px rgba(63,61,191,0.25)' }}>
              <Box aria-hidden sx={{ position: 'absolute', right: -60, top: -80, width: 280, height: 280, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)' }} />
              <Box aria-hidden sx={{ position: 'absolute', right: 140, bottom: -110, width: 220, height: 220, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)' }} />
              <Box aria-hidden sx={{ position: 'absolute', right: { md: 60 }, top: 28, display: { xs: 'none', md: 'block' }, fontSize: 84, lineHeight: 1, transform: 'rotate(-8deg)' }}>
                🍎
              </Box>
              <Box sx={{ position: 'relative', maxWidth: 720 }}>
                <Typography sx={{ opacity: 0.85, fontWeight: 600, fontSize: 14.5 }}>
                  {dayjs().format('dddd, D MMMM')} · {me.school?.name}
                </Typography>
                <Typography component="h1" sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 800, letterSpacing: '-0.02em', mt: 0.5 }}>
                  {greet}, {me.name.split(' ')[0]} 👋
                </Typography>
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mt: 1.5, mb: 2.5 }}>
                  {glance.map((g) => (
                    <Box key={g} sx={{ px: 1.5, py: 0.6, borderRadius: 999, bgcolor: 'rgba(255,255,255,0.16)', fontSize: 14, fontWeight: 600 }}>
                      {g}
                    </Box>
                  ))}
                </Stack>
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.25 }}>
                  <Button variant="contained" startIcon={<Add />} component={RouterLink} to={`${T}/assignments?new=1`} sx={{ bgcolor: '#fff', color: '#2C2A93', fontWeight: 750, '&:hover': { bgcolor: '#F1F0FF' } }}>
                    New assignment
                  </Button>
                  <Button variant="outlined" startIcon={<EventAvailableOutlined />} component={RouterLink} to={`${T}/attendance`} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.55)', fontWeight: 700, '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>
                    Take attendance
                  </Button>
                  {d.stats.toGrade > 0 && (
                    <Button variant="outlined" startIcon={<GradingOutlined />} component={RouterLink} to={`${T}/assignments`} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.55)', fontWeight: 700, '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>
                      Grade work
                    </Button>
                  )}
                </Stack>
              </Box>
            </Box>

            {/* Stats */}
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, mb: 3 }}>
              <Stat icon={<ClassOutlined />} label="My classes" value={d.stats.classes} hint={`Grades ${Math.min(...classes.map((c) => c.grade ?? 1))}–${Math.max(...classes.map((c) => c.grade ?? 1))}`} color="#3F3DBF" to={`${T}/classes`} />
              <Stat icon={<GroupsOutlined />} label="Students" value={d.stats.students} hint="across your classes" color="#0AA5B5" to={`${T}/classes`} />
              <Stat icon={<MenuBookOutlined />} label="Courses I teach" value={d.stats.courses} hint="class courses" color="#1E9A55" to={`${T}/courses`} />
              <Stat icon={<GradingOutlined />} label="Waiting to be graded" value={d.stats.toGrade} hint={d.stats.toGrade ? 'Grade now →' : 'All caught up 🎉'} color="#F28B30" to={`${T}/assignments`} highlight={d.stats.toGrade > 0} />
            </Box>

            <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(300px, 1fr)' }, alignItems: 'start' }}>
              <Stack spacing={3} sx={{ minWidth: 0 }}>
                {/* Classes */}
                <Card sx={sectionCard}>
                  <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
                    <SectionTitle title="My classes" to={`${T}/classes`} action="All classes" />
                    {classes.length === 0 ? (
                      <Empty title="No classes yet" hint="Your school admin assigns classes to you." />
                    ) : (
                      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' } }}>
                        {classes.map((c) => {
                          const col = gradeColor(c.grade);
                          const mine = refId(c.classTeacherId) === me._id;
                          return (
                            <Box
                              key={c._id}
                              component={RouterLink}
                              to={`${T}/classes/${c._id}`}
                              sx={{ position: 'relative', display: 'flex', gap: 1.5, alignItems: 'center', p: 1.5, borderRadius: '16px', textDecoration: 'none', color: 'inherit', bgcolor: tint(col, 0.06), border: `1px solid ${tint(col, 0.18)}`, transition: 'transform .15s, box-shadow .15s', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 20px ${tint(col, 0.18)}` } }}
                            >
                              <Box sx={{ width: 46, height: 46, borderRadius: '14px', bgcolor: col, color: '#fff', display: 'flex', alignItems: 'baseline', justifyContent: 'center', pt: '9px', fontWeight: 800, fontSize: 19, flexShrink: 0, whiteSpace: 'nowrap', boxShadow: `0 4px 10px ${tint(col, 0.35)}` }}>
                                {c.grade ?? '•'}
                                {c.section ? <Box component="span" sx={{ fontSize: 12, ml: '1px', opacity: 0.85 }}>{c.section}</Box> : null}
                              </Box>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                                  {c.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {c.studentCount} student{c.studentCount === 1 ? '' : 's'}
                                </Typography>
                              </Box>
                              {mine && (
                                <Box title="You are the class teacher" sx={{ position: 'absolute', top: 8, right: 8, color: '#F5A700', display: 'flex' }}>
                                  <StarRounded sx={{ fontSize: 20 }} />
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                    {classes.some((c) => refId(c.classTeacherId) === me._id) && (
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 1.5, color: 'text.secondary' }}>
                        <StarRounded sx={{ fontSize: 16, color: '#F5A700' }} />
                        <Typography variant="caption">You are the class teacher</Typography>
                      </Stack>
                    )}
                  </CardContent>
                </Card>

                {/* Assignments */}
                <Card sx={sectionCard}>
                  <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
                    <SectionTitle title="Assignments due soon" to={`${T}/assignments`} action="All assignments" />
                    {assignments.isLoading ? null : soon.length === 0 ? (
                      <Empty title="Nothing due soon" hint="Published assignments with upcoming due dates show up here." />
                    ) : (
                      <Stack spacing={1.25}>
                        {soon.map((a) => {
                          const size = sizeOf(a);
                          const sub = a.submissionCount ?? 0;
                          const toGrade = sub - (a.gradedCount ?? 0);
                          const cls = d.classes.find((c) => c._id === refId(a.classId));
                          const col = gradeColor(cls?.grade);
                          const late = a.dueDate && dayjs(a.dueDate).isBefore(dayjs());
                          return (
                            <Box key={a._id} component={RouterLink} to={`${T}/assignments/${a._id}`} sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 1.5, borderRadius: '14px', textDecoration: 'none', color: 'inherit', border: '1px solid #EEEFF6', '&:hover': { bgcolor: '#FAFAFE', borderColor: tint(col, 0.35) } }}>
                              <Box sx={{ width: 54, textAlign: 'center', py: 0.75, borderRadius: '12px', bgcolor: late ? tint('#D64545', 0.1) : tint(col, 0.1), color: late ? '#D64545' : col, flexShrink: 0 }}>
                                <Typography sx={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.2 }}>{a.dueDate ? dayjs(a.dueDate).format('MMM') : '—'}</Typography>
                                <Typography sx={{ fontSize: 21, fontWeight: 800, lineHeight: 1.1 }}>{a.dueDate ? dayjs(a.dueDate).format('D') : '∞'}</Typography>
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 700 }} noWrap>
                                  {a.title}
                                </Typography>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: col }} />
                                  <Typography variant="body2" noWrap>
                                    {refName(a.classId)} · {KIND_LABEL[a.kind]}
                                    {a.dueDate ? ` · ${late ? 'closed' : 'due'} ${dayjs(a.dueDate).fromNow()}` : ''}
                                  </Typography>
                                </Stack>
                                {size > 0 && (
                                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.75 }}>
                                    <LinearProgress variant="determinate" value={Math.min(100, (sub / size) * 100)} sx={{ flex: 1, maxWidth: 220, height: 6, borderRadius: 999, bgcolor: '#EEEFF6', '& .MuiLinearProgress-bar': { bgcolor: col, borderRadius: 999 } }} />
                                    <Typography variant="caption" color="text.secondary">
                                      {sub}/{size} handed in
                                    </Typography>
                                  </Stack>
                                )}
                              </Box>
                              {toGrade > 0 ? <Chip size="small" color="warning" label={`${toGrade} to grade`} sx={{ fontWeight: 700 }} /> : <Chip size="small" variant="outlined" label={`${sub} submitted`} />}
                            </Box>
                          );
                        })}
                      </Stack>
                    )}
                  </CardContent>
                </Card>

                {/* Courses */}
                <Card sx={sectionCard}>
                  <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
                    <SectionTitle title="My courses" to={`${T}/courses`} action="Catalogue" />
                    {groups.length === 0 ? (
                      <Empty title="No courses assigned to you yet" />
                    ) : (
                      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
                        {groups.map((g, i) => {
                          const col = GRADE_COLOR[(i * 3 + 1) % GRADE_COLOR.length];
                          return (
                            <Box key={g.course._id} component={RouterLink} to={`${T}/courses/${g.course._id}`} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', p: 1.5, borderRadius: '14px', textDecoration: 'none', color: 'inherit', border: '1px solid #EEEFF6', '&:hover': { bgcolor: '#FAFAFE', borderColor: tint(col, 0.35) } }}>
                              <Box sx={{ width: 76, height: 56, borderRadius: '12px', overflow: 'hidden', flexShrink: 0, background: `linear-gradient(135deg, ${col}, ${tint(col, 0.6)})`, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 22 }}>
                                {g.course.thumbnailUrl ? <Box component="img" src={g.course.thumbnailUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : g.course.title[0]}
                              </Box>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography sx={{ fontWeight: 700 }} noWrap>
                                  {g.course.title}
                                </Typography>
                                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                  {g.classes.map((c) => (
                                    <Box key={c._id} sx={{ px: 0.75, py: 0.1, borderRadius: 999, fontSize: 12, fontWeight: 700, bgcolor: tint(gradeColor(c.grade), 0.12), color: gradeColor(c.grade) }}>
                                      {c.grade}
                                      {c.section}
                                    </Box>
                                  ))}
                                </Stack>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Stack>

              <Stack spacing={3} sx={{ minWidth: 0 }}>
                <Card sx={sectionCard}>
                  <CardContent sx={{ p: 2.5 }}>
                    <SectionTitle title="Quick actions" />
                    <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                      <QuickAction icon={<Add />} label="Assignment" to={`${T}/assignments?new=1`} color="#3F3DBF" />
                      <QuickAction icon={<QuizOutlined />} label="Quiz" to={`${T}/quizzes/new`} color="#C2417B" />
                      <QuickAction icon={<EventAvailableOutlined />} label="Attendance" to={`${T}/attendance`} color="#0AA5B5" />
                      <QuickAction icon={<RateReviewOutlined />} label="Remark" to={`${T}/remarks`} color="#F28B30" />
                      <QuickAction icon={<FactCheckOutlined />} label="Evidence" to={`${T}/evidence`} color="#1E9A55" />
                      <QuickAction icon={<VisibilityOutlined />} label="Observations" to={`${T}/observations`} color="#6C4CF1" />
                    </Box>
                  </CardContent>
                </Card>
                <EventsWidget events={d.upcomingEvents} />
                <AnnouncementsWidget />
              </Stack>
            </Box>
          </>
        );
      }}
    </QueryState>
  );
}
