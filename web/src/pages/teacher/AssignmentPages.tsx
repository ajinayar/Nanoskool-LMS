import { Alert, Box, Button, Chip, IconButton, Link, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import AttachFileOutlined from '@mui/icons-material/AttachFileOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import GradingOutlined from '@mui/icons-material/GradingOutlined';
import Close from '@mui/icons-material/Close';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { refId, refName, type Assignment, type ClassCourse, type Submission, type User } from '@/api/types';
import { useGet, useSend } from '@/lib/hooks';
import { RichEditor } from '@/components/RichEditor';
import {
  CardGrid,
  ConfirmDialog,
  DataTable,
  DueDate,
  Empty,
  FormDialog,
  PageHeader,
  QueryState,
  RichText,
  Section,
  StatCard,
  StatusChip,
  UploadButton,
  UserCell,
  fmtDateTime,
} from '@/components/ui';
import { BackButton, ClassSelect, FilterBar, KIND_LABEL, T, WideTable, toLocalInput, SHOW_EMPTY } from './common';

/** Uploaded files get random names on the server, so label them by type. */
export const fileName = (url: string) => {
  const ext = url.split('?')[0].split('.').pop() ?? '';
  return ext && ext.length <= 4 && !ext.includes('/') ? `${ext.toUpperCase()} file` : 'Attached file';
};

export const isLate = (sub: Submission | null | undefined, due?: string | null) => !!(sub && due && dayjs(sub.submittedAt).isAfter(dayjs(due)));

/* ---------------------------------------------------------- Create / edit */

export function AssignmentDialog({ onClose, assignment, defaultClassId }: { onClose: () => void; assignment?: Assignment; defaultClassId?: string }) {
  const navigate = useNavigate();
  const editing = !!assignment;
  const [classId, setClassId] = useState(assignment ? refId(assignment.classId) : (defaultClassId ?? ''));
  const [courseId, setCourseId] = useState(assignment?.courseId ? refId(assignment.courseId) : '');
  const [kind, setKind] = useState<Assignment['kind']>(assignment?.kind ?? 'homework');
  const [title, setTitle] = useState(assignment?.title ?? '');
  const [instructions, setInstructions] = useState(assignment?.instructions ?? '');
  const [attachmentUrl, setAttachmentUrl] = useState(assignment?.attachmentUrl ?? '');
  const [dueDate, setDueDate] = useState(assignment ? toLocalInput(assignment.dueDate) : dayjs().add(7, 'day').hour(17).minute(0).format('YYYY-MM-DDTHH:mm'));
  const [maxPoints, setMaxPoints] = useState(String(assignment?.maxPoints ?? 10));
  const [status, setStatus] = useState<Assignment['status']>(assignment?.status ?? 'published');
  const [err, setErr] = useState('');
  const courses = useGet<ClassCourse[]>(classId ? '/class-courses' : null, { classId });

  const save = useSend<Record<string, unknown>, Assignment>(editing ? 'patch' : 'post', editing ? `/assignments/${assignment!._id}` : '/assignments', {
    success: editing ? 'Assignment updated' : status === 'published' ? 'Assignment published' : 'Draft saved',
    invalidate: ['/assignments', '/dashboard'],
    onSuccess: (a) => {
      onClose();
      if (!editing) navigate(`${T}/assignments/${a._id}`);
    },
  });

  const submit = () => {
    if (!classId) return setErr('Choose a class');
    if (!title.trim()) return setErr('Give the assignment a title');
    const pts = Number(maxPoints);
    if (!Number.isFinite(pts) || pts < 0 || pts > 1000) return setErr('Max points must be between 0 and 1000');
    setErr('');
    save.mutate({
      ...(editing ? {} : { classId }),
      courseId: courseId || null,
      kind,
      title: title.trim(),
      instructions,
      attachmentUrl: attachmentUrl || undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      maxPoints: pts,
      status,
    });
  };

  return (
    <FormDialog open title={editing ? 'Edit assignment' : 'New assignment'} onClose={onClose} onSubmit={submit} loading={save.isPending} submitLabel={editing ? 'Save changes' : status === 'published' ? 'Publish' : 'Save draft'} maxWidth="md">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {editing ? (
          <TextField label="Class" value={refName(assignment!.classId)} disabled helperText="The class cannot be changed" />
        ) : (
          <ClassSelect
            value={classId}
            onChange={(id) => {
              setClassId(id);
              setCourseId('');
            }}
            required
          />
        )}
        <TextField select label="Course (optional)" value={courses.data ? courseId : ''} onChange={(e) => setCourseId(e.target.value)} disabled={!classId} slotProps={SHOW_EMPTY}>
          <MenuItem value="">Not linked to a course</MenuItem>
          {(courses.data ?? []).map((cc) => (
            <MenuItem key={cc._id} value={refId(cc.courseId)}>
              {refName(cc.courseId)}
            </MenuItem>
          ))}
        </TextField>
        <TextField select label="Type" value={kind} onChange={(e) => setKind(e.target.value as Assignment['kind'])} sx={{ minWidth: 150 }}>
          <MenuItem value="homework">Homework</MenuItem>
          <MenuItem value="project">Project</MenuItem>
          <MenuItem value="activity">Activity</MenuItem>
        </TextField>
      </Stack>
      <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required slotProps={{ htmlInput: { maxLength: 200 } }} />
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          Instructions
        </Typography>
        <RichEditor value={instructions} onChange={setInstructions} uploadFolder="assignments" minHeight={160} placeholder="Assignment instructions" />
      </Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <UploadButton folder="assignments" label={attachmentUrl ? 'Replace attachment' : 'Attach a file'} onUploaded={(url) => setAttachmentUrl(url)} />
        {attachmentUrl && (
          <Chip icon={<AttachFileOutlined />} label={fileName(attachmentUrl)} onDelete={() => setAttachmentUrl('')} deleteIcon={<Close />} component="a" href={attachmentUrl} target="_blank" clickable />
        )}
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Due" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} helperText="Leave empty for no due date" />
        <TextField label="Max points" type="number" value={maxPoints} onChange={(e) => setMaxPoints(e.target.value)} slotProps={{ htmlInput: { min: 0, max: 1000 } }} sx={{ maxWidth: { sm: 150 } }} />
        <TextField
          select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as Assignment['status'])}
          sx={{ maxWidth: { sm: 240 } }}
          helperText={status === 'draft' ? 'Students cannot see it yet' : status === 'published' ? 'Open for submissions' : 'Visible, no new submissions'}
        >
          <MenuItem value="draft">Draft</MenuItem>
          <MenuItem value="published">Published</MenuItem>
          <MenuItem value="closed">Closed</MenuItem>
        </TextField>
      </Stack>
      {err && <Alert severity="error">{err}</Alert>}
    </FormDialog>
  );
}

/* ------------------------------------------------------------------ List */

export function AssignmentTable({ rows, onEdit, onDelete }: { rows: Assignment[]; onEdit: (a: Assignment) => void; onDelete: (a: Assignment) => void }) {
  const navigate = useNavigate();
  return (
    <WideTable min={760}>
    <DataTable
      rows={rows}
      onRowClick={(a) => navigate(`${T}/assignments/${a._id}`)}
      empty={<Empty title="No assignments yet" hint="Create one to share homework, projects or activities with a class." />}
      columns={[
        {
          key: 'title',
          label: 'Assignment',
          render: (a) => (
            <Box>
              <Typography sx={{ fontWeight: 600 }}>{a.title}</Typography>
              <Typography variant="caption" color="text.secondary">
                {KIND_LABEL[a.kind]}
                {refName(a.courseId) ? ` · ${refName(a.courseId)}` : ''}
              </Typography>
            </Box>
          ),
        },
        { key: 'class', label: 'Class', render: (a) => refName(a.classId) },
        { key: 'due', label: 'Due', render: (a) => <DueDate date={a.dueDate} /> },
        { key: 'status', label: 'Status', render: (a) => <StatusChip status={a.status} /> },
        {
          key: 'subs',
          label: 'Submitted / graded',
          render: (a) => (
            <Stack direction="row" spacing={0.5}>
              <Chip size="small" label={`${a.submissionCount ?? 0} in`} />
              <Chip size="small" variant="outlined" color={(a.gradedCount ?? 0) < (a.submissionCount ?? 0) ? 'warning' : 'success'} label={`${a.gradedCount ?? 0} graded`} />
            </Stack>
          ),
        },
        {
          key: 'actions',
          label: '',
          align: 'right',
          render: (a) => (
            <Stack direction="row" sx={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => onEdit(a)} aria-label="Edit assignment">
                  <EditOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" onClick={() => onDelete(a)} aria-label="Delete assignment">
                  <DeleteOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ),
        },
      ]}
    />
    </WideTable>
  );
}

/** Delete confirmation shared by the list and the detail page. */
export function DeleteAssignmentDialog({ assignment, onClose, onDeleted }: { assignment: Assignment | null; onClose: () => void; onDeleted?: () => void }) {
  const remove = useSend('delete', (a: Assignment) => `/assignments/${a._id}`, {
    success: 'Assignment deleted',
    invalidate: ['/assignments', '/dashboard', '/reports'],
    onSuccess: () => {
      onClose();
      onDeleted?.();
    },
  });
  return (
    <ConfirmDialog
      open={!!assignment}
      title="Delete this assignment?"
      message={
        <Typography>
          <b>{assignment?.title}</b> and every student submission for it will be deleted. This cannot be undone.
        </Typography>
      }
      danger
      confirmLabel="Delete"
      loading={remove.isPending}
      onClose={onClose}
      onConfirm={() => assignment && remove.mutate(assignment)}
    />
  );
}

/** Assignments of one class, or all of mine; used by the list page and the class page. */
export function AssignmentsPanel({ classId }: { classId?: string }) {
  const q = useGet<Assignment[]>('/assignments', classId ? { classId } : undefined);
  const [edit, setEdit] = useState<Assignment | null | 'new'>(null);
  const [del, setDel] = useState<Assignment | null>(null);
  return (
    <>
      <Section
        title="Assignments"
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => setEdit('new')}>
            New assignment
          </Button>
        }
      >
        <QueryState q={q}>{(rows) => <AssignmentTable rows={rows} onEdit={setEdit} onDelete={setDel} />}</QueryState>
      </Section>
      {edit && <AssignmentDialog onClose={() => setEdit(null)} assignment={edit === 'new' ? undefined : edit} defaultClassId={classId} />}
      <DeleteAssignmentDialog assignment={del} onClose={() => setDel(null)} />
    </>
  );
}

export function TeacherAssignmentsPage() {
  const [params, setParams] = useSearchParams();
  const classId = params.get('classId') ?? '';
  const [status, setStatus] = useState('');
  const q = useGet<Assignment[]>('/assignments', classId ? { classId } : undefined);
  const [edit, setEdit] = useState<Assignment | null | 'new'>(null);
  const [del, setDel] = useState<Assignment | null>(null);

  // Dashboard shortcut: /teacher/assignments?new=1 opens the create dialog
  useEffect(() => {
    if (params.get('new')) {
      setEdit('new');
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  return (
    <>
      <PageHeader
        title="Assignments"
        subtitle="Homework, projects and activities for your classes"
        actions={
          <Button variant="contained" startIcon={<Add />} onClick={() => setEdit('new')}>
            New assignment
          </Button>
        }
      />
      <Section title="All assignments">
        <FilterBar>
            <ClassSelect
              value={classId}
              allowAll="All classes"
              onChange={(id) => {
                const next = new URLSearchParams(params);
                if (id) next.set('classId', id);
                else next.delete('classId');
                setParams(next, { replace: true });
              }}
              sx={{ minWidth: 160 }}
            />
            <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 130 }} slotProps={SHOW_EMPTY}>
              <MenuItem value="">Any status</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="published">Published</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </TextField>
          </FilterBar>
        <QueryState q={q}>{(rows) => <AssignmentTable rows={rows.filter((a) => !status || a.status === status)} onEdit={setEdit} onDelete={setDel} />}</QueryState>
      </Section>
      {edit && <AssignmentDialog onClose={() => setEdit(null)} assignment={edit === 'new' ? undefined : edit} defaultClassId={classId || undefined} />}
      <DeleteAssignmentDialog assignment={del} onClose={() => setDel(null)} />
    </>
  );
}

/* ---------------------------------------------------------------- Detail */

type RosterRow = { _id: string; student: User; submission: Submission | null };

function GradeDialog({ row, maxPoints, onClose }: { row: RosterRow; maxPoints: number; onClose: () => void }) {
  const sub = row.submission!;
  const [points, setPoints] = useState(sub.points != null ? String(sub.points) : '');
  const [feedback, setFeedback] = useState(sub.feedback ?? '');
  const [status, setStatus] = useState<'graded' | 'returned'>(sub.status === 'returned' ? 'returned' : 'graded');
  const [err, setErr] = useState('');
  const grade = useSend('post', `/submissions/${sub._id}/grade`, {
    success: status === 'graded' ? 'Grade saved' : 'Returned to the student',
    invalidate: ['/assignments', '/dashboard', '/reports'],
    onSuccess: onClose,
  });
  return (
    <FormDialog
      open
      title={`Grade: ${row.student.name}`}
      onClose={onClose}
      loading={grade.isPending}
      submitLabel={status === 'graded' ? 'Save grade' : 'Return for changes'}
      onSubmit={() => {
        const p = Number(points);
        if (points === '' || !Number.isFinite(p)) return setErr('Enter points');
        if (p < 0 || p > maxPoints) return setErr(`Points must be between 0 and ${maxPoints}`);
        setErr('');
        grade.mutate({ points: p, feedback: feedback.trim() || undefined, status });
      }}
    >
      <SubmissionBody sub={sub} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={`Points (out of ${maxPoints})`}
          type="number"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          required
          autoFocus
          slotProps={{ htmlInput: { step: 'any' } }}
          error={!!err}
          helperText={err || ' '}
        />
        <TextField select label="Outcome" value={status} onChange={(e) => setStatus(e.target.value as 'graded' | 'returned')} helperText={status === 'returned' ? 'The student can edit and resubmit' : 'Final grade'}>
          <MenuItem value="graded">Graded</MenuItem>
          <MenuItem value="returned">Returned for changes</MenuItem>
        </TextField>
      </Stack>
      <TextField label="Feedback for the student" value={feedback} onChange={(e) => setFeedback(e.target.value)} multiline minRows={3} slotProps={{ htmlInput: { maxLength: 5000 } }} />
    </FormDialog>
  );
}

function SubmissionBody({ sub }: { sub: Submission }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#FAFBFE' }}>
      <Typography variant="caption" color="text.secondary">
        Submitted {fmtDateTime(sub.submittedAt)}
      </Typography>
      {sub.text && <Typography sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>{sub.text}</Typography>}
      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
        {sub.fileUrl && <Chip icon={<AttachFileOutlined />} label={fileName(sub.fileUrl)} component="a" href={sub.fileUrl} target="_blank" rel="noopener" clickable />}
        {sub.linkUrl && <Chip icon={<LinkOutlined />} label={sub.linkUrl.replace(/^https?:\/\//, '').slice(0, 50)} component="a" href={sub.linkUrl} target="_blank" rel="noopener" clickable />}
      </Stack>
    </Paper>
  );
}

export function TeacherAssignmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const q = useGet<Assignment>(`/assignments/${id}`);
  const [grading, setGrading] = useState<RosterRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [del, setDel] = useState<Assignment | null>(null);
  const [filter, setFilter] = useState<'all' | 'to_grade' | 'missing'>('all');
  return (
    <QueryState q={q}>
      {(a) => {
        const roster: RosterRow[] = (a.roster ?? []).map((r) => ({ ...r, _id: r.student._id }));
        const submitted = roster.filter((r) => r.submission).length;
        const toGrade = roster.filter((r) => r.submission?.status === 'submitted').length;
        const graded = roster.filter((r) => r.submission?.status === 'graded');
        const avg = graded.length && a.maxPoints ? Math.round((graded.reduce((s, r) => s + (r.submission!.points ?? 0), 0) / graded.length / a.maxPoints) * 100) : null;
        const rows = roster.filter((r) => (filter === 'to_grade' ? r.submission?.status === 'submitted' : filter === 'missing' ? !r.submission : true));
        return (
          <>
            <BackButton to={`${T}/assignments`}>Assignments</BackButton>
            <PageHeader
              title={a.title}
              subtitle={`${refName(a.classId)} · ${KIND_LABEL[a.kind]}${refName(a.courseId) ? ` · ${refName(a.courseId)}` : ''} · ${a.maxPoints} points`}
              actions={
                <>
                  <Button variant="outlined" startIcon={<EditOutlined />} onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                  <Button color="error" startIcon={<DeleteOutlined />} onClick={() => setDel(a)}>
                    Delete
                  </Button>
                </>
              }
            />
            <CardGrid min={150}>
              <StatCard label="Status" value={<StatusChip status={a.status} />} />
              <StatCard label="Submitted" value={`${submitted}/${roster.length}`} />
              <StatCard label="To grade" value={toGrade} color={toGrade ? 'secondary.main' : undefined} />
              <StatCard label="Average grade" value={avg == null ? '—' : `${avg}%`} hint={`${graded.length} graded`} />
            </CardGrid>
            <Box sx={{ mt: 3, display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1fr 2fr' }, alignItems: 'start' }}>
              <Section title="Details">
                <Stack spacing={1.5}>
                  <DueDate date={a.dueDate} />
                  {a.instructions ? <RichText html={a.instructions} /> : <Typography color="text.secondary">No instructions written.</Typography>}
                  {a.attachmentUrl && (
                    <Box>
                      <Button variant="outlined" startIcon={<AttachFileOutlined />} href={a.attachmentUrl} target="_blank" rel="noopener">
                        {fileName(a.attachmentUrl)}
                      </Button>
                    </Box>
                  )}
                </Stack>
              </Section>
              <Section
                title="Submissions"
                action={
                  <TextField select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} sx={{ width: 170 }} aria-label="Filter submissions">
                    <MenuItem value="all">Everyone</MenuItem>
                    <MenuItem value="to_grade">Waiting to grade</MenuItem>
                    <MenuItem value="missing">Not submitted</MenuItem>
                  </TextField>
                }
              >
                <WideTable min={760}>
                <DataTable
                  rows={rows}
                  empty={<Empty title={roster.length ? 'No students match this filter' : 'No students in this class'} />}
                  columns={[
                    { key: 'student', label: 'Student', render: (r) => <UserCell name={r.student.name} sub={r.student.rollNo ? `Roll no. ${r.student.rollNo}` : undefined} /> },
                    {
                      key: 'work',
                      label: 'Work',
                      render: (r) =>
                        r.submission ? (
                          <Stack spacing={0.5} sx={{ maxWidth: 280 }}>
                            {r.submission.text && (
                              <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {r.submission.text}
                              </Typography>
                            )}
                            <Stack direction="row" spacing={1}>
                              {r.submission.fileUrl && (
                                <Link href={r.submission.fileUrl} target="_blank" rel="noopener" variant="body2" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                  <AttachFileOutlined sx={{ fontSize: 16 }} /> File
                                </Link>
                              )}
                              {r.submission.linkUrl && (
                                <Link href={r.submission.linkUrl} target="_blank" rel="noopener" variant="body2" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                  <LinkOutlined sx={{ fontSize: 16 }} /> Link
                                </Link>
                              )}
                            </Stack>
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Not submitted
                          </Typography>
                        ),
                    },
                    {
                      key: 'when',
                      label: 'Submitted',
                      render: (r) =>
                        r.submission ? (
                          <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
                            <Typography variant="body2">{fmtDateTime(r.submission.submittedAt)}</Typography>
                            {isLate(r.submission, a.dueDate) && <StatusChip status="late" />}
                          </Stack>
                        ) : a.dueDate && dayjs(a.dueDate).isBefore(dayjs()) ? (
                          <StatusChip status="overdue" label="Missing" />
                        ) : (
                          '—'
                        ),
                    },
                    {
                      key: 'grade',
                      label: 'Grade',
                      render: (r) =>
                        r.submission ? (
                          <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
                            <StatusChip status={r.submission.status} label={r.submission.status === 'submitted' ? 'To grade' : undefined} />
                            {r.submission.points != null && r.submission.status !== 'submitted' && (
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {r.submission.points}/{a.maxPoints}
                              </Typography>
                            )}
                          </Stack>
                        ) : (
                          '—'
                        ),
                    },
                    {
                      key: 'act',
                      label: '',
                      align: 'right',
                      render: (r) =>
                        r.submission && (
                          <Button size="small" variant={r.submission.status === 'submitted' ? 'contained' : 'outlined'} startIcon={<GradingOutlined />} onClick={() => setGrading(r)}>
                            {r.submission.status === 'submitted' ? 'Grade' : 'Regrade'}
                          </Button>
                        ),
                    },
                  ]}
                />
                </WideTable>
              </Section>
            </Box>
            {grading && <GradeDialog row={grading} maxPoints={a.maxPoints} onClose={() => setGrading(null)} />}
            {editing && <AssignmentDialog assignment={a} onClose={() => setEditing(false)} />}
            <DeleteAssignmentDialog assignment={del} onClose={() => setDel(null)} onDeleted={() => navigate(`${T}/assignments`, { replace: true })} />
          </>
        );
      }}
    </QueryState>
  );
}

