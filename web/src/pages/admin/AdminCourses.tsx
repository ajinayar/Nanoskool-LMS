import { Box, Button, InputAdornment, Menu, MenuItem, Stack, TextField, Typography } from '@mui/material';
import ViewListOutlined from '@mui/icons-material/ViewListOutlined';
import ViewKanbanOutlined from '@mui/icons-material/ViewKanbanOutlined';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import LayersOutlined from '@mui/icons-material/LayersOutlined';
import TaskAltOutlined from '@mui/icons-material/TaskAltOutlined';
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import ArticleOutlined from '@mui/icons-material/ArticleOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import PublishOutlined from '@mui/icons-material/PublishOutlined';
import UnpublishedOutlined from '@mui/icons-material/UnpublishedOutlined';
import ArchiveOutlined from '@mui/icons-material/ArchiveOutlined';
import Add from '@mui/icons-material/Add';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Course, Paged } from '@/api/types';
import { useGet, useSend } from '@/lib/hooks';
import { DataTable, Empty, FormDialog, QueryState, Section, StatusChip, fmtDate, fromNow } from '@/components/ui';
import { FormError, GRADES, Pager, RowMenu, useCreateParam, useDebounced } from '@/components/AdminCommon';
import { BoardColumn, ClarityCard, ClarityStat, Fact, PillToggle, Tag, stripHtml } from '@/components/clarity';
import { CLARITY } from '@/theme-clarity';
import { CourseThumb } from '@/pages/shared/CoursePages';

export const CATEGORIES = ['Robotics', 'Coding', 'Electronics', 'AI & Machine Learning', 'Science', 'Design & Making', 'Drones', 'IoT'];

export function GradesSelect({ value, onChange }: { value: number[]; onChange: (g: number[]) => void }) {
  return (
    <TextField
      select
      label="Grades"
      value={value}
      onChange={(e) => {
        const v = e.target.value as unknown as number[] | string;
        onChange((typeof v === 'string' ? v.split(',').map(Number) : v).sort((a, b) => a - b));
      }}
      slotProps={{
        select: {
          multiple: true,
          displayEmpty: true,
          renderValue: (sel) => {
            const arr = sel as number[];
            return arr.length ? `Grades ${arr.join(', ')}` : 'Any grade';
          },
        },
        inputLabel: { shrink: true },
      }}
    >
      {GRADES.map((g) => (
        <MenuItem key={g} value={g}>
          Grade {g}
        </MenuItem>
      ))}
    </TextField>
  );
}

function CreateCourseDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Robotics');
  const [grades, setGrades] = useState<number[]>([]);
  const [level, setLevel] = useState<Course['level']>('beginner');
  const [err, setErr] = useState<string | null>(null);
  const create = useSend<Record<string, unknown>, Course>('post', '/courses', {
    success: 'Course created as a draft',
    invalidate: ['/courses', '/dashboard'],
    onSuccess: (c) => {
      onClose();
      navigate(`/admin/courses/${c._id}/edit`);
    },
  });
  return (
    <FormDialog
      open
      title="New course"
      onClose={onClose}
      loading={create.isPending}
      submitLabel="Create and edit"
      onSubmit={() => {
        const v = title.trim().length < 2 ? 'Give the course a title' : null;
        setErr(v);
        if (!v) create.mutate({ title: title.trim(), category, grades, level, status: 'draft' });
      }}
    >
      <TextField label="Course title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
        <TextField select label="Level" value={level} onChange={(e) => setLevel(e.target.value as Course['level'])}>
          <MenuItem value="beginner">Beginner</MenuItem>
          <MenuItem value="intermediate">Intermediate</MenuItem>
          <MenuItem value="advanced">Advanced</MenuItem>
        </TextField>
      </Stack>
      <GradesSelect value={grades} onChange={setGrades} />
      <Typography variant="body2" color="text.secondary">
        New courses start as drafts. Only you can see them until you publish.
      </Typography>
      <FormError message={err} error={create.error} />
    </FormDialog>
  );
}

type View = 'board' | 'list';
type SortKey = 'updated' | 'title' | 'units';
const STATUSES: { value: Course['status']; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];
const SORT_LABEL: Record<SortKey, string> = { updated: 'Recently updated', title: 'Title A–Z', units: 'Most units' };

function readView(): View {
  try {
    return localStorage.getItem('ns.studio.view') === 'list' ? 'list' : 'board';
  } catch {
    return 'board';
  }
}

export default function CourseStudioPage() {
  const navigate = useNavigate();
  const [view, setViewState] = useState<View>(readView);
  const setView = (v: View) => {
    setViewState(v);
    try {
      localStorage.setItem('ns.studio.view', v);
    } catch {
      /* private mode */
    }
  };
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<SortKey>('updated');
  const [filterEl, setFilterEl] = useState<HTMLElement | null>(null);
  const [sortEl, setSortEl] = useState<HTMLElement | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [open, setOpen] = useCreateParam();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  // Board shows everything at once; list pages through the server
  const all = useGet<Paged<Course>>('/courses', { q: dq || undefined, category: category || undefined, limit: 200 });
  const list = useGet<Paged<Course>>(view === 'list' ? '/courses' : null, { q: dq || undefined, status: status || undefined, category: category || undefined, page, limit });
  const setCourseStatus = useSend<{ id: string; status: Course['status'] }>('patch', (b) => `/courses/${b.id}`, { success: 'Course status updated', invalidate: ['/courses', '/dashboard'] });

  const items = useMemo(() => {
    const rows = [...(all.data?.items ?? [])];
    rows.sort((a, b) => (sort === 'title' ? a.title.localeCompare(b.title) : sort === 'units' ? (b.unitCount ?? 0) - (a.unitCount ?? 0) : String(b.updatedAt).localeCompare(String(a.updatedAt))));
    return rows;
  }, [all.data, sort]);
  const totalUnits = items.reduce((s, c) => s + (c.unitCount ?? 0), 0);
  const published = items.filter((c) => c.status === 'published').length;
  const filtered = !!(dq || status || category);
  const filterCount = (status ? 1 : 0) + (category ? 1 : 0);

  const move = (id: string, to: Course['status']) => {
    const c = items.find((x) => x._id === id);
    if (c && c.status !== to) setCourseStatus.mutate({ id, status: to });
  };

  const courseMenu = (c: Course) => (
    <RowMenu
      label={`Actions for ${c.title}`}
      actions={[
        { label: 'Edit', icon: <EditOutlined fontSize="small" />, onClick: () => navigate(`/admin/courses/${c._id}/edit`) },
        { label: 'Preview as student', icon: <VisibilityOutlined fontSize="small" />, onClick: () => navigate(`/admin/courses/${c._id}`) },
        { label: 'Publish', icon: <PublishOutlined fontSize="small" />, onClick: () => move(c._id, 'published'), hidden: c.status === 'published' },
        { label: 'Move to draft', icon: <UnpublishedOutlined fontSize="small" />, onClick: () => move(c._id, 'draft'), hidden: c.status === 'draft' },
        { label: 'Archive', icon: <ArchiveOutlined fontSize="small" />, onClick: () => move(c._id, 'archived'), hidden: c.status === 'archived' },
      ]}
    />
  );

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1">Course studio</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Write, review and publish the Nanoskool curriculum</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}>
          New course
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 4 }}>
        <ClarityStat color={CLARITY.lilac} icon={<MenuBookOutlined />} label="Total courses" value={all.data ? items.length : '—'} delta={all.data ? `${items.length - published} not live yet` : undefined} />
        <ClarityStat color={CLARITY.peach} icon={<LayersOutlined />} label="Units written" value={all.data ? totalUnits : '—'} delta={items.length ? `${(totalUnits / items.length).toFixed(1)} per course` : undefined} />
        <ClarityStat color={CLARITY.sky} icon={<TaskAltOutlined />} label="Published" value={all.data ? `${items.length ? Math.round((published / items.length) * 100) : 0}%` : '—'} delta={all.data ? `${published} of ${items.length} courses` : undefined} />
      </Box>

      {/* The controls sit directly above the content they change */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' }, mb: 1 }}>
        <PillToggle<View>
          ariaLabel="Course view"
          value={view}
          onChange={setView}
          options={[
            { value: 'list', label: 'List', icon: <ViewListOutlined /> },
            { value: 'board', label: 'Board', icon: <ViewKanbanOutlined /> },
          ]}
        />
        <TextField
          placeholder="Search courses"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          sx={{ flex: 1, minWidth: 240 }}
          slotProps={{
            htmlInput: { 'aria-label': 'Search courses' },
            input: {
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: (
                <InputAdornment position="end" sx={{ gap: 0.5 }}>
                  <Button size="small" startIcon={<FilterListIcon />} onClick={(e) => setFilterEl(e.currentTarget)} sx={{ px: 1.25, color: CLARITY.ink }}>
                    Filters{filterCount ? ` (${filterCount})` : ''}
                  </Button>
                  <Button size="small" startIcon={<SortIcon />} onClick={(e) => setSortEl(e.currentTarget)} sx={{ px: 1.25, color: CLARITY.ink, display: view === 'board' ? 'inline-flex' : 'none' }}>
                    Sort by
                  </Button>
                </InputAdornment>
              ),
            },
          }}
        />
      </Stack>
      <Typography sx={{ fontSize: 12.5, color: CLARITY.ink3, mb: 2, visibility: view === 'board' ? 'visible' : 'hidden' }}>Drag a card to another column to change its status.</Typography>
      <Menu anchorEl={filterEl} open={!!filterEl} onClose={() => setFilterEl(null)}>
        <Box sx={{ px: 2, py: 1.5, width: 260, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {view === 'list' && (
            <TextField select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}>
              <MenuItem value="">All statuses</MenuItem>
              {STATUSES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </TextField>
          )}
          <TextField select label="Category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}>
            <MenuItem value="">All categories</MenuItem>
            {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
          {filterCount > 0 && <Button onClick={() => { setStatus(''); setCategory(''); setFilterEl(null); }}>Clear filters</Button>}
        </Box>
      </Menu>
      <Menu anchorEl={sortEl} open={!!sortEl} onClose={() => setSortEl(null)}>
        {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
          <MenuItem key={k} selected={k === sort} onClick={() => { setSort(k); setSortEl(null); }}>{SORT_LABEL[k]}</MenuItem>
        ))}
      </Menu>

      {view === 'board' ? (
        <QueryState q={all}>
          {() =>
            items.length === 0 ? (
              <Empty title={filtered ? 'No courses match' : 'No courses yet'} action={!filtered && <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>New course</Button>} />
            ) : (
              <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 2, mx: -1 }}>
                {STATUSES.map((col) => {
                  const rows = items.filter((c) => c.status === col.value);
                  return (
                    <BoardColumn
                      key={col.value}
                      title={col.label}
                      count={rows.length}
                      highlight={overCol === col.value && !!dragId}
                      onDragOver={(e) => { e.preventDefault(); setOverCol(col.value); }}
                      onDragLeave={() => setOverCol(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData('text/plain');
                        setOverCol(null);
                        setDragId(null);
                        if (id) move(id, col.value);
                      }}
                    >
                      {rows.length === 0 && (
                        <Box sx={{ border: `1.5px dashed #D6CCBA`, borderRadius: '20px', p: 3, textAlign: 'center', color: CLARITY.ink3, fontSize: 14 }}>
                          {col.value === 'draft' ? 'New courses start here' : col.value === 'published' ? 'Drag a finished draft here to publish it' : 'Retired courses rest here'}
                        </Box>
                      )}
                      {rows.map((c) => (
                        <ClarityCard
                          key={c._id}
                          onClick={() => navigate(`/admin/courses/${c._id}/edit`)}
                          draggable
                          dim={dragId === c._id}
                          onDragStart={(e) => { e.dataTransfer.setData('text/plain', c._id); e.dataTransfer.effectAllowed = 'move'; setDragId(c._id); }}
                          onDragEnd={() => { setDragId(null); setOverCol(null); }}
                        >
                          <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                            <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                              <Tag label={c.category ?? 'Uncategorised'} />
                              {c.level && <Tag label={c.level} tone={`level-${c.level}`} />}
                            </Stack>
                            <Box sx={{ mt: -0.5, mr: -0.5 }}>{courseMenu(c)}</Box>
                          </Stack>
                          <Typography sx={{ fontWeight: 600, fontSize: 15.5, mb: 0.5 }}>{c.title}</Typography>
                          {stripHtml(c.description) && (
                            <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 1.5 }}>
                              {stripHtml(c.description)}
                            </Typography>
                          )}
                          {c.thumbnailUrl && (
                            <Box component="img" src={c.thumbnailUrl} alt="" sx={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: '14px', mb: 1.5, display: 'block' }} />
                          )}
                          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                            <Fact icon={<CalendarTodayOutlined />}>{fmtDate(c.updatedAt, 'D MMM')}</Fact>
                            <Box sx={{ flex: 1 }} />
                            <Stack direction="row" spacing={1.5} sx={{ color: CLARITY.ink2, fontSize: 13, fontWeight: 600, '& svg': { fontSize: 16, verticalAlign: '-3px', mr: 0.5 } }}>
                              <span title="Units"><ArticleOutlined />{c.unitCount ?? 0}</span>
                              <span title="Grades"><SchoolOutlined />{c.grades?.length ? c.grades.join(', ') : 'All'}</span>
                            </Stack>
                          </Stack>
                        </ClarityCard>
                      ))}
                    </BoardColumn>
                  );
                })}
              </Box>
            )
          }
        </QueryState>
      ) : (
        <Section title={list.data ? `${list.data.total} course${list.data.total === 1 ? '' : 's'}` : 'Courses'}>
          <QueryState q={list}>
            {(d) => (
              <>
                <DataTable
                  rows={d.items}
                  onRowClick={(c) => navigate(`/admin/courses/${c._id}/edit`)}
                  empty={<Empty title={filtered ? 'No courses match these filters' : 'No courses yet'} action={!filtered && <Button startIcon={<Add />} onClick={() => setOpen(true)}>New course</Button>} />}
                  columns={[
                    {
                      key: 'title',
                      label: 'Course',
                      render: (c) => (
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <Box sx={{ width: 64, borderRadius: '10px', overflow: 'hidden', flexShrink: 0, '& .MuiTypography-root': { display: 'none' } }}>
                            <CourseThumb course={c} height={40} />
                          </Box>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.title}</Typography>
                            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                              <Tag label={c.category ?? 'Uncategorised'} />
                              {c.level && <Tag label={c.level} tone={`level-${c.level}`} />}
                            </Stack>
                          </Box>
                        </Stack>
                      ),
                    },
                    { key: 'grades', label: 'Grades', render: (c) => (c.grades?.length ? c.grades.join(', ') : 'Any') },
                    { key: 'units', label: 'Units', align: 'right', render: (c) => c.unitCount ?? 0 },
                    { key: 'status', label: 'Status', render: (c) => <StatusChip status={c.status} /> },
                    { key: 'updated', label: 'Updated', render: (c) => fromNow(c.updatedAt) },
                    { key: 'actions', label: '', align: 'right', render: (c) => courseMenu(c) },
                  ]}
                />
                <Pager total={d.total} page={page} limit={limit} onPage={setPage} onLimit={setLimit} />
              </>
            )}
          </QueryState>
        </Section>
      )}
      {open && <CreateCourseDialog onClose={() => setOpen(false)} />}
    </>
  );
}
