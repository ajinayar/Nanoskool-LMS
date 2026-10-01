/**
 * People management shared by the admin, partner and school portals:
 * create/edit dialog for any role, row actions (suspend, reset password) and a filterable directory.
 */
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import Block from '@mui/icons-material/BlockOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import HowToReg from '@mui/icons-material/HowToRegOutlined';
import LockReset from '@mui/icons-material/LockResetOutlined';
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROLE_LABEL, refId, refName, type ClassSection, type Paged, type Partner, type Role, type School, type User } from '@/api/types';
import { useMe } from '@/auth/AuthContext';
import { useGet, useSend } from '@/lib/hooks';
import { useToast } from './Toast';
import { ConfirmDialog, DataTable, Empty, FormDialog, Loading, StatusChip, UserCell, fromNow, type Column } from './ui';
import { CredentialsDialog, FilterBar, FilterSelect, FormError, Pager, RowMenu, SearchField, useDebounced, type Credential } from './AdminCommon';

const SCHOOL_ROLES: Role[] = ['school_admin', 'teacher', 'student', 'parent'];
const USERNAME_RX = /^[a-zA-Z0-9._-]{3,60}$/;
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const signIn = (u: Pick<User, 'email' | 'username'>) => u.email ?? (u.username ? `@${u.username}` : '');

/* --------------------------------------------------------- Form dialog */

interface FormState {
  role: Role;
  name: string;
  signInBy: 'email' | 'username';
  email: string;
  username: string;
  phone: string;
  schoolId: string;
  partnerId: string;
  classId: string;
  rollNo: string;
  gender: string;
  dateOfBirth: string;
  childIds: string[];
  relation: string;
  subjects: string[];
  qualification: string;
}

function initialState(user: User | undefined, role: Role, schoolId?: string, partnerId?: string, preset?: Partial<FormState>): FormState {
  return {
    role: user?.role ?? role,
    name: user?.name ?? '',
    signInBy: user ? (user.email ? 'email' : 'username') : role === 'student' ? 'username' : 'email',
    email: user?.email ?? '',
    username: user?.username ?? '',
    phone: user?.phone ?? '',
    schoolId: user ? refId(user.schoolId) : (schoolId ?? ''),
    partnerId: user ? refId(user.partnerId) : (partnerId ?? ''),
    classId: user?.classId ? refId(user.classId) : '',
    rollNo: user?.rollNo ?? '',
    gender: user?.gender ?? '',
    dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '',
    childIds: (user?.childIds ?? []).map(refId),
    relation: user?.relation ?? '',
    subjects: user?.subjects ?? [],
    qualification: user?.qualification ?? '',
    ...preset,
  };
}

/**
 * Create or edit a person. `roles` limits which roles can be created.
 * `schoolId` fixes the school (school admin portal, or a school detail page).
 */
export function UserFormDialog({
  user,
  roles,
  schoolId,
  partnerId,
  preset,
  onClose,
  onSaved,
}: {
  user?: User;
  roles: Role[];
  schoolId?: string;
  partnerId?: string;
  preset?: Partial<FormState>;
  onClose: () => void;
  onSaved?: (u: User) => void;
}) {
  const me = useMe();
  const toast = useToast();
  const editing = !!user;
  const [f, setF] = useState<FormState>(() => initialState(user, roles[0], schoolId, partnerId, preset));
  const [err, setErr] = useState<string | null>(null);
  const [creds, setCreds] = useState<Credential[] | null>(null);
  const set = (patch: Partial<FormState>) => setF((s) => ({ ...s, ...patch }));

  const schoolRole = SCHOOL_ROLES.includes(f.role);
  const pickSchool = schoolRole && !schoolId && !editing && (me.role === 'super_admin' || me.role === 'partner');
  const effectiveSchool = f.schoolId || schoolId || (me.role === 'school_admin' ? (me.school?._id ?? '') : '');
  const schools = useGet<Paged<School>>(pickSchool ? '/schools' : null, { limit: 200 });
  const partners = useGet<Paged<Partner>>(f.role === 'partner' && !editing && me.role === 'super_admin' ? '/partners' : null, { limit: 200 });
  const classes = useGet<ClassSection[]>(f.role === 'student' && effectiveSchool ? '/classes' : null, me.role === 'school_admin' ? undefined : { schoolId: effectiveSchool });
  const students = useGet<Paged<User>>(f.role === 'parent' && effectiveSchool ? '/users' : null, { role: 'student', limit: 200, ...(me.role === 'school_admin' ? {} : { schoolId: effectiveSchool }) });

  const create = useSend<Record<string, unknown>, { user: User; tempPassword?: string }>('post', '/users', {
    invalidate: ['/users', '/dashboard', '/classes', '/schools', '/partners'],
    onSuccess: (res) => {
      onSaved?.(res.user);
      if (res.tempPassword) {
        toast.success(`${res.user.name} added`);
        setCreds([{ name: res.user.name, username: res.user.username, password: res.tempPassword }]);
      } else {
        toast.success(res.user.email ? `${res.user.name} added. An invitation was emailed to ${res.user.email}.` : `${res.user.name} added`);
        onClose();
      }
    },
  });
  const update = useSend<Record<string, unknown>, User>('patch', `/users/${user?._id}`, {
    success: 'Changes saved',
    invalidate: ['/users', '/classes', '/reports', '/progress'],
    onSuccess: (u) => {
      onSaved?.(u);
      onClose();
    },
  });
  const pending = create.isPending || update.isPending;

  const submit = () => {
    setErr(null);
    if (!f.name.trim()) return setErr('Enter a name');
    const allowUsername = f.role === 'student' || f.role === 'parent';
    const byUsername = allowUsername && f.signInBy === 'username';
    if (byUsername) {
      if (!USERNAME_RX.test(f.username.trim())) return setErr('Username must be at least 3 characters: letters, numbers, dots, dashes or underscores');
    } else if (!EMAIL_RX.test(f.email.trim())) return setErr('Enter a valid email address');
    if (!editing && schoolRole && !effectiveSchool) return setErr('Choose a school');
    if (!editing && f.role === 'partner' && !f.partnerId) return setErr('Choose a partner');
    if (f.role === 'parent' && !f.childIds.length) return setErr('Link at least one child');

    const body: Record<string, unknown> = { name: f.name.trim(), phone: f.phone.trim() || undefined };
    if (byUsername) {
      body.username = f.username.trim();
      if (f.email.trim()) body.email = f.email.trim();
    } else {
      body.email = f.email.trim();
      if (allowUsername && f.username.trim()) body.username = f.username.trim();
    }
    if (f.role === 'student') {
      body.classId = f.classId || null;
      body.rollNo = f.rollNo.trim() || undefined;
      body.gender = f.gender;
      if (f.dateOfBirth) body.dateOfBirth = f.dateOfBirth;
    }
    if (f.role === 'parent') {
      body.childIds = f.childIds;
      body.relation = f.relation.trim() || undefined;
    }
    if (f.role === 'teacher') {
      body.subjects = f.subjects;
      body.qualification = f.qualification.trim() || undefined;
    }
    if (editing) return update.mutate(body);
    body.role = f.role;
    if (schoolRole) body.schoolId = effectiveSchool;
    if (f.role === 'partner') body.partnerId = f.partnerId;
    create.mutate(body);
  };

  if (creds) return <CredentialsDialog open title={`Account created for ${creds[0].name}`} credentials={creds} onClose={onClose} />;

  const kids = students.data?.items ?? [];
  const selectedKids = kids.filter((k) => f.childIds.includes(k._id));
  const canUsername = f.role === 'student' || f.role === 'parent';

  return (
    <FormDialog open title={editing ? `Edit ${user!.name}` : `Add ${ROLE_LABEL[f.role].toLowerCase()}`} onClose={onClose} onSubmit={submit} loading={pending} submitLabel={editing ? 'Save changes' : 'Create account'}>
      {!editing && roles.length > 1 && (
        <TextField select label="Role" value={f.role} onChange={(e) => set({ role: e.target.value as Role, signInBy: e.target.value === 'student' ? 'username' : 'email', childIds: [], classId: '' })}>
          {roles.map((r) => (
            <MenuItem key={r} value={r}>
              {ROLE_LABEL[r]}
            </MenuItem>
          ))}
        </TextField>
      )}
      {pickSchool && (
        <TextField select label="School" value={f.schoolId} onChange={(e) => set({ schoolId: e.target.value, classId: '', childIds: [] })} required>
          {(schools.data?.items ?? []).map((s) => (
            <MenuItem key={s._id} value={s._id}>
              {s.name}
            </MenuItem>
          ))}
          {schools.data && !schools.data.items.length && <MenuItem disabled>No schools yet</MenuItem>}
        </TextField>
      )}
      {f.role === 'partner' && !editing && me.role === 'super_admin' && (
        <TextField select label="Partner" value={f.partnerId} onChange={(e) => set({ partnerId: e.target.value })} required>
          {(partners.data?.items ?? []).map((p) => (
            <MenuItem key={p._id} value={p._id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
      )}
      <TextField label="Full name" value={f.name} onChange={(e) => set({ name: e.target.value })} required autoFocus />
      {canUsername && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Signs in with
          </Typography>
          <ToggleButtonGroup size="small" exclusive value={f.signInBy} onChange={(_, v) => v && set({ signInBy: v })}>
            <ToggleButton value="email">Email</ToggleButton>
            <ToggleButton value="username">Username</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}
      {canUsername && f.signInBy === 'username' ? (
        <TextField
          label="Username"
          value={f.username}
          onChange={(e) => set({ username: e.target.value.replace(/\s/g, '') })}
          required
          helperText={editing ? 'Letters, numbers, dots, dashes' : 'A one-time password will be shown after saving. No email is sent.'}
        />
      ) : (
        <TextField label="Email" type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} required helperText={editing ? undefined : 'We email an invitation link to set a password'} />
      )}
      <TextField label="Phone" value={f.phone} onChange={(e) => set({ phone: e.target.value })} />
      {f.role === 'student' && (
        <>
          <TextField select label="Class" value={f.classId} onChange={(e) => set({ classId: e.target.value })} slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }} disabled={!effectiveSchool} helperText={!effectiveSchool ? 'Choose a school first' : undefined}>
            <MenuItem value="">
              <em>No class yet</em>
            </MenuItem>
            {(classes.data ?? []).map((c) => (
              <MenuItem key={c._id} value={c._id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Roll no." value={f.rollNo} onChange={(e) => set({ rollNo: e.target.value })} />
            <TextField select label="Gender" value={f.gender} onChange={(e) => set({ gender: e.target.value })} slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}>
              <MenuItem value="">Not specified</MenuItem>
              <MenuItem value="female">Female</MenuItem>
              <MenuItem value="male">Male</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
            <TextField label="Date of birth" type="date" value={f.dateOfBirth} onChange={(e) => set({ dateOfBirth: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
        </>
      )}
      {f.role === 'parent' && (
        <>
          <Autocomplete
            multiple
            options={kids}
            value={selectedKids}
            loading={students.isLoading}
            disabled={!effectiveSchool}
            getOptionLabel={(o) => `${o.name}${o.classId ? ` · ${refName(o.classId)}` : ''}`}
            isOptionEqualToValue={(a, b) => a._id === b._id}
            onChange={(_, v) => set({ childIds: v.map((x) => x._id) })}
            renderInput={(p) => <TextField {...p} label="Children" placeholder={selectedKids.length ? '' : 'Search students'} helperText={!effectiveSchool ? 'Choose a school first' : 'Students of this school'} />}
          />
          <TextField select label="Relation" value={f.relation} onChange={(e) => set({ relation: e.target.value })} slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}>
            <MenuItem value="">Not specified</MenuItem>
            {['Mother', 'Father', 'Guardian', 'Grandparent', 'Other'].map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
        </>
      )}
      {f.role === 'teacher' && (
        <>
          <Autocomplete
            multiple
            freeSolo
            options={['Robotics', 'Coding', 'Electronics', 'AI', 'Science', 'Mathematics', 'Computer Science', 'Design & Making']}
            value={f.subjects}
            onChange={(_, v) => set({ subjects: v.map(String) })}
            renderInput={(p) => <TextField {...p} label="Subjects" placeholder="Type and press Enter" />}
          />
          <TextField label="Qualification" value={f.qualification} onChange={(e) => set({ qualification: e.target.value })} />
        </>
      )}
      <FormError message={err} error={create.error ?? update.error} />
    </FormDialog>
  );
}

/* ---------------------------------------------------------- Row actions */

/** Loads the full record first, so rows with partial data (rosters, parent lists) edit safely. */
function EditUserLoader({ id, schoolId, onClose }: { id: string; schoolId?: string; onClose: () => void }) {
  const q = useGet<User>(`/users/${id}`);
  if (q.error) return <ConfirmDialog open title="Could not load this person" message={<FormError error={q.error} />} confirmLabel="Close" onConfirm={onClose} onClose={onClose} />;
  if (!q.data) return null;
  return <UserFormDialog user={q.data} roles={[q.data.role]} schoolId={schoolId} onClose={onClose} />;
}

/** Edit / suspend / activate / reset-password actions for a person, with their dialogs. */
export function useUserActions(opts: { roles?: Role[]; schoolId?: string } = {}) {
  const me = useMe();
  const toast = useToast();
  const [edit, setEdit] = useState<User | null>(null);
  const [statusFor, setStatusFor] = useState<User | null>(null);
  const [resetFor, setResetFor] = useState<User | null>(null);
  const [creds, setCreds] = useState<Credential[] | null>(null);
  const status = useSend<{ id: string; status: 'active' | 'suspended' }>('post', (b) => `/users/${b.id}/status`, {
    invalidate: ['/users', '/partners', '/schools'],
    onSuccess: (_, b) => {
      toast.success(b.status === 'suspended' ? 'Account suspended' : 'Account activated');
      setStatusFor(null);
    },
  });
  const reset = useSend<{ id: string; temporary?: boolean }, { emailed: boolean; tempPassword?: string }>('post', (b) => `/users/${b.id}/reset-password`, {
    onSuccess: (res) => {
      const u = resetFor;
      setResetFor(null);
      if (res.tempPassword && u) setCreds([{ name: u.name, username: u.username || u.email, password: res.tempPassword }]);
      else toast.success(`A password reset link was emailed to ${u?.email ?? 'the user'}`);
    },
  });

  const actions = (u: User) => [
    { label: 'Edit', icon: <EditOutlined fontSize="small" />, onClick: () => setEdit(u), hidden: u._id === me._id },
    { label: 'Reset password', icon: <LockReset fontSize="small" />, onClick: () => setResetFor(u), hidden: u._id === me._id },
    u.status === 'suspended'
      ? { label: 'Activate', icon: <HowToReg fontSize="small" />, onClick: () => setStatusFor(u), hidden: u._id === me._id }
      : { label: 'Suspend', icon: <Block fontSize="small" />, onClick: () => setStatusFor(u), danger: true, hidden: u._id === me._id },
  ];

  const dialogs: ReactNode = (
    <>
      {edit && <EditUserLoader id={edit._id} schoolId={opts.schoolId} onClose={() => setEdit(null)} />}
      <ConfirmDialog
        open={!!statusFor}
        title={statusFor?.status === 'suspended' ? `Activate ${statusFor?.name}?` : `Suspend ${statusFor?.name}?`}
        message={statusFor?.status === 'suspended' ? 'They will be able to sign in again.' : 'They will be signed out and cannot sign in until the account is activated again. Their records are kept.'}
        confirmLabel={statusFor?.status === 'suspended' ? 'Activate' : 'Suspend'}
        danger={statusFor?.status !== 'suspended'}
        loading={status.isPending}
        onClose={() => setStatusFor(null)}
        onConfirm={() => statusFor && status.mutate({ id: statusFor._id, status: statusFor.status === 'suspended' ? 'active' : 'suspended' })}
      />
      <Dialog open={!!resetFor} onClose={() => !reset.isPending && setResetFor(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reset password for {resetFor?.name}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {resetFor?.email
              ? `Email a reset link to ${resetFor.email} (their current password keeps working until they set a new one), or create a temporary password to give them yourself — useful while email is not set up.`
              : 'This account has no email, so a new temporary password will be created and shown to you once.'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            A temporary password replaces the current one straight away, and they must choose their own at first sign-in.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetFor(null)} disabled={reset.isPending}>
            Cancel
          </Button>
          <Button variant={resetFor?.email ? 'outlined' : 'contained'} disabled={reset.isPending} onClick={() => resetFor && reset.mutate({ id: resetFor._id, temporary: true })}>
            Create temporary password
          </Button>
          {resetFor?.email && (
            <Button variant="contained" disabled={reset.isPending} onClick={() => resetFor && reset.mutate({ id: resetFor._id })}>
              Email reset link
            </Button>
          )}
        </DialogActions>
      </Dialog>
      {creds && <CredentialsDialog open title="New one-time password" credentials={creds} onClose={() => setCreds(null)} />}
    </>
  );
  return { actions, dialogs, openEdit: setEdit };
}

/* ------------------------------------------------------------ Directory */

export type PeopleColumn = 'role' | 'school' | 'class' | 'rollNo' | 'children' | 'subjects' | 'phone' | 'lastLogin';

/**
 * Filterable, paged list of people with row actions.
 * Pass `role` to fix the role, or `roles` to offer a role filter.
 */
export function PeopleDirectory({
  role,
  roles,
  createRoles,
  columns,
  schools,
  schoolId,
  classFilter,
  initialClassId,
  statusFilter = true,
  rowLink,
  createOpen,
  onCreateClose,
  extraFilters,
  emptyHint,
}: {
  role?: Role;
  roles?: Role[];
  createRoles?: Role[];
  columns: PeopleColumn[];
  /** Offer a school filter with these schools */
  schools?: { _id: string; name: string }[];
  /** Fixed school (school detail pages) */
  schoolId?: string;
  classFilter?: ClassSection[];
  initialClassId?: string;
  statusFilter?: boolean;
  rowLink?: (u: User) => string | undefined;
  createOpen?: boolean;
  onCreateClose?: () => void;
  extraFilters?: ReactNode;
  emptyHint?: ReactNode;
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [roleF, setRoleF] = useState<string>('');
  const [schoolF, setSchoolF] = useState<string>('');
  const [classF, setClassF] = useState<string>(initialClassId ?? '');
  const [statusF, setStatusF] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const params = useMemo(
    () => ({
      q: dq || undefined,
      role: role ?? (roleF || undefined),
      schoolId: schoolId ?? (schoolF || undefined),
      classId: classF || undefined,
      status: statusF || undefined,
      page,
      limit,
    }),
    [dq, role, roleF, schoolId, schoolF, classF, statusF, page, limit],
  );
  const list = useGet<Paged<User>>('/users', params);
  const ua = useUserActions({ schoolId });
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  const cols: Column<User>[] = [
    { key: 'name', label: 'Name', render: (u) => <UserCell name={u.name} sub={signIn(u)} avatarUrl={u.avatarUrl} /> },
  ];
  if (columns.includes('role')) cols.push({ key: 'role', label: 'Role', render: (u) => ROLE_LABEL[u.role] });
  if (columns.includes('school')) cols.push({ key: 'school', label: 'School', render: (u) => refName(u.schoolId) || '—' });
  if (columns.includes('class')) cols.push({ key: 'class', label: 'Class', render: (u) => (u.role === 'student' ? refName(u.classId) || <Typography variant="body2" color="warning.main">No class</Typography> : '—') });
  if (columns.includes('rollNo')) cols.push({ key: 'roll', label: 'Roll no.', render: (u) => u.rollNo || '—' });
  if (columns.includes('children'))
    cols.push({
      key: 'children',
      label: 'Children',
      render: (u) =>
        u.childIds?.length ? (
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            {u.childIds.map((c) => (
              <Chip key={refId(c)} size="small" label={refName(c) || 'Student'} />
            ))}
          </Stack>
        ) : (
          '—'
        ),
    });
  if (columns.includes('subjects')) cols.push({ key: 'subjects', label: 'Subjects', render: (u) => (u.subjects?.length ? u.subjects.join(', ') : '—') });
  if (columns.includes('phone')) cols.push({ key: 'phone', label: 'Phone', render: (u) => u.phone || '—' });
  cols.push({ key: 'status', label: 'Status', render: (u) => <StatusChip status={u.status} /> });
  if (columns.includes('lastLogin')) cols.push({ key: 'last', label: 'Last sign-in', render: (u) => (u.lastLoginAt ? fromNow(u.lastLoginAt) : 'Never') });
  cols.push({ key: 'actions', label: '', align: 'right', width: 56, render: (u) => <RowMenu actions={ua.actions(u)} /> });

  const filtered = !!(dq || roleF || schoolF || classF || statusF);
  return (
    <>
      <FilterBar>
        <SearchField value={q} onChange={resetPage(setQ)} placeholder="Search name, email, username" />
        {!role && roles && <FilterSelect label="Role" value={roleF} onChange={resetPage(setRoleF)} allLabel="All roles" width={170} options={roles.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />}
        {schools && !schoolId && <FilterSelect label="School" value={schoolF} onChange={resetPage(setSchoolF)} allLabel="All schools" width={220} options={schools.map((s) => ({ value: s._id, label: s.name }))} />}
        {classFilter && <FilterSelect label="Class" value={classF} onChange={resetPage(setClassF)} allLabel="All classes" width={180} options={classFilter.map((c) => ({ value: c._id, label: c.name }))} />}
        {statusFilter && (
          <FilterSelect
            label="Status"
            value={statusF}
            onChange={resetPage(setStatusF)}
            allLabel="Any status"
            width={150}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'suspended', label: 'Suspended' },
            ]}
          />
        )}
        {extraFilters}
        {list.data && (
          <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: 'auto !important' } }}>
            {list.data.total} {list.data.total === 1 ? 'person' : 'people'}
          </Typography>
        )}
      </FilterBar>
      {list.isLoading ? (
        <Loading />
      ) : list.error ? (
        <FormError error={list.error} />
      ) : (
        <>
          <DataTable
            rows={list.data?.items ?? []}
            columns={cols}
            onRowClick={rowLink ? (u) => { const to = rowLink(u); if (to) navigate(to); } : undefined}
            empty={<Empty title={filtered ? 'No one matches these filters' : 'No one here yet'} hint={filtered ? 'Try a different search or clear the filters.' : emptyHint} />}
          />
          <Pager total={list.data?.total ?? 0} page={page} limit={limit} onPage={setPage} onLimit={setLimit} />
        </>
      )}
      {ua.dialogs}
      {createOpen && createRoles && (
        <UserFormDialog roles={role && !createRoles.length ? [role] : createRoles} schoolId={schoolId} onClose={() => onCreateClose?.()} preset={classF && createRoles[0] === 'student' ? { classId: classF } : undefined} />
      )}
    </>
  );
}
