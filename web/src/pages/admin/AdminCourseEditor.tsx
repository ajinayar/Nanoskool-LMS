import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import ArchiveOutlined from '@mui/icons-material/ArchiveOutlined';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import PublishOutlined from '@mui/icons-material/PublishOutlined';
import UnpublishedOutlined from '@mui/icons-material/UnpublishedOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { refId, type Chapter, type Course, type CourseDetail, type CourseGrant, type Paged, type Partner, type QuizSummary, type School, type Unit, type UnitDetail, type UnitType } from '@/api/types';
import { useGet, useSend } from '@/lib/hooks';
import { RichEditor } from '@/components/RichEditor';
import { useToast } from '@/components/Toast';
import { ConfirmDialog, DataTable, Empty, FormDialog, Loading, PageHeader, QueryState, Section, StatusChip, UploadButton, fmtDate } from '@/components/ui';
import { BackLink, FormError, RowMenu, TabBar, useTab } from '@/components/AdminCommon';
import { AttemptsDialog, QuizEditDialog } from '@/components/AdminQuiz';
import { CourseThumb, UNIT_ICON } from '@/pages/shared/CoursePages';
import { CATEGORIES, GradesSelect } from './AdminCourses';
import { ActivitiesEditor, ObjectivesEditor, journeyProblems } from '@/components/JourneyEditors';
import type { Activity, Objective, Skill, Tool } from '@/api/journey';

const TABS = ['details', 'content', 'quizzes', 'access'] as const;

/* -------------------------------------------------------------- Details */

function DetailsTab({ course }: { course: CourseDetail }) {
  const [title, setTitle] = useState(course.title);
  const [category, setCategory] = useState(course.category ?? '');
  const [grades, setGrades] = useState<number[]>(course.grades ?? []);
  const [level, setLevel] = useState<Course['level']>(course.level ?? 'beginner');
  const [thumbnailUrl, setThumb] = useState(course.thumbnailUrl ?? '');
  const [description, setDescription] = useState(course.description ?? '');
  const [err, setErr] = useState<string | null>(null);
  const save = useSend<Record<string, unknown>>('patch', `/courses/${course._id}`, { success: 'Course details saved', invalidate: ['/courses'] });
  const cats = category && !CATEGORIES.includes(category) ? [category, ...CATEGORIES] : CATEGORIES;
  return (
    <Section title="Course details">
      <Stack
        component="form"
        spacing={2}
        onSubmit={(e) => {
          e.preventDefault();
          const v = title.trim().length < 2 ? 'Give the course a title' : null;
          setErr(v);
          if (!v) save.mutate({ title: title.trim(), category, grades, level, thumbnailUrl, description });
        }}
      >
        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}>
            <MenuItem value="">Uncategorised</MenuItem>
            {cats.map((c) => (
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
          <GradesSelect value={grades} onChange={setGrades} />
        </Stack>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Cover image
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
            <Box sx={{ width: 220, borderRadius: 2, overflow: 'hidden', border: '1px solid #E4E6F0' }}>
              <CourseThumb course={{ _id: course._id, title, category, thumbnailUrl }} height={120} />
            </Box>
            <Stack direction="row" spacing={1}>
              <UploadButton folder="content" accept="image/*" label={thumbnailUrl ? 'Change image' : 'Upload image'} onUploaded={(u) => setThumb(u)} />
              {thumbnailUrl && (
                <Button color="error" onClick={() => setThumb('')}>
                  Remove
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Description
          </Typography>
          <RichEditor value={description} onChange={setDescription} placeholder="What will students learn?" minHeight={140} />
        </Box>
        <FormError message={err} error={save.error} />
        <Box>
          <Button type="submit" variant="contained" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save details'}
          </Button>
        </Box>
      </Stack>
    </Section>
  );
}

/* ---------------------------------------------------------------- Units */

const UNIT_TYPES: { value: UnitType; label: string }[] = [
  { value: 'lesson', label: 'Lesson' },
  { value: 'video', label: 'Video' },
  { value: 'pdf', label: 'PDF / document' },
  { value: 'activity', label: 'Hands-on activity' },
  { value: 'link', label: 'External link' },
];

function UnitDialog({ chapter, unitId, onClose }: { chapter: Chapter; unitId?: string; onClose: () => void }) {
  const existing = useGet<UnitDetail>(unitId ? `/units/${unitId}` : null);
  const [u, setU] = useState<Partial<Unit> | null>(unitId ? null : { title: '', type: 'lesson', summary: '', body: '', videoUrl: '', fileUrl: '', linkUrl: '', durationMin: 10 });
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<'lesson' | 'objectives' | 'activities'>('lesson');
  const [objectives, setObjectives] = useState<Objective[] | null>(unitId ? null : []);
  const [activities, setActivities] = useState<Activity[] | null>(unitId ? null : []);
  const skills = useGet<Skill[]>('/skills');
  const quizzes = useGet<QuizSummary[]>('/quizzes', { courseId: chapter.courseId });
  const tools = useGet<Tool[]>('/tools');
  useEffect(() => {
    if (unitId && existing.data) {
      setU((x) => x ?? existing.data!);
      const d = existing.data as UnitDetail & { objectives?: Objective[]; activities?: Activity[] };
      setObjectives((x) => x ?? (d.objectives ?? []).map((o) => ({ ...o, skillIds: (o.skillIds ?? []).map(String) })));
      setActivities((x) => x ?? (d.activities ?? []).map((a) => ({ ...a, objectiveIds: (a.objectiveIds ?? []).map(String), quizId: a.quizId ?? null, toolId: a.toolId ?? null })));
    }
  }, [unitId, existing.data]);
  const save = useSend<Record<string, unknown>>(unitId ? 'patch' : 'post', unitId ? `/units/${unitId}` : `/chapters/${chapter._id}/units`, {
    success: unitId ? 'Learning unit saved' : 'Learning unit added',
    invalidate: ['/courses', '/units'],
    onSuccess: onClose,
  });
  const set = (p: Partial<Unit>) => setU((x) => ({ ...x, ...p }));
  const submit = () => {
    if (!u) return;
    let v: string | null = null;
    if (!u.title?.trim()) v = 'Give the learning unit a title';
    else if (u.type === 'video' && !u.videoUrl?.trim()) v = 'Add the video URL';
    else if (u.type === 'pdf' && !u.fileUrl) v = 'Upload the PDF or document';
    else if (u.type === 'link' && !u.linkUrl?.trim()) v = 'Add the link URL';
    else if (u.durationMin != null && (u.durationMin < 1 || u.durationMin > 600)) v = 'Duration must be between 1 and 600 minutes';
    else v = journeyProblems(objectives ?? [], activities ?? []);
    setErr(v);
    if (v) {
      if (v.startsWith('Every objective')) setTab('objectives');
      else if (/activit|quiz|tool/i.test(v)) setTab('activities');
      return;
    }
    save.mutate({
      title: u.title!.trim(),
      type: u.type,
      summary: u.summary ?? '',
      body: u.body ?? '',
      videoUrl: u.videoUrl?.trim() ?? '',
      fileUrl: u.fileUrl ?? '',
      linkUrl: u.linkUrl?.trim() ?? '',
      ...(u.durationMin ? { durationMin: Math.round(u.durationMin) } : {}),
      objectives: (objectives ?? []).map((o) => ({ _id: o._id, title: o.title.trim(), description: o.description ?? '', criteria: o.criteria ?? '', skillIds: o.skillIds ?? [], weight: o.weight ?? 1 })),
      activities: (activities ?? []).map((a) => ({
        _id: a._id,
        kind: a.kind,
        title: a.title.trim(),
        instructions: a.instructions ?? '',
        quizId: a.kind === 'quiz' ? a.quizId : null,
        toolId: a.kind === 'tool' ? a.toolId : null,
        objectiveIds: a.objectiveIds.filter((id) => (objectives ?? []).some((o) => o._id === id)),
        scoring: a.scoring,
        weight: a.weight ?? 1,
        required: a.required !== false,
        mediaTypes: a.mediaTypes ?? [],
      })),
    });
  };
  return (
    <FormDialog open title={unitId ? 'Edit learning unit' : `New learning unit in “${chapter.title}”`} maxWidth="md" onClose={onClose} onSubmit={submit} loading={save.isPending || !u} submitLabel={unitId ? 'Save learning unit' : 'Add learning unit'}>
      {existing.error ? (
        <FormError error={existing.error} />
      ) : !u || !objectives || !activities ? (
        <Loading />
      ) : (
        <>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mt: -1 }}>
            <Tab value="lesson" label="Lesson" />
            <Tab value="objectives" label={`Objectives (${objectives.length})`} />
            <Tab value="activities" label={`Outcome activities (${activities.length})`} />
          </Tabs>
          {tab === 'objectives' && <ObjectivesEditor value={objectives} onChange={setObjectives} skills={skills.data ?? []} />}
          {tab === 'activities' && <ActivitiesEditor value={activities} onChange={setActivities} objectives={objectives} quizzes={quizzes.data ?? []} tools={tools.data ?? []} />}
          {tab === 'lesson' && (
          <>
          <TextField label="Learning unit title" value={u.title ?? ''} onChange={(e) => set({ title: e.target.value })} required autoFocus />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField select label="Type" value={u.type ?? 'lesson'} onChange={(e) => set({ type: e.target.value as UnitType })}>
              {UNIT_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Duration (minutes)" type="number" value={u.durationMin ?? ''} onChange={(e) => set({ durationMin: e.target.value ? Number(e.target.value) : undefined })} slotProps={{ htmlInput: { min: 1, max: 600 } }} />
          </Stack>
          <TextField label="Summary" value={u.summary ?? ''} onChange={(e) => set({ summary: e.target.value })} multiline minRows={2} helperText="One or two lines shown above the lesson" slotProps={{ htmlInput: { maxLength: 1000 } }} />
          {(u.type === 'video' || u.videoUrl) && (
            <TextField label="Video URL" value={u.videoUrl ?? ''} onChange={(e) => set({ videoUrl: e.target.value })} required={u.type === 'video'} helperText="YouTube, Vimeo or a direct .mp4 link" />
          )}
          {(u.type === 'pdf' || u.type === 'activity' || u.fileUrl) && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {u.type === 'pdf' ? 'Document' : 'Attachment (optional)'}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
                <UploadButton folder="content" accept=".pdf,image/*,video/*,.ppt,.pptx,.doc,.docx,.zip" label={u.fileUrl ? 'Replace file' : 'Upload file'} onUploaded={(url) => set({ fileUrl: url })} />
                {u.fileUrl && (
                  <>
                    <Button href={u.fileUrl} target="_blank" rel="noopener" size="small">
                      Open current file
                    </Button>
                    <Button color="error" size="small" onClick={() => set({ fileUrl: '' })}>
                      Remove
                    </Button>
                  </>
                )}
              </Stack>
            </Box>
          )}
          {(u.type === 'link' || u.type === 'activity' || u.linkUrl) && (
            <TextField label={u.type === 'link' ? 'Link URL' : 'Activity link (optional)'} value={u.linkUrl ?? ''} onChange={(e) => set({ linkUrl: e.target.value })} required={u.type === 'link'} placeholder="https://" />
          )}
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Lesson content
            </Typography>
            <RichEditor value={u.body ?? ''} onChange={(body) => set({ body })} placeholder="Write the lesson" minHeight={220} />
          </Box>
          </>
          )}
        </>
      )}
      <FormError message={err} error={save.error} />
    </FormDialog>
  );
}

/* -------------------------------------------------------------- Content */

function move<T>(arr: T[], i: number, d: -1 | 1) {
  const a = [...arr];
  const j = i + d;
  if (j < 0 || j >= a.length) return a;
  [a[i], a[j]] = [a[j], a[i]];
  return a;
}

function ContentTab({ course }: { course: CourseDetail }) {
  const [chapterDialog, setChapterDialog] = useState<{ chapter?: Chapter } | null>(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [delChapter, setDelChapter] = useState<Chapter | null>(null);
  const [unitDialog, setUnitDialog] = useState<{ chapter: Chapter; unitId?: string } | null>(null);
  const [delUnit, setDelUnit] = useState<Unit | null>(null);
  const inv = ['/courses', '/units'];
  const addChapter = useSend<{ title: string }>('post', `/courses/${course._id}/chapters`, { success: 'Chapter added', invalidate: inv, onSuccess: () => setChapterDialog(null) });
  const renameChapter = useSend<{ id: string; title: string }>('patch', (b) => `/chapters/${b.id}`, { success: 'Chapter renamed', invalidate: inv, onSuccess: () => setChapterDialog(null) });
  const removeChapter = useSend<string>('delete', (id) => `/chapters/${id}`, { success: 'Chapter deleted', invalidate: inv, onSuccess: () => setDelChapter(null) });
  const reorderChapters = useSend<{ ids: string[] }>('post', `/courses/${course._id}/chapters/reorder`, { invalidate: inv });
  const reorderUnits = useSend<{ chapterId: string; ids: string[] }>('post', (b) => `/chapters/${b.chapterId}/units/reorder`, { invalidate: inv });
  const removeUnit = useSend<string>('delete', (id) => `/units/${id}`, { success: 'Unit deleted', invalidate: inv, onSuccess: () => setDelUnit(null) });
  const busy = reorderChapters.isPending || reorderUnits.isPending;

  const openChapter = (chapter?: Chapter) => {
    setChapterTitle(chapter?.title ?? '');
    setChapterDialog({ chapter });
  };

  return (
    <>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography color="text.secondary">
          {course.chapters.length} chapters · {course.unitCount ?? 0} units
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => openChapter()}>
          Add chapter
        </Button>
      </Stack>
      {course.chapters.length === 0 && (
        <Paper variant="outlined">
          <Empty title="No chapters yet" hint="Chapters group the units students work through." action={<Button startIcon={<Add />} onClick={() => openChapter()}>Add the first chapter</Button>} />
        </Paper>
      )}
      <Stack spacing={2}>
        {course.chapters.map((ch, i) => (
          <Paper key={ch._id} variant="outlined" sx={{ overflow: 'hidden' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 2, py: 1.25, bgcolor: '#FAFBFE' }}>
              <Typography sx={{ fontWeight: 700, flex: 1, minWidth: 0 }} noWrap>
                Chapter {i + 1}: {ch.title}
              </Typography>
              <Tooltip title="Move chapter up">
                <span>
                  <IconButton size="small" disabled={i === 0 || busy} onClick={() => reorderChapters.mutate({ ids: move(course.chapters, i, -1).map((c) => c._id) })} aria-label="Move chapter up">
                    <ArrowUpward fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Move chapter down">
                <span>
                  <IconButton size="small" disabled={i === course.chapters.length - 1 || busy} onClick={() => reorderChapters.mutate({ ids: move(course.chapters, i, 1).map((c) => c._id) })} aria-label="Move chapter down">
                    <ArrowDownward fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <RowMenu
                label="Chapter actions"
                actions={[
                  { label: 'Rename', icon: <EditOutlined fontSize="small" />, onClick: () => openChapter(ch) },
                  { label: 'Delete chapter', icon: <DeleteOutlined fontSize="small" />, danger: true, onClick: () => setDelChapter(ch) },
                ]}
              />
            </Stack>
            <Divider />
            <List dense disablePadding>
              {ch.units.map((u, ui) => (
                <ListItem
                  key={u._id}
                  divider
                  secondaryAction={
                    <Stack direction="row" spacing={0.25}>
                      <IconButton size="small" disabled={ui === 0 || busy} aria-label="Move unit up" onClick={() => reorderUnits.mutate({ chapterId: ch._id, ids: move(ch.units, ui, -1).map((x) => x._id) })}>
                        <ArrowUpward fontSize="small" />
                      </IconButton>
                      <IconButton size="small" disabled={ui === ch.units.length - 1 || busy} aria-label="Move unit down" onClick={() => reorderUnits.mutate({ chapterId: ch._id, ids: move(ch.units, ui, 1).map((x) => x._id) })}>
                        <ArrowDownward fontSize="small" />
                      </IconButton>
                      <IconButton size="small" aria-label={`Edit ${u.title}`} onClick={() => setUnitDialog({ chapter: ch, unitId: u._id })}>
                        <EditOutlined fontSize="small" />
                      </IconButton>
                      <IconButton size="small" aria-label={`Delete ${u.title}`} color="error" onClick={() => setDelUnit(u)}>
                        <DeleteOutlined fontSize="small" />
                      </IconButton>
                    </Stack>
                  }
                  sx={{ pr: { xs: 20, sm: 22 } }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{UNIT_ICON[u.type]}</ListItemIcon>
                  <ListItemText
                    primary={u.title}
                    secondary={`${UNIT_TYPES.find((t) => t.value === u.type)?.label ?? u.type} · ${u.durationMin ?? 10} min · ${(u as { objectives?: unknown[] }).objectives?.length ?? 0} objectives · ${(u as { activities?: unknown[] }).activities?.length ?? 0} activities`}
                    slotProps={{ primary: { noWrap: true } }}
                  />
                </ListItem>
              ))}
              {ch.units.length === 0 && (
                <ListItem>
                  <ListItemText secondary="No units in this chapter yet" />
                </ListItem>
              )}
            </List>
            <Box sx={{ px: 1, py: 0.5 }}>
              <Button size="small" startIcon={<Add />} onClick={() => setUnitDialog({ chapter: ch })}>
                Add learning unit
              </Button>
            </Box>
          </Paper>
        ))}
      </Stack>

      <FormDialog
        open={!!chapterDialog}
        title={chapterDialog?.chapter ? 'Rename chapter' : 'Add chapter'}
        onClose={() => setChapterDialog(null)}
        loading={addChapter.isPending || renameChapter.isPending}
        submitLabel={chapterDialog?.chapter ? 'Save' : 'Add chapter'}
        onSubmit={() => {
          const t = chapterTitle.trim();
          if (!t) return;
          if (chapterDialog?.chapter) renameChapter.mutate({ id: chapterDialog.chapter._id, title: t });
          else addChapter.mutate({ title: t });
        }}
      >
        <TextField label="Chapter title" value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} required autoFocus />
        <FormError error={addChapter.error ?? renameChapter.error} />
      </FormDialog>
      {unitDialog && <UnitDialog chapter={unitDialog.chapter} unitId={unitDialog.unitId} onClose={() => setUnitDialog(null)} />}
      <ConfirmDialog
        open={!!delChapter}
        danger
        title={`Delete “${delChapter?.title}”?`}
        message={`This deletes the chapter and its ${delChapter?.units.length ?? 0} units, including students’ completion records for them. This cannot be undone.`}
        confirmLabel="Delete chapter"
        loading={removeChapter.isPending}
        onClose={() => setDelChapter(null)}
        onConfirm={() => delChapter && removeChapter.mutate(delChapter._id)}
      />
      <ConfirmDialog
        open={!!delUnit}
        danger
        title={`Delete “${delUnit?.title}”?`}
        message="Students’ completion records for this unit are deleted too. This cannot be undone."
        confirmLabel="Delete unit"
        loading={removeUnit.isPending}
        onClose={() => setDelUnit(null)}
        onConfirm={() => delUnit && removeUnit.mutate(delUnit._id)}
      />
    </>
  );
}

/* -------------------------------------------------------------- Quizzes */

function QuizzesTab({ course }: { course: CourseDetail }) {
  const q = useGet<QuizSummary[]>('/quizzes', { courseId: course._id });
  const [edit, setEdit] = useState<{ id?: string } | null>(null);
  const [attempts, setAttempts] = useState<QuizSummary | null>(null);
  const [del, setDel] = useState<QuizSummary | null>(null);
  const remove = useSend<string>('delete', (id) => `/quizzes/${id}`, { success: 'Quiz deleted', invalidate: ['/quizzes', `/courses/${course._id}`], onSuccess: () => setDel(null) });
  const chapterName = (id?: string) => course.chapters.find((c) => c._id === id)?.title;
  return (
    <Section title="Quizzes" action={<Button variant="contained" startIcon={<Add />} onClick={() => setEdit({})}>New quiz</Button>}>
      <QueryState q={q}>
        {(rows) => (
          <DataTable
            rows={rows}
            empty={<Empty title="No quizzes yet" hint="Quizzes check understanding after a chapter or at the end of the course." action={<Button startIcon={<Add />} onClick={() => setEdit({})}>Build a quiz</Button>} />}
            columns={[
              {
                key: 'title',
                label: 'Quiz',
                render: (x) => (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <QuizOutlined fontSize="small" color="secondary" />
                    <Typography component={RouterLink} to={`/admin/quizzes/${x._id}`} variant="body2" sx={{ fontWeight: 600, color: 'primary.main', textDecoration: 'none' }}>
                      {x.title}
                    </Typography>
                  </Stack>
                ),
              },
              { key: 'chapter', label: 'Chapter', render: (x) => chapterName(x.chapterId) ?? 'Whole course' },
              { key: 'qs', label: 'Questions', align: 'right', render: (x) => x.questionCount ?? 0 },
              { key: 'pts', label: 'Points', align: 'right', render: (x) => x.totalPoints ?? 0 },
              { key: 'status', label: 'Status', render: (x) => <StatusChip status={x.status} /> },
              {
                key: 'x',
                label: '',
                align: 'right',
                render: (x) => (
                  <RowMenu
                    actions={[
                      { label: 'Edit', icon: <EditOutlined fontSize="small" />, onClick: () => setEdit({ id: x._id }) },
                      { label: 'View attempts', icon: <VisibilityOutlined fontSize="small" />, onClick: () => setAttempts(x) },
                      { label: 'Delete', icon: <DeleteOutlined fontSize="small" />, danger: true, onClick: () => setDel(x) },
                    ]}
                  />
                ),
              },
            ]}
          />
        )}
      </QueryState>
      {edit && <QuizEditDialog courseId={course._id} quizId={edit.id} chapters={course.chapters} onClose={() => setEdit(null)} />}
      {attempts && <AttemptsDialog quizId={attempts._id} title={attempts.title} onClose={() => setAttempts(null)} />}
      <ConfirmDialog
        open={!!del}
        danger
        title={`Delete “${del?.title}”?`}
        message="All student attempts and scores for this quiz are deleted too. This cannot be undone."
        confirmLabel="Delete quiz"
        loading={remove.isPending}
        onClose={() => setDel(null)}
        onConfirm={() => del && remove.mutate(del._id)}
      />
    </Section>
  );
}

/* --------------------------------------------------------------- Access */

function AccessTab({ course }: { course: CourseDetail }) {
  const grants = useGet<CourseGrant[]>('/course-grants', { courseId: course._id });
  const partners = useGet<Paged<Partner>>('/partners', { limit: 200 });
  const schools = useGet<Paged<School>>('/schools', { limit: 200 });
  const [kind, setKind] = useState<'partner' | 'school'>('partner');
  const [target, setTarget] = useState('');
  const [revoke, setRevoke] = useState<CourseGrant | null>(null);
  const grant = useSend<Record<string, string>>('post', '/course-grants', { success: 'Access granted', invalidate: ['/course-grants'], onSuccess: () => setTarget('') });
  const remove = useSend<string>('delete', (id) => `/course-grants/${id}`, { success: 'Access removed', invalidate: ['/course-grants'], onSuccess: () => setRevoke(null) });
  const rows = grants.data ?? [];
  const has = new Set(rows.map((g) => (g.partnerId ? `p:${refId(g.partnerId)}` : `s:${refId(g.schoolId)}`)));
  const options = kind === 'partner' ? (partners.data?.items ?? []).filter((p) => !has.has(`p:${p._id}`)) : (schools.data?.items ?? []).filter((s) => !has.has(`s:${s._id}`));
  return (
    <>
      {course.status !== 'published' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This course is {course.status}. Schools with access will only see it once it is published.
        </Alert>
      )}
      <Section title="Give access">
        <Stack
          component="form"
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ alignItems: { md: 'center' } }}
          onSubmit={(e) => {
            e.preventDefault();
            if (target) grant.mutate({ courseId: course._id, [kind === 'partner' ? 'partnerId' : 'schoolId']: target });
          }}
        >
          <ToggleButtonGroup size="small" exclusive value={kind} onChange={(_, v) => { if (v) { setKind(v); setTarget(''); } }}>
            <ToggleButton value="partner">Partner</ToggleButton>
            <ToggleButton value="school">School</ToggleButton>
          </ToggleButtonGroup>
          <TextField select label={kind === 'partner' ? 'Partner' : 'School'} value={target} onChange={(e) => setTarget(e.target.value)} sx={{ minWidth: 260 }}>
            {options.length === 0 && <MenuItem disabled>Everyone already has access</MenuItem>}
            {options.map((o) => (
              <MenuItem key={o._id} value={o._id}>
                {o.name}
              </MenuItem>
            ))}
          </TextField>
          <Button type="submit" variant="contained" disabled={!target || grant.isPending} sx={{ flexShrink: 0 }}>
            Grant access
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          Granting to a partner gives every one of its schools access.
        </Typography>
        <Box sx={{ mt: 1 }}>
          <FormError error={grant.error} />
        </Box>
      </Section>
      <Section title="Who has access">
        <QueryState q={grants}>
          {() => (
            <DataTable
              rows={rows}
              empty={<Empty title="No one has access yet" hint="Grant the course to a partner or a school above." />}
              columns={[
                { key: 'who', label: 'Granted to', render: (g) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{g.partnerId?.name ?? g.schoolId?.name ?? '—'}</Typography> },
                { key: 'kind', label: 'Type', render: (g) => <Chip size="small" variant="outlined" label={g.partnerId ? 'Partner' : 'School'} /> },
                { key: 'since', label: 'Since', render: (g) => fmtDate(g.createdAt) },
                { key: 'x', label: '', align: 'right', render: (g) => <Button size="small" color="error" startIcon={<DeleteOutlined />} onClick={() => setRevoke(g)}>Revoke</Button> },
              ]}
            />
          )}
        </QueryState>
      </Section>
      <ConfirmDialog
        open={!!revoke}
        danger
        title="Revoke access?"
        message={`${revoke?.partnerId?.name ?? revoke?.schoolId?.name} will lose access to ${course.title}${revoke?.partnerId ? ', including all of its schools that do not have their own grant' : ''}.`}
        confirmLabel="Revoke"
        loading={remove.isPending}
        onClose={() => setRevoke(null)}
        onConfirm={() => revoke && remove.mutate(revoke._id)}
      />
    </>
  );
}

/* ---------------------------------------------------------------- Page */

export default function CourseEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const q = useGet<CourseDetail>(`/courses/${id}`);
  const [tab, setTab] = useTab(TABS, 'details');
  const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null);
  const setStatus = useSend<{ status: Course['status'] }>('patch', `/courses/${id}`, {
    invalidate: ['/courses', '/dashboard'],
    onSuccess: () => setConfirm(null),
    success: 'Course status updated',
  });
  const remove = useSend<void, { archived?: boolean }>('delete', `/courses/${id}`, {
    invalidate: ['/courses', '/dashboard'],
    onSuccess: (r) => {
      setConfirm(null);
      if (r.archived) toast.info('This course is used by classes, so it was archived instead of deleted');
      else {
        toast.success('Course deleted');
        navigate('/admin/courses');
      }
    },
  });
  return (
    <>
      <BackLink to="/admin/courses" label="Course studio" />
      <QueryState q={q}>
        {(c) => (
          <>
            <PageHeader
              title={c.title}
              subtitle={`${c.category ?? 'Uncategorised'} · ${c.grades?.length ? `Grades ${c.grades.join(', ')}` : 'Any grade'} · ${c.chapters.length} chapters`}
              actions={
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <StatusChip status={c.status} />
                  </Box>
                  <Button startIcon={<VisibilityOutlined />} component={RouterLink} to={`/admin/courses/${c._id}`}>
                    Preview as student
                  </Button>
                  {c.status !== 'published' ? (
                    <Button variant="contained" startIcon={<PublishOutlined />} onClick={() => setStatus.mutate({ status: 'published' })} disabled={setStatus.isPending}>
                      Publish
                    </Button>
                  ) : (
                    <Button variant="outlined" startIcon={<UnpublishedOutlined />} onClick={() => setStatus.mutate({ status: 'draft' })} disabled={setStatus.isPending}>
                      Unpublish
                    </Button>
                  )}
                  <RowMenu
                    label="More course actions"
                    actions={[
                      { label: 'Archive', icon: <ArchiveOutlined fontSize="small" />, onClick: () => setConfirm('archive'), hidden: c.status === 'archived' },
                      { label: 'Delete course', icon: <DeleteOutlined fontSize="small" />, danger: true, onClick: () => setConfirm('delete') },
                    ]}
                  />
                </>
              }
            />
            <TabBar
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'details', label: 'Details' },
                { value: 'content', label: `Chapters & units (${c.unitCount ?? 0})` },
                { value: 'quizzes', label: 'Quizzes' },
                { value: 'access', label: 'Access' },
              ]}
            />
            {tab === 'details' && <DetailsTab key={c._id + (c as { updatedAt?: string }).updatedAt} course={c} />}
            {tab === 'content' && <ContentTab course={c} />}
            {tab === 'quizzes' && <QuizzesTab course={c} />}
            {tab === 'access' && <AccessTab course={c} />}
            <ConfirmDialog
              open={confirm === 'archive'}
              title="Archive this course?"
              message="Archived courses are hidden from schools and students. You can publish it again later."
              confirmLabel="Archive"
              loading={setStatus.isPending}
              onClose={() => setConfirm(null)}
              onConfirm={() => setStatus.mutate({ status: 'archived' })}
            />
            <ConfirmDialog
              open={confirm === 'delete'}
              danger
              title="Delete this course?"
              message="If any class uses this course it is archived instead, so student progress is kept. Otherwise the course, its chapters, units, quizzes and access grants are deleted for good."
              confirmLabel="Delete"
              loading={remove.isPending}
              onClose={() => setConfirm(null)}
              onConfirm={() => remove.mutate()}
            />
          </>
        )}
      </QueryState>
    </>
  );
}
