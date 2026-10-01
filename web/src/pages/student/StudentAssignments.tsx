import { Alert, Box, Button, Chip, LinearProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import ConstructionOutlined from '@mui/icons-material/ConstructionOutlined';
import ExtensionOutlined from '@mui/icons-material/ExtensionOutlined';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import dayjs from 'dayjs';
import { useLook } from '@/student/useLook';
import { NextSteps, TaskSteps } from '@/student/TaskSteps';
import { shade, tint, type Look } from '@/student/looks';
import { PageTitle } from '@/student/playful';
import AttachFileOutlined from '@mui/icons-material/AttachFileOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import SendOutlined from '@mui/icons-material/SendOutlined';
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined';
import Close from '@mui/icons-material/Close';
import EditOutlined from '@mui/icons-material/EditOutlined';
import { useState, type ReactNode } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { errorMessage } from '@/api/client';
import { refName, type Assignment } from '@/api/types';
import { useGet, useSend } from '@/lib/hooks';
import { DueDate, PageHeader, QueryState, RichText, Section, StatusChip, UploadButton, fmtDateTime } from '@/components/ui';
import { BackButton, KIND_LABEL, useTab } from '@/pages/teacher/common';
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

const KIND_EMOJI: Record<string, string> = { homework: '📝', project: '🛠️', activity: '🧩' };
const KIND_ICON: Record<string, ReactNode> = { homework: <MenuBookOutlined />, project: <ConstructionOutlined />, activity: <ExtensionOutlined /> };

/** "Due in 3 days", "Due today", "2 days late" */
function dueText(a: Assignment) {
  if (!a.dueDate) return { text: 'No due date', tone: 'calm' as const };
  const d = dayjs(a.dueDate);
  const days = d.startOf('day').diff(dayjs().startOf('day'), 'day');
  if (d.isBefore(dayjs())) return { text: days === 0 ? 'Was due today' : `${-days} day${days === -1 ? '' : 's'} late`, tone: 'late' as const };
  if (days === 0) return { text: `Due today, ${d.format('h:mm A')}`, tone: 'soon' as const };
  if (days === 1) return { text: `Due tomorrow, ${d.format('h:mm A')}`, tone: 'soon' as const };
  if (days <= 7) return { text: `Due in ${days} days · ${d.format('ddd D MMM')}`, tone: 'week' as const };
  return { text: `Due ${d.format('D MMM')}`, tone: 'calm' as const };
}

function AssignmentCard({ a, look }: { a: Assignment; look: Look }) {
  const st = assignmentState(a);
  const due = dueText(a);
  const toneColor = { late: '#D9480F', soon: '#E67700', week: look.primary, calm: look.ink2 }[due.tone];
  const kindColor = { homework: look.tiles[0] ?? look.primary, project: look.tiles[1] ?? look.accent, activity: look.tiles[2] ?? look.primary }[a.kind] ?? look.primary;
  const cta = st === 'graded' ? 'See feedback' : st === 'submitted' ? 'View' : st === 'returned' ? 'Fix and resend' : st === 'closed' ? 'View' : 'Start';
  const pct = st === 'graded' && a.maxPoints ? Math.round(((a.submission?.points ?? 0) / a.maxPoints) * 100) : null;
  return (
    <Box
      component={RouterLink}
      to={`${S}/assignments/${a._id}`}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        p: 2.25,
        borderRadius: `${look.radius}px`,
        bgcolor: look.surface,
        border: `2px solid ${st === 'overdue' || st === 'returned' ? tint('#D9480F', 0.4) : tint(kindColor, 0.28)}`,
        boxShadow: `0 5px 0 ${st === 'overdue' || st === 'returned' ? tint('#D9480F', 0.22) : tint(kindColor, 0.2)}`,
        textDecoration: 'none',
        color: 'inherit',
        transition: 'transform .15s, box-shadow .15s',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 8px 0 ${tint(kindColor, 0.26)}` },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ width: 52, height: 52, borderRadius: '16px', bgcolor: tint(kindColor, 0.16), border: `2px solid ${tint(kindColor, 0.3)}`, color: kindColor, display: 'grid', placeItems: 'center', flexShrink: 0, transform: 'rotate(-5deg)', fontSize: 26 }}>{KIND_EMOJI[a.kind] ?? KIND_ICON[a.kind]}</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: kindColor }}>{KIND_LABEL[a.kind]}</Typography>
          <Typography sx={{ fontWeight: 900, fontSize: 17.5, color: look.ink, lineHeight: 1.3 }}>{a.title}</Typography>
          <Typography variant="body2" sx={{ color: look.ink2 }} noWrap>
            {[refName(a.courseId), refName(a.createdBy)].filter(Boolean).join(' · ')}
          </Typography>
        </Box>
        <StatusChip status={STATE_CHIP[st].status} label={STATE_CHIP[st].label} />
      </Stack>
      <Box sx={{ borderTop: `1px dashed ${look.line}`, pt: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        {st === 'graded' ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flex: 1, minWidth: 160 }}>
            <EmojiEventsOutlined sx={{ color: '#2F9E44', fontSize: 20 }} />
            <Typography sx={{ fontWeight: 750, color: look.ink }}>
              {a.submission?.points ?? 0}/{a.maxPoints}
            </Typography>
            <LinearProgress variant="determinate" value={pct ?? 0} sx={{ flex: 1, height: 6, borderRadius: 999, bgcolor: look.line, '& .MuiLinearProgress-bar': { bgcolor: '#2F9E44' } }} />
          </Stack>
        ) : st === 'submitted' ? (
          <Typography variant="body2" sx={{ color: look.ink2, flex: 1 }}>
            Sent {fmtDateTime(a.submission?.submittedAt)} · waiting for your teacher
          </Typography>
        ) : a.steps?.length ? (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: look.primary, whiteSpace: 'nowrap' }}>
              🪜 {a.steps.filter((x) => x.done).length}/{a.steps.length} steps
            </Typography>
            <Typography variant="body2" sx={{ color: toneColor }} noWrap>
              · {due.text}
            </Typography>
          </Stack>
        ) : (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flex: 1, color: toneColor, '& svg': { fontSize: 18 } }}>
            <ScheduleRounded />
            <Typography variant="body2" sx={{ fontWeight: 650, color: 'inherit' }}>
              {due.text}
            </Typography>
            <Typography variant="body2" sx={{ color: look.ink2 }}>
              · {a.maxPoints} points
            </Typography>
          </Stack>
        )}
        <Box sx={{ px: 1.75, py: 0.75, borderRadius: 999, fontSize: 14, fontWeight: 900, bgcolor: st === 'todo' || st === 'overdue' || st === 'returned' ? kindColor : tint(kindColor, 0.12), color: st === 'todo' || st === 'overdue' || st === 'returned' ? '#fff' : kindColor, boxShadow: st === 'todo' || st === 'overdue' || st === 'returned' ? `0 3px 0 ${shade(kindColor)}` : 'none' }}>
          {cta} →
        </Box>
      </Box>
    </Box>
  );
}

function Stat({ look, label, value, color, icon }: { look: Look; label: string; value: ReactNode; color: string; icon: ReactNode }) {
  return (
    <Box sx={{ p: 2, borderRadius: `${look.radius}px`, bgcolor: look.surface, border: `1px solid ${look.line}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: tint(color, 0.14), color, display: 'grid', placeItems: 'center', '& svg': { fontSize: 22 } }}>{icon}</Box>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: 22, lineHeight: 1.1, color: look.ink }}>{value}</Typography>
        <Typography variant="body2" sx={{ color: look.ink2 }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

function Group({ look, title, items, hint }: { look: Look; title: string; items: Assignment[]; hint?: string }) {
  if (!items.length) return null;
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', mb: 1.25 }}>
        <Typography component="h2" sx={{ fontWeight: 750, fontSize: 16, color: look.ink }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: look.ink2 }}>
          {items.length}
          {hint ? ` · ${hint}` : ''}
        </Typography>
      </Stack>
      <Box sx={{ display: 'grid', gap: 1.75, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {items.map((a) => (
          <AssignmentCard key={a._id} a={a} look={look} />
        ))}
      </Box>
    </Box>
  );
}

export function StudentAssignmentsPage() {
  const look = useLook();
  const q = useGet<Assignment[]>('/assignments');
  const [tab, setTab] = useTab(TABS, 'todo');
  return (
    <Box sx={{ maxWidth: 1180, mx: 'auto' }}>
      <PageTitle look={look} emoji="🎒" title={look.words.assignments} subtitle="Homework, projects and activities from your teachers" />
      <QueryState q={q}>
        {(items) => {
          const byState = (s: AssignmentState[]) => items.filter((a) => s.includes(assignmentState(a)));
          const todo = byState(['todo', 'overdue', 'returned']);
          const soon = todo.filter((a) => a.dueDate && dayjs(a.dueDate).diff(dayjs(), 'day') < 7);
          const graded = byState(['graded']);
          const avg = graded.length ? Math.round((graded.reduce((n, a) => n + (a.submission?.points ?? 0) / (a.maxPoints || 1), 0) / graded.length) * 100) : null;
          const byDue = (a: Assignment, b: Assignment) => (a.dueDate ? dayjs(a.dueDate).valueOf() : Infinity) - (b.dueDate ? dayjs(b.dueDate).valueOf() : Infinity);
          const attention = byState(['returned', 'overdue']).sort(byDue);
          const week = byState(['todo']).filter((a) => a.dueDate && dayjs(a.dueDate).diff(dayjs(), 'day') < 7).sort(byDue);
          const later = byState(['todo']).filter((a) => !week.includes(a)).sort(byDue);
          const closed = byState(['closed']);
          const submitted = byState(['submitted']).sort((a, b) => dayjs(b.submission?.submittedAt).valueOf() - dayjs(a.submission?.submittedAt).valueOf());
          const gradedSorted = [...graded].sort((a, b) => dayjs(b.submission?.gradedAt ?? b.submission?.submittedAt).valueOf() - dayjs(a.submission?.gradedAt ?? a.submission?.submittedAt).valueOf());
          const TAB_LIST = [
            { value: 'todo' as const, label: 'To do', n: todo.length },
            { value: 'submitted' as const, label: 'Submitted', n: submitted.length },
            { value: 'graded' as const, label: 'Graded', n: graded.length },
          ];
          return (
            <Stack spacing={3}>
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
                <Stat look={look} label="To do" value={todo.length} color={look.primary} icon={<AssignmentOutlined />} />
                <Stat look={look} label="Due this week" value={soon.length} color="#E67700" icon={<ScheduleRounded />} />
                <Stat look={look} label="Waiting for grade" value={submitted.length} color="#1C7ED6" icon={<SendOutlined />} />
                <Stat look={look} label="Average score" value={avg == null ? '—' : `${avg}%`} color="#2F9E44" icon={<EmojiEventsOutlined />} />
              </Box>

              <NextSteps items={items} look={look} />

              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {TAB_LIST.map((t) => {
                  const on = t.value === tab;
                  return (
                    <Box
                      key={t.value}
                      component="button"
                      onClick={() => setTab(t.value)}
                      aria-pressed={on}
                      sx={{ cursor: 'pointer', font: 'inherit', fontWeight: 700, fontSize: 14.5, px: 2, py: 0.9, borderRadius: 999, border: `1px solid ${on ? look.primary : look.line}`, bgcolor: on ? look.primary : look.surface, color: on ? '#fff' : look.ink, display: 'flex', gap: 1, alignItems: 'center' }}
                    >
                      {t.label}
                      <Box component="span" sx={{ minWidth: 22, px: 0.75, borderRadius: 999, fontSize: 12.5, bgcolor: on ? 'rgba(255,255,255,0.25)' : tint(look.primary, 0.1), color: on ? '#fff' : look.primary }}>
                        {t.n}
                      </Box>
                    </Box>
                  );
                })}
              </Stack>

              {tab === 'todo' &&
                (todo.length === 0 && !closed.length ? (
                  <EmptyState look={look} emoji="🎉" title="All caught up!" text="You have no assignments to do right now. New work from your teachers will show up here." />
                ) : (
                  <Stack spacing={3}>
                    <Group look={look} title="Needs attention" hint="late or sent back for changes" items={attention} />
                    <Group look={look} title="Due this week" items={week} />
                    <Group look={look} title="Coming up" items={later} />
                    <Group look={look} title="Closed" hint="the due date has passed" items={closed} />
                  </Stack>
                ))}
              {tab === 'submitted' && (submitted.length ? <Group look={look} title="Waiting for your teacher" items={submitted} /> : <EmptyState look={look} emoji="📬" title="Nothing waiting for a grade" text="Work you hand in shows here until your teacher grades it." />)}
              {tab === 'graded' && (gradedSorted.length ? <Group look={look} title="Graded" items={gradedSorted} /> : <EmptyState look={look} emoji="🏅" title="No graded work yet" text="Grades and feedback from your teachers show here." />)}
            </Stack>
          );
        }}
      </QueryState>
    </Box>
  );
}

function EmptyState({ look, emoji, title, text }: { look: Look; emoji: string; title: string; text: string }) {
  return (
    <Box sx={{ textAlign: 'center', py: 6, px: 2, borderRadius: `${look.radius}px`, border: `1px dashed ${look.line}`, bgcolor: look.surface }}>
      <Box sx={{ fontSize: 44, mb: 1 }}>{emoji}</Box>
      <Typography sx={{ fontWeight: 750, fontSize: 18, color: look.ink }}>{title}</Typography>
      <Typography sx={{ color: look.ink2, maxWidth: 420, mx: 'auto' }}>{text}</Typography>
    </Box>
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
  const look = useLook();
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
            {canSubmit && (st === 'todo' || st === 'overdue' || st === 'returned') && (
              <Section title="My small steps">
                <TaskSteps a={a} look={look} />
              </Section>
            )}
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
