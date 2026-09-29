/** Class card in the Clarity style, used on the school dashboard board and the Classes page. */
import { Avatar, Box, Divider, Stack, Typography } from '@mui/material';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClarityCard, Tag } from '@/components/clarity';
import { CLARITY } from '@/theme-clarity';

export interface ClassCardData {
  _id: string;
  name: string;
  grade: number;
  section: string;
  academicYear?: string;
  teacherName?: string;
  teacherAvatar?: string;
  studentCount: number;
  courseCount?: number;
  attendanceMarked?: boolean;
}

export function SchoolClassCard({ c, menu }: { c: ClassCardData; menu?: ReactNode }) {
  const navigate = useNavigate();
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  return (
    <Box sx={{ position: 'relative', height: '100%', '& > div': { height: '100%', display: 'flex', flexDirection: 'column' } }}>
      <ClarityCard onClick={() => navigate(`/school/classes/${c._id}`)}>
        <Stack direction="row" spacing={0.75} sx={{ mb: 1.5, pr: menu ? 4 : 0, flexWrap: 'wrap', gap: 0.75 }}>
          <Tag label={`Grade ${c.grade}`} tone={`g${c.grade}`} />
          <Tag label={`Section ${c.section}`} tone="info" />
        </Stack>
        <Typography sx={{ fontWeight: 600, fontSize: 16.5, lineHeight: 1.3 }}>{c.name}</Typography>
        {c.academicYear && <Typography sx={{ fontSize: 13, color: CLARITY.ink3, mt: 0.25 }}>Academic year {c.academicYear}</Typography>}

        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mt: 2 }}>
          {c.teacherName ? (
            <Avatar src={c.teacherAvatar || undefined} sx={{ width: 30, height: 30, fontSize: 13, bgcolor: CLARITY.lilac, color: CLARITY.ink }}>
              {c.teacherName[0]}
            </Avatar>
          ) : (
            <Box sx={{ width: 30, height: 30, borderRadius: '50%', border: `1.5px dashed ${CLARITY.ink3}`, flexShrink: 0 }} />
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 14, fontWeight: 500, color: c.teacherName ? CLARITY.ink : '#9A3A16' }}>
              {c.teacherName ?? 'No class teacher yet'}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: CLARITY.ink3 }}>{c.teacherName ? 'Class teacher' : 'Assign one from ⋮ › Edit'}</Typography>
          </Box>
        </Stack>

        <Box sx={{ flex: 1, minHeight: 16 }} />
        <Divider sx={{ my: 1.5 }} />
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          {c.attendanceMarked === undefined ? <span /> : <Tag label={c.attendanceMarked ? 'Attendance marked' : 'Attendance pending'} tone={c.attendanceMarked ? 'ok' : 'warn'} />}
          <Stack direction="row" spacing={1.5} sx={{ color: CLARITY.ink2, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', '& svg': { fontSize: 16, verticalAlign: '-3px', mr: 0.5 } }}>
            <span title={plural(c.studentCount, 'student')}>
              <SchoolOutlined />
              {c.studentCount}
            </span>
            {c.courseCount !== undefined && (
              <span title={plural(c.courseCount, 'course')}>
                <MenuBookOutlined />
                {c.courseCount}
              </span>
            )}
          </Stack>
        </Stack>
      </ClarityCard>
      {menu && (
        <Box sx={{ position: 'absolute', top: 8, right: 8 }} onClick={(e) => e.stopPropagation()}>
          {menu}
        </Box>
      )}
    </Box>
  );
}
