/** Announcements in the Clarity look: stats, a toolbar, and a board grouped by who it is for. */
import { Avatar, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import CampaignOutlined from '@mui/icons-material/CampaignOutlined';
import PushPinOutlined from '@mui/icons-material/PushPinOutlined';
import PushPin from '@mui/icons-material/PushPin';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import ViewKanbanOutlined from '@mui/icons-material/ViewKanbanOutlined';
import ViewListOutlined from '@mui/icons-material/ViewListOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import dayjs from 'dayjs';
import { useState } from 'react';
import { ROLE_LABEL, refId, refName, type Announcement } from '@/api/types';
import { useMe } from '@/auth/AuthContext';
import { ClarityCard, ClarityStat, Fact, PillToggle, Tag, stripHtml } from '@/components/clarity';
import { RowMenu } from '@/components/AdminCommon';
import { Empty, PageHeader, RichText, fromNow } from '@/components/ui';
import { CLARITY } from '@/theme-clarity';
import { scopeLabel } from './CommonPages';

type View = 'board' | 'list';
type Group = 'nanoskool' | 'school' | 'class';
const groupOf = (a: Announcement): Group => (a.scope === 'class' ? 'class' : a.scope === 'school' ? 'school' : 'nanoskool');
const GROUPS: { key: Group; label: string }[] = [
  { key: 'nanoskool', label: 'From Nanoskool' },
  { key: 'school', label: 'Whole school' },
  { key: 'class', label: 'Class notices' },
];
const KIND_LABEL: Record<Announcement['kind'], string> = { announcement: 'Announcement', news: 'News', newsletter: 'Newsletter' };

function audienceText(a: Announcement) {
  return a.audience?.length ? a.audience.map((r) => ROLE_LABEL[r as keyof typeof ROLE_LABEL] ?? r).join(', ') : 'Everyone';
}

function AnnouncementCard({ a, canDelete, onOpen, onDelete }: { a: Announcement; canDelete: boolean; onOpen: () => void; onDelete: () => void }) {
  return (
    <Box sx={{ position: 'relative' }}>
      <ClarityCard onClick={onOpen}>
        <Stack direction="row" spacing={0.75} sx={{ mb: 1.25, pr: canDelete ? 4 : 0, flexWrap: 'wrap', gap: 0.75 }}>
          <Tag label={KIND_LABEL[a.kind]} tone={a.kind === 'news' ? 'info' : a.kind === 'newsletter' ? 'newsletter' : 'announce'} />
          <Tag label={scopeLabel(a)} tone={a.scope} />
          {a.pinned && <Tag label="Pinned" tone="warn" />}
        </Stack>
        <Typography sx={{ fontWeight: 600, fontSize: 15.5, lineHeight: 1.3 }}>{a.title}</Typography>
        {a.body && (
          <Typography sx={{ fontSize: 13.5, color: CLARITY.ink2, mt: 0.75, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{stripHtml(a.body)}</Typography>
        )}
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 1.75, gap: 1 }}>
          <Fact icon={<CalendarMonthOutlined />}>{dayjs(a.createdAt).format('D MMM')}</Fact>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 12.5, color: CLARITY.ink3, '& svg': { fontSize: 15, verticalAlign: '-3px', mr: 0.5 } }} title={`For ${audienceText(a)}`}>
              <GroupsOutlined />
              {audienceText(a)}
            </Typography>
            <Avatar sx={{ width: 26, height: 26, fontSize: 12, bgcolor: CLARITY.lilac, color: CLARITY.ink }} title={refName(a.createdBy)}>
              {refName(a.createdBy)[0] ?? 'N'}
            </Avatar>
          </Stack>
        </Stack>
      </ClarityCard>
      {canDelete && (
        <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
          <RowMenu label={`Actions for ${a.title}`} actions={[{ label: 'Delete', icon: <DeleteOutline fontSize="small" />, danger: true, onClick: onDelete }]} />
        </Box>
      )}
    </Box>
  );
}

export function ClarityAnnouncements({ items, canPost, onNew, onDelete }: { items: Announcement[]; canPost: boolean; onNew: () => void; onDelete: (a: Announcement) => void }) {
  const me = useMe();
  const [view, setView] = useState<View>(() => {
    try {
      return (localStorage.getItem('ns.announcements.view') as View) || 'board';
    } catch {
      return 'board';
    }
  });
  const [search, setSearch] = useState('');
  const [openItem, setOpenItem] = useState<Announcement | null>(null);
  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem('ns.announcements.view', v);
    } catch {
      /* ignore */
    }
  };
  const canDelete = (a: Announcement) => canPost && (refId(a.createdBy) === me._id || me.role === 'super_admin' || (me.role === 'school_admin' && refId(a.schoolId) === me.school?._id));
  const monthStart = dayjs().startOf('month');
  const thisMonth = items.filter((a) => dayjs(a.createdAt).isAfter(monthStart)).length;
  const pinned = items.filter((a) => a.pinned).length;
  const sorted = [...items].sort((x, y) => Number(!!y.pinned) - Number(!!x.pinned) || dayjs(y.createdAt).valueOf() - dayjs(x.createdAt).valueOf());
  const shown = sorted.filter((a) => !search || `${a.title} ${stripHtml(a.body)} ${scopeLabel(a)}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <PageHeader
        title="Announcements"
        subtitle="News and notices for your school, classes and families"
        actions={
          canPost && (
            <Button variant="contained" startIcon={<Add />} onClick={onNew}>
              New announcement
            </Button>
          )
        }
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 4 }}>
        <ClarityStat color={CLARITY.lilac} icon={<CampaignOutlined />} label="All announcements" value={items.length} delta={`${items.filter((a) => a.scope === 'class').length} for single classes`} />
        <ClarityStat color={CLARITY.peach} icon={<CalendarMonthOutlined />} label="This month" value={thisMonth} delta={items[0] ? `Latest ${fromNow(sorted.find((a) => !a.pinned)?.createdAt ?? items[0].createdAt)}` : 'Nothing posted yet'} />
        <ClarityStat color={CLARITY.sky} icon={<PushPinOutlined />} label="Pinned" value={pinned} delta={pinned ? 'Shown first for everyone' : 'Pin important notices to keep them on top'} />
      </Box>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5, '& > *': { m: '0 !important' } }}>
        <PillToggle<View>
          ariaLabel="Announcement view"
          value={view}
          onChange={changeView}
          options={[
            { value: 'board', label: 'Board', icon: <ViewKanbanOutlined /> },
            { value: 'list', label: 'List', icon: <ViewListOutlined /> },
          ]}
        />
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcements"
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> }, htmlInput: { 'aria-label': 'Search announcements' } }}
          />
        </Box>
      </Stack>

      {items.length === 0 ? (
        <Box sx={{ bgcolor: CLARITY.panel, border: `1px solid ${CLARITY.line}`, borderRadius: '22px' }}>
          <Empty title="No announcements yet" hint={canPost ? 'Post news for the whole school or a single class.' : undefined} action={canPost ? <Button startIcon={<Add />} onClick={onNew}>New announcement</Button> : undefined} />
        </Box>
      ) : view === 'board' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
          {GROUPS.map((g) => {
            const rows = shown.filter((a) => groupOf(a) === g.key);
            return (
              <Box key={g.key} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, fontSize: 15, px: 0.25 }}>
                  {g.label} <Box component="span" sx={{ color: CLARITY.ink3 }}>({rows.length})</Box>
                </Typography>
                {rows.length === 0 && <Box sx={{ border: '1.5px dashed #D6CCBA', borderRadius: '16px', p: 2, fontSize: 13, color: CLARITY.ink3, textAlign: 'center' }}>Nothing here</Box>}
                {rows.map((a) => (
                  <AnnouncementCard key={a._id} a={a} canDelete={canDelete(a)} onOpen={() => setOpenItem(a)} onDelete={() => onDelete(a)} />
                ))}
              </Box>
            );
          })}
        </Box>
      ) : (
        <Box sx={{ bgcolor: CLARITY.panel, border: `1px solid ${CLARITY.line}`, borderRadius: '22px', px: 2.5 }}>
          {shown.length === 0 && <Empty title="No announcements match your search" />}
          {shown.map((a, i) => (
            <Stack key={a._id} direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ py: 2, borderTop: i ? `1px solid ${CLARITY.line}` : 'none', alignItems: { sm: 'center' }, cursor: 'pointer' }} onClick={() => setOpenItem(a)}>
              <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: a.pinned ? CLARITY.butter : CLARITY.hover, display: 'grid', placeItems: 'center', flexShrink: 0, '& svg': { fontSize: 20 } }}>{a.pinned ? <PushPin /> : <CampaignOutlined />}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }}>{a.title}</Typography>
                <Typography noWrap sx={{ fontSize: 13.5, color: CLARITY.ink2 }}>{stripHtml(a.body)}</Typography>
              </Box>
              <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0, alignItems: 'center' }}>
                <Tag label={KIND_LABEL[a.kind]} tone={a.kind === 'news' ? 'info' : a.kind === 'newsletter' ? 'newsletter' : 'announce'} />
                <Tag label={scopeLabel(a)} tone={a.scope} />
              </Stack>
              <Typography sx={{ fontSize: 13, color: CLARITY.ink3, width: 110, textAlign: { sm: 'right' }, flexShrink: 0 }}>{fromNow(a.createdAt)}</Typography>
              <Box sx={{ width: 36, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                {canDelete(a) && <RowMenu label={`Actions for ${a.title}`} actions={[{ label: 'Delete', icon: <DeleteOutline fontSize="small" />, danger: true, onClick: () => onDelete(a) }]} />}
              </Box>
            </Stack>
          ))}
        </Box>
      )}

      <Dialog open={!!openItem} onClose={() => setOpenItem(null)} maxWidth="sm" fullWidth>
        {openItem && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Stack direction="row" spacing={0.75} sx={{ mb: 1.25, flexWrap: 'wrap', gap: 0.75 }}>
                <Tag label={KIND_LABEL[openItem.kind]} tone={openItem.kind === 'news' ? 'info' : openItem.kind === 'newsletter' ? 'newsletter' : 'announce'} />
                <Tag label={scopeLabel(openItem)} tone={openItem.scope} />
                {openItem.pinned && <Tag label="Pinned" tone="warn" />}
              </Stack>
              {openItem.title}
              <Typography sx={{ fontSize: 13, color: CLARITY.ink3, mt: 0.5 }}>
                {refName(openItem.createdBy)} · {dayjs(openItem.createdAt).format('D MMM YYYY, h:mm A')} · For {audienceText(openItem)}
              </Typography>
            </DialogTitle>
            <DialogContent>
              <RichText html={openItem.body} />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setOpenItem(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
