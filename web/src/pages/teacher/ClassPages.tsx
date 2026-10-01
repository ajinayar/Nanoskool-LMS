import { Box, Button, Card, CardActionArea, CardContent, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import RateReviewOutlined from '@mui/icons-material/RateReviewOutlined';
import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { refId, refName, type ClassSection, type Remark, type User } from '@/api/types';
import { useMe } from '@/auth/AuthContext';
import { useGet } from '@/lib/hooks';
import { ReportCard } from '@/components/ReportCard';
import { CardGrid, DataTable, Empty, Loading, ErrorState, PageHeader, Progress, QueryState, Section, UserCell } from '@/components/ui';
import { CourseThumb } from '@/pages/shared/CoursePages';
import { AttendanceTaker } from './AttendancePages';
import { AssignmentsPanel } from './AssignmentPages';
import { RemarkDialog, RemarkList } from './RemarkPages';
import { ClassOutcomes } from '@/pages/shared/ReviewPages';
import { GuidanceCard, PortfolioSection } from '@/pages/shared/JourneyPages';
import { gradeColor, tintHex } from '@/components/gradeColors';
import { PsychometricSection } from '@/components/PsychometricViews';
import { CognitiveSection } from '@/components/CognitiveViews';
import { BackButton, T, UrlTabs, localToday, useMyClasses, useTab } from './common';

interface ProgressGrid {
  class: ClassSection;
  courses: { _id: string; title: string; unitCount: number }[];
  students: (User & { progress: Record<string, number> })[];
}

export function TeacherClassesPage() {
  const me = useMe();
  const q = useMyClasses();
  return (
    <>
      <PageHeader title="My classes" subtitle="Classes where you are the class teacher or teach a course" />
      <QueryState q={q}>
        {(classes) =>
          classes.length === 0 ? (
            <Empty title="No classes yet" hint="Your school admin assigns classes to you." />
          ) : (
            <CardGrid min={250}>
              {[...classes]
                .sort((a, b) => a.grade - b.grade || a.section.localeCompare(b.section))
                .map((c) => {
                  const col = gradeColor(c.grade);
                  const mine = refId(c.classTeacherId) === me._id;
                  return (
                    <Box
                      key={c._id}
                      component={RouterLink}
                      to={`${T}/classes/${c._id}`}
                      sx={{
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'block',
                        p: 2.25,
                        borderRadius: '18px',
                        textDecoration: 'none',
                        color: 'inherit',
                        bgcolor: '#fff',
                        border: `1px solid ${tintHex(col, 0.22)}`,
                        boxShadow: '0 1px 2px rgba(20,20,50,0.04)',
                        transition: 'transform .15s, box-shadow .15s',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 10px 24px ${tintHex(col, 0.18)}` },
                      }}
                    >
                      <Box aria-hidden sx={{ position: 'absolute', right: -24, top: -24, width: 100, height: 100, borderRadius: '50%', bgcolor: tintHex(col, 0.08) }} />
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5, position: 'relative' }}>
                        <Box
                          sx={{
                            width: 50,
                            height: 50,
                            borderRadius: '15px',
                            bgcolor: col,
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'center',
                            pt: '10px',
                            fontWeight: 800,
                            fontSize: 20,
                            flexShrink: 0,
                            boxShadow: `0 6px 14px ${tintHex(col, 0.35)}`,
                          }}
                        >
                          {c.grade}
                          <Box component="span" sx={{ fontSize: 13, ml: '1px', opacity: 0.85 }}>
                            {c.section}
                          </Box>
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 750, fontSize: 17 }} noWrap>
                            {c.name}
                          </Typography>
                          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                            <GroupsOutlined sx={{ fontSize: 17 }} />
                            <Typography variant="body2">
                              {c.studentCount ?? 0} student{c.studentCount === 1 ? '' : 's'}
                            </Typography>
                          </Stack>
                        </Box>
                      </Stack>
                      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, position: 'relative' }}>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {mine ? '⭐ Class teacher' : `Teacher: ${refName(c.classTeacherId) || 'Not set'}`}
                        </Typography>
                        {c.academicYear && <Chip size="small" label={c.academicYear} sx={{ bgcolor: tintHex(col, 0.1), color: col }} />}
                      </Stack>
                    </Box>
                  );
                })}
            </CardGrid>
          )
        }
      </QueryState>
    </>
  );
}

const TABS = ['students', 'courses', 'attendance', 'assignments', 'progress', 'outcomes'] as const;
type ClassTab = (typeof TABS)[number];

export function TeacherClassDetailPage() {
  const { id } = useParams();
  const me = useMe();
  const q = useGet<ClassSection>(`/classes/${id}`);
  const [tab, setTab] = useTab<ClassTab>(TABS, 'students');
  const [params, setParams] = useSearchParams();
  const date = params.get('date') ?? localToday();
  return (
    <QueryState q={q}>
      {(c) => (
        <>
          <BackButton to={`${T}/classes`}>My classes</BackButton>
          <PageHeader title={c.name} subtitle={`${c.students?.length ?? 0} students · Class teacher: ${c.classTeacher?.name ?? 'not set'}${refId(c.classTeacherId) === me._id ? ' (you)' : ''}`} />
          <UrlTabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'students', label: 'Students' },
              { value: 'courses', label: 'Courses' },
              { value: 'attendance', label: 'Attendance' },
              { value: 'assignments', label: 'Assignments' },
              { value: 'progress', label: 'Progress' },
              { value: 'outcomes', label: 'Learning outcomes' },
            ]}
          />
          {tab === 'students' && <StudentsTab cls={c} />}
          {tab === 'courses' && <CoursesTab cls={c} />}
          {tab === 'attendance' && (
            <AttendanceTaker
              classId={c._id}
              date={date}
              onDateChange={(d) => {
                const next = new URLSearchParams(params);
                next.set('date', d);
                setParams(next, { replace: true });
              }}
            />
          )}
          {tab === 'assignments' && <AssignmentsPanel classId={c._id} />}
          {tab === 'progress' && <ProgressTab classId={c._id} />}
          {tab === 'outcomes' && <ClassOutcomes classId={c._id} studentBase={`${T}/students/`} />}
        </>
      )}
    </QueryState>
  );
}

function StudentsTab({ cls }: { cls: ClassSection }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [remarkFor, setRemarkFor] = useState<User | null>(null);
  const s = search.trim().toLowerCase();
  const rows = (cls.students ?? []).filter((x) => !s || x.name.toLowerCase().includes(s) || (x.rollNo ?? '').includes(s));
  return (
    <Section title="Students" action={<TextField placeholder="Search by name or roll no." value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: { xs: 170, sm: 260 } }} />}>
      <DataTable
        rows={rows}
        onRowClick={(r) => navigate(`${T}/students/${r._id}`)}
        empty={<Empty title={cls.students?.length ? 'No students match your search' : 'No students in this class yet'} />}
        columns={[
          { key: 'roll', label: 'Roll no.', width: 90, render: (r) => r.rollNo ?? '—' },
          { key: 'name', label: 'Name', render: (r) => <UserCell name={r.name} sub={r.username ?? r.email} avatarUrl={r.avatarUrl} /> },
          { key: 'status', label: 'Account', render: (r) => (r.status === 'suspended' ? <Chip size="small" color="error" label="Suspended" /> : <Chip size="small" variant="outlined" label="Active" />) },
          {
            key: 'act',
            label: '',
            align: 'right',
            render: (r) => (
              <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                <Button size="small" startIcon={<RateReviewOutlined />} onClick={() => setRemarkFor(r)}>
                  Remark
                </Button>
                <Button size="small" variant="outlined" component={RouterLink} to={`${T}/students/${r._id}`}>
                  Report
                </Button>
              </Stack>
            ),
          },
        ]}
      />
      {remarkFor && <RemarkDialog student={remarkFor} onClose={() => setRemarkFor(null)} />}
    </Section>
  );
}

function CoursesTab({ cls }: { cls: ClassSection }) {
  const grid = useGet<ProgressGrid>(`/progress/classes/${cls._id}`);
  const avg = (courseId: string) => {
    const st = grid.data?.students ?? [];
    return st.length ? Math.round(st.reduce((s, x) => s + (x.progress[courseId] ?? 0), 0) / st.length) : null;
  };
  const courses = cls.courses ?? [];
  if (!courses.length) return <Empty title="No courses assigned to this class yet" hint="Your school admin assigns courses to classes." />;
  return (
    <CardGrid min={250}>
      {courses.map((cc) => {
        const course = cc.courseId as { _id: string; title: string; category?: string; thumbnailUrl?: string };
        const a = avg(course._id);
        return (
          <Card key={cc._id} sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <CardActionArea component={RouterLink} to={`${T}/courses/${course._id}`}>
              <CourseThumb course={course} height={90} />
            </CardActionArea>
            <CardContent sx={{ flex: 1 }}>
              <Typography variant="h6">{course.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Teacher: {refName(cc.teacherId) || 'Not assigned'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Class average progress
              </Typography>
              {grid.isLoading ? <Progress value={null} /> : <Progress value={a} />}
              <Stack direction="row" sx={{ mt: 2, flexWrap: 'wrap', gap: 1, '& .MuiButton-root': { whiteSpace: 'nowrap' } }}>
                <Button size="small" variant="outlined" component={RouterLink} to={`${T}/courses/${course._id}`}>
                  Open course
                </Button>
                <Button size="small" component={RouterLink} to={`${T}/classes/${cls._id}?tab=progress`}>
                  Student progress
                </Button>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </CardGrid>
  );
}

export function ProgressTab({ classId }: { classId: string }) {
  const navigate = useNavigate();
  const q = useGet<ProgressGrid>(`/progress/classes/${classId}`);
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} />;
  const d = q.data!;
  if (!d.courses.length) return <Empty title="No courses assigned to this class yet" />;
  if (!d.students.length) return <Empty title="No students in this class yet" />;
  return (
    <Section title="Course progress by student">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Share of units each student has completed. Click a student for the full report, or a course to see it with that student&apos;s progress.
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 180 }}>Student</TableCell>
              {d.courses.map((c) => (
                <TableCell key={c._id} sx={{ minWidth: 170 }}>
                  {c.title}
                  <Typography variant="caption" sx={{ display: 'block' }} color="text.secondary">
                    {c.unitCount} units
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {d.students.map((s) => (
              <TableRow key={s._id} hover>
                <TableCell sx={{ cursor: 'pointer' }} onClick={() => navigate(`${T}/students/${s._id}`)}>
                  <UserCell name={s.name} sub={s.rollNo ? `Roll no. ${s.rollNo}` : undefined} avatarUrl={s.avatarUrl} />
                </TableCell>
                {d.courses.map((c) => (
                  <TableCell key={c._id} sx={{ cursor: 'pointer' }} onClick={() => navigate(`${T}/courses/${c._id}?studentId=${s._id}`)}>
                    <Progress value={s.progress[c._id] ?? 0} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow>
              <TableCell sx={{ fontWeight: 650 }}>Class average</TableCell>
              {d.courses.map((c) => (
                <TableCell key={c._id}>
                  <Progress value={Math.round(d.students.reduce((a, s) => a + (s.progress[c._id] ?? 0), 0) / d.students.length)} />
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Section>
  );
}

/* --------------------------------------------------------------- Student */

export function TeacherStudentPage() {
  const { id } = useParams();
  const me = useMe();
  const q = useGet<User & { classId?: ClassSection; parents?: User[] }>(`/users/${id}`);
  const remarks = useGet<Remark[]>('/remarks', { studentId: id });
  const [open, setOpen] = useState(false);
  return (
    <QueryState q={q}>
      {(s) => {
        const cls = s.classId && typeof s.classId === 'object' ? s.classId : null;
        return (
          <>
            <BackButton to={cls ? `${T}/classes/${cls._id}` : `${T}/classes`}>{cls ? cls.name : 'My classes'}</BackButton>
            <PageHeader
              title={s.name}
              subtitle={[cls?.name, s.rollNo ? `Roll no. ${s.rollNo}` : '', s.username ? `Username ${s.username}` : ''].filter(Boolean).join(' · ')}
              actions={
                <Button variant="contained" startIcon={<RateReviewOutlined />} onClick={() => setOpen(true)}>
                  Add remark
                </Button>
              }
            />
            <Box sx={{ mb: 3 }}>
              <GuidanceCard studentId={s._id} audience="teacher" base={`${T}/`} />
            </Box>
            <ReportCard studentId={s._id} compact courseLink={(cid) => `${T}/courses/${cid}?studentId=${s._id}`} />
            <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
              Portfolio
            </Typography>
            <Box sx={{ mb: 3 }}>
              <PortfolioSection studentId={s._id} />
            </Box>
            <Typography variant="h6" sx={{ mt: 4, mb: 0.5 }}>
              Personal profile (Know Yourself)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Separate from the Genius Habits. From the student’s Know Yourself answers, the parent questionnaire and your termly observations (Learning journey → Observations).
            </Typography>
            <Box sx={{ mb: 3 }}>
              <PsychometricSection studentId={s._id} />
            </Box>
            <Typography variant="h6" sx={{ mt: 4, mb: 0.5 }}>
              Cognitive profile (Thinking Puzzles)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              How the student thinks, from puzzles with right answers — a strengths shape across six areas, with no overall score. Use it to plan how you teach, never to group or rank.
            </Typography>
            <Box sx={{ mb: 3 }}>
              <CognitiveSection studentId={s._id} />
            </Box>
            <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, alignItems: 'start' }}>
              <Section title="My remarks for this student">
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Includes private remarks that parents do not see. You can delete remarks you wrote.
                </Typography>
                <QueryState q={remarks}>{(items) => <RemarkList items={items.filter((r) => refId(r.teacherId) === me._id)} />}</QueryState>
              </Section>
              <Section title="Parents">
                {s.parents?.length ? (
                  <Stack spacing={1.5}>
                    {s.parents.map((p) => (
                      <UserCell key={p._id} name={p.name} sub={[p.relation, p.phone, p.email].filter(Boolean).join(' · ')} />
                    ))}
                  </Stack>
                ) : (
                  <Empty title="No parent linked" />
                )}
              </Section>
            </Box>
            {open && <RemarkDialog student={s} onClose={() => setOpen(false)} />}
          </>
        );
      }}
    </QueryState>
  );
}
