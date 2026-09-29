import { Alert, Box, Button, Chip, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import DoneAll from '@mui/icons-material/DoneAll';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { refId, type AttendanceStatus, type ClassSection, type User } from '@/api/types';
import { useMe } from '@/auth/AuthContext';
import { useGet, useSend } from '@/lib/hooks';
import { Empty, Loading, ErrorState, PageHeader, Section, UserCell, fmtDate } from '@/components/ui';
import { ClassSelect, localToday, useMyClasses } from './common';

interface Sheet {
  date: string;
  class: ClassSection;
  sheet: { records: { studentId: string; status: AttendanceStatus }[]; updatedAt?: string } | null;
  students: User[];
}

const STATUSES: { value: AttendanceStatus; label: string; color: 'success' | 'error' | 'warning' | 'info' }[] = [
  { value: 'present', label: 'Present', color: 'success' },
  { value: 'absent', label: 'Absent', color: 'error' },
  { value: 'late', label: 'Late', color: 'warning' },
  { value: 'excused', label: 'Excused', color: 'info' },
];

/** Take or edit the attendance sheet of one class for one date, with recent history. */
export function AttendanceTaker({ classId, date, onDateChange }: { classId: string; date: string; onDateChange: (d: string) => void }) {
  const q = useGet<Sheet>('/attendance', { classId, date });
  const history = useGet<{ date: string; present: number; total: number }[]>('/attendance', { classId });
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!q.data) return;
    const m: Record<string, AttendanceStatus> = {};
    for (const r of q.data.sheet?.records ?? []) m[String(r.studentId)] = r.status;
    setMarks(m);
    setDirty(false);
  }, [q.data]);

  const save = useSend<{ classId: string; date: string; records: { studentId: string; status: AttendanceStatus }[] }>('put', '/attendance', {
    success: 'Attendance saved',
    invalidate: ['/attendance', '/dashboard', '/reports'],
    onSuccess: () => setDirty(false),
  });

  const students = useMemo(() => q.data?.students ?? [], [q.data]);
  const unmarked = students.filter((s) => !marks[s._id]).length;
  const counts = useMemo(() => {
    const c: Record<string, number> = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const s of students) if (marks[s._id]) c[marks[s._id]]++;
    return c;
  }, [marks, students]);

  const set = (id: string, v: AttendanceStatus | null) => {
    if (!v) return;
    setMarks((m) => ({ ...m, [id]: v }));
    setDirty(true);
  };
  const allPresent = () => {
    setMarks(Object.fromEntries(students.map((s) => [s._id, 'present' as AttendanceStatus])));
    setDirty(true);
  };
  const isFuture = date > localToday();

  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1fr 300px' }, alignItems: 'start' }}>
      <Section
        title={`Attendance · ${dayjs(date).format('ddd, D MMM YYYY')}`}
        action={
          <TextField
            type="date"
            label="Date"
            value={date}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: localToday() } }}
            sx={{ width: 170 }}
          />
        }
      >
        {q.isLoading ? (
          <Loading />
        ) : q.error ? (
          <ErrorState error={q.error} />
        ) : students.length === 0 ? (
          <Empty title="No students in this class yet" />
        ) : (
          <>
            {isFuture && <Alert severity="warning" sx={{ mb: 2 }}>You cannot take attendance for a future date.</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {q.data?.sheet ? <Chip size="small" color="primary" variant="outlined" label="Saved sheet" /> : <Chip size="small" variant="outlined" label="Not taken yet" />}
                {STATUSES.map((s) => (
                  <Chip key={s.value} size="small" color={counts[s.value] ? s.color : 'default'} label={`${s.label}: ${counts[s.value]}`} />
                ))}
                {unmarked > 0 && <Chip size="small" label={`Not marked: ${unmarked}`} />}
              </Stack>
              <Button startIcon={<DoneAll />} onClick={allPresent} disabled={isFuture} sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                Mark all present
              </Button>
            </Stack>
            <Stack divider={<Box sx={{ borderTop: '1px solid #E4E6F0' }} />}>
              {students.map((s) => (
                <Stack key={s._id} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ py: 1, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
                  <UserCell name={s.name} sub={s.rollNo ? `Roll no. ${s.rollNo}` : undefined} avatarUrl={s.avatarUrl} />
                  <ToggleButtonGroup size="small" exclusive value={marks[s._id] ?? null} onChange={(_, v) => set(s._id, v)} disabled={isFuture} aria-label={`Attendance for ${s.name}`}>
                    {STATUSES.map((st) => (
                      <ToggleButton
                        key={st.value}
                        value={st.value}
                        sx={{ px: 1.5, '&.Mui-selected': { bgcolor: `${st.color}.main`, color: '#fff', '&:hover': { bgcolor: `${st.color}.main` } } }}
                      >
                        {st.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Stack>
              ))}
            </Stack>
            <Stack direction="row" spacing={2} sx={{ mt: 2, alignItems: 'center', justifyContent: 'flex-end' }}>
              {unmarked > 0 && (
                <Typography variant="body2" color="text.secondary">
                  Mark every student to save
                </Typography>
              )}
              {dirty && !unmarked && (
                <Typography variant="body2" color="warning.main">
                  Unsaved changes
                </Typography>
              )}
              <Button
                variant="contained"
                disabled={unmarked > 0 || save.isPending || isFuture}
                onClick={() => save.mutate({ classId, date, records: students.map((s) => ({ studentId: s._id, status: marks[s._id] })) })}
              >
                {save.isPending ? 'Saving…' : q.data?.sheet ? 'Update attendance' : 'Save attendance'}
              </Button>
            </Stack>
          </>
        )}
      </Section>
      <Section title="Recent days">
        {history.isLoading ? (
          <Loading />
        ) : history.error ? (
          <ErrorState error={history.error} />
        ) : !history.data?.length ? (
          <Empty title="No attendance taken yet" />
        ) : (
          <Stack spacing={0.5}>
            {history.data.slice(0, 20).map((h) => (
              <Paper
                key={h.date}
                variant="outlined"
                component="button"
                onClick={() => onDateChange(h.date)}
                sx={{
                  p: 1,
                  px: 1.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  font: 'inherit',
                  textAlign: 'left',
                  bgcolor: h.date === date ? 'rgba(63,61,191,0.08)' : 'background.paper',
                  borderColor: h.date === date ? 'primary.main' : undefined,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {fmtDate(h.date, 'ddd, D MMM')}
                </Typography>
                <Chip size="small" label={`${h.present}/${h.total} present`} color={h.total && h.present / h.total >= 0.9 ? 'success' : h.total && h.present / h.total >= 0.75 ? 'default' : 'warning'} />
              </Paper>
            ))}
          </Stack>
        )}
      </Section>
    </Box>
  );
}

/** Attendance shortcut: pick a class and date. */
export function TeacherAttendancePage() {
  const [params, setParams] = useSearchParams();
  const me = useMe();
  const classes = useMyClasses();
  const classId = params.get('classId') ?? '';
  const date = params.get('date') ?? localToday();
  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) next.set(k, v);
    setParams(next, { replace: true });
  };
  // Default to the first class (the teacher's homeroom if they have one)
  useEffect(() => {
    if (!classId && classes.data?.length) update({ classId: (classes.data.find((c) => refId(c.classTeacherId) === me._id) ?? classes.data[0])._id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, classes.data]);

  return (
    <>
      <PageHeader title="Attendance" subtitle="Mark who is in class today, or correct an earlier day" actions={<ClassSelect value={classId} onChange={(id) => update({ classId: id })} sx={{ minWidth: 200 }} />} />
      {classes.isLoading ? (
        <Loading />
      ) : classes.error ? (
        <ErrorState error={classes.error} />
      ) : !classes.data?.length ? (
        <Empty title="You have no classes yet" hint="Your school admin assigns classes to you." />
      ) : classId ? (
        <AttendanceTaker classId={classId} date={date} onDateChange={(d) => update({ date: d })} />
      ) : null}
    </>
  );
}
