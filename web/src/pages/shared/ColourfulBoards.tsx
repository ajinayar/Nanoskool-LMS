/**
 * Events and announcements in the colourful look (teacher and parent portals).
 * Events: grouped by when they happen, with a month calendar beside the list.
 * Announcements: filter by where they came from, pinned ones first and highlighted.
 */
import { Avatar, Box, ButtonBase, Card, CardContent, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Close from '@mui/icons-material/Close';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import PublicOutlined from '@mui/icons-material/PublicOutlined';
import PushPin from '@mui/icons-material/PushPin';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import HubOutlined from '@mui/icons-material/HubOutlined';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState, type ReactNode } from 'react';
import { ROLE_LABEL, refId, refName, type Announcement, type SchoolEvent } from '@/api/types';
import { useMe } from '@/auth/AuthContext';
import { Empty, RichText, fromNow } from '@/components/ui';
import { GroupLabel, IconTile, RowMenu, Segmented, TONE, Toolbar, relative, type Tone } from '@/components/ListKit';

/* ---------------------------------------------------------------- Events */

type Aud = 'class' | 'school' | 'all';
const AUD: Record<Aud, { tone: Tone; label: string; icon: ReactNode }> = {
  class: { tone: 'indigo', label: 'Class', icon: <GroupsOutlined /> },
  school: { tone: 'orange', label: 'School', icon: <SchoolOutlined /> },
  all: { tone: 'green', label: 'All schools', icon: <PublicOutlined /> },
};
const audOf = (e: SchoolEvent): Aud => (e.classId ? 'class' : e.schoolId ? 'school' : 'all');
const audName = (e: SchoolEvent) => refName(e.classId) || refName(e.schoolId) || 'All schools';

function DateTile({ d, tone, past }: { d: Dayjs; tone: Tone; past?: boolean }) {
  const c = past ? TONE.grey : TONE[tone];
  return (
    <Box sx={{ width: 58, flexShrink: 0, borderRadius: '14px', overflow: 'hidden', textAlign: 'center', border: `1px solid ${alpha(c, 0.25)}`, bgcolor: '#fff' }}>
      <Box sx={{ bgcolor: c, color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', py: 0.25, textTransform: 'uppercase' }}>{d.format('MMM')}</Box>
      <Typography sx={{ fontWeight: 800, fontSize: 22, lineHeight: 1.15, pt: 0.25, color: past ? 'text.secondary' : 'text.primary' }}>{d.format('D')}</Typography>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', pb: 0.4 }}>{d.format('ddd')}</Typography>
    </Box>
  );
}

export function EventRow({ e, onDelete, compact }: { e: SchoolEvent; onDelete?: (e: SchoolEvent) => void; compact?: boolean }) {
  const d = dayjs(e.startsAt);
  const a = AUD[audOf(e)];
  const past = d.isBefore(dayjs());
  const rel = relative(e.startsAt);
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', p: compact ? 0 : 1.25, mx: compact ? 0 : -1.25, borderRadius: '14px', '&:hover': compact ? undefined : { bgcolor: '#F7F8FC' } }}>
      <DateTile d={d} tone={a.tone} past={past} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 750, fontSize: 16, color: past ? 'text.secondary' : 'text.primary' }}>{e.title}</Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', columnGap: 1.75, rowGap: 0.5, mt: 0.5, color: 'text.secondary', alignItems: 'center', '& svg': { fontSize: 16 } }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <ScheduleOutlined />
            <Typography variant="body2">
              {d.format('h:mm A')}
              {e.endsAt ? `–${dayjs(e.endsAt).format('h:mm A')}` : ''}
            </Typography>
          </Stack>
          {e.location && (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <PlaceOutlined />
              <Typography variant="body2">{e.location}</Typography>
            </Stack>
          )}
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.15, borderRadius: '8px', bgcolor: alpha(TONE[a.tone], 0.1), color: TONE[a.tone], fontSize: 12.5, fontWeight: 700 }}>
            {a.icon}
            {audName(e)}
          </Box>
        </Stack>
        {e.description && !compact && (
          <Typography variant="body2" sx={{ mt: 0.75, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {e.description}
          </Typography>
        )}
      </Box>
      {!compact && rel && (
        <Typography variant="body2" sx={{ fontWeight: 750, whiteSpace: 'nowrap', pt: 0.25, color: past ? 'text.disabled' : rel.tone === 'grey' ? 'text.secondary' : TONE[rel.tone], display: { xs: 'none', sm: 'block' } }}>
          {past ? 'Done' : rel.text}
        </Typography>
      )}
      {onDelete && <RowMenu label={`Actions for ${e.title}`} actions={[{ label: 'Delete event', icon: <DeleteOutlined />, onClick: () => onDelete(e), danger: true }]} />}
    </Stack>
  );
}

function groupEvents(items: SchoolEvent[]) {
  const now = dayjs();
  const today = now.startOf('day');
  const groups: { key: string; label: string; items: SchoolEvent[] }[] = [];
  const add = (key: string, label: string, e: SchoolEvent) => {
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, label, items: [] }));
    g.items.push(e);
  };
  for (const e of [...items].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))) {
    const d = dayjs(e.startsAt);
    const days = d.startOf('day').diff(today, 'day');
    if (d.isBefore(now) && days < 0) add('past', 'Earlier', e);
    else if (days <= 0) add('today', 'Today', e);
    else if (days === 1) add('tomorrow', 'Tomorrow', e);
    else if (days < 7) add('week', 'This week', e);
    else add(d.format('YYYY-MM'), d.format(d.year() === now.year() ? 'MMMM' : 'MMMM YYYY'), e);
  }
  return groups;
}

function MonthCalendar({ items, month, setMonth, day, setDay }: { items: SchoolEvent[]; month: Dayjs; setMonth: (m: Dayjs) => void; day: string | null; setDay: (d: string | null) => void }) {
  const byDay = useMemo(() => {
    const m = new Map<string, Aud[]>();
    for (const e of items) {
      const k = dayjs(e.startsAt).format('YYYY-MM-DD');
      m.set(k, [...(m.get(k) ?? []), audOf(e)]);
    }
    return m;
  }, [items]);
  const first = month.startOf('month');
  const lead = (first.day() + 6) % 7; // Monday first
  const cells: (Dayjs | null)[] = [...Array(lead).fill(null), ...Array.from({ length: first.daysInMonth() }, (_, i) => first.add(i, 'day'))];
  const todayKey = dayjs().format('YYYY-MM-DD');
  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 16 }}>{month.format('MMMM YYYY')}</Typography>
        <Stack direction="row">
          <IconButton size="small" aria-label="Previous month" onClick={() => setMonth(month.subtract(1, 'month'))}>
            <ChevronLeft />
          </IconButton>
          <IconButton size="small" aria-label="Next month" onClick={() => setMonth(month.add(1, 'month'))}>
            <ChevronRight />
          </IconButton>
        </Stack>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, textAlign: 'center' }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => (
          <Typography key={i} sx={{ fontSize: 11.5, fontWeight: 800, color: 'text.disabled', py: 0.5 }}>
            {w}
          </Typography>
        ))}
        {cells.map((c, i) => {
          if (!c) return <Box key={`e${i}`} />;
          const k = c.format('YYYY-MM-DD');
          const auds = byDay.get(k) ?? [];
          const on = day === k;
          const isToday = k === todayKey;
          return (
            <ButtonBase
              key={k}
              disabled={!auds.length}
              onClick={() => setDay(on ? null : k)}
              aria-label={`${c.format('D MMMM')}${auds.length ? `, ${auds.length} event${auds.length > 1 ? 's' : ''}` : ''}`}
              aria-pressed={on}
              sx={{
                aspectRatio: '1',
                borderRadius: '10px',
                flexDirection: 'column',
                gap: 0.25,
                fontSize: 13.5,
                fontWeight: isToday || auds.length ? 800 : 500,
                color: on ? '#fff' : auds.length ? 'text.primary' : 'text.secondary',
                bgcolor: on ? TONE.indigo : isToday ? alpha(TONE.indigo, 0.08) : auds.length ? '#F4F5FA' : 'transparent',
                outline: isToday && !on ? `1.5px solid ${alpha(TONE.indigo, 0.5)}` : 'none',
                '&:hover': { bgcolor: on ? TONE.indigo : alpha(TONE.indigo, 0.12) },
              }}
            >
              {c.date()}
              {auds.length > 0 && (
                <Stack direction="row" spacing={0.25}>
                  {[...new Set(auds)].slice(0, 3).map((a) => (
                    <Box key={a} sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: on ? '#fff' : TONE[AUD[a].tone] }} />
                  ))}
                </Stack>
              )}
            </ButtonBase>
          );
        })}
      </Box>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5, mt: 2 }}>
        {(Object.keys(AUD) as Aud[]).map((a) => (
          <Stack key={a} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: TONE[AUD[a].tone] }} />
            <Typography variant="caption" sx={{ fontWeight: 650 }}>
              {AUD[a].label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

export function EventsBoard({ items, onDelete, past }: { items: SchoolEvent[]; onDelete?: (e: SchoolEvent) => void; past?: boolean }) {
  const [aud, setAud] = useState<'' | Aud>('');
  const [day, setDay] = useState<string | null>(null);
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const count = (a: Aud) => items.filter((e) => audOf(e) === a).length;
  const shown = items.filter((e) => (!aud || audOf(e) === aud) && (!day || dayjs(e.startsAt).format('YYYY-MM-DD') === day));
  const groups = groupEvents(shown);
  const next = items.filter((e) => dayjs(e.startsAt).isAfter(dayjs())).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))[0];
  return (
    <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 320px' }, alignItems: 'start' }}>
      <Card>
        <CardContent>
          <Toolbar right={`${shown.length} event${shown.length === 1 ? '' : 's'}`}>
            <Segmented
              label="Who the event is for"
              value={aud}
              onChange={setAud}
              options={[{ value: '', label: 'All', count: items.length }, ...(Object.keys(AUD) as Aud[]).filter((a) => count(a)).map((a) => ({ value: a, label: a === 'class' ? 'My classes' : AUD[a].label, count: count(a) }))]}
            />
            {day && <Chip label={dayjs(day).format('ddd D MMMM')} onDelete={() => setDay(null)} deleteIcon={<Close />} sx={{ fontWeight: 700 }} />}
          </Toolbar>
          {groups.length ? (
            groups.map((g) => (
              <Box key={g.key}>
                <GroupLabel count={g.items.length}>{g.label}</GroupLabel>
                <Stack spacing={0.5}>
                  {g.items.map((e) => (
                    <EventRow key={e._id} e={e} onDelete={onDelete} />
                  ))}
                </Stack>
              </Box>
            ))
          ) : (
            <Empty title={items.length ? 'No events match' : past ? 'No events in the last 90 days' : 'No upcoming events'} hint={items.length ? 'Try another filter or clear the date.' : 'Events your school or you add will show here.'} />
          )}
        </CardContent>
      </Card>
      <Stack spacing={2.5} sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
        <Card>
          <CardContent>
            <MonthCalendar items={items} month={month} setMonth={setMonth} day={day} setDay={setDay} />
          </CardContent>
        </Card>
        {next && (
          <Box sx={{ p: 2.25, borderRadius: '18px', color: '#fff', background: `linear-gradient(135deg, ${TONE.indigo}, ${TONE.violet})`, boxShadow: `0 10px 24px ${alpha(TONE.indigo, 0.25)}` }}>
            <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.85 }}>Next up · {relative(next.startsAt)?.text}</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 18, mt: 0.5, lineHeight: 1.25 }}>{next.title}</Typography>
            <Typography sx={{ fontSize: 14, mt: 0.5, opacity: 0.9 }}>
              {dayjs(next.startsAt).format('ddd D MMM, h:mm A')}
              {next.location ? ` · ${next.location}` : ''}
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
}

/* ---------------------------------------------------------- Announcements */

const SCOPE: Record<Announcement['scope'], { tone: Tone; label: string; icon: ReactNode }> = {
  global: { tone: 'violet', label: 'Nanoskool', icon: <PublicOutlined /> },
  partner: { tone: 'teal', label: 'Partner', icon: <HubOutlined /> },
  school: { tone: 'orange', label: 'School', icon: <SchoolOutlined /> },
  class: { tone: 'indigo', label: 'Class', icon: <GroupsOutlined /> },
};
const KIND: Record<string, string> = { news: 'News', newsletter: 'Newsletter' };

function AnnouncementCard({ a, onDelete }: { a: Announcement; onDelete?: (a: Announcement) => void }) {
  const me = useMe();
  const s = SCOPE[a.scope];
  const from = a.scope === 'school' ? refName(a.schoolId) || 'School' : a.scope === 'class' ? refName(a.classId) || 'Class' : s.label;
  const isNew = dayjs().diff(dayjs(a.createdAt), 'day') < 3;
  const canDelete = onDelete && (refId(a.createdBy) === me._id || me.role === 'super_admin' || (me.role === 'school_admin' && refId(a.schoolId) === me.school?._id));
  const author = refName(a.createdBy) || 'Nanoskool';
  const role = typeof a.createdBy === 'object' && a.createdBy?.role ? ROLE_LABEL[a.createdBy.role] : null;
  return (
    <Card sx={{ position: 'relative', overflow: 'hidden', ...(a.pinned ? { bgcolor: alpha(TONE.orange, 0.04), borderColor: alpha(TONE.orange, 0.35) } : {}) }}>
      <Box aria-hidden sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: TONE[s.tone] }} />
      <CardContent sx={{ pl: 3 }}>
        <Stack direction="row" spacing={1.75} sx={{ alignItems: 'flex-start' }}>
          <IconTile tone={s.tone} size={42}>
            {s.icon}
          </IconTile>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
              <Typography component="h3" sx={{ fontWeight: 800, fontSize: 17, lineHeight: 1.3 }}>
                {a.title}
              </Typography>
              {isNew && <Chip size="small" label="New" sx={{ height: 20, fontSize: 11.5, fontWeight: 800, bgcolor: alpha(TONE.green, 0.12), color: TONE.green }} />}
            </Stack>
            <Typography variant="body2" sx={{ mt: 0.25, color: 'text.secondary' }}>
              <Box component="span" sx={{ fontWeight: 700, color: TONE[s.tone] }}>
                {from}
              </Box>
              {KIND[a.kind] ? ` · ${KIND[a.kind]}` : ''}
              {a.audience?.length ? ` · For ${a.audience.map((r) => `${(ROLE_LABEL[r as keyof typeof ROLE_LABEL] ?? r).toLowerCase()}s`).join(', ')}` : ''}
            </Typography>
          </Box>
          {a.pinned && (
            <Tooltip title="Pinned to the top">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: TONE.orange, fontSize: 12.5, fontWeight: 800, pt: 0.25 }}>
                <PushPin sx={{ fontSize: 16 }} />
                Pinned
              </Box>
            </Tooltip>
          )}
          {canDelete && <RowMenu label={`Actions for ${a.title}`} actions={[{ label: 'Delete', icon: <DeleteOutlined />, onClick: () => onDelete!(a), danger: true }]} />}
        </Stack>
        {a.body && <RichText html={a.body} sx={{ mt: 1.25, ml: { sm: 7.25 }, color: 'text.primary' }} />}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1.5, ml: { sm: 7.25 } }}>
          <Avatar sx={{ width: 24, height: 24, fontSize: 12, fontWeight: 700, bgcolor: alpha(TONE[s.tone], 0.15), color: TONE[s.tone] }}>{author[0]}</Avatar>
          <Typography variant="caption" color="text.secondary">
            <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {author}
            </Box>
            {role ? ` · ${role}` : ''} · {fromNow(a.createdAt)}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function AnnouncementsBoard({ items, onDelete }: { items: Announcement[]; onDelete?: (a: Announcement) => void }) {
  const [f, setF] = useState<'' | 'pinned' | Announcement['scope']>('');
  const count = (k: typeof f) => items.filter((a) => (k === 'pinned' ? a.pinned : a.scope === k)).length;
  const shown = items.filter((a) => !f || (f === 'pinned' ? a.pinned : a.scope === f)).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || +new Date(b.createdAt) - +new Date(a.createdAt));
  const opts = (['pinned', 'class', 'school', 'partner', 'global'] as const).filter((k) => count(k)).map((k) => ({ value: k, label: k === 'pinned' ? 'Pinned' : k === 'class' ? 'My classes' : SCOPE[k].label, count: count(k) }));
  if (!items.length) return <Empty title="No announcements yet" hint="News from Nanoskool, your school and your classes will show here." />;
  return (
    <Box sx={{ maxWidth: 920 }}>
      <Toolbar right={`${shown.length} shown`}>
        <Segmented label="Filter announcements" value={f} onChange={setF} options={[{ value: '', label: 'All', count: items.length }, ...opts]} />
      </Toolbar>
      <Stack spacing={1.75}>
        {shown.map((a) => (
          <AnnouncementCard key={a._id} a={a} onDelete={onDelete} />
        ))}
      </Stack>
    </Box>
  );
}
