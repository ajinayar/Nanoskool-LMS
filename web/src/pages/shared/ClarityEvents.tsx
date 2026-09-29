/** Events in the Clarity look: stats, a board by time, and a month calendar. */
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import EventOutlined from '@mui/icons-material/EventOutlined';
import TodayOutlined from '@mui/icons-material/TodayOutlined';
import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutlined';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import ViewKanbanOutlined from '@mui/icons-material/ViewKanbanOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';
import { refName, type SchoolEvent } from '@/api/types';
import { useGet } from '@/lib/hooks';
import { ClarityCard, ClarityStat, Fact, PillToggle, Tag } from '@/components/clarity';
import { RowMenu } from '@/components/AdminCommon';
import { Empty, PageHeader, QueryState } from '@/components/ui';
import { CLARITY } from '@/theme-clarity';

type View = 'board' | 'calendar';
const whereLabel = (e: SchoolEvent) => refName(e.classId) || (e.schoolId ? 'Whole school' : 'All schools');
const whereTone = (e: SchoolEvent) => (e.classId ? 'class' : e.schoolId ? 'school' : 'global');
/** Pastel date block colour by scope: class = lilac, school = peach, Nanoskool-wide = sky */
const dateColor = (e: SchoolEvent) => (e.classId ? CLARITY.lilac : e.schoolId ? CLARITY.peach : CLARITY.sky);

function DateBlock({ e, size = 52 }: { e: SchoolEvent; size?: number }) {
  const d = dayjs(e.startsAt);
  return (
    <Box sx={{ width: size, height: size, borderRadius: '14px', bgcolor: dateColor(e), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2 }}>{d.format('MMM')}</Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 600, lineHeight: 1 }}>{d.format('D')}</Typography>
    </Box>
  );
}

function EventCard({ e, canDelete, onOpen, onDelete }: { e: SchoolEvent; canDelete: boolean; onOpen: () => void; onDelete: () => void }) {
  const past = dayjs(e.startsAt).isBefore(dayjs());
  return (
    <Box sx={{ position: 'relative' }}>
      <ClarityCard onClick={onOpen} dim={past}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', pr: canDelete ? 3.5 : 0 }}>
          <DateBlock e={e} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Tag label={whereLabel(e)} tone={whereTone(e)} />
            <Typography sx={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3, mt: 0.75 }}>{e.title}</Typography>
          </Box>
        </Stack>
        {e.description && <Typography sx={{ fontSize: 13.5, color: CLARITY.ink2, mt: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{e.description}</Typography>}
        <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1, '& > *': { m: '0 !important' } }}>
          <Fact icon={<ScheduleOutlined />}>{dayjs(e.startsAt).format('ddd, h:mm A')}</Fact>
          {e.location && <Fact icon={<PlaceOutlined />}>{e.location}</Fact>}
        </Stack>
      </ClarityCard>
      {canDelete && (
        <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
          <RowMenu label={`Actions for ${e.title}`} actions={[{ label: 'Delete', icon: <DeleteOutline fontSize="small" />, danger: true, onClick: onDelete }]} />
        </Box>
      )}
    </Box>
  );
}

function Calendar({ month, setMonth, items, onOpen }: { month: Dayjs; setMonth: (m: Dayjs) => void; items: SchoolEvent[]; onOpen: (e: SchoolEvent) => void }) {
  const start = month.startOf('month').startOf('week');
  const days = Array.from({ length: 42 }, (_, i) => start.add(i, 'day'));
  const byDay = new Map<string, SchoolEvent[]>();
  for (const e of items) {
    const k = dayjs(e.startsAt).format('YYYY-MM-DD');
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }
  const today = dayjs().format('YYYY-MM-DD');
  return (
    <Box sx={{ bgcolor: CLARITY.panel, border: `1px solid ${CLARITY.line}`, borderRadius: '22px', p: 2.5 }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" component="h2">
          {month.format('MMMM YYYY')}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Button size="small" onClick={() => setMonth(dayjs().startOf('month'))}>
            Today
          </Button>
          <IconButton size="small" aria-label="Previous month" onClick={() => setMonth(month.subtract(1, 'month'))}>
            <ChevronLeft />
          </IconButton>
          <IconButton size="small" aria-label="Next month" onClick={() => setMonth(month.add(1, 'month'))}>
            <ChevronRight />
          </IconButton>
        </Stack>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.75 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <Typography key={d} sx={{ fontSize: 12.5, color: CLARITY.ink3, fontWeight: 500, px: 1, pb: 0.5 }}>
            {d}
          </Typography>
        ))}
        {days.map((d) => {
          const k = d.format('YYYY-MM-DD');
          const evs = byDay.get(k) ?? [];
          const inMonth = d.month() === month.month();
          return (
            <Box key={k} sx={{ minHeight: { xs: 64, md: 104 }, borderRadius: '14px', p: 1, bgcolor: inMonth ? '#FFFFFF' : 'transparent', border: `1px solid ${inMonth ? CLARITY.line : 'transparent'}`, display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
              <Box sx={{ alignSelf: 'flex-start', minWidth: 24, height: 24, px: 0.5, borderRadius: 999, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 600, bgcolor: k === today ? CLARITY.ink : 'transparent', color: k === today ? '#fff' : inMonth ? CLARITY.ink : CLARITY.ink3 }}>{d.date()}</Box>
              {evs.slice(0, 2).map((e) => (
                <Box key={e._id} component="button" onClick={() => onOpen(e)} title={e.title} sx={{ all: 'unset', cursor: 'pointer', display: { xs: 'none', md: 'block' }, bgcolor: dateColor(e), borderRadius: '8px', px: 0.75, py: 0.25, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', '&:focus-visible': { outline: `2px solid ${CLARITY.ink}` } }}>
                  {dayjs(e.startsAt).format('h:mm')} {e.title}
                </Box>
              ))}
              {evs.length > 0 && <Box sx={{ display: { xs: 'block', md: 'none' }, width: 6, height: 6, borderRadius: '50%', bgcolor: CLARITY.ink, mx: 'auto' }} />}
              {evs.length > 2 && <Typography sx={{ fontSize: 11.5, color: CLARITY.ink2, display: { xs: 'none', md: 'block' } }}>+{evs.length - 2} more</Typography>}
            </Box>
          );
        })}
      </Box>
      <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: 'wrap', gap: 1.5, '& > *': { m: '0 !important' } }}>
        {[
          [CLARITY.lilac, 'Class'],
          [CLARITY.peach, 'Whole school'],
          [CLARITY.sky, 'All schools'],
        ].map(([c, l]) => (
          <Stack key={l} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '4px', bgcolor: c }} />
            <Typography sx={{ fontSize: 13, color: CLARITY.ink2 }}>{l}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

export function ClarityEvents({ canPost, onNew, onDelete }: { canPost: boolean; onNew: () => void; onDelete: (e: SchoolEvent) => void }) {
  const [view, setView] = useState<View>(() => {
    try {
      return (localStorage.getItem('ns.events.view') as View) || 'board';
    } catch {
      return 'board';
    }
  });
  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem('ns.events.view', v);
    } catch {
      /* ignore */
    }
  };
  const [month, setMonth] = useState(dayjs().startOf('month'));
  const [openItem, setOpenItem] = useState<SchoolEvent | null>(null);
  // Board: 30 days back to 90 days ahead. Calendar: the visible month grid.
  // Keep the query range stable between renders (a new range every render would refetch forever)
  const [today] = useState(() => dayjs().startOf('day'));
  const range = useMemo(
    () =>
      view === 'calendar'
        ? { from: month.startOf('month').startOf('week').toISOString(), to: month.startOf('month').startOf('week').add(42, 'day').toISOString() }
        : { from: today.subtract(30, 'day').toISOString(), to: today.add(91, 'day').toISOString() },
    [view, month, today],
  );
  const q = useGet<SchoolEvent[]>('/events', range);
  const all = q.data ?? [];
  const now = dayjs();
  // Stats always cover the next 90 days, whichever view is open
  const statsRange = useMemo(() => ({ from: today.toISOString(), to: today.add(91, 'day').toISOString() }), [today]);
  const stats = useGet<SchoolEvent[]>('/events', statsRange);
  const upcoming = (view === 'board' ? all : stats.data ?? []).filter((e) => dayjs(e.startsAt).isAfter(now));
  const weekEnd = now.endOf('week');
  const columns = [
    { key: 'week', label: 'This week', rows: upcoming.filter((e) => dayjs(e.startsAt).isBefore(weekEnd)) },
    { key: 'month', label: 'Next 30 days', rows: upcoming.filter((e) => !dayjs(e.startsAt).isBefore(weekEnd) && dayjs(e.startsAt).isBefore(now.add(30, 'day'))) },
    { key: 'later', label: 'Later', rows: upcoming.filter((e) => !dayjs(e.startsAt).isBefore(now.add(30, 'day'))) },
    { key: 'past', label: 'Recently held', rows: all.filter((e) => !dayjs(e.startsAt).isAfter(now)).reverse() },
  ];

  return (
    <>
      <PageHeader
        title="Events calendar"
        subtitle="School and class events, meetings and deadlines"
        actions={
          canPost && (
            <Button variant="contained" startIcon={<Add />} onClick={onNew}>
              Add event
            </Button>
          )
        }
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 4 }}>
        <ClarityStat color={CLARITY.lilac} icon={<TodayOutlined />} label="This week" value={columns[0].rows.length} delta={columns[0].rows[0] ? `Next: ${columns[0].rows[0].title}` : 'Nothing else this week'} />
        <ClarityStat color={CLARITY.peach} icon={<EventOutlined />} label="Coming up" value={upcoming.length} delta="In the next 90 days" />
        <ClarityStat color={CLARITY.sky} icon={<ApartmentOutlined />} label="Whole-school events" value={upcoming.filter((e) => e.schoolId && !e.classId).length} delta={`${upcoming.filter((e) => e.classId).length} for single classes`} />
      </Box>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5, '& > *': { m: '0 !important' } }}>
        <PillToggle<View>
          ariaLabel="Events view"
          value={view}
          onChange={changeView}
          options={[
            { value: 'board', label: 'Board', icon: <ViewKanbanOutlined /> },
            { value: 'calendar', label: 'Calendar', icon: <CalendarMonthOutlined /> },
          ]}
        />
        <Typography sx={{ fontSize: 13.5, color: CLARITY.ink3 }}>{view === 'board' ? 'Showing the last 30 days and the next 90 days' : 'Click an event to see its details'}</Typography>
      </Stack>
      <QueryState q={q}>
        {() =>
          view === 'calendar' ? (
            <Calendar month={month} setMonth={setMonth} items={all} onOpen={setOpenItem} />
          ) : all.length === 0 ? (
            <Box sx={{ bgcolor: CLARITY.panel, border: `1px solid ${CLARITY.line}`, borderRadius: '22px' }}>
              <Empty title="No events" hint={canPost ? 'Add parent meetings, fairs, trips and deadlines.' : undefined} action={canPost ? <Button startIcon={<Add />} onClick={onNew}>Add event</Button> : undefined} />
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 2 }}>
              {columns.map((col) => (
                <Box key={col.key} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 15, px: 0.25 }}>
                    {col.label} <Box component="span" sx={{ color: CLARITY.ink3 }}>({col.rows.length})</Box>
                  </Typography>
                  {col.rows.length === 0 && <Box sx={{ border: '1.5px dashed #D6CCBA', borderRadius: '16px', p: 2, fontSize: 13, color: CLARITY.ink3, textAlign: 'center' }}>Nothing here</Box>}
                  {col.rows.map((e) => (
                    <EventCard key={e._id} e={e} canDelete={canPost} onOpen={() => setOpenItem(e)} onDelete={() => onDelete(e)} />
                  ))}
                </Box>
              ))}
            </Box>
          )
        }
      </QueryState>
      <Dialog open={!!openItem} onClose={() => setOpenItem(null)} maxWidth="xs" fullWidth>
        {openItem && (
          <>
            <DialogTitle>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <DateBlock e={openItem} />
                <Box>
                  <Tag label={whereLabel(openItem)} tone={whereTone(openItem)} />
                  <Typography sx={{ fontWeight: 600, fontSize: 18, mt: 0.5 }}>{openItem.title}</Typography>
                </Box>
              </Stack>
            </DialogTitle>
            <DialogContent>
              <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1, '& > *': { m: '0 !important' } }}>
                <Fact icon={<ScheduleOutlined />}>{dayjs(openItem.startsAt).format('dddd D MMM, h:mm A')}</Fact>
                {openItem.location && <Fact icon={<PlaceOutlined />}>{openItem.location}</Fact>}
              </Stack>
              <Typography sx={{ color: CLARITY.ink2, whiteSpace: 'pre-wrap' }}>{openItem.description || 'No description.'}</Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              {canPost && (
                <Button color="inherit" startIcon={<DeleteOutline />} onClick={() => { onDelete(openItem); setOpenItem(null); }}>
                  Delete
                </Button>
              )}
              <Box sx={{ flex: 1 }} />
              <Button variant="contained" onClick={() => setOpenItem(null)}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
