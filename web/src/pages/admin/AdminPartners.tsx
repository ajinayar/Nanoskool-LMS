import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import HandshakeOutlined from '@mui/icons-material/HandshakeOutlined';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { refId, type Course, type CourseGrant, type Paged, type Partner, type School, type User } from '@/api/types';
import { useGet, useSend } from '@/lib/hooks';
import { ConfirmDialog, DataTable, Empty, FormDialog, PageHeader, QueryState, Section, StatusChip, UserCell, fmtDate, fromNow } from '@/components/ui';
import { BackLink, FilterBar, FormError, Pager, RowMenu, SearchField, useCreateParam, useDebounced } from '@/components/AdminCommon';
import { signIn, useUserActions } from '@/components/AdminPeople';

type PartnerDraft = Omit<Partner, '_id' | 'schoolCount'>;
const draftOf = (p?: Partner): PartnerDraft => ({
  name: p?.name ?? '',
  code: p?.code ?? '',
  contactName: p?.contactName ?? '',
  contactEmail: p?.contactEmail ?? '',
  contactPhone: p?.contactPhone ?? '',
  city: p?.city ?? '',
  state: p?.state ?? '',
  country: p?.country ?? 'India',
  status: p?.status ?? 'active',
});
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validate = (d: PartnerDraft) => (d.name.trim().length < 2 ? 'Enter the partner name' : d.contactEmail && !EMAIL_RX.test(d.contactEmail.trim()) ? 'Enter a valid contact email' : null);
/** Trims strings. Empty codes are left out: the code is unique, so an empty string would clash with other partners. */
const clean = (d: PartnerDraft, creating = false) =>
  Object.fromEntries(
    Object.entries(d)
      .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v] as const)
      .filter(([k, v]) => !(v === '' && (creating || k === 'code'))),
  );

function PartnerFields({ value, onChange, showStatus }: { value: PartnerDraft; onChange: (d: PartnerDraft) => void; showStatus?: boolean }) {
  const set = (p: Partial<PartnerDraft>) => onChange({ ...value, ...p });
  const row = { direction: { xs: 'column', sm: 'row' } as const, spacing: 2 };
  return (
    <Stack spacing={2}>
      <Stack {...row}>
        <TextField label="Partner name" value={value.name} onChange={(e) => set({ name: e.target.value })} required sx={{ flex: 2 }} />
        <TextField label="Code" value={value.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} sx={{ flex: 1 }} slotProps={{ htmlInput: { maxLength: 20 } }} />
      </Stack>
      <Stack {...row}>
        <TextField label="Contact person" value={value.contactName} onChange={(e) => set({ contactName: e.target.value })} />
        <TextField label="Contact email" type="email" value={value.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} />
        <TextField label="Contact phone" value={value.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} />
      </Stack>
      <Stack {...row}>
        <TextField label="City" value={value.city} onChange={(e) => set({ city: e.target.value })} />
        <TextField label="State" value={value.state} onChange={(e) => set({ state: e.target.value })} />
        <TextField label="Country" value={value.country} onChange={(e) => set({ country: e.target.value })} />
      </Stack>
      {showStatus && (
        <TextField select label="Status" value={value.status} onChange={(e) => set({ status: e.target.value as Partner['status'] })} sx={{ maxWidth: { sm: 240 } }}>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
      )}
    </Stack>
  );
}

function CreatePartnerDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [d, setD] = useState(draftOf());
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const create = useSend<Record<string, unknown>, { partner: Partner }>('post', '/partners', {
    success: 'Partner created',
    invalidate: ['/partners', '/dashboard'],
    onSuccess: (r) => {
      onClose();
      navigate(`/admin/partners/${r.partner._id}`);
    },
  });
  return (
    <FormDialog
      open
      title="Add partner"
      maxWidth="md"
      onClose={onClose}
      loading={create.isPending}
      submitLabel="Create partner"
      onSubmit={() => {
        const hasAdmin = !!(adminName.trim() || adminEmail.trim());
        const v = validate(d) ?? (hasAdmin && !adminName.trim() ? 'Enter the partner login’s name' : hasAdmin && !EMAIL_RX.test(adminEmail.trim()) ? 'Enter a valid email for the partner login' : null);
        setErr(v);
        if (!v) create.mutate({ ...clean(d, true), status: undefined, ...(hasAdmin ? { admin: { name: adminName.trim(), email: adminEmail.trim() } } : {}) });
      }}
    >
      <PartnerFields value={d} onChange={setD} />
      <Box sx={{ p: 2, border: '1px solid #E4E6F0', borderRadius: 2 }}>
        <Typography variant="subtitle2">Partner login (optional)</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Creates a partner account and emails them an invitation to set a password.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Name" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
          <TextField label="Email" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
        </Stack>
      </Box>
      <FormError message={err} error={create.error} />
    </FormDialog>
  );
}

export function PartnersPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [open, setOpen] = useCreateParam();
  const list = useGet<Paged<Partner>>('/partners', { q: dq || undefined, page, limit });
  return (
    <>
      <PageHeader
        title="Partners"
        subtitle="Organisations that bring Nanoskool to their schools"
        actions={
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
            Add partner
          </Button>
        }
      />
      <FilterBar>
        <SearchField value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search partners" />
      </FilterBar>
      <Section title={list.data ? `${list.data.total} partner${list.data.total === 1 ? '' : 's'}` : 'Partners'}>
        <QueryState q={list}>
          {(d) => (
            <>
              <DataTable
                rows={d.items}
                onRowClick={(p) => navigate(`/admin/partners/${p._id}`)}
                empty={<Empty title={dq ? 'No partners match your search' : 'No partners yet'} hint={dq ? undefined : 'Add your first partner organisation.'} action={!dq && <Button startIcon={<Add />} onClick={() => setOpen(true)}>Add partner</Button>} />}
                columns={[
                  { key: 'name', label: 'Partner', render: (p) => <UserCell name={p.name} sub={p.code} /> },
                  { key: 'contact', label: 'Contact', render: (p) => (p.contactName || p.contactEmail ? <Box><Typography variant="body2">{p.contactName || '—'}</Typography><Typography variant="caption" color="text.secondary">{p.contactEmail}</Typography></Box> : '—') },
                  { key: 'city', label: 'Location', render: (p) => [p.city, p.state].filter(Boolean).join(', ') || '—' },
                  { key: 'schools', label: 'Schools', align: 'right', render: (p) => p.schoolCount ?? 0 },
                  { key: 'status', label: 'Status', render: (p) => <StatusChip status={p.status} /> },
                ]}
              />
              <Pager total={d.total} page={page} limit={limit} onPage={setPage} onLimit={setLimit} />
            </>
          )}
        </QueryState>
      </Section>
      {open && <CreatePartnerDialog onClose={() => setOpen(false)} />}
    </>
  );
}

/* --------------------------------------------------------------- Detail */

type PartnerDetail = Partner & { schools: School[]; users: User[] };

function PartnerCourses({ partnerId }: { partnerId: string }) {
  const grants = useGet<CourseGrant[]>('/course-grants', { partnerId });
  const courses = useGet<Paged<Course>>('/courses', { limit: 200 });
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [revoke, setRevoke] = useState<CourseGrant | null>(null);
  const grant = useSend<{ courseId: string; partnerId: string }>('post', '/course-grants', { success: 'Course granted', invalidate: ['/course-grants', '/dashboard'], onSuccess: () => { setOpen(false); setCourseId(''); } });
  const remove = useSend<string>('delete', (id) => `/course-grants/${id}`, { success: 'Access removed', invalidate: ['/course-grants', '/dashboard'], onSuccess: () => setRevoke(null) });
  const held = new Set((grants.data ?? []).filter((g) => g.partnerId).map((g) => refId(g.courseId)));
  const available = (courses.data?.items ?? []).filter((c) => !held.has(c._id));
  return (
    <Section title="Courses" action={<Button startIcon={<Add />} variant="contained" onClick={() => setOpen(true)}>Grant course</Button>}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Every school of this partner can use these courses.
      </Typography>
      <QueryState q={grants}>
        {(rows) => (
          <DataTable
            rows={rows.filter((g) => g.partnerId)}
            empty={<Empty title="No courses granted yet" />}
            columns={[
              { key: 'course', label: 'Course', render: (g) => <Typography component={RouterLink} to={`/admin/courses/${refId(g.courseId)}/edit`} sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}>{g.courseId?.title ?? 'Deleted course'}</Typography> },
              { key: 'status', label: 'Status', render: (g) => (g.courseId ? <StatusChip status={g.courseId.status} /> : '—') },
              { key: 'since', label: 'Granted', render: (g) => fmtDate(g.createdAt) },
              { key: 'x', label: '', align: 'right', render: (g) => <Button size="small" color="error" startIcon={<DeleteOutlined />} onClick={() => setRevoke(g)}>Revoke</Button> },
            ]}
          />
        )}
      </QueryState>
      <FormDialog open={open} title="Grant a course to this partner" onClose={() => setOpen(false)} loading={grant.isPending} submitLabel="Grant" onSubmit={() => courseId && grant.mutate({ courseId, partnerId })}>
        {available.length ? (
          <TextField select label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
            {available.map((c) => (
              <MenuItem key={c._id} value={c._id}>
                {c.title}
                {c.status !== 'published' ? ` (${c.status})` : ''}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <Alert severity="info">This partner already holds every course.</Alert>
        )}
        <FormError error={grant.error} />
      </FormDialog>
      <ConfirmDialog
        open={!!revoke}
        danger
        title="Revoke this course?"
        message={`Schools of this partner will lose access to ${revoke?.courseId?.title ?? 'the course'} unless it was granted to them directly. Existing class assignments are kept but students can no longer open it.`}
        confirmLabel="Revoke"
        loading={remove.isPending}
        onClose={() => setRevoke(null)}
        onConfirm={() => revoke && remove.mutate(revoke._id)}
      />
    </Section>
  );
}

function AddPartnerUserDialog({ partnerId, onClose }: { partnerId: string; onClose: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const add = useSend<{ name: string; email: string }, User>('post', `/partners/${partnerId}/users`, { invalidate: ['/partners', '/users'], onSuccess: () => onClose(), success: 'Partner login created. An invitation was emailed.' });
  return (
    <FormDialog
      open
      title="Add partner login"
      onClose={onClose}
      loading={add.isPending}
      submitLabel="Create and invite"
      onSubmit={() => {
        const v = !name.trim() ? 'Enter a name' : !EMAIL_RX.test(email.trim()) ? 'Enter a valid email' : null;
        setErr(v);
        if (!v) add.mutate({ name: name.trim(), email: email.trim() });
      }}
    >
      <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required helperText="We email an invitation link to set a password" />
      <FormError message={err} error={add.error} />
    </FormDialog>
  );
}

export function PartnerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const q = useGet<PartnerDetail>(`/partners/${id}`);
  const [d, setD] = useState<PartnerDraft>(draftOf());
  const [err, setErr] = useState<string | null>(null);
  const [addUser, setAddUser] = useState(false);
  useEffect(() => {
    if (q.data) setD(draftOf(q.data));
  }, [q.data]);
  const save = useSend<Record<string, unknown>>('patch', `/partners/${id}`, { success: 'Partner saved', invalidate: ['/partners'] });
  const ua = useUserActions();
  return (
    <>
      <BackLink to="/admin/partners" label="All partners" />
      <QueryState q={q}>
        {(p) => (
          <>
            <PageHeader
              title={
                <Stack component="span" direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <HandshakeOutlined color="primary" />
                  <span>{p.name}</span>
                </Stack>
              }
              subtitle={`${p.schools.length} school${p.schools.length === 1 ? '' : 's'}${p.city ? ` · ${p.city}` : ''}`}
              actions={<StatusChip status={p.status} />}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: 3, alignItems: 'start' }}>
              <Box>
                <Section title="Partner details">
                  <Stack
                    component="form"
                    spacing={2}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const v = validate(d);
                      setErr(v);
                      if (!v) save.mutate(clean(d));
                    }}
                  >
                    <PartnerFields value={d} onChange={setD} showStatus />
                    <FormError message={err} error={save.error} />
                    <Box>
                      <Button type="submit" variant="contained" disabled={save.isPending}>
                        {save.isPending ? 'Saving…' : 'Save changes'}
                      </Button>
                    </Box>
                  </Stack>
                </Section>
                <PartnerCourses partnerId={p._id} />
              </Box>
              <Box>
                <Section title="Schools" action={<Button startIcon={<Add />} component={RouterLink} to={`/admin/schools?new=1&partnerId=${p._id}`}>Add school</Button>}>
                  <DataTable
                    rows={p.schools}
                    onRowClick={(s) => navigate(`/admin/schools/${s._id}`)}
                    empty={<Empty title="No schools yet" />}
                    columns={[
                      { key: 'name', label: 'School', render: (s) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.name}</Typography> },
                      { key: 'city', label: 'City', render: (s) => s.city || '—' },
                      { key: 'status', label: 'Status', render: (s) => <StatusChip status={s.status} /> },
                    ]}
                  />
                </Section>
                <Section title="Partner logins" action={<Button startIcon={<Add />} onClick={() => setAddUser(true)}>Add login</Button>}>
                  <DataTable
                    rows={p.users}
                    empty={<Empty title="No partner logins" hint="Add someone from the partner so they can manage their schools." />}
                    columns={[
                      { key: 'name', label: 'Name', render: (u) => <UserCell name={u.name} sub={signIn(u)} /> },
                      { key: 'last', label: 'Last sign-in', render: (u) => (u.lastLoginAt ? fromNow(u.lastLoginAt) : 'Never') },
                      { key: 'status', label: 'Status', render: (u) => <StatusChip status={u.status} /> },
                      { key: 'x', label: '', align: 'right', render: (u) => <RowMenu actions={ua.actions(u)} /> },
                    ]}
                  />
                </Section>
              </Box>
            </Box>
            {addUser && <AddPartnerUserDialog partnerId={p._id} onClose={() => setAddUser(false)} />}
            {ua.dialogs}
          </>
        )}
      </QueryState>
    </>
  );
}
