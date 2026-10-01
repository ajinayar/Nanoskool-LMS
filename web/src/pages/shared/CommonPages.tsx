import { Avatar, Box, Button, Card, CardContent, Checkbox, Chip, FormControlLabel, FormGroup, MenuItem, Stack, TextField, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import CampaignOutlined from '@mui/icons-material/CampaignOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import PushPin from '@mui/icons-material/PushPin';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { api } from '@/api/client';
import { ROLE_LABEL, refId, refName, type Announcement, type ClassSection, type SchoolEvent } from '@/api/types';
import { useAuth, useMe } from '@/auth/AuthContext';
import { PORTAL_BASE } from '@/portals/types';
import { useGet, useSend } from '@/lib/hooks';
import { useToast } from '@/components/Toast';
import { ChangePasswordForm } from './AuthPages';
import { ConfirmDialog, Empty, FormDialog, PageHeader, QueryState, RichText, Section, UploadButton, fmtDate, fromNow } from '@/components/ui';
import { RichEditor } from '@/components/RichEditor';
import { useTheme } from '@mui/material/styles';
import { isClarity } from '@/theme-clarity';
import { ClarityAnnouncements } from './ClarityAnnouncements';
import { ClarityEvents } from './ClarityEvents';
import { AnnouncementsBoard, EventRow, EventsBoard } from './ColourfulBoards';

export const useBase = () => PORTAL_BASE[useMe().role];

/* ------------------------------------------------------------- Profile */

export function ProfilePage() {
  const me = useMe();
  const { reload } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(me.name);
  const [phone, setPhone] = useState(me.phone ?? '');
  const save = async (patch: Record<string, unknown>) => {
    await api.patch('/auth/me', patch);
    await reload();
    toast.success('Profile updated');
  };
  return (
    <>
      <PageHeader title="My profile" subtitle={`${ROLE_LABEL[me.role]}${me.school ? ` · ${me.school.name}` : ''}${me.partner && !me.school ? ` · ${me.partner.name}` : ''}`} />
      <Section title="Personal details">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ alignItems: { sm: 'flex-start' } }}>
          <Stack spacing={1} sx={{ alignItems: 'center' }}>
            <Avatar src={me.avatarUrl} sx={{ width: 88, height: 88, fontSize: 32, bgcolor: 'primary.main' }}>
              {me.name[0]}
            </Avatar>
            <UploadButton folder="avatars" accept="image/*" label="Change photo" onUploaded={(url) => save({ avatarUrl: url })} />
          </Stack>
          <Stack spacing={2} sx={{ flex: 1, maxWidth: 480 }}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <TextField label="Sign-in" value={me.email ?? me.username ?? ''} disabled helperText="Ask your administrator to change your sign-in" />
            {me.class && <TextField label="Class" value={me.class.name} disabled />}
            <Box>
              <Button variant="contained" onClick={() => save({ name, phone })}>
                Save changes
              </Button>
            </Box>
          </Stack>
        </Stack>
      </Section>
      {me.role === 'parent' && me.children.length > 0 && (
        <Section title="My children">
          <Stack spacing={1}>
            {me.children.map((c) => (
              <Typography key={c._id}>
                {c.name} {c.classId && typeof c.classId === 'object' ? `· ${c.classId.name}` : ''}
              </Typography>
            ))}
          </Stack>
        </Section>
      )}
      <Section title="Change password">
        <ChangePasswordForm />
      </Section>
    </>
  );
}

/* ------------------------------------------------------- Announcements */

export const scopeLabel = (a: Announcement) => (a.scope === 'global' ? 'Nanoskool' : a.scope === 'partner' ? 'Partner' : a.scope === 'school' ? refName(a.schoolId) || 'School' : refName(a.classId) || 'Class');

export function AnnouncementList({ items, onDelete }: { items: Announcement[]; onDelete?: (a: Announcement) => void }) {
  const me = useMe();
  if (!items.length) return <Empty title="No announcements" />;
  return (
    <Stack spacing={2}>
      {items.map((a) => (
        <Card key={a._id}>
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
              {a.pinned && <PushPin fontSize="small" color="secondary" />}
              <Typography variant="h6" sx={{ flex: 1 }}>
                {a.title}
              </Typography>
              <Chip size="small" label={scopeLabel(a)} />
              {a.kind !== 'announcement' && <Chip size="small" variant="outlined" label={a.kind} />}
              {a.audience?.length > 0 && <Chip size="small" variant="outlined" label={`For ${a.audience.map((r) => ROLE_LABEL[r as keyof typeof ROLE_LABEL] ?? r).join(', ')}`} />}
            </Stack>
            <RichText html={a.body} />
            <Stack direction="row" sx={{ mt: 1, alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">
                {refName(a.createdBy)} · {fromNow(a.createdAt)}
              </Typography>
              {onDelete && (refId(a.createdBy) === me._id || me.role === 'super_admin' || (me.role === 'school_admin' && refId(a.schoolId) === me.school?._id)) && (
                <Button size="small" color="error" startIcon={<DeleteOutline />} onClick={() => onDelete(a)}>
                  Delete
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

export function AnnouncementsPage() {
  const me = useMe();
  const q = useGet<Announcement[]>('/announcements');
  const canPost = me.role !== 'student' && me.role !== 'parent';
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<Announcement | null>(null);
  const remove = useSend('delete', (a: Announcement) => `/announcements/${a._id}`, { success: 'Deleted', invalidate: ['/announcements'], onSuccess: () => setDel(null) });
  const theme = useTheme();
  const clarity = isClarity(theme);
  return (
    <>
      {clarity ? (
        <QueryState q={q}>{(items) => <ClarityAnnouncements items={items} canPost={canPost} onNew={() => setOpen(true)} onDelete={setDel} />}</QueryState>
      ) : (
        <>
          <PageHeader
            title="Announcements"
            subtitle="News and notices for you"
            actions={
              canPost && (
                <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
                  New announcement
                </Button>
              )
            }
          />
          <QueryState q={q}>{(items) => <AnnouncementsBoard items={items} onDelete={canPost ? setDel : undefined} />}</QueryState>
        </>
      )}
      {open && <AnnouncementDialog onClose={() => setOpen(false)} />}
      <ConfirmDialog open={!!del} title="Delete announcement?" danger confirmLabel="Delete" onClose={() => setDel(null)} onConfirm={() => del && remove.mutate(del)} />
    </>
  );
}

function AnnouncementDialog({ onClose }: { onClose: () => void }) {
  const me = useMe();
  const scopes = me.role === 'super_admin' ? ['global', 'school'] : me.role === 'partner' ? ['partner', 'school'] : me.role === 'school_admin' ? ['school', 'class'] : ['class'];
  const [scope, setScope] = useState(scopes[0]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [classId, setClassId] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [audience, setAudience] = useState<string[]>([]);
  const [pinned, setPinned] = useState(false);
  const [kind, setKind] = useState('announcement');
  const classes = useGet<ClassSection[]>(scope === 'class' ? '/classes' : null);
  const schools = useGet<{ items: { _id: string; name: string }[] }>(scope === 'school' && (me.role === 'super_admin' || me.role === 'partner') ? '/schools' : null, { limit: 200 });
  const send = useSend('post', '/announcements', { success: 'Announcement posted', invalidate: ['/announcements', '/dashboard'], onSuccess: onClose });
  return (
    <FormDialog
      open
      title="New announcement"
      onClose={onClose}
      loading={send.isPending}
      submitLabel="Post"
      maxWidth="md"
      onSubmit={() => send.mutate({ scope, title, body, audience, pinned, kind, ...(scope === 'class' ? { classId } : {}), ...(scope === 'school' && schoolId ? { schoolId } : {}) })}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField select label="Send to" value={scope} onChange={(e) => setScope(e.target.value)}>
          {scopes.map((s) => (
            <MenuItem key={s} value={s}>
              {s === 'global' ? 'Everyone on Nanoskool' : s === 'partner' ? 'All my schools' : s === 'school' ? 'A whole school' : 'One class'}
            </MenuItem>
          ))}
        </TextField>
        {scope === 'class' && (
          <TextField select label="Class" value={classId} onChange={(e) => setClassId(e.target.value)} required>
            {(classes.data ?? []).map((c) => (
              <MenuItem key={c._id} value={c._id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
        )}
        {scope === 'school' && schools.data && (
          <TextField select label="School" value={schoolId} onChange={(e) => setSchoolId(e.target.value)} required>
            {schools.data.items.map((s) => (
              <MenuItem key={s._id} value={s._id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
        )}
        <TextField select label="Type" value={kind} onChange={(e) => setKind(e.target.value)}>
          <MenuItem value="announcement">Announcement</MenuItem>
          <MenuItem value="news">News</MenuItem>
          <MenuItem value="newsletter">Newsletter</MenuItem>
        </TextField>
      </Stack>
      <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <RichEditor value={body} onChange={setBody} uploadFolder="announcements" minHeight={140} />
      <Box>
        <Typography variant="body2" color="text.secondary">
          Only for (leave empty for everyone):
        </Typography>
        <FormGroup row>
          {['teacher', 'student', 'parent', ...(scope !== 'class' ? ['school_admin'] : [])].map((r) => (
            <FormControlLabel
              key={r}
              control={<Checkbox size="small" checked={audience.includes(r)} onChange={(e) => setAudience(e.target.checked ? [...audience, r] : audience.filter((x) => x !== r))} />}
              label={ROLE_LABEL[r as keyof typeof ROLE_LABEL]}
            />
          ))}
          <FormControlLabel control={<Checkbox size="small" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />} label="Pin to top" />
        </FormGroup>
      </Box>
    </FormDialog>
  );
}

/* --------------------------------------------------------------- Events */

export function EventList({ items, onDelete }: { items: SchoolEvent[]; onDelete?: (e: SchoolEvent) => void }) {
  if (!items.length) return <Empty title="No upcoming events" />;
  return (
    <Stack spacing={1.75}>
      {items.map((e) => (
        <EventRow key={e._id} e={e} onDelete={onDelete} compact />
      ))}
    </Stack>
  );
}

export function EventsPage() {
  const me = useMe();
  const [showPast, setShowPast] = useState(false);
  const q = useGet<SchoolEvent[]>('/events', showPast ? { from: dayjs().subtract(90, 'day').toISOString() } : { from: dayjs().startOf('day').toISOString() });
  const canPost = me.role === 'super_admin' || me.role === 'school_admin' || me.role === 'teacher';
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<SchoolEvent | null>(null);
  const remove = useSend('delete', (e: SchoolEvent) => `/events/${e._id}`, { success: 'Event deleted', invalidate: ['/events'], onSuccess: () => setDel(null) });
  const theme = useTheme();
  if (isClarity(theme)) {
    return (
      <>
        <ClarityEvents canPost={canPost} onNew={() => setOpen(true)} onDelete={setDel} />
        {open && <EventDialog onClose={() => setOpen(false)} />}
        <ConfirmDialog open={!!del} title="Delete event?" danger confirmLabel="Delete" onClose={() => setDel(null)} onConfirm={() => del && remove.mutate(del)} />
      </>
    );
  }
  return (
    <>
      <PageHeader
        title="Events calendar"
        subtitle="School and class events"
        actions={
          <>
            <Button onClick={() => setShowPast(!showPast)}>{showPast ? 'Upcoming only' : 'Show past 90 days'}</Button>
            {canPost && (
              <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
                Add event
              </Button>
            )}
          </>
        }
      />
      <QueryState q={q}>{(items) => <EventsBoard items={items} past={showPast} onDelete={canPost ? setDel : undefined} />}</QueryState>
      {open && <EventDialog onClose={() => setOpen(false)} />}
      <ConfirmDialog open={!!del} title="Delete event?" danger confirmLabel="Delete" onClose={() => setDel(null)} onConfirm={() => del && remove.mutate(del)} />
    </>
  );
}

function EventDialog({ onClose }: { onClose: () => void }) {
  const me = useMe();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startsAt, setStartsAt] = useState(dayjs().add(1, 'day').hour(10).minute(0).format('YYYY-MM-DDTHH:mm'));
  const [classId, setClassId] = useState('');
  const classes = useGet<ClassSection[]>(me.role !== 'super_admin' ? '/classes' : null);
  const send = useSend('post', '/events', { success: 'Event added', invalidate: ['/events', '/dashboard'], onSuccess: onClose });
  return (
    <FormDialog open title="Add event" onClose={onClose} loading={send.isPending} onSubmit={() => send.mutate({ title, description, location, startsAt: new Date(startsAt).toISOString(), ...(classId ? { classId } : {}) })}>
      <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <TextField label="Starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} required />
      <TextField label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
      {me.role !== 'super_admin' && (
        <TextField select label={me.role === 'teacher' ? 'Class' : 'Class (optional)'} value={classId} onChange={(e) => setClassId(e.target.value)} required={me.role === 'teacher'}>
          {me.role === 'school_admin' && <MenuItem value="">Whole school</MenuItem>}
          {(classes.data ?? []).map((c) => (
            <MenuItem key={c._id} value={c._id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      )}
      <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={3} />
    </FormDialog>
  );
}

export function AnnouncementsWidget({ limit = 3 }: { limit?: number }) {
  const q = useGet<Announcement[]>('/announcements', { limit });
  const base = useBase();
  return (
    <Section
      title={
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <CampaignOutlined /> <span>Announcements</span>
        </Stack>
      }
      action={
        <Button component={RouterLink} to={`${base}/announcements`}>
          View all
        </Button>
      }
    >
      <QueryState q={q}>
        {(items) =>
          items.length ? (
            <Stack spacing={1.5}>
              {items.map((a) => (
                <Box key={a._id}>
                  <Typography sx={{ fontWeight: 600 }}>{a.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {scopeLabel(a)} · {fmtDate(a.createdAt)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          ) : (
            <Empty title="No announcements" />
          )
        }
      </QueryState>
    </Section>
  );
}

export function EventsWidget({ events }: { events?: SchoolEvent[] }) {
  const base = useBase();
  const q = useGet<SchoolEvent[]>(events ? null : '/events', { from: dayjs().startOf('day').toISOString() });
  const list = (events ?? q.data ?? []).slice(0, 4);
  return (
    <Section
      title={
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <EventOutlined /> <span>Upcoming events</span>
        </Stack>
      }
      action={
        <Button component={RouterLink} to={`${base}/events`}>
          Calendar
        </Button>
      }
    >
      <EventList items={list} />
    </Section>
  );
}
