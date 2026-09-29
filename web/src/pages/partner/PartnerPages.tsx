import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import CoPresentOutlined from '@mui/icons-material/CoPresentOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import { useQueries } from '@tanstack/react-query';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { api } from '@/api/client';
import { refId, refName, type ClassCourse, type CourseGrant, type Paged, type School } from '@/api/types';
import { useMe } from '@/auth/AuthContext';
import { useGet } from '@/lib/hooks';
import { CardGrid, DataTable, Empty, PageHeader, QueryState, Section, StatCard, StatusChip, UserCell } from '@/components/ui';
import { num, useCreateParam } from '@/components/AdminCommon';
import { PeopleDirectory } from '@/components/AdminPeople';
import { SchoolDetailView } from '@/components/AdminSchool';
import { AnnouncementsWidget } from '@/pages/shared/CommonPages';
import { CourseThumb } from '@/pages/shared/CoursePages';
import { SchoolList } from '@/pages/admin/AdminSchools';

interface PartnerDash {
  stats: { schools: number; students: number; teachers: number; courses: number };
  schools: School[];
}

export function PartnerDashboard() {
  const me = useMe();
  const navigate = useNavigate();
  const q = useGet<PartnerDash>('/dashboard');
  const schools = useGet<Paged<School>>('/schools', { limit: 200 });
  return (
    <>
      <PageHeader
        title={`Welcome back, ${me.name.split(' ')[0]}`}
        subtitle={me.partner?.name ?? 'Your schools at a glance'}
        actions={
          <>
            <Button variant="contained" startIcon={<Add />} component={RouterLink} to="/partner/schools?new=1">
              Add school
            </Button>
            <Button variant="outlined" startIcon={<PersonAddOutlined />} component={RouterLink} to="/partner/users?new=1">
              Add user
            </Button>
          </>
        }
      />
      <QueryState q={q}>
        {(d) => (
          <CardGrid min={180}>
            <StatCard label="Schools" value={num(d.stats.schools)} icon={<ApartmentOutlined />} />
            <StatCard label="Students" value={num(d.stats.students)} icon={<SchoolOutlined />} />
            <StatCard label="Teachers" value={num(d.stats.teachers)} icon={<CoPresentOutlined />} />
            <StatCard label="Courses held" value={num(d.stats.courses)} icon={<MenuBookOutlined />} />
          </CardGrid>
        )}
      </QueryState>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, mt: 3 }}>
        <Section title="Schools" action={<Button component={RouterLink} to="/partner/schools">View all</Button>}>
          <QueryState q={schools}>
            {(d) => (
              <DataTable
                rows={d.items}
                onRowClick={(s) => navigate(`/partner/schools/${s._id}`)}
                empty={<Empty title="No schools yet" hint="Add your first school to get started." action={<Button startIcon={<Add />} component={RouterLink} to="/partner/schools?new=1">Add school</Button>} />}
                columns={[
                  { key: 'name', label: 'School', render: (s) => <UserCell name={s.name} sub={[s.city, s.state].filter(Boolean).join(', ')} avatarUrl={s.logoUrl} /> },
                  { key: 'students', label: 'Students', align: 'right', render: (s) => s.students ?? 0 },
                  { key: 'teachers', label: 'Teachers', align: 'right', render: (s) => s.teachers ?? 0 },
                  { key: 'status', label: 'Status', render: (s) => <StatusChip status={s.status} /> },
                ]}
              />
            )}
          </QueryState>
        </Section>
        <AnnouncementsWidget />
      </Box>
    </>
  );
}

export function PartnerSchoolsPage() {
  return <SchoolList mode="partner" base="/partner" />;
}

export function PartnerSchoolDetailPage() {
  const { id } = useParams();
  return <SchoolDetailView key={id} id={id!} mode="partner" backTo="/partner/schools" />;
}

/** Courses the partner holds, and how each of its schools uses them. */
export function PartnerCoursesPage() {
  const grants = useGet<CourseGrant[]>('/course-grants');
  const schools = useGet<Paged<School>>('/schools', { limit: 200 });
  const schoolList = schools.data?.items ?? [];
  const perSchool = useQueries({
    queries: schoolList.map((s) => ({
      queryKey: ['/class-courses', { schoolId: s._id }],
      queryFn: async () => (await api.get<ClassCourse[]>('/class-courses', { params: { schoolId: s._id } })).data,
    })),
  });
  const directPerSchool = useQueries({
    queries: schoolList.map((s) => ({
      queryKey: ['/course-grants', { schoolId: s._id }],
      queryFn: async () => (await api.get<CourseGrant[]>('/course-grants', { params: { schoolId: s._id } })).data,
    })),
  });
  const held = (grants.data ?? []).filter((g) => g.partnerId && g.courseId);
  return (
    <>
      <PageHeader title="Courses" subtitle="Courses Nanoskool has granted to your organisation. Every one of your schools can use them." />
      <QueryState q={grants}>
        {() =>
          held.length === 0 ? (
            <Section title="Your courses">
              <Empty title="No courses yet" hint="Nanoskool will grant courses to your organisation. Contact your Nanoskool account manager." />
            </Section>
          ) : (
            <Stack spacing={2}>
              {held.map((g) => {
                const cid = refId(g.courseId);
                const rows = schoolList.map((s, i) => {
                  const ccs = (perSchool[i]?.data ?? []).filter((cc) => refId(cc.courseId) === cid);
                  const direct = (directPerSchool[i]?.data ?? []).some((x) => refId(x.courseId) === cid);
                  return { _id: s._id, school: s, classes: ccs, direct, loading: perSchool[i]?.isLoading };
                });
                const using = rows.filter((r) => r.classes.length).length;
                return (
                  <Section
                    key={g._id}
                    title={
                      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }} component="span">
                        <Box component="span" sx={{ width: 72, borderRadius: 1, overflow: 'hidden', flexShrink: 0, '& .MuiTypography-root': { display: 'none' }, display: { xs: 'none', sm: 'block' } }}>
                          <CourseThumb course={g.courseId} height={44} />
                        </Box>
                        <Box component="span">
                          <Typography component={RouterLink} to={`/partner/courses/${cid}`} variant="h6" sx={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>
                            {g.courseId.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" component="span">
                            {g.courseId.category ?? 'Course'}
                            {g.courseId.grades?.length ? ` · Grades ${g.courseId.grades.join(', ')}` : ''} · used by {using} of {schoolList.length} schools
                          </Typography>
                        </Box>
                      </Stack>
                    }
                    action={
                      <Button component={RouterLink} to={`/partner/courses/${cid}`}>
                        Open
                      </Button>
                    }
                  >
                    <DataTable
                      rows={rows}
                      empty={<Empty title="No schools yet" />}
                      columns={[
                        { key: 'school', label: 'School', render: (r) => <Typography component={RouterLink} to={`/partner/schools/${r._id}?tab=courses`} variant="body2" sx={{ fontWeight: 600, color: 'primary.main', textDecoration: 'none' }}>{r.school.name}</Typography> },
                        { key: 'access', label: 'Access', render: (r) => <Chip size="small" variant="outlined" label={r.direct ? 'Granted directly' : 'Through you'} /> },
                        {
                          key: 'classes',
                          label: 'Taught in',
                          render: (r) =>
                            r.loading ? '…' : r.classes.length ? (
                              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                {r.classes.map((cc) => (
                                  <Chip key={cc._id} size="small" label={`${refName(cc.classId)}${cc.teacherId ? ` · ${refName(cc.teacherId)}` : ''}`} />
                                ))}
                              </Stack>
                            ) : (
                              <Typography variant="body2" color="text.secondary">Not assigned to a class yet</Typography>
                            ),
                        },
                      ]}
                    />
                  </Section>
                );
              })}
            </Stack>
          )
        }
      </QueryState>
    </>
  );
}

export function PartnerUsersPage() {
  const [open, setOpen] = useCreateParam();
  const schools = useGet<Paged<School>>('/schools', { limit: 200 });
  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Admins, teachers, students and parents across your schools"
        actions={
          <Button variant="contained" startIcon={<PersonAddOutlined />} onClick={() => setOpen(true)}>
            Add user
          </Button>
        }
      />
      <Section title="Directory">
        <PeopleDirectory
          roles={['school_admin', 'teacher', 'student', 'parent']}
          createRoles={['school_admin', 'teacher', 'student', 'parent']}
          createOpen={open}
          onCreateClose={() => setOpen(false)}
          schools={schools.data?.items}
          columns={['role', 'school', 'class', 'lastLogin']}
        />
      </Section>
    </>
  );
}
