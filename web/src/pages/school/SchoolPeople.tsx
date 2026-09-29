import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import EditOutlined from '@mui/icons-material/EditOutlined';
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import { useState } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import { ROLE_LABEL, refId, refName, type ClassCourse, type ClassSection, type Role, type User } from '@/api/types';
import { useGet } from '@/lib/hooks';
import { ReportCard } from '@/components/ReportCard';
import { DataTable, Empty, PageHeader, QueryState, Section, StatusChip, UserCell, fmtDate, fromNow } from '@/components/ui';
import { BackLink, InfoList, RowMenu, useCreateParam } from '@/components/AdminCommon';
import { PeopleDirectory, UserFormDialog, signIn, useUserActions } from '@/components/AdminPeople';

type UserDetail = User & { parents?: User[] };

/* --------------------------------------------------------------- Lists */

export function TeachersPage() {
  const [open, setOpen] = useCreateParam();
  return (
    <>
      <PageHeader
        title="Teachers"
        subtitle="Teachers get an email invitation to set their password"
        actions={
          <Button variant="contained" startIcon={<PersonAddOutlined />} onClick={() => setOpen(true)}>
            Add teacher
          </Button>
        }
      />
      <Section title="All teachers">
        <PeopleDirectory role="teacher" createRoles={['teacher']} createOpen={open} onCreateClose={() => setOpen(false)} columns={['subjects', 'phone', 'lastLogin']} rowLink={(u) => `/school/teachers/${u._id}`} emptyHint="Add your first teacher to assign classes and courses." />
      </Section>
    </>
  );
}

export function StudentsPage() {
  const [params] = useSearchParams();
  const [open, setOpen] = useCreateParam();
  const classes = useGet<ClassSection[]>('/classes');
  return (
    <>
      <PageHeader
        title="Students"
        subtitle="Add students one by one, or import a class list from a spreadsheet"
        actions={
          <>
            <Button variant="outlined" startIcon={<UploadFileOutlined />} component={RouterLink} to="/school/students/import">
              Import from CSV
            </Button>
            <Button variant="contained" startIcon={<PersonAddOutlined />} onClick={() => setOpen(true)}>
              Add student
            </Button>
          </>
        }
      />
      <Section title="All students">
        {classes.data && (
          <PeopleDirectory
            role="student"
            createRoles={['student']}
            createOpen={open}
            onCreateClose={() => setOpen(false)}
            classFilter={classes.data}
            initialClassId={params.get('classId') ?? undefined}
            columns={['class', 'rollNo', 'lastLogin']}
            rowLink={(u) => `/school/students/${u._id}`}
            emptyHint="Add a student or import your class lists."
          />
        )}
      </Section>
    </>
  );
}

export function ParentsPage() {
  const [open, setOpen] = useCreateParam();
  return (
    <>
      <PageHeader
        title="Parents"
        subtitle="Parents see their children’s progress, attendance and announcements"
        actions={
          <Button variant="contained" startIcon={<PersonAddOutlined />} onClick={() => setOpen(true)}>
            Add parent
          </Button>
        }
      />
      <Section title="All parents">
        <PeopleDirectory role="parent" createRoles={['parent']} createOpen={open} onCreateClose={() => setOpen(false)} columns={['children', 'phone', 'lastLogin']} emptyHint="Parents are also created automatically when you import students with a parent email." />
      </Section>
    </>
  );
}

/* ------------------------------------------------------------- Details */

function PersonHeader({ u, onEdit, actions }: { u: User; onEdit: () => void; actions: ReturnType<typeof useUserActions>['actions'] }) {
  return (
    <PageHeader
      title={
        <Stack component="span" direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <span>{u.name}</span>
          <StatusChip status={u.status} />
        </Stack>
      }
      subtitle={`${ROLE_LABEL[u.role as Role]}${signIn(u) ? ` · ${signIn(u)}` : ''}${u.lastLoginAt ? ` · last signed in ${fromNow(u.lastLoginAt)}` : ' · has not signed in yet'}`}
      actions={
        <>
          <Button variant="outlined" startIcon={<EditOutlined />} onClick={onEdit}>
            Edit
          </Button>
          <RowMenu label="More actions" actions={actions(u).filter((a) => a.label !== 'Edit')} />
        </>
      }
    />
  );
}

export function TeacherDetailPage() {
  const { id } = useParams();
  const q = useGet<UserDetail>(`/users/${id}`);
  const classes = useGet<ClassSection[]>('/classes');
  const ccs = useGet<ClassCourse[]>('/class-courses');
  const ua = useUserActions();
  const own = (classes.data ?? []).filter((c) => refId(c.classTeacherId) === id);
  const taught = (ccs.data ?? []).filter((cc) => refId(cc.teacherId) === id);
  return (
    <>
      <BackLink to="/school/teachers" label="All teachers" />
      <QueryState q={q}>
        {(u) => (
          <>
            <PersonHeader u={u} onEdit={() => ua.openEdit(u)} actions={ua.actions} />
            <Section title="Details">
              <InfoList
                items={[
                  ['Email', u.email],
                  ['Phone', u.phone],
                  ['Subjects', u.subjects?.length ? u.subjects.join(', ') : ''],
                  ['Qualification', u.qualification],
                  ['Joined', fmtDate(u.createdAt)],
                  ['Password', u.mustChangePassword ? 'Waiting for them to set a password' : 'Set'],
                ]}
              />
            </Section>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
              <Section title="Class teacher of">
                <DataTable
                  rows={own}
                  empty={<Empty title="Not a class teacher" hint="Set the class teacher when you edit a class." />}
                  columns={[
                    { key: 'name', label: 'Class', render: (c) => <Typography component={RouterLink} to={`/school/classes/${c._id}`} variant="body2" sx={{ fontWeight: 600, color: 'primary.main', textDecoration: 'none' }}>{c.name}</Typography> },
                    { key: 'n', label: 'Students', align: 'right', render: (c) => c.studentCount ?? 0 },
                  ]}
                />
              </Section>
              <Section title="Courses taught">
                <DataTable
                  rows={taught}
                  empty={<Empty title="No courses assigned" hint="Assign courses from a class page." />}
                  columns={[
                    { key: 'course', label: 'Course', render: (cc) => <Typography component={RouterLink} to={`/school/courses/${refId(cc.courseId)}`} variant="body2" sx={{ fontWeight: 600, color: 'primary.main', textDecoration: 'none' }}>{refName(cc.courseId)}</Typography> },
                    { key: 'class', label: 'Class', render: (cc) => <Typography component={RouterLink} to={`/school/classes/${refId(cc.classId)}?tab=courses`} variant="body2" sx={{ color: 'inherit' }}>{refName(cc.classId)}</Typography> },
                  ]}
                />
              </Section>
            </Box>
            {ua.dialogs}
          </>
        )}
      </QueryState>
    </>
  );
}

export function StudentDetailPage() {
  const { id } = useParams();
  const q = useGet<UserDetail>(`/users/${id}`);
  const ua = useUserActions();
  const pa = useUserActions();
  const [addParent, setAddParent] = useState(false);
  return (
    <>
      <BackLink to="/school/students" label="All students" />
      <QueryState q={q}>
        {(u) => (
          <>
            <PersonHeader u={u} onEdit={() => ua.openEdit(u)} actions={ua.actions} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
              <Section title="Details">
                <InfoList
                  items={[
                    ['Class', u.classId ? <Typography component={RouterLink} to={`/school/classes/${refId(u.classId)}`} sx={{ color: 'primary.main', textDecoration: 'none' }}>{refName(u.classId)}</Typography> : <Typography color="warning.main" component="span">No class</Typography>],
                    ['Roll no.', u.rollNo],
                    ['Signs in with', u.email ?? (u.username ? `Username ${u.username}` : '')],
                    ['Gender', u.gender ? u.gender[0].toUpperCase() + u.gender.slice(1) : ''],
                    ['Date of birth', u.dateOfBirth ? fmtDate(u.dateOfBirth) : ''],
                    ['Password', u.mustChangePassword ? 'Must choose a new one at next sign-in' : 'Set'],
                  ]}
                />
              </Section>
              <Section title="Parents" action={<Button startIcon={<PersonAddOutlined />} onClick={() => setAddParent(true)}>Add parent</Button>}>
                <DataTable
                  rows={u.parents ?? []}
                  empty={<Empty title="No parent linked" hint="Add a parent so they can follow progress." />}
                  columns={[
                    { key: 'name', label: 'Parent', render: (p) => <UserCell name={p.name} sub={p.email ?? p.phone} /> },
                    { key: 'rel', label: 'Relation', render: (p) => (p.relation ? <Chip size="small" label={p.relation} /> : '—') },
                    { key: 'phone', label: 'Phone', render: (p) => <Box component="span" sx={{ whiteSpace: 'nowrap' }}>{p.phone || '—'}</Box> },
                    { key: 'x', label: '', align: 'right', render: (p) => <RowMenu actions={pa.actions({ ...p, role: 'parent', status: 'active' }).filter((a) => a.label === 'Edit' || a.label === 'Reset password')} /> },
                  ]}
                />
              </Section>
            </Box>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Report card
            </Typography>
            <ReportCard studentId={u._id} compact courseLink={(cid) => `/school/courses/${cid}?studentId=${u._id}`} />
            {addParent && <UserFormDialog roles={['parent']} schoolId={refId(u.schoolId)} preset={{ childIds: [u._id] }} onClose={() => setAddParent(false)} />}
            {ua.dialogs}
            {pa.dialogs}
          </>
        )}
      </QueryState>
    </>
  );
}
