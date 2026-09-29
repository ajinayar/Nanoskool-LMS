import { useTheme } from '@mui/material/styles';
/**
 * School management shared by the super admin, partner and school admin portals:
 * profile form, create dialog, school report, and the full school detail view.
 */
import { Alert, Avatar, Box, Button, Chip, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { refId, refName, type ClassSection, type Course, type CourseGrant, type Paged, type Partner, type School } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { useGet, useSend } from '@/lib/hooks';
import { useBase } from '@/pages/shared/CommonPages';
import { ConfirmDialog, DataTable, Empty, FormDialog, PageHeader, Progress, QueryState, Section, StatCard, CardGrid, StatusChip, UploadButton, pct, fmtDate } from './ui';
import { BackLink, FormError, TabBar, num, useTab } from './AdminCommon';
import { PeopleDirectory, UserFormDialog } from './AdminPeople';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import CoPresentOutlined from '@mui/icons-material/CoPresentOutlined';
import FamilyRestroomOutlined from '@mui/icons-material/FamilyRestroomOutlined';
import ClassOutlined from '@mui/icons-material/ClassOutlined';

export type SchoolMode = 'admin' | 'partner' | 'school';

/* ------------------------------------------------------------ Profile */

export type SchoolDraft = Partial<Omit<School, 'partnerId'>> & { partnerId?: string };

export const schoolDraft = (s?: School): SchoolDraft => ({
  name: s?.name ?? '',
  code: s?.code ?? '',
  partnerId: s ? refId(s.partnerId) || '' : '',
  board: s?.board ?? '',
  address: s?.address ?? '',
  city: s?.city ?? '',
  state: s?.state ?? '',
  pinCode: s?.pinCode ?? '',
  phone: s?.phone ?? '',
  email: s?.email ?? '',
  website: s?.website ?? '',
  principalName: s?.principalName ?? '',
  academicYear: s?.academicYear ?? '',
  logoUrl: s?.logoUrl ?? '',
  plan: s?.plan ?? 'basic',
  aiMonthlyTokens: s?.aiMonthlyTokens ?? 200000,
  status: s?.status ?? 'active',
});

/** Build the API body: trims strings and drops fields the current role may not send. */
export function schoolPayload(d: SchoolDraft, mode: SchoolMode, creating: boolean) {
  const out: Record<string, unknown> = {};
  const str = ['name', 'code', 'board', 'address', 'city', 'state', 'pinCode', 'phone', 'email', 'website', 'principalName', 'academicYear', 'logoUrl'] as const;
  for (const k of str) {
    const v = (d[k] as string | undefined)?.trim();
    if (v || (!creating && k !== 'code')) out[k] = v ?? '';
  }
  if (mode === 'admin') {
    if (d.partnerId) out.partnerId = d.partnerId;
    out.plan = d.plan;
    out.aiMonthlyTokens = Number(d.aiMonthlyTokens) || 0;
  }
  if (mode !== 'school') out.status = d.status;
  return out;
}

export function validateSchool(d: SchoolDraft): string | null {
  if ((d.name ?? '').trim().length < 2) return 'Enter the school name';
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) return 'Enter a valid school email';
  return null;
}

const BOARDS = ['CBSE', 'ICSE', 'State board', 'IB', 'IGCSE', 'Other'];

export function SchoolFields({ value, onChange, mode, creating }: { value: SchoolDraft; onChange: (d: SchoolDraft) => void; mode: SchoolMode; creating?: boolean }) {
  const set = (p: SchoolDraft) => onChange({ ...value, ...p });
  const partners = useGet<Paged<Partner>>(mode === 'admin' ? '/partners' : null, { limit: 200 });
  const row = { direction: { xs: 'column', sm: 'row' } as const, spacing: 2 };
  return (
    <Stack spacing={2}>
      <Stack {...row}>
        <TextField label="School name" value={value.name} onChange={(e) => set({ name: e.target.value })} required sx={{ flex: 2 }} />
        <TextField label="Short code" value={value.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} helperText="Used in student usernames" sx={{ flex: 1 }} slotProps={{ htmlInput: { maxLength: 20 } }} />
      </Stack>
      {mode === 'admin' && (
        <TextField select label="Partner" value={value.partnerId ?? ''} onChange={(e) => set({ partnerId: e.target.value })} slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }} helperText={!creating ? 'Moving a school to another partner changes which partner courses it receives' : undefined}>
          <MenuItem value="">No partner (direct school)</MenuItem>
          {(partners.data?.items ?? []).map((p) => (
            <MenuItem key={p._id} value={p._id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
      )}
      <Stack {...row}>
        <TextField select label="Board" value={value.board ?? ''} onChange={(e) => set({ board: e.target.value })} slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}>
          <MenuItem value="">Not set</MenuItem>
          {BOARDS.map((b) => (
            <MenuItem key={b} value={b}>
              {b}
            </MenuItem>
          ))}
        </TextField>
        <TextField label="Academic year" placeholder="2026-27" value={value.academicYear} onChange={(e) => set({ academicYear: e.target.value })} />
        <TextField label="Principal" value={value.principalName} onChange={(e) => set({ principalName: e.target.value })} />
      </Stack>
      <TextField label="Address" value={value.address} onChange={(e) => set({ address: e.target.value })} multiline minRows={2} />
      <Stack {...row}>
        <TextField label="City" value={value.city} onChange={(e) => set({ city: e.target.value })} />
        <TextField label="State" value={value.state} onChange={(e) => set({ state: e.target.value })} />
        <TextField label="PIN code" value={value.pinCode} onChange={(e) => set({ pinCode: e.target.value })} />
      </Stack>
      <Stack {...row}>
        <TextField label="Phone" value={value.phone} onChange={(e) => set({ phone: e.target.value })} />
        <TextField label="School email" type="email" value={value.email} onChange={(e) => set({ email: e.target.value })} />
        <TextField label="Website" value={value.website} onChange={(e) => set({ website: e.target.value })} />
      </Stack>
      {(mode === 'admin' || mode === 'partner') && (
        <Stack {...row}>
          {mode === 'admin' && (
            <>
              <TextField select label="Plan" value={value.plan} onChange={(e) => set({ plan: e.target.value as School['plan'] })}>
                <MenuItem value="basic">Basic</MenuItem>
                <MenuItem value="standard">Standard</MenuItem>
                <MenuItem value="premium">Premium</MenuItem>
              </TextField>
              <TextField
                label="NanoBot tokens per month"
                type="number"
                value={value.aiMonthlyTokens ?? ''}
                onChange={(e) => set({ aiMonthlyTokens: e.target.value === '' ? undefined : Number(e.target.value) })}
                helperText="0 turns NanoBot off for this school"
                slotProps={{ htmlInput: { min: 0, step: 10000 } }}
              />
            </>
          )}
          {!creating && (
            <TextField select label="Status" value={value.status} onChange={(e) => set({ status: e.target.value as School['status'] })} helperText={value.status === 'inactive' ? 'Inactive schools stay visible but are marked closed' : undefined}>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          )}
        </Stack>
      )}
    </Stack>
  );
}

export function LogoEditor({ url, onChange }: { url?: string; onChange: (url: string) => void }) {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
      <Avatar src={url || undefined} variant="rounded" sx={{ width: 72, height: 72, bgcolor: 'primary.light' }}>
        <SchoolOutlined />
      </Avatar>
      <Stack spacing={1} direction={{ xs: 'column', sm: 'row' }}>
        <UploadButton folder="logos" accept="image/*" label={url ? 'Change logo' : 'Upload logo'} onUploaded={(u) => onChange(u)} />
        {url && (
          <Button color="error" onClick={() => onChange('')}>
            Remove
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

/** Editable school profile with a Save button. */
export function SchoolProfileForm({ school, mode }: { school: School; mode: SchoolMode }) {
  const [d, setD] = useState<SchoolDraft>(() => schoolDraft(school));
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => setD(schoolDraft(school)), [school]);
  const { reload } = useAuth();
  const save = useSend<Record<string, unknown>>('patch', `/schools/${school._id}`, {
    success: 'School details saved',
    invalidate: ['/schools', '/partners'],
    onSuccess: () => {
      if (mode === 'school') reload().catch(() => undefined);
    },
  });
  return (
    <Stack
      component="form"
      spacing={2}
      onSubmit={(e) => {
        e.preventDefault();
        const v = validateSchool(d);
        setErr(v);
        if (!v) save.mutate(schoolPayload(d, mode, false));
      }}
    >
      <LogoEditor url={d.logoUrl} onChange={(logoUrl) => setD({ ...d, logoUrl })} />
      <SchoolFields value={d} onChange={setD} mode={mode} />
      <FormError message={err} error={save.error} />
      <Box>
        <Button type="submit" variant="contained" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </Box>
    </Stack>
  );
}

/** Create a school, optionally with its first school admin (who is emailed an invite). */
export function SchoolCreateDialog({ mode, partnerId, onClose, onCreated }: { mode: 'admin' | 'partner'; partnerId?: string; onClose: () => void; onCreated?: (s: School) => void }) {
  const [d, setD] = useState<SchoolDraft>(() => ({ ...schoolDraft(), partnerId: partnerId ?? '' }));
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const create = useSend<Record<string, unknown>, { school: School; admin?: { email?: string } }>('post', '/schools', {
    invalidate: ['/schools', '/dashboard', '/partners'],
    onSuccess: (res) => {
      onClose();
      onCreated?.(res.school);
    },
    success: 'School created',
  });
  return (
    <FormDialog
      open
      title="Add school"
      maxWidth="md"
      onClose={onClose}
      loading={create.isPending}
      submitLabel="Create school"
      onSubmit={() => {
        const v = validateSchool(d) ?? (adminName.trim() || adminEmail.trim() ? (!adminName.trim() ? 'Enter the school admin’s name' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim()) ? 'Enter a valid email for the school admin' : null) : null);
        setErr(v);
        if (v) return;
        create.mutate({ ...schoolPayload(d, mode, true), ...(adminEmail.trim() ? { admin: { name: adminName.trim(), email: adminEmail.trim() } } : {}) });
      }}
    >
      <SchoolFields value={d} onChange={setD} mode={mode} creating />
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2">School admin (optional)</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          We will email them an invitation to set a password. You can add more admins later.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Admin name" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
          <TextField label="Admin email" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
        </Stack>
      </Paper>
      <FormError message={err} error={create.error} />
    </FormDialog>
  );
}

/* -------------------------------------------------------------- Report */

export interface SchoolReport {
  schoolId: string;
  classes: { class: { _id: string; name: string; grade: number; section: string }; students: number; avgProgress: number | null; avgQuiz: number | null; attendance30d: number | null }[];
}

function ProgressTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; progress: number; students: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <Paper variant="outlined" sx={{ px: 1.5, py: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 650 }}>
        {p.name}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Average progress {p.progress}% · {p.students} students
      </Typography>
    </Paper>
  );
}

/** Class-by-class progress, quiz and attendance table, with an optional bar chart. */
export function SchoolReportView({ schoolId, chart, classLink }: { schoolId: string; chart?: boolean; classLink?: (id: string) => string }) {
  const theme = useTheme();
  // Clarity look: soft lilac bars instead of the classic indigo
  const barColor = theme.palette.primary.main === '#17171C' ? '#A58BF0' : '#3F3DBF';
  const q = useGet<SchoolReport>(`/reports/schools/${schoolId}`);
  return (
    <QueryState q={q}>
      {(r) => {
        if (!r.classes.length) return <Empty title="No classes yet" hint="Create classes and assign courses to see progress here." />;
        const data = r.classes.map((c) => ({ name: c.class.name.replace(/^Grade /, 'G'), progress: c.avgProgress ?? 0, students: c.students }));
        const withStudents = r.classes.filter((c) => c.students);
        const avg = (xs: (number | null)[]) => {
          const v = xs.filter((x): x is number => x != null);
          return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
        };
        return (
          <>
            <CardGrid min={180}>
              <StatCard label="Classes" value={r.classes.length} />
              <StatCard label="Students" value={num(r.classes.reduce((s, c) => s + c.students, 0))} />
              <StatCard label="Average progress" value={pct(avg(withStudents.map((c) => c.avgProgress)))} />
              <StatCard label="Average quiz score" value={pct(avg(withStudents.map((c) => c.avgQuiz)))} />
              <StatCard label="Attendance (30 days)" value={pct(avg(withStudents.map((c) => c.attendance30d)))} />
            </CardGrid>
            <Box sx={{ mt: 3 }} />
            {chart && (
              <Section title="Average course progress by class">
                <Box sx={{ width: '100%', height: 280 }} role="img" aria-label="Bar chart of average course progress for each class. The same numbers are in the table below.">
                  <ResponsiveContainer>
                    <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="28%">
                      <CartesianGrid vertical={false} stroke="#E4E6F0" />
                      <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#C9CCDA' }} tick={{ fontSize: 12, fill: '#5C6079' }} interval={0} />
                      <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#5C6079' }} />
                      <ChartTooltip cursor={{ fill: 'rgba(63,61,191,0.06)' }} content={<ProgressTooltip />} />
                      <Bar dataKey="progress" fill={barColor} radius={[4, 4, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Section>
            )}
            <Section title="Classes">
              <DataTable
                rows={r.classes.map((c) => ({ ...c, _id: c.class._id }))}
                columns={[
                  {
                    key: 'class',
                    label: 'Class',
                    render: (c) =>
                      classLink ? (
                        <Typography component={RouterLink} to={classLink(c.class._id)} sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}>
                          {c.class.name}
                        </Typography>
                      ) : (
                        <Typography sx={{ fontWeight: 600 }}>{c.class.name}</Typography>
                      ),
                  },
                  { key: 'students', label: 'Students', align: 'right', render: (c) => c.students },
                  { key: 'progress', label: 'Course progress', width: 220, render: (c) => <Progress value={c.avgProgress} /> },
                  { key: 'quiz', label: 'Quiz average', align: 'right', render: (c) => pct(c.avgQuiz) },
                  { key: 'att', label: 'Attendance (30 days)', align: 'right', render: (c) => pct(c.attendance30d) },
                ]}
              />
            </Section>
          </>
        );
      }}
    </QueryState>
  );
}

/* ------------------------------------------------------- Course access */

/** Courses this school may use (its own grants), and partner courses not yet passed on to it. */
function SchoolCourses({ school, mode }: { school: School; mode: 'admin' | 'partner' }) {
  const base = useBase();
  const partnerId = refId(school.partnerId);
  const direct = useGet<CourseGrant[]>('/course-grants', { schoolId: school._id });
  const viaPartner = useGet<CourseGrant[]>(partnerId ? '/course-grants' : null, mode === 'admin' ? { partnerId } : undefined);
  const inUse = useGet<{ courseId: Course | string; classId: unknown }[]>('/class-courses', { schoolId: school._id });
  const allCourses = useGet<Paged<Course>>(mode === 'admin' ? '/courses' : null, { limit: 200 });
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [revoke, setRevoke] = useState<CourseGrant | null>(null);
  const grant = useSend<{ courseId: string; schoolId: string }>('post', '/course-grants', { success: 'Course granted to the school', invalidate: ['/course-grants', '/courses', '/dashboard'], onSuccess: () => { setOpen(false); setCourseId(''); } });
  const remove = useSend<string>('delete', (id) => `/course-grants/${id}`, { success: 'Access removed', invalidate: ['/course-grants', '/courses', '/dashboard'], onSuccess: () => setRevoke(null) });

  const directIds = new Set((direct.data ?? []).map((g) => refId(g.courseId)));
  const partnerGrants = (viaPartner.data ?? []).filter((g) => g.partnerId);
  const options: { _id: string; title: string; status?: string }[] =
    mode === 'admin' ? (allCourses.data?.items ?? []) : partnerGrants.map((g) => ({ _id: refId(g.courseId), title: g.courseId.title, status: g.courseId.status }));
  const available = options.filter((c) => !directIds.has(c._id));
  const classCount = (cid: string) => (inUse.data ?? []).filter((x) => refId(x.courseId) === cid).length;

  return (
    <>
      <Section
        title="Courses this school can use"
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
            Grant course
          </Button>
        }
      >
        <QueryState q={direct}>
          {(rows) => (
            <DataTable
              rows={rows}
              empty={<Empty title="No courses yet" hint="Grant a course so the school can assign it to classes." />}
              columns={[
                { key: 'title', label: 'Course', render: (g) => <Typography component={RouterLink} to={`${base}/courses/${refId(g.courseId)}`} sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}>{g.courseId?.title ?? 'Deleted course'}</Typography> },
                { key: 'status', label: 'Status', render: (g) => (g.courseId ? <StatusChip status={g.courseId.status} /> : '—') },
                { key: 'classes', label: 'Classes using it', align: 'right', render: (g) => classCount(refId(g.courseId)) },
                { key: 'since', label: 'Granted', render: (g) => fmtDate(g.createdAt) },
                { key: 'x', label: '', align: 'right', render: (g) => <Button size="small" color="error" startIcon={<DeleteOutlined />} onClick={() => setRevoke(g)}>Revoke</Button> },
              ]}
            />
          )}
        </QueryState>
      </Section>
      {partnerId && (
        <Section title={`Held by ${refName(school.partnerId) || 'the partner'}`}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Courses the partner holds. A school can use a partner course only after it is granted to the school above.
          </Typography>
          <QueryState q={viaPartner}>
            {() => (
              <DataTable
                rows={partnerGrants}
                empty={<Empty title="The partner holds no courses yet" />}
                columns={[
                  { key: 'title', label: 'Course', render: (g) => <Typography component={RouterLink} to={`${base}/courses/${refId(g.courseId)}`} sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}>{g.courseId?.title ?? 'Deleted course'}</Typography> },
                  { key: 'status', label: 'Status', render: (g) => (g.courseId ? <StatusChip status={g.courseId.status} /> : '—') },
                  { key: 'classes', label: 'Classes using it', align: 'right', render: (g) => classCount(refId(g.courseId)) },
                  { key: 'direct', label: '', render: (g) => (directIds.has(refId(g.courseId)) ? <Chip size="small" color="success" label="Granted to this school" /> : <Chip size="small" variant="outlined" label="Not granted yet" />) },
                ]}
              />
            )}
          </QueryState>
        </Section>
      )}
      <FormDialog open={open} title="Grant a course to this school" onClose={() => setOpen(false)} loading={grant.isPending} submitLabel="Grant" onSubmit={() => courseId && grant.mutate({ courseId, schoolId: school._id })}>
        {available.length ? (
          <TextField select label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
            {available.map((c) => (
              <MenuItem key={c._id} value={c._id}>
                {c.title}
                {c.status && c.status !== 'published' ? ` (${c.status})` : ''}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <Alert severity="info">{mode === 'partner' ? 'Every course your organisation holds is already granted to this school.' : 'This school already has every course.'}</Alert>
        )}
        <FormError error={grant.error} />
      </FormDialog>
      <ConfirmDialog
        open={!!revoke}
        danger
        title="Revoke this course?"
        message={`${revoke?.courseId?.title ?? 'The course'} will no longer be available to ${school.name}. Classes already using it keep their assignment, but no new classes can add it.`}
        confirmLabel="Revoke"
        loading={remove.isPending}
        onClose={() => setRevoke(null)}
        onConfirm={() => revoke && remove.mutate(revoke._id)}
      />
    </>
  );
}

/* --------------------------------------------------------------- Detail */

const TABS = ['overview', 'admins', 'classes', 'courses', 'report'] as const;

/** School detail page for super admins and partners. */
export function SchoolDetailView({ id, mode, backTo }: { id: string; mode: 'admin' | 'partner'; backTo: string }) {
  const base = useBase();
  const q = useGet<School>(`/schools/${id}`);
  const [tab, setTab] = useTab(TABS, 'overview');
  const classes = useGet<ClassSection[]>(tab === 'classes' ? '/classes' : null, { schoolId: id });
  const [addAdmin, setAddAdmin] = useState(false);
  const partnerLink = useMemo(() => (mode === 'admin' && q.data?.partnerId ? `${base}/partners/${refId(q.data.partnerId)}` : null), [mode, q.data, base]);
  return (
    <>
      <BackLink to={backTo} label="All schools" />
      <QueryState q={q}>
        {(s) => (
          <>
            <PageHeader
              title={
                <Stack component="span" direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Avatar src={s.logoUrl || undefined} variant="rounded" sx={{ bgcolor: 'primary.light' }}>
                    <SchoolOutlined />
                  </Avatar>
                  <span>{s.name}</span>
                </Stack>
              }
              subtitle={
                <>
                  {[s.code, s.board, [s.city, s.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ') || 'School'}
                  {partnerLink && (
                    <>
                      {' · '}
                      <Typography component={RouterLink} to={partnerLink} sx={{ color: 'primary.main', textDecoration: 'none' }}>
                        {refName(s.partnerId)}
                      </Typography>
                    </>
                  )}
                </>
              }
              actions={
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <StatusChip status={s.status} />
                  {mode === 'admin' && s.plan && <Chip size="small" variant="outlined" label={`${s.plan} plan`} sx={{ textTransform: 'capitalize' }} />}
                </Stack>
              }
            />
            <TabBar
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'overview', label: 'Overview' },
                { value: 'admins', label: 'People' },
                { value: 'classes', label: 'Classes' },
                { value: 'courses', label: 'Courses' },
                { value: 'report', label: 'Report' },
              ]}
            />
            {tab === 'overview' && (
              <>
                <CardGrid min={180}>
                  <StatCard label="Students" value={num(s.stats?.students)} icon={<SchoolOutlined />} />
                  <StatCard label="Teachers" value={num(s.stats?.teachers)} icon={<CoPresentOutlined />} />
                  <StatCard label="Parents" value={num(s.stats?.parents)} icon={<FamilyRestroomOutlined />} />
                  <StatCard label="Classes" value={num(s.stats?.classes)} icon={<ClassOutlined />} />
                </CardGrid>
                <Box sx={{ mt: 3 }} />
                <Section title="School details">
                  <SchoolProfileForm school={s} mode={mode} />
                </Section>
              </>
            )}
            {tab === 'admins' && (
              <>
                <Section
                  title="School admins"
                  action={
                    <Button variant="contained" startIcon={<Add />} onClick={() => setAddAdmin(true)}>
                      Add school admin
                    </Button>
                  }
                >
                  <PeopleDirectory role="school_admin" schoolId={s._id} columns={['phone', 'lastLogin']} statusFilter={false} emptyHint="Add a school admin so the school can manage its classes and people." />
                </Section>
                <Section title="Everyone at this school">
                  <PeopleDirectory roles={['teacher', 'student', 'parent']} schoolId={s._id} columns={['role', 'class', 'lastLogin']} />
                </Section>
                {addAdmin && <UserFormDialog roles={['school_admin']} schoolId={s._id} onClose={() => setAddAdmin(false)} />}
              </>
            )}
            {tab === 'classes' && (
              <Section title="Classes">
                <QueryState q={classes}>
                  {(rows) => (
                    <DataTable
                      rows={rows}
                      empty={<Empty title="No classes yet" hint="The school admin creates classes from the school portal." />}
                      columns={[
                        { key: 'name', label: 'Class', render: (c) => <Typography sx={{ fontWeight: 600 }}>{c.name}</Typography> },
                        { key: 'grade', label: 'Grade', render: (c) => c.grade },
                        { key: 'teacher', label: 'Class teacher', render: (c) => refName(c.classTeacherId) || '—' },
                        { key: 'students', label: 'Students', align: 'right', render: (c) => c.studentCount ?? 0 },
                        { key: 'year', label: 'Year', render: (c) => c.academicYear || '—' },
                      ]}
                    />
                  )}
                </QueryState>
              </Section>
            )}
            {tab === 'courses' && <SchoolCourses school={s} mode={mode} />}
            {tab === 'report' && <SchoolReportView schoolId={s._id} chart />}
          </>
        )}
      </QueryState>
    </>
  );
}
