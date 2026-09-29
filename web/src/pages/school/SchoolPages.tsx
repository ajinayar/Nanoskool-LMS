import { Avatar, Box, Button, Card, CardContent, Chip, InputAdornment, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import GradingOutlined from '@mui/icons-material/GradingOutlined';
import dayjs from 'dayjs';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import ViewKanbanOutlined from '@mui/icons-material/ViewKanbanOutlined';
import ViewListOutlined from '@mui/icons-material/ViewListOutlined';
import Add from '@mui/icons-material/Add';
import CampaignOutlined from '@mui/icons-material/CampaignOutlined';
import ClassOutlined from '@mui/icons-material/ClassOutlined';
import CoPresentOutlined from '@mui/icons-material/CoPresentOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import FamilyRestroomOutlined from '@mui/icons-material/FamilyRestroomOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import { useState, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { ROLE_LABEL, refId, refName, type Role, type Assignment, type ClassCourse, type ClassSection, type Course, type CourseGrant, type Paged, type School, type SchoolEvent } from '@/api/types';
import { useMe } from '@/auth/AuthContext';
import { useGet } from '@/lib/hooks';
import { DataTable, Empty, PageHeader, QueryState, Section, StatusChip, fromNow } from '@/components/ui';
import { FilterSelect, SearchField, num } from '@/components/AdminCommon';
import { SchoolProfileForm, SchoolReportView } from '@/components/AdminSchool';
import { AnnouncementsWidget, EventsWidget } from '@/pages/shared/CommonPages';
import { CourseThumb } from '@/pages/shared/CoursePages';
import { AssignCourseDialog } from './SchoolClasses';
import { SchoolClassCard } from './ClassCard';
import { ClarityStat, PillToggle, Tag, deltaText } from '@/components/clarity';
import { CLARITY } from '@/theme-clarity';
import { actionLabel } from '@/pages/admin/AdminDashboard';

/* ------------------------------------------------------------ Dashboard */

interface DashClass {
  _id: string;
  name: string;
  grade: number;
  section: string;
  classTeacher?: { _id: string; name: string; avatarUrl?: string } | null;
  studentCount: number;
  courseCount: number;
  attendanceMarked: boolean;
}
interface SchoolDash {
  stats: { students: number; teachers: number; parents: number; classes: number; courses: number };
  attendanceToday: { classesMarked: number; classes: number; present: number; marked: number; percent: number | null };
  growth?: { studentsThisMonth: number; studentsLastMonth: number; quizAverage30d: number | null; quizAttempts30d: number };
  classes?: DashClass[];
  recentActivity?: { _id: string; action: string; createdAt: string; actorId?: { _id: string; name: string; role: Role } | null }[];
  upcomingEvents: SchoolEvent[];
}

type ClassView = 'board' | 'list';
const CLASS_COLUMNS: { key: 'teacher' | 'attendance' | 'ready'; label: string; hint: string }[] = [
  { key: 'teacher', label: 'Needs a class teacher', hint: 'Assign a teacher so attendance and reports can start.' },
  { key: 'attendance', label: 'Attendance pending', hint: 'Not marked yet today.' },
  { key: 'ready', label: 'All set today', hint: 'Teacher assigned and attendance marked.' },
];
const columnOf = (c: DashClass) => (!c.classTeacher ? 'teacher' : !c.attendanceMarked ? 'attendance' : 'ready');

function DashPanel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Box sx={{ bgcolor: CLARITY.panel, border: `1px solid ${CLARITY.line}`, borderRadius: '22px', p: 2.5, mb: 3 }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        {action && <Box sx={{ mr: -1.25 }}>{action}</Box>}
      </Stack>
      {children}
    </Box>
  );
}

function Pill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', bgcolor: CLARITY.panel, border: `1px solid ${CLARITY.line}`, borderRadius: 999, pl: 0.75, pr: 2, py: 0.75 }}>
      <Box sx={{ width: 34, height: 34, borderRadius: '50%', bgcolor: CLARITY.hover, display: 'grid', placeItems: 'center', '& svg': { fontSize: 18 } }}>{icon}</Box>
      <Typography sx={{ fontSize: 14, color: CLARITY.ink2 }}>{label}</Typography>
      <Typography sx={{ fontSize: 16, fontWeight: 600 }}>{value}</Typography>
    </Stack>
  );
}

function ClassCard({ c }: { c: DashClass }) {
  return <SchoolClassCard c={{ _id: c._id, name: c.name, grade: c.grade, section: c.section, teacherName: c.classTeacher?.name, teacherAvatar: c.classTeacher?.avatarUrl, studentCount: c.studentCount, courseCount: c.courseCount, attendanceMarked: c.attendanceMarked }} />;
}

export function SchoolDashboard() {
  const me = useMe();
  const navigate = useNavigate();
  const q = useGet<SchoolDash>('/dashboard');
  const [view, setView] = useState<ClassView>(() => {
    try {
      return (localStorage.getItem('ns.school.classView') as ClassView) || 'board';
    } catch {
      return 'board';
    }
  });
  const [search, setSearch] = useState('');
  const changeView = (v: ClassView) => {
    setView(v);
    try {
      localStorage.setItem('ns.school.classView', v);
    } catch {
      /* ignore */
    }
  };
  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1">
            Welcome back, {me.name.split(' ')[0]}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {me.school?.name}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<UploadFileOutlined />} component={RouterLink} to="/school/students/import">
            Import students
          </Button>
          <Button variant="contained" startIcon={<PersonAddOutlined />} component={RouterLink} to="/school/students?new=1">
            Add student
          </Button>
        </Stack>
      </Stack>
      <QueryState q={q}>
        {(d) => {
          const a = d.attendanceToday;
          const classes = (d.classes ?? []).filter((c) => !search || `${c.name} ${c.classTeacher?.name ?? ''}`.toLowerCase().includes(search.toLowerCase()));
          return (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 2 }}>
                <ClarityStat color={CLARITY.lilac} icon={<SchoolOutlined />} label="Students" value={num(d.stats.students)} delta={d.growth ? deltaText(d.growth.studentsThisMonth, d.growth.studentsLastMonth, 'new this month') : undefined} />
                <ClarityStat color={CLARITY.peach} icon={<EventAvailableOutlined />} label="Attendance today" value={a.percent == null ? '—' : `${a.percent}%`} delta={`${a.classesMarked} of ${a.classes} classes marked`} />
                <ClarityStat color={CLARITY.sky} icon={<QuizOutlined />} label="Quiz average" value={d.growth?.quizAverage30d != null ? `${d.growth.quizAverage30d}%` : '—'} delta={d.growth ? `${num(d.growth.quizAttempts30d)} attempts in 30 days` : undefined} />
              </Box>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mb: 4 }}>
                <Pill icon={<CoPresentOutlined />} label="Teachers" value={num(d.stats.teachers)} />
                <Pill icon={<FamilyRestroomOutlined />} label="Parents" value={num(d.stats.parents)} />
                <Pill icon={<ClassOutlined />} label="Classes" value={num(d.stats.classes)} />
                <Pill icon={<MenuBookOutlined />} label="Courses" value={num(d.stats.courses)} />
              </Stack>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, columnGap: 3, alignItems: 'start' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1.5 }}>
                    <PillToggle<ClassView>
                      ariaLabel="Class view"
                      value={view}
                      onChange={changeView}
                      options={[
                        { value: 'board', label: 'Board', icon: <ViewKanbanOutlined /> },
                        { value: 'list', label: 'List', icon: <ViewListOutlined /> },
                      ]}
                    />
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <TextField
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search classes or teachers"
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> }, htmlInput: { 'aria-label': 'Search classes' } }}
                      />
                    </Box>
                    <Button startIcon={<Add />} component={RouterLink} to="/school/classes?new=1">
                      New class
                    </Button>
                  </Stack>
                  {(d.classes ?? []).length === 0 ? (
                    <DashPanel title="Classes">
                      <Empty title="No classes yet" action={<Button startIcon={<Add />} component={RouterLink} to="/school/classes?new=1">Create a class</Button>} />
                    </DashPanel>
                  ) : view === 'board' ? (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2, mb: 3 }}>
                      {CLASS_COLUMNS.map((col) => {
                        const rows = classes.filter((c) => columnOf(c) === col.key);
                        return (
                          <Box key={col.key} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
                            <Box sx={{ px: 0.25 }}>
                              <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
                                {col.label} <Box component="span" sx={{ color: CLARITY.ink3 }}>({rows.length})</Box>
                              </Typography>
                              <Typography sx={{ fontSize: 12.5, color: CLARITY.ink3 }}>{col.hint}</Typography>
                            </Box>
                            {rows.length === 0 && <Box sx={{ border: '1.5px dashed #D6CCBA', borderRadius: '16px', p: 2, fontSize: 13, color: CLARITY.ink3, textAlign: 'center' }}>Nothing here</Box>}
                            {rows.slice(0, 4).map((c) => (
                              <ClassCard key={c._id} c={c} />
                            ))}
                            {rows.length > 4 && (
                              <Button size="small" onClick={() => changeView('list')} sx={{ alignSelf: 'flex-start' }}>
                                +{rows.length - 4} more · see list
                              </Button>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  ) : (
                    <DashPanel title="Classes" action={<Button component={RouterLink} to="/school/classes">Manage</Button>}>
                      <DataTable
                        rows={classes}
                        onRowClick={(c) => navigate(`/school/classes/${c._id}`)}
                        columns={[
                          { key: 'name', label: 'Class', render: (c) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.name}</Typography> },
                          { key: 'teacher', label: 'Class teacher', render: (c) => c.classTeacher?.name ?? <Typography variant="body2" color="warning.main">Not set</Typography> },
                          { key: 'att', label: 'Attendance today', render: (c) => <Tag label={c.attendanceMarked ? 'Marked' : 'Not marked'} tone={c.attendanceMarked ? 'ok' : 'warn'} /> },
                          { key: 'courses', label: 'Courses', align: 'right', render: (c) => c.courseCount },
                          { key: 'n', label: 'Students', align: 'right', render: (c) => c.studentCount },
                        ]}
                      />
                    </DashPanel>
                  )}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <DashPanel title="Recent activity">
                    {!d.recentActivity?.length ? (
                      <Empty title="No activity yet" hint="Changes made by your staff appear here." />
                    ) : (
                      <Stack spacing={1.75}>
                        {d.recentActivity.slice(0, 6).map((x) => (
                          <Stack key={x._id} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                            <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: CLARITY.butter, color: CLARITY.ink }}>{x.actorId?.name?.[0] ?? 'S'}</Avatar>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography sx={{ fontSize: 13.5 }}>
                                <b>{x.actorId?.name ?? 'System'}</b> {actionLabel(x.action)}
                              </Typography>
                              <Typography sx={{ fontSize: 12, color: CLARITY.ink3 }}>
                                {x.actorId?.role ? `${ROLE_LABEL[x.actorId.role]} · ` : ''}
                                {fromNow(x.createdAt)}
                              </Typography>
                            </Box>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </DashPanel>
                  <DashPanel title="Quick actions">
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                      <Button size="small" variant="outlined" startIcon={<CoPresentOutlined />} component={RouterLink} to="/school/teachers?new=1">Teacher</Button>
                      <Button size="small" variant="outlined" startIcon={<FamilyRestroomOutlined />} component={RouterLink} to="/school/parents?new=1">Parent</Button>
                      <Button size="small" variant="outlined" startIcon={<ClassOutlined />} component={RouterLink} to="/school/classes?new=1">Class</Button>
                      <Button size="small" variant="outlined" startIcon={<CampaignOutlined />} component={RouterLink} to="/school/announcements">Announcement</Button>
                    </Stack>
                  </DashPanel>
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

/* -------------------------------------------------------------- Courses */

export function SchoolCoursesPage() {
  const courses = useGet<Paged<Course>>('/courses', { limit: 200 });
  const direct = useGet<CourseGrant[]>('/course-grants');
  const ccs = useGet<ClassCourse[]>('/class-courses');
  const [q, setQ] = useState('');
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const directIds = new Set((direct.data ?? []).map((g) => refId(g.courseId)));
  return (
    <>
      <PageHeader title="Courses" subtitle="Courses available to your school, and which classes take them" actions={<SearchField value={q} onChange={setQ} placeholder="Search courses" />} />
      <QueryState q={courses}>
        {(d) => {
          const items = d.items.filter((c) => !q || c.title.toLowerCase().includes(q.toLowerCase()));
          if (!d.items.length) return <Card><Empty title="No courses yet" hint="Your partner or Nanoskool will make courses available to your school." /></Card>;
          if (!items.length) return <Card><Empty title="No courses match your search" /></Card>;
          return (
            <Stack spacing={2}>
              {items.map((c) => {
                const using = (ccs.data ?? []).filter((x) => refId(x.courseId) === c._id);
                return (
                  <Card key={c._id}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' } }}>
                      <CourseThumb course={c} height={130} />
                      <CardContent>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-start' } }}>
                          <Box>
                            <Typography variant="h6">{c.title}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {c.category ?? 'Course'}
                              {c.grades?.length ? ` · Grades ${c.grades.join(', ')}` : ''} · {c.unitCount ?? 0} units
                            </Typography>
                            <Chip size="small" variant="outlined" sx={{ mt: 1 }} label={directIds.has(c._id) ? 'Granted to your school' : 'Through your partner'} />
                          </Box>
                          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                            <Button component={RouterLink} to={`/school/courses/${c._id}`}>
                              Open course
                            </Button>
                            <Button variant="outlined" startIcon={<Add />} onClick={() => setAssignFor(c._id)}>
                              Assign to class
                            </Button>
                          </Stack>
                        </Stack>
                        <Box sx={{ mt: 1.5 }}>
                          {using.length ? (
                            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                              {using.map((x) => (
                                <Chip
                                  key={x._id}
                                  component={RouterLink}
                                  to={`/school/classes/${refId(x.classId)}?tab=courses`}
                                  clickable
                                  label={`${refName(x.classId)} · ${refName(x.teacherId) || 'no teacher'}`}
                                  color={x.teacherId ? 'default' : 'warning'}
                                />
                              ))}
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Not taught in any class yet
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Box>
                  </Card>
                );
              })}
            </Stack>
          );
        }}
      </QueryState>
      {assignFor && <AssignCourseDialog courseId={assignFor} onClose={() => setAssignFor(null)} />}
    </>
  );
}

/* ---------------------------------------------------------- Assignments */

export function SchoolAssignmentsPage() {
  const classes = useGet<ClassSection[]>('/classes');
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState<'all' | 'published' | 'draft' | 'closed'>('all');
  const [search, setSearch] = useState('');
  const q = useGet<Assignment[]>('/assignments', classId ? { classId } : undefined);
  const size = (id: string) => classes.data?.find((c) => c._id === id)?.studentCount ?? 0;
  const all = q.data ?? [];
  const now = Date.now();
  const open = all.filter((a) => a.status === 'published');
  const overdue = open.filter((a) => a.dueDate && new Date(a.dueDate).getTime() < now);
  const expected = open.reduce((n, a) => n + size(refId(a.classId)), 0);
  const handedIn = open.reduce((n, a) => n + (a.submissionCount ?? 0), 0);
  const toGrade = all.reduce((n, a) => n + Math.max(0, (a.submissionCount ?? 0) - (a.gradedCount ?? 0)), 0);
  const count = (s: string) => (s === 'all' ? all.length : all.filter((a) => a.status === s).length);
  const rows = all.filter((a) => (status === 'all' || a.status === status) && (!search || `${a.title} ${refName(a.courseId)} ${refName(a.createdBy)}`.toLowerCase().includes(search.toLowerCase())));
  return (
    <>
      <PageHeader title="Assignments" subtitle="Homework and projects set by your teachers" />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 4 }}>
        <ClarityStat color={CLARITY.lilac} icon={<AssignmentOutlined />} label="Open assignments" value={num(open.length)} delta={overdue.length ? `${overdue.length} past the due date` : 'None past the due date'} />
        <ClarityStat color={CLARITY.peach} icon={<UploadFileOutlined />} label="Handed in" value={expected ? `${Math.round((handedIn / expected) * 100)}%` : '—'} delta={`${num(handedIn)} of ${num(expected)} expected`} />
        <ClarityStat color={CLARITY.sky} icon={<GradingOutlined />} label="Waiting to be graded" value={num(toGrade)} delta={toGrade ? 'Teachers can grade from their portal' : 'All caught up'} />
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' }, mb: 2, gap: 1.5, '& > *': { m: '0 !important' } }}>
        <PillToggle<'all' | 'published' | 'draft' | 'closed'>
          ariaLabel="Assignment status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: `All ${count('all')}` },
            { value: 'published', label: `Published ${count('published')}` },
            { value: 'draft', label: `Draft ${count('draft')}` },
            { value: 'closed', label: `Closed ${count('closed')}` },
          ]}
        />
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assignments, courses or teachers"
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> }, htmlInput: { 'aria-label': 'Search assignments' } }}
          />
        </Box>
        <FilterSelect label="Class" value={classId} onChange={setClassId} allLabel="All classes" options={(classes.data ?? []).map((c) => ({ value: c._id, label: c.name }))} />
      </Stack>

      <Box sx={{ bgcolor: CLARITY.panel, border: `1px solid ${CLARITY.line}`, borderRadius: '22px', px: 2.5, pt: 1, pb: 1.5 }}>
        <QueryState q={q}>
          {() => (
            <DataTable
              rows={rows}
              empty={<Empty title="No assignments" hint={classId || status !== 'all' || search ? 'Try another filter.' : 'Teachers create assignments from their portal.'} />}
              columns={[
                {
                  key: 'title',
                  label: 'Assignment',
                  render: (a) => (
                    <Box sx={{ minWidth: 200 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 14.5 }}>{a.title}</Typography>
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 0.5 }}>
                        <Tag label={a.kind} />
                        {refName(a.courseId) && <Typography sx={{ fontSize: 12.5, color: CLARITY.ink3 }}>{refName(a.courseId)}</Typography>}
                      </Stack>
                    </Box>
                  ),
                },
                { key: 'class', label: 'Class', nowrap: true, render: (a) => refName(a.classId) || '—' },
                {
                  key: 'teacher',
                  label: 'Teacher',
                  nowrap: true,
                  render: (a) =>
                    refName(a.createdBy) ? (
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Avatar sx={{ width: 26, height: 26, fontSize: 12, bgcolor: CLARITY.lilac, color: CLARITY.ink }}>{refName(a.createdBy)[0]}</Avatar>
                        <span>{refName(a.createdBy)}</span>
                      </Stack>
                    ) : (
                      '—'
                    ),
                },
                {
                  key: 'due',
                  label: 'Due',
                  nowrap: true,
                  render: (a) => {
                    if (!a.dueDate) return <Typography variant="body2" sx={{ color: CLARITY.ink3 }}>No due date</Typography>;
                    const late = new Date(a.dueDate).getTime() < now;
                    return (
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="body2">{dayjs(a.dueDate).format('D MMM, h:mm A')}</Typography>
                        {late && a.status === 'published' && <Tag label="Past due" tone="bad" />}
                      </Stack>
                    );
                  },
                },
                {
                  key: 'subs',
                  label: 'Handed in',
                  nowrap: true,
                  render: (a) => {
                    const n = a.submissionCount ?? 0;
                    const total = size(refId(a.classId));
                    return (
                      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 130 }}>
                        <LinearProgress variant="determinate" value={total ? Math.min(100, (n / total) * 100) : 0} sx={{ flex: 1, height: 6, borderRadius: 999, '& .MuiLinearProgress-bar': { bgcolor: CLARITY.ink, borderRadius: 999 } }} />
                        <Typography variant="body2" sx={{ width: 40, textAlign: 'right', color: CLARITY.ink2 }}>
                          {n}
                          {total ? `/${total}` : ''}
                        </Typography>
                      </Stack>
                    );
                  },
                },
                { key: 'graded', label: 'Graded', align: 'right', nowrap: true, render: (a) => a.gradedCount ?? 0 },
                { key: 'status', label: 'Status', align: 'right', nowrap: true, render: (a) => <StatusChip status={a.status} /> },
              ]}
            />
          )}
        </QueryState>
      </Box>
    </>
  );
}

/* -------------------------------------------------------------- Reports */

export function SchoolReportsPage() {
  const me = useMe();
  return (
    <>
      <PageHeader title="Reports" subtitle="Course progress, quiz scores and attendance for every class" />
      {me.school ? <SchoolReportView schoolId={me.school._id} chart classLink={(id) => `/school/classes/${id}?tab=progress`} /> : <Empty title="Your account is not linked to a school" />}
    </>
  );
}

/* ------------------------------------------------------------- Settings */

export function SchoolSettingsPage() {
  const me = useMe();
  const q = useGet<School>(me.school ? `/schools/${me.school._id}` : null);
  return (
    <>
      <PageHeader title="School settings" subtitle="Your school’s profile, shown to teachers, students and parents" />
      <QueryState q={q}>
        {(s) => (
          <>
            <Section title="School profile">
              <SchoolProfileForm school={s} mode="school" />
            </Section>
            <Section title="Plan">
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Chip label={`${s.plan ?? 'basic'} plan`} sx={{ textTransform: 'capitalize' }} />
                <Typography variant="body2" color="text.secondary">
                  NanoBot allowance: {num(s.aiMonthlyTokens ?? 0)} tokens a month. Contact {refName(s.partnerId) || 'Nanoskool'} to change your plan.
                </Typography>
              </Stack>
            </Section>
          </>
        )}
      </QueryState>
    </>
  );
}
