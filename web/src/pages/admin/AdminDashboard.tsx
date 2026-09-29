import { Avatar, Box, Button, Stack, Typography } from '@mui/material';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import ArrowForward from '@mui/icons-material/ArrowForward';
import ArticleOutlined from '@mui/icons-material/ArticleOutlined';
import HandshakeOutlined from '@mui/icons-material/HandshakeOutlined';
import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import CoPresentOutlined from '@mui/icons-material/CoPresentOutlined';
import FamilyRestroomOutlined from '@mui/icons-material/FamilyRestroomOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import Add from '@mui/icons-material/Add';
import CampaignOutlined from '@mui/icons-material/CampaignOutlined';
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { ROLE_LABEL, type Role } from '@/api/types';
import { useMe } from '@/auth/AuthContext';
import { useGet } from '@/lib/hooks';
import type { Course, Paged } from '@/api/types';
import { ClarityCard, ClarityStat, Tag, deltaText } from '@/components/clarity';
import { CLARITY } from '@/theme-clarity';
import { Empty, QueryState, fromNow, fmtDateTime } from '@/components/ui';
import { num } from '@/components/AdminCommon';
import { AnnouncementsWidget } from '@/pages/shared/CommonPages';

interface AdminDash {
  stats: { partners: number; schools: number; students: number; teachers: number; parents: number; courses: number; published: number };
  growth?: { schoolsThisMonth: number; schoolsLastMonth: number; studentsThisMonth: number; studentsLastMonth: number; quizAverage30d: number | null; quizAttempts30d: number };
  recentActivity: { _id: string; action: string; entity?: string; createdAt: string; actorId?: { _id: string; name: string; role: Role } | null }[];
}

const ACTION_LABEL: Record<string, string> = {
  'partner.create': 'created a partner',
  'partner.update': 'updated a partner',
  'school.create': 'created a school',
  'school.update': 'updated a school',
  'class.create': 'created a class',
  'class.delete': 'deleted a class',
  'user.create': 'added a user',
  'user.update': 'updated a user',
  'user.import': 'imported students',
  'user.suspended': 'suspended a user',
  'user.active': 'activated a user',
  'user.reset_password': 'reset a password',
  'course.create': 'created a course',
  'course.update': 'updated a course',
  'course.delete': 'deleted a course',
  'course.grant': 'granted a course',
  'course.revoke': 'revoked a course',
  'class.course.assign': 'assigned a course to a class',
  'quiz.create': 'created a quiz',
  'assignment.create': 'created an assignment',
  'password.change': 'changed their password',
};

export const actionLabel = (a: string) => ACTION_LABEL[a] ?? a.replace(/[._]/g, ' ');

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box sx={{ bgcolor: CLARITY.panel, border: `1px solid ${CLARITY.line}`, borderRadius: '22px', p: 2.5, mb: 3 }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" component="h2">{title}</Typography>
        {action && <Box sx={{ mr: -1.25 }}>{action}</Box>}
      </Stack>
      {children}
    </Box>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', bgcolor: CLARITY.panel, border: `1px solid ${CLARITY.line}`, borderRadius: 999, pl: 0.75, pr: 2, py: 0.75 }}>
      <Box sx={{ width: 34, height: 34, borderRadius: '50%', bgcolor: CLARITY.hover, display: 'grid', placeItems: 'center', '& svg': { fontSize: 18 } }}>{icon}</Box>
      <Typography sx={{ fontSize: 14, color: CLARITY.ink2 }}>{label}</Typography>
      <Typography sx={{ fontSize: 16, fontWeight: 600 }}>{value}</Typography>
    </Stack>
  );
}

const PIPELINE: { value: Course['status']; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

export default function AdminDashboard() {
  const me = useMe();
  const q = useGet<AdminDash>('/dashboard');
  const courses = useGet<Paged<Course>>('/courses', { limit: 200 });
  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1">Welcome back, {me.name.split(' ')[0]}</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Nanoskool across all partners and schools</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ApartmentOutlined />} component={RouterLink} to="/admin/schools?new=1">Add school</Button>
          <Button variant="contained" startIcon={<Add />} component={RouterLink} to="/admin/courses?new=1">New course</Button>
        </Stack>
      </Stack>
      <QueryState q={q}>
        {(d) => (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 2 }}>
              <ClarityStat color={CLARITY.lilac} icon={<ApartmentOutlined />} label="Schools" value={num(d.stats.schools)} delta={d.growth ? deltaText(d.growth.schoolsThisMonth, d.growth.schoolsLastMonth, 'new this month') : undefined} />
              <ClarityStat color={CLARITY.peach} icon={<SchoolOutlined />} label="Students" value={num(d.stats.students)} delta={d.growth ? deltaText(d.growth.studentsThisMonth, d.growth.studentsLastMonth, 'new this month') : undefined} />
              <ClarityStat
                color={CLARITY.sky}
                icon={<QuizOutlined />}
                label="Quiz average"
                value={d.growth?.quizAverage30d != null ? `${d.growth.quizAverage30d}%` : '—'}
                delta={d.growth ? `${num(d.growth.quizAttempts30d)} attempts in 30 days` : undefined}
              />
            </Box>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mb: 3 }}>
              <MiniStat icon={<HandshakeOutlined />} label="Partners" value={num(d.stats.partners)} />
              <MiniStat icon={<CoPresentOutlined />} label="Teachers" value={num(d.stats.teachers)} />
              <MiniStat icon={<FamilyRestroomOutlined />} label="Parents" value={num(d.stats.parents)} />
              <MiniStat icon={<MenuBookOutlined />} label="Courses live" value={`${d.stats.published} / ${d.stats.courses}`} />
            </Stack>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, columnGap: 3, alignItems: 'start' }}>
              <Panel title="Course pipeline" action={<Button endIcon={<ArrowForward />} component={RouterLink} to="/admin/courses">Open studio</Button>}>
                <QueryState q={courses}>
                  {(cd) => (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                      {PIPELINE.map((col) => {
                        const rows = cd.items.filter((c) => c.status === col.value);
                        return (
                          <Box key={col.value} sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                              {col.label} <Box component="span" sx={{ color: CLARITY.ink3 }}>({rows.length})</Box>
                            </Typography>
                            {rows.length === 0 && <Box sx={{ border: `1.5px dashed #D6CCBA`, borderRadius: '16px', p: 2, fontSize: 13, color: CLARITY.ink3, textAlign: 'center' }}>Nothing here</Box>}
                            {rows.slice(0, 3).map((c) => (
                              <Box key={c._id} component={RouterLink} to={`/admin/courses/${c._id}/edit`} sx={{ textDecoration: 'none', color: 'inherit' }}>
                                <ClarityCard onClick={() => {}}>
                                  <Tag label={c.category ?? 'Uncategorised'} />
                                  <Typography sx={{ fontWeight: 600, fontSize: 14.5, mt: 1 }}>{c.title}</Typography>
                                  <Typography sx={{ fontSize: 12.5, color: CLARITY.ink3, mt: 0.5, '& svg': { fontSize: 14, verticalAlign: '-2px', mr: 0.5 } }}>
                                    <ArticleOutlined />{c.unitCount ?? 0} units · {fromNow(c.updatedAt)}
                                  </Typography>
                                </ClarityCard>
                              </Box>
                            ))}
                            {rows.length > 3 && <Typography sx={{ fontSize: 13, color: CLARITY.ink2, px: 1 }}>+{rows.length - 3} more</Typography>}
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </QueryState>
              </Panel>
              <Box>
                <Panel title="Recent activity">
                  {d.recentActivity.length === 0 ? (
                    <Empty title="No activity yet" hint="Changes made by admins appear here." />
                  ) : (
                    <Stack spacing={1.75}>
                      {d.recentActivity.slice(0, 7).map((a) => (
                        <Stack key={a._id} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: CLARITY.butter, color: CLARITY.ink }}>{a.actorId?.name?.[0] ?? 'S'}</Avatar>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography sx={{ fontSize: 13.5 }}>
                              <b>{a.actorId?.name ?? 'System'}</b> {actionLabel(a.action)}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: CLARITY.ink3 }} title={fmtDateTime(a.createdAt)}>
                              {a.actorId?.role ? `${ROLE_LABEL[a.actorId.role]} · ` : ''}{fromNow(a.createdAt)}
                            </Typography>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Panel>
                <Panel title="Quick actions">
                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Button size="small" variant="outlined" startIcon={<HandshakeOutlined />} component={RouterLink} to="/admin/partners?new=1">Partner</Button>
                    <Button size="small" variant="outlined" startIcon={<ApartmentOutlined />} component={RouterLink} to="/admin/schools?new=1">School</Button>
                    <Button size="small" variant="outlined" startIcon={<PersonAddOutlined />} component={RouterLink} to="/admin/users?new=1">User</Button>
                    <Button size="small" variant="outlined" startIcon={<CampaignOutlined />} component={RouterLink} to="/admin/announcements">Announcement</Button>
                  </Stack>
                </Panel>
                <AnnouncementsWidget />
              </Box>
            </Box>
          </>
        )}
      </QueryState>
    </>
  );
}
