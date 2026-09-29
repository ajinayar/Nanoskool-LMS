import { Box, Chip, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import type { AttendanceStatus } from '@/api/types';
import { useMe } from '@/auth/AuthContext';
import { useGet } from '@/lib/hooks';
import { ReportCard } from '@/components/ReportCard';
import { Empty, PageHeader, QueryState, Section, StatusChip } from '@/components/ui';
import { S } from './common';

export interface AttendanceHistory {
  studentId: string;
  days: { date: string; status: AttendanceStatus }[];
  summary: { total: number; present: number; percent: number | null };
}

const DOT: Record<AttendanceStatus, string> = { present: '#2E9D61', late: '#E0A100', absent: '#D64545', excused: '#1C7FB5' };

/** Attendance summary, a colour strip of recent days and a day-by-day list. Shared with the parent portal. */
export function AttendanceHistoryView({ data, limit = 60 }: { data: AttendanceHistory; limit?: number }) {
  if (!data.days.length) return <Empty title="No attendance recorded yet" />;
  const counts = data.days.reduce<Record<string, number>>((m, d) => ({ ...m, [d.status]: (m[d.status] ?? 0) + 1 }), {});
  const days = data.days.slice(0, limit);
  return (
    <>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Chip size="small" color="primary" label={`Attendance ${data.summary.percent ?? '—'}%`} />
        <Chip size="small" variant="outlined" label={`${data.summary.present} of ${data.summary.total} days in class`} />
        {(['present', 'late', 'absent', 'excused'] as AttendanceStatus[]).map((s) => (counts[s] ? <StatusChip key={s} status={s} label={`${s} ${counts[s]}`} /> : null))}
      </Stack>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }} aria-label="Recent days, newest first">
        {days.slice(0, 30).map((d) => (
          <Box key={d.date} title={`${dayjs(d.date).format('ddd D MMM')}: ${d.status}`} sx={{ width: 18, height: 18, borderRadius: 1, bgcolor: DOT[d.status] }} />
        ))}
      </Box>
      <Stack divider={<Box sx={{ borderTop: '1px solid #E4E6F0' }} />}>
        {days.map((d) => (
          <Stack key={d.date} direction="row" sx={{ py: 0.75, justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2">{dayjs(d.date).format('dddd, D MMM YYYY')}</Typography>
            <StatusChip status={d.status} />
          </Stack>
        ))}
      </Stack>
    </>
  );
}

export function StudentProgressPage() {
  const me = useMe();
  const att = useGet<AttendanceHistory>('/attendance', { studentId: me._id });
  return (
    <>
      <PageHeader title="My progress" subtitle="Your courses, scores, attendance and what your teachers say" />
      <ReportCard studentId={me._id} courseLink={(id) => `${S}/courses/${id}`} />
      <Section title="Attendance history">
        <QueryState q={att}>{(d) => <AttendanceHistoryView data={d} />}</QueryState>
      </Section>
    </>
  );
}
