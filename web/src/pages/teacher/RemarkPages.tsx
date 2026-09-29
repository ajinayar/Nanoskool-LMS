import { Box, Button, Chip, FormControlLabel, IconButton, MenuItem, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { refId, refName, type ClassSection, type Remark } from '@/api/types';
import { useMe } from '@/auth/AuthContext';
import { useGet, useSend } from '@/lib/hooks';
import { ConfirmDialog, Empty, FormDialog, PageHeader, QueryState, Section, fmtDate } from '@/components/ui';
import { ClassSelect, FilterBar, T, SHOW_EMPTY } from './common';

export const REMARK_CATEGORIES = [
  { value: 'appreciation', label: 'Appreciation', color: 'success' },
  { value: 'improvement', label: 'Needs improvement', color: 'warning' },
  { value: 'behaviour', label: 'Behaviour', color: 'info' },
  { value: 'general', label: 'General', color: 'default' },
] as const;

export function RemarkChip({ category }: { category: string }) {
  const c = REMARK_CATEGORIES.find((x) => x.value === category);
  return <Chip size="small" label={c?.label ?? category} color={c?.color ?? 'default'} />;
}

/** Add a remark. Pass a student to skip the class/student pickers. */
export function RemarkDialog({ onClose, student }: { onClose: () => void; student?: { _id: string; name: string } }) {
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState(student?._id ?? '');
  const [category, setCategory] = useState('appreciation');
  const [text, setText] = useState('');
  const [visibleToParent, setVisible] = useState(true);
  const [err, setErr] = useState('');
  const cls = useGet<ClassSection>(!student && classId ? `/classes/${classId}` : null);
  const send = useSend('post', '/remarks', { success: 'Remark added', invalidate: ['/remarks', '/reports', '/dashboard'], onSuccess: onClose });
  return (
    <FormDialog
      open
      title={student ? `Add a remark for ${student.name}` : 'Add a remark'}
      onClose={onClose}
      loading={send.isPending}
      submitLabel="Add remark"
      onSubmit={() => {
        if (!studentId) return setErr('Choose a student');
        if (!text.trim()) return setErr('Write the remark');
        setErr('');
        send.mutate({ studentId, category, text: text.trim(), visibleToParent });
      }}
    >
      {!student && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <ClassSelect
            value={classId}
            onChange={(id) => {
              setClassId(id);
              setStudentId('');
            }}
            required
          />
          <TextField select label="Student" value={studentId} onChange={(e) => setStudentId(e.target.value)} required disabled={!classId || cls.isLoading}>
            {(cls.data?.students ?? []).map((s) => (
              <MenuItem key={s._id} value={s._id}>
                {s.name}
                {s.rollNo ? ` (${s.rollNo})` : ''}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      )}
      <TextField select label="Type" value={category} onChange={(e) => setCategory(e.target.value)}>
        {REMARK_CATEGORIES.map((c) => (
          <MenuItem key={c.value} value={c.value}>
            {c.label}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Remark"
        value={text}
        onChange={(e) => setText(e.target.value)}
        multiline
        minRows={3}
        required
        slotProps={{ htmlInput: { maxLength: 2000 } }}
        helperText={`${text.length}/2000`}
        error={!!err}
      />
      <FormControlLabel control={<Switch checked={visibleToParent} onChange={(e) => setVisible(e.target.checked)} />} label={visibleToParent ? 'Parents and the student can see this' : 'Private: only teachers and admins see this'} />
      {err && (
        <Typography color="error" variant="body2">
          {err}
        </Typography>
      )}
    </FormDialog>
  );
}

/** List of remarks with delete for the ones I wrote. */
export function RemarkList({ items, showStudent }: { items: Remark[]; showStudent?: boolean }) {
  const me = useMe();
  const [del, setDel] = useState<Remark | null>(null);
  const remove = useSend('delete', (r: Remark) => `/remarks/${r._id}`, { success: 'Remark deleted', invalidate: ['/remarks', '/reports', '/dashboard'], onSuccess: () => setDel(null) });
  if (!items.length) return <Empty title="No remarks yet" hint="Remarks help parents follow how their child is doing." />;
  return (
    <>
      <Stack divider={<Box sx={{ borderTop: '1px solid #E4E6F0' }} />}>
        {items.map((r) => (
          <Stack key={r._id} direction="row" spacing={1} sx={{ py: 1.5, alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                {showStudent && (
                  <Typography component={RouterLink} to={`${T}/students/${refId(r.studentId)}`} sx={{ fontWeight: 650, color: 'primary.main', textDecoration: 'none' }}>
                    {refName(r.studentId) || 'Student'}
                  </Typography>
                )}
                <RemarkChip category={r.category} />
                {!r.visibleToParent && (
                  <Tooltip title="Hidden from parents and the student">
                    <Chip size="small" variant="outlined" icon={<VisibilityOffOutlined />} label="Private" />
                  </Tooltip>
                )}
                <Typography variant="caption" color="text.secondary">
                  {refName(r.teacherId) ? `${refName(r.teacherId)} · ` : ''}
                  {fmtDate(r.createdAt)}
                </Typography>
              </Stack>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{r.text}</Typography>
            </Box>
            {refId(r.teacherId) === me._id && (
              <Tooltip title="Delete remark">
                <IconButton size="small" onClick={() => setDel(r)} aria-label="Delete remark">
                  <DeleteOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        ))}
      </Stack>
      <ConfirmDialog
        open={!!del}
        title="Delete this remark?"
        message="It will be removed from the student's report card. This cannot be undone."
        danger
        confirmLabel="Delete"
        loading={remove.isPending}
        onClose={() => setDel(null)}
        onConfirm={() => del && remove.mutate(del)}
      />
    </>
  );
}

export function TeacherRemarksPage() {
  const q = useGet<Remark[]>('/remarks');
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('');
  return (
    <>
      <PageHeader
        title="Remarks"
        subtitle="Notes you have written about your students"
        actions={
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
            Add remark
          </Button>
        }
      />
      <Section title="My remarks">
        <FilterBar>
          <TextField select label="Type" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ width: 190 }} slotProps={SHOW_EMPTY}>
            <MenuItem value="">All types</MenuItem>
            {REMARK_CATEGORIES.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>
        </FilterBar>
        <QueryState q={q}>{(items) => <RemarkList items={items.filter((r) => !category || r.category === category)} showStudent />}</QueryState>
      </Section>
      {open && <RemarkDialog onClose={() => setOpen(false)} />}
    </>
  );
}
