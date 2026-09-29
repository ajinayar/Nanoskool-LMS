import { Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { refName, type StudentReport } from '@/api/types';
import { CardGrid, DataTable, Empty, Progress, QueryState, Section, StatCard, fmtDate, pct } from './ui';
import { useGet } from '@/lib/hooks';

const REMARK_COLOR: Record<string, 'success' | 'warning' | 'info' | 'default'> = { appreciation: 'success', improvement: 'warning', behaviour: 'info', general: 'default' };

/**
 * Full report card for one student: course progress, quiz and assignment results,
 * attendance and teacher remarks. `courseLink` builds the link for a course row.
 */
export function ReportCardView({ report, courseLink, compact }: { report: StudentReport; courseLink?: (courseId: string) => string; compact?: boolean }) {
  const r = report;
  return (
    <>
      {!compact && (
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 3 }}>
          <Avatar src={r.student.avatarUrl} sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 22 }}>
            {r.student.name[0]}
          </Avatar>
          <Box>
            <Typography variant="h5">{r.student.name}</Typography>
            <Typography color="text.secondary">
              {r.student.class?.name ?? 'No class'}
              {r.student.rollNo ? ` · Roll no. ${r.student.rollNo}` : ''}
            </Typography>
          </Box>
        </Stack>
      )}
      <CardGrid min={200}>
        <StatCard label="Course progress" value={pct(r.overallProgress)} icon={<SchoolOutlined />} />
        <StatCard label="Quiz average" value={pct(r.quizzes.averagePercent)} icon={<QuizOutlined />} hint={`${r.quizzes.count} quizzes taken`} />
        <StatCard label="Assignments" value={`${r.assignments.submitted}/${r.assignments.total}`} icon={<AssignmentOutlined />} hint={r.assignments.averagePercent != null ? `Average grade ${r.assignments.averagePercent}%` : 'submitted'} />
        <StatCard label="Attendance" value={pct(r.attendance.percent)} icon={<EventAvailableOutlined />} hint={`${r.attendance.present} of ${r.attendance.days} days`} />
      </CardGrid>
      <Box sx={{ mt: 3 }} />
      <Section title="Courses">
        <DataTable
          rows={r.courses.map((c) => ({ ...c, _id: c.course._id }))}
          empty={<Empty title="No courses assigned yet" />}
          columns={[
            {
              key: 'course',
              label: 'Course',
              render: (c) =>
                courseLink ? (
                  <Typography component={RouterLink} to={courseLink(c.course._id)} sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}>
                    {c.course.title}
                  </Typography>
                ) : (
                  <Typography sx={{ fontWeight: 600 }}>{c.course.title}</Typography>
                ),
            },
            { key: 'teacher', label: 'Teacher', render: (c) => refName(c.teacher) || '—' },
            { key: 'units', label: 'Units', render: (c) => `${c.completedUnits}/${c.unitCount}` },
            { key: 'progress', label: 'Progress', width: 220, render: (c) => <Progress value={c.progress} /> },
          ]}
        />
      </Section>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        <Section title="Recent quiz results">
          <DataTable
            rows={r.quizzes.recent}
            empty={<Empty title="No quizzes taken yet" />}
            columns={[
              { key: 'quiz', label: 'Quiz', render: (a) => refName(a.quizId) },
              { key: 'score', label: 'Score', render: (a) => `${a.score}/${a.maxScore}` },
              { key: 'pct', label: '%', render: (a) => <Chip size="small" label={`${a.percent}%`} color={a.percent >= 75 ? 'success' : a.percent >= 40 ? 'default' : 'warning'} /> },
              { key: 'date', label: 'Date', render: (a) => fmtDate(a.submittedAt) },
            ]}
          />
        </Section>
        <Section title="Assignments to do">
          {r.assignments.overdue.length + r.assignments.pending.length === 0 ? (
            <Empty title="All caught up" />
          ) : (
            <Stack spacing={1}>
              {r.assignments.overdue.map((a) => (
                <Stack key={a._id} direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography>{a.title}</Typography>
                  <Chip size="small" color="error" label={`Overdue · ${fmtDate(a.dueDate)}`} />
                </Stack>
              ))}
              {r.assignments.pending.map((a) => (
                <Stack key={a._id} direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography>{a.title}</Typography>
                  <Chip size="small" variant="outlined" label={a.dueDate ? `Due ${fmtDate(a.dueDate)}` : 'No due date'} />
                </Stack>
              ))}
            </Stack>
          )}
        </Section>
      </Box>
      <Section title="Teacher remarks">
        {r.remarks.length === 0 ? (
          <Empty title="No remarks yet" />
        ) : (
          <Stack spacing={1.5}>
            {r.remarks.map((m) => (
              <Box key={m._id}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Chip size="small" label={m.category} color={REMARK_COLOR[m.category]} sx={{ textTransform: 'capitalize' }} />
                  <Typography variant="caption" color="text.secondary">
                    {refName(m.teacherId)} · {fmtDate(m.createdAt)}
                  </Typography>
                </Stack>
                <Typography sx={{ mt: 0.5 }}>{m.text}</Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Section>
    </>
  );
}

/** Loads and shows the report for a student id. */
export function ReportCard({ studentId, courseLink, compact }: { studentId: string; courseLink?: (courseId: string) => string; compact?: boolean }) {
  const q = useGet<StudentReport>(`/reports/students/${studentId}`);
  return <QueryState q={q}>{(r) => <ReportCardView report={r} courseLink={courseLink} compact={compact} />}</QueryState>;
}
