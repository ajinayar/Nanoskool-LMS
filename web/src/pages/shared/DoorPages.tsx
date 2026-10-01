/**
 * Doors to performance (nanoskool.com): 8 doors to learning and 4 support platforms.
 * Opened down the same chain as courses: super admin → partner → school → teachers.
 *   AdminDoorsPage    catalogue (edit, logos) + who has which door (partners and schools)
 *   PartnerDoorsPage  open my doors for my schools
 *   SchoolDoorsPage   the school's doors and the teachers on each
 *   TeacherDoorsPage  doors I am part of
 * Only selection for now; each door's own activities come later.
 */
import { Alert, Autocomplete, Avatar, AvatarGroup, Box, Button, Checkbox, Chip, FormControlLabel, IconButton, Link, MenuItem, Paper, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import EditOutlined from '@mui/icons-material/EditOutlined';
import OpenInNew from '@mui/icons-material/OpenInNew';
import LockOutlined from '@mui/icons-material/LockOutlined';
import StarRounded from '@mui/icons-material/StarRounded';
import { useMemo, useState } from 'react';
import { useGet, useSend } from '@/lib/hooks';
import { Empty, FormDialog, PageHeader, QueryState, UploadButton } from '@/components/ui';
import { TabBar, useTab } from '@/components/AdminCommon';
import { useMe } from '@/auth/AuthContext';

export interface Door {
  _id: string;
  key: string;
  kind: 'door' | 'platform';
  name: string;
  tagline?: string;
  description?: string;
  audience?: string;
  url?: string;
  logoUrl?: string;
  color?: string;
  position?: number;
  active?: boolean;
}
type Person = { _id: string; name: string; email?: string; avatarUrl?: string };
type Grant = { doorId: string; partnerId?: string; schoolId?: string; viaPartnerId?: string };
type Access = { doors: Door[]; partners: { _id: string; name: string }[]; schools: { _id: string; name: string; partnerId?: string; city?: string }[]; grants: Grant[] };

const KIND_LABEL = { door: 'Doors to learning', platform: 'Support platforms' } as const;

/* ------------------------------------------------------------------ Pieces */

/** The door's own logo (most are wide), or a monogram tile in its colour until a logo is added. */
export function DoorLogo({ d, size = 44, wide = false }: { d: Pick<Door, 'name' | 'logoUrl' | 'color'>; size?: number; wide?: boolean }) {
  const c = d.color ?? '#3F3DBF';
  if (d.logoUrl)
    return wide ? (
      <Box component="img" src={d.logoUrl} alt={`${d.name} logo`} sx={{ height: size, width: 'auto', maxWidth: size * 3.4, objectFit: 'contain', objectPosition: 'left center', flexShrink: 0, display: 'block' }} />
    ) : (
      <Box
        component="img"
        src={d.logoUrl}
        alt={`${d.name} logo`}
        sx={{ width: size, height: size, p: `${Math.max(2, Math.round(size * 0.08))}px`, borderRadius: `${Math.round(size * 0.28)}px`, objectFit: 'contain', bgcolor: '#fff', border: '1px solid #ECEBF2', flexShrink: 0, boxSizing: 'border-box' }}
      />
    );
  const initials = d.name
    .replace(/&/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: `${Math.round(size * 0.28)}px`,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        color: '#fff',
        fontWeight: 800,
        fontSize: size * 0.36,
        letterSpacing: '-0.02em',
        background: `linear-gradient(135deg, ${c}, ${c}B3)`,
      }}
    >
      {initials}
    </Box>
  );
}

function DoorCard({ d, children, muted }: { d: Door; children?: React.ReactNode; muted?: boolean }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.25, borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: 1.5, opacity: muted ? 0.6 : 1, height: '100%' }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', justifyContent: 'space-between', minHeight: 56 }}>
        <DoorLogo d={d} size={56} wide />
        {d.url && (
          <Tooltip title="Open on nanoskool.com">
            <IconButton size="small" component="a" href={d.url} target="_blank" rel="noopener" aria-label={`${d.name} on nanoskool.com`}>
              <OpenInNew fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      <Box>
        <Typography sx={{ fontWeight: 750, lineHeight: 1.3 }}>{d.name}</Typography>
        {d.tagline && (
          <Typography variant="body2" sx={{ color: d.color ?? 'text.secondary', fontWeight: 650 }}>
            {d.tagline}
          </Typography>
        )}
      </Box>
      {d.description && (
        <Typography variant="body2" color="text.secondary">
          {d.description}
        </Typography>
      )}
      {d.audience && <Chip size="small" label={d.audience} sx={{ alignSelf: 'flex-start', fontWeight: 650 }} />}
      {children && <Box sx={{ mt: 'auto' }}>{children}</Box>}
    </Paper>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' } }}>{children}</Box>;
}

function ByKind({ doors, render }: { doors: Door[]; render: (d: Door) => React.ReactNode }) {
  return (
    <Stack spacing={3.5}>
      {(['door', 'platform'] as const).map((k) => {
        const list = doors.filter((d) => d.kind === k);
        if (!list.length) return null;
        return (
          <Box key={k}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary', mb: 1.5 }}>
              {list.length} {KIND_LABEL[k]}
            </Typography>
            <Grid>{list.map(render)}</Grid>
          </Box>
        );
      })}
    </Stack>
  );
}

/**
 * The selection grid: one row per partner or school, one column per door.
 * `state` says what a cell is; `onToggle` opens or closes it.
 */
function DoorMatrix({
  doors,
  rows,
  state,
  onToggle,
}: {
  doors: Door[];
  rows: { _id: string; name: string; sub?: string }[];
  state: (rowId: string, doorId: string) => { on: boolean; note?: string; locked?: boolean };
  onToggle: (rowId: string, doorId: string, open: boolean) => Promise<unknown>;
  busy?: boolean;
}) {
  // Show the tick at once; undo it if the server says no
  const [over, setOver] = useState<Record<string, boolean>>({});
  const flip = (rowId: string, doorId: string, open: boolean) => {
    const k = `${rowId}:${doorId}`;
    setOver((o) => ({ ...o, [k]: open }));
    onToggle(rowId, doorId, open).catch(() => setOver((o) => ({ ...o, [k]: !open })));
  };
  if (!rows.length || !doors.length) return null;
  return (
    <Paper variant="outlined" sx={{ borderRadius: '16px', overflow: 'auto' }}>
      <Box component="table" sx={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 220 + doors.length * 92, '& th, & td': { borderBottom: '1px solid #EEEDF3', p: 1 } }}>
        <thead>
          <tr>
            <Box component="th" sx={{ position: 'sticky', left: 0, bgcolor: '#fff', zIndex: 1, textAlign: 'left', minWidth: 220 }} />
            {doors.map((d) => (
              <Box component="th" key={d._id} sx={{ width: 92, verticalAlign: 'bottom' }}>
                <Tooltip title={d.tagline ?? ''}>
                  <Stack spacing={0.75} sx={{ alignItems: 'center' }}>
                    <DoorLogo d={d} size={30} wide />
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.2, textAlign: 'center' }}>{d.name}</Typography>
                  </Stack>
                </Tooltip>
              </Box>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._id}>
              <Box component="td" sx={{ position: 'sticky', left: 0, bgcolor: '#fff', zIndex: 1 }}>
                <Typography sx={{ fontWeight: 650, fontSize: 14.5 }}>{r.name}</Typography>
                {r.sub && (
                  <Typography variant="caption" color="text.secondary">
                    {r.sub}
                  </Typography>
                )}
              </Box>
              {doors.map((d) => {
                const base = state(r._id, d._id);
                const s = { ...base, on: over[`${r._id}:${d._id}`] ?? base.on };
                return (
                  <Box component="td" key={d._id} sx={{ textAlign: 'center' }}>
                    <Tooltip title={s.note ?? (s.on ? 'Open — click to close' : 'Closed — click to open')}>
                      <span>
                        <Checkbox
                          checked={s.on}
                          disabled={s.locked}
                          onChange={(e) => flip(r._id, d._id, e.target.checked)}
                          slotProps={{ input: { 'aria-label': `${d.name} for ${r.name}` } }}
                          sx={{ color: d.color, '&.Mui-checked': { color: d.color } }}
                        />
                      </span>
                    </Tooltip>
                  </Box>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Box>
    </Paper>
  );
}

function useToggle() {
  return useSend<{ doorId: string; partnerId?: string; schoolId?: string; open: boolean }>('put', '/door-grants', { invalidate: ['/doors', '/schools'] });
}

/* ------------------------------------------------------------------ Super admin */

const ADMIN_TABS = ['catalogue', 'access'] as const;

export function AdminDoorsPage() {
  const [tab, setTab] = useTab(ADMIN_TABS, 'catalogue');
  return (
    <>
      <PageHeader title="Genius Doors" subtitle="Nanoskool’s 8 doors to learning and 4 support platforms. Open them for partners; partners open them for their schools; school admins choose the teachers." />
      <TabBar
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'catalogue', label: 'All doors' },
          { value: 'access', label: 'Who has which door' },
        ]}
      />
      {tab === 'catalogue' ? <Catalogue /> : <AdminAccess />}
    </>
  );
}

function Catalogue() {
  const q = useGet<Door[]>('/doors', { all: true });
  const [edit, setEdit] = useState<Door | null>(null);
  return (
    <QueryState q={q}>
      {(doors) => (
        <>
          <ByKind
            doors={doors}
            render={(d) => (
              <DoorCard key={d._id} d={d} muted={d.active === false}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">
                    {d.active === false ? 'Hidden from partners and schools' : d.logoUrl ? 'Logo added' : 'No logo yet'}
                  </Typography>
                  <Button size="small" startIcon={<EditOutlined />} onClick={() => setEdit(d)}>
                    Edit
                  </Button>
                </Stack>
              </DoorCard>
            )}
          />
          {edit && <DoorDialog d={edit} onClose={() => setEdit(null)} />}
        </>
      )}
    </QueryState>
  );
}

function DoorDialog({ d, onClose }: { d: Door; onClose: () => void }) {
  const [x, setX] = useState<Door>(d);
  const save = useSend<Partial<Door>>('patch', `/doors/${d._id}`, { success: 'Door saved', invalidate: ['/doors'], onSuccess: onClose });
  const set = (p: Partial<Door>) => setX({ ...x, ...p });
  return (
    <FormDialog
      open
      title={`Edit ${d.name}`}
      onClose={onClose}
      loading={save.isPending}
      maxWidth="md"
      onSubmit={() => save.mutate({ name: x.name, kind: x.kind, tagline: x.tagline ?? '', description: x.description ?? '', audience: x.audience ?? '', url: x.url ?? '', logoUrl: x.logoUrl ?? '', color: x.color ?? '', active: x.active !== false })}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <DoorLogo d={x} size={64} />
        <Stack spacing={1}>
          <UploadButton folder="doors" accept="image/png,image/jpeg,image/svg+xml,image/webp" label={x.logoUrl ? 'Replace logo' : 'Upload logo'} onUploaded={(url) => set({ logoUrl: url })} />
          {x.logoUrl && (
            <Button size="small" color="error" onClick={() => set({ logoUrl: '' })} sx={{ alignSelf: 'flex-start' }}>
              Remove logo
            </Button>
          )}
        </Stack>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Name" value={x.name} onChange={(e) => set({ name: e.target.value })} required sx={{ flex: 2 }} />
        <TextField select label="Type" value={x.kind} onChange={(e) => set({ kind: e.target.value as Door['kind'] })} sx={{ flex: 1 }}>
          <MenuItem value="door">Door to learning</MenuItem>
          <MenuItem value="platform">Support platform</MenuItem>
        </TextField>
      </Stack>
      <TextField label="Tagline" value={x.tagline ?? ''} onChange={(e) => set({ tagline: e.target.value })} placeholder="e.g. Build · Code · Invent" />
      <TextField label="What it is" value={x.description ?? ''} onChange={(e) => set({ description: e.target.value })} multiline minRows={2} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Who it is for" value={x.audience ?? ''} onChange={(e) => set({ audience: e.target.value })} placeholder="e.g. Grades 6–9" sx={{ flex: 1 }} />
        <TextField label="Colour" value={x.color ?? ''} onChange={(e) => set({ color: e.target.value })} placeholder="#2563EB" sx={{ width: { sm: 160 } }} />
      </Stack>
      <TextField label="Page on nanoskool.com" value={x.url ?? ''} onChange={(e) => set({ url: e.target.value })} placeholder="https://nanoskool.com/…" />
      <FormControlLabel control={<Switch checked={x.active !== false} onChange={(e) => set({ active: e.target.checked })} />} label="Offer this door to partners and schools" />
    </FormDialog>
  );
}

function AdminAccess() {
  const q = useGet<Access>('/doors/access');
  const toggle = useToggle();
  const [level, setLevel] = useState<'partners' | 'schools'>('partners');
  const [kind, setKind] = useState<'door' | 'platform'>('door');
  return (
    <QueryState q={q}>
      {(a) => {
        const doors = a.doors.filter((d) => d.kind === kind);
        const partnerName = new Map(a.partners.map((p) => [p._id, p.name]));
        const has = (f: (g: Grant) => boolean) => a.grants.find(f);
        return (
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
              <ToggleButtonGroup size="small" exclusive value={level} onChange={(_, v) => v && setLevel(v)}>
                <ToggleButton value="partners">Partners ({a.partners.length})</ToggleButton>
                <ToggleButton value="schools">Schools ({a.schools.length})</ToggleButton>
              </ToggleButtonGroup>
              <ToggleButtonGroup size="small" exclusive value={kind} onChange={(_, v) => v && setKind(v)}>
                <ToggleButton value="door">Doors to learning</ToggleButton>
                <ToggleButton value="platform">Support platforms</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {level === 'partners'
                ? 'Tick a door to open it for a partner. The partner can then open it for its schools. Closing it here also closes it for the schools the partner opened it for.'
                : 'Usually partners open doors for their schools. You can also open a door straight for one school here.'}
            </Typography>
            {level === 'partners' ? (
              a.partners.length ? (
                <DoorMatrix
                  doors={doors}
                  rows={a.partners.map((p) => ({ ...p, sub: `${a.schools.filter((s) => s.partnerId === p._id).length} schools` }))}
                  state={(pid, did) => ({ on: !!has((g) => g.partnerId === pid && g.doorId === did) })}
                  onToggle={(pid, did, open) => toggle.mutateAsync({ doorId: did, partnerId: pid, open })}
                  busy={toggle.isPending}
                />
              ) : (
                <Empty title="No partners yet" />
              )
            ) : (
              <DoorMatrix
                doors={doors}
                rows={a.schools.map((s) => ({ _id: s._id, name: s.name, sub: [s.partnerId ? partnerName.get(s.partnerId) : 'No partner', s.city].filter(Boolean).join(' · ') }))}
                state={(sid, did) => {
                  const g = has((x) => x.schoolId === sid && x.doorId === did);
                  return { on: !!g, note: g ? (g.viaPartnerId ? `Opened by ${partnerName.get(g.viaPartnerId) ?? 'the partner'} — click to close` : 'Opened by Nanoskool — click to close') : undefined };
                }}
                onToggle={(sid, did, open) => toggle.mutateAsync({ doorId: did, schoolId: sid, open })}
                busy={toggle.isPending}
              />
            )}
          </Stack>
        );
      }}
    </QueryState>
  );
}

/* ------------------------------------------------------------------ Partner */

export function PartnerDoorsPage() {
  const q = useGet<Access>('/doors/access');
  const toggle = useToggle();
  return (
    <>
      <PageHeader title="Genius Doors" subtitle="Open the doors Nanoskool has given you for each of your schools. School admins then choose the teachers." />
      <QueryState q={q}>
        {(a) =>
          a.doors.length ? (
            <Stack spacing={3}>
              <DoorMatrix
                doors={a.doors}
                rows={a.schools.map((s) => ({ _id: s._id, name: s.name, sub: s.city }))}
                state={(sid, did) => ({ on: !!a.grants.find((g) => g.schoolId === sid && g.doorId === did) })}
                onToggle={(sid, did, open) => toggle.mutateAsync({ doorId: did, schoolId: sid, open })}
                busy={toggle.isPending}
              />
              <ByKind
                doors={a.doors}
                render={(d) => (
                  <DoorCard key={d._id} d={d}>
                    {
                      <Typography variant="caption" color="text.secondary">
                        Open in {a.grants.filter((g) => g.doorId === d._id).length} of {a.schools.length} schools
                      </Typography>
                    }
                  </DoorCard>
                )}
              />
            </Stack>
          ) : (
            <Empty title="No Genius Doors yet" hint="Nanoskool has not opened any Genius Doors for your organisation yet. Ask your Nanoskool contact." />
          )
        }
      </QueryState>
    </>
  );
}

/* ------------------------------------------------------------------ School admin */

type SchoolDoor = Door & { open: boolean; via: 'partner' | 'nanoskool' | null; partnerHas: boolean; team: { teacher: Person; lead: boolean }[] };
type SchoolDoors = { school: { _id: string; name: string }; teachers: Person[]; doors: SchoolDoor[] };

export function SchoolDoorsPage({ schoolId: given }: { schoolId?: string } = {}) {
  const me = useMe();
  const schoolId = given ?? me.school?._id ?? '';
  const q = useGet<SchoolDoors>(schoolId ? `/schools/${schoolId}/doors` : null);
  const [team, setTeam] = useState<SchoolDoor | null>(null);
  return (
    <>
      {!given && <PageHeader title="Genius Doors" subtitle="The Nanoskool programmes open for your school. Choose the teachers who run each one." />}
      <QueryState q={q}>
        {(s) => {
          const open = s.doors.filter((d) => d.open);
          const closed = s.doors.filter((d) => !d.open);
          return (
            <Stack spacing={4}>
              {open.length ? (
                <ByKind
                  doors={open}
                  render={(d) => {
                    const sd = d as SchoolDoor;
                    return (
                      <DoorCard key={d._id} d={d}>
                        <Stack spacing={1.25}>
                          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                            {sd.team.length ? (
                              <AvatarGroup max={5} sx={{ '& .MuiAvatar-root': { width: 30, height: 30, fontSize: 13 } }}>
                                {sd.team.map((t) => (
                                  <Tooltip key={t.teacher._id} title={`${t.teacher.name}${t.lead ? ' (lead)' : ''}`}>
                                    <Avatar src={t.teacher.avatarUrl}>{t.teacher.name[0]}</Avatar>
                                  </Tooltip>
                                ))}
                              </AvatarGroup>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No teachers yet
                              </Typography>
                            )}
                            <Button size="small" variant={sd.team.length ? 'text' : 'contained'} onClick={() => setTeam(sd)}>
                              {sd.team.length ? 'Change teachers' : 'Choose teachers'}
                            </Button>
                          </Stack>
                          {sd.team.find((t) => t.lead) && (
                            <Typography variant="caption" color="text.secondary">
                              Lead: {sd.team.find((t) => t.lead)!.teacher.name}
                            </Typography>
                          )}
                        </Stack>
                      </DoorCard>
                    );
                  }}
                />
              ) : (
                <Alert severity="info">No doors are open for {s.school.name} yet. Your partner opens them; ask them about the programmes below.</Alert>
              )}
              {closed.length > 0 && (
                <Box>
                  <Typography sx={{ fontWeight: 750, mb: 0.5 }}>More doors from Nanoskool</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Not open for your school yet. Your partner can open them for you.
                  </Typography>
                  <Grid>
                    {closed.map((d) => (
                      <DoorCard key={d._id} d={d} muted>
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                          <LockOutlined sx={{ fontSize: 16 }} />
                          <Typography variant="caption">{d.partnerHas ? 'Your partner has this door — ask them to open it' : 'Talk to your partner about this Genius Door'}</Typography>
                        </Stack>
                      </DoorCard>
                    ))}
                  </Grid>
                </Box>
              )}
              {team && <TeamDialog schoolId={schoolId} d={team} teachers={s.teachers} onClose={() => setTeam(null)} />}
            </Stack>
          );
        }}
      </QueryState>
    </>
  );
}

function TeamDialog({ schoolId, d, teachers, onClose }: { schoolId: string; d: SchoolDoor; teachers: Person[]; onClose: () => void }) {
  const [picked, setPicked] = useState<Person[]>(() => teachers.filter((t) => d.team.some((x) => x.teacher._id === t._id)));
  const [lead, setLead] = useState<string>(d.team.find((t) => t.lead)?.teacher._id ?? '');
  const save = useSend<{ teacherIds: string[]; leadId: string | null }>('put', `/schools/${schoolId}/doors/${d._id}/team`, { success: 'Team saved', invalidate: ['/schools', '/me/doors'], onSuccess: onClose });
  const leadOk = picked.some((p) => p._id === lead);
  return (
    <FormDialog open title={`Teachers for ${d.name}`} onClose={onClose} loading={save.isPending} onSubmit={() => save.mutate({ teacherIds: picked.map((p) => p._id), leadId: leadOk ? lead : null })}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <DoorLogo d={d} size={40} />
        <Typography variant="body2" color="text.secondary">
          Choose the teachers who run {d.name} at your school, and one lead to coordinate it.
        </Typography>
      </Stack>
      <Autocomplete
        multiple
        options={teachers}
        value={picked}
        onChange={(_, v) => setPicked(v)}
        getOptionLabel={(t) => t.name}
        isOptionEqualToValue={(a, b) => a._id === b._id}
        renderInput={(p) => <TextField {...p} label="Teachers" placeholder={picked.length ? '' : 'Type a name'} />}
        noOptionsText="No teachers found"
      />
      <TextField select label="Lead teacher (optional)" value={leadOk ? lead : ''} onChange={(e) => setLead(e.target.value)} disabled={!picked.length} slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}>
        <MenuItem value="">No lead yet</MenuItem>
        {picked.map((p) => (
          <MenuItem key={p._id} value={p._id}>
            {p.name}
          </MenuItem>
        ))}
      </TextField>
    </FormDialog>
  );
}

/* ------------------------------------------------------------------ Teacher */

type MyDoor = Door & { lead: boolean; team: { teacher: Person; lead: boolean }[] };

export function TeacherDoorsPage() {
  const q = useGet<MyDoor[]>('/me/doors');
  return (
    <>
      <PageHeader title="My Genius Doors" subtitle="The Nanoskool programmes your school has asked you to run." />
      <QueryState q={q}>
        {(list) =>
          list.length ? (
            <Grid>
              {list.map((d) => (
                <DoorCard key={d._id} d={d}>
                  <Stack spacing={1}>
                    {d.lead && <Chip size="small" icon={<StarRounded />} label="You lead this door" color="warning" sx={{ alignSelf: 'flex-start', fontWeight: 700 }} />}
                    <Typography variant="caption" color="text.secondary">
                      Team: {d.team.map((t) => t.teacher.name + (t.lead ? ' (lead)' : '')).join(', ')}
                    </Typography>
                    {d.url && (
                      <Link href={d.url} target="_blank" rel="noopener" variant="body2">
                        About {d.name}
                      </Link>
                    )}
                  </Stack>
                </DoorCard>
              ))}
            </Grid>
          ) : (
            <Empty title="No Genius Doors yet" hint="When your school admin puts you on a Genius Door’s team, it shows here." />
          )
        }
      </QueryState>
    </>
  );
}

/** Small summary for dashboards: open doors as logos. */
export function DoorStrip({ doors }: { doors: Door[] }) {
  const list = useMemo(() => doors.slice(0, 12), [doors]);
  return (
    <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
      {list.map((d) => (
        <Tooltip key={d._id} title={d.name}>
          <span>
            <DoorLogo d={d} size={36} />
          </span>
        </Tooltip>
      ))}
    </Stack>
  );
}
