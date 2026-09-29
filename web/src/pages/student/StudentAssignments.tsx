import { Alert, Box, Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material';
import AttachFileOutlined from '@mui/icons-material/AttachFileOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import SendOutlined from '@mui/icons-material/SendOutlined';
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined';
import Close from '@mui/icons-material/Close';
import EditOutlined from '@mui/icons-material/EditOutlined';
import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { errorMessage } from '@/api/client';
import { refName, type Assignment } from '@/api/types';
import { useGet, useSend } from '@/lib/hooks';
import { DueDate, Empty, PageHeader, QueryState, RichText, Section, StatusChip, UploadButton, fmtDateTime } from '@/components/ui';
import { BackButton, KIND_LABEL, UrlTabs, useTab } from '@/pages/teacher/common';
import { fileName, isLate } from '@/pages/teacher/AssignmentPages';
import { S, assignmentState, type AssignmentState } from './common';

const STATE_CHIP: Record<AssignmentState, { status: string; label: string }> = {
  todo: { status: 'pending', label: 'To do' },
  overdue: { status: 'overdue', label: 'Overdue' },
  closed: { status: 'closed', label: 'Closed' },
  submitted: { status: 'submitted', label: 'Submitted' },
  returned: { status: 'returned', label: 'Needs changes' },
  graded: { status: 'graded', label: 'Graded' },
};

const TABS = ['todo', 'submitted', 'graded'] as const;

function AssignmentRow({ a }: { a: Assignment }) {
  const st = assignmentState(a);
  const accent = st === 'overdue' ? 'error.main' : st === 'returned' ? 'warning.main' : st === 'graded' ? 'success.main' : st === 'submitted' ? 'info.main' : 'primary.main';
  return (
    <Paper
      variant="outlined"
      component={RouterLink}
      to={`${S}/assignments/${a._id}`}
      sx={{ p: 2, display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, textDecoration: 'none', color: 'inherit', borderLeft: 4, borderLeftColor: accent, '&:hover': { bgcolor: '#FAFBFE' } }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 650 }}>{a.title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {KIND_LABEL[a.kind]}
          {refName(a.courseId) ? ` · ${refName(a.courseId)}` : ''}
          {refName(a.createdBy) ? ` · ${refName(a.createdBy)}` : ''}
        </Typography>
      </Box>
      {st === 'graded' ? (
        <Chip color="success" icon={<EmojiEventsOutlined />} label={`${a.submission?.points ?? 0}/${a.maxPoints} points`} />
      ) : st === 'submitted' ? (
        <Typography variant="body2" color="text.secondary">
          Sent {fmtDateTime(a.submission?.submittedAt)}
        </Typography>
      ) : (
        <DueDate date={a.dueDate} />
      )}
      <Box sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}>
        <StatusChip status={STATE_CHIP[st].status} label={STATE_CHIP[st].label} />
      </Box>
    </Paper>
  );
}

export function StudentAssignmentsPage() {
  const q = useGet<Assignment[]>('/assignments');
  const [tab, setTab] = useTab(TABS, 'todo');
  return (
    <>
      <PageHeader title="Assignments" subtitle="Homework, projects and activities from your teachers" />
      <QueryState q={q}>
        {(items) => {
          const groups = {
            todo: items.filter((a) => ['todo', 'overdue', 'returned', 'closed'].includes(assignmentState(a))),
            submitted: items.filter((a) => assignmentState(a) === 'submitted'),
            graded: items.filter((a) => assignmentState(a) === 'graded'),
          };
          // Overdue and returned work first, then by due date
          const order: Record<AssignmentState, number> = { returned: 0, overdue: 1, todo: 2, closed: 3, submitted: 4, graded: 5 };
          const rows = [...groups[tab]].sort((a, b) => order[assignmentState(a)] - order[assignmentState(b)]);
          return (
            <>
              <UrlTabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: 'todo', label: `To do (${groups.todo.filter((a) => assignmentState(a) !== 'closed').length})` },
                  { value: 'submitted', label: `Submitted (${groups.submitted.length})` },
                  { value: 'graded', label: `Graded (${groups.graded.length})` },
                ]}
              />
              {rows.length === 0 ? (
                <Empty
                  title={tab === 'todo' ? 'All caught up!' : tab === 'submitted' ? 'Nothing waiting for a grade' : 'No graded work yet'}
                  hint={tab === 'todo' ? 'You have no assignments to do right now.' : tab === 'submitted' ? 'Work you hand in shows here until your teacher grades it.' : 'Grades and feedback from your teachers show here.'}
                />
              ) : (
                <Stack spacing={1.5}>
                  {rows.map((a) => (
                    <AssignmentRow key={a._id} a={a} />
                  ))}
                </Stack>
              )}
            </>
          );
        }}
      </QueryState>
    </>
  );
}

function SubmitForm({ a, onDone }: { a: Assignment; onDone?: () => void }) {
  const sub = a.submission;
  const [text, setText] = useState(sub?.text ?? '');
  const [fileUrl, setFileUrl] = useState(sub?.fileUrl ?? '');
  const [linkUrl, setLinkUrl] = useState(sub?.linkUrl ?? '');
  const [err, setErr] = useState('');
  const send = useSend<Record<string, string>, { late?: boolean }>('post', `/assignments/${a._id}/submit`, {
    success: sub ? 'Your work was updated' : 'Handed in. Well done!',
    invalidate: ['/assignments', '/dashboard', '/reports', '/rewards'],
    onSuccess: () => onDone?.(),
  });
  const submit = () => {
    const link = linkUrl.trim();
    if (!text.trim() && !fileUrl && !link) return setErr('Add some text, a file or a link before you hand in.');
    if (link && !/^https?:\/\/\S+\.\S+/.test(link)) return setErr('The link should start with http:// or https://');
    setErr('');
    send.mutate({ text: text.trim(), fileUrl, linkUrl: link });
  };
  return (
    <Stack spacing={2}>
      <TextField label="Your answer or notes" value={text} onChange={(e) => setText(e.target.value)} multiline minRows={5} slotProps={{ htmlInput: { maxLength: 20000 } }} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <UploadButton folder="submissions" label={fileUrl ? 'Replace file' : 'Upload a file'} onUploaded={(url) => setFileUrl(url)} />
        {fileUrl && <Chip icon={<AttachFileOutlined />} label={fileName(fileUrl)} component="a" href={fileUrl} target="_blank" clickable onDelete={() => setFileUrl('')} deleteIcon={<Close />} />}
      </Stack>
      <TextField
        label="Link (optional)"
        placeholder="https://scratch.mit.edu/projects/…"
        value={linkUrl}
        onChange={(e) => setLinkUrl(e.target.value)}
        slotProps={{ input: { startAdornment: <LinkOutlined fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> } }}
        helperText="A Scratch project, Tinkercad design, video or document link"
      />
      {err || send.error ? <Alert severity="error">{err || errorMessage(send.error)}</Alert> : null}
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        {onDone && sub && <Button onClick={onDone}>Cancel</Button>}
        <Button variant="contained" size="large" startIcon={<SendOutlined />} onClick={submit} disabled={send.isPending}>
          {send.isPending ? 'Sending…' : sub ? 'Hand in again' : 'Hand in'}
        </Button>
      </Stack>
    </Stack>
  );
}

export function StudentAssignmentDetailPage() {
  const { id } = useParams();
  const q = useGet<Assignment>(`/assignments/${id}`);
  const [editing, setEditing] = useState(false);
  return (
    <QueryState q={q}>
      {(a) => {
        const st = assignmentState(a);
        const sub = a.submission;
        const canSubmit = a.status === 'published' && st !== 'graded';
        return (
          <Box sx={{ maxWidth: 960 }}>
            <BackButton to={`${S}/assignments`}>Assignments</BackButton>
            <PageHeader
              title={a.title}
              subtitle={`${KIND_LABEL[a.kind]}${refName(a.courseId) ? ` · ${refName(a.courseId)}` : ''}${refName(a.createdBy) ? ` · from ${refName(a.createdBy)}` : ''} · ${a.maxPoints} points`}
              actions={<StatusChip status={STATE_CHIP[st].status} label={STATE_CHIP[st].label} />}
            />
            {st === 'graded' && sub && (
              <Paper sx={{ p: 3, mb: 3, borderRadius: 3, color: '#fff', background: 'linear-gradient(120deg, #2E9D61, #6CC99A)' }}>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <EmojiEventsOutlined sx={{ fontSize: 48 }} />
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {sub.points}/{a.maxPoints}
                    </Typography>
                    <Typography>{a.maxPoints && (sub.points ?? 0) / a.maxPoints >= 0.75 ? 'Excellent work!' : 'Your teacher has graded this.'}</Typography>
                  </Box>
                </Stack>
              </Paper>
            )}
            {sub?.feedback && (sub.status === 'graded' || sub.status === 'returned') && (
              <Alert severity={sub.status === 'returned' ? 'warning' : 'success'} sx={{ mb: 3 }} icon={false}>
                <Typography sx={{ fontWeight: 650 }}>{sub.status === 'returned' ? 'Your teacher asked for changes' : 'Feedback from your teacher'}</Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>{sub.feedback}</Typography>
              </Alert>
            )}
            {sub?.status === 'returned' && !sub.feedback && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                Your teacher returned this for changes. Update your work and hand it in again.
              </Alert>
            )}
            <Section title="Instructions">
              <Stack spacing={2}>
                <DueDate date={a.dueDate} />
                {a.instructions ? <RichText html={a.instructions} /> : <Typography color="text.secondary">No extra instructions.</Typography>}
                {a.attachmentUrl && (
                  <Box>
                    <Button variant="outlined" startIcon={<AttachFileOutlined />} href={a.attachmentUrl} target="_blank" rel="noopener">
                      Open attachment ({fileName(a.attachmentUrl)})
                    </Button>
                  </Box>
                )}
              </Stack>
            </Section>
            <Section
              title={sub && !editing ? 'Your work' : 'Hand in your work'}
              action={
                sub && !editing && canSubmit ? (
                  <Button startIcon={<EditOutlined />} onClick={() => setEditing(true)}>
                    Edit and resubmit
                  </Button>
                ) : undefined
              }
            >
              {sub && !editing ? (
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Handed in {fmtDateTime(sub.submittedAt)}
                    </Typography>
                    {isLate(sub, a.dueDate) && <StatusChip status="late" label="Late" />}
                  </Stack>
                  {sub.text && (
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#FAFBFE' }}>
                      <Typography sx={{ whiteSpace: 'pre-wrap' }}>{sub.text}</Typography>
                    </Paper>
                  )}
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {sub.fileUrl && <Chip icon={<AttachFileOutlined />} label={fileName(sub.fileUrl)} component="a" href={sub.fileUrl} target="_blank" rel="noopener" clickable />}
                    {sub.linkUrl && <Chip icon={<LinkOutlined />} label={sub.linkUrl.replace(/^https?:\/\//, '').slice(0, 60)} component="a" href={sub.linkUrl} target="_blank" rel="noopener" clickable />}
                  </Stack>
                  {st === 'graded' && (
                    <Typography variant="body2" color="text.secondary">
                      This work has been graded, so it can no longer be changed. Ask your teacher if you need to update it.
                    </Typography>
                  )}
                  {st === 'submitted' && canSubmit && (
                    <Typography variant="body2" color="text.secondary">
                      You can still change your work until your teacher grades it.
                    </Typography>
                  )}
                </Stack>
              ) : canSubmit ? (
                <SubmitForm a={a} onDone={sub ? () => setEditing(false) : undefined} />
              ) : (
                <Alert severity="info">{a.status === 'closed' ? 'This assignment is closed and no longer accepts work.' : 'This assignment is not open for submissions.'}</Alert>
              )}
              {st === 'overdue' && canSubmit && !sub && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  The due date has passed, but you can still hand it in. It will be marked late.
                </Alert>
              )}
            </Section>
          </Box>
        );
      }}
    </QueryState>
  );
}
