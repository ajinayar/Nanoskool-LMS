import { Alert, Box, Button, Card, MenuItem, Stack, TextField, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { refId, refName, type ClassCourse, type ClassSection, type Course, type Paged, type User } from '@/api/types';
import { useMe } from '@/auth/AuthContext';
import { useGet, useSend } from '@/lib/hooks';
import { CardGrid, ConfirmDialog, DataTable, Empty, FormDialog, PageHeader, Progress, QueryState, Section, StatCard, StatusChip, UserCell, fmtDate, pct } from '@/components/ui';
import { BackLink, FilterSelect, FormError, GRADES, RowMenu, SearchField, TabBar, useCreateParam, useTab } from '@/components/AdminCommon';
import { SchoolClassCard } from './ClassCard';
import { UserFormDialog, signIn, useUserActions } from '@/components/AdminPeople';

export const useTeachers = () => useGet<Paged<User>>('/users', { role: 'teacher', status: 'active', limit: 200 });

/* ---------------------------------------------------------- Class form */

export function ClassDialog({ cls, onClose }: { cls?: ClassSection; onClose: () => void }) {
  const me = useMe();
  const navigate = useNavigate();
  const teachers = useTeachers();
  const [grade, setGrade] = useState<number>(cls?.grade ?? 6);
  const [section, setSection] = useState(cls?.section ?? '');
  const [name, setName] = useState(cls?.name ?? '');
  const [classTeacherId, setTeacher] = useState(cls ? refId(cls.classTeacherId) || '' : '');
  const [academicYear, setYear] = useState(cls?.academicYear ?? me.school?.academicYear ?? '');
  const [err, setErr] = useState<string | null>(null);
  const autoName = `Grade ${grade} - ${section.toUpperCase() || '?'}`;
  const save = useSend<Record<string, unknown>, ClassSection>(cls ? 'patch' : 'post', cls ? `/classes/${cls._id}` : '/classes', {
    success: cls ? 'Class updated' : 'Class created',
    invalidate: ['/classes', '/dashboard', '/reports'],
    onSuccess: (c) => {
      onClose();
      if (!cls) navigate(`/school/classes/${c._id}`);
    },
  });
  return (
    <FormDialog
      open
      title={cls ? `Edit ${cls.name}` : 'New class'}
      onClose={onClose}
      loading={save.isPending}
      submitLabel={cls ? 'Save changes' : 'Create class'}
      onSubmit={() => {
        const s = section.trim().toUpperCase();
        const v = !s ? 'Enter a section, for example A' : null;
        setErr(v);
        if (v) return;
        save.mutate({ grade, section: s, name: name.trim() || (cls ? `Grade ${grade} - ${s}` : undefined), classTeacherId: classTeacherId || null, academicYear: academicYear.trim() || undefined });
      }}
    >
      <Stack direction="row" spacing={2}>
        <TextField select label="Grade" value={grade} onChange={(e) => setGrade(Number(e.target.value))} required>
          {GRADES.map((g) => (
            <MenuItem key={g} value={g}>
              Grade {g}
            </MenuItem>
          ))}
        </TextField>
        <TextField label="Section" value={section} onChange={(e) => setSection(e.target.value.toUpperCase())} required slotProps={{ htmlInput: { maxLength: 10 } }} placeholder="A" />
      </Stack>
      <TextField label="Display name" value={name} onChange={(e) => setName(e.target.value)} placeholder={autoName} helperText={`Leave empty to use “${autoName}”`} slotProps={{ inputLabel: { shrink: true } }} />
      <TextField select label="Class teacher" value={classTeacherId} onChange={(e) => setTeacher(e.target.value)} slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}>
        <MenuItem value="">No class teacher yet</MenuItem>
        {(teachers.data?.items ?? []).map((t) => (
          <MenuItem key={t._id} value={t._id}>
            {t.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField label="Academic year" value={academicYear} onChange={(e) => setYear(e.target.value)} placeholder="2026-27" />
      <FormError message={err} error={save.error} />
    </FormDialog>
  );
}

/* ------------------------------------------------------ Assign a course */

/** Assign a course the school has access to, to a class, with a teacher. */
export function AssignCourseDialog({ classId, courseId, onClose }: { classId?: string; courseId?: string; onClose: () => void }) {
  const courses = useGet<Paged<Course>>('/courses', { limit: 200 });
  const classes = useGet<ClassSection[]>('/classes');
  const teachers = useTeachers();
  const existing = useGet<ClassCourse[]>('/class-courses');
  const [cls, setCls] = useState(classId ?? '');
  const [course, setCourse] = useState(courseId ?? '');
  const [teacher, setTeacher] = useState('');
  const [startDate, setStart] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const taken = new Set((existing.data ?? []).filter((x) => refId(x.classId) === cls).map((x) => refId(x.courseId)));
  const courseOptions = (courses.data?.items ?? []).filter((c) => !taken.has(c._id) || c._id === courseId);
  const assign = useSend<Record<string, unknown>>('post', '/class-courses', { success: 'Course assigned to the class', invalidate: ['/class-courses', '/classes', '/progress', '/reports'], onSuccess: onClose });
  const selectedCourse = courses.data?.items.find((c) => c._id === course);
  const selectedClass = classes.data?.find((c) => c._id === cls);
  const gradeMismatch = selectedCourse?.grades?.length && selectedClass && !selectedCourse.grades.includes(selectedClass.grade);
  return (
    <FormDialog
      open
      title="Assign a course to a class"
      onClose={onClose}
      loading={assign.isPending}
      submitLabel="Assign"
      onSubmit={() => {
        const v = !cls ? 'Choose a class' : !course ? 'Choose a course' : taken.has(course) ? 'This class already takes that course' : null;
        setErr(v);
        if (!v) assign.mutate({ classId: cls, courseId: course, teacherId: teacher || null, ...(startDate ? { startDate } : {}) });
      }}
    >
      <TextField select label="Class" value={cls} onChange={(e) => setCls(e.target.value)} required disabled={!!classId}>
        {(classes.data ?? []).map((c) => (
          <MenuItem key={c._id} value={c._id}>
            {c.name}
          </MenuItem>
        ))}
        {classes.data && !classes.data.length && <MenuItem disabled>Create a class first</MenuItem>}
      </TextField>
      <TextField select label="Course" value={course} onChange={(e) => setCourse(e.target.value)} required disabled={!!courseId}>
        {courseOptions.map((c) => (
          <MenuItem key={c._id} value={c._id}>
            {c.title}
            {c.grades?.length ? ` (Grades ${c.grades.join(', ')})` : ''}
          </MenuItem>
        ))}
        {courses.data && !courseOptions.length && <MenuItem disabled>No more courses available for this class</MenuItem>}
      </TextField>
      {gradeMismatch ? <Alert severity="warning">This course is designed for grades {selectedCourse!.grades!.join(', ')}. You can still assign it.</Alert> : null}
      <TextField select label="Teacher" value={teacher} onChange={(e) => setTeacher(e.target.value)} slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }} helperText="The teacher can then track progress, set quizzes and assignments">
        <MenuItem value="">Choose later</MenuItem>
        {(teachers.data?.items ?? []).map((t) => (
          <MenuItem key={t._id} value={t._id}>
            {t.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField label="Start date (optional)" type="date" value={startDate} onChange={(e) => setStart(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      <FormError message={err} error={assign.error} />
    </FormDialog>
  );
}

/** Inline teacher picker for a class-course row. */
export function TeacherSelect({ cc }: { cc: ClassCourse }) {
  const teachers = useTeachers();
  const change = useSend<{ teacherId: string | null }>('patch', `/class-courses/${cc._id}`, { success: 'Teacher updated', invalidate: ['/class-courses', '/classes'] });
  const current = refId(cc.teacherId);
  const list = teachers.data?.items ?? [];
  const missing = current && !list.some((t) => t._id === current);
  return (
    <TextField
      select
      value={current}
      onChange={(e) => change.mutate({ teacherId: e.target.value || null })}
      disabled={change.isPending}
      sx={{ minWidth: 180 }}
      slotProps={{ select: { displayEmpty: true }, htmlInput: { 'aria-label': 'Teacher' } }}
    >
      <MenuItem value="">
        <em>No teacher</em>
      </MenuItem>
      {missing && <MenuItem value={current}>{refName(cc.teacherId) || 'Current teacher'}</MenuItem>}
      {list.map((t) => (
        <MenuItem key={t._id} value={t._id}>
          {t.name}
        </MenuItem>
      ))}
    </TextField>
  );
}

/* --------------------------------------------------------------- List */

export function ClassesPage() {
  const q = useGet<ClassSection[]>('/classes');
  const [open, setOpen] = useCreateParam();
  const [edit, setEdit] = useState<ClassSection | null>(null);
  const [del, setDel] = useState<ClassSection | null>(null);
  const dash = useGet<{ classes?: { _id: string; courseCount: number; attendanceMarked: boolean }[] }>('/dashboard');
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');
  const remove = useSend<string>('delete', (id) => `/classes/${id}`, { success: 'Class deleted', invalidate: ['/classes', '/dashboard', '/reports'], onSuccess: () => setDel(null) });
  return (
    <>
      <PageHeader
        title="Classes"
        subtitle="Grades and sections in your school"
        actions={
          <>
            <Button variant="outlined" startIcon={<UploadFileOutlined />} component={RouterLink} to="/school/students/import">
              Bulk upload students
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
              New class
            </Button>
          </>
        }
      />
      <QueryState q={q}>
        {(rows) => {
          if (rows.length === 0)
            return (
              <Card>
                <Empty title="No classes yet" hint="Create your first class, then add students and assign courses." action={<Button startIcon={<Add />} onClick={() => setOpen(true)}>New class</Button>} />
              </Card>
            );
          const info = new Map((dash.data?.classes ?? []).map((x) => [x._id, x]));
          const grades = [...new Set(rows.map((c) => c.grade))].sort((x, y) => x - y);
          const shown = rows.filter((c) => (!grade || String(c.grade) === grade) && (!search || `${c.name} ${refName(c.classTeacherId)}`.toLowerCase().includes(search.toLowerCase())));
          const students = rows.reduce((n, c) => n + (c.studentCount ?? 0), 0);
          const noTeacher = rows.filter((c) => !refName(c.classTeacherId)).length;
          return (
            <>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' }, mb: 2.5, gap: 1.5, '& > *': { m: '0 !important' } }}>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <SearchField value={search} onChange={setSearch} placeholder="Search classes or teachers" width="100%" />
                </Box>
                <FilterSelect label="Grade" value={grade} onChange={setGrade} allLabel="All grades" width={170} options={grades.map((g) => ({ value: String(g), label: `Grade ${g}` }))} />
                <Typography sx={{ color: 'text.secondary', fontSize: 14, whiteSpace: 'nowrap' }}>
                  {rows.length} classes · {students} students{noTeacher ? ` · ${noTeacher} without a class teacher` : ''}
                </Typography>
              </Stack>
              {shown.length === 0 ? (
                <Card>
                  <Empty title="No classes match" hint="Try another search or grade." />
                </Card>
              ) : (
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                  {shown.map((c) => {
                    const x = info.get(c._id);
                    const t = typeof c.classTeacherId === 'object' ? (c.classTeacherId as { name?: string; avatarUrl?: string } | null) : null;
                    return (
                      <SchoolClassCard
                        key={c._id}
                        c={{ _id: c._id, name: c.name, grade: c.grade, section: c.section, academicYear: c.academicYear, teacherName: refName(c.classTeacherId) || undefined, teacherAvatar: t?.avatarUrl, studentCount: c.studentCount ?? 0, courseCount: x?.courseCount, attendanceMarked: x?.attendanceMarked }}
                        menu={
                          <RowMenu
                            label={`Actions for ${c.name}`}
                            actions={[
                              { label: 'Edit', icon: <EditOutlined fontSize="small" />, onClick: () => setEdit(c) },
                              { label: 'Delete', icon: <DeleteOutlined fontSize="small" />, danger: true, onClick: () => setDel(c) },
                            ]}
                          />
                        }
                      />
                    );
                  })}
                </Box>
              )}
            </>
          );
        }}
      </QueryState>
      {open && <ClassDialog onClose={() => setOpen(false)} />}
      {edit && <ClassDialog cls={edit} onClose={() => setEdit(null)} />}
      <ConfirmDialog
        open={!!del}
        danger
        title={`Delete ${del?.name}?`}
        message={del?.studentCount ? `This class still has ${del.studentCount} students. Move them to another class first.` : 'Course assignments for this class are removed too. This cannot be undone.'}
        confirmLabel="Delete class"
        loading={remove.isPending}
        onClose={() => setDel(null)}
        onConfirm={() => del && remove.mutate(del._id)}
      />
    </>
  );
}

/* ------------------------------------------------------------- Detail */

interface ProgressGrid {
  courses: { _id: string; title: string; unitCount: number }[];
  students: { _id: string; name: string; rollNo?: string; avatarUrl?: string; progress: Record<string, number> }[];
}

function ProgressTab({ classId }: { classId: string }) {
  const q = useGet<ProgressGrid>(`/progress/classes/${classId}`);
  return (
    <Section title="Progress by student">
      <QueryState q={q}>
        {(g) =>
          !g.courses.length ? (
            <Empty title="No courses assigned yet" hint="Assign a course to this class to track progress." />
          ) : (
            <DataTable
              rows={g.students}
              empty={<Empty title="No students in this class" />}
              columns={[
                { key: 'name', label: 'Student', render: (s) => <Typography component={RouterLink} to={`/school/students/${s._id}`} variant="body2" sx={{ fontWeight: 600, color: 'primary.main', textDecoration: 'none', whiteSpace: 'nowrap' }}>{s.name}</Typography> },
                { key: 'roll', label: 'Roll', render: (s) => s.rollNo || '—' },
                ...g.courses.map((c) => ({ key: c._id, label: c.title, width: 180, render: (s: ProgressGrid['students'][number]) => <Progress value={s.progress[c._id] ?? 0} /> })),
                {
                  key: 'avg',
                  label: 'Average',
                  align: 'right' as const,
                  render: (s: ProgressGrid['students'][number]) => {
                    const vals = g.courses.map((c) => s.progress[c._id] ?? 0);
                    return <b>{pct(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length))}</b>;
                  },
                },
              ]}
            />
          )
        }
      </QueryState>
    </Section>
  );
}

function AttendanceTab({ classId, size }: { classId: string; size: number }) {
  const q = useGet<{ date: string; present: number; total: number }[]>('/attendance', { classId });
  return (
    <QueryState q={q}>
      {(days) => {
        const marked = days.reduce((s, d) => s + d.total, 0);
        const present = days.reduce((s, d) => s + d.present, 0);
        const last = days[0];
        return (
          <>
            <CardGrid min={180}>
              <StatCard label="Days marked" value={days.length} hint="Last 60 school days" />
              <StatCard label="Average attendance" value={pct(marked ? Math.round((present / marked) * 100) : null)} />
              <StatCard label="Last marked" value={last ? fmtDate(last.date, 'D MMM') : '—'} hint={last ? `${last.present} of ${last.total} present` : 'Teachers mark attendance from their portal'} />
            </CardGrid>
            <Box sx={{ mt: 3 }} />
            <Section title="Daily attendance">
              <DataTable
                rows={days.map((d) => ({ ...d, _id: d.date }))}
                empty={<Empty title="No attendance marked yet" hint="The class teacher marks attendance each day." />}
                columns={[
                  { key: 'date', label: 'Date', render: (d) => fmtDate(d.date, 'ddd, D MMM YYYY') },
                  { key: 'present', label: 'Present', align: 'right', render: (d) => `${d.present} / ${d.total}` },
                  { key: 'absent', label: 'Absent', align: 'right', render: (d) => d.total - d.present },
                  { key: 'pct', label: 'Attendance', width: 220, render: (d) => <Progress value={d.total ? Math.round((d.present / d.total) * 100) : null} /> },
                  { key: 'miss', label: '', render: (d) => (size && d.total < size ? <Typography variant="caption" color="text.secondary">{size - d.total} not marked</Typography> : null) },
                ]}
              />
            </Section>
          </>
        );
      }}
    </QueryState>
  );
}

const TABS = ['students', 'courses', 'progress', 'attendance'] as const;

export function ClassDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const q = useGet<ClassSection>(`/classes/${id}`);
  const ccs = useGet<ClassCourse[]>('/class-courses', { classId: id });
  const [tab, setTab] = useTab(TABS, 'students');
  const [edit, setEdit] = useState(false);
  const [assign, setAssign] = useState(false);
  const [addStudent, setAddStudent] = useState(false);
  const [removeCc, setRemoveCc] = useState<ClassCourse | null>(null);
  const ua = useUserActions();
  const remove = useSend<string>('delete', (cid) => `/class-courses/${cid}`, { success: 'Course removed from the class', invalidate: ['/class-courses', '/classes', '/progress', '/reports'], onSuccess: () => setRemoveCc(null) });
  const courseCount = ccs.data?.length ?? 0;
  const students = useMemo(() => (q.data?.students ?? []) as User[], [q.data]);
  return (
    <>
      <BackLink to="/school/classes" label="All classes" />
      <QueryState q={q}>
        {(c) => (
          <>
            <PageHeader
              title={c.name}
              subtitle={`${c.classTeacher ? `Class teacher: ${c.classTeacher.name}` : 'No class teacher'} · ${students.length} student${students.length === 1 ? '' : 's'} · ${courseCount} course${courseCount === 1 ? '' : 's'}${c.academicYear ? ` · ${c.academicYear}` : ''}`}
              actions={
                <>
                  <Button startIcon={<EditOutlined />} onClick={() => setEdit(true)}>
                    Edit class
                  </Button>
                  <Button variant="outlined" startIcon={<UploadFileOutlined />} component={RouterLink} to={`/school/students/import?classId=${c._id}`}>
                    Bulk upload
                  </Button>
                  <Button variant="contained" startIcon={<PersonAddOutlined />} onClick={() => setAddStudent(true)}>
                    Add student
                  </Button>
                </>
              }
            />
            <TabBar
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'students', label: `Students (${students.length})` },
                { value: 'courses', label: `Courses (${courseCount})` },
                { value: 'progress', label: 'Progress' },
                { value: 'attendance', label: 'Attendance' },
              ]}
            />
            {tab === 'students' && (
              <Section title="Roster">
                <DataTable
                  rows={students}
                  onRowClick={(s) => navigate(`/school/students/${s._id}`)}
                  empty={<Empty title="No students in this class yet" action={<Stack direction="row" spacing={1}><Button startIcon={<PersonAddOutlined />} onClick={() => setAddStudent(true)}>Add student</Button><Button component={RouterLink} to="/school/students/import">Import from CSV</Button></Stack>} />}
                  columns={[
                    { key: 'roll', label: 'Roll', width: 70, render: (s) => s.rollNo || '—' },
                    { key: 'name', label: 'Student', render: (s) => <UserCell name={s.name} sub={signIn(s)} avatarUrl={s.avatarUrl} /> },
                    { key: 'gender', label: 'Gender', render: (s) => <span style={{ textTransform: 'capitalize' }}>{s.gender || '—'}</span> },
                    { key: 'status', label: 'Status', render: (s) => <StatusChip status={s.status} /> },
                    { key: 'x', label: '', align: 'right', render: (s) => <RowMenu actions={ua.actions({ ...s, role: 'student', classId: c._id })} /> },
                  ]}
                />
              </Section>
            )}
            {tab === 'courses' && (
              <Section title="Courses taught" action={<Button variant="contained" startIcon={<Add />} onClick={() => setAssign(true)}>Assign course</Button>}>
                <QueryState q={ccs}>
                  {(rows) => (
                    <DataTable
                      rows={rows}
                      empty={<Empty title="No courses assigned yet" hint="Pick a course your school has access to and choose who teaches it." action={<Button startIcon={<Add />} onClick={() => setAssign(true)}>Assign course</Button>} />}
                      columns={[
                        { key: 'course', label: 'Course', render: (cc) => <Typography component={RouterLink} to={`/school/courses/${refId(cc.courseId)}`} variant="body2" sx={{ fontWeight: 600, color: 'primary.main', textDecoration: 'none' }}>{refName(cc.courseId)}</Typography> },
                        { key: 'teacher', label: 'Teacher', render: (cc) => <TeacherSelect cc={cc} /> },
                        { key: 'start', label: 'Started', render: (cc) => fmtDate(cc.startDate) },
                        { key: 'x', label: '', align: 'right', render: (cc) => <Button size="small" color="error" startIcon={<DeleteOutlined />} onClick={() => setRemoveCc(cc)}>Remove</Button> },
                      ]}
                    />
                  )}
                </QueryState>
              </Section>
            )}
            {tab === 'progress' && <ProgressTab classId={c._id} />}
            {tab === 'attendance' && <AttendanceTab classId={c._id} size={students.length} />}
            {edit && <ClassDialog cls={c} onClose={() => setEdit(false)} />}
            {assign && <AssignCourseDialog classId={c._id} onClose={() => setAssign(false)} />}
            {addStudent && <UserFormDialog roles={['student']} preset={{ classId: c._id }} schoolId={refId(c.schoolId)} onClose={() => setAddStudent(false)} />}
            <ConfirmDialog
              open={!!removeCc}
              danger
              title={`Remove ${refName(removeCc?.courseId)} from ${c.name}?`}
              message="Students keep the units they completed, but the course disappears from their dashboard until it is assigned again."
              confirmLabel="Remove"
              loading={remove.isPending}
              onClose={() => setRemoveCc(null)}
              onConfirm={() => removeCc && remove.mutate(removeCc._id)}
            />
            {ua.dialogs}
          </>
        )}
      </QueryState>
    </>
  );
}
